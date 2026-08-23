import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { IMPLEMENTED_SPELL_DEFINITIONS } from '../../../src/combat/spells/definitions';
import { SPELL_KB_ENTRIES } from '../../../src/combat/spells/kb/entries';
import { SPELL_MANIFEST } from '../../../src/combat/spells/manifest';

const SPELL_DESCRIPTION_LINES = readFileSync(
  'docs/srd/source/spell-descriptions.txt',
  'utf8',
).split('\n');

function locatorBounds(source: string): readonly [number, number] {
  const matched = /^docs\/srd\/source\/spell-descriptions\.txt:(\d+)(?:-(\d+))?$/u.exec(source);
  if (matched === null) throw new Error(`Invalid spell definition source locator: ${source}`);
  const start = Number(matched[1]);
  const end = Number(matched[2] ?? matched[1]);
  return [start, end];
}

function hasNamedSpellHeader(
  name: string,
  level: number,
  start: number,
  end: number,
): boolean {
  const firstCandidate = Math.max(1, start - 1);
  const lastCandidate = Math.min(SPELL_DESCRIPTION_LINES.length, end + 1);
  for (let lineNumber = firstCandidate; lineNumber <= lastCandidate; lineNumber += 1) {
    if (SPELL_DESCRIPTION_LINES[lineNumber - 1]?.trim() !== name) continue;
    let classificationLine = lineNumber;
    while (
      classificationLine < SPELL_DESCRIPTION_LINES.length &&
      SPELL_DESCRIPTION_LINES[classificationLine]?.trim() === ''
    ) classificationLine += 1;
    const classification = SPELL_DESCRIPTION_LINES[classificationLine]?.trim() ?? '';
    if (level === 0 ? /\bCantrip\b/u.test(classification) : classification.startsWith(`Level ${level} `)) {
      return true;
    }
  }
  return false;
}

