import type {
  CharacterId,
  CharacterRevision,
  CharacterWeaponId,
  ContentKey,
  SourceInstanceId,
  Brand,
} from '../domain/ids';
import {
  abilities,
  damageType,
  isDieSize,
  type Ability,
  type DamageType,
  type DieSize,
} from '../domain/enums';

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type EncounterRoundCount = Brand<number, 'EncounterRoundCount'>;
export type EncountersPerRestBlock = Brand<
  number,
  'EncountersPerRestBlock'
>;
export type ShortRestsBeforeLongRest = Brand<
  number,
  'ShortRestsBeforeLongRest'
>;
export type TargetArmorClass = Brand<number, 'TargetArmorClass'>;
export type TargetSaveBonus = Brand<number, 'TargetSaveBonus'>;
export type CharacterAttackRoutineId = Brand<
  string,
  'CharacterAttackRoutineId'
>;
export type RoutineEventId = Brand<string, 'RoutineEventId'>;
export type SimResourceId = Brand<string, 'SimResourceId'>;
export type SimResourcePoolKey = Brand<string, 'SimResourcePoolKey'>;
export type UnmodelledIssueId = Brand<string, 'UnmodelledIssueId'>;
export type BundledSrdPath = Brand<string, 'BundledSrdPath'>;
export type BundledSrdHeading = Brand<string, 'BundledSrdHeading'>;
export const PROJECT_OWNED_SOURCE_LICENSE_BY_PATH = {
  'src/simulation/contracts.ts': 'MIT',
  'docs/design/2026-08-14-dpr-sim-as-app-feature.md': 'CC-BY-4.0',
} as const;
type RegisteredProjectOwnedSourcePath =
  keyof typeof PROJECT_OWNED_SOURCE_LICENSE_BY_PATH;
export type ProjectOwnedSourcePath = Brand<
  RegisteredProjectOwnedSourcePath,
  'ProjectOwnedSourcePath'
>;
export type ProjectOwnedSourceLicense =
  (typeof PROJECT_OWNED_SOURCE_LICENSE_BY_PATH)[RegisteredProjectOwnedSourcePath];
export type SourceStableKey = Brand<string, 'SourceStableKey'>;
export type EncounterRoundOrdinal = Brand<number, 'EncounterRoundOrdinal'>;
export type RestCycleEncounterOrdinal = Brand<
  number,
  'RestCycleEncounterOrdinal'
>;
export type TotalCycleRoundCount = Brand<number, 'TotalCycleRoundCount'>;
export type PositiveResourceMaximum = Brand<
  number,
  'PositiveResourceMaximum'
>;
export type PositiveResourceRecoveryAmount = Brand<
  number,
  'PositiveResourceRecoveryAmount'
>;
export type PositiveResourceCost = Brand<number, 'PositiveResourceCost'>;
export type EncounterResourceCap = Brand<number, 'EncounterResourceCap'>;
export type ExpectedEventDamage = Brand<number, 'ExpectedEventDamage'>;
export type ExpectedRoundDamage = Brand<number, 'ExpectedRoundDamage'>;
export type ExpectedEncounterDamage = Brand<
  number,
  'ExpectedEncounterDamage'
>;
export type ExpectedCycleDamage = Brand<number, 'ExpectedCycleDamage'>;
export type ExpectedDamagePerRound = Brand<
  number,
  'ExpectedDamagePerRound'
>;
export type ExpectedDamagePerEncounter = Brand<
  number,
  'ExpectedDamagePerEncounter'
>;
export type Probability = Brand<number, 'Probability'>;
export type PositiveDiceCount = Brand<number, 'PositiveDiceCount'>;
export type DamageRollTotal = Brand<number, 'DamageRollTotal'>;
export type AttackRollModifier = Brand<number, 'AttackRollModifier'>;
export type SaveDifficultyClass = Brand<number, 'SaveDifficultyClass'>;
export type DamageFlatModifier = Brand<number, 'DamageFlatModifier'>;
export type ExpandedCriticalMinimumRoll = Brand<
  number,
  'ExpandedCriticalMinimumRoll'
>;
export type SaveSuccessClauseId =
  `srd-5.2.1:spell:${string}:save:${string}`;
export type AttackRollClauseId = Brand<string, 'AttackRollClauseId'>;
export type DamageNeutralMechanicId = Brand<
  string,
  'DamageNeutralMechanicId'
>;
export type ResourceRecoveryClauseId = Brand<
  string,
  'ResourceRecoveryClauseId'
>;

function integerInRange(
  value: unknown,
  minimum: number,
  maximum: number,
  label: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new RangeError(
      `${label} must be an integer from ${String(minimum)} to ${String(maximum)}.`,
    );
  }
  return value;
}

function finiteInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer.`);
  }
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  const parsed = finiteInteger(value, label);
  if (parsed < 1) {
    throw new RangeError(`${label} must be at least 1.`);
  }
  return parsed;
}

function nonnegativeFinite(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be finite and nonnegative.`);
  }
  return value;
}

function nonemptyKey(value: unknown, label: string): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.trim() !== value ||
    value.includes('\u0000')
  ) {
    throw new TypeError(
      `${label} must be a nonempty, trimmed string without NUL bytes.`,
    );
  }
  return value;
}

export const encounterRoundCount = (value: unknown): EncounterRoundCount =>
  integerInRange(value, 1, 20, 'Encounter round count') as EncounterRoundCount;

export const encountersPerRestBlock = (
  value: unknown,
): EncountersPerRestBlock =>
  integerInRange(
    value,
    1,
    12,
    'Encounters per rest block',
  ) as EncountersPerRestBlock;

export const shortRestsBeforeLongRest = (
  value: unknown,
): ShortRestsBeforeLongRest =>
  integerInRange(
    value,
    0,
    11,
    'Short Rests before Long Rest',
  ) as ShortRestsBeforeLongRest;

export const targetArmorClass = (value: unknown): TargetArmorClass =>
  integerInRange(value, 0, 50, 'Target Armor Class') as TargetArmorClass;

export const targetSaveBonus = (value: unknown): TargetSaveBonus =>
  integerInRange(value, -20, 30, 'Target save bonus') as TargetSaveBonus;

export const encounterRoundOrdinal = (
  value: unknown,
): EncounterRoundOrdinal =>
  integerInRange(value, 1, 20, 'Encounter round ordinal') as EncounterRoundOrdinal;

export const restCycleEncounterOrdinal = (
  value: unknown,
): RestCycleEncounterOrdinal =>
  integerInRange(
    value,
    1,
    12,
    'Rest-cycle encounter ordinal',
  ) as RestCycleEncounterOrdinal;

export const totalCycleRoundCount = (
  value: unknown,
): TotalCycleRoundCount =>
  integerInRange(
    value,
    1,
    240,
    'Total cycle round count',
  ) as TotalCycleRoundCount;

export const positiveResourceMaximum = (
  value: unknown,
): PositiveResourceMaximum =>
  positiveInteger(value, 'Resource maximum') as PositiveResourceMaximum;

export const positiveResourceCost = (
  value: unknown,
): PositiveResourceCost =>
  positiveInteger(value, 'Resource cost') as PositiveResourceCost;

export function positiveResourceRecoveryAmount(
  value: unknown,
  maximum: PositiveResourceMaximum,
): PositiveResourceRecoveryAmount {
  return integerInRange(
    value,
    1,
    maximum,
    'Resource recovery amount',
  ) as PositiveResourceRecoveryAmount;
}

export function encounterResourceCap(
  value: unknown,
  poolMaximum: PositiveResourceMaximum,
): EncounterResourceCap {
  return integerInRange(
    value,
    0,
    poolMaximum,
    'Encounter resource cap',
  ) as EncounterResourceCap;
}

export const positiveDiceCount = (value: unknown): PositiveDiceCount =>
  positiveInteger(value, 'Dice count') as PositiveDiceCount;

export const damageRollTotal = (value: unknown): DamageRollTotal =>
  integerAtLeastZero(value, 'Damage roll total') as DamageRollTotal;

function integerAtLeastZero(value: unknown, label: string): number {
  const parsed = finiteInteger(value, label);
  if (parsed < 0) {
    throw new RangeError(`${label} must be nonnegative.`);
  }
  return parsed;
}

