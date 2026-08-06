type AnalyticsEvent =
  | "page_view"
  | "tool_view"
  | "category_view"
  | "search_used";

interface EventPayload {
  [key: string]: string | number | boolean;
}


export function track(
  event: AnalyticsEvent,
  payload: EventPayload = {}
) {

  if (typeof window === "undefined") {
    return;
  }

  const data = {
    event,
    payload,
    timestamp: new Date().toISOString()
  };


  console.log(
    "[analytics]",
    data
  );


  /*
    Future providers:

    Google Analytics
    Plausible
    Umami
    Cloudflare Analytics

  */
}
