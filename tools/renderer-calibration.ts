import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { canonicalJson } from '../src/commands/canonical-json';
import { encounterSessionId } from '../src/combat/values';
import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { TURN_CONTEXT_MAX_BYTES, type TurnContextDeltaBase } from '../src/vtt/mcp/engine-server';
import { exactDmIntelMatrix, isInformativeDmIntelRow } from '../src/vtt/dm-tactical-intel';
import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';
import {
  DEFAULT_RENDERER_PROFILE,
  PLANNED_COMBINED_RENDERER_PROFILES,
  RENDERER_POLICY_VERSION,
  rendererProfileSchema,
  type CircumstanceFeatureVector,
  type RendererProfile,
  type RendererRemovalCounts,
} from '../src/vtt/renderer-profile';

const BRUTAL_SEEDS = [6203001, 6203002, 6203003, 6203004, 6203005, 6203006, 6203007, 6203008, 6203009, 6203010] as const;
const UNBOUNDED_BYTES = 10 * 1024 * 1024;

interface NamedProfile {
  readonly name: string;
  readonly profile: RendererProfile;
  readonly deltaRequest: boolean;
}

function profile(name: string, patch: Partial<RendererProfile>, deltaRequest = false): NamedProfile {
  return {
    name,
    profile: rendererProfileSchema.parse({ ...DEFAULT_RENDERER_PROFILE, ...patch }),
    deltaRequest,
  };
}

export const CALIBRATION_PROFILES: readonly NamedProfile[] = Object.freeze([
  profile('baseline-full', {}),
  profile('S-delta:path-granular', { delta: 'path_granular' }, true),
  profile('S-delta:guarded', { delta: 'guarded' }, true),
  profile('S-delta:off', { delta: 'off' }, true),
  profile('S-anchor:hash-only', { anchor: 'hash_only' }, true),
  profile('S-rows:best-exception', { rows: 'best_exception' }),
  profile('S-rows:top-target-only', { rows: 'top_target' }),
  profile('S-rows:off', { rows: 'off' }),
  profile('S-slots:sparse', { slots: 'sparse' }),
  profile('S-opp:conditional', { opportunityCost: 'conditional' }),
  profile('S-opp:status-ids', { opportunityCost: 'status_ids' }),
  profile('S-threats:counts-exception-ids', { threats: 'counts_exception_ids' }),
  profile('S-ids:short-refs', { ids: 'short_refs' }),
  profile('S-status:sparse', { status: 'sparse' }),
  profile('S-move:material-only', { movement: 'material_only' }),
  profile('S-label:derivable', { labels: 'derivable' }),
  profile('S-frontier:candidates-summary', { frontier: 'candidates_summary' }),
  profile('S-frontier:off', { frontier: 'off' }),
  profile('S-knowledge:relevance-gated', { knowledge: 'relevance_gated' }),
  profile('S-failures:headline-codes', { failures: 'headline_codes' }),
  profile('S-adverts:stubs', { adverts: 'stubs' }),
  profile('S-rare:triggered', { rare: 'triggered' }),
  profile('S-misc:merged', { misc: 'merged' }),
  profile('shortlist:K3', { shortlist: 'k3' }),
  profile('shortlist:K2', { shortlist: 'k2' }),
  profile('top-K-stubs:top2', { optionDetail: 'top2_stubs' }),
  { name: 'combined:conservative', profile: PLANNED_COMBINED_RENDERER_PROFILES.conservative, deltaRequest: true },
  { name: 'combined:compact', profile: PLANNED_COMBINED_RENDERER_PROFILES.compact, deltaRequest: true },
  { name: 'combined:minimum-safe', profile: PLANNED_COMBINED_RENDERER_PROFILES.minimum_safe, deltaRequest: true },
]);

type RenderEvidence = {
  readonly preTrimBytes: number;
  readonly postTrimBytes: number;
  readonly features: CircumstanceFeatureVector;
  readonly removals: RendererRemovalCounts;
};

