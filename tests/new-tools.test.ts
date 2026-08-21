import assert from "node:assert/strict";
import test from "node:test";

import { getNewToolExpiry, getNewTools, isNewTool } from "../src/lib/new-tools";

const now = new Date("2026-08-21T18:30:00.000Z");

function tool(slug: string, publishedAt?: string, status = "published") {
  return { slug, publishedAt, status };
}

test("new tools stay eligible for 14 calendar days", () => {
  assert.equal(isNewTool(tool("today", "2026-08-21"), now), true);
  assert.equal(isNewTool(tool("day-thirteen", "2026-08-08"), now), true);
  assert.equal(isNewTool(tool("day-fourteen", "2026-08-07"), now), false);
  assert.equal(isNewTool(tool("future", "2026-08-22"), now), false);
  assert.equal(isNewTool(tool("missing"), now), false);
  assert.equal(isNewTool(tool("review", "2026-08-21", "review"), now), false);
});

test("new tools are sorted newest-first and limited to 12", () => {
  const catalog = Array.from({ length: 15 }, (_, index) =>
    tool(`tool-${String(index).padStart(2, "0")}`, `2026-08-${String(21 - index).padStart(2, "0")}`),
  );

  const result = getNewTools(catalog, now);

  assert.equal(result.length, 12);
  assert.deepEqual(
    result.map((item) => item.slug),
    catalog.slice(0, 12).map((item) => item.slug),
  );
});

test("new-tool expiry is the start of day 14", () => {
  assert.equal(
    getNewToolExpiry(tool("example", "2026-08-21")),
    Date.parse("2026-09-04T00:00:00.000Z"),
  );
});
