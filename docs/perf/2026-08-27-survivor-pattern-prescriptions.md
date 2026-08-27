# Mutation survivors as type-system design feedback

Date: 2026-08-27

## Executive prescription

Land the structural-vocabulary, result-returning validation, exact-table, and
typestate waves **before** the party-pack kill batches. Together they should
prevent roughly **275–380 of party-pack's 1,196 live mutants** (665 `Survived`
+ 531 `NoCoverage`), or about **23–32%**, before writing mutation-specific
tests. A reasonable post-refactor target is **470–530 survived plus 346–391
no-coverage** (816–921 live total). The remaining burden is dominated by real
runtime policy, external-input validation, numeric boundaries, collection
search, ordering, and error behavior; those need tests.

The highest-return change is to stop passing serialization paths, field names,
refusal reasons, and closed ids as `string`/`PropertyKey`. An audited lexical
slice finds **156 party-pack live `StringLiteral` mutants** at those structural
sites: 39 survived and 117 no-coverage. The same slice has 60 mutants currently
killed by tests and 126 already rejected as compile errors. A generated path
union, exact key records, brands, and `satisfies` can move most of the first two
groups into `CompileError` and retire much of the third group's test burden.

Do not pursue the headline percentage by weakening Stryker or by encoding test
expectations in types. Two outcomes are both useful and should be reported
separately:

1. A stricter contextual type makes the mutant fail compilation. This raises
   the `CompileError` fraction directly.
2. A typestate refactor deletes a redundant guard or optional operation, so the
   mutation opportunity no longer exists. This lowers the denominator and the
   test burden, but is not a new compile error.

## Evidence and counting method

The report was read at filesystem timestamp `2026-08-27 10:10:48 -0400` while
another mutation lane was active. That immutable read contained **7,991**
mutants: 3,681 `CompileError`, 3,064 `Killed`, 536 `NoCoverage`, 701 `Survived`,
and 9 `Timeout`. The owner's campaign snapshot (7,979 total / 3,671 compile
errors) and this read both round to **46.0% compile errors**. The party-pack
slice was unchanged at 4,583 total: 2,002 compile errors, 1,385 killed, 531
no-coverage, and 665 survived.

Counts below use `S/NC` for `Survived`/`NoCoverage`. Module abbreviations are:
`C` controllers, `L` local-session-store, `P` party-pack, `R` session-record,
`D` stable-dom-render, `S` survival-policy, and `V` vane-warren. “Prevented” is
a conservative estimate after removing overlaps; it is not represented as an
observed status.

The equivalence ledger contains 53 proofs. It repeatedly exposes facts better
expressed structurally: a projection discriminated by the presence of
`viewer`, a strict prefix that makes an indexed cell present, fixed manifests
that contain their leaders, equal programs sharing a stable key, and decoder
guards made redundant by a following closed switch. These are not requests for
more assertions. They are requests to narrow an input, introduce a relational
type, key a table exactly, or delete the guard.

The owner prohibited git in this lane, so no `git log` command was run. The
batch precedents were instead corroborated from the current report source and
the ledger: the redundant `viewer === 'dm'` check is gone in favor of union
narrowing by `'viewer' in visibleState`; `COMMAND_TYPES` is a
`ReadonlySet<EncounterCommand['type']>`; and the ledger records the closed-set
and viewer proofs. This document makes no claim about unobservable commit
metadata.

## Cluster table

Rows marked “overlap” are diagnostic views and must not be added to the other
rows. Killed counts matter because a type-level prevention lets the associated
tests return to contract coverage rather than carrying mutation-specific
burden.

