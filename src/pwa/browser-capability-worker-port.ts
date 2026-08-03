import type {
  BrowserCapabilityOutcome,
  BrowserCapabilityProbe,
} from './browser-capability';

export const BROWSER_CAPABILITY_PERFORMANCE_MEASURE =
  'srd55-browser-capability-probe';

function isBrowserCapabilityOutcome(
  value: unknown,
): value is BrowserCapabilityOutcome {
  return value === 'available' || value === 'unavailable';
}

/**
 * Constructing and running this tiny worker is independent of sqlite startup,
 * so it can report even when sqlite wasm or the SAH pool cannot initialize.
 */
export function browserCapabilityProbeFromWorker(
  createWorker: () => Worker,
): BrowserCapabilityProbe {
  return () =>
    new Promise<BrowserCapabilityOutcome>((resolve) => {
      const startedAt = performance.now();
      let finished = false;
      let worker: Worker;
      try {
        worker = createWorker();
      } catch {
        resolve('probe-failed');
        return;
      }

      const finish = (outcome: BrowserCapabilityOutcome): void => {
        if (finished) {
          return;
        }
        finished = true;
        worker.terminate();
        performance.measure(BROWSER_CAPABILITY_PERFORMANCE_MEASURE, {
          start: startedAt,
          end: performance.now(),
        });
        resolve(outcome);
      };
      worker.addEventListener(
        'message',
        (event: MessageEvent<unknown>) =>
          finish(
            isBrowserCapabilityOutcome(event.data)
              ? event.data
              : 'probe-failed',
          ),
        { once: true },
      );
      worker.addEventListener('error', () => finish('probe-failed'), {
        once: true,
      });
    });
}

export const probeBrowserCapabilityInWorker = browserCapabilityProbeFromWorker(
  () =>
    new Worker(new URL('./browser-capability-worker.ts', import.meta.url), {
      type: 'module',
    }),
);
