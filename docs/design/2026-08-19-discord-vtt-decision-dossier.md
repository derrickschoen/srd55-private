# Discord as a VTT surface: decision dossier

**Date:** 2026-08-19  
**Status:** decision input required by D314.14; this document is not an owner ruling  
**Decision scope:** how, if at all, Discord should become a surface for the
browser-authoritative VTT

## Executive summary

There are three credible shapes:

| Shape | What the owner and the table use | The one-sentence distinction |
|---|---|---|
| **1. Screen-share only** | The owner runs the existing local player view and separate DM window, and shares the player view through Discord. | Discord carries pixels and conversation; every game action still happens in the owner's browser. |
| **2. Bot-relay hybrid** | A Discord bot posts filtered map snapshots and receives proposed moves, attacks, and confirmations through commands/buttons. | Discord becomes a turn-by-turn remote control and transcript, but never a live canvas. |
| **3. Discord Activity** | The player projection runs as an embedded Activity in the Discord call, backed by a WebSocket relay and server-side OAuth exchange. | Discord becomes the live player client, which buys VTT-like fidelity by adding hosted runtime and operational responsibility. |

**In one sentence: Shape 1 streams pixels, Shape 2 exchanges commands and
snapshots, and Shape 3 hosts the interactive player client.**

**Recommendation:** keep Shape 1 for the D314 first playable skirmish, retain the
already-binding D315.18 Discord-ready envelopes, and do not build a Discord
transport until the owner says remote humans—not merely spectators—are a real
target. If that target is confirmed, prototype Shape 2 as a disposable adapter
before considering Shape 3. Rank Shape 3 last for the present milestone.

The reason is not merely effort. The binding first session has the owner play
the PCs from the filtered projection while codex runs the monsters and narration
(D313.1, D314.2), so neither remote command entry nor an embedded multiplayer
client improves the required loop. Shape 1 already satisfies that loop. Shape 2
can later add remote proposals without moving encounter authority or secrets out
of the owner's browser. Shape 3 cannot use the current WebRTC transports because
Discord's Activity proxy does not support WebRTC; it therefore requires an
always-on WebSocket relay and a server-side OAuth exchange. That directly
collides with D312.3/D313.2's local deployment and D262.8's no-cloud-accounts
scope. The feasibility research also found no grid/token/fog VTT Activity prior
art, so the highest-cost option has the least project-specific evidence.

The owner decisions forced by each shape are:

- **Shape 1:** Is a shared view with the owner entering every PC action enough?
  If yes, no scope ruling changes. If no, the owner must define who remotely
  controls which PC before selecting another shape.
- **Shape 2:** Is command-response interaction acceptable for movement, exact
  area placement, reactions, and confirmations? Does Discord application setup
  count as a forbidden cloud account? Who runs the bot/relay during a session,
  and may the local game continue when it is unavailable?
- **Shape 3:** Will the owner explicitly replace the no-server/no-cloud boundary,
  accept hosted client + OAuth + relay operations, and support connection
  failures in a surface that the table now depends on? Is live embedded dragging
  valuable enough to justify that permanent operational product?

### Recommendation in one line

**Choose Shape 1 now; preserve transport-neutral seams; authorize Shape 2 only
after remote human control is ruled in; treat Shape 3 as a new hosted milestone,
not as a deployment variant.**

### Binding baseline this dossier does not change

- Encounter authority stays in the owner's browser; remote input is a proposal
  and only the local reducer mutates state (D260.2, D313.2).
- Fog-hidden state never leaves the DM boundary (D260.8). A player client or
  Discord service may receive only a serialized player/table projection.
- Every reducer revision, pending request, RNG state, revision branch, and codex
  session id is persisted locally; the server is not the durable authority
  (D260.3, D314.12, D315.9–10).
- The owner's primary view is the filtered player projection. Full DM state and
  controls remain in a separate local window (D314.2, D315.11).
- One codex request plans every living monster at the start of a round and is
  re-consulted only after invalidation (D315.7; plan increment 7).
- Discord-ready command/projection envelopes are designed now, but D315.18 says
  this does not decide or implement a Discord transport.
- The current phase excludes cloud accounts, application-owned voice/video, and
  a hosted asset library (D262.8); Cloudflare work is configs/code only with no
  deploy or paid plan (D260.6).

### How to read the worked rounds

Each round uses the D314.1 shape: one room, three illustrative level-7 reference
party PCs, and five monsters. “Fighter,” “Cleric,” and “Wizard” identify the
D260.1 reference profiles; the five monsters are deliberately unnamed so this
document asserts no unsourced statblock behavior. The illustrative initiative
order is Fighter, monster 1, Cleric, monster 2, Wizard, monsters 3–5. That order
is a UX fixture, not a D&D rule. The engine mechanics named below—movement,
attacks, saves, area preview, reactions, conditions, and the PC/monster death
policies—are in D314.6–8 and D315.1–7; no new D&D rule is asserted here.

The current binding target has one human PC operator: the owner. “Other players”
below therefore means other people in the Discord call watching the table. Letting
them control PCs would amend the D313/D314 playable target and is one of the
owner questions, not an assumption hidden in these examples.

## Shape 1 — screen-share only

### Worked round: what the owner actually experiences

**Before the round.** The owner opens the player-primary board and the separate
local DM window. Only the player board is shared. Other people in Discord see
the same filtered board pixels the owner sees; they never receive a board
document or hidden fields. The DM window shows fog-hidden state, hidden rolls,
codex status, interrupt, undo, and adjudication controls locally. At round start,
the local bridge sends the full DM projection and visible revision history to
the persisted codex session once; a spinner/status in the DM window is where
this planning delay lands.

1. **Fighter turn.** The player board highlights the Fighter. The owner drags a
   path, sees the local legality preview, confirms movement, selects an attack,
   and confirms its target. Every confirmation becomes a `HumanController`
   decision and a persisted reducer revision. The shared stream shows the
   token and visible result after the browser renders it. Other people can say
   what they would prefer, but the owner must perform the clicks.
2. **Monster 1 turn.** The browser executes the first still-legal monster intent
   from the round plan. The owner sees only the filtered movement, visible roll,
   and narration on the shared player board. A fog-hidden decision and any
   private fact remain in the DM window and codex context. There is no new
   network hop for encounter resolution; latency is local rendering plus any
   narration/plan re-consult if the intent was invalidated.
