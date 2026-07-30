# Content-derived identity and complete non-SRD export

Binding law: **D81** (the full JSON export carries all non-SRD content, and
content identity derives from normalized name plus numeric/logical properties),
**D46** (a share link remains a compact reference; the full JSON export is the
complete channel), **D45** (an SRD customization is a differently named copy, a
new spell rather than an override), **D57/D59** (a user's local imported content
may travel in their own export; it must not enter this repository), **D41** (share
wire versions are immutable), D6/D6b, D11, D33, D35, D60.

Two questions remain with the owner and this design does **not** answer them:

1. whether spell forks keep opaque/random identity or use content-derived
   identity;
2. whether bundled SRD content receives fingerprints too.

Both are seams in §7. Neither blocks the common identity mechanism, catalog
matching, or the complete non-SRD export.

## 0. What is true now, each read rather than recalled

- **The shipped key normalizer hyphenates; it does not implement D81's wording.**
  `normalizeCatalogKeyComponent` decomposes Unicode, removes combining marks,
  lowercases, changes every run outside `[a-z0-9]` to `-`, and trims edge
  hyphens (`src/catalog/catalog-key.ts:5-15`). Thus
  `Melf’s Acid Arrow` becomes `melf-s-acid-arrow`, as the hand-written test
  asserts (`tests/unit/catalog/catalog-key.test.ts:9-16`). D81 instead says
  case-insensitive name with non-alphanumerics **removed**. These are different
  functions and §2.1 keeps them different.
- **The current imported-key identity is an owner namespace, not content.**
  A homebrew spell key is
  `<edition>:<registered-owner.namespace>:<normalized-name>`
  (`src/catalog/catalog-key.ts:96-116`); `importedContentKeyOwner` recognizes the
  same three-part grammar (`src/catalog/catalog-key.ts:72-87`). Its own comment
  says that grammar is the only imported/bundled distinction that survives
  backup and share for subclasses (`src/catalog/catalog-key.ts:34-54`). D81
  explicitly replaces the “who typed it” axis.
- **Catalog roots already have unique `content_key`s, but several also forbid
  same-name/different-properties content.** `class_definitions` is unique on
  `content_key` and on `(name, rules_edition)`
  (`db/schema/catalog-classes.ts:243-247`); `subclass_definitions` is unique on
  `content_key` and on `(class_definition_id, name, rules_edition)`
  (`db/schema/catalog-classes.ts:311-321`); feat/species/background definitions
  have the same name/edition uniqueness
  (`db/schema/catalog-sources.ts:72-76,99-103,126-132`). D81 requires the
  opposite result when normalized names agree but properties differ: two
  identities must be representable.
- **The catalog is graph-shaped, not a row-shaped key problem.** A class owns
  progressions, sheet traits, proficiencies, named features and automatic
  feature effects (`db/schema/relations.ts:742-766`); a subclass owns
  progressions and features, and a feature owns effects
  (`db/schema/relations.ts:880-920`); a spell version owns publications, lists,
  tags, damage types, conditions, attack modes and save abilities
  (`db/schema/relations.ts:614-649`). A fingerprint over only the root row would
  declare mechanically different content identical.
- **Species and backgrounds each have two catalog halves.** Selecting a species
  copies template values to the character and separately creates a live source
  reference to `species_definitions`; the two catalog rows share a
  `content_key` (`db/schema/origins.ts:95-107`). Backups therefore resolve the
  definition by key, while the character's copied template has no catalog id
  (`src/domain/contracts/tables.ts:799-814`). Content identity must cover both
  halves as one species aggregate, not assign two unrelated keys.
- **The portable backup's reference roots are a closed six-member set today:**
  class, subclass, feat, species, background definitions, and spell versions
  (`src/domain/contracts/tables.ts:1401-1409`). Every reference is exported as
  `{id, content_key}` (`src/backup/character-backup.ts:1454-1478`) and imported
  by exact `content_key`; a missing row is a hard backup refusal
  (`src/backup/character-backup.ts:1497-1545`).
- **The full character JSON is version 2 and carries complete definitions only
  for referenced non-SRD spells.** Its document has `tables`, `references`, and
  `spell_definitions` (`src/backup/character-backup.ts:99-112`).
  `selectSpellDefinitions` filters referenced spell versions to provenance
  `user` or `import` and gathers their child rows
  (`src/backup/character-backup.ts:1294-1381`); the exporter calls it only with
  referenced spell ids (`src/backup/character-backup.ts:1480-1492`). There is
  no corresponding complete class/subclass/source/origin/item graph.
- **The current backup spell restore is already “existing key wins,” but the key
  is not derived.** It inserts only absent version keys and never overwrites a
  local row or its pivots (`src/backup/character-backup.ts:1589-1621`). This is
  the right non-destructive merge posture and the wrong matching oracle.
- **The catalog import format currently knows only spells and subclasses.**
  `catalogRecordKinds` has those two members
  (`src/catalog/catalog-schema.ts:16-40`). Subclass input must supply an
  owner-namespaced `contentKey` (`src/catalog/catalog-schema.ts:555-596`), and
  its importer matches and updates on that asserted key
  (`src/catalog/subclass-importer.ts:172-265`). It cannot independently derive
  the same key on two machines.
