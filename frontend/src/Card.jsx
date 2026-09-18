import { useState, useEffect } from "react";
import { getAiArtworkUrl, sanitizeArtworkUrl } from "./artRegistry.js";
import { subscribePollinationsImage, getPollinationsCached } from "./pollinationsQueue.js";

// Card grid tile renderer — renders directly from materialised layers,
// using the same layout logic as the editor canvas. This guarantees
// the grid tile and the editor preview are pixel-for-pixel consistent.

// Logical card size (must match templates.js CARD_W/CARD_H).
const _CARD_W_GRID = 400;
const _CARD_H_GRID = 560;
// Default tile width in the grid — tile height is computed to keep aspect.
const _DEFAULT_TILE_W = 220;

function Card({ card, compact, entering, onClick, style, showBack }) {
  if (!card) return null;

  const tileW = compact ? 160 : _DEFAULT_TILE_W;
  const tileH = tileW * (_CARD_H_GRID / _CARD_W_GRID);
  const scale = tileW / _CARD_W_GRID;

  const face = showBack ? "back" : "front";
  const layers = card[face === "front" ? "frontLayers" : "backLayers"] || [];

  // Determine rarity color from CSS var (set by App.applyDeckCssVars)
  const rarityVar = `var(--rarity-${card.rarity || "common"})`;

  return (
    <div
      className={`tcg-card-tile${entering ? " entering" : ""}`}
      onClick={onClick}
      style={{
        position: "relative",
        width: tileW,
        height: tileH,
        background: "linear-gradient(160deg, #16384b, #0a1f2c 60%, #061520)",
        border: `1.5px solid ${rarityVar}`,
        borderRadius: 9,
        overflow: "hidden",
        boxShadow: `0 4px 14px rgba(0,0,0,0.45), 0 0 12px color-mix(in oklch, ${rarityVar}, transparent 70%), inset 0 0 0 1px rgba(255,255,255,0.07)`,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.18s, box-shadow 0.18s",
        ...(style || {}),
      }}
    >
      {[...layers].filter(Boolean).sort((a, b) => (a.z || 0) - (b.z || 0)).map((l, idx) => (
        <TileLayer key={l.id || idx} layer={l} scale={scale} card={card} />
      ))}
      <CardOrnamentFrame color={rarityVar} />
    </div>
  );
}

// Purely decorative overlay: a thin engraved inset line drawn in the card's
// rarity color. Absolutely positioned on top of the existing (fixed-size)
// tile, so it never affects card layout, grid flow, or sizing — same
// treatment in Generate and Deck.
function CardOrnamentFrame({ color }) {
  return (
    <svg
      viewBox="0 0 400 560"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        color,
      }}
    >
      <rect x="6" y="6" width="388" height="548" rx="7" ry="7" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.32" strokeDasharray="1.5 3.5" />
    </svg>
  );
}

// Some generated cards ended up with both ATK and DEF at 0, which reads as
// broken/unfinished rather than an intentional 0-stat card. For that case
// only, substitute a stable (not re-randomized every render), non-zero
// placeholder number for display — derived from the card id so the same
// card always shows the same numbers in both Generate and Deck.
function fallbackStatValue(seed, key) {
  const str = `${seed || ""}:${key}`;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (Math.abs(h) % 6) + 1; // 1..6
}

