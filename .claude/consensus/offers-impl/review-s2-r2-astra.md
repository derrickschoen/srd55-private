F4 — **Medium: A malformed launcher can still bypass binding validation through fixture fallback.** At [entrypoint.ts:726](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:726), structural rejection returns `null` **before** checking `offerEnvironment`. The entrypoint then treats that same file as a fixture at [entrypoint.ts:863](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:863).

A source-traced counterexample is a document containing:

- `format: 'engine-mcp-launcher-v1'`
- `revision: 0`
- no `offerEnvironment`
- `spec: {}`
- `encounter.state` containing a valid legacy-basis fixture state.

The invalid revision makes launcher recognition fail. [arena-fixture.ts:289](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/arena-fixture.ts:289) accepts the embedded state through its seedless-spec branch without rejecting the launcher fields. Runtime construction then supplies legacy mode at [entrypoint.ts:319](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:319). Thus the claimed launcher receives neither the required binding check nor its `TypeError`, contrary to [plan:539](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:539).

Recognize the launcher discriminator before validating its remaining shape; malformed documents claiming that format must throw, never enter fixture fallback. This counterexample was traced against source, not executed.

Verified claims

- **Ordinary missing-binding rejection is fixed.** Otherwise-valid launchers throw an actual `TypeError`; decoding occurs outside the file-read catch, and the CLI awaits the entrypoint without catching it. Reconstruction has no default arm. [entrypoint.ts:725](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:725), [engine-mcp-server.ts:3](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/engine-mcp-server.ts:3).
- **Producer inventory is correct:** one production builder, seven call sites. Both normal and recovery manifests preserve `capsule.offerEnvironment`. The additional JSON readers are simulated-adapter consumers, not independent builders. [conversation.ts:2650](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:2650), [conversation.ts:2684](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:2684).
- **Changed `expect(` expressions:** only two additions, at [environment test:112](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/offer-environment.test.ts:112) and [environment test:157](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/offer-environment.test.ts:157). None were removed or weakened. The boundary test supplies an explicit binding while retaining its existing expectations; explicit legacy reconstruction remains positively tested.
- **F3 is resolved.** The ledger now records the context-pin locations, retained bytes, changed hash and paired invariant. The board-delivery test is byte-identical to round 1. [ledger:59](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp/offers-s2-pinned-ledger.txt:59).
- **F1’s authorized disposition stands.** No Slice 3+ implementation, capability activation, authority-boundary change, forbidden suppression or committed scratch file was introduced in round 2. Plan and frozen-contract hashes match.

No tests, builds or agents were invoked. The quiet-machine arena run remains a separate landing precondition.

VERDICT: REJECT

review complete