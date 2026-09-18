# VIS-FIELD landing-gate investigation — sol read-only report (fresh 01a0ae25…, 387 k tokens)

## Conclusion

The failures split into three groups:

- 10 brutal-b productivity rows plus the D569 second-family violations are genuine **D635 two-blocker seam consequences on frozen fixtures**: category **(a)**.
- 19 of the 23 round-execution failures expose a real **VIS-FIELD integration defect**: the query layer offers a seam-obscured attack because it checks only physical `tier === 'total'`, while execution correctly rejects `blocksSight === true`: category **(c)**.
- The remaining four execution failures are a latent scripted monster-policy defect exposed by D635’s changed ranking: the selected spell requires an activation choice that the helper omits. These are category **(a)**, not derived fog.
- No reported failure is caused by derived fog/detection: category **(b) = 0**.

There is a second category-(c) issue in generation: `hasOpenOpposingRay()` calls a ray “open” when `tier === 'none'` without requiring `blocksSight === false`.

### 1. Brutal-b productivity

The contract at [arena-basis-brutal-b.test.ts:358](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/arena-basis-brutal-b.test.ts:358) defines productive as a valid option having either:

- positive movement cost, or
- an `attack`, `saving_throw`, `cast_spell`, or `use_world_object` slot.

Dodge and End Turn do not qualify.

The generator’s M576-E2 mechanics are weaker than that contract:

- [room-generator.ts:1223](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/room-generator.ts:1223) calls a ray open solely when `tier === 'none'`.
- It ignores `blocksSight`.
- Wall placement at [room-generator.ts:1329](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/room-generator.ts:1329) requires only one such “open” ray.
- The actual per-monster productivity certification lives in [room-generator-los-cover.test.ts:237](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/room-generator-los-cover.test.ts:237) and the frozen-family validators, not in `generateRoom()`.
- [generate-arena-basis.ts:247](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/generate-arena-basis.ts:247) merely serializes `generateRoom()`.

Under D635, a two-blocker edge can produce `tier: none` and `blocksSight: true`; therefore `hasOpenOpposingRay()` is now semantically wrong.

Across all ten brutal-b seeds, **25 monsters** lose every productive option:

| Seed | First reported monster | All nonproductive monsters | D635 flanking cells |
|---|---|---:|---|
| 6206001 | m2 Minotaur Skeleton `(18,0)` | 3 | `(11,1)/(11,2)` |
| 6206002 | m1 Doppelganger `(21,1)` | 2 | `(11,1)/(11,2)` |
| 6206003 | m1 Doppelganger `(21,1)` | 4 | `(11,1)/(11,2)` |
| 6206004 | m2 Grappling Cuttle `(13,0)` | 2 | `(8,1)/(8,2)` |
| 6206005 | m2 Ancient Crag Bear `(20,2)` | 4 | `(12,1)/(12,2)`, `(12,4)/(12,5)` |
| 6206006 | m2 Titan Cuttle `(10,2)` | 2 | `(7,1)/(7,2)`, `(7,4)/(7,5)` |
| 6206007 | m2 Elder Sky Raptor `(13,2)` | 4 | `(8,1)/(8,2)`, `(8,4)/(8,5)` |
| 6206008 | m1 Doppelganger `(19,1)` | 2 | `(10,1)/(10,2)` |
| 6206009 | m5 Astraldendon `(13,5)` | 1 | `(7,4)/(7,5)`, `(7,5)/(7,6)` |
| 6206010 | m3 Kelp Hunter `(17,3)` | 1 | `(9,2)/(9,3)`, `(9,3)/(9,4)` |

Mechanism count: **25 seam, 0 derived-fog/detection, 0 other**.

Three detailed examples:

- **6206001 m2**, Large footprint at `(18,0)`. Candidate PCs are fighter `(1,2)`, cleric `(2,5)`, and wizard `(1,6)`. Cleric/wizard rays were already blocked. The fighter formerly had four clear row-line-2 corner rays:
  `(18,2)→(1,2)`, `(18,2)→(2,2)`, `(20,2)→(1,2)`, `(20,2)→(2,2)`.
  Every one runs along the edge shared by `(11,1)` and `(11,2)`. Main’s tracer touched neither cell interior; D635 blocks all four.

- **6206005 m2**, Huge footprint at `(20,2)`. Four fighter rays on row line 2, from x=20/23 to x=1/2, are closed by `(12,1)/(12,2)`. Four cleric rays on row line 5, from x=20/23 to x=2/3, are closed by `(12,4)/(12,5)`. The remaining wizard rays are independently blocked. Its current options are only Dodge and End Turn.

- **6206009 m5**, at `(13,5)`. The cleric row-line-5 rays, x=13/14 to x=2/3, are closed by `(7,4)/(7,5)`. The wizard row-line-6 rays, x=13/14 to x=1/2, are closed by `(7,5)/(7,6)`. Fighter rays were already blocked.

