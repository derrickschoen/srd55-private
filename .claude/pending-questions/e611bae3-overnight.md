# Questions for the owner — parked, not blocking

Owner is asleep (2026-07-25). Standing authorisation: proceed on the
Claude/codex consensus recommendation, park anything that needs a real decision.
Nothing here has stopped other work.

---

## Q1 — ANSWERED 2026-07-26: build it claude-only (see D12). No longer blocked.

**State:** 23 files of unreviewed implementation parked in
`../dnd-wt-bridge` on `feat/local-ai-bridge`. NOT merged, NOT resumed.

**Why it stopped:** a safety classifier blocked the revision step, and I agree
with it. Our own testing (F2) proved `codex --sandbox read-only` executes
arbitrary shell commands and reads files outside its working directory —
including SSH keys and credentials. A browser-reachable endpoint to that, with
no per-action approval, is materially different from "a chat window".

**I am deliberately NOT resuming this autonomously.** Proceeding would mean
overriding a safety stop on a decision you have not made.

Options:
- **A (recommended)** — ship a claude-only bridge. `claude -p --tools ""` is
  verified contained: zero tool_use blocks, no file written, when adversarially
  prompted. Delivers the feature using the half we proved safe.
- **B** — keep codex, add a per-action approval gate for every command. Real
  work; changes the UX from chat to supervised agent.
- **C** — drop the bridge; use the browser extensions (Tier 1) instead.
- **D** — something else.

---

## Q2 — RESOLVED 2026-07-26 by D11: yes, a link may carry it

Share import keeps a selection the app itself would refuse to make:
`active/invalid` without `keep`, `kept_override/invalid` with it. The normal
selection command rejects the identical selection outright.

Its test passes and documents current behaviour, so nothing is broken. Likely
subsumed by the deferred import-tolerance work. **Question:** should a shared
link be able to carry a selection the app would not let you make by hand?

Proceeding meanwhile: current behaviour retained.

---

## Q3 — RESOLVED 2026-07-26: pruned, and there were EIGHT (see D9)

`users`, `password_reset_tokens`, `sessions`, `cache_locks`, `jobs`,
`job_batches`, `failed_jobs` have no application usage; they exist only for
Laravel round-trip fidelity. Consensus says do NOT prune them during the Drizzle
rewrite (combining makes failures ambiguous) — that is being followed.

**Question for later:** prune them as a separate change? It would drop the
38-table assertion to 31, invalidate existing images, and lose Laravel
whole-database round-trip fidelity for those tables.

**Resolved.** Pruned as its own commit under D7. There were eight, not seven —
`cache` was missing from the list above. The schema is now 30 tables. The
Laravel-derived schema signature survives as a real oracle by being re-derived
from the frozen pre-Drizzle fixture rather than from our own output. Nothing
read or wrote any of the eight.

---

## Q4 — Weapon "other properties" representation

D1b settled that weapons are user-defined with SRD templates plus mastery
selection. Open: how "other properties" is stored.

Recommendation being followed: a small set of known toggles (finesse, thrown,
two-handed, versatile, heavy, reach, ammunition, loading, reach) plus a
free-text field — so the sheet can render them and an agent can read them,
rather than an open key/value blob that neither can.

---

## Q5 — Anything the overnight consensus decides that you may want to revisit

Recorded as it happens in `.claude/decisions.md`. Each entry says what was
decided, on what evidence, and what the alternative was. Read that file first
when you are back; this file is only for things I would not decide alone.

---

## Q6 — ANSWERED 2026-07-26 by the owner (see D11)

Finding F4 (2026-07-26): seeding the twelve classes made a fresh install usable
as a **spell planner**. It did not make it a character builder.

`class_definitions` carries only spellcasting attributes. The whole 616-line
schema has ZERO occurrences of hit dice, hit points, armour class, skills, class
features, traits, speed, size, languages, or subclass level. Subclass coverage
is 2 of 12 classes — Eldritch Knight and Arcane Trickster, the two third-casters
— because non-casting subclasses were never modelled. A Wizard has no subclass
options at all.

So a builder over today's model can guide: name, ability scores, class, level,
spells. It cannot produce a character sheet, because that data does not exist.

**Option 1 — model expansion first.** Add the sheet domain (HP, AC, skills,
proficiencies, features, all subclasses), then build the guided flow over it.
Correct, and much larger than the builder UI itself.

**Option 2 (recommended, being followed meanwhile) — ship a spell-focused
guided builder now.** A walkthrough for exactly what the app models today,
honest about being a spell planner. Your stated motivation was friends missing
selections in confusing tools; that pain is real for spell selection alone, and
completeness v1 already targets it. Proves the flow before the sheet domain
exists.

