import { readFile } from 'node:fs/promises';
import { applicationSeed } from '../../src/db/bootstrap';
import { DatabaseContext } from '../../src/db/database';
import { openTestDatabase } from '../../tests/helpers/open-db';

interface ProfileEntry {
  readonly sql: string;
  readonly count: number;
  readonly totalMs: number;
}

interface Candidate {
  readonly id: string;
  readonly name: string;
  readonly ddl: string;
}

interface PlannedStatement extends ProfileEntry {
  readonly ordinal: number;
  readonly plan: readonly string[];
}

interface PlanChange extends ProfileEntry {
  readonly ordinal: number;
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly scanToSearch: boolean;
  readonly coveringHit: boolean;
  readonly sortEliminated: boolean;
}

interface RedundancyCandidate {
  readonly proposalId: string;
  readonly candidateName: string;
  readonly oldName: string;
  readonly oldDdl: string;
}

const candidates: readonly Candidate[] = [
  {
    id: 'U1',
    name: 'source_instances_definition_state_character_index',
    ddl: `CREATE INDEX source_instances_definition_state_character_index
      ON character_source_instances
        (source_type, source_definition_id, state, character_id)`,
  },
  {
    id: 'P8',
    name: 'catalog_replacement_choices_successor_index',
    ddl: `CREATE INDEX catalog_replacement_choices_successor_index
      ON catalog_content_replacement_choices
        (content_kind, successor_content_key, character_id)`,
  },
  {
    id: 'P9',
    name: 'party_document_states_character_index',
    ddl: `CREATE INDEX party_document_states_character_index
      ON party_document_states (character_id)
      WHERE character_id IS NOT NULL`,
  },
  {
    id: 'P10',
    name: 'character_class_levels_definition_character_index',
    ddl: `CREATE INDEX character_class_levels_definition_character_index
      ON character_class_levels (class_definition_id, character_id)`,
  },
  {
    id: 'P11',
    name: 'character_class_levels_subclass_character_index',
    ddl: `CREATE INDEX character_class_levels_subclass_character_index
      ON character_class_levels (subclass_definition_id, character_id)
      WHERE subclass_definition_id IS NOT NULL`,
  },
  {
    id: 'P12-weapon',
    name: 'background_equipment_items_weapon_index',
    ddl: `CREATE INDEX background_equipment_items_weapon_index
      ON background_equipment_items (weapon_template_id)
      WHERE weapon_template_id IS NOT NULL`,
  },
  {
    id: 'P12-armor',
    name: 'background_equipment_items_armor_index',
    ddl: `CREATE INDEX background_equipment_items_armor_index
      ON background_equipment_items (armor_template_id)
      WHERE armor_template_id IS NOT NULL`,
  },
  {
    id: 'P13-weapon',
    name: 'class_equipment_items_weapon_index',
    ddl: `CREATE INDEX class_equipment_items_weapon_index
      ON class_equipment_items (weapon_template_id)
      WHERE weapon_template_id IS NOT NULL`,
  },
  {
    id: 'P13-armor',
    name: 'class_equipment_items_armor_index',
    ddl: `CREATE INDEX class_equipment_items_armor_index
      ON class_equipment_items (armor_template_id)
      WHERE armor_template_id IS NOT NULL`,
  },
  {
    id: 'P14',
    name: 'wizard_spellbook_entries_spell_active_cover',
    ddl: `CREATE INDEX wizard_spellbook_entries_spell_active_cover
      ON wizard_spellbook_entries
        (spell_version_id, state, character_id, source_instance_id)
      WHERE spell_version_id IS NOT NULL`,
  },
  {
    id: 'P15',
    name: 'spell_loadout_entries_spell_loadout_index',
    ddl: `CREATE INDEX spell_loadout_entries_spell_loadout_index
      ON spell_loadout_entries (spell_version_id, spell_loadout_id)`,
  },
  {
    id: 'P16',
    name: 'character_spell_preferences_spell_character_index',
    ddl: `CREATE INDEX character_spell_preferences_spell_character_index
      ON character_spell_preferences (spell_version_id, character_id)`,
  },
  {
    id: 'P17',
    name: 'source_instances_active_display_index',
    ddl: `CREATE INDEX source_instances_active_display_index
      ON character_source_instances
        (character_id, source_type, display_name, id)
      WHERE state = 'active'`,
  },
  {
    id: 'P18',
    name: 'source_instances_active_id_index',
    ddl: `CREATE INDEX source_instances_active_id_index
      ON character_source_instances (character_id, id)
      WHERE state = 'active'`,
  },
  {
    id: 'P19',
    name: 'skill_grants_active_order_index',
    ddl: `CREATE INDEX skill_grants_active_order_index
      ON character_skill_grants
        (character_id, source_instance_id, grant_key, ordinal, id)
      WHERE state = 'active'`,
  },
  {
    id: 'P20',
    name: 'expertise_grants_active_order_index',
    ddl: `CREATE INDEX expertise_grants_active_order_index
      ON character_skill_expertise_grants
        (character_id, source_instance_id, grant_key, ordinal, id)
      WHERE state = 'active'`,
  },
  {
    id: 'P21',
    name: 'spell_slots_active_order_index',
    ddl: `CREATE INDEX spell_slots_active_order_index
      ON spell_selection_slots
        (character_id, source_instance_id, sort_order, ordinal, id)
      WHERE state = 'active'`,
  },
  {
    id: 'P22',
    name: 'wizard_entries_active_order_index',
    ddl: `CREATE INDEX wizard_entries_active_order_index
      ON wizard_spellbook_entries
        (character_id, source_instance_id, rule_key, ordinal, id,
         spell_version_id)
      WHERE state = 'active'`,
  },
  {
    id: 'P23',
    name: 'catalog_identities_listed_active_name_index',
    ddl: `CREATE INDEX catalog_identities_listed_active_name_index
      ON catalog_content_identities
        (content_kind, normalized_name, content_key)
      WHERE archived_at IS NULL AND visibility IN ('listed')`,
  },
  {
    id: 'P24',
    name: 'character_effects_character_sort_index',
    ddl: `CREATE INDEX character_effects_character_sort_index
      ON character_effects (character_id, sort_order, id)`,
  },
  {
    id: 'P25',
    name: 'character_species_traits_character_sort_index',
    ddl: `CREATE INDEX character_species_traits_character_sort_index
      ON character_species_traits (character_id, sort_order, id)`,
  },
  {
    id: 'P26',
    name: 'character_weapons_character_id_id_index',
    ddl: `CREATE INDEX character_weapons_character_id_id_index
      ON character_weapons (character_id, id)`,
  },
  {
    id: 'P27',
    name: 'character_items_character_name_index',
    ddl: `CREATE INDEX character_items_character_name_index
      ON character_items (character_id, name, id)`,
  },
  {
    id: 'P28',
    name: 'character_class_levels_character_id_id_index',
    ddl: `CREATE INDEX character_class_levels_character_id_id_index
      ON character_class_levels (character_id, id)`,
  },
  {
    id: 'P29',
    name: 'character_level_feat_choices_character_id_id_index',
    ddl: `CREATE INDEX character_level_feat_choices_character_id_id_index
      ON character_level_feat_choices (character_id, id)`,
  },
  {
    id: 'P30',
    name: 'class_feature_effects_definition_level_name_index',
    ddl: `CREATE INDEX class_feature_effects_definition_level_name_index
      ON class_feature_effects (class_definition_id, class_level, name)`,
  },
  {
    id: 'P31',
    name: 'catalog_identities_layer_kind_key_index',
    ddl: `CREATE INDEX catalog_identities_layer_kind_key_index
      ON catalog_content_identities
        (catalog_layer, content_kind, content_key)`,
  },
  {
    id: 'P32',
    name: 'catalog_archive_members_character_kind_key_index',
    ddl: `CREATE INDEX catalog_archive_members_character_kind_key_index
      ON catalog_content_archive_members
        (character_id, content_kind, content_key)`,
  },
  {
    id: 'P33',
    name: 'catalog_match_decisions_reviewed_kind_digest_index',
    ddl: `CREATE INDEX catalog_match_decisions_reviewed_kind_digest_index
      ON catalog_content_match_decisions
        (reviewed_at DESC, content_kind, incoming_fingerprint_digest)`,
  },
] as const;

