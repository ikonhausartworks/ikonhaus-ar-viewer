// src/pages/ARViewer.tsx

import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { artworks, type Artwork, type ArtworkSize } from "../data/artworks";
import { trackEvent } from "../utils/analytics";
import ARCanvas from "../components/ARCanvas";

export default function ARViewer() {
  const { artId } = useParams();

  // Find the artwork based on the URL id
  const artwork: Artwork | undefined = useMemo(
    () => artworks.find((a) => a.id === artId),
    [artId]
  );

  // If no artwork found, show a simple message
  if (!artwork) {
    return (
      <div style={{ padding: 20 }}>
        <h1>IkonHaus AR Viewer</h1>
        <p>Artwork not found for id: {artId}</p>
      </div>
    );
  }

  // Fire a session start event once when this viewer loads
  useEffect(() => {
    trackEvent("ar_session_start", {
      artId: artwork.id,
      title: artwork.title,
    });
  }, [artwork.id, artwork.title]);

  const [selectedSizeId, setSelectedSizeId] = useState<string>(
    artwork.defaultSizeId
  );
  const [arMode, setArMode] = useState<boolean>(false);

  const selectedSize: ArtworkSize =
    artwork.sizes.find((s) => s.id === selectedSizeId) ?? artwork.sizes[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111",
        color: "#fff",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1 style={{ fontSize: "2.2rem", marginBottom: "8px" }}>
        {artwork.title}
      </h1>
      <p style={{ marginBottom: "24px", opacity: 0.8, textAlign: "center" }}>
        Choose a size and then view this piece on your wall in AR.
      </p>

      {/* Size selector */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
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
              padding: "8px 16px",
              borderRadius: "999px",
              border:
                size.id === selectedSizeId
                  ? "2px solid #fff"
                  : "1px solid #555",
              backgroundColor:
                size.id === selectedSizeId ? "#fff" : "transparent",
              color: size.id === selectedSizeId ? "#000" : "#fff",
              cursor: "pointer",
            }}
          >
            {size.label}
          </button>
        ))}
      </div>

      {/* AR area */}
      {!arMode && (
        <button
          onClick={() => setArMode(true)}
          style={{
            padding: "12px 24px",
            borderRadius: "12px",
            backgroundColor: "#fff",
            color: "#000",
            fontWeight: 600,
            marginBottom: "24px",
            cursor: "pointer",
          }}
        >
          Start AR Preview
        </button>
      )}

      {arMode && (
        <div
          style={{
            width: "100%",
            maxWidth: "600px",
            height: "70vh",
            marginBottom: "24px",
            borderRadius: "16px",
            overflow: "hidden",
            border: "1px solid #333",
          }}
        >
          <ARCanvas
            widthMeters={selectedSize.widthMeters}
            heightMeters={selectedSize.heightMeters}
            textureUrl={selectedSize.textureUrl}
          />
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: "flex", gap: "12px" }}>
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
            padding: "10px 20px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#fff",
            color: "#000",
            cursor: "pointer",
            fontWeight: 600,
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
            padding: "10px 20px",
            borderRadius: "999px",
            border: "1px solid #fff",
            backgroundColor: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Add to Cart
        </button>
      </div>

      <p style={{ marginTop: "16px", fontSize: "0.85rem", opacity: 0.6 }}>
        Selected size: {selectedSize.label}
      </p>
    </div>
  );
}
