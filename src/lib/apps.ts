import type { SakhtanieApp } from "../types/app";

const appFiles = import.meta.glob(
  "../data/apps/*.json",
  {
    eager: true,
    import: "default",
  }
);

export const apps: SakhtanieApp[] = Object.values(appFiles)
  .map((app) => app as SakhtanieApp);


export function getAppBySlug(slug: string) {
  return apps.find(
    (app) => app.slug === slug
  );
}
