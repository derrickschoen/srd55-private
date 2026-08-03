import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifyBrowserSupport,
  observeBrowserCapability,
} from '../../../src/pwa/browser-capability';

afterEach(() => {
  vi.useRealTimers();
});

describe('browser capability decision', () => {
  it('BROWSER-PROBE-CHROMIUM-SILENT: leaves tested Chromium unchanged after a passing probe', () => {
    expect(classifyBrowserSupport('available', true)).toEqual({
      kind: 'supported',
    });
  });

  it('BROWSER-PROBE-FAILS-SHOWS-NOTICE: warns for both real capability failure shapes', () => {
    expect(classifyBrowserSupport('unavailable', true)).toEqual({
      kind: 'capability-warning',
      outcome: 'unavailable',
    });
    expect(classifyBrowserSupport('probe-failed', true)).toEqual({
      kind: 'capability-warning',
      outcome: 'probe-failed',
    });
  });

  it('BROWSER-PROBE-UA-NEVER-SUPPRESSES: a tested-engine signal cannot hide a failed probe', () => {
    expect(classifyBrowserSupport('unavailable', true).kind).toBe(
      'capability-warning',
    );
    expect(classifyBrowserSupport('probe-failed', true).kind).toBe(
      'capability-warning',
    );
  });

  it('BROWSER-PROBE-UNTESTED-ENGINE-NOTICE: adds a notice after a passing probe on an untested engine', () => {
    expect(classifyBrowserSupport('available', false)).toEqual({
      kind: 'untested-engine',
    });
  });

  it('BROWSER-PROBE-HANG-NOT-DEAD-SCREEN: bounds a probe that never answers', async () => {
    vi.useFakeTimers();
    const observation = observeBrowserCapability(
      () =>
        new Promise(() => {
          // The probe is deliberately left pending.
        }),
      73,
    );
    await vi.advanceTimersByTimeAsync(73);
    await expect(observation.initial).resolves.toBe('probe-failed');
  });

  it('BROWSER-PROBE-LATE-OK-WITHDRAWS: retains a real success after the deadline result', async () => {
    vi.useFakeTimers();
    let complete: (outcome: 'available') => void = () => {};
    const observation = observeBrowserCapability(
      () =>
        new Promise<'available'>((resolve) => {
          complete = resolve;
        }),
      91,
    );
    await vi.advanceTimersByTimeAsync(91);
    await expect(observation.initial).resolves.toBe('probe-failed');
    complete('available');
    await expect(observation.settled).resolves.toBe('available');
  });

  it('maps a thrown probe to probe-failed instead of rejecting the boot decision', async () => {
    const observation = observeBrowserCapability(async () => {
      throw new Error('worker construction failed');
    }, 100);
    await expect(observation.initial).resolves.toBe('probe-failed');
    await expect(observation.settled).resolves.toBe('probe-failed');
  });

  it('BROWSER-PROBE-EXHAUSTIVE-CLASSIFIER: keeps the outcome switch exhaustive with no default arm', () => {
    const source = readFileSync(
      fileURLToPath(
        new URL('../../../src/pwa/browser-capability.ts', import.meta.url),
      ),
      'utf8',
    );
    const classifier = source.slice(source.indexOf('export function classifyBrowserSupport'));
    expect(classifier).toContain("case 'available':");
    expect(classifier).toContain("case 'unavailable':");
    expect(classifier).toContain("case 'probe-failed':");
    expect(classifier).not.toMatch(/\bdefault\s*:/u);
  });
});
