# OFFER-ENV-HELP-01 plan r1 — astra review (HIGH, fresh session 01a0a812-912d-7fb2-b6f1-3caf9053e35b, exit 0)

Verified the requested artifact:

```text
sha256sum .tmp-plans/2026-09-15-offer-environment-help-only.md
e6c1612f51755ed3b0d912718f5412b3fb56c18c2eb7b78f24beebf645a88b93

wc -l .tmp-plans/2026-09-15-offer-environment-help-only.md
520

git rev-parse HEAD
cc8b057f7cdcc2a0df38725a7adfa91d2d9e6e81
```

Both `npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.node.json --noEmit` exited **0**. The frozen contracts hash matches. Final `git status --short` was empty. No files were edited, no agents invoked, and no forbidden tests or directories accessed.

All plan references below refer to [2026-09-15-offer-environment-help-only.md](/home/vagrant/PhpstormProjects/dnd-wt-offer-env-plan/.tmp-plans/2026-09-15-offer-environment-help-only.md).

**PLAN-F1 — P1 — The manifests are not compile-complete**

Plan locations: **:138, :166–168, :259–330**.

The required-environment migration misses **three existing callers**. The proposed command/resolution unions additionally break **five files outside the manifests**.

Evidence:

```text
rg -n 'engineActorOptions\(' src tools tests
```

Every existing call requiring migration is:

| Location | Covered? |
|---|---|
| `src/vtt/intent-resolver.ts:88` | Yes |
| `src/vtt/turn-option-registry.ts:229` | Yes |
| `tests/unit/vtt/composite-turn-proposals.test.ts:130` | Yes |
| `tests/unit/vtt/engine-context-integrations.test.ts:195` | Yes |
| `tests/unit/vtt/offer-environment.test.ts:348` | Yes |
| `tests/unit/vtt/option-modeling.test.ts:46,123` | Yes |
| `tests/unit/vtt/room-roster-preflight.test.ts:215` | **No** |
| `tests/unit/vtt/d466-b4-spell-payloads.test.ts:226` | **No** |
| `tests/unit/vtt/encounter-board-projection.test.ts:304` | **No** |

The other required-context callers are covered:

```text
rg -n 'hiddenOptionRecords\(' src tools tests
tools/ai-dm-conversation.ts:4377

rg -n 'generateEngineOfferEnvelopes\(' src tools tests
src/vtt/turn-option-registry.ts:193

rg -n 'standardOfferGenerator\.generate\(' src tools tests
tests/unit/vtt/standard-offer-generator.test.ts:207,239
```

I also ran a read-only `node --input-type=module` TypeScript compiler-host probe, overlaying only the proposed Help command, main-use variant, and resolved-use variant **in memory**. It produced **41 app diagnostics / 56 node diagnostics**, including these outside-manifest failures:

```text
src/vtt/encounter-app.ts:246                     TS2366
src/vtt/plan-materiality.ts:111                  4 × TS2339
tests/unit/vtt/footprint-increment-four.test.ts:108  TS2322
tests/unit/vtt/mixed-kind-multiattack.test.ts:115    TS2339
tests/unit/vtt/unicorns-blessing-consistency.test.ts:124–126,211
                                                4 × TS2339
```

Source checks independently explain them:

```text
sed -n '245,339p' src/vtt/encounter-app.ts
```

`actionLabel(EncounterCommand): string` exhaustively switches over the old commands.

```text
sed -n '80,126p' src/vtt/plan-materiality.ts
```

`proposalRecord` reads `use.spellId` and `use.actionId` without narrowing.

```text
sed -n '88,113p' tests/unit/vtt/footprint-increment-four.test.ts
```

The pending-placement command inventory has an exhaustive `never` assertion. Adding Help necessarily changes it.

**Fix:** Add all **eight demonstrated missing files**. Put `encounter-app.ts` and the pending-placement inventory test in Slice 1; migrate the three raw callers and resolved-use consumers in Slice 2. Preserve existing assertions through explicit narrowing. Recheck the complete graph after B16/B19; a future dispatch audit does not repair an already-known manifest defect.

---

**PLAN-F2 — P1 — Policy-before-provenance breaks the accepted mismatch contract**

