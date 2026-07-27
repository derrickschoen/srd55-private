# Browser catalog import

Catalog import is local-first: JSON is sent to the database Worker and written
to the browser's SQLite database. It is not uploaded to a server.

## Tier 1 JSON

Each selected Tier 1 document must contain a JSON array. A browser may pass one
or several documents; records with the same `versionKey` are merged.

An element's optional `kind` field says what kind of record it is. It may be
`spell` or `subclass`. **An element with no `kind` — or with `kind: null` — is a
spell**, which is the meaning every document written before subclasses existed
already has, so those documents keep importing unchanged. A `kind` that is
present but unrecognized is refused outright rather than skipped: the record is
content this build cannot store, and skipping it would report the document as
fully imported while dropping a record the user can see in the file.

Kinds may be mixed freely, both across documents in one call and within a single
document.

### Spell records

```json
[
  {
    "identityKey": "chill-touch",
    "versionKey": "2024:chill-touch",
    "name": "Chill Touch",
    "edition": "2024",
    "level": 0,
    "school": "Necromancy",
    "castingTime": "Action",
    "range": "Touch",
    "components": "V, S",
    "duration": "Instantaneous",
    "concentration": false,
    "ritual": false,
    "attackModes": ["melee_spell"],
    "saveAbilities": [],
    "effectReliabilityCategory": "attack_roll",
    "spellLists": ["Sorcerer", "Warlock", "Wizard"],
    "sourceBooks": ["Player's Handbook (2024)"],
    "sourcePage": 202,
    "sourceSlug": "chill-touch",
    "tags": [],
    "healing": false,
    "upcastScale": null,
    "upcastLevels": [],
    "upcastSummary": null
  }
]
```

Required fields are:

- Non-empty strings: `identityKey`, `versionKey`, `name`, `edition`, and
  `school`.
- `edition`: `2014`, `2024`, or `expanded`.
- `level`: an integer from 0 through 9.
- Booleans: `concentration` and `ritual`.
- Lists of non-empty strings: `attackModes`, `saveAbilities`, `spellLists`,
  and `sourceBooks`.

`castingTime`, `range`, `components`, `duration`, `upcastSummary`, and
`sourceSlug` may be a string or `null`. `sourcePage` may be a non-negative
integer or `null`. `tags` defaults to `[]`, and `healing` defaults to `false`.
`effectReliabilityCategory` defaults to `fixed_effect` and accepts
`attack_roll`, `saving_throw`, `fixed_effect`, `modifier_scaled`,
`ritual_utility`, or `mixed`.

#### The upcast progression

`upcastScale` and `upcastLevels` are optional and default to `null` and `[]`.
Every document written before they existed omits them, and omitting them is not
a claim that the spell cannot be upcast — it is a document that does not say.

They must be supplied TOGETHER or not at all, and the import is refused if only
one is present. The reason is that the levels alone are ambiguous:

- `"upcastScale": "slot_level"` means the levels are SPELL SLOT LEVELS, 1
  through 9 — the "Using a Higher-Level Spell Slot" paragraph of a levelled
  spell.
- `"upcastScale": "character_level"` means they are CHARACTER LEVELS, 1 through
  20 — a cantrip's damage ladder, e.g. `[5, 11, 17]`.

`[5, 11, 17]` is a plausible list under either reading and means two completely
different things, so a list with no scale is refused rather than stored.
Duplicated levels and levels outside the scale's range are refused too.
`upcastSummary` is free text and is printed verbatim.

#### What the importer reads OUT of `range` and `components`

Both are stored exactly as you write them and are what the printable spell card
shows. In addition, the importer parses each and stores what it can recognise in
separate columns, so a range can be sorted and a material cost compared:

- `"range": "60 feet"` also stores a distance of 60 feet; `"Self (30-foot
  Cone)"` also stores an origin of `self` and a 30-foot cone; `"Touch"`,
  `"Self"`, `"Sight"`, `"Unlimited"` and `"Special"` store the origin and no
  distance.
- `"components": "M (a diamond worth 300+ GP)"` also stores the material text
  and a cost of 30000 copper pieces, flagged as a MINIMUM because of the `+`.
  Without the `+` the cost is stored as exact.

**Anything the importer cannot read whole is stored as nothing extra, and your
text is never modified, rejected or reformatted.** A range of `"Anywhere on this
plane"` imports fine and prints exactly as written; it simply has no distance
attached to it.

### Subclass records

```json
[
  {
    "kind": "subclass",
    "contentKey": "2024:longroad.homebrew:college-of-the-long-road",
    "parentClassKey": "2024:class:bard",
    "name": "College of the Long Road",
    "edition": "2024",
    "features": [
      {
        "classLevel": 3,
        "name": "Marching Song",
        "description": "Printed text of the feature."
      },
      {
        "classLevel": 6,
        "name": "Extra Attack",
        "description": "Printed text of the feature.",
        "effect": {
          "kind": "extra_attack",
          "attackCount": 2,
          "weaponScope": "any_weapon"
        }
      }
    ]
  }
]
```

`contentKey` **must be an imported key** of the form
`<edition>:<owner.namespace>:<name>` — three colon-separated parts whose middle
segment contains a dot. Every bundled key puts a dotless record-kind literal
there (`2024:subclass:eldritch-knight`), so this shape is what stops a document
overwriting bundled content, and it is what keeps the subclass identifiable as
imported inside a backup or a share link.

`parentClassKey` names the parent class **by content key, never by display
name**, so a user-authored class that happens to share a name cannot adopt the
subclass. A parent class this database does not have is refused rather than
invented.

