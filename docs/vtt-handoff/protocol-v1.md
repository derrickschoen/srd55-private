# Protocol v1

The authoritative schemas are `contracts/vtt-handoff/v1/protocol.schema.json` and `src/vtt/handoff/v1/contracts.ts`; the published declarations are `contracts/vtt-handoff/v1/contracts.d.ts`. Implementations must validate those shapes rather than this prose.

## Wire envelopes

Requests are exactly `{v:1,id,method,params}`. Success is `{v:1,id,ok:true,result}`. Refusal is `{v:1,id,ok:false,error:{code,message}}`. A full replacement event is `{v:1,event:"scene.snapshot",seq,data}`. A valid string ID, including the empty string, receives a correlated response. Invalid UTF-8 or JSON, or a missing/non-string ID, is a transport fault rather than a fabricated response. In-process and Worker adapters emit typed faults; the WebSocket server closes invalid text with 1007 and protocol structure with 1002 (`src/vtt/handoff/protocol-runtime.ts`, `tools/vtt-handoff/node-runtime.ts`).

The five exact methods are:

- `session.open`: `{requestedRole:"dm"|"player", playerId?}`. The out-of-band principal must match. Success returns the revision-independent logical session ID and capabilities.
- `scene.snapshot`: empty parameters. It returns the current full `SceneSnapshot` for the authenticated audience.
- `token.move`: `{tokenId,to:{x,y,z}}`. Coordinates describe a requested rendered destination only. `protocol-runtime.ts` converts the ground centre to an anchor and resolves exactly one current revision-bound offered option ID before the rich service submits it. Illegal, hidden, foreign, stale, absent, or ambiguous offers are refused.
- `door.set`: `{doorId,open}` for the DM principal. No-op success retains the current revision and emits no snapshot. A changed durable mutation emits its own full snapshot.
- `light.set`: structurally reserved but currently `UNSUPPORTED`; the engine has no light toggle mechanic. Unknown methods are also `UNSUPPORTED`.

## Snapshot semantics

`SceneSnapshot` contains grid dimensions, tiles, props, tokens, walls, doors, lights, and vision. It is a complete replacement, so arrays becoming shorter remove newly hidden or removed entities. Event `seq` starts at 1 per runtime and increments per emitted full snapshot independently of encounter revision. Opening emits the current full snapshot. Durable mutation and autonomous notifications emit snapshots; offer, status, recovery, refusals, cancellations, failures, and no-ops do not invent replacement snapshots.

The mapping is lossy by design (`src/vtt/handoff/scene-snapshot.ts`). Engine board cells become ground-centred renderer coordinates, asset IDs are mapped through `asset-id-map.ts`, and visibility is filtered before transport. DM snapshots include environmental light regions. Player light audience is limited to visible projected light-source objects; DM-only environmental-light semantics do not cross into the player channel.

Door geometry is represented by a `SceneDoor` referencing a companion `SceneWall`. The wall is derived from the door cell edge, and its movement/vision blocking flags carry the captured state. Ambiguous geometry throws during projection rather than selecting an arbitrary edge. Regular wall perimeter edges that overlap a door companion edge are removed.

Mutation IDs are reserved before queueing and never released in the logical session ledger. Any reuse is `DUPLICATE_MUTATION`, including reuse after refused, cancelled, closed, or failed terminal settlement. This is distinct from WebSocket request-ID uniqueness, which is enforced for the life of one socket.
