# Content-derived identity and complete non-SRD export

> **SUPERSESSION NOTICE (D198, 2026-08-04).** Read this document THROUGH the
> adjudication layer in `.claude/decisions.md`; where they conflict, the
> adjudications win. Specifically superseded here: (1) `content_key` is NOT
> excluded from fingerprints — the frozen spell projector v1 deliberately
> carries `spell_version_key` in identity (CI-3s-PRE adjudication: portable
> stable keys ARE content); (2) digest-derived clone/primary keys are DEAD —
> they are circular against (1); keys are asserted, name-derived slugs via the
> shared stable-key normalization with typed collision refusals; (3) the
> "immutable installer" is realized as the CI-3s registry's key-first install
> seam, not a separate CI-3a unit; (4) the fifth review control's name is
> CI-SRD-FALLBACK-REVIEW.

## Revision 3

- **A1:** Exact-byte content found under the derived primary key computed from
  that incoming fingerprint is now a trivial self-match, not a review event.
  This is option (b): it closes D82's fresh-database repeated-character-import
  gap without manufacturing a receipt for a choice nobody made. Alias,
  compatible-fingerprint and SRD-fallback matches, plus metadata conflicts,
  remain reviewable with Match selected and Clone reachable.
- **A2:** The identity contract now states the JavaScript-runtime Unicode-table
  caveat, makes stored keys/normalized names/canonical bytes authoritative
  after creation, forbids cross-engine renormalization as an integrity check,
  and treats cross-engine fingerprint convergence as best-effort.
- **A3:** Set-like canonical element JSON now names ECMAScript's default
  UTF-16-code-unit comparator, matching `src/commands/canonical-json.ts`.
- **S1:** D83, D86 and D92 are explicit external prerequisites for CI-3c and,
  transitively, CI-5 in the dependency graph and acceptance gates.
- **C1:** Added a backfill-classification control so bundled/external provenance
  cannot swap across D59's authorization boundary.
- **C2:** Added a cycle-refusal control proving a cyclic content graph stops
  before hashing or writes.
- **C3:** Strengthened CI-PROPERTIES with named species/background
  template-half fields, covering the two-halves-one-key failure without an
  overlapping control.
- **C4:** Added a closed-set control proving new content cannot mint
  `legacy-opaque`.
- **C5:** Added a forget-scope control proving the action deletes exactly one
  receipt and touches no character/content row.

**Revision 2 — incorporates D82 and D84.**

Binding law: **D81** (the full JSON export carries all non-SRD content, and
content identity derives from normalized name plus numeric/logical properties),
**D82** (one derived-identity rule covers imported, hand-made and forked content;
non-trivial derived matches are reviewed with match as the default and a
per-entry clone choice), **D84** (bundled SRD keeps its stable catalog key and uses a content
fingerprint only as fallback), **D46** (a share link remains a compact reference;
the full JSON export is the complete channel), **D45** (an SRD customization is
a differently named copy, a new spell rather than an override), **D57/D59** (a
user's local imported content may travel in their own export; it must not enter
this repository), **D41** (share wire versions are immutable), D6/D6b, D11, D33,
D35, D60.

D83, D86 and D92 are also binding inputs to the evolution rule in §6:
`ability_override` is future rules-bearing effect content, while item quantity
and attunement-slot membership are character-instance state. None may be
silently added to a frozen fingerprint projector.

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
  (`src/catalog/spell-fork.ts:127-147`). D82 now explicitly inverts that
  identity mechanism: the UUID may identify a draft, but it cannot be the
  published content identity (`.claude/decisions.md:303-321`).
- **There is no common match-review import protocol or modal today.** Catalog
  and character-backup controls call their mutating import RPCs directly
  (`src/ui/screens/character-list/import-backup-controls.ts:97-104,147-156,
  260-272,330-346`). Catalog import has a rollback-only `dryRun` summary
  (`src/catalog/catalog-importer.ts:245-289`), while share alone already
  separates rollback preview from the mutating add action
  (`src/ui/screens/character-list/share-controls.ts:294-337`). D82 therefore
  requires a shared two-phase import plan and an actual list modal, not another
  boolean `window.confirm`.
- **Bundled seeding already treats the stable catalog key as identity across
  extraction changes.** The spell seeder probes the existing `content_key`,
  refuses a non-SRD collision, and updates the SRD mechanics in place on key
  conflict (`src/rules/spells-srd.ts:466-548`). D84 preserves that behavior and
  adds a separately searchable fingerprint; it does not rekey the seeded row
  (`.claude/decisions.md:253-270`).
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
- **The three newly decided item/effect shapes are not in HEAD.**
  `character_items` still has `requires_attunement` and an `attuned` boolean,
  but no quantity and no three-slot relation (`db/schema/items.ts:39-103`);
  `characterEffectKinds` has `attack_ability_override`, not D83's distinct
  score-setting `ability_override` (`src/domain/enums.ts:710-734`). D86 and D92
  will replace/add character-instance columns; D83 will widen every catalog
  effect graph that uses the shared effect vocabulary. Section 6 pins which of
  those changes affect fingerprints.
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
9. **A whole-database restore is not a D82 adoption import. — PROVED
   structurally.** It replaces the entire local database after a destructive
   confirmation (`src/ui/screens/character-list/import-backup-controls.ts:
   117-132,288-307`); it does not reconcile incoming content with a recipient
   catalog. Catalog imports, portable character JSON, share links and publishing
   an authored draft do reconcile content and use the review protocol in §3.4.

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

This algorithm deliberately uses the JavaScript engine's Unicode tables:
`String.prototype.normalize('NFKD')` and the `\p{L}`/`\p{N}` property escapes
follow that runtime's Unicode Character Database version. That version is not
pinned by this scheme and this project does not ship a custom Unicode table. In
particular, a code point unassigned in an older engine is not classified as a
letter/number and is stripped, while a newer engine may assign it as a letter
and retain it. The same raw name can therefore derive a different new key on
those two engines.

