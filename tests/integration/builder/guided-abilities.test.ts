import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  GUIDED_LEVEL_ONE_STEP_ORDER,
  GUIDED_RPC,
  countAbilitiesAtLeastPlusTwo,
  hasWeakScores,
  type AbilityAllocationMethod,
  type GuidedAbilityScores,
  type GuidedAllocateAbilitiesResult,
} from '../../../src/builder/contracts';
import {
  allocateGuidedAbilities,
  createGuidedCharacter,
  guidedBuildState,
  readGuidedStepEvidence,
} from '../../../src/builder/guided-creation';
import { CharacterState } from '../../../src/character/character-state';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { DatabaseContext } from '../../../src/db/database';
import { bundledClassContentKeys } from '../../../src/rules/class-progression-lookup';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import { handlers as guidedHandlers } from '../../../src/worker/handlers/guided';
import { rpcRegistry } from '../../../src/worker/registry';
import { openTestDatabase } from '../../helpers/open-db';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

const ALL_TENS: GuidedAbilityScores = {
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

const TWO_STRONG: GuidedAbilityScores = {
  strength: 15,
  dexterity: 15,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
};

const ALLOCATED_COLUMNS =
  'strength, dexterity, constitution, intelligence, wisdom, charisma, ability_allocation_method';

let harness: RpcHarness | undefined;
const connections: Database[] = [];

afterEach(() => {
  harness?.close();
  harness = undefined;
  for (const connection of connections.splice(0)) {
    connection.close();
  }
});

function firstBundledClass(): string {
  const contentKey = bundledClassContentKeys().classes[0];
  if (contentKey === undefined) {
    throw new Error('The bundled class catalogue is empty.');
  }
  return contentKey;
}

async function guidedCharacter(
  rpcHarness: RpcHarness,
  name: string,
): Promise<number> {
  const row = createGuidedCharacter(
    rpcHarness.context.db,
    { name, class_content_key: firstBundledClass() },
    new CharacterCommandIntegrity('guided-abilities-test-key'),
  );
  return row.id;
}

function stepAfterAbilities() {
  const step = GUIDED_LEVEL_ONE_STEP_ORDER[2];
  if (step === undefined) {
    throw new Error('The seam has no step after abilities.');
  }
  return step;
}

async function allocateThroughRpc(
  rpcHarness: RpcHarness,
  characterId: number,
  method: AbilityAllocationMethod,
  scores: GuidedAbilityScores,
  operationUuid: string,
): Promise<GuidedAllocateAbilitiesResult> {
  const response = await rpcRegistry.dispatch(
    {
      id: 1,
      method: GUIDED_RPC.allocateAbilities,
      params: {
        character_id: characterId,
        method,
        scores,
        operation_uuid: operationUuid,
        expected_revision: 0,
      },
    },
    rpcHarness.context,
  );
  if (!response.ok) {
    throw new Error(
      `Ability allocation was refused: ${response.error.code} ${response.error.message}`,
    );
  }
  return response.result as GuidedAllocateAbilitiesResult;
}

function expectPersistedAllocation(
  db: DatabaseContext,
  characterId: number,
  method: AbilityAllocationMethod,
  scores: GuidedAbilityScores,
): void {
  expect(
    db.oneRaw(
      `SELECT ${ALLOCATED_COLUMNS} FROM characters WHERE id = ?`,
      [characterId],
    ),
  ).toEqual({ ...scores, ability_allocation_method: method });
}

describe('B1-ALLOC: allocation uses an explicit persisted signal', () => {
  it('distinguishes allocated all-10s from a fresh character with the same six scores', async () => {
    harness = await createRpcHarness(guidedHandlers);
    const allocatedId = await guidedCharacter(harness, 'Allocated Tens');
    const freshId = await guidedCharacter(harness, 'Fresh Tens');

    const result = await allocateThroughRpc(
      harness,
      allocatedId,
      'manual',
      ALL_TENS,
      '10000000-0000-4000-8000-000000000001',
    );

    expect(result.current_step).toBe(stepAfterAbilities());
    expectPersistedAllocation(
      harness.context.db,
      allocatedId,
      'manual',
      ALL_TENS,
    );
    expect(readGuidedStepEvidence(harness.context.db, allocatedId))
      .toMatchObject({ abilitiesAllocated: true });
    expect(guidedBuildState(harness.context.db, allocatedId))
      .toMatchObject({ kind: 'ready', current_step: stepAfterAbilities() });

    expect(
      harness.context.db.oneRaw(
        `SELECT ${ALLOCATED_COLUMNS} FROM characters WHERE id = ?`,
        [freshId],
      ),
    ).toEqual({ ...ALL_TENS, ability_allocation_method: null });
    expect(readGuidedStepEvidence(harness.context.db, freshId))
      .toMatchObject({ abilitiesAllocated: false });
    expect(guidedBuildState(harness.context.db, freshId))
      .toMatchObject({
        kind: 'ready',
        current_step: GUIDED_LEVEL_ONE_STEP_ORDER[1],
      });
  });
});

describe('B1-BLOCK: warnings accompany successful allocations as result data', () => {
  const journeys = [
    {
      name: 'point buy',
      method: 'point_buy',
      scores: TWO_STRONG,
      warning: {
        kind: 'non_standard_method',
        method: 'point_buy',
      },
      operation: '20000000-0000-4000-8000-000000000001',
    },
    {
      name: 'manual entry',
      method: 'manual',
      scores: TWO_STRONG,
      warning: {
        kind: 'non_standard_method',
        method: 'manual',
      },
      operation: '20000000-0000-4000-8000-000000000002',
    },
    {
      name: 'weak result',
      method: 'point_buy',
      scores: ALL_TENS,
      warning: {
        kind: 'weak_scores',
        at_least_plus_two: 0,
      },
      operation: '20000000-0000-4000-8000-000000000003',
    },
  ] as const;

  for (const journey of journeys) {
    it(`${journey.name}: writes the signal and advances while returning the warning`, async () => {
      harness = await createRpcHarness(guidedHandlers);
      const characterId = await guidedCharacter(
        harness,
        `Warning ${journey.name}`,
      );

      const result = await allocateThroughRpc(
        harness,
        characterId,
        journey.method,
        journey.scores,
        journey.operation,
      );

      expectPersistedAllocation(
        harness.context.db,
        characterId,
        journey.method,
        journey.scores,
      );
      expect(result.current_step).toBe(stepAfterAbilities());
      expect(result.warnings).toContainEqual(journey.warning);
    });
  }

  it('uses the seam weakness predicate: fewer than two scores at 14+ warns', () => {
    expect(countAbilitiesAtLeastPlusTwo(ALL_TENS)).toBe(0);
    expect(hasWeakScores(ALL_TENS)).toBe(true);
    expect(countAbilitiesAtLeastPlusTwo(TWO_STRONG)).toBe(2);
    expect(hasWeakScores(TWO_STRONG)).toBe(false);
  });
});

describe('B1-SIGNAL: all-10s sharing preserves allocation', () => {
  it('exports compressed all-10s and imports them as allocated', async () => {
    const sourceConnection = await openTestDatabase();
    const targetConnection = await openTestDatabase();
    connections.push(sourceConnection, targetConnection);
    const source = new DatabaseContext(sourceConnection);
    const target = new DatabaseContext(targetConnection);
    const characterId = source.exec(
      `INSERT INTO characters (
         name, ability_allocation_method
       ) VALUES ('Shared Tens', 'manual')`,
    ).lastInsertId;

    const exported = exportCharacterShare(source, characterId);
    expect(exported.character).toEqual({
      name: 'Shared Tens',
      ability_allocation_method: 'manual',
    });

    const document = await decodeShareFragment(
      await encodeShareFragment(exported),
    );
    const imported = importCharacterShare(target, document);

    expect(
      target.oneRaw(
        `SELECT ${ALLOCATED_COLUMNS} FROM characters WHERE id = ?`,
        [imported.characterId],
      ),
    ).toEqual({ ...ALL_TENS, ability_allocation_method: 'manual' });
    expect(readGuidedStepEvidence(target, imported.characterId))
      .toMatchObject({ abilitiesAllocated: true });
  });
});

describe('allocation undo and pre-v8 snapshots', () => {
  it('undoes all six scores and restores NULL for a character never previously allocated', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    const characterId = db.exec(
      `INSERT INTO characters (
         name, strength, dexterity, constitution, intelligence, wisdom, charisma
       ) VALUES ('Undo Allocation', 11, 12, 13, 14, 15, 16)`,
    ).lastInsertId;
    const executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity('allocation-undo-test-key'),
    );

    const allocated = await executor.execute({
      character_id: characterId,
      operation_uuid: '30000000-0000-4000-8000-000000000001',
      expected_revision: 0,
      command: {
        type: 'allocate_abilities',
        method: 'manual',
        scores: ALL_TENS,
      },
    });
    expectPersistedAllocation(db, characterId, 'manual', ALL_TENS);

    await executor.undo({
      character_id: characterId,
      operation_uuid: allocated.operation_uuid,
      expected_revision: 1,
    });

    expect(
      db.oneRaw(
        `SELECT ${ALLOCATED_COLUMNS} FROM characters WHERE id = ?`,
        [characterId],
      ),
    ).toEqual({
      strength: 11,
      dexterity: 12,
      constitution: 13,
      intelligence: 14,
      wisdom: 15,
      charisma: 16,
      ability_allocation_method: null,
    });
  });

  it('restores a constructed pre-a7-v8 snapshot with the allocation column as NULL', () => {
    const connectionPromise = openTestDatabase();
    return connectionPromise.then((connection) => {
      connections.push(connection);
      const db = new DatabaseContext(connection);
      const characterId = db.exec(
        `INSERT INTO characters (
           name, strength, dexterity, constitution, intelligence, wisdom,
           charisma, ability_allocation_method
         ) VALUES ('Legacy Snapshot', 11, 12, 13, 14, 15, 16, NULL)`,
      ).lastInsertId;
      const state = new CharacterState(db);
      const legacy = structuredClone(state.capture(characterId)) as unknown as
        Record<string, unknown>;
      legacy['schema_version'] = 'a7-v7';
      const character = legacy['character'];
      if (typeof character !== 'object' || character === null) {
        throw new Error('The constructed snapshot has no character object.');
      }
      delete (character as Record<string, unknown>)['ability_allocation_method'];

      db.exec(
        `UPDATE characters
         SET strength = 20, dexterity = 20, constitution = 20,
             intelligence = 20, wisdom = 20, charisma = 20,
             ability_allocation_method = 'manual'
         WHERE id = ?`,
        [characterId],
      );

      state.restore(
        characterId,
        legacy as unknown as Parameters<CharacterState['restore']>[1],
      );

      expect(
        db.oneRaw(
          `SELECT ${ALLOCATED_COLUMNS} FROM characters WHERE id = ?`,
          [characterId],
        ),
      ).toEqual({
        strength: 11,
        dexterity: 12,
        constitution: 13,
        intelligence: 14,
        wisdom: 15,
        charisma: 16,
        ability_allocation_method: null,
      });
    });
  });
});

describe('allocateGuidedAbilities direct real-database contract', () => {
  it('returns warning data after committing rather than using a refusal channel', async () => {
    harness = await createRpcHarness([]);
    const characterId = await guidedCharacter(harness, 'Direct Allocation');

    await expect(
      allocateGuidedAbilities(
        harness.context.db,
        {
          character_id: characterId,
          method: 'manual',
          scores: ALL_TENS,
          operation_uuid: '40000000-0000-4000-8000-000000000001',
          expected_revision: 0,
        },
        new CharacterCommandIntegrity('guided-abilities-test-key'),
      ),
    ).resolves.toEqual({
      character_id: characterId,
      current_step: stepAfterAbilities(),
      warnings: [
        { kind: 'non_standard_method', method: 'manual' },
        { kind: 'weak_scores', at_least_plus_two: 0 },
      ],
    });
  });
});
