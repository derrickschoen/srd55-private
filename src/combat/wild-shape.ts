import { abilities, creatureSizes, skills, type Ability, type KnownCreatureSize, type Skill } from '../domain/enums';
import type { CombatRulesProfile } from './combatant';
import type { ChallengeRating, MonsterAction, MonsterStatblock, MonsterMovementSpeed } from './statblock';
import { BUNDLED_MONSTER_ROSTER } from './statblocks/roster';
import { statblockId, type StatblockId } from './values';
import { EncounterRuleError } from './encounter-rule-error';

export type WildShapeDruidLevel =
  | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11
  | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20;

export type WildShapeEquipmentDisposition =
  | 'dropped_at_origin'
  | 'merged_into_form'
  | 'worn_if_practical';

export type WildShapeGate =
  | { readonly kind: 'challenge_rating'; readonly maximum: '1/4' | '1/2' | 1; readonly actual: ChallengeRating }
  | { readonly kind: 'fly_speed'; readonly minimumDruidLevel: 8 };

/** The character-sheet-owned portion of the feature. */
export interface WildShapeCharacterSheet {
  readonly kind: 'wild_shape_2024';
  readonly druidLevel: WildShapeDruidLevel;
  readonly knownForms: readonly StatblockId[];
  readonly knownFormMaximum: 4 | 6 | 8;
  readonly usesMaximum: 2 | 3 | 4;
}

export interface WildShapeUseState {
  readonly kind: 'wild_shape_uses';
  readonly maximum: 2 | 3 | 4;
  readonly remaining: number;
}

export interface WildShapePhysicalLayer {
  readonly armorClass: CombatRulesProfile['armorClass'];
  readonly hitPointMaximum: number;
  readonly hitPoints: number;
  readonly speed: CombatRulesProfile['speed'];
  readonly movement: readonly MonsterMovementSpeed[];
  readonly initiativeBonus: number;
  readonly abilityScores: Readonly<Record<Ability, number>>;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly skillBonuses: Readonly<Partial<Record<Skill, number>>>;
  readonly attacksPerAction: number;
  readonly reach: CombatRulesProfile['reach'];
  readonly damageResponses: CombatRulesProfile['damageResponses'];
  readonly conditionImmunities: readonly string[];
  readonly senses: CombatRulesProfile['senses'];
  readonly passivePerception: number;
  readonly detectionTraits: CombatRulesProfile['detectionTraits'];
  readonly contactMedium: CombatRulesProfile['contactMedium'];
  readonly sizeCategory: CombatRulesProfile['sizeCategory'];
  readonly actions: readonly MonsterAction[];
}

export interface WildShapeOverlay {
  readonly kind: 'wild_shape_overlay';
  readonly formId: StatblockId;
  readonly formName: string;
  readonly druidLevel: WildShapeDruidLevel;
  readonly startedRound: number;
  readonly expiresAtRound: number;
  readonly equipmentDisposition: WildShapeEquipmentDisposition;
  readonly physical: WildShapePhysicalLayer;
}

export type WildShapeReversionReason =
  | 'voluntary_bonus_action'
  | 'duration_expired'
  | 'form_hit_points_depleted'
  | 'incapacitated'
  | 'death'
  | 'new_wild_shape';

export type WildShapeRefusalCode =
  | 'not_player_character'
  | 'feature_unavailable'
  | 'no_uses_remaining'
  | 'unknown_form'
  | 'form_not_known'
  | 'challenge_rating_gate'
  | 'fly_speed_gate'
  | 'not_wildshaped';

export class WildShapeRuleError extends EncounterRuleError {
  override readonly name = 'WildShapeRuleError' as const;

  constructor(
    readonly code: WildShapeRefusalCode,
    readonly gate: WildShapeGate | null,
    message: string,
  ) {
    super('wild_shape_validation', message);
  }
}

