#!/usr/bin/env python3
"""Greedy held-out JSON and submit_round_intents shape proxy evaluation."""

from __future__ import annotations

import argparse
import json
import resource
import time
from pathlib import Path

from sft_common import (
    DEFAULT_HOLDOUT,
    MODEL_ID,
    configure_cpu_threads,
    load_examples,
    prompt_token_ids,
    split_examples,
    submit_round_intents_shape,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", nargs="+", required=True, help="JSONL paths or glob patterns")
    parser.add_argument("--adapter", required=True, help="Saved PEFT adapter directory")
    parser.add_argument("--n", type=int, default=DEFAULT_HOLDOUT)
    parser.add_argument("--max-new-tokens", type=int, default=2048)
    args = parser.parse_args()
    if args.n < 1:
        parser.error("--n must be positive")
    if args.max_new_tokens < 1:
        parser.error("--max-new-tokens must be positive")
    return args


def main() -> None:
    args = parse_args()
    threads = configure_cpu_threads()

    import torch
    from peft import PeftModel
    from transformers import AutoModelForImageTextToText, AutoTokenizer

    adapter_dir = Path(args.adapter).resolve()
    if not (adapter_dir / "adapter_config.json").is_file():
        raise FileNotFoundError(f"No adapter_config.json under {adapter_dir}")

    examples, load_stats = load_examples(args.data)
    _, heldout = split_examples(examples, args.n)
    tokenizer = AutoTokenizer.from_pretrained(adapter_dir)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token
    base = AutoModelForImageTextToText.from_pretrained(MODEL_ID, dtype=torch.bfloat16)
    model = PeftModel.from_pretrained(base, adapter_dir)
    model.eval()

    result_path = adapter_dir / "eval_generations.jsonl"
    metric_path = adapter_dir / "eval_metrics.json"
    result_path.write_text("", encoding="utf-8")
    parsed_count = 0
    shaped_count = 0
    removed_prompt_tokens = 0
    started = time.monotonic()

    for index, example in enumerate(heldout, start=1):
        input_ids, removed = prompt_token_ids(tokenizer, example)
        removed_prompt_tokens += removed
        inputs = torch.tensor([input_ids], dtype=torch.long)
        attention_mask = torch.ones_like(inputs)
        item_started = time.monotonic()
        with torch.inference_mode():
            output = model.generate(
                input_ids=inputs,
                attention_mask=attention_mask,
                do_sample=False,
                max_new_tokens=args.max_new_tokens,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        generated_ids = output[0, inputs.shape[1] :]
        generated = tokenizer.decode(generated_ids, skip_special_tokens=True).strip()
        try:
            decoded = json.loads(generated)
            parsed = True
        except json.JSONDecodeError:
            decoded = None
            parsed = False
        shaped = parsed and submit_round_intents_shape(decoded)
        parsed_count += int(parsed)
        shaped_count += int(shaped)
        row = {
            "index": index,
            "digest": example.digest,
            "json_parse": parsed,
            "schema_shape": shaped,
            "prompt_tokens": len(input_ids),
            "generated_tokens": len(generated_ids),
            "elapsed_seconds": time.monotonic() - item_started,
            "generated": generated,
        }
        with result_path.open("a", encoding="utf-8") as destination:
            destination.write(json.dumps(row, sort_keys=True) + "\n")
        print(
            "[eval-example] "
            + json.dumps({key: value for key, value in row.items() if key != "generated"}, sort_keys=True),
            flush=True,
        )

    metrics = {
        "base_model": MODEL_ID,
        "adapter": str(adapter_dir),
        "examples": len(heldout),
        "json_parse_count": parsed_count,
        "json_parse_rate": parsed_count / len(heldout),
        "schema_shape_count": shaped_count,
        "schema_shape_rate": shaped_count / len(heldout),
        "removed_prompt_tokens": removed_prompt_tokens,
        "elapsed_seconds": time.monotonic() - started,
        "peak_rss_kb": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        "omp_num_threads": threads,
        "input_files": load_stats.files,
    }
    metric_path.write_text(json.dumps(metrics, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print("[eval-complete] " + json.dumps(metrics, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
