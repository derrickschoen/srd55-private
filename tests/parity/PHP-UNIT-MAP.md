# PHP Unit parity map

Oracle inventory: 57 top-level Pest cases in the six files under
`tests/Unit/*.php`. Pest datasets are part of their containing case; the
TypeScript suite keeps those vectors in consolidated `it`/`it.each` cases.

Evidence keys:

- `V` — `tests/unit/commands/payload-validator.test.ts`
- `X` — `tests/integration/commands/executor.test.ts` and the three owned
  command integration shards
- `RV` — `tests/unit/rules/value-objects.test.ts`
- `RS` — `tests/unit/rules/multiclass-slots.test.ts`
- `RP` — `tests/unit/rules/properties.test.ts`
- `RC` — `tests/integration/rules/class-progression.test.ts`
- `A` — `tests/unit/access/assignment.test.ts`,
  `tests/integration/access/spell-access.test.ts`, and
  `tests/unit/invariants.test.ts`
- `D` — `tests/unit/duplicates/detector.test.ts` and
  `tests/integration/reports/build-report.test.ts`
- `G` — `tests/unit/grants/grant-rule.test.ts` and
  `tests/integration/grants/slot-generator.test.ts`
- `T80-A` — `php-unit-parity.test.ts`, persisted assignment hydration
- `T80-S` — `php-unit-parity.test.ts`, persisted six-class seed

`X`, `A`, `D`, `G`, `RC`, and both T80 cases assert SQLite rows. Rejection
cases assert that invalid input stores no row; read-only cases compare stored
state before and after derivation.

