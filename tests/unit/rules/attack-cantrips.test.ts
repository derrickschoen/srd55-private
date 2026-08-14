import { describe, expect, it } from 'vitest';
import type { SpellAccessRoute } from '../../../src/access/spell-access-builder';
import {
  recogniseAttackCantrips,
  spellKeySlug,
} from '../../../src/rules/attack-cantrips';
import { officialSpellKey } from '../../../src/catalog/catalog-key';
import type { SpellIdentityId, SpellVersionId } from '../../../src/domain/ids';

/**
 * THE CANTRIPS ARE NOT IN THIS APPLICATION, so every fixture here is a
 * hand-written route standing in for a row a user's own catalog import would
 * have produced. That is the point of the module: the key is the importing
 * document's choice, and these tests pin what happens for each choice it might
 * make.
 */

function route(overrides: Partial<SpellAccessRoute>): SpellAccessRoute {
  return {
    spell_identity_id: 1 as SpellIdentityId,
    identity_name: 'True Strike',
    spell_name: 'True Strike',
    spell_catalog_layer: 'bundled',
    spell_content_key: '2024:true-strike',
    rules_edition: '2024',
    spell_level: 0,
    ability_modifier: 4,
    attack_bonus: 7,
    save_dc: 15,
    origin: 'slot',
    casting_mode: 'at_will',
    spell_version_id: 10 as SpellVersionId,
    source_instance_id: 20,
    source_name: 'Arcane scholar',
    source_catalog_layer: 'bundled',
    slot_id: 30,
    slot_key: 'cantrip-1',
    selection_key: null,
    bucket: 'cantrip_known',
    always_prepared: false,
    is_selection: true,
    counts_against_limit: true,
    free_cast: null,
    spellcasting_ability: 'intelligence',
    ...overrides,
  };
}

describe('the key grammar', () => {
  it('reads the slug out of the two key shapes this application produces', () => {
    // `officialSpellKey` is the app's own helper; its output must be
    // recognisable by the reader that consumes it.
    expect(officialSpellKey('2024', 'True Strike')).toBe('2024:true-strike');
    expect(spellKeySlug('2024:true-strike')).toBe('true-strike');
    expect(spellKeySlug('2014:shillelagh')).toBe('shillelagh');
    // A bare identity key, which is how `spell_identities.content_key` is
    // written in the fixtures.
    expect(spellKeySlug('true-strike')).toBe('true-strike');
  });

  it('refuses a three-part homebrew key', () => {
    // A homebrew namespace exists so a table can publish its OWN spell. Reading
    // one as the reference cantrip would let any registered owner claim the
    // profile.
    expect(spellKeySlug('2024:some.homebrew:true-strike')).toBeNull();
  });

  it('refuses a key that is not well formed at all', () => {
    expect(spellKeySlug('2024::true-strike')).toBeNull();
    expect(spellKeySlug('True Strike')).toBeNull();
    expect(spellKeySlug('')).toBeNull();
  });
});