For 6206007, one wizard ray also changes under observer-derived opacity, but removing that opacity does not restore productivity; the fighter/cleric seam closures alone determine the result. It is therefore still category (a), not (b).

The B2 query consolidation is likewise not causal here. Main’s local detector at `9f148666:engine-query-port.ts:791-829` treated only `seen` as targetable; its lossy `located` path remained non-visible and could fall into undetected/darkness-style downstream handling. Current `detectCombatant()` also requires `kind === 'seen'` in this target-selection path. Disabling the consolidation while retaining D635 leaves the same 25 failures.

### 2. Round execution

The exact split among the 23 rows is:

- **19 LOS/cover refusals — category (c)**
  - hard: 5117001–007, 5117009–013: 12
  - brutal: 6203002, 003, 005, 006, 008, 009: 6
  - brutal-b: 6206004: 1
- **4 missing activation choices — category (a)**
  - brutal 6203004
  - brutal-b 6206001, 6206009, 6206010

The production mismatch is exact:

- [engine-query-port.ts:1163](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/engine-query-port.ts:1163) rejects an attack/save only when `traceCombatantLine(...).tier === 'total'`.
- D635 deliberately made optical blocking independent of physical cover at [cover.ts:384](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/cover.ts:384).
- [encounter.ts:7183](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/encounter.ts:7183) correctly rejects when `attackLine.blocksSight || tier === 'total'`, producing:  
  `The target has Total Cover or is outside line of sight.`

Thus seam rays with `blocksSight: true, tier: half` pass offer generation and fail execution.

Representative hard case, **5117001**:

- First monster segment selects m6’s Heavy Crossbow against the wizard.
- Monster origin: `(14,5)`; wizard: `(1,6)`.
- Main-clear row-line-6 rays:
  `(14,6)→(1,6)`, `(14,6)→(2,6)`, `(15,6)→(1,6)`, `(15,6)→(2,6)`.
- D635 flanks: `(8,5)/(8,6)`.
- Current trace: `tier=half`, `blocksSight=true`, first blocking cell `(8,5)`.
- Query authorizes it because the tier is not total; encounter execution refuses it.

Representative brutal case, **6203002**:

- The scripted PCs act: cleric attacks m2, fighter moves to `(0,1)`, wizard moves to `(0,5)`.
- The final monster segment selects m1’s Radiant Flame against that wizard after moving  
  `(14,2)→(13,3)→(12,4)` for 20 feet.
- Main-clear row-line-5 rays are from `(12,5)/(13,5)` to `(0,5)/(1,5)`.
- D635 flanks: `(8,4)/(8,5)`.
- Current trace: `tier=half`, `blocksSight=true`, first blocker `(8,4)`.
- Execution refuses the command with the same LOS error.

The scripted **party** did not assume these lanes. The rejected commands are monster-plan commands. The suite name merely identifies the party policy used around them.

For the four other rows, `dryRunMonsterPlan()` at [arena-basis-brutal-b.test.ts:145](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/arena-basis-brutal-b.test.ts:145) selects `spellcasting/dispel-evil-and-good (1/1)` as the ranked default but constructs a proposal without `activationChoice`. The spell requires:

```text
{ kind: "dispel_evil_and_good_mode",
  value: "break_enchantment" | "dismissal" }
```

The resolver rejects it at [intent-resolver.ts:578](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/intent-resolver.ts:578) with `ACTIVATION_CHOICE_INVALID`. D635 changed which option wins the ranking and exposed the helper’s latent omission. The attended-policy assertion at line 517 is collateral: planning fails before any attended pending decision can be created.

### 3. D569

The validator at [d569-second-family-manifest.ts:272](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/d569-second-family-manifest.ts:272) reruns the same current-engine productivity predicate for every monster in each brutal fixture. Validation at [d569-second-family-manifest.ts:396](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/d569-second-family-manifest.ts:396) additionally checks:

- exact cohort/path/seed identity;
- frozen SHA-256;
- generated-room integrity and difficulty membership;
- two canonical regenerations against the frozen bytes.

[d569-blind-experiment.ts:602](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/d569-blind-experiment.ts:602) prefixes those violations with `second_family_`; its dry runner throws the first at line 677.

The seven entries received by the line-409 assertion are seven identical codes:

```text
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
second_family_brutal_productivity
```

They correspond, in manifest order, to seeds:

```text
6207002, 6207004, 6207005, 6207006, 6207007, 6207008, 6207009
```

Those seven rooms contain 18 currently nonproductive monsters. The same no-seam comparison identifies two-blocker seam lanes in every case; no derived-fog-only violation was found.

### 4. Main `9f148666`

Yes, all three suites pass under main semantics.

I could not check out another tree or write a temporary checkout under the stated restrictions, so I checked this in memory:

