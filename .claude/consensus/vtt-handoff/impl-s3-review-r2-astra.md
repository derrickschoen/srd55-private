F30 — **SIGNIFICANT: F23 remains partially resolved—closure still depends on blocked work completing.**

A door operation remains suspended in `flush()` or `await this.#pump`; service closure has no independent settlement mechanism for that operation or the FIFO behind it. The new tests release the barrier immediately after closing, masking this dependency. Evidence: `src/vtt/dm-encounter-host.ts:1080`, `:1098`, `:1157`; `src/vtt/encounter-session-service.ts:285`, `:300`, `:314`; `tests/unit/vtt/door-intent.test.ts:365`, `:366`, `:396`, `:397`.

The ordinary pump also lacks a closed-state check after its post-step flush, allowing publication and unattended-reaction processing after closure (`src/vtt/dm-encounter-host.ts:696`, `:703`, `:714`).

**Required change:** Settle active and queued public operations independently on close, and prohibit subsequent application/publication after every asynchronous barrier. Test closure while leaving the barrier unresolved; release it only after asserting terminal outcomes and then verify no resumed work.

F31 — **SIGNIFICANT: F22’s pre-application recovery can strand a human request or leave the host paused.**

When the initial offer flush fails, the already-started coordinator step remains waiting on its human controller. Failure handling requests another pump without cancelling and settling that step. The replacement step encounters “HumanController already has a pending request,” potentially repeating the failure/repump cycle. Evidence: `src/vtt/dm-encounter-host.ts:666`, `:674`, `:677`, `:784`; `src/combat/controllers.ts:88`.

Door cancellation has another incomplete recovery path: pause/request state changes precede journal writes, but an exception returns `pre_apply` without restoring the prior pause. Cancellation recording can also throw before the actual abort. Evidence: `src/combat/coordinator.ts:356`, `:357`, `:358`, `:370`; `src/vtt/dm-encounter-host.ts:1095`, `:1099`.

**Required change:** Make failed offer setup and cancellation settle the original controller wait and restore a usable control state, or explicitly close/degrade. Add failures before initial offer delivery and during cancellation recording—not only after a human response. Ensure abort cleanup still occurs when recording fails.

F32 — **SIGNIFICANT: F21/F22 still exclude automatic refusal and reaction bookkeeping from the transaction boundary.**

Automatic refusal routing runs after the final flush and outside the failure handlers. Its adjudication branch applies another reducer command, then publishes that changed state as `status` without another flush. An exception can escape before the original transaction settles. Evidence: `src/vtt/dm-encounter-host.ts:696`, `:739`, `:740`, `:906`.

Likewise, unattended reaction resolution applies state before recording its host transition. If that recording throws, the caller’s `autoResolvedReactions` remains zero because the function never returned; a raw recording error is consequently classified `pre_apply`. Evidence: `src/vtt/dm-encounter-host.ts:714`, `:720`, `:866`, `:874`, `:877`.

**Required change:** Carry application tracking through these complete operations, including host-transition recording. Flush and publish automatic consequences as separate autonomous changes, and settle the original refusal independently. Add real-host tests for automatic refusal adjudication and failure after a reaction reducer succeeds.

F33 — **SIGNIFICANT: Autonomous controller actions are classified as mutation events.**

The pump treats any pending controller request ID as a transaction ID, even when no service mutation waiter exists. Consequently, ordinary algorithm/agent steps publish `mutation`, rather than `autonomous`. Evidence: `src/vtt/dm-encounter-host.ts:668`, `:703`, `:709`.

The autonomous regression exercises initial initiative processing, which has no pending controller request, so it does not cover this distinction (`tests/unit/vtt/encounter-session-service.test.ts:121`).

**Required change:** Distinguish a controller request’s correlation ID from an accepted service transaction. Test an actual algorithm/agent decision with no client submission and require an autonomous event with no mutation response or mutation-event cache entry.

F34 — **SIGNIFICANT: Door acknowledgment can lose the snapshot for the revision it actually produced.**

Fresh-offer settlement now accepts a revision greater than the door’s revision. After refresh, the host publishes its *current* snapshot but returns the earlier door revision. The service requires a cached mutation event at that earlier revision and otherwise throws, which its outer catch labels `pre_apply`. Evidence: `src/vtt/dm-encounter-host.ts:818`, `:1191`, `:1207`, `:1208`; `src/vtt/encounter-session-service.ts:406`, `:408`, `:292`.

This can occur when state advances during refresh—for example, a fresh-offer subscriber invokes an existing synchronous host adjudication (`src/vtt/dm-encounter-host.ts:1304`). Preserved movement continuations can also apply additional commands before another offer (`src/combat/coordinator.ts:668`, `:681`).

**Required change:** Preserve the exact durable door revision and its captured projections across refresh. Keep subsequent autonomous updates separate, and never convert an already-applied door operation into a pre-application failure. Add a regression that advances state during refresh and checks acknowledgment/event revision consistency.

F35 — **SIGNIFICANT: F27’s graph check still permits forbidden reducer routes.**

