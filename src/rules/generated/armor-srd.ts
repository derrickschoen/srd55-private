// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/armor-srd-reader.ts, each source pinned by its sha256:
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
import { deepFreeze } from '../../domain/deep-freeze';
import type { SrdArmorTemplate } from '../armor-srd-reader';

/** Every armour template key this artifact records: the closed set the runtime mints `ContentKey` from. */
export type BundledSrdArmorContentKeyText =
  | "2024:armor:padded-armor"
  | "2024:armor:leather-armor"
  | "2024:armor:studded-leather-armor"
  | "2024:armor:hide-armor"
  | "2024:armor:chain-shirt"
  | "2024:armor:scale-mail"
  | "2024:armor:breastplate"
  | "2024:armor:half-plate-armor"
  | "2024:armor:ring-mail"
  | "2024:armor:chain-mail"
  | "2024:armor:splint-armor"
  | "2024:armor:plate-armor"
  | "2024:armor:shield";

export const BUNDLED_SRD_ARMOR_TEMPLATES = [
  {
    "content_key": "2024:armor:padded-armor",
    "name": "Padded Armor",
    "category": "light",
    "armor_class": 11,
    "dex_bonus": "full",
    "dex_bonus_max": null,
    "strength_requirement": null,
    "stealth_disadvantage": true
  },
  {
    "content_key": "2024:armor:leather-armor",
    "name": "Leather Armor",
    "category": "light",
    "armor_class": 11,
    "dex_bonus": "full",
    "dex_bonus_max": null,
    "strength_requirement": null,
    "stealth_disadvantage": false
  },
  {
    "content_key": "2024:armor:studded-leather-armor",
    "name": "Studded Leather Armor",
    "category": "light",
    "armor_class": 12,
    "dex_bonus": "full",
    "dex_bonus_max": null,
    "strength_requirement": null,
    "stealth_disadvantage": false
  },
  {
    "content_key": "2024:armor:hide-armor",
    "name": "Hide Armor",
    "category": "medium",
    "armor_class": 12,
    "dex_bonus": "capped",
    "dex_bonus_max": 2,
    "strength_requirement": null,
    "stealth_disadvantage": false
  },
  {
    "content_key": "2024:armor:chain-shirt",
    "name": "Chain Shirt",
    "category": "medium",
    "armor_class": 13,
    "dex_bonus": "capped",
    "dex_bonus_max": 2,
    "strength_requirement": null,
    "stealth_disadvantage": false
  },
  {
    "content_key": "2024:armor:scale-mail",
    "name": "Scale Mail",
    "category": "medium",
    "armor_class": 14,
    "dex_bonus": "capped",
    "dex_bonus_max": 2,
    "strength_requirement": null,
    "stealth_disadvantage": true
  },
  {
    "content_key": "2024:armor:breastplate",
    "name": "Breastplate",
    "category": "medium",
    "armor_class": 14,
    "dex_bonus": "capped",
    "dex_bonus_max": 2,
    "strength_requirement": null,
    "stealth_disadvantage": false
  },
  {
    "content_key": "2024:armor:half-plate-armor",
    "name": "Half Plate Armor",
    "category": "medium",
    "armor_class": 15,
    "dex_bonus": "capped",
    "dex_bonus_max": 2,
    "strength_requirement": null,
    "stealth_disadvantage": true
  },
  {
    "content_key": "2024:armor:ring-mail",
    "name": "Ring Mail",
    "category": "heavy",
    "armor_class": 14,
    "dex_bonus": "none",
    "dex_bonus_max": null,
    "strength_requirement": null,
    "stealth_disadvantage": true
  },
  {
    "content_key": "2024:armor:chain-mail",
    "name": "Chain Mail",
    "category": "heavy",
    "armor_class": 16,
    "dex_bonus": "none",
    "dex_bonus_max": null,
    "strength_requirement": 13,
    "stealth_disadvantage": true
  },
  {
    "content_key": "2024:armor:splint-armor",
    "name": "Splint Armor",
    "category": "heavy",
    "armor_class": 17,
    "dex_bonus": "none",
    "dex_bonus_max": null,
    "strength_requirement": 15,
    "stealth_disadvantage": true
  },
  {
    "content_key": "2024:armor:plate-armor",
    "name": "Plate Armor",
    "category": "heavy",
    "armor_class": 18,
    "dex_bonus": "none",
    "dex_bonus_max": null,
    "strength_requirement": 15,
    "stealth_disadvantage": true
  },
  {
    "content_key": "2024:armor:shield",
    "name": "Shield",
    "category": "shield",
    "armor_class": 2,
    "dex_bonus": "none",
    "dex_bonus_max": null,
    "strength_requirement": null,
    "stealth_disadvantage": false
  }
] as const satisfies readonly SrdArmorTemplate<BundledSrdArmorContentKeyText>[];
deepFreeze(BUNDLED_SRD_ARMOR_TEMPLATES);
