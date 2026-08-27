# Permissively licensed encounter & campaign sourcing (D395)

Date: 2026-08-27. Supervisor research; license verdicts are supervisor calls
under the standing wall: **public repo admits CC-BY 4.0 and
strictly-more-permissive (CC0 / public domain); CC-BY-SA only after an
explicit owner ruling; NC / ORC / OGL-only stays out.**

## Verdict table

| Source | Contents | License | Verdict |
|---|---|---|---|
| **Watabou "One Page Dungeon" generator** (watabou.itch.io/one-page-dungeon) | Procedural dungeon layouts — rooms, doors, notes — with **JSON export** | Author states outputs free for any use incl. commercial, attribution optional | **CLEAR — highest value.** Machine-readable; feeds the D394.3 room generator directly |
| **One Page Dungeon Contest corpus** (2008–present, dungeoncontest.com + archive.org + campaignwiki.org) | Hundreds of one-page dungeons: layouts, encounter seeds, set pieces | **CC-BY-SA 3.0/4.0** (contest requirement) | **BLOCKED pending owner ruling** — ShareAlike could bind derived content in the public repo |
| **A5E SRD** (a5esrd.com) | Rules, monsters, exploration challenges / encounter-building tables (no full adventures) | CC-BY 4.0 | **CLEAR** — already attributed in our dist (`A5ESRD-ATTRIBUTION.txt`); mine its challenge/encounter tables |
| **SRD 5.2.1** (already in repo) | Monsters, rules; no adventures | CC-BY 4.0 | CLEAR (present) |
| **"Escape the Astral Tower"** (doomedzone.itch.io, Knave 2e) | 26-room dungeon, event/encounter tables | **CC0** | **CLEAR** — needs stat conversion (Knave → SRD statblocks) |
| Level Up A5E adventures (e.g. Memories of Holdenshire) | Full campaigns | Commercial; only the A5ESRD is CC | OUT |
| Basic Fantasy RPG adventure modules (basicfantasy.org) | Full adventure anthology, dungeons | CC-BY-SA 4.0 | BLOCKED pending the same SA ruling |
| BIND "Goblin Hole" | Module | GPL | OUT (GPL text in a CC-BY repo — incompatible) |
| Kobold Press / Black Flag, Paizo | Adventures | ORC | OUT |
| DMs Guild, DriveThru "free" titles | Adventures | Closed licenses; free ≠ licensed | OUT |
| Trilemma Adventures | Adventure collection | CC-BY-**NC** | OUT (NC) |

## Recommended import plan

1. **Now, license-clean, machine-readable**: adopt Watabou JSON as a layout
   supply for the D394.3 room generator — layout skeleton from Watabou (or a
   seeded reimplementation of the same style), rosters/terrain/party-state
   from our own SRD-anchored samplers. Unlimited varied rooms, zero
   licensing exposure, deterministic per seed once layouts are checked in.
2. **Now, small but real**: convert "Escape the Astral Tower" (CC0) into
   typed encounter states — a 26-room hand-authored dungeon exercises the
   pipeline on human-designed set pieces, which generated rooms undersample.
3. **Mine A5E SRD** exploration challenges and encounter tables (CC-BY,
   already attributed) into fixture ingredients.
4. **Owner decision needed**: the OPDC corpus (hundreds of dungeons) and
   Basic Fantasy anthologies are the two big CC-BY-SA pools. If ShareAlike
   is acceptable for a segregated `content/cc-by-sa/` subtree (SA obligations
   contained to that subtree and its direct derivatives), the selection grows
   by an order of magnitude. If not, we stay with 1–3, which is already
   sufficient for the flywheel.
5. Every import lands with a per-source ATTRIBUTION file and a license copy,
   same pattern as the existing SRD/A5ESRD notices.

## Conversion reality check

Only Watabou emits structured data. Everything else is prose + map images:
"bringing them in" means authoring typed encounter states from the text —
codex conversion lanes with supervisor spot-checks against the source, one
attribution header per converted encounter naming the origin and license.

Sources:
- https://watabou.itch.io/one-page-dungeon (+ itch.io/post/5680416 license statement)
- https://www.dungeoncontest.com/store · https://archive.org/details/opdc2015 · https://campaignwiki.org/wiki/DungeonMaps/One_Page_Dungeon_Contest
- https://a5esrd.com/how-to-use-creative-commons
- https://doomedzone.itch.io/the-astral-tower
- https://github.com/offgridttrpg/awesome-libre-tabletop-rpgs
- https://www.dndbeyond.com/resources/1781-systems-reference-document-srd
