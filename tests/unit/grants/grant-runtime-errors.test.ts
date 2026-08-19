import { describe, expect, it } from 'vitest';
import {
  ConfiguredSpellListResolutionError,
  PlannedSpellConstraintListError,
} from '../../../src/grants/grant-rule-planner';
import { ReplaceableSpellRuleKeyCollisionError } from '../../../src/grants/configured-choice-material-reader';
import {
  SkillGrantDuplicateSelectionError,
  SkillGrantDuplicateSourceSkillError,
  StoredSkillGrantSkillError,
  StoredSkillGrantStateError,
} from '../../../src/grants/skill-grants';
import {
  StoredExpertiseGrantSkillError,
  StoredExpertiseGrantStateError,
} from '../../../src/grants/skill-expertise-grants';

interface FormatterCase {
  readonly error: Error;
  readonly message: string;
  readonly params: Readonly<Record<string, unknown>>;
}

const cases: readonly FormatterCase[] = [
  {
    error: new PlannedSpellConstraintListError(),
    message: 'Planned spell constraint lists must be strings.',
    params: {},
  },
  {
    error: new ConfiguredSpellListResolutionError(),
    message: 'A configured spell list could not be resolved.',
    params: {},
  },
  {
    error: new ReplaceableSpellRuleKeyCollisionError('choice:replaceable_spell'),
    message: "Replaceable-spell rule key 'choice:replaceable_spell' collides with a stored rule.",
    params: { rule_key: 'choice:replaceable_spell' },
  },
  {
    error: new StoredSkillGrantSkillError('chronomancy'),
    message: "Unknown stored skill 'chronomancy'.",
    params: { skill: 'chronomancy' },
  },
  {
    error: new StoredSkillGrantStateError('future'),
    message: "Unknown skill grant state 'future'.",
    params: { state: 'future' },
  },
  {
    error: new SkillGrantDuplicateSelectionError('skills'),
    message: "Grant rule 'skills' cannot select the same skill twice.",
    params: { grant_key: 'skills' },
  },
  {
    error: new SkillGrantDuplicateSourceSkillError('arcana'),
    message: "Duplicate skill arcana in one source's grant list — the printed content never repeats a skill, so this is a data defect, not a choice to reconcile.",
    params: { skill: 'arcana' },
  },
  {
    error: new StoredExpertiseGrantSkillError('chronomancy'),
    message: "Unknown stored Expertise skill 'chronomancy'.",
    params: { skill: 'chronomancy' },
  },
  {
    error: new StoredExpertiseGrantStateError('future'),
    message: "Unknown Expertise grant state 'future'.",
    params: { state: 'future' },
  },
];

describe('grant runtime error formatters', () => {
  it.each(cases)('$error.name', ({ error, message, params }) => {
    expect(error.name).toBe(error.constructor.name);
    expect(error.message).toBe(message);
    expect(error).toMatchObject(params);
  });
});
