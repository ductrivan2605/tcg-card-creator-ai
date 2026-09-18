import React from "react";
import Templates from "./templates.js";
// ─────────────────────────────────────────────────────────────
// Card Editor — v0.8 Step 2.
// Scope-aware: edits route to card.overrides[] (card scope) or
// template.slots[] (template scope). Always re-renders the
// canvas from materialised layers so visuals stay consistent.
// ─────────────────────────────────────────────────────────────

// Read shared constants from window.Templates (set by templates.js)
// to avoid re-declaring globals that already exist in the script-global scope.
const _CARD_W = Templates?.CARD_W || 400;
const _CARD_H = Templates?.CARD_H || 560;
const _DISP_SCALE = 0.72;
const _SNAP_PX = 4;

// ── Typography preset library ─────────────────────────────────
// Each preset bundles a font + weight + spacing + casing.
// Designed for TCG / fantasy / sci-fi game aesthetics.
// Applied via setTypography(layer, preset) which writes fontFamily,
// fontWeight, letterSpacing, textTransform, etc.
const _TYPO_PRESETS = [
  // Fantasy / Inscriptional
  { id:"cinzel-legend",   name:"Inscription",      tag:"Legendary card name",
    fontFamily:"Cinzel",            fontWeight:"700", letterSpacing:"0.04em", textTransform:"none", category:"fantasy" },
  { id:"cinzel-deco",     name:"Carved",           tag:"Decorative title",
    fontFamily:"Cinzel Decorative", fontWeight:"700", letterSpacing:"0.06em", textTransform:"none", category:"fantasy" },
  { id:"medieval-sharp",  name:"Quest scroll",     tag:"Adventure title",
    fontFamily:"MedievalSharp",     fontWeight:"400", letterSpacing:"0.02em", textTransform:"none", category:"fantasy" },
  { id:"blackletter",     name:"Blackletter",      tag:"Dark / occult",
    fontFamily:"UnifrakturMaguntia", fontWeight:"400", letterSpacing:"0",    textTransform:"none", category:"fantasy" },
  { id:"almendra",        name:"Stone tablet",     tag:"Ancient text",
    fontFamily:"Almendra SC",       fontWeight:"400", letterSpacing:"0.05em", textTransform:"none", category:"fantasy" },
  { id:"pirata",          name:"Tavern sign",      tag:"Rough display",
    fontFamily:"Pirata One",        fontWeight:"400", letterSpacing:"0.02em", textTransform:"none", category:"fantasy" },
  { id:"macondo",         name:"Storybook",        tag:"Whimsy / children",
    fontFamily:"Macondo",           fontWeight:"400", letterSpacing:"0.03em", textTransform:"none", category:"fantasy" },
  { id:"cabin-sketch",    name:"Sketch",           tag:"Hand-drawn feel",
    fontFamily:"Cabin Sketch",      fontWeight:"700", letterSpacing:"0.02em", textTransform:"none", category:"fantasy" },

  // Classical serif body
  { id:"cormorant-body",  name:"Manuscript",       tag:"Flavor / lore body",
    fontFamily:"Cormorant Garamond", fontWeight:"500", letterSpacing:"0.01em", textTransform:"none", category:"classical" },
  { id:"cormorant-italic",name:"Quoted",           tag:"Italic flavor",
    fontFamily:"Cormorant Garamond", fontWeight:"500", letterSpacing:"0.01em", textTransform:"none", category:"classical", fontItalic:true },
  { id:"georgia-body",    name:"Classic",          tag:"Ability body",
    fontFamily:"Georgia",           fontWeight:"400", letterSpacing:"0",      textTransform:"none", category:"classical" },

  // Sci-fi / Tech
  { id:"orbitron",        name:"Quantum",          tag:"Sci-fi display",
    fontFamily:"Orbitron",          fontWeight:"700", letterSpacing:"0.08em", textTransform:"uppercase", category:"tech" },
  { id:"audiowide",       name:"Holo",             tag:"Futuristic UI",
    fontFamily:"Audiowide",         fontWeight:"400", letterSpacing:"0.05em", textTransform:"none", category:"tech" },
  { id:"mono-readout",    name:"Readout",          tag:"Stat / data label",
    fontFamily:"JetBrains Mono",    fontWeight:"500", letterSpacing:"0.10em", textTransform:"uppercase", category:"tech" },
  { id:"mono-tech",       name:"Console",          tag:"Technical body",
    fontFamily:"JetBrains Mono",    fontWeight:"400", letterSpacing:"0.02em", textTransform:"none", category:"tech" },

  // Modern display
  { id:"bebas-display",   name:"Poster",           tag:"Big bold display",
    fontFamily:"Bebas Neue",        fontWeight:"400", letterSpacing:"0.05em", textTransform:"uppercase", category:"modern" },
  { id:"russo",           name:"Heavy",            tag:"Military / sport",
    fontFamily:"Russo One",         fontWeight:"400", letterSpacing:"0.04em", textTransform:"uppercase", category:"modern" },
  { id:"bungee",          name:"Arcade",           tag:"Bold / playful",
    fontFamily:"Bungee",            fontWeight:"400", letterSpacing:"0.04em", textTransform:"uppercase", category:"modern" },
  { id:"bowlby",          name:"Comic block",      tag:"Heavy display",
    fontFamily:"Bowlby One SC",     fontWeight:"400", letterSpacing:"0.03em", textTransform:"uppercase", category:"modern" },
  { id:"inter-clean",     name:"Clean",            tag:"Modern body",
    fontFamily:"Inter",             fontWeight:"500", letterSpacing:"0",      textTransform:"none", category:"modern" },
  { id:"inter-caps",      name:"All caps",         tag:"UI label",
    fontFamily:"Inter",             fontWeight:"700", letterSpacing:"0.12em", textTransform:"uppercase", category:"modern" },

  // Retro
  { id:"press-start",     name:"8-bit",            tag:"Pixel / retro",
    fontFamily:"Press Start 2P",    fontWeight:"400", letterSpacing:"0.02em", textTransform:"none", category:"retro" },
  { id:"vt323",           name:"Terminal",         tag:"CRT / DOS",
    fontFamily:"VT323",             fontWeight:"400", letterSpacing:"0.03em", textTransform:"none", category:"retro" },
];

function applyTypoPreset(preset) {
  return {
    fontFamily: preset.fontFamily,
    fontWeight: preset.fontWeight,
    letterSpacing: preset.letterSpacing,
    textTransform: preset.textTransform,
    fontItalic: preset.fontItalic || false,
  };
}

function applyStatTypoPreset(preset) {
  return {
    statFontFamily: preset.fontFamily,
    statFontWeight: preset.fontWeight,
    statLetterSpacing: preset.letterSpacing,
  };
}
// ── Snap engine (unchanged) ───────────────────────────────────
function computeSnap(movingRect, otherRects, cW, cH) {
  const { x, y, w, h } = movingRect;
  const movX=[x,x+w/2,x+w], movY=[y,y+h/2,y+h];
  const xC=[0,cW/2,cW], yC=[0,cH/2,cH];
  otherRects.forEach(r=>{xC.push(r.x,r.x+r.w/2,r.x+r.w);yC.push(r.y,r.y+r.h/2,r.y+r.h);});
  let bdx=0,bdxA=_SNAP_PX+1,snX=null,bdy=0,bdyA=_SNAP_PX+1,snY=null;
  movX.forEach(mx=>xC.forEach(cx=>{const d=cx-mx;if(Math.abs(d)<bdxA){bdxA=Math.abs(d);bdx=d;snX=cx;}}));
  movY.forEach(my=>yC.forEach(cy=>{const d=cy-my;if(Math.abs(d)<bdyA){bdyA=Math.abs(d);bdy=d;snY=cy;}}));
  const dx=bdxA<=_SNAP_PX?bdx:0, dy=bdyA<=_SNAP_PX?bdy:0;
  const guides=[];
  if(bdxA<=_SNAP_PX&&snX!==null) guides.push({kind:"v",pos:snX});
  if(bdyA<=_SNAP_PX&&snY!==null) guides.push({kind:"h",pos:snY});
  return {dx,dy,guides};
}

// ── Scope-aware mutation helpers ─────────────────────────────
// applyEdit returns {nextCard, nextDeck} based on scope + layer source.
function applyLayerEdit({ card, deck, face, layerId, patch, scope }) {
  const template = deck.template;
  const slot = (template[face].slots || []).find(s => s.id === layerId);
  const extra = (card.extraLayers || []).find(l => l.id === layerId);

  let nextCard = card;
  let nextDeck = deck;

  if (slot) {
    if (scope === "template") {
      // mutate the template slot
      const newSlots = template[face].slots.map(s => s.id === layerId ? { ...s, ...patch } : s);
      nextDeck = { ...deck, template: { ...template, [face]: { ...template[face], slots: newSlots } } };
    } else {
      // card mode → write to overrides
      const prev = card.overrides?.[layerId] || {};
      const newOv = { ...prev, ...patch };
      // Don't write a redundant override that exactly equals the slot's value.
      const cleaned = {};
      for (const k of Object.keys(newOv)) {
        if (newOv[k] !== slot[k]) cleaned[k] = newOv[k];
      }
      const overrides = { ...card.overrides };
      if (Object.keys(cleaned).length) overrides[layerId] = cleaned;
      else delete overrides[layerId];
      nextCard = { ...card, overrides };
    }
  } else if (extra) {
    if (scope === "template") {
      // ignore — can't edit a card extra from template mode
    } else {
      const newExtras = (card.extraLayers || []).map(l => l.id === layerId ? { ...l, ...patch } : l);
      nextCard = { ...card, extraLayers: newExtras };
    }
  }
  return { nextCard, nextDeck };
}

// Content-edit (text value / image src / stat value) routing.
// These always go to the card (template doesn't store content).
function applyContentEdit({ card, deck, face, layerId, patch }) {
  const slot = (deck.template[face].slots || []).find(s => s.id === layerId);
  const extra = (card.extraLayers || []).find(l => l.id === layerId);
  if (slot) {
    // Text value → content[id]. Image src → content[id]. Stat value → gameplay[id] or content[id].
    const c = { ...card };
    c.content = { ...c.content };
    c.gameplay = { ...c.gameplay };
    if (slot.type === "text" && patch.value !== undefined) c.content[layerId] = patch.value;
    if (slot.type === "image" && patch.src !== undefined) c.content[layerId] = patch.src;
    if (slot.type === "stat" && patch.statValue !== undefined) {
      // Map standard stat slots to gameplay; otherwise content.
      if (["cost","attack","defense","health"].includes(layerId)) c.gameplay[layerId] = patch.statValue;
      else c.content[layerId] = patch.statValue;
    }
    // Stash File blob so it survives serialization.
    if (patch._file) {
      c._files = { ...(c._files || {}), [layerId]: patch._file };
    }
    return { nextCard: c, nextDeck: deck };
  }
  if (extra) {
    const newExtras = (card.extraLayers || []).map(l => l.id === layerId ? { ...l, ...patch } : l);
    return { nextCard: { ...card, extraLayers: newExtras }, nextDeck: deck };
  }
  return { nextCard: card, nextDeck: deck };
}

