# SRD 5.2.1 attribution

This project bundles reference material from the D&D System Reference Document
5.2.1, which Wizards of the Coast released under the Creative Commons Attribution
4.0 International licence.

## Required notice — reproduce verbatim

The following statement must appear wherever SRD-derived content ships. Do not
paraphrase it, and do not shorten it:

> This work includes material from the System Reference Document 5.2.1
> ("SRD 5.2.1") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
> Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.

## Constraint that is easy to get wrong

Wizards asks that **no other attribution to Wizards, its parent, or its
affiliates** appear beyond the notice above. In practice that means this app
must not:

- use the D&D or Wizards of the Coast logos, wordmarks, or trade dress;
- describe itself as official, licensed, endorsed, or approved;
- claim compatibility with a named commercial product (for example by
  advertising itself as a companion to any particular publisher's toolset).

Naming the SRD itself is required; naming Wizards beyond the notice is not
permitted.

## "Compatible with fifth edition" is an express permission, not an inference

Immediately after the required notice, the source document's Legal
Information section grants a second, narrower permission (quoted here inline
rather than as a blockquote, because `tests/unit/ui/legal.test.ts` treats
every blockquote in this file as part of the one notice it compares
byte-for-byte against `SRD_ATTRIBUTION_NOTICE`): a work carrying the required
notice "may... include a statement on your work indicating that it is
'compatible with fifth edition' or '5E compatible.'" Verified at
`docs/srd/full/srd-5.2.1.txt:29-30` (SRD 5.2.1, page 1, "Legal Information").

This is a right the source grants directly, not something inferred from
CC-BY-4.0's own terms, and it licenses exactly those two phrasings — not a
claim of official status, endorsement, or compatibility with any named
commercial product, all of which the constraint above still forbids.

This app does not currently use either phrase; this entry exists so a future
screen or document does not have to re-derive whether it may.

## Where the notice must appear

- In the application UI, reachable from any screen that renders SRD content.
- In any exported or printed character sheet that reproduces SRD text.
- In this repository, in the bundled data files' own metadata.

Machine-readable SRD reference blocks emitted for browser AI agents count as
rendering SRD content and therefore carry the notice too.

## What may be bundled

Bundle content **only** under a free licence whose sole obligation is
attribution. CC-BY-4.0 (the SRD 5.2.1 licence) qualifies, as do MIT and
Apache-2.0 for code-like data.

CC-BY-**SA** does *not* qualify and must not be bundled, despite being a
Creative Commons licence: share-alike is an obligation beyond attribution, and
it propagates to whatever it is combined with. The test is the obligation, not
the licence family — "it's Creative Commons" is not sufficient.

Every bundled source must carry its own required notice in the same place this
one appears, and must be listed here before it ships.

Do **not** bundle content that is:

- unlicensed, or licensed only by implication or custom;
- under a non-commercial or no-derivatives restriction;
- under a bespoke game licence that imposes obligations beyond attribution
  (fan-content policies and similar permissions are not free licences).

Anything that fails that test stays user-supplied through catalog import, which
remains the mechanism for homebrew and non-free material. Bundling free
reference content does not change that boundary — it narrows what users are
obliged to supply themselves.
