import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import type { EffectApplication, EffectPayload } from '../../../src/combat/effects';
import {
  createEncounter,
  encounterMovementWorld,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { CombatantEquipment } from '../../../src/combat/equipment';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { findPath } from '../../../src/combat/movement';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import {
  damageType,
  dieSides,
  effectStackingIdentity,
  feet,
  itemId,
} from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const fixedDamage = (amount: number) => ({
  terms: [{ type: damageType('Slashing'), dice: { count: 0, sides: dieSides(6), modifier: amount } }],
  critical: false,
  responses: [],
} as const);

const slowPayload: Extract<EffectPayload, { readonly kind: 'slow' }> = {
  kind: 'slow', speedMultiplier: 0.5, armorClassPenalty: 2, dexteritySavePenalty: 2,
  reactionsAllowed: false, actionOrBonusOnly: true, attacksPerAction: 1,
  somaticSpellFailurePercent: 25,
};

function effectApplication(target: CombatantProfile, payload: EffectPayload): EffectApplication {
  return {
    targets: [target.id], duration: { kind: 'permanent' }, concentration: false,
    stackingIdentity: effectStackingIdentity(`enforcement:${payload.kind}`),
    stacking: 'replace_any_source', repeatedSave: null, payload,
  };
}

function applyEffect(
  state: EncounterState,
  actor: CombatantProfile,
  target: CombatantProfile,
  payload: EffectPayload,
): EncounterState {
  return reduceEncounter(state, {
    type: 'apply_effect', actor: actor.id,
    effect: effectApplication(target, payload), cost: 'none',
  }, () => 0.5).state;
}

function twoCombatantEncounter(
  actor: CombatantProfile,
  target: CombatantProfile,
  actorColumn = 0,
  targetColumn = 3,
  columns = 10,
): EncounterState {
  let state = createEncounter({
    bounds: { columns, rows: 1 }, combatants: [actor, target],
    tokens: [placedToken(actor, actorColumn), placedToken(target, targetColumn)],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  return state;
}

function endTurn(state: EncounterState, actor: CombatantProfile): EncounterState {
  return reduceEncounter(state, { type: 'end_turn', actor: actor.id }, () => 0.5).state;
}

function combatantState(state: EncounterState, profile: CombatantProfile) {
  const found = state.combatants.find((candidate) => candidate.profile.id === profile.id);
  if (found === undefined) throw new Error(`Missing combatant ${profile.id}.`);
  return found;
}

function position(state: EncounterState, profile: CombatantProfile) {
  const found = state.tokens.find((candidate) => candidate.combatantId === profile.id);
  if (found === undefined) throw new Error(`Missing token ${profile.id}.`);
  return found.position;
}

function d20Faces(...faces: number[]): () => number {
  let index = 0;
  return () => {
    const face = faces[index];
    if (face === undefined) return 0;
    index += 1;
    return (face - 0.5) / 20;
  };
}

function attack(actor: CombatantProfile, target: CombatantProfile): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack', actor: actor.id, target: target.id, attackBonus: 0, criticalFloor: 20,
    rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    damage: fixedDamage(3),
  };
}

function forceDexteritySave(
  actor: CombatantProfile,
  target: CombatantProfile,
): Extract<EncounterCommand, { readonly type: 'force_save' }> {
  return {
    type: 'force_save', actor: actor.id, target: target.id, ability: 'dexterity', dc: 10,
    rollMode: 'normal', damage: fixedDamage(3), onSuccess: 'none', cost: 'none',
  };
}

function commandPayload(
  selectedOption: 'approach' | 'drop' | 'flee' | 'grovel' | 'halt',
): Extract<EffectPayload, { readonly kind: 'commanded_action' }> {
  return {
    kind: 'commanded_action', options: ['approach', 'drop', 'flee', 'grovel', 'halt'],
    selectedOption,
  };
}

function commandTurn(
  selectedOption: 'approach' | 'drop' | 'flee' | 'grovel' | 'halt',
  sourceColumn = 0,
  targetColumn = 6,
): { readonly state: EncounterState; readonly source: CombatantProfile; readonly target: CombatantProfile } {
  const source = playerProfile(`command-${selectedOption}-source`, { initiativeBonus: 20 });
  const target = monsterProfile(`command-${selectedOption}-target`, { initiativeBonus: -20 });
  let state = twoCombatantEncounter(source, target, sourceColumn, targetColumn, selectedOption === 'flee' ? 16 : 10);
  state = applyEffect(state, source, target, commandPayload(selectedOption));
  state = endTurn(state, source);
  return { state, source, target };
}

describe('D386.2 Slow enforcement', () => {
  it('slow_armor_class_penalty_changes_fight_outcome: −2 AC turns the same total from miss to hit', () => {
    // Speed, AC, Dexterity saves, and Reactions: docs/srd/source/spell-descriptions.txt:7146-7151.
    const attacker = playerProfile('slow-ac-attacker', { initiativeBonus: 20 });
    const target = monsterProfile('slow-ac-target', { hitPoints: 10, initiativeBonus: -20 });
    const baseline = reduceEncounter(twoCombatantEncounter(attacker, target), attack(attacker, target), d20Faces(11)).state;
    let slowed = twoCombatantEncounter(attacker, target);
    slowed = applyEffect(slowed, attacker, target, slowPayload);
    slowed = reduceEncounter(slowed, attack(attacker, target), d20Faces(11)).state;
    expect(combatantState(baseline, target).hitPoints).toBe(10);
    expect(combatantState(slowed, target).hitPoints).toBe(7);
  });

  it('slow_dexterity_save_penalty_pins_both_sides_of_the_dc', () => {
    // The affected target takes a −2 Dexterity-save penalty: spell-descriptions.txt:7149-7151.
    const caster = playerProfile('slow-save-caster', { initiativeBonus: 20 });
    const target = monsterProfile('slow-save-target', { hitPoints: 10, initiativeBonus: -20 });
    const baseline = reduceEncounter(twoCombatantEncounter(caster, target), forceDexteritySave(caster, target), d20Faces(11)).state;
    let slowed = twoCombatantEncounter(caster, target);
    slowed = applyEffect(slowed, caster, target, slowPayload);
    const result = reduceEncounter(slowed, forceDexteritySave(caster, target), d20Faces(11));
    const save = result.events.find((event): event is Extract<EncounterEvent, { readonly type: 'save_resolved' }> =>
      event.type === 'save_resolved');
    expect(combatantState(baseline, target).hitPoints).toBe(10);
    expect(save?.save.total).toBe(9);
    expect(combatantState(result.state, target).hitPoints).toBe(7);
  });

  it('slow_halves_speed_but_the_unslowed_boundary_keeps_full_speed', () => {
    // An affected target's Speed is halved: spell-descriptions.txt:7149.
    const source = playerProfile('slow-speed-source', { initiativeBonus: 20 });
    const target = monsterProfile('slow-speed-target', { initiativeBonus: -20 });
    const baseline = endTurn(twoCombatantEncounter(source, target), source);
    let slowed = twoCombatantEncounter(source, target);
    slowed = applyEffect(slowed, source, target, slowPayload);
    slowed = endTurn(slowed, source);
    expect(combatantState(baseline, target).turn.movement).toMatchObject({ speed: 30, remaining: 30 });
    expect(combatantState(slowed, target).turn.movement).toMatchObject({ speed: 15, remaining: 15 });
  });

  it('slow_keeps_reactions mutation is killed: the target cannot react while the control can', () => {
    // An affected target can't take Reactions: spell-descriptions.txt:7149-7151.
    const source = playerProfile('slow-reaction-source', { initiativeBonus: 20 });
    const target = monsterProfile('slow-reaction-target', { initiativeBonus: -20 });
    const baseline = twoCombatantEncounter(source, target);
    expect(() => reduceEncounter(baseline, {
      type: 'spend_reaction', actor: target.id, purpose: 'control reaction',
    }, () => 0.5)).not.toThrow();
    const slowed = applyEffect(twoCombatantEncounter(source, target), source, target, slowPayload);
    expect(() => reduceEncounter(slowed, {
      type: 'spend_reaction', actor: target.id, purpose: 'forbidden reaction',
    }, () => 0.5)).toThrow('no Reaction available');
  });

  it('slow_allows_action_or_bonus_action_not_both_in_either_order', () => {
    // The target can take either an action or a Bonus Action, not both: spell-descriptions.txt:7151-7153.
    const source = playerProfile('slow-choice-source', { initiativeBonus: 20 });
    const target = monsterProfile('slow-choice-target', { initiativeBonus: -20 });
    let bonusFirst = twoCombatantEncounter(source, target);
    bonusFirst = applyEffect(bonusFirst, source, target, slowPayload);
    bonusFirst = endTurn(bonusFirst, source);
    bonusFirst = reduceEncounter(bonusFirst, {
      type: 'spend_bonus_action', actor: target.id, purpose: 'Slow boundary',
    }, () => 0.5).state;
    expect(() => reduceEncounter(bonusFirst, { type: 'dash', actor: target.id }, () => 0.5)).toThrow('no action available');

    let actionFirst = twoCombatantEncounter(source, target);
    actionFirst = applyEffect(actionFirst, source, target, slowPayload);
    actionFirst = endTurn(actionFirst, source);
    actionFirst = reduceEncounter(actionFirst, { type: 'dash', actor: target.id }, () => 0.5).state;
    expect(() => reduceEncounter(actionFirst, {
      type: 'spend_bonus_action', actor: target.id, purpose: 'Slow boundary',
    }, () => 0.5)).toThrow('no Bonus Action available');

    let control = endTurn(twoCombatantEncounter(source, target), source);
    control = reduceEncounter(control, { type: 'dash', actor: target.id }, () => 0.5).state;
    expect(() => reduceEncounter(control, {
      type: 'spend_bonus_action', actor: target.id, purpose: 'ordinary turn boundary',
    }, () => 0.5)).not.toThrow();
  });

  it('slow_caps_the_Attack_action_at_one_attack', () => {
    // Slow permits only one attack with the Attack action: spell-descriptions.txt:7152-7153.
    const source = playerProfile('slow-attacks-source', { initiativeBonus: 20 });
    const target = monsterProfile('slow-attacks-target', { initiativeBonus: -20, attacksPerAction: 2 });
    let state = twoCombatantEncounter(source, target);
    state = applyEffect(state, source, target, slowPayload);
    state = endTurn(state, source);
    state = reduceEncounter(state, attack(target, source), d20Faces(20)).state;
    expect(() => reduceEncounter(state, attack(target, source), d20Faces(20))).toThrow('no attack available');

    let control = endTurn(twoCombatantEncounter(source, target), source);
    control = reduceEncounter(control, attack(target, source), d20Faces(20)).state;
    expect(() => reduceEncounter(control, attack(target, source), d20Faces(20))).not.toThrow();
  });

  it('slow_somatic_d20_fails_on_5_and_succeeds_on_6_while_verbal_only_skips_the_check', () => {
    // A Somatic spell has a 25% failure chance: spell-descriptions.txt:7153-7156.
    const source = playerProfile('slow-spell-source', { initiativeBonus: 20 });
    const target = monsterProfile('slow-spell-target', { initiativeBonus: -20 });
    const somatic = (actor: CombatantProfile): SpellCastCommand => ({
      type: 'cast_spell', actor: actor.id, spellId: 'guidance', slotLevel: null,
      castAsRitual: false, casterLevel: 5, attackBonus: 5, saveDc: 12,
      spellcastingModifier: 3, targets: [actor.id], area: null, weaponAttack: null,
      selectedOption: 'Arcana',
    });
    const prepared = (): EncounterState => {
      let state = twoCombatantEncounter(source, target);
      state = applyEffect(state, source, target, slowPayload);
      return endTurn(state, source);
    };
    const failed = reduceEncounter(prepared(), somatic(target), d20Faces(5));
    const succeeded = reduceEncounter(prepared(), somatic(target), d20Faces(6));
    expect(failed.events).toContainEqual(expect.objectContaining({
      type: 'slow_spellcasting_checked', roll: 5, failureMaximum: 5, outcome: 'spell_failed',
    }));
    expect(failed.state.effects.some((effect) => effect.payload.kind === 'ability_check_modifier')).toBe(false);
    expect(succeeded.events).toContainEqual(expect.objectContaining({
      type: 'slow_spellcasting_checked', roll: 6, outcome: 'spell_succeeded',
    }));
    expect(succeeded.state.effects.some((effect) => effect.payload.kind === 'ability_check_modifier')).toBe(true);

    const verbalCaster = playerProfile('slow-verbal-caster', {
      initiativeBonus: -20, spellSlots: [{ level: 1, maximum: 1 }],
    });
    const verbalSource = monsterProfile('slow-verbal-source', { initiativeBonus: 20 });
    let verbalState = twoCombatantEncounter(verbalSource, verbalCaster);
    verbalState = applyEffect(verbalState, verbalSource, verbalCaster, slowPayload);
    verbalState = endTurn(verbalState, verbalSource);
    const verbal = reduceEncounter(verbalState, {
      type: 'cast_spell', actor: verbalCaster.id, spellId: 'command', slotLevel: 1,
      castAsRitual: false, casterLevel: 5, attackBonus: 5, saveDc: 100,
      spellcastingModifier: 3, targets: [verbalSource.id], area: null,
      weaponAttack: null, selectedOption: 'halt',
    }, d20Faces(1));
    expect(verbal.events.some((event) => event.type === 'slow_spellcasting_checked')).toBe(false);
    expect(verbal.events.some((event) => event.type === 'spell_cast' && event.spellId === 'command')).toBe(true);
  });
});

describe('D386.2 Spirit Guardians recurring damage', () => {
  function spiritGuardiansState(targetHitPoints = 30, selectedOption: 'Radiant' | 'Necrotic' = 'Radiant') {
    const caster = playerProfile('guardians-caster', {
      initiativeBonus: 20, spellSlots: [{ level: 3, maximum: 1 }],
    });
    const target = monsterProfile('guardians-target', { hitPoints: targetHitPoints, initiativeBonus: -20 });
    let state = twoCombatantEncounter(caster, target, 0, 3, 8);
    const command: SpellCastCommand = {
      type: 'cast_spell', actor: caster.id, spellId: 'spirit-guardians', slotLevel: 3,
      castAsRitual: false, casterLevel: 5, attackBonus: 5, saveDc: 100,
      spellcastingModifier: 4, targets: [], area: {
        shape: 'emanation', template: { origin: feetPoint(0, 0), radius: feet(15), includeOrigin: true },
      }, weaponAttack: null, selectedOption,
    };
    const cast = reduceEncounter(state, command, () => 0);
    state = cast.state;
    return { caster, target, state, cast };
  }

  it('spirit_guardians_cast_entry_damage_changes_the_fight_outcome_and_halves_speed_inside', () => {
    // Emanation entry, save-half damage, and halved Speed: spell-descriptions.txt:7338-7350.
    const result = spiritGuardiansState(3);
    expect(combatantState(result.state, result.target).life).toBe('dead');

    const living = spiritGuardiansState(30);
    const targetTurn = endTurn(living.state, living.caster);
    expect(combatantState(targetTurn, living.target).turn.movement.speed).toBe(15);
  });

  it('sg_damages_twice_per_turn mutation is killed: re-entry and end-turn share one target-turn gate', () => {
    // Entry and end-turn saves occur only once per turn: spell-descriptions.txt:7342-7350.
    const fixture = spiritGuardiansState(30);
    let state = endTurn(fixture.state, fixture.caster);
    state = reduceEncounter(state, {
      type: 'move', actor: fixture.target.id,
      path: [{ column: 4, row: 0 }, { column: 3, row: 0 }], cause: 'voluntary',
    }, () => 0).state;
    const beforeEnd = combatantState(state, fixture.target).hitPoints;
    const ended = reduceEncounter(state, { type: 'end_turn', actor: fixture.target.id }, () => 0);
    expect(beforeEnd).toBe(24);
    expect(combatantState(ended.state, fixture.target).hitPoints).toBe(24);
    expect(ended.events.some((event) => event.type === 'damage_applied' && event.target === fixture.target.id)).toBe(false);
  });

  it('spirit_guardians_end_turn_boundary_damages_when_no_entry_occurred_on_that_turn', () => {
    // 2024 SRD says the creature saves when it ends its turn there: spell-descriptions.txt:7346-7350.
    const fixture = spiritGuardiansState(30, 'Necrotic');
    const targetTurn = endTurn(fixture.state, fixture.caster);
    const ended = reduceEncounter(targetTurn, { type: 'end_turn', actor: fixture.target.id }, () => 0);
    expect(combatantState(targetTurn, fixture.target).hitPoints).toBe(27);
    expect(combatantState(ended.state, fixture.target).hitPoints).toBe(24);
  });
});

describe('D386.2 Command turn compulsion', () => {
  it('command_flee_ignored mutation is killed: Flee moves away and spends the target turn', () => {
    // Flee spends the turn moving away by the fastest available means: spell-descriptions.txt:1234-1235.
    const fixture = commandTurn('flee', 1, 2);
    expect(position(fixture.state, fixture.target).column).toBe(14);
    expect(combatantState(fixture.state, fixture.target).turn).toMatchObject({
      action: { kind: 'spent' }, bonusActionAvailable: false,
      movement: { remaining: 0 },
    });
    const controlSource = playerProfile('command-flee-control-source', { initiativeBonus: 20 });
    const controlTarget = monsterProfile('command-flee-control-target', { initiativeBonus: -20 });
    const control = endTurn(twoCombatantEncounter(controlSource, controlTarget, 1, 2, 10), controlSource);
    expect(position(control, controlTarget).column).toBe(2);
    expect(combatantState(control, controlTarget).turn.action.kind).toBe('available');
  });

  it('Approach_uses_the_shortest_direct_route_and_ends_within_5_feet', () => {
    // Approach uses the shortest, most direct route and ends the turn within 5 feet: spell-descriptions.txt:1229-1231.
    const fixture = commandTurn('approach');
    expect(position(fixture.state, fixture.target)).toEqual({ column: 1, row: 0 });
    expect(combatantState(fixture.state, fixture.target).turn.action.kind).toBe('spent');
  });

  it('Grovel_applies_Prone_and_Halt_forbids_movement_action_and_bonus_action', () => {
    // Grovel and Halt: spell-descriptions.txt:1236-1239.
    const grovel = commandTurn('grovel');
    expect(grovel.state.effects.some((effect) =>
      effect.targets.includes(grovel.target.id) && effect.payload.kind === 'condition' && effect.payload.condition === 'Prone')).toBe(true);
    const halt = commandTurn('halt');
    expect(position(halt.state, halt.target)).toEqual({ column: 6, row: 0 });
    expect(combatantState(halt.state, halt.target).turn).toMatchObject({
      action: { kind: 'spent' }, bonusActionAvailable: false, movement: { remaining: 0 },
    });
  });

  it('Drop_drops_every_held_item_and_ends_the_turn', () => {
    // Drop drops whatever the target is holding and then ends its turn: spell-descriptions.txt:1232-1233.
    const source = playerProfile('command-drop-source', { initiativeBonus: 20 });
    const target = monsterProfile('command-drop-target', { initiativeBonus: -20 });
    const sword = itemId('greenforge:command-sword');
    const content = commandItemPack();
    const equipment: CombatantEquipment = {
      combatant: target.id, hands: { kind: 'one_handed', items: [sword] }, worn: [], carried: [],
    };
    let state = createEncounter({
      bounds: { columns: 5, rows: 1 }, combatants: [source, target],
      tokens: [placedToken(source, 0), placedToken(target, 3)], contentPacks: [content], equipment: [equipment],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    state = applyEffect(state, source, target, commandPayload('drop'));
    state = endTurn(state, source);
    expect(state.groundItems).toEqual([{ item: sword, position: { column: 3, row: 0 } }]);
    expect(state.equipment?.find((entry) => entry.combatant === target.id)?.hands).toEqual({ kind: 'empty' });
    expect(combatantState(state, target).turn.action.kind).toBe('spent');
  });
});

function commandItemPack(): LoadedContentPack {
  const base = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly [key: string]: unknown;
  };
  const result = loadContentPack({
    ...base,
    items: [{
      sourceId: 'greenforge', recordId: 'command-sword', name: 'Command Sword',
      equip: { kind: 'held', handCapacity: 1, droppable: true },
      materials: [{ kind: 'known', name: 'metal' }],
    }],
  });
  if (result.status !== 'loaded') throw new Error(`Command item pack refused: ${result.refusal.reason}`);
  return result.content;
}

function sized(profile: CombatantProfile, sizeCategory: NonNullable<CombatantProfile['rules']['sizeCategory']>): CombatantProfile {
  return { ...profile, rules: { ...profile.rules, sizeCategory } };
}

describe('D386.2 path-reservation body blocking', () => {
  it('end_in_occupied_cell_allowed mutation is killed while forced movement pins the willingly boundary', () => {
    // A creature can't willingly end in another creature's space: docs/srd/full/srd-5.2.1.txt:867-871.
    const mover = playerProfile('occupied-mover', { initiativeBonus: 20 });
    const ally = playerProfile('occupied-ally', { initiativeBonus: -20 });
    const state = twoCombatantEncounter(mover, ally, 0, 1, 3);
    expect(() => reduceEncounter(state, {
      type: 'move', actor: mover.id, path: [{ column: 1, row: 0 }], cause: 'voluntary',
    }, () => 0.5)).toThrow('occupied_destination');
    expect(() => reduceEncounter(state, {
      type: 'move', actor: mover.id, path: [{ column: 1, row: 0 }], cause: 'forced',
    }, () => 0.5)).not.toThrow();
  });

  it('hostile_equal_size_blocks_but_ally_incapacitated_Tiny_and_two_size_difference_pin_passage_rules', () => {
    // Passage and creature-space terrain: docs/srd/full/srd-5.2.1.txt:859-866.
    const mover = sized(playerProfile('space-mover'), 'Medium');
    const hostile = sized(monsterProfile('space-hostile'), 'Medium');
    const hostileState = createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [mover, hostile],
      tokens: [placedToken(mover, 0), placedToken(hostile, 1)],
    });
    expect(encounterMovementWorld(hostileState).traversal(mover.id, { column: 0, row: 0 }, { column: 1, row: 0 })).toEqual({
      kind: 'blocked', reason: 'creature space cannot be traversed',
    });

    const ally = sized(playerProfile('space-ally'), 'Medium');
    const allyState = createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [mover, ally],
      tokens: [placedToken(mover, 0), placedToken(ally, 1)],
    });
    expect(encounterMovementWorld(allyState).traversal(mover.id, { column: 0, row: 0 }, { column: 1, row: 0 })).toEqual({
      kind: 'enterable', cost: 5, canEnd: false,
    });

    const tiny = sized(monsterProfile('space-tiny'), 'Tiny');
    const tinyState = createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [mover, tiny],
      tokens: [placedToken(mover, 0), placedToken(tiny, 1)],
    });
    expect(encounterMovementWorld(tinyState).traversal(mover.id, { column: 0, row: 0 }, { column: 1, row: 0 })).toEqual({
      kind: 'enterable', cost: 5, canEnd: false,
    });

    const huge = sized(monsterProfile('space-huge'), 'Huge');
    const hugeState = createEncounter({
      bounds: { columns: 4, rows: 3 }, combatants: [mover, huge],
      tokens: [placedToken(mover, 0), placedToken(huge, 1)],
    });
    expect(encounterMovementWorld(hugeState).traversal(mover.id, { column: 0, row: 0 }, { column: 1, row: 0 })).toEqual({
      kind: 'enterable', cost: 10, canEnd: false,
    });

    const incapacitated = applyEffect(
      reduceEncounter(hostileState, { type: 'roll_initiative' }, () => 0.5).state,
      mover,
      hostile,
      { kind: 'condition', condition: 'Incapacitated' },
    );
    expect(encounterMovementWorld(incapacitated).traversal(mover.id, { column: 0, row: 0 }, { column: 1, row: 0 })).toEqual({
      kind: 'enterable', cost: 10, canEnd: false,
    });
  });

  it('body_blocking_changes_the_fight_path_from_reachable_to_unreachable_without_inventing_zone_of_control', () => {
    // Only occupied-space passage blocks this path; adjacency creates no RAW zone of control:
    // docs/srd/full/srd-5.2.1.txt:859-871.
    const mover = sized(playerProfile('body-block-mover'), 'Medium');
    const open = createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [mover],
      tokens: [placedToken(mover, 0)],
    });
    expect(findPath(encounterMovementWorld(open), {
      actorId: mover.id, start: { column: 0, row: 0 }, goal: { column: 2, row: 0 }, maximumCost: feet(30),
    }).kind).toBe('found');

    const blocker = sized(monsterProfile('body-block-hostile'), 'Medium');
    const blocked = createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [mover, blocker],
      tokens: [placedToken(mover, 0), placedToken(blocker, 1)],
    });
    expect(findPath(encounterMovementWorld(blocked), {
      actorId: mover.id, start: { column: 0, row: 0 }, goal: { column: 2, row: 0 }, maximumCost: feet(30),
    })).toEqual({ kind: 'unreachable' });
    expect(encounterMovementWorld(blocked).traversal(mover.id, { column: 0, row: 0 }, { column: 0, row: 0 })).toMatchObject({
      kind: 'enterable', cost: 5,
    });
  });
});
