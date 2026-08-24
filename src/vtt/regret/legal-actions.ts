import type { LegalActionSummary } from '../../combat/controllers';
import type { EncounterState } from '../../combat/encounter';
import type { EncounterCommand } from '../../combat/events';
import { adjacentCells, gridDistance } from '../../combat/grid';
import type { RollMode } from '../../combat/resolution';
import {
  monsterAttackCommand,
  monsterSavingThrowCommand,
} from '../../combat/monster-commands';
import type {
  MonsterAttackAction,
  MonsterSavingThrowAction,
  MonsterStatblock,
} from '../../combat/statblock';
import { BUNDLED_MONSTER_ROSTER } from '../../combat/statblocks/roster';
import {
  damageType,
  dieSides,
  type CombatantId,
} from '../../combat/values';
import type { PlanAction } from '../dm-bridge/contracts';

const STATBLOCKS: ReadonlyMap<string, MonsterStatblock> = new Map(
  BUNDLED_MONSTER_ROSTER.map((row) => [row.id, row.statblock] as const),
);

function subject(state: EncounterState, id: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new Error(`Regret rollout references unknown combatant ${id}.`);
  return found;
}

function position(state: EncounterState, id: CombatantId) {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new Error(`Regret rollout combatant ${id} has no token.`);
  return found.position;
}

function monsterStatblock(state: EncounterState, actor: CombatantId): MonsterStatblock | null {
  const profile = subject(state, actor).profile;
  if (profile.kind !== 'monster') return null;
  return STATBLOCKS.get(profile.statblockId) ?? null;
}

function deliveryRollMode(action: MonsterAttackAction, distance: number): RollMode | null {
  switch (action.delivery.kind) {
    case 'melee':
      return distance <= action.delivery.reachFeet ? 'normal' : null;
    case 'ranged': {
      const longRange = action.delivery.longRangeFeet.kind === 'present'
        ? action.delivery.longRangeFeet.value
        : action.delivery.rangeFeet;
      if (distance > longRange) return null;
      return distance > action.delivery.rangeFeet ? 'disadvantage' : 'normal';
    }
    case 'melee_or_ranged':
      if (distance <= action.delivery.reachFeet) return 'normal';
      if (distance > action.delivery.longRangeFeet) return null;
      return distance > action.delivery.rangeFeet ? 'disadvantage' : 'normal';
  }
}

function decodedMonsterAttacks(
  state: EncounterState,
  actor: CombatantId,
): readonly MonsterAttackAction[] {
  const actions = monsterStatblock(state, actor)?.sourceDetails.actions;
  return actions?.kind === 'present'
    ? actions.value.filter((action): action is MonsterAttackAction => action.kind === 'attack')
    : [];
}

function genericAttack(
  actor: CombatantId,
  target: CombatantId,
  opportunity: boolean,
): Extract<EncounterCommand, { readonly type: 'attack' | 'opportunity_attack' }> {
  return {
    type: opportunity ? 'opportunity_attack' : 'attack',
    actor,
    target,
    attackBonus: 7,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Slashing'),
        dice: { count: 1, sides: dieSides(8), modifier: 4 },
      }],
      critical: false,
      responses: [],
    },
  };
}

function attacksAgainst(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  options: { readonly opportunity: boolean; readonly meleeOnly: boolean },
): readonly Extract<EncounterCommand, { readonly type: 'attack' | 'opportunity_attack' }>[] {
  const distance = gridDistance(position(state, actor), position(state, target));
  const attacks = decodedMonsterAttacks(state, actor)
    .filter((action) => !options.meleeOnly || action.delivery.kind !== 'ranged')
    .flatMap((action) => {
      const rollMode = deliveryRollMode(action, distance);
      if (rollMode === null) return [];
      return [options.opportunity
        ? monsterAttackCommand(action, actor, target, rollMode, true)
        : monsterAttackCommand(action, actor, target, rollMode)];
    });
  if (attacks.length > 0) return attacks;
  return distance <= subject(state, actor).profile.rules.reach
    ? [genericAttack(actor, target, options.opportunity)]
    : [];
}

function decodedSavingThrows(
  state: EncounterState,
  actor: CombatantId,
): readonly MonsterSavingThrowAction[] {
  const actions = monsterStatblock(state, actor)?.sourceDetails.actions;
  return actions?.kind === 'present'
    ? actions.value.filter((action): action is MonsterSavingThrowAction => action.kind === 'saving_throw')
    : [];
}

function monsterSaveCommand(
  actor: CombatantId,
  target: CombatantId,
  action: MonsterSavingThrowAction,
  cost: 'action' | 'none',
): Extract<EncounterCommand, { readonly type: 'force_save' }> {
  return monsterSavingThrowCommand(action, actor, target, cost);
}