The graph traverses substantially more dependencies, but reducer detection recognizes only named imports called through identifiers. Namespace calls such as `engine.reduceEncounter(...)` are omitted. Moreover, edges are collapsed into a `Set` keyed only by source module and target; an additional reducer call inside an already-permitted module leaves the expected edge list unchanged. This does not pin the exact pacing exception. Evidence: `tests/unit/vtt/engine-boundary.test.ts:95`, `:98`, `:170`, `:175`, `:179`, `:232`.

The replacement also drops the previous selector checks against `DmView`/`EncounterState`; type-only authority inputs are invisible to its value graph (`tests/unit/vtt/engine-boundary.test.ts:46`, `:241`).

**Required change:** Resolve reducer symbols through namespace/re-export forms and identify permitted call sites or enclosing operations, not merely module pairs. Restore checks on selector authority types. Add controls for a namespace reducer call, an extra call within the permitted persistence module, and an authoritative selector input.

F36 — **SIGNIFICANT: F28’s abort/reducer assertions use self-reported counters rather than observing the operations.**

The same-state durability barrier is now genuinely exercised. However, the purported direct abort/reducer observations read counters manually incremented beside the door branch. Calls through another path would not increment them. Evidence: `src/vtt/dm-encounter-host.ts:570`, `:1097`, `:1127`; `tests/unit/vtt/door-intent.test.ts:240`, `:248`, `:255`.

**Required change:** Observe actual cancellation and reducer invocation independently in the test. Retain the controlled successful/failing barriers and unchanged request, journal and event assertions. Demonstrate that an unintended invocation outside the instrumented branch fails the gate.

## Verified claims

- **F21—partially resolved:** Notification kinds now distinguish offers/status/recovery from durable changes. Ordinary successful steps flush before mutation publication, and real-host subscription tests cover refusal and post-application failures. Remaining gaps are F32–F34. Evidence: `src/vtt/dm-encounter-host.ts:206`, `:696`; `tests/unit/vtt/encounter-session-service.test.ts:142`, `:189`, `:229`.
- **F22—partially resolved:** `CoordinatorPostApplicationError` correctly wraps failures after authoritative state installation. Real append/mirror/flush regressions exercise that path. Setup and automatic-operation gaps remain in F31–F32. Evidence: `src/combat/coordinator.ts:85`, `:579`; `tests/unit/vtt/encounter-session-service.test.ts:229`.
- **F23—partially resolved:** Fresh-offer waiters now have explicit terminal outcomes, and explicit closure settles those waiters. Barrier-independent closure remains missing. Evidence: `src/vtt/dm-encounter-host.ts:250`, `:826`, `:1595`.
- **F24—resolved:** Restore freshness is independent of pending-request presence, excludes accepted pending commands, and adds no persisted field. Reopen tests exercise both newly enabled and invalidated movement; reopening uses journal resume/replay validation. Evidence: `src/combat/coordinator.ts:283`, `:339`; `tests/unit/vtt/door-intent.test.ts:293`; `src/vtt/dm-encounter-host.ts:419`.
- **F25—resolved:** Delivered projections are detached and recursively frozen; offered IDs resolve against the host’s internal request catalog. The mutation regression attempts to alter a delivered path and checks the dispatched journal command. Evidence: `src/vtt/encounter-projections.ts:78`; `src/vtt/dm-encounter-host.ts:514`, `:1033`; `tests/unit/vtt/encounter-session-service.test.ts:450`.
- **F26—resolved for the reported exception path:** Seat projections are captured before service observers run, and subscriber exceptions are isolated and reported. Healthy subscribers and queued work are exercised. Evidence: `src/vtt/encounter-session-service.ts:439`, `:469`, `:487`; `tests/unit/vtt/encounter-session-service.test.ts:491`.
- **F27—partially resolved:** The transitive graph and the three reported mutants address the original examples; they do not establish the remaining restrictions identified in F35.
- **F28—partially resolved:** The same-state test now waits for a reached barrier, asserts nonsettlement, and exercises failed acknowledgment. Its independent operation observations remain incomplete. Evidence: `tests/unit/vtt/door-intent.test.ts:241`, `:246`, `:257`.
- **F29—resolved:** Revision mismatch returns `unavailable`, with a targeted regression. Evidence: `src/vtt/encounter-selectors.ts:73`; `tests/unit/vtt/encounter-selectors.test.ts:102`.
- **Closure error transparency:** Preserving the original IndexedDB error after host/service cleanup is correct, and the retained quota test requires it. This does not establish pending-controller cleanup when cancellation recording fails. Evidence: `src/vtt/dm-encounter-host.ts:1580`; `src/vtt/encounter-session-service.ts:300`; `tests/unit/vtt/local-session-store.test.ts:1306`.
- S3a/S3b files are unchanged. The canonical door payload and normal cancellation-before-wait ordering remain intact (`src/vtt/dm-encounter-host.ts:1096`, `:1128`). The tree is clean; baseline, plan and frozen-contract hashes match. No prohibited patterns appeared in the additions, and fixtures/contracts/docs/`.claude` were untouched.

I ran no tests or builds. Execution results remain supplied evidence.

VERDICT: REJECT
review complete