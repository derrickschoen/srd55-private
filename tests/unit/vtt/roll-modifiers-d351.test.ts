import { describe, expect, it } from 'vitest';
import { declareTestInputs } from '../../helpers/test-inputs';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterEvent } from '../../../src/combat/events';
import type { Rng } from '../../../src/combat/random';
import type { ModifierDuration, RollDefenseModifierOperation, SpellOperation } from '../../../src/combat/spells/types';
import { damageType, dieSides } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const { readText: readFileSync } = declareTestInputs({
  fixtures: ['tests/fixtures/content-pack-v1-homebrew.json'],
}).fixtures;

const concentration: ModifierDuration = { kind: 'fixed_rounds_or_concentration', rounds: 10, expiresAt: 'target_end' };
const tenRounds: ModifierDuration = { kind: 'fixed_rounds', rounds: 10, expiresAt: 'target_end' };

function modifier(
  input: Omit<RollDefenseModifierOperation, 'kind'>,
): RollDefenseModifierOperation {
  return { kind: 'roll_defense_modifier', ...input } as RollDefenseModifierOperation;
}

function packWithSpells(specs: readonly { readonly id: string; readonly operation: SpellOperation }[]): LoadedContentPack {
  const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = fixture.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  const loaded = loadContentPack({
    ...fixture,
    spells: specs.map(({ id, operation }) => ({
      ...template, recordId: id, name: id, level: 0,
      duration: { kind: 'rounds', rounds: 10 },
      targeting: { kind: 'single', rangeFeet: 150, willing: true },
      operation,
    })),
  });
  if (loaded.status !== 'loaded') throw new Error(`D351 content pack refused: ${loaded.refusal.reason}`);
  return loaded.content;
}

function started(pack: LoadedContentPack, combatants: readonly CombatantProfile[]): EncounterState {
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' }, bounds: { columns: 16, rows: 2 },
    combatants, tokens: combatants.map((profile, index) => placedToken(profile, index)),
    contentPacks: [pack],
  }), { type: 'roll_initiative' }, () => 0.475).state;
}

function cast(state: EncounterState, actor: CombatantProfile, target: CombatantProfile, id: string): EncounterState {
  return reduceEncounter(state, {
    type: 'cast_spell', actor: actor.id, spellId: `greenforge:${id}`, slotLevel: null,
    castAsRitual: false, casterLevel: 5, attackBonus: 7, saveDc: 15,
    spellcastingModifier: 4, targets: [target.id], area: null, weaponAttack: null,
    selectedOption: null,
  }, () => 0).state;
}

function endTurn(state: EncounterState, actor: CombatantProfile): EncounterState {
  return reduceEncounter(state, { type: 'end_turn', actor: actor.id }, () => 0).state;
}

function rngFaces(...faces: readonly { readonly face: number; readonly sides: number }[]): Rng {
  let index = 0;
  return () => {
    const next = faces[index];
    if (next === undefined) throw new Error('Test RNG exhausted.');
    index += 1;
    return (next.face - 0.5) / next.sides;
  };
}

function attack(
  state: EncounterState,
  actor: CombatantProfile,
  target: CombatantProfile,
  rng: Rng,
  rollModifierEffectIds?: readonly import('../../../src/combat/values').EncounterEffectId[],
) {
  return reduceEncounter(state, {
    type: 'attack', actor: actor.id, target: target.id, attackBonus: 0, criticalFloor: 20,
    rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    ...(rollModifierEffectIds === undefined ? {} : { rollModifierEffectIds }), damage: {
      terms: [{ type: damageType('Force'), dice: { count: 0, sides: dieSides(4), modifier: 1 } }],
      critical: false, responses: [],
    },
  }, rng);
}

function attackEvent(events: readonly EncounterEvent[]) {
  const event = events.find((candidate) => candidate.type === 'attack_resolved');
  if (event?.type !== 'attack_resolved') throw new Error('Attack did not resolve.');
  return event;
}

function saveEvent(events: readonly EncounterEvent[]) {
  const event = events.find((candidate) => candidate.type === 'save_resolved');
  if (event?.type !== 'save_resolved') throw new Error('Save did not resolve.');
  return event;
}

