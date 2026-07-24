import type { CastingMode } from '../domain/enums';

function compareText(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function naturalParts(value: string): string[] {
  return value.match(/\d+|\D+/g) ?? [];
}

/**
 * Mirrors PHP's case-insensitive natural ordering without relying on the host's
 * locale. Original spelling is the explicit tie-breaker, so equal-looking
 * labels remain deterministic.
 */
export function compareNaturalText(left: string, right: string): number {
  const leftParts = naturalParts(left.toLowerCase());
  const rightParts = naturalParts(right.toLowerCase());
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    if (leftPart === undefined) {
      return -1;
    }
    if (rightPart === undefined) {
      return 1;
    }
    if (leftPart === rightPart) {
      continue;
    }

    const leftIsNumber = /^\d+$/.test(leftPart);
    const rightIsNumber = /^\d+$/.test(rightPart);
    if (leftIsNumber && rightIsNumber) {
      const leftNumber = Number(leftPart);
      const rightNumber = Number(rightPart);
      if (leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
      }
      if (leftPart.length !== rightPart.length) {
        return leftPart.length - rightPart.length;
      }
    }
    return compareText(leftPart, rightPart);
  }

  return compareText(left, right);
}

export interface OrderedPrintableSpell {
  readonly spell_version_id: number;
  readonly spell_identity_id: number;
  readonly name: string;
  readonly level: number;
  readonly casting_mode: CastingMode;
}

export function comparePrintableSpells(
  left: OrderedPrintableSpell,
  right: OrderedPrintableSpell,
): number {
  return (
    left.level - right.level ||
    compareText(left.name, right.name) ||
    compareText(left.casting_mode, right.casting_mode) ||
    left.spell_version_id - right.spell_version_id ||
    left.spell_identity_id - right.spell_identity_id
  );
}

export interface OrderedLongRestSpell {
  readonly spell_version_id: number;
  readonly spell_identity_id: number;
  readonly name: string;
  readonly level: number;
}

export function compareLongRestSpells(
  left: OrderedLongRestSpell,
  right: OrderedLongRestSpell,
): number {
  return (
    left.level - right.level ||
    compareText(left.name, right.name) ||
    left.spell_version_id - right.spell_version_id ||
    left.spell_identity_id - right.spell_identity_id
  );
}

export interface OrderedPrintableSourceGroup {
  readonly source: string;
}

export function comparePrintableSourceGroups(
  left: OrderedPrintableSourceGroup,
  right: OrderedPrintableSourceGroup,
): number {
  return compareNaturalText(left.source, right.source);
}
