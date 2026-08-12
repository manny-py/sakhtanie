import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type Header = {
  key: string;
  value: string;
};

type HeaderRule = {
  source: string;
  headers: Header[];
};

type Redirect = {
  source: string;
  destination: string;
  statusCode: number;
};

type VercelConfig = {
  $schema: string;
  trailingSlash: boolean;
  headers: HeaderRule[];
  redirects: Redirect[];
};

const EXPECTED_SECURITY_HEADERS = new Map([
  ["X-Content-Type-Options", "nosniff"],
  ["Referrer-Policy", "strict-origin-when-cross-origin"],
  [
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  ],
  ["X-Frame-Options", "DENY"],
  ["Strict-Transport-Security", "max-age=31536000"],
]);

const EXPECTED_CSP_DIRECTIVES = new Map<string, readonly string[]>([
  ["default-src", ["'self'"]],
  ["base-uri", ["'self'"]],
  ["object-src", ["'none'"]],
  ["frame-src", ["'none'"]],
  ["frame-ancestors", ["'none'"]],
  ["form-action", ["'self'"]],
  ["img-src", ["'self'", "data:"]],
  ["font-src", ["'self'", "data:", "https://fonts.gstatic.com"]],
  [
    "style-src",
    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  ],
  ["script-src", ["'self'"]],
  [
    "connect-src",
    [
      "'self'",
      "https://sakhtanie-analytics-worker.ho-mohseni44.workers.dev",
    ],
  ],
  ["manifest-src", ["'self'"]],
  ["upgrade-insecure-requests", []],
]);

function readVercelConfig() {
  return JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;
}

function headersByKey(rule: HeaderRule) {
  return new Map(rule.headers.map(({ key, value }) => [key, value]));
}

function readCloudflareRootHeaders() {
  const lines = readFileSync("public/_headers", "utf8").split(/\r?\n/);
  const rootRuleIndex = lines.findIndex((line) => line.trim() === "/*");

  assert.notEqual(rootRuleIndex, -1, "Cloudflare root header rule is missing");

  const headers = new Map<string, string>();

  for (const line of lines.slice(rootRuleIndex + 1)) {
    if (line.trim() === "" || line.trimStart().startsWith("#")) {
      continue;
    }

    if (!/^\s/.test(line)) {
      break;
    }

    const match = line.match(/^\s+([^:]+):\s*(.+)$/);
    assert.ok(match, `Invalid Cloudflare header line: ${line}`);
    headers.set(match[1], match[2]);
  }

  return headers;
}

function parseCsp(csp: string) {
  const directives = new Map<string, string[]>();

  for (const directive of csp
    .split(";")
    .map((directive) => directive.trim())
    .filter(Boolean)) {
    const [name, ...values] = directive.split(/\s+/);

    assert.ok(name, "CSP directive name is missing");
    assert.equal(
      directives.has(name),
      false,
      `CSP directive is duplicated: ${name}`
    );
    directives.set(name, values);
  }

  return directives;
}

function normalizedCsp(
  directives: ReadonlyMap<string, readonly string[]>
) {
  return [...directives]
    .map(([name, values]) => [name, [...new Set(values)].sort()] as const)
    .sort(([left], [right]) => left.localeCompare(right));
}

function assertCspSemantics(
  csp: string,
  expected = EXPECTED_CSP_DIRECTIVES
) {
  assert.deepEqual(normalizedCsp(parseCsp(csp)), normalizedCsp(expected));
}

test("Vercel config parses and preserves URL normalization", () => {
  const config = readVercelConfig();

  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.equal(config.trailingSlash, true);
});

test("legacy category redirects use one-hop canonical destinations", () => {
  const { redirects } = readVercelConfig();
  const redirectsBySource = new Map(
    redirects.map((redirect) => [redirect.source, redirect])
  );

  assert.deepEqual(redirectsBySource.get("/categories/website-commerce"), {
    source: "/categories/website-commerce",
    destination: "/categories/app-website-builders/",
    statusCode: 301,
  });
  assert.deepEqual(redirectsBySource.get("/categories/development-automation"), {
    source: "/categories/development-automation",
    destination: "/categories/ai-coding/",
    statusCode: 301,
  });
  assert.equal(redirects.length, 2);
});