- **Spell identity matching currently falls back from asserted identity key to
  whitespace-normalized lowercase name and alias.**
  `normalizeCatalogName` trims/collapses whitespace and lowercases, but retains
  punctuation (`src/catalog/catalog-normalize.ts:32-34`);
  `CatalogImporter.#resolveIdentity` probes key, then normalized name, then
  aliases (`src/catalog/catalog-importer.ts:500-530`). The spell version itself
  still matches only its asserted `versionKey`
  (`src/catalog/catalog-importer.ts:311-343`).
- **A spell fork is opaque/random in the implementation.** The fork copies one
  active SRD spell, requires a different display name
  (`src/catalog/spell-fork.ts:101-125`), then uses `crypto.randomUUID()` for both
  its homebrew version key and its separate `user-spell:` identity key
  (`src/catalog/spell-fork.ts:127-147`). D45 itself says the fork is a differently
  named copy, “a new spell, not an override,” with its own identity and name
  (`.claude/decisions.md:2149-2165`); D45 does **not** say that identity must be
  random. That unresolved distinction is seam F in §7.
- **Share import is reference matching today.** Compatibility looks up class,
  subclass, feat, species and background definitions by exact `content_key` and
  reports missing/mismatched definitions
  (`src/sharing/character-share.ts:1174-1275`). During import it performs those
  exact lookups again before writing character rows
  (`src/sharing/character-share.ts:1489-1525`). Spells alone degrade through
  `ensureSharedSpell`: exact key returns the local version; otherwise a
  placeholder is inserted (`src/sharing/character-share.ts:1287-1324`).
- **Character items are instances, not catalog definitions.**
  `character_items` belongs to one character and stores name, description,
  attunement state and granting source (`db/schema/items.ts:39-103`); the share
  tuple carries those instance values (`src/sharing/schema.ts:527-549`) and
  share import necessarily inserts a new instance before its effects
  (`src/sharing/character-share.ts:1897-1927`). “Do not duplicate an item” in
  this design therefore means “do not duplicate the imported catalog
  definition”; importing a second character must still create that character's
  own item instance.
- **There is no modifier-item catalog root to deduplicate yet.** Weapon and
  armor templates are catalog roots whose values are copied and severed
  (`db/schema/weapons.ts:290-316`, `db/schema/sheet.ts:570-585`), while
  `character_items` is the only general modifier-item table
  (`db/schema/items.ts:13-39`). D81's item outcome therefore requires an
  `item_definitions` catalog aggregate; it cannot be delivered by reinterpreting
  character instances as shared catalog rows.
- **The current share wire is v10 and frozen by registry.**
  `CURRENT_CHARACTER_SHARE_VERSION` is 10 and versions 1 through 10 remain
  registered (`src/sharing/wire-schemas/index.ts:22-45`). V10 only removes the
  retired sheet adjustment from the sheet tuple
  (`src/sharing/wire-schemas/v10.ts:12-38`). D46 says a share stays a compact
  reference and missing spells remain placeholders
  (`.claude/decisions.md:1843-1855`), so this design does not put content
  definitions on the wire.
- **A synchronous, browser-safe full SHA-256 implementation already ships.**
  `sha256(string)` UTF-8 encodes its input and returns 64 lowercase hex
  characters (`src/crypto/sha256.ts:24-29,122-125`). Identity needs a canonical
  projection and frozen vectors, not another hash implementation.
- **Schema migrations cannot run semantic TypeScript projectors today.**
  `DatabaseMigration` contains SQL plus SQL/schema checksums
  (`src/db/migrations.ts:22-30`), and `applyMigrationSuffix` does nothing but
  execute each pending SQL string before checking foreign keys/schema and
  committing (`src/db/migrations.ts:241-297`). A plan that says “the migration
  hashes the aggregate” without adding a data-migration mechanism has named no
  executable path.

## 1. Assumptions, with the locally provable ones proved

1. **“Full JSON export” means the portable per-character JSON, not the SQLite
   image. — PROVED.** D46 contrasts a share link with “the full JSON export” and
   says the exported character restores without the author's catalog
   (`.claude/decisions.md:1843-1855`). The application exposes
   `exportCharacter(): Promise<CharacterBackupDocument>` separately from
   `exportDatabase(): Promise<DatabaseBackup>`
   (`src/backup/client.ts:10-35`).
2. **“All non-SRD content” means every external catalog aggregate in the local
   catalog, including aggregates not referenced by this character. — OWNER'S
   WORD “all”; not otherwise provable from the tree.** The current referenced-
   spell-only query is insufficient. The v3 export in §5.1 enumerates the
   external registry, not the character's reference closure. This is deliberately
   stated because “all content needed by this character” would be a smaller and
   different requirement.
3. **A share continues to carry references, not definitions. — PROVED.** D46
   binds that channel split (`.claude/decisions.md:1848-1855`), and the current
   class/source/spell share shapes carry keys
   (`src/sharing/schema.ts:184-212`). Derived keys change what those strings
   mean, not the wire tuple shape.
4. **“No duplicate item” refers to a catalog item definition, not two
   characters sharing one owned row. — PROVED structurally; owner terminology
   remains a product-language risk.** `character_items.character_id` is required
   and cascades with its character (`db/schema/items.ts:39-49`); share import
   always creates a recipient-owned row
   (`src/sharing/character-share.ts:1897-1927`). Sharing one row between
   characters would violate the aggregate boundary.