// Tile layer renderer — identical structure to CardEditor's CanvasLayer
function TileLayer({ layer: l, scale, card }) {
  if (!l) return null;

  const isArtwork = l.id === "artwork";
  const cardName = card?.name || card?.content?.name || "";
  const cardType = card?.content?.typeLine || card?.type || "Creature";
  const rawSrc = sanitizeArtworkUrl(
    l.src || (isArtwork ? (card?.content?.artwork || card?.artwork || getAiArtworkUrl(cardName, card?.gameplay?.element || card?.element, cardType, card?.content?.flavor || card?.flavor)) : ""),
    cardName,
    cardType
  );

  const [resolvedSrc, setResolvedSrc] = useState(() => {
    if (!rawSrc) return "";
    if (rawSrc.includes("pollinations.ai")) {
      return getPollinationsCached(rawSrc) || "";
    }
    return rawSrc;
  });
  const [isLoading, setIsLoading] = useState(() => {
    return Boolean(rawSrc && rawSrc.includes("pollinations.ai") && !getPollinationsCached(rawSrc));
  });

  useEffect(() => {
    if (!rawSrc) {
      setResolvedSrc("");
      setIsLoading(false);
      return;
    }
    if (rawSrc.includes("pollinations.ai")) {
      const cached = getPollinationsCached(rawSrc);
      if (cached) {
        setResolvedSrc(cached);
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const unsubscribe = subscribePollinationsImage(
        rawSrc,
        (loadedUrl) => {
          setResolvedSrc(loadedUrl);
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        }
      );
      return unsubscribe;
    } else {
      setResolvedSrc(rawSrc);
      setIsLoading(false);
    }
  }, [rawSrc]);

  const transparentBg = l.statBg === "transparent" || l.statBg === "" || l.statBg === "none";
  const base = {
    position: "absolute",
    left: (l.x || 0) * scale,
    top: (l.y || 0) * scale,
    width: (l.w || 50) * scale,
    height: (l.h || 30) * scale,
    overflow: "hidden",
    boxSizing: "border-box",
    pointerEvents: "none",
    ...(isArtwork ? {
      borderRadius: 6 * scale,
      border: "1px solid rgba(255,255,255,0.18)",
      boxShadow: "inset 0 0 12px rgba(0,0,0,0.6)",
      background: "radial-gradient(ellipse at center, #1b3345 0%, #0a1722 100%)",
    } : {}),
  };

  if (l.type === "image") {
    if (!isArtwork && !l.src) return null;

    return (
      <div style={base}>
        {isLoading && (
          <div style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
            background: "linear-gradient(110deg, #0d2130 8%, #17384e 18%, #0d2130 33%)",
            backgroundSize: "200% 100%",
            animation: "pollinationsShimmer 1.8s linear infinite",
            color: "var(--cyan-bright, #67d9e6)", fontFamily: "var(--font-mono, monospace)",
            fontSize: 9 * scale, textAlign: "center", padding: 4
          }}>
            <span style={{opacity: 0.9}}>Pollinations AI…</span>
          </div>
        )}
        {resolvedSrc && (
          <img
            src={resolvedSrc}
            alt=""
            loading="lazy"
            style={{
              width: isArtwork ? "108%" : "100%",
              height: isArtwork ? "108%" : "100%",
              transform: isArtwork ? "scale(1.08)" : "none",
              transformOrigin: "center 42%",
              objectFit: l.fit || "cover",
              display: isLoading ? "none" : "block",
              borderRadius: isArtwork ? 5 * scale : 0,
            }}
          />
        )}
      </div>
    );
  }

  if (l.type === "text") {
    const txtColor = (l.fontColor === "transparent" || l.fontColor === "none" || l.fontColor === "") ? "transparent" : (l.fontColor || "#fff");
    const val = typeof l.value === "object" ? (l.value ? JSON.stringify(l.value) : "") : (l.value ?? "");
    return (
      <div style={{
        ...base,
        fontFamily: l.fontFamily || "Inter",
        fontSize: (l.fontSize || 13) * scale,
        fontWeight: l.fontWeight || "400",
        fontStyle: l.fontItalic ? "italic" : "normal",
        letterSpacing: l.letterSpacing || "normal",
        textTransform: l.textTransform || "none",
        color: txtColor,
        textAlign: l.align || "left",
        whiteSpace: l.wrap ? "normal" : "nowrap",
        lineHeight: 1.35,
      }}>
        {val}
      </div>
    );
  }

  if (l.type === "stat") {
    const sz = Math.min((l.w || 52) * scale, (l.h || 46) * scale);
    const bg = transparentBg ? "transparent" : (l.statBg || "#1a7a90");
    let statVal = typeof l.statValue === "object" ? "" : (l.statValue ?? 0);
    if (l.id === "attack" || l.id === "defense") {
      const atk = Number(card?.gameplay?.attack ?? card?.content?.attack ?? 0);
      const def = Number(card?.gameplay?.defense ?? card?.content?.defense ?? 0);
      if (atk === 0 && def === 0) {
        statVal = fallbackStatValue(card?.id, l.id);
      }
    }
    return (
      <div style={{
        ...base,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: sz, height: sz,
          borderRadius: l.statShape === "circle" ? "50%" : l.statShape === "rounded" ? "4px" : "0",
          background: bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          boxShadow: bg === "transparent" ? "none" : `0 0 ${Math.max(3, 6 * scale)}px rgba(0,0,0,0.5)`,
        }}>
          <span style={{
            color: (l.statColor === "transparent" || l.statColor === "none") ? "transparent" : (l.statColor || "#fff"),
            fontFamily: l.statFontFamily || "var(--font-display)",
            fontWeight: l.statFontWeight || 700,
            letterSpacing: l.statLetterSpacing || "normal",
            fontSize: (l.statSize || 20) * scale, lineHeight: 1,
          }}>{statVal}</span>
          {l.statLabel && (
            <span style={{
              color: (l.statColor === "transparent" || l.statColor === "none") ? "transparent" : (l.statColor || "#fff"),
              fontFamily: "var(--font-mono)",
              fontSize: Math.max(6, 7 * scale),
              opacity: 0.85, letterSpacing: "0.1em",
            }}>{typeof l.statLabel === "object" ? "" : l.statLabel}</span>
          )}
        </div>
      </div>
    );
  }

  return null;
}



export default Card;
export { TileLayer };