// Add a new layer.
function applyAddLayer({ card, deck, face, type, scope }) {
  const id = type + "_" + Math.random().toString(36).slice(2,6);
  const x = 40 + Math.floor(Math.random()*60), y = 80 + Math.floor(Math.random()*60);
  let layer;
  if (type === "text") layer = { id, type, label:"Text", x, y, w:200, h:40, z:10, value:"New text",
    fontFamily:"Inter", fontSize:13, fontWeight:"400", fontColor:"#ffffff", align:"left", wrap:true };
  else if (type === "image") layer = { id, type, label:"Image", x, y, w:180, h:140, z:1, src:"", fit:"cover" };
  else layer = { id, type, label:"Stat", x, y, w:52, h:46, z:11, statLabel:"", statValue:0,
    statShape:"circle", statBg:"#1a7a90", statColor:"#ffffff", statSize:20 };

  if (scope === "template") {
    const newSlots = [...(deck.template[face].slots || []), layer];
    const nextDeck = { ...deck, template: { ...deck.template, [face]: { ...deck.template[face], slots: newSlots } } };
    return { nextCard: card, nextDeck, newLayerId: id };
  } else {
    const extra = { ...layer, _face: face };
    const newExtras = [...(card.extraLayers || []), extra];
    return { nextCard: { ...card, extraLayers: newExtras }, nextDeck: deck, newLayerId: id };
  }
}

// Delete layers.
function applyDeleteLayers({ card, deck, face, ids, scope, materialised }) {
  // Partition ids into slot-ids and extra-ids based on materialised _source.
  const slotIds = [], extraIds = [];
  ids.forEach(id => {
    const m = materialised.find(l => l.id === id);
    if (!m) return;
    if (m._source === "slot") slotIds.push(id);
    else extraIds.push(id);
  });
  let nextCard = card;
  let nextDeck = deck;
  if (extraIds.length) {
    nextCard = { ...card, extraLayers: (card.extraLayers || []).filter(l => !extraIds.includes(l.id)) };
  }
  if (scope === "template" && slotIds.length) {
    const newSlots = (deck.template[face].slots || []).filter(s => !slotIds.includes(s.id));
    nextDeck = { ...deck, template: { ...deck.template, [face]: { ...deck.template[face], slots: newSlots } } };
  }
  // In card scope, slot deletes are ignored (template owns slots).
  return { nextCard, nextDeck };
}

// Z-order adjustment.
function applyZMove({ card, deck, face, layerId, dir, scope }) {
  // dir = "up" or "down" in render order (visual stacking)
  // Treat the materialised list as the order: slots first, extras after.
  // We adjust z values rather than reordering arrays.
  const slot = (deck.template[face].slots || []).find(s => s.id === layerId);
  const delta = dir === "up" ? 1 : -1;
  if (slot) {
    if (scope === "template") {
      const newSlots = deck.template[face].slots.map(s => s.id === layerId ? { ...s, z: Math.max(0, (s.z || 0) + delta) } : s);
      return { nextCard: card, nextDeck: { ...deck, template: { ...deck.template, [face]: { ...deck.template[face], slots: newSlots } } } };
    } else {
      // adjust z in overrides
      const prev = card.overrides?.[layerId] || {};
      const newZ = Math.max(0, (prev.z != null ? prev.z : slot.z || 0) + delta);
      const overrides = { ...card.overrides, [layerId]: { ...prev, z: newZ } };
      return { nextCard: { ...card, overrides }, nextDeck: deck };
    }
  }
  const extra = (card.extraLayers || []).find(l => l.id === layerId);
  if (extra) {
    const newExtras = card.extraLayers.map(l => l.id === layerId ? { ...l, z: Math.max(0, (l.z || 0) + delta) } : l);
    return { nextCard: { ...card, extraLayers: newExtras }, nextDeck: deck };
  }
  return { nextCard: card, nextDeck: deck };
}

