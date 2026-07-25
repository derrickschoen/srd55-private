# Minimal character-share example

This is an intentionally readable specimen of the proposed character-share
document. It contains catalog identifiers and spell names only; it contains no
spell rules text.

```json
{
  "format": "dnd-multiclass-spells-character-share",
  "version": 1,
  "character": {
    "name": "Mira Ashdown",
    "strength": 8,
    "dexterity": 14,
    "constitution": 14,
    "intelligence": 16,
    "wisdom": 18,
    "charisma": 10,
    "proficiency_bonus_override": null,
    "rules_edition_preference": "2024",
    "allow_legacy": false,
    "notes": "Cleric 7 / Wizard 5; protective support and utility."
  },
  "classes": [
    {
      "handle": "c",
      "classKey": "2024:cleric",
      "subclassKey": "2024:life-domain",
      "level": 7,
      "start": 1,
      "ability": "wisdom",
      "config": {},
      "note": null
    },
    {
      "handle": "w",
      "classKey": "2024:wizard",
      "subclassKey": "2024:abjurer",
      "level": 5,
      "start": 8,
      "ability": "intelligence",
      "config": {},
      "note": "Took Wizard after seventh Cleric level."
    }
  ],
  "sources": [
    {
      "handle": "mi",
      "type": "feat",
      "key": "2024:magic-initiate-wizard",
      "config": {
        "ability": "intelligence"
      },
      "acquired": "origin",
      "note": null
    }
  ],
  "selections": [
    {
      "handle": "c",
      "ruleKey": "2024:cleric-cantrips",
      "ordinal": 1,
      "spellKey": "2024:guidance",
      "keep": false,
      "note": null
    },
    {
      "handle": "c",
      "ruleKey": "2024:cleric-prepared-spells",
      "ordinal": 1,
      "spellKey": "2024:bless",
      "keep": true,
      "note": "Keep prepared in every loadout."
    },
    {
      "handle": "c",
      "ruleKey": "2024:cleric-prepared-spells",
      "ordinal": 2,
      "spellKey": "2024:cure-wounds",
      "keep": false,
      "note": null
    },
    {
      "handle": "w",
      "ruleKey": "2024:wizard-prepared-spells",
      "ordinal": 1,
      "spellKey": "2024:shield",
      "keep": true,
      "note": null
    },
    {
      "handle": "w",
      "ruleKey": "2024:wizard-prepared-spells",
      "ordinal": 2,
      "spellKey": "2024:misty-step",
      "keep": false,
      "note": null
    },
    {
      "handle": "mi",
      "ruleKey": "2024:magic-initiate-wizard-cantrips-known",
      "ordinal": 1,
      "spellKey": "2024:mage-hand",
      "keep": false,
      "note": null
    },
    {
      "handle": "mi",
      "ruleKey": "2024:magic-initiate-wizard-level-1-known",
      "ordinal": 1,
      "spellKey": "2024:aria:starward-aegis",
      "spellName": "Starward Aegis",
      "keep": false,
      "note": "Unknown homebrew spell retained as a placeholder."
    }
  ],
  "spellbook": [
    "2024:detect-magic",
    "2024:find-familiar",
    "2024:magic-missile",
    "2024:shield",
    "2024:misty-step",
    "2024:counterspell"
  ],
  "preferences": [
    {
      "spellKey": "2024:bless",
      "favourite": true,
      "note": null
    },
    {
      "spellKey": "2024:counterspell",
      "favourite": true,
      "note": "Signature reaction."
    }
  ],
  "overrides": [
    {
      "ruleKey": "2024:cleric-prepared-spells",
      "value": 9,
      "note": "Table ruling grants one additional prepared spell."
    }
  ],
  "acknowledgements": [
    {
      "warning": "unknown-spell-placeholder",
      "note": "Starward Aegis is supplied by the sharing player."
    }
  ],
  "loadouts": [
    {
      "name": "Exploration",
      "notes": "General travel, investigation, and hazard coverage.",
      "entries": [
        {
          "spellKey": "2024:guidance",
          "role": "utility"
        },
        {
          "spellKey": "2024:detect-magic",
          "role": "ritual"
        },
        {
          "spellKey": "2024:find-familiar",
          "role": "scouting"
        }
      ]
    },
    {
      "name": "Hard Fight",
      "notes": null,
      "entries": [
        {
          "spellKey": "2024:bless",
          "role": "support"
        },
        {
          "spellKey": "2024:shield",
          "role": "defense"
        },
        {
          "spellKey": "2024:counterspell",
          "role": "control"
        },
        {
          "spellKey": "2024:aria:starward-aegis",
          "role": "defense"
        }
      ]
    }
  ]
}
```

