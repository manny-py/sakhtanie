import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  atomicWriteFile,
  assertPassiveLocalSvg,
  cvciUrlForPath,
  fetchAllowedResource,
  officialUrlForSourceId,
  resolveInsideDirectory,
  resolveLogoOutputPath,
  validateNetworkUrl,
  validateSlug,
} from "../scripts/lib/logo-security.mjs";

const approvedImageUrl = "https://raw.githubusercontent.com/logo.png";
const pngBytes = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(120),
]);

type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

function imageResponse(
  bytes: Uint8Array = pngBytes,
  contentType: string | null = "image/png",
  extraHeaders: Record<string, string> = {}
) {
  const headers = new Headers(extraHeaders);

  if (contentType !== null) {
    headers.set("content-type", contentType);
  }

  return new Response(bytes, { status: 200, headers });
}

test("URL policy accepts only exact approved HTTPS hosts", () => {
  assert.equal(validateNetworkUrl(approvedImageUrl).hostname, "raw.githubusercontent.com");

  for (const rejected of [
    "http://raw.githubusercontent.com/logo.png",
    "ftp://raw.githubusercontent.com/logo.png",
    "file:///tmp/logo.png",
    "data:image/png,abc",
    "javascript:alert(1)",
    "https://user:password@raw.githubusercontent.com/logo.png",
    "https://example.invalid/logo.png",
    "https://raw.githubusercontent.com.example.invalid/logo.png",
    "https://sub.raw.githubusercontent.com/logo.png",
    "https://127.0.0.1/logo.png",
    "https://[::1]/logo.png",
  ]) {
    assert.throws(() => validateNetworkUrl(rejected));
  }
});

test("redirect policy rejects an unlisted host", async () => {
  const fetchImpl: FetchLike = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "https://example.invalid/logo.png" },
    });

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, { fetchImpl })
  );
});

test("redirect policy rejects HTTPS downgrade", async () => {
  const fetchImpl: FetchLike = async () =>
    new Response(null, {
      status: 302,
      headers: { location: "http://raw.githubusercontent.com/logo.png" },
    });

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, { fetchImpl })
  );
});

test("redirect policy accepts an approved relative and cross-host chain", async () => {
  const seen: string[] = [];
  const fetchImpl: FetchLike = async input => {
    const current = String(input);
    seen.push(current);

    if (seen.length === 1) {
      return new Response(null, {
        status: 302,
        headers: { location: "/next.png" },
      });
    }

    if (seen.length === 2) {
      return new Response(null, {
        status: 307,
        headers: { location: "https://avatars.githubusercontent.com/final.png" },
      });
    }

    return imageResponse();
  };

  const result = await fetchAllowedResource(approvedImageUrl, { fetchImpl });
  assert.equal(result.extension, "png");
  assert.equal(seen.length, 3);
});

test("redirect policy stops excessive redirects", async () => {
  const fetchImpl: FetchLike = async () =>
    new Response(null, { status: 302, headers: { location: "/again" } });

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, {
      fetchImpl,
      maximumRedirects: 1,
    }),
    /Too many redirects/
  );
});

test("network request times out and aborts", async () => {
  let aborted = false;
  const fetchImpl: FetchLike = async (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
        reject(new Error("aborted"));
      });
    });

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, { fetchImpl, timeoutMs: 5 }),
    /timed out/
  );
  assert.equal(aborted, true);
});

test("rejects Content-Length above the configured byte limit", async () => {
  const fetchImpl: FetchLike = async () =>
    imageResponse(pngBytes, "image/png", { "content-length": "129" });

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, {
      fetchImpl,
      maximumBytes: 128,
    }),
    /byte limit/
  );
});

test("rejects a streamed body that exceeds the limit without Content-Length", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(pngBytes.subarray(0, 64));
      controller.enqueue(pngBytes.subarray(64));
      controller.close();
    },
  });
  const fetchImpl: FetchLike = async () =>
    new Response(stream, { headers: { "content-type": "image/png" } });

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, {
      fetchImpl,
      maximumBytes: 100,
    }),
    /byte limit/
  );
});

