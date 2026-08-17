import type { SheetGap } from '../queries/character-sheet-builder';
import type { SheetWarning } from '../rules/sheet';
import { sha256 } from '../crypto/sha256';
import { normalizeCatalogKeyComponent } from '../catalog/catalog-key';
import bundledSrd521 from '../../docs/srd/full/srd-5.2.1.txt?raw';
import bundledSpellDescriptions from '../../docs/srd/source/spell-descriptions.txt?raw';
import type { Ability, DamageType } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import {
  BUNDLED_SRD_5_2_1_PATH,
  reviewedResourceRecoverySourceSha256Oracle,
  sameSourceRef,
  saveSuccessClauseId,
  snapshotPublicSourceRef,
  snapshotSourceRef,
  sourceStableKey,
  unmodelledIssueKinds,
  unmodelledIssueId,
  type BundledSrdHeading,
  type BundledSrdSourceRef,
  type AttackDamageInstance,
  type AttackRollClauseId,
  type CriticalHitRule,
  type DamageComponent,
  type DamageInstance,
  type DamageNeutralMechanicId,
  type DamageNeutralityEvidence,
  type EventFrequency,
  type PublicSourceRef,
  type ReviewedResourceRecoveryRow,
  type SaveSuccessClauseId,
  type SaveSuccessOutcome,
  type SavingThrowDamageDuration,
  type SourceRef,
  type SourceStableKey,
  type UnmodelledIssue,
  type UnmodelledIssueKind,
} from './contracts';
export {
  resourceRecoveryEvidence,
  reviewedResourceRecoveryClauses,
  reviewedResourceRecoverySourceSha256Oracle,
} from './contracts';
import {
  deriveSaveDamageCoverageFromBodies,
  spellBodyDigestInputsByHeading,
  spellBodyDigestInputsFromFullLayout,
  spellDescriptionsByHeading,
  spellDescriptionsFromFullLayout,
  damageSignatureOf,
  type DamageSignature,
  type SourceDerivedSaveClause,
  type SourceDerivedSaveDamageCandidate,
} from './spell-source-reader';
import {
  deepFreeze,
  runtimeReadonlyMap,
  runtimeReadonlyMapView,
} from './runtime-readonly-map';

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
export function bundledSrdSourceRef(heading: unknown): BundledSrdSourceRef {
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
): BundledSrdSourceRef => bundledSrdSourceRef(heading);

/**
 * The complete Stage 2B rules inventory. Each entry points to the bundled,
 * redistributable SRD text that authorizes and defines the mechanic. Functions
 * in `probability.ts` cite these entries beside the fold they implement.
 *
 * The entry type is `BundledSrdSourceRef`, not the wide `PublicSourceRef`
 * union: "every Stage 2B mechanic cites bundled SRD content" is a compile-time
 * property of this table. A project-owned citation added here fails to compile
 * here, so no consumer needs — or is allowed to grow — a runtime `kind` guard.
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
} as const satisfies Record<PublicProbabilityMechanicKind, BundledSrdSourceRef>;

type ReviewedSaveSuccessClause = {
  readonly id: SaveSuccessClauseId;
  readonly effect_source: SourceRef & { readonly kind: 'catalog_content' };
  readonly effect_stable_key: SourceStableKey;
  readonly kind: SaveSuccessOutcome['kind'] | 'unavailable';
  readonly unavailable_reason: string | null;
  readonly evidence: PublicSourceRef;
  readonly source_span: string;
  readonly spell_body_sha256: string;
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
  DamageSignature,
  ...DamageSignature[],
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
): DamageSignature => ({
  kind: 'dice',
  damage_type: damageType,
  count,
  die,
});

const flat = (
  modifier: number,
  damageType: DamageType,
): DamageSignature => ({
  kind: 'flat',
  damage_type: damageType,
  amount: modifier,
});

const required = (
  signature: DamageSignature,
  ...alternatives: readonly DamageSignature[]
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
const bundledSpellBodyDigestInputs = spellBodyDigestInputsFromFullLayout(
  bundledSrd521,
);
const extractedSpellBodyDigestInputs = spellBodyDigestInputsByHeading(
  bundledSpellDescriptions,
);
if (
  bundledSpellBodies.size !== extractedSpellBodies.size ||
  [...bundledSpellBodies].some(([heading, body]) =>
    extractedSpellBodies.get(heading) !== body,
  ) ||
  bundledSpellBodyDigestInputs.size !== extractedSpellBodyDigestInputs.size ||
  [...bundledSpellBodyDigestInputs].some(([heading, body]) =>
    extractedSpellBodyDigestInputs.get(heading) !== body,
  )
) {
  throw new TypeError(
    'Column-safe full SRD spell reading, including raw digest bodies, does not match the committed readable spell extract.',
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
        signature.kind === 'dice' &&
        signature.count === discriminator.dice_count &&
        signature.die === discriminator.die_size &&
        signature.damage_type === discriminator.damage_type,
      );
    case 'source_text':
      return clause.span.includes(discriminator.includes);
  }
}

function sameDamageSignature(
  left: DamageSignature,
  right: DamageSignature,
): boolean {
  if (left.damage_type !== right.damage_type || left.kind !== right.kind) {
    return false;
  }
  switch (left.kind) {
    case 'dice':
      return right.kind === 'dice' &&
        left.count === right.count &&
        left.die === right.die;
    case 'flat':
      return right.kind === 'flat' && left.amount === right.amount;
  }
}

function sourceDamageSlots(
  clause: SourceDerivedSaveClause,
  arm: 'failure' | 'success',
): readonly DamageSignatureSlot[] {
  const bySlot = new Map<number, DamageSignature[]>();
  for (const occurrence of clause.damage_occurrences) {
    if (occurrence.arm !== arm) {
      continue;
    }
    const signature = damageSignatureOf(occurrence);
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
  declared: readonly DamageSignature[],
  sourced: readonly DamageSignature[],
): boolean {
  if (declared.length !== sourced.length) {
    return false;
  }
  const assign = (index: number, used: ReadonlySet<number>): boolean => {
    if (index === declared.length) {
      return used.size === sourced.length;
    }
    const signature = declared[index] as DamageSignature;
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
 * Mechanical round-16 baseline over the raw, line-break-flattened whole spell
 * bodies already reviewed in rounds 1-16. Multi-clause spells deliberately
 * repeat one body digest. These constants are independent of the live extract
 * after this one sanctioned initialization.
 */
