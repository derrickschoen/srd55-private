// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/class-resources-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/class-level-tables.txt sha256=a42925cfeff1df54e909947389daf7ae641377a57b456fa7c4bfd9b503a4ea0c
//   docs/srd/full/srd-5.2.1.txt sha256=d2425fa863247509c9af77cd4856e254a9ad4216661b948fc99daa67db69c918
// Regenerate with `npm run srd:artifacts`.
// tests/unit/rules/class-resources-srd-generation.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import type { SrdClassResourceArtifact } from '../class-resources-srd-reader';

export const BUNDLED_SRD_CLASS_RESOURCES = {
  "manifest": [
    {
      "content_key": "2024:class:barbarian",
      "class_name": "Barbarian",
      "expected_resource_kinds": [
        "rage"
      ],
      "ladders": [
        {
          "content_key": "2024:class:barbarian",
          "class_name": "Barbarian",
          "resource_kind": "rage",
          "maxima": [
            2,
            2,
            3,
            3,
            3,
            4,
            4,
            4,
            4,
            4,
            4,
            5,
            5,
            5,
            5,
            5,
            6,
            6,
            6,
            6
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:bard",
      "class_name": "Bard",
      "expected_resource_kinds": [],
      "ladders": []
    },
    {
      "content_key": "2024:class:cleric",
      "class_name": "Cleric",
      "expected_resource_kinds": [
        "channel_divinity"
      ],
      "ladders": [
        {
          "content_key": "2024:class:cleric",
          "class_name": "Cleric",
          "resource_kind": "channel_divinity",
          "maxima": [
            0,
            2,
            2,
            2,
            2,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            4,
            4,
            4
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:druid",
      "class_name": "Druid",
      "expected_resource_kinds": [
        "wild_shape"
      ],
      "ladders": [
        {
          "content_key": "2024:class:druid",
          "class_name": "Druid",
          "resource_kind": "wild_shape",
          "maxima": [
            0,
            2,
            2,
            2,
            2,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            4,
            4,
            4,
            4
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:fighter",
      "class_name": "Fighter",
      "expected_resource_kinds": [
        "second_wind"
      ],
      "ladders": [
        {
          "content_key": "2024:class:fighter",
          "class_name": "Fighter",
          "resource_kind": "second_wind",
          "maxima": [
            2,
            2,
            2,
            3,
            3,
            3,
            3,
            3,
            3,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4,
            4
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:monk",
      "class_name": "Monk",
      "expected_resource_kinds": [
        "focus_points"
      ],
      "ladders": [
        {
          "content_key": "2024:class:monk",
          "class_name": "Monk",
          "resource_kind": "focus_points",
          "maxima": [
            0,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:paladin",
      "class_name": "Paladin",
      "expected_resource_kinds": [
        "channel_divinity"
      ],
      "ladders": [
        {
          "content_key": "2024:class:paladin",
          "class_name": "Paladin",
          "resource_kind": "channel_divinity",
          "maxima": [
            0,
            0,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            2,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3,
            3
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:ranger",
      "class_name": "Ranger",
      "expected_resource_kinds": [
        "favored_enemy"
      ],
      "ladders": [
        {
          "content_key": "2024:class:ranger",
          "class_name": "Ranger",
          "resource_kind": "favored_enemy",
          "maxima": [
            2,
            2,
            2,
            2,
            3,
            3,
            3,
            3,
            4,
            4,
            4,
            4,
            5,
            5,
            5,
            5,
            6,
            6,
            6,
            6
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:rogue",
      "class_name": "Rogue",
      "expected_resource_kinds": [],
      "ladders": []
    },
    {
      "content_key": "2024:class:sorcerer",
      "class_name": "Sorcerer",
      "expected_resource_kinds": [
        "sorcery_points"
      ],
      "ladders": [
        {
          "content_key": "2024:class:sorcerer",
          "class_name": "Sorcerer",
          "resource_kind": "sorcery_points",
          "maxima": [
            0,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20
          ]
        }
      ]
    },
    {
      "content_key": "2024:class:warlock",
      "class_name": "Warlock",
      "expected_resource_kinds": [],
      "ladders": []
    },
    {
      "content_key": "2024:class:wizard",
      "class_name": "Wizard",
      "expected_resource_kinds": [],
      "ladders": []
    }
  ],
  "formula_manifest": {
    "formulas": [
      {
        "content_key": "2024:class:barbarian",
        "class_name": "Barbarian",
        "resource_kind": "persistent_rage_recovery",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 15,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:1897-1901"
      },
      {
        "content_key": "2024:class:cleric",
        "class_name": "Cleric",
        "resource_kind": "divine_intervention",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 10,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:2339-2348"
      },
      {
        "content_key": "2024:class:druid",
        "class_name": "Druid",
        "resource_kind": "wild_resurgence_conversion",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 5,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:2618-2625"
      },
      {
        "content_key": "2024:class:druid",
        "class_name": "Druid",
        "resource_kind": "nature_magician_conversion",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 20,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:2657-2670"
      },
      {
        "content_key": "2024:class:monk",
        "class_name": "Monk",
        "resource_kind": "uncanny_metabolism",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 2,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3089-3095"
      },
      {
        "content_key": "2024:class:paladin",
        "class_name": "Paladin",
        "resource_kind": "paladins_smite",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 2,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3262-3266"
      },
      {
        "content_key": "2024:class:paladin",
        "class_name": "Paladin",
        "resource_kind": "faithful_steed",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 5,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3334-3339"
      },
      {
        "content_key": "2024:class:rogue",
        "class_name": "Rogue",
        "resource_kind": "stroke_of_luck",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 20,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3816-3821"
      },
      {
        "content_key": "2024:class:sorcerer",
        "class_name": "Sorcerer",
        "resource_kind": "innate_sorcery",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 1,
          "fixed_count": 2,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3936-3951"
      },
      {
        "content_key": "2024:class:sorcerer",
        "class_name": "Sorcerer",
        "resource_kind": "sorcerous_restoration",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 5,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3969-3974"
      },
      {
        "content_key": "2024:class:warlock",
        "class_name": "Warlock",
        "resource_kind": "magical_cunning",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 2,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:4330-4335"
      },
      {
        "content_key": "2024:class:warlock",
        "class_name": "Warlock",
        "resource_kind": "contact_patron",
        "formula": {
          "formula_kind": "fixed_count",
          "minimum_class_level": 9,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:4351-4360"
      },
      {
        "content_key": "2024:class:bard",
        "class_name": "Bard",
        "resource_kind": "bardic_inspiration",
        "formula": {
          "formula_kind": "ability_modifier_minimum_one",
          "minimum_class_level": 1,
          "fixed_count": null,
          "ability": "charisma",
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:1949-2002"
      },
      {
        "content_key": "2024:class:ranger",
        "class_name": "Ranger",
        "resource_kind": "tireless",
        "formula": {
          "formula_kind": "ability_modifier_minimum_one",
          "minimum_class_level": 10,
          "fixed_count": null,
          "ability": "wisdom",
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3544-3553"
      },
      {
        "content_key": "2024:class:ranger",
        "class_name": "Ranger",
        "resource_kind": "natures_veil",
        "formula": {
          "formula_kind": "ability_modifier_minimum_one",
          "minimum_class_level": 14,
          "fixed_count": null,
          "ability": "wisdom",
          "multiplier": null,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3563-3570"
      },
      {
        "content_key": "2024:class:paladin",
        "class_name": "Paladin",
        "resource_kind": "lay_on_hands",
        "formula": {
          "formula_kind": "class_level_multiple",
          "minimum_class_level": 1,
          "fixed_count": null,
          "ability": null,
          "multiplier": 5,
          "later_fixed_count_steps": null
        },
        "citation": "srd-5.2.1.txt:3206-3211"
      },
      {
        "content_key": "2024:class:fighter",
        "class_name": "Fighter",
        "resource_kind": "action_surge",
        "formula": {
          "formula_kind": "fixed_count_by_class_level",
          "minimum_class_level": 2,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": "[{\"minimum_class_level\":17,\"count\":2}]"
        },
        "citation": "class-level-tables.txt:120-135; srd-5.2.1.txt:2938-2945"
      },
      {
        "content_key": "2024:class:fighter",
        "class_name": "Fighter",
        "resource_kind": "indomitable",
        "formula": {
          "formula_kind": "fixed_count_by_class_level",
          "minimum_class_level": 9,
          "fixed_count": 1,
          "ability": null,
          "multiplier": null,
          "later_fixed_count_steps": "[{\"minimum_class_level\":13,\"count\":2},{\"minimum_class_level\":17,\"count\":3}]"
        },
        "citation": "class-level-tables.txt:127-135; srd-5.2.1.txt:2928-2935"
      }
    ],
    "unmodelled": [
      {
        "content_key": "2024:class:warlock",
        "class_name": "Warlock",
        "resource_kind": "mystic_arcanum",
        "citation": "srd-5.2.1.txt:4362-4374"
      },
      {
        "content_key": "2024:class:wizard",
        "class_name": "Wizard",
        "resource_kind": "signature_spells",
        "citation": "srd-5.2.1.txt:4763-4771"
      }
    ]
  },
  "arcane_recovery_description": "You can regain some of your magical energy by studying your spellbook. When you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher. For example, if you’re a level 4 Wizard, you can recover up to two levels’ worth of spell slots, regaining either one level 2 spell slot or two level 1 spell slots. Once you use this feature, you can’t do so again until you finish a Long Rest."
} as const satisfies SrdClassResourceArtifact;
