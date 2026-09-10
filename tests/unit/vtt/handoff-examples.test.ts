import {
  mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import type { LegalActionSummary } from '../../../src/combat/controllers';
import type { EncounterState } from '../../../src/combat/encounter';
import type { CombatantId } from '../../../src/combat/values';
import {
  EncounterSessionService,
  type PlayerSeatRegistration,
} from '../../../src/vtt/encounter-session-service';
import { DmEncounterHost } from '../../../src/vtt/dm-encounter-host';
import {
  buildTwoRoomEncounter,
  TWO_ROOM_CLOCK,
  TWO_ROOM_SCENE_ID,
  TWO_ROOM_SEED,
  twoRoomArtPackage,
} from '../../../src/vtt/handoff/fixtures/two-room';
import { InProcessSceneTransport } from '../../../src/vtt/handoff/in-process-transport';
import {
  ProtocolRuntime,
  type HandoffResponse,
  type SceneSnapshotEvent,
} from '../../../src/vtt/handoff/protocol-runtime';
import type { SceneTransport } from '../../../src/vtt/handoff/scene-transport';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
import { encounterSeed } from '../../../src/vtt/session-seed';
import type { ProjectedControllerRequest } from '../../../src/vtt/encounter-projections';
import { publishCore, publishExamples } from '../../../tools/vtt-handoff/publish';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

const DOOR_ID = 'object:two-room-door';
const PLAYER_A = 'player:adventurer';
const PLAYER_B = 'player:goblin';

type ExampleChannel = 'dm' | 'player:adventurer' | 'player:goblin' | 'unauthorized';

interface ExampleExchange {
  readonly label: string;
  readonly channel: ExampleChannel;
  readonly request: Readonly<Record<string, unknown>>;
  readonly response: HandoffResponse;
  readonly eventCounts: Readonly<Record<Exclude<ExampleChannel, 'unauthorized'>, number>>;
}

export interface HandoffExamplesFixture {
  readonly schemaVersion: 1;
  readonly seed: number;
  readonly clock: string;
  readonly sceneId: string;
  readonly exchanges: readonly ExampleExchange[];
  readonly events: Readonly<Record<Exclude<ExampleChannel, 'unauthorized'>, readonly SceneSnapshotEvent[]>>;
}

interface TreeDirectory {
  readonly kind: 'directory';
  readonly path: string;
}

interface TreeFile {
  readonly kind: 'file';
  readonly path: string;
  readonly bytes: string;
  readonly mtimeMs: number;
  readonly size: number;
}

type TreeEntry = TreeDirectory | TreeFile;

function completeTree(root: string, directory = root): readonly TreeEntry[] {
  const current: TreeDirectory = { kind: 'directory', path: relative(root, directory) || '.' };
  return [
    current,
    ...readdirSync(directory, { withFileTypes: true }).flatMap((entry): readonly TreeEntry[] => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return completeTree(root, path);
      const stat = statSync(path);
      return [{
        kind: 'file',
        path: relative(root, path),
        bytes: readFileSync(path).toString('base64'),
        mtimeMs: stat.mtimeMs,
        size: stat.size,
      }];
    }),
  ].sort((left, right) => left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind));
}

function assertTreeUnchanged(before: readonly TreeEntry[], after: readonly TreeEntry[]): void {
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('EXAMPLES_CHECK_MUTATED_TREE');
}

const S2C_PATHS = [
  'contracts/v1/protocol.schema.json',
  'contracts/v1/art.schema.json',
  'contracts/v1/contracts.d.ts',
  'fixtures/scenes/two-room.v1.json',
  'fixtures/scenes/two-room.snapshots.v1.json',
  'contracts/v1/README.md',
  'contracts/v1/manifest.json',
  'contracts/v1/READY.json',
] as const;

function fileBytes(root: string, paths: readonly string[]): Readonly<Record<string, string>> {
  return Object.fromEntries(paths.map((path) => [path, readFileSync(join(root, path)).toString('base64')]));
}

