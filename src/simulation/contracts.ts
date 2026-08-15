import type {
  CharacterId,
  CharacterRevision,
  CharacterWeaponId,
  ContentKey,
  SourceInstanceId,
  Brand,
} from '../domain/ids';
import type { Ability, DamageType, DieSize } from '../domain/enums';

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
  if (
    path.startsWith('/') ||
    path.startsWith('\\') ||
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

export type PublicSourceRef =
  | {
      readonly kind: 'bundled_srd';
      readonly path: BundledSrdPath;
      readonly heading: BundledSrdHeading;
    }
  | {
      readonly kind: 'project_owned';
      readonly path: ProjectOwnedSourcePath;
    };

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
const logicalPoolIdentityByIdBrand: unique symbol = Symbol(
  'LogicalPoolIdentityById',
);
export type SimResourcePoolSet = readonly SimResourcePool[] & {
  readonly [simResourcePoolSetBrand]: true;
  readonly [logicalPoolIdentityByIdBrand]: ReadonlyMap<SimResourceId, string>;
};

export type ResourceRecoveryResult = {
  readonly recovered_units: number;
};

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

function recoveredResourceUnits(
  pool: SimResourcePool,
  rest: RestKind,
  expendedUnits: unknown,
  oncePerLongRestUsed: boolean,
): ResourceRecoveryResult {
  const expended = integerInRange(
    expendedUnits,
    0,
    pool.maximum,
    'Expended resource units',
  );
  const rule = pool.recovery[rest];
  if (
    rule.kind !== 'none' &&
    (!sameSourceRef(pool.source, rule.evidence.resource_source) ||
      rule.evidence.authorized_rest !== rest ||
      rule.evidence.authorized_rule_kind !== rule.kind ||
      (rule.kind !== 'all' &&
        rule.evidence.authorized_amount !== rule.amount) ||
      (rule.kind === 'all' && rule.evidence.authorized_amount !== null))
  ) {
    throw new TypeError(
      'Resource-recovery evidence is not bound to this pool, rest, and recovery rule.',
    );
  }
  switch (rule.kind) {
    case 'none':
      return { recovered_units: 0 };
    case 'fixed':
      return { recovered_units: Math.min(rule.amount, expended) };
    case 'fixed_once_per_long_rest':
      return {
        recovered_units: oncePerLongRestUsed
          ? 0
          : Math.min(rule.amount, expended),
      };
    case 'all':
      return { recovered_units: expended };
  }
}

export function simResourcePoolSet(
  pools: readonly SimResourcePool[],
): SimResourcePoolSet {
  const ids = new Set<SimResourceId>();
  const logicalKeys = new Set<SimResourcePoolKey>();
  const logicalIdentityById = new Map<SimResourceId, string>();
  for (const pool of pools) {
    if (ids.has(pool.id)) {
      throw new TypeError(`Duplicate simulation resource pool ID: ${pool.id}.`);
    }
    ids.add(pool.id);
    if (logicalKeys.has(pool.logical_key)) {
      throw new TypeError(
        `Simulation resource pool aliasing is unsupported; logical keys must be unique: ${pool.logical_key}.`,
      );
    }
    logicalKeys.add(pool.logical_key);
    logicalIdentityById.set(pool.id, pool.logical_key);
  }
  return Object.freeze(Object.assign(
    [...pools],
    {
      [simResourcePoolSetBrand]: true as const,
      [logicalPoolIdentityByIdBrand]: logicalIdentityById,
    },
  ));
}

export class ResourceRecoverySession {
  readonly #pools: ReadonlyMap<SimResourceId, SimResourcePool>;
  readonly #logicalIdentityById: ReadonlyMap<SimResourceId, string>;
  readonly #oncePerLongRestUsed = new Map<string, boolean>();

  private constructor(pools: SimResourcePoolSet) {
    if (pools[simResourcePoolSetBrand] !== true) {
      throw new TypeError('Recovery sessions require a validated pool set.');
    }
    this.#pools = new Map(pools.map((pool) => [pool.id, pool]));
    this.#logicalIdentityById = pools[logicalPoolIdentityByIdBrand];
    for (const identity of this.#logicalIdentityById.values()) {
      this.#oncePerLongRestUsed.set(identity, false);
    }
  }

  static create(pools: SimResourcePoolSet): ResourceRecoverySession {
    return new ResourceRecoverySession(pools);
  }

  recover(
    poolId: SimResourceId,
    rest: RestKind,
    expendedUnits: unknown,
  ): ResourceRecoveryResult {
    const pool = this.#pools.get(poolId);
    if (pool === undefined) {
      throw new TypeError(`Recovery session has no resource pool ${poolId}.`);
    }
    const logicalIdentity = this.#logicalIdentityById.get(poolId);
    if (logicalIdentity === undefined) {
      throw new TypeError(`Recovery state has no resource pool ${poolId}.`);
    }
    const used = this.#oncePerLongRestUsed.get(logicalIdentity);
    if (used === undefined) {
      throw new TypeError(`Recovery state has no resource pool ${poolId}.`);
    }
    const result = recoveredResourceUnits(pool, rest, expendedUnits, used);
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