3. **Cleric turn.** The owner selects the Cleric, chooses an action, places any
   required target/area through the browser controls, reviews the exact preview,
   and confirms. Everyone sees the pointer only if the chosen Discord screen
   share carries it; whether it does is **UNVERIFIED**. There is no independent
   view, zoom, or inspection for another participant.
4. **Monster 2 turn and reaction.** Monster 2's intent executes locally. If the
   engine's standing reaction policy cannot decide, the active player view
   pauses on a durable reaction prompt. The owner answers it. Everyone waits
   for that one click; there is no way for another person to answer on their own
   device.
5. **Wizard turn.** The owner drags an exact area preview across the room and
   confirms. This is the best case for Shape 1: preview and confirmation occur
   in one responsive local canvas, and the shared stream shows the result. It
   is also the collaboration limit: other people may talk, but only the owner
   can manipulate the template.
6. **Monsters 3–5.** The coordinator executes each surviving legal intent from
   the same round plan. If the Wizard's action made an intent stale or illegal,
   execution stops, the pending boundary is already autosaved, and the local
   bridge re-consults the same codex session. The table waits on that codex
   response, not on Discord state synchronization.
7. **Round boundary.** The final revision is already in the local event store.
   The owner can inspect or undo from the private DM window. At the next round
   start, one new all-monster plan is requested. If Discord screen sharing has
   failed, the local encounter is still intact and can continue privately or
   pause while the owner restarts the share.

**Where latency lands:** codex planning/re-consult, local rendering, and the
external screen-share encode/network/decode path. The VTT itself adds no hosted
relay round trip. Exact end-to-end screen-share delay is **UNVERIFIED**.

**The uncomfortable part:** every remote person's agency is voice-mediated.
They cannot inspect the map independently, pan/zoom privately, place an area,
or answer a prompt. The owner becomes the mouse for the entire party. This is
acceptable for the binding one-owner playtest and poor for a distributed table
of human PC controllers.

### Architecture delta from draft 1

**Delta: none for Discord.** This is section 8's intended deployment.

- `src/vtt/local-session.ts` remains the composition root for authoritative
  `EncounterState`, RNG, `ControllerRegistry`, `TurnCoordinator`,
  `VisibilityProjector`, controls, and persistence.
- `src/vtt/app.ts` remains a UI adapter; pointer/keyboard/action inputs submit
  `HumanController` decisions rather than mutating tokens or calling rules
  functions directly.
- `src/vtt/presentation.ts` renders only `VisibleEncounterState`. A second
  owner-controlled window receives only that projection through a local
  `BroadcastChannel`; authoritative state is never sent and hidden with CSS.
- `src/vtt/encounter-snapshot.ts` in section 8 is superseded in authority by
  increment 5's event-sourced local store; a snapshot may only be a cache.
- `src/vtt/remote-contracts.ts` remains interfaces/types only. There is no
  ingress, framing, peer session, relay, or remote UI.
- Increment 7's localhost bridge and versioned command/projection envelope
  schemas are built as planned. The Discord render constraints are proven by
  fake contract tests, but no Discord adapter consumes them.

As of this dossier, only plan increments 1–2 are stated as landed. Repository
inspection matches that statement: the shared movement/resolution files exist,
while `local-session.ts`, `presentation.ts`, `remote-contracts.ts`, and the
increment-7 bridge do not yet exist. Existing `src/vtt/sync.ts`,
`src/vtt/transports/manual.ts`, and `src/vtt/transports/trystero.ts` are Phase-1
prototype paths and are not part of the authoritative encounter loop.

### Binding-ruling fit

**Satisfies without amendment:** D260.2 (DM-only mutation), D260.3 (local
autosave/server stateless), D260.6 (no deployment), D260.8 (fog stays local),
D262.8 (no added cloud account/voice-video implementation/hosted asset library),
D312.3–4 (browser + screen share; remote seams only), D313.1–3 (local codex-DM
bridge with full DM projection), D314.2 and D315.11 (player-primary board plus
separate local DM window), D315.7 (one monster plan per round), and D315.18
(envelopes designed without transport implementation).

**Contradicts:** none of the binding rulings. It simply does not provide remote
human control, which is not in the current playable target.

### Effort, gates, and operating cost

**Discord-specific effort: zero increments.** The feasibility research calls
this the status quo and “zero extra engineering.” The underlying VTT increments
3–10 still have to land, but they are not a cost caused by this shape.

| Increment | Work | Independent gate |
|---|---|---|
| S1.1 — sharing runbook | Document which local window is shared and prove the DM window is excluded. This may be folded into the existing playable-exit documentation. | A manual session capture contains only a serialized player projection; seeded hidden sentinels never appear. |

**Ongoing cost:** no project-owned hosting and no project uptime service. The
owner operates the browser, local bridge, and external Discord share for the
duration of a session. When the share is down, remote people lose sight of the
table, but the event-sourced encounter continues locally. The owner is the
support contact for capture permissions, stream quality, and reconnects; exact
Discord client/platform troubleshooting is outside the VTT. If one participant
cannot connect, the owner can keep playing and sharing for everyone else; that
participant and the session owner must diagnose the external Discord/client or
network problem because there is no project relay to operate.

### Failure modes and exit cost

- **Wrong window shared:** a human operational mistake could reveal the DM
  window. The serialized projection boundary prevents secrets entering the
  player window, but cannot prevent the owner from sharing the wrong OS window.
  Gate the runbook with unmistakable DM-window styling and a pre-session check.
- **Stream stalls or becomes unreadable:** watchers lose the board; local play
  and autosave survive. Exact resolution/platform behavior is **UNVERIFIED**.
- **Owner input bottleneck:** the table waits while the owner translates other
  people's choices into clicks. No technical repair exists inside this shape.
- **Local bridge fails:** codex planning/narration stops, but this is a common VTT
  failure independent of Discord. Resume relies on increment 5/7 persisted
  request and session identity.

**Exit cost:** effectively zero. Stop sharing, or later add a remote adapter.
No state migration, cloud teardown, account closure, or client rewrite is
created by this choice. The player projection, visibility boundary, envelopes,
and local authority remain reusable by either later shape.

## Shape 2 — bot-relay hybrid

### Worked round: what the owner actually experiences

