import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type {
  CharacterId,
  CharacterRevision,
  CharacterWeaponId,
  ContentKey,
} from '../../../src/domain/ids';
import {
  BUNDLED_SRD_5_2_1_PATH,
  PROJECT_OWNED_SOURCE_LICENSE_BY_PATH,
  characterAttackRoutineId,
  createResourceRecoverySession,
  encounterResourceCap,
  expectedCycleDamage,
  expectedEncounterDamage,
  expectedEventDamage,
  expectedRoundDamage,
  positiveResourceMaximum,
  positiveResourceRecoveryAmount,
  probability,
  projectOwnedSourceLicense,
  projectOwnedSourcePath,
  restCadence,
  simResourceId,
  simResourcePoolKey,
  simResourcePoolSet,
  sourceStableKey,
  type DprRequestContext,
  type DprSimulationOptions,
  type SimResourcePool,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  bundledSrdSourceRef,
  compactIssueMessages,
  createUnmodelledIssue,
  highRecallDamageSaveSuspects,
  orderUnmodelledIssues,
  probabilityManifestIsComplete,
  publicProbabilityCoverageManifest,
  publicProbabilityMechanicKinds,
  resourceRecoveryEvidence,
  reviewedResourceRecoveryClauses,
  reviewedSaveSuccessClauses,
  saveSuccessOutcomeEvidenceManifest,
  sourceDerivedSaveDamageCandidateCounts,
  sourceDerivedSaveDamageCandidates,
  unreconciledHighRecallDamageSaveSuspects,
  sheetGapCoverage,
  sheetWarningCoverage,
  unmodelledIssuePriority,
} from '../../../src/simulation/coverage';
import {
  headlineDprSettings,
  resolveHeadlineScenario,
} from '../../../src/simulation/headline';
import {
  DprRequestParseError,
  parseDprSimulationRequest,
} from '../../../src/simulation/request';
import {
  parseDprRouteContext,
  serializeDprRouteContext,
} from '../../../src/simulation/route';
import { SHEET_GAPS } from '../../../src/queries/character-sheet-builder';
import { unmodelledIssueKinds } from '../../../src/simulation/contracts';

function validRequestInput(): Record<string, unknown> {
  return {
    character_id: 7,
    expected_revision: 4,
    routine: 'weapon:11:strength',
    settings: {
      rounds: 3,
      resources: {
        kind: 'budget_over_rest_cycle',
        cadence: {
          encounters_per_rest_block: 1,
          short_rests_before_long_rest: 1,
        },
      },
      roll_state: 'normal',
      target: {
        armor_class: 15,
        save_bonuses: [{ ability: 'dexterity', bonus: 2 }],
        damage_responses: [
          { damage_type: 'Slashing', response: 'normal' },
          { damage_type: 'Chronal', response: 'resistant' },
        ],
      },
    },
  };
}

function cloneInput(): Record<string, unknown> {
  return structuredClone(validRequestInput());
}

