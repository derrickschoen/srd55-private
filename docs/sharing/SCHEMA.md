# Character sharing design guide

A character share is deliberately smaller than a full backup. It carries the
user's choices, creates a new character on import, and rebuilds derived source
instances and selection slots by running the grant-rule slot generator. It is
not intended to preserve database identifiers, timestamps, derived rows, or
every piece of application state.

The versioned registry is the source of truth for the wire contract:

- `validateShareDocument()` in `src/sharing/schema.ts` defines the logical
  object contract.
- `SHARE_SCHEMAS` in `src/sharing/wire-schemas/index.ts` selects the current
  schema and preserves every historical schema as a literal, deeply frozen
  tuple inventory.
- `shareDocumentToPositional()` and the version-dispatched decoder in
  `src/sharing/codec.ts` interpret that inventory.
- separate hand-authored golden assertions in
  `tests/unit/sharing/codec.test.ts` pin the exact v1 and v2 positions, while
  the registry fingerprint and independent frozen fragments guard each
  version's field meanings and accepted arities.

This guide records the design intent and invariants without duplicating those
contracts field by field.

## Logical semantics

The readable object form uses the format marker
`dnd-multiclass-spells-character-share` and version `3`. Unknown fields are
rejected.

Notes are not one policy, and the line between them is which side of the
character a note is attached to. A note on the BUILD travels unconditionally —
a weapon, a species, a species trait, a background, a suit of armour, an
effect. A note on WORKING STATE never travels — a spell preference, a rule
override, a warning acknowledgement, a loadout, a class level, a selection
slot, a source instance. A character's own `notes` sits on the build side and
is the one field the SHARER chooses: it travels only when the `notes` export
option is set, and that option is off by default (Q12).

`tests/integration/sharing/column-portability.test.ts` is the authority on
which of the three every column is; it classifies all of them and fails when
one changes side.

Explicit classes and standalone sources receive contiguous share-local
identifiers in export order. Selections refer to those identifiers, not
database IDs. Class, subclass, and recursively generated child sources collapse
to their owning explicit record. On import, a selection is resolved among that
root's regenerated descendants by its rule key and ordinal.

Class level and acquisition position preserve multiclass ordering. Source and
subclass configuration contain JSON user choices needed to regenerate the same
slots. Rule overrides may contain any bounded JSON value. Only mutable spell
choices are shared; fixed grants remain derived.

The exporter omits ordinary defaults to keep links small, including ability
scores of 10, the default rules edition, false flags, empty configuration, and
absent opt-in collections. This is exporter behaviour, not a validator
requirement: the logical validator accepts and preserves valid explicit
defaults such as an ability score of `10` or edition `"2024"`.

## Spell keys and placeholders

Official spell versions use `<edition>:<slug>`. Homebrew and homonym keys use
`<edition>:<owner>:<slug>`, where the owner has reverse-DNS syntax. Components
created by the catalog-key helpers are normalized to lowercase ASCII,
non-alphanumeric runs become hyphens, and surrounding hyphens are removed.

Share validation checks key grammar and rejects reserved prototype-related
components. It does not consult the owner registry. Registry membership is
enforced when creating a new homebrew key through `homebrewSpellKey()`;
syntactically valid keys already present in a share document are accepted.
Existing catalog keys are never rewritten.

An unavailable spell becomes a safe local inactive placeholder using the exact
shared key and fallback name. The placeholder has level `-1`, school `Unknown`,
provenance `placeholder`, summary `Not imported`, and no copyrighted rules
text. A later catalog import upgrades the same row in place. Placeholder
metadata is carried once per unknown key and may support selections, spellbook
entries, preferences, or loadouts.

## Wire transport

Both versions serialize the validated object as positional JSON. Tuple arity is
versioned; it is not one fixed length shared by every historical link.

Version 1 accepts exactly these variants:

- root: 11, 12, 13, 14, or 15 positions;
- character: 11 or 12 positions;
- class: 8 positions;
- source: 6 positions;
- weapon: 19, 20, or 22 positions.

The v1 character's trailing positions are `placeholders` at index 10 and the
optional character `notes` at index 11. A shorter character tuple therefore
means that the note predates that trailing position; it does not shift any
earlier field. The class's eighth position is `subclassConfig`, and the
source's sixth position is its fallback display `name`. Those class and source
positions were introduced while the format still identified itself as v1, so
the frozen v1 registry accepts the resulting 8- and 6-position records. A v1
tuple outside the exact variants above is refused.

