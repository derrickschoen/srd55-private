import type { Ability } from '../domain/enums';
import {
  conditionMechanicalState,
  conditionSpeedPenaltyFeet,
  exhaustionPenalty,
  isIncapacitated,
  type AppliedCondition,
  type ExhaustionLevel,
} from './conditions';
import type { CombatantProfile, CombatToken } from './combatant';
import type {
  EffectApplication,
  EncounterEffect,
  TurnBoundary,
} from './effects';
import type { EncounterCommand, EncounterEvent } from './events';
import {
  gridDistance,
  isCellInside,
  type GridBounds,
  type GridCell,
} from './grid';
import {
  planMovement,
  spendMovement,
  startTurnMovement,
  type MovementWorld,
  type TurnMovement,
} from './movement';
import type { Rng } from './random';
import {
  resolveAttackRoll,
  resolveDamage,
  resolveSavingThrow,
  rollD20,
  type DamageRequest,
  type DamageResponse,
  type RollMode,
} from './resolution';
import {
  difficultyClass,
  encounterEffectId,
  feet,
  type CombatantId,
  type DamageType,
  type EncounterEffectId,
} from './values';

export type LifeState = 'living' | 'dying' | 'stable' | 'dead';

export interface DeathSaveState {
  readonly successes: number;
  readonly failures: number;
}

export type ActionResource =
  | { readonly kind: 'available' }
  | { readonly kind: 'attack_sequence'; readonly attacksRemaining: number }
  | { readonly kind: 'spent' };

export interface TurnResources {
  readonly action: ActionResource;
  readonly bonusActionAvailable: boolean;
  readonly reactionAvailable: boolean;
  readonly movement: TurnMovement;
  readonly disengaging: boolean;
  readonly dodging: boolean;
}

export interface EncounterCombatantState {
  readonly profile: CombatantProfile;
  readonly hitPoints: number;
  readonly life: LifeState;
  readonly deathSaves: DeathSaveState | null;
  readonly turn: TurnResources;
}

export interface InitiativeEntry {
  readonly combatant: CombatantId;
  readonly total: number;
  readonly roll: number;
  readonly bonus: number;
}

export interface EncounterState {
  readonly revision: number;
  readonly nextEventSequence: number;
  readonly nextEffectSequence: number;
  readonly bounds: GridBounds;
  readonly blockedCells: readonly GridCell[];
  readonly foggedCells: readonly GridCell[];
  readonly dmNotes: readonly string[];
  readonly combatants: readonly EncounterCombatantState[];
  readonly tokens: readonly CombatToken[];
  readonly initiative: readonly InitiativeEntry[];
  readonly activeCombatant: CombatantId | null;
  readonly activeInitiativeIndex: number | null;
  readonly round: number;
  readonly effects: readonly EncounterEffect[];
  readonly eventLog: readonly EncounterEvent[];
}

export interface EncounterSetup {
  readonly bounds: GridBounds;
  readonly blockedCells?: readonly GridCell[];
  readonly foggedCells?: readonly GridCell[];
  readonly dmNotes?: readonly string[];
  readonly combatants: readonly CombatantProfile[];
  readonly tokens: readonly CombatToken[];
}

export interface EncounterReduction {
  readonly state: EncounterState;
  readonly events: readonly EncounterEvent[];
}

export class EncounterRuleError extends Error {
  override readonly name = 'EncounterRuleError' as const;

  constructor(readonly reason: string) {
    super(reason);
  }
}

const EMPTY_TURN: TurnResources = {
  action: { kind: 'spent' },
  bonusActionAvailable: false,
  reactionAvailable: false,
  movement: { speed: feet(0), spent: feet(0), remaining: feet(0) },
  disengaging: false,
  dodging: false,
};

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function assertUnique<T>(values: readonly T[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new EncounterRuleError(`${label} must be unique.`);
  }
}

/** Establishes the one-profile/one-token invariant before any event can run. */
export function createEncounter(setup: EncounterSetup): EncounterState {
  if (
    !Number.isSafeInteger(setup.bounds.columns) ||
    !Number.isSafeInteger(setup.bounds.rows) ||
    setup.bounds.columns < 1 ||
    setup.bounds.rows < 1
  ) {
    throw new EncounterRuleError('Encounter bounds must be positive safe integers.');
  }
  if (setup.combatants.length === 0) {
    throw new EncounterRuleError('An encounter requires at least one combatant.');
  }

  assertUnique(setup.combatants.map((profile) => profile.id), 'Combatant ids');
  assertUnique(setup.combatants.map((profile) => profile.tokenId), 'Profile token ids');
  assertUnique(setup.tokens.map((token) => token.id), 'Token ids');
  assertUnique(setup.tokens.map((token) => token.combatantId), 'Token combatant ids');
  assertUnique(setup.tokens.map((token) => cellKey(token.position)), 'Token positions');

  const profileIds = new Set(setup.combatants.map((profile) => profile.id));
  const profileTokenIds = new Set(setup.combatants.map((profile) => profile.tokenId));
  const tokenCombatantIds = new Set(setup.tokens.map((token) => token.combatantId));
  const tokenIds = new Set(setup.tokens.map((token) => token.id));
  if (
    setup.combatants.length !== setup.tokens.length ||
    [...profileIds].some((id) => !tokenCombatantIds.has(id)) ||
    [...profileTokenIds].some((id) => !tokenIds.has(id))
  ) {
    throw new EncounterRuleError(
      'Every combatant must have exactly one matching board token.',
    );
  }
  for (const token of setup.tokens) {
    const profile = setup.combatants.find((candidate) => candidate.id === token.combatantId);
    if (profile?.tokenId !== token.id) {
      throw new EncounterRuleError('A token must match its profile token identity.');
    }
    if (!isCellInside(setup.bounds, token.position)) {
      throw new EncounterRuleError(`Token ${token.id} is outside the encounter grid.`);
    }
  }

  const blockedCells = setup.blockedCells ?? [];
  assertUnique(blockedCells.map(cellKey), 'Blocked cells');
  for (const cell of blockedCells) {
    if (!isCellInside(setup.bounds, cell)) {
      throw new EncounterRuleError('Blocked cells must be inside the encounter grid.');
    }
    if (setup.tokens.some((token) => cellKey(token.position) === cellKey(cell))) {
      throw new EncounterRuleError('A token cannot start in a blocked cell.');
    }
  }
  const foggedCells = setup.foggedCells ?? [];
  assertUnique(foggedCells.map(cellKey), 'Fogged cells');
  for (const cell of foggedCells) {
    if (!isCellInside(setup.bounds, cell)) {
      throw new EncounterRuleError('Fogged cells must be inside the encounter grid.');
    }
  }
  for (const note of setup.dmNotes ?? []) {
    if (note.trim().length === 0) {
      throw new EncounterRuleError('DM notes must be non-empty.');
    }
  }

  return {
    revision: 0,
    nextEventSequence: 1,
    nextEffectSequence: 1,
    bounds: { ...setup.bounds },
    blockedCells: blockedCells.map((cell) => ({ ...cell })),
    foggedCells: foggedCells.map((cell) => ({ ...cell })),
    dmNotes: [...(setup.dmNotes ?? [])],
    combatants: setup.combatants.map((profile) => ({
      profile,
      hitPoints: profile.rules.hitPointMaximum,
      life: 'living',
      deathSaves: null,
      turn: EMPTY_TURN,
    })),
    tokens: setup.tokens.map((token) => ({ ...token, position: { ...token.position } })),
    initiative: [],
    activeCombatant: null,
    activeInitiativeIndex: null,
    round: 0,
    effects: [],
    eventLog: [],
  };
}