Plan location: **:93–96**.

Evidence:

```text
sed -n '96,121p' .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
```

The accepted tranche requires:

```text
Resolve refuses when provenance is absent or differs from the supplied environment digest.
Use OFFER_ENVIRONMENT_MISMATCH for both cases...
```

```text
sed -n '532,578p' src/vtt/intent-resolver.ts
```

Current execution checks the `WeakMap` digest first and returns `OFFER_ENVIRONMENT_MISMATCH` for absent or unequal provenance.

The proposed ordering changes the result for:

- an enabled-environment Help option passed to a disabled environment;
- an unregistered or cloned syntactic Help option passed to a disabled environment.

Both would return `HELP_ATTACK_DISABLED`. This remains fail-closed, but it **does weaken the explicitly preserved guarantee**. “Other wrong-environment options” is an exception, not preservation.

There is also a proof problem: removing the new policy guard can merely expose the existing provenance refusal. A changed error-code assertion proves precedence; it does not prove that disabled policy otherwise permits execution.

**Fix:** Preserve provenance-first behavior at `resolveEngineActorOption`. Test the disabled-policy refusal at an explicitly identified policy-validation seam, while public wrong-environment calls retain `OFFER_ENVIRONMENT_MISMATCH`. If the public Help exception is required, the plan must explicitly amend the tranche contract and its callers/tests; it cannot claim both contracts simultaneously. Do not add a provenance-registration escape hatch to manufacture the test.

---

**PLAN-F3 — P1 — Dropping sequence projection permits repeated Help credit in ordinary ranking**

Plan locations: **:102–105, :233–247, :394, :400**.

Evidence:

```text
sed -n '926,997p' src/vtt/intel/option-outcome.ts
```

`attackOutcome` computes `afterMovement` once, then evaluates every resolved attack against that same state:

```ts
for (const use of attackUses) {
  const input = engineTacticalAttackInput(afterMovement, option.actorId, targetId, use.actionId);
  // ...
}
```

```text
cat src/vtt/intel/opportunity-cost.ts
```

At `:170–172`, the opportunity vector similarly maps every attack through `queries.tacticalAttack(movedState, ...)` using unchanged state.

Once Help’s shared predicate recognizes the effect, these loops will recognize it on **every qualifying component**. Correct real-reducer consumption does not fix either projection.

Restricting the helper’s forecast to the first weapon attack also does not fix an ally’s ordinary multiattack valuation after Help has actually been applied.

The named reducer test `first qualifying allied attack consumes Help on hit or miss` cannot, by itself, kill a mutant confined to either ranking loop.

**Fix:** Retain minimal ordered consumption in both production projection paths. It can live in existing files; a new scheduler or sequence module is unnecessary. Add independently calculated two-component outcome/vector tests showing Help on component 1 only, plus a separate projection-reuse mutant. Keep the real-roll consumption test as a distinct proof.

---

**PLAN-F4 — P2 — The valuation and ordering contract is not totalized**

Plan locations: **:229–255**.

Evidence:

```text
cat src/vtt/intel/opportunity-cost.ts
sed -n '675,793p;926,997p' src/vtt/intel/option-outcome.ts
```

HEAD has:

- an expected-damage vector expressed in milli-damage;
- a cross-family vector expressed in `netActionEquivalents`;
- a six-coordinate legacy ranking tuple;
- exceptions when no default option exists.

The plan specifies “existing tactical expected outcome,” “best … productive Action value,” and “finite tagged prefix” without fixing:

1. the common unit and exact formula for benefit minus cost;
2. the definition of a productive competitor, including composed Bonus Actions;
3. the maximum over an empty competitor set;
4. unresolved-default and no-legal-default behavior;
5. the actual prefix for direct, resolved Help, and unresolved Help;
6. whether setup delta also enters `netActionEquivalents`, potentially counting cost twice;
7. how the counterfactual removes only the newly declared Help effect while preserving other effects;
8. whether only the RNG sentinel is caught, rather than arbitrary reducer errors.

These omissions permit materially different implementations. “Reject non-finite coordinates” detects an empty `Math.max` failure after the fact; it does not specify its intended result.

