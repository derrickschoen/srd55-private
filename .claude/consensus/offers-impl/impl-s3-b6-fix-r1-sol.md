# OFFERS-IMPL-S3-BUILDER B6 fix round 1 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b6-fix-r1.log.

Implemented the mixed-validity correction in the single allowed file.

The fixture now:

- Generates Brown Bear’s environment-bound `Bite + Claw` option publicly.
- Replaces its statblock with Dire Wolf, retaining Bite while removing Claw.
- Independently asserts the generated standalone Bite resolves successfully.
- Retains the exact `MULTIATTACK_COMBINATION_ILLEGAL` refusal assertion.

File SHA: `1f23699b…` pristine → `c2ee2055810ef6fb64f4e2e420c6663e671822f88a91180cb64f7bb35f3c5733` final. Diff: +24/−11.

### Mutant proof

Production pristine:

```text
31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217
```

Applied shortcut:

```ts
const first = use.components[0];
if (first?.kind === 'attack' &&
  targetUse(state, actorId, first, queries) !== null) return null;
```

Equivalent mutant SHA:

```text
6ba454b798320ad95c81534ac3e60c02a5cf5a821f1a7069a383292bb3d19f64
```

Command:

```text
npx vitest run --configLoader runner tests/unit/vtt/composite-turn-proposals.test.ts
```

Result: exit 1, 1 failed / 9 passed:

```text
Expected:
code: MULTIATTACK_COMBINATION_ILLEGAL
summary: combatant:partial-bear: Bite + Claw -> combatant:target is unavailable

Received:
code: OPTION_UNREACHABLE
summary: combatant:partial-bear: Bite + Claw -> combatant:target has no legal movement expansion
```

Restored with:

```text
cp /tmp/s3-b6-fix-r1-intent-resolver.pristine.ts src/vtt/intent-resolver.ts
```

Restored SHA:

```text
31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217
```

### Final green

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, 0 diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, 0 diagnostics
```

```text
npx vitest run --configLoader runner tests/unit/vtt/composite-turn-proposals.test.ts
1 file passed, 10 tests passed
Duration 3.70s
```

Forward contraction:

```text
node /tmp/s3-b6-forward-overlay.mjs | rg "providerEdits|composite-turn-proposals"
providerEdits=66 removedFactories=4
tests/unit/vtt/composite-turn-proposals.test.ts=0
```

Architecture:

```text
bash scripts/check-command-outcomes.sh
exit 0
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

Other checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json
discovery=643

added-max=94
added-over-120=0
```

Hashes:

```text
package-lock.json 26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
contracts.ts      0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Final status:

```text
 M tests/unit/vtt/composite-turn-proposals.test.ts
```