describe('recognising the two cantrips', () => {
  it('recognises the key this application would have written', () => {
    const found = recogniseAttackCantrips([route({})]);
    expect(found.true_strike).toEqual({
      state: 'known',
      sources: [
        { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
      ],
    });
    expect(found.shillelagh.state).toBe('not_known');
    expect(found.unrecognised).toEqual([]);
  });

  it('recognises the same slug under any edition', () => {
    const found = recogniseAttackCantrips([
      route({ spell_content_key: '2014:true-strike', rules_edition: '2014' }),
    ]);
    expect(found.true_strike.state).toBe('known');
  });

  it('REPORTS a key it does not know rather than going quiet', () => {
    // The failure this module exists for: the catalog has the spell, filed
    // under a key nobody here guessed. Silence would be a sheet missing an
    // attack the character has.
    const found = recogniseAttackCantrips([
      route({ spell_content_key: 'srd52:truestrike' }),
    ]);
    expect(found.true_strike.state).toBe('not_known');
    expect(found.unrecognised).toHaveLength(1);
    expect(found.unrecognised[0]?.content_key).toBe('srd52:truestrike');
    expect(found.unrecognised[0]?.cantrip).toBe('true_strike');
    expect(found.unrecognised[0]?.reason).toContain('srd52:truestrike');
  });

  it('says NOTHING about an unrelated spell wearing the display name', () => {
    // `spell_name` is `spell_versions.display_name`, which the catalog importer
    // overwrites from the document's own `name` on every re-import. A document
    // that renames Fireball to "True Strike" must not mint a radiant attack
    // profile, and must not raise a warning about a spell that is not one.
    const found = recogniseAttackCantrips([
      route({
        spell_content_key: '2024:fireball',
        identity_name: 'Fireball',
        spell_name: 'True Strike',
        spell_level: 3,
      }),
    ]);
    expect(found.true_strike.state).toBe('not_known');
    expect(found.unrecognised).toEqual([]);
  });

  it('refuses a matching key filed at a level a cantrip cannot be', () => {
    const found = recogniseAttackCantrips([
      route({ spell_level: 3 }),
    ]);
    expect(found.true_strike.state).toBe('not_known');
    expect(found.unrecognised[0]?.reason).toContain('spell level 3');
  });

  it('keeps one entry per distinct source and ability, not per route', () => {
    // A prepared caster's cantrip can arrive on several routes from one source.
    const found = recogniseAttackCantrips([
      route({ slot_id: 30 }),
      route({ slot_id: 31 }),
      route({ slot_id: 32, source_instance_id: 21 }),
    ]);
    expect(found.true_strike).toEqual({
      state: 'known',
      sources: [
        { source_name: 'Arcane scholar', spellcasting_ability: 'intelligence' },
      ],
    });
  });

  it('keeps two sources that resolve to different abilities', () => {
    // `multiclassing.txt`: "you use the spellcasting ability of that class when
    // you cast the spell." Two classes, two abilities, two real numbers.
    const found = recogniseAttackCantrips([
      route({}),
      route({
        source_name: 'Magic Initiate',
        source_instance_id: 40,
        spellcasting_ability: 'charisma',
      }),
    ]);
    expect(found.true_strike.state).toBe('known');
    expect(
      found.true_strike.state === 'known'
        ? found.true_strike.sources.map((s) => s.spellcasting_ability)
        : [],
    ).toEqual(['intelligence', 'charisma']);
  });

  it('keeps a source that resolves to no ability at all', () => {
    // A Fighter's class row has `spellcasting_ability = NULL`. Dropping the
    // source would turn "we cannot compute this" into "you do not know it".
    const found = recogniseAttackCantrips([
      route({ source_name: 'Magic Initiate', spellcasting_ability: null }),
    ]);
    expect(found.true_strike).toEqual({
      state: 'known',
      sources: [
        { source_name: 'Magic Initiate', spellcasting_ability: null },
      ],
    });
  });

  it('recognises Shillelagh independently of True Strike', () => {
    const found = recogniseAttackCantrips([
      route({
        identity_name: 'Shillelagh',
        spell_name: 'Shillelagh',
        spell_content_key: '2024:shillelagh',
        source_name: 'Druid',
        spellcasting_ability: 'wisdom',
      }),
    ]);
    expect(found.shillelagh.state).toBe('known');
    expect(found.true_strike.state).toBe('not_known');
  });

  it('finds neither in a character who has neither', () => {
    const found = recogniseAttackCantrips([
      route({
        identity_name: 'Fire Bolt',
        spell_name: 'Fire Bolt',
        spell_content_key: '2024:fire-bolt',
      }),
    ]);
    expect(found.true_strike.state).toBe('not_known');
    expect(found.shillelagh.state).toBe('not_known');
    expect(found.unrecognised).toEqual([]);
  });

  it('finds nothing in no routes at all', () => {
    expect(recogniseAttackCantrips([])).toEqual({
      true_strike: { state: 'not_known' },
      shillelagh: { state: 'not_known' },
      unrecognised: [],
    });
  });
});
