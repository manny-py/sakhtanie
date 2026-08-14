import { execFileSync } from "node:child_process";

import { assertCatalogInvariants } from "../lib/catalog-validation.ts";
import { appSchema } from "../../src/lib/schema.ts";
import type {
  CatalogFileEntry,
  CatalogRecord,
} from "./catalog-snapshot.ts";

const CATALOG_DIRECTORY = "src/data/apps";

function runGit(arguments_: readonly string[], cwd = process.cwd()) {
  try {
    return execFileSync("git", arguments_, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trimEnd();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Read-only Git command failed: git ${arguments_.join(" ")}\n${message}`,
      { cause: error }
    );
  }
}

export function resolveGitCommit(reference: string, cwd = process.cwd()) {
  if (reference.trim() === "") {
    throw new Error("Git reference must not be empty.");
  }

  const resolved = runGit([
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${reference}^{commit}`,
  ], cwd).trim();

  if (!/^[0-9a-f]{40,64}$/.test(resolved)) {
    throw new Error(`Git reference did not resolve to a commit SHA: ${reference}`);
  }

  return resolved;
}

export function loadCatalogAtCommit(reference: string, cwd = process.cwd()) {
  const commit = resolveGitCommit(reference, cwd);
  const output = runGit([
    "ls-tree",
    "-r",
    "--name-only",
    commit,
    "--",
    CATALOG_DIRECTORY,
  ], cwd);
  // Git does not track empty directories, so an absent tree is never a valid
  // empty catalog snapshot and must fail closed.
  const catalogTree = runGit([
    "ls-tree",
    "-d",
    "--name-only",
    commit,
    "--",
    CATALOG_DIRECTORY,
  ], cwd);
  if (!catalogTree.split("\n").includes(CATALOG_DIRECTORY)) {
    throw new Error(
      `Catalog source is missing: expected Git path ${CATALOG_DIRECTORY} at resolved commit ${commit}.`
    );
  }
  const files = output
    .split("\n")
    .filter((filePath) => filePath.endsWith(".json"))
    .sort((left, right) => left.localeCompare(right, "en"));

  const entries: CatalogFileEntry[] = files.map((filePath) => {
    const raw = runGit(["show", `${commit}:${filePath}`], cwd);
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new Error(
        `Malformed catalog JSON at ${commit}:${filePath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error }
      );
    }

    const result = appSchema.safeParse(parsed);

    if (!result.success) {
      const issues = result.error.issues
        .map((issue) => `${issue.path.join(".") || "record"}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid catalog record at ${commit}:${filePath}: ${issues}`);
    }

    return {
      filePath,
      record: parsed as CatalogRecord,
    };
  });

  assertCatalogInvariants(entries);

  return { commit, entries };
}
