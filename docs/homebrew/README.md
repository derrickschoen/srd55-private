# Homebrew

Everything in this folder is homebrew **content** — subclass designs, their
inputs, the design guidelines they are written against, and the licensed source
material they draw on. Nothing here is app code, and nothing here reaches the
app's seed data until the owner approves it and a normal content unit carries it
in.

Moved here from `docs/design/` on 2026-08-04. References to
`docs/design/subclass-guidelines/` in `.claude/decisions.md` (D177 era) and older
lane-state entries predate the move and are left as written — those files are
append-only records.

## Split by licence (2026-08-06)

The subclass docs moved into `cc-by/` and an OGL quarantine was added, on owner
ruling. The split is physical, not a header note, because a header note does not
survive somebody copying a paragraph.

| Folder | Licence | Rule |
|---|---|---|
| `cc-by/` | CC-BY-4.0 + the SRD 5.2 notice | Our own text, built from SRD 5.2.1. **No OGL content, ever.** |
| `ogl/` | Open Game License 1.0a | 3.0/3.5/5.1 SRD source, and any conversion that reuses it. Carries the licence and the Section 15 chain. Holds the Psionic Fist conversion, which targets **SRD 5.1 (2014 rules)** because 5.2 is CC-BY-only and cannot be taken under the OGL. |

**Text never moves from `ogl/` to `cc-by/`.** Concepts may cross; sentences,
feature names, tables and numbers may not. The reasoning, and the three routes
available for turning an OGL prestige class into a 5e subclass, are in
[`ogl/LICENSING.md`](ogl/LICENSING.md).

## Map

| Path | What it is |
|---|---|
| `subclass-guidelines/` | The six clean-room design files (D177) + a README report. The physics: power budget, cadence/anatomy, fun contract, 16-entry failure taxonomy, ~50-item pre-flight. **Read these before designing anything.** |
| `lessons.md` | What we've learned *operating* the homebrew pipeline — clean-room practice, licensing rulings, the bake-off pattern, wording lessons from the owner's ruling arc. Complements the guidelines; does not repeat them. |
| `pending-rulings.md` | Per-doc digest of every open OWNER-APPROVAL item. The work queue for a subclass session. |
| `rulings.md` | Owner rulings made in a subclass session, newest first, folded into `.claude/decisions.md` by the supervision loop at merge. Do not write to `.claude/decisions.md` from a subclass session — two concurrent writers on an append-only file is a merge conflict factory. |
| `cc-by/` | The subclass drafts and their inputs. See [`cc-by/README.md`](cc-by/README.md). |
| `ogl/` | OGL 1.0a source material and quarantine. See [`ogl/README.md`](ogl/README.md). |

## Status at a glance

Settled by ruling: which subclasses exist and under what license (D190, D191,
D193), the rogue Veteran kit in full (owner-authored, ruling 2026-08-04 — no open
ruling items), all four monk working names (ruling 2026-08-04), the ranger
engine's mechanics (D192, frozen — but its power level is *not* approved). The
monk seed-scope question is deferred to seeding time.

**In flight:** the Barbed Court monk is under a full owner-led redesign as of
2026-08-06 — arcane taunt-tank, chooseable Wizard list, Focus-to-slot conversion,
weapon mastery on Unarmed Strikes. Roughly a dozen rulings are recorded in
`rulings.md`; the doc itself has not yet been rewritten around them.

Open: every other doc's named features, identities, and numbers carry
OWNER-APPROVAL markers — see `pending-rulings.md`. All drafts are "ready for
design review only": no playtest has been run on anything.

## Licensing (binding, D59/D191/D176)

`cc-by/`: CC-BY-4.0 with the SRD 5.2 attribution notice. The test is
authorization, not copyright, and only what lands in git matters. Non-SRD works
may be *named* only as distance markers (things to verify we are not close to),
never used as sources. Open-content ancestry (3.0/3.5 SRD) is permitted
concept-only, with a one-line disclosure and zero reuse of wording or subsystem
mechanics.

`ogl/`: OGL 1.0a, with the licence text and Section 15 chain in the folder, per
D176.

---

This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.
