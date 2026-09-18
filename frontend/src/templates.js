// Templates — deck-level layout + rules.
import { getFallbackArtwork } from './artRegistry.js';
export const CARD_W = 400, CARD_H = 560;

export const SLOT = {
  FRONT_BG: "frontBg",
  NAME:     "name",
  COST:     "cost",
  ARTWORK:  "artwork",
  TYPE:     "typeLine",
  ABILITY:  "ability",
  FLAVOR:   "flavor",
  ATTACK:   "attack",
  DEFENSE:  "defense",
  BACK_BG:    "backBg",
  BACK_LOGO:  "backLogo",
  BACK_TITLE: "backTitle",
};

function makeSlot(id, type, props) {
  return { id, type, ...props };
}

export function defaultTemplate(themeOverrides = {}) {
  const t = {
    id: "tcg_v1",
    frontBg: themeOverrides.frontBg || "",
    backBg:  themeOverrides.backBg  || "",
    front: {
      slots: [
        makeSlot(SLOT.FRONT_BG, "image", { x: 0, y: 0, w: CARD_W, h: CARD_H, z: 0, fit: "cover" }),
        makeSlot(SLOT.ARTWORK, "image", { x: 12, y: 52, w: CARD_W - 24, h: 220, z: 1, fit: "cover" }),
        makeSlot(SLOT.NAME, "text", {
          x: 12, y: 12, w: CARD_W - 60, h: 32, z: 10,
          fontFamily: themeOverrides.titleFont || "Cinzel",
          fontSize: 19, fontWeight: "bold",
          fontColor: themeOverrides.titleColor || "#ffffff",
          align: "left", wrap: false,
        }),
        makeSlot(SLOT.COST, "stat", {
          x: CARD_W - 63, y: 8, w: 46, h: 46, z: 10,
          statShape: "circle",
          statBg: themeOverrides.costBg || "#1a7a90",
          statColor: "#ffffff", statSize: 22, statLabel: "",
        }),
        makeSlot(SLOT.TYPE, "text", {
          x: 12, y: 280, w: CARD_W - 24, h: 20, z: 10,
          fontFamily: "JetBrains Mono", fontSize: 10,
          fontColor: themeOverrides.typeColor || "#7aaabb",
          align: "left", wrap: false,
        }),
        makeSlot(SLOT.ABILITY, "text", {
          x: 12, y: 305, w: CARD_W - 24, h: 96, z: 10,
          fontFamily: "Inter", fontSize: 12,
          fontColor: themeOverrides.abilityColor || "#ddeeff",
          align: "left", wrap: true,
        }),
        makeSlot(SLOT.FLAVOR, "text", {
          x: 12, y: 408, w: CARD_W - 24, h: 60, z: 10,
          fontFamily: "Inter", fontSize: 11,
          fontColor: themeOverrides.flavorColor || "#7a8a9a",
          fontItalic: true, align: "left", wrap: true,
        }),
        makeSlot(SLOT.ATTACK, "stat", {
          x: 14, y: CARD_H - 56, w: 52, h: 46, z: 11,
          statShape: "circle",
          statBg: themeOverrides.attackBg || "#8a2020",
          statColor: "#ffffff", statSize: 18, statLabel: "ATK",
        }),
        makeSlot(SLOT.DEFENSE, "stat", {
          x: CARD_W - 66, y: CARD_H - 56, w: 52, h: 46, z: 11,
          statShape: "circle",
          statBg: themeOverrides.defenseBg || "#1a4878",
          statColor: "#ffffff", statSize: 18, statLabel: "DEF",
        }),
      ],
    },
    back: {
      slots: [
        makeSlot(SLOT.BACK_BG, "image", { x: 0, y: 0, w: CARD_W, h: CARD_H, z: 0, fit: "cover" }),
        makeSlot(SLOT.BACK_LOGO, "image", {
          x: CARD_W/2 - 75, y: CARD_H/2 - 100, w: 150, h: 150, z: 2, fit: "contain",
        }),
        makeSlot(SLOT.BACK_TITLE, "text", {
          x: 40, y: CARD_H/2 + 70, w: CARD_W - 80, h: 48, z: 3,
          fontFamily: themeOverrides.titleFont || "Cinzel",
          fontSize: 32, fontWeight: "700",
          fontColor: themeOverrides.backTitleColor || "#67d9e6",
          align: "center", wrap: false,
        }),
      ],
    },
  };
  return t;
}

export function resolveSlot(slot, card = {}) {
  const safeCard = card || {};
  const ov = (safeCard.overrides && safeCard.overrides[slot.id]) || {};
  const merged = { ...slot, ...ov, label: slot.label || slot.id };
  if (slot.type === "text") {
    const v = safeCard.content?.[slot.id];
    if (v != null) merged.value = typeof v === "object" ? JSON.stringify(v) : String(v);
  }
  if (slot.type === "image") {
    const v = safeCard.content?.[slot.id];
    if (v != null) merged.src = v;
    if ((merged.src == null || merged.src === "" || (typeof merged.src === "string" && merged.src.includes("wikipedia.org"))) && slot.id === "artwork") {
      try {
        merged.src = getFallbackArtwork(safeCard);
      } catch (err) {
        merged.src = "";
      }
    }
    if ((merged.src == null || merged.src === "") && slot._templateFallbackSrc) {
      merged.src = slot._templateFallbackSrc;
    }
    delete merged._templateFallbackSrc;
  }
  if (slot.type === "stat") {
    if (safeCard.gameplay && safeCard.gameplay[slot.id] != null) {
      merged.statValue = safeCard.gameplay[slot.id];
    } else if (safeCard.content?.[slot.id] != null) {
      merged.statValue = safeCard.content[slot.id];
    } else if (slot.statValue == null) {
      merged.statValue = 0;
    }
  }
  return merged;
}

