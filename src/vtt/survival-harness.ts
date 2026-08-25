import { AlgorithmController, ControllerRegistry } from '../combat/controllers';
import { TurnCoordinator } from '../combat/coordinator';
import type { EncounterState } from '../combat/encounter';
import type { EncounterEvent } from '../combat/events';
import { mulberry32, type Rng } from '../combat/random';
import type { CombatantId } from '../combat/values';
import { composeD365Room } from './d365-sample-dungeon';
import type { LoadedPartyMember } from './party-pack';
import {
  capturePartySessionState,
  createPartySessionState,
  enterNextRoom,
  takeShortRest,
  type PartySessionState,
  type ShortRestHitDieSpend,
} from './party-session-state';
import { regretReactionLegalActions } from './regret/legal-actions';
import type { StoredCharacterEncounter } from './stored-character-encounter';
import { createD365SurvivalPartySessionState } from './survival-policy';
import {
  composeVaneWarrenFight,
  reduceVaneWarrenEncounter,
  VANE_WARREN_FIGHT_IDS,
  VANE_WARREN_FIGHTS,
  type VaneWarrenFightId,
} from './vane-warren';

export const SURVIVAL_MEASUREMENT_SEEDS = Array.from(
  { length: 30 },
  (_value, index) => 20_260_801 + index,
);

export type SurvivalCampaignMode = 'rehearsal_baseline' | 'survival_package';

export interface SurvivalFightMeasurement {
  readonly id: string;
  readonly name: string;
  readonly outcome: 'victory' | 'defeat';
  readonly resolved: boolean;
  readonly round: number;
  readonly hitPointsEntering: Readonly<Record<string, number>>;
  readonly hitPointsLeaving: Readonly<Record<string, number>>;
  readonly incomingDamage: number;
  readonly outgoingDamage: number;
  readonly inCombatHealing: number;
  readonly shortRestHealingAfter: number;
  readonly playerTurnOpportunities: number;
  readonly enemyTurnOpportunities: number;
  readonly potionUses: number;
  readonly blessCasts: number;
  readonly concentrationBreaks: number;
  readonly playerCharactersDropped: readonly string[];
}

export interface SurvivalCampaignMeasurement {
  readonly seed: number;
  readonly mode: SurvivalCampaignMode;
  readonly finalEncounterCompleted: boolean;
  readonly stoppedAfter: string;
  readonly fights: readonly SurvivalFightMeasurement[];
  readonly totalIncomingDamage: number;
  readonly totalOutgoingDamage: number;
  readonly totalInCombatHealing: number;
  readonly totalShortRestHealing: number;
  readonly totalPotionUses: number;
}

export interface SurvivalFractionMeasurement {
  readonly seeds: readonly number[];
  readonly successes: number;
  readonly total: number;
  readonly fraction: number;
  readonly campaigns: readonly SurvivalCampaignMeasurement[];
}

function encounterResolved(state: EncounterState): boolean {
  const playersRemain = state.combatants.some((candidate) =>
    candidate.profile.kind === 'player_character' && candidate.life !== 'dead');
  const monstersRemain = state.combatants.some((candidate) =>
    candidate.profile.kind === 'monster' && candidate.life !== 'dead');
  return !playersRemain || !monstersRemain;
}

function nameFor(
  state: EncounterState,
  id: CombatantId,
): string {
  return state.combatants.find((candidate) => candidate.profile.id === id)?.profile.name ?? String(id);
}

function hitPointsByName(
  state: EncounterState,
): Readonly<Record<string, number>> {
  return Object.fromEntries(state.combatants.flatMap((candidate) =>
    candidate.profile.kind === 'player_character'
      ? [[candidate.profile.name, candidate.hitPoints] as const]
      : []));
}

function sideOf(state: EncounterState, id: CombatantId): 'player' | 'enemy' | null {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  return subject?.profile.kind === 'player_character'
    ? 'player'
    : subject?.profile.kind === 'monster' ? 'enemy' : null;
}

function eventTotal(
  events: readonly EncounterEvent[],
  predicate: (event: EncounterEvent) => number,
): number {
  return events.reduce((total, event) => total + predicate(event), 0);
}

