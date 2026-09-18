import React from "react";
import Card from "./Card.jsx";
import Templates from "./templates.js";
import { DECK_PRESETS } from "./data.js";
import { getFallbackArtwork } from "./artRegistry.js";

const { useEffect: useEffectG, useState: useStateG, useRef: useRefG } = React;

const BUILD_PROGRESS = {
  status: 8,
  rules: 20,
  cards: 40,
  artwork: 65,
  balance: 85,
  done: 100,
};

function cloneCards(cards) {
  return JSON.parse(JSON.stringify(cards || []));
}

function materializeCards(cards, tpl) {
  const safeCards = Array.isArray(cards) ? cards : [];
  return safeCards.map(card => (tpl ? Templates.materialiseLayers(card, tpl) : card));
}

function DeckTab({
  cards,
  setCards,
  topic,
  setTopic,
  template,
  projectName,
  onRenameProject,
  selectedId,
  setSelectedId,
  onGeneratedBuild,
  balanceRounds,
  setBalanceRounds,
  validateRules,
  valBusy,
  ruleConflicts,
}) {
  const [busy, setBusy] = useStateG(false);
  const [fastMode, setFastMode] = useStateG(false);
  const [progress, setProgress] = useStateG(cards.length ? 100 : 0);
  const [stage, setStage] = useStateG(cards.length ? "ready" : "idle");
  const [view, setView] = useStateG("before");
  const [beforeCards, setBeforeCards] = useStateG([]);
  const [afterCards, setAfterCards] = useStateG([]);
  const [generatedCount, setGeneratedCount] = useStateG(0);
  const [artworkStatusById, setArtworkStatusById] = useStateG({});
  const sourceRef = useRefG(null);

  function closeStream() {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }

  useEffectG(() => () => closeStream(), []);

  const hasComparisonSession = beforeCards.length > 0 || afterCards.length > 0;
  const currentCards = view === "after" && afterCards.length
    ? afterCards
    : (hasComparisonSession ? beforeCards : cards);
  const renderedCards = materializeCards(currentCards, template);

  const buildCount = Math.max(12, Math.min(cards.length || 60, 100));

  function formatBalanceStage(event, cardCount) {
    const msg = event.message || event.type || "";
    if (event.type === "rules" || msg.includes("rules") || msg.includes("Designing rules")) {
      return "Verifying archetype & balance constraints...";
    }
    if (event.type === "cards" || msg.includes("Generating") || msg.includes("Generated")) {
      return `Analyzing & balancing ${cardCount || 60} cards...`;
    }
    if (event.type === "artwork" || msg.includes("artwork")) {
      return "Auditing artwork assets...";
    }
    if (event.type === "balance" || msg.includes("Balancing")) {
      const roundNum = event.data?.round;
      return roundNum ? `Simulating matchup round ${roundNum}...` : "Simulating matchups & optimizing balance...";
    }
    if (event.type === "done") {
      return "Deck balance optimization complete";
    }
    return msg;
  }

  function runBalanceEngine(topicOverride) {
    if (busy) return;
    const useTopic = (topicOverride || topic).trim();
    if (!useTopic) return;

    closeStream();
    setBusy(true);
    setBeforeCards(cloneCards(cards));
    setAfterCards([]);
    setBalanceRounds([]);
    setArtworkStatusById({});
    setGeneratedCount(0);
    setProgress(0);
    setStage("Analyzing deck balance...");
    setView("before");
    setTopic(useTopic);

    const source = new EventSource(`/api/build?theme=${encodeURIComponent(useTopic)}&cards=${buildCount}&art=${!fastMode}`);
    sourceRef.current = source;

    source.onmessage = (message) => {
      const event = JSON.parse(message.data);
      setStage(formatBalanceStage(event, currentCards.length || buildCount));
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
        const cardId = event.data?.card_id;
        if (cardId) {
          setArtworkStatusById(prev => ({
            ...prev,
            [cardId]: event.data?.has_artwork ? "ready" : "missing",
          }));
        }
      }

      if (event.type === "balance") {
        setBalanceRounds(prev => [...prev, {
          round: event.data?.round ?? prev.length + 1,
          metrics: event.data?.metrics,
          decision: event.data?.decision,
        }]);
      }

      if (event.type === "done") {
        const nextCards = event.data?.cards || event.data?.cards_file?.cards || [];
        setGeneratedCount(nextCards.length);
        setAfterCards(materializeCards(cloneCards(nextCards), template));
        setArtworkStatusById(prev => {
          const next = { ...prev };
          nextCards.forEach(card => {
            next[card.id] = card.content?.artwork ? "ready" : (next[card.id] || "missing");
          });
          return next;
        });
        setView("after");
        setBusy(false);
        setProgress(100);
        closeStream();
        if (onGeneratedBuild) {
          onGeneratedBuild({
            topic: useTopic,
            deck: event.data?.deck,
            cards: nextCards,
          });
        } else {
          setCards(materializeCards(nextCards, template));
        }
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
      loadPresetDeck(t);
    } else {
      runBalanceEngine(t);
    }
  }

  function reset() {
    closeStream();
    setBeforeCards([]);
    setAfterCards([]);
    setBalanceRounds([]);
    setBusy(false);
    setProgress(0);
    setStage(cards.length ? "ready" : "idle");
    setGeneratedCount(0);
    setView("before");
    setSelectedId(null);
  }

  const curve = Array(8).fill(0);
  currentCards.forEach(c => { const cost = Math.min(7, c.cost); curve[cost]++; });
  const maxCount = Math.max(1, ...curve);
  const rarityCount = { common: 0, rare: 0, epic: 0, legendary: 0 };
  currentCards.forEach(c => rarityCount[c.rarity]++);

  function loadPresetDeck(presetName) {
    const preset = DECK_PRESETS[presetName];
    if (!preset) return;
    closeStream();
    setTopic(presetName);
    const newCards = cloneCards(preset.cards);
    setCards(materializeCards(newCards, preset.deck.template));
    setBeforeCards([]);
    setAfterCards([]);
    setBusy(false);
    setProgress(100);
    setStage("ready");
    setView("before");
    if (onGeneratedBuild) {
      onGeneratedBuild({
        topic: presetName,
        deck: preset.deck,
        cards: newCards,
      });
    }
  }

  function deckStats(d) {
    const creatures = d.filter(c => c.type === "Creature");
    const spells = d.filter(c => c.type === "Spell");
    const avgCost = d.reduce((s, c) => s + (c.cost || 0), 0) / Math.max(1, d.length);
    const avgRatio = creatures.length === 0 ? 0 : creatures.reduce((s, c) => s + ((c.attack || 0) + (c.defense || 0)) / Math.max(1, c.cost || 1), 0) / creatures.length;
    const ratios = creatures.map(c => ((c.attack || 0) + (c.defense || 0)) / Math.max(1, c.cost || 1));
    const variance = ratios.reduce((s, r) => s + (r - avgRatio) ** 2, 0) / Math.max(1, ratios.length);
    const elements = {};
    d.forEach(c => {
      const el = c.element || c.gameplay?.element || "neutral";
      elements[el] = (elements[el] || 0) + 1;
    });
    return { avgCost, avgRatio, variance, creatureCount: creatures.length, spellCount: spells.length, elements };
  }

  const stats = deckStats(currentCards);
  const hasArt = c => c.content?.artwork || c.frontLayers?.some(l => l.id === "artwork" && l.src) || getFallbackArtwork(c);
  const artworkReady = renderedCards.filter(hasArt).length;
  const artworkMissing = renderedCards.length - artworkReady;

  return (
    <div>
      <div style={{display:"flex", alignItems:"baseline", gap:14, marginBottom:6, flexWrap:"wrap"}}>
        <h1 className="page-title" style={{margin:0}}>2 · Deck Balance</h1>
        {projectName && (
          <div onClick={onRenameProject} title="Click to rename project"
            style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--gold-bright)",
              letterSpacing:"0.08em", cursor:"pointer", padding:"2px 8px",
              border:"1px dashed var(--line-strong)", borderRadius:4}}>
            ◆ {projectName}
          </div>
        )}
      </div>
      <p className="page-sub">
        Run the real backend build pipeline, then inspect the resulting balanced deck, balance rounds, and card distribution.
      </p>

      <div className="panel" style={{marginBottom:18, padding:"16px 20px"}}>
        <div style={{display:"flex", alignItems:"center", gap:18, flexWrap:"wrap"}}>
          <div style={{flex:1, minWidth:280}}>
            <div className="panel-title">Theme</div>
            <input
              className="gen-input"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Enter a theme…"
              disabled={busy}
              style={{maxWidth:"100%"}}
            />
          </div>

          <div style={{display:"flex", background:"rgba(0,0,0,0.3)", borderRadius:8, padding:3, border:"1px solid var(--line)"}}>
            <button onClick={() => setView("before")} className="chip"
              style={{padding:"8px 16px", background: view === "before" ? "var(--red)" : "transparent",
                color: view === "before" ? "var(--bg-abyss)" : "var(--ink-2)", border:"none", fontWeight: view === "before" ? 600 : 400}}>
              ① Before · current
            </button>
            <button onClick={() => setView("after")} className="chip"
              style={{padding:"8px 16px", background: view === "after" ? "var(--green)" : "transparent",
                color: view === "after" ? "var(--bg-abyss)" : "var(--ink-2)", border:"none", fontWeight: view === "after" ? 600 : 400, opacity: afterCards.length ? 1 : 0.6}}>
              ② After · backend result {afterCards.length ? `(${generatedCount || afterCards.length} cards)` : ""}
            </button>
          </div>

          <div style={{width:"100%", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginTop:4}}>
            <span style={{fontSize:11, color:"var(--gold-bright)", fontFamily:"var(--font-mono)", fontWeight:600}}>
              Prebaked Decks:
            </span>
            {["Abyssal Depths", "Solar Pantheon", "Primeval Dominion"].map(pName => (
              <button
                key={pName}
                onClick={() => loadPresetDeck(pName)}
                className="chip"
                type="button"
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 14,
                  border: topic === pName ? "1px solid var(--gold-bright)" : "1px solid var(--line)",
                  background: topic === pName ? "rgba(240,193,104,0.15)" : "rgba(255,255,255,0.04)",
                  color: topic === pName ? "var(--gold-bright)" : "var(--ink-2)",
                  cursor: "pointer",
                }}
              >
                {pName}
              </button>
            ))}
          </div>

          <div style={{width:"100%", display:"flex", gap:14, flexWrap:"wrap", marginTop:6, paddingTop:10, borderTop:"1px solid var(--line)"}}>
            <span style={{fontSize:11, color:"var(--ink-1)", fontFamily:"var(--font-mono)"}}>
              Deck Size: <strong style={{color:"var(--gold-bright)"}}>{currentCards.length} cards</strong>
            </span>
            <span style={{fontSize:11, color:"var(--ink-2)", fontFamily:"var(--font-mono)"}}>
              Creatures: <strong>{stats.creatureCount}</strong>
            </span>
            <span style={{fontSize:11, color:"var(--ink-2)", fontFamily:"var(--font-mono)"}}>
              Spells: <strong>{stats.spellCount}</strong>
            </span>
            <span style={{fontSize:11, color:"var(--ink-2)", fontFamily:"var(--font-mono)"}}>
              Elements: {Object.entries(stats.elements || {}).map(([el, cnt]) => `${el} (${cnt})`).join(", ") || "None"}
            </span>
          </div>

          {ruleConflicts && ruleConflicts.length > 0 && (
          <div style={{ border: "1px solid var(--red)", background: "rgba(224,122,122,0.06)", padding: "12px 16px", marginBottom: 14, borderRadius: 6, width: "100%" }}>
            <div style={{ color: "var(--red)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              Rule Validation Conflicts ({ruleConflicts.length})
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              {ruleConflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

          <button onClick={() => runBalanceEngine()} disabled={busy || !topic.trim()}
            style={{padding:"8px 18px",
              background: busy ? "rgba(216,166,75,0.2)" : "linear-gradient(180deg, var(--gold-bright), var(--gold))",
              color: busy ? "var(--gold-bright)" : "var(--bg-abyss)",
              border:"1px solid var(--gold-bright)", borderRadius:6,
              fontFamily:"var(--font-display)", fontSize:12, fontWeight:600, letterSpacing:"0.05em",
              cursor: busy ? "default" : "pointer"}}>
            {busy ? `Streaming… ${Math.round(progress)}%` : "Run backend balance"}
          </button>

          <button onClick={reset} disabled={busy}
            style={{padding:"8px 16px",
              background:"transparent",
              color:"var(--ink-2)",
              border:"1px solid var(--line)", borderRadius:6,
              fontFamily:"var(--font-display)", fontSize:12, fontWeight:600,
              cursor: busy ? "default" : "pointer"}}>
            Reset view
          </button>

          <button onClick={validateRules} disabled={valBusy || busy || !cards.length}
            style={{padding:"8px 16px",
              background: valBusy ? "rgba(103,217,230,0.2)" : "transparent",
              color: "var(--cyan-bright)",
              border:"1px solid var(--cyan-bright)", borderRadius:6,
              fontFamily:"var(--font-display)", fontSize:12, fontWeight:600,
              cursor: (valBusy || busy || !cards.length) ? "default" : "pointer"}}>
            {valBusy ? "Validating..." : "Validate Rules & Conflicts"}
          </button>

          <label style={{display:"flex", alignItems:"center", gap:6, fontSize:11.5, color: fastMode ? "var(--gold-bright)" : "var(--ink-2)", cursor:"pointer", userSelect:"none", marginLeft: 4}}>
            <input type="checkbox" checked={fastMode} onChange={e => setFastMode(e.target.checked)} disabled={busy} />
            <span>Fast Mode (skip AI art)</span>
          </label>
        </div>

        <div style={{marginTop:14, display:"flex", gap:18, justifyContent:"space-between", alignItems:"center", flexWrap:"wrap"}}>
          <div style={{flex:1, minWidth:260}}>
            <div className="gen-status-row"><span>stage</span><span className={`value ${stage === "done" ? "ok" : ""}`}>{stage}</span></div>
            <div className="gen-status-row"><span>cards in view</span><span className="value">{currentCards.length}</span></div>
            <div className="gen-status-row"><span>balance rounds</span><span className="value">{balanceRounds.length}</span></div>
          </div>
          <div style={{flex:1, minWidth:260}}>
            <div className="progress-bar"><div className="progress-fill" style={{width: progress + "%"}} /></div>
          </div>
          <div style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", minWidth:180, textAlign:"right"}}>
            cards requested: {buildCount}
          </div>
        </div>

        <div style={{marginTop:10, display:"flex", gap:12, flexWrap:"wrap", fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--ink-3)"}}>
          <span className="tag">art ready: {artworkReady}</span>
          <span className="tag">art missing: {artworkMissing}</span>
          <span className="tag">status source: backend artwork events</span>
        </div>

        <div style={{display:"flex", gap:6, marginTop:12, flexWrap:"wrap"}}>
          {["Abyssal Depths", "Solar Pantheon", "Primeval Dominion", "Vietnamese Street Food", "Forgotten Gods", "Quantum Particles"].map(s => (
            <button key={s} className="chip" onClick={() => pickTopic(s)} disabled={busy}
              style={topic === s ? {borderColor:"var(--gold-bright)", color:"var(--gold-bright)"} : null}>{s}</button>
          ))}
        </div>
      </div>

      {!currentCards.length ? (
        <div className="empty-state">{busy ? "Streaming backend balance rounds…" : (topic ? `Press Run backend balance to analyze deck · current theme: ${topic}` : "No cards in deck yet. Generate or import cards first.")}</div>
      ) : (
        <div className="deck-layout-v6">
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
              <div style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase"}}>
                Deck B · {currentCards.length} cards · {view === "before" ? "CURRENT PROJECT" : "BACKEND RESULT"}
              </div>
            </div>
            <div className="deck-grid">
              {renderedCards.map(c => {
                const isSel = c.id === selectedId;
                const artStatus = artworkStatusById[c.id] || (c.content?.artwork ? "ready" : "missing");
                return (
                  <div key={c.id} className="deck-card-wrapper" style={{outline: isSel ? "2px solid var(--gold-bright)" : "none", outlineOffset: 4, borderRadius: 12, position:"relative"}}>
                    <Card card={c} compact onClick={() => setSelectedId(c.id)} />
                    <div className="art-status-badge" style={{position:"absolute", right:6, bottom:6, padding:"2px 6px", borderRadius:4,
                      background: artStatus === "ready" ? "rgba(124,217,165,0.92)" : artStatus === "pending" ? "rgba(240,193,104,0.92)" : "rgba(224,122,122,0.92)",
                      color:"var(--bg-abyss)", fontFamily:"var(--font-mono)", fontSize:8.5, letterSpacing:"0.08em", textTransform:"uppercase", pointerEvents:"none"}}>
                      art {artStatus}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="deck-side-panels">
              <div className="panel">
                <div className="panel-title">Mana curve · {view}</div>
                <div className="curve-chart">
                  {curve.map((n, i) => (
                    <div key={i} className="curve-bar" data-cost={i} style={{ height: (n / maxCount * 90 + 6) + "%" }}>
                      {n > 0 && <span className="count">{n}</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="panel">
                <div className="panel-title">Rarity composition</div>
                <div className="rarity-bar">
                  {["common", "rare", "epic", "legendary"].map(r => (
                    <div key={r} style={{flex: rarityCount[r] || 0.001, background: `var(--rarity-${r})`}} title={`${r}: ${rarityCount[r]}`} />
                  ))}
                </div>
                <div className="legend" style={{marginTop:10}}>
                  {["common", "rare", "epic", "legendary"].map(r => (
                    <div key={r} className="legend-item">
                      <div className="legend-dot" style={{background:`var(--rarity-${r})`}} />
                      <span>{r} {rarityCount[r]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="panel" style={{marginTop:18}}>
              <div className="panel-title">Deck stats & Elemental Distribution</div>
              <div style={{display:"flex", gap:18, flexWrap:"wrap", fontFamily:"var(--font-mono)", fontSize:11, marginBottom: 8}}>
                <div>avg cost: <span style={{color:"var(--ink)"}}>{stats.avgCost.toFixed(2)}</span></div>
                <div>avg ratio: <span style={{color:"var(--ink)"}}>{stats.avgRatio.toFixed(2)}</span></div>
                <div>variance σ²: <span style={{color:"var(--ink)"}}>{stats.variance.toFixed(3)}</span></div>
              </div>
              <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:6}}>
                {Object.entries(stats.elements || {}).map(([elem, count]) => (
                  <span key={elem} className="chip" style={{fontSize: 10.5, padding: "2px 8px", background: "rgba(255,255,255,0.05)", textTransform: "capitalize"}}>
                    ● {elem}: <strong style={{color: "var(--gold-bright)", marginLeft: 3}}>{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="panel">
              <div className="panel-title">Balance trace</div>
              {balanceRounds.length ? (
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%", borderCollapse:"collapse", fontFamily:"var(--font-mono)", fontSize:11}}>
                    <thead>
                      <tr style={{color:"var(--ink-3)", borderBottom:"1px solid var(--line)"}}>
                        <th style={{textAlign:"left", padding:"6px 8px"}}>round</th>
                        <th style={{padding:"6px 8px"}}>spread</th>
                        <th style={{padding:"6px 8px"}}>length</th>
                        <th style={{padding:"6px 8px"}}>dominance</th>
                        <th style={{textAlign:"left", padding:"6px 8px"}}>summary</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceRounds.map(r => (
                        <tr key={r.round} style={{borderBottom:"1px solid rgba(255,255,255,0.04)", color:"var(--ink-2)"}}>
                          <td style={{padding:"6px 8px"}}>{r.round}</td>
                          <td style={{padding:"6px 8px", textAlign:"center"}}>{r.metrics?.win_rate_spread ?? "—"}</td>
                          <td style={{padding:"6px 8px", textAlign:"center"}}>{r.metrics?.avg_game_length ?? "—"}</td>
                          <td style={{padding:"6px 8px", textAlign:"center"}}>{r.metrics?.dominance ?? "—"}</td>
                          <td style={{padding:"6px 8px", color:"var(--ink-3)"}}>{r.decision?.summary || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="orch-rv-empty">Run the backend balance engine to populate the trace.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeckTab;
