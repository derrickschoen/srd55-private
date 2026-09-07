import {
  normalPlacementFor,
  sizedCombatantState,
  squeezedPlacementFor,
  type CreatureSpace,
  type NormalPlacement,
  type PlacementModeFor,
  type SizedCombatantState,
  type SqueezePair,
  type SqueezePairFor,
  type SqueezedPlacement,
  type TraversalPlacement,
} from '../../src/combat/creature-space';

type Assert<Condition extends true> = Condition;
type AssertFalse<Condition extends false> = Condition;
type Exact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
        ? true
        : false
    : false;

type ExpectedSizedCombatantState =
  | { readonly effectiveSize: 'Tiny' }
  | { readonly effectiveSize: 'Small' }
  | { readonly effectiveSize: 'Medium' }
  | { readonly effectiveSize: 'Large' }
  | { readonly effectiveSize: 'Huge' }
  | { readonly effectiveSize: 'Gargantuan' };

type _SizedCombatantsAreSixDiscriminatedArms = Assert<
  Exact<SizedCombatantState, ExpectedSizedCombatantState>
>;
type _SqueezePairsAreExactlyOneCategorySmaller = Assert<
  Exact<SqueezePair,
    | { readonly actual: 'Small'; readonly sizedFor: 'Tiny' }
    | { readonly actual: 'Medium'; readonly sizedFor: 'Small' }
    | { readonly actual: 'Large'; readonly sizedFor: 'Medium' }
    | { readonly actual: 'Huge'; readonly sizedFor: 'Large' }
    | { readonly actual: 'Gargantuan'; readonly sizedFor: 'Huge' }>
>;
type _TinyHasNoSqueezePair = Assert<Exact<SqueezePairFor<'Tiny'>, never>>;
type _TinyModeHasNoSqueezedArm = Assert<
  Exact<Extract<PlacementModeFor<'Tiny'>, { readonly kind: 'squeezed' }>, never>
>;

const smallCombatant = sizedCombatantState('Small');
const mediumCombatant = sizedCombatantState('Medium');
const largeCombatant = sizedCombatantState('Large');
const smallNormal = normalPlacementFor(smallCombatant);
const mediumToSmall = squeezedPlacementFor(mediumCombatant);
const largeNormal = normalPlacementFor(largeCombatant);

type _NormalFactoryRetainsActualSize = Assert<
  Exact<typeof largeNormal, NormalPlacement<'Large'>>
>;
type _SqueezeFactoryRetainsExactPair = Assert<
  Exact<typeof mediumToSmall,
    SqueezedPlacement<{ readonly actual: 'Medium'; readonly sizedFor: 'Small' }>>
>;
type _SmallCombatantRejectsMediumToSmallMode = AssertFalse<
  typeof mediumToSmall extends PlacementModeFor<'Small'> ? true : false
>;
type _SmallNormalModeIsAcceptedForSmall = Assert<
  typeof smallNormal extends PlacementModeFor<'Small'> ? true : false
>;
type _HugeToTinyIsNotASqueezePair = AssertFalse<
  { readonly actual: 'Huge'; readonly sizedFor: 'Tiny' } extends SqueezePair
    ? true
    : false
>;

type DirectNormalPlacement = {
  readonly kind: 'normal';
  readonly actual: 'Large';
};
type _DirectNormalPlacementConstructionIsRejected = AssertFalse<
  DirectNormalPlacement extends NormalPlacement<'Large'> ? true : false
>;

type DirectSqueezedPlacement = {
  readonly kind: 'squeezed';
  readonly pair: { readonly actual: 'Large'; readonly sizedFor: 'Medium' };
};
type _DirectSqueezedPlacementConstructionIsRejected = AssertFalse<
  DirectSqueezedPlacement extends SqueezedPlacement<
    { readonly actual: 'Large'; readonly sizedFor: 'Medium' }
  >
    ? true
    : false
>;

type DirectTraversalPlacement = {
  readonly anchor: { readonly column: 2; readonly row: 3 };
  readonly mode: typeof largeNormal;
};
type _DirectTraversalPlacementConstructionIsRejected = AssertFalse<
  DirectTraversalPlacement extends TraversalPlacement<'Large', typeof largeNormal>
    ? true
    : false
>;

type DirectLargeSpace = {
  readonly actualSize: 'Large';
  readonly controlledAs: 'Large';
  readonly anchor: { readonly column: 2; readonly row: 3 };
  readonly mode: typeof largeNormal;
  readonly cells: readonly [
    { readonly column: 2; readonly row: 3 },
    { readonly column: 3; readonly row: 3 },
    { readonly column: 2; readonly row: 4 },
    { readonly column: 3; readonly row: 4 },
  ];
};
type _DirectCreatureSpaceConstructionIsRejected = AssertFalse<
  DirectLargeSpace extends CreatureSpace<'Large', typeof largeNormal> ? true : false
>;

type DuplicateLargeCells = Omit<DirectLargeSpace, 'cells'> & {
  readonly cells: readonly [
    { readonly column: 2; readonly row: 3 },
    { readonly column: 3; readonly row: 3 },
    { readonly column: 2; readonly row: 4 },
    { readonly column: 2; readonly row: 4 },
  ];
};
type _DuplicateCellsCannotConstructSpace = AssertFalse<
  DuplicateLargeCells extends CreatureSpace<'Large', typeof largeNormal> ? true : false
>;

type WrongOrderLargeCells = Omit<DirectLargeSpace, 'cells'> & {
  readonly cells: readonly [
    { readonly column: 2; readonly row: 3 },
    { readonly column: 2; readonly row: 4 },
    { readonly column: 3; readonly row: 3 },
    { readonly column: 3; readonly row: 4 },
  ];
};
type _WrongOrderCellsCannotConstructSpace = AssertFalse<
  WrongOrderLargeCells extends CreatureSpace<'Large', typeof largeNormal> ? true : false
>;

type WrongAnchorLargeCells = Omit<DirectLargeSpace, 'anchor'> & {
  readonly anchor: { readonly column: 9; readonly row: 9 };
};
type _WrongAnchorCannotConstructSpace = AssertFalse<
  WrongAnchorLargeCells extends CreatureSpace<'Large', typeof largeNormal> ? true : false
>;

export type CreatureSpaceTypeProof = [
  _SizedCombatantsAreSixDiscriminatedArms,
  _SqueezePairsAreExactlyOneCategorySmaller,
  _TinyHasNoSqueezePair,
  _TinyModeHasNoSqueezedArm,
  _NormalFactoryRetainsActualSize,
  _SqueezeFactoryRetainsExactPair,
  _SmallCombatantRejectsMediumToSmallMode,
  _SmallNormalModeIsAcceptedForSmall,
  _HugeToTinyIsNotASqueezePair,
  _DirectNormalPlacementConstructionIsRejected,
  _DirectSqueezedPlacementConstructionIsRejected,
  _DirectTraversalPlacementConstructionIsRejected,
  _DirectCreatureSpaceConstructionIsRejected,
  _DuplicateCellsCannotConstructSpace,
  _WrongOrderCellsCannotConstructSpace,
  _WrongAnchorCannotConstructSpace,
];
