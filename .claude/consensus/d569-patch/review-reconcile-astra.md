**F32 — High, blocking: deadline gates discard D569 evidence before integrity handling.**

In the diff from `3964686f`:

- `tools/ai-dm-conversation.ts`, hunk `@@ -5365,11 +5480,12 @@`: [line 5488](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:5488) throws after receiving an incomplete result but before assigning `primaryTurn`, catalog evidence, or delivery. An ordinary timeout at the round deadline therefore leaves the explicit D569 row without required evidence; [line 7315](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:7315) then throws instead of persisting the timeout row. Invalid or contradictory evidence also bypasses persist-before-STOP.
- The same ordering appears for adjustment (`@@ -4861,8 +4954,9 @@`, [line 4959](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4959)) and recalculation (`@@ -6431,12 +6760,19 @@`, [line 6773](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:6773)).
- Speculation handles integrity first, but hunk `@@ -4622,13 +4708,16 @@` then [nulls the returned turn and infrastructure attribution after expiry](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:4716). Consequently, the join’s `completed.turn?.exit` check cannot preserve a diagnosed infrastructure failure.
- Late completed results can disappear even earlier: lifecycle hunk `@@ -65,25 +158,28 @@` [throws before returning their evidence](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-session-lifecycle.ts:166).

This violates §4.5’s evidence-first transition ordering. Preserve results and perform integrity/failure attribution before applying deadline restrictions to binding, authorization, or adoption.

**F33 — Medium, blocking: deadline expiry is falsely attributed to host authorization failure.**

`src/vtt/turn-exhaustion-coordinator.ts`, diff from `3964686f`, hunk `@@ -218,7 +257,9 @@`: [lines 260–262](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:260) skip `host.authorize` when the deadline expires and synthesize `invalidated`. The existing blind-policy branch then [returns `host_authorization_failed`](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/turn-exhaustion-coordinator.ts:276), despite no authorization invocation. This regresses the accepted actual-failure-only attribution guarantee. Deadline refusal needs separate attribution.

**Verified:** Incomplete cold starts remain unbound, and failed recovery persistence survives. Strict v3/hybrid parsing precedes shared row-codec delegation; normalized summaries remain in use. The strict fixture decoder and F30/F31 classifiers survive. No test declarations or test-budget settings were removed/raised in the ten-file comparisons. The changed zero-resume assertions reflect main’s D474 base-correction-before-escalation behavior. Protected D569 tools are unchanged; frozen-contract, runbook, and pre-patch-fixture hashes match the supplied pins.

Read-only source review; no tests or gates run.

REJECT