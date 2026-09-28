// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/srd-subclasses-reader.ts, each source pinned by its sha256:
//   docs/srd/source/subclasses.txt sha256=2745c4437a6a314da408f057aa5ed2f092ea6961324841a70cac8799cf747816
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
import type { SrdSubclassManifest } from '../srd-subclasses-reader';

export const BUNDLED_SRD_SUBCLASS_MANIFEST = deepFreeze({
  "by_class": {
    "Barbarian": {
      "class_name": "Barbarian",
      "subclass_name": "Path of the Berserker",
      "features": [
        {
          "name": "Frenzy",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Mindless Rage",
          "class_level": 6,
          "sort_position": 1
        },
        {
          "name": "Retaliation",
          "class_level": 10,
          "sort_position": 2
        },
        {
          "name": "Intimidating Presence",
          "class_level": 14,
          "sort_position": 3
        }
      ],
      "mechanical_outcome": {
        "kind": "no_catalog_rule",
        "reason": "the_extracted_catalog_facts_contain_no_spell_or_choice_rule"
      }
    },
    "Bard": {
      "class_name": "Bard",
      "subclass_name": "College of Lore",
      "features": [
        {
          "name": "Bonus Proficiencies",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Cutting Words",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Magical Discoveries",
          "class_level": 6,
          "sort_position": 2
        },
        {
          "name": "Peerless Skill",
          "class_level": 14,
          "sort_position": 3
        }
      ],
      "mechanical_outcome": {
        "kind": "deferred",
        "deferral": {
          "kind": "magical_discoveries_multi_list_choice",
          "feature_name": "Magical Discoveries",
          "reason": "the_current_list_rule_resolves_exactly_one_list"
        }
      }
    },
    "Cleric": {
      "class_name": "Cleric",
      "subclass_name": "Life Domain",
      "features": [
        {
          "name": "Disciple of Life",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Life Domain Spells",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Preserve Life",
          "class_level": 3,
          "sort_position": 2
        },
        {
          "name": "Blessed Healer",
          "class_level": 6,
          "sort_position": 3
        },
        {
          "name": "Supreme Healing",
          "class_level": 17,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "unconditional_fixed_spells",
        "rule_set": {
          "class_name": "Cleric",
          "subclass_name": "Life Domain",
          "spell_table": "life_domain",
          "rules": [
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-aid",
              "spell_version_key": "2024:aid",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-bless",
              "spell_version_key": "2024:bless",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-cure-wounds",
              "spell_version_key": "2024:cure-wounds",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-lesser-restoration",
              "spell_version_key": "2024:lesser-restoration",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-mass-healing-word",
              "spell_version_key": "2024:mass-healing-word",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-revivify",
              "spell_version_key": "2024:revivify",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-aura-of-life",
              "spell_version_key": "2024:aura-of-life",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 7
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-death-ward",
              "spell_version_key": "2024:death-ward",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 7
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-greater-restoration",
              "spell_version_key": "2024:greater-restoration",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            },
            {
              "kind": "fixed_spell",
              "rule_key": "life-domain-mass-cure-wounds",
              "spell_version_key": "2024:mass-cure-wounds",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            }
          ]
        }
      }
    },
    "Druid": {
      "class_name": "Druid",
      "subclass_name": "Circle of the Land",
      "features": [
        {
          "name": "Circle of the Land Spells",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Land’s Aid",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Natural Recovery",
          "class_level": 6,
          "sort_position": 2
        },
        {
          "name": "Nature’s Ward",
          "class_level": 10,
          "sort_position": 3
        },
        {
          "name": "Nature’s Sanctuary",
          "class_level": 14,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "deferred",
        "deferral": {
          "kind": "circle_land_renewable_choice",
          "feature_name": "Circle of the Land Spells",
          "evidence_table": "circle_of_the_land",
          "reason": "the_renewable_land_choice_has_no_typed_capture_path"
        }
      }
    },
    "Fighter": {
      "class_name": "Fighter",
      "subclass_name": "Champion",
      "features": [
        {
          "name": "Improved Critical",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Remarkable Athlete",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Additional Fighting Style",
          "class_level": 7,
          "sort_position": 2
        },
        {
          "name": "Heroic Warrior",
          "class_level": 10,
          "sort_position": 3
        },
        {
          "name": "Superior Critical",
          "class_level": 15,
          "sort_position": 4
        },
        {
          "name": "Survivor",
          "class_level": 18,
          "sort_position": 5
        }
      ],
      "mechanical_outcome": {
        "kind": "granted_feat_choice",
        "rule_set": {
          "class_name": "Fighter",
          "subclass_name": "Champion",
          "feature_name": "Additional Fighting Style",
          "feat_grouping": "fighting_style",
          "rules": [
            {
              "kind": "grant_source",
              "rule_key": "champion-additional-fighting-style",
              "source_type": "feat",
              "definition_key_config": "additional_fighting_style_key",
              "child_config_config": "additional_fighting_style_config",
              "active_from_class_level": 7,
              "allows_pending_choice": true
            }
          ]
        }
      }
    },
    "Monk": {
      "class_name": "Monk",
      "subclass_name": "Warrior of the Open Hand",
      "features": [
        {
          "name": "Open Hand Technique",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Wholeness of Body",
          "class_level": 6,
          "sort_position": 1
        },
        {
          "name": "Fleet Step",
          "class_level": 11,
          "sort_position": 2
        },
        {
          "name": "Quivering Palm",
          "class_level": 17,
          "sort_position": 3
        }
      ],
      "mechanical_outcome": {
        "kind": "no_catalog_rule",
        "reason": "the_extracted_catalog_facts_contain_no_spell_or_choice_rule"
      }
    },
    "Paladin": {
      "class_name": "Paladin",
      "subclass_name": "Oath of Devotion",
      "features": [
        {
          "name": "Oath of Devotion Spells",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Sacred Weapon",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Aura of Devotion",
          "class_level": 7,
          "sort_position": 2
        },
        {
          "name": "Smite of Protection",
          "class_level": 15,
          "sort_position": 3
        },
        {
          "name": "Holy Nimbus",
          "class_level": 20,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "unconditional_fixed_spells",
        "rule_set": {
          "class_name": "Paladin",
          "subclass_name": "Oath of Devotion",
          "spell_table": "oath_of_devotion",
          "rules": [
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-protection-from-evil-and-good",
              "spell_version_key": "2024:protection-from-evil-and-good",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-shield-of-faith",
              "spell_version_key": "2024:shield-of-faith",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-aid",
              "spell_version_key": "2024:aid",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-zone-of-truth",
              "spell_version_key": "2024:zone-of-truth",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-beacon-of-hope",
              "spell_version_key": "2024:beacon-of-hope",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-dispel-magic",
              "spell_version_key": "2024:dispel-magic",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-freedom-of-movement",
              "spell_version_key": "2024:freedom-of-movement",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 13
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-guardian-of-faith",
              "spell_version_key": "2024:guardian-of-faith",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 13
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-commune",
              "spell_version_key": "2024:commune",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 17
            },
            {
              "kind": "fixed_spell",
              "rule_key": "oath-of-devotion-flame-strike",
              "spell_version_key": "2024:flame-strike",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 17
            }
          ]
        }
      }
    },
    "Ranger": {
      "class_name": "Ranger",
      "subclass_name": "Hunter",
      "features": [
        {
          "name": "Hunter’s Lore",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Hunter’s Prey",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Defensive Tactics",
          "class_level": 7,
          "sort_position": 2
        },
        {
          "name": "Superior Hunter’s Prey",
          "class_level": 11,
          "sort_position": 3
        },
        {
          "name": "Superior Hunter’s Defense",
          "class_level": 15,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "no_catalog_rule",
        "reason": "the_extracted_catalog_facts_contain_no_spell_or_choice_rule"
      }
    },
    "Rogue": {
      "class_name": "Rogue",
      "subclass_name": "Thief",
      "features": [
        {
          "name": "Fast Hands",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Second-Story Work",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Supreme Sneak",
          "class_level": 9,
          "sort_position": 2
        },
        {
          "name": "Use Magic Device",
          "class_level": 13,
          "sort_position": 3
        },
        {
          "name": "Thief’s Reflexes",
          "class_level": 17,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "no_catalog_rule",
        "reason": "the_extracted_catalog_facts_contain_no_spell_or_choice_rule"
      }
    },
    "Sorcerer": {
      "class_name": "Sorcerer",
      "subclass_name": "Draconic Sorcery",
      "features": [
        {
          "name": "Draconic Resilience",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Draconic Spells",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Elemental Affinity",
          "class_level": 6,
          "sort_position": 2
        },
        {
          "name": "Dragon Wings",
          "class_level": 14,
          "sort_position": 3
        },
        {
          "name": "Dragon Companion",
          "class_level": 18,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "unconditional_fixed_spells",
        "rule_set": {
          "class_name": "Sorcerer",
          "subclass_name": "Draconic Sorcery",
          "spell_table": "draconic_sorcery",
          "rules": [
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-alter-self",
              "spell_version_key": "2024:alter-self",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-chromatic-orb",
              "spell_version_key": "2024:chromatic-orb",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-command",
              "spell_version_key": "2024:command",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-dragon-s-breath",
              "spell_version_key": "2024:dragon-s-breath",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-fear",
              "spell_version_key": "2024:fear",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-fly",
              "spell_version_key": "2024:fly",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-arcane-eye",
              "spell_version_key": "2024:arcane-eye",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 7
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-charm-monster",
              "spell_version_key": "2024:charm-monster",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 7
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-legend-lore",
              "spell_version_key": "2024:legend-lore",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            },
            {
              "kind": "fixed_spell",
              "rule_key": "draconic-sorcery-summon-dragon",
              "spell_version_key": "2024:summon-dragon",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            }
          ]
        }
      }
    },
    "Warlock": {
      "class_name": "Warlock",
      "subclass_name": "Fiend Patron",
      "features": [
        {
          "name": "Dark One’s Blessing",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Fiend Spells",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Dark One’s Own Luck",
          "class_level": 6,
          "sort_position": 2
        },
        {
          "name": "Fiendish Resilience",
          "class_level": 10,
          "sort_position": 3
        },
        {
          "name": "Hurl Through Hell",
          "class_level": 14,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "unconditional_fixed_spells",
        "rule_set": {
          "class_name": "Warlock",
          "subclass_name": "Fiend Patron",
          "spell_table": "fiend_patron",
          "rules": [
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-burning-hands",
              "spell_version_key": "2024:burning-hands",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-command",
              "spell_version_key": "2024:command",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-scorching-ray",
              "spell_version_key": "2024:scorching-ray",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-suggestion",
              "spell_version_key": "2024:suggestion",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 3
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-fireball",
              "spell_version_key": "2024:fireball",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-stinking-cloud",
              "spell_version_key": "2024:stinking-cloud",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 5
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-fire-shield",
              "spell_version_key": "2024:fire-shield",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 7
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-wall-of-fire",
              "spell_version_key": "2024:wall-of-fire",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 7
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-geas",
              "spell_version_key": "2024:geas",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            },
            {
              "kind": "fixed_spell",
              "rule_key": "fiend-patron-insect-plague",
              "spell_version_key": "2024:insect-plague",
              "bucket": "prepared",
              "always_prepared": true,
              "with_slots": true,
              "active_from_class_level": 9
            }
          ]
        }
      }
    },
    "Wizard": {
      "class_name": "Wizard",
      "subclass_name": "Evoker",
      "features": [
        {
          "name": "Evocation Savant",
          "class_level": 3,
          "sort_position": 0
        },
        {
          "name": "Potent Cantrip",
          "class_level": 3,
          "sort_position": 1
        },
        {
          "name": "Sculpt Spells",
          "class_level": 6,
          "sort_position": 2
        },
        {
          "name": "Empowered Evocation",
          "class_level": 10,
          "sort_position": 3
        },
        {
          "name": "Overchannel",
          "class_level": 14,
          "sort_position": 4
        }
      ],
      "mechanical_outcome": {
        "kind": "deferred",
        "deferral": {
          "kind": "evocation_savant_timing_excluded",
          "feature_name": "Evocation Savant",
          "reason": "the_acquisition_timing_exists_only_in_excluded_feature_prose"
        }
      }
    }
  },
  "spell_tables": [
    {
      "kind": "unconditional",
      "table_name": "life_domain",
      "entries": [
        {
          "printed_name": "Aid",
          "spell_version_key": "2024:aid",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Bless",
          "spell_version_key": "2024:bless",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Cure Wounds",
          "spell_version_key": "2024:cure-wounds",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Lesser Restoration",
          "spell_version_key": "2024:lesser-restoration",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Mass Healing Word",
          "spell_version_key": "2024:mass-healing-word",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Revivify",
          "spell_version_key": "2024:revivify",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Aura of Life",
          "spell_version_key": "2024:aura-of-life",
          "active_from_class_level": 7
        },
        {
          "printed_name": "Death Ward",
          "spell_version_key": "2024:death-ward",
          "active_from_class_level": 7
        },
        {
          "printed_name": "Greater Restoration",
          "spell_version_key": "2024:greater-restoration",
          "active_from_class_level": 9
        },
        {
          "printed_name": "Mass Cure Wounds",
          "spell_version_key": "2024:mass-cure-wounds",
          "active_from_class_level": 9
        }
      ]
    },
    {
      "kind": "renewable_choice",
      "table_name": "circle_of_the_land",
      "choices": [
        {
          "land": "Arid Land",
          "entries": [
            {
              "printed_name": "Blur",
              "spell_version_key": "2024:blur",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Burning Hands",
              "spell_version_key": "2024:burning-hands",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Fire Bolt",
              "spell_version_key": "2024:fire-bolt",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Fireball",
              "spell_version_key": "2024:fireball",
              "active_from_class_level": 5
            },
            {
              "printed_name": "Blight",
              "spell_version_key": "2024:blight",
              "active_from_class_level": 7
            },
            {
              "printed_name": "Wall of Stone",
              "spell_version_key": "2024:wall-of-stone",
              "active_from_class_level": 9
            }
          ]
        },
        {
          "land": "Polar Land",
          "entries": [
            {
              "printed_name": "Fog Cloud",
              "spell_version_key": "2024:fog-cloud",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Hold Person",
              "spell_version_key": "2024:hold-person",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Ray of Frost",
              "spell_version_key": "2024:ray-of-frost",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Sleet Storm",
              "spell_version_key": "2024:sleet-storm",
              "active_from_class_level": 5
            },
            {
              "printed_name": "Ice Storm",
              "spell_version_key": "2024:ice-storm",
              "active_from_class_level": 7
            },
            {
              "printed_name": "Cone of Cold",
              "spell_version_key": "2024:cone-of-cold",
              "active_from_class_level": 9
            }
          ]
        },
        {
          "land": "Temperate Land",
          "entries": [
            {
              "printed_name": "Misty Step",
              "spell_version_key": "2024:misty-step",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Shocking Grasp",
              "spell_version_key": "2024:shocking-grasp",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Sleep",
              "spell_version_key": "2024:sleep",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Lightning Bolt",
              "spell_version_key": "2024:lightning-bolt",
              "active_from_class_level": 5
            },
            {
              "printed_name": "Freedom of Movement",
              "spell_version_key": "2024:freedom-of-movement",
              "active_from_class_level": 7
            },
            {
              "printed_name": "Tree Stride",
              "spell_version_key": "2024:tree-stride",
              "active_from_class_level": 9
            }
          ]
        },
        {
          "land": "Tropical Land",
          "entries": [
            {
              "printed_name": "Acid Splash",
              "spell_version_key": "2024:acid-splash",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Ray of Sickness",
              "spell_version_key": "2024:ray-of-sickness",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Web",
              "spell_version_key": "2024:web",
              "active_from_class_level": 3
            },
            {
              "printed_name": "Stinking Cloud",
              "spell_version_key": "2024:stinking-cloud",
              "active_from_class_level": 5
            },
            {
              "printed_name": "Polymorph",
              "spell_version_key": "2024:polymorph",
              "active_from_class_level": 7
            },
            {
              "printed_name": "Insect Plague",
              "spell_version_key": "2024:insect-plague",
              "active_from_class_level": 9
            }
          ]
        }
      ]
    },
    {
      "kind": "unconditional",
      "table_name": "oath_of_devotion",
      "entries": [
        {
          "printed_name": "Protection from Evil and Good",
          "spell_version_key": "2024:protection-from-evil-and-good",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Shield of Faith",
          "spell_version_key": "2024:shield-of-faith",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Aid",
          "spell_version_key": "2024:aid",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Zone of Truth",
          "spell_version_key": "2024:zone-of-truth",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Beacon of Hope",
          "spell_version_key": "2024:beacon-of-hope",
          "active_from_class_level": 9
        },
        {
          "printed_name": "Dispel Magic",
          "spell_version_key": "2024:dispel-magic",
          "active_from_class_level": 9
        },
        {
          "printed_name": "Freedom of Movement",
          "spell_version_key": "2024:freedom-of-movement",
          "active_from_class_level": 13
        },
        {
          "printed_name": "Guardian of Faith",
          "spell_version_key": "2024:guardian-of-faith",
          "active_from_class_level": 13
        },
        {
          "printed_name": "Commune",
          "spell_version_key": "2024:commune",
          "active_from_class_level": 17
        },
        {
          "printed_name": "Flame Strike",
          "spell_version_key": "2024:flame-strike",
          "active_from_class_level": 17
        }
      ]
    },
    {
      "kind": "unconditional",
      "table_name": "draconic_sorcery",
      "entries": [
        {
          "printed_name": "Alter Self",
          "spell_version_key": "2024:alter-self",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Chromatic Orb",
          "spell_version_key": "2024:chromatic-orb",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Command",
          "spell_version_key": "2024:command",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Dragon’s Breath",
          "spell_version_key": "2024:dragon-s-breath",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Fear",
          "spell_version_key": "2024:fear",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Fly",
          "spell_version_key": "2024:fly",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Arcane Eye",
          "spell_version_key": "2024:arcane-eye",
          "active_from_class_level": 7
        },
        {
          "printed_name": "Charm Monster",
          "spell_version_key": "2024:charm-monster",
          "active_from_class_level": 7
        },
        {
          "printed_name": "Legend Lore",
          "spell_version_key": "2024:legend-lore",
          "active_from_class_level": 9
        },
        {
          "printed_name": "Summon Dragon",
          "spell_version_key": "2024:summon-dragon",
          "active_from_class_level": 9
        }
      ]
    },
    {
      "kind": "unconditional",
      "table_name": "fiend_patron",
      "entries": [
        {
          "printed_name": "Burning Hands",
          "spell_version_key": "2024:burning-hands",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Command",
          "spell_version_key": "2024:command",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Scorching Ray",
          "spell_version_key": "2024:scorching-ray",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Suggestion",
          "spell_version_key": "2024:suggestion",
          "active_from_class_level": 3
        },
        {
          "printed_name": "Fireball",
          "spell_version_key": "2024:fireball",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Stinking Cloud",
          "spell_version_key": "2024:stinking-cloud",
          "active_from_class_level": 5
        },
        {
          "printed_name": "Fire Shield",
          "spell_version_key": "2024:fire-shield",
          "active_from_class_level": 7
        },
        {
          "printed_name": "Wall of Fire",
          "spell_version_key": "2024:wall-of-fire",
          "active_from_class_level": 7
        },
        {
          "printed_name": "Geas",
          "spell_version_key": "2024:geas",
          "active_from_class_level": 9
        },
        {
          "printed_name": "Insect Plague",
          "spell_version_key": "2024:insect-plague",
          "active_from_class_level": 9
        }
      ]
    }
  ],
  "unconditional_rule_sets": [
    {
      "class_name": "Cleric",
      "subclass_name": "Life Domain",
      "spell_table": "life_domain",
      "rules": [
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-aid",
          "spell_version_key": "2024:aid",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-bless",
          "spell_version_key": "2024:bless",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-cure-wounds",
          "spell_version_key": "2024:cure-wounds",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-lesser-restoration",
          "spell_version_key": "2024:lesser-restoration",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-mass-healing-word",
          "spell_version_key": "2024:mass-healing-word",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-revivify",
          "spell_version_key": "2024:revivify",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-aura-of-life",
          "spell_version_key": "2024:aura-of-life",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 7
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-death-ward",
          "spell_version_key": "2024:death-ward",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 7
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-greater-restoration",
          "spell_version_key": "2024:greater-restoration",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        },
        {
          "kind": "fixed_spell",
          "rule_key": "life-domain-mass-cure-wounds",
          "spell_version_key": "2024:mass-cure-wounds",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        }
      ]
    },
    {
      "class_name": "Paladin",
      "subclass_name": "Oath of Devotion",
      "spell_table": "oath_of_devotion",
      "rules": [
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-protection-from-evil-and-good",
          "spell_version_key": "2024:protection-from-evil-and-good",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-shield-of-faith",
          "spell_version_key": "2024:shield-of-faith",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-aid",
          "spell_version_key": "2024:aid",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-zone-of-truth",
          "spell_version_key": "2024:zone-of-truth",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-beacon-of-hope",
          "spell_version_key": "2024:beacon-of-hope",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-dispel-magic",
          "spell_version_key": "2024:dispel-magic",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-freedom-of-movement",
          "spell_version_key": "2024:freedom-of-movement",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 13
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-guardian-of-faith",
          "spell_version_key": "2024:guardian-of-faith",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 13
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-commune",
          "spell_version_key": "2024:commune",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 17
        },
        {
          "kind": "fixed_spell",
          "rule_key": "oath-of-devotion-flame-strike",
          "spell_version_key": "2024:flame-strike",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 17
        }
      ]
    },
    {
      "class_name": "Sorcerer",
      "subclass_name": "Draconic Sorcery",
      "spell_table": "draconic_sorcery",
      "rules": [
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-alter-self",
          "spell_version_key": "2024:alter-self",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-chromatic-orb",
          "spell_version_key": "2024:chromatic-orb",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-command",
          "spell_version_key": "2024:command",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-dragon-s-breath",
          "spell_version_key": "2024:dragon-s-breath",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-fear",
          "spell_version_key": "2024:fear",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-fly",
          "spell_version_key": "2024:fly",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-arcane-eye",
          "spell_version_key": "2024:arcane-eye",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 7
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-charm-monster",
          "spell_version_key": "2024:charm-monster",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 7
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-legend-lore",
          "spell_version_key": "2024:legend-lore",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        },
        {
          "kind": "fixed_spell",
          "rule_key": "draconic-sorcery-summon-dragon",
          "spell_version_key": "2024:summon-dragon",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        }
      ]
    },
    {
      "class_name": "Warlock",
      "subclass_name": "Fiend Patron",
      "spell_table": "fiend_patron",
      "rules": [
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-burning-hands",
          "spell_version_key": "2024:burning-hands",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-command",
          "spell_version_key": "2024:command",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-scorching-ray",
          "spell_version_key": "2024:scorching-ray",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-suggestion",
          "spell_version_key": "2024:suggestion",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 3
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-fireball",
          "spell_version_key": "2024:fireball",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-stinking-cloud",
          "spell_version_key": "2024:stinking-cloud",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 5
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-fire-shield",
          "spell_version_key": "2024:fire-shield",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 7
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-wall-of-fire",
          "spell_version_key": "2024:wall-of-fire",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 7
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-geas",
          "spell_version_key": "2024:geas",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        },
        {
          "kind": "fixed_spell",
          "rule_key": "fiend-patron-insect-plague",
          "spell_version_key": "2024:insect-plague",
          "bucket": "prepared",
          "always_prepared": true,
          "with_slots": true,
          "active_from_class_level": 9
        }
      ]
    }
  ]
} as const satisfies SrdSubclassManifest);
