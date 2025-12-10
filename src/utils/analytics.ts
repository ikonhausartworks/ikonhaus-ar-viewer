// src/utils/analytics.ts

// Ensure Clarity still works
declare global {
  interface Window {
    clarity?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Unified analytics tracker:
 *  - Microsoft Clarity
 *  - Google Analytics 4 (GA4)
 */
export function trackEvent(eventName: string, data: Record<string, any> = {}) {
  // --- Microsoft Clarity event ---
  try {
    window.clarity?.("event", eventName, data);
  } catch (err) {
    console.warn("Clarity tracking failed:", err);
  }

  // --- GA4 event ---
  try {
    window.gtag?.("event", eventName, data);
  } catch (err) {
    console.warn("GA4 tracking failed:", err);
  }
}
