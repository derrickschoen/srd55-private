import {
  LIBRARY_EXPORT_FORMAT,
  LIBRARY_EXPORT_VERSION,
  type LibraryExportDocument,
} from '../../src/backup/portable-content';
import {
  applyGuidedOrigin,
  createGuidedCharacter,
  listGuidedClassOptions,
} from '../../src/builder/guided-creation';
import { AllocateAbilitiesCommand } from '../../src/commands/allocate-abilities';
import { CharacterCommandExecutor } from '../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../src/commands/integrity';
import type { SpeciesProjectorAggregateV2 } from '../../src/catalog/authored-content-projector-contract-v2';
import {
  CONTENT_FINGERPRINT_SCHEME_V2,
  deriveContentIdentityV2,
} from '../../src/catalog/content-identity';
import {
  projectSpeciesContentAggregateV2,
} from '../../src/catalog/stored-authored-content-projector-v1';
import {
  projectStoredPortableContentV2,
} from '../../src/catalog/stored-content-projector-v2';
import type { DatabaseContext } from '../../src/db/database';
import type { ContentKey } from '../../src/domain/ids';
import { speciesRuleSemanticCountFromJson } from './species-rule-census';

export const PORTABLE_ELF_KEY =
  '2024:example.test.species:portable-elf' as ContentKey;
export const OVERSIZED_PORTABLE_ELF_KEY =
  '2024:example.test.species:oversized-portable-elf' as ContentKey;
export const CHOSEN_HIGH_ELF_CANTRIP_KEY = '2024:mage-hand';