const redundancyCandidates: readonly RedundancyCandidate[] = [
  {
    proposalId: 'P24',
    candidateName: 'character_effects_character_sort_index',
    oldName: 'character_effects_character_id_index',
    oldDdl: `CREATE INDEX character_effects_character_id_index
      ON character_effects (character_id)`,
  },
  {
    proposalId: 'P25',
    candidateName: 'character_species_traits_character_sort_index',
    oldName: 'character_species_traits_character_id_index',
    oldDdl: `CREATE INDEX character_species_traits_character_id_index
      ON character_species_traits (character_id)`,
  },
  {
    proposalId: 'P27',
    candidateName: 'character_items_character_name_index',
    oldName: 'character_items_character_id_index',
    oldDdl: `CREATE INDEX character_items_character_id_index
      ON character_items (character_id)`,
  },
  {
    proposalId: 'P31',
    candidateName: 'catalog_identities_layer_kind_key_index',
    oldName: 'catalog_content_identities_layer_kind_index',
    oldDdl: `CREATE INDEX catalog_content_identities_layer_kind_index
      ON catalog_content_identities (catalog_layer, content_kind)`,
  },
] as const;

function plan(db: DatabaseContext, sql: string): readonly string[] {
  return db.allRaw(`EXPLAIN QUERY PLAN ${sql}`).map((row) => String(row.detail));
}

function isRealImprovement(
  before: readonly string[],
  after: readonly string[],
  candidateName: string,
): Pick<PlanChange, 'scanToSearch' | 'coveringHit' | 'sortEliminated'> {
  const beforeText = before.join('\n');
  const afterText = after.join('\n');
  const candidateUsed = afterText.includes(candidateName);
  return {
    scanToSearch: candidateUsed && before.some((node) => node.startsWith('SCAN ')) &&
      after.some((node) => node.startsWith('SEARCH ')),
    coveringHit: candidateUsed && afterText.includes('USING COVERING INDEX') &&
      !beforeText.includes('USING COVERING INDEX'),
    sortEliminated: candidateUsed &&
      beforeText.includes('USE TEMP B-TREE FOR ORDER BY') &&
      !afterText.includes('USE TEMP B-TREE FOR ORDER BY'),
  };
}

