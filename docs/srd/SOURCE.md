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
| `source/armor-table.txt` | Armor table: 13 armours plus Shield, with AC formula, Strength requirement and stealth penalty | 91 |
| `source/species-descriptions.txt` | All nine species — creature type, size, speed and traits | 83-86 |
| `source/weapon-attack-cantrips.txt` | True Strike and Shillelagh, the two cantrips that rewrite a weapon attack (D14) | 157, 163 |
| `source/attack-class-features.txt` | Martial Arts (all three benefits, die progression) and every Extra Attack grant, plus the multiclass rule (D15) | 24, 27, 47, 49, 55, 57 |

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

## Attribution

`ATTRIBUTION.md` in this directory governs. Every file in `source/` carries the
required notice verbatim at the top of the file, because that notice must
travel with the content and a directory-level licence file does not survive a
copied file.

Do not add attribution to Wizards of the Coast beyond that notice — the licence
asks that no other attribution appear, and that constraint is easy to violate
by being helpful.