| Mutator × code pattern | Live S/NC by module | Live total | Existing evidence (`Killed`; `CompileError`) | Prescription | Estimated newly prevented; still tests |
|---|---:|---:|---:|---|---:|
| `StringLiteral` × structural paths, keys, refusal vocabulary | P `39/117` | 156 | lexical slice: 60 K, 126 CE in P | Recursive `Paths<T>` tuples; `Record<keyof T, true> satisfies`; branded/template-literal ids; no `Set<string>` or `PropertyKey[]` at typed boundaries | **130–156** prevented; 0–26 remain |
| `StringLiteral` × domain ids, delimiters, and prose outside that slice | L `1/0`, P `13/46`, V `1/2` | 63 | remainder: 226 K, 774 CE codebase-wide | Union/brand domain ids and exact protocol literals; keep arbitrary display/error prose as `string` and test only contractual prose | **15–30** prevented; 33–48 remain |
| `ConditionalExpression` × guards and union discriminants | C `9/1`, L `7/0`, P `309/93`, R `1/0`, D `3/0`, V `2/0` | 425 | 894 K, 879 CE | Parse once into discriminated typestates, non-empty/refined collections, and relational ids; exhaustively switch with no default; delete guards made impossible | **120–200** prevented/removed; 225–305 remain |
| Party `ConditionalExpression` × schema cross-field guards | P schema `57/4`, conversion `14/2` | 77 | included above | Replace optional-field bags plus `superRefine` with union-shaped Zod branches whose inferred output is the same union | **35–60** of the preceding row; rest test parser behavior |
| Party `ConditionalExpression` × import/runtime guards | P import `108/41`, runtime `130/46` | 325 | included above | Brand/refine successful parse output, but retain checks at the `unknown` boundary and genuine policy branches | **45–90** of the preceding row; **235–280** still tests |
| `ObjectLiteral` × erased required output / broad records | L `1/0`, P `11/27`, V `1/0` | 40 | 51 K, 615 CE | Exact `Record<ClosedKey, Value>`, explicit return types, `satisfies`, and keyed content rather than `Record<string, …>` | **10–20** prevented; 20–30 remain |
| `ArrayDeclaration` × enums, paths, ordered content, dynamic result arrays | P `32/63`, V `2/0` | 97 | 138 K, 181 CE | Non-empty/exact tuples for closed lists; generated path tuples; keyed records plus separately typed order for content; do not claim ordinary `as const` proves completeness | **15–35** beyond the string-path wave; 62–82 remain |
| `BlockStatement` + `ArrowFunction` × void validation/accumulation callbacks | P block `18/65`, arrow `17/15` | 115 | 435 K and 378 CE globally; P alone has 160 K | Pure `Rule<T> -> readonly Issue[]`, explicit non-void callback returns, reducers returning a new accumulator, and caller-consumed command/results | **50–75** prevented; 40–65 remain |
| Optional chaining × nullable lookup | none | 0 | **0 K, 66 CE** | No survivor wave. Where a relation is total, expose `TotalMap.at(): V` and remove `?.`; otherwise keep the honest optional type | **0 live**; current hypothesis refuted |
| Membership-shaped expressions (`some`/`includes`/`has`/`Set`) — **overlap** | P 157, V 3 across nine mutators | 160 | 443 K, 86 CE | Only closed vocabulary gets a union-typed predicate/exact key record. Arbitrary roster lookup, uniqueness, reachability, and dynamic ids remain runtime relations | **12–30** prevented; at least 130 still tests |
| `EqualityOperator` × ordering/boundary (`<`, `<=`, `>`, `>=`) | C 2, L 1, P 54, V 1 | 58 | 146 K, 333 CE across all equality mutations | Types do **not** distinguish `<=` from `<` on the same range. Centralize boundary policy and table-test `n-1/n/n+1`, fractional, min, max | **0–3** removed by deleting impossible checks; **55–58** tests |
| `EqualityOperator` × identity/discriminant | L 1, P 71 | 72 | 399 K | Brand non-interchangeable ids; switch on discriminated unions; exact membership predicates. Equality within one brand is still runtime | **15–30** prevented; 42–57 tests |
| `MethodExpression` × Zod min/max, `find`/`filter`/`sort`/`some` | P `69/11`, V `1/0` | 81 | 276 K, only 16 CE | Branded/refined output avoids repeated range/search checks after parsing; schema boundary and algorithmic method changes remain tests | **5–15** prevented; 66–76 tests |
| `BooleanLiteral` + `LogicalOperator` × flag bags/composite policy | P boolean `14/26`, logical `38/4` | 82 | 253 K, 296 CE | Replace mutually dependent boolean bags with discriminated modes; split predicates over narrowed variants | **15–30** prevented; 52–67 tests |
| `ArithmeticOperator` × scoring, distance, indexing, formulae | P `27/4`, S `1/0`, V `2/0` | 34 | 121 K, 0 CE | Unit brands prevent mixing units, not `+`→`-` on one unit. Centralize typed arithmetic primitives; test numeric laws and boundaries | **0–5** removed; 29–34 tests |
| `Regex` × external branded-id parser | P `10/0` | 10 | 30 K, 0 CE | Parse once to a template-literal/brand and stop revalidating internally; the boundary regex itself remains runtime | **0** at parser; all 10 tests |
| `UnaryOperator` / `AssignmentOperator` × sentinels and loop direction | P unary 3, V unary 1; assignment has 3 timeouts and no live result | 4 live | 27 K; 3 timeouts | Model absence without numeric sentinels where possible; loop direction and negation are runtime behavior | **0–2** removed; remainder tests/timeouts |

