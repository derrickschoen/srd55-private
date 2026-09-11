Reviewed `75fbf004` read-only. No tests or builds were run.

1. **F49 — SIGNIFICANT: F41 remains partial; receipt preservation uses a timer rather than an established receipt.**  
   [in-process-transport.ts:148](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/in-process-transport.ts:148) treats every noninitial event—including unrelated autonomous events—as a receipt candidate. Closure then delays rejection of **all** requests with `setTimeout(..., 0)` at [line 179](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/in-process-transport.ts:179). This neither identifies the committed request nor protects a receipt whose response delivery crosses another asynchronous barrier.

   It also permits reopening a closed transport: if an autonomous-event observer closes while `session.open` remains pending, the deferred open response can subsequently execute `#setStatus('open')` at [line 65](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/in-process-transport.ts:65).

   **Required:** Track established receipts per request, preserve only those outcomes, and make closed/disposed status terminal. Extend the real-host regressions with delayed response delivery, an unrelated autonomous event while requests remain pending, and closure before the open response settles. A timer is not receipt evidence.

2. **F50 — SIGNIFICANT: Session destruction fails to finish cleanup when a service throws.**  
   [mutation-ledger.ts:72](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/mutation-ledger.ts:72) marks the authority destroyed before calling services sequentially. One throwing `close()` prevents remaining services from closing, prevents clearing their references, and leaves the destroyed authority in the registry. Retrying destruction immediately returns; subsequent attachment encounters that poisoned registry entry. Such failures are supported behavior: [dm-encounter-host.ts:1765](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/dm-encounter-host.ts:1765) rethrows interruption failures, and [local-session-store.test.ts:1327](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/local-session-store.test.ts:1327) requires that behavior.

   The same exception skips transport status and pending-request cleanup after [in-process-transport.ts:141](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/in-process-transport.ts:141).

   **Required:** Finish all authority and transport cleanup even when closing fails, then report the error. Add a real failing-store regression with another attached service, pending requests, repeated destruction and subsequent session creation. F43 is resolved for normal detach/reconnect behavior, but incomplete for destruction failures.

3. **F51 — SIGNIFICANT: F44’s identity callback still does not identify the captured projection.**  
   [protocol-runtime.ts:465](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/protocol-runtime.ts:465) reads the host’s **current** bindings while rendering a previously captured event. S3 deliberately captures state separately at [dm-encounter-host.ts:620](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/dm-encounter-host.ts:620), and can perform autonomous bookkeeping between primary capture and delivery at [line 770](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/dm-encounter-host.ts:770). If a captured token has since disappeared, snapshot construction still throws at [scene-snapshot.ts:186](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/scene-snapshot.ts:186).

   The new test manually keeps bindings synchronized with each synthetic projection at [protocol-runtime.test.ts:498](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:498), so it cannot expose this mismatch.

   **Required:** Pair renderer identities with the same authoritative capture as the projection. Test delivery of a captured projection after the live roster changes. Keep identities outside persisted state and visibility-domain fields.

4. **F52 — SIGNIFICANT: The token-appearance regression conceals a remaining production failure.**  
   The runtime retains its original art package at [protocol-runtime.ts:265](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/protocol-runtime.ts:265). Rendering an engine-created token absent from that package throws at [encounter-board.ts:815](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-board.ts:815), before logical-asset fallback can help.

   The appearance test preinstalls artwork for its future token before constructing the runtime at [protocol-runtime.test.ts:463](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:463). It therefore does not demonstrate ordinary post-opening token appearance.

   **Required:** Support an honest fallback or updated presentation mapping for newly created tokens. Add a real-engine appearance regression using the original art package, without predeclaring the future token, followed by hiding/removal checks.

5. **F53 — SIGNIFICANT: The rewrite introduces an independent, non-equivalent request validator.**  
   Runtime imports now use only contract types; [protocol-runtime.ts:149](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/protocol-runtime.ts:149) through line 216 independently reimplement validation. This changes accepted in-process inputs. For example, `scene.snapshot` with `params: new Date()` passes the new non-array-object and empty-key checks. The authoritative generic schema requires a Zod record at [contracts.ts:60](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/v1/contracts.ts:60); its implementation rejects non-plain objects at [schemas.js:1426](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/node_modules/zod/v4/core/schemas.js:1426).

   **Required:** Restore validation derived from the authoritative contract, or establish comprehensive equivalence for any replacement validator. Include the existing positive/negative contract corpus and non-JSON in-process objects. Type-only imports do not enforce validation parity.