5. **Rules-bearing prose participates in v1 identity. — DESIGN CHOICE, not a
   recalled requirement.** Most imported subclass behavior is still stored only
   as feature description text (`src/catalog/catalog-schema.ts:115-138`).
   Excluding that text would falsely merge two mechanically different subclasses
   whenever their structured effect subset agrees. False non-matches create a
   disclosed second definition; false matches silently substitute rules. V1
   chooses the safer side and normalizes formatting as §2.2 specifies.
6. **Source/publication metadata and private notes do not participate in
   identity. — DESIGN CHOICE.** They travel in the complete export, but book,
   page, acquisition timestamps and a user's annotation do not change what a
   rule does. Conflicting metadata on a matched aggregate is reported and local
   metadata wins; it is never silently used to split or overwrite content.
7. **The content key is immutable once any character/export/share can reference
   it. — REQUIRED by D81's frozen-contract hazard.** Re-importing edited content
   creates a new aggregate; it does not update rules beneath the old key.
   Existing character references remain on the old content.
8. **Legacy backup versions and wire v1-v10 remain readable. — PROVED as an
   existing discipline.** The backup validator explicitly accepts its current
   and legacy versions (`src/backup/character-backup.ts:911-950`), while the
   share registry says never edit an existing schema
   (`src/sharing/wire-schemas/index.ts:22-33`). Pre-alpha permits replacing the
   new write path; it does not license making a retained artifact lie.

## 2. The identity contract

### 2.1 Name normalization: removal, not hyphenation

Add a new, purpose-named function:

```ts
normalizeContentIdentityName(name: string): NormalizedContentName
```

Its v1 algorithm is frozen:

1. Unicode NFKD;
2. remove combining marks;
3. lowercase with JavaScript's locale-independent `toLowerCase`;
4. retain only Unicode letters and decimal numbers (`\p{L}` and `\p{N}`);
5. refuse an empty result.

Examples:

| Input | Identity name |
|---|---|
| `Melf’s Acid Arrow` | `melfsacidarrow` |
| `MELFS ACID-ARROW` | `melfsacidarrow` |
| `Élan's Aegis` | `elansaegis` |

This follows the owner's remove-rather-than-hyphenate rule: separators and
punctuation are **removed**, not translated into separators. Unicode
letters/numbers remain so a homebrew name written outside ASCII is not rejected
or made indistinguishable from every other non-ASCII name.

`normalizeCatalogKeyComponent` stays unchanged for legacy/bundled slugs and
legacy aliases. Calling it from a v1 projector is a type error: the two functions
return different brands (`LegacyCatalogKeyComponent` versus
`NormalizedContentName`). This reconciles D81 with the shipped behavior without
silently changing old keys.

### 2.2 Canonical semantic JSON

Identity is the SHA-256 of a canonical semantic envelope, never a hash of a
database row and never `JSON.stringify` on an incoming object:

```ts
interface ContentIdentityEnvelopeV1<K extends ContentKind, P> {
  readonly scheme: 'content-v1';
  readonly kind: K;
  readonly edition: string;
  readonly normalizedName: NormalizedContentName;
  readonly payload: P;
}
```

Each kind has a closed projector from a validated domain DTO to its payload.
The canonical serializer then enforces:

- object keys in Unicode code-point order;
- every optional semantic field emitted explicitly as `null`;
- every collection emitted explicitly as `[]` when empty;
- finite safe integers only for integer fields; `-0` becomes `0`;
- booleans remain booleans, never `0`/`1`;
- enums and other rule-bearing strings remain exact after validation;
- ordinary rule text uses NFC, CRLF/CR line endings become LF, trailing
  whitespace is removed per line, and outer blank lines are removed; internal
  punctuation, case and paragraph breaks remain significant;
- structured JSON such as `grant_rules` is parsed into its typed object first,
  then canonicalized recursively; no JSON blob string enters the hash;
- set-like children are sorted by their canonical element JSON and deduplicated;
- sequence-like children retain semantic order and carry no database
  `sort_order` field—the array position is the order;
- database ids, foreign ids, timestamps, `content_key`, provenance/layer,
  `is_active`, `seed_version`, source book/page, and local notes are absent.

This resolves D81's named hazards:

| Hazard | v1 answer |
|---|---|
| object field order | sorted by the canonical serializer |
| absent vs `null` | projector always emits explicit `null` |
| `5` vs `5.0` | typed integer becomes one canonical JSON number |
| set ordering | sorted canonical elements |
| printed ordering | retained as array order |
| non-ASCII names | NFKD/mark removal/lowercase, retain Unicode alphanumerics |
| prose | normalized rules/display prose is included |
| formatting-only prose change | line endings/trailing whitespace normalize away |
| actual prose change | different identity; v1 cannot prove it is flavor-only |

The existing generic `canonicalJson` is useful precedent but not the identity
contract: it sorts keys and preserves arrays (`src/commands/canonical-json.ts:48-71`)
but it does not normalize names/text, distinguish sets from sequences, force
absent fields to null, or restrict numbers to the domain's integer types.

### 2.3 Aggregate projections

`ContentKind` is a closed union:

```ts
type ContentKind =
  | 'class'
  | 'subclass'
  | 'feat'
  | 'species'
  | 'background'
  | 'spell'
  | 'weapon'
  | 'armor'
  | 'item';
```

The projector registry is exhaustive:
`Record<ContentKind, ContentIdentityProjector<...>>`. Adding a kind fails the
build until its DTO, projector, importer/exporter and controls exist.

The aggregate boundary is:

