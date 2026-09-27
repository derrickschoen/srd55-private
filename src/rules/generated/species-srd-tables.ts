/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * GENERATED from docs/srd/source/species-descriptions.txt by `npx vite-node scripts/generate-species-srd-tables.ts`.
 * Never edit by hand: the reader is src/rules/species-srd-tables-reader.ts,
 * and tests/unit/rules/species-srd-tables-generation.test.ts fails on any byte difference.
 */
import type { KnownDamageType } from '../../domain/enums';

/** Draconic Ancestors, docs/srd/source/species-descriptions.txt:63-71; the left column, then the right. */
export const DRACONIC_ANCESTORS = [
  { dragon: 'Black', damageType: 'Acid' },
  { dragon: 'Blue', damageType: 'Lightning' },
  { dragon: 'Brass', damageType: 'Fire' },
  { dragon: 'Bronze', damageType: 'Lightning' },
  { dragon: 'Copper', damageType: 'Acid' },
  { dragon: 'Gold', damageType: 'Fire' },
  { dragon: 'Green', damageType: 'Poison' },
  { dragon: 'Red', damageType: 'Fire' },
  { dragon: 'Silver', damageType: 'Cold' },
  { dragon: 'White', damageType: 'Cold' },
] as const satisfies readonly { readonly dragon: string; readonly damageType: KnownDamageType }[];

export const DRACONIC_ANCESTORS_SPAN = 'docs/srd/source/species-descriptions.txt:63-71' as const;

export type DraconicAncestor = (typeof DRACONIC_ANCESTORS)[number]['dragon'];

/**
 * Each SRD species' standing senses: its printed "Darkvision" trait, whose whole
 * text is "You have Darkvision with a range of N feet.". An empty list is the
 * species printing no such trait.
 */
export const SRD_SPECIES_SENSES = {
  Dragonborn: [{ kind: 'darkvision', rangeFeet: 60 }],
  Dwarf: [{ kind: 'darkvision', rangeFeet: 120 }],
  Elf: [{ kind: 'darkvision', rangeFeet: 60 }],
  Gnome: [{ kind: 'darkvision', rangeFeet: 60 }],
  Goliath: [],
  Halfling: [],
  Human: [],
  Orc: [{ kind: 'darkvision', rangeFeet: 120 }],
  Tiefling: [{ kind: 'darkvision', rangeFeet: 60 }],
} as const satisfies Readonly<Record<string, readonly { readonly kind: 'darkvision'; readonly rangeFeet: number }[]>>;

export type SrdSpeciesName = keyof typeof SRD_SPECIES_SENSES;
