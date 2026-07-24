# Browser catalog import

Catalog import is local-first: JSON is sent to the database Worker and written
to the browser's SQLite database. It is not uploaded to a server.

## Tier 1 JSON

Each selected Tier 1 document must contain a JSON array. A browser may pass one
or several documents; records with the same `versionKey` are merged.

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
    "healing": false
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

`castingTime`, `range`, `components`, `duration`, and `sourceSlug` may be a
string or `null`. `sourcePage` may be a non-negative integer or `null`.
`tags` defaults to `[]`, and `healing` defaults to `false`.
`effectReliabilityCategory` defaults to `fixed_effect` and accepts
`attack_roll`, `saving_throw`, `fixed_effect`, `modifier_scaled`,
`ritual_utility`, or `mixed`.

## Merge and persistence rules

`identityKey` identifies a spell concept across editions. `versionKey`
identifies one edition-specific version. Versions are never matched by display
name. For a shared identity, the canonical display name is chosen in the order
2024, expanded, then 2014. Previous canonical names become aliases, and
whitespace/case-normalized names and aliases can join renamed records.

Duplicate `versionKey` records union spell lists, tags, attack modes, save
abilities, and publications. A publication is unique by source-book name and
keeps its record's page and reference. Reimport synchronizes additions,
updates, and removals for every one of those pivots. Ritual and concentration
tags are also inferred from the explicit booleans and the source notation used
by the PHP catalog.

Imported versions absent from a later complete import are tombstoned
(`is_active = 0`), not deleted. Reappearing versions are reactivated with the
same database ID. User-provenance versions are never tombstoned.

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

The summary reports created, updated, and tombstoned versions; identity
changes; created publication/pivot rows; and Tier 2 availability/count.
A dry run computes the same diff and then rolls back. Every normal import is a
single transaction: a malformed record, uniqueness conflict, or selection
refresh error rolls back identities, versions, pivots, aliases, activity, and
selection status together.