Version 2 changes exactly two structures:

- The weapon's independent `range_normal_feet` and `range_long_feet` slots
  become one tagged range tuple. `none` has no distances. `ranged` has a
  required near distance and a nullable far distance at least as large.
  `legacy` losslessly carries only v1's long-only and inverted pairs; the
  current encoder refuses to mint it.
- `placeholders` moves from character index 10 to root index 15. The v2 root is
  therefore exactly 16 elements and its character tuple exactly 11. The
  placeholder list's count and shape validation run at that new root position.

Class and source records do not change in v2: they remain exactly 8 and 6
positions respectively. Thus v2 accepts root 16, character 11, class 8, source
6, and weapon 21. The placeholder move—not an appended character field—is the
wire-v2 placeholder mechanism.

Version 3 changes exactly one structure: the character tuple appends
`ability_allocation_method` (D64's allocation signal — `standard_array`,
`point_buy`, or `manual`, `null` when never allocated), taking the character
tuple from 11 to 12 positions. Every earlier position keeps its meaning. The
field exists because the exporter omits scores equal to the default 10 and the
importer refills them: without the signal on the wire, an allocated all-10s
character — explicitly valid under D64 — round-tripped looking unallocated.

The adjacent v1-to-v2 migration pads historical short roots without inventing
optional sections, moves placeholders and the optional character note to their
v2 positions, upgrades old weapon damage variants, and maps all five possible
range pairs through the shared weapon-range boundary: null/null, near-only,
ordinary, long-only, and inverted. It never coerces, rejects, or drops either
v1 range field. The adjacent v2-to-v3 migration null-pads the character tuple's
new trailing position: a v2 link could not carry the allocation signal, and
`null` is the never-allocated state that was true when it was minted. Decoding
dispatches from the frozen root version and composes the adjacent migrations
(a v1 link lifts 1→2 then 2→3) before current-version validation; encoding
always writes v3.

Within any accepted variant, an absent optional/default field occupies its
assigned `null` position. `null` preserves field position; it does not imply
that all versions or all historical variants have the same tuple length.

Any subsequent change to tuple order, meaning, membership, or accepted value
domain increments the root version, adds an adjacent migration, and adds an
independently hand-frozen fragment fixture. Existing versions are never
extended or edited to make room for that change. One root version governs the
complete export; nested tuples carry no separate versions.

The UTF-8 JSON bytes are compressed with `CompressionStream("gzip")`, encoded
as unpadded base64url, and stored after the URL fragment marker (`#`). Fragment
data is therefore not sent to the web server as part of an HTTP request.

Brotli is intentionally rejected for the share transport. It saves too little
for this payload to justify a fallback codec, and browser-native Compression
Streams support is not sufficiently universal across the project's target
browsers.
MessagePack, CBOR, TSV hybrids, and database JSONB also add parser or
maintenance cost without beating positional JSON plus gzip enough to warrant
another dependency or grammar.

## Security and limits

Every fragment is attacker-controlled. Import rejects oversized encoded text
before base64 decoding, caps decoded compressed bytes, and counts streamed
decompressed bytes before parsing. Only then does it parse JSON and enforce the
exact format and version, tuple lengths, nesting depth, collection counts,
cumulative loadout entries, scalar types, string lengths, spell-key grammar,
contiguous identifiers, unique records, and valid references.

Validation constructs fresh objects instead of merging untrusted objects, and
reserved prototype-related keys are rejected. Preview performs validation and
catalog checks without mutation. Only an explicit user action imports a new
character, and database writes run atomically so a failed import leaves no
partial character state.

The concrete caps live in `SHARE_LIMITS` beside the validator. Keeping the
transport limits before parsing bounds memory and decompression work; keeping
the semantic limits in validation bounds database work even for a small,
highly-compressible document.

## Phases

1. Define schema, catalog-key utility, positional codec, gzip/base64url
   transport, limits, and strict validation.
2. Export user choices and import them into a new character while regenerating
   derived source and slot state.
3. Insert safe unknown-spell placeholders and upgrade them during catalog
   import.
4. Add worker RPC/client support and character-list share, preview, QR, and
   explicit-add controls.
5. Prove codec layout, integration link round-trips, placeholder lifecycle,
   hostile-input rejection, and key normalization; run the complete test and
   build commands.
