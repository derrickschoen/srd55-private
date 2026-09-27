/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * A CHARACTER'S STANDING SENSES, OR WHY THEY CANNOT BE STATED
 * (PC-EXPORT-TRUTH, D918).
 *
 * Every exported character used to reach combat with `normal_sight` and
 * nothing else, so a Dwarf fought blind in the dark it sees through. The
 * senses are now composed from three sourced facts:
 *
 *  - the species' printed Darkvision, from the GENERATED table
 *    (`src/rules/generated/species-srd-tables.ts`, rule G);
 *  - a species choice that owns the Darkvision range — the Elven Lineage's
 *    Drow option "increases to 120 feet" — which the sheet already resolves
 *    as `lineage_darkvision`; while that choice is unmade the range is
 *    UNKNOWN, and so are the senses;
 *  - class features and feats that grant a standing sense, hand-typed from
 *    their cited spans below (rule H).
 *
 * A species with no SRD provenance (renamed, authored or imported content)
 * has no structured senses at all, and the answer is `undetermined`, never a
 * guessed `normal_sight`.
 *
 * SENSE FEATURES THE ENGINE CANNOT RUN ARE CARRIED, NOT DROPPED (owner D923
 * Q13). The Dwarf's Stonecunning Tremorsense is ACTIVATED (a Bonus Action,
 * 10 minutes, on stone), so it is not a standing sense; Devil's Sight sees
 * through magical Darkness, which no `CombatSense` kind expresses. Both are
 * typed "sourced, not executed, awaiting perception_filters" (the PERCEPTION
 * unit) in `SENSE_FEATURES`, and a character holding one states it.
 */
import type { CombatSense } from '../combat/statblock';
import { SRD_SPECIES_SENSES, type SrdSpeciesName } from './generated/species-srd-tables';

export type SrdFullSpan = `docs/srd/full/srd-5.2.1.txt:${number}-${number}`;

/** The one species fact a character's senses start from. */
export type SpeciesSenseSource =
  | {
      readonly kind: 'srd_species';
      readonly species: SrdSpeciesName;
      /**
       * The sheet's `lineage_darkvision`: `null` when no species choice owns
       * the Darkvision range, otherwise the choice's known or unknown range.
       */
      readonly lineageDarkvision:
        | null
        | { readonly kind: 'known'; readonly value: number }
        | { readonly kind: 'unknown'; readonly detail: string };
    }
  | { readonly kind: 'unsourced'; readonly detail: string };

export interface CharacterSenseInputs {
  readonly species: SpeciesSenseSource;
  readonly classLevels: readonly { readonly className: string; readonly level: number }[];
  readonly featContentKeys: readonly string[];
}

export type RangedSenseKind = Exclude<CombatSense['kind'], 'normal_sight'>;

export interface FeatureSenseGrant {
  readonly feature: string;
  readonly grantedBy:
    | { readonly kind: 'class_level'; readonly className: string; readonly level: number }
    | { readonly kind: 'feat'; readonly contentKey: string };
  readonly sense: { readonly kind: RangedSenseKind; readonly rangeFeet: number };
  readonly span: SrdFullSpan;
}

/**
 * Standing senses a class feature or feat grants, hand-typed from the cited
 * spans (the text is pinned by tests/unit/rules/character-senses.test.ts).
 * Witch Sight (Warlock invocation, :4492-4494) is not listed because this
 * application offers no invocation that could select it.
 */
export const FEATURE_SENSE_GRANTS = [
  {
    // "Level 18: Feral Senses. Your connection to the forces of nature grants
    // you Blindsight with a range of 30 feet."
    feature: 'Feral Senses',
    grantedBy: { kind: 'class_level', className: 'Ranger', level: 18 },
    sense: { kind: 'blindsight', rangeFeet: 30 },
    span: 'docs/srd/full/srd-5.2.1.txt:3577-3580',
  },
  {
    // "Boon of Truesight ... Truesight. You have Truesight with a range of 60 feet."
    feature: 'Boon of Truesight',
    grantedBy: { kind: 'feat', contentKey: '2024:feat:boon-of-truesight' },
    sense: { kind: 'truesight', rangeFeet: 60 },
    span: 'docs/srd/full/srd-5.2.1.txt:5354-5360',
  },
] as const satisfies readonly FeatureSenseGrant[];

