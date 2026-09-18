import Templates from './templates.js';
import { DECK_PRESETS, MOCK_TOPIC, MOCK_CARDS } from './data.js';

const STORAGE_KEY = "bunRealCua.v1";
const DEBOUNCE_MS = 500;

function nowIso() { return new Date().toISOString(); }
function newId() { return "proj_" + Math.random().toString(36).slice(2, 10); }

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error("read failed"));
    r.readAsDataURL(file);
  });
}

async function serializeDeck(deck) {
  if (!deck) return deck;
  const out = { ...deck };
  if (deck.template) {
    const tpl = { ...deck.template };
    const fields = [["_frontBgFile","frontBg"], ["_backBgFile","backBg"]];
    for (const [fileKey, refKey] of fields) {
      if (tpl[fileKey]) { try { tpl[refKey] = await fileToDataUri(tpl[fileKey]); } catch { /* ignore unreadable file */ } }
      delete tpl[fileKey];
    }
    if (typeof tpl.frontBg === "string" && tpl.frontBg.startsWith("blob:")) tpl.frontBg = "";
    if (typeof tpl.backBg  === "string" && tpl.backBg.startsWith("blob:"))  tpl.backBg  = "";
    out.template = tpl;
  }
  if (deck.rules && Array.isArray(deck.rules.rarities)) {
    const rarities = await Promise.all(deck.rules.rarities.map(async r => {
      const nr = { ...r };
      if (nr._frameFile) { try { nr.frame = await fileToDataUri(nr._frameFile); } catch { /* ignore unreadable file */ } delete nr._frameFile; }
      if (typeof nr.frame === "string" && nr.frame.startsWith("blob:")) nr.frame = "";
      return nr;
    }));
    out.rules = { ...deck.rules, rarities };
  }
  return out;
}

async function serializeCard(card) {
  const out = { ...card };
  const fields = [["_artworkFile","artwork"],["_frontBgFile","frontBg"],["_backBgFile","backBg"],["_backLogoFile","backLogo"]];
  for (const [fileKey, refKey] of fields) {
    if (out[fileKey]) { try { out[refKey] = await fileToDataUri(out[fileKey]); } catch { /* ignore unreadable file */ } }
    delete out[fileKey];
  }
  if (out._files && typeof out._files === "object") {
    const newContent = { ...(out.content || {}) };
    for (const [layerId, file] of Object.entries(out._files)) {
      if (file && (file instanceof Blob || (file.name && file.size != null))) {
        try {
          const dataUri = await fileToDataUri(file);
          newContent[layerId] = dataUri;
          if (["artwork","frontBg","backBg","backLogo"].includes(layerId)) out[layerId] = dataUri;
        } catch { /* ignore unreadable file */ }
      }
    }
    out.content = newContent;
  }
  delete out._files;
  for (const face of ["frontLayers", "backLayers"]) {
    if (Array.isArray(out[face])) {
      out[face] = out[face].map(l => {
        if (l.type === "image" && typeof l.src === "string" && l.src.startsWith("blob:")) {
          const fromContent = out.content?.[l.id];
          if (fromContent && !fromContent.startsWith("blob:")) return { ...l, src: fromContent };
          if (l.id === "artwork"  && out.artwork  && !out.artwork.startsWith("blob:")) return { ...l, src: out.artwork };
          if (l.id === "frontBg"  && out.frontBg  && !out.frontBg.startsWith("blob:")) return { ...l, src: out.frontBg };
          if (l.id === "backBg"   && out.backBg   && !out.backBg.startsWith("blob:")) return { ...l, src: out.backBg };
          if (l.id === "backLogo" && out.backLogo && !out.backLogo.startsWith("blob:")) return { ...l, src: out.backLogo };
          return { ...l, src: "" };
        }
        return l;
      });
    }
  }
  if (out.content) {
    const c = { ...out.content };
    for (const k of Object.keys(c)) {
      if (typeof c[k] === "string" && c[k].startsWith("blob:")) {
        if (["artwork","frontBg","backBg","backLogo"].includes(k) && out[k] && !out[k].startsWith("blob:")) {
          c[k] = out[k];
        } else { c[k] = ""; }
      }
    }
    out.content = c;
  }
  return out;
}

