// src/pages/ARViewer.tsx

import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { artworks, type Artwork, type ArtworkSize } from "../data/artworks";
import { trackEvent } from "../utils/analytics";
import ARCanvas from "../components/ARCanvas";
import {
  detectARCapabilities,
  type ARCapabilities,
} from "../utils/capabilities";

export default function ARViewer() {
  const { artId } = useParams();

  const artwork: Artwork | undefined = useMemo(
    () => artworks.find((a) => a.id === artId),
    [artId]
  );

  if (!artwork) {
    return (
      <div style={{ padding: 20 }}>
        <h1>IkonHaus AR Viewer</h1>
        <p>Artwork not found for id: {artId}</p>
      </div>
    );
  }

  const [selectedSizeId, setSelectedSizeId] = useState<string>(
    artwork.defaultSizeId
  );
  const [arMode, setArMode] = useState<boolean>(false);
  const [capabilities, setCapabilities] = useState<ARCapabilities | null>(null);

  const selectedSize: ArtworkSize =
    artwork.sizes.find((s) => s.id === selectedSizeId) ?? artwork.sizes[0];

  useEffect(() => {
    trackEvent("ar_session_start", {
      artId: artwork.id,
      title: artwork.title,
    });

    const caps = detectARCapabilities();
    setCapabilities(caps);

    trackEvent("ar_capabilities_detected" as any, {
      artId: artwork.id,
      isIOS: caps.isIOS,
      isAndroid: caps.isAndroid,
      webxrSupported: caps.webxrSupported,
    });
  }, [artwork.id, artwork.title]);

  const webxrSupported = capabilities?.webxrSupported ?? false;

  const handleStartPreview = () => {
    setArMode(true);
    trackEvent("ar_preview_started" as any, {
      artId: artwork.id,
      sizeId: selectedSize.id,
      sizeLabel: selectedSize.label,
      webxrSupported,
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111",
        color: "#fff",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          marginBottom: "6px",
          textAlign: "center",
        }}
      >
        {artwork.title}
      </h1>

      <p
        style={{
          marginBottom: "10px",
          opacity: 0.8,
          textAlign: "center",
          fontSize: "0.9rem",
        }}
      >
        Choose a size and then preview this piece at true scale in AR.
      </p>

      {capabilities && !webxrSupported && (
        <p
          style={{
            marginBottom: "12px",
            fontSize: "0.85rem",
            opacity: 0.7,
            textAlign: "center",
          }}
        >
          AR view isn&apos;t available on this device yet, but you can still see
          a true-to-scale 3D preview.
        </p>
      )}

      {/* Size selector */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {artwork.sizes.map((size) => (
          <button
            key={size.id}
            onClick={() => {
              setSelectedSizeId(size.id);
              trackEvent("ar_size_change", {
                artId: artwork.id,
                newSizeId: size.id,
                newSizeLabel: size.label,
              });
            }}
            style={{
              padding: "8px 14px",
              borderRadius: "999px",
              border:
                size.id === selectedSizeId
                  ? "2px solid #fff"
                  : "1px solid #555",
              backgroundColor:
                size.id === selectedSizeId ? "#fff" : "transparent",
              color: size.id === selectedSizeId ? "#000" : "#fff",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {size.label}
          </button>
        ))}
      </div>

      {/* AR / 3D preview entry button */}
      {!arMode && (
        <button
          onClick={handleStartPreview}
          style={{
            padding: "10px 20px",
            borderRadius: "12px",
            backgroundColor: "#fff",
            color: "#000",
            fontWeight: 600,
            marginBottom: "14px",
            cursor: "pointer",
            fontSize: "0.95rem",
          }}
        >
          {webxrSupported ? "Start AR Preview" : "Start 3D Preview"}
        </button>
      )}

      {/* AR preview container */}
      {arMode && (
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            // shorter on mobile so you don't need page zoom
            height: "50vh",
            marginBottom: "18px",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #333",
            backgroundColor: "#000",
          }}
        >
          <ARCanvas
            widthMeters={selectedSize.widthMeters}
            heightMeters={selectedSize.heightMeters}
            textureUrl={selectedSize.textureUrl}
            canUseWebXR={webxrSupported}
          />
        </div>
      )}

      {/* CTAs */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "6px",
        }}
      >
        <button
          onClick={() => {
            trackEvent("ar_cta_click", {
              artId: artwork.id,
              sizeId: selectedSize.id,
              sizeLabel: selectedSize.label,
              cta: "view_details",
            });
            window.location.href = selectedSize.pdpUrl;
          }}
          style={{
            padding: "9px 18px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#fff",
            color: "#000",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          View Details
        </button>

        <button
          onClick={() => {
            trackEvent("ar_cta_click", {
              artId: artwork.id,
              sizeId: selectedSize.id,
              sizeLabel: selectedSize.label,
              cta: "add_to_cart",
            });
            window.location.href = selectedSize.cartUrl;
          }}
          style={{
            padding: "9px 18px",
            borderRadius: "999px",
            border: "1px solid #fff",
            backgroundColor: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Add to Cart
        </button>
      </div>

      <p
        style={{
          marginTop: "6px",
          fontSize: "0.8rem",
          opacity: 0.6,
          textAlign: "center",
        }}
      >
        Selected size: {selectedSize.label}
        <br />
        <span style={{ opacity: 0.7 }}>
          For the most accurate AR sizing, stand about 1.5–2m from your wall
          before entering AR.
        </span>
      </p>
    </div>
  );
}