**Fix:** Freeze explicit formulas, units, status/reason variants, empty-set behavior, and prefix coordinates. Add hand-derived positive/zero/negative examples and unresolved controls. Prove direct/direct ordering with Help **enabled and disabled**, including unresolved offense versus resolved approach, equal tuples, and the option-ID tie-break. Keep `direct_only` filtering before evaluation to prevent recursion.

---

**PLAN-F5 — P2 — Slice 3 is a new runner design, not a specified profile extension**

Plan locations: **:350–385, :449–451, :473–474**.

Evidence:

```text
sed -n '712,725p' tools/ai-dm-arena.ts
sed -n '900,935p' tools/ai-dm-arena.ts
sed -n '150,174p;814,868p;935,957p' tools/ai-dm-arena.ts
cat src/vtt/heldout-evaluation.ts
```

At HEAD:

- `ArenaRunOptions` extends conversation-run options.
- `runArena` invokes `runConversation` with `rounds: 1` for each independent repetition.
- `ArenaRow` carries conversation evidence.
- `HeldoutCase` describes a case.
- `heldoutEncounterOutcome` scores `monster_win | party_win | round_cap`.
- `heldoutSideHp` computes remaining HP fractions.
- Neither held-out function runs combat, handles decisions, or counts reducer steps.

The proposed CLI therefore needs a separate execution path. The plan does not specify its manifest decoder, encounter loop, pending-decision/reaction policy, caps and failure classification, model-call exclusion, or Help-counter derivation. In particular, “all 30 pairs resolved” needs a precise treatment of `round_cap`, step exhaustion, mutual defeat, and operational failure.

Existing reusable pieces include `EngineRoundSession`, `createScriptedPartyPlan`, and `materializeScriptedPartyTurn`; the plan does not identify how they compose.

The scope claim is also too strong. Reading:

```text
sed -n '16824,16862p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
```

shows **D586.4 requires ranking with each new offer**. **D586.5 requires held-out measurement before a ranking repair becomes the default**. Neither requires this new 30-pair harness to block landing an explicitly opt-in Help family. D586.3’s live-default study remains a separate requirement.

**Fix:** Prefer retaining architecture proof here and moving the promotion runner to a bounded follow-up, with default enablement blocked pending its evidence. If Slice 3 stays, specify the complete model-free runner contract and fixture-only failure tests before implementation. Do not present the 30-pair/60-round/8,000-step thresholds as requirements established by D586.4.

---

**PLAN-F6 — P2 — Lifecycle and attack-path tests leave important consumers unproved**

Plan locations: **:68–105, :284–288, :336–348, :387–407**.

Evidence:

```text
rg -n 'resolveAttackRoll\(' src/combat --glob '*.ts'
```

Relevant creature-attack paths include:

```text
src/combat/encounter.ts:7288   ordinary/opportunity attack
src/combat/encounter.ts:8667   spell attack
src/combat/encounter.ts:11328  weapon attack during spell casting
```

The third path has its own applicability and consumption logic. “Spell and weapon attacks share Help eligibility” does not explicitly cover it.

Additional lifecycle evidence:

```text
sed -n '11461,11483p;5705,5736p' src/combat/encounter.ts
```

`nextLivingInitiativeIndex` skips dead combatants, while source-start duration ticks only on the matching boundary. Thus “ordinary lifecycle remains authoritative” needs an explicit expected result when the helper dies: its normal start boundary may never run.

```text
sed -n '3842,3905p' src/combat/encounter.ts
```

`spendAction` separately enforces Incapacitated and Slow restrictions; living status plus an available Action is not the complete legality predicate.

**Fix:** Add a concrete assertion matrix covering:

- ordinary attack, spell attack, during-cast weapon attack, and allied opportunity attack;
- second multiattack component, with a roll trace that distinguishes its mode;
- saving-throw effects neither receiving nor consuming Help;
- declaration at 5 feet followed by movement beyond 5 feet before consumption;
- living-but-Unconscious helper refusal;
- helper death after declaration, with the intended remaining lifetime stated;
- faction inheritance through summons using `combatantsAreAllies`;
- revision replay and persistence round-trip followed by consumption and expiry.

For each mutation, specify the production substitution and observable assertion. Effect removal alone is not sufficient evidence that the first roll received Advantage or that the second roll did not.

