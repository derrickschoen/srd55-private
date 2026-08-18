import { ok, type Outcome, type RefusedOutcome } from './outcome';

export interface CommandTransactionHost {
  transaction<R>(callback: () => R): R;
}

type SynchronousValue<T> = T extends PromiseLike<unknown> ? never : T;

export class AsyncCommandBodyDefect extends Error {
  override readonly name = 'AsyncCommandBodyDefect' as const;

  constructor() {
    super('Command transaction bodies must return an Outcome synchronously.');
  }
}

class RefusalRollbackSignal {
  constructor(readonly outcome: RefusedOutcome) {}
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  if (
    (typeof value !== 'object' || value === null) &&
    typeof value !== 'function'
  ) {
    return false;
  }

  return 'then' in value && typeof value.then === 'function';
}

export function runCommandTransaction<T>(
  db: CommandTransactionHost,
  body: () => Outcome<SynchronousValue<T>>,
): Outcome<SynchronousValue<T>> {
  try {
    const value = db.transaction(() => {
      const outcome = body();
      if (isThenable(outcome)) {
        throw new AsyncCommandBodyDefect();
      }
      if (outcome.kind === 'refused') {
        throw new RefusalRollbackSignal(outcome);
      }
      return outcome.value;
    });

    return ok(value);
  } catch (error: unknown) {
    if (error instanceof RefusalRollbackSignal) {
      return error.outcome;
    }
    throw error;
  }
}
