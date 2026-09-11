**F34 RESOLVED.** The unconditional guard at [turn-exhaustion-coordinator.ts:429](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:429) covers ordinary correction, direct escalation, and resumed-correction retrieval before null/structural validation or failure persistence. The later escalation retrieval retains its immediate deadline guard at line 484. No deadline path synthesizes `invalidated`.

The parameterized [regression at line 455](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/vtt/turn-exhaustion-coordinator.test.ts:455) covers null and invalid proposals, asserting typed deadline refusal, zero authorizations/default resolutions, one correction dispatch, and requested—but no failed—correction persistence.

Verified diff: exactly two files, 61 additions, no deletions or unrelated changes. No new findings. Source review only; no tests run.

ACCEPT