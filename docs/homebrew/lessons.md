# What we've learned making homebrew

Operational lessons from running the homebrew pipeline through its first
eight documents (the monk catalog and bake-off, four monk drafts, the oath,
the ranger, the rogue — D169 through D196). The design *physics* live in
`subclass-guidelines/`; this file is about how the process itself behaves.
It deliberately does not repeat the guidelines — where a lesson has a home
there, this file points at it.

## 1. The clean room is a procedure, not a vibe

What worked, in order:

- **Isolated researchers, then retirement.** The six guideline files were
  written by agents that saw only each other's output and SRD 5.2.1, then
  were retired. The corpus cites only itself and anchored SRD lines.
- **A mechanical hygiene audit before commit**: zero 7-gram overlap with the
  SRD corpus, every proper name SRD-verified. "Reads clean" is not a
  verdict; the scan is.
- **Designs may cite only the six files and anchored SRD lines.** This rule
  has teeth precisely when it hurts — starting the monk, nothing was citable
  for Eldritch Knight's engine, and the constraint forced a better original
  design instead of a file-off-by-one copy.
- **Non-SRD works appear only as distance markers.** The pitch catalog names
  an upcoming official subclass and a community homebrew *solely* to define
  what to stay away from. Naming-for-avoidance is safe; reading-for-ideas is
  how wording leaks in.
- **Open-content ancestry is concept-only.** The Waking Will monk descends
  from the 3.5 SRD Psionic Fist: one disclosure line, no wording, no
  subsystem mechanics. The disclosure *is* the attribution — a review round
  once deleted a file-header attribution comment as "duplication" and it had
  to be restored; the header on a derived work is the license doing its job.
- **SRD-absent material is excluded, not paraphrased.** Thorn Whip and
  Grasping Vine are not in SRD 5.2.1, so the Hundred Knots list simply does
  not contain them. The temptation is to write a near-copy under a new name;
  the rule is the spell list shrinks instead.

## 2. The bake-off pattern earns its cost

The monk sequence — wide catalog → owner picks finalists → parallel full
drafts on a **shared frozen engine** → side-by-side comparison packet — beat
single-shot drafting everywhere it was tried:

- Twenty pitches cost little each and made the owner's taste visible early,
  before any full draft existed.
- Freezing the shared engine (Wisdom third-caster chassis, Focus-spend
  lever) before the parallel drafts meant the three finalists differ only
  where they *should* differ, so the comparison packet compares identities,
  not chassis noise.
- The packet's comparator rows carry **no recommendation**. The owner
  chooses; the packet's job is to make the choice cheap. (D190 picked three,
  and D193 added a fourth from outside the finalists — the catalog kept its
  value after the bake-off.)

## 3. Owner-frozen engines: build around, never rebalance silently

D192 specified the ranger's engine verbatim (Hunter's Mark loses
Concentration, free retarget at 7+). The draft's correct response was to
flank the hot feature with deliberately subdued neighbors and label it
**"known high-side outlier, owner-frozen hot"** — not to quietly nerf the
thing the owner asked for. A frozen engine is an input, and disagreement
with an input is expressed as a labeled risk plus a requested test, never
as an unrequested edit.

## 4. The wording arc: rules text states the rule once

The rogue doc went through three rulings (D194 → D195 → D196) and the
direction of every cut was the same. What the owner kept removing:

- **Derived arithmetic.** The crit-interaction paragraph ("you roll the
  doubled dice twice, four times the table number") was deleted — the
  general critical-hit rule already produces that result. Worked examples
  live in design notes; the feature text states the rule once.
- **Conditional sub-clauses.** The subtract-before-doubling Cunning Strike
  ordering died for the simpler "the pool is doubled, period," accepting a
  slightly more generous result as the price of a sentence a player can
  hold.
- **Hidden costs.** The once-per-round limit had to move *into* the feature
  text next to the doubling: "the reader must see the cost where they read
  the benefit."

And the replacement for a fiddly level-13 feature was a broad passive
(every skill + 2 Expertise) — the Champion register. For the simple-power
lane, a wide passive beats a clever conditional every time it competes.
This matches the guidelines' word-count finding (Champion: six features,
199 words) but the lesson here is about the *editing dynamic*: drafts
overexplain by default, and the owner's cuts are predictable enough that
drafts should pre-empt them.

## 5. Honesty markers are what make review cheap

Three conventions did the most work per word:

- **OWNER-APPROVAL tags on every unruled named feature.** A ruling session
  can walk the tags instead of re-reading the doc.
- **Three-valued verdicts** ("ready for playtest / ready for design review
  only / not ready") with every doc so far shipping at the middle value —
  nothing has pretended to be playtested.
- **Ambers stay amber.** "Within budget on paper, Haste amber" survives into
  the shipped doc. An unknown with an owner beats a silent "probably fine"
  (the pre-flight's own rule, applied at doc granularity).

## 6. The guidelines argue back — let them

The dependence table rejected "monk needs a power infusion" (both panel
agents caught the supervisor's error against file 01). The free-rider
baseline (76% passives) steered deliveries onto existing strikes. The
failure taxonomy annotated every pitch with its most likely death (F3 dip
bait, F6 action congestion, F7 interaction math). When a draft and the
guidelines disagree, the draft is wrong until it shows a measurement —
that asymmetry is the entire value of having measured the SRD first.

## 7. Rulings are the interface between sessions

Which subclasses exist, under what license, and any frozen engine text are
**rulings** (D-numbers in `.claude/decisions.md`); everything else in a doc
is a proposal. Two practical consequences:

- A dispatch citing a ruling must run in a lane that *contains* it — codex
  once correctly refused to work from a brief's paraphrase of D196 because
  the worktree didn't have the ruling on record. Merge first, then cite.
- Subclass sessions record new owner rulings in `rulings.md` here (newest
  first), and the supervision loop folds them into the decisions file. One
  writer per append-only file.