const Projects = {
  _state: null,
  _saveTimer: null,
  _listeners: new Set(),

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.projects && Object.keys(parsed.projects).length) {
          for (const [pid, p] of Object.entries(parsed.projects)) {
            // Filter out old legacy dummy 20-card project leftovers
            if (((p.name === "Untitled project" || p.name === "Deep Sea Creatures" || p.name === "Solar Pantheon") &&
                 (p.topic === "Deep Sea Creatures" || p.topic === "Solar Pantheon") &&
                 p.cards?.length === 20)) {
              delete parsed.projects[pid];
              continue;
            }

            const preset = DECK_PRESETS[p.topic];
            if (!p.deck) {
              p.deck = preset?.deck
                ? { id: preset.deck.id, name: preset.deck.name, locale: preset.deck.locale,
                    template: preset.deck.template, rules: preset.deck.rules }
                : { id: (p.topic||"deck").replace(/\s+/g,"_").toLowerCase(),
                    name: p.topic || "Deck", locale: "en",
                    template: Templates.defaultTemplate(), rules: {} };
            }
            if (p.deck?.rules?.cardTypes) {
              p.deck.rules.cardTypes = p.deck.rules.cardTypes.filter(t => t !== "Terrain");
            }
            const tpl = p.deck?.template || Templates.defaultTemplate();
            p.cards = (p.cards || []).map(c => {
              if (c.type === "Terrain" || c.content?.typeLine === "Terrain") {
                c.type = "Spell";
                if (c.content) c.content.typeLine = "Spell";
                c.attack = 0;
                c.defense = 0;
                c.health = 0;
              }
              const migrated = (c.content || c.overrides || c.extraLayers) ? c : Templates.migrateLegacyCard(c, tpl);
              return Templates.materialiseLayers(migrated, tpl);
            });
          }

          const validIds = Object.keys(parsed.projects);
          if (validIds.length > 0) {
            if (!parsed.activeProjectId || !parsed.projects[parsed.activeProjectId]) {
              parsed.activeProjectId = validIds[0];
            }
            this._state = parsed;
            return this._state;
          }
        }
      }
    } catch (e) { console.warn("Projects.load: corrupted storage, starting fresh", e); }

    this._state = { activeProjectId: null, projects: {} };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state)); } catch {}
    return this._state;
  },

  async loadFromServer() {
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) return null;
      const data = await res.json();
      if (data.projects && data.projects.length > 0) {
        const projects = {};
        for (const p of data.projects) {
          // Filter out old legacy dummy 20-card project leftovers
          if (((p.name === "Untitled project" || p.name === "Deep Sea Creatures" || p.name === "Solar Pantheon") &&
               (p.topic === "Deep Sea Creatures" || p.topic === "Solar Pantheon") &&
               p.cards?.length === 20)) {
            fetch(`/api/projects/${p.id}`, { method: "DELETE" }).catch(() => {});
            continue;
          }

          const preset = DECK_PRESETS[p.topic];
          if (!p.deck) {
            p.deck = preset?.deck
              ? { id: preset.deck.id, name: preset.deck.name, locale: preset.deck.locale,
                  template: preset.deck.template, rules: preset.deck.rules }
              : { id: (p.topic||"deck").replace(/\s+/g,"_").toLowerCase(),
                  name: p.topic || "Deck", locale: "en",
                  template: Templates.defaultTemplate(), rules: {} };
          }
          const tpl = p.deck.template;
          p.cards = (p.cards || []).map(c => {
            const migrated = (c.content || c.overrides || c.extraLayers) ? c : Templates.migrateLegacyCard(c, tpl);
            return Templates.materialiseLayers(migrated, tpl);
          });
          projects[p.id] = p;
        }

        const validIds = Object.keys(projects);
        if (validIds.length > 0) {
          let activeProjectId = this._state?.activeProjectId;
          if (!activeProjectId || !projects[activeProjectId]) {
            const sorted = Object.values(projects).sort((a, b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
            activeProjectId = sorted[0]?.id;
          }

          this._state = { activeProjectId, projects };
          
          // Cache to localStorage
          const snap = { activeProjectId: this._state.activeProjectId, projects: {} };
          for (const [pid, p] of Object.entries(this._state.projects)) {
            const cardsSafe = await Promise.all((p.cards || []).map(serializeCard));
            const deckSafe  = await serializeDeck(p.deck);
            snap.projects[pid] = { ...p, deck: deckSafe, cards: cardsSafe };
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));

          this._emit();
          return this._state;
        }
      }
    } catch (err) {
      console.warn("Failed to load projects from server:", err);
    }
    return null;
  },

  async flush() {
    if (!this._state) return;
    const snap = { activeProjectId: this._state.activeProjectId, projects: {} };
    for (const [pid, p] of Object.entries(this._state.projects)) {
      const cardsSafe = await Promise.all((p.cards || []).map(serializeCard));
      const deckSafe  = await serializeDeck(p.deck);
      snap.projects[pid] = { ...p, deck: deckSafe, cards: cardsSafe };
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snap)); }
    catch (e) { console.warn("Projects.flush failed (likely quota)", e); this._notifyStorageError(e); }

    // Sync active project to backend
    const activeId = this._state.activeProjectId;
    const activeProject = snap.projects[activeId];
    if (activeProject) {
      try {
        const res = await fetch(`/api/projects/${activeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: activeProject.name,
            topic: activeProject.topic,
            deck: activeProject.deck,
            cards: activeProject.cards,
          }),
        });
        if (res.status === 404) {
          await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: activeProject.id,
              name: activeProject.name,
              topic: activeProject.topic,
              deck: activeProject.deck,
              cards: activeProject.cards,
            }),
          });
        }
      } catch (err) {
        console.warn("Failed to sync project to backend:", err);
      }
    }
  },

  scheduleFlush() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.flush(), DEBOUNCE_MS);
  },

  getState() { return this._state; },
  getActive() {
    if (!this._state) return null;
    return this._state.projects[this._state.activeProjectId] || null;
  },
  list() {
    if (!this._state) return [];
    return Object.values(this._state.projects).sort((a, b) => (b.updatedAt||"").localeCompare(a.updatedAt||""));
  },

  setActive(id) {
    if (!this._state || !this._state.projects[id]) return;
    this._state.activeProjectId = id;
    this.scheduleFlush(); this._emit();
  },

  create(opts = {}) {
    const id = newId();
    const topic = opts.topic || opts.name || "Custom Deck";
    const deck = opts.deck || {
      id: (topic||"deck").replace(/\s+/g,"_").toLowerCase(),
      name: opts.name || topic || "Deck",
      locale: "en",
      template: Templates.defaultTemplate(),
      rules: { rarities: Templates.defaultRarities(), cardTypes: ["Creature", "Spell"] }
    };
    const cards = (opts.cards || []).map(c => {
      const clone = JSON.parse(JSON.stringify(c));
      return Templates.materialiseLayers(clone, deck.template);
    });
    const p = { id, name: opts.name || "New project", topic, deck, cards, createdAt: nowIso(), updatedAt: nowIso() };
    if (!this._state) this._state = { activeProjectId: null, projects: {} };
    this._state.projects[id] = p;
    this._state.activeProjectId = id;
    this.scheduleFlush(); this._emit();
    return p;
  },

  rename(id, name) {
    const p = this._state.projects[id];
    if (!p) return;
    p.name = name;
    if (p.deck) p.deck = { ...p.deck, name };
    p.updatedAt = nowIso();
    this.scheduleFlush(); this._emit();
  },

  duplicate(id) {
    const src = this._state.projects[id];
    if (!src) return;
    const copy = { ...src, id: newId(), name: src.name + " (copy)", createdAt: nowIso(), updatedAt: nowIso(), cards: (src.cards || []).map(c => ({ ...c })) };
    this._state.projects[copy.id] = copy;
    this._state.activeProjectId = copy.id;
    this.scheduleFlush(); this._emit();
    return copy;
  },

  remove(id) {
    if (!this._state || !this._state.projects[id]) return;
    delete this._state.projects[id];

    // Background delete from server
    fetch(`/api/projects/${id}`, { method: "DELETE" }).catch(e =>
      console.warn("Failed to delete project from server:", e)
    );

    const remaining = Object.keys(this._state.projects);
    if (!remaining.length) {
      this._state.activeProjectId = null;
    } else if (this._state.activeProjectId === id) {
      this._state.activeProjectId = remaining[0];
    }
    this.scheduleFlush(); this._emit();
  },

  updateActive(patch) {
    const id = this._state.activeProjectId;
    const p = this._state.projects[id];
    if (!p) return;
    Object.assign(p, patch, { updatedAt: nowIso() });
    this.scheduleFlush();
  },

  subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn); },
  _emit() { this._listeners.forEach(fn => { try { fn(); } catch { /* ignore listener errors */ } }); },

  _storageErrorHandlers: new Set(),
  onStorageError(fn) { this._storageErrorHandlers.add(fn); return () => this._storageErrorHandlers.delete(fn); },
  _notifyStorageError(err) { this._storageErrorHandlers.forEach(fn => { try { fn(err); } catch { /* ignore listener errors */ } }); },

  getStorageStats() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || "";
      return { used: raw.length, usedKB: Math.round(raw.length / 1024), approxCapMB: 5 };
    } catch { return { used: 0, usedKB: 0, approxCapMB: 5 }; }
  },
};

export default Projects;
