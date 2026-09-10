export type MutationReservation =
  | { readonly reserved: true }
  | { readonly reserved: false; readonly code: 'DUPLICATE_MUTATION' };

/** A request-id ledger whose lifetime is exactly one logical encounter session. */
export class MutationLedger {
  readonly #ids = new Set<string>();
  #disposed = false;

  constructor(readonly sessionId: string) {}

  reserve(id: string): MutationReservation {
    if (this.#disposed || this.#ids.has(id)) {
      return { reserved: false, code: 'DUPLICATE_MUTATION' };
    }
    this.#ids.add(id);
    return { reserved: true };
  }

  has(id: string): boolean {
    return this.#ids.has(id);
  }

  dispose(): void {
    this.#disposed = true;
    this.#ids.clear();
  }
}

export interface LogicalSessionService {
  readonly sessionId: string;
  close(): void;
}

const authorities = new Map<string, LogicalSessionAuthority>();

/** Owns mutation identity and authoritative destruction across every client binding. */
export class LogicalSessionAuthority {
  readonly ledger: MutationLedger;
  readonly #services = new Set<LogicalSessionService>();
  #destroyed = false;

  private constructor(readonly sessionId: string) {
    this.ledger = new MutationLedger(sessionId);
  }

  static for(service: LogicalSessionService): LogicalSessionAuthority {
    const sessionId = String(service.sessionId);
    const existing = authorities.get(sessionId);
    if (existing !== undefined) {
      existing.attach(service);
      return existing;
    }
    const created = new LogicalSessionAuthority(sessionId);
    created.attach(service);
    authorities.set(sessionId, created);
    return created;
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  attach(service: LogicalSessionService): void {
    if (String(service.sessionId) !== this.sessionId) {
      throw new TypeError('A logical session authority cannot bind a different session id.');
    }
    if (this.#destroyed) throw new Error('The logical session was destroyed.');
    this.#services.add(service);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.ledger.dispose();
    for (const service of this.#services) service.close();
    this.#services.clear();
    if (authorities.get(this.sessionId) === this) authorities.delete(this.sessionId);
  }
}
