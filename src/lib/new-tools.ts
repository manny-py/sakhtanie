import type { SakhtanieApp } from "../types/app";

export const NEW_TOOL_WINDOW_DAYS = 14;
export const MAX_NEW_TOOLS = 12;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

type PublishableTool = Pick<SakhtanieApp, "publishedAt" | "slug" | "status">;

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parsePublishedAt(publishedAt?: string): number | null {
  if (!publishedAt) return null;

  const timestamp = Date.parse(`${publishedAt}T00:00:00.000Z`);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getNewToolExpiry(tool: PublishableTool): number | null {
  const publishedAt = parsePublishedAt(tool.publishedAt);
  return publishedAt === null ? null : publishedAt + NEW_TOOL_WINDOW_DAYS * DAY_IN_MS;
}

export function isNewTool(tool: PublishableTool, now = new Date()): boolean {
  if (tool.status !== "published") return false;

  const publishedAt = parsePublishedAt(tool.publishedAt);
  if (publishedAt === null) return false;

  const ageInDays = (startOfUtcDay(now) - publishedAt) / DAY_IN_MS;
  return ageInDays >= 0 && ageInDays < NEW_TOOL_WINDOW_DAYS;
}

export function getNewTools<T extends PublishableTool>(
  catalog: T[],
  now = new Date(),
  limit = MAX_NEW_TOOLS,
): T[] {
  const safeLimit = Math.max(0, Math.min(limit, MAX_NEW_TOOLS));

  return catalog
    .filter((tool) => isNewTool(tool, now))
    .sort((a, b) => {
      const dateComparison = (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
      return dateComparison || a.slug.localeCompare(b.slug);
    })
    .slice(0, safeLimit);
}
