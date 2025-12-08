// src/components/ARCanvas.tsx

import { Canvas } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { useTexture } from "@react-three/drei";
import { DoubleSide } from "three";

type ARCanvasProps = {
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
};

// Single XR store for the app
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
      {/* Button to enter AR on supported devices */}
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

      <Canvas>
        {/* XR wraps the scene and controls the camera when in AR */}
        <XR store={xrStore}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[1, 2, 3]} intensity={1.1} />

          {/* Artwork rendered ~1 meter in front of the user */}
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

  return (
    <mesh position={[0, 1.5, -2]}>
      {/* Plane sized according to the selected print dimensions */}
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}
