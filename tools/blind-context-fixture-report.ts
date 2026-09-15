import { createEngineMcpRuntime, loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { generateRoom } from '../src/vtt/room-generator';
import type { EncounterState } from '../src/combat/encounter';
import {
  blindTurnContextSchema,
  type BlindTurnContext,
  type BlindTurnContextBudgetEvidence,
} from '../src/vtt/blind-turn-context';
import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

export interface FixtureCase {
  readonly family: 'hard' | 'brutal' | 'brutal-b';
  readonly seed: number;
  readonly state: () => Promise<EncounterState>;
}

export interface BlindFixtureSerializationRow {
  readonly family: FixtureCase['family'];
  readonly seed: number;
  readonly baseBytes: number;
  readonly semanticBytes: number;
  readonly totalBytes: number;
  readonly truncatedBlocks: readonly [];
  readonly context: BlindTurnContext;
}

function fileFixture(family: 'hard' | 'brutal', seed: number): FixtureCase {
  return {
    family,
    seed,
    state: () => loadArenaFixture(
      `tests/fixtures/arena-basis-${family}/seed-${String(seed)}.json`,
    ),
  };
}

export function blindFixtureCases(): readonly FixtureCase[] {
  return [
    ...Array.from({ length: 13 }, (_unused, index) => fileFixture('hard', 5_117_001 + index)),
    ...Array.from({ length: 10 }, (_unused, index) => fileFixture('brutal', 6_203_001 + index)),
    ...Array.from({ length: 10 }, (_unused, index): FixtureCase => {
      const seed = 6_206_001 + index;
      return {
        family: 'brutal-b',
        seed,
        state: async () => generateRoom(seed, { difficulty: 'brutal' }).encounter.state,
      };
    }),
  ];
}

export async function serializeBlindFixture(
  fixture: FixtureCase,
): Promise<BlindFixtureSerializationRow> {
  let evidence: BlindTurnContextBudgetEvidence | null = null;
  const runtime = createEngineMcpRuntime(await fixture.state(), {
    dmMode: 'blind',
    toolProfile: 'blind',
    onBlindTurnContextRendered: (value) => { evidence = value; },
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  const capsule = runtime.feed.current();
  const context = blindTurnContextSchema.parse(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }));
  if (evidence === null) throw new Error('Blind context serialization emitted no budget evidence.');
  const measured = evidence as BlindTurnContextBudgetEvidence;
  return {
    family: fixture.family,
    seed: fixture.seed,
    baseBytes: measured.actualBaseBytes,
    semanticBytes: measured.actualSemanticBytes,
    totalBytes: new TextEncoder().encode(JSON.stringify(context)).byteLength,
    truncatedBlocks: measured.truncatedBlocks,
    context,
  };
}

export async function blindFixtureSerializationReport(): Promise<readonly BlindFixtureSerializationRow[]> {
  const rows: BlindFixtureSerializationRow[] = [];
  for (const fixture of blindFixtureCases()) rows.push(await serializeBlindFixture(fixture));
  return rows;
}

const scriptIndex = process.argv.findIndex((argument) =>
  argument.endsWith('blind-context-fixture-report.ts'));
if (scriptIndex >= 0) {
  for (const { context: _context, ...row } of await blindFixtureSerializationReport()) {
    process.stdout.write(`${JSON.stringify(row)}\n`);
  }
}
