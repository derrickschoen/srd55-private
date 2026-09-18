# ELEVATION-02 plan r1 — sol report (fresh 01a0ab4f-976d-7f83-9cd7-0c1219ee9b45, exit 0, 428 k tokens)

145/147 tests
+passed, exit 1; Vitest 95.94 s, process wall 94.31 s. The two deterministic reds
+are the two semantic-board titles named in A23; no retry or normalization was
+performed.
+
+The declaration-only compile overlay added required spatial/height/altitude/
+movement-set fields and removed scalar speed in disposable `.tmp` archives:
+
+```text
+main: app exit 2, 47 diagnostics; node exit 2, 79 diagnostics; 19 source paths
+VIS:  app exit 2, 47 diagnostics; node exit 2, 79 diagnostics; 19 source paths
+```
+
+The five approved vertical witness calculations were independently recomputed
+from `p(z,t)` and are recorded in §5.2. No model, reviewer, agent, full suite,
+full gate, Playwright, build, or port 4173 action was used while authoring.
+
+ELEVATION-02 PLAN DONE
diff --git a/.tmp/elevation-main-probe/src/combat/combatant.ts b/.tmp/elevation-main-probe/src/combat/combatant.ts
index 66587a86fe7a6306dc132a4af3af230d6abdceb5..4a062bdf72477c0e1e286e53a0e42f0b18195299
--- a/.tmp/elevation-main-probe/src/combat/combatant.ts
+++ b/.tmp/elevation-main-probe/src/combat/combatant.ts
@@ -45,7 +45,8 @@
 export interface CombatRulesProfile {
   readonly armorClass: ArmorClass;
   readonly hitPointMaximum: number;
-  readonly speed: Feet;
+  readonly movementSpeeds: unknown;
+  readonly height: unknown;
   readonly initiativeBonus: number;
   /** Present when the source exposes scores rather than modifiers alone. */
   readonly abilityScores?: Readonly<Record<Ability, number>>;
@@ -123,6 +124,7 @@
   readonly id: TokenId;
   readonly combatantId: CombatantId;
   readonly position: GridCell;
+  readonly altitude: unknown;
   readonly placementMode: SerializedPlacementMode;
 }
 
diff --git a/.tmp/elevation-main-probe/src/combat/encounter.ts b/.tmp/elevation-main-probe/src/combat/encounter.ts
index 8359a1f365a0f836a3b35f684503713035db5d28..691ad2157c28585d7a40539a5803a22ee271131a
--- a/.tmp/elevation-main-probe/src/combat/encounter.ts
+++ b/.tmp/elevation-main-probe/src/combat/encounter.ts
@@ -758,6 +758,7 @@
   readonly nextDecisionSequence: number;
   readonly nextEffectSequence: number;
   readonly bounds: GridBounds;
+  readonly spatial: unknown;
   readonly blockedCells: readonly GridCell[];
   readonly worldObjects: readonly WorldObject[];
   readonly nextWorldObjectSequence: number;
@@ -829,6 +830,7 @@
   /** Legacy construction input retained only to preserve the existing death-save behavior. */
   readonly hideDeathSaveRolls?: boolean;
   readonly bounds: GridBounds;
+  readonly spatial?: unknown;
   readonly blockedCells?: readonly GridCell[];
   readonly worldObjects?: readonly WorldObject[];
   readonly environment?: EncounterEnvironment;
diff --git a/.tmp/elevation-main-probe/src/combat/world-objects.ts b/.tmp/elevation-main-probe/src/combat/world-objects.ts
index 975f059ea33c3e2ed5bc9221546007343b764ac5..95f9e001e6d4a3699f3c474151b402169886aac5
--- a/.tmp/elevation-main-probe/src/combat/world-objects.ts
+++ b/.tmp/elevation-main-probe/src/combat/world-objects.ts
@@ -60,11 +60,13 @@
     readonly response: DamageResponse;
   }[];
   readonly blocking: WorldObjectBlocking;
+  readonly height?: unknown;
   readonly classActions?: readonly WorldObjectClassAction[];
 }
 
 export interface WorldObject extends WorldObjectInput {
   readonly createdRevision: number;
+  readonly height: unknown;
 }
 
 export interface EnvironmentRegion {
diff --git a/.tmp/elevation-vis-probe/src/combat/combatant.ts b/.tmp/elevation-vis-probe/src/combat/combatant.ts
index 66587a86fe7a6306dc132a4af3af230d6abdceb5..4a062bdf72477c0e1e286e53a0e42f0b18195299
--- a/.tmp/elevation-vis-probe/src/combat/combatant.ts
+++ b/.tmp/elevation-vis-probe/src/combat/combatant.ts
@@ -45,7 +45,8 @@
 export interface CombatRulesProfile {
   readonly armorClass: ArmorClass;
   readonly hitPointMaximum: number;
-  readonly speed: Feet;
+  readonly movementSpeeds: unknown;
+  readonly height: unknown;
   readonly initiativeBonus: number;
   /** Present when the source exposes scores rather than modifiers alone. */
   readonly abilityScores?: Readonly<Record<Ability, number>>;
@@ -123,6 +124,7 @@
   readonly id: TokenId;
   readonly combatantId: CombatantId;
   readonly position: GridCell;
+  readonly altitude: unknown;
   readonly placementMode: SerializedPlacementMode;
 }
 
diff --git a/.tmp/elevation-vis-probe/src/combat/encounter.ts b/.tmp/elevation-vis-probe/src/combat/encounter.ts
index b3a9b43ea4d16b3ed01a3d63b319c0131ba5fd27..2004868797cef7622eb295c834f7d40c81784fb9
--- a/.tmp/elevation-vis-probe/src/combat/encounter.ts
+++ b/.tmp/elevation-vis-probe/src/combat/encounter.ts
@@ -759,6 +759,7 @@
   readonly nextDecisionSequence: number;
   readonly nextEffectSequence: number;
   readonly bounds: GridBounds;
+  readonly spatial: unknown;
   readonly blockedCells: readonly GridCell[];
   readonly worldObjects: readonly WorldObject[];
   readonly nextWorldObjectSequence: number;
@@ -830,6 +831,7 @@
   /** Legacy construction input retained only to preserve the existing death-save behavior. */
   readonly hideDeathSaveRolls?: boolean;
   readonly bounds: GridBounds;
+  readonly spatial?: unknown;
   readonly blockedCells?: readonly GridCell[];
   readonly worldObjects?: readonly WorldObject[];
   readonly environment?: EncounterEnvironment;
diff --git a/.tmp/elevation-vis-probe/src/combat/world-objects.ts b/.tmp/elevation-vis-probe/src/combat/world-objects.ts
index 0483bdf644e500efdac843a400960a953da40b71..bf5746594d5f48af16af5834da6fdbfba3a74cb1
--- a/.tmp/elevation-vis-probe/src/combat/world-objects.ts
+++ b/.tmp/elevation-vis-probe/src/combat/world-objects.ts
@@ -60,11 +60,13 @@
     readonly response: DamageResponse;
   }[];
   readonly blocking: WorldObjectBlocking;
+  readonly height?: unknown;
   readonly classActions?: readonly WorldObjectClassAction[];
 }
 
 export interface WorldObject extends WorldObjectInput {
   readonly createdRevision: number;
+  readonly height: unknown;
 }
 
 export interface EnvironmentRegion {
