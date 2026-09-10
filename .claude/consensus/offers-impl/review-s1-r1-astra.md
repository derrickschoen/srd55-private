**F1 — SIGNIFICANT: Legacy-preservation test derives its oracle from the new generator.** At [standard-offer-generator.test.ts:33](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/standard-offer-generator.test.ts:33), the test generates offers, copies their fields into `legacyBody`, and hashes that reconstructed body for the expected ID (lines 36–49). Changing a generated label, target, movement budget, resource label, or omitted rider changes both actual and expected values together. Dropping declarations also passes provided one remains.

This detects unwanted binding serialization, but does not independently establish the legacy preservation required by [the plan:525](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:525). Add independently specified expected bodies, IDs, and inventory assertions; retain the binding-omission check.

**Verified claims**

- HEAD and parent match the supplied commits. The diff contains exactly the ten Slice 1 files, with 934 additions/630 deletions. The binding-plan and frozen-contract hashes match.
- Source comparison found **no generated body, field, ID, or output-order change**. Extracted helpers retain their logic; [declaration composition:614](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offers/offer-declarations.ts:614) preserves the old arguments and ordering. [Canonical projection:82](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offers/offer-envelope.ts:82) preserves flat fields and absent activation-choice omission; [hashing:26](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/option-modeling.ts:26) preserves the old formula.
- Classification remains downstream of generation at [turn-option-registry.ts:193](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/turn-option-registry.ts:193). Classification, final sorting, and hidden-record construction are byte-identical to the parent.
- The [registry:4](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offers/offer-generator-registry.ts:4) is a literal singleton tuple requiring the complete standard capability. No later-family discriminant, policy, capability, or base class was introduced.
- From assertions: serialized standard binding fails the exact flat-object comparison; reversed main/bonus slots fail [composite-turn-proposals.test.ts:108](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/composite-turn-proposals.test.ts:108); `help_attack` capability kind fails [standard-offer-generator.test.ts:59](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/standard-offer-generator.test.ts:59) and the declared capability type. The ordering test covers declaration-slot order, not movement execution phases.
- Proposer authority remains unchanged: the resolver’s only edit redirects an import; offered-ID lookup and re-resolution remain at [intent-resolver.ts:642](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intent-resolver.ts:642).
- All incumbent composite assertions and other plan-listed pinned files remain unchanged. No forbidden suppressions, skips, todos, or TypeScript `any` were introduced; the moved `case 'any'` is an existing string discriminant. No committed scratch files; working tree clean.

No tests, builds, agents, or sibling-worktree access were performed. Supervisor verification is supplied evidence, not independently reproduced here.

VERDICT: REJECT

review complete