---

**PLAN-F7 — P1 — The player-channel guarantee omits the existing event serializer**

Plan locations: **:35, :98–105, :333–340, :513**.

Evidence:

```text
sed -n '6092,6170p' src/combat/encounter.ts
```

The normal `applyEffect` path emits:

```ts
{ type: 'effect_applied', effectId: id, source, targets }
```

```text
sed -n '332,456p' src/combat/visibility.ts
sed -n '470,501p' src/combat/visibility.ts
```

`eventCombatants(effect_applied)` returns the source and targets. `playerEvents` then passes that event through when those combatants are visible. `resource_spent` likewise exposes its `purpose`.

Consequently, using the normal effect/action machinery can expose the Help helper–target association and a Help-labelled action purpose even though `state.effects` itself is DM-only.

The named `player tool profile does not export Help semantics` test addresses MCP surface exposure; it does not prove `projectPlayerView(...).recentEvents` is clean.

**Fix:** Specify which Help event facts are DM-only and how event typing/emission or projection enforces that decision. Add an actual player-projection/serialization test with both helper and target visible, before and after consumption and restore. Add any required visibility files/tests to the manifests. The plan’s strict “Help facts stay in DM/engine surfaces” guarantee must cover this existing channel.

---

**PLAN-F8 — P2 — The arena timing gate does not exercise enabled Help**

Plan locations: **:467–472**.

Evidence:

```text
sed -n '2196,2244p' tests/unit/tools/ai-dm-arena.test.ts
```

The named test builds its inputs with `LEGACY_BLOCK_ARGS`, runs two `InProcessArenaAdapter` instances, and compares rollover-disabled versus high-threshold invocation sequences. It does not enable Help or require a Help forecast.

Because this plan keeps default/legacy Help disabled, arbitrarily expensive enabled-Help ranking could pass the proposed timing check.

**Fix:** Retain the existing regression test, but add a measured model-free arena round that actually offers and evaluates Help. Compare identical fixed encounter/RNG inputs under incumbent-disabled and candidate-enabled environments, and assert that the expensive path executed. Record raw walls and apply the stated 25% budget. The replay/detection pair remains useful for general regression coverage.

---

**PLAN-F9 — P3 — The manifest receipt says 49 paths; the document contains 48**

Plan location: **:261**.

Evidence:

```python
python3 - <<'PY'
from pathlib import Path
import re
text=Path('.tmp-plans/2026-09-15-offer-environment-help-only.md').read_text()
section=text.split('## Slices')[1].split('## Mutation ledger')[0]
paths=re.findall(r'^- `([^`]+)`$',section,re.M)
print(f'{len(paths)} paths; {len(set(paths))} unique; {sum(Path(p).is_file() for p in paths)} exist')
PY
```

Output:

```text
48 paths; 48 unique; 48 exist
```

**Fix:** Replace the placeholder receipt with the actual manifest-derived command and recount after F1.

Two challenged claims are supported:

- **The fresh-legacy divergence mutant becomes distinguishable.** `sed -n '667,727p' src/vtt/intent-resolver.ts` confirms reminting uses the resolver’s environment. Once generation consumes that environment, legacy reminting omits Help. With a valid stored Help primary, equal stored/supplied enabled digests, and `fallbackOptionId: null`, changing only the internal resolver environment produces `OPTION_NOT_OFFERED`; `proposalResolutionDivergence` returns a non-empty refusal explanation. Reminting does not rescue a capability omitted by policy. This is a source-level proof of the proposed test’s viability, not a claimed runtime mutant kill at HEAD.
- **Keeping disabled-only fields at v1 requires no existing digest-pin changes from that narrowing alone.** `rg -n 'readyAttack' src tools tests scripts` found five explicit test bodies, all `'disabled'`; their `unarmedControl` and `reposition` values are also disabled. The audit reproduced **75 64-hex literals in 15 files**, across **82 changed test files**. The Help quote also matches `sed -n '11745,11764p' docs/srd/full/srd-5.2.1.txt`, accounting for the page/column transition.

PLAN VERDICT: REJECT (4 P1, 4 P2)

REVIEW DONE
