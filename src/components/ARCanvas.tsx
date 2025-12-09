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

  // ✅ AR placement: your calibrated “feels right” setting
  const arPosition: [number, number, number] = [0, 1.1, -1.8];

  // ✅ Preview placement: centered and closer in the card
  const previewPosition: [number, number, number] = [0, 0, -1.4];

  const position = isPresenting ? arPosition : previewPosition;

  // ✅ 1) Physical correction so AR matches your real 16×20 outer size
  const physicalScaleCorrection = 1.31; // tuned vs real 16x20 at ~1.7m distance
  const baseWidth = width * physicalScaleCorrection;
  const baseHeight = height * physicalScaleCorrection;

  // ✅ 2) Extra visual boost ONLY in preview (so it’s not tiny in the card)
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
