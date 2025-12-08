// src/utils/capabilities.ts

export type ARCapabilities = {
  isIOS: boolean;
  isAndroid: boolean;
  webxrSupported: boolean;
};

export function detectARCapabilities(): ARCapabilities {
  // Guard for build / non-browser environments
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isIOS: false,
      isAndroid: false,
      webxrSupported: false,
    };
  }

  const ua = navigator.userAgent || navigator.vendor || "";

  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/i.test(ua);

  // WebXR support check (very simple)
  const webxrSupported =
    typeof (navigator as any).xr !== "undefined";

  return {
    isIOS,
    isAndroid,
    webxrSupported,
  };
}