| Kind | V1 identity payload |
|---|---|
| class | class rule fields; progression rows by level; sheet traits; save/skill/armor/weapon proficiencies; mastery rows; starting-equipment declarations; automatic and named feature/effect graphs |
| subclass | **parent class canonical key**; subclass caster/grant fields; progression rows; ordered feature/effect graph |
| feat | category, min level, ability points, repeatability, prerequisites, typed grant rules, rules-bearing text |
| species | the definition's typed grant rules **and** template creature type/size/speed plus ordered trait/effect graph |
| background | the definition's typed grant rules **and** template abilities/feat/skills/tool plus ordered equipment graph; weapon/armor children use their canonical keys |
| spell | version mechanics and structured values; rules summaries; sorted list/tag/damage/condition/attack/save/upcast/cantrip sets/lists; identity aliases and publication metadata are carried but excluded |
| weapon | damage/versatile tagged values, damage type, properties, range, mastery and proficiency grouping |
| armor | category, AC role/value, dex mode/cap, Strength requirement and stealth disadvantage |
| item | new modifier-item definition: description, attunement requirement, and ordered effect declarations using the one D72 effect vocabulary |

Names enter once as `normalizedName`, not again as raw display strings. Raw
display names still travel in the content record and the local spelling wins on
an exact match.

Parent/referenced catalog edges use resolved **canonical primary keys**, never
database ids and never unverified aliases. That makes identical graphs hash the
same on databases with different insertion order. Cycles are refused before
hashing; the current graph is acyclic (class/equipment roots precede subclass,
background and character references), and accepting a cycle would make identity
undefined.

### 2.4 Key grammar and frozen versions

The v1 primary key is:

```text
<edition>:content.v1:<64 lowercase SHA-256 hex>
```

The digest input is the UTF-8 canonical envelope from §2.2, including kind,
edition and normalized name. The readable name need not appear outside the
digest; it is still a key input, and omitting it from the visible key avoids
truncation and ASCII-transliteration rules becoming a second identity contract.

This three-part form is deliberate. `content.v1` satisfies the existing dotted
middle-segment grammar and the 64-hex digest satisfies `KEY_COMPONENT`, so a
derived spell key is already valid at the v10 share boundary
(`src/catalog/catalog-key.ts:18-31`). Key strings stay far below the share's
200-character class/subclass bound (`src/sharing/schema.ts:2002-2014`). No
accepted wire tuple field or value domain changes, so **no share v11 is minted
for the key itself**.

`content.v1` is immutable. A future projector is `content.v2` in a new module
and creates `content.v2` keys; v1 code and vectors remain. An importer computes
every older scheme that can represent the validated record and records those
keys as aliases. If one old alias names more than one newer aggregate, it becomes
ambiguous and resolves to neither (§3.2); compatibility must never manufacture a
false match.

## 3. Storage: identity is data, layer is data, aliases are not authority

### 3.1 Registry

Add one catalog registry rather than nine new provenance columns:

```text
catalog_content_identities
  content_key       TEXT PRIMARY KEY
  content_kind      closed ContentKind
  identity_scheme   'content-v1' | 'opaque'
  identity_digest   nullable 64-hex
  catalog_layer     'bundled' | 'external'
  normalized_name   TEXT
  created_at
```

`catalog_layer` answers the export/licensing question. `identity_scheme`
answers how matching works. They are intentionally orthogonal:

- an external imported book is `external + content-v1`;
- a fork can be `external + opaque` or `external + content-v1` after question F;
- bundled SRD can be `bundled + opaque` or `bundled + content-v1` after question S.

The grammar is no longer trusted as provenance. `importedContentKeyOwner` remains
only a legacy-key parser; new code asks the registry for layer and scheme.

Every aggregate root's `content_key` references the registry key. Species and
background keep one registry key across their definition/template halves.
Spell identity rows remain the grouping for editions/aliases, but
`spell_versions.content_key` is the content aggregate identity.
`spell_identities.content_key` is therefore renamed to `group_key` and becomes
an internal grouping key derived from the normalized spell name, not a second
portable content identity. The
`spell_versions_spell_identity_id_rules_edition_unique` constraint is removed:
same normalized name + same edition + different semantic properties must be two
versions under D81, not an impossible insert. A schema migration registers every
current root as opaque before adding the references; the semantic rekey is the
separate code-data migration in §9.

Remove name-based **unique** constraints that prevent D81's
same-name/different-properties case. Replace them with non-unique lookup indexes.
Content-key uniqueness stays. Existing UI searches can still group/warn by
normalized name; they can no longer use name as an identity.

Add `item_definitions` plus `item_definition_effects`. This is catalog content,
not a replacement for `character_items`: picking one copies its values/effects
into a character-owned item/effect graph, on the same severed-template model
weapon, armor and species already use. The definition is deduplicated; each
character's instance remains distinct.

### 3.2 Aliases and resolution

Add:

```text
catalog_content_aliases
  content_kind
  alias_key
  content_key  -> catalog_content_identities.content_key
  alias_kind   'declared-legacy' | 'historical-scheme' | 'bundled-legacy'
  UNIQUE(content_kind, alias_key, content_key)
```

`(content_kind, alias_key)` is deliberately **not** unique. One old, less
discriminating scheme may map to two newer identities. The resolver returns a
tagged result:

