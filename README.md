# SquareWise

SquareWise is a browser-based KenKen-style puzzle game built with vanilla TypeScript, Vite, and a canvas-first UI. It is designed as a daily puzzle app with generated grids, difficulty levels, hints, notes, stats, sharing, and a guided tutorial for new players.

Live app: [https://jlave-dev.github.io/squarewise/](https://jlave-dev.github.io/squarewise/)

## Features

- Generated KenKen-style puzzles across `beginner`, `easy`, `medium`, `hard`, and `expert`
- Daily challenge and archived challenge generation from deterministic seeds
- Guided tutorial with a small deterministic starter puzzle
- Notes mode, undo/redo, pause/resume, keyboard shortcuts, and touch number pad input
- Tiered hint system with hint usage tracked in win stats
- Canvas board rendering with an accessible DOM board mirror for assistive technology and tests
- Persistent settings, active-game state, tutorial state, and stats in browser storage
- Win screen sharing with native Web Share support and fallback copy/social actions
- PWA manifest, service worker, app icons, and GitHub Pages deployment

## Requirements

- Node.js `22.14+` or `24.10+`
- npm

The Node version requirement is driven by the current semantic-release toolchain. CI currently uses Node 22.

## Quick Start

```bash
npm ci
npm run dev
```

Vite serves the app at:

```text
http://localhost:5173/squarewise/
```

The app uses a `/squarewise/` base path in development and production so local behavior matches the GitHub Pages deployment shape.

## Scripts

```bash
npm run dev          # Start Vite dev server on port 5173
npm run build        # Build production assets into dist/
npm run preview      # Preview the production build
npm run typecheck    # Run TypeScript without emitting files
npm test             # Run Vitest unit/integration tests
npm run test:watch   # Run Vitest in watch mode
npm run check        # Type-check, test, and build
npm run test:e2e     # Run Playwright tests with the configured web server
npm run test:e2e:ci  # Build, preview, and run Playwright against production assets
npm run test:e2e:ui  # Open the Playwright test UI
```

Install the Playwright Chromium browser before the first local E2E run:

```bash
npm run test:e2e:install
```

## Development

The main app starts in [`src/main.ts`](src/main.ts). Runtime orchestration lives in [`src/app/Game.ts`](src/app/Game.ts), with puzzle generation and validation under [`src/engine`](src/engine), rendering under [`src/renderer`](src/renderer), persistent browser state under [`src/storage`](src/storage), and modal/control UI under [`src/ui`](src/ui).

Useful development entry points:

- [`src/tutorial`](src/tutorial): tutorial flow and starter puzzle
- [`src/core/HintSystem.ts`](src/core/HintSystem.ts): tiered hint selection
- [`src/core/DailyChallenge.ts`](src/core/DailyChallenge.ts): seeded daily and archive puzzles
- [`src/ui/AccessibleBoard.ts`](src/ui/AccessibleBoard.ts): DOM mirror for the canvas board
- [`src/debug/scenarios.ts`](src/debug/scenarios.ts): URL-driven scenarios for deterministic QA and E2E setup
- [`tests/e2e/squarewise.spec.ts`](tests/e2e/squarewise.spec.ts): browser coverage for tutorial, hints, keyboard flow, modals, and win effects

Debug scenarios can be loaded with query parameters, for example:

```text
http://localhost:5173/squarewise/?scenario=in-progress&difficulty=easy
http://localhost:5173/squarewise/?scenario=tutorial-step&step=place-value
http://localhost:5173/squarewise/?scenario=hint-tier&tier=4&difficulty=easy
```

The floating debug UI and global debug bridge are intended for development only.

## Testing

SquareWise uses Vitest for pure logic and integration-style tests, plus Playwright for browser flows. Playwright starts the Vite dev server by default, or uses `PLAYWRIGHT_WEB_SERVER_COMMAND`/`PLAYWRIGHT_BASE_URL` when those environment variables are set.

The default local verification path is:

```bash
npm run check
npm run test:e2e:ci
```

Test coverage focuses on:

- puzzle generation, cages, clues, solver, validation, and difficulty scoring
- daily challenge determinism and stats updates
- notes, input handling, undo/redo, timer, hints, animations, and sharing
- accessible board state and canvas render-state extraction
- URL-driven debug scenarios for deterministic E2E setup
- production-preview browser flows with console warning/error checks

## Deployment and Releases

GitHub Pages deployment is defined in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). On pushes to `main`, the workflow:

1. installs dependencies with `npm ci`
2. runs `npm run typecheck`
3. runs `npm test`
4. builds production assets
5. installs Playwright Chromium
6. runs Playwright against `vite preview`
7. uploads `dist/` to GitHub Pages

Release automation is defined in [`.github/workflows/release.yml`](.github/workflows/release.yml) and [`release.config.cjs`](release.config.cjs). semantic-release creates GitHub releases from conventional commits on `main`. npm publishing is disabled with `npmPublish: false`.

Pull request titles and pushed commits are checked by [`.github/workflows/commit-policy.yml`](.github/workflows/commit-policy.yml) using conventional commit rules from [`commitlint.config.cjs`](commitlint.config.cjs).

Production build details:

- Vite base path: `/squarewise/`
- Build output: `dist/`
- Public assets: copied from `public/`
- GitHub Pages Jekyll bypass: [`public/.nojekyll`](public/.nojekyll)
- Service worker: [`public/sw.js`](public/sw.js)
- Manifest: [`public/manifest.json`](public/manifest.json)
- PWA icons: [`public/icons`](public/icons)

## Browser Storage

The app stores user-facing state locally in the browser:

- settings and preferences
- active game snapshot
- stats and daily results
- tutorial completion or skip state

For a clean manual QA pass, clear local storage and the `squarewise` IndexedDB database before loading a scenario. Clearing session storage is optional; the E2E setup clears it as a harmless extra reset.

## Troubleshooting

If the local app is not at `/squarewise/`, check that you are opening the Vite URL with the base path:

```text
http://localhost:5173/squarewise/
```

If the production preview is stale, rebuild before previewing:

```bash
npm run build
npm run preview
```

If a deployed page appears stale, unregister the service worker or hard refresh. The service worker keeps navigation network-first, but older browser caches can still make release testing confusing.

If Playwright cannot find Chromium, run:

```bash
npm run test:e2e:install
```

## Project Structure

```text
src/
  app/        game orchestration, state manager, input handler, sharing
  core/       timer, undo stack, hints, daily challenge logic
  debug/      URL scenario parsing and dev-only test hooks
  engine/     puzzle generation, solving, validation, difficulty scoring
  renderer/   canvas, effects, toolbar rendering, board render state
  storage/    browser persistence stores
  tutorial/   guided tutorial controller and tutorial puzzle
  types/      shared game and puzzle types
  ui/         modals, settings, stats, win screen, accessible board, number pad
  utils/      animation and input capability helpers
tests/
  e2e/        Playwright browser tests
  *.test.ts   Vitest unit and integration tests
public/
  icons/      favicon and PWA icons
  manifest.json
  sw.js
```

## Contributing

Use conventional commit messages and keep PR titles conventional as well. Before opening or merging a PR, run:

```bash
npm run check
npm run test:e2e:ci
```

For canvas-facing behavior, prefer deterministic state hooks and DOM assertions over screenshot-only validation.

## License

No license file is currently present in this repository.
