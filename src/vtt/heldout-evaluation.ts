import { combatantConditions } from '../combat/combat-rules';
import type { EncounterState } from '../combat/encounter';
import type { CombatantId } from '../combat/values';
import type { EncounterSeed } from './session-seed';

export type HeldoutPartyLevel = 3 | 4 | 5 | 6;
export type HeldoutSlice = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type HeldoutPartition = HeldoutSlice | 'development';

export interface HeldoutCase {
  readonly slice: HeldoutSlice;
  readonly roomSeed: number;
  readonly roomOrdinal: number;
  readonly partyLevel: HeldoutPartyLevel;
  readonly rep: 1 | 2 | 3;
  readonly combatSeed: EncounterSeed;
}

export interface HeldoutOutcome {
  readonly result: 'monster_win' | 'party_win' | 'round_cap';
  readonly monsterWin: 0 | 1;
  readonly neutralizedPcIds: readonly CombatantId[];
  readonly effectiveUnconsciousPcIds: readonly CombatantId[];
  readonly capturedCount: 0;
  readonly roundsCompleted: number;
}

export interface HeldoutSideHp {
  readonly monsterRemaining: number;
  readonly partyRemaining: number;
  readonly difference: number;
}

function combatant(state: EncounterState, id: CombatantId) {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new Error(`Held-out combatant ${String(id)} is absent.`);
  return subject;
}

export function pcNeutralized(state: EncounterState, id: CombatantId): boolean {
  const subject = combatant(state, id);
  return subject.life !== 'living' ||
    combatantConditions(state, id).some((condition) => condition.name === 'Unconscious');
}

export function heldoutEncounterOutcome(
  initial: EncounterState,
  final: EncounterState,
  rounds: number,
): HeldoutOutcome {
  if (!Number.isSafeInteger(rounds) || rounds < 0) {
    throw new RangeError('Held-out completed rounds must be a non-negative safe integer.');
  }
  const pcIds = initial.combatants.flatMap((subject) =>
    subject.profile.kind === 'player_character' ? [subject.profile.id] : []);
  const monsterIds = initial.combatants.flatMap((subject) =>
    subject.profile.kind === 'monster' ? [subject.profile.id] : []);
  if (pcIds.length === 0 || monsterIds.length === 0) {
    throw new Error('Held-out scoring requires both player characters and monsters.');
  }
  const effectiveUnconsciousPcIds = pcIds.filter((id) => {
    const subject = combatant(final, id);
    return subject.life === 'living' &&
      combatantConditions(final, id).some((condition) => condition.name === 'Unconscious');
  });
  const neutralizedPcIds = pcIds.filter((id) => pcNeutralized(final, id));
  const result = neutralizedPcIds.length === pcIds.length
    ? 'monster_win' as const
    : monsterIds.every((id) => combatant(final, id).life !== 'living')
      ? 'party_win' as const
      : 'round_cap' as const;
  return {
    result,
    monsterWin: result === 'monster_win' ? 1 : 0,
    neutralizedPcIds,
    effectiveUnconsciousPcIds,
    capturedCount: 0,
    roundsCompleted: rounds,
  };
}

function remainingFraction(
  initial: EncounterState,
  final: EncounterState,
  kind: 'player_character' | 'monster',
): number {
  const subjects = initial.combatants.filter((subject) => subject.profile.kind === kind);
  const maximum = subjects.reduce(
    (sum, subject) => sum + subject.profile.rules.hitPointMaximum,
    0,
  );
  if (maximum <= 0) throw new Error(`Held-out ${kind} side has no positive maximum hit points.`);
  const remaining = subjects.reduce((sum, subject) => {
    const current = combatant(final, subject.profile.id);
    return sum + Math.max(0, current.hitPoints);
  }, 0);
  return remaining / maximum;
}

export function heldoutSideHp(
  initial: EncounterState,
  final: EncounterState,
): HeldoutSideHp {
  const monsterRemaining = remainingFraction(initial, final, 'monster');
  const partyRemaining = remainingFraction(initial, final, 'player_character');
  return {
    monsterRemaining,
    partyRemaining,
    difference: monsterRemaining - partyRemaining,
  };
}
