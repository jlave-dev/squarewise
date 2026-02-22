export interface InputCapabilities {
  anyPointerCoarse: boolean;
  hoverNone: boolean;
}

export type MatchMediaFn = (query: string) => Pick<MediaQueryList, 'matches'>;

export function getInputCapabilities(matchMediaFn: MatchMediaFn = window.matchMedia.bind(window)): InputCapabilities {
  return {
    anyPointerCoarse: matchMediaFn('(any-pointer: coarse)').matches,
    hoverNone: matchMediaFn('(hover: none)').matches,
  };
}

export function shouldShowOnScreenKeypadByDefault(capabilities: InputCapabilities): boolean {
  return capabilities.anyPointerCoarse && capabilities.hoverNone;
}
