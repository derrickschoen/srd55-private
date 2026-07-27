# Track brief: multiclass entry grants (queue item (a))

## The twelve clauses, tabulated BY ME from the committed extract

Source: `docs/srd/source/multiclass-entry-grants.txt` (checksummed in
`docs/srd/SOURCE.md`). Every cell below was read off that file, not recalled.
**Re-derive it yourself before seeding; do not trust this table.** It exists so a
disagreement between you and it is a signal worth stopping on.

| Class | Hit die | Weapons | Armour training | Skill choice | Tool |
|---|---|---|---|---|---|
| Barbarian | yes | Martial | Shields | — | — |
| Bard | yes | — | Light | 1, **any** skill | 1 Musical Instrument |
| Cleric | yes | — | Light, Medium, Shields | — | — |
| Druid | yes | — | Light, Shields | — | — |
| Fighter | yes | Martial | Light, Medium, Shields | — | — |
| Monk | yes | — | — | — | — |
| Paladin | yes | Martial | Light, Medium, Shields | — | — |
| Ranger | yes | Martial | Light, Medium, Shields | 1, Ranger's list | — |
| Rogue | yes | — | Light | 1, Rogue's list | Thieves' Tools |
| Sorcerer | yes | — | — | — | — |
| Warlock | yes | — | Light | — | — |
| Wizard | yes | — | — | — | — |

Facts worth noticing, because each one contradicts a plausible guess:

- **NO class grants a saving throw on entry.** Verified by grepping the extract
  for "saving"/"throw": the only hit is my own commentary header. Saving throws
  belong to the class you STARTED in, always.
- **No class grants Simple weapons on entry.** Four grant Martial and nothing
  else. A reader who assumed "Martial implies Simple" would over-grant four
  classes.
- **Barbarian gets Shields but NOT Light armour** on entry, though its initial
  traits include Light and Medium. The subset is not "drop the top tier".
- **Monk, Sorcerer and Wizard grant the hit die and nothing else.**

## The modelling decision, and why

Two shapes were considered.

**Armour and weapons: a per-row flag on the EXISTING set tables.** In both
cases the entry grant is a proper SUBSET of the initial grant — Fighter's armour
goes Light/Medium/Heavy/Shields to Light/Medium/Shields; Barbarian's weapons go
Simple+Martial to Martial. A subset is exactly what a boolean per row expresses,
the unique indexes already prevent duplicates, and a parallel table would
duplicate every qualifier (including the Monk's and Rogue's `property_qualifier`
free text) with nothing keeping the two copies in step.

**Skills: NOT a flag, because the Bard breaks the subset property.** The Bard's
entry grant is "one skill of your choice" — unbounded, drawn from all 18, which
is not a subset of the Bard's own `class_skill_options` rows. A flag over those
rows cannot express it. So skills need scalars beside `skill_choice_count` on
the 1:1 `class_sheet_traits` row: a count (0 or 1) and a pool discriminator
(`none` | `class_list` | `any`). The discriminator is what makes Bard and Ranger
different rows rather than the same row with a lie in it.

**Rejected: one `class_multiclass_entry_grants` table holding everything.** It
reads tidier and it is wrong for the same reason `class_sheet_traits` was split
from `class_definitions` — the qualifier text would live in two places, and
nothing would force the entry subset to actually BE a subset of the initial set.
With a flag on the shared row, that invariant is structural.

## What must NOT be modelled

Tool proficiencies. Bard's Musical Instrument and Rogue's Thieves' Tools are the
only two, this app has no tool vocabulary, and D26 is explicit that a value
earns structure only if it changes a number on the sheet. Neither does. Say so
in a comment where the seed drops them, so the omission is visibly deliberate.

## The rule the sheet must then apply

`docs/srd/source/multiclassing.txt` and D28: a character is proficient if ANY of
its classes grants it — the union, not the intersection. The class the character
STARTED in contributes its full Core Traits row; every later class contributes
only its entry subset. Which class is first is therefore load-bearing data.

**It is already recorded, AND the hard part is already solved.**
`character_class_levels.is_starting_class` exists (`db/schema/character.ts`,
`NOT NULL DEFAULT 0`), and `startingClass()` in `src/rules/sheet.ts:213` already
resolves it — including the three reachable defects its own comment enumerates
(no uniqueness constraint; `update-class.ts` can delete the flagged row without
promoting a replacement; share import can write several). It degrades
deterministically and emits `no_starting_class` / `several_starting_classes`
warnings rather than throwing.

**Reuse it. Do not write a second resolver.** Two independent answers to "which
class did this character start as" that disagree is worse than either. If the
proficiency union needs something `startingClass()` does not return, widen it in
place. Note that when it degrades it still picks a class, so the proficiency
union stays a union — the warning is the record that the pick was arbitrary.