export const attackRollModifier = (value: unknown): AttackRollModifier =>
  finiteInteger(value, 'Attack roll modifier') as AttackRollModifier;

export const saveDifficultyClass = (value: unknown): SaveDifficultyClass =>
  finiteInteger(value, 'Save Difficulty Class') as SaveDifficultyClass;

export const damageFlatModifier = (value: unknown): DamageFlatModifier =>
  finiteInteger(value, 'Damage flat modifier') as DamageFlatModifier;

export const probability = (value: unknown): Probability => {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new RangeError('Probability must be finite and from 0 to 1.');
  }
  return value as Probability;
};

export const expectedEventDamage = (value: unknown): ExpectedEventDamage =>
  nonnegativeFinite(value, 'Expected event damage') as ExpectedEventDamage;
export const expectedRoundDamage = (value: unknown): ExpectedRoundDamage =>
  nonnegativeFinite(value, 'Expected round damage') as ExpectedRoundDamage;
export const expectedEncounterDamage = (
  value: unknown,
): ExpectedEncounterDamage =>
  nonnegativeFinite(
    value,
    'Expected encounter damage',
  ) as ExpectedEncounterDamage;
export const expectedCycleDamage = (value: unknown): ExpectedCycleDamage =>
  nonnegativeFinite(value, 'Expected cycle damage') as ExpectedCycleDamage;
export const expectedDamagePerRound = (
  value: unknown,
): ExpectedDamagePerRound =>
  nonnegativeFinite(
    value,
    'Expected damage per round',
  ) as ExpectedDamagePerRound;
export const expectedDamagePerEncounter = (
  value: unknown,
): ExpectedDamagePerEncounter =>
  nonnegativeFinite(
    value,
    'Expected damage per encounter',
  ) as ExpectedDamagePerEncounter;

export const characterAttackRoutineId = (
  value: unknown,
): CharacterAttackRoutineId =>
  nonemptyKey(value, 'Character attack routine ID') as CharacterAttackRoutineId;
export const routineEventId = (value: unknown): RoutineEventId =>
  nonemptyKey(value, 'Routine event ID') as RoutineEventId;
export const simResourceId = (value: unknown): SimResourceId =>
  nonemptyKey(value, 'Simulation resource ID') as SimResourceId;
export const simResourcePoolKey = (value: unknown): SimResourcePoolKey =>
  nonemptyKey(value, 'Simulation resource pool key') as SimResourcePoolKey;
export const unmodelledIssueId = (value: unknown): UnmodelledIssueId =>
  nonemptyKey(value, 'Unmodelled issue ID') as UnmodelledIssueId;
export const sourceStableKey = (value: unknown): SourceStableKey =>
  nonemptyKey(value, 'Source stable key') as SourceStableKey;
export const saveSuccessClauseId = (value: unknown): SaveSuccessClauseId =>
  nonemptyKey(value, 'Save-success clause ID') as SaveSuccessClauseId;
export const resourceRecoveryClauseId = (
  value: unknown,
): ResourceRecoveryClauseId =>
  nonemptyKey(value, 'Resource-recovery clause ID') as ResourceRecoveryClauseId;
export const expandedCriticalMinimumRoll = (
  value: unknown,
): ExpandedCriticalMinimumRoll =>
  integerInRange(
    value,
    2,
    19,
    'Expanded critical minimum roll',
  ) as ExpandedCriticalMinimumRoll;

export const BUNDLED_SRD_5_2_1_PATH =
  'docs/srd/full/srd-5.2.1.txt' as BundledSrdPath;

export function bundledSrdPath(value: unknown): BundledSrdPath {
  if (value !== BUNDLED_SRD_5_2_1_PATH) {
    throw new TypeError(
      `Bundled SRD path must be ${BUNDLED_SRD_5_2_1_PATH}.`,
    );
  }
  return value as BundledSrdPath;
}

export function projectOwnedSourcePath(value: unknown): ProjectOwnedSourcePath {
  const path = nonemptyKey(value, 'Project-owned source path');
  // No `startsWith('\\')` clause: `includes('\\')` below already rejects every
  // path that begins with a backslash, so the clause could not change any
  // verdict. The near-miss suite keeps probing backslash-leading paths.
  if (
    path.startsWith('/') ||
    /^[A-Za-z]:[\\/]/u.test(path) ||
    path.includes('\\') ||
    path.split('/').some((segment) => segment === '..')
  ) {
    throw new TypeError(
      'Project-owned source path must be a repository-relative path without traversal.',
    );
  }
  if (!Object.hasOwn(PROJECT_OWNED_SOURCE_LICENSE_BY_PATH, path)) {
    throw new TypeError(
      `Project-owned source path is not registered: ${path}.`,
    );
  }
  return path as ProjectOwnedSourcePath;
}

export function projectOwnedSourceLicense(
  path: ProjectOwnedSourcePath,
): ProjectOwnedSourceLicense {
  return PROJECT_OWNED_SOURCE_LICENSE_BY_PATH[
    path as RegisteredProjectOwnedSourcePath
  ];
}

export type RestCadence = {
  readonly encounters_per_rest_block: EncountersPerRestBlock;
  readonly short_rests_before_long_rest: ShortRestsBeforeLongRest;
};

export function restCadence(input: {
  readonly encounters_per_rest_block: unknown;
  readonly short_rests_before_long_rest: unknown;
}): RestCadence {
  const cadence = {
    encounters_per_rest_block: encountersPerRestBlock(
      input.encounters_per_rest_block,
    ),
    short_rests_before_long_rest: shortRestsBeforeLongRest(
      input.short_rests_before_long_rest,
    ),
  };
  if (
    cadence.encounters_per_rest_block *
      (cadence.short_rests_before_long_rest + 1) >
    12
  ) {
    throw new RangeError(
      'A rest cycle cannot contain more than 12 encounters.',
    );
  }
  return cadence;
}

export const rollStates = ['normal', 'advantage', 'disadvantage'] as const;
export type RollState = (typeof rollStates)[number];

export type ResourcePolicy =
  | {
      readonly kind: 'budget_over_rest_cycle';
      readonly cadence: RestCadence;
    }
  | { readonly kind: 'spend_available_after_long_rest' };

export const damageResponses = [
  'normal',
  'resistant',
  'vulnerable',
  'resistant_and_vulnerable',
  'immune',
] as const;
export type DamageResponse = (typeof damageResponses)[number];

export type TargetDamageResponse = {
  readonly damage_type: DamageType;
  readonly response: DamageResponse;
};

export type TargetSaveSetting = {
  readonly ability: Ability;
  readonly bonus: TargetSaveBonus;
};

export type TargetDefense = {
  readonly armor_class: TargetArmorClass;
  readonly save_bonuses: readonly TargetSaveSetting[];
  readonly damage_responses: readonly TargetDamageResponse[];
};

export type SimulationSettings = {
  readonly rounds: EncounterRoundCount;
  readonly resources: ResourcePolicy;
  readonly roll_state: RollState;
  readonly target: TargetDefense;
};

export type DprSimulationRequest = {
  readonly character_id: CharacterId;
  readonly expected_revision: CharacterRevision;
  readonly routine: CharacterAttackRoutineId;
  readonly settings: SimulationSettings;
};

export type DprRoutineOption =
  | {
      readonly status: 'supported';
      readonly id: CharacterAttackRoutineId;
      readonly label: string;
      readonly required_target_saves: readonly Ability[];
      readonly damage_types: readonly DamageType[];
    }
  | {
      readonly status: 'unavailable';
      readonly id: CharacterAttackRoutineId;
      readonly label: string;
      readonly issues: NonEmptyReadonlyArray<UnmodelledIssue>;
    };

export type DprSimulationOptions = {
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
  readonly routines: readonly DprRoutineOption[];
};

export type DprScenarioDraft = {
  readonly routine: CharacterAttackRoutineId | null;
  readonly settings: SimulationSettings;
};

export type DprRequestContext =
  | { readonly kind: 'request'; readonly value: DprSimulationRequest }
  | { readonly kind: 'headline_draft'; readonly value: DprScenarioDraft };

