# OFFER-ENV-HELP-01 plan r2 — astra review (HIGH, resume 01a0a812…, exit 0)

Verified **SHA-256 `bfcc40c804572704738423054c7d6bf78bf7c4c24cad3b26cc3e376f033be461`**, **600 lines**, and HEAD **`cc8b057f7cdcc2a0df38725a7adfa91d2d9e6e81`**. I read D617.37. Both baseline TypeScript checks exited **0** again; final `git status --short` was empty.

The nine original findings are **CLOSED in their original scope**. Three new substantive findings remain: **2 P1, 1 P2**, plus one P3 correction.

All plan references below refer to [2026-09-15-offer-environment-help-only.md](/home/vagrant/PhpstormProjects/dnd-wt-offer-env-plan/.tmp-plans/2026-09-15-offer-environment-help-only.md).

**Round-1 dispositions**

| Finding | Status | Verification |
|---|---|---|
| **PLAN-F1** | **CLOSED** | Plan **:325–458** includes all original diagnostic files and missing callers. The repeated three-union compiler overlay reproduced **41 app diagnostics / 12 files**, **56 node diagnostics / 19 files**, with **0 outside-manifest files**. Adding the new DM-only event produced **42/13** and **57/20**, also **0 outside-manifest files**. |
| **PLAN-F2** | **CLOSED** | Plan **:87–97** preserves provenance-first refusal and names `validateEngineOfferFamilyPolicy` as the pure policy-validation seam. This matches HEAD’s digest guard at `intent-resolver.ts:537–544`. The seam test can distinguish removal of its veto without registering forged provenance. Its execution control establishes mechanical legality; it is not evidence that a disabled-environment Help option can pass the public provenance guard. |
| **PLAN-F3** | **CLOSED** | Plan **:272–282** now replaces both identified constant-state loops with ordered consumption and assigns each projection site an independent distribution/vector test. Reusing the original state changes the second component’s projected mode, so these tests can distinguish the named mutations. A third projection path is newly identified in **F11** below. |
| **PLAN-F4** | **CLOSED** | Plan **:226–268** supplies units, formulas, empty-set behavior, competitor/default uncertainty, exact effect-ID removal, sentinel-only catching, and explicit prefixes. Independent arithmetic returned **`1/4`, `0`, `-1/4`**, and empty cost **0**. A source-extracted ordering probe made **64 direct/direct comparisons with 0 differences** after prepending `[0,0]`. New integration/support-boundary problems are **F10/F12** below. |
| **PLAN-F5** | **CLOSED** | Plan **:460–475, :556–568** removes the promotion runner/evaluator changes, makes Slice 3 checker-only, and blocks default enablement pending `OFFER-ENV-HELP-PROMO`. This implements D617.37’s accepted disposition without retaining the old thresholds as mandatory requirements. |
| **PLAN-F6** | **CLOSED** | Plan **:284–305** adds the requested attack, movement, condition, summon, replay, and persistence matrix. The helper-death statement agrees with HEAD: dead initiative entries are skipped, and duration decreases only at a matching boundary. The matrix now checks observable roll modes, not merely effect removal. One overstated coverage sentence is **F13** below. |
| **PLAN-F7** | **CLOSED** | Plan **:115–127** replaces the leaking generic event with required `visibility:'dm_only'`, uses neutral resource purpose `Action`, and tests actual player recent events. HEAD’s `PlayerVisibleEncounterEvent` excludes that visibility tag, and `playerEvents` discards it. The event overlay identifies only the expected additional exhaustive consumer, `visibility.ts`, which is now manifested. |
| **PLAN-F8** | **CLOSED** | Plan **:422–427, :550–552** adds an enabled-Help round, requires the chooser to submit the engine default, requires Help selection/resolution, and records raw disabled/enabled walls with the **25%** threshold. HEAD’s adapter and `fixtureStates` seam support this without a model call. The existing legacy regression remains separate. |
| **PLAN-F9** | **CLOSED** | I ran the receipt verbatim: **`60 paths; 60 unique; 60 exist`**. |

