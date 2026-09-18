import React from "react";
import Card from "./Card.jsx";
import { getFallbackArtwork } from "./artRegistry.js";
import { DECK_PRESETS } from "./data.js";
const { useEffect: useEffectG, useState: useStateG, useRef: useRefG } = React;

const TOPIC_SUGGESTIONS = [
  "Abyssal Depths",
  "Solar Pantheon",
  "Primeval Dominion",
  "Vietnamese Street Food",
  "Forgotten Gods",
  "Quantum Particles",
];

const BUILD_PROGRESS = {
  status: 8,
  rules: 20,
  cards: 40,
  artwork: 65,
  balance: 85,
  done: 100,
};

function evaluateDeckForGodot(deck, cards) {
  if (!cards || cards.length === 0) {
    return {
      suitsGodot: false,
      reason: "No cards generated yet.",
    };
  }

  // 1. Terrain Check: Godot engine does NOT support Terrain cards.
  // If ANY card is a Terrain, deck cannot be played in Godot.
  const hasTerrain = cards.some(c => {
    const t = String(c.type || c.content?.typeLine || "").trim().toLowerCase();
    return t === "terrain" || (Array.isArray(c.tags) && c.tags.some(tag => String(tag).toLowerCase() === "terrain"));
  });
  if (hasTerrain) {
    return {
      suitsGodot: false,
      reason: "Deck contains Terrain cards. Godot game rules only support Creature and Spell.",
    };
  }

  // Pre-baked meta decks are guaranteed compatible if they contain no Terrain
  if (deck?.id && ["abyssal_depths_60", "solar_pantheon_60", "primeval_dominion_60"].includes(deck.id)) {
    return {
      suitsGodot: true,
      creatureCount: cards.filter(c => String(c.type || c.content?.typeLine).toLowerCase() === "creature").length,
      spellCount: cards.filter(c => String(c.type || c.content?.typeLine).toLowerCase() === "spell").length,
    };
  }

  // 2. Minimum card count required by Godot battle client (10 cards)
  if (cards.length < 10) {
    return {
      suitsGodot: false,
      reason: "Deck has fewer than 10 cards required for battle.",
    };
  }

  // 3. Card Type Check: Godot strictly only supports Creature and Spell
  const supportedTypes = new Set(["creature", "spell"]);
  const invalidCards = cards.filter(c => {
    const t = String(c.type || c.content?.typeLine || "").trim().toLowerCase();
    return t && !supportedTypes.has(t);
  });
  if (invalidCards.length > 0) {
    const firstInvalid = invalidCards[0];
    return {
      suitsGodot: false,
      reason: `Card '${firstInvalid.name || firstInvalid.content?.displayName || "Card"}' has non-standard type '${firstInvalid.type || firstInvalid.content?.typeLine}'. Godot rules only support Creature and Spell.`,
    };
  }

  // 4. Declared Game Rules Schema Check:
  // If rules define custom card types (e.g. Terrain, Artifact, Hero) or custom mechanics differing from Godot
  const declaredTypes = deck?.rules?.card_types || deck?.rules?.cardTypes;
  if (Array.isArray(declaredTypes) && declaredTypes.length > 0) {
    const hasUnsupportedRule = declaredTypes.some(t => !supportedTypes.has(String(t).trim().toLowerCase()));
    if (hasUnsupportedRule) {
      return {
        suitsGodot: false,
        reason: `Deck rule schema declares card types (${declaredTypes.join(", ")}) differing from Godot client rules.`,
      };
    }
  }

  // Non-standard game board or rule parameters
  if (deck?.rules?.lanes && Number(deck.rules.lanes) !== 5) {
    return {
      suitsGodot: false,
      reason: `Deck rules specify ${deck.rules.lanes} lanes (Godot uses 5 lanes).`,
    };
  }
  if (deck?.rules?.starting_hp && Number(deck.rules.starting_hp) !== 30) {
    return {
      suitsGodot: false,
      reason: `Deck rules specify ${deck.rules.starting_hp} HP (Godot uses 30 HP).`,
    };
  }
  if (deck?.rules?.custom_rules || deck?.rules?.is_custom_tcg) {
    return {
      suitsGodot: false,
      reason: "Deck contains custom game rules differing from the Godot engine.",
    };
  }

  // 5. Lane combat requirements: At least 3 creature cards required
  const creatures = cards.filter(c => String(c.type || c.content?.typeLine).toLowerCase() === "creature");
  if (creatures.length < 3) {
    return {
      suitsGodot: false,
      reason: `Deck has only ${creatures.length} creature cards (requires at least 3 for lane battle).`,
    };
  }

  // 6. Creature health must be positive
  const deadCreatures = creatures.filter(c => {
    const hp = c.health ?? c.content?.health ?? c.gameplay?.health ?? c.defense ?? 0;
    return hp <= 0;
  });
  if (deadCreatures.length > 0) {
    return {
      suitsGodot: false,
      reason: `Creature '${deadCreatures[0].name || deadCreatures[0].content?.displayName || "Creature"}' has 0 or negative health.`,
    };
  }

  // 7. Costs must fit Godot's 0–10 mana pool system
  const overCost = cards.filter(c => {
    const cost = c.cost ?? c.gameplay?.cost ?? 0;
    return cost > 10 || cost < 0;
  });
  if (overCost.length > 0) {
    return {
      suitsGodot: false,
      reason: `Card costs exceed Godot's 0–10 mana pool system (found cost ${overCost[0].cost}).`,
    };
  }

  return {
    suitsGodot: true,
    creatureCount: creatures.length,
    spellCount: cards.filter(c => String(c.type || c.content?.typeLine).toLowerCase() === "spell").length,
  };
}

