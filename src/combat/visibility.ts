import type { CombatRulesProfile } from './combatant';
import type {
  DeathSaveState,
  EncounterCombatantState,
  EncounterState,
  LifeState,
  SpellSlotState,
  TurnResources,
} from './encounter';
import {
  canCombatantSee,
  combatantConditions,
  combatantSide,
  combatantSpace,
  effectiveCombatRules,
  effectiveCreatureSize,
} from './encounter';
import type { KnownCreatureSize, SerializedPlacementMode } from './creature-space';
import type { HiddenRollCategory } from './roll-visibility';
import type { EncounterEvent } from './events';
import type { GridCell } from './grid';
import type { CombatantId } from './values';

export type EncounterViewClassification = 'dm_only' | 'player_visible' | 'per_seat';

/** D359's exhaustive projection-decision inventory. */
export const ENCOUNTER_VIEW_CLASSIFICATION = {
  config: 'player_visible',
  phase: 'dm_only',
  rulesEdition: 'player_visible',
  hiddenRolls: 'dm_only',
  revision: 'player_visible',
  nextEventSequence: 'dm_only',
  nextDecisionSequence: 'dm_only',
  nextEffectSequence: 'dm_only',
  bounds: 'player_visible',
  blockedCells: 'per_seat',
  worldObjects: 'per_seat',
  nextWorldObjectSequence: 'dm_only',
  environment: 'dm_only',
  foggedCells: 'dm_only',
  dmNotes: 'dm_only',
  combatants: 'per_seat',
  tokens: 'per_seat',
  sharedSpaceRelations: 'dm_only',
  adjudicationPending: 'dm_only',
  absentTokens: 'dm_only',
  initiative: 'per_seat',
  activeCombatant: 'player_visible',
  activeInitiativeIndex: 'dm_only',
  round: 'player_visible',
  initiativeBeforeDelays: 'dm_only',
  effects: 'dm_only',
  persistentAreas: 'dm_only',
  nextPersistentAreaSequence: 'dm_only',
  reevaluatedBranches: 'dm_only',
  eventLog: 'per_seat',
  hiddenCombatants: 'per_seat',
  searchMemories: 'dm_only',
  alerting: 'dm_only',
  pendingDecisions: 'per_seat',
  reactionPolicies: 'dm_only',
  contentPacks: 'dm_only',
  equipment: 'dm_only',
  groundItems: 'dm_only',
  itemContacts: 'dm_only',
} as const satisfies Readonly<Record<keyof EncounterState, EncounterViewClassification>>;

/** D359 classification for every nested combatant field, including the overlay. */
export const COMBATANT_VIEW_CLASSIFICATION = {
  profile: 'per_seat',
  hitPoints: 'per_seat',
  life: 'player_visible',
  deathSaves: 'dm_only',
  deathAt: 'dm_only',
  turn: 'per_seat',
  temporaryHitPoints: 'per_seat',
  wildShapeUses: 'per_seat',
  wildShape: 'player_visible',
  form: 'per_seat',
  spellSlots: 'per_seat',
  limitedResources: 'per_seat',
  legendary: 'player_visible',
} as const satisfies Readonly<Record<keyof EncounterCombatantState, EncounterViewClassification>>;

type ProjectedCanonicalEncounterState = {
  readonly [Field in keyof EncounterState]: EncounterState[Field];
};

/** Omniscient view seam. The wrapper prevents EncounterState from being passed as a view. */
export interface DmView {
  readonly audience: 'dm';
  readonly state: ProjectedCanonicalEncounterState;
}

export interface PlayerSeatBinding {
  readonly seatId: string;
  /** The combatant whose current senses establish this seat's visibility. */
  readonly combatantId: CombatantId;
  /** Combatants controlled by this seat; defaults to the bound combatant. */
  readonly ownedCombatantIds?: readonly CombatantId[];
}

export class UnknownPlayerSeatCombatantError extends Error {
  override readonly name = 'UnknownPlayerSeatCombatantError' as const;

  constructor(
    readonly seatId: string,
    readonly combatantId: CombatantId,
  ) {
    super(`Player seat ${seatId} is bound to an unknown combatant ${combatantId}.`);
  }
}

