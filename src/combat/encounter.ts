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
  EffectPayload,
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
import { rollDice, type Rng } from './random';
import {
  resolveAttackRoll,
  resolveDamage,
  resolveSavingThrow,
  rollD20,
  type DamageRequest,
  type DamageResponse,
  type RollMode,
} from './resolution';
import { spellDefinition } from './spells/definitions';
import { validateSpellSlotCapacities } from './spells/resources';
import type { EffectData, ScaledDice, SpellCastCommand, SpellDefinition } from './spells/types';
import { affectedCells, creatureOccupiesAffectedCell, type AreaTemplate } from './templates';
import {
  armorClass,
  damageType,
  difficultyClass,
  dieSides,
  encounterEffectId,
  effectStackingIdentity,
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
  readonly temporaryHitPoints: number;
  readonly spellSlots: readonly SpellSlotState[];
}

export interface SpellSlotState {
  readonly level: number;
  readonly maximum: number;
  readonly remaining: number;
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
      temporaryHitPoints: 0,
      spellSlots: validateSpellSlotCapacities(profile.rules.spellSlots).map(
        (slot) => ({ ...slot, remaining: slot.maximum }),
      ),
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

function appliedConditions(effect: EncounterEffect): readonly AppliedCondition[] {
  switch (effect.payload.kind) {
    case 'ability_check_modifier':
    case 'armor_class_modifier':
    case 'attack_roll_modifier':
    case 'attack_roll_mode_modifier':
    case 'cannot_regain_hit_points':
    case 'creature_type_protection':
    case 'd20_test_modifier':
    case 'damage_reduction':
    case 'damage_rider':
    case 'magic_missile_immunity':
    case 'movement_modifier':
    case 'opportunity_attacks_disabled':
    case 'sanctuary':
    case 'saving_throw_modifier':
    case 'shield_defense':
    case 'communication_link':
    case 'conjured_hand':
    case 'illusion':
    case 'light_source':
    case 'minor_magic':
    case 'object_repair':
    case 'alarm_ward':
    case 'appearance_illusion':
    case 'base_armor_class':
    case 'bonus_action_dash':
    case 'commanded_action':
    case 'detection_sense':
    case 'environmental_water':
    case 'falling_protection':
    case 'floating_disk':
    case 'food_purification':
    case 'image_illusion':
    case 'illusory_script':
    case 'jump_movement':
    case 'language_comprehension':
    case 'magic_identification':
    case 'obscured_area':
    case 'summoned_familiar':
    case 'unseen_servant':
    case 'hit_point_maximum_modifier':
    case 'condition_choice':
    case 'form_alteration':
    case 'arcane_lock':
    case 'magic_aura':
    case 'augury':
    case 'attacks_against_target_roll_mode':
    case 'calm_emotions':
    case 'darkvision':
    case 'detect_thoughts':
    case 'granted_breath':
    case 'ability_check_advantage':
    case 'size_alteration':
    case 'trap_detection':
    case 'flaming_sphere':
    case 'corpse_preservation':
    case 'gust_of_wind_area':
    case 'levitation':
    case 'object_location':
    case 'magic_mouth':
    case 'object_unlock':
    case 'magic_weapon':
    case 'location_tracking':
    case 'mirror_images':
    case 'teleport':
    case 'poison_protection':
    case 'ray_enfeeblement':
    case 'rope_trick':
    case 'see_invisibility':
    case 'silence_area':
    case 'spider_climb':
    case 'spiritual_weapon':
    case 'warding_bond':
    case 'truth_zone':
    case 'ongoing_damage':
      return [];
    case 'web_area':
      return [{ name: 'Restrained' }];
    case 'condition_bundle':
      return effect.payload.conditions.map((condition) =>
        condition === 'Charmed' || condition === 'Frightened' || condition === 'Grappled'
          ? { name: condition, source: effect.source }
          : { name: condition });
    case 'sleep_sequence':
      return [{ name: effect.payload.initial }];
    case 'exhaustion':
      return [{ name: 'Exhaustion', level: effect.payload.level }];
    case 'condition':
      switch (effect.payload.condition) {
        case 'Charmed':
        case 'Frightened':
        case 'Grappled':
          return [{ name: effect.payload.condition, source: effect.source }];
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
          return [{ name: effect.payload.condition }];
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
    for (const condition of appliedConditions(effect)) {
      if (condition.name === 'Exhaustion') {
        exhaustionLevels += condition.level;
        continue;
      }
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
  const spellDelta = state.effects.reduce(
    (total, effect) =>
      effect.targets.includes(id) && effect.payload.kind === 'movement_modifier'
        ? total + effect.payload.speedDeltaFeet
        : total,
    0,
  );
  return Math.max(0, base + penalty + spellDelta);
}

function effectiveArmorClass(state: EncounterState, id: CombatantId): ReturnType<typeof armorClass> {
  const base = combatant(state, id).profile.rules.armorClass;
  const total = state.effects.reduce<number>((sum, effect) => {
    if (!effect.targets.includes(id)) return sum;
    if (effect.payload.kind === 'armor_class_modifier') return sum + effect.payload.amount;
    if (effect.payload.kind === 'shield_defense') return sum + effect.payload.armorClassBonus;
    return sum;
  }, base);
  return armorClass(total);
}

function effectDiceModifier(
  state: EncounterState,
  id: CombatantId,
  test: 'attack_roll' | 'saving_throw',
  rng: Rng,
): number {
  return state.effects.reduce((total, effect) => {
    if (!effect.targets.includes(id)) return total;
    const payload = effect.payload;
    if (payload.kind === 'd20_test_modifier' && payload.tests.includes(test)) {
      return total + payload.sign * rollDice(rng, {
        count: payload.count,
        sides: dieSides(payload.sides),
        modifier: 0,
      }).total;
    }
    if (
      (test === 'attack_roll' && payload.kind === 'attack_roll_modifier') ||
      (test === 'saving_throw' && payload.kind === 'saving_throw_modifier')
    ) {
      return total + payload.sign * rollDice(rng, {
        count: payload.count,
        sides: dieSides(payload.sides),
        modifier: 0,
      }).total;
    }
    return total;
  }, 0);
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
  for (const effect of state.effects) {
    if (
      effect.targets.includes(command.target) &&
      effect.payload.kind === 'attack_roll_mode_modifier' &&
      effect.payload.appliesTo === 'next_attack_against_target'
    ) {
      modes.push(effect.payload.mode);
    }
  }
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

function effectiveHitPointMaximum(state: EncounterState, target: CombatantId): number {
  const base = combatant(state, target).profile.rules.hitPointMaximum;
  return state.effects.reduce((maximum, candidate) =>
    candidate.targets.includes(target) && candidate.payload.kind === 'hit_point_maximum_modifier'
      ? maximum + candidate.payload.amount
      : maximum, base);
}

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
  const hitPointMaximum = effectiveHitPointMaximum(context.state, target);
  if (before.life === 'dead' || amount === 0) return;
  const absorbed = Math.min(before.temporaryHitPoints, amount);
  const hitPointDamage = amount - absorbed;
  const hitPointsAfter = Math.max(0, before.hitPoints - hitPointDamage);
  let life: LifeState = before.life;
  let deathSaves = before.deathSaves;
  let massiveDamage = false;
  if (before.hitPoints === 0) {
    massiveDamage =
      before.profile.rules.usesDeathSaves &&
      hitPointDamage >= hitPointMaximum;
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
    const remainder = hitPointDamage - before.hitPoints;
    massiveDamage =
      before.profile.rules.usesDeathSaves &&
      remainder >= hitPointMaximum;
    life = massiveDamage
      ? 'dead'
      : before.profile.rules.usesDeathSaves
        ? 'dying'
        : 'dead';
    deathSaves = life === 'dying' ? { successes: 0, failures: 0 } : null;
  }
  const after = {
    ...before,
    hitPoints: hitPointsAfter,
    temporaryHitPoints: before.temporaryHitPoints - absorbed,
    life,
    deathSaves,
  };
  context.state = replaceCombatant(context.state, after);
  emit(context, {
    type: 'damage_applied',
    source,
    target,
    amount: hitPointDamage,
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
            exhaustionPenalty(combatantConditions(context.state, target)) +
            effectDiceModifier(context.state, target, 'saving_throw', context.rng),
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
  reason: 'save_succeeded' | 'condition_immunity' | 'condition_removed',
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
      case 'ability_check_modifier':
      case 'armor_class_modifier':
      case 'attack_roll_modifier':
      case 'attack_roll_mode_modifier':
      case 'cannot_regain_hit_points':
      case 'creature_type_protection':
      case 'd20_test_modifier':
      case 'damage_reduction':
      case 'magic_missile_immunity':
      case 'movement_modifier':
      case 'opportunity_attacks_disabled':
      case 'sanctuary':
      case 'saving_throw_modifier':
      case 'shield_defense':
      case 'communication_link':
      case 'conjured_hand':
      case 'illusion':
      case 'light_source':
      case 'minor_magic':
      case 'object_repair':
      case 'alarm_ward':
      case 'appearance_illusion':
      case 'base_armor_class':
      case 'bonus_action_dash':
      case 'detection_sense':
      case 'environmental_water':
      case 'falling_protection':
      case 'floating_disk':
      case 'food_purification':
      case 'image_illusion':
      case 'illusory_script':
      case 'jump_movement':
      case 'language_comprehension':
      case 'magic_identification':
      case 'obscured_area':
      case 'sleep_sequence':
      case 'unseen_servant':
      case 'hit_point_maximum_modifier':
      case 'condition_choice':
      case 'form_alteration':
      case 'arcane_lock':
      case 'magic_aura':
      case 'augury':
      case 'attacks_against_target_roll_mode':
      case 'calm_emotions':
      case 'darkvision':
      case 'detect_thoughts':
      case 'granted_breath':
      case 'ability_check_advantage':
      case 'size_alteration':
      case 'trap_detection':
      case 'flaming_sphere':
      case 'corpse_preservation':
      case 'gust_of_wind_area':
      case 'levitation':
      case 'object_location':
      case 'magic_mouth':
      case 'object_unlock':
      case 'magic_weapon':
      case 'location_tracking':
      case 'mirror_images':
      case 'teleport':
      case 'poison_protection':
      case 'ray_enfeeblement':
      case 'rope_trick':
      case 'see_invisibility':
      case 'silence_area':
      case 'spider_climb':
      case 'spiritual_weapon':
      case 'warding_bond':
      case 'web_area':
      case 'truth_zone':
        return { ...application.payload };
      case 'commanded_action':
        return { ...application.payload, options: [...application.payload.options] };
      case 'condition_bundle':
        return { ...application.payload, conditions: [...application.payload.conditions] };
      case 'summoned_familiar':
        return { ...application.payload, forms: [...application.payload.forms] };
      case 'damage_rider':
        return {
          ...application.payload,
          damage: {
            ...application.payload.damage,
            terms: application.payload.damage.terms.map((term) => ({
              ...term,
              dice: { ...term.dice },
            })),
            responses: application.payload.damage.responses.map((response) => ({ ...response })),
          },
        };
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
    if (context.state.effects.some((effect) =>
      effect.targets.includes(command.actor) && effect.payload.kind === 'opportunity_attacks_disabled')) {
      throw new EncounterRuleError(`Combatant ${command.actor} cannot make Opportunity Attacks.`);
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
        exhaustionPenalty(combatantConditions(context.state, command.actor)) +
        effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng),
      targetArmorClass: effectiveArmorClass(context.state, command.target),
      rollMode: attackRollMode(context.state, command),
      criticalFloor: command.criticalFloor,
    },
    context.rng,
  );
  const consumedAdvantage = new Set(
    context.state.effects
      .filter((effect) =>
        effect.targets.includes(command.target) &&
        effect.payload.kind === 'attack_roll_mode_modifier' &&
        effect.payload.appliesTo === 'next_attack_against_target')
      .map((effect) => effect.id),
  );
  endEffects(context, consumedAdvantage, 'duration_expired');
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

function cantripUpgradeCount(casterLevel: number): number {
  if (!Number.isSafeInteger(casterLevel) || casterLevel < 1 || casterLevel > 20) {
    throw new EncounterRuleError('Caster level must be an integer from 1 through 20.');
  }
  if (casterLevel >= 17) return 3;
  if (casterLevel >= 11) return 2;
  if (casterLevel >= 5) return 1;
  return 0;
}

function scaledDiceExpression(
  definition: SpellDefinition,
  scaling: ScaledDice,
  command: SpellCastCommand,
): { readonly count: number; readonly sides: ReturnType<typeof dieSides>; readonly modifier: number } {
  const slotDelta = definition.level === 0
    ? 0
    : (command.slotLevel as number) - definition.level;
  const cantripDelta = scaling.cantripUpgrade
    ? cantripUpgradeCount(command.casterLevel)
    : 0;
  return {
    count: scaling.baseCount + scaling.perSlotCount * slotDelta + cantripDelta,
    sides: dieSides(scaling.sides),
    modifier: scaling.modifier + scaling.perSlotModifier * slotDelta,
  };
}

function spendSpellCastingCost(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
): void {
  const actor = command.actor;
  if (command.castAsRitual) {
    if (definition.ritual !== true) throw new EncounterRuleError(`${definition.name} cannot be cast as a ritual.`);
    if (context.state.activeCombatant !== null) throw new EncounterRuleError('A ritual cannot resolve as a turn action.');
    return;
  }
  switch (definition.castingTime) {
    case 'action':
      assertActiveActor(context, actor);
      spendAction(context, actor, `Cast ${definition.name}`);
      return;
    case 'bonus_action':
      assertActiveActor(context, actor);
      spendCost(context, actor, 'bonus_action', `Cast ${definition.name}`);
      return;
    case 'reaction': {
      const subject = combatant(context.state, actor);
      if (subject.life !== 'living' || isIncapacitated(combatantConditions(context.state, actor))) {
        throw new EncounterRuleError(`Combatant ${actor} cannot cast a Reaction spell.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${actor} has no Reaction available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, reactionAvailable: false },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'reaction', purpose: `Cast ${definition.name}` });
      return;
    }
    case 'minute':
    case 'ten_minutes':
    case 'hour':
      if (context.state.activeCombatant !== null) {
        throw new EncounterRuleError(`${definition.name} has a long casting time and cannot resolve as a turn action.`);
      }
      return;
  }
}

function spendSpellSlot(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
): void {
  if (command.castAsRitual) {
    if (command.slotLevel !== null) throw new EncounterRuleError('A ritual cast does not expend a spell slot.');
    return;
  }
  if (definition.level === 0) {
    if (command.slotLevel !== null) throw new EncounterRuleError('Cantrips do not expend spell slots.');
    return;
  }
  if (
    command.slotLevel === null ||
    !Number.isSafeInteger(command.slotLevel) ||
    command.slotLevel < definition.level ||
    command.slotLevel > 9
  ) {
    throw new EncounterRuleError(`${definition.name} requires a slot of level ${definition.level} or higher.`);
  }
  const subject = combatant(context.state, command.actor);
  const slot = subject.spellSlots.find((candidate) => candidate.level === command.slotLevel);
  if (slot === undefined || slot.remaining < 1) {
    throw new EncounterRuleError(`Combatant ${command.actor} has no level-${command.slotLevel} spell slot remaining.`);
  }
  const remaining = slot.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    spellSlots: subject.spellSlots.map((candidate) =>
      candidate.level === command.slotLevel ? { ...candidate, remaining } : candidate,
    ),
  });
  emit(context, {
    type: 'spell_slot_spent',
    combatant: command.actor,
    slotLevel: command.slotLevel,
    remaining,
  });
}

function placedAreaTargets(
  state: EncounterState,
  spellName: string,
  rangeFeet: number,
  shape: AreaTemplate['shape'],
  expectedSizeFeet: number,
  command: SpellCastCommand,
): readonly CombatantId[] {
  if (command.area === null) {
    throw new EncounterRuleError(`${spellName} requires an area placement.`);
  }
  if (command.area.shape !== shape) {
    throw new EncounterRuleError(`${spellName} requires a ${shape} template.`);
  }
  const submittedSize = command.area.shape === 'sphere'
    ? command.area.template.radius
    : command.area.shape === 'cone'
      ? command.area.template.length
      : command.area.shape === 'cube'
        ? command.area.template.size
        : command.area.shape === 'line'
          ? command.area.template.length
          : command.area.shape === 'cylinder'
            ? command.area.template.radius
            : command.area.template.radius;
  if (submittedSize !== expectedSizeFeet) {
    throw new EncounterRuleError(`${spellName} requires a ${expectedSizeFeet}-foot ${shape} template.`);
  }
  const actorCell = token(state, command.actor).position;
  const origin = command.area.template.origin;
  const minimumX = actorCell.column * 5;
  const maximumX = minimumX + 5;
  const minimumY = actorCell.row * 5;
  const maximumY = minimumY + 5;
  const horizontal = Math.max(minimumX - origin.x, 0, origin.x - maximumX);
  const vertical = Math.max(minimumY - origin.y, 0, origin.y - maximumY);
  if (Math.max(horizontal, vertical) > rangeFeet) {
    throw new EncounterRuleError(`${spellName} area origin is out of range.`);
  }
  const cells = affectedCells(
    { bounds: state.bounds, blockedCells: state.blockedCells },
    command.area,
  );
  return state.combatants.flatMap((subject): readonly CombatantId[] => {
    if (subject.life === 'dead') return [];
    const occupied = [token(state, subject.profile.id).position];
    return creatureOccupiesAffectedCell(occupied, cells) ? [subject.profile.id] : [];
  });
}

function areaTargets(
  state: EncounterState,
  definition: SpellDefinition,
  command: SpellCastCommand,
): readonly CombatantId[] {
  if (definition.targeting.kind !== 'area') {
    throw new EncounterRuleError(`${definition.name} does not use area targeting.`);
  }
  return placedAreaTargets(
    state,
    definition.name,
    definition.targeting.rangeFeet,
    definition.targeting.shape,
    definition.targeting.baseSizeFeet + definition.targeting.sizePerSlotFeet *
      ((command.slotLevel ?? definition.level) - definition.level),
    command,
  );
}

function validateTargetRange(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  rangeFeet: number,
): void {
  if (combatant(state, target).life === 'dead') {
    throw new EncounterRuleError('A dead combatant is not a legal spell target.');
  }
  if (gridDistance(token(state, actor).position, token(state, target).position) > rangeFeet) {
    throw new EncounterRuleError(`Spell target ${target} is out of range.`);
  }
}

function selectedSpellTargets(
  state: EncounterState,
  definition: SpellDefinition,
  command: SpellCastCommand,
): readonly CombatantId[] {
  const targeting = definition.targeting;
  switch (targeting.kind) {
    case 'self':
      if (command.targets.length !== 0) throw new EncounterRuleError('A Self spell does not select targets.');
      return [command.actor];
    case 'single':
      if (command.targets.length !== 1) throw new EncounterRuleError(`${definition.name} requires one target.`);
      validateTargetRange(state, command.actor, command.targets[0] as CombatantId, targeting.rangeFeet);
      return command.targets;
    case 'multiple': {
      const slotDelta = definition.level === 0 ? 0 : (command.slotLevel as number) - definition.level;
      const maximum = targeting.baseMaximum + targeting.additionalPerSlot * slotDelta;
      const operation = definition.operation;
      const requiresEveryDart = operation.kind === 'magic_missiles' || operation.kind === 'attack_rays';
      if (command.targets.length < 1 || command.targets.length > maximum) {
        throw new EncounterRuleError(`${definition.name} allows at most ${maximum} targets.`);
      }
      if (requiresEveryDart && command.targets.length !== maximum) {
        throw new EncounterRuleError(`${definition.name} requires one target allocation per projectile.`);
      }
      if (!requiresEveryDart) assertUnique(command.targets, 'Spell targets');
      for (const target of command.targets) validateTargetRange(state, command.actor, target, targeting.rangeFeet);
      return command.targets;
    }
    case 'area':
      if (command.targets.length !== 0) throw new EncounterRuleError('Area spell targets come from its exact template.');
      return areaTargets(state, definition, command);
    case 'utility':
      if (command.targets.length !== 0) throw new EncounterRuleError('This utility spell does not target a combatant.');
      return [command.actor];
  }
}

function cloneAreaTemplate(template: AreaTemplate): AreaTemplate {
  switch (template.shape) {
    case 'cone':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin }, direction: { ...template.template.direction } } };
    case 'cube':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin }, center: { ...template.template.center }, axis: { ...template.template.axis } } };
    case 'cylinder':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin } } };
    case 'emanation':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin } } };
    case 'sphere':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin } } };
    case 'line':
      return { ...template, template: { ...template.template, origin: { ...template.template.origin }, direction: { ...template.template.direction } } };
  }
}

function resolvedSpellEffectPayload(
  definition: SpellDefinition,
  command: SpellCastCommand,
  payload: EffectPayload,
): EffectPayload {
  const selectedArea = (): AreaTemplate => {
    if (command.area === null) throw new EncounterRuleError(`${definition.name} requires an area placement.`);
    return cloneAreaTemplate(command.area);
  };
  const slotDelta = definition.level === 0 || command.castAsRitual
    ? 0
    : (command.slotLevel as number) - definition.level;
  switch (payload.kind) {
    case 'damage_reduction':
      return payload.damageType === 'chosen_when_cast'
        ? { ...payload, damageType: command.selectedOption ?? 'Acid' }
        : payload;
    case 'ability_check_modifier':
      return payload.skill === 'chosen_when_cast'
        ? { ...payload, skill: command.selectedOption ?? 'Arcana' }
        : payload;
    case 'alarm_ward':
    case 'food_purification':
    case 'image_illusion':
      return payload.placement === 'selected_when_cast'
        ? { ...payload, placement: selectedArea() }
        : payload;
    case 'environmental_water':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        gallons: payload.gallons + payload.gallonsPerSlot * slotDelta,
        cubeFeet: payload.cubeFeet + payload.cubeFeetPerSlot * slotDelta,
      };
    case 'condition_choice': {
      const selected = command.selectedOption;
      if (selected !== 'Blinded' && selected !== 'Deafened') {
        throw new EncounterRuleError(`${definition.name} requires Blinded or Deafened selection.`);
      }
      if (!payload.conditions.includes(selected)) {
        throw new EncounterRuleError(`${definition.name} does not allow ${selected}.`);
      }
      return { kind: 'condition', condition: selected };
    }
    case 'gust_of_wind_area':
    case 'flaming_sphere':
    case 'silence_area':
    case 'web_area':
    case 'truth_zone':
      return payload.placement === 'selected_when_cast'
        ? { ...payload, placement: selectedArea() }
        : payload;
    case 'obscured_area':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        radiusFeet: payload.radiusFeet +
          (definition.targeting.kind === 'area' ? definition.targeting.sizePerSlotFeet * slotDelta : 0),
      };
    case 'condition':
    case 'condition_bundle':
    case 'exhaustion':
    case 'ongoing_damage':
    case 'armor_class_modifier':
    case 'hit_point_maximum_modifier':
    case 'attack_roll_modifier':
    case 'saving_throw_modifier':
    case 'd20_test_modifier':
    case 'movement_modifier':
    case 'damage_rider':
    case 'cannot_regain_hit_points':
    case 'opportunity_attacks_disabled':
    case 'light_source':
    case 'conjured_hand':
    case 'communication_link':
    case 'illusion':
    case 'commanded_action':
    case 'language_comprehension':
    case 'detection_sense':
    case 'appearance_illusion':
    case 'bonus_action_dash':
    case 'falling_protection':
    case 'summoned_familiar':
    case 'floating_disk':
    case 'magic_identification':
    case 'illusory_script':
    case 'jump_movement':
    case 'base_armor_class':
    case 'sleep_sequence':
    case 'unseen_servant':
    case 'form_alteration':
    case 'arcane_lock':
    case 'magic_aura':
    case 'augury':
    case 'attacks_against_target_roll_mode':
    case 'calm_emotions':
    case 'darkvision':
    case 'detect_thoughts':
    case 'granted_breath':
    case 'ability_check_advantage':
    case 'size_alteration':
    case 'trap_detection':
    case 'corpse_preservation':
    case 'levitation':
    case 'object_location':
    case 'magic_mouth':
    case 'object_unlock':
    case 'magic_weapon':
    case 'location_tracking':
    case 'mirror_images':
    case 'teleport':
    case 'poison_protection':
    case 'ray_enfeeblement':
    case 'rope_trick':
    case 'see_invisibility':
    case 'spider_climb':
    case 'spiritual_weapon':
    case 'warding_bond':
    case 'minor_magic':
    case 'object_repair':
    case 'attack_roll_mode_modifier':
    case 'creature_type_protection':
    case 'sanctuary':
    case 'magic_missile_immunity':
    case 'shield_defense':
      return payload;
  }
}

function effectApplication(
  definition: SpellDefinition,
  command: SpellCastCommand,
  data: EffectData,
  targets: readonly CombatantId[],
): EffectApplication {
  const actualTargets = data.target === 'self' ? [command.actor] : targets;
  const timingCombatant = data.expiresAt.startsWith('source_')
    ? command.actor
    : actualTargets[0] as CombatantId;
  const boundary: TurnBoundary = data.expiresAt.endsWith('_start') ? 'start' : 'end';
  const payload = resolvedSpellEffectPayload(definition, command, data.payload);
  return {
    targets: actualTargets,
    duration: data.durationRounds === null
      ? { kind: 'permanent' }
      : {
          kind: 'turn_boundaries',
          timing: { combatant: timingCombatant, boundary, source: definition.source },
          remaining: data.durationRounds,
        },
    concentration: data.concentration,
    stackingIdentity: effectStackingIdentity(`spell:${definition.id}`),
    stacking: 'replace_same_source',
    repeatedSave: data.repeatedSave === undefined
      ? null
      : {
          timing: { combatant: actualTargets[0] as CombatantId, boundary: 'end', source: definition.source },
          ability: data.repeatedSave.ability,
          dc: command.saveDc,
          rollMode: data.repeatedSave.rollMode,
          onSuccess: 'remove_target',
        },
    payload,
  };
}

function applySpellEffect(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  data: EffectData,
  targets: readonly CombatantId[],
): void {
  if (targets.length === 0 && data.target === 'targets') return;
  if (data.repeatedSave !== undefined && data.target === 'targets') {
    for (const target of targets) {
      applyEffect(context, command.actor, effectApplication(definition, command, data, [target]));
    }
    return;
  }
  applyEffect(context, command.actor, effectApplication(definition, command, data, targets));
}

function applyHealing(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  amount: number,
): void {
  const before = combatant(context.state, target);
  if (before.life === 'dead') throw new EncounterRuleError('A dead creature cannot regain Hit Points.');
  if (context.state.effects.some((candidate) =>
    candidate.targets.includes(target) && candidate.payload.kind === 'cannot_regain_hit_points')) return;
  const hitPoints = Math.min(effectiveHitPointMaximum(context.state, target), before.hitPoints + amount);
  context.state = replaceCombatant(context.state, {
    ...before,
    hitPoints,
    life: hitPoints > 0 ? 'living' : before.life,
    deathSaves: hitPoints > 0 ? null : before.deathSaves,
  });
  emit(context, {
    type: 'healing_applied', source, target, amount: hitPoints - before.hitPoints,
    hitPointsBefore: before.hitPoints, hitPointsAfter: hitPoints,
  });
}

function pushAway(
  state: EncounterState,
  source: CombatantId,
  target: CombatantId,
  feetToPush: number,
): EncounterState {
  const from = token(state, source).position;
  const subjectToken = token(state, target);
  const columnStep = Math.sign(subjectToken.position.column - from.column);
  const rowStep = Math.sign(subjectToken.position.row - from.row);
  if (columnStep === 0 && rowStep === 0) return state;
  let position = subjectToken.position;
  const occupied = new Set(state.tokens.filter((entry) => entry.combatantId !== target).map((entry) => cellKey(entry.position)));
  const blocked = new Set(state.blockedCells.map(cellKey));
  for (let distance = 0; distance < feetToPush; distance += 5) {
    const candidate = { column: position.column + columnStep, row: position.row + rowStep };
    if (!isCellInside(state.bounds, candidate) || blocked.has(cellKey(candidate)) || occupied.has(cellKey(candidate))) break;
    position = candidate;
  }
  return {
    ...state,
    tokens: state.tokens.map((entry) =>
      entry.combatantId === target ? { ...entry, position } : entry,
    ),
  };
}

function resolveSpellAttack(
  context: ReductionContext,
  definition: SpellDefinition,
  command: SpellCastCommand,
  target: CombatantId,
  damage: ScaledDice,
  spellDamageType: DamageType,
  rider: EffectData | null,
): ReturnType<typeof resolveAttackRoll> {
  const advantageEffects = context.state.effects.filter((effect) =>
    effect.targets.includes(target) &&
    effect.payload.kind === 'attack_roll_mode_modifier' &&
    effect.payload.appliesTo === 'next_attack_against_target');
  const attack = resolveAttackRoll({
    attackBonus: command.attackBonus + effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng),
    targetArmorClass: effectiveArmorClass(context.state, target),
    rollMode: combineRollModes(['normal', ...advantageEffects.map((effect) =>
      effect.payload.kind === 'attack_roll_mode_modifier' ? effect.payload.mode : 'normal')]),
    criticalFloor: 20,
  }, context.rng);
  endEffects(context, new Set(advantageEffects.map((effect) => effect.id)), 'duration_expired');
  let result: ReturnType<typeof resolveDamage> | null = null;
  if (attack.outcome !== 'miss') {
    const baseRequest: DamageRequest = {
      terms: [{ type: spellDamageType, dice: scaledDiceExpression(definition, damage, command) }],
      critical: attack.outcome === 'critical',
      responses: [],
    };
    const request: DamageRequest = {
      ...baseRequest,
      responses: targetDamageResponses(context.state, target, baseRequest),
    };
    result = resolveDamage(request, context.rng);
    applyDamage(context, command.actor, target, result.total, request.critical);
    concentrationCheck(context, target, result.total);
    if (rider !== null) applySpellEffect(context, definition, command, rider, [target]);
  }
  emit(context, { type: 'attack_resolved', actor: command.actor, target, attack, damage: result });
  return attack;
}

function selectedSpellDamageType(
  definition: SpellDefinition,
  command: SpellCastCommand,
  configured: DamageType | readonly DamageType[],
): DamageType {
  if (!Array.isArray(configured)) return configured as DamageType;
  if (command.selectedOption === null) {
    throw new EncounterRuleError(`${definition.name} requires a damage type selection.`);
  }
  const selected = damageType(command.selectedOption);
  if (!configured.includes(selected)) {
    throw new EncounterRuleError(`${definition.name} does not allow ${command.selectedOption} damage.`);
  }
  return selected;
}

function removeSpellConditions(
  context: ReductionContext,
  target: CombatantId,
  conditions: readonly string[],
): void {
  const matching = context.state.effects.filter((candidate) =>
    candidate.targets.includes(target) &&
    candidate.payload.kind === 'condition' &&
    conditions.includes(candidate.payload.condition));
  for (const effect of matching) removeEffectTarget(context, effect.id, target, 'condition_removed');
}

function processSpellCast(context: ReductionContext, command: SpellCastCommand): void {
  const definition = spellDefinition(command.spellId);
  if (definition === null) throw new EncounterRuleError(`Spell ${command.spellId} is not implemented.`);
  const targets = selectedSpellTargets(context.state, definition, command);
  spendSpellCastingCost(context, definition, command);
  spendSpellSlot(context, definition, command);
  emit(context, { type: 'spell_cast', caster: command.actor, spellId: definition.id, slotLevel: command.slotLevel, targets });

  const operation = definition.operation;
  switch (operation.kind) {
    case 'attack_damage':
      for (const target of targets) {
        resolveSpellAttack(
          context,
          definition,
          command,
          target,
          operation.dice,
          selectedSpellDamageType(definition, command, operation.damageType),
          operation.rider,
        );
      }
      return;
    case 'attack_then_save_damage': {
      const primary = targets[0] as CombatantId;
      const burstTargets = placedAreaTargets(
        context.state,
        definition.name,
        definition.targeting.kind === 'single' ? definition.targeting.rangeFeet : 0,
        operation.burstShape,
        operation.burstRadiusFeet,
        command,
      );
      if (!burstTargets.includes(primary)) {
        throw new EncounterRuleError(`${definition.name} burst must include its primary target.`);
      }
      resolveSpellAttack(
        context,
        definition,
        command,
        primary,
        operation.attackDice,
        operation.attackDamageType,
        null,
      );
      const rolled = resolveDamage({
        terms: [{ type: operation.saveDamageType, dice: scaledDiceExpression(definition, operation.saveDice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of burstTargets) {
        const save = resolveTargetSave(context, command.actor, target, operation.saveAbility, command.saveDc, 'normal', null);
        const amount = save.outcome === 'failure'
          ? rolled.total
          : operation.onSaveSuccess === 'half' ? Math.floor(rolled.total / 2) : 0;
        applyDamage(context, command.actor, target, amount);
        concentrationCheck(context, target, amount);
      }
      return;
    }
    case 'attack_damage_over_time': {
      const target = targets[0] as CombatantId;
      const attack = resolveSpellAttack(
        context,
        definition,
        command,
        target,
        operation.initialDice,
        operation.damageType,
        null,
      );
      if (attack.outcome === 'miss') {
        const rolled = rollDice(context.rng, scaledDiceExpression(definition, operation.initialDice, command));
        const amount = Math.floor(rolled.total / 2);
        applyDamage(context, command.actor, target, amount);
        concentrationCheck(context, target, amount);
        return;
      }
      applySpellEffect(context, definition, command, {
        payload: {
          kind: 'ongoing_damage',
          damage: {
            terms: [{ type: operation.damageType, dice: scaledDiceExpression(definition, operation.laterDice, command) }],
            critical: false,
            responses: [],
          },
          timing: { combatant: target, boundary: 'end', source: definition.source },
        },
        target: 'targets',
        concentration: false,
        durationRounds: 1,
        expiresAt: 'target_end',
      }, [target]);
      return;
    }
    case 'hit_point_maximum_increase': {
      const slotDelta = (command.slotLevel as number) - definition.level;
      const amount = operation.baseAmount + operation.additionalPerSlot * slotDelta;
      applySpellEffect(context, definition, command, {
        payload: { kind: 'hit_point_maximum_modifier', amount },
        target: 'targets', concentration: false, durationRounds: 4800, expiresAt: 'source_start',
      }, targets);
      for (const target of targets) {
        const subject = combatant(context.state, target);
        context.state = replaceCombatant(context.state, { ...subject, hitPoints: subject.hitPoints + amount });
      }
      return;
    }
    case 'save_damage': {
      const roll = resolveDamage({
        terms: [{ type: operation.damageType, dice: scaledDiceExpression(definition, operation.dice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        const rawAmount = save.outcome === 'failure'
          ? roll.total
          : operation.onSuccess === 'half' ? Math.floor(roll.total / 2) : 0;
        const baseRequest: DamageRequest = {
          terms: [{ type: operation.damageType, dice: { count: 0, sides: dieSides(operation.dice.sides), modifier: rawAmount } }],
          critical: false,
          responses: [],
        };
        const responseRequest: DamageRequest = {
          ...baseRequest,
          responses: targetDamageResponses(context.state, target, baseRequest),
        };
        const adjusted = resolveDamage(responseRequest, context.rng).total;
        applyDamage(context, command.actor, target, adjusted);
        concentrationCheck(context, target, adjusted);
        if (save.outcome === 'failure' && operation.riderOnFailure !== null) {
          applySpellEffect(context, definition, command, operation.riderOnFailure, [target]);
        }
        if (save.outcome === 'failure' && operation.pushFeetOnFailure > 0) {
          context.state = pushAway(context.state, command.actor, target, operation.pushFeetOnFailure);
        }
      }
      return;
    }
    case 'healing': {
      const rolled = rollDice(context.rng, scaledDiceExpression(definition, operation.dice, command));
      const amount = rolled.total + (operation.addSpellcastingModifier ? command.spellcastingModifier : 0);
      for (const target of targets) applyHealing(context, command.actor, target, Math.max(0, amount));
      return;
    }
    case 'temporary_hit_points': {
      const rolled = rollDice(context.rng, scaledDiceExpression(definition, operation.dice, command));
      const subject = combatant(context.state, command.actor);
      const after = Math.max(subject.temporaryHitPoints, rolled.total);
      context.state = replaceCombatant(context.state, { ...subject, temporaryHitPoints: after });
      emit(context, { type: 'temporary_hit_points_changed', combatant: command.actor, before: subject.temporaryHitPoints, after });
      return;
    }
    case 'effect':
      applySpellEffect(context, definition, command, operation.effect, targets);
      return;
    case 'save_effect': {
      const eligible = operation.excludeCaster
        ? targets.filter((target) => target !== command.actor)
        : targets;
      const failed = eligible.filter((target) =>
        resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, operation.rollMode, null).outcome === 'failure');
      applySpellEffect(context, definition, command, operation.effect, failed);
      return;
    }
    case 'save_push': {
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        if (save.outcome === 'failure') {
          context.state = pushAway(context.state, command.actor, target, operation.pushFeetOnFailure);
        }
      }
      applySpellEffect(context, definition, command, operation.effect, targets);
      return;
    }
    case 'remove_condition': {
      const selected = command.selectedOption;
      if (selected === null || !operation.conditions.includes(selected as 'Blinded' | 'Deafened' | 'Paralyzed' | 'Poisoned')) {
        throw new EncounterRuleError(`${definition.name} requires a removable condition selection.`);
      }
      for (const target of targets) removeSpellConditions(context, target, [selected]);
      return;
    }
    case 'remove_condition_and_effect':
      for (const target of targets) removeSpellConditions(context, target, [operation.condition]);
      applySpellEffect(context, definition, command, operation.effect, targets);
      return;
    case 'save_branch_effect':
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        applySpellEffect(
          context,
          definition,
          command,
          save.outcome === 'success' ? operation.successEffect : operation.failureEffect,
          [target],
        );
      }
      return;
    case 'attack_rays':
      for (const target of targets) {
        resolveSpellAttack(context, definition, command, target, operation.dice, operation.damageType, null);
      }
      return;
    case 'summoned_weapon_attack': {
      const target = targets[0] as CombatantId;
      const diceWithModifier = {
        ...operation.dice,
        modifier: operation.dice.modifier + command.spellcastingModifier,
      };
      resolveSpellAttack(context, definition, command, target, diceWithModifier, operation.damageType, null);
      applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return;
    }
    case 'magic_missiles':
      for (const target of targets) {
        const immune = context.state.effects.some((candidate) =>
          candidate.targets.includes(target) &&
          (candidate.payload.kind === 'magic_missile_immunity' || candidate.payload.kind === 'shield_defense'));
        if (immune) continue;
        const baseRequest: DamageRequest = {
          terms: [{ type: operation.damageType, dice: scaledDiceExpression(definition, operation.dice, command) }],
          critical: false,
          responses: [],
        };
        const result = resolveDamage({
          ...baseRequest,
          responses: targetDamageResponses(context.state, target, baseRequest),
        }, context.rng);
        applyDamage(context, command.actor, target, result.total);
        concentrationCheck(context, target, result.total);
      }
      return;
    case 'stabilize': {
      const target = combatant(context.state, targets[0] as CombatantId);
      if (target.hitPoints !== 0 || target.life === 'dead') throw new EncounterRuleError('Spare the Dying requires a living creature at 0 Hit Points.');
      context.state = replaceCombatant(context.state, { ...target, life: 'stable', deathSaves: null });
      return;
    }
    case 'weapon_attack': {
      if (command.weaponAttack === null) throw new EncounterRuleError('True Strike requires a weapon attack profile.');
      const extra = scaledDiceExpression(definition, operation.extraDamage, command);
      const target = targets[0] as CombatantId;
      const attack = resolveAttackRoll({ attackBonus: command.attackBonus, targetArmorClass: effectiveArmorClass(context.state, target), rollMode: 'normal', criticalFloor: 20 }, context.rng);
      let result: ReturnType<typeof resolveDamage> | null = null;
      if (attack.outcome !== 'miss') {
        result = resolveDamage({
          terms: [
            { type: command.weaponAttack.damageType, dice: { count: command.weaponAttack.damageCount, sides: dieSides(command.weaponAttack.damageSides), modifier: command.weaponAttack.damageModifier } },
            { type: operation.extraDamageType, dice: extra },
          ],
          critical: attack.outcome === 'critical', responses: [],
        }, context.rng);
        applyDamage(context, command.actor, target, result.total, attack.outcome === 'critical');
      }
      emit(context, { type: 'attack_resolved', actor: command.actor, target, attack, damage: result });
      return;
    }
    case 'utility':
      emit(context, {
        type: 'spell_utility_resolved',
        caster: command.actor,
        spellId: definition.id,
        capability: operation.effect.kind,
        effect: resolvedSpellEffectPayload(definition, command, operation.effect),
      });
      if (operation.durationRounds !== null || operation.concentration || operation.stateful === true) {
        applySpellEffect(context, definition, command, {
          payload: operation.effect,
          target: 'self',
          concentration: operation.concentration,
          durationRounds: operation.durationRounds,
          expiresAt: 'source_start',
        }, [command.actor]);
      }
      return;
  }
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
    case 'cast_spell':
      processSpellCast(context, command);
      return;
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
      applyHealing(context, command.actor, command.target, command.amount);
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