function combatant(state: EncounterState, id: CombatantId): EncounterCombatantState {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new EncounterRuleError(`Unknown combatant ${id}.`);
  return found;
}

function token(state: EncounterState, id: CombatantId): CombatToken {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new EncounterRuleError(`Combatant ${id} has no token.`);
  return found;
}

function replaceCombatant(
  state: EncounterState,
  replacement: EncounterCombatantState,
): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((candidate) =>
      candidate.profile.id === replacement.profile.id ? replacement : candidate,
    ),
  };
}

function appliedCondition(effect: EncounterEffect): AppliedCondition | null {
  switch (effect.payload.kind) {
    case 'ongoing_damage':
      return null;
    case 'exhaustion':
      return { name: 'Exhaustion', level: effect.payload.level };
    case 'condition':
      switch (effect.payload.condition) {
        case 'Charmed':
        case 'Frightened':
        case 'Grappled':
          return { name: effect.payload.condition, source: effect.source };
        case 'Blinded':
        case 'Deafened':
        case 'Incapacitated':
        case 'Invisible':
        case 'Paralyzed':
        case 'Petrified':
        case 'Poisoned':
        case 'Prone':
        case 'Restrained':
        case 'Stunned':
        case 'Unconscious':
          return { name: effect.payload.condition };
      }
  }
}

export function combatantConditions(
  state: EncounterState,
  id: CombatantId,
): readonly AppliedCondition[] {
  const subject = combatant(state, id);
  const conditions: AppliedCondition[] = [];
  const seenConditions = new Set<string>();
  let exhaustionLevels = 0;
  for (const effect of state.effects) {
    if (!effect.targets.includes(id)) continue;
    const condition = appliedCondition(effect);
    if (condition?.name === 'Exhaustion') {
      exhaustionLevels += condition.level;
    } else if (condition !== null) {
      const key =
        'source' in condition
          ? `${condition.name}:${condition.source}`
          : condition.name;
      if (!seenConditions.has(key)) {
        seenConditions.add(key);
        conditions.push(condition);
      }
    }
  }
  if (exhaustionLevels > 0) {
    conditions.push({
      name: 'Exhaustion',
      level: Math.min(6, exhaustionLevels) as ExhaustionLevel,
    });
  }
  if (
    subject.life === 'dying' &&
    !conditions.some((condition) => condition.name === 'Unconscious')
  ) {
    conditions.push({ name: 'Unconscious' });
  }
  return conditions;
}

function effectiveSpeed(state: EncounterState, id: CombatantId): number {
  const base = combatant(state, id).profile.rules.speed;
  const penalty = conditionSpeedPenaltyFeet(combatantConditions(state, id));
  if (penalty === Number.NEGATIVE_INFINITY) return 0;
  return Math.max(0, base + penalty);
}

function combineRollModes(modes: readonly RollMode[]): RollMode {
  const advantage = modes.includes('advantage');
  const disadvantage = modes.includes('disadvantage');
  if (advantage === disadvantage) return 'normal';
  return advantage ? 'advantage' : 'disadvantage';
}

function attackRollMode(
  state: EncounterState,
  command: Extract<
    EncounterCommand,
    { readonly type: 'attack' | 'opportunity_attack' }
  >,
): RollMode {
  const modes: RollMode[] = [command.rollMode];
  const actorClauses = conditionMechanicalState(
    combatantConditions(state, command.actor),
  ).clauses;
  const targetClauses = conditionMechanicalState(
    combatantConditions(state, command.target),
  ).clauses;

  for (const clause of actorClauses) {
    if (clause.kind !== 'roll_mode' || clause.roll !== 'attack_by') continue;
    if (
      clause.predicate === 'always' ||
      (clause.predicate === 'target_not_source' && clause.source !== command.target) ||
      (clause.predicate === 'source_visible' && clause.source === command.target) ||
      (clause.predicate === 'recipient_unseen' && !command.targetCanSeeAttacker)
    ) {
      modes.push(clause.mode);
    }
  }
  const distance = gridDistance(
    token(state, command.actor).position,
    token(state, command.target).position,
  );
  for (const clause of targetClauses) {
    if (clause.kind !== 'roll_mode' || clause.roll !== 'attack_against') continue;
    if (
      clause.predicate === 'always' ||
      (clause.predicate === 'recipient_unseen' && !command.attackerCanSeeTarget) ||
      (clause.predicate === 'attacker_within_5_feet' && distance <= 5) ||
      (clause.predicate === 'attacker_beyond_5_feet' && distance > 5)
    ) {
      modes.push(clause.mode);
    }
  }

  const targetState = combatant(state, command.target);
  if (
    targetState.turn.dodging &&
    command.targetCanSeeAttacker &&
    effectiveSpeed(state, command.target) > 0 &&
    !isIncapacitated(combatantConditions(state, command.target))
  ) {
    modes.push('disadvantage');
  }
  return combineRollModes(modes);
}

