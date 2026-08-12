# Backup formats

The application exposes three deliberately different versioned backup formats.
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
`backup.importCharacter`. The current version 6 is JSON-compatible:

```text
{
  format: "dnd-multiclass-spells/character",
  version: 6,
  exported_at: "<ISO-8601 timestamp>",
  source_character_id: 17,
  character: {
    ...,
    alignment: string | null,
    appearance: string | null,
    backstory: string | null,
    notes: string | null,
    archived_at: string | null
  },
  tables: { ... },
  references: { ... },
  content: [
    {
      kind: "species",
      content_key: "expanded:content.species:marsh-kin",
      key_kind: "asserted",
      fingerprint_scheme: "content-v1",
      fingerprint_digest: "<64 lowercase hex characters>",
      aggregate: { ... }
    }
  ],
  supersessions: [
    {
      content_kind: "species",
      superseded_content_key: "expanded:content.species:marsh-kin",
      successor_content_key: "expanded:content.species:marsh-kin-revised",
      recorded_at: "<ISO-8601 timestamp>"
    }
  ]
}
```

Version 5 added the semantic `content` manifest. It contains exactly the
external reference closure of this character's class/subclass/source/spell
references, recursively following the HA-1 projector reference vocabulary.
Unreferenced library creations and incomplete drafts are absent. Bundled
dependencies are represented by their fingerprints inside aggregates and are
not copied as external content.

Each manifest entry is a complete display-and-mechanics aggregate plus its
asserted/name-derived key and current fingerprint. A surviving local
digest-derived identity is reprojected under that asserted portable key, as are
all transitive fingerprint references to it; neither the digest key nor local
resolver aliases become wire semantics. Database ids, timestamps, catalog
layer, active state, publications/provenance, and other recipient-local metadata
are excluded. Entries are emitted in stable content kind/key order; import
computes a dependency-safe install plan independently of document order.
Planning and commit use the shared CI-4a adoption protocol, so review decisions,
content installation, and the new character commit together.

Version 6 adds the immutable supersession edges connected to that content
closure. Traversal follows lineage in both directions, so every endpoint of an
included edge is also present as a complete aggregate. Import restores those
edges only after all endpoints have been installed, in the same transaction as
the character.

Version 3 added the three flavor keys. Alignment is limited to 120 Unicode
code points, appearance to 4,000, and backstory to 20,000. Notes remains
type-only during backup validation so a grandfathered note longer than the
20,000-code-point new-write limit can still be exported and restored losslessly.
Version 4 added `archived_at`; an archived character remains archived after a
portable import. Historical versions 1 through 5 remain readable. Missing
flavor/archive fields migrate to `null`, and v1-v4 import only the content those
documents actually carry. Version 5 imports its content with empty lineage;
older documents never synthesize data they did not carry.

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
before starting writes. Content, remembered adoption decisions, sequence
reservations, character, and children then commit in one SQLite transaction;
any late reference, constraint, or write failure rolls everything back.

## Portable library document

The library service can export the whole installed external library or an
explicitly selected subset. UI exposure is intentionally later. Version 3 is a
different document kind from a character:

```text
{
  format: "dnd-multiclass-spells/library",
  version: 3,
  exported_at: "<ISO-8601 timestamp>",
  selection: "all" | "selected",
  selected_content_keys: ["expanded:content.species:marsh-kin"],
  content: [ ...same semantic manifest entries as character v6... ],
  supersessions: [ ...connected immutable lineage edges... ],
  lifecycle: [ ...archive timestamp or null for every carried entry... ]
}
```

A selected export includes each selected creation, its transitive external
dependencies, and connected supersession lineage, but not unrelated creations.
Whole-library export treats every installed external aggregate as a root.
Import uses the same plan/token/commit adoption protocol and identity resolver
as character v6, so repeated imports match existing content rather than
duplicating it. Historical versions 1 and 2 remain readable. Missing lineage
and lifecycle fields receive typed empty/live defaults, and the import UI
discloses the archive-state assumption.
