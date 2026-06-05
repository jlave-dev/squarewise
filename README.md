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

- Node.js 22.14+ or 24.10+
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

### Run Unit Tests

```bash
npm test
```

### Full Local Verification

```bash
npm run check
```

### Watch Unit Tests

```bash
npm run test:watch
```

### Run End-to-End Tests

```bash
npm run test:e2e:install
npm run test:e2e
```

To test the production bundle locally, run:

```bash
npm run test:e2e:ci
```

## Deployment

Production deploys to GitHub Pages from the `main` branch through `.github/workflows/deploy.yml`.

- Vite builds with `base: '/squarewise/'`, so the app is served at `/squarewise/`.
- The deploy workflow runs type-checking, unit tests, a production build, and Playwright smoke tests against `vite preview` before uploading `dist`.
- `public/.nojekyll` keeps GitHub Pages from applying Jekyll processing.
- `public/manifest.json` and `public/sw.js` are copied into `dist` during the Vite build for PWA install/offline behavior.

Releases are created by `.github/workflows/release.yml` using semantic-release and conventional commits on `main`. Release publishing updates GitHub releases and package metadata only; npm package publishing is disabled.

Pull request titles and pushed commit messages are checked by `.github/workflows/commit-policy.yml`.

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

- Unit tests use Vitest and are located in `tests/*.test.ts`.
- Build verification is available via `npm run build`.
