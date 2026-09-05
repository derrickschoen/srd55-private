import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  R1_10_PROTOCOL,
  R1_10_SEEDS,
  assertBlindedPacket,
  buildMultiArmRerunPacket,
  buildReasonVisibilityIsolationPacket,
  buildRerunPacket,
  parseRerunPacketArgs,
  validateRerunRows,
} from '../../../tools/ai-dm-rerun-packet';
import { declareTestInputs } from '../../helpers/test-inputs';

const fixtureRowSchema = z.record(z.string(), z.unknown());
type JsonRecord = z.infer<typeof fixtureRowSchema>;

function record(value: unknown): JsonRecord {
  return fixtureRowSchema.parse(value);
}

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl',
    'tests/fixtures/ai-dm-rerun/leaked-training.SIMULATED.jsonl',
  ],
});

const tinyProtocol = { seeds: [5_117_001], reps: 1 } as const;

function rowsFromFixture(path: Parameters<typeof inputs.fixtures.readText>[0]): readonly JsonRecord[] {
  return inputs.fixtures.readText(path).trim().split('\n').map((line) => {
    const decoded: unknown = JSON.parse(line);
    return fixtureRowSchema.parse(decoded);
  });
}

function registeredRows(): JsonRecord[] {
  return R1_10_SEEDS.flatMap((seed, room) => [1, 2, 3].flatMap((round) =>
    ['baseline', 'intel'].map((arm) => ({
      seed,
      room: room + 1,
      round,
      arm,
      instructionSource: 'none',
      skillName: null,
      skillHash: null,
      model: `${arm}-model`,
      cli: 'codex',
      startingRoomDigest: `frozen-room-${String(seed)}`,
      combatModel: 'initiative_segments_v1',
      initiativeOrder: ['monster', 'fighter'],
      outcome: 'authorized',
      plannedBy: { model: `${arm}-model`, effort: 'medium' },
      decisionTransport: 'mcp_minimal',
      firstDecisionAccepted: true,
      decisionAttempts: 1,
      decisionRejectionCodes: [],
      normalizationCodes: [],
      rationale: null,
      roundNarrative: null,
      authorizedPlan: null,
      // Era asymmetry is the real R1-10 shape: only the post-intel arm
      // produces engineIntel. Validation must accept both.
      ...(arm === 'intel' ? {
        engineIntel: {
          policy: 'dm-intel-capture-v1',
          policyVersions: { initiative: 'initiative-intel-v1' },
          actors: [],
        },
      } : {}),
    } satisfies JsonRecord)
  )));
}

