// src/utils/analytics.ts

// For now we keep this simple: any string is allowed as an event name.
// (We already handle more specific names at the call sites.)
export type ARAnalyticsEvent = string;

export type ARAnalyticsPayload = Record<string, unknown> | undefined;

// Let TypeScript know about window.clarity
declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
  }
}

/**
 * Central analytics helper.
 *
 * - In DEV: logs events to console.
 * - In PROD: sends custom events to Microsoft Clarity, if available.
 */
export function trackEvent(
  event: ARAnalyticsEvent,
  payload?: ARAnalyticsPayload
) {
  // Dev logging so you can see events in the console during local testing
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[analytics]", event, payload ?? {});
  }

  if (typeof window === "undefined" || typeof window.clarity !== "function") {
    return;
  }

  try {
    // Clarity supports custom events: clarity("event", name, data)
    if (payload && Object.keys(payload).length > 0) {
      window.clarity("event", event, payload);
    } else {
      window.clarity("event", event);
    }
  } catch (err) {
    // Fail safe – never break the app because of analytics
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn("[analytics] clarity event failed", err);
    }
  }
}