describe('DPR branded constructors', () => {
  it('enforces every specified boundary and the joint rest invariant', () => {
    expect(() => restCadence({
      encounters_per_rest_block: 4,
      short_rests_before_long_rest: 2,
    })).not.toThrow();
    expect(() => restCadence({
      encounters_per_rest_block: 5,
      short_rests_before_long_rest: 2,
    })).toThrow('cannot contain more than 12');
    expect(() => probability(-0.001)).toThrow();
    expect(() => probability(1.001)).toThrow();
    expect(probability(0)).toBe(0);
    expect(probability(1)).toBe(1);

    const maximum = positiveResourceMaximum(3);
    expect(encounterResourceCap(0, maximum)).toBe(0);
    expect(encounterResourceCap(3, maximum)).toBe(3);
    expect(() => encounterResourceCap(4, maximum)).toThrow();
  });

  it('represents Rage one-use Short Rest and all-use Long Rest recovery', () => {
    const maximum = positiveResourceMaximum(2);
    const rageSource = reviewedResourceRecoveryClauses.rage.resource_source;
    const rage: SimResourcePool = {
      id: simResourceId('barbarian:rage'),
      logical_key: simResourcePoolKey('barbarian:rage'),
      source: rageSource,
      maximum,
      recovery: {
        short_rest: {
          kind: 'fixed',
          amount: positiveResourceRecoveryAmount(1, maximum),
          evidence: resourceRecoveryEvidence(
            rageSource,
            reviewedResourceRecoveryClauses.rage.id,
            {
              rest: 'short_rest',
              rule_kind: 'fixed',
              amount: 1,
              maximum,
            },
          ),
        },
        // Bundled SRD 5.2.1 lines 1767-1770: one use on a Short Rest, all on a Long Rest.
        long_rest: {
          kind: 'all',
          evidence: resourceRecoveryEvidence(
            rageSource,
            reviewedResourceRecoveryClauses.rage.id,
            {
              rest: 'long_rest',
              rule_kind: 'all',
              amount: null,
              maximum,
            },
          ),
        },
      },
    };
    const session = createResourceRecoverySession(simResourcePoolSet([rage]));
    expect(session.recover(rage.id, 'short_rest', 2).recovered_units).toBe(1);
    expect(session.recover(rage.id, 'long_rest', 2)).toEqual({
      recovered_units: 2,
    });
    expect(session.recover(rage.id, 'short_rest', 0).recovered_units).toBe(0);
    expect(() => positiveResourceRecoveryAmount(3, maximum)).toThrow(
      'Resource recovery amount must be an integer from 1 to 2',
    );
  });

  it('binds Channel Divinity recovery evidence to the Cleric pool source', () => {
    const maximum = positiveResourceMaximum(3);
    const clericSource =
      reviewedResourceRecoveryClauses.channel_divinity.resource_source;
    const evidence = resourceRecoveryEvidence(
      clericSource,
      reviewedResourceRecoveryClauses.channel_divinity.id,
      {
        rest: 'short_rest',
        rule_kind: 'fixed',
        amount: 1,
        maximum,
      },
    );
    expect(evidence.citation).toEqual(
      bundledSrdSourceRef('Level 2: Channel Divinity'),
    );
    const channelDivinity: SimResourcePool = {
      id: simResourceId('cleric:channel-divinity'),
      logical_key: simResourcePoolKey('cleric:channel-divinity'),
      source: clericSource,
      maximum,
      recovery: {
        short_rest: {
          kind: 'fixed',
          amount: positiveResourceRecoveryAmount(1, maximum),
          evidence,
        },
        long_rest: {
          kind: 'all',
          evidence: resourceRecoveryEvidence(
            clericSource,
            reviewedResourceRecoveryClauses.channel_divinity.id,
            {
              rest: 'long_rest',
              rule_kind: 'all',
              amount: null,
              maximum,
            },
          ),
        },
      },
    };
    expect(createResourceRecoverySession(
      simResourcePoolSet([channelDivinity]),
    ).recover(channelDivinity.id, 'short_rest', 2).recovered_units).toBe(1);
    expect(() => resourceRecoveryEvidence(
      clericSource,
      reviewedResourceRecoveryClauses.rage.id,
      {
        rest: 'short_rest',
        rule_kind: 'fixed',
        amount: 1,
        maximum,
      },
    )).toThrow('does not establish recovery for this resource source');
    const rageSource = reviewedResourceRecoveryClauses.rage.resource_source;
    const borrowedRageEvidence: SimResourcePool = {
      ...channelDivinity,
      recovery: {
        short_rest: {
          kind: 'fixed',
          amount: positiveResourceRecoveryAmount(1, maximum),
          evidence: resourceRecoveryEvidence(
            rageSource,
            reviewedResourceRecoveryClauses.rage.id,
            {
              rest: 'short_rest',
              rule_kind: 'fixed',
              amount: 1,
              maximum,
            },
          ),
        },
        long_rest: { kind: 'none' },
      },
    };
    expect(() => createResourceRecoverySession(
      simResourcePoolSet([borrowedRageEvidence]),
    ).recover(borrowedRageEvidence.id, 'short_rest', 2)).toThrow(
      'not bound to this pool, rest, and recovery rule',
    );
  });

  it('keeps same-source logical pools accepted and independently recoverable', () => {
    const maximum = positiveResourceMaximum(10);
    const sorcerySource =
      reviewedResourceRecoveryClauses.sorcerous_restoration.resource_source;
    const sorceryPoints: SimResourcePool = {
      id: simResourceId('sorcerer:sorcery-points'),
      logical_key: simResourcePoolKey('sorcerer:sorcery-points'),
      source: sorcerySource,
      maximum,
      recovery: {
        short_rest: {
          kind: 'fixed_once_per_long_rest',
          amount: positiveResourceRecoveryAmount(5, maximum),
          evidence: resourceRecoveryEvidence(
            sorcerySource,
            reviewedResourceRecoveryClauses.sorcerous_restoration.id,
            {
              rest: 'short_rest',
              rule_kind: 'fixed_once_per_long_rest',
              amount: 5,
              maximum,
            },
          ),
        },
        long_rest: {
          kind: 'all',
          evidence: resourceRecoveryEvidence(
            sorcerySource,
            reviewedResourceRecoveryClauses.font_of_magic.id,
            {
              rest: 'long_rest',
              rule_kind: 'all',
              amount: null,
              maximum,
            },
          ),
        },
      },
    };
    const session = createResourceRecoverySession(
      simResourcePoolSet([sorceryPoints]),
    );
    const first = session.recover(sorceryPoints.id, 'short_rest', 10);
    const second = session.recover(sorceryPoints.id, 'short_rest', 5);
    const third = session.recover(sorceryPoints.id, 'short_rest', 5);
    expect(first.recovered_units).toBe(5);
    expect(second.recovered_units).toBe(0);
    expect(third.recovered_units).toBe(0);
    expect(
      first.recovered_units + second.recovered_units + third.recovered_units,
    ).toBe(5);
    expect(session.recover(sorceryPoints.id, 'long_rest', 5)).toEqual({
      recovered_units: 5,
    });
    expect(session.recover(sorceryPoints.id, 'short_rest', 10).recovered_units)
      .toBe(5);

    const independentRun = createResourceRecoverySession(
      simResourcePoolSet([sorceryPoints]),
    );
    expect(independentRun.recover(
      sorceryPoints.id,
      'short_rest',
      10,
    ).recovered_units).toBe(5);

    expect(() => resourceRecoveryEvidence(
      sorcerySource,
      reviewedResourceRecoveryClauses.sorcerous_restoration.id,
      {
        rest: 'short_rest',
        rule_kind: 'fixed',
        amount: 5,
        maximum,
      },
    )).toThrow('does not authorize this rest, rule kind, and amount');
    expect(() => resourceRecoveryEvidence(
      sorcerySource,
      reviewedResourceRecoveryClauses.sorcerous_restoration.id,
      {
        rest: 'short_rest',
        rule_kind: 'fixed_once_per_long_rest',
        amount: 4,
        maximum,
      },
    )).toThrow('does not authorize this rest, rule kind, and amount');

    const forgedWeapon: SourceRef = {
      kind: 'character_weapon',
      weapon_id: 77 as CharacterWeaponId,
      stable_key: sorcerySource.stable_key,
    };
    expect(() => resourceRecoveryEvidence(
      forgedWeapon,
      reviewedResourceRecoveryClauses.sorcerous_restoration.id,
      {
        rest: 'short_rest',
        rule_kind: 'fixed_once_per_long_rest',
        amount: 5,
        maximum,
      },
    )).toThrow('does not establish recovery for this resource source');

    expect(() => simResourcePoolSet([
      sorceryPoints,
      { ...sorceryPoints, id: simResourceId('duplicate:sorcery-points') },
    ])).toThrow('aliasing is unsupported');

    const distinctSorceryPoints: SimResourcePool = {
      ...sorceryPoints,
      id: simResourceId('distinct:sorcery-points'),
      logical_key: simResourcePoolKey('distinct:sorcery-points'),
    };
    const distinctSession = createResourceRecoverySession(
      simResourcePoolSet([sorceryPoints, distinctSorceryPoints]),
    );
    expect([
      distinctSession.recover(sorceryPoints.id, 'short_rest', 10).recovered_units,
      distinctSession.recover(distinctSorceryPoints.id, 'short_rest', 10)
        .recovered_units,
    ]).toEqual([5, 5]);

    const secondMaximum = positiveResourceMaximum(6);
    const secondPool: SimResourcePool = {
      id: simResourceId('sorcerer:second-pool'),
      logical_key: simResourcePoolKey('sorcerer:second-pool'),
      source: sorcerySource,
      maximum: secondMaximum,
      recovery: {
        short_rest: {
          kind: 'fixed_once_per_long_rest',
          amount: positiveResourceRecoveryAmount(3, secondMaximum),
          evidence: resourceRecoveryEvidence(
            sorcerySource,
            reviewedResourceRecoveryClauses.sorcerous_restoration.id,
            {
              rest: 'short_rest',
              rule_kind: 'fixed_once_per_long_rest',
              amount: 3,
              maximum: secondMaximum,
            },
          ),
        },
        long_rest: { kind: 'none' },
      },
    };
    expect(() => simResourcePoolSet([
      sorceryPoints,
      {
        ...secondPool,
        logical_key: sorceryPoints.logical_key,
      },
    ])).toThrow('aliasing is unsupported');
    const sameSourceSession = createResourceRecoverySession(
      simResourcePoolSet([sorceryPoints, secondPool]),
    );
    expect(sameSourceSession.recover(
      sorceryPoints.id,
      'short_rest',
      10,
    ).recovered_units).toBe(5);
    expect(sameSourceSession.recover(
      secondPool.id,
      'short_rest',
      6,
    ).recovered_units).toBe(3);
    expect(sameSourceSession.recover(
      sorceryPoints.id,
      'short_rest',
      5,
    ).recovered_units).toBe(0);
    expect(sameSourceSession.recover(
      secondPool.id,
      'short_rest',
      3,
    ).recovered_units).toBe(0);
  });

  it('accepts only registered repository-relative project-owned sources', () => {
    const sourcePath = projectOwnedSourcePath('src/simulation/contracts.ts');
    expect(projectOwnedSourceLicense(sourcePath)).toBe('MIT');
    expect(
      PROJECT_OWNED_SOURCE_LICENSE_BY_PATH['src/simulation/contracts.ts'],
    ).toBe('MIT');

    for (const invalid of [
      '../private-engine/rules.ts',
      'src/../private-engine/rules.ts',
      '/tmp/source.txt',
      'C:\\tmp\\source.txt',
      'src/private-engine/rules.ts',
    ]) {
      expect(() => projectOwnedSourcePath(invalid)).toThrow();
    }
  });

  it('keeps damage aggregation levels as distinct constructors', () => {
    expect(expectedEventDamage(2.5)).toBe(2.5);
    expect(expectedRoundDamage(2.5)).toBe(2.5);
    expect(expectedEncounterDamage(2.5)).toBe(2.5);
    expect(expectedCycleDamage(2.5)).toBe(2.5);
    for (const constructor of [
      expectedEventDamage,
      expectedRoundDamage,
      expectedEncounterDamage,
      expectedCycleDamage,
    ]) {
      expect(() => constructor(Number.NaN)).toThrow();
      expect(() => constructor(-1)).toThrow();
    }
  });
});

