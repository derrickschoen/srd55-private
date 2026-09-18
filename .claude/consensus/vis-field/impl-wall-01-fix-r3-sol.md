
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-vis-field
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)
reasoning effort: high
reasoning summaries: none
session id: 01a0b20e-61fa-7e52-897b-3b01b026c2ff
--------
user
RULES (binding, restated): You are the IMPLEMENTER (gpt-5.6-sol, high, RESUMED — WALL-01 fix r2, which you stopped BLOCKED correctly with proposals). Worktree /home/vagrant/PhpstormProjects/dnd-wt-vis-field (claude/vis-field at 6887755f, clean). Same rules as your brief: workspace-write in that worktree only; no git writes; no .claude/** or docs/**; no claude / other agents; no Playwright/full vitest/build; never regenerate an expectation from our own output; every re-pin carries its hand derivation in a comment.

SUPERVISOR RULING (D651) on your five consequences: (1) scene-snapshot — APPLY the normalization you derived under D569 exactly as B4/B2 did for this test (D635.5–.7): DM fog {(4,3)} → {(4,3),(8,3),(9,3)}, the fighter's concealment gaining (8,2),(9,2),(8,3),(9,3), pendingRequestHash 78f31379… → 0ec0fbbc…, coordinatorHash f8fa0780… → 79b076c9…, revisionChecksum 35c96ecc… → 52305455…, branchRngStateFingerprint unchanged dd802783… (encounter-state bytes unchanged — assert that explicitly); the comment names the sealing vertex (7,3) between the wall cell (7,2) and the door (6,3) and the last-clear rays (3,3)→(8,3) and (2,3)→(9,3); keep the test's negative controls. (2)+(3) ai-dm-conversation blocked-auto-submit and unresolved-frontier: APPLY your minimal scene edit — the helper's re-authored blockers (9,1)/(9,5) move to (8,1)/(8,5) — with a comment deriving why (9,x) formed a sealed diagonal pair with (10,2)/(10,6) and why (8,x) does not, and assert the exact original five opened monster→player pairs and zero closed pairs (your temporary proof: both pass). (4)+(5) dm-tactical-intel R02 row and tactical-evaluator-r02 two Scout shots: APPLY the move of the re-authored blocker (9,2) → (8,2) in both helpers, with the derivation (the (9,2)/(10,3) pair at vertex (10,3) sealed the row-3 rays; (8,2) restores half / three_quarters and both 90-ft shots); assert the tiers explicitly. These are TEST-SCENE edits only; no production change. Then: visibility-field 46/46, the five suites green, los-cover (report the two 5 s budget tests' times; do not re-pin), tsc app/node, git diff --check, git status --short listing exactly the touched test files. OUTPUT: report with each derivation, then "WALL-01-FIX-R3 DONE".

codex
I’m applying only the four test-scene files authorized by D651. I’ll preserve the hand-derived geometry in comments, add an explicit encounter-state/fingerprint immutability check in the persisted-byte test, then run the requested focused verification.
exec
/bin/bash -lc "rg -n -C 8 \"branchRngStateFingerprint|persistedRevisionChecksum|persistedByteBaseline|reauthoredHardExhaustionSightlines|reauthoredClearScoutShot\" tests/unit/vtt/scene-snapshot.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts src/vtt/session-persistence.ts
sed -n '1010,1130p' src/vtt/session-persistence.ts
sed -n '200,285p' tests/unit/vtt/scene-snapshot.test.ts
sed -n '210,250p' tests/unit/tools/ai-dm-conversation.test.ts
sed -n '24,145p' tests/unit/vtt/dm-tactical-intel.test.ts
sed -n '75,175p' tests/unit/vtt/tactical-evaluator-r02.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
tests/unit/vtt/tactical-evaluator-r02.test.ts-72-  firstBandit: { miss: 27, normalHit: 11, criticalHit: 2, denominator: 40 },
tests/unit/vtt/tactical-evaluator-r02.test.ts-73-} as const satisfies Readonly<Record<string, FailureWeights>>;
tests/unit/vtt/tactical-evaluator-r02.test.ts-74-
tests/unit/vtt/tactical-evaluator-r02.test.ts-75-async function frozenState(): Promise<EncounterState> {
tests/unit/vtt/tactical-evaluator-r02.test.ts-76-  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/tactical-evaluator-r02.test.ts-77-  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
tests/unit/vtt/tactical-evaluator-r02.test.ts-78-}
tests/unit/vtt/tactical-evaluator-r02.test.ts-79-
tests/unit/vtt/tactical-evaluator-r02.test.ts:80:function reauthoredClearScoutShot(state: EncounterState): EncounterState {
tests/unit/vtt/tactical-evaluator-r02.test.ts-81-  return {
tests/unit/vtt/tactical-evaluator-r02.test.ts-82-    ...state,
tests/unit/vtt/tactical-evaluator-r02.test.ts-83-    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
tests/unit/vtt/tactical-evaluator-r02.test.ts-84-      ? { column: 9, row: 2 }
tests/unit/vtt/tactical-evaluator-r02.test.ts-85-      : cell),
tests/unit/vtt/tactical-evaluator-r02.test.ts-86-  };
tests/unit/vtt/tactical-evaluator-r02.test.ts-87-}
tests/unit/vtt/tactical-evaluator-r02.test.ts-88-
tests/unit/vtt/tactical-evaluator-r02.test.ts-89-describe('R02-like canonical tactical query', () => {
tests/unit/vtt/tactical-evaluator-r02.test.ts-90-  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
tests/unit/vtt/tactical-evaluator-r02.test.ts:91:    const state = reauthoredClearScoutShot(await frozenState());
tests/unit/vtt/tactical-evaluator-r02.test.ts-92-    // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
tests/unit/vtt/tactical-evaluator-r02.test.ts-93-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
tests/unit/vtt/tactical-evaluator-r02.test.ts-94-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
tests/unit/vtt/tactical-evaluator-r02.test.ts-95-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
tests/unit/vtt/tactical-evaluator-r02.test.ts-96-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
tests/unit/vtt/tactical-evaluator-r02.test.ts-97-    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
tests/unit/vtt/tactical-evaluator-r02.test.ts-98-    const handGeometry = [
tests/unit/vtt/tactical-evaluator-r02.test.ts-99-      {
--
src/vtt/session-persistence.ts-291-  readonly sessionId: EncounterSessionId;
src/vtt/session-persistence.ts-292-  readonly revision: number;
src/vtt/session-persistence.ts-293-  readonly activeHeadRevision: number;
src/vtt/session-persistence.ts-294-  readonly parentRevision: number | null;
src/vtt/session-persistence.ts-295-  readonly branchId: EncounterBranchId;
src/vtt/session-persistence.ts-296-  readonly transition: SessionTransition;
src/vtt/session-persistence.ts-297-  readonly encounterState: EncounterState;
src/vtt/session-persistence.ts-298-  /** Digest of the persisted, mechanically relevant encounter representation. */
src/vtt/session-persistence.ts:299:  readonly branchRngStateFingerprint: string;
src/vtt/session-persistence.ts-300-  readonly partyState: PartySessionState | null;
src/vtt/session-persistence.ts-301-  readonly rngState: SerializableRngState;
src/vtt/session-persistence.ts-302-  readonly coordinatorState: PersistedCoordinatorState;
src/vtt/session-persistence.ts-303-  readonly controllers: readonly ControllerIdentity[];
src/vtt/session-persistence.ts-304-  readonly agentSession: AgentSessionBinding | null;
src/vtt/session-persistence.ts-305-}
src/vtt/session-persistence.ts-306-
src/vtt/session-persistence.ts-307-export interface SessionRevision extends SessionRevisionBody {
--
src/vtt/session-persistence.ts-955-    !isRecord(value.transition) ||
src/vtt/session-persistence.ts-956-    !isRecord(value.encounterState) ||
src/vtt/session-persistence.ts-957-    !isEncounterConfig(value.encounterState.config) ||
src/vtt/session-persistence.ts-958-    !isEncounterPhase(value.encounterState.phase) ||
src/vtt/session-persistence.ts-959-    !Array.isArray(value.encounterState.hiddenRolls) ||
src/vtt/session-persistence.ts-960-    !value.encounterState.hiddenRolls.every(isHiddenRollCategory) ||
src/vtt/session-persistence.ts-961-    new Set(value.encounterState.hiddenRolls).size !== value.encounterState.hiddenRolls.length ||
src/vtt/session-persistence.ts-962-    !Array.isArray(value.encounterState.observationHistory) ||
src/vtt/session-persistence.ts:963:    typeof value.branchRngStateFingerprint !== 'string' ||
src/vtt/session-persistence.ts-964-    !(value.partyState === null || isRecord(value.partyState)) ||
src/vtt/session-persistence.ts-965-    !isRecord(value.rngState) ||
src/vtt/session-persistence.ts-966-    !isRecord(value.coordinatorState) ||
src/vtt/session-persistence.ts-967-    !Array.isArray(value.controllers) ||
src/vtt/session-persistence.ts-968-    !(value.agentSession === null || isAgentSessionBinding(value.agentSession)) ||
src/vtt/session-persistence.ts-969-    typeof value.checksum !== 'string'
src/vtt/session-persistence.ts-970-  ) {
src/vtt/session-persistence.ts-971-    throw new TypeError('Malformed VTT session revision.');
--
src/vtt/session-persistence.ts-1023-    throw new TypeError('Persisted combatant observations are not canonical.');
src/vtt/session-persistence.ts-1024-  }
src/vtt/session-persistence.ts-1025-  const encounterState = {
src/vtt/session-persistence.ts-1026-    ...value.encounterState,
src/vtt/session-persistence.ts-1027-    combatants: encounterCombatants,
src/vtt/session-persistence.ts-1028-    observationHistory,
src/vtt/session-persistence.ts-1029-  } as unknown as EncounterState;
src/vtt/session-persistence.ts-1030-  if (
src/vtt/session-persistence.ts:1031:    branchRngStateFingerprint(value.encounterState as unknown as EncounterState) !==
src/vtt/session-persistence.ts:1032:    value.branchRngStateFingerprint
src/vtt/session-persistence.ts-1033-  ) {
src/vtt/session-persistence.ts-1034-    throw new Error('Persisted VTT branch RNG state fingerprint mismatch.');
src/vtt/session-persistence.ts-1035-  }
src/vtt/session-persistence.ts-1036-  const revision = { ...value, transition, encounterState, partyState } as unknown as SessionRevision;
src/vtt/session-persistence.ts-1037-  const { checksum: _checksum, ...body } = revision;
src/vtt/session-persistence.ts-1038-  if (revisionChecksum(body) !== revision.checksum) {
src/vtt/session-persistence.ts-1039-    throw new Error('VTT session revision checksum mismatch.');
src/vtt/session-persistence.ts-1040-  }
--
src/vtt/session-persistence.ts-1091-  const worldStateIsNeutral = worldObjects.length === 0 && nextWorldObjectSequence === 1 &&
src/vtt/session-persistence.ts-1092-    environment.lightRegions.length === 0 && environment.difficultTerrainRegions.length === 0;
src/vtt/session-persistence.ts-1093-  const mechanicalState = worldStateIsNeutral
src/vtt/session-persistence.ts-1094-    ? areaNeutralState
src/vtt/session-persistence.ts-1095-    : { ...areaNeutralState, worldObjects, nextWorldObjectSequence, environment };
src/vtt/session-persistence.ts-1096-  return mechanicalState;
src/vtt/session-persistence.ts-1097-}
src/vtt/session-persistence.ts-1098-
src/vtt/session-persistence.ts:1099:function branchRngStateFingerprint(encounterState: EncounterState): string {
src/vtt/session-persistence.ts-1100-  return sha256(canonicalJson(mechanicalBranchState(encounterState)));
src/vtt/session-persistence.ts-1101-}
src/vtt/session-persistence.ts-1102-
src/vtt/session-persistence.ts-1103-export function deriveBranchRng(
src/vtt/session-persistence.ts-1104-  target: SessionRevision,
src/vtt/session-persistence.ts-1105-  branchId: EncounterBranchId,
src/vtt/session-persistence.ts-1106-): SerializableRng {
src/vtt/session-persistence.ts-1107-  const digest = sha256(canonicalJson({
src/vtt/session-persistence.ts:1108:    persistedEncounterStateFingerprint: target.branchRngStateFingerprint,
src/vtt/session-persistence.ts-1109-    parentRngState: target.rngState,
src/vtt/session-persistence.ts-1110-    branchId,
src/vtt/session-persistence.ts-1111-  }));
src/vtt/session-persistence.ts-1112-  const seed = Number.parseInt(digest.slice(0, 8), 16) >>> 0;
src/vtt/session-persistence.ts-1113-  return restoreMulberry32({
src/vtt/session-persistence.ts-1114-    algorithm: 'mulberry32-v1',
src/vtt/session-persistence.ts-1115-    initialSeed: seed,
src/vtt/session-persistence.ts-1116-    state: seed,
--
src/vtt/session-persistence.ts-2369-      schemaVersion: VTT_SESSION_SCHEMA_VERSION,
src/vtt/session-persistence.ts-2370-      sessionId: this.sessionId,
src/vtt/session-persistence.ts-2371-      revision,
src/vtt/session-persistence.ts-2372-      activeHeadRevision: revision,
src/vtt/session-persistence.ts-2373-      parentRevision: input.parentRevision,
src/vtt/session-persistence.ts-2374-      branchId: input.branchId,
src/vtt/session-persistence.ts-2375-      transition: input.transition,
src/vtt/session-persistence.ts-2376-      encounterState: input.encounterState,
src/vtt/session-persistence.ts:2377:      branchRngStateFingerprint: branchRngStateFingerprint(input.encounterState),
src/vtt/session-persistence.ts-2378-      partyState: input.partyState,
src/vtt/session-persistence.ts-2379-      rngState: this.#rng.snapshot(),
src/vtt/session-persistence.ts-2380-      coordinatorState: input.coordinatorState,
src/vtt/session-persistence.ts-2381-      controllers: input.controllers,
src/vtt/session-persistence.ts-2382-      agentSession: input.agentSession,
src/vtt/session-persistence.ts-2383-    };
src/vtt/session-persistence.ts-2384-    const persisted: SessionRevision = {
src/vtt/session-persistence.ts-2385-      ...body,
--
src/vtt/session-persistence.ts-2863-        const revisions = bundle.revisions.map((revision) => {
src/vtt/session-persistence.ts-2864-          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
src/vtt/session-persistence.ts-2865-            throw new TypeError('VTT session v3 revision is malformed.');
src/vtt/session-persistence.ts-2866-          }
src/vtt/session-persistence.ts-2867-          const { checksum: _oldChecksum, ...oldBody } = revision;
src/vtt/session-persistence.ts-2868-          const body = {
src/vtt/session-persistence.ts-2869-            ...oldBody,
src/vtt/session-persistence.ts-2870-            schemaVersion: 4 as const,
src/vtt/session-persistence.ts:2871:            branchRngStateFingerprint: branchRngStateFingerprint(
src/vtt/session-persistence.ts-2872-              revision.encounterState as unknown as EncounterState,
src/vtt/session-persistence.ts-2873-            ),
src/vtt/session-persistence.ts-2874-          };
src/vtt/session-persistence.ts-2875-          return { ...body, checksum: sha256(canonicalJson(body)) };
src/vtt/session-persistence.ts-2876-        });
src/vtt/session-persistence.ts-2877-        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
src/vtt/session-persistence.ts-2878-        const body = {
src/vtt/session-persistence.ts-2879-          ...oldBundle,
--
src/vtt/session-persistence.ts-2925-            return { ...combatant, deathAt };
src/vtt/session-persistence.ts-2926-          });
src/vtt/session-persistence.ts-2927-          const migratedEncounterState = { ...encounterState, combatants } as unknown as EncounterState;
src/vtt/session-persistence.ts-2928-          const { checksum: _oldChecksum, ...oldBody } = revision;
src/vtt/session-persistence.ts-2929-          const body = {
src/vtt/session-persistence.ts-2930-            ...oldBody,
src/vtt/session-persistence.ts-2931-            schemaVersion: 5 as const,
src/vtt/session-persistence.ts-2932-            encounterState: migratedEncounterState,
src/vtt/session-persistence.ts:2933:            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
src/vtt/session-persistence.ts-2934-          };
src/vtt/session-persistence.ts-2935-          return { ...body, checksum: sha256(canonicalJson(body)) };
src/vtt/session-persistence.ts-2936-        });
src/vtt/session-persistence.ts-2937-        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
src/vtt/session-persistence.ts-2938-        const body = {
src/vtt/session-persistence.ts-2939-          ...oldBundle,
src/vtt/session-persistence.ts-2940-          format: 'vtt-session-revisions' as const,
src/vtt/session-persistence.ts-2941-          schemaVersion: 5 as const,
--
src/vtt/session-persistence.ts-2966-            ...legacyEncounterState,
src/vtt/session-persistence.ts-2967-            hiddenRolls: hideDeathSaveRolls ? ['death_saves'] : [],
src/vtt/session-persistence.ts-2968-          } as unknown as EncounterState;
src/vtt/session-persistence.ts-2969-          const { checksum: _oldChecksum, ...oldBody } = revision;
src/vtt/session-persistence.ts-2970-          const body = {
src/vtt/session-persistence.ts-2971-            ...oldBody,
src/vtt/session-persistence.ts-2972-            schemaVersion: 6 as const,
src/vtt/session-persistence.ts-2973-            encounterState: migratedEncounterState,
src/vtt/session-persistence.ts:2974:            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
src/vtt/session-persistence.ts-2975-          };
src/vtt/session-persistence.ts-2976-          return { ...body, checksum: sha256(canonicalJson(body)) };
src/vtt/session-persistence.ts-2977-        });
src/vtt/session-persistence.ts-2978-        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
src/vtt/session-persistence.ts-2979-        const body = {
src/vtt/session-persistence.ts-2980-          ...oldBundle,
src/vtt/session-persistence.ts-2981-          format: 'vtt-session-revisions' as const,
src/vtt/session-persistence.ts-2982-          schemaVersion: 6 as const,
--
src/vtt/session-persistence.ts-3020-              : encounterConclusionAfter(parent, activeEncounterState) ?? activeEncounterState.phase;
src/vtt/session-persistence.ts-3021-          const migratedEncounterState = { ...activeEncounterState, phase };
src/vtt/session-persistence.ts-3022-          migratedByRevision.set(revision.revision as number, migratedEncounterState);
src/vtt/session-persistence.ts-3023-          const { checksum: _oldChecksum, ...oldBody } = revision;
src/vtt/session-persistence.ts-3024-          const body = {
src/vtt/session-persistence.ts-3025-            ...oldBody,
src/vtt/session-persistence.ts-3026-            schemaVersion: 7 as const,
src/vtt/session-persistence.ts-3027-            encounterState: migratedEncounterState,
src/vtt/session-persistence.ts:3028:            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
src/vtt/session-persistence.ts-3029-          };
src/vtt/session-persistence.ts-3030-          return { ...body, checksum: sha256(canonicalJson(body)) };
src/vtt/session-persistence.ts-3031-        });
src/vtt/session-persistence.ts-3032-        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
src/vtt/session-persistence.ts-3033-        const body = {
src/vtt/session-persistence.ts-3034-          ...oldBundle,
src/vtt/session-persistence.ts-3035-          format: 'vtt-session-revisions' as const,
src/vtt/session-persistence.ts-3036-          schemaVersion: 7 as const,
--
src/vtt/session-persistence.ts-3219-          if (sha256(canonicalJson(oldBody)) !== revision.checksum) {
src/vtt/session-persistence.ts-3220-            throw new Error('VTT session v10 revision checksum mismatch.');
src/vtt/session-persistence.ts-3221-          }
src/vtt/session-persistence.ts-3222-          const encounterState = migrateV10EncounterState(revision.encounterState);
src/vtt/session-persistence.ts-3223-          const body = {
src/vtt/session-persistence.ts-3224-            ...oldBody,
src/vtt/session-persistence.ts-3225-            schemaVersion: 11 as const,
src/vtt/session-persistence.ts-3226-            encounterState,
src/vtt/session-persistence.ts:3227:            branchRngStateFingerprint: branchRngStateFingerprint(encounterState),
src/vtt/session-persistence.ts-3228-          };
src/vtt/session-persistence.ts-3229-          return { ...body, checksum: sha256(canonicalJson(body)) };
src/vtt/session-persistence.ts-3230-        });
src/vtt/session-persistence.ts-3231-        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
src/vtt/session-persistence.ts-3232-        const body = {
src/vtt/session-persistence.ts-3233-          ...oldBundle,
src/vtt/session-persistence.ts-3234-          format: 'vtt-session-revisions' as const,
src/vtt/session-persistence.ts-3235-          schemaVersion: 11 as const,
--
src/vtt/session-persistence.ts-3259-          const encounterState = {
src/vtt/session-persistence.ts-3260-            ...revision.encounterState,
src/vtt/session-persistence.ts-3261-            observationHistory: [],
src/vtt/session-persistence.ts-3262-          } as unknown as EncounterState;
src/vtt/session-persistence.ts-3263-          const body = {
src/vtt/session-persistence.ts-3264-            ...oldBody,
src/vtt/session-persistence.ts-3265-            schemaVersion: 12 as const,
src/vtt/session-persistence.ts-3266-            encounterState,
src/vtt/session-persistence.ts:3267:            branchRngStateFingerprint: branchRngStateFingerprint(encounterState),
src/vtt/session-persistence.ts-3268-          };
src/vtt/session-persistence.ts-3269-          return { ...body, checksum: sha256(canonicalJson(body)) };
src/vtt/session-persistence.ts-3270-        });
src/vtt/session-persistence.ts-3271-        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
src/vtt/session-persistence.ts-3272-        const body = {
src/vtt/session-persistence.ts-3273-          ...oldBundle,
src/vtt/session-persistence.ts-3274-          format: 'vtt-session-revisions' as const,
src/vtt/session-persistence.ts-3275-          schemaVersion: 12 as const,
--
src/vtt/session-persistence.ts-3465-export function exportSavedSessionV1ForMigrationTest(
src/vtt/session-persistence.ts-3466-  store: SessionStore,
src/vtt/session-persistence.ts-3467-  sessionId: EncounterSessionId,
src/vtt/session-persistence.ts-3468-): string {
src/vtt/session-persistence.ts-3469-  const revisions = store.revisions(sessionId).map((revision) => {
src/vtt/session-persistence.ts-3470-    const {
src/vtt/session-persistence.ts-3471-      checksum: _checksum,
src/vtt/session-persistence.ts-3472-      partyState: _partyState,
src/vtt/session-persistence.ts:3473:      branchRngStateFingerprint: _branchRngStateFingerprint,
src/vtt/session-persistence.ts-3474-      agentSession,
src/vtt/session-persistence.ts-3475-      encounterState,
src/vtt/session-persistence.ts-3476-      ...currentBody
src/vtt/session-persistence.ts-3477-    } = revision;
src/vtt/session-persistence.ts-3478-    const { hiddenRolls, ...legacyEncounterState } = encounterState;
src/vtt/session-persistence.ts-3479-    const body = {
src/vtt/session-persistence.ts-3480-      ...currentBody,
src/vtt/session-persistence.ts-3481-      schemaVersion: 2 as const,
--
tests/unit/vtt/dm-tactical-intel.test.ts-24-const OFFER_ENVIRONMENT = buildOfferEnvironment({
tests/unit/vtt/dm-tactical-intel.test.ts-25-  kind: 'configuration',
tests/unit/vtt/dm-tactical-intel.test.ts-26-  mode: 'legacy_standard',
tests/unit/vtt/dm-tactical-intel.test.ts-27-});
tests/unit/vtt/dm-tactical-intel.test.ts-28-
tests/unit/vtt/dm-tactical-intel.test.ts-29-const FIGHTER = combatantId('combatant:fighter');
tests/unit/vtt/dm-tactical-intel.test.ts-30-const SCOUT = combatantId('combatant:generated-5117009-monster-3');
tests/unit/vtt/dm-tactical-intel.test.ts-31-
tests/unit/vtt/dm-tactical-intel.test.ts:32:function reauthoredClearScoutShot(state: EncounterState): EncounterState {
tests/unit/vtt/dm-tactical-intel.test.ts-33-  return {
tests/unit/vtt/dm-tactical-intel.test.ts-34-    ...state,
tests/unit/vtt/dm-tactical-intel.test.ts-35-    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
tests/unit/vtt/dm-tactical-intel.test.ts-36-      ? { column: 9, row: 2 }
tests/unit/vtt/dm-tactical-intel.test.ts-37-      : cell),
tests/unit/vtt/dm-tactical-intel.test.ts-38-  };
tests/unit/vtt/dm-tactical-intel.test.ts-39-}
tests/unit/vtt/dm-tactical-intel.test.ts-40-
--
tests/unit/vtt/dm-tactical-intel.test.ts-62-    expected_revision: capsule.revision,
tests/unit/vtt/dm-tactical-intel.test.ts-63-    scope: 'round',
tests/unit/vtt/dm-tactical-intel.test.ts-64-    granularity: 'full',
tests/unit/vtt/dm-tactical-intel.test.ts-65-  }), 'full context');
tests/unit/vtt/dm-tactical-intel.test.ts-66-}
tests/unit/vtt/dm-tactical-intel.test.ts-67-
tests/unit/vtt/dm-tactical-intel.test.ts-68-describe('versioned DM tactical intel', () => {
tests/unit/vtt/dm-tactical-intel.test.ts-69-  it('renders target-specific non-nearest R02 rows in always-on context with exact reasons', async () => {
tests/unit/vtt/dm-tactical-intel.test.ts:70:    const loaded = reauthoredClearScoutShot(
tests/unit/vtt/dm-tactical-intel.test.ts-71-      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
tests/unit/vtt/dm-tactical-intel.test.ts-72-    );
tests/unit/vtt/dm-tactical-intel.test.ts-73-    const state = freshMonsterPlanningState(loaded);
tests/unit/vtt/dm-tactical-intel.test.ts-74-    const runtime = createEngineMcpRuntime(state, {
tests/unit/vtt/dm-tactical-intel.test.ts-75-      toolProfile: 'dm',
tests/unit/vtt/dm-tactical-intel.test.ts-76-      offerEnvironment: OFFER_ENVIRONMENT,
tests/unit/vtt/dm-tactical-intel.test.ts-77-    });
tests/unit/vtt/dm-tactical-intel.test.ts-78-    const capsule = runtime.feed.current();
--
tests/unit/vtt/scene-snapshot.test.ts-92-}
tests/unit/vtt/scene-snapshot.test.ts-93-
tests/unit/vtt/scene-snapshot.test.ts-94-interface PersistedByteBaseline {
tests/unit/vtt/scene-snapshot.test.ts-95-  readonly pendingRequestHash: string;
tests/unit/vtt/scene-snapshot.test.ts-96-  readonly coordinatorHash: string;
tests/unit/vtt/scene-snapshot.test.ts-97-  readonly revisionChecksum: string;
tests/unit/vtt/scene-snapshot.test.ts-98-}
tests/unit/vtt/scene-snapshot.test.ts-99-
tests/unit/vtt/scene-snapshot.test.ts:100:function persistedRevisionChecksum(
tests/unit/vtt/scene-snapshot.test.ts-101-  state: ReturnType<typeof fixtureState>,
tests/unit/vtt/scene-snapshot.test.ts-102-  coordinatorState: PersistedCoordinatorState,
tests/unit/vtt/scene-snapshot.test.ts-103-): string {
tests/unit/vtt/scene-snapshot.test.ts-104-  const store = new MemoryBrowserSessionStore();
tests/unit/vtt/scene-snapshot.test.ts-105-  const sessionId = encounterSessionId('session:handoff-persistence-baseline');
tests/unit/vtt/scene-snapshot.test.ts-106-  EncounterSessionJournal.create({
tests/unit/vtt/scene-snapshot.test.ts-107-    sessionId,
tests/unit/vtt/scene-snapshot.test.ts-108-    branchId: encounterBranchId('branch:handoff-persistence-baseline'),
--
tests/unit/vtt/scene-snapshot.test.ts-113-    store,
tests/unit/vtt/scene-snapshot.test.ts-114-    mirror: new MemoryMirrorSink(),
tests/unit/vtt/scene-snapshot.test.ts-115-  });
tests/unit/vtt/scene-snapshot.test.ts-116-  const revision = store.revisions(sessionId)[0];
tests/unit/vtt/scene-snapshot.test.ts-117-  if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
tests/unit/vtt/scene-snapshot.test.ts-118-  return revision.checksum;
tests/unit/vtt/scene-snapshot.test.ts-119-}
tests/unit/vtt/scene-snapshot.test.ts-120-
tests/unit/vtt/scene-snapshot.test.ts:121:function persistedByteBaseline(
tests/unit/vtt/scene-snapshot.test.ts-122-  state: ReturnType<typeof fixtureState>,
tests/unit/vtt/scene-snapshot.test.ts-123-  coordinatorState: PersistedCoordinatorState,
tests/unit/vtt/scene-snapshot.test.ts-124-): PersistedByteBaseline {
tests/unit/vtt/scene-snapshot.test.ts-125-  if (coordinatorState.pendingRequest === null) throw new Error('PERSISTENCE_BASELINE_REQUEST_MISSING');
tests/unit/vtt/scene-snapshot.test.ts-126-  return {
tests/unit/vtt/scene-snapshot.test.ts-127-    pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
tests/unit/vtt/scene-snapshot.test.ts-128-    coordinatorHash: sha256(canonicalJson(coordinatorState)),
tests/unit/vtt/scene-snapshot.test.ts:129:    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
tests/unit/vtt/scene-snapshot.test.ts-130-  };
tests/unit/vtt/scene-snapshot.test.ts-131-}
tests/unit/vtt/scene-snapshot.test.ts-132-
tests/unit/vtt/scene-snapshot.test.ts-133-function assertPersistedHandoffBytesUnchanged(
tests/unit/vtt/scene-snapshot.test.ts-134-  expected: PersistedByteBaseline,
tests/unit/vtt/scene-snapshot.test.ts-135-  state: ReturnType<typeof fixtureState>,
tests/unit/vtt/scene-snapshot.test.ts-136-  coordinatorState: PersistedCoordinatorState,
tests/unit/vtt/scene-snapshot.test.ts-137-): void {
tests/unit/vtt/scene-snapshot.test.ts:138:  const actual = persistedByteBaseline(state, coordinatorState);
tests/unit/vtt/scene-snapshot.test.ts-139-  if (canonicalJson(actual) !== canonicalJson(expected)) {
tests/unit/vtt/scene-snapshot.test.ts-140-    throw new Error('PERSISTED_HANDOFF_BYTES_CHANGED');
tests/unit/vtt/scene-snapshot.test.ts-141-  }
tests/unit/vtt/scene-snapshot.test.ts-142-}
tests/unit/vtt/scene-snapshot.test.ts-143-
tests/unit/vtt/scene-snapshot.test.ts-144-describe('renderer-neutral scene snapshot', () => {
tests/unit/vtt/scene-snapshot.test.ts-145-  it('pins ground centres and inverse anchors for every controlled span', () => {
tests/unit/vtt/scene-snapshot.test.ts-146-    const anchor = { column: 2, row: 3 };
--
tests/unit/vtt/scene-snapshot.test.ts-221-        kind: 'turn' as const,
tests/unit/vtt/scene-snapshot.test.ts-222-        requestId: 'request:handoff-baseline',
tests/unit/vtt/scene-snapshot.test.ts-223-        encounterRevision: state.revision,
tests/unit/vtt/scene-snapshot.test.ts-224-        actorId: REFERENCE_FIGHTER_ID,
tests/unit/vtt/scene-snapshot.test.ts-225-        visibleState: view,
tests/unit/vtt/scene-snapshot.test.ts-226-        legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
tests/unit/vtt/scene-snapshot.test.ts-227-      },
tests/unit/vtt/scene-snapshot.test.ts-228-    };
tests/unit/vtt/scene-snapshot.test.ts:229:    const before = persistedByteBaseline(state, coordinator);
tests/unit/vtt/scene-snapshot.test.ts-230-    const projection = projectPlayerBoard(view, coordinator);
tests/unit/vtt/scene-snapshot.test.ts-231-    sceneSnapshot({
tests/unit/vtt/scene-snapshot.test.ts-232-      sceneId: 'scene:pending', projection, art: REFERENCE_ENCOUNTER_ART,
tests/unit/vtt/scene-snapshot.test.ts-233-      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
tests/unit/vtt/scene-snapshot.test.ts-234-    });
tests/unit/vtt/scene-snapshot.test.ts:235:    const after = persistedByteBaseline(state, coordinator);
tests/unit/vtt/scene-snapshot.test.ts-236-    // Fighter (2,3) has corners (2,3),(3,3),(2,4),(3,4). For each target (c,4), c=7,8,9:
tests/unit/vtt/scene-snapshot.test.ts-237-    // rays from either row-3 source corner to (c,4)/(c+1,4) enter Oak Door (6,3), while rays
tests/unit/vtt/scene-snapshot.test.ts-238-    // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
tests/unit/vtt/scene-snapshot.test.ts-239-    // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
tests/unit/vtt/scene-snapshot.test.ts-240-    // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
tests/unit/vtt/scene-snapshot.test.ts-241-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
tests/unit/vtt/scene-snapshot.test.ts-242-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
tests/unit/vtt/scene-snapshot.test.ts-243-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
--
tests/unit/vtt/scene-snapshot.test.ts-286-      },
tests/unit/vtt/scene-snapshot.test.ts-287-    };
tests/unit/vtt/scene-snapshot.test.ts-288-    const enrichedCoordinator: PersistedCoordinatorState = {
tests/unit/vtt/scene-snapshot.test.ts-289-      ...coordinator,
tests/unit/vtt/scene-snapshot.test.ts-290-      pendingRequest: enrichedRequest,
tests/unit/vtt/scene-snapshot.test.ts-291-    };
tests/unit/vtt/scene-snapshot.test.ts-292-    expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
tests/unit/vtt/scene-snapshot.test.ts-293-      .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
tests/unit/vtt/scene-snapshot.test.ts:294:    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
tests/unit/vtt/scene-snapshot.test.ts-295-  });
tests/unit/vtt/scene-snapshot.test.ts-296-
tests/unit/vtt/scene-snapshot.test.ts-297-  it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
tests/unit/vtt/scene-snapshot.test.ts-298-    const state = fixtureState();
tests/unit/vtt/scene-snapshot.test.ts-299-    const projection = projectDmBoard({
tests/unit/vtt/scene-snapshot.test.ts-300-      view: projectDmView(state),
tests/unit/vtt/scene-snapshot.test.ts-301-      coordinator: IDLE,
tests/unit/vtt/scene-snapshot.test.ts-302-      controllers: [],
--
tests/unit/tools/ai-dm-conversation.test.ts-212-  expectedOpened: readonly string[],
tests/unit/tools/ai-dm-conversation.test.ts-213-  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
tests/unit/tools/ai-dm-conversation.test.ts-214-): void {
tests/unit/tools/ai-dm-conversation.test.ts-215-  const delta = monsterPlayerVisibilityDelta(before, after, sourceAnchors);
tests/unit/tools/ai-dm-conversation.test.ts-216-  expect(delta.opened).toEqual(expectedOpened);
tests/unit/tools/ai-dm-conversation.test.ts-217-  expect(delta.closed).toEqual([]);
tests/unit/tools/ai-dm-conversation.test.ts-218-}
tests/unit/tools/ai-dm-conversation.test.ts-219-
tests/unit/tools/ai-dm-conversation.test.ts:220:function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
tests/unit/tools/ai-dm-conversation.test.ts-221-  const seamRows = new Set([1, 5]);
tests/unit/tools/ai-dm-conversation.test.ts-222-  const matchingBlockers = state.blockedCells.filter((cell) =>
tests/unit/tools/ai-dm-conversation.test.ts-223-    cell.column === 10 && seamRows.has(cell.row));
tests/unit/tools/ai-dm-conversation.test.ts-224-  if (matchingBlockers.length !== seamRows.size) {
tests/unit/tools/ai-dm-conversation.test.ts-225-    throw new Error('The hard exhaustion fixture no longer has both expected seam blockers.');
tests/unit/tools/ai-dm-conversation.test.ts-226-  }
tests/unit/tools/ai-dm-conversation.test.ts-227-  const reauthored = {
tests/unit/tools/ai-dm-conversation.test.ts-228-    ...state,
--
tests/unit/tools/ai-dm-conversation.test.ts-2725-  });
tests/unit/tools/ai-dm-conversation.test.ts-2726-
tests/unit/tools/ai-dm-conversation.test.ts-2727-  it('uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit', { timeout: 60_000 }, async () => {
tests/unit/tools/ai-dm-conversation.test.ts-2728-    const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unresolved-frontier-'));
tests/unit/tools/ai-dm-conversation.test.ts-2729-    // D635's row-line-2 seam at (10,1)/(10,2) blocks monster-2's Spear after its
tests/unit/tools/ai-dm-conversation.test.ts-2730-    // move to (13,1); changing that blocker then exposes monster-5's Longbow at
tests/unit/tools/ai-dm-conversation.test.ts-2731-    // the independent row-line-6 seam (10,5)/(10,6), so both blockers move left.
tests/unit/tools/ai-dm-conversation.test.ts-2732-    // Each move also opens every ray through the old cell interior, pinned above.
tests/unit/tools/ai-dm-conversation.test.ts:2733:    const state = reauthoredHardExhaustionSightlines(
tests/unit/tools/ai-dm-conversation.test.ts-2734-      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
tests/unit/tools/ai-dm-conversation.test.ts-2735-    );
tests/unit/tools/ai-dm-conversation.test.ts-2736-    const config = parseConversationArgs([
tests/unit/tools/ai-dm-conversation.test.ts-2737-      '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.jsonl'),
tests/unit/tools/ai-dm-conversation.test.ts-2738-      '--capture-rl-data', '--dry-run',
tests/unit/tools/ai-dm-conversation.test.ts-2739-      ...LEGACY_BLOCK_ARGS,
tests/unit/tools/ai-dm-conversation.test.ts-2740-    ]);
tests/unit/tools/ai-dm-conversation.test.ts-2741-
--
tests/unit/tools/ai-dm-conversation.test.ts-2825-    const config = parseConversationArgs([
tests/unit/tools/ai-dm-conversation.test.ts-2826-      '--rooms', '1', '--rounds', String(rounds), '--out', join(directory, 'rows.jsonl'),
tests/unit/tools/ai-dm-conversation.test.ts-2827-      '--dry-run',
tests/unit/tools/ai-dm-conversation.test.ts-2828-      ...LEGACY_BLOCK_ARGS,
tests/unit/tools/ai-dm-conversation.test.ts-2829-    ]);
tests/unit/tools/ai-dm-conversation.test.ts-2830-    const state = hard
tests/unit/tools/ai-dm-conversation.test.ts-2831-      // The typed fallback is reached after monster-2's Spear and monster-5's
tests/unit/tools/ai-dm-conversation.test.ts-2832-      // Longbow clear their seams; the moves also open the pinned interior rays.
tests/unit/tools/ai-dm-conversation.test.ts:2833:      ? reauthoredHardExhaustionSightlines(
tests/unit/tools/ai-dm-conversation.test.ts-2834-          await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
tests/unit/tools/ai-dm-conversation.test.ts-2835-        )
tests/unit/tools/ai-dm-conversation.test.ts-2836-      : await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json');
tests/unit/tools/ai-dm-conversation.test.ts-2837-
tests/unit/tools/ai-dm-conversation.test.ts-2838-    const result = await runConversation(config, { roomStates: [state], ...options });
tests/unit/tools/ai-dm-conversation.test.ts-2839-
tests/unit/tools/ai-dm-conversation.test.ts-2840-    expect(result.rows.at(-1)?.fallbackReason).toBe(expected);
tests/unit/tools/ai-dm-conversation.test.ts-2841-    expect(result.rows.at(-1)?.refusals).toEqual([]);
      !Number.isSafeInteger(entry.cell.column) || (entry.cell.column as number) < 0 ||
      !Number.isSafeInteger(entry.cell.row) || (entry.cell.row as number) < 0 ||
      !Number.isSafeInteger(entry.round) || (entry.round as number) < 0 ||
      !Number.isSafeInteger(entry.revision) || (entry.revision as number) < 0) {
      throw new TypeError('Persisted combatant observation is malformed.');
    }
    const key = `${entry.observer}\u0000${entry.subject}`;
    if (observationKeys.has(key)) throw new TypeError('Persisted combatant observations duplicate an observer-subject pair.');
    observationKeys.add(key);
    return structuredClone(entry) as unknown as EncounterState['observationHistory'][number];
  });
  const orderedObservationKeys = observationHistory.map((entry) => `${String(entry.observer)}\u0000${String(entry.subject)}`);
  if (orderedObservationKeys.some((key, index) => index > 0 && key.localeCompare(orderedObservationKeys[index - 1]!) < 0)) {
    throw new TypeError('Persisted combatant observations are not canonical.');
  }
  const encounterState = {
    ...value.encounterState,
    combatants: encounterCombatants,
    observationHistory,
  } as unknown as EncounterState;
  if (
    branchRngStateFingerprint(value.encounterState as unknown as EncounterState) !==
    value.branchRngStateFingerprint
  ) {
    throw new Error('Persisted VTT branch RNG state fingerprint mismatch.');
  }
  const revision = { ...value, transition, encounterState, partyState } as unknown as SessionRevision;
  const { checksum: _checksum, ...body } = revision;
  if (revisionChecksum(body) !== revision.checksum) {
    throw new Error('VTT session revision checksum mismatch.');
  }
  return revision;
}