**Before the round.** The owner still runs the authoritative local player view,
private DM window, and localhost codex bridge. A new Discord adapter publishes
a filtered map snapshot and a round/turn card into a channel. The adapter grants
the owner's Discord peer permission to propose actions for the current PC. Under
the binding target, other people see the posts but have no grants; granting them
PCs is a separate owner ruling. The relay has to be connected before Discord can
be more than a transcript.

1. **Fighter turn.** The bot posts “Fighter active” with a map image and proposed
   controls. The owner types a proposed `/vtt move ...` command or uses buttons
   whose exact labels are product design, not a current Discord contract. The
   adapter acknowledges or defers within the 3-second envelope budget, resolves
   the authenticated Discord peer outside the JSON payload, and forwards a
   `RemoteCommandProposal` with expected revision to the DM browser. The browser
   authorizes, applies through the reducer, persists, projects, renders a new
   image, and posts/edits the next card. Everyone waits through the command,
   relay, local reducer, image-render/upload, and Discord-display path.
2. **Fighter attack.** The owner selects a target from a bounded control or sends
   another command. A stale click from the preceding image must be refused by
   expected revision, not guessed forward. The visible result arrives as a new
   message/card. The channel now contains at least one obsolete board image; the
   UI must make the current revision unmistakable.
3. **Monster 1 turn.** The local coordinator executes the next round-plan intent
   without waiting for Discord authorization because codex is the DM controller.
   The resulting filtered projection is rendered and posted. If the adapter is
   down, the owner can continue locally only if the owner chooses a degrade-local
   outage policy; otherwise the Discord table appears frozen while the actual
   browser has advanced.
4. **Cleric turn.** A simple target selection fits the command model. An exact
   spatial choice does not: the owner requests a preview, waits for a draft map
   image with highlighted cells, adjusts coordinates through another command,
   waits for another image, then confirms. A local drag that took one gesture is
   now multiple networked turns. Other people cannot smoothly scrub the preview.
5. **Monster 2 turn and reaction.** The bot posts a reaction prompt. The owner
   clicks; the adapter must acknowledge promptly, reject duplicate clicks, and
   address the response before its interaction metadata expires. The plan's
   Discord envelope limit is at most 15 minutes, but normal play should never
   treat that maximum as acceptable reaction latency.
6. **Wizard turn.** The same preview/adjust/confirm cycle is most visibly bad for
   an exact area. The owner may abandon Discord controls and use the local canvas,
   after which the bot becomes only a projection feed. That fallback is useful,
   but it admits that the hybrid is not a complete VTT surface.
7. **Monsters 3–5.** Visible intent results arrive as successive snapshots and
   narration chunks. A round-plan invalidation pauses local execution for codex
   re-consult, then Discord publication resumes. The envelope's sequencing and
   idempotence rules must prevent late chunks from appearing as current state.
8. **Round boundary.** The local event store remains authoritative. The bot
   posts the next round card. Other people have a readable combat transcript and
   latest snapshot, but not a continuously manipulable board.

**Where latency lands:** interaction delivery/acknowledgment, relay transit to
the owner's browser, local authorization/reducer work, image render and upload,
Discord message propagation, plus codex re-consult when necessary. Exact bot,
image, and message latencies are **UNVERIFIED**.

**The uncomfortable part:** movement and exact-template play become a dialogue
with screenshots. Reactions and stale clicks require careful recovery. If the
owner uses the local canvas to avoid that friction, the expensive half of the
bot becomes a read-only notifier.

### Architecture delta from draft 1

The local authority stack remains; Discord is an adapter around the planned
remote seams, not a second reducer.

**Keep unchanged:**

- `src/vtt/local-session.ts`, `TurnCoordinator`, and the reducer remain the only
  encounter authority.
- `src/vtt/visibility.ts` produces a peer-specific `VisibleEncounterState`
  before any bytes leave the DM machine.
- `src/vtt/presentation.ts` and the local player board remain available as the
  owner's low-latency fallback.
- Increment 5's event log, not a bot message or relay database, is durable state.
- Increment 7's localhost codex bridge remains a separate consumer of the full
  DM projection. The Discord adapter never calls codex and never receives the
  full DM projection.

**Use and extend:**

- Implement planned `src/vtt/remote-contracts.ts`. Discord identity must become
  an `AuthenticatedPeerContext` supplied by the session adapter, never a peer id
  accepted from the command body. `TokenCommandGrant`, expected revision,
  capability checks, actor/token matching, and stale refusal are mandatory.
- Consume increment 7's versioned, idempotent command/projection envelopes,
  including request ids, revision, chunk ordering, expiry/defer metadata,
  visibility class, and bounded render parts.
- A proposed `src/vtt/discord/bot-adapter.ts` translates Discord interactions
  into `RemoteCommandProposal` and `RemoteProjectionPublisher` calls. A proposed
  `src/vtt/discord/snapshot-renderer.ts` renders only an already-filtered
  projection. Exact filenames are recommendations, not landed files.
- A relay/session adapter is required between Discord and the DM browser. Its
  deployment could be DM-local or hosted, but the research does not establish
  which Discord bot interaction mode can be received without public ingress;
  that is **UNVERIFIED** and must be settled before choosing the hosting shape.

**Do not reuse as authority:**

- Existing `src/vtt/transports/transport.ts` has a type-only `RelayTransport`,
  but it carries raw `Uint8Array` Yjs updates and has no peer identity, command
  authorization, expected revision, or visibility class. It is transport
  inspiration, not a sufficient Discord seam.
- Existing `src/vtt/sync.ts` applies remote Yjs updates into a live document.
  That multi-writer shape is incompatible with D260.2 for the Phase-2 encounter.
  Discord input must be decoded as a proposal and locally reduced.
- `ManualTransport` and `TrysteroTransport` remain prototypes and are not placed
  in the authoritative turn loop.

### Binding-ruling fit

**Can satisfy by construction:** D260.2 (proposals only), D260.3 (durable state
local; relay stores no encounter), D260.8 (publish filtered projection only),
D314.2/D315.11 (owner still uses player view; DM window stays local), D315.7
(codex planning remains local), and D315.18 (direct consumer of the envelopes).

**Contradicts if adopted inside the current Phase-2 target:**

- **D312.3–4:** draft 1 is browser + screen share with remote behavior left as
  seams. A bot makes remote ingress and projection real.
