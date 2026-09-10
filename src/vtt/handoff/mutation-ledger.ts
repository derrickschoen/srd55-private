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
