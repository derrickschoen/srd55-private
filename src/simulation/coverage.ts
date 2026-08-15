import type { SheetGap } from '../queries/character-sheet-builder';
import type { SheetWarning } from '../rules/sheet';
import { sha256 } from '../crypto/sha256';
import bundledSrd521 from '../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../docs/srd/source/spell-descriptions.txt?raw';
import type { Ability, DamageType } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import {
  BUNDLED_SRD_5_2_1_PATH,
  resourceRecoveryClauseId,
  saveSuccessClauseId,
  sourceStableKey,
  unmodelledIssueKinds,
  unmodelledIssueId,
  type BundledSrdHeading,
  type CriticalHitRule,
  type DamageInstance,
  type DamageNeutralMechanicId,
  type DamageNeutralityEvidence,
  type EventFrequency,
  type PublicSourceRef,
  type ResourceRecoveryClauseId,
  type ResourceRecoveryEvidence,
  type SaveSuccessClauseId,
  type SaveSuccessOutcome,
  type SavingThrowDamageDuration,
  type SourceRef,
  type SourceStableKey,
  type UnmodelledIssue,
  type UnmodelledIssueKind,
} from './contracts';
import {
  deriveSaveDamageCoverageFromBodies,
  spellDescriptionsByHeading,
  spellDescriptionsFromFullLayout,
  type FailedDamageSignature,
  type SourceDerivedSaveClause,
  type SourceDerivedSaveDamageCandidate,
} from './spell-source-reader';

export type { SourceDerivedSaveDamageCandidate } from './spell-source-reader';

export type CoverageClassification =
  | 'blocking'
  | 'contextual'
  | 'display_only';

type SheetWarningCode = SheetWarning['code'];
type SheetGapKind = SheetGap['kind'];

/**
 * Exhaustive by construction: a newly added sheet warning cannot silently
 * acquire a simulation meaning. Contextual warnings need a structured routine
 * check in the later assembler; they are never interpreted from message text.
 */
export const sheetWarningCoverage = {
  no_starting_class: 'blocking',
  several_starting_classes: 'blocking',
  strength_requirement_unmet: 'display_only',
  armor_slot_mismatch: 'display_only',
  assumed_hit_die: 'display_only',
  roll_exceeds_hit_die: 'display_only',
  armor_value_out_of_vocabulary: 'display_only',
  total_level_exceeds_maximum: 'contextual',
  weapon_not_proficient: 'contextual',
  weapon_category_not_stated: 'contextual',
  weapon_proficiency_qualifier_unread: 'contextual',
  armor_not_trained: 'display_only',
  multiclass_primary_ability_unmet: 'display_only',
  multiclass_primary_ability_unprovable: 'display_only',
} as const satisfies Record<SheetWarningCode, CoverageClassification>;

/** See `sheetWarningCoverage`; the same compile-time completeness rule applies. */
export const sheetGapCoverage = {
  no_class_feature_text: 'contextual',
  partial_subclass_catalog: 'display_only',
  expertise_choice_unfilled: 'display_only',
  expertise_proficiency_removed: 'display_only',
  languages_and_tools_not_modelled: 'display_only',
  weapon_reach_not_recorded: 'contextual',
  gear_not_itemised: 'display_only',
  required_source_choice: 'contextual',
} as const satisfies Record<SheetGapKind, CoverageClassification>;

export const unmodelledIssuePriority = {
  routine_selection_required: 10,
  target_save_bonus_required: 20,
  damage_response_required: 30,
  attack_bonus_undetermined: 40,
  weapon_damage_not_recorded: 50,
  damage_type_choice_unresolved: 60,
  unresolved_extra_attack: 70,
  spellcasting_statistic_absent: 80,
  feature_value_unavailable: 90,
  resource_maximum_unavailable: 100,
  resource_recovery_not_modeled: 110,
  routine_requires_unavailable_resource: 120,
  setup_action_not_modeled: 130,
  trigger_frequency_not_quantified: 140,
  summon_stat_block_not_modeled: 150,
  unsupported_damage_relevant_feature: 160,
  unknown_feature_relevance: 170,
  unsupported_multi_target_effect: 180,
  unsupported_reaction_or_enemy_turn_damage: 190,
} as const satisfies Record<UnmodelledIssueKind, number>;

export const compactIssueMessages = {
  routine_selection_required: 'Choose a routine to calculate this character.',
  target_save_bonus_required: 'Enter the target save bonus this routine needs.',
  damage_response_required: 'Choose how the target responds to this damage.',
  attack_bonus_undetermined: 'Resolve the attack bonus for this routine.',
  weapon_damage_not_recorded: 'Record the weapon damage for this routine.',
  damage_type_choice_unresolved: 'Choose the damage type for this routine.',
  unresolved_extra_attack: 'Resolve which weapon receives the extra attack.',
  spellcasting_statistic_absent: 'Resolve the spellcasting statistic.',
  feature_value_unavailable: 'A required feature value is unavailable.',
  resource_maximum_unavailable: 'A required resource maximum is unavailable.',
  resource_recovery_not_modeled: 'This resource recovery is not modelled.',
  routine_requires_unavailable_resource: 'This routine needs an unavailable resource.',
  setup_action_not_modeled: 'This routine has an unmodelled setup action.',
  trigger_frequency_not_quantified: 'This trigger frequency cannot be quantified.',
  summon_stat_block_not_modeled: 'This summoned creature is not modelled.',
  unsupported_damage_relevant_feature: 'A damage-relevant feature is unsupported.',
  unknown_feature_relevance: 'The app cannot determine whether a feature changes damage.',
  unsupported_multi_target_effect: 'Multiple-target damage is unavailable.',
  unsupported_reaction_or_enemy_turn_damage: 'Enemy-turn or reaction damage is unavailable.',
} as const satisfies Record<UnmodelledIssueKind, string>;

export function compactIssueMessage(kind: UnmodelledIssueKind): string {
  return compactIssueMessages[kind];
}

const sourceKindRank = {
  character_source: 1,
  catalog_content: 2,
  character_weapon: 3,
} as const satisfies Record<SourceRef['kind'], number>;

function sourceStableValue(source: SourceRef | null): string {
  return source?.stable_key ?? '<no-source>';
}

function compareStableText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function createUnmodelledIssue(input: {
  readonly kind: UnmodelledIssueKind;
  readonly source: SourceRef | null;
  readonly discriminator: string;
  readonly detail: string;
  readonly why_it_changes_damage: string;
  readonly remedy: string | null;
}): UnmodelledIssue {
  const stableId = [
    input.kind,
    sourceStableValue(input.source),
    input.discriminator,
  ]
    .map(encodeURIComponent)
    .join(':');
  return {
    id: unmodelledIssueId(stableId),
    kind: input.kind,
    source: input.source,
    detail: input.detail,
    why_it_changes_damage: input.why_it_changes_damage,
    remedy: input.remedy,
  };
}

export function orderUnmodelledIssues(
  issues: readonly UnmodelledIssue[],
): UnmodelledIssue[] {
  return [...issues].sort((left, right) => {
    const priority =
      unmodelledIssuePriority[left.kind] -
      unmodelledIssuePriority[right.kind];
    if (priority !== 0) {
      return priority;
    }
    const leftSourceRank = left.source === null ? 0 : sourceKindRank[left.source.kind];
    const rightSourceRank =
      right.source === null ? 0 : sourceKindRank[right.source.kind];
    if (leftSourceRank !== rightSourceRank) {
      return leftSourceRank - rightSourceRank;
    }
    const stableKey = compareStableText(
      sourceStableValue(left.source),
      sourceStableValue(right.source),
    );
    return stableKey !== 0 ? stableKey : compareStableText(left.id, right.id);
  });
}

export const publicProbabilityMechanicKinds = [
  'attack_roll',
  'natural_one_and_twenty',
  'advantage_and_disadvantage',
  'saving_throw',
  'damage_roll',
  'critical_hit',
  'save_half_damage',
  'resistance',
  'vulnerability',
  'damage_order',
  'immunity',
] as const;
export type PublicProbabilityMechanicKind =
  (typeof publicProbabilityMechanicKinds)[number];

const reviewedBundledSrdHeadings = [
  'Acid Splash',
  'Advantage/Disadvantage',
  'Attack Rolls',
  'Arcane Hand',
  'Befuddlement',
  'Bestow Curse',
  'Black Tentacles',
  'Blade Barrier',
  'Blight',
  'Burning Hands',
  'Call Lightning',
  'Chain Lightning',
  'Circle of Death',
  'Cloudkill',
  'Cone of Cold',
  'Conjure Animals',
  'Conjure Celestial',
  'Conjure Elemental',
  'Conjure Woodland Beings',
  'Contagion',
  'Contact Other Plane',
  'Control Water',
  'Critical Hits',
  'Damage Rolls',
  'Delayed Blast Fireball',
  'Disintegrate',
  'Dissonant Whispers',
  'Dragon’s Breath',
  'Dream',
  'Earthquake',
  'Enlarge/Reduce',
  'Ensnaring Strike',
  'Faithful Hound',
  'Finger of Death',
  'Fireball',
  'Fire Storm',
  'Flame Strike',
  'Flaming Sphere',
  'Freezing Sphere',
  'Glyph of Warding',
  'Geas',
  'Guardian of Faith',
  'Half Damage',
  'Harm',
  'Hellish Rebuke',
  'Ice Knife',
  'Ice Storm',
  'Incendiary Cloud',
  'Inflict Wounds',
  'Immunity',
  'Insect Plague',
  'Level 1: Rage',
  'Level 2: Channel Divinity',
  'Level 2: Font of Magic',
  'Level 3: Improved Critical',
  'Level 15: Superior Critical',
  'Lightning Bolt',
  'Meteor Swarm',
  'Mind Spike',
  'Moonbeam',
  'Order of Application',
  'Phantasmal Killer',
  'Phantasmal Force',
  'Prismatic Spray',
  'Prismatic Wall',
  'Ray of Enfeeblement',
  'Resistance and Vulnerability',
  'Rolling 20 or 1',
  'Sacred Flame',
  'Searing Smite',
  'Saving Throws',
  'Shatter',
  'Spirit Guardians',
  'Level 5: Sorcerous Restoration',
  'Storm of Vengeance',
  'Summon Dragon',
  'Sunbeam',
  'Sunburst',
  'Symbol',
  'Thunderwave',
  'Tsunami',
  'Vicious Mockery',
  'Vitriolic Sphere',
  'Wall of Fire',
  'Wall of Ice',
  'Wall of Thorns',
  'Weird',
  'Wind Wall',
] as const;

type ReviewedBundledSrdHeading =
  (typeof reviewedBundledSrdHeadings)[number];

const bundledSrdLineSegments = new Set(
  bundledSrd521
    .split(/\r?\n/u)
    .flatMap((line) => line.split(/\s{2,}/u))
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0),
);

/**
 * The sole constructor for bundled proof references. A heading must be in the
 * reviewed citation vocabulary and must occur as a complete column segment in
 * the bundled two-column SRD text. The brand prevents unchecked object literals
 * from satisfying any proof-bearing `PublicSourceRef` field.
 */
export function bundledSrdSourceRef(heading: unknown): PublicSourceRef {
  if (
    typeof heading !== 'string' ||
    !reviewedBundledSrdHeadings.some((candidate) => candidate === heading) ||
    !bundledSrdLineSegments.has(heading)
  ) {
    throw new TypeError(
      `Bundled SRD heading is not a reviewed literal heading: ${String(heading)}.`,
    );
  }
  return {
    kind: 'bundled_srd',
    path: BUNDLED_SRD_5_2_1_PATH,
    heading: heading as BundledSrdHeading,
  };
}

const bundledHeading = (
  heading: ReviewedBundledSrdHeading,
): PublicSourceRef => bundledSrdSourceRef(heading);

/**
 * The complete Stage 2B rules inventory. Each entry points to the bundled,
 * redistributable SRD text that authorizes and defines the mechanic. Functions
 * in `probability.ts` cite these entries beside the fold they implement.
 */
export const publicProbabilityCoverageManifest = {
  attack_roll: bundledHeading('Attack Rolls'),
  natural_one_and_twenty: bundledHeading('Rolling 20 or 1'),
  advantage_and_disadvantage: bundledHeading('Advantage/Disadvantage'),
  saving_throw: bundledHeading('Saving Throws'),
  damage_roll: bundledHeading('Damage Rolls'),
  critical_hit: bundledHeading('Critical Hits'),
  // `Half Damage` is the literal right-column heading beneath the parent
  // `Saving Throws and Damage` section in the bundled text.
  save_half_damage: bundledHeading('Half Damage'),
  resistance: bundledHeading('Resistance and Vulnerability'),
  vulnerability: bundledHeading('Resistance and Vulnerability'),
  damage_order: bundledHeading('Order of Application'),
  immunity: bundledHeading('Immunity'),
} as const satisfies Record<PublicProbabilityMechanicKind, PublicSourceRef>;

