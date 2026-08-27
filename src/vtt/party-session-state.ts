import type { CombatantEquipment } from '../combat/equipment';
import type { ExhaustionLevel } from '../combat/conditions';
import type {
  CombatantReactionPolicy,
  DeathSaveState,
  EncounterState,
  LifeState,
  ReactionKind,
  ReactionPolicy,
} from '../combat/encounter';
import { combatantConditions, REACTION_KINDS } from '../combat/encounter';
import type { CombatantId, EncounterEffectId, ItemId, LimitedResourcePoolId } from '../combat/values';
import {
  combatantId,
  effectStackingIdentity,
  encounterEffectId,
  itemId,
  limitedResourcePoolId,
} from '../combat/values';
import { hitDieSizes, type HitDieSize } from '../domain/enums';
import type { LoadedPartyMember } from './party-pack';
import {
  DEFAULT_REFUSAL_HANDLING_SETTINGS,
  REFUSAL_CATEGORIES,
  handlingModesForCategory,
  type RefusalCategory,
  type RefusalHandlingMode,
  type RefusalHandlingSettings,
} from './refusal-handling';

export const PARTY_SESSION_SCHEMA_VERSION = 1 as const;
export const ADVENTURING_DAY_ROOM_COUNT = 4 as const;

export type AdventuringDayRoom = 1 | 2 | 3 | 4;
export type AdventuringDayStatus = 'active' | 'ended_by_long_rest';
export type PartyExhaustionLevel = 0 | ExhaustionLevel;
export type PartySessionViewClassification = 'dm_only' | 'player_visible' | 'per_seat';

export const LONG_REST_RULES = {
  minimumDurationHours: 8,
  minimumSleepHours: 6,
  maximumLightActivityHours: 2,
  minimumHoursBeforeInterruptedShortRestBenefits: 1,
  minimumHoursBetweenStarts: 16,
  maximumStableRecoveryHours: 4,
  stableRecoveryResolution: 'deterministic_at_rest_start' as const,
  interruptionHandling: 'deferred' as const,
} as const;

export const LONG_REST_CITATIONS = {
  structure: 'docs/srd/full/srd-5.2.1.txt:11901-11913',
  hitPointsAndHitDice: 'docs/srd/full/srd-5.2.1.txt:11915-11917',
  exhaustion: 'docs/srd/full/srd-5.2.1.txt:11686-11688',
  specialFeatures: 'docs/srd/full/srd-5.2.1.txt:11922-11924',
  spellSlots: 'docs/srd/full/srd-5.2.1.txt:6321-6322',
  pactMagic: 'docs/srd/full/srd-5.2.1.txt:4290-4295',
  stableHealing: 'docs/srd/full/srd-5.2.1.txt:1115-1120',
} as const;

export interface PartyHitDiceState {
  readonly sides: HitDieSize;
  readonly maximum: number;
  readonly remaining: number;
}

export interface PartySpellSlotState {
  readonly pool: 'shared' | 'pact_magic';
  readonly level: number;
  readonly maximum: number;
  readonly remaining: number;
  readonly recharge: 'long_rest' | 'short_rest';
}

export interface PartyLimitedResourceState {
  readonly id: LimitedResourcePoolId;
  readonly maximum: number;
  readonly remaining: number;
  readonly recharge: 'long_rest' | 'short_rest';
}

export type PartyConsumableState =
  | {
      readonly kind: 'goodberries';
      readonly effectId: EncounterEffectId;
      readonly remainingUses: number;
    }
  | {
      readonly kind: 'potion_of_healing';
      readonly effectId: EncounterEffectId;
      readonly itemId: ItemId;
      readonly remainingUses: number;
    };

export interface PartyAidState {
  readonly source: CombatantId;
  readonly amount: 5;
}

export interface PartyCharacterSessionState {
  readonly characterId: number;
  readonly combatantId: CombatantId;
  readonly currentHitPoints: number;
  readonly hitPointMaximum: number;
  readonly exhaustionLevel: PartyExhaustionLevel;
  readonly constitutionModifier: number;
  readonly life: LifeState;
  readonly deathSaves: DeathSaveState | null;
  readonly spellSlots: readonly PartySpellSlotState[];
  readonly limitedResources: readonly PartyLimitedResourceState[];
  readonly hitDice: readonly PartyHitDiceState[];
  readonly consumables: readonly PartyConsumableState[];
  readonly aid: PartyAidState | null;
  readonly equipment: CombatantEquipment | null;
}

export interface PartySessionState {
  readonly schemaVersion: typeof PARTY_SESSION_SCHEMA_VERSION;
  readonly rulesEdition: '2024';
  readonly room: AdventuringDayRoom;
  readonly adventuringDayStatus: AdventuringDayStatus;
  readonly characters: readonly PartyCharacterSessionState[];
  readonly reactionPolicies: readonly CombatantReactionPolicy[];
  readonly refusalHandling: RefusalHandlingSettings;
}

export const PARTY_SESSION_VIEW_CLASSIFICATION = {
  schemaVersion: 'player_visible',
  rulesEdition: 'player_visible',
  room: 'player_visible',
  adventuringDayStatus: 'player_visible',
  characters: 'per_seat',
  reactionPolicies: 'per_seat',
  refusalHandling: 'dm_only',
} as const satisfies Readonly<Record<keyof PartySessionState, PartySessionViewClassification>>;

export const PARTY_CHARACTER_VIEW_CLASSIFICATION = {
  characterId: 'dm_only',
  combatantId: 'player_visible',
  currentHitPoints: 'per_seat',
  hitPointMaximum: 'per_seat',
  exhaustionLevel: 'per_seat',
  constitutionModifier: 'per_seat',
  life: 'player_visible',
  deathSaves: 'dm_only',
  spellSlots: 'per_seat',
  limitedResources: 'per_seat',
  hitDice: 'per_seat',
  consumables: 'per_seat',
  aid: 'per_seat',
  equipment: 'per_seat',
} as const satisfies Readonly<Record<keyof PartyCharacterSessionState, PartySessionViewClassification>>;

