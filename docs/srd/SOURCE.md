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
sha256sum docs/srd/source/*.txt # each must match the per-extract table below
```

Column slicing must be done by CHARACTER, not byte. The SRD uses curly quotes,
and a byte-wise `cut -c` splits one, producing a file that is not valid UTF-8.
It must also stop at the real column boundary, or a value is truncated mid-word
and becomes fabricated data downstream. Both mistakes were made and caught here.

`pdftotext` is poppler-utils. `-layout` matters: without it the PDF's two-column
pages interleave and the weapon table becomes unreadable.

| Extract | Source | Page | SHA-256 |
|---|---|---|---|
| `source/weapons-table.txt` | Weapons table, all four categories | 90 | `d78ee14dbd9bb78701a9f3cee8e871c11fe3e88e646fd5e6604c6cb30d7c8497` |
| `source/weapon-mastery-progression.txt` | Barbarian and Fighter class tables (the count is a COLUMN) | 27, 47 | `39274ea85dbcb94ef663cf5923c53e90db4f2d51a0fa29c759128e448cce0811` |
| `source/weapon-mastery-flat-classes.txt` | Paladin, Ranger, Rogue feature text (the count is PROSE) | 55, 57, 60 | `616493484b5b0d3b6b0ff11072ad156141fca4e90a2364f37159745715b07591` |
| `source/class-core-traits.txt` | Core Traits table for all twelve classes — hit die, saving throws, skill/weapon proficiencies, armour training | 26-72 | `64dcc7e5e6fe26e6bb063e8f74a916d140e1cd944c192da4ace1c306ada32bbf` |
| `source/armor-table.txt` | Armor table: **12 armours plus Shield — 13 rows**, with AC formula, Strength requirement and stealth penalty | 91 | `c8bd735199d7649f19877f6e746ce2fca40496340c48a0733eb9f0371bfaa884` |
| `source/species-descriptions.txt` | All nine species — creature type, size, speed and traits | 84-86 | `37e05427bbe352a485d0c336cf49bc79886f186203e0497bfdaa978255e6ab3b` |
| `source/backgrounds.txt` | All four backgrounds — the five parts each, plus the prose describing them | 83 | `9272cca5b81852bf43ddc013e5581cc3736e8c559c26a702774843e7d0fd3f8d` |
| `source/weapon-attack-cantrips.txt` | True Strike and Shillelagh, the two cantrips that rewrite a weapon attack (D14) | 157, 163 | `067d1f684daba78391fadb639166dcbba2164683360786059fd65e313b01c50a` |
| `source/attack-class-features.txt` | Martial Arts (all three benefits, die progression) and every Extra Attack grant, plus the multiclass rule (D15) | 24, 27, 47, 49, 55, 57 | `4d9404fe30d3e49b41168f14b9da7a70803fcaa93aa0b93bc8fd805dcae0c96b` |
| `source/extra-attack-other-sources.txt` | Thirsting Blade and Devouring Blade — Extra Attack granted by an INVOCATION, and scoped to one weapon (D19) | 68, 69, 24 | `53073d181f004ed2bfdf94d7d54278bdaa00ced8e0f46723732278cd3e59c2cb` |
| `source/skills-table.txt` | The Skills table (all 18 skills and the ability each uses), the Proficiency Bonus table, and the rules that apply the bonus to a skill or a save | 10, 12, 13 | `f950b9e22f6cc2162d0a04db5b019151de0c0714f52f021accc6ebaee5b1fd5f` |
| `source/sheet-math.txt` | Passive Perception, Level 1 Hit Points by Class, Fixed Hit Points by Class, Initiative, unarmoured Armor Class | 21-23 | `69ea40b3f3ac7bd7df28868bc0d142ba4fe29163305377bba235f3f691f2ff1e` |
| `source/multiclassing.txt` | Multiclassing: Hit Points and Hit Dice, Proficiency Bonus, proficiencies, Armor Class and Extra Attack | 24-25 | `4a6cef7329a5338f16e23fc4404d650e5d157ee7a45d99773b9ba7780909d99b` |
| `source/multiclass-entry-grants.txt` | The "As a Multiclass Character" clause of all twelve classes — the SUBSET a second class grants (D28) | 27-72 | `3ad04904410c40e03c07dceef379414d2c1bfc0ff2e2f1d64c50448256d9b6ec` |
| `source/domain-vocabularies.txt` | Schools of Magic, conditions, creature types, damage types and size categories | 104, 179-180, 188 | `ef5e8cced8f6dc1dad92d2903cbbcad144cb2d742bebfe595e6290bf4cc32901` |
| `source/bard-spell-list.txt` | Complete Bard Spell List | 33-35 | `c0b9c78a5f56a1feffdb58bf42bcac2e475e09e9eae7ec623b617854bdbd4228` |
| `source/cleric-spell-list.txt` | Complete Cleric Spell List | 38-40 | `9a891b62d3fee06ce0a759437da2385233373afef9ed367e9e65e301a962214c` |
| `source/druid-spell-list.txt` | Complete Druid Spell List | 44-45 | `b9577c1fb57e334f00e4cdd8663b596edd31f4a1e468b834e596f5ebda3d24a1` |
| `source/paladin-spell-list.txt` | Complete Paladin Spell List | 55-56 | `444894bc59347f5a5fe931d12340d478662c45592adcd08d713470e269c18ee4` |
| `source/ranger-spell-list.txt` | Complete Ranger Spell List | 60 | `4331180fbbce595e0c72e7647a0ba3c114671c14c6ccd421420d56584bbb2b16` |
| `source/sorcerer-spell-list.txt` | Complete Sorcerer Spell List | 67-69 | `7942750ff98fd1a230cd44a42cf79064caa40f63eabfcd68c546b9666dbd7fa6` |
| `source/warlock-spell-list.txt` | Complete Warlock Spell List | 74-76 | `0845b2b01463abc15c56b6c6f3b0eb2f234920e4ad5e93ce672ad5110839c7cb` |
| `source/wizard-spell-list.txt` | Complete Wizard Spell List | 79-82 | `c1e51d5f924cdb5ff0b36f73ccce3870b9b3f11b974ef827daabace8ba23a583` |
| `source/spell-descriptions.txt` | Complete Spell Descriptions section, enumerating 339 unique spell headings | 107-175 | `93e7a5c245b073586872c0736deb24a5463f94c55033871bd71e6d76cf0bd4fa` |

### Why there is a checksum PER EXTRACT, and not only for the PDF

Because the PDF's checksum did not catch the thing that broke.

`source/species-descriptions.txt` was committed **truncated**. It began thirteen
lines late — at the `Species Descriptions` heading rather than at the top of
printed page 84 — and those thirteen lines carry the right-hand column's
continuation of Dragonborn. Two whole traits were absent, `Darkvision` and
`Draconic Flight`, so the file said Dragonborn has three traits where the source
prints five. The file's own header claimed it existed to stop exactly that kind
of undercount.

The PDF checksum above matched throughout, and always would have: it says the
bytes we sliced FROM are right, and says nothing about the range someone sliced
OUT of them. A checksum per derived file is the only one that could have caught
it, so there is now one per file and
`tests/unit/rules/srd-extract-provenance.test.ts` fails if any of them drifts.

The table and the directory must MATCH, in both directions. A file with no row
has no provenance, and a row with no file is a claim about bytes that are not
there; the same test asserts set equality. Adding an extract therefore means
adding its row, which is the whole burden.

### `background-descriptions.txt` is superseded by `backgrounds.txt`

Two extracts of the same four backgrounds existed briefly, and this is the
record of which one survives so a merge does not quietly keep both.

`source/background-descriptions.txt` was page 82 sliced at column 59.
`source/backgrounds.txt` is the whole of printed page 83. **Both agree on all
four backgrounds**, so nothing derived from either was wrong — but the sliced
file carries a slicing artifact the full-page one does not:

```
r-     Tool Proficiency: Calligrapher’s Supplies
```

That leading `r-` is the LEFT column's hyphenated `Calligrapher-` bleeding
across the gutter into the right column's value. It is the exact failure the
"slice by character, at the real column boundary" warning was written about,
surviving in a committed file.

So the full-page extract is kept and the sliced one is deleted. If a merge
reintroduces `background-descriptions.txt`, `srd-extract-provenance.test.ts`
fails by name until it is removed again — that is what the directory
enumeration above is for.

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