export type HeadlineScenarioResolution =
  | { readonly status: 'ready'; readonly request: DprSimulationRequest }
  | {
      readonly status: 'unavailable';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly draft: DprScenarioDraft;
      readonly issues: NonEmptyReadonlyArray<UnmodelledIssue>;
    };

/**
 * The bundled, redistributable-SRD arm of a public citation, named so that a
 * value can be *typed* as bundled content instead of being narrowed from the
 * wide union by a runtime `kind` check. Code that only ever cites bundled SRD
 * text takes this type, which makes a non-bundled citation a compile error at
 * the call site rather than a throw that a mutated conditional could skip.
 */
export type BundledSrdSourceRef = {
  readonly kind: 'bundled_srd';
  readonly path: BundledSrdPath;
  readonly heading: BundledSrdHeading;
};

/** The project-authored arm of a public citation. */
export type ProjectOwnedSourceRef = {
  readonly kind: 'project_owned';
  readonly path: ProjectOwnedSourcePath;
};

export type PublicSourceRef = BundledSrdSourceRef | ProjectOwnedSourceRef;

export type SourceRef =
  | {
      readonly kind: 'character_source';
      readonly source_instance_id: SourceInstanceId;
      readonly stable_key: SourceStableKey;
    }
  | {
      readonly kind: 'catalog_content';
      readonly content_key: ContentKey;
      readonly stable_key: SourceStableKey;
    }
  | {
      readonly kind: 'character_weapon';
      readonly weapon_id: CharacterWeaponId;
      readonly stable_key: SourceStableKey;
    };

export const simulationAssumptionKinds = [
  'target_defense',
  'roll_state',
  'rest_cadence',
  'resource_policy',
  'resource_allocation',
  'mechanic_policy',
  'rounding',
] as const;
export type SimulationAssumptionKind =
  (typeof simulationAssumptionKinds)[number];

export const unmodelledIssueKinds = [
  'routine_selection_required',
  'target_save_bonus_required',
  'damage_response_required',
  'attack_bonus_undetermined',
  'weapon_damage_not_recorded',
  'damage_type_choice_unresolved',
  'unresolved_extra_attack',
  'spellcasting_statistic_absent',
  'feature_value_unavailable',
  'resource_maximum_unavailable',
  'resource_recovery_not_modeled',
  'routine_requires_unavailable_resource',
  'setup_action_not_modeled',
  'trigger_frequency_not_quantified',
  'summon_stat_block_not_modeled',
  'unsupported_damage_relevant_feature',
  'unknown_feature_relevance',
  'unsupported_multi_target_effect',
  'unsupported_reaction_or_enemy_turn_damage',
] as const;
export type UnmodelledIssueKind = (typeof unmodelledIssueKinds)[number];

export type SimulationAssumption = {
  readonly kind: SimulationAssumptionKind;
  readonly detail: string;
};

export type UnmodelledIssue = {
  readonly id: UnmodelledIssueId;
  readonly kind: UnmodelledIssueKind;
  readonly source: SourceRef | null;
  readonly detail: string;
  readonly why_it_changes_damage: string;
  readonly remedy: string | null;
};

export type DicePool = {
  readonly count: PositiveDiceCount;
  readonly die: DieSize;
};

export type DamageComponent =
  | { readonly kind: 'dice'; readonly pool: DicePool }
  | { readonly kind: 'flat'; readonly modifier: DamageFlatModifier };

export type AttackDamageTrigger = 'hit' | 'critical_hit' | 'miss';

export type EventFrequency =
  | { readonly kind: 'each_declared_event' }
  | {
      readonly kind: 'once_per_turn';
      readonly turn: 'source' | 'target';
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly kind: 'once_per_round';
      readonly evidence: PublicSourceRef;
    };

export type InstantaneousDuration = { readonly kind: 'instantaneous' };
export type SavingThrowDamageDuration =
  | InstantaneousDuration
  | {
      readonly kind: 'includes_delayed_damage';
      readonly delayed_until: 'end_of_target_next_turn';
    };

export type SetupDuration =
  | {
      readonly kind: 'until_end_of_turn';
      readonly turn: 'source' | 'target';
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly kind: 'rounds';
      readonly rounds: EncounterRoundCount;
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly kind: 'until_end_of_encounter';
      readonly evidence: PublicSourceRef;
    };

export type ActionCost =
  | { readonly kind: 'action' }
  | { readonly kind: 'bonus_action' }
  | { readonly kind: 'reaction' }
  | { readonly kind: 'free' };

/**
 * Every die triggered by a hit is part of that attack's damage dice and is
 * doubled on a Critical Hit. Critical-only and miss dice are rolled only for
 * their named outcome. There is deliberately no caller-controlled opt-out:
 * the SRD `Critical Hits` rule expressly includes other attack damage dice.
 * Flat components cannot claim to be dice, so modifiers are never doubled.
 */
export type AttackDamageComponent =
  | {
      readonly kind: 'dice';
      readonly pool: DicePool;
      readonly trigger: AttackDamageTrigger;
    }
  | {
      readonly kind: 'flat';
      readonly modifier: DamageFlatModifier;
      readonly trigger: AttackDamageTrigger;
    };

export type DamageInstance = {
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly components: NonEmptyReadonlyArray<DamageComponent>;
};

export type AttackDamageInstance = {
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly components: NonEmptyReadonlyArray<AttackDamageComponent>;
};

export type CriticalHitRule =
  | {
      readonly kind: 'natural_20';
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly kind: 'expanded_range';
      readonly minimum_roll: ExpandedCriticalMinimumRoll;
      readonly evidence: PublicSourceRef;
    };

export type AttackRollEvent = {
  readonly kind: 'attack_roll';
  readonly event_id: RoutineEventId;
  readonly source: SourceRef;
  readonly attack_roll_clause_id: AttackRollClauseId;
  readonly attack_roll_evidence: PublicSourceRef;
  readonly attack_bonus: AttackRollModifier;
  readonly frequency: EventFrequency;
  readonly duration: InstantaneousDuration;
  readonly critical: CriticalHitRule;
  readonly damage: NonEmptyReadonlyArray<AttackDamageInstance>;
};

export type SaveSuccessOutcome =
  | {
      readonly kind: 'none';
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly kind: 'half';
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly kind: 'sourced_damage';
      readonly evidence: PublicSourceRef;
      readonly damage: NonEmptyReadonlyArray<DamageInstance>;
      readonly roll_transform: 'none' | 'floor_half';
    };

export type SavingThrowDamageEvent = {
  readonly kind: 'saving_throw_damage';
  readonly event_id: RoutineEventId;
  readonly source: SourceRef;
  readonly ability: Ability;
  readonly save_dc: SaveDifficultyClass;
  readonly roll_state: RollState;
  readonly frequency: EventFrequency;
  readonly duration: SavingThrowDamageDuration;
  readonly save_success_clause_id: SaveSuccessClauseId;
  readonly damage_on_failed_save: NonEmptyReadonlyArray<DamageInstance>;
  readonly on_success: SaveSuccessOutcome;
};

export type AutomaticDamageEvent = {
  readonly kind: 'automatic_damage';
  readonly event_id: RoutineEventId;
  readonly source: SourceRef;
  readonly damage_clause_id: SaveSuccessClauseId;
  readonly evidence: PublicSourceRef;
  readonly frequency: EventFrequency;
  readonly duration: InstantaneousDuration;
  readonly damage: NonEmptyReadonlyArray<DamageInstance>;
};

function frozenPlain<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value);
}

function snapshotArray<T, U>(
  values: readonly T[],
  snapshot: (value: T) => U,
): readonly U[] {
  const length = values.length;
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new TypeError('Snapshot arrays must have a valid length.');
  }
  const result: U[] = [];
  for (let index = 0; index < length; index += 1) {
    result.push(snapshot(values[index] as T));
  }
  return Object.freeze(result);
}

function snapshotNonEmptyArray<T, U>(
  values: NonEmptyReadonlyArray<T>,
  snapshot: (value: T) => U,
  label: string,
): NonEmptyReadonlyArray<U> {
  const result = snapshotArray(values, snapshot);
  if (result.length === 0) {
    throw new TypeError(`${label} must be nonempty.`);
  }
  return result as NonEmptyReadonlyArray<U>;
}

