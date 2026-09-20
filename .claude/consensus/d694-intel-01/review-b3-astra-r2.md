# D694-INTEL-01 B3 — astra MEDIUM review r2 (session 01a0bdbf-d126-7ef1-acb7-96d668debc7a, final message only)

**REJECT — 0 P1, 1 P2, 1 P3.** Reviewed combined diff `c22a1efe..9a3c0a55`.

1. **P2 — R1’s production-witness finding is only partially closed.** R1 stated: “It never exercises conversation hidden-option copies, blind offered-option copies, exhaustion capture, or actual RL/JSONL assembly.”

   [The revised witness](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:429) genuinely calls `runConversation` across original/relocated/removed Fighter, captures initial and correction prompts, and reads production row fields plus persisted JSONL. That portion is fixed.

   However, its arguments select default **advice** mode, and `invalidInitial` triggers a correction without forcing correction failure. Consequently:
   
   - The [blind offered-option copy](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-conversation.ts:7389), guarded by `if (config.dmMode === 'blind')`, is never reached.
   - The [exhaustion capture](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-conversation.ts:6202), inside `resolveDeterministically`, is not exercised by the successful correction path.

   Regressions confined to these branches therefore escape this witness. The reported hidden-option substitutions do not establish their coverage. The mutation log shows source-text assertion failures; [the test itself](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:487) requires the literal `hiddenOptionRecords(...initialActorLocalBoundary...)`.

   Add blind-mode and forced-exhaustion variants, assert those paths were reached, compare their actual products across all three states, and demonstrate semantic mutation failures.

2. **P3 — HP/position absence checks miss serialized prompt content.** [Lines 501–507](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:501) serialize the entire product before searching for unescaped JSON fields:

   > `const bytes = canonicalJson(first);`

   Prompt text is already a string, so embedded JSON becomes escaped. An independent in-memory probe containing `hitPoints:51`, `hitPointMaximum:67`, and `(1,2)` inside a prompt escaped all three checks. The class/name check and exact summary counts are substantive improvements; the HP/position assertions do not support the full claimed prompt coverage. Inspect prompt strings directly and structured products separately, with positive controls proving each absence check detects its forbidden content.

**R1’s count finding is closed.** R1 stated: “A requested monster is `self` in its own view but `monster_team` in another’s, so it is excluded.” [The fix](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:706) now uses:

> `relation === 'self' || relation === 'monster_team' ? 'monster_team' : relation`

Both equality operands use this normalization. Dead participants remain excluded; tokenless living Whole participants remain eligible. Nine independent assertions against the committed function body passed, including 1/2/6 views and dead/absent ordering.

A dead **requested actor** is rejected by boundary construction. Valid views derive from one host snapshot, retaining dead monster teammates consistently. The fixture contains six living monsters; the new multi-actor witness explicitly **removes Cleric and relocates Wizard to `(14,4)`**. Its ledger is therefore six monsters plus one perceived Wizard, with Fighter hidden—not the unchanged wall-hidden-Cleric setup. One monster death yields five.

No regression found in R1-confirmed items. Frozen-plan hash, eight-file scope, clean tree, diff check, and independent node TypeScript checking passed. Vitest could not create its `/tmp` SSR directory and ran zero tests; runtime results remain supported by supervisor records rather than an independent rerun. No files were modified.

D694-INTEL-01 B3 REVIEW R2 DONE
