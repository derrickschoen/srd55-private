# D320 DM-speed experiment program

Date: 2026-08-20  
Status: pre-registered program design; no result is implied by this document

## 1. Program goals

D320's owner directives, reproduced verbatim:

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

D320's binding reconciliation is also part of the program: JS is only a
surface language. It runs in a deterministic sandbox with no ambient authority;
its complete API is the typed action/query surface; every emitted action still
passes through reducer validation; execution is step- and time-bounded; and the
replay records both program and trace.

The optimization target is **completed combat rounds per wall-clock hour**.
Faster calls that add calls, abort tables, or worsen tactics do not count as a
speed improvement.

## 2. Shared method and pre-registration

Before any arm runs, freeze a machine-readable manifest containing the
hypothesis, arms, fixtures and holdouts, seed list, run order, model and effort,
prompt/component hashes, controller and initiative configuration, primary and
secondary metrics, noninferiority margins, timeouts, exclusions, and analysis
code digest. Its digest is stored on every table. A manifest cannot be changed
after its first outcome; a correction creates a new experiment version.

Every comparison uses paired, hash-derived encounter seeds and a yoked frozen
control: same fixture and party bytes, starting state, reducer, legal-action
enumeration, hardware class, and timeout. Arm order within each seed pair is
randomized, paired arms run adjacent without concurrency, and cache warmth is
balanced and recorded. A shared initial seed is not falsely described as an
identical later dice stream after policies diverge. Counterfactual quality
rollouts do use common random numbers.

Each nominal "two sessions" is two fresh, consecutive batches. A conclusion
must point the same direction in both batches and in the pooled result. If it
does not, the result is inconclusive; any added replication is separately
pre-registered and is outside the table budget below. Tables that abort remain
in the completion and abort denominators. Infrastructure failures are reported
separately and may be rerun only under the frozen rerun rule in the manifest.

Report arm medians and IQRs, paired deltas, and paired bootstrap 95% confidence
intervals, with matchup-stratum results beside the pooled result. Do not use a
p-value as a substitute for effect size. E11 and E12 have only ten tables per
arm and are explicitly directional; they cannot alone establish a rare-event
rate.

## 3. Shared harness and telemetry additions

The existing model, effort, build, commit, load tag, latency, token counts, and
correction-attempt fields remain. Bump the fleet/soak schema and add the fields
below once, rather than adding experiment-specific sidecars. Each call record
must link to its own transcript; never copy the last call's telemetry onto all
transcripts.

