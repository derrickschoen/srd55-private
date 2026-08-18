import {
  assertMintedRefusal,
  type Refusal,
} from './refusal';

/**
 * Bump when an existing refusal's parameters change incompatibly or an arm is
 * removed. Adding an arm does not bump: older clients use the unknown-kind
 * fallback for that case.
 */
export const REFUSALS_WIRE_VERSION = 1;

export interface OkOutcome<T> {
  readonly kind: 'ok';
  readonly value: T;
}

export interface RefusedOutcome {
  readonly kind: 'refused';
  readonly wire_version: number;
  readonly refusal: Refusal;
}

export type Outcome<T> = OkOutcome<T> | RefusedOutcome;
export type KnownOutcome<T> = Outcome<T>;

export interface IncompatibleRefusal {
  readonly kind: 'incompatible_refusal';
  readonly wire_version: number | null;
}

export function ok<T>(value: T): OkOutcome<T> {
  return { kind: 'ok', value };
}

export function refused(refusal: Refusal): RefusedOutcome {
  assertMintedRefusal(refusal);
  return {
    kind: 'refused',
    wire_version: REFUSALS_WIRE_VERSION,
    refusal,
  };
}
