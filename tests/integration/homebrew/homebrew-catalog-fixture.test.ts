import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { handlers } from '../../../src/worker/handlers/catalog';
import type { CatalogImportSummary } from '../../../src/catalog/catalog-importer';
import {
  importedContentKeyOwner,
  isSpellVersionKey,
} from '../../../src/catalog/catalog-key';
import type { DatabaseContext } from '../../../src/db/database';
import { attacksPerAction } from '../../../src/rules/sheet';
import { SheetContentLookup } from '../../../src/rules/sheet-content-lookup';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';

const fixtureDir = fileURLToPath(
  new URL('../../fixtures/homebrew-catalog/', import.meta.url),
);
const read = (name: string): string =>
  readFileSync(join(fixtureDir, name), 'utf8');

const TIER1 = read('long-road-spells.tier1.json');
const TIER2 = read('long-road-spells.tier2.json');
const SUBCLASS = read('college-of-the-long-road.subclass.tier1.json');
const LEGACY = read('legacy-pre-subclass.tier1.json');
const SUBCLASS_KEY = '2024:longroad.homebrew:college-of-the-long-road';

let harness: RpcHarness | undefined;
afterEach(() => {
  harness?.close();
  harness = undefined;
});

async function open(): Promise<RpcHarness> {
  harness = await createRpcHarness(handlers);
  return harness;
}

async function importCatalog(
  rpc: RpcHarness,
  params: Record<string, unknown>,
): Promise<CatalogImportSummary> {
  const response = await rpc.call<typeof params, CatalogImportSummary>(
    'catalog.import',
    params,
  );
  if (!response.ok) {
    throw new Error(
      `catalog.import failed: ${JSON.stringify((response as { error: unknown }).error)}`,
    );
  }
  return response.result;
}

/**
 * The hand-written homebrew fixture, driven through the REAL import path.
 *
 * Nothing here is scraped. The point of the fixture is that the format the
 * scraper emits is the format the app already accepts — so the fixture is
 * written by hand in that format and put through the same RPC, which is the
 * only honest way to show the two agree without committing scraped bytes.
 */
