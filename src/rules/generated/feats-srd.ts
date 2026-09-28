// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/feats-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/feats.txt sha256=96af9e58dffa92f66d6cca8311ebcbc56ec599c137efb32823da7f0a4e32747a
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
import type { SrdFeatDefinitionRecord } from '../feats-srd-reader';

export const BUNDLED_SRD_FEAT_DEFINITIONS = deepFreeze([
  {
    "content_key": "2024:feat:alert",
    "name": "Alert",
    "catalog_layer": "bundled",
    "source_category": "Origin",
    "grouping": "origin",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nInitiative Proficiency. When you roll Initiative, you can add your Proficiency Bonus to the roll.\n\nInitiative Swap. Immediately after you roll Initiative, you can swap your Initiative with the Initiative of one willing ally in the same combat. You can’t make this swap if you or the ally has the Incapacitated condition."
  },
  {
    "content_key": "2024:feat:magic-initiate",
    "name": "Magic Initiate",
    "catalog_layer": "bundled",
    "source_category": "Origin",
    "grouping": "origin",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": true,
    "prerequisites": [],
    "grant_rules": [
      {
        "kind": "choice_from_list",
        "rule_key": "magic-initiate-cantrips",
        "count": 2,
        "bucket": "cantrip_known",
        "list": "$config.chosen_list",
        "level_min": 0,
        "level_max": 0,
        "with_slots": false,
        "always_prepared": false,
        "free_cast": null
      },
      {
        "kind": "choice_from_list",
        "rule_key": "magic-initiate-level-one",
        "count": 1,
        "bucket": "known",
        "list": "$config.chosen_list",
        "level_min": 1,
        "level_max": 1,
        "with_slots": true,
        "free_cast": {
          "uses": 1,
          "recovery": "long_rest",
          "pool_scope": "per_spell"
        },
        "always_prepared": false
      }
    ],
    "notes": "You gain the following benefits.\n\nTwo Cantrips. You learn two cantrips of your choice from the Cleric, Druid, or Wizard spell list. Intelligence, Wisdom, or Charisma is your spellcasting ability for this feat’s spells (choose when you select this feat).\n\nLevel 1 Spell. Choose a level 1 spell from the same list you selected for this feat’s cantrips. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have.\n\nSpell Change. Whenever you gain a new level, you can replace one of the spells you chose for this feat with a different spell of the same level from the chosen spell list.\n\nRepeatable. You can take this feat more than once, but you must choose a different spell list each time."
  },
  {
    "content_key": "2024:feat:savage-attacker",
    "name": "Savage Attacker",
    "catalog_layer": "bundled",
    "source_category": "Origin",
    "grouping": "origin",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You’ve trained to deal particularly damaging strikes. Once per turn when you hit a target with a weapon, you can roll the weapon’s damage dice twice and use either roll against the target."
  },
  {
    "content_key": "2024:feat:skilled",
    "name": "Skilled",
    "catalog_layer": "bundled",
    "source_category": "Origin",
    "grouping": "origin",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": true,
    "prerequisites": [],
    "grant_rules": [
      {
        "kind": "skill_proficiency",
        "rule_key": "skilled-proficiencies",
        "count": 3,
        "allows_tool_instead": true,
        "always_prepared": false,
        "with_slots": true,
        "free_cast": null
      }
    ],
    "notes": "You gain proficiency in any combination of three skills or tools of your choice.\n\nRepeatable. You can take this feat more than once."
  },
  {
    "content_key": "2024:feat:ability-score-improvement",
    "name": "Ability Score Improvement",
    "catalog_layer": "bundled",
    "source_category": "General",
    "grouping": "general",
    "min_level": 4,
    "ability_points": 2,
    "ability_increase_abilities": "any",
    "ability_increase_maximum": 20,
    "repeatable": true,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1. This feat can’t increase an ability score above 20.\n\nRepeatable. You can take this feat more than once."
  },
  {
    "content_key": "2024:feat:grappler",
    "name": "Grappler",
    "catalog_layer": "bundled",
    "source_category": "General",
    "grouping": "general",
    "min_level": 4,
    "ability_points": 1,
    "ability_increase_abilities": [
      "strength",
      "dexterity"
    ],
    "ability_increase_maximum": 20,
    "repeatable": false,
    "prerequisites": [
      {
        "kind": "ability_score",
        "abilities": [
          "strength",
          "dexterity"
        ],
        "minimum": 13
      }
    ],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase your Strength or Dexterity score by 1, to a maximum of 20.\n\nPunch and Grab. When you hit a creature with an Unarmed Strike as part of the Attack action on your turn, you can use both the Damage and the Grapple option. You can use this benefit only once per turn.\n\nAttack Advantage. You have Advantage on attack rolls against a creature Grappled by you.\n\nFast Wrestler. You don’t have to spend extra movement to move a creature Grappled by you if the creature is your size or smaller."
  },
  {
    "content_key": "2024:feat:archery",
    "name": "Archery",
    "catalog_layer": "bundled",
    "source_category": "Fighting Style",
    "grouping": "fighting_style",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": false,
    "prerequisites": [
      {
        "kind": "feature",
        "feature": "fighting_style"
      }
    ],
    "grant_rules": [],
    "notes": "You gain a +2 bonus to attack rolls you make with Ranged weapons."
  },
  {
    "content_key": "2024:feat:defense",
    "name": "Defense",
    "catalog_layer": "bundled",
    "source_category": "Fighting Style",
    "grouping": "fighting_style",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": false,
    "prerequisites": [
      {
        "kind": "feature",
        "feature": "fighting_style"
      }
    ],
    "grant_rules": [],
    "notes": "While you’re wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class."
  },
  {
    "content_key": "2024:feat:great-weapon-fighting",
    "name": "Great Weapon Fighting",
    "catalog_layer": "bundled",
    "source_category": "Fighting Style",
    "grouping": "fighting_style",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": false,
    "prerequisites": [
      {
        "kind": "feature",
        "feature": "fighting_style"
      }
    ],
    "grant_rules": [],
    "notes": "When you roll damage for an attack you make with a Melee weapon that you are holding with two hands, you can treat any 1 or 2 on a damage die as a 3. The weapon must have the Two-Handed or Versatile property to gain this benefit."
  },
  {
    "content_key": "2024:feat:two-weapon-fighting",
    "name": "Two-Weapon Fighting",
    "catalog_layer": "bundled",
    "source_category": "Fighting Style",
    "grouping": "fighting_style",
    "min_level": null,
    "ability_points": 0,
    "ability_increase_abilities": null,
    "ability_increase_maximum": null,
    "repeatable": false,
    "prerequisites": [
      {
        "kind": "feature",
        "feature": "fighting_style"
      }
    ],
    "grant_rules": [],
    "notes": "When you make an extra attack as a result of using a weapon that has the Light property, you can add your ability modifier to the damage of that attack if you aren’t already adding it to the damage."
  },
  {
    "content_key": "2024:feat:boon-of-combat-prowess",
    "name": "Boon of Combat Prowess",
    "catalog_layer": "bundled",
    "source_category": "Epic Boon",
    "grouping": "epic_boon",
    "min_level": 19,
    "ability_points": 1,
    "ability_increase_abilities": "any",
    "ability_increase_maximum": 30,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase one ability score of your choice by 1, to a maximum of 30.\n\nPeerless Aim. When you miss with an attack roll, you can hit instead. Once you use this benefit, you can’t use it again until the start of your next turn."
  },
  {
    "content_key": "2024:feat:boon-of-dimensional-travel",
    "name": "Boon of Dimensional Travel",
    "catalog_layer": "bundled",
    "source_category": "Epic Boon",
    "grouping": "epic_boon",
    "min_level": 19,
    "ability_points": 1,
    "ability_increase_abilities": "any",
    "ability_increase_maximum": 30,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase one ability score of your choice by 1, to a maximum of 30.\n\nBlink Steps. Immediately after you take the Attack action or the Magic action, you can teleport up to 30 feet to an unoccupied space you can see."
  },
  {
    "content_key": "2024:feat:boon-of-fate",
    "name": "Boon of Fate",
    "catalog_layer": "bundled",
    "source_category": "Epic Boon",
    "grouping": "epic_boon",
    "min_level": 19,
    "ability_points": 1,
    "ability_increase_abilities": "any",
    "ability_increase_maximum": 30,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase one ability score of your choice by 1, to a maximum of 30.\n\nImprove Fate. When you or another creature within 60 feet of you succeeds on or fails a D20 Test, you can roll 2d4 and apply the total rolled as a bonus or penalty to the d20 roll. Once you use this benefit, you can’t use it again until you roll Initiative or finish a Short or Long Rest."
  },
  {
    "content_key": "2024:feat:boon-of-irresistible-offense",
    "name": "Boon of Irresistible Offense",
    "catalog_layer": "bundled",
    "source_category": "Epic Boon",
    "grouping": "epic_boon",
    "min_level": 19,
    "ability_points": 1,
    "ability_increase_abilities": [
      "strength",
      "dexterity"
    ],
    "ability_increase_maximum": 30,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase your Strength or Dexterity score by 1, to a maximum of 30.\n\nOvercome Defenses. The Bludgeoning, Piercing, and Slashing damage you deal always ignores Resistance.\n\nOverwhelming Strike. When you roll a 20 on the d20 for an attack roll, you can deal extra damage to the target equal to the ability score increased by this feat. The extra damage’s type is the same as the attack’s type."
  },
  {
    "content_key": "2024:feat:boon-of-spell-recall",
    "name": "Boon of Spell Recall",
    "catalog_layer": "bundled",
    "source_category": "Epic Boon",
    "grouping": "epic_boon",
    "min_level": 19,
    "ability_points": 1,
    "ability_increase_abilities": [
      "intelligence",
      "wisdom",
      "charisma"
    ],
    "ability_increase_maximum": 30,
    "repeatable": false,
    "prerequisites": [
      {
        "kind": "feature",
        "feature": "spellcasting"
      }
    ],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 30.\n\nFree Casting. Whenever you cast a spell with a level 1–4 spell slot, roll 1d4. If the number you roll is the same as the slot’s level, the slot isn’t expended."
  },
  {
    "content_key": "2024:feat:boon-of-the-night-spirit",
    "name": "Boon of the Night Spirit",
    "catalog_layer": "bundled",
    "source_category": "Epic Boon",
    "grouping": "epic_boon",
    "min_level": 19,
    "ability_points": 1,
    "ability_increase_abilities": "any",
    "ability_increase_maximum": 30,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase one ability score of your choice by 1, to a maximum of 30.\n\nMerge with Shadows. While within Dim Light or Darkness, you can give yourself the Invisible condition as a Bonus Action. The condition ends on you immediately after you take an action, a Bonus Action, or a Reaction.\n\nShadowy Form. While within Dim Light or Darkness, you have Resistance to all damage except Psychic and Radiant."
  },
  {
    "content_key": "2024:feat:boon-of-truesight",
    "name": "Boon of Truesight",
    "catalog_layer": "bundled",
    "source_category": "Epic Boon",
    "grouping": "epic_boon",
    "min_level": 19,
    "ability_points": 1,
    "ability_increase_abilities": "any",
    "ability_increase_maximum": 30,
    "repeatable": false,
    "prerequisites": [],
    "grant_rules": [],
    "notes": "You gain the following benefits.\n\nAbility Score Increase. Increase one ability score of your choice by 1, to a maximum of 30.\n\nTruesight. You have Truesight with a range of 60 feet."
  }
] as const satisfies readonly SrdFeatDefinitionRecord[]);
