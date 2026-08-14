import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCatalogInvariants,
  catalogInvariantErrors,
} from "../scripts/lib/catalog-validation.ts";

test("catalog validation rejects duplicate slugs and identifies both files", () => {
  const entries = [
    {
      filePath: "src/data/apps/first.json",
      record: { slug: "duplicate" },
    },
    {
      filePath: "src/data/apps/second.json",
      record: { slug: "duplicate" },
    },
  ];

  assert.throws(
    () => assertCatalogInvariants(entries),
    /Duplicate catalog slug "duplicate".*first\.json.*second\.json/s
  );
});

test("catalog validation rejects a filename and slug mismatch", () => {
  const errors = catalogInvariantErrors([
    {
      filePath: "src/data/apps/example-tool.json",
      record: { slug: "different-slug" },
    },
  ]);

  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /example-tool\.json.*different-slug.*example-tool/);
});

test("catalog validation accepts matching unique filenames and slugs", () => {
  assert.doesNotThrow(() =>
    assertCatalogInvariants([
      {
        filePath: "src/data/apps/first-tool.json",
        record: { slug: "first-tool" },
      },
      {
        filePath: "src/data/apps/second-tool.json",
        record: { slug: "second-tool" },
      },
    ])
  );
});
