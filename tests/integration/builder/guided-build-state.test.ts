import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GUIDED_LEVEL_ONE_STEP_ORDER,
  GUIDED_RPC,
  type GuidedBuildStateResult,
} from '../../../src/builder/contracts';
import { guidedBuildState } from '../../../src/builder/guided-creation';
import { DatabaseContext } from '../../../src/db/database';
import { rpcRegistry } from '../../../src/worker/registry';
import { handlers as guidedHandlers } from '../../../src/worker/handlers/guided';
import { openTestDatabase } from '../../helpers/open-db';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import {
  addClassLevel,
  createCharacter,
} from '../reports/build-report-fixture';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';

let connection: Database | undefined;
let harness: RpcHarness | undefined;

afterEach(() => {
  connection?.close();
  connection = undefined;
  harness?.close();
  harness = undefined;
});

async function realDatabase(): Promise<DatabaseContext> {
  connection = await openTestDatabase();
  return new DatabaseContext(connection);
}

function seamStep(index: number) {
  const step = GUIDED_LEVEL_ONE_STEP_ORDER[index];
  if (step === undefined) {
    throw new Error(`The seam has no guided step at index ${index}.`);
  }
  return step;
}

describe('guidedBuildState', () => {
  it('returns successful not_found evidence for an absent character', async () => {
    const db = await realDatabase();

    expect(guidedBuildState(db, 999_999)).toEqual({
      kind: 'not_found',
    } satisfies GuidedBuildStateResult);
  });

  it('selects the first seam-ordered step for a persisted classless character', async () => {
    const db = await realDatabase();
    const characterId = createCharacter(db, 'Classless');

    expect(guidedBuildState(db, characterId)).toEqual({
      kind: 'ready',
      character_id: characterId,
      current_step: seamStep(0),
    } satisfies GuidedBuildStateResult);
  });

  it('selects the next seam-ordered step for a persisted character with a class', async () => {
    const db = await realDatabase();
    seedClassProgressions(db);
    const characterId = createCharacter(db, 'Classed');
    addClassLevel(db, characterId, 'Wizard', 1);

    expect(guidedBuildState(db, characterId)).toEqual({
      kind: 'ready',
      character_id: characterId,
      current_step: seamStep(1),
    } satisfies GuidedBuildStateResult);
  });
});

describe('guided build-state RPC registry contract', () => {
  it('discovers the seam-defined method name', () => {
    expect(rpcRegistry.methods).toContain(GUIDED_RPC.buildState);
    expect(rpcRegistry.get(GUIDED_RPC.buildState)).toBeDefined();
  });

  it('rejects a malformed params object as invalid_params through the registry', async () => {
    harness = await createRpcHarness(guidedHandlers);

    await expect(
      rpcRegistry.dispatch(
        {
          id: 1,
          method: GUIDED_RPC.buildState,
          params: { character_id: 1, extra: true },
        },
        harness.context,
      ),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
  });

  it('returns the discriminated successful result through the registry', async () => {
    harness = await createRpcHarness(guidedHandlers);
    const characterId = createCharacter(harness.context.db, 'RPC Classless');

    await expect(
      rpcRegistry.dispatch(
        {
          id: 2,
          method: GUIDED_RPC.buildState,
          params: { character_id: characterId },
        },
        harness.context,
      ),
    ).resolves.toEqual({
      id: 2,
      ok: true,
      result: {
        kind: 'ready',
        character_id: characterId,
        current_step: seamStep(0),
      },
    });
  });
});