function checkedDruidLevel(level: number): WildShapeDruidLevel {
  if (!Number.isSafeInteger(level) || level < 2 || level > 20) {
    throw new RangeError('Wild Shape requires a Druid level from 2 through 20.');
  }
  return level as WildShapeDruidLevel;
}

/** SRD 5.2.1: docs/srd/full/srd-5.2.1.txt:2604-2611. */
export function wildShapeKnownFormMaximum(level: WildShapeDruidLevel): 4 | 6 | 8 {
  if (level < 4) return 4;
  if (level < 8) return 6;
  return 8;
}

/** SRD 5.2.1: docs/srd/full/srd-5.2.1.txt:2533-2552,2580-2586. */
export function wildShapeUseMaximum(level: WildShapeDruidLevel): 2 | 3 | 4 {
  if (level < 6) return 2;
  if (level < 17) return 3;
  return 4;
}

/** One use on a Short Rest; all uses on a Long Rest (SRD lines 2580-2586). */
export function recoverWildShapeUses(
  state: WildShapeUseState,
  rest: 'short_rest' | 'long_rest',
): WildShapeUseState {
  switch (rest) {
    case 'short_rest': return { ...state, remaining: Math.min(state.maximum, state.remaining + 1) };
    case 'long_rest': return { ...state, remaining: state.maximum };
  }
}

/** SRD 5.2.1: docs/srd/full/srd-5.2.1.txt:2604-2611. */
export function wildShapeChallengeRatingMaximum(level: WildShapeDruidLevel): '1/4' | '1/2' | 1 {
  if (level < 4) return '1/4';
  if (level < 8) return '1/2';
  return 1;
}

/** Half the Druid level, rounded down, in six-second combat rounds. */
export function wildShapeDurationRounds(level: WildShapeDruidLevel): number {
  return Math.floor(level / 2) * 600;
}

export function createWildShapeCharacterSheet(
  druidLevel: number,
  knownForms: readonly string[],
): WildShapeCharacterSheet {
  const level = checkedDruidLevel(druidLevel);
  const knownFormMaximum = wildShapeKnownFormMaximum(level);
  if (knownForms.length !== knownFormMaximum) {
    throw new RangeError(`A level ${String(level)} Druid must know exactly ${String(knownFormMaximum)} Wild Shape forms.`);
  }
  const ids = knownForms.map(statblockId);
  if (new Set(ids).size !== ids.length) {
    throw new RangeError('Wild Shape known forms must be unique.');
  }
  for (const id of ids) {
    if (wildShapeForm(id) === null) {
      throw new RangeError(`Wild Shape known form ${id} is not a bundled Beast statblock.`);
    }
  }
  return {
    kind: 'wild_shape_2024',
    druidLevel: level,
    knownForms: ids,
    knownFormMaximum,
    usesMaximum: wildShapeUseMaximum(level),
  };
}

export function wildShapeForm(id: StatblockId): MonsterStatblock | null {
  const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.statblock.id === id);
  if (row === undefined) return null;
  const classification = row.statblock.sourceDetails.classification;
  const challenge = row.statblock.sourceDetails.challenge;
  return classification.kind === 'present' && classification.value.type === 'Beast' &&
    challenge.kind === 'present' && challenge.value.rating !== 'none'
    ? row.statblock
    : null;
}

function challengeValue(rating: ChallengeRating): number {
  switch (rating) {
    case '1/8': return 1 / 8;
    case '1/4': return 1 / 4;
    case '1/2': return 1 / 2;
    case 1:
    case 2:
    case 3:
    case 4:
    case 5:
    case 6: return rating;
  }
}

