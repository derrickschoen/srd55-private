/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE SKILL-TO-ABILITY MAP IS PARSED FROM THE SKILLS TABLE.
 *
 * This map is the single most tempting thing in the whole sheet to write from
 * memory: eighteen pairs everyone thinks they know. It was not in
 * `docs/srd/source/` at all until `skills-table.txt` was extracted for it — the
 * only ability-and-skill pairing anywhere in the previous extracts was one
 * incidental `Strength (Athletics)` inside a Champion feature.
 *
 * IT IS ALSO WHAT CLOSES THE SKILL VOCABULARY. The twelve class Core Traits
 * tables between them name only SEVENTEEN skills; `Performance` appears in no
 * class's list. A skills enum closed on the class lists would have been
 * seventeen skills, silently wrong, and nothing would have failed.
 *
 * THE MAP IS PARSED AT BUILD TIME by `skills-reader.ts` and read here from the
 * generated artifact (`generated/skills.ts`, written by `npm run
 * srd:artifacts`). This module imports no SRD text. The display spellings live
 * in `skill-labels.ts`.
 */
import { abilities, type Ability, type Skill } from '../domain/enums';
import { FrozenMap } from '../domain/frozen-map';
import { SrdSkillsError } from './skills-reader';
import { BUNDLED_SRD_SKILL_ABILITIES } from './generated/skills';

const SKILL_ABILITIES: FrozenMap<Skill, Ability> = new FrozenMap<Skill, Ability>(
  Object.entries(BUNDLED_SRD_SKILL_ABILITIES) as [Skill, Ability][],
);

/**
 * The parsed map, in the Skills table's printed order: one shared
 * {@link FrozenMap}, so no caller can re-govern a skill for the next one.
 */
export function skillAbilities(): FrozenMap<Skill, Ability> {
  return SKILL_ABILITIES;
}

/**
 * The ability a skill check uses.
 *
 * Total by construction — every member of `skills` is proven present by
 * `parseSkillAbilities`, so this cannot return undefined and callers need no
 * null branch. The throw is unreachable and exists so a future edit that breaks
 * the invariant fails here rather than computing a modifier off `NaN`.
 */
export function abilityForSkill(skill: Skill): Ability {
  const ability = skillAbilities().get(skill);
  /* c8 ignore next 3 -- proven exhaustive by parseSkillAbilities. */
  if (ability === undefined) {
    throw new SrdSkillsError(`no governing ability for ${skill}.`);
  }
  if (!abilities.includes(ability)) {
    throw new SrdSkillsError(`${skill} maps to a non-ability.`);
  }
  return ability;
}
