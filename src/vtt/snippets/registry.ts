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

const RUNTIME_VERSION = 'plays-v1-runtime-3';
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
): boolean {
  const movement = minimumMovement(actor, target, action);
  return movement !== null && movement <= actor.speedFeet * 2;
}

function bestAttack(actor: ProjectedActor, target: ProjectedActor): ProjectedAction | null {
  const actions = attackActions(actor).filter((action) => canAttackThisTurn(actor, target, action));
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

function advance(actor: ProjectedActor, target: ProjectedActor): EngineIntentBranch {
  return {
    choice: { kind: 'dash' },
    movement: {
      willingness: 'freely',
      maximumFeet: actor.speedFeet,
      opportunityRisk: 'avoid',
    },
    engagement: { stance: 'close_to_melee', anchor: targetSelector(target) },
  };
}

function intent(actor: ProjectedActor, target: ProjectedActor, action: ProjectedAction): EngineTurnIntent {
  const requiredMovement = minimumMovement(actor, target, action);
  const movementBudget = requiredMovement === null || requiredMovement === 0
    ? 0
    : actor.speedFeet;
  return {
    actorId: actor.id,
    choice: choice(action, target),
    movement: movementBudget === 0
      ? { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' }
      : {
          willingness: 'only_if_required',
          maximumFeet: movementBudget,
          opportunityRisk: 'accept_if_needed',
        },
    engagement: engagement(actor, target, action),
    fallback: requiredMovement !== null && requiredMovement > actor.speedFeet
      ? {
          ...advance(actor, target),
          movement: {
            willingness: 'freely',
            maximumFeet: actor.speedFeet * 2,
            opportunityRisk: 'accept_if_needed',
          },
        }
      : advance(actor, target),
  };
}

function defensiveHold(actor: ProjectedActor): EngineTurnIntent {
  return { actorId: actor.id, ...DODGE, fallback: END_TURN };
}

function advanceIntent(
  actor: ProjectedActor,
  target: ProjectedActor,
): EngineTurnIntent {
  return { actorId: actor.id, ...advance(actor, target), fallback: DODGE };
}

function phaseDraft(
  capsule: EngineStateCapsule,
  intents: readonly EngineTurnIntent[],
): readonly EngineTurnIntent[] {
  return capsule.request?.phase === 'correction'
    ? intents.map((entry) => ({ ...entry, fallback: null }))
    : intents;
}

function basicApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  return capsule.request?.phase === 'initial' && actors.length > 0 && targets.length > 0 &&
    actors.every((actor) => attackActions(actor).length > 0);
}

function expandBasic(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  return phaseDraft(capsule, actors.map((actor) => {
    const target = targets.find((candidate) => bestAttack(actor, candidate) !== null);
    if (target === undefined) {
      const anchor = targets[0];
      return anchor === undefined ? defensiveHold(actor) : advanceIntent(actor, anchor);
    }
    const action = bestAttack(actor, target);
    return action === null ? advanceIntent(actor, target) : intent(actor, target, action);
  }));
}

function focusApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  return capsule.request?.phase === 'initial' && actors.length >= 2 && opposingTargets(capsule, actors).length > 0 &&
    actors.every((actor) => attackActions(actor).length > 0);
}

function expandFocus(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  return phaseDraft(capsule, actors.map((actor) => {
    const target = targets.find((candidate) => bestAttack(actor, candidate) !== null);
    if (target === undefined) {
      const anchor = targets[0];
      return anchor === undefined ? defensiveHold(actor) : advanceIntent(actor, anchor);
    }
    const action = bestAttack(actor, target);
    return action === null ? advanceIntent(actor, target) : intent(actor, target, action);
  }));
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
  return capsule.request?.phase === 'initial' &&
    blockerTargets(capsule, actors).some((target) => controlAction(actors, target) !== null);
}

function expandObstacle(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const target = blockerTargets(capsule, actors).find((candidate) => controlAction(actors, candidate) !== null);
  if (target === undefined) return phaseDraft(capsule, actors.map(defensiveHold));
  const controller = controlAction(actors, target);
  if (controller === null) return phaseDraft(capsule, actors.map(defensiveHold));
  return phaseDraft(capsule, actors.map((actor) => {
    if (actor.id === controller.actor.id) return intent(actor, target, controller.action);
    const action = bestAttack(actor, target);
    return action === null ? advanceIntent(actor, target) : intent(actor, target, action);
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
      description: 'Concentrate attacks on the ranked removal target and advance actors beyond the Dash horizon.',
      rank: 20,
      strategy: 'rank reachable target by hit points then reach; attack within full turn movement including dash commitment; otherwise advance at normal speed; ranged maintain range; melee close',
      applicability: focusApplicable,
      expand: expandFocus,
    }),
    definition(dependencies, {
      name: 'basic_advance',
      description: 'Each actor attacks its best reachable target or advances at normal speed toward its anchor.',
      rank: 30,
      strategy: 'per actor choose first reachable ranked target using projected path cost; commit up to dash movement; otherwise advance at normal speed; ranged maintain range; melee close',
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
