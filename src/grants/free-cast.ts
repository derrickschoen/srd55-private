import type {
  FreeCastPoolScope,
  FreeCastRecovery,
} from '../domain/enums';

export interface FreeCastObject {
  readonly uses: number;
  readonly recovery: FreeCastRecovery;
  readonly pool_scope: FreeCastPoolScope;
}

export class FreeCast {
  constructor(
    readonly uses: number,
    readonly recovery: FreeCastRecovery,
    readonly poolScope: FreeCastPoolScope,
  ) {
    if (!Number.isSafeInteger(uses) || uses < 1) {
      throw new RangeError('Free-cast uses must be positive.');
    }
  }

  toObject(): FreeCastObject {
    return {
      uses: this.uses,
      recovery: this.recovery,
      pool_scope: this.poolScope,
    };
  }

  toJSON(): FreeCastObject {
    return this.toObject();
  }
}
