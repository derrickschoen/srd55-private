# Type fixes that killed mutants — worked examples, READ BEFORE TYPING NEW DOMAIN CODE

Engineering patterns, not game rules. Like `AGENT_ERRATA.md`, this file is
exempt from SRD citation verification: its proof is commits and mutation-run
verdicts, not source spans. Every entry is a REAL fix that converted runtime
mutants into compile errors (or deleted their mutation surface entirely),
verified by a narrow Stryker run. Owner directive D269(b): extend this list
when a new pattern works; consult it before typing new domain code.

Commits live on the `wt/simcore` branch (2026-08-16 waves) unless noted.

| # | Pattern | Worked example | What it killed |
|---|---------|----------------|----------------|
| T1 | **Discriminated union replacing parallel nullable fields.** Two fields whose null-ness is correlated (`dice_count`/`die_size` both-or-neither) become `{kind:'dice',...} \| {kind:'flat',...}`; consume with a `switch (x.kind)` that tsc checks exhaustively (D269a). | `DirectDamageOwner \| RepeatedDamageOwner` in spell-source-reader.ts (`ef41a9fc`): boolean `repeats_damage` + possibly-empty array became two arms, one carrying a statically nonempty tuple. | 5 condition/logical mutants → TS2339/TS2322; the runtime correlation checks were DELETED, so their mutation surface is gone. |
| T2 | **Delete the guard by narrowing the parameter.** A function that re-checks `x.kind !== 'expected'` at runtime should instead ACCEPT the narrow arm type; narrow once at a module boundary. | `BundledSrdSourceRef` arm split out of `PublicSourceRef` (`aa511e85`): three runtime narrowings in probability.ts deleted; manifest typed `Record<..., BundledSrdSourceRef>`; pinned by a negative type probe in docs/type-probes. | 5 conditional mutants → TS2322 at two independent bindings. |
| T3 | **Schema literal over hand-rolled shape checks.** A six-clause `typeof`/`hasOwn`/length guard cascade becomes one `z.strictObject({version: z.literal(1), ...})`. | route.ts envelope (`0e5da577`); equivalence of old and new behavior proven case-by-case before the rewrite. | 2 surviving guard mutants eliminated by deletion; version literal now type-pinned. |
| T4 | **Literal-typed constants.** `Error.name` (or any tag) declared `override readonly name: 'X' = 'X'` — the ANNOTATION, not `as const`, is what makes `""` unassignable. | DprRequestParseError's name declaration in the simulation request module, wt/simcore branch (`0e5da577`). | StringLiteral→`""` mutant → TS2322. |
| T5 | **Invariant-owning stateful class instead of raw numbers (D269c).** A value that changes over time gets a class whose methods maintain the invariant; callers can no longer supply the state. | `ResourceRecoverySession` bounded counter (`7563e73d`, D267): floor 0, ceiling `pool.maximum`, `spend()` throws below zero, `recover()` clamps; the `expendedUnits: unknown` parameter and its per-call revalidation were deleted. | The caller-supplied-state seam and its validation mutants ceased to exist. |
| T6 | **WeakSet-minted evidence for unforgeable capabilities.** Objects proving "a human reviewed this" are minted by one module into a private WeakSet and re-checked by identity at use; structural forgeries fail even when well-typed. | `resourceRecoveryEvidence` / `mintedResourceRecoveryEvidence` (pre-existing; pattern validated by the campaign — its guards needed only near-miss TESTS, not redesign). | Forged/borrowed/replayed recovery authorizations refuse at runtime; cast-past-the-compiler attacks dead-end at the WeakSet. |
| T7 | **`satisfies Record<ClosedKeyUnion, T>` on reviewed tables.** Oracle/manifest tables keyed by a closed union make a missing or extra row a compile error without codegen. | `reviewedResourceRecoverySourceSha256Oracle satisfies Record<ReviewedResourceRecoveryRow, string>` (pre-existing); wave4-a proved a whole guard arm (`expectedAvailability === undefined`) unreachable BECAUSE two tables share the key union — the type made the runtime check dead. | Missing/renamed table rows → compile error; downstream undefined-guards become provably dead. |

## Anti-lessons (limits of types, measured)

- Types cannot catch comparing against the WRONG VALID member of a union
  (`rest === 'short_rest'` flipped to `'long_rest'` compiles fine). The fix is
  fewer comparison sites: index by the key (`pool.recovery[rest]`) instead of
  branching over members.
- The 2026-08-16 cross-rank measured that only ~40 of 534 true mutation
  survivors were reachable by any typing change — the survivor population was
  dominated by runtime guards whose failure arm no test exercised. Types
  prevent future bug classes; near-miss tests kill present survivors. Budget
  accordingly.
- Brands (`Brand<number,'X'>`) do not survive arithmetic; revalidate at
  boundaries or use pattern T5.
- Three wave-3 equivalence proofs rest on table facts (e.g. "every flat
  signature has a null die size") that a future row would silently invalidate;
  encoding the fact as a T1 union makes such proofs permanent.