export const reviewedSpellBodySha256Oracle = Object.freeze({
  acid_splash: '6fcc9844cbd9c7d35fab1473c2c694b9bc8309e46878785457b0163f9d70abea',
  arcane_hand_grasping: '96762412f657cc14213fceac7ce2df803223810fb96f7612d4c03316dd0c9249',
  befuddlement: 'dd30204835bd35abc8621b27f9f2841c49e874c21d1c591591d695cccaebe3ce',
  bestow_curse_damage: '5549e904b1ba6e0dbaf39ff92647f9f295508a1938983cbd6f87ab8a30904008',
  black_tentacles: 'f173705f0bf1818cc3a82eaa1c2f69e96357e0650010f5599cbeaabd7f40b5ee',
  blade_barrier: '21049d1f13bd816425b2b2ae80991d7e9fc10fa2f517bad475402e83b662b62c',
  blight: '48d28383f79556a4c5cf25f605532e3122635a93f715b6a2f65050a8c6565a6b',
  burning_hands: '3c9c56294f19496e0ad3d4a5eafbf85c245ce6edbfb32d59ca2d985adf01e053',
  call_lightning: 'c6a4a0b22788e39bd18ea2ae1c5ba83a6be53471d1a229211a8fd8c26adaeb69',
  chain_lightning: '87253ee4bf738f75c08a0d94caa7ebf0604976b6c824f10ef9cb521c052677b1',
  circle_of_death: 'fe69b61b61392aa195bbe1ca5a8e436385fa9a6ec2969d58bd416cd26ce6aba0',
  cloudkill: '3b12c7a0890321e686704d9d5de90907950d3b38bf47d55bfdfe37011e4fbfb1',
  cone_of_cold: 'c342a44d10a813389364f8afcf437b9c9ad08f06ab3621cbe3fa8637f7319205',
  conjure_animals: 'be2c62ba82b0c0a31553127f9d6e38a3ca739ffdc45b1d9ad3a69d4a3de9347f',
  conjure_celestial: '982854b7a29add28b5c0dbe4360bbd9e4a2392e8a387f6a7b047873b29edc720',
  conjure_elemental_initial: '166ba3dfeb1e10241282f1869d29c88a990bcbf1cf073befd55ef354b0967b7a',
  conjure_elemental_repeat: '166ba3dfeb1e10241282f1869d29c88a990bcbf1cf073befd55ef354b0967b7a',
  conjure_woodland_beings: '44de2bec0df710ea08b8905960361669df63ef5a7184d7c81013b16b0affccd7',
  contagion: '7e0d4e739f5b1eee3e40909e43e2a04d4abaf671ffc56ac08c997e9f63bc0cd8',
  contact_other_plane: '08c876cdba3b61cb2d8230518f448224baafca2d9a111e7bf1311cae9d3131cf',
  control_water: 'fd5cc8d1d6104f7c49394edc03face72e0415caf507aa165d3a1c732bf1a8a89',
  delayed_blast_fireball: 'f3b53ec23d0eaed351716498d23cb0b27f96e298d0d6f901bdd347d0655c3ebe',
  disintegrate: '8755285b18857465d4944b1e1dedd434a24d100bc8c2f91804eb93c3bf07a4cf',
  dissonant_whispers: 'a92a305b16441b878103ff3b888d2bc62b09e33bc73dd1fb36ea21ce0a5f8f0b',
  dragons_breath: '3516f9ae9ff1bb8d6b636ee198d2dda04cbdae7a48166866d8cfb126954253f1',
  dream: '461ece836ff79daa5ffc8057edff609aeed2913c6832a69838729632d9fa4dc4',
  earthquake: '0388c50df840ad18fbb4781cabccd18531badb424a038af10fe4195808d539ea',
  enlarge_reduce_damage: '2bbe8a06e26d21851e0024045e6d815ade42796404a084c0dae75fe5e40b19a4',
  ensnaring_strike: '9b7c5847c4cb4d1ca72f6c5f6bcf7507f1eb58d997ec0d6deec116dc3b359f95',
  faithful_hound: '7564acdcfa8a82d2d377d8d070765a69e9dbaafe9b92a6dfa8badeba8cd4b5a7',
  finger_of_death: 'de6b926cf861790c8df3daf165de5f1b586f44fb0fff6ab5de3d44116b61bcaf',
  fireball: '9b09f4bcb2d1c028aa9ca80fc5f0be522a0266f293131a52f4cb33da98b3aad0',
  fire_storm: '1e60ebac024f986268602bb6159ea9838a84e5170a0b3eed687fe697c55aa75b',
  flame_strike: 'ec9fa2b692871975971cd64717f183084ddaf73f430b4f62be0fb7bee5a06e7c',
  flaming_sphere: '480e214828eaea1de82d2c7ac7f790ee303b09252a60252be2349a4e9e64a65a',
  freezing_sphere: '28ac36c7177aa17fab18488029916475875c9d8cd7ae7421f8b55415d69c6b22',
  geas: '94741b1fa27928815491dc85989efd7f3c38f6bd92113f03b2ea6f9333cae765',
  glyph_of_warding: '4d017bb239074c5bf6749e933bfbb792c6a5c2d55d38cce2f548083b3cab4ed5',
  guardian_of_faith: '8267045493da3a48b51a2749b25101c86e249a7a3a840b0d2df68f21330d8f67',
  harm: 'b9e48cdaa9e9102ecbcf55047dd15fadfe88a514be8ebf04118af5a8f1d94b89',
  hellish_rebuke: 'ae1dff28209fbb12fac7bf86c821b800c9baff93925ea57e8eabe400889e1ba8',
  ice_knife: '383861188637b73cbddbba4e2a412520449040c8c865b0f443c2361ae26bb6b6',
  ice_storm: '5d1b487d3a67e562371b40317077a8d2b01d8ee8b39bd47fb5e247c889a3dbcb',
  incendiary_cloud: '64a15cf0e19b671b913d34d33a36d1f7148fdf2ee43c6fadc3e2ea32b34d3bbd',
  inflict_wounds: '5b52d952d62c1f69fcc9ace40a902e80fe60c8680bda9976aecba9fa014d21a2',
  insect_plague: 'fcd8add2305f95db0951a6c02f7ce36b40bcadbe9e8cfad488b1eecf86df5ae7',
  lightning_bolt: '6296fbe6458db4335010dc61c5b49703f4f3b0a889b2b255b4a009433042ff0f',
  meteor_swarm: '09dbb4cc40dc38eee63401b188aaf782627052e996d41eefd5c5c8b04c36dcfa',
  mind_spike: '29af1a756dccb9939562b179aec0c6cb6873ea33c2407fe83ca8a3f11fa4d683',
  moonbeam: '7e097c45dee6c21d6070bdcfebc7caa412c95ea524553635d4da6a5762663e03',
  phantasmal_force: 'f2e3af69a6a71d6bbabe534e9baf2e37f5e86179f8a707f2e60969d653c04fae',
  phantasmal_killer_initial: 'bbf1a1e068c61e8c37e627a8cabd0aecbae5e49d132f4a916426c29fe70b77c6',
  phantasmal_killer_repeat: 'bbf1a1e068c61e8c37e627a8cabd0aecbae5e49d132f4a916426c29fe70b77c6',
  prismatic_spray: 'bb423f75b10a9aef4a073b116c42a92db0d8823148dc061281a4d12a5dfd560b',
  prismatic_wall: 'e4dfe058faa96f5c61da01c5f13e000b452b75538110a3f15bd2327b39a1664f',
  ray_of_enfeeblement: '925b0f0d2f551c3aaa27f578a7c18232e6a3cce0d875637cda81212ab00a042e',
  sacred_flame: 'ef1bbe697896144b4d93463a16f2d16ca14f6d9155e52fded27fb8960565cbe5',
  searing_smite: 'cc1d6736f2d003f5a01c5dbef78bb42780289e18f9095c34edd70a5f77c7762f',
  shatter: '165bee4a1a1e0c4eb16a26c273bd5a7199599e337f715712b0bff4659820dfe7',
  spirit_guardians: 'c485d7f95ea94a6cb1249de4f67e8893b3264edbffa9d61d34a7e606f7fcb0fa',
  storm_of_vengeance_initial: 'fed02d70c94eef35ac57f89237c94d2ef2d43d735948a5a96bed1eff516c61b9',
  storm_of_vengeance_lightning: 'fed02d70c94eef35ac57f89237c94d2ef2d43d735948a5a96bed1eff516c61b9',
  summon_dragon: '6e875330c4a917cea459e76e643081b725e4a4e29bbac076d652b0d4ee6067c5',
  sunbeam: 'd26533c27463cc66fc6176749ac1e0aec39ab413a1da2ef6c7a85800795c96bc',
  sunburst: '49c40ea5b41e7542d663f331fff41e7da30befe740e7864e8f5188fab13d5a33',
  symbol: '786b56779c8919c7df4a282ae8450c802a58a2e320ba72b7a039bd98960dcfa0',
  thunderwave: '4182b3c9a2cf0f02613e7d0ffbe5e1d2ee8424040ddb6244ee3c935ce7e2bae4',
  tsunami_initial: 'ff61748a3bad0486998a008b8e604a4e8fe137b57e701e588982718142c0275a',
  tsunami_ongoing: 'ff61748a3bad0486998a008b8e604a4e8fe137b57e701e588982718142c0275a',
  vicious_mockery: '9482db95dabf5c8b24ff0b2e24e1246806c1adfc7d76ef3cb00ed31bf111c6ef',
  vitriolic_sphere: '983435ebaee86e9388c5e2443776557359c347cd919c903170b411625f951543',
  wall_of_fire: '8d8e0cb08a822af397cc88781df7ff53313c3d0aa18f7ab14b64c895bbc96228',
  wall_of_ice_initial: '3f35bcb3a649e54b0ce5fb05d6d91b448ea328c339b9fa377aec02e308c8d071',
  wall_of_ice_frigid_air: '3f35bcb3a649e54b0ce5fb05d6d91b448ea328c339b9fa377aec02e308c8d071',
  wall_of_thorns_piercing: 'a88fa17e835d296d735ec52fc9dd883826863acc7d8dfe7eea0cc534aac586d2',
  wall_of_thorns_slashing: 'a88fa17e835d296d735ec52fc9dd883826863acc7d8dfe7eea0cc534aac586d2',
  weird_initial: '97f992ed49d7e742e5f0ef457046895a83fc84d9ceef33d93a8132bb50a37d42',
  weird_repeat: '97f992ed49d7e742e5f0ef457046895a83fc84d9ceef33d93a8132bb50a37d42',
  wind_wall: '3283a491bb0476509d81570578244ee8e3a52e59d5fe3c3d87d086fb2853d227',
} as const satisfies Record<string, string>);

