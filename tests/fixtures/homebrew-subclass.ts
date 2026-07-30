import type { DatabaseContext } from '../../src/db/database';

/**
 * AN ORIGINAL HOMEBREW BARD SUBCLASS. A TEST FIXTURE, NEVER SEED CONTENT.
 *
 * D19 §1 is the reason this is here and the reason it is here rather than in
 * `src/rules/`. The owner's request — "some subclasses can add extra attack at
 * level 6" — names a subclass that is NOT in SRD 5.2 and is not free-licensed,
 * so D3 governs: the MODEL must be able to express it, and the bundled seed
 * must not contain it. Nothing in `src/` writes a `subclass_features` row.
 *
 * ORIGINAL, AND THAT WORD IS DOING WORK. The name, the two features' names and
 * every sentence of their text were written for this fixture, AND NOT ONE OF
 * THEM IS TRANSCRIBED FROM ANYWHERE — SRD 5.2 included. An earlier draft of the
 * level 6 feature was a clause reordering of the SRD's own "you can attack
 * twice instead of once whenever you take the Attack action on your turn". That
 * was licence-safe (CC-BY, already bundled here under the required notice) but
 * it made the claim in this paragraph false, and nothing parses these
 * descriptions — the effect columns below are set explicitly — so matching a
 * printed formula bought nothing. The sentence was rewritten rather than the
 * claim softened.
 *
 * What IS shared with any published subclass is the MECHANICAL SHAPE and
 * nothing else: a Bard subclass that grants Extra Attack at class level 6. A
 * rename of real prose would put that prose in this repository, which is the
 * thing D3 forbids; the shape is a fact about the model, and a fact cannot be
 * copyrighted.
 *
 * WHAT IT EXERCISES THAT THE BUNDLED CONTENT CANNOT:
 *
 *  - THE SUBCLASS ARM of the grant model. Both bundled named features are
 *    Warlock invocations; no SRD subclass grants Extra Attack, so without this
 *    fixture the `subclass` source would have no test at all.
 *  - THE APPLIED PATH. A subclass IS recorded on `character_class_levels`, so
 *    unlike an invocation this grant resolves fully and raises the number — the
 *    one arm of the model that produces an answer rather than a statement.
 *  - THE FREE-TEXT PATH. `Notebook and Nail` moves no number and carries no
 *    `effect_kind`, which is the ordinary case D12 measured on the species side
 *    (26 of 33) and the owner's own "most things are just a text box".
 *
 * IT IS ALSO WHAT AN IMPORT WOULD HAVE TO PRODUCE. There is no user-reachable
 * path to a custom subclass today — `CatalogRecord` (`src/catalog/catalog-schema.ts`)
 * carries spells and only spells, and share links and backups RESOLVE a
 * subclass by content key without ever creating one — so this fixture inserts
 * the rows an importer would write, and the acceptance criterion for the
 * subclass arm is a fixture rather than a user flow. Stated, not hidden.
 */

/** A namespaced key, so it can never collide with a bundled `2024:subclass:…`. */
export const HOMEBREW_SUBCLASS_KEY = '2024:homebrew.fixture:iron-hymn';

export const HOMEBREW_SUBCLASS_NAME = 'Choir of the Iron Hymn';

/** The level 6 feature's name, asserted on by the tests that use this. */
export const HOMEBREW_EXTRA_ATTACK_FEATURE = 'Hammered Cadence';
/** The text-only feature's name. */
export const HOMEBREW_TEXT_FEATURE = 'Notebook and Nail';

interface HomebrewFeature {
  readonly sort_order: number;
  readonly class_level: number;
  readonly name: string;
  readonly description: string;
  readonly effect_attack_count: number | null;
  readonly effect_weapon_scope: string | null;
}

const FEATURES: readonly HomebrewFeature[] = [
  {
    sort_order: 1,
    class_level: 3,
    name: HOMEBREW_TEXT_FEATURE,
    description:
      'You keep your working notebook on a nail at your belt, and you have ' +
      'learned to write in it one-handed while the room is still shouting. ' +
      'Whenever your company makes camp you may read one page of it aloud; ' +
      'those who listen remember the road you took to get there. Nothing is ' +
      'promised by the reading, and nothing is measured by it.',
    // FREE TEXT AND NOTHING ELSE. No `effect_kind`, no payload, and the schema
    // CHECKs make the payload columns unfillable without one — which is the
    // half of the D12 shape a test that only ever wrote mechanical rows would
    // never touch.
    effect_attack_count: null,
    effect_weapon_scope: null,
  },
  {
    sort_order: 2,
    class_level: 6,
    name: HOMEBREW_EXTRA_ATTACK_FEATURE,
    description:
      'Your rehearsal is a drill: you beat time against your own guard and ' +
      'the beat is where your feet go. Once that cadence is set, a single ' +
      'Attack action on your turn carries a second strike along with the ' +
      'first, and neither is the weaker for it.',
    // TWO IS THE TOTAL, ABSOLUTE, exactly as every other grant in this schema
    // stores it: the sentence says a second strike ALONGSIDE the first, which
    // is two strikes and not two extras. `any_weapon`, because nothing in the
    // feature ties it to one weapon; a scoped homebrew grant would say so and
    // would then be surfaced rather than applied.
    effect_attack_count: 2,
    effect_weapon_scope: 'any_weapon',
  },
];

/**
 * Inserts the subclass and its features against an already-seeded class
 * catalog, and returns the new `subclass_definitions.id`.
 *
 * The parent class is resolved BY NAME here because a test database's Bard is
 * the seeded Bard; production code resolves a parent class by CONTENT KEY
 * (`upsertThirdCaster` says why at length) and an importer would have to do the
 * same.
 */
export function insertHomebrewSubclass(
  db: DatabaseContext,
  className = 'Bard',
): number {
  const classId = Number(
    db.scalar('SELECT id FROM class_definitions WHERE name = ?', [className]),
  );
  const timestamp = new Date().toISOString();
  const subclassId = db.exec(
    `INSERT INTO subclass_definitions
       (content_key, class_definition_id, name, rules_edition, created_at, updated_at)
     VALUES (?, ?, ?, '2024', ?, ?)`,
    [
      HOMEBREW_SUBCLASS_KEY,
      classId,
      HOMEBREW_SUBCLASS_NAME,
      timestamp,
      timestamp,
    ],
  ).lastInsertId;

  for (const feature of FEATURES) {
    const featureId = db.exec(
      `INSERT INTO subclass_features
         (subclass_definition_id, class_level, sort_order, name, description,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        subclassId,
        feature.class_level,
        feature.sort_order,
        feature.name,
        feature.description,
        timestamp,
        timestamp,
      ],
    ).lastInsertId;
    if (feature.effect_attack_count !== null) {
      db.exec(
        `INSERT INTO subclass_feature_effects
           (subclass_feature_id, sort_order, effect_kind, attack_count,
            weapon_scope, created_at, updated_at)
         VALUES (?, 1, 'extra_attack', ?, ?, ?, ?)`,
        [
          featureId,
          feature.effect_attack_count,
          feature.effect_weapon_scope,
          timestamp,
          timestamp,
        ],
      );
    }
  }
  return subclassId;
}
