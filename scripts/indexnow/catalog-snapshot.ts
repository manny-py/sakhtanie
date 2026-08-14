export interface CatalogRecord {
  slug: string;
  status: string;
  category: string;
  [field: string]: unknown;
}

export interface CatalogFileEntry {
  filePath: string;
  record: CatalogRecord;
}

export interface AddedPublishedChange {
  newRecord: CatalogRecord;
}

export interface UpdatedPublishedChange {
  oldRecord: CatalogRecord;
  newRecord: CatalogRecord;
}

export interface RemovedPublishedChange {
  oldRecord: CatalogRecord;
}

export interface CatalogChanges {
  addedPublished: AddedPublishedChange[];
  updatedPublished: UpdatedPublishedChange[];
  removedPublished: RemovedPublishedChange[];
}

export function isPublished(record: CatalogRecord | undefined) {
  return record?.status === "published";
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalizeJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right, "en"))
        .map(([key, nestedValue]) => [key, canonicalizeJson(nestedValue)])
    );
  }

  return value;
}

export function semanticRecordString(record: CatalogRecord) {
  return JSON.stringify(canonicalizeJson(record));
}

export function createCatalogSnapshot(
  entries: readonly CatalogFileEntry[]
) {
  const records = new Map<string, CatalogRecord>();

  for (const { filePath, record } of [...entries].sort((left, right) =>
    left.filePath.localeCompare(right.filePath, "en")
  )) {
    if (records.has(record.slug)) {
      throw new Error(
        `Cannot compare catalog snapshot with duplicate slug "${record.slug}"; conflict includes ${filePath}.`
      );
    }

    records.set(record.slug, record);
  }

  return records;
}

export function compareCatalogSnapshots(
  oldEntries: readonly CatalogFileEntry[],
  newEntries: readonly CatalogFileEntry[]
): CatalogChanges {
  const oldRecords = createCatalogSnapshot(oldEntries);
  const newRecords = createCatalogSnapshot(newEntries);
  const slugs = [...new Set([...oldRecords.keys(), ...newRecords.keys()])]
    .sort((left, right) => left.localeCompare(right, "en"));
  const changes: CatalogChanges = {
    addedPublished: [],
    updatedPublished: [],
    removedPublished: [],
  };

  for (const slug of slugs) {
    const oldRecord = oldRecords.get(slug);
    const newRecord = newRecords.get(slug);
    const wasPublished = isPublished(oldRecord);
    const isNowPublished = isPublished(newRecord);

    if (!wasPublished && isNowPublished && newRecord) {
      changes.addedPublished.push({ newRecord });
      continue;
    }

    if (wasPublished && !isNowPublished && oldRecord) {
      changes.removedPublished.push({ oldRecord });
      continue;
    }

    if (
      wasPublished &&
      isNowPublished &&
      oldRecord &&
      newRecord &&
      semanticRecordString(oldRecord) !== semanticRecordString(newRecord)
    ) {
      changes.updatedPublished.push({ oldRecord, newRecord });
    }
  }

  return changes;
}
