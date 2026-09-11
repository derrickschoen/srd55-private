import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { SPELL_MANIFEST } from '../../../src/combat/spells/manifest';
import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
import {
  generateHeldoutPartyBasis,
  HeldoutPartyGenerationError,
  parseHeldoutPartyGenerationArgs,
  requireHeldoutPartyMemberExport,
} from '../../../tools/generate-heldout-party-basis';
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

describe('held-out party basis generator', () => {
  it('fresh full seed round-trips all 16 recipe exports through four production byte loads', async () => {
    const outPath = mkdtempSync(join(tmpdir(), 'dnd-heldout-party-basis-'));
    const result = await generateHeldoutPartyBasis({ levels: [3, 4, 5, 6], outPath });

    expect(result.levels.map((entry) => entry.level)).toEqual([3, 4, 5, 6]);
    expect(result.levels.map((entry) => entry.spellAssignments)).toEqual([28, 34, 40, 44]);
    expect(result.levels.map((entry) => entry.fighterMastery)).toEqual([
      { selected: 3, required: 3 },
      { selected: 4, required: 4 },
      { selected: 4, required: 4 },
      { selected: 4, required: 4 },
    ]);
    const implemented = new Set(
      SPELL_MANIFEST.filter((spell) => spell.status === 'implemented').map((spell) => spell.id),
    );
    for (const entry of result.levels) {
      expect(readFileSync(entry.path, 'utf8')).toBe(entry.bytes);
      const loaded = loadExternalPartyPackBytes(entry.bytes);
      if (loaded.status !== 'loaded') throw new Error(`Generated level ${String(entry.level)} refused.`);
      expect(loaded.party.members).toHaveLength(4);
      expect(loaded.party.members.map((member) => member.source.classes)).toEqual([
        [{ classId: 'Fighter', level: entry.level }],
        [{ classId: 'Cleric', level: entry.level }],
        [{ classId: 'Rogue', level: entry.level }],
        [{ classId: 'Wizard', level: entry.level }],
      ]);
      expect(loaded.party.members.every((member) => member.source.startingConditions.length === 0))
        .toBe(true);
      expect(loaded.party.members.flatMap((member) => member.spells)
        .every((spell) => implemented.has(spell.id))).toBe(true);
    }
    const levelSix = loadExternalPartyPackBytes(result.levels[3]?.bytes ?? '');
    if (levelSix.status !== 'loaded') throw new Error('Generated level 6 refused.');
    expect(levelSix.party.members[0]?.source.abilities.strength).toBe(19);
  });

  it('reports fatal generation refusals with level, seat, field, and detail', () => {
    expect(() => requireHeldoutPartyMemberExport(6, 0, {
      status: 'refused',
      refusal: {
        kind: 'stored_character_party_pack_refusal',
        field: 'weapon-mastery',
        detail: 'No missing mastery template.',
      },
    })).toThrow(new HeldoutPartyGenerationError({
      level: 6,
      seat: 0,
      field: 'weapon-mastery',
      detail: 'No missing mastery template.',
    }));
    expect(() => parseHeldoutPartyGenerationArgs([
      '--levels', '3,7', '--out', tmpdir(),
    ])).toThrow('--levels must contain only comma-separated levels 3,4,5,6.');
  });
});
