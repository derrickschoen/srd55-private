import type { EngineStateCapsule } from '../engine-state-capsule';
import type {
  EngineActionChoice,
  EngineEngagement,
  EngineIntentBranch,
  EngineTurnIntent,
} from '../intent-resolver';

export const PLAY_NAMES = ['remove_obstacle', 'focus_fire', 'basic_advance'] as const;
export type PlayName = (typeof PLAY_NAMES)[number];

export interface SnippetSchema<Value> {
  readonly parse: (value: unknown) => Value;
}

export interface ReservedSnippetContext {
  /** Increment 3 activates this capability; no v1 value can be constructed. */
  readonly call: never;
}

interface SnippetBase<Args, Out> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: SnippetSchema<Args>;
  readonly outputSchema: SnippetSchema<Out>;
  readonly ctx: ReservedSnippetContext | null;
  readonly snippetHash: string;
}

export interface PlaySnippetDefinition extends SnippetBase<EngineStateCapsule, readonly EngineTurnIntent[]> {
  readonly exposure: 'play';
  readonly rank: number;
  readonly applicability: (capsule: EngineStateCapsule) => boolean;
  readonly expand: (capsule: EngineStateCapsule) => readonly EngineTurnIntent[];
}

export interface AutoSnippetDefinition<Args, Out> extends SnippetBase<Args, Out> {
  readonly exposure: 'auto';
  readonly trigger: (args: Args) => boolean;
  readonly run: (args: Args) => Out;
}

export interface OnDemandSnippetDefinition<Args, Out> extends SnippetBase<Args, Out> {
  readonly exposure: 'on_demand';
  readonly run: (args: Args) => Out;
}

export type SnippetDefinition<Args, Out> =
  | PlaySnippetDefinition
  | AutoSnippetDefinition<Args, Out>
  | OnDemandSnippetDefinition<Args, Out>;

export interface AdvertisedPlay {
  readonly name: PlayName;
  readonly description: string;
  readonly snippetHash: string;
}

export interface SnippetRegistry {
  readonly plays: readonly PlaySnippetDefinition[];
  readonly snippetHash: string;
  readonly snippetSetHash: string;
  applicable(capsule: EngineStateCapsule): readonly AdvertisedPlay[];
  expand(name: PlayName, capsule: EngineStateCapsule): {
    readonly definition: PlaySnippetDefinition;
    readonly intents: readonly EngineTurnIntent[];
  };
}

interface RegistryDependencies {
  readonly inputSchema: SnippetSchema<EngineStateCapsule>;
  readonly outputSchema: SnippetSchema<readonly EngineTurnIntent[]>;
  readonly hash: (content: string) => string;
}

type ProjectedActor = EngineStateCapsule['projection']['combatants'][number];
type ProjectedAction = ProjectedActor['actions'][number];

const RUNTIME_VERSION = 'plays-v1-runtime-6';
const DODGE: EngineIntentBranch = {
  choice: { kind: 'dodge' },
  movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
  engagement: { stance: 'hold_position' },
};
const END_TURN: EngineIntentBranch = {
  choice: { kind: 'end_turn' },
  movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
  engagement: { stance: 'hold_position' },
};

function targetSelector(target: ProjectedActor) {
  return { kind: 'combatant' as const, combatantId: target.id };
}

function gridDistance(
  left: ProjectedActor['position'],
  right: ProjectedActor['position'],
): number {
  return Math.max(
    Math.abs(left.column - right.column),
    Math.abs(left.row - right.row),
  ) * 5;
}

function requestedActors(capsule: EngineStateCapsule): readonly ProjectedActor[] {
  if (capsule.request === null) return [];
  const ids = new Set(capsule.request.actors);
  return capsule.projection.combatants
    .filter((actor) => ids.has(actor.id) && actor.life !== 'dead')
    .sort((left, right) => left.id.localeCompare(right.id));
}

