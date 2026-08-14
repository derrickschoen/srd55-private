import type { SheetGap } from '../queries/character-sheet-builder';
import type { SheetWarning } from '../rules/sheet';
import bundledSrd521 from '../../docs/srd/full/srd-5.2.1.txt?raw';
import {
  BUNDLED_SRD_5_2_1_PATH,
  resourceRecoveryClauseId,
  saveSuccessClauseId,
  sourceStableKey,
  unmodelledIssueKinds,
  unmodelledIssueId,
  type BundledSrdHeading,
  type CriticalHitRule,
  type DamageNeutralMechanicId,
  type DamageNeutralityEvidence,
  type PublicSourceRef,
  type ResourceRecoveryClauseId,
  type ResourceRecoveryEvidence,
  type SaveSuccessClauseId,
  type SaveSuccessOutcome,
  type SourceRef,
  type SourceStableKey,
  type UnmodelledIssue,
  type UnmodelledIssueKind,
} from './contracts';

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
  'Befuddlement',
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
  'Faithful Hound',
  'Finger of Death',
  'Fireball',
  'Fire Storm',
  'Flame Strike',
  'Flaming Sphere',
  'Freezing Sphere',
  'Glyph of Warding',
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
  'Prismatic Spray',
  'Prismatic Wall',
  'Resistance and Vulnerability',
  'Rolling 20 or 1',
  'Sacred Flame',
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
  readonly effect_stable_key: SourceStableKey;
  readonly kind: SaveSuccessOutcome['kind'];
  readonly evidence: PublicSourceRef;
};

