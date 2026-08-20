import type { Ability } from '../domain/enums';
import type { RollMode } from './resolution';
import type { CombatantId } from './values';

export const conditionNames = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const;

export type ConditionName = (typeof conditionNames)[number];
export type ExhaustionLevel = 1 | 2 | 3 | 4 | 5 | 6;

type SourceConditionName = 'Charmed' | 'Frightened' | 'Grappled';
type SimpleConditionName = Exclude<
  ConditionName,
  SourceConditionName | 'Exhaustion'
>;

export type AppliedCondition =
  | { readonly name: SimpleConditionName }
  | {
      readonly name: SourceConditionName;
      readonly source: CombatantId;
    }
  | { readonly name: 'Exhaustion'; readonly level: ExhaustionLevel };

type ConditionMechanics =
  | {
      readonly kind: 'blinded';
      readonly cannotSee: true;
      readonly automaticallyFailsSightChecks: true;
      readonly attacksBy: 'disadvantage';
      readonly attacksAgainst: 'advantage';
    }
  | {
      readonly kind: 'charmed';
      readonly cannotHarmSource: true;
      readonly sourceSocialChecks: 'advantage';
    }
  | {
      readonly kind: 'deafened';
      readonly cannotHear: true;
      readonly automaticallyFailsHearingChecks: true;
    }
  | {
      readonly kind: 'exhaustion';
      readonly cumulative: true;
      readonly deathLevel: 6;
      readonly d20PenaltyPerLevel: -2;
      readonly speedPenaltyFeetPerLevel: -5;
      readonly longRestLevelsRemoved: 1;
    }
  | {
      readonly kind: 'frightened';
      readonly checksAndAttacksWhileSourceVisible: 'disadvantage';
      readonly cannotWillinglyApproachSource: true;
    }
  | {
      readonly kind: 'grappled';
      readonly speed: 0;
      readonly attacksAgainstNonSource: 'disadvantage';
      readonly grapplerExtraMovementCostPerFoot: 1;
      readonly tinyOrTwoSizesSmallerExempt: true;
    }
  | {
      readonly kind: 'incapacitated';
      readonly actions: false;
      readonly bonusActions: false;
      readonly reactions: false;
      readonly breaksConcentration: true;
      readonly canSpeak: false;
      readonly initiative: 'disadvantage';
    }
  | {
      readonly kind: 'invisible';
      readonly initiative: 'advantage';
      readonly cannotBeTargetedBySightRequirement: true;
      readonly carriedEquipmentConcealed: true;
      readonly attacksBy: 'advantage';
      readonly attacksAgainst: 'disadvantage';
      readonly seenCreatureIgnoresAttackBenefit: true;
    }
  | {
      readonly kind: 'paralyzed';
      readonly incapacitated: true;
      readonly speed: 0;
      readonly automaticallyFailsSaves: readonly ['strength', 'dexterity'];
      readonly attacksAgainst: 'advantage';
      readonly hitsWithinFeetAreCritical: 5;
    }
  | {
      readonly kind: 'petrified';
      readonly inanimateTransformation: true;
      readonly nonmagicalEquipmentTransformed: true;
      readonly weightMultiplier: 10;
      readonly stopsAging: true;
      readonly incapacitated: true;
      readonly speed: 0;
      readonly attacksAgainst: 'advantage';
      readonly automaticallyFailsSaves: readonly ['strength', 'dexterity'];
      readonly allDamage: 'resistant';
      readonly conditionImmunity: 'Poisoned';
    }
  | {
      readonly kind: 'poisoned';
      readonly attacksAndAbilityChecks: 'disadvantage';
    }
  | {
      readonly kind: 'prone';
      readonly movement: 'crawl_or_spend_half_speed_to_end';
      readonly cannotRiseAtSpeedZero: true;
      readonly attacksBy: 'disadvantage';
      readonly attacksAgainstWithinFeet: 'advantage';
      readonly attacksAgainstBeyondFeet: 'disadvantage';
      readonly distanceFeet: 5;
    }
  | {
      readonly kind: 'restrained';
      readonly speed: 0;
      readonly attacksBy: 'disadvantage';
      readonly attacksAgainst: 'advantage';
      readonly dexteritySaves: 'disadvantage';
    }
  | {
      readonly kind: 'stunned';
      readonly incapacitated: true;
      readonly automaticallyFailsSaves: readonly ['strength', 'dexterity'];
      readonly attacksAgainst: 'advantage';
    }
  | {
      readonly kind: 'unconscious';
      readonly incapacitated: true;
      readonly prone: true;
      readonly dropsHeldItems: true;
      readonly remainsProneWhenEnded: true;
      readonly speed: 0;
      readonly attacksAgainst: 'advantage';
      readonly automaticallyFailsSaves: readonly ['strength', 'dexterity'];
      readonly hitsWithinFeetAreCritical: 5;
      readonly unaware: true;
    };

