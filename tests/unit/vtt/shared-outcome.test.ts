import { describe, expect, it } from 'vitest';
import { declareTestInputs } from '../../helpers/test-inputs';
import type { CombatantProfile } from '../../../src/combat/combatant';
import type { EffectPayload } from '../../../src/combat/effects';
import {
  combatantConditions,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { Rng } from '../../../src/combat/random';
import type {
  BranchSpellOperation,
  SharedOutcomeOperation,
  SpellCastCommand,
  SpellTargeting,
} from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, feet } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const { readText: readFileSync } = declareTestInputs({
  fixtures: ['tests/fixtures/content-pack-v1-homebrew.json'],
}).fixtures;

interface ImportedSpellSpec {
  readonly id: string;
  readonly targeting: SpellTargeting;
  readonly operation: SharedOutcomeOperation;
}

interface CountingRng extends Rng {
  readonly calls: () => number;
}

function sequenceRng(values: readonly number[]): CountingRng {
  let index = 0;
  return Object.assign(
    () => {
      const value = values[index];
      if (value === undefined) throw new Error(`Unexpected RNG draw ${String(index + 1)}.`);
      index += 1;
      return value;
    },
    { calls: () => index },
  );
}

function fixtureWithSpells(specs: readonly { readonly id: string; readonly targeting: unknown; readonly operation: unknown }[]): unknown {
  const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = fixture.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  return {
    ...fixture,
    spells: specs.map((spec) => ({
      ...template,
      recordId: spec.id,
      name: spec.id,
      level: 0,
      range: { kind: 'feet', feet: 150 },
      duration: { kind: 'instantaneous' },
      concentration: false,
      targeting: spec.targeting,
      operation: spec.operation,
    })),
  };
}

function packWithSpells(specs: readonly ImportedSpellSpec[]): LoadedContentPack {
  const result = loadContentPack(fixtureWithSpells(specs));
  if (result.status !== 'loaded') throw new Error(`Shared-outcome fixture refused: ${result.refusal.reason}`);
  expect(result.content.diagnostics).toEqual([]);
  return result.content;
}

function damage(
  baseCount: number,
  sides: 6 | 8,
  type: 'Lightning' | 'Poison' | 'Psychic' | 'Radiant' | 'Thunder',
  options: { readonly perSlotCount?: number; readonly cantripUpgrade?: boolean } = {},
): BranchSpellOperation {
  return {
    kind: 'damage_operation',
    delivery: { kind: 'automatic' },
    instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: damageType(type) },
      dice: {
        baseCount,
        sides,
        modifier: 0,
        perSlotCount: options.perSlotCount ?? 0,
        perSlotModifier: 0,
        cantripUpgrade: options.cantripUpgrade ?? false,
      },
      scaling: { kind: 'none' },
      thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

function effect(payload: EffectPayload, expiresAt: 'source_end' | 'target_start' | 'target_end'): BranchSpellOperation {
  return {
    kind: 'effect',
    effect: {
      payload,
      target: 'targets',
      concentration: false,
      durationRounds: 1,
      expiresAt,
    },
  };
}

const halfFailureDamage = {
  kind: 'shared_outcome_damage_reference',
  source: { branch: 'failure', operationIndex: 0 },
  transform: 'half_round_down',
} as const;

const shockingGrasp: SharedOutcomeOperation = {
  kind: 'shared_outcome',
  delivery: { kind: 'attack', attackKind: 'melee' },
  onHit: [
    damage(1, 8, 'Lightning', { cantripUpgrade: true }),
    effect({ kind: 'opportunity_attacks_disabled' }, 'target_start'),
  ],
  onMiss: [],
};

const guidingBolt: SharedOutcomeOperation = {
  kind: 'shared_outcome',
  delivery: { kind: 'attack', attackKind: 'ranged' },
  onHit: [
    damage(4, 6, 'Radiant', { perSlotCount: 1 }),
    effect({
      kind: 'attack_roll_mode_modifier',
      mode: 'advantage',
      appliesTo: { kind: 'next_attack_against_target' },
    }, 'source_end'),
  ],
  onMiss: [],
};

const thunderwave: SharedOutcomeOperation = {
  kind: 'shared_outcome',
  delivery: { kind: 'save', ability: 'constitution', rollMode: 'normal' },
  onFailure: [
    damage(2, 8, 'Thunder', { perSlotCount: 1 }),
    { kind: 'forced_movement', direction: 'away', origin: 'caster', distanceFeet: 10, save: null },
  ],
  onSuccess: [halfFailureDamage],
};

const viciousMockery: SharedOutcomeOperation = {
  kind: 'shared_outcome',
  delivery: { kind: 'save', ability: 'wisdom', rollMode: 'normal' },
  onFailure: [
    damage(1, 6, 'Psychic', { cantripUpgrade: true }),
    effect({
      kind: 'attack_roll_mode_modifier',
      mode: 'disadvantage',
      appliesTo: { kind: 'next_attack_by_target' },
    }, 'target_end'),
  ],
  onSuccess: [],
};

const rayOfSickness: SharedOutcomeOperation = {
  kind: 'shared_outcome',
  delivery: { kind: 'attack', attackKind: 'ranged' },
  onHit: [
    damage(2, 8, 'Poison', { perSlotCount: 1 }),
    {
      kind: 'condition_lifecycle',
      condition: 'Poisoned',
      immunity: null,
      initialSave: null,
      repeatedSave: null,
      damageBreak: null,
      duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'source_end' },
      stacking: { kind: 'replace', sources: 'same_source' },
    },
  ],
  onMiss: [],
};

