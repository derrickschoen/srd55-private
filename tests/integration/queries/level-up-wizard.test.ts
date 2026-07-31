import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { LevelUpClassCommand } from '../../../src/commands/level-up-class';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import type {
  LevelFeatSelection,
} from '../../../src/domain/command-contracts';
import {
  LEVEL_UP_RPC,
  type LevelUpStateResult,
} from '../../../src/builder/level-up-wizard';
import { CharacterCrud } from '../../../src/queries/character-crud';
import { createQueriesClient } from '../../../src/queries/client';
import {
  RpcClient,
  type RpcTransport,
} from '../../../src/rpc/client';
import type {
  RpcRequest,
  RpcResponse,
} from '../../../src/rpc/protocol';
import {
  handlers as queryHandlers,
} from '../../../src/worker/handlers/queries';
import { rpcRegistry } from '../../../src/worker/registry';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

/**
 * W-A's three state assertions and their negative-control candidates:
 *
 * - W-RPC-LIVE — `unregister-state-handler`: remove the LEVEL_UP_RPC.state
 *   handler; discovery/client dispatch and exact-param assertions fail.
 * - W-EPIC-SEAM — `short-circuit-deferred-to-resolution`: return the old
 *   top-level resolution state; the simultaneous ready/resolution assertions
 *   fail.
 * - W-EPIC-DURABLE — `drop-resolution-from-terminal-states`: omit the pending
 *   plan outside ready; the disabled-class and level-20 assertions fail.
 * - W-EPIC-ABSENT — `invent-pending-epic-resolution`: return a plan without a
 *   durable deferred row; the explicit null assertions fail.
 * - W-INCOMPLETE — `treat-any-warning-as-classless`: branch on warning count;
 *   the warned Wizard no longer returns ready and its repeated warning fails.
 * - W-HP-DISABLED — `mark-missing-hit-die-guideable`: emit target/gains for a
 *   null-die class; the terminal and absent-command-path assertions fail.
 * - W-HP-MULTICLASS — `filter-disabled-class-from-ready`: omit null-die class
 *   options when another class is guideable; the two-option assertion fails.
 * - W-HP-NEGATIVE — `assume-disabled-sibling-has-d8`: derive a projected
 *   maximum for the guideable class; its unknown/no-number assertions fail.
 * - W-HP-PENDING — `assume-feat-cannot-change-constitution`: emit a final HP
 *   maximum before the level-feat choice; the pending-choice assertion fails.
 * - W-HP-SCALED — `drop-level-scaled-effect-delta`: omit the existing
 *   per-level effect's +1; its named contribution and final maximum fail.
 */
