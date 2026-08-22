import assert from "node:assert/strict";
import test from "node:test";

import {
  MONETIZATION_ENABLED,
  parseMonetizationEnabled,
} from "../src/lib/monetization.ts";

test("monetization is enabled only by the exact public value true", () => {
  assert.equal(parseMonetizationEnabled(undefined), false);
  assert.equal(parseMonetizationEnabled(""), false);
  assert.equal(parseMonetizationEnabled("false"), false);
  assert.equal(parseMonetizationEnabled("TRUE"), false);
  assert.equal(parseMonetizationEnabled("1"), false);
  assert.equal(parseMonetizationEnabled("true"), true);
});

test("QA fixture forces monetization on when the build variable is unavailable", () => {
  assert.equal(MONETIZATION_ENABLED, true);
});
