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
    .split(/\n{2,}/u)
    .map((paragraph) => paragraph.replaceAll(/\s*\n\s*/g, ' '))
    .join('\n\n')
    .trim();
}

function featureProse(
  source: string,
  sectionHeading: string,
  nextHeading: string,
): ReadonlyMap<string, string> {
  const body = section(source, sectionHeading, nextHeading);
  const found = new Map<string, string>();
  const matches = [...body.matchAll(/^### Level \d+: (?<name>.+)$/gmu)];
  for (const [index, match] of matches.entries()) {
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = matches[index + 1]?.index ?? body.length;
    const prose = body.slice(contentStart, contentEnd).trim()
      .split('\n\n')
      .filter((paragraph) => !/^(?:OWNER-APPROVAL|FROZEN BAKE-OFF ENGINE):/u.test(paragraph))
      .join('\n\n');
    found.set(match.groups!.name!, plain(prose));
  }
  return found;
}

function catalogSubclass(key: string): SubclassAuthoringDraft {
  const entry = BUNDLED_HOMEBREW_CATALOG.find((candidate) => candidate.catalog_key === key);
  const document = entry?.revisions.at(-1);
  if (document?.kind !== 'subclass') throw new Error(`Missing catalog subclass ${key}.`);
  return document;
}

describe('bundled homebrew catalog payload', () => {
  it('matches Veteran identity and feature prose independently from the authoritative markdown', () => {
    const source = markdown('docs/homebrew/cc-by/2026-08-04-rogue-veteran-subclass.md');
    const identity = section(source, "Owner's text, verbatim:", '## 2. Schedule');
    const features = featureProse(source, '## 3. Subclass Features (owner rules text, verbatim)', '## 4. Wording Notes');
    const veteran = catalogSubclass('veteran');

    expect(veteran.reference_text).toBe(plain(identity));
    expect(Object.fromEntries(veteran.features.map((feature) => [feature.name, feature.description])))
      .toEqual(Object.fromEntries(features));
  });

  it('matches Barbed Court prose and publishes its complete Wisdom third-caster grants', () => {
    const source = markdown('docs/homebrew/cc-by/2026-08-03-monk-barbed-court.md');
    const identity = section(source, 'OWNER-APPROVAL: Identity paragraph and ancestry disclosure.', '## 2. Level 3: Barbed Court Spellcasting');
    const features = featureProse(source, '## 3. Subclass Features', '## 4. Power-Budget Worksheet');
    const spellcasting = ['Cantrips', 'Prepared Spells', 'Spell Slots', 'Spellcasting Ability']
      .map((label) => {
        const match = new RegExp(
          `\\*\\*${label}\\.\\*\\* (?<prose>.*?)(?:\\n\\n|$)`,
          'su',
        ).exec(source);
        if (match?.groups?.prose === undefined) throw new Error(`Missing ${label} prose.`);
        return plain(match.groups.prose);
      }).join('\n\n');
    const barbed = catalogSubclass('warrior-of-the-barbed-court');
    const actual = Object.fromEntries(barbed.features.map((feature) => [feature.name, feature.description]));

    expect(barbed.reference_text).toBe(plain(identity));
    expect(actual).toEqual({
      'Barbed Court Spellcasting': spellcasting,
      ...Object.fromEntries(features),
    });
    expect(barbed.progression).toMatchObject({
      mode: 'override',
      spellcasting_ability: 'wisdom',
      caster_contribution: 'third_down',
    });
    if (barbed.progression.mode !== 'override') throw new Error('Dense progression required.');
    expect(barbed.progression.rows.map((row) => row.class_level)).toEqual(characterLevels);
    expect(barbed.progression.rows.map((row) => row.cantrips_known)).toEqual([
      0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
    ]);
    expect(barbed.progression.rows.flatMap((row) => row.grants.map((grant) => [
      row.class_level,
      grant.rule_key,
      grant.kind === 'fixed_spell' ? grant.spell_content_key : null,
      grant.kind === 'fixed_spell' ? grant.always_prepared : null,
    ]))).toEqual([
      [3, 'barbed-court-vicious-mockery', '2024:vicious-mockery', true],
      [3, 'barbed-court-prestidigitation', '2024:prestidigitation', true],
      [3, 'barbed-court-bane', '2024:bane', true],
      [3, 'barbed-court-command', '2024:command', true],
      [3, 'barbed-court-dissonant-whispers', '2024:dissonant-whispers', true],
      [3, 'barbed-court-hideous-laughter', '2024:hideous-laughter', true],
      [7, 'barbed-court-enthrall', '2024:enthrall', true],
      [7, 'barbed-court-suggestion', '2024:suggestion', true],
      [10, 'barbed-court-message', '2024:message', true],
      [13, 'barbed-court-hypnotic-pattern', '2024:hypnotic-pattern', true],
      [13, 'barbed-court-tongues', '2024:tongues', true],
      [19, 'barbed-court-compulsion', '2024:compulsion', true],
      [19, 'barbed-court-confusion', '2024:confusion', true],
    ]);
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
  });
});
