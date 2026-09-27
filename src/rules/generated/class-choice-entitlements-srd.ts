// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/class-choice-entitlements-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/class-expertise.txt sha256=42b990b7a8b5dd606922ce12d98ffbd1198360f3b347ad8eb277a5b57b6083e1
//   docs/srd/source/class-spell-replacement.txt sha256=f108ba0c2bf5aa5f806a0fabf84bc79e2751448a90ea554b0cce3cd2426e7f22
//   docs/srd/source/class-level-tables.txt sha256=a42925cfeff1df54e909947389daf7ae641377a57b456fa7c4bfd9b503a4ea0c
// Regenerate with `npm run srd:artifacts`.
// tests/unit/tools/srd-artifacts-fresh.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import type { SrdClassChoiceEntitlementArtifact } from '../class-choice-entitlements-srd-reader';

export const BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS = {
  "expertise": [
    {
      "class_name": "Bard",
      "class_level": 2,
      "feature_name": "Expertise",
      "count": 2,
      "pool": {
        "kind": "any_proficient_skill"
      }
    },
    {
      "class_name": "Bard",
      "class_level": 9,
      "feature_name": "Expertise",
      "count": 2,
      "pool": {
        "kind": "any_proficient_skill"
      }
    },
    {
      "class_name": "Ranger",
      "class_level": 2,
      "feature_name": "Deft Explorer",
      "count": 1,
      "pool": {
        "kind": "any_proficient_skill"
      }
    },
    {
      "class_name": "Ranger",
      "class_level": 9,
      "feature_name": "Expertise",
      "count": 2,
      "pool": {
        "kind": "any_proficient_skill"
      }
    },
    {
      "class_name": "Rogue",
      "class_level": 1,
      "feature_name": "Expertise",
      "count": 2,
      "pool": {
        "kind": "any_proficient_skill"
      }
    },
    {
      "class_name": "Rogue",
      "class_level": 6,
      "feature_name": "Expertise",
      "count": 2,
      "pool": {
        "kind": "any_proficient_skill"
      }
    },
    {
      "class_name": "Wizard",
      "class_level": 2,
      "feature_name": "Scholar",
      "count": 1,
      "pool": {
        "kind": "named_proficient_skills",
        "skills": [
          "arcana",
          "history",
          "investigation",
          "medicine",
          "nature",
          "religion"
        ]
      }
    }
  ],
  "spell_replacement_policies": [
    {
      "class_name": "Barbarian",
      "on_class_level": [],
      "long_rest_only_buckets": []
    },
    {
      "class_name": "Bard",
      "on_class_level": [
        {
          "class_name": "Bard",
          "trigger": "class_level",
          "bucket": "cantrip_known",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        },
        {
          "class_name": "Bard",
          "trigger": "class_level",
          "bucket": "prepared",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        }
      ],
      "long_rest_only_buckets": []
    },
    {
      "class_name": "Cleric",
      "on_class_level": [
        {
          "class_name": "Cleric",
          "trigger": "class_level",
          "bucket": "cantrip_known",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        }
      ],
      "long_rest_only_buckets": [
        "prepared"
      ]
    },
    {
      "class_name": "Druid",
      "on_class_level": [
        {
          "class_name": "Druid",
          "trigger": "class_level",
          "bucket": "cantrip_known",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        }
      ],
      "long_rest_only_buckets": [
        "prepared"
      ]
    },
    {
      "class_name": "Fighter",
      "on_class_level": [],
      "long_rest_only_buckets": []
    },
    {
      "class_name": "Monk",
      "on_class_level": [],
      "long_rest_only_buckets": []
    },
    {
      "class_name": "Paladin",
      "on_class_level": [
        {
          "class_name": "Paladin",
          "trigger": "class_level",
          "bucket": "cantrip_known",
          "source": {
            "kind": "class_feature",
            "feature_name": "Blessed Warrior"
          },
          "replacement_constraint": "same_list"
        }
      ],
      "long_rest_only_buckets": [
        "prepared"
      ]
    },
    {
      "class_name": "Ranger",
      "on_class_level": [
        {
          "class_name": "Ranger",
          "trigger": "class_level",
          "bucket": "cantrip_known",
          "source": {
            "kind": "class_feature",
            "feature_name": "Druidic Warrior"
          },
          "replacement_constraint": "same_list"
        }
      ],
      "long_rest_only_buckets": [
        "prepared"
      ]
    },
    {
      "class_name": "Rogue",
      "on_class_level": [],
      "long_rest_only_buckets": []
    },
    {
      "class_name": "Sorcerer",
      "on_class_level": [
        {
          "class_name": "Sorcerer",
          "trigger": "class_level",
          "bucket": "cantrip_known",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        },
        {
          "class_name": "Sorcerer",
          "trigger": "class_level",
          "bucket": "prepared",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        }
      ],
      "long_rest_only_buckets": []
    },
    {
      "class_name": "Warlock",
      "on_class_level": [
        {
          "class_name": "Warlock",
          "trigger": "class_level",
          "bucket": "cantrip_known",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        },
        {
          "class_name": "Warlock",
          "trigger": "class_level",
          "bucket": "prepared",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list"
        },
        {
          "class_name": "Warlock",
          "trigger": "class_level",
          "bucket": "mystic_arcanum",
          "source": {
            "kind": "class_progression"
          },
          "replacement_constraint": "same_list_and_level"
        }
      ],
      "long_rest_only_buckets": []
    },
    {
      "class_name": "Wizard",
      "on_class_level": [],
      "long_rest_only_buckets": [
        "cantrip_known",
        "prepared"
      ]
    }
  ]
} as const satisfies SrdClassChoiceEntitlementArtifact;
