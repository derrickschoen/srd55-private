import {
  AlgorithmController,
  type Controller,
  type ControllerDecision,
  type ControllerRequest,
} from './controllers';

/** Gives authored class actions an explicit priority without coupling scenario policy to controllers.ts. */
export class WorldObjectAlgorithmController implements Controller {
  readonly controllerKind = 'algorithm' as const;
  readonly #fallback = new AlgorithmController();

  async choose(request: ControllerRequest, signal: AbortSignal): Promise<ControllerDecision> {
    const ranked = request.legalActions.actions.flatMap((command) => {
      if (command.type !== 'use_world_object') return [];
      const object = request.visibleState.worldObjects.find((candidate) => candidate.id === command.objectId);
      const action = object?.classActions?.find((candidate) => candidate.id === command.actionId);
      const priority = action?.controllerPriority;
      return priority?.actor === request.actorId
        ? [{ command, score: priority.score }]
        : [];
    }).sort((left, right) => right.score - left.score);
    const selected = ranked[0];
    if (selected === undefined) return this.#fallback.choose(request, signal);
    return {
      requestId: request.requestId,
      encounterRevision: request.encounterRevision,
      action: selected.command,
    };
  }
}
