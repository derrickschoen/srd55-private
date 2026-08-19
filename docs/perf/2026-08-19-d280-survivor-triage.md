# D310 survivor triage

Date: 2026-08-19

## Verdict

All 1,279 `Survived` mutants in the eight current shard reports were assigned exactly one disposition.

| Disposition | Count | Share |
|---|---:|---:|
| REAL-GAP | 1,013 | 79.20% |
| EQUIVALENT | 6 | 0.47% |
| LOW-VALUE | 260 | 20.33% |
| **Total** | **1,279** | **100.00%** |

REAL-GAP is deliberately broad. In particular, input-decoder conjunction changes, integer/range boundaries, collection cardinality checks, SQL parameters, stable identifiers, state transitions, and result-shape mutations are real even when the current tests happen to reach the line. LOW-VALUE is limited to non-contractual prose/formatting and the campaign's already-excluded regex-literal category. An error's literal `name`, structured parameters, result codes, IDs, and list presence are not prose and remain REAL-GAP.

The requested campaign map, `docs/perf/2026-08-19-d280-campaign-report.md`, was not present in this worktree when this triage was performed. The classification therefore used the eight JSON reports directly plus D280, D273, and D274 in `.claude/decisions.md`. That missing file did not prevent complete mutant accounting, but any additional exclusion encoded only there was unavailable.

## Per-file summary

| File | REAL-GAP | EQUIVALENT | LOW-VALUE | Total |
|---|---:|---:|---:|---:|
| `src/rules/sheet.ts` | 89 | 3 | 40 | 132 |
| `src/rules/attack-profiles.ts` | 7 | 0 | 106 | 113 |
| `src/grants/configured-choice-rule.ts` | 95 | 0 | 0 | 95 |
| `src/rules/feat-application.ts` | 79 | 0 | 9 | 88 |
| `src/rules/srd-subclasses.ts` | 72 | 0 | 16 | 88 |
| `src/grants/grant-rule-slot-generator.ts` | 77 | 0 | 0 | 77 |
| `src/grants/grant-rule.ts` | 75 | 0 | 0 | 75 |
| `src/grants/skill-grants.ts` | 48 | 0 | 5 | 53 |
| `src/grants/character-level-source-reconciliation.ts` | 40 | 0 | 0 | 40 |
| `src/grants/equipment-grants.ts` | 33 | 0 | 7 | 40 |
| `src/rules/sheet-feature-values.ts` | 35 | 0 | 3 | 38 |
| `src/access/spell-access-builder.ts` | 37 | 0 | 0 | 37 |
| `src/rules/legacy-level-feat-choices.ts` | 35 | 0 | 0 | 35 |
| `src/grants/skill-expertise-grants.ts` | 34 | 0 | 0 | 34 |
| `src/rules/srd-subclass-content.ts` | 32 | 0 | 0 | 32 |
| `src/grants/grant-rule-planner.ts` | 26 | 0 | 0 | 26 |
| `src/grants/source-rule-reader.ts` | 26 | 0 | 0 | 26 |
| `src/rules/multiclass-prerequisite-gate.ts` | 3 | 0 | 19 | 22 |
| `src/eligibility/spell-selection-eligibility.ts` | 21 | 0 | 0 | 21 |
| `src/rules/multiclass-proficiency.ts` | 6 | 0 | 15 | 21 |
| `src/rules/class-progression-lookup.ts` | 19 | 0 | 0 | 19 |
| `src/eligibility/spell-selection-constraint.ts` | 16 | 0 | 0 | 16 |
| `src/eligibility/spell-selection-collection.ts` | 14 | 0 | 0 | 14 |
| `src/rules/skills.ts` | 12 | 0 | 1 | 13 |
| `src/rules/equipment-packages.ts` | 6 | 0 | 6 | 12 |
| `src/eligibility/eligible-spell-search.ts` | 9 | 0 | 1 | 10 |
| `src/eligibility/spell-selection-assignment.ts` | 10 | 0 | 0 | 10 |
| `src/grants/configured-choice-rule-errors.ts` | 0 | 0 | 10 | 10 |
| `src/grants/grant-rule-errors.ts` | 0 | 1 | 9 | 10 |
| `src/grants/configured-choice-material-reader.ts` | 8 | 0 | 0 | 8 |
| `src/rules/legacy-armor-class-adjustment.ts` | 7 | 0 | 0 | 7 |
| `src/rules/legacy-trait-effects.ts` | 6 | 0 | 0 | 6 |
| `src/rules/ability-contributions.ts` | 4 | 1 | 0 | 5 |
| `src/rules/attack-cantrips.ts` | 3 | 0 | 2 | 5 |
| `src/rules/equipment-package-display.ts` | 5 | 0 | 0 | 5 |
| `src/rules/extra-attack.ts` | 2 | 1 | 2 | 5 |
| `src/grants/source-rule-reader-errors.ts` | 0 | 0 | 4 | 4 |
| `src/rules/species-effects.ts` | 3 | 0 | 1 | 4 |
| `src/rules/eligible-character-effects.ts` | 3 | 0 | 0 | 3 |
| `src/rules/sheet-content-lookup.ts` | 3 | 0 | 0 | 3 |
| `src/eligibility/spell-selection-service.ts` | 2 | 0 | 0 | 2 |
| `src/grants/equipment-grants-errors.ts` | 0 | 0 | 2 | 2 |
| `src/rules/ability-scores.ts` | 2 | 0 | 0 | 2 |
| `src/rules/generated-feature-effects.ts` | 2 | 0 | 0 | 2 |
| `src/rules/save-dc.ts` | 2 | 0 | 0 | 2 |
| `src/rules/weapon-mastery-lookup.ts` | 2 | 0 | 0 | 2 |
| `src/grants/grant-rule-slot-generator-errors.ts` | 0 | 0 | 1 | 1 |
| `src/rules/multiclass-prerequisite-house-rule.ts` | 1 | 0 | 0 | 1 |
| `src/rules/progression-type.ts` | 1 | 0 | 0 | 1 |
| `src/rules/spell-level.ts` | 1 | 0 | 0 | 1 |
| `src/rules/srd-attribution.ts` | 0 | 0 | 1 | 1 |
| **Total** | **1,013** | **6** | **260** | **1,279** |