## Per-field keep/trim review

“Required” below means required to reconstruct this example faithfully, not
necessarily that every document must contain a populated optional collection.

| Field | Decision | Reason or cost |
|---|---|---|
| `format` | KEEP — REQUIRED | Discriminates this document from full backups and other JSON. |
| `version` | KEEP — REQUIRED | Selects the parser and future migration path; it cannot be inferred safely. |
| `character` | KEEP — REQUIRED | Owns the base character state. |
| `character.name` | KEEP — REQUIRED | User-authored identity is not derivable. |
| `character.strength` | KEEP — REQUIRED | The score is user state, not safely derivable from class. |
| `character.dexterity` | KEEP — REQUIRED | The score is user state, not safely derivable from class. |
| `character.constitution` | KEEP — REQUIRED | The score is user state, not safely derivable from class. |
| `character.intelligence` | KEEP — REQUIRED | The score is user state, not safely derivable from class. |
| `character.wisdom` | KEEP — REQUIRED | The score is user state, not safely derivable from class. |
| `character.charisma` | KEEP — REQUIRED | The score is user state, not safely derivable from class. |
| `character.proficiency_bonus_override` | TRIM-CANDIDATE | Omit `null`; absence must mean “calculate normally.” |
| `character.rules_edition_preference` | KEEP — REQUIRED | Controls edition resolution and cannot be inferred when mixed or legacy content exists. |
| `character.allow_legacy` | TRIM-CANDIDATE | Omit `false`; the importer must default it to false. |
| `character.notes` | TRIM-CANDIDATE | Dropping it loses user-authored character notes only. |
| `classes` | KEEP — REQUIRED | Multiclass membership and progression are core, non-derivable state. |
| `classes[].handle` | KEEP — REQUIRED | Compact relational anchor used by selections. |
| `classes[].classKey` | KEEP — REQUIRED | Portable catalog identity replacing a database ID. |
| `classes[].subclassKey` | KEEP — REQUIRED | Subclass choice is not derivable from class or level. |
| `classes[].level` | KEEP — REQUIRED | Per-class level cannot be recovered from total level. |
| `classes[].start` | KEEP — REQUIRED | Preserves multiclass acquisition order. |
| `classes[].ability` | TRIM-CANDIDATE | Usually derivable from the class; dropping it loses unusual ability overrides. |
| `classes[].config` | TRIM-CANDIDATE | Omit `{}`; non-empty configuration must remain because it contains choices. |
| `classes[].note` | TRIM-CANDIDATE | Dropping it loses only user commentary. |
| `sources` | KEEP — REQUIRED | Feats and other non-class grants are not derivable from class state. |
| `sources[].handle` | KEEP — REQUIRED | Compact relational anchor used by its selections. |
| `sources[].type` | KEEP — REQUIRED | Selects the correct definition namespace. |
| `sources[].key` | KEEP — REQUIRED | Portable content identity replacing a database ID. |
| `sources[].config` | KEEP — REQUIRED when non-empty | Preserves source choices; omit only an empty object. |
| `sources[].acquired` | KEEP — REQUIRED | Origin versus later acquisition can affect validation and cannot be inferred. |
| `sources[].note` | TRIM-CANDIDATE | Dropping it loses only user commentary. |
| `selections` | KEEP — REQUIRED | Prepared and known choices are user state. |
| `selections[].handle` | KEEP — REQUIRED | Associates a choice with its class or source. |
| `selections[].ruleKey` | KEEP — REQUIRED | Identifies the granting rule and makes slot reconstruction deterministic. |
| `selections[].ordinal` | KEEP — REQUIRED | Distinguishes repeated slots governed by one rule. |
| `selections[].spellKey` | KEEP — REQUIRED | Portable edition-specific spell identity. |
| `selections[].spellName` | KEEP — REQUIRED for placeholders | An unknown key cannot render without its fallback name; omit for catalog-resolved spells. |
| `selections[].keep` | TRIM-CANDIDATE | Omit `false`; `true` must remain to preserve explicit keep overrides. |
| `selections[].note` | TRIM-CANDIDATE | Dropping it loses only user commentary. |
| `spellbook` and `spellbook[]` | KEEP — REQUIRED | A Wizard’s learned spell set is user state and each key is non-derivable. |
| `preferences` | KEEP — REQUIRED when non-empty | User preferences are not implied by selections; omit the collection when empty. |
| `preferences[].spellKey` | KEEP — REQUIRED | Identifies the preferred spell. |
| `preferences[].favourite` | KEEP — REQUIRED | Carries the preference itself; alternatively, array membership could imply `true`. |
| `preferences[].note` | TRIM-CANDIDATE | Dropping it loses only preference commentary. |
| `overrides` | KEEP — REQUIRED when non-empty | Table rulings cannot be regenerated from catalog rules. |
| `overrides[].ruleKey` | KEEP — REQUIRED | Identifies the overridden rule. |
| `overrides[].value` | KEEP — REQUIRED | Carries the non-default ruling. |
| `overrides[].note` | TRIM-CANDIDATE | Dropping it loses the explanation but not the effective value. |
| `acknowledgements` | TRIM-CANDIDATE | Make opt-in; dropping it causes warnings to be shown again. |
| `acknowledgements[].warning` | KEEP — REQUIRED if included | Identifies the warning the user accepted. |
| `acknowledgements[].note` | TRIM-CANDIDATE | Dropping it loses only the acceptance context. |
| `loadouts` | TRIM-CANDIDATE | Make opt-in; dropping it loses saved groupings, not the underlying spell choices. |
| `loadouts[].name` | KEEP — REQUIRED if included | User-visible loadout identity is not derivable. |
| `loadouts[].notes` | TRIM-CANDIDATE | Dropping it loses only loadout commentary. |
| `loadouts[].entries` | KEEP — REQUIRED if included | Defines loadout membership. |
| `loadouts[].entries[].spellKey` | KEEP — REQUIRED | Identifies the member spell. |
| `loadouts[].entries[].role` | TRIM-CANDIDATE | Dropping it loses user organization but not membership. |