type ReviewedSaveSuccessClause = {
  readonly id: SaveSuccessClauseId;
  readonly effect_source: SourceRef & { readonly kind: 'catalog_content' };
  readonly effect_stable_key: SourceStableKey;
  readonly kind: SaveSuccessOutcome['kind'] | 'unavailable';
  readonly unavailable_reason: string | null;
  readonly evidence: PublicSourceRef;
  readonly source_span: string;
  readonly source_span_sha256: string;
  readonly ability: Ability;
  readonly fixed_save_dc: number | null;
  readonly frequency: EventFrequency;
  readonly failed_damage_signature_slots: readonly DamageSignatureSlot[];
  readonly failed_damage_roll_slot_groups: readonly DamageRollSlotGroup[];
  readonly success_damage_signature_slots: readonly DamageSignatureSlot[];
  readonly failed_damage_slot_repetitions: DamageSlotRepetitions;
  readonly success_roll_transform: 'none' | 'floor_half';
  readonly duration: SavingThrowDamageDuration;
};

type DamageSignatureSlot = readonly [
  FailedDamageSignature,
  ...FailedDamageSignature[],
];

type DamageRollSlotGroup = readonly [number, ...number[]];

type ReviewedDamageRequirementsCommon = {
  readonly success?: readonly DamageSignatureSlot[];
  readonly success_roll_transform?: 'none' | 'floor_half';
};

type ReviewedDamageRequirements = ReviewedDamageRequirementsCommon & (
  | {
      readonly failed: readonly [DamageSignatureSlot];
      readonly failed_roll_slot_groups?: never;
    }
  | {
      readonly failed: readonly [
        DamageSignatureSlot,
        DamageSignatureSlot,
        ...DamageSignatureSlot[],
      ];
      readonly failed_roll_slot_groups: readonly DamageRollSlotGroup[];
    }
);

type DamageSlotRepetitions = {
  readonly minimum: 1;
  readonly maximum: 1 | 2;
};

const dice = (
  count: number,
  die: number,
  damageType: DamageType | null,
): FailedDamageSignature => ({
  damage_type: damageType,
  dice_count: count,
  die_size: die,
  flat_modifier: null,
});

const flat = (
  modifier: number,
  damageType: DamageType,
): FailedDamageSignature => ({
  damage_type: damageType,
  dice_count: null,
  die_size: null,
  flat_modifier: modifier,
});

const required = (
  signature: FailedDamageSignature,
  ...alternatives: readonly FailedDamageSignature[]
): DamageSignatureSlot => [signature, ...alternatives];

function failedRollSlotGroups(
  requirements: ReviewedDamageRequirements,
): readonly DamageRollSlotGroup[] {
  if (requirements.failed.length === 1) {
    return [[0]];
  }
  if (requirements.failed_roll_slot_groups === undefined) {
    throw new TypeError('Every multi-slot damage clause must declare its source roll-slot groups.');
  }
  return requirements.failed_roll_slot_groups;
}

/**
 * Human-reviewed damage-component oracle. These requirements are declarations,
 * not projections of `deriveSaveDamageCoverage`: a slot is required once, and
 * multiple signatures inside one slot are alternatives. That distinction is
 * what Flame Strike (two slots) and Spirit Guardians (one alternative slot)
 * require and what a flat signature array cannot express.
 */
const reviewedDamageRequirementsByClause = {
  'acid-splash:damage': { failed: [required(dice(1, 6, 'Acid'))] },
  'befuddlement:damage': { failed: [required(dice(10, 12, 'Psychic'))] },
  'black-tentacles:damage': { failed: [required(dice(3, 6, 'Bludgeoning'))] },
  'blade-barrier:damage': { failed: [required(dice(6, 10, 'Force'))] },
  'blight:damage': { failed: [required(dice(8, 8, 'Necrotic'))] },
  'burning-hands:damage': { failed: [required(dice(3, 6, 'Fire'))] },
  'call-lightning:damage': { failed: [required(dice(3, 10, 'Lightning'))] },
  'chain-lightning:damage': { failed: [required(dice(10, 8, 'Lightning'))] },
  'circle-of-death:damage': { failed: [required(dice(8, 8, 'Necrotic'))] },
  'cloudkill:damage': { failed: [required(dice(5, 8, 'Poison'))] },
  'cone-of-cold:damage': { failed: [required(dice(8, 8, 'Cold'))] },
  'conjure-animals:damage': { failed: [required(dice(3, 10, 'Slashing'))] },
  'conjure-celestial:damage': { failed: [required(dice(6, 12, 'Radiant'))] },
  'conjure-elemental:initial-damage': { failed: [required(dice(8, 8, null))] },
  'conjure-elemental:repeat-damage': { failed: [required(dice(4, 8, null))] },
  'conjure-woodland-beings:damage': { failed: [required(dice(5, 8, 'Force'))] },
  'contagion:damage': { failed: [required(dice(11, 8, 'Necrotic'))] },
  'contact-other-plane:damage': { failed: [required(dice(6, 6, 'Psychic'))] },
  'control-water:damage': { failed: [required(dice(2, 8, 'Bludgeoning'))] },
  'delayed-blast-fireball:damage': { failed: [required(dice(12, 6, 'Fire'))] },
  'disintegrate:damage': {
    failed: [required(dice(10, 6, 'Force')), required(flat(40, 'Force'))],
    failed_roll_slot_groups: [[0, 1]],
  },
  'dissonant-whispers:damage': { failed: [required(dice(3, 6, 'Psychic'))] },
  'dragon-s-breath:damage': { failed: [required(dice(3, 6, null))] },
  'dream:damage': { failed: [required(dice(3, 6, 'Psychic'))] },
  'earthquake:collapse-damage': { failed: [required(dice(12, 6, 'Bludgeoning'))] },
  'faithful-hound:damage': { failed: [required(dice(4, 8, 'Force'))] },
  'finger-of-death:damage': {
    failed: [required(dice(7, 8, 'Necrotic')), required(flat(30, 'Necrotic'))],
    failed_roll_slot_groups: [[0, 1]],
  },
  'fireball:damage': { failed: [required(dice(8, 6, 'Fire'))] },
  'fire-storm:damage': { failed: [required(dice(7, 10, 'Fire'))] },
  'flame-strike:damage': {
    failed: [required(dice(5, 6, 'Fire')), required(dice(5, 6, 'Radiant'))],
    failed_roll_slot_groups: [[0], [1]],
  },
  'flaming-sphere:damage': { failed: [required(dice(2, 6, 'Fire'))] },
  'freezing-sphere:damage': { failed: [required(dice(10, 6, 'Cold'))] },
  'glyph-of-warding:explosive-runes': { failed: [required(
    dice(5, 8, 'Acid'),
    dice(5, 8, 'Cold'),
    dice(5, 8, 'Fire'),
    dice(5, 8, 'Lightning'),
    dice(5, 8, 'Thunder'),
  )] },
  'guardian-of-faith:damage': { failed: [required(flat(20, 'Radiant'))] },
  'harm:damage': { failed: [required(dice(14, 6, 'Necrotic'))] },
  'hellish-rebuke:damage': { failed: [required(dice(2, 10, 'Fire'))] },
  'ice-knife:explosion-damage': { failed: [required(dice(2, 6, 'Cold'))] },
  'ice-storm:damage': {
    failed: [required(dice(2, 10, 'Bludgeoning')), required(dice(4, 6, 'Cold'))],
    failed_roll_slot_groups: [[0], [1]],
  },
  'incendiary-cloud:damage': { failed: [required(dice(10, 8, 'Fire'))] },
  'inflict-wounds:damage': { failed: [required(dice(2, 10, 'Necrotic'))] },
  'insect-plague:damage': { failed: [required(dice(4, 10, 'Piercing'))] },
  'lightning-bolt:damage': { failed: [required(dice(8, 6, 'Lightning'))] },
  'meteor-swarm:damage': {
    failed: [required(dice(20, 6, 'Fire')), required(dice(20, 6, 'Bludgeoning'))],
    failed_roll_slot_groups: [[0], [1]],
  },
  'mind-spike:damage': { failed: [required(dice(3, 8, 'Psychic'))] },
  'moonbeam:damage': { failed: [required(dice(2, 10, 'Radiant'))] },
  'phantasmal-killer:initial-damage': { failed: [required(dice(4, 10, 'Psychic'))] },
  'phantasmal-killer:repeat-damage': { failed: [required(dice(4, 10, 'Psychic'))] },
  'prismatic-spray:damaging-rays': { failed: [required(
    dice(12, 6, 'Fire'),
    dice(12, 6, 'Acid'),
    dice(12, 6, 'Lightning'),
    dice(12, 6, 'Poison'),
    dice(12, 6, 'Cold'),
  )] },
  'prismatic-wall:damaging-layers': { failed: [required(
    dice(12, 6, 'Fire'),
    dice(12, 6, 'Acid'),
    dice(12, 6, 'Lightning'),
    dice(12, 6, 'Poison'),
    dice(12, 6, 'Cold'),
  )] },
  'sacred-flame:damage': { failed: [required(dice(1, 8, 'Radiant'))] },
  'shatter:damage': { failed: [required(dice(3, 8, 'Thunder'))] },
  'spirit-guardians:damage': { failed: [required(dice(3, 8, 'Radiant'), dice(3, 8, 'Necrotic'))] },
  'storm-of-vengeance:initial-thunder-damage': { failed: [required(dice(2, 6, 'Thunder'))] },
  'storm-of-vengeance:lightning-damage': { failed: [required(dice(10, 6, 'Lightning'))] },
  'summon-dragon:breath-weapon': { failed: [required(dice(2, 6, null))] },
  'sunbeam:damage': { failed: [required(dice(6, 8, 'Radiant'))] },
  'sunburst:damage': { failed: [required(dice(12, 6, 'Radiant'))] },
  'symbol:death-damage': { failed: [required(dice(10, 10, 'Necrotic'))] },
  'thunderwave:damage': { failed: [required(dice(2, 8, 'Thunder'))] },
  'tsunami:initial-damage': { failed: [required(dice(6, 10, 'Bludgeoning'))] },
  'tsunami:ongoing-damage': { failed: [required(dice(5, 10, 'Bludgeoning'))] },
  'vicious-mockery:damage': { failed: [required(dice(1, 6, 'Psychic'))] },
  'vitriolic-sphere:damage': {
    failed: [required(dice(10, 4, 'Acid')), required(dice(5, 4, 'Acid'))],
    failed_roll_slot_groups: [[0], [1]],
    success: [required(dice(10, 4, 'Acid'))],
    success_roll_transform: 'floor_half',
  },
  'wall-of-fire:damage': { failed: [required(dice(5, 8, 'Fire'))] },
  'wall-of-ice:initial-damage': { failed: [required(dice(10, 6, 'Cold'))] },
  'wall-of-ice:frigid-air-damage': { failed: [required(dice(5, 6, 'Cold'))] },
  'wall-of-thorns:piercing-damage': { failed: [required(dice(7, 8, 'Piercing'))] },
  'wall-of-thorns:slashing-damage': { failed: [required(dice(7, 8, 'Slashing'))] },
  'weird:initial-damage': { failed: [required(dice(10, 10, 'Psychic'))] },
  'weird:repeat-damage': { failed: [required(dice(5, 10, 'Psychic'))] },
  'wind-wall:damage': { failed: [required(dice(4, 8, 'Bludgeoning'))] },
} as const satisfies Record<string, ReviewedDamageRequirements>;

type SaveClauseDiscriminator =
  | { readonly kind: 'ability'; readonly ability: Ability }
  | {
      readonly kind: 'damage_signature';
      readonly dice_count: number;
      readonly die_size: number;
      readonly damage_type: DamageType | null;
    }
  | { readonly kind: 'source_text'; readonly includes: string };

const bundledSpellBodies = spellDescriptionsFromFullLayout(bundledSrd521);
const extractedSpellBodies = spellDescriptionsByHeading(bundledSpellDescriptions);
if (
  bundledSpellBodies.size !== extractedSpellBodies.size ||
  [...bundledSpellBodies].some(([heading, body]) =>
    extractedSpellBodies.get(heading) !== body,
  )
) {
  throw new TypeError(
    'Column-safe full SRD spell reading does not match the committed readable spell extract.',
  );
}
const sourceCoverage = deriveSaveDamageCoverageFromBodies(bundledSpellBodies);
const sourceDerivedSaveClauses = sourceCoverage.clauses_by_heading;

export const sourceDerivedSaveDamageCandidateCounts = sourceCoverage.counts;
export const sourceDerivedSaveDamageCandidates = Object.freeze(
  sourceCoverage.candidates,
) satisfies readonly SourceDerivedSaveDamageCandidate[];

/**
 * An independent bounded lexical audit, not a proof over unrestricted English.
 * Every current reviewed clause must overlap a suspect, and every extra suspect
 * must be owned by a clause or an exact-span exclusion below.
 */
