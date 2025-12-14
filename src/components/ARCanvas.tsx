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

    setShowHint(true);
    setShowTrackingHelp(true);

    xrStore.enterAR();
  };

  // Auto-dismiss tracking help after a few seconds (UX only)
  useEffect(() => {
    if (!showTrackingHelp) return;
    const t = window.setTimeout(() => setShowTrackingHelp(false), 15000);
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
            border: "1px solid #666",
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 12,
          }}
        >
          3D preview only on this device
        </div>
      )}

      {/* Center reticle (clickable) + label underneath */}
      {canUseWebXR && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 11,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
            }}
          >
            {/* Reticle container */}
            <div style={{ position: "relative", width: 54, height: 54 }}>
              {/* Click target: invisible button ON the reticle */}
              <button
                type="button"
                onClick={handleEnterAR}
                aria-label="Enter AR"
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  pointerEvents: "auto",
                  // subtle shadow ring so it reads as tappable without looking like a big white disc
                  boxShadow: "0 0 0 3px rgba(0,0,0,0.25)",
                }}
              />

              {/* Reticle visual */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  border: "2px solid rgba(255,255,255,0.7)",
                  boxShadow: "0 0 0 3px rgba(0,0,0,0.25)",
                  pointerEvents: "none",
                }}
                aria-hidden="true"
              >
                {/* crosshair */}
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: 7,
                    bottom: 7,
                    width: 2,
                    transform: "translateX(-50%)",
                    background: "rgba(255,255,255,0.7)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 7,
                    right: 7,
                    height: 2,
                    transform: "translateY(-50%)",
                    background: "rgba(255,255,255,0.7)",
                  }}
                />
              </div>
            </div>

            {/* Label under reticle */}
            <div
              style={{
                backgroundColor: "rgba(0,0,0,0.62)",
                border: "1px solid rgba(255,255,255,0.14)",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 850,
                letterSpacing: 0.2,
                lineHeight: 1,
                pointerEvents: "none",
                boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
              }}
              aria-hidden="true"
            >
              Tap reticle to enter AR
            </div>
          </div>
        </div>
      )}

      {/* Tracking help panel (UX only; auto-dismiss) */}
      {showTrackingHelp && canUseWebXR && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            zIndex: 12,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              backgroundColor: "rgba(0,0,0,0.78)",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "#fff",
              padding: "10px 12px",
              borderRadius: 14,
              fontSize: 13,
              lineHeight: 1.35,
              boxShadow: "0 10px 26px rgba(0,0,0,0.45)",
              pointerEvents: "auto",
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              Having trouble on light/blank walls?
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, opacity: 0.92 }}>
              <li>
                Aim at a <strong>corner/edge</strong> (ceiling line, trim,
                doorway) for 2–3 seconds.
              </li>
              <li>
                Avoid <strong>glare</strong> and bright windows; try a different
                angle.
              </li>
              <li>
                Move your phone <strong>slowly</strong> until tracking stabilizes.
              </li>
            </ul>

            <button
              type="button"
              onClick={() => setShowTrackingHelp(false)}
              style={{
                marginTop: 8,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.10)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Hint after entering AR */}
      {showHint && canUseWebXR && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            right: 0,
            zIndex: 10,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              maxWidth: 380,
              backgroundColor: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 999,
              fontSize: 14,
              display: "flex",
              gap: 10,
              alignItems: "center",
              pointerEvents: "auto",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <span style={{ opacity: 0.95 }}>
              Move slowly. If you don’t see it, aim at an edge/corner for a
              moment.
            </span>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
              aria-label="Dismiss hint"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Preview camera – AR overrides this when active */}
      <Canvas camera={{ position: [0, 0, 2], fov: 45 }}>
        <XR store={xrStore}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 4, 3]} intensity={1.1} />
          <pointLight position={[-2, 2, -2]} intensity={0.4} />

          <ArtworkPlane
            width={widthMeters}
            height={heightMeters}
            textureUrl={textureUrl}
          />
        </XR>
      </Canvas>
    </div>
  );
}

type ArtworkPlaneProps = {
  width: number;
  height: number;
  textureUrl: string;
};

function ArtworkPlane({ width, height, textureUrl }: ArtworkPlaneProps) {
  const texture = useTexture(textureUrl);

  // Is an XR session currently active?
  const session = useXR((xr) => xr.session);
  const isPresenting = !!session;

  // ✅ AR placement: unchanged
  const arPosition: [number, number, number] = [0, 1.1, -1.8];

  // ✅ Preview placement: unchanged
  const previewPosition: [number, number, number] = [0, 0, -1.4];

  const position = isPresenting ? arPosition : previewPosition;

  // ✅ Physical correction: unchanged
  const physicalScaleCorrection = 1.22;
  const baseWidth = width * physicalScaleCorrection;
  const baseHeight = height * physicalScaleCorrection;

  // ✅ Preview boost: unchanged
  const previewScaleFactor = 3.0;
  const scale = isPresenting ? 1 : previewScaleFactor;

  const displayWidth = baseWidth * scale;
  const displayHeight = baseHeight * scale;

  return (
    <mesh position={position}>
      <planeGeometry args={[displayWidth, displayHeight]} />
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}
