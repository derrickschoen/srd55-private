import type { LoadedPartyMember } from './party-pack';
import {
  createPartySessionState,
  type PartySessionState,
} from './party-session-state';
import {
  combatantId,
  encounterEffectId,
  itemId,
  type CombatantId,
} from '../combat/values';

export const HEALING_POTION_DRINK_THRESHOLD = 0.4;
export const D365_HEALING_POTIONS_PER_CHARACTER = 2;
export const AID_HIT_POINT_BONUS = 5 as const;

export const SURVIVAL_RULE_CITATIONS = {
  potion: 'docs/srd/full/srd-5.2.1.txt:6022-6028',
  aid: 'docs/srd/source/spell-descriptions.txt:53-65',
  bless: 'docs/srd/source/spell-descriptions.txt:824-840',
  clericSlots: 'docs/srd/source/class-level-tables.txt:64-71',
  concentration: 'docs/srd/full/srd-5.2.1.txt (Rules Glossary: Concentration)',
} as const;

export interface AidPreparationCasting {
  readonly slotLevel: 2;
  readonly targets: readonly CombatantId[];
}

export interface AidPreparationResult {
  readonly state: PartySessionState;
  readonly caster: CombatantId;
  readonly castings: readonly AidPreparationCasting[];
  readonly levelTwoSlotsBefore: number;
  readonly levelTwoSlotsAfter: number;
}

export function shouldDrinkHealingPotion(input: {
  readonly currentHitPoints: number;
  readonly hitPointMaximum: number;
  readonly allyCastHealingIncoming: boolean;
}): boolean {
  if (input.hitPointMaximum < 1 || input.currentHitPoints < 0) {
    throw new RangeError('Healing-potion policy requires nonnegative Hit Points and a positive maximum.');
  }
  return !input.allyCastHealingIncoming &&
    input.currentHitPoints > 0 &&
    input.currentHitPoints / input.hitPointMaximum < HEALING_POTION_DRINK_THRESHOLD;
}

export function equipD365HealingPotions(state: PartySessionState): PartySessionState {
  return {
    ...state,
    characters: state.characters.map((character) => ({
      ...character,
      consumables: [
        ...character.consumables.filter((consumable) => consumable.kind !== 'potion_of_healing'),
        {
          kind: 'potion_of_healing' as const,
          effectId: encounterEffectId(`effect:d365:potion-of-healing:${String(character.characterId)}`),
          itemId: itemId(`item:d365:potion-of-healing:${String(character.characterId)}`),
          remainingUses: D365_HEALING_POTIONS_PER_CHARACTER,
        },
      ],
    })),
  };
}

export function prepareAid(
  state: PartySessionState,
  caster: CombatantId,
  targetGroups: readonly (readonly CombatantId[])[],
): AidPreparationResult {
  if (targetGroups.length < 1) throw new RangeError('Aid preparation requires at least one casting.');
  const casterState = state.characters.find((character) => character.combatantId === caster);
  if (casterState === undefined) throw new Error(`Aid caster ${caster} is not in the party.`);
  for (const targets of targetGroups) {
    if (targets.length < 1 || targets.length > 3 || new Set(targets).size !== targets.length) {
      throw new RangeError('Each Aid casting must name one to three distinct creatures.');
    }
    for (const target of targets) {
      if (!state.characters.some((character) => character.combatantId === target)) {
        throw new Error(`Aid target ${target} is not in the party.`);
      }
    }
  }
  const levelTwo = casterState.spellSlots.find((slot) => slot.pool === 'shared' && slot.level === 2);
  if (levelTwo === undefined || levelTwo.remaining < targetGroups.length) {
    throw new Error('Sera Dawn lacks the level-2 spell slots required for the planned Aid castings.');
  }
  const aided = new Set(targetGroups.flat());
  const characters = state.characters.map((character) => {
    if (character.combatantId === caster) {
      const spellSlots = character.spellSlots.map((slot) =>
        slot.pool === 'shared' && slot.level === 2
          ? { ...slot, remaining: slot.remaining - targetGroups.length }
          : slot);
      if (!aided.has(character.combatantId) || character.aid !== null) return { ...character, spellSlots };
      return {
        ...character,
        spellSlots,
        currentHitPoints: character.currentHitPoints + AID_HIT_POINT_BONUS,
        hitPointMaximum: character.hitPointMaximum + AID_HIT_POINT_BONUS,
        aid: { source: caster, amount: AID_HIT_POINT_BONUS },
      };
    }
    if (!aided.has(character.combatantId) || character.aid !== null) return character;
    return {
      ...character,
      currentHitPoints: character.currentHitPoints + AID_HIT_POINT_BONUS,
      hitPointMaximum: character.hitPointMaximum + AID_HIT_POINT_BONUS,
      aid: { source: caster, amount: AID_HIT_POINT_BONUS },
    };
  });
  return {
    state: { ...state, characters },
    caster,
    castings: targetGroups.map((targets) => ({ slotLevel: 2, targets: [...targets] })),
    levelTwoSlotsBefore: levelTwo.remaining,
    levelTwoSlotsAfter: levelTwo.remaining - targetGroups.length,
  };
}

function clericMember(members: readonly LoadedPartyMember[]): LoadedPartyMember {
  const cleric = members.find((member) => member.source.classes.some((entry) => entry.classId === 'Cleric'));
  if (cleric === undefined) throw new Error('The D365 survival party requires Sera Dawn as its Cleric.');
  return cleric;
}

export function createD365SurvivalPartySessionState(
  members: readonly LoadedPartyMember[],
): AidPreparationResult {
  const initial = equipD365HealingPotions(createPartySessionState(members));
  const caster = combatantId(clericMember(members).profile.id);
  const targets = initial.characters.map((character) => character.combatantId);
  if (targets.length !== 4) throw new Error('The D365 survival party must contain exactly four characters.');
  return prepareAid(initial, caster, [targets.slice(0, 3), targets.slice(3)]);
}