Commands used for these checks included:

```bash
sha256sum .tmp-plans/2026-09-15-offer-environment-help-only.md
wc -l .tmp-plans/2026-09-15-offer-environment-help-only.md
git rev-parse HEAD
rg -n -A 12 '^## D617\.37' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
rg -n 'engineActorOptions\(|hiddenOptionRecords\(|generateEngineOfferEnvelopes\(|standardOfferGenerator\.generate\(' src tools tests --glob '*.ts'
sed -n '70,104p;532,576p;667,727p' src/vtt/intent-resolver.ts
sed -n '11461,11472p;5711,5727p;6160,6168p' src/combat/encounter.ts
sed -n '332,430p;470,502p' src/combat/visibility.ts
sed -n '254,271p' src/combat/visibility.ts
sed -n '630,720p' tests/unit/tools/ai-dm-arena.test.ts
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

The compiler probes used `node --input-type=module` with an in-memory TypeScript `CompilerHost`; they wrote no files. These are plan/source checks, not implementation mutant-kill receipts.

**PLAN-F10 — P1 — The revision omits Help’s required candidacy integration**

Plan locations: **:249–268, :408–416**.

The formulas and prefix are now explicit, but the revised plan never specifies how Help enters the candidate set. Its old-`other` ranking tail does not solve this: HEAD removes non-offense/non-approach options before dominance and tuple comparison whenever offense or approach exists.

Evidence:

```bash
sed -n '201,211p;269,300p' src/vtt/intel/opportunity-cost.ts
```

Relevant output:

```ts
const offensiveOrApproach = options.filter((option) =>
  option.kind === 'offense' || option.kind === 'approach');
const candidates = offensiveOrApproach.length > 0
  ? offensiveOrApproach
  : options.filter((option) => option.kind === 'dodge');