```ts
type ContentResolution =
  | { kind: 'exact'; contentKey: ContentKey }
  | { kind: 'alias'; contentKey: ContentKey }
  | { kind: 'missing' }
  | { kind: 'ambiguous'; candidates: readonly ContentKey[] };
```

Resolution order is exact primary key, then a unique alias target. Ambiguous is
a disclosed refusal in backup/catalog import and an incompatibility in share
preview; `ORDER BY id LIMIT 1` is forbidden.

Legacy owner-namespaced keys supplied by catalog documents are input aliases,
not primary keys and not proof of ownership. Import validates the content,
derives the primary key, then records the declared key as an alias. A document
cannot overwrite bundled content by spelling a bundled key because it never
chooses the target primary key.

### 3.3 Insert, match, conflict

All content ingestion uses one `installContentAggregate` transaction:

1. validate the closed semantic DTO and bounds;
2. resolve all parent/reference keys to exact canonical primary keys;
3. project canonical v1 bytes and derive the primary key;
4. if absent, insert registry + aggregate graph atomically;
5. if present, re-project the stored graph and compare canonical bytes;
6. exact bytes means **match**: reuse every local database id; never rewrite
   rules or display spelling;
7. same primary key with different bytes means
   `ContentIdentityCollision` and rolls back the whole document;
8. record safe declared/historical aliases;
9. merge only set-like non-identity metadata (for example a missing
   publication); incompatible metadata is returned in the import report and
   local data wins.

A same normalized name with different properties reaches step 3 with a different
digest. Both aggregates exist. The import report calls it
`same_name_distinct_content`; it is not silently collapsed and it is not a hard
error.

Content-addressed aggregates are immutable. Re-importing changed mechanics or
prose inserts a new key. Old rows stay while referenced; catalog “removal”
deactivates discoverability without deleting character history. The present
subclass update-in-place and spell update-if-unreferenced paths are replaced,
not accommodated.

## 4. Catalog documents and authoring

Catalog parsing produces semantic DTOs without authoritative keys. For the
legacy spell/subclass format:

- `identityKey`, `versionKey`, and `contentKey` remain accepted as
  `declaredLegacyKey`;
- import derives the primary key after defaults, structured parsing and list
  normalization;
- the declared key is recorded as an alias;
- a legacy key that is malformed is still reported, but it cannot select a row
  to mutate.

The catalog record-kind union grows to all nine `ContentKind`s. Each kind's DTO
is discriminated and closed. Unknown record kinds refuse the document rather
than being skipped; unknown fields follow the format's existing explicit policy
only after identity fields are enumerated. A field cannot be silently dropped
from parsing while also being expected in the fingerprint.

Authoring uses drafts with local UUIDs, which are not catalog keys and cannot
travel in a share/export. Publishing a draft validates and installs an immutable
aggregate, yielding its derived key. Editing installed external content creates
a new draft and then a new key. A command may retarget this user's selected
character references in one transaction when the user explicitly chooses
“replace”; catalog import never retargets characters implicitly.

This draft boundary is required even if forks stay random: every other
content-derived kind must not expose a key and then mutate the bytes that key
claims.

## 5. Portability channels

### 5.1 Full character JSON: version 3, complete external catalog

Mint character backup v3. Replace v2's raw `spell_definitions` section on the
new write path with:

```ts
interface CharacterBackupV3 {
  // existing header, character, tables and references
  readonly content: readonly PortableContentAggregate[];
}
```

`PortableContentAggregate` is the same closed semantic DTO the identity
projector consumes, plus:

- `contentKey` and `identityScheme`;
- raw display text;
- non-identity metadata/notes;
- declared aliases that are safe to carry;
- no database ids, foreign ids, timestamps, layer assertion or active flag.

The exporter selects **every**
`catalog_content_identities.catalog_layer = 'external'` row, not only the
character reference closure, builds each aggregate, validates/recomputes its key,
and orders records by `(content_kind, content_key)`. Bundled rows are selected or
omitted by layer, never by key grammar and never by the unresolved SRD
fingerprint policy.

Import order is dependency-safe and separate from document order. Each
projector declares the `ContentKind` + input key edges it consumes; the importer
resolves in-document declared keys and installed aliases into a graph, applies a
stable Kahn topological sort, and refuses a cycle or missing edge before writing.
This is required because class starting equipment and background equipment can
point at weapon/armor aggregates, while subclasses point at classes. A hardcoded
“all roots first” list would be false as soon as one of those edges appears.
After the sorted content install, v3 `references` resolve through the
primary/alias registry and character-owned rows clone through the existing
id-remap machinery.

The whole operation is one transaction. Preview runs the same installer inside a
rollback and reports:

- new/matched content counts by kind;
- same-name/different-content pairs;
- ambiguous legacy aliases;
- non-identity metadata conflicts;
- character reference failures.

V1 and v2 backup readers remain. V2 `spell_definitions` is converted in memory
to semantic spell aggregates, its stored key becomes a declared legacy alias,
and it flows through the same installer. The current raw-row restore is not a
second lasting identity path.

Acceptance fixture:

1. Alice and Bob start with different database ids.
2. Each independently imports the same multi-kind “book.”
3. Alice's export contains every external aggregate, including one unused by
   her character.
4. Bob imports Alice's character.
5. Every content count is unchanged; the unused aggregate was present in the
   document but matched; all character catalog FKs resolve to Bob's existing
   ids; only character-owned rows (including item instances) increase.
6. Importing the export into a fresh database restores the same external catalog
   and character.

