#!/usr/bin/env python3
"""Search the bundled SRD the only way that works on this corpus.

The SRD text is a TWO-COLUMN layout. A sentence that runs past the column break
is interleaved with unrelated text from the neighbouring column, so a plain
`grep` for a phrase returns NOTHING for text that is demonstrably present. That
failure mode is silent and reads exactly like "the rule does not exist" — which
is how a wrong rule gets asserted from memory instead.

This normalizes whitespace before matching, and reports the file and the line
the match starts on.

    python3 .ai/rules/srdgrep.py 'round up'
    python3 .ai/rules/srdgrep.py --file multiclassing 'Pact Magic'

Exit 0 if at least one match, 1 if none.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRD_DIRS = [ROOT / "docs/srd/source", ROOT / "docs/srd/full"]
CONTEXT = 240


def corpus(name_filter: str | None):
    for d in SRD_DIRS:
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.txt")):
            if name_filter and name_filter.lower() not in p.name.lower():
                continue
            yield p


def normalize(text: str) -> str:
    # Close hyphenation across line breaks, then flatten all whitespace. Both are
    # required: the extracts hyphenate mid-word at column edges ("Mar-" / "tial").
    text = re.sub(r"-\s*\n\s*", "", text)
    return re.sub(r"\s+", " ", text)


def line_of(raw: str, needle_words: list[str]) -> int:
    """Best-effort original line number, for citing file:line."""
    if not needle_words:
        return 0
    first = needle_words[0]
    for i, line in enumerate(raw.split("\n"), 1):
        if first in line:
            return i
    return 0


def main() -> int:
    args = [a for a in sys.argv[1:]]
    name_filter = None
    if "--file" in args:
        i = args.index("--file")
        name_filter = args[i + 1]
        del args[i : i + 2]
    if not args:
        print(__doc__)
        return 1
    needle = normalize(" ".join(args)).lower()

    hits = 0
    for path in corpus(name_filter):
        raw = path.read_text(encoding="utf-8", errors="replace")
        flat = normalize(raw)
        low = flat.lower()
        start = 0
        while True:
            idx = low.find(needle, start)
            if idx == -1:
                break
            hits += 1
            lo = max(0, idx - CONTEXT // 2)
            hi = min(len(flat), idx + len(needle) + CONTEXT // 2)
            rel = path.relative_to(ROOT)
            ln = line_of(raw, needle.split())
            print(f"\n=== {rel}:{ln} ===")
            print(flat[lo:hi].strip())
            start = idx + len(needle)

    if hits == 0:
        print(f"NO MATCH for {needle!r}.")
        print("Before concluding the rule does not exist: try a SHORTER span.")
        print("Two-column interleaving breaks long phrases even after normalizing.")
        return 1
    print(f"\n{hits} match(es).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
