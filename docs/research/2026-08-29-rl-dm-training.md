# D409: RL training an open model for D&D 5e DM work

**Date:** 2026-08-29

**Status:** research recommendation, not an implementation plan

## Executive finding

This project has an unusually credible reinforcement-learning opportunity. Most agent projects must invent a reward
model for whether a tool call was good. This project already has an authoritative engine that either authorizes or
refuses an intent against hidden, deterministic state. That authorization decision is a genuine verifiable reward,
not a model opinion. The arena can generate unlimited seeded rooms, while `authorizedPlan`, `chainEvidence`, and
rejection reasons expose where an attempt went wrong. The existing rollout utility and three-judge pipeline supply
later tactical and subjective rewards without weakening the hard legality boundary. The recommendation is therefore
to train in layers. First teach one-round protocol compliance and authorization. Then add tactical regret from
deterministic simulation. Only after both are stable should the project optimize judge preferences or narration. The
smallest real experiment is a Qwen3.5-9B LoRA/QLoRA checkpoint, warmed with roughly 1,500–3,000 clean authorized
rounds, followed by GRPO on 512–1,000 unseen one-round states with four sampled attempts per state. The reward must
be calculated out of band by the authoritative host. The model must never be able to echo an authorization token,
score, proof, or claimed outcome into the reward path. A first cloud run is plausibly a low-hundreds-of-dollars
experiment, not a major training program, although rollout length and failed runs can move the total by an order of
magnitude. The honest counter-case is strong. For modest traffic, frontier API models plus plays, KBs, correction,
and a deterministic controller may remain cheaper, safer, and better than owning a checkpoint and its
serving/training infrastructure. Training is justified if the project needs privacy, offline play, high sustained
volume, reproducibility, or a domain policy that general models do not acquire. It is not justified merely because
training is technically possible.

## 1. Scope and evidence standard

This report concerns an open-weight policy for monster-turn tactics first and DM narration eventually. It does not
propose letting a model become authoritative for rules or state. The model remains a proposer inside the boundary
defined by the [engine MCP design](../design/2026-08-27-engine-mcp-server-design.md). The report treats “RL”
broadly enough to compare online verifiable-reward RL, offline preference optimization, and AI-feedback preference
learning. It distinguishes project-reported benchmark results from independently established facts. Software versions
and model availability were checked on 2026-08-29. Framework APIs in this area are changing quickly, so an
implementation must pin an exact package version and commit rather than following `main` silently. Dollar figures are
planning estimates, not vendor quotations. Current spot and on-demand prices can change faster than this document. No
D&D rules proposition in this report is supplied from memory. The proposal uses only the engine’s decisions and
this repository’s existing rule-authoritative interfaces.

## 2. Assets this project already has

### 2.1 A real verifier

The engine MCP design exposes a short proposer loop:

1. `engine.get_turn_context` returns a bounded state projection.
2. `engine.submit_round_intents` submits a complete shared-initiative proposal.
3. `engine.validate_intent` is available as an optional preflight.

The model chooses semantic intent. It does not choose coordinates, paths, bonuses, DCs, dice results, or reducer
commands. That separation matters for RL because it prevents the policy from learning to fabricate mechanical outputs
that the verifier would otherwise have to parse. The host binds a proposal to authoritative state and fails stale
state closed. It can attribute a rejection to a primary, fallback, or correction branch. The host can also
distinguish authorization, refusal, adjudication, and deterministic auto-resolution. Those are much stronger labels
than “a judge thought this sounded legal.” They can be regenerated from a seed and an engine version. They
therefore meet the central requirement of reinforcement learning with verifiable rewards: the reward follows from
computation outside the policy.

### 2.2 A scalable environment

The arena in [`tools/ai-dm-arena.ts`](../../tools/ai-dm-arena.ts) already records seed, basis, arm, room, round,
model, KB and snippet hashes, outcome, latency, tokens, retries, tool calls, and escalation. It also records
`authorizedPlan`, `roundNarrative`, and `chainEvidence`. `authorizedPlan` contains the accepted actor, intent,
selected branch, action, target, and movement. `chainEvidence` retains failed primary, fallback, and correction
attempts, declared intent, rejection reasons, correction text, and auto-resolve evidence. This is almost the
trajectory schema an RL system needs. The arena’s deterministic generator can create unlimited seeded rooms rather
than replaying a tiny hand-written benchmark. The existing standard and hard bases can remain frozen evaluation sets.
Training should use newly generated seeds and templates, never the frozen arena bases. The environment can also
replay a candidate policy on identical seeds, enabling paired comparisons with much less variance than unpaired
benchmark runs.

### 2.3 Existing policy aids

The plays in [`src/vtt/snippets/`](../../src/vtt/snippets/) are deterministic, versioned, hashed tactical proposals.
Current examples include obstacle removal, focus fire, and basic advance. They are proposer drafts: the model may
adopt, edit, or decline them. The K5 and K6 fixtures in [`tests/fixtures/ai-dm-kb/`](../../tests/fixtures/ai-dm-kb/)
already separate tactical advice from mandatory tool workflow. K6 tells the policy to obtain context, consider the
advertised play, edit it, and submit through the engine. These aids should remain present during training if they
will be present at inference. Removing them for training would optimize a different product. They also provide a
useful ablation: model-only, plays-only, SFT, and SFT+RL.

### 2.4 Existing quality signals

The project’s judge panel scores target priority, action/resource economy, terrain/position, and contingency
handling on a ten-point rubric. The panel is already designed to be blind to model identity. It is appropriate as a
sparse, lower-weight RLAIF signal and as an evaluation instrument. It should not replace engine authorization. The
rollout code in [`src/vtt/regret/`](../../src/vtt/regret/) already defines deterministic tactical utility
lexicographically from outcome, surviving side HP, and weighted remaining resources. That creates a route to compare
an accepted plan with sampled alternatives. The speculative planning design also defines future hit-rate and
contingency-lift telemetry in [the speculative DM planning design](../design/2026-08-28-speculative-dm-planning.md).
Together, these signals support a curriculum from syntax, to legality, to tactics, to anticipation, and only then to
narration.

### 2.5 The baseline is known but must be refreshed

The current [agent conformance matrix](../perf/2026-08-28-agent-conformance-matrix.md) verifies the MCP path for
Codex and Claude. Pi plumbing worked, but CPU `gemma4:e4b` failed the model-driven MCP proof in three attempts. The
decision record correctly treats that as a capability result for that model, not as evidence against the protocol.
The older effort probe reports a one-fixture judge average of 5.44 for luna low, but also shows weak clean legality
in a powered repeated test. Those measurements are useful orientation, not a current training target. Before claiming
“better than luna low,” the project must rerun luna low using the current MCP schema, K6, plays, and exact
held-out arena seeds.

