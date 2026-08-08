export type AnalyticsEvent =
  | "page_view"
  | "tool_view"
  | "category_view"
  | "search_used"
  | "tool_cta_click"
  | "related_tool_click"
  | "client_error";

export interface AnalyticsPayload {
  path?: string;
  tool_slug?: string;
  category_slug?: string;
  query?: string;
  destination?: string;
  results_count?: number;
  [key: string]: string | number | boolean | undefined;
}

const ANALYTICS_ENDPOINT =
  "https://sakhtanie-analytics-worker.ho-mohseni44.workers.dev";

function getSessionId() {
  const key = "sak_session_id";

  const existing = localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID();

  localStorage.setItem(key, id);

  return id;
}

export function track(
  event: AnalyticsEvent,
  payload: AnalyticsPayload = {}
) {
  if (typeof window === "undefined") {
    return;
  }

  const data = {
    event,
    session_id: getSessionId(),
    path: window.location.pathname,
    payload,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(data);

  console.log("[analytics]", data);

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    const accepted = navigator.sendBeacon(
      ANALYTICS_ENDPOINT,
      body
    );

    if (accepted) {
      return;
    }
  }

  fetch(ANALYTICS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Analytics failure must never affect user experience.
  });
}
