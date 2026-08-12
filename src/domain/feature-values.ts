import type { ClassResourceKind } from './class-resources';
import type {
  Computed,
  ContributionKey,
  SourceRef,
  Term,
} from './computed';
import { sourceRefKey } from './computed';
import type { ContentKey } from './ids';

export const featureValueKeys = ['sneak_attack'] as const;
export type FeatureValueKey = (typeof featureValueKeys)[number];

export interface AuthoredResourceRef {
  readonly fact_key: string;
  readonly display_label: string;
  readonly marking_shape: 'boxes' | 'remaining';
}

export type FeatureValueTarget =
  | { readonly kind: 'feature_dice_count'; readonly key: FeatureValueKey }
  | {
      readonly kind: 'resource_maximum';
      readonly resource: ClassResourceKind | AuthoredResourceRef;
    };

export type FeatureValueTargetKind = FeatureValueTarget['kind'];

export type TargetFor<K extends FeatureValueTargetKind> = Extract<
  FeatureValueTarget,
  { readonly kind: K }
>;

export type OpFor<K extends FeatureValueTargetKind> = {
  readonly feature_dice_count: 'add';
  readonly resource_maximum: 'add';
}[K];

export type ValueOf<K extends FeatureValueTargetKind> = {
  readonly feature_dice_count: number;
  readonly resource_maximum: number;
}[K];

type ContributionSourceRef = Extract<
  SourceRef,
  { readonly kind: 'contribution' }
>;

export interface FeatureValueContribution<K extends FeatureValueTargetKind> {
  readonly source: ContributionSourceRef;
  readonly target: TargetFor<K>;
  readonly op: OpFor<K>;
  readonly value: ValueOf<K>;
  readonly supersedes?: ContributionSourceRef;
}

export type SupersessionGraphError =
  | {
      readonly kind: 'dangling_supersession';
      readonly source: SourceRef;
      readonly supersedes: SourceRef;
    }
  | {
      readonly kind: 'cross_target_supersession';
      readonly source: SourceRef;
      readonly supersedes: SourceRef;
    }
  | {
      readonly kind: 'supersession_cycle';
      readonly sources: readonly SourceRef[];
    };

export type FeatureValueFold<K extends FeatureValueTargetKind> =
  | { readonly kind: 'resolved'; readonly computed: Computed<ValueOf<K>> }
  | { readonly kind: 'malformed_graph'; readonly error: SupersessionGraphError };

function sameTarget(
  left: FeatureValueTarget,
  right: FeatureValueTarget,
): boolean {
  if (left.kind !== right.kind) return false;

  switch (left.kind) {
    case 'feature_dice_count':
      return right.kind === left.kind && left.key === right.key;
    case 'resource_maximum':
      if (right.kind !== left.kind) return false;
      if (
        typeof left.resource === 'string' ||
        typeof right.resource === 'string'
      ) {
        return left.resource === right.resource;
      }
      return left.resource.fact_key === right.resource.fact_key;
    /* c8 ignore next 4 -- a new target kind must define identity explicitly
       so cross-target supersession can never become plausible. */
    default: {
      const unreachable: never = left;
      throw new Error(
        `Unhandled feature value target ${String(unreachable)}.`,
      );
    }
  }
}

export function foldFeatureValues<K extends FeatureValueTargetKind>(
  contributions: readonly FeatureValueContribution<K>[],
): FeatureValueFold<K> {
  const indexed = new Map<string, FeatureValueContribution<K>>();
  for (const contribution of contributions) {
    indexed.set(sourceRefKey(contribution.source), contribution);
  }

  for (const contribution of contributions) {
    if (contribution.supersedes === undefined) continue;
    const victim = indexed.get(sourceRefKey(contribution.supersedes));
    if (victim === undefined) {
      return {
        kind: 'malformed_graph',
        error: {
          kind: 'dangling_supersession',
          source: contribution.source,
          supersedes: contribution.supersedes,
        },
      };
    }
    if (!sameTarget(contribution.target, victim.target)) {
      return {
        kind: 'malformed_graph',
        error: {
          kind: 'cross_target_supersession',
          source: contribution.source,
          supersedes: contribution.supersedes,
        },
      };
    }
  }

  for (const start of contributions) {
    const path: FeatureValueContribution<K>[] = [];
    const positions = new Map<string, number>();
    let current: FeatureValueContribution<K> | undefined = start;
    while (current !== undefined) {
      const key = sourceRefKey(current.source);
      const at = positions.get(key);
      if (at !== undefined) {
        return {
          kind: 'malformed_graph',
          error: {
            kind: 'supersession_cycle',
            sources: path.slice(at).map((entry) => entry.source),
          },
        };
      }
      positions.set(key, path.length);
      path.push(current);
      current =
        current.supersedes === undefined
          ? undefined
          : indexed.get(sourceRefKey(current.supersedes));
    }
  }

  const supersededBy = new Map<string, SourceRef>();
  for (const contribution of contributions) {
    if (contribution.supersedes !== undefined) {
      supersededBy.set(
        sourceRefKey(contribution.supersedes),
        contribution.source,
      );
    }
  }

  const terms: Term<ValueOf<K>>[] = contributions.map((contribution) => {
    const superseder = supersededBy.get(sourceRefKey(contribution.source));
    return {
      source: contribution.source,
      op: contribution.op,
      contribution: contribution.value,
      status:
        superseder === undefined
          ? 'applied'
          : { superseded_by: superseder },
    };
  });

  const value = contributions.reduce<number>(
    (total, contribution) =>
      total +
      (supersededBy.has(sourceRefKey(contribution.source))
        ? 0
        : contribution.value),
    0,
  );

  return {
    kind: 'resolved',
    computed: {
      terms,
      value,
      riders: [],
    },
  };
}

export function contributionSource(
  content_key: ContentKey,
  contribution_key: ContributionKey,
): ContributionSourceRef {
  return { kind: 'contribution', content_key, contribution_key };
}
