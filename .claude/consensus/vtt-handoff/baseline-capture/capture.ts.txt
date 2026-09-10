import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Node's type-stripper deliberately does not add TypeScript extension
// resolution. The repository uses bundler-style extensionless imports, so the
// capture installs the narrow equivalent needed to execute the unmodified
// source directly without asking the read-only node_modules tree for a cache.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (originalError: unknown) {
      if (!specifier.startsWith('.') || specifier.endsWith('.ts')) throw originalError;
      const candidates = [`${specifier}.ts`, `${specifier}/index.ts`];
      for (const candidate of candidates) {
        try {
          const resolved = nextResolve(candidate, context);
          if (existsSync(fileURLToPath(resolved.url))) return resolved;
        } catch (_candidateError: unknown) {
          // Try the next explicit TypeScript form.
        }
      }
      throw originalError;
    }
  },
  load(url, context, nextLoad) {
    if (url.endsWith('?raw')) {
      const sourcePath = fileURLToPath(url.slice(0, -'?raw'.length));
      return {
        format: 'module',
        shortCircuit: true,
        source: `export default ${JSON.stringify(readFileSync(sourcePath, 'utf8'))};`,
      };
    }
    const loaded = nextLoad(url, context);
    if (!url.endsWith('.ts') || loaded.source === null || loaded.source === undefined) {
      return loaded;
    }
    const source = typeof loaded.source === 'string'
      ? loaded.source
      : Buffer.from(loaded.source).toString('utf8');
    return {
      ...loaded,
      source: source
        .replaceAll('import.meta.env.MODE', JSON.stringify('test'))
        .replaceAll('import.meta.env.DEV', 'false')
        .replaceAll('import.meta.env.PROD', 'false')
        .replaceAll('import.meta.env.BASE_URL', JSON.stringify('/')),
    };
  },
});

const CAPTURED_FROM = '0f84e09f' as const;
const SEED = 9182;
const FIXED_CLOCK_ISO = '2026-09-10T12:00:00.000Z';
const OUTPUT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const FIXTURE_FILENAME = 'pending-request-baseline.v1.json';
const SHA_FILENAME = 'pending-request-baseline.v1.sha256';

const INITIAL_COORDINATOR_STATE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

function fail(message: string): never {
  throw new Error(`Baseline capture invariant failed: ${message}`);
}

