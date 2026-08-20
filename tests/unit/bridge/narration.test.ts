import { describe, expect, it } from 'vitest';
import { createEncounter } from '../../../src/combat/encounter';
import { projectEncounter } from '../../../src/combat/visibility';
import {
  adjudicationCommand,
} from '../../../src/vtt/dm-bridge/contracts';
import {
  decodeAdjudicationProposal,
  decodeNarration,
} from '../../../src/vtt/dm-bridge/narration';
import { referenceEncounterSetup, REFERENCE_MONSTER_ID } from '../../../src/vtt/reference-encounter';

const SPELL_CITATION = {
  ruleId: 'R-SPELL-119',
  srdLocator: 'docs/srd/source/spell-descriptions.txt:3160',
  sentence: 'Fireball uses its checked sphere and damage definition.',
} as const;

const MONSTER_CITATION = {
  ruleId: 'R-MONSTER-004',
  srdLocator: 'docs/srd/full/srd-5.2.1.txt:20448-20469',
  sentence: 'The Ogre chooses its listed weapon by distance.',
} as const;

describe('DM narration and adjudication contracts', () => {
  it.each([
    {
      voice: 'cinematic_visible_rolls',
      value: {
        kind: 'narration',
        voice: 'cinematic_visible_rolls',
        sentence: 'The blade flashes as the visible die settles.',
        visibleRolls: [{ label: 'Longsword attack', faces: [17], total: 22 }],
      },
    },
    {
      voice: 'terse_tactical',
      value: { kind: 'narration', voice: 'terse_tactical', sentence: 'The ogre closes and attacks.' },
    },
    {
      voice: 'rules_explicit',
      value: {
        kind: 'narration',
        voice: 'rules_explicit',
        sentence: 'The checked spell template includes the touched square.',
        rules: [SPELL_CITATION],
      },
    },
    {
      voice: 'terse_rule_citing_validation',
      value: { kind: 'narration', voice: 'terse_rule_citing_validation', lines: [MONSTER_CITATION] },
    },
  ])('NARRATION-SCHEMA-$voice decodes its distinct bounded schema', ({ value, voice }) => {
    expect(decodeNarration(value).voice).toBe(voice);
  });

  it('M48-VALIDATION-LOCATOR-REQUIRED rejects a rule id without its SRD locator', () => {
    expect(() => decodeNarration({
      kind: 'narration',
      voice: 'terse_rule_citing_validation',
      lines: [{ ruleId: 'R-MONSTER-004', sentence: 'The Ogre uses its checked attack.' }],
    })).toThrow('srdLocator');
  });

  it('VALIDATION-KB-PAIR-REAL rejects a real rule id paired to the wrong real locator', () => {
    expect(() => decodeNarration({
      kind: 'narration',
      voice: 'terse_rule_citing_validation',
      lines: [{ ...MONSTER_CITATION, srdLocator: SPELL_CITATION.srdLocator }],
    })).toThrow('real spell/statblock KB rule and locator');
  });

  it('M47-NARRATION-CANNOT-CHANGE-DAMAGE rejects state mutation fields in narration', () => {
    expect(() => decodeNarration({
      kind: 'narration',
      voice: 'terse_tactical',
      sentence: 'The ogre hits.',
      damage: { target: REFERENCE_MONSTER_ID, amount: 9 },
    })).toThrow('unexpected field damage');
  });

  it('ADJUDICATION-ISOLATION returns only a proposal until converted to a reducer command', () => {
    const state = createEncounter(referenceEncounterSetup());
    const projection = projectEncounter(state, { kind: 'dm' });
    const proposal = decodeAdjudicationProposal({
      kind: 'adjudication_proposal',
      target: REFERENCE_MONSTER_ID,
      reasoning: 'A genuinely unmodeled mechanism requires an explicit override.',
      consequence: { kind: 'hit_point_delta', amount: -3 },
    });

    expect(proposal).toEqual({
      kind: 'adjudication_proposal',
      target: REFERENCE_MONSTER_ID,
      reasoning: 'A genuinely unmodeled mechanism requires an explicit override.',
      consequence: { kind: 'hit_point_delta', amount: -3 },
    });
    expect(adjudicationCommand(proposal, projection)).toEqual({
      type: 'adjudicate',
      target: REFERENCE_MONSTER_ID,
      reasoning: proposal.reasoning,
      consequence: proposal.consequence,
    });
    expect(state.revision).toBe(0);
    expect(state.eventLog).toEqual([]);
  });
});
