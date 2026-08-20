import { describe, expect, it } from 'vitest';
import { IMPLEMENTED_SPELL_DEFINITIONS } from '../../../src/combat/spells/definitions';
import { SPELL_KB_ENTRIES } from '../../../src/combat/spells/kb/entries';

describe('spell knowledge-base completeness', () => {
  it('has exactly one source-cited KB entry for every implemented cantrip and level-1/2 spell', () => {
    expect(SPELL_KB_ENTRIES).toHaveLength(145);
    expect(new Set(SPELL_KB_ENTRIES.map((entry) => entry.ruleId)).size).toBe(145);
    expect(new Set(SPELL_KB_ENTRIES.map((entry) => entry.spellId)).size).toBe(145);
    expect(SPELL_KB_ENTRIES.map((entry) => entry.spellId).sort()).toEqual(
      IMPLEMENTED_SPELL_DEFINITIONS.map((definition) => definition.id).sort(),
    );
  });

  it.each(SPELL_KB_ENTRIES)('$ruleId gives $spellId a matching SRD locator and ruling guidance', (entry) => {
    const definition = IMPLEMENTED_SPELL_DEFINITIONS.find((candidate) => candidate.id === entry.spellId);
    expect(definition?.source).toBe(entry.srdLocator);
    expect(entry.rulingGuidance.trim().length).toBeGreaterThan(30);
  });
});