/** The capability every sense feature awaits, and the unit that owns it (D920, D923 Q13). */
export type SenseFeatureCapability = 'perception_filters';

export const SENSE_FEATURE_CAPABILITY_OWNER = {
  perception_filters: 'PERCEPTION',
} as const satisfies Readonly<Record<SenseFeatureCapability, string>>;

/** What a sense feature grants, in terms the engine's senses cannot state. */
export type SenseFeatureSense =
  | { readonly kind: 'tremorsense'; readonly rangeFeet: number }
  | {
      readonly kind: 'sees_normally_in_darkness';
      readonly rangeFeet: number;
      readonly includesMagicalDarkness: true;
    };

export type SenseFeatureActivation =
  | { readonly kind: 'standing' }
  | {
      readonly kind: 'bonus_action';
      readonly durationMinutes: number;
      readonly surface: 'stone';
    };

export interface SenseFeatureRule {
  readonly grantedBy:
    | { readonly kind: 'srd_species'; readonly species: SrdSpeciesName }
    /**
     * An Eldritch Invocation. This application offers no invocation choice,
     * so no character can hold one; the row keeps the rule represented.
     */
    | { readonly kind: 'eldritch_invocation'; readonly selectableInThisApplication: false };
  readonly sense: SenseFeatureSense;
  readonly activation: SenseFeatureActivation;
  readonly status: 'sourced_not_executed';
  readonly awaiting: SenseFeatureCapability;
  readonly span: SrdFullSpan;
}

/**
 * Hand-typed from the cited spans (production rule H; the span text is hash
 * pinned by tests/unit/rules/character-senses.test.ts).
 */
export const SENSE_FEATURES = {
  // "Stonecunning. As a Bonus Action, you gain Tremorsense with a range of 60
  // feet for 10 minutes. You must be on a stone surface or touching a stone
  // surface to use this Tremorsense." (right column)
  Stonecunning: {
    grantedBy: { kind: 'srd_species', species: 'Dwarf' },
    sense: { kind: 'tremorsense', rangeFeet: 60 },
    activation: { kind: 'bonus_action', durationMinutes: 10, surface: 'stone' },
    status: 'sourced_not_executed',
    awaiting: 'perception_filters',
    span: 'docs/srd/full/srd-5.2.1.txt:5060-5072',
  },
  // "Devil's Sight. Prerequisite: Level 2+ Warlock. You can see normally in
  // Dim Light and Darkness—both magical and nonmagical—within 120 feet of
  // yourself." (right column)
  "Devil's Sight": {
    grantedBy: { kind: 'eldritch_invocation', selectableInThisApplication: false },
    sense: { kind: 'sees_normally_in_darkness', rangeFeet: 120, includesMagicalDarkness: true },
    activation: { kind: 'standing' },
    status: 'sourced_not_executed',
    awaiting: 'perception_filters',
    span: 'docs/srd/full/srd-5.2.1.txt:4354-4358',
  },
} as const satisfies Readonly<Record<string, SenseFeatureRule>>;

export type SenseFeatureName = keyof typeof SENSE_FEATURES;

export const SENSE_FEATURE_NAMES = Object.keys(SENSE_FEATURES) as readonly SenseFeatureName[];

/** A held sense feature as combat carries it: typed, not executed, never dropped. */
export interface SourcedNotExecutedSenseFeature {
  readonly feature: SenseFeatureName;
  readonly sense: SenseFeatureSense;
  readonly activation: SenseFeatureActivation;
  readonly status: 'sourced_not_executed';
  readonly awaiting: SenseFeatureCapability;
}

