import type { SheetGap } from '../queries/character-sheet-builder';
import type { SheetWarning } from '../rules/sheet';
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
  readonly kind: SaveSuccessOutcome['kind'];
  readonly evidence: PublicSourceRef;
  readonly source_span: string;
  readonly ability: Ability;
  readonly failed_damage_signatures: readonly FailedDamageSignature[];
};

type FailedDamageSignature = {
  readonly damage_type: DamageType | null;
  readonly dice_count: number | null;
  readonly die_size: number | null;
  readonly flat_modifier: number | null;
};

type SourceDerivedSaveClause = {
  readonly span: string;
  readonly ability: Ability;
  readonly kind: SaveSuccessOutcome['kind'];
  readonly failed_damage_signatures: readonly FailedDamageSignature[];
};

export type SourceDerivedSaveDamageCandidate = SourceDerivedSaveClause & {
  readonly heading: string;
};

type SaveClauseDiscriminator =
  | { readonly kind: 'ability'; readonly ability: Ability }
  | {
      readonly kind: 'damage_signature';
      readonly dice_count: number;
      readonly die_size: number;
      readonly damage_type: DamageType | null;
    }
  | { readonly kind: 'source_text'; readonly includes: string };

const abilityBySourceName = {
  Strength: 'strength',
  Dexterity: 'dexterity',
  Constitution: 'constitution',
  Intelligence: 'intelligence',
  Wisdom: 'wisdom',
  Charisma: 'charisma',
} as const satisfies Record<string, Ability>;

const damageTypeNames = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
] as const satisfies readonly DamageType[];

function spellDescriptionsByHeading(): ReadonlyMap<string, string> {
  const lines = bundledSpellDescriptions.split('\n');
  const metadata = /^\s*(?:Level [1-9] (?:Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation)|(?:Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation) Cantrip) \(/u;
  const pageMarker = /^=== SRD/u;
  const starts = lines.flatMap((line, index) => metadata.test(line) ? [index] : []);
  const previousContent = (before: number): number => {
    for (let index = before - 1; index >= 0; index -= 1) {
      const line = lines[index] ?? '';
      if (line.trim() !== '' && !pageMarker.test(line)) {
        return index;
      }
    }
    throw new TypeError('Bundled spell metadata has no preceding heading.');
  };
  return new Map(starts.map((start, position) => {
    const headingIndex = previousContent(start);
    const end = position + 1 < starts.length
      ? previousContent(starts[position + 1] as number)
      : lines.length;
    return [
      (lines[headingIndex] ?? '').trim(),
      lines.slice(start, end)
        .filter((line) => !pageMarker.test(line))
        .join(' ')
        .replace(/-\s+/gu, '')
        .replace(/\s+/gu, ' ')
        .trim(),
    ];
  }));
}

function sourceAbility(span: string, fallback: Ability | null): Ability {
  const match = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: \([^)]*\))? (?:saving throw|Saving Throw:)/u.exec(span);
  const name = match?.[1];
  if (name !== undefined && Object.hasOwn(abilityBySourceName, name)) {
    return abilityBySourceName[name as keyof typeof abilityBySourceName];
  }
  if (fallback !== null) {
    return fallback;
  }
  throw new TypeError(`Could not derive a save ability from: ${span}`);
}

