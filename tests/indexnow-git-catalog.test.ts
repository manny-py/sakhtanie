import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { loadCatalogAtCommit } from "../scripts/indexnow/git-catalog.ts";

function runGit(repository: string, args: readonly string[]) {
  return execFileSync("git", args, {
    cwd: repository,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function validRecord() {
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
    comparison: {
      original: "Fixture",
      buildableVersion: "Fixture",
      missing: [],
    },
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

function createFixtureRepository() {
  const repository = mkdtempSync(path.join(tmpdir(), "sakhtanie-indexnow-git-"));
  runGit(repository, ["init", "--quiet"]);
  runGit(repository, ["config", "user.name", "IndexNow test"]);
  runGit(repository, ["config", "user.email", "indexnow-test@example.invalid"]);

  writeFileSync(path.join(repository, "README.md"), "fixture\n", "utf8");
  runGit(repository, ["add", "README.md"]);
  runGit(repository, ["commit", "--quiet", "-m", "missing catalog"]);
  const missingCatalogCommit = runGit(repository, ["rev-parse", "HEAD"]);

  const catalogDirectory = path.join(repository, "src", "data", "apps");
  const catalogPath = path.join(catalogDirectory, "fixture-tool.json");
  mkdirSync(catalogDirectory, { recursive: true });
  writeFileSync(catalogPath, `${JSON.stringify(validRecord(), null, 2)}\n`, "utf8");
  runGit(repository, ["add", "src/data/apps/fixture-tool.json"]);
  runGit(repository, ["commit", "--quiet", "-m", "add catalog"]);
  const validCatalogCommit = runGit(repository, ["rev-parse", "HEAD"]);

  return { repository, missingCatalogCommit, validCatalogCommit };
}

function withFixture(callback: (fixture: ReturnType<typeof createFixtureRepository>) => void) {
  const fixture = createFixtureRepository();
  try {
    callback(fixture);
  } finally {
    rmSync(fixture.repository, { recursive: true, force: true });
  }
}

test("missing catalog tree fails when requested as the base snapshot", () => {
  withFixture(({ repository, missingCatalogCommit }) => {
    assert.throws(
      () => loadCatalogAtCommit(missingCatalogCommit, repository),
      new RegExp(`Catalog source is missing.*src/data/apps.*${missingCatalogCommit}`)
    );
  });
});

test("missing catalog tree fails when requested as the head snapshot", () => {
  withFixture(({ repository, missingCatalogCommit, validCatalogCommit }) => {
    loadCatalogAtCommit(validCatalogCommit, repository);
    assert.throws(
      () => loadCatalogAtCommit(missingCatalogCommit, repository),
      new RegExp(`Catalog source is missing.*src/data/apps.*${missingCatalogCommit}`)
    );
  });
});

test("existing catalog tree loads valid records", () => {
  withFixture(({ repository, validCatalogCommit }) => {
    const snapshot = loadCatalogAtCommit(validCatalogCommit, repository);
    assert.equal(snapshot.entries.length, 1);
    assert.equal(snapshot.entries[0]?.record.slug, "fixture-tool");
    assert.equal(snapshot.entries[0]?.record.status, "published");
    assert.equal(
      JSON.parse(
        readFileSync(
          path.join(repository, "src/data/apps/fixture-tool.json"),
          "utf8"
        )
      ).slug,
      "fixture-tool"
    );
  });
});
