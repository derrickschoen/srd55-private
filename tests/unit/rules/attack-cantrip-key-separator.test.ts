import { describe, expect, it } from 'vitest';
import type { SpellAccessRoute } from '../../../src/access/spell-access-builder';
import { recogniseAttackCantrips } from '../../../src/rules/attack-cantrips';

/**
 * THE SEPARATOR IS A NUL, AND F14 CHANGED ONLY ITS SPELLING.
 *
 * `recogniseAttackCantrips` de-duplicates its unrecognised list on a composite
 * key — cantrip, content key, source name — joined by a NUL. That byte was
 * written LITERALLY, which made `attack-cantrips.ts` `file(1): data` and
 * invisible to plain `grep`; it is now the `\u0000` escape, which is the same
 * string at runtime and leaves the file plain text.
 *
 * The spelling is cosmetic. The BYTE is not, and this file exists so that the
 * next reader who finds the escape ugly and reaches for `|` or `::` fails here
 * instead of shipping a reader that loses a report.
 *
 * TWO OF THE THREE FIELDS ARE FREE TEXT — a content key is whatever the
 * importing document chose and a source name is whatever named the source — so
 * a printable separator is genuinely collidable: `a|b` + `c` and `a` + `b|c`
 * are two different facts that join to one string. A NUL cannot appear in
 * either, because no JavaScript string that reached SQLite through this
 * application's codecs can carry one and no URL fragment can encode one.
 *
 * WHAT IS NOT DUPLICATED HERE. The distinct-pairs property of the OTHER key in
 * this module, `sourceKey` (source name plus spellcasting ability), is already
 * covered by `tests/unit/rules/attack-cantrips.test.ts` — "keeps one entry per
 * distinct source and ability, not per route" and "keeps two sources that
 * resolve to different abilities". Its second field is a closed enum, so unlike
 * the fingerprint below it is not collidable by a printable separator at all,
 * and a test claiming otherwise would be theatre.
 *
 * The third site F14 rewrote, `distinctWarnings` in
 * `src/queries/character-sheet-builder.ts`, is covered from both directions by
 * `tests/integration/queries/character-sheet.test.ts` — "says a degraded
 * starting class ONCE, not once per derivation" and "still says a code twice
 * when it names two different subjects".
 */

function route(overrides: Partial<SpellAccessRoute>): SpellAccessRoute {
  return {
    spell_identity_id: 1,
    identity_name: 'True Strike',
    spell_name: 'True Strike',
    spell_content_key: '2024:true-strike',
    rules_edition: '2024',
    spell_level: 0,
    ability_modifier: 4,
    attack_bonus: 7,
    save_dc: 15,
    origin: 'slot',
    casting_mode: 'at_will',
    spell_version_id: 10,
    source_instance_id: 20,
    source_name: 'Arcane scholar',
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

describe('the unrecognised-cantrip key', () => {
  it('keeps two reports a printable separator would have merged into one', () => {
    // Both routes are named True Strike and carry a key this application does
    // not recognise, so both are REPORTED rather than honoured. They are two
    // different facts about two different sources — and under `|`, `::`, a tab
    // or a newline as the separator the two keys are byte-identical, so the
    // second would be silently dropped as a duplicate of the first.
    for (const separator of ['|', '::', '\t', '\n']) {
      const first = route({
        spell_content_key: `homebrew${separator}alpha`,
        source_name: 'Beta',
      });
      const second = route({
        spell_content_key: 'homebrew',
        source_name: `alpha${separator}Beta`,
      });
      expect(
        `true_strike${separator}${first.spell_content_key}${separator}${first.source_name}`,
        'the fixture must actually collide under this separator, or the test proves nothing',
      ).toBe(
        `true_strike${separator}${second.spell_content_key}${separator}${second.source_name}`,
      );

      const found = recogniseAttackCantrips([first, second]);
      expect(found.unrecognised).toHaveLength(2);
      expect(
        found.unrecognised.map((entry) => [entry.content_key, entry.source_name]),
      ).toEqual([
        [first.spell_content_key, first.source_name],
        [second.spell_content_key, second.source_name],
      ]);
    }
  });

  it('still collapses the SAME fact arriving on two routes', () => {
    // The converse, which is what the key is FOR: one source, one unrecognised
    // key, two slots. Widening the separator would be one bug; dropping the
    // de-duplication entirely would be the other.
    const shape = {
      spell_content_key: 'homebrew:private:true-strike',
      source_name: 'Beta',
    };
    const found = recogniseAttackCantrips([
      route({ ...shape, slot_id: 30 }),
      route({ ...shape, slot_id: 31 }),
    ]);
    expect(found.unrecognised).toHaveLength(1);
  });
});
