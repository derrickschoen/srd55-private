# BLIND-01 B6 fix r1 review (gpt-6-astra MEDIUM, candidate c0e2ef19)

tokens used
39,415
**ACCEPT — 0 P1, 0 P2, 1 P3.** Both prior P2 findings are resolved.

- **P3 — Relax the exact byte pins** at [ai-dm-arena.test.ts:1309](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/tools/ai-dm-arena.test.ts:1309). These freeze incidental serialization size; harmless context changes can fail them while pruning and accounting remain correct. Retain the exact option counts and omission counts; replace byte equalities with cap compliance and relative-size assertions. Nonblocking.

**Omission witness:** The fixed fixture and documented pruning boundary justify the cap: three actors have 18/6/6 options, reverse-tail pruning reaches monster 3 first, and removing one tail option crosses the cap while staying above the floor. The stated arithmetic also includes removal of an array comma: 38,756 − 721 − 1 = 38,034. This is a coherent cap rationale; the diff alone cannot establish whether its discovery involved trial runs. The intermediate 38,756 is commentary, not an assertion.

Disabling omission accounting while preserving pruning **fails this test**: [engine-server.ts:2944](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/mcp/engine-server.ts:2944) extracts per-actor counters, and `ai-dm-conversation.ts:7214` sums them. Missing or zeroed counters violate the explicit total `1` and per-actor `0/0/1` assertions even when option counts remain 18/6/5.

**Scripted-party control:** The trivial programs are adequate for the prior finding’s exact-program-control requirement. The frozen PCs have spent actions and zero movement; `regretTurnLegalActions` consequently supplies only End Turn. The hand-stated program now freezes actual behavior, beyond determinism or hash shape. It does not prove nontrivial tactical selection, but that is not necessary to close this finding.

The branch inputs are fixture-derived: the hidden set selects every input monster with fixed stealth 30, independently of evaluator output; the fixture has no event history. The expected three perceived/three unknown targets and normal/blind_dodge branches are literal expectations. Scripted planning calls the evaluator at [scripted-party-round.ts:417](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/scripted-party-round.ts:417), which calls `projectActorKnowledge` at [symmetric-pc-evaluator.ts:335](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/symmetric-pc-evaluator.ts:335).

No regenerated behavioral expectation or weakened assertion identified in the five removed lines: exact program/hash/ID pins strengthen the former self-consistency and format checks. No additional findings. Supervisor checks were not repeated; no writes or model calls performed.

BLIND-01 REVIEW B6 FIX R1 DONE