function opposingTargets(capsule: EngineStateCapsule, actors: readonly ProjectedActor[]): readonly ProjectedActor[] {
  const side = actors[0]?.side;
  if (side === undefined) return [];
  return capsule.projection.combatants
    .filter((candidate) => candidate.life !== 'dead' && candidate.side !== side)
    .sort((left, right) =>
      left.hitPoints - right.hitPoints ||
      right.reachFeet - left.reachFeet ||
      left.id.localeCompare(right.id));
}

function blockerTargets(capsule: EngineStateCapsule, actors: readonly ProjectedActor[]): readonly ProjectedActor[] {
  const chokeCells = [
    ...capsule.projection.blockedCells,
    ...capsule.projection.movementBlockingObjects.flatMap((object) => object.cells),
  ];
  const obstacleRank = (target: ProjectedActor) => ({
    adjacentAllies: actors.filter((actor) => gridDistance(actor.position, target.position) === 5).length,
    adjacentChoke: chokeCells.some((cell) => gridDistance(cell, target.position) === 5),
  });
  return [...opposingTargets(capsule, actors)]
    .filter((target) => {
      const rank = obstacleRank(target);
      return rank.adjacentAllies > 0 || rank.adjacentChoke;
    })
    .sort((left, right) => {
      const leftRank = obstacleRank(left);
      const rightRank = obstacleRank(right);
      return rightRank.adjacentAllies - leftRank.adjacentAllies ||
        Number(rightRank.adjacentChoke) - Number(leftRank.adjacentChoke) ||
        right.reachFeet - left.reachFeet ||
        left.hitPoints - right.hitPoints ||
        left.id.localeCompare(right.id);
    });
}

function attackActions(actor: ProjectedActor): readonly ProjectedAction[] {
  return actor.actions.filter((action) => action.kind === 'attack' && action.rangeFeet !== null);
}

function minimumMovement(
  actor: ProjectedActor,
  target: ProjectedActor,
  action: ProjectedAction,
): number | null {
  return actor.actionApproaches.find((approach) =>
    approach.actionId === action.actionId && approach.targetId === target.id,
  )?.minimumMovementFeet ?? null;
}

function canAttackThisTurn(
  actor: ProjectedActor,
  target: ProjectedActor,
  action: ProjectedAction,
  maximumMovementFeet = actor.speedFeet * 2,
): boolean {
  const movement = minimumMovement(actor, target, action);
  return movement !== null && movement <= maximumMovementFeet;
}

function bestAttack(
  actor: ProjectedActor,
  target: ProjectedActor,
  maximumMovementFeet = actor.speedFeet * 2,
): ProjectedAction | null {
  const actions = attackActions(actor).filter((action) =>
    canAttackThisTurn(actor, target, action, maximumMovementFeet));
  actions.sort((left, right) =>
    (minimumMovement(actor, target, left) ?? Number.POSITIVE_INFINITY) -
      (minimumMovement(actor, target, right) ?? Number.POSITIVE_INFINITY) ||
    (right.rangeFeet ?? 0) - (left.rangeFeet ?? 0) ||
    left.actionId.localeCompare(right.actionId));
  return actions[0] ?? null;
}

function choice(action: ProjectedAction, target: ProjectedActor): EngineActionChoice {
  const selector = targetSelector(target);
  return action.kind === 'attack'
    ? { kind: 'attack', actionId: action.actionId, target: selector, resourcePolicy: 'normal' }
    : { kind: 'use_action', actionId: action.actionId, target: selector };
}

function engagement(actor: ProjectedActor, target: ProjectedActor, action: ProjectedAction): EngineEngagement {
  const selector = targetSelector(target);
  return action.rangeFeet !== null && action.rangeFeet > actor.reachFeet
    ? { stance: 'maintain_range', anchor: selector }
    : { stance: 'close_to_melee', anchor: selector };
}

function isRangedAttack(action: ProjectedAction): boolean {
  return action.kind === 'attack' &&
    (action.attackDelivery === 'ranged' || action.attackDelivery === 'melee_or_ranged');
}