export interface ConditionManifestRow {
  readonly condition: ConditionName;
  readonly inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54';
  readonly mechanicsSource: string;
  readonly mechanicalClauseCount: number;
  readonly mechanics: ConditionMechanics;
}

/**
 * Complete SRD 5.2.1 condition inventory. The readable inventory is the
 * registered source extract; mechanics locators point into the bundled full
 * text where each glossary entry is printed.
 */
export const conditionCoverageManifest: readonly ConditionManifestRow[] = [
  {
    condition: 'Blinded',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11348-11354',
    mechanicalClauseCount: 2,
    mechanics: {
      kind: 'blinded',
      cannotSee: true,
      automaticallyFailsSightChecks: true,
      attacksBy: 'disadvantage',
      attacksAgainst: 'advantage',
    },
  },
  {
    condition: 'Charmed',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11457-11470',
    mechanicalClauseCount: 2,
    mechanics: {
      kind: 'charmed',
      cannotHarmSource: true,
      sourceSocialChecks: 'advantage',
    },
  },
  {
    condition: 'Deafened',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11627-11631',
    mechanicalClauseCount: 1,
    mechanics: {
      kind: 'deafened',
      cannotHear: true,
      automaticallyFailsHearingChecks: true,
    },
  },
  {
    condition: 'Exhaustion',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11676-11688',
    mechanicalClauseCount: 4,
    mechanics: {
      kind: 'exhaustion',
      cumulative: true,
      deathLevel: 6,
      d20PenaltyPerLevel: -2,
      speedPenaltyFeetPerLevel: -5,
      longRestLevelsRemoved: 1,
    },
  },
  {
    condition: 'Frightened',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11740-11747',
    mechanicalClauseCount: 2,
    mechanics: {
      kind: 'frightened',
      checksAndAttacksWhileSourceVisible: 'disadvantage',
      cannotWillinglyApproachSource: true,
    },
  },
  {
    condition: 'Grappled',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11693-11702',
    mechanicalClauseCount: 3,
    mechanics: {
      kind: 'grappled',
      speed: 0,
      attacksAgainstNonSource: 'disadvantage',
      grapplerExtraMovementCostPerFoot: 1,
      tinyOrTwoSizesSmallerExempt: true,
    },
  },
  {
    condition: 'Incapacitated',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11826-11834',
    mechanicalClauseCount: 4,
    mechanics: {
      kind: 'incapacitated',
      actions: false,
      bonusActions: false,
      reactions: false,
      breaksConcentration: true,
      canSpeak: false,
      initiative: 'disadvantage',
    },
  },
  {
    condition: 'Invisible',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11838-11850',
    mechanicalClauseCount: 3,
    mechanics: {
      kind: 'invisible',
      initiative: 'advantage',
      cannotBeTargetedBySightRequirement: true,
      carriedEquipmentConcealed: true,
      attacksBy: 'advantage',
      attacksAgainst: 'disadvantage',
      seenCreatureIgnoresAttackBenefit: true,
    },
  },
  {
    condition: 'Paralyzed',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11952-11963',
    mechanicalClauseCount: 5,
    mechanics: {
      kind: 'paralyzed',
      incapacitated: true,
      speed: 0,
      automaticallyFailsSaves: ['strength', 'dexterity'],
      attacksAgainst: 'advantage',
      hitsWithinFeetAreCritical: 5,
    },
  },
  {
    condition: 'Petrified',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11984-12002',
    mechanicalClauseCount: 7,
    mechanics: {
      kind: 'petrified',
      inanimateTransformation: true,
      nonmagicalEquipmentTransformed: true,
      weightMultiplier: 10,
      stopsAging: true,
      incapacitated: true,
      speed: 0,
      attacksAgainst: 'advantage',
      automaticallyFailsSaves: ['strength', 'dexterity'],
      allDamage: 'resistant',
      conditionImmunity: 'Poisoned',
    },
  },
  {
    condition: 'Poisoned',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11952-11956',
    mechanicalClauseCount: 1,
    mechanics: {
      kind: 'poisoned',
      attacksAndAbilityChecks: 'disadvantage',
    },
  },
  {
    condition: 'Prone',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:11970-11981',
    mechanicalClauseCount: 2,
    mechanics: {
      kind: 'prone',
      movement: 'crawl_or_spend_half_speed_to_end',
      cannotRiseAtSpeedZero: true,
      attacksBy: 'disadvantage',
      attacksAgainstWithinFeet: 'advantage',
      attacksAgainstBeyondFeet: 'disadvantage',
      distanceFeet: 5,
    },
  },
  {
    condition: 'Restrained',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:12032-12039',
    mechanicalClauseCount: 3,
    mechanics: {
      kind: 'restrained',
      speed: 0,
      attacksBy: 'disadvantage',
      attacksAgainst: 'advantage',
      dexteritySaves: 'disadvantage',
    },
  },
  {
    condition: 'Stunned',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:12167-12175',
    mechanicalClauseCount: 3,
    mechanics: {
      kind: 'stunned',
      incapacitated: true,
      automaticallyFailsSaves: ['strength', 'dexterity'],
      attacksAgainst: 'advantage',
    },
  },
  {
    condition: 'Unconscious',
    inventorySource: 'docs/srd/source/domain-vocabularies.txt:30-54',
    mechanicsSource: 'docs/srd/full/srd-5.2.1.txt:12295-12310',
    mechanicalClauseCount: 6,
    mechanics: {
      kind: 'unconscious',
      incapacitated: true,
      prone: true,
      dropsHeldItems: true,
      remainsProneWhenEnded: true,
      speed: 0,
      attacksAgainst: 'advantage',
      automaticallyFailsSaves: ['strength', 'dexterity'],
      hitsWithinFeetAreCritical: 5,
      unaware: true,
    },
  },
];