- **D262.8:** the literal “no cloud accounts” scope conflicts with setting up a
  Discord application/bot or hosted relay. Whether the owner intended existing
  Discord application registration to count as a cloud account must be ruled;
  this dossier does not silently exempt it.
- **D313.2:** the approved companion is localhost, zero-cloud, zero-account.
  A hosted relay contradicts that deployment. A fully DM-local bot process may
  reduce the hosting conflict, but the external Discord application dependency
  remains and local reception feasibility is **UNVERIFIED**.
- **D260.6, conditionally:** using the staged Cloudflare relay as a deployed
  service would violate configs-only/no-deploy/no-paid-plan. A non-Cloudflare or
  DM-local adapter avoids this particular D-number but not D262.8.

Remote people controlling PCs would also amend the D313/D314 first-session
operator model. It does not contradict the rules engine, but it is a product
scope change that needs an explicit grant/ownership ruling.

### Effort, gates, and operating cost

**Estimate: four substantial increments after the shared Phase-2 foundations.**
The feasibility research classifies the shape as moderate effort. The estimate
below is architectural judgment; it is not a calendar or price quote.

| Increment | Work | Independent gate |
|---|---|---|
| B1 — Discord adapter spike | Prove application setup, interaction ingress, reply/defer behavior, identity binding, and DM-browser connectivity without encounter state on the adapter. Decide DM-local versus hosted runtime. | One authenticated ping traverses Discord → adapter → fake local session → reply; an asserted peer id in payload cannot impersonate another peer; outage leaves local fixture untouched. |
| B2 — filtered snapshot projection | Render map, current actor, legal visible choices, narration, and revision from `VisibleEncounterState`; sequence/chunk within increment-7 envelopes. | Hidden-state sentinels never appear in image bytes, alt/render parts, logs, or message payloads; 2,001-character and aggregate-rich-content boundary fixtures are split as the plan requires. |
| B3 — authorized commands | Implement move, attack, confirmation/cancel, end-turn, and durable reaction proposals through `remote-contracts.ts`; add grant lifecycle, stale/duplicate refusal, and local apply. | Complete one full reference-party round; kill wrong-peer, wrong-token, wrong-capability, stale-revision, duplicate-command, and expired-interaction mutations. No bot path mutates the reducer directly. |
| B4 — spatial preview and recovery | Add preview/adjust/confirm cards, reconnect/current-revision recovery, adapter-down policy, operator diagnostics, and teardown/runbook. | Complete the D314.1 round under delayed, duplicated, reordered, and dropped messages; exact preview and confirmed affected cells match; local reload resumes byte-identical state. |

**Ongoing cost and obligation:** at least one bot/adapter process must be healthy
during an interactive session. If it can run entirely on the DM machine, direct
hosting cost may be zero but the owner's network and process become the service.
If public ingress or a hosted relay is required, there is a provider account,
runtime, monitoring, secret rotation, and nonzero provider-dependent cost. No
grounded dollar figure exists in the source set. The operator is on the hook
when commands do not arrive, images fail to publish, grants are wrong, or Discord
is unavailable. A public/always-available bot creates a broader uptime promise
than a session-only local process.

If one participant cannot connect, the named bot/relay operator owns server,
grant, and projection diagnostics; the participant still owns their Discord
client/network. Without a named operator, the honest service level is best
effort and the local board is the fallback.

**When the relay is down:** the authoritative browser and autosave can continue,
but Discord controls and fresh snapshots stop. The owner must choose whether
local play continues (Discord participants temporarily lose agency and may see
stale state) or the encounter pauses at the next persisted boundary. No binding
ruling currently answers that outage policy.

### Failure modes and exit cost

- **Fog leak in rendered media or text:** rendering before projection, logging
  the full state, or attaching DM narration metadata could permanently disclose
  a secret. Projection must precede serialization/rendering, with byte-level
  sentinel tests.
- **Impersonation or over-grant:** accepting Discord user/token ids from JSON or
  applying a command without `AuthenticatedPeerContext` violates the planned
  boundary. Bind identity in the adapter and authorize locally.
- **Stale-card action:** old messages remain clickable/readable while the board
  advances. Expected revision and idempotent request ids must refuse them and
  return the current revision.
- **Message/image lag:** channel state can look behind the local board. A single
  canonical current card plus explicit revision reduces confusion, but exact
  edit/attachment behavior and limits are **UNVERIFIED**.
- **Spatial UX collapse:** exact area placement becomes multiple preview posts;
  users fall back to the local browser, reducing the bot to notifications.
- **Relay split-brain:** never let the adapter queue accepted mutations while the
  DM browser is disconnected. D260.3 says full DM disconnect pauses the game.
- **Interaction expiry or duplicate delivery:** envelope expiry/defer and
  idempotence must make late input harmless.

**Exit cost:** low-to-moderate if the adapter is kept pure. Remove the Discord
application/relay and `src/vtt/discord/*`; retain `remote-contracts.ts`, filtered
snapshot rendering, idempotent envelopes, and all local encounter data. There is
no state migration because the relay never owns state. Exit cost becomes high
and potentially data-sensitive if implementation lets Discord messages or a
relay database become authoritative; that design is prohibited by D260.2/3.

## Shape 3 — Discord Activity

### Worked round: what the owner actually experiences

**Before the round.** The owner launches the embedded Activity in the Discord
voice call. The Activity renders the filtered player projection; the separate
full-DM window and localhost codex bridge remain outside Discord on the owner's
machine. Other participants open the same Activity and receive filtered
projections. Under current rulings they watch; remote controls require new token
grants and an amended operator target. The Activity client authenticates through
the embedded SDK/OAuth flow and opens a WebSocket path through Discord's proxy
to the project's relay. WebRTC is not available in that environment, so neither
current P2P transport can carry the encounter.

1. **Round planning.** The owner's local authoritative browser sends one full-DM
   round-planning request to the localhost codex bridge. Discord clients see a
   waiting/status projection, never the request's hidden facts. The plan returns
   locally and is persisted before action dispatch.
2. **Fighter turn.** The owner drags directly on the embedded canvas. Local
   Activity code may draw a tentative path for responsiveness, but confirmation
   sends a versioned proposal over the WebSocket relay to the authoritative DM
   browser. Only that browser authorizes, reduces, persists, and emits filtered
   projections back through the relay. Other participants see the confirmed
   movement after the return trip; they must not treat the local preview as fact.