// ── Main Editor ──────────────────────────────────────────────
function CardEditor({ card: cardProp, deck: deckProp, onChange, onDeckChange, onClose, initialScope, ruleConflicts = [] }) {
  // Local in-flight state (for smooth dragging without per-pixel parent re-renders)
  const [face, setFace] = React.useState("front");
  const [scope, setScope] = React.useState(initialScope || "card"); // "card" | "template"
  const [selIds, setSelIds] = React.useState([]);
  const [bottomTab, setBottomTab] = React.useState("layers"); // "layers" | "props"
  const [activeGuides, setActiveGuides] = React.useState([]);
  const [draftCard, setDraftCard] = React.useState(cardProp);
  const [draftDeck, setDraftDeck] = React.useState(deckProp);

  // Reset draft when card or deck identity changes externally
  React.useEffect(() => { setDraftCard(cardProp); setSelIds([]); setActiveGuides([]); }, [cardProp?.id]);
  React.useEffect(() => { setDraftDeck(deckProp); }, [deckProp?.id]);
  // Keep draft in sync if parent updates (e.g. via Card properties form)
  React.useEffect(() => { setDraftCard(cardProp); }, [cardProp]);
  React.useEffect(() => { setDraftDeck(deckProp); }, [deckProp]);

  // Honour external scope changes (e.g. user clicks the Template tile in grid)
  React.useEffect(() => {
    if (initialScope) {
      setScope(initialScope);
      setSelIds([]);
    }
  }, [initialScope, cardProp?.id]);

  const cardRef  = React.useRef(draftCard);
  const deckRef  = React.useRef(draftDeck);
  const selRef   = React.useRef(selIds);
  React.useEffect(() => { cardRef.current = draftCard; }, [draftCard]);
  React.useEffect(() => { deckRef.current = draftDeck; }, [draftDeck]);
  React.useEffect(() => { selRef.current  = selIds;    }, [selIds]);

  const dragRef    = React.useRef(null);
  const canvasRef  = React.useRef(null);

  // Materialise current face from (template + card) — single source of truth for render
  const layers = React.useMemo(() => {
    if (!draftDeck?.template || !draftCard) return [];
    return Templates.resolveCardFace(draftDeck.template, draftCard, face);
  }, [draftDeck?.template, draftCard, face]);

  const sel = selIds.length === 1 ? layers.find(l => l.id === selIds[0]) : null;
  const selectedLayers = layers.filter(l => selIds.includes(l.id));

  // ── Commit helpers (push draft → parent, can be debounced) ──
  function commitCard(nextCard) {
    setDraftCard(nextCard);
    onChange && onChange(Templates.materialiseLayers(nextCard, deckRef.current.template));
  }
  function commitDeck(nextDeck) {
    setDraftDeck(nextDeck);
    onDeckChange && onDeckChange(nextDeck);
  }
  function commitBoth(nextCard, nextDeck) {
    setDraftCard(nextCard);
    setDraftDeck(nextDeck);
    onChange && onChange(Templates.materialiseLayers(nextCard, nextDeck.template));
    onDeckChange && onDeckChange(nextDeck);
  }

  // ── Layer mutation entry points ──────────────────────────
  function patchLayer(layerId, patch) {
    const { nextCard, nextDeck } = applyLayerEdit({
      card: cardRef.current, deck: deckRef.current, face, layerId, patch, scope,
    });
    if (nextDeck !== deckRef.current) commitBoth(nextCard, nextDeck);
    else commitCard(nextCard);
  }
  function patchContent(layerId, patch) {
    const { nextCard } = applyContentEdit({
      card: cardRef.current, deck: deckRef.current, face, layerId, patch,
    });
    commitCard(nextCard);
  }
  // Batched layer edit across multiple layers (multi-select).
  function patchManyLayers(layerIds, patch) {
    let curCard = cardRef.current, curDeck = deckRef.current;
    for (const id of layerIds) {
      const r = applyLayerEdit({ card: curCard, deck: curDeck, face, layerId: id, patch, scope });
      curCard = r.nextCard; curDeck = r.nextDeck;
    }
    commitBoth(curCard, curDeck);
  }
  function addLayer(type) {
    const { nextCard, nextDeck, newLayerId } = applyAddLayer({
      card: cardRef.current, deck: deckRef.current, face, type, scope,
    });
    commitBoth(nextCard, nextDeck);
    setSelIds([newLayerId]);
  }
  function deleteSelected() {
    const { nextCard, nextDeck } = applyDeleteLayers({
      card: cardRef.current, deck: deckRef.current, face, ids: selRef.current, scope, materialised: layers,
    });
    commitBoth(nextCard, nextDeck);
    setSelIds([]);
  }
  function moveZ(layerId, dir) {
    const { nextCard, nextDeck } = applyZMove({
      card: cardRef.current, deck: deckRef.current, face, layerId, dir, scope,
    });
    commitBoth(nextCard, nextDeck);
  }
  function duplicateSelected() {
    // duplicate as extras (you can't duplicate a slot — slots are unique by id)
    if (!selIds.length) return;
    const copies = layers
      .filter(l => selIds.includes(l.id))
      .map(l => ({ ...l, _source: undefined, id: l.id + "_c" + Math.random().toString(36).slice(2,4),
        x: l.x + 12, y: l.y + 12, _face: face }));
    const newExtras = [...(cardRef.current.extraLayers || []), ...copies];
    commitCard({ ...cardRef.current, extraLayers: newExtras });
    setSelIds(copies.map(c => c.id));
  }

  // ── Drag-to-move (uses scope-aware patchLayer) ──────────
  function onLayerMouseDown(e, id) {
    e.preventDefault(); e.stopPropagation();
    const already = selRef.current;
    const newSel = e.shiftKey
      ? (already.includes(id) ? already.filter(x => x !== id) : [...already, id])
      : (already.includes(id) && already.length > 1 ? already : [id]);
    setSelIds(newSel); selRef.current = newSel;
    canvasRef.current?.focus();
    if (!newSel.length) return;

    // Snapshot starting positions from materialised layers
    const startSnap = layers
      .filter(l => newSel.includes(l.id))
      .map(l => ({ id: l.id, ox: l.x, oy: l.y, w: l.w || 50, h: l.h || 30 }));
    const others = layers
      .filter(l => !newSel.includes(l.id))
      .map(l => ({ x: l.x, y: l.y, w: l.w || 50, h: l.h || 30 }));

    dragRef.current = { sx: e.clientX, sy: e.clientY, snapshot: startSnap, others };
    function onMove(ev) {
      if (!dragRef.current) return;
      const { sx, sy, snapshot, others } = dragRef.current;
      const rawDx = (ev.clientX - sx) / _DISP_SCALE;
      const rawDy = (ev.clientY - sy) / _DISP_SCALE;
      const a = snapshot[0];
      const { dx: sdx, dy: sdy, guides } = computeSnap(
        { x: a.ox + rawDx, y: a.oy + rawDy, w: a.w, h: a.h }, others, _CARD_W, _CARD_H
      );
      const dx = rawDx + sdx, dy = rawDy + sdy;
      // Apply each move through the routing layer
      let curCard = cardRef.current, curDeck = deckRef.current;
      for (const s of snapshot) {
        const nx = Math.round(Math.max(0, Math.min(_CARD_W - s.w, s.ox + dx)));
        const ny = Math.round(Math.max(0, Math.min(_CARD_H - s.h, s.oy + dy)));
        const r = applyLayerEdit({ card: curCard, deck: curDeck, face, layerId: s.id, patch: { x: nx, y: ny }, scope });
        curCard = r.nextCard; curDeck = r.nextDeck;
      }
      // Update drafts without notifying parent yet (smooth drag)
      setDraftCard(curCard);
      setDraftDeck(curDeck);
      cardRef.current = curCard;
      deckRef.current = curDeck;
      setActiveGuides(guides);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      dragRef.current = null;
      setActiveGuides([]);
      // Now commit to parent
      onChange && onChange(Templates.materialiseLayers(cardRef.current, deckRef.current.template));
      onDeckChange && onDeckChange(deckRef.current);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onResizeMouseDown(e, handle) {
    e.preventDefault(); e.stopPropagation();
    if (selIds.length !== 1) return;
    const id = selIds[0];
    const l = layers.find(x => x.id === id); if (!l) return;
    canvasRef.current?.focus();
    const start = { x: l.x, y: l.y, w: l.w || 50, h: l.h || 30 };
    const sx = e.clientX, sy = e.clientY, aspect = start.w / Math.max(1, start.h);
    function onMove(ev) {
      const rawDx = (ev.clientX - sx) / _DISP_SCALE;
      const rawDy = (ev.clientY - sy) / _DISP_SCALE;
      let { x, y, w, h } = start;
      if (handle.includes("l")) { x = start.x + rawDx; w = start.w - rawDx; }
      if (handle.includes("r")) w = start.w + rawDx;
      if (handle.includes("t")) { y = start.y + rawDy; h = start.h - rawDy; }
      if (handle.includes("b")) h = start.h + rawDy;
      if (ev.shiftKey && ["tl","tr","bl","br"].includes(handle)) {
        const nh = Math.max(8, Math.abs(w) / aspect);
        if (handle.includes("t")) y = start.y + (start.h - nh);
        h = nh;
      }
      if (w < 8) { w = 8; if (handle.includes("l")) x = start.x + start.w - 8; }
      if (h < 8) { h = 8; if (handle.includes("t")) y = start.y + start.h - 8; }
      x = Math.max(0, Math.min(_CARD_W - 8, x));
      y = Math.max(0, Math.min(_CARD_H - 8, y));
      w = Math.min(w, _CARD_W - x);
      h = Math.min(h, _CARD_H - y);
      const r = applyLayerEdit({
        card: cardRef.current, deck: deckRef.current, face, layerId: id,
        patch: { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) },
        scope,
      });
      setDraftCard(r.nextCard); setDraftDeck(r.nextDeck);
      cardRef.current = r.nextCard; deckRef.current = r.nextDeck;
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      onChange && onChange(Templates.materialiseLayers(cardRef.current, deckRef.current.template));
      onDeckChange && onDeckChange(deckRef.current);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onCanvasKeyDown(e) {
    if (!selRef.current.length) return;
    const isArrow = ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key);
    const isDel = e.key === "Delete" || e.key === "Backspace";
    if (!isArrow && !isDel) return;
    e.preventDefault();
    if (isDel) { deleteSelected(); return; }
    const step = e.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step;
    else dy = step;
    let curCard = cardRef.current, curDeck = deckRef.current;
    for (const id of selRef.current) {
      const l = layers.find(x => x.id === id); if (!l) continue;
      const nx = Math.max(0, Math.min(_CARD_W - (l.w || 10), (l.x || 0) + dx));
      const ny = Math.max(0, Math.min(_CARD_H - (l.h || 10), (l.y || 0) + dy));
      const r = applyLayerEdit({ card: curCard, deck: curDeck, face, layerId: id, patch: { x: nx, y: ny }, scope });
      curCard = r.nextCard; curDeck = r.nextDeck;
    }
    commitBoth(curCard, curDeck);
  }

  function handleImageClear(layerId) {
    if (scope === "template") {
      const tpl = deckRef.current.template;
      const universalKeys = { frontBg: "_frontBgFile", backBg: "_backBgFile", backLogo: "_backLogoFile" };
      if (universalKeys[layerId]) {
        const fileField = universalKeys[layerId];
        const newTpl = { ...tpl, [layerId]: "", [fileField]: undefined };
        commitDeck({ ...deckRef.current, template: newTpl });
      } else {
        const slot = (tpl[face].slots || []).find(s => s.id === layerId);
        if (slot) {
          const newSlots = tpl[face].slots.map(s => s.id === layerId ? { ...s, src: "", _file: undefined } : s);
          const newTpl = { ...tpl, [face]: { ...tpl[face], slots: newSlots } };
          commitDeck({ ...deckRef.current, template: newTpl });
        }
      }
    } else {
      // Card scope: clear content[layerId] and the _files entry
      const c = { ...cardRef.current };
      c.content = { ...c.content, [layerId]: "" };
      if (c._files && c._files[layerId]) {
        c._files = { ...c._files };
        delete c._files[layerId];
      }
      commitCard(c);
    }
  }

  function handleImageUpload(e, layerId) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    if (scope === "template") {
      // Template-scope image upload → update the template, not per-card content.
      // Universal slots (frontBg/backBg/backLogo) flow into template's top-level fields
      // so the resolver's fallback propagates them to every card.
      const tpl = deckRef.current.template;
      const universalKeys = { frontBg: "_frontBgFile", backBg: "_backBgFile", backLogo: "_backLogoFile" };
      if (universalKeys[layerId]) {
        const fileField = universalKeys[layerId];
        const newTpl = { ...tpl, [layerId]: url, [fileField]: file };
        commitDeck({ ...deckRef.current, template: newTpl });
      } else {
        // Custom template slot: write src directly into the slot
        const slot = (tpl[face].slots || []).find(s => s.id === layerId);
        if (slot) {
          const newSlots = tpl[face].slots.map(s => s.id === layerId ? { ...s, src: url, _file: file } : s);
          const newTpl = { ...tpl, [face]: { ...tpl[face], slots: newSlots } };
          commitDeck({ ...deckRef.current, template: newTpl });
        }
      }
    } else {
      // Card-scope upload → per-card content + stash File for serialisation.
      patchContent(layerId, { src: url, _file: file });
    }
    e.target.value = "";
  }

  if (!cardProp) {
    return (
      <div className="panel" style={{padding:40, textAlign:"center", color:"var(--ink-3)"}}>
        <div style={{fontFamily:"var(--font-display)", fontSize:14, color:"var(--ink-2)", marginBottom:6}}>No card selected</div>
        <div style={{fontSize:11.5}}>Click any card to open the editor.</div>
      </div>
    );
  }

  const sortedForList = [...layers].sort((a,b) => (b.z||0) - (a.z||0));
  const inTemplate = scope === "template";

  return (
    <div className="panel editor-vertical" style={{padding:0, overflow:"hidden", display:"flex", flexDirection:"column"}}>
      {/* Header (two rows) */}
      {/* Row 1: identity (left) · scope pill (center) · close (right) */}
      <div style={{padding:"10px 14px 8px", borderBottom:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center", gap:10, flexShrink:0}}>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"var(--font-mono)", fontSize:9.5, letterSpacing:"0.1em", textTransform:"uppercase",
            color: inTemplate ? "var(--cyan-bright)" : "var(--gold-bright)"}}>
            Editing {inTemplate ? "template" : "card"}
          </div>
          <div style={{fontFamily:"var(--font-display)", fontSize:14, color:"var(--ink)", marginTop:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
            {inTemplate ? (draftDeck?.name || "Template") : draftCard.name}
          </div>
        </div>
        {/* Scope pill — centered */}
        <div style={{display:"flex", background:"rgba(0,0,0,0.45)", borderRadius:99, padding:3,
          border: `1px solid ${inTemplate ? "var(--cyan)" : "var(--gold)"}`,
          boxShadow: `0 0 12px ${inTemplate ? "rgba(103,217,230,0.25)" : "rgba(240,193,104,0.20)"}`,
          transition:"all 0.2s"}}>
          {["card","template"].map(s => {
            const active = scope === s;
            const c = s === "template";
            return (
              <button key={s} onClick={() => { setScope(s); setSelIds([]); }}
                style={{padding:"5px 14px", border:"none", cursor:"pointer", borderRadius:99,
                  background: active
                    ? (c ? "var(--cyan)" : "var(--gold)")
                    : "transparent",
                  color: active ? "#0a1a22" : "var(--ink-3)",
                  fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.1em",
                  textTransform:"uppercase", fontWeight: active ? 700 : 500,
                  transition:"all 0.15s"}}>
                {s}
              </button>
            );
          })}
        </div>
        <div style={{flex:1, display:"flex", justifyContent:"flex-end", gap:8, alignItems:"center"}}>
          {onClose && <button onClick={onClose} style={closeBtn}>✕</button>}
        </div>
      </div>
      {/* Row 2: rarity (left) · front/back (right) */}
      <div style={{padding:"6px 14px 8px", borderBottom:"1px solid var(--line)", display:"flex", alignItems:"center", gap:10, flexShrink:0}}>
        {!inTemplate ? (
          <div style={{display:"flex", alignItems:"center", gap:8}}>
            <span style={{fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase"}}>Rarity</span>
            <select value={draftCard.rarity} onChange={e => commitCard({...draftCard, rarity:e.target.value})} style={miniSelect}>
              {(draftDeck?.rules?.rarities || []).map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
        ) : (
          <span style={{fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase"}}>
            Deck template · {(draftDeck?.rules?.rarities || []).length} rarity tiers
          </span>
        )}
        <div style={{flex:1}}/>
        <div style={{display:"flex", background:"rgba(0,0,0,0.4)", borderRadius:4, padding:2, border:"1px solid var(--line)"}}>
          {["front","back"].map(f => (
            <button key={f} onClick={() => { setFace(f); setSelIds([]); }}
              style={{...faceBtnStyle, background: face===f ? "var(--bg-panel)" : "transparent",
                color: face===f ? "var(--gold-bright)" : "var(--ink-3)"}}>{f}</button>
          ))}
        </div>
      </div>

      {/* Slim info bar — selection status (action buttons now live in Layers panel) */}
      <div style={{padding:"5px 14px", borderBottom:"1px solid var(--line)", display:"flex", gap:6, alignItems:"center", background:"rgba(0,0,0,0.12)", flexShrink:0}}>
        <span style={{fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.08em"}}>
          {face} · {layers.length} layers{selIds.length===1?` · ${sel?.label||selIds[0]}`:selIds.length>1?` · ${selIds.length} selected`:""}
          {inTemplate ? " · template scope" : ""}
        </span>
      </div>

      {/* Body: main column (canvas + toolbar + panel) + right-side icon tab strip */}
      {/* Body: canvas (left, full height) · properties panel (middle, scrollable) · icon strip (right) */}
      <div style={{flex:1, display:"flex", overflow:"hidden", minHeight:0}}>
        {/* Canvas column — fills vertical space, centers card */}
        <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center",
          padding:"14px", background:"rgba(0,0,0,0.22)", minWidth:0, overflow:"hidden"}}>
          <div
            ref={canvasRef}
            tabIndex={0}
            onKeyDown={onCanvasKeyDown}
            style={{position:"relative", width:_CARD_W*_DISP_SCALE, height:_CARD_H*_DISP_SCALE,
              background:"linear-gradient(160deg, #16384b, #0a1f2c 60%, #061520)",
              border:`1.5px solid var(--rarity-${draftCard.rarity||"common"})`,
              borderRadius:9, overflow:"hidden", flexShrink:0,
              boxShadow:`0 0 18px color-mix(in oklch, var(--rarity-${draftCard.rarity||"common"}), transparent 60%)`,
              userSelect:"none", outline:"none"}}
            onMouseDown={e => { if (e.target === e.currentTarget) { setSelIds([]); canvasRef.current?.focus(); } }}>
            {[...layers].sort((a,b)=>(a.z||0)-(b.z||0)).map(l => (
              <CanvasLayer key={l.id} layer={l} scale={_DISP_SCALE}
                isSlot={l._source === "slot"} inTemplate={inTemplate}
                onMouseDown={e => onLayerMouseDown(e, l.id)} />
            ))}
            {selectedLayers.map(l => (
              <div key={"out-"+l.id} style={{position:"absolute",
                left:l.x*_DISP_SCALE-1, top:l.y*_DISP_SCALE-1,
                width:(l.w||50)*_DISP_SCALE+2, height:(l.h||30)*_DISP_SCALE+2,
                border:`1.5px solid ${inTemplate ? "var(--cyan-bright)" : "var(--gold-bright)"}`, borderRadius:2,
                pointerEvents:"none", zIndex:99,
                boxShadow:`0 0 6px ${inTemplate ? "rgba(103,217,230,0.4)" : "rgba(240,193,104,0.4)"}`}} />
            ))}
            {sel && (() => {
              const x=sel.x*_DISP_SCALE, y=sel.y*_DISP_SCALE;
              const w=(sel.w||50)*_DISP_SCALE, h=(sel.h||30)*_DISP_SCALE;
              const handles = [
                {id:"tl",cx:x,cy:y,cur:"nwse-resize"},{id:"t",cx:x+w/2,cy:y,cur:"ns-resize"},
                {id:"tr",cx:x+w,cy:y,cur:"nesw-resize"},{id:"r",cx:x+w,cy:y+h/2,cur:"ew-resize"},
                {id:"br",cx:x+w,cy:y+h,cur:"nwse-resize"},{id:"b",cx:x+w/2,cy:y+h,cur:"ns-resize"},
                {id:"bl",cx:x,cy:y+h,cur:"nesw-resize"},{id:"l",cx:x,cy:y+h/2,cur:"ew-resize"},
              ];
              return handles.map(hd => (
                <div key={hd.id} onMouseDown={e => onResizeMouseDown(e, hd.id)}
                  style={{position:"absolute", left:hd.cx-5, top:hd.cy-5, width:10, height:10,
                    background: inTemplate ? "var(--cyan-bright)" : "var(--gold-bright)",
                    border:"1.5px solid #1a1a1a", borderRadius:2,
                    cursor:hd.cur, zIndex:100, boxShadow:"0 1px 3px rgba(0,0,0,0.5)"}} />
              ));
            })()}
            {activeGuides.map((g,i) => g.kind === "v" ? (
              <div key={"g"+i} style={{position:"absolute", left:g.pos*_DISP_SCALE-0.5, top:0, width:1, height:"100%",
                background:"var(--magenta)", pointerEvents:"none", zIndex:101, boxShadow:"0 0 4px var(--magenta)"}}/>
            ) : (
              <div key={"g"+i} style={{position:"absolute", top:g.pos*_DISP_SCALE-0.5, left:0, height:1, width:"100%",
                background:"var(--magenta)", pointerEvents:"none", zIndex:101, boxShadow:"0 0 4px var(--magenta)"}}/>
            ))}
          </div>
        </div>

        {/* Properties panel — middle column, scrollable, fills vertical space */}
        <div style={{width: 290, borderLeft:"1px solid var(--line)", overflowY:"auto", flexShrink:0,
          background:"var(--bg-panel)", display:"flex", flexDirection:"column"}}>
          {ruleConflicts && ruleConflicts.length > 0 && (
            <div style={{ padding: "10px 12px", background: "rgba(224,122,122,0.08)", borderBottom: "1px solid rgba(224,122,122,0.2)", flexShrink: 0 }}>
              <div style={{ color: "var(--red)", fontWeight: 600, fontSize: 11, marginBottom: 4 }}>
                ⚠️ Rule Conflicts Detected:
              </div>
              <div style={{ fontSize: 9.5, color: "var(--ink-2)", lineHeight: 1.4, maxHeight: 100, overflowY: "auto" }}>
                {ruleConflicts.map((c, idx) => (
                  <div key={idx} style={{ marginBottom: 4 }}>• {c}</div>
                ))}
              </div>
            </div>
          )}
          {bottomTab === "layers" && (
            <div>
              {/* Inline layer toolbar at the top of the list */}
              <div style={{padding:"7px 10px", display:"flex", gap:4, flexWrap:"wrap", borderBottom:"1px solid var(--line)", background:"rgba(0,0,0,0.18)", position:"sticky", top:0, zIndex:5}}>
                {[["text","T"],["image","🖼"],["stat","⬡"]].map(([t,icon]) => (
                  <button key={t} onClick={() => addLayer(t)} style={{...toolBtn, padding:"3px 7px", fontSize:10}}>{icon} +{t}</button>
                ))}
                {selIds.length > 0 && <>
                  <div style={{width:1, background:"var(--line)", margin:"0 2px"}}/>
                  {selIds.length === 1 && <>
                    <button onClick={() => moveZ(selIds[0],"up")} style={{...toolBtn, padding:"3px 6px", fontSize:10}}>↑</button>
                    <button onClick={() => moveZ(selIds[0],"down")} style={{...toolBtn, padding:"3px 6px", fontSize:10}}>↓</button>
                  </>}
                  <button onClick={duplicateSelected} style={{...toolBtn, padding:"3px 6px", fontSize:10}}>⎘</button>
                  <button onClick={deleteSelected} style={{...toolBtn, color:"var(--red)", padding:"3px 6px", fontSize:10}}>✕</button>
                </>}
              </div>
              {sortedForList.map(l => {
                const isSel = selIds.includes(l.id);
                return (
                  <div key={l.id} onClick={e => {
                    if (e.shiftKey) setSelIds(isSel ? selIds.filter(x=>x!==l.id) : [...selIds, l.id]);
                    else setSelIds(isSel && selIds.length===1 ? [] : [l.id]);
                    canvasRef.current?.focus();
                  }}
                  style={{padding:"5px 10px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,0.04)",
                    background: isSel ? (inTemplate ? "rgba(103,217,230,0.12)" : "rgba(216,166,75,0.12)") : "transparent",
                    display:"flex", alignItems:"center", gap:6}}>
                    <span style={{fontSize:11, opacity:0.7, width:14, textAlign:"center"}}>{layerIcon(l.type)}</span>
                    <span style={{fontFamily:"var(--font-mono)", fontSize:10,
                      color: isSel ? (inTemplate ? "var(--cyan-bright)" : "var(--gold-bright)") : "var(--ink-2)",
                      flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{l.label||l.id}</span>
                    <span style={{fontFamily:"var(--font-mono)", fontSize:8, color: l._source==="slot" ? "var(--cyan)" : "var(--ink-3)"}}>
                      {l._source === "slot" ? "slot" : "extra"}
                    </span>
                    <span style={{fontFamily:"var(--font-mono)", fontSize:8.5, color:"var(--ink-3)"}}>z{l.z||0}</span>
                  </div>
                );
              })}
              {selIds.length === 1 && sel && (
                <LayerProps layer={sel} scope={scope}
                  onLayerChange={patch => patchLayer(sel.id, patch)}
                  onContentChange={patch => patchContent(sel.id, patch)}
                  onImageUpload={handleImageUpload}
                  onImageClear={handleImageClear}
                />
              )}
              {selIds.length > 1 && (
                <MultiLayerProps
                  layers={selectedLayers}
                  scope={scope}
                  onChange={patch => patchManyLayers(selIds, patch)}
                />
              )}
            </div>
          )}
          {bottomTab === "props" && (
            inTemplate
              ? <TemplateProps deck={draftDeck} onChange={commitDeck} />
              : <CardProps card={draftCard} deck={draftDeck} onChange={commitCard} />
          )}
        </div>

        {/* Right-side icon tab strip (Figma-style) */}
        <div style={{width:44, borderLeft:"1px solid var(--line)", display:"flex", flexDirection:"column",
          background:"rgba(0,0,0,0.25)", flexShrink:0, alignItems:"stretch"}}>
          {[
            { id:"layers", icon:"◰", label:"Layers", color:"var(--gold-bright)" },
            { id:"props",  icon: inTemplate ? "⚙" : "◇",
              label: inTemplate ? "Template" : "Card",
              color: inTemplate ? "var(--cyan-bright)" : "var(--gold-bright)" },
          ].map(t => {
            const active = bottomTab === t.id;
            return (
              <button key={t.id} onClick={() => setBottomTab(t.id)} title={t.label}
                style={{padding:"12px 0", border:"none", cursor:"pointer",
                  background: active ? "var(--bg-panel)" : "transparent",
                  color: active ? t.color : "var(--ink-3)",
                  borderLeft: active ? `2px solid ${t.color}` : "2px solid transparent",
                  display:"flex", flexDirection:"column", alignItems:"center", gap:3,
                  transition:"all 0.15s"}}>
                <span style={{fontSize:18, lineHeight:1}}>{t.icon}</span>
                <span style={{fontFamily:"var(--font-mono)", fontSize:8, letterSpacing:"0.08em", textTransform:"uppercase", opacity: active ? 1 : 0.7}}>
                  {t.label}
                </span>
              </button>
            );
          })}
          {/* Layer count badge underneath */}
          <div style={{marginTop:6, padding:"6px 0", textAlign:"center",
            fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.05em"}}>
            {layers.length}L
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Canvas layer renderer (unchanged) ─────────────────────
function CanvasLayer({ layer: l, scale, isSlot, inTemplate, onMouseDown }) {
  const isArtwork = l.id === "artwork";
  const [cSrc, setCSrc] = React.useState(l.src || "");

  React.useEffect(() => {
    setCSrc(l.src || "");
  }, [l.src]);

  const base = { position:"absolute", left:l.x*scale, top:l.y*scale,
    width:(l.w||50)*scale, height:(l.h||30)*scale, cursor:"move", overflow:"hidden", boxSizing:"border-box" };
  // Subtle dashed outline on slot layers when in template mode
  if (inTemplate && isSlot) base.outline = "1px dashed rgba(103,217,230,0.15)";
  const isTxtTransparent = l.fontColor === "transparent" || l.fontColor === "none" || l.fontColor === "";
  const isStatBgTransparent = l.statBg === "transparent" || l.statBg === "none" || l.statBg === "";
  const isStatTxtTransparent = l.statColor === "transparent" || l.statColor === "none";
  if (l.type === "image") {
    if (!isArtwork && !l.src) return null;
    return (
      <div style={base} onMouseDown={onMouseDown}>
        {cSrc ? (
          <img
            src={cSrc}
            alt=""
            style={{
              width: isArtwork ? "108%" : "100%",
              height: isArtwork ? "108%" : "100%",
              transform: isArtwork ? "scale(1.08)" : "none",
              transformOrigin: "center 42%",
              objectFit: l.fit || "cover",
              display: "block",
              pointerEvents: "none"
            }}
          />
        ) : null}
      </div>
    );
  }
  if (l.type === "text") return (
    <div style={{...base, fontFamily:l.fontFamily||"Inter", fontSize:(l.fontSize||13)*scale,
      fontWeight:l.fontWeight||"400", fontStyle:l.fontItalic?"italic":"normal",
      letterSpacing: l.letterSpacing || "normal",
      textTransform: l.textTransform || "none",
      color: isTxtTransparent ? "transparent" : (l.fontColor||"#fff"),
      textAlign:l.align||"left",
      whiteSpace:l.wrap?"normal":"nowrap", lineHeight:1.35}} onMouseDown={onMouseDown}>
      {l.value||""}
    </div>
  );
  if (l.type === "stat") {
    const sz = (l.w||52)*scale;
    return (
      <div style={{...base, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}} onMouseDown={onMouseDown}>
        <div style={{width:sz, height:sz,
          borderRadius: l.statShape==="circle" ? "50%" : l.statShape==="rounded" ? "4px" : "0",
          background: isStatBgTransparent ? "transparent" : (l.statBg||"#1a7a90"),
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          boxShadow: isStatBgTransparent ? "none" : `0 0 ${6*scale}px rgba(0,0,0,0.5)`, pointerEvents:"none"}}>
          <span style={{
            color: isStatTxtTransparent ? "transparent" : (l.statColor||"#fff"),
            fontFamily: l.statFontFamily || "var(--font-display)",
            fontWeight: l.statFontWeight || 700,
            letterSpacing: l.statLetterSpacing || "normal",
            fontSize:(l.statSize||20)*scale, lineHeight:1}}>{l.statValue??0}</span>
          {l.statLabel && <span style={{
            color: isStatTxtTransparent ? "transparent" : (l.statColor||"#fff"),
            fontFamily:"var(--font-mono)",
            fontSize:7*scale, opacity:0.8, letterSpacing:"0.1em"}}>{l.statLabel}</span>}
        </div>
      </div>
    );
  }
  return null;
}

// ── Card-level properties (Card tab) ─────────────────────
function CardProps({ card, deck, onChange }) {
  function set(k, v) { onChange({ ...card, [k]: v }); }
  const rules = deck?.rules || {};
  const elements = rules.elements || ["fire","water","earth","air","void","light","dark","neutral"];
  const factions = rules.factions || [];
  const keywords = rules.keywords || [];
  const types = rules.cardTypes || ["Creature","Spell"];
  const rarities = rules.rarities || Templates.defaultRarities();
  const locale = deck?.locale || "en";

  const abilityText = card.ability || card.content?.ability || "";
  const colonIdx = abilityText.indexOf(":");
  const hasPrefix = colonIdx > 0 && colonIdx < 20;
  const [kw, setKw] = React.useState(hasPrefix ? abilityText.slice(0, colonIdx) : "");
  const [sfx, setSfx] = React.useState(hasPrefix ? abilityText.slice(colonIdx+1).trim() : abilityText);
  React.useEffect(() => {
    const t = card.ability || card.content?.ability || "";
    const ci = t.indexOf(":"); const hp = ci > 0 && ci < 20;
    setKw(hp ? t.slice(0,ci) : ""); setSfx(hp ? t.slice(ci+1).trim() : t);
  }, [card.id]);
  function updateAbility(k, s) {
    const combined = k ? `${k}: ${s}` : s;
    const nc = { ...card, ability: combined, content: { ...card.content, ability: combined } };
    onChange(nc);
  }

  const [kwInput, setKwInput] = React.useState("");
  const tags = card.tags || card.keywords || [];
  function addTag(k) {
    if (!k || tags.includes(k)) return;
    onChange({ ...card, tags: [...tags, k], keywords: [...tags, k] });
  }
  function removeTag(k) {
    const next = tags.filter(x => x !== k);
    onChange({ ...card, tags: next, keywords: next });
  }

  return (
    <div style={{padding:"10px 14px", display:"flex", flexDirection:"column", gap:10}}>
      <Divider label="Identity"/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <Row label="Type">
          <select value={card.type||"Creature"} onChange={e => onChange({...card, type:e.target.value, content:{...card.content, typeLine:e.target.value}})} style={inputSt}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Row>
        <Row label="Rarity">
          <select value={card.rarity||"common"} onChange={e => set("rarity", e.target.value)} style={inputSt}>
            {rarities.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </Row>
      </div>
      <Row label="Name">
        <EInput value={card.name||""} onChange={v => onChange({...card, name:v, content:{...card.content, name:v}})}/>
      </Row>

      <Divider label="Gameplay"/>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <Row label="Cost"><NumInput value={card.cost??card.gameplay?.cost??0} min={0} max={20}
          onChange={v => onChange({...card, cost:v, gameplay:{...card.gameplay, cost:v}})}/></Row>
        <Row label="Health"><NumInput value={card.health??card.gameplay?.health??card.defense??0} min={0} max={99}
          onChange={v => onChange({...card, health:v, gameplay:{...card.gameplay, health:v}})}/></Row>
        <Row label="Element">
          <select value={card.element||card.gameplay?.element||"neutral"}
            onChange={e => onChange({...card, element:e.target.value, gameplay:{...card.gameplay, element:e.target.value}})} style={inputSt}>
            {elements.map(el => <option key={el} value={el}>{el}</option>)}
          </select>
        </Row>
        <Row label="Faction">
          {factions.length > 0 ? (
            <select value={card.faction||card.gameplay?.faction||""}
              onChange={e => onChange({...card, faction:e.target.value, gameplay:{...card.gameplay, faction:e.target.value}})} style={inputSt}>
              <option value="">—</option>
              {factions.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          ) : (
            <EInput value={card.faction||""}
              onChange={v => onChange({...card, faction:v, gameplay:{...card.gameplay, faction:v}})}/>
          )}
        </Row>
      </div>
      <div style={{fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--ink-3)", lineHeight:1.5}}>
        Attack / Defense → click ATK / DEF on the canvas.
      </div>

      <Divider label="Ability"/>
      <Row label="Keyword">
        <div style={{display:"flex", gap:6}}>
          {keywords.length > 0 ? (
            <select value={kw} onChange={e => { setKw(e.target.value); updateAbility(e.target.value, sfx); }} style={{...inputSt, flex:1}}>
              <option value="">— none —</option>
              {keywords.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          ) : (
            <EInput value={kw} onChange={v => { setKw(v); updateAbility(v, sfx); }}/>
          )}
          {kw && <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--cyan-bright)", alignSelf:"center", flexShrink:0}}>{kw}:</span>}
        </div>
      </Row>
      <Row label="Effect">
        <textarea value={sfx} onChange={e => { setSfx(e.target.value); updateAbility(kw, e.target.value); }}
          rows={3} style={{...inputSt, resize:"vertical", lineHeight:1.4}}/>
      </Row>
      <Row label="Flavor">
        <textarea value={card.flavor||card.content?.flavor||""}
          onChange={e => onChange({...card, flavor:e.target.value, content:{...card.content, flavor:e.target.value}})}
          rows={2} style={{...inputSt, resize:"vertical", lineHeight:1.4}}/>
      </Row>

      <Divider label="Tags"/>
      <div style={{display:"flex", flexWrap:"wrap", gap:4}}>
        {tags.map(k => (
          <span key={k} style={{display:"inline-flex", alignItems:"center", gap:4,
            background:"rgba(103,217,230,0.1)", border:"1px solid var(--cyan)",
            borderRadius:10, padding:"2px 4px 2px 8px", fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--cyan-bright)"}}>
            {k}<button onClick={() => removeTag(k)} style={{border:"none", background:"transparent", color:"var(--ink-3)", cursor:"pointer", fontSize:11, padding:"0 2px"}}>×</button>
          </span>
        ))}
      </div>
      {keywords.length > 0 ? (
        <div style={{display:"flex", gap:6}}>
          <select value={kwInput} onChange={e => setKwInput(e.target.value)} style={{...inputSt, flex:1}}>
            <option value="">＋ add tag</option>
            {keywords.filter(k => !tags.includes(k)).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={() => { addTag(kwInput); setKwInput(""); }} style={toolBtn} disabled={!kwInput}>Add</button>
        </div>
      ) : (
        <div style={{display:"flex", gap:6}}>
          <input value={kwInput} onChange={e => setKwInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { addTag(kwInput); setKwInput(""); } }}
            placeholder="Type tag, Enter" style={{...inputSt, flex:1}}/>
          <button onClick={() => { addTag(kwInput); setKwInput(""); }} style={toolBtn}>Add</button>
        </div>
      )}

      <Divider label="Metadata"/>
      <Row label="Artist"><EInput value={card.artist||card.metadata?.artist||""}
        onChange={v => onChange({...card, artist:v, metadata:{...card.metadata, artist:v}})}/></Row>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <Row label="Set"><EInput value={card.set||card.metadata?.set||""}
          onChange={v => onChange({...card, set:v, metadata:{...card.metadata, set:v}})}/></Row>
        <Row label="Collector #"><NumInput value={card.collectorNumber??card.metadata?.collectorNumber??0} min={0} max={9999}
          onChange={v => onChange({...card, collectorNumber:v, metadata:{...card.metadata, collectorNumber:v}})}/></Row>
      </div>
      <Row label="Serial"><EInput value={card.serial||card.metadata?.serial||""}
        onChange={v => onChange({...card, serial:v, metadata:{...card.metadata, serial:v}})}/></Row>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <Row label="Locale"><div style={{...inputSt, background:"rgba(0,0,0,0.15)", color:"var(--ink-3)"}}>{locale}</div></Row>
        <Row label="Template"><div style={{...inputSt, background:"rgba(0,0,0,0.15)", color:"var(--ink-3)"}}>{deck?.template?.id||"tcg_v1"}</div></Row>
      </div>
    </div>
  );
}

// ── Template-level properties (Template tab) ──────────────
function ListEditor({ label, items, onItems }) {
  const [val, setVal] = React.useState("");
  return (
    <div>
      <div style={{fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4}}>{label}</div>
      <div style={{display:"flex", flexWrap:"wrap", gap:4, marginBottom:6}}>
        {items.map(it => (
          <span key={it} style={{display:"inline-flex", alignItems:"center", gap:4,
            background:"rgba(103,217,230,0.1)", border:"1px solid var(--cyan)",
            borderRadius:10, padding:"2px 4px 2px 8px", fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--cyan-bright)"}}>
            {it}<button onClick={() => onItems(items.filter(x => x !== it))} style={{border:"none", background:"transparent", color:"var(--ink-3)", cursor:"pointer", fontSize:11, padding:"0 2px"}}>×</button>
          </span>
        ))}
      </div>
      <div style={{display:"flex", gap:6}}>
        <input value={val} onChange={e=>setVal(e.target.value)}
          onKeyDown={e=>{if(e.key==="Enter"){if(val&&!items.includes(val)){onItems([...items,val]);setVal("");}}}}
          placeholder="Type, Enter" style={{...inputSt, flex:1}}/>
        <button onClick={() => { if (val && !items.includes(val)) { onItems([...items, val]); setVal(""); } }} style={toolBtn}>Add</button>
      </div>
    </div>
  );
}

function TemplateProps({ deck, onChange }) {
  if (!deck) return <div style={{padding:20, color:"var(--ink-3)"}}>No active deck.</div>;
  const tpl = deck.template;
  const rules = deck.rules || {};
  const rarities = rules.rarities || [];

  function setTemplate(patch) {
    onChange({ ...deck, template: { ...tpl, ...patch } });
  }
  function setRules(patch) {
    onChange({ ...deck, rules: { ...rules, ...patch } });
  }
  function setRarity(idx, patch) {
    const next = rarities.map((r,i) => i === idx ? { ...r, ...patch } : r);
    setRules({ rarities: next });
  }
  function addRarity() {
    const id = "tier_" + Math.random().toString(36).slice(2,5);
    setRules({ rarities: [...rarities, { id, label:"New Tier", color:"#888888" }] });
  }
  function removeRarity(idx) {
    setRules({ rarities: rarities.filter((_,i) => i !== idx) });
  }
  function moveRarity(idx, dir) {
    const j = idx + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= rarities.length) return;
    const next = [...rarities];
    [next[idx], next[j]] = [next[j], next[idx]];
    setRules({ rarities: next });
  }

  function handleTplImageUpload(field, e) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    setTemplate({ [field]: url, ["_"+field+"File"]: file });
    e.target.value = "";
  }

  return (
    <div style={{padding:"10px 14px", display:"flex", flexDirection:"column", gap:12}}>
      <div style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--cyan-bright)", letterSpacing:"0.1em",
        background:"rgba(103,217,230,0.06)", border:"1px solid var(--cyan)", borderRadius:4, padding:"6px 8px"}}>
        ⚠ Edits here apply to the whole deck. Per-card edits live in the Card tab.
      </div>

      <Divider label="Deck identity"/>
      <Row label="Deck name">
        <EInput value={deck.name||""} onChange={v => onChange({...deck, name:v})}/>
      </Row>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <Row label="Deck ID"><EInput value={deck.id||""} onChange={v => onChange({...deck, id:v})}/></Row>
        <Row label="Locale"><EInput value={deck.locale||"en"} onChange={v => onChange({...deck, locale:v})}/></Row>
      </div>

      <Divider label="Frame & backgrounds"/>
      <TplImageRow label="Front frame" url={tpl.frontBg}
        onUpload={e=>handleTplImageUpload("frontBg",e)} onClear={()=>setTemplate({frontBg:"", _frontBgFile:undefined})}/>
      <TplImageRow label="Back image" url={tpl.backBg}
        onUpload={e=>handleTplImageUpload("backBg",e)} onClear={()=>setTemplate({backBg:"", _backBgFile:undefined})}/>

      <Divider label="Rarity scale"/>
      <div style={{fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--ink-3)", lineHeight:1.5}}>
        Customize rank names &amp; colors. Top = lowest rank.
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:6}}>
        {rarities.map((r, i) => (
          <div key={r.id+i} style={{display:"flex", gap:6, alignItems:"center"}}>
            <input type="color" value={r.color||"#888"} onChange={e=>setRarity(i,{color:e.target.value})}
              style={{width:30, height:26, border:"none", borderRadius:3, background:"none", padding:0, cursor:"pointer"}}/>
            <input value={r.id} onChange={e=>setRarity(i,{id:e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"_")})}
              style={{...inputSt, width:90, fontSize:10}} placeholder="id"/>
            <input value={r.label} onChange={e=>setRarity(i,{label:e.target.value})}
              style={{...inputSt, flex:1, fontSize:11}} placeholder="Label"/>
            <button onClick={()=>moveRarity(i,"up")} style={{...toolBtn, padding:"3px 6px"}} disabled={i===0}>↑</button>
            <button onClick={()=>moveRarity(i,"down")} style={{...toolBtn, padding:"3px 6px"}} disabled={i===rarities.length-1}>↓</button>
            <button onClick={()=>removeRarity(i)} style={{...toolBtn, padding:"3px 6px", color:"var(--red)"}}>✕</button>
          </div>
        ))}
        <button onClick={addRarity} style={{...toolBtn, alignSelf:"flex-start"}}>＋ Add tier</button>
      </div>

      <Divider label="Rules"/>
      <ListEditor label="Card types" items={rules.cardTypes||[]} onItems={v=>setRules({cardTypes:v})}/>
      <ListEditor label="Elements" items={rules.elements||[]} onItems={v=>setRules({elements:v})}/>
      <ListEditor label="Factions" items={rules.factions||[]} onItems={v=>setRules({factions:v})}/>
      <ListEditor label="Keywords" items={rules.keywords||[]} onItems={v=>setRules({keywords:v})}/>

      <Divider label="Stat ranges"/>
      {["cost","attack","defense","health"].map(k => {
        const s = rules.stats?.[k] || {min:0, max:99};
        return (
          <div key={k} style={{display:"flex", gap:6, alignItems:"center"}}>
            <span style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-3)", width:60, textTransform:"uppercase"}}>{k}</span>
            <NumInput value={s.min} min={0} max={99}
              onChange={v=>setRules({stats:{...rules.stats, [k]:{...s, min:v}}})}/>
            <span style={{color:"var(--ink-3)"}}>→</span>
            <NumInput value={s.max} min={0} max={99}
              onChange={v=>setRules({stats:{...rules.stats, [k]:{...s, max:v}}})}/>
          </div>
        );
      })}

      <Divider label="Slots"/>
      <div style={{fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--ink-3)", lineHeight:1.5}}>
        Click any slot on the canvas (above) to position it. Use the layer toolbar (＋ Text / Image / Stat) to add new slots — they'll apply to every card in this deck.
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:2}}>
        {(tpl.front?.slots||[]).map(s => (
          <div key={"f-"+s.id} style={{display:"flex", justifyContent:"space-between", padding:"4px 8px",
            background:"rgba(0,0,0,0.15)", borderRadius:3, fontFamily:"var(--font-mono)", fontSize:10}}>
            <span style={{color:"var(--ink-2)"}}>{layerIcon(s.type)} {s.id}</span>
            <span style={{color:"var(--ink-3)"}}>front · {s.w}×{s.h}</span>
          </div>
        ))}
        {(tpl.back?.slots||[]).map(s => (
          <div key={"b-"+s.id} style={{display:"flex", justifyContent:"space-between", padding:"4px 8px",
            background:"rgba(0,0,0,0.15)", borderRadius:3, fontFamily:"var(--font-mono)", fontSize:10}}>
            <span style={{color:"var(--ink-2)"}}>{layerIcon(s.type)} {s.id}</span>
            <span style={{color:"var(--ink-3)"}}>back · {s.w}×{s.h}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TplImageRow({ label, url, onUpload, onClear }) {
  const ref = React.useRef();
  return (
    <div style={{display:"flex", gap:10, alignItems:"center"}}>
      <div style={{width:60, fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase"}}>{label}</div>
      {url ? <img src={url} alt="" style={{width:50, height:70, objectFit:"cover", borderRadius:3, border:"1px solid var(--line)"}}/>
        : <div style={{width:50, height:70, border:"1px dashed var(--line-strong)", borderRadius:3, display:"grid", placeItems:"center", color:"var(--ink-3)", fontSize:18}}>＋</div>}
      <div style={{display:"flex", flexDirection:"column", gap:4}}>
        <label style={{...toolBtn, cursor:"pointer", display:"inline-block"}}>
          Upload<input ref={ref} type="file" accept="image/*" onChange={onUpload} style={{display:"none"}}/>
        </label>
        {url && <button onClick={onClear} style={{...toolBtn, color:"var(--red)"}}>Clear</button>}
      </div>
    </div>
  );
}

// ── Layer properties (per-layer styling/content) ─────────
function LayerProps({ layer: l, scope, onLayerChange, onContentChange, onImageUpload, onImageClear }) {
  // In card scope: styling edits go to overrides (via onLayerChange).
  //                content edits (text value, image src, stat value) go to content (via onContentChange).
  // In template scope: all edits go through onLayerChange (which routes to template slot in CardEditor).
  // For slot layers in card scope: text value & image src edits go to onContentChange.
  // For extra layers: everything goes to onLayerChange.
  function patchStyle(patch) { onLayerChange(patch); }
  function patchValue(patch) {
    if (l._source === "extra" || scope === "template") onLayerChange(patch);
    else onContentChange(patch);
  }
  const imgRef = React.useRef();
  return (
    <div>
      <div style={{padding:"8px 14px", borderBottom:"1px solid var(--line)", fontFamily:"var(--font-mono)", fontSize:9.5,
        color:"var(--ink-3)", letterSpacing:"0.1em", textTransform:"uppercase", background:"rgba(0,0,0,0.15)"}}>
        {layerIcon(l.type)} {l.type} · {l.label||l.id}
        <span style={{float:"right", color: l._source==="slot" ? "var(--cyan)" : "var(--ink-3)"}}>
          {l._source === "slot" ? "slot" : "extra"} · {scope}
        </span>
      </div>
      <div style={{padding:"12px 14px", display:"flex", flexDirection:"column", gap:10}}>
        <Divider label="Position &amp; Size"/>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
          <Row label="X"><NumInput value={l.x} min={0} max={_CARD_W} onChange={v=>patchStyle({x:v})}/></Row>
          <Row label="Y"><NumInput value={l.y} min={0} max={_CARD_H} onChange={v=>patchStyle({y:v})}/></Row>
          <Row label="W"><NumInput value={l.w} min={10} max={_CARD_W} onChange={v=>patchStyle({w:v})}/></Row>
          <Row label="H"><NumInput value={l.h} min={8} max={_CARD_H} onChange={v=>patchStyle({h:v})}/></Row>
        </div>
        <Row label="Z-index"><NumInput value={l.z} min={0} max={99} onChange={v=>patchStyle({z:v})}/></Row>
        {l.type === "text" && <>
          <Divider label="Text"/>
          <textarea value={l.value||""} onChange={e=>patchValue({value:e.target.value})}
            rows={3} style={{...inputSt, resize:"vertical", lineHeight:1.4}}/>
          <Divider label="Typography"/>
          <TypographyPicker
            currentFamily={l.fontFamily}
            currentWeight={l.fontWeight}
            sample={(l.value || "Aa").slice(0, 12) || "Aa"}
            onApply={p => patchStyle(applyTypoPreset(p))}
          />
          <Divider label="Size &amp; color"/>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <Row label="Size"><NumInput value={l.fontSize} min={6} max={72} onChange={v=>patchStyle({fontSize:v})}/></Row>
            <Row label="Style"><ToggleBtn active={l.fontItalic} onToggle={()=>patchStyle({fontItalic:!l.fontItalic})} label="italic"/></Row>
          </div>
          <Row label="Color"><ColorInput value={l.fontColor||"#ffffff"} onChange={v=>patchStyle({fontColor:v})}/></Row>
          <Row label="Align">
            <div style={{display:"flex", gap:4}}>
              {["left","center","right"].map(a => <ToggleBtn key={a} active={l.align===a} onToggle={()=>patchStyle({align:a})} label={a}/>)}
            </div>
          </Row>
          <Row label="Wrap"><ToggleBtn active={l.wrap} onToggle={()=>patchStyle({wrap:!l.wrap})} label="wrap text"/></Row>
          <details style={{marginTop:4}}>
            <summary style={{fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer"}}>Advanced font</summary>
            <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:6}}>
              <Row label="Family">
                <input type="text" value={l.fontFamily||""} onChange={e=>patchStyle({fontFamily:e.target.value})} style={inputSt}/>
              </Row>
              <Row label="Weight">
                <select value={l.fontWeight||"400"} onChange={e=>patchStyle({fontWeight:e.target.value})} style={inputSt}>
                  {["300","400","500","600","700","800","900","bold"].map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </Row>
            </div>
          </details>
        </>}
        {l.type === "image" && <>
          <Divider label="Image"/>
          <div style={{display:"flex", gap:10, alignItems:"center"}}>
            {l.src ? <img src={l.src} alt="" style={{width:72, height:72, objectFit:"cover", borderRadius:4, border:"1px solid var(--line)"}}/>
              : <div style={{width:72, height:72, border:"1px dashed var(--line-strong)", borderRadius:4, display:"grid", placeItems:"center", color:"var(--ink-3)", fontSize:22}}>＋</div>}
            <div style={{display:"flex", flexDirection:"column", gap:6}}>
              <label style={{...toolBtn, cursor:"pointer", display:"inline-block"}}>
                Upload<input ref={imgRef} type="file" accept="image/*" onChange={e=>onImageUpload(e,l.id)} style={{display:"none"}}/>
              </label>
              {l.src && <button onClick={() => onImageClear && onImageClear(l.id)} style={{...toolBtn, color:"var(--red)"}}>Clear</button>}
            </div>
          </div>
          <Row label="Fit">
            <select value={l.fit||"cover"} onChange={e=>patchStyle({fit:e.target.value})} style={inputSt}>
              {["cover","contain","fill","none"].map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
        </>}
        {l.type === "stat" && <>
          <Divider label="Stat"/>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <Row label="Label"><EInput value={l.statLabel||""} onChange={v=>patchStyle({statLabel:v})}/></Row>
            <Row label="Value"><NumInput value={l.statValue} min={-99} max={99} onChange={v=>patchValue({statValue:v})}/></Row>
          </div>
          <Row label="Shape">
            <select value={l.statShape||"circle"} onChange={e=>patchStyle({statShape:e.target.value})} style={inputSt}>
              {["circle","rounded","square"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
          <Divider label="Number typography"/>
          <TypographyPicker
            currentFamily={l.statFontFamily}
            currentWeight={l.statFontWeight}
            sample={String(l.statValue ?? 12)}
            isStat={true}
            onApply={p => patchStyle(applyStatTypoPreset(p))}
          />
          <Divider label="Number color &amp; size"/>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
            <Row label="BG"><ColorInput value={l.statBg||"#1a7a90"} onChange={v=>patchStyle({statBg:v})}/></Row>
            <Row label="Text"><ColorInput value={l.statColor||"#ffffff"} onChange={v=>patchStyle({statColor:v})}/></Row>
          </div>
          <Row label="Font size"><NumInput value={l.statSize||20} min={8} max={48} onChange={v=>patchStyle({statSize:v})}/></Row>
        </>}
      </div>
    </div>
  );
}

// ── Multi-select layer properties ────────────────────────────
// Renders editable fields shared by all selected layers.
// Position/size always editable. Type-specific fields appear only
// if every selected layer has the same type.
function MultiLayerProps({ layers, scope, onChange }) {
  if (!layers || layers.length < 2) return null;

  // Compute shared/mixed values
  function shared(field) {
    const first = layers[0][field];
    const same = layers.every(l => l[field] === first);
    return same ? first : null;          // null sentinel = mixed
  }
  function isMixed(field) {
    const first = layers[0][field];
    return !layers.every(l => l[field] === first);
  }

  const allText = layers.every(l => l.type === "text");
  const allImage = layers.every(l => l.type === "image");
  const allStat = layers.every(l => l.type === "stat");
  const typeLabel = allText ? "text" : allImage ? "image" : allStat ? "stat" : "mixed types";

  return (
    <div>
      <div style={{padding:"8px 12px", borderBottom:"1px solid var(--line)", background:"rgba(103,217,230,0.06)",
        display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <span style={{fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--cyan-bright)", letterSpacing:"0.1em", textTransform:"uppercase"}}>
          {layers.length} layers · {typeLabel}
        </span>
        <span style={{fontFamily:"var(--font-mono)", fontSize:8, color:"var(--ink-3)"}}>{scope}</span>
      </div>
      <div style={{padding:"10px 12px 14px", display:"flex", flexDirection:"column", gap:9}}>
        {/* Selected layers list (read-only summary) */}
        <div style={{display:"flex", flexDirection:"column", gap:2, marginBottom:4}}>
          {layers.map(l => (
            <div key={l.id} style={{display:"flex", justifyContent:"space-between", padding:"2px 6px",
              background:"rgba(0,0,0,0.18)", borderRadius:2, fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--ink-3)"}}>
              <span>{layerIcon(l.type)} {l.label || l.id}</span>
              <span style={{opacity:0.6}}>{l.w}×{l.h}</span>
            </div>
          ))}
        </div>

        <MultiDivider label="Position &amp; size"/>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
          <MultiNumRow label="X" mixed={isMixed("x")} value={shared("x") ?? 0} min={0} max={400}
            onChange={v => onChange({ x: v })}/>
          <MultiNumRow label="Y" mixed={isMixed("y")} value={shared("y") ?? 0} min={0} max={560}
            onChange={v => onChange({ y: v })}/>
          <MultiNumRow label="W" mixed={isMixed("w")} value={shared("w") ?? 50} min={10} max={400}
            onChange={v => onChange({ w: v })}/>
          <MultiNumRow label="H" mixed={isMixed("h")} value={shared("h") ?? 30} min={8} max={560}
            onChange={v => onChange({ h: v })}/>
        </div>
        <MultiNumRow label="Z-index" mixed={isMixed("z")} value={shared("z") ?? 0} min={0} max={99}
          onChange={v => onChange({ z: v })}/>

        {/* Quick-align buttons (always available) */}
        <MultiDivider label="Align"/>
        <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
          <button style={toolBtn} onClick={() => {
            const x = Math.min(...layers.map(l => l.x));
            onChange({ x });
          }}>← left</button>
          <button style={toolBtn} onClick={() => {
            const cx = layers.reduce((s,l) => s + l.x + (l.w||50)/2, 0) / layers.length;
            // Each layer keeps its own width but new x = cx - w/2 (applied per-layer via onChange? this only supports uniform patch)
            // Fall back to center on common x value
            onChange({ x: Math.round(cx - (shared("w") ?? 50)/2) });
          }} title="Center horizontally (using shared width)">↔ center</button>
          <button style={toolBtn} onClick={() => {
            const r = Math.max(...layers.map(l => l.x + (l.w||50)));
            onChange({ x: r - (shared("w") ?? 50) });
          }}>right →</button>
          <button style={toolBtn} onClick={() => {
            const y = Math.min(...layers.map(l => l.y));
            onChange({ y });
          }}>↑ top</button>
          <button style={toolBtn} onClick={() => {
            const b = Math.max(...layers.map(l => l.y + (l.h||30)));
            onChange({ y: b - (shared("h") ?? 30) });
          }}>bottom ↓</button>
        </div>

        {allText && <>
          <MultiDivider label="Typography (text)"/>
          <TypographyPicker
            currentFamily={shared("fontFamily")}
            currentWeight={shared("fontWeight")}
            sample="Aa"
            onApply={p => onChange(applyTypoPreset(p))}
          />
          <MultiDivider label="Size &amp; style"/>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
            <MultiNumRow label="Size" mixed={isMixed("fontSize")} value={shared("fontSize") ?? 13} min={6} max={72}
              onChange={v => onChange({ fontSize: v })}/>
            <Row label="Italic">
              <ToggleBtn active={shared("fontItalic") === true}
                onToggle={() => onChange({ fontItalic: !(shared("fontItalic") === true) })}
                label={isMixed("fontItalic") ? "Mixed" : (shared("fontItalic") ? "italic" : "italic")}/>
            </Row>
          </div>
          <Row label="Color">
            <ColorInput value={shared("fontColor") ?? ""} onChange={v => onChange({ fontColor: v })}/>
          </Row>
          <Row label="Align">
            <div style={{display:"flex", gap:4}}>
              {["left","center","right"].map(a =>
                <ToggleBtn key={a}
                  active={shared("align") === a}
                  onToggle={() => onChange({ align: a })} label={a}/>
              )}
            </div>
          </Row>
        </>}

        {allStat && <>
          <MultiDivider label="Number typography"/>
          <TypographyPicker
            currentFamily={shared("statFontFamily")}
            currentWeight={shared("statFontWeight")}
            sample={String(shared("statValue") ?? 12)}
            isStat={true}
            onApply={p => onChange(applyStatTypoPreset(p))}
          />
          <MultiDivider label="Style"/>
          <Row label="Shape">
            <select value={shared("statShape") || "circle"} onChange={e => onChange({ statShape: e.target.value })} style={inputSt}>
              {["circle","rounded","square"].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:6}}>
            <Row label="BG"><ColorInput value={shared("statBg") ?? ""} onChange={v => onChange({ statBg: v })}/></Row>
            <Row label="Text"><ColorInput value={shared("statColor") ?? ""} onChange={v => onChange({ statColor: v })}/></Row>
          </div>
          <MultiNumRow label="Font size" mixed={isMixed("statSize")} value={shared("statSize") ?? 20} min={8} max={48}
            onChange={v => onChange({ statSize: v })}/>
        </>}

        {allImage && <>
          <MultiDivider label="Image"/>
          <Row label="Fit">
            <select value={shared("fit") || "cover"} onChange={e => onChange({ fit: e.target.value })} style={inputSt}>
              {["cover","contain","fill","none"].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
        </>}
      </div>
    </div>
  );
}

function MultiDivider({label}) {
  return <div style={{fontFamily:"var(--font-mono)", fontSize:9, color:"var(--cyan-bright)", letterSpacing:"0.1em",
    textTransform:"uppercase", paddingTop:4, paddingBottom:2, borderTop:"1px solid var(--line)", marginTop:1}}>{label}</div>;
}
function MultiNumRow({label, mixed, value, min, max, onChange}) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:2}}>
      <span style={{fontFamily:"var(--font-mono)", fontSize:9, color: mixed ? "var(--magenta)" : "var(--ink-3)",
        letterSpacing:"0.08em", textTransform:"uppercase"}}>
        {label}{mixed ? " · mixed" : ""}
      </span>
      <input type="number" value={mixed ? "" : (value??0)} min={min} max={max}
        placeholder={mixed ? "—" : ""}
        onChange={e => onChange(+e.target.value)}
        style={{...inputSt, width:"100%"}}/>
    </div>
  );
}

// ── UI atoms ────────────────────────────────────────────
const inputSt = {background:"rgba(0,0,0,0.4)",border:"1px solid var(--line-strong)",color:"var(--ink)",
  padding:"5px 8px",borderRadius:4,fontFamily:"var(--font-mono)",fontSize:11.5,width:"100%",boxSizing:"border-box"};
const toolBtn = {padding:"5px 9px",background:"rgba(255,255,255,0.06)",border:"1px solid var(--line-strong)",
  borderRadius:4,color:"var(--ink-2)",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:10.5,letterSpacing:"0.03em"};
const faceBtnStyle = {padding:"5px 11px",border:"none",cursor:"pointer",fontFamily:"var(--font-mono)",
  fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",borderRadius:3,transition:"all 0.15s"};
const closeBtn = {padding:"4px 8px",border:"1px solid var(--line-strong)",borderRadius:4,
  background:"transparent",color:"var(--ink-3)",cursor:"pointer",fontSize:12};
const miniSelect = {...inputSt, width:120, padding:"4px 6px"};
function Row({label,children}){return(<div style={{display:"flex",flexDirection:"column",gap:3}}><span style={{fontFamily:"var(--font-mono)",fontSize:9,color:"var(--ink-3)",letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</span>{children}</div>);}
function Divider({label}){return(<div style={{fontFamily:"var(--font-mono)",fontSize:9,color:"var(--cyan-bright)",letterSpacing:"0.1em",textTransform:"uppercase",paddingTop:6,paddingBottom:2,borderTop:"1px solid var(--line)",marginTop:2}}>{label}</div>);}
function EInput({value,onChange}){return <input type="text" value={value||""} onChange={e=>onChange(e.target.value)} style={inputSt}/>;}
function NumInput({value,min,max,onChange}){return(<div style={{display:"flex",alignItems:"center",gap:6}}><input type="number" value={value??0} min={min} max={max} onChange={e=>onChange(+e.target.value)} style={{...inputSt,width:64}}/><input type="range" value={value??0} min={min} max={max} onChange={e=>onChange(+e.target.value)} style={{flex:1,accentColor:"var(--gold-bright)"}}/></div>);}
function ColorInput({value,onChange}){
  const isTransparent = value === "transparent" || value === "none" || value === "";
  return (
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <input type="color" value={isTransparent ? "#ffffff" : (value||"#ffffff")}
        onChange={e=>onChange(e.target.value)}
        style={{width:32,height:28,border:"none",borderRadius:3,cursor:"pointer",background:"none",padding:0,
          opacity: isTransparent ? 0.4 : 1}}/>
      <button onClick={()=>onChange(isTransparent ? "#ffffff" : "transparent")}
        title={isTransparent ? "Set a color" : "Make transparent"}
        style={{...toolBtn, padding:"4px 6px", fontSize:9,
          background: isTransparent ? "var(--bg-panel-2)" : "transparent",
          color: isTransparent ? "var(--gold-bright)" : "var(--ink-3)",
          border: `1px solid ${isTransparent ? "var(--gold)" : "var(--line-strong)"}`,
          backgroundImage: isTransparent ? "linear-gradient(45deg, #555 25%, transparent 25%, transparent 75%, #555 75%), linear-gradient(45deg, #555 25%, transparent 25%, transparent 75%, #555 75%)" : undefined,
          backgroundSize: isTransparent ? "6px 6px" : undefined,
          backgroundPosition: isTransparent ? "0 0, 3px 3px" : undefined,
        }}>∅</button>
      <input type="text" value={value||""} onChange={e=>onChange(e.target.value)}
        placeholder={isTransparent ? "transparent" : ""}
        style={{...inputSt,flex:1, color: isTransparent ? "var(--ink-3)" : "var(--ink)", fontStyle: isTransparent ? "italic" : "normal"}}/>
    </div>
  );
}
function ToggleBtn({active,onToggle,label}){return(<button onClick={onToggle} style={{...toolBtn,background:active?"var(--bg-panel-2)":"transparent",color:active?"var(--gold-bright)":"var(--ink-3)",border:`1px solid ${active?"var(--gold)":"var(--line-strong)"}`}}>{label}</button>);}
function layerIcon(type){return type==="image"?"🖼":type==="stat"?"⬡":"T";}

// ── Typography preset picker grid ────────────────────────────
// Renders a scrollable grid of preset tiles. Each tile shows the
// preset's rendered preview text. Clicking applies it (via onApply).
// `currentFamily` shows which preset is active.
function TypographyPicker({ currentFamily, currentWeight, onApply, sample, isStat, presets }) {
  const [openCat, setOpenCat] = React.useState("all");
  const cats = [
    { id:"all",       label:"All" },
    { id:"fantasy",   label:"Fantasy" },
    { id:"classical", label:"Classical" },
    { id:"tech",      label:"Sci-Fi" },
    { id:"modern",    label:"Modern" },
    { id:"retro",     label:"Retro" },
  ];
  const list = (presets || _TYPO_PRESETS).filter(p => openCat === "all" || p.category === openCat);

  function isActive(p) {
    return currentFamily === p.fontFamily &&
      (currentWeight === undefined || String(currentWeight) === String(p.fontWeight));
  }

  return (
    <div style={{display:"flex", flexDirection:"column", gap:6}}>
      <div style={{display:"flex", gap:3, flexWrap:"wrap"}}>
        {cats.map(c => (
          <button key={c.id} onClick={() => setOpenCat(c.id)}
            style={{...toolBtn, padding:"3px 7px", fontSize:9,
              background: openCat === c.id ? "var(--bg-panel-2)" : "transparent",
              color: openCat === c.id ? "var(--gold-bright)" : "var(--ink-3)",
              border: `1px solid ${openCat === c.id ? "var(--gold)" : "var(--line-strong)"}`}}>
            {c.label}
          </button>
        ))}
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:4}}>
        {list.map(p => {
          const active = isActive(p);
          return (
            <button key={p.id} onClick={() => onApply(p)}
              title={`${p.fontFamily} ${p.fontWeight}`}
              style={{
                background: active ? "rgba(216,166,75,0.12)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${active ? "var(--gold)" : "var(--line-strong)"}`,
                borderRadius: 4,
                padding: "8px 6px 6px",
                cursor: "pointer",
                display:"flex", flexDirection:"column", gap:3,
                textAlign:"left", overflow:"hidden",
              }}>
              <div style={{
                fontFamily: p.fontFamily,
                fontWeight: p.fontWeight,
                letterSpacing: p.letterSpacing,
                textTransform: p.textTransform,
                fontStyle: p.fontItalic ? "italic" : "normal",
                color: active ? "var(--gold-bright)" : "var(--ink)",
                fontSize: isStat ? 22 : 18,
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {sample || (isStat ? "12" : "Aa")}
              </div>
              <div style={{fontFamily:"var(--font-mono)", fontSize:9, color: active ? "var(--gold-bright)" : "var(--ink-2)", letterSpacing:"0.05em"}}>
                {p.name}
              </div>
              <div style={{fontFamily:"var(--font-mono)", fontSize:8, color:"var(--ink-3)", textTransform:"uppercase", letterSpacing:"0.08em"}}>
                {p.tag}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


export default CardEditor;