## Byte accounting

Measurements include the JSON file's trailing newline. Gzip uses level 9 with
the filename and timestamp suppressed; base64url omits padding.

| Document | Raw JSON | Gzip | Base64url |
|---|---:|---:|---:|
| Minimal example | 4,125 B | about 1,085 B | about 1,447 chars |
| Full backup reference | 7,159 B | 1,683 B | 2,244 chars |
| Reduction | 3,034 B (42.4%) | about 598 B (35.5%) | about 797 chars (35.5%) |

## Ranked additional trimming opportunities

Estimates are measured or rounded against this pretty-printed specimen.
Compressed savings are approximate because compressor implementations and
combinations of changes vary.

1. **Minify transport JSON:** save about **1,310 raw B / 80 gzip B**. Keep this
   file pretty for review, but serialize compactly for links. Tradeoff: links
   are no longer human-readable without tooling.
2. **Make loadouts opt-in:** save about **863 raw B / 160 gzip B** here.
   Tradeoff: recipients retain spells but lose named play-mode groupings.
3. **Drop all notes:** save about **665 raw B / 225 gzip B**. Tradeoff: loses
   explanations and user intent, including why an override or placeholder
   exists.
4. **Tokenize repeated field names:** one-character wire keys save about
   **477 raw B / 60 gzip B**. Tradeoff: requires a wire-key dictionary or
   version-specific codec and makes raw documents opaque.
5. **Omit empty/default/null fields:** save about **393 raw B / 60 gzip B**.
   Tradeoff: every omitted field needs a stable, versioned default; careless
   defaults can change meaning during migration.
6. **Dictionary-tokenize repeated content and rule keys:** estimated
   **200–350 raw B / 20–60 gzip B** for a character this size. Tradeoff:
   index tables add parser complexity, and small documents may grow when the
   dictionary overhead exceeds repetition.
7. **Hoist the shared `2024:` edition prefix:** save about **154 raw B but only
   0–10 gzip B**. Tradeoff: mixed-edition and homebrew keys need an escape or
   per-entry edition, complicating validation for little compressed benefit.
8. **Make acknowledgements opt-in:** save about **127 raw B / 40 gzip B** here.
   Tradeoff: already-reviewed warnings reappear after import.
9. **Shorten handles and identifier slugs:** handles in this example are
   already one character; aggressively aliasing longer catalog/rule keys could
   save another **50–150 raw B / under 30 gzip B**. Tradeoff: aliases need a
   collision-safe lookup table and make diagnostics less intelligible.
10. **Let preference membership imply `favourite: true`:** estimated
    **40–70 raw B / 10–20 gzip B** here. Tradeoff: blocks future preference
    states unless the schema later changes shape.