The exact mutator totals explain why the “types everywhere” answer must be
selective. For example, object/array deletion already produces **796 compile
errors** (615 object + 181 array), so contextual required shapes are working.
The 137 live deletions congregate in deliberately weak contexts: path arrays,
optional object spreads, output accumulators, issue payloads, and
`Record<string, …>`. Strengthen those boundaries; do not wrap every literal in
ceremony.

## Hypothesis verdicts

### 1. String keys and serialization: strongly confirmed

The 156-live party-pack structural slice is the single clearest cluster. It is
also unusually no-coverage-heavy (117/156), so moving it to compile time avoids
building a large negative-input matrix just to prove that `"effects"` was not
mutated to `""`. `COMMAND_TYPES: ReadonlySet<EncounterCommand['type']>` is the
positive precedent: closed literals acquire a contextual union rather than
widening to `string`.

Before (five lines):

```ts
const FIELDS = new Set(['effectId', 'conditionId']);
function issue(path: readonly PropertyKey[]) {
  return createGapReport({ featurePath: path.join('.') });
}
issue(['members', memberIndex, 'effects']);
```

After (five lines):

```ts
type PartyPath = Paths<ExternalPartyPackV2>;
const path = <const P extends PartyPath>(...parts: P): P => parts;
const FIELDS = { effectId: true, conditionId: true }
  as const satisfies Record<keyof z.infer<typeof startingConditionSchema>, true>;
issue(path('members', memberIndex, 'effects'));
```

`Paths<T>` must preserve numeric collection positions and known object keys; it
must not collapse back to `readonly PropertyKey[]`. For open homebrew values,
brand the structural key separately while preserving the supplied display
value. Do not close user-authored vocabulary merely to gain compile errors.

### 2. `if (false)` guard survivors: confirmed only after the trust boundary

The live `ConditionalExpression` burden is 425, of which party-pack owns 402.
The ledger proves that some guards admit impossible internal states: the viewer
literal check, strict-prefix undefined defense, fixed-manifest missing leader,
and closed decoder values are examples. The current viewer code correctly uses
the union shape (`'viewer' in visibleState`) and no longer compares
`viewer === 'dm'`.

The broad hypothesis is false for untrusted JSON, IndexedDB values, board
state, numeric policy, and collection search. Types cannot delete the check
that establishes a brand. The rule is: **validate once at `unknown`; thereafter
accept only the refined output**. A repeated internal guard is a type smell; a
boundary guard is not.

Before (five lines):

