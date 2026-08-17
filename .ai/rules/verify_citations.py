#!/usr/bin/env python3
"""Prove every QUOTE in this library still occurs verbatim in its SRC.

This is the drift detector. Without it the library is a second copy of the rules
that can silently diverge from source — which is the exact failure it exists to
prevent, reintroduced one level up.

An entry whose QUOTE no longer appears in SRC is a FAILURE, not a warning: either
the source changed (the library is stale) or the quote was never right (the
library is lying). Both must block.

    python3 .ai/rules/verify_citations.py

Exit 0 all entries verified, 1 otherwise.
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]

ENTRY = re.compile(
    r"^### (?P<id>R-[A-Z]+-\d+) (?P<slug>\S+)\s*$"
    r"(?P<body>.*?)(?=^### |\Z)",
    re.M | re.S,
)
FIELD = re.compile(r"^(Q|A|QUOTE|CHECK|SRC|CODE|TRAP): (.*)$", re.M)
# QUOTE is NOT unconditionally required. Some facts are true by ABSENCE -- e.g.
# Warlock levels contribute nothing to the multiclass slot total, which is
# established by Warlock being missing from an enumeration. No verbatim span can
# quote a thing that is not there, so such an entry carries a CHECK instead.
# Exactly one of QUOTE / CHECK must be present.
REQUIRED = ["Q", "A", "SRC", "CODE", "TRAP"]


def normalize(text: str) -> str:
    text = re.sub(r"-\s*\n\s*", "", text)
    return re.sub(r"\s+", " ", text)


def main() -> int:
    sources: dict[str, str] = {}
    failures: list[str] = []
    deferred: list[str] = []
    checked = 0
    ids: dict[str, str] = {}

    for md in sorted(HERE.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        for m in ENTRY.finditer(text):
            rid = m.group("id")
            fields = dict(FIELD.findall(m.group("body")))
            where = f"{md.name}:{rid}"

            if rid in ids:
                failures.append(f"{where}: DUPLICATE ID, also in {ids[rid]}")
            ids[rid] = md.name

            missing = [f for f in REQUIRED if f not in fields]
            if missing:
                failures.append(f"{where}: missing field(s) {','.join(missing)}")
                continue

            has_q, has_c = "QUOTE" in fields, "CHECK" in fields
            if has_q == has_c:
                failures.append(
                    f"{where}: needs exactly one of QUOTE or CHECK, found "
                    + ("both" if has_q else "neither")
                )
                continue

            if has_c:
                # This script proves QUOTEs. It does NOT execute CHECKs -- that is
                # kb_verify.py's job, behind its read-only allowlist. Counting a
                # CHECK entry as PROVEN here would be the silent-green failure this
                # library exists to prevent, so it is counted separately and named.
                deferred.append(f"{where}: CHECK-only, proven by kb_verify.py")
                continue

            quote = fields["QUOTE"].strip()
            if quote.startswith('"') and quote.endswith('"'):
                quote = quote[1:-1]
            src = fields["SRC"].strip()

            if src.upper() == "NONE":
                failures.append(f"{where}: SRC must be a real file")
                continue

            path = ROOT / src
            if not path.is_file():
                failures.append(f"{where}: SRC not found: {src}")
                continue

            if src not in sources:
                sources[src] = normalize(
                    path.read_text(encoding="utf-8", errors="replace")
                ).lower()

            checked += 1
            if normalize(quote).lower() not in sources[src]:
                failures.append(
                    f"{where}: QUOTE NOT FOUND in {src}\n"
                    f"    quote: {quote[:100]}\n"
                    f"    -> source changed, or the quote was never verbatim.\n"
                    f"    -> shorten it: two-column interleaving splits long spans."
                )

    for f in failures:
        print(f"FAIL {f}")
    for d in deferred:
        print(f"DEFERRED {d}")
    print(f"\n{checked} citation(s) checked, {len(failures)} failure(s).")
    if deferred:
        print(
            f"{len(deferred)} CHECK-only entr(ies) NOT proven here -- run "
            "kb_verify.py. Deferred is not passed."
        )
    if checked == 0:
        print("VACUOUS: no entries parsed. Check the entry format in FORMAT.md.")
        return 1
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
