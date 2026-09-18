import React from "react";
import Card from "./Card.jsx";
import CardEditor from "./CardEditor.jsx";
import Projects from "./projects.js";
import { MOCK_BALANCE_ITERS, DECK_PRESETS } from "./data.js";
// ─────────────────────────────────────────────────────────────
// Orchestrate tab — claude.ai chat aesthetic with split-screen
// right rail. Big centered Start button for clear entry point.
// When the agent shows a panel (cards, balance, simulate, editor)
// it slides into the right rail — left half stays for the
// conversation, right half stays open for the rest of the chat.
// Right-rail content uses focused subviews (CardGridView,
// BalanceTraceView, BattleSceneView, EditorView), not the full
// tab pages — we cherry-pick the right component for each context.
// ─────────────────────────────────────────────────────────────

// ────── Tool-call effects: real mutations of project state ──────
const orchEffects = {
  update_template_color: ({ slot, value }) => {
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.deck?.template) return;
    const deck = JSON.parse(JSON.stringify(p.deck));
    const slotMap = {
      titleColor: { face: "front", slotId: "name", prop: "fontColor" },
      typeColor: { face: "front", slotId: "typeLine", prop: "fontColor" },
      abilityColor: { face: "front", slotId: "ability", prop: "fontColor" },
      flavorColor: { face: "front", slotId: "flavor", prop: "fontColor" },
      costBg: { face: "front", slotId: "cost", prop: "statBg" },
      attackBg: { face: "front", slotId: "attack", prop: "statBg" },
      defenseBg: { face: "front", slotId: "defense", prop: "statBg" },
      backTitleColor: { face: "back", slotId: "backTitle", prop: "fontColor" },
    };
    const m = slotMap[slot];
    if (!m) return;
    const face = deck.template[m.face];
    if (!face?.slots) return;
    const target = face.slots.find(s => s.id === m.slotId);
    if (target) target[m.prop] = value;
    Projects.updateActive({ deck });
  },

  update_template_slot_position: ({ slotId, face, x, y, w, h }) => {
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.deck?.template) return;
    const deck = JSON.parse(JSON.stringify(p.deck));
    const f = deck.template[face || "front"];
    if (!f?.slots) return;
    const target = f.slots.find(s => s.id === slotId);
    if (target) {
      if (x !== undefined) target.x = x;
      if (y !== undefined) target.y = y;
      if (w !== undefined) target.w = w;
      if (h !== undefined) target.h = h;
    }
    Projects.updateActive({ deck });
  },

  apply_card_override: ({ cardId, slotId, props }) => {
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.cards) return;
    const cards = p.cards.map(c => {
      if (c.id !== cardId) return c;
      return { ...c, overrides: { ...(c.overrides || {}), [slotId]: { ...(c.overrides?.[slotId] || {}), ...props } } };
    });
    Projects.updateActive({ cards });
  },

  edit_card_stat: ({ cardId, stat, delta }) => {
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.cards) return;
    const cards = p.cards.map(c => {
      if (c.id !== cardId) return c;
      const next = { ...c, [stat]: (c[stat] || 0) + delta };
      if (next.gameplay) next.gameplay = { ...next.gameplay, [stat]: next[stat] };
      return next;
    });
    Projects.updateActive({ cards });
  },

  export_deck_json: () => {
    
    if (!Projects) return null;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p) return null;
    return {
      version: "0.9",
      deckId: p.deck?.id || p.id,
      deckName: p.deck?.name || p.name,
      cards: (p.cards || []).map(c => ({
        id: c.id,
        rarity: c.rarity,
        tags: c.tags || [],
        gameplay: c.gameplay || { cost: c.cost, attack: c.attack, defense: c.defense, health: c.health },
        content: c.content || { name: c.name, typeLine: c.type, ability: c.ability, flavor: c.flavor },
        overrides: c.overrides || {},
      })),
      template: p.deck?.template || null,
      rules: p.deck?.rules || null,
      generatedBy: "agent_orchestrator_v0.9",
      exportedAt: new Date().toISOString(),
    };
  },

  set_deck_artwork: ({ url }) => {
    // Write URL to every card's content.artwork — this is the central card art slot,
    // NOT the full-card background frame.
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.cards) return;
    const cards = p.cards.map(c => ({
      ...c,
      content: { ...(c.content || {}), artwork: url }
    }));
    Projects.updateActive({ cards });
  },

  set_deck_back_logo: ({ url }) => {
    // Write URL to every card's content.backLogo — the logo image on the card back.
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.cards) return;
    const cards = p.cards.map(c => ({
      ...c,
      content: { ...(c.content || {}), backLogo: url }
    }));
    Projects.updateActive({ cards });
  },

  set_template_font: ({ slotId, face, fontFamily, fontWeight, letterSpacing }) => {
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.deck?.template) return;
    const deck = JSON.parse(JSON.stringify(p.deck));
    const f = deck.template[face || "front"];
    if (!f?.slots) return;
    const target = f.slots.find(s => s.id === slotId);
    if (target) {
      if (fontFamily !== undefined) target.fontFamily = fontFamily;
      if (fontWeight !== undefined) target.fontWeight = fontWeight;
      if (letterSpacing !== undefined) target.letterSpacing = letterSpacing;
    }
    Projects.updateActive({ deck });
  },

  set_card_artwork: ({ cardId, url }) => {
    
    if (!Projects) return;
    const id = Projects.getState().activeProjectId;
    const p = Projects.getState().projects[id];
    if (!p?.cards) return;
    const cards = p.cards.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        content: { ...(c.content || {}), artwork: url },
        overrides: { ...(c.overrides || {}), artwork: { ...(c.overrides?.artwork || {}), src: url } }
      };
    });
    Projects.updateActive({ cards });
  }
};

function applyToolEffect(tool) {
  if (!tool.effect) return;
  const fn = orchEffects[tool.effect];
  if (!fn) return;
  try { tool.appliedResult = fn(tool.effectArgs || {}); } catch (e) { console.error("Effect failed:", e); }
}

// ═══════════════════════════════════════════════════════════
// SUBVIEWS — selective slices of other tabs for the right rail
// ═══════════════════════════════════════════════════════════