The stability boundary is the first successful derivation. Once stored,
`content_key`, `normalized_name`, the canonical envelope bytes and their digest
are authoritative identity data. Boot, export, audit and later integrity checks
must not renormalize the display name under the current engine and compare the
result with that stored key. They verify the engine-independent
`sha256(canonical_json)` relationship and may reproject the non-name semantic
payload while supplying the stored `normalized_name`. A content-bearing import
still validates and projects new incoming content on its current engine; its
carried key/fingerprints are candidate facts for §3.2, so convergence across
different Unicode-table versions is best-effort through the fingerprint
candidate path, never a reason to reject an otherwise valid stored aggregate or
to force a false match.

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
- set-like children are sorted by their canonical element JSON using
  ECMAScript's default UTF-16 code-unit order (the same comparator used by
  `Object.keys(value).sort()` in `src/commands/canonical-json.ts`) and
  deduplicated;
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
| subclass | **parent class fingerprint in this same scheme**; subclass caster/grant fields; progression rows; ordered feature/effect graph |
| feat | category, min level, ability points, repeatability, prerequisites, typed grant rules, rules-bearing text |
| species | the definition's typed grant rules **and** template creature type/size/speed plus ordered trait/effect graph |
| background | the definition's typed grant rules **and** template abilities/feat/skills/tool plus ordered equipment graph; weapon/armor children use their fingerprints in this same scheme |
| spell | version mechanics and structured values; rules summaries; sorted list/tag/damage/condition/attack/save/upcast/cantrip sets/lists; identity aliases and publication metadata are carried but excluded |
| weapon | damage/versatile tagged values, damage type, properties, range, mastery and proficiency grouping |
| armor | category, AC role/value, dex mode/cap, Strength requirement and stealth disadvantage |
| item | new modifier-item definition: description, attunement requirement, and ordered effect declarations using the one D72/D83 effect vocabulary |

Names enter once as `normalizedName`, not again as raw display strings. Raw
display names still travel in the content record and the local spelling wins on
an exact match.

Parent/referenced catalog edges use resolved **fingerprints in the projector's
same scheme**, never database ids, visible primary keys or unverified aliases.
This distinction is required by D84: one database may hold a parent under a
stable bundled key while another holds the same semantics under a derived
external key. Both embed the same `content-v1` fingerprint in a v1 child and
therefore derive the same child identity. A scheme can project a child only when
every semantic dependency has a lossless fingerprint in that scheme; otherwise
the child needs the newer scheme too. Database relations still resolve to each
recipient's primary key/id after matching. Cycles are refused before hashing;
the current graph is acyclic (class/equipment roots precede subclass, background
and character references), and accepting a cycle would make identity undefined.

D86 `character_items.quantity` and D92's three attunement-slot memberships are
not definition properties. They describe how many instances this character has
and which owned instances occupy this character's slots, so they travel in the
character tables/wire version that introduces them but are excluded from the
`item` content projector. `item_definitions.requires_attunement` remains
rules-bearing and is included. D83's `ability_override`, by contrast, changes a
definition's mechanics wherever an item/feat/class/species effect graph can
carry it and therefore belongs to the applicable content projector under the
scheme-evolution rule in §6.

### 2.4 Key grammar and frozen versions

The v1 **derived external-content** key is:

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
for the key itself**. This does not reserve version 11: D86/D92 may independently
advance the wire before this work lands.

Bundled SRD is the deliberate D84 exception to the visible key grammar: its
existing stable catalog key remains primary even though the same aggregate also
has a `content-v1` fingerprint. Primary key and fingerprint are therefore
separate storage concepts (§3.1).

`content-v1` is immutable. A future projector is `content-v2` in a new module
and creates `content.v2` keys for newly published external aggregates; v1 keys,
projector code and vectors remain. A new semantic property never changes an
existing v1 key. Instead:

1. if the property lands before v1 is frozen, every affected v1 DTO, projector
   and hand-pinned vector includes it;
2. if it lands after v1 is frozen, a v2 projector includes the property
   explicitly and new/edited content publishes under a v2 key;
3. the adjacent v2→v1 compatibility projector emits a v1 fingerprint only when
   every v2-only semantic value is provably representable in v1 (normally the
   typed neutral/absent value); a non-empty `ability_override` effect, for
   example, is not representable and emits no v1 fingerprint;
4. metadata or character-instance columns emit no new scheme because they were
   never definition semantics.

The importer indexes every older fingerprint that can losslessly represent the
validated aggregate. If one older fingerprint names more than one local
aggregate, it becomes ambiguous and resolves to neither (§3.2); compatibility
must never manufacture a false match. This is how new rule columns join identity
without re-keying old content or pretending that an old projector saw a
mechanic it could not encode.

## 3. Storage: identity is data, layer is data, aliases are not authority

### 3.1 Registry

Add one catalog registry rather than nine new provenance columns, and keep
fingerprints in a child table because D84 proves that a primary key and a
fingerprint are not the same fact:

```text
catalog_content_identities
  content_key       TEXT PRIMARY KEY
  content_kind      closed ContentKind
  key_kind          'derived' | 'bundled-stable' | 'legacy-opaque'
  catalog_layer     'bundled' | 'external'
  normalized_name   TEXT
  created_at

catalog_content_fingerprints
  content_kind
  fingerprint_scheme  'content-v1' | later frozen schemes
  fingerprint_digest  64-hex
  canonical_json      exact canonical envelope for collision verification
  content_key          -> catalog_content_identities.content_key
  fingerprint_role    'current' | 'compatible' | 'bundled-historical'
  UNIQUE(content_kind, fingerprint_scheme, fingerprint_digest, content_key)
  UNIQUE(content_key, fingerprint_scheme)
    WHERE fingerprint_role = 'current'
```

> Superseded by D205/0034: `legacy-opaque` no longer exists.

