import { describe, expect, it } from 'vitest';
import type {
  CharacterEffectId,
  CharacterItemId,
  ContentKey,
  SourceInstanceId,
} from '../../../src/domain/ids';
import type {
  Computed,
  SourceRef,
} from '../../../src/domain/computed';
import {
  contributionSource,
  foldFeatureValues,
  type AuthoredResourceRef,
  type FeatureValueContribution,
  type FeatureValueTarget,
  type FeatureValueTargetKind,
  type OpFor,
  type ValueOf,
} from '../../../src/domain/feature-values';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false;
type Assert<Condition extends true> = Condition;

type DiceOpIsAdd = Assert<Equal<OpFor<'feature_dice_count'>, 'add'>>;
type ResourceOpIsAdd = Assert<Equal<OpFor<'resource_maximum'>, 'add'>>;
type DiceValueIsNumeric = Assert<Equal<ValueOf<'feature_dice_count'>, number>>;
type ResourceValueIsNumeric = Assert<Equal<ValueOf<'resource_maximum'>, number>>;
type ReplaceIsNotADiceOp = Assert<
  Equal<Extract<'replace', OpFor<'feature_dice_count'>>, never>
>;

const compileTimeContracts: readonly [
  DiceOpIsAdd,
  ResourceOpIsAdd,
  DiceValueIsNumeric,
  ResourceValueIsNumeric,
  ReplaceIsNotADiceOp,
] = [true, true, true, true, true];

const rogue = '2024:class:rogue' as ContentKey;
const veteran = '2024:content.subclass:veteran' as ContentKey;
const otherSubclass = '2024:content.subclass:other' as ContentKey;
const item = '2024:content.item:manual' as ContentKey;
const target = {
  kind: 'feature_dice_count',
  key: 'sneak_attack',
} as const;

function contribution(
  content: ContentKey,
  key: string,
  value: number,
  supersedes?: ReturnType<typeof contributionSource>,
): FeatureValueContribution<'feature_dice_count'> {
  return {
    source: contributionSource(content, key),
    target,
    op: 'add',
    value,
    ...(supersedes === undefined ? {} : { supersedes }),
  };
}

function resolvedValue<K extends FeatureValueTargetKind>(
  result: ReturnType<typeof foldFeatureValues<K>>,
): Computed<ValueOf<K>> {
  expect(result.kind).toBe('resolved');
  if (result.kind === 'malformed_graph') {
    throw new Error(`Unexpected graph error: ${result.error.kind}`);
  }
  return result.computed;
}

describe('kinded targets and computed terms', () => {
  it('pins OpFor and ValueOf without admitting replacement as an operation', () => {
    expect(compileTimeContracts).toEqual([true, true, true, true, true]);
  });

  it('represents both target kinds, including a resolved authored resource', () => {
    const authored: AuthoredResourceRef = {
      fact_key: '2024:content.subclass:veteran\u0000veteran-reflexes',
      display_label: 'Veteran Reflexes',
      marking_shape: 'remaining',
    };
    const targets: readonly FeatureValueTarget[] = [
      target,
      { kind: 'resource_maximum', resource: 'rage' },
      { kind: 'resource_maximum', resource: authored },
    ];
    expect(targets).toEqual([
      { kind: 'feature_dice_count', key: 'sneak_attack' },
      { kind: 'resource_maximum', resource: 'rage' },
      { kind: 'resource_maximum', resource: authored },
    ]);
  });

  it('carries both resolvable SourceRef arms and nested computed contributions with riders now', () => {
    const characterEffect: SourceRef = {
      kind: 'character_effect',
      effect_id: 7 as CharacterEffectId,
      source_instance_id: 8 as SourceInstanceId,
      character_item_id: 9 as CharacterItemId,
    };
    const nested: Computed<number> = {
      terms: [
        {
          source: characterEffect,
          op: 'add',
          contribution: 2,
          status: 'applied',
        },
      ],
      value: 2,
      riders: [],
    };
    const contributionRef = contributionSource(rogue, 'nested');
    const outer: Computed<number> = {
      terms: [
        {
          source: contributionRef,
          op: 'add',
          contribution: nested,
          status: 'applied',
        },
      ],
      value: 2,
      riders: [],
    };
    expect(outer).toEqual({
      terms: [
        {
          source: contributionRef,
          op: 'add',
          contribution: nested,
          status: 'applied',
        },
      ],
      value: 2,
      riders: [],
    });
    expect(characterEffect).toEqual({
      kind: 'character_effect',
      effect_id: 7,
      source_instance_id: 8,
      character_item_id: 9,
    });
  });
});

