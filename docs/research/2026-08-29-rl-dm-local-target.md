# D409.2 addendum: a local game-time AI DM

Date: 2026-08-29
Status: research recommendation
Target: replace both Luna and Codex during play with one locally served model.
Deployment floor: one 8 GB GPU, or a CPU with 12 GB free RAM and an SSD.
Required serving context: 32,768 usable tokens.
Required KV-cache storage class: 3–4 bit.
Distribution context: the public repository's local-npm mode, with zero API keys.
This is an addendum to the
[base training report](./2026-08-29-rl-dm-training.md).
It changes the deployment target and therefore the base-model shortlist.
It does not repeat or replace that report's engine-verified reward design,
arena design, or staged SFT-to-GRPO argument.

## Decision in one page

The realistic ceiling is a dense model of roughly 9B parameters at a good
mixed 4-bit weight quantization.
Nine billion is a narrow fit on an actual 8 GB GPU, not a blanket guarantee.
Four to five billion is the comfortable tier.
A 12B dense model is a CPU-only edge case under the stated 12 GB allowance,
and is not a responsible universal 8 GB target.
“Active parameters” do not determine whether an MoE fits.
All expert weights must live in GPU memory, RAM, or be fetched from SSD.
Consequently, GLM-5.3-Flash, Kimi K3, and DeepSeek-V4-Flash are categorically
outside the envelope despite attractive active-parameter counts.
SSD expert paging is not a viable default for an interactive game loop.
The best current production candidate is **Qwen3.5-9B**.
The best first prototype and safe fallback is **Qwen3.5-4B**.
The useful independent control is **Gemma 4 E4B**.
All three have permissive Apache-2.0 model releases, current tool-oriented
instruction variants, and documented contemporary fine-tuning paths.
Qwen3.5's 3:1 linear/full-attention hybrid is the decisive memory feature:
only eight of 32 layers have a token-growing attention cache.
At 32K, its estimated q4_0 KV plus recurrent state is about **338 MiB** for
one sequence.
That is much smaller than a conventional 32-layer GQA cache, which is about
**1.125 GiB** under the comparison assumptions below.
On this architecture, moving the growing cache from effective 4.5 bits to
3.5 bits saves only about 64 MiB.
That saving is not worth assuming a 3-bit quality risk in tool JSON.
Use 4-bit KV for the product target.
Treat 3-bit KV as an experimental arm, not the default.
The first de-risking action is not training.
Serve untouched Qwen3.5-9B and Qwen3.5-4B weight-quantized builds on the exact
8 GB GPU and 12 GB-RAM CPU targets at 32K.
Run the existing conformance suite and arena through the existing
Ollama/OpenAI-compatible adapter.
For each model, compare an f16/q8 KV control with q4 KV.
If Qwen3.5-9B cannot meet the hardware and latency gates, use 4B rather than
trying to rescue 9B with 3-bit KV.
Train the winner on rented 48–80 GB accelerator capacity.
Deployment hardware is not the training target.

## 1. Deployment envelope first

### 1.1 Budget rules

The nominal weight payload is:
`parameters × effective bits per weight ÷ 8`.
At 4.5 effective bits per weight, the idealized payloads are:

| Parameters | Ideal payload | Fit interpretation |
|---:|---:|---|
| 4B | 2.10 GiB | Comfortable |
| 8B | 4.19 GiB | Comfortable |
| 9B | 4.71 GiB | Viable, subject to artifact overhead |
| 12B | 6.29 GiB | Marginal on 8 GB before runtime allocations |
| 16B | 8.38 GiB | Does not fit 8 GB even before KV and runtime |

