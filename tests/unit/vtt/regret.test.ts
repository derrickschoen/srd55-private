import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { createEncounter } from '../../../src/combat/encounter';
import { combatantId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { referenceEncounterSetup } from '../../../src/vtt/reference-encounter';
import type { RolloutInputCapture } from '../../../src/vtt/experiment-telemetry';
import {
  collapseEquivalentCandidates,
  compareUtility,
  reconstructEncounterState,
  rolloutPrograms,
  RolloutStateHashMismatchError,
  type RankedRoundCandidate,
} from '../../../src/vtt/regret';
import type { MonsterRoundProgram } from '../../../src/vtt/dm-bridge/contracts';

const MONSTER = combatantId('combatant:training-brute');
const FIGHTER = combatantId('combatant:fighter');

function programs(action: 'attack' | 'dodge'): readonly MonsterRoundProgram[] {
  return [{
    monsterId: MONSTER,
    program: action === 'attack'
      ? { kind: 'action', action: { kind: 'attack', target: { kind: 'combatant', combatantId: FIGHTER } } }
      : { kind: 'action', action: { kind: 'use_action', action: 'dodge' } },
  }];
}

function capture(): RolloutInputCapture {
  const setup = referenceEncounterSetup();
  const state = createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: setup.bounds,
    blockedCells: setup.blockedCells,
    foggedCells: setup.foggedCells,
    dmNotes: setup.dmNotes,
    combatants: setup.combatants,
    tokens: setup.tokens,
  });
  const serializedEncounterState = canonicalJson(state);
  return {
    logicalCallId: 'regret-unit:call:0',
    stateHash: sha256(serializedEncounterState),
    legalActionSetHash: sha256(canonicalJson(['unit-legal-actions'])),
    selectedAction: [...programs('attack')],
    input: {},
    serializedEncounterState,
    candidateTurnK: 2,
    candidateTurns: [{
      monsterId: MONSTER,
      candidates: [
        {
          rank: 1,
          score: 10,
          stableSortKey: canonicalJson(programs('attack')[0]?.program),
          program: programs('attack')[0]!.program,
        },
        {
          rank: 2,
          score: 1,
          stableSortKey: canonicalJson(programs('dodge')[0]?.program),
          program: programs('dodge')[0]!.program,
        },
      ],
    }],
  };
}

describe('VTT regret rollout oracle', () => {
  it('state-hash refusal rejects a capture whose serialized decision state was changed', () => {
    const valid = capture();
    const mismatched = { ...valid, stateHash: 'f'.repeat(64) };

    expect(() => reconstructEncounterState(mismatched)).toThrowError(RolloutStateHashMismatchError);
  });

  it('rollout_rng_shared keeps a repeated rollout byte-identical and independent of candidate evaluation order', async () => {
    const input = capture();
    const state = reconstructEncounterState(input);
    const first = await rolloutPrograms(input, state, programs('attack'));
    await rolloutPrograms(input, state, programs('dodge'));
    const repeated = await rolloutPrograms(input, state, programs('attack'));

    expect(canonicalJson(repeated)).toBe(canonicalJson(first));
  });

  it('comparator_hp_before_win keeps outcome ahead of HP and HP ahead of resources', () => {
    expect(compareUtility(
      { outcome: 2, sideHitPoints: 1, remainingResources: 0 },
      { outcome: 1, sideHitPoints: 999, remainingResources: 999 },
    )).toBeGreaterThan(0);
    expect(compareUtility(
      { outcome: 2, sideHitPoints: 10, remainingResources: 0 },
      { outcome: 2, sideHitPoints: 9, remainingResources: 999 },
    )).toBeGreaterThan(0);
    expect(compareUtility(
      { outcome: 2, sideHitPoints: 10, remainingResources: 2 },
      { outcome: 2, sideHitPoints: 10, remainingResources: 1 },
    )).toBeGreaterThan(0);
  });

  it('collapse_ignores_movement_order collapses action-order equivalents but preserves movement-sensitive order', () => {
    const target = { kind: 'combatant' as const, combatantId: FIGHTER };
    const attack = { kind: 'action' as const, action: { kind: 'attack' as const, target } };
    const save = { kind: 'action' as const, action: { kind: 'force_save' as const, target } };
    const move = { kind: 'action' as const, action: { kind: 'move_toward' as const, target } };
    const candidate = (choices: readonly [typeof attack | typeof save | typeof move, typeof attack | typeof save | typeof move], score: number): RankedRoundCandidate => ({
      programs: [{ monsterId: MONSTER, program: { kind: 'priority', choices } }],
      score,
      stableSortKey: canonicalJson(choices),
    });
    const collapsed = collapseEquivalentCandidates([
      candidate([attack, save], 4),
      candidate([save, attack], 3),
      candidate([move, attack], 2),
      candidate([attack, move], 1),
    ]);

    expect(collapsed.originalCount).toBe(4);
    expect(collapsed.collapsedCount).toBe(3);
    expect(collapsed.collapseFactor).toBe(4 / 3);
  });
});