const singleTarget: SpellTargeting = { kind: 'single', rangeFeet: 150, willing: false };
const areaTargeting: SpellTargeting = {
  kind: 'area', rangeFeet: 0, shape: 'cube', baseSizeFeet: 15, sizePerSlotFeet: 0,
};

function started(
  pack: LoadedContentPack,
  caster: CombatantProfile,
  targets: readonly CombatantProfile[],
  positions?: readonly { readonly column: number; readonly row: number }[],
): EncounterState {
  const combatants = [caster, ...targets];
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: 12, rows: 6 },
    combatants,
    tokens: combatants.map((profile, index) => {
      const position = positions?.[index] ?? { column: index, row: 0 };
      return placedToken(profile, position.column, position.row);
    }),
    contentPacks: [pack],
  }), { type: 'roll_initiative' }, () => 0.5).state;
}

function command(
  caster: CombatantProfile,
  id: string,
  targets: readonly CombatantProfile[],
  area = false,
): SpellCastCommand {
  return {
    type: 'cast_spell',
    actor: caster.id,
    spellId: `greenforge:${id}`,
    slotLevel: null,
    castAsRitual: false,
    casterLevel: 1,
    attackBonus: 0,
    saveDc: 15,
    spellcastingModifier: 4,
    targets: area ? [] : targets.map((target) => target.id),
    area: area
      ? {
          shape: 'cube',
          template: {
            origin: feetPoint(2.5, 2.5),
            center: feetPoint(10, 10),
            axis: { x: 1, y: 0 },
            size: feet(15),
            includeOrigin: false,
          },
        }
      : null,
    weaponAttack: null,
    selectedOption: null,
  };
}

function hitPoints(state: EncounterState, profile: CombatantProfile): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === profile.id);
  if (subject === undefined) throw new Error(`Missing combatant ${profile.id}.`);
  return subject.hitPoints;
}

function sharedBranches(events: ReturnType<typeof reduceEncounter>['events']): readonly string[] {
  return events.flatMap((event) => event.type === 'shared_outcome_resolved' ? [event.branch] : []);
}

