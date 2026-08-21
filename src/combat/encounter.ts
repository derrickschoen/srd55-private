import type { Ability } from '../domain/enums';
import {
  importedSpellDefinition,
  type LoadedContentPack,
} from '../content/content-pack';
import {
  conditionMechanicalState,
  conditionSpeedPenaltyFeet,
  exhaustionPenalty,
  isIncapacitated,
  type AppliedCondition,
  type ExhaustionLevel,
} from './conditions';
import type { CombatantProfile, CombatToken } from './combatant';
import { isAttackFormSubstitutionPayload, isTypedCombatFeaturePayload } from './effects';
import type {
  CombatFeatureEffect,
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
  type DiceExpression,
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
  type LimitedResourcePoolId,
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
  readonly bonusAttacksRemaining?: number;
  readonly bonusAttackGrantEffectId?: EncounterEffectId | null;
  readonly usedDamageRiderEffectIds?: readonly EncounterEffectId[];
  readonly usedSpellDamageModifierEffectIds?: readonly EncounterEffectId[];
  readonly additionalLeveledSpellActionsRemaining?: 0 | 1;
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
  readonly limitedResources?: readonly LimitedResourceState[];
}

export interface SpellSlotState {
  readonly level: number;
  readonly maximum: number;
  readonly remaining: number;
}

export interface LimitedResourceState {
  readonly id: LimitedResourcePoolId;
  readonly maximum: number;
  readonly remaining: number;
  readonly recharge: 'short_rest' | 'long_rest';
}

export interface InitiativeEntry {
  readonly combatant: CombatantId;
  readonly total: number;
  readonly roll: number;
  readonly bonus: number;
  /** Combatants sharing this value occupy one contiguous initiative slot. */
  readonly slot: number;
}

export const INITIATIVE_MODES = [
  'per_combatant',
  'shared_enemy',
  'side_alternating',
] as const;

export type InitiativeMode = (typeof INITIATIVE_MODES)[number];

export interface EncounterConfig {
  readonly initiativeMode: InitiativeMode;
}

export const DEFAULT_ENCOUNTER_CONFIG: EncounterConfig = Object.freeze({
  initiativeMode: 'shared_enemy',
});

export function isInitiativeMode(value: unknown): value is InitiativeMode {
  return typeof value === 'string' && INITIATIVE_MODES.includes(value as InitiativeMode);
}

export function isEncounterConfig(value: unknown): value is EncounterConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    isInitiativeMode(Reflect.get(value, 'initiativeMode'))
  );
}

export interface EncounterState {
  readonly config: EncounterConfig;
  readonly revision: number;
  readonly nextEventSequence: number;
  readonly nextEffectSequence: number;
  readonly bounds: GridBounds;
  readonly blockedCells: readonly GridCell[];
  readonly foggedCells: readonly GridCell[];
  readonly dmNotes: readonly string[];
  readonly combatants: readonly EncounterCombatantState[];
  readonly tokens: readonly CombatToken[];
  /** Tokens owned by temporary board-absence effects, including their return cells. */
  readonly absentTokens?: readonly CombatToken[];
  readonly initiative: readonly InitiativeEntry[];
  readonly activeCombatant: CombatantId | null;
  readonly activeInitiativeIndex: number | null;
  readonly round: number;
  readonly effects: readonly EncounterEffect[];
  readonly eventLog: readonly EncounterEvent[];
  /** Exact imported records plus their reducer-ready projections. */
  readonly contentPacks?: readonly LoadedContentPack[];
}

export interface EncounterSetup {
  readonly config?: EncounterConfig;
  readonly bounds: GridBounds;
  readonly blockedCells?: readonly GridCell[];
  readonly foggedCells?: readonly GridCell[];
  readonly dmNotes?: readonly string[];
  readonly combatants: readonly CombatantProfile[];
  readonly tokens: readonly CombatToken[];
  readonly contentPacks?: readonly LoadedContentPack[];
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
  const config = setup.config ?? DEFAULT_ENCOUNTER_CONFIG;
  if (!isEncounterConfig(config)) {
    throw new EncounterRuleError('Encounter configuration has an invalid initiative mode.');
  }
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

  for (const profile of setup.combatants) {
    const limitedResources = profile.rules.limitedResources ?? [];
    assertUnique(limitedResources.map((pool) => pool.id), `Resource pool ids for ${profile.id}`);
    for (const pool of limitedResources) {
      if (!Number.isSafeInteger(pool.maximum) || pool.maximum < 1) {
        throw new EncounterRuleError(`Resource pool ${pool.id} maximum must be a positive safe integer.`);
      }
    }
    const resourceIds = new Set(limitedResources.map((pool) => pool.id));
    for (const effect of profile.rules.featureEffects ?? []) {
      if (effect.resourcePoolId !== null && !resourceIds.has(effect.resourcePoolId)) {
        throw new EncounterRuleError(`Effect ${effect.id} references unknown resource pool ${effect.resourcePoolId}.`);
      }
    }
  }

  const initialEffects: EncounterEffect[] = [];
  let nextEffectSequence = 1;
  for (const profile of setup.combatants) {
    for (const feature of profile.rules.featureEffects ?? []) {
      if (
        feature.trigger !== 'always_on' ||
        feature.payload.kind === 'temporary_hit_points' ||
        feature.payload.kind === 'reckless_attack_mode' ||
        isTypedCombatFeaturePayload(feature.payload) ||
        isAttackFormSubstitutionPayload(feature.payload)
      ) continue;
      initialEffects.push({
        id: encounterEffectId(`effect:${String(nextEffectSequence)}`),
        source: profile.id,
        targets: [profile.id],
        createdRevision: 0,
        duration: { kind: 'permanent' },
        concentrationOwner: null,
        stackingIdentity: effectStackingIdentity(`feature:${feature.id}`),
        stacking: 'coexist',
        repeatedSave: null,
        payload: feature.payload,
      });
      nextEffectSequence += 1;
    }
  }

  return {
    config: { ...config },
    revision: 0,
    nextEventSequence: 1,
    nextEffectSequence,
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
      temporaryHitPoints: Math.max(0, ...(profile.rules.featureEffects ?? [])
        .filter((effect) => effect.trigger === 'always_on' && effect.payload.kind === 'temporary_hit_points')
        .map((effect) => effect.payload.kind === 'temporary_hit_points' ? effect.payload.amount : 0)),
      spellSlots: validateSpellSlotCapacities(profile.rules.spellSlots).map(
        (slot) => ({ ...slot, remaining: slot.maximum }),
      ),
      ...(profile.rules.limitedResources === undefined
        ? {}
        : {
            limitedResources: profile.rules.limitedResources.map(
              (pool) => ({ ...pool, remaining: pool.maximum }),
            ),
          }),
    })),
    tokens: setup.tokens.map((token) => ({ ...token, position: { ...token.position } })),
    initiative: [],
    activeCombatant: null,
    activeInitiativeIndex: null,
    round: 0,
    effects: initialEffects,
    eventLog: [],
    ...(setup.contentPacks === undefined
      ? {}
      : { contentPacks: structuredClone(setup.contentPacks) }),
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

