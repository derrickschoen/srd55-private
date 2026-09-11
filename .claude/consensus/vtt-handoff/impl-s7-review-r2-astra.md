**F79 — High — F69 remains incomplete: correlation is still reserved before the ID’s final serialization. Fixable in the second (final) round? yes.**  
[websocket-transport.ts:79](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/src/vtt/handoff/websocket-transport.ts:79) captures the ID’s value, but that value can itself have `toJSON()`. For `id: { toJSON: () => 'wire-id' }`, reservation uses an internal “uncorrelated” key, while the wire carries `"wire-id"`. The response therefore faults or settles another pending request with that ID. The new tests cover a string-returning getter and root-level `toJSON`, not this case.

The plain-object copies at lines 81–89 also silently discard an enumerable own `__proto__` field, potentially converting a structurally invalid request into an accepted one. Preserve serialized structure and bind correlation to the actual scalar wire identity; test both cases.

**F80 — High — F78 introduces an uncaught-error path during socket closure. Fixable in the second (final) round? yes.**  
[node-runtime.ts:347](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tools/vtt-handoff/node-runtime.ts:347) removes the socket’s last `error` listener before completing the close handshake. An authenticated peer can trigger policy closure, then send an invalid frame while the socket remains `CLOSING`. Installed ws still emits `error` from `receiverOnError` (`node_modules/ws/lib/websocket.js:1199`); without a listener, Node throws an uncaught error.

Keep a transport-level error handler until physical closure while removing application listeners. Add a malformed-frame-during-closing regression. Physical-socket tracking and termination of withholding peers are otherwise corrected.

**F81 — High — F72’s required conformance coverage remains absent. Fixable in the second (final) round? yes.**  
[transport-conformance.ts:39](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/helpers/vtt-handoff/transport-conformance.ts:39) wraps names in a generic callback executor; this does not make each scenario executable. “Five terminal intent outcomes” and “visible-to-hidden entity removal” have no exercises in these suites. Duplicate tests still count events rather than reducer executions. The “lawful structural values” exercise checks a fixture coordinate, and “late subscription” rechecks `initialSnapshot()`.

Player movement, mismatch, reconnect, and an actually transmitted unknown-outcome request are useful additions. However, the browser still runs a smaller DM sequence and writes a literal `scenarios: 16` ([runtime-parity.spec.ts:233](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/browser/vtt-handoff/runtime-parity.spec.ts:233)). It does not run the required scenarios through both runtimes. Complete the executable coverage and derive reported counts from completed exercises.

**F82 — Medium — F73’s measurement and mutant remain insufficient. Fixable in the second (final) round? yes.**  
[node-websocket-transport.test.ts:51](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/unit/vtt/node-websocket-transport.test.ts:51) filters global JSON calls by selected caller filenames and one Zod path. Extra serialization moved into a helper escapes measurement. The “mutant” at line 99 adds one to the counter; it never introduces a JSON operation into the measured execution.

The rejected case is duplicate-ID refusal, not invalid-schema handling. Client `safeParse` still constructs serialization-bearing Zod errors for malformed event/response envelopes ([websocket-transport.ts:173](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/src/vtt/handoff/websocket-transport.ts:173)). Measure the complete controlled path, exercise validation failures, and use an actual extra-serialization mutant. The former extra stringify on every valid response is fixed.

**F83 — Medium — F74’s replacement still does not prove composition, and the platform gate remains textual. Fixable in the second (final) round? yes.**  
[engine-boundary.test.ts:534](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/unit/vtt/engine-boundary.test.ts:534) includes root type-only imports, then checks class declarations found in those files. `classDefinitions()` at line 449 does not resolve constructors or service calls. A type-only reference can therefore satisfy “convergence” while execution bypasses the service. The negative controls edit the collected evidence rather than mutate source and rerun extraction.

`platformViolations()` at line 132 also uses identifier text and top-level alias bookkeeping, not symbols. Even `document.createElement('div')` escapes its property-name check; function-local aliases escape too. Retain the expanded production entry list and exact reducer-edge expectation, but restore genuine composition evidence and use source-level mutants with a symbol-resolved platform gate.

**F84 — High — The launch probe races its runtime port allocation. Fixable in the second (final) round? yes.**  
[node-runtime-launch.launch-test.ts:42](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts:42) binds and releases an ephemeral port. Line 81 then requests that specific port in the child. This confirms the supervisor’s TOCTOU diagnosis and explains the reported `EADDRINUSE`.

Set `VTT_RUNTIME_PORT=0`, extract the actual runtime URL from its listening line, and use that address for authentication and cleanup checks. Remove preallocation from both launch branches.

**F85 — Medium — Launch failures discard essential build diagnostics. Fixable in the second (final) round? yes.**  
[node-runtime-launch.launch-test.ts:121](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts:121) reports only captured stderr; timeout errors report neither stream. Both nested build launchers inherit stdout/stderr, so build diagnostics written to stdout reach the probe but disappear from its failure report. Reporting on `exit` can also precede complete pipe drainage.

Capture and surface both streams after bounded drainage, including on timeout and cleanup failure. The source confirms this diagnostic defect; it does **not** establish why the first nested build failed while the supervisor’s separate builds succeeded.

**F86 — Medium — F77’s descriptor-first open can block indefinitely on a FIFO. Fixable in the second (final) round? yes.**  
[node-runtime.ts:88](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tools/vtt-handoff/node-runtime.ts:88) opens with `O_RDONLY | O_NOFOLLOW` before checking file type. A named pipe without a writer blocks inside `openSync`, preventing the regular-file rejection from executing. This regresses the previous immediate rejection of nonregular files.

Use a nonblocking descriptor open followed by the existing regular-file checks. Add a bounded nonregular-file regression. The symlink, descriptor-permission, identity, bounded-read, and growth protections otherwise address F77.

**Verified claims**

- Reviewed clean HEAD `15b9de7e`; the binding plan hash remains unchanged. No tests, builds, agents, or sibling-worktree inspection were performed.
- **F70 is resolved in source:** terminal state precedes error observers, close codes are browser-permitted, and close exceptions are contained. The browser test now exercises production transport fault handling.
- **F71 is resolved:** the outbound queue holds later autonomous events behind the receipt event, and sends the response first. Tests assert response → sequence 2 → sequence 3 and preservation of success when an observer closes.
- **F75’s budget defect is resolved:** the dedicated config now has a five-minute test budget and internal startup deadlines. F76 gains bounded waits, detached process-group termination, and success/failure cleanup paths, but successful launch verification remains outstanding.
- Authentication controls now include Host, key/version, missing Origin, multiple bearer proposals, and player-ID mismatch. Earlier claim binding, server-minted identities, duplicate rejection, loopback binding, engine authority, payload/compression settings, and exact ws pin remain intact.
- The in-process class is unchanged. Its new export is an actual composition function—not a type-only export—but uses the existing constructors with no startup side effect. Added imports are type-only. The Node factory’s narrowed return annotation is behavior-neutral.
- The four test replacements are legitimate reorganizations of retained subjects. The browser replacement is materially stronger; the launch replacement expands scope but still fails its gate. The convergence and serialization replacements cannot yet be accepted as stronger proofs for the reasons above.
- Frozen intel contracts, S6 Worker implementation, and S8 UI remain untouched. No new `any`, suppression/skip/todo constructs, or unrelated timeout increases appeared. Launch-test discovery containment remains intact.
- Supervisor passes are supplied evidence, not independently rerun results; the pending rerun is not counted.

VERDICT: REJECT

review complete