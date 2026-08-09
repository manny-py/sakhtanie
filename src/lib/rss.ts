import type { SakhtanieApp } from "../types/app";

type RssApp = Pick<SakhtanieApp, "slug" | "name" | "summary">;

const SITE_URL = "https://sakhtanie.ir";

export function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&apos;",
    };

    return entities[character];
  });
}

export function renderRss(apps: RssApp[]) {
  const items = apps
    .map((app) => {
      const link = new URL(
        `/tools/${encodeURIComponent(app.slug)}`,
        SITE_URL
      ).toString();

      return `    <item>
      <title>${escapeXml(app.name.fa)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(app.summary)}</description>
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>ساختنیه؟</title>
    <link>${SITE_URL}</link>
    <description>بررسی ابزارهایی که می‌شود با AI ساخت.</description>
${items}
  </channel>
</rss>
`;
}