export const highRecallDamageSaveSuspects = Object.freeze(
  sourceCoverage.broad_suspects,
);

const reviewedHighRecallDamageSaveExclusions = [
  {
    heading: 'Heat Metal',
    source_span: 'Until the spell ends, you can take a Bonus Action on each of your later turns to deal this damage again if the object is within range. If a creature is holding or wearing the object and takes the damage from it, the creature must succeed on a Constitution saving throw or drop the object if it can. If it doesn’t drop the object, it has Disadvantage on attack rolls and ability checks until the start of your next turn. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 2.',
    rationale: 'The save controls dropping the object; it does not change Heat Metal damage.',
  },
  {
    heading: 'Sleep',
    source_span: 'Level 1 Enchantment (Bard, Sorcerer, Wizard) Casting Time: Action Range: 60 feet Components: V, S, M (a pinch of sand or rose petals) Duration: Concentration, up to 1 minute Each creature of your choice in a 5-foot-radius Sphere centered on a point within range must succeed on a Wisdom saving throw or have the Incapacitated condition until the end of its next turn, at which point it must repeat the save. If the target fails the second save, the target has the Unconscious condition for the duration. The spell ends on a target if it takes damage or someone within 5 feet of it takes an action to shake it out of the spell’s effect. Creatures that don’t sleep, such as elves, or that have Immunity to the Exhaustion condition automatically succeed on saves against this spell.',
    rationale: 'Damage ends Sleep; neither save changes numeric damage.',
  },
  {
    heading: 'Wall of Stone',
    source_span: 'If the wall cuts through a creature’s space when it appears, the creature is pushed to one side of the wall (you choose which side). If a creature would be surrounded on all sides by the wall (or the wall and another solid surface), that creature can make a Dexterity saving throw. On a success, it can use its Reaction to move up to its Speed so that it is no longer enclosed by the wall. The wall can have any shape you desire, though it can’t occupy the same space as a creature or object. The wall doesn’t need to be vertical or rest on a firm foundation. It must, however, merge with and be solidly supported by existing stone. Thus, you can use this spell to bridge a chasm or create a ramp. If you create a span greater than 20 feet in length, you must halve the size of each panel to create supports. You can crudely shape the wall to create battlements and the like. The wall is an object made of stone that can be damaged and thus breached. Each panel has AC 15 and 30 Hit Points per inch of thickness, and it has Immunity to Poison and Psychic damage. Reducing a panel to 0 Hit Points destroys it and might cause connected panels to collapse at the GM’s discretion. If you maintain your Concentration on this spell for its full duration, the wall becomes permanent and can’t be dispelled. Otherwise, the wall disappears when the spell ends.',
    rationale: 'The save controls enclosure; later text describes damage to the wall object.',
  },
  {
    heading: 'Warding Bond',
    source_span: 'Level 2 Abjuration (Cleric, Paladin) Casting Time: Action Range: Touch Components: V, S, M (a pair of platinum rings worth 50+ GP each, which you and the target must wear for the duration) Duration: 1 hour You touch another creature that is willing and create a mystic connection between you and the target until the spell ends. While the target is within 60 feet of you, it gains a +1 bonus to AC and saving throws, and it has Resistance to all damage. Also, each time it takes damage, you take the same amount of damage. The spell ends if you drop to 0 Hit Points or if you and the target become separated by more than 60 feet. It also ends if the spell is cast again on either of the connected creatures.',
    rationale: 'The saving-throw bonus and damage transfer are separate effects; there is no save outcome.',
  },
  {
    heading: 'Web',
    source_span: 'Webs layered over a flat surface have a depth of 5 feet. The first time a creature enters the webs on a turn or starts its turn there, it must succeed on a Dexterity saving throw or have the Restrained condition while in the webs or until it breaks free. A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC. If it succeeds, it is no longer Restrained. The webs are flammable. Any 5-foot Cube of webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage to any creature that starts its turn in the fire.',
    rationale: 'The save controls restraint; fire damage is caused by igniting the webs.',
  },
  {
    heading: 'Wish',
    source_span: 'Reality reshapes itself to accommodate the new result. For example, a Wish spell could undo an ally’s failed saving throw or a foe’s Critical Hit. You can force the reroll to be made with Advantage or Disadvantage, and you choose whether to use the reroll or the original roll. Reshape Reality. You may wish for something not included in any of the other effects. To do so, state your wish to the GM as precisely as possible. The GM has great latitude in ruling what occurs in such an instance; the greater the wish, the greater the likelihood that something goes wrong. This spell might simply fail, the effect you desire might be achieved only in part, or you might suffer an unforeseen consequence as a result of how you worded the wish. For example, wishing that a villain were dead might propel you forward in time to a period when that villain is no longer alive, effectively removing you from the game. Similarly, wishing for a Legendary magic item or an Artifact might instantly transport you to the presence of the item’s current owner. If your wish is granted and its effects have consequences for a whole community, region, or world, you are likely to attract powerful foes. If your wish would affect a god, the god’s divine servants might instantly intervene to prevent it or to encourage you to craft the wish in a particular way. If your wish would undo the multiverse itself, your wish fails. The stress of casting Wish to produce any effect other than duplicating another spell weakens you. After enduring that stress, each time you cast a spell until you finish a Long Rest, you take 1d10 Necrotic damage per level of that spell. This damage can’t be reduced or prevented in any way. In addition, your Strength score becomes 3 for 2d4 days.',
    rationale: 'Wish mentions rerolling an existing save; its later stress damage has no save.',
  },
] as const;

export const unreconciledHighRecallDamageSaveSuspects = Object.freeze(
  highRecallDamageSaveSuspects.filter((suspect) =>
    !sourceDerivedSaveDamageCandidates.some((candidate) =>
      candidate.heading === suspect.heading &&
      candidate.start < suspect.end &&
      suspect.start < candidate.end,
    ) &&
    !reviewedHighRecallDamageSaveExclusions.some((exclusion) =>
      exclusion.heading === suspect.heading &&
      exclusion.source_span === suspect.span,
    ),
  ),
);

const consumedSourceClauses = new Set<SourceDerivedSaveClause>();
const sourceClauseByReviewedId = new Map<SaveSuccessClauseId, SourceDerivedSaveClause>();

const multiClauseSemanticAnchorById = {
  'srd-5.2.1:spell:conjure-elemental:save:initial-damage': '8d8 damage',
  'srd-5.2.1:spell:conjure-elemental:save:repeat-damage': '4d8 damage',
  'srd-5.2.1:spell:phantasmal-killer:save:initial-damage': 'Disadvantage on ability checks',
  'srd-5.2.1:spell:phantasmal-killer:save:repeat-damage': 'damage again',
  'srd-5.2.1:spell:storm-of-vengeance:save:initial-thunder-damage': '2d6 Thunder damage',
  'srd-5.2.1:spell:storm-of-vengeance:save:lightning-damage': '10d6 Lightning damage',
  'srd-5.2.1:spell:tsunami:save:initial-damage': '6d10 Bludgeoning damage',
  'srd-5.2.1:spell:tsunami:save:ongoing-damage': '5d10 Bludgeoning damage',
  'srd-5.2.1:spell:wall-of-ice:save:initial-damage': '10d6 Cold damage',
  'srd-5.2.1:spell:wall-of-ice:save:frigid-air-damage': '5d6 Cold damage',
  'srd-5.2.1:spell:wall-of-thorns:save:piercing-damage': '7d8 Piercing damage',
  'srd-5.2.1:spell:wall-of-thorns:save:slashing-damage': '7d8 Slashing damage',
  'srd-5.2.1:spell:weird:save:initial-damage': '10d10 Psychic damage',
  'srd-5.2.1:spell:weird:save:repeat-damage': '5d10 Psychic damage',
} as const satisfies Record<string, string>;

function sourceClauseMatchesDiscriminator(
  clause: SourceDerivedSaveClause,
  discriminator: SaveClauseDiscriminator,
): boolean {
  switch (discriminator.kind) {
    case 'ability':
      return clause.ability === discriminator.ability;
    case 'damage_signature':
      return clause.failed_damage_signatures.some((signature) =>
        signature.dice_count === discriminator.dice_count &&
        signature.die_size === discriminator.die_size &&
        signature.damage_type === discriminator.damage_type,
      );
    case 'source_text':
      return clause.span.includes(discriminator.includes);
  }
}

function sameDamageSignature(
  left: FailedDamageSignature,
  right: FailedDamageSignature,
): boolean {
  return left.damage_type === right.damage_type &&
    left.dice_count === right.dice_count &&
    left.die_size === right.die_size &&
    left.flat_modifier === right.flat_modifier;
}

function sourceDamageSlots(
  clause: SourceDerivedSaveClause,
  arm: 'failure' | 'success',
): readonly DamageSignatureSlot[] {
  const bySlot = new Map<number, FailedDamageSignature[]>();
  for (const occurrence of clause.damage_occurrences) {
    if (occurrence.arm !== arm) {
      continue;
    }
    const signature: FailedDamageSignature = {
      damage_type: occurrence.damage_type,
      dice_count: occurrence.dice_count,
      die_size: occurrence.die_size,
      flat_modifier: occurrence.flat_modifier,
    };
    const slot = bySlot.get(occurrence.slot_index) ?? [];
    if (!slot.some((candidate) => sameDamageSignature(candidate, signature))) {
      slot.push(signature);
    }
    bySlot.set(occurrence.slot_index, slot);
  }
  return [...bySlot.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, signatures]) => {
      const [first, ...rest] = signatures;
      if (first === undefined) {
        throw new TypeError('Source damage occurrence slot is empty.');
      }
      return [first, ...rest];
    });
}

function sourceDamageRollSlotGroups(
  clause: SourceDerivedSaveClause,
  arm: 'failure' | 'success',
): readonly DamageRollSlotGroup[] {
  const slotsByRoll = new Map<number, Set<number>>();
  for (const occurrence of clause.damage_occurrences) {
    if (occurrence.arm !== arm) {
      continue;
    }
    const slots = slotsByRoll.get(occurrence.roll_index) ?? new Set<number>();
    slots.add(occurrence.slot_index);
    slotsByRoll.set(occurrence.roll_index, slots);
  }
  return [...slotsByRoll.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, slots]) => {
      const [first, ...rest] = [...slots].sort((left, right) => left - right);
      if (first === undefined) {
        throw new TypeError('Source damage roll has no signature slots.');
      }
      return [first, ...rest];
    });
}

function sameDamageRollSlotGroups(
  left: readonly DamageRollSlotGroup[],
  right: readonly DamageRollSlotGroup[],
): boolean {
  return left.length === right.length && left.every((group, groupIndex) => {
    const other = right[groupIndex];
    return other !== undefined && group.length === other.length &&
      group.every((slotIndex, slotPosition) => slotIndex === other[slotPosition]);
  });
}

function damageSlotsAreBijective(
  declared: readonly DamageSignatureSlot[],
  sourced: readonly DamageSignatureSlot[],
): boolean {
  if (declared.length !== sourced.length) {
    return false;
  }
  const assign = (index: number, used: ReadonlySet<number>): boolean => {
    if (index === declared.length) {
      return used.size === sourced.length;
    }
    const slot = declared[index] as DamageSignatureSlot;
    for (const [sourceIndex, sourceSlot] of sourced.entries()) {
      if (
        !used.has(sourceIndex) &&
        damageSignaturesAreBijective(slot, sourceSlot)
      ) {
        const next = new Set(used);
        next.add(sourceIndex);
        if (assign(index + 1, next)) {
          return true;
        }
      }
    }
    return false;
  };
  return assign(0, new Set<number>());
}

function damageSignaturesAreBijective(
  declared: readonly FailedDamageSignature[],
  sourced: readonly FailedDamageSignature[],
): boolean {
  if (declared.length !== sourced.length) {
    return false;
  }
  const assign = (index: number, used: ReadonlySet<number>): boolean => {
    if (index === declared.length) {
      return used.size === sourced.length;
    }
    const signature = declared[index] as FailedDamageSignature;
    for (const [sourceIndex, candidate] of sourced.entries()) {
      if (!used.has(sourceIndex) && sameDamageSignature(signature, candidate)) {
        const next = new Set(used);
        next.add(sourceIndex);
        if (assign(index + 1, next)) {
          return true;
        }
      }
    }
    return false;
  };
  return assign(0, new Set<number>());
}

/**
 * Mechanical round-15 baseline over the whitespace-normalized source spans
 * already reviewed in rounds 1-15. These constants are deliberately
 * independent of the live extract after this one sanctioned initialization.
 */