const bless = modifier({
  scopes: ['attack_rolls_made', 'saving_throws'], eligibility: { kind: 'effect_targets' },
  duration: concentration, consumption: 'duration',
  modifier: { kind: 'die_rider', count: 1, sides: 4, sign: 1 },
});

describe('D351 imported roll/defense modifier lever', () => {
  it('bless_shape_thresholds: a fresh d4 changes both an attack miss and a saving-throw failure into success', () => {
    // Bless: docs/srd/source/spell-descriptions.txt:824-837.
    const pack = packWithSpells([{ id: 'bless-shape', operation: bless }]);
    const caster = playerProfile('d351-bless-caster', { initiativeBonus: 30 });
    const enemy = monsterProfile('d351-bless-enemy', { initiativeBonus: 20, hitPoints: 20 });
    const ally = playerProfile('d351-bless-ally', { initiativeBonus: 10 });

    const noBless = started(pack, [caster, enemy, ally]);
    const noBlessAttack = attack(endTurn(endTurn(noBless, caster), enemy), ally, enemy, rngFaces({ face: 11, sides: 20 }));
    expect(attackEvent(noBlessAttack.events).attack).toMatchObject({ outcome: 'miss', total: 11 });

    let state = cast(started(pack, [caster, enemy, ally]), caster, ally, 'bless-shape');
    state = endTurn(state, caster);
    const save = reduceEncounter(state, {
      type: 'force_save', actor: enemy.id, target: ally.id, ability: 'wisdom', dc: 15,
      rollMode: 'normal', cost: 'none', onSuccess: 'none',
      damage: { terms: [], critical: false, responses: [] },
    }, rngFaces({ face: 4, sides: 4 }, { face: 11, sides: 20 }));
    expect(saveEvent(save.events).save).toMatchObject({ outcome: 'success', total: 15 });
    state = endTurn(save.state, enemy);
    const blessedAttack = attack(state, ally, enemy, rngFaces({ face: 4, sides: 4 }, { face: 11, sides: 20 }));
    expect(attackEvent(blessedAttack.events).attack).toMatchObject({ outcome: 'hit', total: 15 });
  });

  it('rider_precomputed: two qualifying rolls draw observably different d4 faces instead of reusing a cast-time value', () => {
    const pack = packWithSpells([{ id: 'fresh-rider-shape', operation: bless }]);
    const caster = playerProfile('d351-fresh-caster', { initiativeBonus: 30 });
    const target = playerProfile('d351-fresh-target', { initiativeBonus: 20 });
    const enemy = monsterProfile('d351-fresh-enemy', { initiativeBonus: 10, hitPoints: 20 });
    let state = cast(started(pack, [caster, target, enemy]), caster, target, 'fresh-rider-shape');
    state = endTurn(state, caster);
    expect(attackEvent(attack(state, target, enemy, rngFaces(
      { face: 1, sides: 4 }, { face: 11, sides: 20 },
    )).events).attack.total).toBe(12);
    expect(attackEvent(attack(state, target, enemy, rngFaces(
      { face: 4, sides: 4 }, { face: 11, sides: 20 },
    )).events).attack.total).toBe(15);
  });

  it('bane_save_negates_and_penalty_sign: success creates no modifier; failure subtracts d4 across the attack threshold', () => {
    // Bane: docs/srd/source/spell-descriptions.txt:670-681.
    const bane = modifier({
      scopes: ['attack_rolls_made', 'saving_throws'], eligibility: { kind: 'effect_targets' },
      duration: concentration, consumption: 'duration',
      modifier: { kind: 'die_rider', count: 1, sides: 4, sign: -1 },
    });
    const operation: SpellOperation = {
      kind: 'shared_outcome', delivery: { kind: 'save', ability: 'charisma', rollMode: 'normal' },
      onFailure: [bane], onSuccess: [],
    };
    const pack = packWithSpells([{ id: 'bane-shape', operation }]);
    const caster = playerProfile('d351-bane-caster', { initiativeBonus: 30 });
    const target = monsterProfile('d351-bane-target', { initiativeBonus: 20, hitPoints: 20 });
    const defender = playerProfile('d351-bane-defender', { initiativeBonus: 10 });

    const saved = reduceEncounter(started(pack, [caster, target, defender]), {
      type: 'cast_spell', actor: caster.id, spellId: 'greenforge:bane-shape', slotLevel: null,
      castAsRitual: false, casterLevel: 5, attackBonus: 7, saveDc: 15, spellcastingModifier: 4,
      targets: [target.id], area: null, weaponAttack: null, selectedOption: null,
    }, rngFaces({ face: 15, sides: 20 }));
    expect(saved.state.effects.some((effect) => effect.payload.kind === 'roll_defense_modifier')).toBe(false);

    const failed = reduceEncounter(started(pack, [caster, target, defender]), {
      type: 'cast_spell', actor: caster.id, spellId: 'greenforge:bane-shape', slotLevel: null,
      castAsRitual: false, casterLevel: 5, attackBonus: 7, saveDc: 15, spellcastingModifier: 4,
      targets: [target.id], area: null, weaponAttack: null, selectedOption: null,
    }, rngFaces({ face: 10, sides: 20 }));
    const targetTurn = endTurn(failed.state, caster);
    const penalized = attack(targetTurn, target, defender, rngFaces({ face: 4, sides: 4 }, { face: 16, sides: 20 }));
    expect(attackEvent(penalized.events).attack).toMatchObject({ outcome: 'miss', total: 12 });
  });

  it('shield_of_faith_ac_threshold: +2 AC flips an exact numeric edge', () => {
    // Shield of Faith: docs/srd/source/spell-descriptions.txt:6956-6966.
    const pack = packWithSpells([{ id: 'shield-faith-shape', operation: modifier({
      scopes: ['armor_class'], eligibility: { kind: 'effect_targets' }, duration: concentration,
      consumption: 'duration', modifier: { kind: 'flat', amount: 2 },
    }) }]);
    const caster = playerProfile('d351-sof-caster', { initiativeBonus: 30 });
    const attacker = playerProfile('d351-sof-attacker', { initiativeBonus: 20 });
    const target = playerProfile('d351-sof-target', { initiativeBonus: 10 });
    const unwarded = attack(endTurn(started(pack, [caster, attacker, target]), caster), attacker, target, rngFaces({ face: 15, sides: 20 }));
    expect(attackEvent(unwarded.events).attack.outcome).toBe('hit');
    let wardedState = cast(started(pack, [caster, attacker, target]), caster, target, 'shield-faith-shape');
    wardedState = endTurn(wardedState, caster);
    expect(attackEvent(attack(wardedState, attacker, target, rngFaces({ face: 15, sides: 20 })).events).attack.outcome).toBe('miss');
  });

  it('guidance_consumed_on_first_use: the first distinguishing check gets d4, the second gets nothing, and the instance ends', () => {
    const pack = packWithSpells([{ id: 'guidance-shape', operation: modifier({
      scopes: ['ability_checks'], eligibility: { kind: 'effect_targets' }, duration: tenRounds,
      consumption: 'first_qualifying_roll', modifier: { kind: 'die_rider', count: 1, sides: 4, sign: 1 },
    }) }]);
    const caster = playerProfile('d351-guidance-caster', { initiativeBonus: 30 });
    const target = playerProfile('d351-guidance-target', { initiativeBonus: 20 });
    let state = cast(started(pack, [caster, target]), caster, target, 'guidance-shape');
    state = endTurn(state, caster);
    const first = reduceEncounter(state, {
      type: 'roll_ability_check', actor: target.id, ability: 'strength', skill: 'athletics',
      bonus: 0, dc: 14, rollMode: 'normal', cost: 'none',
    }, rngFaces({ face: 4, sides: 4 }, { face: 10, sides: 20 }));
    expect(first.events).toContainEqual(expect.objectContaining({
      type: 'ability_check_resolved', check: expect.objectContaining({ outcome: 'success', total: 14 }),
    }));
    expect(first.state.effects.some((effect) => effect.payload.kind === 'roll_defense_modifier')).toBe(false);
    const second = reduceEncounter(first.state, {
      type: 'roll_ability_check', actor: target.id, ability: 'strength', skill: 'athletics',
      bonus: 0, dc: 14, rollMode: 'normal', cost: 'none',
    }, rngFaces({ face: 10, sides: 20 }));
    expect(second.events).toContainEqual(expect.objectContaining({
      type: 'ability_check_resolved', check: expect.objectContaining({ outcome: 'failure', total: 10 }),
    }));
  });

  it('movement_conditional_flat_adjustment: +3 before moving, +1 after, restored at the start of its next turn', () => {
    const pack = packWithSpells([{ id: 'carapace-ward-shape', operation: modifier({
      scopes: ['armor_class'], eligibility: { kind: 'effect_targets' }, duration: tenRounds,
      consumption: 'duration', modifier: { kind: 'flat', amount: 3 },
      eventTrigger: {
        kind: 'event_trigger', hook: 'effect_target_moves', flatAdjustment: -2,
        duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'target_start' },
      },
    }) }]);
    const caster = playerProfile('d351-shell-caster', { initiativeBonus: 30 });
    const attacker = playerProfile('d351-shell-attacker', { initiativeBonus: 20 });
    const target = playerProfile('d351-shell-target', { initiativeBonus: 10 });
    let state = cast(started(pack, [caster, attacker, target]), caster, target, 'carapace-ward-shape');
    state = endTurn(state, caster);
    const before = attack(state, attacker, target, rngFaces({ face: 16, sides: 20 }));
    expect(attackEvent(before.events).attack.outcome).toBe('miss');
    state = endTurn(before.state, attacker);
    state = reduceEncounter(state, {
      type: 'move', actor: target.id, path: [{ column: 3, row: 0 }], cause: 'voluntary',
    }, () => 0).state;
    state = endTurn(state, target);
    state = endTurn(state, caster);
    const downgraded = attack(state, attacker, target, rngFaces({ face: 16, sides: 20 }));
    expect(attackEvent(downgraded.events).attack.outcome).toBe('hit');
    state = endTurn(downgraded.state, attacker);
    state = endTurn(state, target);
    state = endTurn(state, caster);
    const restored = attack(state, attacker, target, rngFaces({ face: 16, sides: 20 }));
    expect(attackEvent(restored.events).attack.outcome).toBe('miss');
  });

  it('foresight_modes: target attacks with advantage and attacks against it have disadvantage using distinguishing dice', () => {
    const pack = packWithSpells([{ id: 'foresight-shape', operation: {
      kind: 'composition', ordering: 'declaration_order', onRefusal: 'abort', steps: [
        { targetResolution: { kind: 'inherit' }, operation: modifier({
          scopes: ['attack_rolls_made', 'saving_throws', 'ability_checks'],
          eligibility: { kind: 'effect_targets' }, duration: tenRounds, consumption: 'duration',
          modifier: { kind: 'roll_mode', mode: 'advantage' },
        }) },
        { targetResolution: { kind: 'inherit' }, operation: modifier({
          scopes: ['attack_rolls_against'], eligibility: { kind: 'effect_targets' },
          duration: tenRounds, consumption: 'duration',
          modifier: { kind: 'roll_mode', mode: 'disadvantage' },
        }) },
      ],
    } }]);
    const caster = playerProfile('d351-foresight-caster', { initiativeBonus: 30 });
    const target = playerProfile('d351-foresight-target', { initiativeBonus: 20 });
    const enemy = monsterProfile('d351-foresight-enemy', { initiativeBonus: 10, hitPoints: 30 });
    let state = cast(started(pack, [caster, target, enemy]), caster, target, 'foresight-shape');
    state = endTurn(state, caster);
    const outgoing = attack(state, target, enemy, rngFaces({ face: 4, sides: 20 }, { face: 16, sides: 20 }));
    expect(attackEvent(outgoing.events).attack.roll).toMatchObject({ mode: 'advantage', faces: [4, 16], chosen: 16 });
    state = endTurn(outgoing.state, target);
    const incoming = attack(state, enemy, target, rngFaces({ face: 4, sides: 20 }, { face: 16, sides: 20 }));
    expect(attackEvent(incoming.events).attack.roll).toMatchObject({ mode: 'disadvantage', faces: [4, 16], chosen: 4 });
  });

  it('conditional_scope_disadvantage_vs_others: target has disadvantage against others and rolls normally against the caster', () => {
    const pack = packWithSpells([{ id: 'duel-focus-shape', operation: modifier({
      scopes: ['attack_rolls_made'],
      eligibility: { kind: 'effect_targets_against_creatures_other_than_source' },
      duration: concentration, consumption: 'duration', modifier: { kind: 'roll_mode', mode: 'disadvantage' },
    }) }]);
    const caster = playerProfile('d351-duel-caster', { initiativeBonus: 30 });
    const target = monsterProfile('d351-duel-target', { initiativeBonus: 20, hitPoints: 30 });
    const other = playerProfile('d351-duel-other', { initiativeBonus: 10 });
    let state = cast(started(pack, [caster, target, other]), caster, target, 'duel-focus-shape');
    state = endTurn(state, caster);
    expect(attackEvent(attack(state, target, other, rngFaces(
      { face: 5, sides: 20 }, { face: 17, sides: 20 },
    )).events).attack.roll.mode).toBe('disadvantage');
    expect(attackEvent(attack(state, target, caster, rngFaces({ face: 10, sides: 20 })).events).attack.roll.mode).toBe('normal');
  });

  it('first_use_and_chosen_use_one_shots: first-use targeting is automatic while chosen-use waits for an explicit selection', () => {
    const trueStrike = modifier({
      scopes: ['attack_rolls_made'], eligibility: { kind: 'source_against_effect_targets' },
      duration: tenRounds, consumption: 'first_qualifying_roll',
      modifier: { kind: 'roll_mode', mode: 'advantage' },
    });
    const chosenUseRider = modifier({
      scopes: ['attack_rolls_made'], eligibility: { kind: 'effect_targets' }, duration: tenRounds,
      consumption: 'chosen_qualifying_roll', modifier: { kind: 'roll_mode', mode: 'advantage' },
    });
    const pack = packWithSpells([
      { id: 'true-strike-shape', operation: trueStrike },
      { id: 'chosen-use-rider-shape', operation: chosenUseRider },
    ]);
    const caster = playerProfile('d351-one-shot-caster', { initiativeBonus: 30 });
    const ally = playerProfile('d351-one-shot-ally', { initiativeBonus: 20 });
    const enemy = monsterProfile('d351-one-shot-enemy', { initiativeBonus: 10, hitPoints: 30 });

    let trueState = cast(started(pack, [caster, ally, enemy]), caster, enemy, 'true-strike-shape');
    trueState = endTurn(trueState, caster);
    trueState = endTurn(trueState, ally);
    trueState = endTurn(trueState, enemy);
    const trueAttack = attack(trueState, caster, enemy, rngFaces(
      { face: 3, sides: 20 }, { face: 15, sides: 20 },
    ));
    expect(attackEvent(trueAttack.events).attack.roll.mode).toBe('advantage');
    expect(trueAttack.state.effects.some((effect) => effect.payload.kind === 'roll_defense_modifier')).toBe(false);

    let chosenUseState = cast(started(pack, [caster, ally, enemy]), caster, ally, 'chosen-use-rider-shape');
    chosenUseState = endTurn(chosenUseState, caster);
    const effect = chosenUseState.effects.find((candidate) => candidate.payload.kind === 'roll_defense_modifier');
    if (effect === undefined) throw new Error('Chosen-use modifier was not created.');
    const unchosen = attack(chosenUseState, ally, enemy, rngFaces({ face: 12, sides: 20 }));
    expect(attackEvent(unchosen.events).attack.roll.mode).toBe('normal');
    expect(unchosen.state.effects.some((candidate) => candidate.id === effect.id)).toBe(true);
    const chosen = attack(chosenUseState, ally, enemy, rngFaces(
      { face: 3, sides: 20 }, { face: 15, sides: 20 },
    ), [effect.id]);
    expect(attackEvent(chosen.events).attack.roll.mode).toBe('advantage');
    expect(chosen.state.effects.some((candidate) => candidate.id === effect.id)).toBe(false);
  });

  it('moving_aura_roll_time_membership: exact 30 feet gets advantage and no half damage; after moving to 35 feet neither applies', () => {
    const circle = modifier({
      scopes: ['saving_throws'],
      eligibility: { kind: 'allies_within_aura', radiusFeet: 30, savingThrowCause: 'spell_or_magical_effect' },
      duration: concentration, consumption: 'duration', modifier: { kind: 'roll_mode', mode: 'advantage' },
      successfulSaveDamage: 'none_instead_of_half',
    });
    const blast: SpellOperation = {
      kind: 'save_damage', ability: 'dexterity', onSuccess: 'half', damageType: damageType('Fire'),
      dice: { baseCount: 1, sides: 4, modifier: 7, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
      riderOnFailure: null, pushFeetOnFailure: 0,
    };
    const pack = packWithSpells([{ id: 'circle-shape', operation: circle }, { id: 'aura-blast', operation: blast }]);
    const caster = playerProfile('d351-circle-caster', { initiativeBonus: 30 });
    const enemy = monsterProfile('d351-circle-enemy', { initiativeBonus: 20, hitPoints: 30 });
    const ally = playerProfile('d351-circle-ally', { initiativeBonus: 10, hitPoints: 30 });
    let state = started(pack, [caster, enemy, ally]);
    state = { ...state, tokens: state.tokens.map((entry) => entry.combatantId === ally.id
      ? { ...entry, position: { column: 6, row: 0 } }
      : entry) };
    state = cast(state, caster, caster, 'circle-shape');
    state = endTurn(state, caster);
    const inside = reduceEncounter(state, {
      type: 'cast_spell', actor: enemy.id, spellId: 'greenforge:aura-blast', slotLevel: null,
      castAsRitual: false, casterLevel: 5, attackBonus: 7, saveDc: 10, spellcastingModifier: 4,
      targets: [ally.id], area: null, weaponAttack: null, selectedOption: null,
    }, rngFaces({ face: 1, sides: 4 }, { face: 4, sides: 20 }, { face: 14, sides: 20 }));
    expect(saveEvent(inside.events).save.roll).toMatchObject({ mode: 'advantage', faces: [4, 14], chosen: 14 });
    expect(inside.state.combatants.find(({ profile }) => profile.id === ally.id)?.hitPoints).toBe(30);
    state = endTurn(inside.state, enemy);
    state = reduceEncounter(state, {
      type: 'move', actor: ally.id, path: [{ column: 7, row: 0 }], cause: 'voluntary',
    }, () => 0).state;
    state = endTurn(state, ally);
    state = endTurn(state, caster);
    const outside = reduceEncounter(state, {
      type: 'cast_spell', actor: enemy.id, spellId: 'greenforge:aura-blast', slotLevel: null,
      castAsRitual: false, casterLevel: 5, attackBonus: 7, saveDc: 10, spellcastingModifier: 4,
      targets: [ally.id], area: null, weaponAttack: null, selectedOption: null,
    }, rngFaces({ face: 1, sides: 4 }, { face: 14, sides: 20 }));
    expect(saveEvent(outside.events).save.roll).toMatchObject({ mode: 'normal', faces: [14], chosen: 14 });
    expect(outside.events).toContainEqual(expect.objectContaining({ type: 'damage_applied', amount: 4 }));
  });

  it('bless_without_concentration: concentration ends Bless mid-duration and same-name castings never add 2d4', () => {
    const pack = packWithSpells([{ id: 'bless-shape', operation: bless }]);
    const first = playerProfile('d351-stack-first', { initiativeBonus: 40 });
    const second = playerProfile('d351-stack-second', { initiativeBonus: 30 });
    const target = playerProfile('d351-stack-target', { initiativeBonus: 20 });
    const enemy = monsterProfile('d351-stack-enemy', { initiativeBonus: 10, hitPoints: 30 });

    let dropped = cast(started(pack, [first, target, enemy]), first, target, 'bless-shape');
    dropped = reduceEncounter(dropped, { type: 'end_concentration', actor: first.id }, () => 0).state;
    dropped = endTurn(dropped, first);
    const noLongerBlessed = attack(dropped, target, enemy, rngFaces({ face: 11, sides: 20 }));
    expect(attackEvent(noLongerBlessed.events).attack).toMatchObject({ outcome: 'miss', total: 11 });

    let stacked = cast(started(pack, [first, second, target, enemy]), first, target, 'bless-shape');
    stacked = endTurn(stacked, first);
    stacked = cast(stacked, second, target, 'bless-shape');
    expect(stacked.effects.filter((effect) => effect.payload.kind === 'roll_defense_modifier')).toHaveLength(1);
    stacked = endTurn(stacked, second);
    const once = attack(stacked, target, enemy, rngFaces({ face: 4, sides: 4 }, { face: 11, sides: 20 }));
    expect(attackEvent(once.events).attack).toMatchObject({ outcome: 'hit', total: 15 });
  });
});