export interface DmPartySessionView {
  readonly audience: 'dm';
  readonly state: PartySessionState;
}

export interface PlayerVisiblePartyMemberSummary {
  readonly combatantId: CombatantId;
  readonly life: LifeState;
}

export interface PlayerOwnedPartyMember extends PlayerVisiblePartyMemberSummary {
  readonly currentHitPoints: number;
  readonly hitPointMaximum: number;
  readonly exhaustionLevel: PartyExhaustionLevel;
  readonly constitutionModifier: number;
  readonly spellSlots: readonly PartySpellSlotState[];
  readonly limitedResources: readonly PartyLimitedResourceState[];
  readonly hitDice: readonly PartyHitDiceState[];
  readonly consumables: readonly PartyConsumableState[];
  readonly aid: PartyAidState | null;
  readonly equipment: CombatantEquipment | null;
}

export interface PlayerPartySessionView {
  readonly audience: 'player';
  readonly rulesEdition: '2024';
  readonly room: AdventuringDayRoom;
  readonly adventuringDayStatus: AdventuringDayStatus;
  readonly characters: readonly PlayerVisiblePartyMemberSummary[];
  readonly ownedCharacters: readonly PlayerOwnedPartyMember[];
  readonly reactionPolicies: readonly CombatantReactionPolicy[];
}

export interface ShortRestHitDieSpend {
  readonly combatantId: CombatantId;
  readonly dice: readonly {
    readonly sides: HitDieSize;
    readonly count: number;
  }[];
}

export interface ShortRestHitDieRoll {
  readonly combatantId: CombatantId;
  readonly sides: HitDieSize;
  readonly face: number;
  readonly constitutionModifier: number;
  readonly healing: number;
}

export interface ShortRestResult {
  readonly state: PartySessionState;
  readonly rolls: readonly ShortRestHitDieRoll[];
}

export interface LongRestCharacterSummary {
  readonly combatantId: CombatantId;
  readonly hitPointsRestored: number;
  readonly hitDiceRestored: readonly { readonly sides: HitDieSize; readonly count: number }[];
  readonly spellSlotsRestored: readonly {
    readonly pool: PartySpellSlotState['pool'];
    readonly level: number;
    readonly count: number;
  }[];
  readonly exhaustionLevelsRemoved: 0 | 1;
  readonly limitedResourcesRestored: readonly {
    readonly id: LimitedResourcePoolId;
    readonly count: number;
  }[];
  readonly lifeBefore: LifeState;
  readonly lifeAfter: LifeState;
}

export interface LongRestSummaryCard {
  readonly kind: 'long_rest_summary';
  readonly durationHours: typeof LONG_REST_RULES.minimumDurationHours;
  readonly characters: readonly LongRestCharacterSummary[];
  readonly citations: typeof LONG_REST_CITATIONS;
}

export interface LongRestResult {
  readonly state: PartySessionState;
  readonly summary: LongRestSummaryCard;
}

export const LONG_REST_BENEFITS = [
  'hit_points',
  'hit_dice',
  'spell_slots',
  'exhaustion',
  'limited_resources',
] as const;

export type LongRestBenefit = (typeof LONG_REST_BENEFITS)[number];

export type RestInterruptionOutcome =
  | { readonly kind: 'no_benefit' }
  | { readonly kind: 'partial_per_dm'; readonly benefits: readonly LongRestBenefit[] }
  | { readonly kind: 'resumed' };

export const REST_INTERRUPTION_DM_CONTROL = {
  label: 'Rest interrupted',
  outcomes: ['no_benefit', 'partial_per_dm', 'resumed'],
  partialBenefitChecklist: LONG_REST_BENEFITS,
} as const satisfies {
  readonly label: 'Rest interrupted';
  readonly outcomes: readonly RestInterruptionOutcome['kind'][];
  readonly partialBenefitChecklist: readonly LongRestBenefit[];
};

export interface RestInterruptionRulingCard {
  readonly kind: 'adjudicated_ruling';
  readonly subject: 'Rest interrupted';
  readonly choice: RestInterruptionOutcome['kind'];
  readonly checkedBenefits: readonly LongRestBenefit[];
  readonly reasoning: string;
}

export interface RestInterruptionResult {
  readonly state: PartySessionState;
  readonly outcome: RestInterruptionOutcome;
  readonly ruling: RestInterruptionRulingCard;
}

export function restInterruptionRuling(
  outcome: RestInterruptionOutcome,
): RestInterruptionRulingCard {
  const benefits = outcome.kind === 'partial_per_dm' ? [...outcome.benefits] : [];
  return {
    kind: 'adjudicated_ruling',
    subject: 'Rest interrupted',
    choice: outcome.kind,
    checkedBenefits: benefits,
    reasoning: outcome.kind === 'partial_per_dm'
      ? `DM fiat: partial benefits (${benefits.join(', ') || 'none'}).`
      : outcome.kind === 'no_benefit'
        ? 'DM fiat: no Long Rest benefits apply.'
        : 'DM fiat: the Long Rest resumes.',
  };
}

function applyDmSelectedLongRestBenefits(
  character: PartyCharacterSessionState,
  selected: ReadonlySet<LongRestBenefit>,
): PartyCharacterSessionState {
  if (character.life !== 'living' || character.currentHitPoints < 1) return character;
  return {
    ...character,
    currentHitPoints: selected.has('hit_points')
      ? character.hitPointMaximum
      : character.currentHitPoints,
    hitDice: selected.has('hit_dice')
      ? character.hitDice.map((pool) => ({ ...pool, remaining: pool.maximum }))
      : character.hitDice,
    spellSlots: selected.has('spell_slots')
      ? character.spellSlots.map((slot) => ({ ...slot, remaining: slot.maximum }))
      : character.spellSlots,
    exhaustionLevel: selected.has('exhaustion')
      ? Math.max(0, character.exhaustionLevel - 1) as PartyExhaustionLevel
      : character.exhaustionLevel,
    limitedResources: selected.has('limited_resources')
      ? character.limitedResources.map((resource) => resource.recharge === 'long_rest'
          ? { ...resource, remaining: resource.maximum }
          : resource)
      : character.limitedResources,
  };
}