export const reviewedSourceSpanSha256Oracle = Object.freeze({
  acid_splash: '46cf4eece444326543ac1d22069584e3ab26b8d6cd3bf62db56165258badafb4',
  arcane_hand_grasping: '5feeb17aa426dfbad1c4d772d1f2beb063c1c63eb973ff67f8eb3cd35af39599',
  befuddlement: 'ace7ba17d391406c4272eb1563231f8ff0db02c94f107867fd1377ff1d27aef2',
  bestow_curse_damage: '1081d2f870eb3accac34d6f4041722eb10990b0bed48bf672aa0b35002d335a2',
  black_tentacles: '6f9c81bb1ea97dc768da6fcd0f20dd1ca7ed617d7c893dd6ecd4db4eca90d652',
  blade_barrier: '5fd4ad639fc06bdab72a454de55b4efcc20a52b7359e0d24feeb6405947e89d3',
  blight: 'd080c5b7a0f9dc3997ee3632b0770c409464cdfbff84efd35e1895d943e73fe8',
  burning_hands: '16f345a51c0314e599586665cbd8ac8478a3c590032c30582728879769ca6dd1',
  call_lightning: 'f8cdc7ce52090d8ffbe804596986b25cb7244cfd76bfbbff93f8110d6a5fbeff',
  chain_lightning: 'b7a2cf55e04f885d7b58961239fe9512a00d4c34ec28e90313b6936f666184e7',
  circle_of_death: 'de5e7e6f2a74d9744356c906784ce2d70e8c0ff7c185225b4e82cae9a2167150',
  cloudkill: '3cec64a1b718c2fbc96f7a5e39fcd3239c4cab5dc0addf976ec56a19fb12c63c',
  cone_of_cold: 'e96a9da1f6a1fcc2f303b1b89ee39602a4de4ed8f61a3467756b7e6a4e0b9838',
  conjure_animals: '82f07964999fc5e96a07bd2a63958074db6093dd7a05fd593da4235e5bfac5b7',
  conjure_celestial: '7f5da6b8f5ba26977832a08e291c36932c8900ad466634dc3cba7039ebf23995',
  conjure_elemental_initial: '5d2d51d9845f8692e89a4f6406349617a64a41959de65fd209f2232c50db5be0',
  conjure_elemental_repeat: '3658e8ff3548b0b87bdf196f7332f8182605c2283aab296e053721dfdd31cd92',
  conjure_woodland_beings: '54f33251f82c0034e330f4b72e84cb2822b56d4d061d7894c0eff5ea494c8765',
  contagion: 'a6267a578f33540fa45f8be2a03ec097e579ae1eeeb3660f4c1d5cd98f51481a',
  contact_other_plane: 'b312be8556ea04150fe3703e5cda40b639543b2ef71a74f9259f1c1104a3dac2',
  control_water: '228b0e3e603518dd527f3a8082b433c5c724fe18a798bac39e49e55e229407df',
  delayed_blast_fireball: '144a42a13d3ad8f62d0f649cef26b7b9bb184a9ee7572612aaf0e40cd70d8778',
  disintegrate: 'd3cc21c21ad82dbfb563868a72eee349892eae4949e35b98d2ca38c5b9b61f9b',
  dissonant_whispers: '8fb58b13335e529a4ea49aba6298454ddbafeeb123dba06752a5f316e6eab0d9',
  dragons_breath: 'acc4c31ac54dd53a367b2e395223cf1ab09d89cee293e74da46bd30a7b3adaca',
  dream: '1e74c2fa4d675d179fa012983719da77c7a772ce9afa99b7371d4adeb4ce33ff',
  earthquake: 'c7a2d1dfc59ed8d2449df77301a804ac6b88b41851bb7d243c41fea1dd0582d1',
  enlarge_reduce_damage: '6b2dbce1dca6ba9a25b2af70d80647b126051866a93330536f9a5bd65a4caf46',
  ensnaring_strike: 'a66cade09bb8654882d818156b430533b9be678f40d400a3c232905455220a1b',
  faithful_hound: 'bec18664bbdc45a6c6b785cb856dfd1d952f6752e021cf3bc0037ac125682df5',
  finger_of_death: '529f55e0efaa6aec2976cc8d775efc1acfacd3dba852fd22d5f4f3b6a1c397e0',
  fireball: 'e585d2ffe600edae72b14569bcfa577d53d20054804ee6135e25d9e3a9d7db47',
  fire_storm: 'e6d2d3b518d4aaecd93f746eb18a1dc2ef29e94a80ab012a6c0aeaea6cda6a3f',
  flame_strike: 'e40cfabc32455fd2309ad90c720c2e2443824d22581bc9c1352faac2adf49791',
  flaming_sphere: '735760c5ad96904de02b1b93f629142833da2760207cfd73f0718bf586eedfe4',
  freezing_sphere: '96d4691bac78fcacf439ee6432d4552c3c325e37fc537f443f117acc5a4d96f4',
  geas: 'bce14e215c513295a50a5396308cb5444a29a61fd82e67ae70860a9686a5f9f1',
  glyph_of_warding: 'ecde8fd62d8e5f9d056adaa23bb131d21544445055669d6a2fa6ad0d4a403653',
  guardian_of_faith: '3fe26d4d9e3345387b451bbc524ed80994455f2264fd637f704c9260812592f7',
  harm: 'd64335221fb2f6a27c6a680685ddbc0619e5f2c59719491ab32a58c25d157be2',
  hellish_rebuke: 'd9c34a93ba68659bd17110e1c2a4c57c905932ebe8966f51b6c9e4323a86d1c7',
  ice_knife: '57589fbade54e6cd2c8e590fd018a627f6090b18a5e2343a11b51788645f1791',
  ice_storm: '74525dd94d11880cfabc491c96260171a4769876deebde05b3896c8b4c9f3e70',
  incendiary_cloud: 'dcadad37fc992ed8a774e2d23ea64a77f5641cf1b62af0675188ca8fd8800595',
  inflict_wounds: '3192e3e42cedf581fa9a82c12098ecfef24825227faf44aced6c67828674e93b',
  insect_plague: '0cd15f85b21a2d71b235b491c857221347793247e26b1939b29f4e00a5351f3d',
  lightning_bolt: '1012f58c3ab535f7b5c704bad66ac58dc383c4e1d5dfc86dc37404fa3ff7f76b',
  meteor_swarm: '95a51d4e33c4b65fd03805a14eb1e327f587cbf8449db35d183014f0168a7924',
  mind_spike: 'cfac20a4a38452146a19eebad5874a9560461f70227c68fc61f6f9e04817211d',
  moonbeam: '5c45207bf2073ec35d90fc2e2816d2ba068811bdde06f1a3dd6e303609a82675',
  phantasmal_force: 'c4c1be827d0edc89c31051dfe27e6a83a3a120c74d5e5e4f3d4dc727b4653c93',
  phantasmal_killer_initial: 'c019e85d79f4e499aa7228de5f9dfd33c38b2eb9cadeed97df0659bfca2c670d',
  phantasmal_killer_repeat: '0c7dbd7715ca1069714cc078fa4ea2eef3600b42d627c112ff626c5493c2b81c',
  prismatic_spray: '083fcad27d2a17edeafefd175c2e415aab807825754c628babda90079a803318',
  prismatic_wall: '516b2aa0d6fd39bcd79479dcd9efb7900a28544c4016c1581007813c6eee8db2',
  ray_of_enfeeblement: 'a5da52cd69537ee5698d0878489dbe3307f0d504fc20c5188f0148852e749623',
  sacred_flame: '8a8d8a9c655fe7abf07bba38db26527b7e42277d06d8be20d5bce25aad72b86c',
  searing_smite: 'f2d4fe0d60df42aa1b7dddc262f69b528ee91d0c0e76f137df22d7811d0aa151',
  shatter: 'ec149c852ccea7de6ee2239df496d7e057f07465bcc224daa6feb02d9d1e108d',
  spirit_guardians: 'cdf50c7cceb50ebac9994df46db7e9bcf92594d242552f34cfea137c84a8c5b6',
  storm_of_vengeance_initial: '693aa2c7ecc2b3878622d36020cfeb05906a96cd0f0fb9b289d4cae6b9a350da',
  storm_of_vengeance_lightning: '778ff288fc85ccb5f214a80465965fbdd2963a460d710ade7f0743ef4485293b',
  summon_dragon: '2dc7a05093c420637275b259a5ec8bc85c04cf1ad57fa2ba36adafe69fc72853',
  sunbeam: 'e3873695f0d365d44d6a7f33435cc15d040254632659e53e8157dda9a0f1075d',
  sunburst: 'c3dd95de1a351ef2132544ff2615ab6a59367eee8eed974449e82b7a22e1e06c',
  symbol: '2c797ae620ddf294be8bbc202b993329830fa28bb1f5a1e578e78bdbcb71592d',
  thunderwave: '34cbd4e729f425f8e58e6ff5698e35743276f30457dd611f24bb8b52dd8adaa2',
  tsunami_initial: '941b883aab876b35479fbeb3be3866e0d5d9895e5094c51f1441c5b15c12dd90',
  tsunami_ongoing: '180bae1926d492fd68f85a57fb6c3c5dccff3a59ba04cb8fd9ad3724aa1d4207',
  vicious_mockery: '2f2e5fda2cffbde616b81d8445db33fa901a853cb08b40a73a097910a9ada580',
  vitriolic_sphere: '127cafbe09ff62df4722c160516b1062f737f273edff97ce338bd408d358c76c',
  wall_of_fire: '7414877b0f9d1a65242581bf774a8cac30c2de766f8addaeae24cad409c600e6',
  wall_of_ice_initial: '929952ddf3f3681f6c4a2588c03cffe8323eb6cc356c382c4768b5bdbcdfcd0f',
  wall_of_ice_frigid_air: '9f35854e7db698e934384fe0c547c5b5dbf61831d653f47c65b756edca2adf28',
  wall_of_thorns_piercing: 'df5dd1f1604baf71713939a0968484ee41331735c338927f0f37567fc3f6631d',
  wall_of_thorns_slashing: 'b37f22194990e98bb48b004a3b0798067762697c23fc4a6936476f44b67c8627',
  weird_initial: '6e3d1501ad12813e00d8a374ae6df254aba0042a17a2f776dffec3e9eec46066',
  weird_repeat: '427dc581ece8d47667a94cc34dbd8d7fa1a61d5155105478a547ce2cef6b90b4',
  wind_wall: '7ef090b50f30de43069807d16662e8f64be01aab4a56c90d62ded1e7a9ca82ba',
} as const satisfies Record<string, string>);

export function normalizeReviewedSourceSpan(span: string): string {
  return span.trim().replace(/\s+/gu, ' ');
}

export function assertReviewedSourceSpanDigest(
  key: keyof typeof reviewedSourceSpanSha256Oracle,
  clauseId: SaveSuccessClauseId,
  sourceSpan: string,
): void {
  const expected = reviewedSourceSpanSha256Oracle[key];
  const actual = sha256(normalizeReviewedSourceSpan(sourceSpan));
  if (actual !== expected) {
    throw new TypeError(
      `${clauseId} source span digest mismatch: expected ${expected}, read ${actual}. Re-decode the clause and update its reviewed values and digest together; do not combine a digest update with parser changes for this clause.`,
    );
  }
}