function sourceDamageSignatures(span: string): readonly FailedDamageSignature[] {
  const signatures: FailedDamageSignature[] = [];
  const dicePattern = /(\d+)d(\d+)(?:\s*\+\s*(\d+))?[^.]{0,55}?\b(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder) damage/giu;
  for (const match of span.matchAll(dicePattern)) {
    signatures.push({
      dice_count: Number(match[1]),
      die_size: Number(match[2]),
      flat_modifier: match[3] === undefined ? null : Number(match[3]),
      damage_type: match[4] as DamageType,
    });
  }
  const flatPattern = /\b(\d+) (Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder) damage/giu;
  for (const match of span.matchAll(flatPattern)) {
    if (!span.slice(Math.max(0, (match.index ?? 0) - 3), match.index).includes('d')) {
      signatures.push({
        dice_count: null,
        die_size: null,
        flat_modifier: Number(match[1]),
        damage_type: match[2] as DamageType,
      });
    }
  }
  const reverseDicePattern = /\b(Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder) damage[^.]{0,80}?(\d+)d(\d+)(?:\s*\+\s*(\d+))?/giu;
  for (const match of span.matchAll(reverseDicePattern)) {
    signatures.push({
      dice_count: Number(match[2]),
      die_size: Number(match[3]),
      flat_modifier: match[4] === undefined ? null : Number(match[4]),
      damage_type: match[1] as DamageType,
    });
  }
  if (signatures.length === 0 && /\d+d\d+[^.]{0,70}?damage of (?:the|a) [^.]+ type/iu.test(span)) {
    const dice = /(\d+)d(\d+)/u.exec(span);
    signatures.push({
      dice_count: dice === null ? null : Number(dice[1]),
      die_size: dice === null ? null : Number(dice[2]),
      flat_modifier: null,
      damage_type: null,
    });
  }
  if (signatures.length === 0) {
    const dice = /(\d+)d(\d+)[^.]{0,80}?damage/iu.exec(span);
    if (dice !== null) {
      signatures.push({
        dice_count: Number(dice[1]),
        die_size: Number(dice[2]),
        flat_modifier: null,
        damage_type: null,
      });
    }
  }
  return signatures;
}

function directFailureDamageSpan(span: string): string {
  const sentences = span.match(/[^.!?]+[.!?]/gu) ?? [span];
  const relevant = sentences.find((sentence) =>
    /(?:failed save|Failure:|saving throw[^.]{0,160}?or take|taking [^.]{0,160}?damage on (?:a )?failed save)/iu.test(sentence) &&
    /(?:\d+d\d+|\b\d+\b)[^.]{0,100}?damage|damage[^.]{0,100}?(?:\d+d\d+|\b\d+\b)/iu.test(sentence),
  );
  return relevant ?? span;
}

function directDamageSaveClauses(body: string): SourceDerivedSaveClause[] {
  const explicitSave = /\b(?:(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: \([^)]*\))? (?:saving throw|Saving Throw:)|repeats? (?:that|the) save|repeats the save)/giu;
  const matches = [...body.matchAll(explicitSave)];
  const clauses: SourceDerivedSaveClause[] = [];
  let inheritedAbility: Ability | null = null;
  let inheritedDamageSignatures: readonly FailedDamageSignature[] = [];
  for (const [index, match] of matches.entries()) {
    const start = body.lastIndexOf('.', match.index ?? 0) + 1;
    const next = matches[index + 1]?.index ?? body.length;
    const span = body.slice(start, next).trim();
    inheritedAbility = sourceAbility(span, inheritedAbility);
    const repeatsDamage = /(?:takes?|deals?) (?:the )?[A-Za-z]+ damage again/iu.test(span);
    const directDamage = /(?:failed save|Failure:|saving throw[^.]{0,140}?or take|taking [^.]{0,140}?damage on (?:a )?failed save)[\s\S]{0,240}?(?:\d+d\d+|\b\d+\b)[^.]{0,90}?damage|(?:\d+d\d+|\b\d+\b)[^.]{0,90}?damage[^.]{0,120}?(?:failed save|Failure:)/iu.test(span) ||
      (repeatsDamage && inheritedDamageSignatures.length > 0);
    if (!directDamage) {
      continue;
    }
    const kind: SaveSuccessOutcome['kind'] = /half the initial damage only/iu.test(span)
      ? 'sourced_damage'
      : /half (?:as much|the initial) damage|half damage/iu.test(span)
        ? 'half'
        : 'none';
    const signatures = sourceDamageSignatures(directFailureDamageSpan(span));
    const failedDamageSignatures = signatures.length === 0 && repeatsDamage
      ? inheritedDamageSignatures
      : signatures;
    clauses.push({
      span,
      ability: inheritedAbility,
      kind,
      failed_damage_signatures: failedDamageSignatures,
    });
    inheritedDamageSignatures = failedDamageSignatures;
  }
  return clauses;
}

