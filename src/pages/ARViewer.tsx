// src/pages/ARViewer.tsx
import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../utils/analytics";
import ARCanvas from "../components/ARCanvas";
import { detectARCapabilities, type ARCapabilities } from "../utils/capabilities";

type WixMediaField =
  | string
  | { url?: string; src?: string; fileUrl?: string }
  | null
  | undefined;

type CmsItem = {
  title?: string;
  artworkSlug?: string;

  sku: string;

  sizeCode: string; // "16 x 20 inches"
  frameColor: string; // "Black" / "White"
  orientation: string; // "PORTRAIT" / "LANDSCAPE"

  arImageWebp: WixMediaField;

  pdpUrl?: string;
  addToCartUrl?: string;

  sortIndex?: number;
};

type ArtworkSize = {
  id: string; // SKU
  label: string;
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
  pdpUrl: string;
  cartUrl: string;
};

type Artwork = {
  id: string; // artworkSlug
  title: string;
  defaultSizeId: string; // default SKU
  sizes: ArtworkSize[];
};

const WIX_API = "https://www.ikonhausartworks.com/_functions/arGallery";

export default function ARViewer() {
  const { artId } = useParams();
  const location = useLocation();
  const sku = new URLSearchParams(location.search).get("sku") || "";

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loadError, setLoadError] = useState<string>("");

  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const [arMode, setArMode] = useState<boolean>(false);
  const [capabilities, setCapabilities] = useState<ARCapabilities | null>(null);
  const [showPreflight, setShowPreflight] = useState<boolean>(true);

  // NEW: preload status for the selected texture
  const [textureReady, setTextureReady] = useState<boolean>(false);
  const [textureError, setTextureError] = useState<string>("");

  const webxrSupported = capabilities?.webxrSupported ?? false;

  // Capabilities
  useEffect(() => {
    const caps = detectARCapabilities();
    setCapabilities(caps);
  }, []);

  // Fetch from Wix CMS (by slug or sku)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoadError("");
        setArtwork(null);
        setArMode(false);

        const qs = artId
          ? `?artworkSlug=${encodeURIComponent(artId)}`
          : sku
          ? `?sku=${encodeURIComponent(sku)}`
          : "";

        if (!qs) {
          setLoadError(
            "No artwork selected. Use /ar?sku=YOUR_SKU or /ar/:artworkSlug"
          );
          return;
        }

        const res = await fetch(`${WIX_API}${qs}`);
        if (!res.ok) throw new Error(`API failed: ${res.status}`);

        const json: any = await res.json();
        const items: CmsItem[] = json?.items || [];

        if (!items.length) {
          setLoadError(
            `No CMS rows returned for ${
              artId ? `artworkSlug=${artId}` : `sku=${sku}`
            }`
          );
          return;
        }

        // If loaded by SKU, resolve slug then refetch all variants by slug
        const resolvedSlug = items[0]?.artworkSlug || artId || "";
        let fullItems = items;

        if (!artId && resolvedSlug) {
          const res2 = await fetch(
            `${WIX_API}?artworkSlug=${encodeURIComponent(resolvedSlug)}`
          );
          if (res2.ok) {
            const json2: any = await res2.json();
            fullItems = json2?.items || items;
          }
        }

        const built = buildArtworkFromCms(fullItems, sku);

        if (!cancelled) {
          setArtwork(built);
          setSelectedSizeId(built.defaultSizeId);
        }

        trackEvent("ar_session_start", {
          artId: built.id,
          title: built.title,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) setLoadError(msg);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [artId, sku]);

  const selectedSize = useMemo(() => {
    if (!artwork) return null;
    return (
      artwork.sizes.find((s) => s.id === selectedSizeId) ??
      artwork.sizes[0] ??
      null
    );
  }, [artwork, selectedSizeId]);

  // NEW: Preload the selected texture before allowing AR
  useEffect(() => {
    setTextureReady(false);
    setTextureError("");

    if (!selectedSize) return;

    const url = selectedSize.textureUrl;
    if (!url) {
      setTextureError("Missing texture URL for this variant.");
      return;
    }

    const img = new Image();
    img.onload = () => setTextureReady(true);
    img.onerror = () =>
      setTextureError(
        "Could not load the artwork image for AR. (Bad URL or blocked resource.)"
      );
    img.src = url;
  }, [selectedSizeId, selectedSize?.textureUrl]);

  const handleStartPreview = () => {
    if (showPreflight) return;

    // Don’t enter AR if texture isn’t ready — this is what causes Enter AR → blank
    if (!textureReady) {
      trackEvent("ar_preview_blocked_texture_not_ready" as any, {
        artId: artwork?.id,
        sizeId: selectedSize?.id,
      });
      return;
    }

    setArMode(true);

    if (artwork && selectedSize) {
      trackEvent("ar_preview_started" as any, {
        artId: artwork.id,
        sizeId: selectedSize.id,
        sizeLabel: selectedSize.label,
        webxrSupported,
      });
    }
  };

  // Loading / error
  if (loadError) {
    return (
      <div style={{ padding: 20 }}>
        <h1>IkonHaus AR Viewer</h1>
        <p style={{ whiteSpace: "pre-wrap" }}>{loadError}</p>
        <p>Try:</p>
        <ul>
          <li>
            <code>/ar?sku=SP-1620-BLK</code>
          </li>
          <li>
            <code>/ar/spherical-study-unknown</code>
          </li>
        </ul>
      </div>
    );
  }

  if (!artwork || !selectedSize) {
    return (
      <div style={{ padding: 20 }}>
        <h1>IkonHaus AR Viewer</h1>
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111",
        color: "#fff",
        padding: "14px 16px 16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* PREFLIGHT */}
      {showPreflight && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.82)",
            zIndex: 3000,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "92%",
              maxWidth: "420px",
              margin: "40px auto 24px",
              backgroundColor: "#000",
              borderRadius: "16px",
              padding: "20px",
              border: "1px solid #444",
              textAlign: "center",
              boxShadow: "0 12px 30px rgba(0,0,0,0.6)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              maxHeight: "calc(100vh - 64px)",
            }}
          >
            <h2 style={{ marginBottom: "10px", fontSize: "1.4rem" }}>
              Before You Preview
            </h2>

            <p
              style={{
                opacity: 0.85,
                fontSize: "0.95rem",
                lineHeight: 1.4,
                marginBottom: "14px",
              }}
            >
              For accurate AR sizing, stand about <strong>2 meters</strong> from
              your wall and hold your phone at a comfortable viewing distance.
            </p>

            <img
              src="https://static.wixstatic.com/media/f656fb_d6a46a4b58434bc19003f5b3b6b18147~mv2.png"
              alt="How to hold your phone before using AR"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "10px",
                marginBottom: "16px",
              }}
            />

            <button
              onClick={() => setShowPreflight(false)}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                backgroundColor: "#fff",
                color: "#000",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: "0.95rem",
                border: "none",
              }}
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Top */}
      <h1 style={{ fontSize: "1.8rem", marginBottom: 6, textAlign: "center" }}>
        {artwork.title}
      </h1>

      <p
        style={{
          marginBottom: 10,
          opacity: 0.85,
          textAlign: "center",
          fontSize: "0.9rem",
          lineHeight: 1.3,
          maxWidth: 520,
        }}
      >
        Choose your variant and preview this piece at true scale.
      </p>

      {/* Variant selector (scrollable + tidy) */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          border: "1px solid #2a2a2a",
          borderRadius: 16,
          padding: 10,
          background: "rgba(0,0,0,0.25)",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            maxHeight: 170, // keeps it from taking over mobile screen
            overflowY: "auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {artwork.sizes.map((size) => (
            <button
              key={size.id}
              onClick={() => {
                setSelectedSizeId(size.id);
                setArMode(false);
                trackEvent("ar_variant_change" as any, {
                  artId: artwork.id,
                  sku: size.id,
                  label: size.label,
                });
              }}
              style={{
                padding: "10px 10px",
                borderRadius: 14,
                border:
                  size.id === selectedSizeId
                    ? "2px solid #fff"
                    : "1px solid #444",
                backgroundColor:
                  size.id === selectedSizeId ? "#fff" : "transparent",
                color: size.id === selectedSizeId ? "#000" : "#fff",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 700,
                textAlign: "center",
                lineHeight: 1.15,
                whiteSpace: "normal", // IMPORTANT: allow wrap
              }}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>

      {/* Start button + texture status */}
      {!arMode && (
        <div style={{ width: "100%", maxWidth: 520, textAlign: "center" }}>
          <button
            onClick={handleStartPreview}
            disabled={showPreflight || !textureReady}
            style={{
              opacity: showPreflight || !textureReady ? 0.45 : 1,
              padding: "10px 18px",
              borderRadius: 12,
              backgroundColor: "#fff",
              color: "#000",
              fontWeight: 800,
              marginBottom: 8,
              cursor:
                showPreflight || !textureReady ? "not-allowed" : "pointer",
              fontSize: "0.95rem",
              border: "none",
              width: "100%",
            }}
          >
            {webxrSupported ? "Start AR Preview" : "Start 3D Preview"}
          </button>

          {!textureReady && !textureError && (
            <div style={{ opacity: 0.75, fontSize: "0.85rem" }}>
              Loading artwork image…
            </div>
          )}

          {textureError && (
            <div style={{ opacity: 0.9, fontSize: "0.85rem" }}>
              {textureError}
              <div style={{ opacity: 0.7, marginTop: 4 }}>
                (Try a different variant or verify the AR image is published in
                Wix Media.)
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      {arMode && (
        <div
          style={{
            width: "100%",
            maxWidth: 520,
            height: "44vh",
            marginTop: 10,
            marginBottom: 12,
            borderRadius: 16,
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
            artId={artwork.id}
            sizeId={selectedSize.id}
            sizeLabel={selectedSize.label}
          />
        </div>
      )}

      {/* CTAs */}
      <div
        style={{
          display: "flex",
          gap: 10,
          width: "100%",
          maxWidth: 520,
          marginTop: 6,
        }}
      >
        <button
          onClick={() => (window.location.href = selectedSize.pdpUrl)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#fff",
            color: "#000",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "0.9rem",
          }}
        >
          View Details
        </button>

        <button
          onClick={() => (window.location.href = selectedSize.cartUrl)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "999px",
            border: "1px solid #fff",
            backgroundColor: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: "0.9rem",
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function buildArtworkFromCms(items: CmsItem[], defaultSku: string): Artwork {
  const sorted = [...items].sort(
    (a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0)
  );

  const first = sorted[0];
  const slug = first.artworkSlug || "unknown-artwork";
  const title = first.title || slug;

  const sizes: ArtworkSize[] = sorted.map((x) => {
    const { wM, hM } = inchesToMetersFromSizeCode(x.sizeCode, x.orientation);
    const textureUrl = normalizeWixMediaUrl(x.arImageWebp);

    return {
      id: x.sku,
      label: `${x.frameColor} | ${x.sizeCode}`,
      widthMeters: wM,
      heightMeters: hM,
      textureUrl,
      pdpUrl: x.pdpUrl || "https://www.ikonhausartworks.com",
      cartUrl: x.addToCartUrl || "https://www.ikonhausartworks.com/cart-page",
    };
  });

  const defaultSizeId =
    defaultSku && sizes.some((s) => s.id === defaultSku)
      ? defaultSku
      : sizes[0]?.id || "";

  return { id: slug, title, defaultSizeId, sizes };
}

function inchesToMetersFromSizeCode(sizeCode: string, orientation: string) {
  const nums = (sizeCode || "").match(/(\d+(\.\d+)?)/g)?.map(Number) || [];
  const a = nums[0] || 0;
  const b = nums[1] || 0;

  let wIn = a;
  let hIn = b;

  const o = (orientation || "").toUpperCase();
  if (o === "PORTRAIT" && wIn > hIn) [wIn, hIn] = [hIn, wIn];
  if (o === "LANDSCAPE" && hIn > wIn) [wIn, hIn] = [hIn, wIn];

  return { wM: wIn * 0.0254, hM: hIn * 0.0254 };
}

/**
 * Wix media fields can come in a few formats:
 * - "https://static.wixstatic.com/media/...."
 * - "wix:image://v1/<mediaId>/<filename>#..."
 *
 * We MUST convert wix:image://... into a real URL for the AR texture loader.
 */
function normalizeWixMediaUrl(field: WixMediaField): string {
  const raw =
    typeof field === "string"
      ? field
      : field?.url || field?.src || field?.fileUrl || "";

  if (!raw) return "";
  if (raw.startsWith("http")) return raw;

  // wix:image://v1/<MEDIA_ID>/...
  if (raw.startsWith("wix:image://v1/")) {
    const after = raw.replace("wix:image://v1/", "");
    const mediaId = after.split("/")[0]; // keep ~mv2 if present
    if (mediaId) return `https://static.wixstatic.com/media/${mediaId}`;
  }

  // wix:document://v1/<MEDIA_ID>/...
  if (raw.startsWith("wix:document://v1/")) {
    const after = raw.replace("wix:document://v1/", "");
    const mediaId = after.split("/")[0];
    if (mediaId) return `https://static.wixstatic.com/ugd/${mediaId}`;
  }

  // fallback (won’t work for textures, but prevents crash)
  return "";
}
