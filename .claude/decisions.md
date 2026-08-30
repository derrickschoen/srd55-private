# Binding scope decisions

> **Compacted 2026-07-30 at the owner's instruction** ("remove older decisions
> contradicted by the new one and duplicate decisions; compact the text to be
> more terse"). The full unabridged history is in git at commit `808f902` and
> earlier. Every D/F number remains a heading so external references resolve;
> entries contradicted by a later ruling are one-line tombstones pointing at
> the ruling that replaced them. Newest first.

## D418.4 — OWNER: engine computes kill-sequence probability across action allocations (2026-08-30)

Verbatim: "Have the engine do the bless math both ways so we know how bless
vs radiant flame action use maximize the likelihood of killing the fighter."
Capability: the tactical evaluator gains a sequence fold — P(target death) =
P(accumulated death-save failures reach 3) across an ordered attack
allocation, with crit=2 failures, bless-style modifier folds (+1d4 to-hit
averaged exactly), and allocation comparison (with/without Bless, bless-
target selection, initiative-order conditioning: Bless only helps attackers
acting AFTER the caster). Note recorded with the ruling: Bless is the
Priest's BONUS action (Divine Aid) — it does not compete with Radiant Flame
for the action; the engine surfaces that fact rather than a false tradeoff.
Placement: evaluator extension unit after increment 2 harvest; feeds
increment 3 consequence rows and the increment 7 team scorer (which D418.3
already directs to weight dying-PC removal).

## D418.3 — OWNER: four intel-program rulings from the consolidated question set (2026-08-30)

Dual-blind question consolidation (Claude sealed 543701b7..., codex terra
independent) presented four decisions; owner ruled:
1. Q4 AUTO-SUBMIT: yes — after the single failed correction the engine
   submits its fully-resolved legal default; such rounds carry a distinct
   'engine_default' label and never count as model-authorized. (Supersedes
   the D418.2 Q4 exclusion.)
2. DYING-PC TARGETING: score it into defaults — engine team defaults WEIGHT
   removing dying PCs; LLM may still override. Owner overrode both agents'
   annotate-only recommendation; doc Q1 must be amended to match.
3. RERUN PROTOCOL: preregistered package adopted, run TWICE (after
   increment 5 and after increment 7): same 10 seeds, frozen artifacts,
   3 paired reps per room, interleaved blinded judging, metrics reported
   separately, and R1-10 rooms become a PERMANENT HOLDOUT excluded from all
   future training data.
4. WIRE CONTRACT: replace EngineTurnIntent now (increment 2), no
   compatibility layer.
Supervisor-adopted defaults (presented, no objection): override-with-typed-
reason + frontier logging; 32KiB cap and preregistered KB-removal bar (no
quality loss + p90 session-token reduction); v1 EV scores only oracle-tested
mechanics, rest typed unresolved; concentration annotate-only in v1;
phase 3 stays parked through the rerun; collection continues through
context-format churn (era tags).

## D418.2 — OWNER: implement the intel program and rerun R1-10 (2026-08-30)

Verbatim: "We should fix everything we found so far and rerun r1-10."
Green-lights implementation of the consensus intel doc
(docs/design/2026-08-30-engine-intel-for-ai-dm.md): increments 1-7 in
dependency order plus the round-3 supplement items at their assigned
placements. Acceptance: rerun the ten judged calibration rooms (R01-R10,
cycle-3 seeds) on the improved system and compare. Exception kept: the doc's
Q4 (engine auto-submits its own default after failed correction) stays
flagged for separate owner approval and is NOT implemented under this
ruling.

## D418.1 — OWNER: the AI DM is omniscient about PC capabilities and resources (2026-08-30)

Verbatim: "A real dm will know what the pcs can do and how much hp and other
resources they have left." Resolves the knowledge-tier questions in the
D418 intel sweep (base doc Q2 and supplement Q9): monster-planning intel may
use exact PC AC, HP, remaining slots, spell availability, and rescue/revive
capability — no neutral-facts-only tier, no hidden-information channel to
design around for the DM side. (PC-side controllers remain a separate
question; nothing here grants PCs monster omniscience.)

## D418 — OWNER: engine provides options/intel algorithmically; AI fills gaps only (2026-08-30)

Verbatim: "I think the engine should provide these options to the dm. We want
to do as much as we can algorithmicly so the ai only acts to fill gaps that
the engine can't." Ruled while scoring R02, where the supervisor had to
derive by hand the intel the DM lacked: range bands per attack, the
unconscious+prone advantage/disadvantage cancellation (straight rolls at the
dying fighter), death-save-failure consequences, per-monster option menus,
and the bonus-action Bless the all-Dodge plan forfeited. Direction: the
engine computes and surfaces decision intel; the LLM chooses among annotated
options or overrides with justification. A consensus sweep (codex authors,
Claude reviews) is commissioned to inventory what the engine already
computes, what it could compute, and what it should surface, before any
implementation.

## D417 — OWNER: no high-ground houserule; BG3 material stays private unless clean-room homebrew (2026-08-30)

Verbatim: "No high ground. Keep the bg3 stuff in the private repo unless it
has been turned into very safe clean room homebrew. Only use the homebrew if
you really need it." Effects: (1) when elevation lands, it implements RAW 5e
only — the Larian ±2 to-hit rule is rejected, closing the open question in
the BG3 parity audit; (2) the audit doc moved from the ignored loose file
docs/design/bg3-combat-parity.md to ~/PhpstormProjects/dnd-research-private/
(outside all git trees); the docs/design/bg3-*.md ignore pattern stays as a
backstop; (3) any future BG3-derived mechanic enters the public repo only as
clean-room homebrew, and only when genuinely needed.

## D415.1 — OWNER: symlink auth.json into an isolated CODEX_HOME for DM/PC operators (2026-08-30)

Verbatim: "Symlink just auth.json into the isolated home for ai dm and pc
operators." Mechanism: ~/.codex-aidm/ = copied config.toml, NO AGENTS.md,
auth.json -> ~/.codex/auth.json symlink; DM/PC operator processes (campaign,
arena, conversation launches) run with CODEX_HOME=~/.codex-aidm; supervision
lanes keep the standard home. Recorded risk: codex rewrites auth.json on
token refresh — if a rewrite replaces the symlink with a regular file the two
homes fork silently, so the supervisor verifies the symlink each tick and
re-links from whichever copy is newest. Supersedes the D415 research
conclusion that suppression was blocked on auth sharing.

## D416.2 — OWNER: initiative_segments_v1 becomes the default combat model (2026-08-30)

Owner answered "yes" to the supervisor's question "Flip initiative_segments_v1
to the default combat model?", asked with the acceptance sample attached
(docs/perf/2026-08-30-phase2-ab-acceptance.md: 8/8 authorized both arms,
median adjustments 0.5, 0% full-context fallback, 0 corrections). Resolves
Phase 2 plan open question 3. Scope: default combat model flips to
initiative_segments_v1 across the driver tools; the initiative-profile
default flips to derived_v1 in tandem (segments requires per_combatant
initiative — the synthetic legacy profile would fake interleaving).
monster_block_v1 remains selectable explicitly; existing corpus rows remain
valid via their recorded combatModel/repoCommit provenance.

## D416.1 — OWNER: "Do your recommendations" — phasing adopted (2026-08-29)

Owner adopted the supervisor's D416 recommendations verbatim ("Do your
recommendations"). Execution order: (1) engine lane NOW — phases 0+1
merged into one unit: monster-block application re-resolves each intent
at the actor's turn against live state, primary→fallback→Dodge, with
structured deviation evidence (subsumes the apply-time re-validation
bug fix); packed-refs fallback for repo-commit.ts rides along. (2)
plays-v1 quality lane NOW, in parallel (disjoint files) — R01 fixes
folded in: attack-type-aware OA policy, safe advance for ranged, no
bare-Dodge fallback when attacks are resolvable, offensive escalation
repair brief. (3) Phase 2 (initiative segments + scripted party on PC
turns + delta-context DM adjustment) after both land. (4) Phase 3
(persona-per-PC agents + comms) last. Campaign continues collecting
block-model rows meanwhile — rows are era-tagged by repoCommit since
0b55e2c6. Also merged lane-wt/mutshard (parked D410 training tooling)
into main so the plan-of-record artifact is not stranded on a lane.

## D416 — OWNER: interleaved initiative is the target model; plan-then-adjust; one persona per PC (2026-08-29)

Verbatim: "Interleaving is how most tables play. Ai for pc team and for
npc team should still come up with a game plan at the top of the round
and then dm ai will adjust the game plan as the pcs act. Each pc turn
will be evaluated to see if they follow the game plan or alter it.
Replicate the scenario of pc being played by a different person each.
They still share the same goals and can communicate with each other."
Ruling: (a) true interleaved PC/NPC initiative replaces the current
declared-orders monster block as the target combat model; (b) both
teams produce a top-of-round game plan (the plays/suggested-plan layer
survives as the plan artifact); (c) the DM adjusts its plan per PC turn
— each PC turn is evaluated for plan adherence vs alteration; (d) the
PC team is one agent persona per PC with shared goals and an open
communication channel. Discovered in the same exchange, bug regardless
of model: frozen mechanics execute without apply-time range/LoS/target-
liveness re-validation (monsterAttackCommand hardcodes
attackerCanSeeTarget, engine-round-session replays frozen paths) — must
re-validate and degrade to fallback. Phasing and scheduling vs the
plays-v1 lane: supervisor proposal pending owner reply.

## D415 — OWNER: no global AGENTS.md injection into DM/PC codex turns (2026-08-29)

Verbatim: "We need to not inject global agents.md to codex when acting as
a dm or pc." Context: `~/.codex/AGENTS.md` is a symlink to
`~/.claude/CLAUDE.md` (12,004 bytes of machine/PHP/Jira/codex-routing
guidance) and is injected into every codex agent turn, including DM/PC
arena turns — pure contamination plus token cost (the KNOWN-OPEN
~12.5KB/session item). Ruling: DM/PC agent-adapter turns must not
receive the global AGENTS.md. Supervision/implementation lanes keep it.
Suppression mechanism must be empirically verified before relying on it
(config override vs CODEX_HOME isolation), and the repo-level AGENTS.md
(5,884 bytes, also engineering guidance irrelevant to a DM role) is
flagged as the same class — owner has ruled only on the global file so
far.

## D414 — OWNER: finalize recording, park training until very large corpus (2026-08-29)

Verbatim: "What is the final plan for the training? We need to make sure
we are recording what we need and then park the rest until we have a
very large corpus of training data." Ruling: (a) recording completeness
is the active workstream — rows must capture everything any later
training stage could need (raw turn context as sent, repo commit
provenance, session linkage, correction chains, narration); (b) ALL
training work is parked at the D410 smoke (tooling committed, adapter
proven) until the corpus milestone; (c) milestone proposal: ~10k
authorized post-dedupe SFT examples with a hard-basis slice + judged
sample, revisit when RX 6800 lands. Staged plan of record: collect ->
curate -> LoRA SFT (2B and 0.8B + constrained decoding) -> engine-
verified GRPO on GPU -> optional on-policy distill/preference stage ->
QAT serving -> arena+judge eval vs luna low.

## D413 — OWNER: prior-art survey, AI-plays-D&D, last 6 months only (2026-08-29)

Verbatim: "I'm not the first to try to make ai play D&D. Look into prior
art that is no more than 6 months old. Do research to get the most up to
date." Ruling: dedicated research pass over 2026-03 onward — academic
(arxiv/openreview), community (GitHub, HF, Reddit, itch), and product —
on LLMs playing/DMing D&D with rules engines; what they got right/wrong,
what we should steal or avoid. Older foundational work may be cited only
as lineage for a recent item.

## D412.2 — OWNER: 0.8B schema-constrained angle + small-K2 narration seat (2026-08-29)

Verbatim: "What are my options to use all of the latest model efficiency
techniques? Do I have to train a new one? Maybe like a 0.8b json schema
constrained model with the latest efficiency techniques? — Also look
into a small kimi k2 to do the narration and story. I heard it was
trained to be good at prose." Ruling captured: (a) evaluate the
0.8B-schema-constrained tactician (Qwen3.5-0.8B + constrained decoding +
SFT/GRPO) as a first-class D410 candidate alongside 2B; (b) D412
research scope extends to a SEPARATE small narration/prose model (Kimi
K2 lineage distills), split-role architecture: tactician emits intents,
narrator writes flavor text.

## D412 — OWNER: research V4-Flash/GLM-5.3-Flash techniques at 0.5-2B (2026-08-29)

Verbatim: "Deepseek v4-flash and glm5.3-flash have a lot of advanced new
techniques that let them be smarter while using less memory. Collab with
codex to research Reddit and huggingface and forums and such to see
where people are trying to use these techniques on smaller models. Look
into what the leading edge people are doing in the 0.5 to 2b size model
space for specialized work like our ai dm that leverages the existing
engines and algorithms and just fills in the gaps." Ruling: joint
Claude+codex research unit — community sources (Reddit, HF, forums)
specifically, not just papers; deliverable = consensus research doc on
which V4-Flash/GLM-5.3-Flash efficiency techniques transfer to 0.5-2B
specialists, and what the leading edge does for engine-backed
narrow-task models. Feeds the D410/D411 base-model and training-recipe
choices.

## D411 — OWNER: collect much more Luna run-log data before CPU training (2026-08-29)

Verbatim: "We will need to collect a lot more run log data from Luna
before we start dedicating the cpu to training." Ruling: data collection
outranks training for CPU time. Generation campaigns (Luna-driven rooms
-> SFT/RL corpus) keep running and scale up; the D410 training pipeline
gets BUILT and smoke-validated (bounded, ~30 steps) but no sustained
training runs launch until the corpus is much larger. Amends D410's
"start now" to "tooling now, training after the corpus". Corpus capture
should preserve FULL run logs (rollouts, rejection/correction chains),
not only distilled authorized pairs — RL needs trajectories.

## D410 — OWNER: start CPU training proof-of-concept now (2026-08-29)

Verbatim: "Pick a small model to start training on the cpu as a proof of
concept. Look at how much memory overhead we have. Maybe 1 or 2 billion
parameters to start. Use quantization aware reinforcement training with
all of the latest tricks. Try to get it to behave as well as Luna low as
possible. It won't need to be a general model. Specialize in what Luna is
doing for us." Ruling: begin the PoC on this machine's CPU — 1-2B base
picked from the D409.2 research's verified list; quantization-aware
RL (QAT-style + latest applicable tricks per research); success metric =
approach luna low's arena numbers (authorization rate, judge scores) on
the SPECIALIST task only (intent-API monster rounds); general capability
explicitly not a goal. Pipeline: SFT warm start from our authorized
transcripts -> engine-verified GRPO -> quantized serving -> arena+judge
eval vs luna low.

## D409.2 — OWNER: RL target is a small LOCAL model replacing luna/codex (2026-08-29)

Verbatim: "When I asked about rl, I was thinking of something that we
could train to replace Luna and codex as the ai dm. Something small with
all of the latest efficiency wins found in things like ox-alpha
(glm5.3-flash), deepseek, kimi k3, Gemma with turboquant. I want
something that can run with 3 or 4 bit quantized kv cache. Something that
can run on an 8gb gpu or a cpu with 12gb free ram and free ssd space."
Ruling: the RL research pivots to a DEPLOYMENT-ENVELOPE-FIRST target —
the trained checkpoint must serve as the local AI DM on consumer hardware
(8GB GPU or CPU+12GB RAM, 3-4-bit quantized KV cache), replacing the
codex/luna dependency entirely for game time. Research the named
efficiency lineages (web-verify: ox-alpha/glm5.3-flash, deepseek, kimi
k3, gemma turboquant) for architectures/quant stacks fitting the
envelope, the inference runtime story (llama.cpp-class KV-quant support),
and how the engine-verified-reward RL plan transfers to those bases; the
public-repo local-npm mode is the deployment context.

## D409 — OWNER: harvest the 25%; standing luna experiments; RL research lane (2026-08-29)

Verbatim: "Harvest the 25%. Keep going on trying to improve Luna low and
medium results by experimenting. Use codex collab skill to brainstorm and
implement and judge experiments. — In a separate lane research how we
might rl train an open model to do better at D&D dm work specifically."
Rulings: (1) implement the two degradation-free cuts from the D408 audit
(recommended_plugins suppression verified by rollout re-attribution;
calls-per-round 7->~4 via K6 double-fetch fix and collapsed protocol
turns). (2) A STANDING experiment loop targets luna low + luna medium
quality/speed: codex-collab brainstorm -> implement -> blind-judge each
experiment; flywheel cadence. (3) Separate research lane: how to RL-train
an open model specifically for D&D DM work (methods, base models, reward
design from our engine's authorization/judge signals, data from arena
transcripts, cost/feasibility).

## D408 — OWNER: audit and reduce the ~195k input tokens per round (2026-08-29)

Verbatim: "195k token input is way too large. What is going on there? Use
the collab skill to list and audit assumptions and brainstorm plans to
reduce." And the offered angle: "The kb should be structured with an index
and glossary and the text heavy stuff should load on demand at agent
discretion." Ruling: collab round (sol high + opus + Fable independent,
then consensus) audits the input-token budget and produces reduction
plans; the lazy-KB (index + glossary + on-demand text) is a mandated
design angle. Supervisor pre-measurement: server/discover 145KB (~36k
tok) WITH tools embedded, tools/list 145KB again (double delivery), 14
tools totaling 156KB schema after the 7g self-contained-$defs inlining.

## D407 — OWNER: 5-minute free-thinking budget; team-planned PC turns in the flywheel (2026-08-29)

Verbatim: "Budget each player taking 1 minute per turn. This gives the dm
5 minutes to think for 'free' before the players notice it 'thinking'."
And: "For the flywheel, have the ai plan all of the pc turns together as
a team to increase time efficiency." Rulings: (1) the D403 speculative-
planning design adopts a named pacing model — ~1 minute per player turn,
~5 minutes of imperceptible DM thinking per round with a typical party;
speculation deadlines, refresh budgets, and model choice FOR SPECULATION
are set against that window (a strong slow model can speculate at zero
perceived cost; live-path speed only matters on recalc misses). (2) In
arena/flywheel runs the PC side is planned by the AI as ONE team call per
round (party-round intents in a single dispatch, mirroring
submit_round_intents), cutting flywheel wall-clock and generating the
player-phase dynamics the speculation metrics need.

## D405.5 — OWNER: second layer — DM "skills" (algorithm + prose) (2026-08-28)

Verbatim: "Maybe the opener and then a separate layer that is broader and
works more like a Claude code 'skill' that has some pre gen algorithm and
some plain language that reduces output token burden." Ruling: above the
plays/opener layer sits a broader SKILL layer modeled on Claude Code
skills — a skill bundles short plain-language tactical procedure (when
and how to apply an approach) WITH the pre-generated algorithms (plays/
advisors) it references. Skills are advertised by one-line description
and loaded selectively when applicable (situation-triggered), so the
agent's job shifts from GENERATING plans to SELECTING and PARAMETERIZING
procedures — cutting output tokens. This unifies the KB (prose) and the
snippet registry (algorithms) into one refinable artifact kind: the
flywheel distills, measures (skillHash arms), and revises whole skills.
K5's successor becomes the always-on core skill; focus_fire becomes a
skill = prose trigger-guidance + its play.

## D405.4 — OWNER: snippets are pre-coded strategies the model chooses (2026-08-28)

Verbatim: "I was thinking for the snippet thing like strategies the model
can choose from that are pre coded. I think we already have basic move and
attack. Other tools might be like focus fire, remove obstacle (spell or
grapple for instance). Basically distilling common approaches done by the
agent enough times to warrant having a tool snippet algorithm." Ruling:
the PLAYS library (openings-book design) leads the D405 v1 instead of
trailing it — named pre-coded strategies ({name, applicability(capsule),
expand(capsule) -> intents in the semantic vocabulary}); the engine
advertises the applicable plays in turn context (agent chooses among ~3,
not 30); one tool returns a DRAFT intent set the agent may accept, edit,
or discard (proposer boundary intact); the flywheel's distillation loop —
recurring agent approaches mined from arena transcripts become play
candidates — is the refinement mechanism. Basic move-and-attack is play
zero. The consensus substrate (registry, zod typing, content hashes,
shadow-run promotion, ast-grep purity, golden capsules) is unchanged;
advisory/auto snippets become the second increment; veto stays
flywheel-only per D405.3.

## D406 — OWNER: luna low is the intelligence floor (2026-08-28)

Verbatim: "Don't worry about things that broke Gemma-e4b. It was just a
cheap way to test pi and opencode. Luna low is the real world intelligence
floor." Ruling: design margins target gpt-5.6-luna low, not weaker models.
Gemma-only failure modes carry no design weight; weak-model
accommodations are justified only by luna-low (or stronger) evidence.

## D405.3 — OWNER: veto snippets are flywheel-only (2026-08-28)

AskUserQuestion ruling: "Flywheel-only veto." Veto-class snippets (engine
refusing legal-but-tactically-doomed intents) run ONLY in arena/measurement
runs to quantify what they would have caught — never in real play. The
proposer-only boundary stays absolute at the table; the boundary decision
is revisited with data, not before.

## D405.2 — OWNER: Fable brainstorms independently, then consolidates (2026-08-28)

Verbatim: "Also want this fable session brainstorming and then
consolidating with the other models to find consensus." Ruling: the
supervisor session writes its OWN D405 designs before reading the sol/opus
outputs, then consolidates all three perspectives into a consensus
recommendation.

## D405 — OWNER: agent-reachable JS snippet "tools", flywheel-refinable (2026-08-28)

Verbatim: "separate collab skill lane for trying to come up with a system
where we can add small js style snippets the agent can reach for. Look
into how Claude workflows work. I want these 'tools' to be repeatable and
to be able to be refined as we go through the flywheel process and
experiment. Brainstorm from many perspectives several different ways this
could work." Ruling: design-space exploration (multi-perspective collab:
codex sol high + opus + supervisor synthesis) for a registry of small,
deterministic, versioned JS-style snippets exposed to the DM agent as
callable tools; repeatable (same input -> same output, testable), refined
through flywheel iterations (failure classes become snippet candidates;
measured like KB arms); reference model: Claude Code workflows
(deterministic scripts orchestrating model calls, persisted/versioned/
resumable). Security floor non-negotiable: snippets run against read-only
capsule projections under the proposer-only boundary; no engine mutation,
no I/O, no free eval of agent-authored code at game time — refinement
happens in the flywheel loop, execution is of REVIEWED, committed
snippets only.

## D404 — OWNER: hone D403 contingency planning via collab (2026-08-28)

Verbatim: "Use the collab skill to really hone the ai dm planning
contingencies while the players are deciding." Ruling: the D403
speculative-planning design gets a full multi-agent collab round after the
codex draft lands — codex (sol high) and opus critique/brainstorm the
contingency system specifically (branch vocabulary, scenario selection,
guard design, re-speculation policy, recalc diffing), supervisor
synthesizes; owner questions surfaced via AskUserQuestion where forks are
genuinely theirs.

## D403 — OWNER: speculative DM planning during player turns (2026-08-28)

Verbatim: "Can we have the dm agent start planning the next turn while the
players are doing theirs? This way it doesn't seem like the dm is thinking
for as long as he actually is. Have to plan for different likely scenarios,
will have to give guidance with conditionals. Will have to recalculate if
players do something unexpected." Ruling: the AI DM plans the next monster
round CONCURRENTLY with the player phase — a contingent plan of 2-4
branches keyed on deterministically-checkable conditions (closed
vocabulary, same pattern as D401 reaction guidance); at monster-round
start the host evaluates branches against actual state, validates the
matching branch, and executes instantly on hit; on miss (no branch
matches, or validation fails against the real state) it recalculates —
preferring a cheap resume turn carrying a diff of what changed over cold
replanning. Perceived latency (monster-round start to first action)
becomes a measured dimension distinct from planning wall. Speculative
turns run against snapshot capsules; revision-digest/STALE_STATE decides
reuse; proposer-only and fail-closed invariants unchanged. Design goes
through a codex-collab round before implementation.

## D402.3 — OWNER: two more tiered configs (2026-08-28)

Verbatim: "Add a Luna medium -> sol low tiered test config. Add a Luna
low -> Luna medium test config as well." Ruling: the cycle-2 game-time
comparison runs SIX arms — luna low, luna medium, sol low, and three
tiered configs (luna low -> sol low; luna medium -> sol low; luna low ->
luna medium), all under the pre-registered v1 escalation rule (the single
correction round routes to the escalation model; base model plans
everything else). Frozen 12-room basis, K5, per-arm model attribution in
every row.

## D402.2 — OWNER: drop terra from the game-time comparison (2026-08-28)

Verbatim: "Drop Terra." Ruling: terra medium leaves the cycle-2 matrix.
The comparison is FOUR arms: luna low, luna medium, sol low, tiered.

## D402 — OWNER: game-time comparison adds luna medium and sol low (2026-08-28)

Verbatim: "Looks like we should add Luna medium and sol low to the game
time comparison." Ruling: the cycle-2 game-time model comparison (D396.1,
first measurement on the MCP intent interface) runs FIVE arms: luna low,
luna medium, terra medium, sol low, and the tiered configuration — frozen
12-room basis, K5, reaction guidance active, pre-registered before the run.
Sol low enters as the old-interface quality ceiling (8.78/10 at 26.8s);
luna medium as the mid-effort check on the game-time default.

## D401 — OWNER: pre-declared reaction guidance from the agent (2026-08-28)

Verbatim: "The agent should give some of them guidance on foreseeable
reactions ahead of time. Try to intelligently brainstorm on how to minimize
the time burden on the agent by having it plan ahead." Ruling: AI-driven
reaction offers are resolved from guidance the agent DECLARES AHEAD of the
boundary — no synchronous mid-boundary agent round trip. Supervisor design
under the time-burden constraint: submit_round_intents gains an optional
reaction_guidance block (closed trigger-kind vocabulary from the engine's
trigger union; responses take/decline plus a tiny closed condition set —
never free text, engine resolves deterministically); guidance is STICKY —
last declared persists across rounds/rooms until replaced, so the common
case costs one declaration per encounter, zero extra round trips; offers
not covered by guidance fall back to the toggle policy (unattended 'ask'
default: decline); resolutions journaled with the guidance that produced
them; KB teaches "declare guidance once, rely on stickiness."
D396.6 calibration: owner chose to hold the first judge-calibration
session until after cycle 2.

## D400 — OWNER: pi and opencode shelved (2026-08-28)

Verbatim: "If pi or opencode don't work as of now, shelve them for later."
As of the recorded matrix (docs/perf/2026-08-28-agent-conformance-matrix.md):
opencode is blocked by upstream anomalyco/opencode#33027 (headless agent
never receives MCP tools) and pi's model-driven proof failed on the local
4B model (plumbing itself supervisor-proven). Ruling: SHELVED — their
adapters and matrix rows stay in the codebase with loud FAILED/UNVERIFIED
status, no further verification effort now; the AI-DM bridge proceeds on
the two VERIFIED adapters (codex, claude-code). Revisit at the release
gate (D399.2 credentials) or when the upstream issue closes.

## D399.4 — OWNER: local Gemma scoped to opencode/pi MCP verification, then deleted (2026-08-27)

Verbatim: "Only use local Gemma to verify the mcp works for opencode and pi.
Then delete it when done." Ruling: the D399.3 install is single-purpose —
once the conformance matrix records opencode/pi VERIFIED (or the attempt is
abandoned), delete the gemma4:e4b model, uninstall the ollama service, and
remove the ollama-specific entries from ~/.pi/agent/models.json and
~/.config/opencode/opencode.json. Local Gemma is NOT a standing provider:
not for the flywheel, not for game-time, not for any other experiment.
Future matrix re-runs (release gate) authenticate per D399.2 instead. The
recorded VERIFIED evidence in the conformance report is the durable output.

## D399.3 — OWNER: local CPU gemma 4B model for agent-CLI verification (2026-08-27)

Verbatim: "Use local cpu gemma4-4b model. Install lm studio or whatever."
Ruling (supersedes the practical effect of D399.2's deferral): install a
local model server (LM Studio or equivalent — implementer's choice) serving
a Gemma ~4B model on CPU, and point the unauthenticated agent CLIs
(opencode, pi) at it so the four-CLI live conformance matrix can reach
VERIFIED locally with no paid credentials. Game-time model choice (D396.1)
is unaffected — this is verification plumbing, not the play model.

## D399.2 — OWNER: opencode/pi credentials deferred to release gate (2026-08-27)

Both CLIs are installed (opencode 1.18.23, pi 0.73.1) but unauthenticated.
Ruling: defer provider credentials to the release gate — their adapter rows
ship loud-UNVERIFIED with `reason: "credentials_absent"` (distinct from
`cli_absent`) until the owner authenticates when the four-CLI matrix must
go VERIFIED. Codex and Claude Code rows can go VERIFIED before that.

## D399 — OWNER: install opencode + pi CLIs; MCP implementation leads (2026-08-27)

Two rulings via AskUserQuestion after the MCP design reached consensus
(round 2, committed 4a3bcf8a on wt/vtt): (1) **Install both** the opencode
and pi CLIs on this machine so the conformance harness can turn all four
adapter rows (codex / opencode / pi / claude-code) VERIFIED before the
public repo ships them — supersedes the loud-UNVERIFIED interim stance in
D398.2 once installs land. (2) **MCP implementation is the lead
workstream** — next dispatches and quiet-machine windows go to building the
real server per the frozen design's §11 migration order; kill batch 2,
first flywheel cycle, and Track A/B continue as secondary.

## D398 — OWNER: real engine MCP server design (codex collab); opencode + pi agent support (2026-08-27)

Verbatim: "Codex collab design a real mcp server designed to let ai agents
interact with the engine as well as possible. / Add opencode and pi support
to go with codex support in the public repo." Rulings: (1) the quick D397
server is a prototype; a designed-for-purpose MCP server gets a proper
codex-collab design round (codex drafts, supervisor reviews, consensus loop
≤3) covering the full tool surface, session lifecycle per D397.3,
notifications/streaming, security (proposer-only, fail-closed, engine
authoritative), versioning and conformance tests. (2) The public repo's
local-npm AI bridge supports THREE agent CLIs: codex, opencode, and pi —
one session-lifecycle abstraction (start / resume / persisted session id)
with per-CLI adapters; exact CLI flags verified against installed binaries
at implementation time, never assumed.

**D398.2 (2026-08-27): "I forgot to mention to add Claude code support if
possible as well."** Ruling: Claude Code is the FOURTH bridge adapter —
feasible (it supports MCP servers and session resume in headless mode), so
the abstraction covers codex / opencode / pi / claude-code. Claude Code IS
installed on this machine, so its adapter is verifiable locally alongside
codex; opencode and pi remain loud-unverified until installed. Requirement
enters the design at supervisor review round 1 (the draft lane was already
in flight when this arrived).

## D397 — OWNER: conversational AI-DM sessions with the engine as an MCP server (2026-08-27)

Verbatim: "Experiment with ways to have the ai be in conversation quickly
when it starts and does shorter multi turn sessions while leveraging the
engine as an mcp to keep the ai loops short and on track." Ruling: build an
MCP server exposing the engine's query/intent surface (state summary, legal
actions, path costs, intent validation/submission per D396.2) and measure
conversational session patterns against the monolithic prompt: (A) current
one-shot state-dump → full plan; (B) MCP-grounded micro-turns — tiny
bootstrap, agent queries the engine tool-by-tool, declares one intent per
creature; (C) persistent per-fight session — created warm (rules/KB
preloaded), each round a short resume increment. Metrics: time-to-first-
action, wall per creature-turn, tokens, legality, judged quality.

**D397.2 (2026-08-27, verbatim): "Each round should definitely be a
resume."** Ruling: the persistent per-fight session is BOUND, not an
experiment arm — every combat round is a short resume increment on the
fight's warm session (rules/KB preloaded at session start). The experiment
narrows to what happens WITHIN a round: one monolithic per-round prompt vs
MCP-grounded micro-turns per creature. Cold-start only ever happens once
per fight.

**D397.3 (2026-08-27, verbatim): "The ai dm should run in a single session
starting the start of the first fight and resume from there including
following to subsequent rooms. Ai should also store the session id so that
resume could be done if the browser session needs to resume. / The feedback
rounds should also be in the same resumed session."** Ruling supersedes
per-fight scoping: ONE AI session per dungeon run — cold start at the first
fight, every subsequent round AND every subsequent room is a resume on that
same session; engine-validation feedback/correction rounds also go into the
same session (already the validated pattern: 8/10 one-round fixes were
same-session resumes). The codex session id is persisted in the VTT's
stored session state so a restored browser session can resume the same AI
session. Arena/conversation harnesses and the local-npm bridge adopt
run-scoped sessions; the committed arena CLI's per-fight scoping is to be
widened at its next increment.

## D396 — OWNER: brainstorm round 8 rulings — AI-DM in v1, intent-based turn API (2026-08-27)

Question round (codex sol-high + opus + supervisor merged 15 candidates):

1. **Game-time model: DEFER TO FLYWHEEL DATA.** No binding between luna
   low / terra medium / tiered; all three run through the room-generator
   fixtures with KB + correction attached; multi-fixture numbers decide.
2. **Turn interface: HYBRID menu+fiction**, refined by owner directive
   (verbatim): "Can we make it so the ai agent can query the engine to say
   what attack it wants and how much movement it is willing to spend and if
   it is willing to get into melee range. Have the agent also send a backup
   plan to do if there is not enough movement available for instance."
   → **INTENT-BASED TURN API**: the agent declares intent + constraints
   (attack choice, movement willingness, engagement stance) + a declarative
   fallback; the ENGINE resolves pathing/reach/costs and executes primary or
   fallback. The agent never emits coordinates. Narration stays free-text.
3. **AI-DM is IN v1 as an optional mode** (owner chose against both
   collaborators' third-track recommendation) — raises v1 reliability
   requirements and couples the flywheel to the merged-tree gate.
4. **Correction exhaustion: agent's declared fallback → one correction
   round → deterministic sim-controller takes the turn, visibly marked
   "auto-resolved"; always fail-closed on state (no partial execution).**
5. **Turn latency: NO CEILING, quality first** (owner chose against the
   recommended <10s/<20s band). Streamed narration is UX mitigation only;
   KB arms are judged on quality alone, not latency.
6. **Quality metric: LLM judge panel + owner calibration** — automated
   blind rubric panel per batch (sol/opus/fable pattern), owner spot-rates
   samples periodically to recalibrate. (First selection of "owner rates
   everything" was a declared misclick.)
7. **Checkpoint merge: AT BATCH-1 GREEN** — main + :4173 advance when the
   batch-1 scoring run confirms; batch 2 continues on main.
8. **AI-DM shipping (verbatim): "When running locally on a users machine,
   with npm, let the public repo code interact with codex like we do now
   locally."** → public repo carries a local-npm AI bridge that drives the
   user's own codex CLI; the built browser artifact stays deterministic;
   no key custody in the page, no hosting.

Adopted by supervisor on collaborator convergence (not owner-asked, noted
for the record): E08 stays as pre-registered, expanded model×effort matrix
files as a NEW experiment; encounter sources normalize into one versioned
encounter IR with provenance; KB measurement uses a frozen fixture basis
plus a rolling fresh set; SA-subtree content is fixture-only and NEVER an
input to KB authoring or prompts (one-directional wall); luna transcripts
live outside git, mined findings and KB deltas are what gets committed; AI
turns are replay-cached by (seed, prompt-hash); DM takeover is immediate
but handback commits only at engine transaction boundaries; the AI seat is
a proposer behind the DM-authoritative client (D391.16 intact);
Colby-compatibility is defined by named assumptions + golden scenario
outputs, not UI imitation.

## D395 — OWNER: import permissively licensed encounters and campaigns as fixture stock (2026-08-27)

Verbatim: "Research permission licensed encounters and campaigns and bring
them in so we have a large selection to choose from and iterate on with the
seeds." Ruling: build a vetted library of externally authored encounters/
campaigns to serve as fixtures for the D394.3 luna-low iteration flywheel,
alongside the procedural generator. The licensing wall governs: public repo
admits CC-BY 4.0 (and strictly-more-permissive CC0/public domain); CC-BY-SA
requires an explicit owner ruling before any import (ShareAlike could bind
derived content); NC and ORC/OGL-only content stays out of the public repo.
Supervisor owns license verdicts; codex does conversion only after a source
is cleared.

**D395.2 (2026-08-27): CC-BY-SA admitted, segregated.** Owner ruling via
question round: CC-BY-SA sources (One Page Dungeon Contest corpus, Basic
Fantasy anthologies) may enter the public repo in a segregated
`content/cc-by-sa/` subtree with its own license file; converted encounters
from those sources remain SA-licensed; engine code and all other content
stay CC-BY-only. Cleared-now sources: Watabou One Page Dungeon JSON (free
use, attribution optional), Escape the Astral Tower (CC0), A5E SRD tables
(CC-BY 4.0, already attributed). Research doc:
docs/design/2026-08-27-licensed-encounter-sourcing.md.

## D394 — OWNER: engine legality feedback to the AI DM + knowledge-base iteration experiment (2026-08-27)

Owner, on the screening probe's recurring illegality ("the drummer given an
action outside its statblock"): "can we setup feedback from the engineer so
Luna knows when it did something illegal." Ruling: the engine's validation
layer feeds precise refusal messages back to the model for a bounded
correction round; measure fix rate and added latency (connects to E11's
correction-budget design).

Second directive, verbatim: "Also experiment with iterating on a 'ai-dm'
knowledge base to measure improvements on 2 dimensions: quality and speed
based on what you put in the kb. !!important: more is not always better!!"
Ruling: KB-content arms are measured on BOTH latency and judged quality; the
kitchen-sink arm exists specifically to test whether more KB content hurts.

**D394.2 (2026-08-27, verbatim): "I would rather run a lot of Luna low
sessions and have high intelligence models build it a kb. So game time
decisions are served by Luna low because it is the fastest."** Target
architecture: game-time controller = luna low; KB authored and iterated
OFFLINE by high-intelligence models (sol high / Fable / opus) from observed
luna-low failures. KB arms are therefore measured ON luna low. Supervisor
datum noted for the record: in the screening probe terra low had lower raw
latency (9.9s vs 23.2s median) but produced 2 illegal plans in 3 reps.
**Owner correction (2026-08-27): "There is not enough data to say that Terra
is worse than Luna. Terra is supposed to be smarter on average."** Conceded:
n=3 on one fixture ranks nothing (95% CI on 2/3 failure ≈ 9-99%), and terra
medium beat luna medium on both quality and speed in the same probe. A
powered reliability run (10 reps/config, then multi-fixture via the room
generator) is queued before any terra-vs-luna claim is used for routing.

**D394.3 (2026-08-27, verbatim): "I have basically unlimited Luna low usage
and we could collect a lot of iterations. Especially is we build more varied
rooms to run. Maybe even a dungeon generator like Diablo uses."** Ruling:
scale the luna-low data flywheel with a seeded procedural room/encounter
generator (Diablo-style templates, deterministic per seed) so KB iteration is
measured across varied fixtures, not one hand-built room. Volume of luna-low
sessions is a non-constraint (consistent with D381). Pipeline: generator →
typed encounter state → DM-prompt renderer → luna-low batch runner → engine
legality validation + scoring → offline failure mining by high-intelligence
models → KB revision → re-measure.

## F28 — supervisor repeated the F19 checkout mistake on an uncommitted lane (2026-08-27)

During the wave-4+5 harvest, the supervisor (Claude) spot-checked prevention
proofs by mutating `src/vtt/party-pack.ts` in place and then ran
`git checkout -- src/vtt/party-pack.ts` to undo the probe — on a file that
still carried codex's UNCOMMITTED wave-4+5 edits. The checkout restored HEAD
and destroyed the lane's work on that one file (all other wave files were
untouched because only that path was named). Detected within one command:
the next `tsc -b` failed with TS2724 because the lane's new test imports
`isFeatureEffectKind`, which only existed in the wiped version. Recovered by
resuming the codex session (rollout replay route,
`01a043cb-c388-74e0-987b-f9a6479da5f6`) and re-verifying with gates.

This is F19's exact failure repeated after it was written down, and after the
harvest-order memory ("verify→gate→COMMIT→controls") existed. The binding
rule, now with two incidents behind it: **on a worktree holding uncommitted
lane work, `git checkout -- <path>` is forbidden in all forms. Commit the
lane FIRST, then run destructive probes; undo probe mutations by inverting
the exact edit or restoring from a scratch copy (`cp` before, `mv` back
after), never from git.** The two proof spot-checks themselves stand:
mutant 4010 (spell id → `''`) is a genuine compile error at the production
call site; mutant 1833 (mastery guard → `false`) still compiles — the probe
file's TS2322 is prevention of the authoring-shape class, not a
reclassification of that report mutant.

## D393 — OWNER: index adoption standard — EXPLAIN improvement suffices (2026-08-26)

Owner: "We only need the plan to improve to keep the index. Even if
infrequent, it could become more frequent. Indexes can improve
responsiveness in the browser as well."

1. An index candidate is ADOPTED when EXPLAIN QUERY PLAN shows a real
   improvement (SCAN→SEARCH, covering hit, sort elimination) for any
   query shape in the corpus — profile frequency prioritizes the work
   but never vetoes adoption.
2. The full-suite SQL_QUERY_LOG profile still runs (owner directive,
   same day) — it discovers query shapes and orders the work.
3. The one remaining rejection ground: measured endpoint regression
   (the 2026-08-19 spell_loadouts trial, 4% slower) — a plan
   "improvement" that measurably hurts in practice did not improve.

## D392 — OWNER: main advances at checkpoints; ngrok tunnel for session zero (2026-08-26)

1. **Main (and the :4173 preview) advance at clean checkpoint
   boundaries** — sweep harvest, player-board lane, five-tab pass —
   with a rebuild each time. The v1 LABEL still attaches only to the
   merged two-track tree (D391.1); intermediate merges are progress,
   not v1.
2. **Session zero's tunnel reuses the existing ngrok domain** (D228);
   the tunnel path gets rehearsed on it before session zero.

## D391 — OWNER: brainstorm round 7 — 16 rulings (v1 bar, refactor, presentation, future) (2026-08-26)

Fifth three-model brainstorm (codex + opus + fable; raw lists and
synthesis in the job tmp dir as brainstorm7-*), asked one at a time.
Rulings, in ask order:

1. **v1 = MERGED TREE ONLY.** No bar-met declaration until both tracks
   (v1-bar on wt/vtt, engine refactor in wt/engine-merge) merge and the
   full audit + mutation pass is clean. One milestone, later but
   stronger. (Also moots any refactor timebox: v1 waits.)
2. **Sweep bar: ZERO survivors in the 7 bar-critical VTT modules** —
   each killed or proven equivalent with a one-line proof. Legacy
   sim-scope survivors stay non-blocking (D388.2).
3. **Player-board lane pass = one full fight per seat** driven from
   that device, plus targeted probes for rare paths (Revivify,
   disconnect mid-turn).
4. **Five-tab substrate: isolated browser contexts only** (separate
   profiles, per-seat storage). LAN reachability + touch are a
   pre-session-zero check, NOT bar scope.
5. **Player UI: responsive for BOTH phone and laptop**; rehearsal runs
   some seats at each size.
6. **Seat takeover is DM-CLICKED only (no auto-trigger); handback is
   an explicit DM click.** Owner: "Dm click. Figure out how to give
   control back if the player reconnects" — the DM tray must show each
   seat's live connection state so the DM sees the reconnect and hands
   back; the player device shows a waiting-for-handback banner.
7. **Manual dice: d20s ONLY** (attack/save/check); damage stays
   app-rolled. Out-of-range entry HARD-REFUSES with the legal range
   shown. (Refines D386.8.)
8. **Owner acceptance = owner plays a PC in a player seat
   (phone-sized) while the supervisor DMs a mini-fight** — the player
   experience is the thing under test.
9. **In-app DPR surface: REBUILD ON THE UNIFIED ENGINE BEFORE
   CUTOVER** — the old src/simulation page is not deleted until its
   engine-backed replacement exists. No visible gap; refactor absorbs
   the scope.
10. **Configurable, user-composable SIM/DPR MODES.** Owner verbatim:
    "We need different configurable dpr modes. One needs to be Colby
    compatible so we can compare our numbers to his. Another should
    have the full ability to cc and move using algorithm only controls
    of pcs and npcs to get numbers for more types of builds that are
    support or healing or protection or other non-damage oriented
    builds to see how one contributes to a party fight with some
    simple controlled enemies." Follow-up verbatim: "Let users build
    their own sim modes customizable." Interpretation: modes are DATA
    (termination rule, movement on/off, controllers per side, enemy
    set, trials), with Colby-compatible and full-fight shipped as
    presets; users can compose their own. This also settles the
    legacy-benchmark question: fixed-window Colby semantics survive AS
    A MODE; existing pins bind that mode and stay comparable —
    full-fight mode gets fresh baselines.
11. **Analysis runtime: OVERNIGHT BATCH IS FINE.** Correctness first;
    no perf/worker work in the refactor.
12. **Session zero is reachable via a TUNNEL PER SESSION** from the
    owner's box (remote play supported; publication still held).
    Tunnel stability and internet reconnects enter scope — takeover/
    handback (ruling 6) is the recovery path.
13. **Onboarding: in-app first-turn COACH MARKS; player devices LIVE
    FROM FIGHT ONE.**
14. **Demo artifact: RUN REPORTS ONLY** — no screencast or replay
    viewer lane.
15. **Post-v1 lane two: DEFERRED — session one's stumbles rank the
    queue.** Session-1 export format stays conservative so no
    candidate (campaign continuity, tiers/ruler, loot) is foreclosed.
16. **Architecture: DM-browser-authoritative with the transport seam
    kept swappable** (server possible later, none scheduled).
    **Published thing when publication day comes: the WHOLE KIT** —
    app + bundled SRD flagship + stranger-readable guide, static,
    browser-only. Licensing wall unchanged.

## D390 — OWNER: FABLE writes the refactored code (engine-merge track) (2026-08-26)

Owner, verbatim: "Have fable write the refactored code. Fable is better
about not putting in too many of checks and try catch and tests that
aren't really valuable"

1. **Role inversion for the refactor track.** Claude (Fable) is the
   IMPLEMENTER of the D388/D389 engine-merge refactor in
   `wt/engine-merge` — it writes the refactored code directly, not via
   codex dispatch. Overrides the global codex-implements default for
   this track only.
2. **Codex becomes the independent reviewer** for refactor increments
   (Claude never reviews an artifact it authored). Review via
   `codex review` / `codex exec --sandbox read-only` on the frozen
   diff at stage gates.
3. **Rationale recorded:** avoid defensive over-engineering — redundant
   checks, try/catch wrapping, and low-value tests.
4. Other lanes (v1-bar track on wt/vtt, sweep harvests) keep the
   standing codex-implements binding unless the owner says otherwise.

## D389 — OWNER: engine refactor runs PARALLEL to the v1 bar, in a separate worktree (2026-08-26)

Owner, on D388-vs-bar sequencing: "Work on the refactoring in a separate
worktree in parallel (migrate existing tests, but no mutation). Finish
the v1 bar on the current stable foundation separately from the
refactoring. Then we can merge when both are done and then do a full
audit and mutation pass after."

1. **Two parallel tracks.** The D388 engine merge proceeds in its own
   worktree; the v1 bar (player board D386.7-9, solo five-tab leg
   D386.10) finishes on the current stable wt/vtt foundation.
2. **Refactor track migrates existing tests but runs NO mutation
   testing** during the refactor.
3. **Merge when both are done**, then a FULL AUDIT + MUTATION PASS runs
   after the merge of the two tracks. This supersedes the frozen plan's
   "player board follows the engine merge" sequencing and moves the
   D388.2 sim sweep to after the two-track merge.

## D388 — OWNER: MERGE the VTT and sim engines — one engine, both import it (2026-08-26)

Owner, verbatim: "Merge the vtt code and the sim engine. We should not
need both to be separate code. Both should import the same engine. Keep
the mutation testing on vtt and after the merge, then do the sim."

1. **One rules engine.** The sim and the VTT stop carrying separate
   combat/rules code; both become importers of the same engine modules.
   This executes the D312 "if it works out, merge back" clause and
   subsumes the D386.17 post-bar sim back-merge — pulled forward and
   widened from "movement + policy" to the whole engine.
2. **Mutation-testing order:** the running consolidated VTT sweep
   (D387) continues to completion and its bar-critical survivors are
   fixed as dispatched; the SIM-side mutation sweep runs AFTER the
   engine merge, against the unified engine — not against code about to
   be deleted. (This also resolves the supervisor's pending question:
   legacy sim-scope survivors from the consolidated baseline do not
   block the v1 bar; they are re-measured post-merge.)

## D387 — OWNER: mutation-testing cadence — per-lane continues, consolidated sweep at the bar (2026-08-25)

Per-lane mutation ledgers and supervisor harvest controls continue
unchanged through the pre-bar lanes, AND a consolidated Stryker-style
mutation sweep over the combat/VTT surface runs once at the v1 bar as
the capstone (survivors fixed before the bar is declared met). The
wt/simcore Stryker pilot infra is the starting point; the known runner
patch (vitest import-crash misreport) reapplies after npm install.

## D386 — OWNER: brainstorm round 4 — 18 rulings (2026-08-25)

Fourth three-model brainstorm (codex + opus + fable; raw lists and
synthesis in the job tmp dir as brainstorm4-*). Rulings, in ask order:

1. **Casting during a Short Rest is plain ENGINE LEGALITY** (recorded as
   the D383.3 recharacterization, commit d25dec5a): SRD is silent, no
   optional-rule register entry. Thrift/overheal stay party policy.
2. **Enforcement gaps: CLOSE ALL FOUR before the v1 bar** (Slow riders,
   Spirit Guardians recurring damage, Command flee, path-reservation
   body-blocking); survival remeasured on honest mechanics after.
3. **Cover: ADD TO ALL BUNDLED MAPS + REMEASURE** — dungeon rooms and
   Vane fights get real cover placements; 30-seed fraction re-run.
4. **Tuning ships as THREE TIERS**: Easy (further detuned) / Standard
   (current detune) / Hard (original), selectable at encounter start,
   each with honest difficulty records; tier data seeds the ruler.
   Follow-up ruling (same round): the D382 two-thirds floor binds
   STANDARD; Easy targets ~90%+ measured survival; Hard is the original
   tuning with NO floor — allowed to TPK optimal play.
5. **NO survival regression gate, NO build freeze** — the fixed-seed
   winning leg is the only bar; fractions stay informational; builds
   and policy may evolve.
6. **TPK leg: TWO VARIANTS** — a clean wipe AND a near-miss
   partial-recovery run (Revivify + DM override un-kill).
7. **Player board: FULL CASTING ON DEVICE** (supersedes D377.4's
   move+attack): players cast anything they have; reactions and tray
   decisions stay DM-clicked.
8. **Manual dice: DM session toggle + range validation**, logged as
   manual, no per-roll DM confirmation.
9. **Device disconnect: DM TAKES OVER SEAMLESSLY**; seat resumes on
   reconnect. No pause, no algorithm fallback.
10. **Multi-device leg: SOLO TABS FIRST** — supervisor drives all five
    seats for the bar; session zero with real players comes after v1.
11. **Real PCs: PLAYERS SELF-BUILD via the share-link flow**; owner
    reviews before session one.
12. **First real session content: THE REHEARSED MATERIAL** — dungeon
    day + Vane flagship exactly.
13. **Consumables: FINITE, DM RESTOCKS** — counts persist across
    sessions; only an explicit DM grant (ruling card) adds more; no
    gold/loot layer yet.
14. **Publication: HOLD until after the first real session**; then the
    owner decides. (Supervisor never pushes/publishes regardless.)
15. **Post-v1 lane one: SESSION-SEAM UNIFICATION** (one continuous
    session, one export).
16. **Live tuning at the table: the DM may optionally REDUCE ENEMY HIT
    POINTS mid-fight** — that is the only live lever; no roster edits
    or tier swaps mid-encounter. (Ruling-card logged.)
17. **Sim back-merge (movement + tuned policy): AFTER THE BAR**, one
    lane, one engine/actor model.
18. **Difficulty ruler: FORECAST + RETROSPECTIVE** — pre-session
    prediction from seeded runs plus post-session comparison.

## D385 — OWNER: fifth PC — a wizard joins the representative party (2026-08-25)

The representative party had NO wizard (Warlock/Druid/Fighter/Cleric),
so D384's wizard directives (Slow, Ray of Frost) had no legal caster.
Owner: **add a 5th PC wizard**. Party becomes five; every encounter's
action-economy ratio and the D382 two-thirds survival measurement are
re-baselined for a 5-PC party. Correction to the D377.17 record: the
supervisor's question that produced "keep the druid tests to the private
repo" wrongly claimed the roster had no druid — Orin Reed (Circle of the
Land) was already in it; the parenthetical "roster stays druid-free" in
that entry is void, Orin stays as-is.

## D384 — OWNER: overheal prevention on cast heals; Slow/Spirit Guardians; caster positioning; fighter defender kit (2026-08-25)

Owner directives, 2026-08-25:
1. **Overheal prevention on cast heals**: the D383 hit-die thrift logic
   applies to healing spells too — do not cast a heal whose average
   healing exceeds the target's missing HP.
2. **Wizard casts Slow** when multiple enemies are bunched up (needs
   Slow prepared; SRD spell).
3. **Cleric fallback concentration**: if Bless concentration breaks,
   the cleric casts Spirit Guardians (needs 3rd-level slots and the
   spell prepared).
4. **Caster positioning**: wizard and cleric stay out of enemy range
   where possible and use cover to protect concentration; Ray of Frost
   (wizard) and Command (cleric) as keep-away tools.
5. **Fighter defender kit**: the fighter keeps enemies off the others —
   carries a ranged Slow-mastery weapon and a melee Topple-mastery
   weapon (2024 weapon masteries), and maxes his grappling ability
   score (STR) via ASIs.

## D383 — OWNER: hit-die thrift, Cure Wounds between fights, casting allowed while resting (2026-08-25)

Owner directives, 2026-08-25:
1. **Hit-die thrift**: a PC does not spend a Hit Point Die if their
   missing HP is less than the average that die roll would heal
   (die average + CON modifier).
2. **Cure Wounds between fights**: eligible PCs (prepared casters with
   the spell and slots remaining) cast Cure Wounds on wounded allies
   between fights.
3. **Casting while resting is ALLOWED**: casting spells during a Short
   Rest does not break or restart the rest. Recharacterized 2026-08-25
   (round-4 Q1): this is plain ENGINE LEGALITY — the SRD's only
   constraint is "nothing more strenuous than reading, talking, eating,
   or standing watch" (srd:12036-12039), which is silent on casting; no
   rule forbids it. Owner: "Where in the rules can't you do a 1 action
   cast during a short rest?" Not an optional rule, no D373.10 register
   entry. Hit-die thrift and overheal prevention remain PARTY POLICY
   (algorithm choices), not engine rules.

## D382 — OWNER: survival analysis + potions + Aid/Bless + encounter detune (2026-08-25)

Owner directives, 2026-08-25:
1. **Survival analysis deliverable**: an MD file explaining why the PCs
   are not surviving, with the details of the PC builds, the NPCs, and
   the encounters.
2. **Potions**: each PC gets 2 level-appropriate healing potions.
3. **Cleric buffs**: the cleric casts Aid on all PCs (RAW: three targets
   per casting — two castings to cover four PCs) and opens fights with
   Bless.
4. **Detune the encounters** so the PCs get through the LAST encounter
   at least 2/3 of the time (measured across seeds, headless). Where
   this touches D380: D380's strengthen-the-policy rule stands for
   policy quality, but owner-sanctioned encounter detuning is now also
   in scope to hit the 2/3 survival target.
Also noted with the ruling: between-fight healing had NOT been happening
in live rehearsals (the short-rest step never completed in runs 8-26);
the fix was already in flight when this ruling landed.

## D381 — OWNER: ignore codex limits (2026-08-25)

Owner verbatim: "Ignore codex limits. The plan I have has plenty of".
Codex token spend is not a constraint on dispatch cadence or depth; the
supervisor stops flagging it. The codex-out-of-credits-stop-loudly rule
still applies if the provider actually refuses.

## D380 — OWNER: winning-run standard is STRENGTHEN THE POLICY on the fixed seed (2026-08-25)

When the algorithm party loses a winnable rehearsal fight, the sanctioned
path is improving the PC policy's tactics (focus fire, healing usage,
positioning) until it wins on the FIXED seed (20260824). No seed shopping,
no DM-assist swings for the winning leg. Rationale accepted with the
ruling: the policy improvements are real product value — they are the
D312 code-algorithm controller the table will use.

## D379 — OWNER: rehearsal bar accepts the session seam; requires a winning run AND a TPK run (2026-08-25)

1. **Dungeon→Vane seam SATISFIES the v1 bar.** Two back-to-back chained
   sessions with two exports count as "a full mock session"; unifying
   them is post-v1.
2. **Outcome coverage, owner verbatim: "Need the party to win to
   exercise the most surface. Also exercise a tpk. The intent is testing
   as many different ways as possible."** The clean-rehearsal bar
   (D377.6) therefore requires BOTH: (a) a run where the party wins
   every encounter cleanly (maximum machinery exercised), and (b) a
   deliberate TPK run where the party loses and the defeat path — death
   saves, conclusion, session record — flows without dead ends.
   Supervisor operationalization: the rehearsal driver gains a doomed
   scenario configuration (e.g. Cinder Rite with the alarm pre-sounded
   and waves stacked) for the TPK leg.

## D378 — OWNER: optional-rules sweep ratified; rehearsal is supervisor-only until clean (2026-08-24)

1. **Optional-rules sweep (per D377.13) RATIFIED AS-IS.** flammable_grease
   stays globally default off; bundled encounters MAY enable named
   optional rules in their own encounter config, visibly listed in the
   encounter's setup panel. Vane Warren ships with flammable_grease on.
   This generalizes: bundle-local enablement is the sanctioned pattern.
2. **Rehearsal driver: SUPERVISOR ONLY UNTIL CLEAN.** The supervisor
   iterates rehearse → fix → rehearse autonomously (algorithm/codex
   controllers playing the party) and brings the owner in only when a
   full clean run exists — the D377.6 v1 bar is met before the owner
   ever sits down for their pass.

## D377 — OWNER: brainstorm round 3 — 18 rulings; v1 = clean rehearsal (2026-08-24)

Third three-model brainstorm (codex + opus + fable, independent lists; raw
lists and synthesis in the job tmp dir as brainstorm3-*). Rulings, in ask
order:

1. **Post-pacing primary lane: REHEARSAL-FIRST.** A full mock session runs
   solo on the preview build; every stumble becomes a queue item — the
   table generates the queue instead of speculation.
2. **Real party: POST-V1.** The representative party carries all of v1
   (supersedes D373.5's "closer to the first real session" timing; the
   trigger question is closed).
3. **Timeline/pacing scope: TIMELINE + REWIND.** Initiative timeline,
   round counter, next-event preview (legendary windows, effect/burn
   expiries), skip/delay, PLUS rewind-to-round built on the session
   journal. Rewind doubles as the rehearsal's mistake-recovery story.
4. **Player devices in live play: PLAYER ACTIONS enter v1 scope** — a
   deliberate expansion beyond D312's screen-share-only draft 1. Scope:
   **MOVE + ATTACK ONLY**; reactions, tray decisions, and free-form
   interactions stay DM-clicked in v1. Owner left sequencing open;
   supervisor default: player-board lane runs AFTER the DM-only
   rehearsal, then a second multi-device rehearsal.
5. **BG3 bundle: ONE FLAGSHIP, PLAYABLE** (Goblin Leaders as the richest
   checklist); the other three clones follow on demand.
6. **V1 done bar: CLEAN REHEARSAL.** v1 is done when a full mock session —
   bundled dungeon + BG3 flagship, four browser tabs as players — runs
   start to finish without opening a rulebook or hitting a dead end.
7. **Long-rest interruption: DM-FIAT BUTTON** ("rest interrupted", DM
   picks outcome, logged as a D357-style ruling card). Not RAW
   enforcement.
8. **Death reversal: REVIVIFY ONLY modeled RAW** (1-minute window, 300gp
   diamond consumed, 1 HP return); all other reversal spells stay DM-fiat.
9. **Autosave: TWO POOLS** — per-round autosaves (keep 10) AND
   encounter-boundary autosaves (keep 10); named saves never touched.
10. **Non-boundary refusal UX: PER-CATEGORY SETTING** choosing among
    tray-fiat-prompt / hard-refuse-with-citation / default-plus-visible-log
    per refusal category.
11. **Coverage bar: REHEARSAL-DRIVEN.** Everything the representative
    party, dungeon, and flagship touch must execute; a rehearsal refusal
    is a defect. The 729 total is explicitly not a v1 number.
12. **Pre-rehearsal slivers: PATH-DANGER PREVIEW + HIDDEN-ROLL
    EXPANSION** (extend the death-save hide toggle to monster attack and
    save rolls). The generic contested-check dialog waits for rehearsal
    evidence.
13. **Optional-rules cadence: PRE-V1 SWEEP.** Adopted BG3-isms accumulate
    default-off unconfirmed; one owner review of the whole register
    before the rehearsal.
14. **Session record: BOTH** — structured end-of-session summary export
    (rounds, damage, resources, deaths, overrides/fiats) AND the full
    replay journal kept.
15. **Physical dice: PLAYERS MAY ENTER ROLLS.** Optional manual-entry in
    the player action flow; entered numbers logged as manual and excluded
    from the deterministic stream; DM toggle per session.
16. **Difficulty ruler: AFTER REHEARSAL DATA.** The D373.11 sim lane
    opens once at least one full rehearsal's structured summaries exist.
17. **No public rehearsal druid.** Owner verbatim: "keep the druid tests
    to the private repo." The representative roster stays druid-free;
    wildshape is exercised by private-repo tests, not the rehearsal bar.
18. **Table guide: STRANGER-READABLE**, doubling as the public repo's
    player-facing README.

Derived queue (supervisor operationalization): BG3 flagship → pacing +
rewind + pre-rehearsal package (path preview, hidden-roll expansion,
rest-interrupt button, Revivify, autosave pools, refusal setting, session
capture) → optional-rules sweep → DM-only rehearsal → player board
(move+attack, dice entry) → multi-device rehearsal = v1.

## D376 — SUPERVISOR CORRECTION: D373.7's hit-dice gloss was wrong; 2024 RAW restores ALL spent Hit Point Dice (2026-08-24)

The owner's D373.7 ruling was "modeled per 2024 RAW, DM-triggered." The
parenthetical gloss the supervisor recorded with it — "half hit dice" — was
the supervisor's own 2014-rule contamination, present in the option text the
owner clicked and in the implementation brief. The SRD is verbatim: "You
regain all lost Hit Points and all spent Hit Point Dice"
(srd-5.2.1.txt:11915-11917). RAW outranks the gloss; the engine restores all
spent dice. Corollary: stable-at-0 characters reach the RAW 1-HP
start-of-rest prerequisite via the cited Stable recovery (1 HP after 1d4
hours, :1115-1120) resolved within the 8-hour rest. D373.7's text below
stands as recorded; this entry is the correction. Process note: codex
attempted to edit this file directly during the r2 lane (rewriting the
D373.7 text and minting a colliding number); reverted — the file is
owner-rulings/supervisor-append only, and briefs now say so explicitly.

## D375 — OWNER: parallelize lanes; defer full gates to batch-merge boundaries (2026-08-24)

Owner directive, verbatim: "Parallelize as much as you can. Use separate
worktrees and dbs. Try to minimize the use of the box lock and break tasks
into smaller chunks. Try deferring testing to after multiple lanes have
merged to remove the box lock bottleneck."

Supervisor operationalization: multiple concurrent codex lanes, each in its
own worktree (lane-wt/vtt3a, lane-wt/vtt3b, ...; private repo is its own
slot); lane briefs gate on tsc + THEIR OWN test files only; the full vitest
suite + browser suite run ONCE per batch, at the wt/vtt -> main merge
boundary after several lanes land. Supersedes the one-lane-at-a-time
practice; the quiet-machine rule now applies only to the batch gate itself.

## D374 — OWNER: post-detection queue approved minus elevation; forks 17/18 confirmed; mapper next (2026-08-24)

1. **Queue approved, ELEVATION DROPPED**: detection engine -> detection UI
   (tray/fog/prefs) -> death RAW + DM override -> legendary vocabulary ->
   surfaces lever -> wildshape -> BG3 clone bundle -> long rest + save
   manager -> onboarding package -> timeline/pacing. Elevation has NO queue
   position — it stays in the deferred-upgrade register (dive, falls,
   high-ground, web-bridge falls remain registered stand-ins).
2. **Fork #18 CONFIRMED** (generic PendingDecision tray) and **fork #17
   leaning ENDORSED** (wildshape overlay; finalized at wildshape dispatch).
3. **Mapper increment (3 records: Mind Sliver, Barkskin, Tortoise Shell)
   runs in the NEXT private-repo slot**, ahead of BG3 follow-up lanes;
   floor expected 173 -> 176 and honest thereafter.

## D373 — OWNER: brainstorm round 2 — 18 rulings (2026-08-24)

Second three-model brainstorm (codex sol + opus + fable, independent lists;
synthesis and raw lists in the job tmp dir). Fork-class engine choices were
filtered OUT per D352.3 (wildshape overlay-vs-swap, generic PendingDecision,
projection typing) — those go to the private forks register, not owner
questions. Rulings, in ask order:

1. **Curation: curate NOW, disclose staleness.** The round proceeds with the
   173/729 floor number explicitly flagged as converter-lagged (mappers never
   taught the D351+ vocabulary); records presented may be mapper-blocked
   rather than engine-blocked and are labeled as such.
2. **Reaction prompts, draft-1: DM clicks, NON-BLOCKING TRAY.** Prompts stack
   in a tray labeled with combatant + reaction; the DM resolves them in batch
   before the turn advances. No suspended mid-action reducer state.
3. **Hidden creatures: FOG-ONLY compromise.** A hidden creature's cell renders
   as fogged on the shared board; no presenter tab this increment. (Accepted
   tell: fog appearing where something hid.)
4. **Reaction preferences (ask/always/never): SESSION-PERSISTENT,
   per-encounter editable.** They join PartySessionState (D359-classified);
   the tray logs what auto-fired.
5. **Real party: NOT YET.** Representative party stands as the test vehicle;
   the real roster arrives closer to the first real session.
6. **Campaign persistence: autosave + export file, PLUS a BG3-style save
   manager** — UI listing browser autosaves alongside file saves in a default
   folder (File System Access API directory handle), with load/manage
   operations. Owner-added requirement, verbatim intent: "save file manager
   similar to bg3 where the browser saves to a default folder and there is a
   ui to load and manage save files; show autosave browser saves as well as
   file saves." Hidden/wildshape state must serialize from day one.
7. **Long rest: modeled per 2024 RAW, DM-triggered** (full HP, half hit dice,
   slots, exhaustion -1, per-long-rest features; cited). Interruption rules a
   named deferred boundary.
8. **Death: FULL RAW + DM override, plus a DM toggle hiding death-save roll
   numbers from players** (dm_only when toggled; shared surface shows a save
   happened, not the number). Override logs as a D357-style ruling card.
   Death-reversal spells stay DM-fiat this increment.
9. **BG3 public clones: CAPABILITY PARITY, PLAYABLE BUNDLE.** Clean-room
   mechanics-checklist equivalents with independent maps/creatures/names,
   shipped as playable bundled encounters. No shape/beat-for-beat cloning
   publicly.
10. **BG3-vs-SRD conflicts: SRD WINS as standing rule.** Every adopted
    BG3-ism ships as a named optional rule defaulting off (high-ground
    precedent generalized); supervisor registers each, owner batch-confirms.
11. **Honour-Mode difficulty bar: CHECKLIST NOW, SIM LATER.** Clones ship
    against a structural checklist; the sim-vs-encounter integration ruler is
    a later lane.
12. **Legendary operation: ENGINE PROMPTS THE DM at valid windows** (tray
    entries for legendary-action windows and resistance spend-or-suffer;
    uses tick down visibly).
13. **Wildshape picker: RAW 2024 KNOWN FORMS** on the character sheet (count
    by level, swappable on level-up); in-combat picker shows only those.
14. **Player onboarding: BOTH build-your-PC flow (share-link, own device)
    AND the one-page table guide, as one increment.**
15. **DM tooling after the tray: ENCOUNTER TIMELINE / PACING controls**
    (initiative timeline, next-event preview, skip/delay). Undo stays
    panel-based repair for now.
16. **BG3 provenance: ALL THREE LAYERS** — private inspiration dossier,
    public rows plain original_homebrew with SRD comparables (zero BG3
    traces), and a codex review per equivalent for "designable from public
    sources alone" before landing.
17. **Surfaces: FLAMMABLES + IGNITION CHAINING** — Web and Grease as
    flammable surfaces, fire damage in-cell converts to burning with
    SRD-cited damage. The water/cold/lightning interaction matrix is
    PERMANENTLY EXCLUDED, owner's follow-up ruling verbatim: "I don't want
    the water/cold/lightning interaction. It has no precedent in tabletop."
    This is a Larian-only mechanic and does not become an optional rule
    under D373.10 — it is out, not off-by-default.
18. **Beast ladders: ON DEMAND above CR 6.** Higher-CR family members get
    authored when a specific encounter needs one, inheriting signature-carry.

## D372 — OWNER: clone parties both ways; Honour Mode target; curation resumes (2026-08-24)

1. **Clone party = BOTH**: representative party first as the working
   baseline, then SRD-approximated BG3-style builds with their guide
   rotations as scripted turns (private repo).
2. **Honour Mode is the clone target** — full legendary kits modeled;
   feeds the queued legendary vocabulary.
3. **Curation rounds RESUME in parallel** with the VTT thread; next
   cluster drawn from the 2024-weighted floor blockers (the
   ambiguous-parameters families suit the D354 template+spot-check
   mechanism). Wish's two-round counter (D354.2) starts counting from
   the first resumed round.

## D371 — OWNER: surfaces enter combat via SRD text; BG3 corpus/legendary/high-ground rulings (2026-08-24)

1. **Ground surfaces are IN-COMBAT vocabulary, and the SRD itself is
   the template**: the owner pointed at the Web spell, and the SRD
   states it verbatim — "The webs are flammable. Any 5-foot Cube of
   webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage
   to any creature that starts its turn in the fire"
   (docs/srd/full source; spell-descriptions.txt:8486-8489, verified).
   So the surface vocabulary (area world-state per cell, ignition by
   fire exposure, burn-away timing, start-of-turn damage) is
   SRD-derived, not a BG3 import. R1/R6 STAND UNCHANGED for
   carried/worn-adjacent object ignition. This surfaces lever slots
   with/after the BG3 measurement round names its full shape.
2. **BG3 clone corpus: the four Act-1 exemplars now** (Phase Spider
   Matriarch, Grym, Githyanki Patrol, Goblin leaders), growing only
   when a new encounter exercises mechanics these do not.
3. **Legendary-monster vocabulary queued after detection** (legendary
   actions between turns, legendary resistance charges — SRD boss
   vocabulary; also serves the dungeon boss and the Grym clone).
4. **High-ground modifiers: optional rule, DEFAULT OFF**, declared
   per-campaign when elevation lands; SRD-RAW remains the default.

## D370 — OWNER: BG3 becomes a private-repo source; exemplar encounter clones; hard licensing wall (2026-08-24)

Extends D369. (1) The PRIVATE repo gains a **bg3 source alongside 2014
and 2024**: scrape/import BG3 mechanics (spells, actions, statblocks,
surfaces, reactions) from a website into the private corpus, run the
converter over it, and measure. (2) **Exemplar BG3 encounters** —
reconstructed from guides, detailed writeups, and videos of real
encounters — become private test fixtures: clean-room CLONES of each
encounter executed through the engine to exercise the mechanics
(surfaces, verticality, reaction prompts, adds, environmental
objects). (3) **!!IMPORTANT owner rule: BG3 material NEVER enters the
public repo.** The private repo generates the clean-room SRD-shaped
resources needed to build APPROXIMATE REPLICAS of BG3 encounters; only
those clean-room equivalents may cross to public (same discipline as
D59/D318 — the D367 CC-BY expansion does NOT cover BG3/Larian/wiki
content). Engine gaps the encounters surface become public levers in
SRD vocabulary (elevation, surface combos, etc. — the deferred
register is the natural landing place).

## D369 — OWNER: BG3 combat parity directive (2026-08-24)

The VTT must be able to do what BG3's combat can do; the canonical
example is the REACTION POPUP letting a player choose whether to spend
their reaction (opportunity attack included). Supervisor parity audit:
docs/design/bg3-combat-parity.md (draft, pending codex review in the
next lane). Consequences folded into the queue: the reaction-prompt UI
(per combatant x per reaction kind: ask/always/never) ships WITH the
detection lever's OA trigger so the canonical example works end to end;
movement-path provoke warnings follow as a board increment; elevation
remains registered. OPEN OWNER QUESTION recorded in the audit: BG3's
high-ground +2/-2 is a Larian houserule — adopt as an optional rule
when elevation lands, or stay SRD-RAW.

## D368 — OWNER: forks #15/#16 confirmed; no Moon-alike homebrew; OA joins detection (2026-08-24)

1. **Fork #15 CONFIRMED** (beast mini-lever + stand-in signatures +
   deferred-upgrade register, as landed).
2. **Fork #16 resolved: Land druid is fine PERMANENTLY** — no homebrew
   Moon-alike circle. The table's real Moon Druid arrives via private
   imported content when they build it; the beast families remain the
   wildshape form list and dungeon/summon bestiary.
3. **Opportunity attacks join the detection lever** as a fifth closed
   reaction trigger (movement out of melee reach provokes); Flyby then
   upgrades automatically via the deferred-upgrade register.

## D367 — OWNER: D59 wall expands to CC-BY 4.0 sources with per-source attribution (2026-08-24)

The public repo's licensing wall (D59) widens from "SRD 5.2.1 only" to
"CC-BY 4.0 licensed sources with per-source attribution": SRD 5.2.1,
**WotC SRD 5.1** (2014 rules — Giant Ape, Triceratops, Tyrannosaurus,
Plesiosaurus, Pteranodon, etc.), and the **A5E System Reference
Document** (EN Publishing, a5esrd.com — includes the Monstrous
Menagerie and its Beasts & Creatures section; attribution line: "This
work includes material taken from the A5E System Reference Document
(A5ESRD) by EN Publishing and available at A5ESRD.com, based on Level
Up: Advanced 5th Edition, available at www.levelup5e.com."). Mechanics:
each admitted source gets its license/attribution file under
dist licenses, and statblock provenance names WHICH source each row
derives from. Everything non-CC-BY (OGL-only, ORC, book content)
remains outside the wall. The D366 beast families may now ADAPT this
prior art, inventing only for true gaps.

## D366 — OWNER: clean-room homebrew beast families for Moon Druid with powers carrying through CR (2026-08-24)

Original homebrew beast FAMILIES ship as bundled public content fixing
the known wildshape gaps (2014 was bad, 2024 only somewhat better):
bears, spiders, dinosaurs (land AND flying), aquatic, birds, and kin —
each family with a FULL CR ladder aligned to the 2024 Moon Druid
unlocks (CR 1/4, 1/2, 1, 2, 3, 4, 5, 6 = druid levels 2-18) and
SIGNATURE FAMILY POWERS THAT CARRY AND SCALE through the ladder (a
spider druid stays a spider at CR 5; web/poison grow instead of
vanishing). Research basis: guides' gap list — flying thin at usable
CRs (fly unlocks druid level 8), aquatic thin (swim unlocks level 4),
themes stop scaling (no big spider/bear/bird). Clean-room: ORIGINAL
statblocks, no non-SRD reproduction; balance anchored to named SRD
comparables at the same CR; provenance records the comparable anchors
(a new provenance kind beside SRD line-span citations). Queued behind
the adventuring-day lane (one codex lane at a time — box saturation).

## D365 — OWNER: bundled sample dungeon; representative acceptance party; wildshape after detection (2026-08-24)

1. **A four-room sample dungeon ships as bundled content** (SRD
   monsters, maps, walls, fog, placement) — the D361 acceptance run is
   reproducible and doubles as the demo encounter chain; the DM can
   edit it live.
2. **The acceptance party is representative, built through the app**:
   Warlock (short-rest slots), Moon Druid (wildshape), a martial, a
   prepared caster — replaced by the real table's characters whenever
   they build them.
3. **Wildshape (forms + beast registry through the Druid feature)
   queues AFTER the detection lever**, preserving D361's confirmed
   order: adventuring-day -> detection -> wildshape.

## D364 — OWNER: summon statblocks stored as monsters with a spell mapping table; 2014 summons ignored; CR 1-5 beasts for Moon Druids (2026-08-23)

1. **2014 summons are ignored for now** (consistent with the D363.1
   2024 table).
2. **Spell-companion statblocks are stored AS MONSTERS** in the
   ordinary monster registry — no special spell-embedded statblock
   representation — with a **mapping table linking monster ids to
   spell ids** so the summon operation resolves its companion block
   through the registry. Applies to both classes: SRD-decodable
   companions (2024 find-steed's Otherworldly Steed, giant-insect,
   animate-objects — public, citation-per-row) and non-SRD spirit
   blocks (Summon Beast/Fey/Undead/Aberration/Celestial/Construct/
   Elemental — arrive via private imported packs' monster surface with
   the mapping carried in the pack).
3. **The monster bundle must include CR 1-5 BEASTS for Moon Druid
   wildshape** — SRD beast decode across CR 1/8-5 extending the
   wild_beasts family, same citation discipline as the starter roster.
4. **(Owner amendment)** The MonsterStatblock representation may be
   REFACTORED to support summon companions that scale with PLAYER
   STATS: registry entries are either static statblocks or
   caster-parameterized templates closing over a typed CasterContext
   (spell save DC, spell attack bonus, ability modifier, slot level)
   at summon time; instantiating a template without its context must
   fail to compile.

## D363 — OWNER: table plays 2024; short rests in first adventuring-day increment; SRD monster bundle plus homebrew families (2026-08-23)

1. The owner's table plays **2024**: the four-room dungeon locks to
   2024 (D358), and the play-value floor (D352.2) weights the 2024
   records.
2. The first adventuring-day increment INCLUDES short rests: hit-dice
   spending, short-rest slot recovery (Warlock), and per-short-rest
   features, alongside cross-room persistence.
3. Monsters: the SRD 5.2.1 monster statblocks become a BUNDLED content
   pack (CC-BY, in-license), and HOMEBREW MONSTER FAMILIES fill any
   gaps (owner recalls existing homebrew monster families — locate and
   reuse before authoring new ones). Unblocks the 22 summon-blocked
   floor records and supplies the dungeon bestiary.

## D362 — OWNER: overlay is owner-only forever; transcript/cost defaults (2026-08-23)

The curation overlay stays the owner's editorial layer permanently: no
author field, no DM-facing ruling entry. The table DM's live
adjudications stay verbal/session-local and never enter the data.
Supervisor defaults accepted alongside: AI-table transcripts and
replays are local-only unless explicitly exported; any codex-driven
table controller states a per-session budget before running.

## D361 — OWNER: the four-room dungeon requirement; queue prune; walk reframed (2026-08-23)

1. **V1 acceptance scenario (owner: "I need"): run a FOUR-ROOM DUNGEON
   where player resources do NOT reset between rooms.** Party state —
   current HP, spent spell slots, used per-rest features, consumables —
   persists across a chain of encounters in one session. This extends
   the D352.1 PC bridge (which currently spawns fresh profiles per
   encounter) with a party-session state layer feeding each next room.
   Sequencing CONFIRMED BY OWNER (rejecting the supervisor's
   dungeon-first proposal): D359 seam audit stays first, then the
   adventuring-day increment, then the D355 detection lever.
2. **Stale tail pruned** from the standing brief: mutshard shards 2-8
   rerun, order-dependence campaign, walkthrough specs 11-12 dropped
   (revivable by asking). wt/s7 findings doc merge and the 28MB tracked
   cache cleanup remain someday-items.
3. **D286 stranger walk reframed as player onboarding**: a player at
   the owner's table builds a character and joins an encounter via the
   PC bridge, on :4173 once the current build serves.
4. Discord portal steps stay live on the owner's list.

## D360 — OWNER: errata drift voids rulings at cited-clause granularity (2026-08-23)

Ruling digests upgrade from whole-description to CITED-CLAUSE pins: a
ruling names the specific clause it interprets, and only a text change
touching that clause voids it (hard refuse until re-ruled); unrelated
rewording carries silently. Back-fill from the clause quotes existing
rulings already carry. Supersedes the whole-text digest reading of
D340.2 once the schema upgrade lands; until then D340.2 behavior
stands.

## D359 — OWNER: full view-seam audit lane BEFORE the detection lever (2026-08-23)

A dedicated lane introduces DM-visible vs player-visible PROJECTION
TYPES (DmView / PlayerView-per-seat) and migrates EVERY existing
surface — fog, dice log, OOC log cards, session persistence, board
rendering — before the D355 detection lever starts. No transport, no
player UI: the deliverable is that a feature leaking hidden state to a
player view FAILS TO COMPILE. Queue order becomes: view-seam audit ->
detection lever (built against the projection types from day one) ->
board increments (D357 OOC cards, reaction toggle, D358 edition lock
can ride along where natural).

## D358 — OWNER: dual-edition stays; encounters lock to one edition (2026-08-23)

Both 2014 and 2024 remain curated and measured. An encounter/campaign
LOCKS to one edition, ENGINE-ENFORCED: a record from the other edition
refuses to load into a locked encounter with a typed refusal naming the
edition mismatch. Queued as an engine increment (small — records
already carry their edition); the type-level expression should make a
mixed-edition encounter unrepresentable or refused, per the project's
wrong-program-fails-to-compile principle.

## D357 — OWNER: OOC records get a DM log card carrying ruling text (2026-08-23)

Out-of-combat / table-adjudicated records become VISIBLE-BUT-UNMODELED
in the VTT: casting one renders a DM-facing log card carrying the
ruling's one-line adjudication text (e.g. "Dream — table-adjudicated:
narrative delivery; nightmare rider resolves at wake during rest").
Every future OOC ruling includes that DM-facing sentence at creation;
the existing OOC corpus (~118 floor records) is back-filled by codex-
drafted template text with owner spot-check per the D354 mechanism.
Queued as a board increment (after the detection lever, or bundled with
another board increment); the ruling-text drafting can start sooner.

## D356 — OWNER: capability wins over capability-driven rulings (2026-08-23)

When a landed capability makes a scoped-out record expressible:
CAPABILITY-DRIVEN rulings (scoped out because the engine could not
express it) AUTO-RE-ENTER the denominator/queue when the capability
lands; PREFERENCE rulings (R-param values, deliberate
table-adjudication choices) stand until the owner rescinds. The
supervisor classifies each existing ruling (R1-R20) into
capability-driven vs preference and records the tag in the private
rulings doc; future rulings carry the tag at creation. The
binding-determination 154 hold follows the same rule: mapper
improvement reaching them re-enters them automatically, no separate
ruling needed.

## D355 — OWNER: full detection vocabulary as one lever, next in queue (2026-08-23)

The detection/hiding lever ships as the FULL vocabulary in one lane —
Hide action, Invisible condition, Stealth contests as opposed actions,
active Search, Passive Perception thresholds, unseen-attacker adv/dis,
light levels, exploration-mode detection — touching the senses code
once rather than twice. Queued as the next engine lever after the
PC-bridge increment closes. Unblocks 2024:enthrall (D351.3) and
mind-spike; builds on the D351 roll-mode grants and the landed
senses/obscurement vocabulary.

## D354 — OWNER: R-param scales via templates with spot-check; Wish waits (2026-08-23)

Brainstorm Q&A rulings: (1) R-param approval for the
parameter-determination 460 uses PATTERN TEMPLATES — the owner approves
a template sentence plus its digest-pinned record list in one ruling and
records inherit with provenance — WITH SPOT-CHECK: each template batch
presents 3-4 randomly sampled records in full before approval, and a
miss rejects the whole batch back to per-record review. Floor-weighted
slice (D352.2) first. (2) Wish (D350) stays queued: owner chose "wait
for more rounds"; supervisor re-presents after the next two curation
rounds land.

## D353 — OWNER: D59 fixture policy — generalized homebrew publicly, real exemplars privately (2026-08-23)

Public-repo tests for mechanics whose exemplars are non-SRD spells use
INVENTED HOMEBREW SPELLS THAT GENERALIZE the mechanic, not disguised
copies: for a "flat AC bonus downgrading after movement" exemplar, the
public fixture family covers "condition/benefit X that changes after
event Y" across the combination space (moving, attacking, a creature
entering a space, entering a creature's space, ...; the benefit need
not be AC, need not be flat). Briefs to codex must ask for this breadth
explicitly. Non-SRD spell names, text, and stat lines never appear in
public files (today's supervisor scrub ratified). ADDITIONALLY the
private repo carries exemplar tests using the REAL published spells
against the public engine (private may read public). Queued: a private
exemplar-test increment for the D351 rollmod lever; future levers ship
both halves.

## D352 — OWNER: v1 definition, play-value coverage floor, standing delegation (2026-08-23)

Answers to the three-model brainstorm's top tier:

1. **V1 is a personal tool for the owner's table**: players build
   characters and play them on the VTT with their DM controlling.
   Priority consequence: the character-build -> play-on-VTT loop (PC
   integration, in-combat vocabulary like detection/hiding, table UX)
   outranks raw coverage counts and distribution/licensing surfaces.
2. **Coverage is gated by a play-value floor, not a raw percentage**:
   spells a real level 1-10 party would actually cast must execute; the
   long tail may refuse honestly. Operational first cut (supervisor):
   SRD spells of spell level 0-5 form the floor universe; the lever
   value function weights by that set.
3. **Supervisor-choice-pending-confirmation is STANDING** (D348's
   overnight mechanism made permanent): the supervisor chooses among
   defensible engine-fork options, records them in the register as
   pending-confirmation, and batches them for owner confirmation.
   Conservative scope until the owner widens it: fork-class choices
   only — R-param values, scope-outs, and denominator changes remain
   owner-only.

## D351 — OWNER: roll/defense-modifier lever authorized; Dream OOC; two no-rulings (2026-08-23)

Roll/defense curation round 1 (four AskUserQuestion rulings):

1. **Roll/defense-modifier engine lever dispatched now.** The ~18
   fully-stated records of the 22-record cluster (Bless, Bane, Shield of
   Faith, Guidance, Resistance, True Strike, Foresight, Circle of Power,
   Protection from Energy, Stoneskin, Fortune's Favor, Compelled Duel,
   Tortoise Shell, Elminster's pair, Antagonize's fallback clause, etc.)
   need no owner value — they need vocabulary for flat AC/attack/save
   bonuses, d4-style die riders, and advantage/disadvantage grants, each
   with scope + eligibility + duration. Same per-lever pipeline as
   D348.1, per-lever merge to main per D344.4 (browser suite now in the
   gate set).
2. **2014:dream — whole-record out-of-combat** (R20 in the private
   rulings doc, clause digest there). Denominator 814 -> 813.
3. **2024:enthrall — no scope-out**: stays engine-blocked on the
   detection/hidden vocabulary; the -10 Passive Perception is a real
   combat mechanic once hiding lands.
4. **2014:dispel-evil-and-good — no R5 split**: whole record waits on
   its three levers; no denominator change.

## D350 — OWNER: Wish duplicates any spell of level 8 or lower (2026-08-23)

Curation-round directive (R19 exception): Wish's basic use becomes a real
engine mechanic per the 2024 text — a duplication operation whose
parameter space is the loaded spell registry (SRD + imported packs):
select any available spell of level <= 8 and execute it with no
component/requirement constraints, per "The spell simply takes effect."
The free-form alternative effects and the post-Wish stress rule remain
table-adjudicated (R5 split). Applies to both editions' records with the
2024 text as semantics reference. Queued as an engine increment after the
D348.1 tail (forms, reactions).

## D349 — OWNER: three fork choices CONFIRMED with revisit triggers; curation session now (2026-08-23)

Morning rulings on the overnight run.

1. **Fork choices #7 (sight-only senses), #8 (subject-cell obscurement),
   #6 (one outer upcast target set) are CONFIRMED**, with revisit triggers
   recorded (owner asked for triggers; these are the supervisor's proposed
   ones, standing unless the owner amends): #7 revisits when the measured
   residue attributes 10+ records to tremorsense/devilsight/ethereal, or
   when a monster pack the owner wants to run needs them; #8 revisits when
   a record the owner rules playable needs ray-intersection obscurement or
   the board gains area-vision rendering; #6 revisits on the first record
   whose text scales different operations' targets differently that the
   owner wants emitted.

2. **Direction: CURATION SESSION NOW.** The supervisor brings
   highest-precedent pattern batches from the relabeled 344 in rounds of
   four while the D348.1 tail (forms 16, reactions 14) continues in
   background lanes.

## D348 — OWNER: run all levers sequentially without waiting; collaborative curation drafting overnight (2026-08-23)

Given before sleeping.

1. **All engine levers proceed one by one without owner rounds between
   them**, in measured-ranking order: equipment (52), sequenced-effect-
   binding (82), senses (31), target-selection-binding (32), then the tail
   (summons 19, forms 15, reactions 13, check-floor 2) as far as the night
   allows. Each lever gets the full pipeline: dispatch, harvest, four-part
   gate, supervisor control, wt/vtt merge, per-lever main merge (D344.4),
   measurement round. UNRULED FORKS (senses #7/#8 and any newly surfaced)
   are decided by the SUPERVISOR choosing the register's most defensible
   option, marked as supervisor-choice-pending-confirmation in the brief
   and batched for the owner's return — never silently, never in this
   file as if owner-ruled.

2. **Curation: the three models (Fable, Opus, Sol) collaboratively DRAFT
   dispositions for the 344-record judgement queue** — proposals with
   quotes and R-shape mapping, cross-reviewed for consensus vs contested —
   but NOTHING is approved or emitted: D338.1 per-record owner approval
   stands; the drafted worksheet waits for the owner.

## D347 — OWNER: composition depth re-opened — pairwise extends to nested composition (2026-08-23)

Lever round with attempted-emission pricing (composition-arity 104 the
largest pool). Ruling: EXTEND pairwise composition to allow a step to be a
composition again, with a declared depth bound. This deliberately re-opens
D335's contraction, and the ground has changed since: the typed
per-operation outcome channel and RNG-atomic abort now exist, so the
state-delta refusal heuristic that produced the measured hp-20-vs-17
corruption is structurally gone. The D333-era hazard class is fixed at the
type level, not patched.

Bounds: depth limit as a named constant (measurement: 51 three-op + 11
four-op records; depth 4 covers the known residue), import refusal past it
with both sides pinned; shared_outcome branches remain non-nesting (their
own rule, unchanged); every nested step reports through the outcome
channel; abort unwinds RNG at every depth.

## D346 — OWNER: R-param ruling shape authorized; binding waits for the mapper; pending-11 next (2026-08-22)

1. **R-param authorized, unrestricted**: the owner may supply a concrete
   parameter value the record's text omits. Recorded as data with
   provenance and clause digest like every ruling; drafts always arrive
   with the proposed value and the SRD basis where one exists; emitted
   packs mark these values as owner homebrew. Consequence stated at ruling
   time: unlike scope-outs, R-param INVENTS mechanics.

2. **Binding-determination (117) is NOT added to the curation queue** —
   chosen over the pattern-first recommendation. Those records stay
   refused until the converter's textual determination deepens; no
   binding rulings are drafted.

3. **The curation-pending 11 come as the next approval batch**, with the
   supervisor's R5 digest re-bind riding along.

## D345 — OWNER: re-derive the classifier before any further lever (2026-08-22)

Chosen over the recommended shared-outcome lane, with three misses on the
record (pairwise 89->1, sequencing 119->7, and the original set-cover
554->134): codex-classified pools are not planning numbers. Before the next
engine lever, a round replaces regex/judgement classification with
MEASUREMENT-BACKED classification: the converter ATTEMPTS emission for every
residue record against the current engine surface and records the specific
refusal point, so every bucket count is the count of records that actually
failed for that reason. Future lever rounds use only these attempted-emission
numbers. Shared-outcome (measured 36) remains next-in-queue after the
re-derivation, with D344.2's branch-tree semantics standing; D344.3's board
trigger is unchanged (fires after shared-outcome lands).

## D344 — OWNER: lever-with-data, branch-tree success arms, board after shared-outcome, wt/vtt merges to main per-lever (2026-08-22)

Round answers plus the sequencing measurement.

1. **No pre-registered lever rule — decide with the data.** The data
   arrived the same tick: sequencing's ~119 codex-classified pool measured
   **7 executable** (142 -> 152 total with R10-R13; residue 672/824).
   Third and largest classification-vs-measurement miss; the lever round
   proceeds with measured numbers and the re-derive question on the table.

2. **Shared-outcome success semantics: SYNCHRONIZED BRANCH TREE** —
   explicit failure-branch and success-branch operation lists sharing one
   roll, chosen over the per-consequence recommendation. Heaviest
   converter mapping accepted; the shape is maximally explicit and the
   branch lists reuse the existing operation vocabulary.

3. **The board increment fires AFTER the shared-outcome lever lands** —
   fixed trigger, wiring accumulated mechanics into the DM view.

4. **wt/vtt merges to main NOW, then at every post-lever gate boundary**
   (standing rule, mirroring wt/simcore's). The first merge reconciles
   the attack-profiles dual test files.

## D343 — OWNER: sequencing lever next; vague reuse normalizes to Magic action; per-record target binding (2026-08-22)

Lever round after the curation sprint's repricing (sequencing pool ~119 =
67 measured + 52 codex-classified).

1. **The sequencing lever takes the next engine lane** — cast-now-use-later
   effects (Produce Flame, Mage Hand, Call Lightning, Heat Metal's
   re-trigger family).

2. **Reuse action type: vague phrasings normalize to the 2024 Magic
   action** ("as an action on a later turn" -> Magic action, a deliberate
   2014 rewrite, consequence accepted). Records whose text EXPLICITLY
   names a different type (Heat Metal's Bonus Action, reaction
   re-triggers) keep their stated type — clarified after the supervisor
   flagged the collision with D338-addendum requirement 5, which stands
   unchanged.

3. **Target binding on reuse is an EXPLICIT PER-RECORD POLICY**
   (bound | reselect) taken from each record's text; the converter
   refuses records whose text does not determine it.

## D342 — OWNER: curation sprint before any engine lever (2026-08-22)

Lever-round ruling with the curated measurement in hand (executable 142,
residue 686/828): the next lane is a CURATION SPRINT, not an engine
increment. A worksheet lane drafts proposed dispositions over the 161
ambiguous-parameters and 19 curation-remaining-clause records — verbatim
quoted clauses, R-shape proposals, R6-class pattern candidates surfaced
explicitly — and the owner approves per-record in batches (D338.1).
Records whose blockers are mechanical are marked not-curable with their
lever named and leave the queue. Engine levers (shared-outcome 36,
equipment, target-selection 25) wait for the sprint's outcome.

## D341 — OWNER: namespaces are MANIFEST-DECLARED (2026-08-22)

Ruled after full context (round-14 Q1 held open in D340). A content pack
declares the namespaces it mints in its manifest, next to provenance.
Import rejects any record whose sourceId is outside the declaration —
per-record, load-the-rest, per D339.1. Aggregator packs remain legal but
explicit; the claim is visible before import; the scraper fills the field
automatically. Cross-pack collision refusal stays as the second guard.
Enters wave 1's scope (it is import-validation work).

## D340 — OWNER: equipment carries stowed items with SRD interaction economy; clause-digest approvals; E05B closed (2026-08-22)

Round-14 answers plus the pre-registered E05B closure.

1. **Equipment model refined (extends D339.4): hands + worn PLUS CARRIED
   equipable items.** A combatant can stow an equipped sword and equip a
   carried crossbow. Action economy per SRD 5.2.1 (full text, "Interacting
   with Things"): one object interaction free per turn during move or
   action; a second requires the Utilize action. Stow/equip transitions
   enter the command union with that economy. The first equipment lane
   still ships the Heat Metal slice as its acceptance package (forced drop
   to board, pickup, re-equip) — now with stow/equip included per the
   owner's example. Armor don/doff stays out of combat scale
   (armor-table.txt timings).

2. **Curation approvals bind to an EXACT CLAUSE DIGEST.** A change to the
   approved clause voids the approval and re-queues the record; unrelated
   record changes do not churn approvals.

3. **E05B executed and the line is CLOSED per D339.2's pre-registered
   rule.** Result, read by the supervisor from report.json: 120 tables at
   ceiling; the type checker passed 760 of 760 checked programs — zero
   rejections even under the harder domains (5 monsters, 5-ft budgets,
   partitioned spell pools). This number is contention-immune (checks run
   locally) and is the basis for closure: the typed surface stays (zero
   runtime cost, D331), no E05C. CONTAMINATION NOTE, recorded in full:
   80/120 tables aborted and completion-dependent metrics (correction
   rates 2.6% vs 4.2%, wall clock) are NOT trustworthy — Sol brainstorm
   dispatches shared the codex quota mid-run at owner instruction, so
   difficulty-aborts cannot be distinguished from contention-aborts.
   INSTRUMENT GAP found at harvest: aborted table records carry no
   abort-reason field; the capture schema records failure without cause.

Namespace authority (round-14 Q1) is NOT ruled — the owner asked for
context and details; the decision stays open.

## D339 — OWNER: reject-record-load-rest, E05B closes the line, denominator 837, hands+worn with item registry (2026-08-22)

Round-13 answers, all four on recommendation. Brainstormed collaboratively
(Fable + Opus; Sol held out while E05B ran on the shared codex quota).

1. **Diagnostic-failure semantics (wave 1): REJECT THE FAILING RECORD, LOAD
   THE REST.** Each refused record carries its diagnostic; healthy records
   import. Sessions: a SHA-fingerprint mismatch refuses the file. Covers
   both surfaces per the owner's answer.

2. **E05B decision rule, PRE-REGISTERED before the report was visible:
   CLOSE THE LINE EITHER WAY.** E05B is the final typed-vs-untyped run;
   the result is recorded, the typed surface is kept (zero runtime cost),
   no E05C regardless of outcome.

3. **The 110 out-of-combat records are PERMANENTLY out of scope. The
   coverage denominator is 837** from now on; every report names the
   scope-out once.

4. **Equipment model: HANDS + WORN slots resolved by id from a pack ITEM
   REGISTRY.** No containers, no quantities. Heat Metal's D338-addendum
   contract (metal property, forced drop to board, pickup, disadvantage
   arm) is the acceptance test; packs can ship custom items.

Standing default noted, not a ruling: the curation worksheet is drafted by
codex one proposed disposition per record; the owner approves each
individually per D338.1.

## D338 addendum — OWNER: Heat Metal on a held weapon must be able to DISARM (2026-08-22)

Owner refinement of D338.4, matching SRD 5.2.1 (spell-descriptions, p.140):
a creature holding or wearing the heated object and taking the damage makes
a Constitution save or drops the object IF IT CAN; if it does not drop it,
Disadvantage on attack rolls and ability checks until the caster's next
turn start.

Equipment-model requirements this pins, so the increment is judged against
them:
1. HELD vs WORN distinction — a sword is droppable, worn armor is not
   ("if it can" is a modelled droppability condition, not prose).
2. Material property (metal) on items, selectable by targeting.
3. FORCED DROP as a real state change: the item leaves the creature's
   grip, exists on the board at the creature's cell, and is retrievable
   by a pickup action — a dropped sword the enemy can no longer swing IS
   the disarm.
4. The can't-drop/won't-drop arm applies the Disadvantage clause via the
   step-6 roll-modifier machinery (exists).
5. Re-trigger: caster's Bonus Action on later turns re-deals the damage
   while concentration holds — step-4/5 hook and concentration machinery
   (exists).
6. Contact damage applies to ANY creature in physical contact, not only
   the holder.

## D338 — OWNER: four curation-pattern rulings — per-record approval, lit world objects, mechanical tables, equipment model (2026-08-22)

Round-12 answers. Supervisor recommendations overridden on 1-3; 4 accepted
with an owner extension.

1. **Cosmetic-clause scoping is PER-RECORD, not a standing pattern.** R1's
   shape does NOT sweep automatically. The curation worksheet becomes an
   approval queue: one line per record with the exact clause and a proposed
   disposition; each moves only on individual owner approval.

2. **Illumination is MODELLED AS WORLD OBJECTS now.** Light sources emit as
   world objects carrying bright/dim radii even though no vision mechanics
   consume them yet — representation ahead of mechanics, accepted
   explicitly. Engine consequence: the world-object vocabulary needs an
   illumination attribute (small engine increment, queued behind wave 1).

3. **DM-adjudicated tables are MODELLED MECHANICALLY.** Mishap/familiarity
   tables (Teleport class) encode as declared random branches on the step-4
   machinery; only genuinely free-text outcomes remain DM-adjudicated and
   say so in the pack.

4. **Objects: creature-facing effects emit now; secondary object clauses
   unmodelled per-record — PLUS an owner extension: model WEAPONS AND
   ARMOR as equipment** so Heat Metal works properly (damage to a creature
   wearing metal armor; a forced drop of a held metal weapon). This is a
   new engine capability — an equipment/item model on combatants (worn
   armor, held weapons, material properties, drop mechanics) — entering
   the lever queue alongside shared-outcome linkage (39) and
   target-selection (25).

## D337 — OWNER: curation overlay adopted; owner rulings resolve ambiguous records as data (2026-08-22)

The owner offered judgement calls on the ambiguous-parameters residue,
beginning with: Fire Bolt's flammable-object ignition clause is out-of-combat.

Mechanism adopted: owner rulings are recorded in the PRIVATE repo at
docs/curation-rulings.md (R1 = fire-bolt) and applied by the converter as a
provenance-carrying overlay. The refusal rule is unchanged — a record leaves
the ambiguous bucket only via a recorded ruling or a genuinely mechanical
mapping, never a mapper guess. Rulings may be per-record or per-pattern; a
curation worksheet enumerating the 183 ambiguous records by undetermined
clause, grouped by ruling pattern, is queued behind the E05B run (D336.1
machine-quiet) and behind wave 1 in lane order.

## D336 — OWNER: E05B at next quiet slot; wave 1 next; session integrity = closed-union decode + SHA fingerprint (2026-08-22)

Round-11 answers.

1. **E05B live run launches at the next quiet slot** — after the pairwise
   remainder measurement is harvested and merged, the machine goes quiet,
   the 120-table run executes alone so its wall-clock metrics are honest,
   and implementation lanes resume after.

2. **Wave 1 (trust boundary) takes the next lane slot** — real
   value-validating schemas for the unvalidated operation kinds, one-source
   schema generation, bounded SpeedFeet, and the session hardening below.
   Targeting vocabulary and wave 2 queue behind it.

3. **Session integrity mechanism (owner's own design, modifying D334.2):
   closed-union decode of transition kinds PLUS a SHA fingerprint embedded
   in the file to authenticate it.** Recorded consequence, stated at ruling
   time: a fingerprint any writer can recompute authenticates against
   corruption and transport damage — tamper-EVIDENCE, not forgery-proofing.
   D334.2's "not recomputable by the writer" is relaxed to this by the
   owner's choice; cryptographic signing (the DM-keypair option) was
   presented and not taken, and can be revisited when player browsers
   exist.

## D335 — OWNER: general composition REPLACED by pairwise; measure the remainder (2026-08-22)

Re-evaluation of D333.1, ordered by the owner after the audit measured the
general operator's failure mode in the landed code (successful save
classified as refusal; abort rolled back landed damage, hp 20->20 where 17
is correct; RNG position leaked through abort).

Ruling: **replace general composition with pairwise composition first, then
show the measured remainder.**

1. The recursive CompositionOperation is REPLACED (not extended) by a
   pairwise operator: exactly two steps, and a step CANNOT be a composition
   — nesting is made unrepresentable in the type and the pack schema,
   superseding the MAX_COMPOSITION_DEPTH runtime refusal, which is deleted
   with its boundary tests and controls.
2. The wave-3 outcome-channel fix lands folded into this replacement at its
   smaller scope: every step returns a typed applied/refused/no-op outcome;
   the state-delta refusal heuristic is deleted as a consequence; the
   measured hp-17 case is pinned; abort-determinism pins the RNG stream.
   D334.4's additive-then-delete governs the mechanics of the swap.
3. Consequence accepted and recorded: the 62 deeper true-composition
   records (51 three-op, 11 four-op — Cloudkill, Evard's Black Tentacles,
   Elemental Weapon, Illusory Dragon class) remain unexpressible until a
   later ruling extends pairwise. If pairwise proves out, general becomes
   an extension rather than a rewrite.
4. After the replacement lands, the private-repo measurement re-runs over
   all 947 records and the owner is shown the MEASURED remainder by bucket
   with recordIds — not a projection. D333.1 is superseded by this entry;
   D334's pin on the general operator transfers to nothing (the operator is
   gone) and its wave-3 scope shrinks accordingly.

## D334 — OWNER: audit rulings — semi-trusted packs, shared sessions, engine-core bar, additive-then-delete (2026-08-22)

Rulings on the four questions from the three-model audit
(docs/audits/2026-08-22-three-model-app-audit.md):

1. **Content packs are SEMI-TRUSTED: user-authored, not hostile.** Validation
   is for diagnostics — malformed packs are rejected at load with good
   errors; the engine does not defend against deliberate attack. Consequence
   accepted and recorded: crashes or pathological types from a truly
   malicious pack remain possible; adequate while packs do not travel
   between users. Wave 1 sizes to this: real schemas for the five
   unvalidated operation kinds (values, not key presence), schema/code drift
   closed by generation or conformance test, a bounded SpeedFeet — but no
   adversarial corpus or execution limits.

2. **Saved sessions WILL BE SHARED — harden them.** The stronger option,
   chosen over the recommended local-only documentation. decodeRevision gets
   a closed-union decode of transition kinds and session integrity must not
   be recomputable by the file's writer. Joins wave 1.

3. **The D280 bar is enforced SCOPED TO THE ENGINE CORE.** One command, real
   threshold, declared scope = enforced scope, extended as tails clear.
   This is a D280 re-scope by ruling: "whole-src/ zero-unexplained" remains
   the v1 aspiration, but the enforced gate covers the engine core first.

4. **Waves 3-4 proceed ADDITIVE-THEN-DELETE.** Typed operation-outcome
   channel and the conditions rule surface land beside the legacy paths;
   old paths are deleted in their own commits with the wave-2 bar watching.
   Temporary duplication accepted with a hard delete commitment — the
   duplication itself is a standing finding until the delete commits land.

Context pinned by the audit, binding on the waves: composition's
state-delta refusal heuristic corrupts valid casts (measured hp 20->20
where 17 is correct) and abort does not roll back RNG position; the
composition increment stays on wt/vtt unreleased until the wave-3 outcome
channel replaces the heuristic.

## D333 — OWNER: general composition, scraper in parallel, E05 rerun, engine before board (2026-08-22)

Round-9 answers, given after the 24-hour summary. The supervisor recommended a
different option on all four and was overruled on all four; the recommendations
are recorded here so the trade the owner accepted is legible later.

1. **Next engine increment is GENERAL composition (151 records), not pairwise
   (89).** Supervisor recommended pairwise as the bounded primitive. Owner took
   the whole true-composition residue in one increment. Consequence accepted:
   arbitrary nesting makes the type-system work substantially larger, and the
   failure mode is a plausible-wrong-execution rather than a compile error, so
   the increment must be pinned by tests that distinguish nesting depth and
   evaluation order — not merely by "it executed".

2. **Scraper starts NOW as a parallel lane.** Supervisor recommended deferring
   it one increment on the grounds that distribution moves nobody until there
   is more to distribute. Owner wants it in flight. D332's "scraper waits until
   after the six set-cover steps" is satisfied and superseded by this.

3. **E05 is rerun with HARDER programs.** Supervisor recommended closing the
   line — the checker rejected 0 of ~300 and the instrumentation round proved
   that zero was real rather than vacuous. Owner's reading is that the null may
   be an artifact of programs too easy to get wrong. The rerun therefore is not
   a repeat: it only means anything if the program difficulty is raised by a
   declared, preregistered mechanism, and if the checker still fires zero times
   on harder programs that is a stronger negative result than the first.

4. **Engine depth continues; the board waits.** Supervisor recommended wiring
   draft-1 playability to the movement the engine already has, on the grounds
   that D312 orders movement first and nothing is demonstrable yet. Owner keeps
   engine depth ahead of playable surface. D312's forward thread is unchanged;
   what changes is that "keep the VTT moving" is satisfied by engine increments
   for now, and the screen-shared board is explicitly deferred.

MACHINE-LOAD NOTE (supervisor, not a ruling): answers 1-3 add three lanes while
the srd-subclasses survivor lane is still running. Gates on this box have
returned false timeout failures under concurrent codex load. Nothing is scaled
down; the dispatches are sequenced so no gate runs against a saturated machine,
and E05 starts only once srd-subclasses clears.

## D332 — OWNER: E05 retargeted to typed-vs-untyped; residue handed over; scraper waits (2026-08-21)

Round-8 answers. Question 1 (set-cover step 4) was answered "I need context
and details" and is NOT ruled on here — it stays open, with the detail
supplied and the decision deferred to the owner's next word.

1. **E05 becomes typed JS vs untyped JS, two arms.** The JSON-AST arm is
   dropped. Owner chose this over the three-arm version that would have
   preserved the original JS-vs-AST comparison. Consequence accepted and
   recorded: we will never learn what the AST surface would have cost, and
   D320's E05 as preregistered is superseded. What we do learn is whether
   the compiler check actually lowers the correction rate rather than being
   assumed to.
2. **Fixture residue: hand over the 35, skip the Fable and Opus passes.**
   D327's three-model collaboration is closed early by owner choice. The
   remaining set goes to the owner as-is.
3. **Scraper extraction to a standalone public tool waits until after the
   six set-cover steps** (D330 tail). Rationale accepted: the content-pack
   vocabulary is still changing every increment, so extracting now means
   re-extracting.

## D331 — OWNER: JS surface with TYPED guarantees (2026-08-21)

Owner: "I would like js. Look into how Claude code workflows work. Typed
guarantees would be even better."

1. **JS is the intended DM/PC surface** (confirms D320.5). E05 runs, but
   the JS arm is upgraded before it runs: not a stringly-typed DSL — a
   TYPE-CHECKED one.
2. **Typed guarantees**: the engine emits a per-encounter ambient
   declaration (.d.ts) whose types are narrowed to the ACTUAL state —
   combatant ids, available spell ids, prepared slots, legal action
   kinds are literal unions, not `string`. The model's program is
   type-checked in-process (TypeScript 5.9 compiler API is already a
   dependency) BEFORE interpretation. A program naming a monster that
   is not in the encounter, or casting a spell the caster lacks, fails
   to compile — the project's core principle applied to model output.
3. **Claude Code workflow architecture is the reference model** for the
   split: deterministic control flow in code, model calls at the leaves,
   schema-forced structured returns with automatic retry, declared
   phases. This is the same shape as E06's steering split (algorithm
   handles basics, model steers) and should inform it.

## D330 — OWNER: the scraper is a DISTRIBUTION mechanism; private repo is the user test environment (2026-08-21)

Owner ruling, verbatim intent: "Keep the mechanics from the copyrighted
books out of the public repo. The point of the scraper is to distribute
it in a way that it produces files that spike-vtt can import and then
play with. !!Important!! Use the private repo for this purpose !! Private
repo will be the test environment for a user who downloads the scraper,
runs it, imports the files and then makes characters and plays on the
vtt."

This reframes the whole non-SRD thread:

1. **Public repo (spike-vtt) ships the ENGINE plus a typed CONTENT-PACK
   IMPORT FORMAT** — never copyrighted content. Imported spells,
   features, species, subclasses, and monsters must work through the
   same typed machinery as SRD content.
2. **The scraper is distributed to users**, who run it against content
   they own; its output is import files. The scraper and its outputs
   live in the private repo.
3. **The private repo is the END-TO-END TEST ENVIRONMENT** for that user
   journey: download scraper -> run -> import -> build characters ->
   play on the VTT. Colby builds and the 947-record library exercise it.
4. **Consequence for the roadmap:** implementing individual non-SRD
   spells in the public manifest is the WRONG lever. The right lever is
   generic import capability + expressive typed shapes. CAP-012
   ("missing spell implementations") is superseded: what matters is
   whether an IMPORTED spell record can be expressed and executed.
5. D59 unchanged and reinforced: no copyrighted text or mechanics in the
   public repo, in any form, including tests and fixtures.

## D329 addendum 2 — OWNER: ep-213 fear theme goes ahead (2026-08-21)

Owner (verbatim intent): the fear-support theme SHOULD work via private
clean-room equivalents; asked what is missing. Ruling: ep-213's routine
is "maximize fear on enemies, then normal damage routine" — a party-wide
boost. Work: (1) engine aura machinery (radius condition effects — the
one true capability gap, also unlocks Pass without Trace's aura form);
(2) private clean-room equivalents for the five non-SRD fear sources
(Wrathful-Smite-shape, Cause-Fear-shape, fear aura, dread-form,
revelation pulse); (3) fear-first routine mapped for ep-213.

## D329 addendum — OWNER: ep-208 QUARANTINED (2026-08-21)

ep-208 "Swiss Army Soul Knife" (utility build, metric=other, no combat
routine in source): owner ruled "Quarantine" — permanently excluded from
combat soaks, recorded in the register; no synthetic routine.

## D329 — OWNER: seventh brainstorm round — fixtures, reports, endgame (2026-08-21)

1. **No-routine builds (ep-208/213/228/241): presented to the owner ONE
   BUILD AT A TIME with details and examples** (verbatim: "Give me the
   details and examples one build at a time"). Supervisor starts with
   ep-208.
2. **Open spell choices resolve to the MOST ENGINE-TESTABLE option**
   (gap-seeking bias), documented per patch.
3. **Rolling tranche artifact includes recommendations + next bets AND
   full methodology** (preregistrations, deviations, control ledgers).
4. **Scaled-fleet budget: ~25 tables/day** (E07 report sizes within it).
5. **E09 pattern promotion: metric threshold + supervisor typed-shape
   check, batch-reported to the owner.**
6. **Scorecard: automatic** — each newly-viable Colby build gets
   soak-derived DPR compared to its private ceiling; drift flagged.
7. **Personal session: not soon — AI-only remains the mode.** Keep
   building; playtest-gated items stay unblocked per D323 but no
   session scheduling.

## D328 — OWNER: sixth brainstorm round — E-series ops, Colby arm, Discord v0 (2026-08-21)

Fifteen rulings from the round-6 collaborative brainstorm (two blind
lists merged):

1. E-series pacing: **setup-overlap** — next experiment's harness builds
   while the previous run finishes; live runs never overlap.
2. Stop rule: **confidence + budget cap** — stop a run early when the
   winner is statistically clear; preregistered table count is the hard
   ceiling. (Supervisor defines the early-stop test in the harness and
   documents it in each preregistration.)
3. Colby 50%: **cumulative** — the running fleet total trends to 50%,
   bursts allowed.
4. Colby party composition: **gap-seeking quartets** (D322.8 spirit).
5. Oracle truncation: **accept lower-bound regret at K=64**, no
   escalation until the oracle proves decision-relevant.
6. Tranche reports: **rolling** — the artifact republishes after every
   completed experiment.
7. Discord Activity v0: **showcase combat** — an instant AI-vs-AI fight
   in the iframe.
8. Adventure features (D321.11-13): **build now on a parallel lane**.
9. Hotspot correctness wave: **now, concurrent** (dedicated lane).
10. D286 stranger-walk: **hold for the owner's explicit go** (narrow
    exception to D323, owner-chosen).
11. Fixture-fix disagreements: **always escalate splits** — any
    Fable/Opus/codex disagreement goes on the owner's list.
12. spike-vtt rename sweep: fold into the **next natural UI increment**.
13. Adventure slots: **free-text naming at creation**, suggestion
    prefilled.
14. Monster roster: **grow on demand** from encounter/adventure needs.
15. Fleet scale-up: **after E07's recommendation** in the tranche report.

## D327 — OWNER: three-model collaboration on fixture residue (2026-08-21)

For fixture data-quality issues codex struggles with: **codex (sol, high
effort) plus Claude Fable and Claude Opus (both high effort) collaborate
to shrink the residue** before anything reaches the owner — "five
hundred is too many." Explicit owner authorization for Fable/Opus passes
on this task (overrides the standing no-expensive-subagents default for
this scope only). Order: codex resolves what it can (patch layer);
Fable reviews the residue; Opus takes an independent pass; disagreements
and still-unresolved items go to the owner as the final short list.
Claude-authored patch proposals still get codex verification before
they land (consensus rule unchanged).

## D326 — OWNER: Colby soaks start at 16; fixture fixes collaborative (2026-08-21)

1. **The 50% Colby soak arm starts NOW with the 16 runnable builds**
   (D325.1's two prerequisites landed; more builds join as they flip).
2. **Data-quality fixture issues: collaborate to fix them** — codex/
   supervisor resolve what they can with documented reasoning; the
   hardest residue is batched to the owner. Verbatim: "Collaborate to
   try to fix them. Save me the ones you struggle with the most."

## D325 — OWNER: Colby prerequisites, oracle scope, BFRD (2026-08-20)

1. **Colby soaks start only after BOTH the pack-v2 caster slice AND the
   typed class/feat-effects slice land** (87 of 89 builds need class
   effects; casters-only soaking would quarantine nearly everything).
2. **Regret oracle runs over ALL 144 E01-run2 tables** — the winner is
   decided on complete evidence, no sampling.
3. **Black Flag (Tales of the Valiant / BFRD, CC-BY 4.0) support: yes,
   but later/low priority** — recorded as intent for the pilot second
   ruleset; no scheduling commitment.

## D324 — OWNER: naming style, Discord prep, report delivery (2026-08-20)

1. **spike-vtt everywhere** — one form in all contexts: lowercase,
   hyphenated. No styled "Spike" display variant.
2. **Discord prep: BOTH shapes in parallel lanes** (B1 bot adapter and A1
   Activity), each to the credential wall, when capacity allows.
3. **Tranche visual reports delivered as Claude artifact links** (private
   hosted page, URL handed to the owner).

## D323 — OWNER: never defer waiting for the owner (2026-08-20)

Verbatim: "Don't defer anything waiting for me." Every previously
owner-gated item advances to the owner-action boundary instead of parking:
Discord Shape 3 prep proceeds against fake ingress up to the credential
wall; E08–E10 proceed after tranche 1 (the visual report is still
produced, but is informational, not a gate); playtest-gated polish
proceeds AI-only. Unchanged hard stops (these are rule boundaries, not
deferrals): no push/publish/deploy; registrations (domains/npm/GitHub
names) are owner-only outward actions; decisions.md rulings owner-only.
Same day: VTT named **spike-vtt** (README, main `d0044815`); full rename
sweep is part of "the rest later" — under this ruling that means it
proceeds when convenient, not that it waits for the owner.

## D322 — OWNER: fifth brainstorm round — oracle design, arcs, fleet ops (2026-08-20)

Fifth blind collab round (codex 12 + Claude 10, merged 15). Rulings:

1. **Regret backfill: COLLECT ALL, BACKFILL, THEN SELECT** — E-series
   tables collect continuously with rollout inputs captured; winners
   declared only once tactical regret computes.
2. **Tranche results: A VISUAL REPORT PAGE** — charts per experiment
   plus the recommendation; owner replies go/no-go for E08-E10.
3. **Oracle utility: LEXICOGRAPHIC** — win/survive, then HP
   differential, then resources.
4. **Oracle continuations: DETERMINISTIC ALGORITHM CONTROLLER** plays
   all simulated playouts.
5. **Oracle cost (owner's design, verbatim intent): "Top k, 64,
   escalation if really needed. Also collapse probably equivalent.
   Evaluate combinations mostly disregarding order of execution. Keep
   some fixed follow up actions based on conditions (ex. Divine smite
   after crit)."** — top-K candidates at 64 rollouts with escalation;
   probable-equivalence collapsing; turn actions scored as
   order-insensitive combinations; standing conditional riders (e.g.
   smite-on-crit) kept as fixed follow-ups rather than searched.
6. **Arc approval: FULL PACKAGES UPFRONT** — every encounter of the
   adventure fully generated and validated before the owner sees the
   arc; approval covers the whole set.
7. **DM summaries: IMMUTABLE ENCOUNTER RECAPS + ROLLING ARC SUMMARY**
   in the adventure slot and replay bundle.
8. **Private-arm scheduling: ADAPTIVE GAP-SEEKING** — matchups chase
   unexercised mechanics (fastest gap-register fill).
9. **Gap builds: RUN IF VIABLE, QUARANTINE BLOCKING GAPS.**
10. **Narration: VALIDATION VOICE in experiments, MIXED VOICES in
    soaks.**
11. **Pattern library: SEED HAND-AUTHORED GENERIC HELPERS** (focus-
    fire, retreat-threshold, flank, smite-on-crit rider) before E09
    mining; mining measures growth beyond the seed.
12. **Correctness trickle after hotspots: WALKTHROUGH RECONCILIATION
    FIRST, then the D286 stranger walk, then sim merge-back**; fleet-
    surfaced correctness failures preempt all.
13. **E11/E12: FOLD INTO TRANCHE 1.**
14. **Fleet: AUTO-PAUSE a config after 3 consecutive aborts + flag
    the owner; other configs continue.**
15. **Gap review: BATCHED SUMMARIES, each entry with a proposed
    clean-room equivalent attached.**

## D321 — OWNER: fourth brainstorm round — experiment governance, adventures, AI-only mandate (2026-08-20)

Fourth blind collab round (codex 12 + Claude 12, merged 17; two
misclicks corrected in-round). Rulings:

1. **Experiment budget: STAGE-GATED TRANCHES** — E01-E07 first; owner
   reads results before E08-E10 unlock.
2. **E10 winner: SOAK PROBATION before default** (~100 clean tables,
   zero replay/sandbox failures); owner gets the report.
3. **Capacity: D320 MAJORITY, CORRECTNESS TRICKLE** — one queued
   correctness item at a time rides quiet windows (hotspot wave first).
4. **v1 release review REOPENS IN PARALLEL** — D286 stranger-journey
   walk as a trickle item; deploy remains a hard owner stop.
5. **Soak fleet: SMALL PILOT NOW** (2-3 tables/day) until the E-series
   winner, then scale to continuous.
6. **JS sandbox: HAND-ROLLED MINI-INTERPRETER** — restricted AST,
   typed API as the entire environment, deterministic, step/time
   bounded.
7. **Steering override bounds: E06 TESTS BOTH** (bounded vocabulary vs
   full-plan replacement) and the data decides.
8. **Pattern library: METRIC THRESHOLDS + SUPERVISOR REVIEW** per
   promotion; owner sees the changelog.
9. **PC/DM CONTROLLER symmetry: FULL** — one turn-program pipeline
   both sides — BUT (owner principle, stated mid-round, verbatim):
   "monsters and pcs are fundamentally different." Controller
   architecture is shared; ENTITY models stay separate (PCs =
   full-rules characters w/ death saves, spells, sheet pipeline;
   monsters = statblocks, die at 0, block-planned on shared
   initiative). No entity-model merging, ever.
10. **Model routing: BY TASK CLASS LOOP-WIDE** once E08 data exists
    (luna bounded/mechanical, terra judgment, sol hardest).
11. **Next product: LINKED MINI-ADVENTURES** (2-4 encounters, story
    thread).
12. **Between encounters (corrected): EXPLICIT TRANSITION/REST
    WORKFLOW** — PC HP/slots/conditions/consumables carry through
    typed, replayable SRD rest steps; monsters fresh by nature.
    Owner addendum (2026-08-20): rests EXPIRE DURATION-BOUND
    CONDITIONS/EFFECTS by elapsed time — short rest advances the
    clock 1 hour (600 rounds), long rest 8 hours (4,800 rounds) —
    in addition to the SRD's rest recovery rules.
13. **Storage: MULTIPLE LOCAL ADVENTURE SLOTS** + per-slot export.
14. **Roster: BIG SWEEP NOW** — decode a broad SRD monster slice
    (30-50 statblocks) in batches. Owner refinement (2026-08-20):
    **THEMED FAMILIES SCALED ACROSS CR RATINGS** — each family spans
    low-to-mid CR so an adventure can scale one theme up or down
    (e.g. goblinoid warband from CR 1/4 skirmisher to its chief).
15. **DM memory (corrected): SEARCHABLE REPLAY + GENERATED
    SUMMARIES** per adventure slot.
16. **Continuity: OWNER APPROVES AN ARC, AI CONTINUES** within it;
    every encounter still package-validated.
17. **Owner has no time for a personal session: GET AS FAR AS
    POSSIBLE AI-ONLY.** The AI-only program is the mainline.

## D320 — OWNER: DM-speed experiment program; shared enemy initiative; JS turn-programs (2026-08-20)

Owner directives, 2026-08-20 (verbatim intent):

1. **Collaboratively brainstorm and design EXPERIMENTS** to make AI
   steering faster on terra medium without sacrificing quality:
   prompting changes, skills, and/or an algorithm that "handles the
   basics" so the model only steers.
2. **terra medium vs luna medium HEAD-TO-HEAD** on those experiments to
   measure the speed/quality trade directly.
3. **Experiment with different INITIATIVE SYSTEMS** to measure their
   effect on AI speed.
4. **Stated intention (binding): ALL ENEMIES ACT ON ONE SHARED
   INITIATIVE** so the DM plans all their turns at once.
5. **JS TURN-PROGRAMS**: codex is code-tuned, so the AI DM and the AI
   PC controller should output JS code describing how the turn goes,
   including conditionals on play state (enemy dies / gets crowd-
   controlled). Iterate, mine recurring patterns into permanently
   stored code the model calls with parameters. The VTT gains the
   ability to accept and interpret such code into character actions.

Supervisor reconciliation note (amends D317.7's "never executable code
strings", which the owner hereby overrides in substance): JS becomes
the plan SURFACE LANGUAGE, executed in a sandboxed deterministic
interpreter with NO ambient authority — its entire API is the typed
action/query surface, every emitted action still validates through the
reducer, execution is step- and time-bounded, and replay captures the
program + its trace. Security and determinism guarantees carry over;
only the syntax the model writes changes.

## D319 — OWNER: soak spend confirmed, VTT lands on main, program triggered (2026-08-20)

1. **Soak fleet: CONTINUOUS AS RULED** — confirmed against measured
   cost (~5 terra-medium calls per 5-round table, 33-88k input each,
   heavily cached). Codex-out-of-credits remains the loud stop.
2. **wt/vtt LANDS ON MAIN NOW** — full phase-2 merge including the
   0051 migration renumber (trial-idx5 playbook); full gate on main
   before anything else proceeds.
3. **The post-playtest program is TRIGGERED by the AI tables** —
   model/effort study, DM/PC KB skill, and sim merge-back start on the
   accumulating canonical bundles; the owner's personal session
   happens independently whenever they are free.

## D318 — OWNER: soak fleet uses private builds; non-SRD mechanics get a gap register and clean-room equivalents (2026-08-19)

Owner directives, 2026-08-19 (verbatim intent; "Colby builds" =
the private d4 repo's 89 Colby-method builds in builds/fixtures/ —
name verified against that repo's own docs):

1. **Half of the VTT all-AI soak runs use the PRIVATE repo's builds for
   the PC party**; the other half stay on the D260 SRD reference party.
   D59 unchanged: private content is loaded locally at runtime and
   never crosses into the public repo or its artifacts.
2. **A mechanics-gap sentinel watches for anything not describable
   using only the SRD** (spells and otherwise) — at build-import time
   (a private build's feature fails to map onto SRD-describable engine
   primitives) and at play time (ADJUDICATED events whose subject is a
   non-SRD mechanic).
3. **The gap list lives in the private repo**
   (~/PhpstormProjects/dnd-d4-builds-code-test), one entry per
   mechanic: what it is, which build surfaced it, what engine
   capability it demands.
4. **Each gap gets a CLEAN-ROOM HOMEBREW EQUIVALENT** — an original
   mechanic (no copyrighted text, names, or numbers) exercising the
   SAME engine capability closely enough that green tests on the
   equivalent give confidence the VTT can represent the whole game.
   Equivalents are public-repo-safe by construction and join the
   combat test suite.

Scope note: wiring lands with the soak-fleet program (post-playtest,
D314.13/D317); the sentinel's import-time half belongs to the
private-build-to-combatant adapter when it is built. The public spell
manifest's typed partials are implementation gaps, not license gaps,
and stay separate from this register.

## D317 — OWNER: third brainstorm round — persistence, bridge, campaign mechanics (2026-08-19)

Third blind collab round (codex 12 + Claude 12, merged 21). Rulings:

1. **RNG after undo: DETERMINISTIC BRANCH STREAM** — new branch derives a
   fresh seeded stream from (state, branch id); no rerolling known
   outcomes; replay stays exact.
2. **Autosave durability: BROWSER + FILE MIRROR VIA BRIDGE** — every
   revision also appends to a disk file through the localhost bridge;
   browser primary, file survives browser wipes.
3. **Save/replay format: MIGRATE A VERSION WINDOW** — schema-versioned,
   migrations across a bounded window.
4. **Window crash: HARD PAUSE + REOPEN RECOVERS** — authority in the
   DM-side session; no worker holds it; rehydrate from the store.
5. **ADJUDICATED in player view: LABEL + VISIBLE CONSEQUENCE** —
   reasoning stays DM-side.
6. **Bridge failure in session one: EXPORT AND ABORT** — a failed
   session is a bug report, not something to play through. No silent
   controller fallback.
7. **Round plans are PROGRAMS** (owner's direction, verbatim intent):
   "Make the round plan more like a Claude workflow where it can contain
   code and branch if/then and go down priority lists." Re-consult unit
   when a plan runs dry: that monster's remaining round. Supervisor
   design note: typed reducer-validated decision DSL (branches,
   priority lists), not arbitrary executable code.
8. **Art look: PIXEL-ART SILHOUETTES** — procedurally assembled sprites.
9. **Difficulty parameter: EXPECTED LENGTH + RESOURCE PRESSURE**,
   validated against sim math.
10. **Encounter revision: TARGETED REGEN + MANUAL PATCH**, full
    revalidation either way, provenance records which.
11. **Replay bundle: CANONICAL FLEET SCHEMA NOW** — model id, effort,
    build, load tag, latency, tokens first-class from increment 10.
12. **Discord live check: AFTER THE LOCAL PLAYTEST** (credentials wait).
13. **Spell batches: SAMPLE-VERIFY (5 random rows word-for-word) PER
    BATCH + FULL-MANIFEST AUDIT AT INCREMENT-4 CLOSE.**
14. **First-session DM bridge model: TERRA MEDIUM.**
15. **No playtest target date — it lands when the gates clear.**
16. **Supervisor sessions: CONSOLIDATE TO THE ORIGINAL SESSION** (the
    one carrying D313-D317 context); the 15:27 session stands down via
    loop-log notice.
17. **KB entries: CO-GENERATE NOW** — each batch emits rule id + SRD
    locator + one-line guidance per row alongside the tests.
18. **Starter statblocks: PARALLEL LANE NOW** (8-12 CR 1/4-3, cited,
    validated) — also unblocks all-AI soaks sooner.
19. **Undo UX: SIMPLE UNDO-LAST + HISTORY BEHIND DISCLOSURE.**
20. **Playtest: RESUMABLE, SOLO FIRST** — presentation polish deferred.
21. **TTS narration: POST-PLAYTEST BACKLOG CANDIDATE.**

## D316 — OWNER: art is procedural-only, CC-BY; Discord Shape 2 disliked, Shape 3 under investigation (2026-08-19)

1. **Bundled art: PURE PROCEDURAL ONLY.** All VTT art comes from the
   project's own checked-in deterministic renderer. No external icon
   families — the game-icons.net CC-BY-3.0 pipeline is rejected. No AI-art
   overlay seam. The procedurally generated art is licensed CC-BY (with the
   repo's CC-BY-4.0), owner's words: "Just license the art generated by
   Claude procedurally under cc-by."
2. **Discord (amends the D314.14 thread): the owner dislikes Shape 2**
   (bot-relay). Shape 1 remains the playable-skirmish default. Shape 3
   (Activity) is NOT rejected: the owner asked for full detail on it,
   an explanation of why it cannot run as a local Node.js server, prior
   art for shared state in Activities, and how such apps are usually
   hosted — research delivered in-session 2026-08-19; ruling still open.

## D315 — OWNER: follow-up round rulings — spell engine, effect authority, the table loop (2026-08-19)

Second collaborative brainstorm (Claude 15 + codex 15 blind, merged to 18 +
one same-day finding), asked one at a time. Rulings:

1. **Spell engine scope: EVERY LEVEL-APPROPRIATE PARTY OPTION** — any spell
   the reference party could prepare works mechanically, so re-preparation
   between sessions needs no engine work. (Not just prepared loadouts; not
   the whole catalogue.)
2. **Engine owns the FULL effect lifecycle** — sources, durations,
   concentration, repeated saves, stacking, expiry all live in the reducer;
   codex only chooses actions. Deterministic, replayable, testable.
3. **AoE: EXACT TEMPLATES + PREVIEW** — engine computes affected cells per
   SRD geometry with a visual preview before confirm. Owner addendum,
   verbatim intent: sphere centers are placeable at different points in/on a
   square (grid intersections) to catch the most enemies, and a radius that
   touches any part of a square affects the creature in it — double-check
   community common practice; verify wording against the repo's bundled SRD
   grid rules when the increment is specced. The preview should show
   coverage as the center is dragged.
4. **Reactions: STANDING POLICIES + PROMPT ON AMBIGUITY** — per-PC defaults
   (e.g. always-OA, ask-for-Shield); pause only when the policy doesn't
   decide.
5. **Death saves: ENGINE ROLLS, RESULT HIDDEN FROM PLAYERS BY DEFAULT** —
   auto-rolled on the downed PC's turn; the DM projection sees the result,
   the player view does not. All monsters still die at 0 (D314.8); statblock
   carries a death-saves flag for later named monsters.
6. **Multi-PC input: ONE PC AT A TIME IN INITIATIVE ORDER** — the board
   highlights the active PC; no party-planner queue.
7. **Monster turns: CODEX PLANS A ROUND AT ONCE** — one codex call per round
   produces all monster intents; the engine executes and re-consults only
   when a plan is invalidated. (Latency control chosen over per-turn calls.)
8. **ADJUDICATED overrides: AUTO-APPLY, PAUSE + HIGHLIGHT** — override lands
   immediately, play continues, the log and board flag it loudly; owner can
   interrupt/undo.
9. **Undo vs DM memory: REVISION-HISTORY IN CONTEXT** — one codex session
   keeps a visible revision history; undone branches stay in context marked
   void.
10. **Autosave: EVERY REDUCER REVISION, INCLUDING PENDING REQUESTS** —
    event-sourced with RNG state and the codex session id; resume lands
    mid-round exactly; undo and ruling 9's history fall out of the same
    store.
11. **DM controls: SEPARATE LOCAL DM WINDOW** — second browser window with
    the full DM projection (this is also where hidden death-save results and
    ADJUDICATED highlights surface); the player view carries no DM chrome.
12. **Encounter artifact: COMPLETE PACKAGE, SAVED AS FIXTURE** — roster +
    map + placement + terrain + fog + tactics notes as one reviewable JSON;
    approval commits it so bugs reproduce. Refines D314.5, which is
    hereby amended (generated AND persisted).
13. **Difficulty: OWNER CHOOSES PER PROMPT** — a parameter of each
    generation request, not a fixed target.
14. **Art: DRAWN/PROCEDURAL WITH CLEAN LICENSING preferred** — owner is
    unsure of AI-image access; supervisor to survey CC0/CC-BY sets (e.g.
    Kenney CC0 tiles, game-icons.net CC-BY) and present candidates. Bundled
    assets must pass D59 for the public repo.
15. **Validation-mode citations: STRUCTURED FIELDS + SHORT EXPLANATION** —
    machine fields (rule id + SRD source locator) plus one human sentence
    per line; mineable by the soak program and readable by eye.
16. **Telemetry: FULL DETERMINISTIC REPLAY from the first playtest** —
    events, RNG state, per-controller transcripts, prompts/responses,
    latency, token counts.
17. **Soak fleet: MANY PARALLEL TABLES, CONTINUOUS.** The owner challenged
    and corrected the supervisor's premise: "gates need a quiet machine" is
    evidence about GATES under CPU-heavy codex lanes, not about API-bound
    table sessions. Tables run around the clock; gates keep their usual lock
    windows; latency samples get a load-level tag.
18. **DM bridge: FULL DISCORD-READY ENVELOPES NOW** — command/projection
    schemas designed against Discord's actual constraints (interaction
    tokens, message limits) before the dossier ruling, so no rewrite either
    way.
19. **Walkthrough engine/spec reconciliation: QUEUED LANE, AFTER VTT
    increments** — the same-day finding (engine zod schema rejects all 12
    rich mutt specs, pre-existing) waits; specs are committed and stable.

Scope note: rulings 1-3 and 5-12 are binding inputs to the phase-2 increment
map amendment D314 already requires before increment 3 dispatches.

## D314 — OWNER: brainstorm-round rulings — the skirmish, all-AI tables, and the queue (2026-08-19)

Collaborative brainstorm (Claude 15 candidates + codex 15, blind, collated to
20) answered one at a time. Rulings:

1. **First playtest = skirmish**: 3-4 PCs vs 4-6 monsters, one room, fight to
   the finish (~3-5 rounds).
2. **Owner plays from the player projection** (fog/hidden HP concealed);
   codex alone holds DM secrets. The presentation view becomes the owner's
   main screen.
3. **PCs = the D260 level-7 SRD reference party.**
4. **Monsters: bundled SRD 5.2.1 starter set, CR ¼–3** (~8-12 classics),
   decoded from the repo SRD text. CC-BY, shippable.
5. **Encounter authoring: the codex DM generates the encounter from a prompt;
   owner approves.** (Not a setup form, not a fixture.)
6. **Action economy: FULL KIT including spells** in session one — attack
   rolls, saves, areas, slots, Dash/Disengage/Dodge, reactions.
7. **Conditions: the full SRD condition list mechanically enforced**,
   including exhaustion levels.
8. **Death: PCs get full death-save/stabilization/massive-damage rules;
   ordinary monsters die at 0 HP.**
9. **Unmodeled rules: the codex DM adjudicates, tagged ADJUDICATED** in the
   combat log with reasoning; invented numbers enter engine state only as
   explicit DM overrides, never silently.
10. **DM autonomy: fully autonomous between PC turns**; owner can interrupt
    and undo via DM controls.
11. **Narration: four selectable voices** — cinematic with visible rolls,
    terse tactical, rules-explicit, and a terse rule-citing validation mode
    for engine testing.
12. **Autosave required** for the first session (pulls D260.3 into scope);
    codex DM session id persists with the snapshot so resume restores the DM.
13. **Post-playtest direction: supervised all-AI tables.** AI plays DM and
    PCs; tables run as self-play soaks; the supervisor mines logs for bugs
    and improvements without human intervention. Plus a model/effort study:
    sweep gpt-5.6 luna/terra/sol effort levels, then rate sol vs Fable vs
    Opus on high effort for speed vs quality — thorough enough to maybe build
    a luna low/medium complexity classifier that routes per-decision. Also:
    write a skill backed by a KB for running D&D DM/PC interactions
    intelligently. This replaces D262.2's DPR-sim-UI-first ordering.
14. **Discord: undecided — owner needs a full decision dossier** (concrete
    flows, worked examples, architecture, effort/cost per shape) before
    ruling. Dossier is a queued deliverable.
15. **Sim spatial merge-back: after all-AI tables run.**
16. **Visual bar: THEMED before the owner plays** — token portraits, map
    textures, fog styling are an increment before the first session.
17. **Mutation campaign: one more kill wave on the four hotspots**
    (attack-profiles 105, srd-subclass-content 111, srd-subclasses 104,
    skill-grants 46), then the campaign pauses.
18. **Order-dependence repair: parallel background lane**; official gate
    stays the ordered run meanwhile.
19. **v1 review + deploy: formally deferred behind the VTT** (D266 gate
    parked; preview stays up).
20. **Stragglers: finish all three now** — walkthrough specs 11-12, s7
    findings doc merge, trial-idx5 merge gate.

Scope note: rulings 6, 7, 8, 12, 16 substantially grow the playable target
beyond the phase-2 plan's increments 3-5 (spell system, full conditions,
death saves, autosave, theming, DM-generated encounters, player projection
as primary view). The phase-2 plan gets an amended increment map through the
consensus loop before increment 3 dispatches.

## D313 — OWNER: playable target — owner plays the PCs, codex CLI runs as the DM (2026-08-19)

The owner wants to play the PCs in the VTT with the codex CLI app running as
the DM. Clarified by AskUserQuestion, owner's selections:

1. **DM scope: monsters + narration.** Codex controls every enemy tactically
   AND narrates — scene descriptions, fog reveals, flavor in the combat log.
   Rules stay engine-enforced (narration never adjudicates numbers).
2. **Bridge: local bridge process.** A node script on localhost that the
   browser talks to and that drives codex CLI (session resume across turns).
   Zero cloud, zero accounts. This refines D312.3's "runs entirely in the DM's
   browser": one local companion process is in bounds; the encounter authority
   stays in the browser.
3. **DM vision: full DM projection.** The codex DM sees fog-hidden tokens and
   all state — it IS the DM. (Player-side agent controllers keep filtered
   projections per the phase-2 plan.)
4. **Sequencing: plan order.** Increments 2–5 land as approved, then the DM
   bridge is increment 6. No thin-slice reorder.

## D312 — OWNER: the loop moves the VTT forward (2026-08-19)

The supervision loop's forward thread is now the VTT. Rulings, verbatim intent:

1. The VTT is a **superset of the rules engine used by the sim** — one engine,
   not a fork. It adds what the sim lacks, movement modelling first; if the
   movement mechanics work out, they may be merged back into the sim.
2. **Pluggable controllers**: any enemy or any PC can be driven by (a) a code
   algorithm, (b) a codex AI agent, or (c) a human. The controller boundary is
   an interface from day one.
3. **Draft 1 runs entirely in the DM's browser** and is screen-shared. No
   multi-browser requirement for v1.
4. **Provision in the code** — seams, not implementations — for player
   browsers in later versions: showing the map, moving their own characters,
   making attacks. (The existing transport interface + RelayTransport seam in
   wt/vtt phase 1 satisfies the transport half of this.)

D260.8/D260.2 fog rules and the phase-2 negative scope (no cloud accounts, no
voice/video, no hosted asset library; rules automation IN bounds) stand.
Supersedes D262.2's ordering (DPR sim UI before VTT phase 2): VTT phase 2 is
now the active forward thread; D262.2's lane-priority clause is void, the rest
of D262 stands.

Same tick (housekeeping, executed): all done `dnd-*` worktrees deleted with
their branches — 8 merged to main (dracres, grantper, grantskill, minors,
mutspeed, ruleskill, sgorphan, sheetkill), 7 verified fully contained in
wt/simcore (4 bench worktrees, lane-b, lane-c, lane-inc5).

## D311 — OWNER: fix campaign scope is the top-12 files; minors first, then owner v1 review (2026-08-19)

From the D310 triage (1,013 real gaps): the fix wave covers the **top-12
hotspot files (~870 survivors)** in one wave of pattern-driven test lanes,
guided by the triage doc's kill shapes; re-verify per shard via D308 --rerun.
Declined: grants-cluster-only, all-1,013. Same session: the three D303
journey minors get a fix lane NOW; the owner does their local v1 review
(D266 gate) after the minors land — before the fix campaign completes.

## D310 — OWNER: survivor campaign is triage-first (2026-08-18)

Before any D280 survivor-fix lanes dispatch, one triage lane classifies the
full merged survivor list (real test gap / equivalent mutant / low-value)
with per-file counts; the owner rules on fix scope from that report.
Declined: straight-to-hotspots, exhaustive-everything. Also ruled the same
session: main→wt/simcore syncs may run autonomously (gated, conflicts stop);
the threads-vs-forks pool A/B stays queued for an idle window.

## D309 — OWNER: stranger journey and survivor fixes interleave (2026-08-18)

Amends D307's sequencing: once the inc4 merge gate is green, the D303
stranger journey runs WHILE D280 survivor-fix lanes work the hotspot files
in parallel worktrees — neither waits for the other. Owner picked
"Interleave" over journey-first and fixes-first.

## D308 — OWNER: static mutants on for full audits, off for iteration re-runs (2026-08-18)

Owner's words: "statics on for full audits, off for iteration re-runs."
Full D280 campaign runs (fresh shard sweeps) keep static mutants enabled —
they carried ~11% of survivors found (63 of 562 across shards 1–2),
including module-level regex and error-string gaps. Fix-verify re-runs of a
shard enable ignoreStatic plus the per-shard incremental cache, and must
report the skipped static count as unmeasured, never as covered. Basis:
statics are ~23% of mutants and ~97% of shard runtime (shard-003 planner).

## D307 — OWNER: stranger journey runs after the full queue lands (2026-08-18)

The D303 fresh stranger journey (final pre-approval walkthrough) waits
until homebrew v3 ui_hidden entries and D278 increment 4 are merged, so
one walkthrough covers everything. The approval gate moves later; interim
merges get spot-checks only.

## D306 — OWNER: per-worker pre-seeded image lane approved, next wave (2026-08-18)

The test-scaffolding cost (476k seed INSERTs + per-test schema DDL) may
be attacked with a per-worker pre-seeded database image cloned per test.
Constraints: opt-in helper path; seed, migration, digest, and corruption
tests stay on the fresh-DDL path; image-equivalence provable.

## D305 — OWNER: D280 mutation lanes take the box after the DB-perf trials (2026-08-18)

Once the three trial lanes (idx5, builders, relgrowth) drain and merge,
the next dispatch is the D280 leaf mutation tests + Stryker sharding
tooling, ahead of inc5→simcore round 24, D278 increment 4, and homebrew
v3.

## D304 — OWNER: real index migration mechanism before any index lands (2026-08-18)

Wipe-and-rebuild of persisted images that fail the schema signature is
NOT the path, despite D60. A proper additive-index migration step in the
database lifecycle must exist before any CREATE INDEX changes schema.sql.
The mechanism is needed eventually anyway; build it now. Index trial
evidence may still be gathered without landing schema changes.

## D303 — OWNER: full SRD corpus repair; staged re-review; mutation lanes next wave (2026-08-17)

Corpus audit verdict (read-only lane; structural catalogs intact, prose
not): Telekinesis genuinely truncated at full:10720 /
spell-descriptions.txt:8360; two slice losses in
multiclass-entry-grants.txt (:108, :174); 601 PDF line-break hyphens
preserved into 259/339 user-facing spell descriptions. Rulings:
(1) **Full repair** — supervisor fetched the official PDF (SHA-256
matches SOURCE.md provenance, verified by supervisor); repair lane
recovers the Telekinesis tail, fixes both slices, de-hyphenates via a
reviewable script, updates SOURCE.md hashes and its policy wording, and
corrects kennel.json's wrong Tome note. (2) **Re-review is staged**:
targeted re-verify of the five D286 MAJOR scenarios once fixes gate,
THEN a full fresh stranger journey as the final pre-approval step after
minors land. (3) **Mutation lanes (D280 leaf tests + sharding tooling)
dispatch in the next refan wave**, after the merge train gates.

**F20 — supervisor misreport, corrected.** My earlier surfaced finding
"bundled SRD text truncated mid-sentence at line 4507 (Pact of the Tome)
— possible corpus defect" was WRONG in its specifics: the text continues
at canonical lines 4438-4453 in the other column of the same printed
page; raw line order misled me, and kennel.json:61,239 propagated the
error as "never resumes"/unverifiable. The audit I dispatched on the
back of that wrong specific did, however, find the real defects above.
The kennel.json note is being corrected by the repair lane.

## D302 — OWNER: merge-train shape, wave cadence, all D286 minors fixed now (2026-08-17)

Four rulings: (1) **Batch gate** — the queued lane branches merge with
per-merge tsc + narrow tests, then ONE solo quiet full suite gates the
whole train; if red, bisect the merge commits. (2) **Drain → merge →
refan** — when the current wave finishes, quiet the box, run the train
plus the owed D283/D284 gates, then dispatch the next wave. (3) **All 11
D286 minor findings are fixed now** (not deferred), including the
cold-open ~4.4s and the 2014→2024 bridge notes; fix lanes dispatched
(minors sweep, planner-mobile M-M1, cold-open perf, bridge notes).
(4) **The train gates on vitest 3**; the vitest-4 upgrade (D300) merges
last with its own gate — the instrument never changes mid-train.

## D301 — SUPERVISOR-VERIFIED: Kennel max-assemblable cantrips = 19, by source (2026-08-17)

Owner directed: "Check yourself. Separate cantrips from classes with
cantrips from other sources (feats, species, backgrounds)." Verified
independently from docs/srd/source (not the spec lane's claim):

- **From classes: 15.** Class-table cantrip columns: Sorcerer L3 = 4,
  Bard L1 = 2, Cleric L1 = 3, Druid L1 = 2, Warlock L1 = 2 (13), plus
  Divine Order Thaumaturge +1 Cleric cantrip (full corpus :2309) and
  Primal Order Magician +1 Druid cantrip (:2562). Multiclass keeps
  per-class counts (multiclassing.txt:66-69).
- **From feats: 4.** Magic Initiate grants two cantrips (feats.txt),
  Repeatable with a different list each time — Wizard (via Sage) +
  Druid (via Human Versatile) = 4.
- **From species directly: 0** (Human Versatile supplies a feat ROUTE,
  not a cantrip). **From backgrounds directly: 0** (Sage likewise).

All 19 names sit on their claimed SRD lists (each checked, incl. Message
and Resistance under the Druid "Cantrips (Level 0)" heading, lines 29/32);
19 distinct. This is the verification D272 required at authoring; the
kennel.json assertion "EXACTLY 19" is CONFIRMED. D251.2's "exactly 18"
stays superseded (per D272).

## D300 — OWNER: vitest 4 upgrade approved conditional on clean assessment (2026-08-17)

The `onTaskUpdate` false-failure class (exit 1 with 0 test failures under
load) is birpc's hardcoded 60s RPC timeout; vitest 3.x exposes no setting
and upstream's fix (timeout disabled, PR #8297) ships only in vitest 4.
Owner ruled: **upgrade to vitest 4 if the read-only assessment lane shows
small blast radius and Stryker/simcore-patch compatibility**; if blocked,
return to the owner (patch-package of 3.2.7 was NOT approved). Until the
upgrade lands and is gated, the parallel-suite protocol stands: parallel
runs advisory only, official gates solo-quiet. Also ruled the same
session: plan files stay UNTRACKED (reboot-safe copies to .tmp/ instead).

## D299 — OWNER: content needs a ui-hidden marking (2026-08-17)

Owner, in the D298 context of lightweight test content: "We need a way to
mark things as ui hidden." Taken for now (reversible default, D7): a
closed visibility discriminant on homebrew/bundled catalog content —
`visibility: 'listed' | 'ui_hidden'` — where `ui_hidden` entries are
excluded from every user-facing browse/pick surface but remain fully
loadable by tests, the simulator, and direct programmatic access; the
absence of a value means `listed` only at the IMPORT boundary (stored rows
always carry the explicit value). Seam: the discriminant lives with the
content schema so an unhandled visibility arm fails tsc at each listing
site. Cost to flip: rename/widen the union; no data loss. The eight D296
entries land as `ui_hidden` first; flipping one to `listed` is a
deliberate later act.

## D298 — OWNER: v3 entries are lightweight test content, NOT Veteran-grade dossiers (2026-08-17)

Clarifying D296/D297 scope: the intent of adopting all eight is "more types
of non-copyrighted mechanics in the public repo so we can test. They don't
need the attention that we gave to the Barbed Court and the Veteran."
So: compact catalog entries + sim models sufficient to exercise each
mechanic type (bonded riders, control locks, persistent riders,
self-Inspiration, first-turn primitives, form packages, crit-range
expansion, bounded pools) — no full-ceremony prose dossiers, no
docx-fidelity pass. Consequence for D297(2): Cutting Chorus SHIPS for
testing without a net-DPR claim; the d4-derived figure lands whenever d4
expansion produces it, and only the CLAIM was ever blocked on it.

## D297 — OWNER: homebrew v3 sub-rulings — both Ambush chassis; Chorus cost from d4; cleric slot stays open (2026-08-17)

Three sub-rulings completing D296: (1) Ambush Primitive ships on **both**
chassis — Vanward Conclave (Ranger) and Cold Open (Rogue); Cold Open's
unpreserved measured delta must be re-run before its dossier cites numbers.
(2) Cutting Chorus's displaced-ally opportunity cost is **re-derived from
the d4 scorecard builds** (party-average attacks over the 89-build set),
NOT the provisional 65%/1d8+3 proxy — the Chorus dossier's net-DPR figure
is therefore blocked behind d4 expansion (D292); the mechanic's authoring
can proceed, its net claim cannot. (3) The cleric damage slot **stays
open** — a recorded open item, no commissioned candidates.

## D296 — OWNER: ALL EIGHT homebrew v3 entries adopted for full authoring (2026-08-17)

Presented with the reconstructed v3 packet (eight entries, sim-validated per
tools/sim/2026-08-12-homebrew-validation-plan.md, measured numbers the
deliverable per the park-time record), the owner selected **all eight**:
Long Grudge, Anchor Point, Patient Volley, Cutting Chorus, Ambush Primitive
(Vanward/Cold Open), Broken Tooth, Cutting Momentum, Broken Tempo. Each
advances to a full prose dossier + app content behind the v1 gates (D292).
Entries that measured over claim (Anchor Point, Patient Volley, Vanward,
Broken Tooth, Broken Tempo) are adopted as MEASURED — authoring works from
the simulated numbers, not the stale claims. Open sub-rulings still owed:
Ambush chassis cardinality, Cutting Chorus ally-attack opportunity cost,
the named-open cleric damage slot.

## D295 — OWNER: deploy configs stay placeholder; mobile-viewport testing confirmed (2026-08-17)

Deploy identity ruled: **"Placeholder until later"** — prepared wrangler
configs carry PROJECT_NAME_TBD; the name/domain decision waits until
deploy is near; zero outward surface. Same-day addendum to D293, owner's
words: **"Maybe try with mobile sized viewport testing as well as full
desktop"** — emulated mobile-viewport runs join the browser suites and
the D286 self-review explicitly, alongside full desktop.

## D294 — OWNER: all MAJOR self-review findings auto-block v1 (2026-08-17)

Triage policy ruled: **"All MAJOR auto-block."** Any MAJOR-severity
finding from the D286 self-review or future supervisor reviews joins the
v1 blocker list immediately, without awaiting owner triage — the D270
precedent generalized. Severity assignment follows the sweep taxonomy's
existing MAJOR bar (wrong number, silent unknown, dead end, data-integrity
lie); minor/polish findings queue normally. The owner sees the blocker
list grow in reports rather than gating each addition. Declined:
wrong-numbers-only auto-block (supervisor recommendation),
everything-awaits-triage.

## D293 — OWNER: desktop tested; best-effort mobile (2026-08-17)

Browser matrix ruled in the owner's words: **"Desktop tested, but do your
best to make it work for mobile."** Desktop Chromium/Firefox/Edge are the
tested matrix; mobile (iOS Safari and Android alike) is a genuine
engineering target, not a written-off tier — responsive layouts, touch
interactions, storage-pressure resilience, and the capability probe's
graceful paths all get real effort — but mobile carries no tested claim
until device evidence exists. Practical consequences: mobile-viewport
Playwright runs (emulated) join the suites where cheap; OPFS/probe
fallbacks stay honest; no real-device gate blocks v1.

## D292 — OWNER: homebrew v3 and d4 scorecard reactivate; party stays parked (2026-08-17)

Parked-workstream ruling: **homebrew v3 adopt/author decisions** return
to the question queue, and the **d4 scorecard** roadmap resumes
(ceiling-mode comparison basis, extending toward all 89 builds — now with
D291's ±1% bar as the fidelity line). **wt/party sync stays parked.**
Both reactivated streams run behind the v1 gates in priority.

## D291 — OWNER: docx fidelity bar is ±1% DPR per build (2026-08-17)

"Tracks the DOCX" defined numerically: **aggregate damage-per-round
within ±1% per build** against the docx reference; individual mechanics
may drift provided each build's total holds the band. Sharpens D262's
fidelity-ceiling acceptance into a pass/fail line for the simulator's
fidelity checks. Declined: exact-where-modeled-with-gap-list (supervisor
recommendation), ±5%, direction-only.

## D290 — OWNER: licensing trio — CC-BY docs, anonymous externals, redact pastes (2026-08-17)

Three publishing rulings: (1) our original public docs (reports, build
analyses, design docs) are **CC-BY-4.0**, matching the SRD family and the
existing docs/design precedent; (2) public Board reports do **NOT
identify** the external d4 builds used for fidelity checking — methodology
described, sources anonymous (stricter than the link-don't-quote
recommendation); (3) issue reporters pasting non-redistributable rules
text: **issue template warns; maintainers redact on sight; the report is
kept.**

## D289 — OWNER: no cadence promise during pre-alpha (2026-08-17)

Release cadence ruled: **"No promise in pre-alpha."** Gated increments
ship when ready; nothing is stated publicly about rhythm; the update
prompt carries a changelog line only. Declined: publicly-stated
ready-when-gated, scheduled+hotfixes, rare big releases.

## D288 — OWNER: roll forward only (2026-08-17)

Deployed-build recovery ruled: **"Roll forward only."** An older bundle is
never republished (service-worker skew makes old-code/new-schema pairings
unsafe); a bad build is superseded by an emergency repair build.
Migrations carry no downgrade-safety obligation. Declined:
downgrade-safe migrations, emergency stop screen, pull-the-build.

## D287 — OWNER: telemetry is Cloudflare cookieless aggregates only (2026-08-17)

Public-site telemetry ruled: **Cloudflare's built-in cookieless
page/error aggregates only** — no client-side beacon code ships in the
bundle, no character content, nothing per-user, no cookies. Declined:
none-at-all, opt-in diagnostics, opt-out analytics.

## D286 — OWNER: supervisor performs the local review itself; deploy stays gated (2026-08-17)

Asked what D266 approval consists of, the owner ruled: **"I don't have
time to do it now. Do it yourself and just don't deploy."** The
supervisor walks the D285 stranger journey (and the S7-informed sheet
checks) against the locally served production build itself, documents
findings with screenshots/numbers, and keeps the record ready for the
owner. The DEPLOY remains a HARD-STOP outward action awaiting explicit
owner approval — this ruling transfers the review labor, not the launch
authority.

## D285 — OWNER: stranger spec persona and mandatory misstep recoveries (2026-08-17)

The D265 blocking stranger spec gets its content: persona is a
**5e-2014 knower who does not know the 2024 rules**, walking a **Cleric**
1->5 (prepared casting + domain machinery on the guided path). The journey
must DEMONSTRATE RECOVERY from all four: (1) duplicate skill/Expertise
pick refused clearly at selection time (the S7-04 shape); (2) reload
mid-level-up with nothing lost and an obvious resume point; (3) double
import of their own backup detected without duplicates; (4) a 2014-rules
expectation (racial ASIs, level-1 subclass) met with UI that shows where
those went (background bonuses, level-3 subclass) instead of a dead end.
Plus the D265 spine: cold profile, choices-and-sources every level,
export -> re-import into a fresh profile with identical sheet numbers.

## D284 — OWNER: second tab opens READ-ONLY (2026-08-17)

Multi-tab contract ruled: **"Read-only second tab."** Today a second
tab's OPFS SAH pool install fails with a raw error (accidental exclusive
lock). At v1: the second tab detects the conflict and opens a READ-ONLY
view — a snapshot of the database image with a persistent banner naming
the owning tab; all writes happen only in the owner. Build: snapshot
channel (BroadcastChannel or export-image handoff) + staleness handling
(banner shows snapshot age; refresh action re-requests). Takeover when
the owning tab is truly gone remains available via the existing
stale-handle path. Declined: friendly refusal only (supervisor
recommendation), full synchronized tabs, detect+warn.

## D283 — OWNER: cold-boot verification stamp (2026-08-17)

Cold-boot trade ruled: **"Verification stamp."** The full integrity suite
(schema signature, quick_check, FK check, catalog digest) runs on first
boot and whenever the stamp is invalid; the stamp persists (app
version/build id + database image digest) and while it matches, boot
skips the ~3s structure checks and ~1s digest for a ~1s warm-equivalent
start. A corrupted-but-stamped image is caught later rather than at boot
— accepted. Implementation notes: the stamp must bind to BOTH the build
(schema may change per release) and the image bytes (digest already
computed for export paths); any write invalidates lazily; stamp lives
beside the image in OPFS. Declined: optimize-checks-directly (supervisor
recommendation), read-only fast open, leave-for-v1.

## D282 — OWNER: ordinary inputs judge killability; hardening stays at entries (2026-08-17)

The long-standing hostility question (Q2) ruled: **"Ordinary + entry
hardening."** Killability, reachability, and mutant equivalence are judged
on ordinary constructible inputs — hostile Proxy/getter/intrinsic
observations delivered through mocked internal seams do NOT count. The
seven wave-3 contested equivalence claims STAND; D281's unreachable-arm
deletions stand. The rounds-17-22 snapshot-once/captured-intrinsics
posture CONTINUES at public entry points (defending against accidental
exotic objects from in-bundle bugs — D263's accidents-yes boundary);
interior code trusts the structured-clone RPC boundary, which strips
getters/Proxies/prototypes by construction. Prototype-injection and
doMock test seams remain legitimate testing technique. Declined:
harden-until-moot everywhere, fully-out-of-scope (freezing entry
hardening), hostile-counts.

## D281 — OWNER: delete EVERYTHING unreachable, including defensive arms (2026-08-17)

NoCoverage resolution ruled: **"Delete everything unreachable."** If no
test can reach a code path through ordinary inputs, it is deleted — the
PRE-ALPHA bias applied without the keep-and-justify carve-out the
supervisor recommended. Defensive arms guarding future data (e.g. the
contracts sameSourceRef weapon/character arms unreachable through any
mintable source) are deleted too and re-added when the data that reaches
them arrives; unreachable-today is unrepresentable-today, and the type
system should say so. Reachable-but-untested code gets tests. Q2 note:
this composes with the hostile-input question — "reachable" means
ordinary constructible inputs, consistent with the campaign's equivalence
convention pending that ruling.

## D280 — OWNER: the v1 mutation bar is WHOLE-src/ zero-unexplained (2026-08-17)

Ruled: **"Whole src/ zero unexplained"** — the largest option, knowingly.
Before v1, EVERY mutant across the entire app source (not just
src/simulation) must be Killed, CompileError, proven-equivalent with a
written proof, or a member of an explicitly excluded category (regex
literals per the earlier ruling; message prose per D273/D274 as amended by
D278's structure); NoCoverage mutants count as unexplained until either
covered by tests or explicitly justified. This extends the campaign to
catalog, commands, grants, sharing, rules, authoring, db, worker, builder,
ui and the rest — a substantially larger undertaking than the simulation
campaign, now on the v1 critical path per D279. Sequencing note: runs the
same wave machinery (full run -> cluster -> near-miss lanes -> verify),
and the D278 migration rewrites many guard sites first, so mutation waves
per module follow that module's migration.

## D279 — OWNER: migration, mutation bar, AND simcore merge all block v1 (2026-08-17)

Ruled: **"All three block."** The v1 gate now comprises: the 12+1
walkthrough/stranger specs (D264/D265), the five S7 repairs (D270), the
completed D278 refusal/error migration (D277 sequences repairs after it),
an explicit mutation-score bar (to be defined — next ruling), and
wt/simcore's round-24 + two quiet rounds + merge to main (D271). Declined:
migration-only blocking (supervisor recommendation), none, migration+bar.

## D278 — OWNER: unified Result + shared refusal union is THE precedent (2026-08-17)

After the why-does-attunement-throw walkthrough (sqlite transaction() rolls
back on throw — the mechanical reason; semantic refusals riding the error
channel — the habit), ruled: **"Unified Result + shared union."** The single
precedent everywhere:
- EXPECTED refusals (slots full, revision conflict, archived, level-up
  refusals, ...) are RETURNED: `Outcome<T> = {kind:'ok'; value} |
  {kind:'refused'; refusal: Refusal}`, with `Refusal` one shared
  discriminated union in one module (src/refusals/) compiled into BOTH the
  worker and the UI — single source of truth by shared compilation, no
  copying; exhaustive switches on both sides (D269a). A small wire-version
  field covers PWA update-window skew.
- THROWS are reserved for DEFECTS (bugs, corrupt data, forged inputs) —
  D274 tagged classes, translated to the six generic RpcErrorCodes,
  rendered as a generic failure surface.
- Rollback: one internal helper lets a command abort its transaction on
  refusal without exposing a throw past its handler.
- The D276/D277 migration lanes implement this in the same pass:
  each throw site is classified refusal->Result vs defect->tagged-throw.
Declined: curated translation of thrown classes (smallest diff, kept the
semantic wrongness), internal-only prose, stable class-name protocol.

## D277 — OWNER: error migration completes BEFORE the S7 repairs (2026-08-17)

Start-order ruling for the three ready workstreams: **"Migrate first"** —
the D276 tagged-error migration proceeds module-by-module to completion,
so the five S7 v1-blocking repairs (D270) are then built on the final
error taxonomy rather than repairing guards that migration would rewrite.
Wave-5 increment 5 (exhaustive-switch pass) slots into spare capacity.
Options declined: S7-first-combined-where-overlapping (supervisor
recommendation), S7 strictly first, all-parallel per-module judgment.

## D276 — OWNER: migrate EVERYWHERE to tagged error classes now (2026-08-17)

After the four-option deep dive, ruled: **"migrate everywhere to option
a."** D274's tagged-class pattern (literal `name`, structured params,
message derived in one place; class+params asserted per guard, exact
message once per class) is to be applied across the whole codebase, not
just src/simulation, starting now rather than after wave 5. Sequencing to
avoid collisions: main-repo src/ modules migrate in parallel lanes
immediately; src/simulation migrates after wave-5 increment 1 lands (same
files). Also ruled: benchmark experiment — temp worktrees for Deno
(with/without type checking), Bun+typia, and plain Bun, measuring speed
and effectiveness against the current Node toolchain; report with real
numbers.

## D275 — OWNER: do not post the #6150 upstream comment (2026-08-17)

Ruled "Don't post." The stryker-js #6150 confirmation comment (our vitest
3.2.7 repro, misreport numbers, working patch) stays local. The
auto-applied runner patch (scripts/patch-stryker-vitest-runner.mjs, pinned
9.6.1) remains our fix; revisit only if the owner re-opens it.

## D274 — OWNER: tagged error classes with derived messages; supersedes D273 (2026-08-16)

The owner flagged bare `throw new TypeError('prose')` as a smell and asked
for community research; ruled for the recommendation: **hand-rolled tagged
error classes, zero dependencies** — literal `name` discriminant (the T4
pattern: literal TYPE so a ""-mutant fails tsc), structured readonly
params, message DERIVED from params in the constructor (one place). The
contract: tests assert class + params at every guard; the exact formatted
message is asserted ONCE per error class via its formatter. Expected
refusals (the `string | null` failure-reason returns, status unions)
graduate incrementally to plain discriminated Results per D269(a);
invariant guards keep throwing, but typed. Serves D270's S7-04 fix
(human-readable refusals from structured fields). Migration is its own
workstream sequenced after wave 5. Declined: Result libraries
(neverthrow/Effect — dependency weight), exact-message assertions on bare
TypeErrors, status quo.

## D273 — OWNER (superseded same day by D274): error/refusal message text is NOT contractual (2026-08-16)

Q1 ruled: **"Not contractual."** Diagnostic prose in throws/refusals is not
part of the tested contract — all message-text mutants (~100+ Survived and
NoCoverage StringLiterals on diagnostic sites) are formally out of scope,
and the honest mutation denominator shrinks accordingly. EXISTING message
assertions stay (weakening assertions remains forbidden, and lanes may
still use message identity to distinguish WHICH guard fired — that use is
about guard selection, not message wording); no NEW message-wording
assertions are written. Options declined: load-bearing-only codification
(supervisor recommendation), error-ID codes, fully contractual.

## D272 — OWNER: Kennel spec relaxes to max-assemblable SRD cantrips (2026-08-16)

The Board B Kennel definition carries [Tasha]/[Xanathar]/[2024] cantrips a
public SRD-only fixture cannot commit (D59). Ruled: **"Relax to
max-assemblable"** — author spec 11 with SRD 5.2.1 cantrips only and assert
the count actually reachable from the repo's SRD lists (verified at
authoring), superseding D251.2's "exactly 18". Build skeleton (Human,
custom background, Sorc3/Bard1/Cleric1/Druid1/Warlock1, double Magic
Initiate, D252.6's Tome-if-SRD-verified) unchanged. Options declined: SRD
substitutes keeping exactly-18; names-only non-SRD entries; replacing the
archetype.

## D271 — OWNER: round 24 is a fresh adversarial round over the post-round-23 delta (2026-08-16)

Round 23's CLEAN (quiet 1 of 2) certified a tree that no longer exists —
the mutation campaign landed six production changes since (D267 bounded
counters + five wave-1 type refactors) plus ~15 test files. Ruled: **fresh
adversarial round 24 scoped to those six production changes** (tests-only
commits exempt). If CLEAN it counts as quiet 1 of 2 for the CURRENT tree;
one more quiet round, then the wt/simcore -> main merge. Options declined:
counting the campaign itself as round 24; merging now; holding for wave 5.

## D270 — OWNER: all five S7 MAJOR sheet defects block v1 (2026-08-16)

Presented with the reach analysis (S7-01 Alert/initiative, S7-02 finesse
Str-default, S7-04 duplicate Expertise, all reachable at level 1; S7-05
false-UNKNOWN import warning pulled in-bar by D265; S7-03 crit-range
needing level 3+/homebrew) and four options (split by reach — supervisor
recommendation, all five, disclosure-first, none), the owner ruled: **"All
five block"** — the strict D33 reading. No wrong number ships anywhere:
the next engine lanes are sheet-math repair — initiative as a typed,
sourced additive model (Alert included); weapon-ability selection for
finesse/ranged rows; crit threshold as a sourced character property
consumed by the dice calculator; Expertise sibling-eligibility
recomputation at selection time with a human-readable refusal; import
gap-evaluation scoped to active revisions only. Supersedes the fix-wave
scope question parked since sweep 7 landed.

## D269 — OWNER: type-pattern directives from the 3a-3c walkthrough (2026-08-16)

Three standing directives on how the domain gets typed, from the owner's
responses to the ranked type improvements:
(a) **Exhaustive discriminated switches are the house pattern** — "look for
more solutions like this elsewhere." Where a shape is a closed set of
alternatives, model it as a discriminated union and consume it with a switch
tsc checks exhaustively. Corollary ruling: Failed/Success damage should NOT
have separate shape definitions — one shared Damage signature type, passed
into whichever arm calls for it; hunt for other duplicate near-identical
shapes and unify them.
(b) **Successful type-fix patterns are KB material** — keep a list in the KB
so future sessions learn from worked examples, and consult it for new
opportunities whenever it grows.
(c) **Stateful domain values get a class with domain methods** ("if this was
Java, a class with increment and decrement") — raw branded numbers are for
immutable quantities; anything that changes over time gets an
invariant-owning object like ResourceRecoverySession's bounded counter.

## D268 — OWNER: save DC is always the formula 8 + PB + ability modifier (2026-08-16)

Responding to the proposed `absent | fixed{dc} | unavailable` union for save
DCs (item 3d): **"it is always a number, we may not know the result yet, but
we know it is 8 + PB + ability modifier. We can replace the parts of the
formula later on if we really don't have access to them yet."** Binding
shape: a save DC is modeled as the structured formula (base 8 + proficiency
bonus + spellcasting-ability modifier) whose PARTS may be unresolved, never
as an absent/unavailable state. Resolution substitutes the parts when sheet
data supplies them. Supersedes the union-arms proposal.

## D267 — OWNER: resource pools are bounded counters, 0..sheet-derived maximum (2026-08-16)

During the 2c (evidence-identity) walkthrough the owner ruled on the pool
model: "We need to model the pools as having an upper limit just like spell
slots. Max number is an integer that is calculated based on sheet data.
Minimum is always 0. Can subtract when used (ie rage, sorcery points) can add
any number when appropriate, but the number never exceeds the ceiling."
Binding shape: every consumable resource (Rage uses, sorcery points, Channel
Divinity, spell slots alike) carries a bounded level — floor 0, ceiling an
integer derived from sheet data — with spend subtracting and recovery adding
**clamped at the ceiling** (RAW: you regain up to your maximum). Supervisor
default pending review (reversible): the level is a minted state object bound
to its pool by reference identity; overspend below 0 THROWS (fail-closed —
insufficient-resource spends are simulator logic errors, not clampable), while
over-recovery CLAMPS (RAW-sanctioned). Replaces the `expendedUnits: unknown`
per-call revalidation seam in recoveredResourceUnits. Queued at the head of
the typing-improvement batch (2b survey).

## D266 — OWNER: no Cloudflare deploy until local is approved; prepare only (2026-08-16)

Asked to reconcile D260.7's future "mirror goes PUBLIC" with the repo
being already world-readable since 2026-08-13 (verified: anonymous API,
private:false). Ruled: **"no cloudflare deploy until i approve local.
prepare for it but don't do it."** The publication event still ahead is
the SITE deploy; it is gated on the owner approving the locally served
build first. Deploy preparation (build output, staged wrangler configs)
continues; the deploy itself is a HARD STOP outward-facing action, in
line with D121/D127/D128. The repo's current public state, including
.claude/, was not countermanded and stands as owner-ordered on
2026-08-13.

## D265 — OWNER: v1 acceptance gains a stranger spec AND an export round trip in every mutt spec (2026-08-16)

The strongest option was chosen explicitly: (1) one BLOCKING stranger
spec joins the 11 mutt walkthroughs — single-class 1→5, cold profile,
choices-and-sources every level, a mid-journey reload, then export →
re-import into a fresh profile with identical sheet numbers; (2) EVERY
mutt spec appends an export→re-import final step after its last
checkpoint. This gives D262.11 (export/import on the v1 bar) its
acceptance-side teeth and puts the bar's own persona inside the gate.
Cost accepted: touches every spec and lengthens every run. Specs lead;
the walkthrough engine implements the step in its own lane (same
sequencing as the three-toggle shape, D260.5).

## D264 — OWNER: mutation testing runs in parallel with other work (2026-08-16)

"This pc has a powerful ryzen 7900x. you can do mutation testing with
recompiling in parallel with other things." Stryker runs (concurrency 6 on
12c/24t) do NOT reserve the machine; dispatches, reviews, and authoring
continue alongside them.

Reconciliation with the one-suite-at-a-time rule, which this does not
repeal: that rule exists because TIMING-SENSITIVE gate suites (full
vitest/Playwright with measured per-test budgets) produce false timeout
reds under load. Mutation testing plus non-suite work is now expressly
fine. If a full gate suite must run while a mutation run is active and it
fails only on known contention-prone timing tests, the existing lesson
applies: discard and re-run on a quiet machine rather than blaming the
lane — never re-pin a budget from a loaded run.

## D263 — OWNER RULINGS: simcore type debt, tamper boundary, loop-state home (2026-08-16)

Three rulings after the reboot recovery and simcore review round 19
(5 High, all reproduced; valid-case controls all held).

1. **Loop working state lives in a durable directory outside git**
   (`~/.claude/loop-scratch/`). The reboot destroyed the tmpfs scratchpad —
   briefs, dispatch logs, and two generated spec-input files survived only
   because workflow journals happen to persist. Briefs, dispatch logs, and
   generated intermediates go there from now on; git/`.claude/` remain the
   durable record of decisions and results, not of working state.

2. **The simcore type debt is repaired file-by-file, then confirmed by one
   more adversarial round before merge.** Context: the lane is runtime-green
   (179 sim tests pass) but `npm run build`'s `tsc -b` — the real merge
   gate — fails with 20 errors across 11 round-N test files. The recorded
   per-round gate line (`tsc -p tsconfig.app.json`) does not typecheck
   tests; supervisor gate error, recorded at full length in the session.
   Per-round file provenance is kept (no consolidation); no tsc exclusion.
   The standing brief's "build OR tsc -p app-config" wording is void — the
   compile gate for a lane with test changes is `tsc -b`.

3. **Tamper-resistance boundary: accidents yes, self-sabotage no.** The sim
   defends against our own future code mutating state by ACCIDENT (deep-freeze
   what we hand out stays), but deliberate in-process attacks — prototype
   reassignment, post-hoc mutation of returned objects — are inside the
   documented caller-trust boundary, same status as round 18's structural-clone
   limit. Round-19 findings 1 and 5 are real under any reading and are fixed
   (an unregistered fold path that returns a number; recovery rows pinned to a
   heading with no digest). Findings 2–4 are documented as boundary, not fixed.
   Reviewers stop earning Highs for in-process self-attacks; the arms race ends.

## D249 — OWNER: UI is designed by Claude first, through a four-stage pipeline (2026-08-14)

Ruling on how UI work is produced, overriding the general "codex implements"
default for UI only:

1. **Claude design skills first.** The official `frontend-design` skill is
   already installed and is the starting point, not an afterthought.
2. **Fable plans** the UI, from several perspectives.
3. **Opus creates** it.
4. **Fable reviews** it, again from several perspectives.
5. **codex `-p sol` is a second reviewer**, explicitly for diversity — a
   different model family sees different failures.

This is a standing authorization for Fable subagents on UI work specifically,
which otherwise require asking first. It does not extend to non-UI work, where
codex remains the implementer. Claude sonnet remains prohibited everywhere.

## D248 — OWNER: fan out into worktrees as far as possible (2026-08-14)

Asked what to do after the R3 and simulation merges. Ruled: **fan out into
worktrees as much as possible**, each worktree proving all tests pass before it
tries to merge back, each with its own database, using workflows where the work
suits them.

**Reconciliation with the one-suite-at-a-time amendment**, which this ruling
does not repeal but does constrain: lanes fan out without limit and run
FOCUSED tests themselves; separate databases remove the shared-fixture
collisions; the supervisor still runs each full suite, and runs them SERIALLY
on a quiet box. Parallelism therefore lives in the work, and serialization
lives only in the timing-sensitive gate. A lane that self-gates a full suite
while another does the same produces false timeouts, and that failure has
already been observed twice.

## D247 — OWNER: a first-landing subsystem is reviewed until clean, with no round cap (2026-08-14)

The three-round review cap does not apply while a subsystem is landing for the
first time. Prompted by the simulation core, whose first review round found
three real defects including a refusal that silently became zero. The reasoning
that governs future cases: early defects set the shape everything later builds
on, so the code that most deserves review attention is exactly the code a round
cap would cut short.

## D246 — OWNER: the simulator's first shippable slice covers attacks, saves and resources (2026-08-14)

Not the narrow weapon-attack-only slice. The first flag-gated release must
carry ordinary attacks, saving-throw damage effects, AND the rounds /
short-rest / long-rest resource budget — because settings that do not change
the result are decoration, and a simulator that cannot model a save is not one
an advanced user can trust.

Cost accepted: longer to reach honestly, and saving-throw evidence is precisely
where the first review round found a defect.

## D245 — OWNER: a number ships only when every gap is provably zero (2026-08-14)

When a character carries a mechanic the simulator cannot source, the result
shows a number ONLY if every excluded mechanic is proved damage-neutral for the
chosen routine. Otherwise it refuses and names the blockers. Rejected both the
partial-number-with-caveats option and whole-result refusal.

This is the strictest honest option and it creates real work: each exclusion
needs a per-mechanic proof of neutrality, not an assumption. It also settles
the review finding that an unsourced save-success clause could be labelled
`none` and contribute zero — under this ruling, zero and unknown are different
values and the second one is not printable.

## F20 — parse boundary accepts unknown enum members in class feature effects (2026-08-14)

Found while reviewing the R3 lane, and verified PRE-EXISTING on `main` — not
introduced by that lane, so it did not block its merge. Executed probes against
`parseSourceCatalogRecord('class', ...)` on `main`:

```
ACCEPTED {"effect_kind":"ability_increase","ability":"luck","amount":1}
ACCEPTED {"effect_kind":"damage_resistance","damage_type":"radiant-ish"}
ACCEPTED {"effect_kind":"extra_attack","weapon_scope":"siege_only"}
```

`ability`, `damage_type` and `weapon_scope` are closed vocabularies in the type
system, and the parse boundary validates them only as text. D235 says a row
conflicting with the declared types must be unstorable at write and must THROW
at read; these three throw at neither.

Belongs to the D235 reader sweep (task #20). The fix is the same shape the R3
lane used for `feature_value_contributions`: validate the discriminated arm
against its closed vocabulary with `isEnumValue`, at the boundary, before the
value reaches a contract that claims it is narrow.

Recorded here rather than left in a lane report because a known-bad that lives
only in a review transcript is indistinguishable from one nobody found.

## D244 — OWNER: the private regression gate is a standalone runner the ritual invokes (2026-08-14)

Follow-up to D239, which made the gate blocking. Asked where it runs. Ruled:
a **separate gate script living in the private repo, pinned to a public SHA**,
invoked as an explicit step of the merge ritual. Rejected wiring it into
`orchestration/merge-to-main.sh` (that would put a private path, which exists
only on this machine, into a public script) and rejected leaving it purely
procedural. The public repo therefore carries no knowledge that the gate
exists; the private repo owns the coupling, which is the same direction D59
already points.

## D243 — OWNER: the simulator's probability core starts now, ahead of its UI (2026-08-14)

The licensing audit blocked reuse of the private engine, so the simulator has
to be rebuilt independently from the bundled SRD. Asked when that starts.
Ruled: **start the probability core now** — before the advanced UI shell and
without waiting for the v1 usability bar. Reasoning that governs: the core is
where the correctness risk actually lives, and it is the part that must be
verifiable against public rules rather than against anything derived. UI
attaches later, to a core already proved.

## D242 — OWNER: unresolved entries get full treatment, source-internal ones get a table (2026-08-14)

Presentation ruling for the remaining errata walkthrough. The 9 UNRESOLVED
entries are walked at the same depth as the accusations, because that is where
the remaining doubt lives and doubt is the thing worth reading. The 12
SOURCE-INTERNAL entries get one line each in a table with a dossier link.
Batches 1–3 (7 retracted, 4 strong, 3 weak) were delivered at full depth.

## D241 — OWNER: a convention is applied completely or not at all (2026-08-14)

The R3 lane branded 33 of 59 identifier fields — every id in `models.ts` plus
the four highest-risk read-model ids — and judged the remaining 26 low-risk.
Asked whether to accept. Ruled: **finish all 59 before merging.** Neither
partial-then-merge nor merge-then-follow-up was accepted.

The principle to carry forward: a half-applied convention is worse than no
convention, because a reader cannot tell whether an unbranded id is
deliberately exempt or merely unfinished. Scope reductions proposed by an
implementer are findings to bring back, not decisions to take.

## D240 — OWNER: the DPR simulator ships as a sheet summary linking to a full page (2026-08-14)

Asked where the advanced-user simulator lives. Ruled **both**: a single
headline DPR number on the character sheet, which links into a dedicated
simulator page carrying the rounds / short-rest / long-rest settings and the
results grid. Discovery beats purity here — a page nobody finds is not an
advanced feature, it is a hidden one. Cost accepted: two surfaces to keep
consistent, so the sheet summary must be *derived from* the same computation
the page runs, never a second implementation of it. Supersedes nothing; this
is the binding target for the design doc in `wt/simdoc`.

## D239 — OWNER: the private regression gate BLOCKS, and re-pins are explicit (2026-08-14)

Asked what happens when the private harness gate fails because SRD content
legitimately changed. Ruled: **block the merge**, and require an explicit
re-pin carrying a justification comment naming what changed and why. Rejected
the softer options (classify-then-block-only-on-engine-drift; warn-only). The
reasoning that governs future cases: a gate that classifies its own failures
decides which regressions are allowed, and a gate that never blocks is
documentation. Every content change therefore gets a recorded decision, which
is the point of holding the harness at all.

## D238 — OWNER: an undeclared convention never becomes a passing reading (2026-08-14)

Asked what the harness should do when a build reconciles only under a
convention the author never declared — the live case is #30, Chromatic Orb's
leap chain, which fits if his "three enemies" premise is flat area damage
rather than a literal bounce chain. Ruled: **leave the build failing and
document the candidate reading.** Rejected both modelling it as a named
opt-in mode and adopting it as the default. The scorecard therefore keeps
carrying failures whose cause we believe we understand, and that is correct:
a red cell with a written-up hypothesis is honest, while a green cell resting
on an invented convention silently converts a guess into our comparison
basis. Pairs with the errata evidentiary standard — we do not file a claim we
cannot cite, and we do not pass a build on a convention nobody stated.

## D237 — OWNER: lanes self-gate; the supervisor re-runs only the merge gate (2026-08-14)

Concurrency ruling, prompted by a finding against our own process: the R1
merge gate produced 15 pure-timeout failures at loadavg 155.93 on 24 cores
because three codex lanes were running their own suites at the same time. No
assertion failed; the gate had measured the machine.

Ruled: **keep maximum fan-out, and require each lane to run and report its own
suite before returning.** The supervisor then re-runs only the merge gate, on
a quiet box. Consequences that bind: a gate run made under load is DISCARDED,
never interpreted and never absorbed by re-pinning a budget (budgets remain
LAW); lane-reported greens are CLAIMED, and every report must keep them
distinct from what the supervisor VERIFIED; the merge gate itself is never
delegated.

## D236 — OWNER: species templates may author ability_override; the effect vocabulary is fully wide (2026-08-13)

Follow-up to D235's sibling ruling. Asked directly whether a species
template may author `ability_override` (set-to score, Headband-of-Intellect
shape) or whether that stays character-only per D83's rationale, the owner
chose: **allow on species too — fully wide, widest authoring surface.**
D83's template exclusion is superseded for species templates; the R1 scope
table carries no species-side exclusion row. The source-required invariant
on ability effects (an increase/override must carry a source_instance_id
once applied to a character) is unchanged — this ruling is about what a
TEMPLATE may declare, not how an applied effect is owned.

## D235 — OWNER: rows conflicting with declared types are unstorable at write and THROW at read (2026-08-13)

The owner, during the type-contracts audit (docs/design/2026-08-13-type-contracts-audit.md):
"The ts code should make it impossible to store a row that conflicts with the
types. It should throw an error if a row is selected that conflicts with the
types." Two obligations: (1) WRITE-side — the path that stores a row must make
a type-conflicting row unrepresentable (typed columns, closed vocabularies,
CHECKs transcribed from ONE enum source per D13); (2) READ-side — reading a row
that violates its declared contract is a throwing error at the read boundary,
not a value that flows on. Reads validate through a parse boundary (a
projector/`fromObject`-style factory or the Zod row contract), applied per
query result, not only at import/backup boundaries as before. R2's
`slotContract(row)` projector and R4's typed `state` are instances; new read
models follow suit. Performance shape: validate once per row per query at the
projection into a domain object — not per field access.

Same ruling's sibling call: the species-template effect vocabulary dispute
(DB CHECK 10 kinds vs Zod contract 5) resolves WIDE — `speciesTemplateEffectKinds`
and its Zod enum are deleted; the D83 ability_override-on-templates question is
reopened as a follow-up, not silently decided.

## D234 — OWNER: the sim lands on main; the subclass-session rulings arc folds by pointer (2026-08-12)

The owner approved landing tools/sim on main ("Land it now"), satisfying
D233's condition: the three non-SRD comparators were already replaced
with SRD substitutes (Devotion / Savage Attacker / Lore) with the
statistical invariant re-measured, and the board now carries all twelve
SRD 5.2.1 subclasses plus ranged/thrown rows per the owner's directive.

The subclass-session rulings (docs/homebrew/rulings.md, nine dated
2026-08-11 entries: Strike-drop + aura-wide Command targeting; aura
final Blindsight + Inevitable Word to 20; aura save-Disadvantage
[superseded]; skeleton conformance; Foreseen Long-Rest-only; strikes v2
[superseded]; second batch [superseded]; Voice-to-7 redesign
[superseded]; no-personal-attribution) land on main IN rulings.md with
their supersession arc verbatim. Per the handoff and the pointer-not-
copy lesson in CLAUDE.md, this entry is the fold: rulings.md is the
authoritative arc and outranks any doc it disagrees with; the arc is
deliberately NOT duplicated here. Party-sync boundary advances to
a451975b.

## D233 — OWNER: sim comparators become best-effort SRD substitutes before any sim sync (2026-08-11)

The damage sim's three non-SRD comparator builds (a 2024-PHB oath
paladin, a 2024 feat, a 2024 bard college — currently named in wt/party
tools/sim) are to be REPLACED with best-effort SRD substitutes (rebuild
the benchmark builds from SRD 5.2.1 content approximating the same
optimization role) as part of whatever landing branch first brings
tools/sim to main. Until then the sim stays in wt/party with its honest
provenance header. Doc/ruling syncs land WITHOUT the sim (2026-08-11
docsync dropped the sim portions of mixed commits; those portions ride
the future sim sync).

## D232 — OWNER: the taxonomy's legendary/artifact gap mechanisms stay prose-only (2026-08-11)

The twelve systematic gap families from the 307-item corpus validation
(taxonomy Addendum A, S74–S98: second stat-blocked entity, instant
destruction, redirection/reflection, outcome-flip, sub-daily/elapsed-time
cadences, banked whole-spell storage, random heterogeneous tables,
involuntary compulsion, repeat-save-to-end, self-state toggles, alignment
target/gate, and the single-item oddities) are FINE AS TEXT ONLY — they do
not change the numbers on the sheet, so the engine never grows
constructors for them. The taxonomy documents them; the sheet renders
their prose; the table adjudicates. Boundary application: where such a
shape carries a plain numeric maximum the existing pool machinery already
models (an item charge pool with an exotic cadence, a storage capacity),
the NUMBER is modeled and the exotic behavior stays prose. This bounds
the engine roadmap to number-affecting shapes (tranche 1 and its
successors) and supersedes the addendum's implicit "future engine
tranche" framing for these families.

## D231 — OWNER: U2 lineage rulings — mint content-v2; no step-advance gating; High Elf cantrip swap IS modeled (2026-08-09)

Three rulings on the species-lineage design
(docs/design/2026-08-09-species-lineage.md) plus one amendment:
 - MINT APPROVED: content-v2 fingerprint scheme (three CHECK
   constraints widen, current-fingerprint unique index reworked).
   Lineage choice definitions are identity-bearing per the design.
 - NO STEP-ADVANCE GATING: the species step advances with lineage
   unchosen; the sheet says UNKNOWN and the completeness item nags —
   overriding the design's blocking choice, consistent with how the
   optional species skill behaves.
 - SCOPE AMENDED mid-ruling by the owner: the HIGH ELF CANTRIP SWAP
   IS MODELED — the chosen wizard-list cantrip is a real recorded,
   replaceable choice DISPLAYED ON THE SHEET. The Long-Rest swap
   timing itself stays prose. Forest Gnome free-casts and Rock Gnome
   device remain prose-only as accepted.
SUPERVISOR REQUIREMENT carried into implementation: the design's
one-time reconciliation pass registers as a checksum-frozen
catalog-data migration with its D226 transitive source declared, or
its claim is restated — decided in U2-A, not discovered mid-gate.

## D230 — OWNER: D227's rewrite is a FULL SCRUB, docs included; the never-edit rule is lifted for exactly the substitution (2026-08-08)

D227 was authorized on a WRONG SUPERVISOR PREMISE, disclosed in full
before execution: the removal commit named there (b0af6f8) was in fact
the commit that ADDED the transcribed table; the table lived in code
for nearly the entire history until the SRD-ONLY retirement; and the
two subclass full names were still present at HEAD in 18 documentation
files, including this file's own D216 heading. A history rewrite
cannot expunge what HEAD still carries, so the owner re-decided scope
with the corrected facts.

RULING: full scrub. The two full names are replaced by their
abbreviations (EK, AT) everywhere — historical blobs, commit messages,
and the CURRENT tree, this file included. The append-only/never-edit
rule is lifted for EXACTLY that substitution and nothing else: no
entry is removed, reworded, or renumbered; only the two name strings
change form. The transcribed table data in historical code/test blobs
is expunged by the same pass.

wt/party: left untouched (owner is active in it). STANDING FLAG: it
branched before the retirement, carries the names at its tip, and
after the rewrite its work lands by REBASE onto rewritten main, NEVER
by merge — a merge would drag the entire pre-rewrite ancestry back
into main. Its docs get this same substitution before landing. Until
it lands, the old history remains locally reachable through it; the
mirror is fully clean after the force-push.

The pre-rewrite bundle at ~/dnd-prerewrite-backup/ preserves what this
destroys; the owner deletes it when satisfied.

## D229 — OWNER: boot verification moves to a rolled-up digest (2026-08-07)

Ruling on D225's fix shape, chosen from three integrity/speed trades:
a build-time canonical digest over ALL bundled aggregates; boot verifies
ONE hash pass instead of 339 per-spell verifications; a mismatch
triggers the full per-aggregate re-verify to NAME the culprit. Boot
stays tamper-evident every load. "Verify once and stamp" (post-first-
boot corruption undetected) and "keep full verify, just batch it"
(smallest win) were both declined. D225's prohibitions stand: the
digest is a designed guarantee, not an earlier readiness stamp, and
timeouts still may not be raised to conceal boot cost. D226 applies to
the digest: it covers the transitive source of what it claims to
freeze. Scheduled as the lead item of D213 hardening, after HA-12.

## D228 — OWNER: v1 publishes as local serve + ngrok tunnel (2026-08-07)

Owner's answer to "where does v1 get published": "Local + ngrok" — not
a static-host deploy, not a public repo. The git history therefore
stays private under every publication path (ngrok exposes the BUILT
app, never the repo), and D227's rewrite is motivated on its own, not
by publication. STARTING a tunnel is an outward-facing action: it
happens only when the owner runs it or explicitly asks for it. The
moment a real person creates a character through the tunnel, D60's
"data loss is not a stop condition" FLIPS OFF.

## D227 — OWNER: rewrite the EK/AT names + table out of git history, NOW (2026-08-07)

Owner chose "Rewrite now" over leaving the private history as-is. This
LIFTS the destruction hard stop for EXACTLY this operation: a
git-filter-repo pass expunging the transcribed third-caster slot table
and the EK/AT names from pre-b0af6f8 history, followed by a force-push
of the mirror. Scope of the lift: this rewrite, once; it is not a
general licence to rewrite, force-push, or delete.

SEQUENCING (supervisor call, recorded as a reversible default): the two
in-flight HA-12 lanes branched off pre-rewrite main; rewriting under
them would strand their commits on old history. The rewrite runs
IMMEDIATELY AFTER the HA-12 merges land, on the complete history, in
this session. Cost to flip: none — running it first would only force a
rebase of both lanes. After the rewrite: every commit hash recorded in
decisions/lane-state/briefs refers to PRE-REWRITE history; a mapping
note gets appended to lane-state, existing entries stay unedited per
the append-only rule.

## D223 — SUPERVISOR: third-caster slot ladders are DERIVED from the SRD table, never transcribed (2026-08-07)

Answers the owner's question "am I violating the license by making a 1/3
caster based on the table only found in the PHB?". VERIFIED IN THE SRD
TEXT: SRD 5.2.1's multiclass spell-slot rule lists only full casters
(Bard/Cleric/Druid/Sorcerer/Wizard) and half casters (Paladin/Ranger,
round up) — docs/srd/full/srd-5.2.1.txt:1599-1603. There is NO third-caster
fraction in the SRD, because EK/AT are not in the SRD. The Multiclass
Spellcaster slot table itself IS in the SRD (line 1638ff) and is CC-BY.

RULE: any third-caster progression this project ships is COMPUTED as
`MulticlassSpellcasterTable[floor(subclass_class_level / 3)]` — our own
stated fraction applied to a table we are licensed to reproduce. It is
never transcribed from a PHB table. Verified this derivation reproduces
the familiar ladder exactly (level 3 -> 2 first-level slots; 7 -> 3;
10 -> 4/2; 13 -> 4/3). The committed artifact is therefore SRD data plus
our rule.

Prepared/known-spell counts are NOT derivable this way — they are a
per-subclass design choice. Every project third-caster picks its own; do
not reuse the numbers currently seeded for EK/AT.

Not legal advice. The reasoning, for the record: mechanics and systems are
excluded from copyright (17 USC 102(b)), and unoriginal number tables have
thin-to-no protection (Feist), so the real exposure was always copied
PROSE and NAMES — which is why D216 removes the names and why no EK/AT
prose ever entered this repo. Deriving costs us nothing and removes the
question entirely.

## D226 — SUPERVISOR: a checksum-frozen migration must cover every source its behaviour depends on (2026-08-07)

Found by codex during HA-11 after the supervisor ordered the 0039
guard-suspension seam extracted so retirement and purge could share one
mechanism. The extraction was right — two ways to lower an immutability
guard is how the guard stops meaning anything — but it silently weakened
a different property: the retirement migration's checksum hashes only
the caller file's bytes, so changing the EXTRACTED guard module would
alter the migration's behaviour without altering its checksum. A
"checksum-frozen" migration that can change behaviour without changing
its checksum is only partly frozen.

RULE: a checksum-frozen migration's checksum covers the TRANSITIVE
source it depends on, not just its own file. Where that is impractical,
the claim must be RESTATED to what it actually freezes — the same
principle applied to the candidate audit's contract wording in HA-11.
Never leave a freezing claim broader than the freeze.

Cost accepted: changing the shared guard now re-pins every migration
that uses it. That is the point — if the guard changes, those
migrations' behaviour changed and a frozen artefact should notice.

## D225 — SUPERVISOR: boot readiness slowness is a PRODUCT defect, queued for D213 hardening (2026-08-07)

The route-readiness timeouts recurring across four lanes are not a test
problem. Diagnosis in docs/design/2026-08-07-boot-readiness-diagnosis.md:
EVERY page load re-projects and re-verifies all 447 bundled aggregates
(339 spells) — roughly 2,373 child/root queries, 339 nested savepoints,
at least three SHA-256 passes per spell, and the spell descriptions
parsed FOUR times per boot (initial load, cardinality check, manifest
construction, source-vs-stored comparison). Seeder guards skip the
WRITES; nothing skips the VERIFICATION.

RULINGS:
(1) This is user-facing slowness on a cheap device, not a CI artefact.
    Raising a test timeout is NOT an acceptable response to it, and no
    lane may do so citing this finding.
(2) The readiness CONTRACTS stay honest as they are. Firing the stamp
    before catalog reconciliation would either expose stale catalog
    state or just move the same synchronous block behind the first
    click. Do not "fix" this by stamping earlier.
(3) First fix, when D213 hardening starts: batch the 339-spell stored
    projection and reconciliation — load each root/child/fingerprint
    table once, build keyed maps, derive each live/source identity once.
    Medium cost, no migration, and it must NOT weaken the every-boot
    integrity guarantee, which exists because stored bundled rows can
    genuinely drift and boot is what detects that.
(4) A persisted catalog-version plus mutation-dirty stamp is the
    candidate for skipping the work entirely, and is a SEPARATE, later
    decision — a build/schema signature alone is insufficient for
    exactly the drift reason in (3).

## D224 — SUPERVISOR: D222's "content only" means NO TEST PINS, not "no mechanics" (2026-08-07)

Amends D222's wording, which was mine and was ambiguous. BHC's review
round 1 found Barbed Court Monk published with
`progression: { mode: 'inherit_parent' }` and no grants — i.e. as a
NON-CASTER — while its authoritative document promises curated cantrips,
prepared spells, Wisdom casting, and a third-caster ladder. Importing it
would have delivered none of the advertised mechanics. The implementer
read "content only" as "no mechanics"; I meant "no test pins".

BINDING READING: Barbed Court Monk ships with its FULL mechanics —
override progression, Wisdom, third_down, 20 dense rows derived per D223,
and its curated spell grants. What D222 withholds is its role as TEST
INFRASTRUCTURE: the third-caster slot-math pins live on Spell Student, so
revising Barbed Court's design never churns them. Barbed Court still gets
ordinary content pins (prose fidelity, publishes-and-applies), just not
the slot-math contract.

## D222 — OWNER: a deliberately boring third-caster carries the test pins (2026-08-07)
(See D224: "content only" here means no TEST PINS. Barbed Court ships
with full mechanics.)

Owner: "Author the deliberately boring 1/3 caster to test with." The
third-caster spell-slot coverage vacated by D216 moves onto a new,
intentionally minimal owner-authored subclass built for testing, NOT onto
the Barbed Court Monk. Its slot ladder derives per D223. Barbed Court Monk
ships as CONTENT ONLY in the bundled-homebrew catalog, so revising its
design never churns the slot-math pins. Supersedes D216's sentence routing
that coverage to Barbed Court.

## D221 — OWNER: seed-scope runs in parallel with the HA chain (2026-08-07)

Owner chose parallel over queue-jumping or waiting. The bundled-homebrew
catalog unit and the SRD-only retirement unit run in their own worktrees
alongside HA-11/HA-12. Supervisor accepts the collision risk the owner was
shown (both touch catalog seams) and owns the arbitration. Ordering
constraint from the design pass still binds: the catalog unit merges
BEFORE the retirement unit, so the boring third-caster (D222) is
exercising every retained third-caster seam before EK/AT coverage is
removed.

## D220 — OWNER: rename Elven Accuracy, generalize Elemental Adept (2026-08-07)

The two non-SRD feat mechanics found in shipping
src/ui/screens/planner/dice.ts are not deleted — they are de-branded and
generalized. (1) "Elven Accuracy" becomes "Triple Advantage". (2)
"Elemental Adept" becomes a generic die-upgrade mechanic parameterized by
a list of low die outcomes promoted to a higher outcome — owner's
examples: "1s and 2s become 3s on a weapon attack", "1s become 2s on a d8
spell attack". The generalized form is a dice-planner capability, not a
named feat, and must be strictly more expressive than the mechanic it
replaces. Existing dice-planner assertions convert as strict supersets.

## D219 — OWNER: shipped-catalog prose revisions publish a successor with lineage (2026-08-06)

Owner asked "Do we have the successor with lineage built? If not, don't
build it." SUPERVISOR ANSWER, VERIFIED: yes — CI-7 (merged bb4ec32, mints
0038 catalog_content_supersessions + 0039 cycle/rewrite/delete guards)
built edit-as-new-version with recipient-local supersession lineage AND the
reference-retarget command (previewReplacement/commitReplacement). So the
ruling stands as the recommended option: a revised shipped-catalog entry
publishes as a successor superseding the old version, recording lineage;
existing characters keep the old version until explicitly retargeted.
BUILD NOTHING NEW for this — reuse CI-7's machinery. If an implementer
finds themselves adding lineage plumbing, that is a finding: stop and
report it.

## D218 — OWNER: full export carries non-SRD content, share links try to and warn when they can't (2026-08-06)

Baseline is install-then-open: a share link naming content the recipient
lacks refuses with a message saying what to import. On top of that:
(1) The full JSON export MUST include non-SRD library data so an export is
self-sufficient. Supervisor note: character backup already calls
`exportPortableContentClosure` (src/backup/character-backup.ts:57) and
library export goes through the same portable-content seam — VERIFY this
already satisfies the ruling before building anything; if it does, the
work is a pin, not a feature.
(2) Share LINKS should make an effort to carry non-SRD content when it
fits the link budget, and WARN AT EXPORT TIME when it does not fit, rather
than silently emitting a link the recipient cannot open. Owner's words:
"maybe we should make an effort to fit the content in if we can and
[w]arn if we can't". A link that cannot carry its content is still a valid
link under the install-then-open baseline — the warning is the contract,
not a refusal.

## D217 — OWNER: SRD-only retirement just deletes affected characters (2026-08-06)

Owner: "Just delete. No one has used the site yet." The one-time retirement
of the bundled Veteran, EK and AT deletes the
characters attached to them outright — no detach-and-preserve, no
auto-retarget, no abort-and-demand-backup. Supersedes the design pass's
detach proposal (docs/design/2026-08-06-seed-scope-srd-only.md section E).
D60 applies: zero real users. This licence is scoped to THIS retirement;
it is not a general permission to delete characters.

## D216 — OWNER: EK and AT are dropped entirely (2026-08-06)

Completes D215's SRD-only seed. The two legacy non-SRD subclasses leave the
seed AND the repo; their third-caster spell-slot test coverage converts
onto the Barbed Court Monk (also third_down) as strict-superset
replacements, not deletions. Cleanest D59 posture. D60 applies: no user
data exists.

## D215 — OWNER: SRD-only default seed; bundled homebrew is click-to-import; Veteran + Barbed Court Monk included (2026-08-06)

Refines D211's fresh-database story. (1) Default boot seeds SRD content
ONLY. (2) The app ships a "bundled homebrew" catalog surfaced as an OPTION
the user can click when importing — installed idempotently through the real
HA-5 external-publish path, landing in the external layer (deletable,
supersedable, lineage-capable like any user homebrew). (3) That catalog
includes the Veteran rogue (docs/homebrew/2026-08-04-rogue-veteran-subclass.md)
and the Barbed Court Monk (docs/homebrew/2026-08-03-monk-barbed-court.md)
for testing. The bundled seed 2024:subclass:veteran retires per D211;
expected external key form: 2024:content.subclass:veteran. Owner's answer
verbatim: "I want idempotent boot install. Only seed srd by default.
include bundled homebrew as an option the user can click on when
importing. I want the veteran rogue and the barbed court monk included
for testing".

## D214 — OWNER: purge purges the whole lineage set; set restore is all-or-nothing (2026-08-06)

Resolves the D138-vs-CI-7 collision (supersession lineage rows are permanent
and RESTRICT-lock their content, so a superseded creation could never be
hard-deleted). Ruling: (1) permanent purge from the archive view removes the
ENTIRE connected lineage chain — every version, its lineage rows, and attached
characters — in one atomic scoped purge seam; 0039's permanence trigger gains
exactly one guarded exception for this path and lineage stays immutable
everywhere else. True deletion, no zombie/stub rows. (2) A deleted set
(creation + attached characters) archives and restores as ONE unit; partial
restore is not offered — restore the set, then delete individual characters
normally. HA-11 pins both.

## D213 — OWNER: after HA-12, keep hardening autonomously (2026-08-06)

When the named design-doc queue empties at HA-12, the loop continues on
its own judgment: mutation-suite expansion, accessibility depth, and
performance passes. Publish-prep and the outward-facing hard stop are
unchanged; no publish without an explicit ask.

## D212 — OWNER: acceptance walk still deferred (2026-08-06)

Asked again with the authoring suite nearly complete: "Still not yet."
D210 stands; the owner announces when.

## D211 — OWNER: re-publish the Veteran as external homebrew (2026-08-06)

The Veteran leaves the bundled seed path: a unit (VET-REPUB) publishes
it through the HA-5 subclass authoring backend as external homebrew
carrying its full prose from docs/homebrew, then retires the bundled
heading-only seed (2024:subclass:veteran) with wipe-and-reseed
semantics per D205/D208. D152 stays uniform: bundled content is
heading-only, homebrew carries prose.

## D210 — OWNER: no acceptance walk yet (2026-08-05)

The guided owner acceptance walk against the D54 bar is declined for
now ("Not yet"). Keep building; the bar test waits for the owner's
word.

## D209 — OWNER: going public is PLAUSIBLE; NOTICE prep authorized (2026-08-05)

A small unit adds and maintains a NOTICE/attribution file covering SRD
5.2 CC-BY material, the project's own CC-BY-4.0 originals (Veteran, the
monk drafts, the oath), and the 3.5-SRD concept ancestry disclosure.
Kept current at each merge that adds licensed content. The CC0 license
flip stays a recorded option, not yet planned.

## D208 — OWNER: the zero-users window closes at the first real campaign (2026-08-05)

"When I start a real campaign" - the D60 window closes the day the
owner creates a character they intend to keep, announced by them. Until
then, destructive simplifications (wipes, resets, compat deletions)
remain supervisor defaults: recorded, reversible, no per-case owner
ruling required. After that day, data compatibility is real.

## D207 — OWNER: three standing orders (2026-08-05)

All three made permanent: (1) COMMON.md forbids codex dispatches from
invoking any second-agent CLI (claude or otherwise); internal
self-review is fine but carries no gate weight. (2) Dead-code deletion
license: any lane may delete dead members it finds in files it already
touches, reported and supervisor-verified (first target:
available_on_long_rest). (3) Merged idle worktrees are pruned and
recreated on demand. wt/party is the owner's subclass-session lane and
is never pruned by supervision.

## D206 — OWNER: homebrew rulings fold as POINTER ONLY (2026-08-05)

docs/homebrew/rulings.md is the authoritative record of subclass-session
rulings. decisions.md carries this single pointer entry rather than
per-ruling D-numbers. Rulings recorded there to date include the Veteran
kit supersession of the Executioner arc, four monk working names, the
monk seed-scope deferral, and Master of Experience = broad reading (all
18 skills).

## D205 — OWNER: CI-4b becomes WIPE AND RESEED (2026-08-05)

Owner's words: "Wipe old stuff and reseed in all cases. No users yet."
No rekeying migration, no old-key aliases, no backfill of legacy rows:
content that predates the asserted/bundled key scheme is wiped and
reseeded under the current scheme. D60 makes this legal exactly now;
the legacy-opaque closed set empties by deletion rather than surviving
as a fossil. The CI-4b brief is authored to this scope (mint only if
the wipe itself genuinely needs a migration; 0034 next free).

## D204 — OWNER: wt/party merges BEFORE VET-SEED (2026-08-05)

The homebrew docs and rulings merge to main first; the VET-SEED unit
builds the rogue Veteran as bundled content from the MERGED state, not
from a worktree paraphrase.

## D203 — CI-4a mint 0033 AUTHORIZED: 'asserted' key classification (2026-08-04)

CI-4a round 2 correctly stopped: D198's asserted slug keys have no legal
registry classification — the schema CHECK permits derived digests,
legacy-opaque (closed set, pre-existing rows only) and bundled-stable,
and the 0020 triggers would auto-register new slug roots as
legacy-opaque. Supervisor authorization: MINT 0033 adding a NEW key_kind
'asserted' for externally asserted slug keys. Closed sets stay closed:
'derived' keeps its digest meaning, 'legacy-opaque' stays pre-existing
rows only, no reinterpretation of stored rows, no rekey/backfill (that
is CI-4b). CHECK constraint and root-registration guards updated so
import/fork paths can never mint legacy-opaque. schema.sql moves in
lockstep. Merge order: AR-A (0032) merges BEFORE CI-4a (0033).

## D202 — OWNER: rogue ships as BUNDLED content named "Veteran" (2026-08-04)

Owner: "Seed as bundled content. I have worked on it in the other
session and renamed it 'Veteran'." The owner-authored kit lives in
wt/party docs/homebrew/2026-08-04-rogue-veteran-subclass.md with its
ruling in docs/homebrew/rulings.md; it SUPERSEDES the Executioner arc
(D194-D196 record the history). Seeding is a VET-SEED unit queued after
SC-3 merges (rides the SRD-subclass seeding machinery), as bundled
content like the twelve SRD subclasses — not through the import path.

## D201 — OWNER: PHP parity is reference-only; divergence by ruling (2026-08-04)

The PHP-parity suite documents the ancestor and keeps running as
regression cover, but is no longer a binding oracle: deliberate
divergences are permitted when recorded as adjudications. Ratifies the
FF-B envelope adjudication (public command responses no longer expose
inverse bytes; the parity expectation was updated to the new contract).

## D200 — OWNER: suite-speed infra unit AUTHORIZED (2026-08-04)

php-feature-parity.spec.ts (~8 min serial) dominates the ~25-30 min
Playwright gate. A dedicated supervised unit may split it into
parallel-safe spec files and make the accompanying config changes. The
config-edit prohibition is a no-paths-to-green rule; this is a deliberate
authorized infra unit. Conditions: no assertion changes, strict-superset
test census before/after (same test titles, supervisor-verified), and
the unit touches nothing else. Queue: after the current lane wave
(FF-B/SC-3/AR-A/CI-4a) drains.

## D199 — OWNER: legacy command-history compatibility is WIPED (2026-08-04)

Under D60 (zero users) the owner ruled dev-era operation history
disposable rather than carrying unauthenticatable grandfathered bytes:
"Wipe it now." FF-B drops the legacy signed-inverse decoder paths and
legacy restore_snapshot stored-row acceptance; an operation whose stored
inverse is a legacy shape gets a typed refusal (not decoded, not
re-signed, not applied). The unauthenticated-legacy-bytes MED from
FF-B review 3 closes by deletion. New-write validation (limits, NUL)
applies everywhere; the grandfathered-bytes carve-outs FF-B rounds 1-3
built for legacy rows are removed as dead paths. Stored legacy rows may
remain as inert unreadable history; no migration, no row deletion
required (mint-free).

## D198 — content-identity design's derived-key installer superseded by the CI-3s asserted-key reality (2026-08-04)

CI-4a's dispatch BLOCKED on a genuine contradiction codex proved and the
supervisor verified: `docs/design/2026-07-30-content-identity.md` excludes
`content_key` from fingerprints and derives clone keys from the projector
digest, but the frozen spell projector v1 includes `spell_version_key`
(the content key) in identity — deliberately, per the CI-3s-PRE
adjudication (portable stable keys ARE content). A digest-derived key
stored back into the row changes the next projection: circular. The
design also requires a "CI-3a immutable installer" that history never
built (the merged CI-3a was the stored-row projector unit).

Ruling (supervisor, D7 default):
1. Keys are ASSERTED, name-derived portable slugs through the one shared
   stable-key normalization — never digest-derived, never random salts,
   never opaque UUIDs. Determinism and cross-store reproducibility (the
   design's motive) survive; circularity does not.
2. A derived renamed clone's key comes from its NEW NAME via that seam;
   collisions and empty normalized names are the existing typed refusals.
3. "The immutable installer" is read as the registry's key-first install
   seam (CI-3s). The CI-4a cutover routes catalog import and spell-fork
   publishing through that single seam; no direct key mutation outside it.
4. The design doc's section-11 roadmap rows are henceforth read THROUGH
   the adjudication layer (D-numbers + CI-chain adjudications); where they
   conflict, the adjudications win. A supersession banner is added to the
   doc. Control name corrected: CI-REVIEW does not exist in the doc;
   CI-SRD-FALLBACK-REVIEW is the fifth control.
Seam: content-v2 projectors excluding keys remain possible later if
digest-derived identity is ever truly wanted. Cost to flip: a projector
version bump plus reconciliation, the path CI-3s already supports.

## D197 — OWNER: registry orphaned/refused counts go to console/log only (2026-08-04)

The bundled content registry returns per-entry `orphaned` and `refused`
counts; applicationSeed currently discards them. Owner ruling (2026-08-04,
option chosen from three): log the counts to the console — no user-visible
surface for now. Cheap, keeps the signal for debugging, promotable to UI
later when a settings/about surface exists to host it. Closes the
"diagnostics decision" follow-up recorded at the CI-3s merge.

Same sitting, queue placement ruled: SEEDER-SAME-CARDINALITY-CORRECTION
is dispatched AFTER CI-4a lands (CI-4a touches the same reconciliation
seam; landing it first avoids churn), ahead of the rest of the CI-4
series' follow-ups.

## D196 — OWNER: rogue level 9 simplified; level 13 becomes total skill mastery (2026-08-04)

Owner's words: "The above is too complicated. Just basic language that
doubles the sneak attack dice pool permanently regardless of cunning
strike use. Call out clearly that the rogue is being limited to one sneak
attack per round in exchange for doubling the dice. At the subclass level
after 9, give proficiency in every skill and 2 more expertise."

Three rulings.

1. LEVEL 9 WORDING IS SIMPLIFIED, and this supersedes D195's text (not
   its intent). The pool is doubled PERMANENTLY. The
   "subtract-before-doubling" Cunning Strike clause is DELETED: dice
   forgone for Cunning Strike now come out of the doubled pool like any
   other Sneak Attack dice, which is both simpler and slightly more
   generous than D195. The critical-hit paragraph is DELETED from the
   feature text - the normal critical rule already covers it. Any crit
   arithmetic belongs in the design notes, not in the printed feature.

2. THE TRADE MUST BE STATED IN THE FEATURE TEXT ITSELF, not only in the
   worksheet: doubled dice in exchange for one Sneak Attack per round.
   The reader must see the cost where they read the benefit.

3. LEVEL 13 IS REPLACED. Vanishing Point (Hide while observed near dim
   light or half cover) is CUT. The level-13 feature is now: proficiency
   in EVERY skill, plus Expertise in two more skills. This keeps the
   reliability theme and the Champion register - a broad passive with no
   resource and no new action.

Level 3 (Measured Lethality, 19-20 crit) and level 17 (Practiced
Certainty) are unchanged. Note for the revision: with total skill
proficiency at 13, level 17's chosen-skill floor and the level-13
Expertise picks must not silently overlap in a way that reads as the
same feature twice.

## D195 — OWNER: rogue level 9 final wording — doubled pool, Sneak Attack once per round (2026-08-03)

Supersedes D194's engine wording ("first Sneak of the round doubles, a
second uses the normal table"). Owner's words: "At level 9 double the
sneak attack dice pool and limit sneak attack to once per round." The
feature does BOTH: Sneak Attack dice are doubled AND Sneak Attack itself
becomes limited to once per round. There is no second normal-dice Sneak
- the round's budget is exactly one doubled application (2N flat,
matching the parity rationale: equal to the contriver's N+N without the
contortions). Simpler to adjudicate than the D194 split.

## D194 — OWNER: rogue subclass refined — once-per-round doubling, 19-20 crit at 3, reliability theme (2026-08-03)

Amends D192's rogue engine and directs the revision:
 1. Double Sneak Attack applies ONCE PER ROUND (not per turn). Owner's
    rationale, recorded: "this only brings the rogue equal with a rogue
    that contrives to sneak attack twice every round. It does not use up
    the power budget, it just lets the rogue keep up dpr without having
    to contort into doing an opportunity attack or rely on a battle
    master every round."
 2. Level 3 becomes: critical hit on 19 or 20 (Champion's shape on the
    rogue chassis; SRD content, original name; the 19-20 x doubled-dice
    interaction — a crit rolls the doubled dice twice, 4x table — is
    stated plainly in the doc).
 3. Remaining slots: mine Tales of the Valiant (CC-BY per the license
    survey — legally usable with attribution; concept-level only, own
    wording) and 3e/3.5 SRD prestige classes (OGL open content) for
    ideas. Theme: RELIABILITY of what the rogue does in and out of
    combat, extending Reliable Talent's register (floors, minimums,
    treat-as-N) rather than new subsystems.

## D193 — OWNER: build the Psionic Fist adaptation as a fourth monk subclass (2026-08-03)

Owner's words: "Build the adaptation of the psion monk 3.5 prestige
class." A fourth third-caster monk, the FAITHFUL adaptation of the 3.5
SRD Psionic Fist (open content, verified): partial Wis-caster on the
unbroken martial chassis, a short psychic-warrior-style Wisdom list
(self-buff transmutation + telekinetic/telepathic touches from the
verified SRD set), Focus in the power-point seat, mind-body fusion
identity. Shares the family chassis: Wisdom third-caster + D189
cantrip-in-Flurry at 6. Taken for now (D7, Blackguard precedent): an
ORIGINAL name with a one-line concept-level ancestry disclosure ships
CC-BY like the other three; the alternative — carrying the "Psionic
Fist" name as OGL-attributed content in the D176 quarantine folder — is
the flip if the owner prefers name fidelity. No psionic subsystem is
invented (guideline F2); psionics is expressed as Wisdom casting.

## D192 — OWNER: two simple weapons-first subclasses — double-Sneak rogue, unbound-Mark ranger (2026-08-03)

Owner commissions, verbatim mechanics:
 1. ROGUE subclass whose engine "doubles the sneak attack dice from the
    class table starting at level 6 or higher."
 2. RANGER (hunter-flavored) subclass that "removes concentration from
    hunters mark and does not require a bonus action to move it from a
    downed target to a live one starting at level 6 or higher."
Design ethos, owner's words: "simple beginner friendly classes in the
vein of champion fighter. More weapons focused than weird magic and
extra resources to manage."
Schedule facts applied: Rogue subclass slots are 3/9/13/17 (no 6) - the
doubling lands at 9, permitted by "6 or higher." Ranger slots are
3/7/11/15 - the Mark unbinding lands at 7. The engine mechanics are
OWNER-SPECIFIED and frozen; the budget worksheets present the honest
math (the rogue doubling will read hot against the SRD Thief comparator
- presented, not silently softened). The drafts must check the SRD
ranger BASE class for its own Hunter's Mark features and state the
interaction rather than duplicate it. No new resources, no casting,
Champion-register simplicity throughout.

## D191 — OWNER: all three monk subclasses ship; license = most permissive respecting SRD attribution (2026-08-03)

Owner's words: "All 3 monk subclasses seem fun. Publish them under the
most permissive license that still respects the cc attribution that they
work with the srd." The bake-off ends with THREE winners: Barbed Court,
Ten Selves, Hundred Knots all proceed to full drafts and ship with the
repo. License, taken for now under the owner's criterion: the subclass
documents are released CC-BY-4.0 with the verbatim SRD 5.2 notice
(uniform with docs/srd; the attribution obligation is structural since
the docs carry SRD-derived content). Seam: per-file license headers.
Flip option recorded: our original expression could go CC0 with the SRD
notice retained only for SRD-derived parts - MORE permissive but a
mixed-license file; flip before the repo goes public if the owner
prefers. "Publish" executes through the existing publish gate
(D121/D127/D128 unchanged - nothing goes outward today; the private
mirror continues). OPEN, flagged for the next question round: whether
all three are SEEDED as app content or D169's replace-EK/AT slot takes
one (and which). Owner addendum: when the full drafts are done, run
cleanup and polish passes on the finished subclasses before they are
considered ship-ready.

## D190 — OWNER: monk bake-off = three finalists, each with a Focus-spend budget lever (2026-08-03)

The bake-off entries, owner-directed:
 1. Laughing Court MERGED with Barbed Tongue (bard list — mockery + taunt
    as one identity), more bard spells found, Focus-point spend integrated
    for power budget.
 2. The illusion pitches MERGED, "no positional stuff" (Still Point's
    dual-position/teleport mechanics are OUT), Mirror Image is the
    centerpiece, more illusion spells found, Focus spend integrated.
 3. The primal pitch: Hunter's Mark, Ensnaring Strike, Entangle as the
    core (owner also named Thorn Whip - NOT in SRD 5.2.1, verified
    against the oracle; substitutes from the verified primal set), more
    primal spells found, Focus spend integrated.
All three carry D189's level-6 cantrip-in-Flurry and the third-caster
Wisdom chassis. Each bake-off entry = drafted level-3 bundle + curated
verified spell list + Focus-spend mechanic + mini budget/taxonomy pass;
owner picks the winner for the full draft.

## D189 — OWNER: monk third-caster level 6 = cantrip inside Flurry of Blows (2026-08-03)

Owner's words: "I want the lvl 6 valor bard mechanic to replace an attack
with a cantrip. Maybe flurry of blows allows a cantrip if not holding a
weapon." The monk subclass's level-6 feature: when using Flurry of Blows
while not holding weapons, one of its Unarmed Strikes may be replaced by
casting a cantrip (exact wording/limits to the draft). DISTANCE NOTE,
recorded deliberately: attack-replaced-by-cantrip is a flagged signature
(the un-redesigned EK-pattern lift is what reviewers dinged the upcoming
official monk for). The owner's version is the REDESIGN the flagged
product lacked: it rides the Focus-funded Bonus Action Flurry (not the
Attack action), costs the class's own resource, and is gated unarmed-only.
Ruled acceptable under D174 (differentiation by mechanical distance).

## D188 — OWNER: Voice of Domination SIMPLIFIED (2026-08-03)

Owner's words: "Simplify the oath of domination channel divinity. 1
minute, can cast command with a bonus action without using a spell slot."
Supersedes the draft's initiation-by-slot-cast, single-target lock,
two-successful-saves ending, and concentration clause: activating the
Channel Divinity gives, for 1 minute, the ability to cast Command as a
Bonus Action without expending a spell slot. Normal spell rules otherwise
(fresh save per casting, normal targeting). Knock-ons the doc rework must
resolve: the level-20 capstone's clauses that removed concentration and
the success limit are moot and get rewritten against the simple form;
the power-budget worksheet re-runs for the stronger (untargeted,
non-ending) but simpler CD. The design doc's OWNER-APPROVAL markers stay
open - this is a redesign instruction, not an approval.

## D187 — OWNER: the Oath of Domination spell list is FINAL (2026-08-03)

Owner-picked, all verified present in SRD 5.2.1:
  Paladin 3:  Command, Bane
  Paladin 5:  Suggestion, Augury
  Paladin 9:  Clairvoyance, Slow
  Paladin 13: Compulsion, Divination
  Paladin 17: Dominate Person, Dream
Dream is the standout: he SENDS the vision - nightmares as statecraft,
the D186 misread made contagious. The list walks command (Command ->
Suggestion -> Slow -> Compulsion -> Dominate Person) and vision (Bane's
dread -> Augury -> Clairvoyance -> Divination -> Dream) in parallel to
their apotheoses. Supersedes D182's provisional pairings.

## D186 — OWNER: the vision is MISINTERPRETABLE - the reading is the flaw (2026-08-03)

Owner adds the misread-prophecy layer (the GRRM teeth-snap idea; the
Croesus/Delphi trap - ideas only, no protected expression): the vision
may be TRUE while his READING of it is wrong, and acting on the
misreading can be what brings the true meaning about. Design
consequences: the oath's flavor includes a WRITTEN VISION - short,
concrete, deliberately readable at least three ways (his reading, a
darker reading, a benign reading) - as a DM tool; the DM may secretly
pick a true reading or never pick one. His certainty attaches to his
INTERPRETATION (the one mortal-forged link); no one ever audited it,
and the tenets' certainty language already covers it ("What Was Shown
Needs No Second Showing" now does double work). Augury/Divination
answers stay ambiguous AND get bent through his reading.

## D185 — OWNER: the register is TORMENT WITHOUT DOUBT (2026-08-03)

Corrects the serene overcorrection. Owner's words: "I do not see
serenity in this story. I see someone tormented by 'knowing' for sure
the right thing to do while having every ounce of their humanity
screaming stop - and the toll and the trauma of that." The two rulings
COMPOSE: D183's certainty is EPISTEMIC (he never doubts he is right);
the torment is MORAL AND EMBODIED (the doing costs him everything, every
time, and the cost never converts into doubt). The knight is the
Dyson-house figure one beat further: hands shaking, trigger pulled.
Tenet STRUCTURE and the pinned centerpiece are locked; a final VOICE
pass rewrites the satellites so the speaker is visibly paying -
exhaustion, grief, white knuckles - while conceding nothing
epistemically. "Let it be recorded that I knew" reads as carved through
gritted teeth: the record is the trauma seeking a witness.

## D184 — OWNER: the Exception tenet is PINNED verbatim (2026-08-03)

Owner pinned this tenet as a keeper, surviving all reworks word for
word: "Every Tyrant Believes He Is the Exception. I have carved that
warning into my own oath, and I have drawn the sword anyway. Let it be
recorded that I knew." It is the oath's centerpiece; under D183 it
self-demonstrates (he knows the rule and is certain he is the
exception - which is the rule).

## D183 — OWNER: the prophet has NO doubt - certainty is the horror (2026-08-03)

Refines D181: the knight is fallible IN FACT but subjectively CERTAIN -
"believe he is right and have no doubts about it. That makes it scarier."
Consequences for the tenets: nothing reads as suppressed inner doubt; the
doubt-forbidding tenets aim at OTHERS' doubt; any tenet granting the
premise of his own madness is cut; omens are always read as confirmation
(certainty digests Augury). The ambiguity machinery (D182) stays fully
outside his head - the reader sees what he cannot. Herbert's warning in
its purest form: the danger is the leader who has stopped checking.

## D182 — OWNER-DIRECTED: divination joins the Oath of Domination spell list (2026-08-03)

Amends D179's list: each tier pairs a command spell with a VISION spell -
Command/Bane; Suggestion/AUGURY; Slow (or Hypnotic Pattern)/CLAIRVOYANCE;
Compulsion/DIVINATION; Dominate Person/SCRYING (alternates Hold Monster/
Geas/Commune). All verified present in SRD 5.2.1. Rationale recorded:
Augury and Divination give D181's never-confirm-never-debunk ambiguity
mechanical teeth - their answers are DM-ambiguous by rule. The lost Hold
spells' combat power is an accepted cost per the paladin's low subclass
budget. Design doc binds the final picks.

## D181 — OWNER: the oath-holder is FALLIBLE; prophecy-madness reframe (2026-08-03)

Refines D180: the Oath of Domination knight must NOT know for sure they
are doing the right thing - "imagine if Paul and Leto were fallible."
Chosen fiction: one DRIVEN MAD BY PROPHECY WHO BECOMES THE INSTRUMENT OF
THE PROPHECY'S REALIZATION - the self-fulfilling doom: they saw a ruin,
dominate to prevent it, and can never know whether the vision was true,
was madness, or whether the prevention is itself the arrival. Tenets are
being reworked to carry that uncertainty (including tenets that FORBID
the doubt the knight secretly has - the oath self-seals its own
madness). Mechanics unchanged (command kit, Voice of Domination). The
archetype set widens to the classical self-fulfilling-prophecy tragedies
(ideas only; no protected expression).

## D180 — OWNER: Oath of Domination tone = the sincere tyrant; fiendish framing CUT (2026-08-03)

Owner's words: evil by someone "who thinks they are doing the right
thing" - the "if I were in charge, I could stop all of this injustice"
philosophy, modeled on Paul Atreides and Leto II (the Golden Path: tyranny
chosen knowingly as salvation). Consequences: NO fiendish framing
anywhere in the oath; the 3.5 fiendish servant is CUT as a mechanic (at
most a prose echo on find steed: "the first creature to bend the knee");
tenets built on order-as-mercy, the burden of the one who sees, and
self-aware monstrousness. LICENSING: Dune's philosophy is distilled as
ideas only - no Dune names, terms, or expression may appear in the oath's
text (a sonnet researcher produces original tenet language; clean-room
rules apply).

## D179 — OWNER: the Blackguard conversion is OATH OF DOMINATION (2026-08-03)

Name chosen: Oath of Domination. Identity: command, not fear (D178
distance). Direction approved for the design doc: a command-family oath
spell list from verified SRD 5.2.1 spells (Command/Bane; Suggestion/Hold
Person; tier-9 soft; Compulsion/Dominate Beast; Dominate Person/Hold
Monster) and a Channel Divinity exploring the owner's ask - recasting
Command on the same target as a BONUS ACTION without a spell slot.
Preferred shape "Voice of Domination": CD use at cast time sustains 1
minute of bonus-action slotless recasts against that target, fresh save
each time, ends on two successes; the deliberate bonus-action tension
with Divine Smite is a feature. No-save repeats are forbidden. Still
open: fiendish-servant fate and prose tone.

## D178 — OWNER: Blackguard distance set includes 2014 DMG Oathbreaker AND BG3's version (2026-08-03)

The converted Blackguard must keep D174-style mechanical distance from
the 2014 DMG Oathbreaker and from Baldur's Gate 3's Oathbreaker — and
since the DMG is NOT open content, no feature name or feature shape from
it may be reproduced at all (a stricter bar than distance). SUPERVISOR
FINDING at recording time: the draft outline's level-3 Channel Divinity
was named "Dreadful Aspect" - the literal name of a 2014 DMG Oathbreaker
Channel Divinity (also in BG3). Struck and reworked. Distance checklist
for the design doc: no fallen/broken-oath framing (BG3's core mechanic;
ours is a CHOSEN oath with tenets), no undead-command features, no
aura-of-hate shape (Cha-to-melee-damage shared with fiend/undead allies),
no one-burst fear Channel Divinity, and no DMG/BG3 feature names. The
oath's differentiated identity: DOMINATION AND COMMAND, with fear only
as a late accent.

## D177 — OWNER: clean-room subclass creation guidelines (2026-08-03)

Codex and opus collaborate on research producing SUBCLASS CREATION
GUIDELINE FILES (docs/design/subclass-guidelines/). Content: what makes
a subclass fun and appropriately powerful, with PER-CLASS power budgets
(rogue/monk/ranger derive more power from their subclass; full casters
less), plus patterns from popular homebrew and third-party work. CLEAN
ROOM: researching agents are RETIRED with their sessions; the files
carry only distilled design principles and original examples (SRD/CC-BY
material may be quoted; no verbatim expression from any non-open source,
no Product Identity) so future LLM sessions can design subclasses from
the guidelines alone, unaware of any copyrighted source. Hygiene review
before commit: a reviewer checks the files for copied expression and PI.

## D176 — OWNER: OGL content is QUARANTINED in its own folder (2026-08-03)

"Keep ogl stuff in a separate folder with the ogl requirements in the
same folder so ogl doesn't pollute the rest of the repo." Any content
derived-with-text or reused from OGL 1.0a sources lives under a dedicated
folder (docs/ogl/ unless implementation finds better) containing the OGL
1.0a license text and the full Section 15 chain for exactly what that
folder holds. The rest of the repo stays CC-BY/MIT with no OGL
obligations. Code that consumes OGL-folder content must not copy its text
elsewhere. Publish prep carries the folder as-is with its notices.

## D175 — OWNER: first conversion = BLACKGUARD as the evil oath; parallel track, owner-led (2026-08-03)

From the conversion walkthrough: convert ONLY Blackguard for now (the
2024 core's vacant evil-oath slot; renamed per D174 with mechanical
distance from 2014's Oathbreaker). Sequencing: a PARALLEL track that
"does not block publication" - outside the D148 gate, worked as capacity
allows. Process: one at a time, each conversion gets its own design doc
and approval round, and the owner is involved "more than usual" - the
supervisor presents feature outlines to the owner BEFORE codex authors
the design doc, and the owner approves content at every stage before
seeding. Tier-1 candidates (Horizon Walker, Duelist, Hierophant,
Loremaster, Archmage, Dwarven Defender, Thaumaturgist) remain on the
research shelf, unqueued.

## D174 — OWNER: conversion collision policy = rename + mechanical distance (2026-08-02)

On the 3.5-SRD conversion research: "Differentiating by renaming is fine
as long as the converted subclass is not too similar to the 5e/5.5
version of the same name." Policy for any future prestige-class
conversion: a name collision with an existing 5e/2024 subclass does NOT
disqualify a candidate - rename the conversion AND keep its mechanics
sufficiently distinct from the official subclass it collided with. The
similarity test is against the official 5e/5.5 subclass, judged at
design review. Unblocks the collision-flagged candidates (Dragon
Disciple, Blackguard, Assassin, Shadowdancer lineages) whenever
conversion units are ordered; no conversion unit is IN the queue yet -
this is standing policy, not a scope addition.

## D173 — OWNER: Magic Weapon stays TEXT-ONLY; the banded upcast is proven modelable (2026-08-02)

Asked whether to build a spell-effect layer (the weapon_attack_bonus/
weapon_damage_bonus effect kinds already flow into attack profiles, so
hand-modeling via planner effects works today). Owner: "Text only is
enough, but I want to know if we can model the weird upcast." Ruling: no
spell-effect unit in v1; players hand-attach effects if they want the
numbers. The upcast question is ANSWERED and recorded: the 2024 banded
scaling (slot 2 -> +1, 3-5 -> +2, 6+ -> +3) is a closed hand-authored
band table keyed on CHOSEN SLOT LEVEL - a new input concept (slot-level
picker) but no formula engine; type-closeable; Pact Magic compatible.
Not a blocker if a spell-effect layer is ever wanted.

## D172 — OWNER: AI panel ships in the public repo, documented for cloners (2026-08-02)

Owner's words: "Let anyone who clones the repo run their own localist with
Claude code integration." The chat panel and bridge client STAY in the
published code (not stripped); the public site keeps mounting nothing (no
bridge). NEW publish-prep item: user-facing docs in the public repo
explaining how a cloner runs the local bridge with Claude Code to get the
panel. The bridge server itself: verify what exists in-repo vs. supervisor
tooling before promising it — the doc must only describe what the public
repo actually contains.

## D171 — OWNER: in-app "Copy a bug report" button + GitHub issues (2026-08-02)

Footer control pre-fills build id, browser, current screen, character id
into the clipboard for pasting into chat; the D132 issue channel stays for
account-holders. Small unit joins the queue.

## D170 — OWNER: update prompt offers backup + one changelog line (2026-08-02)

The refresh-to-update prompt gains "Download a backup first" and a
one-line what-changed keyed to the build id; the owner writes that line
per deploy (deploys are manual). Does not contradict D116 (first-character
hint) — recorded as its own surface.

## D169 — OWNER: EK/AT retire, REPLACED by an invented third-caster MONK subclass (2026-08-02)

Owner's words: "Replace eldrich knight and trickster rogue with a made up
third caster monk sub." Amends the SUBCL-SEED design's OQ-1 and its
additive-14 shape: final bundled set = the twelve SRD subclasses PLUS ONE
owner-original Monk subclass carrying a dense third-caster progression
(keeping the third-caster machinery exercised, which was the argument for
keeping EK/AT). EK and AT retire in the same
unit that lands the replacement — retirement is a strict content swap, not
a deletion-first. The invented subclass is original content (no licensing
issue, D59). Its NAME, features, and spell list are DRAFTED by us and
PRESENTED TO THE OWNER for approval before seeding — invented game content
is owner-taste, not supervisor discretion. D80 covers characters left on
EK/AT after retirement (unmade-subclass warning, sheet gap).

## D168 — OWNER: publish under an ORG (2026-08-02) — NAME OPEN

Chosen over derrickschoen/srd55. The public squash lands in an org repo;
org creation happens at publish prep (outward, covered by this grant).
SUPERVISOR FINDING at recording time: the GitHub USERNAME `srd55` is
taken (users/srd55 = HTTP 200; orgs share the user namespace), so the org
cannot be literally `srd55`. OPEN: the owner picks the org name (e.g.
srd-55, srd55-app, srd55-project) — ask at publish prep or sooner.
Spike-repo deletion was NOT covered by this answer; still pending.

## D167 — OWNER: homebrew WEAPONS/ARMOR forms join v1; feats and magic items do NOT (2026-08-02)

Multi-select answer: exactly "Weapons/armor". Weapon and armor definition
authoring forms join the HA chain (proficiency + AC surfaces); feats stay
at the 17 sourced SRD feats; magic items stay planner-panel-only (D72
one-off effects), no item form in v1. Extends D103's kind list; D133
unaffected.

## D166 — OWNER: librarian setup = guided checklist + outbound link (2026-08-02)

The party page walks the librarian through repo creation: an outbound
github.com/new link, exact settings listed, then paste-the-URL-back. The
answer GRANTS the mini-ruling that a USER-CLICKED external navigation link
is not an outward action under hard stop 3 (the app itself still makes no
un-consented request). App-created repos were not taken; documentation-only
was not taken. P5 carries it.

## D165 — OWNER: walkthroughs extend + a THIRD party script (2026-08-02)

Script 1 gains multiclass entry, the spell section, and a subclass choice;
script 2 gains spell fork authoring; a NEW third script certifies the
party path end-to-end (librarian publishes -> anonymous join by URL ->
refresh -> roster), fixture-backed under PARTY-NO-LIVE-NETWORK. All three
gate before D106. Amends D131's two-script instrument.

## D164 — OWNER: the sitting is a SOLO DISPOSABLE dry run (2026-08-02)

Chosen over table-present-with-export-ritual and reserved-domain. The owner
walks the walkthrough journeys alone through the ngrok tunnel; nothing
built there is kept (browser storage is origin-scoped and dies with the
tunnel URL — the trap is accepted, not worked around). First player hands
touch the app post-publish. sitting.sh's checklist encodes this: no
install-to-home-screen during the sitting, no backup-export ritual.

## D163 — OWNER: roster row = one per PUBLISHED character, newest clone (2026-08-02)

The roster is keyed on the repository publication path and shows the
NEWEST imported clone; superseded clones remain in the character list but
leave the roster. Never-published members get no row (the option was
offered and not taken). Resolves the D157/D62 collision (refresh-clones
would otherwise multiply roster rows). P3's index must therefore map
publication path -> newest local clone.

## D162 — OWNER: all three print appendices OPTIONAL; choices REMEMBERED per character (2026-08-02)

Owner's words: "All optional. Remember preferences per character so
subsequent prints have the same choice." Flavor (D141), full spell text
(D149 — its always-on literal reading is superseded), and verbose audit
(D159) are each opt-in at print time, and the three choices PERSIST per
character (storage rides character_rule_overrides per the W-MC precedent
unless implementation proves otherwise — mint-free expected). CONSEQUENCE,
recorded before implementation: the merged SPELL-SEC design's
SS-BROWSER-NO-WRITE negative control ('persist-print-preference' must
fail) is AMENDED by this ruling — printing may write exactly the
preference rows and nothing else; the control narrows to "no character
mutation beyond the named preference keys", stated in the test, never
silently.

## D161 — OWNER: PRIVATE GITHUB MIRROR authorized (2026-08-02)

Standing outward grant, the second after D150/D160: the supervisor creates
ONE private repository under the owner's account via their gh session and
pushes the FULL private repo (including .claude/) to it, then keeps it
pushed at every merge to main. Scope is exactly this mirror; no other
push, publish, or repo creation is covered. This does not create the D127
public repo and publishes nothing.

## D160 — OWNER: forge spike = GitHub only, via the owner's gh CLI (2026-08-01)

Narrows D150's execution: "Use gh with my account to test GitHub and leave
the rest roughed in for now. I do not have other accounts." The live spike
runs against GitHub only, authenticated through the owner's existing `gh`
CLI session on this machine (a throwaway repo created and destroyed under
that account); the exact request list is still shown to the owner before it
runs. GitLab and Codeberg adapters ship fixtures-roughed-in ONLY —
explicitly marked unverified-against-live in their disclosure — until the
owner has accounts there.

## D159 — OWNER: print compacts ordinary numbers; verbose audit moves to an OPTIONAL appendix (2026-08-01)

Supersedes the print-everything default within D89's constraint: on paper,
CORRECT ordinary numbers drop their per-row reasoning; warnings and
absence statements keep full sentences; the sheet prints one stated line
that source breakdowns are on screen (D89's stated-absence rule). NEW:
printing offers an OPTION to append the verbose text — calculations and
source disclosures — as appendix pages, joining the D141 flavor and D149
spell appendices. D67 exception recorded: on paper the sources are in the
optional appendix, not beside the number; on screen nothing changes.

## D158 — OWNER: homebrew spells get ALL THREE surfaces in v1 (2026-08-01)

Asked fork-button vs full form vs JSON-only; the owner chose ALL of them:
a from-scratch spell authoring form, a "fork this spell" copy-then-edit
button on bundled spells (D45 semantics, new identity), and JSON import
stays. Extends D103's kind list with spells; D133 (no classes) unaffected.
Units join the HA chain after its backend lands.

## D157 — OWNER: party ROSTER view ships in v1 (2026-08-01)

Overrides the taken-for-now deferral: the party page (D156) gains a
read-only roster — every imported party character with name, class/level,
AC, HP max, passive Perception, spell save DC — as a unit after P5. P3's
index carries what the roster needs.

## D156 — OWNER: party features live on their OWN page (2026-08-01)

"Party stuff will need its own page." Pins the party design's existing P5
shape: a dedicated party screen with its own routes
(src/ui/screens/party/ — setup, token paste/forget, publish, refresh,
review, public-reader), never folded into the character list or another
screen. The anon-primary mode (D154), warn-once permanence (D155), and any
future roster view all live there.

## D155 — OWNER: public-repo permanence = warn once at first public publish (2026-08-01)

One-time, per-party plain statement ("public means permanent — git history
survives deletion") before the first publish to a PUBLIC repo. No
per-publish confirm; private-only was not taken. P5 carries it.

## D154 — OWNER: party participation is anon-primary (2026-08-01)

Public repo + tokenless anonymous read is the PRIMARY player path (zero
setup); tokens are for the librarian/owner and any player who wants to
self-publish. The D150 spike's measured anonymous rate limits size the
refresh batching; if the spike shows unlivable limits, that finding comes
back to the owner before the design changes.

## D153 — OWNER: target iOS Safari; probe + banner for the rest (2026-08-01)

Owner's words: "Can we make the app work on iOS Safari as well? (probe+
banner for Firefox and others)". Ruling as taken: iOS Safari becomes a
SUPPORT TARGET pending a local WebKit feasibility spike — the supervisor
runs the existing Playwright suite under the WebKit engine (a local run,
nothing outward; the project addition to playwright config is owner-ordered
scope, not a forbidden path-to-green edit) and reports what breaks. If
feasible, WebKit joins the tested matrix for core flows (amends D109's
chromium-only) and the iOS story is documented as install-to-home-screen
plus backup exports (Safari's 7-day eviction exemption). Every OTHER
non-Chromium browser gets a boot-time capability probe + honest banner
("tested only in Chromium/WebKit; your browser may not work and may lose
data") with a proceed-anyway path. A silent broken page is outlawed (D33).

## D152 — OWNER: printed feature text stays NUMBERS ONLY (2026-08-01)

Chosen over full extraction and over modeled-features-only. No class or
subclass feature text is extracted for v1; the sheet's stated-gap sentence
remains the honest answer. The printout is a numbers reference; the rules
text lives in the player's own materials.

## D151 — OWNER: seed ALL SRD subclasses before the gate (2026-08-01)

Chosen over ship-with-two and table-subset. The SRD 5.2.1 subclass for every
class is extracted and seeded before the D106 gate, as a normal
pinned-extract unit (F6/F27 discipline). Kills the empty-list-at-level-3
experience for ten of twelve classes. D80's proceed-with-warning semantics
stay for genuinely unmade subclasses (homebrew, future content).

## D150 — OWNER: bounded live forge spike AUTHORIZED (2026-08-01)

One outward-facing exception to hard stop 3, owner-granted: a live fixture
spike against THROWAWAY repos on GitHub/GitLab/Codeberg using tokens the
owner creates, to record real API responses (pagination, conflict statuses,
rate-limit headers, error bodies) which are then sanitized into the pinned
adapter fixtures. Conditions: the spike touches only the throwaway repos;
its exact request list is shown to the owner BEFORE it runs; anonymous-read
rate limits get measured in the same spike. Everything else outward remains
stopped.

## D149 — OWNER: caster spell section = sheet section + spell-text appendix; multiclass grouped by class (2026-08-01)

Closes the D87/D54.4 bar gap the panel found (no queued unit built the
spell section). Chosen shape: a compact section on the sheet (name, level,
prepared/known marker, save DC and spell attack stated once); PRINTING
appends full spell text as appendix pages after the sheet, the same
pattern D141 gave long flavor text — one stapled document per player.
OWNER ADDITION, verbatim requirement: "print multiclass spells grouped by
class, order by level and name" — the printed spell section and appendix
group by contributing class, ordered by level then name within each class.
The legacy /characters/:id/print route RETIRES (its stale PHP-era import
instruction dies with it).

## D148 — OWNER: the D106 gate HOLDS in full; no early sitting (2026-08-01)

Asked directly after the panel proved party storage lands at the tail of
the CI mint chain: the owner chose "Hold everything, no early sitting" over
re-cutting v1 and over an early informal sitting. The whole queue drains —
party storage (D145/D146), wizard multiclass (D147, now explicitly INSIDE
the gate), the HA/CI chains, and the new D149/D151 units — then the D128
sitting, then publish. First hands-on use waits for the full queue by the
owner's explicit choice.

## D147 — OWNER: wizard multiclass, BG3-style flow, SRD prereqs + house-rule toggle (2026-08-01)

Supersedes D107's deferral: the level-up wizard SHALL support adding a level
in a new class, with a BG3-like add-class surface on the class step. Rules
posture, owner-chosen from three options: ENFORCE the SRD 5.2 multiclass
prerequisites by default (13+ in the new class's primary ability AND 13+ in
the current class's primary ability; a failing class appears disabled with
the exact shortfall shown, the D119 pattern), plus a per-character
"ignore multiclass prerequisites" HOUSE-RULE TOGGLE that unlocks BG3
behavior — default off, and when on it is recorded visibly on the sheet as a
house rule. Entry proficiencies come from the already-parsed
multiclass-entry-srd.ts grants; slots stay on the effective-caster-level
computation.

Sequencing, owner-chosen: design doc authored and reviewed NOW (parallel
with the cascade); implementation dispatches only after W-D/W-E/W-F merge so
multiclass lands on a complete wizard. Bar item 3 still closes at W-F.

## D146 — OWNER: party v1 = library AND characters; token lives in the session (2026-08-01)

Confirms D145's full reading against the design's scoping alternatives: v1
ships shared library plus player character publish/refresh (all 10 units of
docs/design/2026-08-01-party-storage.md). Pasted tokens live in
sessionStorage with an explicit Forget control — reload survives, ending the
browser session forgets. Durable at-rest storage is NOT taken.

Supervisor took the design's other recommended defaults: a designated
librarian writes library/ while each player writes only their own character
path; one repo per party with top-level library/ and characters/; default
branch only.

## D144 — OWNER: Cloudflare Pages stays the host; NO server-side secret (2026-08-01)

Reaffirms D113 against the GitHub Pages alternative. No Cloudflare Worker, no
OAuth exchange endpoint, no secret to rotate: the site remains pure static
assets. Party-storage authentication is therefore user-pasted tokens only.

## D145 — OWNER: party storage = user tokens against GitHub / GitLab / Codeberg (2026-08-01)

A table shares a library and characters through a repo THEY own, on any of
the three forges, public or private, authenticated by a token the user pastes.
One storage port, three adapters. SHIPS INSIDE v1 — this extends D106's queue
and therefore the gate; publication waits for it.

SUPERVISOR-PROVEN 2026-08-01 (curl with an Origin header, all three returned
`access-control-allow-origin: *`, so a static page can call them):
  api.github.com/rate_limit        HTTP 200
  codeberg.org/api/v1/version      HTTP 200
  gitlab.com/api/v4/version        HTTP 401 (auth required; CORS header present)
Dialects differ and need separate adapters: GitHub and Gitea/Codeberg use
`contents/{path}` with a blob `sha` for optimistic concurrency; GitLab uses
`repository/files/{path}` with `last_commit_id` and a PRIVATE-TOKEN header.

## D143a — SUPERVISOR: the D143 fallback is TAKEN (2026-08-01)

Trigger met. Three D135 review rounds found per-family absence incomplete;
round 3 found the last gap at src/rules/sheet.ts:1760 — the invalid value was
the FAMILY DISCRIMINATOR (base progression_type), so no family could be
trusted, yet both still printed. Per D143's pre-authorization the supervisor
switched WITHOUT asking to the simple rule: ANY invalid or missing spell
content suppresses the ENTIRE spell-slot section, absent-and-stated, one
message. Slots print only when every contributor is complete and valid.
Per-family independence is withdrawn. Tests asserting the superseded rule are
replaced as RULING-DRIVEN changes, not deletions to reach green.

## D143 — OWNER: per-family slot absence, with a pre-authorized simple fallback (2026-07-31)

When catalog content behind one class is invalid, the sheet suppresses only
that spell-slot FAMILY (shared vs Pact) and states why; the other family's
valid rows still print. Partial totals within a family are forbidden — a
broken contributor makes its whole family absent, never a smaller number
(D33). PRE-AUTHORIZED: if the next review round still finds this wrong, the
supervisor switches immediately, without asking again, to the simple rule —
any invalid spell content suppresses the entire spell-slot section with one
stated message.

## D141 — OWNER: long flavor text TRUNCATES on the sheet; appendix pages optional (2026-07-31)

Refines D104's "printed when present". The main character sheet prints
alignment and appearance in full and TRUNCATES backstory/notes with a visible
continuation marker, so the play aid stays short. A separate opt-in prints
the full written text as appendix page(s) after the sheet. Truncation on the
main sheet must always be visibly marked, never silent.

## D142 — OWNER: notes cap rises to 20,000 code points (2026-07-31)

Amends the D104 design's limit table. notes now matches backstory at 20,000
code points; appearance stays 4,000, alignment 120. One toggle, one generous
long-form cap. Raising a cap breaks no stored character; the existing
grandfathered-longer-notes rule is unaffected.

## D140 — OWNER: supervision reporting is TERMINAL-ONLY (2026-07-31)

No push notifications, not even for hard stops or the D106 gate. Everything
lands in the session terminal and the committed state files; the owner
checks in on their own cadence.

## D138 — OWNER: homebrew fix flow gets apply-to-all AND delete-with-characters (2026-07-31)

Amends the HA design's strict lifecycle. (1) The fix-review screen gains an
explicit "apply to all listed characters" action (before/after still shown;
nothing silent). (2) A user may DELETE a homebrew creation along with all
characters attached to it. Mechanism must reconcile with D99
archive-before-purge: the supervisor's taken-for-now reading is that the
cascade archives the creation and its attached characters as one restorable
set, and permanent purge from the archive view purges the set; the HA-11
design work pins the details. Unreferenced published content is deletable.

## D139 — OWNER: character export carries its OWN closure; library export is separate (2026-07-31)

Resolves D81's "all". A single-character export carries exactly the
character's homebrew reference closure — unrelated library content stays
home. A SEPARATE library-export feature allows exporting the whole library
or a selected subset of creations. CI-5's backup format and the HA
portability units implement both.

## D134 — OWNER: Focus Points print as a Remaining-field (2026-07-31)

Closes the S1 default. Monk focus_points joins lay_on_hands and
sorcery_points on the point-pool list: "Remaining: ____ / N" at every level.
Boxes-at-every-level list shrinks accordingly (D123 classification).

## D135 — OWNER: EVERY unit gets a codex review pass before merge (2026-07-31)

The gate ritual gains a mandatory step for the Opus supervision era: after
the supervisor's personal gates and before merge, codex reviews the unit
diff (read-only). Findings are arbitrated by verification; legitimate issues
go back as a fix dispatch; rejected findings are recorded with reasons.

## D136 — OWNER: no circuit breaker; stuck = multi-perspective analysis (2026-07-31)

No automatic strike limit. When the supervisor judges itself stuck, it must
FIRST run independent analyses from several perspectives (opus + sol
read-only agents with different lenses), reconcile them, and only then
decide: continue, re-dispatch, or stop and wait for the owner.

## D137 — OWNER: Opus attempts the WHOLE queue including HA/CI (2026-07-31)

No check-in gate before HA-1. The Opus supervisor drives the full queue to
the D106 gate per the handover plan.

## D122 — OWNER: print pins US Letter (2026-07-31)

The print stylesheet declares @page size: letter. Box grids stay inch-specified.

## D123 — OWNER: resource print SHAPE-BY-TYPE (2026-07-31)

Amends the D91 design's 30-box threshold and refines D120's tick-box letter.
Discrete-use resources (Rage, Channel Divinity, Bardic Inspiration, ...) print
numbered boxes at EVERY level. Point pools (Lay on Hands, Sorcery Points-style
totals) print "Remaining: ____ / N" at EVERY level. A resource never changes
print shape mid-career; boxes always mean uses, never points.

## D124 — OWNER: flavor share is ONE opt-in toggle + size guard (2026-07-31)

Amends the D104 design's verbatim/opt-in split. One "include my written text"
share option covers alignment/appearance/backstory/notes, default OFF (D37
generalized). The share flow shows an explicit error when the encoded link
exceeds workable size — never a silently truncated or broken link. Before
implementation: a Chromium experiment measuring practical URL capacity for
?param vs #fragment transports, results recorded.

## D125 — OWNER: print attribution = last page + origin line (2026-07-31)

Closes the finding that printed sheets carry NO SRD notice while our own
ATTRIBUTION.md requires one. The printout gains a notice block on the last
page plus "Printed from SRD-55 <build id>". The same fixlet corrects
legal.ts's false claim that spell text comes only from user-imported catalogs
(bundled since D43/D45).

## D126 — OWNER: code is MIT, SRD split stated (2026-07-31)

LICENSE = MIT for our code; LICENSE and README state explicitly that
docs/srd/** is CC-BY-4.0 with its own attribution obligations. One file must
never imply the SRD was relicensed.

## D127 — OWNER: public repo is a CURATED SQUASH (2026-07-31)

Publication = a fresh repo with one initial commit: code + docs/srd +
user-facing docs. The process record (.claude/, orchestration/, progress/,
internal design docs, full history) stays in the private repo. Reversible
upward only: more can be published later, never less.

## D128 — OWNER: the D121 sitting runs on ngrok-tunneled localhost (2026-07-31)

Publish prep creates NOTHING outward. The owner's manual walkthrough runs
against a local server exposed via ngrok (walkable from any device, including
a phone). Repo creation and the Cloudflare deploy happen only at the explicit
go, via direct upload — Git-integration auto-publish is never wired.

## D129 — OWNER: pre-alpha banner + NOINDEX until the flip (2026-07-31)

The published app carries a persistent one-line banner ("Pre-alpha. Updates
can break saved characters. Export a backup."), a visible build identifier in
the footer, and robots/noindex until the owner announces the D60 flip —
shareable by link, not discoverable.

## D130 — OWNER: Chromium on ANY viewport; responsive pass enters the queue (2026-07-31)

Resolves the D109/D98 contradiction toward support: a responsive unit for the
guided builder and sheet enters the queue before the gate. The PWA install
invitation stays honest; the ngrok phone walkthrough must work.

## D131 — OWNER: a SECOND walkthrough script gates the queued features (2026-07-31)

One added Playwright walkthrough — author a species, build a character with
it, archive, duplicate, print — becomes part of the acceptance instrument.
The D54/D112 script stays untouched.

## D132 — OWNER: issues ON, PRs NOT ACCEPTED (2026-07-31)

The public repo opens issues with a template (browser, build id, steps).
CONTRIBUTING states PRs are not accepted and why (supervised protocol; every
change needs a ruling). The app footer links to the repo. SRD stays pinned at
5.2.1 until the owner rules otherwise.

## D133 — OWNER: NO homebrew classes, ever in v1; subclasses stay (2026-07-31)

Full-class authoring is out of scope ("too much going on") — which the HA
design already pinned (classes bundled-only). Subclass authoring for existing
classes stays in v1. With that explicit, D106's whole-queue gate stands with
the HA chain as designed.

## D118 — OWNER: deferred Epic Boon = player's choice at Level Up (2026-07-31)

Supersedes the OQ-1 taken-default (resolve-first pass). On Level Up with a
deferred Epic Boon, present BOTH options: resolve it now, or proceed to the
next level with the warning intact. Neither is forced. W-A's epic_resolution
state variant needs rework: expose both availabilities; the UI offers a choice.

## D119 — OWNER: unknown hit die DISABLES the class in guided level-up (2026-07-31)

Supersedes the OQ-2 taken-default (allow with absent HP). A class with no
recorded hit die is NOT guideable: its option is disabled with the explanation
that fixed HP cannot be derived until the class is repaired/catalogued. The
never-display-a-guessed-die rule stands (D33). W-A rework required.

## D120 — OWNER: D91 EXTENDS to formula resources (2026-07-31)

Amends D91's scope. Beyond the eight level-table ladders, model typed formula
maxima so they too print numbered tick-boxes: ability-modifier forms
(Bardic Inspiration max(1, Cha mod), Tireless/Nature's Veil max(1, Wis mod)),
per-level forms (Lay on Hands 5 x Paladin level), and fixed feature counts in
the licensed inventory (design doc section 2.4). Computed-or-absent (D33)
still governs; nothing outside licensed sources. D91 design doc needs a
formula-vocabulary addendum before Unit M dispatches.

## D121 — OWNER: publish waits for the owner's manual walkthrough (2026-07-31)

After the D106 gate (queue drained + D112 walkthrough green), prep the D113
publish completely and STOP. The owner does a manual sitting first. Publishing
remains outward-facing and needs the explicit go.

## D117 — OWNER: v1-vs-v2 comparison = the SAME CHARACTER BUILT IN BOTH (2026-07-30)

When v2 is done, build an identical character in both and record every
divergence. Nothing else is produced for the comparison during v1. Not in the
v1 gate (needs v2).

## D116 — OWNER: backup nudge is a ONE-TIME HINT (2026-07-30)

One dismissible prompt after the first character completes level 1
("characters live only in this browser — download a backup"). Never repeats.
No staleness reminders. In the v1 gate (D106).

## D115 — OWNER: SRD 5.1 stays IMPORT-ONLY (2026-07-30)

Bundle 5.2 only; imported 2014 spells/subclasses supported and edition-tagged.
Closes the question D49 flagged.

## D114 — OWNER: the app is named SRD-55 (2026-07-30)

Manifest, title, package, public domain: **SRD-55**. "D&D"/"Dungeons &
Dragons" stay out of name/manifest/domain (CC-BY licenses content, not marks);
they appear only inside the required SRD attribution. Rename pass is in the
gate.

## D113 — OWNER: publish = CLOUDFLARE STATIC SITE, PUBLIC GITHUB REPO (2026-07-30)

Destination, not moment: push/publish remain owner-gated hard stops. Cloudflare
serves at root, so root-absolute SW registration works; `import.meta.env.
BASE_URL` registration fix taken anyway as a reversible default.

## D112 — OWNER: acceptance gate = the SCRIPTED WALKTHROUGH (2026-07-30)

An unassisted Playwright walkthrough of the five D54 items passing end-to-end
IS the acceptance gate. The owner's personal sitting is not required.

## D111 — OWNER: the planner is an ADVANCED DOOR (2026-07-30)

Fully functional, labelled/positioned as advanced. Guided flows and the sheet
are the primary surfaces.

## D110 — OWNER: D60 flips ONLY on explicit announcement (2026-07-30)

Pre-alpha data-loss tolerance holds regardless of deploys, sittings, or the
queue draining, until the owner explicitly announces the flip.

## D109 — OWNER: browser matrix is CHROMIUM ONLY, TESTED (2026-07-30)

No Firefox/WebKit project for v1. Firefox/Safari/mobile are explicitly
unsupported, not best-effort-implied.

## D108 — OWNER: a11y = KEYBOARD + LABELS, NO AUDIT (2026-07-30)

Keyboard-operable everything, labelled controls, focus trapped/restored in
modals, no colour-only signalling — built into new UI as written, not
retrofitted. No formal WCAG audit/tooling/screen-reader matrix in v1.

## D107 — OWNER: D54.3 AMENDED — planner-only multiclass satisfies v1 (2026-07-30)

Straight-class wizard satisfies the bar; multiclass entry stays a planner
operation for v1. D49's "wizard should handle multiclass, but warn" is
deferred beyond v1; "including a multiclass level" is struck from D54.3.

## D106 — OWNER: the v1 gate is the WHOLE QUEUE (2026-07-30)

v1 is done when every queued unit is merged — CI-2a..CI-8, wizard GF-0/GF-1 +
wizard, D90 Expertise, D91 maxima, D104 flavor, D99 archive/duplicate, D102
disclosure, D103 forms, plus D114 rename, D116 hint, D113 BASE_URL — AND the
D112 walkthrough passes. D54's "anything else is polish" no longer defines the
gate.

## D105 — OWNER: parallel worktrees, as many as needed (2026-07-30)

Parallel codex units in disjoint worktrees; one browser suite per worktree on
unique ports. NOT relaxed: wire mints serialize (one mint-carrying lane at a
time); every merge passes supervisor gates; the merge queue is serial.

## D104 — OWNER: flavor layer is TEXT FIELDS ONLY (2026-07-30)

Optional alignment/appearance/backstory/notes text — stored, exported, printed
when present. No portrait, no XP tracking (D88). Hostile-string discipline
(D4): rendered visibly, marked unverified, never entering structured facts.

## D103 — OWNER: v1 ships authoring FORMS for species, subclass, background (2026-07-30)

In-app forms over the template machinery. Classes stay SRD-only. Authored
content is homebrew-marked, carries derived identity (D82), uses the one
effect vocabulary (D72) — a field per effect kind, no free-numeric side
channels. Needs its own plan. JSON import not ruled in by this.

## D102 — OWNER: languages and tools NOT modelled in v1 (2026-07-30)

No structured facts, no choice steps, no sheet lines. Granting features' text
shows; the gap is stated per D33.

## D101 — OWNER: ASI levels offer the FULL feat choice (2026-07-30)

At every ASI level (per-class, from seeded data, D78): the ASI feat OR any
qualifying feat from all 17 sourced SRD feats; prerequisites from sourced
text; repeatable flags honoured. Numeric grants ride the existing effects
vocabulary; anything inexpressible renders as stated feature text absent from
the numbers (D33). ASI is one feat among equals.

## D100 — OWNER: no performance bar in v1 (2026-07-30)

No budget, floor, or harness. Revisit only if someone feels slowness.

## D99 — OWNER: archive before purge; the list gets Duplicate (2026-07-30)

Delete moves to a hidden restorable archive; permanent purge only inside the
archive view. Duplicate = the D62 export-import clone run locally, named
visibly.

## D98 — OWNER: v1 is an installable, offline PWA with eviction protection (2026-07-30)

Manifest (installable); service worker caching the app's own files with a
deliberate refresh-to-update pattern; `navigator.storage.persist()` requested
with HONEST UI when refused (D33 applies to durability claims).

## D97 — OWNER: level deletion without undo data = best-effort reconstruction (2026-07-30)

Without a stored inverse: remove what the level granted, then reconstruct via
the SAME reconciliation engine import uses (one engine, two callers). Total
character level never reaches 0 (deleting a secondary class's only level stays
legal — that is class removal). Multiclass skill keep-vs-lose resolved by
provenance; sole-grantor loss follows tombstone-and-warn (D70), never silent.

## D96 — OWNER: multiclass ability minimums WARN and ALLOW (2026-07-30)

Unmet sourced minimums permitted everywhere; permanent (D95) warning on wizard
step and sheet naming the unmet minimum. No grey-out, no refusal.

## D95 — OWNER: warnings are PERMANENT — no acknowledgment state (2026-07-30)

Full size for as long as the condition holds, on screen and in print. Zero
warning-state storage. A warning leaves only when its condition stops being
true.

## D94 — OWNER: undo-last-level-up lives in the DB, and ONLY the DB (2026-07-30)

Persisted inverse, repeatable back level by level. Share wire and portable
backups never carry it; an imported character's levels are facts. A raw DB
image naturally contains the stack; the audit accepts absent/present/partial.

## D93 — OWNER: the armadillo homebrews are TESTS ONLY (2026-07-30)

D79 fixtures stay in the test suite. No bundled demo pack.

## D92 — OWNER: attunement is THREE SCHEMA-ENFORCED SLOTS + replace modal (2026-07-30)

`slot_1/2/3_item_id` columns on a per-character table (owner explicitly chose
the three-column form over one-column; rejected), composite cross-character-
guarded FKs to `character_items`, NULL = empty. Fourth attunement is
unrepresentable. Attune-when-full opens a replace modal. The old `attuned`
boolean inverted into slot membership. Cap-raising is OUT for v1.

## D91 — OWNER: sheet prints resource maxima with empty tick-boxes (2026-07-30)

Maxima computed from seeded class tables (Rage, Focus, Channel Divinity,
multiclass slot table); spending is pencil work (D88). Computed-or-absent-and-
stated, never recited (D33).

## D90 — OWNER: Expertise is modelled, every granting class, chosen AFTER all skills (2026-07-30)

Sourced from the committed SRD, never memory. Ordering pinned: offered only
after species/class/background skills are settled. `no_expertise` disclosure
DELETED when it lands. Removed underlying proficiency follows tombstone/warn.

## D89 — OWNER: the v1 printout is a print stylesheet over the sheet route (2026-07-30)

One column, chrome suppressed, D88 empty current-HP box in print, browser
print-to-PDF. Classic two-page form is NOT v1. Hover-only content needs a
printable fallback or must state its absence.

## D88 — OWNER: play-state stays on paper — no current HP in v1 (2026-07-30)

Sheet prints max HP (D77) and an empty current-HP box. No current/temp
HP or death-save storage.

## D87 — OWNER: spells are IN v1's bar (2026-07-30)

Guided creation gains level-1 spell screens; the level-up wizard gains
new-level picks and swaps. Machinery = existing spell_selection_slots + grant
rules (one command layer, D71). D54.4 includes a caster's spell section.

## D86 — OWNER: character_items holds plain possessions, WITH quantity (2026-07-30)

Rows with zero effects are fine. `quantity` NOT NULL DEFAULT 1 CHECK ≥1; three
potions are one row. Still out: encumbrance, coins, weight, containers.
(Shipped: migration 0018, wire v12.)

## D85 — OWNER: the wizard is the Level-Up button (2026-07-30)

Sheet and character list carry a Level Up button entering the wizard, one
level per pass. Planner remains a full writer; both write through one command
layer (D71).

## D84 — OWNER: SRD matches by catalog key FIRST, fingerprint fallback only (2026-07-30)

Extraction fixes never change identity. Fingerprint consulted only when key
matching fails; fallback matches surface in the D82 modal.

## D83 — OWNER: ability_override; increases may pass 20; boons may SET (2026-07-30)

Three distinct mechanics: (1) `ability_override` SET-with-floor (highest
set-to wins, never lowers); (2) increase past 20 via the existing per-effect
`maximum` (1..30); (3) boon SET = same kind, source via source_instance_id.
Resolution order is exact: base → increases (each capped by its own maximum)
→ overrides (max of set-to, floored at the increased score). Shipped:
migration 0019, wire v13, merged `713bcc7`.

## D82 — OWNER: one identity rule for ALL content + match-review modal with clone (2026-07-30)

Derived identity covers imports, forks and hand-made homebrew alike. Import
shows a modal listing everything about to be adopted under an existing derived
identity, each offering "clone instead". Default = MATCH; the Nth import of
the same character converges to zero new rows and does not re-ask.

## D81 — OWNER: full JSON export carries non-SRD content; identity is DERIVED (2026-07-30)

The export carries the definitions choices point at. Identity = numeric/
logical properties + name normalised case-insensitively without
non-alphanumerics. Acceptance: two people import the same book; opening each
other's exports duplicates nothing. A derived key is a FROZEN CONTRACT (D41
discipline). Licensing unchanged: only what lands in git matters (D59).

## D80 — SUPERVISOR: the level-3 subclass refusal is STRUCK; D70 governs (2026-07-29)

Only two subclasses are seeded, so the refusal was a dead end for ten classes.
Level 3 proceeds; the unmade subclass is a D70 warning and a sheet gap.
Refusals: `class_not_held`, `level_not_adjacent`, `ability_increase_required`.

## D79 — OWNER: the homebrew species is an ARMADILLO, not a turtle (2026-07-29)

Tortle is published non-SRD content; a "turtle" homebrew invites confusion and
the wrong side of D59. Renames across the D72–D76 fixture set; mechanics
unchanged. Label: "Armadillo Shell (13 + DEX)".

## D78 — SUPERVISOR CORRECTION: ASI levels are PER-CLASS, not a union (2026-07-29)

4/8/12/16 for ten classes; Fighter adds 6 and 14; Rogue adds 10. ASI levels
are READ FROM SEEDED DATA, never hardcoded — that pin is what caught my wrong
union. (Sorcerer's table wraps "Ability Score / Improvement" across lines;
parsers must handle the wrap.)

## D77 — OWNER: FIXED HIT POINTS ONLY. REVERSES D66 (2026-07-29)

HP per level past first = die/2+1 + CON, always. No rolling offered, nothing
to record. `character_hit_point_rolls`/`SetHitPointRollCommand` are unused but
their retirement is a separate decision, not taken here.

## D76 — OWNER: warn on a STRICT AC reduction only; a tie is not a reduction (2026-07-29)

Warning predicate: new total < previous total, at equip time. The exclusion
DISCLOSURE (D74/D75) is a separate surface, always shown when a formula is
excluded. Wiring one to the other's predicate breaks both. Warning never
blocks (D49).

## D75 — OWNER: a shield can CHANGE THE BASE (2026-07-29)

The shield is part of ELIGIBILITY, not a late addend. The floor 10+DEX is
always eligible while unarmoured. Worked case: Monk DEX+3/WIS+3 with shield =
13+2 = **15**, not 18 — picking up a shield can make you worse and that is
correct. Sheet explains the exclusion; warn, never block.

## D74 — OWNER: a broken condition EXCLUDES a formula outright (2026-07-29)

Eligibility first, value second: discard formulas whose conditions fail
(armour worn, shield with allows_shield=false), then apply D73 to what
remains. A lower AC from the player's choice is legitimate and honoured. The
sheet names the excluded formula and why. Warn, never block or auto-swap.

## D73 — OWNER: AC resolver with a stated tie-break; proficiency counts (2026-07-29)

Highest eligible total wins; `armor_class_bonus` and shield apply on top.
Tie-break: worn armour → species → subclass → class → item, then label
alphabetically (stable under import id-remap). Ties are disclosed. Proficiency
does NOT gate armour AC — non-proficient armour keeps its AC with the SRD
penalty STATED; non-proficient weapons lose the proficiency bonus (label and
number must agree); attunement is a separate gate on the same row.

## D72 — OWNER: items are THINGS, effects are the ONE vocabulary (2026-07-29)

`character_armor`/`character_weapons` stay (they carry unique mechanics).
`character_items` is for things that only modify — no numeric columns; every
numeric change is a `character_effects` row. Kinds added: `armor_class_bonus`,
`armor_class_formula` (base + up to two abilities + allows_shield),
`attack_ability_override`, `weapon_attack_bonus`, `weapon_damage_bonus`.
Unarmoured defence formulas COMPETE, highest wins, loser disclosed.
`character_sheet_adjustments.armor_class_adjustment` retired into an effect.
New kinds are a migration + wire mint (D41) — the known tax.

## D71 — OWNER: double-submit is the UI's problem; unknown_origin stays one reason (2026-07-29)

Creation stays non-idempotent; the control is a disabled button. The
equipment re-confirm no-op stays (intent guard, not click guard). No
`origin_not_bundled` split.

## D70 — OWNER: an unmade choice is a SAVEABLE state; it WARNS in wizard AND sheet (2026-07-29)

Incomplete characters save, reload and share. Outstanding choices become
NAMED sheet gaps (not one "incomplete" flag), text derived from the one
completeness vocabulary (F22). A warning is never a block.

## D69 — OWNER: weapons carry NO provenance; anyone adds any weapon; warn on non-proficiency (2026-07-29)

Struck E-A's provenance stamp (weapons and armour). No gating; the
non-proficient warning already existed and stands. Equipment step still mints
package weapons/armour, arriving unowned. Option-switch no longer cleans up —
the player removes what they don't want. Skills provenance STANDS (a recorded
choice differs from an object on a list).

## D68 — OWNER: choosing background feat/ASI is NOT a house rule; mark the DEFAULTS (2026-07-29)

Amends D61: the SRD's printed pairing is the marked default; both are
selectable; nothing is labelled homebrew/departure — those labels are DELETED.
A comment at `src/builder/background-choices.ts` says so, by instruction.

## D67 — OWNER: sheet shows the FINAL NUMBER; sources on hover or touch (2026-07-29)

Every derived number carries a reveal naming the sources that summed to it —
hover for pointer, touch for touch; both are requirements. D33 stands: an
UNKNOWN says unknown on the face of the sheet, not only in a reveal.

## D66 — REVERSED by D77 (was: fixed HP default with per-level rolling)

## D65 — OWNER: starting equipment is a NAMED PACKAGE CHOICE, not owned items (2026-07-29)

The choice is recorded structurally; weapons/armour in the package still
become owned rows (the sheet computes from them); gear renders from the rules
tables, never owned; no gold (D56). The sheet SAYS gear is not itemised (D33).

## D64 — OWNER: standard array default, everything else WARNS; initiative must be correct (2026-07-28)

Point buy and manual entry warn, never block; all-10s is valid; weakness
warning when fewer than two abilities have modifier ≥ +2 (score 14+). Every
initiative-changing source is modelled — same additive-contribution shape as
abilities (D63), built once.

## D63 — OWNER: ability increases are an ADDITIVE LAYER; every species modelled (2026-07-28)

Scores = base + contributions, each knowing its source; base is never
overwritten; removing a source subtracts exactly what it added. All species
get domain modelling (elf's three lineages and spellcasting-ability choice,
dwarf HP, human extra feat/skill are examples, not the list).

## D62 — OWNER: import CLONES into a new character with a new UUID (2026-07-28)

The document's UUID is provenance only (the one guaranteed-unique attribute).
Import mints fresh; importing twice yields two clones, correctly.

## D61 — OWNER: background is REQUIRED; feat and ASI are the player's choice (2026-07-28)

No skip in the builder. The printed feat/increases remain visible as the
SRD's suggestion. (Labelling-as-departure struck by D68.)

## D60 — OWNER: no users, so backward compatibility is not a constraint (2026-07-28)

Zero users, zero exports: "this would break existing documents" is VOID until
a real person creates a character (flip condition: D110). Still forbidden on
their own terms: an export its own importer refuses; losing user data once
users exist.

## D59 — OWNER: the licensing test is AUTHORIZATION, not copyright (2026-07-28)

**Never commit a work we are not licensed to redistribute.** SRD 5.2 CC-BY
(attribution intact), MIT, Apache are fine. PHB text is not. Corrects D58's
wording.

## D58 — SUPERSEDED by D59's wording (was: "copyrighted content never committed"). Surviving rule: only what lands in git matters; user imports/exports/links are not a licensing concern.

## D57 — OWNER: the import ban is about what WE distribute (2026-07-28)

Imported rules text never reaches the repo, git, or dist. What the user
holds/imports/exports locally is their business. A share link we mint is on
our side (D3 governs it).

## D56 — OWNER: package-only equipment; lineage spells are real; straight before multiclass (2026-07-28)

No gold alternative. Lineage spells must actually be granted (seed
`species_definitions.grant_rules`, write a source instance, call the existing
generator). Straight-class level-up ships before multiclass entry (sequencing;
does not amend D49 — since deferred further by D107).

## D55 — OWNER: no Roll in Order; abilities after class; random character shelved (2026-07-28)

Roll in Order is gone everywhere (settles D47↔D50). Step order:
**class → abilities → species → background → skills → equipment.** The
abilities step allocates BASE scores and says so; background increases land on
top (D63).

## D54 — OWNER: v1 is NOT frozen; finish to USABLE (2026-07-28)

The bar — a person who knows D&D but not this app can, in one sitting,
without a dead end: (1) create class-first (D48); (2) finish level 1 (species,
background, skills, abilities, equipment); (3) level up [multiclass struck by
D107]; (4) read a right-numbered sheet, unknowns SAY unknown (D33), including
a caster's spell section (D87); (5) not lose the character on reload.
The SHIP GATE is now D106 (whole queue) + D112 (scripted walkthrough).
v1 must NOT be reshaped toward v2 — the comparison (D117) needs two genuinely
different things.

## D53 — OWNER: feats are two numbers plus a grouping (2026-07-28)

`min_level` (General 4, Epic Boon 19, Origin/Fighting Style none) and
`ability_points` (0/1/2; ASI's 2 is POINTS). Fighting Style gates via
`prerequisites`, not a category. The no-ASI warning drives off
`ability_points = 0`. Alert at level 4 is LEGAL ("another feat of your choice
for which you qualify") — my contrary premise was wrong.

## D52 — OWNER: the wizard refuses homebrew classes; no real characters exist (2026-07-28)

The wizard cannot prove proficiencies for an unseeded class, so it declines to
guide it; import/planner still hold it (D11). Fixture DATA may be rebuilt;
deleting a TEST to reach green remains forbidden.

## F27 — a citation is not a checksum (2026-07-28)

Class progression numbers carried an SRD citation but no extract, checksum, or
tying test. Rule: the builder must not enforce counts it cannot trace to a
committed source; extract + pin + assert before enforcement.

## D51 — OWNER: ASI is a feat; most feats are text; three kinds earn structure (2026-07-28)

Feats granting a fighting style, weapon mastery, or skills are modelled
(D26/D35 test); War Caster stays text. (Shape refined by D53; catalog by
D101.)

## D50 — SUPERSEDED by D55 (was: Roll in Order behind a random-character button).

## D49 — OWNER: 2014 is real for spells and subclasses; wizard multiclasses with a warning (2026-07-28)

Import-only for 2014 content (confirmed by D115). Complexity → WARN;
failed prerequisite → BLOCK (D11). The multiclass wizard itself is deferred
beyond v1 (D107).

## D48 — OWNER: CLASS IS THE FIRST STEP (2026-07-28)

The character row is created when the class is chosen; there is no pre-class
draft state to store. (Step order after class since fixed by D55.)

## D47 — OWNER: ability methods, and the house rule names NOBODY (2026-07-28)

Standard Array / Random Generation / Point Cost (the SRD's own names) are
sourced and checksummed. The fourth (roll-in-order house rule) was later
dropped entirely (D55). Standing rule kept: the variant names no person, and a
house rule is never dressed as SRD content.

## D46 — OWNER: a share link stays a REFERENCE; the export is complete (2026-07-28)

Links degrade missing spells to placeholders, no wire bump; the full JSON
export carries user-authored content (widened to ALL non-SRD content by D81).
Links and exports have DIFFERENT completeness guarantees and the UI must say
so at the moment of sharing.

## F26 — a truncated extract becomes fabricated data (2026-07-28)

Five classes' Starting Equipment cut mid-word in a merged extract. Binding:
Starting Equipment gets its own extract, wide enough, with per-class fixtures
asserting no line ends mid-word. A count of twelve is not evidence (F16).

## F25 — characterLevel() returns number | null; a mutation is not applied until PROVEN applied (2026-07-28)

Seven divergent total-level sites collapsed into one function; null = no class
rows, handled explicitly everywhere. Assert the replacement count or grep the
mutated file BEFORE running the suite (RULE 8: a mutation harness is an
instrument; "0 failed" is a zero).

## F24 — a freeze guard must pin FILE BYTES, not a derived object (2026-07-28)

Hashing the schema object let a type edit into a frozen module pass green.
Historical wire modules are pinned by content SHA. Never burn a wire version
on an unreviewed design; SRD prose never enters share URLs; a fork travels by
key exactly as imported homebrew does.

## F23 — merges run from the MAIN worktree (2026-07-28)

Merging from the branch's own worktree merges it into itself: "Already up to
date." from a merge you expect to do work is a FAILURE message. Remove a
worktree only after the merge is confirmed on main.

## D45 — OWNER: the SRD catalogue is read-only; customising FORKS it (2026-07-27)

SRD rows ship with `srd` provenance, refuse edit/delete, and survive user
imports. Customisation is copy-then-edit under a new name and identity —
a fork is an ordinary spell row, no layer resolution. The SRD layer is
replaceable on upgrade.

## D44 — OWNER: the player picks the multiclass skill; instruments are text (2026-07-27)

Choice offered in the UI from the closed skills vocabulary; Ranger/Rogue bound
to their class list, Bard unbounded — `multiclass_skill_choice_pool/count`
already model this. Already-held skills are excluded from the offer.

## F22 — one rule written twice drifts; ask for the mutation, not tidiness (2026-07-27)

"Do not duplicate the logic" is unreviewable — duplication hides at whatever
granularity wasn't named. Reviewable: mutating either expression of a rule
must fail a test. Also: capture suite output to a file (tail loses the exit
code and the detail); boundary fixtures must test the edges BETWEEN states.

## F21 — an unexercised ordering is unprotected (2026-07-27)

The migration runner's FK ordering survived every test because no test
migration rebuilt a RESTRICT parent. A fixture doing so is required before the
ordering counts as covered.

## D43 — OWNER: the app ships an SRD spell catalogue (2026-07-27)

Supersedes "repo ships NO spell catalog". SRD 5.2 spells are CC-BY like
everything else bundled; attribution intact. Homebrew import coexists.

## D42 — OWNER: the wizard is the front door; class is a precondition; the builder equips (2026-07-27)

Class-less characters are prevented, not rendered (undetermined only
mid-flow; import stays tolerant). The wizard REPLACES "New character". Level 1
first; a comprehensive per-level wizard is committed. The builder offers
weapons/armour (focus and packs are the table's problem); equipment sits after
abilities because the right kit depends on them; a new class re-opens the kit
SUGGESTION (never rewrites choices); weapons that only work with True Strike/
Shillelagh/Pact of the Blade get a NOTE. Legality blocks; suitability only
speaks.

## F20 — the SQLite rebuild dance, measured (2026-07-27)

drizzle-kit emits the rebuild for CHECK-bearing tables; drop-plus-add needs a
TTY so migrations are two generated steps with the data transform between.
`PRAGMA foreign_keys=OFF` is a silent no-op inside a transaction — set it
BEFORE `BEGIN`; run `PRAGMA foreign_key_check` before COMMIT.

## D41 — OWNER: the share wire is a FROZEN VERSIONED REGISTRY (2026-07-27)

One version per export on `root[1]`. Each version freezes exactly as shipped;
never edit an existing version; every change mints the next version with an
adjacent migration. Rejecting an old link is not a migration; a removed field
is mapped or discarded through a dedicated assertion. Legacy variants exist
only for migration and are unmintable by a fresh encode.

## F19 — a zero from an instrument pointed at nothing looks like a clean pass (2026-07-27)

`tsc` on the solution tsconfig compiles NOTHING and exits 0 — the compile gate
is `tsconfig.app.json`. The declaration-emit guard asserts diagnostics AND
>100 emitted files. `git checkout <path>` restores to HEAD, not to what you
were holding — revert mutations by inverting the exact edit.

## D40 — OWNER: the structured-values collisions, answered (2026-07-27)

Range text survives verbatim beside structure; area gets a nullable secondary
dimension; six area shapes (…+ Emanation, Cube); material cost = boolean +
verbatim text (no cp integer); `coin` kind DROPPED (a 50gp line item is text);
`armor` kind KEPT (AC needs it); parenthetical qualifiers verbatim; ranged
weapons carry near/far distances.

## D39 — weapon damage is a discriminated union (2026-07-27)

`dice | flat | custom | not_recorded`; versatile adds `not_applicable`. Free
text survives under `custom`. The production wire arity of the day must be
pinned by a frozen fixture minted from main's own encoder — a new constant
arriving green is where green means least.

## D38 — vocabularies are typed PER TABLE (2026-07-27)

CHECK-closed where only our seeder writes (species templates); branded
passthrough where a user can reach (catalog, character copies). One brand per
vocabulary so a custom damage type cannot flow into a school column.

## D37 — OWNER: character notes travel OPT-IN (2026-07-27)

Default OFF (existing links carry none). The portability map gained `opt_in`,
keyed by the ShareExportOptions flag name, proven by two round trips (flag on
and off). Rows-opt-in (loadouts, acknowledgements) stay `verbatim` columns.

## D36 — OWNER: upcasting is SLOT levels and the LIST is the point (2026-07-27)

A spell that upcasts every other slot level needs the list; bounds 1..9.
Cantrip Upgrade is a different mechanic: own table, CHARACTER level 1..20.
`upcastScale` is refused BY NAME, not silently dropped.

## D35 — OWNER: D26 AMENDED — structure if it changes a sheet number OR makes the catalog searchable (2026-07-27)

The second limb asks: would a player plausibly search or sort by this? Still
not a simulator; every D26 refusal was for being adjudication and stands.

## F18 — the structured-values revision (2026-07-27)

NUL bytes are written as `\u0000` escapes, never literal (F14). A partial
parse keeps what it read (`Self (…)` keeps `self`, stores no area). Fills
never overwrite and are all-or-nothing. Enum casts at the SQL boundary are
validated where they feed a no-default switch. Quantities live in one column.

## F17 — anchor into this file by D/F NUMBER, never by line (2026-07-27)

The log grows at the top, so every line anchor is invalidated by construction.
A D-reference must resolve to a real heading (stronger than line-bounding).

## F16 — verify the THING, not the shape of the thing (2026-07-27)

State the claim as a sentence about BEHAVIOUR, ask what would falsify it, and
read that. A count is not an enumeration; a validated instrument pointed at
the wrong question returns a confident wrong answer.

## F15 — agent-facing surfaces must be BOUND to live data (2026-07-27)

The agent reference under-claimed capabilities and a test pinned the false
claim. Gap lists are derived from `SHEET_GAPS` with a guard; an anchor
resolving says nothing about the claim being true.

## F14 — three source files were invisible to grep (2026-07-27)

Literal NUL separators made files read as `data`. The NUL separator is right;
its spelling is `\u0000`. `tests/unit/source-is-greppable.test.ts` guards all
tracked files (binary exemptions must stay tracked AND contain a NUL).

## D34 — DieSize exists; the martial-arts d4 was unsourced (2026-07-27)

`dieSizes = [4,6,8,10,12,20,100]`; `hitDieSizes` [6,8,10,12];
`martialArtsDieSizes` dropped the 4 — `1d4` occurs nowhere in the extract; the
4 was 2014 memory. Subsets stay separate declarations. Runtime checks live at
the boundary untrusted integers cross; a stored out-of-vocabulary die reads as
NO die with a stated assumption. The compile proof is a probe file that must
NOT compile.

## D33 — a DISCLOSED wrong number is still a wrong number (2026-07-27)

The proficiency bonus is WITHHELD from a not-proficient weapon (both screens
answer from one union). `category_not_stated` keeps the bonus with the
assumption printed (tightening would invent a new wrong number for imports).
Prototype-polluting object-literal lookups became Maps.

## D32 — multiclass entry grants are content (2026-07-27)

Twelve sourced rows: entry grants flagged per-row on the existing set tables
(subset invariant structural); skills as pool+count scalars with a CHECK
making incoherent pairs unstorable; a mis-parse fails the seed. The weapon
share tuple gained backward tolerance; `ADDED_ROW_COLUMNS` mirrors
`RETIRED_ROW_COLUMNS` for historical documents.

## F13 — the concentration/ritual regexes are gone (2026-07-27)

Both booleans are required fields, so the regex could only OVERRIDE an
explicit declaration — and only for one spelling. The declaration is
authoritative; the test pins the DECISION (a fixed regex also fails).

## F12 — the two die CHECKs are different DOMAINS (2026-07-27)

Hit die and martial-arts die are different subjects, not a disagreement.
(Corrected by D34: being different does not make either set correct — check
against the source.)

## D30 — column portability is a DECISION made in the diff that adds the column (2026-07-27)

Every share-table column is classified in a map keyed by
`ColumnNamesOf<N>` — an unclassified column is a compile error; a real
round-trip proves both directions. Backup/snapshot paths are generic
(`SELECT *` + `Object.keys`) and get a genericity proof instead of a map.

## F11 — the character's own level was the least-constrained level (2026-07-27)

`character_class_levels.level` is bounded by the row CONTRACT (`classLevel`
1..20), not a CHECK (a fixture inserts 21 deliberately). Combined total ≤ 20
is a sheet warning, never an import refusal (D11). Contracts gate export too:
no state exists where export emits what import refuses.

## D29 — the Laravel parity scaffolding is gone (2026-07-26)

Column TYPE is pinned as AFFINITY, not declared keyword. When removing
machinery, enumerate what it happened to cover and re-home each piece
deliberately — the fifth of five here was covered by accident and nothing
noticed for three commits.

## D28 — OWNER: warn rather than refuse; multiclass proficiency is a UNION (2026-07-26)

Anyone may CARRY any weapon; the app withholds the proficiency bonus and says
why. Rogue qualifier = martial AND (finesse OR light) — no predicate language.
The union runs over what each class ACTUALLY GRANTED this character (initial
vs multiclass entry differ per the sourced entry-grant clauses).

## D27 — OWNER: a character's weapon carries simple/martial (2026-07-26)

Amends D1b: group is a nullable copied VALUE (null = not stated; sheet keeps
its stated assumption), no template reference. Builder blocks, import
tolerates. Primary ability expression stays TEXT. Invocation selection is
built before prerequisites are parsed.

## D26 — OWNER: the sheet is a REFERENCE, not a simulator (2026-07-26)

**Amended by D35.** The table adjudicates. Structure only where the D35 test
passes; duration/casting time/components(text+copper)/tools stay text; no
gold, no inventory, no session state. The Lance is one-handed by stated
simplification.

## D25 — OWNER: pre-alpha, replace freely; rules engine in the type system (2026-07-26)

Replace/delete freely. NEVER: delete a test to reach green, regenerate an
expectation from our own output, lose user data. Types in value order:
absence as a type; branded ids; closed sets closed; ranges in the type;
exhaustive switches without default; value objects; relations in the type.
Where user content reaches: known-set-plus-passthrough, never a closed enum.

## F10 — machinery adopted to prove fidelity outlives the thing it proved (2026-07-26)

The tell is a comment justifying code by what it protects rather than what it
does. When the protected thing is retired, go looking for its protectors.

## F9 — the customType migration corrections (2026-07-26)

Native `integer({mode:'boolean'})` describes the DECODED value; the app sees
raw 0/1 (drizzle never runs at runtime) — contracts must map explicitly. A
frozen facts diff proves SCOPE, not correctness.

## F8 — 353 of 526 columns degraded to z.any() protecting a retired goal (2026-07-26)

Contracts stay correct via compile-forced refinements. Tighten: CLOSE where
the SRD closes and homebrew won't extend; OPEN (recognise + preserve) where a
user reaches; VALUE OBJECTS for structured strings.

## D24 — the character sheet exists; an assumption is never printed as a fact (2026-07-26)

`hit_die: number | null`; the assumption is made at the single production
point and warns, with a twin test whose identical total proves the warning
load-bearing. A roll above a KNOWN die counts in full and flags; an assumed
die convicts nothing.

## D23 — a subclass can be imported (2026-07-26)

A document declares its own kind (fixed the empty-file sweep bug). Cross-kind
imports don't delete each other; bundled SRD rows can't be targeted by
imports. Subclass REMOVAL still impossible — stated in user docs.

## F7 — the codec problem was an API shape, not 116 call sites (2026-07-26)

All call sites already passed codecs; the defect is the OPTIONAL codec param.
Fix = the omission becomes a compile error, proven by a deliberately
codec-less call failing to build.

## D22 — OWNER: effects belong to the CHARACTER; the trait is provenance (2026-07-26)

The sheet asks "what do I have"; only audits ask "where from" —
`character_source_instances` already answers that. A trait granting two
effects stops being a special case. (Built as `character_effects`.)

## D21 — Extra Attack from class, subclass, or named feature; scope reasons derived at ONE point (2026-07-26)

Bonded-weapon scope reason derived where the number is produced, exhaustive
switch, no pre-annotated grants. Naming a non-SRD subclass to say it is NOT
bundleable is CITATION, not content — over-redaction that rewrites the
owner's words inside quotes is the worse fault.

## D20 — attack profiles merged; one function per fact (2026-07-26)

The damage-type sentence and its `<select>` come from one function; "not
chosen" is a real option. Write boundary tests at levels where expectations
DISCRIMINATE (a test at level 5 passed for reasons unrelated to the code).

## D19 — Extra Attack is not keyed on (class, level) (2026-07-26)

Grants come from class, subclass, or named feature (Thirsting Blade is
SRD-bundleable today), may be WEAPON-SCOPED, and NEVER STACK — max, not sum;
Devouring Blade UPGRADES a grant. Count belongs with the attack profile.

## D18 — species and background templates merged (2026-07-26)

Dwarven Toughness totals exactly the character's level (the opening clause IS
the level-1 grant — data bug, tests had locked it in). Keep-both is only safe
for genuinely list-shaped merge conflicts. A known limitation is an ASSERTION
that fails when silently fixed, not a TODO.

## D17 — the sheet core landed; six numbers had no source until it (2026-07-26)

Extract BEFORE code (skills map, sheet math, multiclassing). Skills close on
the printed Skills table (18 — no class list contains Performance). Armor =
12 + Shield. Heavy armour is dex `none`, not cap 0 (min(dex,0) subtracts).
Extra Attack combines with max. `class_sheet_traits` row existence = "this
class was parsed", disambiguating genuine zero-row content.

## D16 — the claude-only AI bridge is merged, dev-only, provably unshipped (2026-07-26)

Zero bridge bytes in dist. Prompt on stdin; argv frozen (a stray token after
variadic `--tools` grants a tool). Codex stays dropped (F2). Slash commands
survive empty setting sources; containment is prompt POSITION (offset 0).

## D15 — OWNER: model Extra Attack and Martial Arts; Shillelagh unconditional (2026-07-26)

One family: things that modify a weapon attack profile (cantrips and class
features alike). Shillelagh shows for anyone knowing the cantrip, as a
DERIVED row — nothing written to `character_weapons` (D1b holds).

## D14 — cantrips that change how a weapon attack is rolled (2026-07-26)

True Strike (Bard/Sorcerer/Warlock/Wizard; replaces STR OR DEX; needs
proficiency with the weapon; damage type a CHOICE; scaled Radiant extra) and
Shillelagh (Druid; Club/Quarterstaff; STR only; die scales d8→d10→d12→2d6) —
sourced, not recalled. Weapons gain derived attack PROFILES; eligibility per
weapon. Shillelagh is treated as always active (owner's assumption, recorded).

## D13 — twenty-four CHECK constraints; the silent-no-op traps (2026-07-26)

Reserved words in CHECKs are parse errors — quote via helper. A bare `>= 0`
is TRUE for text — `typeof` limbs on bare bounds. `IS` not `=` where NULL can
disable a constraint. `state` stays unconstrained until its vocabulary is
declared in enums (a CHECK must read ONE source).

## D12 — OWNER: HP, armour, origins as templates, and the bridge (2026-07-26)

HP computed (fixed average) with the player's actual ROLL storable per level
[rolling since removed by D77]. Armour = SRD templates prefilling editable
fields. Species/backgrounds = templates; most traits FREE TEXT; a closed
compile-checked set of mechanical effect kinds (resistance, HP, speed,
granted spells). Q1: claude-only bridge approved; codex dropped.

## D11 — OWNER: derivable sheet core first; builder BLOCKS, import TOLERATES (2026-07-26)

Compute rather than store (HP, AC, DCs, modifiers, initiative). An
SRD-illegal choice is unavailable in the builder with the requirement stated;
anything arriving by import/share/catalog is accepted and flagged, never
rejected. A share link may carry a selection the builder would refuse — the
tolerant half working as intended.

## D10 — weapons merged; Q4 settled (2026-07-26)

Weapon "other properties" = eight known boolean toggles + free text, defaults
off. All 38 templates parse from the committed extract; no fabricated SRD
data. A retained oracle must still be able to FAIL — verified by mutating.

## D9 — EIGHT dead Laravel tables pruned; the oracle stayed an oracle (2026-07-26)

The schema signature is re-derived from the FROZEN pre-Drizzle fixture, never
regenerated from our own output. Tests whose subject is gone are deleted, not
adapted into shells.

## F6 — the SRD was never actually bundled; now it is (2026-07-26)

Official CC-BY SRD 5.2.1 PDF pinned by SHA-256; verbatim extracts under
`docs/srd/source/` with commands and pages in SOURCE.md. Mastery count has
TWO shapes (Barbarian/Fighter column; Paladin/Ranger/Rogue flat two in
feature text) — neither constant nor single column. CC-BY-SA fails the
owner's attribution-only test. An unevidenced assertion in a provenance doc
is the failure the doc exists to prevent.

## F5 — the attribution flake: Vite late-discovering zod (2026-07-26, RESOLVED)

The worker-only zod import was invisible to the dep scanner; cold caches
caused a mid-test page reload. Fixed: `optimizeDeps.include: ['zod']` +
per-checkout cacheDir. 0/60 after. Nothing suppressed — no retry, no skip, no
loosened assertion. Any future worker-graph-only runtime dep reintroduces
this; nothing guards it.

## D8 — contracts + audit merged; findings queued not fixed (2026-07-26)

Over-strictness is the highest-severity failure at the backup boundary — a
contract narrower than its column makes a user's own backup unrestorable.

## D7 — neither the Laravel app nor this code is worth preserving (2026-07-25)

Laravel schema fidelity, backward image compatibility, and current TS
structure are non-goals. STILL goals: the behavioural D&D-rule fixtures; a
retained test must still be able to fail (no regenerated expectations); the
untrusted-input boundary.

## D6d — scrutinise nulls in ALL types, not only columns (2026-07-25)

Sibling nullables sharing one cause become ONE optional relation, non-null
inside (`spell?: {id; name; level}`). Storage nullability does not dictate
domain nullability; resolve at the boundary.

## D6c — the defended nulls (2026-07-25)

A partially built character IS a valid steady-state entity — that resolves
the steady-state-witness tension in D6b's favour. Defended: unchosen
subclass, overrides meaning "derive normally", root parents, notes, optional
locators, action_type, the upcast facet, lifecycle timestamps.

## D6b — THE TEST for whether a null is legitimate (2026-07-25)

1. If nobody decided X yet and undecided must be allowed to build or import a
   character, it is truly optional. 2. If the SRD cannot be represented
   without the null, good sign. 3. If the builder flow needs it nullable,
   keep it — do NOT mangle the structure to delete a null the builder needs.
Only if all three are no: restructure or tighten. A nullable column that
completeness reports on is correctly nullable.

## D6 — nullability is a design smell to INVESTIGATE, not a type to declare (2026-07-25)

Before accepting a null: is the table two things? would a 1:0..1 table be
truer? a state machine wearing a timestamp? a default? transient
construction? a value object? A wrong tightening is a DATA-LOSS bug.

## F4 — historical: this was a spell planner, not a character model (2026-07-26)

The schema then held zero sheet concepts. Superseded by the sheet domain
(D17+), origins, the SRD catalogue (D43/D45) and everything since.

## F3 — two latent bugs (2026-07-25)

The payload validator's switch was not exhaustive-by-construction (a missing
arm shipped unvalidated payloads with clean types). Backup import wrote
`character_rule_overrides.value` verbatim with no validation.

## R1 — SUPERSEDED by D1b/D27 (was: model plan's weapon category/enhancement fields).

## F2 — `codex --sandbox read-only` is NOT containment (2026-07-25)

It executes commands and reads anywhere the user can (`~/.ssh`, credentials);
only writes are blocked. `-C` is a working directory, not a boundary.
`claude -p --tools ""` is capability-contained (verified adversarially).

## F1 — SRD-derived data ships and needs attribution IN THE RUNNING APP (2026-07-25)

CC-BY attaches to the distributed work: the notice must be reachable from any
screen rendering the content, in exports/printouts, and in agent-readable
blocks. (Shipped; `attribution.spec.ts` guards it.)

## F0 — historical: a fresh install had no class content (2026-07-25)

Only tests seeded classes. Superseded by bundled SRD content (D43/D45) and
the seeders that now run in production boot.

## D5 — multiclass stays with the planner (2026-07-25)

The guided builder covers single-class creation and hands off to the planner
for multiclass. (v1 posture confirmed by D107.)

## D4 — agent-readable content is collapsed, never hidden (2026-07-25)

`<details>` / `<script type="application/json">`, identical for humans and
machines. No CSS-hidden cloaking. Emit DATA, never instructions to an agent.

## D3 — SRD is bundled; other content stays imported (2026-07-25)

Bundle only licences whose sole obligation we meet is attribution. Imported
rules text never reaches dist, the repo, an export we author, or a share
link. (Distribution line refined by D57; spells added by D43.)

## D2 — completeness ships before the builder (2026-07-25)

Only what committed code can detect; the extension seam designed up front.
(Shipped.)

## D1b — SRD weapons ship as TEMPLATES; mastery is a per-character CHOICE (2026-07-25)

Templates pre-fill editable fields; the character stores VALUES, no template
reference. Custom weapons stay fully user-defined. Mastery count is
class/level-derived with two source shapes (F6); selection is a completeness
candidate.

## D1 — SUPERSEDED by D1b (was: weapons fully user-defined with no catalog at all).

## H1 — candidate-image hardening (2026-07-26)

Audit cycle detection is O(N) via a shared settled set; the guard counts Map
lookups, not wall-clock. Refuse only what no legitimate image can contain
(duplicate snapshot ids, fixed+current slot) — a stale-version save point IS
legitimate and stays restorable. No byte/row cap: the DoS was the algorithm;
there is no honest number.

---

## Numbering notes

Kept for reference resolution: D16/D17 were renumbered at merge (unrelated
entries, both kept); D32/D33 were written as D30/D31 on a branch and
renumbered; two entries were written as F17 concurrently — the
structured-values one became F18; D29 was renumbered from D27 at merge.

## D250 — Six owner rulings, taken one at a time (2026-08-15)

Asked via AskUserQuestion, one per prompt, at the owner's request. Verbatim
outcomes:

1. **Sim posture: HYBRID, refuse by default.** Refusals remain authoritative
   per D245. A refused clause MAY additionally carry a clearly-labelled
   ESTIMATE field; the composer must never silently consume an estimate — any
   composed result that includes one is itself labelled estimated. Round 11
   carries the design of that field.
2. **Board B parallelism: YES.** Design/legality phases run alongside simcore
   review rounds; only actual sim/suite runs serialize on the machine.
3. **Publish: PUSH 9505e1e8 to the mirror AND create a public clean-room
   variant of BUILD_CRAFT.md** (mechanics patterns only; must pass
   cleanroom_lint.py; D59 boundary applies — gate outcomes may be public,
   audit evidence may not). Both go out together.
4. **Board A weighting ADOPTED as a standing ruling** for future boards:
   DPR 20 / Prevented 15 / Spells 20 / Fun 20 / Novelty 15 / Skills 10.
   To be recorded in the mutt contract as C19.
5. **Resource-alias removal RATIFIED.** The capability stays deleted after
   failing four consecutive rounds (inferred → declared → unproven evidence →
   removed). Any future need triggers a fresh evidence-bound design, never a
   revival of the old seam.
6. **Machine priority: INTERLEAVE.** Simcore round 11 review (read-only, no
   suite) runs while the Playwright walkthrough engine is written; browser
   runs still serialize (one suite machine-wide, unique port). The Playwright
   mutt runs remain the owner's explicit deliverable.

## D251 — Six more owner rulings, asked one at a time (2026-08-15)

1. **Walkthrough bug handling: SEVERITY SPLIT.** Dead ends and wrong sheet
   numbers HALT the runs (they invalidate later walkthroughs) and become fix
   lanes immediately; missing-warning gaps and cosmetics BATCH to the end of
   all 11 runs.
2. **The Cantrip Kennel is SCORED ON BOARD B** as a full competitor (sim +
   judged axes), not a site-test vehicle or reference row.
3. **AI guidance path: FULL PATH ON ONE BUILD.** The Cantrip Kennel gets an
   end-to-end chat-guided creation run via the offline AI bridge; every other
   build asserts the agent-reference panel facts only.
4. **Push policy: ROUTINE AT EVERY MERGE.** `git push mirror main` returns to
   being the merge ritual's final step, no per-batch approval. The D59
   licensing gate remains a hard stop BEFORE anything lands in git.
5. **The archetypes/concepts temp doc MERGES INTO the Board A report** —
   one durable document, not two. Cleanroom lint re-run after the merge.
6. **wt-party RETIRES NOW.** Audit for unlanded work; anything real becomes a
   sync proposal per the party-sync cadence; then prune worktree and branch.

## D252 — Eleven owner rulings from the five-perspective brainstorm (2026-08-15)

Collated from 25 candidates (player / rules-lawyer / product-QA / sim-method /
steward perspectives); duplicates merged; four decided by the supervisor
without asking (private-pass artifacts stay private per D59; all 11
walkthroughs rerun after the batch-fix wave; verify_citations.py joins the
merge ritual; day-assumptions stated once per report). Asked one at a time:

1. **Review stopping rule: clean = TWO consecutive quiet rounds** (zero
   High/P1). **Board B sims run NOW** on current simcore; any build touched by
   a later review finding gets a targeted re-run.
2. **Board B rest cadence: Board A's day unchanged** (4 combats x 4 rounds,
   short rests between all).
3. **Measured stays PURE.** No labelled estimate ever feeds DPR/Prevented; a
   dependent cell goes partly-UNAVAILABLE, stated plainly.
4. **Prepared lists: TWO SCORED VARIANTS per Board B build** — a tuned
   day-list and a general-purpose list; the delta is reported information.
5. **Fun stays pure enjoyment; every build carries a separate unweighted
   TABLE-LOAD note** (light/medium/heavy).
6. **Kennel: C18 does NOT apply** — Pact of the Chain dropped for the Kennel;
   Magic Initiate (Wizard) carries Find Familiar; Warlock 1 takes a different
   invocation (Pact of the Tome if SRD-verified — three extra cantrips).
   C18 unchanged for the Board A ten.
7. **ALL FOUR house rules (H1-H4) become real labelled site toggles with sheet
   disclosures** — H2/H3 toggle UI is v1 work, new app lane.
8. **Walkthroughs verify EVERY level 1-7 on ALL builds.**
9. **Sheet oracle: all deterministic values + HP STRICT** against the
   supervisor's computed fixed-average; a site HP-policy difference itself
   halts and gets ruled on.
10. **v1-USABLE acceptance = green walkthroughs + the D251.3 AI-guided Kennel
    run completing guided creation.** No human pass required.
11. **Play cards/badges: NEITHER for now.** Boards stay analyst documents.
12. **Board publishing ritual STANDING**: private report + clean-room public
    variant + mirror push, every board, no per-board approval.

## D253 — Round-2 collaborative brainstorm rulings (2026-08-15)

Six perspectives (five Claude: DM / first-time user / maintenance-debt /
lane-ops / adversarial-risk; plus codex as a different-model sixth), 26
candidates collated, blockers asked one at a time:

1. **Enemy saves: PIN A PER-TIER SAVE ROW into C1** (typical CR 5-6 mods,
   e.g. Str +3 / Dex +1 / Con +3 / Int +0 / Wis +1 / Cha +0 at the level-6
   row) before any Board B sim.
2. **Enemy count: TWO-VARIANT DAY** — every combat scored as solo-boss AND
   3-mook (total incoming stream unchanged), reported side by side.
   **AND: wis-shepherd is CUT from Board B; no pre-2024 summon spells
   anywhere on the board.**
3. **A denied enemy turn credits Prevented at the enemy profile's expected
   round output vs DEF_AC for the denied duration** — deterministic from C1.
4. **Enemy targets the PC only; the familiar is PASSIVE** — Help/utility on
   judged axes, zero measured contribution.
5. **Unavailable measured axes enter the composite as an INTERVAL and the
   rank as a RANGE** (axis at 0 vs at board-max). No exclusion, no
   renormalizing, no silent zero.
6. **Variant ranking: the GENERAL list is the official score and rank; the
   tuned list is a +delta column.** One row per build.
7. **Walkthroughs assert CHOICES AND SOURCES at every level**, not just sheet
   values — a silent substitution with identical numbers is a HALT.
8. **AI-bridge acceptance bar: STRUCTURED ACTIONS, CONFIRMED** — the bridge
   emits next-step actions, Playwright validates each against the spec and
   applies it; any wrong advice or dead end fails the acceptance.
9. **D147's broad ignore-prereqs toggle is RETIRED**; the four labelled H1-H4
   toggles replace it, with a migration note.
10. **Toggles default OFF; every walkthrough starts from a COLD PROFILE; the
    Kennel run includes one deliberate wrong-pick-and-recover sequence** —
    a dead end on recovery is a HALT.
11. **The halt→fix→rerun loop is UNCAPPED**, and **the toggle lane BUNDLES
    #19's preparation-warning panel** (same planner disclosure surface).

Supervisor-decided without asking (recorded for the register): mirror-history
D59 audit runs as a lane; recurring defect shapes (fail-open, inverse bugs,
unstaged files) become automated checks; handover docs get a session-death
refresh; stale tirelocator files stay queued.

## D254 — OWNER DIRECTIVE: recurring save-governed damage is MODELED AS A
## CONDITION, not refused (2026-08-15)

Verbatim model, given against the Searing Smite example: "The smite does
damage first. It also applies the ongoing fire damage condition. It takes the
damage at the start of the next turn because it has the condition. If it
saves, the condition is removed. If it starts any turn with the condition,
the condition deals the damage."

So the event vocabulary gains CONDITIONS: applied by a hit or failed save;
carrying a damage tick with a declared timing (start-of-turn / end-of-turn /
delayed-one-tick); removed by a save (save-ends), a duration, or an external
effect. In Monte Carlo this is a per-target state flag checked each round; in
the analytic engine it is a geometric-series expectation over P(save-ends).
Refusal remains only where even the condition model cannot express the source
(GM-choice triggers). This supersedes the estimate-field design (D250.1) for
every clause the condition model can express — model beats estimate.

## D255 — OWNER RULING: Geas and Dream are OUT-OF-COMBAT spells (2026-08-15)

Both verified from docs/srd/source/spell-descriptions.txt: Casting Time
1 minute apiece — ten rounds, uncastable inside a 4-round combat. Dream
additionally resolves during the target's sleep. The sim classifies both
OUT-OF-COMBAT: a new category, distinct from `unavailable` — the engine is
not refusing to price them; they are ruled outside the combat model's
domain. They never appear in DPR/Prevented folds, never produce an
unavailable cell, and their value (if any) lives on the judged axes.
Combined with D254's condition model this empties the refusal list of its
last two combat-facing holdouts: the 11-entry unavailability set becomes
9 modelable conditions + 2 out-of-combat classifications.

## D256 — OWNER RULINGS on the remaining unavailability survivors (2026-08-15)

1. **Prismatic Spray is MODELED.** Random-table events join the condition-model
   scope: Monte Carlo rolls the literal 1d8 per target (rerolling 8s for the
   two-ray result); the analytic engine uses the verified 45/56 damaging-ray
   closed form.
2. **The casting-time sweep RUNS.** Every spell on both boards is classified
   in-combat / out-of-combat from its casting time (the Geas/Dream D255 ruling
   made systematic). No design may lean on an uncastable spell in a 4-round
   combat.
3. **Caster identity is MODELED via a PARTY: assume a Fighter, a Cleric and a
   Wizard are the other party members.** Two-castings-of-one-clause
   composition becomes representable (different casters are different
   identities). Scope note: this introduces party context for identity and
   composition purposes; it does not reopen C8's party-HP healing model
   unless separately ruled.
4. **Subclass Bonus Proficiencies — and anything else that affects
   character-sheet numbers — MUST BE MODELED, not marked unknown.** College
   of Lore's text is IN the full SRD ("Level 3: Bonus Proficiencies — You
   gain proficiency with three skills of your choice"), only missing from the
   subclasses.txt extract; the extract gets regenerated to carry subclass
   feature TEXT, the app models it, and the walkthrough spec asserts three
   Lore bonus skills instead of expectUnknowns. D33 'unknown' remains only
   for values genuinely absent from source.

## D257 — OWNER DESIGN: fixed-DC authority is enumerated rules + light
## generalization + loud novelty (2026-08-15)

Verbatim: "There are a finite number of these fixed dc spells. Ai can decode
them all and include code rule for each so the code doesn't need to be as
smart. Try to lightly generalize so new spells with the same wording get
covered. New types of wording need new ai intervention."

Implementation shape: (1) the reviewed oracle gains a per-clause fixed-DC
column — every one of the 79 clauses decoded once by AI-with-source, 2
non-null today — and that table is the AUTHORITY; (2) the scanner keeps a
LIGHTLY generalized recognizer for the known phrasings so a new spell using
the same wording auto-derives its row's candidate; (3) any DC-vocabulary
wording outside the known forms REFUSES loudly (the round-13 burden
inversion) — that refusal IS the "new ai intervention" trigger: a human/AI
reads the spell, adds the rule and the oracle row. Extraction never silently
overrides the table; disagreement between table and recognizer is a build
failure, not a preference.

## D258 — Four more rulings (2026-08-15)

1. **Party NPCs are BUFF TARGETS ONLY** (extends D256.3): declared attack
   profiles that buffs can modify — Bless/Faerie Fire become measured as the
   delta on NPC output — but NPCs take no damage, make no decisions, and C8's
   party-HP model stays closed.
2. **Fable judges Board B** — same editorship as Board A, one-time
   authorization: fable scores the judged axes with citations, the supervisor
   verifies every composite arithmetically.
3. **VTT phase 1 PROTOTYPES NOW, in parallel** — own worktree, own port;
   shared board (grid, tokens, DM fog, dice log) as a Yjs doc over a
   pluggable transport (Trystero default, manual-SDP fallback); no rules
   integration in phase 1; touches nothing the walkthroughs need.
4. **Queue triage:** #18 (DPR sim in-app UI), #20 (D235 reader sweep) and
   #21 (Stryker threshold) SURVIVE. **#17 (errata triple-check) is KILLED** —
   the errata dossier's existing two-pass record stands; no triple-check
   deep-dive.

## D259 — Correction to D257's census, and the registration-required design (2026-08-15)

CORRECTION (supervisor's own error, caught by review round 14): D257 said the
fixed-DC oracle has "2 non-null today". The oracle and the source census
support exactly ONE non-null row — contact_other_plane: 15. Earthquake's
DC 20 is check-owned and its row is null. The "2" was a stale figure from
before Earthquake was decoded. decisions.md is append-only, so the wrong
sentence stands above with this correction governing.

DESIGN AMENDMENT, completing D257: rounds 12-14 each defeated the DC scanner
with composed English that is lawful but off-corpus. Under D257 the answer is
not a smarter parser — it is REGISTRATION-REQUIRED FOLDING: a clause may fold
ONLY if it has rows in ALL reviewed oracles (kind, availability, fixed DC,
grouping — the grouping oracle becomes TOTAL over all clauses, not partial
with derived membership). An unregistered clause refuses by construction, so
novel wording cannot fail open no matter what the parser misses; parsing is
demoted entirely to a drift alarm over REGISTERED rows. New spells onboard by
an AI-with-source decode pass that writes their rows — and per round 14's
named process gap ("same-change oracle co-minting"), that decode pass must be
SEPARATE from any parser change: oracle rows and parser code never land in
the same change for the same clause.

## D260 — Round-3 collaborative brainstorm rulings (2026-08-15)

Five fresh Claude perspectives (VTT table-runner / deployment-infra /
sim-matrix economics / release / next-session) plus codex sixth; 26
candidates; duplicates merged; blockers asked one at a time:

1. **NPC party profiles: DERIVED FROM SRD CLASSES at level 7** — standard-array
   Fighter/Cleric/Wizard built from the class tables, cited like everything
   else, appended to the contract beside the enemy save row.
2. **VTT rooms: DM-AUTHORITATIVE DOC** — players send proposals; only the DM
   client mutates the shared doc, on every transport. Kick = stop accepting a
   peer.
3. **VTT persistence: DM-LOCAL AUTOSAVE** — Yjs snapshots into the DM's
   SQLite; DM refresh safe; full DM disconnect pauses the game; server
   stateless.
4. **Board B official composite: EQUAL-WEIGHT AVERAGE of the solo-boss and
   3-mook day variants**; both columns still printed.
5. **Toggles: H1 COLLAPSES INTO H4.** Three house-rule toggles ship (H4
   Dex-for-Str prereqs incl. Paladin, H2 feat decoupling, H3 MI ability);
   contract keeps H1 as history; disclosures name H4.
6. **Cloudflare: CONFIGS ONLY, NO DEPLOY.** wrangler.toml + relay worker code
   staged in-repo; nothing deploys until the owner acts. No paid plan.
7. **Release scope: VTT ships AFTER v1** as its own milestone; **the mirror
   goes PUBLIC when v1-usable is declared.**
8. **Fog is TECHNICALLY SECRET** — the DM client sends players a filtered
   doc; hidden state never leaves the DM. (Natural fit with ruling 2.)
9. **Simcore registry: PUBLIC SRD CORE + PRIVATE ORACLE OVERLAYS** — Board B's
   Xanathar/Tasha registrations and user imports live in overlay files that
   never touch the public repo.

Supervisor-decided without asking: simcore round briefs/findings become
committed docs (private repo) rather than scratchpad-only; handover files get
a refresh at the next quiescent point; the 11 walkthrough specs are the
supervisor's next authoring task and their absence is a queue fact, not an
owner decision.

## D261 — OWNER AMENDMENT: one combat shape — a boss WITH three mooks (2026-08-15)

Verbatim: "the one boss should have 3 mooks with him instead of splitting.
Most fights have multiple enemies for action economy."

This SUPERSEDES D253.2's two-variant day and D260.4's equal-weight average:
every combat is ONE encounter containing a boss and three mooks — four
bodies, real action economy, one official basis, one composite. The C1 total
incoming stream is unchanged and is distributed across the four bodies with
the split declared in the contract (supervisor to append with the C22 rows;
boss carries the majority share, mooks the remainder). AoE and multi-target
effects resolve against the real four-body group; single-target rotations
choose targets. The side-by-side variant columns are retired before ever
being produced — no sim ran under the superseded design.

## D262 — Round-4 collaborative brainstorm rulings (2026-08-15)

Codex (11 candidates) + Claude (8) collated to ten distinct questions;
asked one at a time. Two AskUserQuestion rounds on the registry question
were "explain more" — the ruling below was made after the under-the-hood
explainer (parse-once + digest tripwire + who-operates framing).

1. **v1 gate: PRIVATE-LIBRARY PASS BLOCKS v1.** The private-library
   walkthrough pass (import + non-SRD paths) must complete before the mirror
   flips public, even though its content never ships. Non-halting defect
   policy was not amended — D251.1's severity split stands.
2. **Post-v1 first lane: DPR SIM UI (#18)** — the in-app advanced-user
   simulator precedes launch hardening, scorecard expansion, and VTT
   phase 2.
3. **Board B is a REDESIGN SIGNAL** — the report's job is to identify
   underperforming mechanics/concepts and feed another design round, not to
   crown builds. Structure the report for that reading.
4. **Sim fidelity ceiling: CHASE THE DOCX** — fidelity is sufficient when
   the sim tracks the external d4 methodology within tolerance; that
   reference, not sensitivity tests or a fixed scope, is the stopping rule.
5. **Private-pass corpus: known-tricky spells (Thorn Whip / Cloud of
   Daggers / Armor of Agathys), non-SRD subclasses + feats, non-SRD species
   + backgrounds.** Full class spell lists are explicitly NOT required.
6. **AI-guided mode at public v1: POWER-USER SETUP** — documented as
   bring-your-own-AI; the site guarantees the hooks (alt text, structured
   actions), not the experience. The deterministic flow is the product.
7. **Clean-room public depth: MAX LAWFUL DETAIL** — public board variants
   publish everything the D59 gate permits per build, accepting a heavier
   clean-room review each time.
8. **VTT phase 2 negative scope: NO cloud accounts, NO voice/video, NO
   hosted asset library.** Rules automation was offered as an exclusion and
   NOT chosen — it is in bounds for phase 2.
9. **Registry ops: AI-ASSISTED INTERNAL** — the decode+review registration
   pipeline becomes a maintained internal tool (cheap SRD revisions and
   private-library growth); user imports keep refusing with "sim
   unavailable". Extends D260.9's overlay split with an operator.
10. **KB target for v1: ALL BUNDLED MECHANICS** — every mechanical rule the
    bundled SRD content can surface gets a KB entry; KB completeness is its
    own release deliverable with its own audit (beyond the 127-entry sweep).
11. **Persistence: EXPORT/IMPORT REQUIRED AT v1** — file save + re-import
    joins the v1 bar; localStorage reload-safety alone is insufficient.