## Per-file diagnosis and kill shapes

### `src/rules/sheet.ts` — 89 / 3 / 40

Missing-test pattern: the suite reaches sheet assembly but does not pin AC tie ordering, nullable proficiency behavior, martial-arts row selection, resource decoder boundaries, or the base/subclass/pact spell-progression truth table. The 40 LOW-VALUE mutants only rewrite warning/detail prose or excluded regex literals.

Kill shapes: (1) table-drive AC candidates with unequal totals, equal totals across source precedence, and equal source with lexically distinct/equal labels; assert winner, excluded, and `tie_break`; (2) table-drive every integer/JSON boundary around class level, resource maximum, slot level/count, pact shape, and caster fraction/rounding; (3) exercise zero/one/many base, subclass, and pact contributions, including invalid progression rows and absent abilities, and assert the entire structured resource result.

### `src/rules/attack-profiles.ts` — 7 / 0 / 106

Missing-test pattern: numeric/profile-shape behavior is under-pinned while explanatory attack prose is heavily exercised but intentionally non-contractual. The real gaps are proficiency inclusion, melee/ranged ordering, same-ability source de-duplication, and inert bonded-effect warning presence.

Kill shapes: (1) compare proficient and non-proficient attack/damage numbers, including null proficiency bonus; (2) assert option order for ranged, melee, and unknown attack kind plus de-duplication of two cantrip sources using the same ability; (3) assert an inert warning exists only for a one-bonded-weapon effect with a null weapon ID.

### `src/grants/configured-choice-rule.ts` — 95 / 0 / 0

Missing-test pattern: no hostile-payload matrix pins the closed object shapes, nonblank/dotted paths, option uniqueness, nested grants, declared sheet fields, and positive/nonzero numeric boundaries. Error labels are structured fields, so their mutations are real rather than message-only.

Kill shapes: (1) one table of minimally invalid payloads, changing one key/type/value at a time and asserting error class plus structured label/expectation; (2) valid multi-option round trips covering ability choices, darkvision, resistance effects, replaceable spells, and material grants; (3) duplicate option, duplicate nested rule key, nested configured choice, and mismatch between declared fields and option projections.

### `src/rules/feat-application.ts` — 79 / 0 / 9

Missing-test pattern: feat-note heading parsing, prerequisite alternatives, exact config shapes, ability-increase allocation shapes, Magic Initiate activation, and spell-change benefit reconciliation lack boundary/adversarial cases. The nine regex mutants retain the campaign-wide regex exclusion.

Kill shapes: (1) paragraph/heading fixtures at whitespace, heading-word, and continuation boundaries; (2) prerequisite truth tables with missing/equal/above scores and alternative ability sets; (3) table-drive every legal and one-step-illegal ASI/config shape, including empty/duplicate/unknown skills and missing spell-change benefit rows.

### `src/rules/srd-subclasses.ts` — 72 / 0 / 16

Missing-test pattern: the corpus parser is tested as a happy-path bulk import, not as a staged parser whose section boundaries, feature continuations, table headers, row counts, land tags, and final corpus invariants each fail independently. Eight regex mutants are excluded and eight diagnostic-prose mutants are LOW-VALUE.

Kill shapes: (1) tiny source fixtures that independently truncate a section, split a name, duplicate a table/level, misplace a header, or leave a continuation open; (2) corrupt one expected class/feature/table/header/entry/land count at a time and assert the tagged failure; (3) pin land attachment and physical-row counting with two adjacent tables.

### `src/grants/grant-rule-slot-generator.ts` — 77 / 0 / 0

Missing-test pattern: slot generation lacks a cross-product over decoded config shapes, class-level bounds, fixed/key spell resolution, lock/current selection state, nested source markers, tombstoned sources, and cleanup SQL parameters.

Kill shapes: (1) table-drive malformed/null/array/object config plus levels 0/1/20/21; (2) fixed spell by ID/key for missing, inactive, locked, acquired, and limit-consumption states; (3) reconcile desired versus existing slots/acquisitions for active and tombstoned sources, asserting exact inserts, updates, deletes, and bound IDs.

### `src/grants/grant-rule.ts` — 75 / 0 / 0

Missing-test pattern: the parser lacks one-field-at-a-time contract tests across shared field consumption, scalar/list/object decoding, spell levels, active config, query predicates, grant-source references, bucket rules, activation levels, and kind-specific payloads.

Kill shapes: (1) generated invalid objects varying each field through absent/null/wrong type/blank/boundary values and asserting structured error fields; (2) one valid and one forbidden-payload case per rule kind; (3) boundary cases for 0/1/9/10 spell level, 0/1/20/21 activation level, and spellbook initial/per-level counts.

### `src/grants/skill-grants.ts` — 48 / 0 / 5

Missing-test pattern: skill grant reconciliation does not pin selection cardinality/uniqueness, held-elsewhere lookup, class/species rule discovery, active/orphan transitions, bundled-pool derivation, or fill refusal boundaries. Five refusal-message literals are LOW-VALUE.

Kill shapes: (1) selected skill lists at count−1/count/count+1 with nulls, duplicates, and already-held skills; (2) reconcile active, inactive, orphaned, missing, and moved grants and assert exact row state; (3) fill/clear against named and any-proficient pools, including duplicate ownership and missing class definitions.

### `src/grants/character-level-source-reconciliation.ts` — 40 / 0 / 0

