# BLIND-01 B6 review r1 (gpt-6-astra MEDIUM, candidate 26885d92)

tokens used
74,373
**REJECT — 0 P1, 2 P2, 0 P3.**

1. **P2 — Option-omission coverage was removed.** [ai-dm-arena.test.ts:1278](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/tools/ai-dm-arena.test.ts:1278) replaces `small.optionsOmittedForSize > large` with zero under both caps. The byte comparison still witnesses context trimming, so cap plumbing is not wholly untested. However, option pruning or omission accounting could now break without this row failing.

   Reducing this fixture to 8 KiB would **not restore option omissions**: each actor has only Dodge/End Turn, and both ordinary pruning and compact fallback preserve a two-option floor (`engine-server.ts:2749` and `:2657`). Retain the new blind-Dodge proof, but restore the omission witness using a separately justified fixture with more than two options.

2. **P2 — The scripted-party surface lacks the required branch proof or concrete behavior freeze.** [scripted-party-round.test.ts:129](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/vtt/scripted-party-round.test.ts:129) compares two current executions and recomputes hashes from their returned programs. It freezes actor membership and policy names, but not the selected programs. A deterministic change to those programs can pass. The composite matrix never calls `createScriptedPartyPlan` or `materializeScriptedPartyTurn`, so it cannot fill this gap.

   None of the four unchanged suites contains the three-way proof. `dm-tactical-intel`, `agent-round-decision`, and `challenge-feasibility` retain concrete unrelated controls—respectively exact perceived intel, fixed index-to-ID bindings, and exact commands/menu consequences. Those controls remain useful, but the claim that the composite matrix proves all four surfaces is unsupported. Add the scripted-party branch witnesses or independently derived exact program controls.

Other requested checks:

- **Pin derivation passes.** Independently recomputed all ten Dodge IDs using the repository’s `canonicalJson`/`sha256`. Representative results:

  | Surface | Recomputed ID |
  |---|---|
  | Composite Scout 3 | `option:1:d1d724d5295a160d7573574df2d4274e8f54d0a55e80200e` |
  | Room 8 monster 1 | `option:203:88b2c6aa5044d6f7a564f21be12d6e030183893bdf5e1d25` |
  | Arena monster 1 | `option:2:dad31b0de2652414f7643bbf1f23a649e58defacd849ab66` |

  Both readiness hashes match exactly: `ff442543…` and `0141f663…`, each derived from exactly one enum replacement. No regenerated expectation identified; Room 8 monster 5 retains the stipulated frozen Dash ID.

- **Speculation:** the relocation set comes from the fixed input fixture’s living-PC roster, not returned output or a dynamically selected knowledge branch. The no-cue dependency path uses opposing identity and the fixed policy radius. The test retains the nonempty menu and compares the entire result after relocation. This is a relocation witness, not independently a proof of every D691 variant.
- **Conversation:** precisely three `turn: { branch: 'normal' }` additions; no other keys changed.
- **Resolver:** typed Search has `targetId`, `reliance: 'sight'`, and exactly one main slot. Help/Ready rejection and the single-slot assertions remain.
- **Timeout:** only the specified brutal-b row changes 30,000→60,000, with the D700 measurements in its comment.
- **Removed lines:** no additional weakening found beyond finding 1 and the sanctioned pin replacements.

Verified the frozen plan hash. No writes, agents, model calls, or supervisor test reruns performed. D694-INTEL-01 remains outside this review’s findings.

BLIND-01 REVIEW B6 DONE
