// src/pages/ARViewer.tsx
import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { trackEvent } from "../utils/analytics";
import ARCanvas from "../components/ARCanvas";
import { detectARCapabilities, type ARCapabilities } from "../utils/capabilities";

type CmsItem = {
  title?: string;
  artworkSlug?: string;
  sku: string;
  sizeCode: string;      // e.g. "16 x 20 inches" or "36 x 24 in"
  frameColor: string;    // "Black" / "White"
  orientation: string;   // "PORTRAIT" / "LANDSCAPE"
  arImageWebp: any;      // Wix media field (object)
  pdpUrl?: string;
  addToCartUrl?: string;
};

type ArtworkSize = {
  id: string;            // we’ll use SKU as size id
  label: string;         // e.g. "Black | 16 x 20 inches"
  widthMeters: number;
  heightMeters: number;
  textureUrl: string;
  pdpUrl: string;
  cartUrl: string;
};

type Artwork = {
  id: string;            // artworkSlug
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

  // Session start + capabilities
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
          setLoadError("No artwork selected. Use /ar?sku=YOUR_SKU or /ar/:artworkSlug");
          return;
        }

        const res = await fetch(`${WIX_API}${qs}`);
        if (!res.ok) throw new Error(`API failed: ${res.status}`);

        const json = await res.json();
        const items: CmsItem[] = json?.items || [];

        if (!items.length) {
          setLoadError(`No CMS rows returned for ${artId ? `artworkSlug=${artId}` : `sku=${sku}`}`);
          return;
        }

        // If loaded by SKU, all returned items might be just 1 row.
        // We want ALL variants for that artworkSlug, so we do a 2nd fetch by slug.
        const resolvedSlug = items[0]?.artworkSlug || artId || "";
        let fullItems = items;

        if (!artId && resolvedSlug) {
          const res2 = await fetch(`${WIX_API}?artworkSlug=${encodeURIComponent(resolvedSlug)}`);
          if (res2.ok) {
            const json2 = await res2.json();
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
      } catch (e: any) {
        if (!cancelled) setLoadError(e?.message || String(e));
      }
    }

    load();
    return () => { cancelled = true; };
  }, [artId, sku]);

  const selectedSize = useMemo(() => {
    if (!artwork) return null;
    return artwork.sizes.find((s) => s.id === selectedSizeId) ?? artwork.sizes[0] ?? null;
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
        <p>Try:</p>
        <ul>
          <li><code>/ar?sku=SP-1620-BLK</code></li>
          <li><code>/ar/sami-woman-karasjok-marcus-selmer</code></li>
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
        padding: "10px 16px 12px",
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
                maxHeight: "75vh",
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
                fontWeight: 600,
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
      <h1 style={{ fontSize: "1.8rem", marginBottom: "3px", textAlign: "center" }}>
        {artwork.title}
      </h1>

      <p
        style={{
          marginBottom: "6px",
          opacity: 0.8,
          textAlign: "center",
          fontSize: "0.85rem",
          lineHeight: 1.3,
        }}
      >
        Choose your variant and preview this piece at true scale.
      </p>

      {/* Variant selector */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap", justifyContent: "center" }}>
        {artwork.sizes.map((size) => (
          <button
            key={size.id}
            onClick={() => setSelectedSizeId(size.id)}
            style={{
              padding: "7px 12px",
              borderRadius: "999px",
              border: size.id === selectedSizeId ? "2px solid #fff" : "1px solid #555",
              backgroundColor: size.id === selectedSizeId ? "#fff" : "transparent",
              color: size.id === selectedSizeId ? "#000" : "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
            }}
          >
            {size.label}
          </button>
        ))}
      </div>

      {/* Start button */}
      {!arMode && (
        <button
          onClick={handleStartPreview}
          disabled={showPreflight}
          style={{
            opacity: showPreflight ? 0.4 : 1,
            padding: "8px 16px",
            borderRadius: "10px",
            backgroundColor: "#fff",
            color: "#000",
            fontWeight: 600,
            marginBottom: "8px",
            cursor: showPreflight ? "not-allowed" : "pointer",
            fontSize: "0.9rem",
          }}
        >
          {webxrSupported ? "Start AR Preview" : "Start 3D Preview"}
        </button>
      )}

      {/* Canvas */}
      {arMode && (
        <div
          style={{
            width: "92%",
            maxWidth: "440px",
            height: "40vh",
            marginBottom: "12px",
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
            artId={artwork.id}
            sizeId={selectedSize.id}
            sizeLabel={selectedSize.label}
          />
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "2px" }}>
        <button
          onClick={() => (window.location.href = selectedSize.pdpUrl)}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: "none",
            backgroundColor: "#fff",
            color: "#000",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          View Details
        </button>

        <button
          onClick={() => (window.location.href = selectedSize.cartUrl)}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            border: "1px solid #fff",
            backgroundColor: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.85rem",
          }}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

function buildArtworkFromCms(items: CmsItem[], defaultSku: string): Artwork {
  // Sort if you want deterministic order
  const sorted = [...items].sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));

  const first = sorted[0];
  const slug = first.artworkSlug || "unknown-artwork";
  const title = first.title || slug;

  const sizes: ArtworkSize[] = sorted.map((x) => {
    const { wM, hM } = inchesToMetersFromSizeCode(x.sizeCode, x.orientation);
    const textureUrl = normalizeWixMediaUrl(x.arImageWebp);

    return {
      id: x.sku, // SKU is the selector id
      label: `${x.frameColor} | ${x.sizeCode}`,
      widthMeters: wM,
      heightMeters: hM,
      textureUrl,
      pdpUrl: x.pdpUrl || "https://www.ikonhausartworks.com",
      cartUrl: x.addToCartUrl || "https://www.ikonhausartworks.com/cart-page",
    };
  });

  const defaultSizeId = defaultSku && sizes.some((s) => s.id === defaultSku)
    ? defaultSku
    : sizes[0]?.id || "";

  return { id: slug, title, defaultSizeId, sizes };
}

function inchesToMetersFromSizeCode(sizeCode: string, orientation: string) {
  // accepts: "16 x 20 inches", "19.75 x 27.5 inches", "36 x 24 in"
  const nums = (sizeCode || "").match(/(\d+(\.\d+)?)/g)?.map(Number) || [];
  const a = nums[0] || 0;
  const b = nums[1] || 0;

  // treat "a x b" as width x height by default
  let wIn = a;
  let hIn = b;

  // If PORTRAIT and width > height, swap (safety)
  if ((orientation || "").toUpperCase() === "PORTRAIT" && wIn > hIn) {
    [wIn, hIn] = [hIn, wIn];
  }
  // If LANDSCAPE and height > width, swap (safety)
  if ((orientation || "").toUpperCase() === "LANDSCAPE" && hIn > wIn) {
    [wIn, hIn] = [hIn, wIn];
  }

  const wM = wIn * 0.0254;
  const hM = hIn * 0.0254;

  return { wM, hM };
}

function normalizeWixMediaUrl(arImageWebp: any): string {
  // Wix media fields can come as objects like { url: "...", ... }
  const raw = typeof arImageWebp === "string" ? arImageWebp : arImageWebp?.url;

  if (!raw) return "";

  // If Wix gives you a full https url, use it
  if (raw.startsWith("http")) return raw;

  // If it’s a wix:image:// style URL, you can usually still use the direct static form,
  // but the simplest approach is: store real URLs in CMS media if possible.
  return raw;
}
