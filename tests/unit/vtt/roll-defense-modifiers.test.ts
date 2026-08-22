import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  ROLL_MODIFIER_ORDER,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import type { Rng } from '../../../src/combat/random';
import type { ModifierDuration, SpellOperation } from '../../../src/combat/spells/types';
import { damageType, dieSides } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SpellSpec {
  readonly id: string;
  readonly operation: SpellOperation;
}

type ArmorClassModification = Extract<SpellOperation, { readonly kind: 'armor_class_modifier' }>['modification'];
type ImpossibleFloorBonus = Extract<ArmorClassModification, {
  readonly kind: 'bonus'; readonly minimum: number;
}>;
const acFloorAndBonusAreUninhabitable: [ImpossibleFloorBonus] extends [never] ? true : never = true;
void acFloorAndBonusAreUninhabitable;

const twoRounds: ModifierDuration = { kind: 'fixed_rounds', rounds: 2, expiresAt: 'target_end' };

function packWithSpells(specs: readonly SpellSpec[]): LoadedContentPack {
  const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = fixture.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  const loaded = loadContentPack({
    ...fixture,
    spells: specs.map(({ id, operation }) => ({
      ...template,
      recordId: id,
      name: id,
      level: 0,
      duration: { kind: 'rounds', rounds: 10 },
      targeting: { kind: 'single', rangeFeet: 150, willing: true },
      operation,
    })),
  });
  if (loaded.status !== 'loaded') throw new Error(`Roll-defense fixture refused: ${loaded.refusal.reason}`);
  return loaded.content;
}

function started(pack: LoadedContentPack, combatants: readonly CombatantProfile[]): EncounterState {
  return reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: 12, rows: 2 },
    combatants,
    tokens: combatants.map((profile, index) => placedToken(profile, index)),
    contentPacks: [pack],
  }), { type: 'roll_initiative' }, () => 0.475).state;
}