export function isCombatantOnBoard(state: EncounterState, id: CombatantId): boolean {
  return state.tokens.some((candidate) => candidate.combatantId === id);
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
    case 'skill_modifier':
    case 'armor_class_modifier':
    case 'attack_roll_modifier':
    case 'attack_roll_mode_modifier':
    case 'faerie_fire':
    case 'consumable_healing_pool':
    case 'cannot_regain_hit_points':
    case 'creature_type_protection':
    case 'd20_test_modifier':
    case 'damage_reduction':
    case 'damage_rider':
    case 'moonbeam_area':
    case 'bonus_action_attack_grant':
    case 'extra_attack_count_override':
    case 'action_surge':
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
    case 'temporary_banishment':
    case 'summoned_undead':
    case 'beacon_of_hope':
    case 'bestow_curse':
    case 'blink':
    case 'clairvoyance_sensor':
    case 'created_food_and_water':
    case 'daylight_area':
    case 'flight':
    case 'gaseous_form':
    case 'glyph_of_warding':
    case 'haste':
    case 'magic_circle':
    case 'major_image':
    case 'meld_into_stone':
    case 'nondetection':
    case 'phantom_steed':
    case 'energy_protection':
    case 'sending':
    case 'sleet_storm_area':
    case 'slow':
    case 'speak_with_dead':
    case 'spirit_guardians_area':
    case 'stinking_cloud_area':
    case 'tiny_hut':
    case 'universal_language':
    case 'vampiric_touch':
    case 'water_breathing':
    case 'water_walk':
    case 'arcane_eye':
    case 'aura_of_life':
    case 'black_tentacles_area':
    case 'confusion_area':
    case 'conjure_minor_elementals':
    case 'control_water':
    case 'death_ward':
    case 'dimension_door':
    case 'divination':
    case 'fabricate':
    case 'faithful_hound':
    case 'fire_shield':
    case 'freedom_of_movement':
    case 'guardian_of_faith':
    case 'hallucinatory_terrain':
    case 'ice_storm_terrain':
    case 'locate_creature':
    case 'phantasmal_killer':
    case 'polymorph':
    case 'private_sanctum':
    case 'resilient_sphere':
    case 'secret_chest':
    case 'stone_shape':
    case 'damage_resistances':
    case 'wall_of_fire':
      return [];
    case 'ensnaring_strike':
      return [{ name: effect.payload.condition }];
    case 'banishment':
      return [{ name: effect.payload.condition }];
    case 'charm_monster':
      return [{ name: effect.payload.condition, source: effect.source }];
    case 'hypnotic_pattern':
      return effect.payload.conditions.map((condition) =>
        condition === 'Charmed' ? { name: condition, source: effect.source } : { name: condition });
    case 'fear':
      return [{ name: 'Frightened', source: effect.source }];
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
      if (
        condition.name === 'Invisible' &&
        state.effects.some((candidate) =>
          candidate.targets.includes(id) &&
          candidate.payload.kind === 'faerie_fire' &&
          candidate.payload.preventsInvisibleConditionBenefit)
      ) continue;
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

/** Resolved skill modifier after encounter effects; no roll or RNG is hidden here. */
export function effectiveSkillModifier(
  state: EncounterState,
  id: CombatantId,
  skill: keyof NonNullable<CombatantProfile['rules']['skillBonuses']>,
): number {
  const base = combatant(state, id).profile.rules.skillBonuses?.[skill] ?? 0;
  return state.effects.reduce((total, effect) =>
    effect.targets.includes(id) &&
    effect.payload.kind === 'skill_modifier' &&
    effect.payload.skill === skill
      ? total + effect.payload.amount
      : total, base);
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
    if (effect.payload.kind === 'faerie_fire') {
      if (effect.targets.includes(command.target)) modes.push(effect.payload.attackModeAgainstTarget);
      continue;
    }
    if (effect.payload.kind !== 'attack_roll_mode_modifier') continue;
    const appliesTo = effect.payload.appliesTo;
    const applies =
      ((appliesTo.kind === 'next_attack_against_target' ||
        appliesTo.kind === 'attacks_against_target') &&
        effect.targets.includes(command.target)) ||
      (appliesTo.kind === 'next_attack_by_target' &&
        effect.targets.includes(command.actor)) ||
      (appliesTo.kind === 'attacks_by_target' &&
        effect.targets.includes(command.actor) &&
        command.type === 'attack' &&
        command.attackId !== undefined &&
        appliesTo.attackIds.includes(command.attackId));
    if (applies) modes.push(effect.payload.mode);
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

function activateRecklessAttack(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
  wasFirstAttack: boolean,
): void {
  if (command.recklessAttackEffectId === undefined) return;
  const declared = featureEffect(context.state, command.actor, command.recklessAttackEffectId);
  if (declared.payload.kind !== 'reckless_attack_mode') {
    throw new EncounterRuleError(`Effect ${declared.id} is not a Reckless Attack mode.`);
  }
  if (
    !wasFirstAttack ||
    command.attackId === undefined ||
    !declared.payload.strengthBasedMeleeAttackIds.includes(command.attackId)
  ) {
    throw new EncounterRuleError('Reckless Attack must be chosen for the first declared Strength-based melee attack on the turn.');
  }
  const ownRollsIdentity = effectStackingIdentity(`feature:${declared.id}:own-rolls`);
  applyEffect(context, command.actor, {
    targets: [command.actor],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: command.actor,
        boundary: 'end',
        source: 'docs/srd/full/srd-5.2.1.txt:1858-1863',
      },
      remaining: 1,
    },
    concentration: false,
    stackingIdentity: ownRollsIdentity,
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: {
      kind: 'attack_roll_mode_modifier',
      mode: 'advantage',
      appliesTo: {
        kind: 'attacks_by_target',
        attackIds: declared.payload.strengthBasedMeleeAttackIds,
      },
    },
  });
  applyEffect(context, command.actor, {
    targets: [command.actor],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: command.actor,
        boundary: 'start',
        source: 'docs/srd/full/srd-5.2.1.txt:1801,1858-1863',
      },
      remaining: 1,
    },
    concentration: false,
    stackingIdentity: effectStackingIdentity(`feature:${declared.id}:incoming-rolls`),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: {
      kind: 'attack_roll_mode_modifier',
      mode: 'advantage',
      appliesTo: { kind: 'attacks_against_target' },
    },
  });
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
    if (!ids.has(effect.id)) continue;
    if (effect.payload.kind === 'temporary_banishment') {
      restoreBanishedTargets(context, effect, reason === 'duration_expired');
    }
    emit(context, { type: 'effect_ended', effectId: effect.id, reason });
  }
  context.state = {
    ...context.state,
    effects: context.state.effects.filter((effect) => !ids.has(effect.id)),
  };
}

function nearestReturnPosition(state: EncounterState, origin: GridCell): GridCell {
  const candidates: GridCell[] = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const cell = { column, row };
      if (state.blockedCells.some((blocked) => cellKey(blocked) === cellKey(cell))) continue;
      if (state.tokens.some((occupied) => cellKey(occupied.position) === cellKey(cell))) continue;
      candidates.push(cell);
    }
  }
  const selected = candidates.sort((left, right) =>
    gridDistance(left, origin) - gridDistance(right, origin) ||
    left.row - right.row ||
    left.column - right.column)[0];
  if (selected === undefined) {
    throw new EncounterRuleError('A banished combatant has no unoccupied return space.');
  }
  return selected;
}

