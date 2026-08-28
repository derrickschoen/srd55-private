# Four-CLI live conformance matrix — recorded run (D398/D399)

Date: 2026-08-28. Supervisor-run (`tools/agent-conformance.ts`), sound
proof-token check (response-only sha256 token, prompt provably token-free,
up to 3 attempts). Local model per D399.3/D399.4: ollama gemma4:e4b (CPU),
torn down after this run. Protocol conformance: SUBSTITUTED_LOCAL (official
tooling absent offline).

| CLI | Version | Status | mcpProof | Attempts | Reason |
|---|---|---|---|---|---|
| codex | codex-cli 0.148.0 | **VERIFIED** | True | 1 | - |
| opencode | 1.18.23 | **FAILED** | False | 3 | upstream_mcp_tools_not_exposed_issue_33027 |
| pi | 0.73.1 | **FAILED** | False | 3 | lifecycle_incomplete |
| claude-code | 2.1.246 (Claude Code) | **VERIFIED** | True | 1 | - |

Notes:
- codex and claude-code: full lifecycle VERIFIED including a genuine MCP
  tool round-trip (proof token exists only in the tool result; resource
  view strips it).
- opencode: engine server connects (`opencode mcp list` confirms) but
  opencode 1.18.23 never exposes MCP tools to the headless agent in any
  mode (run / serve / attach / REST) — upstream issue
  anomalyco/opencode#33027. No model can pass until upstream fixes it.
- pi: plumbing supervisor-proven end to end (pi-mcp-adapter proxy returned
  the real state-summary result after the 7g schema fix; requires
  lifecycle:eager + single MCP config layer). The model-driven proof failed
  3/3 on gemma4:e4b — a model-capability gap, not an MCP gap. Re-run at the
  release gate with authenticated providers per D399.2.
- Full run log + JSON report archived with the session; this file is the
  durable record required by design §9.4.

## Raw report JSON

```json
{
 "schemaVersion": 1,
 "title": "LIVE AGENT CLI CONFORMANCE \u2014 NOT SIMULATED",
 "generatedAt": "2026-08-28T11:22:49.839Z",
 "protocolConformance": {
  "status": "SUBSTITUTED_LOCAL",
  "reason": "official_conformance_and_inspector_not_installed_network_fetch_forbidden"
 },
 "records": [
  {
   "cli": "codex",
   "present": true,
   "version": "codex-cli 0.148.0",
   "status": "VERIFIED",
   "reason": null,
   "lifecycle": {
    "coldStart": true,
    "sessionIdCaptured": true,
    "resume": true,
    "mcpProof": true,
    "attempts_used": 1,
    "classifiedResumeFailure": true
   },
   "contractEvidence": {
    "marker": "UNVERIFIED_CONTRACT:codex-live-mcp-and-resume",
    "liveStatus": "VERIFIED",
    "turnMarkers": []
   },
   "errorExcerpt": null,
   "stderrTail": null
  },
  {
   "cli": "opencode",
   "present": true,
   "version": "1.18.23",
   "status": "FAILED",
   "reason": "upstream_mcp_tools_not_exposed_issue_33027",
   "lifecycle": {
    "coldStart": true,
    "sessionIdCaptured": true,
    "resume": true,
    "mcpProof": false,
    "attempts_used": 3,
    "classifiedResumeFailure": true
   },
   "contractEvidence": {
    "marker": "UNVERIFIED_CONTRACT:opencode-argv-and-events-evidence-based-live-mcp-pending",
    "liveStatus": "FAILED",
    "turnMarkers": []
   },
   "errorExcerpt": "OpenCode upstream issue anomalyco/opencode#33027: connected MCP tools are not exposed to the headless agent.",
   "stderrTail": ""
  },
  {
   "cli": "pi",
   "present": true,
   "version": "0.73.1",
   "status": "FAILED",
   "reason": "lifecycle_incomplete",
   "lifecycle": {
    "coldStart": true,
    "sessionIdCaptured": true,
    "resume": true,
    "mcpProof": false,
    "attempts_used": 3,
    "classifiedResumeFailure": true
   },
   "contractEvidence": {
    "marker": "UNVERIFIED_CONTRACT:pi-argv-and-events-evidence-based-live-mcp-extension-pending",
    "liveStatus": "FAILED",
    "turnMarkers": [
     "SESSION_ID_FROM_EXPLICIT_SESSION_FILE_PATH",
     "MCP_EXTENSION_CONFIGURED",
     "SESSION_ID_FROM_EXPLICIT_SESSION_FILE_PATH",
     "MCP_EXTENSION_CONFIGURED",
     "SESSION_ID_FROM_EXPLICIT_SESSION_FILE_PATH",
     "MCP_EXTENSION_CONFIGURED",
     "SESSION_ID_FROM_EXPLICIT_SESSION_FILE_PATH",
     "MCP_EXTENSION_CONFIGURED",
     "SESSION_ID_FROM_EXPLICIT_SESSION_FILE_PATH",
     "MCP_EXTENSION_CONFIGURED"
    ]
   },
   "errorExcerpt": "One or more required lifecycle proofs did not complete.",
   "stderrTail": ""
  },
  {
   "cli": "claude-code",
   "present": true,
   "version": "2.1.246 (Claude Code)",
   "status": "VERIFIED",
   "reason": null,
   "lifecycle": {
    "coldStart": true,
    "sessionIdCaptured": true,
    "resume": true,
    "mcpProof": true,
    "attempts_used": 1,
    "classifiedResumeFailure": true
   },
   "contractEvidence": {
    "marker": "UNVERIFIED_CONTRACT:claude-code-mcp-and-resume",
    "liveStatus": "VERIFIED",
    "turnMarkers": []
   },
   "errorExcerpt": null,
   "stderrTail": null
  }
 ],
 "aggregate": "FAILED",
 "exitCode": 1
}
```
