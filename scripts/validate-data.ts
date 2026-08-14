import fs from "node:fs";
import path from "node:path";
import { appSchema } from "../src/lib/schema";
import {
  catalogInvariantErrors,
  type CatalogIdentityEntry,
} from "./lib/catalog-validation";

const dir = path.join(process.cwd(), "src/data/apps");

const files = fs.readdirSync(dir)
  .filter(file => file.endsWith(".json"))
  .sort((left, right) => left.localeCompare(right, "en"));

let failed = false;
const entries: CatalogIdentityEntry[] = [];

for (const file of files) {
  let content: unknown;

  try {
    content = JSON.parse(
      fs.readFileSync(
        path.join(dir, file),
        "utf-8"
      )
    );
  } catch (error) {
    failed = true;
    console.log(`✗ ${file}`);
    console.log(
      `  Invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
    continue;
  }

  const result = appSchema.safeParse(content);

  if (!result.success) {
    failed = true;
    console.log(`✗ ${file}`);
    console.log(result.error.format());
  } else {
    entries.push({
      filePath: path.join("src/data/apps", file),
      record: result.data,
    });
    console.log(`✓ ${file} valid`);
  }
}

for (const error of catalogInvariantErrors(entries)) {
  failed = true;
  console.log(`✗ ${error}`);
}

if (failed) {
  process.exit(1);
}

console.log("\nAll data files are valid.");
