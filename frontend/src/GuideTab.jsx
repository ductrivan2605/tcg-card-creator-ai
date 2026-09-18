import React from "react";

const SUGGESTED_THEMES = [
  {
    name: "Abyssal Depths",
    desc: "Bioluminescent predators, tidal crushing spells, and oceanic trenches.",
    tag: "Deep Water / Control",
  },
  {
    name: "Solar Pantheon",
    desc: "Radiant deities, blinding bursts, golden shields, and daylight blessings.",
    tag: "Light / Aggro & Buffs",
  },
  {
    name: "Vietnamese Street Food",
    desc: "Bún bò, phở masters, sizzling banh mi vendors, and aromatic broth spells.",
    tag: "Culinary / Synergies",
  },
  {
    name: "Cyberpunk Shinobi",
    desc: "Neon katana strikes, digital cloaking, cybernetic stealth, and overload traps.",
    tag: "Tech / Swift Damage",
  },
  {
    name: "Forgotten Gods",
    desc: "Ancient petrified titans, cosmic void rifts, and sacrificial summonings.",
    tag: "Eldritch / Late Game",
  },
];

function GuideTab({ onNavigate, setTopic, hasCards }) {
  function handleSelectTheme(themeName) {
    if (setTopic) {
      setTopic(themeName);
    }
    if (onNavigate) {
      onNavigate("generate");
    }
  }

  return (
    <div className="guide-root">
      {/* ── Hero Banner ── */}
      <div className="guide-hero">
        <div className="guide-hero-badge">
          <span className="guide-badge-dot"></span>
          User Guide & Tutorial
        </div>
        <h1 className="guide-hero-title">
          How to Generate & Balance <span className="guide-title-highlight">AI Trading Cards</span>
        </h1>
        <p className="guide-hero-desc">
          Bún Real Cua uses a hybrid AI pipeline: large language models design the lore, card abilities, and rules,
          while our simulation engine mathematically balances your 60-card deck for tactical arena gameplay.
        </p>
        <div className="guide-hero-actions">
          <button
            className="guide-btn-primary"
            onClick={() => onNavigate && onNavigate("generate")}
          >
            <span className="guide-btn-icon">⚡</span>
            Go to Generate Tab
          </button>
          {hasCards && (
            <button
              className="guide-btn-secondary"
              onClick={() => onNavigate && onNavigate("deck")}
            >
              <span className="guide-btn-icon">🃏</span>
              View Current Deck
            </button>
          )}
        </div>
      </div>

      {/* ── 4-Step Interactive Flow ── */}
      <div className="guide-section">
        <div className="guide-section-header">
          <span className="guide-section-number">01</span>
          <div>
            <h2 className="guide-section-title">The 4-Step Generation Pipeline</h2>
            <p className="guide-section-subtitle">From a simple theme prompt to a playable deck in under a minute.</p>
          </div>
        </div>

        <div className="guide-steps-grid">
          {/* Step 1 */}
          <div className="guide-step-card">
            <div className="guide-step-num-badge">STEP 1</div>
            <div className="guide-step-icon">💡</div>
            <h3 className="guide-step-title">Choose Your Theme</h3>
            <p className="guide-step-body">
              Type any concept in the <strong>Generate</strong> tab—from fantasy deities to street food.
            </p>
            <div className="guide-step-tip">
              <span className="guide-tip-label">Modes:</span>
              <ul className="guide-tip-list">
                <li><strong>⚡ Fast Mode:</strong> Builds complete cards in 5 seconds with instant archetype art.</li>
                <li><strong>🎨 Full Art:</strong> Generates unique, high-resolution AI illustrations for every card.</li>
              </ul>
            </div>
          </div>

          {/* Step 2 */}
          <div className="guide-step-card">
            <div className="guide-step-num-badge">STEP 2</div>
            <div className="guide-step-icon">⚙️</div>
            <h3 className="guide-step-title">Watch Real-time Synthesis</h3>
            <p className="guide-step-body">
              The engine streams its generation pipeline live on your screen:
            </p>
            <div className="guide-step-tip">
              <span className="guide-tip-label">Pipeline:</span>
              <ul className="guide-tip-list">
                <li><strong>Rules:</strong> Establishes mana curves and win-conditions.</li>
                <li><strong>Cards:</strong> Crafts balanced Creatures, Spells, and Terrains.</li>
                <li><strong>Balance:</strong> Automatically normalizes stats across rarity tiers.</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="guide-step-card">
            <div className="guide-step-num-badge">STEP 3</div>
            <div className="guide-step-icon">✍️</div>
            <h3 className="guide-step-title">Inspect & Edit Cards</h3>
            <p className="guide-step-body">
              Switch to the <strong>Deck</strong> tab to explore your entire collection.
            </p>
            <div className="guide-step-tip">
              <span className="guide-tip-label">Editor:</span>
              <ul className="guide-tip-list">
                <li>Click any card to open the <strong>Card Inspector</strong>.</li>
                <li>Fine-tune Attack, Health, Cost, Rarity, and Name.</li>
                <li>Edit abilities—the game engine dynamically re-quantifies rules.</li>
              </ul>
            </div>
          </div>

          {/* Step 4 */}
          <div className="guide-step-card">
            <div className="guide-step-num-badge">STEP 4</div>
            <div className="guide-step-icon">⚔️</div>
            <h3 className="guide-step-title">Balance & Battle in Godot</h3>
            <p className="guide-step-body">
              Verify your deck’s win rates and test it on the battlefield.
            </p>
            <div className="guide-step-tip">
              <span className="guide-tip-label">Play & Test:</span>
              <ul className="guide-tip-list">
                <li><strong>Analytics:</strong> Inspect mana curve & archetype distribution.</li>
                <li><strong>Auto-Balance:</strong> Run simulated rounds against meta benchmarks.</li>
                <li><strong>Godot Client:</strong> Play your cards in the 5-lane battle arena.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick-Launch Theme Inspiration ── */}
      <div className="guide-section">
        <div className="guide-section-header">
          <span className="guide-section-number">02</span>
          <div>
            <h2 className="guide-section-title">Theme Inspiration & Quick Start</h2>
            <p className="guide-section-subtitle">Click any sample theme below to launch the generator with that prompt:</p>
          </div>
        </div>

        <div className="guide-themes-grid">
          {SUGGESTED_THEMES.map((th) => (
            <div
              key={th.name}
              className="guide-theme-card"
              onClick={() => handleSelectTheme(th.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && handleSelectTheme(th.name)}
            >
              <div className="guide-theme-header">
                <span className="guide-theme-name">{th.name}</span>
                <span className="guide-theme-tag">{th.tag}</span>
              </div>
              <p className="guide-theme-desc">{th.desc}</p>
              <div className="guide-theme-action">
                <span>Use this theme</span>
                <span className="guide-theme-arrow">→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card Types & Mechanics Cheat Sheet ── */}
      <div className="guide-section">
        <div className="guide-section-header">
          <span className="guide-section-number">03</span>
          <div>
            <h2 className="guide-section-title">Card Types & Battle Rules</h2>
            <p className="guide-section-subtitle">How card archetypes behave when exported to the Godot battle arena.</p>
          </div>
        </div>

        <div className="guide-mechanics-grid">
          <div className="guide-mechanic-card">
            <div className="guide-mechanic-badge creature">CREATURE</div>
            <h4 className="guide-mechanic-title">Board Units (Minions)</h4>
            <p className="guide-mechanic-text">
              Deployed onto any of the 5 board lanes. Each turn they can attack enemy units directly opposite them,
              or strike the enemy player's face if the enemy lane is empty.
            </p>
            <div className="guide-mechanic-meta">
              <strong>Stats:</strong> Cost, Attack (ATK), Health (DEF). Supports keywords like <em>Rush</em>, <em>Shield</em>, <em>Taunt</em>, and <em>Deathrattle</em>.
            </div>
          </div>

          <div className="guide-mechanic-card">
            <div className="guide-mechanic-badge spell">SPELL</div>
            <h4 className="guide-mechanic-title">Instant Sorceries</h4>
            <p className="guide-mechanic-text">
              Played directly from your hand for an immediate tactical effect: direct damage, card draw, mass lane wipes,
              stun locks, or stat augmentations for your allied units.
            </p>
            <div className="guide-mechanic-meta">
              <strong>Duration:</strong> Resolves immediately with on-screen preview animation, then moves to graveyard.
            </div>
          </div>

          <div className="guide-mechanic-card">
            <div className="guide-mechanic-badge terrain">TERRAIN</div>
            <h4 className="guide-mechanic-title">Environmental Field Effects</h4>
            <p className="guide-mechanic-text">
              Persistent landscape modifiers (such as Abyssal Trenches or Solar Altars) that apply passive bonuses,
              mana generation, or weather hazards to board slots throughout the duel.
            </p>
            <div className="guide-mechanic-meta">
              <strong>Duration:</strong> Stays active on the board until superseded or countered.
            </div>
          </div>
        </div>
      </div>

      {/* ── FAQ & Tips ── */}
      <div className="guide-section">
        <div className="guide-section-header">
          <span className="guide-section-number">04</span>
          <div>
            <h2 className="guide-section-title">Frequently Asked Questions</h2>
            <p className="guide-section-subtitle">Helpful pointers for best results.</p>
          </div>
        </div>

        <div className="guide-faq-grid">
          <div className="guide-faq-item">
            <h4 className="guide-faq-q">Can I edit cards after AI generation?</h4>
            <p className="guide-faq-a">
              Yes! Click on any card in the <strong>Deck</strong> tab. The Card Editor lets you change card names,
              artwork URLs, attack/health numbers, mana costs, and write custom ability descriptions.
            </p>
          </div>

          <div className="guide-faq-item">
            <h4 className="guide-faq-q">Where are my saved decks stored?</h4>
            <p className="guide-faq-a">
              Projects are automatically persisted in your browser storage and synchronized to your local/cloud
              PostgreSQL database. You can also export a <code>.zip</code> file anytime from the top bar.
            </p>
          </div>

          <div className="guide-faq-item">
            <h4 className="guide-faq-q">How do I test my deck in Godot?</h4>
            <p className="guide-faq-a">
              Launch the Godot client in <code>godot_client/</code>. It connects automatically to your running server
              (<code>https://tcg-rmit.duckdns.org/api</code>), allowing you to immediately battle an AI opponent using your generated cards.
            </p>
          </div>

          <div className="guide-faq-item">
            <h4 className="guide-faq-q">What makes a great theme prompt?</h4>
            <p className="guide-faq-a">
              Descriptive themes that suggest both creature types and magical elements work best (e.g. <em>"Bioluminescent deep sea horror with tidal waves"</em> or <em>"Clockwork automatons powered by steam and lightning"</em>).
            </p>
          </div>
        </div>
      </div>

      {/* ── Ready to Build CTA Banner ── */}
      <div className="guide-cta-box">
        <div className="guide-cta-content">
          <h3 className="guide-cta-title">Ready to create your first deck?</h3>
          <p className="guide-cta-sub">
            Jump into the generator tab to pick a theme and craft your custom 60-card collection.
          </p>
        </div>
        <button
          className="guide-btn-primary guide-btn-large"
          onClick={() => onNavigate && onNavigate("generate")}
        >
          <span>Start Generating</span>
          <span className="guide-btn-icon">→</span>
        </button>
      </div>
    </div>
  );
}

export default GuideTab;
