# OFFERS-IMPL-S3-BUILDER B9 fix round 1 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b9-fix-r1.log.

Implemented IBI1-F1. The composition fixture now selects `End Turn` from the public environment-bound generator, independently compares its ID/action slots with the raw candidate, and resolves the registered object.

Changed file:

- [standard-offer-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/standard-offer-generator.test.ts:237)
- Pristine SHA: `a0b8f7f6b391aeed7e9386f0eda3c375715326f6fdc7d771eda4b15a90ad944c`
- Final SHA: `d5b86135de1a27beca9f2bedccc6d424fbed4f50277733db3f45c79a0c7ca003`
- Diff: 12 insertions, 1 deletion
- Added-line maximum: 99; over 120: 0
- All raw-generator body, ID, count, and ordering pins at lines 211–213 remain unchanged.

Proof:

```text
Production mutation:
boundEnvironment !== undefined &&
→
boundEnvironment === undefined ||

src/vtt/intent-resolver.ts:
31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217
→ 4c0f017b7da6bea0c336ac5ce7bfea5d150bc78fb16a18937c99ee0a115c6b59

npx vitest run --configLoader runner tests/unit/vtt/standard-offer-generator.test.ts
Test Files  1 passed
Tests       3 passed
```

Test-side sanity mutation under that strict guard:

```text
resolveEngineActorOption(state, registered, OFFER_ENVIRONMENT)
→ resolveEngineActorOption(state, candidate, OFFER_ENVIRONMENT)

Mutant test SHA:
1470231bf6990e57d6bd5a2d2dafffd65e79d72cb7c1e452fb0f80e08e195b69

FAIL composes standard resolution execution and evaluation ports
Error: Standard End Turn refused: OFFER_ENVIRONMENT_MISMATCH
Tests 1 failed | 2 skipped
```

Both mutations were restored with `cp`. Restored production SHA:

```text
31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217
```

Final green:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0

bash scripts/check-command-outcomes.sh
exit 0
runtime export allowlist: builder plus exactly five transitional factories/wrappers

npx vitest run --configLoader runner tests/unit/vtt/standard-offer-generator.test.ts
1 file passed; 3 tests passed

66-edit forward-contraction overlay:
tests/unit/vtt/standard-offer-generator.test.ts=0

git diff --check
exit 0; no output

npx vitest list --configLoader runner --filesOnly --json
643 files
```

Integrity:

```text
package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

plan
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status:

```text
 M tests/unit/vtt/standard-offer-generator.test.ts
```

S3 B9 FIX R1 DONE
diff --git a/src/vtt/intent-resolver.ts b/src/vtt/intent-resolver.ts
index acc26a145cdf3f059d349d60d99652f0bedb59c4..6c97365abdfab1500621cad6e50fc90c9fed8aa2
--- a/src/vtt/intent-resolver.ts
+++ b/src/vtt/intent-resolver.ts
@@ -548,7 +548,7 @@
   environment: EngineOfferApiEnvironment = canonicalEngineQueryPort,
 ): OptionResolution {
   const boundEnvironment = optionEnvironmentBindings.get(option);
-  if (boundEnvironment !== undefined &&
+  if (boundEnvironment === undefined ||
     (!isEngineOptionEnvironment(environment) || boundEnvironment !== environment)) {
     return refused(
       'OFFER_ENVIRONMENT_MISMATCH',
diff --git a/tests/unit/vtt/standard-offer-generator.test.ts b/tests/unit/vtt/standard-offer-generator.test.ts
index d8b8a5126e21302f181a2ddcc03b1f660ef6d7f3..9f10a1f54fd109925da4b7fc42683ce6aa326ec8
--- a/tests/unit/vtt/standard-offer-generator.test.ts
+++ b/tests/unit/vtt/standard-offer-generator.test.ts
@@ -239,8 +239,19 @@
     const offer = standardOfferGenerator.generate({ state, actorId: actor.id, revision: state.revision })
       .find((candidate) => candidate.label === 'End Turn');
     if (offer === undefined) throw new Error('Standard generator fixture omitted End Turn.');
+    const registered = engineActorOptionsForEnvironment(
+      state,
+      actor.id,
+      OFFER_ENVIRONMENT,
+      state.revision,
+    ).offerable.find((candidate) => candidate.label === 'End Turn');
+    if (registered === undefined) throw new Error('Environment-bound generator omitted End Turn.');
     const resolved = standardOfferGenerator.resolve({
-      resolveStandard: (candidate) => resolveEngineActorOption(state, candidate, OFFER_ENVIRONMENT),
+      resolveStandard: (candidate) => {
+        expect(candidate.optionId).toBe(registered.optionId);
+        expect(candidate.actionSlots).toEqual(registered.actionSlots);
+        return resolveEngineActorOption(state, candidate, OFFER_ENVIRONMENT);
+      },
     }, offer);
     if (!resolved.valid) throw new Error(`Standard End Turn refused: ${resolved.code}`);
 
