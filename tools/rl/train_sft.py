#!/usr/bin/env python3
"""CPU-only completion-masked LoRA SFT for the one-round AI DM policy."""

from __future__ import annotations

import argparse
import json
import math
import resource
import time
from pathlib import Path

from sft_common import (
    DEFAULT_HOLDOUT,
    MAX_SEQ_LEN,
    MODEL_ID,
    configure_cpu_threads,
    load_examples,
    split_examples,
    tokenize_training_examples,
    verify_chat_round_trip,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", nargs="+", required=True, help="JSONL paths or glob patterns")
    parser.add_argument("--out", required=True, help="Adapter output directory")
    parser.add_argument("--epochs", type=float, default=3.0)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-steps", type=int, default=-1)
    parser.add_argument(
        "--resume",
        nargs="?",
        const="auto",
        default=None,
        help="Resume a checkpoint path, or the latest under --out when given without a value",
    )
    parser.add_argument("--holdout", type=int, default=DEFAULT_HOLDOUT)
    args = parser.parse_args()
    if args.epochs <= 0:
        parser.error("--epochs must be positive")
    if args.lr <= 0 or not math.isfinite(args.lr):
        parser.error("--lr must be finite and positive")
    if args.max_steps == 0 or args.max_steps < -1:
        parser.error("--max-steps must be -1 or positive")
    return args


def latest_checkpoint(output_dir: Path) -> Path:
    checkpoints: list[tuple[int, Path]] = []
    for candidate in output_dir.glob("checkpoint-*"):
        try:
            step = int(candidate.name.removeprefix("checkpoint-"))
        except ValueError:
            continue
        if candidate.is_dir():
            checkpoints.append((step, candidate))
    if not checkpoints:
        raise FileNotFoundError(f"No checkpoint directories found under {output_dir}")
    return max(checkpoints)[1]


def resolve_resume(value: str | None, output_dir: Path) -> str | None:
    if value is None:
        return None
    candidate = latest_checkpoint(output_dir) if value == "auto" else Path(value).resolve()
    if not candidate.is_dir():
        raise FileNotFoundError(f"Resume checkpoint is not a directory: {candidate}")
    return str(candidate)


def projection_targets(model) -> list[str]:
    import torch

    selected: list[str] = []
    observed_groups: set[str] = set()
    for name, module in model.named_modules():
        if not isinstance(module, torch.nn.Linear):
            continue
        pieces = name.split(".")
        if len(pieces) != 6 or pieces[:3] != ["model", "language_model", "layers"]:
            continue
        if not pieces[3].isdigit() or pieces[4] not in {"self_attn", "linear_attn", "mlp"}:
            continue
        selected.append(name)
        observed_groups.add(pieces[4])
    required_groups = {"self_attn", "linear_attn", "mlp"}
    if observed_groups != required_groups:
        raise RuntimeError(
            f"Unexpected Qwen projection groups: observed={sorted(observed_groups)} "
            f"required={sorted(required_groups)}"
        )
    if not selected:
        raise RuntimeError("No language-model attention/MLP projection modules were found")
    return sorted(selected)


class CompletionCollator:
    def __init__(self, pad_token_id: int):
        self.pad_token_id = pad_token_id

    def __call__(self, features):
        import torch

        max_length = max(len(feature["input_ids"]) for feature in features)
        batch = {"input_ids": [], "attention_mask": [], "labels": []}
        for feature in features:
            padding = max_length - len(feature["input_ids"])
            batch["input_ids"].append(feature["input_ids"] + [self.pad_token_id] * padding)
            batch["attention_mask"].append(feature["attention_mask"] + [0] * padding)
            batch["labels"].append(feature["labels"] + [-100] * padding)
        return {key: torch.tensor(value, dtype=torch.long) for key, value in batch.items()}


class JsonlMetricsCallback:
    def __init__(self, path: Path, append: bool):
        self.path = path
        self.started = time.monotonic()
        self.previous_log = self.started
        path.parent.mkdir(parents=True, exist_ok=True)
        if not append:
            path.write_text("", encoding="utf-8")

    def _write(self, payload: dict) -> None:
        with self.path.open("a", encoding="utf-8") as destination:
            destination.write(json.dumps(payload, sort_keys=True) + "\n")

    def on_train_begin(self, args, state, control, **kwargs):
        self.started = time.monotonic()
        self.previous_log = self.started
        self._write({"event": "train_begin", "step": state.global_step})

    def on_log(self, args, state, control, logs=None, **kwargs):
        now = time.monotonic()
        payload = {
            "event": "log",
            "step": state.global_step,
            "epoch": state.epoch,
            "elapsed_seconds": now - self.started,
            "seconds_since_previous_log": now - self.previous_log,
            "peak_rss_kb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        }
        if logs:
            payload.update(logs)
        self.previous_log = now
        self._write(payload)
        print("[train-metric] " + json.dumps(payload, sort_keys=True), flush=True)

    def on_train_end(self, args, state, control, **kwargs):
        self._write(
            {
                "event": "train_end",
                "step": state.global_step,
                "elapsed_seconds": time.monotonic() - self.started,
                "peak_rss_kb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
            }
        )


def main() -> None:
    args = parse_args()
    threads = configure_cpu_threads()

    import torch
    from datasets import Dataset
    from peft import LoraConfig, TaskType, get_peft_model
    from transformers import AutoModelForImageTextToText, AutoTokenizer, TrainerCallback
    from trl import SFTConfig, SFTTrainer

    class MetricsCallback(JsonlMetricsCallback, TrainerCallback):
        pass

    output_dir = Path(args.out).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    resume_checkpoint = resolve_resume(args.resume, output_dir)
    metrics_path = output_dir / "metrics.jsonl"

    examples, load_stats = load_examples(args.data)
    train_examples, heldout_examples = split_examples(examples, args.holdout)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    verify_chat_round_trip(tokenizer, train_examples[0])
    train_rows, truncation_stats = tokenize_training_examples(tokenizer, train_examples)
    data_summary = {
        "event": "data",
        "files": load_stats.files,
        "rows": load_stats.rows,
        "unique_examples": load_stats.examples,
        "duplicates": load_stats.duplicates,
        "train_examples": len(train_examples),
        "heldout_examples": len(heldout_examples),
        "holdout_digests": [example.digest for example in heldout_examples],
        "chat_round_trip": "exact",
        "truncation": truncation_stats.as_dict(),
    }
    print("[sft-data] " + json.dumps(data_summary, sort_keys=True), flush=True)

    model = AutoModelForImageTextToText.from_pretrained(MODEL_ID, dtype=torch.bfloat16)
    model.config.use_cache = False
    if hasattr(model.config, "text_config"):
        model.config.text_config.use_cache = False
    target_modules = projection_targets(model)
    target_summary = {
        "event": "lora_targets",
        "count": len(target_modules),
        "leaf_names": sorted({name.rsplit(".", 1)[-1] for name in target_modules}),
        "groups": sorted({name.split(".")[4] for name in target_modules}),
    }
    print("[sft-model] " + json.dumps(target_summary, sort_keys=True), flush=True)

    model.enable_input_require_grads()
    model.gradient_checkpointing_enable(gradient_checkpointing_kwargs={"use_reentrant": False})
    lora_config = LoraConfig(
        task_type=TaskType.CAUSAL_LM,
        r=16,
        lora_alpha=32,
        lora_dropout=0.0,
        bias="none",
        target_modules=target_modules,
    )
    model = get_peft_model(model, lora_config)
    trainable = sum(parameter.numel() for parameter in model.parameters() if parameter.requires_grad)
    total = sum(parameter.numel() for parameter in model.parameters())
    print(
        "[sft-model] "
        + json.dumps(
            {
                "event": "parameters",
                "dtype": "bfloat16",
                "trainable": trainable,
                "total": total,
                "trainable_fraction": trainable / total,
            },
            sort_keys=True,
        ),
        flush=True,
    )

    save_steps = args.max_steps if args.max_steps > 0 else 100
    training_args = SFTConfig(
        output_dir=str(output_dir),
        per_device_train_batch_size=1,
        gradient_accumulation_steps=1,
        num_train_epochs=args.epochs,
        max_steps=args.max_steps,
        learning_rate=args.lr,
        lr_scheduler_type="linear",
        warmup_steps=0,
        optim="adamw_torch",
        bf16=True,
        fp16=False,
        use_cpu=True,
        use_cache=False,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        max_length=MAX_SEQ_LEN,
        completion_only_loss=True,
        dataset_kwargs={"skip_prepare_dataset": True},
        logging_strategy="steps",
        logging_steps=1,
        logging_first_step=True,
        save_strategy="steps",
        save_steps=save_steps,
        save_total_limit=2,
        report_to="none",
        disable_tqdm=True,
        dataloader_num_workers=0,
        dataloader_pin_memory=False,
        remove_unused_columns=False,
        seed=410,
        data_seed=410,
    )
    callback = MetricsCallback(metrics_path, append=resume_checkpoint is not None)
    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=Dataset.from_list(train_rows),
        data_collator=CompletionCollator(tokenizer.pad_token_id),
        processing_class=tokenizer,
        callbacks=[callback],
    )

    run_config = {
        "base_model": MODEL_ID,
        "dtype": "bfloat16",
        "omp_num_threads": threads,
        "max_seq_len": MAX_SEQ_LEN,
        "epochs": args.epochs,
        "learning_rate": args.lr,
        "max_steps": args.max_steps,
        "resume_checkpoint": resume_checkpoint,
        "lora": {"r": 16, "alpha": 32, "target_modules": target_modules},
        "data": data_summary,
    }
    (output_dir / "run_config.json").write_text(
        json.dumps(run_config, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )

    trainer.train(resume_from_checkpoint=resume_checkpoint)
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))
    print(
        "[sft-complete] "
        + json.dumps(
            {
                "adapter": str(output_dir),
                "metrics": str(metrics_path),
                "steps": trainer.state.global_step,
                "peak_rss_kb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
            },
            sort_keys=True,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