`catalog_layer` answers the export/licensing question. `key_kind` answers why
the visible primary key has authority. Fingerprint rows answer which frozen
semantic projections can match the aggregate. They are intentionally
orthogonal:

- an imported book, hand-made definition or spell fork is
  `external + derived` and its primary key embeds its latest fingerprint;
- bundled SRD is `bundled + bundled-stable`, retains the seeder's catalog key,
  and has current plus intentionally retained historical fingerprints;
- `external + legacy-opaque` exists only for a pre-existing row that the data
  migration cannot project losslessly. No new authoring/import path can create
  one.

The grammar is no longer trusted as provenance. `importedContentKeyOwner` remains
only a legacy-key parser; new code asks the registry for layer, key kind and
fingerprints.

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
current root as `legacy-opaque` before adding the references; the semantic rekey
and bundled fingerprinting are the separate code-data migration in §9.

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
  alias_kind   'declared-legacy' | 'rekeyed-primary' | 'bundled-legacy'
  UNIQUE(content_kind, alias_key, content_key)
```

`(content_kind, alias_key)` is deliberately **not** unique. One old, less
discriminating scheme may map to two newer identities. The resolver returns a
tagged result:

```ts
type ContentResolution =
  | { kind: 'exact'; contentKey: ContentKey }
  | { kind: 'alias'; contentKey: ContentKey }
  | {
      kind: 'fingerprint';
      contentKey: ContentKey;
      scheme: ContentFingerprintScheme;
    }
  | { kind: 'missing' }
  | { kind: 'ambiguous'; candidates: readonly ContentKey[] };
```

Resolution order is exact primary key, then a unique alias target, then the
strongest supported fingerprint. Exact stable SRD key therefore wins before any
fingerprint, as D84 requires. A content-bearing import computes fingerprints
from the validated DTO; a reference-only v10 share can use a fingerprint only
when its key itself has a recognized `content.vN` grammar. It cannot guess a
fingerprint from a human-readable legacy slug.

Fingerprint resolution considers only losslessly compatible schemes, newest
first. Multiple targets at the first scheme that produces candidates return
`ambiguous`; the resolver does not fall through to an older, less discriminating
scheme. Alias ambiguity is handled the same way. Ambiguous is a disclosed
refusal in backup/catalog import and an incompatibility in share preview;
`ORDER BY id LIMIT 1` is forbidden.

`canonical_json` is stored because a `bundled-historical` fingerprint describes
the SRD graph before a later extraction correction. Reprojecting the current
stable row cannot reproduce those old bytes. On insertion, the runner asserts
`sha256(canonical_json) = fingerprint_digest`; a content-bearing fallback
compares the incoming canonical JSON byte-for-byte with the stored value. A
current fingerprint additionally reprojects the live aggregate's non-name
semantic payload using the registry's authoritative stored `normalized_name`
and compares all three. It never renormalizes the display name as an integrity
check. Thus D84 history does not weaken CI-COLLISION into digest-only trust or
make a Unicode-table upgrade invalidate stored identity.

Legacy owner-namespaced keys supplied by catalog documents are input aliases,
not primary keys and not proof of ownership. Import validates the content,
derives the primary key, then records the declared key as an alias. A document
cannot overwrite bundled content by spelling a bundled key because it never
chooses the target primary key. Only the trusted SRD seeder may assert a
`bundled-stable` primary key.

### 3.3 Insert, match, conflict

All content ingestion uses the same planner/installer primitives:

1. validate the closed semantic DTO and bounds;
2. resolve all parent/reference keys to local primary ids plus the lossless
   scheme fingerprints the child projector embeds;
3. compute the newest fingerprint and every lossless older fingerprint;
4. for external content, derive the primary key from the newest fingerprint;
   for a trusted bundled seed, retain its asserted stable key;
5. resolve exact key, alias and then fingerprint candidates in §3.2's order;
6. if no candidate exists, plan an atomic registry + aggregate-graph insert;
7. if a candidate exists, re-project the stored graph under the matching scheme
   and compare canonical bytes;
8. exact bytes means a proposed **adoption**: reuse every local database id and
   never rewrite rules or display spelling. If the candidate is the derived
   primary key computed directly from this incoming fingerprint and there is no
   metadata conflict, it is a trivial self-match and bypasses §3.4 review;
   every other adoption passes through §3.4 before commit;
9. same primary key/fingerprint with different canonical bytes means
   `ContentIdentityCollision` and rolls back the whole document;
10. record safe declared/rekeyed aliases and compatible fingerprints;
11. merge only set-like non-identity metadata (for example a missing
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

The trusted SRD seeder is the one mutation exception, and only because D84 makes
the stable catalog key authoritative across extraction corrections. It
reprojects before and after the seed update, retains the old digest and
canonical JSON as `bundled-historical`, stores the new pair as `current`, and
never changes the stable key. An external import that reaches either digest is a
fallback proposal for §3.4; it never updates the SRD graph.

### 3.4 D82 match review, remembered decisions and clone

`planContentImport` runs the real dependency resolution and installer inside a
rollback and returns an `ImportPlan` plus a token bound to the canonical input
hash and every candidate key/fingerprint it observed. A byte-identical
candidate reached by the derived primary key computed from that same incoming
fingerprint is a **trivial self-match** when it has no metadata conflict: the
identity function itself says the incoming and stored aggregate are one
content-addressed value, so the planner reuses it without a receipt or modal.
This narrow exemption is what makes D82's fresh-database repeated-character
scenario silent after the first creation.

Every alias match, compatible-fingerprint match, SRD fingerprint fallback and
match with a metadata conflict remains review-required. The UI opens one
accessible `<dialog>` listing every unresolved review-required adoption. Each
row shows the kind, incoming/local names, why it matched (`alias`, `compatible
fingerprint`, `SRD fingerprint fallback`, or `metadata conflict`) and any
metadata conflict. Its choices are:

- **Match** — selected by default; reuse the existing aggregate and local ids.
- **Clone instead** — make a local private copy and route this import's
  references to it.

Clone does not introduce an opaque/random identity escape hatch. The row exposes
an editable clone name, initially `<incoming name> (Private copy)` with the first
available numeric suffix. The normalized name must differ from the incoming
name. The importer replaces only that display name, reprojects the complete
semantic aggregate, and publishes the clone under its resulting derived key.
An unchanged normalized name or a clone key that itself resolves to existing
content remains unresolved in the same modal. A UUID may identify the temporary
draft but never the published clone.

Parent choices can change descendant fingerprints: cloning a class changes the
parent key inside a subclass, for example. The modal therefore simulates choices
in topological order and refreshes affected descendant rows before enabling
commit. It never applies a stale “match” decision computed against the
pre-clone graph.

Accepted decisions are persisted atomically with the import:

```text
catalog_content_match_decisions
  content_kind
  incoming_fingerprint_scheme
  incoming_fingerprint_digest
  decision                    'match' | 'clone'
  target_content_key          -> catalog_content_identities.content_key
  reviewed_at
  UNIQUE(content_kind, incoming_fingerprint_scheme, incoming_fingerprint_digest)