function cannotHarmTarget(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): boolean {
  return conditionMechanicalState(combatantConditions(state, actor)).clauses.some(
    (clause) => clause.kind === 'cannot_harm' && clause.target === target,
  );
}

function automaticSaveFailure(
  state: EncounterState,
  target: CombatantId,
  ability: Ability,
): boolean {
  return conditionMechanicalState(combatantConditions(state, target)).clauses.some(
    (clause) =>
      clause.kind === 'automatic_save_failure' && clause.abilities.includes(ability),
  );
}

function saveRollMode(
  state: EncounterState,
  target: CombatantId,
  ability: Ability,
  base: RollMode,
): RollMode {
  const modes: RollMode[] = [base];
  for (const clause of conditionMechanicalState(combatantConditions(state, target)).clauses) {
    if (
      clause.kind === 'roll_mode' &&
      clause.roll === 'dexterity_save' &&
      ability === 'dexterity' &&
      clause.predicate === 'always'
    ) {
      modes.push(clause.mode);
    }
  }
  return combineRollModes(modes);
}

function targetDamageResponses(
  state: EncounterState,
  target: CombatantId,
  request: DamageRequest,
): DamageRequest['responses'] {
  const subject = combatant(state, target);
  const responseByType = new Map<DamageType, DamageResponse>();
  for (const entry of subject.profile.rules.damageResponses) {
    responseByType.set(entry.type, entry.response);
  }
  const resistsAll = conditionMechanicalState(
    combatantConditions(state, target),
  ).clauses.some((clause) => clause.kind === 'all_damage_response');
  if (resistsAll) {
    for (const term of request.terms) {
      const current = responseByType.get(term.type) ?? 'normal';
      switch (current) {
        case 'immune':
        case 'resistant':
          break;
        case 'vulnerable':
          responseByType.set(term.type, 'normal');
          break;
        case 'normal':
          responseByType.set(term.type, 'resistant');
          break;
      }
    }
  }
  return [...responseByType].map(([type, response]) => ({ type, response }));
}

interface ReductionContext {
  state: EncounterState;
  readonly rng: Rng;
  readonly events: EncounterEvent[];
}

type UnsequencedEvent<T> = T extends EncounterEvent
  ? Omit<T, 'sequence'>
  : never;

function emit(
  context: ReductionContext,
  event: UnsequencedEvent<EncounterEvent>,
): void {
  const emitted = {
    ...event,
    sequence: context.state.nextEventSequence,
  } as EncounterEvent;
  context.events.push(emitted);
  context.state = {
    ...context.state,
    nextEventSequence: context.state.nextEventSequence + 1,
    eventLog: [...context.state.eventLog, emitted],
  };
}

function endEffects(
  context: ReductionContext,
  ids: ReadonlySet<EncounterEffectId>,
  reason: Extract<EncounterEvent, { readonly type: 'effect_ended' }>['reason'],
): void {
  if (ids.size === 0) return;
  for (const effect of context.state.effects) {
    if (ids.has(effect.id)) emit(context, { type: 'effect_ended', effectId: effect.id, reason });
  }
  context.state = {
    ...context.state,
    effects: context.state.effects.filter((effect) => !ids.has(effect.id)),
  };
}

function endConcentration(
  context: ReductionContext,
  owner: CombatantId,
  reason: 'concentration_replaced' | 'concentration_ended' | 'concentration_broken',
): void {
  endEffects(
    context,
    new Set(
      context.state.effects
        .filter((effect) => effect.concentrationOwner === owner)
        .map((effect) => effect.id),
    ),
    reason,
  );
}

// Bundled SRD 5.2.1, docs/srd/full/srd-5.2.1.txt:1084-1120.
const DEATH_SAVE_NATURAL_ONE = 1;
const DEATH_SAVE_NATURAL_TWENTY = 20;
const DEATH_SAVE_SUCCESS_FLOOR = 10;
const DEATH_SAVE_RESOLUTION_COUNT = 3;
const DEATH_SAVE_SINGLE_MARK = 1;
const NATURAL_ONE_FAILURES = 2;
const NATURAL_TWENTY_HIT_POINTS = 1;

function applyDamage(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  amount: number,
  critical = false,
): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new EncounterRuleError('Damage must be a non-negative safe integer.');
  }
  const before = combatant(context.state, target);
  if (before.life === 'dead' || amount === 0) return;
  const hitPointsAfter = Math.max(0, before.hitPoints - amount);
  let life: LifeState = before.life;
  let deathSaves = before.deathSaves;
  let massiveDamage = false;
  if (before.hitPoints === 0) {
    massiveDamage =
      before.profile.rules.usesDeathSaves &&
      amount >= before.profile.rules.hitPointMaximum;
    if (massiveDamage) {
      life = 'dead';
      deathSaves = null;
    } else if (before.profile.rules.usesDeathSaves) {
      const failures =
        (deathSaves?.failures ?? 0) +
        (critical ? NATURAL_ONE_FAILURES : DEATH_SAVE_SINGLE_MARK);
      if (failures >= DEATH_SAVE_RESOLUTION_COUNT) {
        life = 'dead';
        deathSaves = null;
      } else {
        life = 'dying';
        deathSaves = {
          successes: deathSaves?.successes ?? 0,
          failures,
        };
      }
    }
  } else if (hitPointsAfter === 0) {
    const remainder = amount - before.hitPoints;
    massiveDamage =
      before.profile.rules.usesDeathSaves &&
      remainder >= before.profile.rules.hitPointMaximum;
    life = massiveDamage
      ? 'dead'
      : before.profile.rules.usesDeathSaves
        ? 'dying'
        : 'dead';
    deathSaves = life === 'dying' ? { successes: 0, failures: 0 } : null;
  }
  const after = { ...before, hitPoints: hitPointsAfter, life, deathSaves };
  context.state = replaceCombatant(context.state, after);
  emit(context, {
    type: 'damage_applied',
    source,
    target,
    amount,
    hitPointsBefore: before.hitPoints,
    hitPointsAfter,
    lifeState: life,
    massiveDamage,
  });
  if (life !== 'living') endConcentration(context, target, 'concentration_broken');
}

