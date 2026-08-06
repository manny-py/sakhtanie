import type { SakhtanieApp } from "../types/app";

const appFiles = import.meta.glob(
  "../data/apps/*.json",
  {
    eager: true,
    import: "default",
  }
);

export const allApps: SakhtanieApp[] =
  Object.values(appFiles)
    .map((app) => app as SakhtanieApp);

export const apps: SakhtanieApp[] =
  allApps.filter(
    (app) => app.status === "published"
  );

export function getAppBySlug(slug: string) {
  return apps.find(
    (app) => app.slug === slug
  );
}
