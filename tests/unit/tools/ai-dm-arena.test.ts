import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { encounterSessionId } from '../../../src/combat/values';
import type { RoundPlan } from '../../../src/vtt/dm-bridge/round-plan-contract';
import { generateRoom } from '../../../src/vtt/room-generator';
import { validateArenaPlan } from '../../../src/vtt/arena-legality';
import {
  parseArenaArgs,
  runArena,
} from '../../../tools/ai-dm-arena';
import {
  mkdtempSync,
  readFileSync,
} from '../../helpers/test-filesystem';

describe('AI-DM arena', () => {
  it('renders and validates a multi-round dry run without spawning a model', { timeout: 30_000 }, async () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-dry-'));
    const outPath = join(directory, 'arena.jsonl');
    const config = parseArenaArgs([
      '--rooms', '2',
      '--reps', '2',
      '--seed', '3943001',
      '--effort', 'low',
      '--out', outPath,
      '--cli-bin', 'definitely-not-a-real-codex-binary',
      '--dry-run',
    ]);

    const rows = await runArena(config);

    expect(rows).toHaveLength(4);
    expect(rows.every((row) =>
      row.outcome === 'authorized' && row.refusals.length === 0 &&
      row.projectionRevision > row.contextRevision)).toBe(true);
    expect(rows[1]?.contextRevision).toBe(rows[0]?.projectionRevision);
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('runs as a vite-node --dry-run CLI without contacting the model binary', { timeout: 30_000 }, () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-arena-cli-'));
    const outPath = join(directory, 'arena.jsonl');
    const environment = { ...process.env };
    delete environment.FORCE_COLOR;
    delete environment.NO_COLOR;
    const result = spawnSync(
      process.execPath,
      [
        'node_modules/vite-node/vite-node.mjs',
        'tools/ai-dm-arena.ts',
        '--rooms', '1',
        '--reps', '1',
        '--seed', '3943001',
        '--effort', 'low',
        '--out', outPath,
        '--cli-bin', 'definitely-not-a-real-codex-binary',
        '--dry-run',
      ],
      { cwd: process.cwd(), encoding: 'utf8', env: environment },
    );

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    expect(readFileSync(outPath, 'utf8').trim().split('\n')).toHaveLength(1);
  });

  it('rejects occupied movement and more than one slot-spending action on a path', () => {
    const state = generateRoom(3_943_001).encounter.state;
    const monster = state.combatants.find((subject) => subject.profile.kind === 'monster');
    const playerToken = state.tokens.find((token) =>
      state.combatants.some((subject) =>
        subject.profile.kind === 'player_character' && subject.profile.id === token.combatantId));
    if (monster === undefined || playerToken === undefined) throw new Error('Arena fixture is missing combatants.');
    const plan: RoundPlan = {
      kind: 'round_plan',
      protocolVersion: 2,
      encounterId: encounterSessionId('encounter:legality-probe'),
      requestId: 'request:legality-probe',
      expectedRevision: state.revision,
      round: 1,
      monsters: [{
        monsterId: monster.profile.id,
        program: {
          kind: 'action',
          action: {
            kind: 'retreat_toward',
            destination: playerToken.position,
          },
          riders: [{
            kind: 'on_critical_hit',
            followUpAction: {
              kind: 'cast_spell',
              spellId: 'fixture-second-slot',
              target: { kind: 'nearest_enemy' },
            },
          }],
        },
      }],
    };
    const twoSlotPlan: RoundPlan = {
      ...plan,
      monsters: [{
        monsterId: monster.profile.id,
        program: {
          kind: 'action',
          action: {
            kind: 'cast_spell',
            spellId: 'fixture-first-slot',
            target: { kind: 'nearest_enemy' },
          },
          riders: [{
            kind: 'on_critical_hit',
            followUpAction: {
              kind: 'cast_spell',
              spellId: 'fixture-second-slot',
              target: { kind: 'nearest_enemy' },
            },
          }],
        },
      }],
    };

    expect(validateArenaPlan(plan, state)).toContain(
      `${monster.profile.id}: destination is blocked, occupied, or unreachable`,
    );
    expect(validateArenaPlan(twoSlotPlan, state)).toContain(
      `${monster.profile.id}: program can spend more than one slot`,
    );
  });
});