3. **Fighter attack and monster 1.** Target selection takes the same round trip.
   The monster intent then executes in the DM browser and a new projection is
   fanned out. This feels closest to a shared VTT when the relay is healthy, but
   every authoritative click depends on Activity proxy + relay + DM browser.
4. **Cleric turn.** The embedded canvas can provide the same local target/area
   preview interaction as the standalone player view. Confirmation still uses
   the shared pure affected-cell function and waits for the authoritative
   projection. Independent participants can pan or inspect their own client if
   the product implements it; that behavior and mobile support are **UNVERIFIED**.
5. **Monster 2 turn and reaction.** An ambiguous reaction prompt is projected
   only to the granted controller. The reply crosses the relay and is persisted
   locally. If the relay drops after the click but before acknowledgment, the
   request id makes retry safe; the UI must show “pending,” not optimistically
   advance the board.
6. **Wizard turn.** The owner drags the exact template smoothly inside the
   Activity and confirms once. This is the main fidelity advantage over Shape 2.
   The client must have the visible terrain/rules data required for preview but
   must never receive fog-hidden entities or DM-only facts.
7. **Monsters 3–5.** The DM browser executes surviving round intents. If one is
   invalid, the local codex bridge re-consults while all Activity clients show a
   persisted waiting revision. Once updated, the relay fans out only filtered
   projections.
8. **Round boundary.** The local event store—not the Activity, Discord, relay,
   or y-websocket room—holds the durable result. If the owner's authoritative
   browser disconnects, play pauses under D260.3. If a player Activity drops,
   that client reconnects to the latest filtered revision; the exact reconnect
   APIs and limits are **UNVERIFIED**.

**Where latency lands:** embedded-client input, Discord proxy, WebSocket relay,
DM-browser authorization/reduction, reverse relay fan-out, and codex re-consult
when necessary. Local previews can hide pointer latency but cannot make a move
authoritative. Exact Activity/relay latency is **UNVERIFIED**.

**The uncomfortable part:** when the hosted path fails, the table's primary
surface stops accepting authoritative actions even though the encounter is safe
on the owner's machine. The project now owns authentication, relay availability,
reconnect semantics, client compatibility, and a two-surface support problem
(Discord Activity plus local DM window). That burden exists every session, not
only during deployment.

### Architecture delta from draft 1

This is a deployment and client architecture replacement, not a wrapper around
section 8.

**Components retained:**

- `src/vtt/local-session.ts`, encounter reducer, `TurnCoordinator`, RNG, and
  increment 5 event store remain authoritative on the owner's machine.
- `src/vtt/visibility.ts` still creates player/peer projections before network
  serialization.
- The separate local DM window from increment 6 remains necessary because
  D315.11 puts hidden rolls, controls, and adjudication highlights there.
- The localhost codex bridge from increment 7 remains local and receives the
  full DM projection; it is not moved to the Activity relay.
- `src/vtt/remote-contracts.ts` and increment 7's command/projection envelopes
  become the security and protocol boundary.

**Components added or replaced:**

- Add an Activity entry point such as `src/vtt/discord/activity-app.ts` around
  `@discord/embedded-app-sdk`. It should reuse player-board components without
  importing local authority or DM controls.
- Add a server-side OAuth token-exchange endpoint. The feasibility research says
  this server-side exchange is required; exact endpoint contract is
  **UNVERIFIED** in the available local sources.
- Add an always-on WebSocket relay keyed to authenticated Activity/session
  context. It forwards proposals to the owner's authoritative browser and fans
  out filtered projections. Durable encounter state, RNG, codex session id, and
  DM secrets never live there.
- Bundle external assets same-origin or configure the Activity's URL mapping as
  required by the Discord proxy. Do not turn that requirement into a hosted
  user-asset library; D262.8 still forbids one unless amended separately.
- Add Activity reconnect, current-revision hydration, grant/role UX, pending
  action UX, and proxy-aware diagnostics.

**Components made impossible or unsafe:**

- `src/vtt/transports/manual.ts` uses `RTCPeerConnection`/RTC data channels;
  `src/vtt/transports/trystero.ts` uses Trystero's P2P path. The feasibility
  research says Discord Activities explicitly do not support WebRTC. Neither can
  be the Activity transport.
- The research summary says “Yjs sync must move to y-websocket,” but that is too
  broad after D315.18 and the amended Phase-2 plan. Existing `src/vtt/sync.ts`
  accepts remote Yjs updates into the live document, while D260.2 allows only
  the DM client to mutate and D260.8 forbids hidden state leaving it. A shared,
  multi-writer y-websocket room carrying the authoritative/full document would
  contradict both rulings. WebSocket is required; y-websocket is not established
  as the correct Phase-2 protocol. Use authenticated command proposals and
  filtered projections over WebSocket, or prove a strictly filtered,
  single-writer Yjs topology before adopting it.
- Section 8's local `BroadcastChannel` reaches only owner-controlled local
  windows; it cannot synchronize remote Activity clients. It remains useful for
  the local DM/player pair, not for Discord.

### Binding-ruling fit

**Can satisfy by construction:** D260.2 (DM browser alone applies proposals),
D260.3 (durable state local and DM disconnect pauses), D260.8 (filtered
projections only), D314.2/D315.11 (Activity is player surface; DM surface stays
local), D315.7 (codex round plan remains local), and D315.18 (envelopes cross the
relay). These are conditions, not automatic properties of the Activity SDK.

**Direct contradictions for the current milestone:**

- **D312.3–4:** draft 1 runs in the DM browser, is screen-shared, and implements
  only player-browser seams. An Activity is a real multi-browser client.
- **D313.2:** the approved bridge/deployment is localhost, zero cloud, zero
  accounts. Activity hosting, OAuth exchange, and relay add hosted services.
- **D262.8:** hosted Activity/relay infrastructure and account setup violate the
  no-cloud-accounts boundary. The Activity lives in a Discord voice channel, but
  the project need not implement voice/video itself; therefore this dossier does
  **not** claim a separate voice/video contradiction.
- **D260.6, if Cloudflare is the deployment path:** an operational Activity
  proxy/relay deployment exceeds configs-only/no-deploy and may exceed no-paid-
  plan depending on chosen services. Exact provider/pricing choice is
  **UNVERIFIED**.

