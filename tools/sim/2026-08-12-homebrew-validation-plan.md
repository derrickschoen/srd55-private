# Homebrew validation simulation plan

## Goal

Add a separate three-round, fixed-65%-hit validation board for the approved
homebrew designs without changing the existing four-round SRD board or tuning
any design to its stated figures.

## Implementation

1. Add a `homebrew.ts` simulation module with validation levels 5/11/17,
   explicit normal-hit/critical/miss outcomes (60%/5%/35%), three-round combat
   state, and independently callable builds for:
   Long Grudge, Anchor Point, Patient Volley, Cutting Chorus, Vanward Conclave,
   Cold Open, Broken Tooth, Cutting Momentum, and Broken Tempo. Vanward and
   Cold Open share one Ambush Primitive helper, so these are nine wrappers for
   the specification's eight numbered entries.
2. Use these declared chassis/readings:
   - Long Grudge: two-attack greatsword paladin; only the bond rider is scored.
   - Anchor Point: greatsword fighter's steady Attack action, hence 2/3/3
     attacks at 5/11/17 (Action Surge is excluded from the per-round claim); the
     movement and reaction locks are tracked, but the dummy supplies no
     opportunity attack. Also measure the stated four-attack aside.
   - Patient Volley and Vanward: two-attack longbow ranger acting before the
     target in round 1. Patient eligibility after round 1 depends on an actual
     hit in the immediately previous turn.
   - Cutting Chorus: rapier bard. Level 5 has no level-6 Extra Attack; an
     additional level-6 measurement validates the headline. At 11/17 it has
     two attacks. Charisma gives 4/5/5 Inspiration uses, dice d8/d10/d12, with
     at most one use per turn at 5/6 and two at 11/17. Font's spell-slot
     conversion is excluded because the design gives no slot opportunity cost.
     Because the design does
     not define the foregone ally attack, report personal DPR and a clearly
     labeled net proxy in which the ally has the same 65%-hit, 1d8+3 attack.
   - Cold Open: dual-light-weapon rogue using Steady Aim on attack one and Vex
     on attack two; the primitive is eligible only on the first turn, even at
     level 17.
   - Broken Tooth: two natural-weapon attacks, d8/d10/d12 and Wisdom +3/+4/+5
     at 5/11/17, matching the arithmetic implicit in its stated totals. Report
     total form DPR; temp HP is tracked but is not damage.
   - Cutting Momentum: greatsword fighter, 2/3/3 attacks. Score its flat rider
     plus only the incremental weapon dice created when the first-hit critical
     expands later attacks' critical range to 18-20.
   - Broken Tempo: greatsword fighter, 2/3/3 attacks; PB-sized pool, one spend
     per turn, Second Wind after round 1, and one critical regain per combat.
3. Add a claimed-vs-measured report to `run.ts`, including 95% confidence
   intervals, the Anchor four-attack aside, the ranger stack's round-1 nova,
   and Cutting Chorus's level-6 headline/self-accuracy diagnostics.
4. Extend identity and deterministic coverage without removing or changing
   existing assertions. Add exact scripted-path tests for stateful mechanics
   and same-seed/totality tests for every new wrapper.
5. Update the simulator README with the separate board's contract and command.

## Verification

- Run the complete Vitest suite from `tools/sim`.
- Run TypeScript type checking.
- Run the board at a high enough trial count for one-decimal comparisons and
  paste its new rows in the handoff.
- Confirm the existing D233 Devotion-vs-Domination test remains byte-untouched.
- Review the implementation diff with the second agent, resolve legitimate
  findings, and rerun verification.

## Locally verified assumptions

- Existing `Level` is 3/6/11/17 and existing combats are four rounds, so a
  separate validation type/harness is necessary.
- `statistical.test.ts` contains the D233 Devotion-vs-Domination invariant; it
  need not be edited.
- The current board already accepts additive sections, and `run.test.ts`
  checks names/invariants rather than a complete golden transcript.
- Existing builds use injectable RNGs and return `{ dealt, prevented }`; the
  new module can retain that pure-function convention while exposing trace
  counters needed to test the non-damage locks and pools.