/** Captures a caller-owned source value without retaining its object. */
export function snapshotSourceRef(source: SourceRef): SourceRef {
  const kind = source.kind;
  switch (kind) {
    case 'character_source': {
      const sourceInstanceId = source.source_instance_id;
      const stableKey = source.stable_key;
      return frozenPlain({
        kind,
        source_instance_id: finiteInteger(
          sourceInstanceId,
          'Character source instance ID',
        ) as SourceInstanceId,
        stable_key: sourceStableKey(stableKey),
      });
    }
    case 'catalog_content': {
      const contentKey = source.content_key;
      const stableKey = source.stable_key;
      return frozenPlain({
        kind,
        content_key: nonemptyKey(contentKey, 'Catalog content key') as ContentKey,
        stable_key: sourceStableKey(stableKey),
      });
    }
    case 'character_weapon': {
      const weaponId = source.weapon_id;
      const stableKey = source.stable_key;
      return frozenPlain({
        kind,
        weapon_id: finiteInteger(weaponId, 'Character weapon ID') as CharacterWeaponId,
        stable_key: sourceStableKey(stableKey),
      });
    }
    default:
      throw new TypeError(`Simulation source kind is invalid: ${String(kind)}.`);
  }
}

/** Captures a caller-owned public citation without retaining its object. */
export function snapshotPublicSourceRef(source: PublicSourceRef): PublicSourceRef {
  const kind = source.kind;
  switch (kind) {
    case 'bundled_srd': {
      const path = source.path;
      const heading = source.heading;
      return frozenPlain({
        kind,
        path: bundledSrdPath(path),
        heading: nonemptyKey(heading, 'Bundled SRD heading') as BundledSrdHeading,
      });
    }
    case 'project_owned': {
      const path = source.path;
      return frozenPlain({ kind, path: projectOwnedSourcePath(path) });
    }
    default:
      throw new TypeError(`Public source kind is invalid: ${String(kind)}.`);
  }
}

export function snapshotDicePool(pool: DicePool): DicePool {
  const count = pool.count;
  const die = pool.die;
  if (typeof die !== 'number' || !isDieSize(die)) {
    throw new RangeError(`Die size is invalid: ${String(die)}.`);
  }
  return frozenPlain({ count: positiveDiceCount(count), die });
}

function snapshotDamageType(value: DamageType): DamageType {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.includes('\u0000')
  ) {
    throw new TypeError('Damage type must be nonempty and contain no NUL bytes.');
  }
  return damageType(value);
}

export function snapshotDamageComponent(
  component: DamageComponent,
): DamageComponent {
  const kind = component.kind;
  switch (kind) {
    case 'dice': {
      const pool = component.pool;
      return frozenPlain({ kind, pool: snapshotDicePool(pool) });
    }
    case 'flat': {
      const modifier = component.modifier;
      return frozenPlain({ kind, modifier: damageFlatModifier(modifier) });
    }
    default:
      throw new TypeError(`Damage component kind is invalid: ${String(kind)}.`);
  }
}

export function snapshotDamageInstance(instance: DamageInstance): DamageInstance {
  const source = instance.source;
  const damageTypeValue = instance.damage_type;
  const components = instance.components;
  return frozenPlain({
    source: snapshotSourceRef(source),
    damage_type: snapshotDamageType(damageTypeValue),
    components: snapshotNonEmptyArray(
      components,
      snapshotDamageComponent,
      'Damage components',
    ),
  });
}

export function snapshotAttackDamageComponent(
  component: AttackDamageComponent,
): AttackDamageComponent {
  const kind = component.kind;
  const trigger = component.trigger;
  if (trigger !== 'hit' && trigger !== 'critical_hit' && trigger !== 'miss') {
    throw new TypeError(`Attack damage trigger is invalid: ${String(trigger)}.`);
  }
  switch (kind) {
    case 'dice': {
      const pool = component.pool;
      return frozenPlain({ kind, pool: snapshotDicePool(pool), trigger });
    }
    case 'flat': {
      const modifier = component.modifier;
      return frozenPlain({
        kind,
        modifier: damageFlatModifier(modifier),
        trigger,
      });
    }
    default:
      throw new TypeError(`Attack damage component kind is invalid: ${String(kind)}.`);
  }
}

export function snapshotAttackDamageInstance(
  instance: AttackDamageInstance,
): AttackDamageInstance {
  const source = instance.source;
  const damageTypeValue = instance.damage_type;
  const components = instance.components;
  return frozenPlain({
    source: snapshotSourceRef(source),
    damage_type: snapshotDamageType(damageTypeValue),
    components: snapshotNonEmptyArray(
      components,
      snapshotAttackDamageComponent,
      'Attack damage components',
    ),
  });
}

function snapshotEventFrequency(frequency: EventFrequency): EventFrequency {
  const kind = frequency.kind;
  switch (kind) {
    case 'each_declared_event':
      return frozenPlain({ kind });
    case 'once_per_turn': {
      const turn = frequency.turn;
      const evidence = frequency.evidence;
      if (turn !== 'source' && turn !== 'target') {
        throw new TypeError(`Event-frequency turn is invalid: ${String(turn)}.`);
      }
      return frozenPlain({
        kind,
        turn,
        evidence: snapshotPublicSourceRef(evidence),
      });
    }
    case 'once_per_round': {
      const evidence = frequency.evidence;
      return frozenPlain({ kind, evidence: snapshotPublicSourceRef(evidence) });
    }
    default:
      throw new TypeError(`Event frequency is invalid: ${String(kind)}.`);
  }
}

function snapshotSavingThrowDamageDuration(
  duration: SavingThrowDamageDuration,
): SavingThrowDamageDuration {
  const kind = duration.kind;
  switch (kind) {
    case 'instantaneous':
      return frozenPlain({ kind });
    case 'includes_delayed_damage': {
      const delayedUntil = duration.delayed_until;
      if (delayedUntil !== 'end_of_target_next_turn') {
        throw new TypeError(
          `Saving-throw delayed duration is invalid: ${String(delayedUntil)}.`,
        );
      }
      return frozenPlain({ kind, delayed_until: delayedUntil });
    }
    default:
      throw new TypeError(`Saving-throw duration is invalid: ${String(kind)}.`);
  }
}

function snapshotSaveSuccessOutcome(
  outcome: SaveSuccessOutcome,
): SaveSuccessOutcome {
  const kind = outcome.kind;
  const evidence = outcome.evidence;
  switch (kind) {
    case 'none':
    case 'half':
      return frozenPlain({ kind, evidence: snapshotPublicSourceRef(evidence) });
    case 'sourced_damage': {
      const damage = outcome.damage;
      const rollTransform = outcome.roll_transform;
      if (rollTransform !== 'none' && rollTransform !== 'floor_half') {
        throw new TypeError(
          `Successful-save roll transform is invalid: ${String(rollTransform)}.`,
        );
      }
      return frozenPlain({
        kind,
        evidence: snapshotPublicSourceRef(evidence),
        damage: snapshotNonEmptyArray(
          damage,
          snapshotDamageInstance,
          'Successful-save damage instances',
        ),
        roll_transform: rollTransform,
      });
    }
    default:
      throw new TypeError(`Successful-save outcome is invalid: ${String(kind)}.`);
  }
}

function snapshotRollState(state: RollState): RollState {
  if (!(rollStates as readonly unknown[]).includes(state)) {
    throw new TypeError(`Roll state is invalid: ${String(state)}.`);
  }
  return state;
}

function snapshotAbility(ability: Ability): Ability {
  if (!(abilities as readonly unknown[]).includes(ability)) {
    throw new TypeError(`Saving-throw ability is invalid: ${String(ability)}.`);
  }
  return ability;
}

function snapshotDamageResponse(response: TargetDamageResponse): TargetDamageResponse {
  const damageTypeValue = response.damage_type;
  const responseValue = response.response;
  if (!(damageResponses as readonly unknown[]).includes(responseValue)) {
    throw new TypeError(`Damage response is invalid: ${String(responseValue)}.`);
  }
  return frozenPlain({
    damage_type: snapshotDamageType(damageTypeValue),
    response: responseValue,
  });
}

