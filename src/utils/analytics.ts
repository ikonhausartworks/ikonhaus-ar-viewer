// src/utils/analytics.ts

// For now we keep this flexible: any string is allowed as an event name.
export type ARAnalyticsEvent = string;

export type ARAnalyticsPayload = Record<string, unknown> | undefined;

// Let TypeScript know about window.clarity and window.gtag
declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
  }
}

// Cached identity derived from URL (sid / uid) so we can join journeys
let cachedSessionId: string | undefined;
let cachedUserId: string | undefined;
let gaUserSet = false;

function initIdentityFromUrl() {
  if (typeof window === "undefined") return;
  if (cachedSessionId || cachedUserId) return; // already initialized

  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Convention:
    //   sid = anonymous session id
    //   uid = member / user id (from Wix Members or similar)
    const sid = params.get("sid") ?? undefined;
    const uid = params.get("uid") ?? undefined;

    cachedSessionId = sid;
    cachedUserId = uid;

    // If we have a user id, tell Clarity who this is
    if (uid && typeof window.clarity === "function") {
      try {
        // Clarity identify call
        window.clarity("identify", uid);
      } catch {
        // ignore
      }
    }

    // If we have a user id and GA is present, set GA4 user_id once
    if (uid && typeof window.gtag === "function") {
      try {
        window.gtag("set", { user_id: uid });
        gaUserSet = true;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore parsing issues
  }
}

/**
 * Central analytics helper.
 *
 * - In DEV: logs events to console.
 * - In PROD: sends custom events to:
 *    • Microsoft Clarity
 *    • Google Analytics 4 (GA4)
 */
export function trackEvent(
  event: ARAnalyticsEvent,
  payload?: ARAnalyticsPayload
) {
  // Initialize identity once, on first event
  initIdentityFromUrl();

  const safePayload: Record<string, unknown> =
    payload && Object.keys(payload).length > 0 ? { ...payload } : {};

  // Attach identity fields if present and not already set
  if (cachedSessionId && safePayload.sid === undefined) {
    safePayload.sid = cachedSessionId;
  }
  if (cachedUserId && safePayload.uid === undefined) {
    safePayload.uid = cachedUserId;
  }

  // Dev logging so you can see events in the console during local testing
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log("[analytics]", event, safePayload);
  }

  // ---- Microsoft Clarity ----
  if (typeof window !== "undefined" && typeof window.clarity === "function") {
    try {
      if (Object.keys(safePayload).length > 0) {
        window.clarity("event", event, safePayload);
      } else {
        window.clarity("event", event);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[analytics] clarity event failed", err);
      }
    }
  }

  // ---- Google Analytics 4 (via gtag) ----
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    try {
      // Ensure GA knows the user id if we have one and haven't set it yet
      if (cachedUserId && !gaUserSet) {
        window.gtag("set", { user_id: cachedUserId });
        gaUserSet = true;
      }

      // GA4 event
      if (Object.keys(safePayload).length > 0) {
        window.gtag("event", event, safePayload);
      } else {
        window.gtag("event", event, {});
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.warn("[analytics] gtag event failed", err);
      }
    }
  }
}