function reviewedSaveClause(
  oracleKey: keyof typeof reviewedSourceSpanSha256Oracle,
  key: string,
  spellSlug: string,
  heading: ReviewedBundledSrdHeading,
  discriminator?: SaveClauseDiscriminator,
): ReviewedSaveSuccessClause {
  const id = saveSuccessClauseId(`srd-5.2.1:spell:${spellSlug}:save:${key}`);
  const candidates = sourceDerivedSaveClauses.get(heading) ?? [];
  const matches = discriminator === undefined
    ? candidates
    : candidates.filter((candidate) =>
        sourceClauseMatchesDiscriminator(candidate, discriminator),
      );
  const sourceClause = matches.length === 1 ? matches[0] : undefined;
  if (sourceClause === undefined) {
    throw new TypeError(
      `${id} does not uniquely select one source-derived damage save clause for ${heading}.`,
    );
  }
  assertReviewedSourceSpanDigest(oracleKey, id, sourceClause.span);
  if (candidates.length > 1 && discriminator === undefined) {
    throw new TypeError(
      `${id} has multiple source candidates and requires a clause discriminator.`,
    );
  }
  if (discriminator !== undefined) {
    if (matches.length !== 1) {
      throw new TypeError(
        `${id} is mis-bound: its source candidate does not uniquely match the declared ${discriminator.kind} discriminator.`,
      );
    }
  }
  if (consumedSourceClauses.has(sourceClause)) {
    throw new TypeError(`${id} reuses a source clause already bound to another ID.`);
  }
  sourceClauseByReviewedId.set(id, sourceClause);
  if (candidates.length > 1) {
    const semanticAnchor = multiClauseSemanticAnchorById[
      id as keyof typeof multiClauseSemanticAnchorById
    ];
    if (semanticAnchor === undefined || !sourceClause.span.includes(semanticAnchor)) {
      throw new TypeError(`${id} is not bound to its reviewed semantic source anchor.`);
    }
  }
  const stableKey = sourceStableKey(`srd-5.2.1:spell:${spellSlug}`);
  const evidence = bundledHeading(heading);
  const fixedSaveDc = sourceClause.fixed_save_dc.status === 'available'
    ? sourceClause.fixed_save_dc.value
    : null;
  const requirements: ReviewedDamageRequirements | undefined = reviewedDamageRequirementsByClause[
    `${spellSlug}:${key}` as keyof typeof reviewedDamageRequirementsByClause
  ];
  const failedDamageRollSlotGroups: readonly DamageRollSlotGroup[] = requirements === undefined
    ? []
    : failedRollSlotGroups(requirements);
  const groupedSlotIndexes = failedDamageRollSlotGroups.flat();
  if (
    requirements !== undefined &&
    (
      groupedSlotIndexes.length !== requirements.failed.length ||
      new Set(groupedSlotIndexes).size !== requirements.failed.length ||
      groupedSlotIndexes.some((index) =>
        index < 0 || index >= requirements.failed.length
      )
    )
  ) {
    throw new TypeError(`${id} damage-roll slot groups do not partition its failed-save slots.`);
  }
  if (
    requirements !== undefined &&
    !sameDamageRollSlotGroups(
      failedDamageRollSlotGroups,
      sourceDamageRollSlotGroups(sourceClause, 'failure'),
    )
  ) {
    throw new TypeError(`${id} damage-roll slot groups disagree with the clause-local source rolls.`);
  }
  const frequency: EventFrequency = sourceClause.frequency.kind === 'once_per_turn'
    ? {
        kind: 'once_per_turn',
        turn: sourceClause.frequency.turn,
        evidence,
      }
    : sourceClause.frequency.kind === 'once_per_round'
      ? { kind: 'once_per_round', evidence }
      : { kind: 'each_declared_event' };
  if (
    sourceClause.success.status === 'unavailable' ||
    sourceClause.fixed_save_dc.status === 'unavailable' ||
    sourceClause.frequency.kind === 'unavailable' ||
    sourceClause.repetitions.status === 'unavailable' ||
    sourceClause.timing_unavailable_reason !== null
  ) {
    const unavailableReason = sourceClause.success.status === 'unavailable'
      ? sourceClause.success.reason
      : sourceClause.fixed_save_dc.status === 'unavailable'
        ? sourceClause.fixed_save_dc.reason
      : sourceClause.frequency.kind === 'unavailable'
        ? sourceClause.frequency.reason
      : sourceClause.repetitions.status === 'unavailable'
        ? sourceClause.repetitions.reason
        : sourceClause.timing_unavailable_reason ?? 'Source evidence is unavailable.';
    const unavailableRequirements: ReviewedDamageRequirements | undefined =
      sourceClause.success.status === 'available' ? requirements : undefined;
    if (sourceClause.success.status === 'available' && unavailableRequirements === undefined) {
      throw new TypeError(`${id} has no independently reviewed damage requirements.`);
    }
    if (
      unavailableRequirements !== undefined &&
      !damageSlotsAreBijective(
        unavailableRequirements.failed,
        sourceDamageSlots(sourceClause, 'failure'),
      )
    ) {
      throw new TypeError(`${id} unavailable failed-save damage slots disagree with the source.`);
    }
    if (
      unavailableRequirements !== undefined &&
      !damageSlotsAreBijective(
        unavailableRequirements.success ?? [],
        sourceDamageSlots(sourceClause, 'success'),
      )
    ) {
      throw new TypeError(`${id} unavailable successful-save damage slots disagree with the source.`);
    }
    const unavailableSourceTransform = sourceClause.damage_occurrences.some((occurrence) =>
      occurrence.arm === 'success' && occurrence.roll_transform === 'floor_half'
    ) ? 'floor_half' : 'none';
    const unavailableSuccessTransform = unavailableRequirements?.success_roll_transform ?? 'none';
    if (
      unavailableRequirements !== undefined &&
      unavailableSuccessTransform !== unavailableSourceTransform
    ) {
      throw new TypeError(`${id} unavailable successful-save roll transform disagrees with the source.`);
    }
    consumedSourceClauses.add(sourceClause);
    return {
      id,
      effect_source: {
        kind: 'catalog_content',
        content_key: String(stableKey) as ContentKey,
        stable_key: stableKey,
      },
      effect_stable_key: stableKey,
      kind: sourceClause.success.status === 'available'
        ? sourceClause.success.kind
        : 'unavailable',
      unavailable_reason: unavailableReason,
      evidence,
      source_span: sourceClause.span,
      source_span_sha256: reviewedSourceSpanSha256Oracle[oracleKey],
      ability: sourceClause.ability,
      fixed_save_dc: fixedSaveDc,
      frequency,
      failed_damage_signature_slots: unavailableRequirements?.failed ?? [],
      failed_damage_roll_slot_groups: unavailableRequirements === undefined
        ? []
        : failedDamageRollSlotGroups,
      success_damage_signature_slots: unavailableRequirements?.success ?? [],
      failed_damage_slot_repetitions: { minimum: 1, maximum: 1 },
      success_roll_transform: unavailableSuccessTransform,
      duration: sourceClause.duration,
    };
  }
  if (requirements === undefined) {
    throw new TypeError(`${id} has no independently reviewed damage requirements.`);
  }
  const sourcedFailedSlots = sourceDamageSlots(sourceClause, 'failure');
  const sourcedSuccessSlots = sourceDamageSlots(sourceClause, 'success');
  if (!damageSlotsAreBijective(requirements.failed, sourcedFailedSlots)) {
    throw new TypeError(
      `${id} failed-save damage slots do not bijectively match clause-local source occurrences: declared ${JSON.stringify(requirements.failed)}, source ${JSON.stringify(sourcedFailedSlots)}.`,
    );
  }
  if (!damageSlotsAreBijective(requirements.success ?? [], sourcedSuccessSlots)) {
    throw new TypeError(
      `${id} successful-save damage slots do not bijectively match clause-local source occurrences: declared ${JSON.stringify(requirements.success ?? [])}, source ${JSON.stringify(sourcedSuccessSlots)}.`,
    );
  }
  const failedRepetitions: DamageSlotRepetitions = {
    minimum: sourceClause.repetitions.minimum,
    maximum: sourceClause.repetitions.maximum,
  };
  const sourceSuccessTransform = sourceClause.damage_occurrences.some((occurrence) =>
    occurrence.arm === 'success' && occurrence.roll_transform === 'floor_half'
  ) ? 'floor_half' : 'none';
  const successRollTransform = requirements.success_roll_transform ?? 'none';
  if (successRollTransform !== sourceSuccessTransform) {
    throw new TypeError(`${id} successful-save roll transform does not match the source clause.`);
  }
  consumedSourceClauses.add(sourceClause);
  return {
    id,
    effect_source: {
      kind: 'catalog_content',
      content_key: String(stableKey) as ContentKey,
      stable_key: stableKey,
    },
    effect_stable_key: stableKey,
    kind: sourceClause.success.kind,
    unavailable_reason: null,
    evidence,
    source_span: sourceClause.span,
    source_span_sha256: reviewedSourceSpanSha256Oracle[oracleKey],
    ability: sourceClause.ability,
    fixed_save_dc: fixedSaveDc,
    frequency,
    failed_damage_signature_slots: requirements.failed,
    failed_damage_roll_slot_groups: failedDamageRollSlotGroups,
    success_damage_signature_slots: requirements.success ?? [],
    failed_damage_slot_repetitions: failedRepetitions,
    success_roll_transform: successRollTransform,
    duration: sourceClause.duration,
  };
}

/**
 * Enumerated from all 339 bundled spell descriptions. The completeness test
 * independently scans the verbatim spell extract for every save whose outcome
 * changes numeric damage, then compares that source-derived set with this one.
 * Enumeration is used because the success clause belongs to the individual
 * spell (and, for multi-save spells, the individual save), not to a safe
 * general rule that can be inferred from the spell's school or level.
 */