export type AttackFoldTarget = {
  readonly armor_class: TargetArmorClass;
  readonly roll_state: RollState;
  readonly damage_responses: readonly TargetDamageResponse[];
};

export type SavingThrowFoldTarget = {
  readonly save_bonus: TargetSaveBonus;
  readonly damage_responses: readonly TargetDamageResponse[];
};

export function snapshotAttackFoldTarget(target: AttackFoldTarget): AttackFoldTarget {
  const armorClass = target.armor_class;
  const rollState = target.roll_state;
  const damageResponsesValue = target.damage_responses;
  return frozenPlain({
    armor_class: targetArmorClass(armorClass),
    roll_state: snapshotRollState(rollState),
    damage_responses: snapshotArray(damageResponsesValue, snapshotDamageResponse),
  });
}

export function snapshotSavingThrowFoldTarget(
  target: SavingThrowFoldTarget,
): SavingThrowFoldTarget {
  const saveBonus = target.save_bonus;
  const damageResponsesValue = target.damage_responses;
  return frozenPlain({
    save_bonus: targetSaveBonus(saveBonus),
    damage_responses: snapshotArray(damageResponsesValue, snapshotDamageResponse),
  });
}

export function snapshotTargetDamageResponses(
  responses: readonly TargetDamageResponse[],
): readonly TargetDamageResponse[] {
  return snapshotArray(responses, snapshotDamageResponse);
}

export function snapshotDamageComponents(
  components: readonly DamageComponent[],
): readonly DamageComponent[] {
  return snapshotArray(components, snapshotDamageComponent);
}

function snapshotCriticalHitRule(rule: CriticalHitRule): CriticalHitRule {
  const kind = rule.kind;
  const evidence = rule.evidence;
  switch (kind) {
    case 'natural_20':
      return frozenPlain({ kind, evidence: snapshotPublicSourceRef(evidence) });
    case 'expanded_range': {
      const minimumRoll = rule.minimum_roll;
      return frozenPlain({
        kind,
        minimum_roll: expandedCriticalMinimumRoll(minimumRoll),
        evidence: snapshotPublicSourceRef(evidence),
      });
    }
    default:
      throw new TypeError(`Critical-hit rule is invalid: ${String(kind)}.`);
  }
}

export function snapshotAttackRollEvent(event: AttackRollEvent): AttackRollEvent {
  const kind = event.kind;
  const eventId = event.event_id;
  const source = event.source;
  const clauseId = event.attack_roll_clause_id;
  const evidence = event.attack_roll_evidence;
  const attackBonus = event.attack_bonus;
  const frequency = event.frequency;
  const duration = event.duration;
  const critical = event.critical;
  const damage = event.damage;
  if (kind !== 'attack_roll' || duration.kind !== 'instantaneous') {
    throw new TypeError('Attack events must be instantaneous attack rolls.');
  }
  return frozenPlain({
    kind,
    event_id: routineEventId(eventId),
    source: snapshotSourceRef(source),
    attack_roll_clause_id: nonemptyKey(
      clauseId,
      'Attack-roll clause ID',
    ) as AttackRollClauseId,
    attack_roll_evidence: snapshotPublicSourceRef(evidence),
    attack_bonus: attackRollModifier(attackBonus),
    frequency: snapshotEventFrequency(frequency),
    duration: frozenPlain({ kind: 'instantaneous' }),
    critical: snapshotCriticalHitRule(critical),
    damage: snapshotNonEmptyArray(
      damage,
      snapshotAttackDamageInstance,
      'Attack damage instances',
    ),
  });
}

export function snapshotSavingThrowDamageEvent(
  event: SavingThrowDamageEvent,
): SavingThrowDamageEvent {
  const kind = event.kind;
  const eventId = event.event_id;
  const source = event.source;
  const ability = event.ability;
  const saveDc = event.save_dc;
  const rollState = event.roll_state;
  const frequency = event.frequency;
  const duration = event.duration;
  const clauseId = event.save_success_clause_id;
  const failedDamage = event.damage_on_failed_save;
  const onSuccess = event.on_success;
  if (kind !== 'saving_throw_damage') {
    throw new TypeError('Saving-throw damage event kind is invalid.');
  }
  return frozenPlain({
    kind,
    event_id: routineEventId(eventId),
    source: snapshotSourceRef(source),
    ability: snapshotAbility(ability),
    save_dc: saveDifficultyClass(saveDc),
    roll_state: snapshotRollState(rollState),
    frequency: snapshotEventFrequency(frequency),
    duration: snapshotSavingThrowDamageDuration(duration),
    save_success_clause_id: saveSuccessClauseId(clauseId),
    damage_on_failed_save: snapshotNonEmptyArray(
      failedDamage,
      snapshotDamageInstance,
      'Failed-save damage instances',
    ),
    on_success: snapshotSaveSuccessOutcome(onSuccess),
  });
}

export function snapshotAutomaticDamageEvent(
  event: AutomaticDamageEvent,
): AutomaticDamageEvent {
  const kind = event.kind;
  const eventId = event.event_id;
  const source = event.source;
  const clauseId = event.damage_clause_id;
  const evidence = event.evidence;
  const frequency = event.frequency;
  const duration = event.duration;
  const damage = event.damage;
  if (kind !== 'automatic_damage' || duration.kind !== 'instantaneous') {
    throw new TypeError('Automatic damage events must be instantaneous.');
  }
  return frozenPlain({
    kind,
    event_id: routineEventId(eventId),
    source: snapshotSourceRef(source),
    damage_clause_id: saveSuccessClauseId(clauseId),
    evidence: snapshotPublicSourceRef(evidence),
    frequency: snapshotEventFrequency(frequency),
    duration: frozenPlain({ kind: 'instantaneous' }),
    damage: snapshotNonEmptyArray(
      damage,
      snapshotDamageInstance,
      'Automatic damage instances',
    ),
  });
}

export type ApplySetupEvent = {
  readonly kind: 'setup';
  readonly event_id: RoutineEventId;
  readonly source: SourceRef;
  readonly action_cost: ActionCost;
  readonly duration: SetupDuration;
  readonly detail: string;
};

export type AtomicRoundEvent =
  | AttackRollEvent
  | SavingThrowDamageEvent
  | AutomaticDamageEvent
  | ApplySetupEvent;

export type ResourceGuardedEvent = {
  readonly kind: 'resource_guard';
  readonly resource: SimResourceId;
  readonly units: PositiveResourceCost;
  readonly when_available: NonEmptyReadonlyArray<AtomicRoundEvent>;
  readonly when_unavailable:
    | {
        readonly kind: 'use_fallback';
        readonly events: NonEmptyReadonlyArray<AtomicRoundEvent>;
      }
    | {
        readonly kind: 'omit_optional_effect';
        readonly evidence: PublicSourceRef;
      }
    | { readonly kind: 'refuse_routine'; readonly issue: UnmodelledIssue };
};

export type RoundEvent = AtomicRoundEvent | ResourceGuardedEvent;
export type RestKind = 'short_rest' | 'long_rest';
export type ResourceRecoveryRule =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'fixed';
      readonly amount: PositiveResourceRecoveryAmount;
      readonly evidence: ResourceRecoveryEvidence;
    }
  | {
      readonly kind: 'fixed_once_per_long_rest';
      readonly amount: PositiveResourceRecoveryAmount;
      readonly evidence: ResourceRecoveryEvidence;
    }
  | {
      readonly kind: 'all';
      readonly evidence: ResourceRecoveryEvidence;
    };

declare const resourceRecoveryEvidenceBrand: unique symbol;
export type ResourceRecoveryEvidence = {
  readonly clause_id: ResourceRecoveryClauseId;
  readonly resource_source: SourceRef;
  readonly citation: PublicSourceRef;
  readonly authorized_rest: RestKind;
  readonly authorized_rule_kind: Exclude<ResourceRecoveryRule['kind'], 'none'>;
  readonly authorized_amount: PositiveResourceRecoveryAmount | null;
  readonly [resourceRecoveryEvidenceBrand]: true;
};

