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
  engineStateHandle,
  FixedReadonlyStateCapsuleSource,
  projectEngineDmProjection,
  verifyEngineStateCapsule,
} from '../../../src/vtt/engine-state-capsule';
import { engineActionRegistry } from '../../../src/vtt/engine-query-port';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { pureIntentResolver } from '../../../src/vtt/intent-resolver';
import { generateRoom } from '../../../src/vtt/room-generator';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const capsuleEntry = resolve(repoRoot, 'src/vtt/engine-state-capsule.ts');

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
  const forbidden = /(?:session-persistence|session-encounter-reducer|combat\/random|combat\/coordinator)\.ts$/u;
  const pending: { readonly path: string; readonly chain: readonly string[] }[] = [{
    path: capsuleEntry,
    chain: [relative(repoRoot, capsuleEntry)],
  }];
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

function capsuleFixture() {
  const state = generateRoom(3_943_001).encounter.state;
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
  it('has no reducer, journal, coordinator, or RNG module in its runtime import graph', () => {
    const chain = forbiddenCapsuleImportChain();
    expect(
      chain,
      `capsule runtime graph reaches a forbidden authority module:\n${chain?.join(' -> ') ?? ''}`,
    ).toBeNull();
  });

  it('projects bounded query facts without reducer commands or persistence state', () => {
    const { capsule } = capsuleFixture();
    expect(verifyEngineStateCapsule(capsule)).toBe(true);
    expect(capsule.projection.combatants.some((combatant) => combatant.actions.length > 0)).toBe(true);
    expect(Object.keys(capsule.projection).sort()).toEqual([
      'activeCombatant',
      'activeSide',
      'blockedCells',
      'bounds',
      'combatants',
      'difficultTerrainCells',
      'movementBlockingObjects',
      'room',
      'round',
    ]);
    expect(JSON.stringify(capsule.projection)).not.toContain('pendingCommand');
    expect(JSON.stringify(capsule.projection)).not.toContain('rngState');
  });

  it('submits a closed proposal without changing the projection digest', () => {
    const fixture = capsuleFixture();
    const source = new FixedReadonlyStateCapsuleSource(fixture.capsule);
    const stateHandle = engineStateHandle(fixture.capsule);
    const resolution = pureIntentResolver.resolve(fixture.state, {
      actorId: fixture.actor,
      choice: { kind: 'dodge' },
      movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
      engagement: { stance: 'hold_position' },
      fallback: null,
    });
    if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.summary).join('\n'));
    const envelope: EngineProposalEnvelope = {
      kind: 'round_intent_proposal',
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
        intent: {
          actorId: fixture.actor,
          choice: { kind: 'dodge' },
          movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
          engagement: { stance: 'hold_position' },
          fallback: null,
        },
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
