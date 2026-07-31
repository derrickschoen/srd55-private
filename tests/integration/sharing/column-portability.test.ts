import type { Database, SqlValue } from '@sqlite.org/sqlite-wasm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SqlRow } from '../../../src/db/codecs';
import { DatabaseContext } from '../../../src/db/database';
import type {
  AnyTableName,
  ColumnNamesOf,
  ShareTable,
} from '../../../src/domain/contracts/tables';
import {
  BACKUP_TABLES,
  CHARACTER_STATE_TABLES,
  SHARE_TABLES,
} from '../../../src/domain/contracts/tables';
import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';
import {
  CHARACTER_SNAPSHOT_SCHEMA_VERSION,
  CharacterState,
} from '../../../src/character/character-state';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import {
  exportCharacterShare,
  importCharacterShare,
  type ShareExportOptions,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * DOES EVERY COLUMN OF A SHARED TABLE SURVIVE A SHARE LINK — AND IF NOT, IS
 * THAT A DECISION SOMEBODY MADE?
 *
 * `character-share.ts` READS its tables with `SELECT *` and WRITES them with
 * hand-enumerated column lists. The two halves are not linked to each other or
 * to the schema, so a column added to a shared table is read into the export,
 * dropped on the floor by the import, and every existing test stays green. That
 * is not hypothetical: Q8/D24 records exactly this happening to weapons and to
 * the stored sheet inputs, and it was found by a person looking rather than by
 * a guard.
 *
 * THE GUARD IS A REAL ROUND TRIP, not a search of the sharing module's source.
 * A column name can appear in a comment; only a value that arrives in a second
 * database proves carriage. So the sender is built with EVERY column of every
 * shared table holding a distinctive value, the character is exported, the
 * document is compressed and decompressed exactly as a link is, and it is
 * imported into a second database whose autoincrement sequences have been
 * pushed past the sender's so that no identifier can match by luck.
 *
 * THE EXCEPTIONS ARE THE WHOLE DESIGN PROBLEM, so they are declared one column
 * at a time in `PROBES` below, each with its own reason. A blanket skip would
 * be worthless; the point of the list being hand-written is that adding a
 * column forces a deliberate choice between "carries" and "deliberately does
 * not, because X". `SNAPSHOT_ADDITIONS` in
 * `tests/unit/contracts/table-scopes.test.ts` is the established shape for that
 * in this codebase and this follows it.
 *
 * ADDING A COLUMN IS A COMPILE ERROR UNTIL IT IS CLASSIFIED. `PROBES` is keyed
 * by `ColumnNamesOf<N>`, which is derived from the Drizzle declaration in
 * `db/schema/`, so a new column makes this file fail `tsc -b` with TS2741
 * before it fails at runtime. The runtime check against `PRAGMA table_info`
 * closes the same loop from the database's side.
 *
 * BOTH DIRECTIONS FAIL, and neither needs a separate mechanism:
 *
 *  - a CARRIED column that stops being carried fails, because the recipient's
 *    value stops equalling the sender's;
 *  - an EXCEPTION-LISTED column that starts being carried fails, because the
 *    sender's distinctive value turns up in the recipient's database, which is
 *    precisely what an omitted column may never do.
 *
 * The second is what stops the list rotting into a blanket suppression:
 * silencing a real failure by moving a column into the exception list does not
 * work, it swaps one failure for another.
 *
 * WHAT THIS FILE CANNOT PROVE, stated rather than glossed.
 *
 * 1. Two slot columns — `rule_key` and `ordinal` — are BOTH carried on the wire
 *    and regenerated identically by the recipient's own grant rules, so no
 *    fixture can tell carriage from regeneration for them. They are declared
 *    `verbatim` because that is what they are; their carriage is pinned by the
 *    selection-matching assertions in `round-trip.test.ts`, not here.
 *
 * 2. It cannot tell a column DELIBERATELY left out of the wire from one somebody
 *    FORGOT, because that difference does not exist in the code — it exists only
 *    in whether anybody thought about it. Declaring a genuinely-forgotten column
 *    `omitted` will pass. What the file guarantees instead is that the thought
 *    has to happen: the classification is a compile error until it is written,
 *    it must carry a reason, and it lands in a diff at the moment the column is
 *    added. That is the whole difference from today, where nothing is written
 *    and nothing asks.
 *
 * THERE ARE THREE STATES, NOT TWO, AND THE THIRD ARRIVED WITH Q12.
 *
 * `characters.notes` travels only when the sharer asks for it. Neither of the
 * original two classifications can say that without lying: `verbatim` claims a
 * column every link carries, and `omitted` claims one no link carries. So
 * `opt_in` was added, and it is deliberately the SMALLEST extension that can be
 * checked — it names the `ShareExportOptions` flag that turns the column on, and
 * the engine proves BOTH halves against two real round trips of the same
 * character: one exported with the flag, one exported with the DEFAULTS.
 *
 * IT IS NOT A THIRD WAY TO SAY "OMITTED". An `opt_in` column that never travels
 * fails the opted-IN trip, and one that always travels fails the opted-OUT trip.
 * Neither failure can be silenced by moving the column to another kind, because
 * `verbatim` and `omitted` each fail in one of those two directions too.
 *
 * WHOLE-TABLE OPT-INS ARE A DIFFERENT SHAPE AND ARE NOT CLASSIFIED THIS WAY.
 * `warning_acknowledgements` and `spell_loadouts` are opt-in as ROWS: with the
 * flag off, no row of theirs reaches the wire at all, so their columns are
 * `verbatim` and the fixture's export asks for both tables. `opt_in` is for a
 * column whose ROW travels regardless and whose VALUE is the sharer's choice.
 */

/** How one column of one shared table behaves on the way through a link. */
type Portability =
  /**
   * The sender's value appears unchanged in the recipient's row.
   */
  | { readonly kind: 'verbatim' }
  /**
   * The value is a database identifier that cannot travel, and the MEANING
   * travels instead as a content key. `key` is a SQL scalar expression over the
   * row alias `t` producing that portable form; it must agree on both sides
   * while the raw integer must NOT, since the recipient allocates its own.
   */
  | { readonly kind: 'translated'; readonly key: string; readonly why: string }
  /**
   * TRAVELS ONLY WHEN THE SHARER ASKS. The value reaches the recipient
   * unchanged when `option` is set on the export, and reaches them not at all
   * when the export runs on its defaults.
   *
   * `option` is keyed by `ShareExportOptions`, so a flag that does not exist —
   * or one that is renamed — is a compile error here rather than a test that
   * quietly proves nothing.
   */
  | {
      readonly kind: 'opt_in';
      readonly option: keyof ShareExportOptions;
      readonly why: string;
    }
  /**
   * Does not travel. The sender holds a value the recipient's own derivation
   * would not produce, and the recipient must not be holding it — which is
   * exactly what fails if the column quietly starts travelling.
   */
  | {
      readonly kind: 'omitted';
      readonly why: string;
      /**
       * Set when a distinctive value in this column STOPS THE ROW TRAVELLING
       * AT ALL, so sender and recipient necessarily agree on every row that did
       * travel and the ordinary proof cannot bite. The proof then runs over a
       * row the sender deliberately keeps off the wire: its value must appear
       * nowhere in the recipient's copy of the column.
       *
       * Two columns need this and both are the same shape — the export's WHERE
       * clause reads them. It is not a general escape hatch: the engine
       * REFUSES it unless the sender really does hold a row that does not
       * travel.
       */
      readonly provedByExcludedRow?: true;
    };

interface Probe<N extends AnyTableName> {
  /** How the table's rows are scoped to one character. Defaults to `character_id`. */
  readonly scope?: string;
  /** Which of the SENDER's rows are supposed to travel at all. Defaults to all. */
  readonly travels?: string;
  /** A portable ordering, so sender and recipient rows can be paired up. */
  readonly order: string;
  readonly columns: Readonly<Record<ColumnNamesOf<N>, Portability>>;
}

/**
 * `characters` is the root rather than a `ShareTable`. `spell_versions` is
 * probed for the opposite reason: its stable content key travels as a catalog
 * reference, while none of the referenced catalog row travels. Keeping both
 * exceptional boundaries in this map forces new columns on either one to be
 * classified in the diff that adds them.
 */
type ProbedTable = ShareTable | 'characters' | 'spell_versions';

const OWNED_TIMESTAMP: Portability = {
  kind: 'omitted',
  why: 'A share carries no timestamps. The recipient stamps the row with the moment it was imported, which is the only honest value: the row is theirs now.',
};
const RECIPIENT_ROW_ID: Portability = {
  kind: 'omitted',
  why: 'A primary key is meaningless in another database. The recipient allocates its own.',
};
const RECIPIENT_OWNER_ID: Portability = {
  kind: 'omitted',
  why: 'The owning character is created by the import and has an id only the recipient knows.',
};
const REFERENCED_CATALOG_CONTENT: Portability = {
  kind: 'omitted',
  why: 'A character share carries only the spell content key. The recipient resolves that key against its own catalogue or creates a placeholder; no sender catalogue content travels.',
};

const PROBES: { readonly [N in ProbedTable]: Probe<N> } = {
  characters: {
    scope: 't.id = ?',
    order: 't.id',
    columns: {
      id: RECIPIENT_ROW_ID,
      name: { kind: 'verbatim' },
      strength: { kind: 'verbatim' },
      dexterity: { kind: 'verbatim' },
      constitution: { kind: 'verbatim' },
      intelligence: { kind: 'verbatim' },
      wisdom: { kind: 'verbatim' },
      charisma: { kind: 'verbatim' },
      ability_allocation_method: { kind: 'verbatim' },
      proficiency_bonus_override: { kind: 'verbatim' },
      rules_edition_preference: { kind: 'verbatim' },
      allow_legacy: { kind: 'verbatim' },
      revision: {
        kind: 'omitted',
        why: 'The edit counter of the SENDER\'s database. The recipient\'s copy has been edited zero times and the import writes a literal 0.',
      },
      notes: {
        kind: 'opt_in',
        option: 'notes',
        why: "THE SHARER DECIDES, and the default is not to send it (Q12, ruled by the owner: 'Opt-in, like loadouts'). Every other note this format drops is WORKING STATE (a preference, an override, an acknowledgement, a loadout) and every note on the BUILD travels (a weapon, a species, a background, a suit of armour, an effect) — a character's own notes sit on the build side of that line, which is why they CAN travel, and they are the likeliest place in this application for genuinely private text, which is why they do not travel unasked. Off by default because a link minted before this existed carries no note, so the default has to mean what those links already mean.",
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  spell_versions: {
    scope:
      "t.content_key = '2024:fixture-shield' AND EXISTS (SELECT 1 FROM characters WHERE id = ?)",
    order: 't.content_key',
    columns: {
      id: RECIPIENT_ROW_ID,
      content_key: { kind: 'verbatim' },
      spell_identity_id: REFERENCED_CATALOG_CONTENT,
      display_name: REFERENCED_CATALOG_CONTENT,
      rules_edition: REFERENCED_CATALOG_CONTENT,
      level: REFERENCED_CATALOG_CONTENT,
      school: REFERENCED_CATALOG_CONTENT,
      ritual: REFERENCED_CATALOG_CONTENT,
      concentration: REFERENCED_CATALOG_CONTENT,
      casting_time: REFERENCED_CATALOG_CONTENT,
      action_type: REFERENCED_CATALOG_CONTENT,
      range: REFERENCED_CATALOG_CONTENT,
      range_kind: REFERENCED_CATALOG_CONTENT,
      range_feet: REFERENCED_CATALOG_CONTENT,
      area_shape: REFERENCED_CATALOG_CONTENT,
      area_feet: REFERENCED_CATALOG_CONTENT,
      duration: REFERENCED_CATALOG_CONTENT,
      components: REFERENCED_CATALOG_CONTENT,
      material_component_summary: REFERENCED_CATALOG_CONTENT,
      material_cost_copper: REFERENCED_CATALOG_CONTENT,
      material_cost_kind: REFERENCED_CATALOG_CONTENT,
      healing: REFERENCED_CATALOG_CONTENT,
      short_summary: REFERENCED_CATALOG_CONTENT,
      upcast_summary: REFERENCED_CATALOG_CONTENT,
      cantrip_upgrade_summary: REFERENCED_CATALOG_CONTENT,
      requires_mod_for_effect: REFERENCED_CATALOG_CONTENT,
      effect_reliability_category: REFERENCED_CATALOG_CONTENT,
      provenance: REFERENCED_CATALOG_CONTENT,
      seed_version: REFERENCED_CATALOG_CONTENT,
      is_active: REFERENCED_CATALOG_CONTENT,
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
      forked_from_content_key: {
        kind: 'omitted',
        why: 'Fork ancestry is sender catalogue content. The share carries the fork spell key and resolves it like imported homebrew; ancestry does not get a fork-only transport mechanism.',
      },
    },
  },
  character_class_levels: {
    order: 't.level',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      class_definition_id: {
        kind: 'translated',
        key: '(SELECT content_key FROM class_definitions WHERE id = t.class_definition_id)',
        why: "`classes[].classKey` — the recipient's catalog row for the same class has its own id.",
      },
      subclass_definition_id: {
        kind: 'translated',
        key: '(SELECT content_key FROM subclass_definitions WHERE id = t.subclass_definition_id)',
        why: '`classes[].subclassKey`, on the same terms as the class: the recipient holds the same subclass under an id of their own.',
      },
      level: { kind: 'verbatim' },
      is_starting_class: { kind: 'verbatim' },
      spellcasting_ability_override: { kind: 'verbatim' },
      notes: {
        kind: 'omitted',
        why: "No share field exists for a per-class-level note. It is the sender's working note about their own row.",
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_source_instances: {
    travels: "t.state = 'active'",
    order: 't.source_type, t.display_name',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      instance_uuid: {
        kind: 'omitted',
        why: "It identifies the SENDER's row. The import mints a fresh uuid, so two people who open the same link do not end up holding rows that claim to be the same one.",
      },
      parent_source_instance_id: {
        kind: 'omitted',
        provedByExcludedRow: true,
        why: 'A source granted BY another source is regenerated from the recipient\'s own grant rules, not copied. The document carries roots; the tree under each root is rebuilt, which is the whole reason a link stays small. Every source that DOES travel is a root with no parent, so the proof runs over the sender\'s retired child.',
      },
      source_type: { kind: 'verbatim' },
      source_definition_id: {
        kind: 'translated',
        key: "COALESCE((SELECT content_key FROM class_definitions WHERE t.source_type = 'class' AND id = t.source_definition_id), (SELECT content_key FROM subclass_definitions WHERE t.source_type = 'subclass' AND id = t.source_definition_id), (SELECT content_key FROM feat_definitions WHERE t.source_type = 'feat' AND id = t.source_definition_id), (SELECT content_key FROM species_definitions WHERE t.source_type = 'species' AND id = t.source_definition_id), (SELECT content_key FROM background_definitions WHERE t.source_type = 'background' AND id = t.source_definition_id))",
        why: '`sources[].key` / `classes[].classKey`, resolved against whichever catalog table the polymorphic `source_type` names.',
      },
      display_name: { kind: 'verbatim' },
      config: { kind: 'verbatim' },
      acquired_at_character_level: { kind: 'verbatim' },
      state: {
        kind: 'omitted',
        provedByExcludedRow: true,
        why: 'Only ACTIVE sources are exported at all, so a state other than active never reaches the wire and the recipient\'s rows all start active. The fixture proves it by giving the sender a tombstoned source that the recipient never sees.',
      },
      notes: {
        kind: 'omitted',
        why: "No share field exists for a per-source note; it is the sender's working note.",
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  spell_selection_slots: {
    order: 't.rule_key, t.ordinal',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      source_instance_id: {
        kind: 'translated',
        key: '(SELECT display_name FROM character_source_instances WHERE id = t.source_instance_id)',
        why: 'A slot belongs to the source that granted it, and `selections[].ref` carries that ownership. The recipient\'s source row has its own id.',
      },
      slot_key: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE. The generator composes it from the recipient\'s own source id and rule, so a sender\'s key would not even be well-formed there.',
      },
      rule_key: {
        kind: 'verbatim',
        // Also regenerated identically — see the file header. Declared for what
        // it is; its carriage is proved by the selection-matching tests.
      },
      ordinal: { kind: 'verbatim' },
      bucket: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE: the grant rule says which bucket the slot is, and the recipient reads that from their own catalog.',
      },
      eligibility_kind: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE: it is the KIND of the grant rule that made the slot.',
      },
      fixed_spell_version_id: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE: a fixed spell is dictated by the rule, not chosen, so the recipient materialises it themselves. A slot holding one carries no selection and is not exported at all.',
      },
      current_spell_version_id: {
        kind: 'translated',
        key: '(SELECT content_key FROM spell_versions WHERE id = t.current_spell_version_id)',
        why: "`selections[].spellKey`. THE CHOICE is the one thing about a slot that is not derivable, and it is what a share exists to carry.",
      },
      label: {
        kind: 'omitted',
        why: "DERIVED SLOT STATE: the label comes from the grant rule's own data.",
      },
      spell_level_min: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE: the level window is the rule\'s, and the recipient\'s catalog is the authority on it.',
      },
      spell_level_max: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE, with `spell_level_min`.',
      },
      allowed_spell_lists: {
        kind: 'omitted',
        why: "DERIVED SLOT STATE: the eligibility filter is the rule's.",
      },
      allowed_schools: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE, with `allowed_spell_lists`.',
      },
      allowed_tags: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE, with `allowed_spell_lists`.',
      },
      always_prepared: {
        kind: 'omitted',
        why: "DERIVED SLOT STATE: a rule declares whether what it grants is always prepared.",
      },
      with_slots: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE, with `always_prepared`.',
      },
      free_cast: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE: the free-cast allowance is written on the grant rule.',
      },
      counts_against_limit: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE, with `always_prepared`.',
      },
      required: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE, with `always_prepared`.',
      },
      is_locked: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE, with `always_prepared`.',
      },
      state: {
        kind: 'verbatim',
        // `selections[].keep` — a kept override is a decision the sender made
        // about a slot their catalog orphaned, and it is not re-derivable.
      },
      orphan_reason_code: {
        kind: 'omitted',
        why: "ORPHANING IS THE SENDER'S CATALOG'S OPINION. The recipient's catalog decides afresh whether the slot is orphaned, and importing the sender's verdict would state a fact about content the recipient may not even have.",
      },
      orphaned_at: {
        kind: 'omitted',
        why: 'With `orphan_reason_code` — and it is a timestamp besides.',
      },
      prior_config: {
        kind: 'omitted',
        why: 'The configuration a slot had BEFORE the sender changed it: undo material for the sender\'s own edit history, which a link does not carry (`character_save_points` is not shared either).',
      },
      override_note: {
        kind: 'omitted',
        why: "The recipient writes its own note ('Imported keep override.') when it applies `keep`, which is a truer statement about their row than the sender's note would be.",
      },
      sort_order: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE: it is the ordinal within the rule.',
      },
      notes: {
        kind: 'omitted',
        why: "No share field exists for a per-slot note; it is the sender's working note.",
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
      selection_collection: {
        kind: 'omitted',
        why: 'DERIVED SLOT STATE: the eligibility pass recomputes it against the recipient\'s catalog.',
      },
      selection_eligibility: {
        kind: 'omitted',
        why: "RECOMPUTED, and it must be. Whether a chosen spell is legal depends on the READER's catalog and their character's legacy setting; importing the sender's verdict would print a judgement about content that was never examined.",
      },
      selection_invalid_reason: {
        kind: 'omitted',
        why: 'With `selection_eligibility` — the reason belongs to whoever made the judgement.',
      },
      selection_acquired_at_class_level: {
        kind: 'verbatim',
      },
    },
  },
  wizard_spellbook_entries: {
    travels: "t.state = 'active'",
    order: 't.source_instance_id, t.rule_key, t.ordinal',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      source_instance_id: {
        kind: 'translated',
        key: '(SELECT display_name FROM character_source_instances WHERE id = t.source_instance_id)',
        why: '`spellbook[].ref` carries the granting source through the share-local reference space.',
      },
      rule_key: { kind: 'verbatim' },
      ordinal: { kind: 'verbatim' },
      acquired_at_class_level: { kind: 'verbatim' },
      spell_version_id: {
        kind: 'translated',
        key: '(SELECT content_key FROM spell_versions WHERE id = t.spell_version_id)',
        why: '`spellbook[].spellKey` resolves against the recipient catalog and remains nullable for an unfilled acquisition.',
      },
      spell_level_min: {
        kind: 'omitted',
        why: 'DERIVED ACQUISITION STATE: the grant rule owns its level window.',
      },
      spell_level_max: {
        kind: 'omitted',
        why: 'DERIVED ACQUISITION STATE, with spell_level_min.',
      },
      allowed_spell_lists: {
        kind: 'omitted',
        why: 'DERIVED ACQUISITION STATE: the grant rule owns its list constraint.',
      },
      allowed_schools: {
        kind: 'omitted',
        why: 'DERIVED ACQUISITION STATE, with allowed_spell_lists.',
      },
      allowed_tags: {
        kind: 'omitted',
        why: 'DERIVED ACQUISITION STATE, with allowed_spell_lists.',
      },
      state: {
        kind: 'omitted',
        provedByExcludedRow: true,
        why: 'Only active acquisitions travel; orphaned acquisitions are sender history.',
      },
      orphan_reason_code: {
        kind: 'omitted',
        why: 'The recipient recomputes orphaning from its own effective rules.',
      },
      orphaned_at: {
        kind: 'omitted',
        why: 'With orphan_reason_code, and it is a sender timestamp.',
      },
      selection_eligibility: {
        kind: 'omitted',
        why: 'The recipient evaluates the selected spell against its own catalog.',
      },
      selection_invalid_reason: {
        kind: 'omitted',
        why: 'With selection_eligibility: the reason belongs to the catalog that performed the evaluation.',
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  warning_acknowledgements: {
    travels: 't.invalidated_at IS NULL',
    order: 't.warning_fingerprint',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      warning_fingerprint: { kind: 'verbatim' },
      note: {
        kind: 'omitted',
        why: "The sender's note on why they dismissed a warning. The wire carries the fingerprint alone.",
      },
      invalidated_at: {
        kind: 'omitted',
        provedByExcludedRow: true,
        why: 'An acknowledgement that has been invalidated is not exported AT ALL, so a non-null value never reaches the wire and every acknowledgement that travels has a null one. The fixture gives the sender a retired acknowledgement to prove it.',
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_spell_preferences: {
    order: '(SELECT content_key FROM spell_versions WHERE id = t.spell_version_id)',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      spell_version_id: {
        kind: 'translated',
        key: '(SELECT content_key FROM spell_versions WHERE id = t.spell_version_id)',
        why: '`preferences[].spellKey`. The recipient resolves the key against their own catalog, which holds the same spell under a different id.',
      },
      favourite: { kind: 'verbatim' },
      notes: {
        kind: 'omitted',
        why: "The sender's private note about a spell. `SharePreference` carries the favourite flag only.",
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_rule_overrides: {
    order: 't.rule_key',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      rule_key: { kind: 'verbatim' },
      value: { kind: 'verbatim' },
      note: {
        kind: 'omitted',
        why: "The sender's private note about why they overrode a rule. `ShareOverride` carries the key and the value.",
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  spell_loadouts: {
    order: 't.name',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      name: { kind: 'verbatim' },
      notes: {
        kind: 'omitted',
        why: "The sender's private note on a loadout. `ShareLoadout` carries the name and its entries.",
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  spell_loadout_entries: {
    scope:
      't.spell_loadout_id IN (SELECT id FROM spell_loadouts WHERE character_id = ?)',
    order: 't.role',
    columns: {
      id: RECIPIENT_ROW_ID,
      spell_loadout_id: {
        kind: 'translated',
        key: '(SELECT name FROM spell_loadouts WHERE id = t.spell_loadout_id)',
        why: 'An entry travels NESTED INSIDE its loadout, so the parent is expressed by containment rather than by an id. This is the one shared table with no `character_id` of its own.',
      },
      spell_version_id: {
        kind: 'translated',
        key: '(SELECT content_key FROM spell_versions WHERE id = t.spell_version_id)',
        why: '`loadouts[].entries[].spellKey`, resolved against the recipient\'s own catalog exactly as every other spell reference in the document is.',
      },
      role: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_weapons: {
    order: 't.name',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      name: { kind: 'verbatim' },
      // D27's category, added to `character_weapons` by the multiclass track and
      // appended LAST to the share tuple so a pre-D27 link still decodes. This
      // classification is the one the guard was built to force: the column
      // arrived hours after the guard did, and both of its loops fired on it.
      proficiency_category: { kind: 'verbatim' },
      // D46 deliberately splits the channels: a share link remains the frozen
      // v2 compact reference and omits this new fact, while the full JSON
      // export carries it. The fixture is non-null so omission cannot pass by
      // agreeing with the column's null default.
      attack_kind: {
        kind: 'omitted',
        why: 'D46 keeps share links at frozen wire v2. Weapon attack kind travels in the complete JSON export, not in a compact reference link.',
      },
      damage_kind: { kind: 'verbatim' },
      damage_dice: { kind: 'verbatim' },
      damage_flat: { kind: 'verbatim' },
      damage_custom: { kind: 'verbatim' },
      damage_type: { kind: 'verbatim' },
      versatile_damage_kind: { kind: 'verbatim' },
      versatile_damage_dice: { kind: 'verbatim' },
      versatile_damage_flat: { kind: 'verbatim' },
      versatile_damage_custom: { kind: 'verbatim' },
      finesse: { kind: 'verbatim' },
      heavy: { kind: 'verbatim' },
      light: { kind: 'verbatim' },
      loading: { kind: 'verbatim' },
      reach: { kind: 'verbatim' },
      thrown: { kind: 'verbatim' },
      two_handed: { kind: 'verbatim' },
      ammunition: { kind: 'verbatim' },
      ammunition_kind: { kind: 'verbatim' },
      range_kind: { kind: 'verbatim' },
      range_near_feet: { kind: 'verbatim' },
      range_far_feet: { kind: 'verbatim' },
      mastery_property: { kind: 'verbatim' },
      mastery_selected: { kind: 'verbatim' },
      other_properties: { kind: 'verbatim' },
      notes: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_species: {
    order: 't.name',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      name: { kind: 'verbatim' },
      creature_type: { kind: 'verbatim' },
      size: { kind: 'verbatim' },
      base_speed_feet: { kind: 'verbatim' },
      notes: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_species_traits: {
    order: 't.sort_order',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      sort_order: {
        kind: 'omitted',
        why: 'ARRAY POSITION IS THE ORDER. `speciesTraits` is a list, so the printed order travels as the list order and the recipient renumbers densely from 1 — which is why a document cannot supply a gap, a duplicate or a zero. The ORDER is carried and asserted; the integer is not.',
      },
      name: { kind: 'verbatim' },
      description: { kind: 'verbatim' },
      notes: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_background: {
    order: 't.name',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      name: { kind: 'verbatim' },
      ability_score_1: { kind: 'verbatim' },
      ability_score_2: { kind: 'verbatim' },
      ability_score_3: { kind: 'verbatim' },
      feat_name: { kind: 'verbatim' },
      skill_proficiency_1: { kind: 'verbatim' },
      skill_proficiency_2: { kind: 'verbatim' },
      tool_proficiency: { kind: 'verbatim' },
      equipment_option_a: { kind: 'verbatim' },
      equipment_option_b: { kind: 'verbatim' },
      notes: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_armor: {
    order: 't.slot',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      slot: { kind: 'verbatim' },
      name: { kind: 'verbatim' },
      category: { kind: 'verbatim' },
      armor_class: { kind: 'verbatim' },
      dex_bonus: { kind: 'verbatim' },
      dex_bonus_max: { kind: 'verbatim' },
      strength_requirement: { kind: 'verbatim' },
      stealth_disadvantage: { kind: 'verbatim' },
      notes: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_hit_point_rolls: {
    order: 't.class_name, t.class_level',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      class_name: { kind: 'verbatim' },
      class_level: { kind: 'verbatim' },
      rolled_value: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_skill_proficiencies: {
    order: 't.skill',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      skill: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_skill_grants: {
    travels: "t.state = 'active'",
    order: 't.grant_key, t.ordinal',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      source_instance_id: {
        kind: 'translated',
        key: '(SELECT display_name FROM character_source_instances WHERE id = t.source_instance_id)',
        why: "`skillGrants[].ref` carries the granting source in the same reference space `selections[].ref` uses — provenance is the whole point of the section — and the recipient's source row has its own id.",
      },
      grant_key: { kind: 'verbatim' },
      ordinal: { kind: 'verbatim' },
      skill: { kind: 'verbatim' },
      state: {
        kind: 'omitted',
        provedByExcludedRow: true,
        why: "Only ACTIVE grants are exported at all — an orphaned grant hangs from a removed source the document does not carry — so a state other than active never reaches the wire and the recipient's grants all start active. The fixture gives the sender an orphaned grant the recipient never sees.",
      },
      orphan_reason_code: {
        kind: 'omitted',
        provedByExcludedRow: true,
        why: "Lifecycle detail of the orphaned rows that never travel at all. The recipient's grants carry no orphan verdict, and importing the sender's would state a fact about a source the document does not even carry.",
      },
      orphaned_at: {
        kind: 'omitted',
        provedByExcludedRow: true,
        why: 'With `orphan_reason_code` — and it is a timestamp besides, which a share never carries in any table.',
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_skill_expertise_grants: {
    travels: "t.state = 'active'",
    order: 't.grant_key, t.ordinal',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      source_instance_id: {
        kind: 'translated',
        key: '(SELECT display_name FROM character_source_instances WHERE id = t.source_instance_id)',
        why: 'The v15 Expertise tuple carries the granting source ref; recipient source ids are local.',
      },
      grant_key: { kind: 'verbatim' },
      ordinal: { kind: 'verbatim' },
      granted_at_class_level: { kind: 'verbatim' },
      skill: { kind: 'verbatim' },
      state: {
        kind: 'omitted',
        why: 'Only live Expertise grants travel; imported grants begin active.',
      },
      orphan_reason_code: {
        kind: 'omitted',
        why: 'Orphan lifecycle belongs to sources omitted from the active share tree.',
      },
      orphaned_at: {
        kind: 'omitted',
        why: 'Orphan lifecycle timestamps do not travel in share links.',
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_effects: {
    order: 't.sort_order',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      sort_order: {
        kind: 'omitted',
        why: 'ARRAY POSITION IS THE ORDER, exactly as for `character_species_traits`. The recipient renumbers densely from 1.',
      },
      effect_kind: { kind: 'verbatim' },
      damage_type: { kind: 'verbatim' },
      hit_points_flat: { kind: 'verbatim' },
      hit_points_per_level: { kind: 'verbatim' },
      speed_bonus_feet: { kind: 'verbatim' },
      ability: { kind: 'verbatim' },
      amount: { kind: 'verbatim' },
      maximum: { kind: 'verbatim' },
      base: { kind: 'verbatim' },
      ability_1: { kind: 'verbatim' },
      ability_2: { kind: 'verbatim' },
      allows_shield: { kind: 'verbatim' },
      weapon_scope: { kind: 'verbatim' },
      character_item_id: {
        kind: 'translated',
        key: '(SELECT name FROM character_items WHERE id = t.character_item_id)',
        why: '`effects[].itemRef` is the zero-based index in the document item array. The recipient item has its own id.',
      },
      character_weapon_id: {
        kind: 'translated',
        key: '(SELECT name FROM character_weapons WHERE id = t.character_weapon_id)',
        why: '`effects[].weaponRef` is the zero-based index in the document weapon array. The recipient weapon has its own id.',
      },
      template_ref: { kind: 'verbatim' },
      source_instance_id: {
        kind: 'translated',
        key: '(SELECT display_name FROM character_source_instances WHERE id = t.source_instance_id)',
        why: '`effects[].sourceRef` names a `sources[].id`, and `sourceSubclass` picks which of the two roots a class ref mints. The recipient\'s source row has its own id.',
      },
      label: { kind: 'verbatim' },
      notes: { kind: 'verbatim' },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_items: {
    order: 't.id',
    columns: {
      id: RECIPIENT_ROW_ID,
      character_id: RECIPIENT_OWNER_ID,
      name: { kind: 'verbatim' },
      description: { kind: 'verbatim' },
      quantity: { kind: 'verbatim' },
      requires_attunement: { kind: 'verbatim' },
      source_instance_id: {
        kind: 'translated',
        key: '(SELECT display_name FROM character_source_instances WHERE id = t.source_instance_id)',
        why: 'The identical translation `character_effects.source_instance_id` gets, for the identical reason (AC-1, D72): the recipient\'s source row has its own id.',
      },
      created_at: OWNED_TIMESTAMP,
      updated_at: OWNED_TIMESTAMP,
    },
  },
  character_attunement_slots: {
    order: 't.character_id',
    columns: {
      character_id: RECIPIENT_OWNER_ID,
      slot_1_item_id: {
        kind: 'translated',
        key: '(SELECT name FROM character_items WHERE id = t.slot_1_item_id)',
        why: '`attunementSlots[0]` is an item-array reference, so the recipient resolves its own character_items id.',
      },
      slot_2_item_id: {
        kind: 'translated',
        key: '(SELECT name FROM character_items WHERE id = t.slot_2_item_id)',
        why: '`attunementSlots[1]` is an item-array reference, so the recipient resolves its own character_items id.',
      },
      slot_3_item_id: {
        kind: 'translated',
        key: '(SELECT name FROM character_items WHERE id = t.slot_3_item_id)',
        why: '`attunementSlots[2]` is an item-array reference, so the recipient resolves its own character_items id.',
      },
    },
  },
};

// --- the fixture ----------------------------------------------------------

/**
 * Every timestamp the SENDER writes. Far enough in the past that the
 * recipient's `new Date().toISOString()` cannot collide with it.
 */
const SENDER_TIME = '2001-02-03T04:05:06.000Z';

/**
 * How far the recipient's autoincrement sequences are pushed before the
 * import. Every identifier the recipient allocates is therefore larger than
 * every identifier the sender holds, so no `translated` column can pass by two
 * databases happening to agree on a number.
 */
const RECIPIENT_ID_BASE = 5000;

const GRANT_RULES = JSON.stringify([
  {
    kind: 'choice_from_query',
    rule_key: 'wizard-chosen',
    count: 1,
    bucket: 'prepared',
    level_min: 0,
    level_max: 9,
  },
  {
    kind: 'spellbook_acquisition',
    rule_key: 'wizard-spellbook',
    count: 1,
    bucket: 'spellbook',
    list: 'Wizard',
    level_min: 0,
    level_max: 9,
  },
  {
    kind: 'choice_from_query',
    rule_key: 'wizard-spare',
    count: 1,
    bucket: 'prepared',
    level_min: 0,
    level_max: 9,
  },
]);

interface Catalog {
  readonly classId: number;
  readonly subclassId: number;
  readonly featId: number;
  readonly chosenSpellId: number;
  readonly spareSpellId: number;
}

function seedCatalog(db: DatabaseContext, includeFork = true): Catalog {
  const spell = (key: string, name: string, level: number): number => {
    const identityId = db.exec(
      `INSERT INTO spell_identities (content_key, canonical_name, normalized_name)
       VALUES (?, ?, ?)`,
      [`spell:${name.toLowerCase()}`, name, name.toLowerCase()],
    ).lastInsertId;
    const versionId = db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, is_active
       ) VALUES (?, ?, ?, '2024', ?, 'Abjuration', 1)`,
      [key, identityId, name, level],
    ).lastInsertId;
    db.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key
       ) VALUES (?, 'Wizard')`,
      [versionId],
    );
    return versionId;
  };
  const bundledSourceId = spell('2024:shield', 'Shield', 1);
  db.exec(
    "UPDATE spell_versions SET provenance = 'srd' WHERE id = ?",
    [bundledSourceId],
  );
  const chosenSpellId = includeFork
    ? spell('2024:fixture-shield', 'Sender-Only Fixture Shield', 1)
    : bundledSourceId;
  if (includeFork) {
    db.exec(
      `UPDATE spell_versions
       SET forked_from_content_key = '2024:shield',
           rules_edition = 'sender-only-edition',
           ritual = 1,
           concentration = 1,
           casting_time = 'Distinct action',
           action_type = 'reaction',
           range = '60 feet (10-foot Sphere)',
           range_kind = 'ranged',
           range_feet = 60,
           area_shape = 'sphere',
           area_feet = 10,
           duration = 'Distinct duration',
           components = 'V, S, M',
           material_component_summary = 'distinct material',
           material_cost_copper = 123,
           material_cost_kind = 'exact',
           healing = 1,
           short_summary = 'distinct summary',
           upcast_summary = 'distinct upcast',
           cantrip_upgrade_summary = 'distinct cantrip upgrade',
           requires_mod_for_effect = 1,
           effect_reliability_category = 'mixed',
           provenance = 'user',
           seed_version = 'sender-only-seed-probe',
           is_active = 1,
           created_at = ?,
           updated_at = ?
       WHERE id = ?`,
      [SENDER_TIME, SENDER_TIME, chosenSpellId],
    );
  }
  const spareSpellId = spell('2024:mage-armor', 'Mage Armor', 1);
  const classId = db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, spellcasting_ability, progression_type
     ) VALUES ('2024:class:wizard', 'Wizard', '2024', 'intelligence', 'full')`,
  ).lastInsertId;
  db.exec(
    `INSERT INTO class_progressions (
       class_definition_id, class_level, cantrips_known, prepared_count, grant_rules
     ) VALUES (?, 1, 0, 2, ?)`,
    [classId, GRANT_RULES],
  );
  const subclassId = db.exec(
    `INSERT INTO subclass_definitions (
       content_key, class_definition_id, name, rules_edition, spellcasting_ability
     ) VALUES ('2024:subclass:evoker', ?, 'Evoker', '2024', 'intelligence')`,
    [classId],
  ).lastInsertId;
  const featId = db.exec(
    `INSERT INTO feat_definitions (content_key, name, rules_edition)
     VALUES ('2024:feat:alert', 'Alert', '2024')`,
  ).lastInsertId;
  return { classId, subclassId, featId, chosenSpellId, spareSpellId };
}

/**
 * Push every autoincrement sequence past the sender's, so the recipient cannot
 * reuse one of the sender's identifiers by coincidence.
 *
 * `sqlite_sequence` is written directly, which this codebase already does when
 * restoring a backup image (`character-backup.ts`). The rows are inserted
 * BEFORE the first insert into each table, which is the only reason a plain
 * INSERT is enough: SQLite has not created them yet.
 */
function offsetSequences(db: DatabaseContext): void {
  const tables = db.allRaw(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND sql LIKE '%AUTOINCREMENT%'",
  );
  for (const row of tables) {
    db.exec('DELETE FROM sqlite_sequence WHERE name = ?', [
      String(row.name),
    ]);
    db.exec('INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)', [
      String(row.name),
      RECIPIENT_ID_BASE,
    ]);
  }
}

/**
 * A character holding a distinctive value in EVERY column of every shared
 * table.
 *
 * Distinctive means "not the column's declared default and not null", and the
 * test asserts it column by column rather than trusting this function — a
 * column left at its default would make a `verbatim` comparison pass without
 * proving anything, which is the failure mode a guard like this dies of.
 */
function seedSender(db: DatabaseContext, catalog: Catalog): number {
  const characterId = db.exec(
    `INSERT INTO characters (
       name, strength, dexterity, constitution, intelligence, wisdom,
       charisma, ability_allocation_method, proficiency_bonus_override,
       rules_edition_preference, allow_legacy, revision, notes, created_at,
       updated_at
     ) VALUES (
       'Portability Probe', 8, 14, 13, 18, 12, 11, 'manual', 4, 'expanded',
       1, 7, 'sender private character note', ?, ?
     )`,
    [SENDER_TIME, SENDER_TIME],
  ).lastInsertId;

  db.exec(
    `INSERT INTO character_class_levels (
       character_id, class_definition_id, subclass_definition_id, level,
       is_starting_class, spellcasting_ability_override, notes,
       created_at, updated_at
     ) VALUES (?, ?, ?, 4, 1, 'intelligence', 'sender class-level note', ?, ?)`,
    [characterId, catalog.classId, catalog.subclassId, SENDER_TIME, SENDER_TIME],
  );

  const source = (
    type: string,
    definitionId: number,
    displayName: string,
    config: string,
    acquired: number,
    uuid: string,
  ): number =>
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state, notes,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'sender source note', ?, ?)`,
      [
        characterId,
        uuid,
        type,
        definitionId,
        displayName,
        config,
        acquired,
        SENDER_TIME,
        SENDER_TIME,
      ],
    ).lastInsertId;

  const classSourceId = source(
    'class',
    catalog.classId,
    'Wizard 4',
    '{"spellcasting_ability":"intelligence","custom_choice":"ward"}',
    1,
    'sender-class-source',
  );
  const subclassSourceId = source(
    'subclass',
    catalog.subclassId,
    'Evoker',
    '{"spellcasting_ability":"intelligence","evocation_focus":"sculpt"}',
    4,
    'sender-subclass-source',
  );
  const featSourceId = source(
    'feat',
    catalog.featId,
    'Alert (sender label)',
    '{"feat_choice":"initiative"}',
    4,
    'sender-feat-source',
  );

  const generator = new GrantRuleSlotGenerator(db);
  generator.generateForSource(classSourceId);
  generator.generateForSource(subclassSourceId);

  // A source the sender's own grant rules produced and then retired. It exists
  // so `state` and `parent_source_instance_id` hold a distinctive value the
  // recipient must never receive — inserted AFTER the generator has run, since
  // reconciliation would otherwise remove a child nothing asked for.
  db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, parent_source_instance_id, source_type,
       source_definition_id, display_name, config,
       acquired_at_character_level, state, notes, created_at, updated_at
     ) VALUES (
       ?, 'sender-tombstoned-child', ?, 'feat', ?, 'Retired grant',
       '{"sender":"tombstoned"}', 2, 'tombstoned', 'sender tombstone note', ?, ?
     )`,
    [characterId, classSourceId, catalog.featId, SENDER_TIME, SENDER_TIME],
  );

  // EVERY DERIVED SLOT COLUMN GETS A DECOY, and each one differs from what the
  // recipient's own grant rules will produce. That is what makes the exception
  // list falsifiable: if any of these started travelling, the value below would
  // turn up in the recipient's database.
  db.exec(
    `UPDATE spell_selection_slots SET
       slot_key = 'sender-slot-key-' || id,
       bucket = 'spellbook',
       eligibility_kind = 'choice_from_list',
       label = 'sender slot label',
       spell_level_min = 3,
       spell_level_max = 7,
       allowed_spell_lists = '["sender-list"]',
       allowed_schools = '["Sender School"]',
       allowed_tags = '["sender-tag"]',
       always_prepared = 1,
       with_slots = 0,
       free_cast = '{"sender":"free-cast"}',
       counts_against_limit = 0,
       -- The recipient's own rule makes these slots required and unlocked, so
       -- the decoy for each is the value the recipient will NOT produce. A
       -- boolean has only two values; picking the same one the derivation
       -- produces would make the check unfalsifiable rather than passing.
       required = 0,
       is_locked = 1,
       orphan_reason_code = 'sender_orphan_reason',
       orphaned_at = ?,
       prior_config = '{"sender":"prior"}',
       override_note = 'sender override note',
       sort_order = 42,
       notes = 'sender slot note',
       selection_collection = 'sender-collection',
       selection_eligibility = 'invalid',
       selection_invalid_reason = 'sender invalid reason',
       selection_acquired_at_class_level = 4,
       created_at = ?,
       updated_at = ?
     WHERE character_id = ?`,
    [SENDER_TIME, SENDER_TIME, SENDER_TIME, characterId],
  );
  db.exec(
    `UPDATE spell_selection_slots
     SET current_spell_version_id = ?, state = 'kept_override'
     WHERE character_id = ? AND rule_key = 'wizard-chosen'`,
    [catalog.chosenSpellId, characterId],
  );
  // The second slot holds a FIXED spell and no selection, which is the only
  // arrangement the exclusive-assignment CHECK allows for a distinctive
  // `fixed_spell_version_id`. It is not exported at all, and that is the point.
  db.exec(
    `UPDATE spell_selection_slots
     SET fixed_spell_version_id = ?, current_spell_version_id = NULL,
         selection_acquired_at_class_level = NULL, state = 'active'
     WHERE character_id = ? AND rule_key = 'wizard-spare'`,
    [catalog.spareSpellId, characterId],
  );

  db.exec(
    `UPDATE wizard_spellbook_entries
     SET spell_version_id = ?,
         spell_level_min = 3,
         spell_level_max = 7,
         allowed_spell_lists = '["sender-list"]',
         allowed_schools = '["Sender School"]',
         allowed_tags = '["sender-tag"]',
         orphan_reason_code = 'sender_orphan_reason',
         orphaned_at = ?,
         selection_eligibility = 'invalid',
         selection_invalid_reason = 'sender invalid reason',
         created_at = ?,
         updated_at = ?
     WHERE character_id = ? AND rule_key = 'wizard-spellbook'`,
    [
      catalog.spareSpellId,
      SENDER_TIME,
      SENDER_TIME,
      SENDER_TIME,
      characterId,
    ],
  );
  db.exec(
    `INSERT INTO wizard_spellbook_entries (
       character_id, spell_version_id, state, orphan_reason_code,
       orphaned_at, selection_eligibility, selection_invalid_reason,
       created_at, updated_at
     ) VALUES (
       ?, ?, 'orphaned', 'sender_retired_acquisition', ?, 'invalid',
       'sender retired acquisition', ?, ?
     )`,
    [
      characterId,
      catalog.chosenSpellId,
      SENDER_TIME,
      SENDER_TIME,
      SENDER_TIME,
    ],
  );
  db.exec(
    `INSERT INTO character_spell_preferences
       (character_id, spell_version_id, favourite, notes, created_at, updated_at)
     VALUES (?, ?, 1, 'sender preference note', ?, ?)`,
    [characterId, catalog.chosenSpellId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO character_rule_overrides
       (character_id, rule_key, value, note, created_at, updated_at)
     VALUES (?, 'wizard-chosen', '{"count":7}', 'sender override reason', ?, ?)`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO warning_acknowledgements
       (character_id, warning_fingerprint, note, invalidated_at,
        created_at, updated_at)
     VALUES (?, 'warning:live', 'sender acknowledgement note', NULL, ?, ?)`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO warning_acknowledgements
       (character_id, warning_fingerprint, note, invalidated_at,
        created_at, updated_at)
     VALUES (?, 'warning:retired', NULL, ?, ?, ?)`,
    [characterId, SENDER_TIME, SENDER_TIME, SENDER_TIME],
  );
  const loadoutId = db.exec(
    `INSERT INTO spell_loadouts (character_id, name, notes, created_at, updated_at)
     VALUES (?, 'Sender Loadout', 'sender loadout note', ?, ?)`,
    [characterId, SENDER_TIME, SENDER_TIME],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_loadout_entries
       (spell_loadout_id, spell_version_id, role, created_at, updated_at)
     VALUES (?, ?, 'sender-role', ?, ?)`,
    [loadoutId, catalog.chosenSpellId, SENDER_TIME, SENDER_TIME],
  );
  const ownedWeaponId = db.exec(
    `INSERT INTO character_weapons (
       character_id, name,
       damage_kind, damage_dice, damage_flat, damage_custom, damage_type,
       versatile_damage_kind, versatile_damage_dice, versatile_damage_flat,
       versatile_damage_custom,
       finesse, heavy, light, loading, reach, thrown, two_handed, ammunition,
       ammunition_kind, range_kind, range_near_feet, range_far_feet,
       mastery_property,
       mastery_selected, other_properties, notes, proficiency_category,
       attack_kind,
       created_at, updated_at
     ) VALUES (
       ?, 'Sender Custom Halberd',
       'custom', NULL, NULL, 'weapon damage by table', 'Slashing',
       'custom', NULL, NULL, 'two-handed damage by table',
       1, 1, 1, 1, 1, 1, 1, 1,
       'bolt', 'ranged', 25, 65, 'Vex', 1, 'sender other properties',
       'sender weapon note', 'martial', 'melee', ?, ?
     )`,
    [characterId, SENDER_TIME, SENDER_TIME],
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_weapons (
       character_id, name,
       damage_kind, damage_dice, damage_flat, damage_custom,
       versatile_damage_kind, versatile_damage_dice, versatile_damage_flat,
       versatile_damage_custom
     ) VALUES (
       ?, 'Sender Dice Weapon',
       'dice', '2d6', NULL, NULL,
       'dice', '2d8', NULL, NULL
     )`,
    [characterId],
  );
  db.exec(
    `INSERT INTO character_weapons (
       character_id, name,
       damage_kind, damage_dice, damage_flat, damage_custom,
       versatile_damage_kind, versatile_damage_dice, versatile_damage_flat,
       versatile_damage_custom
     ) VALUES (
       ?, 'Sender Flat Zero Weapon',
       'flat', NULL, 0, NULL,
       'flat', NULL, 1, NULL
     )`,
    [characterId],
  );
  db.exec(
    `INSERT INTO character_species (
       character_id, name, creature_type, size, base_speed_feet, notes,
       created_at, updated_at
     ) VALUES (?, 'Sender Species', 'Fey', 'Small', 35, 'sender species note', ?, ?)`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  for (const [order, name] of [
    [3, 'Sender Trait One'],
    [7, 'Sender Trait Two'],
  ] as const) {
    db.exec(
      `INSERT INTO character_species_traits (
         character_id, sort_order, name, description, notes,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        order,
        name,
        `sender description for ${name}`,
        `sender note for ${name}`,
        SENDER_TIME,
        SENDER_TIME,
      ],
    );
  }
  db.exec(
    `INSERT INTO character_background (
       character_id, name, ability_score_1, ability_score_2, ability_score_3,
       feat_name, skill_proficiency_1, skill_proficiency_2, tool_proficiency,
       equipment_option_a, equipment_option_b, notes, created_at, updated_at
     ) VALUES (
       ?, 'Sender Background', 'strength', 'dexterity', 'wisdom',
       'Sender Feat', 'arcana', 'stealth', 'sender tools',
       'sender option a', 'sender option b', 'sender background note', ?, ?
     )`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO character_armor (
       character_id, slot, name, category, armor_class,
       dex_bonus, dex_bonus_max, strength_requirement, stealth_disadvantage,
       notes, created_at, updated_at
     ) VALUES (
       ?, 'worn', 'Sender Half Plate', 'medium', 15, 'capped', 2, 13, 1,
       'sender armour note', ?, ?
     )`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO character_armor (
       character_id, slot, name, category, armor_class, dex_bonus,
       stealth_disadvantage, created_at, updated_at
     ) VALUES (?, 'shield', 'Sender Shield', 'shield', 2, 'none', 0, ?, ?)`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  for (const [level, rolled] of [
    [2, 5],
    [3, 11],
  ] as const) {
    db.exec(
      `INSERT INTO character_hit_point_rolls (
         character_id, class_name, class_level, rolled_value,
         created_at, updated_at
       ) VALUES (?, 'Wizard', ?, ?, ?, ?)`,
      [characterId, level, rolled, SENDER_TIME, SENDER_TIME],
    );
  }
  for (const skill of ['arcana', 'stealth'] as const) {
    db.exec(
      `INSERT INTO character_skill_proficiencies
         (character_id, skill, created_at, updated_at)
       VALUES (?, ?, ?, ?)`,
      [characterId, skill, SENDER_TIME, SENDER_TIME],
    );
  }
  // The skill GRANTS the two flat rows above are the projection of: a filled
  // class grant (arcana), an UNFILLED class grant whose null selection must
  // survive the wire, and a filled feat-source grant (stealth). Inserted
  // AFTER the generator ran, like the tombstoned child above — the class arm
  // reconciles the keys it owns and this catalog seeds no entitlement.
  const skillGrant = (
    sourceId: number,
    grantKey: string,
    ordinal: number,
    skill: string | null,
  ): void => {
    db.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill,
         state, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
      [characterId, sourceId, grantKey, ordinal, skill, SENDER_TIME, SENDER_TIME],
    );
  };
  skillGrant(classSourceId, 'class_skill', 1, 'arcana');
  skillGrant(classSourceId, 'class_skill', 2, null);
  skillGrant(featSourceId, 'probe_feat_skill', 1, 'stealth');
  for (const [ordinal, skill] of [
    [1, 'arcana'],
    [2, 'stealth'],
  ] as const) {
    db.exec(
      `INSERT INTO character_skill_expertise_grants (
         character_id, source_instance_id, grant_key, ordinal,
         granted_at_class_level, skill, state, created_at, updated_at
       ) VALUES (?, ?, 'portability_expertise', ?, 1, ?, 'active', ?, ?)`,
      [
        characterId,
        classSourceId,
        ordinal,
        skill,
        SENDER_TIME,
        SENDER_TIME,
      ],
    );
  }
  // An ORPHANED grant, so `state`, `orphan_reason_code` and `orphaned_at`
  // hold distinctive values on a row the export deliberately keeps off the
  // wire — the `provedByExcludedRow` proof for all three columns.
  db.exec(
    `INSERT INTO character_skill_grants (
       character_id, source_instance_id, grant_key, ordinal, skill,
       state, orphan_reason_code, orphaned_at, created_at, updated_at
     ) VALUES (?, ?, 'class_skill', 3, 'perception', 'orphaned',
       'sender_orphan_reason', ?, ?, ?)`,
    [characterId, classSourceId, SENDER_TIME, SENDER_TIME, SENDER_TIME],
  );
  const ownedItemId = db.exec(
    `INSERT INTO character_items (
       character_id, name, description, quantity, requires_attunement,
       source_instance_id, created_at, updated_at
     ) VALUES (?, 'Sender Trinket', 'sender item description', 4, 1, ?, ?, ?)`,
    [characterId, classSourceId, SENDER_TIME, SENDER_TIME],
  ).lastInsertId;
  const secondItemId = db.exec(
    `INSERT INTO character_items (
       character_id, name, description, quantity, requires_attunement,
       source_instance_id, created_at, updated_at
     ) VALUES (?, 'Sender Ring', 'second attuned item', 2, 1, ?, ?, ?)`,
    [characterId, classSourceId, SENDER_TIME, SENDER_TIME],
  ).lastInsertId;
  const thirdItemId = db.exec(
    `INSERT INTO character_items (
       character_id, name, description, quantity, requires_attunement,
       source_instance_id, created_at, updated_at
     ) VALUES (?, 'Sender Boots', 'third attuned item', 3, 1, ?, ?, ?)`,
    [characterId, classSourceId, SENDER_TIME, SENDER_TIME],
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_attunement_slots (
       character_id, slot_1_item_id, slot_2_item_id, slot_3_item_id
     ) VALUES (?, ?, ?, ?)`,
    [characterId, ownedItemId, secondItemId, thirdItemId],
  );
  // Four effects, because the per-kind CHECK constraints refuse to let one row
  // carry a damage type, a hit point payload and a speed bonus at once. The
  // sort orders are 3, 6, 9 so the recipient's dense renumbering from 1 is
  // visible while the ORDER itself stays comparable.
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, damage_type, source_instance_id,
       character_item_id, template_ref, label, notes, created_at, updated_at
     ) VALUES (?, 3, 'damage_resistance', 'Fire', ?,
       ?, 'class_feature_effects:9001', 'Sender Resistance',
       'sender effect note', ?, ?)`,
    [characterId, classSourceId, ownedItemId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, hit_points_flat,
       hit_points_per_level, source_instance_id, label, notes,
       created_at, updated_at
     ) VALUES (?, 6, 'hp_modifier', 3, 2, ?, 'Sender Toughness', NULL, ?, ?)`,
    [characterId, subclassSourceId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, speed_bonus_feet,
       source_instance_id, label, notes, created_at, updated_at
     ) VALUES (?, 9, 'speed', 10, NULL, 'Sender Speed', NULL, ?, ?)`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, ability, amount, maximum,
       source_instance_id, label, notes, created_at, updated_at
     ) VALUES (
       ?, 12, 'ability_increase', 'intelligence', 2, 20, ?,
       'Sender Training', 'sender contribution note', ?, ?
     )`,
    [characterId, classSourceId, SENDER_TIME, SENDER_TIME],
  );
  // TWO MORE EFFECTS (AC-1, D72), proving the five new payload columns:
  // `armor_class_formula` carries base/ability_1/ability_2/allows_shield;
  // `attack_ability_override` carries weapon_scope (and reuses `ability`,
  // already proved distinctive by the ability_increase row above).
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, base, ability_1, ability_2,
       allows_shield, label, notes, created_at, updated_at
     ) VALUES (
       ?, 15, 'armor_class_formula', 13, 'dexterity', 'constitution', 1,
       'Sender Shell', 'sender formula note', ?, ?
     )`,
    [characterId, SENDER_TIME, SENDER_TIME],
  );
  db.exec(
    `INSERT INTO character_effects (
       character_id, sort_order, effect_kind, ability, weapon_scope,
       character_weapon_id, label, notes, created_at, updated_at
     ) VALUES (
       ?, 18, 'attack_ability_override', 'charisma', 'one_bonded_weapon',
       ?, 'Sender Pact', 'sender override note', ?, ?
     )`,
    [characterId, ownedWeaponId, SENDER_TIME, SENDER_TIME],
  );
  // A SAVE POINT. It is `backup: true, share: false`, so it plays no part in
  // the share probe above and would leave the backup comparison below with an
  // empty table — the vacuous pass a guard like this dies of. The snapshot is a
  // real capture rather than hand-written JSON, because the backup import
  // re-parses it.
  db.exec(
    `INSERT INTO character_save_points
       (character_id, label, snapshot, schema_version, created_at, updated_at)
     VALUES (?, 'Sender save point', ?, ?, ?, ?)`,
    [
      characterId,
      JSON.stringify(new CharacterState(db).capture(characterId)),
      CHARACTER_SNAPSHOT_SCHEMA_VERSION,
      SENDER_TIME,
      SENDER_TIME,
    ],
  );
  return characterId;
}

// --- the engine -----------------------------------------------------------

interface RuntimeProbe {
  readonly scope?: string;
  readonly travels?: string;
  readonly order: string;
  readonly columns: Readonly<Record<string, Portability>>;
}

const RUNTIME_PROBES: Readonly<Record<string, RuntimeProbe>> = PROBES;

const PROBED_TABLES = Object.keys(RUNTIME_PROBES);

/**
 * REMOVED COLUMNS ARE HISTORICAL PORTABILITY DECISIONS TOO.
 *
 * `background_equipment_items` is catalog content and therefore does not
 * travel in a character share, but deleting its old classification without a
 * word would make that easy to mistake for an overlooked shared value. D40
 * retires the numeric limb only after the database migration renders its value
 * into `item_name`; this record pins both halves of that decision here.
 */
const RETIRED_COLUMN_DECISIONS = [
  {
    table: 'background_equipment_items',
    column: 'coin_copper',
    why:
      'The table is recipient-seeded catalog content, not character data sent in a share. Migration 0004 renders every historical value into the ordinary gear item_name before the numeric column is removed.',
  },
] as const satisfies readonly {
  readonly table: AnyTableName;
  readonly column: string;
  readonly why: string;
}[];

type RecipientSeededColumn = {
  readonly kind: 'omitted';
  readonly fixture: SqlValue;
  readonly why: string;
};

/**
 * D30 classification for recipient-seeded catalog tables.
 *
 * Every column is omitted because these rows are reconstructed from bundled
 * SRD extracts on the recipient. The per-column fixtures are deliberately
 * non-default so the same instrument rule as the round-trip probes applies: a
 * classification sitting on its declared default proves nothing.
 */
const RECIPIENT_SEEDED_CATALOG_COLUMNS = {
  feat_definitions: {
    id: {
      kind: 'omitted',
      fixture: 7101,
      why: 'Recipient-seeded feat catalog row id; database identifiers have no portable meaning and no feat definition row travels.',
    },
    content_key: {
      kind: 'omitted',
      fixture: '2024:feat:portability-origin',
      why: 'Recipient-seeded feat catalog key; shares carry this key only as a reference and the definition itself does not travel.',
    },
    name: {
      kind: 'omitted',
      fixture: 'Portability Origin Feat',
      why: 'Recipient-seeded SRD feat name; the recipient resolves its own bundled definition and no definition prose travels.',
    },
    rules_edition: {
      kind: 'omitted',
      fixture: 'expanded',
      why: 'Recipient-seeded feat rules edition; it identifies recipient catalog content rather than character-owned portable data.',
    },
    category: {
      kind: 'omitted',
      fixture: 'portability_group',
      why: 'Recipient-seeded feat grouping; the recipient rebuilds catalog grouping from its extract and no definition row travels.',
    },
    min_level: {
      kind: 'omitted',
      fixture: 12,
      why: 'Recipient-seeded feat eligibility level; the recipient rebuilds this catalog rule and no character choice value travels.',
    },
    ability_points: {
      kind: 'omitted',
      fixture: 2,
      why: 'Recipient-seeded feat ability-point grant; the recipient rebuilds this catalog rule and no character-owned value travels.',
    },
    repeatable: {
      kind: 'omitted',
      fixture: 1,
      why: 'Recipient-seeded feat repeatability rule; the recipient owns the definition and a sender definition row does not travel.',
    },
    prerequisites: {
      kind: 'omitted',
      fixture: '{"kind":"portability-prerequisite"}',
      why: 'Recipient-seeded feat prerequisite JSON; the recipient owns qualification rules and no sender definition row travels.',
    },
    grant_rules: {
      kind: 'omitted',
      fixture: '[{"kind":"portability-grant"}]',
      why: 'Recipient-seeded feat grant-rule JSON; the recipient owns effect definitions and no sender definition row travels.',
    },
    notes: {
      kind: 'omitted',
      fixture: 'Portability-only feat benefit text',
      why: 'Recipient-seeded feat benefit text; the recipient rebuilds licensed catalog prose and share links do not carry it.',
    },
    created_at: {
      kind: 'omitted',
      fixture: '2043-04-05T06:07:08.000Z',
      why: 'Recipient-seeded catalog timestamp; a sender database creation time is not character data and does not travel.',
    },
    updated_at: {
      kind: 'omitted',
      fixture: '2044-05-06T07:08:09.000Z',
      why: 'Recipient-seeded catalog timestamp; a sender database update time is not character data and does not travel.',
    },
  },
  class_equipment_items: {
    id: {
      kind: 'omitted',
      fixture: 7001,
      why: 'Recipient-seeded catalog row id; database identifiers have no portable meaning and no class package row travels.',
    },
    class_definition_id: {
      kind: 'omitted',
      fixture: 7002,
      why: 'Recipient-seeded class catalog parent; the recipient resolves its own bundled class and no package row travels.',
    },
    option: {
      kind: 'omitted',
      fixture: 'c',
      why: 'Recipient-seeded SRD package label; class equipment is catalog content, not character data sent in a share.',
    },
    sort_order: {
      kind: 'omitted',
      fixture: 7,
      why: 'Recipient-seeded SRD package order; class equipment is catalog content, not character data sent in a share.',
    },
    quantity: {
      kind: 'omitted',
      fixture: 8,
      why: 'Recipient-seeded SRD item quantity; class equipment is catalog content, not character data sent in a share.',
    },
    item_name: {
      kind: 'omitted',
      fixture: 'Portability Javelins',
      why: 'Recipient-seeded SRD printed item name; class equipment is catalog content, not character data sent in a share.',
    },
    item_kind: {
      kind: 'omitted',
      fixture: 'weapon',
      why: 'Recipient-seeded SRD item classification; class equipment is catalog content, not character data sent in a share.',
    },
    weapon_template_id: {
      kind: 'omitted',
      fixture: 7003,
      why: 'Recipient-seeded catalog reference; the recipient owns both catalogs and no sender template id can travel.',
    },
    armor_template_id: {
      kind: 'omitted',
      fixture: 7004,
      why: 'Recipient-seeded catalog reference; the recipient owns both catalogs and no sender template id can travel.',
    },
    created_at: {
      kind: 'omitted',
      fixture: '2041-02-03T04:05:06.000Z',
      why: 'Recipient-seeded catalog timestamp; a sender database creation time is not character data and does not travel.',
    },
    updated_at: {
      kind: 'omitted',
      fixture: '2042-03-04T05:06:07.000Z',
      why: 'Recipient-seeded catalog timestamp; a sender database update time is not character data and does not travel.',
    },
  },
} as const satisfies {
  readonly feat_definitions: Readonly<
    Record<ColumnNamesOf<'feat_definitions'>, RecipientSeededColumn>
  >;
  readonly class_equipment_items: Readonly<
    Record<ColumnNamesOf<'class_equipment_items'>, RecipientSeededColumn>
  >;
};

/** `PRAGMA table_info`, as `column -> declared default` (undefined for none). */
function declaredDefaults(
  db: DatabaseContext,
  table: string,
): Map<string, SqlValue> {
  const defaults = new Map<string, SqlValue>();
  for (const row of db.allRaw(`PRAGMA table_info("${table}")`)) {
    if (row.dflt_value === null || row.dflt_value === undefined) {
      continue;
    }
    defaults.set(String(row.name), normalizeDefault(String(row.dflt_value)));
  }
  return defaults;
}

/**
 * A declared default as the value the engine actually stores.
 *
 * `DEFAULT false` stores `0` and `DEFAULT 'active'` stores `active`, so the
 * literal text of the declaration cannot be compared to a read-back value
 * directly.
 */
function normalizeDefault(text: string): SqlValue {
  if (text === 'false') {
    return 0;
  }
  if (text === 'true') {
    return 1;
  }
  if (text.startsWith("'") && text.endsWith("'")) {
    return text.slice(1, -1).replaceAll("''", "'");
  }
  const numeric = Number(text);
  return Number.isNaN(numeric) ? text : numeric;
}

/**
 * `travelling` — the sender's rows the document is supposed to carry, and the
 * only ones a recipient row can be paired with. `excluded` — the rows the
 * sender deliberately keeps off the wire, which is where the proof lives for a
 * column the export's own WHERE clause reads. `all` — everything.
 */
type RowSet = 'travelling' | 'excluded' | 'all';

function readRows(
  db: DatabaseContext,
  table: string,
  probe: RuntimeProbe,
  characterId: number,
  rows: RowSet,
): SqlRow[] {
  const projections = Object.entries(probe.columns)
    .filter(([, disposition]) => disposition.kind === 'translated')
    .map(
      ([column, disposition]) =>
        `${(disposition as { key: string }).key} AS "key:${column}"`,
    );
  const columns = Object.keys(probe.columns).map(
    (column) => `t."${column}"`,
  );
  const predicate = probe.travels ?? '1 = 1';
  const travels =
    rows === 'all'
      ? ''
      : rows === 'travelling'
        ? ` AND (${predicate})`
        : ` AND NOT (${predicate})`;
  return db.allRaw(
    `SELECT ${[...columns, ...projections].join(', ')}
     FROM "${table}" AS t
     WHERE ${probe.scope ?? 't.character_id = ?'}${travels}
     ORDER BY ${probe.order}`,
    [characterId],
  );
}

interface RoundTrip {
  readonly sender: DatabaseContext;
  readonly recipient: DatabaseContext;
  readonly senderCharacterId: number;
  readonly recipientCharacterId: number;
  /**
   * THE SAME CHARACTER, SENT ON THE EXPORT'S DEFAULTS — no options at all.
   *
   * This is where an `opt_in` column's other half is proved, and it has to be a
   * SECOND real round trip rather than an assertion about the document: a
   * column dropped from the wire and a column dropped by the INSERT look
   * identical from here, and only a value that fails to arrive in a database
   * proves either.
   */
  readonly optedOut: DatabaseContext;
  readonly optedOutCharacterId: number;
}

const connections: Database[] = [];
let trip: RoundTrip;

async function context(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  return new DatabaseContext(connection);
}

beforeAll(async () => {
  const sender = await context();
  const senderCharacterId = seedSender(sender, seedCatalog(sender));

  const recipient = await context();
  offsetSequences(recipient);
  seedCatalog(recipient, false);

  // Through the real fragment, not straight from the object: a value dropped
  // by the encoder is as lost as one dropped by the INSERT.
  //
  // EVERY OPT-IN IS ASKED FOR HERE, which is what makes the `verbatim`
  // classifications on `warning_acknowledgements` and `spell_loadouts` mean
  // what they say — with the flags off those tables send no rows at all, and
  // the row-count check below would fail before any column was compared.
  const document = exportCharacterShare(sender, senderCharacterId, {
    acknowledgements: true,
    loadouts: true,
    notes: true,
  });
  const decoded = await decodeShareFragment(
    await encodeShareFragment(document),
  );
  const { characterId: recipientCharacterId } = importCharacterShare(
    recipient,
    decoded,
  );

  // AND THE SAME CHARACTER AGAIN, ON THE DEFAULTS. No options object at all,
  // so this is what the export does when nobody asks it for anything — which
  // is also what every link minted before the flags existed carries.
  const optedOut = await context();
  offsetSequences(optedOut);
  seedCatalog(optedOut, false);
  const plain = await decodeShareFragment(
    await encodeShareFragment(exportCharacterShare(sender, senderCharacterId)),
  );
  const { characterId: optedOutCharacterId } = importCharacterShare(
    optedOut,
    plain,
  );

  trip = {
    sender,
    recipient,
    senderCharacterId,
    recipientCharacterId,
    optedOut,
    optedOutCharacterId,
  };
});

afterAll(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
});

describe('every column of every shared table is classified', () => {
  it('probes the character root, all twenty-one share tables, and spell references', () => {
    expect([...PROBED_TABLES].sort()).toEqual(
      ['characters', 'spell_versions', ...Object.keys(SHARE_TABLES)].sort(),
    );
    // The type already forces the twenty-one current shared tables; AC-4 removed
    // the historical adjustment shell from that scope. The exact runtime
    // roster additionally pins the character root and reference-only spell row.
    expect(PROBED_TABLES).toHaveLength(23);
  });

  it('records why each deliberately retired column no longer travels', () => {
    expect(RETIRED_COLUMN_DECISIONS).toEqual([
      {
        table: 'background_equipment_items',
        column: 'coin_copper',
        why:
          'The table is recipient-seeded catalog content, not character data sent in a share. Migration 0004 renders every historical value into the ordinary gear item_name before the numeric column is removed.',
      },
    ]);
    for (const decision of RETIRED_COLUMN_DECISIONS) {
      const live = trip.sender
        .allRaw(`PRAGMA table_info("${decision.table}")`)
        .map((row) => String(row.name));
      expect(live, `${decision.table}.${decision.column} is still live`)
        .not.toContain(decision.column);
      expect(decision.why.length).toBeGreaterThan(80);
    }
  });

  it('classifies every recipient-seeded catalog column', () => {
    for (const table of [
      'feat_definitions',
      'class_equipment_items',
    ] as const) {
      expect(Object.keys(SHARE_TABLES)).not.toContain(table);
      const columns = RECIPIENT_SEEDED_CATALOG_COLUMNS[table];
      const live = trip.sender
        .allRaw(`PRAGMA table_info("${table}")`)
        .map((row) => String(row.name));
      expect(Object.keys(columns).sort()).toEqual(live.sort());

      const defaults = declaredDefaults(trip.sender, table);
      for (const [column, decision] of Object.entries(columns)) {
        expect(decision.kind).toBe('omitted');
        expect(
          decision.fixture,
          `${table}.${column} fixture equals its default`,
        ).not.toBe(defaults.get(column));
        expect(decision.why.length, `${table}.${column} has no real reason`)
          .toBeGreaterThan(80);
      }
    }
  });

  it.each(PROBED_TABLES)(
    'classifies exactly the columns %s really has',
    (table) => {
      const live = trip.sender
        .allRaw(`PRAGMA table_info("${table}")`)
        .map((row) => String(row.name));
      expect(live.slice().sort()).toEqual(
        Object.keys(RUNTIME_PROBES[table]?.columns ?? {}).sort(),
      );
      expect(live.length).toBeGreaterThan(0);
    },
  );

  it('gives every declared exception a reason of its own', () => {
    for (const [table, probe] of Object.entries(RUNTIME_PROBES)) {
      for (const [column, disposition] of Object.entries(probe.columns)) {
        if (disposition.kind === 'verbatim') {
          continue;
        }
        expect(
          disposition.why.length,
          `${table}.${column} has no reason`,
        ).toBeGreaterThan(40);
      }
    }
  });
});

describe('a share link carries every column it claims to', () => {
  it.each(PROBED_TABLES)('%s', (table) => {
    const probe = RUNTIME_PROBES[table] as RuntimeProbe;
    const sent = readRows(
      trip.sender,
      table,
      probe,
      trip.senderCharacterId,
      'travelling',
    );
    const withheld = readRows(
      trip.sender,
      table,
      probe,
      trip.senderCharacterId,
      'excluded',
    );
    const received = readRows(
      trip.recipient,
      table,
      probe,
      trip.recipientCharacterId,
      'all',
    );
    const defaults = declaredDefaults(trip.sender, table);

    // A table whose rows stopped arriving would make every column comparison
    // below vacuous, so the row count is checked first and by itself.
    expect(sent.length, `${table}: the sender has no rows to send`)
      .toBeGreaterThan(0);
    expect(received.length, `${table}: rows did not survive the link`).toBe(
      sent.length,
    );

    for (const [column, disposition] of Object.entries(probe.columns)) {
      const distinctive = (row: SqlRow): boolean => {
        const value = row[column];
        return (
          value !== null &&
          value !== undefined &&
          value !== defaults.get(column)
        );
      };

      if (disposition.kind === 'opt_in') {
        // Half one: it really is the sender's own value that arrives, and the
        // sender really is holding something worth proving. A column sitting at
        // its default would make the comparison pass while proving nothing —
        // the failure mode this whole file is built to avoid.
        expect(
          sent.filter(distinctive).length,
          `${table}.${column} is declared as travelling when ${disposition.option} is asked for, but every sent row holds its default, so nothing was proved`,
        ).toBeGreaterThan(0);
        expect(
          received.map((row) => row[column]),
          `${table}.${column} did not survive the link with ${disposition.option} asked for`,
        ).toEqual(sent.map((row) => row[column]));

        // Half two: with nobody asking, it does not arrive. The row must still
        // be there — an `opt_in` COLUMN on a table whose rows vanish with the
        // flag is a whole-table opt-in, which is a different shape and is not
        // classified this way.
        const withoutOption = readRows(
          trip.optedOut,
          table,
          probe,
          trip.optedOutCharacterId,
          'all',
        );
        expect(
          withoutOption.length,
          `${table}.${column} is declared opt-in, but with ${disposition.option} unasked the table carries a different number of rows — that is a whole-table opt-in, not a column one`,
        ).toBe(sent.length);
        expect(
          sent.some(
            (row, index) => withoutOption[index]?.[column] !== row[column],
          ),
          `${table}.${column} is declared as travelling ONLY when ${disposition.option} is asked for, and it arrived in a link that never asked`,
        ).toBe(true);
        continue;
      }

      if (disposition.kind === 'omitted') {
        // BOTH DIRECTIONS MEET HERE. The sender holds a value the recipient's
        // own derivation would not produce; the recipient holding it anyway
        // means the column has started travelling and the exception is a lie.
        if (disposition.provedByExcludedRow === true) {
          expect(
            withheld.length,
            `${table}.${column} claims to be proved by a row the sender keeps off the wire, and the sender has no such row`,
          ).toBeGreaterThan(0);
          const arrived = received.map((row) => row[column]);
          for (const row of withheld) {
            expect(
              arrived,
              `${table}.${column} is declared as NOT travelling, and a value from a row that never travelled reached the recipient`,
            ).not.toContain(row[column]);
          }
          continue;
        }
        expect(
          sent.some((row, index) => received[index]?.[column] !== row[column]),
          `${table}.${column} is declared as NOT travelling, and every row of the recipient's copy holds exactly what the sender held`,
        ).toBe(true);
        continue;
      }

      if (disposition.kind === 'translated') {
        const key = `key:${column}`;
        expect(
          sent.filter((row) => row[key] !== null).length,
          `${table}.${column} resolved to no portable key, so nothing was proved`,
        ).toBeGreaterThan(0);
        expect(
          received.map((row) => row[key]),
          `${table}.${column} did not survive the link`,
        ).toEqual(sent.map((row) => row[key]));
        // ...and the raw identifier really was re-resolved rather than copied.
        for (const [index, row] of sent.entries()) {
          if (row[column] === null) {
            continue;
          }
          expect(
            received[index]?.[column],
            `${table}.${column} arrived holding the SENDER's row id`,
          ).not.toBe(row[column]);
        }
        continue;
      }

      expect(
        sent.filter(distinctive).length,
        `${table}.${column} is declared as travelling, but every sent row holds its default, so nothing was proved`,
      ).toBeGreaterThan(0);
      expect(
        received.map((row) => row[column]),
        `${table}.${column} did not survive the link`,
      ).toEqual(sent.map((row) => row[column]));
    }
  });
});

/**
 * THE SAME QUESTION, ASKED OF THE OTHER TWO PORTABLE SCOPES.
 *
 * Share is the scope with the structural hazard: it READS with `SELECT *` and
 * WRITES with hand-enumerated column lists, so the two halves can drift apart.
 * Backup (`character-backup.ts`) and undo/redo snapshots
 * (`character-state.ts`) do NOT have that shape — both read with `SELECT *`
 * and build their INSERT column list from `Object.keys(row)`, so a column
 * added to a table travels without anybody wiring it.
 *
 * That is an argument, and an argument is not a guard. These two tests turn it
 * into one: the same fully-populated character goes through each path and
 * every column is compared. Nothing is hand-classified, because there is
 * nothing to classify — a generic path either carries everything or has
 * stopped being generic, and the day it stops these fail.
 *
 * The exclusions are a RULE rather than a list: a column naming a row id cannot
 * survive a move into another database, and `instance_uuid` is deliberately
 * reminted (with `slot_key`, which embeds it). One column does not fit the rule
 * and is named — `character_save_points.snapshot`, a JSON document full of row
 * ids that the import rewrites for exactly the reason the ids themselves are
 * rewritten. Naming it is the honest cost of the rule being a rule; every other
 * column of every backed-up table is compared, byte for byte.
 */
const REMAPPED = /^id$|_id$|^instance_uuid$|^slot_key$|^snapshot$/;

function everyRow(
  db: DatabaseContext,
  table: string,
  characterId: number,
  columns: readonly string[],
): SqlRow[] {
  const scope =
    table === 'characters'
      ? 't.id = ?'
      : table === 'spell_loadout_entries'
        ? 't.spell_loadout_id IN (SELECT id FROM spell_loadouts WHERE character_id = ?)'
        : 't.character_id = ?';
  if (table === 'character_attunement_slots') {
    return db.allRaw(
      `SELECT
         (SELECT name FROM character_items WHERE id = t.slot_1_item_id)
           AS slot_1_item_name,
         (SELECT name FROM character_items WHERE id = t.slot_2_item_id)
           AS slot_2_item_name,
         (SELECT name FROM character_items WHERE id = t.slot_3_item_id)
           AS slot_3_item_name
       FROM character_attunement_slots AS t
       WHERE t.character_id = ?
       ORDER BY t.character_id`,
      [characterId],
    );
  }
  return db.allRaw(
    `SELECT ${columns.map((column) => `t."${column}"`).join(', ')}
     FROM "${table}" AS t WHERE ${scope} ORDER BY t.id`,
    [characterId],
  );
}

function portableColumns(db: DatabaseContext, table: string): string[] {
  return db
    .allRaw(`PRAGMA table_info("${table}")`)
    .map((row) => String(row.name))
    .filter((name) => !REMAPPED.test(name));
}

describe('the other two portable scopes carry every column generically', () => {
  it('a backup document restores every column of every backed-up table', async () => {
    const sender = await context();
    const senderCharacterId = seedSender(sender, seedCatalog(sender));
    const recipient = await context();
    offsetSequences(recipient);
    seedCatalog(recipient);

    const document = exportCharacterBackup(sender, senderCharacterId);
    const { characterId } = importCharacterBackup(
      recipient,
      JSON.parse(JSON.stringify(document)) as unknown,
    );

    for (const table of ['characters', ...BACKUP_TABLES] as const) {
      const columns = portableColumns(sender, table);
      const sent = everyRow(sender, table, senderCharacterId, columns);
      if (table === 'character_sheet_adjustments') {
        // AC-4 keeps this key as an empty historical-import shell. Its retired
        // payload is exercised by the dedicated backup migration test; a
        // current export must never manufacture a row here.
        expect(sent).toEqual([]);
        expect(everyRow(recipient, table, characterId, columns)).toEqual([]);
        continue;
      }
      expect(sent.length, `${table}: the sender has no rows`).toBeGreaterThan(
        0,
      );
      expect(
        everyRow(recipient, table, characterId, columns),
        `${table} did not survive a backup column for column`,
      ).toEqual(sent);
    }
  });

  it('an undo snapshot restores every column of every captured table', async () => {
    const db = await context();
    const characterId = seedSender(db, seedCatalog(db));
    const state = new CharacterState(db);
    const snapshot = state.capture(characterId);

    const before = new Map(
      CHARACTER_STATE_TABLES.map((table) => [
        table,
        everyRow(db, table, characterId, portableColumns(db, table)),
      ]),
    );
    // Wreck each captured table in a way the restore has to undo, so a column
    // the snapshot forgot cannot come back by having never left.
    for (const table of CHARACTER_STATE_TABLES) {
      db.exec(`DELETE FROM "${table}" WHERE character_id = ?`, [characterId]);
    }
    state.restore(characterId, snapshot);

    for (const table of CHARACTER_STATE_TABLES) {
      const columns = portableColumns(db, table);
      const captured = before.get(table) ?? [];
      if (table === 'character_sheet_adjustments') {
        // The table remains in the versioned set so a7-v10 does not change its
        // table claim, but current captures contain only the empty shell.
        expect(captured).toEqual([]);
        expect(everyRow(db, table, characterId, columns)).toEqual([]);
        continue;
      }
      expect(captured.length, `${table}: nothing was captured`).toBeGreaterThan(
        0,
      );
      expect(
        everyRow(db, table, characterId, columns),
        `${table} did not survive an undo snapshot column for column`,
      ).toEqual(captured);
    }
  });
});