function mechanicalBranchState(encounterState: EncounterState): unknown {
  const {
    config: _config,
    hiddenRolls: _hiddenRolls,
    persistentAreas,
    nextPersistentAreaSequence,
    worldObjects,
    nextWorldObjectSequence,
    environment,
    combatants,
    rulesEdition,
    nextDecisionSequence,
    hiddenCombatants,
    pendingDecisions,
    reactionPolicies,
    ...stateWithoutCombatants
  } = encounterState;
  // Player-facing roll visibility cannot change the deterministic mechanical
  // future of an otherwise identical branch.
  const normalizedCombatants = combatants.map((entry) => {
    const senses = entry.profile.rules.senses;
    const rulesAreDetectionNeutral = senses.length === 1 && senses[0]?.kind === 'normal_sight' &&
      entry.profile.rules.passivePerception === 10 && entry.profile.rules.detectionTraits.length === 0 &&
      entry.profile.rules.contactMedium === 'surface';
    if (!rulesAreDetectionNeutral) return entry;
    const {
      senses: _defaultNormalSight,
      passivePerception: _defaultPassivePerception,
      detectionTraits: _defaultDetectionTraits,
      contactMedium: _defaultContactMedium,
      ...rules
    } = entry.profile.rules;
    return { ...entry, profile: { ...entry.profile, rules } };
  });
  const defaultDetectionState = rulesEdition === '2024' && nextDecisionSequence === 1 &&
    hiddenCombatants.length === 0 && pendingDecisions.length === 0 && reactionPolicies.length === 0;
  const baseMechanicalState = defaultDetectionState
    ? { ...stateWithoutCombatants, combatants: normalizedCombatants }
    : {
        ...stateWithoutCombatants, combatants: normalizedCombatants, rulesEdition,
        nextDecisionSequence, hiddenCombatants, pendingDecisions, reactionPolicies,
      };
  // Empty additive state is mechanically neutral and does not perturb branch
  // streams; once an area exists, both its state and allocator are authoritative.
  const areaNeutralState = persistentAreas.length === 0 && nextPersistentAreaSequence === 1
    ? baseMechanicalState
    : { ...baseMechanicalState, persistentAreas, nextPersistentAreaSequence };
  const worldStateIsNeutral = worldObjects.length === 0 && nextWorldObjectSequence === 1 &&
    environment.lightRegions.length === 0 && environment.difficultTerrainRegions.length === 0;
  const mechanicalState = worldStateIsNeutral
    ? areaNeutralState
    : { ...areaNeutralState, worldObjects, nextWorldObjectSequence, environment };
  return mechanicalState;
}