function restoreBanishedTargets(
  context: ReductionContext,
  effect: EncounterEffect,
  applyReturnDamage: boolean,
): void {
  if (effect.payload.kind !== 'temporary_banishment') return;
  for (const target of effect.targets) {
    const absentTokens = context.state.absentTokens ?? [];
    const stored = absentTokens.find((candidate) => candidate.combatantId === target);
    if (stored === undefined) continue;
    const position = nearestReturnPosition(context.state, stored.position);
    const returned = { ...stored, position };
    context.state = {
      ...context.state,
      tokens: [...context.state.tokens, returned],
      absentTokens: absentTokens.filter((candidate) => candidate.combatantId !== target),
    };
    emit(context, { type: 'combatant_returned_to_board', combatant: target, effectId: effect.id, position });
    if (!applyReturnDamage) continue;
    const request = effect.payload.returnDamage;
    const result = resolveDamage({
      ...request,
      responses: targetDamageResponses(context.state, target, request),
    }, context.rng);
    applyDamage(context, effect.source, target, result.total);
    concentrationCheck(context, target, result.total);
  }
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
  if (!isCombatantOnBoard(context.state, actor)) {
    throw new EncounterRuleError(`Combatant ${actor} is absent from the board.`);
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
  cost: 'action' | 'bonus_action' | 'reaction' | 'none',
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
      return;
    }
    case 'reaction': {
      const subject = combatant(context.state, actor);
      if (subject.life !== 'living' || isIncapacitated(combatantConditions(context.state, actor))) {
        throw new EncounterRuleError(`Combatant ${actor} cannot react.`);
      }
      if (!subject.turn.reactionAvailable) {
        throw new EncounterRuleError(`Combatant ${actor} has no Reaction available.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: { ...subject.turn, reactionAvailable: false },
      });
      emit(context, { type: 'resource_spent', combatant: actor, resource: 'reaction', purpose });
      return;
    }
  }
}

function spendLimitedResource(
  context: ReductionContext,
  actor: CombatantId,
  resourcePoolId: LimitedResourcePoolId,
  purpose: string,
): void {
  const subject = combatant(context.state, actor);
  const limitedResources = subject.limitedResources ?? [];
  const pool = limitedResources.find((candidate) => candidate.id === resourcePoolId);
  if (pool === undefined) {
    throw new EncounterRuleError(`Combatant ${actor} has no resource pool ${resourcePoolId}.`);
  }
  if (pool.remaining < 1) {
    throw new EncounterRuleError(`Resource pool ${resourcePoolId} is empty.`);
  }
  const remaining = pool.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    limitedResources: limitedResources.map((candidate) =>
      candidate.id === resourcePoolId ? { ...candidate, remaining } : candidate),
  });
  emit(context, {
    type: 'limited_resource_spent',
    combatant: actor,
    resourcePoolId,
    remaining,
    purpose,
  });
}

function featureEffect(
  state: EncounterState,
  actor: CombatantId,
  effectId: EncounterEffectId,
): CombatFeatureEffect {
  const effect = (combatant(state, actor).profile.rules.featureEffects ?? [])
    .find((candidate) => candidate.id === effectId);
  if (effect === undefined) {
    throw new EncounterRuleError(`Combatant ${actor} has no feature effect ${effectId}.`);
  }
  return effect;
}

function attacksPerAction(subject: EncounterCombatantState): number {
  const overrides = (subject.profile.rules.featureEffects ?? []).flatMap((effect) =>
    effect.payload.kind === 'extra_attack_count_override'
      ? [effect.payload.attackCount]
      : []);
  return overrides.length === 0
    ? subject.profile.rules.attacksPerAction
    : Math.max(...overrides);
}

function beginAttack(
  context: ReductionContext,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): void {
  const actor = command.actor;
  assertCanUseActions(context, actor);
  let subject = combatant(context.state, actor);
  if (command.bonusActionGrantEffectId !== undefined) {
    const grant = featureEffect(context.state, actor, command.bonusActionGrantEffectId);
    if (grant.payload.kind !== 'bonus_action_attack_grant') {
      throw new EncounterRuleError(`Effect ${grant.id} does not grant Bonus Action attacks.`);
    }
    if ((subject.turn.bonusAttacksRemaining ?? 0) > 0) {
      if (subject.turn.bonusAttackGrantEffectId !== grant.id) {
        throw new EncounterRuleError(`Combatant ${actor} is already resolving another Bonus Action attack grant.`);
      }
      context.state = replaceCombatant(context.state, {
        ...subject,
        turn: {
          ...subject.turn,
          bonusAttacksRemaining: (subject.turn.bonusAttacksRemaining ?? 0) - 1,
          bonusAttackGrantEffectId:
            subject.turn.bonusAttacksRemaining === 1 ? null : grant.id,
        },
      });
      return;
    }
    spendCost(context, actor, 'bonus_action', `Effect ${grant.id}`);
    if (grant.resourcePoolId !== null) {
      spendLimitedResource(context, actor, grant.resourcePoolId, `Effect ${grant.id}`);
    }
    subject = combatant(context.state, actor);
    context.state = replaceCombatant(context.state, {
      ...subject,
      turn: {
        ...subject.turn,
        bonusAttacksRemaining: grant.payload.attackCount - 1,
        bonusAttackGrantEffectId: grant.payload.attackCount === 1 ? null : grant.id,
      },
    });
    return;
  }
  switch (subject.turn.action.kind) {
    case 'available': {
      const remaining = attacksPerAction(subject) - 1;
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
      effect.payload.kind === 'moonbeam_area' &&
      effect.payload.placement !== 'selected_when_cast' &&
      combatant(context.state, subjectId).life !== 'dead' &&
      boundary === 'end' &&
      creatureOccupiesAffectedCell(
        [token(context.state, subjectId).position],
        affectedCells(
          { bounds: context.state.bounds, blockedCells: context.state.blockedCells },
          effect.payload.placement,
        ),
      )
    ) {
      if (effect.payload.saveDc === 'resolved_when_cast') {
        throw new EncounterRuleError('Moonbeam save DC must resolve when cast.');
      }
      const save = resolveTargetSave(
        context,
        effect.source,
        subjectId,
        effect.payload.saveAbility,
        effect.payload.saveDc,
        'normal',
        effect.id,
      );
      const rolled = resolveDamage({
        terms: [{
          type: damageType(effect.payload.damageType),
          dice: { count: effect.payload.damageCount, sides: dieSides(effect.payload.damageSides), modifier: 0 },
        }],
        critical: false,
        responses: [],
      }, context.rng);
      applySpellDamageAmount(
        context,
        effect.source,
        subjectId,
        damageType(effect.payload.damageType),
        effect.payload.damageSides,
        save.outcome === 'failure' ? rolled.total : Math.floor(rolled.total / 2),
      );
    }

    if (
      effect.targets.includes(subjectId) &&
      effect.payload.kind === 'ensnaring_strike' &&
      boundary === effect.payload.timing
    ) {
      const result = resolveDamage({
        ...effect.payload.damage,
        responses: targetDamageResponses(context.state, subjectId, effect.payload.damage),
      }, context.rng);
      applyDamage(context, effect.source, subjectId, result.total);
      concentrationCheck(context, subjectId, result.total);
    }

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
      case 'skill_modifier':
      case 'armor_class_modifier':
      case 'attack_roll_modifier':
      case 'attack_roll_mode_modifier':
      case 'faerie_fire':
      case 'consumable_healing_pool':
      case 'cannot_regain_hit_points':
      case 'creature_type_protection':
      case 'd20_test_modifier':
      case 'damage_reduction':
      case 'bonus_action_attack_grant':
      case 'extra_attack_count_override':
      case 'action_surge':
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
      case 'summoned_undead':
      case 'beacon_of_hope':
      case 'bestow_curse':
      case 'blink':
      case 'clairvoyance_sensor':
      case 'created_food_and_water':
      case 'daylight_area':
      case 'flight':
      case 'gaseous_form':
      case 'glyph_of_warding':
      case 'haste':
      case 'hypnotic_pattern':
      case 'fear':
      case 'magic_circle':
      case 'major_image':
      case 'meld_into_stone':
      case 'nondetection':
      case 'phantom_steed':
      case 'energy_protection':
      case 'sending':
      case 'sleet_storm_area':
      case 'slow':
      case 'speak_with_dead':
      case 'spirit_guardians_area':
      case 'stinking_cloud_area':
      case 'tiny_hut':
      case 'universal_language':
      case 'vampiric_touch':
      case 'water_breathing':
      case 'water_walk':
      case 'arcane_eye':
      case 'aura_of_life':
      case 'banishment':
      case 'black_tentacles_area':
      case 'charm_monster':
      case 'confusion_area':
      case 'conjure_minor_elementals':
      case 'control_water':
      case 'death_ward':
      case 'dimension_door':
      case 'divination':
      case 'fabricate':
      case 'faithful_hound':
      case 'fire_shield':
      case 'freedom_of_movement':
      case 'guardian_of_faith':
      case 'hallucinatory_terrain':
      case 'ice_storm_terrain':
      case 'locate_creature':
      case 'phantasmal_killer':
      case 'polymorph':
      case 'private_sanctum':
      case 'resilient_sphere':
      case 'secret_chest':
      case 'stone_shape':
      case 'damage_resistances':
      case 'wall_of_fire':
      case 'moonbeam_area':
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
          ...(application.payload.followUp === undefined
            ? {}
            : {
                followUp: {
                  ...application.payload.followUp,
                  damage: {
                    ...application.payload.followUp.damage,
                    terms: application.payload.followUp.damage.terms.map((term) => ({
                      ...term,
                      dice: { ...term.dice },
                    })),
                    responses: application.payload.followUp.damage.responses.map((response) => ({ ...response })),
                  },
                },
              }),
        };
      case 'ensnaring_strike':
        return {
          ...application.payload,
          damage: {
            ...application.payload.damage,
            terms: application.payload.damage.terms.map((term) => ({ ...term, dice: { ...term.dice } })),
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
      case 'temporary_banishment':
        return {
          ...application.payload,
          returnDamage: {
            ...application.payload.returnDamage,
            terms: application.payload.returnDamage.terms.map((term) => ({
              ...term,
              dice: { ...term.dice },
            })),
            responses: application.payload.returnDamage.responses.map((response) => ({ ...response })),
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
  if (owned.payload.kind === 'ensnaring_strike') {
    for (const target of [...targets]) {
      if (combatant(context.state, target).profile.rules.conditionImmunities.includes('Restrained')) {
        removeEffectTarget(context, id, target, 'condition_immunity');
        targets = targets.filter((candidate) => candidate !== target);
      }
    }
  }
  if (context.state.effects.some((candidate) => candidate.id === id)) {
    emit(context, { type: 'effect_applied', effectId: id, source, targets });
  }
  if (owned.payload.kind === 'temporary_banishment') {
    if (targets.length !== 1) {
      throw new EncounterRuleError('Temporary banishment requires exactly one target.');
    }
    const target = targets[0];
    if (target === undefined) throw new EncounterRuleError('Temporary banishment requires a target.');
    const removed = context.state.tokens.find((candidate) => candidate.combatantId === target);
    if (removed === undefined) throw new EncounterRuleError(`Combatant ${target} is already absent from the board.`);
    context.state = {
      ...context.state,
      tokens: context.state.tokens.filter((candidate) => candidate.combatantId !== target),
      absentTokens: [...(context.state.absentTokens ?? []), removed],
    };
    emit(context, { type: 'combatant_left_board', combatant: target, effectId: id });
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
    !isCombatantOnBoard(context.state, id) ||
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

function hasAdjacentAlly(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
): boolean {
  const acting = combatant(state, actor);
  return state.combatants.some((candidate) =>
    candidate.profile.id !== actor &&
    candidate.profile.kind === acting.profile.kind &&
    candidate.life === 'living' &&
    gridDistance(token(state, candidate.profile.id).position, token(state, target).position) <= 5);
}

function selectedSlotLevel(
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
  effectId: EncounterEffectId,
): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null {
  const selections = command.riderSelections ?? [];
  if (new Set(selections.map((selection) => selection.effectId)).size !== selections.length) {
    throw new EncounterRuleError('Attack rider selections must name unique effects.');
  }
  return selections.find((selection) => selection.effectId === effectId)?.slotLevel ?? null;
}

function spendRiderSpellSlot(
  context: ReductionContext,
  actor: CombatantId,
  slotLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
  effectId: EncounterEffectId,
): void {
  const subject = combatant(context.state, actor);
  const slot = subject.spellSlots.find((candidate) => candidate.level === slotLevel);
  if (slot === undefined || slot.remaining < 1) {
    throw new EncounterRuleError(`Combatant ${actor} has no level-${String(slotLevel)} spell slot remaining.`);
  }
  const remaining = slot.remaining - 1;
  context.state = replaceCombatant(context.state, {
    ...subject,
    spellSlots: subject.spellSlots.map((candidate) =>
      candidate.level === slotLevel ? { ...candidate, remaining } : candidate),
  });
  emit(context, { type: 'spell_slot_spent', combatant: actor, slotLevel, remaining });
  const refreshed = combatant(context.state, actor);
  context.state = replaceCombatant(context.state, {
    ...refreshed,
    turn: {
      ...refreshed.turn,
      usedDamageRiderEffectIds: [...(refreshed.turn.usedDamageRiderEffectIds ?? []), effectId],
    },
  });
}

function applyWeaponHitRiderFollowUp(
  context: ReductionContext,
  rider: EncounterEffect,
  target: CombatantId,
): void {
  if (rider.payload.kind !== 'damage_rider' || rider.payload.followUp === undefined) return;
  if (combatant(context.state, target).life === 'dead') return;
  const followUp = rider.payload.followUp;
  switch (followUp.kind) {
    case 'ongoing_damage_save_ends':
      applyEffect(context, rider.source, {
        targets: [target],
        duration: {
          kind: 'turn_boundaries',
          timing: { combatant: target, boundary: followUp.timing, source: String(rider.stackingIdentity) },
          remaining: followUp.durationRounds,
        },
        concentration: rider.concentrationOwner !== null,
        stackingIdentity: rider.stackingIdentity,
        stacking: 'replace_same_source',
        repeatedSave: {
          timing: { combatant: target, boundary: followUp.timing, source: String(rider.stackingIdentity) },
          ability: followUp.saveAbility,
          dc: followUp.saveDc,
          rollMode: 'normal',
          onSuccess: 'remove_target',
        },
        payload: {
          kind: 'ongoing_damage',
          damage: followUp.damage,
          timing: { combatant: target, boundary: followUp.timing, source: String(rider.stackingIdentity) },
        },
      });
      return;
    case 'save_then_restrain': {
      const save = resolveTargetSave(
        context,
        rider.source,
        target,
        followUp.saveAbility,
        followUp.saveDc,
        followUp.rollMode,
        rider.id,
      );
      if (save.outcome === 'success') return;
      applyEffect(context, rider.source, {
        targets: [target],
        duration: {
          kind: 'turn_boundaries',
          timing: { combatant: target, boundary: followUp.timing, source: String(rider.stackingIdentity) },
          remaining: followUp.durationRounds,
        },
        concentration: rider.concentrationOwner !== null,
        stackingIdentity: rider.stackingIdentity,
        stacking: 'replace_same_source',
        repeatedSave: null,
        payload: {
          kind: 'ensnaring_strike',
          condition: 'Restrained',
          damage: followUp.damage,
          timing: followUp.timing,
          escapeCheckAbility: 'strength',
          escapeCheckSkill: 'Athletics',
        },
      });
    }
  }
}

function attackDamageTypeSelection(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): Extract<CombatFeatureEffect['payload'], { readonly kind: 'attack_damage_type_choice' }> | null {
  if (command.damageTypeSelection === undefined) {
    const requiresSelection = command.attackId !== undefined &&
      (combatant(state, command.actor).profile.rules.featureEffects ?? []).some((effect) =>
        effect.payload.kind === 'attack_damage_type_choice' &&
        effect.payload.attackId === command.attackId);
    if (requiresSelection) {
      throw new EncounterRuleError('This attack requires a declared damage-type selection.');
    }
    return null;
  }
  const effect = featureEffect(state, command.actor, command.damageTypeSelection.effectId);
  if (
    effect.payload.kind !== 'attack_damage_type_choice' ||
    command.attackId !== effect.payload.attackId ||
    !effect.payload.options.includes(command.damageTypeSelection.damageType)
  ) {
    throw new EncounterRuleError('Attack damage-type selection is not declared for this attack.');
  }
  return effect.payload;
}

function selectedManeuver(
  state: EncounterState,
  command: Extract<EncounterCommand, { readonly type: 'attack' }>,
): CombatFeatureEffect | null {
  if (command.maneuverEffectId === undefined) return null;
  const effect = featureEffect(state, command.actor, command.maneuverEffectId);
  if (effect.payload.kind !== 'resource_die_maneuver' || effect.resourcePoolId === null) {
    throw new EncounterRuleError(`Effect ${effect.id} is not a resource-die maneuver.`);
  }
  return effect;
}

function markDamageFeatureUsed(
  context: ReductionContext,
  actor: CombatantId,
  effectId: EncounterEffectId,
): void {
  const current = combatant(context.state, actor);
  context.state = replaceCombatant(context.state, {
    ...current,
    turn: {
      ...current.turn,
      usedDamageRiderEffectIds: [...(current.turn.usedDamageRiderEffectIds ?? []), effectId],
    },
  });
}

function applyManeuverCondition(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  effect: CombatFeatureEffect,
): void {
  if (effect.payload.kind !== 'resource_die_maneuver') return;
  if (combatant(context.state, target).life === 'dead') return;
  applyEffect(context, source, {
    targets: [target],
    duration: {
      kind: 'turn_boundaries',
      timing: {
        combatant: target,
        boundary: 'end',
        source: 'party-pack:resource-die-maneuver',
      },
      remaining: 1,
    },
    concentration: false,
    stackingIdentity: effectStackingIdentity(`feature:${effect.id}:condition`),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: { kind: 'condition', condition: effect.payload.condition },
  });
}

function applySaveGatedBanishments(
  context: ReductionContext,
  actor: CombatantId,
  target: CombatantId,
): void {
  if (combatant(context.state, target).life === 'dead') return;
  const effects = combatant(context.state, actor).profile.rules.featureEffects ?? [];
  for (const effect of effects) {
    if (effect.trigger !== 'on_hit' || effect.payload.kind !== 'save_gated_banishment_on_hit') continue;
    const save = resolveTargetSave(
      context,
      actor,
      target,
      effect.payload.saveAbility,
      effect.payload.saveDc,
      effect.payload.rollMode,
      null,
    );
    if (save.outcome === 'success') continue;
    applyEffect(context, actor, {
      targets: [target],
      duration: {
        kind: 'turn_boundaries',
        timing: {
          combatant: actor,
          boundary: 'start',
          source: 'party-pack:save-gated-banishment-on-hit',
        },
        remaining: 1,
      },
      concentration: false,
      stackingIdentity: effectStackingIdentity(`feature:${effect.id}:banishment`),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: {
        kind: 'temporary_banishment',
        returnDamage: effect.payload.returnDamage,
        returnPlacement: effect.payload.returnPlacement,
      },
    });
    return;
  }
}

function processAttack(
  context: ReductionContext,
  command: Extract<
    EncounterCommand,
    { readonly type: 'attack' | 'opportunity_attack' }
  >,
): void {
  if (!isCombatantOnBoard(context.state, command.actor)) {
    throw new EncounterRuleError(`Combatant ${command.actor} is absent from the board.`);
  }
  if (!isCombatantOnBoard(context.state, command.target)) {
    throw new EncounterRuleError(`Combatant ${command.target} is absent from the board.`);
  }
  let wasFirstAttack = false;
  const typeChoice = command.type === 'attack'
    ? attackDamageTypeSelection(context.state, command)
    : null;
  const maneuver = command.type === 'attack'
    ? selectedManeuver(context.state, command)
    : null;
  if (command.type === 'attack') {
    assertActiveActor(context, command.actor);
    wasFirstAttack = combatant(context.state, command.actor).turn.action.kind === 'available';
    beginAttack(context, command);
    activateRecklessAttack(context, command, wasFirstAttack);
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
        effect.payload.kind === 'attack_roll_mode_modifier' &&
        ((effect.targets.includes(command.target) &&
          effect.payload.appliesTo.kind === 'next_attack_against_target') ||
          (effect.targets.includes(command.actor) &&
            effect.payload.appliesTo.kind === 'next_attack_by_target')))
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
    const attacking = combatant(context.state, command.actor);
    const baseTerms = command.damage.terms.map((term, index) =>
      typeChoice !== null && index === typeChoice.damageTermIndex && command.type === 'attack'
        ? { ...term, type: command.damageTypeSelection?.damageType ?? term.type }
        : term);
    const candidateRiders = [
      ...(attacking.profile.rules.featureEffects ?? []).flatMap((effect) =>
        effect.payload.kind === 'damage_rider'
          ? [{
              id: effect.id,
              trigger: effect.trigger,
              resourcePoolId: effect.resourcePoolId,
              payload: effect.payload,
              encounterEffect: null,
            }]
          : []),
      ...context.state.effects.flatMap((effect) =>
        effect.targets.includes(command.actor) && effect.payload.kind === 'damage_rider'
          ? [{
              id: effect.id,
              trigger: 'on_hit' as const,
              resourcePoolId: null,
              payload: effect.payload,
              encounterEffect: effect,
            }]
          : []),
    ];
    const triggeredRiders = candidateRiders.filter((effect) => {
      if (
        effect.payload.kind !== 'damage_rider' ||
        effect.payload.appliesTo !== 'weapon_attack_by_target' ||
        (effect.trigger !== 'on_hit' && !(effect.trigger === 'on_crit' && attack.outcome === 'critical'))
      ) return false;
      const gating = effect.payload.gating ?? { kind: 'unconditional' as const };
      switch (gating.kind) {
        case 'unconditional':
          return true;
        case 'once_per_turn':
          return !(attacking.turn.usedDamageRiderEffectIds ?? []).includes(effect.id) &&
            gating.qualifyingGates.some((gate) => {
              switch (gate) {
                case 'advantage_on_attack': return attack.roll.mode === 'advantage';
                case 'ally_adjacent_to_target':
                  return hasAdjacentAlly(context.state, command.actor, command.target);
              }
            });
        case 'first_hit_this_turn':
          return !(attacking.turn.usedDamageRiderEffectIds ?? []).includes(effect.id);
        case 'slot_spend':
          return command.type === 'attack' && selectedSlotLevel(command, effect.id) !== null;
      }
    });
    for (const rider of triggeredRiders) {
      const gating = rider.payload.gating ?? { kind: 'unconditional' as const };
      if (gating.kind === 'slot_spend') {
        if (command.type !== 'attack') {
          throw new EncounterRuleError('An Opportunity Attack cannot select a slot-spend rider.');
        }
        const slotLevel = selectedSlotLevel(command, rider.id);
        if (slotLevel === null) throw new EncounterRuleError(`Effect ${rider.id} requires a selected spell slot.`);
        spendRiderSpellSlot(context, command.actor, slotLevel, rider.id);
      } else if (gating.kind === 'once_per_turn' || gating.kind === 'first_hit_this_turn') {
        const current = combatant(context.state, command.actor);
        context.state = replaceCombatant(context.state, {
          ...current,
          turn: {
            ...current.turn,
            usedDamageRiderEffectIds: [...(current.turn.usedDamageRiderEffectIds ?? []), rider.id],
          },
        });
      }
      if (rider.resourcePoolId !== null) {
        spendLimitedResource(context, command.actor, rider.resourcePoolId, `Effect ${rider.id}`);
      }
    }
    if (maneuver !== null && maneuver.resourcePoolId !== null) {
      spendLimitedResource(context, command.actor, maneuver.resourcePoolId, `Effect ${maneuver.id}`);
    }
    const elementalFury = (attacking.profile.rules.featureEffects ?? []).find((effect) =>
      effect.trigger === 'always_on' &&
      effect.payload.kind === 'elemental_fury' &&
      command.type === 'attack' &&
      command.attackId !== undefined &&
      effect.payload.attackIds.includes(command.attackId) &&
      !(attacking.turn.usedDamageRiderEffectIds ?? []).includes(effect.id));
    if (elementalFury !== undefined) markDamageFeatureUsed(context, command.actor, elementalFury.id);
    const riderTerms = triggeredRiders.flatMap((effect) => {
      const payload = effect.payload;
      return payload.gating?.kind === 'slot_spend' && command.type === 'attack'
          ? payload.damage.terms.map((term) => ({
              ...term,
              dice: {
                ...term.dice,
                count: payload.gating?.kind === 'slot_spend'
                  ? payload.gating.baseCount +
                    payload.gating.countPerSlotLevel *
                    (selectedSlotLevel(command, effect.id) ?? 0)
                  : term.dice.count,
              },
            }))
          : payload.damage.terms;
    });
    const primaryDamageType = baseTerms[0]?.type;
    if (maneuver !== null && primaryDamageType === undefined) {
      throw new EncounterRuleError('A resource-die maneuver requires primary attack damage.');
    }
    const maneuverTerms = maneuver?.payload.kind === 'resource_die_maneuver' && primaryDamageType !== undefined
      ? [{
          type: primaryDamageType,
          dice: { count: 1, sides: maneuver.payload.dieSides, modifier: 0 },
        }]
      : [];
    const elementalTerms = elementalFury?.payload.kind === 'elemental_fury'
      ? [{
          type: elementalFury.payload.selectedDamageType,
          dice: { count: 0, sides: dieSides(6), modifier: elementalFury.payload.amount },
        }]
      : [];
    const terms = [...baseTerms, ...riderTerms, ...maneuverTerms, ...elementalTerms];
    const request = {
      ...command.damage,
      terms,
      critical: attack.outcome === 'critical' || criticalWithin,
      responses: targetDamageResponses(context.state, command.target, { ...command.damage, terms }),
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
    if (maneuver !== null) applyManeuverCondition(context, command.actor, command.target, maneuver);
    for (const rider of triggeredRiders) {
      if (rider.encounterEffect === null || rider.payload.consumeOnHit !== true) continue;
      endEffects(context, new Set([rider.encounterEffect.id]), 'trigger_consumed');
      applyWeaponHitRiderFollowUp(context, rider.encounterEffect, command.target);
    }
    applySaveGatedBanishments(context, command.actor, command.target);
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

function attackBeamCount(
  casterLevel: number,
  operation: Extract<SpellDefinition['operation'], { readonly kind: 'attack_beams' }>,
): number {
  cantripUpgradeCount(casterLevel);
  return operation.baseBeams + operation.additionalBeamLevels.filter(
    (minimumLevel) => casterLevel >= minimumLevel,
  ).length;
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

function scaledSpellDamageExpression(
  context: ReductionContext,
  definition: SpellDefinition,
  scaling: ScaledDice,
  command: SpellCastCommand,
): DiceExpression {
  let expression: DiceExpression = scaledDiceExpression(definition, scaling, command);
  const effects = combatant(context.state, command.actor).profile.rules.featureEffects ?? [];
  const exploding = effects.find((effect) =>
    effect.trigger === 'always_on' &&
    effect.payload.kind === 'exploding_spell_damage_die' &&
    effect.payload.spellId === definition.id);
  if (exploding?.payload.kind === 'exploding_spell_damage_die') {
    expression = {
      ...expression,
      explosion: {
        triggerFace: exploding.payload.triggerFace,
        maximumExplosionsPerDie: exploding.payload.maximumExplosionsPerDie,
      },
    };
  }
  const actor = combatant(context.state, command.actor);
  const modifier = effects.find((effect) =>
    effect.trigger === 'always_on' &&
    effect.payload.kind === 'spell_damage_ability_modifier' &&
    effect.payload.spellId === definition.id &&
    !(actor.turn.usedSpellDamageModifierEffectIds ?? []).includes(effect.id));
  if (modifier !== undefined) {
    expression = { ...expression, modifier: expression.modifier + command.spellcastingModifier };
    const current = combatant(context.state, command.actor);
    context.state = replaceCombatant(context.state, {
      ...current,
      turn: {
        ...current.turn,
        usedSpellDamageModifierEffectIds: [
          ...(current.turn.usedSpellDamageModifierEffectIds ?? []),
          modifier.id,
        ],
      },
    });
  }
  return expression;
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
      if (combatant(context.state, actor).turn.action.kind === 'available') {
        spendAction(context, actor, `Cast ${definition.name}`);
        return;
      }
      if (
        definition.level > 0 &&
        combatant(context.state, actor).turn.additionalLeveledSpellActionsRemaining === 1
      ) {
        const subject = combatant(context.state, actor);
        context.state = replaceCombatant(context.state, {
          ...subject,
          turn: { ...subject.turn, additionalLeveledSpellActionsRemaining: 0 },
        });
        emit(context, {
          type: 'resource_spent',
          combatant: actor,
          resource: 'additional_leveled_spell_action',
          purpose: `Cast ${definition.name}`,
        });
        return;
      }
      throw new EncounterRuleError(`Combatant ${actor} has no spell action available.`);
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
    if (command.resourcePoolId !== undefined) {
      throw new EncounterRuleError('A ritual cast cannot spend a limited resource pool.');
    }
    if (command.slotLevel !== null) throw new EncounterRuleError('A ritual cast does not expend a spell slot.');
    return;
  }
  if (definition.level === 0) {
    if (command.slotLevel !== null) throw new EncounterRuleError('Cantrips do not expend spell slots.');
    if (command.resourcePoolId !== undefined) {
      spendLimitedResource(context, command.actor, command.resourcePoolId, `Cast ${definition.name}`);
    }
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
  if (command.resourcePoolId !== undefined) {
    spendLimitedResource(context, command.actor, command.resourcePoolId, `Cast ${definition.name}`);
    return;
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
  expectedSecondarySizeFeet: number | null = null,
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
  if (expectedSecondarySizeFeet !== null) {
    const submittedSecondary = command.area.shape === 'line'
      ? command.area.template.width
      : command.area.shape === 'cylinder'
        ? command.area.template.height
        : null;
    if (submittedSecondary !== expectedSecondarySizeFeet) {
      throw new EncounterRuleError(`${spellName} requires a ${expectedSecondarySizeFeet}-foot secondary ${shape} dimension.`);
    }
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
  if (definition.targeting.kind !== 'area' && definition.targeting.kind !== 'area_selected') {
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
    definition.targeting.secondarySizeFeet ?? null,
  );
}

function validateTargetRange(
  state: EncounterState,
  actor: CombatantId,
  target: CombatantId,
  rangeFeet: number,
  allowDead = false,
): void {
  if (!isCombatantOnBoard(state, actor) || !isCombatantOnBoard(state, target)) {
    throw new EncounterRuleError('Spell caster and target must be present on the board.');
  }
  if (!allowDead && combatant(state, target).life === 'dead') {
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
      validateTargetRange(state, command.actor, command.targets[0] as CombatantId, targeting.rangeFeet, targeting.allowDead === true);
      return command.targets;
    case 'multiple': {
      const slotDelta = definition.level === 0 ? 0 : (command.slotLevel as number) - definition.level;
      const operation = definition.operation;
      const maximum = operation.kind === 'attack_beams'
        ? attackBeamCount(command.casterLevel, operation)
        : targeting.baseMaximum + targeting.additionalPerSlot * slotDelta;
      const requiresEveryDart = operation.kind === 'magic_missiles' ||
        operation.kind === 'attack_rays' ||
        operation.kind === 'attack_beams';
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
    case 'area_selected': {
      const inArea = areaTargets(state, definition, command);
      const slotDelta = (command.slotLevel as number) - definition.level;
      const maximum = targeting.baseMaximum + targeting.additionalPerSlot * slotDelta;
      if (command.targets.length < 1 || command.targets.length > maximum) {
        throw new EncounterRuleError(`${definition.name} allows at most ${maximum} selected area targets.`);
      }
      assertUnique(command.targets, 'Spell targets');
      if (command.targets.some((target) => !inArea.includes(target))) {
        throw new EncounterRuleError(`${definition.name} selected targets must occupy its exact template.`);
      }
      return command.targets;
    }
    case 'all_in_range':
      if (command.targets.length < 1) throw new EncounterRuleError(`${definition.name} requires at least one target.`);
      assertUnique(command.targets, 'Spell targets');
      for (const target of command.targets) validateTargetRange(state, command.actor, target, targeting.rangeFeet);
      return command.targets;
    case 'remote':
      if (command.targets.length !== 1) throw new EncounterRuleError(`${definition.name} requires one remote target.`);
      if (combatant(state, command.targets[0] as CombatantId).life === 'dead') throw new EncounterRuleError('A dead combatant is not a legal spell target.');
      if (!isCombatantOnBoard(state, command.targets[0] as CombatantId)) throw new EncounterRuleError('An absent combatant is not a legal spell target.');
      return command.targets;
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
    case 'skill_modifier':
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
    case 'daylight_area':
    case 'magic_circle':
    case 'major_image':
    case 'sleet_storm_area':
    case 'stinking_cloud_area':
    case 'tiny_hut':
    case 'black_tentacles_area':
    case 'confusion_area':
    case 'control_water':
    case 'hallucinatory_terrain':
    case 'ice_storm_terrain':
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
    case 'summoned_undead':
      return {
        ...payload,
        createdCreatures: payload.createdCreatures + payload.createdCreaturesPerSlot * slotDelta,
        reassertedCreatures: payload.reassertedCreatures + payload.reassertedCreaturesPerSlot * slotDelta,
      };
    case 'glyph_of_warding':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        explosiveDamageCount: payload.explosiveDamageCount + payload.explosiveDamagePerSlotCount * slotDelta,
        storedSpellMaximumLevel: payload.storedSpellMaximumLevel + slotDelta,
      };
    case 'spirit_guardians_area':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        damageCount: payload.damageCount + payload.damagePerSlotCount * slotDelta,
      };
    case 'conjure_minor_elementals':
      return { ...payload, damageCount: payload.damageCount + payload.damagePerSlotCount * slotDelta };
    case 'phantasmal_killer':
      return { ...payload, repeatDamageCount: payload.repeatDamageCount + payload.repeatDamagePerSlotCount * slotDelta };
    case 'private_sanctum':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        maximumCubeFeet: payload.maximumCubeFeet + payload.cubeFeetPerSlot * slotDelta,
      };
    case 'wall_of_fire':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        damageCount: payload.damageCount + payload.damagePerSlotCount * slotDelta,
      };
    case 'moonbeam_area':
      return {
        ...payload,
        placement: payload.placement === 'selected_when_cast' ? selectedArea() : payload.placement,
        saveDc: command.saveDc,
        damageCount: payload.damageCount + payload.damagePerSlotCount * slotDelta,
      };
    case 'energy_protection': {
      const selected = command.selectedOption;
      if (selected === null || !payload.damageTypes.includes(selected as 'Acid' | 'Cold' | 'Fire' | 'Lightning' | 'Thunder')) {
        throw new EncounterRuleError(`${definition.name} requires a listed energy damage type.`);
      }
      return { ...payload, selectedDamageType: selected };
    }
    case 'condition':
    case 'condition_bundle':
    case 'exhaustion':
    case 'ongoing_damage':
    case 'temporary_banishment':
    case 'armor_class_modifier':
    case 'hit_point_maximum_modifier':
    case 'attack_roll_modifier':
    case 'saving_throw_modifier':
    case 'd20_test_modifier':
    case 'movement_modifier':
    case 'damage_rider':
    case 'ensnaring_strike':
    case 'bonus_action_attack_grant':
    case 'extra_attack_count_override':
    case 'action_surge':
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
    case 'faerie_fire':
    case 'consumable_healing_pool':
    case 'creature_type_protection':
    case 'sanctuary':
    case 'magic_missile_immunity':
    case 'shield_defense':
    case 'beacon_of_hope':
    case 'bestow_curse':
    case 'blink':
    case 'clairvoyance_sensor':
    case 'created_food_and_water':
    case 'flight':
    case 'gaseous_form':
    case 'haste':
    case 'hypnotic_pattern':
    case 'fear':
    case 'meld_into_stone':
    case 'nondetection':
    case 'phantom_steed':
    case 'sending':
    case 'slow':
    case 'speak_with_dead':
    case 'universal_language':
    case 'vampiric_touch':
    case 'water_breathing':
    case 'water_walk':
    case 'arcane_eye':
    case 'aura_of_life':
    case 'banishment':
    case 'charm_monster':
    case 'death_ward':
    case 'dimension_door':
    case 'divination':
    case 'fabricate':
    case 'faithful_hound':
    case 'fire_shield':
    case 'freedom_of_movement':
    case 'guardian_of_faith':
    case 'locate_creature':
    case 'polymorph':
    case 'resilient_sphere':
    case 'secret_chest':
    case 'stone_shape':
    case 'damage_resistances':
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
  const slotDelta = definition.level === 0 || command.castAsRitual
    ? 0
    : (command.slotLevel as number) - definition.level;
  const slotLevel = command.slotLevel ?? definition.level;
  const durationTier = data.slotDurationTiers
    ?.reduce<NonNullable<EffectData['slotDurationTiers']>[number] | undefined>(
      (highest, candidate) => candidate.minimumSlot <= slotLevel &&
        (highest === undefined || candidate.minimumSlot > highest.minimumSlot) ? candidate : highest,
      undefined,
    );
  const durationRounds = durationTier !== undefined
    ? durationTier.durationRounds
    : data.durationRounds === null
      ? null
      : data.durationRounds + (data.durationRoundsPerSlot ?? 0) * slotDelta;
  return {
    targets: actualTargets,
    duration: durationRounds === null
      ? { kind: 'permanent' }
      : {
          kind: 'turn_boundaries',
          timing: { combatant: timingCombatant, boundary, source: definition.source },
          remaining: durationRounds,
        },
    concentration: durationTier?.concentration ?? data.concentration,
    stackingIdentity: effectStackingIdentity(`spell:${definition.id}`),
    stacking: data.stacking ?? 'replace_same_source',
    repeatedSave: data.repeatedSave === undefined
      ? null
      : {
          timing: {
            combatant: actualTargets[0] as CombatantId,
            boundary: data.repeatedSave.timing === 'target_start' ? 'start' : 'end',
            source: definition.source,
          },
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

function grantTemporaryHitPoints(
  context: ReductionContext,
  target: CombatantId,
  amount: number,
): void {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new EncounterRuleError('Temporary Hit Points must be a non-negative safe integer.');
  }
  const subject = combatant(context.state, target);
  const after = Math.max(subject.temporaryHitPoints, amount);
  context.state = replaceCombatant(context.state, { ...subject, temporaryHitPoints: after });
  emit(context, {
    type: 'temporary_hit_points_changed',
    combatant: target,
    before: subject.temporaryHitPoints,
    after,
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
  const rollModeEffects = context.state.effects.filter((effect) => {
    if (effect.payload.kind === 'faerie_fire') return effect.targets.includes(target);
    if (effect.payload.kind !== 'attack_roll_mode_modifier') return false;
    const appliesTo = effect.payload.appliesTo;
    return ((appliesTo.kind === 'next_attack_against_target' ||
      appliesTo.kind === 'attacks_against_target') && effect.targets.includes(target)) ||
      (appliesTo.kind === 'next_attack_by_target' && effect.targets.includes(command.actor));
  });
  const attack = resolveAttackRoll({
    attackBonus: command.attackBonus + effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng),
    targetArmorClass: effectiveArmorClass(context.state, target),
    rollMode: combineRollModes(['normal', ...rollModeEffects.map((effect) =>
      effect.payload.kind === 'faerie_fire'
        ? effect.payload.attackModeAgainstTarget
        : effect.payload.kind === 'attack_roll_mode_modifier' ? effect.payload.mode : 'normal')]),
    criticalFloor: 20,
  }, context.rng);
  endEffects(context, new Set(rollModeEffects.flatMap((effect) =>
    effect.payload.kind === 'attack_roll_mode_modifier' &&
    (effect.payload.appliesTo.kind === 'next_attack_against_target' ||
      effect.payload.appliesTo.kind === 'next_attack_by_target')
      ? [effect.id]
      : [])), 'duration_expired');
  let result: ReturnType<typeof resolveDamage> | null = null;
  if (attack.outcome !== 'miss') {
    const baseRequest: DamageRequest = {
      terms: [{ type: spellDamageType, dice: scaledSpellDamageExpression(context, definition, damage, command) }],
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

function applySpellDamageAmount(
  context: ReductionContext,
  source: CombatantId,
  target: CombatantId,
  type: DamageType,
  sides: number,
  rawAmount: number,
): void {
  const baseRequest: DamageRequest = {
    terms: [{ type, dice: { count: 0, sides: dieSides(sides), modifier: rawAmount } }],
    critical: false,
    responses: [],
  };
  const adjusted = resolveDamage({
    ...baseRequest,
    responses: targetDamageResponses(context.state, target, baseRequest),
  }, context.rng).total;
  applyDamage(context, source, target, adjusted);
  concentrationCheck(context, target, adjusted);
}

function processSpellCast(context: ReductionContext, command: SpellCastCommand): void {
  const definition = spellDefinition(command.spellId) ??
    importedSpellDefinition(context.state.contentPacks, command.spellId);
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
        terms: [{ type: operation.saveDamageType, dice: scaledSpellDamageExpression(context, definition, operation.saveDice, command) }],
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
        const rolled = rollDice(context.rng, scaledSpellDamageExpression(context, definition, operation.initialDice, command));
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
        terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        const rawAmount = save.outcome === 'failure'
          ? roll.total
          : operation.onSuccess === 'half' ? Math.floor(roll.total / 2) : 0;
        applySpellDamageAmount(context, command.actor, target, operation.damageType, operation.dice.sides, rawAmount);
        if (save.outcome === 'failure' && operation.riderOnFailure !== null) {
          applySpellEffect(context, definition, command, operation.riderOnFailure, [target]);
        }
        if (save.outcome === 'failure' && operation.pushFeetOnFailure > 0) {
          context.state = pushAway(context.state, command.actor, target, operation.pushFeetOnFailure);
        }
      }
      return;
    }
    case 'save_multi_damage': {
      const rolled = operation.terms.map((term) => ({
        type: term.damageType,
        sides: term.dice.sides,
        total: resolveDamage({
          terms: [{ type: term.damageType, dice: scaledSpellDamageExpression(context, definition, term.dice, command) }],
          critical: false,
          responses: [],
        }, context.rng).total,
      }));
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        for (const term of rolled) {
          const amount = save.outcome === 'failure'
            ? term.total
            : operation.onSuccess === 'half' ? Math.floor(term.total / 2) : 0;
          applySpellDamageAmount(context, command.actor, target, term.type, term.sides, amount);
        }
      }
      if (operation.effect !== null) applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return;
    }
    case 'save_damage_over_time': {
      const initial = resolveDamage({
        terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.initialDice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        const amount = save.outcome === 'failure' ? initial.total : Math.floor(initial.total / 2);
        applySpellDamageAmount(context, command.actor, target, operation.damageType, operation.initialDice.sides, amount);
        if (save.outcome === 'failure') {
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
            target: 'targets', concentration: false, durationRounds: 1, expiresAt: 'target_end',
          }, [target]);
        }
      }
      return;
    }
    case 'save_damage_and_effect': {
      const rolled = resolveDamage({
        terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
        critical: false,
        responses: [],
      }, context.rng);
      for (const target of targets) {
        const save = resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
        const amount = save.outcome === 'failure'
          ? rolled.total
          : operation.onSuccess === 'half' ? Math.floor(rolled.total / 2) : 0;
        applySpellDamageAmount(context, command.actor, target, operation.damageType, operation.dice.sides, amount);
      }
      applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return;
    }
    case 'healing': {
      const rolled = rollDice(context.rng, scaledDiceExpression(definition, operation.dice, command));
      const amount = rolled.total + (operation.addSpellcastingModifier ? command.spellcastingModifier : 0);
      for (const target of targets) applyHealing(context, command.actor, target, Math.max(0, amount));
      return;
    }
    case 'fixed_healing': {
      const amount = operation.baseAmount + operation.additionalPerSlot *
        ((command.slotLevel as number) - definition.level);
      for (const target of targets) {
        applyHealing(context, command.actor, target, amount);
        removeSpellConditions(context, target, operation.removesConditions);
      }
      return;
    }
    case 'temporary_hit_points': {
      const rolled = rollDice(context.rng, scaledDiceExpression(definition, operation.dice, command));
      grantTemporaryHitPoints(context, command.actor, rolled.total);
      return;
    }
    case 'effect':
      applySpellEffect(context, definition, command, operation.effect, targets);
      return;
    case 'save_effect': {
      const eligible = operation.excludeCaster
        ? targets.filter((target) => target !== command.actor)
        : targets;
      const failed = operation.willingTargetSkipsSave === true && command.selectedOption === 'willing'
        ? eligible
        : eligible.filter((target) =>
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
    case 'reaction_save_cancel':
      for (const target of targets) {
        resolveTargetSave(context, command.actor, target, operation.ability, command.saveDc, 'normal', null);
      }
      return;
    case 'dispel_magic': {
      const automaticLevel = Math.max(operation.baseAutomaticLevel, command.slotLevel as number);
      const matching = context.state.effects.filter((candidate) => {
        if (!candidate.targets.some((target) => targets.includes(target))) return false;
        const identity = String(candidate.stackingIdentity);
        if (!identity.startsWith('spell:')) return false;
        const affectedId = identity.slice('spell:'.length);
        const affected = spellDefinition(affectedId) ??
          importedSpellDefinition(context.state.contentPacks, affectedId);
        return affected !== null && affected.level <= automaticLevel;
      });
      endEffects(context, new Set(matching.map((candidate) => candidate.id)), 'dispelled');
      return;
    }
    case 'remove_curse': {
      const matching = context.state.effects.filter((candidate) =>
        candidate.targets.some((target) => targets.includes(target)) && candidate.payload.kind === 'bestow_curse');
      endEffects(context, new Set(matching.map((candidate) => candidate.id)), 'dispelled');
      return;
    }
    case 'revive':
      for (const target of targets) {
        const subject = combatant(context.state, target);
        if (subject.life !== 'dead') throw new EncounterRuleError(`${definition.name} requires a dead creature.`);
        context.state = replaceCombatant(context.state, {
          ...subject, life: 'living', hitPoints: operation.hitPoints, deathSaves: null,
        });
      }
      return;
    case 'lifedrain_attack': {
      const target = targets[0] as CombatantId;
      const before = combatant(context.state, target).hitPoints;
      const attack = resolveSpellAttack(context, definition, command, target, operation.dice, operation.damageType, null);
      if (attack.outcome !== 'miss') {
        const dealt = before - combatant(context.state, target).hitPoints;
        applyHealing(context, command.actor, command.actor, Math.floor(dealt / operation.healingDivisor));
      }
      applySpellEffect(context, definition, command, operation.effect, [command.actor]);
      return;
    }
    case 'attack_rays':
      for (const target of targets) {
        resolveSpellAttack(context, definition, command, target, operation.dice, operation.damageType, null);
      }
      return;
    case 'attack_beams':
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
          terms: [{ type: operation.damageType, dice: scaledSpellDamageExpression(context, definition, operation.dice, command) }],
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
    case 'weapon_attack_augmentation': {
      if (operation.timing === 'during_cast') {
        if (command.weaponAttack === null) throw new EncounterRuleError('True Strike requires a weapon attack profile.');
        if (command.selectedOption !== null && command.selectedOption !== 'Radiant') {
          throw new EncounterRuleError('True Strike damage must use the weapon type or Radiant.');
        }
        const target = targets[0] as CombatantId;
        const advantageEffects = context.state.effects.filter((effect) => {
          if (
            !effect.targets.includes(target) ||
            effect.payload.kind !== 'attack_roll_mode_modifier'
          ) return false;
          return effect.payload.appliesTo.kind === 'next_attack_against_target' ||
            effect.payload.appliesTo.kind === 'attacks_against_target';
        });
        const attack = resolveAttackRoll({
          attackBonus: command.attackBonus +
            effectDiceModifier(context.state, command.actor, 'attack_roll', context.rng),
          targetArmorClass: effectiveArmorClass(context.state, target),
          rollMode: combineRollModes(['normal', ...advantageEffects.map((effect) =>
            effect.payload.kind === 'attack_roll_mode_modifier' ? effect.payload.mode : 'normal')]),
          criticalFloor: 20,
        }, context.rng);
        endEffects(context, new Set(advantageEffects.flatMap((effect) =>
          effect.payload.kind === 'attack_roll_mode_modifier' &&
          effect.payload.appliesTo.kind === 'next_attack_against_target'
            ? [effect.id]
            : [])), 'duration_expired');
        let result: ReturnType<typeof resolveDamage> | null = null;
        if (attack.outcome !== 'miss') {
          const weaponDamageType = command.selectedOption === 'Radiant'
            ? operation.extraDamage.type
            : command.weaponAttack.damageType;
          result = resolveDamage({
            terms: [
              {
                type: weaponDamageType,
                dice: {
                  count: command.weaponAttack.damageCount,
                  sides: dieSides(command.weaponAttack.damageSides),
                  modifier: command.spellcastingModifier,
                },
              },
              {
                type: operation.extraDamage.type,
                dice: scaledSpellDamageExpression(context, definition, operation.extraDamage.dice, command),
              },
            ],
            critical: attack.outcome === 'critical',
            responses: [],
          }, context.rng);
          applyDamage(context, command.actor, target, result.total, attack.outcome === 'critical');
        }
        emit(context, { type: 'attack_resolved', actor: command.actor, target, attack, damage: result });
        return;
      }
      const damage: DamageRequest = {
        terms: operation.extraDamage === null
          ? []
          : [{
              type: operation.extraDamage.type,
              dice: scaledDiceExpression(definition, operation.extraDamage.dice, command),
            }],
        critical: false,
        responses: [],
      };
      const followUp = operation.followUp === null
        ? undefined
        : operation.followUp.kind === 'ongoing_damage_save_ends'
          ? {
              kind: operation.followUp.kind,
              damage: {
                terms: [{
                  type: operation.followUp.damageType,
                  dice: scaledDiceExpression(definition, operation.followUp.dice, command),
                }],
                critical: false,
                responses: [],
              },
              saveAbility: operation.followUp.saveAbility,
              saveDc: command.saveDc,
              timing: 'start',
              durationRounds: operation.followUp.durationRounds,
            } as const
          : {
              kind: operation.followUp.kind,
              saveAbility: operation.followUp.saveAbility,
              saveDc: command.saveDc,
              rollMode: operation.followUp.rollMode,
              damage: {
                terms: [{
                  type: operation.followUp.damageType,
                  dice: scaledDiceExpression(definition, operation.followUp.dice, command),
                }],
                critical: false,
                responses: [],
              },
              timing: 'start',
              durationRounds: operation.followUp.durationRounds,
            } as const;
      applySpellEffect(context, definition, command, {
        payload: {
          kind: 'damage_rider',
          damage,
          appliesTo: 'weapon_attack_by_target',
          consumeOnHit: operation.consumeOnHit,
          ...(followUp === undefined ? {} : { followUp }),
        },
        target: 'self',
        concentration: operation.concentration,
        durationRounds: operation.durationRounds,
        expiresAt: 'source_start',
      }, [command.actor]);
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
        const slotLevel = command.slotLevel ?? definition.level;
        const becomesPermanent = operation.becomesPermanentAtSlot !== undefined && slotLevel >= operation.becomesPermanentAtSlot;
        const losesConcentration = operation.losesConcentrationAtSlot !== undefined && slotLevel >= operation.losesConcentrationAtSlot;
        const slotDelta = definition.level === 0 ? 0 : slotLevel - definition.level;
        applySpellEffect(context, definition, command, {
          payload: operation.effect,
          target: 'self',
          concentration: losesConcentration ? false : operation.concentration,
          durationRounds: becomesPermanent
            ? null
            : operation.durationRounds === null
              ? null
              : operation.durationRounds + (operation.durationRoundsPerSlot ?? 0) * slotDelta,
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

type InitiativeEntryDraft = Omit<InitiativeEntry, 'slot'>;

interface InitiativeSlotDraft {
  readonly entries: readonly InitiativeEntryDraft[];
  readonly total: number;
  readonly bonus: number;
  readonly tieBreaker: CombatantId;
}

function initiativeBonusFor(
  state: EncounterState,
  subject: EncounterCombatantState,
): number {
  return subject.profile.rules.initiativeBonus + exhaustionPenalty(
    combatantConditions(state, subject.profile.id),
  );
}

function initiativeRollModeFor(
  state: EncounterState,
  subject: EncounterCombatantState,
): RollMode {
  const modes: RollMode[] = ['normal'];
  for (const clause of conditionMechanicalState(
    combatantConditions(state, subject.profile.id),
  ).clauses) {
    if (clause.kind === 'roll_mode' && clause.roll === 'initiative') modes.push(clause.mode);
  }
  return combineRollModes(modes);
}

function rollIndividualInitiative(
  context: ReductionContext,
  subject: EncounterCombatantState,
): InitiativeSlotDraft {
  const roll = rollD20(context.rng, initiativeRollModeFor(context.state, subject));
  const bonus = initiativeBonusFor(context.state, subject);
  const entry: InitiativeEntryDraft = {
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
  return {
    entries: [entry],
    total: entry.total,
    bonus,
    tieBreaker: subject.profile.id,
  };
}

function rollEnemyInitiativeBlock(
  context: ReductionContext,
  monsters: readonly EncounterCombatantState[],
): InitiativeSlotDraft | null {
  const ordered = [...monsters].sort((left, right) => {
    const bonusDifference =
      initiativeBonusFor(context.state, right) - initiativeBonusFor(context.state, left);
    return bonusDifference || left.profile.id.localeCompare(right.profile.id);
  });
  const representative = ordered[0];
  if (representative === undefined) return null;
  const bonus = initiativeBonusFor(context.state, representative);
  const roll = rollD20(
    context.rng,
    initiativeRollModeFor(context.state, representative),
  );
  const total = roll.chosen + bonus;
  emit(context, {
    type: 'initiative_block_rolled',
    combatants: ordered.map((subject) => subject.profile.id),
    faces: roll.faces,
    total,
    bonus,
  });
  return {
    entries: ordered.map((subject) => ({
      combatant: subject.profile.id,
      total,
      roll: roll.chosen,
      bonus,
    })),
    total,
    bonus,
    tieBreaker: representative.profile.id,
  };
}

function sortInitiativeSlots(slots: readonly InitiativeSlotDraft[]): InitiativeSlotDraft[] {
  return [...slots].sort(
    (left, right) =>
      right.total - left.total ||
      right.bonus - left.bonus ||
      left.tieBreaker.localeCompare(right.tieBreaker),
  );
}

function rollInitiativeSlots(context: ReductionContext): readonly InitiativeSlotDraft[] {
  if (context.state.config.initiativeMode === 'per_combatant') {
    return sortInitiativeSlots(
      context.state.combatants.map((subject) => rollIndividualInitiative(context, subject)),
    );
  }
  const players = context.state.combatants.filter(
    (subject) => subject.profile.kind === 'player_character',
  );
  const monsters = context.state.combatants.filter(
    (subject) => subject.profile.kind === 'monster',
  );
  const playerSlots = sortInitiativeSlots(
    players.map((subject) => rollIndividualInitiative(context, subject)),
  );
  const enemySlot = rollEnemyInitiativeBlock(context, monsters);
  if (context.state.config.initiativeMode === 'side_alternating') {
    return enemySlot === null ? playerSlots : [...playerSlots, enemySlot];
  }
  return sortInitiativeSlots(enemySlot === null ? playerSlots : [...playerSlots, enemySlot]);
}

function processCommand(context: ReductionContext, command: EncounterCommand): void {
  switch (command.type) {
    case 'adjudicate': {
      if (command.reasoning.trim().length === 0) {
        throw new EncounterRuleError('An adjudication requires DM reasoning.');
      }
      if (command.subject.trim().length === 0 || command.subject.length > 200) {
        throw new EncounterRuleError('An adjudication subject must be non-empty and at most 200 characters.');
      }
      const subject = combatant(context.state, command.target);
      if (command.consequence.kind === 'hit_point_delta') {
        if (!Number.isSafeInteger(command.consequence.amount)) {
          throw new EncounterRuleError('An adjudicated Hit Point delta must be a safe integer.');
        }
        const before = subject.hitPoints;
        const after = Math.max(
          0,
          Math.min(subject.profile.rules.hitPointMaximum, before + command.consequence.amount),
        );
        const life = after > 0
          ? 'living'
          : subject.profile.rules.usesDeathSaves
            ? 'dying'
            : 'dead';
        context.state = replaceCombatant(context.state, {
          ...subject,
          hitPoints: after,
          life,
          deathSaves: life === 'dying'
            ? subject.deathSaves ?? { successes: 0, failures: 0 }
            : null,
        });
        emit(context, {
          type: 'adjudicated',
          target: command.target,
          subject: command.subject,
          reasoning: command.reasoning.trim(),
          consequence: { kind: 'hit_points', before, after, lifeState: life },
        });
        return;
      }
      const consequence = command.consequence;
      if (!isCellInside(context.state.bounds, consequence.to)) {
        throw new EncounterRuleError('An adjudicated destination is outside the encounter grid.');
      }
      if (
        context.state.blockedCells.some((cell) => cellKey(cell) === cellKey(consequence.to)) ||
        context.state.tokens.some(
          (candidate) =>
            candidate.combatantId !== command.target &&
            cellKey(candidate.position) === cellKey(consequence.to),
        )
      ) {
        throw new EncounterRuleError('An adjudicated destination must be unoccupied and unblocked.');
      }
      const existing = token(context.state, command.target);
      context.state = {
        ...context.state,
        tokens: context.state.tokens.map((candidate) =>
          candidate.combatantId === command.target
            ? { ...candidate, position: { ...consequence.to } }
            : candidate,
        ),
      };
      emit(context, {
        type: 'adjudicated',
        target: command.target,
        subject: command.subject,
        reasoning: command.reasoning.trim(),
        consequence: {
          kind: 'position',
          from: { ...existing.position },
          to: { ...consequence.to },
        },
      });
      return;
    }
    case 'cast_spell':
      processSpellCast(context, command);
      return;
    case 'roll_initiative': {
      if (context.state.initiative.length > 0) {
        throw new EncounterRuleError('Initiative has already been rolled.');
      }
      const slots = rollInitiativeSlots(context);
      const initiative = slots.flatMap((slot, slotIndex) =>
        slot.entries.map((entry) => ({ ...entry, slot: slotIndex })),
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
      emit(context, {
        type: 'initiative_ordered',
        order: initiative.map((entry) => entry.combatant),
        slots: slots.map((slot) => slot.entries.map((entry) => entry.combatant)),
      });
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
    case 'activate_action_surge': {
      const subject = assertActiveActor(context, command.actor);
      assertCanUseActions(context, command.actor);
      const effect = featureEffect(context.state, command.actor, command.effectId);
      if (effect.payload.kind !== 'action_surge' || effect.resourcePoolId === null) {
        throw new EncounterRuleError(`Effect ${effect.id} does not grant a resource-fueled extra action.`);
      }
      if (subject.turn.action.kind !== 'spent') {
        throw new EncounterRuleError(`Combatant ${command.actor} must spend its current action before gaining another.`);
      }
      spendLimitedResource(context, command.actor, effect.resourcePoolId, `Effect ${effect.id}`);
      const refreshed = combatant(context.state, command.actor);
      context.state = replaceCombatant(context.state, {
        ...refreshed,
        turn: { ...refreshed.turn, action: { kind: 'available' } },
      });
      return;
    }
    case 'activate_timed_spellcasting_mode': {
      const subject = assertActiveActor(context, command.actor);
      assertCanUseActions(context, command.actor);
      const effect = featureEffect(context.state, command.actor, command.effectId);
      if (
        effect.payload.kind !== 'timed_spellcasting_mode' ||
        effect.resourcePoolId === null ||
        effect.trigger !== 'bonus_action'
      ) {
        throw new EncounterRuleError(`Effect ${effect.id} is not a resource-fueled timed spellcasting mode.`);
      }
      if (subject.turn.additionalLeveledSpellActionsRemaining === 1) {
        throw new EncounterRuleError('The timed spellcasting mode is already active this turn.');
      }
      spendCost(context, command.actor, 'bonus_action', `Effect ${effect.id}`);
      spendLimitedResource(context, command.actor, effect.resourcePoolId, `Effect ${effect.id}`);
      const refreshed = combatant(context.state, command.actor);
      context.state = replaceCombatant(context.state, {
        ...refreshed,
        turn: {
          ...refreshed.turn,
          additionalLeveledSpellActionsRemaining: effect.payload.additionalLeveledSpellActions,
        },
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
    case 'consume_healing_pool': {
      assertActiveActor(context, command.actor);
      const pool = context.state.effects.find((effect) => effect.id === command.effectId);
      if (pool === undefined || pool.payload.kind !== 'consumable_healing_pool') {
        throw new EncounterRuleError(`Effect ${command.effectId} is not a consumable healing pool.`);
      }
      if (pool.payload.remainingUses < 1) {
        throw new EncounterRuleError(`Healing pool ${command.effectId} is empty.`);
      }
      spendCost(context, command.actor, pool.payload.activation, 'Consume healing resource');
      const remaining = pool.payload.remainingUses - 1;
      context.state = {
        ...context.state,
        effects: context.state.effects.map((effect) => effect.id === pool.id
          ? { ...effect, payload: { ...pool.payload, remainingUses: remaining } }
          : effect),
      };
      applyHealing(context, command.actor, command.actor, pool.payload.healingPerUse);
      emit(context, {
        type: 'healing_pool_consumed',
        combatant: command.actor,
        effectId: pool.id,
        remaining,
      });
      return;
    }
    case 'apply_effect':
      if (command.cost !== 'reaction') assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Apply effect');
      if (command.resourcePoolId !== undefined) {
        spendLimitedResource(context, command.actor, command.resourcePoolId, 'Apply effect');
      }
      applyEffect(context, command.actor, command.effect);
      return;
    case 'grant_temporary_hit_points':
      if (command.cost !== 'reaction') assertActiveActor(context, command.actor);
      spendCost(context, command.actor, command.cost, 'Grant temporary Hit Points');
      if (command.resourcePoolId !== undefined) {
        spendLimitedResource(
          context,
          command.actor,
          command.resourcePoolId,
          'Grant temporary Hit Points',
        );
      }
      grantTemporaryHitPoints(context, command.target, command.amount);
      return;
    case 'end_concentration':
      assertActiveActor(context, command.actor);
      endConcentration(context, command.actor, 'concentration_ended');
      return;
    case 'end_turn': {
      if (context.state.activeCombatant !== command.actor) {
        throw new EncounterRuleError(`Combatant ${command.actor} is not the active combatant.`);
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
