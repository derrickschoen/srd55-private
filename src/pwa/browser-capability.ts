export type BrowserCapabilityOutcome =
  | 'available'
  | 'unavailable'
  | 'probe-failed';

export type BrowserCapabilityProbe = () => Promise<BrowserCapabilityOutcome>;

/**
 * Measured 2026-08-02 on this worktree: 159.4 ms under `npm run dev` and
 * 11.7 ms from the `npm run build` output served by Vite preview. Eight times
 * the slower real measurement, rounded up, is 1,276 ms.
 */
export const BROWSER_CAPABILITY_DEADLINE_MS = 1_276;

export type BrowserSupportDecision =
  | { readonly kind: 'supported' }
  | {
      readonly kind: 'capability-warning';
      readonly outcome: 'unavailable' | 'probe-failed';
    }
  | { readonly kind: 'untested-engine' };

export interface BrowserCapabilityObservation {
  /** The result used to make the bounded boot decision. */
  readonly initial: Promise<BrowserCapabilityOutcome>;
  /** The real result, which can arrive after the bounded decision. */
  readonly settled: Promise<BrowserCapabilityOutcome>;
}

/**
 * Apply a bounded deadline without abandoning the real probe. Keeping the
 * settled result live is what lets a late success remove a timeout warning.
 */
export function observeBrowserCapability(
  probe: BrowserCapabilityProbe,
  deadlineMs: number,
): BrowserCapabilityObservation {
  let resolveDeadline: (outcome: BrowserCapabilityOutcome) => void = () => {};
  const deadline = new Promise<BrowserCapabilityOutcome>((resolve) => {
    resolveDeadline = resolve;
  });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = Promise.resolve()
    .then(() => {
      timer = setTimeout(() => resolveDeadline('probe-failed'), deadlineMs);
      return probe();
    })
    .catch((): BrowserCapabilityOutcome => 'probe-failed');
  void settled.then(() => {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  });
  return {
    initial: Promise.race([settled, deadline]),
    settled,
  };
}

/** Capability is always classified before the engine signal is considered. */
export function classifyBrowserSupport(
  outcome: BrowserCapabilityOutcome,
  engineKnownTested: boolean,
): BrowserSupportDecision {
  switch (outcome) {
    case 'available':
      return engineKnownTested
        ? { kind: 'supported' }
        : { kind: 'untested-engine' };
    case 'unavailable':
      return { kind: 'capability-warning', outcome };
    case 'probe-failed':
      return { kind: 'capability-warning', outcome };
  }
}