function object(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function values(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

interface CategoryCounts {
  readonly actors: number;
  readonly options: number;
  readonly rows: number;
  readonly movement: number;
  readonly threats: number;
  readonly adverts: number;
  readonly rare: number;
}

function categoryCounts(context: Readonly<Record<string, unknown>>): CategoryCounts {
  const actors = values(context['actors']).flatMap((value) => {
    const actor = object(value);
    return actor === null ? [] : [actor];
  });
  return {
    actors: actors.length,
    options: actors.reduce((sum, actor) => sum + values(actor['options']).length, 0),
    rows: actors.reduce((sum, actor) => sum + values(object(actor['intel'])?.['rows']).length, 0),
    movement: actors.reduce((sum, actor) => sum + values(object(actor['intel'])?.['movement']).length, 0),
    threats: actors.reduce((sum, actor) => sum + values(actor['threats']).length, 0),
    adverts: values(context['applicable_plays']).length + values(context['applicable_skills']).length,
    rare: ['legendary_windows', 'alert_state', 'search_memory', 'recovery_capabilities', 'reaction_spend_hold']
      .filter((key) => context[key] !== undefined).length,
  };
}

function removedCounts(before: CategoryCounts, after: CategoryCounts): CategoryCounts {
  return {
    actors: Math.max(0, before.actors - after.actors),
    options: Math.max(0, before.options - after.options),
    rows: Math.max(0, before.rows - after.rows),
    movement: Math.max(0, before.movement - after.movement),
    threats: Math.max(0, before.threats - after.threats),
    adverts: Math.max(0, before.adverts - after.adverts),
    rare: Math.max(0, before.rare - after.rare),
  };
}

async function render(
  seed: number,
  selected: NamedProfile,
  maximumBytes: number,
): Promise<{ readonly context: Readonly<Record<string, unknown>>; readonly evidence: RenderEvidence }> {
  const state = freshMonsterPlanningState(await loadArenaFixture(
    `tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json`,
  ));
  const runId = encounterSessionId(`encounter:renderer-calibration:${String(seed)}`);
  let base: TurnContextDeltaBase | undefined;
  if (selected.deltaRequest && selected.profile.delta !== 'off') {
    const baseRuntime = createEngineMcpRuntime(state, {
      runId, revision: 1, rendererProfile: selected.profile, turnContextMaximumBytes: maximumBytes,
    });
    const baseCapsule = baseRuntime.feed.current();
    const baseContext = baseRuntime.toolSurface.execute('engine.get_turn_context', {
      run_id: baseCapsule.runId, expected_revision: baseCapsule.revision,
      scope: 'round', granularity: 'full', intel_mode: 'full',
    });
    const baseRecord = object(baseContext);
    if (baseRecord === null) throw new Error('Calibration base context is not an object.');
    base = { revision: 1, context: baseRecord };
  }
  let evidence: RenderEvidence | undefined;
  const runtime = createEngineMcpRuntime(state, {
    runId,
    revision: base === undefined ? 1 : 2,
    rendererProfile: selected.profile,
    turnContextMaximumBytes: maximumBytes,
    ...(base === undefined ? {} : { turnContextDeltaBase: base }),
    onTurnContextRendered: (value) => { evidence = value; },
  });
  const capsule = runtime.feed.current();
  const result = runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    intel_mode: 'full',
    ...(base === undefined || selected.profile.delta === 'off'
      ? { granularity: 'full' }
      : { granularity: 'turn_delta', since_revision: base.revision }),
  });
  const context = object(result);
  if (context === null || evidence === undefined) throw new Error('Calibration renderer emitted no evidence.');
  return { context, evidence };
}

interface CalibrationRow {
  readonly fixture: string;
  readonly seed: number;
  readonly profile: string;
  readonly granularity: unknown;
  readonly pre_trim_bytes: number;
  readonly post_trim_bytes: number;
  readonly savings_bytes: number;
  readonly savings_percent: number;
  readonly baseline_post_savings_bytes: number;
  readonly baseline_post_savings_percent: number;
  readonly profile_removals: RendererRemovalCounts;
  readonly cap_removals: CategoryCounts;
  readonly features: CircumstanceFeatureVector;
}

