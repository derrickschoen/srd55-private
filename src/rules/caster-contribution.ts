import type { ProgressionType } from '../domain/enums';
import {
  isProgressionType,
  sharedCasterLevels,
} from './progression-type';

export class CasterContribution {
  static readonly FULL = 'full';
  static readonly HALF_UP = 'half_up';
  static readonly HALF_DOWN = 'half_down';
  static readonly THIRD_UP = 'third_up';
  static readonly THIRD_DOWN = 'third_down';
  static readonly PACT = 'pact';
  static readonly NONE = 'none';

  readonly progression: ProgressionType;
  readonly progressionType: ProgressionType;

  constructor(
    readonly className: string,
    readonly classLevel: number,
    progressionType: ProgressionType | string,
  ) {
    if (!isProgressionType(progressionType)) {
      throw new TypeError(
        `Unknown progression type '${progressionType}' for ${className}.`,
      );
    }

    this.progression = progressionType;
    this.progressionType = progressionType;

    // The progression calculation owns and checks the shared level invariant.
    sharedCasterLevels(this.progression, classLevel);
  }

  casterLevels(): number {
    return sharedCasterLevels(this.progression, this.classLevel);
  }

  isPactCaster(): boolean {
    return this.progression === CasterContribution.PACT;
  }
}
