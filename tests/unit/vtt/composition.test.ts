import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { mulberry32, type Rng } from '../../../src/combat/random';
import {
  COMPOSITION_EVALUATION_ORDER,
  COMPOSITION_REFUSAL_PROPAGATION,
  COMPOSITION_STATE_VISIBILITY,
  COMPOSITION_TARGET_RESOLUTION,
  type CompositionOperation,
  type CompositionStep,
  type ConditionLifecycleOperation,
  type NonCompositionSpellOperation,
  type SpellOperation,
} from '../../../src/combat/spells/types';
import { armorClass, damageType } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
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
      ...template, recordId: spec.id, name: spec.id, level: 0,
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

function step(
  operation: NonCompositionSpellOperation,
  targetResolution: CompositionStep['targetResolution'] = inherited,
): CompositionStep {
  return { targetResolution, operation };
}

function composition(
  steps: readonly [CompositionStep, CompositionStep],
  onRefusal: CompositionOperation['onRefusal'] = 'abort',
): CompositionOperation {
  return { kind: 'composition', ordering: 'declaration_order', onRefusal, steps };
}

function explicitComposition(
  steps: readonly [CompositionStep, CompositionStep],
  order: readonly [0, 1] | readonly [1, 0],
  onRefusal: CompositionOperation['onRefusal'] = 'abort',
): CompositionOperation {
  return { kind: 'composition', ordering: 'explicit', order, onRefusal, steps };
}

