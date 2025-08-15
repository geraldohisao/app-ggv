export type LogCtx = { requestId: string; userId?: string; personaId?: string };

let scopedCtx: LogCtx | null = null;

export function setCurrentLogCtx(ctx: LogCtx | null) { scopedCtx = ctx; }
export function getCurrentLogCtx(): LogCtx | null { return scopedCtx; }

function isDev(): boolean {
  try {
    // Vite
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV) return true;
  } catch {}
  // tests/fallback
  return (globalThis as any).__DEV__ === true;
}

export function newRequestId(): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${rnd}`;
}

export function startStep(ctx: LogCtx, step: string, extra?: any): () => void {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  return () => {
    const t1 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const ms = Math.max(0, t1 - t0);
    if (isDev()) {
      // lazy import to avoid cycles
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mb = require('./metricsBuffer');
        if (mb && typeof mb.addSample === 'function') mb.addSample({ step, ms });
      } catch {}
      // eslint-disable-next-line no-console
      console.debug('[AI]', { step, ms: Math.round(ms), ...ctx, ...(extra || {}) });
    }
  };
}

export function estimateTokensFromChars(chars: number): number {
  const c = Math.max(0, Math.floor(chars || 0));
  return Math.round(c / 4);
}


