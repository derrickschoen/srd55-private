import type { AreaShape, ConditionName } from '../../domain/srd-vocabulary';
import { SRD_RULE_INDEX } from './generated/rule-index';
import type { SrdRuleKind } from './rule-index-types';

/**
 * THE IDENTITY OF EVERY SRD 5.2.1 RULE (owner D918, synthesis §5 condition 1).
 *
 * `SRD_RULE_INDEX` is generated from the SRD text (`npm run srd:artifacts`,
 * scripts/srd/rule-index.ts) and carried `as const`, so `SrdRuleId` is the
 * closed union of its keys: a misspelt id, or an id the SRD does not print,
 * fails to compile. `RULE_STATUS` (./rule-status.ts) is keyed by it and
 * exhaustive, so a rule the generator adds has no status until someone gives it
 * one — and the build fails until then.
 *
 * COMPILE COST, MEASURED: the types below are written as `Extract` over the
 * id and entry unions, not as generic mapped or indexed-access types over all
 * 1,766 keys. A generic `SrdRuleIndex[SrdRuleIdOfKind<K>]['name']` alias alone
 * cost about 1.8 s of every type check (its variance is measured over every
 * key); these forms cost about 0.1 s.
 */
export { SRD_RULE_INDEX };

export type SrdRuleIndex = typeof SRD_RULE_INDEX;

/** The closed union of every rule unit's id. */
export type SrdRuleId = keyof SrdRuleIndex;

/** The union of every rule unit's entry. */
export type SrdRuleEntry = SrdRuleIndex[SrdRuleId];

/**
 * The ids of one or more kinds. An id is its kind, a dot, and the unit's name
 * segments; `SRD_RULE_IDS_START_WITH_THEIR_KIND` below proves it for every id.
 */
export type SrdRuleIdOfKind<K extends SrdRuleKind> = Extract<SrdRuleId, `${K}.${string}`>;

/** Every id, in index order (kind, then printed order). */
export const SRD_RULE_IDS = Object.keys(SRD_RULE_INDEX) as readonly SrdRuleId[];

export function isSrdRuleId(value: string): value is SrdRuleId {
  return Object.hasOwn(SRD_RULE_INDEX, value);
}

/* ==========================================================================
 * COMPILE-TIME CHECKS. Each constant has type `true` only while its claim
 * holds; when the claim breaks, the type collapses to `never` and the
 * assignment fails to compile.
 * ========================================================================== */

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

type KindPrefixMismatch = {
  readonly [I in SrdRuleId]: I extends `${SrdRuleIndex[I]['kind']}.${string}` ? never : I;
}[SrdRuleId];

/** Every id starts with its own kind, which is what `SrdRuleIdOfKind` relies on. */
export const SRD_RULE_IDS_START_WITH_THEIR_KIND: [KindPrefixMismatch] extends [never] ? true : never = true;

/** Every `parent` names a rule unit of the index. */
export const SRD_RULE_PARENTS_ARE_IDS: [Extract<SrdRuleEntry, { readonly parent: string }>['parent']] extends [SrdRuleId]
  ? true
  : never = true;

/** The vocabulary's fifteen conditions are exactly the glossary's [Condition] entries. */
export const SRD_CONDITION_NAMES_MATCH_INDEX: Equal<
  ConditionName,
  Extract<SrdRuleEntry, { readonly kind: 'condition' }>['name']
> = true;

/** The vocabulary's six area shapes are exactly the glossary's [Area of Effect] entries. */
export const SRD_AREA_SHAPES_MATCH_INDEX: Equal<
  AreaShape,
  Lowercase<Extract<SrdRuleEntry, { readonly kind: 'area_of_effect' }>['name']>
> = true;