function isReachableLongRangeUpgrade(
  actor: ProjectedActor,
  target: ProjectedActor,
  action: ProjectedAction,
  requiredMovement: number | null,
): boolean {
  if (!isRangedAttack(action) || action.normalRangeFeet === null || action.longRangeFeet === null) return false;
  const distance = gridDistance(actor.position, target.position);
  return distance > action.normalRangeFeet && distance <= action.longRangeFeet &&
    requiredMovement !== null && requiredMovement > 0 && requiredMovement <= actor.speedFeet;
}

function attackBranch(
  actor: ProjectedActor,
  target: ProjectedActor,
  action: ProjectedAction,
): EngineIntentBranch {
  const requiredMovement = minimumMovement(actor, target, action);
  if (requiredMovement === null || requiredMovement === 0) {
    return {
      choice: choice(action, target),
      movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
      engagement: engagement(actor, target, action),
    };
  }
  const ranged = isRangedAttack(action);
  return {
    choice: choice(action, target),
    movement: {
      willingness: isReachableLongRangeUpgrade(actor, target, action, requiredMovement)
        ? 'for_clear_advantage'
        : 'only_if_required',
      maximumFeet: actor.speedFeet,
      opportunityRisk: ranged ? 'avoid' : 'accept_if_needed',
    },
    engagement: engagement(actor, target, action),
  };
}

function dash(actor: ProjectedActor, target: ProjectedActor): EngineIntentBranch {
  return {
    choice: { kind: 'dash' },
    movement: {
      willingness: 'freely',
      maximumFeet: actor.speedFeet * 2,
      opportunityRisk: 'avoid',
    },
    engagement: { stance: 'close_to_melee', anchor: targetSelector(target) },
  };
}

function alternateBranch(actor: ProjectedActor, target: ProjectedActor): EngineIntentBranch | null {
  const normalAction = bestAttack(actor, target, actor.speedFeet);
  if (normalAction !== null) return attackBranch(actor, target, normalAction);
  const dashAction = bestAttack(actor, target);
  return dashAction === null ? null : dash(actor, target);
}

function bestAlternateBranch(
  actor: ProjectedActor,
  primaryTarget: ProjectedActor,
  targets: readonly ProjectedActor[],
): EngineIntentBranch | null {
  const alternates = targets.filter((target) => target.id !== primaryTarget.id);
  const normalTarget = alternates.find((target) => bestAttack(actor, target, actor.speedFeet) !== null);
  if (normalTarget !== undefined) return alternateBranch(actor, normalTarget);
  const dashTarget = alternates.find((target) => bestAttack(actor, target) !== null);
  return dashTarget === undefined ? null : alternateBranch(actor, dashTarget);
}

function intent(
  actor: ProjectedActor,
  target: ProjectedActor,
  action: ProjectedAction,
  targets: readonly ProjectedActor[],
): EngineTurnIntent {
  const requiredMovement = minimumMovement(actor, target, action);
  const primary = attackBranch(actor, target, action);
  return {
    actorId: actor.id,
    ...primary,
    fallback: requiredMovement !== null && requiredMovement > actor.speedFeet &&
      requiredMovement <= actor.speedFeet * 2
      ? dash(actor, target)
      : bestAlternateBranch(actor, target, targets) ?? DODGE,
  };
}

function defensiveHold(actor: ProjectedActor): EngineTurnIntent {
  return { actorId: actor.id, ...DODGE, fallback: END_TURN };
}

function attackPlan(
  actor: ProjectedActor,
  targets: readonly ProjectedActor[],
): EngineTurnIntent {
  const normalTarget = targets.find((target) => bestAttack(actor, target, actor.speedFeet) !== null);
  if (normalTarget !== undefined) {
    const action = bestAttack(actor, normalTarget, actor.speedFeet);
    if (action !== null) return intent(actor, normalTarget, action, targets);
  }
  const dashTarget = targets.find((target) => bestAttack(actor, target) !== null);
  if (dashTarget !== undefined) {
    const action = bestAttack(actor, dashTarget);
    if (action !== null) return intent(actor, dashTarget, action, targets);
  }
  return defensiveHold(actor);
}