function legalActions(state: EncounterState, actor: CombatantId): LegalActionSummary {
  const token = state.tokens.find((candidate) => candidate.combatantId === actor);
  if (token === undefined) return { actions: [{ type: 'end_turn', actor }] };
  const direction = token.position.column < 5 ? 1 : -1;
  const destination = { column: token.position.column + direction, row: token.position.row };
  return {
    actions: [
      { type: 'move', actor, path: [destination], cause: 'voluntary' },
      { type: 'end_turn', actor },
    ],
  };
}

function registrations(host: DmEncounterHost): readonly [PlayerSeatRegistration, PlayerSeatRegistration] {
  const combatants = host.snapshot().dm.encounter.combatants;
  const tokens = host.rendererTokenBindings();
  const rows = combatants.map((combatant, index): PlayerSeatRegistration => {
    const token = tokens.find((candidate) => candidate.combatantId === combatant.id);
    if (token === undefined) throw new Error(`Missing transcript token for ${combatant.id}.`);
    const playerId = index === 0 ? PLAYER_A : PLAYER_B;
    return {
      playerId,
      seatId: `seat:${playerId}`,
      observerCombatantId: combatant.id,
      ownedCombatantIds: [combatant.id],
      controlledTokenIds: [token.tokenId],
    };
  });
  const first = rows[0];
  const second = rows[1];
  if (first === undefined || second === undefined) throw new Error('The transcript requires exactly two seats.');
  return [first, second];
}

function waitForOffer(
  service: EncounterSessionService,
  seats: readonly PlayerSeatRegistration[],
): Promise<{ readonly seat: PlayerSeatRegistration; readonly request: ProjectedControllerRequest }> {
  return new Promise((resolve, reject) => {
    const unsubscribers: Array<() => void> = [];
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for the transcript offer.')), 2_000);
    for (const seat of seats) {
      const subscription = service.subscribePlayer(seat.playerId, (event) => {
        if (event.projection.pendingRequest === null) return;
        clearTimeout(timeout);
        for (const unsubscribe of unsubscribers) unsubscribe();
        resolve({ seat, request: event.projection.pendingRequest });
      });
      if (subscription.kind === 'subscribed') unsubscribers.push(subscription.unsubscribe);
    }
  });
}

