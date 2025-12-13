// src/pages/ARViewer.tsx
import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../utils/analytics";
import ARCanvas from "../components/ARCanvas";
import { detectARCapabilities, type ARCapabilities } from "../utils/capabilities";

type WixMediaField =
  | string
  | {
      url?: string;
      src?: string;
      fileUrl?: string;
    }
  | null
  | undefined;

type CmsItem = {
  title?: string;
  artworkSlug?: string;
  sku: string;
  sizeCode: string;
  frameColor: string;
  orientation: string;
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

        trackEvent("ar_session_start", { artId: built.id, title: built.title });
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

  const handleStartPreview = () => {
    if (showPreflight) return;
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

  // ------- Layout constants -------
  const STICKY_BAR_H = 84; // approx height of CTA bar + padding

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111",
        color: "#fff",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",

        // leave room so sticky CTA doesn’t cover content
        paddingBottom: `calc(${STICKY_BAR_H}px + env(safe-area-inset-bottom))`,
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

      {/* Title */}
      <h1
        style={{
          fontSize: "clamp(1.35rem, 3.8vw, 1.9rem)",
          margin: "6px 0 4px",
          textAlign: "center",
          lineHeight: 1.15,
          maxWidth: 520,
        }}
      >
        {artwork.title}
      </h1>

      <p
        style={{
          margin: "0 0 10px",
          opacity: 0.78,
          textAlign: "center",
          fontSize: "0.9rem",
          lineHeight: 1.25,
          maxWidth: 520,
        }}
      >
        Choose your variant and preview this piece at true scale.
      </p>

      {/* Variants panel (scrollable so screen doesn’t explode) */}
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          border: "1px solid #2a2a2a",
          borderRadius: 18,
          padding: "10px 10px 12px",
          background: "rgba(0,0,0,0.25)",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 700, opacity: 0.9 }}>Variants</div>
          <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>
            {artwork.sizes.length} options
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,

            // key: cap height + allow scroll inside this panel
            maxHeight: 160,
            overflowY: "auto",
            paddingRight: 2,
          }}
        >
          {artwork.sizes.map((size) => {
            const active = size.id === selectedSizeId;
            return (
              <button
                key={size.id}
                onClick={() => setSelectedSizeId(size.id)}
                style={{
                  padding: "10px 10px",
                  borderRadius: 999,
                  border: active ? "2px solid #fff" : "1px solid #444",
                  backgroundColor: active ? "#fff" : "transparent",
                  color: active ? "#000" : "#fff",
                  cursor: "pointer",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  lineHeight: 1.15,
                  whiteSpace: "normal",
                  textAlign: "center",
                }}
              >
                {size.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview card */}
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 22,
          border: "1px solid #2a2a2a",
          background: "rgba(0,0,0,0.35)",
          overflow: "hidden",
          position: "relative",
          marginBottom: 12,
        }}
      >
        {/* Start/Enter button row */}
        {!arMode && (
          <div style={{ padding: 12 }}>
            <button
              onClick={handleStartPreview}
              disabled={showPreflight}
              style={{
                width: "100%",
                opacity: showPreflight ? 0.4 : 1,
                padding: "12px 16px",
                borderRadius: 14,
                backgroundColor: "#fff",
                color: "#000",
                fontWeight: 800,
                cursor: showPreflight ? "not-allowed" : "pointer",
                fontSize: "1rem",
                border: "none",
              }}
            >
              {webxrSupported ? "Enter AR" : "Start 3D Preview"}
            </button>

            <div style={{ marginTop: 8, fontSize: "0.8rem", opacity: 0.6 }}>
              Selected: {selectedSize.label}
            </div>
          </div>
        )}

        {/* Canvas */}
        {arMode && (
          <div
            style={{
              width: "100%",
              height: "min(52vh, 520px)", // bigger preview, still controlled
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
      </div>

      {/* Sticky CTA bar */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2500,
          padding: "10px 12px",
          paddingBottom: `calc(10px + env(safe-area-inset-bottom))`,
          background:
            "linear-gradient(to top, rgba(17,17,17,0.98), rgba(17,17,17,0.65))",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            maxWidth: 560,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <button
            onClick={() => (window.location.href = selectedSize.pdpUrl)}
            style={{
              padding: "14px 14px",
              borderRadius: 999,
              border: "none",
              backgroundColor: "#fff",
              color: "#000",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: "1rem",
            }}
          >
            View Details
          </button>

          <button
            onClick={() => (window.location.href = selectedSize.cartUrl)}
            style={{
              padding: "14px 14px",
              borderRadius: 999,
              border: "1px solid #fff",
              backgroundColor: "transparent",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 900,
              fontSize: "1rem",
            }}
          >
            Add to Cart
          </button>
        </div>
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

function normalizeWixMediaUrl(field: WixMediaField): string {
  const raw =
    typeof field === "string"
      ? field
      : field?.url || field?.src || field?.fileUrl || "";

  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  return raw;
}