| Level | New required fields |
|---|---|
| Registration and pairing | `programVersion`, `experimentId`, `experimentVersion`, `preregistrationDigest`, `armId`, `batchId`, `pairId`, `replicate`, `tableIndex`, `seed`, `randomizedArmOrdinal`, `fixtureId`, `fixtureDigest`, `matchupFamily`, `enemyCountStratum`, `partySource`, `partyDigest`, `configurationManifestDigest` |
| Stack identity | `controllerSide` (`dm`/`pc`), `controllerMode`, `modelId`, `reasoningEffort`, `initiativeMode`, `initiativeOrder`, `promptVariant`, `schemaVariant`, `exampleCount`, `instructionVersion`, `skillSetVersion`, `planSurface`, `projectionMode`, `libraryVersion`, `correctionBudget`, `pricingVersion`, plus existing build/commit fields |
| Logical call and phase | `logicalCallId`, `parentCallId`, `transcriptId`, `requestId`, `phase` (`initial_plan`, `correction`, `reconsult`, `narration`, or `pc_plan`), `requestKind`, `attemptIndex`, `round`, `actorIds`, `livingMonsterIds`, `startedAt`, `finishedAt`, `firstTokenMs` when exposed |
| Time and cost | `processStartupMs`, `queueMs`, `exchangeMs`, `modelWaitMs`, `algorithmMs`, `validationMs`, `compileMs`, `executionMs`, existing end-to-end `latencyMs`, `estimatedCallCostUsd`, and table-level `totalWallMs`, `idleWaitMs`, and `estimatedTableCostUsd` |
| Prompt and context | For instructions, schema/grammar, examples, skills, library, projection, and history: version, digest, bytes, and estimated tokens; also `contractId`, `fullStateHash`, `transmittedViewHash`, `snapshotBytes`, `deltaBytes`, `historySentCount`, `historyOmittedCount`, `cacheAgeMs`, `cacheRatio`, `reconstructionMatched` and referenced combatant/resource IDs |
| Reply and validation | `outputBytes`, existing input/cached/output/reasoning tokens, `reasoningTokenShare`, `firstPassValid`, `validationResult`, `validatorErrorCategory`, `compileErrorCategory`, `failedSchemaPath`, `correctionAttempt`, `correctionBudget`, `correctionOfCallId`, `reconsultReason`, `invalidationEvent`, `abortCategory`, `abortReason` |
| Program size and execution | `sourceChars`, `sourceBytes`, `sourceTokenEstimate`, `sourceHash`, `astNodeCount`, `astHash`, `programDepth`, `branchCount`, `branchCoverage`, `compileValid`, `sandboxStepCount`, `sandboxTimeMs`, `boundViolation`, `ambientAuthorityViolation`, `chosenBranchTrace`, `emittedAction`, `emittedActionValid`, `legalActionSetHash`, `preStateHash`, `postStateHash`, `executionDry` |
| Batching and steering | `phaseBoundary`, `batchSize`, `callActivationFanout`, `planAgeRevisions`, `algorithmRankedActions`, `algorithmExpectedValues`, `triggerReason`, `stance`, `proposedOverride`, `overrideEditCount`, `overrideChars`, `overrideAccepted`, `fallbackUsed`, `activationsWithoutModel` |
| Stored patterns | `normalizedPatternHash`, `clusterFrequency`, `promotionEpoch`, `libraryFunction`, `libraryParameters`, `libraryHit`, `expansionHash`, `expandedTokenEstimate`, `expansionEquivalent`, `parameterError` |
| Table outcome | `status`, `completedRounds`, `resolutionRound`, `winner`, `dmCalls`, `pcCalls`, `callsPerRound`, `completedRoundsPerHour`, `correctionCount`, `correctionExhausted`, `reconsultCount`, `staleReferenceCount`, `dryProgramCount`, `damageBySide`, `hpCurveBySide`, `firstDownRound`, `firstDeathRound`, `resourceAvailableCount`, `resourceUseCount`, `wastedTurnCount`, `bridgeRestartCount`, `timeoutCount`, `gapCount`, `replayBundleDigest`, `replayProofPassed` |
| Quality block | `rolloutOracleVersion`, `rolloutHorizon`, `rolloutCount`, `rolloutSeedDigest`, candidate action/program hashes and utilities, selected and best utility, normalized tactical regret, target-oracle verdict and violation, sim-baseline version and expected damage, tactical-efficiency ratio, resource-discipline ratio, expected resolution band and fight-shape delta, narration sample IDs, blind assignment, rater model/effort/prompt hash, dimension scores, disagreement and adjudication status |

The harness must also preserve the source projection, generated source, parsed
or compiled form, expanded library form, chosen branch trace, emitted reducer
action, and replay proof. A summary without that chain cannot diagnose whether
a speed win came from less thinking, less context, a dry program, or a hidden
fallback.

## 4. Operational quality metrics

Correctness is a gate, not a quality score: accepted illegal actions, sandbox
authority/bound violations, state-reconstruction mismatches, and deterministic
replay failures are counted directly and may not be averaged away.

### Q1 — normalized rollout tactical regret (primary)

At every executed decision, freeze the pre-action state. Evaluate the chosen
action and every legal alternative with 256 simulator rollouts through the end
of the next enemy phase, using the same rollout seeds for every alternative and
the same frozen continuation policy. The fixture manifest pre-registers a
bounded utility over terminal result, normalized HP differential, and resource
state. Regret is `(best legal mean utility - chosen mean utility) / utility
range`, in `[0,1]`; lower is better. A round-program score is the mean over its
realized decisions. Report table mean, p90, and the paired arm delta.

