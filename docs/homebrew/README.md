# Homebrew

Everything in this folder is homebrew **content** — subclass designs, their
inputs, and the design guidelines they are written against. Nothing here is
app code, and nothing here reaches the app's seed data until the owner
approves it and a normal content unit carries it in.

Moved here from `docs/design/` on 2026-08-04. References to
`docs/design/subclass-guidelines/` in `.claude/decisions.md` (D177 era) and
older lane-state entries predate the move and are left as written — those
files are append-only records.

## Map

| Path | What it is |
|---|---|
| `subclass-guidelines/` | The six clean-room design files (D177) + a README report. The physics: power budget, cadence/anatomy, fun contract, 16-entry failure taxonomy, ~50-item pre-flight. **Read these before designing anything.** |
| `lessons.md` | What we've learned *operating* the homebrew pipeline — clean-room practice, licensing rulings, the bake-off pattern, wording lessons from the owner's ruling arc. Complements the guidelines; does not repeat them. |
| `pending-rulings.md` | Per-doc digest of every open OWNER-APPROVAL item. The work queue for a subclass session. |
| `rulings.md` | (Created when first used.) Owner rulings made in a subclass session are recorded here, newest first, and folded into `.claude/decisions.md` by the supervision loop at merge. Do not write to `.claude/decisions.md` from a subclass session — two concurrent writers on an append-only file is a merge conflict factory. |
| `2026-08-03-monk-third-caster-pitches.md` | The 20-pitch monk catalog (three clean-room panels). D190 picked three finalists; D193 added a fourth. ~16 pitches remain unbuilt. |
| `2026-08-03-monk-bakeoff.md` | Side-by-side comparison packet for the three D190 finalists on the shared third-caster engine. |
| `2026-08-03-monk-barbed-court.md` | Full draft — Warrior of the Barbed Court (bard-list goad monk). |
| `2026-08-03-monk-ten-selves.md` | Full draft — Warrior of the Ten Selves (illusion/duplicate monk). |
| `2026-08-03-monk-hundred-knots.md` | Full draft — Warrior of the Hundred Knots (primal/binding monk). |
| `2026-08-03-monk-waking-will.md` | Full draft — Warrior of the Waking Will (D193: Psionic Fist adaptation, self-buff concentration monk). |
| `2026-08-03-oath-of-domination-subclass.md` | Full draft — Paladin Oath of Domination (command/prophecy, D186/D188 tenets + simplified Voice). |
| `2026-08-03-ranger-simple-subclass.md` | Full draft — Ranger "Pursuer" (D192 owner-frozen Hunter's Mark engine, level-7 unbind labeled a known hot outlier). |
| `2026-08-04-rogue-veteran-subclass.md` | Full draft — rogue **Veteran** (owner-authored kit, ruling 2026-08-04 in `rulings.md`, supersedes the Executioner/D194–D196 arc). Guaranteed-outcomes identity: Sneak Attack on a miss, doubled pool at 9, crit ladder at 13/17, Expertise-everything at 17. One wording clarification open. |
| `oath-of-domination-inputs.md` | The owner's raw inputs for the Oath of Domination. |

## Status at a glance

Settled by ruling: which subclasses exist and under what license (D190, D191,
D193), the rogue Veteran kit in full (owner-authored, ruling 2026-08-04 in
`rulings.md`, superseding the Executioner/D194–D196 arc — one wording
clarification open), all four monk working names (ruling 2026-08-04), the
ranger engine's mechanics (D192, frozen — but its power level is *not*
approved). The monk seed-scope question is deferred to seeding time.

Open: every other doc's named features, identities, and numbers carry
OWNER-APPROVAL markers — see `pending-rulings.md`. All drafts are
"ready for design review only": no playtest has been run on anything.

## Licensing (binding, D59/D191)

Every doc: CC-BY-4.0 with the SRD 5.2 attribution notice. The test is
authorization, not copyright, and only what lands in git matters. Non-SRD
works may be *named* only as distance markers (things to verify we are not
close to), never used as sources. Open-content ancestry (3.5 SRD) is
permitted concept-only, with a one-line disclosure and zero reuse of wording
or subsystem mechanics.

---

This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.