export const reviewedSaveSuccessClauses = {
  acid_splash: reviewedSaveClause('acid_splash', 'damage', 'acid-splash', 'Acid Splash'),
  arcane_hand_grasping: reviewedSaveClause('arcane_hand_grasping', 'grasping-hand-damage', 'arcane-hand', 'Arcane Hand'),
  befuddlement: reviewedSaveClause('befuddlement', 'damage', 'befuddlement', 'Befuddlement'),
  bestow_curse_damage: reviewedSaveClause('bestow_curse_damage', 'curse-damage', 'bestow-curse', 'Bestow Curse'),
  black_tentacles: reviewedSaveClause('black_tentacles', 'damage', 'black-tentacles', 'Black Tentacles'),
  blade_barrier: reviewedSaveClause('blade_barrier', 'damage', 'blade-barrier', 'Blade Barrier'),
  blight: reviewedSaveClause('blight', 'damage', 'blight', 'Blight'),
  burning_hands: reviewedSaveClause('burning_hands', 'damage', 'burning-hands', 'Burning Hands'),
  call_lightning: reviewedSaveClause('call_lightning', 'damage', 'call-lightning', 'Call Lightning'),
  chain_lightning: reviewedSaveClause('chain_lightning', 'damage', 'chain-lightning', 'Chain Lightning'),
  circle_of_death: reviewedSaveClause('circle_of_death', 'damage', 'circle-of-death', 'Circle of Death'),
  cloudkill: reviewedSaveClause('cloudkill', 'damage', 'cloudkill', 'Cloudkill'),
  cone_of_cold: reviewedSaveClause('cone_of_cold', 'damage', 'cone-of-cold', 'Cone of Cold'),
  conjure_animals: reviewedSaveClause('conjure_animals', 'damage', 'conjure-animals', 'Conjure Animals'),
  conjure_celestial: reviewedSaveClause('conjure_celestial', 'damage', 'conjure-celestial', 'Conjure Celestial'),
  conjure_elemental_initial: reviewedSaveClause('conjure_elemental_initial', 'initial-damage', 'conjure-elemental', 'Conjure Elemental', { kind: 'damage_signature', dice_count: 8, die_size: 8, damage_type: null }),
  conjure_elemental_repeat: reviewedSaveClause('conjure_elemental_repeat', 'repeat-damage', 'conjure-elemental', 'Conjure Elemental', { kind: 'damage_signature', dice_count: 4, die_size: 8, damage_type: null }),
  conjure_woodland_beings: reviewedSaveClause('conjure_woodland_beings', 'damage', 'conjure-woodland-beings', 'Conjure Woodland Beings'),
  contagion: reviewedSaveClause('contagion', 'damage', 'contagion', 'Contagion'),
  contact_other_plane: reviewedSaveClause('contact_other_plane', 'damage', 'contact-other-plane', 'Contact Other Plane'),
  control_water: reviewedSaveClause('control_water', 'damage', 'control-water', 'Control Water'),
  delayed_blast_fireball: reviewedSaveClause('delayed_blast_fireball', 'damage', 'delayed-blast-fireball', 'Delayed Blast Fireball'),
  disintegrate: reviewedSaveClause('disintegrate', 'damage', 'disintegrate', 'Disintegrate'),
  dissonant_whispers: reviewedSaveClause('dissonant_whispers', 'damage', 'dissonant-whispers', 'Dissonant Whispers'),
  dragons_breath: reviewedSaveClause('dragons_breath', 'damage', 'dragon-s-breath', 'Dragon’s Breath'),
  dream: reviewedSaveClause('dream', 'damage', 'dream', 'Dream'),
  earthquake: reviewedSaveClause('earthquake', 'collapse-damage', 'earthquake', 'Earthquake'),
  enlarge_reduce_damage: reviewedSaveClause('enlarge_reduce_damage', 'weapon-damage', 'enlarge-reduce', 'Enlarge/Reduce'),
  ensnaring_strike: reviewedSaveClause('ensnaring_strike', 'recurring-damage', 'ensnaring-strike', 'Ensnaring Strike'),
  faithful_hound: reviewedSaveClause('faithful_hound', 'damage', 'faithful-hound', 'Faithful Hound'),
  finger_of_death: reviewedSaveClause('finger_of_death', 'damage', 'finger-of-death', 'Finger of Death'),
  fireball: reviewedSaveClause('fireball', 'damage', 'fireball', 'Fireball'),
  fire_storm: reviewedSaveClause('fire_storm', 'damage', 'fire-storm', 'Fire Storm'),
  flame_strike: reviewedSaveClause('flame_strike', 'damage', 'flame-strike', 'Flame Strike'),
  flaming_sphere: reviewedSaveClause('flaming_sphere', 'damage', 'flaming-sphere', 'Flaming Sphere'),
  freezing_sphere: reviewedSaveClause('freezing_sphere', 'damage', 'freezing-sphere', 'Freezing Sphere'),
  geas: reviewedSaveClause('geas', 'recurring-damage', 'geas', 'Geas'),
  glyph_of_warding: reviewedSaveClause('glyph_of_warding', 'explosive-runes', 'glyph-of-warding', 'Glyph of Warding'),
  guardian_of_faith: reviewedSaveClause('guardian_of_faith', 'damage', 'guardian-of-faith', 'Guardian of Faith'),
  harm: reviewedSaveClause('harm', 'damage', 'harm', 'Harm'),
  hellish_rebuke: reviewedSaveClause('hellish_rebuke', 'damage', 'hellish-rebuke', 'Hellish Rebuke'),
  ice_knife: reviewedSaveClause('ice_knife', 'explosion-damage', 'ice-knife', 'Ice Knife'),
  ice_storm: reviewedSaveClause('ice_storm', 'damage', 'ice-storm', 'Ice Storm'),
  incendiary_cloud: reviewedSaveClause('incendiary_cloud', 'damage', 'incendiary-cloud', 'Incendiary Cloud'),
  inflict_wounds: reviewedSaveClause('inflict_wounds', 'damage', 'inflict-wounds', 'Inflict Wounds'),
  insect_plague: reviewedSaveClause('insect_plague', 'damage', 'insect-plague', 'Insect Plague'),
  lightning_bolt: reviewedSaveClause('lightning_bolt', 'damage', 'lightning-bolt', 'Lightning Bolt'),
  meteor_swarm: reviewedSaveClause('meteor_swarm', 'damage', 'meteor-swarm', 'Meteor Swarm'),
  mind_spike: reviewedSaveClause('mind_spike', 'damage', 'mind-spike', 'Mind Spike'),
  moonbeam: reviewedSaveClause('moonbeam', 'damage', 'moonbeam', 'Moonbeam'),
  phantasmal_force: reviewedSaveClause('phantasmal_force', 'recurring-damage', 'phantasmal-force', 'Phantasmal Force'),
  phantasmal_killer_initial: reviewedSaveClause('phantasmal_killer_initial', 'initial-damage', 'phantasmal-killer', 'Phantasmal Killer', { kind: 'source_text', includes: 'Disadvantage on ability checks' }),
  phantasmal_killer_repeat: reviewedSaveClause('phantasmal_killer_repeat', 'repeat-damage', 'phantasmal-killer', 'Phantasmal Killer', { kind: 'source_text', includes: 'damage again' }),
  prismatic_spray: reviewedSaveClause('prismatic_spray', 'damaging-rays', 'prismatic-spray', 'Prismatic Spray'),
  prismatic_wall: reviewedSaveClause('prismatic_wall', 'damaging-layers', 'prismatic-wall', 'Prismatic Wall'),
  ray_of_enfeeblement: reviewedSaveClause('ray_of_enfeeblement', 'damage-reduction', 'ray-of-enfeeblement', 'Ray of Enfeeblement'),
  sacred_flame: reviewedSaveClause('sacred_flame', 'damage', 'sacred-flame', 'Sacred Flame'),
  searing_smite: reviewedSaveClause('searing_smite', 'recurring-damage', 'searing-smite', 'Searing Smite'),
  shatter: reviewedSaveClause('shatter', 'damage', 'shatter', 'Shatter'),
  spirit_guardians: reviewedSaveClause('spirit_guardians', 'damage', 'spirit-guardians', 'Spirit Guardians'),
  storm_of_vengeance_initial: reviewedSaveClause('storm_of_vengeance_initial', 'initial-thunder-damage', 'storm-of-vengeance', 'Storm of Vengeance', { kind: 'ability', ability: 'constitution' }),
  storm_of_vengeance_lightning: reviewedSaveClause('storm_of_vengeance_lightning', 'lightning-damage', 'storm-of-vengeance', 'Storm of Vengeance', { kind: 'ability', ability: 'dexterity' }),
  summon_dragon: reviewedSaveClause('summon_dragon', 'breath-weapon', 'summon-dragon', 'Summon Dragon'),
  sunbeam: reviewedSaveClause('sunbeam', 'damage', 'sunbeam', 'Sunbeam'),
  sunburst: reviewedSaveClause('sunburst', 'damage', 'sunburst', 'Sunburst'),
  symbol: reviewedSaveClause('symbol', 'death-damage', 'symbol', 'Symbol'),
  thunderwave: reviewedSaveClause('thunderwave', 'damage', 'thunderwave', 'Thunderwave'),
  tsunami_initial: reviewedSaveClause('tsunami_initial', 'initial-damage', 'tsunami', 'Tsunami', { kind: 'damage_signature', dice_count: 6, die_size: 10, damage_type: 'Bludgeoning' }),
  tsunami_ongoing: reviewedSaveClause('tsunami_ongoing', 'ongoing-damage', 'tsunami', 'Tsunami', { kind: 'damage_signature', dice_count: 5, die_size: 10, damage_type: 'Bludgeoning' }),
  vicious_mockery: reviewedSaveClause('vicious_mockery', 'damage', 'vicious-mockery', 'Vicious Mockery'),
  vitriolic_sphere: reviewedSaveClause('vitriolic_sphere', 'damage', 'vitriolic-sphere', 'Vitriolic Sphere'),
  wall_of_fire: reviewedSaveClause('wall_of_fire', 'damage', 'wall-of-fire', 'Wall of Fire'),
  wall_of_ice_initial: reviewedSaveClause('wall_of_ice_initial', 'initial-damage', 'wall-of-ice', 'Wall of Ice', { kind: 'ability', ability: 'dexterity' }),
  wall_of_ice_frigid_air: reviewedSaveClause('wall_of_ice_frigid_air', 'frigid-air-damage', 'wall-of-ice', 'Wall of Ice', { kind: 'ability', ability: 'constitution' }),
  wall_of_thorns_piercing: reviewedSaveClause('wall_of_thorns_piercing', 'piercing-damage', 'wall-of-thorns', 'Wall of Thorns', { kind: 'damage_signature', dice_count: 7, die_size: 8, damage_type: 'Piercing' }),
  wall_of_thorns_slashing: reviewedSaveClause('wall_of_thorns_slashing', 'slashing-damage', 'wall-of-thorns', 'Wall of Thorns', { kind: 'damage_signature', dice_count: 7, die_size: 8, damage_type: 'Slashing' }),
  weird_initial: reviewedSaveClause('weird_initial', 'initial-damage', 'weird', 'Weird', { kind: 'damage_signature', dice_count: 10, die_size: 10, damage_type: 'Psychic' }),
  weird_repeat: reviewedSaveClause('weird_repeat', 'repeat-damage', 'weird', 'Weird', { kind: 'damage_signature', dice_count: 5, die_size: 10, damage_type: 'Psychic' }),
  wind_wall: reviewedSaveClause('wind_wall', 'damage', 'wind-wall', 'Wind Wall'),
} as const satisfies Record<string, ReviewedSaveSuccessClause>;

/**
 * Independent success-kind oracle transcribed from the raw bundled spell text
 * and the round-10 supervisor/reviewer clause-by-clause enumerations. It is not
 * generated from `sourceDerivedSaveDamageCandidates`. The exhaustive key type
 * makes a new reviewed clause fail compilation until a human classifies it;
 * the runtime comparison makes an extractor reclassification fail module load
 * unless that independent transcription is deliberately reviewed too.
 */
export const reviewedSaveSuccessKindOracle = Object.freeze({
  acid_splash: 'none',
  arcane_hand_grasping: 'unavailable',
  befuddlement: 'half',
  bestow_curse_damage: 'unavailable',
  black_tentacles: 'none',
  blade_barrier: 'half',
  blight: 'half',
  burning_hands: 'half',
  call_lightning: 'half',
  chain_lightning: 'half',
  circle_of_death: 'half',
  cloudkill: 'half',
  cone_of_cold: 'half',
  conjure_animals: 'none',
  conjure_celestial: 'half',
  conjure_elemental_initial: 'none',
  conjure_elemental_repeat: 'none',
  conjure_woodland_beings: 'half',
  contagion: 'none',
  contact_other_plane: 'none',
  control_water: 'half',
  delayed_blast_fireball: 'half',
  disintegrate: 'none',
  dissonant_whispers: 'half',
  dragons_breath: 'half',
  dream: 'none',
  earthquake: 'half',
  enlarge_reduce_damage: 'unavailable',
  ensnaring_strike: 'unavailable',
  faithful_hound: 'none',
  finger_of_death: 'half',
  fireball: 'half',
  fire_storm: 'half',
  flame_strike: 'half',
  flaming_sphere: 'half',
  freezing_sphere: 'half',
  geas: 'unavailable',
  glyph_of_warding: 'half',
  guardian_of_faith: 'half',
  harm: 'half',
  hellish_rebuke: 'half',
  ice_knife: 'none',
  ice_storm: 'half',
  incendiary_cloud: 'half',
  inflict_wounds: 'half',
  insect_plague: 'half',
  lightning_bolt: 'half',
  meteor_swarm: 'half',
  mind_spike: 'half',
  moonbeam: 'half',
  phantasmal_force: 'unavailable',
  phantasmal_killer_initial: 'half',
  phantasmal_killer_repeat: 'none',
  prismatic_spray: 'half',
  prismatic_wall: 'half',
  ray_of_enfeeblement: 'unavailable',
  sacred_flame: 'none',
  searing_smite: 'unavailable',
  shatter: 'half',
  spirit_guardians: 'half',
  storm_of_vengeance_initial: 'none',
  storm_of_vengeance_lightning: 'half',
  summon_dragon: 'half',
  sunbeam: 'half',
  sunburst: 'half',
  symbol: 'half',
  thunderwave: 'half',
  tsunami_initial: 'half',
  tsunami_ongoing: 'none',
  vicious_mockery: 'none',
  vitriolic_sphere: 'sourced_damage',
  wall_of_fire: 'half',
  wall_of_ice_initial: 'half',
  wall_of_ice_frigid_air: 'half',
  wall_of_thorns_piercing: 'half',
  wall_of_thorns_slashing: 'half',
  weird_initial: 'half',
  weird_repeat: 'none',
  wind_wall: 'half',
} as const satisfies Record<
  keyof typeof reviewedSaveSuccessClauses,
  ReviewedSaveSuccessClause['kind']
>);

/**
 * D257: independent per-clause fixed-save-DC oracle, decoded from raw source
 * by the supervisor (2026-08-15). This table is the AUTHORITY on printed save
 * DCs; the scanner is a drift alarm. Corpus census at decode time: four
 * numeric-DC sentences exist (Contact Other Plane, Dispel Magic, Earthquake,
 * Maze); only Contact Other Plane's belongs to a damage-save clause. A new
 * clause must add its row here, decoded from source, before it can fold.
 */
export const reviewedFixedSaveDcOracle = Object.freeze({
  acid_splash: null,
  arcane_hand_grasping: null,
  befuddlement: null,
  bestow_curse_damage: null,
  black_tentacles: null,
  blade_barrier: null,
  blight: null,
  burning_hands: null,
  call_lightning: null,
  chain_lightning: null,
  circle_of_death: null,
  cloudkill: null,
  cone_of_cold: null,
  conjure_animals: null,
  conjure_celestial: null,
  conjure_elemental_initial: null,
  conjure_elemental_repeat: null,
  conjure_woodland_beings: null,
  contagion: null,
  contact_other_plane: 15,
  control_water: null,
  delayed_blast_fireball: null,
  disintegrate: null,
  dissonant_whispers: null,
  dragons_breath: null,
  dream: null,
  earthquake: null,
  enlarge_reduce_damage: null,
  ensnaring_strike: null,
  faithful_hound: null,
  finger_of_death: null,
  fireball: null,
  fire_storm: null,
  flame_strike: null,
  flaming_sphere: null,
  freezing_sphere: null,
  geas: null,
  glyph_of_warding: null,
  guardian_of_faith: null,
  harm: null,
  hellish_rebuke: null,
  ice_knife: null,
  ice_storm: null,
  incendiary_cloud: null,
  inflict_wounds: null,
  insect_plague: null,
  lightning_bolt: null,
  meteor_swarm: null,
  mind_spike: null,
  moonbeam: null,
  phantasmal_force: null,
  phantasmal_killer_initial: null,
  phantasmal_killer_repeat: null,
  prismatic_spray: null,
  prismatic_wall: null,
  ray_of_enfeeblement: null,
  sacred_flame: null,
  searing_smite: null,
  shatter: null,
  spirit_guardians: null,
  storm_of_vengeance_initial: null,
  storm_of_vengeance_lightning: null,
  summon_dragon: null,
  sunbeam: null,
  sunburst: null,
  symbol: null,
  thunderwave: null,
  tsunami_initial: null,
  tsunami_ongoing: null,
  vicious_mockery: null,
  vitriolic_sphere: null,
  wall_of_fire: null,
  wall_of_ice_initial: null,
  wall_of_ice_frigid_air: null,
  wall_of_thorns_piercing: null,
  wall_of_thorns_slashing: null,
  weird_initial: null,
  weird_repeat: null,
  wind_wall: null,
} as const satisfies Record<
  keyof typeof reviewedSaveSuccessClauses,
  number | null
>);