### Q2 — tactical efficiency

`monster damage actually dealt / simulator-expected monster damage` for the
same matchup and number of elapsed rounds. The simulator version and expected
value are frozen before the arm runs. Report zero-baseline cases separately;
never divide them into the aggregate.

### Q3 — target sanity and target regret

For every attack, a deterministic oracle marks whether the target was living,
reachable, and either the lowest-effective-HP or highest-threat reachable
target. Effective HP is current HP adjusted by the frozen defense model;
highest threat is the greatest frozen one-round expected damage/control utility.
Target sanity is the passing fraction. Also record target regret when
the chosen target's rollout value trails the best reachable target by more than
10% of party maximum HP. Every violation retains the state/action trace for
review.

### Q4 — resource discipline and action non-waste

Record ability/recharge availability and use at each activation. An eligible
opportunity is one where the resource action is legal and its rollout value
exceeds the best resourceless action by the fixture's pre-registered threshold;
a useful use is a use in such an opportunity. Resource discipline is useful
uses divided by eligible opportunities. A wasted turn produces no damage,
control, useful positioning, defense, or declared resource conservation while
a legal action with positive rollout utility existed. Report raw counts as
well as ratios.

### Q5 — narration quality

Sample three narrations per table by a seed-fixed rule. A blinded rater scores
coherence, rules consistency, and brevity separately from 1 to 5. Arm, model,
prompt, timing, and token metadata are removed; samples receive random IDs.
Raters are **Codex-family models only**. Claude is not available as a rater.
The rater receives the source-locked rules evidence relevant to the sampled
trace, but no arm identity. Record rater model/effort and prompt hash. E10
additionally uses two independent blinded Codex-family raters on 25% of
tactical traces with the pre-registered 0–8 rubric for focus fire, adaptation,
self-preservation, and action non-waste; report both scores and disagreements,
not an opaque merged score.

### Q6 — fight shape and survival

Compare rounds to resolution with the frozen simulator expectation and band;
report deviation, not merely "pass/fail." Also report Kaplan–Meier curves for
first down, first monster death, and encounter completion, plus round-by-round
HP curves. This catches tactics or initiative modes that make the encounter
materially faster or slower for the wrong reason.

## 5. Experiments in execution order

The winning eligible arm feeds the next experiment unless that experiment
explicitly carries multiple Pareto winners. "Noninferior" below means the
upper 95% confidence bound on normalized Q1 loss is at most `0.02` unless a
stricter named gate applies.

### E01 — Schema payload size

**Type:** pure harness. **Depends on:** frozen run-002-style current stack.
**Feeds:** E02.

**Hypothesis:** removing duplicated contract data cuts input tokens and latency
without increasing invalid replies. **Arms:** (A) full schema/example repeated
inside each request; (B) schema/example sent once and thereafter addressed by
contract ID; (C) compact hand-written JSON grammar with the same validator.
Hold terra medium, one example, terse instructions, JSON AST, current
initiative behavior, production legal-action enumeration, four enemies, and
five rounds fixed.

**Measures/decision:** all speed and quality metrics, correction/reconsult rate,
and round-5 HP differential. Select the smallest arm that is noninferior and
adds no more than two correction percentage points. **Sample:** 24 seeds × two
fresh sessions × three arms = **144 tables**.

### E02 — Worked-example count

**Type:** pure harness. **Depends on:** E01 schema winner. **Feeds:** E03.

**Hypothesis:** one branch-rich example is as reliable and faster than several;
zero examples increases correction traffic. **Arms:** zero examples; one
branch-rich `priority`/`if` example; three examples spanning multi-monster
planning, dead-target fallback, movement, and save actions. Instructions and
encounters are example-independent.

**Measures/decision:** speed, all token classes, first-pass validity,
corrections, reconsults, Q1, and Q3. Retain the fewest examples that are
noninferior and achieve at least 99% first-pass validity. **Sample:** 24 seeds ×
two sessions × three arms = **144 tables**.