export type ReviewedResourceRecoveryRow =
  | 'rage'
  | 'channel_divinity'
  | 'sorcerous_restoration'
  | 'font_of_magic';

export type ReviewedResourceRecoveryClause = {
  readonly id: ResourceRecoveryClauseId;
  readonly resource_source: SourceRef & { readonly kind: 'catalog_content' };
  readonly resource_stable_key: SourceStableKey;
  readonly citation: PublicSourceRef;
  readonly source_span_sha256: string;
  readonly semantics:
    | 'one_short_all_long'
    | 'half_maximum_once_short'
    | 'all_long';
};

/** Independently pinned raw-layout spans reviewed for each recovery row. */
export const reviewedResourceRecoverySourceSha256Oracle = Object.freeze({
  rage: 'a0fa93f47f37fe7007020547059719df42e2f21dea285c50e7728095b02f1597',
  channel_divinity: '94db73ece426e847fb992be76b5d3120697dfc9585cf3c2842e380651e84866e',
  sorcerous_restoration: '582185b2425346a940a89aec56cc94c88f8d527f434a283192a9778c374a342f',
  font_of_magic: '4be851bb7b5563c67479aa682afb062744401938e02bd142999dc00aad738d55',
} as const satisfies Record<ReviewedResourceRecoveryRow, string>);

function reviewedResourceRecoveryClause(
  row: ReviewedResourceRecoveryRow,
  id: string,
  resourceStableKey: string,
  heading: string,
  semantics: ReviewedResourceRecoveryClause['semantics'],
): ReviewedResourceRecoveryClause {
  const stableKey = sourceStableKey(resourceStableKey);
  const resourceSource = Object.freeze({
    kind: 'catalog_content' as const,
    content_key: String(stableKey) as ContentKey,
    stable_key: stableKey,
  });
  const citation = Object.freeze({
    kind: 'bundled_srd' as const,
    path: BUNDLED_SRD_5_2_1_PATH,
    heading: heading as BundledSrdHeading,
  });
  return Object.freeze({
    id: resourceRecoveryClauseId(id),
    resource_source: resourceSource,
    resource_stable_key: stableKey,
    citation,
    source_span_sha256: reviewedResourceRecoverySourceSha256Oracle[row],
    semantics,
  });
}

export const reviewedResourceRecoveryClauses = Object.freeze({
  rage: reviewedResourceRecoveryClause(
    'rage',
    'srd-5.2.1:class:barbarian:rage:recovery',
    'srd-5.2.1:class:barbarian:rage',
    'Level 1: Rage',
    'one_short_all_long',
  ),
  channel_divinity: reviewedResourceRecoveryClause(
    'channel_divinity',
    'srd-5.2.1:class:cleric:channel-divinity:recovery',
    'srd-5.2.1:class:cleric:channel-divinity',
    'Level 2: Channel Divinity',
    'one_short_all_long',
  ),
  sorcerous_restoration: reviewedResourceRecoveryClause(
    'sorcerous_restoration',
    'srd-5.2.1:class:sorcerer:sorcery-points:sorcerous-restoration',
    'srd-5.2.1:class:sorcerer:sorcery-points',
    'Level 5: Sorcerous Restoration',
    'half_maximum_once_short',
  ),
  font_of_magic: reviewedResourceRecoveryClause(
    'font_of_magic',
    'srd-5.2.1:class:sorcerer:sorcery-points:long-rest-recovery',
    'srd-5.2.1:class:sorcerer:sorcery-points',
    'Level 2: Font of Magic',
    'all_long',
  ),
} as const satisfies Record<string, ReviewedResourceRecoveryClause>);

const resourceRecoveryEvidenceManifest: ReadonlyMap<
  ResourceRecoveryClauseId,
  ReviewedResourceRecoveryClause
> = new Map(
  Object.values(reviewedResourceRecoveryClauses).map((clause) => [
    clause.id,
    clause,
  ]),
);
const mintedResourceRecoveryEvidence = new WeakSet<object>();

export function resourceRecoveryEvidence(
  resourceSource: SourceRef,
  clauseId: ResourceRecoveryClauseId,
  authorization: {
    readonly rest: RestKind;
    readonly rule_kind: Exclude<ResourceRecoveryRule['kind'], 'none'>;
    readonly amount: number | null;
    readonly maximum: number;
  },
): ResourceRecoveryEvidence {
  const {
    rest,
    rule_kind: ruleKind,
    amount,
    maximum: rawMaximum,
  } = authorization;
  const clause = resourceRecoveryEvidenceManifest.get(clauseId);
  if (
    clause === undefined ||
    !sameSourceRef(clause.resource_source, resourceSource)
  ) {
    throw new TypeError(
      'Resource-recovery evidence does not establish recovery for this resource source.',
    );
  }
  const maximum = positiveResourceMaximum(rawMaximum);
  const expected = (() => {
    switch (clause.semantics) {
      case 'one_short_all_long':
        return rest === 'short_rest'
          ? { rule_kind: 'fixed' as const, amount: 1 }
          : { rule_kind: 'all' as const, amount: null };
      case 'half_maximum_once_short':
        return rest === 'short_rest'
          ? {
              rule_kind: 'fixed_once_per_long_rest' as const,
              amount: Math.floor(maximum / 2),
            }
          : null;
      case 'all_long':
        return rest === 'long_rest'
          ? { rule_kind: 'all' as const, amount: null }
          : null;
    }
  })();
  if (
    expected === null ||
    expected.rule_kind !== ruleKind ||
    expected.amount !== amount
  ) {
    throw new TypeError(
      'Resource-recovery evidence does not authorize this rest, rule kind, and amount.',
    );
  }
  const evidence = Object.freeze({
    clause_id: clause.id,
    resource_source: clause.resource_source,
    citation: clause.citation,
    authorized_rest: rest,
    authorized_rule_kind: ruleKind,
    authorized_amount: amount === null
      ? null
      : positiveResourceRecoveryAmount(amount, maximum),
  }) as ResourceRecoveryEvidence;
  mintedResourceRecoveryEvidence.add(evidence);
  return evidence;
}

/**
 * Resource recovery is a pair of independently sourced rest rules. This shape
 * directly represents the repeated bundled-SRD rule used by Rage and Channel
 * Divinity: recover one use on a Short Rest and all uses on a Long Rest.
 */
export type ResourceRecovery = {
  readonly short_rest: ResourceRecoveryRule;
  readonly long_rest: ResourceRecoveryRule;
};

export type SimResourcePool = {
  readonly id: SimResourceId;
  /** Logical keys are unique; resource aliasing is unsupported. */
  readonly logical_key: SimResourcePoolKey;
  readonly source: SourceRef;
  readonly maximum: PositiveResourceMaximum;
  readonly recovery: ResourceRecovery;
};

const simResourcePoolSetBrand: unique symbol = Symbol('SimResourcePoolSet');
export type SimResourcePoolSet = readonly SimResourcePool[] & {
  readonly [simResourcePoolSetBrand]: true;
};

const mintedSimResourcePoolSets = new WeakSet<object>();
const logicalPoolIdentityBySet = new WeakMap<
  object,
  ReadonlyMap<SimResourceId, string>
>();
const resourcePoolsBySet = new WeakMap<
  object,
  ReadonlyMap<SimResourceId, SimResourcePool>
>();

export type ResourceRecoveryResult = {
  readonly recovered_units: number;
};

/**
 * Effect identity: two source refs name the same effect. The `right.kind ===`
 * re-checks are narrowing devices, not redundant guards — TypeScript narrows
 * `left` alone in the switch, so `right` has to be re-narrowed before its
 * arm-specific field is readable.
 *
 * Exported because `coverage.ts` needs exactly this predicate. It kept a
 * character-for-character copy until wave 5; one implementation means one set
 * of arms to cover.
 */
