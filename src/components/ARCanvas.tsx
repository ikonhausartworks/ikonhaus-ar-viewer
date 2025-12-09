// src/components/ARCanvas.tsx

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, createXRStore, useXR } from "@react-three/xr";
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
  const [showHint, setShowHint] = useState(false);

  const handleEnterAR = () => {
    if (!canUseWebXR) return;
    setShowHint(true);
    xrStore.enterAR();
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#000",
      }}
    >
      {/* Top-left control */}
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
              maxWidth: 340,
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
              Move your phone slowly, then look at your wall to see the
              artwork.
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

      {/* IMPORTANT: camera unchanged from your working AR setup */}
      <Canvas camera={{ position: [0, 0, 0], fov: 50 }}>
        {/* XR takes over the camera only when AR is active */}
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
  const { isPresenting } = useXR();

  // ✅ AR placement: DO NOT TOUCH — this is your calibrated “feels right” setting
  const arPosition: [number, number, number] = [0, 1.1, -1.8];

  // ✅ Preview placement: centered and a bit back so it actually shows nicely
  const previewPosition: [number, number, number] = [0, 0, -2.2];

  // When AR session is active, use AR position; otherwise use preview position
  const position = isPresenting ? arPosition : previewPosition;

  return (
    <mesh position={position}>
      {/* Plane sized according to the selected print dimensions */}
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}
