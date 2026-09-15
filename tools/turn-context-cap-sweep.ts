import { encounterBranchId, encounterSessionId } from '../src/combat/values';
import { mulberry32 } from '../src/combat/random';
import { canonicalJson } from '../src/commands/canonical-json';
import { EngineRoundSession } from '../src/vtt/engine-round-session';
import { createEngineMcpRuntime, loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
import { applyRoomInitiativeProfile } from '../src/vtt/room-generator';

const CAPS_KIB = [16, 24, 32, 48, 64] as const;
const SEEDS = Array.from({ length: 10 }, (_unused, index) => 5_117_001 + index);
const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

interface SweepRenderEvidence {
  readonly preTrimBytes: number;
  readonly postTrimBytes: number;
}

interface RenderedSweepContext {
  readonly context: Readonly<Record<string, unknown>>;
  readonly evidence: SweepRenderEvidence;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function array(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function nested(value: Readonly<Record<string, unknown>>, ...path: readonly string[]): unknown {
  let current: unknown = value;
  for (const key of path) current = record(current)?.[key];
  return current;
}

function changed(
  baseline: Readonly<Record<string, unknown>>,
  context: Readonly<Record<string, unknown>>,
  ...path: readonly string[]
): boolean {
  const encoded = (value: unknown) => value === undefined ? '<undefined>' : canonicalJson(value);
  return encoded(nested(baseline, ...path)) !== encoded(nested(context, ...path));
}

function actorClassChanged(
  baseline: Readonly<Record<string, unknown>>,
  context: Readonly<Record<string, unknown>>,
  path: readonly string[],
): boolean {
  const actorValues = (source: Readonly<Record<string, unknown>>) => array(source['actors'])
    .flatMap((value) => record(value) === null ? [] : [record(value)!])
    .map((actor) => [String(actor['actor_id']), nested(actor, ...path)] as const);
  return canonicalJson(actorValues(baseline)) !== canonicalJson(actorValues(context));
}

function removalClasses(
  baseline: Readonly<Record<string, unknown>>,
  context: Readonly<Record<string, unknown>>,
): readonly string[] {
  if (context['compact_fallback'] === true) return ['compact_fallback'];
  const classes: string[] = [];
  const topLevel = [
    ['applicable_skills', 'skills'],
    ['actor_knowledge', 'actor_knowledge'],
    ['reaction_spend_hold', 'reaction_windows'],
    ['recovery_capabilities', 'recovery_targets'],
    ['search_memory', 'search_memory'],
    ['alert_state', 'alert_state'],
    ['legendary_windows', 'legendary_detail'],
    ['recent_changes', 'recent_changes'],
    ['summary', 'terrain_tags'],
    ['team_plan_frontier', 'team_plan_frontier'],
    ['applicable_plays', 'plays'],
    ['suggested_plan', 'suggested_plan'],
  ] as const;
  for (const [key, label] of topLevel) {
    if (changed(baseline, context, key)) classes.push(label);
  }
  const actorClasses = [
    [['options'], 'options'],
    [['intel', 'movement'], 'movement'],
    [['intel', 'rows'], 'intel_rows'],
    [['threats'], 'threats'],
    [['intel', 'opportunity_cost'], 'opportunity_cost'],
    [['status', 'effect_tags'], 'status_effects'],
    [['status', 'pending_decision_ids'], 'pending_decisions'],
  ] as const;
  for (const [path, label] of actorClasses) {
    if (actorClassChanged(baseline, context, path)) classes.push(label);
  }
  return classes;
}

async function render(seed: number, maximumBytes: number): Promise<RenderedSweepContext> {
  const loaded = await loadArenaFixture(
    `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json`,
  );
  const session = new EngineRoundSession(
    applyRoomInitiativeProfile(loaded, 'derived_v1'),
    mulberry32(seed),
    { kind: 'unattended', askDefault: 'decline' },
    OFFER_ENVIRONMENT,
  );
  const prepared = session.beginRoundWithoutSkipping({
    runId: encounterSessionId(`encounter:cap-sweep-${String(seed)}`),
    branchId: encounterBranchId(`branch:cap-sweep-${String(seed)}`),
    revision: 1,
    requestId: `request:cap-sweep-${String(seed)}`,
    phase: 'initial',
    room: seed - 5_117_000,
    historyKind: 'room_ready',
  }, null);
  const request = prepared.snapshot.capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error(`Seed ${String(seed)} did not produce an ordinary round request.`);
  }
  let evidence: SweepRenderEvidence | undefined;
  const runtime = createEngineMcpRuntime(session.currentState(), {
    toolProfile: 'dm',
    runId: prepared.snapshot.capsule.runId,
    branchId: prepared.snapshot.capsule.branchId,
    revision: prepared.snapshot.capsule.revision,
    requestId: request.requestId,
    phase: request.phase,
    correctionNumber: request.correctionNumber,
    room: seed - 5_117_000,
    historyKind: 'room_ready',
    requestedActorIds: request.actors,
    initiativeProjection: prepared.snapshot.capsule.projection.initiative,
    turnContextMaximumBytes: maximumBytes,
    onTurnContextRendered: (rendered) => { evidence = rendered; },
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  const capsule = runtime.feed.current();
  const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
    intel_mode: 'full',
  }));
  if (context === null || evidence === undefined) {
    throw new Error(`Seed ${String(seed)} emitted no rendered turn context evidence.`);
  }
  return { context, evidence };
}

function contextCounts(context: Readonly<Record<string, unknown>>): {
  readonly actors: number;
  readonly options: number;
  readonly omitted: number;
} {
  const actors = array(context['actors']).flatMap((value) => record(value) === null ? [] : [record(value)!]);
  return {
    actors: actors.length,
    options: actors.reduce((total, actor) => total + array(actor['options']).length, 0),
    omitted: actors.reduce((total, actor) => total +
      (typeof actor['options_omitted_for_size'] === 'number' ? actor['options_omitted_for_size'] : 0), 0),
  };
}

async function main(): Promise<void> {
  process.stdout.write('| cap KiB | seed | preTrimBytes | postTrimBytes | actors | options | omitted | removal classes |\n');
  process.stdout.write('|---:|---:|---:|---:|---:|---:|---:|---|\n');
  const baselines = new Map(await Promise.all(SEEDS.map(async (seed) =>
    [seed, await render(seed, 1024 * 1024)] as const)));
  for (const capKib of CAPS_KIB) {
    const renderedContexts = await Promise.all(SEEDS.map((seed) => render(seed, capKib * 1024)));
    for (const [index, seed] of SEEDS.entries()) {
      const baseline = baselines.get(seed);
      const rendered = renderedContexts[index];
      if (baseline === undefined || rendered === undefined) throw new Error('Cap sweep lost a rendered row.');
      const counts = contextCounts(rendered.context);
      const classes = removalClasses(baseline.context, rendered.context);
      process.stdout.write(
        `| ${String(capKib)} | ${String(seed)} | ${String(rendered.evidence.preTrimBytes)} | ` +
        `${String(rendered.evidence.postTrimBytes)} | ${String(counts.actors)} | ${String(counts.options)} | ` +
        `${String(counts.omitted)} | ${classes.length === 0 ? 'none' : classes.join(', ')} |\n`,
      );
    }
  }
}

await main();
