import type { EngineStateCapsule } from '../engine-state-capsule';
import type { CombatantId, EngineActorOption, EngineTurnProposal } from '../turn-proposal';

export const PLAY_NAMES = ['remove_obstacle', 'focus_fire', 'basic_advance'] as const;
export type PlayName = (typeof PLAY_NAMES)[number];

export interface SnippetSchema<Value> {
  readonly parse: (value: unknown) => Value;
}

export interface ReservedSnippetContext {
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

export interface PlaySnippetDefinition extends SnippetBase<EngineStateCapsule, readonly EngineTurnProposal[]> {
  readonly exposure: 'play';
  readonly rank: number;
  readonly applicability: (capsule: EngineStateCapsule) => boolean;
  readonly expand: (capsule: EngineStateCapsule) => readonly EngineTurnProposal[];
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
    readonly proposals: readonly EngineTurnProposal[];
  };
}

interface RegistryDependencies {
  readonly inputSchema: SnippetSchema<EngineStateCapsule>;
  readonly outputSchema: SnippetSchema<readonly EngineTurnProposal[]>;
  readonly hash: (content: string) => string;
}

type ProjectedActor = EngineStateCapsule['projection']['combatants'][number];

const RUNTIME_VERSION = 'plays-v2-composite-options-1';

function requestedActors(capsule: EngineStateCapsule): readonly ProjectedActor[] {
  if (capsule.request === null) return [];
  const ids = new Set(capsule.request.actors);
  return capsule.projection.combatants
    .filter((actor) => ids.has(actor.id) && actor.life !== 'dead')
    .sort((left, right) => left.id.localeCompare(right.id));
}

function explicitTargetIds(option: EngineActorOption): readonly CombatantId[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) => target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [];
    }
  });
}

function isDefense(option: EngineActorOption): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' &&
    (slot.use.kind === 'dodge' || slot.use.kind === 'end_turn'));
}

function isAdvance(option: EngineActorOption): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dash');
}

function isOffense(option: EngineActorOption): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' &&
    (slot.use.kind === 'attack' || slot.use.kind === 'multiattack' || slot.use.kind === 'saving_throw'));
}

function isControl(option: EngineActorOption): boolean {
  return option.actionSlots.some((slot) => {
    const use = slot.use;
    const ids = use.kind === 'multiattack'
      ? [use.actionId, ...use.components.map((component) => component.actionId)]
      : 'actionId' in use ? [use.actionId] : [];
    return ids.some((id) => /web|grapple|grab/iu.test(id));
  });
}

function rankedTargets(capsule: EngineStateCapsule, actors: readonly ProjectedActor[]): readonly ProjectedActor[] {
  const side = actors[0]?.side;
  return capsule.projection.combatants
    .filter((actor) => actor.life !== 'dead' && actor.side !== side)
    .sort((left, right) => left.hitPoints - right.hitPoints ||
      right.reachFeet - left.reachFeet || left.id.localeCompare(right.id));
}

function chooseOption(
  actor: ProjectedActor,
  targets: readonly ProjectedActor[],
  controlOnly: boolean,
): EngineActorOption | null {
  const targetRank = new Map(targets.map((target, index) => [target.id, index] as const));
  const candidates = actor.options.filter((option) => controlOnly ? isControl(option) : isOffense(option));
  candidates.sort((left, right) => {
    const leftRank = Math.min(...explicitTargetIds(left).map((id) => targetRank.get(id) ?? Number.MAX_SAFE_INTEGER));
    const rightRank = Math.min(...explicitTargetIds(right).map((id) => targetRank.get(id) ?? Number.MAX_SAFE_INTEGER));
    const leftUses = left.actionSlots.reduce((count, slot) =>
      count + (slot.use.kind === 'multiattack' ? slot.use.components.length : 1), 0);
    const rightUses = right.actionSlots.reduce((count, slot) =>
      count + (slot.use.kind === 'multiattack' ? slot.use.components.length : 1), 0);
    return leftRank - rightRank || rightUses - leftUses || left.label.localeCompare(right.label);
  });
  return candidates[0] ?? actor.options.find(isAdvance) ?? actor.options.find(isDefense) ?? null;
}

function alternateOffense(
  actor: ProjectedActor,
  primary: EngineActorOption,
  targets: readonly ProjectedActor[],
): EngineActorOption | null {
  const primaryTargets = new Set(explicitTargetIds(primary));
  const targetRank = new Map(targets.map((target, index) => [target.id, index] as const));
  return actor.options
    .filter((option) => isOffense(option) && option.optionId !== primary.optionId &&
      explicitTargetIds(option).some((targetId) => !primaryTargets.has(targetId)))
    .sort((left, right) => {
      const leftRank = Math.min(...explicitTargetIds(left).map((id) => targetRank.get(id) ?? Number.MAX_SAFE_INTEGER));
      const rightRank = Math.min(...explicitTargetIds(right).map((id) => targetRank.get(id) ?? Number.MAX_SAFE_INTEGER));
      return leftRank - rightRank || left.label.localeCompare(right.label);
    })[0] ?? null;
}

