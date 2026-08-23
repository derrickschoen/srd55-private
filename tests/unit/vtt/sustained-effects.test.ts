import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  SustainedActivationRuleError,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import {
  SUSTAINED_ACTION_NORMALIZATION,
  type NonCompositionSpellOperation,
  type SpellOperation,
  type SpellTargeting,
  type SustainedEffectActionDeclaration,
  type SustainedEffectTargetBinding,
} from '../../../src/combat/spells/types';
import {
  armorClass,
  damageType,
  feet,
  worldObjectId,
  type EncounterEffectId,
  type WorldObjectId,
} from '../../../src/combat/values';
import { feetPoint, type AreaTemplate } from '../../../src/combat/templates';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SustainedSpec {
  readonly id: string;
  readonly castingTime: 'action' | 'bonus_action';
  readonly targeting: SpellTargeting;
  readonly concentration: boolean;
  readonly durationRounds: number;
  readonly binding: SustainedEffectTargetBinding;
  readonly action: SustainedEffectActionDeclaration;
  readonly activationTargeting: SpellTargeting;
  readonly establishment: NonCompositionSpellOperation | null;
  readonly activation: NonCompositionSpellOperation;
}

function damageOperation(sides: 4 | 6 | 8 | 10): NonCompositionSpellOperation {
  return {
    kind: 'damage_operation',
    delivery: { kind: 'automatic' },
    instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: damageType('Fire') },
      dice: {
        baseCount: 1, sides, modifier: 0,
        perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
      },
      scaling: { kind: 'none' },
      thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

const PRODUCE_FLAME: SustainedSpec = {
  id: 'produce-flame-shape', castingTime: 'bonus_action',
  targeting: { kind: 'self' }, concentration: false, durationRounds: 3,
  binding: { kind: 'reselect' },
  action: { phrasing: 'vague_action_on_later_turn', actionType: 'magic_action' },
  activationTargeting: { kind: 'single', rangeFeet: 60, willing: false },
  establishment: null,
  activation: {
    kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Fire'),
    dice: { baseCount: 1, sides: 8, modifier: 0, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: true },
    rider: null,
  },
};

const HEAT_METAL: SustainedSpec = {
  id: 'heat-metal-shape', castingTime: 'action',
  targeting: { kind: 'single', rangeFeet: 60, willing: false },
  concentration: true, durationRounds: 10,
  binding: { kind: 'bound', to: 'cast_object_targets' },
  action: { phrasing: 'explicit', actionType: 'bonus_action' },
  activationTargeting: { kind: 'single', rangeFeet: 60, willing: false },
  establishment: damageOperation(8), activation: damageOperation(8),
};

const CALL_LIGHTNING: SustainedSpec = {
  id: 'call-lightning-shape', castingTime: 'action',
  targeting: { kind: 'area', rangeFeet: 120, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
  concentration: true, durationRounds: 100,
  binding: { kind: 'reselect' },
  action: { phrasing: 'explicit', actionType: 'magic_action' },
  activationTargeting: { kind: 'area', rangeFeet: 120, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
  establishment: damageOperation(10), activation: damageOperation(10),
};

const FLAMING_SPHERE: SustainedSpec = {
  id: 'flaming-sphere-shape', castingTime: 'action',
  targeting: { kind: 'utility', rangeFeet: 60 },
  concentration: true, durationRounds: 10,
  binding: { kind: 'bound', to: 'created_world_objects' },
  action: { phrasing: 'explicit', actionType: 'bonus_action' },
  activationTargeting: { kind: 'utility', rangeFeet: 60 },
  establishment: {
    kind: 'world_operations',
    operations: [{
      kind: 'create_object', placement: 'area_origin', footprintOffsets: [{ column: 0, row: 0 }],
      object: {
        name: 'Flaming sphere', kind: 'light-source', durability: { kind: 'indestructible' },
        armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' },
      },
    }],
  },
  activation: {
    kind: 'world_operations',
    operations: [{ kind: 'move_owned_object', maximumDistanceFeet: 30 }],
  },
};

const MAGE_HAND: SustainedSpec = {
  id: 'mage-hand-shape', castingTime: 'action',
  targeting: { kind: 'utility', rangeFeet: 30 },
  concentration: false, durationRounds: 10,
  binding: { kind: 'reselect' },
  action: { phrasing: 'explicit', actionType: 'magic_action' },
  activationTargeting: { kind: 'utility', rangeFeet: 30 },
  establishment: {
    kind: 'world_operations',
    operations: [{
      kind: 'create_object', placement: 'area_origin', footprintOffsets: [{ column: 0, row: 0 }],
      object: {
        name: 'Mage hand', kind: 'generic', durability: { kind: 'indestructible' },
        armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' },
      },
    }],
  },
  activation: {
    kind: 'world_operations',
    operations: [
      { kind: 'move_owned_object', maximumDistanceFeet: 30 },
      { kind: 'modify_objects', changes: { name: 'Manipulated by Mage Hand' } },
    ],
  },
};

function fixtureWithSpells(specs: readonly SustainedSpec[]): unknown {
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
      castingTime: spec.castingTime,
      concentration: spec.concentration,
      duration: { kind: 'rounds', rounds: spec.durationRounds },
      targeting: spec.targeting,
      operation: {
        kind: 'sustained_effect',
        establishment: spec.establishment,
        lifecycle: {
          concentration: spec.concentration,
          durationRounds: spec.durationRounds,
          expiresAt: 'source_start',
        },
        sequence: {
          kind: 'activation',
          targetBinding: spec.binding,
          action: spec.action,
          targeting: spec.activationTargeting,
          operation: spec.activation,
        },
      } satisfies SpellOperation,
    })),
  };
}

