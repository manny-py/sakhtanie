import assert from "node:assert/strict";
import test from "node:test";

import {
  compareCatalogSnapshots,
  type CatalogChanges,
  type CatalogFileEntry,
  type CatalogRecord,
} from "../scripts/indexnow/catalog-snapshot.ts";
import {
  assertCanonicalProductionUrl,
  planImpactedUrls,
} from "../scripts/indexnow/url-plan.ts";
import { appSchema } from "../src/lib/schema.ts";
import { isSafeCatalogPathSegment } from "../src/lib/catalog-path-segment.ts";

function record(
  slug: string,
  status = "published",
  category = "productivity",
  extra: Record<string, unknown> = {}
): CatalogRecord {
  return {
    slug,
    status,
    category,
    name: { fa: slug, en: slug },
    summary: `${slug} summary`,
    ...extra,
  };
}

function schemaValidRecord(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    slug: "fixture-tool",
    name: { fa: "ابزار آزمایشی", en: "Fixture Tool" },
    domain: "example.com",
    logo: "fixture.svg",
    origin: "open-source",
    status: "published",
    category: "productivity",
    subcategory: "notes",
    tags: ["fixture"],
    relatedTools: [],
    summary: "A self-contained test fixture.",
    verdict: {
      value: "yes",
      confidence: "high",
      short: "Useful",
      reason: "It is only used in tests.",
    },
    build: {
      timeEstimate: "1 hour",
      skillLevel: "beginner",
      coreLoop: "Create and review",
      requirements: [],
      limitations: [],
      prompt: {
        title: "Fixture prompt",
        content: "Build the fixture.",
        language: "en",
        tested: false,
        testedWith: [],
        lastUpdated: "2026-01-01",
      },
    },
    comparison: { original: "Fixture", buildableVersion: "Fixture", missing: [] },
    audience: ["developers"],
    monetization: { possible: false, models: [] },
    seo: { keywords: ["fixture"], faq: [] },
    scores: {
      technicalComplexity: 1,
      externalDependency: 1,
      proprietaryData: 0,
      infrastructure: 1,
      buildCost: 1,
      maintenanceCost: 1,
      personalValue: 1,
      gapFromOriginal: 1,
      iranRisk: 0,
      economicValue: 1,
    },
  };
}

function entry(value: CatalogRecord, fileSlug = value.slug): CatalogFileEntry {
  return {
    filePath: `src/data/apps/${fileSlug}.json`,
    record: value,
  };
}

function compare(
  oldRecords: readonly CatalogRecord[],
  newRecords: readonly CatalogRecord[]
) {
  return compareCatalogSnapshots(oldRecords.map(entry), newRecords.map(entry));
}

function emptyChanges(): CatalogChanges {
  return {
    addedPublished: [],
    updatedPublished: [],
    removedPublished: [],
  };
}

test("unchanged snapshots produce zero semantic changes", () => {
  const tool = record("same-tool");
  const changes = compare([tool], [structuredClone(tool)]);

  assert.deepEqual(changes, emptyChanges());
  assert.deepEqual(planImpactedUrls(changes), []);
});

test("draft to published is classified as addedPublished", () => {
  const changes = compare(
    [record("new-tool", "draft")],
    [record("new-tool", "published")]
  );

  assert.deepEqual(
    changes.addedPublished.map(({ newRecord }) => newRecord.slug),
    ["new-tool"]
  );
});

test("review to published is classified as addedPublished", () => {
  const changes = compare(
    [record("new-tool", "review")],
    [record("new-tool", "published")]
  );

  assert.equal(changes.addedPublished.length, 1);
});

test("published to draft is classified as removedPublished", () => {
  const changes = compare(
    [record("old-tool", "published")],
    [record("old-tool", "draft")]
  );

  assert.deepEqual(
    changes.removedPublished.map(({ oldRecord }) => oldRecord.slug),
    ["old-tool"]
  );
});

test("published to review is removed with its former URL impact", () => {
  const changes = compare(
    [record("reviewed-tool", "published", "review-category")],
    [record("reviewed-tool", "review", "review-category")]
  );

  assert.deepEqual(
    changes.removedPublished.map(({ oldRecord }) => oldRecord.slug),
    ["reviewed-tool"]
  );
  assert.deepEqual(planImpactedUrls(changes), [
    "https://sakhtanie.ir/",
    "https://sakhtanie.ir/categories/review-category/",
    "https://sakhtanie.ir/tools/reviewed-tool/",
  ]);
});

test("schema and planner share safe catalog path-segment rules", () => {
  const source = schemaValidRecord();
  const validSegments = ["notion", "ai-coding", "github-copilot"];
  const unsafeSegments = ["", "/", "\\", ".", "..", "../tools", "a?b", "a#b", "a b"];

  for (const segment of validSegments) {
    assert.equal(isSafeCatalogPathSegment(segment), true);
    assert.equal(
      appSchema.safeParse({ ...source, slug: segment, category: segment }).success,
      true
    );
  }

  for (const segment of unsafeSegments) {
    assert.equal(isSafeCatalogPathSegment(segment), false, segment);
    assert.equal(
      appSchema.safeParse({ ...source, slug: segment, category: segment }).success,
      false,
      segment
    );
    assert.throws(() => planImpactedUrls({
      addedPublished: [{ newRecord: record(segment) }],
      updatedPublished: [],
      removedPublished: [],
    }));
  }
});

