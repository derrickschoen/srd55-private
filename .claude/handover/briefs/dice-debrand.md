# DICE-DEBRAND — de-brand and generalize two non-SRD dice mechanics

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-dice (branch wt/dice off
main). PLAYWRIGHT_PORT=4780. Read .claude/handover/briefs/COMMON.md first.
NO migrations. No second-agent CLIs. Small, self-contained unit — do not
let it grow.

## Why

A licensing sweep found two non-SRD feat mechanics implemented in shipping
src/ui/screens/planner/dice.ts. Neither name appears in
docs/srd/full/srd-5.2.1.txt. Ruling D220: they are NOT deleted — they are
de-branded and generalized. Read D220 in .claude/decisions.md.

## Deliverables

1. "Elven Accuracy" -> "Triple Advantage". A rename of the user-facing
   label and the internal identifier. The mechanic (roll a third d20 when
   you have Advantage) is unchanged. Find EVERY occurrence — label,
   toggle key, contract member, tests, and any anchored string CI-8's
   mutation suite pins.

2. "Elemental Adept" -> a GENERIC die-upgrade mechanic, parameterized,
   not a named feat. Owner's specification verbatim: "Refactor elemental
   adept to a more generic upgrade [list of low die outcomes] to higher
   die outcomes (ex 1s and 2s become 3s on a weapon attack, or, 1s become
   2s on a d8 spell attack)".
   So the parameters are: which die outcomes are promoted, what they are
   promoted to, and which rolls it applies to (weapon attack damage vs
   spell damage, and which die size). The current behavior — damage-die
   1s become 2s, plus resistance bypass — must be EXPRESSIBLE in the new
   form as one configuration, and the new form must be STRICTLY MORE
   expressive. Decide where resistance bypass belongs: it is a separate
   concern from die promotion, so either keep it as its own independent
   toggle or state why it stays coupled.
   Existing dice-planner assertions convert as STRICT SUPERSETS — the old
   behavior stays pinned through the new parameterization, and new
   assertions cover at least the owner's two examples.

3. The composition/order documentation string in dice.ts (~line 1182)
   names "Elemental Adept" in its ordering sentence. Update it to the
   generic mechanic and keep the ordering itself correct — that sentence
   is a user-facing explanation of how effects compose, so it must still
   describe what actually happens.

## Constraints

- No test deletion; strict-superset replacement only.
- Forbidden paths as usual (no any/@ts-ignore/.skip, no config edits).
- COMPILE GATE IS `npm run build` (COMMON.md rule 2b), not app-config tsc.
- If a renamed string is a CI-8 mutation anchor, update the anchor in
  lockstep and say so.
- Grep the whole repo, not just dice.ts: docs, design notes, and the
  planner agent reference may name these mechanics too. Anything in
  docs/ or .claude/ that DISCUSSES the licensing history stays as-is —
  that is the record. Only rename live product strings and identifiers.

## Report
Terse. Per deliverable: file:line, what changed, the pins. A list of every
renamed occurrence. Targeted counts pasted, then `npm run build` exit
code. State explicitly whether the new die-upgrade form can express the
old behavior and name the test that proves it.