Missing-test pattern: dependency detection lacks a source-type/definition-ownership/configured-rule truth table, and reconciliation side effects are not pinned for dependent versus independent active/tombstoned sources.

Kill shapes: (1) class, subclass, and other sources with null/wrong/owned definition IDs; (2) plain and configured rules with activation at root, option, and nested grant levels; (3) reconcile a level change and assert callbacks/SQL parameters fire only for genuinely dependent sources.

### `src/grants/equipment-grants.ts` — 33 / 0 / 7

Missing-test pattern: package selection, item/template fingerprint resolution, stored-config decoding, weapon/armor dispatch, slot collision, and row-contract handling are not independently pinned. Seven human-readable diagnostic strings are LOW-VALUE.

Kill shapes: (1) background package option A/B plus missing/wrong projection owner; (2) dependency rows with missing, mismatched, and valid weapon/armor templates and fingerprints; (3) malformed stored config and armor-slot collision, asserting refusal params and exact minted rows.

### `src/rules/sheet-feature-values.ts` — 35 / 0 / 3

Missing-test pattern: feature folding lacks cases for Arcane Recovery presence, base/contribution identity, malformed supersession, duplicate sources, missing labels, authored-resource shape disagreement, positive maxima, and historical backfill de-duplication.

Kill shapes: (1) Wizard/non-Wizard and available/unavailable Arcane Recovery contexts asserting source key and `is_base`; (2) folded contributions with duplicate/missing labels and malformed refs; (3) authored resources with shape/label conflicts, zero/noninteger values, repeated sources, and an existing historical fact key.

### `src/access/spell-access-builder.ts` — 37 / 0 / 0

Missing-test pattern: access-route construction lacks malformed config cases, stable sort-key boundaries, empty prepared-slot handling, current/fixed/override eligibility combinations, and wizard-spellbook ritual capability filtering.

Kill shapes: (1) null/blank/array/nonobject config and missing/blank path values; (2) route pairs differing at each sort-key component, including prefix/equal keys; (3) prepared and ritual rows across active, kept override, invalid collection, missing current spell, and nonmatching capability data.

### `src/rules/legacy-level-feat-choices.ts` — 35 / 0 / 0

Missing-test pattern: legacy ASI recognition has no one-column corruption matrix, and level-choice ordering/total-level clamping is not pinned at its arithmetic boundaries.

Kill shapes: (1) one/two rows with totals and amounts around 1/2 plus each forbidden sibling column populated once; (2) duplicate/mixed ability rows and invalid effect kinds; (3) unsorted ASI levels with and without a class source and totals below/equal/above class level and 20.

### `src/grants/skill-expertise-grants.ts` — 34 / 0 / 0

Missing-test pattern: expertise reconciliation lacks a complete active/orphan/level/held-skill state table and fill eligibility is not pinned across entitlement and pool variants.

Kill shapes: (1) desired versus existing rows varying state, orphan fields, level, null skill, and already-held skill one at a time; (2) named versus any-proficient pools with held/expert intersections; (3) fill attempts for missing/inactive/already-filled/not-proficient/out-of-pool/already-expert grants.

### `src/rules/srd-subclass-content.ts` — 32 / 0 / 0

Missing-test pattern: stored seed parity is checked in aggregate but no test corrupts each identity/metadata/feature/effect/progression field independently; insert/update return paths are likewise unpinned.

Kill shapes: (1) mutate each subclass metadata field and each stored feature field individually; (2) vary feature, effect, and progression counts/parameters; (3) exercise cache hit, exact match, repair, insert, and no-op paths and assert the returned change flag.

### `src/grants/grant-rule-planner.ts` — 26 / 0 / 0

Missing-test pattern: planner normalization and ordinal arithmetic lack null/type/blank inputs, initial/per-level boundaries, activation gates, required-choice semantics, and kind dispatch coverage.

Kill shapes: (1) configured paths resolving absent, non-list, mixed-type, blank, and trimmed values; (2) initial/per-level values around 0/1 and ordinals on each boundary; (3) class/character activation just below/at threshold and one plan assertion per rule kind.

### `src/grants/source-rule-reader.ts` — 26 / 0 / 0

Missing-test pattern: source-rule reading lacks hostile JSON/container/path-index tests and exact class/character activation gating, especially for missing class level and configured predicates.

Kill shapes: (1) null/blank/bad JSON plus scalar/array/object containers; (2) path traversal through valid, negative, fractional, equal-length, and out-of-range array indices; (3) rules just below/at activation levels and configured equals/mismatch/missing values.

### `src/rules/multiclass-prerequisite-gate.ts` — 3 / 0 / 19

Missing-test pattern: nearly all survivors are non-contractual display prose; the real gaps are the zero-held-class fast path and the refusal error discriminator.

Kill shapes: assert an empty held-class set does not produce failures, a failing held prerequisite does, and the thrown/refused error retains the literal `name`. Do not add exact sentence assertions.

### `src/eligibility/spell-selection-eligibility.ts` — 21 / 0 / 0

Missing-test pattern: eligibility lacks a boundary matrix for zero/many versions, inactive versions, legacy list bridging, required tags, and no-op versus changed persistence updates.

Kill shapes: (1) zero, one active, one inactive, and multiple distinct version IDs; (2) 2014/2024 list membership combinations plus missing/present tags; (3) persisted status/reason equal versus either field changed, asserting whether an update occurs.

### `src/rules/multiclass-proficiency.ts` — 6 / 0 / 15

Missing-test pattern: structured qualifier parsing and provenance are under-tested; warning wording is intentionally not contractual. Two regex mutants remain excluded.

Kill shapes: parse blank, padded, single, and `or`-joined qualifiers and assert resolved categories; then combine duplicate qualifier sources and assert the de-duplicated `via` list. Do not pin warning sentences.

### Files with fewer than 20 survivors

