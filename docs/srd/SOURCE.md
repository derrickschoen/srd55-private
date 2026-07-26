# Where the bundled SRD material came from

Reference material in `docs/srd/source/` is extracted verbatim from the
official SRD 5.2.1 PDF. This file records the provenance so any value in this
repository can be traced back to a document, rather than to somebody's memory
of the rules.

## The source document

| | |
|---|---|
| Document | System Reference Document 5.2.1 (English) |
| URL | https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf |
| Retrieved | 2026-07-26 |
| Size | 6,031,375 bytes |
| SHA-256 | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` |
| Licence | Creative Commons Attribution 4.0 International (CC-BY-4.0) |

The PDF itself is **not** committed. It is 6 MB of material we do not modify,
and a checksum lets anyone confirm they are holding the same bytes we read
without carrying them in every clone.

## How to re-derive the extracts

```sh
curl -sSLO https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
sha256sum SRD_CC_v5.2.1.pdf     # must match the table above
pdftotext -layout SRD_CC_v5.2.1.pdf srd.txt
```

`pdftotext` is poppler-utils. `-layout` matters: without it the PDF's two-column
pages interleave and the weapon table becomes unreadable.

| Extract | Source | Page |
|---|---|---|
| `source/weapons-table.txt` | Weapons table, all four categories | 90 |
| `source/weapon-mastery-progression.txt` | Barbarian and Fighter class tables (the count is a COLUMN) | 27, 47 |
| `source/weapon-mastery-flat-classes.txt` | Paladin, Ranger, Rogue feature text (the count is PROSE) | 55, 57, 60 |
| `source/class-core-traits.txt` | Core Traits table for all twelve classes — hit die, saving throws, skill/weapon proficiencies, armour training | 26-72 |
| `source/armor-table.txt` | Armor table: **12 armours plus Shield — 13 rows**, with AC formula, Strength requirement and stealth penalty | 91 |
| `source/species-descriptions.txt` | All nine species — creature type, size, speed and traits | 83-86 |
| `source/weapon-attack-cantrips.txt` | True Strike and Shillelagh, the two cantrips that rewrite a weapon attack (D14) | 157, 163 |
| `source/attack-class-features.txt` | Martial Arts (all three benefits, die progression) and every Extra Attack grant, plus the multiclass rule (D15) | 24, 27, 47, 49, 55, 57 |
| `source/skills-table.txt` | The Skills table (all 18 skills and the ability each uses), the Proficiency Bonus table, and the rules that apply the bonus to a skill or a save | 10, 12, 13 |
| `source/sheet-math.txt` | Passive Perception, Level 1 Hit Points by Class, Fixed Hit Points by Class, Initiative, unarmoured Armor Class | 21-23 |
| `source/multiclassing.txt` | Multiclassing: Hit Points and Hit Dice, Proficiency Bonus, proficiencies, Armor Class and Extra Attack | 24-25 |

## What these extracts settle

**D1b parked an open question** — whether a character's weapon-mastery count is
derivable from the class data this app already stores, or needs new content. It
needs new content, and the content has an unusual shape:

- **Barbarian and Fighter** carry a Weapon Mastery *column* in their class
  tables, so the count rises with level (Fighter 3 at levels 1-3, 4 at 4-9,
  5 at 10-15, 6 at 16-20).
- **Paladin, Ranger and Rogue** have no such column. Their count is a flat two,
  stated in the level-1 feature text rather than in a table.

So it is neither a constant nor a single progression column — it is per class,
and only two of the five classes scale it. Anything modelling this must handle
both shapes. Nothing in the app's current `class_progressions` carries it,
because that table models spellcasting only (see F4).

Weapon mastery is a 2024-rules concept: every weapon has exactly one mastery
property, and a character unlocks it only through a feature such as Weapon
Mastery. The property is attached to the weapon; the *permission* is attached
to the character.

## The three extracts added for the sheet core, and why

`skills-table.txt`, `sheet-math.txt` and `multiclassing.txt` were added because
a review of what the sheet needs found that **six of its numbers had no source
in this directory at all**: the skill-to-ability mapping, the level-1 and
per-level Hit Point arithmetic, unarmoured Armor Class, Initiative, Passive
Perception, and the multiclass rules for Proficiency Bonus and proficiencies.

Every one of those was recallable from memory and none of it was written down,
which is the exact failure F6 exists to prevent. Writing the code first and the
provenance later would have produced values that look right and cannot be
checked. The extraction cost an hour and removed the whole fabrication surface.

Two measured facts worth recording, because both contradict something that was
previously believed here:

- **The Skills table has 18 rows and `Performance` is one of them.** The twelve
  class Core Traits tables between them name only 17 skills — `Performance`
  appears in no class's list. A skills vocabulary "closed on evidence" the way
  `weaponMasteryProperties` is would have been 17 skills and silently wrong.
  The Skills table is the source that closes it, not the class lists.
- **The Extra Attack extract could not be attributed to classes as first
  written.** Its seven rows carried no class names, so deciding which class each
  belonged to would have come from memory. The section has been re-extracted
  with each class's Features table title and column headers above its own rows.

## Attribution

`ATTRIBUTION.md` in this directory governs. Every file in `source/` carries the
required notice verbatim at the top of the file, because that notice must
travel with the content and a directory-level licence file does not survive a
copied file.

Do not add attribution to Wizards of the Coast beyond that notice — the licence
asks that no other attribution appear, and that constraint is easy to violate
by being helpful.
