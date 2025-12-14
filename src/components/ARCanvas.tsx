// src/components/ARCanvas.tsx

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, createXRStore, useXR } from "@react-three/xr";
import { useTexture } from "@react-three/drei";
import { DoubleSide } from "three";
import { trackEvent } from "../utils/analytics";

type ARCanvasProps = {
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
  canUseWebXR: boolean;
  artId: string;
  sizeId: string;
  sizeLabel: string;
};

// Single XR store shared by this AR experience
const xrStore = createXRStore();

export default function ARCanvas({
  widthMeters,
  heightMeters,
  textureUrl,
  canUseWebXR,
  artId,
  sizeId,
  sizeLabel,
}: ARCanvasProps) {
  const [showHint, setShowHint] = useState(false);
  const [showTrackingHelp, setShowTrackingHelp] = useState(false);

  const handleEnterAR = () => {
    if (!canUseWebXR) return;

    trackEvent("ar_enter_ar_click" as any, {
      artId,
      sizeId,
      sizeLabel,
    });

    // Existing behavior: show hint after AR entry
    setShowHint(true);

    // UX only: show tracking help briefly
    setShowTrackingHelp(true);

    xrStore.enterAR();
  };

  // Auto-dismiss tracking help after a few seconds (UX only)
  useEffect(() => {
    if (!showTrackingHelp) return;
    const t = window.setTimeout(() => setShowTrackingHelp(false), 9000);
    return () => window.clearTimeout(t);
  }, [showTrackingHelp]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#000",
      }}
    >
      {/* Top-left info for non-WebXR devices */}
      {!canUseWebXR && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            padding: "6px 12px",
            borderRadius: 999,