/** D377.7: interruption is deliberately DM fiat; no elapsed-hour rule is enforced. */
export function interruptLongRest(
  state: PartySessionState,
  outcome: RestInterruptionOutcome,
): RestInterruptionResult {
  if (state.adventuringDayStatus !== 'active') {
    throw new Error('A completed Long Rest cannot be interrupted.');
  }
  const benefits = outcome.kind === 'partial_per_dm' ? [...outcome.benefits] : [];
  if (new Set(benefits).size !== benefits.length) {
    throw new Error('A partial Long Rest interruption repeats a benefit.');
  }
  const unknown = benefits.find((benefit) => !LONG_REST_BENEFITS.includes(benefit));
  if (unknown !== undefined) throw new Error(`Unknown Long Rest benefit ${unknown}.`);
  const next = outcome.kind === 'partial_per_dm'
    ? {
        ...state,
        characters: state.characters.map((character) =>
          applyDmSelectedLongRestBenefits(character, new Set(benefits))),
      }
    : state;
  return {
    state: next,
    outcome: structuredClone(outcome),
    ruling: restInterruptionRuling(outcome),
  };
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function sortedHitDice(member: LoadedPartyMember): readonly PartyHitDiceState[] {
  const bySides = new Map<HitDieSize, number>();
  for (const pool of member.hitDice) {
    bySides.set(pool.sides, (bySides.get(pool.sides) ?? 0) + pool.maximum);
  }
  return [...bySides].sort(([left], [right]) => left - right).map(([sides, maximum]) => ({
    sides,
    maximum,
    remaining: maximum,
  }));
}

function initialSpellSlots(member: LoadedPartyMember): readonly PartySpellSlotState[] {
  return [
    ...member.sharedSpellSlots.map((slot) => ({
      pool: 'shared' as const,
      level: slot.level,
      maximum: slot.maximum,
      remaining: slot.maximum,
      recharge: 'long_rest' as const,
    })),
    ...member.pactSpellSlots.map((slot) => ({
      pool: 'pact_magic' as const,
      level: slot.level,
      maximum: slot.maximum,
      remaining: slot.maximum,
      recharge: 'short_rest' as const,
    })),
  ].sort((left, right) => left.level - right.level || left.pool.localeCompare(right.pool));
}

export function createPartySessionState(
  members: readonly LoadedPartyMember[],
): PartySessionState {
  if (members.length < 3 || members.length > 5) {
    throw new RangeError('An adventuring-day party requires three to five characters.');
  }
  const characters = members.map((member): PartyCharacterSessionState => {
    if (member.hitDice.length === 0) {
      throw new Error(`Character ${String(member.profile.characterId)} has no sourced Hit Point Dice.`);
    }
    return {
      characterId: member.profile.characterId,
      combatantId: member.profile.id,
      currentHitPoints: member.profile.rules.hitPointMaximum,
      hitPointMaximum: member.profile.rules.hitPointMaximum,
      exhaustionLevel: 0,
      constitutionModifier: abilityModifier(member.source.abilities.constitution),
      life: 'living',
      deathSaves: null,
      spellSlots: initialSpellSlots(member),
      limitedResources: (member.profile.rules.limitedResources ?? []).map((resource) => ({
        ...resource,
        remaining: resource.maximum,
      })),
      hitDice: sortedHitDice(member),
      consumables: [],
      aid: null,
      equipment: null,
    };
  });
  if (new Set(characters.map((character) => character.characterId)).size !== characters.length) {
    throw new Error('An adventuring-day party cannot contain a character twice.');
  }
  return {
    schemaVersion: PARTY_SESSION_SCHEMA_VERSION,
    rulesEdition: '2024',
    room: 1,
    adventuringDayStatus: 'active',
    characters,
    reactionPolicies: characters.flatMap((character) => REACTION_KINDS.map((reactionKind) => ({
      combatant: character.combatantId,
      reactionKind,
      policy: 'ask' as const,
    }))),
    refusalHandling: { ...DEFAULT_REFUSAL_HANDLING_SETTINGS },
  };
}

export function setPartyRefusalHandling(
  state: PartySessionState,
  category: RefusalCategory,
  mode: RefusalHandlingMode,
): PartySessionState {
  if (!handlingModesForCategory(category).includes(mode)) {
    throw new TypeError(`${category} does not support ${mode}.`);
  }
  return {
    ...state,
    refusalHandling: { ...state.refusalHandling, [category]: mode },
  };
}

export function setPartyReactionPolicy(
  state: PartySessionState,
  combatant: CombatantId,
  reactionKind: ReactionKind,
  policy: ReactionPolicy,
): PartySessionState {
  if (!state.characters.some((character) => character.combatantId === combatant)) {
    throw new Error(`Reaction preference names non-party character ${combatant}.`);
  }
  return {
    ...state,
    reactionPolicies: state.reactionPolicies.map((entry) =>
      entry.combatant === combatant && entry.reactionKind === reactionKind
        ? { ...entry, policy }
        : entry),
  };
}

function encounterSpellSlots(
  subject: EncounterState['combatants'][number],
  previous: PartyCharacterSessionState,
): readonly PartySpellSlotState[] {
  return previous.spellSlots.map((pool) => {
    const candidates = subject.spellSlots.filter(
      (slot) => slot.level === pool.level &&
        (slot.recharge ?? 'long_rest') === pool.recharge,
    );
    if (candidates.length !== 1) {
      throw new Error(`Encounter slot pool does not match ${pool.pool} level ${String(pool.level)}.`);
    }
    const candidate = candidates[0];
    if (candidate === undefined) throw new Error('Encounter slot pool disappeared.');
    return { ...pool, maximum: candidate.maximum, remaining: candidate.remaining };
  });
}

export function capturePartySessionState(
  previous: PartySessionState,
  encounter: EncounterState,
): PartySessionState {
  const characters = previous.characters.map((persisted): PartyCharacterSessionState => {
    const subject = encounter.combatants.find(
      (candidate) => candidate.profile.id === persisted.combatantId,
    );
    if (subject === undefined || subject.profile.kind !== 'player_character') {
      throw new Error(`Encounter no longer contains party character ${persisted.combatantId}.`);
    }
    const equipment = encounter.equipment?.find(
      (entry) => entry.combatant === persisted.combatantId,
    ) ?? null;
    const consumables = encounter.effects.flatMap((effect): readonly PartyConsumableState[] => {
      if (effect.source !== persisted.combatantId) return [];
      if (effect.payload.kind === 'consumable_healing_pool') {
        return [{ kind: 'goodberries', effectId: effect.id, remainingUses: effect.payload.remainingUses }];
      }
      if (effect.payload.kind === 'healing_potion') {
        return [{
          kind: 'potion_of_healing',
          effectId: effect.id,
          itemId: effect.payload.itemId,
          remainingUses: effect.payload.remainingUses,
        }];
      }
      return [];
    });
    const exhaustion = combatantConditions(encounter, persisted.combatantId).find(
      (condition) => condition.name === 'Exhaustion',
    );
    return {
      ...persisted,
      currentHitPoints: subject.hitPoints,
      hitPointMaximum: subject.profile.rules.hitPointMaximum + (persisted.aid?.amount ?? 0),
      exhaustionLevel: exhaustion?.name === 'Exhaustion' ? exhaustion.level : 0,
      life: subject.life,
      deathSaves: structuredClone(subject.deathSaves),
      spellSlots: encounterSpellSlots(subject, persisted),
      limitedResources: (subject.limitedResources ?? []).map((resource) => ({ ...resource })),
      consumables,
      equipment: equipment === null ? null : structuredClone(equipment),
    };
  });
  return { ...previous, characters };
}

export function preloadPartySessionState(
  encounter: EncounterState,
  party: PartySessionState,
): EncounterState {
  const partyById = new Map(party.characters.map((character) => [character.combatantId, character] as const));
  const combatants = encounter.combatants.map((subject) => {
    if (subject.profile.kind !== 'player_character') return subject;
    const persisted = partyById.get(subject.profile.id);
    if (persisted === undefined) {
      throw new Error(`Composed room contains non-party character ${subject.profile.id}.`);
    }
    return {
      ...subject,
      hitPoints: persisted.currentHitPoints,
      life: persisted.life,
      deathSaves: structuredClone(persisted.deathSaves),
      spellSlots: persisted.spellSlots.map((slot) => ({
        level: slot.level,
        maximum: slot.maximum,
        remaining: slot.remaining,
        ...(slot.recharge === 'short_rest' ? { recharge: 'short_rest' as const } : {}),
      })),
      ...(subject.profile.rules.limitedResources === undefined
        ? {}
        : { limitedResources: persisted.limitedResources.map((resource) => ({ ...resource })) }),
    };
  });
  if (combatants.filter((subject) => subject.profile.kind === 'player_character').length !== party.characters.length) {
    throw new Error('Composed room does not contain the complete party.');
  }
  const retainedNonPartyEquipment = (encounter.equipment ?? []).filter(
    (entry) => !partyById.has(entry.combatant),
  );
  const partyEquipment = party.characters.flatMap((character) =>
    character.equipment === null ? [] : [structuredClone(character.equipment)]);
  let nextEffectSequence = encounter.nextEffectSequence;
  const partyConsumables = party.characters.flatMap((character) =>
    character.consumables.map((consumable) => {
      const id = encounterEffectId(`effect:${String(nextEffectSequence)}`);
      nextEffectSequence += 1;
      return {
        id,
        source: character.combatantId,
        targets: [character.combatantId],
        createdRevision: encounter.revision,
        duration: { kind: 'permanent' as const },
        concentrationOwner: null,
        stackingIdentity: effectStackingIdentity(
          consumable.kind === 'goodberries' ? 'spell:goodberry' : `item:${String(consumable.itemId)}`,
        ),
        stacking: 'coexist' as const,
        repeatedSave: null,
        damageBreak: null,
        payload: consumable.kind === 'goodberries'
          ? {
              kind: 'consumable_healing_pool' as const,
              remainingUses: consumable.remainingUses,
              healingPerUse: 1 as const,
              activation: 'bonus_action' as const,
              encounterExpiry: 'not_tracked_24_hours' as const,
            }
          : {
              kind: 'healing_potion' as const,
              itemId: consumable.itemId,
              remainingUses: consumable.remainingUses,
              dice: { count: 2 as const, sides: 4 as const, modifier: 2 as const },
              activation: 'bonus_action' as const,
            },
      };
    }));
  const aidTargets = party.characters.filter((character) => character.aid !== null);
  const aidSources = new Set(aidTargets.map((character) => character.aid?.source));
  if (aidSources.size > 1) throw new Error('A party session cannot carry Aid from multiple sources.');
  const aidSource = aidTargets[0]?.aid?.source;
  const partyAid = aidSource === undefined ? [] : [{
    id: encounterEffectId(`effect:${String(nextEffectSequence++)}`),
    source: aidSource,
    targets: aidTargets.map((character) => character.combatantId),
    createdRevision: encounter.revision,
    duration: {
      kind: 'turn_boundaries' as const,
      timing: { combatant: aidSource, boundary: 'start' as const, source: 'spell:aid' },
      remaining: 4_800,
    },
    concentrationOwner: null,
    stackingIdentity: effectStackingIdentity('spell:aid'),
    stacking: 'replace_same_source' as const,
    repeatedSave: null,
    damageBreak: null,
    payload: { kind: 'hit_point_maximum_modifier' as const, amount: 5 },
  }];
  const partyExhaustion = party.characters.flatMap((character) => {
    if (character.exhaustionLevel === 0) return [];
    const id = encounterEffectId(`effect:${String(nextEffectSequence)}`);
    nextEffectSequence += 1;
    return [{
      id,
      source: character.combatantId,
      targets: [character.combatantId],
      createdRevision: encounter.revision,
      duration: { kind: 'permanent' as const },
      concentrationOwner: null,
      stackingIdentity: effectStackingIdentity('condition:exhaustion'),
      stacking: 'coexist' as const,
      repeatedSave: null,
      damageBreak: null,
      payload: { kind: 'exhaustion' as const, level: character.exhaustionLevel },
    }];
  });
  return {
    ...encounter,
    combatants,
    effects: [...encounter.effects, ...partyConsumables, ...partyAid, ...partyExhaustion],
    nextEffectSequence,
    reactionPolicies: structuredClone(party.reactionPolicies),
    ...((encounter.equipment === undefined && partyEquipment.length === 0)
      ? {}
      : { equipment: [...retainedNonPartyEquipment, ...partyEquipment] }),
  };
}

function advanceRoom(room: AdventuringDayRoom): AdventuringDayRoom {
  switch (room) {
    case 1: return 2;
    case 2: return 3;
    case 3: return 4;
    case 4: throw new Error('The four-room adventuring day is complete.');
  }
}

export function enterNextRoom(state: PartySessionState): PartySessionState {
  if (state.adventuringDayStatus !== 'active') {
    throw new Error('A Long Rest ended this adventuring day.');
  }
  return { ...state, room: advanceRoom(state.room) };
}

export function takeShortRest(
  state: PartySessionState,
  spends: readonly ShortRestHitDieSpend[],
  rng: () => number,
): ShortRestResult {
  // 2024 SRD Short Rest: the creature needs at least 1 HP, each spent Hit
  // Point Die heals its roll + Constitution modifier (minimum 1), and another
  // die may be chosen after each roll: docs/srd/full/srd-5.2.1.txt:12035-12055.
  // Declared Short Rest features recharge as their descriptions specify:
  // docs/srd/full/srd-5.2.1.txt:12055-12057. Pact Magic explicitly restores
  // every expended Pact slot: docs/srd/full/srd-5.2.1.txt:4290-4295.
  const duplicate = spends.find(
    (spend, index) => spends.findIndex((candidate) => candidate.combatantId === spend.combatantId) !== index,
  );
  if (duplicate !== undefined) throw new Error(`Duplicate Short Rest spend for ${duplicate.combatantId}.`);
  const unknown = spends.find((spend) =>
    !state.characters.some((character) => character.combatantId === spend.combatantId));
  if (unknown !== undefined) throw new Error(`Short Rest names non-party character ${unknown.combatantId}.`);
  const rolls: ShortRestHitDieRoll[] = [];
  const characters = state.characters.map((character): PartyCharacterSessionState => {
    const spend = spends.find((candidate) => candidate.combatantId === character.combatantId);
    const requestedBySides = new Map<HitDieSize, number>();
    for (const request of spend?.dice ?? []) {
      if (!Number.isSafeInteger(request.count) || request.count < 0) {
        throw new RangeError('A Short Rest Hit Point Die count must be a nonnegative safe integer.');
      }
      if (requestedBySides.has(request.sides)) {
        throw new Error(`Short Rest repeats the d${String(request.sides)} pool.`);
      }
      requestedBySides.set(request.sides, request.count);
    }
    if (character.currentHitPoints < 1 || character.life !== 'living') {
      if ([...requestedBySides.values()].some((count) => count > 0)) {
        throw new Error(`${character.combatantId} must have at least 1 Hit Point to start a Short Rest.`);
      }
      return character;
    }
    let currentHitPoints = character.currentHitPoints;
    const hitDice = character.hitDice.map((pool) => {
      const count = requestedBySides.get(pool.sides) ?? 0;
      if (count > pool.remaining) {
        throw new RangeError(`${character.combatantId} has only ${String(pool.remaining)}d${String(pool.sides)} remaining.`);
      }
      for (let index = 0; index < count; index += 1) {
        const random = rng();
        if (!Number.isFinite(random) || random < 0 || random >= 1) {
          throw new RangeError('Short Rest RNG must return a finite value in [0, 1).');
        }
        const face = Math.floor(random * pool.sides) + 1;
        const healing = Math.max(1, face + character.constitutionModifier);
        currentHitPoints = Math.min(character.hitPointMaximum, currentHitPoints + healing);
        rolls.push({
          combatantId: character.combatantId,
          sides: pool.sides,
          face,
          constitutionModifier: character.constitutionModifier,
          healing,
        });
      }
      return { ...pool, remaining: pool.remaining - count };
    });
    for (const sides of requestedBySides.keys()) {
      if (!character.hitDice.some((pool) => pool.sides === sides)) {
        throw new Error(`${character.combatantId} has no d${String(sides)} Hit Point Dice.`);
      }
    }
    return {
      ...character,
      currentHitPoints,
      hitDice,
      spellSlots: character.spellSlots.map((slot) =>
        slot.recharge === 'short_rest' ? { ...slot, remaining: slot.maximum } : slot),
      limitedResources: character.limitedResources.map((resource) =>
        resource.recharge === 'short_rest' ? { ...resource, remaining: resource.maximum } : resource),
    };
  });
  return { state: { ...state, characters }, rolls };
}

export function takeLongRest(state: PartySessionState): LongRestResult {
  if (state.adventuringDayStatus !== 'active') {
    throw new Error('This adventuring day already ended with a Long Rest.');
  }
  // SRD structure and completion benefits: docs/srd/full/srd-5.2.1.txt:11901-11924.
  // Spellcasting slots: docs/srd/full/srd-5.2.1.txt:6321-6322. Pact Magic is
  // independently a Short-or-Long-Rest pool: docs/srd/full/srd-5.2.1.txt:4290-4295.
  const summaries: LongRestCharacterSummary[] = [];
  const characters = state.characters.map((character): PartyCharacterSessionState => {
    const postAidMaximum = character.hitPointMaximum - (character.aid?.amount ?? 0);
    if (character.life === 'dead' || character.life === 'dying') {
      summaries.push({
        combatantId: character.combatantId,
        hitPointsRestored: 0,
        hitDiceRestored: [],
        spellSlotsRestored: [],
        exhaustionLevelsRemoved: 0,
        limitedResourcesRestored: [],
        lifeBefore: character.life,
        lifeAfter: character.life,
      });
      return { ...character, hitPointMaximum: postAidMaximum, aid: null };
    }

    // A Stable creature naturally regains 1 HP after 1d4 hours. Since 1d4 is
    // bounded by 4 hours, an uninterrupted 8-hour Long Rest always spans that
    // recovery. Resolve it deterministically at rest start so the creature has
    // 1 HP and is conscious before checking eligibility and applying benefits:
    // docs/srd/full/srd-5.2.1.txt:1115-1120, 11910-11917.
    const restStarter: PartyCharacterSessionState = character.life === 'stable' &&
      character.currentHitPoints === 0
      ? { ...character, currentHitPoints: 1, life: 'living', deathSaves: null }
      : character;
    if (restStarter.life !== 'living' || restStarter.currentHitPoints < 1) {
      summaries.push({
        combatantId: character.combatantId,
        hitPointsRestored: 0,
        hitDiceRestored: [],
        spellSlotsRestored: [],
        exhaustionLevelsRemoved: 0,
        limitedResourcesRestored: [],
        lifeBefore: character.life,
        lifeAfter: character.life,
      });
      return character;
    }

    const hitDiceRestored: LongRestCharacterSummary['hitDiceRestored'][number][] = [];
    const hitDice = restStarter.hitDice.map((pool) => {
      const restored = pool.maximum - pool.remaining;
      if (restored > 0) hitDiceRestored.push({ sides: pool.sides, count: restored });
      return { ...pool, remaining: pool.maximum };
    });
    const spellSlotsRestored = restStarter.spellSlots.flatMap((slot) => {
      const count = slot.maximum - slot.remaining;
      return count === 0 ? [] : [{ pool: slot.pool, level: slot.level, count }];
    });
    const limitedResourcesRestored = restStarter.limitedResources.flatMap((resource) => {
      if (resource.recharge !== 'long_rest') return [];
      const count = resource.maximum - resource.remaining;
      return count === 0 ? [] : [{ id: resource.id, count }];
    });
    const exhaustionLevelsRemoved = restStarter.exhaustionLevel === 0 ? 0 : 1;
    const lifeAfter: LifeState = 'living';
    summaries.push({
      combatantId: character.combatantId,
      hitPointsRestored: Math.max(0, postAidMaximum - character.currentHitPoints),
      hitDiceRestored,
      spellSlotsRestored,
      exhaustionLevelsRemoved,
      limitedResourcesRestored,
      lifeBefore: character.life,
      lifeAfter,
    });
    return {
      ...restStarter,
      currentHitPoints: postAidMaximum,
      hitPointMaximum: postAidMaximum,
      aid: null,
      exhaustionLevel: Math.max(0, restStarter.exhaustionLevel - 1) as PartyExhaustionLevel,
      life: lifeAfter,
      deathSaves: null,
      hitDice,
      spellSlots: restStarter.spellSlots.map((slot) => ({ ...slot, remaining: slot.maximum })),
      limitedResources: restStarter.limitedResources.map((resource) =>
        resource.recharge === 'long_rest'
          ? { ...resource, remaining: resource.maximum }
          : resource),
    };
  });
  return {
    state: { ...state, adventuringDayStatus: 'ended_by_long_rest', characters },
    summary: {
      kind: 'long_rest_summary',
      durationHours: LONG_REST_RULES.minimumDurationHours,
      characters: summaries,
      citations: LONG_REST_CITATIONS,
    },
  };
}

export function projectDmPartySession(state: PartySessionState): DmPartySessionView {
  return { audience: 'dm', state: structuredClone(state) };
}

export function projectPlayerPartySession(
  state: PartySessionState,
  ownedCombatantIds: readonly CombatantId[],
): PlayerPartySessionView {
  const owned = new Set(ownedCombatantIds);
  return {
    audience: 'player',
    rulesEdition: state.rulesEdition,
    room: state.room,
    adventuringDayStatus: state.adventuringDayStatus,
    characters: state.characters.map((character) => ({
      combatantId: character.combatantId,
      life: character.life,
    })),
    ownedCharacters: state.characters.filter((character) => owned.has(character.combatantId)).map((character) => ({
      combatantId: character.combatantId,
      life: character.life,
      currentHitPoints: character.currentHitPoints,
      hitPointMaximum: character.hitPointMaximum,
      exhaustionLevel: character.exhaustionLevel,
      constitutionModifier: character.constitutionModifier,
      spellSlots: structuredClone(character.spellSlots),
      limitedResources: structuredClone(character.limitedResources),
      hitDice: structuredClone(character.hitDice),
      consumables: structuredClone(character.consumables),
      aid: structuredClone(character.aid),
      equipment: structuredClone(character.equipment),
    })),
    reactionPolicies: state.reactionPolicies
      .filter((entry) => owned.has(entry.combatant))
      .map((entry) => ({ ...entry })),
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size && Object.keys(value).every((key) => expected.has(key));
}

function safeNonnegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

function decodeDeathSaves(value: unknown, life: LifeState): DeathSaveState | null {
  if (life !== 'dying') {
    if (value !== null) throw new TypeError('Only a dying party character may have Death Saves.');
    return null;
  }
  if (!isRecord(value) || !exactKeys(value, ['successes', 'failures']) ||
    !safeNonnegativeInteger(value.successes) || value.successes > 2 ||
    !safeNonnegativeInteger(value.failures) || value.failures > 2) {
    throw new TypeError('Party character Death Saves are malformed.');
  }
  return { successes: value.successes, failures: value.failures };
}

function decodeEquipment(value: unknown, combatant: CombatantId): CombatantEquipment | null {
  if (value === null) return null;
  if (!isRecord(value) || !exactKeys(value, ['combatant', 'hands', 'worn', 'carried']) ||
    value.combatant !== combatant || !isRecord(value.hands) ||
    !Array.isArray(value.worn) || !value.worn.every((entry) => typeof entry === 'string') ||
    !Array.isArray(value.carried) || !value.carried.every((entry) => typeof entry === 'string')) {
    throw new TypeError('Party character equipment is malformed.');
  }
  const hands = (() => {
    switch (value.hands.kind) {
      case 'empty':
        if (!exactKeys(value.hands, ['kind'])) break;
        return { kind: 'empty' as const };
      case 'one_handed':
        if (!exactKeys(value.hands, ['kind', 'items']) || !Array.isArray(value.hands.items) ||
          (value.hands.items.length !== 1 && value.hands.items.length !== 2) ||
          !value.hands.items.every((entry) => typeof entry === 'string')) break;
        return {
          kind: 'one_handed' as const,
          items: value.hands.items.map(itemId) as unknown as
            readonly [ReturnType<typeof itemId>] | readonly [ReturnType<typeof itemId>, ReturnType<typeof itemId>],
        };
      case 'two_handed':
        if (!exactKeys(value.hands, ['kind', 'item']) || typeof value.hands.item !== 'string') break;
        return { kind: 'two_handed' as const, item: itemId(value.hands.item) };
    }
    throw new TypeError('Party character hand equipment is malformed.');
  })();
  const worn = value.worn.map(itemId);
  const carried = value.carried.map(itemId);
  const all = [...(hands.kind === 'empty' ? [] : hands.kind === 'two_handed' ? [hands.item] : hands.items), ...worn, ...carried];
  if (new Set(all).size !== all.length) {
    throw new TypeError('Party character equipment item placements must be unique.');
  }
  return { combatant, hands, worn, carried };
}

function decodeHitDice(value: unknown): readonly PartyHitDiceState[] {
  if (!Array.isArray(value)) throw new TypeError('Party Hit Point Dice must be an array.');
  const pools = value.map((entry) => {
    if (!isRecord(entry) || !exactKeys(entry, ['sides', 'maximum', 'remaining']) ||
      typeof entry.sides !== 'number' || !hitDieSizes.includes(entry.sides as HitDieSize) ||
      !safeNonnegativeInteger(entry.maximum) || entry.maximum < 1 ||
      !safeNonnegativeInteger(entry.remaining) || entry.remaining > entry.maximum) {
      throw new TypeError('Party Hit Point Dice are malformed.');
    }
    return entry as unknown as PartyHitDiceState;
  });
  if (new Set(pools.map((pool) => pool.sides)).size !== pools.length) {
    throw new TypeError('Party Hit Point Die sizes must be unique.');
  }
  return pools;
}

function decodePartyCharacter(value: unknown): PartyCharacterSessionState {
  const keys = [
    'characterId', 'combatantId', 'currentHitPoints', 'hitPointMaximum',
    'exhaustionLevel', 'constitutionModifier', 'life', 'deathSaves', 'spellSlots',
    'limitedResources', 'hitDice', 'consumables', 'aid', 'equipment',
  ] as const;
  if (!isRecord(value) || !exactKeys(value, keys) ||
    !Number.isSafeInteger(value.characterId) || typeof value.characterId !== 'number' || value.characterId < 1 ||
    typeof value.combatantId !== 'string' || !safeNonnegativeInteger(value.currentHitPoints) ||
    !safeNonnegativeInteger(value.hitPointMaximum) || value.hitPointMaximum < 1 || value.currentHitPoints > value.hitPointMaximum ||
    !safeNonnegativeInteger(value.exhaustionLevel) || value.exhaustionLevel > 6 ||
    !Number.isSafeInteger(value.constitutionModifier) || typeof value.constitutionModifier !== 'number' ||
    !['living', 'dying', 'stable', 'dead'].includes(String(value.life)) ||
    !(value.deathSaves === null || isRecord(value.deathSaves)) ||
    !Array.isArray(value.spellSlots) || !Array.isArray(value.limitedResources) ||
    !Array.isArray(value.consumables) || !(value.aid === null || isRecord(value.aid)) ||
    !(value.equipment === null || isRecord(value.equipment))) {
    throw new TypeError('Party character session state is malformed.');
  }
  const combatant = combatantId(value.combatantId);
  const life = value.life as LifeState;
  if ((life === 'living') !== (value.currentHitPoints > 0)) {
    throw new TypeError('Party character life state does not match its Hit Points.');
  }
  const spellSlots = value.spellSlots.map((slot) => {
    if (!isRecord(slot) || !exactKeys(slot, ['pool', 'level', 'maximum', 'remaining', 'recharge']) ||
      (slot.pool !== 'shared' && slot.pool !== 'pact_magic') ||
      !Number.isSafeInteger(slot.level) || typeof slot.level !== 'number' || slot.level < 1 || slot.level > 9 ||
      !safeNonnegativeInteger(slot.maximum) || slot.maximum < 1 ||
      !safeNonnegativeInteger(slot.remaining) || slot.remaining > slot.maximum ||
      (slot.recharge !== 'long_rest' && slot.recharge !== 'short_rest') ||
      (slot.pool === 'shared' ? slot.recharge !== 'long_rest' : slot.recharge !== 'short_rest')) {
      throw new TypeError('Party spell-slot state is malformed.');
    }
    return slot as unknown as PartySpellSlotState;
  });
  if (new Set(spellSlots.map((slot) => `${slot.pool}:${String(slot.level)}`)).size !== spellSlots.length) {
    throw new TypeError('Party spell-slot pools must be unique.');
  }
  const limitedResources = value.limitedResources.map((resource): PartyLimitedResourceState => {
    if (!isRecord(resource) || !exactKeys(resource, ['id', 'maximum', 'remaining', 'recharge']) ||
      typeof resource.id !== 'string' || !safeNonnegativeInteger(resource.maximum) || resource.maximum < 1 ||
      !safeNonnegativeInteger(resource.remaining) || resource.remaining > resource.maximum ||
      (resource.recharge !== 'long_rest' && resource.recharge !== 'short_rest')) {
      throw new TypeError('Party limited-resource state is malformed.');
    }
    return {
      id: limitedResourcePoolId(resource.id),
      maximum: resource.maximum,
      remaining: resource.remaining,
      recharge: resource.recharge as 'long_rest' | 'short_rest',
    };
  });
  if (new Set(limitedResources.map((resource) => resource.id)).size !== limitedResources.length) {
    throw new TypeError('Party limited-resource pools must be unique.');
  }
  const consumables = value.consumables.map((consumable): PartyConsumableState => {
    if (!isRecord(consumable) || typeof consumable.effectId !== 'string' ||
      !safeNonnegativeInteger(consumable.remainingUses)) {
      throw new TypeError('Party consumable state is malformed.');
    }
    if (consumable.kind === 'goodberries' && exactKeys(consumable, ['kind', 'effectId', 'remainingUses'])) {
      return { kind: 'goodberries', effectId: encounterEffectId(consumable.effectId), remainingUses: consumable.remainingUses };
    }
    if (consumable.kind === 'potion_of_healing' &&
      exactKeys(consumable, ['kind', 'effectId', 'itemId', 'remainingUses']) &&
      typeof consumable.itemId === 'string') {
      return {
        kind: 'potion_of_healing',
        effectId: encounterEffectId(consumable.effectId),
        itemId: itemId(consumable.itemId),
        remainingUses: consumable.remainingUses,
      };
    }
    throw new TypeError('Party consumable state is malformed.');
  });
  if (new Set(consumables.map((consumable) => consumable.effectId)).size !== consumables.length) {
    throw new TypeError('Party consumable effects must be unique.');
  }
  const aid = value.aid === null ? null : (() => {
    if (!exactKeys(value.aid, ['source', 'amount']) || typeof value.aid.source !== 'string' || value.aid.amount !== 5) {
      throw new TypeError('Party Aid state is malformed.');
    }
    return { source: combatantId(value.aid.source), amount: 5 as const };
  })();
  return {
    characterId: value.characterId,
    combatantId: combatant,
    currentHitPoints: value.currentHitPoints,
    hitPointMaximum: value.hitPointMaximum,
    exhaustionLevel: value.exhaustionLevel as PartyExhaustionLevel,
    constitutionModifier: value.constitutionModifier,
    life,
    deathSaves: decodeDeathSaves(value.deathSaves, life),
    spellSlots,
    limitedResources,
    hitDice: decodeHitDice(value.hitDice),
    consumables,
    aid,
    equipment: decodeEquipment(value.equipment, combatant),
  };
}

export function decodePartySessionState(value: unknown): PartySessionState {
  if (
    !isRecord(value) ||
    !exactKeys(value, ['schemaVersion', 'rulesEdition', 'room', 'adventuringDayStatus', 'characters', 'reactionPolicies', 'refusalHandling']) ||
    value.schemaVersion !== PARTY_SESSION_SCHEMA_VERSION ||
    value.rulesEdition !== '2024' ||
    !([1, 2, 3, 4] as const).includes(Number(value.room) as AdventuringDayRoom) ||
    (value.adventuringDayStatus !== 'active' && value.adventuringDayStatus !== 'ended_by_long_rest') ||
    !Array.isArray(value.characters) || !Array.isArray(value.reactionPolicies) ||
    value.characters.length < 3 ||
    value.characters.length > 5
  ) {
    throw new TypeError('Party session state is malformed.');
  }
  const characters = value.characters.map(decodePartyCharacter);
  if (new Set(characters.map((character) => character.combatantId)).size !== characters.length ||
    new Set(characters.map((character) => character.characterId)).size !== characters.length) {
    throw new TypeError('Party session character identities must be unique.');
  }
  const characterIds = new Set(characters.map((character) => character.combatantId));
  const reactionPolicies = value.reactionPolicies.map((entry): CombatantReactionPolicy => {
    if (!isRecord(entry) || !exactKeys(entry, ['combatant', 'reactionKind', 'policy']) ||
      typeof entry.combatant !== 'string' || !characterIds.has(combatantId(entry.combatant)) ||
      !REACTION_KINDS.includes(entry.reactionKind as ReactionKind) ||
      (entry.policy !== 'ask' && entry.policy !== 'always' && entry.policy !== 'never')) {
      throw new TypeError('Party reaction policy is malformed.');
    }
    return {
      combatant: combatantId(entry.combatant),
      reactionKind: entry.reactionKind as ReactionKind,
      policy: entry.policy,
    };
  });
  const policyKeys = reactionPolicies.map((entry) => `${entry.combatant}:${entry.reactionKind}`);
  if (new Set(policyKeys).size !== policyKeys.length ||
    reactionPolicies.length !== characters.length * REACTION_KINDS.length) {
    throw new TypeError('Party reaction policies must cover every character and reaction kind exactly once.');
  }
  const refusalHandlingValue = value.refusalHandling;
  if (!isRecord(refusalHandlingValue) || !exactKeys(refusalHandlingValue, REFUSAL_CATEGORIES)) {
    throw new TypeError('Party refusal handling settings are malformed.');
  }
  const refusalHandling = Object.fromEntries(REFUSAL_CATEGORIES.map((category) => {
    const mode = refusalHandlingValue[category];
    if (typeof mode !== 'string' || !handlingModesForCategory(category).includes(mode as RefusalHandlingMode)) {
      throw new TypeError('Party refusal handling settings are malformed.');
    }
    return [category, mode];
  })) as RefusalHandlingSettings;
  return {
    schemaVersion: PARTY_SESSION_SCHEMA_VERSION,
    rulesEdition: '2024',
    room: value.room as AdventuringDayRoom,
    adventuringDayStatus: value.adventuringDayStatus,
    characters,
    reactionPolicies,
    refusalHandling,
  };
}
