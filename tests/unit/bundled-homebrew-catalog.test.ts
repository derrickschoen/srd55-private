import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BUNDLED_HOMEBREW_CATALOG,
  deriveThirdCasterSlotCounts,
} from '../../src/authoring/bundled-homebrew-catalog';
import type { SubclassAuthoringDraft } from '../../src/authoring/contracts';
import { encodeCurrentDraft } from '../../src/authoring/draft-codecs';
import {
  AUTHORING_DOCUMENT_LIMITS,
  AUTHORING_LIST_LIMITS,
  AUTHORING_TEXT_LIMITS,
} from '../../src/authoring/limits';
import { characterLevels } from '../../src/domain/enums';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

function markdown(path: string): string {
  return readFileSync(`${ROOT}/${path}`, 'utf8').replaceAll('\r\n', '\n');
}

function section(source: string, heading: string, next: string): string {
  const start = source.indexOf(heading);
  const end = source.indexOf(next, start + heading.length);
  if (start < 0 || end < 0) throw new Error(`Missing markdown section ${heading}.`);
  return source.slice(start + heading.length, end).trim();
}

function plain(source: string): string {
  return source
    .replaceAll(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replaceAll(/[*_]/g, '')
    .replaceAll(/[¹²³⁴⁵⁶⁷]/gu, '')
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.replaceAll(/\s*\n\s*/g, ' '))
    .join('\n\n')
    .trim();
}

function publicationIdentity(source: string, subtitle: string): string {
  const front = section(source, subtitle, '\n\n---');
  const match = /^\*(?<identity>[\s\S]*?)\*(?:\n\n|$)/u.exec(front);
  if (match?.groups?.identity === undefined) {
    throw new Error(`Missing publication identity after ${subtitle}.`);
  }
  return plain(match.groups.identity);
}