describe('level-up wizard state RPC', () => {
  let harness: RpcHarness;
  let integrity: CharacterCommandIntegrity;

  class RegistryTransport implements RpcTransport {
    readonly #messageListeners = new Set<
      (event: MessageEvent<RpcResponse>) => void
    >();
    readonly #errorListeners = new Set<
      (event: ErrorEvent) => void
    >();

    postMessage(message: RpcRequest): void {
      void rpcRegistry.dispatch(message, harness.context).then((response) => {
        const event = { data: response } as MessageEvent<RpcResponse>;
        for (const listener of this.#messageListeners) {
          listener(event);
        }
      }).catch((error: unknown) => {
        const event = {
          message: error instanceof Error ? error.message : String(error),
        } as ErrorEvent;
        for (const listener of this.#errorListeners) {
          listener(event);
        }
      });
    }

    addEventListener(
      type: 'message' | 'error',
      listener:
        | ((event: MessageEvent<RpcResponse>) => void)
        | ((event: ErrorEvent) => void),
    ): void {
      if (type === 'message') {
        this.#messageListeners.add(
          listener as (event: MessageEvent<RpcResponse>) => void,
        );
      } else {
        this.#errorListeners.add(listener as (event: ErrorEvent) => void);
      }
    }

    removeEventListener(
      type: 'message' | 'error',
      listener:
        | ((event: MessageEvent<RpcResponse>) => void)
        | ((event: ErrorEvent) => void),
    ): void {
      if (type === 'message') {
        this.#messageListeners.delete(
          listener as (event: MessageEvent<RpcResponse>) => void,
        );
      } else {
        this.#errorListeners.delete(listener as (event: ErrorEvent) => void);
      }
    }
  }

  beforeEach(async () => {
    harness = await createRpcHarness(queryHandlers);
    integrity = new CharacterCommandIntegrity('level-up-state-test-key');
  });

  afterEach(() => {
    harness.close();
  });

  function classId(name: string): number {
    return Number(
      harness.context.db.scalar(
        'SELECT id FROM class_definitions WHERE name = ?',
        [name],
      ),
    );
  }

  function createCharacter(name: string): number {
    return new CharacterCrud(harness.context.db).create({ name }).id;
  }

  function enterClass(characterId: number, name: string): number {
    const id = classId(name);
    new UpdateClassCommand(
      harness.context.db,
      { type: 'update_class', class_definition_id: id },
      integrity,
    ).apply(characterId);
    return id;
  }

  function boonChoice(contentKey: string): LevelFeatSelection {
    const row = harness.context.db.oneRaw(
      `SELECT ability_points, ability_increase_abilities
       FROM feat_definitions WHERE content_key = ?`,
      [contentKey],
    );
    if (row === null) {
      throw new Error(`Missing feat fixture ${contentKey}.`);
    }
    const points = Number(row['ability_points']);
    const decoded = row['ability_increase_abilities'] === null
      ? null
      : JSON.parse(String(row['ability_increase_abilities'])) as unknown;
    const ability = decoded === 'any'
      ? 'strength'
      : Array.isArray(decoded) && typeof decoded[0] === 'string'
        ? decoded[0]
        : null;
    if (points !== 1 || ability === null) {
      throw new Error('Epic Boon fixture has no one-point ability choice.');
    }
    return {
      kind: 'feat',
      feat_content_key: contentKey,
      config: {},
      ability_increases: [{
        ability: ability as LevelFeatSelection['ability_increases'][number]['ability'],
        amount: 1,
      }],
    };
  }

  it('discovers the pinned method and returns every base state variant through the client', async () => {
    expect(rpcRegistry.methods).toContain(LEVEL_UP_RPC.state);
    const transport = new RegistryTransport();
    const rpc = new RpcClient(transport);
    const client = createQueriesClient(rpc);

    await expect(client.levelUpState(999_999)).resolves.toEqual({
      kind: 'not_found',
      character_id: 999_999,
    });

    const classlessId = createCharacter('Classless Route');
    await expect(client.levelUpState(classlessId)).resolves.toMatchObject({
      kind: 'no_held_class',
      character: {
        character_id: classlessId,
        total_level: null,
        warnings: [expect.objectContaining({ kind: 'no_class' })],
      },
    });

    const fighterId = createCharacter('Ready Fighter');
    harness.context.db.exec(
      'UPDATE characters SET constitution = 14 WHERE id = ?',
      [fighterId],
    );
    const fighterClassId = enterClass(fighterId, 'Fighter');
    const ready = await client.levelUpState(fighterId);
    expect(ready).toMatchObject({
      kind: 'ready',
      character: { character_id: fighterId, total_level: 1 },
      class_options: [{
        guideability: 'guideable',
        class_definition_id: fighterClassId,
        current_level: 1,
        target_level: 2,
        applicable_steps: ['class', 'gains', 'review', 'complete'],
        gains: {
          hit_points: {
            kind: 'known',
            hit_die: 10,
            fixed_class_base: 6,
            constitution_modifier: 2,
            class_hit_point_change: 8,
            current_maximum: 12,
            projected_maximum: { kind: 'known', value: 20 },
          },
        },
      }],
      pending_epic_resolution: null,
    });

    raiseClassLevelForTest(
      harness.context.db,
      fighterId,
      fighterClassId,
      2,
    );
    await expect(client.levelUpState(fighterId)).resolves.toMatchObject({
      kind: 'ready',
      class_options: [{
        current_level: 2,
        target_level: 3,
        applicable_steps: [
          'class',
          'gains',
          'subclass',
          'review',
          'complete',
        ],
        subclass_choice: {
          options: [expect.objectContaining({
            content_key: '2024:subclass:eldritch-knight',
            name: 'Eldritch Knight',
            rules_edition: '2024',
          })],
        },
      }],
    });

    raiseClassLevelForTest(
      harness.context.db,
      fighterId,
      fighterClassId,
      5,
    );
    const asiState = await client.levelUpState(fighterId);
    expect(asiState).toMatchObject({
      kind: 'ready',
      class_options: [{
        current_level: 5,
        target_level: 6,
        applicable_steps: [
          'class',
          'gains',
          'feat',
          'review',
          'complete',
        ],
        gains: {
          target_features: {
            kind: 'sourced',
            feature_names: ['Ability Score Improvement'],
          },
        },
        feat_occurrence: {
          kind: 'asi_level_feat',
        },
      }],
    });
    if (asiState.kind !== 'ready') {
      throw new Error('Fighter level 6 did not return ready state.');
    }
    const asiOption = asiState.class_options[0];
    if (asiOption?.guideability !== 'guideable') {
      throw new Error('Fighter level 6 was not guideable.');
    }
    const occurrence = asiOption.feat_occurrence;
    expect(asiOption.gains.hit_points).toMatchObject({
      kind: 'known',
      projected_maximum: {
        kind: 'pending_choice',
        choices: ['level_feat'],
      },
    });
    expect(occurrence?.candidates).toHaveLength(17);
    expect(
      occurrence?.candidates.filter((candidate) => candidate.is_class_default),
    ).toMatchObject([{
      definition: {
        content_key: '2024:feat:ability-score-improvement',
      },
    }]);
    expect(
      occurrence?.candidates.every(
        (candidate) => candidate.applications.length > 0,
      ),
    ).toBe(true);

    raiseClassLevelForTest(
      harness.context.db,
      fighterId,
      fighterClassId,
      20,
    );
    await expect(client.levelUpState(fighterId)).resolves.toMatchObject({
      kind: 'maximum_level',
      character: { character_id: fighterId, total_level: 20 },
      held_classes: [{ current_level: 20 }],
      pending_epic_resolution: null,
    });

    rpc.close();
  });

  it('makes an only unknown-hit-die class terminal with no command path', async () => {
    const characterId = createCharacter('Unknown Hit Die Fighter');
    const fighterId = enterClass(characterId, 'Fighter');
    harness.context.db.exec(
      'DELETE FROM class_sheet_traits WHERE class_definition_id = ?',
      [fighterId],
    );

    const transport = new RegistryTransport();
    const rpc = new RpcClient(transport);
    const state = await createQueriesClient(rpc).levelUpState(characterId);
    expect(state).toMatchObject({
      kind: 'no_guideable_class',
      explanation:
        'Fixed HP cannot be derived for any held class until its missing hit die is repaired or catalogued.',
      class_options: [{
        guideability: 'disabled',
        class_definition_id: fighterId,
        hit_die: null,
        reason: 'missing_hit_die',
        explanation:
          'Fixed HP cannot be derived until this class is repaired or catalogued with a hit die.',
      }],
      pending_epic_resolution: null,
    });
    if (state.kind !== 'no_guideable_class') {
      throw new Error('Unknown hit die did not block guided level-up.');
    }
    const option = state.class_options[0];
    expect(option).not.toHaveProperty('target_level');
    expect(option).not.toHaveProperty('gains');
    expect(option).not.toHaveProperty('applicable_steps');
    rpc.close();
  });

  it('keeps known-die multiclass advancement ready and disables only the unknown class', async () => {
    const characterId = createCharacter('Mixed Hit Dice');
    const fighterId = enterClass(characterId, 'Fighter');
    const wizardId = enterClass(characterId, 'Wizard');
    harness.context.db.exec(
      'DELETE FROM class_sheet_traits WHERE class_definition_id = ?',
      [fighterId],
    );

    const transport = new RegistryTransport();
    const rpc = new RpcClient(transport);
    const state = await createQueriesClient(rpc).levelUpState(characterId);
    expect(state).toMatchObject({
      kind: 'ready',
      class_options: [
        {
          guideability: 'disabled',
          class_definition_id: fighterId,
          reason: 'missing_hit_die',
        },
        {
          guideability: 'guideable',
          class_definition_id: wizardId,
          target_level: 2,
          gains: {
            hit_points: {
              kind: 'unknown',
              reason: 'missing_hit_die',
              missing_hit_dice: [{
                class_definition_id: fighterId,
                class_name: 'Fighter',
              }],
            },
          },
        },
      ],
      pending_epic_resolution: null,
    });
    if (state.kind !== 'ready') {
      throw new Error('A known hit die did not keep multiclass level-up ready.');
    }
    expect(state.class_options[0]).not.toHaveProperty('target_level');
    expect(state.class_options[0]).not.toHaveProperty('gains');
    const wizardOption = state.class_options.find(
      (option) => option.class_definition_id === wizardId,
    );
    if (wizardOption?.guideability !== 'guideable') {
      throw new Error('Wizard option was not guideable.');
    }
    expect(wizardOption.gains.hit_points).not.toHaveProperty(
      'fixed_class_base',
    );
    expect(wizardOption.gains.hit_points).not.toHaveProperty(
      'projected_maximum',
    );
    rpc.close();
  });

  it('keeps Boon resolution available when missing hit dice block class advancement', async () => {
    const characterId = createCharacter('Deferred Unknown Hit Die');
    const fighterId = enterClass(characterId, 'Fighter');
    raiseClassLevelForTest(
      harness.context.db,
      characterId,
      fighterId,
      18,
    );
    new LevelUpClassCommand(
      harness.context.db,
      {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 19,
        feat_choice: { kind: 'defer_epic_boon' },
      },
      integrity,
    ).apply(characterId);
    harness.context.db.exec(
      'DELETE FROM class_sheet_traits WHERE class_definition_id = ?',
      [fighterId],
    );

    const transport = new RegistryTransport();
    const rpc = new RpcClient(transport);
    const state = await createQueriesClient(rpc).levelUpState(characterId);
    expect(state).toMatchObject({
      kind: 'no_guideable_class',
      class_options: [{
        guideability: 'disabled',
        class_definition_id: fighterId,
        reason: 'missing_hit_die',
      }],
      pending_epic_resolution: {
        deferred_choice: {
          class_definition_id: fighterId,
          class_level: 19,
        },
        warning: { key: 'epic_boon_deferred' },
      },
    });

    const wizardId = enterClass(characterId, 'Wizard');
    raiseClassLevelForTest(
      harness.context.db,
      characterId,
      wizardId,
      2,
    );
    await expect(
      createQueriesClient(rpc).levelUpState(characterId),
    ).resolves.toMatchObject({
      kind: 'maximum_level',
      character: { total_level: 21 },
      pending_epic_resolution: {
        deferred_choice: {
          class_definition_id: fighterId,
          class_level: 19,
        },
      },
    });
    rpc.close();
  });

  it('names and applies each existing level-scaled HP effect through the shared rule', async () => {
    const characterId = createCharacter('Level-scaled Fighter');
    const fighterId = enterClass(characterId, 'Fighter');
    const classSourceId = Number(
      harness.context.db.scalar(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'class'
           AND source_definition_id = ?`,
        [characterId, fighterId],
      ),
    );
    harness.context.db.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, hit_points_flat,
         hit_points_per_level, source_instance_id, label
       ) VALUES (?, 1, 'hp_modifier', 0, 1, ?, 'Level-scaled Ward')`,
      [characterId, classSourceId],
    );

    const transport = new RegistryTransport();
    const rpc = new RpcClient(transport);
    const state = await createQueriesClient(rpc).levelUpState(characterId);
    expect(state).toMatchObject({
      kind: 'ready',
      class_options: [{
        gains: {
          hit_points: {
            kind: 'known',
            class_hit_point_change: 6,
            level_scaled_effects: [{
              label: 'Level-scaled Ward',
              current_contribution: 1,
              projected_contribution: 2,
              change: 1,
            }],
            current_maximum: 11,
            projected_maximum: { kind: 'known', value: 18 },
          },
        },
      }],
    });
    rpc.close();
  });

  it('rejects every state envelope except one exact positive character id', async () => {
    for (const params of [
      {},
      { character_id: 0 },
      { character_id: 1, extra: true },
      { character_id: '1' },
    ]) {
      await expect(
        rpcRegistry.dispatch(
          { id: 1, method: LEVEL_UP_RPC.state, params },
          harness.context,
        ),
      ).resolves.toMatchObject({
        ok: false,
        error: { code: 'invalid_params' },
      });
    }
  });

  it('offers durable Epic Boon resolution and ordinary level-up at once', async () => {
    const characterId = createCharacter('Deferred Epic Fighter');
    const fighterId = enterClass(characterId, 'Fighter');
    raiseClassLevelForTest(
      harness.context.db,
      characterId,
      fighterId,
      18,
    );
    new LevelUpClassCommand(
      harness.context.db,
      {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 19,
        feat_choice: { kind: 'defer_epic_boon' },
      },
      integrity,
    ).apply(characterId);

    const transport = new RegistryTransport();
    const rpc = new RpcClient(transport);
    const client = createQueriesClient(rpc);
    const deferred = await client.levelUpState(characterId);
    expect(deferred).toMatchObject({
      kind: 'ready',
      character: { character_id: characterId, total_level: 19 },
      class_options: [{
        guideability: 'guideable',
        class_definition_id: fighterId,
        current_level: 19,
        target_level: 20,
      }],
      pending_epic_resolution: {
        deferred_choice: {
          class_definition_id: fighterId,
          class_name: 'Fighter',
          class_level: 19,
        },
        additional_deferred_count: 0,
        warning: {
          key: 'epic_boon_deferred',
          title: 'Epic Boon choice still needed',
        },
        applicable_steps: ['epic_boon', 'review', 'complete'],
      },
    });
    if (
      deferred.kind !== 'ready' ||
      deferred.pending_epic_resolution === null
    ) {
      throw new Error('Expected simultaneous level-up and Boon resolution.');
    }
    expect(deferred.pending_epic_resolution.candidates).toHaveLength(7);
    expect(
      deferred.pending_epic_resolution.candidates.every(
        (candidate) => candidate.definition.grouping === 'epic_boon',
      ),
    ).toBe(true);

    new LevelUpClassCommand(
      harness.context.db,
      {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 20,
      },
      integrity,
    ).apply(characterId);
    const proceeded = await client.levelUpState(characterId);
    expect(proceeded).toMatchObject({
      kind: 'maximum_level',
      character: { total_level: 20 },
      pending_epic_resolution: {
        deferred_choice: {
          class_definition_id: fighterId,
          class_level: 19,
        },
      },
    });
    if (
      proceeded.kind !== 'maximum_level' ||
      proceeded.pending_epic_resolution === null
    ) {
      throw new Error('Proceeding hid the durable Boon resolution option.');
    }

    await new CharacterCommandExecutor(
      harness.context.db,
      integrity,
    ).execute({
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'resolve_level_feat_choice',
        character_level_feat_choice_id:
          proceeded.pending_epic_resolution.deferred_choice
            .character_level_feat_choice_id,
        feat_choice: boonChoice('2024:feat:boon-of-fate'),
      },
    });

    const resolved = await client.levelUpState(characterId);
    expect(resolved).toMatchObject({
      kind: 'maximum_level',
      pending_epic_resolution: null,
    });
    expect(
      harness.context.db.scalar(
        `SELECT level FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, fighterId],
      ),
    ).toBe(20);
    rpc.close();
  });

  it('keeps a warned incomplete level-one character ready and repeats its warnings', async () => {
    const characterId = createCharacter('Incomplete Wizard');
    enterClass(characterId, 'Wizard');

    const response = await rpcRegistry.dispatch(
      {
        id: 1,
        method: LEVEL_UP_RPC.state,
        params: { character_id: characterId },
      },
      harness.context,
    );
    expect(response).toMatchObject({
      ok: true,
      result: {
        kind: 'ready',
        character: {
          character_id: characterId,
          total_level: 1,
        },
      },
    });
    if (!response.ok) {
      throw new Error('Incomplete-character state query unexpectedly failed.');
    }
    const state = response.result as LevelUpStateResult;
    expect(state.kind).toBe('ready');
    if (state.kind !== 'ready') {
      throw new Error('Warned held-class character was incorrectly blocked.');
    }
    expect(state.character.warnings.length).toBeGreaterThan(0);
    expect(state.character.warnings.map((warning) => warning.kind)).toContain(
      'unfilled_choices',
    );
  });
});
