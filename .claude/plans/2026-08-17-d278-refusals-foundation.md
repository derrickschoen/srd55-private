# D278 refusals foundation — REVISED after codex rounds 1+2

Round-2 disposition: 6 MAJOR + 1 minor, ALL accepted (G1-G7 below); G4's
resolution substitutes sender-side WeakSet minting (T6) for the reviewer's
"opaque construction" ask because symbol/nominal brands do not survive
structured clone — enforcement must live where the object still has
identity, i.e. before postMessage.

Round-3 (cap) disposition: G1-G7 confirmed resolved by the reviewer; ONE
new MAJOR (H1) accepted and folded in below; plan RATIFIED by supervisor
arbitration at the round cap. H1 additions:
- Increment 4's consumer inventory is ALL direct `apply()`/executor
  consumers, not just the commands.execute client path:
  level-up-preview.ts:87 (would treat a returned refusal as success and
  preview partially-applied state), guided-creation.ts:1981 and :2206
  (ignore the executor result then proceed), undo, and save-point
  restoration. RULE: a `character-command-errors.ts` translation is
  deleted only when its LAST consumer has migrated; until then it stays.
- `malformed_planned_subchoice` and `invalid_character_flavor`
  (character-command-errors.ts:64) get an explicit classification in
  increment 1: default DEFECT (malformed input per D278) unless reading
  shows the UI renders them as user-recoverable today — the
  classification and its evidence are recorded in the taxonomy doc.
- Ignorability mitigation (no must-use exists in tsc): every direct
  `apply()`/`execute()` caller is enumerated and migrated in increment 4,
  AND an ast-grep rule (`sg scan`) is added flagging statement-position
  calls whose `Outcome` result is discarded — run in the gate script.
- Polish: the union has 5 arms (not "3 arms above"); worker.ts line refs
  re-verified at implementation time.

Repo: main. The FOUNDATION the D276/D277 migration lanes consume. Law: D278
(unified Result + shared union), D274 (tagged defect classes), D269a
(exhaustive switches), D277 (order), D280 (whole-src bar). Round-1
disposition: 9 MAJOR + 2 minor findings, ALL accepted, none rejected. The
design below is the corrected one; deltas from round 1 are marked (Fn).

## Assumptions — corrected after review

1. Rollback-on-throw: TRUE for synchronous callbacks only (codex probed
   sqlite-wasm 3.53.0: sync throw rolls back; savepoints nest; an ASYNC
   callback COMMITS before rejecting — the row stayed). The helper
   therefore forbids async bodies at type AND runtime (F2).
2. Shared compilation: true in substance (one src tree, one type project,
   two runtime bundles; no copy step).
3. `character-command-errors.ts` is NOT a defect-only precedent — it is
   the refusal-over-error-channel mechanism D278 replaces (F-assumption 3).
   The plan stops citing it as precedent; it is a migration TARGET.

## Design

### src/refusals/refusal.ts — the shared union

Arms carry the FULL payload the live UI consumes today, with existing
branded types (F4):

```ts
export type Refusal =
  | { readonly kind: 'attunement_slots_full';
      readonly limit: number;
      readonly occupants: readonly { readonly slot: AttunementSlot;  // G7:
        // existing closed 1|2|3, src/domain/attunement.ts:1 — never plain number
        readonly item_id: CharacterItemId; readonly name: string }[] }
    // occupants: the planner's replacement modal needs slot+id+name
    // (ui/screens/planner/screen.ts:397); parity with the payload that
    // crosses RPC today (character-command-errors.ts:24)
  | { readonly kind: 'revision_conflict';
      readonly expected: CharacterRevision; readonly actual: CharacterRevision }
  | { readonly kind: 'character_archived';
      readonly character_id: CharacterId;
      readonly current_revision: CharacterRevision }  // UI marks state stale
  | { readonly kind: 'level_up_refused'; /* G1: the five structured
      LevelUpRefusal reasons + subchoice payload, ported field-for-field
      from src/builder/level-up.ts:61-86 so no live UI data is lost */ }
  | { readonly kind: 'species_lineage_refused'; /* G1+G2: ported from
      SpeciesLineageRefusal (character-command-errors.ts:59); this arm is
      also the PRODUCTION ROLLBACK PROOF — ChooseSpeciesLineageCommand
      writes configuration+effects (choose-species-lineage.ts:225) before
      refusing on an unavailable/rejected spell (:246) */ }
  ;
export type RefusalKind = Refusal['kind'];
```

(G1 scope note: the union above is the COMPLETE set `commands.execute` can
emit today — attunement, revision, archived, level-up, species-lineage —
because increment 4 is end-to-end: no live refusal may remain on the
error channel, and none of their translated payload fields may be
dropped. The level_up/species arms' exact fields are enumerated during
increment 1 by reading the two refusal types; porting is field-for-field,
not redesign.)

