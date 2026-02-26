# Share Button Social Wire-Up Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the win-screen `Share` button reliably share puzzle results using native share sheets when available, with social and clipboard fallbacks when not.

**Architecture:** Add a small `ShareService` abstraction used by `main.ts` and `WinScreen.ts`. The service will assemble a canonical share payload (`title`, `text`, `url`) and execute a capability-driven strategy: `navigator.share` first, then fallback UI for social intent links and copy link. WinScreen remains presentation-focused and delegates behavior to callback/service.

**Tech Stack:** TypeScript, Vite SPA, Vitest (unit + DOM integration), browser Web Share API, Clipboard API.

---

## Web Research Inputs (Modern Behavior)

- Prefer native share sheet when available (`navigator.share` in secure contexts), triggered directly from a user gesture.
  - Source: MDN `Navigator.share()` and `Navigator.canShare()`
  - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
  - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/canShare
- Graceful fallback is expected for unsupported browsers; a “share button pattern” should still offer useful options.
  - Source: web.dev Share Button Pattern (updated Jan 13, 2026)
  - https://web.dev/patterns/files/share-files-pattern
- If a user cancels the native share sheet (`AbortError`), treat as non-error/no noisy alert.
  - Source: MDN exception behavior for `navigator.share`
  - https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share
- Web Share support is broad but not universal, so fallback paths remain necessary.
  - Source: Can I use: Web Share API
  - https://caniuse.com/web-share
- Include social sharing intents in fallback (for example X share URL intent) instead of clipboard-only behavior.
  - Source: X share URL docs
  - https://developer.x.com/en/docs/x-for-websites/tweet-button/guides/web-intent

## Acceptance Checks

1. `machine-testable` Clicking `Share` on win screen calls wired callback exactly once.
2. `machine-testable` On supported browsers, share handler calls `navigator.share({ title, text, url })` with expected content.
3. `machine-testable` If `navigator.share` rejects with `AbortError`, UI state remains unchanged and no error message is shown.
4. `machine-testable` If native share is unavailable/fails (non-abort), fallback options render: at least X intent + copy link.
5. `machine-testable` Fallback copy action writes to clipboard and sets a visible “Copied” confirmation state.
6. `machine-testable` Social fallback links include encoded text/url and open safely (`target="_blank"`, `rel="noopener noreferrer"`).
7. `machine-testable` Share payload is deterministic for a given `WinStats` input.
8. `human-judgment` Win modal share section feels obvious and not cluttered on mobile and desktop.
9. `human-judgment` Tap/click flow feels immediate; no confusing silent failure states.

## Task 1: Add Share Domain Model + Payload Builder

**Files:**
- Create: `src/app/share/SharePayload.ts`
- Create: `tests/share-payload.test.ts`

**Step 1: Write failing tests for payload generation**
- Verify payload includes stable `title`, formatted `text`, and canonical `url`.
- Verify text includes difficulty, grid size, and solve time.

**Step 2: Implement minimal payload builder**
- Add pure function like `buildWinSharePayload(stats, pageUrl)`.
- Keep logic deterministic and side-effect free.

**Step 3: Run targeted tests**
- Run: `npm run test -- tests/share-payload.test.ts`
- Expected: PASS

**Step 4: Commit**
- `git add src/app/share/SharePayload.ts tests/share-payload.test.ts`
- `git commit -m "feat: add deterministic win share payload builder"`

## Task 2: Add ShareService Strategy (Native -> Social/Clipboard Fallback)

**Files:**
- Create: `src/app/share/ShareService.ts`
- Test: `tests/share-service.test.ts`

**Step 1: Write failing tests for strategy behavior**
- Native supported: calls `navigator.share`.
- Unsupported: returns fallback model with social links + copy metadata.
- AbortError: returns `cancelled` result (non-error).

**Step 2: Implement minimal strategy**
- Expose method: `shareWinResult(payload): Promise<ShareResult>`.
- `ShareResult` union (e.g. `shared | cancelled | fallback | failed`).
- Add helper to generate social intent URL set (start with X; optional extensible list).

**Step 3: Run targeted tests**
- Run: `npm run test -- tests/share-service.test.ts`
- Expected: PASS

**Step 4: Commit**
- `git add src/app/share/ShareService.ts tests/share-service.test.ts`
- `git commit -m "feat: implement share service with native and fallback modes"`

## Task 3: Wire WinScreen + App Callback

**Files:**
- Modify: `src/main.ts`
- Modify: `src/ui/WinScreen.ts`
- Test: `tests/win-screen-share.integration.test.ts`

**Step 1: Write failing integration test**
- Render win screen in DOM test env and click `Share`.
- Assert callback is invoked and receives share state updates.

**Step 2: Implement callback wiring in app setup**
- In `setupUICallbacks()`, call `this.winScreen.setOnShare(...)`.
- Build payload from latest win stats and route through `ShareService`.

**Step 3: Add fallback UI surface in WinScreen**
- Add small expandable area in modal showing:
  - Social share link button(s)
  - Copy link button
  - Status text (`Copied`, `Share cancelled`, `Share unavailable`)
- Keep existing primary flow simple: one tap on `Share`.

**Step 4: Run targeted tests**
- Run: `npm run test -- tests/win-screen-share.integration.test.ts`
- Expected: PASS

**Step 5: Commit**
- `git add src/main.ts src/ui/WinScreen.ts tests/win-screen-share.integration.test.ts`
- `git commit -m "feat: wire win-screen share button to share service"`

## Task 4: Add Test Observability Hooks (Test-Only)

**Files:**
- Modify: `src/ui/WinScreen.ts`
- Test: `tests/win-screen-share.integration.test.ts`

**Step 1: Write failing assertion against observability data**
- Assert test can read current share UI mode/status without brittle CSS querying.

**Step 2: Implement test-only hook behind flag**
- Add gated getter or `data-*` attributes when `import.meta.env.MODE === 'test'`.
- Expose share state (`idle`, `fallback-open`, `copied`, `error`) for deterministic checks.

**Step 3: Re-run integration test**
- Run: `npm run test -- tests/win-screen-share.integration.test.ts`
- Expected: PASS

**Step 4: Commit**
- `git add src/ui/WinScreen.ts tests/win-screen-share.integration.test.ts`
- `git commit -m "test: add win-screen share observability hooks"`

## Task 5: Verification + Manual QA

**Files:**
- Modify if needed based on QA fixes: `src/main.ts`, `src/ui/WinScreen.ts`, `src/app/share/*`

**Step 1: Automated verification**
- Run: `npx tsc --noEmit`
- Run: `npm run build`
- Run: `npm run test`
- Expected: all pass

**Step 2: Manual QA checklist**
- Mobile Safari/Chrome: native share sheet opens from win modal.
- Desktop where native share unavailable: fallback social and copy actions work.
- Cancel native share sheet: no scary error.
- Copy success messaging appears and resets cleanly.
- Modal layout remains readable at narrow widths.

**Step 3: Final commit**
- `git add -A`
- `git commit -m "feat: complete social share flow for win screen"`

## Notes / Constraints

- Keep fallback links extensible via config array instead of hardcoding inside DOM event handlers.
- Do not block puzzle restart flow if sharing fails.
- Avoid `alert()` for share errors; use inline status text in modal.
- Use deterministic URL source for tests (inject `pageUrl` rather than reading `window.location` directly in pure functions).