The remaining files have no silent sampling. Their focused cluster and smallest useful kill shape are:

- `src/rules/class-progression-lookup.ts` (19/0/0): seed identity/count and caster progression branches; corrupt each Sneak Attack field, test none/shared/pact progression, and pin prepared-count zero versus positive.
- `src/eligibility/spell-selection-constraint.ts` (16/0/0): decoder type and 0..9/min≤max boundaries; table-drive null/blank/mixed arrays and each numeric edge.
- `src/eligibility/spell-selection-collection.ts` (14/0/0): wizard collection recognition and slot refresh; test both rule keys/content keys, fixed/current fallback, and exact update parameters.
- `src/rules/skills.ts` (12/0/1): source-table parsing/completeness and ability validation; test missing/duplicate/unknown rows and section termination. The regex literal is LOW-VALUE.
- `src/rules/equipment-packages.ts` (6/0/6): quantity/list parsing boundaries; test empty entries and quantity 0/1 while leaving five regex mutants and one diagnostic sentence LOW-VALUE.
- `src/eligibility/eligible-spell-search.ts` (9/0/1): fixed/current selection, collection filter, query predicate, and SQL school placeholders; test each branch. Only not-found prose is LOW-VALUE; the error `name` is real.
- `src/eligibility/spell-selection-assignment.ts` (10/0/0): decoded-list types, lock gate, dependency injection, acquired-level optionality, duplicate detection, and SQL IDs; exercise each state once.
- `src/grants/configured-choice-rule-errors.ts` (0/0/10): expectation phrase wording only; no new tests.
- `src/grants/grant-rule-errors.ts` (0/1/9): message wording only plus one equivalent `cause` option; no new tests.
- `src/grants/configured-choice-material-reader.ts` (8/0/0): class/subclass definition guards and duplicate material detection; test null definitions, empty iteration, and an existing versus novel rule key.
- `src/rules/legacy-armor-class-adjustment.ts` (7/0/0): −20/+20 boundaries, legacy-column presence, and nullish timestamp; assert exact retained adjustment rows.
- `src/rules/legacy-trait-effects.ts` (6/0/0): nonblank labels and legacy-effect presence; test empty/nonempty names and a row with/without a legacy payload.
- `src/rules/ability-contributions.ts` (4/1/0): positive/negative/zero arithmetic, per-ability override filtering, and equal-to-increased status; use order-sensitive capped increases and equal SET targets.
- `src/rules/attack-cantrips.ts` (3/0/2): source-key collision and empty access; test identical source names with null versus nonnull ability and zero/one source. Printed names are LOW-VALUE.
- `src/rules/equipment-package-display.ts` (5/0/0): owner type and gear/catalog-layer projection; test numeric/non-numeric owner and null/gear/other layer values.
- `src/rules/extra-attack.ts` (2/1/2): unresolved filtering above the resolved maximum; test resolved/unresolved grants equal to and above `count`. Two explanatory strings are LOW-VALUE.
- `src/grants/source-rule-reader-errors.ts` (0/0/4): diagnostic label/ternary wording only; no new tests.
- `src/rules/species-effects.ts` (3/0/1): null/known effect dispatch and exhaustive ability-increase arm; test null kind and a valid ability effect. The thrown sentence is LOW-VALUE.
- `src/rules/eligible-character-effects.ts` (3/0/0): acquisition versus display ordering; use rows whose IDs and sort orders disagree and assert exact order.
- `src/rules/sheet-content-lookup.ts` (3/0/0): null IDs/content keys versus resolved lookup branches; test each nullable relation independently.
- `src/eligibility/spell-selection-service.ts` (2/0/0): locked slot refusal; test locked and unlocked slots and assert no mutation on refusal.
- `src/grants/equipment-grants-errors.ts` (0/0/2): displayed-kind prose only; no new tests.
- `src/rules/ability-scores.ts` (2/0/0): number and safe-integer conjunction; test numeric fraction, numeric integer, numeric unsafe integer, and numeric-looking string.
- `src/rules/generated-feature-effects.ts` (2/0/0): max sort order and character-ID binding; seed two characters and assert the new row follows only the target's maximum.
- `src/rules/save-dc.ts` (2/0/0): exact lower boundaries; test DC 1 versus 0 and proficiency bonus 0 versus −1.
- `src/rules/weapon-mastery-lookup.ts` (2/0/0): null versus invalid versus known grant; assert fail-closed behavior for each.
- `src/grants/grant-rule-slot-generator-errors.ts` (0/0/1): missing/inactive sentence selection only; no new test.
- `src/rules/multiclass-prerequisite-house-rule.ts` (1/0/0): waived versus enforced result; assert both.
- `src/rules/progression-type.ts` (1/0/0): non-string acceptance; test known string, unknown string, and non-string.
- `src/rules/spell-level.ts` (1/0/0): cantrip predicate; assert level 0 and level 1.
- `src/rules/srd-attribution.ts` (0/0/1): excluded regex-literal mutation; no new test solely for the mutant.

## Equivalent proofs

Each equivalence claim names the construction that prevents observability:

| Mutant | Proof |
|---|---|
| `src/rules/sheet.ts#2013` at line 1183 | Forcing the spread conditional false only adds `expertise: undefined` when the property was absent; `skillModifier` reads the value, so absent and explicitly undefined take the same branch and return the same number. |
| `src/rules/sheet.ts#2040` at line 1266 | `martial_arts_dice` is a `ReadonlyMap`, so iteration cannot present the same level key twice; changing `level > best.level` to `>=` can differ only on an impossible duplicate key. |
| `src/rules/sheet.ts#2507` at line 1842 | The preceding `if (pactContributions.length === 1)` consumes length 1; at the `else if`, `> 1` and `>= 1` are identical over the only remaining lengths, 0 and 2+. |
| `src/grants/grant-rule-errors.ts#393` at line 188 | The constructor parameter is itself a `readonly cause` parameter property, assigned to `this.cause` after `super`; removing `{ cause }` from the `Error` options leaves the same own `cause` value and all other fields unchanged. |
| `src/rules/extra-attack.ts#423` at line 272 | When `grant.attack_count === count`, the mutated branch only assigns `count = grant.attack_count`, an idempotent assignment with no other side effect or trace output. |
| `src/rules/ability-contributions.ts#88` at line 138 | For amount 0, both the positive formula and the nonpositive formula leave `running` unchanged; the branch choice is not emitted, and the contribution list itself is returned unchanged. |