function cast(
  state: EncounterState,
  actor: CombatantProfile,
  target: CombatantProfile,
  id: string,
  selectedOption: string | null = null,
  modifierSource?: CombatantProfile,
): EncounterState {
  return reduceEncounter(state, {
    type: 'cast_spell', actor: actor.id, spellId: `greenforge:${id}`, slotLevel: null,
    castAsRitual: false, casterLevel: 5, attackBonus: 8, saveDc: 15,
    spellcastingModifier: 4, targets: [target.id], area: null, weaponAttack: null,
    selectedOption,
    ...(modifierSource === undefined ? {} : { modifierSource: modifierSource.id }),
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
  attackBonus = 0,
): { readonly state: EncounterState; readonly events: readonly EncounterEvent[] } {
  return reduceEncounter(state, {
    type: 'attack', actor: actor.id, target: target.id, attackBonus, criticalFloor: 20,
    rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    damage: {
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

function fixedDamage(amount: number, type = damageType('Force')): SpellOperation {
  return {
    kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 1,
    packets: [{
      damageType: { kind: 'fixed', damageType: type },
      dice: { baseCount: 0, sides: 4, modifier: amount, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
      scaling: { kind: 'none' }, thresholdRider: null,
    }],
    timing: { kind: 'immediate' },
  };
}

describe('CAP-IMP-013 imported roll and defense modifiers', () => {
  it('roll_dice_faces_and_order: Bless/Bane use the lowest and highest faces in stable pre-d20 order, while Guidance is skill-selected', () => {
    // Bless/Bane: spell-descriptions.txt:670-681,824-837. Guidance: spell-descriptions.txt:4000-4009.
    const pack = packWithSpells([
      {
        id: 'bless-like', operation: {
          kind: 'roll_dice_modifier', application: 'every_qualifying_roll',
          tests: ['attack_roll', 'saving_throw'], die: { count: 1, sides: 4 }, sign: 1, duration: twoRounds,
        },
      },
      {
        id: 'bane-like', operation: {
          kind: 'roll_dice_modifier', application: 'every_qualifying_roll',
          tests: ['attack_roll', 'saving_throw'], die: { count: 1, sides: 4 }, sign: -1, duration: twoRounds,
        },
      },
      {
        id: 'guidance-like', operation: {
          kind: 'roll_dice_modifier', application: 'chosen_skill_checks',
          skill: { kind: 'chosen_when_cast', options: ['athletics', 'acrobatics'] },
          die: { count: 1, sides: 4 }, sign: 1, duration: twoRounds,
        },
      },
    ]);
    const blessing = playerProfile('roll-order-blessing', { initiativeBonus: 40 });
    const baning = playerProfile('roll-order-baning', { initiativeBonus: 30 });
    const guided = playerProfile('roll-order-guided', { initiativeBonus: 20 });
    const defender = monsterProfile('roll-order-defender', { initiativeBonus: -20, hitPoints: 20 });
    let state = started(pack, [blessing, baning, guided, defender]);
    state = cast(state, blessing, guided, 'bless-like');
    state = endTurn(state, blessing);
    state = cast(state, baning, guided, 'bane-like');
    state = endTurn(state, baning);
    const ordered = attack(state, guided, defender, rngFaces(
      { face: 1, sides: 4 }, { face: 4, sides: 4 }, { face: 12, sides: 20 },
    ), 3);
    expect(attackEvent(ordered.events).attack).toMatchObject({ total: 12, outcome: 'hit' });
    expect(ROLL_MODIFIER_ORDER).toBe('created_revision_then_effect_id_before_d20');

    const guidanceState = cast(started(pack, [blessing, guided]), blessing, guided, 'guidance-like', 'athletics');
    const athletics = reduceEncounter(endTurn(guidanceState, blessing), {
      type: 'roll_ability_check', actor: guided.id, ability: 'strength', skill: 'athletics',
      bonus: 0, dc: 14, rollMode: 'normal', cost: 'none',
    }, rngFaces({ face: 4, sides: 4 }, { face: 10, sides: 20 }));
    const acrobatics = reduceEncounter(endTurn(guidanceState, blessing), {
      type: 'roll_ability_check', actor: guided.id, ability: 'dexterity', skill: 'acrobatics',
      bonus: 0, dc: 14, rollMode: 'normal', cost: 'none',
    }, rngFaces({ face: 10, sides: 20 }));
    expect(athletics.events).toContainEqual(expect.objectContaining({
      type: 'ability_check_resolved', check: expect.objectContaining({ total: 14, outcome: 'success' }),
    }));
    expect(acrobatics.events).toContainEqual(expect.objectContaining({
      type: 'ability_check_resolved', check: expect.objectContaining({ total: 10, outcome: 'failure' }),
    }));
  });

  it('resistance_cantrip_faces_and_once_per_turn: the literal SRD 5.2.1 damage reduction uses both d4 boundaries and only the first instance', () => {
    // Resistance is damage reduction, not a save bonus, in SRD 5.2.1 (spell-descriptions.txt:6540-6552).
    const pack = packWithSpells([
      {
        id: 'resistance-like', operation: {
          kind: 'damage_dice_reduction',
          damageType: { kind: 'chosen_when_cast', options: [damageType('Cold'), damageType('Fire')] },
          die: { count: 1, sides: 4 }, uses: 'once_per_turn', duration: twoRounds,
        },
      },
      {
        id: 'two-fire-instances', operation: {
          kind: 'damage_operation', delivery: { kind: 'automatic' }, instancesPerTarget: 2,
          packets: [{
            damageType: { kind: 'fixed', damageType: damageType('Fire') },
            dice: { baseCount: 0, sides: 4, modifier: 6, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
            scaling: { kind: 'none' }, thresholdRider: null,
          }],
          timing: { kind: 'immediate' },
        },
      },
    ]);
    const warder = playerProfile('resistance-warder', { initiativeBonus: 30 });
    const attacker = playerProfile('resistance-attacker', { initiativeBonus: 20 });
    const target = monsterProfile('resistance-target', { initiativeBonus: -20, hitPoints: 30 });
    const run = (face: 1 | 4) => {
      let state = cast(started(pack, [warder, attacker, target]), warder, target, 'resistance-like', 'Fire');
      state = endTurn(state, warder);
      const result = reduceEncounter(state, {
        type: 'cast_spell', actor: attacker.id, spellId: 'greenforge:two-fire-instances', slotLevel: null,
        castAsRitual: false, casterLevel: 5, attackBonus: 8, saveDc: 15,
        spellcastingModifier: 4, targets: [target.id], area: null, weaponAttack: null,
        selectedOption: null,
      }, rngFaces({ face, sides: 4 }));
      return result.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount);
    };
    expect(run(1)).toEqual([5, 6]);
    expect(run(4)).toEqual([2, 6]);
  });

  it('advantage_sources: duplicate sources stay at two dice, one disadvantage cancels them, and Faerie-Fire scope does not affect another target', () => {
    // General combination: docs/srd/full/srd-5.2.1.txt:493-512. Specific target: spell-descriptions.txt:2887-2900.
    const pack = packWithSpells([
      { id: 'general-advantage', operation: { kind: 'roll_mode_modifier', roll: 'attack_roll', mode: 'advantage', scope: { kind: 'target_rolls' }, duration: twoRounds } },
      { id: 'general-disadvantage', operation: { kind: 'roll_mode_modifier', roll: 'attack_roll', mode: 'disadvantage', scope: { kind: 'target_rolls' }, duration: twoRounds } },
      { id: 'specific-advantage', operation: { kind: 'roll_mode_modifier', roll: 'attack_roll', mode: 'advantage', scope: { kind: 'attacks_against_target' }, duration: twoRounds } },
    ]);
    const first = playerProfile('adv-first', { initiativeBonus: 50 });
    const second = playerProfile('adv-second', { initiativeBonus: 40 });
    const third = playerProfile('adv-third', { initiativeBonus: 30 });
    const attacker = playerProfile('adv-attacker', { initiativeBonus: 20 });
    const marked = monsterProfile('adv-marked', { initiativeBonus: -10, hitPoints: 20 });
    const unmarked = monsterProfile('adv-unmarked', { initiativeBonus: -20, hitPoints: 20 });

    let duplicate = started(pack, [first, second, attacker, marked]);
    duplicate = cast(duplicate, first, attacker, 'general-advantage');
    duplicate = endTurn(duplicate, first);
    duplicate = cast(duplicate, second, attacker, 'general-advantage');
    duplicate = endTurn(duplicate, second);
    expect(attackEvent(attack(duplicate, attacker, marked, rngFaces(
      { face: 3, sides: 20 }, { face: 15, sides: 20 },
    )).events).attack.roll).toMatchObject({ mode: 'advantage', faces: [3, 15], chosen: 15 });

    let cancelled = started(pack, [first, second, third, attacker, marked]);
    cancelled = cast(cancelled, first, attacker, 'general-advantage');
    cancelled = endTurn(cancelled, first);
    cancelled = cast(cancelled, second, attacker, 'general-advantage');
    cancelled = endTurn(cancelled, second);
    cancelled = cast(cancelled, third, attacker, 'general-disadvantage');
    cancelled = endTurn(cancelled, third);
    expect(attackEvent(attack(cancelled, attacker, marked, rngFaces({ face: 9, sides: 20 })).events).attack.roll)
      .toMatchObject({ mode: 'normal', faces: [9], chosen: 9 });

    let specific = started(pack, [first, attacker, marked, unmarked]);
    specific = cast(specific, first, marked, 'specific-advantage');
    specific = endTurn(specific, first);
    expect(attackEvent(attack(specific, attacker, marked, rngFaces(
      { face: 2, sides: 20 }, { face: 13, sides: 20 },
    )).events).attack.roll.mode).toBe('advantage');
    expect(attackEvent(attack(specific, attacker, unmarked, rngFaces({ face: 13, sides: 20 })).events).attack.roll.mode)
      .toBe('normal');
  });

  it('ac_floor_bonus_boundary: exact AC hits, one below misses, and a Barkskin floor does not add to a Shield-style bonus', () => {
    // Barkskin floor: spell-descriptions.txt:706-724. Shield bonus: spell-descriptions.txt:6937-6954.
    const pack = packWithSpells([
      { id: 'ac-floor', operation: { kind: 'armor_class_modifier', modification: { kind: 'floor', minimum: 17 }, duration: twoRounds } },
      { id: 'ac-bonus', operation: { kind: 'armor_class_modifier', modification: { kind: 'bonus', amount: 2 }, duration: twoRounds } },
    ]);
    const floorCaster = playerProfile('ac-floor-caster', { initiativeBonus: 40 });
    const bonusCaster = playerProfile('ac-bonus-caster', { initiativeBonus: 30 });
    const attacker = playerProfile('ac-attacker', { initiativeBonus: 20 });
    const target = playerProfile('ac-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = started(pack, [floorCaster, bonusCaster, attacker, target]);
    state = cast(state, floorCaster, target, 'ac-floor');
    state = endTurn(state, floorCaster);
    state = cast(state, bonusCaster, target, 'ac-bonus');
    state = endTurn(state, bonusCaster);
    expect(attackEvent(attack(state, attacker, target, rngFaces({ face: 16, sides: 20 })).events).attack.outcome).toBe('miss');
    expect(attackEvent(attack(state, attacker, target, rngFaces({ face: 17, sides: 20 })).events).attack.outcome).toBe('hit');
  });

  it('modifier_duration_first_and_final_round: a two-round AC bonus protects the first and final rounds, then expires', () => {
    const pack = packWithSpells([{
      id: 'two-round-ac', operation: {
        kind: 'armor_class_modifier', modification: { kind: 'bonus', amount: 3 }, duration: twoRounds,
      },
    }]);
    const caster = playerProfile('duration-caster', { initiativeBonus: 30 });
    const attacker = playerProfile('duration-attacker', { initiativeBonus: 20 });
    const target = playerProfile('duration-target', { initiativeBonus: -20, hitPoints: 20 });
    let state = cast(started(pack, [caster, attacker, target]), caster, target, 'two-round-ac');
    state = endTurn(state, caster);
    const first = attack(state, attacker, target, rngFaces({ face: 16, sides: 20 }));
    expect(attackEvent(first.events).attack.outcome).toBe('miss');
    state = endTurn(first.state, attacker);
    state = endTurn(state, target);
    state = endTurn(state, caster);
    const final = attack(state, attacker, target, rngFaces({ face: 16, sides: 20 }));
    expect(attackEvent(final.events).attack.outcome).toBe('miss');
    state = endTurn(final.state, attacker);
    state = endTurn(state, target);
    state = endTurn(state, caster);
    const expired = attack(state, attacker, target, rngFaces({ face: 16, sides: 20 }));
    expect(attackEvent(expired.events).attack.outcome).toBe('hit');
  });

  it('resistance_vulnerability_region: resistance halves odd and even movement-region damage while vulnerability remains observably different', () => {
    // Protection from Energy: spell-descriptions.txt:6322-6335. Response order: docs/srd/full/srd-5.2.1.txt:1044-1072.
    const region = (modifier: number): SpellOperation => ({
      kind: 'movement_region', region: { id: `thorn-${String(modifier)}`, cells: [{ column: 3, row: 0 }] },
      difficultTerrain: false, entry: 'allowed',
      damage: {
        damageType: damageType('Piercing'), dice: { count: 1, sides: 4, modifier },
        unitFeet: 5, partialUnit: 'completed_units_only',
      },
    });
    const runRegion = (modifier: number) => {
      const pack = packWithSpells([
        { id: 'piercing-resistance', operation: { kind: 'damage_response_modifier', damageType: damageType('Piercing'), response: 'resistant', duration: twoRounds } },
        { id: 'thorn-region', operation: region(modifier) },
      ]);
      const warder = playerProfile(`region-warder-${String(modifier)}`, { initiativeBonus: 30 });
      const hazard = playerProfile(`region-hazard-${String(modifier)}`, { initiativeBonus: 20 });
      const mover = playerProfile(`region-mover-${String(modifier)}`, { initiativeBonus: -20, hitPoints: 30 });
      let state = cast(started(pack, [warder, hazard, mover]), warder, mover, 'piercing-resistance');
      state = endTurn(state, warder);
      state = cast(state, hazard, mover, 'thorn-region');
      state = endTurn(state, hazard);
      state = reduceEncounter(state, { type: 'disengage', actor: mover.id }, () => 0).state;
      return reduceEncounter(state, {
        type: 'move', actor: mover.id, path: [{ column: 3, row: 0 }], cause: 'voluntary',
      }, rngFaces({ face: 1, sides: 4 }));
    };
    expect(runRegion(4).events).toContainEqual(expect.objectContaining({ type: 'damage_applied', amount: 2 }));
    expect(runRegion(5).events).toContainEqual(expect.objectContaining({ type: 'damage_applied', amount: 3 }));

    const responsePack = packWithSpells([
      {
        id: 'fire-resistance', operation: {
          kind: 'damage_response_modifier',
          damageType: { kind: 'chosen_when_cast', options: [damageType('Cold'), damageType('Fire')] },
          response: 'resistant', duration: twoRounds,
        },
      },
      { id: 'fire-vulnerability', operation: { kind: 'damage_response_modifier', damageType: damageType('Fire'), response: 'vulnerable', duration: twoRounds } },
      { id: 'five-fire', operation: fixedDamage(5, damageType('Fire')) },
    ]);
    const warder = playerProfile('response-warder', { initiativeBonus: 30 });
    const attacker = playerProfile('response-attacker', { initiativeBonus: 20 });
    const target = monsterProfile('response-target', { initiativeBonus: -20, hitPoints: 30 });
    const amountFor = (spell: 'fire-resistance' | 'fire-vulnerability') => {
      let state = cast(
        started(responsePack, [warder, attacker, target]), warder, target, spell,
        spell === 'fire-resistance' ? 'Fire' : null,
      );
      state = endTurn(state, warder);
      const result = reduceEncounter(state, {
        type: 'cast_spell', actor: attacker.id, spellId: 'greenforge:five-fire', slotLevel: null,
        castAsRitual: false, casterLevel: 5, attackBonus: 8, saveDc: 15, spellcastingModifier: 4,
        targets: [target.id], area: null, weaponAttack: null, selectedOption: null,
      }, () => 0);
      return result.events.find((event) => event.type === 'damage_applied')?.amount;
    };
    expect(amountFor('fire-resistance')).toBe(2);
    expect(amountFor('fire-vulnerability')).toBe(10);
  });

  it('targeted_modifier_scope: a selected-attacker AC defense blocks that attacker but not a non-targeted source, unlike a blanket bonus', () => {
    // Protection from Evil and Good scopes its defense by attacker source (spell-descriptions.txt:6337-6362).
    const pack = packWithSpells([
      { id: 'targeted-ward', operation: { kind: 'targeted_defense_modifier', against: 'selected_attacker', armorClassBonus: 3, duration: twoRounds } },
      { id: 'blanket-ward', operation: { kind: 'armor_class_modifier', modification: { kind: 'bonus', amount: 3 }, duration: twoRounds } },
    ]);
    const warder = playerProfile('targeted-warder', { initiativeBonus: 40 });
    const selected = playerProfile('targeted-selected', { initiativeBonus: 30 });
    const outsider = playerProfile('targeted-outsider', { initiativeBonus: 20 });
    const target = playerProfile('targeted-target', { initiativeBonus: -20, hitPoints: 20 });
    let targeted = cast(started(pack, [warder, selected, outsider, target]), warder, target, 'targeted-ward', null, selected);
    targeted = endTurn(targeted, warder);
    expect(attackEvent(attack(targeted, selected, target, rngFaces({ face: 16, sides: 20 })).events).attack.outcome).toBe('miss');
    targeted = endTurn(targeted, selected);
    expect(attackEvent(attack(targeted, outsider, target, rngFaces({ face: 16, sides: 20 })).events).attack.outcome).toBe('hit');

    let blanket = cast(started(pack, [warder, selected, outsider, target]), warder, target, 'blanket-ward');
    blanket = endTurn(blanket, warder);
    blanket = endTurn(blanket, selected);
    expect(attackEvent(attack(blanket, outsider, target, rngFaces({ face: 16, sides: 20 })).events).attack.outcome).toBe('miss');
  });
});
