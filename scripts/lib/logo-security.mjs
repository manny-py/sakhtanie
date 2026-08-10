import { isIP } from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const IMAGE_RESPONSE_LIMIT = 2 * 1024 * 1024;
export const MANIFEST_RESPONSE_LIMIT = 512 * 1024;
export const REQUEST_TIMEOUT_MS = 15_000;
export const MAXIMUM_REDIRECTS = 5;
export const MAXIMUM_RETRIES = 3;

export const CANIVIBECODEIT_BASE_URL =
  "https://raw.githubusercontent.com/canivibecodeit/canivibecodeit/main/";

export const CANIVIBECODEIT_TREE_URL =
  "https://api.github.com/repos/canivibecodeit/canivibecodeit/git/trees/main?recursive=1";

export const ALLOWED_NETWORK_HOSTS = new Set([
  "api.github.com",
  "avatars.githubusercontent.com",
  "caremeas.ir",
  "cdn-o.suno.com",
  "d3njjcbhbojbot.cloudfront.net",
  "danup.ir",
  "didar.me",
  "faradars.org",
  "framerusercontent.com",
  "jobinja.ir",
  "jobvision.ir",
  "liara.ir",
  "limoo.host",
  "mistral.ai",
  "poe.com",
  "ponisha.ir",
  "porsline.ir",
  "quera.org",
  "raw.githubusercontent.com",
  "raychat.io",
  "static.virgool.io",
  "statics.maktabkhooneh.org",
  "uizard.io",
  "www.aparat.com",
  "www.metabase.com",
  "www.najva.com",
  "www.tableau.com",
  "www.yektanet.com",
  "www.zarinpal.com",
  "x.ai",
]);

const imageContentTypes = new Map([
  ["image/avif", new Set(["avif"])],
  ["image/jpeg", new Set(["jpg"])],
  ["image/png", new Set(["png"])],
  ["image/vnd.microsoft.icon", new Set(["ico"])],
  ["image/webp", new Set(["webp"])],
  ["image/x-icon", new Set(["ico"])],
]);

const manifestContentTypes = new Set([
  "application/json",
  "application/vnd.github+json",
]);

const redirectStatuses = new Set([301, 302, 303, 307, 308]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const cvciPathPattern =
  /^public\/icons\/(?:alt\/)?[a-z0-9](?:[a-z0-9._-]{0,252})\.png$/;

export function validateSlug(value) {
  if (typeof value !== "string" || !slugPattern.test(value)) {
    throw new Error("Unsafe application slug");
  }

  return value;
}

export function normalizeDomain(value) {
  if (typeof value !== "string") {
    throw new Error("Invalid application domain");
  }

  const domain = value.trim().toLowerCase();

  if (
    domain.length < 1 ||
    domain.length > 253 ||
    isIP(domain) !== 0 ||
    domain.includes("..") ||
    !domain.split(".").every(
      label =>
        label.length >= 1 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    )
  ) {
    throw new Error("Invalid application domain");
  }

  return domain;
}

export function validateCvciPath(value) {
  if (typeof value !== "string" || !cvciPathPattern.test(value)) {
    throw new Error("Invalid CanIVibeCodeIt source path");
  }

  return value;
}

export function cvciUrlForPath(sourcePath) {
  const safePath = validateCvciPath(sourcePath);
  const url = new URL(safePath, CANIVIBECODEIT_BASE_URL);

  if (url.origin !== new URL(CANIVIBECODEIT_BASE_URL).origin) {
    throw new Error("CanIVibeCodeIt origin changed unexpectedly");
  }

  return url.href;
}

/**
 * Repository data selects only a stable identifier. Every network destination
 * returned here is a code-owned literal, so JSON cannot supply a fetch target.
 */
export function officialUrlForSourceId(sourceId) {
  switch (sourceId) {
    case "aparat": return "https://www.aparat.com/clover/shorts/icon-512x512.png";
    case "arvancloud": return "https://avatars.githubusercontent.com/u/21291162?v=4";
    case "caremeas": return "https://caremeas.ir/_marku/assets/ace5a9117dd4fba8f891dc1848e27372c2128c983bd2078e949134355ae57803.png";
    case "coursera": return "https://d3njjcbhbojbot.cloudfront.net/web/images/favicons/apple-touch-icon-v2-180x180.png";
    case "danup": return "https://danup.ir/wp-content/uploads/2018/12/cropped-favv-192x192.png";
    case "didar": return "https://didar.me/favicon.ico";
    case "faradars": return "https://faradars.org/pwa/512.png";
    case "gitbook": return "https://framerusercontent.com/images/RixubGcwFjRRIx4k36fKy7kV8Y.png";
    case "grok": return "https://x.ai/favicon.ico";
    case "jobinja": return "https://jobinja.ir/apple-icon-180x180.png";
    case "jobvision": return "https://jobvision.ir/assets/icons/icon-512x512.png";
    case "liara": return "https://liara.ir/assets/favicon.ico";
    case "limoo-host": return "https://limoo.host/asstes/img/logo/favicon.ico";
    case "maktabkhooneh": return "https://statics.maktabkhooneh.org/front/images/favicons/apple-touch-icon-180x180.webp";
    case "metabase": return "https://www.metabase.com/images/favicon.svg";
    case "mistral-vibe": return "https://mistral.ai/favicon.svg";
    case "najva": return "https://www.najva.com/wp-content/uploads/2025/08/fav.png";
    case "poe": return "https://poe.com/favicon.svg";
    case "ponisha": return "https://ponisha.ir/android-512.png";
    case "porsline": return "https://porsline.ir/favicon.png";
    case "quera": return "https://quera.org/static/images/logo/favicon/android-chrome-512x512.png";
    case "raychat": return "https://raychat.io/logo.svg";
    case "suno": return "https://cdn-o.suno.com/favicon-512x512.png";
    case "tableau": return "https://www.tableau.com/c/public/exp/app/favicon.ico";
    case "uizard": return "https://uizard.io/android-chrome-512x512.png";
    case "virgool": return "https://static.virgool.io/images/pwa/virgool-512.png";
    case "yektanet": return "https://www.yektanet.com/wp-content/uploads/2025/02/cropped-favicon-yektanet-192x192.png";
    case "zarinpal": return "https://www.zarinpal.com/icons/apple-touch-icon.png";
    default: return null;
  }
}

export function validateNetworkUrl(
  input,
  allowedHosts = ALLOWED_NETWORK_HOSTS
) {
  let url;

  try {
    url = new URL(input);
  } catch {
    throw new Error("Malformed network URL");
  }

  const hostnameForIpCheck = url.hostname.startsWith("[") && url.hostname.endsWith("]")
    ? url.hostname.slice(1, -1)
    : url.hostname;

  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    url.port !== "" ||
    isIP(hostnameForIpCheck) !== 0 ||
    !allowedHosts.has(url.hostname)
  ) {
    throw new Error("Network URL is outside the approved HTTPS allowlist");
  }

  return url;
}