### E03 — Terse versus explanatory instructions

**Type:** pure harness. **Depends on:** E01/E02 prompt winners. **Feeds:** E04.

**Hypothesis:** terse contract text reduces latency and reasoning tokens without
hurting tactical interpretation. **Arms:** a two-sentence imperative; current
instructions; approximately 400 words explaining validation failures without
adding tactical advice. Schema, examples, state, AST, fixtures, and five-round
limit remain identical.

**Measures/decision:** speed, token classes, Q1, corrections, dry/reconsult
rate, and round-5 HP differential. Adopt terse text if noninferior and median
latency improves at least 10%; otherwise retain the shortest noninferior arm.
**Sample:** 24 seeds × two sessions × three arms = **144 tables**.

### E04 — State/context compression

**Type:** **new engine work first: delta projections** (the full and compact
arms are harnessable; the delta arm is not). **Depends on:** E01–E03 prompt
winner. **Feeds:** E05.

**Hypothesis:** projection/history size dominates input cost. **Arms:** full
projection/history; a compact lossless decision view; an initial full snapshot
followed by revision-addressed deltas. Every arm must reconstruct the identical
canonical state hash before model use. Use terra medium, JSON AST, full model
planning, and current initiative behavior.

**Measures/decision:** speed, tokens/cache ratio, Q1, corrections,
stale-reference/reconsult rates, bytes sent, and reconstruction failures. Choose
the smallest representation with zero reconstruction mismatches and quality
noninferiority. **Sample:** 30 seeds × two sessions × three arms = **180
tables**.

### E05 — Restricted JS turn-programs versus JSON AST

**Type:** **new engine work first: deterministic JS sandbox interpreter**.
**Depends on:** E04 context winner. **Feeds:** E06 and, if JS wins, E09/E12.

**Hypothesis:** code syntax reduces output/reasoning tokens, latency, and
correction traffic for a code-tuned model. **Arms:** current JSON AST; restricted
JS DSL. Both compile to the same `DecisionProgram`, expose only typed
action/query functions, forbid ambient APIs, share step/time bounds, and emit
actions through the same reducer validation.

**Measures/decision:** speed, tokens, Q1, corrections, first-pass compile rate,
execution dryness, sandbox violations, and paired semantic-trace agreement.
JS remains D320's required surface. It advances into the performance stack only
if quality is noninferior, sandbox violations are zero, first-pass compilation
is at least 99%, and output tokens or latency improve materially. If it misses a
gate, remediate and pre-register a new E05 version; JSON remains the control,
not the shipped architecture. **Sample:** 30 seeds × two sessions × two arms =
**120 tables**.

### E06 — Algorithm handles the basics: steering split

**Type:** **new engine work first: steering split**. **Depends on:** E05 surface
winner. **Feeds:** E07.

**Hypothesis:** deterministic baseline actions plus small model overrides
preserve tactics while reducing calls and output. **Arms:** full model round
planning; one call per round returning only target/stance/retreat/special-action
overrides over an algorithm proposal; trigger-only steering. Trigger-only calls
occur on round one, when the top two simulated actions differ by less than 5%,
when a combatant dies or is downed, when control state changes, or when a
pre-registered retreat threshold is crossed.

**Measures/decision:** speed, calls/round, tokens, Q1, override benefit
(`Q(overridden) - Q(baseline)`), HP/survival curves, algorithm compute time,
trigger reason, and fallback use. Select the least-consulting noninferior arm;
remove override types whose mean benefit is non-positive. **Sample:** 30 seeds ×
two sessions × three arms = **180 tables**.

### E07 — Initiative systems

**Type:** **new engine work first: shared-enemy initiative mode** (including
deterministic within-side order and side-phase scheduling). **Depends on:** E06
steering winner. **Feeds:** E08.

**Hypothesis:** shared enemy initiative reduces DM waits to roughly one per
enemy phase without tactical loss; side alternation may be equally fast but may
change fight shape. **Arms:** per-monster initiative with a request immediately
before each activation; the owner-ruled shared enemy initiative with one batched
program before the enemy block; side alternation with one request before the
enemy phase. Hold combatants, starting positions, and deterministic internal
monster order fixed; cross 2-, 4-, and 8-enemy fixture families.

