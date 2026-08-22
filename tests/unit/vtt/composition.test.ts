import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { mulberry32, type Rng } from '../../../src/combat/random';
import {
  COMPOSITION_EVALUATION_ORDER,
  COMPOSITION_REFUSAL_PROPAGATION,
  COMPOSITION_STATE_VISIBILITY,
  COMPOSITION_TARGET_RESOLUTION,
  MAX_COMPOSITION_DEPTH,
  type CompositionOperation,
  type CompositionStep,
  type ConditionLifecycleOperation,
  type SpellOperation,
} from '../../../src/combat/spells/types';
import { armorClass, damageType } from '../../../src/combat/values';
import { loadContentPack, type ContentPackLoadResult, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SpellSpec {
  readonly id: string;
  readonly operation: SpellOperation;
}

const inherited = { kind: 'inherit' } as const;

function fixtureWithSpells(specs: readonly { readonly id: string; readonly operation: unknown }[]): unknown {
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
      duration: { kind: 'instantaneous' },
      targeting: { kind: 'single', rangeFeet: 150, willing: true },
      operation: spec.operation,
    })),
  };
}

function packWithSpells(specs: readonly SpellSpec[]): LoadedContentPack {
  const loaded = loadContentPack(fixtureWithSpells(specs));
  if (loaded.status !== 'loaded') throw new Error(`Composition fixture refused: ${loaded.refusal.reason}`);
  return loaded.content;
}

function step(operation: SpellOperation, targetResolution: CompositionStep['targetResolution'] = inherited): CompositionStep {
  return { targetResolution, operation };
}

function composition(
  steps: readonly [CompositionStep, ...CompositionStep[]],
  onRefusal: CompositionOperation['onRefusal'] = 'abort',
): CompositionOperation {
  return { kind: 'composition', ordering: 'declaration_order', onRefusal, steps };
}

function explicitComposition(
  steps: readonly [CompositionStep, ...CompositionStep[]],
  order: readonly number[],
  onRefusal: CompositionOperation['onRefusal'] = 'abort',
): CompositionOperation {
  return { kind: 'composition', ordering: 'explicit', order, onRefusal, steps };
}

function fixedDamage(amount: number, diceCount = 0): SpellOperation {
  return {
    kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: damageType('Force') },
      dice: {
        baseCount: diceCount, sides: 4, modifier: amount,
        perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
      },
      scaling: { kind: 'none' }, thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

function condition(): ConditionLifecycleOperation {
  return {
    kind: 'condition_lifecycle', condition: 'Frightened', immunity: null,
    initialSave: null, repeatedSave: null, damageBreak: null,
    duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' },
    stacking: { kind: 'coexist' },
  };
}

function armorClassModifier(): SpellOperation {
  return {
    kind: 'armor_class_modifier', modification: { kind: 'bonus', amount: 2 },
    duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' },
  };
}

function vulnerability(): SpellOperation {
  return {
    kind: 'damage_response_modifier', damageType: damageType('Force'), response: 'vulnerable',
    duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' },
  };
}

function speedModifier(): SpellOperation {
  return {
    kind: 'speed_modification', modification: { kind: 'increase', feet: 5 },
    durationRounds: 2, concentration: false, expiresAt: 'target_end',
  };
}

function worldObject(): SpellOperation {
  return {
    kind: 'world_operations',
    operations: [{
      kind: 'create_object', placement: 'caster_cell', footprintOffsets: [{ column: 0, row: 0 }],
      object: {
        name: 'Composition marker', kind: 'generic', durability: { kind: 'indestructible' },
        armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' },
      },
    }],
  };
}

function started(pack: LoadedContentPack, combatants: readonly CombatantProfile[], rng: Rng = () => 0): EncounterState {
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' }, bounds: { columns: 12, rows: 2 },
    combatants, tokens: combatants.map((profile, index) => placedToken(profile, index)),
    contentPacks: [pack],
  }), { type: 'roll_initiative' }, rng).state;
}

