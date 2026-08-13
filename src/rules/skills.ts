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
 */
import skillsTableExtract from '../../docs/srd/source/skills-table.txt?raw';
import { abilities, skills, type Ability, type Skill } from '../domain/enums';

export class SrdSkillsError extends Error {
  constructor(message: string) {
    super(`SRD skills: ${message}`);
    this.name = 'SrdSkillsError';
  }
}

/** Display spelling for each enum member, as the Skills table prints it. */
export const SKILL_LABELS: Readonly<Record<Skill, string>> = {
  acrobatics: 'Acrobatics',
  animal_handling: 'Animal Handling',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  sleight_of_hand: 'Sleight of Hand',
  stealth: 'Stealth',
  survival: 'Survival',
};

/**
 * Printed prose to enum member, or null for anything the vocabulary does not
 * know. The background templates store their two skills as PRINTED WORDS
 * ("Sleight of Hand"), and the S-B producer must normalise them to VERIFIED
 * `Skill` values before a grant row can carry them — a grant holding
 * unrecognised prose would fail the schema CHECK anyway, so the honest
 * translation lives here beside the display spellings it inverts.
 */
export function skillFromLabel(label: string): Skill | null {
  return LABEL_TO_SKILL.get(label.trim()) ?? null;
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

const LABEL_TO_SKILL: ReadonlyMap<string, Skill> = new Map(
  (Object.entries(SKILL_LABELS) as [Skill, string][]).map(
    ([skill, label]) => [label, skill] as const,
  ),
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
  extract: string = skillsTableExtract,
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
    const skill = LABEL_TO_SKILL.get(label);
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

let cached: ReadonlyMap<Skill, Ability> | null = null;

/** The parsed map, computed once. */
export function skillAbilities(): ReadonlyMap<Skill, Ability> {
  cached ??= parseSkillAbilities();
  return cached;
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
