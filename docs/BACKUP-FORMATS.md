# Backup formats

The application exposes two deliberately different versioned backup formats.
Imports accept only the current format name and integer version. A format change
that cannot be read without guessing requires a new version.

## Complete database image

The Worker RPC methods are `backup.exportDatabase` and
`backup.importDatabase`. Version 1 is a structured-clone envelope:

```text
{
  format: "dnd-multiclass-spells/database",
  version: 1,
  exported_at: "<ISO-8601 timestamp>",
  sqlite: Uint8Array
}
```

`sqlite` is the complete SQLite file, including the catalog, every character,
indexes, triggers, user-authored catalog rows, tombstones, history, and SQLite
sequence state. This envelope is intended for application/API transport; it is
not JSON because JSON has no byte-array type.

Before the live OPFS file is closed, import deserializes a copy in memory and
checks SQLite integrity, foreign keys, every required table and trigger, and the
complete schema signature. Replacement keeps a copy of the prior image. If
storage replacement or reopen fails, that prior image is restored and reopened.

## Portable character document

The Worker RPC methods are `backup.exportCharacter` and
`backup.importCharacter`. Version 1 is JSON-compatible:

```text
{
  format: "dnd-multiclass-spells/character",
  version: 1,
  exported_at: "<ISO-8601 timestamp>",
  source_character_id: 17,
  character: { ... },
  tables: { ... },
  references: { ... }
}
```

`tables` contains:

- class levels, nested sources, and selection slots;
- Wizard spellbook entries and per-spell preferences;
- character rule overrides and warning acknowledgements;
- named save points, including their complete `a7-v1` snapshots;
- spell loadouts and their entries.

Rows retain their source IDs and `character_id` solely as document-local
identities and ownership guards. Every directly character-owned row must match
`source_character_id`; every source parent, slot source, and loadout entry must
resolve to a row in the same document. Save-point rows receive the same checks.
This is how mixed or cross-character documents are rejected rather than partly
restored.

`references` maps source database IDs to catalog `content_key` values for class,
subclass, feat, species, background, and spell-version definitions. Import
resolves those keys in the target catalog. All referenced spell versions must
exist and be active. Numeric catalog IDs are never assumed to match between
databases.

Import creates a new character. It assigns new database IDs and globally unique
source UUIDs, rewrites UUID-derived slot keys, and remaps every foreign key.
Save-point snapshots are remapped too; IDs needed only by a historical snapshot
are reserved so a later `CharacterState.restore()` remains valid. Cyclic source
graphs are rejected and accepted source rows are stored parent-first regardless
of document order, so nested historical sources remain restorable. Character
timestamps, revision, notes, source configuration, slot override/orphan state,
preferences, overrides, acknowledgements, and loadout content are retained.

Audit rows (`change_log` and `character_operations`) are not part of a portable
character document: their operation UUIDs, entity IDs, and revision chain are
database-local history. They remain present in the complete database format.
Cache, session, job, and shared catalog rows likewise belong only to the complete
database format.

Character import validates the header, exact top-level sections, list/object
shape, ownership, local references, save-point JSON/schema, and catalog keys
before starting writes. All inserts and sequence reservations then run in one
SQLite transaction; any constraint or write failure rolls back the character
and every child row.
