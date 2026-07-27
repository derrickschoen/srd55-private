# Q12 — A character's own notes do not travel across a share link. Should they?

**Status: OPEN, and deliberately not decided overnight.** This changes what a
shared character IS, which is one of the things the autonomy grant stops for.

Found while building the column-portability guard (D30), which forced every one
of the 209 columns in the share scope to be classified as carried or not, with a
reason. `characters.notes` was the one classification that could not be written
without noticing an inconsistency.

## The inconsistency

The share format drops private notes — and it does so consistently, EXCEPT here.
Every other dropped note is **working state**:

| Column | Travels? | What it is |
|---|---|---|
| `character_spell_preferences.notes` | no | working state |
| `character_rule_overrides.notes` | no | working state |
| `warning_acknowledgements.note` | no | working state |
| `spell_loadouts.notes` | no | working state |
| `character_class_levels.notes` | no | working state |
| `character_weapons.notes` | **yes** | the build |
| `character_species` / `character_background` notes | **yes** | the build |
| `character_armor.notes` | **yes** | the build |
| `character_effects.notes` | **yes** | the build |
| **`characters.notes`** | **no** | ...the build? |

Notes attached to a piece of the BUILD all travel. Notes attached to working
state all stay. A character's own notes are the only column that sits on the
build side of that line and behaves like the other side.

## Why it was not just fixed

`ShareCharacter` has no notes field, so carrying it is a wire-format change, not
a bug fix. And the argument runs both ways:

- **Carry it**: it is part of the build in every sense the other note columns
  are. Someone sharing a character and losing their own description of it is a
  data loss the recipient cannot even see happened.
- **Do not carry it**: a character's notes are the most likely place for
  genuinely private text — table politics, an unfinished idea, something about
  another player. Every OTHER note that travels is attached to a mechanical
  thing (this weapon, this armour), where private content is far less likely.
  That asymmetry may be exactly why it was excluded, deliberately, by whoever
  wrote the format.

Nothing in `.claude/decisions.md` records the original reason, so it is not
possible to tell which of those it was.

## What is needed from the owner

Which one? If "carry it", it is a small change: a field on `ShareCharacter`, the
validator, the INSERT, and reclassifying one entry in the portability map — the
guard will fail until that last step is done, which is the guard working.

If "do not carry it", the answer should be written into the classification's
`why` so the next person does not re-open this. The current text says it is a
judgement call and names the inconsistency, which is honest but not a decision.

A third option worth naming: carry it only when the sharer opts in, the way
`acknowledgements` and `loadouts` already are. That machinery exists.