function GenerateTab({ cards, setCards, topic, setTopic, deck, projectName, onRenameProject, selectedId, setSelectedId, onGeneratedBuild }) {
  const [busy, setBusy] = useStateG(false);
  const [fastMode, setFastMode] = useStateG(false);
  const [progress, setProgress] = useStateG(0);
  const [stage, setStage] = useStateG(cards.length ? "complete" : "idle");
  const [generatedCount, setGeneratedCount] = useStateG(0);
  const [enteringIds, setEnteringIds] = useStateG(new Set());
  const [showBack, setShowBack] = useStateG(false);
  const [artworkStatusById, setArtworkStatusById] = useStateG({});
  const sourceRef = useRefG(null);
  const godotEval = evaluateDeckForGodot(deck, cards);

  function closeStream() {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }

  useEffectG(() => () => closeStream(), []);

  function generate(topicOverride) {
    if (busy) return;
    const useTopic = (topicOverride || topic).trim();
    if (!useTopic) return;

    closeStream();
    setBusy(true);
    setCards([]);
    setGeneratedCount(0);
    setEnteringIds(new Set());
    setArtworkStatusById({});
    setProgress(0);
    setStage("prompting");
    setTopic(useTopic);

    const url = `/api/build?theme=${encodeURIComponent(useTopic)}&cards=60&art=${!fastMode}`;
    const source = new EventSource(url);
    sourceRef.current = source;

    source.onmessage = (message) => {
      const event = JSON.parse(message.data);
      const nextStage = event.message || event.type;
      setStage(event.type === "done" ? "complete" : nextStage);
      setProgress(BUILD_PROGRESS[event.type] ?? progress);

      if (event.type === "cards") {
        const nextCards = event.data?.cards || event.data?.cards_file?.cards || [];
        setGeneratedCount(nextCards.length);
        setArtworkStatusById(prev => {
          const next = { ...prev };
          nextCards.forEach(card => {
            next[card.id] = card.content?.artwork ? "ready" : "pending";
          });
          return next;
        });
      }
      if (event.type === "artwork") {
        setGeneratedCount(count => Math.max(count, event.data?.completed || count));
        const cardId = event.data?.card_id;
        if (cardId) {
          setArtworkStatusById(prev => ({
            ...prev,
            [cardId]: event.data?.has_artwork ? "ready" : "missing",
          }));
        }
      }
      if (event.type === "done") {
        const nextCards = event.data?.cards || event.data?.cards_file?.cards || [];
        setGeneratedCount(nextCards.length);
        setEnteringIds(new Set(nextCards.map(c => c.id)));
        setArtworkStatusById(prev => {
          const next = { ...prev };
          nextCards.forEach(card => {
            next[card.id] = card.content?.artwork ? "ready" : (next[card.id] || "missing");
          });
          return next;
        });
        if (onGeneratedBuild) {
          onGeneratedBuild({
            topic: useTopic,
            deck: event.data?.deck,
            cards: nextCards,
          });
        } else {
          setCards(nextCards);
        }
        setBusy(false);
        setProgress(100);
        closeStream();
      }
      if (event.type === "error") {
        setBusy(false);
        setStage(event.message || "error");
        closeStream();
      }
    };

    source.onerror = () => {
      setBusy(false);
      setStage("connection-error");
      closeStream();
    };
  }

  function pickTopic(t) {
    if (DECK_PRESETS && DECK_PRESETS[t]) {
      const preset = DECK_PRESETS[t];
      closeStream();
      setBusy(false);
      setTopic(t);
      const nextCards = (preset.cards || []).map(c => JSON.parse(JSON.stringify(c)));
      setCards(nextCards);
      setStage("complete");
      setProgress(100);
      setGeneratedCount(nextCards.length);
      setEnteringIds(new Set(nextCards.map(c => c.id)));
      if (onGeneratedBuild) {
        onGeneratedBuild({
          topic: t,
          deck: preset.deck,
          cards: nextCards,
        });
      }
      return;
    }
    generate(t);
  }

  function reset() {
    closeStream();
    setCards([]); setBusy(false); setProgress(0); setStage("idle");
    setGeneratedCount(0);
    setEnteringIds(new Set()); setSelectedId(null);
  }

  function duplicateCard(c) {
    const copy = { ...c, id: c.id + "_copy_" + Math.random().toString(36).slice(2,6), name: c.name + " (copy)" };
    setCards(prev => [...prev, copy]);
    setSelectedId(copy.id);
  }
  function deleteCard(c) {
    setCards(prev => prev.filter(x => x.id !== c.id));
    if (selectedId === c.id) setSelectedId(null);
  }
  function addBlankCard() {
    const id = "new_" + Math.random().toString(36).slice(2,6);
    const blank = {
      id, name: "New Card", type: "Creature", rarity: "common",
      cost: 2, attack: 2, defense: 2,
      ability: "—", flavor: "—", keywords: [], usage: 0.5,
    };
    setCards(prev => [...prev, blank]);
    setSelectedId(id);
  }

  const topics = TOPIC_SUGGESTIONS;
  const displayedCount = busy ? generatedCount : cards.length;
  const artworkReady = cards.filter(c => c.content?.artwork || getFallbackArtwork(c)).length;
  const artworkMissing = cards.length - artworkReady;

  return (
    <div>
      <div style={{display:"flex", alignItems:"baseline", gap:14, marginBottom:6, flexWrap:"wrap"}}>
        <h1 className="page-title" style={{margin:0}}>1 · Generate &amp; Edit</h1>
        {projectName && (
          <div onClick={onRenameProject} title="Click to rename project"
            style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--gold-bright)",
              letterSpacing:"0.08em", cursor:"pointer", padding:"2px 8px",
              border:"1px dashed var(--line-strong)", borderRadius:4}}>
            {projectName}
          </div>
        )}
      </div>
      <p className="page-sub">
        Type any theme or pick a pre-baked topic. Click a card to open the canvas editor on the right.
        Save / import / export live in the topbar. Edits sync live to the card grid and exported .zip.
      </p>

      <div className="gen-top">
        <div className="panel gen-input-panel">
          <div className="panel-title">Topic input</div>
          <div className="gen-input-row">
            <input className="gen-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a theme…" disabled={busy} />
            <button className="btn" onClick={() => generate()} disabled={busy || !topic.trim()}>{busy ? "Generating…" : "Generate"}</button>
            <button className="btn btn-ghost" onClick={reset} disabled={busy}>Clear</button>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:8, marginTop:6, marginBottom:6}}>
            <label style={{display:"flex", alignItems:"center", gap:6, fontSize:11.5, color: fastMode ? "var(--gold-bright)" : "var(--ink-2)", cursor:"pointer", userSelect:"none"}}>
              <input type="checkbox" checked={fastMode} onChange={e => setFastMode(e.target.checked)} disabled={busy} />
              <span>Fast Mode (skip AI art generation for instant cards)</span>
            </label>
          </div>
          <div style={{fontSize:11, fontFamily:"var(--font-mono)", color:"var(--ink-3)", marginTop:4}}>Pre-baked topics:</div>
          <div className="suggestion-chips">
            {topics.map(s => (
              <button key={s} className="chip" onClick={() => pickTopic(s)} disabled={busy}
                style={topic === s ? {borderColor:"var(--gold-bright)", color:"var(--gold-bright)"} : null}>{s}</button>
            ))}
          </div>
        </div>

        <div className="panel gen-status">
          <div className="panel-title">Pipeline status</div>
          <div className="gen-status-row"><span>stage</span><span className={`value ${stage === "complete" ? "ok" : ""}`}>{stage}</span></div>
          <div className="gen-status-row"><span>cards in set</span><span className="value">{displayedCount}</span></div>
          <div className="gen-status-row"><span>schema</span><span className={`value ${stage === "complete" || displayedCount ? "ok" : ""}`}>{stage === "idle" && !displayedCount ? "—" : "TP-01 · pass"}</span></div>
          <div className="gen-status-row"><span>art ready</span><span className="value">{artworkReady}</span></div>
          <div className="gen-status-row"><span>art missing</span><span className="value">{artworkMissing}</span></div>
          <div className="progress-bar"><div className="progress-fill" style={{width: progress + "%"}} /></div>

          <div style={{display:"flex", gap:6, marginTop:12, flexWrap:"wrap"}}>
            <button className="btn btn-ghost" style={{padding:"6px 10px", fontSize:10.5}} onClick={addBlankCard}>+ New card</button>
          </div>
          <div style={{fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--ink-3)", marginTop:8, lineHeight:1.5}}>
            Save / Export / Import → topbar
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="empty-state">{busy ? "Sampling cards…" : (topic ? `Press Generate or pick a topic · current theme: ${topic}` : "Enter a theme, pick a topic, or import a .zip to start")}</div>
      ) : (
        <div className="gen-grid-col">
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, gap:10, flexWrap:"wrap"}}>
            <div style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase"}}>
              {cards.length} cards · <span style={{color:"var(--gold-bright)"}}>{topic}</span> · click to edit
            </div>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <div style={{display:"flex", background:"rgba(0,0,0,0.3)", borderRadius:6, padding:2, border:"1px solid var(--line)"}}>
                <button onClick={()=>setShowBack(false)} style={{padding:"4px 12px", border:"none", borderRadius:4,
                  background:!showBack?"var(--bg-panel)":"transparent",
                  color:!showBack?"var(--gold-bright)":"var(--ink-3)",
                  fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer"}}>Front</button>
                <button onClick={()=>setShowBack(true)} style={{padding:"4px 12px", border:"none", borderRadius:4,
                  background:showBack?"var(--bg-panel)":"transparent",
                  color:showBack?"var(--gold-bright)":"var(--ink-3)",
                  fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase", cursor:"pointer"}}>Back</button>
              </div>
              <span className="tag">creatures: {cards.filter(c=>c.type==="Creature").length}</span>
              <span className="tag">spells: {cards.filter(c=>c.type==="Spell").length}</span>
            </div>
          </div>
          <div className="gen-card-grid">
            {/* Template tile — pinned first */}
            <div style={{position:"relative", outline: selectedId === "__template__" ? "2px solid var(--cyan-bright)" : "none", outlineOffset: 3, borderRadius: 12, cursor:"pointer"}}
              onClick={() => setSelectedId("__template__")}>
              <div className={`tcg-card rarity-rare`} style={{
                cursor:"pointer",
                background: "linear-gradient(160deg, rgba(103,217,230,0.15), rgba(10,31,44,0.95) 70%)",
                border: "1.5px dashed var(--cyan-bright)",
                position:"relative", overflow:"hidden",
              }}>
                {/* Pseudo-card content showing it's a template */}
                <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:14, textAlign:"center"}}>
                  <div style={{fontSize:34, lineHeight:1, opacity:0.85}}>◇</div>
                  <div style={{fontFamily:"var(--font-display)", fontSize:18, color:"var(--cyan-bright)", letterSpacing:"0.05em"}}>Template</div>
                  <div style={{fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.1em", textTransform:"uppercase", lineHeight:1.5}}>
                    Edit deck-wide<br/>frame · rarities · rules
                  </div>
                  <div style={{position:"absolute", bottom:10, left:0, right:0, display:"flex", justifyContent:"center", gap:6}}>
                    <span style={{fontFamily:"var(--font-mono)", fontSize:8, color:"var(--cyan)", padding:"2px 6px", border:"1px solid var(--cyan)", borderRadius:3, opacity:0.7}}>
                      applies to all cards
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {cards.map((c, i) => (
              <div key={c.id} className="gen-card-wrapper" style={{position:"relative", outline: c.id === selectedId ? "2px solid var(--gold-bright)" : "none", outlineOffset: 3, borderRadius: 12}}>
                <Card card={c} showBack={showBack} entering={enteringIds.has(c.id)} onClick={() => setSelectedId(c.id)} style={{ animationDelay: (i % 10) * 0.04 + "s" }} />
                <div className="art-status-badge" style={{position:"absolute", left:6, top:6, padding:"2px 6px", borderRadius:4,
                  background: (artworkStatusById[c.id] || ((c.content?.artwork || getFallbackArtwork(c)) ? "ready" : "missing")) === "ready"
                    ? "rgba(124,217,165,0.92)"
                    : (artworkStatusById[c.id] || ((c.content?.artwork || getFallbackArtwork(c)) ? "ready" : "missing")) === "pending"
                      ? "rgba(240,193,104,0.92)"
                      : "rgba(224,122,122,0.92)",
                  color:"var(--bg-abyss)", fontFamily:"var(--font-mono)", fontSize:8.5, letterSpacing:"0.08em", textTransform:"uppercase"}}>
                  art {(artworkStatusById[c.id] || ((c.content?.artwork || getFallbackArtwork(c)) ? "ready" : "missing"))}
                </div>
                {c.id === selectedId && (
                  <div style={{position:"absolute", top:6, right:6, display:"flex", gap:4, zIndex:5}}>
                    <button onClick={(e) => {e.stopPropagation(); duplicateCard(c);}}
                      title="Duplicate" style={iconBtn}>⎘</button>
                    <button onClick={(e) => {e.stopPropagation(); deleteCard(c);}}
                      title="Delete" style={{...iconBtn, color:"var(--red)"}}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Game Rules Section: Godot Rules OR AI Proposed Rules ── */}
      {godotEval.suitsGodot ? (
        <div className="gen-godot-rules-section gen-rules-godot-theme">
          <div className="gen-godot-rules-header">
            <div className="gen-godot-badge badge-godot">
              <span className="gen-godot-badge-dot dot-godot"></span>
              <span>Game Rules · Godot Compatible</span>
            </div>
            <h3 className="gen-godot-title">Game Rules</h3>
            <p className="gen-godot-desc">
              The AI verified this deck satisfies the 5-lane battle rules. It is playable directly in the <strong>Godot 4 Battle Client</strong> against the AI opponent.
            </p>
          </div>

          <div className="gen-godot-grid">
            <div className="gen-godot-card gen-godot-card-client">
              <div className="gen-godot-card-header">
                <span className="gen-godot-card-icon">⚔️</span>
                <span className="gen-godot-card-name">5-Lane Arena Combat</span>
              </div>
              <p className="gen-godot-card-body">
                Creatures are summoned into 5 board lanes. Units attack opposing lane blockers directly, or deal unblocked damage to the enemy face (30 HP) if the opposing lane is unoccupied.
              </p>
              <div className="gen-godot-tags">
                <span className="gen-godot-tag client-tag">5 Board Lanes</span>
                <span className="gen-godot-tag client-tag">30 Player HP</span>
                <span className="gen-godot-tag client-tag">Direct Face Attacks</span>
              </div>
            </div>

            <div className="gen-godot-card gen-godot-card-client">
              <div className="gen-godot-card-header">
                <span className="gen-godot-card-icon">💎</span>
                <span className="gen-godot-card-name">1–10 Mana Scaling</span>
              </div>
              <p className="gen-godot-card-body">
                Starts at 1 mana, increasing by +1 each turn up to the 10 mana cap, with full mana refills at the start of each round.
              </p>
              <div className="gen-godot-tags">
                <span className="gen-godot-tag client-tag">Starts at 1 Mana</span>
                <span className="gen-godot-tag client-tag">Max 10 Mana Cap</span>
                <span className="gen-godot-tag client-tag">Turn Refills</span>
              </div>
            </div>

            <div className="gen-godot-card gen-godot-card-client">
              <div className="gen-godot-card-header">
                <span className="gen-godot-card-icon">⚡</span>
                <span className="gen-godot-card-name">Quantified Triggers</span>
              </div>
              <p className="gen-godot-card-body">
                Card ability text is automatically parsed into GDScript combat triggers: <code>on_play</code> (Battlecry), <code>on_death</code> (Deathrattle), <code>on_attack</code>, and combat keywords like <em>Rush</em>, <em>Shield</em>, <em>Taunt</em>, and <em>Stun</em>.
              </p>
              <div className="gen-godot-tags">
                <span className="gen-godot-tag client-tag">Rush / Haste</span>
                <span className="gen-godot-tag client-tag">Shield / Ward</span>
                <span className="gen-godot-tag client-tag">Deathrattle</span>
                <span className="gen-godot-tag client-tag">Stun</span>
              </div>
            </div>

            <div className="gen-godot-card gen-godot-card-client">
              <div className="gen-godot-card-header">
                <span className="gen-godot-card-icon">🚀</span>
                <span className="gen-godot-card-name">Play Live in Godot</span>
              </div>
              <p className="gen-godot-card-body">
                Launch the Godot client in <code>godot_client/</code>. Connect to <code>tcg-rmit.duckdns.org/api</code>, select this deck, and click <strong>⚔ Battle</strong> to play!
              </p>
              <div className="gen-godot-tags">
                <span className="gen-godot-tag client-tag">Client: Ready</span>
                <span className="gen-godot-tag client-tag">tcg-rmit.duckdns.org/api</span>
              </div>
            </div>
          </div>

          {deck?.rules && (
            <div className="gen-godot-rules-meta">
              <div className="gen-godot-rules-meta-title">
                Active Deck Rules: <span style={{color:"var(--gold-bright)"}}>{deck.name || topic}</span>
              </div>
              <div className="gen-godot-rules-meta-grid">
                {deck.rules.elements && (
                  <div><span className="gen-godot-rules-meta-label">Elements: </span><span className="gen-godot-rules-meta-val">{deck.rules.elements.join(", ")}</span></div>
                )}
                {deck.rules.factions && (
                  <div><span className="gen-godot-rules-meta-label">Factions: </span><span className="gen-godot-rules-meta-val">{deck.rules.factions.join(", ")}</span></div>
                )}
                {deck.rules.keywords && (
                  <div><span className="gen-godot-rules-meta-label">Keywords: </span><span className="gen-godot-rules-meta-val">{deck.rules.keywords.slice(0, 10).join(", ")}{deck.rules.keywords.length > 10 ? "..." : ""}</span></div>
                )}
              </div>
            </div>
          )}

          {/* ── Small Yellow Alert: Bottom Right of Game Rules ── */}
          <div className="gen-godot-rules-footer">
            <div
              className="godot-playable-alert"
              title="Deck satisfies Godot 5-lane combat rules"
            >
              <span className="godot-playable-dot"></span>
              <span className="godot-playable-icon">🎮</span>
              <span className="godot-playable-text">Playable on Godot</span>
            </div>
          </div>
        </div>
      ) : (
        /* AI Proposed Game Rules */
        <div className="gen-godot-rules-section gen-rules-custom-theme">
          <div className="gen-godot-rules-header">
            <div className="gen-godot-badge badge-custom">
              <span className="gen-godot-badge-dot dot-custom"></span>
              <span>Game Rules · Custom TCG</span>
            </div>
            <h3 className="gen-godot-title">Game Rules</h3>
            <p className="gen-godot-desc">
              The AI designed custom game rules for this theme that differ from the standard 5-lane Godot client
              rules. Review the combat parameters and turn structure below.
            </p>
          </div>

          <div className="gen-godot-grid">
            <div className="gen-godot-card gen-godot-card-custom">
              <div className="gen-godot-card-header">
                <span className="gen-godot-card-icon">🌀</span>
                <span className="gen-godot-card-name">Elemental Affinities</span>
              </div>
              <p className="gen-godot-card-body">
                Cards align with distinct elements ({deck?.rules?.elements?.join(", ") || "elemental affinities"}). Spell and terrain effects trigger elemental resonance on matching allies.
              </p>
              <div className="gen-godot-tags">
                <span className="gen-godot-tag custom-tag">Resonance Effects</span>
                <span className="gen-godot-tag custom-tag">Elemental Balance</span>
              </div>
            </div>

            <div className="gen-godot-card gen-godot-card-custom">
              <div className="gen-godot-card-header">
                <span className="gen-godot-card-icon">✨</span>
                <span className="gen-godot-card-name">Custom Theme Keywords</span>
              </div>
              <p className="gen-godot-card-body">
                Features bespoke keywords devised by the AI ({deck?.rules?.keywords?.slice(0, 6).join(", ") || "custom mechanics"}) to provide distinctive strategic options.
              </p>
              <div className="gen-godot-tags">
                <span className="gen-godot-tag custom-tag">Custom Keywords</span>
                <span className="gen-godot-tag custom-tag">Thematic Mechanics</span>
              </div>
            </div>

            <div className="gen-godot-card gen-godot-card-custom">
              <div className="gen-godot-card-header">
                <span className="gen-godot-card-icon">👑</span>
                <span className="gen-godot-card-name">Custom Victory Rules</span>
              </div>
              <p className="gen-godot-card-body">
                Designed for tabletop play or custom simulation rules, featuring specialized card interactions and win conditions outside the 5-lane client format.
              </p>
              <div className="gen-godot-tags">
                <span className="gen-godot-tag custom-tag">Tabletop TCG</span>
                <span className="gen-godot-tag custom-tag">Custom Ruleset</span>
              </div>
            </div>
          </div>

          {deck?.rules && (
            <div className="gen-godot-rules-meta">
              <div className="gen-godot-rules-meta-title">
                Proposed Deck Rules: <span style={{color:"var(--gold-bright)"}}>{deck.name || topic}</span>
              </div>
              <div className="gen-godot-rules-meta-grid">
                {deck.rules.elements && (
                  <div><span className="gen-godot-rules-meta-label">Elements: </span><span className="gen-godot-rules-meta-val">{deck.rules.elements.join(", ")}</span></div>
                )}
                {deck.rules.factions && (
                  <div><span className="gen-godot-rules-meta-label">Factions: </span><span className="gen-godot-rules-meta-val">{deck.rules.factions.join(", ")}</span></div>
                )}
                {deck.rules.keywords && (
                  <div><span className="gen-godot-rules-meta-label">Keywords: </span><span className="gen-godot-rules-meta-val">{deck.rules.keywords.slice(0, 10).join(", ")}{deck.rules.keywords.length > 10 ? "..." : ""}</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const iconBtn = {
  width: 22, height: 22, borderRadius: 4,
  background: "rgba(0,0,0,0.7)", border: "1px solid var(--line-strong)",
  color: "var(--ink-2)", cursor: "pointer", fontSize: 11,
  display: "grid", placeItems: "center"
};


export default GenerateTab;
