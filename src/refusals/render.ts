import type {
  LevelUpPlannedGrantSource,
  LevelUpRefused,
  Refusal,
  RefusalKind,
  SpeciesLineageRefusalReason,
} from './refusal';
import type { IncompatibleRefusal } from './outcome';

type RefusalRendererTable = {
  readonly [K in RefusalKind]: (
    refusal: Extract<Refusal, { readonly kind: K }>,
  ) => string;
};

const simpleLevelUpMessages = {
  class_not_held: 'That class is not held by this character.',
  ability_increase_required: 'Choose the required ability score increase.',
  level_not_adjacent: 'The requested class level is not the next level.',
  incomplete_level_one: 'Finish level one before advancing this character.',
} as const satisfies Record<
  Exclude<LevelUpRefused['reason'], 'planned_subchoice_refused'>,
  string
>;

const speciesLineageMessages = {
  guided_species_source_missing: 'The guided species source is missing.',
  wrong_source_kind: 'The selected source is not a species source.',
  configured_choice_unavailable: 'That species lineage choice is unavailable.',
  invalid_option: 'That species lineage option is invalid.',
  invalid_spellcasting_ability: 'That spellcasting ability is invalid.',
  invalid_replaceable_spell: 'That replaceable spell is invalid.',
} as const satisfies Record<SpeciesLineageRefusalReason, string>;

function renderLevelUpSource(source: LevelUpPlannedGrantSource): string {
  switch (source.kind) {
    case 'selected_class':
      return 'selected_class';
    case 'selected_class_subclass':
      return 'selected_class_subclass';
    case 'selected_feat':
      return 'selected_feat';
    case 'existing_source':
      return `existing_source#${String(source.source_instance_id)}`;
  }
}

const refusalRenderers = {
  attunement_slots_full: (refusal) => {
    const occupants = refusal.occupants
      .map((occupant) =>
        `slot ${String(occupant.slot)}: ${occupant.name} (#${String(occupant.item_id)})`
      )
      .join(', ');
    return `All ${String(refusal.limit)} attunement slots are full (${occupants}).`;
  },
  revision_conflict: (refusal) =>
    `This character changed from revision ${String(refusal.expected)} to ${String(refusal.actual)}. Reload before trying again.`,
  character_archived: (refusal) =>
    `Character #${String(refusal.character_id)} is archived at revision ${String(refusal.current_revision)} and cannot be changed.`,
  level_up_refused: (refusal) => {
    if (refusal.reason !== 'planned_subchoice_refused') {
      return simpleLevelUpMessages[refusal.reason];
    }
    return `Level-up ${refusal.subchoice_kind} choice ${String(refusal.index)} was refused (${refusal.issue}) at ${renderLevelUpSource(refusal.locator.source)}/${refusal.locator.rule_key}/${String(refusal.locator.ordinal)}.`;
  },
  species_lineage_refused: (refusal) =>
    speciesLineageMessages[refusal.reason],
} satisfies RefusalRendererTable;

export const INCOMPATIBLE_REFUSAL_MESSAGE =
  "We couldn't do that — reloading may help.";

export function renderRefusal(
  refusal: Refusal | IncompatibleRefusal,
): string {
  if (refusal.kind === 'incompatible_refusal') {
    return INCOMPATIBLE_REFUSAL_MESSAGE;
  }
  switch (refusal.kind) {
    case 'attunement_slots_full':
      return refusalRenderers.attunement_slots_full(refusal);
    case 'revision_conflict':
      return refusalRenderers.revision_conflict(refusal);
    case 'character_archived':
      return refusalRenderers.character_archived(refusal);
    case 'level_up_refused':
      return refusalRenderers.level_up_refused(refusal);
    case 'species_lineage_refused':
      return refusalRenderers.species_lineage_refused(refusal);
  }
}
