import type { CombatRulesProfile } from './combatant';
import type {
  DeathSaveState,
  EncounterState,
  LifeState,
} from './encounter';
import type { EncounterEvent } from './events';
import type { GridCell } from './grid';
import type { CombatantId } from './values';

export type EncounterViewer =
  | { readonly kind: 'dm' }
  | { readonly kind: 'player'; readonly combatantId: CombatantId };

export interface PlayerVisibleCombatant {
  readonly id: CombatantId;
  readonly name: string;
  readonly kind: 'player_character' | 'monster';
  readonly hitPoints: number;
  readonly life: LifeState;
  readonly position: GridCell;
  readonly active: boolean;
}

export interface DmVisibleCombatant extends PlayerVisibleCombatant {
  readonly rules: CombatRulesProfile;
  readonly deathSaves: DeathSaveState | null;
}

interface VisibleEncounterBase {
  readonly revision: number;
  readonly round: number;
  readonly activeCombatant: CombatantId | null;
  readonly bounds: EncounterState['bounds'];
  readonly blockedCells: readonly GridCell[];
  readonly recentEvents: readonly EncounterEvent[];
}

export interface PlayerVisibleEncounterState extends VisibleEncounterBase {
  readonly viewer: 'player';
  readonly combatants: readonly PlayerVisibleCombatant[];
}

export interface DmVisibleEncounterState extends VisibleEncounterBase {
  readonly viewer: 'dm';
  readonly combatants: readonly DmVisibleCombatant[];
  readonly dmOnly: {
    readonly foggedCells: readonly GridCell[];
    readonly notes: readonly string[];
  };
}

export type VisibleEncounterState =
  | PlayerVisibleEncounterState
  | DmVisibleEncounterState;

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function eventCombatants(event: EncounterEvent): readonly CombatantId[] {
  switch (event.type) {
    case 'initiative_rolled':
    case 'turn_started':
    case 'movement_completed':
    case 'death_save_resolved':
    case 'resource_spent':
    case 'stance_started':
    case 'turn_ended':
      return [event.combatant];
    case 'reaction_declined':
      return [event.combatant, event.mover];
    case 'initiative_ordered':
      return event.order;
    case 'attack_resolved':
      return [event.actor, event.target];
    case 'save_resolved':
      return [event.source, event.target];
    case 'damage_applied':
    case 'healing_applied':
      return [event.source, event.target];
    case 'effect_applied':
      return [event.source, ...event.targets];
    case 'effect_target_removed':
      return [event.target];
    case 'effect_ended':
    case 'effect_clock_ticked':
      return [];
  }
}

function playerEvents(
  events: readonly EncounterEvent[],
  visibleIds: ReadonlySet<CombatantId>,
): readonly EncounterEvent[] {
  return events.flatMap((event): readonly EncounterEvent[] => {
    if ('visibility' in event && event.visibility === 'dm_only') return [];
    if (event.type === 'effect_ended' || event.type === 'effect_clock_ticked') {
      return [];
    }
    if (event.type === 'initiative_ordered') {
      return [{ ...event, order: event.order.filter((id) => visibleIds.has(id)) }];
    }
    return eventCombatants(event).every((id) => visibleIds.has(id)) ? [event] : [];
  });
}

export function projectEncounter(
  state: EncounterState,
  viewer: { readonly kind: 'dm' },
): DmVisibleEncounterState;
export function projectEncounter(
  state: EncounterState,
  viewer: { readonly kind: 'player'; readonly combatantId: CombatantId },
): PlayerVisibleEncounterState;
export function projectEncounter(
  state: EncounterState,
  viewer: EncounterViewer,
): VisibleEncounterState;
export function projectEncounter(
  state: EncounterState,
  viewer: EncounterViewer,
): VisibleEncounterState {
  const tokensByCombatant = new Map(
    state.tokens.map((token) => [token.combatantId, token] as const),
  );
  const fog = new Set(state.foggedCells.map(cellKey));
  const base = {
    revision: state.revision,
    round: state.round,
    activeCombatant: state.activeCombatant,
    bounds: { ...state.bounds },
  };

  if (viewer.kind === 'dm') {
    return {
      ...base,
      viewer: 'dm',
      blockedCells: state.blockedCells.map((cell) => ({ ...cell })),
      combatants: state.combatants.map((subject) => {
        const token = tokensByCombatant.get(subject.profile.id);
        if (token === undefined) throw new Error('Encounter projection found no token.');
        return {
          id: subject.profile.id,
          name: subject.profile.name,
          kind: subject.profile.kind,
          hitPoints: subject.hitPoints,
          life: subject.life,
          position: { ...token.position },
          active: state.activeCombatant === subject.profile.id,
          rules: subject.profile.rules,
          deathSaves: subject.deathSaves,
        };
      }),
      recentEvents: [...state.eventLog],
      dmOnly: {
        foggedCells: state.foggedCells.map((cell) => ({ ...cell })),
        notes: [...state.dmNotes],
      },
    };
  }

  const combatants = state.combatants.flatMap(
    (subject): readonly PlayerVisibleCombatant[] => {
      const token = tokensByCombatant.get(subject.profile.id);
      if (token === undefined) throw new Error('Encounter projection found no token.');
      const isViewer = subject.profile.id === viewer.combatantId;
      if (!isViewer && fog.has(cellKey(token.position))) return [];
      return [{
        id: subject.profile.id,
        name: subject.profile.name,
        kind: subject.profile.kind,
        hitPoints: subject.hitPoints,
        life: subject.life,
        position: { ...token.position },
        active: state.activeCombatant === subject.profile.id,
      }];
    },
  );
  const visibleIds = new Set(combatants.map((subject) => subject.id));
  return {
    ...base,
    viewer: 'player',
    activeCombatant:
      state.activeCombatant !== null && visibleIds.has(state.activeCombatant)
        ? state.activeCombatant
        : null,
    blockedCells: state.blockedCells
      .filter((cell) => !fog.has(cellKey(cell)))
      .map((cell) => ({ ...cell })),
    combatants,
    recentEvents: playerEvents(state.eventLog, visibleIds),
  };
}
