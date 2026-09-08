import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import {
  deriveVariantHorizon,
  massControlStage,
  mergeReplayEquivalentNodes,
  runChallengeFeasibility,
} from '../../../tools/challenge-feasibility';
import { combatantId } from '../../../src/combat/values';

describe('D583 challenge feasibility spike', () => {
  it('transactional adapter preserves die provenance across checkpoint replay and rollback', async () => {
    const report = await runChallengeFeasibility();
    expect(report.rollbackChecks).toEqual({
      cursorRestored: true,
      observerRestored: true,
      replayMatched: true,
    });
    expect(report.provenanceManifest.length).toBeGreaterThan(0);
    expect(report.provenanceManifest.every((draw) => draw.face >= 1 && draw.face <= draw.sides)).toBe(true);
  });

  it('successful save damage and capped healing expose explicit draw provenance', async () => {
    const report = await runChallengeFeasibility();
    const healing = report.provenanceManifest.filter((draw) =>
      draw.provenance.kind === 'healing' && draw.provenance.source === 'spell:healing-word');
    const saves = report.provenanceManifest.filter((draw) => draw.provenance.kind === 'saving_throw');
    const damage = report.provenanceManifest.filter((draw) => draw.provenance.kind === 'attack_damage');
    expect(healing).toHaveLength(4);
    expect(saves.length).toBeGreaterThanOrEqual(1);
    expect(damage.length).toBeGreaterThanOrEqual(2);
    expect(report.stages.A.find((stage) => stage.stage === 'healing-word-capped')).toMatchObject({
      groupedNodes: 1,
      probabilityMass: { numerator: '1', denominator: '1' },
    });
  });

  it('A groups before the second Mace and D before each later Longbow', async () => {
    const report = await runChallengeFeasibility();
    expect(report.ungroupedLowerBounds).toEqual({ A: '84934656', D: '16777216' });
    expect(report.stages.A.map((stage) => [stage.stage, stage.replays, stage.groupedNodes])).toContainEqual([
      'critical-mace-2', 529, 45,
    ]);
    expect(report.stages.D.slice(0, 4).map((stage) => stage.groupedNodes)).toEqual([15, 29, 43, 57]);
    expect(report.stages.D.slice(0, 4).map((stage) => stage.replays)).toEqual([15, 225, 435, 645]);
    expect(report.stages.A.concat(report.stages.D).every((stage) =>
      stage.probabilityMass.numerator === '1' && stage.probabilityMass.denominator === '1')).toBe(true);
  });

  it('every enumerated face child sums to probability mass one', async () => {
    const report = await runChallengeFeasibility();
    expect(report.stages.A.concat(report.stages.D).map((stage) => stage.probabilityMass))
      .toEqual(report.stages.A.concat(report.stages.D).map(() => ({ numerator: '1', denominator: '1' })));
  });

  it('D closed search includes the 540 of 1280 generic-save counterexample', async () => {
    const report = await runChallengeFeasibility();
    expect(report.roomD.oldCounterexample).toEqual({
      genericSaveKills: '540/1280',
      fixedBreach: '159/400',
      advantage: '39/1600',
    });
    expect(report.roomD.fighterInitialLegalCommands.top).toBeGreaterThan(0);
    expect(report.roomD.fighterInitialLegalCommands.alternative).toBe(
      report.roomD.fighterInitialLegalCommands.top,
    );
    expect(report.roomD.alternativeMinusTop).toEqual({ numerator: '0', denominator: '1' });
  });

  it('variant horizons derive endpoints from and complete required actor sets', async () => {
    const fixture = JSON.parse(await readFile(resolve(
      process.cwd(), 'tests/fixtures/arena-basis-challenge/seed-5831004.json',
    ), 'utf8')) as unknown;
    const state = decodeArenaBasisEnvelopeV1(fixture, { mode: 'challenge' }).encounter.state;
    const required = [
      combatantId('combatant:fighter'),
      combatantId('combatant:generated-challenge-d-02-scout-1'),
      combatantId('combatant:cleric'),
      combatantId('combatant:generated-challenge-d-03-scout-2'),
    ];
    const horizon = deriveVariantHorizon(state, required);
    expect(horizon.scheduledOrder).toEqual(required);
    expect(horizon.endpointActorId).toBe(combatantId('combatant:generated-challenge-d-03-scout-2'));
  });

  it('spike fails closed on mass provenance grouping cap or D witness failure', async () => {
    expect(massControlStage(true).probabilityMass).not.toEqual({ numerator: '1', denominator: '1' });
    expect(() => mergeReplayEquivalentNodes([
      { value: { key: 'same', legal: ['attack'] }, numerator: 1n, denominator: 2n },
      { value: { key: 'same', legal: ['dodge'] }, numerator: 1n, denominator: 2n },
    ], (node) => node.key, (node) => JSON.stringify(node.legal))).toThrow('unequal replay signature');
    const report = await runChallengeFeasibility();
    expect(report.verdict).toBe('SHELVE_D583');
    expect(report.roomD.witnessed).toBe(false);
    expect(report.roomD.robustnessVariants).toBe(0);
    expect(report.roomD.negativeControl).toBe('not_frozen_without_positive_witness');
  });

  it('uses the exact arena reaction policy for always never and ask', async () => {
    const report = await runChallengeFeasibility();
    expect(report.reactionPolicies).toEqual([
      { configured: 'always', resolution: 'accept', reactionDraws: 1 },
      { configured: 'never', resolution: 'decline', reactionDraws: 0 },
      { configured: 'ask', resolution: 'decline', reactionDraws: 0 },
    ]);
  });
});
