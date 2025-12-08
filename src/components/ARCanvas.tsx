// src/components/ARCanvas.tsx

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  XR,
  createXRStore,
  IfInSessionMode,
  XRDomOverlay,
  useXRRequestHitTest,
} from "@react-three/xr";
import { useTexture } from "@react-three/drei";
import { DoubleSide, Matrix4, Vector3 } from "three";

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
        <XR store={xrStore}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[1, 2, 3]} intensity={1.1} />

          <ArtworkPlacement
            widthMeters={widthMeters}
            heightMeters={heightMeters}
            textureUrl={textureUrl}
          />
        </XR>
      </Canvas>
    </div>
  );
}

type ArtworkPlacementProps = {
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
};

type Vec3 = [number, number, number];

const matrixHelper = new Matrix4();
const vectorHelper = new Vector3();

function ArtworkPlacement({
  widthMeters,
  heightMeters,
  textureUrl,
}: ArtworkPlacementProps) {
  // Position of the artwork in AR space; null = not placed yet
  const [position, setPosition] = useState<Vec3 | null>([0, 0, -1]);

  const requestHitTest = useXRRequestHitTest();

  const handlePlace = async () => {
    try {
      const hitTestResult = await requestHitTest("viewer", ["plane"]);
      const { results, getWorldMatrix } = hitTestResult;

      if (results && results.length > 0) {
        // Use the first hit result
        getWorldMatrix(matrixHelper, results[0]);
        vectorHelper.setFromMatrixPosition(matrixHelper);

        setPosition([vectorHelper.x, vectorHelper.y, vectorHelper.z]);
      }
    } catch (e) {
      console.warn("Hit test failed:", e);
    }
  };

  return (
    <>
      {/* DOM overlay shown only while in AR session */}
      <IfInSessionMode allow={"immersive-ar"}>
        <XRDomOverlay>
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={handlePlace}
              style={{
                padding: "10px 20px",
                borderRadius: 999,
                border: "none",
                backgroundColor: "#ffffff",
                color: "#000000",
                fontWeight: 600,
              }}
            >
              Place Artwork
            </button>
          </div>
        </XRDomOverlay>
      </IfInSessionMode>

      {/* Only render the artwork if we have a position */}
      {position && (
        <ArtworkPlane
          width={widthMeters}
          height={heightMeters}
          textureUrl={textureUrl}
          position={position}
        />
      )}
    </>
  );
}

type ArtworkPlaneProps = {
  width: number;
  height: number;
  textureUrl: string;
  position: Vec3;
};

function ArtworkPlane({
  width,
  height,
  textureUrl,
  position,
}: ArtworkPlaneProps) {
  const texture = useTexture(textureUrl);

  return (
    <mesh position={position}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial map={texture} side={DoubleSide} />
    </mesh>
  );
}