export function sourcedNotExecutedSenseFeature(feature: SenseFeatureName): SourcedNotExecutedSenseFeature {
  const rule: SenseFeatureRule = SENSE_FEATURES[feature];
  return {
    feature,
    sense: rule.sense,
    activation: rule.activation,
    status: rule.status,
    awaiting: rule.awaiting,
  };
}

function holdsSenseFeature(rule: SenseFeatureRule, species: SrdSpeciesName): boolean {
  switch (rule.grantedBy.kind) {
    case 'srd_species':
      return rule.grantedBy.species === species;
    case 'eldritch_invocation':
      return rule.grantedBy.selectableInThisApplication;
  }
}

export type CharacterSenses =
  | {
      readonly status: 'sourced';
      readonly senses: readonly CombatSense[];
      /** Held sense features the engine does not run (`SENSE_FEATURES`), by name. */
      readonly senseFeatures: readonly SenseFeatureName[];
    }
  | {
      readonly status: 'undetermined';
      readonly field: 'senses.species' | 'senses.darkvision' | 'senses.duplicate';
      readonly detail: string;
    };

function speciesSenses(
  source: Extract<SpeciesSenseSource, { readonly kind: 'srd_species' }>,
):
  | { readonly status: 'sourced'; readonly senses: readonly CombatSense[] }
  | Extract<CharacterSenses, { readonly status: 'undetermined' }> {
  const printed: readonly { readonly kind: 'darkvision'; readonly rangeFeet: number }[] =
    SRD_SPECIES_SENSES[source.species];
  const lineage = source.lineageDarkvision;
  if (lineage === null) {
    return { status: 'sourced', senses: printed.map((sense) => ({ ...sense })) };
  }
  switch (lineage.kind) {
    case 'unknown':
      return { status: 'undetermined', field: 'senses.darkvision', detail: lineage.detail };
    case 'known':
      // The choice owns the Darkvision range; the printed base is replaced, not added to.
      return { status: 'sourced', senses: [{ kind: 'darkvision', rangeFeet: lineage.value }] };
  }
}

function granted(grant: FeatureSenseGrant, inputs: CharacterSenseInputs): boolean {
  switch (grant.grantedBy.kind) {
    case 'class_level': {
      const { className, level } = grant.grantedBy;
      return inputs.classLevels.some((held) => held.className === className && held.level >= level);
    }
    case 'feat':
      return inputs.featContentKeys.includes(grant.grantedBy.contentKey);
  }
}

export function characterSenses(inputs: CharacterSenseInputs): CharacterSenses {
  if (inputs.species.kind === 'unsourced') {
    return { status: 'undetermined', field: 'senses.species', detail: inputs.species.detail };
  }
  const printed = speciesSenses(inputs.species);
  if (printed.status === 'undetermined') return printed;
  const ranged = [
    ...printed.senses,
    ...FEATURE_SENSE_GRANTS
      .filter((grant) => granted(grant, inputs))
      .map((grant): CombatSense => ({ ...grant.sense })),
  ];
  const kinds = ranged.map((sense) => sense.kind);
  const repeated = kinds.find((kind, index) => kinds.indexOf(kind) !== index);
  if (repeated !== undefined) {
    // No SRD rule combines two grants of one sense; refuse rather than pick one.
    return {
      status: 'undetermined',
      field: 'senses.duplicate',
      detail: `Two sources grant ${repeated}, and no rule says which range applies.`,
    };
  }
  const { species } = inputs.species;
  return {
    status: 'sourced',
    senses: [{ kind: 'normal_sight' }, ...ranged],
    senseFeatures: SENSE_FEATURE_NAMES.filter((name) => holdsSenseFeature(SENSE_FEATURES[name], species)),
  };
}