function pack(specs: readonly SustainedSpec[]): LoadedContentPack {
  const result = loadContentPack(fixtureWithSpells(specs));
  if (result.status !== 'loaded') throw new Error(`Sustained fixture refused: ${result.refusal.reason}`);
  expect(result.content.diagnostics).toEqual([]);
  return result.content;
}

interface Table {
  readonly caster: CombatantProfile;
  readonly first: CombatantProfile;
  readonly second: CombatantProfile;
  readonly state: EncounterState;
  readonly firstObject: WorldObjectId;
  readonly secondObject: WorldObjectId;
}

function table(content: LoadedContentPack): Table {
  const caster = playerProfile('sustained-caster', { initiativeBonus: 20 });
  const first = monsterProfile('sustained-first', { initiativeBonus: -10, hitPoints: 40 });
  const second = monsterProfile('sustained-second', { initiativeBonus: -20, hitPoints: 40 });
  const firstObject = worldObjectId('object:heated-first');
  const secondObject = worldObjectId('object:heated-second');
  const initial = createEncounter({
    config: { initiativeMode: 'per_combatant' }, bounds: { columns: 14, rows: 3 },
    combatants: [caster, first, second],
    tokens: [placedToken(caster, 0), placedToken(first, 3), placedToken(second, 8)],
    worldObjects: [firstObject, secondObject].map((id, index) => ({
      id, name: `Metal ${String(index + 1)}`, kind: 'generic' as const,
      position: { column: 3 + index, row: 1 }, footprint: [{ column: 3 + index, row: 1 }],
      durability: { kind: 'indestructible' as const }, armorClass: armorClass(10), damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'none' as const }, createdRevision: 0,
    })),
    contentPacks: [content],
  });
  return {
    caster, first, second, firstObject, secondObject,
    state: reduceEncounter(initial, { type: 'roll_initiative' }, () => 0).state,
  };
}

function castCommand(
  subject: Table,
  spell: SustainedSpec,
  options: {
    readonly targets?: readonly CombatantProfile[];
    readonly objectTargets?: readonly WorldObjectId[];
    readonly area?: AreaTemplate | null;
  } = {},
): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  return {
    type: 'cast_spell', actor: subject.caster.id, spellId: `greenforge:${spell.id}`,
    slotLevel: null, castAsRitual: false, casterLevel: 5, attackBonus: 100, saveDc: 100,
    spellcastingModifier: 4, targets: (options.targets ?? []).map((target) => target.id),
    area: options.area ?? null, weaponAttack: null, selectedOption: null,
    ...(options.objectTargets === undefined ? {} : { objectTargets: options.objectTargets }),
  };
}

function sustainedId(state: EncounterState, spellId: string): EncounterEffectId {
  const effect = state.effects.find((candidate) =>
    candidate.payload.kind === 'sustained_effect' && candidate.payload.spellId === spellId);
  if (effect === undefined) throw new Error(`Missing sustained effect ${spellId}.`);
  return effect.id;
}

