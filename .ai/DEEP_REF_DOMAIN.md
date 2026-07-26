# Deep Reference: The Domain — SRD sourcing and homebrew tolerance

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

---

## 1. Where a rules value is allowed to come from

**A value in this repository must trace back to a document, not to somebody's
memory of the rules.** `docs/srd/SOURCE.md` is that record: the source PDF (SRD
5.2.1), its URL, retrieval date, byte size and SHA-256, plus the exact
`pdftotext -layout` recipe to re-derive the extracts.

Thirteen verbatim extracts live under `docs/srd/source/*.txt`, each with **its
own SHA-256** in `SOURCE.md`'s table, and
`tests/unit/rules/srd-extract-provenance.test.ts` asserts:

- every extract's checksum still matches, and
- the table and the directory are equal **as sets, in both directions** — a file
  with no row has no provenance; a row with no file is a claim about bytes that
  are not there.

### Why per-extract checksums exist, and the failure that caused them

The PDF's checksum did not catch the thing that broke.
`species-descriptions.txt` was committed **truncated** — it began thirteen lines
late, and those thirteen lines carried the right-hand column's continuation of
Dragonborn. Two whole traits were absent (`Darkvision`, `Draconic Flight`), so
the file said Dragonborn has three traits where the source prints five. The PDF
checksum matched throughout and always would have: it says the bytes we sliced
FROM are right and says nothing about the range someone sliced OUT of them.

Two slicing mistakes were made and caught here, both recorded in `SOURCE.md`:
column slicing must be done **by character, not by byte** (the SRD uses curly
quotes, and a byte-wise `cut -c` splits one and produces invalid UTF-8), and it
must stop at the real column boundary or a value is truncated mid-word and
becomes fabricated data downstream.

**Adding an extract therefore means adding its row.** That is the whole burden,
and it is deliberately not optional. [RECIPES.md](RECIPES.md) §4.

Licensing of anything sourced this way: [DEEP_REF_LICENSING.md](DEEP_REF_LICENSING.md).

---

## 2. THE TRAP: a closed enum is a data-loss bug for homebrew

This is the single mistake most often made in this codebase, and it has been
answered three times.

Making `spell_versions.school` a `z.enum([…the 8 SRD schools])` **rejects an
imported homebrew spell whose school is "Chronomancy"**. The user can see the
record in their own file; the import reports success or refuses the document; the
data is gone either way. Over-strictness at a boundary is a data-loss bug, not
safety.

The answer this project has converged on, three times independently:

| Record | The shape |
|---|---|
| **Q4** (closed in D10) | Known weapon property TOGGLES, plus free text |
| **D12** | Species/background traits: a BOUNDED set of mechanical kinds, plus free text |
| **F8** | The same rule stated for the row contracts, with a per-column verdict |

**Bounded mechanical kinds PLUS free text. Never a closed enum over user data.**

Worked example in the code: `speciesTraitEffectKinds`
(`src/domain/enums.ts:323`) is exactly four members — `damage_resistance`,
`hp_modifier`, `speed`, `granted_spells` — because each of those moves a derived
number and a sheet that ignores it is simply wrong. Every OTHER trait is free
text with no mechanics: an Elf's four-hour trance is a sentence on the sheet, not
a model. Adding a new mechanical KIND is a deliberate change; adding a new trait
is not.

### How to decide, per field

F8 gives the three verdicts. One line each, cited rather than restated — read F8
for the reasoning:

- **CLOSE** where the SRD closes the set and homebrew will not extend it — e.g.
  spell `level` 0..9, which a CHECK already enforces and only the TYPE says
  `number`.
- **OPEN** — recognise known values, preserve unknown ones — `school`,
  `action_type`, `upcast_type`.
- **VALUE OBJECT** where a free string holds structured data — `casting_time`,
  `range`, `duration` ("60 feet", "Concentration, up to 1 minute"). Parse with
  fallback: structured when recognised, raw retained always.

[RECIPES.md](RECIPES.md) §2 is the procedure.

---

## 3. The builder BLOCKS; the boundary TOLERATES

**D11 part 2**, in one line: an SRD-illegal choice is unavailable in the guided
builder — hidden or disabled at the point of choosing, with the requirement
stated — but anything arriving by **import, share link or catalog is still
accepted**, flagged with a warning, never rejected.

These are different obligations with different answers, and conflating them is
how both go wrong. Tolerance was never about helping you make an illegal choice;
it is about never making existing data unopenable.

A consequence worth knowing: a blocked choice is **not** a completeness warning,
because it can no longer be reached from the builder. Completeness
(`src/queries/character-completeness.ts`) reports what is MISSING; legality is
enforced somewhere else.

---

## 4. Say what you do not have, rather than showing a blank

**F4**, and the rule the sheet follows. `SHEET_GAPS`
(`src/queries/character-sheet-builder.ts`) names, in prose a person reads, every
thing the application does not hold — no class feature text, partial subclass
catalog, no unarmoured defence, no Expertise, no weapon proficiency, background
skills as text. They are stated unconditionally because each is true of every
character equally, and a check that happened to pass on a Fighter would hide that
it fails on the other eleven classes.

The same rule one level down, from **D24**: an ASSUMPTION is never printed as a
fact. A homebrew class has no seeded hit die, so `hit_die` is `number | null` in
the type; `hitPointMaximum` substitutes an assumed die at the single place the
number is produced and emits a warning naming the class. The absence lives in the
type; the reason is derived where the value is computed, not annotated at call
sites (the D21 shape).

---

## 5. The domain vocabulary, and where it lives

| Concept | Where |
|---|---|
| Enums (abilities, skills, buckets, states, source types, mastery, armour, species trait kinds…) | `src/domain/enums.ts` |
| Branded ids | `src/domain/ids.ts` |
| Storage-shaped row models | `src/domain/models.ts` |
| Read models the UI consumes | `src/domain/read-models.ts` |
| Command payloads | `src/domain/command-contracts.ts` |
| Bounds (`origin-limits.ts`, `sheet-limits.ts`, `weapon-limits.ts`) | `src/domain/` |
| Derived rules — sheet maths, multiclass slots, attacks, species effects | `src/rules/` |

F8's standing observation about `src/domain/models.ts`: the types are
**table-shaped, not domain-shaped** — `SpellVersionRow` answers "what columns does
`spell_versions` have", not "what is a spell". D6d prescribed the fix. It has been
applied in some places and not there. Cited, not restated.

---

## 6. Content arrives through catalog import

`docs/CATALOG-IMPORT.md` is the format document. Two rules from it that generalise:

- **An absent field means what it always meant.** An element with no `kind` — or
  `kind: null` — is a spell, which is the meaning every document written before
  subclasses existed already has. Those documents keep importing unchanged.
- **An unrecognised value is REFUSED, not skipped.** A `kind` that is present but
  unknown aborts, because skipping it would report the document as fully imported
  while dropping a record the user can see in their own file.

Note that this is not in tension with §2. Refusing a whole document with a
structurally unknown record type is different from silently discarding a *value*
inside a known record. The first is honest; the second is the data-loss bug.