```ts
type Attack = { masteryProperty?: Mastery; masterySaveDc?: number };
schema.superRefine((attack, ctx) => {
  if (attack.masteryProperty === 'Topple' && attack.masterySaveDc === undefined)
    ctx.addIssue(MISSING_DC);
});
```

After (five lines):

```ts
type Topple = { masteryProperty: 'Topple'; masterySaveDc: SaveDc };
type Other = { masteryProperty?: Exclude<Mastery, 'Topple'>; masterySaveDc?: never };
type AttackMastery = Topple | Other;
const masterySchema: z.ZodType<AttackMastery> = z.union(
  [toppleSchema, otherMasterySchema]);
```

Where “absent mastery” prevents a direct Zod discriminant, use an explicit
`kind: 'none' | 'topple' | 'other'` wire branch rather than an optional bag.
Pre-alpha replacement policy favors changing the wire shape over preserving a
guard farm.

### 3. Object/array content tables: narrow confirmation, broad refutation

There are 137 live object/array deletion mutants, 133 in party-pack. Most are
not authored content tables: they are diagnostic paths, conditional object
spreads, empty fallbacks, and dynamic result arrays. They overlap heavily with
the path and non-void waves.

The code also demonstrates the limit of the proposed technique.
`VANE_WARREN_FIGHTS as const satisfies readonly VaneWarrenFight[]` proves each
row's shape but neither completeness nor ordering. Meanwhile
`TPK_ENEMY_POSITIONS: Readonly<Record<string, GridCell>>` admits `{}`, and that
object deletion survived. `satisfies` only helps when its right-hand type is
exact.

Before (five lines):

```ts
const positions: Readonly<Record<string, GridCell>> = {
  ashmaw: { column: 4, row: 3 },
  guard: { column: 4, row: 4 },
};
const fights = [cinder, iron, muster] as const;
```

After (five lines):

```ts
const order = ['cinder-rite', 'iron-voice', 'last-muster'] as const;
type FightId = typeof order[number];
const fights = { 'cinder-rite': cinder, 'iron-voice': iron, 'last-muster': muster } as const
  satisfies Record<FightId, VaneWarrenFight>;
const orderedFights = exactOrder(fights, order);
```

`exactOrder` should use a const generic that rejects missing, duplicate, and
extraneous keys. A hand-written exact positional tuple is acceptable for tiny
tables. A plain array plus `satisfies readonly Row[]` is not an order proof.

### 4. Optional chaining: survivor hypothesis refuted

All 66 `OptionalChaining` mutants are already `CompileError`; there are zero
survived, no-coverage, or killed-by-test instances. There is no mutation-score
wave here. Total relations are still good design because they can delete
optional operations and neighboring undefined guards, but the benefit must be
credited to those clusters rather than optional chaining.

Before (five lines):

```ts
const actor = state.combatants.find((x) => x.id === actorId);
const remaining = actor?.turn.movement.remaining ?? null;
if (actor === undefined) return fallback;
useMovement(actor, remaining);
return actor;
```

After (five lines):

```ts
type EncounterIndex = TotalMap<CombatantId, Combatant>;
const index = EncounterIndex.from(state.combatants, state.turnOrder);
const actor = index.at(actorId);
const remaining = actor.turn.movement.remaining;
return useMovement(actor, remaining);
```

`TotalMap.from` owns the runtime proof and must reject missing/duplicate ids.
Only consumers of that proof receive total lookup. Ordinary `Map.get` remains
optional.

### 5. Set membership: confirmed for closed vocabulary, refuted for relations

There are 160 live mutants on lines containing `some`, `includes`, `has`, or
`new Set` (157 party-pack, 3 vane-warren), spanning nine mutators. Manual review
shows that most ask relational questions: whether a spell is present, an id is
duplicated, a combatant has a token, an effect references an attack, or a cell
is occupied. A union-typed predicate cannot decide those facts.

Use the batch-4 technique only for genuinely closed vocabularies. It makes a
mutated member literal fail contextual typing and centralizes the one runtime
membership operation. Expect only 12–30 of the 160 membership-shaped live
mutants to disappear through this prescription.