function activation(
  subject: Table,
  effectId: EncounterEffectId,
  options: {
    readonly targets?: readonly CombatantProfile[];
    readonly objectTargets?: readonly WorldObjectId[];
    readonly ownedObjectTargets?: readonly WorldObjectId[];
    readonly area?: Extract<EncounterCommand, { type: 'activate_sustained_effect' }>['area'];
    readonly spatialPoint?: { readonly column: number; readonly row: number };
  } = {},
): Extract<EncounterCommand, { readonly type: 'activate_sustained_effect' }> {
  return {
    type: 'activate_sustained_effect', actor: subject.caster.id, effectId,
    targets: (options.targets ?? []).map((target) => target.id),
    objectTargets: options.objectTargets ?? [],
    ownedObjectTargets: options.ownedObjectTargets ?? [], area: options.area ?? null,
    ...(options.spatialPoint === undefined ? {} : { spatialPoint: options.spatialPoint }),
    selectedOption: null,
  };
}

function nextCasterTurn(state: EncounterState, caster: CombatantProfile): EncounterState {
  let current = state;
  do {
    const actor = current.activeCombatant;
    if (actor === null) throw new Error('Initiative is not active.');
    current = reduceEncounter(current, { type: 'end_turn', actor }, () => 0).state;
  } while (current.activeCombatant !== caster.id);
  return current;
}

function hitPoints(state: EncounterState, profile: CombatantProfile): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === profile.id);
  if (subject === undefined) throw new Error(`Missing combatant ${profile.id}.`);
  return subject.hitPoints;
}

function refusal(operation: () => unknown): SustainedActivationRuleError {
  try {
    operation();
  } catch (error) {
    if (error instanceof SustainedActivationRuleError) return error;
    throw error;
  }
  throw new Error('Expected a sustained-activation refusal.');
}

