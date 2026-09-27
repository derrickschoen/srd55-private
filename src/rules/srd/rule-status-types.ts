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
 * A STATUS NEVER CLAIMS MORE THAN ITS EVIDENCE HOLDS. Every status other than
 * `unrepresented`, `excluded_by_owner`, `not_executable` and
 * `source_disagreement` names the rule's clauses, each QUOTED from the rule's
 * printed text, and together the quotes must cover all of that text (the
 * status test re-reads the spans). An `executed` clause names the test that
 * fails if it stops and the assertion in that test that states its effect; a
 * `typed_only` clause names the declaration that types it and the member that
 * does. A clause no type holds cannot be quoted anywhere, so a rule with one
 * cannot be `typed_only` — the P1 of the RULE-INDEX r1 review (Burrow, Climb
 * and Swim Speed, whose restrictions no type holds).
 *
 * `unrepresented` is TRANSITIONAL. The rules program ends when that member is
 * deleted from this union, which makes "every SRD rule is represented" a
 * compile-time fact.
 */

/** An owner decision, as `.claude/decisions.md` numbers it (`D918`, `D617.36`). */
export type DecisionId = `D${number}`;

/**
 * A test file and the exact title of one test in it, as written in the source
 * (a parameterised title keeps its `%s`).
 */
export type TestRef = `tests/${string}.test.ts::${string}`;

/**
 * A clause of a rule: a verbatim quotation of the rule's printed text, in the
 * form the status test reads it (its spans in reading order, a line-end hyphen
 * joined, whitespace collapsed). A clause is identified by what it says, so a
 * quotation the text no longer contains fails the test that re-reads it.
 */
export type ClauseQuote = string;

/**
 * WHY A TEST PROVES A CLAUSE, NOT ONLY THAT THE TEST EXISTS.
 *
 * `asserts` is one `expect(…)` statement of the named test's own body,
 * verbatim up to whitespace, that states the clause's effect. The status test
 * parses the test file and requires the statement inside that test (not
 * elsewhere in the file, not in a skipped test), and requires it to be a
 * positive assertion: no `.not`, no `toBe(false)`. A test that only mentions
 * the rule, or only proves its absence, cannot be quoted.
 */
export interface Witness {
  readonly test: TestRef;
  readonly asserts: `expect(${string}`;
}

/** A clause that executes, with the witnesses that fail if it stops. */
export interface ExecutedClause {
  readonly clause: ClauseQuote;
  readonly witness: readonly [Witness, ...Witness[]];
}

/** A declaration in the source, as `src/<path>.ts#<name>`. */
export type TypedAt = `src/${string}.ts#${string}`;

/**
 * A clause whose every stated fact is a type: `fact` is text of the named
 * declaration, verbatim up to whitespace (for a union, the member together
 * with its discriminant). The status test finds the declaration and the text.
 */
export interface TypedClause {
  readonly clause: ClauseQuote;
  readonly typedAt: TypedAt;
  readonly fact: string;
}

/**
 * The units that represent or execute rules: the D918 queue, the SRD-TYPED
 * ranked plan (synthesis §6.2), and the units the owner named since (D920:
 * RULES-CORE for the core rules no planned unit owned, PERCEPTION for hearing
 * and sight filters). `UNASSIGNED` is honest: no planned unit owns the rule
 * yet, which is an owner question, never a silent default.
 */
export const UNIT_IDS = [
  'FOOTPRINT',
  'MOVE-COST',
  'SQUEEZE-COMBAT',
  'SQUEEZE-THROUGH',
  'COVER-EDGE',
  'SRD-BUILDTIME',
  'RULE-INDEX',
  'RULES-CORE',
  'PERCEPTION',
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

/**
 * The unit that delivers each capability. `perception_filters` is PERCEPTION
 * (D920); object state, zones, summons, plane state and inventory stay
 * UNASSIGNED until a capability unit is planned (D920).
 */
export const CAPABILITY_OWNER = {
  movement_modes: 'MOVEMENT-MODES',
  movement_cost_kinds: 'MOVE-COST',
  squeeze_combat: 'SQUEEZE-COMBAT',
  cover_edges: 'COVER-EDGE',
  perception_filters: 'PERCEPTION',
  object_state: 'UNASSIGNED',
  zones: 'UNASSIGNED',
  summons: 'UNASSIGNED',
  plane_state: 'UNASSIGNED',
  inventory: 'UNASSIGNED',
  exploration: 'WORLD-TOOLBOX',
  social: 'ACTIONS-COMPLETE',
  lair_state: 'MONSTER-EXEC',
} as const satisfies { readonly [C in Capability]: UnitId };

/** A clause that does not execute yet, and the capability it waits for. */
export interface MissingClause {
  readonly clause: ClauseQuote;
  readonly awaiting: Capability;
}

/**
 * The owner rulings that decide a rule where the SRD is silent, ambiguous or
 * contradicts itself, or that override it by house rule (D921–D922). Their
 * typed data is `OWNER_RULINGS` (./owner-rulings.ts); a ruling is data until
 * the unit it names executes it, failing test first.
 */
export const OWNER_RULING_IDS = [
  'temp-hp-keep-larger',
  'resistance-per-type-per-instance',
  'flyer-terrain-tags',
  'touch-is-reach',
  'spell-classes-union',
  'xp-highest-wins',
] as const;
export type OwnerRulingId = (typeof OWNER_RULING_IDS)[number];

export type RuleStatus =
  /** Every clause executes; the clauses quote all of the rule's text. */
  | { readonly status: 'executed'; readonly clauses: readonly [ExecutedClause, ...ExecutedClause[]] }
  /** Some clauses execute (witnessed); the rest are quoted with what they await. Together they quote all of it. */
  | {
      readonly status: 'partial';
      readonly executed: readonly [ExecutedClause, ...ExecutedClause[]];
      readonly missing: readonly [MissingClause, ...MissingClause[]];
    }
  /** Every clause is typed and nothing executes it yet. */
  | {
      readonly status: 'typed_only';
      readonly clauses: readonly [TypedClause, ...TypedClause[]];
      readonly awaiting: readonly [Capability, ...Capability[]];
    }
  /** Represented as data; the owner ruled it out of execution. */
  | { readonly status: 'excluded_by_owner'; readonly decision: DecisionId }
  /** Nothing to execute. */
  | { readonly status: 'not_executable'; readonly reason: 'definitional' | 'gm_narrative' | 'table_adjudicated' }
  /** The SRD contradicts itself; the spans say where, the ruling (if any) which reading holds. */
  | {
      readonly status: 'source_disagreement';
      readonly spans: readonly [SrdSpan, SrdSpan, ...SrdSpan[]];
      readonly ruling: OwnerRulingId | null;
    }
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

/** Every rule a status record mentions: the key is `SrdRuleId`, the clauses are its own text. */
export type RuleStatusRecord = { readonly [K in SrdRuleId]: RuleStatus };