**Contradictions in a naive implementation:** a full shared Yjs document would
contradict D260.2 and D260.8; server-owned encounter persistence would contradict
D260.3; putting DM controls/secrets in the Activity would contradict D314.2 and
D315.11. The architecture above avoids those, but makes Shape 3 more than the
research report's simple “move to y-websocket” description.

### Effort, gates, and operating cost

**Estimate: seven substantial increments after the shared Phase-2 foundations.**
The feasibility research ranks this highest effort. These are architectural
increments, not calendar promises.

| Increment | Work | Independent gate |
|---|---|---|
| A1 — Activity platform spike | Bootstrap embedded SDK, proxy URL mapping/bundling, private test launch, server-side OAuth exchange, and one WebSocket echo. | An allowed tester launches inside Discord, authenticates, loads bundled assets through the proxy, and completes an echo; every required deployment/account step is recorded for owner approval. |
| A2 — isolated player client | Extract/reuse player projection rendering and local previews in an Activity entry point with no reducer, event store, bridge, DM controls, or full-state imports. | Static dependency check plus hidden-sentinel fixture proves the Activity bundle cannot construct/deserialize the DM projection; one representative PC turn renders from a fixture. |
| A3 — stateless session relay | Authenticate session/peer context, connect Activity clients and the owner's browser, forward versioned proposals, and fan out projections. | Relay restart loses no encounter state; forged peer/session ids fail; DM disconnect pauses; reconnect hydrates only the latest allowed projection. |
| A4 — authoritative remote actions | Implement grants and move/attack/confirm/end-turn/reaction paths through `remote-contracts.ts` and the local reducer. | Full reference-party round passes delayed/duplicate/reordered/drop scenarios; stale and unauthorized proposals never mutate state. |
| A5 — fidelity parity | Port exact movement and area previews, visible rolls/narration, pending states, active-PC focus, accessibility baseline, and local-player fallback. | The same pure fixtures produce identical local-player and Activity previews/confirmed cells; no DM-only field appears in network or UI artifacts. Accessibility and mobile acceptance criteria remain owner decisions until verified. |
| A6 — recovery and operations | Implement token refresh/re-auth behavior, relay/host monitoring, diagnostics, version skew refusal, graceful local continuation/pause policy, and incident/runbook paths. | Kill relay, OAuth exchange, Activity host, DM browser, and one player client at every persisted boundary; no duplicate action, secret leak, or lost local revision occurs. |
| A7 — private pilot and exit gate | Run the complete D314.1 skirmish in a private test environment; measure interaction and projection latency; verify tester/review limits against current official docs; exercise teardown/export. | Owner can finish 3–5 rounds or abandon Activity and continue locally from the same event log; measured latency/support findings meet owner-set thresholds. |

**Ongoing cost and obligation:** a hosted Activity client, OAuth exchange, and
WebSocket relay must be reachable whenever the table uses the Activity. Costs
are provider-, traffic-, and availability-dependent; no defensible dollar
amount exists in the supplied sources. Someone must own application secrets,
deployments, observability, upgrades, incidents, and player connection support.
For private sessions, the research says public-directory review is not required
and cites test-mode limits; those externally mutable limits must be rechecked at
the A1/A7 gates. Public availability adds a separate publishing/verification and
support decision.

**When the relay is down:** pending inputs cannot reach the authoritative browser
and clients cannot receive new projections. The event log is safe locally, but
the Activity table is unusable until reconnect or fallback. The owner/operator
is on the hook for distinguishing a Discord proxy problem, relay outage, OAuth
failure, client-version mismatch, and the owner's own disconnected browser.

### Failure modes and exit cost

- **WebRTC assumption survives into design:** the Activity never connects.
  Delete the assumption at the boundary; neither Manual nor Trystero is a
  fallback inside the Activity.
- **Full-doc replication leaks fog:** a hidden token can leave the DM even when
  CSS conceals it. Only filtered projections may be serialized.
- **Multi-writer Yjs bypasses authority:** remote updates mutate state outside
  `applyEncounterAction`. Use proposals and local authorization/reduction.
- **OAuth/identity confusion:** channel/participant data in client JSON is not
  an authenticated peer context. Bind server-validated identity outside the
  proposal. Exact Discord claims/fields are **UNVERIFIED**.
- **Relay or proxy outage:** the primary player surface freezes. Local autosave
  prevents data loss but does not preserve the Activity experience.
- **Version skew:** hosted client, relay, envelopes, and owner browser disagree.
  Refuse incompatible schemas and retain local play/export.
- **Asset proxy failure:** external art does not load unless bundled/mapped as
  the feasibility research describes. Themed-playable D314.16 gate therefore
  has an additional Activity-specific delivery risk.
- **Support matrix expands:** Discord desktop/web/mobile behavior, participant
  permissions, and accessibility are not established by the research. They are
  **UNVERIFIED**, not assumed green.
- **No comparable VTT prior art:** the research found no grid/token/fog Activity,
  so production board-game Activities prove general synchronous board play, not
  this fog/authority architecture.

**Exit cost:** high in discarded platform work, low in encounter-data migration
if the boundary is obeyed. Remove Activity SDK/OAuth/relay/deployment and return
the owner to `presentation.ts`; the local event log remains complete. Reusable
pieces are the extracted player UI, WebSocket command/projection adapter,
reconnect tests, and remote contracts. Activity-specific proxy, auth, hosting,
release, and support work is sunk. Exit becomes very high if the relay owns state
or Activity SDK calls permeate shared UI; both should be prohibited at design
review.

## Side-by-side comparison

