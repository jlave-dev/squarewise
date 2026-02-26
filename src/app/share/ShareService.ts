import type { SharePayload } from './SharePayload';

interface NavigatorLike {
  share?: (data: SharePayload) => Promise<void>;
}

interface ShareServiceDependencies {
  navigatorLike?: NavigatorLike;
}

export interface ShareLink {
  id: string;
  label: string;
  url: string;
}

export type ShareResult =
  | { kind: 'shared' }
  | { kind: 'cancelled' }
  | { kind: 'fallback'; links: ShareLink[]; copyText: string }
  | { kind: 'failed'; error: Error };

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export class ShareService {
  private readonly navigatorLike: NavigatorLike;

  constructor(deps: ShareServiceDependencies = {}) {
    this.navigatorLike = deps.navigatorLike ?? navigator;
  }

  async share(payload: SharePayload): Promise<ShareResult> {
    if (this.navigatorLike.share) {
      try {
        await this.navigatorLike.share(payload);
        return { kind: 'shared' };
      } catch (error) {
        if (isAbortError(error)) {
          return { kind: 'cancelled' };
        }
      }
    }

    const fallback = this.getFallback(payload);
    return {
      kind: 'fallback',
      links: fallback.links,
      copyText: fallback.copyText,
    };
  }

  getFallback(payload: SharePayload): { links: ShareLink[]; copyText: string } {
    const text = encodeURIComponent(payload.text);
    const url = encodeURIComponent(payload.url);

    return {
      links: [
        {
          id: 'x',
          label: 'Share on X',
          url: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
        },
      ],
      copyText: `${payload.text} ${payload.url}`,
    };
  }
}
