import { isIncapacitated } from '../combat/conditions';
import { combatantConditions, type EncounterState } from '../combat/encounter';
import type { TurnBoundary } from '../combat/effects';
import type { CombatantId, EncounterEffectId, PersistentAreaId } from '../combat/values';
import type { SessionHistoryEntry } from './session-persistence';

export interface InitiativeTimelineEntry {
  readonly combatant: CombatantId;
  readonly name: string;
  readonly position: number;
  readonly current: boolean;
  readonly delayedThisRound: boolean;
  readonly life: 'living' | 'dying' | 'stable' | 'dead';
}

export interface TimelineBoundary {
  readonly round: number;
  readonly combatant: CombatantId;
  readonly boundary: TurnBoundary;
}

export type UpcomingTimelineEvent =
  | {
      readonly kind: 'legendary_action_window';
      readonly legendaryCombatant: CombatantId;
      readonly boundary: TimelineBoundary;
    }
  | {
      readonly kind: 'effect_expiry';
      readonly effectId: EncounterEffectId;
      readonly boundary: TimelineBoundary;
    }
  | {
      readonly kind: 'burn_away';
      readonly areaId: PersistentAreaId;
      readonly cells: readonly { readonly column: number; readonly row: number }[];
      readonly boundary: TimelineBoundary;
    }
  | {
      readonly kind: 'repeated_save_prompt';
      readonly effectId: EncounterEffectId;
      readonly target: CombatantId;
      readonly ability: import('../domain/enums').Ability;
      readonly dc: number;
      readonly boundary: TimelineBoundary;
    };

export interface EncounterTimelineProjection {
  readonly phase: EncounterState['phase'];
  readonly round: number;
  readonly currentCombatant: CombatantId | null;
  readonly initiative: readonly InitiativeTimelineEntry[];
  readonly upcoming: readonly UpcomingTimelineEvent[];
  readonly roundBoundaries: readonly {
    readonly round: number;
    readonly revision: number;
    readonly current: boolean;
  }[];
  readonly branchPoints: readonly {
    readonly revision: number;
    readonly sourceRevision: number;
    readonly targetRevision: number;
    readonly round: number;
  }[];
}

function futureBoundaryRound(
  state: EncounterState,
  combatant: CombatantId,
  boundary: TurnBoundary,
  occurrence: number,
): number | null {
  if (state.round < 1 || state.activeInitiativeIndex === null || occurrence < 1) return null;
  const index = state.initiative.findIndex((entry) => entry.combatant === combatant);
  if (index < 0) return null;
  const occursThisRound = boundary === 'start'
    ? index > state.activeInitiativeIndex
    : index >= state.activeInitiativeIndex;
  return state.round + (occursThisRound ? 0 : 1) + occurrence - 1;
}

function eventSortKey(state: EncounterState, event: UpcomingTimelineEvent): number {
  const index = state.initiative.findIndex(
    (entry) => entry.combatant === event.boundary.combatant,
  );
  const boundaryOffset = event.boundary.boundary === 'start' ? 0 : 1;
  return event.boundary.round * Math.max(2, state.initiative.length * 2) + index * 2 + boundaryOffset;
}

function legendaryWindowPreview(state: EncounterState): readonly UpcomingTimelineEvent[] {
  const currentIndex = state.activeInitiativeIndex;
  if (currentIndex === null || state.round < 1) return [];
  return state.combatants.flatMap((subject): readonly UpcomingTimelineEvent[] => {
    const legendary = subject.legendary;
    if (
      legendary === undefined || legendary.actionUsesRemaining < 1 || subject.life !== 'living' ||
      isIncapacitated(combatantConditions(state, subject.profile.id))
    ) return [];
    if (state.pendingDecisions.some((decision) =>
      decision.kind === 'legendary_action_window' && decision.combatant === subject.profile.id)) return [];
    for (let index = currentIndex; index < state.initiative.length; index += 1) {
      const active = state.initiative[index]?.combatant;
      if (active === undefined || active === subject.profile.id) continue;
      const alreadyFired = state.eventLog.some((event) =>
        event.type === 'legendary_action_window_closed' &&
        event.combatant === subject.profile.id &&
        event.activeCombatant === active && event.round === state.round);
      if (alreadyFired) continue;
      return [{
        kind: 'legendary_action_window',
        legendaryCombatant: subject.profile.id,
        boundary: { round: state.round, combatant: active, boundary: 'end' },
      }];
    }
    return [];
  });
}