export function detectImage(bytes) {
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    )
  ) {
    return "png";
  }

  if (
    bytes.length >= 4 &&
    bytes[0] === 0x00 &&
    bytes[1] === 0x00 &&
    bytes[2] === 0x01 &&
    bytes[3] === 0x00
  ) {
    return "ico";
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }

  if (
    bytes.length >= 12 &&
    ["ftypavif", "ftypavis"].includes(
      bytes.subarray(4, 12).toString("ascii")
    )
  ) {
    return "avif";
  }

  const textHead = bytes
    .subarray(0, Math.min(bytes.length, 2048))
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .trimStart();

  if (
    textHead.startsWith("<svg") ||
    (textHead.startsWith("<?xml") && textHead.includes("<svg"))
  ) {
    return "svg";
  }

  return null;
}

export function assertPassiveLocalSvg(svg) {
  const text = String(svg);
  const activeMarkup = [
    /<script\b/i,
    /<foreignObject\b/i,
    /\son[a-z]+\s*=/i,
    /\bjavascript\s*:/i,
    /\bdata\s*:\s*text\/html/i,
    /\b(?:href|src)\s*=\s*["']\s*(?:https?:|\/\/)/i,
    /\burl\(\s*["']?\s*(?:https?:|\/\/)/i,
  ];

  if (activeMarkup.some(pattern => pattern.test(text))) {
    throw new Error("Local SVG contains active or remote content");
  }

  return text;
}

function normalizedContentType(response) {
  return response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

async function cancelBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Cancellation is best effort after the response has already been rejected.
  }
}

async function readBoundedBody(response, maximumBytes) {
  const lengthHeader = response.headers.get("content-length");

  if (lengthHeader !== null) {
    if (!/^\d+$/.test(lengthHeader)) {
      await cancelBody(response);
      throw new Error("Invalid Content-Length");
    }

    const declaredLength = Number(lengthHeader);

    if (!Number.isSafeInteger(declaredLength) || declaredLength > maximumBytes) {
      await cancelBody(response);
      throw new Error("Response exceeds byte limit");
    }
  }

  if (!response.body) {
    throw new Error("Response has no body");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      total += value.byteLength;

      if (total > maximumBytes) {
        await reader.cancel();
        throw new Error("Response exceeds byte limit");
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, total);
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  let timer;

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("Network request timed out"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetchImpl(url, { ...options, signal: controller.signal }),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchAllowedResource(
  initialUrl,
  {
    fetchImpl = fetch,
    kind = "image",
    maximumBytes = kind === "image"
      ? IMAGE_RESPONSE_LIMIT
      : MANIFEST_RESPONSE_LIMIT,
    timeoutMs = REQUEST_TIMEOUT_MS,
    maximumRedirects = MAXIMUM_REDIRECTS,
    headers = {},
    allowedHosts = ALLOWED_NETWORK_HOSTS,
  } = {}
) {
  let currentUrl = validateNetworkUrl(initialUrl, allowedHosts);

  for (let redirects = 0; ; redirects += 1) {
    const response = await fetchWithTimeout(
      fetchImpl,
      currentUrl,
      { redirect: "manual", headers },
      timeoutMs
    );

    if (redirectStatuses.has(response.status)) {
      await cancelBody(response);

      if (redirects >= maximumRedirects) {
        throw new Error("Too many redirects");
      }

      const location = response.headers.get("location");

      if (!location) {
        throw new Error("Redirect has no Location header");
      }

      currentUrl = validateNetworkUrl(
        new URL(location, currentUrl).href,
        allowedHosts
      );
      continue;
    }

    if (!response.ok) {
      await cancelBody(response);
      throw new Error(`Network request failed with HTTP ${response.status}`);
    }

    const contentType = normalizedContentType(response);

    if (kind === "image") {
      if (contentType === "image/svg+xml") {
        await cancelBody(response);
        throw new Error("Remote SVG is prohibited");
      }

      if (!imageContentTypes.has(contentType)) {
        await cancelBody(response);
        throw new Error("Missing or unsupported image Content-Type");
      }
    } else if (!manifestContentTypes.has(contentType)) {
      await cancelBody(response);
      throw new Error("Missing or unsupported manifest Content-Type");
    }

    const bytes = await readBoundedBody(response, maximumBytes);

    if (kind === "image") {
      const extension = detectImage(bytes);

      if (extension === "svg") {
        throw new Error("Remote SVG is prohibited");
      }

      if (!extension || !imageContentTypes.get(contentType)?.has(extension)) {
        throw new Error("Image MIME type and magic bytes do not match");
      }

      return { bytes, extension, finalUrl: currentUrl.href };
    }

    return { bytes, finalUrl: currentUrl.href };
  }
}

export function resolveInsideDirectory(directory, unsafeName) {
  const hasControlCharacter =
    typeof unsafeName === "string" &&
    [...unsafeName].some(character => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    });

  if (
    typeof unsafeName !== "string" ||
    unsafeName.length === 0 ||
    path.isAbsolute(unsafeName) ||
    hasControlCharacter
  ) {
    throw new Error("Unsafe output path");
  }

  const base = path.resolve(directory);
  const resolved = path.resolve(base, unsafeName);

  if (resolved === base || !resolved.startsWith(`${base}${path.sep}`)) {
    throw new Error("Output path escapes the expected directory");
  }

  return resolved;
}

export function resolveLogoOutputPath(directory, slug, extension) {
  validateSlug(slug);

  if (!new Set(["avif", "ico", "jpg", "png", "svg", "webp"]).has(extension)) {
    throw new Error("Unsupported output extension");
  }

  return resolveInsideDirectory(directory, `${slug}.${extension}`);
}

export function resolveCuratedAsset(root, relativePath) {
  if (
    typeof relativePath !== "string" ||
    !/^scripts\/app-logo-curated\/[a-z0-9]+(?:-[a-z0-9]+)*\.svg$/.test(relativePath)
  ) {
    throw new Error("Unsafe curated asset path");
  }

  return resolveInsideDirectory(
    path.join(root, "scripts/app-logo-curated"),
    path.basename(relativePath)
  );
}

export async function atomicWriteFile(
  finalPath,
  data,
  { encoding, beforeRename } = {}
) {
  const directory = path.dirname(finalPath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(finalPath)}.${randomUUID()}.tmp`
  );
  let handle;

  try {
    handle = await fs.open(temporaryPath, "wx", 0o600);
    await handle.writeFile(data, encoding ? { encoding } : undefined);
    await handle.sync();
    await handle.close();
    handle = undefined;

    if (beforeRename) {
      await beforeRename(temporaryPath, finalPath);
    }

    await fs.rename(temporaryPath, finalPath);
  } catch (error) {
    await handle?.close().catch(() => {});
    await fs.rm(temporaryPath, { force: true }).catch(() => {});
    throw error;
  }
}

export async function replaceDirectoryFromStaging(stagingPath, finalPath) {
  const parent = path.dirname(finalPath);
  const backupPath = path.join(
    parent,
    `.${path.basename(finalPath)}.${randomUUID()}.backup`
  );
  let movedExisting = false;
  let installedStaging = false;

  try {
    try {
      await fs.rename(finalPath, backupPath);
      movedExisting = true;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    await fs.rename(stagingPath, finalPath);
    installedStaging = true;

    if (movedExisting) {
      await fs.rm(backupPath, { recursive: true, force: true }).catch(() => {});
    }
  } catch (error) {
    if (movedExisting && !installedStaging) {
      await fs.rename(backupPath, finalPath).catch(() => {});
    }
    throw error;
  }
}
