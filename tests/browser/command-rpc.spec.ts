import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

test('commands.execute persists, replays, reports conflicts, and survives reload', async ({
  page,
}) => {
  // Measured 5.5s in isolation on 2026-07-31.
  test.setTimeout(20_000);
  await page.goto('/');
  await ready(page);
  const result = await page.evaluate(async () => {
    await window.staticApp.reset();
    const character = await window.staticApp.writeCharacter('RPC Hero');
    const operation = '50505050-5050-4050-8050-505050505050';
    const first = await window.appRpc.call<
      {
        character_id: number;
        operation_uuid: string;
        expected_revision: number;
        command: {
          type: 'update_ability';
          ability: 'wisdom';
          score: number;
          reason: string;
        };
      },
      {
        operation_uuid: string;
        revision: number;
        idempotent_replay: boolean;
      }
    >('commands.execute', {
      character_id: character.id,
      operation_uuid: operation,
      expected_revision: 0,
      command: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 17,
        reason: 'Browser persistence proof',
      },
    });
    const replay = await window.appRpc.call('commands.execute', {
      character_id: character.id,
      operation_uuid: operation,
      expected_revision: 999,
      command: {
        type: 'update_character_rules',
        allow_legacy: true,
      },
    });
    let conflict: unknown;
    try {
      await window.appRpc.call('commands.execute', {
        character_id: character.id,
        operation_uuid: '60606060-6060-4060-8060-606060606060',
        expected_revision: 0,
        command: {
          type: 'update_ability',
          ability: 'wisdom',
          score: 20,
        },
      });
    } catch (error) {
      conflict =
        error !== null && typeof error === 'object'
          ? {
              message: String((error as Error).message),
              data: (error as { data?: unknown }).data,
            }
          : error;
    }
    return { first, replay, conflict };
  });

  expect(result).toEqual({
    first: {
      operation_uuid: '50505050-5050-4050-8050-505050505050',
      revision: 1,
      idempotent_replay: false,
    },
    replay: {
      operation_uuid: '50505050-5050-4050-8050-505050505050',
      revision: 1,
      idempotent_replay: true,
    },
    conflict: {
      message:
        'This character changed in another tab. Reload before trying again.',
      data: { current_revision: 1 },
    },
  });
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      name: 'RPC Hero',
      wisdom: 17,
      allow_legacy: 0,
      revision: 1,
    }),
  ]);
  expect(
    await page.evaluate(() =>
      window.staticApp.inspectRows('character_operations'),
    ),
  ).toEqual([
    expect.objectContaining({
      operation_uuid: '50505050-5050-4050-8050-505050505050',
      expected_revision: 0,
      resulting_revision: 1,
    }),
  ]);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('change_log')),
  ).toEqual([
    expect.objectContaining({
      operation_uuid: '50505050-5050-4050-8050-505050505050',
      sequence: 1,
      reason: 'Browser persistence proof',
      action_type: 'update_ability',
      reversible: 1,
    }),
  ]);

  await page.reload();
  await ready(page);
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({
      name: 'RPC Hero',
      wisdom: 17,
      revision: 1,
    }),
  ]);

  const invalid = await page.evaluate(async () => {
    try {
      await window.appRpc.call('commands.execute', {
        character_id: 1,
        operation_uuid: 'not-a-uuid',
        expected_revision: 1,
        command: { type: 'update_ability', ability: 'wisdom', score: 18 },
      });
      return null;
    } catch (error) {
      return {
        code: (error as { code?: unknown }).code,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  });
  expect(invalid).toEqual({
    code: 'invalid_params',
    message: 'Invalid params for RPC method "commands.execute".',
  });
  expect(
    await page.evaluate(() => window.staticApp.inspectRows('characters')),
  ).toEqual([
    expect.objectContaining({ wisdom: 17, revision: 1 }),
  ]);
});

test('malformed level-up subchoices survive worker transport as structured data', async ({
  page,
}) => {
  // Measured 4.3s in isolation on 2026-07-31.
  test.setTimeout(20_000);
  await page.goto('/');
  await ready(page);
  const refusal = await page.evaluate(async () => {
    await window.staticApp.reset();
    const character = await window.staticApp.writeCharacter('Locator Refusal');
    try {
      await window.appRpc.call('commands.execute', {
        character_id: character.id,
        operation_uuid: '71717171-7171-4171-8171-717171717171',
        expected_revision: 0,
        command: {
          type: 'level_up_class',
          class_definition_id: 1,
          target_level: 2,
          planned_subchoices: {
            skills: [],
            expertise: [],
            spells: [{
              kind: 'slot_selection',
              locator: {
                source: { kind: 'selected_class', durable_row_id: 99 },
                rule_key: 'prepared',
                ordinal: 1,
              },
              spell_version_id: 1,
              mode: 'new',
            }],
          },
        },
      });
    } catch (error) {
      return error !== null && typeof error === 'object'
        ? {
            message: String((error as Error).message),
            data: (error as { data?: unknown }).data,
          }
        : error;
    }
    return null;
  });

  expect(refusal).toEqual({
    message: 'Unknown locator.source field: durable_row_id.',
    data: {
      reason: 'malformed_planned_subchoice',
      subchoice_kind: 'spell',
      index: 0,
      field: 'locator.source',
    },
  });
});