export async function buildHandoffExamples(): Promise<HandoffExamplesFixture> {
  const state = buildTwoRoomEncounter();
  const host = new DmEncounterHost(TWO_ROOM_SCENE_ID, new MemoryBrowserSessionStore(), {
    initialState: state,
    initialSeed: encounterSeed(TWO_ROOM_SEED),
    initialControllers: state.combatants.map((combatant) => ({
      combatantId: combatant.profile.id,
      controllerId: `${combatant.profile.id}:examples-human`,
      kind: 'human' as const,
      generation: 0,
    })),
    playerIds: state.combatants.map((combatant) => combatant.profile.id),
    turnLegalActions: legalActions,
  });
  const seats = registrations(host);
  const service = new EncounterSessionService(host, seats);
  const events: Record<Exclude<ExampleChannel, 'unauthorized'>, SceneSnapshotEvent[]> = {
    dm: [],
    'player:adventurer': [],
    'player:goblin': [],
  };
  const runtime = (principal: { readonly role: 'dm' } | { readonly role: 'player'; readonly playerId: string }): ProtocolRuntime =>
    new ProtocolRuntime({
      service,
      principal,
      seats,
      art: twoRoomArtPackage(),
      tokenBindings: () => host.rendererTokenBindings(),
    });
  const dm = new InProcessSceneTransport(runtime({ role: 'dm' }));
  const playerA = new InProcessSceneTransport(runtime({ role: 'player', playerId: PLAYER_A }));
  const playerB = new InProcessSceneTransport(runtime({ role: 'player', playerId: PLAYER_B }));
  const unauthorized = new InProcessSceneTransport(runtime({ role: 'player', playerId: PLAYER_A }));
  const transports: Record<Exclude<ExampleChannel, 'unauthorized'>, SceneTransport> = {
    dm,
    'player:adventurer': playerA,
    'player:goblin': playerB,
  };
  for (const channel of ['dm', PLAYER_A, PLAYER_B] as const) {
    transports[channel].subscribe((event) => events[channel].push(event));
  }
  const exchanges: ExampleExchange[] = [];
  const exchange = async (
    label: string,
    channel: ExampleChannel,
    transport: SceneTransport,
    request: Readonly<Record<string, unknown>>,
  ): Promise<HandoffResponse> => {
    const response = await transport.request(request);
    exchanges.push({
      label,
      channel,
      request,
      response,
      eventCounts: {
        dm: events.dm.length,
        'player:adventurer': events[PLAYER_A].length,
        'player:goblin': events[PLAYER_B].length,
      },
    });
    return response;
  };

  await exchange('dm.open', 'dm', dm, {
    v: 1, id: 'open:dm', method: 'session.open', params: { requestedRole: 'dm' },
  });
  await exchange('player-a.open', PLAYER_A, playerA, {
    v: 1, id: 'open:player-a', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_A },
  });
  await exchange('player-b.open', PLAYER_B, playerB, {
    v: 1, id: 'open:player-b', method: 'session.open', params: { requestedRole: 'player', playerId: PLAYER_B },
  });
  await exchange('dm.snapshot', 'dm', dm, {
    v: 1, id: 'snapshot:dm', method: 'scene.snapshot', params: {},
  });
  await exchange('player-a.snapshot', PLAYER_A, playerA, {
    v: 1, id: 'snapshot:player-a', method: 'scene.snapshot', params: {},
  });
  await exchange('player-b.snapshot', PLAYER_B, playerB, {
    v: 1, id: 'snapshot:player-b', method: 'scene.snapshot', params: {},
  });

  const offerPromise = waitForOffer(service, seats);
  void service.start();
  const offer = await offerPromise;
  const moveIndex = offer.request.legalActions.findIndex((action) => action.type === 'move');
  const move = offer.request.legalActions[moveIndex];
  if (move?.type !== 'move') throw new Error('The transcript requires a real offered move.');
  const destination = move.path.at(-1);
  if (destination === undefined) throw new Error('The transcript offered move has no destination.');
  const activeTransport = offer.seat.playerId === PLAYER_A ? playerA : playerB;
  const activeChannel = offer.seat.playerId === PLAYER_A ? PLAYER_A : PLAYER_B;
  const activeTokenId = offer.seat.controlledTokenIds[0];
  if (activeTokenId === undefined) throw new Error('The active transcript seat has no token.');
  await exchange('token.move', activeChannel, activeTransport, {
    v: 1, id: 'mutation:move', method: 'token.move',
    params: { tokenId: activeTokenId, to: { x: destination.column, y: destination.row, z: 0 } },
  });
  await exchange('door.open', 'dm', dm, {
    v: 1, id: 'mutation:door-open', method: 'door.set', params: { doorId: DOOR_ID, open: true },
  });
  await exchange('door.close', 'dm', dm, {
    v: 1, id: 'mutation:door-close', method: 'door.set', params: { doorId: DOOR_ID, open: false },
  });
  await exchange('door.close-noop', 'dm', dm, {
    v: 1, id: 'mutation:door-noop', method: 'door.set', params: { doorId: DOOR_ID, open: false },
  });
  await exchange('light.unsupported', 'dm', dm, {
    v: 1, id: 'mutation:light', method: 'light.set', params: { lightId: 'light:object:object:two-room-torch', enabled: false },
  });
  await exchange('unauthorized.role', 'unauthorized', unauthorized, {
    v: 1, id: 'unauthorized:dm', method: 'session.open', params: { requestedRole: 'dm' },
  });
  const otherSeat = seats.find((seat) => seat.playerId !== offer.seat.playerId);
  const otherToken = otherSeat?.controlledTokenIds[0];
  if (otherToken === undefined) throw new Error('The transcript requires a cross-seat token.');
  await exchange('forbidden.cross-seat', activeChannel, activeTransport, {
    v: 1, id: 'mutation:cross-seat', method: 'token.move',
    params: { tokenId: otherToken, to: { x: destination.column, y: destination.row, z: 0 } },
  });
  const illegal = {
    v: 1, id: 'mutation:illegal', method: 'token.move',
    params: { tokenId: activeTokenId, to: { x: 0, y: 0, z: 0 } },
  };
  await exchange('illegal.move', activeChannel, activeTransport, illegal);
  await exchange('duplicate.illegal-id', activeChannel, activeTransport, illegal);

  dm.close();
  playerA.close();
  playerB.close();
  unauthorized.close();
  dm.destroySession();
  return {
    schemaVersion: 1,
    seed: TWO_ROOM_SEED,
    clock: TWO_ROOM_CLOCK,
    sceneId: TWO_ROOM_SCENE_ID,
    exchanges,
    events,
  };
}

