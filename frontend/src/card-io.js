import JSZip from "jszip";
import Templates from "./templates.js";
import { DECK_PRESETS } from "./data.js";
// Card import/export — v0.8.
//
// Export structure:
//   deck.json        — { id, name, locale, template, rules }
//   cards.json       — { version: "0.8", deckId, count, cards: [...] }
//                      where each card is the flat-content shape:
//                      { id, rarity, tags, gameplay, metadata,
//                        content, overrides, extraLayers }
//   images/<files>   — bundled image blobs (artwork, frontBg, etc.)
//
// Import:
//   - If deck.json present: read new format directly.
//   - Else legacy v0.7 export (only cards.json with front.layers[]):
//     synthesise a template from the first card's layers,
//     migrate each card via Templates.migrateLegacyCard.

const NEW_VERSION = "0.8";

const CardIO = {
  // ── Export ──────────────────────────────────────────────────
  async exportZip(cards, topic, deckExtras = {}) {
    const zip = new JSZip();
    const imgFolder = zip.folder("images");

    // Resolve template + rules: prefer the active preset; otherwise build a default.
    const preset = DECK_PRESETS && DECK_PRESETS[topic];
    const baseDeck = preset?.deck;
    // Deep-clone the template so we can rewrite image refs without mutating state
    const template = JSON.parse(JSON.stringify(deckExtras.template || baseDeck?.template || Templates.defaultTemplate()));
    const rules    = JSON.parse(JSON.stringify(deckExtras.rules    || baseDeck?.rules    || {}));
    const locale   = deckExtras.locale   || baseDeck?.locale   || "en";
    const deckId   = deckExtras.id       || baseDeck?.id       || (topic||"deck").replace(/\s+/g,"_").toLowerCase();
    const deckName = deckExtras.name     || baseDeck?.name     || topic || "Untitled";

    // Bundle template-level image blobs (frontBg, backBg, rarity-frame images).
    // The template may carry _frontBgFile / _backBgFile from the (future) template editor.
    const sourceTpl = deckExtras.template || baseDeck?.template || {};
    if (sourceTpl._frontBgFile) {
      const ext = (sourceTpl._frontBgFile.name || "img.png").split(".").pop().toLowerCase();
      const fn = `template_frontBg.${ext}`;
      imgFolder.file(fn, sourceTpl._frontBgFile);
      template.frontBg = `images/${fn}`;
    }
    if (sourceTpl._backBgFile) {
      const ext = (sourceTpl._backBgFile.name || "img.png").split(".").pop().toLowerCase();
      const fn = `template_backBg.${ext}`;
      imgFolder.file(fn, sourceTpl._backBgFile);
      template.backBg = `images/${fn}`;
    }
    // Per-rarity frame images, if set
    if (Array.isArray(rules.rarities)) {
      rules.rarities.forEach((r, idx) => {
        const srcR = (deckExtras.rules?.rarities || baseDeck?.rules?.rarities || [])[idx];
        if (srcR?._frameFile) {
          const ext = (srcR._frameFile.name || "img.png").split(".").pop().toLowerCase();
          const fn = `template_rarity_${r.id}.${ext}`;
          imgFolder.file(fn, srcR._frameFile);
          r.frame = `images/${fn}`;
        }
        // Strip transient props from the structured form
        delete r._frameFile;
      });
    }
    // Strip transient template blob fields
    delete template._frontBgFile; delete template._backBgFile;

    // Walk cards: bundle any uploaded image files, rewrite refs to images/<name>.
    const exportCards = [];
    for (const c of cards) {
      const card = CardIO._cloneForExport(c);

      // Bundle compact-field uploads (artwork/frontBg/backBg/backLogo as direct File blobs)
      const fileFields = [
        ["_artworkFile",  "artwork"],
        ["_frontBgFile",  "frontBg"],
        ["_backBgFile",   "backBg"],
        ["_backLogoFile", "backLogo"],
      ];
      for (const [fileKey, refKey] of fileFields) {
        if (c[fileKey]) {
          const ext = (c[fileKey].name || "img.png").split(".").pop().toLowerCase();
          const filename = `${c.id}_${refKey}.${ext}`;
          imgFolder.file(filename, c[fileKey]);
          if (card.content[refKey] !== undefined) card.content[refKey] = `images/${filename}`;
        }
      }

      // Bundle per-layer _file on extraLayers
      (card.extraLayers || []).forEach((l, i) => {
        if (l.type === "image" && l._file) {
          const ext = (l._file.name || "img.png").split(".").pop().toLowerCase();
          const filename = `${c.id}_extra${i}.${ext}`;
          imgFolder.file(filename, l._file);
          l.src = `images/${filename}`;
          delete l._file;
        }
      });

      // Bundle per-slot uploads stored on the materialised frontLayers (editor compatibility)
      // We do NOT export materialised layers; we ensure their image srcs (if blobs uploaded)
      // get written into card.content correctly via the editor's syncCompact flow.
      // Editor's image-upload handler already pushes new src into card.content via syncCompact
      // → already in card.content here.

      // Strip transient editor fields and back-compat mirrors before serialising
      delete card.frontLayers; delete card.backLayers;
      delete card._topic; delete card._original;
      ["name","type","cost","attack","defense","health","element","faction",
       "ability","flavor","keywords","usage","artist","set","serial","collectorNumber",
       "artwork","frontBg","backBg","backLogo","backColor"
      ].forEach(k => { delete card[k]; });
      // also strip any _* helper blob refs
      Object.keys(card).filter(k=>k.startsWith("_")).forEach(k=>delete card[k]);

      exportCards.push(card);
    }

    // Write deck.json
    zip.file("deck.json", JSON.stringify({
      version: NEW_VERSION,
      id: deckId,
      name: deckName,
      locale,
      template,
      rules,
    }, null, 2));

    // Write cards.json
    zip.file("cards.json", JSON.stringify({
      version: NEW_VERSION,
      deckId,
      count: exportCards.length,
      cards: exportCards,
    }, null, 2));

    imgFolder.file("README.txt",
      "Card images. Filenames are referenced from cards.json content[*] fields " +
      "and from deck.json template.frontBg/backBg.");

    return await zip.generateAsync({ type: "blob" });
  },

  _cloneForExport(c) {
    // Deep-clone what we need
    const card = {
      id: c.id,
      rarity: c.rarity || "common",
      tags: [...(c.tags || c.keywords || [])],
      gameplay: { ...(c.gameplay || {
        cost: c.cost ?? 0, attack: c.attack ?? 0,
        defense: c.defense ?? 0, health: c.health ?? c.defense ?? 0,
        element: c.element || "neutral", faction: c.faction || "",
      }) },
      metadata: { ...(c.metadata || {
        artist: c.artist || "AI generated",
        set: c.set || "Default Set",
        serial: c.serial || (c.id||"").toUpperCase(),
        collectorNumber: c.collectorNumber || 0,
      }) },
      content: { ...(c.content || {}) },
      overrides: { ...(c.overrides || {}) },
      extraLayers: (c.extraLayers || []).map(l => ({ ...l })),
    };
    // Backfill content from flat fields if a card was edited via the legacy editor path
    if (!card.content.name && c.name) card.content.name = c.name;
    if (!card.content.ability && c.ability) card.content.ability = c.ability;
    if (!card.content.flavor && c.flavor) card.content.flavor = c.flavor;
    if (!card.content.typeLine && c.type) card.content.typeLine = c.type;
    if (!card.content.artwork && c.artwork) card.content.artwork = c.artwork;
    if (!card.content.frontBg && c.frontBg) card.content.frontBg = c.frontBg;
    if (!card.content.backBg && c.backBg) card.content.backBg = c.backBg;
    if (!card.content.backLogo && c.backLogo) card.content.backLogo = c.backLogo;
    return card;
  },

  exportGodotJson(cards, topic, deckExtras = {}) {
    const preset = DECK_PRESETS && DECK_PRESETS[topic];
    const baseDeck = preset?.deck;
    const rules = JSON.parse(JSON.stringify(deckExtras.rules || baseDeck?.rules || {}));
    const deckId = deckExtras.id || baseDeck?.id || (topic || "deck").replace(/\s+/g, "_").toLowerCase();
    const deckName = deckExtras.name || baseDeck?.name || topic || "Untitled";

    const exportCards = cards.map(c => CardIO._cloneForExport(c));

    const payload = {
      version: "1.0",
      id: deckId,
      name: deckName,
      theme: topic || "",
      rules: rules,
      cards: exportCards,
    };

    return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  },

  download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
  },

  // ── Import ──────────────────────────────────────────────────
  async importZip(file) {
    const zip = await JSZip.loadAsync(file);
    const cardsFileEntry = zip.file("cards.json");
    if (!cardsFileEntry) throw new Error("Missing cards.json in archive");
    const cardsTxt = await cardsFileEntry.async("string");
    const cardsData = JSON.parse(cardsTxt);

    // Image bag
    const imageMap = {};
    const imgsFolder = zip.folder("images");
    if (imgsFolder) {
      const promises = [];
      imgsFolder.forEach((relPath, entry) => {
        if (entry.dir || relPath === "README.txt") return;
        promises.push(entry.async("blob").then(blob => {
          const key = `images/${relPath}`;
          imageMap[key] = URL.createObjectURL(blob);
        }));
      });
      await Promise.all(promises);
    }

    // Detect format: deck.json + new flat cards = v0.8;
    // no deck.json or cards have front.layers[] = v0.7 legacy.
    const deckFileEntry = zip.file("deck.json");
    let deck = null;
    if (deckFileEntry) {
      deck = JSON.parse(await deckFileEntry.async("string"));
    }
    const firstCard = (cardsData.cards || [])[0];
    const isLegacyShape = firstCard && (firstCard.front || firstCard.front?.layers || firstCard.frontLayers);

    let template, rules, locale, deckId, deckName;
    if (deck && !isLegacyShape) {
      template = deck.template;
      rules    = deck.rules || {};
      locale   = deck.locale || "en";
      deckId   = deck.id;
      deckName = deck.name;
    } else {
      // Build a template by stripping content from the first legacy card
      template = CardIO._inferTemplateFromLegacy(firstCard);
      rules    = {};
      locale   = cardsData.locale || "en";
      deckId   = cardsData.deckId || (cardsData.topic || "imported").replace(/\s+/g,"_").toLowerCase();
      deckName = cardsData.name || cardsData.topic || "Imported";
    }

    // Resolve image references in template (any `images/foo` → blob url)
    const resolveImgRef = (s) => (typeof s === "string" && s.startsWith("images/") && imageMap[s]) ? imageMap[s] : s;
    if (template.frontBg) template.frontBg = resolveImgRef(template.frontBg);
    if (template.backBg)  template.backBg  = resolveImgRef(template.backBg);
    if (Array.isArray(rules.rarities)) {
      rules.rarities.forEach(r => {
        if (r && r.frame) r.frame = resolveImgRef(r.frame);
      });
    }

    // Convert each card to in-memory shape
    const cards = (cardsData.cards || []).map(rec => {
      let card;
      if (isLegacyShape) {
        const legacy = CardIO._legacyToInMemory(rec, imageMap);
        card = Templates.migrateLegacyCard(legacy, template);
      } else {
        // Already in new shape — just resolve image refs in content
        card = { ...rec };
        card.content = { ...rec.content };
        ["artwork","frontBg","backBg","backLogo"].forEach(k => {
          if (card.content[k]) card.content[k] = resolveImgRef(card.content[k]);
        });
        (card.extraLayers || []).forEach(l => {
          if (l.type === "image" && l.src) l.src = resolveImgRef(l.src);
        });
        // Build flat back-compat mirrors so balance.js / analytics still work
        card.name    = card.content.name    || "";
        card.type    = card.content.typeLine || "Creature";
        card.ability = card.content.ability || "";
        card.flavor  = card.content.flavor  || "";
        card.artwork = card.content.artwork || "";
        card.frontBg = card.content.frontBg || "";
        card.backBg  = card.content.backBg  || "";
        card.backLogo= card.content.backLogo|| "";
        card.cost    = card.gameplay?.cost    ?? 0;
        card.attack  = card.gameplay?.attack  ?? 0;
        card.defense = card.gameplay?.defense ?? 0;
        card.health  = card.gameplay?.health  ?? card.defense;
        card.element = card.gameplay?.element || "neutral";
        card.faction = card.gameplay?.faction || "";
        card.artist  = card.metadata?.artist;
        card.set     = card.metadata?.set;
        card.serial  = card.metadata?.serial;
        card.collectorNumber = card.metadata?.collectorNumber;
        card.keywords = card.tags || [];
        card.usage = card.usage ?? 0.5;
      }
      // Materialise frontLayers/backLayers for editor/Card.jsx
      return Templates.materialiseLayers(card, template);
    });

    return { cards, topic: deckName, deck: { id: deckId, name: deckName, locale, template, rules }, imageMap };
  },

  // Helper: turn a legacy v0.7 record into the editor's in-memory shape
  _legacyToInMemory(rec, imageMap) {
    const resolveSrc = (src) => (typeof src === "string" && src.startsWith("images/") && imageMap[src]) ? imageMap[src] : src;
    const liftLayer = (sl) => {
      const base = {
        id: sl.id, x: sl.x ?? 0, y: sl.y ?? 0,
        w: sl.width ?? sl.w ?? 50, h: sl.height ?? sl.h ?? 30,
        z: sl.zIndex ?? sl.z ?? 0, label: sl.label, type: sl.type,
      };
      if (sl.type === "image") return { ...base, src: resolveSrc(sl.src), fit: sl.fit || "cover" };
      if (sl.type === "text") {
        const f = sl.font || {};
        return { ...base, value: sl.value || "", align: sl.align || "left", wrap: sl.wrap !== false,
          fontFamily: f.family || "Inter", fontSize: f.size || 13, fontWeight: f.weight || "400",
          fontColor: f.color || "#ffffff", fontItalic: f.style === "italic" };
      }
      if (sl.type === "stat") {
        return { ...base,
          statLabel: sl.statLabel ?? sl.label ?? "",
          statValue: sl.statValue ?? sl.value ?? 0,
          statShape: sl.statShape ?? sl.style?.shape ?? "circle",
          statBg:    sl.statBg    ?? sl.style?.background ?? "#1a7a90",
          statColor: sl.statColor ?? sl.style?.textColor  ?? "#ffffff",
          statSize:  sl.statSize  ?? 20 };
      }
      return base;
    };

    const front = rec.front || {};
    const back  = rec.back  || {};
    const frontLayers = (front.layers || []).map(liftLayer);
    const backLayers  = (back.layers  || []).map(liftLayer);

    const fg = id => frontLayers.find(l => l.id === id);
    const bg = id => backLayers.find(l => l.id === id);
    const titleL   = fg("title") || fg("name");
    const abilityL = fg("description") || fg("ability");
    const flavorL  = fg("flavor");
    const typeL    = fg("typeLine") || fg("type");
    const attackL  = fg("attack");
    const defenseL = fg("defense");
    const costL    = fg("cost");
    const artworkL = fg("artwork");
    const frontBgL = fg("frontBg");
    const backBgL  = bg("backBg");
    const backLogoL= bg("logo") || bg("backLogo");

    const meta = rec.metadata || {};
    return {
      id: rec.id,
      name: titleL?.value || meta.name || "Unnamed",
      type: typeL?.value || meta.type || (rec.gameplay?.faction ? rec.gameplay.faction[0].toUpperCase()+rec.gameplay.faction.slice(1) : "Creature"),
      rarity: rec.rarity || "common",
      cost:    costL?.statValue    ?? rec.gameplay?.cost    ?? 0,
      attack:  attackL?.statValue  ?? rec.gameplay?.attack  ?? 0,
      defense: defenseL?.statValue ?? rec.gameplay?.defense ?? 0,
      health:  rec.gameplay?.health ?? rec.gameplay?.defense ?? 0,
      ability: abilityL?.value || meta.ability || "",
      flavor:  flavorL?.value  || meta.flavor  || "",
      keywords: rec.tags || [],
      element: rec.gameplay?.element || "neutral",
      faction: rec.gameplay?.faction || "",
      usage: meta.usage ?? 0.5,
      artwork:  resolveSrc(artworkL?.src) || resolveSrc(rec.artwork) || "",
      frontBg:  resolveSrc(frontBgL?.src) || resolveSrc(front.background) || "",
      backBg:   resolveSrc(backBgL?.src)  || resolveSrc(back.background)  || "",
      backLogo: resolveSrc(backLogoL?.src) || "",
      backColor: back.color || "",
      artist: meta.artist, set: meta.set,
      serial: meta.serial, collectorNumber: meta.collectorNumber,
      frontLayers, backLayers,
    };
  },

  // Infer a minimum template from a legacy card (used when import has no deck.json).
  // Strips the legacy card's content out, keeping only slot geometry/style.
  _inferTemplateFromLegacy(legacyRec) {
    const T = Templates;
    if (!legacyRec) return T.defaultTemplate();
    const front = legacyRec.front || {};
    const back  = legacyRec.back  || {};

    const slotFrom = (sl) => {
      const out = {
        id: sl.id,
        type: sl.type,
        x: sl.x ?? 0, y: sl.y ?? 0,
        w: sl.width ?? sl.w ?? 50, h: sl.height ?? sl.h ?? 30,
        z: sl.zIndex ?? sl.z ?? 0,
      };
      if (sl.type === "text" && sl.font) {
        out.fontFamily = sl.font.family || "Inter";
        out.fontSize = sl.font.size || 13;
        out.fontWeight = sl.font.weight || "400";
        out.fontColor = sl.font.color || "#ffffff";
        out.fontItalic = sl.font.style === "italic";
        out.align = sl.align || "left";
        out.wrap = sl.wrap !== false;
      }
      if (sl.type === "image") out.fit = sl.fit || "cover";
      if (sl.type === "stat") {
        out.statShape = sl.statShape ?? sl.style?.shape ?? "circle";
        out.statBg    = sl.statBg    ?? sl.style?.background ?? "#1a7a90";
        out.statColor = sl.statColor ?? sl.style?.textColor  ?? "#ffffff";
        out.statSize  = sl.statSize  ?? 20;
        out.statLabel = sl.statLabel ?? sl.label ?? "";
      }
      return out;
    };

    return {
      id: legacyRec.template || "tcg_v1",
      frontBg: front.background || "",
      backBg:  back.background  || "",
      front: { slots: (front.layers || []).map(slotFrom) },
      back:  { slots: (back.layers  || []).map(slotFrom) },
    };
  },
};

export default CardIO;
