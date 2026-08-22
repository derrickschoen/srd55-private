import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { loadContentPackBytes } from '../../../src/content/content-pack';
import {
  buildContentPackDocuments,
  mapParsedSpellToContentPack,
  type ContentPackUnemittedReason,
} from '../../../tools/scrape/build-content-pack';
import type { BuiltPage } from '../../../tools/scrape/build-catalog';
import { parseSpellPage } from '../../../tools/scrape/parse-spell';
import { SCRAPE_SENTINEL } from '../../../tools/scrape/provenance';
import { syntheticSpellPage } from '../../fixtures/scrape/synthetic-pages';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SyntheticSpellInput {
  readonly title: string;
  readonly descriptor: string;
  readonly castingTime: string;
  readonly range: string;
  readonly components: string;
  readonly duration: string;
  readonly body: readonly string[];
  readonly tags: readonly string[];
}

const ATTACK_DESCRIPTION =
  'Make a ranged spell attack against one creature within range. On a hit, that creature takes 2d6 Fire damage.';
const SAVE_DESCRIPTION =
  'One creature within range must make a Dexterity saving throw. On a failed save, that creature takes 3d4 Thunder damage. On a successful save, it takes half as much damage.';

function syntheticInput(overrides: Partial<SyntheticSpellInput> = {}): SyntheticSpellInput {
  return {
    title: 'Ember Needle',
    descriptor: 'Level 1 Evocation (Wizard)',
    castingTime: 'Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    body: [ATTACK_DESCRIPTION],
    tags: ['evocation', 'wizard'],
    ...overrides,
  };
}

function parsedPage(overrides: Partial<SyntheticSpellInput> = {}): BuiltPage {
  const input = syntheticInput(overrides);
  const parsed = parseSpellPage(syntheticSpellPage({
    ...input,
    source: "Cartographer's Almanac",
  }), { edition: '2024', slug: `spell:${input.title.toLowerCase().replaceAll(' ', '-')}` });
  if (!parsed.ok) throw new Error(parsed.reason);
  return {
    url: `http://example.invalid/spell:${input.title.toLowerCase().replaceAll(' ', '-')}`,
    record: parsed.value.record,
    description: parsed.value.description,
  };
}

function expectReason(page: BuiltPage, reason: ContentPackUnemittedReason): void {
  expect(mapParsedSpellToContentPack(page.record, page.description)).toEqual({
    status: 'unemitted',
    reason,
  });
}

const ATTACK_PAGE = parsedPage();
const SAVE_PAGE = parsedPage({
  title: 'Hollow Pulse',
  descriptor: 'Level 2 Evocation (Cleric)',
  body: [SAVE_DESCRIPTION],
  tags: ['cleric', 'evocation'],
});
const AMBIGUOUS_PAGE = parsedPage({
  title: 'Barbed Ember Needle',
  body: [`${ATTACK_DESCRIPTION} The target also glows until dawn.`],
});
const UNMAPPED_PAGE = parsedPage({
  title: 'Quiet Compass',
  descriptor: 'Level 1 Divination (Wizard)',
  body: ['A tiny invented compass points toward the last doorway you touched.'],
  tags: ['divination', 'wizard'],
});
const OUT_OF_COMBAT_PAGE = parsedPage({
  title: 'Patient Ember Needle',
  castingTime: '1 minute',
});
const SYNTHETIC_FIXTURE_SET = [
  ATTACK_PAGE,
  SAVE_PAGE,
  AMBIGUOUS_PAGE,
  UNMAPPED_PAGE,
  OUT_OF_COMBAT_PAGE,
] as const;

