import { MemoryBrowserSessionStore } from '../session-persistence';

/** A deliberately page-lifetime-only Worker store. Reloading creates a new instance. */
export class NamedWorkerMemorySessionStore extends MemoryBrowserSessionStore {
  constructor(readonly name: string) {
    super();
  }

  override async flush(): Promise<void> {
    // Memory is already authoritative inside this named, page-lifetime session.
  }
}
