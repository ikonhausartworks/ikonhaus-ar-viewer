// src/components/ARCanvas.tsx

import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { useTexture } from "@react-three/drei";
import { DoubleSide } from "three";

type ARCanvasProps = {
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
  canUseWebXR: boolean;
};

// Single XR store shared by this AR experience
const xrStore = createXRStore();

export default function ARCanvas({
  widthMeters,
  heightMeters,
  textureUrl,
  canUseWebXR,
}: ARCanvasProps) {
  const [showHint, setShowHint] = useState(true);
  const [arStarted, setArStarted] = useState(false);

  // Auto-hide the hint after a few seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterAR = () => {
    if (!canUseWebXR) return;
    setArStarted(true);
    xrStore.enterAR();
  };

  const showPlaneInPreview = !canUseWebXR; // Mode C (no WebXR) gets 3D preview
  const showPlaneInAR = canUseWebXR && arStarted; // WebXR: only show plane once AR starts

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#000",
      }}
    >
      {/* Top-left: Enter AR button OR 3D-only badge */}
      {canUseWebXR ? (
        <button
          onClick={handleEnterAR}
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            backgroundColor: "#fff",
            color: "#000",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Enter AR
        </button>
      ) : (
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

      {/* Simple instructions BEFORE immersive AR */}
      {showHint && (
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
              maxWidth: 360,
              backgroundColor: "rgba(0,0,0,0.75)",
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 999,
              fontSize: 14,
              display: "flex",
              gap: 8,
              alignItems: "center",
              pointerEvents: "auto",
            }}
          >
            <span>
              {canUseWebXR ? (
                <>
                  Tap <strong>Enter AR</strong> to view this artwork on your
                  wall. The preview will appear once AR starts.
                </>
              ) : (
                <>
                  This is a true-to-scale 3D preview of your selected size.
                  Rotate your device to see it from different angles.
                </>
              )}
            </span>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Canvas
        camera={{
          // Neutral preview camera; AR will override this when active
          position: [0, 0, 0],
          fov: 60,
        }}
      >
        {/* XR takes over the camera only when AR is active */}
        <XR store={xrStore}>
          {/* Soft, gallery-like lighting */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 4, 3]} intensity={1.1} />
          <pointLight position={[-2, 2, -2]} intensity={0.4} />

          {(showPlaneInPreview || showPlaneInAR) && (
            <ArtworkPlane
              width={widthMeters}
              height={heightMeters}
              textureUrl={textureUrl}
            />
          )}
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

  // AR placement: ~1.5m away, mid-wall height
  const position: [number, number, number] = [0, 1.1, -1.5];

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}
