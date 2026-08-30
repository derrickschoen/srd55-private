# CPU SFT proof of concept

This increment is tooling plus one bounded 30-step supervised fine-tuning smoke
run. Sustained SFT waits for a substantially larger corpus, and GRPO waits for
real GPU capacity and a separate reviewed increment.

## Base model

The originally requested Hub id, `Qwen/Qwen3.5-2B-Instruct`, does not exist.
The owner authorized substituting Qwen's official Apache-2.0 post-trained model,
`Qwen/Qwen3.5-2B`. Both scripts use that exact id by default. This is plain LoRA
over CPU bf16 base weights; bitsandbytes and CUDA-only 4-bit QLoRA are not used.

## Environment

From the worktree root:

```bash
python3 -m venv .venv-rl
.venv-rl/bin/python -m pip install -r tools/rl/requirements.txt
```

On Debian systems where `python3 -m venv` lacks `ensurepip`, install the OS
`python3-venv` package or use an already-installed `virtualenv` without changing
the destination:

```bash
python3 -m virtualenv .venv-rl
.venv-rl/bin/python -m pip install -r tools/rl/requirements.txt
```

CPU Torch comes from PyTorch's CPU wheel index declared in `requirements.txt`.
The scripts default `HF_HOME` to the ignored `tools/rl/.cache/huggingface`
directory, keeping every downloaded artifact inside this worktree and outside
version control. The scripts do not use or bind an HTTP port.

## Data and split

`--data` accepts one or more paths or shell-style glob patterns. Inputs may use
the extractor's canonical three-message `messages` shape or flat `system`,
`user`, and `assistant` strings. The final assistant content must be an exact
JSON object. A deterministic content-hash split reserves six examples by
default; training and evaluation reproduce the same held-out set regardless of
input-file ordering.

Training applies the base tokenizer's chat template. Only assistant completion
tokens receive labels; system/user and assistant-prefix tokens are masked.
Sequences longer than 4096 tokens are left-truncated within the prompt so the
complete target remains supervised. The script prints machine-readable
truncation statistics before loading model weights.

## Bounded smoke commands

The authorized smoke run is exactly:

```bash
export OMP_NUM_THREADS=12
/usr/bin/time -v .venv-rl/bin/python tools/rl/train_sft.py \
  --data /home/vagrant/.claude/jobs/c68ffdd0/tmp/sft-batch1.jsonl \
  --out tools/rl/runs/sft-smoke-30 \
  --epochs 20 \
  --lr 2e-4 \
  --max-steps 30
```

Evaluate the matching six-example holdout with greedy decoding:

```bash
export OMP_NUM_THREADS=12
/usr/bin/time -v .venv-rl/bin/python tools/rl/eval_gen.py \
  --data /home/vagrant/.claude/jobs/c68ffdd0/tmp/sft-batch1.jsonl \
  --adapter tools/rl/runs/sft-smoke-30 \
  --n 6
```

For a later interrupted authorized run, pass `--resume` alone to use the latest
checkpoint under `--out`, or pass a specific checkpoint path. Do not use a smoke
adapter as evidence of production quality: JSON parse and schema-shape rates are
only cheap plumbing proxies. The authoritative engine arena remains the real
evaluation.