function resolveDeathSave(context: ReductionContext, id: CombatantId): void {
  const before = combatant(context.state, id);
  if (
    before.life !== 'dying' ||
    before.hitPoints !== 0 ||
    !before.profile.rules.usesDeathSaves
  ) {
    return;
  }
  const roll = rollD20(context.rng, 'normal').chosen;
  const prior = before.deathSaves ?? { successes: 0, failures: 0 };
  let successes = prior.successes;
  let failures = prior.failures;
  let life: LifeState = 'dying';
  let hitPoints = 0;
  let outcome: Extract<
    EncounterEvent,
    { readonly type: 'death_save_resolved' }
  >['outcome'];

  if (roll === DEATH_SAVE_NATURAL_ONE) {
    failures += NATURAL_ONE_FAILURES;
    outcome = 'natural_1';
  } else if (roll === DEATH_SAVE_NATURAL_TWENTY) {
    hitPoints = NATURAL_TWENTY_HIT_POINTS;
    life = 'living';
    outcome = 'natural_20';
  } else if (roll >= DEATH_SAVE_SUCCESS_FLOOR) {
    successes += DEATH_SAVE_SINGLE_MARK;
    outcome = 'success';
  } else {
    failures += DEATH_SAVE_SINGLE_MARK;
    outcome = 'failure';
  }

  if (life === 'dying' && successes >= DEATH_SAVE_RESOLUTION_COUNT) {
    life = 'stable';
  }
  if (life === 'dying' && failures >= DEATH_SAVE_RESOLUTION_COUNT) {
    life = 'dead';
  }
  context.state = replaceCombatant(context.state, {
    ...before,
    hitPoints,
    life,
    deathSaves: life === 'dying' ? { successes, failures } : null,
  });
  emit(context, {
    type: 'death_save_resolved',
    visibility: 'dm_only',
    combatant: id,
    roll,
    outcome,
    successes,
    failures,
    lifeState: life,
  });
}

function resolveTargetSave(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  ability: Ability,
  dc: number,
  mode: RollMode,
  effectId: EncounterEffectId | null,
): ReturnType<typeof resolveSavingThrow> {
  const subject = combatant(context.state, target);
  const save = automaticSaveFailure(context.state, target, ability)
    ? {
        outcome: 'failure' as const,
        roll: { mode: 'normal' as const, faces: [], chosen: 0 },
        total: 0,
      }
    : resolveSavingThrow(
        {
          bonus:
            subject.profile.rules.savingThrowBonuses[ability] +
            exhaustionPenalty(combatantConditions(context.state, target)),
          dc: difficultyClass(dc),
          rollMode: saveRollMode(context.state, target, ability, mode),
        },
        context.rng,
      );
  emit(context, { type: 'save_resolved', source, target, ability, save, effectId });
  return save;
}

function concentrationCheck(
  context: ReductionContext,
  target: CombatantId,
  damage: number,
): void {
  if (damage === 0) return;
  if (!context.state.effects.some((effect) => effect.concentrationOwner === target)) return;
  const result = resolveTargetSave(
    context,
    target,
    target,
    'constitution',
    Math.min(30, Math.max(10, Math.floor(damage / 2))),
    'normal',
    null,
  );
  if (result.outcome === 'failure') endConcentration(context, target, 'concentration_broken');
}

function assertActiveActor(context: ReductionContext, actor: CombatantId): EncounterCombatantState {
  if (context.state.activeCombatant !== actor) {
    throw new EncounterRuleError(`Combatant ${actor} is not the active combatant.`);
  }
  const subject = combatant(context.state, actor);
  if (subject.life !== 'living') {
    throw new EncounterRuleError(`Combatant ${actor} cannot act while ${subject.life}.`);
  }
  return subject;
}

function assertCanUseActions(context: ReductionContext, actor: CombatantId): void {
  if (isIncapacitated(combatantConditions(context.state, actor))) {
    throw new EncounterRuleError(`Combatant ${actor} is Incapacitated.`);
  }
}

function spendAction(
  context: ReductionContext,
  actor: CombatantId,
  purpose: string,
): void {
  assertCanUseActions(context, actor);
  const subject = combatant(context.state, actor);
  if (subject.turn.action.kind !== 'available') {
    throw new EncounterRuleError(`Combatant ${actor} has no action available.`);
  }
  context.state = replaceCombatant(context.state, {
    ...subject,
    turn: { ...subject.turn, action: { kind: 'spent' } },
  });
  emit(context, { type: 'resource_spent', combatant: actor, resource: 'action', purpose });
}

