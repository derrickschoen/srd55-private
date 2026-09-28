// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/weapons-srd-reader.ts, each source pinned by its sha256:
//   docs/srd/source/weapons-table.txt sha256=bec5ac33b7ecfea781ac594f5724778d73de3c5baa057dbb934419cd7a44630f
//   docs/srd/source/weapon-mastery-progression.txt sha256=abffb6f60ee785df7e951772ad068d0993e3aa0c84046beaad5e9249c9694aff
// Regenerate with `npm run srd:artifacts`.
// tests/unit/tools/srd-artifacts-fresh.test.ts fails if it drifts, or if any byte of a source changes.
/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import type { SrdWeaponsArtifact } from '../weapons-srd-reader';

/** Every weapon template key this artifact records: the closed set the runtime mints `ContentKey` from. */
export type BundledSrdWeaponContentKeyText =
  | "2024:weapon:club"
  | "2024:weapon:dagger"
  | "2024:weapon:greatclub"
  | "2024:weapon:handaxe"
  | "2024:weapon:javelin"
  | "2024:weapon:light-hammer"
  | "2024:weapon:mace"
  | "2024:weapon:quarterstaff"
  | "2024:weapon:sickle"
  | "2024:weapon:spear"
  | "2024:weapon:dart"
  | "2024:weapon:light-crossbow"
  | "2024:weapon:shortbow"
  | "2024:weapon:sling"
  | "2024:weapon:battleaxe"
  | "2024:weapon:flail"
  | "2024:weapon:glaive"
  | "2024:weapon:greataxe"
  | "2024:weapon:greatsword"
  | "2024:weapon:halberd"
  | "2024:weapon:lance"
  | "2024:weapon:longsword"
  | "2024:weapon:maul"
  | "2024:weapon:morningstar"
  | "2024:weapon:pike"
  | "2024:weapon:rapier"
  | "2024:weapon:scimitar"
  | "2024:weapon:shortsword"
  | "2024:weapon:trident"
  | "2024:weapon:warhammer"
  | "2024:weapon:war-pick"
  | "2024:weapon:whip"
  | "2024:weapon:blowgun"
  | "2024:weapon:hand-crossbow"
  | "2024:weapon:heavy-crossbow"
  | "2024:weapon:longbow"
  | "2024:weapon:musket"
  | "2024:weapon:pistol";