test("Vercel security headers exactly match the Cloudflare rollback policy", () => {
  const config = readVercelConfig();
  const globalRule = config.headers.find(({ source }) => source === "/(.*)");

  assert.ok(globalRule, "Vercel global security header rule is missing");

  const vercelHeaders = headersByKey(globalRule);
  const cloudflareHeaders = readCloudflareRootHeaders();

  for (const [key, expectedValue] of EXPECTED_SECURITY_HEADERS) {
    assert.equal(vercelHeaders.get(key), expectedValue, `${key} drifted in Vercel`);
    assert.equal(
      cloudflareHeaders.get(key),
      expectedValue,
      `${key} drifted in Cloudflare`
    );
  }

  const vercelCsp = vercelHeaders.get("Content-Security-Policy");
  const cloudflareCsp = cloudflareHeaders.get("Content-Security-Policy");

  assert.ok(vercelCsp, "Vercel CSP is missing");
  assert.ok(cloudflareCsp, "Cloudflare CSP is missing");
  assertCspSemantics(vercelCsp);
  assertCspSemantics(cloudflareCsp);
  assert.deepEqual(normalizedCsp(parseCsp(vercelCsp)), normalizedCsp(parseCsp(cloudflareCsp)));
});

test("CSP keeps scripts self-only while preserving required style and analytics sources", () => {
  const config = readVercelConfig();
  const globalRule = config.headers.find(({ source }) => source === "/(.*)");

  assert.ok(globalRule);

  const csp = headersByKey(globalRule).get("Content-Security-Policy");

  assert.ok(csp, "Vercel CSP is missing");
  assertCspSemantics(csp);

  const directives = parseCsp(csp);
  assert.deepEqual(directives.get("script-src"), ["'self'"]);
  assert.equal(directives.get("script-src")?.includes("'unsafe-inline'"), false);
  assert.deepEqual(
    new Set(directives.get("style-src")),
    new Set(["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"])
  );
  assert.deepEqual(
    new Set(directives.get("connect-src")),
    new Set([
      "'self'",
      "https://sakhtanie-analytics-worker.ho-mohseni44.workers.dev",
    ])
  );
});

test("CSP comparison ignores formatting and ordering but detects policy drift", () => {
  const equivalentCsp = [
    "  upgrade-insecure-requests  ",
    "manifest-src    'self'",
    "connect-src https://sakhtanie-analytics-worker.ho-mohseni44.workers.dev 'self'",
    "script-src 'self'",
    "style-src https://fonts.googleapis.com   'unsafe-inline' 'self'",
    "font-src https://fonts.gstatic.com data: 'self'",
    "img-src data: 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "default-src 'self'",
  ].join(" ;\n");

  assert.doesNotThrow(() => assertCspSemantics(equivalentCsp));

  assert.throws(() =>
    assertCspSemantics(
      equivalentCsp.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
    )
  );
  assert.throws(() =>
    assertCspSemantics(
      equivalentCsp.replace(
        "connect-src https://sakhtanie-analytics-worker.ho-mohseni44.workers.dev 'self'",
        "connect-src 'self'"
      )
    )
  );
  assert.throws(() =>
    assertCspSemantics(equivalentCsp.replace("manifest-src    'self' ;\n", ""))
  );
});

test("fingerprinted Astro assets retain the Cloudflare immutable cache policy", () => {
  const config = readVercelConfig();
  const assetRule = config.headers.find(
    ({ source }) => source === "/_astro/:path*"
  );

  assert.ok(assetRule, "Vercel Astro asset header rule is missing");
  assert.equal(
    headersByKey(assetRule).get("Cache-Control"),
    "public, max-age=31556952, immutable"
  );
});