function branchRngStateFingerprint(encounterState: EncounterState): string {
  return sha256(canonicalJson(mechanicalBranchState(encounterState)));
}

export function deriveBranchRng(
  target: SessionRevision,
  branchId: EncounterBranchId,
): SerializableRng {
  const digest = sha256(canonicalJson({
    persistedEncounterStateFingerprint: target.branchRngStateFingerprint,
    parentRngState: target.rngState,
    branchId,
  }));
  const seed = Number.parseInt(digest.slice(0, 8), 16) >>> 0;
  return restoreMulberry32({
    algorithm: 'mulberry32-v1',
    initialSeed: seed,
    state: seed,
    draws: 0,
    streamId: `branch:${branchId}:${digest}`,
  });
}

export interface PacingAdvance {
  readonly encounterState: EncounterState;
  readonly events: readonly EncounterEvent[];
}

function pacingCoordinatorState(state: PersistedCoordinatorState): PersistedCoordinatorState {
  return {
    ...state,
    pendingRequest: null,
    const monsterTokenId = String(state.tokens.find((token) => token.combatantId === REFERENCE_MONSTER_ID)?.id);
    expect(before.tokens.map((token) => token.id)).toContain(monsterTokenId);
    const hidden = {
      ...state,
      hiddenCombatants: [{
        combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: '2024' as const,
      }],
    };
    const after = sceneSnapshot({
      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(hidden, binding), IDLE),
      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
    }).snapshot;
    expect(after.tokens.map((token) => token.id)).not.toContain(monsterTokenId);
  });

  it('preserves full persisted request/coordinator bytes and the actual revision checksum', () => {
    const state = fixtureState();
    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
    const coordinator: PersistedCoordinatorState = {
      ...IDLE,
      pendingRequest: {
        kind: 'turn' as const,
        requestId: 'request:handoff-baseline',
        encounterRevision: state.revision,
        actorId: REFERENCE_FIGHTER_ID,
        visibleState: view,
        legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
      },
    };
    const before = persistedByteBaseline(state, coordinator);
    const projection = projectPlayerBoard(view, coordinator);
    sceneSnapshot({
      sceneId: 'scene:pending', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    const after = persistedByteBaseline(state, coordinator);
    // Fighter (2,3) has corners (2,3),(3,3),(2,4),(3,4). For each target (c,4), c=7,8,9:
    // rays from either row-3 source corner to (c,4)/(c+1,4) enter Oak Door (6,3), while rays
    // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
    // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
    // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
    expect(view.concealedCells).toEqual([
      { column: 4, row: 3 },
      { column: 7, row: 4 },
      { column: 8, row: 4 },
      { column: 9, row: 4 },
    ]);
    // Pre-D635 concealed={(4,3)} and hashes were:
    // pendingRequest=fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e;
    // coordinator=c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d;
    // revision=15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc.
    // Pre-B4 revision=cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767;
    // Pre-B2 revision=df6f2cceaa19f66115b0bcd387212064b02ae288fc63c47b4db8f71a835fa4ee;
    // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
    // B2 removes the empty migration key and recomputes the fingerprint as
    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
    expect(before).toEqual({
      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
    });
    expect(coordinator.pendingRequest).toMatchObject({
      kind: 'turn',
      requestId: 'request:handoff-baseline',
      encounterRevision: 0,
      actorId: 'combatant:fighter',
      legalActions: { actions: [{ type: 'end_turn', actor: 'combatant:fighter' }] },
    });
    expect(coordinator.pendingRequest?.visibleState).toBe(view);
    expect(coordinator.pendingRequest?.visibleState !== undefined &&
      'tokenIdentityByCombatant' in coordinator.pendingRequest.visibleState).toBe(false);
    expect(after).toEqual(before);
    assertPersistedHandoffBytesUnchanged(before, state, coordinator);

    if (coordinator.pendingRequest === null) throw new Error('PERSISTENCE_CONTROL_REQUEST_MISSING');
    const enrichedRequest = {
      ...coordinator.pendingRequest,
      visibleState: {
        ...coordinator.pendingRequest.visibleState,
        tokenIdentityByCombatant: { [String(REFERENCE_FIGHTER_ID)]: 'token:fighter' },
  before: EncounterState,
  after: EncounterState,
  expectedOpened: readonly string[],
  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
): void {
  const delta = monsterPlayerVisibilityDelta(before, after, sourceAnchors);
  expect(delta.opened).toEqual(expectedOpened);
  expect(delta.closed).toEqual([]);
}

function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
  const seamRows = new Set([1, 5]);
  const matchingBlockers = state.blockedCells.filter((cell) =>
    cell.column === 10 && seamRows.has(cell.row));
  if (matchingBlockers.length !== seamRows.size) {
    throw new Error('The hard exhaustion fixture no longer has both expected seam blockers.');
  }
  const reauthored = {
    ...state,
    blockedCells: state.blockedCells.map((cell) =>
      cell.column === 10 && seamRows.has(cell.row)
        ? { column: 9, row: cell.row }
        : cell),
  };
  // Each move opens its targeted seam and every ray through the old cell interior.
  // Representative changed rays, with t from source to target:
  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
  pinMonsterPlayerVisibilityDelta(state, reauthored, [
    'combatant:generated-5117009-monster-1->combatant:fighter',
    'combatant:generated-5117009-monster-2->combatant:fighter',
    'combatant:generated-5117009-monster-2->combatant:cleric',
    'combatant:generated-5117009-monster-5->combatant:wizard',
    'combatant:generated-5117009-monster-6->combatant:wizard',
  ], new Map([
    [combatantId('combatant:generated-5117009-monster-2'), { column: 13, row: 1 }],
  ]));
  return reauthored;
const OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

const FIGHTER = combatantId('combatant:fighter');
const SCOUT = combatantId('combatant:generated-5117009-monster-3');

function reauthoredClearScoutShot(state: EncounterState): EncounterState {
  return {
    ...state,
    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
      ? { column: 9, row: 2 }
      : cell),
  };
}

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

async function r02Runtime(profile: 'dm' | 'full' = 'dm', turnContextMaximumBytes?: number) {
  const loaded = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
  const state = freshMonsterPlanningState(loaded);
  const runtime = createEngineMcpRuntime(state, {
    toolProfile: profile,
    offerEnvironment: OFFER_ENVIRONMENT,
    ...(turnContextMaximumBytes === undefined ? {} : { turnContextMaximumBytes }),
  });
  return { state, runtime, capsule: runtime.feed.current() };
}

function fullContext(runtime: ReturnType<typeof createEngineMcpRuntime>, capsule: EngineStateCapsule) {
  return record(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  }), 'full context');
}

describe('versioned DM tactical intel', () => {
  it('renders target-specific non-nearest R02 rows in always-on context with exact reasons', async () => {
    const loaded = reauthoredClearScoutShot(
      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
    );
    const state = freshMonsterPlanningState(loaded);
    const runtime = createEngineMcpRuntime(state, {
      toolProfile: 'dm',
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
    const context = fullContext(runtime, capsule);
    const actors = context['actors'];
    if (!Array.isArray(actors)) throw new TypeError('Actor contexts are absent.');
    const requested = capsule.request?.actors ?? [];
    expect(actors).toHaveLength(requested.length);
    expect(actors.every((value) => {
      const intel = record(record(value, 'actor')['intel'], 'actor intel');
      return intel['policy'] === DM_TURN_INTEL_POLICY &&
        Array.isArray(intel['rows']) && intel['rows'].length > 0;
    })).toBe(true);

    const scout = capsule.projection.combatants.find((actor) => actor.id === SCOUT);
    const fighter = capsule.projection.combatants.find((actor) => actor.id === FIGHTER);
    if (scout?.placementStatus !== 'placed' || fighter?.placementStatus !== 'placed') {
      throw new Error('Frozen R02 tokens are absent.');
    }
    const playerDistances: number[] = [];
    for (const target of capsule.projection.combatants) {
      if (target.placementStatus === 'placed' && target.side === 'player_character' && target.life !== 'dead') {
        playerDistances.push(gridDistance(scout.position, target.position));
      }
    }
    const nearestDistance = Math.min(...playerDistances);
    expect(gridDistance(scout.position, fighter.position)).toBe(90);
    expect(nearestDistance).toBe(85);

    const scoutContext = record(actors.find((value) => record(value, 'actor')['actor_id'] === SCOUT), 'scout context');
    const intel = record(scoutContext['intel'], 'scout intel');
    const rows = intel['rows'];
    if (!Array.isArray(rows)) throw new TypeError('Scout intel rows are absent.');
    const fighterRow = record(rows.find((value) => record(value, 'intel row')['target_id'] === FIGHTER), 'fighter row');
    const trace = traceCombatantLine(state, SCOUT, FIGHTER);
    expect({
      sourceCorner: trace.sourceCorner,
      lineTiers: trace.lines.map((line) => line.tier),
      coverTier: trace.tier,
    }).toEqual({
      sourceCorner: { column: 19, row: 3 },
      lineTiers: ['total', 'total', 'none', 'none'],
      coverTier: 'half',
    });
    expect(fighterRow).toMatchObject({
      target_id: FIGHTER,
      attacks: 2,
      visibility: 'VISIBLE',
      cover: 'HALF',
      range: 'NORMAL',
      distance_feet: 90,
      roll_mode: 'STRAIGHT',
      p_hit: '≈1/2',
      ev: 4,
      movement_need_feet: 0,
    });
    expect(fighterRow['reason_codes']).toEqual([
      'unconscious_advantage',
      'prone_ranged_disadvantage',
    ]);
    expect(fighterRow['consequence_codes']).toEqual([
      'death_failure_on_hit',
      'two_death_failures_on_critical',
      'automatic_critical_within_5_feet',
async function frozenState(): Promise<EncounterState> {
  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
}

function reauthoredClearScoutShot(state: EncounterState): EncounterState {
  return {
    ...state,
    blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
      ? { column: 9, row: 2 }
      : cell),
  };
}

describe('R02-like canonical tactical query', () => {
  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
    const state = reauthoredClearScoutShot(await frozenState());
    // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
    const handGeometry = [
      {
        scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },
        lineTiers: ['total', 'total', 'none', 'none'], coverTier: 'half',
        probabilities: { status: 'resolved', hit: 5 / 20, critical: 1 / 20, miss: 15 / 20 },
        expectedDamage: (4 / 20) * 6.5 + (1 / 20) * 11,
      },
      {
        scoutId: SCOUTS[1], position: { column: 19, row: 5 }, sourceCorner: { column: 19, row: 5 },
        lineTiers: ['total', 'total', 'none', 'total'], coverTier: 'three_quarters',
        probabilities: { status: 'resolved', hit: 2 / 20, critical: 1 / 20, miss: 18 / 20 },
        expectedDamage: (1 / 20) * 6.5 + (1 / 20) * 11,
      },
    ] as const;
    const rows = handGeometry.map((geometry) => {
      const scoutId = geometry.scoutId;
      const action = OFFER_ENVIRONMENT.queries.actions(state, scoutId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === 'longbow');
      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
      const reach = OFFER_ENVIRONMENT.queries.reach(state, {
        actorId: scoutId,
        targetId: FIGHTER,
        actionId: action.id,
      });
      const evaluation = OFFER_ENVIRONMENT.queries.tacticalAttack(
        state,
        scoutId,
        FIGHTER,
        action.id,
      );
      if (evaluation === null) throw new Error(`${scoutId} tactical evaluation is absent.`);
      // The executor-side state adapter must produce the exact same canonical verdict.
      expect(evaluateMonsterTacticalAttack(state, action, scoutId, FIGHTER)).toEqual(evaluation);
      const trace = traceCombatantLine(state, scoutId, FIGHTER);
      expect(state.tokens.find((token) => token.combatantId === scoutId)?.position).toEqual(geometry.position);
      expect({
        sourceCorner: trace.sourceCorner,
        lineTiers: trace.lines.map((line) => line.tier),
        coverTier: trace.tier,
      }).toEqual({
        sourceCorner: geometry.sourceCorner,
        lineTiers: geometry.lineTiers,
        coverTier: geometry.coverTier,
      });
      return {
        scoutId,
        minimumMovementFeet: reach.legal ? 0 : null,
        range: evaluation.range,
        rollMode: evaluation.rollMode,
        probabilities: evaluation.probabilities,
        damage: evaluation.damage,
        consequences: evaluation.consequences,
        policy: evaluation.policy,
        expectedProbabilities: geometry.probabilities,
        expectedDamage: geometry.expectedDamage,
      };
    });

    for (const row of rows) {
      // Fixture positions differ by 18 columns and at most 3 rows: Chebyshev 18 * 5 = 90 ft.
      expect(row.minimumMovementFeet).toBe(0);
      expect(row.range).toEqual({
        status: 'resolved', distanceFeet: 90, band: 'normal', legal: true,
      });
      expect(row.rollMode).toMatchObject({
        mode: 'normal',
        reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
      });
      // +4 attacks the hand-counted Half/Three-Quarters adjusted AC above.
      expect(row.probabilities).toEqual(row.expectedProbabilities);
      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
      expect(row.damage).toEqual({
        status: 'resolved',
        normalHitAverage: 6.5,
        criticalHitAverage: 11,
        expectedDamage: row.expectedDamage,
      });

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/tactical-evaluator-r02.test.ts
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..1a3e133c8c349a3a36994de3effdc2ca2297743e
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,26 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toEqual(expect.arrayContaining([
+    { column: 9, row: 1 },
+    { column: 9, row: 5 },
+  ]));
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..1a3e133c8c349a3a36994de3effdc2ca2297743e
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,26 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toEqual(expect.arrayContaining([
+    { column: 9, row: 1 },
+    { column: 9, row: 5 },
+  ]));
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

exec
/bin/bash -lc 'git diff -- tests/unit/vtt/scene-snapshot.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts
git diff --check' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b..1a3e133c 100644
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,26 @@ function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterSta
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toEqual(expect.arrayContaining([
+    { column: 9, row: 1 },
+    { column: 9, row: 5 },
+  ]));
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1..9dfccf75 100644
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@ function reauthoredClearScoutShot(state: EncounterState): EncounterState {
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@ describe('versioned DM tactical intel', () => {
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@ describe('versioned DM tactical intel', () => {
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36..cfc17467 100644
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@ interface PersistedByteBaseline {
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@ function persistedRevisionChecksum(
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@ function persistedByteBaseline(
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@ describe('renderer-neutral scene snapshot', () => {
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@ describe('renderer-neutral scene snapshot', () => {
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@ describe('renderer-neutral scene snapshot', () => {
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1..9d51affd 100644
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@ function reauthoredClearScoutShot(state: EncounterState): EncounterState {
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@ describe('R02-like canonical tactical query', () => {
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@ describe('R02-like canonical tactical query', () => {
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..1a3e133c8c349a3a36994de3effdc2ca2297743e
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,26 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toEqual(expect.arrayContaining([
+    { column: 9, row: 1 },
+    { column: 9, row: 5 },
+  ]));
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

codex
The edits now encode the three geometry derivations directly: `(7,3)` for the persisted scene, `(10,2)/(10,6)` for the conversation frontier, and `(10,3)` for the R02 shots. The persisted baseline also carries the unchanged branch fingerprint and verifies the encounter-state canonical bytes remain identical.
exec
/bin/bash -lc "npx vitest run tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts tests/unit/tools/ai-dm-conversation.test.ts --reporter=dot --testNamePattern='preserves full persisted|blocked auto-submit|unresolved frontier prevents|target-specific non-nearest R02|both 90-foot Scout shots'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

 exited 1 in 32852ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
·-----x---·---------------------------------------------------------·--·------------------------------------------------------

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > preserves full persisted request/coordinator bytes and the actual revision checksum
ReferenceError: persistedRevisionChecksum is not defined
 ❯ tests/unit/vtt/scene-snapshot.test.ts:316:5
    314|     expect(() => assertPersistedHandoffBytesUnchanged(before, state, e…
    315|       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
    316|     expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.…
       |     ^
    317|   });
    318|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 4 passed | 121 skipped (126)
   Start at  21:26:38
   Duration  32.54s (transform 4.23s, setup 0ms, import 7.64s, tests 29.65s, environment 0ms)


diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

exec
/bin/bash -lc "sed -n '285,322p' tests/unit/vtt/scene-snapshot.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
    });
    expect(canonicalJson(state)).toBe(encounterStateBytes);
    expect(coordinator.pendingRequest).toMatchObject({
      kind: 'turn',
      requestId: 'request:handoff-baseline',
      encounterRevision: 0,
      actorId: 'combatant:fighter',
      legalActions: { actions: [{ type: 'end_turn', actor: 'combatant:fighter' }] },
    });
    expect(coordinator.pendingRequest?.visibleState).toBe(view);
    expect(coordinator.pendingRequest?.visibleState !== undefined &&
      'tokenIdentityByCombatant' in coordinator.pendingRequest.visibleState).toBe(false);
    expect(after).toEqual(before);
    assertPersistedHandoffBytesUnchanged(before, state, coordinator);

    if (coordinator.pendingRequest === null) throw new Error('PERSISTENCE_CONTROL_REQUEST_MISSING');
    const enrichedRequest = {
      ...coordinator.pendingRequest,
      visibleState: {
        ...coordinator.pendingRequest.visibleState,
        tokenIdentityByCombatant: { [String(REFERENCE_FIGHTER_ID)]: 'token:fighter' },
      },
    };
    const enrichedCoordinator: PersistedCoordinatorState = {
      ...coordinator,
      pendingRequest: enrichedRequest,
    };
    expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
      .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
  });

  it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
    const state = fixtureState();
    const projection = projectDmBoard({
      view: projectDmView(state),

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..cfc1746717fac8048070fa4286cabeb883079925
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

exec
/bin/bash -lc "npx vitest run tests/unit/vtt/scene-snapshot.test.ts --reporter=dot --testNamePattern='preserves full persisted request/coordinator bytes and the actual revision checksum'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

 succeeded in 3595ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
----·---

 Test Files  1 passed (1)
      Tests  1 passed | 7 skipped (8)
   Start at  21:27:24
   Duration  3.29s (transform 1.22s, setup 0ms, import 1.76s, tests 32ms, environment 0ms)


diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

exec
/bin/bash -lc 'npx vitest run tests/unit/combat/visibility-field.test.ts --reporter=dot' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

 succeeded in 3073ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
··············································

 Test Files  1 passed (1)
      Tests  46 passed (46)
   Start at  21:27:33
   Duration  2.79s (transform 868ms, setup 0ms, import 1.27s, tests 55ms, environment 0ms)


diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

exec
/bin/bash -lc "npx vitest run tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts tests/unit/tools/ai-dm-conversation.test.ts --reporter=dot --testNamePattern='preserves full persisted|blocked auto-submit|unresolved frontier prevents|target-specific non-nearest R02|both 90-foot Scout shots'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

 succeeded in 33124ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
----·---·-·---------------------------------------------------------·--·------------------------------------------------------

 Test Files  4 passed (4)
      Tests  5 passed | 121 skipped (126)
   Start at  21:27:43
   Duration  32.82s (transform 3.94s, setup 0ms, import 7.10s, tests 30.08s, environment 0ms)


diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

codex
The five corrected cases are now green: 5/5, and the visibility-field suite is 46/46. I’m running LOS unchanged to report its two fixed 5-second budget timings; I will not alter or re-pin either test.
exec
/bin/bash -lc 'npx vitest run tests/unit/vtt/room-generator-los-cover.test.ts --reporter=verbose' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

 exited 1 in 111137ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-vis-field

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/c1e4d0ac346a65e4.json
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam 10ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > generated and authored arena fixtures share one strict decoder 492ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001 460ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002 461ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003 187ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101 86ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102 600ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103 725ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201 1230ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202 636ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203 472ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture 4604ms
 × tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size 5177ms
   → Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 × tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis 5400ms
   → Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side 4770ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0 308ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1 591ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2 1218ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3 686ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4 797ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5 291ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6 346ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7 150ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8 534ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9 630ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10 1111ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11 478ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12 620ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13 521ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14 856ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15 271ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16 1388ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17 63ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18 525ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19 240ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20 894ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21 76ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22 712ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23 311ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24 438ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25 1080ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26 759ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27 295ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28 1040ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29 46ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30 2605ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31 701ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0 317ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1 1015ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2 219ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3 960ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4 1517ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5 1268ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6 748ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7 271ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8 442ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9 426ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10 1335ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11 1064ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12 451ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13 806ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14 845ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15 480ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16 1188ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17 227ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18 929ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19 290ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20 1516ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21 702ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22 879ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23 321ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24 722ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25 1329ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26 1212ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27 470ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28 1062ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29 308ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30 2224ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31 1704ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0 402ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1 2009ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2 901ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3 1415ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4 1800ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5 3238ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6 767ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7 79ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8 944ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9 1045ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10 1801ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11 854ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12 721ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13 1084ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14 705ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15 66ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16 1253ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17 1411ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18 2059ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19 157ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20 1260ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21 594ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22 584ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23 229ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24 1003ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25 949ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26 1013ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27 1057ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28 938ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29 787ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30 981ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31 663ms
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION 1502ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:328:3
    326|   });
    327|
    328|   it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', …
       |   ^
    329|     for (const fixture of FIXTURE_CASES) {
    330|       const room = generateRoom(fixture.seed, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:342:3
    340|   });
    341|
    342|   it('retains a productive first-turn option for every living monster …
       |   ^
    343|     for (const fixture of FIXTURE_CASES) {
    344|       expectProductiveMonsters(generateRoom(fixture.seed, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯


 Test Files  1 failed (1)
      Tests  2 failed | 110 passed (112)
   Start at  21:28:24
   Duration  110.80s (transform 1.29s, setup 0ms, import 1.87s, tests 107.42s, environment 0ms)


diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

exec
/bin/bash -lc 'npx tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
exec
/bin/bash -lc 'npx tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

 succeeded in 14249ms:
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

 succeeded in 27923ms:
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

codex
All requested functional checks are complete: five corrected cases 5/5, visibility-field 46/46, and both TypeScript projects compile. LOS remains 110/112 solely because its unchanged 5-second budget tests measured 5.177 s and 5.400 s; neither expectation was touched.
exec
/bin/bash -lc 'git diff --check' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
exec
/bin/bash -lc 'git diff --stat' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
 tests/unit/tools/ai-dm-conversation.test.ts   | 22 ++++++++----
 tests/unit/vtt/dm-tactical-intel.test.ts      | 14 +++++---
 tests/unit/vtt/scene-snapshot.test.ts         | 51 +++++++++++++++++++--------
 tests/unit/vtt/tactical-evaluator-r02.test.ts | 14 +++++---
 4 files changed, 70 insertions(+), 31 deletions(-)

exec
/bin/bash -lc 'git status --short' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
 M tests/unit/tools/ai-dm-conversation.test.ts
 M tests/unit/vtt/dm-tactical-intel.test.ts
 M tests/unit/vtt/scene-snapshot.test.ts
 M tests/unit/vtt/tactical-evaluator-r02.test.ts

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..576ed49049349109f4374dfaefde15a86e0e4a11
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,18 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above:
+    // pendingRequest 78f31379...4049 -> 0ec0fbbc...b8e0;
+    // coordinator f8fa0780...9c66 -> 79b076c9...36cd;
+    // revision 35c96ecc...0385 -> 52305455...b3a8. The encounter-state bytes do not
+    // change, so the branch RNG state fingerprint remains dd802783...46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +313,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..c7a8b7229a75ea41929a955407043ba62a5d262d
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,25 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above.
+    // pendingRequest:
+    // 78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049 ->
+    // 0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0.
+    // coordinator:
+    // f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66 ->
+    // 79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd.
+    // revision:
+    // 35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385 ->
+    // 52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8.
+    // Encounter-state bytes do not change, so the branch RNG state fingerprint remains
+    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +320,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..c7a8b7229a75ea41929a955407043ba62a5d262d
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,25 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above.
+    // pendingRequest:
+    // 78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049 ->
+    // 0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0.
+    // coordinator:
+    // f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66 ->
+    // 79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd.
+    // revision:
+    // 35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385 ->
+    // 52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8.
+    // Encounter-state bytes do not change, so the branch RNG state fingerprint remains
+    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +320,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

exec
/bin/bash -lc 'git diff --check' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
exec
/bin/bash -lc 'git status --short' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
 M tests/unit/tools/ai-dm-conversation.test.ts
 M tests/unit/vtt/dm-tactical-intel.test.ts
 M tests/unit/vtt/scene-snapshot.test.ts
 M tests/unit/vtt/tactical-evaluator-r02.test.ts

diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..c7a8b7229a75ea41929a955407043ba62a5d262d
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,25 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above.
+    // pendingRequest:
+    // 78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049 ->
+    // 0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0.
+    // coordinator:
+    // f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66 ->
+    // 79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd.
+    // revision:
+    // 35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385 ->
+    // 52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8.
+    // Encounter-state bytes do not change, so the branch RNG state fingerprint remains
+    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +320,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

codex
Applied D651 as test-scene changes only; production code is unchanged.

| Test | Applied derivation |
|---|---|
| Scene snapshot | Vertex `(7,3)` is sealed by blocker `(7,2)` and door `(6,3)`. Last-clear rays `(3,3)→(8,3)` and `(2,3)→(9,3)` now block. DM fog gains `(8,3),(9,3)`; fighter concealment also gains `(8,2),(9,2),(8,3),(9,3)`. All three hashes were re-pinned with full old/new values. Encounter-state bytes and fingerprint `dd802783…46a` are explicitly unchanged. Negative controls remain. |
| Blocked auto-submit | Moved helper blockers `(9,1)/(9,5)` to `(8,1)/(8,5)`. This removes diagonal contacts with `(10,2)/(10,6)` at vertices `(10,2)/(10,6)`. The exact original five visibility openings and zero closures remain asserted. |
| Unresolved frontier | Uses the same corrected helper geometry; the frontier and `sim_controller` subject are restored. |
| DM tactical intel | Moved `(9,2)` to `(8,2)`, removing the `(9,2)/(10,3)` diagonal pair at `(10,3)`. The two row-3 rays are clear again; Half Cover and `blocksSight:false` are explicit. |
| Tactical evaluator | Same scene correction. Both 90-foot shots remain legal with explicit Half and Three-Quarters tiers and `blocksSight:false`. |

Touched files:

- [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts)
- [dm-tactical-intel.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts)
- [scene-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts)
- [tactical-evaluator-r02.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/tactical-evaluator-r02.test.ts)

Verification:

- Five corrected cases: **5/5 passed**, 121 skipped.
- Visibility field: **46/46 passed**.
- LOS cover: **110/112 passed**. Unchanged budget tests timed out at:
  - `M576-E2-WALL-SEALS-ROOM`: **5.177 s**
  - productive first-turn option: **5.400 s**
- `tsconfig.app.json`: exit 0.
- `tsconfig.node.json`: exit 0.
- `git diff --check`: exit 0.
- `git status --short`: exactly the four test files above.

WALL-01-FIX-R3 DONE
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b759bb497183b9dac3c0fd8bebc3a6548..884746c3e39d5dfb8895e32565393f42a78852ee
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1e9133bdf447481457701f4306b3dadd5..9dfccf759e63bd2e034a90a7f7083700277a7456
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36055d69573c98573125bc67db63df079f..c7a8b7229a75ea41929a955407043ba62a5d262d
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,25 @@
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above.
+    // pendingRequest:
+    // 78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049 ->
+    // 0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0.
+    // coordinator:
+    // f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66 ->
+    // 79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd.
+    // revision:
+    // 35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385 ->
+    // 52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8.
+    // Encounter-state bytes do not change, so the branch RNG state fingerprint remains
+    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +320,8 @@
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1bde57fdb049e69258f495da43f96f360..9d51affd0e3d320981063ea94c5a9aef43802542
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

tokens used
211,826
Applied D651 as test-scene changes only; production code is unchanged.

| Test | Applied derivation |
|---|---|
| Scene snapshot | Vertex `(7,3)` is sealed by blocker `(7,2)` and door `(6,3)`. Last-clear rays `(3,3)→(8,3)` and `(2,3)→(9,3)` now block. DM fog gains `(8,3),(9,3)`; fighter concealment also gains `(8,2),(9,2),(8,3),(9,3)`. All three hashes were re-pinned with full old/new values. Encounter-state bytes and fingerprint `dd802783…46a` are explicitly unchanged. Negative controls remain. |
| Blocked auto-submit | Moved helper blockers `(9,1)/(9,5)` to `(8,1)/(8,5)`. This removes diagonal contacts with `(10,2)/(10,6)` at vertices `(10,2)/(10,6)`. The exact original five visibility openings and zero closures remain asserted. |
| Unresolved frontier | Uses the same corrected helper geometry; the frontier and `sim_controller` subject are restored. |
| DM tactical intel | Moved `(9,2)` to `(8,2)`, removing the `(9,2)/(10,3)` diagonal pair at `(10,3)`. The two row-3 rays are clear again; Half Cover and `blocksSight:false` are explicit. |
| Tactical evaluator | Same scene correction. Both 90-foot shots remain legal with explicit Half and Three-Quarters tiers and `blocksSight:false`. |

Touched files:

- [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts)
- [dm-tactical-intel.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts)
- [scene-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts)
- [tactical-evaluator-r02.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/tactical-evaluator-r02.test.ts)

Verification:

- Five corrected cases: **5/5 passed**, 121 skipped.
- Visibility field: **46/46 passed**.
- LOS cover: **110/112 passed**. Unchanged budget tests timed out at:
  - `M576-E2-WALL-SEALS-ROOM`: **5.177 s**
  - productive first-turn option: **5.400 s**
- `tsconfig.app.json`: exit 0.
- `tsconfig.node.json`: exit 0.
- `git diff --check`: exit 0.
- `git status --short`: exactly the four test files above.

WALL-01-FIX-R3 DONE
