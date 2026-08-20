import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY_FILENAME,
  isLiveEnabled,
  submitIndexNow,
  validateIndexNowKeyFile,
  validateIndexNowUrls,
} from "../scripts/indexnow/submit.ts";

const validUrl = "https://sakhtanie.ir/tools/example/";
const response = (status: number, headers?: Record<string, string>) =>
  new Response(null, { status, headers });

function mockFetch(...responses: Array<Response | Error>) {
  const calls: RequestInit[] = [];
  let index = 0;
  const fetchImpl = async (_url: string | URL, init?: RequestInit) => {
    calls.push(init ?? {});
    const item = responses[Math.min(index++, responses.length - 1)];
    if (item instanceof Error) throw item;
    return item;
  };
  return { calls, fetchImpl };
}

test("live switch requires exact lowercase true", () => {
  for (const value of [undefined, "", "false", "True", "TRUE", "1", "yes"]) {
    assert.equal(isLiveEnabled(value), false, value);
  }
  assert.equal(isLiveEnabled("true"), true);
});

test("disabled and zero-url submissions never call fetch", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response(200);
  };
  for (const liveEnabled of [undefined, "", "false", "True", "TRUE", "1", "yes"]) {
    assert.deepEqual(await submitIndexNow({ urls: [validUrl], liveEnabled, fetchImpl }), {
      sent: false,
      attempts: 0,
      reason: "live switch disabled",
    });
  }
  assert.deepEqual(await submitIndexNow({ urls: [], liveEnabled: "true", fetchImpl }), {
    sent: false,
    attempts: 0,
    reason: "zero impacted URLs",
  });
  assert.equal(calls, 0);
});

test("URL validation accepts Sakhtanie HTTPS and deduplicates", () => {
  assert.deepEqual(validateIndexNowUrls([validUrl, validUrl]), [validUrl]);
});

test("URL validation rejects external and HTTP URLs", () => {
  assert.throws(() => validateIndexNowUrls(["https://example.com/page"]), /outside/);
  assert.throws(() => validateIndexNowUrls(["http://sakhtanie.ir/page"]), /outside/);
  assert.throws(() => validateIndexNowUrls(["https://www.sakhtanie.ir/page"]), /outside/);
  assert.throws(() => validateIndexNowUrls(["https://sakhtanie.ir.evil.example/page"]), /outside/);
  assert.throws(() => validateIndexNowUrls(["https://evil.example/?next=https://sakhtanie.ir/"]), /outside/);
  assert.throws(() => validateIndexNowUrls(["javascript:alert(1)"]), /outside/);
  assert.throws(() => validateIndexNowUrls(["not a URL"]), /Invalid/);
  assert.throws(() => validateIndexNowUrls(["https://user:pass@sakhtanie.ir/"]), /outside/);
  assert.throws(() => validateIndexNowUrls(["https://sakhtanie.ir:443/"]), /outside/);
});

test("URL validation accepts planner production routes", () => {
  assert.deepEqual(validateIndexNowUrls([
    "https://sakhtanie.ir/",
    "https://sakhtanie.ir/categories/example/",
    validUrl,
  ]), [
    "https://sakhtanie.ir/",
    "https://sakhtanie.ir/categories/example/",
    validUrl,
  ]);
});

test("URL validation rejects non-planner routes", () => {
  for (const url of [
    "https://sakhtanie.ir/sitemap.xml",
    "https://sakhtanie.ir/rss.xml",
    "https://sakhtanie.ir/09e9b751c2114051929e5edd6b639333.txt",
    "https://sakhtanie.ir/assets/logo.svg",
    "https://sakhtanie.ir/about/",
  ]) {
    assert.throws(() => validateIndexNowUrls([url]), /approved planner routes/);
  }
});

test("URL validation rejects more than 500 URLs", () => {
  const urls = Array.from({ length: 501 }, (_, index) => `https://sakhtanie.ir/tools/${index}/`);
  assert.throws(() => validateIndexNowUrls(urls), /maximum of 500/);
});

test("public key file is present and matches its filename", () => {
  const key = validateIndexNowKeyFile();
  assert.equal(key, INDEXNOW_KEY_FILENAME.slice(0, -4));
  assert.equal(readFileSync(`public/${INDEXNOW_KEY_FILENAME}`, "utf8"), key);
});

for (const [status, label] of [[200, "success"], [202, "accepted"]] as const) {
  test(`${status} is ${label}`, async () => {
    const mock = mockFetch(response(status));
    const result = await submitIndexNow({ urls: [validUrl], liveEnabled: "true", fetchImpl: mock.fetchImpl });
    assert.deepEqual(result, { sent: true, status, attempts: 1 });
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0]?.method, "POST");
    assert.equal(mock.calls[0]?.headers && (mock.calls[0]?.headers as Record<string, string>)["content-type"], "application/json; charset=utf-8");
    assert.deepEqual(JSON.parse(String(mock.calls[0]?.body)), {
      host: "sakhtanie.ir",
      key: INDEXNOW_KEY_FILENAME.slice(0, -4),
      urlList: [validUrl],
    });
    assert.equal(INDEXNOW_ENDPOINT, "https://api.indexnow.org/indexnow");
  });
}

test("an injected fetch is required and global fetch is not used", async () => {
  const originalFetch = globalThis.fetch;
  let globalCalled = false;
  globalThis.fetch = (async () => {
    globalCalled = true;
    throw new Error("real fetch must not be called");
  }) as typeof fetch;
  try {
    const mock = mockFetch(response(200));
    const result = await submitIndexNow({ urls: [validUrl], liveEnabled: "true", fetchImpl: mock.fetchImpl });
    assert.equal(result.sent, true);
    assert.equal(globalCalled, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

for (const status of [400, 403, 422]) {
  test(`${status} is not retried`, async () => {
    const mock = mockFetch(response(status));
    const result = await submitIndexNow({ urls: [validUrl], liveEnabled: "true", fetchImpl: mock.fetchImpl });
    assert.equal(result.sent, false);
    assert.equal(result.status, status);
    assert.equal(result.attempts, 1);
    assert.equal(mock.calls.length, 1);
  });
}

for (const status of [429, 500, 503]) {
  test(`${status} retries with a bounded maximum`, async () => {
    const mock = mockFetch(response(status), response(status), response(status));
    const result = await submitIndexNow({ urls: [validUrl], liveEnabled: "true", fetchImpl: mock.fetchImpl, sleep: async () => {} });
    assert.deepEqual(result, { sent: false, attempts: 3, reason: "retry limit exhausted" });
    assert.equal(mock.calls.length, 3);
  });
}

test("network errors retry with a bounded maximum", async () => {
  const mock = mockFetch(new Error("offline"), new Error("offline"), new Error("offline"));
  const result = await submitIndexNow({ urls: [validUrl], liveEnabled: "true", fetchImpl: mock.fetchImpl, sleep: async () => {} });
  assert.deepEqual(result, { sent: false, attempts: 3, reason: "retry limit exhausted" });
  assert.equal(mock.calls.length, 3);
});

test("Retry-After is capped at ten seconds", async () => {
  const mock = mockFetch(
    response(429, { "retry-after": "86400" }),
    response(200),
  );
  const delays: number[] = [];
  const result = await submitIndexNow({
    urls: [validUrl],
    liveEnabled: "true",
    fetchImpl: mock.fetchImpl,
    sleep: async (milliseconds) => { delays.push(milliseconds); },
  });
  assert.deepEqual(result, { sent: true, status: 200, attempts: 2 });
  assert.deepEqual(delays, [10_000]);
});