function diversifyAnchors(
  capsule: EngineStateCapsule,
  intents: readonly EngineTurnIntent[],
): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  const byActor = new Map(actors.map((actor) => [actor.id, actor]));
  const replacements = new Map<EngineTurnIntent, EngineIntentBranch>();
  for (const primaryTarget of targets) {
    const concentrated = intents.filter((entry) =>
      entry.engagement.anchor?.kind === 'combatant' &&
      entry.engagement.anchor.combatantId === primaryTarget.id);
    if (concentrated.length < 4) continue;
    const secondary = targets.find((target) => target.id !== primaryTarget.id);
    if (secondary === undefined) continue;
    const candidates = concentrated.flatMap((entry) => {
      const actor = byActor.get(entry.actorId);
      if (actor === undefined) return [];
      const alternate = alternateBranch(actor, secondary);
      return alternate === null ? [] : [{ entry, alternate }];
    });
    const count = Math.min(Math.ceil(concentrated.length / 4), concentrated.length - 1, candidates.length);
    for (const candidate of candidates.slice(-count)) {
      replacements.set(candidate.entry, candidate.alternate);
    }
  }
  return intents.map((entry) => {
    const fallback = replacements.get(entry);
    return fallback === undefined ? entry : { ...entry, fallback };
  });
}

function phaseDraft(
  capsule: EngineStateCapsule,
  intents: readonly EngineTurnIntent[],
): readonly EngineTurnIntent[] {
  return capsule.request?.phase === 'correction'
    ? intents.map((entry) => ({ ...entry, fallback: null }))
    : intents;
}

function isInitialRoundPlan(capsule: EngineStateCapsule): boolean {
  return capsule.request?.phase === 'initial' && capsule.request.kind !== 'plan_adjustment';
}

function basicApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  return isInitialRoundPlan(capsule) && actors.length > 0 && targets.length > 0 &&
    actors.every((actor) => attackActions(actor).length > 0);
}

function expandBasic(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  return phaseDraft(capsule, diversifyAnchors(capsule, actors.map((actor) =>
    attackPlan(actor, targets))));
}

function focusApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  return isInitialRoundPlan(capsule) && actors.length >= 2 && opposingTargets(capsule, actors).length > 0 &&
    actors.every((actor) => attackActions(actor).length > 0);
}

function expandFocus(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  return phaseDraft(capsule, diversifyAnchors(capsule, actors.map((actor) =>
    attackPlan(actor, targets))));
}

function controlAction(actors: readonly ProjectedActor[], target: ProjectedActor): {
  readonly actor: ProjectedActor;
  readonly action: ProjectedAction;
} | null {
  const candidates = actors.flatMap((actor) => actor.actions.flatMap((action) => {
    const id = action.actionId.toLowerCase();
    const movement = minimumMovement(actor, target, action);
    if (movement === null || movement > actor.speedFeet * 2) return [];
    if (id.includes('web') && movement !== 0) return [];
    return id.includes('web') || id.includes('grapple') || id.includes('grab')
      ? [{ actor, action }]
      : [];
  }));
  candidates.sort((left, right) =>
    Number(right.action.actionId.toLowerCase().includes('web')) -
      Number(left.action.actionId.toLowerCase().includes('web')) ||
    left.actor.id.localeCompare(right.actor.id) ||
    left.action.actionId.localeCompare(right.action.actionId));
  return candidates[0] ?? null;
}

function obstacleApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  return isInitialRoundPlan(capsule) &&
    blockerTargets(capsule, actors).some((target) => controlAction(actors, target) !== null);
}

function expandObstacle(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  const target = blockerTargets(capsule, actors).find((candidate) => controlAction(actors, candidate) !== null);
  if (target === undefined) return phaseDraft(capsule, actors.map(defensiveHold));
  const controller = controlAction(actors, target);
  if (controller === null) return phaseDraft(capsule, actors.map(defensiveHold));
  return phaseDraft(capsule, actors.map((actor) => {
    if (actor.id === controller.actor.id) return intent(actor, target, controller.action, targets);
    const action = bestAttack(actor, target);
    return action === null ? defensiveHold(actor) : intent(actor, target, action, targets);
  }));
}