Before (five lines):

```ts
function isHealingSpell(id: string): boolean {
  return id === 'cure-wounds' || id === 'healing-word';
}
const allowed = new Set<string>(['action', 'reaction']);
allowed.has(input);
```

After (five lines):

```ts
type SpellId = typeof SPELL_MANIFEST[number]['id'];
const HEALING = { 'cure-wounds': true, 'healing-word': true }
  as const satisfies Partial<Record<SpellId, true>>;
const isHealingSpell = (id: SpellId) => Object.hasOwn(HEALING, id);
isHealingSpell(parsedSpellId);
```

The predicate's true/false behavior still needs one table-driven test. The
type retires literal corruption and wrong-vocabulary calls, not membership
semantics.

### 6. Removed void blocks: confirmed, but the local pattern is validation

The current live block/arrow cluster is entirely party-pack: 83 block removals
and 32 erased arrow bodies. It is not principally async fire-and-forget code.
It is `superRefine`, issue accumulation, duplicate detection, collection
mapping, and command construction. Controllers and local-session-store have no
live block/arrow mutants after the completed batches.

Make work return a value the caller must consume. For validation, represent
each check as data or as a non-void rule. For state transitions, return the
event/command/new state rather than mutating an accumulator invisibly.

Before (five lines):

```ts
schema.superRefine((value, context) => {
  if (invalid(value)) {
    context.addIssue(issueFor(value));
  }
});
```

After (five lines):

```ts
type Rule<T> = (value: T) => readonly Issue[];
const rules = [(v: Value): readonly Issue[] =>
  invalid(v) ? [issueFor(v)] : []] as const satisfies readonly Rule<Value>[];
const validate = (v: Value) => rules.flatMap((rule) => rule(v));
schema.superRefine((v, ctx) => validate(v).forEach((i) => ctx.addIssue(i)));
```

Deleting a rule body now returns `void`, which is not assignable to
`readonly Issue[]`. The one adapter remains a void callback and needs a focused
test; hundreds of individual branches no longer do.

### 7. Equality boundaries: test, do not fake a type solution

There are 58 live ordering/boundary equality mutants and 146 already killed by
tests. Fifty-four live instances are in party-pack. `ClassLevel`, `Feet`, or a
brand for a bounded integer can prove the operand belongs to a domain; it
cannot make `level < minimum` ill-typed while `level <= minimum` is valid. Both
operators consume the same types and return `boolean`.

Before (five lines):

```ts
const eligible = level >= minimumLevel;
const inRange = distance <= attack.range;
const capped = values.length < maximum;
const recent = round - deathRound <= age;
return eligible && inRange && capped && recent;
```

After (five lines):

```ts
const eligible = meetsMinimumLevel(level, minimumLevel);
const inRange = isWithinRange(distance, attack.range);
const capped = isBelowCapacity(values, maximum);
const recent = isWithinRoundAge(round, deathRound, age);
return eligible && inRange && capped && recent;
```

This centralizes each policy so one independent boundary table can test
`n-1`, `n`, `n+1`, extrema, and fractional inputs where allowed. It does not
turn the operator mutant into a type error; it reduces duplicated mutation
sites and makes the remaining tests explicit.

## Prioritized implementation waves

Each wave applies one prescription everywhere it fits. Do not mix mutation-kill
assertions into a structural wave, because that obscures whether the type or the
test supplied the proof. The order is prevented-count per estimated effort.

### Wave 1 — typed structural vocabulary (very high return, medium effort)

Scope: party-pack field sets, gap/refusal paths, object-key probes, schema
discriminants, protocol names, and prefixed ids. Generate `Paths<T>` and exact
key records from the wire types. Keep homebrew payload values as branded
passthrough, never as a closed enum.

Expected: 130–156 party-pack live mutants prevented; 40–60 killed-by-test
mutants cease needing literal-specific assertions.

