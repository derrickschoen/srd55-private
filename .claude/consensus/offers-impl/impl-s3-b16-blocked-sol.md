# OFFERS-IMPL-S3-BUILDER B16 — sol BLOCKED report (2026-09-15 20:51, session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2, exit 0, no edits)

BLOCKED before edits: D617.26’s fresh-legacy divergence mutant is observationally equivalent under the current production contract, so no test-only oracle can kill it.

Evidence:

- `RuntimeOfferEnvironment.queries` is always `canonicalEngineQueryPort` in `build-offer-environment.ts`.
- `engineActorOptionsForEnvironment` generates options without consulting the environment, then only registers their digest provenance.
- `createPureTurnProposalResolver` regenerates fresh options under its supplied environment and looks them up by stable option ID.
- Resolution digests hash mechanics only.
- `familyPolicy` and `partyThreatCatalog` are not consumed by option generation or resolution.

I applied the exact carried mutant in `proposalResolutionDivergence`:

```ts
const resolver = createPureTurnProposalResolver(buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
}));
```

Production SHA evidence:

```text
Before:
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d

Mutated:
4a20f1b2844958009a5baf81f3e6004bbbf5bdd39af300b2096721dd9f7e139d
```

Command:

```text
npx vitest run --configLoader runner \
  tests/unit/tools/ai-dm-conversation.test.ts \
  -t "identifies the divergent mechanic when room 3943006 cannot be re-resolved"
```

Result—the required mutant survived:

```text
Test Files  1 passed (1)
Tests       1 passed | 107 skipped (108)
Duration    4.14s
exit 0
```

The file was restored from its pristine `/tmp` copy:

```text
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d  tools/ai-dm-conversation.ts
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d  /tmp/b16-blocker-ai-dm-conversation.ts
```

A stored-mechanics mismatch can kill `DIVERGENCE_TRUSTS_STORED_RESOLUTION`, but cannot distinguish the fresh-legacy variant: both supplied and legacy resolvers regenerate the same IDs and mechanics. Making that variant observably wrong requires a production contract change, such as environment provenance participating in authoritative resolution evidence. Production changes are forbidden in B16.

No B16 files were modified; `git status --short --untracked-files=all` is empty. Final gates were not run because the brief requires stopping when a production change is necessary.

Verified immutable hashes:

```text
Plan:
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4

src/vtt/intel/contracts.ts:
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

BLOCKED: D617.26 fresh-legacy divergence mutant is observationally equivalent under the current production contract
diff --git a/tools/ai-dm-conversation.ts b/tools/ai-dm-conversation.ts
index e48a7f4a71200602829b17b69340d17b2e9601ba..936ea5d1a60661fc20fea033d63a6d45b5a0e3e3
--- a/tools/ai-dm-conversation.ts
+++ b/tools/ai-dm-conversation.ts
@@ -4026,7 +4026,10 @@
   entry: ProposedTurnResolution,
   offerEnvironment: EngineOptionEnvironment,
 ): readonly string[] {
-  const resolver = createPureTurnProposalResolver(offerEnvironment);
+  const resolver = createPureTurnProposalResolver(buildOfferEnvironment({
+    kind: 'configuration',
+    mode: 'legacy_standard',
+  }));
   const checked = resolver.resolve(state, entry.proposal);
   if (!checked.valid) {
     return [`${entry.proposal.actorId}: proposal-time resolution was valid, but authoritative resolution refused it: ${checked.refusals.map((refusal) => refusal.summary).join('; ')}`];
