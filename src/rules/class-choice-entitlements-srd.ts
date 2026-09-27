/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Sourced class-choice entitlements (Expertise grants and spell-replacement
 * policies), parsed from `docs/srd/source/class-expertise.txt` and
 * `class-spell-replacement.txt` AT BUILD TIME by
 * `class-choice-entitlements-srd-reader.ts` and read here from the generated
 * artifact (`generated/class-choice-entitlements-srd.ts`, written by
 * `npm run srd:artifacts`). This module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import type {
  SrdClassSpellReplacementPolicy,
  SrdExpertiseEntitlement,
} from './class-choice-entitlements-srd-reader';
import { isSrdClassName } from './srd-class-names';
import { BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS } from './generated/class-choice-entitlements-srd';

/**
 * `ExpertisePool` stays importable from here because
 * `src/grants/skill-expertise-grants.ts` imports it from this module and that
 * file's bytes are pinned by the `reconcile_species_lineage_content_v2`
 * catalog data migration's source checksum (`catalog-data-migrations.ts`):
 * editing its import would change a frozen migration.
 */
export type { ExpertisePool } from './class-choice-entitlements-srd-reader';

const ARTIFACT = deepFreeze(BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS);
const EXPERTISE_ENTITLEMENTS: readonly SrdExpertiseEntitlement[] =
  ARTIFACT.expertise;
const SPELL_REPLACEMENT_POLICIES: readonly SrdClassSpellReplacementPolicy[] =
  ARTIFACT.spell_replacement_policies;

/** Every sourced Expertise grant, class by class, in level order. */
export function bundledSrdExpertiseEntitlements(): readonly SrdExpertiseEntitlement[] {
  return EXPERTISE_ENTITLEMENTS;
}

/** Every bundled class's spell-replacement policy, in class-table order. */
export function bundledSrdClassSpellReplacementPolicies(): readonly SrdClassSpellReplacementPolicy[] {
  return SPELL_REPLACEMENT_POLICIES;
}

export function expertiseEntitlementsForClassName(
  className: string,
): readonly SrdExpertiseEntitlement[] | null {
  if (!isSrdClassName(className)) {
    return null;
  }
  return EXPERTISE_ENTITLEMENTS.filter(
    (entry) => entry.class_name === className,
  );
}

export function spellReplacementPolicyForClassName(
  className: string,
): SrdClassSpellReplacementPolicy | null {
  return (
    SPELL_REPLACEMENT_POLICIES.find(
      (entry) => entry.class_name === className,
    ) ?? null
  );
}
