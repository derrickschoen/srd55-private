#!/usr/bin/env python3
"""Shared, deterministic corpus and tokenization helpers for CPU SFT tooling."""

from __future__ import annotations

import glob
import hashlib
import json
import os
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


MODEL_ID = "Qwen/Qwen3.5-2B"
MAX_SEQ_LEN = 4096
DEFAULT_HOLDOUT = 6
CPU_THREAD_CAP = 12

_RL_DIR = Path(__file__).resolve().parent
os.environ.setdefault("HF_HOME", str(_RL_DIR / ".cache" / "huggingface"))


@dataclass(frozen=True)
class Example:
    system: str
    user: str
    assistant: str
    digest: str
    source_path: str
    source_line: int

    def messages(self, include_assistant: bool = True) -> list[dict[str, str]]:
        messages = [
            {"role": "system", "content": self.system},
            {"role": "user", "content": self.user},
        ]
        if include_assistant:
            messages.append({"role": "assistant", "content": self.assistant})
        return messages


@dataclass(frozen=True)
class LoadStats:
    files: int
    rows: int
    examples: int
    duplicates: int


@dataclass(frozen=True)
class TruncationStats:
    examples: int
    truncated_examples: int
    removed_prompt_tokens: int
    max_raw_tokens: int
    max_prompt_tokens: int
    max_completion_tokens: int

    def as_dict(self) -> dict[str, int]:
        return {
            "examples": self.examples,
            "truncated_examples": self.truncated_examples,
            "removed_prompt_tokens": self.removed_prompt_tokens,
            "max_raw_tokens": self.max_raw_tokens,
            "max_prompt_tokens": self.max_prompt_tokens,
            "max_completion_tokens": self.max_completion_tokens,
            "max_seq_len": MAX_SEQ_LEN,
        }


def configure_cpu_threads() -> int:
    raw_threads = os.environ.get("OMP_NUM_THREADS", str(CPU_THREAD_CAP))
    try:
        requested = int(raw_threads)
    except ValueError as error:
        raise ValueError("OMP_NUM_THREADS must be an integer") from error
    if requested < 1:
        raise ValueError("OMP_NUM_THREADS must be positive")
    selected = min(requested, CPU_THREAD_CAP)
    os.environ["OMP_NUM_THREADS"] = str(selected)

    import torch

    torch.set_num_threads(selected)
    torch.set_num_interop_threads(min(2, selected))
    return selected


def _content_digest(system: str, user: str, assistant: str) -> str:
    payload = json.dumps(
        [system, user, assistant], ensure_ascii=False, separators=(",", ":")
    ).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _messages_from_row(value: object, path: str, line: int) -> tuple[str, str, str]:
    if not isinstance(value, dict):
        raise TypeError(f"{path}:{line}: row must be a JSON object")

    if all(isinstance(value.get(key), str) for key in ("system", "user", "assistant")):
        return value["system"], value["user"], value["assistant"]

    messages = value.get("messages")
    if not isinstance(messages, list) or len(messages) != 3:
        raise TypeError(
            f"{path}:{line}: expected flat system/user/assistant strings or three messages"
        )
    expected_roles = ("system", "user", "assistant")
    contents: list[str] = []
    for index, expected_role in enumerate(expected_roles):
        message = messages[index]
        if not isinstance(message, dict):
            raise TypeError(f"{path}:{line}: message {index} must be an object")
        if message.get("role") != expected_role or not isinstance(message.get("content"), str):
            raise TypeError(
                f"{path}:{line}: message {index} must be a {expected_role} string message"
            )
        contents.append(message["content"])
    return contents[0], contents[1], contents[2]


def resolve_data_paths(patterns: Sequence[str]) -> list[Path]:
    resolved: set[Path] = set()
    for pattern in patterns:
        matches = [Path(match).resolve() for match in glob.glob(pattern, recursive=True)]
        if not matches and Path(pattern).is_file():
            matches = [Path(pattern).resolve()]
        if not matches:
            raise FileNotFoundError(f"--data pattern matched no files: {pattern}")
        for match in matches:
            if not match.is_file():
                raise FileNotFoundError(f"--data input is not a file: {match}")
            resolved.add(match)
    return sorted(resolved)


def load_examples(patterns: Sequence[str]) -> tuple[list[Example], LoadStats]:
    paths = resolve_data_paths(patterns)
    by_digest: dict[str, Example] = {}
    row_count = 0
    duplicate_count = 0
    for path in paths:
        with path.open("r", encoding="utf-8") as source:
            for line_number, line in enumerate(source, start=1):
                if not line.strip():
                    continue
                row_count += 1
                try:
                    decoded = json.loads(line)
                except json.JSONDecodeError as error:
                    raise ValueError(f"{path}:{line_number}: invalid JSONL row") from error
                system, user, assistant = _messages_from_row(decoded, str(path), line_number)
                try:
                    assistant_value = json.loads(assistant)
                except json.JSONDecodeError as error:
                    raise ValueError(
                        f"{path}:{line_number}: assistant completion is not exact JSON"
                    ) from error
                if not isinstance(assistant_value, dict):
                    raise TypeError(
                        f"{path}:{line_number}: assistant completion must be a JSON object"
                    )
                digest = _content_digest(system, user, assistant)
                example = Example(system, user, assistant, digest, str(path), line_number)
                prior = by_digest.get(digest)
                if prior is not None:
                    if (prior.system, prior.user, prior.assistant) != (system, user, assistant):
                        raise RuntimeError(f"SHA-256 collision while loading {path}:{line_number}")
                    duplicate_count += 1
                    continue
                by_digest[digest] = example
    examples = sorted(by_digest.values(), key=lambda example: example.digest)
    if not examples:
        raise ValueError("No SFT examples were loaded")
    return examples, LoadStats(len(paths), row_count, len(examples), duplicate_count)


