import { existsSync, readFileSync } from '../../helpers/test-filesystem';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { combatantId, encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import {
  submitEngineProposal,
  type EngineProposalEnvelope,
  type ProposalSink,
} from '../../../src/vtt/engine-envelopes';
import {
  createEngineStateCapsule,
  createEngineStateCapsuleForEnvironment,
  decodeEngineStateCapsule,
  EngineStateCapsuleDecodeError,
  engineCapsuleRequestKind,
  engineStateHandle,
  FixedReadonlyStateCapsuleSource,
  projectEngineDmProjection,
  projectEngineEncounterState,
  verifyEngineStateCapsule,
} from '../../../src/vtt/engine-state-capsule';
import { canonicalEngineQueryPort, engineActionRegistry } from '../../../src/vtt/engine-query-port';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';
import { HAND_AUTHORED_CAPSULE_V3_BODY } from '../../fixtures/vtt/creature-space-migration-fixtures';
import {
  createLegacyEngineOptionEnvironmentBinding,
  createRevisionBoundEngineOptionEnvironment,
} from '../../../src/vtt/offers/offer-environment';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const authorityBoundaryEntries = [
  resolve(repoRoot, 'src/vtt/engine-state-capsule.ts'),
  resolve(repoRoot, 'src/vtt/mcp/handler.ts'),
  resolve(repoRoot, 'src/vtt/mcp/schemas.ts'),
  resolve(repoRoot, 'src/vtt/mcp/engine-server.ts'),
  resolve(repoRoot, 'src/vtt/agent-adapters/process.ts'),
  resolve(repoRoot, 'src/vtt/agent-adapters/codex.ts'),
  resolve(repoRoot, 'src/vtt/agent-adapters/claude-code.ts'),
  resolve(repoRoot, 'src/vtt/agent-adapters/opencode.ts'),
  resolve(repoRoot, 'src/vtt/agent-adapters/pi.ts'),
  resolve(repoRoot, 'src/vtt/agent-adapters/index.ts'),
] as const;
const adapterBoundaryEntries = authorityBoundaryEntries.filter((path) => path.includes('/agent-adapters/'));

function runtimeModuleSpecifiers(path: string): readonly string[] {
  const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ESNext, false);
  return source.statements.flatMap((statement): readonly string[] => {
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.isTypeOnly === true) return [];
      if (
        clause?.name === undefined && clause?.namedBindings !== undefined &&
        ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.every((element) => element.isTypeOnly)
      ) return [];
      return ts.isStringLiteral(statement.moduleSpecifier) ? [statement.moduleSpecifier.text] : [];
    }
    if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) return [];
    if (
      statement.exportClause !== undefined && ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.every((element) => element.isTypeOnly)
    ) return [];
    return statement.moduleSpecifier !== undefined && ts.isStringLiteral(statement.moduleSpecifier)
      ? [statement.moduleSpecifier.text]
      : [];
  });
}

function resolveLocalImport(importer: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) return null;
  const unresolved = resolve(dirname(importer), specifier);
  return [
    unresolved,
    `${unresolved}.ts`,
    `${unresolved}.tsx`,
    resolve(unresolved, 'index.ts'),
  ].find((candidate) => existsSync(candidate)) ?? null;
}

function forbiddenCapsuleImportChain(): readonly string[] | null {
  const forbidden = /(?:session-persistence|session-encounter-reducer|combat\/random|combat\/coordinator|save-manager|local-session-store)\.ts$/u;
  const pending: { readonly path: string; readonly chain: readonly string[] }[] = authorityBoundaryEntries.map((path) => ({
    path,
    chain: [relative(repoRoot, path)],
  }));
  const seen = new Set<string>();
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined || seen.has(current.path)) continue;
    seen.add(current.path);
    if (forbidden.test(current.path)) return current.chain;
    for (const specifier of runtimeModuleSpecifiers(current.path)) {
      const target = resolveLocalImport(current.path, specifier);
      if (target !== null) pending.push({
        path: target,
        chain: [...current.chain, relative(repoRoot, target)],
      });
    }
  }
  return null;
}

