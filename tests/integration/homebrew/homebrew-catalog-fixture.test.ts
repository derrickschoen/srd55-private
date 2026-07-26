import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { handlers } from '../../../src/worker/handlers/catalog';
import { rpcRegistry } from '../../../src/worker/registry';
import type { CatalogImportSummary } from '../../../src/catalog/catalog-importer';
import { isSpellVersionKey } from '../../../src/catalog/catalog-key';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';

const fixtureDir = fileURLToPath(
  new URL('../../fixtures/homebrew-catalog/', import.meta.url),
);
const read = (name: string): string =>
  readFileSync(join(fixtureDir, name), 'utf8');

const TIER1 = read('long-road-spells.tier1.json');
const TIER2 = read('long-road-spells.tier2.json');
const SUBCLASS = read('college-of-the-long-road.d19-gap.json');

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
      rpc.context.db.scalar('SELECT count(*) AS n FROM spell_versions'),
    ).toBe(0);

    const real = await importCatalog(rpc, {
      documents: [TIER1],
      textDocuments: [TIER2],
    });
    expect(real).toMatchObject({ created: recordCount, updated: 0 });
    expect(
      rpc.context.db.scalar('SELECT count(*) AS n FROM spell_versions'),
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
      rpc.context.db.all(
        `SELECT content_key, display_name, level, school, action_type,
                concentration, ritual, healing, effect_reliability_category
         FROM spell_versions ORDER BY content_key`,
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
        .all(
          `SELECT DISTINCT spell_list_key FROM spell_list_memberships
           ORDER BY spell_list_key`,
        )
        .map((row) => row.spell_list_key),
    ).toEqual(['Bard', 'Cleric', 'Druid', 'Warlock']);

    // The importer adds implicit tags of its own on top of the fixture's.
    expect(
      rpc.context.db
        .all('SELECT DISTINCT tag FROM spell_version_tags ORDER BY tag')
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
 * THE D19 GAP, PROVED RATHER THAN ASSERTED.
 *
 * The brief asked for a fixture with a Bard-like subclass granting Extra Attack
 * at level 6. The model cannot express it, so the fixture ships as the shape of
 * the missing thing and these tests pin each blocker to something falsifiable.
 *
 * Every case here is written to GO RED when D19 lands. That is the intent: they
 * are a tripwire on the gap closing, not a claim that it never will.
 */
describe('the D19 subclass fixture cannot land, and here is each reason', () => {
  it('is not in the catalog format, and catalog.import rejects it outright', async () => {
    const rpc = await open();
    // Not a JSON array of spell records — it is an object describing a subclass.
    // `isCatalogImportParams` rejects it before the importer ever runs.
    await expect(
      rpc.call('catalog.import', { documents: [SUBCLASS] }),
    ).resolves.toMatchObject({ ok: false });

    // And the reason is not fixable by reshaping: there is no spell-record field
    // that holds "grants Extra Attack at subclass level 6".
    const fixture = JSON.parse(SUBCLASS) as {
      subclass: { features: { classLevel: number; kind: string }[] };
    };
    const grant = fixture.subclass.features.find(
      (feature) => feature.kind === 'extra_attack_grant',
    );
    expect(grant?.classLevel).toBe(6);
  });

  it('has no import RPC to land in — catalog.import is the only content importer', () => {
    // The whole surface, discovered the same way the worker discovers it.
    const contentImporters = rpcRegistry.methods.filter((method) =>
      /import/iu.test(method),
    );
    expect(contentImporters.sort()).toEqual([
      // Character-scoped, not rules content.
      'backup.importCharacter',
      'backup.importDatabase',
      // The one and only rules-content importer. It takes spells.
      'catalog.import',
      'share.importCharacter',
    ]);
    expect(
      rpcRegistry.methods.some((method) =>
        /subclass|class\.import|feature/iu.test(method),
      ),
      'a subclass or feature import RPC now exists — D19 has landed, update this fixture',
    ).toBe(false);
  });

  it('has no column to land in either: the grant table knows only classes', async () => {
    const rpc = await open();
    const columns = rpc.context.db
      .all('PRAGMA table_info(class_extra_attack_grants)')
      .map((row) => String(row.name))
      .sort();

    expect(columns).toEqual([
      'attack_count',
      'class_definition_id',
      'class_level',
      'created_at',
      'id',
      'updated_at',
    ]);
    // The three columns D19 says the model needs, none of which exist. When any
    // of them appears this assertion fails and the fixture gets a real home.
    for (const missing of [
      'subclass_definition_id',
      'grant_source',
      'weapon_scope',
    ]) {
      expect(
        columns,
        `${missing} now exists — D19 has landed, update this fixture`,
      ).not.toContain(missing);
    }
  });

  it('would be attributed to the whole Bard class if forced in, which is wrong', async () => {
    const rpc = await open();
    // The only key the table offers is (class_definition_id, class_level). The
    // fixture's grant belongs to ONE subclass at Bard level 6; writing it here
    // would give Extra Attack to every Bard, including a College of Lore one.
    // Demonstrated rather than argued: the UNIQUE index is on the class, so a
    // second subclass's grant at the same level cannot even coexist with it.
    const indexes = rpc.context.db
      .all('PRAGMA index_list(class_extra_attack_grants)')
      .map((row) => String(row.name));
    const unique = indexes.find((name) => name.includes('class_level_unique'));
    expect(unique).toBeDefined();
    expect(
      rpc.context.db
        .all(`PRAGMA index_info(${unique as string})`)
        .map((row) => String(row.name))
        .sort(),
    ).toEqual(['class_definition_id', 'class_level']);
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

  const grams = (text: string): string[] => {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]+/g, ' ')
      .split(/\s+/)
      .filter((word) => word !== '');
    const out: string[] = [];
    for (let index = 0; index + GRAM <= words.length; index += 1) {
      out.push(words.slice(index, index + GRAM).join(' '));
    }
    return out;
  };

  const srdDir = fileURLToPath(new URL('../../../docs/srd/source/', import.meta.url));
  const srdGrams = new Set(
    readdirSync(srdDir)
      .filter((name) => name.endsWith('.txt'))
      .flatMap((name) => grams(readFileSync(join(srdDir, name), 'utf8'))),
  );

  // Negative control: the scan is only meaningful if it can see the SRD at all.
  // The exact sentence that was found here must still be detectable.
  it('can detect the wording that was actually found here', () => {
    expect(srdGrams.size).toBeGreaterThan(1000);
    const offending =
      'You can attack twice, instead of once, whenever you take the Attack action on your turn.';
    expect(grams(offending).some((gram) => srdGrams.has(gram))).toBe(true);
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
      ['college-of-the-long-road.d19-gap.json', SUBCLASS],
      ['long-road-spells.tier1.json', TIER1],
      ['long-road-spells.tier2.json', TIER2],
    ] as const) {
      for (const value of strings(JSON.parse(text))) {
        for (const gram of grams(value)) {
          if (srdGrams.has(gram)) {
            offenders.push(`${name}: "…${gram}…"`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