describe('spell knowledge-base completeness', () => {
  it('has exactly one source-cited KB entry for every implemented manifest spell', () => {
    expect(SPELL_KB_ENTRIES).toHaveLength(188);
    expect(new Set(SPELL_KB_ENTRIES.map((entry) => entry.ruleId)).size).toBe(188);
    expect(new Set(SPELL_KB_ENTRIES.map((entry) => entry.spellId)).size).toBe(188);
    expect(SPELL_KB_ENTRIES.map((entry) => entry.spellId).sort()).toEqual(
      IMPLEMENTED_SPELL_DEFINITIONS.map((definition) => definition.id).sort(),
    );
  });

  it.each(SPELL_KB_ENTRIES)('$ruleId gives $spellId a matching SRD locator and ruling guidance', (entry) => {
    const definition = IMPLEMENTED_SPELL_DEFINITIONS.find((candidate) => candidate.id === entry.spellId);
    expect(definition?.source).toBe(entry.srdLocator);
    expect(entry.rulingGuidance.trim().length).toBeGreaterThan(30);
  });

  it.each(IMPLEMENTED_SPELL_DEFINITIONS)(
    '$id source locator resolves to its exact named SRD spell header',
    (definition) => {
      const [start, end] = locatorBounds(definition.source);
      expect(
        hasNamedSpellHeader(definition.name, definition.level, start, end),
        `${definition.id} cites ${definition.source}, which is not adjacent to its named level-${definition.level} header`,
      ).toBe(true);
    },
  );

  it.each(SPELL_MANIFEST)('$id class-list locators name the exact spell row', (row) => {
    for (const membership of row.memberships) {
      const matched = /^(docs\/srd\/source\/(?:bard|cleric|druid|paladin|ranger|sorcerer|warlock|wizard)-spell-list\.txt):(\d+)$/u.exec(membership.source);
      if (matched === null) throw new Error(`Invalid class-list locator: ${membership.source}`);
      const path = matched[1];
      const line = matched[2];
      if (path === undefined || line === undefined) throw new Error(`Invalid class-list locator: ${membership.source}`);
      const lines = readFileSync(path, 'utf8').split('\n');
      const cited = lines[Number(line) - 1]?.trim() ?? '';
      expect(cited, `${row.id} cites ${membership.source}`).toContain(row.name);
    }
  });

  it.each([
    { id: 'hold-person', requiredResidual: 'visible-target filtering' },
    { id: 'disguise-self', requiredResidual: 'same-basic-limb-arrangement restriction' },
    { id: 'sending', requiredResidual: 'a creature the caster has met or one described by someone who met it' },
  ] as const)('$id honestly records its SRD targeting residual', ({ id, requiredResidual }) => {
    const row = SPELL_MANIFEST.find((candidate) => candidate.id === id);
    expect(row?.partial).toContain(requiredResidual);
  });

  it('Sending KB guidance pins the SRD recipient-identity rule without inventing a name requirement', () => {
    const entry = SPELL_KB_ENTRIES.find((candidate) => candidate.spellId === 'sending');
    expect(entry?.rulingGuidance).toContain('a creature you met or one described by someone who met it');
    expect(entry?.rulingGuidance).not.toContain('named');
  });

  it('Eldritch Blast KB fields cite the exact bundled SRD lines', () => {
    const entry = SPELL_KB_ENTRIES.find((candidate) => candidate.spellId === 'eldritch-blast');
    expect(entry?.fieldCitations).toEqual({
      identity: 'docs/srd/source/spell-descriptions.txt:2608-2609',
      castingTime: 'docs/srd/source/spell-descriptions.txt:2611',
      components: 'docs/srd/source/spell-descriptions.txt:2615',
      targeting: 'docs/srd/source/spell-descriptions.txt:2613-2626',
      operation: 'docs/srd/source/spell-descriptions.txt:2619-2626',
    });
    for (const locator of Object.values(entry?.fieldCitations ?? {})) {
      const [start, end] = locatorBounds(locator);
      expect(SPELL_DESCRIPTION_LINES.slice(start - 1, end).join(' ').trim().length).toBeGreaterThan(0);
    }
  });

  it.each(['divine-favor', 'ensnaring-strike', 'searing-smite', 'heal', 'moonbeam'] as const)(
    '%s carries complete non-empty field-level SRD citations',
    (spellId) => {
      const entry = SPELL_KB_ENTRIES.find((candidate) => candidate.spellId === spellId);
      expect(entry?.fieldCitations).toBeDefined();
      expect(Object.keys(entry?.fieldCitations ?? {}).sort()).toEqual([
        'castingTime', 'components', 'identity', 'operation', 'targeting',
      ]);
      for (const locator of Object.values(entry?.fieldCitations ?? {})) {
        const [start, end] = locatorBounds(locator);
        expect(SPELL_DESCRIPTION_LINES.slice(start - 1, end).join(' ').trim().length).toBeGreaterThan(0);
      }
    },
  );

  it.each([
    'hold-monster',
    'faerie-fire',
    'vicious-mockery',
    'pass-without-trace',
    'entangle',
    'dissonant-whispers',
    'goodberry',
  ] as const)('%s spell-batch-2 fields cite complete non-empty SRD spans', (spellId) => {
    const entry = SPELL_KB_ENTRIES.find((candidate) => candidate.spellId === spellId);
    expect(Object.keys(entry?.fieldCitations ?? {}).sort()).toEqual([
      'castingTime', 'components', 'identity', 'operation', 'targeting',
    ]);
    for (const locator of Object.values(entry?.fieldCitations ?? {})) {
      const [start, end] = locatorBounds(locator);
      expect(SPELL_DESCRIPTION_LINES.slice(start - 1, end).join(' ').trim().length).toBeGreaterThan(0);
    }
  });

  it('records every known r9 engine residual as a closed typed limitation code', () => {
    expect(SPELL_KB_ENTRIES.find((entry) => entry.spellId === 'ensnaring-strike')?.limitations?.map(
      (limitation) => limitation.code,
    )).toEqual([
      'post_hit_cast_timing_prearmed',
      'creature_size_save_mode_unavailable',
      'effect_escape_action_unavailable',
    ]);
    expect(SPELL_KB_ENTRIES.find((entry) => entry.spellId === 'moonbeam')?.limitations?.map(
      (limitation) => limitation.code,
    )).toEqual([
      'persistent_area_move_action_unavailable',
      'persistent_area_entry_trigger_unavailable',
      'shapechange_reversion_unavailable',
    ]);
  });

  it('records every spell-batch-2 residual as a closed typed limitation code', () => {
    const limitations = (spellId: string) => SPELL_KB_ENTRIES.find(
      (entry) => entry.spellId === spellId,
    )?.limitations?.map((limitation) => limitation.code) ?? [];
    expect(limitations('hold-monster')).toEqual(['perception_target_filter_unavailable']);
    expect(limitations('faerie-fire')).toEqual([]);
    expect(limitations('vicious-mockery')).toEqual(['perception_target_filter_unavailable']);
    expect(limitations('pass-without-trace')).toEqual([
      'moving_aura_membership_unavailable', 'exploration_tracks_unavailable',
    ]);
    expect(limitations('entangle')).toEqual([
      'persistent_area_terrain_unavailable', 'effect_escape_action_unavailable',
    ]);
    expect(limitations('dissonant-whispers')).toEqual(['forced_reaction_movement_unavailable']);
    expect(limitations('goodberry')).toEqual([
      'encounter_expiry_unavailable', 'exploration_nourishment_unavailable',
    ]);
  });
});