```

I ran the HEAD selection functions extracted through the TypeScript AST, using controlled option evaluations, the actual contracts dominance comparator, and the proposed prefix. Output:

```text
positive Help delta: 0.25
common dominance: incomparable
default with HEAD candidacy and proposed prefix: direct
direct/direct comparisons: 64 differences: 0
```

The positive Help candidate never reaches the comparison where its prefix matters.

The requirement remains binding:

```bash
sed -n '16775,16781p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
```

Output includes:

```text
Any added ranking term must affect candidacy and dominance, not sit as
a late tuple tiebreaker.
```

**Fix:** Specify Help’s opportunity kind/outcome family and the exact candidacy rule, including resolved-positive, zero/negative, and unresolved Help. Preserve the existing direct-only candidate behavior. Require a test where a positive Help option competes with a legal offensive option and becomes `defaultOption`, plus a mutant restoring the old candidate filter. Merely appearing in `report.options` is insufficient.

**PLAN-F11 — P1 — Allocation projection still reuses Help across attacks and actors**

Plan locations: **:107–109, :270–282, :329–335, :490**.

The two repaired loops are not the complete tactical projection graph. `compareTacticalAllocations` independently constructs attack inputs from unchanged effect state. Once the shared query predicate recognizes Help, this path will credit it repeatedly.

Evidence:

```bash
rg -n 'engineTacticalAttackInput\(' src --glob '*.ts'
sed -n '1765,1846p' src/vtt/engine-query-port.ts
```

At `:1782–1793`, each actor’s `attackState` starts from the original `state`, and every action ID receives that same state:

```ts
const attackState = resolution.valid ? {
  ...state,
  tokens: state.tokens.map(/* actor movement */),
} : state;
for (const actionId of actionIds) {
  const attackInput = engineTacticalAttackInput(
    attackState, choice.actorId, targetId, actionId, modifiers,
  );
```

A read-only source-extracted control-flow probe intercepted the tactical-query inputs for one two-component option:

```text
[{"actionId":"a","effectIds":["help"]},
 {"actionId":"b","effectIds":["help"]}]
```

This demonstrates unchanged effect input, not a simulated implementation of Help.

The path is authoritative for team scoring:

```bash
sed -n '235,275p;318,477p' src/vtt/intel/team-scorer.ts
```

`evaluateTeamPlan` calls `queries.compareAllocations`, then uses its kill probability in the team vectors. Neither of the two new projection tests exercises this loop.

Existing allocation tests are outside the revised manifest:

```bash
rg -n 'compareTacticalAllocations|compareAllocations' tests/unit/vtt --glob '*.ts'
```

Output:

```text
tests/unit/vtt/tactical-evaluator-r02.test.ts:226
tests/unit/vtt/tactical-evaluator-r02.test.ts:291
```

**Fix:** Address this third projection explicitly. Either thread Help consumption through its ordered inputs, including across allied actors, or return a named unresolved result for unsupported Help-dependent allocations. Also define the disposition of an allocation containing a Help declaration; it must not silently treat that declaration as an inert option.

Add allocation coverage and its suite to the manifest, with a distinct reuse mutant. This requires no new scheduler or general joint-planning system.

**PLAN-F12 — P2 — A resolved default without a qualifying attack is now incorrectly totalized to zero**

Plan locations: **:223–247, :265–268**.

The new checks cover a missing default and an unresolved default. They do not cover a **resolved default that does not consume Help**.

For example, a legal Dodge default is resolved with a zero ledger. Evaluating it with and without Help produces `benefit = 0`, even though the Help remains available and its later consumption is outside the supported forecast. An attack against another target has the same issue. The previous explicit “no first qualifying weapon attack → unresolved” condition has disappeared.

Evidence:

```bash
sed -n '600,618p;1276,1283p' src/vtt/intel/option-outcome.ts
```

Output establishes:

```ts
case 'dodge':
case 'disengage':
case 'end_turn':
case 'hide': return { kind: 'known_no_effect' };
```

and:

```ts
case 'known_no_effect': return {
  status: 'resolved',
  // ...
  ledger: emptyLedger(),
};
```

The revised formula uses the whole default’s ledger without an eligibility prerequisite. The new plan also says it drops later attacks and speculative spell forecasting, but does not define which resolved defaults satisfy that boundary.

**Fix:** Restore an explicit supported-consumer gate before calculating benefit. Require the supported first qualifying weapon attack against the Help target; defaults without that consumer, or with unsupported preceding consumption, must return a named unresolved reason. Clarify whether valuation uses that component’s ledger or the whole ordered option’s marginal ledger.

Add controls for a resolved Dodge default, an attack on a different target, and an unsupported spell-attack default. A mutation replacing these unresolved results with zero must fail. Do not expand the forecast to later actors to resolve them.

**PLAN-F13 — P3 — The Unconscious test does not exercise Slow**

Plan location: **:301**.

The matrix’s Unconscious test is useful, but the accompanying claim that it exercises both Incapacitated and Slow rules is false.

Evidence:

```bash
sed -n '3842,3905p' src/combat/encounter.ts
```

`spendAction` calls `assertCanUseActions` before reaching either Slow check.

A source-extracted probe, with and without the Slow refusal guard, returned:

```text
{"slowGuardRemoved":false,"result":"Combatant helper is Incapacitated.","slowCalls":0}
{"slowGuardRemoved":true,"result":"Combatant helper is Incapacitated.","slowCalls":0}
```

**Fix:** Describe this row as Incapacitated coverage only. If claiming Help-specific Slow coverage, add a separate conscious, Slow-affected helper scenario—for example, successful Help must leave the correct Action/Bonus Action availability. Do not count the Unconscious row as that proof.

The promotion follow-up remains appropriately separated, and none of these fixes requires restoring Ready or introducing a general future-turn scheduler.

PLAN VERDICT: REJECT (2 P1, 1 P2)

REVIEW DONE
