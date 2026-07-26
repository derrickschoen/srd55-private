import { afterEach, describe, expect, it } from 'vitest';
import type {
  CompletenessCount,
  CompletenessResult,
} from '../../../src/queries/character-completeness';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  handlers as queryHandlers,
} from '../../../src/worker/handlers/queries';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import {
  createBuildReportFixture,
  persistedReportTableHashes,
} from '../reports/build-report-fixture';

let harness: RpcHarness | undefined;

afterEach(() => {
  harness?.close();
  harness = undefined;
});

describe('completeness RPCs', () => {
  it('is discovered by the registry under both new method names', () => {
    expect(rpcRegistry.methods).toContain(
      'queries.characters.completeness',
    );
    expect(rpcRegistry.methods).toContain(
      'queries.characters.outstanding',
    );
  });

  it('returns the character result and the batch counts without writing anything', async () => {
    harness = await createRpcHarness(queryHandlers);
    const fixture = createBuildReportFixture(harness.context.db);
    const before = persistedReportTableHashes(
      harness.context.db,
      fixture.characterId,
    );

    const single = await harness.call<
      { character_id: number },
      CompletenessResult
    >('queries.characters.completeness', {
      character_id: fixture.characterId,
    });
    const batch = await harness.call<
      Record<string, never>,
      CompletenessCount[]
    >('queries.characters.outstanding', {});

    expect(single).toMatchObject({
      ok: true,
      result: {
        character_id: fixture.characterId,
        outstanding_count: expect.any(Number) as number,
        catalog_gap_count: expect.any(Number) as number,
      },
    });
    expect(batch).toEqual({
      id: 2,
      ok: true,
      result: [
        {
          character_id: fixture.characterId,
          // ONE: the build-report fixture's class has seeded sheet traits, so
          // it offers skill proficiencies, and none is recorded. Nobody but the
          // player can say which were picked, so it is genuinely outstanding
          // rather than a catalog gap.
          outstanding_count: 1,
          catalog_gap_count: 0,
        },
      ],
    });
    expect(
      persistedReportTableHashes(harness.context.db, fixture.characterId),
    ).toEqual(before);
  });

  it('reports an unknown character as an error rather than a plausible result', async () => {
    harness = await createRpcHarness(queryHandlers);

    expect(
      await harness.call('queries.characters.completeness', {
        character_id: 999999,
      }),
    ).toMatchObject({
      ok: false,
      error: { message: 'Character 999999 does not exist.' },
    });
  });

  it('rejects malformed params for both methods', async () => {
    harness = await createRpcHarness(queryHandlers);

    expect(
      await harness.call('queries.characters.completeness', {}),
    ).toMatchObject({ ok: false, error: { code: 'invalid_params' } });
    expect(
      await harness.call('queries.characters.outstanding', {
        character_id: 1,
      }),
    ).toMatchObject({ ok: false, error: { code: 'invalid_params' } });
  });
});
