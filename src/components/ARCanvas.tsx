// src/components/ARCanvas.tsx

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { useTexture } from "@react-three/drei";
import { DoubleSide } from "three";

type ARCanvasProps = {
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
};

// Single XR store shared by this AR experience
const xrStore = createXRStore();

export default function ARCanvas({
  widthMeters,
  heightMeters,
  textureUrl,
}: ARCanvasProps) {
  const [showHint, setShowHint] = useState(false);

  const handleEnterAR = () => {
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
      {/* Button to enter AR on supported devices */}
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

      {/* Simple AR instructions overlay */}
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
              maxWidth: 320,
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
              Move your phone slowly, then look at your wall to see the artwork.
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

      <Canvas camera={{ position: [0, 0, 0], fov: 50 }}>
        {/* XR takes over the camera when AR is active */}
        <XR store={xrStore}>
          {/* Soft, gallery-like lighting */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 4, 3]} intensity={1.1} />
          <pointLight position={[-2, 2, -2]} intensity={0.4} />

          {/* Artwork at “gallery” height and distance */}
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

  // Approx: 0.8m above camera, 1.5m in front – feels like a hung piece
  const position: [number, number, number] = [0, 0.8, -1.5];

  return (
    <mesh position={position}>
      {/* Plane sized according to the selected print dimensions */}
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}
