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

  it('selects abilities for a persisted character with only a class', async () => {
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

  it('selects background for a persisted character with class and species', async () => {
    const db = await realDatabase();
    seedClassProgressions(db);
    const characterId = createCharacter(db, 'Classed Species');
    addClassLevel(db, characterId, 'Wizard', 1);
    db.exec(
      `UPDATE characters
       SET ability_allocation_method = 'standard_array'
       WHERE id = ?`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species
         (character_id, name, creature_type, size, base_speed_feet)
       VALUES (?, 'Test Species', 'Humanoid', 'Medium', 30)`,
      [characterId],
    );

    expect(guidedBuildState(db, characterId)).toEqual({
      kind: 'ready',
      character_id: characterId,
      current_step: seamStep(3),
    } satisfies GuidedBuildStateResult);
  });

  it('selects skills while an ACTIVE class grant is unfilled, and equipment once it fills (S-C)', async () => {
    const db = await realDatabase();
    seedClassProgressions(db);
    const characterId = createCharacter(db, 'Classed Species Background');
    addClassLevel(db, characterId, 'Wizard', 1);
    db.exec(
      `UPDATE characters
       SET ability_allocation_method = 'standard_array'
       WHERE id = ?`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_species
         (character_id, name, creature_type, size, base_speed_feet)
       VALUES (?, 'Test Species', 'Humanoid', 'Medium', 30)`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_background (character_id, name)
       VALUES (?, 'Test Background')`,
      [characterId],
    );

    // The skills step is detected PER GRANT (skills-with-provenance §3.6),
    // not by a literal: this hand-built fixture minted no grants, so it
    // honestly owes nothing and rests on the step AFTER skills.
    expect(guidedBuildState(db, characterId)).toEqual({
      kind: 'ready',
      character_id: characterId,
      current_step: seamStep(5),
    } satisfies GuidedBuildStateResult);

    // An unfilled ACTIVE class grant is exactly what holds the step open.
    const sourceId = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, state
       ) VALUES (?, ?, 'class',
         (SELECT id FROM class_definitions WHERE name = 'Wizard'),
         'Wizard 1', 'active')`,
      [characterId, crypto.randomUUID()],
    ).lastInsertId;
    const grantId = db.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state
       ) VALUES (?, ?, 'class_skill', 1, NULL, 'active')`,
      [characterId, sourceId],
    ).lastInsertId;
    expect(guidedBuildState(db, characterId)).toEqual({
      kind: 'ready',
      character_id: characterId,
      current_step: seamStep(4),
    } satisfies GuidedBuildStateResult);

    // Filling it — the grant's OWN skill, never a count — releases the step.
    db.exec(`UPDATE character_skill_grants SET skill = 'arcana' WHERE id = ?`, [
      grantId,
    ]);
    expect(guidedBuildState(db, characterId)).toEqual({
      kind: 'ready',
      character_id: characterId,
      current_step: seamStep(5),
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
