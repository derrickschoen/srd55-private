// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/draconic-resilience-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/draconic-resilience.txt sha256=4eb91b329d74e693655264375ce503ef278036a519112e3e22728817720df5a3
// Regenerate with `npm run srd:artifacts`.
// tests/unit/tools/srd-artifacts-fresh.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import { deepFreeze } from '../../domain/deep-freeze';
import type { SrdDraconicResilienceFeature } from '../draconic-resilience-srd-reader';

export const BUNDLED_SRD_DRACONIC_RESILIENCE = deepFreeze({
  "class_name": "Sorcerer",
  "subclass_name": "Draconic Sorcery",
  "class_level": 3,
  "name": "Draconic Resilience",
  "effects": [
    {
      "kind": "hp_modifier",
      "label": "Draconic Resilience",
      "hit_points_flat": 0,
      "hit_points_per_level": 1
    },
    {
      "kind": "armor_class_formula",
      "label": "Draconic Resilience",
      "base": 10,
      "ability_1": "dexterity",
      "ability_2": "charisma",
      "allows_shield": false
    }
  ]
} as const satisfies SrdDraconicResilienceFeature);