function definition(
  dependencies: RegistryDependencies,
  input: {
    readonly name: PlayName;
    readonly description: string;
    readonly rank: number;
    readonly strategy: string;
    readonly applicability: (capsule: EngineStateCapsule) => boolean;
    readonly expand: (capsule: EngineStateCapsule) => readonly EngineTurnIntent[];
  },
): PlaySnippetDefinition {
  const snippetHash = dependencies.hash(JSON.stringify({
    runtime: RUNTIME_VERSION,
    exposure: 'play',
    name: input.name,
    description: input.description,
    rank: input.rank,
    strategy: input.strategy,
    inputSchema: 'engine-state-capsule-v1',
    outputSchema: 'engine-turn-intent-v1-array',
  }));
  return Object.freeze({
    exposure: 'play',
    name: input.name,
    description: input.description,
    rank: input.rank,
    inputSchema: dependencies.inputSchema,
    outputSchema: dependencies.outputSchema,
    ctx: null,
    snippetHash,
    applicability: input.applicability,
    expand: input.expand,
  });
}

export function createSnippetRegistry(dependencies: RegistryDependencies): SnippetRegistry {
  const plays = Object.freeze([
    definition(dependencies, {
      name: 'remove_obstacle',
      description: 'Control an enemy obstructing an ally or choke with Web, a statblock grapple, or a grab.',
      rank: 10,
      strategy: 'require blocker adjacency to an ally or choke; rank ally pressure then choke, reach, and removal; prefer in-range web, then reachable grapple/grab; allies attack or advance on blocker',
      applicability: obstacleApplicable,
      expand: expandObstacle,
    }),
    definition(dependencies, {
      name: 'focus_fire',
      description: 'Concentrate attacks on the ranked removal target, preferring attacks reachable at normal speed.',
      rank: 20,
      strategy: 'prefer a normal-move attack before ranked dash-range attacks; safely improve long-range attacks to normal range when reachable; avoid opportunity risk for ranged movement; Dash only when an attack position costs more than speed and no more than double speed; try alternate-target offense before Dodge; diversify concentrated anchors through alternate-target fallbacks',
      applicability: focusApplicable,
      expand: expandFocus,
    }),
    definition(dependencies, {
      name: 'basic_advance',
      description: 'Each actor attacks its best normal-speed target, Dashes only into a next-turn attack position, or Dodges.',
      rank: 30,
      strategy: 'per actor prefer any normal-speed attack over a ranked dash-range attack; safely improve long-range attacks to normal range when reachable; avoid opportunity risk for ranged movement; Dash only when attack-position path cost is above speed and at most double speed; try alternate-target offense before Dodge; diversify concentrated anchors through alternate-target fallbacks',
      applicability: basicApplicable,
      expand: expandBasic,
    }),
  ] satisfies readonly PlaySnippetDefinition[]);
  const snippetHash = dependencies.hash(JSON.stringify({
    runtime: RUNTIME_VERSION,
    snippets: plays.map((play) => ({ name: play.name, hash: play.snippetHash })),
  }));
  const snippetSetHash = dependencies.hash(JSON.stringify({
    exposure: 'play',
    enabled: plays.map((play) => `${play.name}:${play.snippetHash}`).sort(),
  }));
  return Object.freeze({
    plays,
    snippetHash,
    snippetSetHash,
    applicable(capsule: EngineStateCapsule) {
      const parsed = dependencies.inputSchema.parse(capsule);
      return plays
        .filter((play) => play.applicability(parsed))
        .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name))
        .slice(0, 3)
        .map((play) => ({
          name: play.name as PlayName,
          description: play.description,
          snippetHash: play.snippetHash,
        }));
    },
    expand(name: PlayName, capsule: EngineStateCapsule) {
      const parsed = dependencies.inputSchema.parse(capsule);
      const selected = plays.find((play) => play.name === name);
      if (selected === undefined) throw new RangeError(`Unknown play ${name}.`);
      if (!selected.applicability(parsed)) throw new RangeError(`PLAY_NOT_APPLICABLE:${name}`);
      return { definition: selected, intents: dependencies.outputSchema.parse(selected.expand(parsed)) };
    },
  });
}
