import { describe, expect, it } from 'vitest';
import {
  classifyDuplicateWarnings,
  DuplicateWarningDetector,
  type DuplicateWarningRoute,
} from '../../../src/duplicates/duplicate-warning-detector';
import type { RulesEdition } from '../../../src/domain/enums';
import type { SpellIdentityId, SpellVersionId } from '../../../src/domain/ids';

function route(
  identity: number,
  version: number,
  identityName: string,
  spellName: string,
  contentKey: string,
  edition: RulesEdition,
  source: string,
  slot: string | null,
  counts = true,
  selection = true,
): DuplicateWarningRoute {
  return {
    spell_identity_id: identity as SpellIdentityId,
    spell_version_id: version as SpellVersionId,
    identity_name: identityName,
    spell_name: spellName,
    spell_content_key: contentKey,
    rules_edition: edition,
    source_name: source,
    selection_key: slot,
    counts_against_limit: counts,
    is_selection: selection,
  };
}

describe('duplicate warning detector', () => {
  it('returns the complete sorted assessment contract for every severity', () => {
    const assessments = new DuplicateWarningDetector().classify([
      route(
        4,
        104,
        'Unique',
        'Unique',
        '2024:unique',
        '2024',
        'Ritual Adept',
        null,
        false,
        false,
      ),
      route(
        1,
        101,
        'Wasteful',
        'Wasteful',
        '2024:wasteful',
        '2024',
        'Wizard',
        'wizard:1',
      ),
      route(
        3,
        203,
        'Conflict',
        'Conflict',
        '2024:conflict',
        '2024',
        'Current',
        'current:1',
      ),
      route(
        2,
        102,
        'Intentional',
        'Intentional',
        '2024:intentional',
        '2024',
        'Class',
        'class:1',
      ),
      route(
        4,
        104,
        'Unique',
        'Unique',
        '2024:unique',
        '2024',
        'Wizard',
        'unique:1',
      ),
      route(
        1,
        101,
        'Wasteful',
        'Wasteful',
        '2024:wasteful',
        '2024',
        'Feat',
        'feat:1',
      ),
      route(
        3,
        103,
        'Conflict',
        'Conflict Legacy',
        '2014:conflict',
        '2014',
        'Legacy',
        'legacy:1',
      ),
      route(
        2,
        102,
        'Intentional',
        'Intentional',
        '2024:intentional',
        '2024',
        'Class',
        'automatic:1',
        false,
      ),
    ]);

    expect(assessments).toStrictEqual([
      {
        spell_identity_id: 3,
        spell_name: 'Conflict',
        category: 'conflicting_version',
        selection_count: 2,
        sources: ['Current', 'Legacy'],
        slots: ['current:1', 'legacy:1'],
        versions: [
          {
            spell_version_id: 103,
            content_key: '2014:conflict',
            edition: '2014',
            label: 'Conflict Legacy (2014)',
          },
          {
            spell_version_id: 203,
            content_key: '2024:conflict',
            edition: '2024',
            label: 'Conflict (2024)',
          },
        ],
        warning_fingerprint:
          'conflicting_versions:bb212b4bcbe6696bf60a50897cd59a90e89cbaad0b910d605aff6101af43bed5',
        explanation:
          'Conflict has conflicting versions selected: Conflict Legacy (2014) and Conflict (2024).',
      },
      {
        spell_identity_id: 2,
        spell_name: 'Intentional',
        category: 'redundant_intentional',
        selection_count: 2,
        sources: ['Class'],
        slots: ['class:1', 'automatic:1'],
        versions: [
          {
            spell_version_id: 102,
            content_key: '2024:intentional',
            edition: '2024',
            label: 'Intentional (2024)',
          },
        ],
        warning_fingerprint: null,
        explanation:
          'Intentional has overlapping access, but fewer than two routes consume limits.',
      },
      {
        spell_identity_id: 4,
        spell_name: 'Unique',
        category: 'none',
        selection_count: 1,
        sources: ['Ritual Adept', 'Wizard'],
        slots: ['unique:1'],
        versions: [
          {
            spell_version_id: 104,
            content_key: '2024:unique',
            edition: '2024',
            label: 'Unique (2024)',
          },
        ],
        warning_fingerprint: null,
        explanation: 'Unique has no duplicate selection.',
      },
      {
        spell_identity_id: 1,
        spell_name: 'Wasteful',
        category: 'wasteful',
        selection_count: 2,
        sources: ['Wizard', 'Feat'],
        slots: ['wizard:1', 'feat:1'],
        versions: [
          {
            spell_version_id: 101,
            content_key: '2024:wasteful',
            edition: '2024',
            label: 'Wasteful (2024)',
          },
        ],
        warning_fingerprint: null,
        explanation:
          'Wasteful consumes limits in more than one selection.',
      },
    ]);
  });

  it('keeps same-name routes separate when their identity IDs differ', () => {
    const assessments = classifyDuplicateWarnings([
      route(
        20,
        220,
        'Shared Name',
        'Shared Name',
        '2024:shared-b',
        '2024',
        'Wizard',
        'wizard:1',
      ),
      route(
        10,
        110,
        'Shared Name',
        'Shared Name',
        '2024:shared-a',
        '2024',
        'Cleric',
        'cleric:1',
      ),
    ]);

    expect(assessments).toHaveLength(2);
    expect(assessments.map((assessment) => ({
      identity: assessment.spell_identity_id,
      category: assessment.category,
      selections: assessment.selection_count,
    }))).toStrictEqual([
      { identity: 20, category: 'none', selections: 1 },
      { identity: 10, category: 'none', selections: 1 },
    ]);
  });

  it('compacts sources while retaining all non-empty selection slots', () => {
    const assessment = classifyDuplicateWarnings([
      route(
        1,
        101,
        'Duplicate source',
        'Duplicate source',
        '2024:duplicate-source',
        '2024',
        'Wizard',
        'wizard',
      ),
      route(
        1,
        101,
        'Duplicate source',
        'Duplicate source',
        '2024:duplicate-source',
        '2024',
        'Wizard',
        '',
      ),
      route(
        1,
        101,
        'Duplicate source',
        'Duplicate source',
        '2024:duplicate-source',
        '2024',
        'Feat',
        'feat',
      ),
    ])[0];

    expect(assessment?.sources).toStrictEqual(['Wizard', 'Feat']);
    expect(assessment?.slots).toStrictEqual(['wizard', 'feat']);
    expect(assessment?.selection_count).toBe(3);
  });

  it('makes cross-version fingerprints independent of route order', () => {
    const current = route(
      3,
      203,
      'Conflict',
      'Conflict',
      '2024:conflict',
      '2024',
      'Current',
      'current:1',
    );
    const legacy = route(
      3,
      103,
      'Conflict',
      'Conflict Legacy',
      '2014:conflict',
      '2014',
      'Legacy',
      'legacy:1',
    );

    const currentFirst = classifyDuplicateWarnings([current, legacy])[0];
    const legacyFirst = classifyDuplicateWarnings([legacy, current])[0];

    expect(currentFirst?.versions.map((version) => version.edition))
      .toStrictEqual(['2014', '2024']);
    expect(currentFirst?.warning_fingerprint).toBe(
      legacyFirst?.warning_fingerprint,
    );
    expect(currentFirst?.warning_fingerprint).toMatch(
      /^conflicting_versions:[a-f0-9]{64}$/,
    );
  });

});
