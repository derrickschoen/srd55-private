**F69 — High — Client correlation can be overwritten during serialization. Fixable in one round? yes.**  
[websocket-transport.ts:54](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/src/vtt/handoff/websocket-transport.ts:54) checks for duplicates before `JSON.stringify`, then registers the pending request afterward. A getter or `toJSON()` can synchronously submit another request with the same ID; the outer invocation then overwrites its pending entry, misattributes its response, and leaves one promise unresolved. Separately, an ID getter can produce different IDs during correlation and serialization. Capture a stable request representation, reserve correlation without a reentrancy gap, and test both cases.

**F70 — High — Client fault handling can throw and permits submissions after detecting a terminal fault. Fixable in one round? yes.**  
[websocket-transport.ts:181](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/src/vtt/handoff/websocket-transport.ts:181) notifies error observers before becoming terminal. An observer can therefore submit another mutation while the socket remains open. The subsequent shutdown calls browser `WebSocket.close(1002, ...)` at line 207; browser callers may supply only `1000` or `3000–4999`. This throws `InvalidAccessError`; `finally` clears local bookkeeping but does not close the socket or contain the exception. Establish terminal state before observers, use a browser-permitted close operation, and contain close exceptions. Exercise malformed server messages through the actual browser transport.

**F71 — High — Buffered receipts allow snapshots to arrive out of sequence. Fixable in one round? yes.**  
[node-runtime.ts:288](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tools/vtt-handoff/node-runtime.ts:288) buffers receipt-bearing events until dispatch resolves, while immediately sending subsequent events without receipts. The real host can deliver a primary mutation notification followed synchronously by autonomous reaction notifications ([dm-encounter-host.ts:814](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/src/vtt/dm-encounter-host.ts:814)). Consequently, sequence N+1 can cross the socket before buffered sequence N, which is sent at node-runtime.ts:357. The client then replaces its latest snapshot with older state. An observer closing on the intervening event can also lose the already-established mutation outcome. Preserve publication order and establish the matching response before exposing subsequent events; add a controlled receipt-plus-autonomous-event regression.

**F72 — High — The claimed 16-scenario conformance proof is incomplete. Fixable in one round? yes.**  
[transport-conformance.ts:9](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/helpers/vtt-handoff/transport-conformance.ts:9) declares scenario names; [runtime-parity.test.ts:42](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/unit/vtt/runtime-parity.test.ts:42) merely counts them. The runner does not exercise successful movement, player mismatch, all five terminal outcomes, reconnect, visible-to-hidden removal, an execution-count duplicate assertion, or an actually submitted mutation whose outcome becomes unknown. The getter test closes before submission, so it does not prove the last scenario.

The browser test independently performs a smaller DM sequence using raw `WebSocket`, bypassing `WebSocketSceneTransport` ([runtime-parity.spec.ts:75](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/browser/vtt-handoff/runtime-parity.spec.ts:75)). The separate Node player-movement test is useful, but does not establish three-runtime conformance. Implement executable scenarios with independent assertions and negative controls. Also supply missing authentication controls for Host/key/version, originless policy, multiple bearer proposals, and player-ID mismatch.

**F73 — Medium — Serialization exceeds the claimed budget, and the measurement misses it. Fixable in one round? yes.**  
[websocket-transport.ts:131](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/src/vtt/handoff/websocket-transport.ts:131) first tries every response against the event schema. Each ordinary response therefore constructs a Zod error before response validation. Installed Zod’s error initializer calls `JSON.stringify` (`node_modules/zod/v4/core/errors.js:13`). Thus extra serialization occurs even on successful response traffic.

[node-websocket-transport.test.ts:30](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/unit/vtt/node-websocket-transport.test.ts:30) counts injected codec wrappers, which cannot observe this extra work. Measure actual JSON operations over controlled message traffic, including rejected inputs, and demonstrate that an added serialization operation makes the proof fail.

**F74 — Medium — The convergence gate proves aggregate presence, not convergence of every adapter. Fixable in one round? yes.**  
[engine-boundary.test.ts:402](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/unit/vtt/engine-boundary.test.ts:402) merges all entry graphs, including a test helper that itself constructs the accepted service. Finding the expected classes somewhere in that union does not prove each runtime reaches the service. The reducer check uses `toContain`; an additional direct reducer call in the Node runtime would remain acceptable. The older exact reducer assertion excludes that entry.

