# Where the 3.0 SRD material came from — **INCOMPLETE**

> **Read this first.** What is committed here is **49 of roughly 205 files —
> about a quarter of the 3.0 SRD.** The filename says `PARTIAL` for that reason.
> Do not treat an absence from this set as evidence that something is absent
> from the 3.0 SRD. For any question this set cannot answer, use `../srd-3.5/`,
> which is complete.

## The source

| | |
|---|---|
| Document | d20 System Reference Document v3.0, the Open Gaming Foundation RTF set |
| Host | Internet Archive Wayback Machine, snapshots of `opengamingfoundation.org/srd/` |
| Retrieved | 2026-08-06 |
| Files obtained | 49 of ~205 candidate URLs |
| Archive size | 2,478,577 bytes |
| Archive SHA-256 | `e501091daa9c0e1acbe9fe46d372cca72232ed536d71c64dcdeaa22a6ec38b36` |
| Licence | Open Game License 1.0a |

Unlike the 3.5 SRD, **no complete 3.0 archive survives anywhere we could find.**
Wizards' `d20/files/` paths 404. The Open Gaming Foundation's own SRD page now
reads only *"This page is no longer maintained."* Searches of the Internet
Archive return no 3.0 SRD item — the `dnd35srd` item is 3.5. The only surviving
copy is the OGF's individual RTFs preserved in the Wayback Machine, which must
be fetched one file at a time.

The retrieval got 49 files before the Wayback Machine began returning
`HTTP 503 Service Unavailable` on sustained requests, including on the index
query itself. This is rate limiting, not a permanent failure — a later run with
slower pacing should recover more.

## What is here

```
SRDBreakingItemsandAttackingObjects  SRDCarryingMovingSeeing  SRDCombatActions
SRDCombatBasics  SRDCombatModifiers  SRDTreasure  srdNPCsFamMntsComps
srdabilityscores  srdalignment  srdarcanespells  srdarmorclass
srdbasiccharacterclassesi  srdbasiccharacterclassesii  srdbasiccharacterclassesiii
srdbasiccharacterraces  srdbasics  srdmagicitemswands  srdmagicitemsweapons
srdmagicitemswondrousitems  srdmagicoverview  srdmonstersa  srdmonstersanimals
srdmonstersb  srdmonstersc  srdmonstersnop  srdmonstersr  srdmonsterss
srdmonsterst  srdmonsterstemplates  srdmonstersuvw  srdmonstersvermin
srdmonstersxyz  srdpsioniccombat  srdpsioniccreatures  srdpsionicdisease
srdpsionicfeats  srdpsionicitems  srdpsionicpowersabc  srdpsionicpowersdefgh
srdpsionicpowersiklmnop  srdspellsjkl  srdspellsm  srdspellsno  srdspellsp
srdspellsqr  srdspellss  srdspellst  srdspellsuvwxyz  srdturningrebukingundead
```

## What is missing — including the part that matters most

Known gaps, inferred from the naming pattern:

- **Prestige classes.** Not in this set. **This is the category the folder
  exists to serve**, so for prestige-class research the 3.0 set is currently of
  no use and `../srd-3.5/PrestigeClasses` must be used instead.
- Feats, skills, equipment, special abilities and conditions.
- Divine spells, domains, and deities.
- Epic level material.
- Monsters D through M.
- Spells A through I.
- Psionic powers Q through Z.
- Magic items: armor, potions, rings, rods, scrolls, staffs.

## Completing the set

```sh
# List every archived RTF under the OGF SRD path
curl -sS "http://web.archive.org/cdx/search/cdx?url=opengamingfoundation.org/srd/*\
&filter=original:.*\.rtf&collapse=urlkey&limit=300&output=json"

# Fetch each with the id_ suffix, which returns the original bytes rather than
# the Wayback viewer's rewritten HTML:
#   http://web.archive.org/web/<timestamp>id_/<original-url>
```

Pace it at several seconds per request. The failure mode is a 503 on sustained
traffic, and once it starts even the index query fails, so a fast loop retrieves
less than a slow one. Validate each response begins with the bytes `{\rtf`;
error pages are returned with HTTP 200.

Convert to text the same way as the 3.5 set — see `../srd-3.5/SOURCE.md`.

## Licence obligations

Open Game Content under the OGL 1.0a. See `../OGL-1.0a.txt`, `../SECTION-15.md`,
and `../LICENSING.md`. Note that the Section 15 chain in this folder is the one
published with the 3.5 SRD; if the 3.0 set is completed, its own `Legal.rtf`
copyright notice must be read from the source and added to the chain rather than
assumed identical.
