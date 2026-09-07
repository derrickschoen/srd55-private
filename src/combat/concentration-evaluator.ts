import type { GridCell } from './grid';
import { persistentAreaTouchesSpace, type PersistentArea } from './persistent-areas';
import type { CombatantId, EncounterEffectId, PersistentAreaId } from './values';

export const CONCENTRATION_INTEL_POLICY = 'concentration-intel-v2' as const;

export type ConcentrationSubject =
  | {
      readonly kind: 'encounter_effect';
      readonly id: EncounterEffectId;
      readonly label: string;
    }
  | {
      readonly kind: 'persistent_area';
      readonly id: PersistentAreaId;
      readonly label: string;
    };

export interface CandidateConcentrationSpell {
  readonly spellId: string;
  readonly requiresConcentration: boolean;
}

export type ConcentrationCasterState = 'active' | 'incapacitated' | 'unconscious' | 'dead' | 'unresolved';

export type ConcentrationDamageInput =
  | { readonly kind: 'none' }
  | { readonly kind: 'damage'; readonly amount: number }
  | { readonly kind: 'unresolved' };

export interface RepresentedZone {
  readonly area: PersistentArea;
  /** Required for an anchored area; fixed areas intentionally use null. */
  readonly anchorCells: readonly GridCell[] | null;
}

export interface StatedPositionChange {
  readonly combatantId: CombatantId;
  readonly from: readonly [GridCell, ...GridCell[]];
  readonly to: readonly [GridCell, ...GridCell[]];
}

export interface RepresentedZonePositions {
  readonly grid: {
    readonly bounds: { readonly columns: number; readonly rows: number };
    readonly blockedCells: readonly GridCell[];
  };
  readonly zones: readonly RepresentedZone[];
  readonly movements: readonly StatedPositionChange[];
}

export interface ConcentrationZoneEvaluationInput {
  readonly caster: {
    readonly id: CombatantId;
    /** The complete Constitution save modifier, including proficiency where applicable. */
    readonly constitutionSaveBonus: number | null;
    readonly state: ConcentrationCasterState;
  };
  readonly candidate: CandidateConcentrationSpell;
  /** Null is deliberately distinct from an empty known set. */
  readonly existingConcentration: readonly ConcentrationSubject[] | null;
  readonly damage: ConcentrationDamageInput;
  /** Null means zone state or positions are not mechanically represented here. */
  readonly zones: RepresentedZonePositions | null;
}

export type ConcentrationStartVerdict =
  | {
      readonly status: 'resolved';
      readonly kind: 'does_not_start_concentration';
      readonly dropped: null;
    }
  | {
      readonly status: 'resolved';
      readonly kind: 'starts_concentration';
      readonly dropped: readonly ConcentrationSubject[];
    }
  | {
      readonly status: 'unresolved';
      readonly reason: 'existing_concentration_not_represented';
    };

export type ConcentrationDamageVerdict =
  | { readonly status: 'not_applicable' }
  | { readonly status: 'unresolved'; readonly reason: 'damage_not_mechanically_represented' }
  | { readonly status: 'unresolved'; readonly reason: 'constitution_save_bonus_unknown' }
  | {
      readonly status: 'resolved';
      readonly damage: number;
      readonly dc: number;
      readonly saveBonus: number;
      readonly success: { readonly numerator: number; readonly denominator: 20 };
      readonly failure: { readonly numerator: number; readonly denominator: 20 };
    };

export type ConcentrationStateVerdict =
  | { readonly status: 'not_applicable' }
  | { readonly status: 'resolved'; readonly kind: 'maintained' }
  | {
      readonly status: 'resolved';
      readonly kind: 'ends';
      readonly reason: 'incapacitated_or_dead';
    }
  | { readonly status: 'unresolved'; readonly reason: 'caster_state_not_mechanically_represented' };

export type ZoneMembershipDelta =
  | {
      readonly status: 'resolved';
      readonly areaId: PersistentAreaId;
      readonly membersBefore: readonly CombatantId[];
      readonly membersAfter: readonly CombatantId[];
      readonly entered: readonly CombatantId[];
      readonly exited: readonly CombatantId[];
    }
  | {
      readonly status: 'unresolved';
      readonly areaId: PersistentAreaId;
      readonly reason: 'zone_anchor_position_not_represented';
    };

export type ZoneCoverageVerdict =
  | { readonly status: 'unresolved'; readonly reason: 'zone_state_not_mechanically_represented' }
  | { readonly status: 'resolved'; readonly deltas: readonly ZoneMembershipDelta[] };

export interface ConcentrationZoneEvaluation {
  readonly policy: typeof CONCENTRATION_INTEL_POLICY;
  readonly start: ConcentrationStartVerdict;
  readonly breakRisk: {
    readonly damage: ConcentrationDamageVerdict;
    readonly casterState: ConcentrationStateVerdict;
  };
  readonly zones: ZoneCoverageVerdict;
}

