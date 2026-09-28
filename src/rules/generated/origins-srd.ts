// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/origins-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/species-descriptions.txt sha256=d59101de6375cabe17c320303b8f365cd7ea2a2e589ebf568324c750c0655da9
//   docs/srd/source/backgrounds.txt sha256=6993612280d0d255d5b702945f4da9448fbd3966ef5b47b8e196e0e0cc837a06
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
import type { SrdOriginsArtifact } from '../origins-srd-reader';

/** Every species template key this artifact records: the closed set the runtime mints `ContentKey` from. */
export type BundledSrdSpeciesContentKeyText =
  | "2024:species:dragonborn"
  | "2024:species:dwarf"
  | "2024:species:elf"
  | "2024:species:gnome"
  | "2024:species:goliath"
  | "2024:species:halfling"
  | "2024:species:human"
  | "2024:species:orc"
  | "2024:species:tiefling";

/** Every background template key this artifact records: the closed set the runtime mints `ContentKey` from. */
export type BundledSrdBackgroundContentKeyText =
  | "2024:background:acolyte"
  | "2024:background:criminal"
  | "2024:background:sage"
  | "2024:background:soldier";

export const BUNDLED_SRD_ORIGINS = {
  "species": [
    {
      "content_key": "2024:species:dragonborn",
      "name": "Dragonborn",
      "creature_type": "Humanoid",
      "size": "Medium",
      "alternate_size": null,
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Draconic Ancestry",
          "description": "Your lineage stems from a dragon progenitor. Choose the kind of dragon from the Draconic Ancestors table. Your choice affects your Breath Weapon and Damage Resistance traits as well as your appearance.\n\nDraconic Ancestors\nDragon Damage Type            Dragon Damage Type\nBlack     Acid                 Gold      Fire\nBlue      Lightning            Green     Poison\nBrass     Fire                 Red       Fire\nBronze    Lightning            Silver    Cold\nCopper Acid                    White     Cold",
          "effects": []
        },
        {
          "name": "Breath Weapon",
          "description": "When you take the Attack action on your turn, you can replace one of your attacks with an exhalation of magical energy in either a 15-foot Cone or a 30-foot Line that is 5 feet wide (choose the shape each time). Each creature in that area must make a Dexterity saving throw (DC 8 plus your Constitution modifier and Proficiency Bonus). On a failed save, a creature takes 1d10 damage of the type determined by your Draconic Ancestry trait. On a successful save, a creature takes half as much damage. This damage increases by 1d10 when you reach character levels 5 (2d10), 11 (3d10), and 17 (4d10). You can use this Breath Weapon a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
          "effects": []
        },
        {
          "name": "Damage Resistance",
          "description": "You have Resistance to the damage type determined by your Draconic Ancestry trait.",
          "effects": [
            {
              "effect_kind": "damage_resistance",
              "damage_type": null,
              "hit_points_flat": null,
              "hit_points_per_level": null,
              "speed_bonus_feet": null
            }
          ]
        },
        {
          "name": "Darkvision",
          "description": "You have Darkvision with a range of 60 feet.",
          "effects": []
        },
        {
          "name": "Draconic Flight",
          "description": "When you reach character level 5, you can channel draconic magic to give yourself temporary flight. As a Bonus Action, you sprout spectral wings on your back that last for 10 minutes or until you retract the wings (no action required) or have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Your wings appear to be made of the same energy as your Breath Weapon. Once you use this trait, you can’t use it again until you finish a Long Rest.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:dwarf",
      "name": "Dwarf",
      "creature_type": "Humanoid",
      "size": "Medium",
      "alternate_size": null,
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Darkvision",
          "description": "You have Darkvision with a range of 120 feet.",
          "effects": []
        },
        {
          "name": "Dwarven Resilience",
          "description": "You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition.",
          "effects": [
            {
              "effect_kind": "damage_resistance",
              "damage_type": "Poison",
              "hit_points_flat": null,
              "hit_points_per_level": null,
              "speed_bonus_feet": null
            }
          ]
        },
        {
          "name": "Dwarven Toughness",
          "description": "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level.",
          "effects": [
            {
              "effect_kind": "hp_modifier",
              "damage_type": null,
              "hit_points_flat": 0,
              "hit_points_per_level": 1,
              "speed_bonus_feet": null
            }
          ]
        },
        {
          "name": "Stonecunning",
          "description": "As a Bonus Action, you gain Tremorsense with a range of 60 feet for 10 minutes. You must be on a stone surface or touching a stone surface to use this Tremorsense. The stone can be natural or worked. You can use this Bonus Action a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:elf",
      "name": "Elf",
      "creature_type": "Humanoid",
      "size": "Medium",
      "alternate_size": null,
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Darkvision",
          "description": "You have Darkvision with a range of 60 feet.",
          "effects": []
        },
        {
          "name": "Elven Lineage",
          "description": "You are part of a lineage that grants you supernatural abilities. Choose a lineage from the Elven Lineages table. You gain the level 1 benefit of that lineage. When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage).\n\nElven Lineages\nLineage     Level 1                                                       Level 3               Level 5\nDrow         The range of your Darkvision increases to 120 feet.          Faerie Fire           Darkness\nYou also know the Dancing Lights cantrip.\nHigh Elf     You know the Prestidigitation cantrip. Whenever you finish    Detect Magic          Misty Step\na Long Rest, you can replace that cantrip with a different\ncantrip from the Wizard spell list.\nWood Elf     Your Speed increases to 35 feet. You also know the            Longstrider           Pass without Trace\nDruidcraft cantrip.",
          "effects": []
        },
        {
          "name": "Fey Ancestry",
          "description": "You have Advantage on saving throws you make to avoid or end the Charmed condition.",
          "effects": []
        },
        {
          "name": "Keen Senses",
          "description": "You have proficiency in the Insight, Perception, or Survival skill.",
          "effects": []
        },
        {
          "name": "Trance",
          "description": "You don’t need to sleep, and magic can’t put you to sleep. You can finish a Long Rest in 4 hours if you spend those hours in a trancelike meditation, during which you retain consciousness.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:gnome",
      "name": "Gnome",
      "creature_type": "Humanoid",
      "size": "Small",
      "alternate_size": null,
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Darkvision",
          "description": "You have Darkvision with a range of 60 feet.",
          "effects": []
        },
        {
          "name": "Gnomish Cunning",
          "description": "You have Advantage on Intelligence, Wisdom, and Charisma saving throws.",
          "effects": []
        },
        {
          "name": "Gnomish Lineage",
          "description": "You are part of a lineage that grants you supernatural abilities. Choose one of the following options; whichever one you choose, Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the lineage): Forest Gnome. You know the Minor Illusion cantrip. You also always have the Speak with Animals spell prepared. You can cast it without a spell slot a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest. You can also use any spell slots you have to cast the spell. Rock Gnome. You know the Mending and Prestidigitation cantrips. In addition, you can spend 10 minutes casting Prestidigitation to create a Tiny clockwork device (AC 5, 1 HP), such as a toy, fire starter, or music box. When you create the device, you determine its function by choosing one effect from Prestidigitation; the device produces that effect whenever you or another creature takes a Bonus Action to activate it with a touch. If the chosen effect has options within it, you choose one of those options for the device when you create it. For example, if you choose the spell’s ignite-extinguish effect, you determine whether the device ignites or extinguishes fire; the device doesn’t do both. You can have three such devices in existence at a time, and each falls apart 8 hours after its creation or when you dismantle it with a touch as a Utilize action.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:goliath",
      "name": "Goliath",
      "creature_type": "Humanoid",
      "size": "Medium",
      "alternate_size": null,
      "base_speed_feet": 35,
      "traits": [
        {
          "name": "Giant Ancestry",
          "description": "You are descended from Giants. Choose one of the following benefits—a supernatural boon from your ancestry; you can use the chosen benefit a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Long Rest: Cloud’s Jaunt (Cloud Giant). As a Bonus Action, you magically teleport up to 30 feet to an unoccupied space you can see. Fire’s Burn (Fire Giant). When you hit a target with an attack roll and deal damage to it, you can also deal 1d10 Fire damage to that target. Frost’s Chill (Frost Giant). When you hit a target with an attack roll and deal damage to it, you can also deal 1d6 Cold damage to that target and reduce its Speed by 10 feet until the start of your next turn. Hill’s Tumble (Hill Giant). When you hit a Large or smaller creature with an attack roll and deal damage to it, you can give that target the Prone condition. Stone’s Endurance (Stone Giant). When you take damage, you can take a Reaction to roll 1d12. Add your Constitution modifier to the number rolled and reduce the damage by that total. Storm’s Thunder (Storm Giant). When you take damage from a creature within 60 feet of you, you can take a Reaction to deal 1d8 Thunder damage to that creature.",
          "effects": []
        },
        {
          "name": "Large Form",
          "description": "Starting at character level 5, you can change your size to Large as a Bonus Action if you’re in a big enough space. This transformation lasts for 10 minutes or until you end it (no action required). For that duration, you have Advantage on Strength checks, and your Speed increases by 10 feet. Once you use this trait, you can’t use it again until you finish a Long Rest.",
          "effects": []
        },
        {
          "name": "Powerful Build",
          "description": "You have Advantage on any ability check you make to end the Grappled condition. You also count as one size larger when determining your carrying capacity.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:halfling",
      "name": "Halfling",
      "creature_type": "Humanoid",
      "size": "Small",
      "alternate_size": null,
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Brave",
          "description": "You have Advantage on saving throws you make to avoid or end the Frightened condition.",
          "effects": []
        },
        {
          "name": "Halfling Nimbleness",
          "description": "You can move through the space of any creature that is a size larger than you, but you can’t stop in the same space.",
          "effects": []
        },
        {
          "name": "Luck",
          "description": "When you roll a 1 on the d20 of a D20 Test, you can reroll the die, and you must use the new roll.",
          "effects": []
        },
        {
          "name": "Naturally Stealthy",
          "description": "You can take the Hide action even when you are obscured only by a creature that is at least one size larger than you.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:human",
      "name": "Human",
      "creature_type": "Humanoid",
      "size": "Medium",
      "alternate_size": "Small",
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Resourceful",
          "description": "You gain Heroic Inspiration whenever you finish a Long Rest.",
          "effects": []
        },
        {
          "name": "Skillful",
          "description": "You gain proficiency in one skill of your choice.",
          "effects": []
        },
        {
          "name": "Versatile",
          "description": "You gain an Origin feat of your choice (see “Feats”). Skilled is recommended.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:orc",
      "name": "Orc",
      "creature_type": "Humanoid",
      "size": "Medium",
      "alternate_size": null,
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Adrenaline Rush",
          "description": "You can take the Dash action as a Bonus Action. When you do so, you gain a number of Temporary Hit Points equal to your Proficiency Bonus. You can use this trait a number of times equal to your Proficiency Bonus, and you regain all expended uses when you finish a Short or Long Rest.",
          "effects": []
        },
        {
          "name": "Darkvision",
          "description": "You have Darkvision with a range of 120 feet.",
          "effects": []
        },
        {
          "name": "Relentless Endurance",
          "description": "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can’t do so again until you finish a Long Rest.",
          "effects": []
        }
      ]
    },
    {
      "content_key": "2024:species:tiefling",
      "name": "Tiefling",
      "creature_type": "Humanoid",
      "size": "Medium",
      "alternate_size": "Small",
      "base_speed_feet": 30,
      "traits": [
        {
          "name": "Darkvision",
          "description": "You have Darkvision with a range of 60 feet.",
          "effects": []
        },
        {
          "name": "Fiendish Legacy",
          "description": "You are the recipient of a legacy that grants you supernatural abilities. Choose a legacy from the Fiendish Legacies table. You gain the level 1 benefit of the chosen legacy. When you reach character levels 3 and 5, you learn a higher-level spell, as shown on the table. You always have that spell prepared. You can cast it once without a spell slot, and you regain the ability to cast it in that way when you finish a Long Rest. You can also cast the spell using any spell slots you have of the appropriate level. Intelligence, Wisdom, or Charisma is your spellcasting ability for the spells you cast with this trait (choose the ability when you select the legacy).\n\nFiendish Legacies\nLegacy        Level 1                                      Level 3                    Level 5\nAbyssal       You have Resistance to Poison damage.         Ray of Sickness            Hold Person\nYou also know the Poison Spray cantrip.\nChthonic      You have Resistance to Necrotic damage.       False Life                 Ray of Enfeeblement\nYou also know the Chill Touch cantrip.\nInfernal      You have Resistance to Fire damage.           Hellish Rebuke             Darkness\nYou also know the Fire Bolt cantrip.",
          "effects": [
            {
              "effect_kind": "damage_resistance",
              "damage_type": null,
              "hit_points_flat": null,
              "hit_points_per_level": null,
              "speed_bonus_feet": null
            }
          ]
        },
        {
          "name": "Otherworldly Presence",
          "description": "You know the Thaumaturgy cantrip. When you cast it with this trait, the spell uses the same spellcasting ability you use for your Fiendish Legacy trait.",
          "effects": []
        }
      ]
    }
  ],
  "backgrounds": [
    {
      "content_key": "2024:background:acolyte",
      "name": "Acolyte",
      "ability_score_1": "Intelligence",
      "ability_score_2": "Wisdom",
      "ability_score_3": "Charisma",
      "feat_name": "Magic Initiate (Cleric)",
      "skill_proficiency_1": "Insight",
      "skill_proficiency_2": "Religion",
      "tool_proficiency": "Calligrapher’s Supplies",
      "equipment_option_a": "Calligrapher’s Supplies, Book (prayers), Holy Symbol, Parchment (10 sheets), Robe, 8 GP",
      "equipment_option_b": "50 GP",
      "equipment_items": [
        {
          "option": "a",
          "sort_order": 1,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Calligrapher’s Supplies",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 2,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Book (prayers)",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 3,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Holy Symbol",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 4,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Parchment (10 sheets)",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 5,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Robe",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 6,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "8 GP",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "b",
          "sort_order": 1,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "50 GP",
          "quantity": 1,
          "item_kind": "gear"
        }
      ]
    },
    {
      "content_key": "2024:background:criminal",
      "name": "Criminal",
      "ability_score_1": "Dexterity",
      "ability_score_2": "Constitution",
      "ability_score_3": "Intelligence",
      "feat_name": "Alert",
      "skill_proficiency_1": "Sleight of Hand",
      "skill_proficiency_2": "Stealth",
      "tool_proficiency": "Thieves’ Tools",
      "equipment_option_a": "2 Daggers, Thieves’ Tools, Crowbar, 2 Pouches, Traveler’s Clothes, 16 GP",
      "equipment_option_b": "50 GP",
      "equipment_items": [
        {
          "option": "a",
          "sort_order": 1,
          "weapon_content_key": "2024:weapon:dagger",
          "armor_content_key": null,
          "item_name": "Daggers",
          "quantity": 2,
          "item_kind": "weapon"
        },
        {
          "option": "a",
          "sort_order": 2,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Thieves’ Tools",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 3,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Crowbar",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 4,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Pouches",
          "quantity": 2,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 5,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Traveler’s Clothes",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 6,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "16 GP",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "b",
          "sort_order": 1,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "50 GP",
          "quantity": 1,
          "item_kind": "gear"
        }
      ]
    },
    {
      "content_key": "2024:background:sage",
      "name": "Sage",
      "ability_score_1": "Constitution",
      "ability_score_2": "Intelligence",
      "ability_score_3": "Wisdom",
      "feat_name": "Magic Initiate (Wizard)",
      "skill_proficiency_1": "Arcana",
      "skill_proficiency_2": "History",
      "tool_proficiency": "Calligrapher’s Supplies",
      "equipment_option_a": "Quarterstaff, Calligrapher’s Supplies, Book (history), Parchment (8 sheets), Robe, 8 GP",
      "equipment_option_b": "50 GP",
      "equipment_items": [
        {
          "option": "a",
          "sort_order": 1,
          "weapon_content_key": "2024:weapon:quarterstaff",
          "armor_content_key": null,
          "item_name": "Quarterstaff",
          "quantity": 1,
          "item_kind": "weapon"
        },
        {
          "option": "a",
          "sort_order": 2,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Calligrapher’s Supplies",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 3,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Book (history)",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 4,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Parchment (8 sheets)",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 5,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Robe",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 6,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "8 GP",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "b",
          "sort_order": 1,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "50 GP",
          "quantity": 1,
          "item_kind": "gear"
        }
      ]
    },
    {
      "content_key": "2024:background:soldier",
      "name": "Soldier",
      "ability_score_1": "Strength",
      "ability_score_2": "Dexterity",
      "ability_score_3": "Constitution",
      "feat_name": "Savage Attacker",
      "skill_proficiency_1": "Athletics",
      "skill_proficiency_2": "Intimidation",
      "tool_proficiency": "Choose one kind of Gaming Set",
      "equipment_option_a": "Spear, Shortbow, 20 Arrows, Gaming Set (same as above), Healer’s Kit, Quiver, Traveler’s Clothes, 14 GP",
      "equipment_option_b": "50 GP",
      "equipment_items": [
        {
          "option": "a",
          "sort_order": 1,
          "weapon_content_key": "2024:weapon:spear",
          "armor_content_key": null,
          "item_name": "Spear",
          "quantity": 1,
          "item_kind": "weapon"
        },
        {
          "option": "a",
          "sort_order": 2,
          "weapon_content_key": "2024:weapon:shortbow",
          "armor_content_key": null,
          "item_name": "Shortbow",
          "quantity": 1,
          "item_kind": "weapon"
        },
        {
          "option": "a",
          "sort_order": 3,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Arrows",
          "quantity": 20,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 4,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Gaming Set (same as above)",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 5,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Healer’s Kit",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 6,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Quiver",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 7,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "Traveler’s Clothes",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "a",
          "sort_order": 8,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "14 GP",
          "quantity": 1,
          "item_kind": "gear"
        },
        {
          "option": "b",
          "sort_order": 1,
          "weapon_content_key": null,
          "armor_content_key": null,
          "item_name": "50 GP",
          "quantity": 1,
          "item_kind": "gear"
        }
      ]
    }
  ]
} as const satisfies SrdOriginsArtifact<BundledSrdSpeciesContentKeyText, BundledSrdBackgroundContentKeyText>;
deepFreeze(BUNDLED_SRD_ORIGINS);
