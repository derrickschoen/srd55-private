F21 — **SIGNIFICANT: Snapshot delivery is not gated by transaction durability or outcome.**

The host publishes immediately after starting `step()`, before the post-step flush, and publishes again for refused steps and flush failures. The service converts every notification into an ordinary sequenced snapshot. A synchronous autonomous step can therefore expose changed state before durability, while noncommitted outcomes also produce snapshot events. Evidence: `src/vtt/dm-encounter-host.ts:588`, `:597`, `:614`, `:625`, `:630`, `:655`; `src/vtt/encounter-session-service.ts:418`. This contradicts the plan at `.tmp-plans/2026-09-09-vtt-handoff-plan.md:227`.

**Required change:** Distinguish durable mutation/autonomous snapshots from offer/status updates and recovery notifications. Capture and deliver successful state changes only after their flush succeeds. Exercise actual subscriptions with a real host and delayed/failed storage; checking that a response lacks an `event` property does not prove subscription silence (`tests/unit/vtt/encounter-session-service.test.ts:218`).

F22 — **SIGNIFICANT: Exceptions after state application can be reported as recoverable pre-apply failures.**

The coordinator assigns authoritative state before recording the reducer transition. If recording throws, both the pump and door path label the exception `pre_apply`. The service’s catch-all also assumes every escaped exception occurred before application. Additionally, the initial pump flush and door’s pump-settlement wait sit outside their cleanup handlers. Evidence: `src/combat/coordinator.ts:560`, `:581`; `src/vtt/dm-encounter-host.ts:595`, `:601`, `:926`, `:953`; `src/vtt/encounter-session-service.ts:278`, `:305`.

**Required change:** Track application explicitly through the complete transaction, including journal/mirror recording and every durability barrier. Post-application failures must degrade/close and settle remaining work; pre-application failures must restore a usable queue. Add real-host regressions for throwing append/mirror operations and failed barriers. The supplied fake terminal outcomes at `tests/unit/vtt/encounter-session-service.test.ts:161` cannot establish this classification.

F23 — **SIGNIFICANT: Closing during a door operation can leave that operation and the FIFO permanently pending.**

`#waitForFreshOffer()` resolves only when a matching offer appears. It has no closure, refusal or pump-failure outcome. Closing clears its listener without settling its promise; subsequent service operations remain chained behind that unresolved door operation. There is also no closed-state recheck after the door’s asynchronous barriers. Evidence: `src/vtt/dm-encounter-host.ts:980`, `:992`, `:1365`; `src/vtt/encounter-session-service.ts:271`, `:286`, `:298`.

The closure test closes before submitting anything; it does not test queued work despite its name (`tests/unit/vtt/encounter-session-service.test.ts:228`).

**Required change:** Track and settle active and queued operations on closure, including fresh-offer waits. Handle refusal and pump failure explicitly, prevent resumption after closure, and perform cleanup even after degradation has already set `#closed`. Test closing during a blocked door flush and during offer refresh, with another mutation queued.

F24 — **SIGNIFICANT: Restore does not invalidate a cached continuation when `pendingRequest` is null.**

Freshness is initialized solely from the presence of a restored pending request. Cancellation clears that request while retaining the continuation. A paused door change then persists the old continuation, while its freshness flag exists only in memory. Reopening loses that flag, and `#continueTurn()` can reuse the old legal actions. Evidence: `src/combat/coordinator.ts:269`, `:271`, `:343`, `:368`, `:754`, `:802`.

The current paused-door test resumes the same live host, so it cannot detect this (`tests/unit/vtt/door-intent.test.ts:193`). The plan explicitly requires restored continuation freshness (`.tmp-plans/2026-09-09-vtt-handoff-plan.md:239`).

**Required change:** Define restore invalidation for cached offers independently of pending-request presence, preserving the required cursor, pause and accepted-command semantics without adding persisted fields. Test paused door change → durable save → reopen → resume, including newly enabled and invalidated moves and replay/checksum validation.

F25 — **SIGNIFICANT: Player snapshots expose mutable references to the authoritative offer catalog.**

`projectedRequest()` returns the original legal-action array. That array is retained by the coordinator, exposed through the service, then used again to resolve an offered action. Mutating a delivered action can therefore mutate the catalog against which the coordinator validates that action. TypeScript `readonly` does not prevent this at runtime. Evidence: `src/vtt/encounter-projections.ts:236`; `src/combat/coordinator.ts:510`, `:754`; `src/vtt/encounter-session-service.ts:321`, `:333`; `src/combat/controllers.ts:173`.

**Required change:** Deliver detached immutable projections and resolve offer IDs against an internal catalog consumers cannot mutate. Add a regression that modifies a delivered action/path and demonstrates that authoritative offers and dispatched commands remain unchanged. An IDs-only submission API is insufficient while its backing catalog escapes by reference.

F26 — **SIGNIFICANT: Subscriber exceptions can prevent transaction settlement or misclassify a committed door change.**