const profile = JSON.parse(
  await readFile(
    new URL('../../reports/perf/fullsuite-sql/sql-profile.json', import.meta.url),
    'utf8',
  ),
) as readonly ProfileEntry[];
const connection = await openTestDatabase();
try {
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  for (const candidate of candidates) {
    db.exec(`DROP INDEX IF EXISTS ${candidate.name}`);
  }
  const planned: PlannedStatement[] = [];
  const failures: Array<{ readonly ordinal: number; readonly error: string }> = [];
  for (const [ordinal, entry] of profile.entries()) {
    try {
      planned.push({ ...entry, ordinal, plan: plan(db, entry.sql) });
    } catch (error) {
      failures.push({
        ordinal,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const results = [];
  for (const candidate of candidates) {
    db.exec(candidate.ddl);
    const changes: PlanChange[] = [];
    for (const statement of planned) {
      const after = plan(db, statement.sql);
      if (after.join('\n') === statement.plan.join('\n')) continue;
      const improvement = isRealImprovement(
        statement.plan,
        after,
        candidate.name,
      );
      if (!Object.values(improvement).includes(true)) continue;
      changes.push({
        ordinal: statement.ordinal,
        sql: statement.sql,
        count: statement.count,
        totalMs: statement.totalMs,
        before: statement.plan,
        after,
        ...improvement,
      });
    }
    db.exec(`DROP INDEX ${candidate.name}`);
    results.push({
      ...candidate,
      improvedStatementCount: changes.length,
      improvedExecutionCount: changes.reduce((sum, entry) => sum + entry.count, 0),
      improvedTotalMs: changes.reduce((sum, entry) => sum + entry.totalMs, 0),
      changes: changes.sort((left, right) => right.totalMs - left.totalMs),
    });
  }
  const redundancies = [];
  for (const redundancy of redundancyCandidates) {
    const candidate = candidates.find(
      (entry) => entry.name === redundancy.candidateName,
    );
    if (candidate === undefined) {
      throw new Error(`Missing candidate ${redundancy.candidateName}.`);
    }
    db.exec(candidate.ddl);
    const withBoth = planned.map((statement) => ({
      statement,
      plan: plan(db, statement.sql),
    }));
    db.exec(`DROP INDEX ${redundancy.oldName}`);
    const losses = withBoth.flatMap(({ statement, plan: before }) => {
      const after = plan(db, statement.sql);
      const beforeScans = before.filter((node) => node.startsWith('SCAN ')).length;
      const afterScans = after.filter((node) => node.startsWith('SCAN ')).length;
      const beforeSorts = before.filter((node) => node.startsWith('USE TEMP B-TREE')).length;
      const afterSorts = after.filter((node) => node.startsWith('USE TEMP B-TREE')).length;
      const beforeSearches = before.filter((node) => node.startsWith('SEARCH ')).length;
      const afterSearches = after.filter((node) => node.startsWith('SEARCH ')).length;
      if (
        afterScans <= beforeScans &&
        afterSorts <= beforeSorts &&
        afterSearches >= beforeSearches
      ) return [];
      return [{
        ordinal: statement.ordinal,
        sql: statement.sql,
        count: statement.count,
        totalMs: statement.totalMs,
        before,
        after,
      }];
    });
    db.exec(redundancy.oldDdl);
    db.exec(`DROP INDEX ${candidate.name}`);
    redundancies.push({ ...redundancy, losses });
  }
  const adoptedIds = new Set([
    'U1',
    'P8', 'P9', 'P10', 'P11', 'P12-weapon', 'P12-armor', 'P13-weapon',
    'P13-armor', 'P14', 'P15', 'P16', 'P17', 'P19', 'P20', 'P22', 'P24',
    'P25', 'P27', 'P28', 'P30', 'P31', 'P32', 'P33',
  ]);
  for (const candidate of candidates) {
    if (adoptedIds.has(candidate.id)) db.exec(candidate.ddl);
  }
  const afterAdoptionConcerns = planned.flatMap((statement) => {
    const after = plan(db, statement.sql);
    return after.some((node) =>
      node.startsWith('SCAN ') || node.startsWith('USE TEMP B-TREE')
    ) ? [{ ...statement, plan: after }] : [];
  });
  process.stdout.write(`${JSON.stringify({
    profileStatementCount: profile.length,
    plannedStatementCount: planned.length,
    failures,
    baselineConcerns: planned.filter((statement) =>
      statement.plan.some((node) =>
        node.startsWith('SCAN ') || node.startsWith('USE TEMP B-TREE')
      )
    ),
    redundancies,
    afterAdoptionConcerns,
    candidates: results.sort(
      (left, right) => right.improvedTotalMs - left.improvedTotalMs,
    ),
  }, null, 2)}\n`);
} finally {
  connection.close();
}
