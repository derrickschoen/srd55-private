# Hotspot wave batch 1 mutation ledger

Date: 2026-08-21

## Scope and authority

- Requested hotspots resolve on disk to `src/rules/attack-profiles.ts` and
  `src/grants/skill-grants.ts`.
- Baseline survivor authority: the rerun JSON in
  `dnd-lane-mutshard/reports/mutation-shards/shard-002/mutation.json` and
  `shard-006/mutation.json`, summarized by
  `docs/perf/2026-08-19-d280-rerun-kill-delta.md` in that campaign worktree.
- Comparison key: mutator name + exact source range + replacement. The source
  files in this worktree were byte-identical to the campaign copies before the
  tests, and were rechecked byte-identical after every in-place Stryker run.

## Result

| File | Recorded survivors before | Recorded survivors after | Killed | Kill rate |
|---|---:|---:|---:|---:|
| `src/rules/attack-profiles.ts` | 105 | 0 | 105 | 100% |
| `src/grants/skill-grants.ts` | 46 | 13 | 33 | 71.7% |

Restricted reruns used only the touched suite for each file. The final fresh
attack run reported 285 killed / 4 survived / 2 no-coverage / 211 checker
errors across all 502 generated mutants. All 105 members of the recorded
baseline matched `Killed`. Its four fresh survivors are module-static fragments
of `DERIVED_ROW_PROFICIENCY`; the complete Shillelagh object test includes the
literal in full, but the in-place runner reused an already-loaded module. They
are not members of the 105-survivor baseline.

The final fresh skill run reported 285 killed / 29 survived / 8 no-coverage /
3 timeout / 166 checker errors across all 491 generated mutants. Exact
baseline matching yields the 33/13 result above.

## SRD-derived expectations

- Weapon attack ability formulas: `docs/srd/source/sheet-math.txt:71-74`.
- True Strike one attack, ability replacement, damage choice and upgrade:
  `docs/srd/source/weapon-attack-cantrips.txt:16-29`.
- Shillelagh weapon, ability, damage choice and upgrade:
  `docs/srd/source/weapon-attack-cantrips.txt:39-54`.
- Martial Arts die, ability choice and preconditions:
  `docs/srd/source/attack-class-features.txt:38-60`.
- Extra Attack non-stacking:
  `docs/srd/source/attack-class-features.txt:120-131`.

All skill-grant expectations are derived from the closed `Skill`, `GrantRule`,
`SkillGrantState`, `SkillGrantSource`, `ResolvedSkillGrants` and
`UnfilledSpeciesSkillGrant` contracts plus their database constraints.

## Tests added

### `tests/unit/rules/attack-profiles.test.ts`

- `pins every proficiency verdict to its literal state and disclosure`
- `pins the recorded and unknown weapon formula branches literally`
- `pins withheld proficiency to the attack number and complete option reason`
- `pins the complete True Strike profile at the level-11 boundary`
- `pins the complete Shillelagh profile at the level-5 boundary`
- `pins the complete Martial Arts profile and its two preconditions`
- `pins missing and ambiguous cantrip-source disclosures literally`
- `pins negative weapon bonuses and the complete unresolved-attack warning`
- `pins empty and repeated null-ability source names`
- `pins every sentence of an ambiguous Shillelagh choice`
- `pins the complete attack-ability override profile`
- `formats zero as an explicitly signed weapon bonus`
- `pins the complete unrecognised-cantrip warning`
- `uses plural grammar when two resolved attacks are shown`

### `tests/integration/grants/skill-grants-survivors.test.ts`

- `pins each tool-alternative row transition and leaves a true no-op untouched`
- `gates class reconciliation by source kind and preserves no-op timestamps`
- `uses the multiclass any-skill pool rather than the starting-class flag`
- `sorts held skills and excludes filled, orphaned, and definitionless grants`
- `matches an authored species pool by both rule kind and rule key`
- `proves an external row cannot carry a bundled-stable species key`
- `refuses non-tool rules and preserves the structured refusal name`
- `clearing an already-unfilled grant is a literal no-op`
- `requires a class-level row even when multiclass traits would otherwise mint`
- `does not discover species rules through a non-species source`
- `rejects colliding authored rule keys before kind lookup`
- `ignores non-skill species rules during skill-grant discovery`
- `excludes an orphaned unfilled grant with an otherwise valid class owner`
- `requires every authored species skill to be a known Skill member`
- `excludes both filled and orphaned species grants from unfilled choices`

## Remaining recorded skill survivors

- `254@176` — cosmetic: only the RangeError sentence is erased; the error type
  and cardinality boundary are pinned.
- `283@213` — cosmetic: only refusal prose is erased; `name`, `reason`, and
  offending `skill` are pinned.
- `380@396` — not deliberately skipped: the wrong-source Human test directly
  reaches this clause and pins no rows, but Stryker did not assign that new test
  to the mutant. Reserved as the dropped-clause negative control; it cannot be
  run until the required full-unit gate is green.
- `386@402` — equivalent: `String(null)` is `"null"`, and the frozen bundled
  plan has no `"null"` key, so both arms produce no plan.
- `549@675` — unreachable: the database rejects an external catalog layer on a
  bundled-stable key; an external asserted key cannot match a bundled plan.
- `571@686` — unreachable: duplicate rule keys are rejected by
  `SourceGrantRuleKeyError` before this lookup, so a same-key wrong-kind rule
  cannot precede the skill rule.
- `532@632` — equivalent: `catalogLayerDisclosure(null)` and
  `catalogLayerDisclosure("null")` both return `unknown`.
- `616@784` — equivalent: persisted definition IDs start at 1; removing the
  null return only queries impossible ID 0 and produces the same null pool.
- `650@845` — cosmetic: only `grant_not_found` prose is erased; structured
  refusal fields are pinned.
- `666@866` — cosmetic: only `grant_already_filled` prose is erased; structured
  refusal fields are pinned.
- `675@874` — cosmetic: only `skill_not_in_pool` prose is erased; structured
  refusal fields are pinned.
- `680@881` — cosmetic: only `skill_already_held` prose is erased; structured
  refusal fields are pinned.
- `694@919` — cosmetic: only background collision prose is erased; structured
  refusal fields are pinned.

## Verification

- Focused suites: PASS, 2 files / 95 tests.
- `npx tsc -p tsconfig.app.json --noEmit`: PASS.
- `npx tsc -p tsconfig.node.json --noEmit`: PASS.
- `npx vitest run --configLoader runner tests/unit`: **FAIL**, 9 failures / 6,300
  tests (6,291 passed). All failures are outside this batch, in
  `tests/unit/vtt/experiment-orchestrator.test.ts` (5) and
  `tests/unit/vtt/soak-runner.test.ts` (4), cascading from DM bridge session
  creation returning HTTP 422.

## Negative controls

Not run. The instruction requires all three controls **after green**, and the
full unit gate is red. Planned controls remain:

- numeric literal: True Strike level-11 extra damage (`2d6`) versus
  `pins the complete True Strike profile at the level-11 boundary`;
- boundary operator: `signedEffectAmount` `< 0` to `<= 0` versus
  `formats zero as an explicitly signed weapon bonus`;
- dropped clause: skill species source gate to `true` versus
  `does not discover species rules through a non-species source`.

## Deviations

- D328.9/D321.3 and the rerun reports were absent from this worktree's
  `.claude/decisions.md`/`docs/perf`; the read-only campaign worktree held the
  exact rerun JSON and delta report.
- Negative controls were not authorized to start because the full-unit gate
  did not become green.

