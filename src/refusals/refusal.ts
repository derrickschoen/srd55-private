import type { AttunementSlot } from '../domain/attunement';
import type {
  CharacterId,
  CharacterItemId,
  CharacterRevision,
  GrantOrdinal,
  GrantRuleKey,
  SourceInstanceId,
} from '../domain/ids';

export type CloneSafeJson =
  | null
  | boolean
  | number
  | string
  | { readonly [key: string]: CloneSafeJson }
  | readonly CloneSafeJson[];

export type LevelUpRefusalReason =
  | 'class_not_held'
  | 'ability_increase_required'
  | 'level_not_adjacent'
  | 'incomplete_level_one'
  | 'planned_subchoice_refused';

export type LevelUpSubchoiceRefusalIssue =
  | 'locator_not_found'
  | 'source_not_available'
  | 'expected_unfilled'
  | 'expected_filled'
  | 'grant_not_found'
  | 'grant_already_filled'
  | 'skill_not_in_pool'
  | 'skill_already_held'
  | 'skill_not_proficient'
  | 'skill_already_has_expertise'
  | 'spell_not_eligible';

export type LevelUpSubchoiceKind = 'skill' | 'expertise' | 'spell';

export type LevelUpPlannedGrantSource =
  | { readonly kind: 'selected_class' }
  | { readonly kind: 'selected_class_subclass' }
  | { readonly kind: 'selected_feat' }
  | {
      readonly kind: 'existing_source';
      readonly source_instance_id: SourceInstanceId;
    };

export interface LevelUpPlannedGrantLocator {
  readonly source: LevelUpPlannedGrantSource;
  readonly rule_key: GrantRuleKey;
  readonly ordinal: GrantOrdinal;
}

export type LevelUpRefusalDetails =
  | {
      readonly reason: Exclude<
        LevelUpRefusalReason,
        'planned_subchoice_refused'
      >;
    }
  | {
      readonly reason: 'planned_subchoice_refused';
      readonly subchoice_kind: LevelUpSubchoiceKind;
      readonly index: number;
      readonly issue: LevelUpSubchoiceRefusalIssue;
      readonly locator: LevelUpPlannedGrantLocator;
    };

export type SpeciesLineageRefusalReason =
  | 'guided_species_source_missing'
  | 'wrong_source_kind'
  | 'configured_choice_unavailable'
  | 'invalid_option'
  | 'invalid_spellcasting_ability'
  | 'invalid_replaceable_spell';

export interface AttunementSlotsFullRefusal {
  readonly kind: 'attunement_slots_full';
  readonly limit: number;
  readonly occupants: readonly {
    readonly slot: AttunementSlot;
    readonly item_id: CharacterItemId;
    readonly name: string;
  }[];
}

export interface RevisionConflictRefusal {
  readonly kind: 'revision_conflict';
  readonly expected: CharacterRevision;
  readonly actual: CharacterRevision;
}

export interface CharacterArchivedRefusal {
  readonly kind: 'character_archived';
  readonly character_id: CharacterId;
  readonly current_revision: CharacterRevision;
}

export type LevelUpRefused = { readonly kind: 'level_up_refused' }
  & LevelUpRefusalDetails;

export interface SpeciesLineageRefused {
  readonly kind: 'species_lineage_refused';
  readonly reason: SpeciesLineageRefusalReason;
}

export type Refusal =
  | AttunementSlotsFullRefusal
  | RevisionConflictRefusal
  | CharacterArchivedRefusal
  | LevelUpRefused
  | SpeciesLineageRefused;

export type RefusalKind = Refusal['kind'];

const mintedRefusals = new WeakSet<object>();

export class UnmintedRefusalDefect extends Error {
  override readonly name = 'UnmintedRefusalDefect' as const;

  constructor() {
    super('A refusal must be constructed by its exact factory.');
  }
}

function mint<R extends Refusal>(refusal: R): R {
  mintedRefusals.add(refusal);
  return refusal;
}

export function assertMintedRefusal(refusal: Refusal): void {
  if (!mintedRefusals.has(refusal)) {
    throw new UnmintedRefusalDefect();
  }
}

export function attunementSlotsFullRefusal(
  limit: number,
  occupants: AttunementSlotsFullRefusal['occupants'],
): AttunementSlotsFullRefusal {
  const refusal = {
    kind: 'attunement_slots_full',
    limit,
    occupants: occupants.map((occupant) => ({
      slot: occupant.slot,
      item_id: occupant.item_id,
      name: occupant.name,
    })),
  } as const satisfies AttunementSlotsFullRefusal & CloneSafeJson;
  return mint(refusal);
}

export function revisionConflictRefusal(
  expected: CharacterRevision,
  actual: CharacterRevision,
): RevisionConflictRefusal {
  const refusal = {
    kind: 'revision_conflict',
    expected,
    actual,
  } as const satisfies RevisionConflictRefusal & CloneSafeJson;
  return mint(refusal);
}

export function characterArchivedRefusal(
  characterId: CharacterId,
  currentRevision: CharacterRevision,
): CharacterArchivedRefusal {
  const refusal = {
    kind: 'character_archived',
    character_id: characterId,
    current_revision: currentRevision,
  } as const satisfies CharacterArchivedRefusal & CloneSafeJson;
  return mint(refusal);
}

function cloneLevelUpSource(
  source: LevelUpPlannedGrantSource,
): LevelUpPlannedGrantSource {
  switch (source.kind) {
    case 'selected_class':
      return { kind: 'selected_class' };
    case 'selected_class_subclass':
      return { kind: 'selected_class_subclass' };
    case 'selected_feat':
      return { kind: 'selected_feat' };
    case 'existing_source':
      return {
        kind: 'existing_source',
        source_instance_id: source.source_instance_id,
      };
  }
}

export function levelUpRefused(
  details: LevelUpRefusalDetails,
): LevelUpRefused {
  if (details.reason !== 'planned_subchoice_refused') {
    const refusal = {
      kind: 'level_up_refused',
      reason: details.reason,
    } as const satisfies LevelUpRefused & CloneSafeJson;
    return mint(refusal);
  }

  const refusal = {
    kind: 'level_up_refused',
    reason: details.reason,
    subchoice_kind: details.subchoice_kind,
    index: details.index,
    issue: details.issue,
    locator: {
      source: cloneLevelUpSource(details.locator.source),
      rule_key: details.locator.rule_key,
      ordinal: details.locator.ordinal,
    },
  } as const satisfies LevelUpRefused & CloneSafeJson;
  return mint(refusal);
}

export function speciesLineageRefused(
  reason: SpeciesLineageRefusalReason,
): SpeciesLineageRefused {
  const refusal = {
    kind: 'species_lineage_refused',
    reason,
  } as const satisfies SpeciesLineageRefused & CloneSafeJson;
  return mint(refusal);
}