describe('supersession-aware feature value fold', () => {
  it('retains the victim in pipeline order and excludes it from the numeric fold', () => {
    const base = contribution(rogue, 'sneak-attack', 5);
    const deeper = contribution(veteran, 'deeper-cuts', 1);
    const strike = contribution(
      veteran,
      'veterans-strike',
      4,
      deeper.source,
    );
    const unrelated = contribution(otherSubclass, 'other', 2);

    expect(foldFeatureValues([base, deeper, strike, unrelated])).toEqual({
      kind: 'resolved',
      computed: {
        terms: [
          {
            source: base.source,
            op: 'add',
            contribution: 5,
            status: 'applied',
          },
          {
            source: deeper.source,
            op: 'add',
            contribution: 1,
            status: { superseded_by: strike.source },
          },
          {
            source: strike.source,
            op: 'add',
            contribution: 4,
            status: 'applied',
          },
          {
            source: unrelated.source,
            op: 'add',
            contribution: 2,
            status: 'applied',
          },
        ],
        value: 11,
        riders: [],
      },
    });
  });

  it('is mutation-sensitive to removing the Veteran supersedes reference', () => {
    const base = contribution(rogue, 'sneak-attack', 5);
    const deeper = contribution(veteran, 'deeper-cuts', 1);
    const withRelation = contribution(
      veteran,
      'veterans-strike',
      4,
      deeper.source,
    );
    const withoutRelation = contribution(veteran, 'veterans-strike', 4);

    expect(
      resolvedValue(foldFeatureValues([base, deeper, withRelation])).value,
    ).toBe(9);
    expect(
      resolvedValue(foldFeatureValues([base, deeper, withoutRelation])).value,
    ).toBe(10);
  });

  it('keeps pipeline-stable order across class, subclass, item, and later subclass sources', () => {
    const families = [
      contribution(rogue, 'base', 2),
      contribution(veteran, 'subclass-a', 2),
      contribution(item, 'item', 2),
      contribution(veteran, 'subclass-b', 2),
    ] as const;
    const computed = resolvedValue(foldFeatureValues(families));

    expect(computed.terms.map((term) => term.source)).toEqual([
      families[0].source,
      families[1].source,
      families[2].source,
      families[3].source,
    ]);
    expect(computed.terms.map((term) => term.contribution)).toEqual([
      2, 2, 2, 2,
    ]);
    expect(computed.value).toBe(8);
  });

  it('retains every term in a supersession chain and folds only the survivor', () => {
    const first = contribution(veteran, 'first', 1);
    const second = contribution(veteran, 'second', 2, first.source);
    const third = contribution(veteran, 'third', 3, second.source);

    expect(foldFeatureValues([first, second, third])).toEqual({
      kind: 'resolved',
      computed: {
        terms: [
          {
            source: first.source,
            op: 'add',
            contribution: 1,
            status: { superseded_by: second.source },
          },
          {
            source: second.source,
            op: 'add',
            contribution: 2,
            status: { superseded_by: third.source },
          },
          {
            source: third.source,
            op: 'add',
            contribution: 3,
            status: 'applied',
          },
        ],
        value: 3,
        riders: [],
      },
    });
  });
});

describe('supersession graph resolver errors', () => {
  it('returns the exact dangling-reference variant', () => {
    const missing = contributionSource(veteran, 'absent');
    const winner = contribution(veteran, 'winner', 2, missing);
    expect(foldFeatureValues([winner])).toEqual({
      kind: 'malformed_graph',
      error: {
        kind: 'dangling_supersession',
        source: winner.source,
        supersedes: missing,
      },
    });
  });

  it('returns the exact cross-target-reference variant', () => {
    const feature: FeatureValueContribution<FeatureValueTargetKind> = {
      source: contributionSource(veteran, 'feature'),
      target,
      op: 'add',
      value: 1,
    };
    const resource: FeatureValueContribution<FeatureValueTargetKind> = {
      source: contributionSource(veteran, 'resource'),
      target: { kind: 'resource_maximum', resource: 'rage' },
      op: 'add',
      value: 1,
      supersedes: feature.source,
    };
    expect(
      foldFeatureValues<FeatureValueTargetKind>([feature, resource]),
    ).toEqual({
      kind: 'malformed_graph',
      error: {
        kind: 'cross_target_supersession',
        source: resource.source,
        supersedes: feature.source,
      },
    });
  });

  it('returns the exact cycle variant', () => {
    const firstSource = contributionSource(veteran, 'first');
    const secondSource = contributionSource(veteran, 'second');
    const first = contribution(veteran, 'first', 1, secondSource);
    const second = contribution(veteran, 'second', 1, firstSource);

    expect(foldFeatureValues([first, second])).toEqual({
      kind: 'malformed_graph',
      error: {
        kind: 'supersession_cycle',
        sources: [first.source, second.source],
      },
    });
  });
});