function spendCost(
  context: ReductionContext,
  actor: CombatantId,
  cost: 'action' | 'bonus_action' | 'none',
  purpose: string,
): void {
  switch (cost) {
    case 'none':
      assertCanUseActions(context, actor);
      return;
    case 'action':
      spendAction(context, actor, purpose);
      return;
    case 'bonus_action': {
      assertCanUseActions(context, actor);
      const subject = combatant(context.state, actor);
      if (!subject.turn.bonusActionAvailable) {
        throw new EncounterRuleError(`Combatant ${actor} has no Bonus Action available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, bonusActionAvailable: false },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'bonus_action', purpose });
    }
  }
}

function beginAttack(context: ReductionContext, actor: CombatantId): void {
  assertCanUseActions(context, actor);
  const subject = combatant(context.state, actor);
  switch (subject.turn.action.kind) {
    case 'available': {
      const remaining = subject.profile.rules.attacksPerAction - 1;
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          action:
            remaining === 0
              ? { kind: 'spent' }
              : { kind: 'attack_sequence', attacksRemaining: remaining },
        },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'action', purpose: 'Attack' });
      return;
    }
    case 'attack_sequence': {
      const remaining = subject.turn.action.attacksRemaining - 1;
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          action:
            remaining === 0
              ? { kind: 'spent' }
              : { kind: 'attack_sequence', attacksRemaining: remaining },
        },
      });
      return;
    }
    case 'spent':
      throw new EncounterRuleError(`Combatant ${actor} has no attack available.`);
  }
}

function movementWorld(state: EncounterState): MovementWorld<CombatantId> {
  return {
    bounds: state.bounds,
    canTraverseStep: () => true,
    traversal: (actorId, _from, to) => {
      if (state.blockedCells.some((cell) => cellKey(cell) === cellKey(to))) {
        return { kind: 'blocked', reason: 'blocked cell' };
      }
      const occupied = state.tokens.some(
        (candidate) =>
          candidate.combatantId !== actorId &&
          combatant(state, candidate.combatantId).life !== 'dead' &&
          cellKey(candidate.position) === cellKey(to),
      );
      return { kind: 'enterable', cost: feet(5), canEnd: !occupied };
    },
  };
}

function processMove(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'move' }>,
): void {
  const subject = assertActiveActor(context, command.actor);
  assertCanUseActions(context, command.actor);
  const actorToken = token(context.state, command.actor);
  const reachSources = context.state.combatants
    .filter(
      (candidate) =>
        candidate.life === 'living' &&
        candidate.profile.kind !== subject.profile.kind &&
        candidate.profile.id !== command.actor,
    )
    .map((candidate) => ({
      reactorId: candidate.profile.id,
      cell: token(context.state, candidate.profile.id).position,
      reach: candidate.profile.rules.reach,
      reactionAvailable: candidate.turn.reactionAvailable,
      hostile: true,
    }));
  const cause =
    (command.cause === 'voluntary' && subject.turn.disengaging) ||
    command.cause === 'reactions_resolved'
      ? 'disengaged'
      : command.cause;
  const plan = planMovement(movementWorld(context.state), {
    actorId: command.actor,
    start: actorToken.position,
    path: command.path,
    budgetRemaining: subject.turn.movement.remaining,
    cause,
    reachSources,
  });
  if (plan.kind === 'illegal') {
    throw new EncounterRuleError(`Illegal movement: ${plan.reason} at step ${plan.stepIndex}.`);
  }
  if (plan.steps.some((step) => step.beforeLeaving.length > 0)) {
    throw new EncounterRuleError('Movement has an unresolved Opportunity Attack window.');
  }
  const destination = command.path.at(-1) ?? actorToken.position;
  context.state = {
    ...context.state,
    tokens: context.state.tokens.map((candidate) =>
      candidate.combatantId === command.actor
        ? { ...candidate, position: { ...destination } }
        : candidate,
    ),
  };
  const movement = spendMovement(subject.turn.movement, plan.totalCost);
  context.state = replaceCombatant(context.state, {
    ...combatant(context.state, command.actor),
    turn: { ...combatant(context.state, command.actor).turn, movement },
  });
  emit(context, {
    type: 'movement_completed',
    combatant: command.actor,
    path: command.path.map((cell) => ({ ...cell })),
    spent: plan.totalCost,
    remaining: movement.remaining,
  });
}

function effectBoundaryMatches(
  combatantId: CombatantId,
  boundary: TurnBoundary,
  timing: { readonly combatant: CombatantId; readonly boundary: TurnBoundary },
): boolean {
  return timing.combatant === combatantId && timing.boundary === boundary;
}

function removeEffectTarget(
  context: ReductionContext,
  effectId: EncounterEffectId,
  target: CombatantId,
  reason: 'save_succeeded' | 'condition_immunity',
): void {
  const effect = context.state.effects.find((candidate) => candidate.id === effectId);
  if (effect === undefined || !effect.targets.includes(target)) return;
  const targets = effect.targets.filter((candidate) => candidate !== target);
  emit(context, { type: 'effect_target_removed', effectId, target, reason });
  if (targets.length === 0) {
    endEffects(context, new Set([effectId]), 'no_targets');
  } else {
    context.state = {
      ...context.state,
      effects: context.state.effects.map((candidate) =>
        candidate.id === effectId ? { ...candidate, targets } : candidate,
      ),
    };
  }
}

function processBoundary(
  context: ReductionContext,
  subjectId: CombatantId,
  boundary: TurnBoundary,
): void {
  const effectIds = context.state.effects.map((effect) => effect.id);
  for (const effectId of effectIds) {
    const effect = context.state.effects.find((candidate) => candidate.id === effectId);
    if (effect === undefined) continue;

    if (
      effect.targets.includes(subjectId) &&
      effect.payload.kind === 'ongoing_damage' &&
      effectBoundaryMatches(subjectId, boundary, effect.payload.timing)
    ) {
      const result = resolveDamage(
        {
          ...effect.payload.damage,
          responses: targetDamageResponses(context.state, subjectId, effect.payload.damage),
        },
        context.rng,
      );
      applyDamage(context, effect.source, subjectId, result.total);
      concentrationCheck(context, subjectId, result.total);
    }

    const current = context.state.effects.find((candidate) => candidate.id === effectId);
    if (
      current !== undefined &&
      current.targets.includes(subjectId) &&
      current.repeatedSave !== null &&
      effectBoundaryMatches(subjectId, boundary, current.repeatedSave.timing) &&
      combatant(context.state, subjectId).life !== 'dead'
    ) {
      const save = resolveTargetSave(
        context,
        current.source,
        subjectId,
        current.repeatedSave.ability,
        current.repeatedSave.dc,
        current.repeatedSave.rollMode,
        current.id,
      );
      if (save.outcome === 'success') {
        removeEffectTarget(context, current.id, subjectId, 'save_succeeded');
      }
    }

    const afterSave = context.state.effects.find((candidate) => candidate.id === effectId);
    if (
      afterSave?.duration.kind === 'turn_boundaries' &&
      effectBoundaryMatches(subjectId, boundary, afterSave.duration.timing)
    ) {
      const remaining = afterSave.duration.remaining - 1;
      emit(context, { type: 'effect_clock_ticked', effectId, boundary, remaining });
      if (remaining === 0) {
        endEffects(context, new Set([effectId]), 'duration_expired');
      } else {
        context.state = {
          ...context.state,
          effects: context.state.effects.map((candidate) =>
            candidate.id === effectId && candidate.duration.kind === 'turn_boundaries'
              ? { ...candidate, duration: { ...candidate.duration, remaining } }
              : candidate,
          ),
        };
      }
    }
  }
}

function validateEffectApplication(
  state: EncounterState,
  effect: EffectApplication,
): void {
  if (effect.targets.length === 0) throw new EncounterRuleError('An effect requires a target.');
  assertUnique(effect.targets, 'Effect targets');
  for (const target of effect.targets) combatant(state, target);
  if (effect.duration.kind === 'turn_boundaries') {
    combatant(state, effect.duration.timing.combatant);
    if (!Number.isSafeInteger(effect.duration.remaining) || effect.duration.remaining < 1) {
      throw new EncounterRuleError('Effect duration remaining must be a positive safe integer.');
    }
    if (effect.duration.timing.source.trim().length === 0) {
      throw new EncounterRuleError('Effect duration timing requires a source locator.');
    }
  }
  if (effect.repeatedSave !== null) {
    combatant(state, effect.repeatedSave.timing.combatant);
    if (!effect.targets.includes(effect.repeatedSave.timing.combatant)) {
      throw new EncounterRuleError('Repeated-save timing must name an effect target.');
    }
    difficultyClass(effect.repeatedSave.dc);
    if (effect.repeatedSave.timing.source.trim().length === 0) {
      throw new EncounterRuleError('Repeated-save timing requires a source locator.');
    }
  }
  if (
    effect.payload.kind === 'ongoing_damage' &&
    (!effect.targets.includes(effect.payload.timing.combatant) ||
      effect.payload.timing.source.trim().length === 0)
  ) {
    throw new EncounterRuleError(
      'Ongoing-damage timing requires a target and source locator.',
    );
  }
}

function cloneEffectApplication(
  application: EffectApplication,
): EffectApplication {
  const duration =
    application.duration.kind === 'permanent'
      ? { kind: 'permanent' as const }
      : {
          kind: 'turn_boundaries' as const,
          timing: { ...application.duration.timing },
          remaining: application.duration.remaining,
        };
  const repeatedSave =
    application.repeatedSave === null
      ? null
      : {
          ...application.repeatedSave,
          timing: { ...application.repeatedSave.timing },
        };
  const payload = (() => {
    switch (application.payload.kind) {
      case 'condition':
      case 'exhaustion':
        return { ...application.payload };
      case 'ongoing_damage':
        return {
          ...application.payload,
          timing: { ...application.payload.timing },
          damage: {
            ...application.payload.damage,
            terms: application.payload.damage.terms.map((term) => ({
              ...term,
              dice: { ...term.dice },
            })),
            responses: application.payload.damage.responses.map((response) => ({
              ...response,
            })),
          },
        };
    }
  })();
  return {
    ...application,
    targets: [...application.targets],
    duration,
    repeatedSave,
    payload,
  };
}

function applyEffect(
  context: ReductionContext,
  source: CombatantId,
  application: EffectApplication,
): void {
  validateEffectApplication(context.state, application);
  const owned = cloneEffectApplication(application);
  if (owned.concentration) {
    endConcentration(context, source, 'concentration_replaced');
  }
  const stackingMatches = context.state.effects.filter(
    (effect) =>
      effect.stackingIdentity === owned.stackingIdentity &&
      owned.stacking !== 'coexist' &&
      (owned.stacking === 'replace_any_source' || effect.source === source),
  );
  endEffects(
    context,
    new Set(stackingMatches.map((effect) => effect.id)),
    'stacking_replaced',
  );

  const id = encounterEffectId(`effect:${context.state.nextEffectSequence}`);
  let targets = [...owned.targets];
  const effect: EncounterEffect = {
    id,
    source,
    targets,
    createdRevision: context.state.revision,
    duration: owned.duration,
    concentrationOwner: owned.concentration ? source : null,
    stackingIdentity: owned.stackingIdentity,
    stacking: owned.stacking,
    repeatedSave: owned.repeatedSave,
    payload: owned.payload,
  };
  context.state = {
    ...context.state,
    nextEffectSequence: context.state.nextEffectSequence + 1,
    effects: [...context.state.effects, effect],
  };

  if (owned.payload.kind === 'condition') {
    for (const target of [...targets]) {
      if (combatant(context.state, target).profile.rules.conditionImmunities.includes(owned.payload.condition)) {
        removeEffectTarget(context, id, target, 'condition_immunity');
        targets = targets.filter((candidate) => candidate !== target);
      }
    }
  }
  if (context.state.effects.some((candidate) => candidate.id === id)) {
    emit(context, { type: 'effect_applied', effectId: id, source, targets });
  }
  for (const target of targets) {
    const targetConditions = combatantConditions(context.state, target);
    if (
      conditionMechanicalState(targetConditions).clauses.some(
        (clause) => clause.kind === 'exhaustion' && clause.dies,
      )
    ) {
      const subject = combatant(context.state, target);
      context.state = replaceCombatant(context.state, {
        ...subject,
        hitPoints: 0,
        life: 'dead',
        deathSaves: null,
        turn: EMPTY_TURN,
      });
      endConcentration(context, target, 'concentration_broken');
      continue;
    }
    if (isIncapacitated(targetConditions)) {
      const subject = combatant(context.state, target);
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          action: { kind: 'spent' },
          bonusActionAvailable: false,
          reactionAvailable: false,
        },
      });
      endConcentration(context, target, 'concentration_broken');
    }
  }
}

function startTurn(context: ReductionContext, id: CombatantId, round: number): void {
  context.state = { ...context.state, activeCombatant: id, round };
  processBoundary(context, id, 'start');
  const beforeSave = combatant(context.state, id);
  const speed = feet(effectiveSpeed(context.state, id));
  const incapacitated =
    beforeSave.life !== 'living' ||
    isIncapacitated(combatantConditions(context.state, id));
  context.state = replaceCombatant(context.state, {
    ...beforeSave,
    turn: {
      action: incapacitated ? { kind: 'spent' } : { kind: 'available' },
      bonusActionAvailable: !incapacitated,
      reactionAvailable: !incapacitated,
      movement: startTurnMovement(speed),
      disengaging: false,
      dodging: false,
    },
  });
  emit(context, { type: 'turn_started', combatant: id, round });
  resolveDeathSave(context, id);
  const afterSave = combatant(context.state, id);
  if (afterSave.life === 'living' && beforeSave.life === 'dying') {
    context.state = replaceCombatant(context.state, {
      ...afterSave,
      turn: {
        action: { kind: 'available' },
        bonusActionAvailable: true,
        reactionAvailable: true,
        movement: startTurnMovement(feet(effectiveSpeed(context.state, id))),
        disengaging: false,
        dodging: false,
      },
    });
  }
}

function processAttack(
  context: ReductionContext,
  command: Extract<
    EncounterCommand,
    { readonly type: 'attack' | 'opportunity_attack' }
  >,
): void {
  if (command.type === 'attack') {
    assertActiveActor(context, command.actor);
    beginAttack(context, command.actor);
  } else {
    const reactor = combatant(context.state, command.actor);
    if (
      reactor.life !== 'living' ||
      isIncapacitated(combatantConditions(context.state, command.actor))
    ) {
      throw new EncounterRuleError(`Combatant ${command.actor} cannot react.`);
    }
    if (!reactor.turn.reactionAvailable) {
      throw new EncounterRuleError(`Combatant ${command.actor} has no Reaction available.`);
    }
    if (context.state.activeCombatant !== command.target) {
      throw new EncounterRuleError('An Opportunity Attack must target the active mover.');
    }
    if (
      gridDistance(
        token(context.state, command.actor).position,
        token(context.state, command.target).position,
      ) > reactor.profile.rules.reach
    ) {
      throw new EncounterRuleError('An Opportunity Attack reactor is out of reach.');
    }
    context.state = replaceCombatant(context.state, {
      ...reactor,
      turn: { ...reactor.turn, reactionAvailable: false },
    });
    emit(context, {
      type: 'resource_spent',
      combatant: command.actor,
      resource: 'reaction',
      purpose: 'Opportunity Attack',
    });
  }
  if (combatant(context.state, command.target).life === 'dead') {
    throw new EncounterRuleError('A dead combatant cannot be attacked.');
  }
  if (cannotHarmTarget(context.state, command.actor, command.target)) {
    throw new EncounterRuleError('The Charmed condition prohibits harming this target.');
  }
  const attack = resolveAttackRoll(
    {
      attackBonus:
        command.attackBonus +
        exhaustionPenalty(combatantConditions(context.state, command.actor)),
      targetArmorClass: combatant(context.state, command.target).profile.rules.armorClass,
      rollMode: attackRollMode(context.state, command),
      criticalFloor: command.criticalFloor,
    },
    context.rng,
  );
  let damageResult: ReturnType<typeof resolveDamage> | null = null;
  if (attack.outcome !== 'miss') {
    const criticalWithin = conditionMechanicalState(
      combatantConditions(context.state, command.target),
    ).clauses.some(
      (clause) =>
        clause.kind === 'critical_if_hit_within' &&
        gridDistance(
          token(context.state, command.actor).position,
          token(context.state, command.target).position,
        ) <= clause.feet,
    );
    const request = {
      ...command.damage,
      critical: attack.outcome === 'critical' || criticalWithin,
      responses: targetDamageResponses(context.state, command.target, command.damage),
    };
    damageResult = resolveDamage(request, context.rng);
    applyDamage(
      context,
      command.actor,
      command.target,
      damageResult.total,
      request.critical,
    );
    concentrationCheck(context, command.target, damageResult.total);
  }
  emit(context, {
    type: 'attack_resolved',
    actor: command.actor,
    target: command.target,
    attack,
    damage: damageResult,
  });
}

function nextLivingInitiativeIndex(state: EncounterState, current: number): number {
  for (let offset = 1; offset <= state.initiative.length; offset += 1) {
    const index = (current + offset) % state.initiative.length;
    const entry = state.initiative[index];
    if (entry !== undefined && combatant(state, entry.combatant).life !== 'dead') return index;
  }
  throw new EncounterRuleError('No living combatant remains in initiative.');
}

function processCommand(context: ReductionContext, command: EncounterCommand): void {
  switch (command.type) {
    case 'roll_initiative': {
      if (context.state.initiative.length > 0) {
        throw new EncounterRuleError('Initiative has already been rolled.');
      }
      const initiative = context.state.combatants.map((subject) => {
        const conditions = combatantConditions(context.state, subject.profile.id);
        const modes: RollMode[] = ['normal'];
        for (const clause of conditionMechanicalState(conditions).clauses) {
          if (clause.kind === 'roll_mode' && clause.roll === 'initiative') modes.push(clause.mode);
        }
        const roll = rollD20(context.rng, combineRollModes(modes));
        const bonus =
          subject.profile.rules.initiativeBonus + exhaustionPenalty(conditions);
        const entry = {
          combatant: subject.profile.id,
          total: roll.chosen + bonus,
          roll: roll.chosen,
          bonus,
        };
        emit(context, {
          type: 'initiative_rolled',
          combatant: subject.profile.id,
          faces: roll.faces,
          total: entry.total,
        });
        return entry;
      });
      initiative.sort(
        (left, right) =>
          right.total - left.total ||
          right.bonus - left.bonus ||
          left.combatant.localeCompare(right.combatant),
      );
      context.state = {
        ...context.state,
        initiative,
        activeInitiativeIndex: 0,
        combatants: context.state.combatants.map((subject) => ({
          ...subject,
          turn: {
            ...subject.turn,
            reactionAvailable:
              subject.life === 'living' &&
              !isIncapacitated(
                combatantConditions(context.state, subject.profile.id),
              ),
          },
        })),
      };
      emit(context, { type: 'initiative_ordered', order: initiative.map((entry) => entry.combatant) });
      const first = initiative[0];
      if (first === undefined) throw new EncounterRuleError('Initiative order is empty.');
      startTurn(context, first.combatant, 1);
      return;
    }
    case 'move':
      processMove(context, command);
      return;
    case 'attack':
    case 'opportunity_attack': {
      processAttack(context, command);
      return;
    }
    case 'decline_reaction': {
      const reactor = combatant(context.state, command.actor);
      if (reactor.life !== 'living' || !reactor.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${command.actor} cannot decline this Reaction.`);
      }
      if (context.state.activeCombatant !== command.mover) {
        throw new EncounterRuleError('A declined Reaction must name the active mover.');
      }
      emit(context, {
        type: 'reaction_declined',
        combatant: command.actor,
        mover: command.mover,
      });
      return;
    }
    case 'force_save': {
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Force saving throw');
      const save = resolveTargetSave(
        context,
        command.actor,
        command.target,
        command.ability,
        command.dc,
        command.rollMode,
        null,
      );
      const damage = resolveDamage(
        {
          ...command.damage,
          responses: targetDamageResponses(context.state, command.target, command.damage),
        },
        context.rng,
      );
      const amount =
        save.outcome === 'failure'
          ? damage.total
          : command.onSuccess === 'half'
            ? Math.floor(damage.total / 2)
            : 0;
      applyDamage(context, command.actor, command.target, amount);
      concentrationCheck(context, command.target, amount);
      return;
    }
    case 'dash': {
      assertActiveActor(context, command.actor);
      spendAction(context, command.actor, 'Dash');
      const subject = combatant(context.state, command.actor);
      const extra = effectiveSpeed(context.state, command.actor);
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          movement: {
            speed: feet(subject.turn.movement.speed + extra),
            spent: subject.turn.movement.spent,
            remaining: feet(subject.turn.movement.remaining + extra),
          },
        },
      });
      return;
    }
    case 'disengage':
    case 'dodge': {
      assertActiveActor(context, command.actor);
      spendAction(context, command.actor, command.type === 'dodge' ? 'Dodge' : 'Disengage');
      const subject = combatant(context.state, command.actor);
      const stance = command.type === 'dodge' ? 'dodging' : 'disengaging';
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, [stance]: true },
      });
      emit(context, {
        type: 'stance_started',
        combatant: command.actor,
        stance,
      });
      return;
    }
    case 'spend_bonus_action': {
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, 'bonus_action', command.purpose);
      return;
    }
    case 'spend_reaction': {
      const subject = combatant(context.state, command.actor);
      if (subject.life !== 'living' || isIncapacitated(combatantConditions(context.state, command.actor))) {
        throw new EncounterRuleError(`Combatant ${command.actor} cannot react.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${command.actor} has no Reaction available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, reactionAvailable: false },
      });
      emit(context, {
        type: 'resource_spent',
        combatant: command.actor,
        resource: 'reaction',
        purpose: command.purpose,
      });
      return;
    }
    case 'heal': {
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Heal');
      if (!Number.isSafeInteger(command.amount) || command.amount < 0) {
        throw new EncounterRuleError('Healing must be a non-negative safe integer.');
      }
      const before = combatant(context.state, command.target);
      if (before.life === 'dead') throw new EncounterRuleError('A dead creature cannot regain Hit Points.');
      const hitPoints = Math.min(
        before.profile.rules.hitPointMaximum,
        before.hitPoints + command.amount,
      );
      context.state = replaceCombatant(context.state, {
        ...before,
        hitPoints,
        life: hitPoints > 0 ? 'living' : before.life,
        deathSaves: hitPoints > 0 ? null : before.deathSaves,
      });
      emit(context, {
        type: 'healing_applied',
        source: command.actor,
        target: command.target,
        amount: hitPoints - before.hitPoints,
        hitPointsBefore: before.hitPoints,
        hitPointsAfter: hitPoints,
      });
      return;
    }
    case 'apply_effect':
      assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Apply effect');
      applyEffect(context, command.actor, command.effect);
      return;
    case 'end_concentration':
      assertActiveActor(context, command.actor);
      endConcentration(context, command.actor, 'concentration_ended');
      return;
    case 'end_turn': {
      if (context.state.activeCombatant !== command.actor) {
        throw new EncounterRuleError(`Combatant ${command.actor} is not the active combatant.`);
      }
      if (combatant(context.state, command.actor).life === 'dead') {
        throw new EncounterRuleError(`Combatant ${command.actor} cannot end a turn while dead.`);
      }
      const currentIndex = context.state.activeInitiativeIndex;
      if (currentIndex === null) throw new EncounterRuleError('Initiative is not active.');
      processBoundary(context, command.actor, 'end');
      emit(context, { type: 'turn_ended', combatant: command.actor, round: context.state.round });
      const nextIndex = nextLivingInitiativeIndex(context.state, currentIndex);
      const next = context.state.initiative[nextIndex];
      if (next === undefined) throw new EncounterRuleError('Next initiative entry is missing.');
      const round = nextIndex <= currentIndex ? context.state.round + 1 : context.state.round;
      context.state = { ...context.state, activeInitiativeIndex: nextIndex };
      startTurn(context, next.combatant, round);
      return;
    }
  }
}

/** Pure state transition apart from consuming the explicitly supplied RNG stream. */
export function reduceEncounter(
  state: EncounterState,
  command: EncounterCommand,
  rng: Rng,
): EncounterReduction {
  const context: ReductionContext = {
    state: { ...state, revision: state.revision + 1 },
    rng,
    events: [],
  };
  processCommand(context, command);
  return { state: context.state, events: context.events };
}
