/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The "As a Multiclass Character" grants of all twelve classes, parsed from
 * `docs/srd/source/multiclass-entry-grants.txt` (and checked against the Core
 * Traits parse) AT BUILD TIME by `multiclass-entry-srd-reader.ts`, and read
 * here from the generated artifact (`generated/multiclass-entry-srd.ts`,
 * written by `npm run srd:artifacts`). This module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import type { SrdMulticlassEntryGrant } from './multiclass-entry-srd-reader';
import { BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS } from './generated/multiclass-entry-srd';

const GRANTS: readonly SrdMulticlassEntryGrant[] = deepFreeze(
  BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS,
);

/** The twelve classes' multiclass entry grants, in extract order. */
export function bundledSrdMulticlassEntryGrants(): readonly SrdMulticlassEntryGrant[] {
  return GRANTS;
}
