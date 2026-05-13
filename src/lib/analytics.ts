export type AnalyticsEvent =
  | "server_page_view"
  | "outbound_source_click"
  | "search_query"
  | "assistant_query"
  | "submit_server_click"
  | "claim_listing_click"
  | "badge_copy_click";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mcp-rank:analytics", { detail: { event, properties } }));
}