describe('DPR request parsing', () => {
  it('parses exact input and preserves a homebrew damage type byte for byte', () => {
    const parsed = parseDprSimulationRequest(validRequestInput());
    expect(parsed.character_id).toBe(7);
    expect(parsed.expected_revision).toBe(4);
    expect(parsed.settings.target.damage_responses[1]?.damage_type).toBe(
      'Chronal',
    );
  });

  it('permits an empty target damage-response array as an explicit unknown', () => {
    const input = cloneInput();
    const target = (input.settings as Record<string, unknown>)
      .target as Record<string, unknown>;
    target.damage_responses = [];
    expect(
      parseDprSimulationRequest(input).settings.target.damage_responses,
    ).toEqual([]);
  });

  it('rejects unknown fields at every envelope level', () => {
    const root = cloneInput();
    root.unexpected = true;
    expect(() => parseDprSimulationRequest(root)).toThrow(DprRequestParseError);

    const nested = cloneInput();
    const settings = nested.settings as Record<string, unknown>;
    settings.unexpected = true;
    expect(() => parseDprSimulationRequest(nested)).toThrow('Unrecognized key');

    const targetInput = cloneInput();
    const target = (targetInput.settings as Record<string, unknown>)
      .target as Record<string, unknown>;
    target.character_armor_class = 20;
    expect(() => parseDprSimulationRequest(targetInput)).toThrow('Unrecognized key');
  });

  it('rejects bounds, discriminator conflicts, duplicate keys, and incoherent cadence', () => {
    const invalidCases: Record<string, unknown>[] = [];

    const zeroRounds = cloneInput();
    (zeroRounds.settings as Record<string, unknown>).rounds = 0;
    invalidCases.push(zeroRounds);

    const highAc = cloneInput();
    ((highAc.settings as Record<string, unknown>).target as Record<string, unknown>)
      .armor_class = 51;
    invalidCases.push(highAc);

    const unknownPolicy = cloneInput();
    (unknownPolicy.settings as Record<string, unknown>).resources = {
      kind: 'evenly_enough',
    };
    invalidCases.push(unknownPolicy);

    const cadence = cloneInput();
    ((cadence.settings as Record<string, unknown>).resources as Record<string, unknown>)
      .cadence = {
      encounters_per_rest_block: 5,
      short_rests_before_long_rest: 2,
    };
    invalidCases.push(cadence);

    const duplicateSave = cloneInput();
    ((duplicateSave.settings as Record<string, unknown>).target as Record<string, unknown>)
      .save_bonuses = [
      { ability: 'wisdom', bonus: 1 },
      { ability: 'wisdom', bonus: 9 },
    ];
    invalidCases.push(duplicateSave);

    const duplicateDamage = cloneInput();
    ((duplicateDamage.settings as Record<string, unknown>).target as Record<string, unknown>)
      .damage_responses = [
      { damage_type: 'Fire', response: 'normal' },
      { damage_type: 'Fire', response: 'immune' },
    ];
    invalidCases.push(duplicateDamage);

    for (const candidate of invalidCases) {
      expect(() => parseDprSimulationRequest(candidate)).toThrow(
        DprRequestParseError,
      );
    }
  });
});