describe('scraper content-pack emission', () => {
  it('reports every synthetic page as emitted or unemitted with one reason enum', () => {
    const output = buildContentPackDocuments({
      pages: SYNTHETIC_FIXTURE_SET,
      parseFailures: [],
      importedAt: '2026-08-22T00:00:00.000Z',
    });

    expect(output.report).toEqual({
      provenance: SCRAPE_SENTINEL,
      pagesSeen: 5,
      emitted: 2,
      unemitted: 3,
      unemittedByReason: {
        'ambiguous-parameters': 1,
        'out-of-combat': 1,
        'parse-failure': 0,
        'unmapped-vocabulary': 1,
      },
      unemittedPages: [
        {
          url: AMBIGUOUS_PAGE.url,
          recordId: AMBIGUOUS_PAGE.record.identityKey,
          reason: 'ambiguous-parameters',
        },
        {
          url: UNMAPPED_PAGE.url,
          recordId: UNMAPPED_PAGE.record.identityKey,
          reason: 'unmapped-vocabulary',
        },
        {
          url: OUT_OF_COMBAT_PAGE.url,
          recordId: OUT_OF_COMBAT_PAGE.record.identityKey,
          reason: 'out-of-combat',
        },
      ].sort((left, right) => left.url.localeCompare(right.url)),
    });
    expect(loadContentPackBytes(output.packBytes).status).toBe('loaded');
    expect(output.packBytes).toContain(SCRAPE_SENTINEL);
  });

  it('is byte-identical across repeated builds and independent of input order', () => {
    const input = {
      pages: SYNTHETIC_FIXTURE_SET,
      parseFailures: [{ url: 'http://example.invalid/spell:unfinished', reason: 'synthetic parse miss' }],
      importedAt: '2026-08-22T00:00:00.000Z',
    } as const;
    const first = buildContentPackDocuments(input);
    const second = buildContentPackDocuments(input);
    const reversed = buildContentPackDocuments({ ...input, pages: [...input.pages].reverse() });

    expect(second.packBytes).toBe(first.packBytes);
    expect(second.reportBytes).toBe(first.reportBytes);
    expect(reversed.packBytes).toBe(first.packBytes);
    expect(reversed.reportBytes).toBe(first.reportBytes);
    expect(first.report.unemittedByReason['parse-failure']).toBe(1);
    expect(first.report.unemittedPages).toContainEqual({
      url: 'http://example.invalid/spell:unfinished',
      recordId: null,
      reason: 'parse-failure',
    });
  });

  it('roundtrip_not_executed: imports and executes an emitted operation in an encounter', () => {
    const output = buildContentPackDocuments({
      pages: [ATTACK_PAGE],
      parseFailures: [],
      importedAt: '2026-08-22T00:00:00.000Z',
    });
    const loaded = loadContentPackBytes(output.packBytes);
    if (loaded.status !== 'loaded') throw new Error(loaded.refusal.reason);

    const caster = playerProfile('scrape-pack-caster', {
      initiativeBonus: 20,
      spellSlots: [{ level: 1, maximum: 1 }],
    });
    const target = monsterProfile('scrape-pack-target', {
      initiativeBonus: -20,
      hitPoints: 20,
    });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0), placedToken(target, 1)],
      contentPacks: [loaded.content],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const result = reduceEncounter(state, {
      type: 'cast_spell',
      actor: caster.id,
      spellId: 'scraped.wikidot:scraped-ember-needle',
      slotLevel: 1,
      castAsRitual: false,
      casterLevel: 3,
      attackBonus: 100,
      saveDc: 13,
      spellcastingModifier: 3,
      targets: [target.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }, () => 0.5);

    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'spell_cast',
      spellId: 'scraped.wikidot:scraped-ember-needle',
    }));
    expect(result.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(12);
  });

  it('approximate_mapping_accepted: refuses an otherwise exact operation with one extra rider clause', () => {
    expect(mapParsedSpellToContentPack(ATTACK_PAGE.record, ATTACK_PAGE.description).status).toBe('emitted');
    expectReason(
      { ...ATTACK_PAGE, description: `${ATTACK_PAGE.description} The target also glows until dawn.` },
      'ambiguous-parameters',
    );
  });

  it('refusal_reason_collapsed: preserves each specific refusal reason', () => {
    const ambiguous = { ...ATTACK_PAGE, description: `${ATTACK_PAGE.description} It also moves.` };
    const unmapped = { ...ATTACK_PAGE, description: 'A harmless invented marker appears nearby.' };
    const outOfCombat = {
      ...ATTACK_PAGE,
      record: { ...ATTACK_PAGE.record, castingTime: '1 minute' },
    };
    expectReason(ambiguous, 'ambiguous-parameters');
    expectReason(unmapped, 'unmapped-vocabulary');
    expectReason(outOfCombat, 'out-of-combat');
  });

  it.each([
    ['casting time', { castingTime: '1 minute' }, 'out-of-combat'],
    ['unknown casting vocabulary', { castingTime: 'Swift Action' }, 'unmapped-vocabulary'],
    ['material consumption', { components: 'V, S, M (an invented copper spiral)' }, 'ambiguous-parameters'],
    ['unknown component', { components: 'V, X' }, 'unmapped-vocabulary'],
    ['duplicate component', { components: 'V, V' }, 'unmapped-vocabulary'],
    ['empty components', { components: '' }, 'unmapped-vocabulary'],
    ['unstructured range', { range: 'about 60 feet' }, 'ambiguous-parameters'],
    ['pluralized one-foot range', { range: '1 feet' }, 'ambiguous-parameters'],
    ['non-instantaneous duration', { duration: '1 round' }, 'ambiguous-parameters'],
    ['concentration', { concentration: true }, 'ambiguous-parameters'],
    ['missing casting time', { castingTime: null }, 'ambiguous-parameters'],
    ['missing range', { range: null }, 'ambiguous-parameters'],
    ['missing components', { components: null }, 'ambiguous-parameters'],
    ['missing duration', { duration: null }, 'ambiguous-parameters'],
    ['invalid record id', { identityKey: 'Not An Identifier' }, 'ambiguous-parameters'],
  ] as const)(
    'distinguishing metadata input: %s differs only in the deciding field',
    (_label, change, reason) => {
      expect(mapParsedSpellToContentPack(ATTACK_PAGE.record, ATTACK_PAGE.description).status).toBe('emitted');
      expectReason({ ...ATTACK_PAGE, record: { ...ATTACK_PAGE.record, ...change } }, reason);
    },
  );

  it('distinguishes attack and save vocabulary from unknown or incomplete vocabulary', () => {
    expect(mapParsedSpellToContentPack(ATTACK_PAGE.record, ATTACK_PAGE.description).status).toBe('emitted');
    expect(mapParsedSpellToContentPack(SAVE_PAGE.record, SAVE_PAGE.description)).toMatchObject({
      status: 'emitted',
      spell: { operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'half' } },
    });
    expectReason(
      { ...ATTACK_PAGE, description: ATTACK_PAGE.description.replace('Fire damage', 'Dream damage') },
      'unmapped-vocabulary',
    );
    expectReason(
      { ...SAVE_PAGE, description: SAVE_PAGE.description.replace('Dexterity', 'Luck') },
      'unmapped-vocabulary',
    );
    expectReason(
      { ...ATTACK_PAGE, description: ATTACK_PAGE.description.replace('On a hit,', 'Later,') },
      'ambiguous-parameters',
    );
    expectReason(
      { ...ATTACK_PAGE, description: 'A harmless invented marker appears nearby.' },
      'unmapped-vocabulary',
    );
  });

  it.each([
    ['range minimum below', { range: '0 feet' }, 'ambiguous-parameters'],
    ['range minimum at', { range: '1 foot' }, 'emitted'],
    ['range maximum at', { range: '100000 feet' }, 'emitted'],
    ['range maximum above', { range: '100001 feet' }, 'ambiguous-parameters'],
    ['level minimum below', { level: 0 }, 'ambiguous-parameters'],
    ['level minimum at', { level: 1 }, 'emitted'],
    ['level maximum at', { level: 9 }, 'emitted'],
    ['level maximum above', { level: 10 }, 'ambiguous-parameters'],
  ] as const)('numeric metadata boundary: %s', (_label, change, expected) => {
    const result = mapParsedSpellToContentPack(
      { ...ATTACK_PAGE.record, ...change },
      ATTACK_PAGE.description,
    );
    if (expected === 'emitted') {
      expect(result.status).toBe('emitted');
    } else {
      expect(result).toEqual({ status: 'unemitted', reason: expected });
    }
  });

  it.each([
    ['dice count minimum below', '0d6', 'ambiguous-parameters'],
    ['dice count minimum at', '1d6', 'emitted'],
    ['dice count maximum at', '100d6', 'emitted'],
    ['dice count maximum above', '101d6', 'ambiguous-parameters'],
    ['die sides minimum below', '2d1', 'ambiguous-parameters'],
    ['die sides minimum at', '2d2', 'emitted'],
    ['die sides maximum at', '2d100', 'emitted'],
    ['die sides maximum above', '2d101', 'ambiguous-parameters'],
  ] as const)('numeric operation boundary: %s', (_label, dice, expected) => {
    const description = ATTACK_PAGE.description.replace('2d6', dice);
    const result = mapParsedSpellToContentPack(ATTACK_PAGE.record, description);
    if (expected === 'emitted') {
      expect(result.status).toBe('emitted');
    } else {
      expect(result).toEqual({ status: 'unemitted', reason: expected });
    }
  });
});