async function runFight(
  encounter: StoredCharacterEncounter,
  rng: Rng,
  id: string,
  name: string,
  useVaneReducer: boolean,
): Promise<{ readonly state: EncounterState; readonly measurement: SurvivalFightMeasurement }> {
  const entering = hitPointsByName(encounter.state);
  const registry = new ControllerRegistry(encounter.state.combatants.map((candidate) => ({
    combatantId: candidate.profile.id,
    controller: new AlgorithmController(),
  })));
  const coordinator = new TurnCoordinator(
    encounter.state,
    registry,
    rng,
    {
      ...(useVaneReducer ? { commandReducer: reduceVaneWarrenEncounter } : {}),
      turnLegalActions: encounter.turnLegalActions,
      reactionLegalActions: regretReactionLegalActions,
    },
  );
  const assignDynamicControllers = (events: readonly EncounterEvent[]): void => {
    for (const event of events) {
      if (event.type !== 'reinforcement_wave_deployed' && event.type !== 'conditional_joiners_deployed') continue;
      const source = event.type === 'reinforcement_wave_deployed' ? event.calledBy : event.leader;
      for (const combatant of event.combatants) {
        if (!registry.identities().some((identity) => identity.combatantId === combatant)) {
          registry.assignFrom(combatant, source);
        }
      }
    }
  };
  let steps = 0;
  while (!encounterResolved(coordinator.state()) && coordinator.state().round <= 60 && steps < 8_000) {
    const pending = coordinator.state().pendingDecisions[0];
    if (pending !== undefined && pending.kind !== 'adjudication_prompt') {
      const option = pending.kind === 'death_save'
        ? pending.options.find((candidate) => candidate.id === 'roll')
        : pending.kind === 'reaction_offer'
          ? pending.options.find((candidate) => candidate.id === 'accept')
          : pending.kind === 'legendary_resistance'
            ? pending.options.find((candidate) => candidate.id === 'spend')
            : pending.options.find((candidate) => candidate.id !== 'pass');
      if (option === undefined) throw new Error(`${name}: pending ${pending.kind} decision has no executable option.`);
      const resolution = coordinator.resolvePendingDecision({
        type: 'resolve_pending_decision',
        decisionId: pending.id,
        optionId: option.id,
      });
      if (resolution.kind === 'refused') throw new Error(`${name}: ${resolution.reason}`);
      assignDynamicControllers(resolution.events);
      steps += 1;
      continue;
    }
    const step = await coordinator.step();
    if (step.kind === 'refused') throw new Error(`${name}: ${step.reason}`);
    assignDynamicControllers(step.events);
    steps += 1;
  }
  const state = coordinator.state();
  const resolved = encounterResolved(state);
  const monstersRemain = state.combatants.some((candidate) =>
    candidate.profile.kind === 'monster' && candidate.life !== 'dead');
  const dropped = new Set(state.eventLog.flatMap((event) =>
    event.type === 'damage_applied' && event.hitPointsAfter === 0 && sideOf(state, event.target) === 'player'
      ? [nameFor(state, event.target)]
      : []));
  return {
    state,
    measurement: {
      id,
      name,
      outcome: monstersRemain ? 'defeat' : 'victory',
      resolved,
      round: state.round,
      hitPointsEntering: entering,
      hitPointsLeaving: hitPointsByName(state),
      incomingDamage: eventTotal(state.eventLog, (event) =>
        event.type === 'damage_applied' && sideOf(state, event.source) === 'enemy' && sideOf(state, event.target) === 'player'
          ? event.amount : 0),
      outgoingDamage: eventTotal(state.eventLog, (event) =>
        event.type === 'damage_applied' && sideOf(state, event.source) === 'player' && sideOf(state, event.target) === 'enemy'
          ? event.amount : 0),
      inCombatHealing: eventTotal(state.eventLog, (event) =>
        event.type === 'healing_applied' && sideOf(state, event.target) === 'player' ? event.amount : 0),
      shortRestHealingAfter: 0,
      playerTurnOpportunities: state.eventLog.filter((event) =>
        event.type === 'turn_started' && sideOf(state, event.combatant) === 'player').length,
      enemyTurnOpportunities: state.eventLog.filter((event) =>
        event.type === 'turn_started' && sideOf(state, event.combatant) === 'enemy').length,
      potionUses: state.eventLog.filter((event) => event.type === 'healing_potion_consumed').length,
      blessCasts: state.eventLog.filter((event) =>
        event.type === 'spell_cast' && event.spellId === 'bless').length,
      concentrationBreaks: state.eventLog.filter((event) =>
        event.type === 'effect_ended' && event.reason === 'concentration_broken').length,
      playerCharactersDropped: [...dropped].sort(),
    },
  };
}

function shortRestPolicy(state: PartySessionState): readonly ShortRestHitDieSpend[] {
  return state.characters.flatMap((character): readonly ShortRestHitDieSpend[] => {
    if (character.life !== 'living' || character.currentHitPoints >= character.hitPointMaximum) return [];
    let deficit = character.hitPointMaximum - character.currentHitPoints;
    const dice: Array<{ readonly sides: 6 | 8 | 10 | 12; readonly count: number }> = [];
    for (const pool of [...character.hitDice].sort((left, right) => right.sides - left.sides)) {
      if (deficit <= 0) break;
      const expectedHealing = Math.max(1, (pool.sides + 1) / 2 + character.constitutionModifier);
      const count = Math.min(pool.remaining, Math.ceil(deficit / expectedHealing));
      if (count > 0) {
        dice.push({ sides: pool.sides, count });
        deficit -= count * expectedHealing;
      }
    }
    return dice.length === 0 ? [] : [{ combatantId: character.combatantId, dice }];
  });
}

