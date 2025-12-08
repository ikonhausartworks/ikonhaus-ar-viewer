// src/utils/analytics.ts

export type ARAnalyticsEvent =
  | "ar_session_start"
  | "ar_size_change"
  | "ar_cta_click";

export function trackEvent(
  name: ARAnalyticsEvent,
  payload: Record<string, any> = {}
) {
  // For now, just log to the console so you can see it working.
  console.log("[AR EVENT]", name, payload);

  // Later, you can plug this into GA4, Plausible, etc. For example:
  // (window as any).gtag?.("event", name, payload);
}