interface PlayerVisibleCombatantIdentity {
  readonly id: CombatantId;
  readonly name: string;
  readonly kind: 'player_character' | 'monster';
  readonly life: LifeState;
  readonly active: boolean;
  readonly formName: string | null;
  readonly conditions: readonly string[];
}

function playerVisibleConditions(
  state: EncounterState,
  id: CombatantId,
  owned: boolean,
): readonly string[] {
  return combatantConditions(state, id).flatMap((condition): readonly string[] => {
    if (owned) {
      return [condition.name === 'Exhaustion'
        ? `${condition.name} ${String(condition.level)}`
        : condition.name];
    }
    switch (condition.name) {
      case 'Blinded':
      case 'Grappled':
      case 'Paralyzed':
      case 'Petrified':
      case 'Prone':
      case 'Restrained':
      case 'Stunned':
      case 'Unconscious': return [condition.name];
      case 'Charmed':
      case 'Deafened':
      case 'Exhaustion':
      case 'Frightened':
      case 'Incapacitated':
      case 'Invisible':
      case 'Poisoned': return [];
    }
  });
}

export interface PlayerVisiblePlacedCombatant extends PlayerVisibleCombatantIdentity {
  readonly placementStatus: 'placed';
  readonly position: GridCell;
  readonly effectiveSize: KnownCreatureSize;
  readonly placementMode: SerializedPlacementMode;
  readonly footprint: readonly [GridCell, ...GridCell[]];
}

export interface PlayerVisiblePlacementPendingCombatant extends PlayerVisibleCombatantIdentity {
  readonly placementStatus: 'placement_pending';
  readonly pendingReason: EncounterState['adjudicationPending'][number]['kind'];
}

export type PlayerVisibleCombatant =
  | PlayerVisiblePlacedCombatant
  | PlayerVisiblePlacementPendingCombatant;

export function isPlacedVisibleCombatant<Combatant extends PlayerVisibleCombatant>(
  combatant: Combatant,
): combatant is Extract<Combatant, { readonly placementStatus: 'placed' }> {
  return combatant.placementStatus === 'placed';
}

export interface PlayerOwnedCombatant {
  readonly id: CombatantId;
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly turn: TurnResources;
  readonly wildShapeUses: EncounterCombatantState['wildShapeUses'];
}

interface DmVisibleCombatantDetails {
  readonly hitPoints: number;
  readonly rules: CombatRulesProfile;
  readonly deathSaves: DeathSaveState | null;
  readonly turn: TurnResources;
  readonly spellSlots: readonly SpellSlotState[];
  readonly hiddenFromPlayers: boolean;
}

export type DmVisiblePlacedCombatant = PlayerVisiblePlacedCombatant & DmVisibleCombatantDetails;
export type DmVisiblePlacementPendingCombatant = PlayerVisiblePlacementPendingCombatant & DmVisibleCombatantDetails;
export type DmVisibleCombatant = DmVisiblePlacedCombatant | DmVisiblePlacementPendingCombatant;

type DeathSaveResolvedEvent = Extract<EncounterEvent, { readonly type: 'death_save_resolved' }>;
type AttackResolvedEvent = Extract<EncounterEvent, { readonly type: 'attack_resolved' }>;
type SaveResolvedEvent = Extract<EncounterEvent, { readonly type: 'save_resolved' }>;

export type DeathSaveEventFieldClassification =
  | EncounterViewClassification
  | 'toggle_controlled';

/** D359 forces every raw death-save event field through an explicit projection decision. */
export const DEATH_SAVE_EVENT_VIEW_CLASSIFICATION = {
  sequence: 'player_visible',
  type: 'player_visible',
  combatant: 'player_visible',
  roll: 'toggle_controlled',
  outcome: 'player_visible',
  successes: 'player_visible',
  failures: 'player_visible',
  lifeState: 'player_visible',
  stableRecovery: 'player_visible',
} as const satisfies Readonly<Record<keyof DeathSaveResolvedEvent, DeathSaveEventFieldClassification>>;