// 1. Card grid — clean tile view, no editor/toolbar/template tile
function CardGridView({ cards, highlight, showBack }) {
  if (!cards || !cards.length) return <div className="orch-rv-empty">No cards in active project.</div>;
  const C = Card;
  if (!C) return <div className="orch-rv-empty">Card renderer unavailable</div>;
  return (
    <div className="orch-rv-cards-wrap">
      <div className="orch-rv-cards-meta">
        <span className="orch-rv-tag">total {cards.length}</span>
        {showBack
          ? <span className="orch-rv-tag orch-rv-tag-accent">showing card backs</span>
          : <>
              <span className="orch-rv-tag">creatures {cards.filter(c => c.type === "Creature").length}</span>
              <span className="orch-rv-tag">spells {cards.filter(c => c.type === "Spell").length}</span>
            </>}
      </div>
      <div className="orch-rv-cards-grid">
        {cards.map(c => (
          <div key={c.id} className={`orch-rv-card-cell${highlight === c.id ? " highlight" : ""}`}>
            <C card={c} compact showBack={showBack} />
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. Balance trace — convergence chart + 4 KPI tiles, NO heatmap, NO usage bars
function BalanceTraceView() {
  const iters = MOCK_BALANCE_ITERS || [];
  const final = iters[iters.length - 1] || { variance: 0.049, entropy: 0.76, topDeck: 0.51, length: 8.1 };

  const W = 320, H = 140, PADL = 30, PADR = 12, PADT = 12, PADB = 24;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  const maxV = Math.max(...iters.map(d => d.variance));
  const xs = i => PADL + (i / Math.max(1, iters.length - 1)) * innerW;
  const ys = v => PADT + (1 - v / maxV) * innerH;
  const path = iters.map((d, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(d.variance)}`).join(" ");
  const targetY = PADT + (1 - 0.05 / maxV) * innerH;

  const kpis = [
    { label: "Variance σ", value: final.variance.toFixed(3), target: "≤ 0.05", good: final.variance <= 0.05 },
    { label: "Entropy H", value: final.entropy.toFixed(2), target: "≥ 0.75", good: final.entropy >= 0.75 },
    { label: "Top-deck WR", value: (final.topDeck * 100).toFixed(0) + "%", target: "< 65%", good: final.topDeck < 0.65 },
    { label: "Match length", value: final.length.toFixed(1) + "t", target: "≈ 8", good: true },
  ];

  return (
    <div className="orch-rv-balance">
      <div className="orch-rv-kpis">
        {kpis.map(k => (
          <div key={k.label} className={`orch-rv-kpi${k.good ? " good" : " bad"}`}>
            <div className="orch-rv-kpi-label">{k.label}</div>
            <div className="orch-rv-kpi-value">{k.value}</div>
            <div className="orch-rv-kpi-target">target {k.target}</div>
          </div>
        ))}
      </div>
      <div className="orch-rv-chart-wrap">
        <div className="orch-rv-chart-title">Variance convergence · 12 iterations</div>
        <svg viewBox={`0 0 ${W} ${H}`} className="orch-rv-chart" preserveAspectRatio="none">
          {[0.33, 0.66].map(p => (
            <line key={p} x1={PADL} y1={PADT + p * innerH} x2={W - PADR} y2={PADT + p * innerH}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          ))}
          <line x1={PADL} y1={targetY} x2={W - PADR} y2={targetY}
            stroke="#67d99e" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.6" />
          <path d={path} fill="none" stroke="#67d9e6" strokeWidth="1.8" />
          {iters.map((d, i) => (
            <circle key={i} cx={xs(i)} cy={ys(d.variance)} r="2" fill="#67d9e6" />
          ))}
          <text x={W - PADR - 4} y={targetY - 3} fontSize="9" textAnchor="end" fill="#67d99e" fontFamily="var(--font-mono)">
            σ = 0.05
          </text>
        </svg>
        <div className="orch-rv-chart-x">
          <span>iter 0</span>
          <span>iter {iters.length - 1}</span>
        </div>
      </div>
    </div>
  );
}

// 3. Editor view — uses the real CardEditor at template scope
function EditorView({ cards }) {
  const E = CardEditor;
  if (!E) return <div className="orch-rv-empty">Editor unavailable</div>;
  
  const state = Projects?.getState();
  const proj = state?.projects?.[state?.activeProjectId];
  const firstCard = proj?.cards?.[0] || cards?.[0];
  if (!firstCard) return <div className="orch-rv-empty">No card to edit</div>;
  return (
    <div className="orch-rv-editor">
      <E card={firstCard} deck={proj?.deck} initialScope="template"
        onChange={() => {}} onDeckChange={() => {}} onClose={() => {}} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SCRIPT BUILDER
// ═══════════════════════════════════════════════════════════
// Theme-specific playful design choices per preset.
// Theme-specific playful design choices per preset using real AI diffusion artwork.
const THEME_DESIGN = {
  "Quantum Particles": {
    titleFont: "JetBrains Mono",
    titleWeight: 700,
    titleSpacing: "0.04em",
    frontBg: "https://image.pollinations.ai/prompt/quantum%20particle%20collision%20glowing%20energy%20chamber%20digital%20art?width=800&height=560&nologo=true&seed=101&model=turbo",
    backBg: "https://image.pollinations.ai/prompt/quantum%20field%20diagram%20cosmic%20grid%20digital%20art?width=800&height=560&nologo=true&seed=102&model=turbo",
    sampleArtworks: {
      0: "https://image.pollinations.ai/prompt/quantum%20higgs%20boson%20energy%20pulse%20digital%20art?width=600&height=400&nologo=true&seed=103&model=turbo",
    },
    mood: "scientific paper meets particle accelerator chamber — technical monospace, lab-blue gradients, quantum detector imagery.",
    rationale: "JetBrains Mono is the font scientific papers and physics simulators actually use."
  },
  "Deep Sea Creatures": {
    titleFont: "Cinzel",
    titleWeight: 600,
    titleSpacing: "0.06em",
    frontBg: "https://image.pollinations.ai/prompt/bioluminescent%20deep%20sea%20abyss%20ocean%20trench%20digital%20art?width=800&height=560&nologo=true&seed=201&model=turbo",
    backBg: "https://image.pollinations.ai/prompt/deep%20sea%20kraken%20silhouette%20abyss%20digital%20art?width=800&height=560&nologo=true&seed=202&model=turbo",
    sampleArtworks: {
      0: "https://image.pollinations.ai/prompt/bioluminescent%20humpback%20anglerfish%20fantasy%20tcg%20art?width=600&height=400&nologo=true&seed=203&model=turbo",
    },
    mood: "abyssal pressure, bioluminescent flickers in absolute darkness — Cinzel for gravitas, deep cyan, glowing anglerfish illustration.",
    rationale: "Cinzel reads as 'ancient and weighty' — pairs naturally with creatures older than continents."
  },
  "Greek Mythology": {
    titleFont: "Cinzel Decorative",
    titleWeight: 700,
    titleSpacing: "0.08em",
    frontBg: "https://image.pollinations.ai/prompt/mount%20olympus%20parthenon%20temple%20sunset%20digital%20art?width=800&height=560&nologo=true&seed=301&model=turbo",
    backBg: "https://image.pollinations.ai/prompt/golden%20laurel%20wreath%20celestial%20pattern%20digital%20art?width=800&height=560&nologo=true&seed=302&model=turbo",
    sampleArtworks: {
      0: "https://image.pollinations.ai/prompt/zeus%20apollo%20golden%20temple%20mount%20olympus%20digital%20art?width=600&height=400&nologo=true&seed=303&model=turbo",
    },
    mood: "Parthenon marble at golden hour, laurel-wreath card backs — ornamental Cinzel Decorative title font, classical proportions.",
    rationale: "Cinzel Decorative is inspired by classical Roman and Greek inscriptions."
  },
  "Vietnamese Street Food": {
    titleFont: "Macondo",
    titleWeight: 400,
    titleSpacing: "0.02em",
    frontBg: "https://image.pollinations.ai/prompt/vietnamese%20street%20food%20night%20market%20warm%20lanterns%20digital%20art?width=800&height=560&nologo=true&seed=401&model=turbo",
    backBg: "https://image.pollinations.ai/prompt/vietnamese%20bamboo%20texture%20vintage%20pattern%20digital%20art?width=800&height=560&nologo=true&seed=402&model=turbo",
    sampleArtworks: {
      0: "https://image.pollinations.ai/prompt/steaming%20bowl%20vietnamese%20pho%20beef%20herbs%20digital%20art?width=600&height=400&nologo=true&seed=403&model=turbo",
    },
    mood: "hand-painted street stall signage, warm sodium-lamp orange, Macondo's hand-drawn casualness.",
    rationale: "Macondo has a hand-drawn quality that makes a card feel like it was sketched on butcher paper."
  },
  "Forgotten Gods": {
    titleFont: "UnifrakturMaguntia",
    titleWeight: 400,
    titleSpacing: "0.04em",
    frontBg: "https://image.pollinations.ai/prompt/ancient%20cuneiform%20stone%20tablet%20purple%20arcane%20glow%20digital%20art?width=800&height=560&nologo=true&seed=501&model=turbo",
    backBg: "https://image.pollinations.ai/prompt/anubis%20egyptian%20god%20shadow%20tomb%20digital%20art?width=800&height=560&nologo=true&seed=502&model=turbo",
    sampleArtworks: {
      0: "https://image.pollinations.ai/prompt/forgotten%20eldritch%20god%20ancient%20relic%20purple%20magic%20digital%20art?width=600&height=400&nologo=true&seed=503&model=turbo",
    },
    mood: "weathered cuneiform tablets and ancient Egyptian iconography, deep violet ink-stain palette.",
    rationale: "UnifrakturMaguntia is medieval blackletter — reads as 'this is an artifact, not a product'."
  }
};


function buildOrchTurns(topic) {
  const themeName = topic || "Quantum Particles";
  const preset = (DECK_PRESETS || {})[themeName] || {};
  const rules = preset?.deck?.rules || {};
  const cards = preset?.cards || [];
  const elements = rules.elements || [];
  const factions = rules.factions || [];
  const keywords = rules.keywords || [];
  const sampleCards = cards.slice(0, 6);
  const cardForEdit = cards[0] || { id: "qp01", name: "Higgs Boson", attack: 4, defense: 9, cost: 7 };
  const legendaryCard = cards.find(c => c.rarity === "legendary") || cards[0];
  const design = THEME_DESIGN[themeName] || THEME_DESIGN["Quantum Particles"];

  const userPrompts = {
    "Quantum Particles": `I want to build a deck around quantum particles — Higgs boson, electron clouds, quark triplets, that kind of thing. Aesthetic should be lab-blue and clean, JetBrains Mono for the typography. Around 20 cards. Four elements split as void/light/fire/neutral, factions for boson/fermion/field/exotic. Mechanics should lean into probability and superposition — keywords like Probabilistic, Confinement, Collapse, Link. Scientific feel, not fantasy.`,
    "Deep Sea Creatures": `Deep ocean deck — anglerfish, vampire squids, kraken. Abyssal cyan and dark. Around 20 cards, factions abyssal/deep/surface/coral. Mechanics around lure, pressure, decomposition. Legendaries should feel ancient.`,
    "Greek Mythology": `Greek mythology — Olympians, titans, monsters from the Iliad. Classical gold and marble. 20 cards, factions Olympian/Titan/Mortal/Underworld. Mechanics around fate, prophecy, divine intervention.`,
    "Vietnamese Street Food": `Vietnamese street food — phở, bánh mì, bún chả, chè. Warm orange. 20 cards, factions north/central/south/coastal. Mechanics around aroma, freshness, combination.`,
    "Forgotten Gods": `Forgotten gods — Mesopotamian, Egyptian, Mesoamerican, Primordial. Violet and dark. 20 cards. Mechanics around sacrifice, revival, judgment.`,
  };
  const userPrompt = userPrompts[themeName] || userPrompts["Quantum Particles"];

  return [
    // ── ACT 1 ──
    { kind: "user", text: userPrompt },
    { kind: "agent", text: `Great brief — you've already specified the schema down to elements, factions, and keyword families, so I can skip rule invention and go straight to execution. Let me validate the theme, pull a couple of reference patterns, then start generating.` },
    { kind: "thinking", durationMs: 2100, text: `The user has given a fully-specified brief:\n• Theme: ${themeName} with concrete card examples (${sampleCards.slice(0, 3).map(c => c.name).join(", ")})\n• Visual: lab-blue, JetBrains Mono\n• Size: ~20 cards\n• Elements: ${elements.join(", ")}\n• Factions: ${factions.join(", ")}\n• Keywords: Probabilistic, Confinement, Collapse, Link\n• Tone: scientific\n\nUnusual — most users describe a vibe and let me invent the schema. This user has done the design work. Respect that: skip rule invention, lock in their specifications, generate cards conforming to the schema.` },
    { kind: "tools", title: "Ran 5 commands · validation and schema lock", tools: [
      { name: "validate_theme_safety", args: { theme: themeName, examples: sampleCards.slice(0, 3).map(c => c.name) }, result: { safe: true, flags: [], reasoning: "Scientific theme. No trademark concerns." }, ms: 142 },
      { name: "_skill", skillName: "card-design.md", desc: "Stat scaling, rarity distribution, ability templating", ms: 60 },
      { name: "_skill", skillName: "balance-tuning.md", desc: "Cost-power ratio targets, entropy/variance bands", ms: 60 },
      { name: "_rag", query: `${themeName} card mechanics probabilistic confinement`, hits: [
        { source: "ref/physics_themed_games.md", snippet: "Quantum mechanics cards work best when ability text mirrors actual particle behavior — superposition → duplication, entanglement → linked effects.", score: 0.94 },
        { source: "ref/keyword_library.md", snippet: `Keywords like ${keywords.slice(0, 4).join(", ")} pair well with low-cost tempo cards (1-2 mana, 1/1 stats).`, score: 0.87 },
        { source: "ref/typography_choices.md", snippet: "JetBrains Mono + cool blues (#9ab6ff, #6a8ada) read as 'technical/scientific' without being cold.", score: 0.81 },
      ], ms: 380 },
      { name: "generate_rules", args: { theme: themeName, elements, factions, keywords_seed: keywords.slice(0, 8) }, result: { elements, factions, keywords, cardTypes: rules.cardTypes || ["Creature","Spell"], stats: rules.stats }, ms: 1180 }
    ]},

    { kind: "agent", text: `Schema locked. Generating 20 cards in 4 batches of 5 — keeping rarity distribution at 3 common / 1 rare / 1 epic per batch with legendaries sprinkled across rare slots. Each batch validates against your stat bounds before continuing.` },

    { kind: "tools", title: "Ran 4 commands · generating 20 cards", tools: [
      { name: "generate_cards_batch", args: { batchSize: 5, batch: "1/4", rarityMix: { common: 3, rare: 1, epic: 1 } }, result: { batch: "1/4 complete", cards: sampleCards.slice(0, 5).map(c => ({ id: c.id, name: c.name, rarity: c.rarity })) }, ms: 2240 },
      { name: "generate_cards_batch", args: { batchSize: 5, batch: "2/4" }, result: { batch: "2/4 complete", running_total: 10, novel_keywords_used: ["Collapse", "Superposition"] }, ms: 2110 },
      { name: "generate_cards_batch", args: { batchSize: 5, batch: "3/4" }, result: { batch: "3/4 complete", running_total: 15, retry_count: 1, retry_reason: "first attempt produced 6 cards" }, ms: 2380 },
      { name: "generate_cards_batch", args: { batchSize: 5, batch: "4/4" }, result: { batch: "4/4 complete", running_total: 20, legendary_count: 3 }, ms: 2090 }
    ]},

    { kind: "agent", text: `20 cards generated. Distribution: 9 common, 4 rare, 4 epic, 3 legendary. Now artwork — lab-blue scientific illustration anchor, 3:4 aspect to fit the card art slot.` },
    { kind: "tools", title: "Ran 1 command · 20 images via Imagen 4 Fast", tools: [
      { name: "generate_artwork_batch", args: { count: 20, style_anchor: "scientific illustration, lab blue (#9ab6ff), particle physics, painterly, no text", model: "imagen-4-fast" }, result: { generated: 20, retried: 4, total_cost: "$0.48" }, ms: 9200 }
    ]},

    { kind: "agent", text: `Here's the generated set — opening on the right so you can see them while we keep going:` },
    { kind: "panel", panelType: "cards", title: "Generated deck · 20 cards" },

    // ── ACT 2: BALANCE — local GA, then LLM strategist interpretation ──
    { kind: "agent", text: `Now balance validation. This is a two-stage pipeline:\n\n1. **Local GA** — runs in the browser, no API cost. Simulates ~1,000 matches per generation across 12 generations to find win-rate variance and synergy patterns.\n2. **LLM strategist** — takes the GA's raw metrics and interprets them: are we within target bands? If not, which specific cards are the outliers? What stat tweaks would help?\n\nLet me run the first pass.` },

    { kind: "tools", title: "Ran 1 command · local GA simulation", tools: [
      { name: "_code_exec", lang: "javascript", code: `// Local Genetic Algorithm — pure browser code, no API cost\nconst pool = window.TOPIC_DATA["${themeName}"];\nconst result = window.runGAQuick(pool, {\n  generations: 12,\n  popSize: 30,\n  matchesPerGen: 1000,\n  fitnessWeights: { variance: 0.4, entropy: 0.3, topDeck: 0.2, length: 0.1 }\n});\nreturn {\n  variance: result.variance,\n  entropy: result.entropy,\n  topDeck: result.topDeck,\n  matchLength: result.length,\n  topCards: result.topCards,\n  weakCards: result.weakCards\n};`, result: {
        variance: 0.067,
        entropy: 0.71,
        topDeck: 0.62,
        matchLength: 7.4,
        topCards: [`${sampleCards[0]?.name || "Higgs Boson"} (usage 0.74)`, `${sampleCards[1]?.name || "Photon Burst"} (usage 0.71)`],
        weakCards: [`${sampleCards[3]?.name || "Quark Triplet"} (usage 0.21)`, `${sampleCards[4]?.name || "Superposition"} (usage 0.28)`]
      }, ms: 3420 }
    ]},

    { kind: "agent", text: `Raw GA output is in. Variance 0.067 — **above the 0.05 target**, so we haven't converged yet. Entropy is also slightly low at 0.71. Let me feed these metrics into the strategist LLM to interpret what's actually wrong.` },

    { kind: "tools", title: "Ran 1 command · LLM strategist interpretation", tools: [
      { name: "evaluate_balance",
        args: {
          metrics: { variance: 0.067, entropy: 0.71, topDeck: 0.62, matchLength: 7.4 },
          targets: { variance: 0.05, entropy: 0.75, topDeck: 0.65, matchLength: 8.0 },
          context: {
            top_used_cards: [`${sampleCards[0]?.name || "Higgs Boson"}`, `${sampleCards[1]?.name || "Photon Burst"}`],
            under_used_cards: [`${sampleCards[3]?.name || "Quark Triplet"}`, `${sampleCards[4]?.name || "Superposition"}`],
            rules: { stats: rules.stats, factions: factions }
          },
          model: "deepseek-v4-flash"
        },
        result: {
          converged: false,
          diagnosis: `Variance is high because ${sampleCards[0]?.name || "Higgs Boson"} dominates — its usage of 0.74 is far above the 0.45 healthy ceiling for legendaries. Two cards (${sampleCards[3]?.name || "Quark Triplet"}, ${sampleCards[4]?.name || "Superposition"}) are under-used at 0.21–0.28.`,
          root_cause: `${sampleCards[0]?.name || "Higgs Boson"}'s ${cardForEdit.attack || 4}/${cardForEdit.defense || 9} stats for ${cardForEdit.cost || 7} mana give it a cost-power ratio of ${(((cardForEdit.attack || 4) + (cardForEdit.defense || 9)) / (cardForEdit.cost || 7)).toFixed(2)} — too efficient compared to other legendaries averaging 2.0.`,
          recommendations: [
            { card: sampleCards[0]?.id || "qp01", change: { defense: "-1" }, rationale: "Reduce defense to bring cost-power ratio into 2.0–2.5 band" },
            { card: sampleCards[3]?.id || "qp04", change: { cost: "-1" }, rationale: "Lower mana cost to make Confinement worth playing on curve" }
          ],
          confidence: 0.84
        },
        ms: 1240
      }
    ]},

    { kind: "agent", text: `The strategist diagnosed it: **${sampleCards[0]?.name || "Higgs Boson"} is too efficient** at a ${(((cardForEdit.attack || 4) + (cardForEdit.defense || 9)) / (cardForEdit.cost || 7)).toFixed(2)} cost-power ratio versus the 2.0 legendary average. It's dominating play, which inflates variance.\n\nTwo recommended fixes:\n\n1. ${sampleCards[0]?.name || "Higgs Boson"} **defense −1** — pull its ratio into the 2.0–2.5 band\n2. ${sampleCards[3]?.name || "Quark Triplet"} **cost −1** — make Confinement worth playing on curve\n\nApplying both and re-running the GA to verify convergence.` },

    { kind: "tools", title: "Ran 3 commands · apply fix, re-run GA, re-evaluate", tools: [
      { name: "edit_card_stat",
        args: { cardId: sampleCards[0]?.id || "qp01", stat: "defense", delta: -1 },
        result: { applied: true, card: sampleCards[0]?.name || "Higgs Boson", before: cardForEdit.defense || 9, after: (cardForEdit.defense || 9) - 1 },
        ms: 180,
        effect: "edit_card_stat",
        effectArgs: { cardId: sampleCards[0]?.id || "qp01", stat: "defense", delta: -1 }
      },
      { name: "edit_card_stat",
        args: { cardId: sampleCards[3]?.id || "qp04", stat: "cost", delta: -1 },
        result: { applied: true, card: sampleCards[3]?.name || "Quark Triplet", before: sampleCards[3]?.cost || 3, after: (sampleCards[3]?.cost || 3) - 1 },
        ms: 180,
        effect: "edit_card_stat",
        effectArgs: { cardId: sampleCards[3]?.id || "qp04", stat: "cost", delta: -1 }
      },
      { name: "_code_exec", lang: "javascript", code: `// Re-run GA with the updated pool\nconst pool = window.TOPIC_DATA["${themeName}"]; // now includes stat edits\nconst result = window.runGAQuick(pool, { generations: 12, popSize: 30, matchesPerGen: 1000 });\nreturn result;`, result: { variance: 0.049, entropy: 0.76, topDeck: 0.51, matchLength: 8.1 }, ms: 2980 },
      { name: "evaluate_balance",
        args: { metrics: { variance: 0.049, entropy: 0.76, topDeck: 0.51, matchLength: 8.1 }, targets: { variance: 0.05, entropy: 0.75, topDeck: 0.65, matchLength: 8.0 }, model: "deepseek-v4-flash" },
        result: { converged: true, recommendations: [], summary: "All four metrics within target after 1 strategist iteration." },
        ms: 720
      }
    ]},

    { kind: "agent", text: `Converged on the second pass — the LLM strategist's diagnosis was correct:\n\n• **Variance** 0.067 → **0.049** (target ≤ 0.05) ✓\n• **Entropy** 0.71 → **0.76** (target ≥ 0.75) ✓\n• **Top-deck win rate** 62% → **51%** (target < 65%) ✓\n• **Match length** 7.4 → **8.1 turns** (target ≈ 8) ✓\n\nThe GA alone wasn't enough — it told us "the deck is unbalanced", but only the strategist could read the pattern in usage data and identify ${sampleCards[0]?.name || "Higgs Boson"} as the specific outlier. That's the value of the two-stage pipeline.` },

    { kind: "panel", panelType: "balance", title: "Balance convergence" },

    // ── ACT 3: DESIGN ──
    { kind: "user", text: `Looks great. Two things — the rarity tiers don't feel distinguishable enough on the card face, and the title color is too pale on the blue background. Can you bump the title to a stronger cyan and make legendaries visually distinct?` },
    { kind: "thinking", durationMs: 1800, text: `Two design requests:\n\n1. Title color too pale → push toward stronger cyan. Current titleColor is #9ab6ff (light periwinkle). A more saturated cyan like #67d9e6 would have more punch against the dark blue card bg.\n\n2. Rarity tiers not distinguishable → widen the contrast. Specifically, legendaries should pop — gold against the cool blue scheme would create strong visual hierarchy.\n\nBoth changes are template-scope, so they affect every card in the deck simultaneously.` },
    { kind: "tools", title: "Ran 2 commands · template color updates", tools: [
      { name: "update_template_color", args: { slot: "titleColor", value: "#67d9e6" }, result: { applied: true, before: "#9ab6ff", after: "#67d9e6", scope: "deck-wide" }, ms: 180, effect: "update_template_color", effectArgs: { slot: "titleColor", value: "#67d9e6" } },
      { name: "update_rarity_palette", args: { rarities: [{ id: "common", color: "#6a7a8a" }, { id: "rare", color: "#67d9e6" }, { id: "epic", color: "#c78ad9" }, { id: "legendary", color: "#f0c168" }]}, result: { applied: true, summary: "Common slate · Rare cyan · Epic violet · Legendary gold (only warm color)" }, ms: 220 }
    ]},
    { kind: "agent", text: `Done. Title shifted from **#9ab6ff** to **#67d9e6**. Legendaries are now gold — the only warm color in the scheme, so they immediately draw the eye. Look at the panel on the right — the changes are already applied. Want me to strengthen the legendary frame with a thicker border?` },

    { kind: "user", text: `Yes, thicker border and slight glow. Also — open the template editor on the right so I can see what you're changing as you go.` },
    { kind: "agent", text: `Swapping the right panel to the live template editor. You'll see which slots I'm modifying as I make each change.` },
    { kind: "panel", panelType: "editor", title: "Template editor · live" },
    { kind: "tools", title: "Ran 1 command · legendary frame styling", tools: [
      { name: "update_rarity_frame", args: { rarityId: "legendary", borderWidth: 3, glowIntensity: 0.4, glowColor: "#f0c168" }, result: { applied: true, borderWidth: { before: 1, after: 3 }, glow: { before: 0, after: 0.4 } }, ms: 210 }
    ]},
    { kind: "agent", text: `Legendary border bumped from 1px to 3px with a soft gold outer glow. The 3 legendaries (${cards.filter(c => c.rarity === "legendary").slice(0,3).map(c => c.name).join(", ")}) now read as rarest at a glance.` },

    // ── ACT 3.5: PLAYFUL THEMED FRONT-FACE DESIGN PASS ──
    { kind: "user", text: `Honestly the cards still feel kind of generic. Can you make a bolder design choice that really matches the theme? Don't be subtle. Start with the front face.` },

    { kind: "thinking", durationMs: 2800, text: `Big creative opening. The user wants me to commit to a strong design direction, not nudge values. Let me think about what "${themeName}" actually wants to evoke:\n\n${design.mood}\n\nMoves to make on the front face:\n• Set the **artwork** slot on every card to themed reference imagery (Wikimedia: ${design.frontBg.split("/").pop()?.split("?")[0]}) — this is the central card art region, not the full card surface\n• Switch the **title font** to ${design.titleFont} — ${design.rationale}\n\nImportant: artwork goes in card.content.artwork, NOT template.frontBg. Setting frontBg as a full-card overlay would paint over the title, stats, and ability text. Artwork is the dedicated central art slot.` },

    { kind: "tools", title: "Ran 2 commands · themed artwork + title font on front", tools: [
      {
        name: "set_deck_artwork",
        args: { url: design.frontBg, slot: "artwork", scope: "deck-wide (all 20 cards)" },
        result: { applied: true, slot: "content.artwork", cards_affected: 20, source: "Wikimedia Commons", description: `themed central artwork for ${themeName} deck` },
        ms: 320,
        effect: "set_deck_artwork",
        effectArgs: { url: design.frontBg }
      },
      {
        name: "set_template_font",
        args: { slotId: "name", face: "front", fontFamily: design.titleFont, fontWeight: design.titleWeight, letterSpacing: design.titleSpacing },
        result: { applied: true, font: design.titleFont, weight: design.titleWeight, rationale: design.rationale },
        ms: 280,
        effect: "set_template_font",
        effectArgs: { slotId: "name", face: "front", fontFamily: design.titleFont, fontWeight: design.titleWeight, letterSpacing: design.titleSpacing }
      }
    ]},

    { kind: "agent", text: `Front face committed:\n\n• **Artwork slot** → real thematic imagery from Wikimedia, applied to all 20 cards' central art region\n• **Title font** → ${design.titleFont}. ${design.rationale}\n\nThe right panel now shows the full deck with the new artwork. Every card carries the same visual reference, which gives the deck a unified identity — like a real published set, not random AI-generated art.` },

    { kind: "panel", panelType: "cards", title: "Themed deck · 20 fronts" },

    // ── ACT 4: CARD BACK DESIGN ──
    { kind: "user", text: `Good. Now do the back — the back logo is currently empty, set it to themed imagery too. And the layout's cramped: the back logo is small, the back title sits at the top. Make the logo bigger and center it, drop the title below.` },

    { kind: "thinking", durationMs: 1900, text: `Three coordinated moves on the card back:\n\n1. Set **backLogo** slot to themed imagery (Wikimedia: ${design.backBg.split("/").pop()?.split("?")[0]}) — this goes in card.content.backLogo per card, applied across all 20\n2. Reposition **backLogo** slot: scale up from ~80×80 to 160×160, center it in the upper-middle around (60, 100)\n3. Move **backTitle** from y=40 (top, cramped) to y=280 (lower-middle, comfortable below the logo)\n\nThese are independent calls: the image content goes to card.content, the slot geometry goes to template.back.slots.` },

    { kind: "tools", title: "Ran 3 commands · card back imagery + layout", tools: [
      {
        name: "set_deck_back_logo",
        args: { url: design.backBg, slot: "backLogo", scope: "deck-wide (all 20 cards)" },
        result: { applied: true, slot: "content.backLogo", cards_affected: 20, source: "Wikimedia Commons", description: `themed back logo image for ${themeName}` },
        ms: 290,
        effect: "set_deck_back_logo",
        effectArgs: { url: design.backBg }
      },
      {
        name: "update_template_slot_position",
        args: { slotId: "backLogo", face: "back", x: 60, y: 100, w: 160, h: 160 },
        result: { applied: true, slot: "backLogo", before: { x: 100, y: 160, w: 80, h: 80 }, after: { x: 60, y: 100, w: 160, h: 160 } },
        ms: 195,
        effect: "update_template_slot_position",
        effectArgs: { slotId: "backLogo", face: "back", x: 60, y: 100, w: 160, h: 160 }
      },
      {
        name: "update_template_slot_position",
        args: { slotId: "backTitle", face: "back", y: 280 },
        result: { applied: true, slot: "backTitle", before: { y: 40 }, after: { y: 280 }, note: "Moved from top to lower-middle for visual balance with enlarged logo" },
        ms: 160,
        effect: "update_template_slot_position",
        effectArgs: { slotId: "backTitle", face: "back", y: 280 }
      }
    ]},

    { kind: "agent", text: `Card back done:\n\n• **backLogo** image → themed imagery on every card's back\n• **backLogo** size → 80×80 → **160×160** at position (60, 100)\n• **backTitle** position → y=40 → **y=280** (sitting below the enlarged logo)\n\nFlipping the deck preview now to show the backs:` },

    { kind: "panel", panelType: "cards", title: "Card backs · all 20", showBack: true },

    // ── ACT 5: PER-CARD OVERRIDE ──
    { kind: "user", text: `One more — can ${legendaryCard?.name || "Higgs Boson"} specifically have its title in serif italic? Other legendaries keep JetBrains Mono. I want it to feel like the centerpiece of the deck.` },
    { kind: "thinking", durationMs: 1500, text: `Per-card override request, not template change. Only ${legendaryCard?.name || "Higgs Boson"} gets serif italic. In v0.8 schema, write to card.overrides["name"] = { fontFamily, fontStyle }. Cormorant Garamond pairs well with JetBrains Mono — different families but both well-crafted.` },
    { kind: "tools", title: "Ran 1 command · per-card override", tools: [
      { name: "apply_card_override", args: { cardId: legendaryCard?.id || "qp01", slotId: "name", props: { fontFamily: "Cormorant Garamond", fontStyle: "italic", fontWeight: 600 } }, result: { applied: true, cardName: legendaryCard?.name || "Higgs Boson", scope: "single card only · other 19 cards unaffected" }, ms: 180, effect: "apply_card_override", effectArgs: { cardId: legendaryCard?.id || "qp01", slotId: "name", props: { fontFamily: "Cormorant Garamond", fontStyle: "italic", fontWeight: 600 } } }
    ]},
    { kind: "agent", text: `Override applied. **${legendaryCard?.name || "Higgs Boson"}** now uses Cormorant Garamond italic. Switch the right panel back to cards to see the contrast:` },
    { kind: "panel", panelType: "cards", title: "Updated deck · with overrides" },

    // ── ACT 6: ADDITIONAL BALANCE TWEAK ──
    { kind: "user", text: `One more thing — let's look at ${sampleCards[2]?.name || "Electron Cloud"}. Can we give it +1 attack so it has better mid-curve presence?` },
    { kind: "thinking", durationMs: 1400, text: `Cost-power check before the buff:\n• Current: ${sampleCards[2]?.attack || 1} attack, ${sampleCards[2]?.defense || 1} defense, cost ${sampleCards[2]?.cost || 1}\n• After +1 attack: cost-power = (${(sampleCards[2]?.attack || 1) + 1} + ${sampleCards[2]?.defense || 1}) / ${sampleCards[2]?.cost || 1} = ${(((sampleCards[2]?.attack || 1) + 1 + (sampleCards[2]?.defense || 1)) / (sampleCards[2]?.cost || 1)).toFixed(2)}\n• Target band is 2.0–3.0 → in band.\n\nApplying stat adjustment.` },
    { kind: "tools", title: "Ran 1 command · stat tweak", tools: [
      { name: "edit_card_stat", args: { cardId: sampleCards[2]?.id || "qp03", stat: "attack", delta: 1 }, result: { applied: true, name: sampleCards[2]?.name || "Electron Cloud", before: sampleCards[2]?.attack || 1, after: (sampleCards[2]?.attack || 1) + 1, new_ratio: (((sampleCards[2]?.attack || 1) + 1 + (sampleCards[2]?.defense || 1)) / (sampleCards[2]?.cost || 1)).toFixed(2) }, ms: 210, effect: "edit_card_stat", effectArgs: { cardId: sampleCards[2]?.id || "qp03", stat: "attack", delta: 1 } }
    ]},
    { kind: "agent", text: `${sampleCards[2]?.name || "Electron Cloud"} is now ${(sampleCards[2]?.attack || 1) + 1}/${sampleCards[2]?.defense || 1} for ${sampleCards[2]?.cost || 1}. The stat tweak keeps it well within the target curve while giving it better presence.` },
    { kind: "panel", panelType: "cards", title: "Updated deck · stat tuned" },

    // ── ACT 7: DELIVERABLE ──
    { kind: "user", text: `Perfect. Export the whole thing — deck JSON with all the template changes, overrides, and the final card pool. I want to save this state.` },
    { kind: "thinking", durationMs: 900, text: `Final deliverable. Serialize entire current project state: deck metadata, template (with all color and layout changes from this session), rules, all 20 cards including overrides, artwork references. Use v0.9 JSON export.` },
    { kind: "tools", title: "Ran 1 command · serializing deck state", tools: [
      { name: "export_deck_json", args: { format: "v0.9", include_overrides: true, include_template: true }, result: { serialized: true }, ms: 340, effect: "export_deck_json" }
    ]},
    { kind: "agent", text: `Done. Your deck export — captures every change from this session: title color, rarity palette, themed frame imagery, card back layout, ${legendaryCard?.name || "Higgs Boson"}'s serif italic override, and the strategist-recommended stat rebalances on ${sampleCards[0]?.name || "Higgs Boson"} and ${sampleCards[2]?.name || "Electron Cloud"}:` },
    { kind: "deliverable", filename: `${(themeName || "deck").toLowerCase().replace(/\s+/g, "_")}_v0.9.json`, label: "Deck export · JSON" },
    { kind: "agent", text: `Drop it into the Generate tab as an import to restore this exact deck. Anything else you want to refine?` }
  ];
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
function OrchestrateTab({ cards, topic }) {
  const turns = React.useMemo(() => buildOrchTurns(topic), [topic]);
  const [turnIdx, setTurnIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [started, setStarted] = React.useState(false);
  // User can override which artifact is shown on the right by clicking a past one
  const [pinnedArtifactIdx, setPinnedArtifactIdx] = React.useState(null);
  // User can also close the rail entirely; gets re-opened by clicking any artifact or by a new panel turn
  const [railClosedAtIdx, setRailClosedAtIdx] = React.useState(-1);
  const scrollRef = React.useRef(null);
  const appliedRef = React.useRef(new Set());

  // Apply tool effects as turns become visible
  React.useEffect(() => {
    for (let i = 0; i < turnIdx; i++) {
      const turn = turns[i];
      if (turn?.kind !== "tools") continue;
      (turn.tools || []).forEach((tool, ti) => {
        const key = `${i}:${ti}`;
        if (appliedRef.current.has(key)) return;
        if (tool.effect) {
          applyToolEffect(tool);
          appliedRef.current.add(key);
        }
      });
    }
  }, [turnIdx, turns]);

  React.useEffect(() => {
    if (!playing) return;
    if (turnIdx >= turns.length) { setPlaying(false); return; }
    const ev = turns[turnIdx];
    const delay = turnDelay(ev) / speed;
    const t = setTimeout(() => setTurnIdx(i => i + 1), delay);
    return () => clearTimeout(t);
  }, [playing, turnIdx, speed, turns]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turnIdx]);

  // When a new panel turn appears, clear any user pin so the latest takes over, and re-open the rail
  const lastPanelTurnIdx = React.useMemo(() => {
    for (let i = turnIdx - 1; i >= 0; i--) {
      if (turns[i]?.kind === "panel") return i;
    }
    return -1;
  }, [turnIdx, turns]);
  React.useEffect(() => {
    if (lastPanelTurnIdx >= 0) {
      setPinnedArtifactIdx(null);
      setRailClosedAtIdx(-1);
    }
  }, [lastPanelTurnIdx]);

  function startDemo() {
    setStarted(true);
    setPlaying(true);
  }
  function restart() {
    setTurnIdx(0);
    setPlaying(false);
    setStarted(false);
    setPinnedArtifactIdx(null);
    setRailClosedAtIdx(-1);
    appliedRef.current.clear();
  }

  const visibleTurns = turns.slice(0, turnIdx);

  // Determine active panel: user pin takes precedence, otherwise most-recent panel
  const visiblePanelIndices = visibleTurns
    .map((t, i) => t.kind === "panel" ? i : -1)
    .filter(i => i >= 0);

  const activePanelIdx = (pinnedArtifactIdx != null && visiblePanelIndices.includes(pinnedArtifactIdx))
    ? pinnedArtifactIdx
    : (visiblePanelIndices.length ? visiblePanelIndices[visiblePanelIndices.length - 1] : null);
  const activePanel = activePanelIdx != null ? visibleTurns[activePanelIdx] : null;

  let totalCost = 0, totalTokens = 0, toolCallCount = 0;
  visibleTurns.forEach(t => {
    const s = scoreTurn(t);
    totalCost += s.cost; totalTokens += s.tokens; toolCallCount += s.toolN;
  });

  const isRunning = playing && turnIdx < turns.length;
  const isDone = turnIdx >= turns.length;
  // Rail is open when there's an active panel AND user hasn't closed it
  const railOpen = !!activePanel && railClosedAtIdx !== activePanelIdx;

  // Open an artifact (also re-opens the rail if it was closed)
  function openArtifact(idx) {
    setPinnedArtifactIdx(idx);
    setRailClosedAtIdx(-1);
  }
  // Close the rail
  function closeRail() {
    setRailClosedAtIdx(activePanelIdx);
  }

  // ── Welcome / Start screen ──
  if (!started) {
    return (
      <div className="orch-root">
        <div className="orch-start-screen">
          <div className="orch-start-card">
            <div className="orch-start-eyebrow">Bún Real Cua · Agent Orchestration</div>
            <div className="orch-start-title">Watch the AI agent build a deck</div>
            <div className="orch-start-desc">
              Scripted demo of the v0.9 multi-turn agent — tool use, RAG retrieval,
              code execution, thinking, and live design changes. Tool calls in this
              demo make real changes to the active project, visible in Generate,
              Simulate, and Analytics tabs.
            </div>
            <button className="orch-start-btn" onClick={startDemo}>
              <span className="orch-start-btn-icon">▶</span>
              <span className="orch-start-btn-text">Start demo</span>
            </button>
            <div className="orch-start-footnote">
              {turns.length} turns · scripted from real project data · ~3 minutes at 1× speed
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`orch-root${railOpen ? " rail-open" : ""}`}>
      <div className="orch-split">
        {/* Left: conversation */}
        <div className="orch-conversation-wrap">
          <div className="orch-conversation" ref={scrollRef}>
            {visibleTurns.map((turn, i) => (
              <OrchTurn key={i} turn={turn} turnIdx={i}
                activePanelIdx={railOpen ? activePanelIdx : null}
                onOpenArtifact={openArtifact} />
            ))}
            {isRunning && <div className="orch-typing-indicator"><span></span><span></span><span></span></div>}
          </div>

          <div className="orch-toolbar">
            <div className="orch-toolbar-left">
              <button className="orch-tb-btn" title="Restart" onClick={restart}>⟲</button>
              <button className="orch-tb-btn" title="Step back" onClick={() => setTurnIdx(s => Math.max(0, s-1))}>◀</button>
              <button className="orch-tb-btn orch-tb-primary" onClick={() => {
                if (turnIdx >= turns.length) { restart(); return; }
                setPlaying(p => !p);
              }}>{playing ? "❚❚" : "▶"}</button>
              <button className="orch-tb-btn" title="Step forward" onClick={() => setTurnIdx(s => Math.min(turns.length, s+1))}>▶|</button>
              <button className="orch-tb-btn" title="Jump to end" onClick={() => setTurnIdx(turns.length)}>⟶</button>
              <div className="orch-tb-divider" />
              <span className="orch-tb-label">speed</span>
              {[0.5, 1, 2, 4].map(s => (
                <button key={s} onClick={() => setSpeed(s)} className={`orch-tb-speed${speed === s ? " active" : ""}`}>{s}×</button>
              ))}
            </div>
            <div className="orch-toolbar-right">
              <span className={`orch-status orch-status-${isRunning ? "running" : isDone ? "done" : "idle"}`}>
                {isRunning ? "●" : isDone ? "✓" : "○"}
              </span>
              <span className="orch-tb-meter">{turnIdx}/{turns.length}</span>
              <span className="orch-tb-meter-sep">·</span>
              <span className="orch-tb-meter">${totalCost.toFixed(4)}</span>
              <span className="orch-tb-meter-sep">·</span>
              <span className="orch-tb-meter">{(totalTokens/1000).toFixed(1)}k</span>
              <span className="orch-tb-meter-sep">·</span>
              <span className="orch-tb-meter">{toolCallCount} tools</span>
            </div>
          </div>
        </div>

        {/* Right: docked rail */}
        {railOpen && (
          <aside className="orch-rail">
            <RightRail panel={activePanel} cards={cards} onClose={closeRail} />
          </aside>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// RIGHT RAIL — shows the most recent panel
// ═══════════════════════════════════════════════════════════
function RightRail({ panel, cards, onClose }) {
  return (
    <div className="orch-rail-inner" key={panel.title /* re-mount on panel change for fade */}>
      <div className="orch-rail-head">
        <div className="orch-rail-head-text">
          <div className="orch-rail-eyebrow">live · right pane</div>
          <div className="orch-rail-title">{panel.title}</div>
        </div>
        {onClose && (
          <button className="orch-rail-close" onClick={onClose} title="Close panel">×</button>
        )}
      </div>
      <div className="orch-rail-body">
        {panel.panelType === "cards" && <CardGridView cards={cards} showBack={panel.showBack} />}
        {panel.panelType === "balance" && <BalanceTraceView />}
        {panel.panelType === "editor" && <EditorView cards={cards} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// TURN RENDERER
// ═══════════════════════════════════════════════════════════
function OrchTurn({ turn, turnIdx, activePanelIdx, onOpenArtifact }) {
  if (turn.kind === "user") {
    return <div className="orch-turn"><div className="orch-user-row"><div className="orch-user-bubble">{turn.text}</div></div></div>;
  }
  if (turn.kind === "agent") {
    return <div className="orch-turn orch-turn-agent"><div className="orch-agent-prose">{renderMarkdownish(turn.text)}</div></div>;
  }
  if (turn.kind === "thinking") {
    return <div className="orch-turn"><ThinkingCard text={turn.text} durationMs={turn.durationMs} /></div>;
  }
  if (turn.kind === "tools") {
    return <div className="orch-turn"><ToolsCard tools={turn.tools} title={turn.title} /></div>;
  }
  if (turn.kind === "panel") {
    return (
      <div className="orch-turn">
        <ArtifactCard
          panel={turn}
          isActive={activePanelIdx === turnIdx}
          onOpen={() => onOpenArtifact(turnIdx)}
        />
      </div>
    );
  }
  if (turn.kind === "deliverable") {
    return <div className="orch-turn"><DeliverableCard filename={turn.filename} label={turn.label} /></div>;
  }
  return null;
}

// Artifact card — inline record of a panel that was opened on the right
function ArtifactCard({ panel, isActive, onOpen }) {
  const meta = artifactMetaFor(panel);
  return (
    <button className={`orch-artifact${isActive ? " active" : ""}`} onClick={onOpen} type="button">
      <div className="orch-artifact-icon" style={{ background: meta.iconBg, color: meta.iconColor }}>
        {meta.icon}
      </div>
      <div className="orch-artifact-info">
        <div className="orch-artifact-name">{panel.title}</div>
        <div className="orch-artifact-meta">
          <span className="orch-artifact-tag">{meta.tag}</span>
          <span className="orch-artifact-desc">{meta.desc}</span>
        </div>
      </div>
      <span className={`orch-artifact-cta${isActive ? " active" : ""}`}>
        {isActive ? "viewing →" : "open →"}
      </span>
    </button>
  );
}

function artifactMetaFor(panel) {
  switch (panel.panelType) {
    case "cards":
      return { icon: "▦", iconBg: "rgba(240, 193, 104, 0.12)", iconColor: "#f0c168", tag: "card grid", desc: "20 generated cards with artwork" };
    case "balance":
      return { icon: "≈", iconBg: "rgba(103, 217, 158, 0.12)", iconColor: "#67d99e", tag: "balance trace", desc: "convergence chart + 4 KPIs" };
    case "editor":
      return { icon: "◇", iconBg: "rgba(103, 217, 230, 0.12)", iconColor: "#67d9e6", tag: "live editor", desc: "template scope, all slots editable" };
    default:
      return { icon: "□", iconBg: "rgba(255, 255, 255, 0.06)", iconColor: "var(--ink-2)", tag: "artifact", desc: "" };
  }
}

function ThinkingCard({ text, durationMs }) {
  const [open, setOpen] = React.useState(false);
  const seconds = (durationMs / 1000).toFixed(1);
  return (
    <div className={`orch-inline-card${open ? " open" : ""}`}>
      <button className="orch-inline-card-head" onClick={() => setOpen(o => !o)}>
        <span className="orch-inline-card-title">Thought for {seconds}s</span>
        <span className="orch-inline-card-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="orch-inline-card-body"><div className="orch-thinking-text">{text}</div></div>}
    </div>
  );
}

function ToolsCard({ tools, title }) {
  const [open, setOpen] = React.useState(false);
  const [activeTool, setActiveTool] = React.useState(0);
  return (
    <div className={`orch-inline-card${open ? " open" : ""}`}>
      <button className="orch-inline-card-head" onClick={() => setOpen(o => !o)}>
        <span className="orch-inline-card-title">{title}</span>
        <span className="orch-inline-card-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="orch-inline-card-body orch-inline-card-body-tools">
          <div className="orch-tool-list">
            {tools.map((tool, i) => (
              <button key={i} className={`orch-tool-item${activeTool === i ? " active" : ""}`} onClick={() => setActiveTool(i)}>
                <span className="orch-tool-item-icon">{toolIconFor(tool)}</span>
                <span className="orch-tool-item-name">{toolDisplayName(tool)}</span>
                <span className="orch-tool-item-ms">{tool.ms}ms</span>
              </button>
            ))}
          </div>
          <div className="orch-tool-detail">
            <ToolDetail tool={tools[activeTool]} />
          </div>
        </div>
      )}
    </div>
  );
}

function toolIconFor(tool) {
  if (tool.name === "_skill") return "⊕";
  if (tool.name === "_rag") return "⌖";
  if (tool.name === "_code_exec") return "≫";
  if (tool.effect) return "✦";
  return "▸";
}
function toolDisplayName(tool) {
  if (tool.name === "_skill") return `skill: ${tool.skillName}`;
  if (tool.name === "_rag") return `rag: ${tool.query.substring(0, 40)}${tool.query.length > 40 ? "…" : ""}`;
  if (tool.name === "_code_exec") return `code_exec (${tool.lang})`;
  return tool.name;
}

function ToolDetail({ tool }) {
  if (!tool) return null;
  if (tool.name === "_skill") {
    return (
      <div className="orch-detail">
        <div className="orch-detail-label">skill loaded</div>
        <div className="orch-detail-value orch-detail-strong">{tool.skillName}</div>
        <div className="orch-detail-label">contents</div>
        <div className="orch-detail-value">{tool.desc}</div>
      </div>
    );
  }
  if (tool.name === "_rag") {
    return (
      <div className="orch-detail">
        <div className="orch-detail-label">query</div>
        <div className="orch-detail-value">"{tool.query}"</div>
        <div className="orch-detail-label">hits · {tool.hits.length}</div>
        <div className="orch-rag-hits-list">
          {tool.hits.map((h, i) => (
            <div key={i} className="orch-rag-hit">
              <div className="orch-rag-hit-meta">
                <span className="orch-rag-hit-source">{h.source}</span>
                <span className="orch-rag-hit-score">score {h.score.toFixed(2)}</span>
              </div>
              <div className="orch-rag-hit-text">{h.snippet}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (tool.name === "_code_exec") {
    return (
      <div className="orch-detail">
        <div className="orch-detail-label">code · {tool.lang}</div>
        <pre className="orch-code">{tool.code}</pre>
        <div className="orch-detail-label">return value</div>
        <pre className="orch-code">{JSON.stringify(tool.result, null, 2)}</pre>
      </div>
    );
  }
  return (
    <div className="orch-detail">
      <div className="orch-detail-label">
        tool {tool.effect && <span className="orch-detail-effect-tag">✦ mutates project state</span>}
      </div>
      <div className="orch-detail-value orch-detail-strong">{tool.name}</div>
      <div className="orch-detail-label">arguments</div>
      <pre className="orch-code">{JSON.stringify(tool.args, null, 2)}</pre>
      <div className="orch-detail-label">result · {tool.ms}ms</div>
      <pre className="orch-code">{JSON.stringify(tool.result, null, 2)}</pre>
    </div>
  );
}

function DeliverableCard({ filename, label }) {
  const [downloading, setDownloading] = React.useState(false);
  function handleDownload() {
    if (downloading) return;
    setDownloading(true);
    try {
      const data = orchEffects.export_deck_json({});
      if (!data) { setDownloading(false); return; }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      setTimeout(() => { URL.revokeObjectURL(url); setDownloading(false); }, 800);
    } catch (e) { console.error(e); setDownloading(false); }
  }
  const data = React.useMemo(() => { try { return orchEffects.export_deck_json({}); } catch { return null; } }, []);
  const sizeKb = data ? (JSON.stringify(data).length / 1024).toFixed(1) : "—";
  const cardCount = data?.cards?.length || 0;
  return (
    <button className="orch-deliverable" onClick={handleDownload} disabled={downloading} type="button">
      <div className="orch-deliverable-icon">⬇</div>
      <div className="orch-deliverable-info">
        <div className="orch-deliverable-name">{filename}</div>
        <div className="orch-deliverable-meta">{label} · {cardCount} cards · ~{sizeKb} KB</div>
      </div>
      <span className="orch-deliverable-cta">
        {downloading ? "saving…" : "download →"}
      </span>
    </button>
  );
}

function renderMarkdownish(text) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    if (!line.trim()) return <div key={i} className="orch-md-spacer" />;
    const parts = [];
    const re = /\*\*([^*]+)\*\*/g;
    let lastIdx = 0, m;
    while ((m = re.exec(line)) !== null) {
      if (m.index > lastIdx) parts.push(line.substring(lastIdx, m.index));
      parts.push(<strong key={`b${i}-${m.index}`}>{m[1]}</strong>);
      lastIdx = m.index + m[0].length;
    }
    if (lastIdx < line.length) parts.push(line.substring(lastIdx));
    return <div key={i} className="orch-md-line">{parts.length ? parts : line}</div>;
  });
}

function turnDelay(turn) {
  if (!turn) return 800;
  if (turn.kind === "user") return 700;
  if (turn.kind === "agent") return 1100 + (turn.text || "").length * 4;
  if (turn.kind === "thinking") return 1400;
  if (turn.kind === "tools") return 900 + (turn.tools || []).length * 200;
  if (turn.kind === "panel") return 1200;
  if (turn.kind === "deliverable") return 1200;
  return 800;
}

function scoreTurn(turn) {
  let cost = 0, tokens = 0, toolN = 0;
  if (turn.kind === "user") {
    const tk = Math.ceil((turn.text || "").length / 4); tokens = tk; cost = tk * 0.30 * 0.25 / 1_000_000;
  } else if (turn.kind === "agent") {
    const tk = Math.ceil((turn.text || "").length / 4) + 30; tokens = tk; cost = tk * 2.50 / 1_000_000;
  } else if (turn.kind === "thinking") {
    const tk = Math.ceil((turn.text || "").length / 4) + 50; tokens = tk; cost = tk * 3.50 / 1_000_000;
  } else if (turn.kind === "tools") {
    (turn.tools || []).forEach(tool => {
      if (!tool.name.startsWith("_")) toolN++;
      const argsTk = tool.args ? Math.ceil(JSON.stringify(tool.args).length / 4) : 0;
      const resTk = tool.result ? Math.ceil(JSON.stringify(tool.result).length / 4) : 0;
      const codeTk = tool.code ? Math.ceil(tool.code.length / 4) : 0;
      tokens += argsTk + resTk + codeTk + 80;
      cost += (argsTk + 80) * 2.50 / 1_000_000;
      cost += resTk * 0.30 * 0.25 / 1_000_000;
      cost += codeTk * 0.30 * 0.25 / 1_000_000;
    });
  }
  return { cost, tokens, toolN };
}


export default OrchestrateTab;