function compareCombatantIds(left: CombatantId, right: CombatantId): number {
  return String(left).localeCompare(String(right));
}

function sortedUnique(ids: readonly CombatantId[]): readonly CombatantId[] {
  return [...new Set(ids)].sort(compareCombatantIds);
}

function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function concentrationDamageVerdict(
  candidate: CandidateConcentrationSpell,
  damage: ConcentrationDamageInput,
  saveBonus: number | null,
): ConcentrationDamageVerdict {
  if (!candidate.requiresConcentration || damage.kind === 'none') return { status: 'not_applicable' };
  if (damage.kind === 'unresolved') {
    return { status: 'unresolved', reason: 'damage_not_mechanically_represented' };
  }
  if (saveBonus === null) {
    return { status: 'unresolved', reason: 'constitution_save_bonus_unknown' };
  }
  if (!isNonNegativeSafeInteger(damage.amount) || !Number.isSafeInteger(saveBonus)) {
    throw new RangeError('Concentration damage and Constitution save bonus must be safe integers.');
  }

  // SRD 5.2.1, docs/srd/full/srd-5.2.1.txt:11516-11522: DC is max(10, floor(damage / 2)), capped at 30.
  const dc = Math.min(30, Math.max(10, Math.floor(damage.amount / 2)));
  const successfulFaces = Math.max(0, Math.min(20, 21 - (dc - saveBonus)));
  return {
    status: 'resolved',
    damage: damage.amount,
    dc,
    saveBonus,
    success: { numerator: successfulFaces, denominator: 20 },
    failure: { numerator: 20 - successfulFaces, denominator: 20 },
  };
}

function concentrationStateVerdict(
  candidate: CandidateConcentrationSpell,
  casterState: ConcentrationCasterState,
): ConcentrationStateVerdict {
  if (!candidate.requiresConcentration) return { status: 'not_applicable' };
  switch (casterState) {
    case 'active': return { status: 'resolved', kind: 'maintained' };
    case 'incapacitated':
    case 'unconscious':
    case 'dead': return { status: 'resolved', kind: 'ends', reason: 'incapacitated_or_dead' };
    case 'unresolved':
      return { status: 'unresolved', reason: 'caster_state_not_mechanically_represented' };
  }
}

function zoneDelta(zone: RepresentedZone, positions: RepresentedZonePositions): ZoneMembershipDelta {
  if (zone.area.origin.kind !== 'fixed' && zone.anchorCells === null) {
    return {
      status: 'unresolved', areaId: zone.area.id, reason: 'zone_anchor_position_not_represented',
    };
  }
  const membersBefore: CombatantId[] = [];
  const membersAfter: CombatantId[] = [];
  for (const movement of positions.movements) {
    if (persistentAreaTouchesSpace(zone.area, movement.from, zone.anchorCells, positions.grid)) {
      membersBefore.push(movement.combatantId);
    }
    if (persistentAreaTouchesSpace(zone.area, movement.to, zone.anchorCells, positions.grid)) {
      membersAfter.push(movement.combatantId);
    }
  }
  const before = sortedUnique(membersBefore);
  const after = sortedUnique(membersAfter);
  return {
    status: 'resolved',
    areaId: zone.area.id,
    membersBefore: before,
    membersAfter: after,
    entered: after.filter((id) => !before.includes(id)),
    exited: before.filter((id) => !after.includes(id)),
  };
}

function zoneCoverageVerdict(zones: RepresentedZonePositions | null): ZoneCoverageVerdict {
  if (zones === null) return { status: 'unresolved', reason: 'zone_state_not_mechanically_represented' };
  return { status: 'resolved', deltas: zones.zones.map((zone) => zoneDelta(zone, zones)) };
}

export function evaluateConcentrationZoneIntel(
  input: ConcentrationZoneEvaluationInput,
): ConcentrationZoneEvaluation {
  const start: ConcentrationStartVerdict = !input.candidate.requiresConcentration
    ? { status: 'resolved', kind: 'does_not_start_concentration', dropped: null }
    : input.existingConcentration === null
      ? { status: 'unresolved', reason: 'existing_concentration_not_represented' }
      : { status: 'resolved', kind: 'starts_concentration', dropped: input.existingConcentration };
  return {
    policy: CONCENTRATION_INTEL_POLICY,
    start,
    breakRisk: {
      damage: concentrationDamageVerdict(input.candidate, input.damage, input.caster.constitutionSaveBonus),
      casterState: concentrationStateVerdict(input.candidate, input.caster.state),
    },
    zones: zoneCoverageVerdict(input.zones),
  };
}
