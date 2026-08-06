/**
 * Veteran is original project-owner-authored content from
 * docs/homebrew/2026-08-04-rogue-veteran-subclass.md. It is licensed by its
 * owner under the Creative Commons Attribution 4.0 International License:
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 */
import type { DatabaseContext } from '../db/database';
import {
  ensureBundledSubclassContent,
  hasBundledSubclassContent,
  subclassContentKey,
  type BundledSubclassFeatureHeading,
  type BundledSubclassSeed,
} from './srd-subclass-content';

const VETERAN_NAME = 'Veteran';

export const VETERAN_SUBCLASS_CONTENT_KEY = subclassContentKey(VETERAN_NAME);

/**
 * D152 keeps rules prose in the authoritative document. These are the exact
 * owner-authored headings and levels consumed by the application catalog.
 */
export const VETERAN_SUBCLASS_FEATURES = Object.freeze([
  { class_level: 3, sort_position: 0, name: 'Seasoned Professional' },
  { class_level: 3, sort_position: 1, name: 'Too Old for This' },
  { class_level: 3, sort_position: 2, name: 'Deuces Are Wild' },
  { class_level: 3, sort_position: 3, name: 'Sure Strike' },
  { class_level: 9, sort_position: 4, name: "Veteran's Strike" },
  { class_level: 9, sort_position: 5, name: 'Extensive Experience' },
  { class_level: 13, sort_position: 6, name: 'Veteran Reflexes' },
  { class_level: 13, sort_position: 7, name: 'Critical Instincts' },
  { class_level: 13, sort_position: 8, name: 'Fighting Style' },
  // Per docs/homebrew/rulings.md, this is the broad reading: all 18 skills.
  { class_level: 17, sort_position: 9, name: 'Master of Experience' },
  { class_level: 17, sort_position: 10, name: 'Heightened Lethality' },
  { class_level: 17, sort_position: 11, name: 'Blindsight' },
] as const satisfies readonly BundledSubclassFeatureHeading[]);

const VETERAN_SUBCLASS_SEEDS: readonly BundledSubclassSeed[] = Object.freeze([
  Object.freeze({
    class_name: 'Rogue',
    subclass_name: VETERAN_NAME,
    content_key: VETERAN_SUBCLASS_CONTENT_KEY,
    spellcasting_ability: null,
    features: VETERAN_SUBCLASS_FEATURES,
    grant_rules: null,
  }),
]);

export function bundledVeteranSubclassDefinitionContentKeys(): readonly string[] {
  return Object.freeze([VETERAN_SUBCLASS_CONTENT_KEY]);
}

export function hasBundledVeteranSubclassContent(
  db: DatabaseContext,
): boolean {
  return hasBundledSubclassContent(db, VETERAN_SUBCLASS_SEEDS);
}

export function ensureBundledVeteranSubclassContent(
  db: DatabaseContext,
): boolean {
  return ensureBundledSubclassContent(db, VETERAN_SUBCLASS_SEEDS);
}