function genericSaveCommand(
  actor: CombatantId,
  target: CombatantId,
  cost: 'action' | 'none',
): Extract<EncounterCommand, { readonly type: 'force_save' }> {
  return {
    type: 'force_save',
    actor,
    target,
    ability: 'dexterity',
    dc: 15,
    rollMode: 'normal',
    damage: {
      terms: [{
        type: damageType('Radiant'),
        dice: { count: 2, sides: dieSides(8), modifier: 0 },
      }],
      critical: false,
      responses: [],
    },
    onSuccess: 'none',
    cost,
  };
}

function forceSavesAgainst(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  cost: 'action' | 'none',
): readonly Extract<EncounterCommand, { readonly type: 'force_save' }>[] {
  const distance = gridDistance(position(state, actor), position(state, target));
  const monsterActions = decodedSavingThrows(state, actor)
    .filter((action) => distance <= action.target.rangeFeet)
    .map((action) => monsterSaveCommand(actor, target, action, cost));
  if (monsterActions.length > 0) return monsterActions;
  return subject(state, actor).profile.kind === 'player_character' && distance <= 60
    ? [genericSaveCommand(actor, target, cost)]
    : [];
}

function fixedRiderCommands(
  state: EncounterState,
  actor: CombatantId,
  action: PlanAction,
): readonly EncounterCommand[] {
  if (action.kind === 'force_save') {
    const target = action.target.kind === 'combatant'
      ? action.target.combatantId
      : nearestEnemy(state, actor)?.profile.id ?? null;
    return target === null ? [] : forceSavesAgainst(state, actor, target, 'none');
  }
  return [];
}

function nearestEnemy(state: EncounterState, actor: CombatantId) {
  const acting = subject(state, actor);
  return state.combatants
    .filter((candidate) => candidate.profile.kind !== acting.profile.kind && candidate.life !== 'dead')
    .sort((left, right) => {
      const distance = gridDistance(position(state, actor), position(state, left.profile.id))
        - gridDistance(position(state, actor), position(state, right.profile.id));
      return distance || left.profile.id.localeCompare(right.profile.id);
    })[0];
}

export function regretTurnLegalActions(
  state: EncounterState,
  actor: CombatantId,
  fixedRider: PlanAction | null = null,
): LegalActionSummary {
  const acting = subject(state, actor);
  const enemies = state.combatants.filter(
    (candidate) => candidate.profile.kind !== acting.profile.kind && candidate.life !== 'dead',
  );
  const occupied = new Set(state.tokens.map((token) => `${token.position.column},${token.position.row}`));
  const actions: EncounterCommand[] = [];
  if (acting.turn.movement.remaining >= 5) {
    for (const cell of adjacentCells(state.bounds, position(state, actor))) {
      if (
        !occupied.has(`${cell.column},${cell.row}`) &&
        !state.blockedCells.some((blocked) => blocked.column === cell.column && blocked.row === cell.row)
      ) {
        actions.push({ type: 'move', actor, path: [cell], cause: 'voluntary' });
      }
    }
  }
  if (acting.turn.action.kind !== 'spent') {
    for (const enemy of enemies) {
      actions.push(...attacksAgainst(state, actor, enemy.profile.id, {
        opportunity: false,
        meleeOnly: false,
      }));
    }
  }
  if (acting.turn.action.kind === 'available') {
    for (const enemy of enemies) {
      actions.push(...forceSavesAgainst(state, actor, enemy.profile.id, 'action'));
    }
    actions.push(
      { type: 'dash', actor },
      { type: 'disengage', actor },
      { type: 'dodge', actor },
    );
  }
  if (fixedRider !== null) actions.unshift(...fixedRiderCommands(state, actor, fixedRider));
  actions.push({ type: 'end_turn', actor });
  return { actions };
}

export function regretReactionLegalActions(
  state: EncounterState,
  reactor: CombatantId,
  mover: CombatantId,
): readonly Extract<EncounterCommand, { readonly type: 'opportunity_attack' }>[] {
  const reacting = subject(state, reactor);
  const moving = subject(state, mover);
  if (
    reacting.profile.kind === moving.profile.kind ||
    reacting.life !== 'living' ||
    !reacting.turn.reactionAvailable
  ) {
    return [];
  }
  return attacksAgainst(state, reactor, mover, { opportunity: true, meleeOnly: true })
    .filter((command): command is Extract<EncounterCommand, { readonly type: 'opportunity_attack' }> =>
      command.type === 'opportunity_attack');
}
