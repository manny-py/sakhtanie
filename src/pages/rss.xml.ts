import { apps } from "../lib/apps";
import { renderRss } from "../lib/rss";

export function GET() {
  return new Response(renderRss(apps), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
