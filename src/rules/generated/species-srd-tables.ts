// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/species-srd-tables-reader.ts, each source pinned by its sha256:
//   docs/srd/source/species-descriptions.txt sha256=d59101de6375cabe17c320303b8f365cd7ea2a2e589ebf568324c750c0655da9
// Regenerate with `npm run srd:artifacts`.
// tests/unit/rules/species-srd-tables-generation.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import { deepFreeze } from '../../domain/deep-freeze';
import type { SpeciesSrdTablesArtifact } from '../species-srd-tables-reader';

export const BUNDLED_SRD_SPECIES_TABLES = {
  "draconicAncestorsSpan": "docs/srd/source/species-descriptions.txt:63-71",
  "draconicAncestors": [
    {
      "dragon": "Black",
      "damageType": "Acid"
    },
    {
      "dragon": "Blue",
      "damageType": "Lightning"
    },
    {
      "dragon": "Brass",
      "damageType": "Fire"
    },
    {
      "dragon": "Bronze",
      "damageType": "Lightning"
    },
    {
      "dragon": "Copper",
      "damageType": "Acid"
    },
    {
      "dragon": "Gold",
      "damageType": "Fire"
    },
    {
      "dragon": "Green",
      "damageType": "Poison"
    },
    {
      "dragon": "Red",
      "damageType": "Fire"
    },
    {
      "dragon": "Silver",
      "damageType": "Cold"
    },
    {
      "dragon": "White",
      "damageType": "Cold"
    }
  ],
  "speciesSenses": {
    "Dragonborn": [
      {
        "kind": "darkvision",
        "rangeFeet": 60
      }
    ],
    "Dwarf": [
      {
        "kind": "darkvision",
        "rangeFeet": 120
      }
    ],
    "Elf": [
      {
        "kind": "darkvision",
        "rangeFeet": 60
      }
    ],
    "Gnome": [
      {
        "kind": "darkvision",
        "rangeFeet": 60
      }
    ],
    "Goliath": [],
    "Halfling": [],
    "Human": [],
    "Orc": [
      {
        "kind": "darkvision",
        "rangeFeet": 120
      }
    ],
    "Tiefling": [
      {
        "kind": "darkvision",
        "rangeFeet": 60
      }
    ]
  }
} as const satisfies SpeciesSrdTablesArtifact;
deepFreeze(BUNDLED_SRD_SPECIES_TABLES);