The platform gate remains textual at line 111 and misses bare Node imports and aliased/computed browser globals. At reconciliation, retain this lane’s symbol-resolved constructor/reducer attribution, WebSocket coverage, and exclusion of `encounter-app.ts`; strengthen these into per-entry evidence, exact permitted reducer edges, and negative controls. Incorporate the supervisor-described S6 platform-gate improvement without treating this version as sufficient.

**F75 — High — The launch probe lacks a budget for its actual startup path. Fixable in one round? yes.**  
[vitest.config.ts:9](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/integration-supervisor/vitest.config.ts:9) sets no timeout. [serve.mjs:221](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tools/serve.mjs:221) synchronously restores/builds dist before listening. This confirms the supervisor’s timeout diagnosis, although source alone does not establish that every warm-cache launch must exceed five seconds.

Use a documented timeout measured in minutes in this new dedicated config. The probe **already waits for both listening lines** at launch-test.ts:29–32; retain that behavior. This is a new probe’s design budget, not an increase to an existing test wall. A verified-dist startup flag is optional, not necessary to fix this defect.

**F76 — Medium — Launch-probe failure cleanup is not guaranteed. Fixable in one round? yes.**  
[node-runtime-launch.launch-test.ts:27](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts:27) awaits startup without an internal deadline or cancellation. Vitest timing out does not unwind that suspended function into its `finally`. Furthermore, cleanup signals only the npm PID and does not await forced cleanup of the process tree. The successful-path assertion checks one endpoint, not disappearance of the static server and runtime descendants.

Use bounded waits that actually reject, supervise the launched process tree, and always await termination. Prove cleanup after both successful startup and an injected startup failure.

**F77 — Medium — Token-file checks are vulnerable to changes between inspection and reading. Fixable in one round? yes.**  
[node-runtime.ts:80](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tools/vtt-handoff/node-runtime.ts:80) checks permissions, symlink status, and size before opening with ordinary `'r'`. The descriptor check verifies identity and regular-file status, but not permissions or size. `readFileSync(descriptor)` then reads without a bound. A same-inode permission change or growing file defeats those earlier checks; replacing the pathname with a symlink to the same inode also passes the identity comparison.

Open without following symlinks, validate the opened descriptor, and read at most the limit plus one byte. Add controls for descriptor-time changes and oversized input.

**F78 — Medium — Server cleanup drops closing sockets before they are actually closed. Fixable in one round? yes.**  
[node-runtime.ts:296](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff-s7/tools/vtt-handoff/node-runtime.ts:296) removes the socket from `sockets` before initiating its close handshake and leaves the anonymous message/close/error listeners attached. Factory shutdown at line 384 therefore cannot terminate these still-closing sockets. A peer ignoring the close handshake remains in `wss.clients`, delaying `wss.close()` until ws’s 30-second close timer expires.

Track physical sockets through actual closure, remove application listeners during terminal cleanup, and ensure factory shutdown terminates closing peers too. Verify this with a peer that deliberately withholds its close response.

**Verified claims**

- Reviewed HEAD `f330de9c`; working tree remained clean. The binding plan hash matches the supplied SHA-256.
- Authentication occurs before `handleUpgrade`; ordinary rejection uses HTTP 401 and destruction. Host, Origin, key/version, protocol proposals, and token hashes are checked. Hash comparisons use `timingSafeEqual`.
- `ws` is exactly pinned to `8.18.3`; `noServer`, 1,048,576-byte payload limit, disabled compression, and the default five-second open deadline are present.
- Listeners bind to `127.0.0.1`. Factory creation does not start listening.
- Invocation identities are server-minted through the accepted runtime. Wire duplicates are rejected before dispatch. Principals derive from claims; sessions receive separate services and ledgers. The Node tests include successful player movement and cross-seat refusal.
- Engine submission still uses offered-action IDs. `UNSUPPORTED` does not manufacture success.
- Browser Origin derives from the configured port; bearer delivery uses subprotocols rather than URLs.
- Supervisor launch tests are outside ordinary discovery; the scoped exclusion preserves Vitest defaults.
- The lane leaves frozen intel contracts, S6 Worker implementation, and S8 UI untouched. No deleted `it(` tests, prohibited suppression/skip constructs, or raised existing timeouts appeared in the diff.
- No tests/builds or agents were invoked. Reported supervisor passes are supplied evidence, not independently rerun results.

VERDICT: REJECT

review complete