export async function buildRendererCalibration(): Promise<readonly CalibrationRow[]> {
  const rows: CalibrationRow[] = [];
  for (const seed of BRUTAL_SEEDS) {
    for (const selected of CALIBRATION_PROFILES) {
      const before = await render(seed, selected, UNBOUNDED_BYTES);
      const after = await render(seed, selected, TURN_CONTEXT_MAX_BYTES);
      const preBytes = after.evidence.preTrimBytes;
      const postBytes = after.evidence.postTrimBytes;
      rows.push({
        fixture: `tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json`,
        seed,
        profile: selected.name,
        granularity: after.context['granularity'],
        pre_trim_bytes: preBytes,
        post_trim_bytes: postBytes,
        savings_bytes: Math.max(0, preBytes - postBytes),
        savings_percent: preBytes === 0 ? 0 : (preBytes - postBytes) / preBytes * 100,
        baseline_post_savings_bytes: 0,
        baseline_post_savings_percent: 0,
        profile_removals: before.evidence.removals,
        cap_removals: removedCounts(categoryCounts(before.context), categoryCounts(after.context)),
        features: after.evidence.features,
      });
    }
  }
  return rows.map((row) => {
    const baseline = rows.find((candidate) =>
      candidate.seed === row.seed && candidate.profile === 'baseline-full');
    if (baseline === undefined) throw new Error(`Calibration seed ${String(row.seed)} has no baseline row.`);
    return {
      ...row,
      baseline_post_savings_bytes: baseline.post_trim_bytes - row.post_trim_bytes,
      baseline_post_savings_percent: baseline.post_trim_bytes === 0
        ? 0
        : (baseline.post_trim_bytes - row.post_trim_bytes) / baseline.post_trim_bytes * 100,
    };
  });
}

async function nullRowAudit() {
  return Promise.all(BRUTAL_SEEDS.map(async (seed) => {
    const state = freshMonsterPlanningState(await loadArenaFixture(
      `tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json`,
    ));
    const capsule = createEngineMcpRuntime(state).feed.current();
    const rows = exactDmIntelMatrix(state, capsule, canonicalEngineQueryPort);
    const omitted = rows.filter((row) => !isInformativeDmIntelRow(row));
    return {
      seed,
      rows: rows.length,
      mechanically_populated_rows: rows.length - omitted.length,
      wholly_non_informative_rows_omitted: omitted.length,
      omitted_reason_codes: [...new Set(omitted.flatMap((row) => row.unresolvedReasons))].sort(),
    };
  }));
}

function markdown(rows: readonly CalibrationRow[]): string {
  const names = CALIBRATION_PROFILES.map((entry) => entry.name);
  const lines = [
    '# Renderer calibration — 10 brutal fixtures',
    '',
    `Renderer policy: \`${RENDERER_POLICY_VERSION}\`. Byte counts are UTF-8 JSON bytes; no model was called.`,
    '',
    '| Profile | Avg pre-trim | Avg post-trim | Avg cap removed | Cap % | vs baseline | Full rows | Delta rows |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
  ];
  for (const name of names) {
    const selected = rows.filter((row) => row.profile === name);
    const average = (field: 'pre_trim_bytes' | 'post_trim_bytes' | 'savings_bytes'): number =>
      selected.reduce((sum, row) => sum + row[field], 0) / selected.length;
    const before = average('pre_trim_bytes');
    const after = average('post_trim_bytes');
    const percent = before === 0 ? 0 : (before - after) / before * 100;
    const baselinePercent = selected.reduce((sum, row) => sum + row.baseline_post_savings_percent, 0) / selected.length;
    lines.push(`| ${name} | ${before.toFixed(1)} | ${after.toFixed(1)} | ${(before - after).toFixed(1)} | ${percent.toFixed(1)}% | ${baselinePercent.toFixed(1)}% | ${String(selected.filter((row) => row.granularity === 'full').length)} | ${String(selected.filter((row) => row.granularity === 'turn_delta').length)} |`);
  }
  lines.push('', 'The JSON artifact contains fixture-level feature vectors and profile/cap removal counts for slicing.');
  return `${lines.join('\n')}\n`;
}

export async function writeRendererCalibration(cwd = process.cwd()): Promise<void> {
  const rows = await buildRendererCalibration();
  const null_row_audit = await nullRowAudit();
  await writeFile(resolve(cwd, '.tmp-calibration-table.json'), `${canonicalJson({
    renderer_policy_version: RENDERER_POLICY_VERSION,
    fixture_count: BRUTAL_SEEDS.length,
    profile_count: CALIBRATION_PROFILES.length,
    null_row_audit,
    rows,
  })}\n`, 'utf8');
  await writeFile(resolve(cwd, '.tmp-calibration-table.md'), markdown(rows), 'utf8');
}

if (process.env['VITEST'] !== 'true') {
  await writeRendererCalibration();
}