function exchange(fixture: HandoffExamplesFixture, label: string): ExampleExchange {
  const found = fixture.exchanges.find((candidate) => candidate.label === label);
  if (found === undefined) throw new Error(`Missing transcript exchange ${label}.`);
  return found;
}

describe('real executable VTT handoff examples', () => {
  it('proves real service behavior independently before comparing tracked bytes', async () => {
    const fixture = await buildHandoffExamples();
    expect(fixture).toMatchObject({
      schemaVersion: 1, seed: 603_020_001,
      clock: '2026-09-09T12:00:00.000Z', sceneId: 'scene:two-room-v1',
    });
    for (const label of [
      'dm.open', 'player-a.open', 'player-b.open',
      'dm.snapshot', 'player-a.snapshot', 'player-b.snapshot',
      'token.move', 'door.open', 'door.close', 'door.close-noop',
    ]) expect(exchange(fixture, label).response.ok).toBe(true);
    expect(exchange(fixture, 'light.unsupported').response).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
    expect(exchange(fixture, 'unauthorized.role').response).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(exchange(fixture, 'forbidden.cross-seat').response).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    expect(exchange(fixture, 'illegal.move').response).toMatchObject({ ok: false, error: { code: 'ILLEGAL_MOVE' } });
    expect(exchange(fixture, 'duplicate.illegal-id').response).toMatchObject({ ok: false, error: { code: 'DUPLICATE_MUTATION' } });
    const doorOpen = exchange(fixture, 'door.open').response;
    const doorClose = exchange(fixture, 'door.close').response;
    const doorNoop = exchange(fixture, 'door.close-noop').response;
    if (!doorOpen.ok || !doorClose.ok || !doorNoop.ok) throw new Error('Door transcript responses must succeed.');
    expect(doorClose.result.revision).toBe(Number(doorOpen.result.revision) + 1);
    expect(doorNoop.result.revision).toBe(doorClose.result.revision);
    for (const channel of ['dm', PLAYER_A, PLAYER_B] as const) {
      const stream = fixture.events[channel];
      expect(stream[0]?.seq).toBe(1);
      expect(stream.map((event) => event.seq)).toEqual(stream.map((_event, index) => index + 1));
      expect(stream.every((event) => event.v === 1 && event.event === 'scene.snapshot')).toBe(true);
    }
    expect(fixture.events.dm[0]?.data.tokens.map((token) => token.id).sort()).toEqual([
      'token:two-room-adventurer', 'token:two-room-goblin',
    ]);
    for (const event of fixture.events[PLAYER_A]) {
      expect(event.data.tokens.map((token) => token.id)).toEqual(['token:two-room-adventurer']);
    }
    for (const event of fixture.events[PLAYER_B]) {
      expect(event.data.tokens.map((token) => token.id)).toEqual([
        'token:two-room-adventurer', 'token:two-room-goblin',
      ]);
    }
    const moved = exchange(fixture, 'token.move');
    if (!moved.response.ok) throw new Error('The transcript move must succeed.');
    const movedRevision = moved.response.result.revision;
    const moveParams = moved.request.params;
    if (typeof moveParams !== 'object' || moveParams === null || Array.isArray(moveParams)) {
      throw new Error('The transcript move params are malformed.');
    }
    const tokenId = Reflect.get(moveParams, 'tokenId');
    const to = Reflect.get(moveParams, 'to');
    if (typeof tokenId !== 'string' || typeof to !== 'object' || to === null || Array.isArray(to)) {
      throw new Error('The transcript move destination is malformed.');
    }
    const moveEvent = fixture.events[moved.channel === PLAYER_A ? PLAYER_A : PLAYER_B]
      .find((event) => event.data.revision === movedRevision);
    expect(moveEvent?.data.tokens.find((token) => token.id === tokenId)).toMatchObject({
      x: Reflect.get(to, 'x'), y: Reflect.get(to, 'y'), z: Reflect.get(to, 'z'),
    });
    for (const label of ['token.move', 'door.open', 'door.close'] as const) {
      const committed = exchange(fixture, label).response;
      if (!committed.ok) throw new Error(`The transcript ${label} must succeed.`);
      for (const channel of ['dm', PLAYER_A, PLAYER_B] as const) {
        expect(fixture.events[channel].some(
          (event) => event.data.revision === committed.result.revision,
        )).toBe(true);
      }
    }
    const dmDoorStates = fixture.events.dm.flatMap((event) =>
      event.data.doors.find((door) => door.id === DOOR_ID)?.open ?? []);
    expect(dmDoorStates).toContain(true);
    expect(dmDoorStates.at(-1)).toBe(false);
    const openRevision = Number(doorOpen.result.revision);
    const closeRevision = Number(doorClose.result.revision);
    for (const channel of ['dm', PLAYER_A, PLAYER_B] as const) {
      expect(fixture.events[channel].find((event) => event.data.revision === openRevision)?.data.doors)
        .toContainEqual(expect.objectContaining({ id: DOOR_ID, open: true }));
      expect(fixture.events[channel].find((event) => event.data.revision === closeRevision)?.data.doors)
        .toContainEqual(expect.objectContaining({ id: DOOR_ID, open: false }));
    }
    expect(exchange(fixture, 'door.close-noop').eventCounts)
      .toEqual(exchange(fixture, 'door.close').eventCounts);
    const tracked = JSON.parse(readFileSync('fixtures/protocol/examples.v1.json', 'utf8')) as unknown;
    expect(tracked).toEqual(fixture);
  });

  it('publishes the append-only examples entry after core and seals examples READY last', () => {
    const handoffRoot = mkdtempSync(join(tmpdir(), 'vtt-handoff-examples-publish-'));
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    const coreBefore = fileBytes(handoffRoot, S2C_PATHS);
    const order: string[] = [];
    expect(publishExamples({
      repositoryRoot: process.cwd(), handoffRoot,
      hooks: { afterCreate: (path) => order.push(path) },
    })).toMatchObject({ status: 'published', files: 3 });
    expect(order).toEqual([
      'fixtures/protocol/examples.v1.json',
      'contracts/v1/manifest.entries/examples.json',
      'contracts/v1/examples.READY.json',
    ]);
    const ready = join(handoffRoot, 'contracts/v1/examples.READY.json');
    const before = statSync(ready).mtimeMs;
    expect(publishExamples({ repositoryRoot: process.cwd(), handoffRoot }).status).toBe('unchanged');
    expect(statSync(ready).mtimeMs).toBe(before);
    expect(fileBytes(handoffRoot, S2C_PATHS)).toEqual(coreBefore);
    const fixturePath = join(handoffRoot, 'fixtures/protocol/examples.v1.json');
    const fixtureBytes = readFileSync(fixturePath);
    const manifest = JSON.parse(readFileSync(
      join(handoffRoot, 'contracts/v1/manifest.entries/examples.json'), 'utf8',
    )) as unknown;
    expect(manifest).toEqual({
      schemaVersion: 1,
      bundle: 'contracts/v1',
      entries: [{
        path: 'fixtures/protocol/examples.v1.json',
        sha256: createHash('sha256').update(fixtureBytes).digest('hex'),
        length: fixtureBytes.length,
      }],
    });
    const beforeCheck = completeTree(handoffRoot);
    expect(publishExamples({ repositoryRoot: process.cwd(), handoffRoot, check: true }).status).toBe('verified');
    assertTreeUnchanged(beforeCheck, completeTree(handoffRoot));
    expect(fileBytes(handoffRoot, S2C_PATHS)).toEqual(coreBefore);
  });

  it('keeps the complete tree and every core byte unchanged on missing examples checks', () => {
    const handoffRoot = mkdtempSync(join(tmpdir(), 'vtt-handoff-examples-missing-'));
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    const coreBefore = fileBytes(handoffRoot, S2C_PATHS);
    const beforeCheck = completeTree(handoffRoot);
    expect(() => publishExamples({ repositoryRoot: process.cwd(), handoffRoot, check: true }))
      .toThrow('IMMUTABLE_BUNDLE_MISSING');
    assertTreeUnchanged(beforeCheck, completeTree(handoffRoot));
    expect(fileBytes(handoffRoot, S2C_PATHS)).toEqual(coreBefore);
  });

  it('keeps the complete tree and every core byte unchanged on conflicting examples checks', () => {
    const handoffRoot = mkdtempSync(join(tmpdir(), 'vtt-handoff-examples-conflict-'));
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    publishExamples({ repositoryRoot: process.cwd(), handoffRoot });
    const coreBefore = fileBytes(handoffRoot, S2C_PATHS);
    writeFileSync(join(handoffRoot, 'fixtures/protocol/examples.v1.json'), '{}\n');
    const beforeCheck = completeTree(handoffRoot);
    expect(() => publishExamples({ repositoryRoot: process.cwd(), handoffRoot, check: true }))
      .toThrow('INCONSISTENT_SEALED_BUNDLE');
    assertTreeUnchanged(beforeCheck, completeTree(handoffRoot));
    expect(fileBytes(handoffRoot, S2C_PATHS)).toEqual(coreBefore);
  });

  it('proves complete-tree controls detect directory creation and payload writes', () => {
    const handoffRoot = mkdtempSync(join(tmpdir(), 'vtt-handoff-examples-controls-'));
    publishCore({ repositoryRoot: process.cwd(), handoffRoot });
    publishExamples({ repositoryRoot: process.cwd(), handoffRoot });
    const baseline = completeTree(handoffRoot);

    const unexpected = join(handoffRoot, 'contracts/v1/unexpected-check-directory');
    mkdirSync(unexpected);
    expect(() => assertTreeUnchanged(baseline, completeTree(handoffRoot)))
      .toThrow('EXAMPLES_CHECK_MUTATED_TREE');
    rmSync(unexpected, { recursive: true });
    expect(() => assertTreeUnchanged(baseline, completeTree(handoffRoot))).not.toThrow();

    const fixturePath = join(handoffRoot, 'fixtures/protocol/examples.v1.json');
    const fixtureBytes = readFileSync(fixturePath);
    writeFileSync(fixturePath, '{}\n');
    expect(() => assertTreeUnchanged(baseline, completeTree(handoffRoot)))
      .toThrow('EXAMPLES_CHECK_MUTATED_TREE');
    writeFileSync(fixturePath, fixtureBytes);
    expect(readFileSync(fixturePath).equals(fixtureBytes)).toBe(true);
    const restored = completeTree(handoffRoot);
    expect(publishExamples({ repositoryRoot: process.cwd(), handoffRoot, check: true }).status).toBe('verified');
    expect(() => assertTreeUnchanged(restored, completeTree(handoffRoot))).not.toThrow();
  });
});
