import type { ProgressionType } from '../domain/enums';
import {
  isProgressionType,
  sharedCasterLevels,
} from './progression-type';

export class CasterProgressionTypeError extends TypeError {
  override readonly name = 'CasterProgressionTypeError' as const;
  constructor(
    readonly class_name: string,
    readonly progression_type: string,
  ) {
    super(
      `Unknown progression type '${progression_type}' for ${class_name}.`,
    );
  }
}

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
      throw new CasterProgressionTypeError(className, progressionType);
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