test("rejects missing or invalid image Content-Type", async () => {
  for (const contentType of [null, "text/plain", "application/octet-stream"]) {
    const fetchImpl: FetchLike = async () => imageResponse(pngBytes, contentType);
    await assert.rejects(
      fetchAllowedResource(approvedImageUrl, { fetchImpl }),
      /Content-Type/
    );
  }
});

test("rejects MIME and magic mismatch or unsupported payload", async () => {
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(120)]);
  const mismatchedFetch: FetchLike = async () => imageResponse(jpeg, "image/png");
  const unsupportedFetch: FetchLike = async () =>
    imageResponse(Buffer.alloc(128, 0x61), "image/png");

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, { fetchImpl: mismatchedFetch }),
    /do not match/
  );
  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, { fetchImpl: unsupportedFetch }),
    /do not match/
  );
});

test("rejects remote SVG under its real or a disguised Content-Type", async () => {
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  const svgFetch: FetchLike = async () => imageResponse(svg, "image/svg+xml");
  const disguisedFetch: FetchLike = async () => imageResponse(svg, "image/png");

  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, { fetchImpl: svgFetch }),
    /Remote SVG/
  );
  await assert.rejects(
    fetchAllowedResource(approvedImageUrl, { fetchImpl: disguisedFetch }),
    /Remote SVG/
  );
});

test("filesystem helpers reject unsafe slugs and traversal", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "logo-paths-"));
  assert.throws(() => validateSlug("../unsafe"));
  assert.throws(() => validateSlug("nested/unsafe"));
  assert.throws(() => resolveInsideDirectory(directory, "../outside"));
  assert.throws(() => resolveInsideDirectory(directory, path.resolve("/tmp/outside")));

  const resolved = resolveLogoOutputPath(directory, "safe-logo", "png");
  assert.equal(path.dirname(resolved), path.resolve(directory));
});

test("atomic write failure preserves the final file and removes temporary data", async () => {
  const directory = mkdtempSync(path.join(tmpdir(), "logo-atomic-"));
  const finalPath = path.join(directory, "logo.png");
  writeFileSync(finalPath, "original", "utf8");

  await assert.rejects(
    atomicWriteFile(finalPath, "replacement", {
      encoding: "utf8",
      beforeRename() {
        throw new Error("simulated failure");
      },
    })
  );

  assert.equal(readFileSync(finalPath, "utf8"), "original");
  assert.deepEqual(readdirSync(directory), ["logo.png"]);
});

test("repository source IDs cannot inject hosts", () => {
  assert.equal(officialUrlForSourceId("https://example.invalid/logo.png"), null);
  assert.match(officialUrlForSourceId("aparat") ?? "", /^https:\/\/www\.aparat\.com\//);
});

test("CanIVibeCodeIt paths cannot alter the fixed origin", () => {
  assert.equal(
    new URL(cvciUrlForPath("public/icons/safe-logo.png")).hostname,
    "raw.githubusercontent.com"
  );

  for (const unsafe of [
    "//example.invalid/logo.png",
    "https://example.invalid/logo.png",
    "public/icons/../../escape.png",
    "public/icons/alt/evil/escape.png",
  ]) {
    assert.throws(() => cvciUrlForPath(unsafe));
  }
});

test("checked-in SVG assets are passive and none are remote-origin downloads", () => {
  const logoDirectory = path.join(process.cwd(), "public/app-logos");

  for (const filename of readdirSync(logoDirectory).filter(name => name.endsWith(".svg"))) {
    assert.doesNotThrow(() =>
      assertPassiveLocalSvg(readFileSync(path.join(logoDirectory, filename), "utf8"))
    );
  }

  const sources = JSON.parse(
    readFileSync(path.join(process.cwd(), "scripts/app-logo-sources.json"), "utf8")
  );
  const remoteSvgSources = sources.filter(
    (source: { type?: string; local?: string }) =>
      source.type === "official-site" && source.local?.endsWith(".svg")
  );
  assert.deepEqual(remoteSvgSources, []);
});
