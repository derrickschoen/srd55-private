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
| `source/weapons-table.txt` | Weapons table, all four categories | 90 | `bec5ac33b7ecfea781ac594f5724778d73de3c5baa057dbb934419cd7a44630f` |
| `source/weapon-mastery-progression.txt` | Barbarian and Fighter class tables (the count is a COLUMN) | 27, 47 | `abffb6f60ee785df7e951772ad068d0993e3aa0c84046beaad5e9249c9694aff` |
| `source/weapon-mastery-flat-classes.txt` | Paladin, Ranger, Rogue feature text (the count is PROSE) | 55, 57, 60 | `143b8da92571cdf11d5ff8c884b6bbe0703a1b7b1a5c1c3757fff1f0a06e6631` |
| `source/class-core-traits.txt` | Core Traits table for all twelve classes — hit die, saving throws, skill/weapon proficiencies, armour training | 26-72 | `56e5145be00c43c11602067b0dcea9aa8f3669c3cd4b5e6087a57978672e89be` |
| `source/class-starting-equipment.txt` | Starting Equipment row for all twelve classes, with PDF line wrapping and discretionary hyphenation removed | 28, 31, 36, 41, 47, 49, 53, 57, 61, 64, 70, 77 | `e4011ad3662cd63aea29df7998eb9bf078c1aaccb8ada199b3801c406fa039fe` |
| `source/class-level-tables.txt` | Complete level 1–20 Features table for all twelve classes, including spell-slot columns where printed | 28, 31, 36, 41, 47, 50, 53, 58, 62, 65, 71, 77 | `a42925cfeff1df54e909947389daf7ae641377a57b456fa7c4bfd9b503a4ea0c` |
| `source/class-expertise.txt` | Every class feature that grants Expertise — Bard, Ranger, Rogue and Wizard Scholar | 31, 59, 61, 77 | `42b990b7a8b5dd606922ce12d98ffbd1198360f3b347ad8eb277a5b57b6083e1` |
| `source/class-spell-replacement.txt` | Spell-replacement permissions and timing for all eight spellcasting classes | 31, 35-36, 41, 55, 59, 64-65, 70-71, 76-77 | `f108ba0c2bf5aa5f806a0fabf84bc79e2751448a90ea554b0cce3cd2426e7f22` |
| `source/armor-table.txt` | Armor table: **12 armours plus Shield — 13 rows**, with AC formula, Strength requirement and stealth penalty | 91 | `a5cf0886a0339b8955d9bb990a43e282800780e963658c4f20ea590c9a62fdd0` |
| `source/species-descriptions.txt` | All nine species — creature type, size, speed and traits | 84-86 | `d59101de6375cabe17c320303b8f365cd7ea2a2e589ebf568324c750c0655da9` |
| `source/backgrounds.txt` | All four backgrounds — the five parts each, plus the prose describing them | 83 | `6993612280d0d255d5b702945f4da9448fbd3966ef5b47b8e196e0e0cc837a06` |
| `source/feats.txt` | Complete Feat Descriptions section — introductory rules and all 17 feats, with PDF line wrapping and discretionary hyphenation removed | 87-88 | `96af9e58dffa92f66d6cca8311ebcbc56ec599c137efb32823da7f0a4e32747a` |
| `source/subclasses.txt` | All twelve subclass names and levelled feature headings, plus the Life Domain, Circle of the Land, Oath of Devotion, Draconic Sorcery and Fiend Patron spell tables; feature prose omitted under D152 | 30, 35, 40, 46, 49, 52, 56-57, 61, 64, 69-70, 76, 82 | `2745c4437a6a314da408f057aa5ed2f092ea6961324841a70cac8799cf747816` |
| `source/weapon-attack-cantrips.txt` | True Strike and Shillelagh, the two cantrips that rewrite a weapon attack (D14) | 157, 163 | `372b4358275937d204601ca0ae645db90a7aa32ce76821863e8a5e25f3341880` |
| `source/attack-class-features.txt` | Martial Arts (all three benefits, die progression) and every Extra Attack grant, plus the multiclass rule (D15) | 24, 27, 47, 49, 55, 57 | `ee6b151bead045d30518c9698f991d49fd9790420a8eb62c5b8068b107bd5d59` |
| `source/extra-attack-other-sources.txt` | Thirsting Blade and Devouring Blade — Extra Attack granted by an INVOCATION, and scoped to one weapon (D19) | 68, 69, 24 | `828a1c9829b77622b734326d79b5877d7f424489ff72035bafd1542f4e74328c` |
| `source/skills-table.txt` | The Skills table (all 18 skills and the ability each uses), the Proficiency Bonus table, and the rules that apply the bonus to a skill or a save | 10, 12, 13 | `626c451b2c3d535ecb484c12521ae4b63a77922eb5b2c78f6379e143039d0868` |
| `source/ability-score-generation.txt` | Ability-score generation: Standard Array, Random Generation, and Point Cost, including the complete point-cost and Standard Array by Class tables | 21 | `0999337da9d793311c72fb5198cd7e3f23c6fc72e1dbdd6a6adc6f72d4c6b441` |
| `source/sheet-math.txt` | Passive Perception, Level 1 Hit Points by Class, Fixed Hit Points by Class, Initiative, unarmoured Armor Class | 21-23 | `bbdb97493386a773512cfe379bd5be82430eb49f212902ca7180be54933373c9` |
| `source/multiclassing.txt` | Multiclassing: Hit Points and Hit Dice, Proficiency Bonus, proficiencies, Armor Class and Extra Attack | 24-25 | `e815c8d2cbd7cebffd1a471353476095393a810c91be4319e2f096a22a4505a7` |
| `source/multiclass-entry-grants.txt` | The "As a Multiclass Character" clause of all twelve classes — the SUBSET a second class grants (D28) | 27-72 | `c0397f4114b33a64f6a8d198ba5e088393c035b8e137fbf482129a2b495e47b9` |
| `source/domain-vocabularies.txt` | Schools of Magic, conditions, creature types, damage types and size categories | 104, 179-180, 188 | `d555d3eb9fb517d88585e8a4efcedd3ef7ad675450ecc2155567989ab35b2626` |
| `source/bard-spell-list.txt` | Complete Bard Spell List | 33-35 | `7cdca733e61177a5d73606c918b905647bf793681ab9a648577c09c1f40ad9ad` |
| `source/cleric-spell-list.txt` | Complete Cleric Spell List | 38-40 | `8a91ee63ab3ee4ef39c54e066c3ba255cdfb6a2ef39ab7391d8d92e051d2a547` |
| `source/druid-spell-list.txt` | Complete Druid Spell List | 44-45 | `054589b1545c8eb3b7e7d7c1b215816790cef44091d75b944a9fc398957667f4` |
| `source/paladin-spell-list.txt` | Complete Paladin Spell List | 55-56 | `783040fafe3f1b7266cda2739c4f6ccb9357d0e026aafee9730111f4e46f3d75` |
| `source/ranger-spell-list.txt` | Complete Ranger Spell List | 60 | `dd1ab7523bce6cf483f8977088185994b4a67389279bfe48389cef4099c090b2` |
| `source/sorcerer-spell-list.txt` | Complete Sorcerer Spell List | 67-69 | `2f5571a173d92e4ca53e931009564483fa2fbe91e2b140871d2c3f5e106ea394` |
| `source/warlock-spell-list.txt` | Complete Warlock Spell List | 74-76 | `43d0c57d27e3580d8f2ff6b0174fb778f1eb43251ec91e182f126fcbb14621e1` |
| `source/wizard-spell-list.txt` | Complete Wizard Spell List | 79-82 | `8400870a0b7a789fc9f8cf94ea5e9faed9c1682c9bfa9bcc9fd4ee748a713926` |
| `source/spell-descriptions.txt` | Complete Spell Descriptions section, enumerating 339 unique spell headings | 107-175 | `4f7e4d4df2eb62b47a38e70be5a6c09de084e40886069937ca2c048590470750` |
| `source/unarmored-defense.txt` | Unarmored Defense — the Barbarian and Monk level-1 features, whose second ability AND shield clause differ (D75) | 29, 50 | `7e225c919bd6c225c106352d2292560ddf1791711b458dd342581896aba56af5` |

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

## The complete text, committed

`docs/srd/full/srd-5.2.1.txt` is the ENTIRE `pdftotext -layout` output of the
document above, byte for byte after its notice header, committed 2026-07-30 at
the owner's direction ("we will need it all"). The PDF was re-fetched that day
and its SHA-256 matched this file's table exactly before conversion. Committed
file SHA-256: `7c53ca15f0d3dafbae54fb0eab10fc60a51af180b8b86254ce006a12e5bbe207`
(2,146,889 bytes; re-pinned 2026-08-13 when the file's attribution header
was corrected from the 5.2 statement to the 5.2.1 statement — the six-byte
delta is exactly that header correction, the SRD body is unchanged).

Two-column pages interleave their columns on each line in that file, so the
extracts in `source/` remain the readable, column-sliced references and every
future slice should still land there with a row in the table above. What the
full file changes is provenance: a new slice is now checked against a
COMMITTED source, not a download.

## Attribution

`ATTRIBUTION.md` in this directory governs. Every file in `source/` carries the
required notice verbatim at the top of the file, because that notice must
travel with the content and a directory-level licence file does not survive a
copied file.

Do not add attribution to Wizards of the Coast beyond that notice — the licence
asks that no other attribution appear, and that constraint is easy to violate
by being helpful.
