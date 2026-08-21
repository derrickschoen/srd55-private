import type { EncounterState } from '../../combat/encounter';

export type UtilityOutcome = 0 | 1 | 2;

/**
 * Lexicographic utility from one side's perspective.
 *
 * outcome: 2 = won and survived, 1 = survived without resolution, 0 = defeated.
 * The latter two fields are considered only when the preceding fields tie.
 */
export interface TerminalUtility {
  readonly outcome: UtilityOutcome;
  readonly sideHitPoints: number;
  readonly remainingResources: number;
}

export interface UtilityBounds {
  readonly maximumSideHitPoints: number;
  readonly maximumRemainingResources: number;
}

export type UtilityDifference =
  | { readonly tag: 'none'; readonly tuple: readonly [0, 0, 0] }
  | {
      readonly tag: 'outcome' | 'side_hp' | 'resources';
      readonly tuple: readonly [number, number, number];
    };

export function compareUtility(left: TerminalUtility, right: TerminalUtility): number {
  return (
    left.outcome - right.outcome ||
    left.sideHitPoints - right.sideHitPoints ||
    left.remainingResources - right.remainingResources
  );
}

function sideResourceTotal(
  state: EncounterState,
  side: EncounterState['combatants'][number]['profile']['kind'],
): number {
  return state.combatants
    .filter((combatant) => combatant.profile.kind === side)
    .flatMap((combatant) => combatant.spellSlots)
    .reduce((total, slot) => total + slot.level * slot.remaining, 0);
}

export function utilityBounds(
  initialState: EncounterState,
  side: EncounterState['combatants'][number]['profile']['kind'],
): UtilityBounds {
  return {
    maximumSideHitPoints: initialState.combatants
      .filter((combatant) => combatant.profile.kind === side)
      .reduce((total, combatant) => total + combatant.profile.rules.hitPointMaximum, 0),
    maximumRemainingResources: sideResourceTotal(initialState, side),
  };
}

export function terminalUtility(
  state: EncounterState,
  side: EncounterState['combatants'][number]['profile']['kind'],
): TerminalUtility {
  const allies = state.combatants.filter((combatant) => combatant.profile.kind === side);
  const opponents = state.combatants.filter((combatant) => combatant.profile.kind !== side);
  const allySurvived = allies.some((combatant) => combatant.life !== 'dead');
  const opponentSurvived = opponents.some((combatant) => combatant.life !== 'dead');
  const outcome: UtilityOutcome = allySurvived && !opponentSurvived ? 2 : allySurvived ? 1 : 0;
  return {
    outcome,
    sideHitPoints: allies.reduce((total, combatant) => total + combatant.hitPoints, 0),
    remainingResources: sideResourceTotal(state, side),
  };
}

/**
 * Mixed-radix scalarization. The weights come from the captured initial state,
 * so one outcome point dominates every possible HP/resource difference and
 * one HP dominates every possible resource difference. It therefore preserves
 * the lexicographic owner ordering exactly for that capture.
 */
export function scalarizeUtility(utility: TerminalUtility, bounds: UtilityBounds): number {
  const resourceRadix = bounds.maximumRemainingResources + 1;
  const hitPointRadix = (bounds.maximumSideHitPoints + 1) * resourceRadix;
  return utility.outcome * hitPointRadix
    + utility.sideHitPoints * resourceRadix
    + utility.remainingResources;
}

export function utilityDifference(
  best: TerminalUtility,
  selected: TerminalUtility,
): UtilityDifference {
  const tuple = [
    best.outcome - selected.outcome,
    best.sideHitPoints - selected.sideHitPoints,
    best.remainingResources - selected.remainingResources,
  ] as const;
  if (tuple[0] !== 0) return { tag: 'outcome', tuple };
  if (tuple[1] !== 0) return { tag: 'side_hp', tuple };
  if (tuple[2] !== 0) return { tag: 'resources', tuple };
  return { tag: 'none', tuple: [0, 0, 0] };
}
