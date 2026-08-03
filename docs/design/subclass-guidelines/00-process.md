Purpose: direct a design session from an original fantasy to a reviewable, schedule-correct subclass without consulting non-open material.

# Clean-room subclass design process

## Clean-room statement

These guidelines carry distilled, independently expressed design principles. The only corpus that may be quoted is SRD 5.2.1, licensed CC-BY-4.0 and stored in `docs/srd/`. No third-party wording, product, or Product Identity is reproduced or referenced here. A design produced with these guidelines must cite only these six files and the SRD; it must not consult, identify, imitate, or cite any other subclass, product, commentary, or source.

SRD class, subclass, spell, and feature names may be used when comparison is necessary. Prefer describing a mechanical role over copying SRD prose. If SRD wording is quoted, keep the quotation short, attach a line anchor into `docs/srd/full/srd-5.2.1.txt`, and preserve the attribution required by `docs/srd/ATTRIBUTION.md`.

## Reading order

1. Read this file to establish the source boundary and workflow.
2. Read `01-power-budget.md` before choosing feature sizes. It gives the host class's actual subclass schedule, dependence, permitted power shape, and numerical anchors.
3. Read `02-cadence-and-anatomy.md` to see what the twelve SRD subclasses actually contain: feature counts, action costs, resource patterns, spell grants, density, and capstone forms.
4. Read `03-fun-and-memorability.md` before drafting rules. It turns the fantasy into a repeatable play loop and protects table speed, pillar presence, and memorable decisions.
5. Read `04-failure-taxonomy.md` after the first draft. It diagnoses sixteen recurring ways a plausible design fails in play.
6. Run every item in `05-design-checklist.md`. A failed item changes the draft or creates an explicit playtest risk; it is not silently waived.

## Which file answers which question?

| Question | Primary answer |
|---|---|
| At what levels may this class receive subclass features? | `01-power-budget.md` — **Measured schedule** |
| How much work must this subclass do for its class? | `01-power-budget.md` — **Class dependence and power shape** |
| How large may a rider, bonus, use pool, or action benefit be? | `01-power-budget.md` — **Budget heuristics** |
| What structural baseline does the open corpus establish? | `02-cadence-and-anatomy.md` |
| What will make the option enjoyable and recognizable in play? | `03-fun-and-memorability.md` |
| Why does a feature that looks acceptable fail at a table? | `04-failure-taxonomy.md` |
| Is the whole draft ready for review or playtest? | `05-design-checklist.md` |

## Design workflow

### 1. State the fantasy

Write one sentence in this form: **A [host class] who [does a visible thing repeatedly] in order to [change a scene in a distinctive way].**

Then write three observable moments: one during combat, one during exploration, and one during social interaction. These are design targets, not feature names. Reject a concept that is only an adjective, costume, damage type, creature target, or setting reference. The fantasy needs a verb that can become play.

Check that the fantasy is not already fully served by the host class or its SRD subclass. Shared ingredients are fine; the promised play loop must be different. Use only SRD comparisons.

### 2. Look up schedule and budget

From `01-power-budget.md`, copy into the draft header:

- host class and exact subclass levels;
- dependence rating and the kind of power the subclass should add;
- the class's existing customization engine and signature resource;
- the host's crowded action types;
- expected damage share and complexity tolerance.

Map the schedule slots to tiers, not to a universal sequence. The first slot establishes the loop. Middle slots deepen or broaden it. Late slots change the kind of capability or remove friction from the established loop. Never invent an extra subclass level to make the concept fit.

### 3. Draft the level-3 loop

Write the shortest feature that lets the player perform the fantasy immediately. Prefer a multiplier or new use of the host class's own engine over a portable standalone package. Specify:

- what the player decides;
- the one obvious trigger or action;
- the resource and recovery cadence, if any;
- what changes in the fiction;
- how it scales with levels in the host class;
- what an outsider gains from taking only levels 3–5.

Level 3 may contain a small supporting feature or honest ribbon, as the SRD often does, but the bundle must remain teachable in one sitting. It sets identity; it must not contain the entire career's power.

### 4. Draft later slots as a progression

For each remaining schedule slot, write its job before its mechanics:

| Slot role | Required question |
|---|---|
| First | Can I perform the defining loop now? |
| Early-middle | Does the loop become more reliable, flexible, or expressive? |
| Late-middle | Do I gain defense, utility, mobility, or a new scene-level verb appropriate to this tier? |
| Final | Does the established identity reach a decisive, simple payoff without a new subsystem? |

At least one feature should give the subclass player-initiated presence outside combat. A ribbon can accompany a substantial feature; it cannot occupy a whole schedule slot by itself. Later features should usually attach to the first engine rather than introduce unrelated counters, marks, menus, or currencies.

### 5. Write rules in system language

Use the vocabulary, action types, rest terms, ranges, durations, and timing shapes found in the SRD. State every action cost, trigger, limit, duration, target, save, and scaling point. Avoid setting nouns and unexplained bespoke terms. A reader should not need designer intent to adjudicate the text.

Keep one tracked subclass quantity at most. Make repeated triggers single-condition and visible to the player. Put choices that shape a build at acquisition or level-up; reserve in-turn choices for the defining loop.

### 6. Audit and revise

Run `04-failure-taxonomy.md`, then `05-design-checklist.md`. Test the whole subclass on the parent chassis, with ordinary equipment and party support, at every acquisition tier. Read levels 3–5 as a multiclass outsider. Say a representative turn aloud. Stress the resource model on both a one-encounter day and a day without short rests.

For every failed check, adjust the least identity-bearing dial first: frequency, action cost, range, duration, target count, or magnitude. Preserve the dial that makes the fantasy recognizable unless that dial is itself the failure.

### 7. Produce the review packet

The draft handed to a reviewer contains:

1. fantasy sentence and three scene moments;
2. host schedule and budget posture copied from `01-power-budget.md`;
3. full feature text in schedule order;
4. one-line budget explanation per feature;
5. action-economy and tracked-state tallies;
6. checklist results, including every provisional or untested item;
7. citations only to these files and anchored SRD lines.

Do not claim balance from prose review alone. The first review decides whether the draft is coherent enough to playtest; usage and table behavior decide whether it works.
