export function prefersReducedMotion(win: Pick<Window, 'matchMedia'> | undefined = globalThis.window): boolean {
  if (!win?.matchMedia) return false;
  return win.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