## Confidence and sampling

No file was classified by sampling. Every survivor was read from the eight reports, and the current source line was inspected for every REAL-GAP and EQUIVALENT verdict; the same pass also inspected LOW-VALUE locations to distinguish prose literals from IDs, discriminators, SQL, error parameters, and arithmetic strings. Files were processed in descending survivor count, beginning with `sheet.ts`, `attack-profiles.ts`, `configured-choice-rule.ts`, `feat-application.ts`, and `srd-subclasses.ts`.

Confidence is high for the REAL-GAP and EQUIVALENT sets. LOW-VALUE is policy-sensitive but follows the binding local decisions: 28 regex-literal mutants use the campaign exclusion, and the other 232 change only diagnostic/explanatory wording or display formatting for which exact text is non-contractual. Mutations that remove a non-prose structured result, mechanical list entry, warning code, source identity, error name, or error parameter were not put in LOW-VALUE merely because nearby prose exists.

## Exact disposition ledger

Notation is `mutant-id@source-line`. `R`, `E`, and `L` mean REAL-GAP, EQUIVALENT, and LOW-VALUE. The ledger is the exact one-of-three assignment; its counts reconcile to the summary above.

### `src/rules/sheet.ts`

- R: 1728@635, 1730@635, 1942@1002, 1948@1018, 1950@1018, 1958@1027, 1962@1030, 1963@1030, 1964@1030, 1965@1030, 1966@1030, 1984@1106, 1994@1136, 1998@1136, 2012@1183, 2014@1183, 2015@1185, 2035@1266, 2062@1403, 2064@1403, 2065@1403, 2069@1409, 2071@1409, 2072@1409, 2077@1415, 2078@1415, 2079@1415, 2080@1415, 2082@1415, 2085@1415, 2086@1415, 2123@1478, 2184@1532, 2185@1532, 2186@1532, 2187@1532, 2193@1532, 2194@1532, 2214@1559, 2225@1562, 2227@1562, 2230@1563, 2243@1571, 2246@1572, 2257@1587, 2258@1587, 2260@1587, 2265@1590, 2266@1590, 2267@1590, 2268@1590, 2269@1590, 2275@1593, 2276@1593, 2277@1593, 2278@1593, 2279@1593, 2285@1596, 2286@1596, 2287@1596, 2288@1596, 2289@1596, 2290@1596, 2296@1599, 2297@1599, 2298@1599, 2299@1599, 2300@1599, 2301@1599, 2302@1599, 2303@1599, 2304@1599, 2305@1599, 2307@1602, 2309@1602, 2310@1602, 2313@1602, 2324@1615, 2399@1730, 2424@1748, 2437@1758, 2439@1758, 2460@1783, 2461@1783, 2470@1794, 2501@1829, 2531@1864, 2546@1895, 2553@1908
- E: 2013@1183, 2040@1266, 2507@1842
- L: 1702@549, 1704@549, 1707@551, 1708@552, 1709@553, 1710@554, 1741@645, 1744@647, 1749@658, 1750@659, 1752@660, 1778@836, 1779@837, 1815@853, 1852@913, 1853@913, 1854@913, 1856@913, 1857@913, 1858@914, 1859@914, 1860@914, 1861@914, 1863@914, 1864@914, 1865@915, 1880@925, 2189@1532, 2190@1532, 2369@1692, 2443@1761, 2548@1899, 2568@1918, 2589@1952, 2603@1965, 2614@1981, 2615@1981, 2616@1981, 2618@1981, 2621@1988

### `src/rules/attack-profiles.ts`

- R: 748@423, 788@487, 907@658, 1169@1191, 1171@1191, 1172@1191, 1175@1192
- E: —
- L: 703@345, 704@346, 705@347, 712@355, 713@356, 719@363, 721@365, 726@371, 727@372, 728@373, 729@374, 736@396, 737@397, 769@468, 772@469, 773@470, 774@470, 778@475, 781@481, 793@491, 794@492, 795@493, 796@494, 797@495, 800@501, 801@502, 802@502, 803@502, 804@502, 806@502, 807@502, 808@503, 809@504, 810@505, 870@622, 871@622, 874@625, 875@625, 876@625, 877@625, 879@626, 897@649, 898@650, 915@663, 927@710, 931@722, 932@723, 944@742, 945@743, 947@754, 948@759, 949@760, 950@761, 960@812, 965@822, 966@823, 969@828, 977@838, 978@839, 984@850, 985@851, 986@852, 987@855, 988@856, 989@857, 990@858, 994@898, 997@902, 998@903, 1001@908, 1003@914, 1008@922, 1009@923, 1012@930, 1014@932, 1015@933, 1016@934, 1017@935, 1018@938, 1025@968, 1028@981, 1029@982, 1041@999, 1042@999, 1091@1080, 1093@1082, 1112@1099, 1113@1100, 1114@1100, 1115@1100, 1116@1101, 1117@1102, 1125@1108, 1126@1109, 1130@1113, 1132@1115, 1186@1219, 1188@1221, 1189@1222, 1190@1222, 1191@1222, 1192@1222, 1193@1222, 1195@1223, 1196@1226, 1197@1227

### `src/grants/configured-choice-rule.ts`

