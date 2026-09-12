import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import type { RoundTurnProposalEnvelope } from '../../../src/vtt/engine-envelopes';
import { authorizedRoundProposalHashInput } from '../../../tools/ai-dm-conversation';
import { parseArenaArgs, runArena, type ArenaRow } from '../../../tools/ai-dm-arena';
import { mkdtempSync } from '../../helpers/test-filesystem';

function teamKinds(row: ArenaRow): readonly ('pc' | 'monster')[] {
  const playerIds = new Set(row.teamPlans.party?.programs.map((program) => program.actorId) ?? []);
  return row.initiativeOrder.map((actorId) => playerIds.has(actorId) ? 'pc' : 'monster');
}

function deterministicTrajectory(row: ArenaRow): Readonly<Record<string, unknown>> {
  return {
    combatModel: row.combatModel,
    startingRoomDigest: row.startingRoomDigest,
    initiativeOrder: row.initiativeOrder,
    partyPolicyHash: row.partyPolicyHash,
    materialityPolicyHash: row.materialityPolicyHash,
    teamPlans: row.teamPlans,
    pcTurns: row.pcTurns,
    adjustments: row.adjustments,
    monsterSegments: row.monsterSegments,
    authorizedPlan: row.authorizedPlan,
    outcome: row.outcome,
  };
}

async function comparison(outPath: string): Promise<readonly ArenaRow[]> {
  return runArena(parseArenaArgs([
    '--rooms', '1', '--reps', '1', '--seed', '3943001',
    '--out', outPath, '--dry-run', '--interleave',
    '--initiative-profile', 'derived_v1',
    '--arm', 'block:model-block:low',
    '--arm', 'segments:model-segments:low',
    '--arm-combat-model', 'block:monster_block_v1',
    '--arm-combat-model', 'segments:initiative_segments_v1',
  ]), { heartbeat: () => undefined });
}

describe('AI-DM same-room combat-model comparison', () => {
  it('pins the authorized proposal hash to domain fields and excludes dispatch correlation evidence', () => {
    const proposal: RoundTurnProposalEnvelope = {
      kind: 'round_turn_proposal',
      proposalId: 'round:stable-proposal',
      runId: encounterSessionId('encounter:stable-run'),
      branchId: encounterBranchId('branch:stable-branch'),
      requestId: 'request:stable-request',
      expectedRevision: 4,
      stateDigest: 'state-digest',
      stateHandle: 'state-handle',
      phase: 'correction',
      idempotencyKey: 'round-submit:stable-key',
      resolutions: [],
      rationale: null,
      reactionGuidance: null,
      submittedArguments: { proposals: [] },
    };
    const stamped = {
      ...proposal,
      dispatchId: 'engine-dispatch:first-runtime-correlation',
      dispatchProfile: 'dm',
      dispatchPhase: 'correction',
    } as const;
    const input = authorizedRoundProposalHashInput(stamped);

    expect(input).toBe(canonicalJson(proposal));
    expect(Object.keys(JSON.parse(input) as Readonly<Record<string, unknown>>).sort()).toEqual([
      'branchId', 'expectedRevision', 'idempotencyKey', 'kind', 'phase', 'proposalId', 'rationale',
      'reactionGuidance', 'requestId', 'resolutions', 'runId', 'stateDigest', 'stateHandle',
      'submittedArguments',
    ]);
    const restamped = {
      ...stamped,
      dispatchId: 'engine-dispatch:second-runtime-correlation',
    } as const;
    expect(authorizedRoundProposalHashInput(restamped)).toBe(input);
    expect(authorizedRoundProposalHashInput({ ...proposal, rationale: 'material change' })).not.toBe(input);
  });

  it('uses one cloned derived-initiative room for a deterministic block/segments A/B', { timeout: 60_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'd416-ai-dm-combat-model-'));
    const first = await comparison(join(directory, 'first.jsonl'));
    const second = await comparison(join(directory, 'second.jsonl'));
    const block = first.find((row) => row.arm === 'block');
    const segments = first.find((row) => row.arm === 'segments');
    if (block === undefined || segments === undefined) throw new Error('Comparison arms are missing.');

    expect(block.startingRoomDigest).toBe(segments.startingRoomDigest);
    expect(block.combatModel).toBe('monster_block_v1');
    expect(segments.combatModel).toBe('initiative_segments_v1');
    expect(block.initiativeOrder).toEqual(segments.initiativeOrder);

    const kinds = teamKinds(segments);
    const crossings = kinds.slice(1).filter((kind, index) => kind !== kinds[index]).length;
    expect(kinds).toContain('pc');
    expect(kinds).toContain('monster');
    expect(crossings).toBeGreaterThanOrEqual(2);
    expect(segments.pcTurns.length).toBeGreaterThan(0);
    expect(segments.monsterSegments.length).toBeGreaterThan(0);

    expect(second.map(deterministicTrajectory)).toEqual(first.map(deterministicTrajectory));
  });
});
