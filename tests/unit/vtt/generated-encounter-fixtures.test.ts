import { describe, expect, it, vi } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { dmVisibleEncounter, projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { encounterBoardRenderModel, projectEncounterTerrainCells } from '../../../src/vtt/encounter-board';
import {
  TEST_APPROVED_FIRST_SKIRMISH_ART,
  TEST_APPROVED_FIRST_SKIRMISH_FIXTURE,
  TEST_APPROVED_FIRST_SKIRMISH_FIXTURE_BYTES,
  TEST_APPROVED_FIRST_SKIRMISH_PACKAGE,
  TEST_APPROVED_FIRST_SKIRMISH_REQUEST,
} from '../../../src/vtt/test-approved-first-skirmish';
import {
  MemoryApprovedEncounterFixtureStore,
  approvedFixtureSession,
  approveEncounterPackage,
  buildEncounterGenerationPrompt,
  ENCOUNTER_MONSTER_COUNT_RANGE,
  encounterStateFromApprovedFixture,
  generateEncounterCandidate,
  loadApprovedEncounterFixture,
  manuallyPatchEncounterPackage,
  persistApprovedEncounterFixture,
  projectApprovedFixtureForDm,
  projectApprovedFixtureForPlayer,
  REFERENCE_ENCOUNTER_XP_BUDGETS,
  referenceEncounterXpBand,
  regenerateEncounterSection,
  serializePlayerEncounterFixture,
  testApproverIdentity,
  validateGeneratedEncounterPackage,
  type ApproverIdentity,
} from '../../../src/vtt/generated-encounter-fixtures';
import { attestOwnerEncounterApproval } from '../../../src/vtt/encounter-owner-approval';
import { REFERENCE_FIGHTER_ID } from '../../../src/vtt/reference-encounter';

function clonePackage(): typeof TEST_APPROVED_FIRST_SKIRMISH_PACKAGE {
  return structuredClone(TEST_APPROVED_FIRST_SKIRMISH_PACKAGE);
}

function rosterXp(row: (typeof STARTER_MONSTER_ROSTER)[number]): number {
  const challenge = row.statblock.sourceDetails.challenge;
  if (challenge.kind === 'absent') throw new Error(`Missing XP for ${row.id}`);
  return challenge.value.experiencePoints;
}

describe('increment 9 generated and approved encounter fixtures', () => {
  it('rejects every incomplete complete-package section', () => {
    for (const field of ['request', 'generationPrompt', 'roster', 'layout', 'tactics', 'provenance'] as const) {
      const candidate = clonePackage() as unknown as Record<string, unknown>;
      delete candidate[field];
      expect(() => validateGeneratedEncounterPackage(candidate), field).toThrow();
    }

    const withoutMap = clonePackage() as unknown as { layout: Record<string, unknown> };
    delete withoutMap.layout.map;
    expect(() => validateGeneratedEncounterPackage(withoutMap)).toThrow();
  });

  it('M55-DIFFICULTY-DEFAULTS-MEDIUM refuses a request with no required difficulty before exchange', async () => {
    let calls = 0;
    const request = structuredClone(TEST_APPROVED_FIRST_SKIRMISH_REQUEST) as unknown as Record<string, unknown>;
    delete request.difficulty;

    await expect(generateEncounterCandidate(request, {
      generate: async () => {
        calls += 1;
        return clonePackage();
      },
    })).rejects.toThrow();
    expect(calls).toBe(0);
  });

  it('M56-GENERATION-PACKAGE-OMITS-FOG rejects an otherwise complete package without fog', () => {
    const candidate = clonePackage() as unknown as {
      layout: Record<string, unknown>;
    };
    delete candidate.layout.fog;
    expect(() => validateGeneratedEncounterPackage(candidate)).toThrow();
  });

  it('M57-UNKNOWN-ROSTER-STATBLOCK-ACCEPTED rejects ids outside the decoded roster', () => {
    const candidate = clonePackage() as unknown as {
      roster: Array<{ statblockId: string }>;
    };
    candidate.roster[0]!.statblockId = 'statblock:invented-chronomancer';
    expect(() => validateGeneratedEncounterPackage(candidate)).toThrow(
      'Unknown approved starter statblock id statblock:invented-chronomancer',
    );
  });

  it('rejects unknown assets, illegal placement, invalid terrain, and invalid fog', () => {
    const unknownAsset = clonePackage() as unknown as {
      layout: { map: { floorAssetId: string } };
    };
    unknownAsset.layout.map.floorAssetId = 'art.map.unknown.v1';
    expect(() => validateGeneratedEncounterPackage(unknownAsset)).toThrow(
      'Unknown starter-art asset id art.map.unknown.v1',
    );

    const duplicatePlacement = clonePackage() as unknown as {
      layout: { placement: Array<{ cell: { column: number; row: number } }> };
    };
    duplicatePlacement.layout.placement[1]!.cell = {
      ...duplicatePlacement.layout.placement[0]!.cell,
    };
    expect(() => validateGeneratedEncounterPackage(duplicatePlacement)).toThrow(
      'Placement cells must be unique',
    );

    const invalidTerrain = clonePackage() as unknown as {
      layout: { terrain: Array<{ kind: string; blocksMovement: boolean }> };
    };
    invalidTerrain.layout.terrain[0]!.blocksMovement = false;
    expect(() => validateGeneratedEncounterPackage(invalidTerrain)).toThrow(
      'invalid movement policy',
    );

    const invalidFog = clonePackage() as unknown as {
      layout: { fog: { cells: Array<{ column: number; row: number }> } };
    };
    invalidFog.layout.fog.cells.push({ column: 12, row: 0 });
    expect(() => validateGeneratedEncounterPackage(invalidFog)).toThrow(
      'Fog cells must be inside the room',
    );
  });

  it('enforces the requested XP band and records honest sim-calibration residuals', () => {
    const validated = validateGeneratedEncounterPackage(TEST_APPROVED_FIRST_SKIRMISH_PACKAGE);

    expect(validated.assessment).toEqual(expect.objectContaining({
      status: 'deterministic_pass_calibration_pending',
      request: { rounds: 4, pressure: 'moderate' },
      deterministic: expect.objectContaining({
        budgets: { low: 2250, moderate: 3900, high: 5100 },
        requestedBand: { lowerExclusive: 2250, upperInclusive: 3900 },
        encounterXp: 2700,
        totalChallengeRating: 12,
        lazyDeadlyLine: 10,
        dangerCrossCheck: true,
      }),
    }));
    expect(validated.assessment.simulation).toEqual({
      terminalRoundDistribution: {
        kind: 'unavailable',
        residual: 'TODO(sim-calibration: rounds)',
      },
      resourcePressureVector: {
        kind: 'unavailable',
        residual: 'TODO(sim-calibration: pressure)',
      },
      materialOpportunityEvidence: {
        kind: 'unavailable',
        residual: 'TODO(sim-calibration: action economy and initiative)',
      },
    });

    const underfilled = clonePackage() as unknown as {
      roster: Array<{ statblockId: string }>;
    };
    for (const entry of underfilled.roster) entry.statblockId = 'statblock:goblin-warrior';
    expect(() => validateGeneratedEncounterPackage(underfilled)).toThrow(
      'outside the requested moderate band',
    );
  });

  it('builds high from the enlarged roster and retains an explicit mathematically unbuildable path', async () => {
    const highBand = referenceEncounterXpBand('high');
    const maximumMonsterXp = Math.max(...STARTER_MONSTER_ROSTER.map(rosterXp));
    const maximumEncounterXp = maximumMonsterXp * ENCOUNTER_MONSTER_COUNT_RANGE.maximum;
    expect(maximumEncounterXp).toBeGreaterThan(highBand.lowerExclusive!);
    expect(maximumEncounterXp).toBeGreaterThan(highBand.upperInclusive);

    const highRequest = {
      ...TEST_APPROVED_FIRST_SKIRMISH_REQUEST,
      difficulty: { rounds: 4, pressure: 'high' },
    } as const;
    const highPackage = clonePackage() as unknown as {
      request: typeof highRequest;
      generationPrompt: string;
      roster: Array<{ statblockId: string }>;
    };
    highPackage.request = highRequest;
    highPackage.generationPrompt = buildEncounterGenerationPrompt(highRequest);
    for (const entry of highPackage.roster) entry.statblockId = 'statblock:giant-scorpion';

    let calls = 0;
    await expect(generateEncounterCandidate(highRequest, {
      generate: async () => {
        calls += 1;
        return highPackage;
      },
    })).resolves.toEqual(highPackage);
    expect(calls).toBe(1);

    const cappedRoster = STARTER_MONSTER_ROSTER.filter(
      (row) => rosterXp(row) <= REFERENCE_ENCOUNTER_XP_BUDGETS.low / ENCOUNTER_MONSTER_COUNT_RANGE.maximum,
    );
    const cappedMaximumEncounterXp = Math.max(...cappedRoster.map(rosterXp))
      * ENCOUNTER_MONSTER_COUNT_RANGE.maximum;
    const pressures = ['low', 'moderate', 'high'] as const;
    const unbuildablePressure = pressures.find((pressure) => {
      const lower = referenceEncounterXpBand(pressure).lowerExclusive;
      return lower !== null && cappedMaximumEncounterXp <= lower;
    });
    expect(unbuildablePressure).toBeDefined();
    const unbuildableBand = referenceEncounterXpBand(unbuildablePressure!);
    expect(cappedMaximumEncounterXp).toBeLessThanOrEqual(unbuildableBand.lowerExclusive!);

    vi.resetModules();
    vi.doMock('../../../src/combat/statblocks/roster', () => ({
      STARTER_MONSTER_ROSTER: cappedRoster,
      BUNDLED_MONSTER_ROSTER: cappedRoster,
    }));
    try {
      const constrainedModule = await import('../../../src/vtt/generated-encounter-fixtures');
      let constrainedCalls = 0;
      await expect(constrainedModule.generateEncounterCandidate({
        ...TEST_APPROVED_FIRST_SKIRMISH_REQUEST,
        difficulty: { rounds: 4, pressure: unbuildablePressure! },
      }, {
        generate: async () => {
          constrainedCalls += 1;
          return clonePackage();
        },
      })).rejects.toThrow(`unbuildable_difficulty: ${unbuildablePressure!}`);
      expect(constrainedCalls).toBe(0);
    } finally {
      vi.doUnmock('../../../src/combat/statblocks/roster');
      vi.resetModules();
    }
  });

  it('M58-UNAPPROVED-PACKAGE-PERSISTED refuses candidate bytes before owner approval', () => {
    const store = new MemoryApprovedEncounterFixtureStore();
    expect(() => persistApprovedEncounterFixture(
      store,
      TEST_APPROVED_FIRST_SKIRMISH_PACKAGE,
    )).toThrow();
  });

  it('reloads the approved content-addressed fixture byte-equivalently offline', () => {
    const store = new MemoryApprovedEncounterFixtureStore();
    const persisted = persistApprovedEncounterFixture(store, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const loaded = loadApprovedEncounterFixture(
      store,
      TEST_APPROVED_FIRST_SKIRMISH_FIXTURE.fixtureId,
    );

    expect(persisted).toBe(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE_BYTES);
    expect(loaded.bytes).toBe(persisted);
    expect(canonicalJson(loaded.fixture)).toBe(loaded.bytes);
    expect(loaded.fixture.fixtureId).toMatch(/^encounter-fixture:sha256:[a-f0-9]{64}$/u);
    expect(loaded.fixture.approval.acknowledgedResiduals).toEqual([
      'TODO(sim-calibration: rounds)',
      'TODO(sim-calibration: pressure)',
      'TODO(sim-calibration: action economy and initiative)',
    ]);
    expect(loaded.fixture.approval).toEqual(expect.objectContaining({
      status: 'test_approved_with_calibration_residuals',
      approver: {
        kind: 'test',
        approvalId: 'test:increment-9-engine-example',
      },
    }));
  });

  it('OWNER-APPROVAL-REQUIRES-TRUSTED-ATTESTATION rejects fixture and test construction', () => {
    const forgedOwner = {
      kind: 'owner',
      approvalId: 'owner:forged-fixture-record',
      packageSha256: '0'.repeat(64),
    } as unknown as ApproverIdentity;

    expect(() => approveEncounterPackage(
      TEST_APPROVED_FIRST_SKIRMISH_PACKAGE,
      forgedOwner,
    )).toThrow('Owner approval identity lacks a trusted UI attestation');

    expect(() => attestOwnerEncounterApproval({
      activation: { isTrusted: false, type: 'click' } as Event,
      approvalId: 'owner:forged-fixture-record',
      packageSha256: '0'.repeat(64),
    })).toThrow('Owner approval requires a trusted click or submit from the approval UI');
  });

  it('M59-APPROVED-FIXTURE-REGENERATED-ON-LOAD never calls generation while loading saved bytes', async () => {
    const store = new MemoryApprovedEncounterFixtureStore();
    persistApprovedEncounterFixture(store, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    let generationCalls = 0;
    const divergent = clonePackage() as unknown as {
      tactics: { notes: string[] };
    };
    divergent.tactics.notes[0] = 'A later generation returned a different tactic.';

    const later = await generateEncounterCandidate(TEST_APPROVED_FIRST_SKIRMISH_REQUEST, {
      generate: async () => {
        generationCalls += 1;
        return divergent;
      },
    });
    const loaded = loadApprovedEncounterFixture(
      store,
      TEST_APPROVED_FIRST_SKIRMISH_FIXTURE.fixtureId,
    );

    expect(generationCalls).toBe(1);
    expect(later.tactics.notes[0]).not.toBe(loaded.fixture.package.tactics.notes[0]);
    expect(loaded.bytes).toBe(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE_BYTES);
  });

  it('M60-TACTICS-LEAK-TO-PLAYER-PROJECTION keeps all tactics in the DM projection only', () => {
    const player = projectApprovedFixtureForPlayer(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const dm = projectApprovedFixtureForDm(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const serializedPlayer = serializePlayerEncounterFixture(player);

    expect(dm.package.tactics.notes[0]).toContain('captains screen the priests');
    expect(serializedPlayer).not.toContain('tactics');
    expect(serializedPlayer).not.toContain('captains screen the priests');
    expect(serializedPlayer).not.toContain('combatantPlans');
    expect(serializedPlayer).not.toContain('fog');
    expect(serializedPlayer).not.toContain('placement');
  });

  it('renders the approved package through both encounter projections', () => {
    const state = encounterStateFromApprovedFixture(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const dm = dmVisibleEncounter(projectDmView(state));
    const player = projectPlayerView(state, {
      seatId: 'seat:reference-fighter',
      combatantId: REFERENCE_FIGHTER_ID,
    });
    const dmCells = encounterBoardRenderModel({
      bounds: dm.bounds,
      terrainCells: projectEncounterTerrainCells(state.bounds, state),
      combatants: dm.combatants,
      highlightedCombatant: dm.activeCombatant,
      adjudicatedTargets: [],
      foggedCells: dm.dmOnly.foggedCells,
    }, TEST_APPROVED_FIRST_SKIRMISH_ART);
    const playerCells = encounterBoardRenderModel({
      bounds: player.bounds,
      terrainCells: projectEncounterTerrainCells(state.bounds, state),
      combatants: player.combatants,
      highlightedCombatant: player.activeCombatant,
      adjudicatedTargets: [],
    }, TEST_APPROVED_FIRST_SKIRMISH_ART);

    expect(dmCells).toHaveLength(108);
    expect(playerCells).toHaveLength(108);
    expect(dmCells.flatMap((cell) => cell.layers).filter((layer) => layer.role === 'fog')).toHaveLength(6);
    expect(playerCells.flatMap((cell) => cell.layers).some((layer) => layer.role === 'fog')).toBe(false);
  });

  it('starts the approved fixture as a legal coordinator session carrying fixture identity', async () => {
    const session = approvedFixtureSession(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const initiative = await session.coordinator.step();
    const firstTurn = await session.coordinator.step();

    expect(session.fixtureId).toBe(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE.fixtureId);
    expect(initiative.kind).toBe('applied');
    expect(firstTurn.kind).toBe('applied');
    expect(session.coordinator.state().combatants).toHaveLength(9);
    expect(session.coordinator.state().revision).toBe(2);
  });

  it('records targeted regeneration and revalidates the complete package', async () => {
    const replacement = structuredClone(TEST_APPROVED_FIRST_SKIRMISH_PACKAGE.tactics) as unknown as {
      objective: string;
      exitConditions: string[];
      notes: string[];
      combatantPlans: Array<{ combatantId: string; priorities: string[] }>;
    };
    replacement.notes[0] = 'Regenerated tactics keep both captains between the party and priests.';
    const revised = await regenerateEncounterSection(
      TEST_APPROVED_FIRST_SKIRMISH_PACKAGE,
      'tactics',
      { regenerate: async ({ section }) => section === 'tactics' ? replacement : null },
      { sessionId: 'codex:targeted-regen', exchangeId: 'exchange:tactics:2' },
    );

    expect(revised.provenance.revisions.at(-1)).toEqual({
      kind: 'targeted_regeneration',
      sections: ['tactics'],
      sessionId: 'codex:targeted-regen',
      exchangeId: 'exchange:tactics:2',
    });

    const invalidLayout = structuredClone(TEST_APPROVED_FIRST_SKIRMISH_PACKAGE.layout) as unknown as {
      placement: Array<{ cell: { column: number; row: number } }>;
    };
    invalidLayout.placement[0]!.cell = { column: 99, row: 99 };
    await expect(regenerateEncounterSection(
      TEST_APPROVED_FIRST_SKIRMISH_PACKAGE,
      'layout',
      { regenerate: async () => invalidLayout },
      { sessionId: 'codex:targeted-regen', exchangeId: 'exchange:layout:2' },
    )).rejects.toThrow('outside the room');
  });

  it('OWN-PROVENANCE-UNTRACKED-MANUAL-PATCH records the field and revalidates the whole package', () => {
    const revised = manuallyPatchEncounterPackage(TEST_APPROVED_FIRST_SKIRMISH_PACKAGE, {
      fieldPath: 'tactics.objective',
      value: 'Hold the gate until one priest withdraws.',
      author: 'owner:manual-review',
    });

    expect(revised.tactics.objective).toBe('Hold the gate until one priest withdraws.');
    expect(revised.provenance.revisions.at(-1)).toEqual({
      kind: 'manual_patch',
      fields: ['tactics.objective'],
      author: 'owner:manual-review',
    });
    expect(() => manuallyPatchEncounterPackage(TEST_APPROVED_FIRST_SKIRMISH_PACKAGE, {
      fieldPath: 'layout.map.floorAssetId',
      value: 'art.map.unapproved.v1',
      author: 'owner:manual-review',
    })).toThrow('Unknown starter-art asset id');
  });

  it('OWN-EXTERNAL-PACK-BYPASSES-LOADER carries the file seam and requires the loader path', async () => {
    let calls = 0;
    await expect(generateEncounterCandidate({
      ...TEST_APPROVED_FIRST_SKIRMISH_REQUEST,
      partySource: { packFile: '/tmp/generic-party-pack.json' },
    }, {
      generate: async ({ request, prompt }) => {
        calls += 1;
        return {
          ...clonePackage(),
          request,
          generationPrompt: prompt,
        };
      },
    })).rejects.toThrow('External party pack /tmp/generic-party-pack.json requires the party-pack file loader');
    expect(calls).toBe(0);
  });

  it('detects tampered content-addressed fixture approval metadata', () => {
    const fixture = approveEncounterPackage(
      TEST_APPROVED_FIRST_SKIRMISH_PACKAGE,
      testApproverIdentity('test:second-approval'),
    );
    const tampered = structuredClone(fixture) as unknown as {
      approval: { packageSha256: string };
    };
    tampered.approval.packageSha256 = '0'.repeat(64);
    const store = new MemoryApprovedEncounterFixtureStore();
    expect(() => persistApprovedEncounterFixture(store, tampered)).toThrow(
      'Approved fixture identity does not match its exact package bytes',
    );
  });
});