describe('DPR route contract', () => {
  it('round-trips complete requests and headline drafts through the same parser', () => {
    const request = parseDprSimulationRequest(validRequestInput());
    const contexts: readonly DprRequestContext[] = [
      { kind: 'request', value: request },
      {
        kind: 'headline_draft',
        value: {
          routine: null,
          settings: headlineDprSettings([damageType('Chronal')]),
        },
      },
    ];
    for (const context of contexts) {
      const serialized = serializeDprRouteContext(context);
      expect(parseDprRouteContext(serialized)).toEqual(context);
      expect(parseDprRouteContext(`?${serialized}`)).toEqual(context);
    }
  });

  it('rejects duplicates, unrelated parameters, malformed JSON, and unknown versions', () => {
    const request = parseDprSimulationRequest(validRequestInput());
    const serialized = serializeDprRouteContext({ kind: 'request', value: request });
    expect(() => parseDprRouteContext(`${serialized}&dpr={}`)).toThrow();
    expect(() => parseDprRouteContext(`${serialized}&other=1`)).toThrow();
    expect(() => parseDprRouteContext('dpr=%7B')).toThrow('valid JSON');
    expect(() =>
      parseDprRouteContext(
        `dpr=${encodeURIComponent(JSON.stringify({ version: 2, context: {} }))}`,
      ),
    ).toThrow('Unsupported');
  });
});

