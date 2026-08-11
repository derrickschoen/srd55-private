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

/** No conditional rider shape ships in tranche 1. */
export type ConditionalRider = never;

export interface Term<K> {
  readonly source: SourceRef;
  readonly op: 'add';
  readonly contribution: K | Computed<K>;
  readonly status: 'applied' | { readonly superseded_by: SourceRef };
}

export interface Computed<K> {
  readonly terms: readonly Term<K>[];
  readonly value: K;
  readonly riders: readonly ConditionalRider[];
}