function operation(suffix: number): string {
  return `00000000-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
}

function entropy(length: number): string {
  let seed = 0x51f15e;
  let output = '';
  for (let index = 0; index < length; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    output += String.fromCharCode(33 + (Math.abs(seed) % 94));
  }
  return output;
}

export function portableElfLibraryDocument(
  db: DatabaseContext,
  options: {
    readonly contentKey?: ContentKey;
    readonly name?: string;
    readonly oversized?: boolean;
  } = {},
): LibraryExportDocument {
  const contentKey = options.contentKey ?? PORTABLE_ELF_KEY;
  const name = options.name ?? 'Portable Elf';
  const stored = projectStoredPortableContentV2(
    db,
    'species',
    '2024:species:elf' as ContentKey,
  );
  const aggregate = {
    ...structuredClone(stored.aggregate as SpeciesProjectorAggregateV2),
    name,
    reference_text: options.oversized === true
      ? entropy(180_000)
      : 'A portable configured-choice species.',
  } as SpeciesProjectorAggregateV2;
  const projected = projectSpeciesContentAggregateV2(aggregate);
  const identity = deriveContentIdentityV2({
    kind: 'species',
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projected.payload,
  });
  return {
    format: LIBRARY_EXPORT_FORMAT,
    version: LIBRARY_EXPORT_VERSION,
    exported_at: '2042-08-09T00:00:00.000Z',
    selection: 'selected',
    selected_content_keys: [contentKey],
    content: [{
      kind: 'species',
      content_key: contentKey,
      key_kind: 'asserted',
      fingerprint_scheme: CONTENT_FINGERPRINT_SCHEME_V2,
      fingerprint_digest: identity.digest,
      aggregate,
      provenance: {
        origin_kind: 'authored_here',
        received: false,
        local_derivation: false,
      },
    }],
    supersessions: [],
  };
}

export async function createLevelFiveHighElf(
  db: DatabaseContext,
  speciesContentKey: ContentKey = '2024:species:elf' as ContentKey,
  name = 'Portable High Elf',
): Promise<number> {
  const classOption = listGuidedClassOptions(db)[0];
  if (classOption === undefined) {
    throw new Error('The production class catalogue is empty.');
  }
  const integrity = new CharacterCommandIntegrity(
    'species-lineage-portability-test-key',
  );
  const characterId = createGuidedCharacter(db, {
    name,
    class_content_key: classOption.content_key,
  }, integrity).id;
  new AllocateAbilitiesCommand(db, {
    type: 'allocate_abilities',
    method: 'standard_array',
    scores: {
      strength: 15,
      dexterity: 14,
      constitution: 13,
      intelligence: 12,
      wisdom: 10,
      charisma: 8,
    },
  }).apply(characterId);
  applyGuidedOrigin(db, {
    character_id: characterId,
    kind: 'species',
    content_key: speciesContentKey,
  });
  const executor = new CharacterCommandExecutor(db, integrity);
  const classDefinitionId = db.scalar<number>(
    'SELECT id FROM class_definitions WHERE content_key = ?',
    [classOption.content_key],
  );
  if (classDefinitionId === null) {
    throw new Error('The production class option has no definition row.');
  }
  await executor.execute({
    character_id: characterId,
    operation_uuid: operation(1),
    expected_revision: 0,
    command: {
      type: 'choose_species_lineage',
      chosen_option: 'High Elf',
      spellcasting_ability: 'intelligence',
      replaceable_spell_version_key: CHOSEN_HIGH_ELF_CANTRIP_KEY,
    },
  });
  for (const targetLevel of [2, 3, 4, 5] as const) {
    await executor.execute({
      character_id: characterId,
      operation_uuid: operation(targetLevel),
      expected_revision: targetLevel - 1,
      command: {
        type: 'level_up_class',
        class_definition_id: classDefinitionId,
        target_level: targetLevel,
        ...(targetLevel === 4
          ? {
              feat_choice: {
                kind: 'feat' as const,
                feat_content_key: '2024:feat:ability-score-improvement',
                config: {},
                ability_increases: [{
                  ability: 'strength' as const,
                  amount: 2 as const,
                }],
              },
            }
          : {}),
      },
    });
  }
  return characterId;
}

export function lineagePortabilityProjection(
  db: DatabaseContext,
  characterId: number,
): {
  readonly config: unknown;
  readonly slots: readonly Record<string, unknown>[];
} {
  const config = db.scalar<string>(
    `SELECT config FROM character_source_instances
     WHERE character_id = ? AND source_type = 'species'
       AND source_definition_id IS NOT NULL AND state = 'active'
     ORDER BY id LIMIT 1`,
    [characterId],
  );
  if (config === null) {
    throw new Error('The portable character has no active guided species source.');
  }
  return {
    config: JSON.parse(config),
    slots: db.allRaw(
      `SELECT slot.rule_key, slot.ordinal, slot.bucket, slot.state,
              CASE WHEN slot.current_spell_version_id IS NULL
                THEN 'fixed' ELSE 'chosen' END AS assignment,
              COALESCE(chosen.display_name, fixed.display_name) AS spell_name
       FROM spell_selection_slots AS slot
       JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       LEFT JOIN spell_versions AS chosen
         ON chosen.id = slot.current_spell_version_id
       LEFT JOIN spell_versions AS fixed
         ON fixed.id = slot.fixed_spell_version_id
       WHERE source.character_id = ? AND source.source_type = 'species'
         AND source.source_definition_id IS NOT NULL
         AND source.state = 'active'
       ORDER BY slot.rule_key, slot.ordinal`,
      [characterId],
    ),
  };
}

export const EXPECTED_LEVEL_FIVE_HIGH_ELF = Object.freeze({
  config: {
    source_content_key: PORTABLE_ELF_KEY,
    lineage: {
      chosen_option: 'High Elf',
      high_elf_cantrip: CHOSEN_HIGH_ELF_CANTRIP_KEY,
    },
    spellcasting_ability: 'intelligence',
  },
  slots: [
    {
      rule_key: 'elf-lineage-high-elf-detect-magic',
      ordinal: 1,
      bucket: 'prepared',
      state: 'active',
      assignment: 'fixed',
      spell_name: 'Detect Magic',
    },
    {
      rule_key: 'elf-lineage-high-elf-misty-step',
      ordinal: 1,
      bucket: 'prepared',
      state: 'active',
      assignment: 'fixed',
      spell_name: 'Misty Step',
    },
    {
      rule_key: 'elf-lineage:replaceable_spell',
      ordinal: 1,
      bucket: 'cantrip_known',
      state: 'active',
      assignment: 'chosen',
      spell_name: 'Mage Hand',
    },
  ],
});

export function importedSpeciesSemanticCensus(
  db: DatabaseContext,
  contentKey: ContentKey,
): number {
  return speciesRuleSemanticCountFromJson(db.scalar(
    'SELECT grant_rules FROM species_definitions WHERE content_key = ?',
    [contentKey],
  ));
}