describe('D343 imported sustained-effect sequencing', () => {
  it('D343.2 normalization is declared: vague later-turn wording maps to Magic action while an explicit Bonus Action remains explicit', () => {
    const content = pack([PRODUCE_FLAME, HEAT_METAL]);
    expect(SUSTAINED_ACTION_NORMALIZATION).toEqual({
      explicit: 'preserve_declared_action_type',
      vague_action_on_later_turn: 'magic_action',
    });
    const produce = content.spells.find((spell) => spell.recordId === PRODUCE_FLAME.id)?.definition.operation;
    const heat = content.spells.find((spell) => spell.recordId === HEAT_METAL.id)?.definition.operation;
    expect(produce?.kind === 'sustained_effect' && produce.sequence.kind === 'activation' ? produce.sequence.action : null)
      .toEqual({ phrasing: 'vague_action_on_later_turn', actionType: 'magic_action' });
    expect(heat?.kind === 'sustained_effect' && heat.sequence.kind === 'activation' ? heat.sequence.action : null)
      .toEqual({ phrasing: 'explicit', actionType: 'bonus_action' });
  });

  it('produce-flame shape and sustained_duration_off_by_one: same-turn and post-expiry activation refuse, while first and final later rounds retarget and spend Magic actions', () => {
    const subject = table(pack([PRODUCE_FLAME]));
    const cast = reduceEncounter(subject.state, castCommand(subject, PRODUCE_FLAME), () => 0);
    const effectId = sustainedId(cast.state, 'greenforge:produce-flame-shape');
    expect(refusal(() => reduceEncounter(cast.state, activation(subject, effectId, { targets: [subject.first] }), () => 0)).code)
      .toBe('activation_not_yet_available');

    let state = nextCasterTurn(cast.state, subject.caster);
    const first = reduceEncounter(state, activation(subject, effectId, { targets: [subject.first] }), () => 0.5);
    expect(hitPoints(first.state, subject.first)).toBe(30);
    expect(first.state.combatants.find((entry) => entry.profile.id === subject.caster.id)?.turn)
      .toMatchObject({ action: { kind: 'spent' }, bonusActionAvailable: true });

    state = nextCasterTurn(first.state, subject.caster);
    const final = reduceEncounter(state, activation(subject, effectId, { targets: [subject.second] }), () => 0.5);
    expect(hitPoints(final.state, subject.second)).toBe(30);
    state = nextCasterTurn(final.state, subject.caster);
    expect(refusal(() => reduceEncounter(state, activation(subject, effectId, { targets: [subject.second] }), () => 0)).code)
      .toBe('effect_ended');
  });

  it('activation_free: an available Magic action activates, but an exactly-spent action refuses without dealing damage', () => {
    const subject = table(pack([PRODUCE_FLAME]));
    const cast = reduceEncounter(subject.state, castCommand(subject, PRODUCE_FLAME), () => 0);
    const effectId = sustainedId(cast.state, 'greenforge:produce-flame-shape');
    const available = nextCasterTurn(cast.state, subject.caster);
    const spent = reduceEncounter(available, { type: 'dodge', actor: subject.caster.id }, () => 0).state;
    const before = hitPoints(spent, subject.first);
    expect(() => reduceEncounter(spent, activation(subject, effectId, { targets: [subject.first] }), () => 0))
      .toThrow('has no action available');
    expect(hitPoints(spent, subject.first)).toBe(before);
  });

  it('bound_effect_retargets and explicit_action_type_normalized: Heat Metal keeps its original object, rejects a different object with a typed code, and spends only its Bonus Action', () => {
    const subject = table(pack([HEAT_METAL]));
    const cast = reduceEncounter(subject.state, castCommand(subject, HEAT_METAL, {
      targets: [subject.first], objectTargets: [subject.firstObject],
    }), () => 0).state;
    const effectId = sustainedId(cast, 'greenforge:heat-metal-shape');
    const state = nextCasterTurn(cast, subject.caster);
    expect(refusal(() => reduceEncounter(state, activation(subject, effectId, {
      targets: [subject.first], objectTargets: [subject.secondObject],
    }), () => 0)).code).toBe('bound_target_mismatch');

    const activated = reduceEncounter(state, activation(subject, effectId, {
      targets: [subject.first], objectTargets: [subject.firstObject],
    }), () => 0);
    expect(activated.state.combatants.find((entry) => entry.profile.id === subject.caster.id)?.turn)
      .toMatchObject({ action: { kind: 'available' }, bonusActionAvailable: false });
    expect(activated.events).toContainEqual(expect.objectContaining({
      type: 'resource_spent', resource: 'bonus_action', purpose: 'Activate heat-metal-shape',
    }));
  });

  it('bound combatant effects reject a same-size target set containing a different combatant', () => {
    const boundCombatantEffect = {
      ...HEAT_METAL,
      id: 'bound-combatant-shape',
      binding: { kind: 'bound', to: 'cast_combatant_targets' },
    } satisfies SustainedSpec;
    const subject = table(pack([boundCombatantEffect]));
    const cast = reduceEncounter(subject.state, castCommand(subject, boundCombatantEffect, {
      targets: [subject.first],
    }), () => 0).state;
    const effectId = sustainedId(cast, 'greenforge:bound-combatant-shape');
    const state = nextCasterTurn(cast, subject.caster);

    expect(refusal(() => reduceEncounter(state, activation(subject, effectId, {
      targets: [subject.second],
    }), () => 0)).code).toBe('bound_target_mismatch');
  });

  it('call-lightning shape reselects a different point on a later turn and damages the newly enclosed target', () => {
    const subject = table(pack([CALL_LIGHTNING]));
    const firstArea = { shape: 'sphere' as const, template: { origin: feetPoint(20, 5), radius: feet(5) } };
    const secondArea = { shape: 'sphere' as const, template: { origin: feetPoint(45, 5), radius: feet(5) } };
    const cast = reduceEncounter(subject.state, castCommand(subject, CALL_LIGHTNING, { area: firstArea }), () => 0).state;
    expect(hitPoints(cast, subject.first)).toBe(39);
    expect(hitPoints(cast, subject.second)).toBe(40);
    const effectId = sustainedId(cast, 'greenforge:call-lightning-shape');
    const state = nextCasterTurn(cast, subject.caster);
    const activated = reduceEncounter(state, activation(subject, effectId, { area: secondArea }), () => 0).state;
    expect(hitPoints(activated, subject.first)).toBe(39);
    expect(hitPoints(activated, subject.second)).toBe(39);
  });

  it('flaming-sphere shape spends a Bonus Action to move only the world object created and owned by its sustained effect', () => {
    const subject = table(pack([FLAMING_SPHERE]));
    const placement = { shape: 'sphere' as const, template: { origin: feetPoint(27.5, 7.5), radius: feet(0) } };
    const cast = reduceEncounter(subject.state, castCommand(subject, FLAMING_SPHERE, { area: placement }), () => 0).state;
    const effectId = sustainedId(cast, 'greenforge:flaming-sphere-shape');
    const effect = cast.effects.find((candidate) => candidate.id === effectId);
    const owned = effect?.payload.kind === 'sustained_effect' ? effect.payload.ownedObjects[0] : undefined;
    if (owned === undefined) throw new Error('Flaming sphere did not bind its created object.');
    const state = nextCasterTurn(cast, subject.caster);
    const moved = reduceEncounter(state, activation(subject, effectId, {
      ownedObjectTargets: [owned], spatialPoint: { column: 7, row: 1 },
    }), () => 0).state;
    expect(moved.worldObjects.find((object) => object.id === owned)?.position).toEqual({ column: 7, row: 1 });
    expect(moved.combatants.find((entry) => entry.profile.id === subject.caster.id)?.turn.bonusActionAvailable).toBe(false);
  });

  it('mage-hand shape uses a later-turn Magic action to move its owned hand and manipulate a separately reselected object', () => {
    const subject = table(pack([MAGE_HAND]));
    const placement = { shape: 'sphere' as const, template: { origin: feetPoint(20, 5), radius: feet(0) } };
    const cast = reduceEncounter(subject.state, castCommand(subject, MAGE_HAND, { area: placement }), () => 0).state;
    const effectId = sustainedId(cast, 'greenforge:mage-hand-shape');
    const effect = cast.effects.find((candidate) => candidate.id === effectId);
    const hand = effect?.payload.kind === 'sustained_effect' ? effect.payload.ownedObjects[0] : undefined;
    if (hand === undefined) throw new Error('Mage Hand did not retain its created hand.');
    const state = nextCasterTurn(cast, subject.caster);
    const activated = reduceEncounter(state, activation(subject, effectId, {
      objectTargets: [subject.secondObject], ownedObjectTargets: [hand],
      spatialPoint: { column: 6, row: 1 },
    }), () => 0).state;
    expect(activated.worldObjects.find((object) => object.id === hand)?.position).toEqual({ column: 6, row: 1 });
    expect(activated.worldObjects.find((object) => object.id === subject.secondObject)?.name).toBe('Manipulated by Mage Hand');
    expect(activated.combatants.find((entry) => entry.profile.id === subject.caster.id)?.turn)
      .toMatchObject({ action: { kind: 'spent' }, bonusActionAvailable: true });
  });

  it('effect_end_leaves_activation: ending concentration removes the ordinary lifecycle effect and refuses its pending activation', () => {
    const subject = table(pack([CALL_LIGHTNING]));
    const area = { shape: 'sphere' as const, template: { origin: feetPoint(20, 5), radius: feet(5) } };
    const cast = reduceEncounter(subject.state, castCommand(subject, CALL_LIGHTNING, { area }), () => 0).state;
    const effectId = sustainedId(cast, 'greenforge:call-lightning-shape');
    const ended = reduceEncounter(cast, { type: 'end_concentration', actor: subject.caster.id }, () => 0).state;
    expect(ended.effects.some((effect) => effect.id === effectId)).toBe(false);
    expect(refusal(() => reduceEncounter(ended, activation(subject, effectId, { area }), () => 0)).code).toBe('effect_ended');
  });

  it('Bonus Action economy has the same exactly-available versus exactly-spent boundary as Magic actions', () => {
    const subject = table(pack([HEAT_METAL]));
    const cast = reduceEncounter(subject.state, castCommand(subject, HEAT_METAL, {
      targets: [subject.first], objectTargets: [subject.firstObject],
    }), () => 0).state;
    const effectId = sustainedId(cast, 'greenforge:heat-metal-shape');
    const available = nextCasterTurn(cast, subject.caster);
    const spent = reduceEncounter(available, {
      type: 'spend_bonus_action', actor: subject.caster.id, purpose: 'Boundary setup',
    }, () => 0).state;
    expect(() => reduceEncounter(spent, activation(subject, effectId, {
      targets: [subject.first], objectTargets: [subject.firstObject],
    }), () => 0)).toThrow('has no Bonus Action available');
  });
});
