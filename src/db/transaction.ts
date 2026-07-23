import type { Database } from '@sqlite.org/sqlite-wasm';

export type TransactionMode = 'DEFERRED' | 'IMMEDIATE' | 'EXCLUSIVE';

export class TransactionRunner {
  #depth = 0;

  constructor(private readonly db: Database) {}

  get depth(): number {
    return this.#depth;
  }

  run<T>(
    callback: () => T,
    mode: TransactionMode = 'IMMEDIATE',
  ): T {
    const nested = this.#depth > 0;
    this.#depth += 1;
    try {
      return nested
        ? this.db.savepoint(callback)
        : this.db.transaction(mode, callback);
    } finally {
      this.#depth -= 1;
    }
  }
}