describe('the homebrew catalog fixture imports through the existing path', () => {
  it('dry-runs to exactly the record count, then commits it, then is idempotent', async () => {
    const rpc = await open();
    const recordCount = (JSON.parse(TIER1) as unknown[]).length;
    expect(recordCount).toBe(5);

    const dry = await importCatalog(rpc, {
      documents: [TIER1],
      textDocuments: [TIER2],
      dryRun: true,
    });
    expect(dry).toMatchObject({
      created: recordCount,
      updated: 0,
      tombstoned: 0,
      identities_created: recordCount,
      text_available: true,
      descriptions_loaded: recordCount,
    });
    // A dry run rolls the whole transaction back, so nothing is persisted.
    expect(
      rpc.context.db.scalar(
        "SELECT count(*) AS n FROM spell_versions WHERE provenance = 'import'",
      ),
    ).toBe(0);

    const real = await importCatalog(rpc, {
      documents: [TIER1],
      textDocuments: [TIER2],
    });
    expect(real).toMatchObject({ created: recordCount, updated: 0 });
    expect(
      rpc.context.db.scalar(
        "SELECT count(*) AS n FROM spell_versions WHERE provenance = 'import'",
      ),
    ).toBe(recordCount);

    // The same file twice must be a no-op. This is the property that makes a
    // re-scrape safe to import.
    expect(
      await importCatalog(rpc, {
        documents: [TIER1],
        textDocuments: [TIER2],
      }),
    ).toMatchObject({
      created: 0,
      updated: 0,
      tombstoned: 0,
      memberships_created: 0,
      tags_created: 0,
    });
  });

  it('lands every field the fixture set, including the ones easy to drop', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [TIER1], textDocuments: [TIER2] });

    expect(
      rpc.context.db.allRaw(
        `SELECT content_key, display_name, level, school, action_type,
                concentration, ritual, healing, effect_reliability_category
         FROM spell_versions
         WHERE provenance = 'import'
         ORDER BY content_key`,
      ),
    ).toEqual([
      {
        content_key: 'expanded:longroad.homebrew:coinbite',
        display_name: 'Coinbite',
        level: 0,
        school: 'Enchantment',
        action_type: 'Action',
        concentration: 0,
        ritual: 0,
        healing: 0,
        effect_reliability_category: 'saving_throw',
      },
      {
        content_key: 'expanded:longroad.homebrew:crossroads-bargain',
        display_name: 'Crossroads Bargain',
        level: 3,
        school: 'Illusion',
        action_type: 'Action',
        concentration: 1,
        ritual: 0,
        healing: 0,
        effect_reliability_category: 'mixed',
      },
      {
        content_key: 'expanded:longroad.homebrew:fiddlers-poultice',
        display_name: "Fiddler's Poultice",
        level: 1,
        school: 'Transmutation',
        // Derived by the importer from castingTime, not supplied by the fixture.
        action_type: 'Bonus Action',
        concentration: 0,
        ritual: 0,
        healing: 1,
        effect_reliability_category: 'modifier_scaled',
      },
      {
        content_key: 'expanded:longroad.homebrew:milepost-vigil',
        display_name: 'Milepost Vigil',
        level: 2,
        school: 'Divination',
        action_type: 'Action',
        concentration: 0,
        ritual: 1,
        healing: 0,
        effect_reliability_category: 'ritual_utility',
      },
      {
        content_key: 'expanded:longroad.homebrew:roadmenders-cadence',
        display_name: "Roadmender's Cadence",
        level: 1,
        school: 'Abjuration',
        action_type: 'Action',
        concentration: 1,
        ritual: 0,
        healing: 0,
        effect_reliability_category: 'modifier_scaled',
      },
    ]);

    // Tier 2 text lands as the summary, and only because textDocuments was
    // supplied — the character-list UI cannot supply it today.
    expect(
      rpc.context.db.scalar(
        `SELECT short_summary FROM spell_versions
         WHERE content_key = 'expanded:longroad.homebrew:coinbite'`,
      ),
    ).toContain('You flip a coin');

    expect(
      rpc.context.db
        .allRaw(
          `SELECT DISTINCT membership.spell_list_key
           FROM spell_list_memberships AS membership
           INNER JOIN spell_versions AS version
             ON version.id = membership.spell_version_id
           WHERE version.provenance = 'import'
           ORDER BY membership.spell_list_key`,
        )
        .map((row) => row.spell_list_key),
    ).toEqual(['Bard', 'Cleric', 'Druid', 'Warlock']);

    // The importer adds implicit tags of its own on top of the fixture's.
    expect(
      rpc.context.db
        .allRaw('SELECT DISTINCT tag FROM spell_version_tags ORDER BY tag')
        .map((row) => row.tag),
    ).toEqual(['concentration', 'ritual', 'travel']);
  });

  it('uses keys the share/export path will still accept later', async () => {
    // The importer accepts ANY non-empty string as a key. The share path does
    // not, and throws. A fixture with sloppy keys would import green here and
    // break sharing somewhere else entirely.
    for (const record of JSON.parse(TIER1) as { versionKey: string }[]) {
      expect(
        isSpellVersionKey(record.versionKey),
        `${record.versionKey} fails the spell-key grammar`,
      ).toBe(true);
    }
  });

  it('demonstrates that an import is a FULL REPLACEMENT, not a delta', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [TIER1] });

    // Re-importing a SUBSET deactivates everything absent from it. This is the
    // single most important constraint on anything that generates these files,
    // and it is why the scraper's build step refuses to emit a partial catalog.
    const subset = (JSON.parse(TIER1) as unknown[]).slice(0, 2);
    const summary = await importCatalog(rpc, {
      documents: [JSON.stringify(subset)],
    });
    expect(summary.tombstoned).toBe(3);
    expect(
      rpc.context.db.scalar(
        'SELECT count(*) AS n FROM spell_versions WHERE is_active = 0',
      ),
    ).toBe(3);
  });
});

/**
 * THE SUBCLASS FIXTURE, IMPORTED FOR REAL.
 *
 * This block replaces `the D19 subclass fixture cannot land, and here is each
 * reason`, which proved four blockers. Three of them are gone: D19 built
 * `subclass_features` with a weapon scope and a class level, and this change
 * gave `catalog.import` a subclass record kind to carry it. The old block was
 * written to GO RED when that happened and it did its job — it is REPLACED here
 * rather than renamed, because a renamed tripwire asserts nothing.
 *
 * EVERY CASE BELOW CAN FAIL. The import is driven through the real RPC, every
 * stored column is read back out of SQLite by name, and the level 6 grant is
 * followed all the way into `attacksPerAction` — which is the only assertion
 * that proves the row is not merely stored but MEANS something.
 */