- R: 316@95, 317@95, 318@95, 319@95, 320@95, 322@95, 333@109, 334@109, 337@110, 339@110, 349@117, 351@117, 352@117, 355@120, 358@125, 359@125, 360@125, 361@125, 363@125, 365@125, 366@125, 375@132, 385@143, 387@144, 402@154, 403@154, 405@154, 412@162, 413@166, 424@170, 425@171, 441@187, 442@187, 443@187, 446@187, 452@190, 458@194, 459@195, 461@197, 462@201, 465@224, 478@230, 479@230, 480@230, 483@230, 487@233, 489@234, 492@237, 496@238, 497@241, 499@244, 500@244, 501@244, 503@245, 504@245, 508@252, 509@259, 511@262, 513@262, 516@269, 518@271, 526@277, 527@277, 529@279, 537@285, 539@286, 541@290, 546@294, 551@300, 556@301, 558@301, 559@301, 564@308, 566@311, 567@314, 569@318, 576@324, 579@335, 580@341, 582@347, 584@347, 585@348, 586@348, 588@348, 592@353, 594@353, 595@354, 596@354, 598@355, 600@355, 602@355, 607@362, 608@363, 617@387, 631@398
- E: —
- L: —

### `src/rules/feat-application.ts`

- R: 593@96, 601@104, 606@110, 612@112, 614@112, 636@121, 642@124, 644@126, 822@306, 829@307, 830@307, 835@312, 837@312, 843@318, 875@351, 877@351, 878@351, 880@352, 881@352, 908@377, 910@377, 911@377, 943@408, 944@410, 946@410, 947@410, 951@411, 954@411, 956@418, 962@421, 966@421, 990@439, 996@446, 1003@447, 1007@448, 1009@450, 1015@451, 1016@451, 1019@453, 1035@463, 1066@501, 1070@501, 1071@501, 1072@501, 1073@501, 1075@502, 1077@503, 1081@504, 1082@504, 1084@505, 1087@505, 1088@505, 1090@505, 1094@506, 1095@506, 1097@507, 1099@507, 1104@508, 1136@556, 1142@557, 1144@559, 1149@577, 1150@577, 1151@577, 1153@578, 1154@578, 1155@578, 1218@655, 1219@655, 1220@655, 1223@656, 1225@656, 1239@680, 1260@715, 1262@715, 1265@717, 1319@774, 1322@775, 1327@777
- E: —
- L: 596@103, 604@109, 623@118, 624@118, 627@118, 647@126, 648@126, 649@127, 650@127

### `src/rules/srd-subclasses.ts`

- R: 610@23, 685@465, 688@465, 691@470, 693@470, 694@470, 713@502, 745@523, 760@538, 766@550, 767@550, 769@550, 770@550, 780@553, 781@553, 782@553, 809@593, 810@593, 811@593, 813@593, 814@593, 816@593, 818@593, 835@618, 840@624, 853@630, 855@630, 868@653, 870@653, 888@680, 905@693, 989@767, 1020@782, 1021@785, 1036@797, 1040@806, 1070@849, 1083@862, 1089@869, 1095@878, 1096@878, 1097@878, 1099@879, 1100@880, 1102@880, 1110@891, 1111@891, 1112@891, 1114@892, 1115@892, 1117@895, 1123@896, 1125@897, 1126@898, 1128@898, 1130@902, 1137@908, 1149@915, 1178@957, 1214@1015, 1215@1015, 1216@1015, 1218@1015, 1220@1015, 1232@1041, 1233@1041, 1234@1041, 1236@1041, 1254@1070, 1313@1136, 1316@1136, 1318@1136
- E: —
- L: 678@461, 679@461, 686@465, 720@508, 825@616, 826@616, 871@655, 927@717, 933@729, 934@729, 1011@776, 1012@776, 1013@776, 1014@776, 1066@845, 1131@904

### `src/grants/grant-rule-slot-generator.ts`

- R: 164@127, 166@127, 167@127, 168@127, 169@127, 171@127, 176@132, 198@145, 247@209, 248@210, 249@211, 258@223, 259@223, 288@280, 291@280, 302@288, 319@348, 321@348, 324@354, 326@354, 327@354, 328@354, 329@355, 330@355, 332@356, 333@356, 338@370, 339@370, 341@371, 345@379, 350@386, 359@395, 379@419, 381@419, 391@443, 393@443, 394@443, 404@452, 405@452, 406@452, 408@452, 416@496, 431@500, 433@501, 435@501, 442@503, 450@517, 451@517, 452@517, 454@518, 458@523, 475@543, 477@543, 497@611, 498@611, 580@801, 583@801, 584@801, 607@863, 608@863, 609@863, 612@866, 613@866, 614@866, 640@925, 643@925, 644@925, 652@953, 657@962, 659@973, 660@975, 661@975, 662@975, 665@978, 666@978, 667@978, 668@996
- E: —
- L: —

### `src/grants/grant-rule.ts`

- R: 397@109, 399@109, 402@116, 406@119, 408@119, 409@119, 411@119, 448@137, 451@140, 467@165, 487@180, 489@180, 490@180, 530@224, 531@224, 532@224, 533@224, 535@225, 538@226, 552@242, 570@249, 633@297, 636@298, 657@309, 659@309, 660@309, 685@327, 687@327, 688@327, 696@333, 725@343, 731@344, 739@350, 754@361, 766@367, 767@367, 768@367, 775@368, 777@368, 778@368, 793@389, 815@395, 821@397, 823@397, 824@397, 836@410, 837@410, 838@410, 840@410, 842@411, 847@417, 852@418, 854@418, 855@418, 861@427, 866@428, 868@428, 875@434, 878@434, 881@438, 884@438, 886@442, 887@442, 888@442, 890@442, 892@445, 964@527, 981@555, 1005@587, 1008@592, 1010@592, 1014@598, 1016@598, 1018@601, 1020@601
- E: —
- L: —

