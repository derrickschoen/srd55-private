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

const RUNTIME_VERSION = 'plays-v1-runtime-1';
const DODGE: EngineIntentBranch = {
  choice: { kind: 'dodge' },
  movement: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
  engagement: { stance: 'hold_position' },
};

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
  return [...opposingTargets(capsule, actors)].sort((left, right) =>
    right.reachFeet - left.reachFeet ||
    left.hitPoints - right.hitPoints ||
    left.id.localeCompare(right.id));
}

function distanceFeet(left: ProjectedActor, right: ProjectedActor): number {
  return Math.max(
    Math.abs(left.position.column - right.position.column),
    Math.abs(left.position.row - right.position.row),
  ) * 5;
}

function combatActions(actor: ProjectedActor): readonly ProjectedAction[] {
  return actor.actions.filter((action) =>
    (action.kind === 'attack' || action.kind === 'multiattack') && action.rangeFeet !== null);
}

function canReach(actor: ProjectedActor, target: ProjectedActor, action: ProjectedAction): boolean {
  return action.rangeFeet !== null &&
    distanceFeet(actor, target) <= action.rangeFeet + actor.movementRemainingFeet;
}

function bestAction(actor: ProjectedActor, target: ProjectedActor): ProjectedAction | null {
  const actions = [...combatActions(actor)];
  actions.sort((left, right) =>
    Number(canReach(actor, target, right)) - Number(canReach(actor, target, left)) ||
    Number(right.kind === 'multiattack') - Number(left.kind === 'multiattack') ||
    (right.rangeFeet ?? 0) - (left.rangeFeet ?? 0) ||
    left.actionId.localeCompare(right.actionId));
  return actions[0] ?? null;
}

function choice(action: ProjectedAction, target: ProjectedActor): EngineActionChoice {
  const selector = { kind: 'combatant' as const, combatantId: target.id };
  return action.kind === 'attack'
    ? { kind: 'attack', actionId: action.actionId, target: selector, resourcePolicy: 'normal' }
    : { kind: 'use_action', actionId: action.actionId, target: selector };
}

function engagement(actor: ProjectedActor, target: ProjectedActor, action: ProjectedAction): EngineEngagement {
  const selector = { kind: 'combatant' as const, combatantId: target.id };
  return action.rangeFeet !== null && action.rangeFeet > actor.reachFeet
    ? { stance: 'maintain_range', anchor: selector }
    : { stance: 'close_to_melee', anchor: selector };
}

function intent(actor: ProjectedActor, target: ProjectedActor, action: ProjectedAction): EngineTurnIntent {
  const inRange = action.rangeFeet !== null && distanceFeet(actor, target) <= action.rangeFeet;
  return {
    actorId: actor.id,
    choice: choice(action, target),
    movement: inRange || actor.movementRemainingFeet === 0
      ? { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' }
      : {
          willingness: 'only_if_required',
          maximumFeet: actor.movementRemainingFeet,
          opportunityRisk: 'accept_if_needed',
        },
    engagement: engagement(actor, target, action),
    fallback: DODGE,
  };
}

function dodge(actor: ProjectedActor): EngineTurnIntent {
  return { actorId: actor.id, ...DODGE, fallback: null };
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
  return actors.length > 0 && targets.length > 0 && actors.every((actor) => combatActions(actor).length > 0);
}

function expandBasic(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const targets = opposingTargets(capsule, actors);
  return phaseDraft(capsule, actors.map((actor) => {
    const reachable = targets.find((target) => combatActions(actor).some((action) => canReach(actor, target, action)));
    const target = reachable ?? targets[0];
    if (target === undefined) return dodge(actor);
    const action = bestAction(actor, target);
    return action === null ? dodge(actor) : intent(actor, target, action);
  }));
}

function focusApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  const target = opposingTargets(capsule, actors)[0];
  return actors.length >= 2 && target !== undefined &&
    actors.every((actor) => bestAction(actor, target) !== null);
}

function expandFocus(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const target = opposingTargets(capsule, actors)[0];
  if (target === undefined) return phaseDraft(capsule, actors.map(dodge));
  return phaseDraft(capsule, actors.map((actor) => {
    const action = bestAction(actor, target);
    return action === null ? dodge(actor) : intent(actor, target, action);
  }));
}

function controlAction(actors: readonly ProjectedActor[]): {
  readonly actor: ProjectedActor;
  readonly action: ProjectedAction;
} | null {
  const candidates = actors.flatMap((actor) => actor.actions.map((action) => ({ actor, action })));
  candidates.sort((left, right) =>
    Number(right.action.actionId.toLowerCase().includes('web')) -
      Number(left.action.actionId.toLowerCase().includes('web')) ||
    left.actor.id.localeCompare(right.actor.id) ||
    left.action.actionId.localeCompare(right.action.actionId));
  return candidates.find(({ action }) => {
    const id = action.actionId.toLowerCase();
    return id.includes('web') || id.includes('grapple') || id.includes('grab');
  }) ?? null;
}

function obstacleApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  return blockerTargets(capsule, actors).length > 0 && controlAction(actors) !== null;
}

function expandObstacle(capsule: EngineStateCapsule): readonly EngineTurnIntent[] {
  const actors = requestedActors(capsule);
  const target = blockerTargets(capsule, actors)[0];
  const controller = controlAction(actors);
  if (target === undefined || controller === null) return phaseDraft(capsule, actors.map(dodge));
  return phaseDraft(capsule, actors.map((actor) => {
    if (actor.id === controller.actor.id) return intent(actor, target, controller.action);
    const action = bestAction(actor, target);
    return action === null ? dodge(actor) : intent(actor, target, action);
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
      description: 'Control the ranked blocker with Web when available, otherwise a statblock grapple or grab.',
      rank: 10,
      strategy: 'rank blocker by reach then removal; prefer web, then grapple/grab; allies attack blocker',
      applicability: obstacleApplicable,
      expand: expandObstacle,
    }),
    definition(dependencies, {
      name: 'focus_fire',
      description: 'Concentrate every attack on the ranked best removal target while preserving each attacker’s stance.',
      rank: 20,
      strategy: 'rank target by hit points then reach; ranged maintain range; melee close',
      applicability: focusApplicable,
      expand: expandFocus,
    }),
    definition(dependencies, {
      name: 'basic_advance',
      description: 'Each actor advances only as needed and attacks its best reachable ranked target.',
      rank: 30,
      strategy: 'per actor choose first reachable ranked target; ranged maintain range; melee close',
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