def split_examples(
    examples: Sequence[Example], holdout_count: int
) -> tuple[list[Example], list[Example]]:
    if holdout_count < 1:
        raise ValueError("holdout count must be positive")
    if len(examples) <= holdout_count:
        raise ValueError(
            f"Need more than {holdout_count} examples, received {len(examples)}"
        )
    ordered = sorted(examples, key=lambda example: example.digest)
    return ordered[holdout_count:], ordered[:holdout_count]


def _chat_ids(tokenizer, messages: list[dict[str, str]], generation: bool) -> list[int]:
    token_ids = tokenizer.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=generation,
    )
    if isinstance(token_ids, Mapping):
        token_ids = token_ids.get("input_ids")
    if hasattr(token_ids, "tolist"):
        token_ids = token_ids.tolist()
    if not isinstance(token_ids, list) or not all(isinstance(token, int) for token in token_ids):
        raise TypeError("Tokenizer chat template did not return one token-id sequence")
    return token_ids


def tokenize_training_example(tokenizer, example: Example) -> tuple[dict[str, list[int]], int, int, int]:
    prompt_ids = _chat_ids(tokenizer, example.messages(False), True)
    full_ids = _chat_ids(tokenizer, example.messages(True), False)
    if full_ids[: len(prompt_ids)] != prompt_ids:
        raise ValueError(
            f"Chat template assistant prefix mismatch at {example.source_path}:{example.source_line}"
        )
    completion_ids = full_ids[len(prompt_ids) :]
    if not completion_ids:
        raise ValueError(
            f"Empty assistant token target at {example.source_path}:{example.source_line}"
        )
    if len(completion_ids) >= MAX_SEQ_LEN:
        raise ValueError(
            f"Assistant target has {len(completion_ids)} tokens and cannot fit max length {MAX_SEQ_LEN}"
        )
    removed = max(0, len(full_ids) - MAX_SEQ_LEN)
    kept_prompt_ids = prompt_ids[removed:]
    input_ids = kept_prompt_ids + completion_ids
    labels = [-100] * len(kept_prompt_ids) + completion_ids.copy()
    if len(input_ids) > MAX_SEQ_LEN:
        raise AssertionError("Prompt-only truncation failed to enforce max sequence length")
    return (
        {"input_ids": input_ids, "attention_mask": [1] * len(input_ids), "labels": labels},
        len(full_ids),
        len(prompt_ids),
        len(completion_ids),
    )


def tokenize_training_examples(tokenizer, examples: Iterable[Example]):
    rows: list[dict[str, list[int]]] = []
    raw_lengths: list[int] = []
    prompt_lengths: list[int] = []
    completion_lengths: list[int] = []
    removed_tokens = 0
    truncated_examples = 0
    for example in examples:
        row, raw_length, prompt_length, completion_length = tokenize_training_example(
            tokenizer, example
        )
        removed = max(0, raw_length - MAX_SEQ_LEN)
        rows.append(row)
        raw_lengths.append(raw_length)
        prompt_lengths.append(prompt_length)
        completion_lengths.append(completion_length)
        removed_tokens += removed
        truncated_examples += int(removed > 0)
    stats = TruncationStats(
        examples=len(rows),
        truncated_examples=truncated_examples,
        removed_prompt_tokens=removed_tokens,
        max_raw_tokens=max(raw_lengths, default=0),
        max_prompt_tokens=max(prompt_lengths, default=0),
        max_completion_tokens=max(completion_lengths, default=0),
    )
    return rows, stats


def prompt_token_ids(tokenizer, example: Example) -> tuple[list[int], int]:
    prompt_ids = _chat_ids(tokenizer, example.messages(False), True)
    removed = max(0, len(prompt_ids) - MAX_SEQ_LEN)
    return prompt_ids[removed:], removed


def verify_chat_round_trip(tokenizer, example: Example) -> None:
    rendered = tokenizer.apply_chat_template(
        example.messages(True), tokenize=False, add_generation_prompt=False
    )
    token_ids = _chat_ids(tokenizer, example.messages(True), False)
    decoded = tokenizer.decode(token_ids, skip_special_tokens=False)
    if decoded != rendered:
        raise ValueError(
            f"Chat-template token round trip changed visible text for digest {example.digest}"
        )


def submit_round_intents_shape(value: object) -> bool:
    if not isinstance(value, dict):
        return False
    if not isinstance(value.get("idempotency_key"), str):
        return False
    if not isinstance(value.get("request_id"), str) or not isinstance(value.get("phase"), str):
        return False
    state_ref = value.get("state_ref")
    if not isinstance(state_ref, dict):
        return False
    if not isinstance(state_ref.get("expected_revision"), int):
        return False
    if not isinstance(state_ref.get("run_id"), str) or not isinstance(
        state_ref.get("state_handle"), str
    ):
        return False
    intents = value.get("intents")
    if not isinstance(intents, list) or not intents:
        return False
    for intent in intents:
        if not isinstance(intent, dict) or not isinstance(intent.get("actor_id"), str):
            return False
        for field in ("choice", "engagement", "fallback", "movement"):
            if not isinstance(intent.get(field), dict):
                return False
    return True
