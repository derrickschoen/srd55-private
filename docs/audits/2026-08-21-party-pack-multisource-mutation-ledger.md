# Party-pack v2 multisource spellcasting mutation ledger

Each control ran against its named test under `tests/unit/vtt`, then the source mutation was restored. Expectations were unchanged.

| Control | Mutation | Killing test | Mutated result | Restored result |
|---|---|---|---|---|
| `wrong_source_dc` | Resolved every spell with the member's first source instead of the source that references the spell | `wrong_source_dc uses each prepared spell source and per_source_slots share one member pool` | exit 1; 1 failed, 20 skipped | exit 0; covered by the 1,553-test restored gate |
| `per_source_slots` | Multiplied the member slot capacity by its spellcasting-source count, simulating one pool per source | `wrong_source_dc uses each prepared spell source and per_source_slots share one member pool` | exit 1; 1 failed, 20 skipped | exit 0; covered by the 1,553-test restored gate |
| `object_form_rejected` | Disabled legacy object-form detection so an unchanged object was parsed as a source-array member | `object_form_rejected accepts legacy object bytes and normalizes them to one source` | exit 1; 1 failed, 20 skipped | exit 0; covered by the 1,553-test restored gate |