/**
 * Independent damage-roll grouping oracle transcribed from the raw bundled
 * spell text. These are not copied from `reviewedDamageRequirementsByClause`
 * or projected from `damage_occurrences`: changing a runtime declaration or
 * parser interpretation must disagree here until the source is reviewed.
 */
export const reviewedDamageRollSlotGroupOracle = Object.freeze({
  acid_splash: [[0]],
  arcane_hand_grasping: [],
  befuddlement: [[0]],
  bestow_curse_damage: [],
  black_tentacles: [[0]],
  blade_barrier: [[0]],
  blight: [[0]],
  burning_hands: [[0]],
  call_lightning: [[0]],
  chain_lightning: [[0]],
  circle_of_death: [[0]],
  cloudkill: [[0]],
  cone_of_cold: [[0]],
  conjure_animals: [[0]],
  conjure_celestial: [[0]],
  conjure_elemental_initial: [[0]],
  conjure_elemental_repeat: [[0]],
  conjure_woodland_beings: [[0]],
  contagion: [[0]],
  contact_other_plane: [[0]],
  control_water: [[0]],
  delayed_blast_fireball: [[0]],
  disintegrate: [[0, 1]],
  dissonant_whispers: [[0]],
  dragons_breath: [[0]],
  dream: [[0]],
  earthquake: [[0]],
  enlarge_reduce_damage: [],
  ensnaring_strike: [[0]],
  faithful_hound: [[0]],
  finger_of_death: [[0, 1]],
  fireball: [[0]],
  fire_storm: [[0]],
  flame_strike: [[0], [1]],
  flaming_sphere: [[0]],
  freezing_sphere: [[0]],
  geas: [],
  glyph_of_warding: [[0]],
  guardian_of_faith: [[0]],
  harm: [[0]],
  hellish_rebuke: [[0]],
  ice_knife: [[0]],
  ice_storm: [[0], [1]],
  incendiary_cloud: [[0]],
  inflict_wounds: [[0]],
  insect_plague: [[0]],
  lightning_bolt: [[0]],
  meteor_swarm: [[0], [1]],
  mind_spike: [[0]],
  moonbeam: [[0]],
  phantasmal_force: [],
  phantasmal_killer_initial: [[0]],
  phantasmal_killer_repeat: [[0]],
  prismatic_spray: [[0]],
  prismatic_wall: [[0]],
  ray_of_enfeeblement: [[0]],
  sacred_flame: [[0]],
  searing_smite: [],
  shatter: [[0]],
  spirit_guardians: [[0]],
  storm_of_vengeance_initial: [[0]],
  storm_of_vengeance_lightning: [[0]],
  summon_dragon: [[0]],
  sunbeam: [[0]],
  sunburst: [[0]],
  symbol: [[0]],
  thunderwave: [[0]],
  tsunami_initial: [[0]],
  tsunami_ongoing: [[0]],
  vicious_mockery: [[0]],
  vitriolic_sphere: [[0], [1]],
  wall_of_fire: [[0]],
  wall_of_ice_initial: [[0]],
  wall_of_ice_frigid_air: [[0]],
  wall_of_thorns_piercing: [[0]],
  wall_of_thorns_slashing: [[0]],
  weird_initial: [[0]],
  weird_repeat: [[0]],
  wind_wall: [[0]],
} as const satisfies Record<
  keyof typeof reviewedSaveSuccessClauses,
  readonly DamageRollSlotGroup[]
>);

/**
 * Total independent availability oracle. Absence is never interpreted as
 * available: every registered clause must carry one explicit classification.
 */
export const reviewedSaveAvailabilityOracle = Object.freeze({
  acid_splash: 'available',
  arcane_hand_grasping: 'unavailable',
  befuddlement: 'available',
  bestow_curse_damage: 'unavailable',
  black_tentacles: 'available',
  blade_barrier: 'available',
  blight: 'available',
  burning_hands: 'available',
  call_lightning: 'available',
  chain_lightning: 'available',
  circle_of_death: 'available',
  cloudkill: 'available',
  cone_of_cold: 'available',
  conjure_animals: 'available',
  conjure_celestial: 'available',
  conjure_elemental_initial: 'available',
  conjure_elemental_repeat: 'available',
  conjure_woodland_beings: 'available',
  contagion: 'available',
  contact_other_plane: 'available',
  control_water: 'available',
  delayed_blast_fireball: 'available',
  disintegrate: 'available',
  dissonant_whispers: 'available',
  dragons_breath: 'available',
  dream: 'unavailable',
  earthquake: 'available',
  enlarge_reduce_damage: 'unavailable',
  ensnaring_strike: 'unavailable',
  faithful_hound: 'available',
  finger_of_death: 'available',
  fireball: 'available',
  fire_storm: 'available',
  flame_strike: 'available',
  flaming_sphere: 'available',
  freezing_sphere: 'available',
  geas: 'unavailable',
  glyph_of_warding: 'available',
  guardian_of_faith: 'available',
  harm: 'available',
  hellish_rebuke: 'available',
  ice_knife: 'available',
  ice_storm: 'available',
  incendiary_cloud: 'available',
  inflict_wounds: 'available',
  insect_plague: 'available',
  lightning_bolt: 'available',
  meteor_swarm: 'available',
  mind_spike: 'available',
  moonbeam: 'available',
  phantasmal_force: 'unavailable',
  phantasmal_killer_initial: 'available',
  phantasmal_killer_repeat: 'available',
  prismatic_spray: 'unavailable',
  prismatic_wall: 'available',
  ray_of_enfeeblement: 'unavailable',
  sacred_flame: 'available',
  searing_smite: 'unavailable',
  shatter: 'available',
  spirit_guardians: 'available',
  storm_of_vengeance_initial: 'available',
  storm_of_vengeance_lightning: 'available',
  summon_dragon: 'available',
  sunbeam: 'available',
  sunburst: 'available',
  symbol: 'available',
  thunderwave: 'available',
  tsunami_initial: 'available',
  tsunami_ongoing: 'available',
  vicious_mockery: 'available',
  vitriolic_sphere: 'unavailable',
  wall_of_fire: 'available',
  wall_of_ice_initial: 'available',
  wall_of_ice_frigid_air: 'available',
  wall_of_thorns_piercing: 'available',
  wall_of_thorns_slashing: 'available',
  weird_initial: 'available',
  weird_repeat: 'available',
  wind_wall: 'available',
} as const satisfies Record<
  keyof typeof reviewedSaveSuccessClauses,
  'available' | 'unavailable'
>);

export function assertReviewedDamageRollGroups(
  key: keyof typeof reviewedSaveSuccessClauses,
  sourceClause: SourceDerivedSaveClause,
): void {
  const actual = reviewedSaveSuccessClauses[key];
  const expectedRollGroups = reviewedDamageRollSlotGroupOracle[key];
  if (
    !sameDamageRollSlotGroups(
      sourceDamageRollSlotGroups(sourceClause, 'failure'),
      expectedRollGroups,
    )
  ) {
    throw new TypeError(
      `${actual.id} source-derived damage-roll groups disagree with the independent grouping oracle.`,
    );
  }
}

for (const [key, expectedKind] of Object.entries(reviewedSaveSuccessKindOracle)) {
  const actual = reviewedSaveSuccessClauses[key as keyof typeof reviewedSaveSuccessClauses];
  const sourceClause = sourceClauseByReviewedId.get(actual.id);
  if (sourceClause === undefined) {
    throw new TypeError(`${actual.id} has no registered source clause.`);
  }
  if (actual.kind !== expectedKind) {
    throw new TypeError(
      `${actual.id} source-derived success kind ${actual.kind} disagrees with the independent reviewed oracle ${expectedKind}.`,
    );
  }
  const expectedAvailability = reviewedSaveAvailabilityOracle[
    key as keyof typeof reviewedSaveAvailabilityOracle
  ];
  if (expectedAvailability === undefined) {
    throw new TypeError(`${actual.id} has no reviewed availability row.`);
  }
  const actualAvailability = actual.unavailable_reason === null
    ? 'available'
    : 'unavailable';
  if (actualAvailability !== expectedAvailability) {
    throw new TypeError(
      `${actual.id} source-derived availability disagrees with the independent reviewed oracle.`,
    );
  }
  assertReviewedDamageRollGroups(
    key as keyof typeof reviewedDamageRollSlotGroupOracle,
    sourceClause,
  );
  const expectedRollGroups = reviewedDamageRollSlotGroupOracle[
    key as keyof typeof reviewedDamageRollSlotGroupOracle
  ] as readonly DamageRollSlotGroup[];
  if (
    actual.failed_damage_signature_slots.length > 0 &&
    !sameDamageRollSlotGroups(actual.failed_damage_roll_slot_groups, expectedRollGroups)
  ) {
    throw new TypeError(
      `${actual.id} damage-roll declaration disagrees with the independent grouping oracle.`,
    );
  }
}

for (const [key, expectedDc] of Object.entries(reviewedFixedSaveDcOracle)) {
  const actual = reviewedSaveSuccessClauses[key as keyof typeof reviewedSaveSuccessClauses];
  if (actual.fixed_save_dc !== expectedDc) {
    throw new TypeError(
      `${actual.id} source-derived fixed save DC ${String(actual.fixed_save_dc)} disagrees with the independent reviewed oracle ${String(expectedDc)}.`,
    );
  }
}

export const reviewedSaveEffectStableKeys = Object.fromEntries(
  Object.entries(reviewedSaveSuccessClauses).map(([key, clause]) => [
    key,
    clause.effect_stable_key,
  ]),
) as {
  readonly [Key in keyof typeof reviewedSaveSuccessClauses]: SourceStableKey;
};

/**
 * Reviewed success clauses keyed by the effect's own stable identity. Acid
 * Splash itself states that a successful save deals no damage. Fireball itself
 * states that a successful save deals half damage. The general SRD `Half
 * Damage` rule remains the fold's math citation above, but cannot authorize a
 * particular effect.
 */
export const saveSuccessOutcomeEvidenceManifest: ReadonlyMap<
  SaveSuccessClauseId,
  ReviewedSaveSuccessClause
> = new Map(
  Object.values(reviewedSaveSuccessClauses).map((clause) => [
    clause.id,
    clause,
  ]),
);

function samePublicSource(left: PublicSourceRef, right: PublicSourceRef): boolean {
  if (left.kind !== right.kind || left.path !== right.path) {
    return false;
  }
  return left.kind === 'project_owned' ||
    (right.kind === 'bundled_srd' && left.heading === right.heading);
}

function sameSourceRef(left: SourceRef, right: SourceRef): boolean {
  if (left.kind !== right.kind || left.stable_key !== right.stable_key) {
    return false;
  }
  switch (left.kind) {
    case 'character_source':
      return right.kind === 'character_source' &&
        left.source_instance_id === right.source_instance_id;
    case 'catalog_content':
      return right.kind === 'catalog_content' &&
        left.content_key === right.content_key;
    case 'character_weapon':
      return right.kind === 'character_weapon' &&
        left.weapon_id === right.weapon_id;
  }
}

function damageMatchesSourceClause(
  effect: SourceRef,
  damage: readonly DamageInstance[],
  slots: readonly DamageSignatureSlot[],
  rollSlotGroups: readonly DamageRollSlotGroup[],
  repetitions: DamageSlotRepetitions,
): boolean {
  if (damage.some((instance) => !sameSourceRef(instance.source, effect))) {
    return false;
  }
  type SuppliedPool = {
    readonly instance_index: number;
    readonly damage_type: string;
    readonly kind: 'dice' | 'flat';
    readonly die: number | null;
    readonly amount: number;
  };
  const suppliedByKey = new Map<string, SuppliedPool>();
  for (const [instanceIndex, instance] of damage.entries()) {
    for (const component of instance.components) {
      const kind = component.kind;
      const die = kind === 'dice' ? component.pool.die : null;
      const amount = kind === 'dice' ? component.pool.count : component.modifier;
      const key = JSON.stringify([instanceIndex, instance.damage_type, kind, die]);
      const existing = suppliedByKey.get(key);
      suppliedByKey.set(key, {
        instance_index: instanceIndex,
        damage_type: instance.damage_type,
        kind,
        die,
        amount: (existing?.amount ?? 0) + amount,
      });
    }
  }
  const supplied = [...suppliedByKey.values()];
  const requiredAmount = (signature: FailedDamageSignature): number | null =>
    signature.dice_count ?? signature.flat_modifier;
  const rollMatchesInstance = (
    slotGroup: DamageRollSlotGroup,
    instanceIndex: number,
  ): boolean => {
    const instancePools = supplied.filter((pool) =>
      pool.instance_index === instanceIndex
    );
    const assignSlot = (
      groupSlotIndex: number,
      remaining: readonly number[],
    ): boolean => {
      if (groupSlotIndex === slotGroup.length) {
        return remaining.every((amount) => amount === 0);
      }
      const slotIndex = slotGroup[groupSlotIndex];
      const slot = slotIndex === undefined ? undefined : slots[slotIndex];
      if (slot === undefined) {
        return false;
      }
      for (const signature of slot) {
        const amount = requiredAmount(signature);
        if (amount === null) {
          continue;
        }
        for (const [localIndex, pool] of instancePools.entries()) {
          const kindMatches = signature.dice_count === null
            ? pool.kind === 'flat' && signature.die_size === null
            : pool.kind === 'dice' && signature.die_size === pool.die;
          const typeMatches = signature.damage_type === null ||
            signature.damage_type === pool.damage_type;
          if (kindMatches && typeMatches && (remaining[localIndex] ?? 0) >= amount) {
            const next = [...remaining];
            next[localIndex] = (next[localIndex] ?? 0) - amount;
            if (assignSlot(groupSlotIndex + 1, next)) {
              return true;
            }
          }
        }
      }
      return false;
    };
    return assignSlot(0, instancePools.map((pool) => pool.amount));
  };
  const assignRolls = (
    requiredRolls: readonly DamageRollSlotGroup[],
    slotIndex: number,
    usedInstances: ReadonlySet<number>,
  ): boolean => {
    if (slotIndex === requiredRolls.length) {
      return usedInstances.size === damage.length;
    }
    const roll = requiredRolls[slotIndex];
    if (roll === undefined) {
      return false;
    }
    for (const instanceIndex of damage.keys()) {
      if (!usedInstances.has(instanceIndex) && rollMatchesInstance(roll, instanceIndex)) {
        const next = new Set(usedInstances);
        next.add(instanceIndex);
        if (assignRolls(requiredRolls, slotIndex + 1, next)) {
          return true;
        }
      }
    }
    return false;
  };
  for (
    let repeat = repetitions.minimum;
    repeat <= repetitions.maximum;
    repeat += 1
  ) {
    const requiredRolls = Array.from({ length: repeat }, () => rollSlotGroups).flat();
    if (
      requiredRolls.length === damage.length &&
      assignRolls(requiredRolls, 0, new Set<number>())
    ) {
      return true;
    }
  }
  return false;
}

