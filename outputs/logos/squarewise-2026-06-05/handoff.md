# SquareWise Logo Handoff

We landed on a hybrid direction for SquareWise:

- Display wordmark: a clean `SquareWise` wordmark with cage-clue framing
- Compact UI wordmark: a plain `SquareWise` wordmark for top bars and in-app chrome
- Small-size mark: the rounded four-cell icon with arithmetic hints

This is the best fit because it keeps the game mechanic visible without becoming noisy. The display mark carries the brand character, while the compact UI mark stays quiet enough for the actual app chrome.

The app icon has been tightened into a deterministic vector draft with two explicit rules:

- the interior is a true 2x2 square grid, with no notched or protruding cell shapes
- every clue sits at the same top-left inset inside its cell

Those two constraints matter a lot for the "precise puzzle" feel of the brand.

The wordmark now has matching production logic:

- the display mark keeps the clue-corner framing for larger brand moments
- the compact UI mark drops those ornaments at smaller sizes
- clue-corner ornaments need a visible buffer from the letterforms and should never overlap the word
- both marks use the same heavy geometric type base and dark-mode color discipline

## What to keep

- Calm, premium dark-mode feel
- Square and cage geometry from the board
- Subtle clue-corner framing
- Muted accent colors drawn from the puzzle cells

## What to avoid

- Arcade energy, neon, or playful-party puzzle branding
- Abstract geometric marks that lose the game connection
- Overcomplicated clue details that break at small sizes
- Using the icon alone where the full name should carry the brand

## Recommended production pass

1. Convert the approved SVG wordmarks and icon into final outlined production assets
2. Test the compact UI wordmark in the real header at app-scale sizes
3. Export favicon, PWA icon, header, and share-card variants
4. Decide whether the final wordmark remains a refined type base or becomes a custom-drawn logotype

## Artifact set

- [Exploration board](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/01-exploration-board.png)
- [Selected system board](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/02-selected-system-board.png)
- [Dark usage preview](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/03-dark-usage-preview.png)
- [Aligned app icon SVG](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/app-icon-aligned.svg)
- [Aligned app icon PNG](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/app-icon-aligned.png)
- [Aligned app icon dark preview](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/app-icon-aligned-dark-preview.png)
- [Display wordmark SVG](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/wordmark-display.svg)
- [Display wordmark PNG](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/wordmark-display.png)
- [Compact UI wordmark SVG](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/wordmark-ui.svg)
- [Compact UI wordmark PNG](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/wordmark-ui.png)
- [Wordmark review board](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/wordmark-review.png)
- [Top bar preview](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/wordmark-topbar-preview.png)
- [Logo brief](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/logo-brief.json)
- [Selected route data](/Users/james/dev/squarewise/outputs/logos/squarewise-2026-06-05/selected-route.json)

Typography is now controlled much more tightly, but these remain font-based SVG drafts rather than final outlined vector masters.