**Measures/decision:** speed, calls/round, Q1, Q6, batch fan-out, plan age,
invalidation/reconsults caused by earlier turns, and idle/model-wait time. Shared
enemy initiative ships as ruled; the result chooses its batching/reconsult
policy and whether side alternation merits an optional fixture mode. **Sample:**
16 seeds × two sessions × three enemy counts × three arms = **288 tables**.

### E08 — Terra medium versus Luna medium

**Type:** pure harness after E04–E07 exist. **Depends on:** three
pre-registered E01–E07 configurations: best full planner, best steering split,
and best JS/shared-initiative stack. **Feeds:** E09.

**Hypothesis:** Luna is faster, while Terra may justify its latency on harder
steering configurations. Cross terra and luna at medium effort with each frozen
configuration on unseen fixtures. Run adjacent paired tables with randomized
model order and no concurrency.

**Measures/decision:** p50/p95 latency, token classes/cache ratio, calls/round,
rounds/hour, Q1–Q6, corrections/exhaustions, and aborts. Route each
configuration to the fastest model whose quality upper-loss bound is at most
0.02 and whose correction-exhaustion rate is below 1%. **Sample:** 30 unseen
seeds × two sessions × two models × three configurations = **360 tables**.

### E09 — Recurring-program mining and library promotion

**Type:** harness/library curation after the E05 interpreter; no new combat
semantics. **Depends on:** E08's winning model for the JS/shared-initiative
configuration. **Feeds:** E10.

**Hypothesis:** recurring JS shapes can become parameterized stored functions,
raising library use and reducing generated tokens without concealing tactical
errors. Run an evolving library against a yoked no-library control for five
epochs. After each epoch, normalize IDs/constants in successful JS ASTs and
promote at most five patterns that appeared in at least ten independent tables
and three matchup families. Every promotion needs expansion-equivalence,
sandbox, reducer, and replay tests before the next epoch.

**Measures/decision:** speed, tokens, Q1, correction rate, direct-call and
activation-coverage rates, parameter errors, and expanded-program semantic
equivalence. Permanently retain only functions with positive holdout usage,
lower tokens or latency, zero semantic divergence, and noninferior quality.
**Sample:** 20 new seeds × two sessions × two arms × five epochs = 400, plus
40 frozen-library holdout tables: **440 tables**.

### E10 — Pre-registered end-to-end confirmation

**Type:** pure harness confirmation after all selected engine work. **Depends
on:** frozen E01–E09 winner. **Feeds:** the DM-stack ship decision and the
winning stack supplied to E11/E12.

**Hypothesis:** the selected D320 stack materially exceeds the run-002-style
current stack—terra medium, duplicated full contract, JSON AST, full planning—
without reducing combat quality. **Arms:** frozen current stack; frozen winner
combining prompt/context, surface, steering, shared initiative, model, and
mined library. Hold eight rounds, four unseen matchup families, balanced
reference/external parties, 2/4/8-enemy strata, reducer, seeds, and hardware
schedule fixed.

**Measures:** every speed, correctness, and Q1–Q6 measure, plus the two-rater
tactical-coherence rubric on 25% of traces. **Sample:** 60 holdout seeds × two
sessions × two arms = **240 tables**.

**Ship criteria (all conjunctive):**

1. Completed rounds/hour improves by at least **25%**.
2. The paired 95% confidence interval excludes quality loss worse than **0.02
   normalized Q1 utility**.
3. Correction exhaustion remains below **1%** of logical calls.
4. There is **no deterministic replay failure and no sandbox failure**.

Failure of any criterion means do not ship the winner; retain the current stack
and use the recorded component results to form a new pre-registration.

### E11 — Correction-budget sizing

**Type:** pure harness/configuration. **Depends on:** frozen E10 winning stack.
**Feeds:** E12 and the production correction-budget default.