function reviewedSaveClause(
  key: string,
  spellSlug: string,
  heading: ReviewedBundledSrdHeading,
  kind: SaveSuccessOutcome['kind'],
): ReviewedSaveSuccessClause {
  return {
    id: saveSuccessClauseId(`srd-5.2.1:spell:${spellSlug}:save:${key}`),
    effect_stable_key: sourceStableKey(`srd-5.2.1:spell:${spellSlug}`),
    kind,
    evidence: bundledHeading(heading),
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
  acid_splash: reviewedSaveClause('damage', 'acid-splash', 'Acid Splash', 'none'),
  befuddlement: reviewedSaveClause('damage', 'befuddlement', 'Befuddlement', 'half'),
  black_tentacles: reviewedSaveClause('damage', 'black-tentacles', 'Black Tentacles', 'none'),
  blade_barrier: reviewedSaveClause('damage', 'blade-barrier', 'Blade Barrier', 'half'),
  blight: reviewedSaveClause('damage', 'blight', 'Blight', 'half'),
  burning_hands: reviewedSaveClause('damage', 'burning-hands', 'Burning Hands', 'half'),
  call_lightning: reviewedSaveClause('damage', 'call-lightning', 'Call Lightning', 'half'),
  chain_lightning: reviewedSaveClause('damage', 'chain-lightning', 'Chain Lightning', 'half'),
  circle_of_death: reviewedSaveClause('damage', 'circle-of-death', 'Circle of Death', 'half'),
  cloudkill: reviewedSaveClause('damage', 'cloudkill', 'Cloudkill', 'half'),
  cone_of_cold: reviewedSaveClause('damage', 'cone-of-cold', 'Cone of Cold', 'half'),
  conjure_animals: reviewedSaveClause('damage', 'conjure-animals', 'Conjure Animals', 'none'),
  conjure_celestial: reviewedSaveClause('damage', 'conjure-celestial', 'Conjure Celestial', 'half'),
  conjure_elemental_initial: reviewedSaveClause('initial-damage', 'conjure-elemental', 'Conjure Elemental', 'none'),
  conjure_elemental_repeat: reviewedSaveClause('repeat-damage', 'conjure-elemental', 'Conjure Elemental', 'none'),
  conjure_woodland_beings: reviewedSaveClause('damage', 'conjure-woodland-beings', 'Conjure Woodland Beings', 'half'),
  contagion: reviewedSaveClause('damage', 'contagion', 'Contagion', 'none'),
  contact_other_plane: reviewedSaveClause('damage', 'contact-other-plane', 'Contact Other Plane', 'none'),
  control_water: reviewedSaveClause('damage', 'control-water', 'Control Water', 'half'),
  delayed_blast_fireball: reviewedSaveClause('damage', 'delayed-blast-fireball', 'Delayed Blast Fireball', 'half'),
  disintegrate: reviewedSaveClause('damage', 'disintegrate', 'Disintegrate', 'none'),
  dissonant_whispers: reviewedSaveClause('damage', 'dissonant-whispers', 'Dissonant Whispers', 'half'),
  dragons_breath: reviewedSaveClause('damage', 'dragon-s-breath', 'Dragon’s Breath', 'half'),
  dream: reviewedSaveClause('damage', 'dream', 'Dream', 'none'),
  earthquake: reviewedSaveClause('collapse-damage', 'earthquake', 'Earthquake', 'half'),
  faithful_hound: reviewedSaveClause('damage', 'faithful-hound', 'Faithful Hound', 'none'),
  finger_of_death: reviewedSaveClause('damage', 'finger-of-death', 'Finger of Death', 'half'),
  fireball: reviewedSaveClause('damage', 'fireball', 'Fireball', 'half'),
  fire_storm: reviewedSaveClause('damage', 'fire-storm', 'Fire Storm', 'half'),
  flame_strike: reviewedSaveClause('damage', 'flame-strike', 'Flame Strike', 'half'),
  flaming_sphere: reviewedSaveClause('damage', 'flaming-sphere', 'Flaming Sphere', 'half'),
  freezing_sphere: reviewedSaveClause('damage', 'freezing-sphere', 'Freezing Sphere', 'half'),
  glyph_of_warding: reviewedSaveClause('explosive-runes', 'glyph-of-warding', 'Glyph of Warding', 'half'),
  guardian_of_faith: reviewedSaveClause('damage', 'guardian-of-faith', 'Guardian of Faith', 'half'),
  harm: reviewedSaveClause('damage', 'harm', 'Harm', 'half'),
  hellish_rebuke: reviewedSaveClause('damage', 'hellish-rebuke', 'Hellish Rebuke', 'half'),
  ice_knife: reviewedSaveClause('explosion-damage', 'ice-knife', 'Ice Knife', 'none'),
  ice_storm: reviewedSaveClause('damage', 'ice-storm', 'Ice Storm', 'half'),
  incendiary_cloud: reviewedSaveClause('damage', 'incendiary-cloud', 'Incendiary Cloud', 'half'),
  inflict_wounds: reviewedSaveClause('damage', 'inflict-wounds', 'Inflict Wounds', 'half'),
  insect_plague: reviewedSaveClause('damage', 'insect-plague', 'Insect Plague', 'half'),
  lightning_bolt: reviewedSaveClause('damage', 'lightning-bolt', 'Lightning Bolt', 'half'),
  meteor_swarm: reviewedSaveClause('damage', 'meteor-swarm', 'Meteor Swarm', 'half'),
  mind_spike: reviewedSaveClause('damage', 'mind-spike', 'Mind Spike', 'half'),
  moonbeam: reviewedSaveClause('damage', 'moonbeam', 'Moonbeam', 'half'),
  phantasmal_killer_initial: reviewedSaveClause('initial-damage', 'phantasmal-killer', 'Phantasmal Killer', 'half'),
  phantasmal_killer_repeat: reviewedSaveClause('repeat-damage', 'phantasmal-killer', 'Phantasmal Killer', 'none'),
  prismatic_spray: reviewedSaveClause('damaging-rays', 'prismatic-spray', 'Prismatic Spray', 'half'),
  prismatic_wall: reviewedSaveClause('damaging-layers', 'prismatic-wall', 'Prismatic Wall', 'half'),
  sacred_flame: reviewedSaveClause('damage', 'sacred-flame', 'Sacred Flame', 'none'),
  shatter: reviewedSaveClause('damage', 'shatter', 'Shatter', 'half'),
  spirit_guardians: reviewedSaveClause('damage', 'spirit-guardians', 'Spirit Guardians', 'half'),
  storm_of_vengeance_initial: reviewedSaveClause('initial-thunder-damage', 'storm-of-vengeance', 'Storm of Vengeance', 'none'),
  storm_of_vengeance_lightning: reviewedSaveClause('lightning-damage', 'storm-of-vengeance', 'Storm of Vengeance', 'half'),
  summon_dragon: reviewedSaveClause('breath-weapon', 'summon-dragon', 'Summon Dragon', 'half'),
  sunbeam: reviewedSaveClause('damage', 'sunbeam', 'Sunbeam', 'half'),
  sunburst: reviewedSaveClause('damage', 'sunburst', 'Sunburst', 'half'),
  symbol: reviewedSaveClause('death-damage', 'symbol', 'Symbol', 'half'),
  thunderwave: reviewedSaveClause('damage', 'thunderwave', 'Thunderwave', 'half'),
  tsunami_initial: reviewedSaveClause('initial-damage', 'tsunami', 'Tsunami', 'half'),
  tsunami_ongoing: reviewedSaveClause('ongoing-damage', 'tsunami', 'Tsunami', 'none'),
  vicious_mockery: reviewedSaveClause('damage', 'vicious-mockery', 'Vicious Mockery', 'none'),
  vitriolic_sphere: reviewedSaveClause('damage', 'vitriolic-sphere', 'Vitriolic Sphere', 'sourced_damage'),
  wall_of_fire: reviewedSaveClause('damage', 'wall-of-fire', 'Wall of Fire', 'half'),
  wall_of_ice_initial: reviewedSaveClause('initial-damage', 'wall-of-ice', 'Wall of Ice', 'half'),
  wall_of_ice_frigid_air: reviewedSaveClause('frigid-air-damage', 'wall-of-ice', 'Wall of Ice', 'half'),
  wall_of_thorns_piercing: reviewedSaveClause('piercing-damage', 'wall-of-thorns', 'Wall of Thorns', 'half'),
  wall_of_thorns_slashing: reviewedSaveClause('slashing-damage', 'wall-of-thorns', 'Wall of Thorns', 'half'),
  weird_initial: reviewedSaveClause('initial-damage', 'weird', 'Weird', 'half'),
  weird_repeat: reviewedSaveClause('repeat-damage', 'weird', 'Weird', 'none'),
  wind_wall: reviewedSaveClause('damage', 'wind-wall', 'Wind Wall', 'half'),
} as const satisfies Record<string, ReviewedSaveSuccessClause>;

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

/**
 * A general saving-throw rule does not establish an individual effect's
 * success clause. Only reviewed, code-owned entries may authorize a numeric
 * success arm; an empty arm remains explicitly unsupported.
 */
export function saveSuccessOutcomeHasEvidence(
  effect: SourceRef,
  clauseId: SaveSuccessClauseId,
  outcome: SaveSuccessOutcome,
): boolean {
  const expected = saveSuccessOutcomeEvidenceManifest.get(clauseId);
  return expected !== undefined &&
    expected.effect_stable_key === effect.stable_key &&
    expected.kind === outcome.kind &&
    samePublicSource(outcome.evidence, expected.evidence);
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
  readonly resource_stable_key: SourceStableKey;
  readonly citation: PublicSourceRef;
};

function reviewedResourceRecoveryClause(
  id: string,
  resourceStableKey: string,
  heading: ReviewedBundledSrdHeading,
): ReviewedResourceRecoveryClause {
  return {
    id: resourceRecoveryClauseId(id),
    resource_stable_key: sourceStableKey(resourceStableKey),
    citation: bundledHeading(heading),
  };
}

export const reviewedResourceRecoveryClauses = {
  rage: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:barbarian:rage:recovery',
    'srd-5.2.1:class:barbarian:rage',
    'Level 1: Rage',
  ),
  channel_divinity: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:cleric:channel-divinity:recovery',
    'srd-5.2.1:class:cleric:channel-divinity',
    'Level 2: Channel Divinity',
  ),
  sorcerous_restoration: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:sorcerer:sorcery-points:sorcerous-restoration',
    'srd-5.2.1:class:sorcerer:sorcery-points',
    'Level 5: Sorcerous Restoration',
  ),
  font_of_magic: reviewedResourceRecoveryClause(
    'srd-5.2.1:class:sorcerer:sorcery-points:long-rest-recovery',
    'srd-5.2.1:class:sorcerer:sorcery-points',
    'Level 2: Font of Magic',
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
): ResourceRecoveryEvidence {
  const clause = resourceRecoveryEvidenceManifest.get(clauseId);
  if (
    clause === undefined ||
    clause.resource_stable_key !== resourceSource.stable_key
  ) {
    throw new TypeError(
      'Resource-recovery evidence does not establish recovery for this resource source.',
    );
  }
  return {
    clause_id: clause.id,
    resource_source: resourceSource,
    citation: clause.citation,
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