### 5.2 Share wire: keep v10 as reference-only

No content aggregate is added to the share document. The exporter writes primary
derived keys for classes, subclasses, sources and spells. The importer replaces
direct `WHERE content_key = ?` helpers with the typed resolver from §3.2:

- exact/unique alias: use the existing local definition id;
- missing class/subclass/source: retain the current compatibility issue;
- missing spell: retain the current placeholder behavior;
- ambiguous: report a distinct incompatibility; never pick a candidate.

The wire remains v10 because tuple fields, order, membership and accepted string
domain do not change. A hand-frozen v10 link containing legacy keys proves alias
resolution; another hand-frozen v10 link containing `content.v1` keys proves
exact matching. The encoded link contains no `content` section, which guards
D46.

Species continues to arrive in two forms: its catalog source resolves by the
derived species key, while the character's copied species/trait rows travel
verbatim. Character items likewise travel as owned instances; share import does
not install `item_definitions` from their values. If Bob independently imported
the book, its catalog item definition already matches by derived key; the share
still creates Alice's character-owned instance, as it must.

## 6. Frozen scheme discipline

`content-v1` gets the same “never edit history” treatment as share wire schemas:

- one module containing the v1 envelope/projector registry;
- hand-written canonical-string and SHA-256 vectors covering every kind;
- vectors computed independently of the production projector and checked into
  tests;
- an immutable scheme registry (`content-v1`, later `content-v2`, ...);
- an explicit adjacent compatibility projector before a later scheme can emit a
  historical alias;
- source-file freeze protection so an incidental refactor cannot change v1
  without minting v2;
- no test may regenerate expected canonical strings/digests from production
  output.

Changing a semantic field's interpretation, default, set/sequence status, text
normalization or aggregate boundary is a new scheme. Adding a database column
that is metadata is not. The projector registry is the compile-time place where
that decision must be made.

## 7. The two owner seams — open, isolated, and costed

### F. Spell forks: opaque/random or content-derived

D45 binds the semantics: customization makes a differently named **new spell**,
not an override (`.claude/decisions.md:2149-2165`). Current code realizes “new”
with a UUID (`src/catalog/spell-fork.ts:127-147`). D81 makes content-derived
identity the general rule. Neither decision says whether two byte-equivalent
forks are the same content.

The registry supports both without changing backup/share/install code:

- **If opaque/random:** publish the fork as
  `catalog_layer='external', identity_scheme='opaque'`; keep its existing random
  key and carry the complete aggregate in JSON. Exact random key matches on
  restore, but two independent equivalent forks do not deduplicate.
- **If derived:** the copied spell is a draft; publishing derives a
  `content.v1` spell key. Later edits mint a new content aggregate. Two
  independently produced equivalent forks deduplicate.

One policy function is the seam:

```ts
spellForkIdentityPolicy(): 'opaque' | 'content-v1'
```

No implementation dispatch may choose its return value. CI-FORK follows the
owner's answer. Cost to flip after the core ships: fork command + fork tests +
backfill/aliases for existing fork rows; no backup, share or registry redesign.

### S. Bundled SRD: opaque legacy keys or fingerprints

`catalog_layer='bundled'` is fixed either way, so bundled content is omitted from
the full non-SRD export. Identity policy is independent:

- **If not fingerprinted:** seeders register current SRD keys as
  `identity_scheme='opaque', catalog_layer='bundled'`.
- **If fingerprinted:** seeders derive `content.v1` primary keys and register
  every current bundled key as `bundled-legacy` aliases. Old v1-v10 shares and
  v1-v2 backups resolve through those aliases.

One policy function is the seam:

```ts
bundledContentIdentityPolicy(): 'opaque' | 'content-v1'
```

No implementation dispatch may choose it. CI-SRD follows the owner's answer.
Cost to flip later: seeder keys, bundled-key fixtures and a backfill; external
identity, full-export selection and share document shape do not change.

## 8. Controls — each names the mechanism it proves

- **CI-NAME-REMOVE — `normalizeContentIdentityName`.** Mutate removal into the
  shipped hyphenation. Must fail: `Melf’s Acid Arrow` and
  `MELFS ACID-ARROW` derive the same key, while the legacy slug test remains
  unchanged.
- **CI-NAME-UNICODE — the Unicode alphanumeric retain rule.** Mutate it to
  `[a-z0-9]`. Must fail: two different all-non-ASCII names do not collapse to an
  empty/fallback identity, and canonically equivalent accented forms agree.
- **CI-PROPERTIES — each kind projector.** Delete one load-bearing numeric or
  logical field per kind. Must fail: same normalized name with that one property
  changed derives a different key.
- **CI-ID-FREE — aggregate projectors.** Add database ids/timestamps or read
  children in insertion order. Must fail: equivalent graphs inserted with
  different ids/order on Alice and Bob derive identical canonical bytes/key.
- **CI-NULL — closed DTO/defaulting boundary.** Omit a nullable field rather than
  emitting null. Must fail: omitted and explicit-null input normalize to the same
  bytes, while null and a real value differ.
- **CI-SET-SEQUENCE — per-field collection metadata.** Stop sorting one set and
  sort one ordered feature list. Must fail both halves: reordered tags agree;
  reordered subclass features differ.
- **CI-PROSE — `canonicalRuleText` and prose inclusion.** Remove prose from a
  projector or fail to normalize line endings/trailing spaces. Must fail:
  formatting-only variants agree and a changed rule sentence differs.