**Hypothesis:** one correction captures nearly all recoverable malformed plans;
a second adds latency with little abort reduction. **Arms:** zero, one, or two
allowed corrections. Use identical ordinary holdout tables and do not inject or
rewrite model errors. Measure abort/correction-exhaustion rate, recovery by
attempt, added latency/tokens, Q1 on completed tables, and completion-adjusted
rounds/hour.

Choose the smallest budget that retains E10's correction-exhaustion gate when
combined with E10 and continuing soak evidence; E11 alone is directional and
cannot prove a sub-1% rate. **Sample:** five seeds × two consecutive sessions ×
three arms = **30 tables** (10 per arm).

### E12 — PC-side agent controllers on the winning stack

**Type:** pure harness/controller wiring after E05; the existing filtered
PC-agent seam is used, with the winning JS interpreter/library rather than new
combat semantics. **Depends on:** E10 stack and E11 correction budget. **Feeds:**
the soak-fleet default PC-controller mix.

**Hypothesis:** PC agents using the winning turn-program stack provide a useful
all-AI fidelity soak without tactical or information-boundary regressions.
**Arms:** winning DM stack with deterministic `AlgorithmController` PCs;
winning DM stack with Codex-family PC agents using the winning JS/program,
prompt/context, library, and correction settings. PC agents receive only their
filtered projection and separate session/context; any DM-only information in a
PC request or reply is a hard failure.

Measure total and side-specific calls, latency/tokens, rounds/hour, Q1–Q6 for
both sides, corrections/reconsults, aborts, sandbox/replay results, and
projection-leak checks. Adopt agent PCs as a soak-fleet default only if the
information boundary, replay, and sandbox gates are perfect and quality is
directionally noninferior; otherwise keep them as an explicit fidelity arm.
**Sample:** five seeds × two consecutive sessions × two arms = **20 tables**
(10 per arm).

## 6. Cost and execution budget

"Table" means one live encounter execution under one arm. Offline 256-rollout
counterfactual evaluations and replay checks are additional local compute, not
additional model tables.

| Order | Experiment | Arms / construction | Tables |
|---:|---|---|---:|
| 1 | E01 schema payload | 24 seeds × 2 sessions × 3 arms | 144 |
| 2 | E02 worked examples | 24 × 2 × 3 | 144 |
| 3 | E03 instruction length | 24 × 2 × 3 | 144 |
| 4 | E04 context compression | 30 × 2 × 3 | 180 |
| 5 | E05 JS versus JSON | 30 × 2 × 2 | 120 |
| 6 | E06 steering split | 30 × 2 × 3 | 180 |
| 7 | E07 initiative | 16 × 2 × 3 enemy strata × 3 arms | 288 |
| 8 | E08 terra versus luna | 30 × 2 × 2 models × 3 configurations | 360 |
| 9 | E09 program library | 20 × 2 × 2 × 5 epochs, plus 40 holdouts | 440 |
| 10 | E10 confirmation | 60 × 2 × 2 | 240 |
| 11 | E11 correction budget | 5 × 2 × 3 | 30 |
| 12 | E12 PC controllers | 5 × 2 × 2 | 20 |
|  | **Planned total** |  | **2,290 tables (~2,300)** |

## 7. Engine-work boundary

The pure-harness experiments are E01–E03, E08, E10, and E11. E09 is curation
and harness work on top of the JS facility. E12 uses existing controller wiring
and the winning program facility.

Four experiments cannot begin until their named engine capability exists:

1. **E04:** revision-addressed delta projections with canonical reconstruction.
2. **E05:** deterministic, authority-free, bounded JS sandbox interpreter.
3. **E06:** algorithm proposal plus override/stance/trigger steering split.
4. **E07:** shared-enemy initiative and deterministic within-side phase order.

Those capabilities may be implemented in parallel, but their experiment runs
remain ordered so each consumes the preceding winner. The D320 shared-enemy
initiative intent is binding regardless of E07's comparison; E07 tunes its
batching/reconsult policy and measures the cost of the ruling.