test("published to archived is classified as removedPublished", () => {
  const changes = compare(
    [record("old-tool", "published")],
    [record("old-tool", "archived")]
  );

  assert.equal(changes.removedPublished.length, 1);
});

test("published record deletion is classified as removedPublished", () => {
  const changes = compare([record("deleted-tool")], []);

  assert.equal(changes.removedPublished[0]?.oldRecord.slug, "deleted-tool");
});

test("published record addition is classified as addedPublished", () => {
  const changes = compare([], [record("added-tool")]);

  assert.equal(changes.addedPublished[0]?.newRecord.slug, "added-tool");
});

test("semantic edit to a published record is classified as updatedPublished", () => {
  const changes = compare(
    [record("edited-tool", "published", "productivity", { summary: "old" })],
    [record("edited-tool", "published", "productivity", { summary: "new" })]
  );

  assert.equal(changes.updatedPublished.length, 1);
  assert.equal(changes.updatedPublished[0]?.newRecord.slug, "edited-tool");
});

test("JSON property order alone does not count as an update", () => {
  const oldRecord: CatalogRecord = {
    slug: "ordered-tool",
    status: "published",
    category: "productivity",
    nested: { first: 1, second: 2 },
  };
  const newRecord: CatalogRecord = {
    nested: { second: 2, first: 1 },
    category: "productivity",
    status: "published",
    slug: "ordered-tool",
  };

  assert.deepEqual(compare([oldRecord], [newRecord]), emptyChanges());
});

test("JSON formatting alone does not count as an update", () => {
  const compact = JSON.parse(
    '{"slug":"formatted-tool","status":"published","category":"productivity","nested":{"value":1}}'
  ) as CatalogRecord;
  const formatted = JSON.parse(`{
    "category": "productivity",
    "nested": { "value": 1 },
    "status": "published",
    "slug": "formatted-tool"
  }`) as CatalogRecord;

  assert.deepEqual(compare([compact], [formatted]), emptyChanges());
});

test("category change plans old and new category URLs", () => {
  const changes = compare(
    [record("moving-tool", "published", "old-category")],
    [record("moving-tool", "published", "new-category")]
  );
  const urls = planImpactedUrls(changes);

  assert.deepEqual(urls, [
    "https://sakhtanie.ir/",
    "https://sakhtanie.ir/categories/new-category/",
    "https://sakhtanie.ir/categories/old-category/",
    "https://sakhtanie.ir/tools/moving-tool/",
  ]);
});

test("slug change is planned as old removal and new addition", () => {
  const changes = compare(
    [record("old-slug", "published", "old-category")],
    [record("new-slug", "published", "new-category")]
  );
  const urls = planImpactedUrls(changes);

  assert.equal(changes.removedPublished.length, 1);
  assert.equal(changes.addedPublished.length, 1);
  assert.deepEqual(urls, [
    "https://sakhtanie.ir/",
    "https://sakhtanie.ir/categories/new-category/",
    "https://sakhtanie.ir/categories/old-category/",
    "https://sakhtanie.ir/tools/new-slug/",
    "https://sakhtanie.ir/tools/old-slug/",
  ]);
});

test("duplicate URLs and repeated homepage impacts are removed", () => {
  const changes = compare(
    [],
    [record("first-tool"), record("second-tool")]
  );
  const urls = planImpactedUrls(changes);

  assert.equal(
    urls.filter((url) => url === "https://sakhtanie.ir/").length,
    1
  );
  assert.equal(
    urls.filter(
      (url) => url === "https://sakhtanie.ir/categories/productivity/"
    ).length,
    1
  );
});

test("every planned URL has canonical trailing slash and production origin", () => {
  const urls = planImpactedUrls(compare([], [record("canonical-tool")]));

  for (const url of urls) {
    assert.equal(url.endsWith("/"), true);
    assert.equal(new URL(url).origin, "https://sakhtanie.ir");
    assert.equal(assertCanonicalProductionUrl(url), url);
  }
});

test("non-Sakhtanie hosts and unsafe URL variants are rejected", () => {
  for (const url of [
    "https://example.com/tools/safe-tool/",
    "http://sakhtanie.ir/tools/safe-tool/",
    "https://user:pass@sakhtanie.ir/tools/safe-tool/",
    "https://sakhtanie.ir/tools/safe-tool/?preview=true",
    "https://sakhtanie.ir/tools/safe-tool/#section",
    "https://sakhtanie.ir/tools/safe-tool",
  ]) {
    assert.throws(() => assertCanonicalProductionUrl(url));
  }
});

test("more than 500 impacted URLs fails safely", () => {
  const records = Array.from({ length: 250 }, (_, index) =>
    record(
      `tool-${String(index).padStart(3, "0")}`,
      "published",
      `category-${String(index).padStart(3, "0")}`
    )
  );
  const changes = compare([], records);

  assert.throws(
    () => planImpactedUrls(changes),
    /501 impacted URLs.*ceiling of 500/
  );
});

test("planner emits no sitemap, RSS, key, asset, preview, or Vercel URLs", () => {
  const urls = planImpactedUrls(compare([], [record("safe-tool")]));
  const output = urls.join("\n");

  assert.doesNotMatch(output, /sitemap|rss\.xml|09e9b751|\/assets?\/|vercel/i);
  assert.equal(
    urls.every((url) => new URL(url).hostname === "sakhtanie.ir"),
    true
  );
});