export type MechanicalClause =
  | { readonly kind: 'cannot_see'; readonly autoFailSightChecks: true }
  | { readonly kind: 'cannot_hear'; readonly autoFailHearingChecks: true }
  | {
      readonly kind: 'roll_mode';
      readonly roll: 'attack_by' | 'attack_against' | 'ability_check' | 'initiative' | 'dexterity_save';
      readonly mode: Exclude<RollMode, 'normal'>;
      readonly predicate:
        | 'always'
        | 'source_visible'
        | 'target_not_source'
        | 'recipient_unseen'
        | 'attacker_within_5_feet'
        | 'attacker_beyond_5_feet';
      readonly source?: CombatantId;
    }
  | { readonly kind: 'cannot_harm'; readonly target: CombatantId }
  | { readonly kind: 'social_advantage_for'; readonly source: CombatantId }
  | {
      readonly kind: 'exhaustion';
      readonly level: ExhaustionLevel;
      readonly d20Penalty: number;
      readonly speedPenaltyFeet: number;
      readonly dies: boolean;
      readonly longRestLevelsRemoved: 1;
    }
  | { readonly kind: 'cannot_approach'; readonly source: CombatantId }
  | { readonly kind: 'speed_zero' }
  | {
      readonly kind: 'grapple_movable';
      readonly source: CombatantId;
      readonly extraCostPerFoot: 1;
      readonly sizeExemption: 'tiny_or_two_sizes_smaller';
    }
  | {
      readonly kind: 'inactive';
      readonly action: false;
      readonly bonusAction: false;
      readonly reaction: false;
    }
  | { readonly kind: 'breaks_concentration' }
  | { readonly kind: 'cannot_speak' }
  | {
      readonly kind: 'concealed';
      readonly sightRequiredEffectsCannotTarget: true;
      readonly equipmentConcealed: true;
    }
  | {
      readonly kind: 'automatic_save_failure';
      readonly abilities: readonly Ability[];
    }
  | { readonly kind: 'critical_if_hit_within'; readonly feet: 5 }
  | {
      readonly kind: 'inanimate_transformation';
      readonly equipment: 'nonmagical';
      readonly weightMultiplier: 10;
      readonly stopsAging: true;
    }
  | { readonly kind: 'all_damage_response'; readonly response: 'resistant' }
  | { readonly kind: 'condition_immunity'; readonly condition: 'Poisoned' }
  | {
      readonly kind: 'prone_movement';
      readonly options: 'crawl_or_spend_half_speed_to_end';
      readonly cannotRiseAtSpeedZero: true;
    }
  | {
      readonly kind: 'inert';
      readonly prone: true;
      readonly dropsHeldItems: true;
      readonly remainsProneWhenEnded: true;
    }
  | { readonly kind: 'unaware' };