function withShortRestHealing(
  measurement: SurvivalFightMeasurement,
  healing: number,
): SurvivalFightMeasurement {
  return { ...measurement, shortRestHealingAfter: healing };
}

export async function runSurvivalCampaign(
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string>,
  seed: number,
  mode: SurvivalCampaignMode,
): Promise<SurvivalCampaignMeasurement> {
  const rng = mulberry32(seed);
  let partyState = mode === 'survival_package'
    ? createD365SurvivalPartySessionState(members).state
    : createPartySessionState(members);
  const policy = mode === 'survival_package'
    ? { useHealingPotions: true, openWithBless: true, reserveClericSlotsForBless: true }
    : { useHealingPotions: false, openWithBless: false, reserveClericSlotsForBless: false };
  const fights: SurvivalFightMeasurement[] = [];

  const finishFight = (result: Awaited<ReturnType<typeof runFight>>, allowRest: boolean): boolean => {
    let measurement = result.measurement;
    partyState = capturePartySessionState(partyState, result.state);
    if (measurement.outcome === 'victory' && allowRest && mode === 'survival_package') {
      const rested = takeShortRest(partyState, shortRestPolicy(partyState), rng);
      measurement = withShortRestHealing(
        measurement,
        rested.rolls.reduce((total, roll) => total + roll.healing, 0),
      );
      partyState = rested.state;
    }
    fights.push(measurement);
    return measurement.outcome === 'victory';
  };

  for (let room = 1; room <= 4; room += 1) {
    const manifest = D365_ROOM_NAMES[room - 1];
    if (manifest === undefined) throw new Error(`Missing D365 room ${String(room)} measurement label.`);
    const result = await runFight(
      composeD365Room(members, displayNames, partyState, policy),
      rng,
      `dungeon-room-${String(room)}`,
      manifest,
      false,
    );
    if (!finishFight(result, true)) return summarize(seed, mode, fights);
    if (room < 4) partyState = enterNextRoom(partyState);
  }

  for (const fightId of VANE_WARREN_FIGHT_IDS) {
    const fight = VANE_WARREN_FIGHTS.find((candidate) => candidate.id === fightId);
    if (fight === undefined) throw new Error(`Missing Vane Warren fight ${fightId}.`);
    const result = await runFight(
      composeVaneWarrenFight(fightId, members, displayNames, partyState, policy),
      rng,
      `vane-warren:${fightId}`,
      `Vane Warren — ${fight.name}`,
      true,
    );
    if (!finishFight(result, fightId !== 'last-muster')) return summarize(seed, mode, fights);
  }
  return summarize(seed, mode, fights);
}

const D365_ROOM_NAMES = [
  'Briar Gate Pack',
  'Webbed Bear Den',
  'Ridgewing Gallery',
  'Ironweb Crown',
] as const;

function summarize(
  seed: number,
  mode: SurvivalCampaignMode,
  fights: readonly SurvivalFightMeasurement[],
): SurvivalCampaignMeasurement {
  const last = fights.at(-1);
  return {
    seed,
    mode,
    finalEncounterCompleted: last?.id === 'vane-warren:last-muster' && last.outcome === 'victory',
    stoppedAfter: last?.id ?? 'not-started',
    fights: [...fights],
    totalIncomingDamage: fights.reduce((total, fight) => total + fight.incomingDamage, 0),
    totalOutgoingDamage: fights.reduce((total, fight) => total + fight.outgoingDamage, 0),
    totalInCombatHealing: fights.reduce((total, fight) => total + fight.inCombatHealing, 0),
    totalShortRestHealing: fights.reduce((total, fight) => total + fight.shortRestHealingAfter, 0),
    totalPotionUses: fights.reduce((total, fight) => total + fight.potionUses, 0),
  };
}

export async function measureSurvivalFraction(
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string>,
  seeds: readonly number[],
  mode: SurvivalCampaignMode,
): Promise<SurvivalFractionMeasurement> {
  if (seeds.length === 0 || new Set(seeds).size !== seeds.length) {
    throw new RangeError('Survival measurement requires a nonempty list of distinct seeds.');
  }
  const campaigns: SurvivalCampaignMeasurement[] = [];
  for (const seed of seeds) campaigns.push(await runSurvivalCampaign(members, displayNames, seed, mode));
  const successes = campaigns.filter((campaign) => campaign.finalEncounterCompleted).length;
  return {
    seeds: [...seeds],
    successes,
    total: seeds.length,
    fraction: successes / seeds.length,
    campaigns,
  };
}