export function wildShapeGateFor(
  level: WildShapeDruidLevel,
  form: MonsterStatblock,
): WildShapeGate | null {
  const challenge = form.sourceDetails.challenge;
  if (challenge.kind !== 'present' || challenge.value.rating === 'none') {
    throw new RangeError(`Wild Shape form ${form.id} has no Challenge Rating.`);
  }
  const maximum = wildShapeChallengeRatingMaximum(level);
  if (challengeValue(challenge.value.rating) > challengeValue(maximum)) {
    return { kind: 'challenge_rating', maximum, actual: challenge.value.rating };
  }
  const movement = form.sourceDetails.movement.kind === 'present'
    ? form.sourceDetails.movement.value
    : [];
  if (level < 8 && movement.some((entry) => entry.kind === 'fly')) {
    return { kind: 'fly_speed', minimumDruidLevel: 8 };
  }
  return null;
}

export function wildShapePhysicalLayer(form: MonsterStatblock): WildShapePhysicalLayer {
  const details = form.sourceDetails;
  if (details.abilities.kind !== 'present' || details.movement.kind !== 'present') {
    throw new RangeError(`Wild Shape form ${form.id} lacks its physical ability or movement layer.`);
  }
  const classification = details.classification;
  const actions = details.actions;
  const beastAbilities = details.abilities.value;
  return {
    armorClass: form.armorClass,
    hitPointMaximum: form.hitPointMaximum,
    hitPoints: form.hitPointMaximum,
    speed: form.speed,
    movement: structuredClone(details.movement.value),
    initiativeBonus: form.initiativeBonus,
    abilityScores: Object.fromEntries(abilities.map((ability) => [ability, beastAbilities[ability].score])) as Readonly<Record<Ability, number>>,
    savingThrowBonuses: { ...form.savingThrowBonuses },
    skillBonuses: details.skills.kind === 'present'
      ? Object.fromEntries(details.skills.value.flatMap((skill) => {
          const normalized = skill.name.toLowerCase().replaceAll(' ', '_');
          return skills.includes(normalized as Skill) ? [[normalized, skill.bonus]] : [];
        })) as Readonly<Partial<Record<Skill, number>>>
      : {},
    attacksPerAction: form.attacksPerAction,
    reach: form.reach,
    damageResponses: structuredClone(form.damageResponses),
    conditionImmunities: [...form.conditionImmunities],
    senses: structuredClone(form.senses),
    passivePerception: details.passivePerception.kind === 'present' ? details.passivePerception.value : 10,
    detectionTraits: details.traits.kind === 'present'
      ? details.traits.value.flatMap((trait) => {
          switch (trait.kind) {
            case 'web_sense':
            case 'keen_sight':
            case 'flyby': return [trait.kind];
            default: return [];
          }
        })
      : [],
    contactMedium: details.movement.value.some((entry) => entry.kind === 'swim') ? 'liquid' : 'surface',
    sizeCategory: classification.kind === 'present' && classification.value.sizes.length === 1 &&
      creatureSizes.includes(classification.value.sizes[0] as KnownCreatureSize)
      ? classification.value.sizes[0] as KnownCreatureSize
      : undefined,
    actions: actions.kind === 'present' ? structuredClone(actions.value) : [],
  };
}

/**
 * The typed lens names every physical replacement. All unmentioned rule fields
 * stay on the PC profile, including spell slots and class/feat effects.
 */