function fixedDamage(amount: number, diceCount = 0): NonCompositionSpellOperation {
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

function condition(initialSave: ConditionLifecycleOperation['initialSave'] = null): ConditionLifecycleOperation {
  return {
    kind: 'condition_lifecycle', condition: 'Frightened', immunity: null,
    initialSave, repeatedSave: null, damageBreak: null,
    duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' },
    stacking: { kind: 'coexist' },
  };
}

function armorClassModifier(): NonCompositionSpellOperation {
  return {
    kind: 'armor_class_modifier', modification: { kind: 'bonus', amount: 2 },
    duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' },
  };
}

function vulnerability(): NonCompositionSpellOperation {
  return {
    kind: 'damage_response_modifier', damageType: damageType('Force'), response: 'vulnerable',
    duration: { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' },
  };
}

function speedModifier(): NonCompositionSpellOperation {
  return {
    kind: 'speed_modification', modification: { kind: 'increase', feet: 5 },
    durationRounds: 2, concentration: false, expiresAt: 'target_end',
  };
}

function worldObject(): NonCompositionSpellOperation {
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

function effectKinds(state: EncounterState): readonly string[] {
  return state.effects.map((effect) => effect.payload.kind);
}

describe('D335 imported pairwise operation composition', () => {
  it('pairwise_semantics_constants retain every applicable declared non-SRD operator decision', () => {
    expect(COMPOSITION_EVALUATION_ORDER).toBe('declared_ordering');
    expect(COMPOSITION_REFUSAL_PROPAGATION).toEqual(['abort', 'continue']);
    expect(COMPOSITION_STATE_VISIBILITY).toBe('live_prior_step_state');
    expect(COMPOSITION_TARGET_RESOLUTION).toEqual(['inherit', 're_resolve']);
  });

  it('pairwise_boundaries: exactly two steps and both permutations load while one, three, negative one, and index two refuse', () => {
    const pair = [step(fixedDamage(1)), step(fixedDamage(2))] as const;
    for (const operation of [composition(pair), explicitComposition(pair, [0, 1]), explicitComposition(pair, [1, 0])]) {
      expect(loadContentPack(fixtureWithSpells([{ id: 'valid-pair', operation }])).status).toBe('loaded');
    }
    const invalid = [
      { kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort', steps: [pair[0]] },
      { kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort', steps: [...pair, pair[0]] },
      { kind: 'composition', ordering: 'explicit', onRefusal: 'abort', steps: pair, order: [-1, 0] },
      { kind: 'composition', ordering: 'explicit', onRefusal: 'abort', steps: pair, order: [0, 2] },
    ];
    for (const [index, operation] of invalid.entries()) {
      expect(loadContentPack(fixtureWithSpells([{ id: `invalid-${String(index)}`, operation }]))).toMatchObject({
        status: 'refused', refusal: { reason: 'malformed_record' },
      });
    }
  });

  const pairingCases: readonly {
    readonly name: string;
    readonly left: NonCompositionSpellOperation;
    readonly right: NonCompositionSpellOperation;
    readonly expected: readonly string[];
  }[] = [
    { name: 'damage + world/environment state (measured 39)', left: fixedDamage(2), right: worldObject(), expected: ['damage', 'world'] },
    { name: 'condition/control + damage (measured 30)', left: condition(), right: fixedDamage(2), expected: ['condition', 'damage'] },
    { name: 'damage + roll/defense modifier (measured 25)', left: fixedDamage(2), right: armorClassModifier(), expected: ['damage', 'roll'] },
    { name: 'damage + movement/teleportation (measured 19)', left: fixedDamage(2), right: speedModifier(), expected: ['damage', 'movement'] },
    { name: 'condition/control + world/environment', left: condition(), right: worldObject(), expected: ['condition', 'world'] },
    { name: 'condition/control + roll/defense modifier', left: condition(), right: armorClassModifier(), expected: ['condition', 'roll'] },
    { name: 'roll/defense modifier + world/environment', left: armorClassModifier(), right: worldObject(), expected: ['roll', 'world'] },
    { name: 'movement/teleportation + roll/defense', left: speedModifier(), right: armorClassModifier(), expected: ['movement', 'roll'] },
    { name: 'movement/teleportation + world/environment', left: speedModifier(), right: worldObject(), expected: ['movement', 'world'] },
  ];
  const orders = [
    { name: 'forward', value: [0, 1] as const },
    { name: 'reverse', value: [1, 0] as const },
  ];
  const propagations = ['abort', 'continue'] as const;
  const matrix = pairingCases.flatMap((pairing) => orders.flatMap((order) =>
    propagations.map((propagation) => ({ pairing, order, propagation }))));

  it.each(matrix)(
    'pairwise matrix: $pairing.name / $order.name / $propagation executes through an imported pack',
    ({ pairing, order, propagation }) => {
      const index = matrix.findIndex((candidate) => candidate.pairing.name === pairing.name &&
        candidate.order.name === order.name && candidate.propagation === propagation);
      const id = `matrix-${String(index)}`;
      const pack = packWithSpells([{
        id, operation: explicitComposition([step(pairing.left), step(pairing.right)], order.value, propagation),
      }]);
      const caster = playerProfile(`${id}-caster`, { initiativeBonus: 20 });
      const target = monsterProfile(`${id}-target`, { initiativeBonus: -20, hitPoints: 20 });
      const result = cast(started(pack, [caster, target]), caster, target, id);
      if (pairing.expected.includes('damage')) expect(hitPoints(result.state, target)).toBe(18);
      if (pairing.expected.includes('world')) expect(result.state.worldObjects).toHaveLength(1);
      if (pairing.expected.includes('condition')) expect(effectKinds(result.state)).toContain('condition');
      if (pairing.expected.includes('roll')) {
        const speedReplacesEarlierSameSpellModifier = pairing.expected.includes('movement') && order.name === 'reverse';
        if (speedReplacesEarlierSameSpellModifier) {
          expect(effectKinds(result.state)).not.toContain('armor_class_modifier');
        } else {
          expect(effectKinds(result.state)).toContain('armor_class_modifier');
        }
      }
      if (pairing.expected.includes('movement')) expect(effectKinds(result.state)).toContain('movement_modifier');
      expect(result.events.filter((event) => event.type === 'composition_step_resolved').map((event) => event.outcome))
        .toEqual(['applied', 'applied']);
    },
  );

  it('composition_order_ignored and state_not_visible_between_steps: opposite orders deal six versus three damage', () => {
    // Ray of Frost couples damage and speed change; generic pair order remains engine-declared.
    // docs/srd/source/spell-descriptions.txt:6437-6443.
    const pair = [step(vulnerability()), step(fixedDamage(3))] as const;
    const pack = packWithSpells([
      { id: 'vulnerability-first', operation: explicitComposition(pair, [0, 1]) },
      { id: 'damage-first', operation: explicitComposition(pair, [1, 0]) },
    ]);
    const caster = playerProfile('order-caster', { initiativeBonus: 20 });
    const target = monsterProfile('order-target', { initiativeBonus: -20, hitPoints: 20 });
    expect(hitPoints(cast(started(pack, [caster, target]), caster, target, 'vulnerability-first').state, target)).toBe(14);
    expect(hitPoints(cast(started(pack, [caster, target]), caster, target, 'damage-first').state, target)).toBe(17);
  });

  it('refusal_propagation_ignored: the same refused second slot atomically aborts or continues according to the pack', () => {
    // Heroism establishes Frightened immunity; generic propagation is engine-declared.
    // docs/srd/source/spell-descriptions.txt:4257-4262.
    const pair = [step(fixedDamage(3)), step(condition())] as const;
    const pack = packWithSpells([
      { id: 'abort-refusal', operation: composition(pair, 'abort') },
      { id: 'continue-refusal', operation: composition(pair, 'continue') },
    ]);
    const caster = playerProfile('refusal-caster', { initiativeBonus: 20 });
    const target = monsterProfile('refusal-target', {
      initiativeBonus: -20, hitPoints: 20, conditionImmunities: ['Frightened'],
    });
    const aborted = cast(started(pack, [caster, target]), caster, target, 'abort-refusal');
    const continued = cast(started(pack, [caster, target]), caster, target, 'continue-refusal');
    expect(hitPoints(aborted.state, target)).toBe(20);
    expect(hitPoints(continued.state, target)).toBe(17);
    expect(aborted.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_resolved', stepIndex: 1, outcome: 'refused', propagation: 'abort',
    }));
    expect(continued.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_resolved', stepIndex: 1, outcome: 'refused', propagation: 'continue',
    }));
  });

  it('save_success_treated_as_refusal: successful initial save is applied and preserves prior damage under abort', () => {
    const savedCondition = condition({ ability: 'wisdom', rollMode: 'normal', applyOn: 'failure' });
    const pack = packWithSpells([{
      id: 'measured-save', operation: composition([step(fixedDamage(3)), step(savedCondition)], 'abort'),
    }]);
    const caster = playerProfile('save-caster', { initiativeBonus: 20 });
    const target = monsterProfile('save-target', { initiativeBonus: -20, hitPoints: 20 });
    const result = cast(started(pack, [caster, target], () => 0.999), caster, target, 'measured-save', () => 0.999);
    expect(hitPoints(result.state, target)).toBe(17);
    expect(effectKinds(result.state)).not.toContain('condition');
    expect(result.events.filter((event) => event.type === 'composition_step_resolved').map((event) => event.outcome))
      .toEqual(['applied', 'applied']);
  });

  it('abort_leaks_rng: an aborted rolled pair restores the seeded stream before every subsequent draw', () => {
    const composedPack = packWithSpells([{
      id: 'rolled-abort', operation: composition([step(fixedDamage(0, 1)), step(condition())], 'abort'),
    }]);
    const omittedPack = packWithSpells([]);
    const caster = playerProfile('rng-caster', { initiativeBonus: 20 });
    const target = monsterProfile('rng-target', {
      initiativeBonus: -20, hitPoints: 20, conditionImmunities: ['Frightened'],
    });
    const withAbort = mulberry32(0xd335);
    const withoutComposition = mulberry32(0xd335);
    const abortedStart = started(composedPack, [caster, target], withAbort);
    started(omittedPack, [caster, target], withoutComposition);
    cast(abortedStart, caster, target, 'rolled-abort', withAbort);
    expect(withAbort.snapshot()).toEqual(withoutComposition.snapshot());
    expect(Array.from({ length: 8 }, () => withAbort())).toEqual(
      Array.from({ length: 8 }, () => withoutComposition()),
    );
  });

  it('outcome_inferred_from_delta: no_op and refused remain observably distinct while continue reaches slot two', () => {
    const pack = packWithSpells([
      { id: 'no-op', operation: composition([step(fixedDamage(0)), step(fixedDamage(2))], 'continue') },
      { id: 'refused', operation: composition([step(condition()), step(fixedDamage(2))], 'continue') },
    ]);
    const caster = playerProfile('outcome-caster', { initiativeBonus: 20 });
    const target = monsterProfile('outcome-target', {
      initiativeBonus: -20, hitPoints: 20, conditionImmunities: ['Frightened'],
    });
    const noOp = cast(started(pack, [caster, target]), caster, target, 'no-op');
    const refused = cast(started(pack, [caster, target]), caster, target, 'refused');
    expect(hitPoints(noOp.state, target)).toBe(18);
    expect(hitPoints(refused.state, target)).toBe(18);
    expect(noOp.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_resolved', stepIndex: 0, outcome: 'no_op', propagation: 'continue',
    }));
    expect(refused.events).toContainEqual(expect.objectContaining({
      type: 'composition_step_resolved', stepIndex: 0, outcome: 'refused', propagation: 'continue',
    }));
  });

  it('targets_not_reresolved: inherited and caster selectors damage observably different target sets', () => {
    const pack = packWithSpells([
      { id: 'both-inherit', operation: composition([step(fixedDamage(3)), step(fixedDamage(2))]) },
      {
        id: 'second-caster',
        operation: composition([
          step(fixedDamage(3)),
          step(fixedDamage(2), { kind: 're_resolve', selector: { kind: 'caster' } }),
        ]),
      },
    ]);
    const caster = playerProfile('target-caster', { initiativeBonus: 20, hitPoints: 20 });
    const target = monsterProfile('target-target', { initiativeBonus: -20, hitPoints: 20 });
    const inheritedResult = cast(started(pack, [caster, target]), caster, target, 'both-inherit');
    const resolvedResult = cast(started(pack, [caster, target]), caster, target, 'second-caster');
    expect([hitPoints(inheritedResult.state, caster), hitPoints(inheritedResult.state, target)]).toEqual([20, 15]);
    expect([hitPoints(resolvedResult.state, caster), hitPoints(resolvedResult.state, target)]).toEqual([18, 17]);
  });

  it('nested_composition_accepted: imported nesting has a typed refusal before schema parsing', () => {
    const inner = composition([step(fixedDamage(1)), step(fixedDamage(2))]);
    const nested = {
      kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort',
      steps: [
        { targetResolution: inherited, operation: inner },
        { targetResolution: inherited, operation: fixedDamage(3) },
      ],
    };
    expect(loadContentPack(fixtureWithSpells([{ id: 'nested', operation: nested }]))).toEqual({
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'nested_composition' },
    });
  });

  it('nested_unknown_operation retains unknown-kind precedence over pair schema refusal', () => {
    expect(loadContentPack(fixtureWithSpells([{
      id: 'unknown-inner',
      operation: {
        kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort',
        steps: [
          { targetResolution: inherited, operation: { kind: 'plausible_wrong_default' } },
          { targetResolution: inherited, operation: fixedDamage(1) },
        ],
      },
    }]))).toMatchObject({
      status: 'refused', refusal: { reason: 'unknown_operation_kind', operationKind: 'plausible_wrong_default' },
    });
  });
});
