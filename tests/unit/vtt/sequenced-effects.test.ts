import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import type { SpellOperation, SpellTargeting } from '../../../src/combat/spells/types';
import { feetPoint, type AreaTemplate } from '../../../src/combat/templates';
import {
  armorClass,
  damageType,
  feet,
  type EncounterEffectId,
  type WorldObjectId,
} from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface ImportedSequenceSpell {
  readonly id: string;
  readonly targeting: SpellTargeting;
  readonly concentration: boolean;
  readonly durationRounds: number;
  readonly operation: SpellOperation;
}

function damage(sides: 4 | 6 | 8 | 10): Extract<SpellOperation, { readonly kind: 'damage_operation' }> {
  return {
    kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: damageType('Radiant') },
      dice: { baseCount: 1, sides, modifier: 0, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
      scaling: { kind: 'none' }, thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

function sustained(
  id: string,
  targeting: SpellTargeting,
  sequence: Extract<SpellOperation, { readonly kind: 'sustained_effect' }>['sequence'],
  options: {
    readonly establishment?: Extract<SpellOperation, { readonly kind: 'sustained_effect' }>['establishment'];
    readonly durationRounds?: number | null;
    readonly concentration?: boolean;
  } = {},
): ImportedSequenceSpell {
  const durationRounds = options.durationRounds === undefined ? 3 : options.durationRounds;
  return {
    id, targeting, concentration: options.concentration ?? false,
    durationRounds: durationRounds ?? 3,
    operation: {
      kind: 'sustained_effect', establishment: options.establishment ?? null,
      lifecycle: {
        concentration: options.concentration ?? false,
        durationRounds,
        expiresAt: sequence.kind === 'automatic_tick' ? sequence.boundary : 'source_start',
      },
      sequence,
    },
  };
}

const AUTOMATIC = sustained(
  'automatic-tick-shape',
  { kind: 'single', rangeFeet: 60, willing: false },
  { kind: 'automatic_tick', boundary: 'source_start', ticks: 2, operation: damage(4) },
  { durationRounds: 2 },
);

const ACTIVATED = sustained(
  'activation-gated-shape',
  { kind: 'single', rangeFeet: 60, willing: false },
  {
    kind: 'activation', targetBinding: { kind: 'bound', to: 'cast_combatant_targets' },
    action: { phrasing: 'explicit', actionType: 'magic_action' },
    targeting: { kind: 'single', rangeFeet: 60, willing: false }, operation: damage(4),
  },
);

const EVENT_AREA: AreaTemplate = {
  shape: 'sphere', template: { origin: feetPoint(15, 5), radius: feet(3) },
};

function eventSpell(id: string): ImportedSequenceSpell {
  return sustained(
    id,
    { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 3, sizePerSlotFeet: 0 },
    { kind: 'event_trigger', hook: 'on_enter', frequency: 'once_per_turn', operation: damage(6) },
    {
      establishment: {
        kind: 'persistent_area', origin: 'selected_when_cast', shape: null,
        durationRounds: 3, concentration: false, targetFilter: 'all', includeOwner: false,
        difficultTerrain: false, movableFeet: null, hooks: [], initialEffects: [],
      },
    },
  );
}

const DELAYED = sustained(
  'delayed-one-shot-shape',
  { kind: 'single', rangeFeet: 60, willing: false },
  { kind: 'delayed_one_shot', boundary: 'source_start', delayRounds: 2, operation: damage(8) },
  { durationRounds: null },
);

function lightObject(name: string): Extract<SpellOperation, { readonly kind: 'world_operations' }>['operations'][number] {
  return {
    kind: 'create_object', placement: 'caster_cell', footprintOffsets: [{ column: 0, row: 0 }],
    object: {
      name, kind: 'light-source', durability: { kind: 'indestructible' },
      armorClass: armorClass(10), damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'none' },
    },
  };
}

const GROUP = sustained(
  'four-instance-group-shape',
  { kind: 'utility', rangeFeet: 120 },
  {
    kind: 'instance_group_activation', instanceCount: 4,
    action: { phrasing: 'explicit', actionType: 'bonus_action' },
    targeting: { kind: 'utility', rangeFeet: 120 },
    operation: { kind: 'world_operations', operations: [{ kind: 'move_owned_object_group', maximumDistanceFeet: 60 }] },
  },
  { establishment: { kind: 'world_operations', operations: [1, 2, 3, 4].map((index) => lightObject(`Light ${String(index)}`)) } },
);

const SINGLE_INSTANCE = sustained(
  'single-instance-shape',
  { kind: 'utility', rangeFeet: 120 },
  {
    kind: 'activation', targetBinding: { kind: 'bound', to: 'created_world_objects' },
    action: { phrasing: 'explicit', actionType: 'bonus_action' },
    targeting: { kind: 'utility', rangeFeet: 120 },
    operation: { kind: 'world_operations', operations: [{ kind: 'move_owned_object', maximumDistanceFeet: 60 }] },
  },
  { establishment: { kind: 'world_operations', operations: [lightObject('Single light')] } },
);

function fixture(spells: readonly ImportedSequenceSpell[]): unknown {
  const source = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = source.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  return {
    ...source,
    spells: spells.map((spell) => ({
      ...template, recordId: spell.id, name: spell.id, level: 0,
      castingTime: 'action', concentration: spell.concentration,
      duration: { kind: 'rounds', rounds: spell.durationRounds },
      targeting: spell.targeting, operation: spell.operation,
    })),
  };
}

function pack(spells: readonly ImportedSequenceSpell[]): LoadedContentPack {
  const result = loadContentPack(fixture(spells));
  if (result.status !== 'loaded') throw new Error(`Sequenced fixture refused: ${result.refusal.reason}`);
  expect(result.content.diagnostics).toEqual([]);
  return result.content;
}

interface Table {
  readonly caster: CombatantProfile;
  readonly target: CombatantProfile;
  readonly state: EncounterState;
}

function table(content: LoadedContentPack): Table {
  const caster = playerProfile('sequence-caster', { initiativeBonus: 20 });
  const target = monsterProfile('sequence-target', { initiativeBonus: -20, hitPoints: 40 });
  const initial = createEncounter({
    config: { initiativeMode: 'per_combatant' }, bounds: { columns: 16, rows: 3 },
    combatants: [caster, target], tokens: [placedToken(caster, 10), placedToken(target, 0)],
    contentPacks: [content],
  });
  return { caster, target, state: reduceEncounter(initial, { type: 'roll_initiative' }, () => 0).state };
}

function cast(subject: Table, spell: ImportedSequenceSpell, options: { readonly area?: AreaTemplate | null } = {}) {
  return reduceEncounter(subject.state, {
    type: 'cast_spell', actor: subject.caster.id, spellId: `greenforge:${spell.id}`,
    slotLevel: null, castAsRitual: false, casterLevel: 5, attackBonus: 10, saveDc: 15,
    spellcastingModifier: 4,
    targets: spell.targeting.kind === 'single' ? [subject.target.id] : [],
    area: options.area ?? null, weaponAttack: null, selectedOption: null,
  }, () => 0);
}

function nextCasterTurn(state: EncounterState, caster: CombatantProfile, rng: () => number = () => 0): EncounterState {
  let current = state;
  do {
    const actor = current.activeCombatant;
    if (actor === null) throw new Error('Initiative is not active.');
    current = reduceEncounter(current, { type: 'end_turn', actor }, rng).state;
  } while (current.activeCombatant !== caster.id);
  return current;
}

function hitPoints(state: EncounterState, target: CombatantProfile): number {
  const combatant = state.combatants.find((candidate) => candidate.profile.id === target.id);
  if (combatant === undefined) throw new Error(`Missing combatant ${target.id}.`);
  return combatant.hitPoints;
}

function relocate(
  state: EncounterState,
  target: CombatantProfile,
  to: { readonly column: number; readonly row: number },
): ReturnType<typeof reduceEncounter> {
  return reduceEncounter(state, {
    type: 'adjudicate', target: target.id, subject: 'sequenced-effect test relocation',
    reasoning: 'Exercise multiple area-entry triggers without advancing the active turn.',
    consequence: { kind: 'relocate', to },
  }, () => 0);
}

function effectId(state: EncounterState, spellId: string): EncounterEffectId {
  const effect = state.effects.find((candidate) =>
    candidate.payload.kind === 'sustained_effect' && candidate.payload.spellId === spellId);
  if (effect === undefined) throw new Error(`Missing sustained effect ${spellId}.`);
  return effect.id;
}

function activation(
  subject: Table,
  id: EncounterEffectId,
  ownedObjectTargets: readonly WorldObjectId[] = [],
  ownedObjectDestinations?: readonly { readonly objectId: WorldObjectId; readonly destination: { readonly column: number; readonly row: number } }[],
  targets: readonly CombatantProfile[] = [],
): Extract<EncounterCommand, { readonly type: 'activate_sustained_effect' }> {
  return {
    type: 'activate_sustained_effect', actor: subject.caster.id, effectId: id,
    targets: targets.map((target) => target.id), objectTargets: [], ownedObjectTargets, area: null,
    selectedOption: null,
    ...(ownedObjectDestinations === undefined ? {} : { ownedObjectDestinations }),
  };
}

function ownedObjects(state: EncounterState, id: EncounterEffectId): readonly WorldObjectId[] {
  const effect = state.effects.find((candidate) => candidate.id === id);
  if (effect?.payload.kind !== 'sustained_effect') throw new Error(`Missing sustained effect ${id}.`);
  return effect.payload.ownedObjects;
}

describe('D348.1 imported sequenced-effect bindings', () => {
  it('auto_tick_needs_activation: automatic first/final ticks require no Magic action while activation-gated damage does', () => {
    const content = pack([AUTOMATIC, ACTIVATED]);
    const automaticTable = table(content);
    const automaticCast = cast(automaticTable, AUTOMATIC).state;
    const automaticId = effectId(automaticCast, 'greenforge:automatic-tick-shape');
    expect(() => reduceEncounter(automaticCast, activation(automaticTable, automaticId), () => 0))
      .toThrowError(expect.objectContaining({ code: 'activation_not_declared' }));

    const firstTick = nextCasterTurn(automaticCast, automaticTable.caster);
    expect(hitPoints(firstTick, automaticTable.target)).toBe(39);
    expect(firstTick.combatants.find((entry) => entry.profile.id === automaticTable.caster.id)?.turn.action)
      .toEqual({ kind: 'available' });
    const finalTick = nextCasterTurn(firstTick, automaticTable.caster);
    expect(hitPoints(finalTick, automaticTable.target)).toBe(38);
    expect(finalTick.effects.some((effect) => effect.id === automaticId)).toBe(false);
    expect(hitPoints(nextCasterTurn(finalTick, automaticTable.caster), automaticTable.target)).toBe(38);

    const activationTable = table(content);
    const activationCast = cast(activationTable, ACTIVATED).state;
    const ready = nextCasterTurn(activationCast, activationTable.caster);
    expect(hitPoints(ready, activationTable.target)).toBe(40);
    const activated = reduceEncounter(
      ready,
      activation(activationTable, effectId(ready, 'greenforge:activation-gated-shape'), [], undefined, [activationTable.target]),
      () => 0,
    ).state;
    expect(hitPoints(activated, activationTable.target)).toBe(39);
    expect(activated.combatants.find((entry) => entry.profile.id === activationTable.caster.id)?.turn.action)
      .toEqual({ kind: 'spent' });
  });

  it('event_trigger_fires_on_any_event: entry fires exactly on the area boundary, not one cell off or on an undeclared end-turn event', () => {
    const spell = eventSpell('owned-area-entry-shape');
    const subject = table(pack([spell]));
    let state = cast(subject, spell, { area: EVENT_AREA }).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: subject.caster.id }, () => 0).state;

    const oneOff = reduceEncounter(state, {
      type: 'move', actor: subject.target.id, path: [{ column: 1, row: 1 }], cause: 'reactions_resolved',
    }, () => 0);
    expect(hitPoints(oneOff.state, subject.target)).toBe(40);
    expect(oneOff.events.filter((event) => event.type === 'sustained_effect_triggered')).toEqual([]);

    const exact = reduceEncounter(oneOff.state, {
      type: 'move', actor: subject.target.id, path: [{ column: 2, row: 1 }], cause: 'reactions_resolved',
    }, () => 0);
    expect(hitPoints(exact.state, subject.target)).toBe(39);
    expect(exact.events).toContainEqual(expect.objectContaining({
      type: 'sustained_effect_triggered', sequenceKind: 'event_trigger', trigger: 'on_enter',
    }));

    const ownerTurn = reduceEncounter(exact.state, { type: 'end_turn', actor: subject.target.id }, () => 0).state;
    const undeclared = reduceEncounter(ownerTurn, { type: 'end_turn', actor: subject.caster.id }, () => 0);
    expect(hitPoints(undeclared.state, subject.target)).toBe(39);
    expect(undeclared.events.filter((event) => event.type === 'sustained_effect_triggered')).toEqual([]);
  });

  it('event_trigger_once_per_turn_is_scoped_per_target_same_turn: two targets each fire once while repeat entry is suppressed', () => {
    const spell = eventSpell('per-target-owned-area-entry');
    const content = pack([spell]);
    const caster = playerProfile('per-target-sequence-caster', { initiativeBonus: 20 });
    const first = monsterProfile('per-target-sequence-first', { initiativeBonus: -10, hitPoints: 40 });
    const second = monsterProfile('per-target-sequence-second', { initiativeBonus: -20, hitPoints: 40 });
    let state = reduceEncounter(createEncounter({
      config: { initiativeMode: 'per_combatant' }, bounds: { columns: 16, rows: 3 },
      combatants: [caster, first, second],
      tokens: [placedToken(caster, 10), placedToken(first, 0), placedToken(second, 0, 2)],
      contentPacks: [content],
    }), { type: 'roll_initiative' }, () => 0).state;
    const subject: Table = { caster, target: first, state };
    state = cast(subject, spell, { area: EVENT_AREA }).state;

    state = relocate(state, first, { column: 2, row: 1 }).state;
    expect(hitPoints(state, first)).toBe(39);
    state = relocate(state, first, { column: 1, row: 1 }).state;
    state = relocate(state, second, { column: 2, row: 1 }).state;
    expect(hitPoints(state, second)).toBe(39);
    state = relocate(state, second, { column: 1, row: 2 }).state;
    const repeated = relocate(state, first, { column: 2, row: 1 });

    expect(hitPoints(repeated.state, first)).toBe(39);
    expect(hitPoints(repeated.state, second)).toBe(39);
    expect(repeated.events.filter((event) => event.type === 'damage_applied')).toEqual([]);
  });

  it('delayed_oneshot_repeats: a timer differs from an event, fires at its exact future boundary, and is consumed', () => {
    const subject = table(pack([DELAYED]));
    const castState = cast(subject, DELAYED).state;
    const delayedId = effectId(castState, 'greenforge:delayed-one-shot-shape');

    const oneBefore = nextCasterTurn(castState, subject.caster);
    expect(hitPoints(oneBefore, subject.target)).toBe(40);
    expect(oneBefore.effects.some((effect) => effect.id === delayedId)).toBe(true);
    const exact = nextCasterTurn(oneBefore, subject.caster);
    expect(hitPoints(exact, subject.target)).toBe(39);
    expect(exact.eventLog).toContainEqual(expect.objectContaining({
      type: 'sustained_effect_triggered', sequenceKind: 'delayed_one_shot', trigger: 'source_start',
    }));
    const oneAfter = nextCasterTurn(exact, subject.caster);
    expect(hitPoints(oneAfter, subject.target)).toBe(39);
    const twoAfter = nextCasterTurn(oneAfter, subject.caster);
    expect(hitPoints(twoAfter, subject.target)).toBe(39);
    expect(twoAfter.effects.some((effect) => effect.id === delayedId)).toBe(false);
  });

  it('instance_group_splits: a declared group rejects a partial move while a single-instance activation accepts its complete singleton', () => {
    const content = pack([GROUP, SINGLE_INSTANCE]);
    const groupTable = table(content);
    const groupCast = cast(groupTable, GROUP).state;
    const groupId = effectId(groupCast, 'greenforge:four-instance-group-shape');
    const groupObjects = ownedObjects(groupCast, groupId);
    expect(groupObjects).toHaveLength(4);
    const groupReady = nextCasterTurn(groupCast, groupTable.caster);
    expect(() => reduceEncounter(
      groupReady,
      activation(groupTable, groupId, groupObjects.slice(0, 3), groupObjects.slice(0, 3).map((objectId, index) => ({
        objectId, destination: { column: index + 2, row: 1 },
      }))),
      () => 0,
    )).toThrowError(expect.objectContaining({ code: 'bound_target_mismatch' }));
    expect(groupReady.worldObjects.filter((object) => groupObjects.includes(object.id)).map((object) => object.position))
      .toEqual(Array.from({ length: 4 }, () => ({ column: 10, row: 0 })));

    const moved = reduceEncounter(
      groupReady,
      activation(groupTable, groupId, groupObjects, groupObjects.map((objectId, index) => ({
        objectId, destination: { column: index + 2, row: 1 },
      }))),
      () => 0,
    ).state;
    expect(moved.worldObjects.filter((object) => groupObjects.includes(object.id)).map((object) => object.position))
      .toEqual([2, 3, 4, 5].map((column) => ({ column, row: 1 })));

    const singleTable = table(content);
    const singleCast = cast(singleTable, SINGLE_INSTANCE).state;
    const singleId = effectId(singleCast, 'greenforge:single-instance-shape');
    const singleObjects = ownedObjects(singleCast, singleId);
    const singleReady = nextCasterTurn(singleCast, singleTable.caster);
    const singleMoved = reduceEncounter(
      singleReady,
      { ...activation(singleTable, singleId, singleObjects), spatialPoint: { column: 6, row: 1 } },
      () => 0,
    ).state;
    expect(singleMoved.worldObjects.find((object) => object.id === singleObjects[0])?.position)
      .toEqual({ column: 6, row: 1 });
  });

  it('sequenced_hook_order_seeded: owned-area hooks resolve by area/effect creation order with a reproducible RNG stream', () => {
    const spells = [eventSpell('first-created-hook'), eventSpell('second-created-hook')];
    const run = (seed: number) => {
      const subject = table(pack(spells));
      let state = cast(subject, spells[0] as ImportedSequenceSpell, { area: EVENT_AREA }).state;
      state = nextCasterTurn(state, subject.caster);
      state = reduceEncounter(state, {
        type: 'cast_spell', actor: subject.caster.id, spellId: 'greenforge:second-created-hook',
        slotLevel: null, castAsRitual: false, casterLevel: 5, attackBonus: 10, saveDc: 15,
        spellcastingModifier: 4, targets: [], area: EVENT_AREA, weaponAttack: null, selectedOption: null,
      }, () => 0).state;
      state = reduceEncounter(state, { type: 'end_turn', actor: subject.caster.id }, () => 0).state;
      return reduceEncounter(state, {
        type: 'move', actor: subject.target.id, path: [{ column: 1, row: 1 }, { column: 2, row: 1 }],
        cause: 'reactions_resolved',
      }, mulberry32(seed));
    };

    const first = run(0xd3481);
    const second = run(0xd3481);
    expect(first.events.filter((event) => event.type === 'sustained_effect_triggered').map((event) => event.spellId))
      .toEqual(['greenforge:first-created-hook', 'greenforge:second-created-hook']);
    expect(first.events).toEqual(second.events);
  });
});
