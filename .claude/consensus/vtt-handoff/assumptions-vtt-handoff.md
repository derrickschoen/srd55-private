# Assumption register — VTT-HANDOFF-01 (opened 2026-09-09 15:37 EDT)

Format: A<n> | claim | status proved/disproved/unproved | method + raw evidence | load-bearing for.

A1 | The distribution is Ubuntu and the repo path is the named one, not a lookalike | proved | /etc/os-release NAME="Ubuntu" 22.04.5; git rev-parse --show-toplevel = /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static; remote mirror srd55-private | everything
A2 | wslpath -w of .tmp/vtt-handoff equals the owner's Windows view path | proved | wslpath output byte-equal to the spec path | handoff root, Windows probe
A3 | The encounter app runs the engine on the main thread; no VTT Web Worker exists | proved (by grep: only db/worker.ts and browser-capability-worker.ts construct Workers) | missing-component record; Worker runtime is NEW work
A4 | No network engine listener exists in production (serve.mjs is static; MCP is stdio; ai-bridge is dev-only) | unproved (dm-bridge /dm/* server side not yet located) | Node adapter design
A5 | python3 -m venv fails without sudo; --without-pip + pip --python works user-locally | proved | venv exit 1 (ensurepip); without-pip + pip 26.2.1 installed into probe venv | bootstrap script
A6 | The existing art/requests uuidv7() is untested | proved | grep tests for uuidv7: none | art:request must add a tested implementation
A7 | Gate port 4410 is free and outside the Playwright default pool | proved | ss -ltn | lane Playwright runs
A8 | Baseline gate battery passes on main @ 0f84e09f | proved | gate-wt4 on wt-vtt-handoff: tsc 0, sg 0, vitest-gate 0 (3 load flakes serial-pass), playwright-gate 0 (~/dnd-slim-runs/gate-wt-vtt-handoff.log) | §8 baseline
A4 (update) | A Node-side /dm/* HTTP server DOES exist outside the Vite dev bridge: tools/discord-launcher/codex-dm-bridge.mjs (routes /dm/session, /dm/exchange, /dm/mirror; tested by tools/discord-launcher/dm-bridge.test.mjs against 127.0.0.1) | proved by grep | Node adapter design may reuse its listener discipline (bind/origin handling to be read)
A9 | src/vtt/encounter-app.ts never calls reducers/coordinator directly; every state change goes through DmEncounterHost methods (26 distinct host.* calls; zero reduceEncounter/createEncounter/TurnCoordinator references) | proved by grep on main @ 0f84e09f | S8 scope: the UI already sits behind the host; the extraction is about making the host renderer-neutral and snapshot-only for reads, not re-routing rules calls
A10 | "No WebSocket server exists" (audit) is WRONG as stated: tools/discord-launcher/relay-server.mjs is a hand-rolled versioned WebSocket ECHO relay on 127.0.0.1 (spike, disposable per its README, no encounter state, no peer auth, not covered by vitest/gate); codex-dm-bridge.mjs is a localhost-only HTTP DM bridge with a local-origin allowlist (localhost/127.0.0.1 only, 403 otherwise) | proved by reading tools/discord-launcher/{README.md,relay-server.mjs,codex-dm-bridge.mjs} | S7 may reuse the origin-allowlist + 127.0.0.1 bind discipline; the echo relay is not a transport to build on (no framing >64 KiB, no fragmentation, no auth)

## Independent Astra assumptions pass (session 01a087af-14c4-7522-8039-f091c2593872, 2026-09-09 15:47) — full text in assumptions-astra-pass.md (98 items)
Items that change the plan (supervisor merge; each verified by Astra with file:line; supervisor spot-checks marked ✔):
- A14 ✔ /vtt direct mount needs `encounter=reference` (src/main.ts:47); the smoke test must use a verified entry route (`/vtt?encounter=d365` + load button, as the D588.2 capture script does).
- A25/A26/A27: save rename/delete/restore/import/folder ops in encounter-app.ts bypass DmEncounterHost (1620, 1632, 1681, 1687, 1704, 1733) → the session-lifecycle boundary is a separate step from gameplay intents.
- A29: the UI waits for store flush before publishing the player projection (1487–1513) → mutation acknowledgment ordering must preserve durability.
- A32 ✔ player channel is BroadcastChannel, not window.postMessage; A33: `view=dm` URL grants the DM view (no auth) → current trust model is presentation-only; document, do not claim security.
- A36: one `seat:local-party` projection for all players; per-player seats are NEW policy → playerId in session.open is a documented placeholder unless implemented.
- A38/A44/A47/A48: no explored-cell history, no wall segments/heights, no door→wall relation, no point-light photometry in EncounterState → these SceneSnapshot fields are DERIVED/SYNTHETIC by documented policy or UNSUPPORTED; never invented as engine facts.
- A42: multicell token anchors extend east/south from the stored anchor (creature-space.ts:396) → ground-centre conversion is footprint-dependent and must be reversible for token.move.
- A49: existing world ops (modify_object, set_light_level at encounter.ts:11682/11769) do not carry door.set/light.set semantics → map explicitly or return UNSUPPORTED.
- A50/A51/A52/A56/A57: protocol revision/seq must be defined over journal revisions, undo branches and room transitions; saves are schema-12 journal DAGs; RNG carries cursor/draw/stream state; both runtimes must use reduceSessionEncounter (vane-warren chain), not bare reduceEncounter.
- A59–A62: src/rpc client has correlation/cleanup but no `v`, subscriptions, dedup, timeouts or send-failure cleanup → reuse mechanisms behind a versioned adapter, add lifecycle semantics.
- A67/A68: `npm test` ≠ every test file; build/tsc/typecheck differ → the gate battery names each command.
- A72–A82: logical asset ids are NOT valid AssetIds (brand regex); existing art queue naming/checker/uuidv7 do not satisfy the new agreement; pngDimensions is not a validator; provenance does not auto-license → new outbox/inbox modules, tested uuidv7, real PNG validation, staging only.
- Contradiction noted by Astra: the global CLAUDE.md "stash unrelated changes" instruction conflicts with the owner's explicit no-stash rule → the owner directive wins (no stash).
