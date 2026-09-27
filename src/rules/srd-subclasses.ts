/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The closed SRD subclass manifest, parsed from `docs/srd/source/subclasses.txt`
 * AT BUILD TIME by `srd-subclasses-reader.ts` and read here from the generated
 * artifact (`generated/srd-subclasses.ts`, written by `npm run srd:artifacts`).
 * This module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import type { SrdSubclassManifest } from './srd-subclasses-reader';
import { BUNDLED_SRD_SUBCLASS_MANIFEST } from './generated/srd-subclasses';

const MANIFEST: SrdSubclassManifest = deepFreeze(BUNDLED_SRD_SUBCLASS_MANIFEST);

/** The twelve bundled subclasses, their spell tables and rule sets, deeply frozen. */
export function bundledSrdSubclassManifest(): SrdSubclassManifest {
  return MANIFEST;
}