export function normalizeReviewedSpellBody(body: string): string {
  return body.trim().replace(/\s*[\r\n]+\s*/gu, ' ');
}

export function assertReviewedSpellBodyDigest(
  key: keyof typeof reviewedSpellBodySha256Oracle,
  clauseId: SaveSuccessClauseId,
  spellBody: string,
): void {
  const expected = reviewedSpellBodySha256Oracle[key];
  const actual = sha256(normalizeReviewedSpellBody(spellBody));
  if (actual !== expected) {
    throw new TypeError(
      `${clauseId} spell body digest mismatch: expected ${expected}, read ${actual}. Re-decode the clause and update its reviewed values and digest together; do not combine a digest update with parser changes for this clause.`,
    );
  }
}

function reviewedSaveClause(
  oracleKey: keyof typeof reviewedSpellBodySha256Oracle,
  key: string,
  heading: ReviewedBundledSrdHeading,
  discriminator?: SaveClauseDiscriminator,
): ReviewedSaveSuccessClause {
  const derivedSpellSlug = normalizeCatalogKeyComponent(heading);
  const id = saveSuccessClauseId(
    `srd-5.2.1:spell:${derivedSpellSlug}:save:${key}`,
  );
  const spellBody = bundledSpellBodyDigestInputs.get(heading);
  if (spellBody === undefined) {
    throw new TypeError(`${id} has no raw spell body for ${heading}.`);
  }
  assertReviewedSpellBodyDigest(oracleKey, id, spellBody);
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
  const stableKey = sourceStableKey(`srd-5.2.1:spell:${derivedSpellSlug}`);
  const evidence = bundledHeading(heading);
  const fixedSaveDc = sourceClause.fixed_save_dc.status === 'available'
    ? sourceClause.fixed_save_dc.value
    : null;
  const requirements: ReviewedDamageRequirements | undefined = reviewedDamageRequirementsByClause[
    `${derivedSpellSlug}:${key}` as keyof typeof reviewedDamageRequirementsByClause
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
      spell_body_sha256: reviewedSpellBodySha256Oracle[oracleKey],
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
    spell_body_sha256: reviewedSpellBodySha256Oracle[oracleKey],
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
  acid_splash: reviewedSaveClause('acid_splash', 'damage', 'Acid Splash'),
  arcane_hand_grasping: reviewedSaveClause('arcane_hand_grasping', 'grasping-hand-damage', 'Arcane Hand'),
  befuddlement: reviewedSaveClause('befuddlement', 'damage', 'Befuddlement'),
  bestow_curse_damage: reviewedSaveClause('bestow_curse_damage', 'curse-damage', 'Bestow Curse'),
  black_tentacles: reviewedSaveClause('black_tentacles', 'damage', 'Black Tentacles'),
  blade_barrier: reviewedSaveClause('blade_barrier', 'damage', 'Blade Barrier'),
  blight: reviewedSaveClause('blight', 'damage', 'Blight'),
  burning_hands: reviewedSaveClause('burning_hands', 'damage', 'Burning Hands'),
  call_lightning: reviewedSaveClause('call_lightning', 'damage', 'Call Lightning'),
  chain_lightning: reviewedSaveClause('chain_lightning', 'damage', 'Chain Lightning'),
  circle_of_death: reviewedSaveClause('circle_of_death', 'damage', 'Circle of Death'),
  cloudkill: reviewedSaveClause('cloudkill', 'damage', 'Cloudkill'),
  cone_of_cold: reviewedSaveClause('cone_of_cold', 'damage', 'Cone of Cold'),
  conjure_animals: reviewedSaveClause('conjure_animals', 'damage', 'Conjure Animals'),
  conjure_celestial: reviewedSaveClause('conjure_celestial', 'damage', 'Conjure Celestial'),
  conjure_elemental_initial: reviewedSaveClause('conjure_elemental_initial', 'initial-damage', 'Conjure Elemental', { kind: 'damage_signature', dice_count: 8, die_size: 8, damage_type: null }),
  conjure_elemental_repeat: reviewedSaveClause('conjure_elemental_repeat', 'repeat-damage', 'Conjure Elemental', { kind: 'damage_signature', dice_count: 4, die_size: 8, damage_type: null }),
  conjure_woodland_beings: reviewedSaveClause('conjure_woodland_beings', 'damage', 'Conjure Woodland Beings'),
  contagion: reviewedSaveClause('contagion', 'damage', 'Contagion'),
  contact_other_plane: reviewedSaveClause('contact_other_plane', 'damage', 'Contact Other Plane'),
  control_water: reviewedSaveClause('control_water', 'damage', 'Control Water'),
  delayed_blast_fireball: reviewedSaveClause('delayed_blast_fireball', 'damage', 'Delayed Blast Fireball'),
  disintegrate: reviewedSaveClause('disintegrate', 'damage', 'Disintegrate'),
  dissonant_whispers: reviewedSaveClause('dissonant_whispers', 'damage', 'Dissonant Whispers'),
  dragons_breath: reviewedSaveClause('dragons_breath', 'damage', 'Dragon’s Breath'),
  dream: reviewedSaveClause('dream', 'damage', 'Dream'),
  earthquake: reviewedSaveClause('earthquake', 'collapse-damage', 'Earthquake'),
  enlarge_reduce_damage: reviewedSaveClause('enlarge_reduce_damage', 'weapon-damage', 'Enlarge/Reduce'),
  ensnaring_strike: reviewedSaveClause('ensnaring_strike', 'recurring-damage', 'Ensnaring Strike'),
  faithful_hound: reviewedSaveClause('faithful_hound', 'damage', 'Faithful Hound'),
  finger_of_death: reviewedSaveClause('finger_of_death', 'damage', 'Finger of Death'),
  fireball: reviewedSaveClause('fireball', 'damage', 'Fireball'),
  fire_storm: reviewedSaveClause('fire_storm', 'damage', 'Fire Storm'),
  flame_strike: reviewedSaveClause('flame_strike', 'damage', 'Flame Strike'),
  flaming_sphere: reviewedSaveClause('flaming_sphere', 'damage', 'Flaming Sphere'),
  freezing_sphere: reviewedSaveClause('freezing_sphere', 'damage', 'Freezing Sphere'),
  geas: reviewedSaveClause('geas', 'recurring-damage', 'Geas'),
  glyph_of_warding: reviewedSaveClause('glyph_of_warding', 'explosive-runes', 'Glyph of Warding'),
  guardian_of_faith: reviewedSaveClause('guardian_of_faith', 'damage', 'Guardian of Faith'),
  harm: reviewedSaveClause('harm', 'damage', 'Harm'),
  hellish_rebuke: reviewedSaveClause('hellish_rebuke', 'damage', 'Hellish Rebuke'),
  ice_knife: reviewedSaveClause('ice_knife', 'explosion-damage', 'Ice Knife'),
  ice_storm: reviewedSaveClause('ice_storm', 'damage', 'Ice Storm'),
  incendiary_cloud: reviewedSaveClause('incendiary_cloud', 'damage', 'Incendiary Cloud'),
  inflict_wounds: reviewedSaveClause('inflict_wounds', 'damage', 'Inflict Wounds'),
  insect_plague: reviewedSaveClause('insect_plague', 'damage', 'Insect Plague'),
  lightning_bolt: reviewedSaveClause('lightning_bolt', 'damage', 'Lightning Bolt'),
  meteor_swarm: reviewedSaveClause('meteor_swarm', 'damage', 'Meteor Swarm'),
  mind_spike: reviewedSaveClause('mind_spike', 'damage', 'Mind Spike'),
  moonbeam: reviewedSaveClause('moonbeam', 'damage', 'Moonbeam'),
  phantasmal_force: reviewedSaveClause('phantasmal_force', 'recurring-damage', 'Phantasmal Force'),
  phantasmal_killer_initial: reviewedSaveClause('phantasmal_killer_initial', 'initial-damage', 'Phantasmal Killer', { kind: 'source_text', includes: 'Disadvantage on ability checks' }),
  phantasmal_killer_repeat: reviewedSaveClause('phantasmal_killer_repeat', 'repeat-damage', 'Phantasmal Killer', { kind: 'source_text', includes: 'damage again' }),
  prismatic_spray: reviewedSaveClause('prismatic_spray', 'damaging-rays', 'Prismatic Spray'),
  prismatic_wall: reviewedSaveClause('prismatic_wall', 'damaging-layers', 'Prismatic Wall'),
  ray_of_enfeeblement: reviewedSaveClause('ray_of_enfeeblement', 'damage-reduction', 'Ray of Enfeeblement'),
  sacred_flame: reviewedSaveClause('sacred_flame', 'damage', 'Sacred Flame'),
  searing_smite: reviewedSaveClause('searing_smite', 'recurring-damage', 'Searing Smite'),
  shatter: reviewedSaveClause('shatter', 'damage', 'Shatter'),
  spirit_guardians: reviewedSaveClause('spirit_guardians', 'damage', 'Spirit Guardians'),
  storm_of_vengeance_initial: reviewedSaveClause('storm_of_vengeance_initial', 'initial-thunder-damage', 'Storm of Vengeance', { kind: 'ability', ability: 'constitution' }),
  storm_of_vengeance_lightning: reviewedSaveClause('storm_of_vengeance_lightning', 'lightning-damage', 'Storm of Vengeance', { kind: 'ability', ability: 'dexterity' }),
  summon_dragon: reviewedSaveClause('summon_dragon', 'breath-weapon', 'Summon Dragon'),
  sunbeam: reviewedSaveClause('sunbeam', 'damage', 'Sunbeam'),
  sunburst: reviewedSaveClause('sunburst', 'damage', 'Sunburst'),
  symbol: reviewedSaveClause('symbol', 'death-damage', 'Symbol'),
  thunderwave: reviewedSaveClause('thunderwave', 'damage', 'Thunderwave'),
  tsunami_initial: reviewedSaveClause('tsunami_initial', 'initial-damage', 'Tsunami', { kind: 'damage_signature', dice_count: 6, die_size: 10, damage_type: 'Bludgeoning' }),
  tsunami_ongoing: reviewedSaveClause('tsunami_ongoing', 'ongoing-damage', 'Tsunami', { kind: 'damage_signature', dice_count: 5, die_size: 10, damage_type: 'Bludgeoning' }),
  vicious_mockery: reviewedSaveClause('vicious_mockery', 'damage', 'Vicious Mockery'),
  vitriolic_sphere: reviewedSaveClause('vitriolic_sphere', 'damage', 'Vitriolic Sphere'),
  wall_of_fire: reviewedSaveClause('wall_of_fire', 'damage', 'Wall of Fire'),
  wall_of_ice_initial: reviewedSaveClause('wall_of_ice_initial', 'initial-damage', 'Wall of Ice', { kind: 'ability', ability: 'dexterity' }),
  wall_of_ice_frigid_air: reviewedSaveClause('wall_of_ice_frigid_air', 'frigid-air-damage', 'Wall of Ice', { kind: 'ability', ability: 'constitution' }),
  wall_of_thorns_piercing: reviewedSaveClause('wall_of_thorns_piercing', 'piercing-damage', 'Wall of Thorns', { kind: 'damage_signature', dice_count: 7, die_size: 8, damage_type: 'Piercing' }),
  wall_of_thorns_slashing: reviewedSaveClause('wall_of_thorns_slashing', 'slashing-damage', 'Wall of Thorns', { kind: 'damage_signature', dice_count: 7, die_size: 8, damage_type: 'Slashing' }),
  weird_initial: reviewedSaveClause('weird_initial', 'initial-damage', 'Weird', { kind: 'damage_signature', dice_count: 10, die_size: 10, damage_type: 'Psychic' }),
  weird_repeat: reviewedSaveClause('weird_repeat', 'repeat-damage', 'Weird', { kind: 'damage_signature', dice_count: 5, die_size: 10, damage_type: 'Psychic' }),
  wind_wall: reviewedSaveClause('wind_wall', 'damage', 'Wind Wall'),
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
> = runtimeReadonlyMap(
  Object.values(reviewedSaveSuccessClauses).map((clause) => {
    const frozenClause = deepFreeze(clause);
    return [frozenClause.id, frozenClause] as const;
  }),
);

function samePublicSource(left: PublicSourceRef, right: PublicSourceRef): boolean {
  const leftSnapshot = snapshotPublicSourceRef(left);
  const rightSnapshot = snapshotPublicSourceRef(right);
  if (
    leftSnapshot.kind !== rightSnapshot.kind ||
    leftSnapshot.path !== rightSnapshot.path
  ) {
    return false;
  }
  return leftSnapshot.kind === 'project_owned' ||
    (rightSnapshot.kind === 'bundled_srd' &&
      leftSnapshot.heading === rightSnapshot.heading);
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
  /**
   * A supplied pool carries the same two arms the declared signatures do, so
   * the matcher below can never ask a flat pool for its die size.
   */
  type SuppliedAmount =
    | { readonly kind: 'dice'; readonly die: number; readonly amount: number }
    | { readonly kind: 'flat'; readonly amount: number };
  type SuppliedPool = SuppliedAmount & {
    readonly instance_index: number;
    readonly damage_type: string;
  };
  const suppliedAmount = (component: DamageComponent): SuppliedAmount => {
    switch (component.kind) {
      case 'dice':
        return {
          kind: 'dice',
          die: component.pool.die,
          amount: component.pool.count,
        };
      case 'flat':
        return { kind: 'flat', amount: component.modifier };
    }
  };
  const suppliedByKey = new Map<string, SuppliedPool>();
  for (const [instanceIndex, instance] of damage.entries()) {
    for (const component of instance.components) {
      const supply = suppliedAmount(component);
      const key = JSON.stringify([
        instanceIndex,
        instance.damage_type,
        supply.kind,
        supply.kind === 'dice' ? supply.die : null,
      ]);
      const existing = suppliedByKey.get(key);
      suppliedByKey.set(key, {
        ...supply,
        instance_index: instanceIndex,
        damage_type: instance.damage_type,
        amount: (existing?.amount ?? 0) + supply.amount,
      });
    }
  }
  const supplied = [...suppliedByKey.values()];
  /**
   * Never null now: a two-arm signature always carries exactly one amount.
   * The old `dice_count ?? flat_modifier` could return null for the all-null
   * record the parser never emitted, and the caller had to skip it.
   */
  const requiredAmount = (signature: DamageSignature): number => {
    switch (signature.kind) {
      case 'dice':
        return signature.count;
      case 'flat':
        return signature.amount;
    }
  };
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
        for (const [localIndex, pool] of instancePools.entries()) {
          const kindMatches = signature.kind === 'dice'
            ? pool.kind === 'dice' && signature.die === pool.die
            : pool.kind === 'flat';
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
  const matches = sameSourceRef(expected.effect_source, effect) &&
    samePublicSource(evidence, expected.evidence) &&
    sameSavingThrowDamageDuration(duration, expected.duration) &&
    sameEventFrequency(frequency, expected.frequency) &&
    damageMatchesSourceClause(
      effect,
      damage,
      expected.failed_damage_signature_slots,
      expected.failed_damage_roll_slot_groups,
      expected.failed_damage_slot_repetitions,
    );
  return matches
    ? `Registered clause ${clauseId} requires a saving throw and cannot authorize a final automatic-damage fold.`
    : genericReason;
}

export type RegisteredAttackRollClause = {
  readonly source: SourceRef & { readonly kind: 'character_weapon' };
  readonly evidence: PublicSourceRef;
};

const registeredAttackRollClauseBacking = new Map<
  AttackRollClauseId,
  RegisteredAttackRollClause
>();
export const registeredAttackRollClauses: ReadonlyMap<
  AttackRollClauseId,
  RegisteredAttackRollClause
> = runtimeReadonlyMapView(registeredAttackRollClauseBacking);

/**
 * Character weapons are the current non-spell attack origin. Their app-layer
 * assembler must take this route before it can build an attack event; spell
 * attacks will need a separately reviewed spell-clause route when introduced.
 * This probability layer has no character repository or weapon-catalog handle,
 * so the caller must establish that `weapon_id` exists before registration.
 * Registration binds a one-pass snapshot of that trusted character weapon
 * identity; later changes to the caller object cannot split the clause ID from
 * the stored source. It does not try to replace the sheet assembler's
 * caller-supplied attack arithmetic. SourceRef is a value object, so an equal
 * structural copy remains indistinguishable from the caller's original value.
 * Weapon damage amounts share the already-declared caller-trust boundary with
 * the caller-supplied attack bonus, after both have been snapshotted at entry.
 */
export function registerCharacterWeaponAttackClause(
  source: SourceRef & { readonly kind: 'character_weapon' },
): {
  readonly attack_roll_clause_id: AttackRollClauseId;
  readonly attack_roll_evidence: PublicSourceRef;
} {
  const sourceSnapshot = snapshotSourceRef(source);
  if (sourceSnapshot.kind !== 'character_weapon') {
    throw new TypeError('Only character weapons can use the weapon attack registration route.');
  }
  const clauseId = (
    `character-weapon:${String(sourceSnapshot.weapon_id)}:${encodeURIComponent(sourceSnapshot.stable_key)}:attack-roll`
  ) as AttackRollClauseId;
  const evidence = publicProbabilityCoverageManifest.attack_roll;
  const existing = registeredAttackRollClauseBacking.get(clauseId);
  if (existing !== undefined && !sameSourceRef(existing.source, sourceSnapshot)) {
    throw new TypeError('Attack-roll clause identity collides with another weapon source.');
  }
  const registeredClause = deepFreeze({
    source: sourceSnapshot,
    evidence,
  });
  registeredAttackRollClauseBacking.set(clauseId, registeredClause);
  return {
    attack_roll_clause_id: clauseId,
    attack_roll_evidence: evidence,
  };
}

/**
 * SourceRef carries value identity only: an equal structural copy cannot be
 * distinguished here. Weapon damage arithmetic, like attack bonus, is the
 * character assembler's declared caller-trust boundary. Riders stay closed
 * until a reviewed, content-derived registration can bind their formulas.
 */
export function attackDamageSourcesFailureReason(
  attackSource: SourceRef,
  damage: readonly AttackDamageInstance[],
): string | null {
  const sourceSnapshot = snapshotSourceRef(attackSource);
  const damageCount = damage.length;
  if (!Number.isSafeInteger(damageCount) || damageCount < 0) {
    throw new TypeError('Attack damage instances must have a valid length.');
  }
  const damageSources: SourceRef[] = [];
  for (let index = 0; index < damageCount; index += 1) {
    const instance = damage[index] as AttackDamageInstance;
    const instanceSource = instance.source;
    damageSources.push(snapshotSourceRef(instanceSource));
  }
  for (const damageSource of damageSources) {
    if (!sameSourceRef(damageSource, sourceSnapshot)) {
      return 'Every attack damage instance must use the attack event source; unreviewed rider sources are unavailable.';
    }
  }
  return null;
}

export function attackRollEvidenceFailureReason(
  source: SourceRef,
  clauseId: AttackRollClauseId | undefined,
  evidence: PublicSourceRef | undefined,
): string | null {
  const expected = clauseId === undefined
    ? undefined
    : registeredAttackRollClauses.get(clauseId);
  const genericReason = 'The cited evidence does not establish this attack-roll clause.';
  return expected !== undefined && evidence !== undefined &&
    sameSourceRef(expected.source, source) &&
    samePublicSource(expected.evidence, evidence)
    ? null
    : genericReason;
}

export const expandedCriticalHitEvidenceManifest: ReadonlyMap<
  number,
  PublicSourceRef
> = runtimeReadonlyMap([
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

const damageNeutralityEvidenceManifest = runtimeReadonlyMap([
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

type ResourceRecoverySourceSpanSpec = {
  readonly start: string;
  readonly end: string;
  readonly column_start: number;
  readonly column_end: number | undefined;
};

const reviewedResourceRecoverySourceSpanSpecs = {
  rage: {
    start: 'You regain one ex-',
    end: 'Rest.',
    column_start: 68,
    column_end: undefined,
  },
  channel_divinity: {
    start: 'You regain one of its expended uses when you finish',
    end: 'Long Rest.',
    column_start: 64,
    column_end: undefined,
  },
  sorcerous_restoration: {
    start: 'When you finish a Short Rest, you can regain ex-',
    end: 'finish a Long Rest.',
    column_start: 63,
    column_end: undefined,
  },
  font_of_magic: {
    start: 'You regain all ex-',
    end: 'Long Rest.',
    column_start: 0,
    column_end: 59,
  },
} as const satisfies Record<
  ReviewedResourceRecoveryRow,
  ResourceRecoverySourceSpanSpec
>;

function resourceRecoverySourceSpan(
  source: string,
  row: ReviewedResourceRecoveryRow,
): string {
  const spec = reviewedResourceRecoverySourceSpanSpecs[row];
  const lines = source.split(/\r?\n/u);
  const firstLine = lines.findIndex((line) => line.includes(spec.start));
  const lastLine = lines.findIndex((line, index) =>
    index >= firstLine && line.includes(spec.end),
  );
  if (firstLine < 0 || lastLine < firstLine) {
    throw new TypeError(
      `${row} resource-recovery source span drift: its reviewed anchors are missing.`,
    );
  }
  const columnSpan = lines.slice(firstLine, lastLine + 1)
    .map((line) => line.slice(spec.column_start, spec.column_end).trim())
    .filter((line) => line.length > 0)
    .join(' ');
  const start = columnSpan.indexOf(spec.start);
  const end = columnSpan.indexOf(spec.end, start);
  if (start < 0 || end < start) {
    throw new TypeError(
      `${row} resource-recovery source span drift: its reviewed column slice is missing.`,
    );
  }
  return columnSpan.slice(start, end + spec.end.length);
}

/** This is the load-time guard; tests pass altered source copies through it. */
export function assertReviewedResourceRecoverySourceDigests(
  source: string,
): void {
  for (const row of Object.keys(
    reviewedResourceRecoverySourceSpanSpecs,
  ) as ReviewedResourceRecoveryRow[]) {
    const expected = reviewedResourceRecoverySourceSha256Oracle[row];
    const actual = sha256(resourceRecoverySourceSpan(source, row));
    if (actual !== expected) {
      throw new TypeError(
        `${row} resource-recovery source span drift: expected ${expected}, read ${actual}. Re-review the row semantics and digest together.`,
      );
    }
  }
}

assertReviewedResourceRecoverySourceDigests(bundledSrd521);

// A set-equality assertion at runtime complements the `satisfies` compile gate.
export function probabilityManifestIsComplete(): boolean {
  return (
    Object.keys(publicProbabilityCoverageManifest).length ===
      publicProbabilityMechanicKinds.length &&
    unmodelledIssueKinds.length === Object.keys(unmodelledIssuePriority).length
  );
}