describe('headline scenario resolution', () => {
  const character_id = 7 as CharacterId;
  const character_revision = 4 as CharacterRevision;

  function supported(
    id: string,
    saves: readonly ('strength' | 'dexterity')[] = [],
  ): DprSimulationOptions['routines'][number] {
    return {
      status: 'supported',
      id: characterAttackRoutineId(id),
      label: id,
      required_target_saves: saves,
      damage_types: [damageType('Slashing')],
    };
  }

  it('selects exactly one routine, with all headline defaults visible in the request', () => {
    const resolution = resolveHeadlineScenario({
      character_id,
      character_revision,
      routines: [supported('only')],
    });
    expect(resolution.status).toBe('ready');
    if (resolution.status !== 'ready') {
      throw new Error('Expected a ready headline.');
    }
    expect(resolution.request.settings).toEqual(headlineDprSettings(['Slashing']));
  });

  it('refuses routine ambiguity and never lets array order choose a weapon', () => {
    for (const routines of [
      [supported('a'), supported('b')],
      [supported('b'), supported('a')],
    ]) {
      const resolution = resolveHeadlineScenario({
        character_id,
        character_revision,
        routines,
      });
      expect(resolution.status).toBe('unavailable');
      if (resolution.status === 'unavailable') {
        expect(resolution.draft.routine).toBeNull();
        expect(resolution.issues[0].kind).toBe('routine_selection_required');
      }
    }
  });

  it('selects the sole routine that satisfies headline inputs', () => {
    const resolution = resolveHeadlineScenario({
      character_id,
      character_revision,
      routines: [supported('save', ['dexterity']), supported('weapon')],
    });
    expect(resolution.status).toBe('ready');
    if (resolution.status === 'ready') {
      expect(resolution.request.routine).toBe(characterAttackRoutineId('weapon'));
    }
  });

  it('retains a sole save routine but refuses the unsupplied save instead of defaulting it', () => {
    const resolution = resolveHeadlineScenario({
      character_id,
      character_revision,
      routines: [supported('save', ['dexterity'])],
    });
    expect(resolution.status).toBe('unavailable');
    if (resolution.status === 'unavailable') {
      expect(resolution.draft.routine).toBe(characterAttackRoutineId('save'));
      expect(resolution.draft.settings.target.save_bonuses).toEqual([]);
      expect(resolution.issues.map((issue) => issue.kind)).toEqual([
        'target_save_bonus_required',
      ]);
    }
  });

  it('surfaces existing coverage issues when no routine is supported', () => {
    const issue = createUnmodelledIssue({
      kind: 'weapon_damage_not_recorded',
      source: null,
      discriminator: 'weapon-1',
      detail: 'Damage missing.',
      why_it_changes_damage: 'There is no damage amount.',
      remedy: 'Record it.',
    });
    const resolution = resolveHeadlineScenario({
      character_id,
      character_revision,
      routines: [{
        status: 'unavailable',
        id: characterAttackRoutineId('weapon-1'),
        label: 'Weapon 1',
        issues: [issue],
      }],
    });
    expect(resolution.status).toBe('unavailable');
    if (resolution.status === 'unavailable') {
      expect(resolution.issues).toEqual([issue]);
    }
  });
});