export function sameSourceRef(left: SourceRef, right: SourceRef): boolean {
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

/**
 * D267: `expended` is session-owned bounded-counter state (an integer in
 * 0..pool.maximum by construction inside ResourceRecoverySession), never
 * caller-supplied.
 */
function recoveredResourceUnits(
  pool: SimResourcePool,
  rest: RestKind,
  expended: number,
  oncePerLongRestUsed: boolean,
): ResourceRecoveryResult {
  const rule = pool.recovery[rest];
  const ruleKind = rule.kind;
  switch (ruleKind) {
    case 'none':
      return { recovered_units: 0 };
    case 'fixed': {
      const { amount, evidence } = rule;
      assertRecoveryEvidenceIsBound(
        pool.source,
        rest,
        ruleKind,
        amount,
        evidence,
      );
      return { recovered_units: Math.min(amount, expended) };
    }
    case 'fixed_once_per_long_rest': {
      const { amount, evidence } = rule;
      assertRecoveryEvidenceIsBound(
        pool.source,
        rest,
        ruleKind,
        amount,
        evidence,
      );
      return {
        recovered_units: oncePerLongRestUsed
          ? 0
          : Math.min(amount, expended),
      };
    }
    case 'all': {
      const { evidence } = rule;
      assertRecoveryEvidenceIsBound(
        pool.source,
        rest,
        ruleKind,
        null,
        evidence,
      );
      return { recovered_units: expended };
    }
  }
}

function assertRecoveryEvidenceIsBound(
  poolSource: SourceRef,
  rest: RestKind,
  ruleKind: Exclude<ResourceRecoveryRule['kind'], 'none'>,
  amount: PositiveResourceRecoveryAmount | null,
  evidence: ResourceRecoveryEvidence,
): void {
  if (!mintedResourceRecoveryEvidence.has(evidence)) {
    throw new TypeError(
      'Resource-recovery evidence must be minted by the reviewed evidence path.',
    );
  }
  if (
    !sameSourceRef(poolSource, evidence.resource_source) ||
    evidence.authorized_rest !== rest ||
    evidence.authorized_rule_kind !== ruleKind ||
    evidence.authorized_amount !== amount
  ) {
    throw new TypeError(
      'Resource-recovery evidence is not bound to this pool, rest, and recovery rule.',
    );
  }
}

export function simResourcePoolSet(
  pools: readonly SimResourcePool[],
): SimResourcePoolSet {
  const ids = new Set<SimResourceId>();
  const logicalKeys = new Set<SimResourcePoolKey>();
  const logicalIdentityById = new Map<SimResourceId, string>();
  const poolsById = new Map<SimResourceId, SimResourcePool>();
  const validatedPools: SimResourcePool[] = [];
  const poolCount = pools.length;
  if (!Number.isSafeInteger(poolCount) || poolCount < 0) {
    throw new TypeError('Simulation resource pools must have a valid length.');
  }
  for (let index = 0; index < poolCount; index += 1) {
    const callerPool = pools[index] as SimResourcePool;
    const rawId = callerPool.id;
    const rawLogicalKey = callerPool.logical_key;
    const rawSource = callerPool.source;
    const rawMaximum = callerPool.maximum;
    const rawRecovery = callerPool.recovery;
    const id = simResourceId(rawId);
    const logicalKey = simResourcePoolKey(rawLogicalKey);
    const maximum = positiveResourceMaximum(rawMaximum);
    const shortRest = rawRecovery.short_rest;
    const longRest = rawRecovery.long_rest;
    const pool = frozenPlain({
      id,
      logical_key: logicalKey,
      source: snapshotSourceRef(rawSource),
      maximum,
      recovery: frozenPlain({
        short_rest: snapshotResourceRecoveryRule(shortRest, maximum),
        long_rest: snapshotResourceRecoveryRule(longRest, maximum),
      }),
    });
    if (ids.has(id)) {
      throw new TypeError(`Duplicate simulation resource pool ID: ${id}.`);
    }
    ids.add(id);
    if (logicalKeys.has(logicalKey)) {
      throw new TypeError(
        `Simulation resource pool aliasing is unsupported; logical keys must be unique: ${logicalKey}.`,
      );
    }
    logicalKeys.add(logicalKey);
    logicalIdentityById.set(id, logicalKey);
    poolsById.set(id, pool);
    validatedPools.push(pool);
  }
  const frozen = Object.freeze(Object.assign(
    validatedPools,
    {
      [simResourcePoolSetBrand]: true as const,
    },
  ));
  mintedSimResourcePoolSets.add(frozen);
  logicalPoolIdentityBySet.set(frozen, logicalIdentityById);
  resourcePoolsBySet.set(frozen, poolsById);
  return frozen;
}

function snapshotResourceRecoveryRule(
  rule: ResourceRecoveryRule,
  maximum: PositiveResourceMaximum,
): ResourceRecoveryRule {
  const kind = rule.kind;
  switch (kind) {
    case 'none':
      return frozenPlain({ kind });
    case 'fixed':
    case 'fixed_once_per_long_rest': {
      const amount = rule.amount;
      const evidence = rule.evidence;
      return frozenPlain({
        kind,
        amount: positiveResourceRecoveryAmount(amount, maximum),
        evidence,
      });
    }
    case 'all': {
      const evidence = rule.evidence;
      return frozenPlain({ kind, evidence });
    }
    default:
      throw new TypeError(`Resource-recovery rule kind is invalid: ${String(kind)}.`);
  }
}

/**
 * D267: every pool in a session is a bounded counter — floor 0, ceiling
 * `pool.maximum` — owned by the session. Sessions start fully available
 * (long-rest state). `spend` subtracts and THROWS below zero (an
 * insufficient-resource spend is a simulator logic error, not a value to
 * clamp); recovery adds back clamped at the ceiling. The expended count fed
 * to the recovery rules is derived from this state, never caller-supplied.
 */
export class ResourceRecoverySession {
  readonly #pools: ReadonlyMap<SimResourceId, SimResourcePool>;
  readonly #logicalIdentityById: ReadonlyMap<SimResourceId, string>;
  readonly #oncePerLongRestUsed = new Map<string, boolean>();
  readonly #availableUnits = new Map<SimResourceId, number>();

  private constructor(pools: SimResourcePoolSet) {
    if (!mintedSimResourcePoolSets.has(pools)) {
      throw new TypeError('Recovery sessions require a validated pool set.');
    }
    const poolMap = resourcePoolsBySet.get(pools);
    const logicalIdentityMap = logicalPoolIdentityBySet.get(pools);
    if (poolMap === undefined || logicalIdentityMap === undefined) {
      throw new TypeError('Recovery sessions require a validated pool set.');
    }
    this.#pools = poolMap;
    this.#logicalIdentityById = logicalIdentityMap;
    for (const identity of this.#logicalIdentityById.values()) {
      this.#oncePerLongRestUsed.set(identity, false);
    }
    for (const [id, pool] of this.#pools) {
      this.#availableUnits.set(id, pool.maximum);
    }
  }

  static create(pools: SimResourcePoolSet): ResourceRecoverySession {
    return new ResourceRecoverySession(pools);
  }

  #poolAndAvailable(poolId: SimResourceId): {
    pool: SimResourcePool;
    available: number;
  } {
    const pool = this.#pools.get(poolId);
    const available = this.#availableUnits.get(poolId);
    if (pool === undefined || available === undefined) {
      throw new TypeError(`Recovery session has no resource pool ${poolId}.`);
    }
    return { pool, available };
  }

  availableUnits(poolId: SimResourceId): number {
    return this.#poolAndAvailable(poolId).available;
  }

  spend(poolId: SimResourceId, cost: unknown): number {
    const { available } = this.#poolAndAvailable(poolId);
    const spent = positiveResourceCost(cost);
    if (spent > available) {
      throw new RangeError(
        `Cannot spend ${String(spent)} resource units; only ` +
          `${String(available)} available in pool ${poolId}.`,
      );
    }
    const remaining = available - spent;
    this.#availableUnits.set(poolId, remaining);
    return remaining;
  }

  recover(poolId: SimResourceId, rest: RestKind): ResourceRecoveryResult {
    const { pool, available } = this.#poolAndAvailable(poolId);
    const logicalIdentity = this.#logicalIdentityById.get(poolId);
    if (logicalIdentity === undefined) {
      throw new TypeError(`Recovery state has no resource pool ${poolId}.`);
    }
    const used = this.#oncePerLongRestUsed.get(logicalIdentity);
    if (used === undefined) {
      throw new TypeError(`Recovery state has no resource pool ${poolId}.`);
    }
    const expended = pool.maximum - available;
    const result = recoveredResourceUnits(pool, rest, expended, used);
    this.#availableUnits.set(
      poolId,
      Math.min(available + result.recovered_units, pool.maximum),
    );
    if (rest === 'long_rest') {
      this.#oncePerLongRestUsed.set(logicalIdentity, false);
    } else if (
      pool.recovery.short_rest.kind === 'fixed_once_per_long_rest' &&
      !used &&
      result.recovered_units > 0
    ) {
      this.#oncePerLongRestUsed.set(logicalIdentity, true);
    }
    return result;
  }
}