| Dimension | 1. Screen-share only | 2. Bot-relay hybrid | 3. Discord Activity |
|---|---|---|---|
| **Interaction fidelity** | Live visual stream, but owner is the only mouse; no independent player view. | Turn-based commands/buttons and snapshots; workable for discrete choices, poor for dragging, exact area preview, and rapid reactions. | Highest: embedded live canvas, independent client interaction, local previews; authoritative actions still make a relay round trip. |
| **Discord-specific effort** | Zero engineering in the research; one small operational sharing gate proposed here. | Moderate; estimated 4 substantial increments after shared foundations. | Highest; estimated 7 substantial increments plus deployment and pilot. |
| **Ongoing cost** | No project hosting; owner operates local browser/bridge and external share. | Bot/adapter uptime during sessions; possibly hosted relay/account and monitoring. Exact cost unverified. | Hosted client + OAuth endpoint + always-on WebSocket relay, secrets, monitoring, releases, and support. Exact cost unverified. |
| **What breaks when Discord path is down** | Remote viewers lose the stream; local encounter continues safely. | Commands/snapshots stop; local encounter survives, but outage policy must decide continue vs pause. | Primary player surface cannot act or update; local encounter survives but Activity session is blocked or must fall back. |
| **Binding rulings contradicted now** | None. | D312.3–4; D262.8/D313.2 for application/account/hosted relay; D260.6 only if a Cloudflare relay is deployed. | D312.3–4, D262.8, D313.2; D260.6 if deployed on the staged Cloudflare path. Naive shared-Yjs additionally violates D260.2/8. |
| **Fog/authority risk** | Lowest; projection stays in local window. Operational risk is sharing the wrong window. | Medium; filtered render/message/log pipeline must never see DM state, and identity/grants must be correct. | Highest exposure surface; every proxy/relay/client path must carry only filtered projections and proposals. |
| **Reversibility** | Excellent; nothing to unwind. | Good if adapter is pure and server stateless; remove Discord layer and retain contracts/rendering. | Fair-to-poor; local data survives, but SDK/OAuth/relay/platform work is mostly sunk. |
| **D314.13 all-AI soak fleet** | **Orthogonal.** The fleet can run many local/headless tables without Discord; screen sharing neither enables nor tests it. | **Orthogonal by recommended design; hinders if made mandatory.** Envelopes can be soak-tested without Discord, while real bot publication adds an external bottleneck and noise. | **Hinders.** Many parallel tables should not require many live Activities/voice-channel sessions or relay dependencies. Keep Activity outside the core soak; use a small separate integration soak. Exact platform concurrency limits are unverified. |
| **Best reason to choose** | It exactly serves the ruled first playtest with no new permanent system. | Remote humans explicitly want chat-native, asynchronous/discrete control and accept snapshot friction. | Remote humans require a live shared Discord-native canvas and the owner accepts a hosted product. |
| **Reason to reject** | Remote humans need direct agency or independent map inspection. | The desired experience is actually live dragging/preview; a snapshot bot is the wrong interaction model. | The present target has no remote human controllers, while the shape forces the most scope reversals and operations. |

## Decision recommendation

### Recommended ordering

1. **Use Shape 1 for the first playable skirmish.** It is the only shape that
   exactly matches every current deployment and secrecy ruling. Finish and learn
   from the local loop before adding a remote surface.
2. **Keep D315.18's envelopes and section 9's authorization/projection seams
   transport-neutral.** This is already binding work and avoids a rewrite. Do
   not add speculative Discord adapters to increments 3–10.
3. **If the owner later rules remote human PC control in, spike Shape 2 first.**
   Its adapter can be thrown away without moving authority or data, and it tests
   identity, grants, stale commands, filtered publishing, and actual table demand.
4. **Authorize Shape 3 only as a separate hosted milestone after a measured
   platform spike and explicit amendments to D312.3–4, D262.8, D313.2, and—if
   Cloudflare is deployed—D260.6.** It should not be smuggled in as “hosting the
   existing client,” because WebRTC is unavailable and the secure sync protocol
   cannot be the current full-document Yjs path.

### Trap calls

**Shape 3 is a trap for the present milestone.** It looks like the existing web
client placed in an iframe, but the unsupported WebRTC path removes the project's
zero-server transport, OAuth requires server work, the live table depends on a
relay, external assets need proxy-aware delivery, the DM window still has to stay
local, and the first ruled playtest gets no remote-controller benefit. Calling it
“hosting” hides an authentication, synchronization, operations, and support
product.

**Shape 2 is a trap if sold as a live VTT.** It is defensible as a chat-native
remote control and readable transcript. It is wrong for a table whose quality bar
is direct movement and exact area dragging: the worked round turns one gesture
into several commands and images. Do not build it unless that interaction trade
is explicitly acceptable.

### Exact questions the owner must answer

1. **For the next Discord milestone, are other humans spectators or PC
   controllers?**
   - *Spectators:* choose Shape 1; no current ruling changes.
   - *PC controllers:* amend the D313/D314 operator target, define one-PC grants
     and handoff, then choose Shape 2 or 3.
2. **Does creating a Discord developer application count as a “cloud account”
   under D262.8/D313.2?**
   - *Yes:* Shapes 2 and 3 are out until those rulings are amended.
   - *No:* application registration is allowed, but hosted relay/OAuth decisions
     still need their own amendment.
3. **May the project run any hosted service for the VTT?**
   - *No:* choose Shape 1. Shape 3 is impossible under the researched Activity
     networking model; Shape 2 is allowed only if the bot's complete interactive
     path is proven DM-local.
   - *Yes, session-only:* Shape 2 is plausible; Shape 3 still needs Activity host
     and OAuth availability outside the exact session boundary.
   - *Yes, always-on:* either remote shape is architecturally possible, and the
     owner must name the operator, account, budget, and availability target.
4. **Is command/snapshot interaction acceptable for movement, reactions, and
   exact templates?**
   - *Yes:* Shape 2 is the preferred remote-control experiment.
   - *No:* skip Shape 2; either retain Shape 1 or accept Shape 3's hosted cost.
5. **Must remote people pan/zoom/inspect independently and see smooth local
   previews?**
   - *No:* Shape 1 or 2 is enough.
   - *Yes:* only Shape 3 serves that fidelity target; authorize a separate hosted
     milestone.
6. **When Discord or the relay fails, does local play continue?**
   - *Continue:* remote agency is temporarily revoked and stale views must be
     labeled; the owner uses the local player board.
   - *Pause:* persist at the current request/revision boundary and show a hard
     outage state everywhere.
   - *Abort session:* local export/resume becomes the recovery contract.
7. **May the relay see plaintext player-visible projections, or must even visible
   table data be opaque to it?**
   - *Plaintext allowed:* normal authenticated relay design is possible; hidden
     DM state still never leaves the owner's machine.
   - *Opaque required:* add end-to-end encryption/key distribution work; its
     compatibility with the chosen Discord path is **UNVERIFIED** and adds an
     increment before either remote shape.
