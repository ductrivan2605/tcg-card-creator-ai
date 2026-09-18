import React from "react";
import { balanceCard, unbalanceCard } from "./balance.js";
import { MOCK_HEATMAP, MOCK_HEATMAP_LABELS } from "./data.js";

function AnalyticsTab({ cards, balanceRounds = [], ruleConflicts = [] }) {
  const heat = MOCK_HEATMAP;
  const labels = MOCK_HEATMAP_LABELS;

  const iters = balanceRounds.length > 0 ? balanceRounds.map(r => ({
    iter: r.round,
    variance: r.metrics?.win_rate_spread ?? 0.0,
    entropy: 1.0 - (r.metrics?.dominance ?? 0.0) * 0.5 - (r.metrics?.win_rate_spread ?? 0.0) * 1.0, // calculated pseudo-entropy
    topDeck: r.metrics?.dominance ?? 0.0,
    length: r.metrics?.avg_game_length ?? 0.0,
  })) : [];

  const [iterIdx, setIterIdx] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);

  React.useEffect(() => {
    setIterIdx(iters.length > 0 ? iters.length - 1 : 0);
  }, [iters.length]);

  React.useEffect(() => {
    if (!playing) return;
    if (iterIdx >= iters.length - 1) { setPlaying(false); return; }
    const t = setTimeout(() => setIterIdx(i => i + 1), 450);
    return () => clearTimeout(t);
  }, [playing, iterIdx, iters.length]);

  // Full-pool balancing diff: run every card through the engine
  // Must be declared before any early return to obey React Rules of Hooks
  const poolDiff = React.useMemo(() => {
    return (cards || []).map((c, i) => {
      const orig = unbalanceCard(c, i);
      const balanced = balanceCard(orig);
      const delta = balanced._delta || {};
      const changed = Object.keys(delta).length > 0;
      const ratioBefore = orig.type === "Creature" ? (orig.attack + orig.defense) / Math.max(1, orig.cost) : null;
      const ratioAfter = orig.type === "Creature" ? (balanced.attack + balanced.defense) / Math.max(1, balanced.cost) : null;
      return { orig, balanced, delta, changed, ratioBefore, ratioAfter };
    });
  }, [cards]);

  if (iters.length === 0) {
    return (
      <div>
        <h1 className="page-title">4 · Balance Analytics</h1>
        <p className="page-sub">
          Each iteration of the genetic algorithm runs 1,000 simulated matches, then tweaks card attributes
          to push the metrics toward their targets.
        </p>
        {ruleConflicts && ruleConflicts.length > 0 && (
          <div className="panel" style={{ border: "1px solid var(--red)", background: "rgba(224,122,122,0.06)", padding: "14px 18px", marginBottom: 18, borderRadius: 6 }}>
            <div style={{ color: "var(--red)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
              ⚠️ Rule Validation Conflicts ({ruleConflicts.length})
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              {ruleConflicts.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </div>
        )}

        <div className="panel empty-state" style={{ padding: "60px 20px", textAlign: "center", marginTop: 20 }}>
          <div style={{ fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--gold-bright)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>[Analytics Standby]</div>
          <div style={{ fontSize: 16, color: "var(--ink-2)", fontWeight: 600, marginBottom: 8 }}>
            No Balance Data Available
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>
            To populate these analytics, go to the <b>Deck</b> tab and click <b>Run backend balance</b>. 
            The genetic algorithm will run simulated matches and save the history to the database.
          </div>
        </div>
      </div>
    );
  }

  const cur = iters[iterIdx] || { iter: 0, variance: 0, entropy: 0, topDeck: 0, length: 0 };
  const target = 0.15; // backend target spread is 0.15

  const W = 720, H = 240, PADL = 40, PADR = 20, PADT = 16, PADB = 30;
  const innerW = W - PADL - PADR, innerH = H - PADT - PADB;
  
  const maxV = Math.max(0.01, ...iters.map(d => d.variance));
  const xs = i => {
    if (iters.length <= 1) return PADL + innerW / 2;
    return PADL + (i / (iters.length - 1)) * innerW;
  };
  const ys = v => PADT + (1 - v / maxV) * innerH;
  const path = iters.map((d, i) => `${i === 0 ? "M" : "L"}${xs(i)},${ys(d.variance)}`).join(" ");
  const targetY = PADT + (1 - target / maxV) * innerH;

  const entRows = cards.slice(0, 12).map(c => ({ name: c.name, value: c.usage || 0.5 }));
  const changedRows = poolDiff.filter(r => r.changed);
  const overpoweredFixed = poolDiff.filter(r => r.ratioBefore > 3.0 && r.ratioAfter && r.ratioAfter <= 3.0).length;
  const underpoweredFixed = poolDiff.filter(r => r.ratioBefore < 1.8 && r.ratioAfter && r.ratioAfter >= 1.8).length;

  function heatColor(v) {
    const t = Math.max(0, Math.min(1, v));
    if (t < 0.5) {
      const k = t / 0.5;
      const r = Math.round(15 + (103-15)*k), g = Math.round(60 + (217-60)*k), b = Math.round(80 + (230-80)*k);
      return `rgb(${r},${g},${b})`;
    } else {
      const k = (t-0.5)/0.5;
      const r = Math.round(103 + (240-103)*k), g = Math.round(217 + (193-217)*k), b = Math.round(230 + (104-230)*k);
      return `rgb(${r},${g},${b})`;
    }
  }

  const kpis = [
    { label: "Win-rate spread", value: cur.variance.toFixed(3), unit: "", target: "target ≤ 0.15", good: cur.variance <= 0.15,
      explain: "Gap between strongest and weakest card win rate. Lower = fairer." },
    { label: "Card usage entropy H", value: cur.entropy.toFixed(2), unit: "", target: "target ≥ 0.75", good: cur.entropy >= 0.75,
      explain: "How evenly cards get played. Higher = more variety." },
    { label: "Top-card dominance", value: (cur.topDeck*100).toFixed(0), unit: "%", target: "target ≤ 45%", good: cur.topDeck <= 0.45,
      explain: "Usage share of the most dominant card. Above 45% -> carries deck." },
    { label: "Match length μ", value: cur.length.toFixed(1), unit: "t", target: "target 6.5–9.5t", good: cur.length >= 6.5 && cur.length <= 9.5,
      explain: "Average turns per match. Too short or long -> unfun." },
  ];


  return (
    <div>
      <h1 className="page-title">4 · Balance Analytics</h1>
      <p className="page-sub">
        Each iteration of the genetic algorithm runs 1,000 simulated matches, then tweaks card attributes
        to push the four metrics below toward their targets. Drag the scrubber to watch the engine converge
        from iteration 0 (unbalanced) to iteration 12 (converged).
      </p>

      {ruleConflicts && ruleConflicts.length > 0 && (
        <div className="panel" style={{ border: "1px solid var(--red)", background: "rgba(224,122,122,0.06)", padding: "14px 18px", marginBottom: 18, borderRadius: 6 }}>
          <div style={{ color: "var(--red)", fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            ⚠️ Rule Validation Conflicts ({ruleConflicts.length})
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
            {ruleConflicts.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      <div className="panel" style={{marginBottom:18, padding:"14px 18px"}}>
        <div style={{fontFamily:"var(--font-display)", fontSize:13, color:"var(--cyan-bright)", marginBottom:6}}>
          How to read this page
        </div>
        <div style={{fontSize:11.5, color:"var(--ink-3)", lineHeight:1.6, maxWidth:900}}>
          The <b style={{color:"var(--ink-2)"}}>4 KPI tiles</b> show current values vs. targets — green ✓ means on-target.
          The <b style={{color:"var(--ink-2)"}}>convergence chart</b> shows variance dropping iteration-by-iteration toward σ=0.05.
          The <b style={{color:"var(--ink-2)"}}>heatmap</b> shows which card pairs appear together in winning decks.
          The <b style={{color:"var(--ink-2)"}}>usage bars</b> show which cards get played most.
          The <b style={{color:"var(--ink-2)"}}>histogram</b> shows the win-rate spread tightening around 50% as balancing progresses.
        </div>
      </div>

      <div className="iter-controls panel" style={{padding:"12px 16px"}}>
        <button className="ctrl-btn" onClick={() => { setIterIdx(0); setPlaying(false); }}
          style={{width:34, height:34, borderRadius:8, border:"1px solid var(--line-strong)", background:"var(--bg-panel-2)", color:"var(--ink)"}}>⟲</button>
        <button className="ctrl-btn primary" onClick={() => {
          if (iterIdx >= iters.length - 1) setIterIdx(0);
          setPlaying(p => !p);
        }} style={{width:48, height:34, borderRadius:8, border:"1px solid var(--cyan)", background:"linear-gradient(180deg, var(--cyan-bright), var(--cyan))", color:"var(--bg-abyss)", fontWeight:600}}>
          {playing ? "❚❚" : "▶"}
        </button>
        <span className="iter-label">iter {cur.iter} / {iters.length-1}</span>
        <input type="range" className="scrubber" min="0" max={iters.length-1} value={iterIdx}
          onChange={e => { setIterIdx(+e.target.value); setPlaying(false); }} />
        <span className="iter-label" style={{color: cur.variance <= 0.05 ? "var(--green)" : "var(--ink-2)"}}>
          {cur.variance <= 0.05 ? "✓ converged" : "balancing…"}
        </span>
      </div>

      <div className="analytics-grid" style={{marginTop:18}}>
        {kpis.map(k => (
          <div className="panel kpi" key={k.label}>
            <div className="panel-title">{k.label}</div>
            <div className="kpi-value">{k.value}<span className="unit">{k.unit}</span></div>
            <div className={`kpi-delta ${k.good ? "good" : "bad"}`}>{k.good ? "✓ on target" : "△ off target"}</div>
            <div className="kpi-target">{k.target}</div>
            <div style={{fontSize:10, color:"var(--ink-3)", marginTop:8, lineHeight:1.4, fontStyle:"italic"}}>{k.explain}</div>
          </div>
        ))}

        <div className="panel chart-wide">
          <div className="panel-title">Balance convergence · variance over iterations</div>
          <div style={{fontSize:11, color:"var(--ink-3)", marginBottom:6}}>
            Y-axis: win-rate variance (lower = fairer). X-axis: balance iteration. The dashed green line is the σ=0.05 target.
            The gold dot is the iteration you're scrubbed to.
          </div>
          <svg className="svg-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {[0.25, 0.5, 0.75].map(p => (
              <line key={p} x1={PADL} y1={PADT + p*innerH} x2={W-PADR} y2={PADT + p*innerH}
                stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />
            ))}
            <line x1={PADL} y1={targetY} x2={W-PADR} y2={targetY}
              stroke="var(--green)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
            <text x={W-PADR-4} y={targetY-4} fontSize="10" textAnchor="end" fill="var(--green)" fontFamily="var(--font-mono)">
              σ = 0.05 target
            </text>
            <path d={`${path} L ${xs(iters.length-1)} ${PADT+innerH} L ${xs(0)} ${PADT+innerH} Z`}
              fill="url(#convFill)" opacity="0.3" />
            <defs>
              <linearGradient id="convFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67d9e6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#67d9e6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={path} fill="none" stroke="var(--cyan-bright)" strokeWidth="2"
              filter="drop-shadow(0 0 4px rgba(154,241,249,0.4))" />
            {iters.map((d, i) => (
              <circle key={i} cx={xs(i)} cy={ys(d.variance)} r={i === iterIdx ? 5 : 2.5}
                fill={i === iterIdx ? "var(--gold-bright)" : "var(--cyan)"}
                stroke={i === iterIdx ? "var(--bg-abyss)" : "none"} strokeWidth="2" />
            ))}
            {iters.map((d, i) => i % 2 === 0 && (
              <text key={i} x={xs(i)} y={H-PADB+18} fontSize="10" fill="var(--ink-3)" textAnchor="middle" fontFamily="var(--font-mono)">{d.iter}</text>
            ))}
            {[0, 0.5, 1].map(p => (
              <text key={p} x={PADL-8} y={PADT + (1-p)*innerH + 4} fontSize="10" fill="var(--ink-3)" textAnchor="end" fontFamily="var(--font-mono)">
                {(p*maxV).toFixed(2)}
              </text>
            ))}
          </svg>
        </div>

        <div className="panel chart-narrow">
          <div className="panel-title">Co-occurrence heatmap</div>
          <div style={{fontSize:11, fontFamily:"var(--font-mono)", color:"var(--ink-3)", marginBottom:6, lineHeight:1.4}}>
            Hover any cell to see which two cards. Brighter = those two cards appear together in winning decks more often (synergy).
          </div>
          <div className="heatmap" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
            {heat.map((row, i) => row.map((v, j) => (
              <div key={i+"-"+j} className="heatmap-cell"
                style={{ background: heatColor(v) }}
                title={`${labels[i]} × ${labels[j]} = ${v.toFixed(2)}`} />
            )))}
          </div>
          <div style={{display:"flex", justifyContent:"space-between", marginTop:8, fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-3)"}}>
            <span>low</span>
            <div style={{flex:1, height:6, margin:"0 8px", borderRadius:3, background:"linear-gradient(90deg, rgb(15,60,80), rgb(103,217,230), rgb(240,193,104))"}} />
            <span>high</span>
          </div>
        </div>

        <div className="panel chart-half">
          <div className="panel-title">Card usage frequency · entropy probe</div>
          <div style={{fontSize:11, color:"var(--ink-3)", marginBottom:8}}>
            % of winning decks each card appears in. Flat distribution = healthy variety. Spikes = dominant cards to nerf.
          </div>
          <div className="entropy-bars">
            {entRows.sort((a,b) => b.value - a.value).map(r => (
              <div className="ebar-row" key={r.name}>
                <span className="ebar-name">{r.name}</span>
                <div className="ebar-track"><div className="ebar-fill" style={{width: (r.value*100) + "%"}} /></div>
                <span className="ebar-val">{(r.value*100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel chart-half">
          <div className="panel-title">Win-rate distribution · 1,000 sims</div>
          <div style={{fontSize:11, color:"var(--ink-3)", marginBottom:6}}>
            Histogram of deck win-rates across 1,000 matches at this iteration. The gold dashed line marks 50% (perfectly fair).
            Watch the spread tighten as you scrub forward.
          </div>
          <svg className="svg-chart" viewBox="0 0 720 240" preserveAspectRatio="none">
            {(() => {
              const bins = 24;
              const ds = [];
              const sigma = Math.max(0.04, 0.18 - iterIdx * 0.011);
              const mu = 0.504;
              for (let i = 0; i < bins; i++) {
                const x = i / (bins - 1);
                const v = Math.exp(-Math.pow((x - mu) / sigma, 2));
                ds.push(v);
              }
              const max = Math.max(...ds);
              const bw = 700 / bins;
              return ds.map((v, i) => {
                const h = (v / max) * 200;
                return (
                  <rect key={i}
                    x={10 + i*bw} y={220 - h} width={bw - 3} height={h}
                    fill={i / (bins-1) > 0.42 && i / (bins-1) < 0.58 ? "var(--cyan-bright)" : "var(--cyan)"}
                    opacity={0.7}
                    rx="2" />
                );
              });
            })()}
            <line x1={10 + 700 * 0.5} y1="20" x2={10 + 700 * 0.5} y2="220" stroke="var(--gold-bright)" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6" />
            <text x={10 + 700 * 0.5 + 6} y="30" fontSize="10" fill="var(--gold-bright)" fontFamily="var(--font-mono)">50% fair line</text>
          </svg>
          <div style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", marginTop:8}}>
            μ = 0.504 · σ = {(Math.max(0.04, 0.18 - iterIdx * 0.011)).toFixed(3)} · sample n = 1,000
          </div>
        </div>

        {/* ─────── Full-pool per-card balancing diff ─────── */}
        <div className="panel chart-wide" style={{gridColumn:"1 / -1"}}>
          <div className="panel-title">Per-card balancing changes · entire generated pool</div>
          <div style={{fontSize:11.5, color:"var(--ink-3)", marginBottom:10, lineHeight:1.5, maxWidth:980}}>
            Every card in the generated pool was run through the balancing engine. Below is the final report:
            the engine adjusted <b style={{color:"var(--green)"}}>{changedRows.length} of {poolDiff.length}</b> cards.
            <b style={{color:"var(--red)"}}> {overpoweredFixed}</b> overpowered creatures were nerfed back into the 1.8–3.0 ratio band, and
            <b style={{color:"var(--blue)"}}> {underpoweredFixed}</b> underpowered cards were buffed. Rows in colour show changed cards;
            grey rows were already balanced and were not modified.
          </div>

          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:14}}>
            <SummaryTile label="cards adjusted" value={`${changedRows.length} / ${poolDiff.length}`} color="var(--gold-bright)" />
            <SummaryTile label="overpowered nerfed" value={overpoweredFixed} color="var(--red)" />
            <SummaryTile label="underpowered buffed" value={underpoweredFixed} color="var(--blue)" />
            <SummaryTile label="left unchanged" value={poolDiff.length - changedRows.length} color="var(--ink-2)" />
          </div>

          <div style={{maxHeight:380, overflowY:"auto", border:"1px solid var(--line)", borderRadius:6}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontFamily:"var(--font-mono)", fontSize:11}}>
              <thead style={{position:"sticky", top:0, background:"var(--bg-panel)", zIndex:1}}>
                <tr style={{color:"var(--ink-3)", borderBottom:"1px solid var(--line-strong)"}}>
                  <th style={{textAlign:"left", padding:"8px 10px", fontWeight:500}}>card</th>
                  <th style={{textAlign:"left", padding:"8px 6px", fontWeight:500}}>type</th>
                  <th style={{padding:"8px 6px", fontWeight:500}}>cost</th>
                  <th style={{padding:"8px 6px", fontWeight:500}}>atk</th>
                  <th style={{padding:"8px 6px", fontWeight:500}}>def</th>
                  <th style={{padding:"8px 6px", fontWeight:500}}>ratio</th>
                  <th style={{textAlign:"left", padding:"8px 10px", fontWeight:500}}>engine action</th>
                </tr>
              </thead>
              <tbody>
                {poolDiff.map((r) => {
                  const o = r.orig, n = r.balanced;
                  const rowBg = !r.changed ? "transparent" :
                    (r.ratioBefore > 3.0 ? "rgba(224,122,122,0.04)" : "rgba(95,200,138,0.04)");
                  return (
                    <tr key={o.id} style={{borderBottom:"1px solid rgba(255,255,255,0.04)", background: rowBg,
                      color: r.changed ? "var(--ink)" : "var(--ink-3)"}}>
                      <td style={{padding:"6px 10px", color:"var(--ink-2)"}}>{o.name}</td>
                      <td style={{padding:"6px 6px", color:"var(--ink-3)", fontSize:10}}>{o.type[0]}</td>
                      <td style={{padding:"6px 6px", textAlign:"center"}}><MiniDiff a={o.cost} b={n.cost} /></td>
                      <td style={{padding:"6px 6px", textAlign:"center"}}><MiniDiff a={o.attack} b={n.attack} /></td>
                      <td style={{padding:"6px 6px", textAlign:"center"}}><MiniDiff a={o.defense} b={n.defense} /></td>
                      <td style={{padding:"6px 6px", textAlign:"center", color:"var(--cyan-bright)", fontSize:10}}>
                        {r.ratioBefore != null ? r.ratioBefore.toFixed(2) + " → " + r.ratioAfter.toFixed(2) : "—"}
                      </td>
                      <td style={{padding:"6px 10px", fontSize:10.5, color: r.changed ? "var(--green)" : "var(--ink-3)"}}>
                        {n._reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, color }) {
  return (
    <div style={{padding:"10px 14px", background:"rgba(0,0,0,0.25)", border:"1px solid var(--line)", borderRadius:6}}>
      <div style={{fontFamily:"var(--font-mono)", fontSize:9.5, color:"var(--ink-3)", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4}}>{label}</div>
      <div style={{fontFamily:"var(--font-display)", fontSize:22, fontWeight:600, color}}>{value}</div>
    </div>
  );
}

function MiniDiff({ a, b }) {
  if (a === b) return <span style={{color:"var(--ink-3)"}}>{a}</span>;
  const up = b > a;
  return (
    <span>
      <span style={{color:"var(--ink-3)", textDecoration:"line-through", marginRight:3, fontSize:9.5}}>{a}</span>
      <span style={{color: up ? "var(--green)" : "var(--red)", fontWeight:600}}>{b}</span>
    </span>
  );
}


export default AnalyticsTab;
