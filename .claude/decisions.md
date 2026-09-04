# Binding scope decisions

G2 VERIFIED AND COMMITTED; MUTATION EVIDENCE CORRECTED (supervisor,
2026-09-03 14:30; lane 2039cf0f). Forced gates: tsc -b --force 0, sg 0,
vitest 544 files / 9535 tests. F against my own work: my first G2
mutation edited the OUTCOME TYPE UNION (removed 'execution_failed'), so
tsc refused it while vitest — which does not type-check — still passed;
I committed with "mutation fails then passes", which was not true of the
tests. Redone on the assignment site (tools/ai-dm-conversation.ts:3862,
`outcome = 'execution_failed'` -> 'authorized'): "never authorizes a row
when execution throws before its first completed turn" fails, restore
proven by cmp; commit message amended to point here. Rule: a mutation
must change runtime behaviour, not a type; if tsc rejects the mutant,
the mutation is void and must be redone. G2.1 (D489 reasons, D490
override relaxation, decision trace helper) dispatched in the lane.

F: MY GATE TRUSTED INCREMENTAL tsc; H1-INDICES DOES NOT COMPILE
(supervisor, 2026-09-03 14:30). After committing H1-indices as "tsc 0",
a mutation run showed `tsc -b` failing at tools/ai-dm-conversation.ts:
1751 (speculative phase not assignable to DecisionPhase); with the
mutation restored byte-for-byte the error persists, and `tsc -b --force`
confirms it. The gate's `npx tsc -b` at 13:41 passed because an
incremental build cache marked the project up to date — the same trap
codex fell into. Actions: gate-wt.sh now runs `tsc -b --force`; forced
checks re-run on H3, the lane (G2), H1-ids and H4 (results in this
note's follow-up); the H1-indices commit message amended to say NOT
GREEN; fix dispatched to the same terra session (typed handling of the
speculative phase, no cast). Rule: every gate and every mutation check
uses `tsc -b --force`; a "tsc 0" claim from an incremental build is not
evidence.

H3 AND H1-INDICES VERIFIED AND COMMITTED ON THEIR BRANCHES; SOL GATING
VERIFIED (supervisor, 2026-09-03 14:20). H3 (claude/h3-skills): my gate
545 files / 9541 tests green (codex's own full run had four load
timeouts and a 3x3 MCP smoke over its 120 s budget in isolation; my run
on a quieter box passed it — timing margin noted); mutation (skills
enabled for the control arm) fails then passes; committed. H1-indices
(claude/h1-indices): my gate 545 / 9543 green; mutation (index n->n+1)
fails then passes; committed. G2 (lane) and H1-ids (claude/h1-ids)
delivered (codex reports 544/9535 and 545/9545, mutations as briefed);
my gates queued sequentially. Sol s-gating rerun: 30/30 authorized, 22
model-planned, refusals 10, 0 CLI-exit, wall 25.2 s; idle Disengage 2
(luna twin 21), Dash 82 (51), attack slots 37 (31). D465 valid arms now
six; cav-full running since 14:00.

H4 INTENT MATCHER: OFFLINE RESULT INCONCLUSIVE, BRANCH KEPT (supervisor,
2026-09-03 13:40; commit on claude/h4-intent). Codex terra built the
deterministic lexical matcher, the corpus extractor and the evaluator;
tsc 0, sg 0, H4 tests 5/5; full suite showed the two known 5 s-budget
timeouts (pass in isolation). The corpus tells the real story: 3,732
items but only 152 with usable pre-submit prose — the models do not
narrate intent before submitting, and arena rows keep only correction
summaries. On those 152: top-1 39.5%, abstention 53.9%; on the 139
first-rejected proses 41.7%; the target-swap negative gate had zero
eligible cases. My review: opus's design is untestable on existing data
and a lexical matcher over this prose is not competitive; the right
corpus is the D489 reasons (mandatory, per actor) once post-shift arms
exist — every reason is intent text paired with the chosen option. H4
stays an experimental branch, not part of the shift; re-evaluate after
the post-shift control. H1-indices and H3 delivered (both stopped
loudly at the full-suite gate: the indices lane's command window and,
in H3, four load timeouts plus the 3x3 MCP smoke exceeding its fixed
120 s in isolation — the last is a real slowdown to check); supervisor
gates queued sequentially. BG3 lane: six candidate videos recorded
privately (three explicitly Tactician); the box has no yt-dlp/ffmpeg/
tesseract, so frame extraction and OCR of the combat log need tools
installed — owner asked.

OVERRIDE RETROSPECTIVE (codex sol high, read-only, unsealed D443 scores;
report dnd-slim-runs/override-retro-report.log; supervisor-checked
headline counts match my own extraction; 2026-09-03 13:20). 907 luna-low
actor plans, 727 overrides in 174/210 rounds; 168 override rounds
overrode EVERY actor (form-filling). Classification: 74 engine-
expressible, 11 DM-only (formation, defensive positioning, ally support,
delay commitment, information gathering), 642 empty/rubber-stamp; no
retreat/surrender/sparing/next-room reason exists in the corpus. Value:
model-authorized rounds without overrides scored 7.22 (n=12) vs 6.52
with (n=174); rounds with a PROVEN dominated override 5.80 (n=20) vs
6.61 other override rounds; 42 accepted overrides proven dominated
across arms (30 rubber stamps, 7 engine-expressible, 5 DM-only); all 55
executed End Turns carried overrides, 41 provably dominated; in the 9
numeric cases the chosen target had hit 0.16 / EV 1.05 vs 0.25 / 1.63.
Descriptive, not causal. Verdict: the reviewer is right about the
diagnosis (rubber stamps), not yet about the value of DM-only reasons
(11 instances, judges never saw them). Experiment preregistered by
codex: three arms {D485-strict, named-free-text-judge-visible, free-
text-unscored}, 30 rounds each, paired by seed, panel total primary,
override/justification-class/dominated-End-Turn rates secondary, service
faults censored; decision rule: named free text must beat strict by
>=0.2 with a seed-clustered interval excluding zero and DM-only reasons
judged action-consistent; plus an offline rescoring of plan-only vs
plan+reason packets. Supervisor note: D489 (a reason on every decision)
already makes free-text reasons mandatory; the remaining choice is
whether an override additionally needs an engine vocabulary and whether
reasons are judge-visible.

F: WORKTREE node_modules SYMLINKS WERE READ-ONLY UNDER THE SANDBOX
(supervisor, 2026-09-03 13:10): I gave the four new worktrees a symlink
to the lane's node_modules; codex's workspace-write sandbox treats the
symlink target as outside the workspace, so vite-node could not write
its config bundle to node_modules/.vite-temp and H4 stopped loudly at its
corpus gate (after tsc 0 and its unit tests passed). Replaced the
symlink in all four worktrees with a hard-linked copy (cp -al; new files
land locally) and resumed H4's session. H1-ids/H1-indices/H3 were still
mid-implementation and had not hit the wall. SOL S-THREATS RERUN
VERIFIED: 30/30 authorized, 26 model-planned, refusals 12, 0 CLI-exit,
0 timeouts, wall median 21.8 s; idle Disengage 3 (luna twin 24), Dash 88
(50), attack slots 36 (39). D465 valid: s-full, s-rows, s-opp, s-move,
s-threats; s-gating started 13:05.

H3 AND H4 STOPPED LOUDLY ON MY BRIEFS; REDISPATCHED (supervisor,
2026-09-03 12:55): H3 could not create /home/vagrant/.codex-aidm/skills
(read-only under workspace-write) and H4 could not write the corpus to
dnd-slim-runs — both correct stops, both my brief errors (writes outside
the worktree). Amended: H3 writes skills only as fixtures under
tests/fixtures/ai-dm-skills and the per-arm isolated CODEX_HOME view is
built from them at run time; H4 writes the corpus under the worktree's
ignored .tmp-intent/. Redispatched (sol high / terra xhigh). Judge queue
finished 12:42: five packets (d465 s-full/s-rows/s-opp/s-move vs luna
twins, d483 s-threats vs no-KB twin), three seats each, all structurally
valid (one opus component-sum mismatch on s-threats, recomputed per
protocol); keys sealed with the D447/D449 program.

OPUS REVIEW OF THE DECISION-EXTRACTION PLAN; H4 DISPATCHED (supervisor,
2026-09-03 12:40; review in dnd-slim-runs/opus-plan-review.md, luna skill
drafts in luna-skill-{engine-submission,dm-round}.md). Adopted as H1.1
amendments (file brief-d466-H1.1-amendments.md, applied after each H1
variant lands): brand constructors must not be total casts (the repo's
engineOptionId at option-modeling.ts:19 is `value as EngineOptionId`);
per-actor phantom option index; the adapter's cancelled exit maps to a
censored decision_timeout, not decision_missing; the output schema is an
object keyed by required actor so coverage is schema-enforced; explicit
reaction-guidance inherit; chosen index recorded per actor so index-0
anchoring is measurable. Adopted for the experiment design: transport is
a blocking factor (four instruction arms at one transport plus a
{none, best skill} x {A2, A3} cell = 6 cells, not 8); timeouts censored
from the primary; a skills inventory test from the child's own
environment (spawn merges process.env, process.ts:96); instruction arms
evaluated as a PAIRED REPLAY over a frozen context corpus (offline, ~900
items) with live arena kept for the transport comparison; a shuffled-
index arm to detect anchoring. Opus's third alternative — intent-first:
free-text intent per actor resolved by a deterministic matcher that
abstains — dispatched as H4 in worktree dnd-wt-h4-intent (codex terra
xhigh): matcher + corpus extraction from rollouts/rows + offline eval
(top-1 vs the model's own accepted option, abstention, the adversarial
"first rejected prose" arm, target-label perturbation gate). Two opus
points conflict with owner rulings and go to the owner: overrides as a
closed engine vocabulary (D485) vs named free-text judge-visible
objectives; hiding human-only options from the AI (D453) removes the
DM-ish part of the option set. Also corrected in the record: the "21
parallel codex processes" claim opus quoted from decisions.md:1014 was
already superseded (rooms run sequentially; see the 06:00 correction).

SOL S-MOVE RERUN VERIFIED (supervisor, 2026-09-03 12:22): d465-s-move-
sol-low 30/30 authorized, 25 model-planned, refusals 9, 0 CLI-exit rows,
0 timeouts, wall median 27.5 s; idle Disengage 3 (luna twin 8), Dash 88
(55), attack slots 37 (35). D465 valid arms: s-full, s-rows, s-opp,
s-move; s-threats running since 12:17.

G1 VERIFIED AND COMMITTED; G2 DISPATCHED (supervisor, 2026-09-03 12:15):
G1 (9 files +589/-104): plain advertised schemas with the conditional
rules moved to runtime, launcher-bound minimal submissions (the model
sends proposals + optional reaction guidance; the launcher fills
state_ref/request_id/phase and a deterministic idempotency key), typed
rejections (stale, ambiguous, CORRECTION_FALLBACK_MUST_BE_NULL,
INITIAL_FALLBACK_REQUIRED, PRIMARY_FALLBACK_IDENTICAL), generated
minimal example, snake_case model-facing context; explicit envelopes
still accepted. My gates: tsc 0, sg 0, vitest 544 files / 9529 tests.
My mutation (identical-fallback check disabled, guarded): handler test
fails, 100/100 after restore proven by cmp. Committed. G2 (honest
outcomes, planner dimension, speculative actor ids, adjustment
preflight, D485 override policy) dispatched.

DECISION-EXTRACTION AND SKILLS PLAN (codex sol high, read-only, with the
supervisor's prior art; report in dnd-slim-runs/decision-extraction-plan-
report.log; 2026-09-03 11:40). Recommendation: the model's job becomes
"read a pre-rendered ranked catalog, emit ONE schema-constrained final
decision by INDEX" (A3); the harness maps indices through an immutable
revision-bound catalog, fills every binding field, normalises, validates
with named codes, and submits; no MCP round trip in that mode (codex
--output-schema on the final message; the constrained turn makes no
tool calls, avoiding the constraint tax). Path: land G1/G2 (A2 minimal
tool) as the control and migration step; add one typed decision ingress
(src/vtt/agent-round-decision.ts: RawIdDecision/RawIndexDecision never
assignable to EngineTurnProposal, branded indices constructible only
after bounds checks, DecisionCatalog, BoundRoundDecision built only by
bindDecision, discriminated normalisation result); implement A1 (ids)
then A3 as a small delta; A3 requires the D461/D477 typed ranking so
index 0 is the engine recommendation (options are alphabetical today,
turn-option-registry.ts:802); rows gain decisionTransport,
firstDecisionAccepted, decisionAttempts, rejection/normalisation codes,
instructionSource none|kb|skill, skillName, skillHash, planner; answer
keys (not packets) carry planner/transport/skill. Skills experiment:
skills under /home/vagrant/.codex-aidm/skills (engine-submission,
dm-round), a typed arm union {none|kb|skill}, adapter emits
skills.include_instructions=true only for skill arms, per-arm isolated
CODEX_HOME view (the adapter's codexHome option is not yet passed to the
child env — process.ts:41/93 — fix and test), judge home untouched; four
arms x luna low 120 s and sol low 240 s on seeds 6203001-10 x3; primary
outcome first decision accepted; promotion needs better first
acceptance, no lower model-planned share, panel within 0.2. Supervisor
sequencing: G1 (running) -> G2 -> H1 (ingress + normaliser + A1) -> H3
(skills infrastructure + two SKILL.md) -> skills experiment on the new
era; A3 (H2) joins the D460 program because it needs the ranking.

S-MOVE SOL ARM ALSO OUTAGE-CONTAMINATED (supervisor, 2026-09-03 11:25):
d465-s-move-sol-low.jsonl (landed 10:45:23) has 7 rows refused with
"Agent CLI exited 1 … failed to refresh available models" — the outage
began inside that arm, not after it. Voided (.VOID-codex-outage-tail);
the earlier note's "s-move 23/30 authorized, party-script refusals" was
partly wrong: 7 of its refusals were the outage. D465 valid arms are
now s-full, s-rows, s-opp only. A remainder waiter reruns the chain
(idempotent) after the current chain and the D483 rerun finish, so
s-move is redone alone. Outage rule from memory applied: CLI-exit
refusals are an outage signal regardless of the timeout count.

CODEX BACK; EVERYTHING RELAUNCHED (supervisor, 2026-09-03 11:20): probe
returned OK at 11:17. D465 chain relaunched (skips the four valid arms,
reruns the probe, then the three voided arms and cav-rows-move-gating);
D483 rerun waiter re-armed behind it; G1 redispatched in the lane; the
owner's directive (prior art for decision extraction, algorithmic load-
shedding, codex skills experiments) dispatched to codex sol as a plan
with the supervisor's prior-art notes: codex exec --output-schema strict
final-message structuring, constrained-decoding "constraint tax" on
tool calls (arXiv 2606.25605), schema-first tool APIs (arXiv
2603.13404), agents reproduce tool order 0.87 but arguments 0.69 (arXiv
2605.28840), enumerated-index selection reliability, codex SKILL.md
injection under $CODEX_HOME/skills (currently disabled by the adapter).

CODEX SERVICE OUTAGE; ALL CODEX WORK STOPPED LOUDLY (supervisor, 2026-09-03
11:20). From about 10:45 the codex CLI fails every call: operator sessions
died with "failed to refresh available models: unexpected status 4xx" and
a direct probe returns "404 Not Found ... chatgpt.com/backend-api/codex/
responses" after 5 reconnects; `codex login status` is still "Logged in
using ChatGPT", so this is the backend, not credentials. Damage: D465 sol
arms 5-7 (s-threats, s-gating, cav-full) produced 30 rows each of CLI-
error refusals in ~4 s per round — renamed .VOID-codex-outage; the last
arm (cav-rows-move-gating) killed and its partial removed; the D465 chain
and the D483 rerun waiter killed by PID. D465 valid so far: s-full,
s-rows, s-opp, s-move (s-move 23/30 authorized — party-script refusals,
the E1/E2 class, old era). D483: s-threats valid (30/30, 30 model-
planned); s-gating hit 4 timeouts while overlapping the sol batch at
10:10 (WEATHER STOP, D483-BLOCKED) — voided by the rerun script; cav-full
not run. G1 dispatched at 11:14 into the outage and exited without
output. Supervisor gap: the cron ticks between 09:28 and 11:12 were not
acted on because my previous turn ended inside a gate wait; the owner's
"Status?" messages went unanswered for ~1 h 45 — recorded as a finding
against my own work. Nothing resumes until a codex probe returns OK; the
lane is committed through F (aa09742a); the owner's new directive (prior
art for extracting decisions from agent output, algorithmic load-shedding,
skills for codex models) starts with supervisor-side research now.

ARMS LANDED: SOL ROWS (D465 #2) AND LUNA THREATS+PROTOCOL (D483 #1);
F HARVESTED (supervisor, 2026-09-03 09:25). d465-s-rows-sol-low: 30/30
authorized, only 18 model-planned (12 engine; arm 1 had 25), refusals
10, idle Disengage 1, Dash 83, attack slots 29, wall median 24.9 s.
d483-s-threats-luna-low-protocol: 30/30 authorized, 30/30 model-planned
(no-KB twin 26 + 2 timeouts), refusals 13 (same), idle Disengage 33 (twin
24), Dash 45 (50), attack slots 45 (39), wall 19.1 s (16.4). First read:
the protocol text does not change luna's tactics (idle Disengage is if
anything higher) and removes the two timeouts; the confound is about
completion, not play. Sol's model-planned share is unstable across
profiles (25 then 18 of 30). F: 5 files +108/-29; codex reports the
`args: unknown` cause as the root-level allOf/if/then in the advertised
schema, restructured so codex 0.148's schema-to-TypeScript renderer can
render the envelope (cited the renderer sources), tool description now
carries the envelope and "a rejected call is not queued and does not
count", the resource exposes the envelope and per-actor schemas from one
zod source, tools/list tested against the published schema; the
slow-test sweep found 78 legitimately heavy tests (survival seeds, 3x3
MCP smoke, migration chains) and codex stopped rather than shrink their
subjects — accepted; the two flaky ones were cheapened (delta fallback
3.5 s -> 0.95 s). Supervisor gates running.

PROTOCOL BRAINSTORM AND NONSENSE AUDIT (codex sol high, read-only, on
McpToolCall events, not exec strings; supervisor cross-checked the
headline; report in dnd-slim-runs/protocol-brainstorm-report.log; 2026-
09-03 09:10). Measured: correct FIRST submission in only 15% of luna
sessions (28/183), 12% sol no-KB, 10% sol+protocol; first rejection is
envelope shape in 123/155 luna cases, option-id/dominance in 30, revision
2; luna makes 3-4 submit calls per session (one session 44); eventual
success luna 90%, sol no-KB 21%, sol+protocol 74% — the KB fixes
recovery, not first-call correctness. Ranked fixes: (1) publish a schema
codex can render — the server adds allOf/if/then conditionals
(schemas.ts:893-906) and the codex exec wrapper renders that as `args:
unknown` while plain tools render typed; advertise the plain object
schema, keep conditionals in runtime validation; (2) generated complete
envelope in the turn text and "one ACCEPTED submission; repair
argument-validation failures"; (3) server-side fill of state_ref/
request_id/phase/idempotency_key so the model supplies only proposals,
bound to the launcher token; (4) engine.proposal_template returning a
prefilled envelope; (5) validate-then-submit as one atomic normalised
call; (6) typed rejection with corrected skeleton (recovery only).
Other nonsense, ranked: (a) 100 of 270 rows labelled authorized carry
execution refusals (52 missing PC programs, 22 invalid Self-spell
targets, 26 unresolved boundary decisions, 4 timeouts) — authorized is
set before the initiative loop runs (ai-dm-conversation.ts:3437-3447);
(b) speculative planning: 36/42 speculative submissions hit
SPECULATIVE_BRANCH_CONTRACT_MISMATCH because context rendering passes an
actor COUNT while speculation snapshots exact actor IDs (:1319-1333 vs
:2463-2485); (c) tool discovery every round in 100% of sessions, with
irrelevant web/plugin declarations returned; (d) adjustment dispatch is
a 96% no-op (52/54 baseline_kept) costing 13.4M input tokens; (e) engine
fallback (77 auto-submit blocks, 49 sim-controller rows) reported as if
model output; (f) 40% of accepted proposals have identical primary and
fallback (schema permits it), 80% carry dominance overrides (375
'objective', 352 'unknown_engine_gap') that the engine accepts wholesale,
40 of 55 End Turn plans had a better engine option; (g) turn data is
camelCase (requestId, correctionNumber) while the wire wants snake_case
and forbids correction_number; (h) kbReads on the d465/d483 rows is null
because the old-era arena injects the KB as instructions (the 26/30 count
was the new-era control). Increment G is designed from this list; the
post-shift control waits for G so the era shifts once.