8. **Is the Discord target private-test only or public-directory availability?**
   - *Private:* the research says review is not required within cited test/private
     limits; recheck the official limits immediately before implementation.
   - *Public:* add verification/publishing, abuse handling, support, privacy, and
     availability as a separate scope; the dossier has not estimated them.
9. **Should real Discord delivery be part of the many-table AI soak?**
   - *No (recommended):* soak core envelopes/reducer headlessly and run a small
     separate Discord integration sample.
   - *Yes:* define platform-safe concurrency and a cost/rate-limit budget first;
     those limits are **UNVERIFIED**.
10. **Who owns runtime operations and player support?**
    - *Nobody / best effort only:* Shape 1 is honest; Shape 2 may be a local
      experiment; reject Shape 3.
    - *Named owner with budget and response expectations:* Shapes 2/3 can proceed
      after the relevant rulings are amended and gates are accepted.
11. **What measured threshold would justify Shape 3 after a spike?**
    - *Thresholds set and passed:* Shape 3 becomes eligible for a separate owner
      scope ruling and hosted milestone.
    - *Thresholds set and missed:* reject Shape 3 and retain Shape 1 or test
      Shape 2; a technically functioning spike is not enough.
    - *No thresholds set:* do not authorize A1, because the spike cannot answer
      whether the product is worth operating.

## UNVERIFIED claims and required checks

The following claims are not established by the supplied repo documents or the
feasibility research's cited findings. They are intentionally not used as facts
without a settling check.

| Unverified item | Check that settles it |
|---|---|
| Whether a Discord bot can receive every required slash-command/button interaction from a DM-local process with no public ingress or hosted relay. | Build the B1 minimal echo using the currently documented Discord bot connection modes; record every public endpoint, persistent connection, account, and secret required. |
| Exact screen-share encode latency, resolution, pointer visibility, audio coupling, and client/platform behavior. | Run a two-client capture on each supported Discord desktop/web platform and record glass-to-glass delay and visible UI. |
| Exact bot interaction delivery, image render/upload, message propagation, edit/attachment, and stale-control behavior. | B1/B2 instrumented round-trip probe using the current official Discord interaction/message documentation and an actual private test application. |
| Exact Activity input-to-authoritative-projection latency and reconnect time. | A1/A3 instrumented private Activity probe through the selected proxy, relay region, and owner network. |
| Exact hosting cost for bot relay, Activity host, OAuth endpoint, WebSocket relay, logs, and egress. | Price the selected provider/configuration at measured B/A pilot traffic, including free-tier limits and overage; obtain owner approval before deploy. |
| Exact bot application verification/review requirements and private tester/server limits. | Recheck current official Discord developer/support documentation for bots separately from Activities immediately before B1. The research's private-limit findings are Activity-specific. |
| Whether the research's Activity private-use thresholds (server under 25 members, test mode, up to 50 testers) remain current at implementation time. | Re-open the two official Discord support articles cited by the research and record date, scope, and account/application state at A1/A7. |
| Exact OAuth grant, token exchange payload, refresh/re-auth lifecycle, and trusted identity fields needed for the Activity. | Follow the current official embedded-app SDK and Activity OAuth documentation in A1; threat-model which fields are server-authenticated before defining `AuthenticatedPeerContext`. |
| Whether y-websocket offers any useful role after adopting single-writer command/projection envelopes. | Prototype only after `remote-contracts.ts` and D315.18 envelopes exist; reject it if it requires full-doc replication, remote document mutation, or hidden-state carriage. Plain WebSocket envelopes remain the default recommendation. |
| Discord desktop/web/mobile compatibility, accessibility, independent pan/zoom behavior, and participant permission UX for this Activity. | A5 test matrix with named supported clients, keyboard/screen-reader checks, and owner-set acceptance criteria. |
| Real Discord platform concurrency/rate limits for D315.17's many parallel tables. | Do not infer from private tester counts. Read current official rate/session limits, request platform guidance if necessary, and run a bounded authorized load probe. |
| End-to-end encryption feasibility if the relay must not see even player-visible data. | Threat model keys and reconnect/multi-participant join, then spike encryption around the exact command/projection envelope and Activity/bot transport. |
| Public-directory verification, privacy, moderation, abuse, and support effort. | Separate public-launch design/research dossier after the owner selects public scope; private feasibility does not estimate public operations. |

### Freshness and consistency finding

The feasibility research is dated the same day as this dossier and cites official
Discord networking/support sources, but none of those mutable external facts was
independently re-fetched for this docs-only task. The no-WebRTC/WebSocket-only
finding, proxy asset constraint, server-side OAuth requirement, private review
claim, and tester/server thresholds must therefore be rechecked at the first
implementation spike even though they are grounded in the supplied research.

No internal contradiction was found within the feasibility document. There is,
however, one material **cross-document contradiction**: its verdict says Yjs
sync “must move to y-websocket,” while the later binding Phase-2 amendment says
the browser reducer remains authoritative and D315.18 provides
command/projection envelopes; the plan also explicitly removes `src/vtt/sync.ts`
from encounter authority. Reading the research prescription as full-document
Yjs replication would violate D260.2 and D260.8. The reconciled requirement is
**WebSocket transport, not shared authoritative Yjs state**.

## Source and authority ledger

This dossier's Discord facts come from
[`docs/research/2026-08-19-discord-vtt-feasibility.md`](../research/2026-08-19-discord-vtt-feasibility.md),
which cites Discord's official Activity networking documentation, embedded app
SDK, developer support articles 21692628851351 and 26576097154199, the Colyseus
Activity guide, Avrae, first-party Activity examples, and the prior-art search.
The dossier does not re-derive those facts.

The binding architecture comes from
[`docs/design/2026-08-19-vtt-phase2-movement-controllers.md`](./2026-08-19-vtt-phase2-movement-controllers.md),
especially sections 8, 9, 12's post-D315 amendments, and increment 7. The Discord
message constraints carried by D315.18's envelopes are grounded there in the
official Discord interaction and message documentation checked on 2026-08-19.

Binding product rulings D260, D262, and D312–D315 are in the read-only reference
`/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md`.
Current-code seam observations cite `src/vtt/transports/transport.ts`,
`src/vtt/sync.ts`, `src/vtt/transports/manual.ts`, and
`src/vtt/transports/trystero.ts` in this worktree. No Discord or D&D fact in this
dossier is asserted from recall.
