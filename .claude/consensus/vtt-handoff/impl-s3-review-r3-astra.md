F37 — **SIGNIFICANT: F31 remains partially resolved—failure writing the initial pause can still deadlock the door operation and prevent controller cleanup.**

`pauseForExternalMutation()` restores the previous pause and throws if its first journal write fails, before cancelling the human request. The host then awaits the still-pending pump indefinitely. The new regression fails the **second** append, so it misses this path. Evidence: `src/combat/coordinator.ts:383`, `:391`; `src/vtt/dm-encounter-host.ts:1223`, `:1226`; `tests/unit/vtt/door-intent.test.ts:380`.

The same ordering affects shutdown after an initial offer-flush failure: `interrupt()` can throw before cancellation, and `#closeAfterInitialOfferFailure()` merely attaches a rejection handler to the unresolved step. A failed IndexedDB store rejects subsequent appends, making this a concrete production path. Evidence: `src/combat/coordinator.ts:369`, `:374`; `src/vtt/dm-encounter-host.ts:861`, `:870`; `src/vtt/local-session-store.ts:299`, `:615`.

**Required change:** Make cancellation cleanup independent of successful persistence. Distinguish failure before cancellation from a cancelled step before awaiting pump settlement. Add regressions for the first pause append failing and for a persistently failed store during initial-offer cleanup; require bounded outcomes, no outstanding human wait and the specified pause policy.

F38 — **SIGNIFICANT: Publication now precedes terminal settlement again, regressing F26 and creating contradictory outcomes.**

The pump delivers mutation notifications before settling the committed transaction. A mutation subscriber calling `service.close()` resolves the closure signal and closes the host’s transaction waiter before the later commit settlement. The caller can therefore receive `closed` after subscribers have already received its mutation event. Evidence: `src/vtt/dm-encounter-host.ts:778`, `:784`; `src/vtt/encounter-session-service.ts:320`, `:341`.

The door path likewise delivers its mutation notification before returning its committed outcome, while the service races that outcome against closure. Evidence: `src/vtt/dm-encounter-host.ts:1348`; `src/vtt/encounter-session-service.ts:307`.

Throwing-subscriber isolation does not cover a subscriber that legitimately closes the service.

**Required change:** Establish an irrevocable terminal receipt before invoking external observers, while preserving captured events and barrier-independent closure for unfinished work. Test a DM/player mutation subscriber that closes the service: an already-published mutation must retain its committed result, queued unfinished work must close, and no additional work may execute.

F39 — **SIGNIFICANT: F35 still misses reducers renamed by re-export.**

The resolver can follow renamed exports, but its callers filter symbols by their spelling before resolution. Named imports whose exported name is not in `REDUCERS` are discarded; namespace calls have the same restriction. Evidence: `tests/unit/vtt/engine-boundary.test.ts:108`, `:109`, `:224`, `:272`.

For example, a helper exporting `reduceEncounter as applyRaw`, followed by either an imported `applyRaw(...)` call or `engine.applyRaw(...)`, introduces a forbidden reducer route without adding a detected call site. The reported namespace-through-re-export control does not prove renamed-export handling.

**Required change:** Resolve imported/called symbols to their defining reducer before filtering, preferably using TypeScript symbol resolution. Add named-import and namespace controls through a renamed re-export, retaining the existing call-site multiplicity and selector-authority controls.

## Verified claims

- **F30—blocked-barrier cases resolved.** Service operations now race an independent closure signal. Door and ordinary-step tests assert active/queued terminal outcomes before releasing their barriers, then check that execution does not resume. Evidence: `src/vtt/encounter-session-service.ts:307`, `:341`; `tests/unit/vtt/door-intent.test.ts:492`, `:495`, `:501`; `tests/unit/vtt/encounter-session-service.test.ts:639`. The separate publication/closure race is F38.
- **F31—partially resolved.** Cancellation-record failure now aborts in `finally`, and the second-append regression checks abort, restored pause and absence of reducer invocation. The earlier pause-write failure remains unhandled. Evidence: `src/combat/coordinator.ts:353`; `tests/unit/vtt/door-intent.test.ts:368`.
- **F32—resolved for the reported paths.** Automatic refusal consequences receive a durability barrier and autonomous notification. Reaction bookkeeping failures are wrapped as post-application failures; real-host regressions cover successful autonomous resolution and recording failure. Evidence: `src/vtt/dm-encounter-host.ts:807`, `:988`, `:1037`; `tests/unit/vtt/encounter-session-service.test.ts:408`, `:471`, `:520`.
- **F33—resolved.** Classification now checks an accepted service transaction rather than treating every controller request as one. The algorithm regression requires autonomous progress and an empty mutation cache. Evidence: `src/vtt/dm-encounter-host.ts:703`, `:754`; `tests/unit/vtt/encounter-session-service.test.ts:241`.
- **F34—receipt consistency resolved.** The door captures its applied revision’s DM/player projections before refresh and later delivers that captured notification. The regression advances authoritative state during refresh and checks both audience revisions against the door receipt. Evidence: `src/vtt/dm-encounter-host.ts:606`, `:1313`, `:1348`; `tests/unit/vtt/door-intent.test.ts:265`.
- **F35—partially resolved.** Individual enclosing call sites and duplicate calls are now counted, and type-only selector authority is checked. Those changes address the extra-persistence-call and authority-input controls. Renamed re-exports remain a gap. Evidence: `tests/unit/vtt/engine-boundary.test.ts:252`, `:287`, `:377`.
- **F36—resolved.** The test observes actual `AbortController.abort()` calls and the configured reducer entry, alongside controlled successful/failing barriers and unchanged journal/events. Evidence: `src/vtt/dm-encounter-host.ts:474`; `tests/unit/vtt/door-intent.test.ts:319`. The supplied unintended-reducer control is consistent with these assertions.
- S3a/S3b remain unchanged. Restore freshness, detached/frozen projections, private offered-action resolution, throwing-subscriber isolation and stale-revision selector rejection remain present. The normal door cancellation order and attributed payload remain intact.
- HEAD and the six-file diff match the candidate; the tree is clean. Plan, baseline fixture and frozen-contract hashes match. Fixtures/contracts, `docs/**` and `.claude/**` are untouched, and no prohibited patterns appeared in the additions.

I ran no tests or builds. The reported execution results and inspected logs are supplied evidence, not reviewer-executed verification.

VERDICT: REJECT
review complete