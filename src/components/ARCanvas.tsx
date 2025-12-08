// src/components/ARCanvas.tsx

import React from "react";
import { Canvas } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { useTexture } from "@react-three/drei";

type ARCanvasProps = {
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
};

// Create a single XR store for the whole app
const xrStore = createXRStore();

export default function ARCanvas({
  widthMeters,
  heightMeters,
  textureUrl,
}: ARCanvasProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        backgroundColor: "#000",
      }}
    >
      {/* Button that actually enters AR on supported devices */}
      <button
        onClick={() => xrStore.enterAR()}
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

      <Canvas camera={{ position: [0, 1.4, 0] }}>
        <XR store={xrStore}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[1, 2, 3]} intensity={1.1} />

          {/* Artwork rendered at real-world size, ~1.4m high and 2m in front */}
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

function ArtworkPlane({
  width,
  height,
  textureUrl,
}: {
  width: number;
  height: number;
  textureUrl: string;
}) {
  const texture = useTexture(textureUrl);

  return (
    <mesh position={[0, 1.4, -2]} rotation={[0, Math.PI, 0]}>
      {/* Plane sized according to the selected print dimensions */}
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
}