```

Only an actual reviewed choice writes this receipt. Creating a previously
absent aggregate and later trivially self-matching its derived primary key do
not manufacture consent for a choice that was never presented. On later
imports, a valid receipt routes that incoming fingerprint to the remembered
target without showing it again. A match receipt points at the adopted
aggregate; a clone receipt points at the renamed derived clone. Because
installed aggregates are immutable and not physically deleted while
referenced, the mapping is stable. An explicit “forget match choice” control
deletes exactly that one receipt for future imports and nothing else; it never
retargets or deletes existing character/content rows.

Receipts are recipient-local workflow state. They are absent from portable
character JSON and share links; a whole-database image necessarily retains them
because it is the database itself. Exporting Alice's match preferences into
Bob's catalog would make Bob skip a choice he never made.

`commitContentImport` accepts the token and choices, re-runs validation and
resolution in one transaction, refuses a stale token with a fresh preview, then
commits content, receipts and character rows together. With no unresolved
adoptions, the existing confirmation/add surface proceeds directly. Catalog
JSON, portable character JSON, share preview/import and draft/fork publishing
all use this protocol; whole-database replacement does not. This makes the first
non-trivial adoption visible and Match the path of least resistance. A
previously reviewed choice is remembered; a derived-primary trivial self-match
needs no choice to remember. In both cases the Nth identical import is
zero-new-content and no-modal.

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

Spell forks use exactly this boundary. `crypto.randomUUID()` may remain as the
draft id, but `spell-fork.ts` publishes the differently named copy through the
spell projector and receives a derived key. Hand-made homebrew uses the same
path. If publishing reaches an existing aggregate through an alias/fingerprint
or has a metadata conflict, §3.4's review modal appears; “clone instead”
requires/prefills another name and derives another key. A byte-identical
derived-primary self-match reuses the existing aggregate without review. No
authoring path exposes a published key and then mutates the bytes that key
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

For normal v3 rows, `PortableContentAggregate` is the same closed semantic DTO
the identity projector consumes, plus:

- `contentKey`, the latest `fingerprintScheme`, and compatible fingerprint keys;
- raw display text;
- non-identity metadata/notes;
- declared aliases that are safe to carry;
- no database ids, foreign ids, timestamps, layer assertion or active flag.

A pre-migration external row that §9 could not project losslessly uses a
separate, explicitly tagged `PortableLegacyOpaqueAggregate` arm containing its
validated portable child graph and current key. It restores by exact key only
and cannot be authored by v3. This is a data-preservation boundary for rows that
already exist, not a second identity option for forks or homebrew. Omitting such
a row would violate “all”; guessing a semantic DTO would violate D6/D6b.

The exporter selects **every**
`catalog_content_identities.catalog_layer = 'external'` row, not only the
character reference closure, builds each aggregate, validates the stored
canonical-bytes/digest/key relationship without renormalizing its display name,
and orders records by `(content_kind, content_key)`. Bundled rows are omitted by
layer, never by key grammar; their fingerprints do not make them exportable.

Import order is dependency-safe and separate from document order. Each
projector declares the `ContentKind` + input key edges it consumes; the importer
resolves in-document declared keys and installed aliases into a graph, applies a
stable Kahn topological sort, and refuses a cycle or missing edge before writing.
This is required because class starting equipment and background equipment can
point at weapon/armor aggregates, while subclasses point at classes. A hardcoded
“all roots first” list would be false as soon as one of those edges appears.
After resolution, each projector embeds the dependency's same-scheme
fingerprint, not whichever visible stable/derived key happened to resolve
locally.
After the sorted content install, v3 `references` resolve through the
primary/alias registry and character-owned rows clone through the existing
id-remap machinery.

The whole operation is one transaction after §3.4 review. Preview runs the same
installer inside a rollback and reports:

- new/matched content counts by kind;
- every unreviewed, review-required adoption, with match preselected and clone
  available;
- trivial exact-derived self-match counts versus
  alias/SRD/compatible-fingerprint review reasons;
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
5. Exact derived-primary matches with no metadata conflict are trivial
   self-matches and open no modal. Any alias/fingerprint/SRD-fallback or
   metadata-conflict fixture opens the first-adoption modal, defaults all rows
   to match, and offers a valid derived clone name per row.
6. After automatic self-matches and any reviewed defaults, every content count
   is unchanged; the unused aggregate was present in the document but matched;
   all character catalog FKs resolve to Bob's existing ids; only
   character-owned rows (including item instances) increase.
7. Importing Alice's later-level export again creates no catalog rows and does
   not ask about trivial self-matches or remembered review-required matches.
8. Importing the export into a fresh database restores the same external catalog
   and character without a match modal because the aggregates are new there.

### 5.2 Share wire: remain reference-only; identity causes no wire bump

No content aggregate is added to the share document. The exporter writes stable
catalog keys for bundled SRD and primary derived keys for external classes,
subclasses, sources and spells. The importer replaces direct
`WHERE content_key = ?` helpers with the typed resolver from §3.2:

- exact bundled-stable key: use the existing local definition id without a
  derived-adoption review;
- exact derived primary key whose digest is the incoming fingerprint, with
  byte-identical content and no metadata conflict: treat as a trivial self-match
  without review or receipt;
- unique alias to derived content: propose adoption through §3.4;
- recognized derived fingerprint key that uniquely finds the same indexed
  scheme on a local stable SRD or external aggregate: propose a
  fingerprint-fallback adoption through §3.4;
- missing class/subclass/source: retain the current compatibility issue;
- missing spell: retain the current placeholder behavior;
- ambiguous: report a distinct incompatibility; never pick a candidate.

At HEAD, the wire remains v10 because identity changes no tuple field, order,
membership or accepted string domain. This unit does **not** mint v11 merely for
new key values. D86 quantity and D92 attunement slots independently require
their own future wire additions under D41; if either lands first, CI-6 modifies
the then-current new writer instead of editing v10. Hand-frozen v10 links still
prove stable-key exact resolution, legacy aliases, derived-key exact resolution,
and a `content.v1` key falling back to a local stable SRD fingerprint. The last
case appears in the D82 modal. Every version remains reference-only and contains
no `content` section, which guards D46.

Because a share carries no definition bytes, “clone instead” can only clone the
matched local aggregate, rename it, derive its new key and route the imported
character to that copy. The modal says this explicitly, especially for an SRD
historical-fingerprint match where the local stable row may contain a later
extraction correction. A missing reference has nothing honest to clone:
class/subclass/source remains incompatible and a spell remains a placeholder.
This limitation follows D46 rather than weakening D82 with guessed content.

The same limitation applies across fingerprint scheme versions. From a v2 key
alone the recipient cannot compute the record's lossless v1 projection. A
reference-only share crosses schemes only when the recipient already indexes
that exact incoming digest (for example on a stable SRD row, or after an earlier
content-bearing import) or has an explicit key alias. Otherwise the existing
missing-definition/placeholder behavior applies. Portable JSON is the channel
that can compute adjacent compatible fingerprints from actual semantic bytes.

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

Every schema change touching a catalog aggregate must classify each new column
in the same change:

1. **semantic** — add it to a new fingerprint scheme (or to v1 only if v1 has
   not shipped/frozen);
2. **metadata** — carry it but exclude it, with a test proving two values match;
3. **character-instance state** — keep it outside the catalog DTO and
   fingerprint entirely.

There is no “default it into old content” shortcut unless the adjacent
compatibility projector proves that the typed default is mechanically neutral.
The old projector is never edited and existing primary keys are never rewritten.

Applied to the three known upcoming decisions:

- **D83 `ability_override`: semantic.** If it lands before CI-1 freezes v1, all
  affected effect DTOs/vectors include its ability + set-to value. If it lands
  later, `content-v2` includes it; a record carrying an override cannot emit a
  v1-compatible fingerprint, while one with no v2-only effects may.
- **D86 `character_items.quantity`: character-instance state.** Quantity says
  how many possessions this character owns, not what the catalog item is. It is
  excluded from `item` fingerprints and travels in the character backup/share
  schema that adds it.
- **D92 attunement slots: character-instance state.** Slot 1/2/3 membership is
  excluded. The definition's `requires_attunement` remains semantic. Replacing
  `character_items.attuned` with the three-column character-side relation
  changes character portability, not content identity.

This classification is pinned for those properties; implementation may not
reopen it by silently hashing a character row.

## 7. The former owner seams are now pinned

### 7.1 D82: one derived rule, including forks and hand-made content

Every newly published external aggregate uses the latest content fingerprint as
its identity. The rule does not branch on provenance or authoring surface.
Imported books, hand-entered homebrew, an SRD fork and a clone all pass through
the same projector and immutable installer.

For forks specifically:

1. copy the active SRD aggregate into a UUID-addressed draft;
2. require a differently normalized name, preserving D45;
3. publish through the current spell projector;
4. if resolution is a review-required alias/fingerprint/metadata-conflict
   adoption, use the D82 review modal; an exact derived-primary self-match
   silently reuses the aggregate;
5. on later edits, create another draft and another derived identity.

The existing random published `homebrewSpellKey` path is removed. Existing
projectable random-key forks are rekeyed by §9 and keep their former keys as
aliases. A legacy fork that cannot be projected losslessly receives only the
data-preservation `legacy-opaque` status; new forks can never choose it.

D82's clone option also remains derived: it changes the name in the semantic
envelope, not by adding a hidden salt. This makes “private copy” inspectable and
portable. Two independently chosen clones with the same normalized clone name
and mechanics are the same content; a person who wants a distinct copy supplies
a distinct name in the modal.

### 7.2 D84: bundled SRD key first, fingerprint fallback

Every bundled aggregate keeps the checked, stable seeder catalog key as its
primary key. Seed extraction corrections update that aggregate beneath the same
key. Every bundled aggregate also receives the same versioned fingerprints used
for external content, stored separately as §3.1 requires.

Resolution is pinned:

1. an exact stable SRD key wins;
2. a safe legacy key alias is next;
3. only when key resolution fails may a unique compatible fingerprint select
   the SRD aggregate;
4. that fallback is never silent: absent a remembered D82 decision, it appears
   in the modal with match selected and clone available;
5. ambiguity refuses the import.

When a seed correction changes a fingerprint, the old bundled fingerprint stays
attached as `bundled-historical`. This preserves D84's “extraction fixes do not
change identity” rule. A content-bearing import still shows the canonical
difference/metadata in review; a reference-only share can only say that the
fingerprint historically names the stable local row and, as §5.2 states, clone
the local row rather than reconstruct bytes the link never carried.

Bundled rows remain excluded from full JSON by `catalog_layer='bundled'`.
Fingerprinting them does not change licensing, their primary key, or any share
tuple shape.

## 8. Controls — each names the mechanism it proves

- **CI-NAME-REMOVE — `normalizeContentIdentityName`.** Mutate removal into the
  shipped hyphenation. Must fail: `Melf’s Acid Arrow` and
  `MELFS ACID-ARROW` derive the same key, while the legacy slug test remains
  unchanged.
- **CI-NAME-UNICODE — the Unicode alphanumeric retain rule.** Mutate it to
  `[a-z0-9]`. Must fail: two different all-non-ASCII names do not collapse to an
  empty/fallback identity, and canonically equivalent accented forms agree.
  Also mutate stored-aggregate verification/export to renormalize the display
  name. Must fail: a simulated cross-UCD fixture whose authoritative stored
  `normalized_name` retains a code point that the test normalizer drops still
  validates and exports from its pinned canonical bytes. The fixture injects
  the divergent result; it does not implement a custom Unicode table.
- **CI-PROPERTIES — each kind projector.** Delete one load-bearing numeric or
  logical field per kind. Must fail: same normalized name with that one property
  changed derives a different key. This explicitly covers C3's two-halves-one-
  key boundary: delete species `species_templates.base_speed_feet` or background
  `background_templates.ability_score_1` from its aggregate projector. Must
  fail: changing that named TEMPLATE-half field changes the species/background
  key.
- **CI-ID-FREE — aggregate projectors.** Add database ids/timestamps or read
  children in insertion order. Must fail: equivalent graphs inserted with
  different ids/order on Alice and Bob derive identical canonical bytes/key.
- **CI-EDGE-FINGERPRINT — referenced aggregate projection.** Embed a visible
  parent key. Must fail: a subclass/background whose dependency is bundled
  stable on Alice and derived external on Bob still derives identical bytes and
  key from the dependency's same-scheme fingerprint.
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
  key. Must fail: an external payload claiming another aggregate's key is
  refused before any row is written; only the trusted bundled seeder can assert
  a stable key.
- **CI-COLLISION — stored-graph reprojection.** Skip the byte comparison on an
  existing primary key. Must fail: a forced digest collision/damaged stored
  graph rolls the entire import back rather than returning “matched”; a
  historical SRD fallback compares against its pinned canonical JSON because the
  corrected live graph is intentionally different.
- **CI-ALIAS-AMBIGUOUS — `resolveContentKey`.** Restore `ORDER BY ... LIMIT 1`.
  Must fail: one historical alias with two candidates returns `ambiguous` and
  imports neither.
- **CI-FINGERPRINT-AMBIGUOUS — fingerprint resolution.** Fall through to an
  older scheme or pick one target when the strongest matching scheme has two.
  Must fail: the resolver returns both candidates and writes nothing.
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
  exact derived-primary self-matches need no review, catalog counts remain
  unchanged, Bob's local ids are used, review-required alias/fingerprint
  matches are shown once, and the repeated import neither creates content nor
  re-asks.
- **CI-SHARE-REFERENCE — share exporter and immutable codecs.** Add aggregate
  content to the share or bypass the resolver. Must fail: frozen v10 and the
  then-current link contain keys only; exact stable keys resolve first;
  exact derived-primary self-matches bypass review; alias/fingerprint adoptions
  are reviewed; missing content retains existing issues/placeholders.
- **CI-SRD-KEY-FIRST — bundled resolver and seeder.** Prefer a changed
  fingerprint over an exact bundled key or rekey SRD after an extraction fix.
  Must fail: the same frozen stable-key share resolves before fingerprint
  lookup, and reseeding changes mechanics/fingerprint without changing ids or
  keys.
- **CI-SRD-FALLBACK-REVIEW — fingerprint index + D82 plan.** Silently adopt an
  external `content.v1` spell that fingerprints to a stable SRD spell. Must
  fail: preview labels it `SRD fingerprint fallback`, commit requires the
  default match or clone choice, and no bundled row is overwritten.
- **CI-REVIEW-DEFAULT — match-review modal and plan DTO.** Default a row to
  clone or omit one unresolved review-required adoption. Must fail: every
  review-required adoption is listed, every initial choice is `match`, and
  accepting defaults adds zero content; trivial derived-primary self-matches do
  not create review rows.
- **CI-REVIEW-REMEMBER — `catalog_content_match_decisions`.** Ignore the
  receipt or write it before the enclosing import commits. Must fail: the second
  identical import of a reviewed alias/fingerprint match has no review rows and
  no new catalog rows, while a forced later failure leaves neither character
  nor receipt.
- **CI-CLONE-DERIVED — clone planner.** Add a random salt/opaque key or accept an
  unchanged normalized name. Must fail: the clone name changes, the key equals
  the production projector's digest, incoming references use it, and the
  remembered clone receives the Nth import without another clone.
- **CI-DEPENDENT-REPLAN — topological review simulation.** Keep a subclass
  match after its parent class is cloned. Must fail: the dependent fingerprint
  is recomputed and the modal/plan is refreshed before commit.
- **CI-FROZEN-V1 — scheme registry and hand-pinned vectors.** Change any v1
  canonical rule. Must fail the independently recorded canonical strings and
  digests; updating production output cannot update the oracle.
- **CI-SCHEME-EVOLUTION — adjacent compatibility projectors.** Add a
  rules-bearing v2 field to v1 or emit a v1 fingerprint for a non-neutral
  v2-only value. Must fail: old keys/vectors remain fixed, neutral v2 content
  may match v1, and a D83 `ability_override` produces only the v2 fingerprint.
- **CI-ITEM-STATE-EXCLUDED — item projector.** Hash D86 quantity or D92 slot
  membership, or omit `requires_attunement`. Must fail: characters with
  different quantity/slots share one definition key, while changing the
  definition's attunement requirement changes it.
- **CI-BACKUP-LEGACY — v1/v2 adapters.** Route v2 raw spell definitions around
  the installer. Must fail: a hand-frozen v2 backup imports through a legacy
  alias, while a malformed claimed key cannot overwrite a local row.
- **CI-ATOMIC — top-level catalog/backup transaction.** Commit content or match
  receipts before a later character/reference refusal. Must fail: after a
  forced final-stage refusal, catalog, receipt and character counts are all
  unchanged.
- **CI-BACKFILL-CLASSIFY — `content_identity_v1_backfill` classification.**
  Mutate the CI-4b backfill to classify a projectable pre-existing bundled row
  as `external + legacy-opaque`, or a projectable external row as bundled. Must
  fail: registration and idempotence fixtures detect the misclassification
  before exposure; bundled versus external provenance never swaps across
  D59's authorization boundary.
- **CI-CYCLE — dependency graph refusal.** Remove the stable Kahn-sort cycle
  refusal so a cyclic reference graph reaches hashing. Must fail: the
  content-bearing import is refused before hashing or writing any aggregate.
- **CI-LEGACY-CLOSED — registry authoring/import boundary.** Allow a newly
  authored, forked or imported aggregate to mint
  `key_kind='legacy-opaque'`. Must fail: the closed-set assertion permits that
  state only for a pre-existing unprojectable row classified by the backfill.
- **CI-FORGET-SCOPE — remembered-choice deletion.** Make “forget match choice”
  retarget/delete a character or content row, or delete more than the selected
  receipt. Must fail: forgetting deletes exactly one receipt and changes no
  other table.

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
identity/fingerprint/alias/match-decision/item-definition tables, relaxes
name-unique indexes, and registers every existing root under its **current key
as `legacy-opaque`**. That makes the new foreign keys valid using SQL alone and
preserves every row even if the later semantic upgrade cannot project it.

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
3. retain every bundled primary key, mark it `bundled-stable`, compute its
   current v1 fingerprint, and assert the explicit inventory covers every
   bundled root;
4. derive keys for every projectable external aggregate, including hand-made
   rows and existing random-key spell forks, update every catalog/character FK
   in one migration transaction, and record old keys as `rekeyed-primary`
   aliases;
5. build species/background aggregates across both halves before rekeying
   either;
6. add every lossless older compatible fingerprint, but never one whose newer
   semantic values cannot be represented, and pin the canonical JSON for every
   stored digest;
7. reproject every derived registry row and every bundled current fingerprint,
   and assert its stored digest/key relationship;
8. run foreign-key check and assert every catalog root has exactly one registry
   row and at most one `current` fingerprint per scheme.

If a legacy external row cannot be projected losslessly, migration records it as
`external + legacy-opaque`; it does not invent missing mechanics or refuse
database boot. The complete export still carries it through the explicit legacy
arm in §5.1. A later explicit edit can publish a derived replacement. The
migration writes no match-decision receipts: rekeying the user's own stored row
is not an adoption from an import, and pre-approving a later friend's match would
silence D82's modal.

Because HEAD is pre-alpha, there is no compatibility adapter inside the new
runtime model. Compatibility exists only at artifact boundaries (legacy
catalog keys, backup v1/v2, share wire v1-v10), where real user data can arrive.

## 10. Dispatches — revised after D82/D84

The work is intentionally not called “one hash helper.” It replaces identity,
widens the catalog model, adds a two-phase review protocol, and changes a
complete backup format. There are no owner-dependent identity dispatches left.

Two already-decided schema units are sequencing inputs rather than hidden work
inside a projector:

- land D83's effect vocabulary before CI-1 freezes v1 if practicable; if it
  lands later, §6 requires `content-v2` and CI-SCHEME-EVOLUTION, but its final
  schema shape still lands before CI-3c or CI-5 starts;
- land D86 quantity and D92 attunement slots before the item picker and backup
  cutovers in CI-3c/CI-5. They remain excluded from the fingerprint. These are
  external prerequisite merges, not work hidden inside either CI dispatch.

- **CI-1 — M: identity kernel and frozen vectors.** Brands, name/rule-text
  normalization, canonical serializer, versioned fingerprint/adjacent-
  compatibility registries, derived-key parser, SHA vectors and
  CI-NAME/NULL/SET/PROSE/FROZEN/SCHEME controls. No database changes.
- **CI-2a — L: identity, fingerprint, alias, decision registry and resolver.**
  `catalog_content_identities`, `catalog_content_fingerprints`, ambiguous
  aliases/fingerprints, `catalog_content_match_decisions`, typed
  `ContentResolution`, root-key relations, name-index relaxation, SQL
  `legacy-opaque` registration and invariants.
- **CI-2b — L: append-only catalog data-migration infrastructure.** Lifecycle
  integration for normal/candidate/restore databases, applied-marker table,
  checksum/source freeze, atomic/idempotent runner and prefix fixtures. No v1
  backfill is registered before the projectors it calls exist. Calling this
  small would hide a new persistence mechanism.
- **CI-3a — L: spell and subclass aggregate backend.** Complete projectors,
  immutable planner/installer primitives, legacy key aliases, replacement for
  spell name fallback/version mutation and subclass update-in-place, disposal of
  `spell_identities.content_key` as an internal group key, relaxed
  same-identity/edition uniqueness, child-graph reprojection and derived-fork
  publishing behind tests. Public import/fork cutover waits for CI-4a so no
  review-required adoption can be silent.
- **CI-3c — L: equipment and modifier-item catalog.** Weapon/armor projectors;
  new `item_definitions` and effect children; picker copies into
  `character_items`/`character_effects`; catalog record kinds and import
  reporting against D83/D86/D92's final shapes. Quantity and slot membership
  stay character-owned; `requires_attunement` and definition effects are
  semantic. No live template FK is added to character weapon/armor/item rows.
- **CI-3b — XL: class, feat, species and background aggregates.** This is XL,
  not “four more record kinds”: class has more than a dozen child tables, species
  and background span definition/template halves, and background equipment has
  cross-catalog edges. Adds typed document DTOs/importers and production
  projectors for all four.
- **CI-3s — L: D84 bundled stable keys plus fingerprints.** After all nine
  projectors exist, register every bundled aggregate under its existing stable
  key, index current/historical v1 fingerprints, make exact key resolution
  precede fallback, preserve keys across a mutated extraction fixture, and land
  CI-SRD-KEY-FIRST/FALLBACK-REVIEW backend controls. No SRD row is rekeyed.
- **CI-4a — XL: D82 two-phase adoption review and runtime cutover.** Common
  rollback plan/token/commit protocol, dependency-aware modal, match-default
  choices, derived renamed clones, atomic remembered decisions and stale-plan
  refusal. Cut catalog import and spell-fork publishing to the immutable
  installer only after this UI exists. CI-REVIEW/CLONE/DEPENDENT controls land
  here.
- **CI-4b — L: semantic backfill.** Register
  `content_identity_v1_backfill` only now that every projector exists and new
  writes are derived; retain bundled keys while fingerprinting them, rekey every
  projectable external aggregate including random-key forks, remap all
  catalog/character references, add old-key aliases, retain unprojectable rows
  as `legacy-opaque`, and exercise idempotence/rollback from every schema
  prefix.

  > Superseded by D205/0034: `legacy-opaque` no longer exists.
- **CI-5 — XL: character backup v3 complete content manifest.** Semantic plus
  legacy-opaque portable union, strict validation/limits, all-external export,
  dependency-safe transactional plan/install, D82 modal integration, fresh
  restore, preview report, and v1/v2 adapters. CI-ALL-EXTERNAL, CROSS-IMPORT,
  BACKUP-LEGACY and ATOMIC land here.
- **CI-6 — L: share resolver/review conversion, reference-only wire.** Replace
  exact catalog helpers across preview/import/placeholder paths with typed
  key-first/fingerprint-fallback resolution; reuse CI-4a's modal and remembered
  decisions; clone the local candidate when requested; add frozen v10 plus
  then-current stable/legacy/derived/fallback fixtures and CI-SHARE-REFERENCE.
  No tuple changes are caused by identity.
- **CI-7 — L: authoring immutability.** Draft ids and publish-to-derived-key
  across nine content kinds, edit-as-new-version, explicit reference retarget
  command, D82 review on a review-required existing result, silent reuse of a
  trivial exact-derived self-match, and refusal to export/share drafts. Forks
  are one spell-shaped use of this common lifecycle, not a policy branch.
- **CI-8 — M: adversarial controls and UI disclosure.** Mutation suite for every
  projector and scheme transition, import preview counts/conflicts,
  same-name-distinct and match-reason labeling, remembered-choice management,
  and wording that distinguishes complete JSON from reference-only links.

Strict dependency order:

```text
External prerequisites:
D83 effect schema ─────┐
D86 quantity schema ───┼→ CI-3c
D92 slot schema ───────┘

