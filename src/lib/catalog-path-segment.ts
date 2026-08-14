export const CATALOG_PATH_SEGMENT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSafeCatalogPathSegment(value: unknown): value is string {
  return (
    typeof value === "string" && CATALOG_PATH_SEGMENT_PATTERN.test(value)
  );
}