- Construction ONLY via exact per-arm factories in this module that
  reconstruct known fields into fresh object literals (F7): structural
  typing would otherwise admit a class instance with extra methods, and a
  non-cloneable value makes `postMessage` throw OUTSIDE the response
  catch (src/db/worker.ts:98-101), leaving the client hanging.
  ENFORCEMENT (G4): each factory also registers its literal in a
  module-private WeakSet (`mintedRefusals`), exact T6 precedent
  (resourceRecoveryEvidence); the worker's envelope builder calls the
  module's `assertMintedRefusal(r)` before the envelope reaches
  `postMessage` — a structurally-valid smuggle that bypassed the factory
  throws a DEFECT sender-side, where the object still has identity.
  (Receiver-side identity is meaningless after structured clone; there
  the decoder's shape validation is the guard.) A negative test smuggles
  a well-typed non-factory object and asserts the defect.
- Compile-time field pinning (G5): NOT against `JsonValue`
  (src/domain/models.ts:35 — its arrays are mutable, so the readonly
  `occupants` arm fails TS2322). Increment 1 defines
  `CloneSafeJson` (readonly-array recursive JSON type) in
  src/refusals/ and probes every arm with
  `satisfies`-style assignability to it. `JsonValue` is untouched.
  No frozenness claim — structured clone yields mutable receiver-side
  objects regardless (F7).
- Prose derived UI-side in one renderer (`render.ts`), kind+params
  asserted everywhere, formatted prose once per arm (D274 rule).
- The two exhaustive switch sites, named precisely (F6): the UI renderer
  and the decoder's per-kind validation table — both closed over
  `RefusalKind` via `satisfies Record<RefusalKind, ...>` (T7).

### src/refusals/outcome.ts

```ts
export type Outcome<T> =
  | { readonly kind: 'ok'; readonly value: T }
  | { readonly kind: 'refused';
      readonly wire_version: number;   // = REFUSALS_WIRE_VERSION at mint
      readonly refusal: Refusal };
```

- `wire_version` evolution rule (F10): bumped when an existing arm's
  params change incompatibly or an arm is removed; ADDING arms does not
  bump (unknown-kind fallback covers it). The decoder checks the envelope
  BEFORE extracting `refusal`.

### src/refusals/decode.ts — runtime decoder at the client boundary (F6)

`RpcClient.call` resolves unvalidated worker data; a renderer typed
`Refusal` cannot legally receive an unknown kind. So the command client
runs `decodeOutcome<T>(data: unknown, isValue: (v: unknown) => v is T):
KnownOutcome<T> | { kind: 'incompatible_refusal'; wire_version: number |
null }` — the caller supplies the ok-value guard, so no unchecked cast
exists anywhere in the decoder (G3); for increment 4 the guard is the
endpoint-specific `isCharacterCommandRpcResult`. Refusal-side:
per-kind param validation table (closed by T7), unknown kind / wrong
version / malformed shape all → `incompatible_refusal`, which the UI
renders as the one generic "couldn't do that — reloading may help"
surface. Never a throw, never blank. (Zod or hand-rolled: hand-rolled,
matching the taxonomy's zero-dependency stance; the table IS the schema.)

### src/refusals/transaction-outcome.ts — rollback helper (F1, F2, F3)

Corrected design — refusals travel as VALUES through command code; the
only throw lives inside the helper's own closure, AFTER the body returns,
so no user-level `catch` (choose-species-lineage.ts:252,
level-up-class.ts:645 style) ever sees it (F3):

```ts
export function runCommandTransaction<T>(
  db: CommandTransactionHost,          // narrow public interface over
                                       // DatabaseContext.transaction —
                                       // NEVER a raw TransactionRunner (F1)
  body: () => Outcome<T>,              // body RETURNS refusals as values
): Outcome<T> {
  try {
    const value = db.transaction(() => {
      const out = body();
      if (isThenable(out)) throw new AsyncCommandBodyDefect();  // F2
      if (out.kind === 'refused') throw new RefusalRollbackSignal(out);
      return out.value;
    });
    return ok(value);
  } catch (e) {
    if (e instanceof RefusalRollbackSignal) return e.outcome;
    throw e;                            // defects propagate, still rolled back
  }
}
```

- `body: () => Outcome<T>` with `T` constrained non-Promise at the type
  level (conditional `T extends PromiseLike<unknown> ? never : T`) AND the
  runtime thenable check, because sqlite-wasm commits the instant a sync
  callback returns (F2; existing precedent level-up-preview.ts:85).
- `CommandTransactionHost` = `{ transaction<R>(cb: () => R): R }` —
  satisfied by `DatabaseContext`, so nesting reuses the ONE runner and
  its savepoint depth; a second runner would BEGIN inside a transaction
  (F1).
- Nesting composes by value: an inner `runCommandTransaction` rolls back
  its savepoint and RETURNS refused; the outer body decides. No signal
  crosses user code.

### RPC boundary and blast radius (F5)

Converting any refusal inside `commands.execute` wraps EVERY command
result in `Outcome`, touching the single handler
(worker/handlers/commands.ts:76), the client (commands/client.ts:14), and
all success-path consumers (planner screen, level-up wizard
level-up-wizard.ts:74, guided builder, direct RPC tests). That is the
honest unit of conversion — there is no smaller one. It is therefore its
OWN increment (4) with the caller list enumerated up front, not a
footnote of the pattern-setting example.

### docs alignment (F8)

`docs/design/2026-08-17-tagged-error-taxonomy.md` currently says "no
Result type" and permits new policy-refusal classes — contradicting D278.
Increment 1 amends it: refusals RETURN `Outcome`; tagged classes are for
DEFECTS only; the policy-refusal-class section is rewritten to point at
src/refusals/. Migration-lane briefs cite the amended doc.

### Known adjacent defect (recorded, fixed in increment 4)

`postMessage` outside the response catch + queue catch swallowing
`DataCloneError` leaves a client pending forever (worker.ts:98-101).
Increment 4 moves the post into the guarded path so a clone failure
produces an `RpcError` response instead of a hang. (Surfaced by F7.)

## Increments (each gated, committed alone)

1. **Union + factories + renderer + decoder + doc amendment**: refusal.ts
   (3 arms above), outcome.ts, decode.ts, render.ts; JsonValue probe;
   extra-variant tsc probe at both switch sites (apply → tsc fails →
   remove); taxonomy doc amended (F8). Tests: per-arm factory/render,
   decoder on malformed / unknown-kind / future-wire_version / valid;
   older-UI-vs-newer simulation (feed a v+1 envelope, assert generic
   surface) (F10).
2. **Rollback helper**: transaction-outcome.ts + tests (F9 list):
   insert-then-refuse rolls back; defect propagates AND rolls back; async
   body → AsyncCommandBodyDefect thrown before commit (probe with a
   thenable); body wrapped in a broad internal try/catch cannot swallow
   the signal (it never sees it — test proves refusal still returned);
   nested two-deep savepoints: inner-refused/outer-commits and
   inner-ok/outer-refuses; type probe: Promise-returning body fails tsc.
3. **Real-clone transport test**: an actual `new Worker`/MessageChannel
   round-trip of ok and refused envelopes through structured clone
   (vitest browser-less: MessageChannel is available in Node ≥15), plus a
   non-cloneable-smuggle attempt proving the factory boundary prevents it.
4. **Endpoint conversion — `commands.execute` end-to-end** (F5, G1, G2,
   G6): the FULL seam, named explicitly —
   `ConstructedCharacterCommand.apply` (character-command-factory.ts:52)
   changes from `void | Promise<void>` to returning `Outcome`, the
   executor fold (character-command-executor.ts:1113) stops discarding
   returns and propagates the first refusal, preflight refusals convert,
   the handler returns `Outcome<CharacterCommandRpcResult>`, every
   enumerated caller updates, and ALL of
   `character-command-errors.ts`'s refusal translations (attunement,
   level-up, species-lineage, revision, archived) are deleted as their
   arms take over — payload parity asserted arm-by-arm. Defects keep
   RpcError/handler_error. Worked rollback proof (G2):
   `ChooseSpeciesLineageCommand` — writes configuration+effects
   (choose-species-lineage.ts:225) then refuses on unavailable/rejected
   spell (:246); test proves the pre-refusal writes are absent after.
   Attunement remains the modal-parity example only (F9). postMessage
   hang fix lands here WITH a test that reaches the failure branch (G6):
   a test-only injected handler returns a non-cloneable value, asserting
   the first post's DataCloneError yields a cloneable RpcError response
   and the queue keeps serving. Existing expect-throw tests migrate to
   expect-refused with kind+params — none deleted, each strengthened.

## Gates

Per increment (supervisor-run, quiet box): tsc app+node configs; full
vitest; narrow Stryker over touched files — an INCREMENTAL gate only; the
v1 bar remains D280 whole-src zero-unexplained, run at campaign level, not
claimed here (F11).

## Out of scope

The remaining ~860-site migration (worklist lane); S7 repairs (D277);
per-command result-type tightening beyond commands.execute; deploy.