- **CI-KEY-VERIFY — `installContentAggregate`.** Trust the document's claimed
  key. Must fail: a payload claiming another aggregate's key is refused before
  any row is written.
- **CI-COLLISION — stored-graph reprojection.** Skip the byte comparison on an
  existing primary key. Must fail: a forced digest collision/damaged stored
  graph rolls the entire import back rather than returning “matched.”
- **CI-ALIAS-AMBIGUOUS — `resolveContentKey`.** Restore `ORDER BY ... LIMIT 1`.
  Must fail: one historical alias with two candidates returns `ambiguous` and
  imports neither.
- **CI-LOCAL-WINS — install match branch.** Update an existing row from carried
  content. Must fail: Bob's display capitalization and local note survive an
  exact semantic match; the import reports incompatible metadata.
- **CI-NAME-DISTINCT — removed name-unique indexes + digest identity.** Reintroduce
  a name uniqueness constraint or name-only match. Must fail: same normalized
  name/different property aggregates coexist and are reported as distinct.
- **CI-ALL-EXTERNAL — registry-layer export query.** Restrict export to character
  references. Must fail: an unreferenced external feat/item is in v3; a bundled
  row is not.
- **CI-CROSS-IMPORT — installer + reference remap.** Match by a declared owner key
  or insert despite a derived match. Must fail the Alice/Bob fixture in §5.1:
  catalog counts remain unchanged and Bob's local ids are used.
- **CI-SHARE-REFERENCE — share exporter and v10 codec.** Add aggregate content to
  the share or bypass the resolver. Must fail: the frozen link contains keys only;
  exact/unique alias content matches without inserts; missing content retains
  existing issues/placeholders.
- **CI-FROZEN-V1 — scheme registry and hand-pinned vectors.** Change any v1
  canonical rule. Must fail the independently recorded canonical strings and
  digests; updating production output cannot update the oracle.
- **CI-BACKUP-LEGACY — v1/v2 adapters.** Route v2 raw spell definitions around
  the installer. Must fail: a hand-frozen v2 backup imports through a legacy
  alias, while a malformed claimed key cannot overwrite a local row.
- **CI-ATOMIC — top-level catalog/backup transaction.** Commit content before a
  later character/reference refusal. Must fail: after a forced final-stage
  refusal, neither catalog nor character counts change.

Every control uses fixtures authored in this repository. No non-SRD book content
is committed; D57/D59's authorization line remains intact.

## 9. Schema migration and semantic data backfill

The SQL migration is not allowed to pretend it can run the TypeScript
projectors. This unit adds an append-only `CatalogDataMigration` registry and
runner beside the SQL registry:

```ts
interface CatalogDataMigration {
  readonly id: string;
  readonly projectorScheme: ContentIdentityScheme;
  readonly checksum: string;
  run(db: DatabaseContext): void;
}
```

The schema SQL creates
`catalog_data_migrations(id, scheme, checksum, applied_at)` along with the
registry/alias/item-definition tables, relaxes name-unique indexes, and registers
every existing root under its **current key as opaque**. That makes the new
foreign keys valid using SQL alone and preserves every row even if the later
semantic upgrade cannot project it.

After `applyMigrationSuffix` has produced the target schema and before a
candidate database is exposed to queries/audit, `runCatalogDataMigrations`
executes unapplied functions in one transaction each. The runner is invoked for
normal boot, whole-database restore candidates and test fixtures—the same three
entry points that run the schema lifecycle. An id is recorded only after
reprojection, reference, and foreign-key checks pass; a crash rolls back both
data and marker. The marker stores the pinned checksum and boot refuses a
same-id/different-checksum registry. Data-migration modules have independently
pinned source hashes, because JavaScript function source is not a stable runtime
checksum. Entries, source and frozen projector scheme are append-only. Tests
start from every recorded schema prefix and prove the semantic runner is
idempotent.

The runner infrastructure lands before the content projectors. The
`content_identity_v1_backfill` entry is registered only after all nine
projectors exist; it then runs the same aggregate readers/projectors as import:

1. enumerate existing aggregates in dependency order;
2. classify current rows without guessing:
   - `spell_versions.provenance='srd'` is bundled;
   - `user`/`import`/placeholder spell rows are external, with placeholders
     remaining opaque until real content arrives;
   - current seeded catalog keys are bundled from an explicit, checked seeder
     inventory;
   - owner-namespaced subclass rows are external legacy rows;
3. apply the owner-selected F/S policies only in their later dispatches;
4. derive external non-fork content keys, update every catalog/character FK in
   one migration transaction, and record old keys as aliases;
5. build species/background aggregates across both halves before rekeying either;
6. reproject every derived registry row and assert its stored digest/key;
7. run foreign-key check and assert every catalog root has exactly one registry
   row.

If a legacy external row cannot be projected losslessly, migration records it as
`external + opaque`; it does not invent missing mechanics or refuse database
boot. The complete export still carries it. A later explicit edit can publish a
derived replacement.

Because HEAD is pre-alpha, there is no compatibility adapter inside the new
runtime model. Compatibility exists only at artifact boundaries (legacy
catalog keys, backup v1/v2, share wire v1-v10), where real user data can arrive.

## 10. Dispatches — ten core increments plus the two owner-dependent seams

The work is intentionally not called “one hash helper.” It replaces identity,
widens the catalog model, and changes a complete backup format.

