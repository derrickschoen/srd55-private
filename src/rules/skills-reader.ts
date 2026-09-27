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
 * THE PARSE RUNS AT BUILD TIME, NOT AT RUNTIME. This module takes the extract
 * as an argument and imports no SRD text. `npm run srd:artifacts` commits its
 * result as `generated/skills.ts`, which `skills.ts` reads; the SRD artifact
 * drift test re-parses the extract and fails on any byte difference.
 */
import { skills, type Ability, type Skill } from '../domain/enums';
import { SKILL_LABELS, skillLabelToSkill } from './skill-labels';

export class SrdSkillsError extends Error {
  constructor(message: string) {
    super(`SRD skills: ${message}`);
    this.name = 'SrdSkillsError';
  }
}

const ABILITY_WORDS: Readonly<Record<string, Ability>> = {
  Strength: 'strength',
  Dexterity: 'dexterity',
  Constitution: 'constitution',
  Intelligence: 'intelligence',
  Wisdom: 'wisdom',
  Charisma: 'charisma',
};

const SECTION = /^=== The Skills table/;
/**
 * `Acrobatics          Dexterity           Stay on your feet…`
 *
 * The ability is an ALTERNATION over the six ability words rather than a
 * `\w+`, which is what keeps the table's own `Skill  Ability  Example Uses`
 * header line out of the parse without a special case for it.
 */
const SKILL_ROW = new RegExp(
  `^\\s+(?<skill>[A-Z][A-Za-z ]*?)\\s{2,}(?<ability>${Object.keys(ABILITY_WORDS).join('|')})\\s{2,}\\S`,
);

/**
 * Parses the Skills table into the governing ability of each of the eighteen
 * skills.
 *
 * FAILS LOUDLY on a count other than eighteen, on a skill the enum does not
 * know, and on an enum member the table does not mention. The third check is
 * the one that matters most: it is what would have caught a seventeen-member
 * enum, and it is why the vocabulary and the extract cannot drift apart
 * silently.
 */
export function parseSkillAbilities(
  extract: string,
): ReadonlyMap<Skill, Ability> {
  const lines = extract.split('\n');
  const start = lines.findIndex((line) => SECTION.test(line));
  if (start === -1) {
    throw new SrdSkillsError('no Skills table section in the extract.');
  }

  const found = new Map<Skill, Ability>();
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('===')) {
      break;
    }
    const row = SKILL_ROW.exec(line)?.groups;
    if (row === undefined) {
      continue;
    }
    const label = (row.skill as string).trim();
    const skill = skillLabelToSkill(label);
    if (skill === undefined) {
      throw new SrdSkillsError(
        `the Skills table lists ${JSON.stringify(label)}, which is not in the skills vocabulary.`,
      );
    }
    if (found.has(skill)) {
      throw new SrdSkillsError(`the Skills table repeats ${label}.`);
    }
    found.set(skill, ABILITY_WORDS[row.ability as string] as Ability);
  }

  for (const skill of skills) {
    if (!found.has(skill)) {
      throw new SrdSkillsError(
        `${SKILL_LABELS[skill]} is in the skills vocabulary but not in the Skills table.`,
      );
    }
  }
  if (found.size !== skills.length) {
    throw new SrdSkillsError(
      `expected ${String(skills.length)} skills, parsed ${String(found.size)}.`,
    );
  }
  return found;
}

/**
 * WHAT THE BUILD RECORDS: the governing ability of each skill, in the table's
 * printed order (the insertion order the runtime map is rebuilt in). A total
 * record over `Skill`, so the compiler, too, refuses a table that misses one.
 */
export type SrdSkillAbilitiesArtifact = Readonly<Record<Skill, Ability>>;

export function deriveSrdSkillAbilitiesArtifact(
  extract: string,
): SrdSkillAbilitiesArtifact {
  return Object.fromEntries(parseSkillAbilities(extract)) as Record<Skill, Ability>;
}