Gates:

- Strict application and node TypeScript builds remain green.
- Negative compile fixtures prove `""`, a misspelled field, an id from another
  brand, a missing exact key, and an extra exact key fail compilation.
- Retained import/export contract tests use independently authored fixtures;
  no expectation is regenerated from the serializer under test.
- A mutation dry run on representative typed-key sites classifies empty-string
  mutations as `CompileError` before expanding the wave.

### Wave 2 — non-void validators and consumed results (high return, medium effort)

Scope: every party-pack `superRefine` body, gap accumulator, duplicate checker,
and callback whose useful work is only a side effect. Convert to `Rule<T>`,
`Result`, returned issue arrays, returned commands, or returned events.

Expected: 50–75 party-pack live block/arrow mutants prevented, plus a material
share of 160 killed party block/arrow mutants retired from mutation-specific
test duty.

Gates:

- Every rule/callback has an explicit non-void return type; lint/AST search finds
  no bare `() => { sideEffect(); }` in the converted scope.
- Compile-negative fixture proves an erased rule body is rejected.
- Valid, one-error, and multi-error fixtures preserve issue paths, reasons, and
  deterministic order.
- Focused adapter test proves returned issues are actually consumed.

### Wave 3 — exact keyed tables and explicit order (high return, small/medium effort)

Scope: field tables, schema enum inputs, Vane Warren position/content maps, and
any party-pack content manifest. Replace `Record<string, V>` with
`Record<ClosedId, V>`; replace order-significant arrays with keyed records plus
`exactOrder`, or exact positional tuples when genuinely fixed.

Expected: 15–25 additional party-pack live mutants and the remaining broad-key
Vane table deletion prevented. Do not double-count path tuples from wave 1.

Gates:

- Compile-negative fixtures cover empty table, missing key, extra key,
  duplicate order key, and incomplete order.
- A manually curated required-key list—not derived from the table under
  test—checks content completeness.
- Behavior tests assert only semantically meaningful order; unordered records
  are deliberately not snapshotted for insertion order.

### Wave 4 — typestate schemas and relations (moderate return, high effort)

Scope: optional-field bags whose combinations are constrained by
`superRefine`; attack mastery/save DC, effect resource eligibility, persistent
area origin/movement, save-gated payload relationships, and total encounter
indexes. Parse external `unknown` into these types once.

Expected: 60–100 additional party-pack conditional/logical/equality mutants
prevented or removed; 20–40 elsewhere where ledgered guards describe impossible
states.

Gates:

- Each union has an exhaustive switch with no default arm.
- Compile-negative fixtures construct every formerly admitted impossible state.
- Boundary parser tests still reject those states from raw JSON and accept all
  supported old payloads; stricter internal types must not cause import data
  loss.
- Relation constructors reject duplicates/missing members once; consumers have
  no defensive fallback for the now-total relation.

### Wave 5 — closed predicates and cross-domain brands (moderate return, medium effort)

Scope: only predicates over closed manifest kinds, command types, effect kinds,
spell ids, and non-interchangeable party ids. Exclude dynamic `some`/`includes`
relations.

Expected: 20–30 additional party-pack live literal/identity mutants, with
smaller gains elsewhere.

Gates:

- Predicate parameters are the actual union/brand, never `string` plus a cast.
- Exact vocabulary records use `satisfies`; no `as SomeUnion` at membership
  call sites.
- One table-driven truth-table test remains per predicate.
- Compile-negative fixtures prove cross-brand comparisons and unknown closed
  literals fail.

### Wave 6 — mutation tests for the irreducible runtime remainder

Only after waves 1–5, kill the remaining party-pack mutants in this order:
external parser bounds/cardinality and regex anchors; equality boundaries;
runtime collection relations and uniqueness; arithmetic/scoring/order; then
contractual errors and display behavior. This avoids writing tests for code
that the type waves will delete or make uncompilable.

Gates:

