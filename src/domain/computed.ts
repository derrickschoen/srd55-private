import type {
  CharacterEffectId,
  CharacterItemId,
  ContentKey,
  SourceInstanceId,
} from './ids';

export type ContributionKey = string;

export type SourceRef =
  | {
      readonly kind: 'contribution';
      readonly content_key: ContentKey;
      readonly contribution_key: ContributionKey;
    }
  | {
      readonly kind: 'character_effect';
      readonly effect_id: CharacterEffectId;
      readonly source_instance_id?: SourceInstanceId;
      readonly character_item_id?: CharacterItemId;
    };

/** Stable in-memory identity for one resolvable source reference. */
export function sourceRefKey(source: SourceRef): string {
  switch (source.kind) {
    case 'contribution':
      return `${source.content_key}\u0000${source.contribution_key}`;
    case 'character_effect':
      return `character_effect\u0000${String(source.effect_id)}`;
  }
}

/** No conditional rider shape ships in tranche 1. */
export type ConditionalRider = never;

export type TermOperation = 'add' | 'set_if_higher';

export type TermStatusFor<O extends TermOperation> =
  O extends 'add'
    ? 'applied' | { readonly superseded_by: SourceRef }
    : O extends 'set_if_higher'
      ?
          | 'applied'
          | 'applied_equal'
          | 'floored_by_increased_score'
          | { readonly superseded_by: SourceRef }
      : never;

export interface Term<K, O extends TermOperation = 'add'> {
  readonly source: SourceRef;
  readonly op: O;
  readonly contribution: K | Computed<K, O>;
  readonly status: TermStatusFor<O>;
}

export interface Computed<K, O extends TermOperation = 'add'> {
  readonly terms: readonly Term<K, O>[];
  readonly value: K;
  readonly riders: readonly ConditionalRider[];
}
