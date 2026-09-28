// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/multiclass-entry-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/multiclass-entry-grants.txt sha256=e6d995788b8bea27d3fcf927482d1069155eaff10141a99d150f4039b026dc63
//   docs/srd/source/class-core-traits.txt sha256=56e5145be00c43c11602067b0dcea9aa8f3669c3cd4b5e6087a57978672e89be
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
import type { SrdMulticlassEntryGrant } from '../multiclass-entry-srd-reader';

export const BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS = [
  {
    "class_name": "Barbarian",
    "hit_die": true,
    "weapon_categories": [
      "martial"
    ],
    "armor_categories": [
      "shield"
    ],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Bard",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [
      "light"
    ],
    "skill_choice": {
      "pool": "any",
      "count": 1
    },
    "tool_grants": [
      "one Musical Instrument of your choice"
    ]
  },
  {
    "class_name": "Cleric",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [
      "light",
      "medium",
      "shield"
    ],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Druid",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [
      "light",
      "shield"
    ],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Fighter",
    "hit_die": true,
    "weapon_categories": [
      "martial"
    ],
    "armor_categories": [
      "light",
      "medium",
      "shield"
    ],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Monk",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Paladin",
    "hit_die": true,
    "weapon_categories": [
      "martial"
    ],
    "armor_categories": [
      "light",
      "medium",
      "shield"
    ],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Ranger",
    "hit_die": true,
    "weapon_categories": [
      "martial"
    ],
    "armor_categories": [
      "light",
      "medium",
      "shield"
    ],
    "skill_choice": {
      "pool": "class_list",
      "count": 1
    },
    "tool_grants": []
  },
  {
    "class_name": "Rogue",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [
      "light"
    ],
    "skill_choice": {
      "pool": "class_list",
      "count": 1
    },
    "tool_grants": [
      "Thieves' Tools"
    ]
  },
  {
    "class_name": "Sorcerer",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Warlock",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [
      "light"
    ],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  },
  {
    "class_name": "Wizard",
    "hit_die": true,
    "weapon_categories": [],
    "armor_categories": [],
    "skill_choice": {
      "pool": "none"
    },
    "tool_grants": []
  }
] as const satisfies readonly SrdMulticlassEntryGrant[];
deepFreeze(BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS);