export const BUNDLED_SRD_WEAPONS = {
  "templates": [
    {
      "content_key": "2024:weapon:club",
      "name": "Club",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d4"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": true,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Slow",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:dagger",
      "name": "Dagger",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d4"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": true,
      "heavy": false,
      "light": true,
      "loading": false,
      "reach": false,
      "thrown": true,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "ranged",
        "near_feet": 20,
        "far_feet": 60
      },
      "mastery_property": "Nick",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:greatclub",
      "name": "Greatclub",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Push",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:handaxe",
      "name": "Handaxe",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": true,
      "loading": false,
      "reach": false,
      "thrown": true,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "ranged",
        "near_feet": 20,
        "far_feet": 60
      },
      "mastery_property": "Vex",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:javelin",
      "name": "Javelin",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": true,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "ranged",
        "near_feet": 30,
        "far_feet": 120
      },
      "mastery_property": "Slow",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:light-hammer",
      "name": "Light Hammer",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d4"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": true,
      "loading": false,
      "reach": false,
      "thrown": true,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "ranged",
        "near_feet": 20,
        "far_feet": 60
      },
      "mastery_property": "Nick",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:mace",
      "name": "Mace",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Sap",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:quarterstaff",
      "name": "Quarterstaff",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Topple",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:sickle",
      "name": "Sickle",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d4"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": true,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Nick",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:spear",
      "name": "Spear",
      "srd_group": "simple_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": true,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "ranged",
        "near_feet": 20,
        "far_feet": 60
      },
      "mastery_property": "Sap",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:dart",
      "name": "Dart",
      "srd_group": "simple_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d4"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": true,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": true,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "ranged",
        "near_feet": 20,
        "far_feet": 60
      },
      "mastery_property": "Vex",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:light-crossbow",
      "name": "Light Crossbow",
      "srd_group": "simple_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": true,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": true,
      "ammunition_kind": "Bolt",
      "range": {
        "kind": "ranged",
        "near_feet": 80,
        "far_feet": 320
      },
      "mastery_property": "Slow",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:shortbow",
      "name": "Shortbow",
      "srd_group": "simple_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": true,
      "ammunition_kind": "Arrow",
      "range": {
        "kind": "ranged",
        "near_feet": 80,
        "far_feet": 320
      },
      "mastery_property": "Vex",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:sling",
      "name": "Sling",
      "srd_group": "simple_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d4"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": true,
      "ammunition_kind": "Bullet",
      "range": {
        "kind": "ranged",
        "near_feet": 30,
        "far_feet": 120
      },
      "mastery_property": "Slow",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:battleaxe",
      "name": "Battleaxe",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Topple",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:flail",
      "name": "Flail",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Sap",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:glaive",
      "name": "Glaive",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": true,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Graze",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:greataxe",
      "name": "Greataxe",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d12"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Cleave",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:greatsword",
      "name": "Greatsword",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "2d6"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Graze",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:halberd",
      "name": "Halberd",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": true,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Cleave",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:lance",
      "name": "Lance",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": true,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Topple",
      "other_properties": "Two-Handed (unless mounted)"
    },
    {
      "content_key": "2024:weapon:longsword",
      "name": "Longsword",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Sap",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:maul",
      "name": "Maul",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "2d6"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Topple",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:morningstar",
      "name": "Morningstar",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Sap",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:pike",
      "name": "Pike",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": true,
      "thrown": false,
      "two_handed": true,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Push",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:rapier",
      "name": "Rapier",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": true,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Vex",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:scimitar",
      "name": "Scimitar",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": true,
      "heavy": false,
      "light": true,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Nick",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:shortsword",
      "name": "Shortsword",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": true,
      "heavy": false,
      "light": true,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Vex",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:trident",
      "name": "Trident",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": true,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "ranged",
        "near_feet": 20,
        "far_feet": 60
      },
      "mastery_property": "Topple",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:warhammer",
      "name": "Warhammer",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Bludgeoning",
      "versatile_damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Push",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:war-pick",
      "name": "War Pick",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Sap",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:whip",
      "name": "Whip",
      "srd_group": "martial_melee",
      "damage": {
        "kind": "dice",
        "dice": "1d4"
      },
      "damage_type": "Slashing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": true,
      "heavy": false,
      "light": false,
      "loading": false,
      "reach": true,
      "thrown": false,
      "two_handed": false,
      "ammunition": false,
      "ammunition_kind": null,
      "range": {
        "kind": "none"
      },
      "mastery_property": "Slow",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:blowgun",
      "name": "Blowgun",
      "srd_group": "martial_ranged",
      "damage": {
        "kind": "flat",
        "amount": 1
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": true,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": true,
      "ammunition_kind": "Needle",
      "range": {
        "kind": "ranged",
        "near_feet": 25,
        "far_feet": 100
      },
      "mastery_property": "Vex",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:hand-crossbow",
      "name": "Hand Crossbow",
      "srd_group": "martial_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d6"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": true,
      "loading": true,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": true,
      "ammunition_kind": "Bolt",
      "range": {
        "kind": "ranged",
        "near_feet": 30,
        "far_feet": 120
      },
      "mastery_property": "Vex",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:heavy-crossbow",
      "name": "Heavy Crossbow",
      "srd_group": "martial_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": true,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": true,
      "ammunition_kind": "Bolt",
      "range": {
        "kind": "ranged",
        "near_feet": 100,
        "far_feet": 400
      },
      "mastery_property": "Push",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:longbow",
      "name": "Longbow",
      "srd_group": "martial_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d8"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": true,
      "light": false,
      "loading": false,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": true,
      "ammunition_kind": "Arrow",
      "range": {
        "kind": "ranged",
        "near_feet": 150,
        "far_feet": 600
      },
      "mastery_property": "Slow",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:musket",
      "name": "Musket",
      "srd_group": "martial_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d12"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": true,
      "reach": false,
      "thrown": false,
      "two_handed": true,
      "ammunition": true,
      "ammunition_kind": "Bullet",
      "range": {
        "kind": "ranged",
        "near_feet": 40,
        "far_feet": 120
      },
      "mastery_property": "Slow",
      "other_properties": null
    },
    {
      "content_key": "2024:weapon:pistol",
      "name": "Pistol",
      "srd_group": "martial_ranged",
      "damage": {
        "kind": "dice",
        "dice": "1d10"
      },
      "damage_type": "Piercing",
      "versatile_damage": {
        "kind": "not_applicable"
      },
      "finesse": false,
      "heavy": false,
      "light": false,
      "loading": true,
      "reach": false,
      "thrown": false,
      "two_handed": false,
      "ammunition": true,
      "ammunition_kind": "Bullet",
      "range": {
        "kind": "ranged",
        "near_feet": 30,
        "far_feet": 90
      },
      "mastery_property": "Vex",
      "other_properties": null
    }
  ],
  "mastery_progressions": [
    {
      "class_name": "Barbarian",
      "counts": [
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
    },
    {
      "class_name": "Fighter",
      "counts": [
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
        5,
        6,
        6,
        6,
        6,
        6
      ]
    }
  ]
} as const satisfies SrdWeaponsArtifact<BundledSrdWeaponContentKeyText>;