function forbiddenAdapterImportChain(): readonly string[] | null {
  const pending: { readonly path: string; readonly chain: readonly string[] }[] = adapterBoundaryEntries.map((path) => ({
    path,
    chain: [relative(repoRoot, path)],
  }));
  const seen = new Set<string>();
  while (pending.length > 0) {
    const current = pending.shift();
    if (current === undefined || seen.has(current.path)) continue;
    seen.add(current.path);
    const local = relative(resolve(repoRoot, 'src/vtt'), current.path);
    const allowed = local === 'agent-session.ts' || local.startsWith('agent-adapters/');
    if (!allowed) return current.chain;
    for (const specifier of runtimeModuleSpecifiers(current.path)) {
      const target = resolveLocalImport(current.path, specifier);
      if (target !== null) pending.push({ path: target, chain: [...current.chain, relative(repoRoot, target)] });
    }
  }
  return null;
}

function capsuleFixture() {
  const state = freshMonsterPlanningState(generateRoom(3_943_001).encounter.state);
  const actor = state.combatants.find((candidate) => candidate.profile.kind === 'monster');
  const target = state.combatants.find((candidate) => candidate.profile.kind === 'player_character');
  if (actor === undefined || target === undefined) throw new Error('Capsule fixture actors are absent.');
  const board = projectDmBoard({
    view: { audience: 'dm', state },
    coordinator: {
      requestSequence: 0,
      pendingRequest: null,
      pendingCommand: null,
      continuation: { kind: 'idle' },
      pause: null,
    },
    controllers: [],
    history: [],
  });
  const runId = encounterSessionId('encounter:mcp-migration');
  const branchId = encounterBranchId('branch:mcp-migration');
  const requestId = 'request:mcp-migration';
  const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
  const capsule = createEngineStateCapsuleForEnvironment({
    runId,
    branchId,
    revision: 1,
    generatedAt: '2026-08-27T12:00:00.000Z',
    offerEnvironment: environment.binding,
    request: {
      requestId,
      phase: 'initial',
      correctionNumber: 0,
      actors: [actor.profile.id],
    },
    projection: projectEngineDmProjection(board, engineActionRegistry(state), state.observationHistory, 1),
  });
  return { state, actor: actor.profile.id, target: target.profile.id, requestId, capsule };
}

function mutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function mutableArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function rehash(value: unknown): Record<string, unknown> {
  const capsule = mutableRecord(structuredClone(value), 'capsule');
  const body = { ...capsule };
  delete body['digest'];
  delete body['generatedAt'];
  capsule['digest'] = sha256(canonicalJson(body));
  return capsule;
}