6. **F54 — SIGNIFICANT: F47’s stronger counter measures insufficient operations.**  
   The new counter correctly detects calls, but `session.open` runs before measurement at [in-process-transport.test.ts:365](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/in-process-transport.test.ts:365). The passing measurement at [line 386](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/in-process-transport.test.ts:386) only reads an already cached initial snapshot and dispatches an unknown method. It never exercises known-request validation, fresh snapshot production or outgoing event construction.

   Consequently, inserting `JSON.stringify(snapshot)` inside `ProtocolRuntime.#emitSnapshot` would survive this purported zero-serialization gate. The reported controls do not establish coverage of that path.

   **Required:** Measure opening, valid and invalid known requests, a fresh snapshot response, and an outgoing mutation/autonomous event. Keep fixture construction outside measurement, but keep the operations being proved inside it. Demonstrate effective mutations in those actual production paths.

7. **F55 — SIGNIFICANT: F48’s replacement dropped normal-publication refusal coverage.**  
   Complete-tree verification is stronger, but the replacement conflict test now calls only `publishExamples({check:true})` at [handoff-examples.test.ts:453](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-examples.test.ts:453). The previous normal-publication conflict assertion and missing-core publication assertion were removed. The write path performs its own checks at [publish.ts:245](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/publish.ts:245), separately from check mode; that path’s refusal behavior is no longer covered by the replacement.

   **Required:** Retain the complete-tree tests and restore normal-publication conflict and missing-core refusal assertions. A mutation that returns `unchanged` for a conflicting sealed bundle in the write branch must fail.

**Verified claims**

- **F40 resolved:** Notification kinds are mapped explicitly at [protocol-runtime.ts:481](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/handoff/protocol-runtime.ts:481). The new tests cover suppressed notifications, terminal-outcome event counts and reentrant door refresh: [protocol-runtime.test.ts:418](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:418), [line 569](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:569), [line 682](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:682).
- **F41 partially resolved:** Real-host move/door close-from-callback tests exist at [in-process-transport.test.ts:166](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/in-process-transport.test.ts:166); F49 remains.
- **F42 resolved:** Runtime and transport isolate throwing observers. Healthy listeners and opening settlement are asserted at [protocol-runtime.test.ts:438](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:438) and [in-process-transport.test.ts:271](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/in-process-transport.test.ts:271).
- **F43 partially resolved:** Shared default-ledger reuse, reconnection, multiple seats and disposal after refused opening are covered at [protocol-runtime.test.ts:518](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:518). Failure cleanup remains F50.
- **F44 partially resolved:** Bindings are refreshed, but captured-state pairing and ordinary appearance remain F51–F52.
- **F45 resolved:** All recorders remain subscribed at [handoff-examples.test.ts:202](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-examples.test.ts:202). Visibility, movement, door states, revision correspondence and no-op absence are asserted before fixture comparison at [line 341](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/handoff-examples.test.ts:341).
- **F46 resolved for the requested terminal mapping:** The real-service matrix exercises committed, refused, cancelled, closed and failed outcomes with concurrent duplicate rejection at [protocol-runtime.test.ts:569](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/protocol-runtime.test.ts:569).
- **F47/F48 partially resolved:** The serialization counter and complete-tree/hash checks are effective within their measured scope; F54–F55 identify the remaining coverage gaps.
- **Boundary optimization does not weaken the asserted checks:** The same entrypoints, platform checks and six reducer call sites remain at [engine-boundary.test.ts:291](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:291). Symbol resolution still uses `TypeChecker`; `noLib` and graph caching do not remove the repository-source assertions.
- The tree is clean. Frozen-contract, baseline, plan and examples hashes match the supplied values. No prohibited constructs were found in the reviewed changed sources/tests; the protected contract, scene-fixture, documentation and `.claude/**` paths are unchanged.

VERDICT: REJECT
review complete