export function wildShapeRulesLens(
  trueForm: CombatRulesProfile,
  overlay: WildShapeOverlay,
): CombatRulesProfile {
  const beast = overlay.physical;
  const trueScores = trueForm.abilityScores;
  const abilityScores = trueScores === undefined
    ? beast.abilityScores
    : {
        strength: beast.abilityScores.strength,
        dexterity: beast.abilityScores.dexterity,
        constitution: beast.abilityScores.constitution,
        intelligence: trueScores.intelligence,
        wisdom: trueScores.wisdom,
        charisma: trueScores.charisma,
      };
  return {
    ...trueForm,
    armorClass: beast.armorClass,
    hitPointMaximum: beast.hitPointMaximum,
    speed: beast.speed,
    initiativeBonus: beast.initiativeBonus,
    abilityScores,
    savingThrowBonuses: Object.fromEntries(abilities.map((ability) => [
      ability,
      Math.max(trueForm.savingThrowBonuses[ability], beast.savingThrowBonuses[ability]),
    ])) as Readonly<Record<Ability, number>>,
    attacksPerAction: beast.attacksPerAction,
    reach: beast.reach,
    damageResponses: beast.damageResponses,
    conditionImmunities: beast.conditionImmunities,
    senses: beast.senses,
    passivePerception: Math.max(trueForm.passivePerception, beast.passivePerception),
    detectionTraits: beast.detectionTraits,
    contactMedium: beast.contactMedium,
    ...(beast.sizeCategory === undefined ? {} : { sizeCategory: beast.sizeCategory }),
    skillBonuses: Object.fromEntries(skills.flatMap((skill) => {
      const trueBonus = trueForm.skillBonuses?.[skill];
      const beastBonus = beast.skillBonuses[skill];
      if (trueBonus === undefined && beastBonus === undefined) return [];
      return [[skill, Math.max(trueBonus ?? Number.NEGATIVE_INFINITY, beastBonus ?? Number.NEGATIVE_INFINITY)]];
    })),
  };
}

function record(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const expected = new Set(keys);
  return Object.keys(value).length === expected.size && Object.keys(value).every((key) => expected.has(key));
}

/** Strict persistence decoder for the closed Wild Shape overlay. */
export function decodeWildShapeOverlay(value: unknown): WildShapeOverlay {
  if (!record(value) || value.kind !== 'wild_shape_overlay') {
    throw new TypeError('Wild Shape overlay has an unknown kind.');
  }
  if (!exactKeys(value, [
    'kind', 'formId', 'formName', 'druidLevel', 'startedRound', 'expiresAtRound',
    'equipmentDisposition', 'physical',
  ]) || typeof value.formId !== 'string' || typeof value.formName !== 'string' ||
    !Number.isSafeInteger(value.druidLevel) || !Number.isSafeInteger(value.startedRound) ||
    !Number.isSafeInteger(value.expiresAtRound) || !record(value.physical) ||
    !['dropped_at_origin', 'merged_into_form', 'worn_if_practical'].includes(String(value.equipmentDisposition))) {
    throw new TypeError('Wild Shape overlay is malformed.');
  }
  const form = wildShapeForm(statblockId(value.formId));
  if (form === null || form.name !== value.formName) {
    throw new TypeError('Wild Shape overlay references an unknown bundled Beast form.');
  }
  const level = checkedDruidLevel(value.druidLevel as number);
  const physical = value.physical;
  if (!Number.isSafeInteger(physical.hitPoints) || typeof physical.hitPoints !== 'number' ||
    physical.hitPoints < 0 || physical.hitPoints > form.hitPointMaximum) {
    throw new TypeError('Wild Shape physical Hit Points are malformed.');
  }
  const expected = wildShapePhysicalLayer(form);
  return {
    kind: 'wild_shape_overlay',
    formId: form.id,
    formName: form.name,
    druidLevel: level,
    startedRound: value.startedRound as number,
    expiresAtRound: value.expiresAtRound as number,
    equipmentDisposition: value.equipmentDisposition as WildShapeEquipmentDisposition,
    physical: { ...expected, hitPoints: physical.hitPoints },
  };
}

export function decodeWildShapeUseState(value: unknown): WildShapeUseState {
  if (!record(value) || !exactKeys(value, ['kind', 'maximum', 'remaining']) ||
    value.kind !== 'wild_shape_uses' ||
    (value.maximum !== 2 && value.maximum !== 3 && value.maximum !== 4) ||
    !Number.isSafeInteger(value.remaining) || typeof value.remaining !== 'number' ||
    value.remaining < 0 || value.remaining > value.maximum) {
    throw new TypeError('Wild Shape use state is malformed.');
  }
  return { kind: 'wild_shape_uses', maximum: value.maximum, remaining: value.remaining };
}
