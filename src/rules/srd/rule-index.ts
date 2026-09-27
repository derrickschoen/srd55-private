import type { AreaShape, ConditionName } from '../../domain/srd-vocabulary';
import { SRD_RULE_INDEX } from './generated/rule-index';
import type { SrdRuleKind } from './rule-index-types';

/**
 * THE IDENTITY OF EVERY SRD 5.2.1 RULE (owner D918, synthesis §5 condition 1).
 *
 * `SRD_RULE_INDEX` is generated from the SRD text (`npm run srd:rule-index`,
 * scripts/srd/rule-index.ts) and carried `as const`, so `SrdRuleId` is the
 * closed union of its keys: a misspelt id, or an id the SRD does not print,
 * fails to compile. `RULE_STATUS` (./rule-status.ts) is keyed by it and
 * exhaustive, so a rule the generator adds has no status until someone gives it
 * one — and the build fails until then.
 */
export { SRD_RULE_INDEX };

export type SrdRuleIndex = typeof SRD_RULE_INDEX;

/** The closed union of every rule unit's id. */
export type SrdRuleId = keyof SrdRuleIndex;

/** The ids of one or more kinds. */
export type SrdRuleIdOfKind<K extends SrdRuleKind> = {
  readonly [I in SrdRuleId]: SrdRuleIndex[I]['kind'] extends K ? I : never;
}[SrdRuleId];

/** The printed names of one or more kinds. */
export type SrdRuleNameOfKind<K extends SrdRuleKind> = SrdRuleIndex[SrdRuleIdOfKind<K>]['name'];

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

type ParentOf<I extends SrdRuleId> = SrdRuleIndex[I] extends { readonly parent: infer P } ? P : never;
type Parents = { readonly [I in SrdRuleId]: ParentOf<I> }[SrdRuleId];

/** Every `parent` names a rule unit of the index. */
export const SRD_RULE_PARENTS_ARE_IDS: [Parents] extends [SrdRuleId] ? true : never = true;

/** The vocabulary's fifteen conditions are exactly the glossary's [Condition] entries. */
export const SRD_CONDITION_NAMES_MATCH_INDEX: Equal<ConditionName, SrdRuleNameOfKind<'condition'>> = true;

/** The vocabulary's six area shapes are exactly the glossary's [Area of Effect] entries. */
export const SRD_AREA_SHAPES_MATCH_INDEX: Equal<AreaShape, Lowercase<SrdRuleNameOfKind<'area_of_effect'>>> = true;
