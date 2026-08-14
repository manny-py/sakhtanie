import type { CatalogChanges } from "./catalog-snapshot.ts";
import { isSafeCatalogPathSegment } from "../../src/lib/catalog-path-segment.ts";

export const PRODUCTION_ORIGIN = "https://sakhtanie.ir";
export const MAX_IMPACTED_URLS = 500;

export function assertCanonicalProductionUrl(candidate: string) {
  const url = new URL(candidate);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "sakhtanie.ir" ||
    url.port !== "" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !url.pathname.endsWith("/")
  ) {
    throw new Error(`Unsafe or non-canonical production URL: ${candidate}`);
  }

  return url.toString();
}

function assertSafePathSegment(value: string, label: string) {
  if (!isSafeCatalogPathSegment(value)) {
    throw new Error(`Unsafe ${label} for IndexNow planning: ${value}`);
  }
}

export function toolUrl(slug: string) {
  assertSafePathSegment(slug, "tool slug");
  return assertCanonicalProductionUrl(
    new URL(`/tools/${encodeURIComponent(slug)}/`, PRODUCTION_ORIGIN).toString()
  );
}

export function categoryUrl(category: string) {
  assertSafePathSegment(category, "category slug");
  return assertCanonicalProductionUrl(
    new URL(
      `/categories/${encodeURIComponent(category)}/`,
      PRODUCTION_ORIGIN
    ).toString()
  );
}

export function homepageUrl() {
  return assertCanonicalProductionUrl(`${PRODUCTION_ORIGIN}/`);
}

export function planImpactedUrls(
  changes: CatalogChanges,
  maximumUrls = MAX_IMPACTED_URLS
) {
  if (!Number.isSafeInteger(maximumUrls) || maximumUrls < 0) {
    throw new Error("Maximum impacted URL count must be a non-negative integer.");
  }

  const candidates: string[] = [];
  const includeHomepage = () => candidates.push(homepageUrl());

  for (const { newRecord } of changes.addedPublished) {
    candidates.push(toolUrl(newRecord.slug));
    candidates.push(categoryUrl(newRecord.category));
    includeHomepage();
  }

  for (const { oldRecord, newRecord } of changes.updatedPublished) {
    candidates.push(toolUrl(newRecord.slug));
    candidates.push(categoryUrl(oldRecord.category));
    candidates.push(categoryUrl(newRecord.category));
    includeHomepage();
  }

  for (const { oldRecord } of changes.removedPublished) {
    candidates.push(toolUrl(oldRecord.slug));
    candidates.push(categoryUrl(oldRecord.category));
    includeHomepage();
  }

  const urls = [...new Set(candidates)]
    .map(assertCanonicalProductionUrl)
    .sort((left, right) => left.localeCompare(right, "en"));

  if (urls.length > maximumUrls) {
    throw new Error(
      `IndexNow dry-run plan contains ${urls.length} impacted URLs, exceeding the local ceiling of ${maximumUrls}.`
    );
  }

  return urls;
}
