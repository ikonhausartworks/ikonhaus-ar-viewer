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

  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnterAR = () => {
    if (!canUseWebXR) return;
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

      {/* Simple instructions */}
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
                  Tap <strong>Enter AR</strong>, then move your phone slowly and
                  look straight ahead to see the artwork in front of you.
                </>
              ) : (
                <>
                  This is a true-to-scale 3D preview of your selected size.
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
          // Simple preview camera: at origin, looking down -Z
          position: [0, 0, 0],
          fov: 50,
        }}
      >
        {/* XR will override the camera only during AR */}
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

  // Fixed position in front of the camera.
  // In AR: ~1.5m straight ahead at the same vertical level as the device.
  // In preview: centered in the frame.
  const position: [number, number, number] = [0, 0, -1.5];

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}
