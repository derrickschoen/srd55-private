import {
  progressionTypes,
  type ProgressionType,
} from '../domain/enums';

export function isProgressionType(value: unknown): value is ProgressionType {
  return (
    typeof value === 'string' &&
    progressionTypes.includes(value as ProgressionType)
  );
}

export function sharedCasterLevels(
  progression: ProgressionType,
  classLevel: number,
): number {
  if (!Number.isSafeInteger(classLevel)) {
    throw new TypeError('Class level must be an integer.');
  }
  if (classLevel < 0) {
    throw new RangeError(
      `Class level cannot be negative, got ${String(classLevel)}.`,
    );
  }

  switch (progression) {
    case 'full':
      return classLevel;
    case 'half_up':
      return Math.ceil(classLevel / 2);
    case 'half_down':
      return Math.floor(classLevel / 2);
    case 'third_up':
      return Math.ceil(classLevel / 3);
    case 'third_down':
      return Math.floor(classLevel / 3);
    case 'pact':
    case 'none':
      return 0;
  }
}

export function contributesToSharedSlots(
  progression: ProgressionType,
): boolean {
  return progression !== 'pact' && progression !== 'none';
}

export function maxPreparableLevel(
  progression: ProgressionType,
  classLevel: number,
): number {
  if (!Number.isSafeInteger(classLevel)) {
    throw new TypeError('Class level must be an integer.');
  }

  switch (progression) {
    case 'full':
      return Math.min(9, Math.ceil(classLevel / 2));
    case 'half_up':
      return Math.min(5, Math.ceil(classLevel / 4));
    case 'half_down':
      return classLevel < 2 ? 0 : Math.min(5, Math.ceil(classLevel / 4));
    case 'third_up':
    case 'third_down':
      return classLevel < 3
        ? 0
        : Math.min(4, Math.floor((classLevel - 1) / 6) + 1);
    case 'pact':
      return Math.min(5, Math.max(1, Math.floor((classLevel + 1) / 2)));
    case 'none':
      return 0;
  }
}
