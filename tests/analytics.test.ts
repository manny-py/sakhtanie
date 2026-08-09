import assert from "node:assert/strict";
import test from "node:test";

import {
  hasLocalAnalyticsOptOut,
  sanitizeAnalyticsEvent,
} from "../src/lib/analytics.ts";

test("analytics allowlist accepts only the minimal search payload", () => {
  assert.deepEqual(
    sanitizeAnalyticsEvent("search_used", { results_count: 4 }),
    {
      event: "search_used",
      payload: { results_count: 4 },
    }
  );

  assert.equal(
    sanitizeAnalyticsEvent("search_used", {
      results_count: 4,
      query: "private search text",
    }),
    null
  );
});

test("analytics allowlist rejects URLs, free-form fields, and unknown events", () => {
  assert.equal(
    sanitizeAnalyticsEvent("tool_cta_click", {
      tool_slug: "safe-tool",
      destination: "https://example.com/private",
    }),
    null
  );

  assert.equal(
    sanitizeAnalyticsEvent("client_error", {
      message: "sensitive browser error",
    }),
    null
  );

  assert.equal(
    sanitizeAnalyticsEvent("tool_view", { tool_slug: "../unsafe" }),
    null
  );
});

test("analytics fail closed when the opt-out preference cannot be read", () => {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storageDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "localStorage"
  );

  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem() {
          throw new Error("Storage unavailable");
        },
      },
    });

    assert.equal(hasLocalAnalyticsOptOut(), true);
  } finally {
    if (windowDescriptor) {
      Object.defineProperty(globalThis, "window", windowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }

    if (storageDescriptor) {
      Object.defineProperty(globalThis, "localStorage", storageDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, "localStorage");
    }
  }
});