describe('read-only engine state capsule', () => {
  it('rejects schema 3 and exercises its hand-authored corpus only after an explicit schema-4 binding', () => {
    const schemaThreeBody = structuredClone(HAND_AUTHORED_CAPSULE_V3_BODY);
    const schemaThreeFixture = {
      ...schemaThreeBody,
      digest: sha256(canonicalJson(schemaThreeBody)),
      generatedAt: '2026-09-05T12:00:00.000Z',
    };
    expect(() => decodeEngineStateCapsule(schemaThreeFixture)).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'unsupported_version' }),
    );
    const body = {
      ...schemaThreeBody,
      schemaVersion: 4,
      offerEnvironment: createLegacyEngineOptionEnvironmentBinding(),
    };
    const fixture = {
      ...body,
      digest: sha256(canonicalJson(body)),
      generatedAt: '2026-09-05T12:00:00.000Z',
    };
    expect(decodeEngineStateCapsule(fixture)).toEqual(fixture);

    const exactShapeCases = [
      ['top-level unknown key', (capsule: Record<string, unknown>) => {
        capsule['unexpected'] = true;
      }],
      ['top-level missing key', (capsule: Record<string, unknown>) => {
        delete capsule['rulesIndex'];
      }],
      ['schema 1', (capsule: Record<string, unknown>) => {
        capsule['schemaVersion'] = 1;
      }],
    ] as const;
    for (const [label, mutate] of exactShapeCases) {
      const corrupted = structuredClone(fixture) as Record<string, unknown>;
      mutate(corrupted);
      expect(() => decodeEngineStateCapsule(rehash(corrupted)), label).toThrow();
    }

    const placedCases = [
      ['legacy schema-1 combatant', (combatant: Record<string, unknown>) => {
        delete combatant['placementStatus'];
        delete combatant['effectiveSize'];
        delete combatant['placementMode'];
        delete combatant['footprint'];
      }],
      ['illegal mode-size pair', (combatant: Record<string, unknown>) => {
        combatant['placementMode'] = { kind: 'squeezed', actual: 'Large', sizedFor: 'Small' };
      }],
      ['forged footprint', (combatant: Record<string, unknown>) => {
        combatant['footprint'] = [{ column: 1, row: 1 }];
      }],
    ] as const;
    for (const [label, mutate] of placedCases) {
      const corrupted = rehash(fixture);
      const projection = mutableRecord(corrupted['projection'], `${label} projection`);
      const combatant = mutableRecord(mutableArray(projection['combatants'], `${label} combatants`)[0], label);
      mutate(combatant);
      expect(() => decodeEngineStateCapsule(rehash(corrupted)), label).toThrowError(
        expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'invalid_schema' }),
      );
    }

    const pendingWithPosition = rehash(fixture);
    const pendingProjection = mutableRecord(pendingWithPosition['projection'], 'pending projection');
    const pending = mutableRecord(mutableArray(pendingProjection['combatants'], 'pending combatants')[1], 'pending');
    pending['position'] = { column: 4, row: 4 };
    expect(() => decodeEngineStateCapsule(rehash(pendingWithPosition))).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'invalid_schema' }),
    );

    expect(() => decodeEngineStateCapsule({ ...fixture, revision: 2 })).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'digest_mismatch' }),
    );
  });

  it('strictly decodes schema 4 only after exact shape and spatial semantics validate', () => {
    const { capsule } = capsuleFixture();
    expect(decodeEngineStateCapsule(capsule)).toEqual(capsule);

    const unknownKey = rehash(capsule);
    unknownKey['unexpected'] = true;
    expect(() => decodeEngineStateCapsule(unknownKey)).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'invalid_schema' }),
    );

    const missingKey = rehash(capsule);
    delete missingKey['rulesIndex'];
    expect(() => decodeEngineStateCapsule(rehash(missingKey))).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'invalid_schema' }),
    );

    const versionOne = rehash(capsule);
    versionOne['schemaVersion'] = 1;
    expect(() => decodeEngineStateCapsule(rehash(versionOne))).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'unsupported_version' }),
    );

    const placedCases = [
      ['legacy schema-1 combatant', (combatant: Record<string, unknown>) => {
        delete combatant['placementStatus'];
        delete combatant['effectiveSize'];
        delete combatant['placementMode'];
        delete combatant['footprint'];
      }],
      ['illegal mode-size pair', (combatant: Record<string, unknown>) => {
        combatant['placementMode'] = { kind: 'squeezed', actual: 'Medium', sizedFor: 'Tiny' };
      }],
      ['forged footprint', (combatant: Record<string, unknown>) => {
        combatant['footprint'] = [{ column: 99, row: 99 }];
      }],
      ['pending with position', (combatant: Record<string, unknown>) => {
        combatant['placementStatus'] = 'placement_pending';
        combatant['pendingReason'] = 'legacy_size_required';
      }],
    ] as const;
    for (const [label, mutate] of placedCases) {
      const corrupted = rehash(capsule);
      const projection = mutableRecord(corrupted['projection'], `${label} projection`);
      const combatant = mutableRecord(mutableArray(projection['combatants'], `${label} combatants`)[0], label);
      mutate(combatant);
      expect(() => decodeEngineStateCapsule(rehash(corrupted)), label).toThrowError(
        expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'invalid_schema' }),
      );
    }

    const digestMismatch = structuredClone(capsule);
    const changed = { ...digestMismatch, revision: digestMismatch.revision + 1 };
    expect(() => decodeEngineStateCapsule(changed)).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'digest_mismatch' }),
    );
  });

  it('capsule and launcher bind the exact offer environment digest', () => {
    const { capsule } = capsuleFixture();
    expect(capsule.offerEnvironment.digest).toBe(
      '0c2e08e26bd2bbfd3b9fe0a239f316e4b61a9c9680174605f12435f6c4f14afb',
    );

    const changedPolicy = rehash(capsule);
    const environment = mutableRecord(changedPolicy['offerEnvironment'], 'offer environment');
    const familyPolicy = mutableRecord(environment['familyPolicy'], 'family policy');
    familyPolicy['helpAttack'] = 'enabled';
    expect(() => decodeEngineStateCapsule(rehash(changedPolicy))).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'invalid_schema' }),
    );

    const changedBinding = rehash(capsule);
    changedBinding['offerEnvironment'] = createLegacyEngineOptionEnvironmentBinding();
    expect(() => decodeEngineStateCapsule(changedBinding)).toThrowError(
      expect.objectContaining<Partial<EngineStateCapsuleDecodeError>>({ code: 'digest_mismatch' }),
    );
  });

  it('gives board-derived and direct projection paths identical placed and pending semantics', () => {
    const fixture = capsuleFixture();
    const registry = engineActionRegistry(fixture.state);
    const direct = projectEngineEncounterState(fixture.state, registry, fixture.capsule.projection.initiative, 1);
    expect(direct).toEqual(fixture.capsule.projection);

    const pendingId = fixture.target;
    const pendingState = {
      ...fixture.state,
      tokens: fixture.state.tokens.filter((token) => token.combatantId !== pendingId),
      adjudicationPending: [{
        kind: 'legacy_size_required' as const,
        combatant: pendingId,
        sourceSizeText: null,
        suggestedAnchor: null,
        originatingToken: null,
      }],
    };
    const pendingBoard = projectDmBoard({
      view: { audience: 'dm', state: pendingState },
      coordinator: {
        requestSequence: 0,
        pendingRequest: null,
        pendingCommand: null,
        continuation: { kind: 'idle' },
        pause: null,
      },
      controllers: [],
      history: [],
    });
    const pendingRegistry = engineActionRegistry(pendingState);
    const fromBoard = projectEngineDmProjection(pendingBoard, pendingRegistry, pendingState.observationHistory, 1);
    const fromState = projectEngineEncounterState(pendingState, pendingRegistry, fromBoard.initiative, 1);
    expect(fromState).toEqual(fromBoard);
    const pending = fromState.combatants.find((combatant) => combatant.id === pendingId);
    expect(pending).toEqual(expect.objectContaining({
      id: pendingId,
      placementStatus: 'placement_pending',
      pendingReason: 'legacy_size_required',
      actions: [],
      actionApproaches: [],
      options: [],
    }));
    expect(pending === undefined ? [] : Object.keys(pending)).not.toContain('position');
    expect(pending === undefined ? [] : Object.keys(pending)).not.toContain('footprint');
  });
  it('defaults legacy ordinary requests to round_plan and carries exact adjustment metadata', () => {
    const fixture = capsuleFixture();
    const legacyRequest = fixture.capsule.request;
    if (legacyRequest === null || legacyRequest.phase === 'speculative') {
      throw new Error('Fixture did not create an ordinary request.');
    }
    expect(engineCapsuleRequestKind(legacyRequest)).toBe('round_plan');

    const actors = fixture.state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []);
    const request = {
      kind: 'plan_adjustment' as const,
      requestId: 'request:plan-adjustment',
      phase: 'initial' as const,
      correctionNumber: 0 as const,
      actors,
      parentPlanId: 'monster-plan:parent',
      baselinePlanHash: 'a'.repeat(64),
      triggerPcTurnId: 'pc-turn:round-1-fighter',
      beforeRevision: 10,
      afterRevision: 12,
      materialityReasonCodes: ['PROPOSAL_RESOLUTION_CHANGED'] as const,
      baselineProposalDigests: actors.map((actorId, index) => ({
        actorId,
        proposalDigest: index.toString(16).padStart(64, '0'),
      })),
      adjustmentBudget: 2 as const,
    };
    const capsule = createEngineStateCapsule({
      runId: fixture.capsule.runId,
      branchId: fixture.capsule.branchId,
      revision: 12,
      generatedAt: '2026-08-29T12:00:00.000Z',
      request,
      projection: fixture.capsule.projection,
    });

    expect(engineCapsuleRequestKind(request)).toBe('plan_adjustment');
    expect(capsule.request).toEqual(request);
    expect(verifyEngineStateCapsule(capsule)).toBe(true);
    expect(() => createEngineStateCapsule({
      runId: fixture.capsule.runId,
      branchId: fixture.capsule.branchId,
      revision: 12,
      generatedAt: '2026-08-29T12:00:00.000Z',
      request: { ...request, adjustmentBudget: 1 },
      projection: fixture.capsule.projection,
    })).toThrow('Plan adjustment actors, baseline proposal digests, and budget must match exactly.');
  });

  it('accepts an exactly bound empty adjustment patch as an explicit keep decision', () => {
    const fixture = capsuleFixture();
    const actors = fixture.state.combatants.flatMap((combatant) =>
      combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []);
    const capsule = createEngineStateCapsule({
      runId: fixture.capsule.runId,
      branchId: fixture.capsule.branchId,
      revision: 8,
      generatedAt: '2026-08-29T12:00:00.000Z',
      request: {
        kind: 'plan_adjustment',
        requestId: 'request:empty-adjustment',
        phase: 'initial',
        correctionNumber: 0,
        actors,
        parentPlanId: 'monster-plan:parent',
        baselinePlanHash: 'b'.repeat(64),
        triggerPcTurnId: 'pc-turn:round-1-cleric',
        beforeRevision: 6,
        afterRevision: 8,
        materialityReasonCodes: ['OPEN_MONSTER_SET_CHANGED'],
        baselineProposalDigests: actors.map((actorId, index) => ({
          actorId,
          proposalDigest: (index + 10).toString(16).padStart(64, '0'),
        })),
        adjustmentBudget: 2,
      },
      projection: fixture.capsule.projection,
    });
    const source = new FixedReadonlyStateCapsuleSource(capsule);
    const accepted: EngineProposalEnvelope[] = [];
    const envelope: EngineProposalEnvelope = {
      kind: 'plan_adjustment_turn_proposal',
      proposalId: 'proposal:explicit-keep',
      runId: capsule.runId,
      branchId: capsule.branchId,
      requestId: 'request:empty-adjustment',
      expectedRevision: capsule.revision,
      stateDigest: capsule.digest,
      stateHandle: engineStateHandle(capsule),
      phase: 'initial',
      idempotencyKey: 'explicit-keep-adjustment-0001',
      baseline_plan_hash: 'b'.repeat(64),
      updates: [],
    };

    submitEngineProposal(source, { append: (proposal) => { accepted.push(proposal); } }, envelope);

    expect(accepted).toEqual([envelope]);
    expect(() => submitEngineProposal(source, { append: () => undefined }, {
      ...envelope,
      proposalId: 'proposal:wrong-baseline',
      idempotencyKey: 'wrong-baseline-adjustment-0001',
      baseline_plan_hash: 'c'.repeat(64),
    })).toThrow('Plan adjustment proposal does not match the baseline plan hash.');
    const updates = actors.map((actorId) => {
      const option = availableEngineActorOptions(fixture.state, actorId)
        .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
      if (option === undefined) throw new Error(`Fixture omitted Dodge for ${actorId}.`);
      const proposal = {
        actorId, expectedRevision: fixture.state.revision, primaryOptionId: option.optionId,
        fallbackOptionId: null,
        reason: 'Exercise the state capsule fixture.', overrideJustification: null,
      };
      const resolution = pureTurnProposalResolver.resolve(fixture.state, proposal);
      if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.summary).join('\n'));
      return {
        proposal,
        option: resolution.option,
        primaryOption: resolution.primaryOption,
        fallbackOption: resolution.fallbackOption,
        mechanics: resolution.mechanics,
        selectedBranch: resolution.selectedBranch,
        resolutionDigest: resolution.resolutionDigest,
        summary: resolution.summary,
      };
    });
    expect(() => submitEngineProposal(source, { append: () => undefined }, {
      ...envelope,
      proposalId: 'proposal:over-budget',
      idempotencyKey: 'over-budget-adjustment-0001',
      updates,
    })).toThrow('Plan adjustment updates must be unique open actors within the adjustment budget.');
  });

  it('has no reducer, journal, coordinator, store, or RNG module in the capsule or MCP runtime import graphs', () => {
    const chain = forbiddenCapsuleImportChain();
    expect(
      chain,
      `capsule runtime graph reaches a forbidden authority module:\n${chain?.join(' -> ') ?? ''}`,
    ).toBeNull();
  });

  it('keeps real agent adapters outside every engine runtime import graph except neutral binding types', () => {
    const chain = forbiddenAdapterImportChain();
    expect(
      chain,
      `agent adapter runtime graph reaches a non-binding VTT/engine module:\n${chain?.join(' -> ') ?? ''}`,
    ).toBeNull();
  });

  it('projects bounded query facts without reducer commands or persistence state', () => {
    const { capsule } = capsuleFixture();
    expect(verifyEngineStateCapsule(capsule)).toBe(true);
    expect(capsule.projection.combatants.some((combatant) => combatant.actions.length > 0)).toBe(true);
    expect(capsule.projection.combatants.some((combatant) =>
      combatant.actionApproaches.some((approach) => approach.minimumMovementFeet !== null),
    )).toBe(true);
    expect(Object.keys(capsule.projection).sort()).toEqual([
      'activeCombatant',
      'activeSide',
      'blockedCells',
      'bounds',
      'combatants',
      'difficultTerrainCells',
      'initiative',
      'movementBlockingObjects',
      'observationHistory',
      'room',
      'round',
      'semanticZones',
    ]);
    expect(JSON.stringify(capsule.projection)).not.toContain('pendingCommand');
    expect(JSON.stringify(capsule.projection)).not.toContain('rngState');
    expect(JSON.stringify(capsule.projection)).not.toContain('human-option:');
    expect(capsule.projection.combatants.flatMap((combatant) => combatant.options)
      .every((option) => option.optionId.startsWith('option:'))).toBe(true);
  });

  it('submits a closed proposal without changing the projection digest', () => {
    const fixture = capsuleFixture();
    const source = new FixedReadonlyStateCapsuleSource(fixture.capsule);
    const stateHandle = engineStateHandle(fixture.capsule);
    const option = availableEngineActorOptions(fixture.state, fixture.actor)
      .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
    if (option === undefined) throw new Error('Fixture omitted Dodge.');
    const proposal = {
      actorId: fixture.actor, expectedRevision: fixture.state.revision, primaryOptionId: option.optionId,
      fallbackOptionId: null,
      reason: 'Exercise the restored capsule fixture.', overrideJustification: null,
    };
    const resolution = pureTurnProposalResolver.resolve(fixture.state, proposal);
    if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.summary).join('\n'));
    const envelope: EngineProposalEnvelope = {
      kind: 'round_turn_proposal',
      rationale: null,
      reactionGuidance: null,
      proposalId: 'proposal:mcp-migration',
      runId: fixture.capsule.runId,
      branchId: fixture.capsule.branchId,
      requestId: fixture.requestId,
      expectedRevision: fixture.capsule.revision,
      stateDigest: fixture.capsule.digest,
      stateHandle,
      phase: 'initial',
      idempotencyKey: 'mcp-migration-key-0001',
      resolutions: [{
        proposal,
        option: resolution.option,
        primaryOption: resolution.primaryOption,
        fallbackOption: resolution.fallbackOption,
        mechanics: resolution.mechanics,
        selectedBranch: resolution.selectedBranch,
        resolutionDigest: resolution.resolutionDigest,
        summary: resolution.summary,
      }],
    };
    const accepted: EngineProposalEnvelope[] = [];
    const sink: ProposalSink = { append: (proposal) => { accepted.push(proposal); } };
    const before = source.read({
      runId: fixture.capsule.runId,
      stateHandle,
      expectedRevision: fixture.capsule.revision,
    }).digest;

    submitEngineProposal(source, sink, envelope);

    const after = source.read({
      runId: fixture.capsule.runId,
      stateHandle,
      expectedRevision: fixture.capsule.revision,
    }).digest;
    expect(accepted).toHaveLength(1);
    expect(after).toBe(before);
    expect(after).toBe(fixture.capsule.digest);
  });

  it('fails closed for a stale state handle', () => {
    const { capsule } = capsuleFixture();
    const source = new FixedReadonlyStateCapsuleSource(capsule);
    expect(() => source.read({
      runId: capsule.runId,
      stateHandle: `engine-state:${'0'.repeat(64)}`,
      expectedRevision: capsule.revision,
    })).toThrow('STALE_STATE');
  });
});
