import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it, vi } from 'vitest';
import { combatToken } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import type { ExternalPartyPackV2 } from '../../../src/vtt/party-pack';
import { monsterProfile } from '../combat/fixtures';

const FIXTURE_PATH = 'tests/fixtures/content-pack-v1-tiered-range.json';

function member(index: number, level: number): ExternalPartyPackV2['members'][number] {
  return {
    combatantId: `combatant:tiered-range-${String(index)}`,
    tokenId: `token:tiered-range-${String(index)}`,
    characterId: 20_000 + index,
    classes: [{ classId: 'Wizard', level }],
    abilities: {
      strength: 10,
      dexterity: 12,
      constitution: 14,
      intelligence: 16,
      wisdom: 10,
      charisma: 8,
    },
    armorClass: 15,
    hitPointMaximum: 30,
    sizeCategory: 'Medium',
    walkingSpeedFeet: 30,
    initiativeBonus: 20 - index,
    savingThrowBonuses: {
      strength: 0,
      dexterity: 1,
      constitution: 2,
      intelligence: 3,
      wisdom: 0,
      charisma: -1,
    },
    attacksPerAction: 1,
    attacks: [],
    startingConditions: [],
    ...(index === 1
      ? {
          spellcasting: {
            ability: 'intelligence' as const,
            spellSaveDc: 14,
            spellAttackBonus: 6,
            preparedSpellIds: ['fire-bolt'],
            knownSpellIds: [],
            spellSlots: [],
          },
        }
      : {}),
  };
}

describe('content-pack damage spell caster-level range tiers', () => {
  it('uses the highest hand-computed tier at and between every caster-level boundary', async () => {
    const { loadContentPack } = await import('../../../src/content/content-pack');
    const contentResult = loadContentPack(JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown);
    expect(contentResult.status).toBe('loaded');
    if (contentResult.status !== 'loaded') {
      throw new Error(`Tiered-range content fixture was refused: ${contentResult.refusal.reason}.`);
    }
    const fixtureSpell = contentResult.content.spells[0];
    if (fixtureSpell === undefined) throw new Error('Tiered-range content fixture has no spell.');
    expect(fixtureSpell.definition).toMatchObject({
      level: 0,
      operation: { kind: 'attack_damage' },
      targeting: {
        kind: 'single',
        rangeFeet: 5,
        rangeByCasterLevel: [
          { minimumLevel: 11, rangeFeet: 30 },
          { minimumLevel: 1, rangeFeet: 10 },
          { minimumLevel: 5, rangeFeet: 20 },
        ],
      },
    });
    vi.resetModules();
    vi.doMock('../../../src/combat/spells/definitions', async (importOriginal) => {
      const original = await importOriginal<typeof import('../../../src/combat/spells/definitions')>();
      return {
        ...original,
        spellDefinition: (id: string) =>
          id === 'fire-bolt' ? fixtureSpell.definition : original.spellDefinition(id),
      };
    });
    const {
      externalPartyPackSchema,
      loadExternalPartyPack,
      loadedPartyTurnLegalActions,
    } = await import('../../../src/vtt/party-pack');
    const loadedMemberAtLevel = (level: number) => {
      const candidate = externalPartyPackSchema.parse({
        schemaVersion: 2,
        partyId: 'party:tiered-range',
        allowPartial: false,
        members: [member(1, level), member(2, 1), member(3, 1)],
      }) as ExternalPartyPackV2;
      const loaded = loadExternalPartyPack(candidate);
      expect(loaded.status).toBe('loaded');
      if (loaded.status !== 'loaded') {
        throw new Error(`Tiered-range party was refused: ${loaded.refusal.reason}.`);
      }
      return { actor: loaded.party.members[0]!, members: loaded.party.members };
    };

    const cases = [
      { casterLevel: 1, expectedRange: 10 },
      { casterLevel: 4, expectedRange: 10 },
      { casterLevel: 5, expectedRange: 20 },
      { casterLevel: 10, expectedRange: 20 },
      { casterLevel: 11, expectedRange: 30 },
      { casterLevel: 20, expectedRange: 30 },
    ] as const;
    for (const { casterLevel, expectedRange } of cases) {
      const loaded = loadedMemberAtLevel(casterLevel);
      const targets = Array.from({ length: 7 }, (_value, index) =>
        monsterProfile(`tier-${String(casterLevel)}-distance-${String((index + 1) * 5)}`, {
          initiativeBonus: -index - 1,
        }));
      let state = createEncounter({
        bounds: { columns: 8, rows: 1 },
        combatants: [loaded.actor.profile, ...targets],
        tokens: [
          combatToken(loaded.actor.profile, { column: 0, row: 0 }),
          ...targets.map((target, index) => combatToken(target, { column: index + 1, row: 0 })),
        ],
        contentPacks: [contentResult.content],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      const castTargets = loadedPartyTurnLegalActions(loaded.members)(state, loaded.actor.profile.id).actions
        .flatMap((action) => action.type === 'cast_spell' && action.spellId === 'fire-bolt'
          ? action.targets
          : []);
      expect(castTargets).toEqual(targets.slice(0, expectedRange / 5).map((target) => target.id));
    }
    vi.doUnmock('../../../src/combat/spells/definitions');
    vi.resetModules();
  });
});