export function resolveCardFace(template, card = {}, face = "front") {
  if (!template || !template[face]) return [];
  const safeCard = card || {};
  const slots = template[face].slots || [];
  const resolved = slots.map(s => {
    let slotCtx = s;
    if (face === "back" && s.id === "backBg" && template.backBg) {
      slotCtx = { ...s, _templateFallbackSrc: template.backBg };
    } else if (face === "front" && s.id === "frontBg" && template.frontBg) {
      slotCtx = { ...s, _templateFallbackSrc: template.frontBg };
    }
    const out = resolveSlot(slotCtx, safeCard);
    out._source = "slot";
    return out;
  });
  const extrasForThisFace = ((safeCard.extraLayers) || []).filter(l =>
    face === "front" ? (l._face === undefined || l._face === "front")
                     : l._face === "back");
  return [...resolved, ...extrasForThisFace.map(l => ({ ...l, _source: "extra" }))];
}

export function materialiseLayers(card, template) {
  if (!card) return card;
  if (!template) return card;
  return {
    ...card,
    frontLayers: resolveCardFace(template, card, "front"),
    backLayers:  resolveCardFace(template, card, "back"),
  };
}

export function migrateLegacyCard(legacyCard, template) {
  if (!legacyCard) return legacyCard;
  if (legacyCard.content || legacyCard.overrides || legacyCard.extraLayers) return legacyCard;

  const content = {};
  const overrides = {};
  const extras = [];
  const slotMap = {};
  ["front","back"].forEach(face => {
    (template[face].slots || []).forEach(s => { slotMap[s.id] = { slot: s, face }; });
  });

  const ingestFace = (layers, face) => {
    (layers || []).forEach(l => {
      const m = slotMap[l.id];
      if (!m || m.face !== face) { extras.push({ ...l, _face: face }); return; }
      const slot = m.slot;
      if (l.type === "text" && l.value != null) content[l.id] = l.value;
      if (l.type === "image" && l.src != null) content[l.id] = l.src;
      if (l.type === "stat") {
        if (l.statValue != null && (!legacyCard.gameplay || legacyCard.gameplay[l.id] == null)) {
          content[l.id] = l.statValue;
        }
      }
      const diff = {};
      const cmpKeys = ["x","y","w","h","z","fontFamily","fontSize","fontWeight","fontColor",
                       "fontItalic","align","wrap","fit","statShape","statBg","statColor",
                       "statSize","statLabel"];
      cmpKeys.forEach(k => { if (l[k] !== undefined && l[k] !== slot[k]) diff[k] = l[k]; });
      if (Object.keys(diff).length) overrides[l.id] = diff;
    });
  };

  ingestFace(legacyCard.frontLayers, "front");
  ingestFace(legacyCard.backLayers,  "back");

  const flatToContent = {
    name: "name", ability: "ability", flavor: "flavor",
    type: "typeLine", artwork: "artwork",
    frontBg: "frontBg", backBg: "backBg", backLogo: "backLogo",
  };
  Object.entries(flatToContent).forEach(([flat, slotId]) => {
    if (content[slotId] == null && legacyCard[flat] != null) content[slotId] = legacyCard[flat];
  });

  return {
    id: legacyCard.id,
    rarity: legacyCard.rarity || "common",
    tags: legacyCard.keywords || legacyCard.tags || [],
    gameplay: {
      cost:    legacyCard.cost    ?? 0,
      attack:  legacyCard.attack  ?? 0,
      defense: legacyCard.defense ?? 0,
      health:  legacyCard.health  ?? legacyCard.defense ?? 0,
      element: legacyCard.element || "neutral",
      faction: legacyCard.faction || "",
    },
    metadata: {
      artist: legacyCard.artist || "AI generated",
      set:    legacyCard.set || "Default Set",
      serial: legacyCard.serial || (legacyCard.id || "").toUpperCase(),
      collectorNumber: legacyCard.collectorNumber || 0,
    },
    content, overrides, extraLayers: extras,
    name: legacyCard.name, type: legacyCard.type || content.typeLine || "Creature",
    cost: legacyCard.cost, attack: legacyCard.attack,
    defense: legacyCard.defense, health: legacyCard.health,
    element: legacyCard.element, faction: legacyCard.faction,
    ability: legacyCard.ability, flavor: legacyCard.flavor,
    keywords: legacyCard.keywords || [],
    usage: legacyCard.usage ?? 0.5,
    artist: legacyCard.artist, set: legacyCard.set,
    serial: legacyCard.serial, collectorNumber: legacyCard.collectorNumber,
  };
}

export function defaultRarities() {
  return [
    { id: "common",    label: "Common",    color: "#b8c8d2" },
    { id: "rare",      label: "Rare",      color: "#67d9e6" },
    { id: "epic",      label: "Epic",      color: "#c78ad9" },
    { id: "legendary", label: "Legendary", color: "#f0c168" },
  ];
}

export function applyDeckCssVars(deck) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const sty = root.style;
  for (let i = sty.length - 1; i >= 0; i--) {
    const k = sty.item(i);
    if (k && k.startsWith("--rarity-")) sty.removeProperty(k);
  }
  const rarities = deck?.rules?.rarities || defaultRarities();
  rarities.forEach(r => {
    if (r && r.id && r.color) root.style.setProperty(`--rarity-${r.id}`, r.color);
  });
}

const Templates = {
  CARD_W, CARD_H, SLOT,
  defaultTemplate, defaultRarities,
  resolveSlot, resolveCardFace,
  materialiseLayers, migrateLegacyCard,
  applyDeckCssVars,
};

export default Templates;
