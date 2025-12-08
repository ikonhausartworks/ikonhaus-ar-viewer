// src/utils/capabilities.ts

export type ARCapabilities = {
  isIOS: boolean;
  isAndroid: boolean;
  webxrSupported: boolean;
  forcedMode?: "3d" | "default";
};

export function detectARCapabilities(): ARCapabilities {
  // Default values
  let isIOS = false;
  let isAndroid = false;
  let webxrSupported = false;
  let forcedMode: "3d" | "default" = "default";

  // Guard for build / non-browser environments
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isIOS,
      isAndroid,
      webxrSupported,
      forcedMode,
    };
  }

  // Optional override via query string, e.g. ?forceMode=3d
  const searchParams = new URLSearchParams(window.location.search);
  const forceModeParam = searchParams.get("forceMode");

  if (forceModeParam === "3d") {
    // Force fallback (non-WebXR) behavior
    forcedMode = "3d";
    return {
      isIOS: false,
      isAndroid: false,
      webxrSupported: false,
      forcedMode,
    };
  }

  const ua = navigator.userAgent || (navigator as any).vendor || "";

  isIOS = /iPad|iPhone|iPod/.test(ua);
  isAndroid = /Android/i.test(ua);

  // Basic WebXR presence check
  webxrSupported = typeof (navigator as any).xr !== "undefined";

  return {
    isIOS,
    isAndroid,
    webxrSupported,
    forcedMode,
  };
}