Identity work:
CI-1 → CI-2a → CI-2b
                  ├→ CI-3a ───────┐
                  └→ CI-3c → CI-3b┴→ CI-3s → CI-4a → CI-4b → CI-5 → CI-8
                                                ├──────────→ CI-6 ─┘
                                                └──────────→ CI-7 ─┘
```

CI-3c precedes CI-3b because class/background aggregates can reference its
weapon/armor fingerprints. They remain separate because the class/origin graph
and the new item catalog have different failure surfaces. CI-4a does not cut
over any public ingestion path until all nine projectors and the review UI
exist. CI-5 does not begin until backfill is registered; otherwise “all non-SRD
content” would ship as a format with known holes or unstable legacy
classifications. The three external prerequisite edges gate CI-3c directly and
CI-5 transitively: neither dispatch starts until the D83 effect shape, D86
quantity shape and D92 three-slot shape are merged.

## 11. Acceptance and explicit non-goals

The unit is complete only when:

- identical semantic aggregates imported independently have identical primary
  keys and no duplicate catalog rows on character backup/share import;
- same normalized name with a real property/prose difference produces two
  representable identities and a disclosed conflict;
- a v3 full JSON restored into a fresh database carries every external catalog
  aggregate and the character;
- a v3 import into an independently populated database silently reuses each
  exact derived-primary self-match; every first-time alias/fingerprint/SRD
  fallback or metadata-conflict adoption is listed, defaults to match, and
  reuses local content ids;
- repeating that import creates zero catalog rows and does not show already
  remembered matches again;
- in D82's fresh-database repeated-character-import scenario, import #1 creates
  the absent external aggregates with no modal, import #2 resolves their
  byte-identical derived-primary keys with no modal, and import #N remains
  no-modal with zero catalog clones created by default; Clone remains available
  whenever a non-trivial match is actually reviewed;
- choosing clone creates a differently named, fingerprint-derived private copy,
  remaps this import to it, and does not clone it again on the Nth import;
- bundled SRD always resolves by its stable key first; a fingerprint fallback
  is visible in the same modal and never rekeys or overwrites the bundled row;
- v1 fingerprints and keys remain unchanged when D83 or another future semantic
  property requires v2; D86 quantity and D92 slot membership never affect an
  item-definition key;
- share wire remains reference-only, identity itself causes no version bump,
  and existing missing-content behavior remains;
- v1/v2 backups and v1-v10 shares remain readable through explicit legacy
  adapters/aliases;
- CI-3c and CI-5 do not start until D83's final effect schema, D86's quantity
  schema and D92's three-slot attunement schema shapes are merged.

Not in this unit:

- fuzzy matching, edit distance, publisher/title heuristics, or “probably the
  same” merges;
- online/global identity registration;
- opaque/random published identities or hidden clone salts for new content;
- rekeying bundled SRD to a fingerprint;
- deleting old immutable content when a new revision arrives;
- inferring that prose is flavor text when the schema does not say so;
- sharing catalog content in URL fragments;
- making character-owned item/weapon/armor instances global rows;
- committing any imported non-SRD fixture or text.
