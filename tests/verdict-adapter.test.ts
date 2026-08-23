import assert from "node:assert/strict";
import test from "node:test";

import { toVerdictState } from "../src/lib/verdict-adapter";

test("maps a yes catalog verdict to the build UI state", () => {
  assert.equal(toVerdictState("yes"), "build");
});

test("preserves the kinda verdict state", () => {
  assert.equal(toVerdictState("kinda"), "kinda");
});

test("preserves the no verdict state", () => {
  assert.equal(toVerdictState("no"), "no");
});
