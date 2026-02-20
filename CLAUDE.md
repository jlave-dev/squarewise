# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SquareWise is a KenKen-style puzzle game with daily challenges. It's a vanilla TypeScript + Vite SPA with canvas-based rendering.

## Commands

- `npm run dev` - Start development server (port 5173)
- `npm run build` - Production build to `dist/`
- `npm run preview` - Preview production build
- `npx tsc --noEmit` - Type-check TypeScript

## Architecture

### Entry Point
`src/main.ts` - App bootstrap, UI component initialization, game orchestration

### Core Modules
- **`src/app/Game.ts`** - Central game controller; coordinates renderer, input, state, timer, undo stack
- **`src/app/StateManager.ts`** - Game state (puzzle, grid, notes, selection)
- **`src/app/InputHandler.ts`** - Mouse/touch input handling for cell selection

### Rendering
- **`src/renderer/CanvasRenderer.ts`** - Main canvas rendering (grid, cells, cages, clues, selection). Uses devicePixelRatio for crisp rendering. Config: `cellSize`, `padding`, `fontSize`, `clueFontSize` in DEFAULT_CONFIG.
- **`src/renderer/UIRenderer.ts`** - DOM-based UI (toolbar, buttons)
- **`src/renderer/EffectsRenderer.ts`** - Visual effects overlay

### Puzzle Engine
- **`src/engine/generator/PuzzleGenerator.ts`** - Main entry for generating puzzles
- **`src/engine/generator/LatinSquare.ts`** - Latin square generation (valid solution grids)
- **`src/engine/generator/CageGenerator.ts`** - Creates cages from Latin squares
- **`src/engine/generator/ClueCalculator.ts`** - Calculates cage clues (target + operation)
- **`src/engine/validation/Validator.ts`** - Validates player moves against cage rules
- **`src/engine/difficulty/DifficultyEngine.ts`** - Difficulty calculation
- **`src/engine/difficulty/presets.ts`** - Difficulty presets (grid sizes, cage counts)

### Data Types
`src/types/puzzle.ts` defines:
- `Puzzle` - Complete puzzle (size, cages, solution)
- `Cage` - Region of cells with a clue constraint
- `Clue` - target number + operation (+, -, ×, ÷)
- `Difficulty` - 'beginner' | 'easy' | 'medium' | 'hard' | 'expert'

### Storage
- **`src/storage/SettingsStore.ts`** - User preferences (theme, sound)
- **`src/storage/StatsStore.ts`** - Game statistics
- **`src/storage/IndexedDB.ts`** - Game state persistence

### UI Components
- `src/ui/LevelSelect.ts` - Difficulty selection modal
- `src/ui/NumberPad.ts` - Touch number input
- `src/ui/SettingsPanel.ts` - Settings modal
- `src/ui/WinScreen.ts` - Victory screen

### Daily Challenges
`src/core/DailyChallenge.ts` - Generates seeded daily puzzles based on date

## Key Patterns

- Game state flows: InputHandler → Game → StateManager → CanvasRenderer
- Puzzle is generated once at game start; solution stored in puzzle object
- CanvasRenderer uses DPR-aware scaling for crisp text on retina displays
- Service worker caches assets for offline support

## Gotchas

- **Service worker caching**: Old builds may be cached. Hard refresh (Cmd+Shift+R) or unregister SW in DevTools Application tab
- **Canvas size**: CanvasRenderer controls its own size via `adjustCanvasSize()`; don't override via CSS or JS resize
- **InputHandler config**: Synced from CanvasRenderer config at game start; changes to renderer config need to be reflected in InputHandler
