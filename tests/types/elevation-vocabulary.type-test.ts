import type {
  ElevationLayout,
  ElevationTier,
  GroundElevationTier,
  HeightResolution,
  HeightSelection,
  TokenAltitude,
} from '../../src/combat/elevation';
import type {
  MovementSpeed,
  MovementSpeeds,
} from '../../src/combat/movement-speeds';

type Assert<T extends true> = T;
type AssertFalse<T extends false> = T;
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;

type _S1ArbitraryGroundTierRejected = Assert<
  Equal<GroundElevationTier, 'pit' | 'floor' | 'raised'>
>;
type _S1ElevationTierIsExactlyFourCases = Assert<
  Equal<ElevationTier, GroundElevationTier | 'flying'>
>;
type _S1FlyingCellRejected = Assert<
  Equal<ElevationLayout['regions'][number]['tier'], 'pit' | 'raised'>
>;
type _S1EmptySpeedsRejected = Assert<
  MovementSpeeds extends readonly [MovementSpeed, ...MovementSpeed[]]
    ? true
    : false
>;
type _EmptyTupleCannotBeMovementSpeeds = AssertFalse<
  readonly [] extends MovementSpeeds ? true : false
>;
type _FlyRequiresHover = Assert<
  Equal<
    Extract<MovementSpeed, { readonly kind: 'fly' }>['hover'],
    boolean
  >
>;
type _NonFlyHasNoHover = Assert<
  Equal<
    'hover' extends keyof Exclude<MovementSpeed, { readonly kind: 'fly' }>
      ? true
      : false,
    false
  >
>;
type _AltitudeDoesNotCarryCoordinates = Assert<
  Equal<TokenAltitude, { readonly kind: 'grounded' } | { readonly kind: 'flying' }>
>;
type _HeightSelectionKeepsDefaultAndOverrideDistinct = Assert<
  Equal<HeightSelection['kind'], 'project_default' | 'override'>
>;
type _HeightResolutionKeepsAbsenceTyped = Assert<
  Equal<HeightResolution['kind'], 'resolved' | 'unresolved'>
>;

export type ElevationVocabularyProof = [
  _S1ArbitraryGroundTierRejected,
  _S1ElevationTierIsExactlyFourCases,
  _S1FlyingCellRejected,
  _S1EmptySpeedsRejected,
  _EmptyTupleCannotBeMovementSpeeds,
  _FlyRequiresHover,
  _NonFlyHasNoHover,
  _AltitudeDoesNotCarryCoordinates,
  _HeightSelectionKeepsDefaultAndOverrideDistinct,
  _HeightResolutionKeepsAbsenceTyped,
];
