# SquareWise

SquareWise is a browser-based KenKen-style puzzle game built with TypeScript and Vite.

## Features

- Multiple difficulties (`beginner`, `easy`, `medium`, `hard`, `expert`)
- Daily challenge puzzle generation
- Pause/resume timer behavior with tab visibility handling
- Notes mode, hints, undo/redo, and error highlighting
- Persistent settings and game/stat storage
- Mobile-friendly input with number pad and touch support

## Tech Stack

- TypeScript
- Vite
- HTML5 Canvas renderer
- Local browser storage (settings, stats, active game)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Controls

- `Click`/`Tap`: select a cell
- `1-9`: enter a value (bounded by grid size)
- `Arrow keys`: move selection
- `Backspace`/`Delete`: clear selected cell
- `Ctrl/Cmd+Z`: undo
- `Ctrl/Cmd+Shift+Z` or `Ctrl/Cmd+Y`: redo
- `N`: toggle notes mode
- `H`: request hint
- `P` or `Esc`: pause/resume

## Project Structure

- `src/app`: game orchestration, input wiring, state coordination
- `src/core`: timer, hint, undo, daily challenge logic
- `src/engine`: puzzle generation, solving, validation, difficulty presets
- `src/renderer`: canvas and UI rendering
- `src/storage`: persistence for active game, settings, and stats
- `src/ui`: modal screens and controls
- `src/styles`: theme and layout styles

## Notes

- This repository currently has no automated test suite configured.
- Build verification is available via `npm run build`.
