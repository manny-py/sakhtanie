import path from "node:path";

export interface CatalogIdentityEntry {
  filePath: string;
  record: {
    slug?: unknown;
  };
}

export function catalogInvariantErrors(
  entries: readonly CatalogIdentityEntry[]
) {
  const errors: string[] = [];
  const filesBySlug = new Map<string, string[]>();

  for (const { filePath, record } of [...entries].sort((left, right) =>
    left.filePath.localeCompare(right.filePath, "en")
  )) {
    if (typeof record.slug !== "string") {
      continue;
    }

    const basename = path.basename(filePath, ".json");

    if (basename !== record.slug) {
      errors.push(
        `Catalog filename/slug mismatch: ${filePath} contains slug "${record.slug}"; expected "${basename}".`
      );
    }

    const slugFiles = filesBySlug.get(record.slug) ?? [];
    slugFiles.push(filePath);
    filesBySlug.set(record.slug, slugFiles);
  }

  for (const [slug, files] of [...filesBySlug].sort(([left], [right]) =>
    left.localeCompare(right, "en")
  )) {
    if (files.length > 1) {
      errors.push(
        `Duplicate catalog slug "${slug}" found in: ${files.join(", ")}.`
      );
    }
  }

  return errors;
}

export function assertCatalogInvariants(
  entries: readonly CatalogIdentityEntry[]
) {
  const errors = catalogInvariantErrors(entries);

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }
}
