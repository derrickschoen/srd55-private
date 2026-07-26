# Questions for the owner — parked, not blocking

Owner is asleep (2026-07-25). Standing authorisation: proceed on the
Claude/codex consensus recommendation, park anything that needs a real decision.
Nothing here has stopped other work.

---

## Q1 — The local AI chat bridge (BLOCKED, needs your decision)

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

## Q2 — Known-ineligible-selection policy (not a defect, needs intent)

Share import keeps a selection the app itself would refuse to make:
`active/invalid` without `keep`, `kept_override/invalid` with it. The normal
selection command rejects the identical selection outright.

Its test passes and documents current behaviour, so nothing is broken. Likely
subsumed by the deferred import-tolerance work. **Question:** should a shared
link be able to carry a selection the app would not let you make by hand?

Proceeding meanwhile: current behaviour retained.

---

## Q3 — Seven dead Laravel infrastructure tables

`users`, `password_reset_tokens`, `sessions`, `cache_locks`, `jobs`,
`job_batches`, `failed_jobs` have no application usage; they exist only for
Laravel round-trip fidelity. Consensus says do NOT prune them during the Drizzle
rewrite (combining makes failures ambiguous) — that is being followed.

**Question for later:** prune them as a separate change? It would drop the
38-table assertion to 31, invalidate existing images, and lose Laravel
whole-database round-trip fidelity for those tables.

Proceeding meanwhile: retained, declared in Drizzle like the rest.

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

## Q6 — "Character builder" means two very different things (NEW, needs your call)

Finding F4 (2026-07-26): seeding the twelve classes made a fresh install usable
as a **spell planner**. It did not make it a character builder.

`class_definitions` carries only spellcasting attributes. The whole 616-line
schema has ZERO occurrences of hit dice, hit points, armour class, skills, class
features, traits, speed, size, languages, or subclass level. Subclass coverage
is 2 of 12 classes — EK and AT, the two third-casters
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
