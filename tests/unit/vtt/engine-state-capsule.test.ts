import { existsSync, readFileSync } from '../../helpers/test-filesystem';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { combatantId, encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import {
  submitEngineProposal,
  type EngineProposalEnvelope,
  type ProposalSink,
} from '../../../src/vtt/engine-envelopes';
import {
  createEngineStateCapsule,
  engineCapsuleRequestKind,
  engineStateHandle,
  FixedReadonlyStateCapsuleSource,
  projectEngineDmProjection,
  verifyEngineStateCapsule,
} from '../../../src/vtt/engine-state-capsule';
import { engineActionRegistry } from '../../../src/vtt/engine-query-port';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/mcp/entrypoint';
import { generateRoom } from '../../../src/vtt/room-generator';

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
  const capsule = createEngineStateCapsule({
    runId,
    branchId,
    revision: 1,
    generatedAt: '2026-08-27T12:00:00.000Z',
    request: {
      requestId,
      phase: 'initial',
      correctionNumber: 0,
      actors: [actor.profile.id],
    },
    projection: projectEngineDmProjection(board, engineActionRegistry(state), 1),
  });
  return { state, actor: actor.profile.id, target: target.profile.id, requestId, capsule };
}

describe('read-only engine state capsule', () => {
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
        fallbackOptionId: null, overrideJustification: null,
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
      fallbackOptionId: null, overrideJustification: null,
    };
    const resolution = pureTurnProposalResolver.resolve(fixture.state, proposal);
    if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.summary).join('\n'));
    const envelope: EngineProposalEnvelope = {
      kind: 'round_turn_proposal',
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