**Option 3** — something else.

I have NOT started either. This changes what the deliverable is, which is a
product decision rather than a technical one.

---

## Q6 UPDATE — the model-expansion half is now settled by your own instruction

Q6 offered Option 1 "expand the model (HP, AC, skills, features) first" versus
Option 2 "ship a spell-focused guided builder now". I have NOT chosen between
them, because the guided-builder question is still yours.

But one part is no longer open. You instructed directly: *"Include the weapons
from the srd as templates. Let the user make custom weapons. Don't forget
selecting weapon masteries."* That is model expansion beyond spellcasting, and
it is authorised by you rather than inferred by me, so weapons are being built
(D1b governs the shape).

So Q6 has narrowed to: **what the guided BUILDER walks a user through** — not
whether the model may grow past spells. It already is growing.

Worth knowing when you answer: the app still has no hit points, armour class,
skills, class features, speed, size or languages, and subclass coverage is 2 of
12 classes. Weapons will not change that. A builder can still only guide name,
ability scores, class, level, spells, and now weapons.

---

## Q7 — A browser-test flake I could not attribute (FYI, not blocking)

`tests/browser/attribution.spec.ts:16` intermittently fails on
`expect(loads).toBe(1)` with `Received: 2`. Roughly 4 failures in ~66 runs of
current content; 0 in 36 runs of the pre-merge commit 0a28754.

I merged anyway, with two full suites green on a quiet box, and recorded the
whole experimental record as F5 in `.claude/decisions.md` — including three
hypotheses I tested and killed. It is disclosed, not suppressed: no retry, no
skip, no loosened assertion. Flagging it because a rare browser flake is the
kind of thing you may want to weigh in on before it gets chased expensively.

---

## Q8 — RESOLVED 2026-07-26: weapons now survive all three

**Resolved by implementation on `feat/portability`.** `character_weapons` is now
`snapshot: true`, `backupDirect: true`, `backup: true`, `share: true`. A
character's weapons travel in the portable backup document, in a share link, and
in a save-point snapshot.

Backward compatibility was the hard half, and it holds in all three directions:

- **Backup file.** `character_weapons` is in `BACKUP_OPTIONAL_TABLES`, so a
  document exported before this change validates and imports, yielding a
  character with no weapons. `CHARACTER_BACKUP_VERSION` stays 1.
- **Share link.** The wire tuple accepts length 11 (legacy, no weapons) or 12.
  `CHARACTER_SHARE_VERSION` stays 1, so every link already in the wild imports.
- **Save point.** `CHARACTER_SNAPSHOT_SCHEMA_VERSION` moved `a7-v1` → `a7-v2`,
  and BOTH are still readable. Restoring an `a7-v1` snapshot deliberately leaves
  the character's weapons untouched rather than deleting them: that snapshot
  never recorded weapons, and treating its silence as "there were none" would
  destroy real data.

**Resolved.** Weapons are carried through backup, share links and save points.
Old payloads still import: a backup file or link predating weapons yields a
character with no weapons rather than an error, proved against hand-frozen
fixtures that the current encoder never produced.

The UI notice, `src/rules/weapon-portability.ts`, its stylesheet rule, its agent
reference field and `tests/unit/contracts/weapon-scopes.test.ts` are all deleted;
the two assertions in that file that were never about the gap were relocated to
`tests/unit/contracts/table-scopes.test.ts`.
=======
**Question for you:** is a disclosed gap acceptable for now, or should closing
it jump the queue? My read is that it should be next after the current queue,
because "my weapons vanished from my own backup" is exactly the kind of quiet
loss this project keeps trying to prevent — but it is a scope call, not a
technical one, and the notice makes the current state honest rather than
dangerous.

**Update, same day:** I started closing it rather than waiting. The rest of the
work queue is done or blocked on your Q6 answer, my recorded recommendation was
that this go next, and your standing instruction was to proceed on the consensus
recommendation. It is additive and reversible.

The one genuinely risky part is versioning, and the track is bound on it: a
backup file or share link you ALREADY HOLD predates weapons, and importing one
must still succeed, yielding a character with no weapons. Refusing an old
payload would be precisely the data loss this project keeps preventing. The
old-format fixtures must be hand-frozen, never generated by the new encoder —
a fixture produced by the code under test proves nothing.

If you would rather have kept the disclosed notice instead, say so and it
reverts cleanly.
>>>>>>> main
