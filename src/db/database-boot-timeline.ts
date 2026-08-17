import type { DatabaseBootProgress, DatabaseBootStage } from './database-boot-progress';

/**
 * Every phase this module emits is named with this prefix, so a measurement
 * harness can select the boot split out of `performance.getEntriesByType(
 * 'measure')` without knowing the stage names.
 */
export const DATABASE_BOOT_MEASURE_PREFIX = 'srd55-db-boot:';

/**
 * The span before the first stage report: worker construction, worker script
 * fetch, and module evaluation. It is not a `DatabaseBootStage` because no code
 * inside the worker is running yet to report it.
 */
export const DATABASE_BOOT_STARTUP_PHASE = 'worker_startup';

/** The whole boot, from worker construction to a completed `system.info`. */
export const DATABASE_BOOT_TOTAL_PHASE = 'total';

export type DatabaseBootPhaseName =
  | typeof DATABASE_BOOT_STARTUP_PHASE
  | typeof DATABASE_BOOT_TOTAL_PHASE
  | DatabaseBootStage;

export interface DatabaseBootPhase {
  readonly name: DatabaseBootPhaseName;
  /** Main-thread `performance.now()` milliseconds. */
  readonly startMs: number;
  readonly endMs: number;
}

export function databaseBootMeasureName(phase: DatabaseBootPhase): string {
  return `${DATABASE_BOOT_MEASURE_PREFIX}${phase.name}`;
}

/**
 * Turns the worker's stage reports into closed, non-overlapping phases on the
 * MAIN thread's clock.
 *
 * A stage report says "stage X is starting", so the duration of a phase is the
 * distance to the NEXT report — which is why a phase can only be emitted once
 * its successor has arrived, and why the last one is closed by `finish`.
 *
 * The worker's `elapsedMs` is measured against the worker's time origin. Adding
 * it to the main-thread instant of `new Worker(...)` puts every phase on one
 * timeline. The two origins are not identical — the worker's begins a little
 * after construction — so this reads slightly EARLY for the worker's internal
 * boundaries, which charges that gap to `worker_startup` where it belongs
 * rather than hiding it inside a stage.
 */
export class DatabaseBootTimeline {
  readonly #startedAtMs: number;
  #openPhase: { name: DatabaseBootPhaseName; atMs: number };

  constructor(workerConstructedAtMs: number) {
    this.#startedAtMs = workerConstructedAtMs;
    this.#openPhase = {
      name: DATABASE_BOOT_STARTUP_PHASE,
      atMs: workerConstructedAtMs,
    };
  }

  /** Closes the open phase at this report and opens the reported stage. */
  observe(progress: DatabaseBootProgress): DatabaseBootPhase {
    const boundaryMs = this.#monotonic(this.#startedAtMs + progress.elapsedMs);
    const closed: DatabaseBootPhase = {
      name: this.#openPhase.name,
      startMs: this.#openPhase.atMs,
      endMs: boundaryMs,
    };
    this.#openPhase = { name: progress.stage, atMs: boundaryMs };
    return closed;
  }

  /**
   * Closes the last open phase and adds the total. Both are returned together
   * because a caller that recorded the stages but not the total would report a
   * split whose parts do not add up to anything.
   */
  finish(readyAtMs: number): readonly DatabaseBootPhase[] {
    const endMs = this.#monotonic(readyAtMs);
    return [
      { name: this.#openPhase.name, startMs: this.#openPhase.atMs, endMs },
      { name: DATABASE_BOOT_TOTAL_PHASE, startMs: this.#startedAtMs, endMs },
    ];
  }

  /**
   * Two clocks meet here, so an ordering violation is possible in principle.
   * Clamping keeps every emitted phase non-negative; a negative duration would
   * be rejected outright by `performance.measure` and lose the whole split.
   */
  #monotonic(candidateMs: number): number {
    return candidateMs < this.#openPhase.atMs
      ? this.#openPhase.atMs
      : candidateMs;
  }
}
