import fs from "node:fs";
import path from "node:path";
import { appSchema } from "../src/lib/schema";

const dir = path.join(process.cwd(), "src/data/apps");

const files = fs.readdirSync(dir)
  .filter(file => file.endsWith(".json"));

let failed = false;

for (const file of files) {
  const content = JSON.parse(
    fs.readFileSync(
      path.join(dir, file),
      "utf-8"
    )
  );

  const result = appSchema.safeParse(content);

  if (!result.success) {
    failed = true;
    console.log(`✗ ${file}`);
    console.log(result.error.format());
  } else {
    console.log(`✓ ${file} valid`);
  }
}

if (failed) {
  process.exit(1);
}

console.log("\nAll data files are valid.");
