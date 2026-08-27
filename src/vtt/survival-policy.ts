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

export {
  HEALING_POTION_DRINK_THRESHOLD,
  shouldDrinkHealingPotion,
} from './healing-potion-policy';

export const D365_HEALING_POTIONS_PER_CHARACTER = 2;
export const AID_HIT_POINT_BONUS = 5 as const;

export const SURVIVAL_RULE_CITATIONS = {
  potion: 'docs/srd/full/srd-5.2.1.txt:6022-6028',
  aid: 'docs/srd/source/spell-descriptions.txt:53-65',
  bless: 'docs/srd/source/spell-descriptions.txt:824-840',
  clericSlots: 'docs/srd/source/class-level-tables.txt:64-71',
  wizard: 'docs/srd/full/srd-5.2.1.txt:4615-4695; docs/srd/source/class-level-tables.txt:116-138',
  cureWounds: 'docs/srd/full/srd-5.2.1.txt:7493-7508; docs/srd/source/spell-descriptions.txt:1895-1906',
  shortRestHitDice: 'docs/srd/full/srd-5.2.1.txt:12035-12055',
  concentration: 'docs/srd/full/srd-5.2.1.txt (Rules Glossary: Concentration)',
  castingDuringShortRest: 'Owner ruling D383 (2026-08-25): casting Cure Wounds during the rest does not interrupt it.',
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
    throw new Error('The prepared Aid caster lacks the level-2 spell slots required for the planned castings.');
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

function aidCasterMember(members: readonly LoadedPartyMember[]): LoadedPartyMember {
  const druid = members.find((member) =>
    member.source.classes.some((entry) => entry.classId === 'Druid') &&
    member.spells.some((spell) => spell.id === 'aid'));
  if (druid === undefined) throw new Error('The D385 survival party requires a Druid with prepared Aid.');
  return druid;
}

export function createD365SurvivalPartySessionState(
  members: readonly LoadedPartyMember[],
): AidPreparationResult {
  const initial = equipD365HealingPotions(createPartySessionState(members));
  const caster = combatantId(aidCasterMember(members).profile.id);
  const targets = initial.characters.map((character) => character.combatantId);
  if (targets.length !== 5) throw new Error('The D385 survival party must contain exactly five characters.');
  return prepareAid(initial, caster, [targets.slice(0, 3), targets.slice(3, 5)]);
}

export function averageHitDieHealing(sides: 6 | 8 | 10 | 12, constitutionModifier: number): number {
  return Math.max(1, (sides + 1) / 2 + constitutionModifier);
}

export function shouldSpendHitDie(input: {
  readonly missingHitPoints: number;
  readonly sides: 6 | 8 | 10 | 12;
  readonly constitutionModifier: number;
}): boolean {
  if (!Number.isFinite(input.missingHitPoints) || input.missingHitPoints < 0) {
    throw new RangeError('Hit-Die thrift requires a finite nonnegative Hit Point deficit.');
  }
  return input.missingHitPoints >= averageHitDieHealing(input.sides, input.constitutionModifier);
}

export function averageCureWoundsHealing(slotLevel: number, spellcastingModifier: number): number {
  if (!Number.isSafeInteger(slotLevel) || slotLevel < 1 || slotLevel > 9) {
    throw new RangeError('Cure Wounds slot level must be an integer from 1 through 9.');
  }
  // Cure Wounds restores 2d8 + modifier and adds 2d8 per higher slot:
  // docs/srd/full/srd-5.2.1.txt:7493-7508.
  return slotLevel * 9 + spellcastingModifier;
}

export function shouldCastAverageHealing(input: {
  readonly missingHitPoints: number;
  readonly averageHealing: number;
}): boolean {
  if (!Number.isFinite(input.missingHitPoints) || input.missingHitPoints < 0 ||
      !Number.isFinite(input.averageHealing) || input.averageHealing < 1) {
    throw new RangeError('Average-healing thrift requires a nonnegative deficit and positive healing.');
  }
  return input.averageHealing <= input.missingHitPoints;
}

export interface BetweenFightCureWoundsCasting {
  readonly caster: CombatantId;
  readonly target: CombatantId;
  readonly slotLevel: number;
  readonly averageHealing: number;
}

export interface BetweenFightCureWoundsResult {
  readonly state: PartySessionState;
  readonly castings: readonly BetweenFightCureWoundsCasting[];
}

export function castBetweenFightCureWounds(
  members: readonly LoadedPartyMember[],
  state: PartySessionState,
  policy: {
    readonly clericBlessOpeningsReserved: number;
    readonly clericSpiritGuardiansSlotsReserved: number;
  },
): BetweenFightCureWoundsResult {
  if (!Number.isSafeInteger(policy.clericBlessOpeningsReserved) || policy.clericBlessOpeningsReserved < 0 ||
      !Number.isSafeInteger(policy.clericSpiritGuardiansSlotsReserved) || policy.clericSpiritGuardiansSlotsReserved < 0) {
    throw new RangeError('Between-fight slot reserves must be nonnegative integers.');
  }
  let current = state;
  const castings: BetweenFightCureWoundsCasting[] = [];
  while (true) {
    const candidates = members.flatMap((member) => {
      const source = member.spellcasting.find((entry) =>
        entry.preparedSpells.some((spell) => spell.id === 'cure-wounds') ||
        entry.knownSpells.some((spell) => spell.id === 'cure-wounds') ||
        entry.grants.some((grant) => grant.spell.id === 'cure-wounds'));
      if (source === undefined) return [];
      const caster = current.characters.find((character) => character.combatantId === member.profile.id);
      if (caster === undefined || caster.life !== 'living') return [];
      const isCleric = member.source.classes.some((entry) => entry.classId === 'Cleric');
      const reserve = isCleric
        ? policy.clericBlessOpeningsReserved + policy.clericSpiritGuardiansSlotsReserved
        : 0;
      const remainingSharedSlots = caster.spellSlots
        .filter((slot) => slot.pool === 'shared')
        .reduce((total, slot) => total + slot.remaining, 0);
      return caster.spellSlots
        .filter((slot) => slot.pool === 'shared' && slot.remaining > 0 && remainingSharedSlots - 1 >= reserve)
        .map((slot) => ({
          caster,
          slot,
          averageHealing: averageCureWoundsHealing(slot.level, source.spellcastingModifier),
        }));
    }).sort((left, right) =>
      left.slot.level - right.slot.level ||
      left.caster.combatantId.localeCompare(right.caster.combatantId));
    const selected = candidates.find((candidate) => current.characters.some((target) =>
      target.life === 'living' && shouldCastAverageHealing({
        missingHitPoints: target.hitPointMaximum - target.currentHitPoints,
        averageHealing: candidate.averageHealing,
      })));
    if (selected === undefined) break;
    const target = [...current.characters]
      .filter((candidate) => candidate.life === 'living' && shouldCastAverageHealing({
        missingHitPoints: candidate.hitPointMaximum - candidate.currentHitPoints,
        averageHealing: selected.averageHealing,
      }))
      .sort((left, right) =>
        (right.hitPointMaximum - right.currentHitPoints) - (left.hitPointMaximum - left.currentHitPoints) ||
        left.combatantId.localeCompare(right.combatantId))[0];
    if (target === undefined) break;
    current = {
      ...current,
      characters: current.characters.map((character) => {
        if (character.combatantId === selected.caster.combatantId) {
          return {
            ...character,
            spellSlots: character.spellSlots.map((slot) =>
              slot.pool === selected.slot.pool && slot.level === selected.slot.level
                ? { ...slot, remaining: slot.remaining - 1 }
                : slot),
            ...(character.combatantId === target.combatantId
              ? { currentHitPoints: character.currentHitPoints + selected.averageHealing }
              : {}),
          };
        }
        return character.combatantId === target.combatantId
          ? { ...character, currentHitPoints: character.currentHitPoints + selected.averageHealing }
          : character;
      }),
    };
    castings.push({
      caster: selected.caster.combatantId,
      target: target.combatantId,
      slotLevel: selected.slot.level,
      averageHealing: selected.averageHealing,
    });
  }
  return { state: current, castings };
}