export function createResourceRecoverySession(
  pools: SimResourcePoolSet,
): ResourceRecoverySession {
  return ResourceRecoverySession.create(pools);
}

export type RoundPlan = {
  readonly round: EncounterRoundOrdinal;
  readonly events: NonEmptyReadonlyArray<RoundEvent>;
};

export interface RoutinePlanner {
  plan(input: {
    readonly rounds: EncounterRoundCount;
    readonly resource_caps: readonly {
      readonly resource: SimResourceId;
      readonly cap: EncounterResourceCap;
    }[];
  }): RoutinePlanResult;
}

export type RoutinePlanResult =
  | {
      readonly status: 'planned';
      readonly rounds: NonEmptyReadonlyArray<RoundPlan>;
    }
  | {
      readonly status: 'unavailable';
      readonly issue: UnmodelledIssue & {
        readonly kind: 'routine_requires_unavailable_resource';
      };
    };

export type SupportedRoutine = {
  readonly id: CharacterAttackRoutineId;
  readonly label: string;
  readonly planner: RoutinePlanner;
};

export type SimulationInput = {
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
  readonly settings: SimulationSettings;
  readonly routine: SupportedRoutine;
  readonly resource_pools: SimResourcePoolSet;
  readonly assumptions: readonly SimulationAssumption[];
};

export type ModeledMechanic =
  | {
      readonly kind: 'round_event';
      readonly source: PublicSourceRef;
      readonly event: AtomicRoundEvent;
    }
  | {
      readonly kind: 'resource_pool';
      readonly source: PublicSourceRef;
      readonly pool: SimResourcePool;
    };

declare const damageNeutralityEvidenceBrand: unique symbol;
export type DamageNeutralityEvidence = {
  readonly mechanic: DamageNeutralMechanicId;
  readonly evidence: PublicSourceRef;
  readonly [damageNeutralityEvidenceBrand]: true;
};

export type CatalogMechanicCoverage =
  | { readonly status: 'modeled'; readonly mechanic: ModeledMechanic }
  | {
      readonly status: 'confirmed_damage_neutral';
      readonly proof: DamageNeutralityEvidence;
    }
  | {
      readonly status: 'unsupported_damage_relevant';
      readonly reason: string;
    }
  | { readonly status: 'unknown_relevance'; readonly reason: string };

export type EvaluatedMechanicCoverage =
  | {
      readonly status: 'applicable_and_modeled';
      readonly mechanic: ModeledMechanic;
    }
  | {
      readonly status: 'confirmed_damage_neutral';
      readonly proof: DamageNeutralityEvidence;
    }
  | {
      readonly status: 'confirmed_irrelevant_to_routine';
      readonly reason: string;
    }
  | { readonly status: 'blocking'; readonly issue: UnmodelledIssue };

export type RoundEventResult =
  | {
      readonly kind: 'attack_roll';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly hit_probability: Probability;
      readonly critical_probability: Probability;
      readonly expected_damage: ExpectedEventDamage;
    }
  | {
      readonly kind: 'saving_throw_damage';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly failed_save_probability: Probability;
      readonly expected_damage: ExpectedEventDamage;
    }
  | {
      readonly kind: 'automatic_damage';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly expected_damage: ExpectedEventDamage;
    }
  | {
      readonly kind: 'setup';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly detail: string;
    };

export type EventDamageContribution = {
  readonly event_id: RoutineEventId;
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly expected_damage: ExpectedEventDamage;
};

export type EncounterDamageContribution = {
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly expected_damage: ExpectedEncounterDamage;
};

export type CycleDamageContribution = {
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly expected_damage: ExpectedCycleDamage;
};

export type EncounterResourceSpend = {
  readonly resource: SimResourceId;
  readonly source: SourceRef;
  readonly units_spent: PositiveResourceCost;
  readonly recovery: ResourceRecovery;
};

export type CycleResourceSpend = EncounterResourceSpend;

export type RoundResult = {
  readonly round: EncounterRoundOrdinal;
  readonly expected_damage: ExpectedRoundDamage;
  readonly events: readonly RoundEventResult[];
  readonly contributions: readonly EventDamageContribution[];
};

export type EncounterResult = {
  readonly encounter: RestCycleEncounterOrdinal;
  readonly starts_after: 'long_rest' | 'short_rest' | 'no_rest';
  readonly expected_damage: ExpectedEncounterDamage;
  readonly rounds: NonEmptyReadonlyArray<RoundResult>;
  readonly contributions: readonly EncounterDamageContribution[];
  readonly resource_spending: readonly EncounterResourceSpend[];
};

export type SingleEncounterAfterLongRest = Omit<
  EncounterResult,
  'starts_after'
> & { readonly starts_after: 'long_rest' };

export type AnalysisWindow =
  | {
      readonly kind: 'single_encounter_after_long_rest';
      readonly encounter_damage: ExpectedEncounterDamage;
    }
  | {
      readonly kind: 'rest_cycle_average';
      readonly cadence: RestCadence;
      readonly total_cycle_rounds: TotalCycleRoundCount;
      readonly average_encounter_damage: ExpectedDamagePerEncounter;
      readonly rest_cycle_damage: ExpectedCycleDamage;
    };

type RestCycleRequest = DprSimulationRequest & {
  readonly settings: SimulationSettings & {
    readonly resources: Extract<
      ResourcePolicy,
      { readonly kind: 'budget_over_rest_cycle' }
    >;
  };
};

type SingleEncounterRequest = DprSimulationRequest & {
  readonly settings: SimulationSettings & {
    readonly resources: Extract<
      ResourcePolicy,
      { readonly kind: 'spend_available_after_long_rest' }
    >;
  };
};

export type CompleteDprSimulationResult =
  | {
      readonly status: 'complete';
      readonly analysis_kind: 'rest_cycle';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly request: RestCycleRequest;
      readonly average_damage_per_round: ExpectedDamagePerRound;
      readonly analysis_window: Extract<
        AnalysisWindow,
        { readonly kind: 'rest_cycle_average' }
      >;
      readonly encounters: NonEmptyReadonlyArray<EncounterResult>;
      readonly contributions: readonly CycleDamageContribution[];
      readonly resource_spending: readonly CycleResourceSpend[];
      readonly assumptions: readonly SimulationAssumption[];
    }
  | {
      readonly status: 'complete';
      readonly analysis_kind: 'single_encounter_after_long_rest';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly request: SingleEncounterRequest;
      readonly average_damage_per_round: ExpectedDamagePerRound;
      readonly analysis_window: Extract<
        AnalysisWindow,
        { readonly kind: 'single_encounter_after_long_rest' }
      >;
      readonly encounters: readonly [SingleEncounterAfterLongRest];
      readonly contributions: readonly EncounterDamageContribution[];
      readonly resource_spending: readonly EncounterResourceSpend[];
      readonly assumptions: readonly SimulationAssumption[];
    };

export type DprSimulationResult =
  | CompleteDprSimulationResult
  | {
      readonly status: 'unavailable';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly request_context: DprRequestContext;
      readonly issues: NonEmptyReadonlyArray<UnmodelledIssue>;
    }
  | {
      readonly status: 'revision_conflict';
      readonly character_id: CharacterId;
      readonly expected_revision: CharacterRevision;
      readonly current_revision: CharacterRevision;
    };

export type DprPresentationState =
  | { readonly status: 'loading' }
  | { readonly status: 'not_calculated'; readonly draft: DprScenarioDraft }
  | { readonly status: 'result'; readonly result: DprSimulationResult };