export type PlayerVisibleDeathSaveEvent =
  | (DeathSaveResolvedEvent & { readonly rollVisibility: 'player_visible' })
  | (Omit<DeathSaveResolvedEvent, 'roll'> & { readonly rollVisibility: 'dm_only' });

export type PlayerVisibleAttackEvent =
  | (AttackResolvedEvent & { readonly rollVisibility: 'player_visible' })
  | {
      readonly sequence: number;
      readonly type: 'attack_resolved';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly outcome: AttackResolvedEvent['attack']['outcome'];
      readonly rollVisibility: 'dm_only';
    };

export type PlayerVisibleSaveEvent =
  | (SaveResolvedEvent & { readonly rollVisibility: 'player_visible' })
  | {
      readonly sequence: number;
      readonly type: 'save_resolved';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly ability: SaveResolvedEvent['ability'];
      readonly effectId: SaveResolvedEvent['effectId'];
      readonly outcome: SaveResolvedEvent['save']['outcome'];
      readonly rollVisibility: 'dm_only';
    };

export type PlayerVisibleEncounterEvent =
  | Exclude<EncounterEvent,
      | { readonly type: 'adjudicated' | 'attack_resolved' | 'save_resolved' | 'death_save_resolved' }
      | { readonly visibility: 'dm_only' }
    >
  | PlayerVisibleAttackEvent
  | PlayerVisibleSaveEvent
  | PlayerVisibleDeathSaveEvent
  | {
      readonly sequence: number;
      readonly type: 'adjudicated';
      readonly target: CombatantId;
      readonly consequence: Extract<EncounterEvent, { readonly type: 'adjudicated' }>['consequence'];
    };

export interface PlayerView {
  readonly audience: 'player';
  readonly seat: PlayerSeatBinding;
  readonly revision: number;
  readonly round: number;
  readonly activeCombatant: CombatantId | null;
  readonly bounds: EncounterState['bounds'];
  /** Cells that exist for this seat. Fogged cells are absent, not flagged. */
  readonly cells: readonly GridCell[];
  /** Per-seat concealed cells, including a cell occupied by a Hidden combatant. */
  readonly concealedCells: readonly GridCell[];
  readonly blockedCells: readonly GridCell[];
  readonly worldObjects: EncounterState['worldObjects'];
  readonly combatants: readonly PlayerVisibleCombatant[];
  readonly ownedCombatants: readonly PlayerOwnedCombatant[];
  readonly recentEvents: readonly PlayerVisibleEncounterEvent[];
}

/** Compact DM-facing summary used by controllers and bridge envelopes. */
export interface DmVisibleEncounterState {
  readonly viewer: 'dm';
  readonly phase: EncounterState['phase'];
  readonly revision: number;
  readonly round: number;
  readonly activeCombatant: CombatantId | null;
  readonly hiddenRolls: readonly HiddenRollCategory[];
  readonly bounds: EncounterState['bounds'];
  readonly blockedCells: readonly GridCell[];
  readonly worldObjects: EncounterState['worldObjects'];
  readonly environment: EncounterState['environment'];
  readonly combatants: readonly DmVisibleCombatant[];
  readonly sharedSpaceRelations: EncounterState['sharedSpaceRelations'];
  readonly adjudicationPending: EncounterState['adjudicationPending'];
  readonly recentEvents: readonly EncounterEvent[];
  readonly dmOnly: {
    readonly foggedCells: readonly GridCell[];
    readonly notes: readonly string[];
  };
}

export type PlayerVisibleEncounterState = PlayerView;
export type VisibleEncounterState = PlayerView | DmVisibleEncounterState;

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function allCells(bounds: EncounterState['bounds']): readonly GridCell[] {
  const cells: GridCell[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) {
      cells.push({ column, row });
    }
  }
  return cells;
}

