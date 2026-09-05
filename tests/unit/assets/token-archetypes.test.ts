import { describe, expect, it } from 'vitest';
import { creatureTypes } from '../../../src/domain/enums';
import {
  ARCHETYPE_BY_CREATURE_TYPE,
  PASSTHROUGH_TYPE_ARCHETYPE,
  PLAYER_CHARACTER_ARCHETYPE,
  UNTYPED_MONSTER_ARCHETYPE,
  resolveArchetype,
  tokenAssetFor,
} from '../../../src/assets/token-archetypes';
import { TOKEN_ARCHETYPES } from '../../../src/assets/pixel-art';
import { STARTER_ART_INPUTS_BY_ID } from '../../../src/assets/starter-art-inputs';

describe('D516 archetype resolution is typed, never a display-name match', () => {
  it('maps every SRD creature type to a drawable archetype', () => {
    for (const type of creatureTypes) {
      expect(TOKEN_ARCHETYPES).toContain(ARCHETYPE_BY_CREATURE_TYPE[type]);
      expect(resolveArchetype({ kind: 'monster', creatureType: type })).toEqual({
        kind: 'known_creature_type',
        creatureType: type,
        archetype: ARCHETYPE_BY_CREATURE_TYPE[type],
      });
    }
  });

  it('keeps homebrew passthrough and absent types as distinct, visible fallbacks', () => {
    expect(resolveArchetype({ kind: 'monster', creatureType: 'Chronovore' })).toEqual({
      kind: 'passthrough_creature_type',
      creatureType: 'Chronovore',
      archetype: PASSTHROUGH_TYPE_ARCHETYPE,
    });
    expect(resolveArchetype({ kind: 'monster' })).toEqual({
      kind: 'untyped_monster',
      archetype: UNTYPED_MONSTER_ARCHETYPE,
    });
    expect(resolveArchetype({ kind: 'player_character', creatureType: 'Undead' })).toEqual({
      kind: 'player_character',
      archetype: PLAYER_CHARACTER_ARCHETYPE,
    });
  });

  it('resolves every subject to a checked-in token on the right plate', () => {
    for (const type of [...creatureTypes, 'Chronovore', undefined]) {
      for (const kind of ['player_character', 'monster'] as const) {
        const id = tokenAssetFor(type === undefined ? { kind } : { kind, creatureType: type });
        const input = STARTER_ART_INPUTS_BY_ID.get(id);
        expect(input, id).toBeDefined();
        expect(input?.recipe.kind).toBe('token');
        if (input?.recipe.kind === 'token') {
          expect(input.recipe.side).toBe(kind === 'player_character' ? 'party' : 'foe');
        }
      }
    }
    expect(String(tokenAssetFor({ kind: 'monster', creatureType: 'Undead' }))).toBe('art.token.foe.undead.v1');
    expect(String(tokenAssetFor({ kind: 'monster', creatureType: 'Beast' }))).toBe('art.token.foe.beast.v1');
  });
});
