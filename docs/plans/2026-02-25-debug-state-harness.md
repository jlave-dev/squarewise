# Debug State Harness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dev/test harness that can force SquareWise into key app states (without solving) via URL params, debug API, and a small in-app scenario picker.

**Architecture:** Implement deterministic scenario builders in a pure debug module, expose a dev-only bridge (`window.__SW_DEBUG__`) from `main.ts`, and add a lightweight floating scenario panel for manual QA. Use `Game` debug session hooks to apply grid/status/timer/hints directly while preserving normal production behavior.

**Tech Stack:** TypeScript, Vite SPA, Vitest.

---

## Acceptance Checks

1. `machine-testable` Query `?scenario=almost-won` parses into a valid debug scenario config.
2. `machine-testable` Invalid scenario query values are ignored safely.
3. `machine-testable` Scenario builder creates deterministic `almost-won` session with exactly one empty cell.
4. `machine-testable` Scenario builder creates deterministic `won` session with full solution grid and `status='won'`.
5. `machine-testable` `Game.applyDebugSession(...)` applies timer/status/grid without runtime errors.
6. `machine-testable` In `DEV`, debug API `window.__SW_DEBUG__` is attached; in production it is not.
7. `human-judgment` Floating scenario panel is unobtrusive and usable on desktop/mobile widths.
8. `human-judgment` Switching scenarios feels immediate and doesn’t require app reload.

## Task 1: Pure Scenario Module + Parsing

**Files:**
- Create: `src/debug/scenarios.ts`
- Create: `tests/debug-scenarios.test.ts`

**Step 1: Write failing tests for parsing + deterministic sessions**
- Add tests for query parsing and session generation.

**Step 2: Implement parser + builders**
- Add scenario IDs and parsing helper.
- Add session builder for `in-progress`, `paused`, `almost-won`, `won`.

**Step 3: Run targeted tests**
- Run: `npm run test -- tests/debug-scenarios.test.ts`
- Expected: PASS

## Task 2: Game Debug Session Hook

**Files:**
- Modify: `src/app/Game.ts`
- Modify: `src/app/StateManager.ts`

**Step 1: Write/extend failing tests where possible**
- Validate compile-level behavior via existing suite and debug scenario tests.

**Step 2: Implement `applyDebugSession` in Game**
- Apply grid/notes/status/timer/hints safely and render.
- Support `won` status in debug restore path.

**Step 3: Run targeted tests**
- Run: `npm run test -- tests/debug-scenarios.test.ts tests/backtrack-solver.test.ts`
- Expected: PASS

## Task 3: Main App Harness Integration

**Files:**
- Modify: `src/main.ts`
- Create: `src/debug/global.d.ts`

**Step 1: Add dev-only debug bridge**
- Attach `window.__SW_DEBUG__` with `listScenarios()` and `runScenario(...)`.

**Step 2: Add URL scenario bootstrapping**
- Parse query params and run scenario on startup.

**Step 3: Add floating scenario panel**
- Dev-only select + apply controls for scenario switching.

**Step 4: Wire win modal/share fallback scenarios**
- Include direct scenario for win modal and share fallback preview.

## Task 4: Verification

**Files:**
- Modify as needed: `src/main.ts`, `src/debug/scenarios.ts`, `src/app/Game.ts`

**Step 1: Full verification**
- Run: `npx tsc --noEmit`
- Run: `npm run build`
- Run: `npm run test`
- Expected: all pass

**Step 2: Manual QA**
- Run dev server and switch across all scenarios.
- Validate URL-driven scenario loading and debug bridge in console.
