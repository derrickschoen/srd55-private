export interface AuthoringEditGeneration {
  readonly generation: number;
  readonly dirty: boolean;
  edit(): void;
  replaceWithSaved(): void;
  publish(): void;
  capture(): number;
  isCurrent(generation: number): boolean;
  acceptSave(generation: number): boolean;
}

/**
 * Tracks which in-memory draft generation an asynchronous result belongs to.
 * A save always advances the stored revision at its caller, but only the
 * generation it captured may replace local document state or clear dirty.
 */
export function createAuthoringEditGeneration(): AuthoringEditGeneration {
  let generation = 0;
  let dirty = false;
  return {
    get generation() { return generation; },
    get dirty() { return dirty; },
    edit: () => {
      generation += 1;
      dirty = true;
    },
    replaceWithSaved: () => {
      generation += 1;
      dirty = false;
    },
    publish: () => {
      dirty = false;
    },
    capture: () => generation,
    isCurrent: (captured) => generation === captured,
    acceptSave: (captured) => {
      if (generation !== captured) return false;
      dirty = false;
      return true;
    },
  };
}