function gateDamageSaveClause(body: string): SourceDerivedSaveClause | null {
  const gatePatterns = [
    /[^.]*Dexterity saving throw[^.]*Grappled[^.]*\.[\s\S]{0,240}?grapples[^.]*damage[^.]*4d6[^.]*\./iu,
    /[^.]*must succeed on a Wisdom saving throw or become cursed[\s\S]{0,520}?extra 1d8 Necrotic damage[^.]*\./iu,
    /[^.]*Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell has no effect[\s\S]{0,1500}?(?:extra 1d4 damage|1d4[^.]*less damage)[^.]*\./iu,
    /[^.]*Strength saving throw[\s\S]{0,260}?successful save[^.]*spell ends[\s\S]{0,180}?While Restrained[^.]*1d6 Piercing damage[^.]*\./iu,
    /[^.]*Wisdom saving throw or have the Charmed condition[\s\S]{0,260}?While Charmed[^.]*5d10 Psychic damage[^.]*\./iu,
    /[^.]*Intelligence saving throw[\s\S]{0,900}?affected target[\s\S]{0,420}?2d8 Psychic damage[^.]*\./iu,
    /[^.]*Constitution saving throw[\s\S]{0,360}?subtracts 1d8 from all its damage rolls[^.]*\./iu,
    /[^.]*1d6 Fire damage[\s\S]{0,220}?start of each of its turns[\s\S]{0,180}?Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell ends[^.]*\./iu,
  ];
  for (const pattern of gatePatterns) {
    const match = pattern.exec(body);
    if (match !== null) {
      const span = match[0].trim();
      return {
        span,
        ability: sourceAbility(span, null),
        kind: 'none',
        failed_damage_signatures: sourceDamageSignatures(span),
      };
    }
  }
  return null;
}

const bundledSpellBodies = spellDescriptionsByHeading();
const sourceDerivedSaveClauses = new Map<string, readonly SourceDerivedSaveClause[]>();
let rawSourceDerivedSaveDamageCandidateCount = 0;
for (const [heading, body] of bundledSpellBodies) {
  const direct = directDamageSaveClauses(body);
  const gate = gateDamageSaveClause(body);
  rawSourceDerivedSaveDamageCandidateCount += direct.length + (gate === null ? 0 : 1);
  // These two gate patterns rediscover the same save already owned by the
  // direct predicate. Direct owns them; retaining both would manufacture two
  // candidates from one source clause.
  const directOwnsGate = heading === 'Ensnaring Strike' ||
    heading === 'Ray of Enfeeblement';
  sourceDerivedSaveClauses.set(
    heading,
    gate === null || directOwnsGate ? direct : [...direct, gate].sort(
      (left, right) => body.indexOf(left.span) - body.indexOf(right.span),
    ),
  );
}

export const sourceDerivedSaveDamageCandidateCounts = Object.freeze({
  before_deduplication: rawSourceDerivedSaveDamageCandidateCount,
  after_deduplication: [...sourceDerivedSaveClauses.values()].reduce(
    (count, clauses) => count + clauses.length,
    0,
  ),
});

export const sourceDerivedSaveDamageCandidates = Object.freeze(
  [...sourceDerivedSaveClauses.entries()].flatMap(([heading, clauses]) =>
    clauses.map((clause) => Object.freeze({ heading, ...clause })),
  ),
) satisfies readonly SourceDerivedSaveDamageCandidate[];

const nextSourceClauseByHeading = new Map<string, number>();

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

