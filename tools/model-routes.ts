/**
 * LUNA6 route literals and the per-call bounds every runner derives from a run's routes.
 *
 * Owner rulings: D890 (a) removes the fixed 180 s round wall for Luna runs and keeps only a 30 min per-call hang
 * guard, logged whenever it fires; the owner's answer of 2026-09-24 18:58 ("gpt-6-luna only") limits that lift to
 * calls whose route is gpt-6-luna. Every other route keeps today's exact values. D887 (c): no default chooses Luna.
 *
 * This module imports nothing from the runners (`./ai-dm-*`), so a launcher can load it without loading a runner.
 */

export const LUNA_MODEL = 'gpt-6-luna' as const;
/** The Luna route before LUNA6. Its runs keep the 180 s round wall until the effort study switches the route (PR6). */
export const HISTORICAL_LUNA_MODEL = 'gpt-5.6-luna' as const;
/** D890 (a): the only bound a gpt-6-luna call keeps, 30 minutes per call. */
export const LUNA_HANG_GUARD_MS = 1_800_000 as const;
/** Today's shared per-round wall for every run with no gpt-6-luna route. */
export const LEGACY_ROUND_WALL_MS = 180_000 as const;

/** The effort union of the runners, restated here so this module needs no runner import (T1 checks equality). */
export const LUNA_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type LunaEffort = (typeof LUNA_EFFORTS)[number];

export interface LunaRoute {
  readonly model: typeof LUNA_MODEL;
  readonly effort: LunaEffort;
}

/** D887 (b): a run whose effort is the variable under study keeps its stated effort, on gpt-6-luna. */
export function lunaStudyRoute(effort: LunaEffort): LunaRoute {
  return { model: LUNA_MODEL, effort };
}

export interface SessionRoute {
  readonly model: string;
  readonly effort: string;
}

/** `legacy` is a run with no explicit `--dm-mode`; `dm_mode` is a D569 advice or blind run. */
export type SessionPath = 'legacy' | 'dm_mode';

export interface SessionBoundsInput {
  /** Every route the run can dispatch: base and escalation, or every arm's base and escalation. */
  readonly routes: readonly SessionRoute[];
  readonly path: SessionPath;
  readonly explicitTimeoutMs: number | null;
  readonly explicitRoundWall: typeof LEGACY_ROUND_WALL_MS | null;
}

/** Where the per-call timeout came from. Never stored on a config (T6 compares whole configs). */
export type SessionBound = 'legacy_default' | 'cli_override' | 'luna_hang_guard';

export interface SessionBounds {
  readonly timeoutMs: number;
  /** null is the lift: no shared round wall, only the per-call hang guard. */
  readonly roundWallMs: typeof LEGACY_ROUND_WALL_MS | null;
  readonly bound: SessionBound;
}

const MIXED_ROUTE_REFUSAL =
  'LUNA6: a run mixing gpt-6-luna and other routes cannot give each route its own bound ' +
  '(owner 2026-09-24: only gpt-6-luna calls lose the 180 s wall); split it';

/** The refusal of a flag that would censor a gpt-6-luna run (plan §2.2); generate-data reuses it. */
export function liftRefusal(efforts: readonly string[], flag: string): TypeError {
  return new TypeError(
    `LUNA6: gpt-6-luna ${[...new Set(efforts)].join('/')} runs uncensored (owner 2026-09-24); ` +
    `${flag} is refused (hang guard ${String(LUNA_HANG_GUARD_MS)})`,
  );
}

/**
 * Resolves a run's per-call timeout and round wall from every route it can dispatch.
 * No gpt-6-luna route: today's values, byte for byte. Every route gpt-6-luna: the hang guard and no round wall.
 * A mix is refused, because one round (and one arena invocation) carries one bound (plan §2.2).
 */
export function resolveSessionBounds(input: SessionBoundsInput): SessionBounds {
  const lunaRoutes = input.routes.filter((route) => route.model === LUNA_MODEL);
  if (lunaRoutes.length === 0) {
    return {
      timeoutMs: input.explicitTimeoutMs ?? (input.path === 'dm_mode' ? 240_000 : 120_000),
      roundWallMs: LEGACY_ROUND_WALL_MS,
      bound: input.explicitTimeoutMs === null ? 'legacy_default' : 'cli_override',
    };
  }
  if (lunaRoutes.length !== input.routes.length) throw new TypeError(MIXED_ROUTE_REFUSAL);
  const efforts = lunaRoutes.map((route) => route.effort);
  if (input.explicitTimeoutMs !== null && input.explicitTimeoutMs !== LUNA_HANG_GUARD_MS) {
    throw liftRefusal(efforts, `--timeout-ms ${String(input.explicitTimeoutMs)}`);
  }
  if (input.explicitRoundWall !== null) {
    throw liftRefusal(efforts, `--round-wall-ms ${String(input.explicitRoundWall)}`);
  }
  return { timeoutMs: LUNA_HANG_GUARD_MS, roundWallMs: null, bound: 'luna_hang_guard' };
}

export interface ScreenshotTimeoutInput {
  readonly model: string;
  readonly effort: string;
  readonly explicitTimeoutMs: number | null;
}

/**
 * The screenshot probe has no rounds, so each `--models` entry gets its own per-call timeout:
 * gpt-6-luna gets the hang guard (an explicit value must equal it); any other model keeps today's behaviour,
 * untimed unless `--timeout-ms` is given.
 */
export function resolveScreenshotTimeout(input: ScreenshotTimeoutInput): number | null {
  if (input.model !== LUNA_MODEL) return input.explicitTimeoutMs;
  if (input.explicitTimeoutMs !== null && input.explicitTimeoutMs !== LUNA_HANG_GUARD_MS) {
    throw liftRefusal([input.effort], `--timeout-ms ${String(input.explicitTimeoutMs)}`);
  }
  return LUNA_HANG_GUARD_MS;
}
