# Character sharing design guide

A character share is deliberately smaller than a full backup. It carries the
user's choices, creates a new character on import, and rebuilds derived source
instances and selection slots by running the grant-rule slot generator. It is
not intended to preserve database identifiers, timestamps, notes, derived
rows, or every piece of application state.

The implementation is the source of truth:

- `validateShareDocument()` in `src/sharing/schema.ts` defines the logical
  object contract.
- `shareDocumentToPositional()` and `positionalToShareDocument()` in
  `src/sharing/codec.ts` define the wire contract.
- the golden assertions in `tests/unit/sharing/codec.test.ts` pin the exact
  version-1 layout and its fixed record lengths.

This guide records the design intent and invariants without duplicating those
contracts field by field.

## Logical semantics

The readable object form uses the format marker
`dnd-multiclass-spells-character-share` and version `1`. Unknown fields are
rejected, and every `note` or `notes` field is intentionally excluded.

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

Version 1 serializes the validated object as positional JSON. Record lengths are
fixed, and an absent optional record field occupies its assigned `null`
position. The codec rejects shorter, longer, or otherwise malformed tuples.
The golden codec tests are the readable reference for every position.

The UTF-8 JSON bytes are compressed with `CompressionStream("gzip")`, encoded
as unpadded base64url, and stored after the URL fragment marker (`#`). Fragment
data is therefore not sent to the web server as part of an HTTP request.

Brotli is intentionally rejected for version 1. It saves too little for this
payload to justify a fallback codec, and browser-native Compression Streams
support is not sufficiently universal across the project's target browsers.
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
