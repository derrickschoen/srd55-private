// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/extra-attack-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/extra-attack-other-sources.txt sha256=828a1c9829b77622b734326d79b5877d7f424489ff72035bafd1542f4e74328c
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
import type { SrdNamedFeature } from '../extra-attack-srd-reader';

export const BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES = [
  {
    "content_key": "2024:feature:thirsting-blade",
    "name": "Thirsting Blade",
    "class_name": "Warlock",
    "class_level": 5,
    "prerequisite": "Level 5+ Warlock, Pact of the Blade",
    "description": "You gain the Extra Attack feature for your pact weapon only. With that feature, you can attack twice with the weapon instead of once when you take the Attack action on your turn.",
    "attack_count": 2,
    "weapon_scope": "one_bonded_weapon"
  },
  {
    "content_key": "2024:feature:devouring-blade",
    "name": "Devouring Blade",
    "class_name": "Warlock",
    "class_level": 12,
    "prerequisite": "Level 12+ Warlock, Thirsting Blade",
    "description": "The Extra Attack of your Thirsting Blade invocation confers two extra attacks rather than one.",
    "attack_count": 3,
    "weapon_scope": "one_bonded_weapon"
  }
] as const satisfies readonly SrdNamedFeature[];
deepFreeze(BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES);
