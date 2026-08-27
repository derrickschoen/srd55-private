export interface RehearsalTimingRow {
  readonly phase: string;
  readonly step: string;
  readonly calls: number;
  readonly totalMs: number;
  readonly maximumMs: number;
}

interface ActiveTiming {
  readonly phase: string;
  readonly step: string;
  readonly startedAt: number;
}

interface MutableTiming {
  calls: number;
  totalMs: number;
  maximumMs: number;
}

export class RehearsalTimings {
  readonly #rows = new Map<string, MutableTiming>();
  #active: ActiveTiming | null = null;

  constructor(private readonly now: () => number = () => performance.now()) {}

  track(phase: string, step: string): void {
    this.#finishActive(this.now());
    this.#active = { phase, step, startedAt: this.now() };
  }

  record(
    phase: string,
    step: string,
    durationMs: number,
    calls = 1,
    maximumMs = durationMs / calls,
  ): void {
    if (!Number.isFinite(durationMs) || durationMs < 0 || !Number.isSafeInteger(calls) || calls < 1 ||
      !Number.isFinite(maximumMs) || maximumMs < 0) {
      throw new RangeError('Rehearsal timing samples require non-negative duration and positive calls.');
    }
    const key = JSON.stringify([phase, step]);
    const row = this.#rows.get(key) ?? { calls: 0, totalMs: 0, maximumMs: 0 };
    row.calls += calls;
    row.totalMs += durationMs;
    row.maximumMs = Math.max(row.maximumMs, maximumMs);
    this.#rows.set(key, row);
  }

  finish(): void {
    this.#finishActive(this.now());
    this.#active = null;
  }

  rows(): readonly RehearsalTimingRow[] {
    const rows = new Map<string, MutableTiming>();
    for (const [key, value] of this.#rows) rows.set(key, { ...value });
    if (this.#active !== null) {
      const duration = Math.max(0, this.now() - this.#active.startedAt);
      const key = JSON.stringify([this.#active.phase, this.#active.step]);
      const row = rows.get(key) ?? { calls: 0, totalMs: 0, maximumMs: 0 };
      row.calls += 1;
      row.totalMs += duration;
      row.maximumMs = Math.max(row.maximumMs, duration);
      rows.set(key, row);
    }
    return [...rows].map(([key, value]) => {
      const labels: unknown = JSON.parse(key);
      if (!Array.isArray(labels) || typeof labels[0] !== 'string' || typeof labels[1] !== 'string') {
        throw new TypeError('Rehearsal timing key is malformed.');
      }
      return {
        phase: labels[0],
        step: labels[1],
        calls: value.calls,
        totalMs: value.totalMs,
        maximumMs: value.maximumMs,
      };
    }).sort((left, right) =>
      left.phase.localeCompare(right.phase) || right.totalMs - left.totalMs || left.step.localeCompare(right.step));
  }

  #finishActive(finishedAt: number): void {
    if (this.#active === null) return;
    this.record(
      this.#active.phase,
      this.#active.step,
      Math.max(0, finishedAt - this.#active.startedAt),
    );
  }
}

function displayMs(value: number): string {
  return value < 1_000 ? value.toFixed(1) + 'ms' : (value / 1_000).toFixed(2) + 's';
}

function escapeTable(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

export function rehearsalTimingBlock(rows: readonly RehearsalTimingRow[]): string {
  const phases = new Map<string, number>();
  for (const row of rows) phases.set(row.phase, (phases.get(row.phase) ?? 0) + row.totalMs);
  return [
    '## Timing breakdown',
    '',
    'Driver phases partition end-to-end wall time; browser-runtime rows are nested operation costs inside those phases.',
    '',
    '| Phase | Wall time |',
    '|---|---:|',
    ...[...phases].sort((left, right) => right[1] - left[1])
      .map(([phase, totalMs]) => `| ${escapeTable(phase)} | ${displayMs(totalMs)} |`),
    '',
    '| Phase | Step | Calls | Total | Mean | Max |',
    '|---|---|---:|---:|---:|---:|',
    ...rows.map((row) =>
      `| ${escapeTable(row.phase)} | ${escapeTable(row.step)} | ${String(row.calls)} | ${displayMs(row.totalMs)} | ${displayMs(row.totalMs / row.calls)} | ${displayMs(row.maximumMs)} |`),
  ].join('\n');
}
