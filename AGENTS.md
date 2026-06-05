# AGENTS.md

Repository-wide instructions for coding agents working on SquareWise.

## Project Context

SquareWise is a vanilla TypeScript + Vite single-page puzzle game served from `/squarewise/`. The UI is canvas-first, with DOM controls and an accessible board mirror for assistive technology and deterministic tests.

Read [`README.md`](README.md) first for current setup, architecture, deployment, and troubleshooting details.

## Commands

Run commands from the repository root.
Use Node 22 to match CI.

```bash
npm ci               # Install locked dependencies
npm run dev          # Start Vite on port 5173 at /squarewise/
npm run typecheck    # TypeScript check
npm test             # Vitest suite
npm run build        # Production build into dist/
npm run check        # typecheck + tests + build
npm run test:e2e     # Playwright against configured web server
npm run test:e2e:ci  # build + preview + Playwright against production assets
```

Install the Playwright browser before the first local E2E run:

```bash
npm run test:e2e:install
```

Use `npm install` only when intentionally changing dependencies.

## Validation

- For logic-only changes, run the closest Vitest file plus `npm run typecheck`.
- For UI, input, tutorial, share, stats, storage, or rendering changes, run `npm run check`.
- For canvas, keyboard, modal, tutorial, win-screen, deployment, service worker, or base-path changes, also run `npm run test:e2e:ci`.
- After significant frontend changes, manually smoke test `/squarewise/` in a browser. Prefer deterministic URLs such as `?scenario=in-progress&difficulty=easy` or `?scenario=tutorial-step&step=place-value`.
- Do not finish with a long-running dev or preview server still active.

## Testing and Debug Hooks

- Prefer deterministic assertions over screenshot interpretation.
- For canvas behavior, expose or reuse test-only state hooks instead of relying on visual checks alone.
- URL scenario bootstrapping may run in any mode.
- Floating debug UI and `window.__SW_DEBUG__` must remain development-only.
- Keep scenario URLs refresh-safe by updating URL params with `history.replaceState`.
- Accept flexible scenario URL formats, but normalize to one internal scenario ID.

Useful files:

- [`src/debug/scenarios.ts`](src/debug/scenarios.ts): URL scenarios and fixtures
- [`src/ui/AccessibleBoard.ts`](src/ui/AccessibleBoard.ts): DOM board mirror
- [`src/renderer/boardRenderState.ts`](src/renderer/boardRenderState.ts): render-state extraction for tests
- [`tests/e2e/squarewise.spec.ts`](tests/e2e/squarewise.spec.ts): Playwright coverage

## Architecture Notes

- Main bootstrap: [`src/main.ts`](src/main.ts)
- Game controller: [`src/app/Game.ts`](src/app/Game.ts)
- State manager: [`src/app/StateManager.ts`](src/app/StateManager.ts)
- Input handler: [`src/app/InputHandler.ts`](src/app/InputHandler.ts)
- Canvas renderer: [`src/renderer/CanvasRenderer.ts`](src/renderer/CanvasRenderer.ts)
- Puzzle generation and validation: [`src/engine`](src/engine)
- Browser persistence: [`src/storage`](src/storage)
- Tutorial flow: [`src/tutorial`](src/tutorial)

State generally flows from input handlers to `Game`, through `StateManager`, then into renderers and UI mirrors. The puzzle solution lives on the puzzle object after generation.

## Behavioral Guardrails

- Programmatic modal hide/close flows must not trigger user-facing close callbacks unless the modal is currently open.
- Keep `InputHandler` board geometry aligned with `CanvasRenderer`; canvas sizing is owned by `CanvasRenderer.adjustCanvasSize()`.
- Native Web Share should be tried first when available. Treat user-cancel `AbortError` as a non-error.
- Provide fallback share actions when native share is unavailable.
- Hide keyboard shortcut hint text while the on-screen keypad is expanded.
- Service worker and Vite base-path changes must be checked against production preview because GitHub Pages serves the app from `/squarewise/`.

## Repository Boundaries

- Do not edit `dist/`; it is generated build output.
- Keep generated logo exploration under `outputs/logos/` and generated screenshots under `outputs/screenshots/`.
- Do not introduce new runtime dependencies unless the app genuinely needs them; this repo is intentionally vanilla TypeScript.
- Do not put secrets or environment-specific credentials in the repo. No `.env` file is required for normal development.

## Git and Release Workflow

- Use conventional commit messages and conventional PR titles.
- PR titles are checked on pull request events by [`.github/workflows/commit-policy.yml`](.github/workflows/commit-policy.yml). Pushed commit messages are checked on pushes to `main`; keep branch commits conventional so release behavior is predictable.
- GitHub Pages deploys from `main` through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
- semantic-release creates GitHub releases from `main`; npm publishing is disabled in [`release.config.cjs`](release.config.cjs).