| # | PHP oracle case | TypeScript evidence | Parity disposition |
|---:|---|---|---|
| 1 | Payload validator: accepts every complete public command payload and preserves every allowed field | `V` all public variants; `X` “constructs every public command variant and refuses both stored-only restore forms,” then persists accepted mutations | Covered |
| 2 | Payload validator: accepts each command enum branch | `V` every slot/source/warning/class branch; `X` persisted command variants | Covered |
| 3 | Payload validator: accepts every restored slot state and eligibility enum | `V` restored-row enum matrix; `X` ability/slot restore rows | Covered |
| 4 | Payload validator: rejects exact string and scalar boundaries | `V` exact string, Unicode, integer, integrity, and object boundaries | Covered |
| 5 | Payload validator: rejects malformed add and remove source payload shapes directly | `V` unknown/typed/class-config cases; `X` source commands leave no residue on rejection | Covered |
| 6 | Payload validator: rejects command-specific malformed fields before domain execution | `V` closed enums, conditional fields, and unknown fields; `X` pre-write factory validation | Covered |
| 7 | Payload validator: rejects every malformed restored slot field directly | `V` complete restored-row field/enum validation; `X` rejected restores preserve stored slot bytes | Covered |
| 8 | Domain types: puts shared caster contribution and preparation behavior on progression types | `RV` progression helpers; `RS`, `RC`, and `T80-S` stored class derivation | Covered |
| 9 | Domain types: represents bounded rules numbers with value objects | `RV` bounds, modifier, attack bonus, and save DC | Covered |
| 10 | Domain types: hydrates exactly one spell-slot assignment state | `A` pure/exclusive/route coverage plus `T80-A` exact stored references | T80 cross-slice added |
| 11 | Domain types: exposes the problem vocabulary as backed enums | `V` abilities/slot states, `G` six kinds/buckets, `A` usable override behavior | Covered |
| 12 | Duplicate detector: classifies wasteful intentional conflicting and unique access | `D` complete severity contract from stored access-route fixtures | Covered |
| 13 | Duplicate detector: returns the complete sorted duplicate assessment contract | `D` exact object, explanation, ordering, versions, and fingerprint | Covered |
| 14 | Duplicate detector: returns duplicate source names as a compact list | `D` compact sources with all non-empty persisted selection keys | Covered |
| 15 | Grant rule: rejects an unknown grant-rule kind | `G` obsolete/unknown kinds and zero persisted definitions | Covered |
| 16 | Grant rule: rejects malformed rules with a clear field-specific message | `G` exact validation messages and zero persisted definitions | Covered |
| 17 | Grant rule: normalizes a valid fixed spell rule | `G` six-kind stored JSON contract | Covered |
| 18 | Grant rule: accepts all six documented rule kinds | `G` exact six-kind stored array; slot generator proves slot/non-slot behavior | Covered |
| 19 | Grant rule: forbids capability counts because capabilities never mint slots | `G` exact capability count rejection; generator stores no capability slot | Covered |
| 20 | Grant rule: round-trips validated JSON for storage | `G` `fromJson`/`toJson`, insert, reread, and decode | Covered |
| 21 | Grant rule: normalizes an exact source-config activation predicate | `G` normalized predicate stored and reread; generator exercises activation | Covered |
| 22 | Grant rule: rejects malformed source-config activation predicates | `G` exact-shape/empty-value rejection and zero rows | Covered |
| 23 | Grant rule: normalizes documented defaults for every kind | `G` exact stored defaults for all six kinds | Covered |
| 24 | Grant rule: rejects every documented malformed field shape | `G` malformed contract matrix and zero rows after every rejection | Covered |
| 25 | Grant rule: accepts each independent query predicate | `G` four independently stored predicates | Covered |
| 26 | Grant rule: accepts each independent granted-source reference | `G` all three persisted reference forms | Covered |
| 27 | Grant rule: trims normalized identifiers and preserves the complete free-cast contract | `G` stored trimming, four recoveries, and both pool scopes | Covered |
| 28 | Grant rule: rejects invalid JSON and non-object JSON | `G` invalid JSON matrix and zero rows | Covered |
| 29 | Grant rule: reports the malformed free-cast field that caused validation to fail | `G` exact scalar/recovery/pool errors and zero rows | Covered |
| 30 | Grant rule: stores JSON without escaping slashes | `G` URL key survives JSON serialization and SQLite reread unchanged | Covered |
| 31 | Multiclass slots: accepts level zero as an empty class contribution | `RS` full progression zero boundary | Covered |
| 32 | Multiclass slots: rounds Paladin and Ranger up, each class independently | `RS` round-before-sum; `RC` stored half-up metadata; `T80-S` stored level-one Paladin | Covered |
| 33 | Multiclass slots: rounds third-casters down, each class independently | `RS` two third-down classes; `RC` persisted subclass breakpoints | Covered |
| 34 | Multiclass slots: counts half-casters up across the whole range | `RS` half-up behavior/properties; `RC` persisted Paladin/Ranger breakpoints | Covered |
| 35 | Multiclass slots: counts full casters at face value | `RS` full progression vector and generated properties | Covered |
| 36 | Multiclass slots: rejects an unknown progression type instead of silently returning zero | `RS` exact unknown-progression rejection | Covered |
| 37 | Multiclass slots: pins every progression type across its rounding boundaries | `RS` progression `it.each` vectors; `RC` stored class/subclass metadata | Covered |
| 38 | Multiclass slots: matches the published table at every caster level 1–20 | `RS` complete shared slot table; `RC` stored progression rows | Covered |
| 39 | Multiclass slots: gives no slots below caster level 1 | `RS` caster-level-zero table row | Covered |
| 40 | Multiclass slots: caps epic caster levels at the level twenty row | `RS` level-21 cap | Covered |
| 41 | Multiclass slots: Pact contributes nothing to the multiclass caster level | `RS` shared/Pact separation; persisted report fixture in `D` | Covered |
| 42 | Multiclass slots: reports the Pact pool independently | `RS` Wizard/Warlock pool assertion; persisted report fixture in `D` | Covered |
| 43 | Multiclass slots: matches every Pact Magic breakpoint and caps epic Warlock levels | `RS` complete Pact level 1–21 matrix; `RC` stored Warlock rows | Covered |
| 44 | Multiclass slots: adds levels from multiple Pact Magic contributions | `RS` multiple-Pact contribution case | Covered |
| 45 | Multiclass slots: returns no Pact pool when there is no Warlock | `RS` no-Pact case; `T80-S` persisted non-Warlock build | Covered |
| 46 | Multiclass slots: pins each progression preparation table independently of shared slots | `RS` all seven preparation tables; `RC` persisted progression tables | Covered |
| 47 | Multiclass slots: proficiency steps at every published boundary | `RS` complete proficiency boundary matrix | Covered |
| 48 | Multiclass slots: seed reaches caster level 6 from six level-one classes | `RS` pure seed; `T80-S` exact six stored rows and report caster level | T80 cross-slice added |
| 49 | Multiclass slots: seed possesses 4/3/3 slots including third level | `RS` pure seed; `T80-S` exact stored-source report slot rows | T80 cross-slice added |
| 50 | Multiclass slots: seed has proficiency +3 because character level is 6 | `RS` pure seed; `T80-S` stored character-level report result | T80 cross-slice added |
| 51 | Multiclass slots: seed cannot prepare above first level despite third-level slots | `RS` pure seed; `T80-S` all six stored class ceilings plus third-level slots | T80 cross-slice added |
| 52 | Rules property: caster level stays monotonic as any class level increases | `RP` 1,000 deterministic generated builds | Covered |
| 53 | Rules property: Warlock Pact pool never enters shared multiclass slots | `RP` 1,000 deterministic generated builds | Covered |
| 54 | Rules property: proficiency depends only on total character level | `RP` 1,000 deterministic paired builds | Covered |
| 55 | Rules property: adding a non-caster level does not change shared slots | `RP` 1,000 deterministic generated builds | Covered |
| 56 | Rules property: a single class never prepares above its highest possessed slot | `RP` 1,000 deterministic generated casters | Covered |
| 57 | Rules property: slot counts do not increase as spell level rises | `RP` 1,000 deterministic generated builds | Covered |

Result: all 57 oracle cases map to executable TypeScript evidence. T80 adds
only the two missing SQLite/value-object seams; all other parity remains owned
by its existing focused shard. Integrated review additionally pins the complete
six-class character projection (identity, name, abilities, total level, and
proficiency) instead of accepting a partial object.
