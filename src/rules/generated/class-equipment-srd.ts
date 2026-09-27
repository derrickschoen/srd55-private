// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/class-equipment-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/class-starting-equipment.txt sha256=e4011ad3662cd63aea29df7998eb9bf078c1aaccb8ada199b3801c406fa039fe
//   docs/srd/source/weapons-table.txt sha256=bec5ac33b7ecfea781ac594f5724778d73de3c5baa057dbb934419cd7a44630f
//   docs/srd/source/armor-table.txt sha256=a5cf0886a0339b8955d9bb990a43e282800780e963658c4f20ea590c9a62fdd0
// Regenerate with `npm run srd:artifacts`.
// tests/unit/tools/srd-artifacts-fresh.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import type { SrdClassEquipment } from '../class-equipment-srd-reader';

export const BUNDLED_SRD_CLASS_EQUIPMENT = [
  {
    "class_name": "Barbarian",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": "2024:weapon:greataxe",
        "armor_content_key": null,
        "item_name": "Greataxe",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": "2024:weapon:handaxe",
        "armor_content_key": null,
        "item_name": "Handaxes",
        "quantity": 4,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Explorer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "15 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "75 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Bard",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:leather-armor",
        "item_name": "Leather Armor",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": "2024:weapon:dagger",
        "armor_content_key": null,
        "item_name": "Daggers",
        "quantity": 2,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Musical Instrument of your choice",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Entertainer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "19 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "90 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Cleric",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:chain-shirt",
        "item_name": "Chain Shirt",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:shield",
        "item_name": "Shield",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:mace",
        "armor_content_key": null,
        "item_name": "Mace",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Holy Symbol",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Priest’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 6,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "7 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "110 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Druid",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:leather-armor",
        "item_name": "Leather Armor",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:shield",
        "item_name": "Shield",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:sickle",
        "armor_content_key": null,
        "item_name": "Sickle",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Druidic Focus (Quarterstaff)",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Explorer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 6,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Herbalism Kit",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 7,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "9 GP",
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
    "class_name": "Fighter",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:chain-mail",
        "item_name": "Chain Mail",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": "2024:weapon:greatsword",
        "armor_content_key": null,
        "item_name": "Greatsword",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:flail",
        "armor_content_key": null,
        "item_name": "Flail",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": "2024:weapon:javelin",
        "armor_content_key": null,
        "item_name": "Javelins",
        "quantity": 8,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Dungeoneer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 6,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "4 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:studded-leather-armor",
        "item_name": "Studded Leather Armor",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "b",
        "sort_order": 2,
        "weapon_content_key": "2024:weapon:scimitar",
        "armor_content_key": null,
        "item_name": "Scimitar",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "b",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:shortsword",
        "armor_content_key": null,
        "item_name": "Shortsword",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "b",
        "sort_order": 4,
        "weapon_content_key": "2024:weapon:longbow",
        "armor_content_key": null,
        "item_name": "Longbow",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "b",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Arrows",
        "quantity": 20,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 6,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Quiver",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 7,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Dungeoneer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 8,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "11 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "c",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "155 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Monk",
    "items": [
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
        "weapon_content_key": "2024:weapon:dagger",
        "armor_content_key": null,
        "item_name": "Daggers",
        "quantity": 5,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Artisan’s Tools or Musical Instrument chosen for the tool proficiency above",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Explorer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "11 GP",
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
    "class_name": "Paladin",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:chain-mail",
        "item_name": "Chain Mail",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:shield",
        "item_name": "Shield",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:longsword",
        "armor_content_key": null,
        "item_name": "Longsword",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": "2024:weapon:javelin",
        "armor_content_key": null,
        "item_name": "Javelins",
        "quantity": 6,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Holy Symbol",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 6,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Priest’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 7,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "9 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "150 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Ranger",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:studded-leather-armor",
        "item_name": "Studded Leather Armor",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": "2024:weapon:scimitar",
        "armor_content_key": null,
        "item_name": "Scimitar",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:shortsword",
        "armor_content_key": null,
        "item_name": "Shortsword",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": "2024:weapon:longbow",
        "armor_content_key": null,
        "item_name": "Longbow",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Arrows",
        "quantity": 20,
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
        "item_name": "Druidic Focus (sprig of mistletoe)",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 8,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Explorer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 9,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "7 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "150 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Rogue",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:leather-armor",
        "item_name": "Leather Armor",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": "2024:weapon:dagger",
        "armor_content_key": null,
        "item_name": "Daggers",
        "quantity": 2,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:shortsword",
        "armor_content_key": null,
        "item_name": "Shortsword",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": "2024:weapon:shortbow",
        "armor_content_key": null,
        "item_name": "Shortbow",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Arrows",
        "quantity": 20,
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
        "item_name": "Thieves’ Tools",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 8,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Burglar’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 9,
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
        "item_name": "100 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Sorcerer",
    "items": [
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
        "weapon_content_key": "2024:weapon:dagger",
        "armor_content_key": null,
        "item_name": "Daggers",
        "quantity": 2,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Arcane Focus (crystal)",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Dungeoneer’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "28 GP",
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
    "class_name": "Warlock",
    "items": [
      {
        "option": "a",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": "2024:armor:leather-armor",
        "item_name": "Leather Armor",
        "quantity": 1,
        "item_kind": "armor"
      },
      {
        "option": "a",
        "sort_order": 2,
        "weapon_content_key": "2024:weapon:sickle",
        "armor_content_key": null,
        "item_name": "Sickle",
        "quantity": 1,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": "2024:weapon:dagger",
        "armor_content_key": null,
        "item_name": "Daggers",
        "quantity": 2,
        "item_kind": "weapon"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Arcane Focus (orb)",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Book (occult lore)",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 6,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Scholar’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 7,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "15 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "100 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  },
  {
    "class_name": "Wizard",
    "items": [
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
        "item_name": "Arcane Focus (Quarterstaff)",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 3,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Robe",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 4,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Spellbook",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 5,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "Scholar’s Pack",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "a",
        "sort_order": 6,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "5 GP",
        "quantity": 1,
        "item_kind": "gear"
      },
      {
        "option": "b",
        "sort_order": 1,
        "weapon_content_key": null,
        "armor_content_key": null,
        "item_name": "55 GP",
        "quantity": 1,
        "item_kind": "gear"
      }
    ]
  }
] as const satisfies readonly SrdClassEquipment[];
