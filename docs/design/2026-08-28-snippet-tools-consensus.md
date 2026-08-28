# D405 snippet tools — three-perspective consensus (2026-08-28)

Perspectives: codex gpt-5.6-sol high (6 designs), claude-opus-5 (6 designs,
source-grounded to file:line), Fable supervisor (6 designs, written before
reading the others — D405.2). Raw outputs archived with the session
(snippet-brainstorm-{sol,opus,fable}). This document records where they
converge, where they split, and the consensus v1.

## Unanimous ground (all three, independently)

1. **v1 snippets are trusted committed code**: statically imported TS
   compiled into the bundle (manifest + content hash), reviewed through the
   normal lane/gate process. No eval, no Function, no runtime loading, no
   agent-authored code at game time. Worker/QuickJS sandboxing is a
   different product, deferred until untrusted snippets are a requirement.
2. **Typed both directions**: `SnippetDefinition<Args, Out>` with zod
   schemas validated at the MCP boundary in and out; snippet OUTPUT types
   are built from the intent vocabulary's nominal types (CombatantId,
   targetSelector) so a coordinate physically cannot leak — the
   wrong-program-fails-to-compile philosophy applied.
3. **Flywheel measurement mirrors KB arms**: `snippetHash` (manifest +
   source + schemas + runtime version) distinct from `snippetSetHash`
   (sorted enabled set); both recorded per arena row; arms toggle sets;
   intention-to-treat analysis (what an arm EXPOSED, not just what got
   invoked — invocation-only analysis is selection-biased; sol's point).
4. **Selection is the dominant risk** for a luna-low proposer — a tool
   that exists and is never reached for is where these designs die.
5. **Per-snippet MCP tools are rejected** (toolbelt bloat taxes every
   turn, makes each snippet a public API in a pre-alpha repo that wants to
   delete freely).
6. Golden-capsule fixtures harvested from REAL arena runs (the failure
   that motivated a snippet becomes its fixture #1); firing-rate budgets
   asserted in tests for anything auto-run; mutation testing on snippet
   files (small pure logic — a snippet whose mutants all survive has no
   contract).

## Consensus v1 (opus's composition, sol's controls, one registry)

One registry, `exposure: 'auto' | 'on_demand'` per snippet:
- **auto**: a `trigger(capsule)` gate; firing snippets append a bounded
  `advisories` array to get_turn_context under its OWN byte ceiling (never
  competing with tactical options under the 32KB cap — opus, grounded at
  engine-server.ts:408); firing-rate budget (<40% of golden capsules)
  enforced in each snippet's tests. Removes the selection problem entirely
  for universal advice.
- **on_demand**: single `engine.run_snippet {name, args}` tool (+1 tool
  total); description carries the name enum; K5 names the top snippets.
- **Shadow-run first** (sol): new snippets ship dark — computed and
  logged, not exposed — and are promoted to visible/auto only after
  precision is demonstrated in arena telemetry.
- Containment by construction: pure, sync, whitelist imports — enforced
  with an ast-grep rule banning Date.now/Math.random/new Date/fetch/await/
  while/non-whitelisted imports in the snippet dir (opus: "the
  highest-value hour in the project").
- The `SnippetDefinition` type is designed NOW with room for an optional
  `ctx.call` field later — the one real fork all analyses hit is whether
  snippets can call engine queries; leaving the slot costs nothing and
  avoids re-platforming (opus). Server-side composition is already a
  shipped pattern (query_reach calls query_path internally).
- Seed set: two snippets aimed at MEASURED failure classes (reach
  sanity/melee approach; focus-fire target), one auto + one on_demand.

## Increment 2 (owner decision required first)

The **veto** mechanism (opus #5, sol #6's sharper half): snippets as
pre-submit lints that turn a named failure class into an engine refusal
through the EXISTING correction loop — the only design that drives a
class to zero rather than making it less likely. It walks up to the
proposer-only boundary: the engine would be refusing LEGAL-but-doomed
intents on tactical grounds. Guardrails proposed: advisory-refusals expire
after the single correction (never deadlock the one-retry chain); every
firing logged as an agent defect so the flywheel still sees prevented
failures. OWNER RULING NEEDED before this ships — it changes what
"engine-authoritative" means.

## Increment 3+

Workflow snippets (`ctx.call` activated; deterministic multi-query scripts
— the Claude-workflows analogue; my F4, sol #3/#5, opus #4): highest
ceiling, but built AFTER auto/on_demand telemetry shows which query
sequences the agent actually fails to compose (2-1 against leading with
it; the guessing-first argument won). Then the openings book (content
library expressed as workflow snippets) once plays have a substrate.

## Recorded disagreements

- Fable initially ranked workflow snippets as the v1 execution model;
  overruled by the build-after-telemetry argument.
- Sol is more skeptical of unconditional auto-injection (advice fatigue);
  resolved via firing-rate budgets + shadow-run promotion rather than
  dropping auto exposure.
- Sol's #6 / opus #5 scoring half (engine pre-ranks options) is parked:
  highest strategic upside, but reorders-confidently-and-wrongly risk with
  no visible text to blame, and drifts toward autopilot.

Next: this doc + the v1 slice go to codex for implementation-readiness
review (consensus loop, cap 3); the veto fork goes to the owner.

## Amendment (2026-08-28, owner ruling D405.4)

The owner clarified the intent: snippets are PRE-CODED STRATEGIES the
model chooses from — "focus fire, remove obstacle (spell or grapple),"
with basic move-and-attack as the existing baseline — distilled from
approaches the agent repeats often enough to warrant an algorithm. This
promotes the plays library (design #6/F6) from increment 3 to the v1
lead:

- v1 = registry substrate (unchanged: zod contracts, content hashes,
  shadow-run, ast-grep purity, golden capsules) + the `play` snippet kind:
  {name, applicability(capsule), expand(capsule) -> draft intents in the
  semantic vocabulary}. Turn context advertises the applicable plays
  (engine pre-filters; the agent chooses among ~3); one tool
  (engine.propose_from_play) returns a DRAFT intent set the agent may
  accept, edit, or discard — proposer boundary intact.
- Seed plays: formalized basic move-and-attack (play zero), focus_fire,
  remove_obstacle (spell-or-grapple variant selection inside the play).
- The distillation loop is the flywheel refinement mechanism: recurring
  intent patterns mined from arena transcripts become play candidates,
  measured by adoption rate and per-play outcome, revised or deleted like
  KB entries.
- Advisory/auto snippets move to increment 2; veto class remains
  flywheel-only per D405.3; margins target luna low per D406.
