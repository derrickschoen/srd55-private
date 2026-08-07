# OGL quarantine

Everything under `docs/homebrew/ogl/` is licensed under the **Open Game License
1.0a**, or is our own commentary about content that is. Nothing else in this
repository is.

This folder exists because of D176: *"Keep ogl stuff in a separate folder with
the ogl requirements in the same folder so ogl doesn't pollute the rest of the
repo."* The separation is physical on purpose — a header note would not survive
somebody copying a paragraph.

## The one rule

**Text never leaves this folder.** Concepts may cross into `../cc-by/`;
sentences, feature names, tables and numbers may not. A document that would need
both the OGL and CC-BY to be lawful belongs here, not there.

The reasoning is OGL §2: *"No other terms or conditions may be applied to any
Open Game Content distributed using this License."* CC-BY-4.0 is other terms.
There is no relicensing path, in either direction, ever. See `LICENSING.md` for
the full reading.

## Contents

| Path | What it is |
|---|---|
| `OGL-1.0a.txt` | The licence, verbatim. §10 requires a copy to travel with every copy of Open Game Content distributed. |
| `SECTION-15.md` | The Copyright Notice chain for exactly what this folder holds, and how to extend it. |
| `LICENSING.md` | Research note: what can and cannot be converted from an OGL prestige class into a CC-BY 5.2 subclass, and the three routes available. |
| `srd-3.5/` | The 3.5 SRD as published — see its `SOURCE.md` for provenance and checksums. |
| `srd-3.0/` | The 3.0 SRD, **partial — 49 of ~205 files, no prestige classes**. See its `SOURCE.md` before relying on it. |

No converted subclass lives here yet.

## Before adding anything

A new document in this folder must carry, in the document itself:

1. The full text of `OGL-1.0a.txt`, or an unambiguous pointer to it in the same
   folder (§10).
2. The Section 15 chain from `SECTION-15.md`, extended with its own entry if it
   contains original Open Game Content (§6).
3. A statement of which portions are Open Game Content (§8).
4. No Product Identity, and no claim of compatibility with any trademark (§7).

If the document also uses SRD 5.2.1 terms — Focus Points, Flurry of Blows,
Unarmed Strike — it is a mixed work and additionally needs the verbatim CC-BY
notice from `docs/srd/ATTRIBUTION.md`, with §8's identification making clear
which portions come from where.

## What this folder is *for*

Design input, and Route B conversions as defined in `LICENSING.md`. Reading the
material here to understand a concept, then writing something original in
`../cc-by/`, is Route A and is how the four monk subclasses were built. Reading
it and reusing its words is Route B and the result stays here.
