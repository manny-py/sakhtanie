export const ANALYTICS_ORIGIN = (
  import.meta.env?.PUBLIC_ANALYTICS_ENDPOINT ??
  "https://sakhtanie-analytics-worker.ho-mohseni44.workers.dev"
).replace(/\/+$/, "");

export const ANALYTICS_OPT_OUT_KEY = "sakhtanie_analytics_opt_out";

type EmptyPayload = Record<string, never>;

export interface AnalyticsPayloadMap {
  page_view: EmptyPayload;
  tool_view: {
    tool_slug: string;
  };
  category_view: {
    category_slug: string;
  };
  search_used: {
    results_count: number;
  };
  tool_cta_click: {
    tool_slug: string;
  };
  related_tool_click: {
    tool_slug: string;
    related_tool_slug: string;
  };
  sponsor_impression: {
    sponsor_id: string;
  };
  sponsor_click: {
    sponsor_id: string;
  };
  advertise_cta_click: {
    placement: string;
  };
}

export type AnalyticsEvent = keyof AnalyticsPayloadMap;

type SanitizedAnalyticsEvent = {
  [Event in AnalyticsEvent]: {
    event: Event;
    payload: AnalyticsPayloadMap[Event];
  };
}[AnalyticsEvent];

const SAFE_IDENTIFIER = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function hasOnlyKeys(
  payload: Record<string, unknown>,
  allowedKeys: readonly string[]
) {
  const keys = Object.keys(payload);

  return (
    keys.length === allowedKeys.length &&
    keys.every((key) => allowedKeys.includes(key))
  );
}

export function isSafeAnalyticsIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 80 &&
    SAFE_IDENTIFIER.test(value)
  );
}

function isSafeCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 10_000
  );
}

/**
 * Runtime allowlisting is defense in depth. The Analytics Worker must enforce
 * the same schemas independently and reject all unexpected input.
 */
export function sanitizeAnalyticsEvent(
  event: unknown,
  payload: unknown
): SanitizedAnalyticsEvent | null {
  if (typeof event !== "string" || !isPlainRecord(payload)) {
    return null;
  }

  if (event === "page_view" && hasOnlyKeys(payload, [])) {
    return { event, payload: {} };
  }

  if (
    event === "tool_view" &&
    hasOnlyKeys(payload, ["tool_slug"]) &&
    isSafeAnalyticsIdentifier(payload.tool_slug)
  ) {
    return { event, payload: { tool_slug: payload.tool_slug } };
  }

  if (
    event === "category_view" &&
    hasOnlyKeys(payload, ["category_slug"]) &&
    isSafeAnalyticsIdentifier(payload.category_slug)
  ) {
    return { event, payload: { category_slug: payload.category_slug } };
  }

  if (
    event === "search_used" &&
    hasOnlyKeys(payload, ["results_count"]) &&
    isSafeCount(payload.results_count)
  ) {
    return { event, payload: { results_count: payload.results_count } };
  }

  if (
    event === "tool_cta_click" &&
    hasOnlyKeys(payload, ["tool_slug"]) &&
    isSafeAnalyticsIdentifier(payload.tool_slug)
  ) {
    return { event, payload: { tool_slug: payload.tool_slug } };
  }

  if (
    event === "related_tool_click" &&
    hasOnlyKeys(payload, ["tool_slug", "related_tool_slug"]) &&
    isSafeAnalyticsIdentifier(payload.tool_slug) &&
    isSafeAnalyticsIdentifier(payload.related_tool_slug)
  ) {
    return {
      event,
      payload: {
        tool_slug: payload.tool_slug,
        related_tool_slug: payload.related_tool_slug,
      },
    };
  }

  if (
    (event === "sponsor_impression" || event === "sponsor_click") &&
    hasOnlyKeys(payload, ["sponsor_id"]) &&
    isSafeAnalyticsIdentifier(payload.sponsor_id)
  ) {
    return { event, payload: { sponsor_id: payload.sponsor_id } };
  }

  if (
    event === "advertise_cta_click" &&
    hasOnlyKeys(payload, ["placement"]) &&
    isSafeAnalyticsIdentifier(payload.placement)
  ) {
    return { event, payload: { placement: payload.placement } };
  }

  return null;
}

function hasPrivacySignal() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const privacyNavigator = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    msDoNotTrack?: string | null;
  };

  const doNotTrackValues = [
    navigator.doNotTrack,
    privacyNavigator.msDoNotTrack,
    typeof window !== "undefined" ? window.doNotTrack : null,
  ];

  return (
    privacyNavigator.globalPrivacyControl === true ||
    doNotTrackValues.some((value) => value === "1" || value === "yes")
  );
}

export function hasLocalAnalyticsOptOut() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return localStorage.getItem(ANALYTICS_OPT_OUT_KEY) === "true";
  } catch {
    // If the preference cannot be read, fail closed instead of tracking
    // someone whose opt-out state cannot be determined.
    return true;
  }
}

export function isAnalyticsDisabled() {
  return hasPrivacySignal() || hasLocalAnalyticsOptOut();
}

export function setLocalAnalyticsOptOut(optOut: boolean) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (optOut) {
      localStorage.setItem(ANALYTICS_OPT_OUT_KEY, "true");
    } else {
      localStorage.removeItem(ANALYTICS_OPT_OUT_KEY);
    }

    window.dispatchEvent(
      new CustomEvent("sakhtanie:analytics-preference", {
        detail: { optOut },
      })
    );

    return true;
  } catch {
    return false;
  }
}

export function track<Event extends AnalyticsEvent>(
  event: Event,
  payload: AnalyticsPayloadMap[Event]
) {
  if (typeof window === "undefined" || isAnalyticsDisabled()) {
    return;
  }

  const data = sanitizeAnalyticsEvent(event, payload);

  if (!data) {
    return;
  }

  const body = JSON.stringify(data);

  try {
    if (typeof navigator.sendBeacon === "function") {
      const accepted = navigator.sendBeacon(ANALYTICS_ORIGIN, body);

      if (accepted) {
        return;
      }
    }

    fetch(ANALYTICS_ORIGIN, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body,
      keepalive: true,
    }).catch(() => {
      // Analytics failures must never affect site usage.
    });
  } catch {
    // Browser privacy controls or network failures must never affect the site.
  }
}
