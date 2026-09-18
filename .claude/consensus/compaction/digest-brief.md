RULES (binding): You are a DIGEST AUTHOR (gpt-6-astra, high). Sandbox workspace-write on the MAIN repo, but you may WRITE ONLY the single output file named below under .tmp/runs/compact/digests/. No other file, no git writes, no claude / other agents / consensus skills; skills under ~/.codex do NOT apply; no tests, builds, servers. Model calls WILL fail. End with the named marker.

CONTEXT: `.claude/decisions.md` (1.78 MB, 1106 decision blocks) is the project's append-only chronology of OWNER rulings, SUPERVISOR decisions and findings (F-notes). The owner ruled today: compact it into a streamlined document with no repeated directions, dropping overridden decisions and ones too old to matter, with the full log archived. The file is being processed in 9 chunks; you get ONE chunk. Another lane merges the digests. You cannot see later chunks, so record supersession EVIDENCE rather than final verdicts.

YOUR CHUNK: <CHUNK_PATH>   OUTPUT: <OUT_PATH>

Read the chunk in full (use sed -n ranges; it is ~200 KB). Then write the output as one markdown table row per `## D…` block, in file order, plus rows for any non-D preamble/finding sections (id them `PRE-n` / `F-<name>`). Columns, pipe-separated, one line per row (escape `|` in text as `\|`):

`id | date(YYYY-MM-DD or ?) | author(OWNER/SUPERVISOR/CODEX/?) | kind(RULE/RULING/FINDING/REPORT/PLAN-RECORD/QUESTION) | topic(≤4 words) | status(ACTIVE/SUPERSEDED/OBSOLETE/RECORD-ONLY) | supersedes(ids, or -) | superseded-by(id if the block itself says so, or -) | binding(≤40 words: the standing direction, verbatim-faithful, or - for RECORD-ONLY) | why-not-active(≤15 words, or -)`

Definitions:
- RULE/RULING: a standing direction that still tells a future worker what to do or not do (owner rulings, supervisor rules like "every gate uses tsc -b --force", protocol rules, licensing walls, architecture invariants, scope decisions still in force).
- FINDING: a recorded defect/mistake with a lesson; ACTIVE only if it states a rule worth keeping; otherwise RECORD-ONLY.
- REPORT / PLAN-RECORD: dispatch logs, gate numbers, sha pins, batch acceptances, round dispositions — RECORD-ONLY unless the block also contains a standing rule (then split: status ACTIVE with the rule in `binding`, and note "plus record" in why-not-active column as `record-part-dropped`).
- SUPERSEDED: the block itself says it is superseded/retracted/overridden, OR a later block IN YOUR CHUNK overrides it (name that id in superseded-by). Do not guess about chunks you cannot see.
- OBSOLETE: the thing it directs no longer exists or completed and cannot recur (a one-off migration done, a lane that finished, a unit that landed with nothing standing) — say why.
- Keep sub-decisions (D418.6, D635.41…) as their own rows.
- `binding` must be faithful to the text: no invented rules, no softening, keep exact numbers/paths/names when they are the rule. If a block holds several distinct standing directions, put them in one row separated by ` ;; `.

After the table add a section `## Cross-chunk notes` listing (a) ids this chunk mentions as superseding/amending ids that are NOT in this chunk; (b) directions in this chunk that look repeated (same rule restated) with the ids; (c) anything you could not classify.

Quality bar: the merged document must let a worker who has never seen the archive obey every ruling still in force. Under-classifying an active rule as RECORD-ONLY loses it; over-keeping a report bloats the result. When in doubt, ACTIVE with a short binding — the merge lane and a supervisor verification prune.

End with the marker `DIGEST <N> DONE` on its own line.