### `src/grants/skill-grants.ts`

- R: 225@81, 250@174, 256@180, 258@180, 261@182, 265@191, 275@207, 276@207, 279@209, 331@294, 347@316, 349@316, 361@371, 385@397, 391@403, 404@410, 414@418, 415@419, 441@474, 444@474, 452@495, 453@497, 456@497, 457@497, 469@549, 470@549, 471@549, 504@595, 513@600, 523@611, 537@633, 538@633, 554@676, 573@687, 575@687, 576@687, 578@688, 584@691, 588@691, 595@711, 596@711, 597@711, 600@711, 606@719, 613@764, 621@785, 660@851, 691@913
- E: —
- L: 655@846, 671@867, 680@875, 685@882, 699@920

### `src/grants/character-level-source-reconciliation.ts`

- R: 97@22, 99@22, 101@23, 102@23, 103@23, 105@24, 106@24, 107@24, 112@27, 115@30, 117@35, 120@38, 128@39, 129@39, 130@39, 131@40, 132@40, 135@43, 137@43, 143@53, 145@53, 147@54, 149@54, 150@56, 151@56, 152@56, 155@65, 156@65, 157@65, 159@65, 161@65, 162@66, 164@66, 165@67, 170@73, 173@94, 174@97, 175@97, 179@97, 192@132
- E: —
- L: —

### `src/grants/equipment-grants.ts`

- R: 98@86, 108@130, 112@134, 132@157, 140@173, 151@176, 153@176, 159@184, 162@186, 174@198, 180@199, 184@202, 191@203, 200@207, 236@287, 237@287, 238@287, 241@287, 256@320, 258@320, 259@321, 261@321, 262@321, 263@321, 264@321, 267@321, 282@334, 284@335, 316@428, 345@476, 347@476, 352@477, 377@522
- E: —
- L: 209@224, 210@225, 314@426, 367@501, 368@502, 369@503, 375@520

### `src/rules/sheet-feature-values.ts`

- R: 1337@163, 1360@200, 1362@204, 1387@246, 1388@246, 1391@246, 1422@320, 1461@378, 1497@411, 1498@412, 1501@414, 1512@437, 1514@437, 1518@438, 1542@482, 1551@486, 1579@529, 1584@542, 1585@542, 1586@542, 1588@543, 1593@549, 1596@553, 1635@593, 1636@593, 1638@593, 1639@593, 1643@596, 1644@597, 1647@599, 1653@610, 1656@617, 1658@618, 1660@618, 1665@622
- E: —
- L: 1410@312, 1462@381, 1597@556

### `src/access/spell-access-builder.ts`

- R: 68@297, 70@297, 72@298, 73@298, 74@298, 75@298, 76@298, 78@298, 90@302, 92@302, 124@339, 125@339, 127@344, 128@344, 130@346, 140@350, 166@483, 168@483, 176@503, 183@512, 201@566, 205@610, 208@610, 209@610, 210@610, 217@613, 219@614, 248@691, 266@752, 270@752, 271@752, 272@752, 273@752, 274@752, 277@753, 280@754, 286@757
- E: —
- L: —

### `src/rules/legacy-level-feat-choices.ts`

- R: 299@23, 300@23, 301@23, 302@23, 304@23, 307@23, 346@30, 347@30, 348@30, 353@34, 356@35, 357@35, 363@38, 365@39, 367@40, 369@41, 371@42, 373@43, 375@44, 377@45, 379@46, 381@47, 383@48, 395@56, 397@56, 398@56, 399@56, 402@57, 419@96, 422@96, 433@108, 444@119, 446@122, 449@137, 450@137
- E: —
- L: —

### `src/grants/skill-expertise-grants.ts`

- R: 29@61, 50@103, 83@160, 93@182, 95@182, 96@182, 100@184, 101@184, 102@184, 103@184, 104@184, 105@184, 106@184, 107@184, 109@185, 110@185, 111@186, 112@186, 113@187, 114@187, 144@250, 152@275, 154@282, 169@343, 176@349, 180@363, 181@363, 187@367, 209@401, 222@417, 229@424, 234@433, 238@434, 248@443
- E: —
- L: —

### `src/rules/srd-subclass-content.ts`

- R: 1377@132, 1380@133, 1388@143, 1450@227, 1451@227, 1452@227, 1453@227, 1454@227, 1456@228, 1458@229, 1462@231, 1464@232, 1466@233, 1478@254, 1479@254, 1481@255, 1483@258, 1485@258, 1486@258, 1494@259, 1496@260, 1499@261, 1501@262, 1503@265, 1505@266, 1507@272, 1518@288, 1520@289, 1522@291, 1556@380, 1567@410, 1574@427
- E: —
- L: —

### `src/grants/grant-rule-planner.ts`

- R: 55@79, 66@84, 68@84, 91@99, 93@99, 94@99, 97@102, 102@114, 113@132, 114@132, 115@132, 116@132, 117@132, 118@133, 119@133, 121@135, 122@135, 127@137, 136@172, 144@174, 147@175, 149@179, 157@181, 187@232, 190@232, 201@259
- E: —
- L: —

### `src/grants/source-rule-reader.ts`

- R: 1081@117, 1083@117, 1084@117, 1086@117, 1090@121, 1092@121, 1101@137, 1103@139, 1104@139, 1105@139, 1106@139, 1107@139, 1114@139, 1122@150, 1130@156, 1132@156, 1148@179, 1191@241, 1227@267, 1252@295, 1254@297, 1258@297, 1261@297, 1262@298, 1268@306, 1276@320
- E: —
- L: —

### `src/rules/multiclass-prerequisite-gate.ts`