- Each retained test has an independent oracle and can fail against a wrong
  implementation; never regenerate expected output from production output.
- Boundary matrices include exact boundary, neighbors, extrema, and fractions
  where the public input accepts finite numbers.
- No test is deleted merely because a mutant moved; tests are removed only when
  their subject is gone or their mutation-only assertion has become a compile
  fixture with the behavior contract still covered elsewhere.

## Party-pack decision

The prescriptions should land before party-pack kill batches. The conservative
overlap-adjusted estimate is:

| Pre-batch wave | Survived prevented | NoCoverage prevented | Total |
|---|---:|---:|---:|
| Typed structural vocabulary | 30–39 | 100–117 | 130–156 |
| Non-void validation/results | 20–30 | 30–45 | 50–75 |
| Exact keyed tables/order beyond path overlap | 5–10 | 10–15 | 15–25 |
| Typestate schemas/relations beyond prior overlap | 40–65 | 20–35 | 60–100 |
| Closed predicates/brands beyond prior overlap | 10–20 | 10–15 | 20–35 |
| **Estimated unique reduction** | **135–195** | **140–185** | **275–380** |

The component bounds are not independent; the total removes residual overlap
between typestate guards, typed membership, and exact structural vocabulary.

If the sites are mostly contextually constrained rather than deleted, those
275–380 results move into `CompileError`. On the current 7,991 denominator,
that alone would lift compile-error share from 46.1% to roughly **49.5–50.8%**;
moving preventable killed mutants as well can take it above 51%. If typestate
deletes the sites, report the smaller denominator separately rather than
pretending the removed mutants were compile errors.

The estimate intentionally excludes all 54 live party boundary equalities,
all 10 regex mutants, almost all 31 arithmetic mutants, most of the 80 method
mutants, and at least 130 of 157 membership-shaped mutants. Those exclusions
are why the range is credible enough to schedule against.

## Honest limits: what types cannot reach

- **Boundary choice:** `n < limit` and `n <= limit` have identical operand and
  result types. Brands and range types do not decide inclusivity.
- **Same-domain identity:** brands reject `CombatantId === TokenId`; they do not
  decide whether two `CombatantId` values should match in this state.
- **External validation:** raw JSON, IndexedDB data, and user-authored content
  begin as `unknown`. The check that creates a refined type remains executable
  behavior and needs hostile-input tests.
- **Regex language:** a branded result prevents repeated regex use internally,
  but anchors, character classes, and length bounds at the parser are runtime.
- **Arithmetic laws:** unit brands reject feet plus rounds, not addition versus
  subtraction of two feet values or a wrong score coefficient.
- **Ordering and tie-breaking:** a tuple can require positions, but it cannot
  prove a sort comparator's direction, stability, or semantic priority.
- **Dynamic membership and uniqueness:** whether this encounter contains this
  combatant, spell, token, resource, or duplicate is a fact about values, not a
  closed type vocabulary.
- **Boolean policy:** discriminated modes eliminate impossible flag
  combinations; they do not prove that a valid mode should take one branch.
- **Error prose and MIME metadata:** types can require a non-empty/known error
  code, not a particular human sentence or observable browser metadata. Test
  only what the public contract makes meaningful. The ledger's unused Blob MIME
  mutants are a deletion opportunity, not a reason to literal-type prose.
- **Loop progress:** assignment-direction mutants that time out require bounded
  iteration structures, algorithmic proofs, or timeout tests. A numeric brand
  does not prove progress.
- **Homebrew vocabulary:** closing user-supplied schools, traits, damage labels,
  or similar values to gain compile errors is a data-loss bug. Use known-plus-
  passthrough types and brand each vocabulary separately.

The target is therefore not “every survivor becomes a type error.” It is:
closed vocabulary is exact, impossible internal state is unrepresentable,
required work returns a consumed value, authored tables prove completeness,
and every remaining mutant corresponds to behavior that genuinely can vary at
runtime.
