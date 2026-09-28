/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * Two species facts the SRD prints as data: the Draconic Ancestors table and
 * each species' standing Darkvision. Both are read from
 * `docs/srd/source/species-descriptions.txt` AT BUILD TIME by
 * `species-srd-tables-reader.ts` and read here from the generated artifact
 * (`generated/species-srd-tables.ts`, written by `npm run srd:artifacts`,
 * frozen where it is defined). This module imports no SRD text; it names the
 * artifact's parts and the closed sets its literals carry.
 */
import { BUNDLED_SRD_SPECIES_TABLES } from './generated/species-srd-tables';

/** Draconic Ancestors: ten dragons and the damage type each determines, as printed. */
export const DRACONIC_ANCESTORS = BUNDLED_SRD_SPECIES_TABLES.draconicAncestors;

/** Where Draconic Ancestors is printed in the extract. */
export const DRACONIC_ANCESTORS_SPAN = BUNDLED_SRD_SPECIES_TABLES.draconicAncestorsSpan;

/** A dragon the Draconic Ancestors table prints. */
export type DraconicAncestor = (typeof DRACONIC_ANCESTORS)[number]['dragon'];

/** Each SRD species' standing senses, keyed by the species' printed name. */
export const SRD_SPECIES_SENSES = BUNDLED_SRD_SPECIES_TABLES.speciesSenses;

/** A species the SRD prints: the closed set of the artifact's keys. */
export type SrdSpeciesName = keyof typeof SRD_SPECIES_SENSES;