function cast(
  state: EncounterState,
  actor: CombatantProfile,
  target: CombatantProfile,
  spellId: string,
  rng: Rng = () => 0,
) {
  return reduceEncounter(state, {
    type: 'cast_spell', actor: actor.id, spellId: `greenforge:${spellId}`, slotLevel: null,
    castAsRitual: false, casterLevel: 5, attackBonus: 8, saveDc: 15,
    spellcastingModifier: 4, targets: [target.id], area: null, weaponAttack: null,
    selectedOption: null,
  }, rng);
}

function hitPoints(state: EncounterState, subject: CombatantProfile): number {
  const found = state.combatants.find((candidate) => candidate.profile.id === subject.id);
  if (found === undefined) throw new Error(`Missing combatant ${subject.id}.`);
  return found.hitPoints;
}

function nestedComposition(depth: number, rolled = false): SpellOperation {
  const own = step(fixedDamage(1, rolled ? 1 : 0));
  return depth === 1
    ? composition([own])
    : composition([own, step(nestedComposition(depth - 1, rolled))]);
}

describe('D333.1 imported recursive operation composition', () => {
  it('composition_semantics_constants declare every non-SRD operator decision', () => {
    expect(COMPOSITION_EVALUATION_ORDER).toBe('declared_ordering');
    expect(COMPOSITION_REFUSAL_PROPAGATION).toEqual(['abort', 'continue']);
    expect(COMPOSITION_STATE_VISIBILITY).toBe('live_prior_step_state');
    expect(COMPOSITION_TARGET_RESOLUTION).toEqual(['inherit', 're_resolve']);
    expect(MAX_COMPOSITION_DEPTH).toBe(4);
  });

  it('composition_boundaries: one step and explicit index zero load while zero steps and index negative one refuse', () => {
    const oneStep = composition([step(fixedDamage(1))]);
    const indexZero = explicitComposition([step(fixedDamage(1))], [0]);
    expect(loadContentPack(fixtureWithSpells([{ id: 'one-step', operation: oneStep }])).status).toBe('loaded');
    expect(loadContentPack(fixtureWithSpells([{ id: 'index-zero', operation: indexZero }])).status).toBe('loaded');

    const zeroSteps = { kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort', steps: [] };
    const negativeIndex = { ...indexZero, order: [-1] };
    const upperIndex = {
      kind: 'composition', ordering: 'explicit', onRefusal: 'abort',
      steps: [step(fixedDamage(1)), step(fixedDamage(1))], order: [0, 2],
    };
    expect(loadContentPack(fixtureWithSpells([{ id: 'zero-steps', operation: zeroSteps }]))).toMatchObject({
      status: 'refused', refusal: { reason: 'malformed_record' },
    });
    expect(loadContentPack(fixtureWithSpells([{ id: 'negative-index', operation: negativeIndex }]))).toMatchObject({
      status: 'refused', refusal: { reason: 'malformed_record' },
    });
    expect(loadContentPack(fixtureWithSpells([{ id: 'upper-index', operation: upperIndex }]))).toMatchObject({
      status: 'refused', refusal: { reason: 'malformed_record' },
    });
  });

  it('depth_limit_off_by_one: depth four loads and depth five has a typed import refusal', () => {
    expect(loadContentPack(fixtureWithSpells([{ id: 'depth-four', operation: nestedComposition(4) }])).status).toBe('loaded');
    expect(loadContentPack(fixtureWithSpells([{ id: 'depth-five', operation: nestedComposition(5) }]))).toEqual({
      status: 'refused',
      refusal: {
        kind: 'content_pack_refusal', reason: 'composition_depth_exceeded',
        maximumDepth: 4, receivedDepth: 5,
      },
    });
  });

  it('composition_order_ignored and state_not_visible_between_steps: explicit opposite orders produce six versus three damage', () => {
    // Ray of Frost couples damage and a speed change (spell-descriptions.txt:6437-6443),
    // but the SRD does not define a generic imported-operation execution order.
    const steps = [step(vulnerability()), step(fixedDamage(3))] as const;
    const pack = packWithSpells([
      { id: 'vulnerability-first', operation: explicitComposition(steps, [0, 1]) },
      { id: 'damage-first', operation: explicitComposition(steps, [1, 0]) },
    ]);
    const caster = playerProfile('order-caster', { initiativeBonus: 20 });
    const target = monsterProfile('order-target', { initiativeBonus: -20, hitPoints: 20 });
    const first = cast(started(pack, [caster, target]), caster, target, 'vulnerability-first');
    const reversed = cast(started(pack, [caster, target]), caster, target, 'damage-first');
    expect(hitPoints(first.state, target)).toBe(14);
    expect(hitPoints(reversed.state, target)).toBe(17);
  });

  it('inner_refusal_swallowed: the same immune step atomically aborts or continues according to the pack', () => {
    // Heroism establishes Frightened immunity (spell-descriptions.txt:4257-4262);
    // the SRD does not specify generic composition refusal propagation.
    const immuneCondition = condition();
    const steps = [step(fixedDamage(1)), step(immuneCondition), step(fixedDamage(3))] as const;
    const pack = packWithSpells([
      { id: 'abort-refusal', operation: composition(steps, 'abort') },
      { id: 'continue-refusal', operation: composition(steps, 'continue') },
    ]);
    const caster = playerProfile('refusal-caster', { initiativeBonus: 20 });
    const target = monsterProfile('refusal-target', {
      initiativeBonus: -20, hitPoints: 20, conditionImmunities: ['Frightened'],
    });
    const aborted = cast(started(pack, [caster, target]), caster, target, 'abort-refusal');
    const continued = cast(started(pack, [caster, target]), caster, target, 'continue-refusal');
    expect(hitPoints(aborted.state, target)).toBe(20);
    expect(hitPoints(continued.state, target)).toBe(16);
    expect(aborted.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_refused', stepIndex: 1, propagation: 'abort', reason: 'operation_refused',
    }));
    expect(continued.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_refused', stepIndex: 1, propagation: 'continue', reason: 'operation_refused',
    }));
  });

  it('refusal_classification distinguishes zero damage from an illegal destination and continues after both', () => {
    const teleport: SpellOperation = {
      kind: 'teleport', subject: 'targets', maximumDistanceFeet: 30,
      destination: { requireUnoccupied: true, requireOccupiable: true, requireLineOfSight: false },
    };
    const pack = packWithSpells([
      { id: 'zero-then-damage', operation: composition([step(fixedDamage(0)), step(fixedDamage(2))], 'continue') },
      { id: 'illegal-then-damage', operation: composition([step(teleport), step(fixedDamage(2))], 'continue') },
    ]);
    const caster = playerProfile('classification-caster', { initiativeBonus: 20 });
    const target = monsterProfile('classification-target', { initiativeBonus: -20, hitPoints: 20 });
    const zero = cast(started(pack, [caster, target]), caster, target, 'zero-then-damage');
    const illegal = cast(started(pack, [caster, target]), caster, target, 'illegal-then-damage');
    expect(hitPoints(zero.state, target)).toBe(18);
    expect(hitPoints(illegal.state, target)).toBe(18);
    expect(zero.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_refused', stepIndex: 0, reason: 'operation_refused', propagation: 'continue',
    }));
    expect(illegal.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_refused', stepIndex: 0, reason: 'encounter_rule_refusal', propagation: 'continue',
    }));
  });

  it('targets_not_reresolved: inherited and caster re-resolution damage observably different target sets', () => {
    const pack = packWithSpells([
      { id: 'inherit-target', operation: composition([step(fixedDamage(3))]) },
      {
        id: 'reresolve-caster',
        operation: composition([step(fixedDamage(3), { kind: 're_resolve', selector: { kind: 'caster' } })]),
      },
    ]);
    const caster = playerProfile('target-resolution-caster', { initiativeBonus: 20, hitPoints: 20 });
    const target = monsterProfile('target-resolution-target', { initiativeBonus: -20, hitPoints: 20 });
    const inheritedResult = cast(started(pack, [caster, target]), caster, target, 'inherit-target');
    const resolvedResult = cast(started(pack, [caster, target]), caster, target, 'reresolve-caster');
    expect([hitPoints(inheritedResult.state, caster), hitPoints(inheritedResult.state, target)]).toEqual([20, 17]);
    expect([hitPoints(resolvedResult.state, caster), hitPoints(resolvedResult.state, target)]).toEqual([17, 20]);
  });

  it('depth_two_three_four_are_distinguishable and depth-four seeded rolls are byte-identical', () => {
    const pack = packWithSpells([
      { id: 'depth-two', operation: nestedComposition(2) },
      { id: 'depth-three', operation: nestedComposition(3) },
      { id: 'depth-four', operation: nestedComposition(4) },
      { id: 'depth-four-rolled', operation: nestedComposition(4, true) },
    ]);
    const caster = playerProfile('depth-caster', { initiativeBonus: 20 });
    const target = monsterProfile('depth-target', { initiativeBonus: -20, hitPoints: 40 });
    const remaining = (id: string) => hitPoints(cast(started(pack, [caster, target]), caster, target, id).state, target);
    expect([remaining('depth-two'), remaining('depth-three'), remaining('depth-four')]).toEqual([38, 37, 36]);

    const run = () => {
      const rng = mulberry32(0x3331);
      const result = cast(started(pack, [caster, target], rng), caster, target, 'depth-four-rolled', rng);
      return canonicalJson({ state: result.state, events: result.events, rng: rng.snapshot() });
    };
    expect(run()).toBe(run());
  });

  const pairingCases: readonly {
    readonly name: string;
    readonly left: SpellOperation;
    readonly right: SpellOperation;
    readonly expected: readonly string[];
  }[] = [
    { name: 'damage + world/environment state', left: fixedDamage(2), right: worldObject(), expected: ['damage', 'world'] },
    { name: 'condition/control + damage', left: condition(), right: fixedDamage(2), expected: ['condition', 'damage'] },
    { name: 'damage + roll/defense modifier', left: fixedDamage(2), right: armorClassModifier(), expected: ['damage', 'roll'] },
    { name: 'damage + movement/teleportation', left: fixedDamage(2), right: speedModifier(), expected: ['damage', 'movement'] },
    { name: 'condition/control + world/environment', left: condition(), right: worldObject(), expected: ['condition', 'world'] },
    { name: 'condition/control + roll/defense modifier', left: condition(), right: armorClassModifier(), expected: ['condition', 'roll'] },
    { name: 'roll/defense modifier + world/environment', left: armorClassModifier(), right: worldObject(), expected: ['roll', 'world'] },
    { name: 'movement/teleportation + roll/defense', left: speedModifier(), right: armorClassModifier(), expected: ['movement', 'roll'] },
    { name: 'movement/teleportation + world/environment', left: speedModifier(), right: worldObject(), expected: ['movement', 'world'] },
  ];

  it.each(pairingCases)('pairing $name executes both existing capability arms through one imported composition', ({ name, left, right, expected }) => {
    const id = `pair-${pairingCases.findIndex((candidate) => candidate.name === name)}`;
    const pack = packWithSpells([{ id, operation: composition([step(left), step(right)]) }]);
    const caster = playerProfile(`${id}-caster`, { initiativeBonus: 20 });
    const target = monsterProfile(`${id}-target`, { initiativeBonus: -20, hitPoints: 20 });
    const result = cast(started(pack, [caster, target]), caster, target, id);
    if (expected.includes('damage')) expect(hitPoints(result.state, target)).toBe(18);
    if (expected.includes('world')) expect(result.state.worldObjects).toHaveLength(1);
    if (expected.includes('condition')) {
      expect(result.state.effects.some((effect) => effect.payload.kind === 'condition')).toBe(true);
    }
    if (expected.includes('roll')) {
      expect(result.state.effects.some((effect) => effect.payload.kind === 'armor_class_modifier')).toBe(true);
    }
    if (expected.includes('movement')) {
      expect(result.state.effects.some((effect) => effect.payload.kind === 'movement_modifier')).toBe(true);
    }
  });

  it('nested_unknown_operation retains the typed unknown-kind refusal instead of degrading to malformed', () => {
    const result: ContentPackLoadResult = loadContentPack(fixtureWithSpells([{
      id: 'unknown-inner',
      operation: {
        kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort',
        steps: [{ targetResolution: inherited, operation: { kind: 'plausible_wrong_default' } }],
      },
    }]));
    expect(result).toMatchObject({
      status: 'refused', refusal: { reason: 'unknown_operation_kind', operationKind: 'plausible_wrong_default' },
    });
  });
});
