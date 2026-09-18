# Bún Real Cua · TCG Balance Engine v0.9

A trading card game balance engine built with React + Vite. Design decks, simulate battles, and analyze card balance — all in the browser.

---

## Prerequisites

- **Node.js** v18 or higher ([download here](https://nodejs.org))
- **npm** v8 or higher (comes with Node.js)

Check your versions:
```bash
node --version
npm --version
```

---

## Installation

**1. Install dependencies**

```bash
npm install
```

This installs React, Vite, JSZip, and all other required packages into `node_modules/`.

---

## Development

**2. Start the dev server**

```bash
npm run dev
```

Open your browser to **http://localhost:5173** (Vite will print the exact URL in the terminal).

The dev server supports **hot module replacement (HMR)** — changes to any `.jsx`, `.js`, or `.css` file reload instantly without losing app state.

---

## Production Build

```bash
npm run build
```

Outputs optimised files to the `dist/` folder. To preview the production build locally:

```bash
npm run preview
```

---

## Project Structure

```
bun-real-cua/
├── index.html              # HTML entry point
├── vite.config.js          # Vite configuration
├── package.json
└── src/
    ├── main.jsx            # React entry point — mounts <App />
    ├── App.jsx             # Root component: tabs, sidebar, editor rail
    ├── templates.js        # Deck template system (slot layout, layer resolver)
    ├── data.js             # Static deck presets (Deep Sea, Greek Mythology, etc.)
    ├── projects.js         # localStorage-backed multi-project manager
    ├── balance.js          # Card balance engine
    ├── card-io.js          # ZIP export / import using JSZip
    ├── Card.jsx            # Card tile renderer
    ├── CardEditor.jsx      # Full card + deck template editor
    ├── tweaks-panel.jsx    # Floating tweaks panel + useTweaks hook
    ├── OrchestrateTab.jsx  # AI orchestration demo tab
    ├── GenerateTab.jsx     # Card grid + generation tab
    ├── SimulateTab.jsx     # Battle simulator tab
    ├── AnalyticsTab.jsx    # Balance analytics + heatmap tab
    ├── DeckTab.jsx         # Before/after balance deck view
    ├── styles.css          # Main design system (Abyssal theme)
    └── battle.css          # Battle simulator styles
```

---

## Available Scripts

| Command           | Description                                  |
|-------------------|----------------------------------------------|
| `npm install`     | Install all dependencies (run this first)    |
| `npm run dev`     | Start dev server with HMR at localhost:5173  |
| `npm run build`   | Build for production into `dist/`            |
| `npm run preview` | Serve the production build locally           |

---

## Key Dependencies

| Package   | Purpose                              |
|-----------|--------------------------------------|
| react     | UI framework                         |
| react-dom | DOM rendering                        |
| vite      | Build tool + dev server              |
| jszip     | ZIP export/import for card decks     |

---

## Data Persistence

Projects are saved to **browser localStorage** automatically (key: `bunRealCua.v1`). Use the **↓ export** button to download a `.zip` backup, and **↑ import** to restore. The storage indicator in the left sidebar tracks usage against the browser's ~5 MB cap.