async function capture(): Promise<void> {
  const [
    { canonicalJson },
    { AlgorithmController, ControllerRegistry, HumanController },
    { TurnCoordinator },
    { createEncounter },
    { mulberry32 },
    { encounterBranchId, encounterSessionId },
    { sha256 },
    { EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink },
    { monsterProfile, placedToken, playerProfile },
  ] = await Promise.all([
    import('../../src/commands/canonical-json.ts'),
    import('../../src/combat/controllers.ts'),
    import('../../src/combat/coordinator.ts'),
    import('../../src/combat/encounter.ts'),
    import('../../src/combat/random.ts'),
    import('../../src/combat/values.ts'),
    import('../../src/crypto/sha256.ts'),
    import('../../src/vtt/session-persistence.ts'),
    import('../../tests/unit/combat/fixtures.ts'),
  ]);
  const sessionId = encounterSessionId('session:pending-request-baseline-v1');
  const branchId = encounterBranchId('branch:pending-request-baseline-v1');
  const fixedClock = () => new Date(FIXED_CLOCK_ISO);
  const player = playerProfile('baseline-human-player', { initiativeBonus: 20 });
  const monster = monsterProfile('baseline-algorithm-monster', {
    initiativeBonus: -20,
    hitPoints: 20,
  });
  const initialState = createEncounter({
    bounds: { columns: 6, rows: 2 },
    combatants: [player, monster],
    tokens: [placedToken(player, 0), placedToken(monster, 5)],
  });
  const human = new HumanController();
  const registry = new ControllerRegistry([
    {
      combatantId: player.id,
      controller: human,
      controllerId: 'controller:baseline-human-player',
    },
    {
      combatantId: monster.id,
      controller: new AlgorithmController(),
      controllerId: 'controller:baseline-algorithm-monster',
    },
  ]);
  const store = new MemoryBrowserSessionStore();
  const rng = mulberry32(SEED);
  const journal = EncounterSessionJournal.create({
    sessionId,
    branchId,
    encounterState: initialState,
    coordinatorState: INITIAL_COORDINATOR_STATE,
    controllers: registry.identities(),
    rng,
    store,
    mirror: new MemoryMirrorSink(),
  });
  const coordinator = new TurnCoordinator(initialState, registry, rng, {
    persistence: journal,
  });

  const initiativeStep = await coordinator.step();
  if (initiativeStep.kind !== 'applied') fail('initiative step was refused');
  if (coordinator.state().activeCombatant !== player.id) {
    fail('fixed seed and initiative bonuses did not select the human player');
  }

  void coordinator.step();
  await Promise.resolve();
  await Promise.resolve();

  const humanRequest = human.pendingRequest();
  if (humanRequest === null) fail('HumanController has no genuinely pending request');
  const revisions = store.revisions(sessionId);
  const latest = revisions.at(-1);
  if (latest === undefined) fail('MemoryBrowserSessionStore has no persisted revision');
  if (latest.transition.kind !== 'controller_request_issued') {
    fail(`latest transition is ${latest.transition.kind}, not controller_request_issued`);
  }
  if (latest.coordinatorState.pendingRequest === null) {
    fail('persisted coordinator state has no pending request');
  }
  if (canonicalJson(latest.coordinatorState.pendingRequest) !== canonicalJson(humanRequest)) {
    fail('human and persisted pending requests differ');
  }
  if (latest.coordinatorState.pause !== null) fail('coordinator is unexpectedly paused');
  if (latest.coordinatorState.pendingCommand !== null) {
    fail('coordinator has a command before the human responded');
  }
  if (
    latest.coordinatorState.continuation.kind !== 'turn' ||
    latest.coordinatorState.continuation.actor !== player.id
  ) {
    fail('persisted continuation is not the human player turn');
  }
  const { checksum: _checksum, ...revisionBody } = latest;
  if (sha256(canonicalJson(revisionBody)) !== latest.checksum) {
    fail('persisted revision checksum does not match its canonical body');
  }

  const pendingRequestSha256 = sha256(canonicalJson(humanRequest));
  const coordinatorStateSha256 = sha256(canonicalJson(latest.coordinatorState));
  const fixture = {
    schemaVersion: 1,
    capturedFrom: CAPTURED_FROM,
    capturedAt: fixedClock().toISOString(),
    reconstruction: {
      seed: SEED,
      clock: {
        kind: 'fixed',
        iso: FIXED_CLOCK_ISO,
      },
      sessionId,
      branchId,
      encounter: {
        fixture: 'tests/unit/combat/fixtures.ts playerProfile/monsterProfile/placedToken',
        bounds: { columns: 6, rows: 2 },
        player: {
          key: 'baseline-human-player',
          initiativeBonus: 20,
          token: { column: 0, row: 0 },
        },
        monster: {
          key: 'baseline-algorithm-monster',
          initiativeBonus: -20,
          hitPoints: 20,
          token: { column: 5, row: 0 },
        },
      },
      controllers: registry.identities(),
    },
    revisionIndex: latest.revision,
    revisionChecksum: latest.checksum,
    encounterState: latest.encounterState,
    coordinatorState: latest.coordinatorState,
    hashes: {
      pendingRequestCanonicalJsonSha256: pendingRequestSha256,
      coordinatorStateCanonicalJsonSha256: coordinatorStateSha256,
    },
  } as const;
  const fixtureBytes = `${canonicalJson(fixture)}\n`;
  const fixtureSha256 = sha256(fixtureBytes);

  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  writeFileSync(join(OUTPUT_DIRECTORY, FIXTURE_FILENAME), fixtureBytes, 'utf8');
  writeFileSync(
    join(OUTPUT_DIRECTORY, SHA_FILENAME),
    `${fixtureSha256}  ${FIXTURE_FILENAME}\n`,
    'utf8',
  );

  console.log(`capturedFrom=${CAPTURED_FROM}`);
  console.log(`capturedAt=${fixedClock().toISOString()}`);
  console.log(`waitingCombatant=${player.id}`);
  console.log(`requestKind=${humanRequest.kind}`);
  console.log(`requestId=${humanRequest.requestId}`);
  console.log(`encounterRevision=${humanRequest.encounterRevision}`);
  console.log(`legalActionCount=${humanRequest.legalActions.actions.length}`);
  console.log(`storeRevisionIndex=${latest.revision}`);
  console.log(`storeRevisionChecksum=${latest.checksum}`);
  console.log(`pendingRequestCanonicalJsonSha256=${pendingRequestSha256}`);
  console.log(`coordinatorStateCanonicalJsonSha256=${coordinatorStateSha256}`);
  console.log(`fixtureSha256=${fixtureSha256}`);
}

await capture();