describe('AI-DM R1-10 rerun packet', () => {
  it('carries UI feedback beside its board image into the judge packet', () => {
    const feedback = {
      readability: 3,
      what_helped: ['Visible spacing'],
      what_confused: ['Overlapping labels'],
      missing: [],
      suggestion: 'Increase label contrast.',
    } as const;
    const rows = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl')
      .map((row, index) => ({
        ...row,
        boardImage: {
          mode: 'png', sha256: 'a'.repeat(64), bytes: 96, width: 1, height: 1,
          captureMs: 1, relativePath: `board-images/${'a'.repeat(64)}.png`,
        },
        uiFeedback: index === 0 ? feedback : null,
      }));
    const result = buildRerunPacket(rows, 1, tinyProtocol);
    const visible = result.packet.entries.find((entry) => entry.uiFeedback !== null);
    expect(visible?.uiFeedback).toEqual(feedback);
    expect(visible?.boardImage).toEqual(expect.objectContaining({
      mode: 'png', relativePath: `board-images/${'a'.repeat(64)}.png`,
    }));
  });

  it('builds the exact blinded packet and separate answer key from hand-built arena rows', () => {
    const rows = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl')
      .map((row, index) => index !== 0 ? row : {
        ...row,
        rationale: 'The ogre pins the front line while its allies reposition.',
        authorizedPlan: [{
          ...record((row['authorizedPlan'] as readonly unknown[])[0]),
          reason: 'Attack the fighter to keep the front line occupied.',
        }],
      });
    const result = buildRerunPacket(rows, 1, tinyProtocol);

    const expectedPacket = {
      version: 'ai-dm-rerun-packet-v1',
      judgingOrder: 'interleaved_blinded',
      rubric: {
        targetPriority: { maximum: 3 }, actionEconomy: { maximum: 3 },
        positioning: { maximum: 2 }, coherence: { maximum: 2 }, total: { maximum: 10 },
      },
      entries: [
        {
          blindId: 'blind-001', caseId: 'case-01-1', outcome: 'authorized',
          attribution: 'model_authorized',
          // Era-neutral form only: the raw resolutionSummary shape from the
          // fixture must never survive into the packet, and neither may the
          // renderer-templated roundNarrative.
          executedPlan: [{
            actorId: 'monster:ogre',
            actions: [{ kind: 'attack', actionId: null, targetIds: ['pc:fighter'] }],
            movementFeet: 0,
          }],
          rubric: { targetPriority: null, actionEconomy: null, positioning: null, coherence: null, total: null },
        },
        {
          blindId: 'blind-002', caseId: 'case-01-1', outcome: 'refused',
          attribution: 'engine_default',
          executedPlan: null,
          rubric: { targetPriority: 0, actionEconomy: 0, positioning: 0, coherence: 0, total: 0 },
        },
      ],
    } as const;
    const expectedAnswerKey = {
      version: 'ai-dm-rerun-packet-v1',
      entries: [
        {
          blindId: 'blind-001', arm: 'baseline', rowEra: 'post_shift', planner: 'model',
          overridePolicy: 'typed_reason',
          overrideKinds: [], overrideRejections: [],
          decisionReasons: [{
            actorId: 'monster:ogre', reason: 'Attack the fighter to keep the front line occupied.',
          }],
          rationale: 'The ogre pins the front line while its allies reposition.',
          decisionTransport: 'mcp_minimal', firstDecisionAccepted: true, decisionAttempts: 1,
          decisionRejectionCodes: [], normalizationCodes: [], indexZeroSelectionRate: 'not_applicable',
          instructionSource: 'none', skillName: null, skillHash: null,
        },
        {
          blindId: 'blind-002', arm: 'intel', rowEra: 'post_shift', planner: 'engine_default',
          overridePolicy: 'typed_reason',
          overrideKinds: [], overrideRejections: [], decisionReasons: [], rationale: null,
          decisionTransport: 'mcp_minimal', firstDecisionAccepted: false, decisionAttempts: 0,
          decisionRejectionCodes: [], normalizationCodes: [], indexZeroSelectionRate: 'not_applicable',
          skillName: 'engine-submission', skillHash: 'a'.repeat(64),
          instructionSource: 'skill',
        },
      ],
    } as const;

    expect(result.packet).toEqual(expectedPacket);
    expect(result.answerKey).toEqual(expectedAnswerKey);
    expect(JSON.stringify(result.packet)).not.toContain('baseline-model');
    expect(JSON.stringify(result.packet)).not.toContain('intel-model');
    expect(JSON.stringify(result.packet)).not.toContain('engineIntel');
    expect(JSON.stringify(result.packet)).not.toContain('resolutionSummary');
    expect(JSON.stringify(result.packet)).not.toContain('roundNarrative');

    // The narrative is deliberately dropped, so mutating it must NOT change
    // the packet; mutating the executed plan must.
    const narrativeMutated = rows.map((row, index) => index === 0
      ? { ...row, roundNarrative: 'The ogre retreats.' }
      : row);
    expect(buildRerunPacket(narrativeMutated, 1, tinyProtocol).packet).toEqual(expectedPacket);
    const planMutated = rows.map((row, index) => index === 0
      ? {
          ...row,
          authorizedPlan: [{
            actorId: 'monster:ogre',
            resolutionSummary: {
              optionId: 'club-fighter', movementFeet: 10,
              actionSlots: [{ slot: 'main', kind: 'attack', targetIds: ['pc:wizard'] }],
            },
          }],
        }
      : row);
    expect(buildRerunPacket(planMutated, 1, tinyProtocol).packet).not.toEqual(expectedPacket);
  });

  it('builds a mixed-era packet while keeping pre-shift decision fields absent', () => {
    const preShiftRow: JsonRecord = {
      seed: 5_117_001,
      room: 1,
      round: 1,
      arm: 'pre-shift',
      startingRoomDigest: 'pre-shift-state',
      combatModel: 'initiative_segments_v1',
      initiativeOrder: [],
      outcome: 'authorized',
      plannedBy: { model: 'pre-shift-model', effort: 'low' },
      repoCommit: 'pre-shift-commit',
      roundNarrative: null,
      authorizedPlan: null,
    };
    const postShiftRow: JsonRecord = {
      ...preShiftRow,
      arm: 'post-shift',
      plannedBy: { model: 'post-shift-model', effort: 'low' },
      repoCommit: 'post-shift-commit',
      startingRoomDigest: 'post-shift-state',
      decisionTransport: 'mcp_minimal',
      firstDecisionAccepted: true,
      decisionAttempts: 1,
      decisionRejectionCodes: [],
      normalizationCodes: [],
      instructionSource: 'none',
      skillName: null,
      skillHash: null,
      rationale: null,
    };

    const result = buildRerunPacket([preShiftRow, postShiftRow], 1, tinyProtocol);
    expect(result.packet.entries).toHaveLength(2);
    expect(JSON.stringify(result.packet)).not.toContain('rowEra');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', rowEra: 'pre_shift' }] }))
      .toThrow('leaks a model-identifying field');
    expect(result.answerKey.entries.map((entry) => entry.rowEra).sort())
      .toEqual(['post_shift', 'pre_shift']);
    const preShiftKey = result.answerKey.entries.find((entry) => entry.rowEra === 'pre_shift');
    if (preShiftKey === undefined) throw new Error('missing pre-shift answer-key entry');
    expect(preShiftKey).not.toHaveProperty('firstDecisionAccepted');
    expect(preShiftKey).not.toHaveProperty('decisionTransport');
    expect(preShiftKey).not.toHaveProperty('instructionSource');
    expect(preShiftKey).not.toHaveProperty('skillName');
    expect(preShiftKey).not.toHaveProperty('skillHash');
    expect(preShiftKey).not.toHaveProperty('chosenOptionIndices');
    expect(preShiftKey).not.toHaveProperty('rationale');

    const mcpMinimalKey = result.answerKey.entries.find((entry) =>
      'decisionTransport' in entry && entry.decisionTransport === 'mcp_minimal');
    if (mcpMinimalKey === undefined) throw new Error('missing mcp_minimal answer-key entry');
    expect(mcpMinimalKey).not.toHaveProperty('chosenOptionIndices');
    expect(mcpMinimalKey.indexZeroSelectionRate).toBe('not_applicable');
    expect(() => buildRerunPacket([
      preShiftRow,
      { ...postShiftRow, chosenOptionIndices: [] },
    ], 1, tinyProtocol)).toThrow('.chosenOptionIndices is invalid');

    const finalIndicesRow = { ...postShiftRow, decisionTransport: 'final_indices', chosenOptionIndices: [] };
    const { chosenOptionIndices: _chosenOptionIndices, ...finalIndicesWithoutIndices } = finalIndicesRow;
    expect(() => buildRerunPacket([preShiftRow, finalIndicesWithoutIndices], 1, tinyProtocol))
      .toThrow('.chosenOptionIndices is invalid');

    const { firstDecisionAccepted: _firstDecisionAccepted, ...missingFirstDecision } = postShiftRow;
    expect(() => buildRerunPacket([preShiftRow, missingFirstDecision], 1, tinyProtocol))
      .toThrow('.firstDecisionAccepted is invalid');
    expect(() => buildRerunPacket([
      { ...preShiftRow, decisionTransport: 'mcp_minimal' },
      postShiftRow,
    ], 1, tinyProtocol)).toThrow();
  });

  it('scores execution_failed as zero and keeps planner and override evidence only in the answer key', () => {
    const rows = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl')
      .map((row, index) => ({
        ...row,
        outcome: 'execution_failed',
        planner: index === 0 ? 'model' : 'sim_controller',
        overrideKinds: index === 0 ? ['objective'] : [],
        overrideRejections: index === 0
          ? [{ actorId: 'monster:ogre', code: 'OVERRIDE_UNJUSTIFIED' }]
          : [],
      }));
    const result = buildRerunPacket(rows, 1, tinyProtocol);

    expect(result.packet.entries.every((entry) =>
      entry.outcome === 'execution_failed' && entry.executedPlan === null &&
      entry.rubric.total === 0)).toBe(true);
    expect(result.answerKey.entries).toEqual([
      {
        blindId: 'blind-001', arm: 'baseline', rowEra: 'post_shift', planner: 'model',
        overridePolicy: 'typed_reason',
        overrideKinds: ['objective'],
        overrideRejections: [{ actorId: 'monster:ogre', code: 'OVERRIDE_UNJUSTIFIED' }],
        decisionReasons: [], rationale: null,
        decisionTransport: 'mcp_minimal', firstDecisionAccepted: true, decisionAttempts: 1,
        decisionRejectionCodes: [], normalizationCodes: [], indexZeroSelectionRate: 'not_applicable',
        instructionSource: 'none', skillName: null, skillHash: null,
      },
      {
        blindId: 'blind-002', arm: 'intel', rowEra: 'post_shift', planner: 'sim_controller',
        overridePolicy: 'typed_reason',
        overrideKinds: [], overrideRejections: [], decisionReasons: [], rationale: null,
        decisionTransport: 'mcp_minimal', firstDecisionAccepted: false, decisionAttempts: 0,
        decisionRejectionCodes: [], normalizationCodes: [], indexZeroSelectionRate: 'not_applicable',
        instructionSource: 'skill', skillName: 'engine-submission', skillHash: 'a'.repeat(64),
      },
    ]);
    const packetText = JSON.stringify(result.packet);
    expect(packetText).not.toContain('planner');
    expect(packetText).not.toContain('override');
  });

  it('validates the preregistered seed set, three paired reps, frozen artifacts, holdout status, and initiative evidence', () => {
    const rows = registeredRows();
    expect(rows).toHaveLength(60);
    expect(validateRerunRows(rows, R1_10_PROTOCOL)).toHaveLength(60);

    const wrongSeed = [...rows];
    wrongSeed[0] = { ...wrongSeed[0]!, seed: 5_117_011 };
    expect(() => validateRerunRows(wrongSeed, R1_10_PROTOCOL)).toThrow('not an R1-10 holdout seed');

    const missingRep = rows.filter((row) => !(row['seed'] === 5_117_003 && row['round'] === 2 && row['arm'] === 'intel'));
    expect(() => validateRerunRows(missingRep, R1_10_PROTOCOL)).toThrow('requires one row from each arm');

    expect(() => buildRerunPacket(
      rowsFromFixture('tests/fixtures/ai-dm-rerun/leaked-training.SIMULATED.jsonl'), 1, tinyProtocol,
    )).toThrow('permanent holdout');
  });

  it('builds one blinded packet for four arms and enforces their shared case grid', () => {
    const protocol = { seeds: [5_117_001, 5_117_002], reps: 2 } as const;
    const arms = ['control', 'cut-a', 'cut-b', 'cut-c'] as const;
    const rows = protocol.seeds.flatMap((seed, room) => [1, 2].flatMap((round) =>
      arms.map((arm) => ({
        seed,
        room: room + 1,
        round,
        arm,
        instructionSource: 'none',
        skillName: null,
        skillHash: null,
        model: `${arm}-model`,
        cli: `${arm}-cli`,
        startingRoomDigest: `frozen-room-${String(seed)}`,
        combatModel: 'initiative_segments_v1',
        initiativeOrder: ['monster', 'fighter'],
        outcome: 'authorized',
        plannedBy: { model: `${arm}-model`, effort: 'medium' },
        decisionTransport: 'mcp_minimal',
        firstDecisionAccepted: true,
        decisionAttempts: 1,
        decisionRejectionCodes: [],
        normalizationCodes: [],
        rationale: null,
        plannerLabel: `${arm}-planner`,
        roundNarrative: `${arm} narrative`,
        authorizedPlan: null,
        engineIntel: {
          policy: 'dm-intel-capture-v1',
          policyVersions: { initiative: 'initiative-intel-v1' },
          actors: [arm],
        },
      } satisfies JsonRecord))
    ));

    const result = buildMultiArmRerunPacket(rows, 23, protocol);
    expect(result.packet.entries).toHaveLength(rows.length);
    expect(result.answerKey.entries).toHaveLength(rows.length);
    expect(new Set(result.answerKey.entries.map(({ arm }) => arm))).toEqual(new Set(arms));
    expect(result.answerKey.entries.map(({ blindId }) => blindId))
      .toEqual(result.packet.entries.map(({ blindId }) => blindId));
    const packetText = JSON.stringify(result.packet);
    for (const arm of arms) expect(packetText).not.toContain(arm);

    const mismatchedGrid = rows.filter((row) =>
      !(row['arm'] === 'cut-c' && row['seed'] === 5_117_002 && row['round'] === 2));
    expect(() => buildMultiArmRerunPacket(mismatchedGrid, 23, protocol))
      .toThrow('requires one row from each arm for seed 5117002 rep 2');

    expect(() => buildMultiArmRerunPacket(
      rows.filter((row) => row['arm'] === 'control'), 23, protocol,
    )).toThrow('requires at least two paired arms');
  });

  it('keeps the two-arm packet byte-identical through the multi-arm API', () => {
    const rows = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl');
    expect(buildMultiArmRerunPacket(rows, 1, tinyProtocol))
      .toEqual(buildRerunPacket(rows, 1, tinyProtocol));
  });

  it('normalizes both era plan shapes to the same neutral form and fails loud on an unknown shape', () => {
    const base = {
      seed: 5_117_001, room: 1, round: 1, startingRoomDigest: 'd1',
      combatModel: 'initiative_segments_v1', initiativeOrder: [], outcome: 'authorized',
      plannedBy: { model: 'm', effort: 'low' }, roundNarrative: null,
      decisionTransport: 'mcp_minimal', firstDecisionAccepted: true, decisionAttempts: 1,
      decisionRejectionCodes: [], normalizationCodes: [],
      instructionSource: 'none', skillName: null, skillHash: null, rationale: null,
    };
    const paired = (plan: unknown, extra: Record<string, unknown> = {}): Record<string, unknown>[] =>
      ['a', 'b'].map((arm) => ({ ...base, arm, authorizedPlan: plan, ...extra }));
    // Real baseline rows carry BOTH acceptedIntent and the old single-action
    // resolutionSummary {actionId, targetId, movementFeet} (verified against
    // harvested R1-10 rows); the executed summary wins.
    const oldEra = buildRerunPacket(paired([
        {
          actorId: 'combatant:m1',
          acceptedIntent: {
            actor_id: 'combatant:m1',
            choice: {
              kind: 'attack', action_id: 'radiant-flame', resource_policy: 'normal',
              target: { kind: 'combatant', combatant_id: 'combatant:cleric' },
            },
            movement: { willingness: 'only_if_required' },
          },
          resolutionSummary: { actionId: 'radiant-flame', targetId: 'combatant:cleric', movementFeet: 5 },
        },
        {
          actorId: 'combatant:m2',
          acceptedIntent: { actor_id: 'combatant:m2', choice: { kind: 'dodge', target: null } },
          resolutionSummary: { actionId: 'dodge', targetId: null, movementFeet: 0 },
        },
        // Intent-only fallback (no executed summary recorded).
        { actorId: 'combatant:m3', acceptedIntent: { actor_id: 'combatant:m3', choice: { kind: 'dodge' } } },
      ]), 1, { seeds: [5_117_001], reps: 1 });
    for (const entry of oldEra.packet.entries) {
      expect(entry.executedPlan).toEqual([
        { actorId: 'combatant:m1', actions: [{ kind: 'attack', actionId: 'radiant-flame', targetIds: ['combatant:cleric'] }], movementFeet: 5 },
        { actorId: 'combatant:m2', actions: [{ kind: 'dodge', actionId: 'dodge', targetIds: [] }], movementFeet: 0 },
        { actorId: 'combatant:m3', actions: [{ kind: 'dodge', actionId: null, targetIds: [] }], movementFeet: null },
      ]);
    }
    expect(JSON.stringify(oldEra.packet)).not.toContain('roundNarrative');

    const newEra = buildRerunPacket(paired([{
      actorId: 'combatant:m1',
      acceptedProposal: { primary_option_id: 'option:2:aa' },
      selectedBranch: 'primary',
      resolutionSummary: {
        optionId: 'option:2:aa', movementFeet: 5,
        actionSlots: [{ slot: 'main', kind: 'attack', actionId: 'radiant-flame', spellId: null, objectId: null, targetIds: ['combatant:cleric'] }],
      },
    }], { plannerLabel: 'model', engineIntel: null }), 1, { seeds: [5_117_001], reps: 1 });
    for (const entry of newEra.packet.entries) {
      expect(entry.executedPlan).toEqual([
        { actorId: 'combatant:m1', actions: [{ kind: 'attack', actionId: 'radiant-flame', targetIds: ['combatant:cleric'] }], movementFeet: 5 },
      ]);
    }
    expect(JSON.stringify(newEra.packet)).not.toContain('acceptedProposal');
    expect(JSON.stringify(newEra.packet)).not.toContain('selectedBranch');

    expect(() => buildRerunPacket(
      paired([{ actorId: 'combatant:m1', unrecognized: true }]),
      1, { seeds: [5_117_001], reps: 1 },
    )).toThrow('matches neither known era shape');

    expect(() => buildRerunPacket(
      paired([{ actorId: 'combatant:m1', resolutionSummary: { actionId: 'longbow', targetId: 'combatant:cleric' } }]),
      1, { seeds: [5_117_001], reps: 1 },
    )).toThrow('refusing to fabricate an action kind');

    const exhaustion = buildRerunPacket(
      paired(null, { plannedBy: null, plannerLabel: 'engine_default', roundNarrative: 'Dodge.' }),
      1, { seeds: [5_117_001], reps: 1 },
    );
    for (const entry of exhaustion.packet.entries) expect(entry.attribution).toBe('engine_default');
    expect(JSON.stringify(exhaustion.packet)).not.toContain('plannerLabel');
  });

  it('cross-era mode partitions arms by repoCommit and requires within-arm digest consistency only', () => {
    const crossEraRows = (mutate?: (row: JsonRecord, era: string) => JsonRecord): JsonRecord[] =>
      R1_10_SEEDS.flatMap((seed, room) => [1, 2, 3].flatMap((round) =>
        ['commit-old', 'commit-new'].map((era) => {
          const row: JsonRecord = {
            seed,
            room: room + 1,
            round,
            // Cross-era reality: the arena labels both eras identically.
            arm: 'single',
            instructionSource: 'none',
            skillName: null,
            skillHash: null,
            repoCommit: era,
            model: 'shared-model',
            cli: 'codex',
            // Era-dependent canonical-state digest: differs ACROSS arms even
            // on identical room inputs, but must be stable WITHIN an arm.
            startingRoomDigest: `state-${era}-${String(seed)}`,
            combatModel: 'initiative_segments_v1',
            initiativeOrder: ['monster', 'fighter'],
            outcome: 'authorized',
            plannedBy: { model: 'shared-model', effort: 'low' },
            decisionTransport: 'mcp_minimal',
            firstDecisionAccepted: true,
            decisionAttempts: 1,
            decisionRejectionCodes: [],
            normalizationCodes: [],
            rationale: null,
            roundNarrative: null,
            authorizedPlan: null,
            ...(era === 'commit-new' ? {
              engineIntel: {
                policy: 'dm-intel-capture-v1',
                policyVersions: { initiative: 'initiative-intel-v1' },
                actors: [],
              },
            } : {}),
          };
          return mutate ? mutate(row, era) : row;
        })
      ));

    // Strict mode refuses this data twice over: one arm label, unequal digests.
    expect(() => validateRerunRows(crossEraRows(), R1_10_PROTOCOL)).toThrow();

    const result = buildRerunPacket(crossEraRows(), 7, R1_10_PROTOCOL, true);
    expect(result.packet.entries).toHaveLength(60);
    expect(JSON.stringify(result.packet)).not.toContain('engineIntel');
    expect(JSON.stringify(result.packet)).not.toContain('commit-old');
    expect(new Set(result.answerKey.entries.map((entry) => entry.arm)))
      .toEqual(new Set(['era:commit-old', 'era:commit-new']));

    const fourEraRows = crossEraRows().flatMap((row) => {
      const era = row['repoCommit'];
      if (typeof era !== 'string') throw new TypeError('test row must have repoCommit');
      return [row, {
        ...row,
        repoCommit: `${era}-variant`,
        startingRoomDigest: `${String(row['startingRoomDigest'])}-variant`,
      }];
    });
    const fourEraResult = buildMultiArmRerunPacket(fourEraRows, 7, R1_10_PROTOCOL, true);
    expect(fourEraResult.packet.entries).toHaveLength(120);
    expect(new Set(fourEraResult.answerKey.entries.map((entry) => entry.arm))).toEqual(new Set([
      'era:commit-old', 'era:commit-old-variant', 'era:commit-new', 'era:commit-new-variant',
    ]));
    expect(JSON.stringify(fourEraResult.packet)).not.toContain('commit-');

    const missingCommit = crossEraRows((row, era) => {
      if (era === 'commit-old' && row['seed'] === 5_117_001 && row['round'] === 1) {
        const { repoCommit: _unused, ...rest } = row;
        return rest;
      }
      return row;
    });
    expect(() => validateRerunRows(missingCommit, R1_10_PROTOCOL, true))
      .toThrow('repoCommit is required in cross-era mode');

    const driftingRoom = crossEraRows((row, era) =>
      era === 'commit-new' && row['seed'] === 5_117_002 && row['round'] === 3
        ? { ...row, startingRoomDigest: 'state-commit-new-drifted' }
        : row);
    expect(() => validateRerunRows(driftingRoom, R1_10_PROTOCOL, true))
      .toThrow('distinct room states across reps');
  });

  it('rejects identity and decision text from blinded packets (mutation: reason leaks into packet)', () => {
    expect(() => buildRerunPacket(
      rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl'),
      1,
      tinyProtocol,
    )).not.toThrow();
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', model: 'leaked-model' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', engineIntel: { actors: [] } }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', roundNarrative: 'uses dodge' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', reason: 'because' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', rationale: 'because' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', decisionTransport: 'final_indices' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', normalizationCodes: ['stale_catalog'] }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', overridePolicy: 'strict' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', instructionSource: 'skill' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', skillName: 'dm-round' }] }))
      .toThrow('leaks a model-identifying field');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', skillHash: 'a'.repeat(64) }] }))
      .toThrow('leaks a model-identifying field');
  });

  it('keeps structured-final reasons and chosen indices in the answer key only (mutation: make reason optional)', () => {
    const rows = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl').map((row, index) => index === 0
      ? {
          ...row,
          decisionTransport: 'final_indices',
          chosenOptionIndices: [{ actorId: 'monster:ogre', primaryOptionIndex: 0, fallbackOptionIndex: 1 }],
          authorizedPlan: [{
            actorId: 'monster:ogre', reason: 'The engine recommendation preserves the tactical advantage.',
            selectedBranch: 'primary',
            resolutionSummary: {
              optionId: 'club-fighter', movementFeet: 0,
              actionSlots: [{ slot: 'main', kind: 'attack', targetIds: ['pc:fighter'] }],
            },
          }],
        }
      : row);
    const result = buildRerunPacket(rows, 1, tinyProtocol);
    expect(result.answerKey.entries[0]).toMatchObject({
      chosenOptionIndices: [{ actorId: 'monster:ogre', primaryOptionIndex: 0, fallbackOptionIndex: 1 }],
      indexZeroSelectionRate: 1,
      decisionReasons: [{ actorId: 'monster:ogre', reason: 'The engine recommendation preserves the tactical advantage.' }],
    });
    expect(JSON.stringify(result.packet)).not.toContain('tactical advantage');
    expect(() => assertBlindedPacket({ entries: [{ blindId: 'blind-001', reason: 'leaked' }] }))
      .toThrow('leaks a model-identifying field');
  });

  it('renders actor reason lines only when explicitly enabled (mutation: render reasons when off)', () => {
    const source = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl');
    const reason = 'Hold the doorway because the wounded ally needs room to withdraw.';
    const rows = source.map((row, index) => index === 0 ? {
      ...row,
      authorizedPlan: [{
        ...record((row['authorizedPlan'] as readonly unknown[])[0]),
        reason,
      }],
    } : row);

    const hidden = buildRerunPacket(rows, 1, tinyProtocol, { reasonsVisible: false });
    expect(JSON.stringify(hidden.packet)).not.toContain(reason);
    expect(() => assertBlindedPacket({
      entries: [{ executedPlan: [{ actorId: 'monster:ogre', reason }] }],
    })).toThrow('leaks a model-identifying field');

    const visible = buildRerunPacket(rows, 1, tinyProtocol, { reasonsVisible: true });
    expect(visible.packet.entries.flatMap((entry) => entry.executedPlan ?? []))
      .toContainEqual(expect.objectContaining({ actorId: 'monster:ogre', reason }));
    expect(() => assertBlindedPacket(visible.packet, 'packet', { reasonsVisible: true })).not.toThrow();
  });

  it('shows reasons only for V in a multi-arm packet and builds the prime-547 isolation pair from the same V rows', () => {
    const source = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl')[0];
    if (source === undefined) throw new Error('paired fixture is incomplete');
    const reason = 'Break formation because morale has collapsed after the leader fell.';
    const vRow = {
      ...source,
      arm: 'V',
      overridePolicy: 'typed_reason',
      authorizedPlan: [{
        ...record((source['authorizedPlan'] as readonly unknown[])[0]),
        reason,
      }],
    };
    const threeArmRows = [
      { ...vRow, arm: 'S', overridePolicy: 'strict' },
      vRow,
      { ...vRow, arm: 'U' },
    ];
    const threeArm = buildMultiArmRerunPacket(threeArmRows, 541, tinyProtocol, {
      reasonsVisible: true,
      reasonVisibleArms: ['V'],
    });
    const visibleBlindIds = new Set(threeArm.answerKey.entries
      .filter((entry) => entry.arm === 'V')
      .map((entry) => entry.blindId));
    for (const entry of threeArm.packet.entries) {
      const reasons = (entry.executedPlan ?? []).flatMap((plan) => plan.reason ?? []);
      expect(reasons).toEqual(visibleBlindIds.has(entry.blindId) ? [reason] : []);
    }

    const isolation = buildReasonVisibilityIsolationPacket([vRow], 547, tinyProtocol);
    expect(new Set(isolation.answerKey.entries.map((entry) => entry.arm)))
      .toEqual(new Set(['reason_visible', 'reason_hidden']));
    const reasonCounts = isolation.packet.entries.map((entry) =>
      (entry.executedPlan ?? []).filter((plan) => plan.reason === reason).length).sort();
    expect(reasonCounts).toEqual([0, 1]);
  });

  it('requires instruction provenance and the selected skill hash in every source row', () => {
    const rows = rowsFromFixture('tests/fixtures/ai-dm-rerun/paired-tiny.SIMULATED.jsonl');
    const first = rows[0];
    const second = rows[1];
    if (first === undefined || second === undefined) throw new Error('paired fixture is incomplete');
    const { instructionSource: _source, ...withoutSource } = first;
    const { skillHash: _hash, ...withoutSkillHash } = second;
    expect(() => buildRerunPacket([withoutSource, second], 1, tinyProtocol))
      .toThrow('.instructionSource is invalid');
    expect(() => buildRerunPacket([first, withoutSkillHash], 1, tinyProtocol))
      .toThrow('.skillHash is invalid');
  });

  it('requires explicit, separate CLI paths and a deterministic shuffle seed', () => {
    const directory = join(tmpdir(), 'dnd-rerun-packet-cli');
    expect(parseRerunPacketArgs([
      '--input', join(directory, 'arena-a.jsonl'), '--input', join(directory, 'arena-b.jsonl'),
      '--packet', join(directory, 'packet.json'), '--answer-key', join(directory, 'answer-key.json'),
      '--shuffle-seed', '41',
    ])).toMatchObject({ shuffleSeed: 41, crossEra: false, inputPaths: [join(directory, 'arena-a.jsonl'), join(directory, 'arena-b.jsonl')] });
    expect(parseRerunPacketArgs([
      '--input', join(directory, 'arena-a.jsonl'), '--input', join(directory, 'arena-b.jsonl'),
      '--packet', join(directory, 'packet.json'), '--answer-key', join(directory, 'answer-key.json'),
      '--shuffle-seed', '41', '--cross-era',
    ])).toMatchObject({ crossEra: true });
    expect(() => parseRerunPacketArgs(['--input', 'arena.jsonl', '--packet', 'same.json', '--answer-key', 'same.json', '--shuffle-seed', '1']))
      .toThrow('must be different files');
  });
});