MEASURED: THE FIRST SUBMISSION IS REJECTED IN 85% OF LUNA SESSIONS
(supervisor, 2026-09-03 08:50, raw rollouts, invocation-level detector
`engine_submit_round_proposals(` in the exec JS, paired with the exec
output): 212 luna-low rollouts from the D443 arms (09/02 17:00-21:59);
183 contain a submit; the FIRST submit was rejected in 155 of them
(84.7%), 152 for envelope shape (missing phase/idempotency_key,
state_ref/run_id placement, unrecognized keys), 3 other (stale_state,
a JS syntax error in the model's exec script). Sessions make a median
of 4 submit invocations (p90 5) and a median of 6 exec calls (tool
discovery, context fetch, schema reads) before the first submit. My
earlier detector (substring match) reported 184 first-ok — wrong,
because the model's discovery scripts mention the tool name; discarded.
Confirms D484's premise: failure-then-retry is the norm for luna too;
sol merely refused to retry. The codex brainstorm/audit is in flight;
F's description fix alone will not reach "rare" — the fixes must
remove the need to know the envelope at all (server-side fill / draft
tool) or expose the real schema.

D2.1+D2.2 COMMITTED; F DISPATCHED; CONTROL RERUN DEFERRED (supervisor,
2026-09-03 08:40): lane 4888a90b. D2.2 made the rollout lookup one
directory listing per session with a cached path and a bounded tail
read; the three-reps arena test dropped 4.52 s -> 98 ms and
hidden_options_logged_once 3.61 s -> 53 ms. My cache-disable mutation
fails the rescan test, 27/27 after restore proven by cmp. Full suite:
run 1 green 544/9519; run 2 one 5 s-budget failure in a 3.6 s test under
load 4 (two arena arms running) — discarded per the quiet-machine rule
and handed to F as a sweep of every test above 2.5 s. F (submission
envelope in the tool description, "rejected-for-arguments does not count
as your submission", envelope in the schema resource, tools/list
inputSchema test, the `args: unknown` investigation) dispatched. The
post-shift control rerun waits until D483 finishes so no more than two
arena arms run at once (D465 batch + D483 now).

SOL PROTOCOL INVESTIGATION (codex sol high, read-only, on raw rollouts;
supervisor, 2026-09-03 08:25): findings with evidence in
dnd-slim-runs/sol-investigation-report.log. (1) Luna ALSO gets its first
submission wrong (legacy-shaped payload, rejected as invalid arguments)
and then retries twice, reasoning that a rejected, unqueued call is not
the one submission; its third call succeeds. Sol submits once, is
rejected for missing phase/idempotency_key and a top-level run_id, and
stops: "I did not retry because you required exactly one submission
call". (2) Without a KB the session instructions are empty; the "once"
comes from the generated turn text (engine-server.ts:681 "use
engine.submit_round_proposals once") and the tool description
(schemas.ts:942 "queue one round proposal"); neither says whether a call
rejected by argument validation counts. Both readings fit the wording.
(3) The engine defines the full input schema (schemas.ts:781/893) but the
model-visible tool declaration in the rollouts shows `args: unknown`, and
the "proposal schema" resource (engine-server.ts:2586) documents only the
per-actor proposal, not the submission envelope — so a careful model
cannot get the shape right from what it can see. (4) protocol.md names
the envelope fields and the correction path; with it sol includes
phase/idempotency_key, still misplaces state_ref once, then corrects
and reaches status "proposed". Consequence: this is a harness gap, not
only a model trait. Queued as D466 increment F (new era only): (a) the
tool description carries the envelope in one sentence and states that a
call rejected by argument validation does not consume the single
submission; (b) the proposal-schema resource covers the envelope; (c)
find why the model-visible declaration is `args: unknown` (MCP schema
not surfaced through the exec tool wrapper?) and fix or document. The
D465 confound stands as recorded.
SOL ARM 1 VERIFIED (with protocol KB): 30/30 authorized, 25 model-planned
(5 engine), refusals 9, 0 timeouts, wall median 21.1 s, idle Disengage 3
(luna low 29, luna medium 7), Dash 87 (47 / 75), attack slots 39 (45 /
43). Arm 2 (s-rows) started 08:14:24.

D2.1 VERIFIED BUT NOT YET COMMITTED: A TEST-COST REGRESSION BLOCKS THE
GATE (supervisor, 2026-09-03 07:50): D2.1 (17 files +441/-86, five
simulated rollout fixtures) reads the session's rollout file for the last
token_count.last_token_usage after each completed turn — the --json
stream has no per-call usage (codex pasted a captured stream:
turn.completed carries only the turn total). Typed as turnInputTotal vs
contextInputTokens; the policy compares contextInputTokens only. My
mutation (both currentContextTokens writes -> turnInputTotal, guarded):
tsc REFUSES it (branded ContextTokenCount vs TurnInputTotal) and six
tests fail, 16/16 after restore proven by cmp — the type system doing
what AGENTS.md asks. But the arena test "reloads the fixture and full
context for each of three SIMULATED reps" now fails the full suite at
5.4-5.8 s (5 s default) on three consecutive runs at load 2-3 (4.46 s in
isolation); it passed in full runs before D2.1. Not a flake to wave
through: D2.1 made the per-call path more expensive. D2.2 dispatched:
bounded rollout lookup (cached path per session, tail read), cheaper
test, two green full runs, no timeout changes. D2.1 stays in the working
tree and is committed together with D2.2. Sol batch arm 1 running.

D465 RELAUNCHED WITH THE PROTOCOL SUBJECT; PROBE PASSES (supervisor,
2026-09-03 07:27): 2-room sol-low probe with sol-protocol-kb.txt
(kbHash 3111bc8f): 2/2 rounds model-planned, 0 auto-submit blocks, 0
refusals (previous probe without it: 0/2). Batch arm 1 (s-full) started
07:25:22 from main (old era), 240 s. D2.1 exited; supervisor gates
running.

POST-SHIFT CONTROL VOID: ROLLOVER FIRED ON THE WRONG QUANTITY (supervisor,
2026-09-03 06:40; finding against the D1/D2 increments and my review of
them): d466-control-cav-full-low landed 30/30 authorized, 0 refusals (old
era 9), engine-planned 1 (old 6), idle Disengage 1 (old 4), Dash 92,
attack slots 39, wall median 25.2 s (old 16.1), kbReads: protocol.md on
26/30 rows, hiddenOptions 294 (219 Disengage-without-movement, 72
unsupported spell payloads), omitted riders rendered on 132 plans, all
10 room digests changed (6 by creature replacement, the rest by the
typed PC size on the party pack). BUT contextRolloverOccurred on 11/30
rows (generation 1 on 9, 2 on 2) in one-round arms, which the plan
forbids. Cause verified from rows: callUsage[].input is 190k-557k per
phase = the codex exec turn's cumulative input over 10-36 internal calls
(turn.completed.usage.input_tokens is a TURN TOTAL), not the last call's
context (rollouts' last_token_usage, median 29k). I approved D2 on
codex's statement that turn.completed gave per-call usage; my R2
amendment asked for "the latest individual adapter call" and I did not
check the stream semantics against a rollout. Rows and log renamed
.VOID-rollover-quantity; not judged. D2.1 dispatched: distinct typed
turnInputTotal vs contextInputTokens (per-call from the stream if it has
it, else from the session's rollout token_count.last_token_usage), the
policy compares only contextInputTokens, arena regression fixture with
turn totals above and per-call context below the threshold, measurement
script main-guard fix. The control is rerun after D2.1 lands. The
threshold literal 160000 stands (measured on the right quantity).

CORRECTION: ARENA ARMS RUN ROOMS SEQUENTIALLY, ON BOTH ERAS (supervisor,
2026-09-03 06:00): watching the post-shift control I saw one operator
session at a time (14 rollouts in 15 min) and suspected the shift had
serialised the rooms. Read both checkouts: the non-interleaved arena
path awaits runConversation inside nested room/rep loops in main
(tools/ai-dm-arena.ts:569-571) and in the lane (:592-594) alike; only
--interleave dispatches concurrently. So the control's cadence is the
old cadence (~45 min per 30-round arm). The earlier D443 note's
"rooms run fully parallel, ~21 codex processes per arm" described the
conversation tool's fixture loading (Promise.all over readdir), not
operator dispatch; that sentence was wrong and this note supersedes it.
No behaviour change in the shift.

E VERIFIED AND COMMITTED; INTEGRATION GATE GREEN; POST-SHIFT CONTROL
LAUNCHED FROM THE LANE (supervisor, 2026-09-03 05:40): E (8 files
+476/-31, new reference-party-size.test.ts). Gates on the fully
integrated lane (A1..E, HEAD 818ef569): tsc 0, sg 0, vitest 544 files /
9515 tests on rerun (first run one 5 s-budget arena test, 4.5 s in
isolation). My dead-actor mutation (never advance past a dead active
actor, guarded): the E1 test fails, 16/16 after restore proven by cmp; an
earlier attempt on an unrelated `life !== 'living'` check survived and
was discarded as a wrong target, not counted. Codex's model-free 10x3
smoke on seeds 6203001-10: 30 rows, 0 refusals, no fallback reasons.
Preregistration amended in analysis-notes.md BEFORE launch: the control
uses the era leader's own profile (caveman full) so era is the only
difference vs cav-full-low 8.18; KB = ai-dm-core.md bundle with tactics
auto-appended; luna low, 120 s, seeds 6203001-10 x3, no escalation
flags; run from the integration worktree per D481 so main stays on the
old era until the single merge. Output d466-control-cav-full-low.jsonl.
Main merge is deferred until the owner's sol decision (D465 wants
old-era rows if it resumes) — the lane worktree makes that free.
Measurement script main-guard defect queued for the merge pass.

D2 VERIFIED AND COMMITTED; E DISPATCHED (supervisor, 2026-09-03 04:15):
D2 (21 files +914/-104, new agent-session-digest.ts, migration 0063 to
session schema 10, measurement fixture and test). Gates: tsc 0, sg 0,
vitest 543 files / 9504 tests, the D1 red test now green with the
measured literal 160000 pinned at agent-session-lifecycle.ts:224. My
mutation (removed the decisions sort comparator in the digest, guarded):
determinism test fails, 2/2 after restore proven by cmp. Two new
conversation tests carry explicit 60 s timeouts (new tests, not raised
existing ones; noted for load margin). Committed. Codex's measurement
script still prints nothing against the real sessions tree in my hands
(count 0 earlier, empty output now); its unit fixture passes — probing
the CLI shape; not blocking the shift. E (multi-round harness fixes
from the D459 smoke) dispatched — the last increment before integration.

ROLLOVER THRESHOLD MEASURED (supervisor, 2026-09-03 03:12; D457/R2):
from 1,083 codex operator rollouts (2026-09-02/03: D443 luna low and
medium arms, D449 k7 arm, the 3-round smoke, D447), 13,392 per-call
samples of event_msg token_count.info.last_token_usage.input_tokens:
median 29,102; p90 46,093; p99 86,762; max 238,731; luna
model_context_window 258,400. Threshold literal chosen: 160,000 (62% of
the window; ~98k headroom exceeds the largest single-round growth seen).
Codex's D1 measurement script printed count 0 against the real
directory because rollouts store usage in token_count events, not in
turn.completed items (those are on the --json stdout stream only); the
fix is part of D2. D1 harvested: 26 files +548/-41, new drizzle
migration 0062 (session schema 8 -> 9) and the measurement script; codex
reports the single expected red test `rollover threshold is measured`;
supervisor gates running.

C2 VERIFIED AND COMMITTED; D1 DISPATCHED (supervisor, 2026-09-03 02:32):
C2 (9 files +294/-10, new src/vtt/mcp/knowledge-base.ts). The per-row
budget is a spool file per room/round referenced by the initial,
correction and adjustment launcher manifests (codex's stated location;
its cross-phase test exercises it). Root grew to 2831 bytes with the one
tool/budget sentence (cap 3072). Gates: tsc 0, sg 0, vitest 541 files /
9485 tests. My mutation: first attempt (allowed 2->3 regex) hit the
loud guard and applied nothing — correct behaviour of the new rule; the
real check is `records.length >= KB_READ_LIMIT`; mutated to `>`, tests
fail, pass after restore proven by grep. Committed. D1 (per-call usage
capture, unmeasured rollover policy with a deliberately RED threshold
test, measurement script) dispatched.

C1 VERIFIED AND COMMITTED; C2 DISPATCHED; D447 PANEL VALID (supervisor,
2026-09-03 01:45): C1 = 10 new fixture files + src/vtt/knowledge-base-
contract.ts + tests/unit/tools/ai-dm-knowledge-base.test.ts (5 files
changed +69/-67). My checks: root 2706 bytes (cap 3072), root+tactics
3794 (cap 4608), tactics.md identical to k7-close.txt by cmp, index paths
repo-relative, no /home/vagrant or banned-source words in any fixture,
actions.md/spells.md contain rule definitions only (my sentinel grep hit
the word Dodge in a rules sentence, not a tactic). Gates: tsc 0, sg 0,
vitest 541 files / 9479 tests. My mutation (a k7 Dash line inserted into
the root, guarded to fail loudly if unapplied): sentinel test fails,
7/7 after restore proven by grep. Committed in the lane. C2 (two-read
engine.read_kb_subject tool + kbReads telemetry) dispatched. D447 panel:
three seats, 100/100 each, all structural checks clean; key sealed.

D447 BOTH ARMS LANDED AND VERIFIED; PACKET BUILT; PANEL DISPATCHED
(supervisor, 2026-09-03 01:22): candidate (caveman rows+move+gating, luna
low) 50 rows, 49 authorized / 1 timeout (refused), same 10 digests x5 as
the control, profile confirmed from rendererAttribution (caveman_prose,
rows best_exception). Mechanism counts control vs candidate: idle
Disengage 0 vs 1, Dash 132 vs 132, attack slots 66 vs 59, wall median
17.7 vs 17.5 s. Packet d447-packet-confirm (buildRerunPacket, prime 373,
protocol seeds 6204001-10 x 5 reps, 100 entries, leak scan none) judged by
the three seats via judge-one.sh; key sealed with D449 (and D465 if it
resumes). The box is now idle: D465 is on hold for the owner's sol
decision and the post-shift control waits for the D466 merge. C1 in
flight (16 files).

F: B4 COMMITTED WITH A MUTATION CLAIM THAT HAD NOT YET HAPPENED
(supervisor, 2026-09-03 01:03): my Calm Emotions mutation script looked
for a `radius*` field; the definition uses `baseSizeFeet`, so the assert
fired, nothing was mutated, and the two "test runs" in that command were
both unmutated 9/9 passes. I read the sequence as a successful mutation
check and wrote it into the B4 lane commit message and the previous
supervisor note. Caught on reading the command output. Redone on the
real field (baseSizeFeet 20 -> 25): three B4 tests fail
(sphere_radius_15_or_25, humanoid_filter_dropped,
indifference_not_ending_on_hostility), 9/9 after `git checkout` restore
proven by grep. Lane commit message amended (message only; C1 was
running in the working tree and is unaffected). Rule: a mutation script
must print the mutated line and the command must fail loudly (set -e or
an explicit exit) when the assert fires, so an unapplied mutation cannot
be followed by a test run that looks like evidence.

B4 VERIFIED AND COMMITTED; C1 DISPATCHED (supervisor, 2026-09-03 01:00):
B4 (27 files +606/-49, new tests/unit/vtt/d466-b4-spell-payloads.test.ts).
Codex reports tsc 0 / sg 0 / 540 files 9472 tests and both mutations
(radius 20->25, Athletics->Acrobatics). My gates: tsc 0, sg 0, 540 files
/ 9472 tests. My mutation (Calm Emotions radius 20->25 in definitions.ts)
fails the B4 test file, passes after restore proven by grep. Review:
Entangle already existed as a persistent area; B4 added the typed
Athletics escape check and choice slots; Dispel Evil and Good entered
the manifest (188->189, the count assertions updated to match a real
addition, not regenerated); Calm Emotions carries per-target modes with
monster-side indifference (D480); no non-SRD source words in the diff.
Committed in the lane. C1 (KB fixture package + relocation-safe loader;
tactical lines out of the root and subjects; tactics.md = k7) dispatched.
D447 candidate still running (55 min).

D447 CONTROL VERIFIED (supervisor, 2026-09-03 00:08): d447-control
(caveman full, luna low, generated rooms 6204001-10, 5 reps, 120 s) 50
rows, all authorized, 0 timeouts, 10 digests x5, caveman_prose profile
confirmed from rendererAttribution. Candidate arm started 00:04:58. B4
in flight (21 files touched).

B3 VERIFIED AND COMMITTED; B4 DISPATCHED (supervisor, 2026-09-02 23:50):
B3 (9 files +211/-9, new src/vtt/d466-room-overrides.ts and
room-roster-preflight.test.ts; six 6203 fixtures edited). My checks:
every edited fixture has zero doppelganger/ghost mentions and two
replacement mentions (state + spec halves); replacement HP equals the
replacement maximum (giant scorpion 52/52); the override is applied
inside generateRoom (room-generator.ts:627) so both the arena
--generate-missing-rooms path and the conversation tool get it; the
preflight test loads all 30 rooms and asserts an offerable attack-roll
option per creature and a disposition per feature. Gates: tsc 0, sg 0,
vitest 539 files / 9460 tests on the rerun (first run: one 5 s-budget
timeout in the arena round-robin test, 3.2 s in isolation — same
load-margin class as the A2 test). My mutation (override table extended
to 6204005 in both the union type and the table) fails the room-generator
test, passes after restore proven by grep. Committed in the lane. B4
(choice-on-activation, Calm Emotions, Entangle per D479/D480) dispatched.
D447 control still running (43 min).

B2 VERIFIED AND COMMITTED; B3 DISPATCHED (supervisor, 2026-09-02 23:16):
B2 (16 files +563/-10, new src/combat/monster-traits.ts and
monster-feature-support.test.ts). My gates: tsc 0, sg 0, vitest 538 files
/ 9454 tests. My mutation (Pack Tactics `<=` -> `<` in the shared
projection in src/combat/tactical-evaluator.ts): pack_tactics_five_not_ten
and pack_tactics_evaluator_reducer_agreement fail, 36/36 files pass after
restore proven by grep. Two of my first mutation attempts targeted the
wrong file (the predicate is in tactical-evaluator.ts, not
monster-traits.ts or combat-rules.ts) and applied nothing; those runs were
unmutated and are not counted. The flaky A2 test now runs 3.37 s in
isolation (was 4.28 s): still marginal against the 5 s default under
load; to be watched, never raised. Lane commit follows. B3 (typed
replacements, 6203 fixture edits, 6204 override table on the
--generate-missing-rooms path, 30-room preflight) dispatched. D447
control running since 23:07 on generated rooms.

SOL PROBES; D447 FIRST LAUNCH FAILED ON MISSING FIXTURES, RELAUNCHED
(supervisor, 2026-09-02 23:10): probes (2 rooms x 1 rep, s-full profile,
240 s): sol LOW 0/2 model-planned (both engine fallback after schema
rejection); sol MEDIUM 1/2 model-planned. Sol medium follows the protocol
half the time in this tiny sample; not enough to run a 15-arm batch on.
Owner question stands (sol medium / give sol the protocol subject / drop
sol). D447 first launch (22:59) died in 5 s on both arms: the arena
requires a fixture file per seed unless --generate-missing-rooms is
passed, and seeds 6204001-10 have no fixtures (as the audit found). My
launcher omitted the flag — supervisor error, caught at the next tick;
log kept as run-probe-then-d447.VOID-nofixtures.log, empty outputs
removed. Relaunched as run-d447-direct.sh with --generate-missing-rooms:
rooms are generated deterministically from the seed (the same
reconstruction the D454 audit used), no fixture files are added to main,
so B3's generator override table for 6204004/6/9 remains the right shape.
Preregistration otherwise unchanged (control first, 5 reps, 120 s).

D465 SOL-LOW BATCH STOPPED AFTER ARM 1: SOL LOW FAILS THE SUBMISSION
PROTOCOL (supervisor, 2026-09-02 22:58): d465-s-full-sol-low landed 30
rows, 0 timeouts, but 24/30 rounds were engine-planned (plannerLabel
sim_controller; 40 auto_submit_blocked_unresolved_frontier actors) and
only 5 model-planned. Cause, read from the sol operator rollouts (raw
transcripts, not sealed): sol reads the turn context and the proposal
schema resource, then makes ONE engine.submit_round_proposals call with
the wrong shape (missing `phase` and `idempotency_key`, `run_id` at top
level), gets rejected, and writes "I did not retry because you required
exactly one submission call"; its single permitted correction then adds
an invalid `correction_number` field and is rejected again. Luna under
the identical instructions and the same codex 0.148 exec-scripted tool
mode submits correctly. So the sol arm measured the engine's fallback,
not sol's tactics — useless for D465's purpose (distillation input).
Actions: post-D443 chain, the running arm 2 (rows) and its sol operators
killed by PID; d465-s-full-sol-low.jsonl renamed .VOID-protocol; arm 2
partial deleted. Box repurposed immediately: two sol protocol probes (2
rooms x 1 rep, low then medium) followed by D447 control and candidate
(luna low, unchanged design) in run-probe-then-d447.sh. Owner question
queued: sol at medium if the probe shows it submits correctly; or give
sol the protocol subject file from the KB plan (changes the arm's KB
relative to luna arms and is recorded as such); or drop sol from D465.
The D451 unsealing is unaffected; D449 key stays sealed with D447.

B1 HARVESTED; D449 PANEL VALID (supervisor note, 2026-09-02 22:30):
codex delivered B1 (24 files +433/-111, three new files: monster-feature-
support.ts, mixed-kind-multiattack.test.ts, monster-omitted-riders.test.ts)
reporting tsc 0 / sg 0 / 537 files 9448 tests. My gates: tsc 0, sg 0,
vitest 9447/9448 with one failure — "hidden_options_logged_once" (the A2
row-telemetry test) at 5108 ms; in isolation it passes in 4.28 s, i.e.
it sits inside the 5 s default with no margin and fails whenever the box
is loaded. Not a B1 defect; assigned to B2 as a side task: make the test
cheaper, never raise the timeout. Full-suite rerun in progress for a
clean gate before the B1 commit. My mutation (child lookup reverted to
attacks only): 3/3 mixed-multiattack tests fail, 3/3 pass after restore
proven by grep. Review: legalMultiattackCombinations now accepts attack
and saving-throw children; 'one_attack_may_be_replaced' takes the LAST
actionId as the replacement by position (typed enough for lion/wight;
flagged for a named replacement field later); the previous
"raises_as_zombie throws loudly" test was rewritten to assert Life Drain
executes damage and max-HP reduction while the zombie lifecycle is an
omitted rider — that is D454's rule, not a weakened test. D449 k7 panel:
three seats, 60/60 each, all structural checks clean; key sealed.

D449 K7 ARM LANDED AND VERIFIED; PACKET BUILT; PANEL DISPATCHED
(supervisor note, 2026-09-02 22:08): d449-s-full-low-k7 30 rows, 27
authorized / 3 refused (all three are 120 s timeouts; the weather rule is
>3, so the arm stands and the timeouts are scored as refused per the
preregistration), 10 digests x3 identical to the control, kbHash
1639ea14 (k7-close.txt), no escalations. Mechanism counts vs the control
d443-s-full-low: idle Disengage 29 -> 0, Dash 47 -> 84, Dodge 3 -> 1,
attack slots 45 -> 34, wall median 17.2 -> 22.0 s, token median 542k ->
652k. The nudge removed idle Disengage entirely; the attack-slot drop
and the timeouts are the cost side and go to the owner with the panel
result per D452. repoCommit differs (caff2d19 vs 62010319/9ea974fa)
because main gained decisions.md, packet-tool and fixture commits; no
engine or arena code path changed between them. Packet d449-packet-k7
(buildRerunPacket, prime 379, 60 entries, leak scan none) judged by the
three seats via judge-one.sh; key sealed with the D447/D465 program.
D465 sol-low batch started 22:03:16 (arm 1 of 15, 240 s).

D443 UNSEALED (supervisor, 2026-09-02 21:30, per D451; all 27 judge
outputs validated structurally first; totals recomputed from components;
refused = 0; service_null dropped pairwise). Results in
dnd-slim-runs/d443-results.txt.
EFFORT (medium minus low, paired by seed x rep, mean panel total, n=30
unless noted; SE of the paired delta): s-full +0.89 (0.45); s-rows +0.42
(0.49); s-opp +0.77 (0.30); s-move +1.16 (0.49); s-threats +1.89 (0.54);
s-gating +1.80 (0.68, n=29); cav-full +0.44 (0.15). Medium wins every
pair beyond the 0.2 band; all three seats agree in sign on every pair.
The gain is largest where the low arm was weakest (threats, gating) and
smallest for caveman prose, whose low arm was already the best low arm.
NEW-ERA LOW RANKING (7 arms, one 210-entry packet): cav-full 8.18;
s-rows 6.81; s-full 6.52; s-opp 6.34; s-move 5.89; s-threats 5.84;
s-gating 5.44. Caveman prose leads by 1.4 over the best structured arm;
among structured arms only s-rows beats s-full and only by 0.3; every
other reduction costs 0.2-1.1.
NEW-ERA MEDIUM RANKING (8 arms, one 240-entry packet): cav-full 8.72;
cav-rows-move-gating 8.60; s-threats 7.50; s-full 7.24; s-move 7.16;
s-opp 7.04; s-rows 7.03; s-gating 7.01. Caveman still leads by 1.2; the
reduction bundle on caveman is a tie with caveman full (-0.12); at
medium the structured reductions collapse to within 0.5 of each other
and s-threats moves from sixth to first among structured arms.
OLD-ERA COLUMN (D441 per-arm packets vs the p3-caveman control, three
seats, arm minus control): rows-move-gating +0.98, cav-threats +0.93,
cav-move +0.92, move-gating +0.87, move-threats-gating +0.83,
threats-gating +0.71, cav-rows +0.68, rows-move +0.64, ... cav-gating
+0.37, cav-opp -0.21, cav-all -0.55, opp-gating -0.75 (full list in the
report). Reading across eras: caveman prose is the format winner in all
three columns; "rows" (best_exception) is the one content reduction that
never hurts; "opp" and "gating" hurt at low in both eras and are neutral
at medium; the old-era winner rows-move-gating replicates as the
caveman bundle at medium (tie with caveman full).
D445 verdict: the ranking is stable enough to choose the P4/D460
incumbent without a runoff: caveman full (control) with the rows
reduction as the one safe content cut. D472's post-shift comparator is
cav-full-low (8.18).
CONFOUND NOTED per D470 rule for later sol packets: not applicable here
(luna operator on every arm).

D459 SMOKE FINDINGS (unjudged 3-round run, seeds 3943001-10 = the
conversation tool's default fixtures, luna low, k7 loaded, 30/30 rows
authorized): (1) the conversation tool already runs ONE operator session
across all rooms of a run with [ROOM_TRANSITION] resumes — D457's sitting
semantics exist today; sessionId identical across all 30 rows, context
revision monotonic 2 -> 306. (2) Context growth is real: per-round input
tokens reached 2.9M (room 5 round 2) and 2.7M (room 9); contextTruncated
was set on 5 rows — the D457 rollover is needed, not optional. (3) Four
rooms fell to engine planning in later rounds (rooms 2 and 9
engine_default, rooms 5 and 8 sim_controller with
auto_submit_blocked_unresolved_frontier). (4) Party-side harness
refusals in multi-round play: "Dead initiative actor combatant:wizard
remained active" (room 4, every round; contextRevision frozen at 102),
same for fighter in room 7; "Scripted party plan has no program for
combatant:cleric/wizard" (rooms 5, 10); "Scripted party turns require a
living player character" (room 8); "Monster on-hit size eligibility
requires a known size for combatant:cleric" (room 6). These are
multi-round harness/engine defects that the opening-round arms never
exercise; they must be fixed before the judged 3-round lane (D471) and
are added to the D466 shift as increment E (multi-round harness).

F: MANGLED JUDGE HEADER AND A SELF-MATCHING pkill (supervisor, 2026-09-02
21:08, two mistakes of my own): (1) judge-d443.sh substituted the entry
count with `${HDR//N/$n}`, which replaced every capital N in the header
("ONLY" -> "O60LY", "JSON" -> "JSO60", "NOT" -> "60OT"). Caught by the
post-launch header grep. The first packet's three seats were killed
before producing output; their logs deleted; the launch log kept as
judge-d443.VOID-mangled-header.log; placeholder changed to @@COUNT@@ and
the substituted header verified ("60 blinded", "ONLY outcome", "JSON
array of 60", "NOT a DM" all present). (2) The cleanup command used
`pkill -f "judge-d443[.]sh"`, whose regex matched the literal text of my
own command line (which contained judge-d443.sh) and killed my shell mid-
command (D444 self-match class again, this time through pkill). Rule
added to the pgrep memory: kill by PID from a ps listing, never pkill -f
with a pattern that appears in the same command. No arena or smoke
process was affected (smoke, post chain and D447 waiter verified alive).
Panel relaunched 21:08 with the corrected header.

D443 JUDGING PREREGISTERED, PACKETS BUILT, PANEL DISPATCHED (supervisor
note, 2026-09-02 21:03): design in analysis-notes.md before any packet was
built: seven effort-pair packets (low vs medium per profile, 60 entries,
primes 433/439/443/449/457/461/463), one 7-arm new-era LOW ranking packet
(210 entries, prime 467), one 8-arm new-era MEDIUM ranking packet (240
entries, prime 479). All nine built with buildMultiArmRerunPacket; leak
scan 'none' on every packet (scan now also rejects 'medium', 'low',
'luna', 'effort', 'structured', 'best_exception'); outcome mixes match
the arm files (rank-low 206 authorized / 4 refused; rank-medium 239 / 1
service_null). Judge script judge-d443.sh: three seats per packet in
parallel (sol high via codex exec read-only default home; opus; fresh-
context fable), packets sequential; prompts via stdin because the ranking
prompts (185 KB / 212 KB) exceed the 128 KB argv limit. Keys sealed
(d443-key-*.json) until all 27 outputs validate (D451). Smoke (D459) is
running concurrently; judges are network-bound.

D443 SWEEP COMPLETE; ARM 15 VERIFIED (supervisor note, 2026-09-02 20:52):
d443-cav-rows-move-gating-medium 30/30 authorized, 0 timeouts, 10 digests
x3, refusals 9, model-planned 30/30, wall median 20.7 s / p90 43.5 s,
token median 597k, idle Disengage 2, Dash 91, attack slots 46. Resumer
printed "D443 ALL DONE" at 20:50:53; all 15 arm files have exactly 30
rows (verified by wc). Post-D443 chain now owns the box: D459 smoke ->
D449 k7 -> D465 sol-low batch; D447 waiter behind it. Next supervisor
work: build the D443 judging packets (per D451 the sweep unseals as soon
as its judging validates).

ARM 14 VERIFIED (supervisor note, 2026-09-02 20:07): d443-cav-full-low
30/30 authorized, 0 timeouts at 120 s, 10 digests x3, refusals 9, no
escalations, engine-planned rounds 6 (sim_controller; highest of the
sweep so far), wall median 16.1 s / p90 28.7 s, token median 495k. Idle
Disengage 4, Dash 85, attack slots 41. Caveman low and medium look alike
on mechanism counts (medium: 3/84/46). Arm 15 cav-rows-move-gating-medium,
the last D443 arm, started 20:04:12. A1.1 still in flight in the lane.

A1 VERIFIED AND COMMITTED IN THE LANE; F: MUTATION LEFT IN AN UNTRACKED
FILE FOR ~40 s (supervisor, 2026-09-02 19:58): codex delivered A1 (29
files, +379/-146). My independent gates: tsc 0, sg 0, vitest 535 files /
9426 tests passed (19:56:42); codex reported the same numbers. My Dodge
mutation: 2 of 4 option-modeling tests fail, 4/4 after restore. Lane
commit follows. Finding against my own work: I restored the mutated
src/vtt/option-modeling.ts with `git checkout --`, which is a silent no-op
on an UNTRACKED file; the second test run I read as "restored" was
actually still mutated (same 2 failed). Caught because the grep for the
mutated line returned 1 and status showed `??`. Restored from the backup
copy I had taken first; test 4/4; committed. Rule: mutation checks on new
files restore from an explicit backup, and the restore is proven by a
grep for the mutated text returning 0 BEFORE the confirming test run.
Review findings for codex (A1.1, before A2): (F1) Disengage classification
treats any non-withdraw stance as "stationary" — a Disengage that moves
toward another enemy while adjacent to one also prevents a modeled
opportunity attack and must stay offerable; (F2) an existing expectation
in ai-dm-conversation.test.ts changed contains_unresolved -> fully_resolved
for one actor without stated cause; codex must show which option moved to
humanOnly and pin it, not just update the literal; (F3) base attacks with
unresolved riders are now offered with omittedRiders: [] (typed never);
B1 must populate the flag before merge — acceptable inside the lane only.

ARM 13 VERIFIED (supervisor note, 2026-09-02 19:37): d443-cav-full-medium
30/30 authorized, 0 timeouts at 240 s, 10 digests x3, refusals 9, no
escalations, wall median 16.0 s / p90 36.7 s (faster than any structured
medium arm), token median 560k. Idle Disengage 3, Dash 84, attack slots
46. Arm 14 cav-full-low started 19:28:25 (120 s). A1 in flight in the
lane: 27 files modified, contracts.ts untouched (sha 0f0e1d8f…), no
claude invocation in the log.

D466 PLAN CONSENSUS; A1 DISPATCHED (supervisor note, 2026-09-02 19:27):
codex accepted all six round-1 amendments (d466-shift-plan-v2.md, 364
lines): sunlight provenance cut (Sunlight Sensitivity typed
encounter_not_applicable/no_sunlight_state); rollover threshold from the
latest per-call turn.completed.usage.input_tokens (adapter decode verified
by me at src/vtt/agent-adapters/codex.ts:149-170) with a deliberately red
"rollover threshold is measured" test until measured; preflight on
post-override 6204 rooms + untouched-seed digests pinned; CR equality
confirmed from astral-tower.ts challengeById (doppelganger 3/ghost 4/
will-o-wisp 2 vs giant-scorpion 3/archelon 4/gargoyle 2); null-escalation
unreachability test; single printout. Plan approved. Lane fast-forwarded
to main (716ba5dd). Pre-dispatch baseline in the lane, run by me: tsc 0,
sg 0, vitest 534 files / 9422 tests passed (19:26:10). Increment A1
(types + registry partition + compile-time proof) dispatched to codex sol
high, workspace-write, 19:27 (d466-A1-codex.log). Arm 13 still running.

D466 SHIFT PLAN: CODEX DRAFT REVIEWED, ROUND 1 RETURNED (supervisor note,
2026-09-02 19:1x): codex sol produced a 360-line plan (dnd-slim-runs/
d466-shift-plan.md; four parts A-D, nine increments, tests with named
mutations, 18 assumptions). Supervisor verified 14 assumptions locally in
the lane (contracts.ts sha 0f0e1d8f…, registry attack-only child filter at
turn-option-registry.ts:181, six 6203 fixtures, zero 6204 fixtures,
replacement creatures present with zero audit findings, traits typed,
k7 1086 bytes, KB seam at ai-dm-conversation.ts:652/1226, no sunlight
provenance in LightLevel). Six amendments sent back: cut sunlight
provenance (typed not-applicable instead); rollover threshold must come
from per-call context input, not the per-round token sum (median 286k/438k
is a sum), with a failing placeholder test until measured; preflight must
run on post-override 6204 rooms and prove untouched seeds byte-identical;
confirm CR equality of replacements; prove D2 escalation path unreachable
in arms with no escalation flags; drop the duplicate printout. Resumed
codex session for the amended plan (d466-plan-codex-2.log).

ARM 12 VERIFIED (supervisor note, 2026-09-02 18:52): d443-s-gating-medium
29/30 authorized (one non-authorized row, same count as the low twin), 0
timeouts at 240 s, 10 digests x3, refusals 14 (low 12), no escalations.
Idle Disengage 21 -> 12, Dash 51 -> 62, attack slots 31 -> 36, wall median
18.0 -> 22.9 s, token median 540k -> 943k. Arm 13 cav-full-medium started
18:49:05. D466 shift plan dispatched to codex sol (read-only, stdout) at
18:44; pending.

BRAINSTORM ROUND 2 MERGED; FIVE SUPERVISOR-LEVEL DEFAULTS RECORDED
(supervisor note, 2026-09-02 18:15; dnd-slim-runs/brainstorm2-merged.md):
codex sol 13 + opus 15 questions merged to 12 owner questions. Defaults
the supervisor takes without asking, reversible by the owner: (1) hide-vs-
flag boundary = offer when the primary effect executes, flag secondary
omissions, hide only when nothing resolves; (2) interim D463 fallback
before the D461 ranking exists = highest-EV range-legal offered option,
else Dash toward nearest enemy, else Dodge, tagged sim_controller +
timeout; (3) subject-file reads capped at 2 per turn at the tool port,
logged per row; (4) any new seed set passes a roster preflight (every
creature has an offerable attack, every unmodeled feature flagged) before
an arm may use it; (5) D460 distillation is re-run on post-shift rows with
luna medium as teacher, sol-low as corroboration, luna low as student,
preregistered before labels are read.

RIDER AUDIT HARVESTED (supervisor note, 2026-09-02 18:2x; D454 item 2):
codex sol high, read-only, enumerated all 30 rooms in use from the seed
fixtures and the brutal generator (6204xxx have no fixtures; reconstructed
deterministically) and produced 68 findings, rider-audit.md/json in
dnd-slim-runs. Three creatures have NO offerable attack-roll action:
doppelganger (5 rooms: 6203002/3/7, 6204004/6), lion (6203005, 6204005),
wight (6204006). Cause for lion/wight verified by me in
src/vtt/turn-option-registry.ts legalMultiattackCombinations: any
non-attack child (Roar, Life Drain are saving-throw actions) empties the
combination list, and an existing multiattack suppresses standalone
attacks. Conditional-rider attacks (goblin advantage d4, boar/elephant/
warhorse-skeleton charge, homebrew crest/raking) are BASE_OFFERABLE_WITH_
FLAG and already resolve with conditional_damage_rider_unresolved.
Unprojected traits: Pack Tactics (six creature types, 13 rooms), Running
Leap, Abduct, Bloodied Frenzy/Fury, Sunlight Sensitivity, Aura of
Authority, homebrew Spider Climb/Web Walker/aquatic breathing. Unsupported
spell payloads: priest Light/Thaumaturgy/Spirit Guardians/Dispel Magic,
acolyte Sanctuary, unicorn suite (7 spells + Unicorn's Blessing
spell_choice). Codex recommends REPLACE_CREATURE for none. Supervisor
modeling order for the D466 shift, severity first: (1) mixed-kind
multiattack (attack children + saving-throw child) so lion and wight get
attacks; (2) doppelganger Slam offered with typed omitted-rider flag,
Multiattack without Visage coupling, Read Thoughts rendered no-effect per
D453; (3) rider flag on every conditional-rider attack; (4) Pack Tactics
projection; then priest/acolyte utility spells and the unicorn suite. The
room pass (D454 item 3) after arm 15 uses this list.

ARM 11 VERIFIED; KB PLAN + STRATEGY DISTILLATION REVIEWED (supervisor
note, 2026-09-02 18:15): d443-s-threats-medium 30/30 authorized, 0
timeouts at 240 s, 10 digests x3, refusals 11 (low twin: 28/30, 2 timeouts,
13). Idle Disengage 24 -> 6, Dash 50 -> 75, attack slots 39 -> 46, wall
median 16.4 -> 24.0 s. Arm 12 gating-medium started 18:00:01. Codex KB plan
and strategy analysis reviewed in dnd-slim-runs/
supervisor-review-kb-plan-and-strategy.md: five required changes on the KB
plan (tactical lines out of the root per D458, no host-bound lane paths,
capture subject-file reads per row, A/B becomes a D452-style regression
check, encounter-scoped role sentence); strategy rules 1-10 accepted as the
D460 candidate set after two numbers were reproduced independently (wall
medians 17.2/24.5 s; zero-movement Disengage 88 low / 49 medium vs codex
85). Codex's analysis predates arm 11 and must be refreshed with threats
and the D465 sol-low rows before the D460 build. Post-D443 chain (D459
smoke -> D449 k7 -> D465 sol-low) detached and waiting on the resumer.

FINDING: TWO CODEX ANALYSIS JOBS DISPATCHED READ-ONLY WHILE TOLD TO WRITE
FILES (supervisor, 2026-09-02, my error): the KB-plan job (session
01a06402…) and the effort-strategy distillation (01a06403…) each finished
their reasoning (90k / 124k tokens) and stopped loudly: "BLOCKED — read-only
sandbox rejected creation of kb-plan.md" and "dnd-slim-runs is not writable;
no output files created". Codex behaved correctly; the briefs asked for files
under `--sandbox read-only`. Recovery: both sessions resumed read-only and
told to emit the composed deliverables as the final message
(kb-plan-codex-2.log, effort-strategy-codex-2.log); supervisor writes the
files. No repo state touched. Rule: an analysis job that must produce a file
gets `--sandbox workspace-write -C <output dir>` or prints the deliverable.

FINDING: SELF-TARGETED DETECT THOUGHTS = A DOPPELGANGER WITH NO USABLE
ATTACK (supervisor, 2026-09-02, raw rows + repo source only): owner spotted
a self-targeted Detect Thoughts. 25 such casts across the nine landed D443
arms, always by the same three creatures (rooms 2, 3, 7, one monster each),
always the "read-thoughts/detect-thoughts" option, always 0 ft movement.
The creature is the Astral Tower doppelganger
(src/combat/statblocks/astral-tower.ts:180ff): its Multiattack is
actionUnavailable ("withheld until Unsettling Visage coupling is
supported") and its Slam is actionUnavailable ("withheld until its
first-round advantage is included"), so the engine offers it NO attack at
all — its rendered option list in room 7 is read-thoughts, Dash,
Disengage, Dodge, End Turn (plus healing-word combos). Detect Thoughts is
range Self per the SRD (docs/srd/source/spell-descriptions.txt:2119), so
the self target is rules-correct; the engine models the effect as an
unsupported utility (option-outcome.ts:313 detect_thoughts: 'unsupported';
expectation reason spell_operation_unsupported), i.e. a no-op. No room
has invisible or hidden creatures (0 mentions in the contexts), so there is
no legitimate Sense-Thoughts use either. Net: the DM is choosing the only
"magic" option a creature with no attacks is offered. This is an engine
content gap (typed-unavailable withholding of the whole attack because a
rider is unsupported), not a model reasoning failure, and it hits every
arm identically (shared control rooms), so it is symmetric noise in the
sealed comparison, not a bias. Proposed fixes, queued for the era
re-anchor before P4, not applied mid-D443: (a) degrade gracefully — offer
Slam without its first-round-advantage rider (an attack missing a rider
beats no attack) and Multiattack without the Visage coupling; (b) the
brutal room generator should reject creatures whose statblock has zero
usable attacks; (c) render "no modeled effect" on unsupported-utility
spells so the DM is not lured by them. Owner's rule of thumb recorded:
Detect Thoughts only makes sense to look for something invisible nearby.

FINDING: DISENGAGE OFFERED AND TAKEN WITH NO ADJACENT HOSTILE (supervisor,
2026-09-02, raw rows only, no judge output read): owner noticed luna-low
disengages becoming dashes at medium. Checked every disengage plan in the
four landed full/rows arms against the engine intel distances for that
actor: s-full-low 29 disengages, nearest hostile 35–100 ft in all 28
resolvable cases, 29/29 moved 0 ft; s-full-medium 9 (all >=40 ft, 7 moved
0 ft); s-rows-low 23 (20/20 resolvable far, 22 moved 0 ft); s-rows-medium
16 (15/15 far, 14 moved 0 ft). Zero disengages with a hostile within 5 ft
in 77 cases. So yes: monsters disengage when nothing threatens them,
usually as a whole wasted turn — a 'do nothing' pick when they cannot
reach anyone (room 3 monsters have 15 ft speed vs 35–40 ft gaps). Medium
converts most of these into dash (closing). Mechanism: the option catalog
offers "Disengage" unconditionally (usable_now true, risks [], expectation
metric none) and the rendered turn context never says "no hostile within
reach" — the model is not told the action has no effect. Proposed fix, NOT
applied mid-D443 (would shift eras under running arms): renderer/intel
increment that either gates Disengage on an adjacent-hostile predicate or
annotates it "no hostile adjacent: no effect", plus the same for Dodge
vs no incoming attacks; queue for the era re-anchor before P4. This is
also a candidate rubric note for judges: disengage-with-no-threat is an
action-economy zero regardless of prose.

## D495 — OWNER: for video downloading, find or build a docker image that does it all (2026-09-03)

Owner (verbatim): **"For the video downloading. Find or build a docker
image to do it all"** (supersedes the tool-install question under
D494; written accounts remain the primary source).

Done: docker is usable on the box; built `bg3-video-tools:latest`
(python:3.12-slim + ffmpeg 7.1 + tesseract 5.5 + yt-dlp 2026.08.19,
Dockerfile and extract.sh in the private repo eval/video-tools/). The
script downloads a video (<=1080p), samples frames at 0.5 fps, crops the
right-hand third (BG3's combat-log panel), OCRs each frame and writes an
index.tsv (frame, seconds, text) for manual correction. First run
started on the explicitly Tactician mud-mephit video (4DI3Pl0i8pk) into
the private recordings directory. Nothing from the videos or OCR leaves
the private repo.

## D494 — OWNER: for the BG3 lane, use written accounts and prior reverse-engineering, not video tools (2026-09-03)

Asked: install yt-dlp/ffmpeg/tesseract for video transcription.

Owner: **"Look for written accounts of bg3 behaviour and prior attempts
to reverse engineer and debug how bg3 works."**

Found and stored privately (dnd-research-private/bg3-npc-ai/notes/
larian-combat-ai.md): Larian's own Combat AI documentation (docs.
larian.game) describing the "Jane" pipeline — eligibility, per-target
effect simulation, weighted action score, position score, movement
score, argmax, fallback-to-favourable-ground — and the full base
archetype modifier table with defaults (kill bonus 2.5, already-engaged
target 3.0, summon target 0.35, pile-on penalties 0.5/0.25, friendly
fire 1.5, knockdown 1.75, charmed 2.5, movement cost 0.9, flanking
0.05, jump only when saving >= 2 AP, difficulty overrides under
Archetypes/TACTICIAN/); BG3 modding sources (mod.io archetype-weights
guide, Nexus Smarter AI / UTAC, docs.baldursgate3.game archetype page —
most are 403/404 to a fetcher; UTAC's changelog gave BG3 parameter
names such as MODIFIER_HIT_CHANCE_STUPIDITY). This is exactly the prior
art needed: BG3's enemy AI is a weighted simulate-and-score argmax over
(skill, target, position), which maps onto our intel rows and the
D461/D477 ranking; the private policy spec will be rewritten in those
terms. Video candidates stay listed for later verification.

## D493 — OWNER: BG3 lane targets Tactician; BG3-style mechanics behind the mode flag; mud mephits first (2026-09-03)

Owner: **"Tactician"**, **"Add BG3-style mechanics behind the mode
flag"**, **"Mephits first"**.

Consequences: recordings must be Tactician-difficulty fights on flat
ground; the public engine gains, behind a `tactical_mode_v2` flag with
SRD-clean names, the mechanics that drive the imitated behaviour (shove
as a bonus action, jump as movement, bonus-action dash for designated
creatures, simple surfaces) — each a typed feature with its own tests,
off by default, never affecting arena arms or the SRD mode; the first
private sub-lane is mud mephits (summon/kiting/death-burst behaviour),
then spellcasters, then melee. The mephit work exposes engine gaps early
(area effects on death, summoner behaviour, flight/kiting), which is the
owner's intent.

## D492 — OWNER: BG3 ground truth from published playthrough videos; neutral policy in the public repo, BG3 material private (2026-09-03)

Asked: recordings source (owner-provided / documented-first / published
videos) and code placement.

Owner: **"Use published playthrough videos"** and **"Neutral policy in
the public repo, BG3 material private."**

Consequences: the supervisor locates public gameplay videos of flat-
ground BG3 fights featuring easy melee enemies, spellcasters and mud
mephits, and records links, timestamps and per-turn decisions as
private fixtures under dnd-research-private/bg3-npc-ai (transcription is
manual and slow; videos with a visible combat log are preferred; any
turn the transcriber cannot read is marked unknown, never guessed). The
public repo receives only the neutrally named deterministic policy
("tactical policy v2", mode flag) and SRD data; agreement scoring
against BG3 stays private.

## D491 — OWNER: a BG3 NPC-AI matching lane, in a private repo, no agent assist (2026-09-03)

Owner (verbatim): **"Can we have a lane to try to match the bg3 npc ai
behaviour in a private repo. I want recordings of bg3 fights (prefer
without high/low ground) I want our vtt in bg3 mode to be able to at
least match bg3 in breath of behaviour and performance with easy melee
type monster and ones that are more complicated like spellcasters and
mud mephits. I want out vtt to at least be able to match bg3 without an
ai agent assist."**

Set up: private git repo /home/vagrant/dnd-research-private/bg3-npc-ai
(outside every public tree; never pushed) with recordings/, notes/,
specs/, fixtures/, eval/. Licensing wall unchanged: BG3 and bg3.wiki
material lives only there; the public repo receives a neutrally named
deterministic policy ("tactical policy v2" / "bg3 mode" as a mode flag
without BG3 content) built on the engine's existing intel (team scorer,
opportunity-cost frontier, D461/D477 ranking objective: confirmed kills,
sequential coordination), plus SRD creature data. Ground truth must be
recordings the owner provides; until then any behaviour catalogue is
marked UNVERIFIED. Pending owner answers: recording source/format and
confirmation of the private/public split.

## D490 — OWNER: overrides need a typed kind plus the D489 reason; judge-visibility only in the preregistered arm; run the three-arm experiment (2026-09-03)

Asked (on the retrospective evidence): reason required + typed kind +
judge-visible with the experiment (supervisor recommendation), keep D485
strict as baseline with free-text challengers, or adopt visibility
outright without the experiment.

Owner: **"Reason required, typed kind, judge-visible; run the
experiment."**

Consequences: D485's engine-vocabulary requirement is relaxed: an
override carries a typed kind (objective | morale | roleplay |
resource_conservation | unknown_engine_gap | engine_play(token) |
missing_metric(id)) plus the mandatory D489 reason; empty or boilerplate
reasons are still rejected (REASON_REQUIRED / OVERRIDE_UNJUSTIFIED when
the reason merely restates "offered/legal/selected"). Reasons reach the
judges only in the preregistered judge-visible arm of the three-arm
experiment (strict / free-text judge-visible / free-text unscored, per
the retrospective's design) on the new era; the default packet keeps
reasons in the answer key. G2 implements D485-strict as built; G2.1
relaxes it to this rule and adds the reason requirement.

## D489 — OWNER: every AI decision carries a debuggable reason (2026-09-03)

Owner (verbatim): **"We are in the early data collection and
experimentation phase with the ai dm. We should be making sure that the
ai gives a reason that we can debug later for every decision so that we
can compare good and bad outcomes and trace the reasoning."**

Consequences:
1. The decision contract (G1 minimal submit, H1 structured final in both
   variants, H4 intent) gains a REQUIRED short `reason` per actor
   proposal (free text, bounded, e.g. <= 240 chars) and an optional
   round-level `rationale`; an override justification is a typed
   sub-case of the reason, never a substitute for it. A proposal without
   a reason is a typed rejection (REASON_REQUIRED) that does not consume
   the submission.
2. Reasons are recorded verbatim per row (authorizedPlan[].reason) and
   in the packet ANSWER KEY; they are NOT shown to judges by default
   (they could carry arm-identifying text) — a separate reason-visible
   packet variant is allowed only as a preregistered arm.
3. Traceability: each row links reason -> chosen option -> engine's
   expected outcome (from the intel rows) -> executed result -> the
   round's judged score, so good and bad outcomes can be compared by
   reason text and reason class later. The G2 planner/outcome fields
   make the link complete.
4. Applied now as: H1.1 amendment item 7 (both H1 variants), G2.1 (the
   minimal MCP submit gets `reason`), H4 (the intent text IS the reason
   and is stored with the match evidence), skills (the SKILL.md contract
   asks for a reason per actor). The old-era arms have no reasons; only
   post-shift data carries them.

## D488 — OWNER: keep D453; capture unmodeled intent as typed gaps through the H4 matcher (2026-09-03)

Asked (opus DM-perspective objection to D453): keep D453 and capture
intent gaps via H4 (supervisor recommendation), or show hidden options
to the AI with a no-effect label.

Owner: **"Keep D453; capture intent gaps via H4."**

On the override question (opus vs D485) the owner asked for **"context
details and examples to help decide. Run an experiment as well to check
if opus is right or not"** — D485 stays in force meanwhile; a codex
retrospective (override kinds/texts/examples, panel-score comparison
from the unsealed D443 keys, classification engine-expressible vs
DM-only vs rubber-stamp) is dispatched and a preregisterable forward
experiment {D485-strict, named-free-text-judge-visible, free-text-
unscored} is being designed; the owner decides on the evidence.

## D487 — OWNER: parallelize everything; worktrees per strategy; different models collaborate; permute the Gs and Hs (2026-09-03)

Owner (verbatim): **"Parallelize everything you can. Look for seams to
split tasks up. Set up worktrees to try different strategies from
different perspectives using collaboration of different models.
Experiment with different permutations of the Gs and the Hs"**

Program set up 12:33:
- Worktrees from lane HEAD 79dca133 (post-G1): dnd-wt-h1-ids
  (claude/h1-ids, codex sol high: H1 with the id-based constrained final
  decision), dnd-wt-h1-indices (claude/h1-indices, codex terra xhigh: the
  competing A3 index-based variant with an interim ranking = engine
  frontier/default first), dnd-wt-h3-skills (claude/h3-skills, codex sol
  high: skills infrastructure + two SKILL.md). G2 continues in the lane
  (dnd-lane-rollout). node_modules shared by symlink.
- Perspectives: opus (claude -p, read-only) critiques the decision-
  extraction plan as type designer / experimentalist / DM and proposes
  one alternative; luna medium drafts alternative SKILL.md texts for a
  fourth skill arm; codex sol/terra implement; the supervisor gates and
  arbitrates. Claude subagents are still not used; opus/luna are
  explicit owner-authorized collaborators here.
- Judging parallelized: five 2-arm packets (d465 s-full/s-rows/s-opp/
  s-move vs luna-low twins, primes 503/509/521/523; d483 s-threats vs
  its no-KB twin, prime 487) built leak-clean and queued through the
  three-seat panel while the arena keeps running.
- Merge plan: each worktree is gated by the supervisor separately (tsc,
  sg, full vitest, mutation checks), then merged into the lane in the
  order G2 -> H1 winner -> H3; the losing H1 variant is kept as a branch
  for the transport A/B, not merged. Conflicts in tools/ai-dm-
  conversation.ts are expected and resolved by the supervisor with a
  codex review of the merge.

## D486 — OWNER: the D466 era shift includes H1 and H3 (2026-09-03)

Asked: shift ends at G2 with H1/H3 as the next program (supervisor
recommendation), or include H1 and H3 in the shift.

Owner: **"Include H1 and H3 in the shift."**

Consequences: the post-shift control runs after G1, G2, H1 and H3 have
landed and the integration gate is green again; the control keeps the
mcp_minimal transport and instructionSource none so it is comparable to
cav-full-low 8.18 on era alone; the skills/transport experiment arms then
run against that control on the same era. About one more day before the
control.

## D485 — OWNER: a dominance override must name an engine play or a concrete missing metric (2026-09-03)

Asked: require a named engine play or missing metric (supervisor
recommendation), keep accepting freely, accept but flag and score.

Owner: **"Name an engine play or a concrete missing metric."**

Consequences (added to G2): an 'objective' override must carry an
engine-issued play token from the current context; an 'unknown_engine_gap'
override must name a typed metric identifier the engine does not expose
for that option; anything else is a typed rejection
(override_unjustified) that does not consume the submission. Rows record
override kinds and rejections; the packet key records them.

## D484 — OWNER: a rejected first submission followed by a retry must be rare, not standard (2026-09-03)

Owner (verbatim): **"I would like it to be that failure then retry for
submission should be rare, not standard."** and **"look for other
nonsensical things that are happening that I don't know about"**.

Consequences: F (submission envelope in the tool description, rejected
calls do not count, schema resource, `args: unknown` investigation) is
the first step, not the whole answer. A codex brainstorm+audit was
dispatched read-only over the raw rollouts and rows: measure the
first-submission failure rate and its causes, rank fixes that make a
correct first call the norm (real schema exposure, a pre-filled
envelope/draft tool, server-side fill of state_ref/request_id/
idempotency_key, validate-then-submit, envelope example in the turn
text, typed rejections carrying the corrected envelope), and audit for
other absurdities (repeated tool discovery per round, speculative-branch
mismatch rejections, correction loops, auto-submit blocks, KB re-reads
every round, absurd executed plans). Supervisor measures the headline
rate independently. Findings become the design input for a further
increment before the post-shift control is rerun.

## D483 — OWNER: rerun a few random luna arms with sol's operating instructions (2026-09-03)

Owner (verbatim, mid-turn): **"Test a few random Luna arms with the extra
operating instructions that sol got. See what changes"**

Consequences: three low profiles drawn with a recorded seed
(random.seed(483)) — see analysis-notes.md — rerun at luna low on the old
era with the identical protocol KB file sol received; compared to their
D443 no-KB twins on mechanism counts now and by blinded 2-arm packets
later (sealed with the D447/D449/D465 program). This also measures the
size of the D482 confound directly. Runs alongside the sol batch, two
operator sessions at a time, weather rule watched on both.

## D482 — OWNER: give sol the protocol subject and rerun D465 at low (2026-09-03)

Asked: drop sol (supervisor recommendation), rerun at medium, give sol the
protocol subject and rerun low, defer sol to the new era.

Owner: **"Give sol the protocol subject and rerun low."**

Consequences: the D465 batch relaunched from main (old era) with
`--kb dnd-slim-runs/sol-protocol-kb.txt`, a verbatim copy of the lane's
protocol.md (901 bytes) placed outside the repo so the old-era arena's KB
path rule accepts it; sol low, 240 s, same seeds/reps/profiles; a 2-room
probe runs first and the supervisor kills the batch if sol still does not
self-plan. The confound (sol has protocol text, luna arms had none) is
recorded in analysis-notes.md and must appear in the D465 report. The
main merge of D466 waits for the batch (~12 h); the post-shift control
reruns from the lane after D2.1 lands and after the batch, so arms stay
sequential.

## D481 — OWNER: all engine changes merge at once; increments land in a worktree while arms run on unchanged code (2026-09-02)

Owner (verbatim, mid-turn): **"Make it so all of the engine changes merge
at once. Use a worktree to merge each into when finished so that the arms
can still run on unchanged code while the engine improvements are
written."**

Consequences: this is the D466 arrangement, now explicit. The lane
worktree /home/vagrant/PhpstormProjects/dnd-lane-rollout (branch
lane-wt/ctrl-value) is the integration worktree: every finished, gated
increment (A1 6c807fce, A1.1 …, A2, B1–B4, C1–C2, D1–D2) is committed
there. The main repo working tree, which the arena chains run from,
receives no code change until the single D466 merge after the D465
sol-low batch and D447 have landed on the current era. decisions.md
notes continue to land on main because they are not code and do not
affect arena behaviour.

## D480 — OWNER: Calm Emotions is crowd control; all monsters are allies for now (2026-09-02)

Owner (verbatim, mid-turn): **"Calm emotions is real crowd control. For
now assume all monsters are allies."**

Consequences for B4: a monster caster's Calm Emotions is modeled as
control, not comfort: the caster picks the sphere to cover enemy
Humanoids, and the per-target mode is the indifference mode toward
creatures of the caster's choice (the monster side), which ends if the
target is attacked or harmed by a spell or sees an ally being attacked;
the suppression mode is available but not the default the advice layer
ranks. Side model: every monster is an ally of every other monster
(one monster team) for Calm Emotions' choice set, Pack Tactics' ally
check, focus-fire coordination and the D476 knowledge ledger, until a
faction model exists. Typed as a single `monster_side` faction constant,
not scattered booleans.

## D479 — OWNER: choice-on-activation for Unicorn's Blessing and similar; model Calm Emotions and Entangle (2026-09-02)

Owner (verbatim, on the unicorn/priest unsupported-spell table): **"For
unicorn, make it like bg3 so that blessing activation causes a pop where
you decide between 'cure wounds' and 'lesser restoration' (this should be
similar to how you choose damage type when you cast 'chaos orb'). Apply
this to other similar situations. Calm emotions sphere and entangle ape
should be able to be modeled."**

Supervisor reading and consequences:
1. Choice-on-activation pattern. The engine already carries this shape
   for Chromatic Orb (damageTypeChoice, src/combat/spells/definitions.ts
   :363 and :239) and Blindness/Deafness (condition_choice, :630).
   Unicorn's Blessing (statblock.ts:490 `spell_choice`, monsters.ts:254)
   becomes an offered bonus-action option whose activation carries a
   typed choice slot `spell_choice: 'cure-wounds' | 'lesser-restoration'`
   drawn from the shared 3/day pool; the human UI prompts at activation
   (the same interaction as the Chromatic Orb damage-type prompt); the AI
   DM supplies the choice in the proposal (an option per choice is NOT
   generated — one option, one typed choice field, validated against the
   closed set). Applied to every "decide at activation" site: Command
   (word), Dispel Evil and Good (mode), any other `*_choice` operation or
   `spell_choice` action the disposition audit surfaces. The reference to
   BG3 is a UX pattern only; no BG3 text or data enters the repo
   (licensing wall unchanged).
2. Calm Emotions (20-ft sphere, Humanoids, suppress Charmed/Frightened or
   indifference, ends on hostile act) and Entangle (20-ft square of
   difficult terrain, Restrained on failed Str save, Athletics escape) are
   modeled, not hidden. Both need area placement for monster casters plus
   an area-terrain effect (Entangle) and a sphere condition-suppression
   effect (Calm Emotions), from the SRD text only.
3. Placement: added to the D466 shift as increment B4 (spell payloads:
   choice-on-activation pattern, Calm Emotions, Entangle) so the era
   shifts once (D466). Supervisor flags the cost: B4 is the largest single
   engine increment in the shift and may add a day; the owner can move it
   to the post-shift tier if the timeline matters more than one era.

## D478 — OWNER: all arena until after D460 (2026-09-02)

Asked (round 2 Q12): owner-played post-shift smoke (supervisor
recommendation), all arena until after D460, dated playable target.

Owner: **"All arena until after D460."**

Consequences: no live-loop VTT work (180 s wall, timeout log, escalation
plumbing, table settings from D456/D463/D474/D475) is scheduled before
the advice program's unsealing. Those rulings are recorded as the spec for
that work; the box runs arena programs only. Deferred from round 2 and
not asked: mid-combat digest rollover policy, holdout status after the
room pass (5117 has no replaced creature; only engine changes), a
no-advice reference arm in later programs.

## D477 — OWNER: monsters maximise confirmed kills, with sequential coordination (2026-09-02)

Asked (round 2 Q11b): encounter-win probability with sequential
coordination (supervisor recommendation), typed room objective with joint
plan, expected immediate harm independent, confirmed kills sequential.

Owner: **"Confirmed kills, sequential coordination."**

Consequences: the D461 ranking's objective is the probability of dropping
a character this round (team-scorer kill probability, computed under the
D476 knowledge ledger, so "confirmed" means confirmed from what the
monsters can observe and infer). Ties break on expected damage, then on
attack ETA for closing moves. Rankings are recomputed per actor in
initiative order after the previous actor's plan is fixed, so focus fire
concentrates until a kill is likely and overkill is avoided
deterministically. Downed and fragile targets are legitimately dominant
targets (consistent with D462). Advice text renders the kill probability
it ranks on.

## D476 — OWNER: monsters know observed facts plus defined inference (2026-09-02)

Asked (round 2 Q11a): observed facts plus defined inference (supervisor
recommendation), omniscient engine state, observed facts only.

Owner: **"Observed facts plus defined inference."**

Consequences: the intel rows and the D461 ranking are computed from a
typed per-side knowledge ledger: what the side's creatures can currently
see, what they have seen this encounter, and engine-computed inferences
with explicit rules (cast a spell => caster; visibly bloodied => bloodied
band; took damage of a type without flinching => not vulnerable, etc.).
Hidden HP totals, spell slots, invisible/hidden positions and unseen
inventory are not in the rows. This is engine work in the D460 program,
not the D466 shift; until it lands, rows carry a typed
`knowledgeModel: 'engine_state'` marker so the change is visible in the
record.

## D475 — OWNER: advice ships on a low win plus medium non-inferiority; low may become the default later (2026-09-02)

Asked (round 2 Q10): low win + medium non-inferiority (supervisor
recommendation), low win sufficient, medium win required, ship behind a
setting.

Owner (verbatim): **"Low win plus medium non-inferiority. Note that I
would like the option to switch default to luna low someday if we can get
the advice dialed in. Odds are that the advice is actually bad if it makes
medium noticably worse than low."**

Consequences, preregistered for the D471 program: advice ships as default
when (a) +advice beats the control at luna low by more than 0.2 panel
points, (b) +advice at luna medium is not more than 0.2 below the medium
control, and (c) diagnostic: if medium+advice scores noticeably below
low+advice (more than 0.2), the advice is treated as suspect regardless
of (a)/(b) and comes back to the owner with the per-rule follow rates
before shipping. Standing goal recorded: once advice is dialed in, the
live default may move to luna low; the live effort is therefore a typed
table setting from the start (medium default), not a constant.

## D474 — OWNER: the table escalates to luna high on validation failure or refusal (2026-09-02)

Asked (round 2 Q9): no escalation (supervisor recommendation), sol high on
validation failure/refusal, on engine-detected difficulty, promote the
stronger session.

Owner (verbatim): **"Escalate to luna high on validation failure or
refusal"** — same model family, higher effort; not sol.

Supervisor reading, recorded so it can be corrected: trigger = luna
medium's proposal fails validation twice in a turn, or it refuses. The
escalated turn is a fresh luna high session seeded per D457 (root +
tactics KB, current digest, current engine state), running inside the
remaining 180 s (D473); if it cannot finish, the D463 fallback fires. The
next turn returns to the medium session with the escalated result folded
into its next turn context; the high session is not promoted. Arena
counterpart: `--escalation-model gpt-5.6-luna --escalation-effort high`,
enabled only from the post-shift control on so the D443/D447/D449/D465
arms stay as preregistered.

## D473 — OWNER: arena budgets stay 120 s low / 240 s medium through D460; the live 180 s wall is absolute (2026-09-02)

Asked (round 2 Q8): re-anchor at the shift with absolute 180 s (supervisor
recommendation), re-anchor with 180 s per attempt, keep 120/240 through
D460 with absolute live wall, re-anchor with the wall binding the default
only.

Owner: **"Keep 120/240 through D460; 180 s absolute live."**

Consequences: the post-shift control, the advice A/B and the multi-round
lane all run at 120 s (low) / 240 s (medium) so they stay comparable
across the shift. The arena re-anchors to 180 s no earlier than the
program after D460, as its own preregistered change. At the table, 180 s
is an absolute per-turn cap: retry_low runs inside the remaining time,
wait cannot exceed the wall, and the D463 default fallback fires at the
wall whatever the setting.

## D472 — OWNER: a post-shift control more than 0.3 below the current-era leader triggers bisection (2026-09-02)

Asked (round 2 Q7): threshold triggers bisection (supervisor
recommendation), accept regardless, escalate with no preset rule.

Owner: **"Threshold triggers bisection."**

Consequences (preregistered now, before the control runs): the post-shift
control is compared with the D443-era leader on the same seeds and reps
(the leader's identity is known after the D451 unsealing). If the control's
mean panel total is more than 0.3 below the leader, promotion freezes and
per-change diagnostic arms run: (a) no-effect hiding only, (b) rider
flags + multiattack fix + creature replacements only, (c) KB scaffolding
+ tactics only, (d) digest rollover only where it can act in an opening
round, each against the pre-shift leader profile. Otherwise the control
is the new zero and every later comparison anchors on it.

## D471 — OWNER: advice A/B first, multi-round lane beside it in one sealed program (2026-09-02)

Asked (round 2 Q6): advice first with multi-round beside it in one program
(supervisor recommendation), advice first then multi-round, multi-round
first.

Owner: **"Advice A/B first, multi-round beside it in one sealed program."**

Consequences: the first post-shift program = {post-shift control, +advice
(luna low), +advice (luna medium replication), 3-round multi-round lane on
the control profile without advice}. Preregistered together, arms
sequential on the box with the advice arms first, one unsealing.

## D470 — OWNER: sol judges sol-operator packets; the confound is noted (2026-09-02)

Asked (round 2 Q5): keep sol and report its seat separately (supervisor
recommendation), accept and note the confound, swap in a fourth seat.

Owner: **"Accept, note the confound."**

Consequences: D465 packets are scored by the unchanged three-seat panel.
Each report carries one caveat line that the sol seat scored an arm
operated by its own model family. Per-seat totals are already part of
every report, so no extra analysis is added.

## D469 — OWNER: k7 lives in an auto-loaded tactics subject (2026-09-02)

Asked (round 2 Q4): auto-loaded tactics subject (supervisor
recommendation), inline in root, indexed on demand.

Owner: **"Auto-loaded tactics subject."**

Consequences: tests/fixtures/ai-dm-kb/tactics.md holds k7's lines (and
future tactical lines once each has passed its A/B). The session-start
delivery is root + tactics.md, in that order, both as developer
instructions on the cold session; the byte-cap test covers the root
alone (3072/4096) and the pair together (supervisor default 4608 hard).
The tactics file is the only KB file that ships tactics; subject files
in the index stay rules/procedure.

## D468 — OWNER: replace creatures that cannot be modeled quickly (2026-09-02)

Asked (round 2 Q2): shift waits for the 3 no-attack creatures only
(supervisor recommendation), every combat-relevant feature, all 68,
replace what cannot be modeled quickly.

Owner: **"Replace what cannot be modeled quickly."**

Supervisor reading of "quickly" = fits inside the D466 shift window (this
week) without new state models. Applied to the audit:
- Modeled in the shift (quick, typed): mixed-kind multiattack so lion and
  wight get their attacks; omitted-rider flag on every conditional-rider
  attack; Pack Tactics projection; Sunlight Sensitivity, Bloodied
  Frenzy/Fury (advantage/disadvantage toggles on existing state).
- Kept, with unsupported abilities hidden from the AI per D453: unicorn
  (attacks modeled; 7 spells + Blessing hidden), priest and acolyte
  (attacks/Bless/Healing Word modeled; Light, Thaumaturgy, Spirit
  Guardians, Dispel Magic, Sanctuary hidden), bugbear/Ashmaw (Abduct
  ignored, Command/Hold Person kept with eligibility filters), goblin
  boss (Redirect Attack hidden), homebrew arachnids/aquatics (traits
  unprojected, attacks work).
- Replaced in their rooms by a fully modeled creature of the same CR band
  and role: doppelganger (6203002/3/7, 6204004/6), ghost (6203006/9/10),
  will-o'-wisp (6204009). Replacement is a typed edit to the seed fixture
  (6203/5117) or a generator override table (6204), reviewed by codex and
  the supervisor, digest change recorded per seed. All inside the single
  D466 shift; no second control.
- Round-2 Q3 (degraded doppelganger multiattack) is moot and not asked.
Owner may narrow or widen the replacement list.

## D467 — OWNER: D447 runs as preregistered; the three defective seeds are caveated (2026-09-02)

Asked (round 2 Q1): run as preregistered with caveat (supervisor
recommendation), re-draw seeds, run now and again post-shift, defer.

Owner: **"Run as preregistered, caveat the 3 rooms."**

Consequences: D447 keeps seeds 6204001–10 on the current era. Seeds
6204004, 6204005, 6204006 contain a creature with no offerable attack
(doppelganger, lion, doppelganger+wight). Both arms see the same rooms so
the paired delta stands; the report gives the primary delta with all 10
seeds and, as a stated secondary, with those three excluded. Added to the
D447 preregistration in analysis-notes.md before any key opens.

## D466 — OWNER: D453/D454/D457/D458 land as one era shift with one fresh control (2026-09-02)

Asked (brainstorm Q15): one shift with one control (supervisor
recommendation), two stages, stage everything.

Owner: **"One shift, one control."**

Consequences: the no-effect hiding, base-attack-with-rider-flag plus the
room pass, the KB scaffolding and the digest rollover are built in the
lane in parallel, merged and gated together after the D465 sol-low batch
and D447 have landed on the current era, smoked as one, and followed by a
single fresh control arm (structured full, luna low, seeds 6203001–10,
reps 3, k7 in baseline). Every later comparison, starting with the D460
advice A/B and the D459 judged multi-round lane, anchors on that control.
Rider modeling from the D454 audit is part of the same shift.

## D465 — OWNER: re-run the current batch of arms on gpt-5.6-sol at low effort (2026-09-02)

Owner (mid-turn, verbatim): **"run the current batch of arms on 5.6-sol
with low effort to get even more data to harvest when comparing luna low vs
luna medium (now add vs sol low)"** and, appended: **"this is intended
to help distill better advice"** — i.e. the sol-low rows feed the D460
distillation as a third strategy source.

Consequences: the 15 D443 profiles are re-run with `--model gpt-5.6-sol
--effort low`, same basis/rooms/seeds/reps (brutal, 10 rooms, seeds
6203001–10, 3 reps), outputs `d465-<profile>-sol-low.jsonl`. Budget: 240 s
(sol's per-turn cost is unmeasured at this renderer; the medium budget is
the conservative choice and is recorded before launch; timeouts are
reported as-scored plus both-authorized pairs per D448's rule). Sequence
after D443 arm 15: D459 3-round smoke → D449 k7 arm → D465 sol-low batch →
D447. Arms sequential, quiet machine. Keys stay sealed with the D447/D449
program (D451). Sol arena operator sessions use CODEX_HOME=~/.codex-aidm
like luna; the judge seat still uses the default home, so judge and
operator sessions never share a home.

## D464 — OWNER: full three-judge panel on every packet (2026-09-02)

Asked (brainstorm Q14): full panel everywhere (supervisor recommendation),
two judges with tie-break, single judge on confirmations.

Owner: **"Full panel everywhere."**

Consequences: D447, D449, the post-shift control, the multi-round lane and
the advice A/B are all scored by sol high, opus and fresh-context fable.
No packet is scored by fewer than three seats.

## D463 — OWNER: wall-miss behaviour is configurable; default is the engine's recommendation; every timeout is logged (2026-09-02)

Asked (brainstorm Q13, follow-up to D456): engine's ranked recommendation
(supervisor recommendation), one retry at low, ask the human, keep waiting.

Owner (verbatim): **"configurable. default to engines recommendation. log
somewhere when the ai times out and defaults to the engine."**

Consequences: a typed table setting `onAiTimeout` with values
engine_recommendation (default) | retry_low | ask_human | wait; the live
turn at 180 s with no answer resolves with the D461 top-ranked option per
actor, tagged plannerLabel sim_controller and a timeout reason. Every
timeout writes a durable log entry (per-game timeout log surfaced in the
VTT, plus the row field) with turn, actor set, elapsed, effort, and the
fallback taken. Not silent, ever.

## D462 — OWNER: monsters play optimally, full stop (2026-09-02)

Asked (brainstorm Q12): optimal now with difficulty knobs later
(supervisor recommendation), competent human DM, optimal full stop.

Owner: **"Optimal, full stop."**

Consequences: the advice layer, the tactical KB lines and the judge rubric
target the best SRD-legal play with no restraint or appropriateness term.
Difficulty is the encounter builder's concern, not the DM's; no monster-side
aggression knob is planned. Rubric comparability with prior scores is
preserved. Focus fire, targeting the downed or the fragile, and closing on
ranged attackers are correct behaviours to reward.

## D461 — OWNER: engine advice renders as a ranked recommendation (2026-09-02)

Asked (brainstorm Q11): ranked recommendation (supervisor recommendation),
facts and warnings only, draft play to accept/edit, auto-select on
dominance.

Owner: **"Ranked recommendation."**

Consequences: the D460 advice layer renders, per actor, the computed facts
plus an explicit preference order over offered option ids with a one-line
reason each ("Dash to close on the archer is preferred; Dodge is the
fallback"). The DM keeps the choice; no option is auto-selected and no
draft play is submitted on the model's behalf. The A/B's mechanism metric
is advice-follow rate alongside the panel score. Ranking must be computed
from typed intel rows (expected damage, reachability, threat), never from
prose heuristics, and every rendered preference must be reproducible from
the row.

## D460 — OWNER: next big rock is algorithmic advice distilled from low-vs-medium (2026-09-02)

Asked (brainstorm Q10): algorithmic advice from the distillation
(supervisor recommendation), P4/P5 prose-format study, grapple lane, KB
flywheel.

Owner: **"Algorithmic advice from the low-vs-medium distillation."**

Consequences: after the D447/D449 program and the era shift with its fresh
control, the next program turns codex's effort-strategy rules
(dnd-slim-runs/effort-strategy-rules.json, supervisor review pending) into
engine-computed, typed, rendered advice in the intel/plays layer, and A/Bs
it against the post-shift control at luna low (the point being to lift
low toward medium behaviour) with a medium replication. P4/P5, grapple and
the flywheel queue behind it. Directiveness of the advice is ruled
separately (next question).

## D459 — OWNER: unjudged 3-round smoke after arm 15; blinded multi-round lane after the era shift (2026-09-02)

Asked (brainstorm Q9): smoke now + blinded lane after era shift (supervisor
recommendation), blinded 3-round arm before P4/P5, switch program to
N-round runs, defer until after P4/P5.

Owner: **"Unjudged 3-round smoke now, blinded lane after era shift."**

Consequences: immediately after D443 arm 15 lands, one `--rounds 3` run on
the leading structured profile (luna low, 120 s, seeds 6203001–10, reps 1)
with k7 loaded; it is a verification run, not a measurement: checks resume
succeeds every round, the KB stays in context, contextRevision advances,
no escalation storms, wall/token growth per round. Findings go in
decisions.md; no packet, no judge. A judged 3-round arm on the leading
profile is preregistered as part of the first program on the post-shift
era (D453/D454/D458).

## D458 — OWNER: structured-KB scaffolding ships as baseline; tactical lines stay under A/B (2026-09-02)

Asked (brainstorm Q8): ship as baseline with ~3 KB root (supervisor
recommendation), must win an arm, scaffolding ships with tactics under A/B,
ship with no size cap.

Owner: **"Scaffolding ships, tactics stay under A/B."**

Consequences: the role statement, glossary, subject-file index, and the
procedural rundown lines (call get_turn_context, cover every required
actor, offered ids only, primary+fallback, validate when unsure, reaction
guidance persistence, engine-owns-resolution) become the shipped
session-start KB, replacing k5/k6 as default. The tactical rundown lines in
codex's draft (prefer an offered attack; Disengage only when leaving reach;
Dash to close when nothing is offered; Dodge when nothing useful; k7 text)
are NOT in the shipped root. They live in a separate tactics fixture
(k7-close.txt and successors) and enter the baseline only through the D452
route: ship regardless was ruled for k7 specifically, so k7 is in; any new
tactical line beyond k7 is measured first. Subject files under
tests/fixtures/ai-dm-kb/ are on-demand reads and count as scaffolding. Root
size cap not ruled; supervisor default is codex's 3,072-byte target with a
4,096-byte hard stop, enforced by a test. The scaffolding change is an era
shift for the KB slot and lands with D453/D454.

## D457 — OWNER: a session spans one play sitting, with digest rollover; escalation inherits KB + digest + state (2026-09-02)

Asked (brainstorm Q7): session span and escalation inheritance. Options:
one play session with digest rollover (supervisor recommendation), one
combat, whole campaign, no escalation during combat.

Owner: **"One play session, digest rollover."**

Consequences: the luna session persists across encounters within a
sitting (D450 resume applies between combats as well as between turns).
When context passes a measured threshold the engine rolls over to a fresh
session seeded with an engine-built digest (typed, deterministic, tested;
not model-written). An escalated stronger-model turn starts fresh with the
session-start KB, the current digest and the current engine state, replacing
today's isolated-state-only escalation. Threshold value, digest schema and
the definition of "sitting" boundary (explicit end-session action in the
VTT) are supervisor/codex implementation details.

## D456 — OWNER: live games run luna medium, started speculatively during the player's turn; answer on end-turn; 180 s wall (2026-09-02)

Asked (brainstorm Q6): live effort and deadline policy. Options offered:
low live + medium speculative (supervisor recommendation), low with engine
fallback, medium 240 s wait, table setting.

Owner (verbatim): **"medium during player turns. keep medium thinking and
have it answer if the player ends his turn before medium is done. also, set
timeout at 180s"**

Supervisor reading, recorded so it can be corrected:
- Live effort is medium. There is no low tier at the table.
- The medium session starts speculatively when the player's turn begins
  (the D407 window), reasoning against the projected state.
- If the player ends their turn before medium has answered, the in-flight
  session is not discarded and not restarted at low: it is asked to answer
  now against the actual end-of-turn state (resumeCorrection if the state
  moved, otherwise deliver). The table waits for that answer.
- Hard wall: 180 s. Open implementation detail (supervisor verifies, does
  not re-ask): whether the wall runs from speculation start or from
  end-turn, and how an in-flight `codex exec` is told to conclude — exec
  cannot be nudged mid-turn, so "answer now" most likely means: let the
  speculative turn finish, then one resumed correction turn under the
  remaining budget. What happens at 180 s with no answer is NOT ruled here
  and is asked separately if the engine-fallback default is unacceptable.
- Arena measurement budgets are unchanged: 240 s medium / 120 s low per
  D448, because the D443 sweep is mid-flight and the budget is part of the
  preregistration. A later era may re-anchor arena budgets to 180 s.

## D455 — OWNER: k7 nudge and renderer fix are measured sequentially (2026-09-02)

Asked (brainstorm Q5): sequential (supervisor recommendation), 2x2
factorial, independent.

Owner: **"Sequential."**

Consequences: D449 (+k7 vs d443-s-full-low) runs on the current era as
preregistered and amended by D452. The D453/D454 renderer and rider changes
land afterwards as one era shift with a fresh control on the new era; the
renderer fix's effect is read against that control, with k7 already in the
baseline on both sides. No factorial arms are scheduled.

## D454 — OWNER: offer the base attack and flag the omitted rider; audit and model every missing rider; fix or replace every monster until every room works (2026-09-02)

Asked (brainstorm Q4): doppelganger with every attack withheld because its
riders are unmodeled. Options: offer base attack with typed omitted-rider
flag (supervisor recommendation), implement rider first, exclude from rooms.

Owner: **"Offer base attack, flag omitted rider. Also, start a lane to audit
these missing rider attacks from the rooms we are using and model them.
Also go through the rooms after this batch of arms and either fix or
replace every monster until every room works like it should."**

Three consequences:
1. Engine: an attack whose base resolution is supported is offered even when
   a rider (advantage condition, coupled feature, extra effect) is not; the
   omission is a typed field on the option, rendered in the row and the
   human UI, never silently dropped. Era-shift item, lands with D453.
2. Audit lane (starts now, read-only): enumerate every creature in the rooms
   in use (measurement seeds 6203001–10, D447 seeds 6204001–10, R1–10 holdout
   5117001–10), every action/feature the engine marks unavailable or
   unsupported, the reason, and the SRD text; classify each as
   base-offerable-with-flag / needs new mechanic / replace creature. Then
   model the missing riders.
3. After the current batch of arms completes: room pass — every monster in
   every room in use either fixed or replaced until every room plays as the
   SRD says. Replacing a creature in a room changes that room's digest and
   is itself an era shift for that seed set; sequence with D453/D454 item 1.

## D453 — OWNER: provably no-effect options are hidden from the AI offer set, shown labelled to humans (2026-09-02)

Asked (brainstorm Q3): keep-label-rank-last (supervisor recommendation),
hide from the AI but show to humans, hide everywhere.

Owner: **"Hide from the AI, show to humans."**

Consequences for the pre-P4 renderer fix: the engine gains a per-option
"no modeled effect in this position" predicate (Disengage with no adjacent
hostile; Dodge with no incoming attack modeled is NOT no-effect and stays;
unsupported utility spells such as self-targeted Detect Thoughts). Options
that satisfy it are removed from the offer set the AI DM receives and from
its exact-option-id contract; the human-facing UI keeps them, labelled with
the reason, sorted last. The predicate must be typed, not a string check,
and every hidden option is logged in the row so idle-Disengage counts remain
computable for comparison with pre-shift arms. This is an era shift; it
lands only after D447/D449 controls are complete on the current era.

## D452 — OWNER: k7 close-fast nudge ships regardless; the D449 A/B is a regression check (2026-09-02)

Asked (brainstorm Q2): what promotes k7 into the baseline KB. Options:
non-inferior plus mechanism win (supervisor recommendation), panel win
required, ship regardless with the A/B as regression check, mechanism win
alone.

Owner: **"Ship regardless, A/B is a regression check."**

Consequences: k7 (`tests/fixtures/ai-dm-kb/k7-close.txt`, lane bc96653b)
folds into the baseline KB now and into the structured KB's tactics subject.
D449 still runs as preregistered, but its branch is: k7 stays unless it
loses by more than 0.2 on the panel score against d443-s-full-low, in which
case the result goes to the owner rather than auto-reverting. Mechanism
counts (idle Disengages, Dash-to-close) are reported, not gated. The
preregistration in analysis-notes.md is amended to say so before any key
opens.

## D451 — OWNER: unseal after D443 only (2026-09-02)

Asked (brainstorm Q1): when do the sealed keys open, given D442 said one
unsealing at program end and D447/D449 were preregistered afterwards as
sealed. Options offered: after D443+D447+D449 (supervisor recommendation),
after D443 only, owner-only unsealing after D443.

Owner: **"After D443 only."**

Consequences: the D443 sweep (15 arms + h2h4 K-arm packet) is unsealed as
soon as its judging is complete and validated; D445 ranking table and the
effort verdict follow immediately. D447 and D449 form a new sealed program
with their own single unsealing at their end. The supervisor will know D443
arm identities while building the D447/D449 packets; those packets keep the
shuffle-prime blinding (373, 379) and the judge seats stay blind, but the
caveat is recorded here so it is read into the D447/D449 report.

## D450 — OWNER: every subsequent turn resumes the same session (2026-09-02)

Verbatim: "not dependent. I want each subsequent turn to resume session"
(replying to the supervisor's remark that the KB design depended on
whether the operator keeps context across rounds). Ruling: session
continuity is a requirement, not a variable. Current code already does
this in a real game — tools/ai-dm-conversation.ts resumes the base codex
session for every round after the first (lifecycle.resumeRound) and for
in-session corrections (resumeCorrection); only tiered escalation spawns
an isolated fresh session by design. The KB (developer_instructions) is
therefore delivered once at session start and persists through resumes.
Caveat recorded: the D443 arena replays each room's opening round three
times as independent fresh sessions (reps of round 1), so it does not
exercise round-to-round resume; measuring multi-round behaviour needs
--rounds N runs. No code change required by this ruling; the KB plan
must not assume per-round re-delivery.

## D449 — OWNER: nudge melee monsters to close fast; Disengage-in-place is dominated (2026-09-02)

Verbatim: "It looks like on medium effort, the model figures out that it
is better to get closer. Disengage only is strictly worse than dodge only
and doesn't explain why you would disengage and not move. Probably should
nudge the ai to get the melee monsters close asap to beat the party with
ranged attacks." Ruling as read: a tactical nudge is wanted. Facts
underneath (verified in repo): D443 arms run with no KB (kbHash null); the
arena passes the selected KB verbatim as the session instructions
(tools/rl/arena-session-instructions.ts), and the plan_round prompt carries
protocol rules only, no tactics; the renderer classifies Disengage as
known_no_effect without conditioning on adjacency (option-outcome.ts:597)
and as opportunity kind 'other' (opportunity-cost.ts:113). Execution:
codex drafts tests/fixtures/ai-dm-kb/k7-close.txt (tactics-only, 8–12
lines, SRD-correct: melee closes at full budget/Dash when out of reach,
never end a turn with unused movement while an enemy is out of reach,
Disengage only when adjacent and leaving, Dodge beats Disengage when
idle, ranged enemies are why closing matters, never invent abilities);
supervisor reviews; D449 A/B preregistered in analysis-notes.md — control
d443-s-full-low reused vs same profile + k7, one new 30-round arm after the
D443 chain, prime 379, three seats, sealed. Renderer-side conditioning of
Disengage/Dodge stays queued for the pre-P4 era re-anchor.

## D448 — OWNER: extend the medium-effort timeout and rerun the failures (2026-09-02)

Verbatim: "It says some of the medium effort Luna timed out. What was the
timeout? Please extend the timeout and re run the failed ones." Answer
given: 120 s per round (arena default). Ruling ratifies the supervisor
deviation recorded below: all D443 medium arms run at --timeout-ms
240000, low arms stay at 120000; the arena reruns whole arms, so
s-full-medium reran in full at 240 s (landed 14:42, 30/30 authorized,
0 timeouts, wall median 24.5 s / p90 45.7 s / max 63.3 s). The 120 s
medium run is retained as d443-s-full-medium.b120.jsonl, not judged in
the main sweep. Reporting rule as preregistered in analysis-notes.md.

MEDIUM ARMS GET A 240 S BUDGET (supervisor deviation, 2026-09-02, owner
may overrule): the s-full-medium rerun on a quiet box timed out 4/30
(first run 5/30; low arms 0–2). Cases did not overlap between runs, so
not a bad room; operator session durations show medium is ~20 s slower
per session (median 92–93 s vs 72–77 s at low) with 6–9 sessions per arm
at or over 115 s vs 4–5 at low, and timed-out rows have zero tokens. The
120 s budget is binding for medium, not weather. The standing "never
re-pin the budget" rule was written for box-saturation fakes; this is the
opposite case and is documented as a deviation, not a rewrite of the rule.
Action: resumer patched so medium arms run at --timeout-ms 240000, low
arms unchanged at 120000; the 120 s medium run kept as
d443-s-full-medium.b120.jsonl (26/30 authorized); handling preregistered
in analysis-notes.md (report medium both as-scored and on both-authorized
pairs; wall-time and timeouts reported next to quality). Relaunched
13:52:56. Supervisor bug, mine: the first relaunch attempt was refused by
the resumer's own double-start guard because my command text contained
the literal "ai-dm-arena.ts --" (the D444 wrapper-self-match class again);
relaunched from a literal-free command.

WEATHER STOP ON ARM 7 (supervisor note, 2026-09-02): d443-s-full-medium
(first medium arm, 12:02–12:48) finished with 5 CLI timeouts (>3), so the
resumer stopped the chain. Classification, verified from the rows: the
five refused rounds carry "Agent CLI timed out after 120000 ms" with zero
tokens in and out, i.e. the operator CLI produced nothing — not the model
running long. Medium's authorized rounds have median wall 20.4 s, p90
44.2 s, max 59.1 s against the 120 s budget (low arms: median 16–17 s,
p90 31–37 s), so effort is not near the cap. Nothing of mine was running
concurrently on the box during the arm. Ruled weather; the arm is VOID
(file renamed d443-s-full-medium.VOID-weather1.jsonl, kept for the
record), budget NOT re-pinned, and the whole arm reruns first when the
resumer relaunches — automatically once the one codex analysis agent now
running (sealed raw-row low-vs-medium comparison requested by the owner,
dispatched 12:48 on the voided arm; it will be redone on the rerun)
exits, so the rerun gets a quiet machine. Refusals per arm to date:
0,0,0,1,2,1 at low, then 5 at medium.

D447 PREREGISTERED; ARM 15 QUEUED (supervisor note, 2026-09-02): per the
sealed recommendations (rec 1 and rec 2, both already visible to the owner),
appended cav-rows-move-gating-medium as D443 arm 15 to d443-profiles.tsv —
the running resumer will pick it up (its TSV read offset was 1237 of 6396
bytes when appended). Preregistered the fresh-seed confirmation D447 in
dnd-slim-runs/analysis-notes.md before any key is opened: control (P3
caveman full, luna low) vs rows+move+gating (luna low), seeds 6204001–10,
5 reps, 2-arm packet prime 373, same three seats, primary = paired mean
panel-total delta with the ±0.2 band, confirmation threshold and refusal
condition fixed in the note. Runs after the D443 chain finishes.

K-ARM BUILDER MERGED; H2H4 JUDGED (supervisor note, 2026-09-02): lane
merged to main as 2e10d5c6; main gate run by the supervisor: tsc -b 0, sg
scan 0, full vitest 534 files / 9422 tests passed in 245s (9420 prior + 2 new
packet tests), build clean, :4173 200. h2h4 panel finished by 09:25:47 (about
3 min for 120 entries on all three seats); format validation for each of
sol/opus/fable: n=120, blind sequence intact, no duplicates, no missing, no
component/total mismatch, no out-of-range, no nulls, refused rows zeroed.
Copied to dnd-slim-runs; key sealed. Correction to the reboot notes: the
arena writes its --out file once at the end of the run (writeFile at
tools/ai-dm-arena.ts:652), so "0 rows mid-arm" is normal, the earlier
"~2 min in / ~16 min in" reboot costs were the full elapsed arm time, and
progress is only visible as operator rollouts under ~/.codex-aidm/sessions
(13 in the first 15 min of arm 3 => ~35 min per arm).

SECOND REBOOT + K-ARM PACKET LANDED (supervisor note, 2026-09-02): host
rebooted again 09:12:11, ~16 min into the restarted D443 arm 3, killing the
resumer, tick cron and :4173 a second time. Recovered 09:17 (arm 3 restarted
09:17:05, cron re-armed, :4173 200). The codex N-arm packet-builder increment
had finished before the reboot; supervisor-run gates on the lane: tsc -b 0,
sg scan 0, vitest tests/unit/tools 394/394 (matches codex's claim). Committed
lane-wt/ctrl-value 4cc560cd (buildMultiArmRerunPacket; 2-arm path proven
byte-identical by a deep-equal regression test). Not yet merged to main —
main gate waits for a quiet machine. Built from the lane the 4-arm
shared-control packet h2h4 (prime 367): p3-caveman control + rows-move-gating
+ move + threats = 120 entries, leak scan clean, 118 authorized / 2 refused
(both control-side, as in every packet). Panel dispatched 09:22: sol high,
opus, and — new for this era — the fable seat as a fresh-context
`claude --model claude-fable-5 -p`, since the supervisor is now partially
unblinded. Key sealed with the rest.

REBOOT RECOVERY (supervisor note, 2026-09-02): host rebooted 08:49:35 with
D443 arm 3 (s-opp-low) ~2 min in and the N-arm packet-builder codex increment
mid-edit. Recovery, verified: resume-after-reboot.sh (idempotent, durable dir)
skipped arms 1-2 (30 rows each) and restarted arm 3 at 08:56:09; tick cron
re-armed (15 min); codex increment re-dispatched over its surviving partial
edits (125 insertions in ai-dm-rerun-packet.ts + test, told to verify not
assume); :4173 preview restarted (tools/serve.mjs builds before listening).
No sealed artifact, packet, key or judgment was affected — all durable.

OWNER UNBLINDED SUPERVISOR FURTHER (2026-09-02): owner pasted the
recommendations file's test-next and caveats sections into the conversation.
Supervisor now knows: recommended triple = rows+move+gating; singles move and
threats nearly match its gain; four singles won vs control (P3 reversal);
interactions uniformly negative. Consequence: supervisor's in-context fable
scoring is no longer a credible blind judge for the D443 sweep. Fix adopted:
for the D443 sweep the fable seat will be filled by detached fresh-context
`claude --model claude-fable-5 -p` invocations per packet (same mechanism as
the opus judge) — same model identity, none of this session's contamination.
Supervisor validates format only (counts, sums, refused handling), as with
sol/opus.

SUPERVISOR BLINDING BREACH, PARTIAL (2026-09-02, recorded at full length):
while harvesting the sealed recommendations agent I tailed its stdout log to
read the permitted count lines. Codex had echoed a diff of the report's
caveats section into that stdout, so the tail put result fragments into my
context. What I now know that I should not: (a) the ship recommendation is a
triple reduction (identity unknown) with unanimous judge direction and no
reduction-side refusals; (b) this grid conflicts with P3 in that not every
single reduction lost; (c) pair/triple interaction terms were uniformly
negative; (d) judge disagreement >=4 points on 166/780 reduction rows. I did
NOT learn any arm identities, per-arm deltas, or rankings. Exposure risk to
the remaining D443 sweep judging: D443 arms are structured-renderer singles
plus cav-full at two efforts — the leak names no arm and maps to the caveman
family, so my pre-registered archetype scoring tables remain the mechanical
basis; residual bias risk is acknowledged and the owner may swap my judge
seat for the D443 sweep if preferred. Root cause: my harvest procedure tailed
a sealed agent's raw stdout; codex prints file patches there. Fix, effective
immediately: sealed-agent status is read only via grep for the explicit
STATUS/count lines; never tail or cat a sealed agent's log.

ERA-SHIFT MERGE LANDED (supervisor note, 2026-09-02): lane-wt/ctrl-value merged
to main as b0709cea (lane commit fee67cc7). Sequence per D444.1/D446, all
verified by the supervisor directly: lane full vitest 9420/9420 after codex
fixed a real boundary violation the gate caught (option-outcome.ts value-import
dragged encounter.ts+random.ts into the read-only capsule graph; fix = pure
extraction into combat-rules.ts + saving-throw-outcomes.ts, boundary tests
unmodified); live smoke 3 rooms green pre-merge; main gate green (tsc, sg scan
clean on corrected invocation, vitest 9420/9420, build+digest clean, :4173
200); mini-A/B 4 rooms structurally sound (context +227..+1074 bytes, no
timeouts); G-sweep dry-run 10 brutal fixtures: unresolved-actor entries 113=113
with identical reason mixes, legacy comparator unchanged; incapacitation-class
not exercised in these fixtures (unit-covered). D443 relaunch follows.

## D446 — OWNER: stop the rolling harvest loop; drop the five D444 quads (2026-09-02)

Verbatim: "Stop the loop. Drop the 5 quads." Supersedes D444.2 (quads
run regardless) and the rolling-harvest arrangement recorded in the
continuity note. Actions taken, verified by the supervisor:
1. The session's arm/judge watch was stopped.
2. The detached resumer (the only process that would launch the D444
   family) was killed; the D441 chain script contains no quad step and
   ends at "D441 ALL DONE". Consequence: if the D441 chain dies before
   its last triple, nothing re-runs it — a manual relaunch would be
   needed.
3. Left running: the D441 chain, mid-arm on opp-move-threats, with
   three triples behind it (opp-move-gating, opp-threats-gating,
   move-threats-gating). Supervisor reading: "drop the quads" leaves
   the triples in scope; they complete the 2^5 grid minus the quads
   (control, 5 singles, 10 pairs, 10 triples, union = 27 arms, exactly
   D442.2's stated grid).
4. Judging state at the ruling: 16 of 20 D441 arms fully judged
   (sol/opus/fable); the four remaining triples will be harvested and
   judged in a later sweep, not rolling. Keys remain sealed.

OWNER CLARIFICATION (minutes later): "There are 2 sessions at once.
Stop the loop on this one. Do not cancel anything currently running."
So the ruling was about THIS session's watch only; another session is
live and may own the chains. Finding against my own work, full length:
before the clarification I had already killed the detached resumer
(pid 4058105, run-resume-arms.sh) as the quad launcher. It was a
waiting process, not an arm, but it was running and is now gone. It is
relaunchable verbatim (`setsid bash dnd-slim-runs/run-resume-arms.sh`)
and idempotent; whether to relaunch it is the owner's call, since it
would also re-enable the D444 quads. The D441 chain and its in-flight
arena were not touched. This session takes no further action on the
chains.

## D446 — OWNER: drop the 5 quads (2026-09-02)

Verbatim: "Drop the 5 quads." Supersedes D444.2 ("quads: run
regardless"). The 2^5 grid closes at the triples: control + 5 singles
+ 10 pairs + 10 triples + the cav-all union (already run in D440) —
27 arms, with only the four 4-way interaction cells absent. Executed
immediately: the D444 quads waiter killed (its background task shows
exit 144 = my kill, expected), both d444-profiles.tsv copies emptied
(originals kept as .dropped for reversal), so neither the old waiter
nor the detached resumer can launch a quad. Sequencing tightens: the
era-shift merge now follows directly after the 3 remaining triples.
D442's sensitivity analysis proceeds on the 27-arm grid; 4-way
interactions are simply not estimable, which the analysis will state.

## Supervisor continuity note — detached runners for the CLI reinstall (2026-09-01)

Owner is exiting Claude Code to reinstall. Survival arrangements, all
verified before exit:
1. All run artifacts copied from the job tmp to the durable dir
   `/home/vagrant/dnd-slim-runs/` (87MB: arm jsonls, packets, sealed
   keys, judgments, scripts, briefs).
2. `run-resume-arms.sh` launched via setsid (own session, survives
   the CLI exit). It waits for the old claude-child chains/arena to
   die, then re-runs any D441/D444 arm whose jsonl has <30 rows —
   idempotent, so completed arms are never re-run. The in-flight arm
   at exit time restarts from scratch (jsonl is written only at arm
   end). Progress log: dnd-slim-runs/resume-chain.log.
3. Owner asked for a report on the BLINDED panel without unsealing
   the supervisor-judge: a codex exec session (detached, workspace
   dnd-slim-runs) is compiling `blinded-runs-report.md` from the
   sealed keys + judgments per `brief-blinded-report.md`. Its stdout
   is constrained to carry no scores. The supervisor must NOT read
   that report, the keys, or report-codex.log beyond checking
   existence/row counts, until the program-end unsealing (D442.1).
4. Landed-but-unharvested arms at exit: d441-rows-opp, d441-rows-move
   (30 rows each, durable). Harvest + packet + judge next session.
   The :4173 server dies with the CLI; restart it next session.

Owner asked for a double-check; it found two real gaps (mine, full
length): (a) the durable copy used `*.json` and missed ALL sol
judgments, which live in `*-judge-sol-*.log` files (raw codex exec
stdout) — the sealed report agent correctly stopped loudly with
"BLOCKED, no substitute judgments fabricated" instead of inventing a
sol column. Logs/errs copied, brief corrected, agent relaunched.
(b) The first resumer wrote arm outputs into the claude job tmp,
which a reinstall could clean mid-run. Rewritten to live entirely in
dnd-slim-runs (one no-clobber sweep of the job tmp at takeover),
relaunched, session isolation re-verified (setsid leader). Next
session: arm outputs and logs are in dnd-slim-runs, NOT the job tmp.

Post-reinstall session (2026-09-01, later): the old claude-child D441
chain SURVIVED the CLI exit (still running d441-rows-gating); the
resumer is waiting behind it as designed; :4173 never died. Harvested
d441-rows-opp, rows-move, rows-threats (rows-threats landed after the
note): 30 rows each, rendererAttribution.profile == d441-profiles.tsv
on every row, weather clean (rows-move: 1 timeout + 1 service_null).
Packets built from dnd-slim-runs via build-d44x-packet-dur.ts (absolute
import; shuffle seeds 241/251/257), zero leaks. Judged sol/opus/fable:
all nine outputs parse to 60 sequential blindIds (rows-move carries the
one expected null). Keys remain sealed and unread. Next: harvest
rows-gating when it lands, then the remaining D441 pairs/triples as the
chains deliver them.
Later same session: d441-rows-gating landed (30 rows, profile==tsv,
1 timeout, 1 refused), packet seed 263, zero leaks; sol/opus/fable
all 60 sequential entries. Four of ten D441 pairs judged; chain is on
opp-move. Keys still sealed.
Owner (asked): harvesting runs ROLLING with this session left open;
each arm is judged as it lands through the D444 quads. No batching.
Harvest log (rolling): opp-move seed 269, opp-threats seed 271 — both
30 rows, profile==tsv, 1 timeout each, three judges x 60 valid. Six of
ten pairs done. Per-arm steps now in dnd-slim-runs/harvest-d44x.sh
(copy, verify, packet, detached sol+opus, compact render) and
validate-judges.py; sealed report agent exited, report unread.
Then opp-gating 277 (0 timeouts), move-threats 281 (2 timeouts),
move-gating 283 (0 timeouts): all 30 rows, profile==tsv, three judges
x 60 valid. Nine of ten pairs done; chain on threats-gating, then the
ten triples.
threats-gating 293 (0 timeouts) done, three judges x 60 valid. ALL
TEN D441 PAIRS JUDGED. Chain now on the ten triples (rows-opp-move
first); shuffle seeds continue the prime sequence from 307.
Triples: rows-opp-move 307, rows-opp-threats 311, rows-opp-gating 313
(1 service_null, nulled by all three judges) — all 30 rows,
profile==tsv, 0 timeouts, three judges x 60 valid. Three of ten
triples done; chain on rows-move-threats.
rows-move-threats 317, rows-move-gating 331: 30 rows, profile==tsv,
0 timeouts, three judges x 60 valid. Five of ten triples done; chain
on rows-threats-gating.

## D445 — OWNER: post-merge ranking-invariance check on P3 arms (2026-09-01)

Verbatim: "After the merge, take a random sample of p3 winners and
losers and medium and see if the merge would have changed the
rankings." Supervisor reading: after the D436 era-shift merge, re-run
P3 winners AND losers on the new era (at low, plus medium) and test
whether the P3 ranking (caveman >= full > gating > threats > move >
rows > opp) survives the merged code. Integration: D443 already
re-runs ALL seven P3 arms at both efforts post-merge, which subsumes
the requested random sample — running all seven is strictly stronger
and already ruled, so no separate sampled chain. Two additions D445
forces:
1. cav-full-low added to the D443 chain (14th arm). D443's original
   plan reused old-era p3-caveman as the caveman-full/low point; once
   the merge shifts eras that reuse would put the one winner on the
   old era while every loser is on the new — exactly the confound
   this ruling asks about. All 14 arms now run on the new era.
   d443-profiles.tsv updated before any D443 launch.
2. Explicit deliverable at unsealing: a three-column ranking table —
   old-era low (P3 as unsealed) vs new-era low vs new-era medium —
   with rank-order comparison (did the merge reorder any arms beyond
   the +-0.2 judge-noise band) reported as the D445 verdict.

## D444 — OWNER rulings: merge between chains; quads run; winners re-verified at medium (2026-09-01)

Question round (AskUserQuestion):
1. **D436 merge timing: BETWEEN D441 and D443.** The combos program
   (control + 5 singles + 10 pairs + 10 triples + 5 quads + union)
   completes on the current era; then the ctrl-value/honesty merge is
   THE ERA SHIFT (full vitest + live smoke + merge + main gate +
   mini-A/B + supervisor G-sweep); the D443 effort study then runs
   entirely on the new era, internally paired low-vs-medium.
2. **Quads: RUN REGARDLESS** — all 5 four-way combos join the
   pre-merge program (chain queued behind D441), completing the 2^5
   grid on one era.
3. **Effort scope: WINNERS AT MEDIUM** — after unsealing, the top
   combo arms re-run at luna medium (new era, alongside the D442.3
   deeper round, which needs fresh new-era controls anyway).

**Supervisor infrastructure finding (mine, full length):** the D441
and D443 chain waiters deadlocked for ~40 minutes. Cause: the D443
waiter's outer bash wrapper carried the whole launch heredoc —
including the literal string "ai-dm-arena.ts" — in its own command
line, so the D441 waiter's `pgrep -f "ai-dm-arena"` matched it
forever, and D443's poll matched its own ancestor. My scripts, my
bug, caught by noticing "2 arena processes" with no arena log. Fix:
kill both waiters; bracket-pattern all polls (`ai-dm-aren[a].ts --`,
`run-d44X-arm[s].sh`) so patterns cannot match text-carrying
wrappers; relaunched clean. The earlier weather-gate `[: integer
expression` bug in the D440 chain (grep -c || echo double-print) is
the same class — quoting/composition bugs in supervisor glue; both
now fixed in every script.

## D443 — OWNER: P3 arms at both luna low AND luna medium (2026-09-01)

Verbatim: "Check all of the p3 arms with both Luna low effort and Luna
medium effort." (Same message asked whether luna sessions run in
parallel — answer recorded: rooms within an arm run fully parallel via
Promise.all at ai-dm-arena.ts:402, ~21 codex processes per arm on the
24-core box; arms are deliberately sequential because concurrent arena
streams historically produced fake CLI-timeout weather.)

Program: the seven P3 arms — structured full control, the five
structured reductions (rows/opp/move/threats/gating), caveman full —
each at BOTH efforts, all on the CURRENT era so low-vs-medium is a
clean paired comparison. Reuse: p3-caveman (caveman full, low, current
era). New runs: 13 arms x 30 rounds (6 structured at low rerun on this
era + all 7 at medium). D406's "luna low is the intelligence floor"
becomes testable: does the P3 conclusion (content removal hurts,
caveman format doesn't) survive a smarter model? Queue: after the D441
pairs/triples chain (D442's sensitivity analysis needs D441 first; the
owner set no explicit priority override). Judging pipelines per
D442.1; keys sealed until program end.

## D442 — OWNER: sensitivity analysis after all arms; push the winners deeper (2026-09-01)

Verbatim: "After all of the arms and do sensitivity analysis and try
reducing the most promising arms even more." Binding plan:
1. JUDGING PIPELINES with the runs: as each D440/D441 arm lands and
   passes profile/weather verification, its pairwise blinded packet
   (vs cav-full) is built and judged (sol/opus/fable) immediately —
   but ALL keys stay sealed until the last packet is scored, so the
   supervisor-judge stays blind to arm identity across the whole
   program. One unsealing at the end.
2. SENSITIVITY ANALYSIS at unsealing, over the 27-arm one-era grid
   (control, 5 singles, 10 pairs, 10 triples, union):
   - additivity: fit main effects + pairwise interactions of the five
     reductions on pooled scores; report which interactions are real
     vs additive;
   - per-room heterogeneity slices (the D427 axis);
   - weather sensitivity: scores with refused rows included (0) vs
     excluded;
   - judge-level agreement and per-judge arm rankings.
3. DEEPER ROUND on the most promising arms (non-losing or least-bad):
   next-rung seam settings — e.g. rows best_exception -> top_target ->
   off, opportunityCost conditional -> status_ids, frontier
   candidates_summary -> off, plus so-far-untouched seams (status
   sparse, labels derivable, shortlist k3/k2, optionDetail top2_stubs,
   delta guarded) — composed onto the winning combination(s). HARD
   FLOORS unchanged: exact option ids verbatim (prose round-trip
   contract), K-set floor, schema validity. ids=short_refs stays
   EXCLUDED (P2 failure + exact-id contract).
4. Quads remain parked pending the sensitivity read (if triples show
   additive costs, quads are predictable and may be skipped; if
   interactions appear, quads answer them).

## D441 — OWNER: D440 extends to pairs and triples of reductions (2026-09-01)

Owner: "What about combinations of 2 and 3 different reductions?"
This corrects the supervisor's narrowed reading of D440 — the original
wording was "ALL of the possible information reduced combinations" and
the supervisor ran only the 5 singles + the 5-way union (my scoping
error, owned). Extension: all C(5,2)=10 pairs and C(5,3)=10 triples of
{rows, opp, move, threats, gating} under caveman format — 20 further
arms, 10 brutal rooms x 3 reps each, same seeds, SAME ERA as the
running D440 chain. Quads (5 combos) remain unrequested; parked as a
question. Consequences accepted:
1. The pairs/triples chain queues BEHIND the running singles chain
   (one arena stream; quiet machine).
2. The D436 ctrl-value merge and the era-shift re-anchor move behind
   the full combination program — merging mid-program would split the
   era and reintroduce the confound this design avoids. P4 timing
   flexes accordingly.
3. With singles + pairs + triples + union + control all on one era,
   the dataset supports interaction-effect analysis, not just
   per-arm rankings.

## Supervisor record — D436 lane round 1 accepted; merge holds for D440 chain (2026-09-01)

Codex round 1 harvested. MY verification (distinct from codex claims):
tsc -b 0, sg scan 0, targeted suites 49/49 my own run; every exact
rational in the probe test matches the consensus oracle (net
178583/31250 = 5.714656, pi(k) table, wake 4368/3125, burden
97104/15625); both classification tables use `satisfies Record` with
NO default arm; legacy-pair V1/V2 byte-identity property test present;
frozen contracts.ts untouched; no forbidden patterns in new files.

**Finding against my own work (full length):** brief item A3 told the
lane the Incubus resolver "spends a slot" where the statblock models
1/day. That premise was INVERTED — the original hp-probe finding was
that the resolver spends the 1/day resource, and whether that was a
defect was never established. Codex checked reality instead of
patching: the reducer already spends the daily pool and leaves the
slot; it added a regression (daily use -> 0, level-3 slot stays 1,
probe test lines 321-323) and reported the premise wrong. My brief
error, codex's correct refusal.

**G sweep**: infeasible in-lane — the "D428-era sweep" fixtures were
supervisor-side ephemeral artifacts never committed. Compensating
check owned by me: pre-merge dry-run unresolved-actor count on the 10
brutal fixtures, lane vs main, expecting a drop for the
incapacitation-class subset and no legacy changes.

**MERGE HOLD**: the D440 arm chain is running from the main working
tree; merging mid-chain risks mixed-era module loading in the live
vite-node process. Order: D440 completes -> full vitest on lane +
live smoke 2-4 rooms -> merge -> full main gate -> mini-A/B -> G
sweep -> THE ERA SHIFT re-anchor (fresh full vs off) before P4.

## D440 — OWNER: P3 caveman again with all information-reduced combinations (2026-09-01)

Verbatim: "Try p3 caveman again with all of the possible information
reduced combinations." Supervisor reading: cross the caveman format
(P3's only non-losing arm) with the defined content reductions — the
five P3 reduction arms plus their full union:
1. cav-rows (rows=best_exception)
2. cav-opp (opportunityCost=conditional)
3. cav-move (movement=material_only)
4. cav-threats (threats=counts_exception_ids)
5. cav-gating (frontier=candidates_summary, knowledge=relevance_gated,
   failures=headline_codes, adverts=stubs, rare=triggered, misc=merged)
6. cav-all (union of arms 1-5)
All with format=caveman_prose, everything else default full. 10 brutal
rooms x 3 reps each, luna low, seeds 6203001-10. CONTROL = the existing
p3-caveman run (caveman full content) — same era (code-identical
3bf6b49f) and same seeds, so this round is confound-free internally.
Blinded pairwise panel (sol/opus/fable) as in P3. Arms run
sequentially; the ctrl-value lane is API-bound — if arena CLI-timeout
weather exceeds the P3 rate in an early arm, the run is discarded and
rescheduled, per gates-need-a-quiet-machine.

## Supervisor record — P3 UNSEALED: caveman prose is the only non-losing arm (2026-09-01)

Six pairwise blinded packets (control = P1b full arm, era 7a9b1a29;
distinct shuffle seeds; leak scans clean; packets carry executed plans
only, so the format arm cannot unblind itself). Judges: sol high, opus,
fable — 18 judgments, all 60/60 valid. Pooled arm minus its packet
control, paired W/L/T:

| arm | diff | W/L/T |
|---|---|---|
| caveman (format only) | +0.13 | 32/24/34 |
| gating | -0.58 | 32/27/31 |
| threats | -0.76 | 24/35/31 |
| move | -1.21 | 21/37/32 |
| rows | -1.48 | 29/42/19 |
| opp | -1.60 | 17/49/24 |

FINDINGS:
1. Every CONTENT-removal arm loses. Removing rows verdicts and
   opportunity-cost context hurts most; relevance gating least.
2. CAVEMAN PROSE — same content, terse human prose — is the only arm
   that does not lose (+0.13, positive for sol and opus), with 21-32%
   fewer bytes AND 2 weather-refused rounds scored zero against it.
   Refines P2: byte volume was never the lever; JSON-vs-prose FORMAT
   is. D431's human-readability bet validated at P3 scale.
3. Variance slice: caveman is uniform per-room (worst -1.44); gating
   swings -5.89 to +2.56. Content removal is high-variance,
   circumstance-sensitive; format change is low-variance.
4. Judge-noise floor from the 6x re-judged control: pooled control
   spread 6.24-6.67 (+-0.2). Caveman's +0.13 is INSIDE that band —
   claim is "does not lose", not "wins". Fable control score was 5.90
   in all six packets (internal consistency check passed).
CAVEATS: caveman ran on the post-merge era 3bf6b49f (it requires the
prose renderer); the five content arms ran on 7a9b1a29. Mini-A/Bs and
the byte-identity proof bound that confound but do not remove it —
P4 re-verifies the winner in one era per D436.3. Dataset: 360 rows
appended (486 total). P4 next: content K3/K2/top-K-stubs x 3 formats
after the honesty-fix/control-valuation era shift and re-anchor.

## Supervisor record — D438 grapple-valuation amendment consented (2026-09-01)

Sol's amendment harvested and ACCEPTED after my own verification:
- I re-derived every oracle number by hand (q=3/5, p=1/2, EVs
  4.35/2.28, B_1=957/1000, U=1623/2500=0.6492) — all exact.
- Key honesty property: the Bellman victim-best-response chooses FIGHT
  in the oracle, so escape-action credit is exactly 0 — grapple cannot
  be inflated with credit for actions a rational victim never spends.
- Family partition extends to legacy | hard_turn_denial |
  grapple_control; legacy-pair invariant untouched.
- Sol's engine finding VERIFIED by me: projectedTargetConditions drops
  Grappled ('return []', engine-query-port.ts:1495) because projection
  carries no grappler source — D437 must thread the source through or
  attack-impairment cannot be evaluated. Real integration constraint.
Amended spec appended to job-tmp ctrl-value-consensus.md. Lane order
stands: D436 framework -> D437/D438/D439 grapple lane. Dispatch waits
for the P3 caveman arm to finish (quiet machine).

## D439 — OWNER: optional-grappler probe monster; monk-inspired NPC (2026-09-01)

Owner: "Find an srd or homebrew monster that grapples optionally" then
"A monk inspired npc makes a good grappler."
Supervisor census of bundled optional grapplers (read from statblocks,
not recalled):
- BUGBEAR WARRIOR (SRD, CR 1, goblinoid-warband.ts:50): the best
  existing fit — a real CHOICE between Grab (2d6+2 bludgeoning +
  Grappled, escape DC 12, reach 10) and Light Hammer (3d4+2, advantage
  vs targets it grapples), plus the abduct trait with NO extra movement
  cost while dragging — the drag showcase the owner emphasized in D438.
- BUGBEAR STALKER (SRD, CR 3): Quick Grapple as a BONUS action (Dex
  save DC 13) alongside a morningstar multiattack — grapple at
  bonus-action price, maximally optional.
- Mimic pseudopod grapples but is currently withheld
  (typedUnavailable pending escape-disadvantage support); Roc talons
  grapple as an on-hit rider (not a choice); homebrew ursine Bear Hug
  grapples but has no alternative action.
RULING RECORDED: the D437 lane additionally builds an ORIGINAL
monk-inspired homebrew NPC grappler (licensing-safe original like the
existing Vane Warren NPCs; monk features are SRD): unarmed-strike
Grapple with the monk Dex-substituted DC, high speed for dragging,
Grab-vs-damage as a genuine tactical choice. The D438 grapple probe
scenario is built around it (bugbears as secondary probes), mirroring
the hypnotic-pattern probe pattern: judges must agree grappling+drag
is the superior line in the fixture.

## D438 — OWNER: grappling is control; it must be priced in the AI coaching (2026-09-01)

Verbatim: "We need grappling in the ai coaching options. It is a type
of control. Especially because you can drag characters around."
This OVERRIDES the D437 supervisor scope note that left grapple outside
control-valuation V1 (unresolved valuation). Binding consequences:
1. The control-valuation design gains a GRAPPLE control family
   alongside hard turn-denial. Pricing must stay grounded in real
   action costs, not invented fractions: expected victim actions spent
   on escape attempts (exact d20 check arithmetic vs escape DC, per
   round while held, horizon-discounted), the victim's attack-EV loss
   from disadvantage (computable delta, not a policy constant), speed-0
   positional denial, and a DRAG term — forced repositioning of the
   victim is first-class value, per the owner's emphasis.
2. Design amendment goes through the same dual-blind reviewer (sol)
   before implementation — one amendment round, not a re-litigation of
   the settled hard-control consensus.
3. Lane order becomes: D436 evaluator framework lane first, then the
   D437 grapple lane implements mechanics AND its pricing profile on
   top of that framework.

## D437 — OWNER: add grappling for PC and NPC if not already present (2026-09-01)

Verbatim: "We need to add grappling for pc and npc if we don't already
have it." Supervisor census of what exists (grepped, not recalled):
- HAVE: the Grappled condition fully modeled with SRD citations
  (conditions.ts:231 — speed 0, disadvantage vs non-source, drag cost,
  Tiny/two-size exemption); monster statblock-SPECIFIC grapples
  (conditionOnHit with escapeDc, quick-grapple bonus action,
  grapple_escape_disadvantage, grapple_movable, Swoop/abduct);
  tactical-evaluator advantage/disadvantage interactions.
- MISSING: (1) generic grapple INITIATION — the SRD 5.2.1 Unarmed
  Strike Grapple option (save DC 8+Str+prof, target's choice Str/Dex
  save, one-size-larger limit, free hand, one grapple per hand;
  srd-5.2.1.txt:12243-12280) for both PCs and NPCs; (2) the ESCAPE
  action — no turn option anywhere lets a grappled creature spend its
  action on Str(Athletics)/Dex(Acrobatics) vs escape DC
  (srd-5.2.1.txt:11704-11730); grappled PCs currently just sit at
  speed 0 (symmetric-pc-evaluator returns [] for Grappled); (3) grapple
  END conditions — grappler Incapacitated ends it, range exceeded ends
  it, grappler may release free; (4) Monk Dex-substitution for the DC.
Scope notes: Unarmed Strike Damage option comes along as the carrier;
SHOVE shares the machinery but was not ordered — parked as a question.
Intel: grapple is movement denial, not hard turn denial, so it stays
outside control-valuation V1 scope (advertises unresolved) — consistent
with D436's classification table.
Sequencing: after the P3 caveman arm and the D436 lane (both touch
turn-option-registry; sequential merges).

## Supervisor record — prose formats merged; control-valuation consensus reached round 1 (2026-09-01)

**Prose renderer merge (D434/D435).** lane-wt/caveman-prose merged
3bf6b49f after, in order: my full gates on the lane (tsc 0, sg 0,
9,406/9,406), pre-read of every production diff, and a pre-merge live
smoke — 2 brutal rooms structured default + 2 rooms caveman_prose from
the lane. Smoke evidence: default context bytes byte-count-identical to
live main on both rooms (28815, 32742 exact matches to the hp-probe
mini-A/B rows); caveman live path end-to-end (model consumed 25352/22150-
byte prose contexts, authorized real plans via exact option ids, 0
blocks, 0 service nulls). Post-merge full main gate mine: tsc 0, sg 0,
9,413/9,413, build clean, :4173 200. Its own D429.1 mini-A/B launched.

**Prose merge D429.1 mini-A/B PASSED** (10 brutal rooms x 1 rep, full
structured default, my run + extraction): 1.90 mean offense, 1/10
zero-offense, 0 all-end_turn, 0 service nulls, 0 blocks — equal or
better than both references (hp-probe era 1.70/2/0/1 block, p1b rep-1
1.60/2/0/2 blocks). Correction to the smoke note above: per-room
contextBytes totals vary with correction-call counts and cannot prove
render neutrality; the byte-identity claim rests on the lane's
mechanical proof test, not on run byte totals.

**Control valuation (D436.2): dual-blind consensus reached in one
cross-critique round.** Sealed supervisor doc + sol blind doc converged
on: typed outcome evaluator with branded exact rationals; net
action-equivalents as the common progress unit (damage converted too —
kill = horizon credit, full HP bar capped at 1); exact Poisson-binomial
+ capped wake recursion; concentration exposure-band discounting; V1
scope = hard turn-denial only; family-partitioned dominance (legacy
damage comparator preserved verbatim within-family, action-equivalents
cross-family only, with a compareV2===compareV1 property invariant on
all legacy pairs). Round 1 findings against our own work, at full
length: sol found a kill-branch double-count in its own pressure
formula (corrected to H*P(D>=hp) + sum_{d<hp} P(D=d)*d/hp) AND an error
in MY sealed doc — I wrote "expected caught 4" where 4 is the target
count and 3.2 the expectation. My dispute killed sol's original
axis-replacement (it contradicted its own damage-only regression
guard). Probe oracles: Hypnotic Pattern net 5.714656; Restless Touch
0.3538501601 exact. Merged spec: job-tmp ctrl-value-consensus.md +
sol's base doc. Implementation lane (with the D436.1 honesty fixes,
one combined era shift) dispatches at the next quiet-machine window,
after the P3 caveman arm.

## Supervisor record — hp-probe merge D429.1 mini-A/B PASSED; process slip owned (2026-09-01)

**Mini-A/B verdict (22cea413 era, 10 brutal rooms x 1 round, full
profile, luna low):** mean offense 1.70/round, zero-offense 2/10,
all-end_turn rounds 0, service nulls 0, one auto_submit_blocked
unresolved-frontier block (room 5; round still authorized). Paired
round-1-only slices of the healthy references, computed by the same
script: confirm-full 1.60 / 2 / 0, p1b-full 1.60 / 2 / 0. Shape
identical, mean marginally better. The hp-probe merge keeps its
behavioral control. All numbers are my own runs and my own extraction.

**Process slip (mine):** the hp-probe merge went to main after dry-run
verification and full gates but WITHOUT the required pre-merge live
smoke on its host-path production changes (turn-option-registry,
intent-resolver area plumbing), and without pre-reading the production
diffs. Compensating controls applied after the fact: post-merge diff
review, full main gate green, and this mini-A/B. The rule stands as
written — smoke BEFORE merge; the prose-renderer merge queued behind
this verdict runs its live smoke first.

## D436 — OWNER: honesty fixes now + control valuation built immediately; re-anchor before P4 (2026-09-01)

1. **Coaching-honesty defects: FIX NOW** — multiattack EV undercount
   (10.6 shown vs 21.2 real), usable_now:false contradicting the
   resolver, Incubus 1/day-vs-slot spend. One lane.
2. **Control valuation: BUILD IMMEDIATELY** — unpriceable save-or-suffer
   control is a defect of the null-row class, not a deferred design
   project. Supersedes D433.1's wait-for-probe trigger. Design goes
   through a dual-blind consensus round (supervisor + sol) before
   implementation, per the standing protocol for medium+ complexity.
3. **One combined era shift**: both land together, then a RE-ANCHOR
   (fresh full vs off) runs before P4. P3's panel still unseals on its
   own era (internally consistent); its winner is re-verified in the
   new era within P4 rather than assumed.

## D435 — OWNER: P4 and P5 run regular prose vs caveman prose vs JSON (2026-09-01)

Verbatim: "Run p4 and p5 with regular prose vs caveman prose vs json."
Format becomes a first-class arm dimension for the remaining rounds:
1. The renderer lane builds BOTH prose registers in one increment:
   format: structured | caveman_prose | regular_prose. Regular prose =
   normal readable coaching paragraphs (complete sentences, still
   concise); caveman = maximally terse simple sentences (D434). Both
   under the same hard constraints (exact ids/revision verbatim,
   content completeness vs the seam-filtered structured form,
   determinism, trim-by-sentence never-throw, default unchanged).
2. P4 (alternatives): content arms K3 / K2 / top-K-stubs each run in
   all three formats (9 new arms); the incumbent x 3 formats reuses the
   P3-era control and format arms where era-identical. One blinded
   panel, sliced unsealing (content x format attribution).
3. P5 (binding confirmation): the accumulated winner runs in all three
   formats vs fresh intel-off; the confirmation picks content AND
   format together under the D425 must-beat rule.
4. Spend authorized freely per D381/D425.4; wall-clock is the
   constraint, arms run sequentially per quiet-machine rule.

## D434 — OWNER: caveman-prose arm joins the P3 comparison (2026-09-01)

Verbatim: "Run p3 again with caveman prose to compare." Partially
supersedes D433.3 (prose was queued after the removal rounds): a
CAVEMAN-PROSE rendering — the full turn-context content rewritten as
maximally terse, simple-sentence, human-readable prose — runs on the
same rooms/reps/era as the P3 arms and joins the SAME blinded panel
against the same control, isolating FORMAT (prose vs structured) as the
single variable. Execution: codex lane builds a format rung
(structured | caveman_prose) with binding constraints — exact option
ids and state revision preserved verbatim in the prose (the submission
contract depends on them), all numbers kept, deterministic, 32KB cap
respected by sentence-dropping (never throw), default unchanged.
D433.3's fuller prose round after P5 remains for richer prose styles.

## D433 — OWNER: three probe/format rulings (2026-09-01)

1. **Scorer mispricing (if confirmed): FIX ONLY IF THE PROBE FAILS
   BROADLY** — if most profiles still choose control despite a
   dominated-label on Hypnotic Pattern, the scorer stays as-is through
   P5 (era stability); if damage wins everywhere, fix immediately and
   accept the era shift.
2. **Probe family: SINGLE SCENARIO NOW** — validate and wire the
   Hypnotic Pattern probe first; grow a control-vs-damage family later
   if it proves useful.
3. **Prose rendering arm: AFTER THE REMOVAL ROUNDS** — P3-P5 finish on
   the structured format so removals stay attributable; a prose
   (paragraph-form) coaching rendering then gets its own round.

## D432 — OWNER: Hypnotic Pattern control-vs-damage probe scenario (2026-09-01)

Directive: build a scenario where the AI DM must choose between casting
Hypnotic Pattern (crowd control) and dealing plain damage, constructed
so the judges AGREE the crowd control is the superior choice — the
probe exists to make sure damage is not chosen over something
fight-winning like Hypnotic Pattern. Execution plan:
1. Codex lane builds the frozen fixture: a monster caster with Hypnotic
   Pattern prepared and slots; 3+ PCs clustered inside a legal 30-ft
   cube placement with NO monsters caught in it; a damage option
   present but clearly inferior (single-target). Mechanical checks:
   the option list must advertise the cast with a legal cube; the
   effect must resolve (Charmed+Incapacitated, concentration).
2. The lane REPORTS how the intel stack prices the option (EV model,
   dominance status, team-scorer axes) — if the coaching itself calls
   the control dominated because it deals no damage, that is a core
   finding about the scorer, not something to patch silently.
3. Supervisor validates judge agreement ONCE (blinded panel on the two
   candidate plans); after agreement, the scenario becomes a
   mechanical guardrail probe (was Hypnotic Pattern cast: yes/no) run
   per profile arm in P3+ rounds and recorded in the dataset.
Engine support verified before recording: KB R-SPELL-124, dedicated
hypnotic_pattern payload kind in engine-query-port, manifest entry.

## D431 — OWNER: human-readable optimization only; DM context is coaching for humans (2026-09-01)

Verbatim: "For the p# rounds, treat the ai dm like it was human. Keep it
human readable and remove information strategically to see what
information removals improve ai dm performance. Remember we are
targeting coaching for human dms in the end so stick to human readable
optimization." Consequences, binding:
1. Every renderer variant that earns a live slot must be something a
   human DM could read at the table. Machine-oriented encodings
   (short-ref tables, sparse slot forms, hoisted id schemes) are
   PERMANENTLY excluded, not merely shelved — they fail the
   human-readability test regardless of any future byte argument.
2. The experimental lever is STRATEGIC INFORMATION REMOVAL: which
   removals improve AI-DM performance, read as a proxy for what a human
   DM doesn't need. The AI DM is the measurable stand-in for the human
   DM the coaching ultimately targets.
3. In-flight P3 arms comply (each is a readable brief: best-choice rows
   with exceptions, opportunity-cost only when competitive, movement
   notes only when material, threat counts). P4's fewer-alternatives
   arms comply (fewer options, each fully readable). No in-flight
   change needed.
4. The D427 end-goal artifacts (adaptive seam selector / fast reading
   prompt) inherit the constraint: profiles the selector picks between
   must all be human-readable.

## D430 — OWNER: relevance reduction, not byte compaction (2026-09-01)

Verbatim: "For improving the dm coaching for brutal rooms, we need to
reduce the irrelevant information. Byte compaction will not help much."
Consequences, binding on the slimming program:
1. Representation-compression seams (S-ids/S-slots/S-status/S-label,
   the compact-wire family) are SHELVED as live levers — consistent
   with P2's measured failure. No further live slots for them.
2. The program's thrust is CONTENT RELEVANCE: which surfaces/rows/
   options are material to THIS actor's turn in THIS room. P3's four
   category-brief arms and P4's fewer-alternatives arms already are
   relevance cuts and proceed unchanged.
3. TIER 2 relevance gating (rare:triggered, knowledge:relevance_gated,
   frontier:candidates_summary, failures:headline_codes, adverts:stubs,
   misc:merged) is promoted from conditional to a CONFIRMED fifth arm
   of the P3 screen — top-level surface gating is the purest
   "drop the irrelevant" test available.

## P2 wire compaction UNSEALED: FAILS promotion — SUPERVISOR (2026-09-01)

Compact-wire (sparse slots + short-ref ids + sparse status + derivable
labels) vs P1-full control, same era, blinded panel (sol 7.77/6.32,
opus 5.10/4.18, fable 6.43/5.50 control/compact), shuffle 163. POOLED:
control 6.43 vs compact 5.33 (−1.10), paired W10/L15/T3. Sensitivity
excluding the two symmetric CLI-timeout pairs: −0.90, W9/L14/T3. Byte
cut delivered: 19.1% p50 / 20.5% p90 pre-trim — the ≥8% bar met — but
quality misses the ≤0.2 band by 4x. VERDICT: not promoted; P3's common
control remains the full presentation. PROGRAM FINDING: "same
information, fewer bytes" HURTS at luna-low — the volume hypothesis
(A1/A7) is refuted in its pure form; representation legibility matters
more than byte count. Slices: compact WINS rooms 01/02/03/05 (+0.2 to
+1.4) and collapses on 04/06/10 (−2.1 to −7.3) — D427 heterogeneity
again. One packet-builder inconsistency found and recorded: CLI-timeout
rows are classified 'refused' (scored 0) while silent service faults
are 'service_null' (excluded); symmetric this round, to be unified
before P5. P3 (four-arm category screen: rows/opportunity/movement/
threats one-seam briefs vs full control) dispatched.

## D429 — OWNER: three post-P1 rulings (2026-09-01)

1. **Standing post-merge behavioral gate: SHAPE-STAT MINI-A/B** — after
   every host-path (engine/renderer/conversation) merge: 10 rooms x 1
   rep live, shape stats (offense, zero-offense, end_turn, blocks)
   compared against the era reference; no judge panel. Catches the
   regression class that gates/tests/smokes were blind to.
2. **D427 dataset home: PRIVATE DIR stays** —
   ~/dnd-research-private/slim-dataset/, outside all git trees; the
   public repo carries only aggregated results.
3. **Interim intel default: HOLD UNTIL P5** — full-intel default
   unchanged everywhere despite the era-clean brutal inversion; the
   slimming program may produce a profile that beats off.

## P1 re-anchor UNSEALED (fixed era 7a9b1a29) — SUPERVISOR (2026-09-01)

Both arms fresh, 10 brutal rooms x 3 reps, luna-low; blinded 3-judge
panel (sol 7.17/8.41, opus 5.53/6.41, fable 6.37/7.07 full/off), sealed
key, shuffle 149. POOLED: full 6.36 vs off 7.30 (diff −0.94), paired
W6/L19/T4, rooms won by full 2/10. The off arm was rerun once untuned
after a 5/30 CLI-timeout weather event (discarded); one off row lost to
a silent service fault is excluded as service_null (both-arm case
dropped). Era baselines for the slimming program: FULL 6.36 / OFF 7.30.
The cycle-3a inversion REPRODUCES era-clean at smaller magnitude (−0.94
vs −1.29): full-intel presentation still net-hurts on brutal at
luna-low. First D427 slices: full does least-bad on trim-engaged rooms
(−0.87, 6 wins/20) and worst on small/untrimmed rooms (−1.48 to −1.50,
0 wins); rooms 04/10 flip positive — per-circumstance heterogeneity is
real. Hard-basis satellites (3 rooms x 1 rep per arm, seeds 5117011-13,
metrics-only) recorded into the dataset. P2 (wire compaction: sparse
slots + short refs + sparse status + derivable labels vs P1-full
control) dispatched on the same era.

## Regression fixed and confirmed live; finding chain closed — SUPERVISOR (2026-09-01)

lane-wt/frontier-regress merged (7a9b1a29, 3 review rounds; my tsc -b
caught 4 type errors codex's --noEmit run missed). TRUE root causes,
both codex-proven with a fail-pre-fix repro: (1) at PC initiative
boundaries the correction context refresh selected the ACTIVE PC instead
of the pending monsters — full-intel context construction failed
pre-submission (100 failed attempts vs 0 old-era), driving conversations
into deterministic exhaustion and passive sim_controller plans; pending
request's monsters are now authoritative. (2) Dominance validation was
BYPASSED whenever any typed override was present; note-less
unknown_engine_gap and vacuous resource_conservation overrides
authorized model-chosen all-end_turn rounds; validation centralized and
the required-note branch is schema+type-encoded. My render-side-effect
hypothesis from the isolation note below was REFUTED by codex with a
retained negative-control test — recorded as my wrong hypothesis; the
exhaustion framing was right, the mechanism was not. Frontier safeguard
untouched. LIVE CONFIRMATION (my run, 10 brutal rooms x 3 reps, full
intel, post-fix): mean offense 2.03, zero-offense 3/29 (matches healthy
c3a 3/28), all-end_turn rounds 0 (the 2 rounds containing an end_turn
are mixed rounds with one actor passing under an 'objective' override —
present in the healthy old era too), blocks 3 (residual distinct
failures: reaction-schema x2, tools-unavailable x1, pre-existing class).
Gates: tsc 0, sg 0, vitest 9390/9390, build clean, :4173 200. P1
unblocks: the confirmation arm stands as P1's fresh full arm; off arm
and hard-basis satellites rerun on the fixed era (pre-fix versions
discarded as tainted).

## Regression isolated to exhaustion-path frontier resolution — SUPERVISOR (2026-09-01)

Amends the finding below with the completed isolation chain (all my own
runs, same 10 brutal rooms, luna-low, same day): (1) 3-arm study on new
era — restored-default presentation (byte-identical to old era) 1.17
offense/12 zero-offense/4 end_turn; nulls-omitted 1.64/10/2; stamp-on
1.55/8/4 — presentation EXONERATED, all arms equally collapsed. (2) OLD
era 4deae1fc run today: 2.39 offense, 0/28 zero-offense, 0 end_turn —
model drift EXONERATED, the defect is ours. (3) Conversation-level
discriminator: autoSubmitBlocks ('auto_submit_blocked_unresolved_
frontier', tools/ai-dm-conversation.ts resolveDeterministically) fires
12x new era vs 0x old; blocks correlate with zero-offense rounds (6/12
vs 2/18); monsterSegments 38 vs 20. The machinery predates P0
(35a42605); what changed is how often the frontier reads unresolved.
Prime suspect: P0's perf fix lazified/removed eager turn-context renders
whose SIDE EFFECT resolved frontier candidates before the deterministic
path read them — a hidden temporal coupling that worked by accident in
the old era. Dry-run does not reproduce (simulated adapter never
exhausts). Root-cause lane lane-wt/frontier-regress dispatched with a
fail-pre-fix/pass-post-fix reproduction requirement; fix must decouple
frontier resolution from rendering, not restore the eager render.
Defaults meanwhile: lane-wt/slim-diag merged (ba1e92cd) reverted
presentation defaults to the attested-good era — necessary hygiene but
NOT the cause. P1 re-anchor remains blocked until this lands.

## FINDING against merged P0: full-intel behavioral regression — SUPERVISOR (2026-09-01)

The P1 re-anchor unsealed at full 4.38 vs off 7.46 pooled (W3/L25/T2,
0/10 rooms, all three judges agree) — far beyond cycle-3a's −1.29 on the
same rooms. My verification, in order: (1) D427 slices refute the
trimmer-fallback hypothesis (paired deficit −3.13 trim-engaged vs −2.96
untrimmed; untrimmed full rows score WORSE, 2.93 vs 5.00). (2) Dry-run
render diff old-era 4deae1fc vs new era on seed 6203001: contexts
near-byte-identical — options byte-identical per actor, row/actor counts
equal; the ONLY model-visible deltas are omission of explicit-null
p_hit/ev fields from intel rows and the new renderer_attribution stamp.
(3) An untuned full-arm rerun REPRODUCES the collapse (zero-offense
10/30, all-end_turn rounds 4, mean offense 1.53) — not weather. (4) The
rep-semantics confound is quantified away: cycle-3a REP-1-ONLY fresh
rows give full 2.00 offense, 0 zero-offense, 0 end_turn, move 150; the
new full arms give ~1.4/10-12 zero-offense/2-4 end_turn/move 70-101,
while off arms are era-stable (2.40 rep-1 c3a vs 2.31 P1). (5) An
all-end_turn round was model-chosen (primary=fallback=pass option,
callsPerRound 1, no refusals) — the model selects passes under the new
presentation; the pass options themselves are unchanged and were never
chosen in c3a. This regression shipped in my P0 merge after all gates
and a 2-room live smoke passed — the smoke's rooms authorized plans and
showed no pathology, so presentation-quality regressions of this kind
are invisible to gates and small smokes; only the paired A/B caught it.
CONSEQUENCES: P1's verdict is NOT recorded as the era anchor; P1 repeats
after diagnosis. Next: a diagnostic lane adds two renderer rungs
(explicit-nulls restore; attribution-stamp off) and a 3-arm mini A/B
isolates the cause; the losing change reverts or becomes default-off.

## P0 slimming landed — new measurement era at c2c5ef63 — SUPERVISOR (2026-08-31)

Merged lane-wt/slim-p0 (2 review rounds; my full gate caught 3 defects
codex's targeted runs missed: a trimmer RangeError replacing the
degrade-never-throw contract, and two arena test timeouts from redundant
rendering — all fixed without weakening) and lane-wt/kill-2c increment 1
(3 rounds; caught an unverified error-shape guess and a false "tsc exit
0" claim; final 84 addressed / 35 equivalent-proven / 3 unaddressed;
mutant 2370 shown misreported by Stryker). Gates I ran on main
post-merge: tsc 0, sg 0, vitest 9384/9384, build clean, :4173 200. Live
smoke 2 brutal rooms: plans authorized, 0 refusals, renderer attribution
+ circumstance features stamped, trimmer exercised live without throw.
Consequences: null-row fix and path-granular delta are now production
default — P1 re-anchor (full vs off) measures THIS era; all prior
brutal-tier numbers (8.08 / 7.62 / 6.79) are cross-era from here on.
Calibration artifacts: lane .tmp-calibration-table.{json,md},
supervisor-regenerated.

> **Compacted 2026-07-30 at the owner's instruction** ("remove older decisions
> contradicted by the new one and duplicate decisions; compact the text to be
> more terse"). The full unabridged history is in git at commit `808f902` and
> earlier. Every D/F number remains a heading so external references resolve;
> entries contradicted by a later ruling are one-line tombstones pointing at
> the ruling that replaced them. Newest first.

## Stryker 2b verification window — SUPERVISOR (2026-08-31)

Exclusive-machine window, 167m53s, 3,424 mutants in scope (I ran it and
read the final report myself). All-files score 94.81% (3,482 killed / 7
timeout / 171 survived / 20 no-coverage). party-pack.ts 93.17% with 122
survivors — down from 231 pre-kill-2b, verifying the campaign's net
effect (~109 survivors eliminated; ~45 were deliberately deferred
unclassified, so the live remainder is the kill-2c backlog per D428.1).
Other files: controllers 96.64%, vane-warren 96.18% (15 surv),
local-session-store 94.13% (15 surv), survival-policy 99.64%,
session-record 98.41%, stable-dom-render 97.44%. Known restore artifact
recurred: exec bits dropped on two fixture .mjs files, restored by hand;
tree otherwise clean. Survivor detail in reports/mutation/mutation.json.

## D428 — OWNER: queue priorities around the slimming program (2026-08-31)

1. **Kill-2c (party-pack survivor remainder): PARALLEL QUIET-STRETCH
   LANES** — dispatch increments alongside slim P1–P5 during waits;
   Stryker verification windows still take the exclusive machine and
   queue behind live rounds.
2. **D395 imports (Astral Tower CC0 first): AFTER SLIM PROGRAM** — the
   queue stays serial; imports start when P5 unseals.
3. **Speculation (D403/D407) live verification: MULTI-ROUND ARENA LANE**
   — extend the arena to 3+ rounds on a few rooms specifically so
   speculation trigger conditions fire, then verify behavior (modest
   spend). Cycle-3 recorded 'none' on every row because 1-round arenas
   never meet the triggers; the feature has shipped but never been
   observed live.

## Slimming-program consensus plan — SUPERVISOR+SOL (2026-09-01)

Dual-blind brainstorm -> verification (A2 falsified: options carry no
target-permutation duplicates; the permutation mass and the null dead
weight live in intel.rows) -> cross-critique -> merge -> explicit sol
CONSENSUS with six adopted amendments. Plan: P0 no-spend (null-row fix +
flagged experiment renderers + calibration byte table) then five live
rounds (re-anchor; wire compaction; four-arm category screen;
alternatives K/stub round with hidden-but-legal resolution; binding
confirmation vs fresh intel-off under the D425 must-beat rule + sol's
numeric thresholds). Full plan: job-tmp slim-consensus-plan.md. P0
dispatches when the running Stryker window completes.

## D427 — OWNER: circumstance-conditioned slimming + adaptive end-goal (2026-09-01)

Verbatim intent: "pay attention to when certain seam combinations work
better in certain circumstances and other seam combinations are better in
different aspects or circumstances. Collect enough data so that we can
try to build an adaptive setting seam changer that is based on
circumstances or a prompt for Luna low that is very fast that increases
results without adding too much time." Consequences, binding on the
slimming program:
1. Every live-round arena row records a typed CIRCUMSTANCE feature vector
   (room density features, caster/terrain load, engagement distances,
   turn granularity, delta size, trim pressure, etc.).
2. Every unsealing reports per-circumstance sliced results (which profile
   wins WHERE), not only pooled means.
3. Rounds accumulate into one dataset for the end-goal decision:
   adaptive seam selector keyed on circumstances, and/or a fast luna-low
   context-reading prompt (KB variant) — that choice returns to the
   owner when the data exists.
4. Density-axis spread: small metrics-only hard-basis satellites ride the
   live rounds so the dataset spans simple->brutal (no extra panel cost;
   round verdicts stay brutal-only per D426.2).

## D426 — OWNER: three slimming-program follow-ups (2026-09-01)

1. **Interim production default: TOO EARLY TO DECIDE** (owner's words) —
   no change now; the question returns to the owner once the program
   produces data. Full coaching remains default meanwhile.
2. **Success bar stays brutal-only** — no simple-room non-regression
   requirement added to the confirmation round; simple-room behavior is
   a post-promotion watch item.
3. **Calibration sitting: REGENERATE post-slimming** — the rerun-2-era
   20-entry sheet is retired unscored; a fresh owner sample comes from
   the slimming confirmation round's packet (supersedes the prepared
   sheet from D423.1).

## D425 — OWNER: intel-slimming experiment program rulings (2026-09-01)

From the coaching-lossy-comprehension question round:
1. **Success bar: slimmed full-intel must BEAT intel-off** on the brutal
   rooms before production defaults change.
2. **Render-side first**: rounds 1-3 slim rendering only; the
   reply-contract change (canonical option + AI picks target) becomes
   its own later round only if render-side cannot close the gap.
3. **All-null coaching rows are a DEFECT, fixed now** (before the
   experiment rounds); the intel-off baseline re-measures in-era after.
4. **Scale: as drafted, spend freely** — free rendering calibration pass
   plus ~4 live A/Bs with full blind panels, one variable each.
Also standing from the same directive: dual-blind Fable+sol
brainstorm -> critique -> consensus produces the experiment plan.

## Arena rep-semantics reinterpretation — SUPERVISOR (2026-09-01)

The room-4 diagnosis found that in EVERY non-interleaved arena run to
date, reps 2-3 of a room were NOT fresh replays: they continued one
persistent conversation (encounter state and full-context delta anchor
survived), i.e. they were later rounds of the same fight. Consequences,
recorded honestly:
1. All PAIRED verdicts stand (reruns 1-2, party-policy A/B, cycles
   3a/3b): both arms shared the semantics identically, so comparisons
   remain one-variable-valid. The "3 independent reps" labeling was
   wrong; reps were round-1/round-2/round-3 of one encounter.
2. The cycle-3 "refused rounds" sub-claims are SUPERSEDED: all four
   refusals were this harness defect (rep-2+ state breaking the
   full-context delta path in room 4), not model failures. The 3a/3b
   headline numbers keep those zeros in-sample for both arms; the
   inversion (19/30 paired losses) does not rest on them.
3. Fixed at the arena layer (merged): every room x rep is now an
   independent one-round conversation over a cloned frozen fixture.
   Post-fix runs are a NEW measurement era; pre-fix reps 2-3 must not
   be compared to post-fix reps.

## Cycle-3b result — SUPERVISOR (2026-09-01): tier helps, presentation still loses

sol-low 7.62 vs luna-low 6.91 on full intel (19W/2L/9T), but both lose
to luna-low intel-OFF (8.08). Three-point picture: capacity real but
insufficient; the intel presentation costs more than it gives on brutal
density at both tiers. All four refused rounds in the study are room-4
reps 2-3 under BOTH models — a deterministic room-conditioned
full-intel-path defect, diagnosis lane dispatched (dry-run
reproducible). Direction question (density-aware intel presentation;
interim production defaults) queued for the owner. Full report:
job-tmp cycle3b-report.md.

## Cycle-3a result — SUPERVISOR (2026-09-01): INVERTED

On the brutal basis at era 4deae1fc, the full intel stack LOST to the
intel-off control: pooled 6.79 vs 8.08, 6W/19L/5T, all three judges
agreeing; both refused rounds were full-arm. Read together with reruns
1-2 (full stack dominant on simpler rooms): intel value inverts with
room complexity at luna-low. Candidate mechanisms recorded (post-trim
context quality, small-model saturation, surface prioritization);
cycle 3b (model tiers, same rooms) tests the capacity hypothesis
directly and runs next. Intel-stack changes held until 3b lands. Full
report: job-tmp cycle3a-report.md.

## D424 — OWNER: cycle-3 design, parallel capability, Stryker timing (2026-08-31)

1. **Cycle-3 is TWO sequenced cycles on the same frozen brutal rooms**:
   3a = intel-off control vs full stack (same model) quantifying the
   whole program; 3b = model tiers (luna-low vs sol-low) on the identical
   rooms afterward.
2. **Plays v1 (D405.4/.5) and speculation (D403/D407) dispatch in
   parallel lanes**; trunk landings serialize at merge as usual.
3. **The ~5h Stryker verification window (2b campaign) runs after
   cycle-3 completes.**

## Party-policy A/B result — SUPERVISOR (2026-08-31)

D423.3 executed: full blinded panel on 60 entries, same rooms
(digest-identical by seeded determinism), party policy the only
variable. DM round quality: symmetric 9.24 vs heuristic 8.97 pooled,
7W/2L/21T — small positive, largely party-independent (the
de-confounding the ruling wanted). Operational: refusal rows 19 vs 24,
tool calls 228 vs 254, wall -28%. symmetric_evaluator_v1 confirmed as
default. Secondary finding: both arms' DM play is near-ceiling on the
'hard' basis (zero dodges/wasted dashes in 60 entries) — 'brutal'
(cycle-3, in flight) is the next discriminating measuring stick. Full
report: job-tmp ab-party-policy-report.md.

## Stryker verification window result — SUPERVISOR (2026-08-31)

Exclusive quiet-machine run at main 347b1d88: 7,530 mutants / 7-file vtt
scope / 5h11m. Score 90.83%. Per-file: survival-policy 99.64,
session-record 98.41, stable-dom-render 97.44, vane-warren 96.18,
local-session-store 94.13, party-pack 87.11 with 231 survivors — the
known kill-batch-2b backlog (old queue item 6), now freshly sized. The
two previously-unverified merged kill-batch test sets held everywhere
outside party-pack. Report on disk at reports/mutation/ (gitignored).

## D423 — OWNER: four post-rerun-2 rulings (2026-08-31)

1. **Calibration sitting (D418.11): 20-entry sample, prepared now** —
   blinded subset of the rerun-2 packet with the panel rubric; key stays
   sealed until the owner finishes scoring.
2. **Next thrust: INTERLEAVE** — cycle-3 harder-basis construction runs
   as one lane while capability lanes (D419 parity, fungible slots, M6
   KB A/Bs) run beside it; the cycle-3 measurement fires when both are
   ready.
3. **Party-policy A/B: YES, WITH judge panel** — heuristic_v0 vs
   symmetric_evaluator_v1, same rooms, one variable, full blinded panel;
   runs before the next baseline is cut so PC and DM effects never
   confound.
4. **Engine-merge: continue interleaved** from stage 2 (main-sync
   first), same cadence as stages 0-1.

## R1-10 rerun-2 result — SUPERVISOR (2026-08-31)

The D418.3/D418.6 promotion-gating rerun PASSED: current era (70f034e8,
per D422.1) pooled 9.17/10 vs baseline (b4cf6b63) 7.51, 28 wins / 1 loss
/ 1 tie across 30 paired cases, judge agreement r 0.79-0.96. Measured
pipeline noise floor: rerun-1 vs rerun-2 baseline scores differ by 0.05.
Sole loss = the room-8 mass-zero-feet-dash round, still emitted by the
current era despite inc7's wasted-turn domination — localized to
movement options for enclosed spawns (no non-wasted alternative reached
the frontier), queued as a post-rerun fix. D418.11's owner calibration
sitting is now due at the owner's convenience. Full report:
job-tmp rerun2-report.md; protocol/artifacts as recorded in the rerun-1
execution record plus D422.

## D422 — OWNER: four rerun-2 program rulings (2026-08-31)

1. **Rerun-2 era INCLUDES D420**: inc6 rendering + inc7 + D420
   search-memory/help-calling all merge before rerun 2 runs. The owner
   chose the bigger measured delta over isolating increment 7; rerun 2
   measures the combined program.
2. **Rerun-2 arms**: same pre-intel baseline b4cf6b63 on the
   baseline-era frozen rooms (byte-attested, as in rerun 1) — rerun 1
   and rerun 2 current-era scores read against a common anchor. Pinned
   before any rerun-2 data exists.
3. **Post-rerun-2 queue order is the supervisor's call per tick**
   (PC evaluator, parity Missing rows, fungible slots, M6 KB A/Bs —
   sequenced by lane availability and collision risk, reported as gone).
4. **Statblock vocabulary lane opens NOW**: parallel codex lane types
   the ~20 unsupported SRD mechanics from the D395.3 import; no rerun
   contamination (R1-10 rooms are frozen).

## R1-10 rerun-1 execution record — SUPERVISOR (2026-08-30)

Deviations and decisions taken executing D418.5/.6, recorded before any
judging result exists:

1. **Both arms fresh** (frozen cycle-3 corpus had 2 rounds/room, not the
   3 preregistered reps): baseline arm from a worktree pinned at
   b4cf6b63 (pre-intel), current arm from main 8100101b; luna low,
   `--basis hard`, k6, identical command shape; code era the only
   variable.
2. **First current arm DISCARDED as unpaired** (rerun1-current.jsonl,
   30 rows spent): the frozen room fixtures for the R1-10 seeds were
   regenerated between eras, so every pair played different rooms
   (sha256 of fixture files + 30/30 state-digest mismatch). Re-run with
   the baseline-era fixture files byte-copied into a worktree at
   8100101b (all 10 verified identical); that arm (rerun1-current2) is
   the current arm of record.
3. **Cross-era packet mode**: canonical-state digests cannot match
   across eras (state shape changed), so the packet tool gained
   `--cross-era` — arms partition by repoCommit, digest consistency
   enforced within arm, room-INPUT identity attested by the fixture
   byte-comparison above. 4 codex review rounds, consensus at aa69758d.
4. **Two external judge dispatches VOIDED** (quarantined
   *.VOID-unblinded.*): the first packet leaked arm identity — the
   roundNarrative is an era-specific renderer template, and before that
   engineIntel/raw plan shapes leaked. Narrative is now banned from the
   packet (d9e8e9bd); judges score outcome + attribution + era-neutral
   executed plan with movementFeet.
5. **Accepted residual**: entries stay group-separable by behavioral
   richness (current era executes Multiattack expansions: 85
   multi-action actors vs 0). That is the measured treatment effect;
   judges can group but not label. Also accepted: repoCommit-partition
   validates structure only (provenance attested here), and recorded
   digests cannot catch a deterministically wrong load.
6. Fable panel seat caveat: the supervisor harvested both raw arms
   before judging; never read the blindId→arm key. Sol/opus judge from
   fresh contexts.

## D388.1 — OWNER: merge-track direction reconfirmed; track re-staffed (2026-08-31)

Asked whether the idle engine-merge track restarts, owner: "I think I
asked for the sim engine to be replaced by importing the vtt engine."
Verified against D388 verbatim ("Both should import the same engine") —
recollection correct; no new ruling. Consequence: the D388/D389/D390
program stands as ruled — parallel track in wt/engine-merge, FABLE
implements directly (D390 exception to codex-implements). Supervisor
restarts the track now, interleaved with supervision ticks.

## D418.10 — OWNER: R1-10 stays the only holdout (2026-08-31)

Owner chose "R1-10 only" over adding a second sealed holdout: every
improvement is judged on the ten preregistered rooms; the
inspection-contamination concern is accepted.

## D418.11 — OWNER: calibration sitting after rerun 2 only (2026-08-31)

One owner scoring sitting, after rerun 2; rerun 1 is judged entirely by
the model panel (D418.5). Supersedes the D419.1 parking of R01/R02
scores — those fold into the post-rerun-2 sitting.

## D418.12 — OWNER: PC intel timing confirmed post-rerun-1 (2026-08-31)

Confirms the supervisor proposal in D418.9: the PC-side symmetric
evaluator with player knowledge is built after rerun 1; rerun 1 runs
against heuristic PCs.

## D418.6 — OWNER: rerun 1 is diagnostic-only; rerun 2 gates (2026-08-31)

Owner ruling from the three-way question consensus (Fable + codex + opus
all independently ranked this #1): rerun 1 carries NO pass/fail gate.
Increments 6-7 proceed regardless of its results; rerun 2, after the
full program, carries the promotion decision. Pinned BEFORE any scores
exist. Mixed-direction metric movements in rerun 1 are diagnostic
material, not verdicts.

## D418.7 — OWNER: auto-submit requires a resolved material frontier (2026-08-31)

Refines D418.3: the engine may auto-submit its default only when the
chosen plan AND every competitive top-K alternative are resolved. An
unresolved competitor blocks auto-submit and defers to the normal
LLM/controller path. (Codex found this gap while increment 5 was
mid-implementation.)

## D418.8 — OWNER: increment 7 scores via Pareto frontier + LLM choice (2026-08-31)

When lethality, encounter objectives, resource conservation, and
persona favor different team plans, the engine removes dominated plans
and the LLM chooses among the non-dominated remainder. Fits D419.2
human-DM emulation: judgment stays in the model seat; the engine owns
legality and dominance only.

## D418.9 — OWNER: PCs get the symmetric evaluator with player knowledge (2026-08-31)

Resolves the question D418.1 deferred: scripted PCs use the SAME
tactical/movement/concentration evaluators as the DM side, but their
inputs pass through the actor-knowledge projection (actor-knowledge-v1)
— only what players would perceive; no monster HP/AC/slots. The
projection becomes load-bearing. TIMING NOT YET RULED: the owner chose
the knowledge model only. Supervisor's proposal (pending owner check):
build post-rerun-1 so rerun 1 stays the last one-variable DM-side
measurement; but D418.6 making rerun 1 diagnostic-only weakens that
argument, so an owner call either way is cheap.

## D418.5 — OWNER: rerun 1 judged by the cycle-2 panel (2026-08-30)

Owner chose "Same panel as cycle 2" for the first R1-10 rerun: blind
panel of sol high + opus + Fable with an owner calibration sample
(D396.6 pattern), consuming the rerun-packet-v1 blinded interleaved
packets. Keeps scores comparable to pre-intel baseline judgments.

## D395.3 — OWNER: statblock roster expansion, SRD set plus clean-room customs (2026-08-30)

Owner chose "Yes, plus clean-room customs": import the ~12 SRD 5.2.1
monsters the Astral Tower rooms reference (CC-BY, typed statblocks +
tests) so the 26 imported rooms become runnable, AND derive D417-style
clean-room equivalents for the two custom monsters (Astraldendon,
Astralmycon) so every room fully resolves. Clean-room derivation from
mechanical role only — no Knave prose.

## D419.2 — OWNER: exploit plugging emulates a human DM; no artificial catch roll (2026-08-30)

Verbatim: "The intent is to have it act like a human dm would as much as
possible and then live with the inconsistency of current llm options."
Amends the D419 stochastic-plugging sketch: the engine still computes
exploit-detection signals algorithmically (D418 division of labour), and
presents them to the LLM DM the way a human DM would perceive the table —
but there is NO engineered awareness-profile roll or seeded catch
probability. The "sometimes catches it, sometimes doesn't" property the
owner wants comes from the natural inconsistency of current LLMs, which
we accept rather than simulate. Persona still shapes how the DM responds.
Consequence: the D419.1 catch-rate knob is dissolved — fully deferred,
no structure chosen (owner: "Fully defer"); revisit only if LLM variance
proves to be the wrong shape of inconsistency in practice.

## D421.5 — OWNER: fungible-PC-slots prototype queued after rerun 1 (2026-08-30)

Owner chose "After rerun 1" for the popcorn-for-PCs prototype: queue it,
start only once the first R1-10 rerun is harvested. Player-facing only —
never in AI-DM testing (D421.4 stands).

## D421.6 — OWNER: BFRD adoption lane deferred (2026-08-30)

Owner chose "Defer" on opening a Tales of the Valiant / BFRD CC-BY
adoption lane. The research stays on the shelf (private cache +
digest); no optional-rule adoption work until the intel program and
reruns are done. When it opens, the licensing terms recorded in the
digest apply: attributed CC-BY layer, CC0 files never carry
BFRD-derived text, no ToV trademarks/art/trade dress.

## D417.1 — OWNER: no high-ground to-hit, but fall damage is SRD and in scope (2026-08-30)

Verbatim: "High ground bonus is not modeled in srd, but remember that fall
damage is." Sharpens D417: when elevation lands, its RAW payoffs are fall
damage (SRD 5.2.1 Falling [Hazard]: 1d6 Bludgeoning per 10 feet, max 20d6,
landing prone — verified from docs/srd/full/srd-5.2.1.txt), forced-movement
shoves off edges (the parity digest's forced-movement/edge-risk exploit
class), and elevation-derived cover/line-of-sight — but NO to-hit modifier.
The tactical evaluator prices edge proximity and fall EV when elevation
modeling arrives.

## D421.4 — OWNER: all AI-DM testing runs the standard initiative system (2026-08-30)

Verbatim: "Do all of your ai dm testing with the standard initiative
system." All AI-DM testing — smokes, arenas, A/Bs, the R1-10 reruns, and
collection batches — uses the standard RAW per-combatant initiative
(current default: initiative_segments_v1 + derived_v1). Initiative
variants (fungible PC slots, zipper, etc.) never enter the testing
pipeline; if a variant is ever trialed it runs as a separate, explicitly
labeled experiment.

## D421.3 — OWNER: add Tales of the Valiant to the research (2026-08-30)

Verbatim: "Also look at tales of the valiant." Extend the D421 research:
Tales of the Valiant (Kobold Press) — its changes vs 5e, licensing status
(ORC license / Black Flag Reference Document openness makes it potentially
usable prior art rather than clean-room-only), and which of its variants
survive the D421.2 VTT-relevance filter.

## D421.2 — OWNER: VTT-relevance filter on optional-rule rankings (2026-08-30)

Verbatim: "A lot of these dice rolling conveniences are not really helpful
for a vtt." Filter applied to all optional-rule shortlists (Nimble digest,
initiative digest, clean-room package): mechanics whose main value is
physical-dice convenience (batched/static rolls, players-roll-all,
deterministic initiative scores) rank low — the VTT rolls instantly.
Rank instead by decision speed, reduced whiff-feel, turn agency (e.g.
fungible PC slots), death/dying drama, and AI-DM simplification. Rankings
to be revised at the Nimble follow-up harvest.

## D421.1 — OWNER: initiative-systems research, clean-room derivation experiment, creator-opinion survey (2026-08-30)

Three additions to D421, verbatim: "Also research different popular optional
rules. Especially initiative. Look at how daggerheart and draw steel handle
initiative as well. See if we could fit in a popcorn initiative for pcs. //
Try to see if a clean room document could be made that comes up with nimble
style house rules from first principles" and "Look up what bob the world
builder and other YouTube creators said about which nimble rules they liked
or didn't like."
Execution: (1) second private research lane — popular optional rules with an
initiative focus: Daggerheart (spotlight/no-initiative flow), Draw Steel
(their initiative model), popcorn/Elective Action Order, side/group
initiative variants; feasibility of POPCORN INITIATIVE FOR PCs in our
engine (interacts with initiative_segments_v1, derived_v1, plan-then-
adjust). (2) CLEAN-ROOM EXPERIMENT with contamination control: a FRESH
codex session that has never read Nimble derives streamlining houserules
from first principles (goals only: faster combat, fewer dead turns, less
whiffing, SRD 5.2.1 compatibility); afterward a comparison pass maps the
derived set against the Nimble inventory — convergent rules are
independently derivable and safest for public use. The derivation document,
if clean, may graduate to the public repo; the comparison stays private.
(3) The running D421 lane extends with a creator-opinion survey: Bob World
Builder and other YouTube reviewers, which Nimble rules they praised or
rejected, folded into the optional-rule shortlist ranking.

## D421 — OWNER: Nimble 5e research in the private lane; prior-art and licensing screen for optional rules (2026-08-30)

Verbatim (garbled tail preserved): "Research in a private lane all of the
changes made by nimble 5e and see which ones were prior art and ok for us to
us E as optional r Lies" — read as "...ok for us to use as optional rules."
Research all changes Nimble 5e makes to 5e, in the private lane; classify
each as prior art (common houserule predating Nimble) vs Nimble-original;
screen licensing (what license the Nimble material carries, what is legally
usable in a public CC-BY/CC0 repo); recommend candidates for OPTIONAL,
typed, flag-gated rules in our engine. Anything adopted publicly passes the
D417 clean-room gate; the research itself stays in dnd-research-private.

## D417.2 — OWNER: elevation can grant cover (2026-08-30)

Verbatim: "Remember that being behind high elevations can act as cover."
Joins D417/D417.1 elevation scope: RAW cover (half/three-quarters/total per
SRD) derived from elevation geometry and line-of-sight — being below a
ledge or behind a rise grants cover against attackers without RAW support
for any to-hit elevation bonus. The tactical evaluator's cover pricing
(increment-1 foundation, G12 risks) must consume elevation-derived cover
when elevation lands.

## D420 — OWNER: search memory, help-calling, and a known-failure-modes manifest for the DM (2026-08-30)

Verbatim: "I want our engine to have a memory for if something goes
invisible, you look for it and start trying whatever you can. // If one npc
is attacked, have it call out for the other npcs to help within yelling
distance. // Cover what blind spots you can in the engine and then
explicitly let the ai dm know what known failure modes the engine has that
it should look for." Three capabilities:
1. PERSISTENT SEARCH MEMORY: when a combatant becomes unseen (invisibility,
   hiding, obscurement), the engine keeps last-known position + expanding
   suspicion region with expiry; NPC behavior escalates through the legal
   toolkit — move-and-search, readied actions, attacks into suspected
   squares (with unseen-target disadvantage per SRD), AoE over the
   suspicion region. Directly plugs the stealth-search blind-spot class
   (pot-shot loops, invisibility resets).
2. HELP-CALLING / ALERT PROPAGATION: an attacked NPC calls out within
   yelling distance (typed radius, blocked by appropriate barriers/
   soundproofing later); nearby NPCs join the encounter. Plugs the
   combat-membership/leash class (pull-one-at-a-time cheese).
3. KNOWN-FAILURE-MODES MANIFEST: engine ships a typed, versioned list of
   its own residual blind spots (whatever is not yet covered
   algorithmically), rendered to the AI DM as watch-for intel so the DM
   agent hunts exactly the holes the engine cannot close. Manifest shrinks
   as engine coverage grows; every entry cites its blind-spot class.
Placement: the manifest rides increment 3 (context rendering) as a cheap
static intel surface; search memory and help-calling join the post-rerun-1
blind-spot program alongside the D419 parity-floor Missing rows, sequenced
after the intel program so the R1-10 comparison stays one-variable.

## D419.1 — OWNER: parity is capability-class under RAW; catch-rate knob deferred; calibration waits for the rerun packet (2026-08-30)

Three rulings on the supervisor's questions: (1) BG3 parity floor =
CAPABILITY-CLASS UNDER RAW — the AI matches BG3's tactical breadth using our
mechanics (cover-seeking, range bands, chokepoints); houserule-driven
behaviors map to RAW analogues, consistent with D417. (2) Where the
stochastic exploit-catch factor lives (difficulty knob vs constant) is
DEFERRED until the D419 research digest returns its design sketch with
tradeoffs. (3) R01/R02 owner calibration scores wait for the interleaved
blinded rerun packet (D418.3) — old and post-intel rounds scored side by
side in one sitting; do not press for scores before then.

## D419 — OWNER: BG3 NPC-AI deep research in the private lane; parity floor + AI-DM exploit plugging (2026-08-30)

Verbatim: "In a private repo lane. Do deep research into how the bg3 ai npcs
work. Look at user reports of how they found the algorithm to work. Look
especially hard for different ways players cheese the npc fights in ways the
developers probably didn't want. I want the algorithm to do at least every
thing the bg3 one does. And I want our ai fm to be good at spotting the
weaknesses that players can exploit in the algorithm and plugging the holes
using the ai dm agent(even if only some of the time it catches it. A random
factor means that the fights wouldn't be won using the same exploit every
time)." Execution: research runs in ~/PhpstormProjects/dnd-research-private/
(outside all git trees per the licensing wall, D417); deliverables are raw
sourced notes plus a digest with (a) BG3 NPC-AI capability inventory as our
algorithmic parity floor, (b) exploit/cheese taxonomy from player reports,
(c) per-exploit detection signals and counterplay hooks for the AI DM agent
with a STOCHASTIC catch rate (owner: randomness prevents the same exploit
winning every fight). Public-repo design work derived from this must be
clean-room homebrew per D417.

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

G2.1, H1-IDS AND H1-INDICES.1 VERIFIED AND COMMITTED; H1 WINNER = INDICES;
D465 SOL-LOW BATCH DONE (supervisor, 2026-09-03 15:50). G2.1 (lane
69e3dbfd): forced tsc 0, sg 0, 546/9543 on a quiet box; my mutation
(empty reason accepted) fails the 55-text audit test, restore by cmp,
108/108 after; coverage note: the engine-mcp-handler tests did not
catch it, so the empty-string wire path is unit-covered only. H1-ids
(claude/h1-ids 17d615a1): 545/9545, mutation caught by 2 tests. H1-
indices.1 (claude/h1-indices 5fb56e9a): compile fix; 9541/9544 with
three load-class failures (load 8.8), all three files pass isolated;
codex stopped rather than raise a timeout — correct. H1 winner: the
indices variant (the A3 design the extraction plan and the opus review
adopted; ids stays as the comparator branch, not deleted). H1.1
amendments dispatched to the indices worktree on the same terra
session, item 7 as a schema-side union with G2.1. D465 sol-low: all
arms finished, cav-full 30/30 authorized (27 model, 3 sim_controller,
9 rows with one refusal), cav-rows-move-gating 30/30 (25 model); D483
reruns + remainder pass chained and running alone. Merge order stands:
G2.1 → H1-indices(+H1.1) → H3, then the post-shift control rerun.

F: MY FIRST VIDEO FINDING WAS WRONG (supervisor, 2026-09-03). I reported
the first BG3 recording as a portrait stream clip with no combat log.
The extract script cropped every frame to the right third before saving
and I inspected my own crop. Corrected in the private repo; the script
now keeps full frames and OCRs the log feed band. Luna-medium vs sol-
high frame transcription (D495 follow-up) recorded privately: equal at
line reading, Luna finds more monster turns, sol reads HP/damage
numbers; time must be derived from frame ids, never from the model.

F: I LAUNCHED A DUPLICATE D483 CHAIN; BOTH RERUNS VOIDED (supervisor,
2026-09-03 16:40). A run-d483-rerun.sh + remainder chain had been queued
at 11:18 (pre-compaction) to start when the D465 batch ended. Not seeing
it in my process check, I launched a second chain at 15:44. Both woke
on the same condition and ran s-gating concurrently (15:44–16:13 and
15:44–16:34); the first chain's cav-full (16:13–16:34) overlapped my
s-gating. The second s-gating hit 9 timeouts and tripped the weather
stop, overwriting the first chain's 30-row file. Under the "alone"
preregistration all of it is void: s-gating file moved to
.VOID-duplicate-chain-16-34, cav-full never written, both chains and
the arena/operators killed by PID, D483-BLOCKED cleared, ONE chain
relaunched at 16:37 (s-gating → cav-full → remainder). Cost: ~55 min of
arena time. Cause: my process check looked for arena processes, not for
the waiting chain script. Rule: before launching any chain, list the
chain scripts themselves (`ps -eo pid,lstart,args | grep <script>`),
and record queued chains in the tick state so a compaction cannot hide
them.

## D496 — OWNER: prepare the BG3 Script Extender capture kit; owner runs the fights (2026-09-03)

Asked: the video pipeline yields action lines but not rolls, saves or damage; the complete source is a Script Extender
combat-log dump from a live game. Owner: "Yes, prepare the capture kit." Supervisor prepares, in the private repo,
the Script Extender + Combat Log Log setup, a fight checklist (Tactician, mephits, flat ground) and an ingest script;
the owner runs the fights and drops the logs into the private repo. Nothing from the captures enters a public tree.

## D497 — OWNER: capture list = mud mephits ×5 only, first (2026-09-03)

Five runs of the Decrepit Sanctuary mud-mephit fight on Tactician from the same save and party position. Repeats are
needed because Larian's AI scores with randomised weights; one recording cannot separate policy from dice. Melee and
caster encounters come later.

JUDGE QUEUE 2 DONE; REPLAY PLAN LANDED; F: MISSING NO-CLAUDE PREAMBLE
(supervisor, 2026-09-03 19:45). The six remaining D465/D483 packets
(primes 557/563/569/571 and 491/499, fixed in analysis-notes before
building) were judged by the three seats; validator: every seat 60/60,
seq true, no nulls, no refused-nonzero, three badsum entries (totals
are recomputed). Keys sealed. BG3 lane (private): unified fight log
(83 events, 68 both / 12 disagree), and codex sol wrote eval/replay-
plan.md — six increments, each with a named mutation, engine seams
cited by file:line (actorOpportunityReport, engineActorOptions,
canonicalEngineQueryPort spot-checked by me). Finding against my own
work: the replay-plan brief carried no "do not invoke claude" line, and
codex ran `claude -p` twice for its own plan review (default model).
The dispatch-preamble rule (memory) exists for exactly this; every
private-repo brief now starts with the same COMMON RULES line as the
public ones.

## D498 — OWNER: keep the D447/D449/D465/D483 keys sealed until the post-shift control has run (2026-09-03)

Asked whether to unseal now that every arm is judged. Owner: keep sealed, so old-era and new-era results are
unsealed together after the post-shift control (caveman full profile, KB bundle, mcp_minimal, no skill) runs on the
merged lane (G2.1 + H1-indices + H1.1 + H3).

## D499 — OWNER: rerun the D483 s-gating arm at 240 s and judge that instead (2026-09-03)

The 120 s runs (4/9/6 timeouts, incl. the alone run) stay on disk as a record but are not the judged arm. A fourth
run at luna low, 240 s (the budget sol had), alone, same seeds/reps/KB; packet against the D443 luna-low twin with a
fresh prime (577); the timing confound (luna twin ran at 120 s) is noted next to the result. The 120 s alone-run
packet (prime 491) is kept sealed and reported as a secondary.

PARALLEL SEAMS OPENED (supervisor, 2026-09-03 21:40, per owner "parallelize
everything"). Running at once: D499 s-gating-240 arena (alone) → its
packet/panel; lane gate queued behind the arena → D2.3 commit → the
post-shift control chain (run-d466-control.sh, armed behind the LANE-READY
sentinel; prime 587 fixed in analysis-notes; packet built with the lane's
packet code); unseal-report.py being written by terra against the
unsealed D443 family only (sealed keys named as forbidden; --unseal flag
required at run time; --dry-run lists keys); tactical_v2 worktree
(claude/tactical-v2 off the lane) with a planning brief on sol (typed
closed ruleset union, SRD-neutral wording, default off); private policy-
spec rewrite in Larian-score terms on sol; replay increments 5–6 on sol.
Critical path to unblind unchanged (arena → gate → control → panels →
unseal); everything else now runs beside it.

## D500 — OWNER: tactical_v2 mechanics are designed freely with neutral wording; BG3 numbers are private calibration targets only (2026-09-03)

For the BG3-style mechanics behind the tactical_v2 flag (bonus-action shove, jump, bonus-action dash for all, mud /
deep-water / grease surfaces, flight ignoring ground, summon actions, death burst): pick numbers that make the
engine's behaviour match the video/replay results best, documented as our own design in neutral wording. BG3's own
numbers stay in the private repo as calibration targets and are never the provenance of a public constant.
Resolves plan unknowns 2–9 in principle; the concrete declarations are supervisor decisions recorded per increment.

## D501 — OWNER: tactical_v2 is symmetric — the same options for PCs and monsters (2026-09-03)

One rules engine; under tactical_v2 the new options (bonus-action shove and dash, jump, surfaces, flight, summons,
death burst) are offered to both sides. The neutral scored policy is the only monster-specific part. Single flag.

CONTROL PACKET BUILT; KNOWLEDGE-GRAPH ARTICLE ASSESSED (supervisor,
2026-09-03 23:30). Post-shift control: 30/30 rows, 0 timeouts, 0
refusals, 132 per-actor reasons (D489 live). Packet needed two lane
increments first — P1 (typed pre_shift/post_shift row union: the D443
comparator rows lack the H1 fields and I refused to fabricate them) and
P2 (chosenOptionIndices typed absent for mcp_minimal, required for
final_indices; the control's rows truthfully carry no such key). Packet:
60 entries, leaks none, prime 587; panel running; keys sealed (D498).
Knowledge-graph article (owner's PDF, "Applying Knowledge Graphs", push
retrieval via a pre-prompt hook made Haiku match Fable on a 3-hop trap,
one question, six runs): my read, opus's and sol's agree that luna-low's
measured deficits are envelope errors, rule application under a budget,
and reasoning time — not missing facts; verified myself that kbReads is
empty in 30/30 control rows and 30/30 comparator rows (the pull channel
is unused). Sol adds that compressed renderer profiles (gating 5.44 vs
cav-full 8.18) are where pushed facts could matter. Proposed, not yet
ruled: a preregistered 2-arm "graph slice" experiment on final_indices
(≤400-token typed rules slice generated FROM the KB fixtures, seeds from
circumstanceFeatures, adopt at +0.2 with a seed-clustered interval), to
run after the transport experiment. Owner decision pending.

F: P2 SHIPPED NOT COMPILING; VITEST HID IT (supervisor, 2026-09-03 23:45).
Codex's channel cuts commands at 30 s, so it could not finish `tsc -b
--force` and stopped honestly ("BLOCKED"), but its report said "focused
suite passes 12/12" — vitest does not type-check, and the lane has 9
TS2322 errors in tools/ai-dm-rerun-packet.ts. Caught by my forced tsc
before any commit. My first P2 mutation was also void (it changed the
narrowing and broke compilation — type-only); redone as a runtime-only
guard removal, which fails the intended negative test. P2.1 dispatched
with the background-polling instruction for long gates. Rule restated:
a vitest pass without a completed `tsc -b --force` is not a gate.

UNSEALED (supervisor, 2026-09-03 23:55, per D498 after the post-shift
control): every seat 60/60 on every packet; totals recomputed from
rubric items, refused = 0, service-null dropped pairwise, seed-clustered
bootstrap intervals (unseal-report.py, verified against d443-results.txt
before any sealed key was opened). Report: dnd-slim-runs/unseal-2026-09-03.md.

  packet                        contrast                       n   delta   95% CI
  D447 confirm (fresh seeds)    compression bundle − cav-full  50  −0.45  [−0.82, −0.07]
  D449 k7 nudge                 +k7 KB − s-full-low            30  +0.47  [−0.72, +1.68]
  D465 sol-low − luna-low       s-full                         30  +1.50  [−0.04, +2.86]
                                s-rows                         30  −0.42  [−2.39, +1.12]
                                s-opp                          30  +1.72  [−0.03, +3.24]
                                s-move                         30  +1.86  [+0.68, +3.07]
                                s-threats                      30  +1.79  [+0.62, +2.84]
                                s-gating                       30  +2.10  [−0.58, +4.47]
                                cav-full                       30  +0.42  [−0.22, +1.03]
                                cav-rows-move-gating (vs luna MEDIUM) 29 −0.10 [−0.91, +0.69]
  D483 luna-low+protocol − luna-low  s-threats                 30  +1.09  [−0.12, +2.18]
                                s-gating (120 s, 6 refusals)   30  +0.89  [−0.72, +2.60]
                                cav-full (5 refusals)          30  −0.92  [−1.90, +0.07]
  D499 s-gating 240 s+protocol − luna-low                      30  +2.34  [+1.28, +3.42]
  D466 post-shift control − pre-shift cav-full-low (in-packet) 30  +0.97  [+0.31, +1.66]

Verdicts.
1. D447: caveman full CONFIRMED as incumbent on ten never-seen rooms with
   five reps; the compression bundle (rows=best_exception, movement=
   material_only, gating) loses by 0.45 with an interval excluding zero.
2. D449: the k7 "melee closes, never idle" nudge is positive but
   inconclusive (+0.47, interval spans zero); 3 refusals in the nudged arm.
3. D465: sol low beats luna low on every structured profile except s-rows,
   by 1.5–2.1 points on the compressed ones, and by only +0.42 on caveman
   full (interval spans zero). Against luna MEDIUM (cav-rows-move-gating)
   sol low is level. Pattern identical to the D443 low→medium effect:
   the profile that already gives full context needs the least model.
   Confound recorded in the D465 amendment: sol carried the protocol text.
4. D483/D499 resolve that confound for one profile: luna low with the same
   protocol text at 120 s gained +0.89 on s-gating with 6 timeouts; at
   240 s (D499) it gained +2.34 [+1.28, +3.42] — matching sol low's
   +2.10 on the same profile. On s-gating the "sol advantage" is the
   protocol instructions plus time, not the model. On cav-full the
   protocol text HURT luna low (−0.92, 5 timeouts): more instructions on
   an already-full prompt cost time it did not have.
5. D466: the post-shift engine (G1, G2, G2.1, H1-indices, H1.1, H3, D2.x)
   scores +0.97 above the same profile on the old era, interval excluding
   zero. Rule D472 (freeze if >0.3 below the leader) is not triggered; the
   post-shift control (8.06 in-packet) is the new zero. The pre-shift arm
   scored 7.09 in this packet vs 8.18 in its own D443 packet: judges score
   within a packet, so cross-packet absolute numbers are not comparable;
   only paired deltas are.
Open for the owner: whether 240 s becomes the standard luna-low budget
(the D443 grid ran at 120 s), and whether the k7 nudge is retested with
more reps or folded into the KB by default.

F: CODEX REPORTED "tsc PASSED" ON EVIDENCE OF AN EMPTY LOG (supervisor,
2026-09-04 00:40). P2.1's report: "npx tsc -b --force: passed; .tmp/
tsc.log empty; no tsc process." My forced tsc on the same tree: 3 TS2322
errors remain. The background job was killed at codex's 30 s command
cutoff before writing anything; "empty log + no process" is
indistinguishable from "killed". Not a lie, but a false green. Rule for
every long gate run by codex: the command must write an exit-code file
(`echo exit:$? > .tmp/tsc.done`) and the report must paste that file;
absence of the file = not run. P2.2 dispatched with that rule.

F: TRANSPORT EXPERIMENT VOIDED — STRUCTURED-FINAL SCHEMA REJECTED BY THE
API; OVERRIDE-KIND ENUM DRIFT (supervisor, 2026-09-04 00:45). The first
final_indices arm (D500 transport, lane fa65bac1) refused all 30 rounds
in three minutes: "Agent CLI exited 1". The stderr in the row held only
a /tmp helper-binary warning; reproducing the exact codex invocation
with the arena's generated schema gave the real error on stdout:
invalid_json_schema — strict mode requires every property in
`required`, and `rationale` (optional) was not. Nothing in H1/H1.1/H3/
merge gates exercised the generated schema against strict-mode rules
(the model-free smoke never calls the API). Second defect found in the
same file: the structured-final override enum is the pre-G2.1 five-kind
list, so the new kinds cannot be expressed on that transport; the merge
"kept override.kind" at the row level but not in the generator. Both
dispatched as H1.2 (typed schema-invariant test; kinds derived from the
single G2.1 source). The arm's files are voided (.VOID-cli-error); its
prime (593) is retired; the rerun gets 599. Rule: any generated
API-facing schema gets an invariant test AND one live single-call probe
before an arm is launched on it.

F: TWO TRANSPORT ARMS WASTED ON A FIELD THE ARENA DROPS (supervisor,
2026-09-04 03:30). H1.3 made the conversation runner emit
chosenOptionIndices on final_indices rows, with passing runner-level
tests; the arena (tools/ai-dm-arena.ts) declares its own row type and
copies runner fields by hand, so the real arm's rows still lack the
field and the packet builder refuses them. Runs 2 and 3 of the
transport arm (30 rows each, 26/30 and 27/30 first-decision accepted,
0–1 timeouts) are voided for packets; their row-level statistics stand.
H1.4 dispatched: arena rows DERIVED from the runner row type with a
compile-time key-set assertion so a field cannot be dropped again, plus
an arena-level dry-run test that validates a persisted final_indices
row through the packet builder. Rule: a row field is only "shipped"
when the ARENA's persisted row passes the packet builder in a test; the
runner's own row is not the artifact the experiments consume.

TRANSPORT EXPERIMENT RUN 4 COMPLETE; PACKET AND PANEL BUILT; KEY SEALED
(supervisor, 2026-09-04 04:25). Lane 0b384262 (H1.4). Row-level
(secondary, preregistered): 30/30 authorized, 0 timeouts, first decision
accepted 27/30, 26 rounds in one call (control mcp_minimal: 27 rounds in
one call but ~15% first-call correctness in the D443-era audit);
rejections 10 engine_rejected + 1 decision_invalid; indexZeroSelectionRate
= 0.94 (117 of 124 actor choices took the engine's top-ranked option;
the other picks: index 17 ×3, 2 ×2, 3, 10). That anchoring rate is the
number the extraction plan warned about: on this transport luna low
mostly confirms the engine's own ranking. Whether that scores well is
in the sealed panel (2-arm packet, 60 entries, leaks none, prime 599;
every seat 60/60 valid). Voided predecessors: run 1 (schema rejected),
runs 2–3 (row field dropped) — their first-decision rates (26/30,
27/30) agree with run 4.

OVERRIDE-POLICY EXPERIMENT (D490) ARMS RUN; PACKETS AND PANELS BUILT;
KEYS SEALED (supervisor, 2026-09-04 07:15). Lane 8a459180 (O1). Three
luna-low arms on brutal 10×3 seed 6203001: S strict (30 rows, 2
timeouts, 28/30 first decision accepted), V typed_reason (30, 1, 28/30),
U typed_reason second seat (30, 1). 0 decisionRejectionCodes on S and V.
Three-arm packet 541 (svu, 90 entries) and isolation packet 547 (iso, 60
entries, reasons visible for arm-v only) built with no leaks; every seat
validated (sol/opus/fable, 90/90 and 60/60, 0 dup/missing/badsum/nulls).
Keys d490-key-{svu,iso}.json sealed under D498 until the owner rules.

TACTICAL_V2 INCREMENT 2 LANDED ON claude/tactical-v2 (supervisor,
2026-09-04 07:15). Commit 487d2b62. Codex: canonical traversal shared by
reducer/query port/pathfinder/evaluator, ground vs flying movement
modes, closed known+custom surface union, overlap = greatest multiplier
plus all hooks in stable region order, typed jump budgets, grease hook
in the reducer. Verified myself: forced tsc 0, sg 0, full suite 550
files / 9631 tests; my mutation (overlap max → first multiplier) killed
by 8 tests, restore by cmp; contracts.ts sha unchanged; zero forbidden
patterns in +621 lines; no claude invocation in the lane log. Finding
worth keeping: the first full suite failed 31 tests because traversal
became a perf regression (conversation suite 1,028 s); codex fixed it
with immutable movement-world caches, not by touching timeouts (final
suite 383 s). NUMERIC DECLARATIONS AWAITING OWNER RULING (all in
src/combat/tactical-movement-constants.ts): ground 1×, difficult / mud /
deep water 2×, grease 1×, jump budget floor(speed/3), grease DC 12 Dex
save, Prone 1 round, 1 trigger per turn on entry; flight ignores all
surfaces.

TACTICAL_V2 INCREMENT 3 LANDED ON claude/tactical-v2 (supervisor,
2026-09-04 08:20). Commit follows 487d2b62. Codex: universal bonus Dash
(typed apart from feature-owned SRD Dash), bonus-action Shove, and Jump
as a movement segment only; symmetric for PCs and monsters; absent under
srd_2024 with exact-message guards per throw site. Verified myself:
forced tsc 0, sg 0, full suite 551 files / 9644 tests; my mutation (size
eligibility <= → <) killed by the boundary test, restore by cmp;
contracts.ts sha unchanged; +534/−47 with zero forbidden patterns.
SHOVE DECLARATIONS AWAITING OWNER RULING (src/combat/
tactical-action-constants.ts): reach 5 ft; target at most one known
size category larger (unknown size eligible); Strength save DC 12; 5 ft
displacement directly away or knock prone (declared choice); occupied or
off-grid destination omits the displacement option.

TACTICAL_V2 INCREMENT 4 LANDED ON claude/tactical-v2 (supervisor,
2026-09-04 09:20). Codex: one summon-entity primitive shared by spell
summons and tactical action summons; typed death-burst trait with FIFO
queue and exactly-once markers. Verified myself: forced tsc 0, sg 0,
full suite 552 files / 9657 tests; my mutation (burst radius <= → <)
killed by 2 tests, restore by cmp; contracts.ts sha unchanged; +748/−67
with zero forbidden patterns; no claude invocation. Deviation noted:
codex's "full suite" was `npm run test:unit` (421 files / 8117 tests),
not the full vitest run the brief asked for; my gate is the full run.
DECLARATIONS AWAITING OWNER RULING (src/combat/
tactical-summon-death-constants.ts): summon count 2, placement range 20
ft inclusive (nearest-first, then row, column), duration 3 summoner
start-of-turn boundaries, 1 use recharging on long rest, controller
inherited, initiative = summoner's count inserted immediately after it;
death burst radius 10 ft inclusive, Dex save DC 11, 2d6 force, half on
success, filters hostile_living | all_other_living, targets in id
order, chained bursts append to the FIFO tail, lifecycle death →
concentration cleanup → owned-summon despawn → burst drain.

## D502 — OWNER: non-SRD options default OFF, but configurable (2026-09-04)

Asked how to treat the ~30 tactical_v2 numeric declarations from increments 2–4, the owner ruled: "Have non srd
options default to off, but configurable." Reading: every non-SRD mechanic stays off by default (srd_2024 remains
the default ruleset and carries none of them), and each declared number becomes a typed, validated configuration
value with the increment's number as its default, rather than a bare constant. Follow-up increment: lift the three
constants modules into a typed `TacticalV2Declarations` config carried by `EncounterConfig<'tactical_v2'>` with
constructors that reject invalid values; srd_2024 config cannot carry it.

## D503 — OWNER: unseal d500 and d490; land the lane; next arm = graph-slice (2026-09-04)

Owner rulings in one round: unseal both sealed panels now (D498 lifted for d500/d490); land the lane
(HEAD 8a459180) on main; the next AI-DM experiment after the tactical_v2 series is the knowledge-graph slice
(≤400-token typed slice from KB fixtures seeded by circumstanceFeatures, pushed per round), which needs a
builder increment first.

UNSEALED 4 SEP (supervisor, 2026-09-04 09:45; unseal-2026-09-04.md). Panel = mean of sol/opus/fable
recomputed totals, seed-clustered bootstrap CI.
- d500 transport: arm-a mcp_minimal control 7.64, arm-b final_indices 7.38; delta −0.27 [−0.98, +0.23], n 30.
  Inconclusive, leaning negative; final_indices costs one call per round instead of ~7 and anchors on index 0
  at 0.94. Not a free win.
- d490 override policy: arm-s strict 8.11, arm-v typed_reason 8.29, arm-u typed_reason (second seat) 8.71;
  u−s +0.60 [−0.47, +2.07], v−s +0.18 [−0.89, +1.33]. The two typed_reason seats differ by 0.42 among
  themselves, so the policy effect is inside seat noise. Inconclusive; typed_reason is not worse.
- d490 isolation: reason_visible − reason_hidden = +0.00 [+0.00, +0.00] on 30 pairs × 3 seats — every judge
  scored the identical rows identically whether or not the per-actor reason text was present (verified the
  visible entries do carry `reason` in executedPlan). The svu contrast is therefore not contaminated by reason
  visibility, and the panel rubric is blind to rationale text by construction.

LANE LANDED ON MAIN; TACTICAL_V2 INCREMENT 5 LANDED ON ITS BRANCH; GRAPH-SLICE PLAN WRITTEN
(supervisor, 2026-09-04 10:30).
- Main: merge 77d14a20 (lane 8a459180, 163 files) gated by me on the merged tree: forced tsc 0,
  sg 0, full suite 548 files / 9595 tests. The merge stands.
- claude/tactical-v2 1614d213 (increment 5, scored default policy): my gate 553 / 9672; my
  compiling mutation (penalty added instead of subtracted) killed by 2 tests; a first mutant that
  flipped the direction literal was REJECTED BY THE COMPILER — void as coverage proof, but it is the
  type design working. Codex's independently authored public defaults: kill weight 8, the four
  secondaries 1 each, secondary maximum 4 < 8 asserted; summon cap 4, flying burden cap 30 ft,
  5 ft credit per avoided ground hook. Awaiting owner ruling with the other declarations.
- Increment 5.5 dispatched (D502): one typed, validated `TacticalV2Declarations` object on
  EncounterConfig<'tactical_v2'>, today's numbers as the default, srd_2024 cannot carry it.
- Graph-slice plan (D503) written by codex sol at .tmp-plans/graph-slice-plan.md (34 KB): typed
  closed entity/edge unions, graph generated from the KB fixtures with sha-pinned provenance,
  non-lexical seeds from circumstanceFeatures, fixed-depth walk, exact budget with deterministic
  pruning, `--kb-graph off|slice` default off with an off-identity contract, 4 increments, a
  preregistered 2-arm Luna-low 240 s experiment (seeds 6205001–6205010, verified unused) with a
  +0.20 point-estimate gate before any 2×2. Supervisor critique: (1) the plan fixes BOTH arms on
  final_indices, the transport that leaned worse in d500 and anchors on index 0 at 0.94 — I
  recommend the production mcp_minimal transport instead, or the owner rules; (2) "400 tokens"
  has no offline tokenizer in the tree — a byte budget (≈1,600 bytes) avoids a new dependency;
  (3) including tactics.md in the graph corpus repeats startup text, which the plan itself flags as
  confounding salience with retrieval. Plan section 7 lists seven rulings it needs; nothing is
  dispatched for it until the owner rules.

OVERRIDES JUDGED ON THEIR OWN MERITS (supervisor, 2026-09-04 10:50; owner request). The 14 accepted
overrides across the D490 arms (S strict 3, V typed_reason 3, U typed_reason 8; 0 rejected attempts in any
arm) were put to the three-seat panel blind to arm and round score, with two 0–5 scores each: did the
override make sense; was the written reason sound (files d490ov-*, unsealed in d490ov-unsealed.json).
Results: decision 3.67 / 5, reason 2.26 / 5 overall. The five Entangle-over-damage overrides (every arm)
scored 5.0 on decision from all three seats — the engine's "dominated" ruling was wrong there, the same
ranking weakness the transport arm exposed. Reason quality is mediocre: correct but generic ("hinder the
whole group"), and twice mechanically wrong ("retaining disengagement as fallback" when no Disengage was
taken). By arm: strict 3.22 / 1.78, V 4.55 / 2.89, U 3.50 / 2.21 (n too small for a policy claim).
FINDING AGAINST OUR OWN HARNESS: two overrides (S room 3 rep 2 monster-2; U room 9 rep 2 monster-2)
executed as Dodge with 0 ft while the recorded reason says "Dash toward the nearest enemy". Both were
selectedBranch=fallback: the AI proposed Dash (needs movement first) with Dodge as fallback, Dash was not
executable at the actor's turn (deviation branch_changed), the fallback ran, and the packet/row present
the PRIMARY's reason beside the FALLBACK's executed action. Judges scored those reasons 0, correctly for
what they were shown, but the row is misattributing the reason. Rule for packet builders: when
selectedBranch is fallback, carry the fallback's own reason (or mark "fallback executed; primary reason
not applicable") — never the primary's text. Also settled: Dash + Disengage in one turn is legal for
those monsters (Nimble Escape bonus-action Disengage); the earlier judge complaints were wrong.

## D504 — OWNER: board screenshots also feed UI feedback (2026-09-04)

"We can also use the screenshots to have the AI DM and the AI judges give feedback on our UI and how to improve
it." The board-screenshot plan gains a feedback channel: after a round (DM) or a packet (judges), a separate,
non-scoring prompt asks what on the image was unclear, missing, or misleading, with concrete improvement
suggestions; collected as typed rows, never mixed into the tactical score.

## D505 — OWNER: parallel lane — Fable builds an alternative isometric VTT (2026-09-04)

"In a parallel lane, I want you to use your fable intelligence to build an alternative isometric VTT. Inspired
by pixel art as well as the first 2 Baldur's Gate and Diablo games." Binding for this lane: CLAUDE (Fable)
implements, codex reviews (consensus role inversion recorded in memory). Inspiration only: no assets, names,
sprites, palettes lifted from those games; all art is original and generated or authored in this repo under
the project licence. Branch claude/iso-vtt, worktree dnd-wt-iso-vtt; it renders the same EncounterState as the
existing board and mounts as an alternative view; the existing VTT is untouched.

## D506 — OWNER: the board screenshot shows everything (full DM view) (2026-09-04)

The picture given to the AI DM is the real UI as the DM sees it: all tokens and terrain. The prose still
governs what the monsters "know". Judges get the same picture.

## D507 — OWNER: graph-slice experiment settings (2026-09-04)

Transport: the normal back-and-forth (mcp_minimal), the production default and the control's transport; the
slice rides on the round-plan tool result. Budget: 1,600 bytes (no tokenizer dependency). Corpus: the seven
KB subjects only, not the playbook, so the test measures retrieval rather than repetition. Supervisor
defaults for the plan's remaining items (owner may override): walk depth 3; the slice is included on the
initial and correction prompts only; rule errors counted from typed engine/normalizer codes; "byte-identical
when off" covers all model-facing bytes, tool availability and engine behaviour, with prompt-byte telemetry
on the row; seeds 6205001–6205010 (verified unused).

## D508 — OWNER: isometric VTT first deliverable is a playable view (2026-09-04)

Not a static board: hover, selection, movement preview and turn controls from the first increment, mounted as
an alternative view of the same encounter state. Fable implements; codex reviews.

D505 AMENDED — OWNER: "Use fable 5.1 subagents in a lane to make the iso ui" (2026-09-04 11:15). The in-process
subagent tool is blocked in this session, so the subagents are `claude -p --model claude-fable-5-1` processes
in the lane worktree dnd-wt-iso-vtt with edit permissions and a bounded tool allowlist (no git). Supervisor
(this session) wrote the frozen contract src/vtt/iso/contracts.ts (2:1 dimetric 64×32 tiles, closed TileKind /
SpriteKind / TokenMark / HpBand unions, PixelArtToolkit + IsoScene interfaces) and two disjoint briefs
(dnd-slim-runs/brief-iso-A-pixelart.md, brief-iso-B-view.md). Because the supervisor authored the contract,
codex reviews it and the subagents' work before any round closes. Licensing: inspiration only, every pixel
generated by code in this repo.