function publicationFeatureProse(source: string): ReadonlyMap<string, string> {
  const firstRule = source.indexOf('\n---\n');
  const footnotes = source.indexOf('\n### Footnotes — provenance');
  if (firstRule < 0 || footnotes < 0) throw new Error('Missing publication feature bounds.');
  const body = source.slice(firstRule + '\n---\n'.length, footnotes);
  const found = new Map<string, string>();
  const matches = [...body.matchAll(/^## Level \d+: (?<name>.+)$/gmu)];
  for (const [index, match] of matches.entries()) {
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = matches[index + 1]?.index ?? body.length;
    const prose = body.slice(contentStart, contentEnd)
      .replaceAll(/^---$/gmu, '')
      .trim();
    found.set(match.groups!.name!, plain(prose));
  }
  return found;
}

function barbedSpellcastingProse(source: string): string {
  const body = section(source, '## Level 3: Barbed Court Spellcasting', '### Court Spells');
  const labels = [
    'Cantrips', 'Spell Slots', 'Prepared Spells', 'Court Spells',
    'Ritual Casting', 'Spellcasting Ability',
  ];
  const firstLabel = body.indexOf('**Cantrips.**');
  if (firstLabel < 0) throw new Error('Missing Barbed Court cantrip prose.');
  const paragraphs = [plain(body.slice(0, firstLabel))];
  for (const label of labels) {
    const match = new RegExp(
      `\\*\\*${label}\\.\\*\\* (?<prose>.*?)(?:\\n\\n|$)`,
      'su',
    ).exec(body);
    if (match?.groups?.prose === undefined) throw new Error(`Missing ${label} prose.`);
    paragraphs.push(`${label}. ${plain(match.groups.prose)}`);
  }
  return paragraphs.join('\n\n');
}

function markdownTable(
  source: string,
  heading: string,
  nextHeading: string,
): readonly (readonly string[])[] {
  return section(source, heading, nextHeading)
    .split('\n')
    .filter((line) => /^\|.*\|$/u.test(line))
    .slice(2)
    .map((line) => line.slice(1, -1).split('|').map((cell) => plain(cell)));
}

function catalogSubclass(key: string): SubclassAuthoringDraft {
  const entry = BUNDLED_HOMEBREW_CATALOG.find((candidate) => candidate.catalog_key === key);
  const document = entry?.revisions.at(-1);
  if (document?.kind !== 'subclass') throw new Error(`Missing catalog subclass ${key}.`);
  return document;
}

describe('bundled homebrew catalog payload', () => {
  it('matches the Veteran player publication while retaining the historical revision', () => {
    const source = markdown('docs/homebrew/cc-by/veteran-player.md');
    const identity = publicationIdentity(source, '*Rogue Subclass (Roguish Archetype)*');
    const features = publicationFeatureProse(source);
    const veteran = catalogSubclass('veteran');
    const entry = BUNDLED_HOMEBREW_CATALOG.find((candidate) => candidate.catalog_key === 'veteran');

    expect(entry?.revisions).toHaveLength(3);
    expect(entry?.revisions[0]?.kind === 'subclass'
      ? entry.revisions[0].features.find((feature) => feature.name === "Veteran's Strike")?.description
      : null).toContain('doubled');
    expect(veteran.reference_text).toBe(identity);
    expect(Object.fromEntries(veteran.features.map((feature) => [feature.name, feature.description])))
      .toEqual(Object.fromEntries(features));
    expect(veteran.features.flatMap((feature) => feature.contributions ?? []))
      .toEqual([
        expect.objectContaining({
          contribution_key: 'deeper-cuts',
          active_from_level: 3,
          active_to_level: 20,
          value: { kind: 'constant', amount: 1 },
          supersedes_contribution_key: null,
        }),
        expect.objectContaining({
          contribution_key: 'veterans-strike',
          active_from_level: 9,
          active_to_level: 20,
          value: {
            kind: 'class_level_scale',
            multiply: 1,
            divide: 2,
            round: 'floor',
          },
          supersedes_contribution_key: 'deeper-cuts',
        }),
        expect.objectContaining({
          contribution_key: 'veteran-reflexes',
          active_from_level: 13,
          active_to_level: 20,
          target: {
            kind: 'resource_maximum',
            display_label: 'Veteran Reflexes',
            marking_shape: 'boxes',
          },
          value: {
            kind: 'preserved',
            expression: {
              kind: 'ref',
              source: { kind: 'proficiency_bonus' },
            },
          },
        }),
      ]);
  });

  it('matches the Barbed Court player publication and its complete Wisdom third-caster grants', () => {
    const source = markdown('docs/homebrew/cc-by/warrior-of-the-barbed-court-player.md');
    const identity = publicationIdentity(source, '*Monk Subclass (Monastic Tradition)*');
    const features = new Map(publicationFeatureProse(source));
    features.set('Barbed Court Spellcasting', barbedSpellcastingProse(source));
    const barbed = catalogSubclass('warrior-of-the-barbed-court');
    const actual = Object.fromEntries(barbed.features.map((feature) => [feature.name, feature.description]));
    const entry = BUNDLED_HOMEBREW_CATALOG.find(
      (candidate) => candidate.catalog_key === 'warrior-of-the-barbed-court',
    );
    const handsAt = (revision: number): string | null => {
      const document = entry?.revisions[revision];
      return document?.kind === 'subclass'
        ? document.features.find(
            (feature) => feature.name === 'Hands of the Barbed Court',
          )?.description ?? null
        : null;
    };
    const progressionTable = markdownTable(
      source,
      '### Barbed Court Spellcasting',
      '## Level 3: Court Cantrips',
    );
    const courtSpellTable = markdownTable(
      source,
      '### Court Spells',
      '### Barbed Court Spellcasting',
    );
    const zeroes = [0, 0, 0, 0, 0, 0, 0, 0, 0] as const;
    const expectedSlots = [zeroes, zeroes, ...progressionTable.map((row) => [
      ...row.slice(2).map((cell) => cell === '—' ? 0 : Number(cell)),
      0, 0, 0, 0, 0,
    ])];
    const expectedChosen = [0, 0, ...progressionTable.map((row) => Number(row[1]))];

    expect(barbed.reference_text).toBe(identity);
    expect(actual).toEqual(Object.fromEntries(features));
    expect(entry?.revisions).toHaveLength(4);
    expect(handsAt(2)).not.toContain('grapple');
    expect(handsAt(3)).toContain(
      'you can grapple creatures up to two sizes larger than you',
    );
    expect(barbed.progression).toMatchObject({
      mode: 'override',
      spellcasting_ability: 'wisdom',
      caster_contribution: 'third_up',
    });
    if (barbed.progression.mode !== 'override') throw new Error('Dense progression required.');
    expect(barbed.progression.rows.map((row) => row.class_level)).toEqual(characterLevels);
    expect(barbed.progression.rows.map((row) => row.cantrips_known)).toEqual([
      0, 0, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
    ]);
    expect(barbed.progression.rows.map((row) => row.prepared_or_known_count))
      .toEqual(expectedChosen);
    expect(barbed.progression.rows.map((row) => row.slot_counts)).toEqual(expectedSlots);
    expect(barbed.progression.rows.flatMap((row) => row.grants.filter(
      (grant) => grant.kind === 'fixed_spell',
    ).map((grant) => [
      row.class_level,
      grant.rule_key,
      grant.kind === 'fixed_spell' ? grant.spell_content_key : null,
      grant.kind === 'fixed_spell' ? grant.always_prepared : null,
    ]))).toEqual([
      [3, 'barbed-court-shocking-grasp', '2024:shocking-grasp', true],
      [3, 'barbed-court-chill-touch', '2024:chill-touch', true],
      [3, 'barbed-court-ray-of-frost', '2024:ray-of-frost', true],
      [3, 'barbed-court-vicious-mockery', '2024:vicious-mockery', true],
      [3, 'barbed-court-mage-hand', '2024:mage-hand', true],
      [3, 'barbed-court-guidance', '2024:guidance', true],
      [3, 'barbed-court-shield', '2024:shield', true],
      [3, 'barbed-court-dissonant-whispers', '2024:dissonant-whispers', true],
      [6, 'barbed-court-mirror-image', '2024:mirror-image', true],
      [6, 'barbed-court-blur', '2024:blur', true],
      [6, 'barbed-court-hold-person', '2024:hold-person', true],
      [11, 'barbed-court-slow', '2024:slow', true],
      [11, 'barbed-court-fear', '2024:fear', true],
      [17, 'barbed-court-compulsion', '2024:compulsion', true],
    ]);
    expect(courtSpellTable.map(([level, spells]) => [
      Number(level),
      spells?.split(',').map((spell) => spell.trim()),
    ])).toEqual([
      [3, ['Shield', 'Dissonant Whispers']],
      [6, ['Mirror Image', 'Blur', 'Hold Person']],
      [11, ['Slow', 'Fear']],
      [17, ['Compulsion']],
    ]);
    expect(barbed.progression.rows.slice(2).map((row) => row.grants.filter(
      (grant) => grant.kind === 'choice_from_list',
    ).map((grant) => grant.kind === 'choice_from_list' ? {
      rule_key: grant.rule_key,
      list: grant.list,
      count: grant.count,
      bucket: grant.bucket ?? 'known',
      minimum_spell_level: grant.minimum_spell_level,
      maximum_spell_level: grant.maximum_spell_level,
    } : null))).toEqual(barbed.progression.rows.slice(2).map((row) => [{
      rule_key: 'barbed-court-cantrips',
      list: 'Bard',
      count: 2,
      bucket: 'known',
      minimum_spell_level: 0,
      maximum_spell_level: 0,
    }, {
      rule_key: 'barbed-court-prepared-spells',
      list: 'Bard',
      count: row.prepared_or_known_count,
      bucket: 'prepared',
      minimum_spell_level: 1,
      maximum_spell_level: row.maximum_spell_level,
    }]));
    expect(barbed.features.find((feature) => feature.name === 'Warding Image')?.effects)
      .toEqual([expect.objectContaining({ kind: 'armor_class_bonus', amount: 2 })]);
  });

  it('keeps every committed draft inside the shared code-point, list, and encoded-byte limits', () => {
    for (const entry of BUNDLED_HOMEBREW_CATALOG) {
      for (const document of entry.revisions) {
        const encoded = encodeCurrentDraft(document.kind, document);
        expect(new TextEncoder().encode(encoded.json).byteLength).toBeLessThanOrEqual(
          AUTHORING_DOCUMENT_LIMITS.encodedBytes,
        );
        expect([...document.name].length).toBeLessThanOrEqual(AUTHORING_TEXT_LIMITS.name);
        expect([...document.reference_text].length).toBeLessThanOrEqual(AUTHORING_TEXT_LIMITS.referenceText);
        if (document.kind === 'subclass') {
          expect(document.features.length).toBeLessThanOrEqual(AUTHORING_LIST_LIMITS.features);
          for (const feature of document.features) {
            expect([...feature.name].length).toBeLessThanOrEqual(AUTHORING_TEXT_LIMITS.shortLabel);
            expect([...feature.description].length).toBeLessThanOrEqual(AUTHORING_TEXT_LIMITS.description);
            expect(feature.effects.length).toBeLessThanOrEqual(AUTHORING_LIST_LIMITS.effectsPerOwner);
          }
        }
      }
    }
  });

  it('derives Spell Student slots from the SRD multiclass table and reproduces the reviewed ladder', () => {
    const expected = [
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [2, 0, 0, 0, 0, 0, 0, 0, 0],
      [2, 0, 0, 0, 0, 0, 0, 0, 0],
      [2, 0, 0, 0, 0, 0, 0, 0, 0],
      [3, 0, 0, 0, 0, 0, 0, 0, 0],
      [3, 0, 0, 0, 0, 0, 0, 0, 0],
      [3, 0, 0, 0, 0, 0, 0, 0, 0],
      [4, 2, 0, 0, 0, 0, 0, 0, 0],
      [4, 2, 0, 0, 0, 0, 0, 0, 0],
      [4, 2, 0, 0, 0, 0, 0, 0, 0],
      [4, 3, 0, 0, 0, 0, 0, 0, 0],
      [4, 3, 0, 0, 0, 0, 0, 0, 0],
      [4, 3, 0, 0, 0, 0, 0, 0, 0],
      [4, 3, 2, 0, 0, 0, 0, 0, 0],
      [4, 3, 2, 0, 0, 0, 0, 0, 0],
      [4, 3, 2, 0, 0, 0, 0, 0, 0],
      [4, 3, 3, 0, 0, 0, 0, 0, 0],
      [4, 3, 3, 0, 0, 0, 0, 0, 0],
      [4, 3, 3, 0, 0, 0, 0, 0, 0],
    ];
    const spellStudent = catalogSubclass('spell-student');
    if (spellStudent.progression.mode !== 'override') throw new Error('Dense progression required.');

    expect(characterLevels.map((level) => deriveThirdCasterSlotCounts(level))).toEqual(expected);
    expect(spellStudent.progression.rows.map((row) => row.slot_counts)).toEqual(expected);
    expect(spellStudent.progression.rows.map((row) => row.prepared_or_known_count)).toEqual([
      0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5,
    ]);
    expect(spellStudent.progression.rows.slice(2).map((row) => row.grants.map((grant) => ({
      rule_key: grant.rule_key,
      minimum_spell_level: grant.kind === 'choice_from_list'
        ? grant.minimum_spell_level
        : null,
      maximum_spell_level: grant.kind === 'choice_from_list'
        ? grant.maximum_spell_level
        : null,
    })))).toEqual(spellStudent.progression.rows.slice(2).map((row) => [
      {
        rule_key: 'spell-student-cantrips',
        minimum_spell_level: 0,
        maximum_spell_level: 0,
      },
      {
        rule_key: 'spell-student-spells',
        minimum_spell_level: 1,
        maximum_spell_level: row.maximum_spell_level,
      },
    ]));
  });
});
