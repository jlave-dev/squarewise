# AGENTS.md

Concise guidance for coding agents working in this repository.

## Project Overview

SquareWise is a KenKen-style daily puzzle game. Stack: vanilla TypeScript + Vite SPA + canvas rendering.

## Commands

- `npm run dev` - Dev server (`:5173`)
- `npm run build` - Production build (`dist/`)
- `npm run preview` - Preview production build
- `npx tsc --noEmit` - Type-check

## Feature Workflow (Actionable)

Use this for all features and bugfixes:

1. Define 5-10 acceptance checks; tag each `machine-testable` or `human-judgment`.
2. Add test observability (especially for canvas): expose test-only state hooks behind a flag.
3. Test in layers:
   - Unit: pure logic (generator, validator, difficulty, timer/undo logic)
   - Integration: input -> state transitions -> renderer interactions
   - E2E: key flows (new game, settings persistence, win flow)
4. Verify before completion:
   - `npx tsc --noEmit`
   - `npm run build`
   - relevant tests
   - deterministic seeds for random behavior
5. Run brief manual QA for UX quality (readability, touch feel, animation smoothness, visual clarity).
6. For escaped bugs, add or strengthen automated tests.

## AI Testing Practices

- Use AI to accelerate test authoring/refactoring, not to decide correctness by itself.
- Pass/fail must come from deterministic assertions (state, DOM, ARIA snapshots, and stable E2E checks), not screenshot interpretation alone.
- For canvas features, prefer test-mode state hooks over visual-only checks.
- If using self-healing locators/tools, treat heals as review-required signals; do not silently accept them as valid behavior.
- Keep screenshot/visual diff tests targeted for layout regressions; avoid using them as primary functional proof.
- Always keep a brief human QA pass for UX quality (readability, motion smoothness, touch feel, visual clarity).

### Strengths
- High confidence from behavior-first checks
- Fast regression detection in CI
- Matches this logic-first architecture

### Weaknesses
- Upfront cost for hooks/harnesses
- Canvas visuals still need human validation
- E2E/visual tests can be flaky without deterministic setup

## Architecture

### Entry Point
`src/main.ts` - bootstrap + orchestration

### Core Modules
- `src/app/Game.ts` - central controller (renderer/input/state/timer/undo)
- `src/app/StateManager.ts` - puzzle/grid/notes/selection state
- `src/app/InputHandler.ts` - mouse/touch selection handling

### Rendering
- `src/renderer/CanvasRenderer.ts` - main canvas render; DPR-aware; config in `DEFAULT_CONFIG`
- `src/renderer/UIRenderer.ts` - DOM toolbar/buttons
- `src/renderer/EffectsRenderer.ts` - overlay effects

### Puzzle Engine
- `src/engine/generator/PuzzleGenerator.ts` - generation entry
- `src/engine/generator/LatinSquare.ts` - valid solution grid generation
- `src/engine/generator/CageGenerator.ts` - cage layout generation
- `src/engine/generator/ClueCalculator.ts` - clue target/operator calculation
- `src/engine/validation/Validator.ts` - move/cage validation
- `src/engine/difficulty/DifficultyEngine.ts` - difficulty scoring
- `src/engine/difficulty/presets.ts` - difficulty presets

### Data Types
`src/types/puzzle.ts` defines:
- `Puzzle` - size/cages/solution
- `Cage` - constrained cell region
- `Clue` - target + operation (`+`, `-`, `×`, `÷`)
- `Difficulty` - 'beginner' | 'easy' | 'medium' | 'hard' | 'expert'

### Storage
- `src/storage/SettingsStore.ts` - preferences
- `src/storage/StatsStore.ts` - stats
- `src/storage/IndexedDB.ts` - persisted game state

### UI Components
- `src/ui/LevelSelect.ts` - Difficulty selection modal
- `src/ui/NumberPad.ts` - Touch number input
- `src/ui/SettingsPanel.ts` - Settings modal
- `src/ui/WinScreen.ts` - Victory screen

### Daily Challenges
`src/core/DailyChallenge.ts` - seeded daily puzzle generation

## Key Patterns

- Game state flows: InputHandler → Game → StateManager → CanvasRenderer
- Puzzle is generated once at game start; solution lives on puzzle object
- CanvasRenderer handles DPR scaling for crisp rendering
- Service worker caches assets for offline support

## Gotchas

- Service worker caching can serve old builds; hard refresh (`Cmd+Shift+R`) or unregister SW in DevTools.
- Canvas size is controlled by `CanvasRenderer.adjustCanvasSize()`; do not override via CSS/JS resize.
- `InputHandler` config is synced from `CanvasRenderer` at startup; keep them aligned when renderer config changes.

## Behavioral Guardrails

- Programmatic modal hide/close flows must not trigger user-facing close callbacks unless the modal is currently open.
- Keep app-state harnesses URL-driven and refresh-safe: selecting a scenario should update URL params via `history.replaceState`.
- Accept flexible scenario URL formats (`scenario/state` keys, normalized values), but parse to one canonical scenario ID internally.
- Environment split for harnesses:
  - URL scenario bootstrapping may run in any mode.
  - Floating debug UI and global debug bridge (`window.__SW_DEBUG__`) must be dev-only.
- Share behavior contract:
  - Use native Web Share first when available.
  - Treat user-cancel (`AbortError`) as non-error.
  - Provide fallback actions (social intent + copy action) when native share is unavailable.
- Key shortcut hints should be context-aware; hide keyboard shortcut hint text while the on-screen keypad is expanded.
