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

  // New: track when XR session is actually active so we can time UX properly
  const [xrSessionActive, setXrSessionActive] = useState(false);

  const handleEnterAR = () => {
    if (!canUseWebXR) return;

    trackEvent("ar_enter_ar_click" as any, {
      artId,
      sizeId,
      sizeLabel,
    });

    setShowHint(true);
    setShowTrackingHelp(true);

    // Do not change behavior: still enter AR exactly the same way
    xrStore.enterAR();
  };

  // Auto-dismiss tracking help AFTER XR session is active (UX-only)
  useEffect(() => {
    if (!showTrackingHelp) return;
    if (!xrSessionActive) return;

    const t = window.setTimeout(() => setShowTrackingHelp(false), 20000); // 20s after session becomes active
    return () => window.clearTimeout(t);
  }, [showTrackingHelp, xrSessionActive]);

  return (
    <div
