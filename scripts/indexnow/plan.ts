import { compareCatalogSnapshots } from "./catalog-snapshot.ts";
import { loadCatalogAtCommit } from "./git-catalog.ts";
import { planImpactedUrls } from "./url-plan.ts";

interface PlannerArguments {
  base: string;
  head: string;
  json: boolean;
}

function parseArguments(arguments_: readonly string[]): PlannerArguments {
  let base: string | undefined;
  let head: string | undefined;
  let json = false;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];

    if (argument === "--json") {
      json = true;
      continue;
    }

    if (argument === "--base" || argument === "--head") {
      const value = arguments_[index + 1];

      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires an explicit Git reference.`);
      }

      if (argument === "--base") {
        base = value;
      } else {
        head = value;
      }

      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!base || !head) {
    throw new Error("Both --base and --head Git references are required.");
  }

  return { base, head, json };
}

function summarizePlan(
  base: string,
  head: string,
  changes: ReturnType<typeof compareCatalogSnapshots>,
  urls: readonly string[]
) {
  return {
    mode: "dry-run" as const,
    base,
    head,
    changes: {
      addedPublished: changes.addedPublished.map(({ newRecord }) => ({
        slug: newRecord.slug,
        category: newRecord.category,
      })),
      updatedPublished: changes.updatedPublished.map(
        ({ oldRecord, newRecord }) => ({
          slug: newRecord.slug,
          oldCategory: oldRecord.category,
          newCategory: newRecord.category,
        })
      ),
      removedPublished: changes.removedPublished.map(({ oldRecord }) => ({
        slug: oldRecord.slug,
        category: oldRecord.category,
      })),
    },
    urls,
  };
}

function printHumanReadable(plan: ReturnType<typeof summarizePlan>) {
  console.log("IndexNow dry-run URL plan");
  console.log(`Base SHA: ${plan.base}`);
  console.log(`Head SHA: ${plan.head}`);
  console.log(`Added published: ${plan.changes.addedPublished.length}`);
  console.log(`Updated published: ${plan.changes.updatedPublished.length}`);
  console.log(`Removed published: ${plan.changes.removedPublished.length}`);
  console.log(`Impacted URLs: ${plan.urls.length}`);
  console.log("Canonical impacted URLs:");

  if (plan.urls.length === 0) {
    console.log("(none)");
  } else {
    for (const url of plan.urls) {
      console.log(`- ${url}`);
    }
  }

  console.log("Dry-run only: no network request was made.");
}

try {
  const arguments_ = parseArguments(process.argv.slice(2));
  const baseSnapshot = loadCatalogAtCommit(arguments_.base);
  const headSnapshot = loadCatalogAtCommit(arguments_.head);
  const changes = compareCatalogSnapshots(
    baseSnapshot.entries,
    headSnapshot.entries
  );
  const urls = planImpactedUrls(changes);
  const plan = summarizePlan(
    baseSnapshot.commit,
    headSnapshot.commit,
    changes,
    urls
  );

  if (arguments_.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    printHumanReadable(plan);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
