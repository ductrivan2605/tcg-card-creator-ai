import React, { useState, useEffect, useRef } from "react";
import GenerateTab from "./GenerateTab.jsx";
import DeckTab from "./DeckTab.jsx";
import AnalyticsTab from "./AnalyticsTab.jsx";
import GuideTab from "./GuideTab.jsx";
import CardEditor from "./CardEditor.jsx";
import { useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakSlider } from "./tweaks-panel.jsx";
import Projects from "./projects.js";
import CardIO from "./card-io.js";
import Templates from "./templates.js";
import { DECK_PRESETS } from "./data.js";


const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentPalette": ["#67d9e6","#f0c168","#c78ad9"],
  "animSpeed": 1,
  "cardDensity": "comfortable",
  "showMetricsOverlay": false
}/*EDITMODE-END*/;

const EDITOR_WIDTH_KEY = "bunRealCua.editorWidth";
const DEFAULT_EDITOR_WIDTH = 720;
const MIN_EDITOR_WIDTH = 540;

function App() {
  const [tab, setTab] = useState("guide");
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ── Projects: load on mount, then mirror to local state ──
  const [projectsState, setProjectsState] = useState(() => {
    const s = Projects.load();
    return { ...s };
  });

  // Sync with backend on mount
  useEffect(() => {
    async function syncProjects() {
      const serverState = await Projects.loadFromServer();
      if (serverState) {
        setProjectsState({ ...serverState });
      } else {
        // If server database is empty, sync local storage projects to the server database
        const local = Projects.getState();
        if (local && local.projects) {
          for (const p of Object.values(local.projects)) {
            try {
              await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: p.id,
                  name: p.name,
                  topic: p.topic,
                  deck: p.deck,
                  cards: p.cards,
                }),
              });
            } catch (err) {
              console.warn("Failed to upload local project to server:", err);
            }
          }
        }
      }
    }
    syncProjects();
  }, []);

  const active = projectsState.projects[projectsState.activeProjectId];
  const cards = active?.cards || [];
  const topic = active?.topic || "";
  const projectsList = Object.values(projectsState.projects)
    .sort((a, b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));

  const [balanceRounds, setBalanceRounds] = useState([]);

  // Fetch balance history from server when the active project deck changes
  useEffect(() => {
    setRuleConflicts([]); // Clear conflicts on project switch
    const deckId = active?.deck?.id;
    if (deckId) {
      fetch(`/api/decks/${deckId}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error("not found");
        })
        .then(data => {
          if (data.balance_history) {
            setBalanceRounds(data.balance_history.map(h => ({
              round: h.round,
              metrics: h.metrics,
              decision: h.decision
            })));
          } else {
            setBalanceRounds([]);
          }
        })
        .catch(() => {
          setBalanceRounds([]);
        });
    } else {
      setBalanceRounds([]);
    }
  }, [active?.deck?.id]);

  const [valBusy, setValBusy] = useState(false);
  const [ruleConflicts, setRuleConflicts] = useState([]);

  async function validateRules() {
    if (valBusy) return;
    setValBusy(true);
    try {
      const res = await fetch("/api/assign-values", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cards }),
      });
      if (res.ok) {
        const data = await res.json();
        setRuleConflicts(data.conflicts || []);
      } else {
        console.error("Failed to validate rules:", await res.text());
      }
    } catch (err) {
      console.error("Error validating rules:", err);
    } finally {
      setValBusy(false);
    }
  }



  // ── Editor state (lifted from tabs) ─────────────────────────
  const [editingCardId, setEditingCardId] = useState(null);
  const [editorWidth, setEditorWidth] = useState(() => {
    const stored = parseInt(localStorage.getItem(EDITOR_WIDTH_KEY) || "", 10);
    return (stored && stored >= MIN_EDITOR_WIDTH) ? stored : DEFAULT_EDITOR_WIDTH;
  });
  // Persist editor width
  useEffect(() => {
    localStorage.setItem(EDITOR_WIDTH_KEY, String(editorWidth));
  }, [editorWidth]);

  const isTemplateMode = editingCardId === "__template__";
  const editingCardRaw = isTemplateMode
    ? (cards[0] || null)                                 // use first card as canvas preview
    : (cards.find(c => c.id === editingCardId) || null);
  const editingCard = editingCardRaw ? { ...editingCardRaw, _topic: editingCardRaw._topic || topic } : null;
  const editorOpen = !!editingCard || isTemplateMode;

  // Clear editor when the underlying card disappears (deletion / project switch)
  useEffect(() => {
    if (!isTemplateMode && editingCardId && !cards.find(c => c.id === editingCardId)) {
      setEditingCardId(null);
    }
    if (isTemplateMode && !cards.length) {
      setEditingCardId(null); // no cards → no preview surface for template mode either
    }
  }, [cards, editingCardId, isTemplateMode]);

  // Only Generate and Deck tabs can open the editor.
  // When user switches to Simulate/Analytics we keep the selection but hide the editor.
  const tabAllowsEditor = (tab === "generate" || tab === "deck");
  const showEditor = editorOpen && tabAllowsEditor;

  function refreshProjects() {
    setProjectsState({ ...Projects.getState() });
  }

  function setCards(updaterOrValue) {
    const id = Projects.getState().activeProjectId;
    const proj = Projects.getState().projects[id];
    const prev = proj.cards || [];
    const next = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
    Projects.updateActive({ cards: next });
    setProjectsState({ ...Projects.getState() });
  }
  function setTopic(newTopic) {
    Projects.updateActive({ topic: newTopic });
    setProjectsState({ ...Projects.getState() });
  }

  function updateCard(updated) {
    setCards(prev => prev.map(c => c.id === updated.id ? updated : c));
  }

  // Update the active deck (template/rules/etc). When the template changes,
  // re-materialise every card's frontLayers/backLayers so the grid reflects it.
  function updateDeck(newDeck) {
    const id = Projects.getState().activeProjectId;
    const proj = Projects.getState().projects[id];
    const tpl = newDeck?.template;
    const remat = (proj.cards || []).map(c => Templates.materialiseLayers(c, tpl));
    // Keep project.name in sync with deck.name so the sidebar and page title stay consistent.
    const patch = { deck: newDeck, cards: remat };
    if (newDeck?.name && newDeck.name !== proj.name) patch.name = newDeck.name;
    Projects.updateActive(patch);
    setProjectsState({ ...Projects.getState() });
  }

  function storeGeneratedBuild({ topic: generatedTopic, deck, cards: generatedCards }) {
    const id = Projects.getState().activeProjectId;
    const proj = Projects.getState().projects[id];
    if (!proj) return;

    const template = deck?.template || proj.deck?.template || Templates.defaultTemplate();
    const rules = deck?.rules || proj.deck?.rules || {};
    const nextDeck = {
      ...(proj.deck || {}),
      ...(deck || {}),
      name: deck?.name || generatedTopic || proj.name,
      locale: deck?.locale || proj.deck?.locale || "en",
      template,
      rules: rules.rarities
        ? rules
        : { ...rules, rarities: proj.deck?.rules?.rarities || Templates.defaultRarities() },
    };
    const nextCards = (generatedCards || []).map(c =>
      Templates.materialiseLayers(c, nextDeck.template)
    );
    Projects.updateActive({
      topic: generatedTopic || proj.topic,
      name: nextDeck.name || proj.name,
      deck: nextDeck,
      cards: nextCards,
    });
    setProjectsState({ ...Projects.getState() });
  }

  // ── Project handlers ────────────────────────────────────────
  function onSelectProject(id) { Projects.setActive(id); refreshProjects(); setEditingCardId(null); }
  function onNewProject() {
    Projects.create({ name: "Untitled project", topic: "", cards: [] });
    refreshProjects();
    setEditingCardId(null);
    setTab("generate");
  }
  function onRenameProject(id) {
    const cur = Projects.getState().projects[id];
    if (!cur) return;
    const name = prompt("Rename project:", cur.name);
    if (!name) return;
    Projects.rename(id, name);
    refreshProjects();
  }
  function onDuplicateProject(id) { Projects.duplicate(id); refreshProjects(); }
  function onDeleteProject(id) {
    const cur = Projects.getState().projects[id];
    if (!cur) return;
    if (!confirm(`Delete project "${cur.name}"? This cannot be undone.`)) return;
    Projects.remove(id);
    refreshProjects();
  }

  // ── Save / Export / Import (now at App level) ───────────────
  const [saveFlash, setSaveFlash] = useState(false);
  const fileRef = useRef();

  function onSaveNow() {
    Projects.flush();
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 900);
  }
  async function onExportZip() {
    if (!cards.length) { alert("No cards to export."); return; }
    const blob = await CardIO.exportZip(cards, topic, {
      template: active?.deck?.template,
      rules: active?.deck?.rules,
      locale: active?.deck?.locale,
      id: active?.deck?.id,
      name: active?.deck?.name || active?.name,
    });
    const safe = (topic || active?.name || "cards").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    CardIO.download(blob, `${safe}_cards.zip`);
  }
  function onExportGodotJson() {
    if (!cards.length) { alert("No cards to export."); return; }
    const blob = CardIO.exportGodotJson(cards, topic, {
      rules: active?.deck?.rules,
      id: active?.deck?.id,
      name: active?.deck?.name || active?.name,
    });
    const safe = (topic || active?.name || "deck").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    CardIO.download(blob, `${safe}_godot.json`);
  }
  async function onImportZip(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await CardIO.importZip(file);
      const { cards: imported, topic: t, deck: importedDeck } = result;
      // Import into a NEW project so we don't clobber the active one.
      // The project keeps the imported deck/template/rules intact.
      const name = (importedDeck?.name || t || "Imported deck") + " (imported)";
      Projects.create({ name, topic: t, deck: importedDeck, cards: imported });
      refreshProjects();
      setEditingCardId(null);
    } catch (err) {
      alert("Import failed: " + err.message);
    }
    e.target.value = "";
  }

  // ── Splitter drag ───────────────────────────────────────────
  const splitterRef = useRef(null);
  function onSplitterMouseDown(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = editorWidth;
    function onMove(ev) {
      const dx = startX - ev.clientX;
      const vw = window.innerWidth;
      const maxW = Math.floor(vw * 0.7);
      const nw = Math.max(MIN_EDITOR_WIDTH, Math.min(maxW, startW + dx));
      setEditorWidth(nw);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    }
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Apply UI accent palette via CSS vars (tweaks panel)
  useEffect(() => {
    const root = document.documentElement;
    const [cyan, gold, magenta] = t.accentPalette;
    root.style.setProperty("--cyan", cyan);
    root.style.setProperty("--cyan-bright", cyan);
    root.style.setProperty("--gold", gold);
    root.style.setProperty("--gold-bright", gold);
    root.style.setProperty("--magenta", magenta);
  }, [t.accentPalette]);

  // Apply active deck's rarity colors as CSS vars (--rarity-<id>).
  // Re-runs whenever the active project (and thus its deck) changes.
  useEffect(() => {
    if (Templates && active?.deck) {
      Templates.applyDeckCssVars(active.deck);
    }
  }, [active?.deck, active?.id]);

  useEffect(() => {
    document.documentElement.style.setProperty("--anim-speed", t.animSpeed);
  }, [t.animSpeed]);

  const tabs = [
    { id: "guide", label: "Guide" },
    { id: "generate", label: "Generate" },
    { id: "deck", label: "Deck" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className={`app${showEditor ? " editor-open" : ""}`}
      style={showEditor ? { "--editor-w": editorWidth + "px" } : undefined}>
      <header className="topbar" data-screen-label="TopBar">
        <div className="brand">
          <div className="brand-mark" aria-hidden></div>
          <div className="brand-text">
            <div className="brand-name">Bún Real Cua</div>
            <div className="brand-sub">TCG AI CARD GENERATOR</div>
          </div>
        </div>
        <nav className="tabs">
          {tabs.map(tb => (
            <button key={tb.id} className={`tab${tab === tb.id ? " active" : ""}`} onClick={() => setTab(tb.id)}>
              {tb.label}
            </button>
          ))}
        </nav>
        <div className="topbar-right">
          {/* File ops moved here from Pipeline Status panel */}
          <div className="topbar-fileops">
            <button onClick={onSaveNow} className="topbar-btn topbar-btn-cyan" title="Save the current project to browser storage">
              {saveFlash ? "✓ saved" : "↓ save"}
            </button>
            <button onClick={onExportZip} className="topbar-btn" disabled={!cards.length} title="Export current project as .zip">
              ↓ export
            </button>
            <button onClick={() => fileRef.current?.click()} className="topbar-btn" title="Import .zip into a new project">
              ↑ import
            </button>
            <input ref={fileRef} type="file" accept=".zip" onChange={onImportZip} style={{display:"none"}} />
          </div>
        </div>
      </header>

      <div className="app-shell">
        <div className="app-body">
          {/* Left sidebar — projects */}
          <aside className="proj-sidebar">
            <div className="proj-section-title">Projects</div>
            <div className="proj-list">
              {projectsList.map(p => (
                <div key={p.id}
                  className={`proj-item${p.id === projectsState.activeProjectId ? " active" : ""}`}
                  onClick={() => onSelectProject(p.id)}>
                  <div className="proj-name">{p.name}</div>
                  <div className="proj-sub">
                    {(p.cards||[]).length} cards · {p.topic || "—"}
                  </div>
                  <div className="proj-actions">
                    <button onClick={(e)=>{e.stopPropagation(); onRenameProject(p.id);}} title="Rename">✎</button>
                    <button onClick={(e)=>{e.stopPropagation(); onDuplicateProject(p.id);}} title="Duplicate">⎘</button>
                    <button onClick={(e)=>{e.stopPropagation(); onDeleteProject(p.id);}} title="Delete" className="danger">✕</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onNewProject} className="proj-new-btn">+ New project</button>

            <div className="proj-section-title" style={{marginTop:18}}>Storage</div>
            <StorageStat />
          </aside>

          {/* Main content */}
          <main className="tab-content">
            <section style={{display: tab === "guide" ? "block" : "none"}}>
              <GuideTab
                onNavigate={setTab}
                setTopic={setTopic}
                hasCards={cards.length > 0}
              />
            </section>
            <section style={{display: tab === "generate" ? "block" : "none"}}>
              <GenerateTab
                cards={cards} setCards={setCards}
                topic={topic} setTopic={setTopic}
                deck={active?.deck}
                projectName={active?.name || ""}
                onRenameProject={() => onRenameProject(active.id)}
                selectedId={editingCardId}
                setSelectedId={setEditingCardId}
                onGeneratedBuild={storeGeneratedBuild}
              />
            </section>
            <section style={{display: tab === "deck" ? "block" : "none"}}>
              <DeckTab
                cards={cards} setCards={setCards}
                topic={topic} setTopic={setTopic}
                template={active?.deck?.template}
                projectName={active?.name || ""}
                onRenameProject={() => onRenameProject(active.id)}
                selectedId={editingCardId}
                setSelectedId={setEditingCardId}
                onGeneratedBuild={storeGeneratedBuild}
                balanceRounds={balanceRounds}
                setBalanceRounds={setBalanceRounds}
                validateRules={validateRules}
                valBusy={valBusy}
                ruleConflicts={ruleConflicts}
              />
            </section>
            <section style={{display: tab === "analytics" ? "block" : "none"}}>
              <AnalyticsTab cards={cards} balanceRounds={balanceRounds} ruleConflicts={ruleConflicts} />
            </section>
          </main>
        </div>

        {showEditor && (
          <>
            <div className="editor-splitter" onMouseDown={onSplitterMouseDown} ref={splitterRef}
              title="Drag to resize editor">
              <div className="editor-splitter-grip" />
            </div>
            <aside className="editor-rail">
              <CardEditor
                card={editingCard}
                deck={active?.deck}
                initialScope={isTemplateMode ? "template" : "card"}
                onChange={updateCard}
                onDeckChange={updateDeck}
                onClose={() => setEditingCardId(null)}
                ruleConflicts={ruleConflicts}
              />
            </aside>
          </>
        )}
      </div>

      {t.showMetricsOverlay && (
        <div style={{
          position:"fixed", bottom:18, left:240, zIndex:60,
          background:"rgba(6,18,26,0.9)",
          border:"1px solid var(--line-strong)",
          borderRadius:10,
          padding:"10px 14px",
          fontFamily:"var(--font-mono)", fontSize:10.5, color:"var(--ink-2)",
          lineHeight:1.7, minWidth:220,
          backdropFilter:"blur(6px)"
        }}>
          <div style={{color:"var(--gold-bright)", marginBottom:4, letterSpacing:"0.1em"}}>⌬ TELEMETRY</div>
          <div>active project: <span style={{color:"var(--ink)"}}>{active?.name || "—"}</span></div>
          <div>cards loaded: <span style={{color:"var(--ink)"}}>{cards.length}</span></div>
          <div>tab: <span style={{color:"var(--ink)"}}>{tab}</span></div>
          <div>editor: <span style={{color:"var(--ink)"}}>{showEditor ? `open · ${editorWidth}px` : "closed"}</span></div>
        </div>
      )}

      <TweaksPanel title="Tweaks" defaultPos={{ right: 18, bottom: 18 }}>
        <TweakSection label="Accent palette">
          <TweakColor
            value={t.accentPalette}
            options={[
              ["#67d9e6","#f0c168","#c78ad9"],
              ["#7cd9a5","#d8a64b","#e07a7a"],
              ["#9ab6ff","#ffb38a","#d39bff"],
              ["#67d9e6","#e07a7a","#7cd9a5"]
            ]}
            onChange={v => setTweak("accentPalette", v)}
          />
        </TweakSection>
        <TweakSection label="Card density">
          <TweakRadio
            value={t.cardDensity}
            options={["comfortable","compact"]}
            onChange={v => setTweak("cardDensity", v)}
          />
        </TweakSection>
        <TweakSection label="Animation speed">
          <TweakSlider value={t.animSpeed} min={0.5} max={3} step={0.5}
            onChange={v => setTweak("animSpeed", v)} />
        </TweakSection>
        <TweakSection label="Telemetry overlay">
          <TweakRadio
            value={t.showMetricsOverlay ? "on" : "off"}
            options={["off","on"]}
            onChange={v => setTweak("showMetricsOverlay", v === "on")}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

function StorageStat() {
  const [stats, setStats] = React.useState(() => Projects.getStorageStats());
  React.useEffect(() => {
    const id = setInterval(() => setStats(Projects.getStorageStats()), 2000);
    return () => clearInterval(id);
  }, []);
  const pctOfCap = Math.min(100, Math.round((stats.usedKB / (stats.approxCapMB * 1024)) * 100));
  const warn = pctOfCap > 70;
  return (
    <div className="storage-stat">
      <div className="storage-stat-row">
        <span>used</span>
        <span style={{color: warn ? "var(--gold-bright)" : "var(--ink-2)"}}>{stats.usedKB} KB</span>
      </div>
      <div className="storage-bar">
        <div className="storage-fill" style={{width: pctOfCap + "%",
          background: warn ? "var(--gold-bright)" : "var(--cyan-bright)"}} />
      </div>
      <div className="storage-stat-note">
        Browser cap ~{stats.approxCapMB}MB. Heavy projects with images should be exported as .zip.
      </div>
    </div>
  );
}



export default App;
