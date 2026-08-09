# Where the SRD 5.1 material came from

Provenance for the files in this directory, following the pattern of
`docs/srd/SOURCE.md`.

## The source

| | |
|---|---|
| Document | System Reference Document 5.1, **OGL edition** |
| URL | https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf |
| Retrieved | 2026-08-06 |
| Size | 4,857,826 bytes |
| SHA-256 | `d3f94417d2532f42a5abaec07e71a59007bf6cc46992c6458be6667f7a9f1e34` |
| Pages | 403 |
| Licence | Open Game License 1.0a |

The PDF is **not** committed — the same reasoning as `docs/srd/SOURCE.md`. A
checksum lets anyone confirm they hold the same bytes we read.

## Why the OGL edition and not the CC edition

SRD 5.1 is dual-licensed. Wizards publishes two PDFs of the same content:

| Edition | URL | SHA-256 | Licence |
|---|---|---|---|
| OGL — **the one used here** | `.../2016/downloads/DND/SRD-OGL_V5.1.pdf` | `d3f94417…` | OGL 1.0a |
| CC | `.../2023/downloads/dnd/SRD_CC_v5.1.pdf` (3,158,713 bytes) | `2504d2a0…` | CC-BY-4.0 |

This folder needs the **OGL** edition, because the whole point of the 5.1 route
is to combine 5.1 with 3.5 SRD material under a single licence. Taking 5.1 under
CC-BY would reintroduce the mixing problem the quarantine exists to avoid. The
OGL edition also carries the licence and its Section 15 chain in the document
itself, on pages 1–2, which the CC edition does not.

## Files here

| File | What it is |
|---|---|
| `srd-5.1-ogl.txt` | The full 403-page SRD, `pdftotext -layout`. |
| `ogl-page.txt` | Pages 1–2 alone — the OGL 1.0a and its Section 15 chain, the authority for the 5.1 entries in `../SECTION-15.md`. |

## Re-deriving the text

```sh
curl -sSLO https://media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf
sha256sum SRD-OGL_V5.1.pdf            # must match the table above
pdftotext -layout SRD-OGL_V5.1.pdf srd-5.1-ogl.txt
pdftotext -f 1 -l 2 SRD-OGL_V5.1.pdf ogl-page.txt   # no -layout: reading order
```

`pdftotext` is poppler-utils.

## Reading caveat — this extraction is harder to search than the 5.2.1 one

The 5.1 PDF sets body text in two columns and uses soft hyphens plus non-breaking
spaces throughout. Consequences observed while working with it:

- `-layout` preserves columns but **interleaves them on lines that span the
  gutter**, so a sentence from the left column can be spliced with one from the
  right. The Section 15 chain reads as gibberish under `-layout` and had to be
  re-extracted without it.
- Spell headers come out as `1st-­‐‑level necromancy` — the level and school are
  separated by soft hyphens and a non-ASCII sequence, so a naive regex for
  `\d(st|nd|rd|th)-level` finds nothing. Normalise `­`, `‐`-`―`
  and ` ` before matching.
- Spell-list pages interleave several columns of names, so a name's neighbours
  in the text are not its neighbours on the page. **Do not infer a spell's level
  from adjacent text.** Confirm against the spell's own description block.

Where a value matters, extract the specific page without `-layout` rather than
searching the whole-document dump.

## Values taken from this source

Verified directly rather than from memory, for `../way-of-the-psionic-fist.md`:

- *"Ki save DC = 8 + your proficiency bonus + your Wisdom modifier"* — quoted.
- Monk table: Martial Arts die d4/d6/d8/d10 at levels 1/5/11/17; ki points equal
  to Monk level; Monastic Tradition features at 3rd, 6th, 11th and 17th.
- All fifteen powers on the Psionic Fist list confirmed present.

## Licence obligations

Open Game Content under the OGL 1.0a. See `../OGL-1.0a.txt`, `../SECTION-15.md`
and `../LICENSING.md`.