- **CI-1 — M: identity kernel and frozen vectors.** Brands, name/rule-text
  normalization, canonical serializer, `content-v1` scheme registry, key parser,
  SHA vectors and CI-NAME/NULL/SET/PROSE/FROZEN controls. No database changes.
- **CI-2a — L: registry, aliases, resolver and schema migration.**
  `catalog_content_identities`, ambiguous aliases, typed `ContentResolution`,
  root-key relations, name-index relaxation, SQL opaque registration and
  invariants. Existing rows remain opaque in this dispatch; no policy is guessed.
- **CI-2b — L: append-only catalog data-migration infrastructure.** Lifecycle
  integration for normal/candidate/restore databases, applied-marker table,
  checksum/source freeze, atomic/idempotent runner and prefix fixtures. No v1
  backfill is registered before the projectors it calls exist. Calling this
  small would hide a new persistence mechanism.
- **CI-3a — L: spell and subclass aggregate replacement.** Complete projectors,
  immutable installer, legacy key aliases, replace spell name fallback/version
  update and subclass update-in-place, dispose `spell_identities.content_key` as
  an internal group key, relax same-identity/edition uniqueness, child-graph
  reprojection, collision/local-wins controls.
- **CI-3b — XL: class, feat, species and background aggregates.** This is XL,
  not “four more record kinds”: class has more than a dozen child tables, species
  and background span definition/template halves, and background equipment has
  cross-catalog edges. Adds typed document DTOs/importers and production
  projectors for all four.
- **CI-3c — L: equipment and modifier-item catalog.** Weapon/armor projectors;
  new `item_definitions` and effect children; picker copies into
  `character_items`/`character_effects`; catalog record kinds and import
  reporting. No live template FK is added to character weapon/armor/item rows.
- **CI-3d — L: external v1 semantic backfill.** Register the append-only
  `content_identity_v1_backfill` only now that every projector exists; rekey
  projectable external non-fork aggregates, remap all catalog/character
  references, add old-key aliases, retain unprojectable rows as external opaque,
  and exercise idempotence/rollback from every schema prefix.
- **CI-4 — XL: character backup v3 complete content manifest.** Semantic
  portable union, strict validation/limits, all-external export, dependency-safe
  transactional install, preview report, fresh restore, and v1/v2 adapters.
  CI-ALL-EXTERNAL, CROSS-IMPORT, BACKUP-LEGACY and ATOMIC land here.
- **CI-5 — M: share resolver conversion, wire still v10.** Replace exact catalog
  helpers across compatibility/import/placeholder paths with typed resolution;
  frozen legacy/derived v10 fixtures and CI-SHARE-REFERENCE. No tuple changes.
- **CI-6 — L: authoring immutability.** Draft ids and publish-to-derived-key
  across nine content kinds, edit-as-new-version, explicit reference retarget
  command, and refusal to export/share drafts. This is needed before editable
  non-fork content can use derived identity safely.
- **CI-7 — M: adversarial controls and UI disclosure.** Mutation suite for every
  projector, import preview counts/conflicts, same-name-distinct labeling, and
  export/share wording that distinguishes complete JSON from reference-only
  links.
- **CI-FORK — S if opaque / M if derived, BLOCKED ONLY ON QUESTION F.** Select
  the policy, migrate/register current fork keys, and test the selected lifecycle.
  It follows CI-3a so both policy branches use the production spell aggregate.
- **CI-SRD — M if opaque / L if derived, BLOCKED ONLY ON QUESTION S.** Register
  current bundled keys or rekey all seeders plus legacy aliases. It can land
  after CI-3a/3b/3c; the derived branch needs every production projector, while
  CI-4's layer query behaves identically either way.

Strict dependency order:

```text
CI-1 → CI-2a → CI-2b
                  ├→ CI-3a ─────────┐
                  ├→ CI-3c → CI-3b ─┼→ CI-3d → CI-4 → CI-7
                  └→ CI-5           │
              CI-3a + CI-3b + CI-3c ├→ CI-6
                      CI-3a ─────────┴→ CI-FORK (owner F)
              CI-3a + CI-3b + CI-3c → CI-SRD  (owner S)
```

CI-3c precedes CI-3b because class/background aggregates can reference its
weapon/armor keys. They remain separate because the class/origin graph and the
new item catalog have different failure surfaces. CI-4 does not begin until
every external kind has a semantic projector; otherwise “all non-SRD content”
would ship as a format with known holes.

## 11. Acceptance and explicit non-goals

The unit is complete only when:

- identical semantic aggregates imported independently have identical primary
  keys and no duplicate catalog rows on character backup/share import;
- same normalized name with a real property/prose difference produces two
  representable identities and a disclosed conflict;
- a v3 full JSON restored into a fresh database carries every external catalog
  aggregate and the character;
- a v3 import into an independently populated database reuses local content ids;
- share wire remains v10/reference-only and its existing missing-content
  behavior remains;
- v1/v2 backups and v1-v10 shares remain readable through explicit legacy
  adapters/aliases;
- neither owner seam has been selected without an answer.

Not in this unit:

- fuzzy matching, edit distance, publisher/title heuristics, or “probably the
  same” merges;
- online/global identity registration;
- deleting old immutable content when a new revision arrives;
- inferring that prose is flavor text when the schema does not say so;
- sharing catalog content in URL fragments;
- making character-owned item/weapon/armor instances global rows;
- committing any imported non-SRD fixture or text.