export function projectEncounterTimeline(
  state: EncounterState,
  history: readonly SessionHistoryEntry[],
): EncounterTimelineProjection {
  const upcoming: UpcomingTimelineEvent[] = [...legendaryWindowPreview(state)];
  for (const effect of state.effects) {
    if (effect.duration.kind === 'turn_boundaries') {
      const round = futureBoundaryRound(
        state,
        effect.duration.timing.combatant,
        effect.duration.timing.boundary,
        effect.duration.remaining,
      );
      if (round !== null) upcoming.push({
        kind: 'effect_expiry',
        effectId: effect.id,
        boundary: {
          round,
          combatant: effect.duration.timing.combatant,
          boundary: effect.duration.timing.boundary,
        },
      });
    }
    if (effect.repeatedSave !== null) {
      const round = futureBoundaryRound(
        state,
        effect.repeatedSave.timing.combatant,
        effect.repeatedSave.timing.boundary,
        1,
      );
      if (round !== null) upcoming.push({
        kind: 'repeated_save_prompt',
        effectId: effect.id,
        target: effect.repeatedSave.timing.combatant,
        ability: effect.repeatedSave.ability,
        dc: effect.repeatedSave.dc,
        boundary: {
          round,
          combatant: effect.repeatedSave.timing.combatant,
          boundary: effect.repeatedSave.timing.boundary,
        },
      });
    }
  }
  for (const area of state.persistentAreas) {
    const byBoundary = new Map<string, typeof area.burningCells>();
    for (const burning of area.burningCells) {
      const key = `${String(burning.burnsAwayAt.round)}:${String(burning.burnsAwayAt.initiativeIndex)}`;
      byBoundary.set(key, [...(byBoundary.get(key) ?? []), burning]);
    }
    for (const cells of byBoundary.values()) {
      const first = cells[0];
      if (first === undefined) continue;
      const combatant = state.initiative[first.burnsAwayAt.initiativeIndex]?.combatant;
      if (combatant === undefined) continue;
      upcoming.push({
        kind: 'burn_away',
        areaId: area.id,
        cells: cells.map((entry) => ({ ...entry.cell })),
        boundary: { round: first.burnsAwayAt.round, combatant, boundary: 'start' },
      });
    }
  }

  const currentEncounter = history.at(-1)?.encounterOrdinal;
  const currentBoundaryRevision = [...history].reverse().find((entry) =>
    !entry.void && entry.encounterOrdinal === currentEncounter && entry.roundBoundary)?.revision;
  const delayed = new Set(history.flatMap((entry): readonly CombatantId[] =>
    !entry.void && entry.encounterOrdinal === currentEncounter &&
    entry.transition.kind === 'turn_delayed' && entry.transition.round === state.round
      ? [entry.transition.combatant]
      : []));
  return {
    phase: structuredClone(state.phase),
    round: state.round,
    currentCombatant: state.activeCombatant,
    initiative: state.initiative.map((entry, position) => {
      const subject = state.combatants.find((candidate) => candidate.profile.id === entry.combatant);
      if (subject === undefined) throw new Error(`Initiative combatant ${entry.combatant} is missing.`);
      return {
        combatant: entry.combatant,
        name: subject.profile.name,
        position,
        current: entry.combatant === state.activeCombatant,
        delayedThisRound: delayed.has(entry.combatant),
        life: subject.life,
      };
    }),
    upcoming: upcoming.sort((left, right) =>
      eventSortKey(state, left) - eventSortKey(state, right) || left.kind.localeCompare(right.kind)),
    roundBoundaries: history.flatMap((entry) =>
      !entry.void && entry.encounterOrdinal === currentEncounter && entry.roundBoundary
        ? [{
            round: entry.encounterRound,
            revision: entry.revision,
            current: entry.revision === currentBoundaryRevision,
          }]
        : []),
    branchPoints: history.flatMap((entry) =>
      !entry.void && entry.transition.kind === 'head_moved'
        ? [{
            revision: entry.revision,
            sourceRevision: entry.transition.sourceRevision,
            targetRevision: entry.transition.targetRevision,
            round: entry.encounterRound,
          }]
        : []),
  };
}
