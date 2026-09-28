// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/class-traits-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/class-core-traits.txt sha256=56e5145be00c43c11602067b0dcea9aa8f3669c3cd4b5e6087a57978672e89be
//   docs/srd/source/attack-class-features.txt sha256=ee6b151bead045d30518c9698f991d49fd9790420a8eb62c5b8068b107bd5d59
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
import type { SrdClassTraitsArtifact } from '../class-traits-srd-reader';

export const BUNDLED_SRD_CLASS_TRAITS = {
  "traits": [
    {
      "class_name": "Barbarian",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "strength"
        ]
      },
      "hit_die": 12,
      "saving_throws": [
        "strength",
        "constitution"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "animal_handling",
        "athletics",
        "intimidation",
        "nature",
        "perception",
        "survival"
      ],
      "armor_training": [
        "light",
        "medium",
        "shield"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        },
        {
          "category": "martial",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Bard",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "charisma"
        ]
      },
      "hit_die": 8,
      "saving_throws": [
        "dexterity",
        "charisma"
      ],
      "skill_choice_count": 3,
      "skill_choice_from_any": true,
      "skill_options": [],
      "armor_training": [
        "light"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Cleric",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "wisdom"
        ]
      },
      "hit_die": 8,
      "saving_throws": [
        "wisdom",
        "charisma"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "history",
        "insight",
        "medicine",
        "persuasion",
        "religion"
      ],
      "armor_training": [
        "light",
        "medium",
        "shield"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Druid",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "wisdom"
        ]
      },
      "hit_die": 8,
      "saving_throws": [
        "intelligence",
        "wisdom"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "animal_handling",
        "arcana",
        "insight",
        "medicine",
        "nature",
        "perception",
        "religion",
        "survival"
      ],
      "armor_training": [
        "light",
        "shield"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Fighter",
      "primary_ability_expression": {
        "kind": "one_of",
        "abilities": [
          "strength",
          "dexterity"
        ]
      },
      "hit_die": 10,
      "saving_throws": [
        "strength",
        "constitution"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "acrobatics",
        "animal_handling",
        "athletics",
        "history",
        "insight",
        "intimidation",
        "persuasion",
        "perception",
        "survival"
      ],
      "armor_training": [
        "light",
        "medium",
        "heavy",
        "shield"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        },
        {
          "category": "martial",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Monk",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "dexterity",
          "wisdom"
        ]
      },
      "hit_die": 8,
      "saving_throws": [
        "strength",
        "dexterity"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "acrobatics",
        "athletics",
        "history",
        "insight",
        "religion",
        "stealth"
      ],
      "armor_training": [],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        },
        {
          "category": "martial",
          "property_qualifier": "Light"
        }
      ]
    },
    {
      "class_name": "Paladin",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "strength",
          "charisma"
        ]
      },
      "hit_die": 10,
      "saving_throws": [
        "wisdom",
        "charisma"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "athletics",
        "insight",
        "intimidation",
        "medicine",
        "persuasion",
        "religion"
      ],
      "armor_training": [
        "light",
        "medium",
        "heavy",
        "shield"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        },
        {
          "category": "martial",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Ranger",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "dexterity",
          "wisdom"
        ]
      },
      "hit_die": 10,
      "saving_throws": [
        "strength",
        "dexterity"
      ],
      "skill_choice_count": 3,
      "skill_choice_from_any": false,
      "skill_options": [
        "animal_handling",
        "athletics",
        "insight",
        "investigation",
        "nature",
        "perception",
        "stealth",
        "survival"
      ],
      "armor_training": [
        "light",
        "medium",
        "shield"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        },
        {
          "category": "martial",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Rogue",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "dexterity"
        ]
      },
      "hit_die": 8,
      "saving_throws": [
        "dexterity",
        "intelligence"
      ],
      "skill_choice_count": 4,
      "skill_choice_from_any": false,
      "skill_options": [
        "acrobatics",
        "athletics",
        "deception",
        "insight",
        "intimidation",
        "investigation",
        "perception",
        "persuasion",
        "sleight_of_hand",
        "stealth"
      ],
      "armor_training": [
        "light"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        },
        {
          "category": "martial",
          "property_qualifier": "Finesse or Light"
        }
      ]
    },
    {
      "class_name": "Sorcerer",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "charisma"
        ]
      },
      "hit_die": 6,
      "saving_throws": [
        "constitution",
        "charisma"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "arcana",
        "deception",
        "insight",
        "intimidation",
        "persuasion",
        "religion"
      ],
      "armor_training": [],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Warlock",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "charisma"
        ]
      },
      "hit_die": 8,
      "saving_throws": [
        "wisdom",
        "charisma"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "arcana",
        "deception",
        "history",
        "intimidation",
        "investigation",
        "nature",
        "religion"
      ],
      "armor_training": [
        "light"
      ],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        }
      ]
    },
    {
      "class_name": "Wizard",
      "primary_ability_expression": {
        "kind": "all_of",
        "abilities": [
          "intelligence"
        ]
      },
      "hit_die": 6,
      "saving_throws": [
        "intelligence",
        "wisdom"
      ],
      "skill_choice_count": 2,
      "skill_choice_from_any": false,
      "skill_options": [
        "arcana",
        "history",
        "insight",
        "investigation",
        "medicine",
        "nature",
        "religion"
      ],
      "armor_training": [],
      "weapon_proficiencies": [
        {
          "category": "simple",
          "property_qualifier": null
        }
      ]
    }
  ],
  "extra_attack_grants": [
    {
      "class_name": "Barbarian",
      "counts": [
        [
          5,
          2
        ]
      ]
    },
    {
      "class_name": "Fighter",
      "counts": [
        [
          5,
          2
        ],
        [
          11,
          3
        ],
        [
          20,
          4
        ]
      ]
    },
    {
      "class_name": "Monk",
      "counts": [
        [
          5,
          2
        ]
      ]
    },
    {
      "class_name": "Paladin",
      "counts": [
        [
          5,
          2
        ]
      ]
    },
    {
      "class_name": "Ranger",
      "counts": [
        [
          5,
          2
        ]
      ]
    }
  ],
  "martial_arts_dice": [
    6,
    6,
    6,
    6,
    8,
    8,
    8,
    8,
    8,
    8,
    10,
    10,
    10,
    10,
    10,
    10,
    12,
    12,
    12,
    12
  ]
} as const satisfies SrdClassTraitsArtifact;
deepFreeze(BUNDLED_SRD_CLASS_TRAITS);