export interface ConditionMechanicalState {
  readonly clauses: readonly MechanicalClause[];
  readonly handledManifestRows: readonly ConditionName[];
}

function manifestRow(condition: ConditionName): ConditionManifestRow {
  const row = conditionCoverageManifest.find(
    (candidate) => candidate.condition === condition,
  );
  if (row === undefined) {
    throw new Error(`Condition manifest is missing ${condition}.`);
  }
  return row;
}

function sourceOf(
  condition: AppliedCondition & { readonly name: SourceConditionName },
): CombatantId {
  return condition.source;
}

/** Exhaustively translates every manifest row into typed mechanical clauses. */
export function conditionMechanicalState(
  conditions: readonly AppliedCondition[],
): ConditionMechanicalState {
  const clauses: MechanicalClause[] = [];
  const handledManifestRows: ConditionName[] = [];

  for (const condition of conditions) {
    const row = manifestRow(condition.name);
    handledManifestRows.push(row.condition);
    switch (row.mechanics.kind) {
      case 'blinded':
        clauses.push(
          { kind: 'cannot_see', autoFailSightChecks: true },
          { kind: 'roll_mode', roll: 'attack_by', mode: 'disadvantage', predicate: 'always' },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'advantage', predicate: 'always' },
        );
        break;
      case 'charmed': {
        if (condition.name !== 'Charmed') throw new Error('Condition manifest mismatch.');
        const source = sourceOf(condition);
        clauses.push(
          { kind: 'cannot_harm', target: source },
          { kind: 'social_advantage_for', source },
        );
        break;
      }
      case 'deafened':
        clauses.push({ kind: 'cannot_hear', autoFailHearingChecks: true });
        break;
      case 'exhaustion':
        if (condition.name !== 'Exhaustion') throw new Error('Condition manifest mismatch.');
        clauses.push({
          kind: 'exhaustion',
          level: condition.level,
          d20Penalty: row.mechanics.d20PenaltyPerLevel * condition.level,
          speedPenaltyFeet: row.mechanics.speedPenaltyFeetPerLevel * condition.level,
          dies: condition.level >= row.mechanics.deathLevel,
          longRestLevelsRemoved: row.mechanics.longRestLevelsRemoved,
        });
        break;
      case 'frightened': {
        if (condition.name !== 'Frightened') throw new Error('Condition manifest mismatch.');
        const source = sourceOf(condition);
        clauses.push(
          { kind: 'roll_mode', roll: 'ability_check', mode: 'disadvantage', predicate: 'source_visible', source },
          { kind: 'roll_mode', roll: 'attack_by', mode: 'disadvantage', predicate: 'source_visible', source },
          { kind: 'cannot_approach', source },
        );
        break;
      }
      case 'grappled': {
        if (condition.name !== 'Grappled') throw new Error('Condition manifest mismatch.');
        const source = sourceOf(condition);
        clauses.push(
          { kind: 'speed_zero' },
          { kind: 'roll_mode', roll: 'attack_by', mode: 'disadvantage', predicate: 'target_not_source', source },
          { kind: 'grapple_movable', source, extraCostPerFoot: 1, sizeExemption: 'tiny_or_two_sizes_smaller' },
        );
        break;
      }
      case 'incapacitated':
        clauses.push(
          { kind: 'inactive', action: false, bonusAction: false, reaction: false },
          { kind: 'breaks_concentration' },
          { kind: 'cannot_speak' },
          { kind: 'roll_mode', roll: 'initiative', mode: 'disadvantage', predicate: 'always' },
        );
        break;
      case 'invisible':
        clauses.push(
          { kind: 'roll_mode', roll: 'initiative', mode: 'advantage', predicate: 'always' },
          { kind: 'concealed', sightRequiredEffectsCannotTarget: true, equipmentConcealed: true },
          { kind: 'roll_mode', roll: 'attack_by', mode: 'advantage', predicate: 'recipient_unseen' },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'disadvantage', predicate: 'recipient_unseen' },
        );
        break;
      case 'paralyzed':
        clauses.push(
          { kind: 'inactive', action: false, bonusAction: false, reaction: false },
          { kind: 'breaks_concentration' },
          { kind: 'cannot_speak' },
          { kind: 'speed_zero' },
          { kind: 'automatic_save_failure', abilities: row.mechanics.automaticallyFailsSaves },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'advantage', predicate: 'always' },
          { kind: 'critical_if_hit_within', feet: row.mechanics.hitsWithinFeetAreCritical },
        );
        break;
      case 'petrified':
        clauses.push(
          { kind: 'inanimate_transformation', equipment: 'nonmagical', weightMultiplier: 10, stopsAging: true },
          { kind: 'inactive', action: false, bonusAction: false, reaction: false },
          { kind: 'breaks_concentration' },
          { kind: 'cannot_speak' },
          { kind: 'speed_zero' },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'advantage', predicate: 'always' },
          { kind: 'automatic_save_failure', abilities: row.mechanics.automaticallyFailsSaves },
          { kind: 'all_damage_response', response: 'resistant' },
          { kind: 'condition_immunity', condition: row.mechanics.conditionImmunity },
        );
        break;
      case 'poisoned':
        clauses.push(
          { kind: 'roll_mode', roll: 'attack_by', mode: 'disadvantage', predicate: 'always' },
          { kind: 'roll_mode', roll: 'ability_check', mode: 'disadvantage', predicate: 'always' },
        );
        break;
      case 'prone':
        clauses.push(
          { kind: 'prone_movement', options: row.mechanics.movement, cannotRiseAtSpeedZero: true },
          { kind: 'roll_mode', roll: 'attack_by', mode: 'disadvantage', predicate: 'always' },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'advantage', predicate: 'attacker_within_5_feet' },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'disadvantage', predicate: 'attacker_beyond_5_feet' },
        );
        break;
      case 'restrained':
        clauses.push(
          { kind: 'speed_zero' },
          { kind: 'roll_mode', roll: 'attack_by', mode: 'disadvantage', predicate: 'always' },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'advantage', predicate: 'always' },
          { kind: 'roll_mode', roll: 'dexterity_save', mode: 'disadvantage', predicate: 'always' },
        );
        break;
      case 'stunned':
        clauses.push(
          { kind: 'inactive', action: false, bonusAction: false, reaction: false },
          { kind: 'breaks_concentration' },
          { kind: 'cannot_speak' },
          { kind: 'automatic_save_failure', abilities: row.mechanics.automaticallyFailsSaves },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'advantage', predicate: 'always' },
        );
        break;
      case 'unconscious':
        clauses.push(
          { kind: 'inert', prone: true, dropsHeldItems: true, remainsProneWhenEnded: true },
          { kind: 'inactive', action: false, bonusAction: false, reaction: false },
          { kind: 'breaks_concentration' },
          { kind: 'cannot_speak' },
          { kind: 'speed_zero' },
          { kind: 'roll_mode', roll: 'attack_against', mode: 'advantage', predicate: 'always' },
          { kind: 'automatic_save_failure', abilities: row.mechanics.automaticallyFailsSaves },
          { kind: 'critical_if_hit_within', feet: row.mechanics.hitsWithinFeetAreCritical },
          { kind: 'unaware' },
        );
        break;
    }
  }

  return { clauses, handledManifestRows };
}

export function isIncapacitated(
  conditions: readonly AppliedCondition[],
): boolean {
  return conditionMechanicalState(conditions).clauses.some(
    (clause) => clause.kind === 'inactive',
  );
}

export function exhaustionPenalty(
  conditions: readonly AppliedCondition[],
): number {
  return conditionMechanicalState(conditions).clauses.reduce(
    (penalty, clause) =>
      clause.kind === 'exhaustion' ? penalty + clause.d20Penalty : penalty,
    0,
  );
}

export function conditionSpeedPenaltyFeet(
  conditions: readonly AppliedCondition[],
): number {
  const state = conditionMechanicalState(conditions);
  if (state.clauses.some((clause) => clause.kind === 'speed_zero')) return Number.NEGATIVE_INFINITY;
  return state.clauses.reduce(
    (penalty, clause) =>
      clause.kind === 'exhaustion' ? penalty + clause.speedPenaltyFeet : penalty,
    0,
  );
}