function eventCombatants(event: EncounterEvent): readonly CombatantId[] {
  switch (event.type) {
    case 'adjudicated': return [event.target];
    case 'search_memory_recorded':
    case 'suspicion_region_expanded':
    case 'search_memory_cleared': return [event.observer, event.target];
    case 'suspected_square_attacked': return [event.actor, event.suspectedTarget];
    case 'npc_called_for_help': return [event.caller, event.attacker];
    case 'combatant_joined_encounter': return [event.combatant, event.calledBy];
    case 'initiative_rolled':
    case 'pending_placement_resolved':
    case 'turn_started':
    case 'movement_completed':
    case 'death_save_resolved':
    case 'resource_spent':
    case 'limited_resource_spent':
    case 'healing_pool_consumed':
    case 'healing_potion_consumed':
    case 'spell_slot_spent':
    case 'temporary_hit_points_changed':
    case 'stance_started':
    case 'turn_ended':
    case 'combatant_left_board':
    case 'combatant_returned_to_board':
    case 'combatant_summoned':
    case 'summoned_combatant_despawned':
    case 'object_interaction_spent':
    case 'item_dropped':
    case 'item_picked_up':
    case 'item_equipped':
    case 'item_stowed':
    case 'wild_shape_assumed':
    case 'wild_shape_reverted':
    case 'hide_resolved':
    case 'search_resolved':
    case 'pending_decision_queued':
    case 'pending_decision_resolved':
    case 'reaction_policy_auto_resolved': return [event.combatant];
    case 'legendary_action_used':
    case 'legendary_action_pool_refreshed':
    case 'legendary_action_window_closed':
    case 'legendary_resistance_used': return [event.combatant];
    case 'initiative_block_rolled': return event.combatants;
    case 'spell_component_consumed':
    case 'slow_spellcasting_checked': return [event.caster];
    case 'spell_cast':
    case 'sustained_effect_activated':
    case 'sustained_effect_triggered': return [event.caster, ...event.targets];
    case 'spell_utility_resolved':
    case 'composition_step_resolved': return [event.caster];
    case 'shared_outcome_resolved': return [event.caster, event.target];
    case 'reaction_declined': return [event.combatant, event.mover];
    case 'reaction_offered':
    case 'reaction_refused':
    case 'reaction_resolved': return [event.combatant];
    case 'spell_cast_intercepted': return [event.caster, event.reactor];
    case 'initiative_ordered': return event.order;
    case 'attack_resolved': return [event.actor, event.target];
    case 'ability_check_resolved': return [event.actor];
    case 'save_resolved': return [event.source, event.target];
    case 'damage_applied':
    case 'healing_applied': return [event.source, event.target];
    case 'effect_applied': return [event.source, ...event.targets];
    case 'condition_application_refused': return [event.source, event.target];
    case 'effect_target_removed': return [event.target];
    case 'effect_ended':
    case 'effect_clock_ticked':
    case 'effect_duration_extended':
    case 'persistent_area_ended':
    case 'world_object_created':
    case 'world_object_modified':
    case 'world_object_damaged':
    case 'world_object_removed':
    case 'environment_terrain_changed':
    case 'environment_light_changed':
      return 'actor' in event && event.actor !== null ? [event.actor] : [];
    case 'world_object_used': return [event.actor];
    case 'reinforcement_wave_deployed': return [event.calledBy, ...event.combatants];
    case 'conditional_joiners_deployed': return [event.leader, ...event.combatants];
    case 'persistent_area_created':
    case 'persistent_area_moved': return [event.owner];
    case 'persistent_area_membership_changed': return [...event.entered, ...event.exited];
    case 'persistent_area_triggered': return [event.target];
    case 'hidden_ended': return [event.combatant];
  }
}

function isDmOnlyEvent(
  event: EncounterEvent,
): event is Extract<EncounterEvent, { readonly visibility: 'dm_only' }> {
  return 'visibility' in event && event.visibility === 'dm_only';
}

