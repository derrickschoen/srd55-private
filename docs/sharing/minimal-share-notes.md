# Minimal character-share example

[`minimal-share-example.json`](./minimal-share-example.json) is the readable
logical document used by the format benchmark and by an executable validator
test. It contains catalog identifiers, user choices, and fallback names, but no
spell rules text.

The specimen follows the live v2 logical contract:

- share-local numeric `id` values identify classes and standalone sources;
- selections use `ref` to point into that shared identifier space;
- `acquired` is a numeric character-level position;
- a standalone source may carry its fallback display `name`;
- unknown-spell metadata is deduplicated in the root `placeholders` list;
- class, source, selection, preference, override, acknowledgement, and loadout
  working-state notes are not part of the contract;
- the optional character `notes` field is valid but is omitted from this
  minimal specimen because exporting it is an explicit sharer choice.

The object form is intentionally keyed and readable. Production links do not
embed this keyed JSON directly: the codec validates it, maps it to the
versioned positional v2 layout, serializes compact JSON, compresses with gzip,
and uses unpadded base64url in the fragment.

## Why each populated section remains

| Section | Reason |
|---|---|
| `format`, `version` | Select the exact contract and migration path. |
| `character` | Carries the character's user-authored identity and base scores. |
| `classes` | Preserves multiclass membership, levels, order, abilities, and configuration. |
| `sources` | Preserves standalone grants such as feats and their configuration. |
| `selections` | Preserves mutable spell choices and their source/rule/ordinal addresses. |
| `spellbook` | Preserves the Wizard's learned spell set. |
| `preferences` | Preserves explicit user preference state. |
| `overrides` | Preserves bounded table rulings that catalog rules cannot derive. |
| `acknowledgements` | Preserves warnings the user has explicitly accepted. |
| `loadouts` | Preserves named, ordered spell groupings and roles. |
| `placeholders` | Supplies one safe fallback name for an unavailable spell key. |

Defaults may be omitted by the exporter, but omission is not a field-order
optimization. The positional encoder writes every field assigned by the
selected wire schema and uses `null` for an absent position.

Historical byte measurements and the retained alternative-format analysis live
in [`format-comparison.md`](./format-comparison.md). Re-run them with
[`measure-formats.mjs`](./measure-formats.mjs); do not copy the old byte totals
from an earlier specimen into this document.
