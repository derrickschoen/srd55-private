# Wave 5 — production types batch (D267-D269) — REVISED after codex round 1

Repo: wt/simcore branch (tip `14aa97fc`). First production batch licensed by
D268/D269. Gates per increment: `npx tsc -p tsconfig.app.json --noEmit` AND
`npx tsc -p tsconfig.node.json --noEmit`, full `npx vitest run` quiet, then a
narrow Stryker run over touched files (patched runner). Codex reviews each
increment.

**Round-1 review disposition: all seven findings accepted** (none rejected).
The two-arm union replaces the three-arm; increment 2 is DEFERRED to its own
wave with the reconciliation spec below; the 992/997 deletion is dropped as
Q2-gated; increment 5's inventory moves inside the increment as a
symbol-based survey step. Two of my own "verified" assumptions were wrong
and are corrected below.

## Increment 1 — shared two-arm `DamageSignature` union (D269a)

```ts
export type DamageSignature =
  | { readonly kind: 'dice'; readonly damage_type: DamageType | null;
      readonly count: number; readonly die: number }
  | { readonly kind: 'flat'; readonly damage_type: DamageType | null;
      readonly amount: number };
```

- **Two arms, not three** (round-1 finding 1): the parser never emits an
  all-null signature — codex's direct probe shows "2d6 damage of a chosen
  type" → dice with `damage_type: null` (the uncertainty the data really
  has), and "2d6 + 3 Fire damage" → TWO signatures. My earlier reachability
  read of reader:404-412 was wrong; part of this increment is proving the
  ternary's null arm dead and deleting it.
- **No numeric brands in this increment** (finding 1b): `count`/`die`/
  `amount` stay plain numbers so the change is representation-only — a
  `0d6`/`2d7` input behaves exactly as today (matches nothing in the slot
  matcher). Branding with `PositiveDiceCount`/`DieSize` would be a runtime
  behavior change and gets its own decision later.
- `SourceDamageOccurrence` = `DamageSignature & { arm, timing, ... }`;
  coverage.ts `SuppliedPool` and `requiredAmount(): number | null` collapse
  into exhaustive switches with `never` guards.
- Rename scope (round-2 corrected AGAIN): reader ~9 sites, coverage ~15
  sites, PLUS `dice_count`/`die_size`/`flat_modifier` occur 77 times across
  12 simulation test files (fixtures and expectations) — those migrations
  are explicitly in increment 1's scope, including the direct old-shape
  construction in coverage-clause-binding-and-unavailable-near-misses.test.ts.
- Tests: parser cases for dice-known-type / dice-null-type / flat /
  dice-plus-flat-two-signatures; coverage matcher accept+reject per arm;
  a temporary extra-variant compile probe proving consumers switch
  exhaustively (tsc fails, then remove); the Stryker gate on touched
  ranges is: NO new Survived/NoCoverage/Timeout outcomes and non-regressing
  mutation score (round-2 finding 3: raw mutant count is diagnostic only —
  it can shrink while adding survivors).
- Makes the three wave-3 UPHELD-FRAGILE equivalence proofs permanent.

## Increment 2 — DEFERRED: save-DC formula unification spec (D268)

Not implemented this wave (round-1 findings 2-5: end-to-end or not at all,
per D241). What the eventual wave implements, agreed now so increment 1
doesn't paint over it:

- **Three distinct concepts stay distinct**:
  (a) source-side fixed-DC OBSERVATION — the reader's existing status union,
  with its inner null made explicit: `available{printed: {kind:'printed';
  dc} | {kind:'not_printed'}} | unavailable{reason}` — three meanings
  preserved, no null reinterpretation (Contact Other Plane's printed 15
  stays representable);
  (b) character-derived FORMULA — D268's 8 + PB + spellcasting-ability
  modifier with resolvable parts. Owner: `src/rules/save-dc.ts`'s existing
  `SaveDC` class (already implements the formula) — extend IT with
  pending/resolved parts rather than minting a third representation;
  (c) resolved numeric `SaveDifficultyClass` brand in simulation — the
  output of resolving (b) or reading a printed (a).
- Integration boundary is `spell-access-builder.ts:738-762` (which already
  computes ability modifier + numeric DC), NOT the reader — the reader's
  `ability` is the TARGET's save ability, not the caster's spellcasting
  ability (finding 3); the plan must prevent that conflation by type —
  BRANDED types or tagged wrappers (round-2 finding 1: bare aliases are
  structurally identical and freely assignable, so they prevent nothing).
- Must reconcile with D257/D259 fixed-DC authority before implementation.
- Validation ownership decided then: `SaveDC` requires positive,
  `saveDifficultyClass` only safe-integer — unify deliberately.

## Increment 3 — one `sameSourceRef` (unchanged; review: sound)

Export once from contracts.ts, consume in coverage.ts. Both wave-4 near-miss
suites must pass unchanged, and the narrow Stryker run must show both
call-paths selecting the shared implementation. Narrowing re-check arms stay
(documented TypeScript narrowing devices). Also resolves the contracts-copy
weapon/character NoCoverage arms.

## Increment 4 — proven-safe deletions and one hazard guard

- contracts.ts:359 redundant `startsWith('\\')` clause: delete (subsumption
  proven by lane D and re-verified in review; the near-miss tests stay).
- `findGutter` all-blank infinite loop — the SIMULATION copy at
  spell-source-reader.ts:216 specifically: add a loud throw. The near-copy
  at src/rules/origins-srd.ts:413 stays unchanged this wave — its sole
  caller blank-slice-guards at :490, and the two throw different exception
  types so consolidation is not mechanical (recorded per round-2 finding 4). Its negative
  control runs the mutated form in a SUBPROCESS with a kill timeout (an
  in-process vitest timeout cannot interrupt a synchronous loop) — pattern
  per round-1 testing-gaps table. Plus an all-blank public-entry test.
- coverage.ts:992-1003 deletion: DROPPED from this wave — Q2-gated
  (round-1 finding 7).

## Increment 5 — exhaustive-switch pass, symbol-based (D269a)

Step 1 of the increment is the inventory itself (the plan's earlier line
ranges were stale — several were already switches): sweep for if/else
chains and nested ternaries whose scrutinee is a closed-union discriminant
(`sg run` structural patterns + grep for `=== '` chains over known unions),
emit a symbol list with file:symbol, and implement conversions from that
list. Per conversion: extra-variant tsc probe proves exhaustiveness;
the same no-new-undetected + non-regressing-score gate applies (wave-1 lane-C lesson:
switches over erased types can ADD runtime case-label mutants — where no
runtime branch is needed, prefer the pure-type constraint).

## Out of scope

Q1/Q2 rulings; clause-ID codegen; increment-2 implementation; Kennel and
stranger specs; upstream #6150; deploy chain.
