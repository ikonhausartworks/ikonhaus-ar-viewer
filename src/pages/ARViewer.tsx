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

  // Returned by your Wix function
  productSlug?: string;
  productPageUrl?: string;

  sortIndex?: number;
};

type ArtworkSize = {
  id: string; // SKU
  label: string;
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
};

type Artwork = {
  id: string; // artworkSlug
  title: string;
  defaultSizeId: string; // default SKU
  pdpUrl: string; // product-level PDP url
  sizes: ArtworkSize[];
};

const SITE_BASE = "https://www.ikonhausartworks.com";
const WIX_API = `${SITE_BASE}/_functions/arGallery`;

// LOCKED: Add-to-cart MUST go through the Wix /a2c page (working plumbing)
const A2C_BASE = `${SITE_BASE}/a2c`;

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

  // preload status for the selected texture
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

  // Preload selected texture
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

  const addToCartHref = `${A2C_BASE}?sku=${encodeURIComponent(selectedSize.id)}`;

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: "#111",
        color: "#fff",
        padding: "12px 14px 14px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowX: "hidden",
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

      {/* CONTENT WRAPPER */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h1
          style={{
            fontSize: "1.55rem",
            marginBottom: 6,
            textAlign: "center",
            lineHeight: 1.15,
          }}
        >
          {artwork.title}
        </h1>

        <p
          style={{
            marginBottom: 10,
            opacity: 0.85,
            textAlign: "center",
            fontSize: "0.9rem",
            lineHeight: 1.3,
          }}
        >
          Choose your variant and preview this piece at true scale.
        </p>

        {/* Variant selector */}
        <div
          style={{
            border: "1px solid #2a2a2a",
            borderRadius: 16,
            padding: 10,
            background: "rgba(0,0,0,0.25)",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              maxHeight: "22dvh",
              minHeight: 92,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
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
                  fontSize: "0.82rem",
                  fontWeight: 750,
                  textAlign: "center",
                  lineHeight: 1.15,
                  whiteSpace: "normal",
                }}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start button + texture status */}
        {!arMode && (
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <button
              onClick={handleStartPreview}
              disabled={showPreflight || !textureReady}
              style={{
                opacity: showPreflight || !textureReady ? 0.45 : 1,
                padding: "10px 18px",
                borderRadius: 12,
                backgroundColor: "#fff",
                color: "#000",
                fontWeight: 850,
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
              <div style={{ opacity: 0.75, fontSize: "0.85rem", marginTop: 8 }}>
                Loading artwork image…
              </div>
            )}

            {textureError && (
              <div style={{ opacity: 0.9, fontSize: "0.85rem", marginTop: 8 }}>
                {textureError}
              </div>
            )}
          </div>
        )}

        {/* Canvas */}
        {arMode && (
          <div
            style={{
              height: "38dvh",
              minHeight: 240,
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid #333",
              backgroundColor: "#000",
              marginBottom: 10,
            }}
          >
            <ARCanvas
              key={`arcanvas-${selectedSize.id}-${webxrSupported ? "xr" : "3d"}`}
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
        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button
            onClick={() => (window.location.href = artwork.pdpUrl)}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "999px",
              border: "none",
              backgroundColor: "#fff",
              color: "#000",
              cursor: "pointer",
              fontWeight: 850,
              fontSize: "0.9rem",
            }}
          >
            View Details
          </button>

          <button
            onClick={() => (window.location.href = addToCartHref)}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: "999px",
              border: "1px solid #fff",
              backgroundColor: "transparent",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 850,
              fontSize: "0.9rem",
            }}
          >
            Add to Cart
          </button>
        </div>

        <div style={{ height: 10 }} />
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

  // PDP must be product-level; prefer productPageUrl from Wix function
  const pdpUrl =
    first.productPageUrl ||
    (first.productSlug ? `${SITE_BASE}/product-page/${first.productSlug}` : "") ||
    SITE_BASE;

  const sizes: ArtworkSize[] = sorted.map((x) => {
    const { wM, hM } = inchesToMetersFromSizeCode(x.sizeCode, x.orientation);
    const textureUrl = normalizeWixMediaUrl(x.arImageWebp);

    return {
      id: x.sku,
      label: `${x.frameColor} | ${x.sizeCode}`,
      widthMeters: wM,
      heightMeters: hM,
      textureUrl,
    };
  });

  const defaultSizeId =
    defaultSku && sizes.some((s) => s.id === defaultSku)
      ? defaultSku
      : sizes[0]?.id || "";

  return { id: slug, title, defaultSizeId, pdpUrl, sizes };
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

  if (raw.startsWith("wix:image://v1/")) {
    const after = raw.replace("wix:image://v1/", "");
    const mediaId = after.split("/")[0];
    if (mediaId) return `https://static.wixstatic.com/media/${mediaId}`;
  }

  if (raw.startsWith("wix:document://v1/")) {
    const after = raw.replace("wix:document://v1/", "");
    const mediaId = after.split("/")[0];
    if (mediaId) return `https://static.wixstatic.com/ugd/${mediaId}`;
  }

  return "";
}