function playerEvents(
  events: readonly EncounterEvent[],
  visibleIds: ReadonlySet<CombatantId>,
  hiddenRolls: ReadonlySet<HiddenRollCategory>,
  monsterIds: ReadonlySet<CombatantId>,
): readonly PlayerVisibleEncounterEvent[] {
  return events.flatMap((event): readonly PlayerVisibleEncounterEvent[] => {
    if (event.type === 'death_save_resolved') {
      if (!visibleIds.has(event.combatant)) return [];
      return hiddenRolls.has('death_saves')
        ? [{
            sequence: event.sequence,
            type: event.type,
            combatant: event.combatant,
            outcome: event.outcome,
            successes: event.successes,
            failures: event.failures,
            lifeState: event.lifeState,
            stableRecovery: event.stableRecovery,
            rollVisibility: 'dm_only',
          }]
        : [{ ...event, rollVisibility: 'player_visible' }];
    }
    if (event.type === 'attack_resolved') {
      if (!eventCombatants(event).every((id) => visibleIds.has(id))) return [];
      return hiddenRolls.has('monster_attack_rolls') && monsterIds.has(event.actor)
        ? [{
            sequence: event.sequence,
            type: event.type,
            actor: event.actor,
            target: event.target,
            outcome: event.attack.outcome,
            rollVisibility: 'dm_only',
          }]
        : [{ ...event, rollVisibility: 'player_visible' }];
    }
    if (event.type === 'save_resolved') {
      if (!eventCombatants(event).every((id) => visibleIds.has(id))) return [];
      return hiddenRolls.has('monster_saving_throws') && monsterIds.has(event.target)
        ? [{
            sequence: event.sequence,
            type: event.type,
            source: event.source,
            target: event.target,
            ability: event.ability,
            effectId: event.effectId,
            outcome: event.save.outcome,
            rollVisibility: 'dm_only',
          }]
        : [{ ...event, rollVisibility: 'player_visible' }];
    }
    if (isDmOnlyEvent(event)) return [];
    if (
      event.type === 'effect_ended' ||
      event.type === 'effect_clock_ticked' ||
      event.type === 'effect_duration_extended'
    ) return [];
    if (event.type === 'initiative_ordered') {
      return [{
        ...event,
        order: event.order.filter((id) => visibleIds.has(id)),
        slots: event.slots
          .map((slot) => slot.filter((id) => visibleIds.has(id)))
          .filter((slot) => slot.length > 0),
      }];
    }
    if (event.type === 'adjudicated') {
      return visibleIds.has(event.target)
        ? [{ sequence: event.sequence, type: 'adjudicated', target: event.target, consequence: event.consequence }]
        : [];
    }
    return eventCombatants(event).every((id) => visibleIds.has(id)) ? [event] : [];
  });
}

/** The only canonical EncounterState -> DM projection function. */
export function projectDmView(state: EncounterState): DmView {
  return {
    audience: 'dm',
    state: {
      config: structuredClone(state.config),
      phase: structuredClone(state.phase),
      rulesEdition: state.rulesEdition,
      hiddenRolls: [...state.hiddenRolls],
      revision: state.revision,
      nextEventSequence: state.nextEventSequence,
      nextDecisionSequence: state.nextDecisionSequence,
      nextEffectSequence: state.nextEffectSequence,
      bounds: structuredClone(state.bounds),
      blockedCells: structuredClone(state.blockedCells),
      worldObjects: structuredClone(state.worldObjects),
      nextWorldObjectSequence: state.nextWorldObjectSequence,
      environment: structuredClone(state.environment),
      foggedCells: structuredClone(state.foggedCells),
      dmNotes: [...state.dmNotes],
      combatants: structuredClone(state.combatants),
      tokens: structuredClone(state.tokens),
      sharedSpaceRelations: structuredClone(state.sharedSpaceRelations),
      adjudicationPending: structuredClone(state.adjudicationPending),
      ...(state.absentTokens === undefined ? {} : { absentTokens: structuredClone(state.absentTokens) }),
      initiative: structuredClone(state.initiative),
      activeCombatant: state.activeCombatant,
      activeInitiativeIndex: state.activeInitiativeIndex,
      round: state.round,
      effects: structuredClone(state.effects),
      persistentAreas: structuredClone(state.persistentAreas),
      nextPersistentAreaSequence: state.nextPersistentAreaSequence,
      ...(state.reevaluatedBranches === undefined ? {} : { reevaluatedBranches: structuredClone(state.reevaluatedBranches) }),
      eventLog: structuredClone(state.eventLog),
      hiddenCombatants: structuredClone(state.hiddenCombatants),
      ...(state.searchMemories === undefined ? {} : { searchMemories: structuredClone(state.searchMemories) }),
      ...(state.alerting === undefined ? {} : { alerting: structuredClone(state.alerting) }),
      pendingDecisions: structuredClone(state.pendingDecisions),
      reactionPolicies: structuredClone(state.reactionPolicies),
      ...(state.contentPacks === undefined ? {} : { contentPacks: structuredClone(state.contentPacks) }),
      ...(state.equipment === undefined ? {} : { equipment: structuredClone(state.equipment) }),
      ...(state.groundItems === undefined ? {} : { groundItems: structuredClone(state.groundItems) }),
      ...(state.itemContacts === undefined ? {} : { itemContacts: structuredClone(state.itemContacts) }),
    },
  };
}