- R: 347@347, 349@347, 372@394
- E: —
- L: 213@105, 214@106, 215@107, 220@117, 226@118, 227@118, 228@118, 229@118, 230@118, 233@124, 234@124, 235@124, 243@132, 248@147, 252@147, 262@172, 266@174, 274@182, 276@185

### `src/eligibility/spell-selection-eligibility.ts`

- R: 20@90, 27@100, 64@176, 69@176, 70@177, 117@234, 126@248, 127@248, 128@248, 129@248, 132@250, 151@274, 153@274, 185@318, 198@354, 199@354, 200@354, 201@354, 202@355, 203@355, 204@356
- E: —
- L: —

### `src/rules/multiclass-proficiency.ts`

- R: 764@125, 766@126, 768@126, 778@129, 818@214, 842@236
- E: —
- L: 772@129, 774@129, 863@326, 864@327, 865@328, 871@336, 872@337, 891@368, 892@368, 893@368, 894@368, 896@368, 897@368, 899@370, 900@371

### `src/rules/class-progression-lookup.ts`

- R: 1394@276, 1404@311, 1411@323, 1432@324, 1434@325, 1436@326, 1438@327, 1440@328, 1442@329, 1444@330, 1446@331, 1448@332, 1454@342, 1455@345, 1503@439, 1505@439, 1519@457, 1521@457, 1628@654
- E: —
- L: —

### `src/eligibility/spell-selection-constraint.ts`

- R: 10@29, 12@29, 26@39, 27@39, 29@39, 40@53, 41@53, 42@53, 43@53, 44@53, 45@53, 46@53, 47@53, 50@55, 53@56, 56@57
- E: —
- L: —

### `src/eligibility/spell-selection-collection.ts`

- R: 4@34, 39@124, 43@124, 44@125, 45@125, 46@125, 56@151, 63@167, 65@187, 69@191, 73@195, 82@207, 83@209, 89@224
- E: —
- L: —

### `src/rules/skills.ts`

- R: 559@64, 575@109, 577@109, 584@115, 585@115, 587@115, 593@122, 600@129, 603@135, 606@136, 610@142, 624@172
- E: —
- L: 567@76

### `src/rules/equipment-packages.ts`

- R: 1246@61, 1255@66, 1257@66, 1286@115, 1287@115, 1289@115
- E: —
- L: 1225@29, 1228@29, 1232@30, 1233@30, 1236@30, 1326@169

### `src/eligibility/eligible-spell-search.ts`

- R: 19@51, 27@63, 31@67, 56@149, 58@151, 65@181, 106@259, 109@259, 129@292
- E: —
- L: 18@49

### `src/eligibility/spell-selection-assignment.ts`

- R: 12@59, 14@59, 39@112, 58@167, 66@186, 80@197, 82@200, 83@200, 90@234, 92@240
- E: —
- L: —

### `src/grants/configured-choice-rule-errors.ts`

- R: —
- E: —
- L: 289@17, 291@19, 292@20, 293@21, 294@22, 295@23, 296@24, 297@25, 298@26, 299@27

### `src/grants/grant-rule-errors.ts`

- R: —
- E: 393@188
- L: 353@15, 354@16, 355@17, 356@18, 357@19, 363@24, 364@24, 365@24, 367@24

### `src/grants/configured-choice-material-reader.ts`

- R: 249@37, 251@37, 252@38, 278@69, 280@70, 281@70, 282@70, 284@70
- E: —
- L: —

### `src/rules/legacy-armor-class-adjustment.ts`

- R: 253@51, 256@52, 257@52, 274@73, 276@73, 278@74, 293@101
- E: —
- L: —

### `src/rules/legacy-trait-effects.ts`

- R: 455@97, 456@97, 464@128, 465@128, 484@144, 485@144
- E: —
- L: —

### `src/rules/ability-contributions.ts`

- R: 86@138, 99@151, 101@152, 143@223
- E: 88@138
- L: —

### `src/rules/attack-cantrips.ts`

- R: 281@127, 282@127, 323@199
- E: —
- L: 258@54, 259@55

### `src/rules/equipment-package-display.ts`

- R: 350@90, 366@128, 369@131, 370@131, 371@131
- E: —
- L: —

### `src/rules/extra-attack.ts`

- R: 433@281, 434@281
- E: 423@272
- L: 389@159, 402@210

### `src/grants/source-rule-reader-errors.ts`

- R: —
- E: —
- L: 408@29, 409@30, 412@49, 420@83

### `src/rules/species-effects.ts`

- R: 565@134, 567@134, 585@152
- E: —
- L: 597@199

### `src/rules/eligible-character-effects.ts`

- R: 483@209, 484@209, 485@209
- E: —
- L: —

### `src/rules/sheet-content-lookup.ts`

- R: 495@379, 516@468, 528@485
- E: —
- L: —

### `src/eligibility/spell-selection-service.ts`

- R: 231@82, 232@82
- E: —
- L: —

### `src/grants/equipment-grants-errors.ts`

- R: —
- E: —
- L: 9@59, 19@75

### `src/rules/ability-scores.ts`

- R: 432@65, 433@65
- E: —
- L: —

### `src/rules/generated-feature-effects.ts`

- R: 728@67, 730@71
- E: —
- L: —

### `src/rules/save-dc.ts`

- R: 395@12, 406@21
- E: —
- L: —

### `src/rules/weapon-mastery-lookup.ts`

- R: 635@93, 636@93
- E: —
- L: —

### `src/grants/grant-rule-slot-generator-errors.ts`

- R: —
- E: —
- L: 7@40

### `src/rules/multiclass-prerequisite-house-rule.ts`

- R: 501@99
- E: —
- L: —

### `src/rules/progression-type.ts`

- R: 1651@15
- E: —
- L: —

### `src/rules/spell-level.ts`

- R: 1351@14
- E: —
- L: —

### `src/rules/srd-attribution.ts`

- R: —
- E: —
- L: 540@14