1. `git diff` showed the two test files, both validators, and every implicated fixture are byte-identical between `9f148666` and `10cc9f5e`.
2. `git show 9f148666:src/combat/cover.ts` supplied the old tracer. It had no shared-edge test and promoted all-sight-blocked corner sets to total cover.
3. Replaying the exact fixture geometry with that old corner-ray rule restored productive lanes to all 25 brutal-b monsters and all seven D569 rooms.
4. The 19 offered-then-refused commands cease to disagree: the old clear seam rays have `blocksSight=false`; where every ray is physically blocked, main reports total cover consistently.
5. The four activation-choice rows return to their old option ranking. Because test/helper/fixture bytes are identical, the changed ranking is attributable to the changed visibility geometry.

No Vitest, build, Playwright, or server was run. An early Vite module-loading attempt failed before startup on unrelated socket 24678; neither 4173 nor 4450 was touched. The worktree remains clean at `10cc9f5eeef874691293747ee08ab484ba603d10`.

Principal read-only commands included:

```bash
git status --short --branch
git rev-parse HEAD
git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static rev-parse main

git diff --stat 9f1486665399571c57fdd82fa3745b1d8fca457a..HEAD -- \
  tests/unit/vtt/arena-basis-brutal-b.test.ts \
  tests/unit/tools/d569-blind-experiment.test.ts \
  tools/d569-second-family-manifest.ts \
  tools/d569-blind-experiment.ts \
  src/vtt/engine-query-port.ts src/combat/cover.ts \
  src/combat/visibility-field.ts src/vtt/monster-planning-state.ts

git diff --name-status 9f1486665399571c57fdd82fa3745b1d8fca457a..HEAD -- \
  tests/fixtures/arena-basis-hard \
  tests/fixtures/arena-basis-brutal \
  tests/fixtures/arena-basis-brutal-b \
  tests/fixtures/arena-basis-hard-2 \
  tests/fixtures/arena-basis-brutal-2 \
  tests/fixtures/d569-second-family-manifest.json \
  tests/fixtures/d569-blind-experiment-manifest.json

git show 9f1486665399571c57fdd82fa3745b1d8fca457a:src/combat/cover.ts |
  nl -ba | sed -n '280,430p'

git show 9f1486665399571c57fdd82fa3745b1d8fca457a:src/vtt/engine-query-port.ts |
  nl -ba | sed -n '775,850p;1000,1105p;1860,1905p'

rg -n "second_family_brutal_productivity|brutal_productivity" tests tools src
```

The geometry, option, execution, and D569 enumerations used read-only `node --import tsx --input-type=module -e ...` probes with a `.txt` import hook; they read the frozen JSON and called the current engine APIs directly.

### 5. Remedy scope

1. **Fix category-(c) production defects before touching fixtures.**
   - Align [engine-query-port.ts:1163](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/engine-query-port.ts:1163) with execution: an attack/save behind `blocksSight` must not be offerable merely because physical cover is half or none.
   - Make [room-generator.ts:1223](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/room-generator.ts:1223) require both `tier === 'none'` and `blocksSight === false`.
   - Regeneration with the current generator alone would reproduce the same bytes; it is not yet seam-aware enough to cure the fixtures.

2. **Fix the scripted monster policy.**
   - Amend `dryRunMonsterPlan()` to materialize a deterministic legal activation choice or avoid selecting a choice-requiring option without one.
   - `createScriptedPartyPlan()` itself does not need changing.

3. **Then reselect/regenerate the genuinely invalid productivity families.**
   - `tests/fixtures/arena-basis-brutal-b/seed-6206001..6206010.json`
   - its digest map in `tests/unit/vtt/arena-basis-brutal-b.test.ts`
   - `tests/fixtures/arena-basis-brutal-2/seed-6207001..6207010.json`, or at minimum the seven invalid seeds, with a deliberate new frozen-cohort ruling
   - `tests/fixtures/d569-second-family-manifest.json`
   - the second-family manifest hash in `tests/fixtures/d569-blind-experiment-manifest.json`
   - associated digest pins in generator/manifest tests.

   The primary hard/brutal fixtures should not be regenerated merely to hide the 19 query/executor failures; correcting the query and policy should make those execute legally.

4. **D569 consequence.**
   - The second family is `8 arms × 2 bases × 10 fixtures × 3 reps = 480 cells`.
   - Regenerating all ten brutal second-family fixtures changes 240 cell state hashes; changing only the seven currently invalid seeds changes 168.
   - Either way, changing the nested manifest hash invalidates the registered identity of the entire 480-cell second-family experiment.
   - Historical rows remain immutable records of the old states, but they cannot be relabelled or pooled as observations from the regenerated cohort. A new manifest/version and new rows are required.

5. **Amending the productivity contract is possible but not advisable.**
   - It would touch the brutal-b predicate, `expectProductiveMonsters()`, and D569’s `everyMonsterProductive()`.
   - Allowing Dodge/End Turn would erase the explicit “productive first-turn option” guarantee instead of adapting the frozen data to D635.
   - No fog/detection repins are warranted.

LANDING INVESTIGATION DONE