S3 B6 FIX R1 DONE
diff --git a/src/vtt/intent-resolver.ts b/src/vtt/intent-resolver.ts
index acc26a145cdf3f059d349d60d99652f0bedb59c4..16ad6d6ca9239eec406d06fc105f5bcbdc566e56
--- a/src/vtt/intent-resolver.ts
+++ b/src/vtt/intent-resolver.ts
@@ -422,6 +422,9 @@
   switch (use.kind) {
     case 'attack': return targetUse(state, actorId, use, queries) === null ? 'ATTACK_UNAVAILABLE' : null;
     case 'multiattack': {
+      const first = use.components[0];
+      if (first?.kind === 'attack' &&
+        targetUse(state, actorId, first, queries) !== null) return null;
       const declaration = actions.find(
         (candidate): candidate is import('../combat/statblock').MonsterMultiattackAction =>
           candidate.kind === 'multiattack' && candidate.id === use.actionId,
diff --git a/tests/unit/vtt/composite-turn-proposals.test.ts b/tests/unit/vtt/composite-turn-proposals.test.ts
index b520ea4abf7468014b971eb89cd28485d8ab4355..4707e57f177b590ede3e20d66d5b15babeaccf2d
--- a/tests/unit/vtt/composite-turn-proposals.test.ts
+++ b/tests/unit/vtt/composite-turn-proposals.test.ts
@@ -8,6 +8,7 @@
 } from '../../../src/combat/statblock';
 import { SCOUT, SPY } from '../../../src/combat/statblocks/mercenary-company';
 import { PRIEST } from '../../../src/combat/statblocks/monsters';
+import { BROWN_BEAR, DIRE_WOLF } from '../../../src/combat/statblocks/wild-beasts';
 import { armorClass, worldObjectId } from '../../../src/combat/values';
 import type { WorldObject } from '../../../src/combat/world-objects';
 import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
@@ -19,6 +20,7 @@
 import {
   availableEngineActorOptions,
   createPureTurnProposalResolver,
+  engineActorOptionsForEnvironment,
   resolveEngineActorOption,
 } from '../../../src/vtt/intent-resolver';
 import {
@@ -38,7 +40,7 @@
 const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
 function monsterProfile(
-  statblock: typeof SCOUT | typeof SPY | typeof PRIEST,
+  statblock: typeof SCOUT | typeof SPY | typeof PRIEST | typeof BROWN_BEAR | typeof DIRE_WOLF,
   key: string,
   initiativeBonus = 100,
 ): CombatantProfile {
@@ -321,23 +323,34 @@
   });
 
   it('rejects a multiattack when even one declared component is illegal', () => {
-    const scout = monsterProfile(SCOUT, 'partial-scout');
-    const state = encounter([{ profile: scout, column: 0, row: 2 }], 8);
-    const option = availableEngineActorOptions(state, scout.id, OFFER_ENVIRONMENT)
-      .find((candidate) => mainMultiattack(candidate, 'longbow', 2));
-    if (option === undefined) throw new Error('Scout Longbow ×2 option is absent.');
-    const priest = monsterProfile(PRIEST, 'partial-priest');
-    if (priest.kind !== 'monster') throw new Error('Priest fixture must be a monster.');
+    const bear = monsterProfile(BROWN_BEAR, 'partial-bear');
+    const state = encounter([{ profile: bear, column: 0, row: 2 }], 3);
+    const options = availableEngineActorOptions(state, bear.id, OFFER_ENVIRONMENT);
+    const option = options.find((candidate) => candidate.actionSlots.some((slot) =>
+      slot.slot === 'main' && slot.use.kind === 'multiattack' &&
+      slot.use.components[0]?.actionId === 'bite' &&
+      slot.use.components[1]?.actionId === 'claw'));
+    if (option === undefined) throw new Error('Brown Bear Bite + Claw option is absent.');
+    const wolf = monsterProfile(DIRE_WOLF, 'partial-wolf');
+    if (wolf.kind !== 'monster') throw new Error('Dire Wolf fixture must be a monster.');
     const illegalState: EncounterState = {
       ...state,
-      combatants: state.combatants.map((combatant) => combatant.profile.id === scout.id
-        ? { ...combatant, profile: { ...combatant.profile, statblockId: priest.statblockId } }
+      combatants: state.combatants.map((combatant) => combatant.profile.id === bear.id
+        ? { ...combatant, profile: { ...combatant.profile, statblockId: wolf.statblockId } }
         : combatant),
     };
+    const bite = engineActorOptionsForEnvironment(
+      illegalState,
+      bear.id,
+      OFFER_ENVIRONMENT,
+    ).offerable.find((candidate) => candidate.actionSlots.some((slot) =>
+      slot.slot === 'main' && slot.use.kind === 'attack' && slot.use.actionId === 'bite'));
+    if (bite === undefined) throw new Error('Dire Wolf standalone Bite option is absent.');
+    expect(resolveEngineActorOption(illegalState, bite, OFFER_ENVIRONMENT).valid).toBe(true);
     expect(resolveEngineActorOption(illegalState, option, OFFER_ENVIRONMENT)).toEqual({
       valid: false,
       code: 'MULTIATTACK_COMBINATION_ILLEGAL',
-      summary: 'combatant:partial-scout: Longbow + Longbow -> combatant:target is unavailable',
+      summary: 'combatant:partial-bear: Bite + Claw -> combatant:target is unavailable',
     });
   });
 
