/**
 * THE SKILL VOCABULARY'S DISPLAY SPELLINGS, as the SRD Skills table prints
 * them, and the one translation from printed words back to a `Skill`.
 *
 * Vocabulary, not a parse: it imports no SRD text and no generated artifact,
 * so the Skills-table reader (`skills-reader.ts`) and the UI share it without
 * the reader reaching the runtime. The reader checks that the table prints
 * exactly these eighteen spellings.
 */
import type { Skill } from '../domain/enums';

/**
 * Display spelling for each enum member, as the Skills table prints it. Frozen:
 * one shared record, so no caller can re-spell a skill for the next one.
 */
export const SKILL_LABELS = Object.freeze({
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
} as const satisfies Readonly<Record<Skill, string>>);

const LABEL_TO_SKILL: ReadonlyMap<string, Skill> = new Map(
  (Object.entries(SKILL_LABELS) as [Skill, string][]).map(
    ([skill, label]) => [label, skill] as const,
  ),
);

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

/** The exact printed spelling to enum member, untrimmed: the Skills-table reader's lookup. */
export function skillLabelToSkill(label: string): Skill | undefined {
  return LABEL_TO_SKILL.get(label);
}
