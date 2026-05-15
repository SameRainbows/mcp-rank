export type AnalyticsEvent =
  | "server_page_view"
  | "outbound_source_click"
  | "search_query"
  | "assistant_query"
  | "submit_server_click"
  | "claim_listing_click"
  | "comparison_page_view"
  | "badge_copy_click"
  | "newsletter_signup_attempt"
  | "watchlist_add"
  | "watchlist_remove"
  | "watchlist_view";

export function trackEvent(event: AnalyticsEvent, properties: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("mcp-rank:analytics", { detail: { event, properties } }));
}