These are lower-bound arithmetic, not GGUF file-size promises.
Mixed quantizers keep some tensors at higher precision.
Metadata, embeddings, output tensors, alignment, compute buffers, graph memory,
and the runtime itself add overhead.
As an artifact check, a published Qwen3.5-4B Q4_K_M file is 2.52 GiB,
not the 2.10 GiB idealized payload ([artifact listing](https://ossmodeldb.com/models/qwen3-5-4b/q4-k-m)).
A published Qwen3.5-9B Q4_K_M artifact is about 6.17 GB ([artifact repository](https://modelscope.cn/models/bartowski/Qwen_Qwen3.5-9B-GGUF)).
Those listings are observations about particular conversions.
They are not upstream guarantees and must be replaced by measurements of the
exact pinned artifact before release.
For the 8 GB GPU target, reserve roughly 0.7–1.2 GiB for driver/runtime,
graphs, compute buffers, and allocator headroom.
That is an engineering reserve, not a universal CUDA constant.
The prototype must therefore measure peak resident device memory.
The working GPU budget is approximately 6.5–7.0 GiB for weights, model state,
and the one active sequence.
For the CPU target, reserve 1–1.5 GB of the stated 12 GB free RAM for the
runtime, temporary buffers, the host application, and operating margin.
The working resident model budget is therefore approximately 10.5 GB.
Memory mapping a file from SSD does not make its actively touched pages free.
The CPU gate must record resident set size and swap activity, not just model
file size.

### 1.2 KV arithmetic

For an ordinary GQA layer, the length-growing cache is:
`2 × layers × KV heads × head dimension × context × bytes per stored value`.
The factor two is for keys and values.
llama.cpp's q4_0 encoding stores 32 values in 18 bytes, or an effective
4.5 bits per value ([llama.cpp tensor encodings](https://github.com/ggml-org/llama.cpp/wiki/Tensor-Encoding-Schemes)).
“4-bit KV” below therefore uses 0.5625 bytes per stored scalar unless a runtime
documents another encoding.
At 32,768 tokens, a conventional comparison model with 32 cached layers,
eight KV heads, and head dimension 128 needs:
`2 × 32 × 8 × 128 × 32768 × 0.5625 = 1,207,959,552 bytes`.
That is **1.125 GiB** for one sequence.
KV memory multiplies by concurrent sequence/slot count.
The product budget assumes one active game-time generation slot.

### 1.3 Qwen3.5 hybrid cache

Qwen3.5-4B and Qwen3.5-9B use 32 layers with a 3:1 ratio of Gated DeltaNet
linear attention to ordinary full attention ([9B model card](https://huggingface.co/Qwen/Qwen3.5-9B),
[Transformers architecture documentation](https://huggingface.co/docs/transformers/model_doc/qwen3_5)).
Their configs place a full-attention layer every fourth layer, for eight full
layers total ([9B config](https://huggingface.co/Qwen/Qwen3.5-9B/raw/main/config.json),
[4B config](https://huggingface.co/Qwen/Qwen3.5-4B/raw/main/config.json)).
Each full layer has four KV heads of dimension 256.
The q4_0 length-growing cache at 32K is therefore:
`2 × 8 × 4 × 256 × 32768 × 0.5625 = 301,989,888 bytes`.
That is **288 MiB**.
The 24 DeltaNet layers use fixed recurrent state rather than a token-growing
K/V history.
The Transformers implementation exposes a recurrent state shaped by heads,
key dimension, and value dimension ([implementation](https://github.com/huggingface/transformers/blob/main/src/transformers/models/qwen3_next/modeling_qwen3_next.py)).
Using the published 32 value heads and 128×128 state dimensions in float32,
the recurrent matrices total about 48 MiB for 24 layers.
The short convolution states add about 1.5 MiB.
The one-sequence model-state estimate is therefore:

| Qwen3.5 state at 32K | Estimate |
|---|---:|
| Growing q4_0 K/V | 288 MiB |
| Fixed DeltaNet recurrent and convolution state | 49.5 MiB |
| Total | **337.5 MiB** |

At 16K the total is about 193.5 MiB because only the K/V portion halves.
If a 3.5-bit storage scheme were otherwise identical, the 32K growing cache
would fall from 288 MiB to 224 MiB.
The fixed state would not change.
The total would fall only from about 337.5 MiB to 273.5 MiB.
This is the central deployment finding:
**hybrid attention buys more than risky 3-bit KV on Qwen3.5.**

### 1.4 Gemma 4 E4B cache

Gemma 4 E4B alternates five local sliding-window layers with one global layer,
using a 512-token local window and seven global layers across 42 layers ([model card](https://huggingface.co/google/gemma-4-E4B-it),
[config](https://huggingface.co/google/gemma-4-E4B-it/raw/main/config.json)).
Its config reports two KV heads, a 512 global head dimension, and a 256 local
head dimension.
A conservative q4_0 upper bound at 32K, without taking credit for further KV
sharing, is:

| Gemma 4 E4B state | Estimate |
|---|---:|
| Seven global layers | 252 MiB |
| Thirty-five 512-token local windows | 9.8 MiB |
| Total upper bound | **261.8 MiB** |

Unsloth reports roughly 5.5–6 GB total inference memory for a 4-bit E4B setup ([Gemma 4 guide](https://unsloth.ai/docs/models/gemma-4)).
That leaves meaningful but not unlimited room on an 8 GB device.

### 1.5 DeepSeek MLA cache

DeepSeek-V2-Lite uses Multi-head Latent Attention (MLA).
Instead of caching separate full-size keys and values for every head, it caches
a compressed joint latent plus a small rotary component ([paper](https://arxiv.org/abs/2405.04434),
[model card](https://huggingface.co/deepseek-ai/DeepSeek-V2-Lite-Chat)).
Its config gives latent rank 512, rotary dimension 64, and 27 layers ([config](https://huggingface.co/deepseek-ai/DeepSeek-V2-Lite-Chat/raw/main/config.json)).
A native 576-value MLA cache at q4_0 and 32K is about **273.4 MiB**.
Runtime representation matters.
llama.cpp's current DeepSeek conversion code explicitly expands MLA to an MQA
representation ([conversion source](https://github.com/ggml-org/llama.cpp/blob/master/conversion/deepseek.py)).
That representation stores a 576-wide key and a 512-wide value.
Its equivalent q4_0 32K cache is about **516.4 MiB**.
A paper's cache ratio is therefore not a deployment measurement.
The exact runtime path must preserve the advertised latent-cache format for the
full MLA memory win to materialize.

### 1.6 The 32K lifecycle problem

The measured prompt need is approximately 16K base state plus 10K per room.
One room therefore reaches about 26K.
Two rooms reach about 36K.
The 32K target does not hold two full room transcripts without compaction.
The local product must perform a deterministic room-boundary state extraction
and transcript compaction before the second room exhausts the window.
A model advertising 128K or one million tokens does not remove that product
requirement under this hardware budget.
The 32K measurement must count the model's actual chat template, tool schemas,
tool results, and any reasoning tokens retained in history.
“32K model context” is not automatically 32K usable application content.

### 1.7 Dense versus MoE with offload

For a dense model, total and active parameters are approximately the same for
weight-residency purposes.
For an MoE, only selected experts compute each token, but every expert remains
part of the checkpoint.
An 18B-active, 320B-total model still needs roughly 160 GB for ideal 4-bit
weights before overhead.
CPU offload only changes where those bytes live.
It does not make a 160 GB model fit in 12 GB RAM.
llama.cpp exposes CPU MoE controls, confirming that expert placement is a
runtime concern rather than removal of weights ([server options](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
Current discussion around asynchronous expert transfer also describes the cost
of serial CPU/GPU expert movement ([llama.cpp issue](https://github.com/ggml-org/llama.cpp/issues/26448)).
SSD paging would make expert availability depend on storage latency and page
cache behavior on nearly every generated token.
That is acceptable as a research demonstration, not as the default AI DM in a
zero-configuration npm product.
The local target should reject any model whose **total** quantized weights do
not fit the relevant RAM budget.

### 1.8 Envelope verdict

| Class | 8 GB GPU | CPU / 12 GB free RAM | Verdict |
|---|---|---|---|
| Dense 4–5B q4 | Comfortable | Comfortable | Primary safe tier |
| Dense 8–9B q4 | Narrow but realistic | Realistic | Quality tier to prove |
| Dense 12B q4 | Not universal | Marginal | Do not make the default |
| Dense 16B q3/q4 | No | At or beyond limit | Reject |
| MoE ≤16B total | Same total-weight rule | Same total-weight rule | Consider only if artifact fits |
| MoE hundreds of billions total | No | No | Reject regardless of active count |

## 2. Owner-named efficiency lineages

### 2.1 “ox-alpha” / GLM-5.3-Flash

The name is real.
Z.ai identifies the anonymous `ox-alpha` preview as GLM-5.3-Flash ([official announcement](https://z.ai/blog/glm-5.3-flash)).
It is a 320B-total, 18B-active MoE with 45 layers.
Its efficiency lineage combines sparse MoE routing with hybrid sparse and
linear attention.
Its IndexPool mechanism compresses indexer keys.
Z.ai reports 4.4× lower KV-cache use than GLM-5.3 ([official announcement](https://z.ai/blog/glm-5.3-flash)).
The open model is released under MIT ([model card](https://huggingface.co/zai-org/GLM-5.3-Flash),
[license](https://huggingface.co/zai-org/GLM-5.3-Flash/raw/main/LICENSE)).
Its tool evidence is strong but vendor-reported.
The announcement reports 78.4 on Toolathlon Verified and 48.8 on
AutomationBench.
No envelope-fitting GLM-5.3-Flash size exists in the official release.
Ideal 4-bit weights alone are about 160 GB.
**Verdict: learn from the sparse/linear and index-compression design; do not
prototype the checkpoint.**

### 2.2 DeepSeek small and Lite variants

DeepSeek-V2-Lite is the relevant genuinely smaller open MLA checkpoint.
It has about 16B total parameters and 2.4B active parameters, with a published
32K context for the chat model ([official model card](https://huggingface.co/deepseek-ai/DeepSeek-V2-Lite-Chat)).
MLA is the important lineage contribution.
The V2 paper reports a 93.3% KV reduction against its DeepSeek-67B comparison
through latent key/value compression ([paper](https://arxiv.org/abs/2405.04434)).
The weight footprint, not the KV footprint, breaks the universal target.
Published GGUF artifacts list Q4_K_M at 10.4 GB and Q3_K_M at 8.13 GB ([artifact repository](https://huggingface.co/second-state/DeepSeek-V2-Lite-Chat-GGUF)).
Q4 leaves insufficient operating margin for an 8 GB GPU.
Q3 is still essentially the entire device and is published with quality-loss
warnings in that artifact family.
On a CPU with 12 GB free RAM, Q4 is marginal and Q3 is possible but unattractive.
The V2-Lite weights use DeepSeek's custom model license, including use
restrictions, rather than the clean Apache/MIT posture preferred here ([license](https://huggingface.co/deepseek-ai/DeepSeek-V2-Lite-Chat/blob/main/LICENSE)).
The old Lite card does not provide current native tool-calling benchmark
evidence comparable to Qwen3.5's BFCL table.
DeepSeek-V4-Flash is newer and MIT-licensed, and combines compressed attention
with a 284B-total/13B-active MoE design ([official model](https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash),
[technical overview](https://huggingface.co/blog/deepseekv4)).
DeepSeek's API documentation supports tool calls and JSON output, and its
updates report Toolathlon results for current models ([API features](https://api-docs.deepseek.com/quick_start/pricing),
[updates](https://api-docs.deepseek.com/updates/)).
V4-Flash still needs at least about 142 GB at ideal 4-bit weight storage.
There is no current official DeepSeek “small” checkpoint that combines:

- a comfortable 8 GB total-weight fit;
- native MLA preservation in the selected runtime;
- a clean permissive weight license; and
- current, evidenced native tool calling.

**Verdict: MLA is the best KV-compression idea in this lineage, but the released
models do not beat the shortlisted deployment packages.**

### 2.3 Kimi K3 and alleged small variants

Kimi K3 is real; an official small K3 release is not.
The official K3 checkpoint has 2.8 trillion total parameters and 104B active
parameters ([official model card](https://huggingface.co/moonshotai/Kimi-K3)).
Its efficiency lineage combines 69 Kimi Delta Attention layers, 24 gated MLA
layers, and a very sparse 896-expert MoE.
Sixteen routed experts plus two shared experts are active per token.
It uses MXFP4 weights and MXFP8 activations, with quantization-aware training
from supervised fine-tuning onward.
It is a strong proof that native low-precision training and attention-state
compression can coexist with tool agents.
The model card reports 76.5 on Toolathlon Verified, 94.5 on MCPMark Verified,
and 84.2 on MCP-Atlas.
Those are model-author results, not measurements in this project's arena.
Ideal 4-bit K3 weights would require about 1.4 TB.
No amount of 12 GB CPU offload makes that a local candidate.
The official Moonshot model list contains no smaller K3 checkpoint ([official model collection](https://huggingface.co/moonshotai/models)).
The closest older small-active Moonshot releases are not K3 variants.
Moonlight-16B-A3B is 16B total/3B active and has an 8K context ([model card](https://huggingface.co/moonshotai/Moonlight-16B-A3B-Instruct)).
Kimi-VL-A3B is a roughly 16B-total visual-language model rather than a compact
K3 tool-DM release ([model card](https://huggingface.co/moonshotai/Kimi-VL-A3B-Instruct)).
K3 uses a custom license.
It grants broad use and modification, but adds service and very-large-product
conditions that require legal review for distribution strategy ([license](https://huggingface.co/moonshotai/Kimi-K3/raw/main/LICENSE)).
**Verdict: K3's QAT, KDA, MLA, and sparse-routing results are research signals;
there is no shippable K3-size candidate for this envelope.**

### 2.4 Gemma and TurboQuant

TurboQuant is not a special Gemma checkpoint.
It is not weight QAT.
It is not a per-layer weight-quantization recipe.
TurboQuant is an online, data-oblivious, post-training method for compressing
the dynamic KV-cache vectors ([Google Research](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/),
[paper](https://arxiv.org/abs/2504.19874)).
It applies a random rotation, scalar quantization, and a one-bit QJL correction
for the quantization residual.
It needs no model fine-tuning or calibration data.
The paper reports approximately neutral quality at 3.5 bits and marginal
degradation at 2.5 bits on its evaluated models and tasks.
Those aggregate results do not prove exact tool-argument fidelity.
The practical vLLM evaluation is more cautious ([vLLM study](https://vllm-project.github.io/2026/05/11/turboquant.html)).
TurboQuant compresses storage but dequantizes to BF16 for attention.
The vLLM study finds 4-bit-no-correction a plausible edge tradeoff.
It also reports material accuracy and throughput costs for tested 3-bit modes,
including roughly 30% relative retrieval-AUC degradation in one Qwen3 30B case.
At publication, that implementation supported standard attention rather than
sliding-window or hybrid attention.
We therefore cannot assume upstream TurboQuant supports either Qwen3.5's
DeltaNet hybrid or Gemma 4's local/global pattern.
Gemma 4 E4B itself is a separate efficiency candidate.
It has 4.5B effective parameters and about 8B total parameters including
per-layer embeddings, plus sliding-window attention ([official model card](https://huggingface.co/google/gemma-4-E4B-it)).
Google describes Gemma 4 as supporting native function calling, structured
JSON, and system prompts ([official announcement](https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/),
[function-calling guide](https://ai.google.dev/gemma/docs/capabilities/text/function-calling-gemma4)).
The E4B model card reports a Tau2 tool-agent score of 42.2.
It is released under Apache 2.0 according to the official model card.
**Verdict: Gemma 4 E4B is a real candidate; TurboQuant is an optional runtime
experiment, not the reason it fits and not a production assumption.**

### 2.5 Lineage summary

| Lineage | Efficiency win | Envelope-fitting open model? | License posture | Tool evidence | Result |
|---|---|---|---|---|---|
| GLM-5.3-Flash / ox-alpha | Sparse MoE, hybrid attention, IndexPool | No: 320B total | MIT | Strong author benchmarks | Idea only |
| DeepSeek V2 Lite | MLA latent KV | Marginal CPU, no safe 8 GB fit | Custom weights | Weak/currently unmatched | Exclude |
| DeepSeek V4 Flash | CSA/HCA plus sparse MoE | No: ~284B total | MIT | Current API/author evidence | Idea only |
| Kimi K3 | KDA+MLA, huge sparse MoE, native QAT | No: 2.8T total; no K3-small | Custom conditions | Strong author benchmarks | Idea only |
| Gemma 4 E4B | Sliding/global attention, PLE | Yes | Apache 2.0 | Native functions/JSON; Tau2 | Candidate |
| TurboQuant | Online post-hoc KV compression | Runtime method, not a model | Paper/code-specific | No exact tool-JSON proof | Experimental arm |

## 3. KV-cache quantization state of practice

### 3.1 What can be served today

Upstream llama.cpp exposes separate key- and value-cache types.
Its server accepts f32, f16, bf16, q8_0, q4_0, q4_1, iq4_nl, q5_0, and q5_1
for cache storage ([server documentation](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
There is no upstream 3-bit KV type in that interface.
TurboQuant work for llama.cpp is currently discussed through non-upstream
implementations rather than a stable built-in server option ([llama.cpp discussion](https://github.com/ggml-org/llama.cpp/discussions/20969)).
Transformers' quantized cache supports HQQ int2/int4/int8 and Quanto int2/int4,
and warns that cache quantization can reduce latency performance for shorter
contexts ([Transformers KV-cache guide](https://github.com/huggingface/transformers/blob/main/docs/source/en/kv_cache.md)).
There is no standard int3 path there either.
The deployment-ready intersection is therefore **4-bit KV**, not generic
“3–4 bit.”
Three-bit deployment would bind the product to a specific experimental runtime
or custom fork.

### 3.2 Post-hoc quantization has real cliffs

KIVI demonstrates a tuning-free asymmetric 2-bit cache using different
per-channel/per-token treatment for keys and values ([paper](https://arxiv.org/abs/2402.02750)).
KVQuant shows that sub-4-bit quality depends on choices such as pre-RoPE key
quantization, non-uniform datatypes, per-channel scaling, and outlier handling ([paper](https://arxiv.org/abs/2401.18079)).
These papers show that very-low-bit KV is possible.
They do not show that any runtime's generic q3 cache is interchangeable with a
carefully designed research method.
The vLLM TurboQuant evaluation provides the most relevant practical warning:
its 3-bit variants lose more accuracy and can be slower than the 4-bit mode ([vLLM study](https://vllm-project.github.io/2026/05/11/turboquant.html)).
Backend regressions are another risk.
A llama.cpp CUDA report documented deterministic gibberish with q4 KV on an
affected version ([issue](https://github.com/ggml-org/llama.cpp/issues/23693)).
A separate HIP report used an exact JSON tool-call reproduction and found
backend-dependent corruption across cache types ([issue](https://github.com/ggml-org/llama.cpp/issues/27579)).
These are implementation bugs, not evidence that q4 KV is intrinsically bad.
They do prove that runtime version, backend, and cache type belong in the
release artifact and test matrix.

### 3.3 QAT, QLoRA, weight quantization, and KV quantization differ

Four distinct operations must not be conflated:

1. Weight QAT trains a checkpoint to tolerate a weight/activation format.
2. QLoRA quantizes frozen base weights to save training memory while adapters train.
3. Final weight quantization creates the deployed model artifact.
4. KV quantization compresses dynamic inference state generated from each prompt.

Kimi K3's MXFP4/MXFP8 QAT is an example of operation one ([K3 model card](https://huggingface.co/moonshotai/Kimi-K3)).
TurboQuant is an example of operation four and explicitly requires no training ([Google Research](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/)).
Training a LoRA does not automatically make the resulting model robust to an
arbitrary KV quantizer.
KV format must be an explicit deployment evaluation dimension.

### 3.4 Tool-calling and JSON risk

No primary result located for these candidates establishes non-inferiority of
q3 or q4 KV on exact-match tool-call JSON at 32K.
Needle retrieval, perplexity, aggregate benchmark accuracy, and natural-language
judge preference are insufficient substitutes.
One altered quote, brace, enum value, identifier, or numeric argument can make
an otherwise fluent tool call unusable.
A grammar can guarantee syntactic JSON.
It cannot guarantee the correct tool, entity identifier, argument semantics,
or action order.
The required comparison is paired and application-native:

- identical prompt and model weights;
- f16 or q8 KV as the control;
- q4_0 and q4_1/iq4_nl where supported;
- experimental 3–3.5-bit TurboQuant only where the architecture is supported;
- exact tool-name and argument comparison;
- engine-valid transition rate;
- arena outcome and judge preference;
- long-history slices near 16K, 26K, and 32K.

Product default: q4 KV.
Product rejection rule: if q4 causes a material tool-conformance regression
against q8/f16, the model/runtime pair fails the stated target.
Do not hide that failure by relying only on constrained decoding.

## 4. Trainability under the engine-verified RL plan

### 4.1 Qwen3.5

Qwen3.5 has current, explicit ecosystem support rather than merely generic
Transformer compatibility.
Unsloth documents fine-tuning for the 0.8B, 2B, 4B, 9B, and 27B dense models,
including LoRA and reinforcement-learning workflows ([Qwen3.5 guide](https://unsloth.ai/docs/models/qwen3.5/fine-tune)).
TRL's current GRPO documentation includes Qwen3.5 and experimental multi-turn
tool environments ([GRPO documentation](https://huggingface.co/docs/trl/grpo_trainer)).
The hybrid architecture is trainable with adapters on its projection and MLP
linear layers.
It is not operationally identical to a plain attention-only Llama.
Transformers warns that the fallback path can be slow and memory-heavy without
the intended causal-convolution and linear-attention kernels ([architecture documentation](https://huggingface.co/docs/transformers/model_doc/qwen3_5)).
Current stack issues reinforce the need for a pinned smoke test.
TRL has tracked asynchronous GRPO weight-sync problems involving current
Qwen3.5/Gemma 4 paths ([issue](https://github.com/huggingface/trl/issues/6028)).
It has also tracked a Qwen tool-template suffix defect ([issue](https://github.com/huggingface/trl/issues/5317)).
These are maturity risks, not reasons to reject Qwen3.5.
Use synchronous, text-only GRPO first.
Before a full run, prove one complete cycle:

- render the production tool template;
- generate a multi-turn tool trajectory;
- execute the tool result through the environment;
- compute the external engine reward;
- backpropagate one adapter update;
- refresh the rollout worker's weights;
- regenerate and verify the changed policy is actually served.

### 4.2 Gemma 4

Google documents LoRA/PEFT fine-tuning for Gemma ([official tuning guide](https://ai.google.dev/gemma/docs/tune)).
TRL lists Gemma 4 support in its GRPO stack ([GRPO documentation](https://huggingface.co/docs/trl/v1.8.0/en/grpo_trainer)).
Unsloth also documents Gemma 4 LoRA, QLoRA, and GRPO paths ([Gemma 4 guide](https://unsloth.ai/docs/models/gemma-4)).
Gemma's current training path is sufficiently mature for a control candidate.
Its lower reported tool-agent score makes it less attractive than Qwen3.5 as
the first expensive RL run.

### 4.3 DeepSeek Lite, GLM, and Kimi

DeepSeek-V2-Lite can be adapter-tuned in generic stacks.
That fact does not solve its marginal deployment fit, old tool specialization,
custom weight license, or runtime-dependent loss of native MLA caching.
GLM-5.3-Flash and Kimi K3 require custom hybrid/MoE kernels and enormous total
checkpoints before fine-tuning begins.
Their architectures are not impossible to train.
They are irrelevant to this deployment envelope.
There is no value in paying integration cost for a model that cannot be shipped.

### 4.4 What the architecture changes in the training plan

The base report's engine-verified GRPO reward remains the correct objective.
The local target changes the operational sequence:

1. Prove the untouched, quantized serving path first.
2. Choose the architecture only after target-hardware conformance data.
3. Run LoRA/QLoRA SFT on rented training hardware.
4. Run synchronous engine-verified GRPO with full-precision training-time KV.
5. Merge/export the adapter into pinned deployment weight artifacts.
6. Re-run evaluation under q8/f16 and q4 deployment KV.
7. Reject improvements that disappear after deployment quantization.

Do not put quantized KV inside the initial policy-training loop.
It complicates rollout/training log-probability parity and confounds reward
learning with runtime approximation.
First optimize the policy.
Then prove that the chosen serving approximation preserves it.
Train Qwen3.5-9B on a 48–80 GB cloud accelerator class for operational margin.
Unsloth's published LoRA estimates put 4B at about 10 GB and 9B at about 22 GB
before the larger rollout costs of GRPO ([Qwen3.5 guide](https://unsloth.ai/docs/models/qwen3.5/fine-tune)).
A 24 GB card may be adequate for a constrained QLoRA/SFT stage.
It is not the recommended place to debug multi-generation GRPO rollouts.
The public product still runs locally; temporary training infrastructure does
not create a game-time API-key dependency.

## 5. Revised base-model recommendation

### Rank 1: Qwen3.5-9B

**Why first:** best combination of likely policy capacity, tiny hybrid cache,
current tool competence, permissive license, and available training support.
The official model card reports BFCL-V4 66.1 and Tau2 79.1 ([model card](https://huggingface.co/Qwen/Qwen3.5-9B)).
It also documents official tool parsers for current SGLang/vLLM serving paths.
The weights are Apache 2.0 ([license](https://huggingface.co/Qwen/Qwen3.5-9B/raw/main/LICENSE)).
Its q4 weight artifact plus roughly 338 MiB model state is a plausible but
narrow 8 GB fit.
It should fit the 12 GB CPU allowance with operating margin if the exact
artifact stays near the observed Q4_K_M size.
**Blunt limitation:** an “8 GB GPU” with substantial display use, an inefficient
backend, or a larger conversion may OOM.
This rank is conditional on measurement on the floor hardware.

### Rank 2: Qwen3.5-4B

**Why second:** same 3:1 hybrid cache design, much larger memory margin, same
Apache license, and the clearest cross-platform local default.
The official card reports BFCL-V4 50.3, Tau2 79.9, and DeepPlanning 17.6 ([model card](https://huggingface.co/Qwen/Qwen3.5-4B)).
Its lower BFCL score is the main concern.
Its Tau2 result is strong enough that it must be tested rather than dismissed
solely by parameter count.
It is the correct first plumbing prototype and the fallback if 9B misses the
memory or latency floor.
**Blunt limitation:** RL cannot be assumed to manufacture missing planning
capacity; the paired Luna-low arena decides whether 4B is sufficient.

### Rank 3: Gemma 4 E4B

**Why third:** comfortable local fit, compact sliding/global cache, Apache 2.0,
native function/structured-JSON positioning, and current LoRA/GRPO support.
It provides a genuinely different architecture and tokenizer/template control.
It should not be promoted on the basis of TurboQuant.
The practical TurboQuant integration does not yet establish support for this
hybrid attention pattern ([vLLM study](https://vllm-project.github.io/2026/05/11/turboquant.html)).
Its reported Tau2 42.2 trails the Qwen candidates materially ([model card](https://huggingface.co/google/gemma-4-E4B-it)).
**Blunt limitation:** use it as an independent control unless the local arena
contradicts the published tool evidence.

### Excluded from the training shortlist

| Model | Reason for exclusion |
|---|---|
| GLM-5.3-Flash | 320B total; at least ~160 GB ideal q4 weights |
| Kimi K3 | 2.8T total; no official small K3 checkpoint |
| DeepSeek-V4-Flash | ~284B total; active count does not solve residency |
| DeepSeek-V2-Lite | 16B total, marginal Q3/Q4 fit, custom license, old tool evidence |
| Moonlight-16B-A3B | 16B total and only 8K published context |
| Kimi-VL-A3B | ~16B total and visual-agent focus, not a K3-small tool model |

### Licensing and repository posture

The repository's CC-BY posture does not relicense model weights.
Qwen3.5 and the shortlisted Gemma release have the cleanest candidate posture
because their official releases identify Apache 2.0 licenses ([Qwen license](https://huggingface.co/Qwen/Qwen3.5-9B/raw/main/LICENSE),
[Gemma model card](https://huggingface.co/google/gemma-4-E4B-it)).
The npm package should not silently embed multi-gigabyte weights.
It should pin a model artifact, checksum, source URL, quantizer/runtime version,
and license notice, then download or guide acquisition explicitly.
Custom-license Kimi and old DeepSeek weights would require additional legal and
distribution review even if their hardware profiles were acceptable ([Kimi license](https://huggingface.co/moonshotai/Kimi-K3/raw/main/LICENSE),
[DeepSeek license](https://huggingface.co/deepseek-ai/DeepSeek-V2-Lite-Chat/blob/main/LICENSE)).

## 6. Revised Experiment 1

### 6.1 Question

Can a locally served, deployment-quantized candidate match or beat Luna-low as
the game-time AI DM while satisfying exact tool and engine conformance?

### 6.2 Phase A: untrained deployment screen

Run this before generating training data or renting training GPUs.
Candidates:

- Qwen3.5-9B instruction model, mixed q4 weights;
- Qwen3.5-4B instruction model, mixed q4 weights;
- Gemma 4 E4B instruction model, mixed q4 weights.

Serve through the existing Ollama/OpenAI-compatible adapter used by the Gemma
trial.
Do not change prompts, schemas, game engine, or arena to accommodate a model.
Use text-only serving for the multimodal-capable candidates.
Use one generation slot and a 32,768-token context.
For every model/backend combination, run:

| Arm | Weight cache | KV cache | Purpose |
|---|---|---|---|
| A | q4 weights | f16 or q8 | Quantized-weight control |
| B | same q4 weights | q4_0 | Product candidate |
| C | same q4 weights | q4_1 or iq4_nl | Alternative if supported |
| D | same q4 weights | 3–3.5-bit TurboQuant | Research only, supported architectures only |

Do not compare different weight artifacts when isolating KV effects.
Run the existing conformance suite unmodified.
Run the existing arena scenarios at short, 16K, 26K, and near-32K histories.
Compare against the current Luna-low game-time policy using the existing arena
and judges from the base report.
Record at minimum:

- peak GPU memory or CPU resident set size;
- swap activity;
- model load time;
- time to first token;
- output tokens per second;
- p50 and p95 full-turn latency;
- exact JSON parse rate;
- exact tool-name and schema conformance;
- engine-valid transition rate;
- tool retry/repair count;
- room-boundary state-retention failures;
- arena win/tie/loss against Luna-low;
- judge preference with model identity hidden.

The base report's qualitative and engine metrics remain authoritative; this
phase adds hardware and quantization dimensions rather than redefining them.

### 6.3 Phase A gates

The 8 GB GPU arm must remain below physical device capacity with meaningful
headroom and without host offload during steady-state generation.
Use a provisional peak target of at most 7.5 GiB, then tighten it from observed
driver/display requirements on supported hardware.
The CPU arm must remain within 12 GB free RAM without sustained swap.
Any model that depends on SSD paging during token generation fails.
The 32K arm must complete through the real tool loop, not a synthetic prompt-only
benchmark.
Q4 KV must show no material regression in exact tool/engine conformance against
the q8/f16 control.
A model that is fluent but emits invalid or wrong actions fails.
Latency should be reported, not hidden behind aggregate tokens per second.
The owner should set the final interactive p95 threshold after seeing the first
hardware trace; no credible universal number follows from model cards alone.

### 6.4 Phase B: SFT and engine-verified GRPO

Select the highest-capacity candidate that passes Phase A on both hardware
floors.
Expected selection: Qwen3.5-9B.
Fallback: Qwen3.5-4B.
Train LoRA/QLoRA SFT on rented 48–80 GB accelerator capacity.
Then apply the base report's engine-verified GRPO plan.
Keep the reward external to the policy model.
Keep hidden evaluation seeds and scenarios out of training.
Use synchronous rollout/training initially to avoid known weight-sync ambiguity.
Save four comparison policies:

1. untouched base;
2. SFT only;
3. SFT plus GRPO;
4. current Luna-low.

Export both the SFT-only and SFT+GRPO policies to the exact q4 deployment weight
format.
Evaluate each with the exact q4 KV runtime that passed Phase A.
The primary result is the deployment artifact's paired arena performance against
Luna-low, not the unquantized training checkpoint's score.
Report both engine conformance and blinded judge preference.
If GRPO improves reward but harms narrative quality or tool validity, it has not
replaced Luna-low.
If the full-precision policy wins but the deployment-quantized policy loses,
the experiment has not met D409.2.

### 6.5 Phase C: packaging proof

Install from a clean checkout in local-npm mode.
Do not provide any API key.
Download or locate the pinned model through the intended user flow.
Verify checksum and license notice.
Start the local runtime without port 4173.
Complete a multi-room session through the public application path.
Measure peak resources again with the application and model co-resident.
A standalone inference benchmark is not packaging proof.

## 7. Prototype this first

### Prototype P0: Qwen3.5 local serving, no training

1. Pin a current llama.cpp/Ollama-compatible Qwen3.5-9B Q4_K_M artifact.
2. Pin the exact runtime build and backend.
3. Configure one slot, 32K context, text-only mode, and q4_0 K/V.
4. Run on a real 8 GB GPU.
5. Run on a CPU constrained to 12 GB free RAM with an SSD.
6. Exercise the existing adapter, schemas, conformance suite, and arena unchanged.
7. Repeat with q8 or f16 KV as the control.
8. Record token-by-token tool-call differences near 26K and 32K.
9. Repeat steps 1–8 with Qwen3.5-4B.

This prototype simultaneously de-risks:

- actual mixed-quant weight size;
- Qwen3.5 runtime support;
- fixed-state plus growing-cache accounting;
- q4 KV correctness;
- 32K allocation behavior;
- tool-template compatibility;
- CPU performance;
- the real application's co-resident memory use.

It costs far less than a failed RL run.

### Stop conditions

Stop pursuing 9B as the universal default if it OOMs or requires CPU weight
offload on a representative 8 GB device.
Move to Qwen3.5-4B before trying 3-bit KV.
Stop pursuing a runtime/cache combination if q4 materially degrades exact tool
or engine conformance against q8/f16.
Stop pursuing any MoE whose total pinned weight artifact exceeds the resident
RAM budget, regardless of active parameter count.
Stop treating TurboQuant as a candidate dependency until the selected runtime
supports the selected hybrid architecture upstream and passes the tool suite.
Stop the training launch if the one-update tool-trajectory smoke test cannot
prove rollout-worker weight refresh.

### Success condition

D409.2 succeeds only when the same downloadable local artifact:

- runs at 32K on both target hardware profiles;
- uses a proven 4-bit KV path;
- needs no API key;
- passes the existing tool and engine conformance suite;
- survives multi-room compaction and state retention;
- and matches or beats Luna-low in the paired arena and blinded judges.

The named frontier efficiency lineages strengthen the architecture rationale.
They do not relax the physical memory budget.
The shortest credible path is therefore:
**Qwen3.5-9B q4 if measured fit permits; Qwen3.5-4B otherwise; Gemma 4 E4B as
the independent control; 4-bit KV; train remotely, serve locally.**
