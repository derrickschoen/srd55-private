<!-- trimmed 2026-09-18 (D683): full codex log (270641 bytes) replaced by the lane's final message; session id 01a0a642-35a1-7082-aba2-eda56ea291c1; the full log is in the mirror history of commit 8889b450 -->

## LAND-F1 — P2: the agreement property does not establish save LOS

At [engine-query-port.test.ts:574](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/engine-query-port.test.ts:574), saving throws are checked only by executing `force_save`. That reducer branch validates the declaration, spends the action, and resolves the save **without checking LOS** ([encounter.ts:12451](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:12451)).

**Reproduced:** in memory, I inserted a full blocking column into each of the four save execution states and asserted `traceCombatantLine(...).blocksSight === true`. The existing agreement property still passed **1/1**:

- `6203010`: one Web save.
- `6206007`: three Web saves.

Thus the property’s save portion cannot demonstrate the claimed sightline agreement. This is an existing reducer limitation exposed by the new witness, not a regression introduced by the production change.

**Fix:** explicitly assert the resolved-origin trace is sight-clear and non-total for every attack/save component; add a blocked-save query witness and save-specific mutant. Describe reducer execution as an additional check, without claiming that `force_save` itself enforces LOS.

## Other checks

### Query/execution alignment

The production fix is correct for the stated trace predicate:

- Query: `engine-query-port.ts:1167–1174`, with `sourceAnchor: origin`.
- Attack execution: `encounter.ts:7183–7203`, using the actor’s current position.
- Real proposal execution moves first: `engine-round-session.ts:264–289`.
- Both routes use the same footprint calculation, source/target IDs, creature exclusions, and default optical-blocker inputs through `cover.ts:584–594`.

At the same resulting state, these inputs agree. Movement-triggered state changes can invalidate an earlier proposal; teleporting directly to `finalPosition` does not test those interactions.

Relevant gate audit:

- Resolver action-position constraints delegate to `queries.reach`: `intent-resolver.ts:284`.
- Spell-position sight constraints check `blocksSight`: `:279–281`.
- Ordinary attacks, suspected-square attacks, and spell attacks check sight: `encounter.ts:7201`, `:7491`, `:8568`.
- Sight-required spell targets use canonical detection: `:9484–9488`.
- `force_save` is the exception described above.
- Query-port `:1234/:1547` calculate tactical cover; `:1830` reports cover. They are not authorization gates and correctly remain unchanged.

### Agreement-property recount

| Family | Options checked |
|---|---:|
| Hard | 142 |
| Brutal | 57 |
| Brutal-b | 15 |
| **Total** | **214** |

These contain **316 resolved components**: 204 multiattack attack components, 108 ordinary attacks, and four saves. All target lists contained exactly one target. No attack/save option was silently skipped.

The property resets state between components, so it tests individual LOS compatibility rather than complete sequential execution. Its fixed roll occurs after attack LOS validation. All sampled components were main-action uses; the bonus-save cost branch matches production but is not exercised by these fixtures.

### Generator and geometry

`generatedLineIsOpen` requires both conditions at `room-generator.ts:1230`; both callers use it at `:1235/:1243`.

Independent rational-arithmetic enumeration found:

- **12/16** corner rays enter a blocker interior.
- **4/16** run along row 6 between `(8,5)/(8,6)`.
- For `(14,6)→(1,6)`, the shared edge occupies `t ∈ [5/13,6/13]`.

Removing the lower flank opens those four seam rays.

In-memory pre/post predicate comparison regenerated **10/10 brutal-b seeds byte-identically**. The probe also verified that the two loaded predicates disagree on `{tier:'none', blocksSight:true}`, preventing an accidental same-module comparison. The fix does not repair the frozen cohort’s productivity.

### Probability pins and activation choice

Independent Python `Fraction` enumeration over d20 rolls and all four Bless faces reproduced:

- No Bless: **2702281/6250000 = 0.43236496**.
- Bless Priest/Scouts: **1035529241349/1638400000000 = 0.6320368904718018**.

The fold matches `tactical-evaluator.ts:786–814`. Runtime origin probes confirmed Priest `(13,4)` none/clear, Scout `(18,4)` half/clear, and Bandit `(17,4)` half/clear. Both unchanged control assertion expressions are byte-identical to `10cc9f5e`.

The brutal-b helper preserves `report.defaultOption` and supplies its declared first choice (`arena-basis-brutal-b.test.ts:149–159,178–189`). Dispel Evil and Good declares `['break_enchantment','dismissal']` at `offer-declarations.ts:403`; resolver validation remains active at `intent-resolver.ts:590–591`. No resolver failure is swallowed.

## Commands and results — my runs

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
git diff --check 10cc9f5e ebfcacaa
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-command-outcomes.mjs
```

Type checks and diff check exited **0**; architecture checks completed successfully, including **77 active self-test fixtures** and **1,624 TypeScript files**.

Vitest ran through `node --input-type=module` with programmatic `startVitest`, configuration bundling disabled, one thread worker, `cache:false`, and in-memory transforms:

| Suites | Result |
|---|---|
| Query port + generator LOS + R02 | **133/133 passed** |
| Brutal-b | **37 passed / 10 expected productivity failures** |
| D569 blind experiment | **46 passed / 6 expected manifest failures** |
| Replay + detection | **36/36 passed, 39.41 seconds** |

Exactly the expected **16 retained reds** remain. Timing is below approximately 41 seconds.

Own production mutants:

- Disable query sight refusal: **both witnesses failed**; offered-option count became **451**.
- Relax generator predicate to tier-only: **witness failed**.
- Save execution-state blocker probe: **survived**, supporting LAND-F1.

Scope is exactly **six files, 325+/22−**; no fixture changes, no added line over 120 columns, clean checkout at `ebfcacaa`.

Production hashes printed before and after were unchanged:

```text
engine-query-port.ts 1a552fba7ac01bdf45ec3c4467acbfa71b9f412242c55ed0e41ddab587b70a0a
room-generator.ts   8d85ae64b1350a15010176da96931ed89058f4516697e76d475f32e492295d7b
```

VERDICT: REJECT (0 P1, 1 P2)
REVIEW DONE.