function sameSavingThrowDamageDuration(
  left: SavingThrowDamageDuration,
  right: SavingThrowDamageDuration,
): boolean {
  return left.kind === right.kind &&
    (left.kind === 'instantaneous' ||
      (right.kind === 'includes_delayed_damage' &&
        left.delayed_until === right.delayed_until));
}

function sameEventFrequency(
  left: EventFrequency,
  right: EventFrequency,
): boolean {
  if (left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case 'each_declared_event':
      return true;
    case 'once_per_turn':
      return right.kind === 'once_per_turn' &&
        left.turn === right.turn &&
        samePublicSource(left.evidence, right.evidence);
    case 'once_per_round':
      return right.kind === 'once_per_round' &&
        samePublicSource(left.evidence, right.evidence);
  }
}

/**
 * A general saving-throw rule does not establish an individual effect's
 * success clause. Only reviewed, code-owned entries may authorize a numeric
 * success arm; an empty arm remains explicitly unsupported.
 */
export function saveSuccessOutcomeHasEvidence(
  effect: SourceRef,
  clauseId: SaveSuccessClauseId,
  outcome: SaveSuccessOutcome,
  ability: Ability,
  damageOnFailedSave: readonly DamageInstance[],
  duration: SavingThrowDamageDuration,
  saveDc: number,
  frequency: EventFrequency,
): boolean {
  return saveSuccessOutcomeEvidenceFailureReason(
    effect,
    clauseId,
    outcome,
    ability,
    damageOnFailedSave,
    duration,
    saveDc,
    frequency,
  ) === null;
}

export function saveSuccessOutcomeEvidenceFailureReason(
  effect: SourceRef,
  clauseId: SaveSuccessClauseId,
  outcome: SaveSuccessOutcome,
  ability: Ability,
  damageOnFailedSave: readonly DamageInstance[],
  duration: SavingThrowDamageDuration,
  saveDc: number,
  frequency: EventFrequency,
): string | null {
  const expected = saveSuccessOutcomeEvidenceManifest.get(clauseId);
  if (expected?.kind === 'unavailable') {
    return expected.unavailable_reason ??
      'The reviewed source clause is unavailable for numeric folding.';
  }
  const genericReason = `The cited evidence does not establish the ${outcome.kind} successful-save clause.`;
  if (expected === undefined) {
    return genericReason;
  }
  const matches =
    sameSourceRef(expected.effect_source, effect) &&
    expected.kind === outcome.kind &&
    samePublicSource(outcome.evidence, expected.evidence) &&
    ability === expected.ability &&
    sameSavingThrowDamageDuration(duration, expected.duration) &&
    (expected.fixed_save_dc === null || saveDc === expected.fixed_save_dc) &&
    sameEventFrequency(frequency, expected.frequency) &&
    damageMatchesSourceClause(
      effect,
      damageOnFailedSave,
      expected.failed_damage_signature_slots,
      expected.failed_damage_roll_slot_groups,
      expected.failed_damage_slot_repetitions,
    ) &&
    (outcome.kind !== 'sourced_damage' || (
      outcome.roll_transform === expected.success_roll_transform &&
      damageMatchesSourceClause(
        effect,
        outcome.damage,
        expected.success_damage_signature_slots,
        expected.success_damage_signature_slots.map((_, index) => [index]),
        { minimum: 1, maximum: 1 },
      )
    ));
  if (!matches) {
    return genericReason;
  }
  if (expected.unavailable_reason !== null) {
    return expected.unavailable_reason;
  }
  return null;
}

export function automaticDamageEvidenceFailureReason(
  effect: SourceRef,
  clauseId: SaveSuccessClauseId,
  evidence: PublicSourceRef,
  damage: readonly DamageInstance[],
  duration: SavingThrowDamageDuration,
  frequency: EventFrequency,
): string | null {
  const expected = saveSuccessOutcomeEvidenceManifest.get(clauseId);
  const genericReason = 'The cited evidence does not establish this automatic-damage clause.';
  if (expected === undefined) {
    return genericReason;
  }
  if (expected.unavailable_reason !== null) {
    return expected.unavailable_reason;
  }
  return sameSourceRef(expected.effect_source, effect) &&
    samePublicSource(evidence, expected.evidence) &&
    sameSavingThrowDamageDuration(duration, expected.duration) &&
    sameEventFrequency(frequency, expected.frequency) &&
    damageMatchesSourceClause(
      effect,
      damage,
      expected.failed_damage_signature_slots,
      expected.failed_damage_roll_slot_groups,
      expected.failed_damage_slot_repetitions,
    )
    ? null
    : genericReason;
}

export const expandedCriticalHitEvidenceManifest: ReadonlyMap<
  number,
  PublicSourceRef
> = new Map([
  [19, bundledHeading('Level 3: Improved Critical')],
  [18, bundledHeading('Level 15: Superior Critical')],
] as const);

export function criticalHitRuleHasEvidence(rule: CriticalHitRule): boolean {
  switch (rule.kind) {
    case 'natural_20':
      return criticalHitHasEvidence(rule.evidence);
    case 'expanded_range': {
      const expected = expandedCriticalHitEvidenceManifest.get(
        rule.minimum_roll,
      );
      return expected !== undefined && samePublicSource(rule.evidence, expected);
    }
  }
}

export function criticalHitHasEvidence(evidence: PublicSourceRef): boolean {
  return samePublicSource(
    evidence,
    publicProbabilityCoverageManifest.critical_hit,
  );
}

export const reviewedDamageNeutralMechanicIds = {
  fireball_flammable_objects:
    'srd-5.2.1:spell:fireball:flammable-objects' as DamageNeutralMechanicId,
} as const;

const damageNeutralityEvidenceManifest = new Map([
  [
    reviewedDamageNeutralMechanicIds.fireball_flammable_objects,
    bundledHeading('Fireball'),
  ],
]);

/**
 * This constructor corrects a round-2 test that treated any real heading as
 * damage-neutral proof. A proof is now minted only when its citation is the
 * reviewed citation for a code-owned mechanic ID. Database-backed SourceRef
 * fields are deliberately not accepted here: their stable keys are data and
 * cannot mint neutrality proof.
 */
export function damageNeutralityEvidence(
  mechanic: DamageNeutralMechanicId,
  evidence: PublicSourceRef,
): DamageNeutralityEvidence {
  const expected = damageNeutralityEvidenceManifest.get(mechanic);
  if (expected === undefined || !samePublicSource(evidence, expected)) {
    throw new TypeError(
      'Damage-neutral evidence does not establish neutrality for this mechanic.',
    );
  }
  return { mechanic, evidence } as DamageNeutralityEvidence;
}

type ReviewedResourceRecoveryClause = {
  readonly id: ResourceRecoveryClauseId;
  readonly resource_source: SourceRef & { readonly kind: 'catalog_content' };
  readonly resource_stable_key: SourceStableKey;
  readonly citation: PublicSourceRef;
  readonly semantics:
    | 'one_short_all_long'
    | 'half_maximum_once_short'
    | 'all_long';
};

function reviewedResourceRecoveryClause(
  id: string,
  resourceStableKey: string,
  heading: ReviewedBundledSrdHeading,
  semantics: ReviewedResourceRecoveryClause['semantics'],
): ReviewedResourceRecoveryClause {
  const stableKey = sourceStableKey(resourceStableKey);
  return {
    id: resourceRecoveryClauseId(id),
    resource_source: {
      kind: 'catalog_content',
      content_key: String(stableKey) as ContentKey,
      stable_key: stableKey,
    },
    resource_stable_key: stableKey,
    citation: bundledHeading(heading),
    semantics,
  };
}

export const reviewedResourceRecoveryClauses = {
  rage: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:barbarian:rage:recovery',
    'srd-5.2.1:class:barbarian:rage',
    'Level 1: Rage',
    'one_short_all_long',
  ),
  channel_divinity: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:cleric:channel-divinity:recovery',
    'srd-5.2.1:class:cleric:channel-divinity',
    'Level 2: Channel Divinity',
    'one_short_all_long',
  ),
  sorcerous_restoration: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:sorcerer:sorcery-points:sorcerous-restoration',
    'srd-5.2.1:class:sorcerer:sorcery-points',
    'Level 5: Sorcerous Restoration',
    'half_maximum_once_short',
  ),
  font_of_magic: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:sorcerer:sorcery-points:long-rest-recovery',
    'srd-5.2.1:class:sorcerer:sorcery-points',
    'Level 2: Font of Magic',
    'all_long',
  ),
} as const satisfies Record<string, ReviewedResourceRecoveryClause>;

const resourceRecoveryEvidenceManifest: ReadonlyMap<
  ResourceRecoveryClauseId,
  ReviewedResourceRecoveryClause
> = new Map(
  Object.values(reviewedResourceRecoveryClauses).map((clause) => [
    clause.id,
    clause,
  ]),
);

export function resourceRecoveryEvidence(
  resourceSource: SourceRef,
  clauseId: ResourceRecoveryClauseId,
  authorization: {
    readonly rest: 'short_rest' | 'long_rest';
    readonly rule_kind: 'fixed' | 'fixed_once_per_long_rest' | 'all';
    readonly amount: number | null;
    readonly maximum: number;
  },
): ResourceRecoveryEvidence {
  const clause = resourceRecoveryEvidenceManifest.get(clauseId);
  if (
    clause === undefined ||
    !sameSourceRef(clause.resource_source, resourceSource)
  ) {
    throw new TypeError(
      'Resource-recovery evidence does not establish recovery for this resource source.',
    );
  }
  const expected = (() => {
    switch (clause.semantics) {
      case 'one_short_all_long':
        return authorization.rest === 'short_rest'
          ? { rule_kind: 'fixed' as const, amount: 1 }
          : { rule_kind: 'all' as const, amount: null };
      case 'half_maximum_once_short':
        return authorization.rest === 'short_rest'
          ? {
              rule_kind: 'fixed_once_per_long_rest' as const,
              amount: Math.floor(authorization.maximum / 2),
            }
          : null;
      case 'all_long':
        return authorization.rest === 'long_rest'
          ? { rule_kind: 'all' as const, amount: null }
          : null;
    }
  })();
  if (
    expected === null ||
    expected.rule_kind !== authorization.rule_kind ||
    expected.amount !== authorization.amount
  ) {
    throw new TypeError(
      'Resource-recovery evidence does not authorize this rest, rule kind, and amount.',
    );
  }
  return {
    clause_id: clause.id,
    resource_source: resourceSource,
    citation: clause.citation,
    authorized_rest: authorization.rest,
    authorized_rule_kind: authorization.rule_kind,
    authorized_amount: authorization.amount,
  } as ResourceRecoveryEvidence;
}

// A set-equality assertion at runtime complements the `satisfies` compile gate.
export function probabilityManifestIsComplete(): boolean {
  return (
    Object.keys(publicProbabilityCoverageManifest).length ===
      publicProbabilityMechanicKinds.length &&
    unmodelledIssueKinds.length === Object.keys(unmodelledIssuePriority).length
  );
}