`features` must be a non-empty list, and **its array order is the printed
order** — `sort_order` is the index and is deliberately not authorable, because
an authored order beside an array is a second source of truth for the same fact.
Each feature requires `classLevel` (an integer from 1 through 20, in the
subclass's own class), a non-empty `name`, and a non-empty `description`.
Feature names must be unique within a subclass.

`effect` is optional and defaults to `null`. **`null` is the common case**: a
feature with no effect is a printed paragraph. The only effect kind currently
accepted is `extra_attack`, which requires `attackCount` (an integer of 2 or
more — the **total** attacks the Attack action grants, never an increment) and
`weaponScope` (`any_weapon` or `one_bonded_weapon`). `weaponScope` has no
default on purpose: defaulting it would widen a one-weapon grant to every weapon
the character holds.

An imported subclass is a **non-caster with printed features**. The format has
no vocabulary for spellcasting (`spellcasting_ability`, caster fraction and
rounding, grant rules, progressions), for a source book, or for a flavour
paragraph, and those columns stay `NULL`. Fields naming them are dropped like
any other unknown field rather than half-stored.

Two documents in one call may not disagree about the same subclass. Spell
records merge on `versionKey`; a subclass carries an ordered feature list and
there is no defensible merge of two orderings, so a conflict is refused.
Identical repeats of the same subclass are accepted.

## Merge and persistence rules

`identityKey` identifies a spell concept across editions. `versionKey`
identifies one edition-specific version. Versions are never matched by display
name. For a shared identity, the canonical display name is chosen in the order
2024, expanded, then 2014. Previous canonical names become aliases, and
whitespace/case-normalized names and aliases can join renamed records.

Duplicate `versionKey` records union spell lists, tags, attack modes, save
abilities, and publications. A publication is unique by source-book name and
keeps its record's page and reference. Reimport synchronizes additions,
updates, and removals for every one of those pivots. The `ritual` and
`concentration` booleans each add the matching tag, and they are its ONLY
source: `castingTime` and `duration` are text the importer stores and never
reads. A record declaring `concentration: false` beside a duration of
`"Concentration, up to 1 minute"` gets no concentration tag — the declaration
wins, and since both fields are required there is never an absence to guess at.

Imported versions absent from a later complete import are tombstoned
(`is_active = 0`), not deleted. Reappearing versions are reactivated with the
same database ID. User-provenance versions are never tombstoned.

**That sweep runs only when the documents declared spells.** An import never
removes a kind the documents did not carry, so importing subclasses alone does
not tombstone a single spell. An empty document (`[]`) declares spells while
carrying none, which is how you empty the spell catalog — and it declares that
per document, so `['[]', <a subclass file>]` still sweeps the spell catalog and
imports the subclass in the same call.

**An import never removes a subclass, in any circumstance.** There is no
tombstone or delete path for one, and therefore no `subclasses_tombstoned`
counter. `subclass_definitions` has neither a `provenance` column to scope a
sweep by (bundled SRD subclasses live in the same table) nor an `is_active`
column to make removal reversible, so removal would have to be a hard `DELETE`
against a table `character_class_levels` holds a foreign key into. Removing an
imported subclass is a manual operation.

Within a single subclass, the document's `features` array **is** a full
replacement: a feature that vanishes from a revised document is deleted, because
nothing references a feature row. Re-importing an unchanged subclass is a no-op.
An import cannot move a subclass to a different parent class, and cannot claim a
`(class, name, edition)` name slot another key already holds; both are refused
by name rather than left to raise an opaque constraint error mid-transaction.

If a version is referenced by a selection, Wizard spellbook entry, loadout, or
preference, its imported rules and pivots are preserved byte-for-byte.
Activity can still change, and optional text can still be filled in. Any
selection affected by tombstoning or reactivation is refreshed in place, so
the reference is retained with persisted `invalid` or `valid` status.

## Optional Tier 2 text

Tier 2 documents are also JSON arrays. Only these fields are read:

```json
[
  {
    "versionKey": "2024:chill-touch",
    "_description": "Complete locally supplied spell text."
  }
]
```

Tier 2 is optional. When present, its unique `versionKey` set must exactly
match the merged Tier 1 set; partial, unexpected, blank, or conflicting text
is rejected. An ordinary Tier 1 import does not erase text loaded previously.
Only import text that you are licensed to store.

## Typed Worker API

The self-registering RPC method is `catalog.import`:

```ts
const result = await rpc.call('catalog.import', {
  documents: await Promise.all(tier1Files.map((file) => file.text())),
  textDocuments: await Promise.all(tier2Files.map((file) => file.text())),
  dryRun: true,
});
```

The typed convenience slice in `src/catalog/client.ts` exposes the same call:

```ts
const catalog = createCatalogClient(rpc);
const result = await catalog.importCatalog(tier1Documents, {
  textDocuments: tier2Documents,
  dryRun: false,
});
```

The summary reports created, updated, and tombstoned spell versions; identity
changes; created publication/pivot rows; `subclasses_created`,
`subclasses_updated`, and `subclass_features_created`; and Tier 2
availability/count.

The subclass counters are **separate from `created`/`updated` rather than folded
into them**, because those are the spell numbers the character-list screen
prints: a user who imported five spells and one subclass reading "6 created"
would be reading a spell count that is wrong. There is no
`subclasses_tombstoned`, and the absence is the statement — see above.

A dry run computes the same diff, across both kinds, and then rolls back. Every
normal import is a single transaction spanning both arms: a malformed record,
uniqueness conflict, refused subclass, or selection refresh error rolls back
identities, versions, pivots, aliases, activity, selection status, and every
imported subclass together. A document is one edit, and half of one applied is
worse than none of it.
