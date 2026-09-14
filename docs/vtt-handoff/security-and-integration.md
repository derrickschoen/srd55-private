# Security and integration

## Current trust boundary

The Node runtime is loopback-only. `tools/vtt-handoff/node-runtime.ts` binds `127.0.0.1`, accepts only `/vtt/v1`, disables per-message deflate, caps payloads at 1 MiB, requires an exact allowed `Origin` unless explicitly configured for originless clients, and refuses malformed upgrades. This is local integration, not an Internet-facing WSS deployment.

Authentication is supplied in `Sec-WebSocket-Protocol` as exactly `vtt.v1` plus `bearer.<base64url-token>`. The server selects only `vtt.v1`; the bearer protocol is upgrade authentication, not the negotiated application protocol. `VTT_RUNTIME_TOKENS_FILE` contains SHA-256 token claims bound to a DM or player principal. `tools/vtt-handoff/token-claims.ts` requires a regular nonsymlink file with mode 0600, caps it at 65,536 bytes, and checks the same device/inode before and after its bounded read. Never put the raw token in a URL or report.

The authenticated claim, not `session.open.requestedRole`, owns the seat. Player claims require `playerId`; DM claims forbid it. Player projection and movement are constrained by the registered seat. Player-hosted Worker trust is not secret protection: a page that owns a Worker can observe its traffic and lifetime.

Malformed transport input produces a typed fault or WebSocket close, never invented success. Unknown and `light.set` methods are `UNSUPPORTED`. Mutation IDs are permanently reserved per logical session. A lost connection with an unresolved mutation must not retry it automatically. Current socket reconnect behavior creates a new memory-backed session: issue `session.open`, discard old renderer state, and apply the new full snapshot.

## Windows connection points

The shared location is the absolute `VTT_HANDOFF_ROOT`, normally displayed to Windows as `\\wsl.localhost\Ubuntu\...`. Windows reads published `contracts/v1` and `fixtures`, writes only its owned `art/inbox/<request-id>` bundle and result manifest, reads requests from `art/outbox`, and reads reports from `reports/claude`. It must never write `reports/claude` or reinterpret contract `READY.json` as overall readiness. Linux never publishes a report under `reports/windows`.

Before declaring integration ready, run the explicit bidirectional Windows probe in `tools/vtt-handoff/windows-probe.ts`. A Windows result of `NOT_RUN`, `UNAVAILABLE`, or `FAILED` makes the overall report `PARTIAL`; only `PASSED`, together with all required gate results, permits `READY`.

`npm run handoff:publish` reads supervisor evidence from the absolute or relative file named by `VTT_HANDOFF_REPORT_INPUT` or `--report-input`. That JSON has `schemaVersion:1`, nonempty `tools` entries (`name`, actual `version`, actual `command`), gate results (`name`, command, status, summary, and pre-existing failures), actual UUIDv7 `artRequests` with matching outbox/result paths, and one `windowsProbe` result. The required gate inventory is fixed in `tools/vtt-handoff/report.ts`; an input cannot make a gate optional, and every omitted inventory result is named in the `PARTIAL` reasons. Missing or invalid evidence also produces `PARTIAL`. `--check` compares the expected report bytes and writes nothing.

## Future deployment work

An external deployment needs a TLS terminator and WSS, explicit trusted origins, host/proxy validation, secret distribution and rotation, rate and connection limits, durable session ownership, deployment health/observability, and a decision about resumption and idempotency. Do not expose the present loopback server directly or treat the synthetic Worker harness as a hardened runtime.

## Known limitations at commit 042c530d

- F79/F81: WebSocket identity-capture edge cases remain in the integration ledger.
- F82/F87: Worker and terminal-outcome conformance coverage has known gaps.
- F83: JSON-operation measurement proves the client side only.
- F88: the production build inherits `NODE_ENV`; its correction is tracked separately on main.
- F94/F95: top-down closure and post-close settlement edge cases remain ledgered.

These limitations are not contract-bundle corruption. They prevent an unqualified overall readiness claim where applicable, and they must remain visible in `reports/claude/READY.md` and `handoff.json`.