function proposals(capsule: EngineStateCapsule, controlActorOnly: boolean): readonly EngineTurnProposal[] {
  const actors = requestedActors(capsule);
  const targets = rankedTargets(capsule, actors);
  const controllingActor = controlActorOnly
    ? actors.find((actor) => actor.options.some(isControl))?.id ?? null
    : null;
  return actors.flatMap((actor) => {
    const primary = chooseOption(actor, targets, actor.id === controllingActor);
    if (primary === null) return [];
    const fallback = capsule.request?.phase === 'correction'
      ? null
      : alternateOffense(actor, primary, targets) ?? actor.options.find((option) =>
          option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
    return [{
      actorId: actor.id,
      expectedRevision: primary.revision,
      primaryOptionId: primary.optionId,
      fallbackOptionId: fallback?.optionId ?? null,
      overrideJustification: null,
    }];
  });
}

function isInitialRoundPlan(capsule: EngineStateCapsule): boolean {
  return capsule.request?.phase === 'initial' && capsule.request.kind !== 'plan_adjustment';
}

function ordinaryApplicable(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  return isInitialRoundPlan(capsule) && actors.length > 0 && actors.every((actor) => actor.options.length > 0);
}

function hasProjectedObstacle(capsule: EngineStateCapsule): boolean {
  const actors = requestedActors(capsule);
  const side = actors[0]?.side;
  const targets = capsule.projection.combatants.filter((actor) => actor.life !== 'dead' && actor.side !== side);
  return capsule.projection.blockedCells.some((cell) => targets.some((target) =>
    Math.max(Math.abs(cell.column - target.position.column), Math.abs(cell.row - target.position.row)) <= 1));
}

function definition(
  dependencies: RegistryDependencies,
  input: {
    readonly name: PlayName;
    readonly description: string;
    readonly rank: number;
    readonly strategy: string;
    readonly applicability: (capsule: EngineStateCapsule) => boolean;
    readonly expand: (capsule: EngineStateCapsule) => readonly EngineTurnProposal[];
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
    outputSchema: 'engine-turn-proposal-v1-array',
  }));
  return Object.freeze({
    exposure: 'play', name: input.name, description: input.description, rank: input.rank,
    inputSchema: dependencies.inputSchema, outputSchema: dependencies.outputSchema,
    ctx: null, snippetHash, applicability: input.applicability, expand: input.expand,
  });
}

export function createSnippetRegistry(dependencies: RegistryDependencies): SnippetRegistry {
  const plays = Object.freeze([
    definition(dependencies, {
      name: 'remove_obstacle', description: 'Use a legal composite control sequence against an obstructing enemy.', rank: 10,
      strategy: 'prefer an engine-offered control option; retain every ordered main and bonus slot use',
      applicability: (capsule) => ordinaryApplicable(capsule) && hasProjectedObstacle(capsule) &&
        requestedActors(capsule).some((actor) => actor.options.some(isControl)),
      expand: (capsule) => proposals(capsule, true),
    }),
    definition(dependencies, {
      name: 'focus_fire', description: 'Concentrate complete executable action sequences on the ranked removal target.', rank: 20,
      strategy: 'prefer maximum legal ordered uses against the lowest-HP ranked target',
      applicability: (capsule) => ordinaryApplicable(capsule) && requestedActors(capsule).length >= 2,
      expand: (capsule) => proposals(capsule, false),
    }),
    definition(dependencies, {
      name: 'basic_advance', description: 'Select each actor’s complete legal offensive or defensive engine option.', rank: 30,
      strategy: 'prefer an offensive composite option, otherwise an offered defense',
      applicability: ordinaryApplicable,
      expand: (capsule) => proposals(capsule, false),
    }),
  ] satisfies readonly PlaySnippetDefinition[]);
  const snippetHash = dependencies.hash(JSON.stringify({
    runtime: RUNTIME_VERSION, snippets: plays.map((play) => ({ name: play.name, hash: play.snippetHash })),
  }));
  const snippetSetHash = dependencies.hash(JSON.stringify({
    exposure: 'play', enabled: plays.map((play) => `${play.name}:${play.snippetHash}`).sort(),
  }));
  return Object.freeze({
    plays, snippetHash, snippetSetHash,
    applicable(capsule: EngineStateCapsule) {
      const parsed = dependencies.inputSchema.parse(capsule);
      return plays.filter((play) => play.applicability(parsed))
        .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name))
        .slice(0, 3)
        .map((play) => ({ name: play.name as PlayName, description: play.description, snippetHash: play.snippetHash }));
    },
    expand(name: PlayName, capsule: EngineStateCapsule) {
      const parsed = dependencies.inputSchema.parse(capsule);
      const selected = plays.find((play) => play.name === name);
      if (selected === undefined) throw new RangeError(`Unknown play ${name}.`);
      if (!selected.applicability(parsed)) throw new RangeError(`PLAY_NOT_APPLICABLE:${name}`);
      return { definition: selected, proposals: dependencies.outputSchema.parse(selected.expand(parsed)) };
    },
  });
}