describe('the College of the Long Road imports and reaches the sheet', () => {
  /** The Bard the application seed writes, resolved the way production does. */
  function bardClassId(db: DatabaseContext): number {
    return Number(
      db.scalar('SELECT id FROM class_definitions WHERE content_key = ?', [
        '2024:class:bard',
      ]),
    );
  }

  function subclassId(db: DatabaseContext): number {
    return Number(
      db.scalar('SELECT id FROM subclass_definitions WHERE content_key = ?', [
        SUBCLASS_KEY,
      ]),
    );
  }

  /** A Bard of `level` who has taken the imported subclass. */
  function bard(db: DatabaseContext, level: number): number {
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Walker')",
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, subclass_definition_id, level,
          is_starting_class)
       VALUES (?, ?, ?, ?, 1)`,
      [characterId, bardClassId(db), subclassId(db), level],
    );
    return characterId;
  }

  it('imports through catalog.import and lands every field it carries', async () => {
    const rpc = await open();
    const summary = await importCatalog(rpc, { documents: [SUBCLASS] });

    expect(summary).toMatchObject({
      subclasses_created: 1,
      subclasses_updated: 0,
      subclass_features_created: 4,
      // The document declared only subclasses, so the spell arm did nothing at
      // all — not even a sweep. See the cross-kind suite for why that matters.
      created: 0,
      updated: 0,
      tombstoned: 0,
    });

    const db = rpc.context.db;
    expect(
      db.oneRaw(
        `SELECT content_key, name, rules_edition, class_definition_id,
                spellcasting_ability, caster_fraction, caster_rounding,
                grant_rules
         FROM subclass_definitions
         WHERE content_key = ?`,
        [SUBCLASS_KEY],
      ),
    ).toEqual({
      content_key: SUBCLASS_KEY,
      name: 'College of the Long Road',
      rules_edition: '2024',
      class_definition_id: bardClassId(db),
      // AN IMPORTED SUBCLASS IS A NON-CASTER, and these four nulls are that
      // statement rather than an oversight: the format has no vocabulary for a
      // caster fraction or a `grant_rules` blob, so it writes none. Asserted so
      // that an increment which adds the vocabulary has to come here and say so.
      spellcasting_ability: null,
      caster_fraction: null,
      caster_rounding: null,
      grant_rules: null,
    });

    // Every feature column, in printed order. `sort_order` is the ARRAY INDEX
    // and is not authored in the document at all — this is where that is proved.
    expect(
      db.allRaw(
        `SELECT sort_order, class_level, name, description,
                effect_kind, effect_attack_count, effect_weapon_scope
         FROM subclass_features
         WHERE subclass_definition_id = ?
         ORDER BY sort_order`,
        [subclassId(db)],
      ),
    ).toEqual([
      {
        sort_order: 1,
        class_level: 3,
        name: 'Marching Song',
        description:
          "You always have Roadmender's Cadence prepared, and it does not count against the number of spells you can prepare.",
        effect_kind: null,
        effect_attack_count: null,
        effect_weapon_scope: null,
      },
      {
        sort_order: 2,
        class_level: 3,
        name: 'Road Trained',
        description:
          'You gain proficiency with Martial weapons and with Medium armour.',
        effect_kind: null,
        effect_attack_count: null,
        effect_weapon_scope: null,
      },
      {
        sort_order: 3,
        class_level: 6,
        name: 'Extra Attack',
        description:
          'Your road-worn footwork lets the Attack action carry two strikes for you rather than one.',
        effect_kind: 'extra_attack',
        effect_attack_count: 2,
        // The fixture used to say `null` here and the CHECK constraint refuses
        // that outright. The document now STATES the scope, and this is it.
        effect_weapon_scope: 'any_weapon',
      },
      {
        sort_order: 4,
        class_level: 14,
        name: 'Last Mile',
        description:
          'When you roll initiative and have no uses of Bardic Inspiration left, you regain one.',
        effect_kind: null,
        effect_attack_count: null,
        effect_weapon_scope: null,
      },
    ]);
  });

  it('drops the notes the format has no column for, rather than half-storing them', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [SUBCLASS] });

    // The fixture carries five underscore-prefixed explanatory keys, which is
    // the same mechanism `tools/scrape/provenance.ts` stamps `_provenance`
    // through. An unknown FIELD is dropped in silence; an unknown record KIND
    // is not (see the parser suite). Proved on the fixture's own text so a
    // future field that DID start landing would be caught here.
    const document = (JSON.parse(SUBCLASS) as Record<string, unknown>[])[0];
    expect(Object.keys(document as object).filter((key) => key.startsWith('_')))
      .toHaveLength(5);

    const dumped = JSON.stringify(
      rpc.context.db.allRaw('SELECT * FROM subclass_definitions'),
    );
    expect(dumped).not.toContain('_whatThisIs');
    expect(dumped).not.toContain('The Long Road Companion');
  });

  it('is idempotent, and a revised document replaces the feature list whole', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [SUBCLASS] });

    // The same file twice writes nothing. This is the property that makes
    // re-importing a whole catalog safe, and it is why the importer compares
    // the stored feature rows before deleting them.
    expect(await importCatalog(rpc, { documents: [SUBCLASS] })).toMatchObject({
      subclasses_created: 0,
      subclasses_updated: 0,
      subclass_features_created: 0,
    });

    // A revision that DROPS a feature drops it from the database. Within one
    // subclass the document is authoritative — nothing references a
    // `subclass_features` row, so there is nothing left dangling.
    const revised = JSON.parse(SUBCLASS) as {
      features: { name: string }[];
    }[];
    (revised[0] as { features: unknown[] }).features = (
      revised[0] as { features: unknown[] }
    ).features.slice(0, 2);
    expect(
      await importCatalog(rpc, { documents: [JSON.stringify(revised)] }),
    ).toMatchObject({
      subclasses_created: 0,
      subclasses_updated: 1,
      subclass_features_created: 2,
    });
    expect(
      rpc.context.db
        .allRaw(
          `SELECT name FROM subclass_features
           WHERE subclass_definition_id = ?
           ORDER BY sort_order`,
          [subclassId(rpc.context.db)],
        )
        .map((row) => String(row.name)),
    ).toEqual(['Marching Song', 'Road Trained']);
  });

  it('raises the attack count at Bard 6, and not at Bard 5', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [SUBCLASS] });
    const db = rpc.context.db;

    // THE POINT OF THE WHOLE CHANGE. The imported row is followed through
    // `SheetContentLookup` into `attacksPerAction`, which is the function that
    // decides the number printed on a sheet. A stored row that never reaches
    // here would pass every assertion above and mean nothing.
    const sixth = bard(db, 6);
    const atSix = attacksPerAction(
      new SheetContentLookup(db).forCharacter(sixth),
    );
    expect(atSix.count).toBe(2);
    // Applied outright, not surfaced: `any_weapon`, and the subclass IS
    // recorded on `character_class_levels`, so there is nothing unresolved.
    expect(atSix.unresolved).toEqual([]);

    db.exec('UPDATE character_class_levels SET level = 5 WHERE character_id = ?', [
      sixth,
    ]);
    // The grant is at BARD level 6. A Bard 5 has not reached it.
    expect(
      attacksPerAction(new SheetContentLookup(db).forCharacter(sixth)).count,
    ).toBe(1);
  });

  it('reads back as one grant among four features, three of them free text', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [SUBCLASS] });
    const db = rpc.context.db;
    const [entry] = new SheetContentLookup(db).forCharacter(bard(db, 6));

    expect(entry?.subclass).toEqual({
      id: subclassId(db),
      name: 'College of the Long Road',
    });
    // `all_subclass_features` is NOT level-filtered — the level 14 feature is
    // listed for a Bard 6, because this is a planner.
    expect(
      entry?.all_subclass_features.map((feature) => [
        feature.name,
        feature.class_level,
        feature.effect === null,
      ]),
    ).toEqual([
      ['Marching Song', 3, true],
      ['Road Trained', 3, true],
      ['Extra Attack', 6, false],
      ['Last Mile', 14, true],
    ]);
    expect(entry?.all_subclass_features[2]?.effect).toEqual({
      kind: 'extra_attack',
      attack_count: 2,
      weapon_scope: 'any_weapon',
    });
    // The two mechanical-sounding level 3 features are free text and nothing
    // else, which the fixture's own `_whatIsStillFreeTextAndWhy` states. This
    // is that claim made failable: if a future increment models an
    // always-prepared spell, this goes red and the fixture note is stale.
    expect(
      (entry?.extra_attack_grants ?? []).filter(
        (grant) => grant.source === 'subclass',
      ),
    ).toHaveLength(1);
  });

  it('keeps its imported key distinguishable from every bundled one', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [SUBCLASS] });

    // The key is the ONLY field of a subclass that travels into a backup or a
    // share link — `subclass_definitions` is `backupReference: true` and its
    // features are not — so it is the only place "imported, not bundled" can be
    // written down. Read straight out of the database, over the seed and the
    // import together.
    const owners = rpc.context.db
      .allRaw('SELECT content_key FROM subclass_definitions ORDER BY content_key')
      .map((row) => [
        String(row.content_key),
        importedContentKeyOwner(String(row.content_key)),
      ]);
    expect(owners).toEqual([
      [SUBCLASS_KEY, 'longroad.homebrew'],
      // Bundled: the middle segment is a record-kind literal with no dot, so it
      // is not an owner namespace and never will be.
      ['2024:subclass:arcane-trickster', null],
      ['2024:subclass:eldritch-knight', null],
    ]);
  });

  it('cannot be aimed at a bundled subclass, by key or by name', async () => {
    const rpc = await open();
    const record = (JSON.parse(SUBCLASS) as Record<string, unknown>[])[0] as Record<
      string,
      unknown
    >;

    // BY KEY: the bundled shape fails the imported-key grammar outright, so no
    // document can name a seeded row no matter what else it says.
    const byKey = await rpc.call('catalog.import', {
      documents: [
        JSON.stringify([
          { ...record, contentKey: '2024:subclass:eldritch-knight' },
        ]),
      ],
    });
    expect(byKey).toMatchObject({ ok: false });
    expect(JSON.stringify(byKey)).toContain('imported content key');

    // BY NAME: a legal imported key, but the (class, name, edition) slot is
    // already held by the bundled Eldritch Knight. Refused before anything is
    // written, rather than left to raise an opaque SQLITE_CONSTRAINT halfway
    // through the transaction.
    const byName = await rpc.call('catalog.import', {
      documents: [
        JSON.stringify([
          {
            ...record,
            contentKey: '2024:longroad.homebrew:not-eldritch-knight',
            parentClassKey: '2024:class:fighter',
            name: 'Eldritch Knight',
          },
        ]),
      ],
    });
    expect(byName).toMatchObject({ ok: false });
    expect(JSON.stringify(byName)).toContain('2024:subclass:eldritch-knight');

    // Neither attempt touched the seeded row.
    expect(
      rpc.context.db.oneRaw(
        `SELECT name, spellcasting_ability FROM subclass_definitions
         WHERE content_key = '2024:subclass:eldritch-knight'`,
      ),
    ).toEqual({ name: 'Eldritch Knight', spellcasting_ability: 'intelligence' });
  });

  it('refuses a parent class this catalog does not have', async () => {
    const rpc = await open();
    const record = (JSON.parse(SUBCLASS) as Record<string, unknown>[])[0];
    const response = await rpc.call('catalog.import', {
      documents: [
        JSON.stringify([
          { ...(record as object), parentClassKey: '2024:class:hedge-knight' },
        ]),
      ],
    });
    // Inventing the class would mint a `class_definitions` row with no
    // progression table, no hit die and no saving throws.
    expect(response).toMatchObject({ ok: false });
    expect(JSON.stringify(response)).toContain('2024:class:hedge-knight');
    expect(
      rpc.context.db.scalar('SELECT count(*) AS n FROM subclass_definitions'),
    ).toBe(2);
  });
});

/**
 * IMPORTING ONE RECORD KIND MUST NOT DESTROY ANOTHER.
 *
 * A spell import is a FULL REPLACEMENT — that is asserted three suites up and is
 * the behaviour the scraper's `BuildRefused` exists to protect. The moment a
 * document can also carry a subclass, that sweep becomes a hazard: "here are my
 * subclasses" would otherwise also mean "and I have no spells", and a user who
 * imported their homebrew subclass after their spell catalog would watch the
 * catalog go inactive with no error anywhere. That is silent data loss, so it
 * gets its own suite rather than a line in another one.
 */
describe('importing one kind leaves the other kind alone', () => {
  it('does not tombstone a single spell when only subclasses are imported', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [TIER1] });
    expect(
      rpc.context.db.scalar(
        `SELECT count(*) AS n FROM spell_versions
         WHERE provenance = 'import' AND is_active = 1`,
      ),
    ).toBe(5);

    const summary = await importCatalog(rpc, { documents: [SUBCLASS] });
    expect(summary).toMatchObject({ tombstoned: 0, subclasses_created: 1 });
    expect(
      rpc.context.db.scalar(
        `SELECT count(*) AS n FROM spell_versions
         WHERE provenance = 'import' AND is_active = 1`,
      ),
    ).toBe(5);
  });

  it('does not remove a subclass when only spells are imported', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [SUBCLASS] });

    // A spell import twice over, the second a SUBSET so the sweep really runs.
    await importCatalog(rpc, { documents: [TIER1] });
    const subset = (JSON.parse(TIER1) as unknown[]).slice(0, 2);
    const summary = await importCatalog(rpc, {
      documents: [JSON.stringify(subset)],
    });
    expect(summary.tombstoned).toBe(3);

    expect(
      rpc.context.db.scalar(
        'SELECT count(*) AS n FROM subclass_definitions WHERE content_key = ?',
        [SUBCLASS_KEY],
      ),
    ).toBe(1);
    expect(
      rpc.context.db.scalar(
        `SELECT count(*) AS n FROM subclass_features
         WHERE subclass_definition_id =
           (SELECT id FROM subclass_definitions WHERE content_key = ?)`,
        [SUBCLASS_KEY],
      ),
    ).toBe(4);
  });

  it('carries both kinds in one call, which is the intended usage', async () => {
    const rpc = await open();
    // The `documents` array is a UNION in one call, and mixing kinds inside a
    // single document works too — the discriminator is on the ELEMENT.
    const mixed = [
      ...(JSON.parse(TIER1) as unknown[]),
      ...(JSON.parse(SUBCLASS) as unknown[]),
    ];
    expect(
      await importCatalog(rpc, { documents: [JSON.stringify(mixed)] }),
    ).toMatchObject({
      created: 5,
      tombstoned: 0,
      subclasses_created: 1,
      subclass_features_created: 4,
    });
  });

  it('still empties the spell catalog on an empty document, as it always has', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [TIER1, SUBCLASS] });

    // `documents: ['[]']` is the shipped way to clear the spell catalog and is
    // asserted in tests/browser/catalog-import.spec.ts. A parse that saw NO
    // records declares no kind, so it keeps its historical meaning — a spell
    // document listing nothing — rather than becoming a no-op. The subclass is
    // untouched, because the subclass arm removes nothing ever.
    expect(await importCatalog(rpc, { documents: ['[]'] })).toMatchObject({
      tombstoned: 5,
      subclasses_created: 0,
    });
    expect(
      rpc.context.db.scalar(
        'SELECT count(*) AS n FROM subclass_features',
      ),
    ).toBe(4);
  });

  it('empties the spell catalog even when a subclass rides along in the same call', async () => {
    const rpc = await open();
    await importCatalog(rpc, { documents: [TIER1, SUBCLASS] });

    // THE MULTI-FILE PICKER MAKES THIS REACHABLE AND IT USED TO LOSE ITS
    // MEANING. `documents` is a union of FILES, so "empty my spell catalog and
    // here are my subclasses" is one natural drag-and-drop. When emptiness was
    // read off the WHOLE parse — no records at all — the empty file's meaning
    // survived only when it was the only file, and the sweep silently did not
    // run. An empty document now declares `spell` on its own behalf, so the
    // decision is per document and this call sweeps exactly as `['[]']` does.
    expect(
      await importCatalog(rpc, { documents: ['[]', SUBCLASS] }),
    ).toMatchObject({ tombstoned: 5, subclasses_created: 0 });
    expect(
      rpc.context.db.scalar(
        `SELECT count(*) AS n FROM spell_versions
         WHERE provenance = 'import' AND is_active = 1`,
      ),
    ).toBe(0);
    // The subclass in the same call is still imported, and still never removed.
    expect(
      rpc.context.db.scalar('SELECT count(*) AS n FROM subclass_features'),
    ).toBe(4);
  });
});

/**
 * A DOCUMENT WRITTEN BEFORE SUBCLASSES EXISTED STILL IMPORTS.
 *
 * The fixture read here is hand-typed and frozen — see its own
 * `_thisFileIsFrozen` note. Generating it from the current encoder would prove
 * only that today's code agrees with itself, and the claim is about files users
 * already hold.
 */
describe('the frozen pre-subclass document still imports unchanged', () => {
  it('imports with no `kind` field anywhere, defaulting the fields it predates', async () => {
    const rpc = await open();
    // The fixture must actually BE legacy, or the test proves nothing.
    const records = JSON.parse(LEGACY) as Record<string, unknown>[];
    expect(records.some((record) => 'kind' in record)).toBe(false);
    expect(
      records.some(
        (record) =>
          'tags' in record ||
          'healing' in record ||
          'effectReliabilityCategory' in record,
      ),
    ).toBe(false);

    expect(await importCatalog(rpc, { documents: [LEGACY] })).toMatchObject({
      created: 2,
      updated: 0,
      tombstoned: 0,
      identities_created: 2,
      subclasses_created: 0,
    });

    expect(
      rpc.context.db.allRaw(
        `SELECT content_key, healing, effect_reliability_category
         FROM spell_versions
         WHERE provenance = 'import'
         ORDER BY content_key`,
      ),
    ).toEqual([
      {
        content_key: '2014:quarrymans-warning',
        // Both defaulted by the parser, because the document predates them.
        healing: 0,
        effect_reliability_category: 'fixed_effect',
      },
      {
        content_key: 'expanded:quarry.homebrew:ashfall-lantern',
        healing: 0,
        effect_reliability_category: 'fixed_effect',
      },
    ]);

    // Its unknown `_writtenBy` field is dropped in silence, exactly as the
    // scraper's `_provenance` stamp is. That tolerance is what makes an OLD
    // document survive a NEW build, and it runs in both directions.
    expect(
      JSON.stringify(rpc.context.db.allRaw('SELECT * FROM spell_versions')),
    ).not.toContain('_writtenBy');
  });

  it('interoperates with a subclass document in the same call', async () => {
    const rpc = await open();
    // The compatibility claim is not "an old file imports alone" — it is that
    // an old file and a new one are the same format. One call, both documents.
    expect(
      await importCatalog(rpc, { documents: [LEGACY, SUBCLASS] }),
    ).toMatchObject({ created: 2, tombstoned: 0, subclasses_created: 1 });
  });
});

/**
 * THE RECORD KIND ITSELF: what a document may say, and what it may not.
 */
describe('the record kind discriminator', () => {
  const record = () =>
    (JSON.parse(SUBCLASS) as Record<string, unknown>[])[0] as Record<
      string,
      unknown
    >;

  async function refuses(
    documents: unknown[],
    fragment: string,
  ): Promise<void> {
    const rpc = await open();
    const response = await rpc.call('catalog.import', {
      documents: [JSON.stringify(documents)],
    });
    expect(response, fragment).toMatchObject({ ok: false });
    expect(JSON.stringify(response)).toContain(fragment);
  }

  it('refuses an unknown kind instead of skipping the record', async () => {
    // An unknown FIELD is dropped; an unknown KIND is a whole record this build
    // cannot store, and skipping it would import the document as complete while
    // dropping content the user can see in the file.
    await refuses(
      [{ ...record(), kind: 'feat' }],
      "'kind' must be one of spell, subclass",
    );
  });

  it('reads an explicitly null kind as a spell, exactly as an absent one', async () => {
    // A HAND-WRITTEN document omits the key; an ENCODER that writes every key
    // of a record it holds emits `null`. Neither says anything about the kind,
    // so both mean `spell` — the one thing `kind` must never do is turn "I have
    // no value here" into a refusal of the whole document set. Contrast the
    // test above: a kind that is present and WRONG is still refused.
    const rpc = await open();
    const spells = (JSON.parse(TIER1) as Record<string, unknown>[]).map(
      (spell) => ({ ...spell, kind: null }),
    );
    expect(
      await importCatalog(rpc, { documents: [JSON.stringify(spells)] }),
    ).toMatchObject({ created: 5, subclasses_created: 0 });
  });

  it('refuses an extra_attack effect with no weapon scope', async () => {
    const subclass = record();
    const features = (subclass.features as Record<string, unknown>[]).map(
      (feature) =>
        feature.effect === undefined
          ? feature
          : { ...feature, effect: { kind: 'extra_attack', attackCount: 2 } },
    );
    // No default, on purpose: `any_weapon` would WIDEN a one-weapon grant to
    // every weapon the character holds. The document states the scope.
    await refuses(
      [{ ...subclass, features }],
      "'features[2].effect.weaponScope' must be one of any_weapon, one_bonded_weapon",
    );
  });

  it('refuses an attack count of 1, which is a parse that found the wrong line', async () => {
    const subclass = record();
    const features = (subclass.features as Record<string, unknown>[]).map(
      (feature) =>
        feature.effect === undefined
          ? feature
          : {
              ...feature,
              effect: {
                kind: 'extra_attack',
                attackCount: 1,
                weaponScope: 'any_weapon',
              },
            },
    );
    await refuses(
      [{ ...subclass, features }],
      "'features[2].effect.attackCount' must be an integer of 2 or more",
    );
  });

  it('refuses a class level outside 1..20 and a feature named twice', async () => {
    const subclass = record();
    const features = subclass.features as Record<string, unknown>[];
    await refuses(
      [
        {
          ...subclass,
          features: [{ ...(features[0] as object), classLevel: 21 }],
        },
      ],
      "'features[0].classLevel' must be an integer from 1 through 20",
    );
    await refuses(
      [{ ...subclass, features: [features[0], features[0]] }],
      "lists the feature 'Marching Song' twice",
    );
  });

  it('refuses two documents that disagree about the same subclass', async () => {
    const subclass = record();
    const rpc = await open();
    const response = await rpc.call('catalog.import', {
      documents: [
        JSON.stringify([subclass]),
        JSON.stringify([{ ...subclass, name: 'College of the Short Road' }]),
      ],
    });
    // Spell records MERGE on their version key because a spell is split across
    // source books by design. A subclass carries an ORDERED FEATURE LIST and
    // there is no defensible merge of two orderings, so this is named.
    expect(response).toMatchObject({ ok: false });
    expect(JSON.stringify(response)).toContain(
      'two different subclasses under the key',
    );
  });

  it('accepts the same subclass twice when the documents agree', async () => {
    const rpc = await open();
    expect(
      await importCatalog(rpc, { documents: [SUBCLASS, SUBCLASS] }),
    ).toMatchObject({ subclasses_created: 1, subclass_features_created: 4 });
  });
});


describe('the fixtures are original prose, not SRD prose', () => {
  // Review found this file's Extra Attack feature reading "You can attack twice,
  // instead of once, whenever you take the Attack action on your turn." —
  // identical but for two commas to docs/srd/source/attack-class-features.txt,
  // inside a directory whose README claimed everything was invented here. The
  // wording has been rewritten; this stops the claim from silently rotting again.
  //
  // SRD 5.2 is CC-BY-4.0 (docs/srd/ATTRIBUTION.md), so this is a truthfulness
  // rule rather than a licensing one — but a fixture whose whole rhetorical
  // weight rests on being hand-written has to actually be hand-written.
  //
  // Matching is on WORD N-GRAMS, not on whole lines. The SRD sources are
  // two-column ASCII dumps, so a real sentence is split across lines with a
  // gutter in the middle and no line-based comparison would ever fire. Collapsing
  // all whitespace in the source restores each column run as a contiguous word
  // sequence; the cross-column junk n-grams that also appear are harmless,
  // because no hand-written sentence will match them.
  const GRAM = 8;
  const FORMULAIC_SRD_GRAMS = new Set([
    // A standard per-target benefit limit describes mechanics rather than distinctive prose.
    'a creature can benefit from this spell only',
    // The same per-target limit with its frequency is still generic rules language.
    'creature can benefit from this spell only once',
    // A saving-throw lead-in is shared rules syntax, not a distinctive expression.
    'must succeed on a wisdom saving throw or',
    // A conventional target-count phrase identifies recipients rather than creative prose.
    'you and up to five willing creatures within',
  ]);

  const words = (text: string): string[] =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((word) => word !== '');

  const grams = (text: string): string[] => {
    const normalized = words(text);
    const out: string[] = [];
    for (let index = 0; index + GRAM <= normalized.length; index += 1) {
      out.push(normalized.slice(index, index + GRAM).join(' '));
    }
    return out;
  };

  const srdDir = fileURLToPath(new URL('../../../docs/srd/source/', import.meta.url));
  const srdGrams = new Set(
    readdirSync(srdDir)
      .filter((name) => name.endsWith('.txt'))
      .flatMap((name) => grams(readFileSync(join(srdDir, name), 'utf8'))),
  );

  const matchingSrdGrams = (text: string): string[] =>
    grams(text).filter(
      (gram) => srdGrams.has(gram) && !FORMULAIC_SRD_GRAMS.has(gram),
    );

  // Negative control: the scan is only meaningful if it can see the SRD at all.
  // The exact sentence that was found here must still be detectable.
  it('can detect the wording that was actually found here', () => {
    expect(srdGrams.size).toBeGreaterThan(1000);
    const offending =
      'You can attack twice, instead of once, whenever you take the Attack action on your turn.';
    expect(matchingSrdGrams(offending)).toContain(
      'you can attack twice instead of once whenever',
    );
  });

  it('finds no SRD sentence in any homebrew fixture', () => {
    const strings = (value: unknown): string[] => {
      if (typeof value === 'string') {
        return [value];
      }
      if (Array.isArray(value)) {
        return value.flatMap(strings);
      }
      if (value !== null && typeof value === 'object') {
        return Object.values(value).flatMap(strings);
      }
      return [];
    };

    const offenders: string[] = [];
    for (const [name, text] of [
      ['college-of-the-long-road.subclass.tier1.json', SUBCLASS],
      ['legacy-pre-subclass.tier1.json', LEGACY],
      ['long-road-spells.tier1.json', TIER1],
      ['long-road-spells.tier2.json', TIER2],
    ] as const) {
      for (const value of strings(JSON.parse(text))) {
        for (const gram of matchingSrdGrams(value)) {
          offenders.push(`${name}: "…${gram}…"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