describe('D344.2 imported synchronized shared-outcome branches', () => {
  it('imports and executes all five sourced exemplar branch-tree shapes', () => {
    // Guiding Bolt: docs/srd/source/spell-descriptions.txt:4018-4025.
    // Ray of Sickness: docs/srd/source/spell-descriptions.txt:6463-6467.
    // Shocking Grasp: docs/srd/source/spell-descriptions.txt:7015-7024.
    // Thunderwave: docs/srd/source/spell-descriptions.txt:7876-7888.
    // Vicious Mockery: docs/srd/source/spell-descriptions.txt:8187-8195.
    const pack = packWithSpells([
      { id: 'shocking-grasp-shape', targeting: singleTarget, operation: shockingGrasp },
      { id: 'guiding-bolt-shape', targeting: singleTarget, operation: guidingBolt },
      { id: 'thunderwave-shape', targeting: areaTargeting, operation: thunderwave },
      { id: 'vicious-mockery-shape', targeting: singleTarget, operation: viciousMockery },
      { id: 'ray-of-sickness-shape', targeting: singleTarget, operation: rayOfSickness },
    ]);
    expect(pack.spells.map(({ definition }) => definition.operation.kind)).toEqual([
      'shared_outcome', 'shared_outcome', 'shared_outcome', 'shared_outcome', 'shared_outcome',
    ]);

    const cases = [
      { id: 'shocking-grasp-shape', expectedEffect: 'opportunity_attacks_disabled', rng: [0.55, 0], hitPoints: 19 },
      { id: 'guiding-bolt-shape', expectedEffect: 'attack_roll_mode_modifier', rng: [0.55, 0, 0, 0, 0], hitPoints: 16 },
      { id: 'ray-of-sickness-shape', expectedEffect: 'condition', rng: [0.55, 0, 0], hitPoints: 18 },
    ] as const;
    for (const [index, exemplar] of cases.entries()) {
      const caster = playerProfile(`attack-caster-${String(index)}`, { initiativeBonus: 20 });
      const target = monsterProfile(`attack-target-${String(index)}`, { initiativeBonus: -20, hitPoints: 20 });
      const rng = sequenceRng(exemplar.rng);
      const result = reduceEncounter(
        started(pack, caster, [target]), command(caster, exemplar.id, [target]), rng,
      );
      expect(sharedBranches(result.events)).toEqual(['hit']);
      expect(hitPoints(result.state, target)).toBe(exemplar.hitPoints);
      expect(result.state.effects.map(({ payload }) => payload.kind)).toContain(exemplar.expectedEffect);
      expect(rng.calls()).toBe(exemplar.rng.length);
    }

    const mockeryCaster = playerProfile('mockery-caster', { initiativeBonus: 20 });
    const mockeryTarget = monsterProfile('mockery-target', { initiativeBonus: -20, hitPoints: 20 });
    const mockery = reduceEncounter(
      started(pack, mockeryCaster, [mockeryTarget]),
      command(mockeryCaster, 'vicious-mockery-shape', [mockeryTarget]),
      sequenceRng([0.65, 0]),
    );
    expect(sharedBranches(mockery.events)).toEqual(['failure']);
    expect(hitPoints(mockery.state, mockeryTarget)).toBe(19);
    expect(mockery.state.effects.map(({ payload }) => payload.kind)).toContain('attack_roll_mode_modifier');

  });

  it('shared_outcome_boundaries: DC-1 fails, exact DC succeeds, and odd/even totals halve down', () => {
    // Existing engine rule: Math.floor(total / 2), src/combat/encounter.ts:5530-5532 before this change.
    const pack = packWithSpells([{ id: 'boundary-wave', targeting: singleTarget, operation: thunderwave }]);
    const caster = playerProfile('boundary-caster', { initiativeBonus: 20 });
    const target = monsterProfile('boundary-target', { initiativeBonus: -20, hitPoints: 20 });
    const failed = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'boundary-wave', [target]),
      sequenceRng([0.65, 0, 0.375]),
    );
    expect(sharedBranches(failed.events)).toEqual(['failure']);
    expect(hitPoints(failed.state, target)).toBe(15);

    const odd = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'boundary-wave', [target]),
      sequenceRng([0.7, 0, 0.375]),
    );
    expect(sharedBranches(odd.events)).toEqual(['success']);
    expect(hitPoints(odd.state, target)).toBe(18);

    const even = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'boundary-wave', [target]),
      sequenceRng([0.7, 0, 0.25]),
    );
    expect(sharedBranches(even.events)).toEqual(['success']);
    expect(hitPoints(even.state, target)).toBe(18);
  });

  it('branches_roll_separately: successful half damage uses one referenced odd roll and consumes no replacement roll', () => {
    const pack = packWithSpells([{ id: 'shared-half', targeting: singleTarget, operation: thunderwave }]);
    const caster = playerProfile('shared-half-caster', { initiativeBonus: 20 });
    const target = monsterProfile('shared-half-target', { initiativeBonus: -20, hitPoints: 20 });
    const rng = sequenceRng([0.7, 0, 0.375]);
    const result = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'shared-half', [target]), rng,
    );
    expect(hitPoints(result.state, target)).toBe(18);
    expect(rng.calls()).toBe(3);
  });

  it('shared damage reference uses the selected failure-branch operation index', () => {
    const indexedReference: SharedOutcomeOperation = {
      kind: 'shared_outcome',
      delivery: { kind: 'save', ability: 'constitution', rollMode: 'normal' },
      onFailure: [
        damage(1, 6, 'Thunder'),
        damage(1, 8, 'Lightning'),
      ],
      onSuccess: [{
        kind: 'shared_outcome_damage_reference',
        source: { branch: 'failure', operationIndex: 1 },
        transform: 'half_round_down',
      }],
    };
    const pack = packWithSpells([{
      id: 'indexed-reference', targeting: singleTarget, operation: indexedReference,
    }]);
    const caster = playerProfile('indexed-reference-caster', { initiativeBonus: 20 });
    const target = monsterProfile('indexed-reference-target', { initiativeBonus: -20, hitPoints: 20 });
    const result = reduceEncounter(
      started(pack, caster, [target]),
      command(caster, 'indexed-reference', [target]),
      sequenceRng([0.7, 0.75]),
    );

    expect(sharedBranches(result.events)).toEqual(['success']);
    expect(hitPoints(result.state, target)).toBe(17);
  });

  it('branch_leaks: two area targets take divergent branches and successful Thunderwave neither pushes nor takes full damage', () => {
    const pack = packWithSpells([{ id: 'area-wave', targeting: areaTargeting, operation: thunderwave }]);
    const caster = playerProfile('area-caster', { initiativeBonus: 20 });
    const failedTarget = monsterProfile('area-failure', { initiativeBonus: -20, hitPoints: 20 });
    const successfulTarget = monsterProfile('area-success', { initiativeBonus: -21, hitPoints: 20 });
    const result = reduceEncounter(
      started(pack, caster, [failedTarget, successfulTarget], [
        { column: 0, row: 0 }, { column: 1, row: 0 }, { column: 1, row: 1 },
      ]),
      command(caster, 'area-wave', [], true),
      sequenceRng([0.7, 0, 0.375, 0.65, 0, 0.375, 0.7, 0, 0.375]),
    );
    expect(result.events.flatMap((event) =>
      event.type === 'shared_outcome_resolved' && event.target !== caster.id ? [event.branch] : [],
    )).toEqual(['failure', 'success']);
    expect([hitPoints(result.state, failedTarget), hitPoints(result.state, successfulTarget)]).toEqual([15, 18]);
    const failedPosition = result.state.tokens.find(({ combatantId }) => combatantId === failedTarget.id)?.position;
    const successfulPosition = result.state.tokens.find(({ combatantId }) => combatantId === successfulTarget.id)?.position;
    expect(failedPosition).toEqual({ column: 3, row: 0 });
    expect(successfulPosition).toEqual({ column: 1, row: 1 });
  });

  it('one_roll_per_cast_violated: damage and push share one save while branch dice follow it in declaration order', () => {
    const pack = packWithSpells([{ id: 'one-save-wave', targeting: singleTarget, operation: thunderwave }]);
    const caster = playerProfile('one-save-caster', { initiativeBonus: 20 });
    const target = monsterProfile('one-save-target', { initiativeBonus: -20, hitPoints: 20 });
    const rng = sequenceRng([0.65, 0, 0.375]);
    const result = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'one-save-wave', [target]), rng,
    );
    expect(result.events.filter(({ type }) => type === 'save_resolved')).toHaveLength(1);
    expect(sharedBranches(result.events)).toEqual(['failure']);
    expect(hitPoints(result.state, target)).toBe(15);
    expect(rng.calls()).toBe(3);
  });

  it('miss_success_empty: attack miss and exact-DC save execute empty branches without damage or effects', () => {
    const pack = packWithSpells([
      { id: 'empty-miss', targeting: singleTarget, operation: shockingGrasp },
      { id: 'empty-success', targeting: singleTarget, operation: viciousMockery },
    ]);
    const caster = playerProfile('empty-caster', { initiativeBonus: 20 });
    const target = monsterProfile('empty-target', { initiativeBonus: -20, hitPoints: 20 });
    const miss = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'empty-miss', [target]), sequenceRng([0.5]),
    );
    expect(sharedBranches(miss.events)).toEqual(['miss']);
    expect(hitPoints(miss.state, target)).toBe(20);
    expect(miss.state.effects).toEqual([]);

    const success = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'empty-success', [target]), sequenceRng([0.7]),
    );
    expect(sharedBranches(success.events)).toEqual(['success']);
    expect(hitPoints(success.state, target)).toBe(20);
    expect(success.state.effects).toEqual([]);
  });

  it('nested_shared_outcome_accepted: import rejects shared_outcome anywhere inside a branch and retains a healthy record', () => {
    const nested = {
      ...shockingGrasp,
      onHit: [shockingGrasp],
    };
    const result = loadContentPack(fixtureWithSpells([
      { id: 'nested-shared', targeting: singleTarget, operation: nested },
      { id: 'healthy-shared', targeting: singleTarget, operation: shockingGrasp },
    ]));
    expect(result.status).toBe('loaded');
    if (result.status !== 'loaded') throw new Error('Nested shared-outcome pack was refused wholesale.');
    expect(result.content.diagnostics).toContainEqual(expect.objectContaining({
      reason: 'malformed_record', recordId: 'nested-shared', operationKind: 'shared_outcome',
    }));
    expect(result.content.spells.map(({ recordId }) => recordId)).toEqual(['healthy-shared']);
  });

  it('Ray of Sickness condition lifecycle binds expiry to the source next-turn boundary', () => {
    const pack = packWithSpells([{ id: 'ray-lifecycle', targeting: singleTarget, operation: rayOfSickness }]);
    const caster = playerProfile('ray-caster', { initiativeBonus: 20 });
    const target = monsterProfile('ray-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = reduceEncounter(
      started(pack, caster, [target]), command(caster, 'ray-lifecycle', [target]), sequenceRng([0.55, 0, 0]),
    ).state;
    expect(combatantConditions(state, target.id)).toContainEqual({ name: 'Poisoned' });
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0.5).state;
    expect(combatantConditions(state, target.id)).toContainEqual({ name: 'Poisoned' });
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    expect(combatantConditions(state, target.id)).not.toContainEqual({ name: 'Poisoned' });
  });
});