/** The only canonical EncounterState -> player projection function. */
export function projectPlayerView(state: EncounterState, binding: PlayerSeatBinding): PlayerView {
  if (!state.combatants.some((subject) => subject.profile.id === binding.combatantId)) {
    throw new UnknownPlayerSeatCombatantError(binding.seatId, binding.combatantId);
  }
  const ownedIds = new Set(binding.ownedCombatantIds ?? [binding.combatantId]);
  if (!ownedIds.has(binding.combatantId)) {
    throw new Error(`Player seat ${binding.seatId} does not own its visibility combatant.`);
  }
  const tokensByCombatant = new Map(state.tokens.map((token) => [token.combatantId, token] as const));
  const fog = new Set(state.foggedCells.map(cellKey));
  const hidden = new Set(state.hiddenCombatants.map((entry) => entry.combatant));
  // Hidden creature geometry is never read into a player-safe projection.
  const concealed = new Set(fog);
  const initiativeOrder = new Map(state.initiative.map((entry, index) =>
    [entry.combatant, index] as const));
  const visibilityObserverPending = state.adjudicationPending.some(
    (entry) => entry.combatant === binding.combatantId,
  );
  const combatants = state.combatants.flatMap((subject): readonly PlayerVisibleCombatant[] => {
    const pending = state.adjudicationPending.find((entry) =>
      entry.combatant === subject.profile.id);
    if (pending !== undefined) {
      if (!ownedIds.has(subject.profile.id)) return [];
      return [{
        id: subject.profile.id,
        name: subject.profile.name,
        kind: combatantSide(state, subject.profile.id),
        life: subject.life,
        placementStatus: 'placement_pending',
        pendingReason: pending.kind,
        active: state.activeCombatant === subject.profile.id,
        formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
        conditions: playerVisibleConditions(state, subject.profile.id, true),
      }];
    }
    const token = tokensByCombatant.get(subject.profile.id);
    if (token === undefined) return [];
    const owned = ownedIds.has(subject.profile.id);
    if (!owned && visibilityObserverPending) return [];
    if (hidden.has(subject.profile.id) || (!owned && !canCombatantSee(state, binding.combatantId, subject.profile.id))) return [];
    const space = combatantSpace(state, subject.profile.id);
    if (!owned && space.cells.every((cell) => fog.has(cellKey(cell)))) return [];
    return [{
      id: subject.profile.id,
      name: subject.profile.name,
      kind: combatantSide(state, subject.profile.id),
      life: subject.life,
      placementStatus: 'placed',
      position: { ...token.position },
      effectiveSize: effectiveCreatureSize(state, subject.profile.id),
      placementMode: structuredClone(token.placementMode),
      footprint: space.cells.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
      active: state.activeCombatant === subject.profile.id,
      formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
      conditions: playerVisibleConditions(state, subject.profile.id, owned),
    }];
  }).sort((left, right) =>
    (initiativeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (initiativeOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
    String(left.id).localeCompare(String(right.id)));
  const visibleIds = new Set(combatants.map((subject) => subject.id));
  const monsterIds = new Set(state.combatants.flatMap((subject) =>
    subject.profile.kind === 'monster' ? [subject.profile.id] : []));
  return {
    audience: 'player',
    seat: {
      seatId: binding.seatId,
      combatantId: binding.combatantId,
      ...(binding.ownedCombatantIds === undefined ? {} : { ownedCombatantIds: [...binding.ownedCombatantIds] }),
    },
    revision: state.revision,
    round: state.round,
    activeCombatant: state.activeCombatant,
    bounds: { ...state.bounds },
    cells: allCells(state.bounds).filter((cell) => !concealed.has(cellKey(cell))),
    concealedCells: allCells(state.bounds).filter((cell) => concealed.has(cellKey(cell))),
    blockedCells: state.blockedCells.filter((cell) => !concealed.has(cellKey(cell))).map((cell) => ({ ...cell })),
    worldObjects: state.worldObjects
      .filter((object) => object.footprint.every((cell) => !concealed.has(cellKey(cell))))
      .map((object) => structuredClone(object)),
    combatants,
    ownedCombatants: state.combatants
      .filter((subject) => ownedIds.has(subject.profile.id))
      .map((subject) => ({
        id: subject.profile.id,
        hitPoints: subject.hitPoints,
        hitPointMaximum: effectiveCombatRules(state, subject.profile.id).hitPointMaximum,
        turn: structuredClone(subject.turn),
        wildShapeUses: structuredClone(subject.wildShapeUses),
      })),
    recentEvents: playerEvents(state.eventLog, visibleIds, new Set(state.hiddenRolls), monsterIds),
  };
}

/** Surface mapper; its input is already a DmView, never canonical state. */
export function dmVisibleEncounter(view: DmView): DmVisibleEncounterState {
  const state = view.state;
  const tokensByCombatant = new Map(state.tokens.map((token) => [token.combatantId, token] as const));
  return {
    viewer: 'dm',
    phase: structuredClone(state.phase),
    revision: state.revision,
    round: state.round,
    activeCombatant: state.activeCombatant,
    hiddenRolls: [...state.hiddenRolls],
    bounds: { ...state.bounds },
    blockedCells: state.blockedCells.map((cell) => ({ ...cell })),
    worldObjects: structuredClone(state.worldObjects),
    environment: structuredClone(state.environment),
    combatants: state.combatants.flatMap((subject): readonly DmVisibleCombatant[] => {
      const pending = state.adjudicationPending.find((entry) =>
        entry.combatant === subject.profile.id);
      if (pending !== undefined) {
        return [{
          id: subject.profile.id,
          name: subject.profile.name,
          kind: combatantSide(state, subject.profile.id),
          hitPoints: subject.hitPoints,
          life: subject.life,
          placementStatus: 'placement_pending',
          pendingReason: pending.kind,
          active: state.activeCombatant === subject.profile.id,
          formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
          rules: structuredClone(effectiveCombatRules(state, subject.profile.id)),
          deathSaves: structuredClone(subject.deathSaves),
          turn: structuredClone(subject.turn),
          spellSlots: structuredClone(subject.spellSlots),
          hiddenFromPlayers: state.hiddenCombatants.some((entry) => entry.combatant === subject.profile.id),
          conditions: playerVisibleConditions(state, subject.profile.id, true),
        }];
      }
      const token = tokensByCombatant.get(subject.profile.id);
      if (token === undefined) return [];
      const space = combatantSpace(state, subject.profile.id);
      return [{
        id: subject.profile.id,
        name: subject.profile.name,
        kind: combatantSide(state, subject.profile.id),
        hitPoints: subject.hitPoints,
        life: subject.life,
        placementStatus: 'placed',
        position: { ...token.position },
        effectiveSize: effectiveCreatureSize(state, subject.profile.id),
        placementMode: structuredClone(token.placementMode),
        footprint: space.cells.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
        active: state.activeCombatant === subject.profile.id,
        formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
        rules: structuredClone(effectiveCombatRules(state, subject.profile.id)),
        deathSaves: structuredClone(subject.deathSaves),
        turn: structuredClone(subject.turn),
        spellSlots: structuredClone(subject.spellSlots),
        hiddenFromPlayers: state.hiddenCombatants.some((entry) => entry.combatant === subject.profile.id),
        conditions: playerVisibleConditions(state, subject.profile.id, true),
      }];
    }),
    sharedSpaceRelations: structuredClone(state.sharedSpaceRelations),
    adjudicationPending: structuredClone(state.adjudicationPending),
    recentEvents: structuredClone(state.eventLog),
    dmOnly: {
      foggedCells: state.foggedCells.map((cell) => ({ ...cell })),
      notes: [...state.dmNotes],
    },
  };
}