## 3. Method landscape, 2025–2026

### 3.1 RLVR and GRPO

Reinforcement learning with verifiable rewards uses an external checker rather than a learned reward model for the
core outcome. Math-answer checking and code tests are common examples. Engine authorization is the direct analogue
here. DeepSeekMath introduced Group Relative Policy Optimization as a PPO-family method that estimates relative
advantages from multiple completions for the same prompt without training a separate critic ([DeepSeekMath
paper](https://arxiv.org/abs/2402.03300)). Removing the critic reduces memory and operational complexity. It does not
make GRPO automatically stable or sample efficient. The reward still needs useful variation inside each prompt group.
If every completion is refused, group-relative advantages collapse and learning stalls. That is why a warm start and
dense rejection categories are important for a small tool-use model. DeepSeek-R1 later demonstrated large-scale
reasoning RL using rule-based rewards, making “RLVR” the dominant label for this family of work ([DeepSeek-R1
paper](https://arxiv.org/abs/2501.12948)). Its reasoning results should not be transferred uncritically to agent
tools. Tool agents face state changes, schemas, observations, process failures, and credit assignment across turns.

### 3.2 GRPO variants relevant to this project

DAPO identified several practical failure modes in large-scale GRPO and proposed asymmetric clipping, dynamic
sampling, token-level policy-gradient loss, and explicit overlong-response shaping ([DAPO
project](https://dapo-sia.github.io/), [paper](https://arxiv.org/abs/2503.14476)). Dynamic sampling is relevant when
a room produces all-zero or all-one reward groups. Such groups teach little under a relative objective. The project
can detect them cheaply and refresh the seed or increase generation temperature rather than spending most batches on
zero-variance data. Dr. GRPO argues that response-length normalization and sample reward-standard- deviation
normalization can create optimization biases, including incentives to inflate response length ([Dr. GRPO
paper](https://openreview.net/pdf/538cc1d05b9aca03a8d20d011f9adebf0e5dfb32.pdf)). That warning is especially
applicable to tool traces. A policy should not receive an advantage merely for narrating, validating, or calling
tools more times. GSPO moves clipping and importance ratios to the sequence level and reports better stability,
particularly for mixture-of-experts models ([GSPO paper](https://arxiv.org/abs/2507.18071)). It is worth considering
for Qwen MoE or gpt-oss experiments. For the first dense 9B run, mature GRPO or Dr. GRPO is a simpler choice.

### 3.3 DPO and preference variants

Direct Preference Optimization learns from chosen/rejected response pairs using a classification-style objective and
avoids an online RL loop ([DPO paper](https://arxiv.org/abs/2305.18290)). DPO is valuable here, but it is not a
substitute for interacting with the engine. It only learns the distribution represented by recorded pairs. It cannot
discover a new legal correction unless that behavior appears in the data. Good DPO pairs can be produced from the
same state by ranking:

- authorized primary over authorized correction;
- authorized correction over auto-resolve;
- lower tactical regret over higher tactical regret;
- judge-preferred narration over judge-rejected narration.

Preference training is attractive for a cheap warm start after supervised fine tuning and before online RL. It is
also attractive for narration, where the reward is inherently comparative. It is less suitable as the only mechanism
for the legality objective.

### 3.4 RLAIF and judge rewards

Constitutional AI popularized using AI feedback to form preference data and then train a policy, an approach commonly
grouped under RLAIF ([Constitutional AI paper](https://arxiv.org/abs/2212.08073)). The project’s three-judge panel
is already an RLAIF apparatus. Its score can improve tactical taste and narration after the policy reliably uses
tools. Learned or AI-judge rewards are vulnerable to length, style, and presentation biases; calibration research
continues to find such systematic reward-model distortions ([ICLR 2025 reward-bias
paper](https://proceedings.iclr.cc/paper_files/paper/2025/hash/5d50c76fdf75c24ece568fc84a7125fb-Abstract-Conference.html)).
Accordingly, panel scores should be blinded, position-balanced, normalized per fixture, owner-calibrated, and capped
below the hard engine reward. The panel should judge the accepted plan and visible reasoning artifact, not an
unbounded persuasive essay written specifically to impress it.

### 3.5 What has worked for smaller tool models

Search-R1 trains language models to issue search queries, consume retrieved observations, and answer with outcome
rewards. Its authors report relative gains for Qwen2.5-7B, Qwen2.5-3B, and Llama-3.2-3B, and mask retrieved tokens
from the policy loss ([Search-R1 paper](https://arxiv.org/abs/2503.09516),
[code](https://github.com/PeterGriffinJin/Search-R1)). The transferable lesson is not the exact benchmark gain. It is
that small policies can learn a multi-turn tool protocol when observations are represented correctly and the external
outcome is verifiable. ReTool uses synthetic cold-start trajectories before online RL and reports a large tool-use
improvement for a 32B model after 400 RL steps ([ReTool paper](https://arxiv.org/abs/2504.11536)). That supports
SFT-before-RL rather than expecting a base model to discover JSON, tool sequencing, and tactics simultaneously. A
2025 study of tool-integrated reasoning reports that models up to 3B benefit from SFT followed by RLVR when stateful
tool traces provide denser rewards ([tool-integrated reasoning paper](https://arxiv.org/abs/2507.05065)). SkyRL’s
text-to-SQL work reports training a 7B policy with 653 training examples, but that number is project-reported and the
domain has an exceptionally crisp execution checker ([SkyRL-SQL paper](https://openreview.net/pdf?id=VNPGUGbC1p)).
The useful common pattern is:

1. constrain the action space;
2. teach the exact trace format with clean demonstrations;
3. hide and execute tool observations outside the policy;
4. use an external terminal verifier;
5. add intermediate rewards only when they cannot dominate the terminal result;
6. preserve group diversity so policy gradients do not collapse.

This project already satisfies the first and fourth conditions unusually well. It must implement the third carefully
and manufacture the second at sufficient quality.

### 3.6 Framework state as of 2026-08-29

#### TRL and OpenEnv

Hugging Face TRL 1.12.0 was released on 2026-08-26 ([PyPI](https://pypi.org/project/trl/)). TRL’s OpenEnv
integration lets `GRPOTrainer` receive an `environment_factory` for stateful multi-turn environments; public
environment methods become model tools and each episode is reset independently ([TRL OpenEnv
documentation](https://huggingface.co/docs/trl/main/openenv)). TRL also documents an experimental asynchronous GRPO
path in which a rollout harness supplies token IDs and log probabilities from an external agent loop. The
documentation labels that path experimental, so it should not be the first dependency unless synchronous OpenEnv
cannot represent the MCP turn. OpenEnv 0.4.1 was released on 2026-07-03 under BSD-3-Clause ([OpenEnv
PyPI](https://pypi.org/project/openenv/)). This is the most approachable stack for Experiment 1 because it keeps the
Python trainer conventional while letting the environment own stateful tool execution. The risk is freshness: these
exact APIs are new and need a one-day compatibility spike with the selected model before committing cloud budget.

#### veRL and Uni-Agent

veRL 0.9.0 was released on 2026-08-14 ([veRL PyPI](https://pypi.org/project/verl/)). veRL remains a high-throughput
RL framework with documented multi-turn and tool agent support ([veRL
repository](https://github.com/verl-project/verl), [agentic RL
documentation](https://github.com/verl-project/verl/blob/main/docs/start/agentic_rl.rst)). Its project has also
introduced Uni-Agent as a newer agent-training system for long-horizon harnesses ([Uni-Agent
repository](https://github.com/verl-project/uni-agent)). Uni-Agent reports fully asynchronous GRPO and 100-turn agent
training, including project-reported gains for a Qwen3.5-9B coding agent. Those results make it a credible successor
for a later multi-round campaign loop. They do not make it necessary for a one-round first experiment. veRL/Uni-Agent
becomes attractive when throughput, distributed rollout workers, or long-lived campaigns dominate engineering
simplicity.

#### OpenRLHF

OpenRLHF 0.10.4 is current on PyPI ([OpenRLHF PyPI](https://pypi.org/project/openrlhf/)). Its agent-training
documentation supports single- and multi-turn execution and lists PPO, REINFORCE++, REINFORCE with baseline, RLOO,
GRPO, and Dr. GRPO, with synchronous and asynchronous execution modes ([OpenRLHF agent
training](https://openrlhf.readthedocs.io/en/latest/agent_training.html)). OpenRLHF is a strong fallback if TRL’s
model or environment integration fails. Its Ray-based distributed architecture is more machinery than Experiment 1
needs, but becomes useful for 27B/32B or high-throughput rollouts.

#### SkyRL

SkyRL has been reorganized into a unified project and publishes a v0.2-series trainer while continuing to expose
agent and Gym components ([SkyRL repository](https://github.com/NovaSky-AI/SkyRL),
[releases](https://github.com/NovaSky-AI/SkyRL/releases)). SkyRL-Gym 0.3.0 exposes Gymnasium-style environments and
multi-tool agent support ([SkyRL-Gym PyPI](https://pypi.org/project/skyrl-gym/)). The project documents custom
agent-loop integration and a multi-turn text-to-SQL example ([agent
integration](https://docs.skyrl.ai/docs/tutorials/agent-integration), [text-to-SQL
example](https://docs.skyrl.ai/docs/examples/multi_turn_text2sql)). SkyRL is conceptually close to the required MCP
adapter. It is a reasonable second prototype if OpenEnv proves too restrictive. Its reorganization and smaller
ecosystem make it a less conservative default than TRL or OpenRLHF today.

#### Framework recommendation

Use TRL 1.12.0 plus OpenEnv 0.4.1 for the first synchronous one-round loop. Pin both versions and the exact model
revision. Prototype one reset, one tool sequence, one hidden reward, and one backward pass before generating a large
dataset. Use OpenRLHF if hybrid-model support, rollout serving, or memory layout blocks TRL. Revisit Uni-Agent when
the objective becomes long-horizon multi-round play. Do not build directly on an unstable `main` branch for a
reproducibility-sensitive experiment.

## 4. Base-model candidates

### 4.1 Selection criteria

The useful range is roughly 8–32B total dense parameters, or an MoE that can be served and trained with similar
active compute. The policy needs:

- reliable structured output and native tool-call templates;
- enough reasoning capacity to revise a play against visible state;
- a permissive redistribution and fine-tuning license;
- trainer support for the architecture;
- practical inference on hardware the project could actually operate.

Context length is not the primary discriminator for one-round play. Tool-call behavior, architecture support, and
legality rate matter more.

### 4.2 Qwen3.5-9B: first choice

Qwen3.5-9B is published under Apache-2.0, has a 262K native context window, and documents tool calling through
current vLLM and SGLang parsers ([official model card](https://huggingface.co/Qwen/Qwen3.5-9B)). Nine billion
parameters is large enough to test meaningful planning while still being plausible for QLoRA and single-accelerator
serving. Its recency and hybrid architecture create trainer-compatibility risk. That risk is why the compatibility
spike is a prerequisite, not a footnote. Subject to that spike, Qwen3.5-9B is the best Experiment 1 candidate.

### 4.3 Qwen3.5/3.6-27B: quality tier

Qwen3.5-27B is an Apache-2.0 dense model with the same documented tool-call path ([official model
card](https://huggingface.co/Qwen/Qwen3.5-27B)). Qwen3.6-27B is also Apache-2.0 and is explicitly positioned for
agentic coding and tool use ([official model card](https://huggingface.co/Qwen/Qwen3.6-27B)). Either is a plausible
second-stage policy if 9B learns protocol but plateaus on tactical judgment. The cost is materially higher training
and serving memory. Do not start there before proving that the reward and adapter work on 9B.

### 4.4 Mature Qwen3 fallbacks

Qwen3-14B and Qwen3-32B are Apache-2.0 dense alternatives with a more mature training ecosystem
([Qwen3-14B](https://huggingface.co/Qwen/Qwen3-14B), [Qwen3-32B](https://huggingface.co/Qwen/Qwen3-32B)). They are
reasonable fallbacks if Qwen3.5’s architecture is not supported cleanly by the selected RL stack.
Qwen3-Coder-30B-A3B-Instruct is an Apache-2.0 MoE with roughly 30B total and 3B active parameters, designed for
agentic coding and function use ([model card](https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct)). Its active
compute is appealing, but MoE RL stability and memory for total weights make it a second-wave experiment.

### 4.5 gpt-oss-20b: strong alternate

OpenAI’s gpt-oss-20b is Apache-2.0, approximately 21B total parameters with 3.6B active per token, and is described
as fine-tunable with native agentic tool use ([developer
page](https://developers.openai.com/api/docs/models/gpt-oss-20b), [model
card](https://openai.com/index/gpt-oss-model-card/)). It is a credible alternate when low active compute is valuable.
Its Harmony conversation and tool format requires a dedicated adapter rather than assuming an OpenAI-style JSON
template is interchangeable. The project should benchmark base tool compliance before choosing it over Qwen.

### 4.6 Gemma 4: licensed well, locally cautioned

Gemma 4 is now distributed under Apache-2.0 and includes native function calling and structured-output guidance
([Google announcement](https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/), [official E4B
card](https://huggingface.co/google/gemma-4-E4B), [prompt
format](https://ai.google.dev/gemma/docs/core/prompt-formatting-gemma4)). The family includes small, dense, and
mixture-of-experts sizes ([Gemma 4 overview](https://deepmind.google/models/gemma/gemma-4/)). The repository’s
`gemma4:e4b` MCP failure is direct negative evidence for that specific local model and runtime. It is not evidence
that Gemma 4 12B or 26B-A4B cannot learn the task. It is enough reason not to spend Experiment 1 rediscovering the
E4B limitation.

### 4.7 Llama 4 and Llama 3.1

Llama 4 Scout has 17B active parameters but roughly 109B total parameters and a custom Llama 4 Community License
([official model card](https://huggingface.co/meta-llama/Llama-4-Scout-17B-16E-Instruct), [Meta
announcement](https://ai.meta.com/blog/llama-4-multimodal-intelligence/)). It therefore does not fit a practical
“8–32B weights” deployment target even though its active count sounds suitable. The custom license also adds
compliance work compared with Apache-2.0. Llama 3.1 8B remains available under the Llama 3.1 Community License
([model card](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct)). It is mature but no longer the most
compelling tool-first 8B candidate.

### 4.8 DeepSeek distills

DeepSeek-R1 publishes Qwen-based distills at 7B, 14B, and 32B and describes the distilled weights under MIT terms
subject to their base-model terms ([DeepSeek-R1 repository](https://github.com/deepseek-ai/DeepSeek-R1)). They are
strong reasoning baselines. They are not the first choice because their public positioning and templates are
reasoning-first rather than native MCP tool-policy-first. An evaluation may prove otherwise, but the burden should be
on measured tool compliance.

### 4.9 Mistral 24B

Mistral Small 24B Instruct 2501 is Apache-2.0 and documents function-calling use ([official model
card](https://huggingface.co/mistralai/Mistral-Small-24B-Instruct-2501)). It is older than the leading 2026
candidates but offers a conventional dense architecture and straightforward license. It is a useful control if the
newest hybrid or MoE architectures cause trainer friction.

### 4.10 License posture

Apache-2.0 and MIT candidates are the cleanest fit for a public CC-BY-oriented repository. The model weights do not
become CC-BY merely because adapter code or documentation is stored in this repository. Their original license,
notices, and attribution obligations remain attached. The repository should keep model artifacts and notices explicit
rather than implying that one repository-level license relicenses every artifact. Meta’s custom licenses are usable
in many cases but add naming, redistribution, and acceptable-use review that the Apache choices avoid. Training-data
rights are a separate question from model-weight rights. Private player transcripts, third-party adventure text, and
CC-BY-SA material must not enter a public checkpoint unless consent and license compatibility have been established.
The repository’s existing licensing walls should be applied to corpus production, not bypassed because the result
is a weight delta instead of a source file.

## 5. Concrete reward design

### 5.1 Principle: hard truth before taste

The reward stack should preserve a hierarchy:

1. protocol validity;
2. engine legality and complete-round authorization;
3. tactical utility among legal plans;
4. judge preference among tactically acceptable plans;
5. narration quality;
6. efficiency, only after quality floors are met.

A high judge score must never compensate for an unauthorized intent. A monster-side win must never compensate for
fabricating a reducer command. A short trace must never beat a legal trace merely because it used fewer tokens. This
hierarchy can be implemented as staged training, lexicographic selection, or a scalar with gates. Staged training is
easiest to audit.

### 5.2 Stage A: protocol and authorization

Experiment 1 should use only host-verifiable signals. One proposed normalized schedule is:

| Event | Reward contribution |
|---|---:|
| malformed assistant/tool protocol | `-1.00`, terminal |
| missing or extra required actor | `-0.75`, terminal |
| authoritative refusal after allowed correction | `-1.00` |
| deterministic auto-resolution | `-0.80` |
| awaiting DM adjudication | `-0.40` |
| authorized on correction | `+0.20` |
| authorized through fallback | `+0.60` |
| authorized through primary | `+1.00` |
| each attributable engine rejection | `-0.10`, capped at `-0.50` |

The exact numbers are hypotheses to tune, not domain truths. Their ordering is the important part. Primary
authorization should outrank fallback, which should outrank correction, which should outrank host auto-resolution.
Rejection shaping should be capped so a verbose series of small mistakes cannot dominate the terminal outcome.
“Awaiting adjudication” should remain distinct from both legal automation and invalid intent. Some semantically
legitimate DM choices inherently require a person. Punishing all such states as illegal would teach the model to
avoid expressive gameplay.

### 5.3 Stable rejection codes

Raw rejection prose is useful for humans but brittle for rewards. The environment should map engine failures to
versioned stable codes such as:

- schema or protocol error;
- stale state or binding error;
- actor omitted or duplicated;
- unavailable action;
- target invalid or absent;
- movement infeasible;
- resource unavailable;
- fallback invalid;
- correction still invalid;
- requires DM adjudication.

The engine remains the source of truth for the code. The RL wrapper must not infer legality from matching English
substrings. Severity should be explicit and versioned. This also makes failure-rate evaluation understandable rather
than reducing all mistakes to one scalar.

### 5.4 Stage B: tactical rollout reward

Once clean authorization is high, add deterministic simulation. For state `s` and accepted plan `a`, let `U(s,a)` be
the existing rollout utility. Sample or enumerate a bounded comparison set `A(s)` from legal plays, alternative
targets, and policy candidates. Define normalized tactical regret: `regret(s,a) = (max_b U(s,b) - U(s,a)) /
scale(s)`. Clip it to `[0,1]` after choosing a robust scenario-specific scale. Then add `R_tactics = 0.75 * (1 -
regret)` only if the plan was authorized. An unauthorized plan receives no tactical credit because it has no
executable meaning. The existing lexicographic utility should remain canonical. Do not collapse outcome, HP, and
resources into a new ad hoc learned value before there is evidence that the current utility is inadequate. Rollout
randomness must be controlled with common random numbers. Every candidate for one state should see the same
deterministic seed set. Otherwise lucky dice become policy gradient noise. The comparison set must include more than
the current policy’s own samples. Include deterministic plays and a bounded search baseline so the policy cannot
make itself look optimal by producing four equally weak candidates.

### 5.5 Terminal combat outcome

Later multi-round training can add terminal simulated outcome. A simple normalized term may map the existing utility
tiers into `[0,1]`, then add surviving HP and resources through the canonical tie-breakers. This reward should remain
gated on legal execution at every round. It should not be introduced in Experiment 1. Long-horizon outcome makes
credit assignment much harder and may teach tactics that exploit simulator limitations before basic tool behavior is
stable. Monster-side victory is also not identical to good DMing. The tactical policy can optimize competent
opposition inside a frozen encounter, while separate encounter-design and narration policies protect fairness and
fun. Combining all three roles into one win-maximizing reward would be a category error.

### 5.6 Judge-panel reward

Convert each judge’s ten-point score to `[0,1]` only after validating rubric agreement and owner calibration. Use a
robust aggregate such as a trimmed mean or median rather than allowing one judge to dominate. Initially cap the panel
term at `0.25` of the authorization term. Prefer using panel decisions to create DPO pairs or to rerank trajectories
rather than calling three expensive judges on every online rollout. For example, judge a stratified sample of:

- highest and lowest rollout-regret legal plans;
- plans on which deterministic utility and heuristics disagree;
- novel plans that do not adopt a play;
- narration pairs from the same accepted mechanics.

This focuses subjective cost where it adds information.

### 5.7 Narration reward

Narration must be trained as a separate output after mechanics are fixed. The narration model receives the
authoritative accepted plan and resulting state transition. It does not narrate a proposed but refused event as if it
happened. Useful narration preference dimensions include factual consistency, attribution, brevity appropriate to the
turn, sensory clarity, tone, and non-repetition. The judge must compare narrations for the same mechanics. Otherwise
it may reward a more exciting but mechanically false event. No engine result should be parsed back from narration.
That preserves the existing design boundary.

### 5.8 Speculation reward later

The speculative planning design already proposes default, specific, and overall hit rates; contingency lift;
validator failure; and top-k realized-flip recall. Those can become a later calibration objective. Reward a
prediction only when the future event is independently recorded by the host. Penalize gratuitous speculation so
listing every possible event is not optimal. A proper scoring rule, such as a clipped Brier score over a closed event
schema, would be preferable to free-text “hit” matching. This requires a typed event vocabulary first. It should
not be mixed into the legality experiment.

### 5.9 Anti-reward-hacking measures

The reward service must live outside the model-visible conversation. The model may submit only the existing semantic
intent schema. It may not submit `reward`, `authorized`, `proof`, `score`, `win`, or an engine decision token. This
is the direct lesson from the project’s proof-token findings: a value that can be echoed is not proof. The host
must independently recompute authorization from authoritative state. It must not trust a logged `authorizedPlan`
copied from a trajectory. The model receives a bounded state projection. The reward worker may access full
authoritative state, engine traces, and hidden simulation seeds through a side channel unavailable to the policy.
Tool observations should be masked from policy-gradient loss where the trainer supports it, following the pattern
used by Search-R1. Otherwise the optimizer may be credited for tokens emitted by the environment. State IDs, actor
names, and presentation order should be randomized where doing so does not alter semantics. This reduces memorization
of superficial seed fingerprints. Training, validation, and test splits must be separated by generator template
families as well as seeds. A random row split leaks near-identical rooms. Keep frozen evaluator seeds private from
the training process. Hash and record the engine version, generator version, KB, plays, model revision, tokenizer,
and reward configuration for every trajectory. Cap all shaped components below the terminal authorization decision.
Apply small tool-call or token penalties only among policies already meeting the quality floor. Blind judge inputs to
policy identity, training arm, latency, and token cost. Randomize A/B ordering to detect position bias. Audit score
by response length and style markers. Insert canary scenarios and deliberately invalid engine mutations in offline
verification to confirm the reward pipeline fails when truth is wrong. Never train against the mutation; use it to
test that the evaluator can detect verifier drift. Retain full failure taxonomy and trajectory evidence rather than
only aggregate reward. Reward hacking is usually visible first as a strange subgroup improvement.

## 6. Data strategy

### 6.1 SFT warm start

The warm start should teach the exact production behavior:

- read bounded context;
- interpret available actors and actions;
- inspect the advertised play when present;
- edit rather than blindly copy when state demands it;
- submit a complete round;
- use fallback coherently;
- correct once from engine feedback;
- stop after authorization or terminal host outcome.

Only host-authorized, state-bound trajectories should be positive SFT targets. A transcript is not positive merely
because its prose sounds tactical. Failed attempts should be retained as negative/preference data and as correction
context, not copied into the SFT answer as if they were correct. Auto-resolved rounds may be useful as negative
examples but should not dominate the corpus. Adjudication-required rounds deserve a separate label rather than
deletion.

### 6.2 How many rounds

There is no universal sample count for this task. The following are realistic engineering targets, not literature
guarantees. About 500–1,000 exceptionally clean rounds may teach syntax and the short tool protocol to an already
tool-capable 9B model. About 1,500–3,000 diverse clean rounds is a reasonable minimum warm start for Experiment 1.
About 5,000–10,000 rounds across generator families, monster capability patterns, terrain patterns, corrections,
and play/no-play cases is a more credible tactical corpus. Narration likely needs a separately curated
10,000–30,000 paired examples to cover voice without overfitting repeated templates. Raw count is less important
than state and decision diversity. Ten paraphrases of the same focus-fire room are not ten independent tactical
lessons. Each round should preserve three to five policy decision points where applicable: context acquisition,
optional validation, primary proposal, fallback, and correction. That yields more tool-format tokens than the round
count alone suggests.

### 6.3 Corpus sources

Start with arena trajectories generated by a strong API teacher under the exact production MCP and K6/plays
configuration. Accept only trajectories whose authorization and state binding can be replayed. Add deterministic-play
trajectories, but label play provenance. Ensure a meaningful fraction edits or rejects the suggested play. Otherwise
the trained model becomes a play selector rather than a planner. Add targeted correction trajectories from each
stable rejection category. Use the same state with several teacher samples to obtain authorized and refused pairs for
DPO and GRPO diagnostics. As real transcripts grow, admit them only through a rights, privacy, and replay validation
pipeline. Strip player names and private free text unless explicit training consent exists. Exclude
license-incompatible source text even when the mechanics derived from it are permitted elsewhere in the application.

### 6.4 Independent expectations

Do not regenerate expected training labels from the policy being trained. The authoritative engine may generate
authorization labels because it is the system under test’s external oracle. It must not generate “best tactic”
labels from the same learned policy and then grade that policy against itself. Tactical comparisons should come from
deterministic rollout, independent plays, search, or separately sampled and judged candidates. Frozen evaluation
expectations should remain independently authored and reviewed, consistent with the project’s existing
golden-transcript discipline.

### 6.5 Split design

Split by room generator template, capability combination, and map topology before splitting by seed. Reserve all
existing standard and hard arena bases for evaluation. Create a development set of unseen seeds from known template
families. Create a challenge set from held-out template families. Create a protocol-adversarial set with stale
bindings, invalid targets, omitted actors, tempting prose injection, and misleading play suggestions. Create an
out-of-distribution set for homebrew passthrough values and unusually large but valid state capsules. This makes it
possible to tell memorization, interpolation, and robust tool use apart.

## 7. MCP server as an RL environment

### 7.1 Boundary

The production server is stdio JSON-RPC. Keep it that way. The RL adapter should spawn or connect to one isolated MCP
process per environment worker and translate its methods into a Gym/OpenEnv-style episode. No HTTP service is
required. No browser port is required.

### 7.2 Proposed components

`DmRoundEnv.reset(seed, basis, arm)` should:

1. create a unique temporary episode directory;
2. instantiate the deterministic room and authoritative state;
3. write or expose the bounded capsule through the normal launcher contract;
4. start the MCP child with stdio pipes;
5. initialize host-side reward and trace collectors;
6. return the normal system/user prompt, not hidden reward state.

The environment should expose model-callable methods matching production names and schemas exactly:

- `engine.get_turn_context`;
- `engine.validate_intent`;
- `engine.submit_round_intents`.

An adapter method serializes the model’s tool call to MCP JSON-RPC and appends the returned observation to the
trajectory. The policy never sees file paths, spool internals, reward fields, or hidden seeds. On submission, the
authoritative host consumes the proposal, applies its normal authorization/refusal path, and records `authorizedPlan`
and `chainEvidence`. If correction is allowed, the episode continues with the real rejection text and stable hidden
rejection code. After authorization, refusal, adjudication, or auto-resolution, the episode ends. The environment
returns reward through trainer metadata, not conversation text.

### 7.3 Gym-style sketch

```python
class DmRoundEnv(Env):
    def reset(self, seed=None, options=None):
        self.host = EpisodeHost(seed=seed, options=options)
        self.mcp = StdioMcp(self.host.launcher())
        self.trace = []
        return self.host.initial_prompt(), {"episode_id": self.host.opaque_id}
    def get_turn_context(self, request):
        return self.mcp.call("engine.get_turn_context", request)
    def validate_intent(self, request):
        return self.mcp.call("engine.validate_intent", request)
    def submit_round_intents(self, request):
        observation = self.mcp.call("engine.submit_round_intents", request)
        decision = self.host.consume_and_authorize()
        self.trace.append(decision.audit_only())
        return observation
    def step(self, assistant_event):
        observation = self.dispatch_visible_event(assistant_event)
        terminal = self.host.is_terminal()
        reward = self.host.hidden_reward() if terminal else 0.0
        return observation, reward, terminal, False, self.host.safe_info()
```

The real trainer API may call public methods as tools rather than a literal `step()` for each tool event. The
separation above is the invariant that matters.

### 7.4 Isolation and concurrency

Every parallel worker needs a unique launcher, capsule, proposal spool, and trace directory. Never share a mutable
proposal spool across rollouts. The host should enforce process lifetime, byte limits, tool-call limits, and wall
timeouts. Kill and clean the child after each episode, including exceptions. Use explicit episode IDs generated by
the host, not model-supplied IDs. Store enough evidence to replay a reward discrepancy. The wrapper must distinguish
model failure, MCP transport failure, engine refusal, and trainer cancellation. Collapsing them all into reward `-1`
would train against infrastructure outages. Transport failures should normally be excluded or retried under a fixed
policy.

### 7.5 Token and gradient accounting

Record assistant token IDs and log probabilities only for tokens produced by the policy. Do not assign gradient to
engine observations, system messages, or host correction text. Record tool-call boundaries explicitly. Ensure the
tokenizer’s chat template emits the same representation used at production inference. Verify one saved trajectory
by decoding token IDs back to the exact visible trace. This small check catches many agent-RL plumbing errors before
they become an expensive run.

## 8. Training curriculum

### Phase 0: base-model screen

Run each candidate without training on 100–200 held-out generated rounds. Measure valid tool protocol, complete
actor coverage, primary authorization, correction conversion, refusal, auto-resolution, tokens, and wall time. Do not
use judge score to rescue a model that cannot complete the protocol. Choose the smallest candidate that produces
enough mixed reward groups for GRPO. If Qwen3.5-9B produces virtually all refusals, increase SFT rather than relying
on reward shaping to discover the whole protocol.

### Phase 1: supervised fine tuning

Train a LoRA/QLoRA adapter on 1,500–3,000 clean production-format trajectories. Use a small validation set split by
generator template. Stop on tool-protocol and authorization metrics, not only token loss. Evaluate the untouched base
and SFT checkpoint on identical seeds.

### Phase 2: authorization RLVR

Run GRPO with four samples per state on 512–1,000 novel states. Use Stage A reward only. Sample difficult states
adaptively, but retain a fixed proportion of easy states to detect regressions. Refresh zero-variance groups rather
than silently training on them. Compare SFT+RL against SFT-only, not just against the base model.

### Phase 3: tactical regret

After authorization reaches its preregistered floor, add rollout regret for legal plans. Use common simulation seeds
and independent comparison candidates. Start with a low tactical weight and verify that authorization does not fall.

### Phase 4: multi-round outcome

Move from isolated rounds to short encounters only after the one-round policy is stable. Use a framework that
supports asynchronous long-horizon rollouts if tool latency becomes dominant. At this point Uni-Agent or OpenRLHF may
be a better fit than the minimal TRL loop.

### Phase 5: narration and speculation

Train narration on authoritative post-resolution facts with preference data. Train speculation against typed,
independently observed future events. Keep both heads or adapters separable from the tactical proposer until
ablations show no legality regression.

## 9. Cost and feasibility

### 9.1 Hardware reality

The current development host exposes no NVIDIA GPU. “Local 8B” therefore means hardware the owner acquires or
another local machine, not this host as currently configured. A 9B QLoRA SFT run can plausibly fit on a 24GB consumer
GPU with aggressive memory settings; QLoRA's core memory result was fine-tuning a 65B model on one 48GB GPU
([QLoRA paper](https://arxiv.org/abs/2305.14314)). Online GRPO is less comfortable because it needs policy training plus
generation, reference/log-probability work, and several samples per prompt. Colocation and quantization can make a
single 24GB experiment possible, but the engineering margin is thin. An 80GB A100 or H100 is a more dependable first
cloud target.

### 9.2 Current cloud reference prices

RunPod’s public pricing page currently lists examples including RTX 4090 at about `$0.74/hour`, L40S at
`$0.99/hour`, A100 PCIe 80GB at `$1.39/hour`, A100 SXM at `$1.59/hour`, H100 PCIe at `$2.89/hour`, and H100 SXM at
`$3.29/hour` ([RunPod pricing](https://www.runpod.io/pricing)). RunPod separately announced 2026 price reductions,
illustrating why this report should not hard-code a procurement assumption ([price
announcement](https://www.runpod.io/blog/runpod-slashes-gpu-prices)). Provider availability, storage, egress, idle
time, and secure-volume charges are not included in raw GPU-hour multiplication. Official hyperscaler pricing can be
substantially different and should be checked at purchase time ([Google accelerator
pricing](https://cloud.google.com/products/compute/pricing/accelerator-optimized)).

### 9.3 Tier A: local 8B/9B LoRA

Assuming an owned 24GB GPU, a 1,500–3,000-trajectory QLoRA SFT run is plausibly 6–20 wall hours. Marginal cloud
cost is zero on owned hardware, but power and hardware are not. A tiny online RL smoke test may run on the same
device with quantized adapters, short context, group size four, and sequential generation. Expect slow iteration and
more out-of-memory tuning. This tier is best for proving data formatting and the reward path. It is not the best way
to estimate final throughput.

### 9.4 Tier B: first cloud RL checkpoint

A smoke run of roughly 512 states by four generations is 2,048 episodes. Depending on trace length and serving
efficiency, budget roughly 8–20 accelerator hours. At the cited public rates that is about `$12–$70` in raw
accelerator time. A practical budget of `$50–$150` allows for setup, failed runs, evaluation, and storage. A first
useful checkpoint may need 2,000–5,000 unique states and group size four to eight, or 8,000–40,000 rollouts.
Budget roughly 24–96 single-GPU-equivalent A100/H100 hours as an initial planning range. Raw accelerator cost is
then approximately `$35–$315` at the cited rates. A safer project budget is `$150–$800` because agent loops often
waste time on serialization, tool waits, evaluation, incompatible kernels, and restarts. These are engineering
estimates. Actual token length and framework efficiency can change them by tenfold.

### 9.5 Tier C: 27B/32B quality run

A 27B/32B LoRA policy likely wants two to four 80GB accelerators once online rollout and trainer memory are included.
A serious run could consume roughly 200–800 total accelerator-hours. At current reference prices, raw compute is
broadly `$300–$2,600` before failed runs and evaluation. A practical experimental budget is `$1,000–$5,000`. Do
not authorize this tier until the 9B experiment proves that RL, rather than SFT or plays alone, supplies measurable
lift.

### 9.6 Judge cost

Three frontier judges on every rollout could cost more than policy training and would slow the feedback loop. Use
engine and simulation rewards online. Use the judge panel on a stratified evaluation subset and for offline
preference pairs. Cache judgments by exact artifact and rubric version. Never reuse a cached judgment after
mechanics, narration, or rubric changes.

## 10. Measuring “better than luna low”

### 10.1 Rebaseline first

Run luna low, the open base, SFT-only, and SFT+RL through the same current harness. Use K6, the current plays, the
current MCP server, identical prompts, and paired seeds. Pin effort, temperature, maximum tokens, and correction
policy. The old one-fixture score is not sufficient evidence for a 2026 checkpoint claim.

### 10.2 Evaluation sets

Use at least 200 unseen one-round states for engine metrics. Include standard, hard, adversarial-protocol,
held-out-template, and homebrew- passthrough strata. Use 48–96 stratified paired artifacts for the expensive
three-judge panel. Use more if judge variance remains high. Never train on the frozen comparison seeds.

### 10.3 Primary endpoints

Report:

- valid MCP/tool protocol rate;
- complete shared-initiative actor coverage;
- primary authorization rate;
- fallback authorization rate;
- correction conversion rate;
- auto-resolution rate;
- refusal and adjudication rates;
- rejection-code distribution;
- normalized tactical regret;
- terminal rollout utility when applicable;
- blind panel total and rubric components;
- tokens, tool calls, retries, and wall time as secondary metrics.

Authorization without correction should be the initial primary endpoint. Auto-resolution and refusal are safety
guardrails. Tactical regret becomes co-primary only in Stage B. Panel score becomes co-primary for narration, not for
Experiment 1.

### 10.4 Statistical decision rule

Pre-register the threshold before looking at final results. A reasonable initial rule is:

- at least a ten-percentage-point paired lift in primary authorization over luna low, with the bootstrap 95%
  confidence interval lower bound above zero;
- no increase in auto-resolution or terminal refusal beyond a two-point margin;
- no significant tactical-regret degradation;
- at least a 0.5/10 panel-score lift with lower confidence bound above zero when the panel endpoint is activated.

The exact margins may be adjusted during the baseline phase, but not after final test results are visible. Also
compare against SFT-only. If SFT+RL does not beat SFT-only, the RL loop has not justified itself even if both beat
luna low. Report every seed and paired difference, not only aggregate averages. Latency has no quality ceiling under
the project’s current decision, but it must still be measured for deployment economics.

### 10.5 Necessary ablations

At minimum compare:

1. base Qwen3.5-9B with no adaptation;
2. base plus K6 and plays;
3. SFT checkpoint plus K6 and plays;
4. SFT+RL checkpoint plus K6 and plays;
5. deterministic controller/plays without model where applicable;
6. luna low with the identical production aids.

For later stages also ablate rollout reward and judge reward separately. Without these arms, an improvement may be
caused by a better prompt, a play, or more correction rather than RL.

## 11. Risks and the case against training

### 11.1 Verifier exploitation

An RL policy will optimize what is measured, including engine bugs. It may discover accepted but nonsensical intent
combinations faster than humans do. That is useful fuzzing but dangerous if mistaken for tactical skill. Every
surprising reward improvement needs trace review and replay.

### 11.2 Simulator exploitation

The rollout engine is a model of combat, not the total experience of a table. A policy can overfit deterministic
assumptions, horizon length, or utility tie-breakers. It may learn repetitive focus fire or resource dumping that
wins simulations but produces worse sessions. Owner-calibrated judges and scenario diversity reduce this risk but
cannot remove it.

### 11.3 Judge hacking

AI judges can prefer confident, long, or stylistically familiar outputs. A policy trained directly on those scores
can learn rhetoric instead of tactics. Low weight, blind pairwise comparison, length audits, and human spot checks
are mandatory. Narration should never be allowed to alter the mechanics being judged.

### 11.4 Sparse reward and collapse

If a small base model cannot invoke the tools, all attempts receive the same failure reward. GRPO then has no useful
within-group ordering. SFT, typed rejection shaping, easier curriculum states, and dynamic sampling are the remedies.
Increasing reward magnitude is not.

### 11.5 Catastrophic specialization

Optimizing one-round monster turns can reduce general language quality, character voice, or rule explanation. Use
adapters, small KL constraints, mixed SFT replay, and separate narration evaluation. Retain the base model and SFT
checkpoint for rollback and ablation.

### 11.6 Schema drift

The MCP intent schema and engine semantics are still evolving in a pre-alpha project. A checkpoint may encode
obsolete tool names, rejection language, or play formats. Stable typed schemas and versioned training manifests are
prerequisites for any expensive run. Cheap adapters make retraining less painful, but not free.

### 11.7 Data and licensing

Public transcripts can contain player identity, copyrighted adventure prose, and license-incompatible content.
Training can memorize rare strings. The project needs consent, redaction, source provenance, and explicit allowlists.
The public repository’s CC-BY posture does not automatically authorize every transcript or sourcebook fragment.

### 11.8 Distribution shift

Generated rooms may underrepresent social encounters, unusual homebrew, complex terrain, or human improvisation. High
arena performance may not transfer to real sessions. Keep real-session evaluation separate and never close
user-supplied vocabularies merely to make reward checking easier.

### 11.9 Infrastructure burden

Owning a checkpoint means owning serving, quantization, model packaging, GPU compatibility, monitoring, safety
updates, and repeated retraining. Frameworks and model architectures are moving quickly in 2026. An adapter that
trains today may fail after an inference-runtime upgrade. That operational cost is larger than the first GPU invoice.

### 11.10 API models plus plays may simply win

The strongest case against RL is that the product already has a good decomposition. The engine guarantees legality.
Plays encode repeatable tactics. K6 teaches the workflow. One correction converts many near misses. The deterministic
controller prevents stalls. Frontier API models improve without this project paying training or serving costs. At low
or moderate volume, paying per turn may be cheaper than maintaining GPUs. Plays are inspectable and can be fixed
immediately. An RL policy can hide brittle behavior in millions of weights. If a new play raises quality as much as
RL, the play is the better intervention. If SFT alone captures the protocol, online RL may not be worth its
complexity. If luna low or another cheap API model already clears the preregistered quality bar after current
K6/plays/correction, the experiment should stop. Training is most defensible when at least one of these is true:

- offline or private deployment is a product requirement;
- sustained volume makes inference ownership economical;
- deterministic reproducibility matters;
- open weights are strategically required;
- the domain policy remains materially below target after prompt/play engineering;
- the trained policy becomes a reusable research asset for the simulator.

Absent those conditions, API policy plus engine verification is the rational default.

## 12. Recommended Experiment 1

### Name

**Authorization-GRPO-9B**

### Question

Can a 9B open-weight model learn the exact one-round MCP policy well enough to beat the current luna-low baseline on
clean authorization without increasing auto-resolution or tactical regret?

### Model

Use Qwen3.5-9B at a pinned official revision under Apache-2.0. If the trainer cannot correctly backpropagate through
its architecture, fall back to Qwen3-14B or another mature Apache-2.0 dense candidate after documenting the
compatibility failure. Do not silently change models mid-experiment.

### Stack

Use TRL 1.12.0 and OpenEnv 0.4.1, pinned. Use synchronous one-round episodes. Use the production stdio MCP child and
exact production schemas. Use LoRA/QLoRA so base weights remain unchanged. Use OpenRLHF only if the one-day TRL
compatibility spike fails.

### Scope

One shared-initiative monster round per episode. Expose only the current three engine tools. Keep K6 and applicable
plays enabled. Allow the production primary, fallback, and single correction path. Exclude multi-round combat,
narration optimization, speculative planning, and judge reward.

### Data

Generate and validate 1,500–3,000 SFT trajectories from authorized teacher runs. Cover all stable rejection codes
with correction examples. Include play adoption, play editing, and no-play planning. Split by generator template
before seed. Reserve current frozen arena bases and at least 200 new hidden states for final evaluation.

### RL batch

Start with a 64-state end-to-end smoke test and four completions per state. Confirm that rewards vary, gradients are
finite, tool observation tokens are masked, and a saved adapter reloads. Then run 512 states by four completions.
Expand to 1,000 states only if the learning curve and held-out authorization move in the intended direction. Use
Stage A hidden rewards. Do not use judge scores or simulated wins in this experiment.

### Reward

Use the primary/fallback/correction/auto-resolve/refusal ordering in Section 5. Use stable engine rejection codes for
capped shaping. Compute every reward out of band after authoritative host consumption. Never place a reward or proof
field in the model-visible schema.

### Comparison arms

Evaluate base, SFT-only, SFT+GRPO, luna low, and plays/controller-only where meaningful. Run every stochastic arm on
paired seeds with at least the same sample count. Judge-panel evaluation is optional diagnostic evidence here, not a
training signal or success gate.

### Success gate

Declare the experiment promising only if SFT+GRPO:

- beats the refreshed luna-low primary-authorization rate by at least ten points with a paired bootstrap 95% lower
  bound above zero;
- beats SFT-only on the same metric with lower bound above zero;
- stays within the two-point refusal/auto-resolution safety margin;
- does not worsen normalized tactical regret on accepted plans;
- reproduces after adapter reload on a clean worker.

If SFT-only already meets the product target and GRPO adds no reliable lift, stop at SFT. If all GRPO groups remain
nearly uniform after SFT, improve data diversity or choose a stronger base before increasing compute. If
authorization rises while tactical regret worsens materially, do not ship; proceed to a separately reviewed Stage B
reward experiment.

### Stop conditions

Stop immediately for reward leakage, policy-visible hidden state, unreplayable authorization, training/evaluation
seed overlap, or inconsistent engine hashes. Stop after two full runs with no held-out gain rather than scaling
blindly. Stop if the API-plus-plays baseline already clears the owner’s product-quality threshold at acceptable
cost.

## 13. Prerequisites for Experiment 1

1. Freeze and version the production MCP tool schemas for the experiment.
2. Add stable machine-readable engine rejection codes while retaining human text.
3. Implement a replayable one-round episode manifest with engine, generator, KB, play, tokenizer, model, and reward
   hashes.
4. Build the isolated stdio-to-OpenEnv adapter with no network or browser port.
5. Prove tool-observation token masking and exact chat-template round trips.
6. Prove hidden rewards cannot be supplied or echoed by the model.
7. Generate the SFT corpus through the authoritative host and replay every positive trajectory.
8. Complete privacy and license review for every corpus source.
9. Define generator-template train/development/test splits before generation.
10. Freeze at least 200 final states unavailable to training and tuning.
11. Refresh luna-low and open-base baselines under the exact production aids.
12. Pre-register success margins, retry policy, decoding parameters, and exclusion rules.
13. Run a one-day Qwen3.5-9B compatibility spike through one backward pass and adapter reload.
14. Estimate observed tokens and episode wall time from the 64-state smoke test before purchasing the full run.
15. Create reward-discrepancy and surprising-policy trace review tooling.
16. Preserve base, SFT, and RL adapters independently for ablation and rollback.

## 14. Bottom line

The project should not begin with “train a DM.” It should begin with “train a proposer that reliably earns
authorization.” That objective is narrow, reproducible, and uniquely supported by the existing engine. The first
checkpoint can test whether online RL adds value beyond SFT, plays, correction, and a cheap API model. If it does,
deterministic rollout supplies the next reward without inventing a learned tactical oracle. If it does not, the
experiment still leaves a reusable environment, a validated corpus, and a sharper measurement of where model quality
actually matters. Narration should remain downstream of authoritative mechanics and should use preference learning
only after the tactical loop is stable. The core strategic advantage is not a particular model or RL acronym. It is
the project’s ability to tell, independently and replayably, whether the agent’s proposed action can really
happen.
