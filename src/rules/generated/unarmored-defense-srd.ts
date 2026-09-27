// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/unarmored-defense-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/unarmored-defense.txt sha256=7e225c919bd6c225c106352d2292560ddf1791711b458dd342581896aba56af5
// Regenerate with `npm run srd:artifacts`.
// tests/unit/tools/srd-artifacts-fresh.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import type { SrdUnarmoredDefenseFeature } from '../unarmored-defense-srd-reader';

export const BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES = [
  {
    "class_name": "Barbarian",
    "class_level": 1,
    "name": "Unarmored Defense",
    "effect_kind": "armor_class_formula",
    "base": 10,
    "ability_1": "dexterity",
    "ability_2": "constitution",
    "allows_shield": true
  },
  {
    "class_name": "Monk",
    "class_level": 1,
    "name": "Unarmored Defense",
    "effect_kind": "armor_class_formula",
    "base": 10,
    "ability_1": "dexterity",
    "ability_2": "wisdom",
    "allows_shield": false
  }
] as const satisfies readonly SrdUnarmoredDefenseFeature[];
