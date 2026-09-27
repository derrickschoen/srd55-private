import type { SrdRuleId } from './rule-index';
import type { SrdSpan } from './rule-index-types';

/**
 * WHAT A RULE'S STATUS CAN BE (owner D918: the synthesis §5 "represented"
 * definition is binding).
 *
 * A rule is REPRESENTED when it has an id (`SrdRuleId`), its data is typed
 * `as const satisfies`, and it has one of these statuses. Consumers switch on
 * `status` with no default arm and refuse `typed_only` and a `partial` rule's
 * missing clauses by type, naming the capability, instead of falling back.
 * Nothing is "unknown": a rule that is represented but not executed is
 * "sourced, not executed", with the capability it awaits (Part A,
 * D33/D67/D95/D256).
 *
 * `unrepresented` is TRANSITIONAL. The rules program ends when that member is
 * deleted from this union, which makes "every SRD rule is represented" a
 * compile-time fact.
 */

/** An owner decision, as `.claude/decisions.md` numbers it (`D918`, `D617.36`). */
export type DecisionId = `D${number}`;

/**
 * A witness: a test file and the exact title of one test in it, as written in
 * the source (a parameterised title keeps its `%s`). The witness-resolution
 * test (tests/unit/rules/srd-rule-status.test.ts) proves each one exists.
 */
export type TestRef = `tests/${string}.test.ts::${string}`;

/** One clause of a rule: the 1-based index into the rule's clause tuple, once a unit types it. */
export type SubRuleId = `${SrdRuleId}#${number}`;

/**
 * The units that represent or execute rules: the D918 queue and the SRD-TYPED
 * ranked plan (synthesis §6.2). `UNASSIGNED` is honest: no planned unit owns
 * the rule yet, which is an owner question, never a silent default.
 */
export const UNIT_IDS = [
  'FOOTPRINT',
  'MOVE-COST',
  'SQUEEZE-COMBAT',
  'SQUEEZE-THROUGH',
  'COVER-EDGE',
  'SRD-BUILDTIME',
  'RULE-INDEX',
  'CONDITION-D20',
  'PC-EXPORT-TRUTH',
  'CLASS-TABLES',
  'SPELL-HEADERS',
  'MOVEMENT-MODES',
  'FEATURE-REGISTRY',
  'SHEET-NUMBERS',
  'WEAPONS-ARMOR-DATA',
  'MON-TABLES',
  'MON-VOCAB',
  'ORIGINS-FEATS',
  'SPELL-GAP-CODES',
  'SPELL-EFFECT-FACTS',
  'SRD-MONSTERS',
  'WORLD-TOOLBOX',
  'MAGIC-ITEMS',
  'OWNER-GATED-ROWS',
  'WEAPON-EXEC',
  'MONSTER-EXEC',
  'ACTIONS-COMPLETE',
  'PC-ENGINE-BIND',
  'EFFECT-VOCAB-CONVERGE',
  'ABSENT-SPELLS',
  'UNASSIGNED',
] as const;
export type UnitId = (typeof UNIT_IDS)[number];

/**
 * What an unexecuted rule waits for. A CAPABILITY is something the engine
 * cannot yet do; it is not a preference (that is `excluded_by_owner`), so a
 * rule awaiting one re-enters automatically when the capability lands
 * (D345/D356/D373.1).
 */
export const CAPABILITIES = [
  'movement_modes',
  'movement_cost_kinds',
  'squeeze_combat',
  'cover_edges',
  'perception_filters',
  'object_state',
  'zones',
  'summons',
  'plane_state',
  'inventory',
  'exploration',
  'social',
  'lair_state',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** The unit that delivers each capability. */
export const CAPABILITY_OWNER = {
  movement_modes: 'MOVEMENT-MODES',
  movement_cost_kinds: 'MOVE-COST',
  squeeze_combat: 'SQUEEZE-COMBAT',
  cover_edges: 'COVER-EDGE',
  perception_filters: 'UNASSIGNED',
  object_state: 'UNASSIGNED',
  zones: 'UNASSIGNED',
  summons: 'UNASSIGNED',
  plane_state: 'UNASSIGNED',
  inventory: 'UNASSIGNED',
  exploration: 'WORLD-TOOLBOX',
  social: 'ACTIONS-COMPLETE',
  lair_state: 'MONSTER-EXEC',
} as const satisfies { readonly [C in Capability]: UnitId };

export interface MissingClause {
  readonly clause: SubRuleId;
  readonly awaiting: Capability;
}

export type RuleStatus =
  /** Every clause executes; each witness is a test that fails if it stops. */
  | { readonly status: 'executed'; readonly witness: readonly [TestRef, ...TestRef[]] }
  /** Some clauses execute (witnessed); the rest are named with what they await. */
  | {
      readonly status: 'partial';
      readonly witness: readonly [TestRef, ...TestRef[]];
      readonly missing: readonly [MissingClause, ...MissingClause[]];
    }
  /** Its data is typed and nothing executes it yet. */
  | { readonly status: 'typed_only'; readonly awaiting: readonly [Capability, ...Capability[]] }
  /** Represented as data; the owner ruled it out of execution. */
  | { readonly status: 'excluded_by_owner'; readonly decision: DecisionId }
  /** Nothing to execute. */
  | { readonly status: 'not_executable'; readonly reason: 'definitional' | 'gm_narrative' | 'table_adjudicated' }
  /** The SRD contradicts itself; the spans say where, the ruling (if any) which reading holds. */
  | { readonly status: 'source_disagreement'; readonly spans: readonly [SrdSpan, SrdSpan, ...SrdSpan[]]; readonly ruling: DecisionId | null }
  /** TRANSITIONAL: identified, not yet typed; `unit` is who types it. */
  | { readonly status: 'unrepresented'; readonly unit: UnitId };

export type RuleStatusName = RuleStatus['status'];

/** The statuses in the order the coverage report lists them. */
export const RULE_STATUS_NAMES = [
  'executed',
  'partial',
  'typed_only',
  'excluded_by_owner',
  'not_executable',
  'source_disagreement',
  'unrepresented',
] as const satisfies readonly RuleStatusName[];