function reviewedSaveClause(
  key: string,
  spellSlug: string,
  heading: ReviewedBundledSrdHeading,
  kind: SaveSuccessOutcome['kind'],
  discriminator?: SaveClauseDiscriminator,
): ReviewedSaveSuccessClause {
  const id = saveSuccessClauseId(`srd-5.2.1:spell:${spellSlug}:save:${key}`);
  const sourceIndex = nextSourceClauseByHeading.get(heading) ?? 0;
  const candidates = sourceDerivedSaveClauses.get(heading) ?? [];
  const sourceClause = candidates[sourceIndex];
  if (sourceClause === undefined) {
    throw new TypeError(
      `No source-derived damage save clause ${String(sourceIndex + 1)} exists for ${heading}.`,
    );
  }
  if (candidates.length > 1 && discriminator === undefined) {
    throw new TypeError(
      `${id} has multiple source candidates and requires a clause discriminator.`,
    );
  }
  if (discriminator !== undefined) {
    const matches = candidates.filter((candidate) =>
      sourceClauseMatchesDiscriminator(candidate, discriminator),
    );
    if (matches.length !== 1 || matches[0] !== sourceClause) {
      throw new TypeError(
        `${id} is mis-bound: its source candidate does not uniquely match the declared ${discriminator.kind} discriminator.`,
      );
    }
  }
  if (sourceClause.kind !== kind) {
    throw new TypeError(
      `${id} is mis-bound: source outcome ${sourceClause.kind} does not match declared outcome ${kind}.`,
    );
  }
  nextSourceClauseByHeading.set(heading, sourceIndex + 1);
  const stableKey = sourceStableKey(`srd-5.2.1:spell:${spellSlug}`);
  return {
    id,
    effect_source: {
      kind: 'catalog_content',
      content_key: String(stableKey) as ContentKey,
      stable_key: stableKey,
    },
    effect_stable_key: stableKey,
    kind,
    evidence: bundledHeading(heading),
    source_span: sourceClause.span,
    ability: sourceClause.ability,
    failed_damage_signatures: sourceClause.failed_damage_signatures,
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
  arcane_hand_grasping: reviewedSaveClause('grasping-hand-damage', 'arcane-hand', 'Arcane Hand', 'none'),
  befuddlement: reviewedSaveClause('damage', 'befuddlement', 'Befuddlement', 'none'),
  bestow_curse_damage: reviewedSaveClause('curse-damage', 'bestow-curse', 'Bestow Curse', 'none'),
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
  conjure_elemental_initial: reviewedSaveClause('initial-damage', 'conjure-elemental', 'Conjure Elemental', 'none', { kind: 'damage_signature', dice_count: 8, die_size: 8, damage_type: null }),
  conjure_elemental_repeat: reviewedSaveClause('repeat-damage', 'conjure-elemental', 'Conjure Elemental', 'none', { kind: 'damage_signature', dice_count: 4, die_size: 8, damage_type: null }),
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
  enlarge_reduce_damage: reviewedSaveClause('weapon-damage', 'enlarge-reduce', 'Enlarge/Reduce', 'none'),
  ensnaring_strike: reviewedSaveClause('recurring-damage', 'ensnaring-strike', 'Ensnaring Strike', 'none'),
  faithful_hound: reviewedSaveClause('damage', 'faithful-hound', 'Faithful Hound', 'none'),
  finger_of_death: reviewedSaveClause('damage', 'finger-of-death', 'Finger of Death', 'half'),
  fireball: reviewedSaveClause('damage', 'fireball', 'Fireball', 'half'),
  fire_storm: reviewedSaveClause('damage', 'fire-storm', 'Fire Storm', 'half'),
  flame_strike: reviewedSaveClause('damage', 'flame-strike', 'Flame Strike', 'half'),
  flaming_sphere: reviewedSaveClause('damage', 'flaming-sphere', 'Flaming Sphere', 'half'),
  freezing_sphere: reviewedSaveClause('damage', 'freezing-sphere', 'Freezing Sphere', 'half'),
  geas: reviewedSaveClause('recurring-damage', 'geas', 'Geas', 'none'),
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
  phantasmal_force: reviewedSaveClause('recurring-damage', 'phantasmal-force', 'Phantasmal Force', 'none'),
  phantasmal_killer_initial: reviewedSaveClause('initial-damage', 'phantasmal-killer', 'Phantasmal Killer', 'half', { kind: 'source_text', includes: 'Disadvantage on ability checks' }),
  phantasmal_killer_repeat: reviewedSaveClause('repeat-damage', 'phantasmal-killer', 'Phantasmal Killer', 'none', { kind: 'source_text', includes: 'damage again' }),
  prismatic_spray: reviewedSaveClause('damaging-rays', 'prismatic-spray', 'Prismatic Spray', 'half'),
  prismatic_wall: reviewedSaveClause('damaging-layers', 'prismatic-wall', 'Prismatic Wall', 'half'),
  ray_of_enfeeblement: reviewedSaveClause('damage-reduction', 'ray-of-enfeeblement', 'Ray of Enfeeblement', 'none'),
  sacred_flame: reviewedSaveClause('damage', 'sacred-flame', 'Sacred Flame', 'none'),
  searing_smite: reviewedSaveClause('recurring-damage', 'searing-smite', 'Searing Smite', 'none'),
  shatter: reviewedSaveClause('damage', 'shatter', 'Shatter', 'half'),
  spirit_guardians: reviewedSaveClause('damage', 'spirit-guardians', 'Spirit Guardians', 'half'),
  storm_of_vengeance_initial: reviewedSaveClause('initial-thunder-damage', 'storm-of-vengeance', 'Storm of Vengeance', 'none', { kind: 'ability', ability: 'constitution' }),
  storm_of_vengeance_lightning: reviewedSaveClause('lightning-damage', 'storm-of-vengeance', 'Storm of Vengeance', 'half', { kind: 'ability', ability: 'dexterity' }),
  summon_dragon: reviewedSaveClause('breath-weapon', 'summon-dragon', 'Summon Dragon', 'half'),
  sunbeam: reviewedSaveClause('damage', 'sunbeam', 'Sunbeam', 'half'),
  sunburst: reviewedSaveClause('damage', 'sunburst', 'Sunburst', 'half'),
  symbol: reviewedSaveClause('death-damage', 'symbol', 'Symbol', 'half'),
  thunderwave: reviewedSaveClause('damage', 'thunderwave', 'Thunderwave', 'half'),
  tsunami_initial: reviewedSaveClause('initial-damage', 'tsunami', 'Tsunami', 'half', { kind: 'damage_signature', dice_count: 6, die_size: 10, damage_type: 'Bludgeoning' }),
  tsunami_ongoing: reviewedSaveClause('ongoing-damage', 'tsunami', 'Tsunami', 'none', { kind: 'damage_signature', dice_count: 5, die_size: 10, damage_type: 'Bludgeoning' }),
  vicious_mockery: reviewedSaveClause('damage', 'vicious-mockery', 'Vicious Mockery', 'none'),
  vitriolic_sphere: reviewedSaveClause('damage', 'vitriolic-sphere', 'Vitriolic Sphere', 'sourced_damage'),
  wall_of_fire: reviewedSaveClause('damage', 'wall-of-fire', 'Wall of Fire', 'half'),
  wall_of_ice_initial: reviewedSaveClause('initial-damage', 'wall-of-ice', 'Wall of Ice', 'half', { kind: 'ability', ability: 'dexterity' }),
  wall_of_ice_frigid_air: reviewedSaveClause('frigid-air-damage', 'wall-of-ice', 'Wall of Ice', 'half', { kind: 'ability', ability: 'constitution' }),
  wall_of_thorns_piercing: reviewedSaveClause('piercing-damage', 'wall-of-thorns', 'Wall of Thorns', 'half', { kind: 'damage_signature', dice_count: 7, die_size: 8, damage_type: 'Piercing' }),
  wall_of_thorns_slashing: reviewedSaveClause('slashing-damage', 'wall-of-thorns', 'Wall of Thorns', 'half', { kind: 'damage_signature', dice_count: 7, die_size: 8, damage_type: 'Slashing' }),
  weird_initial: reviewedSaveClause('initial-damage', 'weird', 'Weird', 'half', { kind: 'damage_signature', dice_count: 10, die_size: 10, damage_type: 'Psychic' }),
  weird_repeat: reviewedSaveClause('repeat-damage', 'weird', 'Weird', 'none', { kind: 'damage_signature', dice_count: 5, die_size: 10, damage_type: 'Psychic' }),
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
  signatures: readonly FailedDamageSignature[],
): boolean {
  if (damage.some((instance) => !sameSourceRef(instance.source, effect))) {
    return false;
  }
  if (signatures.length === 0) {
    return true;
  }
  return damage.every((instance) => instance.components.every((component) =>
    signatures.some((signature) => {
      if (
        signature.damage_type !== null &&
        signature.damage_type !== instance.damage_type
      ) {
        return false;
      }
      if (component.kind === 'dice') {
        return signature.die_size === component.pool.die &&
          signature.dice_count !== null &&
          component.pool.count >= signature.dice_count;
      }
      return signature.flat_modifier === component.modifier;
    }),
  ));
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
  ability?: Ability,
  damageOnFailedSave?: readonly DamageInstance[],
): boolean {
  const expected = saveSuccessOutcomeEvidenceManifest.get(clauseId);
  return expected !== undefined &&
    sameSourceRef(expected.effect_source, effect) &&
    expected.kind === outcome.kind &&
    samePublicSource(outcome.evidence, expected.evidence) &&
    (ability === undefined || ability === expected.ability) &&
    (damageOnFailedSave === undefined || damageMatchesSourceClause(
      effect,
      damageOnFailedSave,
      expected.failed_damage_signatures,
    )) &&
    (outcome.kind !== 'sourced_damage' || damageMatchesSourceClause(
      effect,
      outcome.damage,
      expected.failed_damage_signatures,
    ));
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