Listeners execute synchronously without isolation. The service calls DM listeners before constructing player events, and the host publishes before settling the transaction. A throwing listener can prevent player-event capture and leave a transaction pending. In the door path, an exception from publication after successful application and flush reaches the service’s `pre_apply` catch. Evidence: `src/vtt/encounter-session-service.ts:422`, `:423`; `src/vtt/dm-encounter-host.ts:525`, `:630`, `:631`, `:978`.

**Required change:** Complete transaction bookkeeping and capture all seat projections independently of observer execution. Isolate subscriber failures and report them separately. Test throwing DM and player subscribers alongside healthy subscribers and queued mutations.

F27 — **SIGNIFICANT: The dependency-boundary gate is not the graph check required by the plan.**

The test scans three source files with a regex and checks selected strings. It does not traverse dependencies, misses ordinary DOM access such as `document.createElement`, and does not detect aliased or additional reducer routes. Selector restrictions likewise inspect only the selector file. Evidence: `tests/unit/vtt/engine-boundary.test.ts:9`, `:17`, `:22`, `:40`, `:48`, `:51`; plan `.tmp-plans/2026-09-09-vtt-handoff-plan.md:229`, `:255`.

**Required change:** Check resolved dependency/reducer edges, including transitive imports and relevant import forms, with explicit permitted exceptions. Demonstrate failures for a forbidden dependency introduced through a helper, ordinary DOM access, and an additional reducer call under an alias. Removing the expected reducer-injection string proves only that one textual assertion.

F28 — **SIGNIFICANT: The same-state door test does not prove its required durability barrier.**

The test claims that success waits for durability, but uses the ordinary memory store and immediately awaits success. It neither blocks nor fails `flush()`. Removing the implementation’s same-state flush would leave its assertions satisfied. Evidence: `tests/unit/vtt/door-intent.test.ts:149`, `:161`; implementation `src/vtt/dm-encounter-host.ts:913`; required gate `.tmp-plans/2026-09-09-vtt-handoff-plan.md:247`.

**Required change:** Use a controllable barrier, assert that the result remains pending before acknowledgment, and assert failure when acknowledgment fails. Retain the request/revision/journal/event assertions and explicitly observe cancellation and reducer invocation.

F29 — **SIGNIFICANT: Destination matching accepts stale offers as current.**

`matchOfferedMoveDestination()` checks request presence and actor identity but never compares the request’s revision with the projection’s revision. A stale request containing a matching destination returns `matched`. Evidence: `src/vtt/encounter-selectors.ts:70`, `:74`, `:83`.

**Required change:** Return `unavailable` when the offer revision differs from the projection revision. Add a regression with otherwise identical legal actions and mismatched revisions; retain the unique/ambiguous destination cases.

## Verified claims

- **S3a’s persistence port and clocks:** `SessionStore.flush()` is mandatory; memory/SQLite implementations provide no-op barriers, and IndexedDB awaits its durability acknowledgment. The three ambient metadata timestamps use the injected clock. Evidence: `src/vtt/session-persistence.ts:303`, `:409`, `:489`; `src/vtt/local-session-store.ts:306`, `:339`, `:362`, `:512`. The seven-file type rename is complete; retaining concrete implementation names is reasonable.
- **S3b’s explicit lifecycle ordering:** Restore/export flush first; active deletion closes, flushes and removes before returning navigation; successful new imports flush. Duplicate and conflict results remain distinct. Evidence: `src/vtt/session-lifecycle.ts:91`, `:101`, `:113`, `:127`.
- **The intended reducer route exists:** The host injects `reduceSessionEncounter`, and persisted reducer replay uses it with state, event and RNG comparisons. Evidence: `src/vtt/dm-encounter-host.ts:426`; `src/vtt/session-persistence.ts:1535`.
- **The normal door path implements the specified cancellation order and payload:** Cancellation precedes awaiting the pending pump; revalidation precedes the active-actor, zero-cost `modify_object` command; successful application is followed by flush. Evidence: `src/vtt/dm-encounter-host.ts:923`, `:929`, `:943`, `:967`.
- **The persistence-test renames are licensed by the plan.** The reaction test requires a new request ID while retaining revision, legal-action, resulting-position and reload assertions. The agent test pins the refreshed ID. These changes are not weakened assertions. Evidence: `tests/unit/vtt/session-persistence.test.ts:894`, `:903`, `:1220`; plan `.tmp-plans/2026-09-09-vtt-handoff-plan.md:239`.
- **Baseline preservation:** The supervisor fixture’s literal SHA and complete request/coordinator hashes are checked, and the fixture drives stale-request restore/resume assertions. Evidence: `tests/unit/vtt/session-persistence.test.ts:187`, `:209`. The fixture and frozen contract hashes match the supplied values.
- The candidate tree is clean. The lane diff leaves `.claude/**`, `docs/**`, fixtures, published contracts and the frozen contract untouched. No prohibited source patterns were found in the reviewed additions. I ran no tests or builds; execution results remain supervisor-supplied evidence.

VERDICT: REJECT
review complete