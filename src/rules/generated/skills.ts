// GENERATED FILE — DO NOT EDIT BY HAND.
// Source of truth, read by src/rules/skills-reader.ts, each source pinned by its sha256:
//   docs/srd/source/skills-table.txt sha256=626c451b2c3d535ecb484c12521ae4b63a77922eb5b2c78f6379e143039d0868
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
import type { SrdSkillAbilitiesArtifact } from '../skills-reader';

export const BUNDLED_SRD_SKILL_ABILITIES = deepFreeze({
  "acrobatics": "dexterity",
  "animal_handling": "wisdom",
  "arcana": "intelligence",
  "athletics": "strength",
  "deception": "charisma",
  "history": "intelligence",
  "insight": "wisdom",
  "intimidation": "charisma",
  "investigation": "intelligence",
  "medicine": "wisdom",
  "nature": "intelligence",
  "perception": "wisdom",
  "performance": "charisma",
  "persuasion": "charisma",
  "religion": "intelligence",
  "sleight_of_hand": "dexterity",
  "stealth": "dexterity",
  "survival": "wisdom"
} as const satisfies SrdSkillAbilitiesArtifact);