describe('coverage vocabularies and bundled provenance', () => {
  it('classifies every live sheet gap without consulting its prose', () => {
    expect(Object.keys(sheetGapCoverage).sort()).toEqual([
      'expertise_choice_unfilled',
      'expertise_proficiency_removed',
      'gear_not_itemised',
      'languages_and_tools_not_modelled',
      'no_class_feature_text',
      'partial_subclass_catalog',
      'required_source_choice',
      'weapon_reach_not_recorded',
    ]);
    for (const gap of SHEET_GAPS) {
      expect(sheetGapCoverage).toHaveProperty(gap.kind);
    }
    expect(Object.keys(sheetWarningCoverage)).toHaveLength(14);
  });

  it('has one priority and compact message for every closed issue kind', () => {
    expect(Object.keys(unmodelledIssuePriority).sort()).toEqual(
      [...unmodelledIssueKinds].sort(),
    );
    expect(Object.keys(compactIssueMessages).sort()).toEqual(
      [...unmodelledIssueKinds].sort(),
    );
  });

  it('cites an existing bundled heading for every Stage 2B mechanic', () => {
    expect(probabilityManifestIsComplete()).toBe(true);
    expect(Object.keys(publicProbabilityCoverageManifest).sort()).toEqual(
      [...publicProbabilityMechanicKinds].sort(),
    );
    const bundled = readFileSync(BUNDLED_SRD_5_2_1_PATH, 'utf8');
    for (const [mechanic, source] of Object.entries(
      publicProbabilityCoverageManifest,
    )) {
      expect(source.kind, mechanic).toBe('bundled_srd');
      if (source.kind !== 'bundled_srd') {
        throw new Error(`${mechanic} must cite bundled SRD content.`);
      }
      expect(source.path, mechanic).toBe(BUNDLED_SRD_5_2_1_PATH);
      expect(
        bundled.split(/\r?\n/u).some((line) =>
          line.split(/\s{2,}/u).some(
            (segment) => segment.trim() === source.heading,
          )),
        `${mechanic}: ${source.heading}`,
      ).toBe(true);
    }
    for (const [effect, clause] of saveSuccessOutcomeEvidenceManifest) {
      expect(clause.evidence.kind, effect).toBe('bundled_srd');
      expect(clause.evidence.path, effect).toBe(BUNDLED_SRD_5_2_1_PATH);
    }
    expect(publicProbabilityCoverageManifest.advantage_and_disadvantage.heading)
      .toBe('Advantage/Disadvantage');
    expect(publicProbabilityCoverageManifest.save_half_damage.heading)
      .toBe('Half Damage');
  });

  it('reconciles every extracted damage-save span with one reviewed clause', () => {
    expect(sourceDerivedSaveDamageCandidateCounts).toEqual({
      before_deduplication: 81,
      after_deduplication: 79,
    });
    const sourceCandidatesBySpan = new Map(
      sourceDerivedSaveDamageCandidates.map((candidate) => [
        `${candidate.heading}\u0000${candidate.span}`,
        candidate,
      ]),
    );
    const manifestClausesBySpan = new Map<string, string>();
    for (const clause of saveSuccessOutcomeEvidenceManifest.values()) {
      if (clause.evidence.kind !== 'bundled_srd') {
        throw new Error('Save clauses must cite bundled spell headings.');
      }
      const heading = clause.evidence.heading as string;
      const sourceKey = `${heading}\u0000${clause.source_span}`;
      const sourceCandidate = sourceCandidatesBySpan.get(sourceKey);
      expect(
        sourceCandidate,
        `${clause.id} is not bound to a source-derived save candidate`,
      ).toBeDefined();
      expect(clause.source_span, clause.id).toMatch(/sav(?:e|ing throw)/iu);
      expect(clause.kind, `${clause.id}: source outcome`).toBe(
        sourceCandidate?.success.status === 'available'
          ? sourceCandidate.success.kind
          : 'unavailable',
      );
      expect(clause.ability, `${clause.id}: source ability`).toBe(
        sourceCandidate?.ability,
      );
      manifestClausesBySpan.set(sourceKey, clause.id);
    }
    for (const candidate of sourceDerivedSaveDamageCandidates) {
      const sourceKey = `${candidate.heading}\u0000${candidate.span}`;
      expect(
        manifestClausesBySpan.has(sourceKey),
        `Missing reviewed save clause for ${candidate.heading}: ${candidate.span}`,
      ).toBe(true);
    }
    expect(saveSuccessOutcomeEvidenceManifest.size).toBe(
      sourceDerivedSaveDamageCandidateCounts.after_deduplication,
    );
    expect(new Set(manifestClausesBySpan.values()).size).toBe(
      saveSuccessOutcomeEvidenceManifest.size,
    );
    expect([...manifestClausesBySpan.keys()].sort()).toEqual(
      [...sourceCandidatesBySpan.keys()].sort(),
    );
    expect([...manifestClausesBySpan.keys()].some((key) =>
      key.startsWith('Burning Hands\u0000'),
    )).toBe(true);
  });

  it('uses independently reviewed required slots rather than extractor projections', () => {
    expect(reviewedSaveSuccessClauses.ice_storm.failed_damage_signature_slots)
      .toEqual([
        [{ damage_type: 'Bludgeoning', dice_count: 2, die_size: 10, flat_modifier: null }],
        [{ damage_type: 'Cold', dice_count: 4, die_size: 6, flat_modifier: null }],
      ]);
    expect(reviewedSaveSuccessClauses.flame_strike.failed_damage_signature_slots)
      .toEqual([
        [{ damage_type: 'Fire', dice_count: 5, die_size: 6, flat_modifier: null }],
        [{ damage_type: 'Radiant', dice_count: 5, die_size: 6, flat_modifier: null }],
      ]);
    expect(reviewedSaveSuccessClauses.spirit_guardians.failed_damage_signature_slots)
      .toEqual([[
        { damage_type: 'Radiant', dice_count: 3, die_size: 8, flat_modifier: null },
        { damage_type: 'Necrotic', dice_count: 3, die_size: 8, flat_modifier: null },
      ]]);
    expect(reviewedSaveSuccessClauses.vitriolic_sphere.success_damage_signature_slots)
      .toEqual([[
        { damage_type: 'Acid', dice_count: 10, die_size: 4, flat_modifier: null },
      ]]);
    expect(reviewedSaveSuccessClauses.vitriolic_sphere.success_roll_transform)
      .toBe('floor_half');
    expect(reviewedSaveSuccessClauses.vitriolic_sphere.duration).toEqual({
      kind: 'includes_delayed_damage',
      delayed_until: 'end_of_target_next_turn',
    });
  });

  it('reconciles every high-recall lexical suspect or exact reviewed exclusion', () => {
    expect(unreconciledHighRecallDamageSaveSuspects).toEqual([]);
    expect(sourceDerivedSaveDamageCandidates.filter((candidate) =>
      !highRecallDamageSaveSuspects.some((suspect) =>
        suspect.heading === candidate.heading &&
        candidate.start < suspect.end &&
        suspect.start < candidate.end,
      ),
    )).toEqual([]);
  });

  it('checks bundled headings and still accepts legitimate proof references', () => {
    expect(bundledSrdSourceRef('Critical Hits')).toEqual(
      publicProbabilityCoverageManifest.critical_hit,
    );
    expect(bundledSrdSourceRef('Acid Splash')).toEqual(
      reviewedSaveSuccessClauses.acid_splash.evidence,
    );
    expect(() => bundledSrdSourceRef('This Heading Does Not Exist')).toThrow(
      'not a reviewed literal heading',
    );
  });

  it('orders by kind, source rank/stable key, then stable issue ID', () => {
    const laterKind = createUnmodelledIssue({
      kind: 'unknown_feature_relevance',
      source: null,
      discriminator: 'z',
      detail: 'z',
      why_it_changes_damage: 'z',
      remedy: null,
    });
    const earlierKind = createUnmodelledIssue({
      kind: 'attack_bonus_undetermined',
      source: null,
      discriminator: 'b',
      detail: 'b',
      why_it_changes_damage: 'b',
      remedy: null,
    });
    const sameKindEarlierId = createUnmodelledIssue({
      kind: 'attack_bonus_undetermined',
      source: null,
      discriminator: 'a',
      detail: 'a',
      why_it_changes_damage: 'a',
      remedy: null,
    });
    expect(orderUnmodelledIssues([
      laterKind,
      earlierKind,
      sameKindEarlierId,
    ])).toEqual([sameKindEarlierId, earlierKind, laterKind]);
  });
});
