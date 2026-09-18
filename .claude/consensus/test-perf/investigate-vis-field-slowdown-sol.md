
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 01a0afa3-7fad-7433-8e38-dc38461d422f
--------
user
RULES (binding): You are an INVESTIGATOR (gpt-5.6-sol, high, FRESH session). Worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-verify — a DETACHED clean checkout of claude/vis-field at 807d2e3c (node_modules symlinked). Sandbox read-only: do NOT edit files (in-memory patches via vitest/tsx only, restored by construction), no git writes, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; never port 4173; no full vitest, no Playwright, no npm run build. The MAIN repo /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static is at main 9f148666 (the pre-VIS-FIELD baseline) and is READ-ONLY for you too — you may run vitest there for timing comparisons but must not write. Model calls WILL fail. Report exact commands and numbers; end with the named marker.

CONTEXT: VIS-FIELD-01 (branch claude/vis-field) replaced authored fog with a DERIVED visibility field (src/combat/visibility-field.ts, src/combat/visibility.ts projectDmView/seat projections; the seam rule in src/combat/cover.ts firstSharedEdgeBlockingCell; the query port's per-offer traceCombatantLine in src/vtt/engine-query-port.ts:~1168). Measured slowdowns vs main (supervisor, same machine, quiet): tests/integration/vtt/pc-algorithm-policy.test.ts "vane-tpk-clean-terminates" 3077 ms on main → 6585–6674 ms on the branch (5 s budget); tests/unit/vtt/room-generator-los-cover.test.ts "retains a productive first-turn option for every living monster in the versioned basis" and "kills M576-E2-WALL-SEALS-ROOM…" run 5.1–6.2 s in the full suite (5 s budget; pass isolated); the D630 pair replay+detection 32.8 s on main → 38–39.7 s on the branch (ceiling 41 s). The owner's TEST-PERF-01 plan is pending; this is an INVESTIGATION to feed it — no code changes.

TASK: (1) Profile vane-tpk-clean-terminates on the branch vs main (node --cpu-prof through vitest, or manual instrumentation in memory): where do the extra ~3.5 s go — which functions (visibility field computation, traceCombatantLine/seam tracing, projectDmView per event, offer environment builds, detection), how many calls per round, and what is the call multiplier vs main (e.g. the field recomputed once per event vs once per turn). (2) Same for the los-cover "productive first-turn option" test and, briefly, the replay+detection pair (which tests moved most). (3) Identify the top 3 hot paths with evidence and, for each, a concrete bounded fix proposal (memoization keyed by (revision, observer set), incremental field updates, avoiding per-offer full traces, etc.) with an estimated saving — and the invariant each fix must preserve (the field must equal the from-scratch computation; add the witness you would require). (4) State clearly whether any slowdown is a CORRECTNESS smell (e.g. the field computed for observers who are not eligible, tracing rays for unreachable targets) rather than pure cost. Restore any in-memory patches; print production hashes before/after. OUTPUT: a report with the profile tables, then "PERF-INVESTIGATION DONE".

codex
I’ll run a read-only, evidence-first profiling pass on both checkouts. I’ll capture production hashes up front, isolate the named tests, then use CPU profiles and targeted in-memory instrumentation where attribution or call counts need sharper resolution.
codex
The sandbox blocks even `/tmp`, so profile artifacts cannot be written. I’ll keep everything strictly in-memory: aggregate hashes via pipes, Vitest timing output to stdout, and runtime monkey-patching through Node evaluation/loader mechanisms only if the module structure permits it.
exec
/bin/bash -lc "printf 'BRANCH\\n'; git status --short; git rev-parse HEAD; git branch --show-current; find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf 'MAIN\\n'; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static status --short; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static rev-parse HEAD; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static branch --show-current; find /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf 'PACKAGE\\n'; sed -n '1,220p' package.json; printf 'TARGETS\\n'; rg -n \"vane-tpk-clean-terminates|retains a productive first-turn option|kills M576-E2-WALL-SEALS-ROOM|D630|replay|detection\" tests/integration/vtt/pc-algorithm-policy.test.ts tests/unit/vtt/room-generator-los-cover.test.ts tests -g '*.test.ts' | head -200" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 95ms:
59f5d4e7fa03612f7eb5163911eebcd4d3521e930dc5556aace23c66d644ead1  -
PACKAGE
{
  "name": "srd-55",
  "private": true,
  "license": "MIT",
  "version": "0.0.0",
  "description": "SRD-55 is a local-first character builder",
  "type": "module",
  "scripts": {
    "dev": "vite --configLoader runner",
    "build": "tsc -b && node tools/dist-build-cache.mjs",
    "build:dist": "vite build --configLoader runner",
    "build:dist:validated": "tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs",
    "serve": "node tools/serve.mjs",
    "serve:check": "playwright test --config=tests/serving/playwright.config.ts",
    "typecheck": "scripts/check-command-outcomes.sh && tsc -b",
    "check:command-outcomes": "scripts/check-command-outcomes.sh",
    "typecheck:fast": "tsgo -p tsconfig.app.json --noEmit && tsgo -p tsconfig.node.json --noEmit",
    "test": "vitest run --configLoader runner",
    "test:gate": "node scripts/check-command-outcomes.mjs && node tools/gate-vitest.mjs",
    "test:gate:browser": "node tools/gate-playwright.mjs",
    "test:affected": "node scripts/test-affected.mjs",
    "heldout:guard": "node --experimental-strip-types tools/heldout-leak-check.ts",
    "census:modules": "node scripts/module-state-census.mjs",
    "test:shuffled": "vitest run --configLoader runner --sequence.shuffle --sequence.seed=20260825",
    "test:unit": "vitest run --configLoader runner tests/unit",
    "test:live": "AI_BRIDGE_LIVE=1 vitest run --configLoader runner tests/live",
    "test:browser": "playwright test",
    "test:mutation": "node scripts/patch-stryker-vitest-runner.mjs && node scripts/mutation-loud.mjs",
    "test:mutation:sharded": "node scripts/patch-stryker-vitest-runner.mjs && node scripts/mutation-shard.mjs run-all --shards 8",
    "vtt:replay": "vite-node tools/vtt-replay.ts --",
    "vtt:soak": "vite-node tools/vtt-soak.ts --",
    "vtt:experiment": "vite-node tools/vtt-experiment.ts --",
    "vtt:regret": "vite-node tools/vtt-regret.ts --",
    "rehearse": "vite-node tools/rehearsal/run.ts --",
    "test:all": "npm run test && npm run build && npm run test:browser",
    "scrape": "vite-node tools/scrape/cli.ts --",
    "db:schema": "vite-node scripts/build-schema.ts",
    "db:migrations": "vitest run --configLoader runner tests/unit/db/migrations.test.ts",
    "db:contracts": "vite-node scripts/build-row-contracts.ts",
    "schema:content-pack": "vite-node tools/generate-content-pack-schema.ts",
    "schema:engine-mcp": "vite-node tools/generate-engine-mcp-schemas.ts",
    "attribute:round-input": "vite-node tools/attribute-round-input.ts --",
    "rl:extract-sft": "vite-node tools/rl/extract-sft.ts --",
    "rl:generate-data": "vite-node tools/rl/generate-data.ts --",
    "bootstrap": "node --experimental-strip-types tools/vtt-handoff/bootstrap.ts --",
    "doctor": "node --experimental-strip-types tools/vtt-handoff/doctor.ts --",
    "test:engine": "vitest run --configLoader runner tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/engine-boundary.test.ts",
    "test:protocol": "vitest run --configLoader runner tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/engine-boundary.test.ts",
    "test:worker": "playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts",
    "test:runtime-node": "vitest run --configLoader runner tests/unit/vtt/node-runtime.test.ts tests/unit/vtt/node-websocket-transport.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/engine-boundary.test.ts",
    "handoff:publish": "node --experimental-strip-types tools/vtt-handoff/publish.ts",
    "handoff:gate": "node --experimental-strip-types tools/vtt-handoff/gate-inventory.ts",
    "art:request": "node --experimental-strip-types tools/vtt-handoff/art-request.ts --",
    "art:validate": "node --experimental-strip-types tools/vtt-handoff/art-validator.ts --",
    "art:stage": "node --experimental-strip-types tools/vtt-handoff/art-stage.ts --",
    "windows:probe": "node --experimental-strip-types tools/vtt-handoff/windows-probe.ts --"
  },
  "dependencies": {
    "@sqlite.org/sqlite-wasm": "3.53.0-build1",
    "qrcode": "^1.5.4",
    "trystero": "0.25.3",
    "ws": "8.18.3",
    "yjs": "13.6.32",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "^1.61.1",
    "@stryker-mutator/core": "9.6.1",
    "@stryker-mutator/typescript-checker": "9.6.1",
    "@stryker-mutator/vitest-runner": "9.6.1",
    "@types/node": "^24.0.0",
    "@types/qrcode": "^1.5.6",
    "@types/ws": "8.18.1",
    "@typescript/native-preview": "7.0.0-dev.20260707.2",
    "ajv": "8.18.0",
    "drizzle-kit": "^0.31.10",
    "drizzle-orm": "^0.45.2",
    "drizzle-zod": "^0.8.3",
    "fake-indexeddb": "^6.2.5",
    "typescript": "^5.9.0",
    "vite": "^7.0.0",
    "vite-node": "3.2.4",
    "vitest": "^4.1.10"
  }
}
TARGETS
tests/unit/vtt/room-generator-los-cover.test.ts:328:  it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', () => {
tests/unit/vtt/room-generator-los-cover.test.ts:342:  it('retains a productive first-turn option for every living monster in the versioned basis', () => {
tests/integration/vtt/pc-algorithm-policy.test.ts:967:  it('vane-tpk-clean-terminates: the doomed composition defeats the party after death saves', async () => {
tests/integration/commands/sheet-inputs.test.ts:275:    const replay = expectOkOutcome(await executor.execute({
tests/integration/commands/sheet-inputs.test.ts:285:    expect(replay.idempotent_replay).toBe(true);
tests/integration/commands/sheet-inputs.test.ts:286:    expect(replay.preview_warnings).toBeUndefined();
tests/unit/combat/roll-provenance.test.ts:12:  replayPrefix,
tests/unit/combat/roll-provenance.test.ts:151:  it('prefix replay refuses interval-only, noncanonical tightened d6-face-1 [0,1/12), and request-mismatched prefixes', () => {
tests/unit/combat/roll-provenance.test.ts:156:    const first = replayPrefix(emptyRollPrefix(), (rolls) => drawOne(rolls, 6));
tests/unit/combat/roll-provenance.test.ts:167:    expectCode(() => replayPrefix(canonical, (rolls) => drawOne(rolls, 8)), 'prefix_request_mismatch');
tests/unit/combat/roll-provenance.test.ts:171:    const initial = replayPrefix(emptyRollPrefix(), (rolls) => drawOne(rolls, 4));
tests/unit/combat/roll-provenance.test.ts:176:    expect(replayPrefix(selected.prefix, (rolls) => {
tests/unit/combat/roll-provenance.test.ts:180:    expectCode(() => replayPrefix(selected.prefix, () => 'done'), 'prefix_not_consumed');
tests/unit/combat/roll-provenance.test.ts:184:    const step = replayPrefix(emptyRollPrefix(), (rolls) => drawOne(rolls, 4));
tests/unit/combat/roll-provenance.test.ts:199:    const first = replayPrefix(emptyRollPrefix(), run);
tests/unit/combat/roll-provenance.test.ts:203:    const reused = replayPrefix(faceOne.prefix, run);
tests/unit/combat/roll-provenance.test.ts:217:    const first = replayPrefix(emptyRollPrefix(), run);
tests/unit/combat/roll-provenance.test.ts:221:    expect(replayPrefix(faceSix.prefix, run)).toMatchObject({ kind: 'complete', value: 4 });
tests/unit/combat/roll-provenance.test.ts:224:  it('anonymous callable draws fail in recording and replay', () => {
tests/unit/combat/roll-provenance.test.ts:226:    expectCode(() => replayPrefix(emptyRollPrefix(), (rolls) => rolls()), 'anonymous_draw');
tests/integration/commands/undo-rpc.test.ts:364:        idempotent_replay: false,
tests/integration/commands/undo-rpc.test.ts:540:  it('replays a retried undo response without applying the inverse twice', async () => {
tests/integration/commands/undo-rpc.test.ts:548:    const replay = await undo(request);
tests/integration/commands/undo-rpc.test.ts:554:        idempotent_replay: false,
tests/integration/commands/undo-rpc.test.ts:560:    expect(replay).toMatchObject({
tests/integration/commands/undo-rpc.test.ts:566:        idempotent_replay: true,
tests/integration/commands/undo-rpc.test.ts:732:        idempotent_replay: false,
tests/integration/commands/idempotency.test.ts:37:  it('replays a UUID exactly once despite a different command and changed revision', async () => {
tests/integration/commands/idempotency.test.ts:62:    const replay = expectOkOutcome(await executor.execute({
tests/integration/commands/idempotency.test.ts:72:    expect(replay).toEqual({
tests/integration/commands/idempotency.test.ts:76:      idempotent_replay: true,
tests/integration/commands/idempotency.test.ts:115:  it('rejects replay across characters without changing either character', async () => {
tests/integration/queries/completeness.test.ts:126:describe('completeness detection', () => {
tests/unit/combat/visibility-field.test.ts:1242:      rules: { ...observer.rules, detectionTraits: ['keen_sight'] },
tests/unit/combat/visibility-field.test.ts:1320:    const detectionPath = files.field.slice(
tests/unit/combat/visibility-field.test.ts:1327:    expect(detectionPath).toContain('sightToCreature(state, observer, subject)');
tests/unit/combat/visibility-field.test.ts:1328:    expect(detectionPath).not.toContain('traceCombatantLine(');
tests/unit/combat/visibility-field.test.ts:1329:    expect(detectionPath).not.toContain('environmentLightAt(');
tests/unit/combat/visibility-field.test.ts:1330:    expect(detectionPath).not.toContain('environmentObscurementAt(');
tests/integration/commands/executor.test.ts:292:      idempotent_replay: false,
tests/integration/commands/executor.test.ts:670:      idempotent_replay: false,
tests/unit/rules/origins-srd.test.ts:378:   * check: a band mis-detection leaks page furniture into a trait description,
tests/integration/vtt/pc-algorithm-policy.test.ts:967:  it('vane-tpk-clean-terminates: the doomed composition defeats the party after death saves', async () => {
tests/unit/combat/spells-level-two.test.ts:80:  { id: 'find-traps', source: 'spell-descriptions.txt:3131', targeting: { kind: 'utility', rangeFeet: 120 }, operation: { kind: 'utility', effect: { kind: 'trap_detection', rangeFeet: 120, revealsLocation: false }, concentration: false, durationRounds: null } },
tests/unit/combat/world-objects.test.ts:317:  it('replaying object commands reconstructs the state byte-exactly', () => {
tests/unit/combat/world-objects.test.ts:321:    const created = object('replay-wall', [{ column: 2, row: 1 }], { terrain: 'wall' });
tests/unit/combat/world-objects.test.ts:326:    const replayed = reduceEncounter(structuredClone(initial), structuredClone(command), () => 0.5);
tests/unit/combat/world-objects.test.ts:327:    expect(canonicalJson(replayed.state)).toBe(canonicalJson(first.state));
tests/unit/combat/world-objects.test.ts:328:    expect(canonicalJson(replayed.events)).toBe(canonicalJson(first.events));
tests/integration/party/token-never-travels.test.ts:228:  const replay = createRecordedFixtureFetch(
tests/integration/party/token-never-travels.test.ts:236:    return replay(request);
tests/unit/combat/spells.test.ts:512:    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'creature_types_and_hallow', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
tests/unit/combat/spells.test.ts:517:    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'magic', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
tests/unit/combat/spells.test.ts:522:    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'poison_and_disease', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
tests/integration/vtt/dm-encounter-host-live-path.test.ts:16:  replaySessionRevisions,
tests/integration/vtt/dm-encounter-host-live-path.test.ts:284:  it('replays the same configured pure reducer used by live host commands', async () => {
tests/integration/vtt/dm-encounter-host-live-path.test.ts:286:      playerProfile('host-replay-player-a', { initiativeBonus: 30, hitPoints: 40 }),
tests/integration/vtt/dm-encounter-host-live-path.test.ts:287:      playerProfile('host-replay-player-b', { initiativeBonus: 20, hitPoints: 40 }),
tests/integration/vtt/dm-encounter-host-live-path.test.ts:288:      playerProfile('host-replay-player-c', { initiativeBonus: 10, hitPoints: 40 }),
tests/integration/vtt/dm-encounter-host-live-path.test.ts:289:      playerProfile('host-replay-player-d', { initiativeBonus: 5, hitPoints: 40 }),
tests/integration/vtt/dm-encounter-host-live-path.test.ts:290:      playerProfile('host-replay-player-e', { initiativeBonus: 0, hitPoints: 40 }),
tests/integration/vtt/dm-encounter-host-live-path.test.ts:298:    const host = new DmEncounterHost('session:host-live-custom-reducer-replay', store, {
tests/integration/vtt/dm-encounter-host-live-path.test.ts:307:    expect(replaySessionRevisions(store.revisions(host.sessionId)).encounterState).toEqual(
tests/integration/vtt/dm-encounter-host-live-path.test.ts:357:    expect(replaySessionRevisions(store.revisions(host.sessionId)).encounterState).toEqual(
tests/integration/vtt/dm-encounter-host-live-path.test.ts:520:      expect(replaySessionRevisions(store.revisions(host.sessionId)).encounterState).toEqual(
tests/unit/combat/initiative-modes.test.ts:127:  it('block_order_nondeterministic keeps within-block ordering stable across replay seeds', async () => {
tests/integration/vtt/encounter-conclusion.test.ts:286:      reasoning: 'No mechanical change; exercise conclusion detection.',
tests/unit/rules/srd-spell-extracts.test.ts:294:Nondetection
tests/integration/db/bootstrap.test.ts:1112:describe('bundled class content detection', () => {
tests/unit/combat/search-memory.test.ts:269:  it('replays the same seed and command transcript to identical search events', () => {
tests/unit/combat/search-memory.test.ts:290:    const replayed = run();
tests/unit/combat/search-memory.test.ts:291:    expect(canonicalJson(replayed.eventLog)).toBe(canonicalJson(first.eventLog));
tests/unit/combat/search-memory.test.ts:292:    expect(canonicalJson(replayed.searchMemories)).toBe(canonicalJson(first.searchMemories));
tests/unit/combat/spells-level-three.test.ts:61:  { id: 'nondetection', source: 'spell-descriptions.txt:5647', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'nondetection', blocksDivinationTargeting: true, blocksMagicalScryingSensors: true, maximumObjectDimensionFeet: 10 }, { durationRounds: 4800 }) } },
tests/unit/combat/spells-level-three.test.ts:120:  { id: 'nondetection', castingTime: 'action', components: 'VSM', material: 'a pinch of diamond dust worth 25+ GP', consumed: true, ritual: false },
tests/unit/bridge/js-round-plan-integration.test.ts:45:  replayBundle,
tests/unit/bridge/js-round-plan-integration.test.ts:47:} from '../../../src/vtt/replay';
tests/unit/bridge/js-round-plan-integration.test.ts:248:describe('JS round-plan protocol and replay integration', () => {
tests/unit/bridge/js-round-plan-integration.test.ts:610:  it('a js_program plan drives a fake-exchange table and replays source plus emitted DecisionProgram byte-for-byte', async () => {
tests/unit/bridge/js-round-plan-integration.test.ts:687:    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE)).toEqual(
tests/unit/bridge/js-round-plan-integration.test.ts:688:      replayBundle(bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
tests/unit/bridge/js-round-plan-integration.test.ts:721:  it('js_source_missing_from_replay keeps both source and validated output in the authoritative transcript', async () => {
tests/unit/bridge/projection-transport.test.ts:205:    const replay = () => {
tests/unit/bridge/projection-transport.test.ts:210:        if (result.kind !== 'reconstructed') throw new Error('Deterministic replay requested fallback.');
tests/unit/bridge/projection-transport.test.ts:214:    expect(replay()).toEqual(replay());
tests/unit/bridge/projection-transport.test.ts:215:    expect(replay()).toEqual(requests.map((entry) => canonicalJson(entry)));
tests/unit/combat/creature-space.test.ts:316:  replaySchema: '6',
tests/unit/combat/creature-space.test.ts:337:  'src/vtt/replay.ts',
tests/unit/combat/creature-space.test.ts:353:  'src/vtt/replay.ts': '8a45e2da7372871faa7bdffe7ef91fd5472804477a95a0ffa4205b71e06267ac',
tests/unit/combat/creature-space.test.ts:386:      replaySchema: /VTT_REPLAY_SCHEMA_VERSION = (\d+)/u.exec(source('src/vtt/replay.ts'))?.[1],
tests/unit/combat/creature-space.test.ts:402:      replaySchema: '7',
tests/unit/ui/level-up-planned-steps.test.ts:578:      idempotent_replay: false,
tests/unit/ui/dice.test.ts:290:  it('replays complete seeded traces including explosions and leaps', () => {
tests/unit/sharing/codec.property.test.ts:796:    const replay = process.env.SHARE_PROPERTY_SEED;
tests/unit/sharing/codec.property.test.ts:798:      replay === undefined
tests/unit/sharing/codec.property.test.ts:800:        : [Number.parseInt(replay, 10)];
tests/unit/vtt/wild-shape-persistence.test.ts:57:  it('round-trips a wildshaped combatant through export, strict decode, import, replay, and resume', () => {
tests/unit/vtt/detection-reactions.test.ts:61:  const actor = options.actor ?? playerProfile('detection-actor', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
tests/unit/vtt/detection-reactions.test.ts:62:  const reactor = options.reactor ?? monsterProfile('detection-reactor', { initiativeBonus: -20 });
tests/unit/vtt/detection-reactions.test.ts:88:describe('D356 full detection vocabulary', () => {
tests/unit/vtt/detection-reactions.test.ts:103:    // 2014 hiding and passive detection: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:4604-4619,4629-4645.
tests/unit/vtt/detection-reactions.test.ts:129:      detectionTraits: ['keen_sight'],
tests/unit/vtt/detection-reactions.test.ts:175:      detectionTraits: ['keen_sight'],
tests/unit/vtt/detection-reactions.test.ts:264:    expect(spider.rules.detectionTraits).toContain('web_sense');
tests/unit/vtt/detection-reactions.test.ts:433:    expect(flyer.rules.detectionTraits).toContain('flyby');
tests/unit/vtt/choice-branches.test.ts:256:    const replays = Array.from({ length: 20 }, () => run(91));
tests/unit/vtt/choice-branches.test.ts:257:    expect(new Set(replays).size).toBe(1);
tests/unit/db/migrations.test.ts:1347:      // cannot parse/replay stale raw ids and therefore cannot surface an FK
tests/unit/db/migrations.test.ts:2186:  it('Q5 explicitly replaying 0037 preserves populated background data', () => {
tests/unit/db/migrations.test.ts:2195:          ('expanded:content.feat:replay-feat', 'feat', 'asserted', 'external', 'listed', 'replay feat'),
tests/unit/db/migrations.test.ts:2196:          ('expanded:content.background:replay-background', 'background', 'asserted', 'external', 'listed', 'replay background');
tests/unit/db/migrations.test.ts:2198:        VALUES ('expanded:content.feat:replay-feat', 'Replay Feat', 'expanded', 'origin');
tests/unit/db/migrations.test.ts:2205:          901, 'expanded:content.background:replay-background', 'expanded', 'Replay Background',
tests/unit/db/migrations.test.ts:2207:          'expanded:content.feat:replay-feat', 'Athletics', 'Acrobatics', 'Tools', 'A', 'B'
tests/unit/db/migrations.test.ts:2236:        default_origin_feat_content_key: 'expanded:content.feat:replay-feat',
tests/unit/db/migrations.test.ts:2246:  it('defaults migration replay policy off and executes a matching-schema migration', () => {
tests/unit/db/migrations.test.ts:2250:        CREATE TABLE replay_policy_probe (
tests/unit/db/migrations.test.ts:2257:        'ordinary_replay_policy_probe',
tests/unit/db/migrations.test.ts:2258:        "INSERT INTO replay_policy_probe (id, note) VALUES (1, 'executed')",
tests/unit/db/migrations.test.ts:2270:      expect(ordinaryMigration.replayPolicy).toBeUndefined();
tests/unit/db/migrations.test.ts:2272:        'SELECT id, note FROM replay_policy_probe',
tests/unit/db/storage-pool-lock.test.ts:27:describe('storage pool lock detection', () => {
tests/unit/ui/level-up-wizard.test.ts:1478:      idempotent_replay: false,
tests/unit/ui/level-up-wizard.test.ts:1549:        idempotent_replay: false,
tests/unit/ui/level-up-wizard.test.ts:1644:        idempotent_replay: true,
tests/unit/ui/level-up-wizard.test.ts:1930:      idempotent_replay: false,
tests/unit/vtt/party-pack.test.ts:507:    const replayRng = mulberry32(0x213);
tests/unit/vtt/party-pack.test.ts:508:    const replayInitial = state;
tests/unit/vtt/party-pack.test.ts:513:      encounterState: replayInitial,
tests/unit/vtt/party-pack.test.ts:516:      rng: replayRng,
tests/unit/vtt/party-pack.test.ts:520:    const replayReduction = reduceEncounter(replayInitial, damageCommand, journal.rng());
tests/unit/vtt/party-pack.test.ts:522:      transition: { kind: 'reducer_applied', command: damageCommand, events: replayReduction.events },
tests/unit/vtt/party-pack.test.ts:523:      encounterState: replayReduction.state,
tests/unit/vtt/party-pack.test.ts:527:    const replayBytes = exportSavedSession(sourceStore, encounterSessionId('session:party-damage-operation'));
tests/unit/vtt/party-pack.test.ts:529:    importSavedSession(restoredStore, replayBytes);
tests/unit/vtt/party-pack.test.ts:535:    expect(canonicalJson(restored.encounterState)).toBe(canonicalJson(replayReduction.state));
tests/unit/vtt/party-pack.test.ts:536:    expect(replayBytes).toContain('damage_operation');
tests/unit/vtt/party-pack.test.ts:537:    expect(replayBytes).toContain('"arming"');
tests/unit/vtt/session-persistence.test.ts:55:  replaySessionRevisions,
tests/unit/vtt/session-persistence.test.ts:570:    const replayRevision = structuredClone(source.revisions(encounterSessionId('session:persistence-test'))[0]);
tests/unit/vtt/session-persistence.test.ts:571:    if (replayRevision === undefined) throw new Error('Replay transition fixture is missing.');
tests/unit/vtt/session-persistence.test.ts:573:      ...replayRevision,
tests/unit/vtt/session-persistence.test.ts:576:    expect(() => replaySessionRevisions([forged])).toThrowError(
tests/unit/ui/planner.test.ts:873:          idempotent_replay: false,
tests/unit/ui/planner.test.ts:939:          idempotent_replay: false,
tests/unit/ui/planner.test.ts:952:          idempotent_replay: false,
tests/unit/ui/planner.test.ts:1057:          idempotent_replay: false,
tests/unit/ui/planner.test.ts:1074:          idempotent_replay: false,
tests/unit/ui/planner.test.ts:1405:        idempotent_replay: false,
tests/unit/ui/planner.test.ts:1435:        idempotent_replay: false,
tests/unit/ui/planner.test.ts:1522:        idempotent_replay: false,
tests/unit/vtt/challenge-feasibility.test.ts:443:    it('transactional adapter preserves die provenance across checkpoint replay and rollback', () => {
tests/unit/vtt/challenge-feasibility.test.ts:599:  it('continuation replay completes every d20 child instead of stopping at the first unresolved draw', () => {
tests/unit/vtt/challenge-feasibility.test.ts:684:      expect(table.uniquenessScope).toBe('concrete_replay_execution');
tests/unit/vtt/challenge-feasibility.test.ts:861:    for (const replay of [normal, critical]) {
tests/unit/vtt/challenge-feasibility.test.ts:863:      for (const draw of replay.dieRolls) {
tests/unit/vtt/challenge-feasibility-production.test.ts:39:  it('reports transactional replay and rollback accounting', () => {
tests/unit/vtt/semantic-board-payload.test.ts:442:  it('keeps an Invisible subject visible_from while canonical detection is undetected', () => {
tests/unit/vtt/room-generator-los-cover.test.ts:328:  it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', () => {
tests/unit/vtt/room-generator-los-cover.test.ts:342:  it('retains a productive first-turn option for every living monster in the versioned basis', () => {
tests/unit/vtt/engine-boundary.test.ts:20:  'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
tests/unit/vtt/engine-boundary.test.ts:795:      'src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter',
tests/unit/vtt/content-pack.test.ts:677:  it('imported_content_missing_from_replay reconstructs imported records byte-exactly', () => {
tests/unit/vtt/content-pack.test.ts:678:    const replayCandidate = fixture() as { spells: Array<{ operation: unknown }> };
tests/unit/vtt/content-pack.test.ts:679:    replayCandidate.spells[0]!.operation = {
tests/unit/vtt/content-pack.test.ts:696:    const content = loaded(loadContentPack(replayCandidate));
tests/unit/vtt/content-pack.test.ts:697:    const caster = playerProfile('replay-import-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
tests/unit/vtt/content-pack.test.ts:698:    const target = monsterProfile('replay-import-target', { initiativeBonus: -20, hitPoints: 20 });
tests/unit/vtt/replay.test.ts:11:  replayBundle,
tests/unit/vtt/replay.test.ts:14:} from '../../../src/vtt/replay';
tests/unit/vtt/replay.test.ts:25:import { runVttReplayCommand } from '../../../tools/vtt-replay';
tests/unit/vtt/replay.test.ts:72:    throw new Error('Expected replay divergence.');
tests/unit/vtt/replay.test.ts:80:describe('increment 10 deterministic replay and playable exit', () => {
tests/unit/vtt/replay.test.ts:81:  it('replays world-object creation byte-exactly', () => {
tests/unit/vtt/replay.test.ts:84:    const sessionId = encounterSessionId('encounter:world-object-replay');
tests/unit/vtt/replay.test.ts:101:      sessionId, branchId: encounterBranchId('branch:world-object-replay'), encounterState: state,
tests/unit/vtt/replay.test.ts:110:          id: worldObjectId('object:replay-wall'), name: 'Homebrew Replay Wall', kind: 'barrier',
tests/unit/vtt/replay.test.ts:131:    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
tests/unit/vtt/replay.test.ts:136:  it('replays two overlapping persistent areas byte-exactly in stable creation order', () => {
tests/unit/vtt/replay.test.ts:139:    const sessionId = encounterSessionId('encounter:persistent-area-replay');
tests/unit/vtt/replay.test.ts:150:      sessionId, branchId: encounterBranchId('branch:persistent-area-replay'), encounterState: state,
tests/unit/vtt/replay.test.ts:164:    if (owner === null) throw new Error('Persistent-area replay fixture has no active combatant.');
tests/unit/vtt/replay.test.ts:182:    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
tests/unit/vtt/replay.test.ts:188:  it('PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte', () => {
tests/unit/vtt/replay.test.ts:190:    const replayed = replayBundle(gate.bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
tests/unit/vtt/replay.test.ts:199:    expect(replayed).toEqual(gate.proof);
tests/unit/vtt/replay.test.ts:200:    expect(replayed.rounds).toBe(4);
tests/unit/vtt/replay.test.ts:201:    expect(replayed.revisionCount).toBeGreaterThan(100);
tests/unit/vtt/replay.test.ts:202:    expect(replayed.eventCount).toBeGreaterThan(50);
tests/unit/vtt/replay.test.ts:223:    expect(replayed.finalProjectionHashes).toEqual(
tests/unit/vtt/replay.test.ts:235:      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
tests/unit/vtt/replay.test.ts:248:      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
tests/unit/vtt/replay.test.ts:255:  it('gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped', () => {
tests/unit/vtt/replay.test.ts:265:      () => replayBundle(candidate as unknown as ReplayBundle),
tests/unit/vtt/replay.test.ts:296:      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
tests/unit/vtt/replay.test.ts:303:  it('M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing', () => {
tests/unit/vtt/replay.test.ts:312:    expect(replayBundle(candidate as unknown as ReplayBundle).finalStateHash).toBe(
tests/unit/vtt/replay.test.ts:318:    const implementation = replayBundle.toString();
tests/unit/vtt/replay.test.ts:319:    expect(replayBundle.length).toBe(2);
tests/unit/vtt/replay.test.ts:321:    expect(() => replayBundle(recordScriptedReferenceSkirmish().bundle)).not.toThrow();

exec
/bin/bash -lc "rg -n \"D630|41_?000|41000|replay.*detection|detection.*replay\" .claude tests src --glob '"'!node_modules'"' | head -300; sed -n '900,1035p' tests/integration/vtt/pc-algorithm-policy.test.ts; sed -n '280,390p' tests/unit/vtt/room-generator-los-cover.test.ts; sed -n '1,260p' src/combat/visibility-field.ts; sed -n '1,260p' src/combat/visibility.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
.claude/consensus/vis-field/plan-r3-sol.md:188:T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: the three allowed test files, `tests/unit/vtt/challenge-room-fixtures.test.ts`, `tests/unit/vtt/session-persistence.test.ts`, `tests/unit/vtt/replay.test.ts`, `tests/unit/vtt/detection-reactions.test.ts`.
.claude/consensus/vis-field/plan-r2-sol.md:184:T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: the three allowed test files, `tests/unit/vtt/challenge-room-fixtures.test.ts`, `tests/unit/vtt/session-persistence.test.ts`, `tests/unit/vtt/replay.test.ts`, `tests/unit/vtt/detection-reactions.test.ts`.
.claude/consensus/vis-field/loop-log.md:47:Timing (same box, same load, sequential): replay + detection-reactions on main 75c2f44a = 35/35 in 33.6 s; on B1 7b0f4586 = 4 failed / 31 passed in 68.6 s with three replay tests over their 5 s timeout (6.3-6.9 s). Full tests/unit sweep on B1: 510 files, 58 failed / 9870 passed in 15 files; isolated rerun of the 14 files: 53 failures, all vitest timeouts; six of those suites baselined green on main under the same load (179/179 and 62/62). Cause read from visibility-field.ts:293-342: sightToCreature builds the observer's whole-board field per state object (cache never hits across reducer steps) and detectCombatant is per pair per step; pre-B1 traced one line per pair. Brief impl-vis-field-b1-fix-r2.md (F1 light obscurement, F2 passive Perception, F3 behavioural Perception test, F4 pairwise cost), rules block grep-checked (1), sol resume 01a0a625…, log impl-b1-fix-r2.log. Worktree confirmed free before dispatch (no codex, no vitest, status clean at 7b0f4586).
      if (step.kind === 'refused') throw new Error(step.reason);
      steps += 1;
    }

    expect(coordinator.state().round).toBeGreaterThan(1);
    expect(combatResolved(coordinator.state())).toBe(true);
    expect(steps).toBeLessThan(100);
  });

  it('same-seed-determinism: two room-1 runs produce identical journals and outcomes', async () => {
    const first = await runRoomOne(20_260_824);
    const second = await runRoomOne(20_260_824);
    expect(second).toEqual(first);
  });

  it('fixed-seed-room-outcomes: the algorithm party wins rooms 1, 2, 3, and 4 in the live adventuring-day sequence', async () => {
    const rng = mulberry32(20_260_824);
    let partyState = createPartySessionState(sample.party.members);
    const outcomes: Array<{
      readonly room: number;
      readonly outcome: RoomRun['outcome'];
      readonly round: number;
      readonly partyHitPoints: readonly number[];
    }> = [];
    for (let room = 1; room <= 4; room += 1) {
      const encounter = composeD365Room(sample.party.members, sample.displayNames, partyState);
      const result = await runRoom(encounter, rng);
      outcomes.push({
        room,
        outcome: result.outcome,
        round: result.round,
        partyHitPoints: result.state.combatants.flatMap((candidate) =>
          candidate.profile.kind === 'player_character' ? [candidate.hitPoints] : []),
      });
      if (room < 4) {
        const captured = capturePartySessionState(partyState, result.state);
        partyState = enterNextRoom(takeShortRest(captured, [], rng).state);
      }
    }
    expect(outcomes).toEqual([
      expect.objectContaining({ room: 1, outcome: 'victory' }),
      expect.objectContaining({ room: 2, outcome: 'victory' }),
      expect.objectContaining({ room: 3, outcome: 'victory' }),
      expect.objectContaining({ room: 4, outcome: 'victory' }),
    ]);
    expect(outcomes.every((room) => room.round <= 20)).toBe(true);
    expect(outcomes.every((room) => room.partyHitPoints.some((hitPoints) => hitPoints > 0))).toBe(true);
  });

  it('vane-cinder-rite-terminates: both sides receive combat actions and conclude within 20 rounds', async () => {
    const encounter = composeVaneWarrenFight(
      'cinder-rite',
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
    );
    const result = await runRoom(encounter, mulberry32(20_260_824));

    expect(result.round).toBeLessThanOrEqual(20);
    expect(['victory', 'defeat']).toContain(result.outcome);
    expect(result.eventTypes).toContain('attack_resolved');
    expect(result.state.eventLog.some((event) =>
      event.type === 'attack_resolved' &&
      result.state.combatants.some((candidate) =>
        candidate.profile.id === event.actor && candidate.profile.kind === 'monster'))).toBe(true);
  });

  it('vane-tpk-clean-terminates: the doomed composition defeats the party after death saves', async () => {
    const encounter = composeVaneWarrenFight(
      'cinder-rite',
      sample.party.members,
      sample.displayNames,
      createPartySessionState(sample.party.members),
      undefined,
      'tpk-clean',
    );
    const coordinator = new TurnCoordinator(
      encounter.state,
      new ControllerRegistry(encounter.state.combatants.map((candidate) => ({
        combatantId: candidate.profile.id,
        controller: new AlgorithmController(),
      }))),
      mulberry32(20_260_824),
      {
        turnLegalActions: encounter.turnLegalActions,
        reactionLegalActions: regretReactionLegalActions,
      },
    );
    for (let steps = 0; !combatResolved(coordinator.state()) && steps < 2_000; steps += 1) {
      const pending = coordinator.state().pendingDecisions[0];
      if (pending !== undefined && pending.kind !== 'adjudication_prompt') {
        const option = pending.options.find((candidate) => candidate.id === (
          pending.kind === 'death_save' ? 'roll' :
            pending.kind === 'reaction_offer' ? 'decline' :
              pending.kind === 'legendary_resistance' ? 'suffer' : 'pass'
        ));
        if (option === undefined) throw new Error(`No test policy for ${pending.kind}.`);
        const resolved = coordinator.resolvePendingDecision({
          type: 'resolve_pending_decision',
          decisionId: pending.id,
          optionId: option.id,
        });
        if (resolved.kind === 'refused') throw new Error(resolved.reason);
      } else {
        const step = await coordinator.step();
        if (step.kind === 'refused') throw new Error(step.reason);
      }
    }
    const state = coordinator.state();

    expect(state.phase).toMatchObject({ kind: 'concluded', outcome: 'defeat' });
    expect(state.round).toBeLessThanOrEqual(4);
    expect(state.eventLog.some((event) => event.type === 'death_save_resolved')).toBe(true);
    expect(state.combatants.filter((candidate) =>
      candidate.profile.kind === 'player_character' && candidate.life === 'dead')).toHaveLength(5);
  });

  it('nondeterministic_pick: canonical tie-breaking is independent of legal-action input order', async () => {
    const actor = playerProfile('pc-policy-tie', { initiativeBonus: 20 });
    const alpha = monsterProfile('pc-policy-alpha', { initiativeBonus: -10 });
    const omega = monsterProfile('pc-policy-omega', { initiativeBonus: -20 });
    const state = startedState(
      [actor, alpha, omega],
      [placedToken(actor, 1, 1), placedToken(alpha, 0, 1), placedToken(omega, 2, 1)],
      4,
    );
    const left = attack(actor.id, alpha.id, 'attack:test-bow');
    const right = attack(actor.id, omega.id, 'attack:test-bow');
    const controller = new AlgorithmController();
    const first = await controller.choose(
      requestFor(state, actor.id, [left, right]),
      new AbortController().signal,
    );
    const second = await controller.choose(
      requestFor(state, actor.id, [right, left]),
      new AbortController().signal,
      line.targetCorner.column === 1 && line.targetCorner.row === 6);
    if (closedRay === undefined) throw new Error('Two-blocker fixture omitted the (14,6) -> (1,6) ray.');
    expect(closedRay).toMatchObject({ tier: 'none', blocksSight: true });
    expect(generatedLineIsOpen(closedRay)).toBe(false);

    // Removing (8,6) opens the same row-line-6 rays because only (8,5) remains.
    const openedTrace = traceCombatantLine(opened, source.id, target.id);
    expect(openedTrace).toMatchObject({ tier: 'none', blocksSight: false });
    const openedRay = openedTrace.lines.find((line) =>
      line.targetCorner.column === 1 && line.targetCorner.row === 6);
    if (openedRay === undefined) throw new Error('One-flank fixture omitted the (14,6) -> (1,6) ray.');
    expect(openedRay).toMatchObject({ tier: 'none', blocksSight: false });
    expect(generatedLineIsOpen(openedRay)).toBe(true);
  });

  it('generated and authored arena fixtures share one strict decoder', () => {
    const generated = generateRoom(5_762_001, { terrainProfile: 'los_cover_v1' });
    expect(canonicalJson(decodeArenaBasisEnvelopeV1(generated, { mode: 'legacy_basis' }).encounter.state))
      .toBe(canonicalJson(generated.encounter.state));
    const authoredText = inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831001.json');
    const authored = decodeArenaBasisEnvelopeV1(JSON.parse(authoredText) as unknown, { mode: 'challenge' });
    expect(authored.spec.seed).toBe(5_831_001);
    expect(authored.encounter.state.initiative).toHaveLength(4);
  });

  it.each(FIXTURE_CASES)(
    'kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for $difficulty seed $seed',
    ({ difficulty, seed, path }) => {
      const room = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      expect(room.spec.terrainProfile).toBe('los_cover_v1');
      expectFeatureMembership(room);
      const fixtureText = inputs.fixtures.readText(path);
      expect(fixtureText).toContain('"foggedCells"');
      expect(canonicalJson(decodeArenaFixtureText(fixtureText))).toBe(
        canonicalJson(room.encounter.state),
      );
    },
  );

  it('kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture', () => {
    for (const fixture of FIXTURE_CASES) {
      expectFeatureMembership(generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      }));
    }
  });

  it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', () => {
    for (const fixture of FIXTURE_CASES) {
      const room = generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      });
      for (const combatant of room.encounter.state.combatants.filter((candidate) =>
        candidate.life === 'living')) {
        expect(reachesProductiveRegion(room, combatant.profile.id),
          `${fixture.difficulty} seed ${String(fixture.seed)} ${combatant.profile.id}`).toBe(true);
      }
    }
  });

  it('retains a productive first-turn option for every living monster in the versioned basis', () => {
    for (const fixture of FIXTURE_CASES) {
      expectProductiveMonsters(generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      }));
    }
  });

  it('kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side', () => {
    for (const fixture of FIXTURE_CASES) {
      const room = generateRoom(fixture.seed, {
        difficulty: fixture.difficulty,
        terrainProfile: 'los_cover_v1',
      });
      const { party, monsters } = livingSides(room);
      expect(sideCanChangeLine(room, party, monsters), `${fixture.difficulty} party`).toBe(true);
      expect(sideCanChangeLine(room, monsters, party), `${fixture.difficulty} monsters`).toBe(true);
    }
  });

  it.each(PROPERTY_CASES)(
    'kills M576-E2-SEED-SPECIFIC-CORRECTION for $difficulty seed $seed',
    ({ difficulty, seed }) => {
      const first = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      const second = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      expect(first.spec.terrainProfile).toBe('los_cover_v1');
      expect(first.spec.terrain.filter((feature) => feature.kind === 'cover-object')).toHaveLength(2);
      expect(first.spec.terrain.filter((feature) => feature.kind === 'wall')).toHaveLength(1);
      expect(sha256(canonicalJson(first)), `${difficulty} seed ${String(seed)}`).toBe(
        sha256(canonicalJson(second)),
      );
    },
  );

  it('kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION', () => {
    for (const [difficulty, seed] of [
      ['standard', 1],
      ['brutal', 1],
    ] as const) {
      const room = generateRoom(seed, { difficulty, terrainProfile: 'los_cover_v1' });
      const large = room.encounter.state.combatants.filter((combatant) =>
        combatant.life === 'living' && ['Large', 'Huge', 'Gargantuan'].includes(
          combatant.profile.rules.sizeCategory ?? '',
        ));
      expect(large.length).toBeGreaterThan(0);
      for (const combatant of large) {
        expect(reachesProductiveRegion(room, combatant.profile.id), combatant.profile.id).toBe(true);
      }
import type { CombatSense } from './statblock';
import {
  combatantConditions,
  combatantSpace,
  effectiveCombatRules,
} from './combat-rules';
import {
  traceCombatantLineToCells,
  traceTerrainLine,
} from './cover';
import {
  minimumSpaceDistance,
  minimumSpaceDistanceToCells,
  type CreatureSpace,
  type KnownCreatureSize,
} from './creature-space';
import type { EncounterState } from './encounter';
import type { GridCell } from './grid';
import { affectedCells } from './templates';
import { terrainWallCells } from './terrain';
import type { CombatantId } from './values';
import { environmentLightAt } from './world-objects';

export type VisibilityGrade = 'seen' | 'seen_dim' | 'unseen';
export type SightSense =
  | 'normal_sight'
  | 'darkvision'
  | 'blindsight'
  | 'truesight'
  | 'devils_sight';

export type SightOutcome =
  | {
      readonly kind: 'visible';
      readonly grade: 'seen' | 'seen_dim';
      readonly sense: SightSense;
    }
  | {
      readonly kind: 'unseen';
      readonly reason: 'blocked' | 'obscured' | 'darkness' | 'out_of_range';
    };

export type DetectionResult =
  | {
      readonly kind: 'seen';
      readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'devils_sight';
    }
  | {
      readonly kind: 'located';
      readonly sense: 'tremorsense' | 'web_sense';
    }
  | {
      readonly kind: 'undetected';
      readonly reason: 'blocked' | 'hidden' | 'invisible' | 'obscured' | 'darkness' | 'out_of_range';
    };

export interface VisibilityFieldCell {
  readonly cell: GridCell;
  readonly grade: VisibilityGrade;
}

export type VisibilityObserverScope =
  | { readonly kind: 'dm_party' }
  | {
      readonly kind: 'player_seat';
      readonly ownedIds: ReadonlySet<CombatantId>;
    };

interface ActualObserver {
  readonly kind: 'actual';
  readonly id: CombatantId;
  readonly space: CreatureSpace<KnownCreatureSize>;
  readonly senses: readonly CombatSense[];
  readonly blinded: boolean;
}

interface VirtualObserver {
  readonly kind: 'virtual';
  readonly cell: GridCell;
}

type CellObserver = ActualObserver | VirtualObserver;

interface CellObscurement {
  readonly cell: GridCell;
  readonly light: boolean;
  readonly heavy: boolean;
  readonly magicalDarkness: boolean;
}

interface EvaluationContext {
  readonly state: EncounterState;
  readonly observer: CellObserver;
  readonly obscuredCells: ReadonlyMap<string, CellObscurement>;
  readonly opaqueCells: readonly GridCell[];
}

interface DetailedVisibilityFieldCell extends VisibilityFieldCell {
  readonly outcome: SightOutcome;
}

const detailedFields = new WeakMap<
  EncounterState,
  Map<CombatantId, readonly DetailedVisibilityFieldCell[]>
>();
const observerContexts = new WeakMap<EncounterState, Map<CombatantId, EvaluationContext>>();
const actualCellOutcomes = new WeakMap<
  EncounterState,
  Map<CombatantId, Map<string, SightOutcome>>
>();
const obscurementByState = new WeakMap<EncounterState, ReadonlyMap<string, CellObscurement>>();
const virtualOpaqueByState = new WeakMap<EncounterState, readonly GridCell[]>();
const pairOutcomes = new WeakMap<EncounterState, Map<string, SightOutcome>>();
const derivedFogByState = new WeakMap<EncounterState, Map<string, readonly GridCell[]>>();

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function combatantIsHidden(state: EncounterState, subject: CombatantId): boolean {
  return state.hiddenCombatants.some((entry) => entry.combatant === subject);
}

function sharesWebArea(state: EncounterState, observer: CombatantId, subject: CombatantId): boolean {
  const persistentWeb = state.persistentAreas.some((area) => {
    return area.material?.id === 'webs' &&
      area.members.includes(observer) && area.members.includes(subject);
  });
  return persistentWeb || state.effects.some((effect) => {
    if (effect.payload.kind !== 'web_area' || effect.payload.placement === 'selected_when_cast') return false;
    const cells = affectedCells(
      { bounds: state.bounds, blockedCells: terrainWallCells(state) },
      effect.payload.placement,
    );
    const keys = new Set(cells.map(cellKey));
    return combatantSpace(state, observer).cells.some((cell) => keys.has(cellKey(cell))) &&
      combatantSpace(state, subject).cells.some((cell) => keys.has(cellKey(cell)));
  });
}

function compareCells(left: GridCell, right: GridCell): number {
  return left.row - right.row || left.column - right.column;
}

function allCells(state: EncounterState): readonly GridCell[] {
  const cells: GridCell[] = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      cells.push({ column, row });
    }
  }
  return cells;
}

function observerForCombatant(state: EncounterState, id: CombatantId): ActualObserver {
  return {
    kind: 'actual',
    id,
    space: combatantSpace(state, id),
    senses: effectiveCombatRules(state, id).senses,
    blinded: combatantConditions(state, id).some(({ name }) => name === 'Blinded'),
  };
}

function senseRange(observer: CellObserver, kind: Exclude<SightSense, 'normal_sight'>): number | null {
  if (observer.kind === 'virtual') return null;
  const sense = observer.senses.find((candidate) => candidate.kind === kind);
  return sense === undefined || sense.kind === 'normal_sight' ? null : sense.rangeFeet;
}

function senseInRange(
  observer: CellObserver,
  kind: Exclude<SightSense, 'normal_sight'>,
  target: GridCell,
): boolean {
  const rangeFeet = senseRange(observer, kind);
  if (rangeFeet === null || observer.kind === 'virtual') return false;
  const distance = minimumSpaceDistanceToCells(observer.space, [target]);
  return distance <= rangeFeet;
}

function physicalSenseInRange(
  observer: CellObserver,
  kind: 'darkvision' | 'truesight' | 'devils_sight',
  target: GridCell,
): boolean {
  return (observer.kind === 'virtual' || !observer.blinded) && senseInRange(observer, kind, target);
}

function addObscurement(
  obscuredCells: Map<string, CellObscurement>,
  cell: GridCell,
  kind: 'light' | 'heavy' | 'magical_darkness',
): void {
  const key = cellKey(cell);
  const previous = obscuredCells.get(key) ?? {
    cell,
    light: false,
    heavy: false,
    magicalDarkness: false,
  };
  obscuredCells.set(key, {
    cell: previous.cell,
    light: previous.light || kind === 'light',
    heavy: previous.heavy || kind === 'heavy',
    magicalDarkness: previous.magicalDarkness || kind === 'magical_darkness',
  });
}

function obscurementCells(state: EncounterState): ReadonlyMap<string, CellObscurement> {
  const cached = obscurementByState.get(state);
  if (cached !== undefined) return cached;
  const obscuredCells = new Map<string, CellObscurement>();
  const environmentCells = new Map<
    string,
    { readonly cell: GridCell; readonly kind: 'light' | 'heavy' | 'magical_darkness' }
  >();
  for (const region of state.environment.obscurementRegions) {
    for (const cell of region.cells) {
      if (
        cell.column >= 0 &&
        cell.column < state.bounds.columns &&
        cell.row >= 0 &&
        cell.row < state.bounds.rows
      ) {
        environmentCells.set(cellKey(cell), { cell, kind: region.obscurement });
      }
    }
  }
  for (const { cell, kind } of environmentCells.values()) addObscurement(obscuredCells, cell, kind);
  for (const effect of state.effects) {
    if (effect.payload.kind !== 'obscured_area' || effect.payload.placement === 'selected_when_cast') {
      continue;
    }
    const cells = affectedCells({
      bounds: state.bounds,
      blockedCells: terrainWallCells(state),
    }, effect.payload.placement);
    for (const cell of cells) addObscurement(obscuredCells, cell, effect.payload.obscurement);
  }
  obscurementByState.set(state, obscuredCells);
  return obscuredCells;
}

function opaqueCellsForObserver(
  state: EncounterState,
  observer: CellObserver,
  obscuredCells: ReadonlyMap<string, CellObscurement>,
): readonly GridCell[] {
  // D626.3: ordinary darkness is target-cell illumination, never intervening opacity.
  return [...obscuredCells.values()].flatMap((obscurement) => {
    const cell = obscurement.cell;
    const blindsight = senseInRange(observer, 'blindsight', cell);
    if (obscurement.heavy && !blindsight) return [cell];
    const magicalDarknessDefeated = blindsight ||
      physicalSenseInRange(observer, 'truesight', cell) ||
      physicalSenseInRange(observer, 'devils_sight', cell);
    return obscurement.magicalDarkness && !magicalDarknessDefeated ? [cell] : [];
  });
}
import type { CombatRulesProfile } from './combatant';
import type {
  DeathSaveState,
  EncounterCombatantState,
  EncounterState,
  LifeState,
  SpellSlotState,
  TurnResources,
} from './encounter';
import { combatantSide } from './allies';
import {
  combatantConditions,
  combatantSpace,
  effectiveCombatRules,
  effectiveCreatureSize,
} from './combat-rules';
import type { KnownCreatureSize, SerializedPlacementMode } from './creature-space';
import type { HiddenRollCategory } from './roll-visibility';
import type { EncounterEvent } from './events';
import type { GridCell } from './grid';
import type { CombatantId } from './values';
import {
  detectCombatant,
  derivedFogCells,
  eligibleVisibilityObserverIds,
} from './visibility-field';

export type EncounterViewClassification = 'dm_only' | 'player_visible' | 'per_seat';

/** D359's exhaustive projection-decision inventory. */
export const ENCOUNTER_VIEW_CLASSIFICATION = {
  config: 'player_visible',
  phase: 'dm_only',
  rulesEdition: 'player_visible',
  hiddenRolls: 'dm_only',
  revision: 'player_visible',
  nextEventSequence: 'dm_only',
  nextDecisionSequence: 'dm_only',
  nextEffectSequence: 'dm_only',
  bounds: 'player_visible',
  blockedCells: 'per_seat',
  worldObjects: 'per_seat',
  nextWorldObjectSequence: 'dm_only',
  environment: 'dm_only',
  dmNotes: 'dm_only',
  combatants: 'per_seat',
  tokens: 'per_seat',
  sharedSpaceRelations: 'dm_only',
  adjudicationPending: 'dm_only',
  absentTokens: 'dm_only',
  initiative: 'per_seat',
  activeCombatant: 'player_visible',
  activeInitiativeIndex: 'dm_only',
  round: 'player_visible',
  initiativeBeforeDelays: 'dm_only',
  effects: 'dm_only',
  persistentAreas: 'dm_only',
  nextPersistentAreaSequence: 'dm_only',
  reevaluatedBranches: 'dm_only',
  eventLog: 'per_seat',
  hiddenCombatants: 'per_seat',
  observationHistory: 'per_seat',
  searchMemories: 'dm_only',
  alerting: 'dm_only',
  pendingDecisions: 'per_seat',
  reactionPolicies: 'dm_only',
  contentPacks: 'dm_only',
  equipment: 'dm_only',
  groundItems: 'dm_only',
  itemContacts: 'dm_only',
} as const satisfies Readonly<Record<keyof EncounterState, EncounterViewClassification>>;

/** D359 classification for every nested combatant field, including the overlay. */
export const COMBATANT_VIEW_CLASSIFICATION = {
  profile: 'per_seat',
  hitPoints: 'per_seat',
  life: 'player_visible',
  deathSaves: 'dm_only',
  deathAt: 'dm_only',
  turn: 'per_seat',
  temporaryHitPoints: 'per_seat',
  wildShapeUses: 'per_seat',
  wildShape: 'player_visible',
  form: 'per_seat',
  spellSlots: 'per_seat',
  limitedResources: 'per_seat',
  legendary: 'player_visible',
} as const satisfies Readonly<Record<keyof EncounterCombatantState, EncounterViewClassification>>;

type ProjectedCanonicalEncounterState = {
  readonly [Field in keyof EncounterState]: EncounterState[Field];
} & {
  readonly foggedCells: readonly GridCell[];
};

/** Omniscient view seam. The wrapper prevents EncounterState from being passed as a view. */
export interface DmView {
  readonly audience: 'dm';
  readonly state: ProjectedCanonicalEncounterState;
}

export interface PlayerSeatBinding {
  readonly seatId: string;
  /** The combatant whose current senses establish this seat's visibility. */
  readonly combatantId: CombatantId;
  /** Combatants controlled by this seat; defaults to the bound combatant. */
  readonly ownedCombatantIds?: readonly CombatantId[];
}

export class UnknownPlayerSeatCombatantError extends Error {
  override readonly name = 'UnknownPlayerSeatCombatantError' as const;

  constructor(
    readonly seatId: string,
    readonly combatantId: CombatantId,
  ) {
    super(`Player seat ${seatId} is bound to an unknown combatant ${combatantId}.`);
  }
}

interface PlayerVisibleCombatantIdentity {
  readonly id: CombatantId;
  readonly name: string;
  readonly kind: 'player_character' | 'monster';
  readonly life: LifeState;
  readonly active: boolean;
  readonly formName: string | null;
  readonly conditions: readonly string[];
}

function playerVisibleConditions(
  state: EncounterState,
  id: CombatantId,
  owned: boolean,
): readonly string[] {
  return combatantConditions(state, id).flatMap((condition): readonly string[] => {
    if (owned) {
      return [condition.name === 'Exhaustion'
        ? `${condition.name} ${String(condition.level)}`
        : condition.name];
    }
    switch (condition.name) {
      case 'Blinded':
      case 'Grappled':
      case 'Paralyzed':
      case 'Petrified':
      case 'Prone':
      case 'Restrained':
      case 'Stunned':
      case 'Unconscious': return [condition.name];
      case 'Charmed':
      case 'Deafened':
      case 'Exhaustion':
      case 'Frightened':
      case 'Incapacitated':
      case 'Invisible':
      case 'Poisoned': return [];
    }
  });
}

export interface PlayerVisiblePlacedCombatant extends PlayerVisibleCombatantIdentity {
  readonly placementStatus: 'placed';
  readonly position: GridCell;
  readonly effectiveSize: KnownCreatureSize;
  readonly placementMode: SerializedPlacementMode;
  readonly footprint: readonly [GridCell, ...GridCell[]];
}

export interface PlayerVisiblePlacementPendingCombatant extends PlayerVisibleCombatantIdentity {
  readonly placementStatus: 'placement_pending';
  readonly pendingReason: EncounterState['adjudicationPending'][number]['kind'];
}

export type PlayerVisibleCombatant =
  | PlayerVisiblePlacedCombatant
  | PlayerVisiblePlacementPendingCombatant;

export function isPlacedVisibleCombatant<Combatant extends PlayerVisibleCombatant>(
  combatant: Combatant,
): combatant is Extract<Combatant, { readonly placementStatus: 'placed' }> {
  return combatant.placementStatus === 'placed';
}

export interface PlayerOwnedCombatant {
  readonly id: CombatantId;
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly turn: TurnResources;
  readonly wildShapeUses: EncounterCombatantState['wildShapeUses'];
}

export interface PlayerLastSeenCombatant {
  readonly id: CombatantId;
  readonly name: string;
  readonly kind: 'player_character' | 'monster';
  readonly cell: GridCell;
  readonly round: number;
}

interface DmVisibleCombatantDetails {
  readonly hitPoints: number;
  readonly rules: CombatRulesProfile;
  readonly deathSaves: DeathSaveState | null;
  readonly turn: TurnResources;
  readonly spellSlots: readonly SpellSlotState[];
  readonly hiddenFromPlayers: boolean;
}

export type DmVisiblePlacedCombatant = PlayerVisiblePlacedCombatant & DmVisibleCombatantDetails;
export type DmVisiblePlacementPendingCombatant = PlayerVisiblePlacementPendingCombatant & DmVisibleCombatantDetails;
export type DmVisibleCombatant = DmVisiblePlacedCombatant | DmVisiblePlacementPendingCombatant;

type DeathSaveResolvedEvent = Extract<EncounterEvent, { readonly type: 'death_save_resolved' }>;
type AttackResolvedEvent = Extract<EncounterEvent, { readonly type: 'attack_resolved' }>;
type SaveResolvedEvent = Extract<EncounterEvent, { readonly type: 'save_resolved' }>;

export type DeathSaveEventFieldClassification =
  | EncounterViewClassification
  | 'toggle_controlled';

/** D359 forces every raw death-save event field through an explicit projection decision. */
export const DEATH_SAVE_EVENT_VIEW_CLASSIFICATION = {
  sequence: 'player_visible',
  type: 'player_visible',
  combatant: 'player_visible',
  roll: 'toggle_controlled',
  outcome: 'player_visible',
  successes: 'player_visible',
  failures: 'player_visible',
  lifeState: 'player_visible',
  stableRecovery: 'player_visible',
} as const satisfies Readonly<Record<keyof DeathSaveResolvedEvent, DeathSaveEventFieldClassification>>;

export type PlayerVisibleDeathSaveEvent =
  | (DeathSaveResolvedEvent & { readonly rollVisibility: 'player_visible' })
  | (Omit<DeathSaveResolvedEvent, 'roll'> & { readonly rollVisibility: 'dm_only' });

export type PlayerVisibleAttackEvent =
  | (AttackResolvedEvent & { readonly rollVisibility: 'player_visible' })
  | {
      readonly sequence: number;
      readonly type: 'attack_resolved';
      readonly actor: CombatantId;
      readonly target: CombatantId;
      readonly outcome: AttackResolvedEvent['attack']['outcome'];
      readonly rollVisibility: 'dm_only';
    };

export type PlayerVisibleSaveEvent =
  | (SaveResolvedEvent & { readonly rollVisibility: 'player_visible' })
  | {
      readonly sequence: number;
      readonly type: 'save_resolved';
      readonly source: CombatantId;
      readonly target: CombatantId;
      readonly ability: SaveResolvedEvent['ability'];
      readonly effectId: SaveResolvedEvent['effectId'];
      readonly outcome: SaveResolvedEvent['save']['outcome'];
      readonly rollVisibility: 'dm_only';

exec
/bin/bash -lc "sed -n '240,620p' src/combat/visibility-field.ts; rg -n \"function project|export function project|derivedFog|detectCombatant|eligibleVisibility|traceCombatantLine\" src/combat/visibility.ts src/vtt/engine-query-port.ts src/combat/cover.ts src -g '*.ts' | head -250; sed -n '1050,1240p' src/vtt/engine-query-port.ts; rg -n \"D630\" .claude/decisions.md .claude/consensus .ai tests src | head -100" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
  }
  obscurementByState.set(state, obscuredCells);
  return obscuredCells;
}

function opaqueCellsForObserver(
  state: EncounterState,
  observer: CellObserver,
  obscuredCells: ReadonlyMap<string, CellObscurement>,
): readonly GridCell[] {
  // D626.3: ordinary darkness is target-cell illumination, never intervening opacity.
  return [...obscuredCells.values()].flatMap((obscurement) => {
    const cell = obscurement.cell;
    const blindsight = senseInRange(observer, 'blindsight', cell);
    if (obscurement.heavy && !blindsight) return [cell];
    const magicalDarknessDefeated = blindsight ||
      physicalSenseInRange(observer, 'truesight', cell) ||
      physicalSenseInRange(observer, 'devils_sight', cell);
    return obscurement.magicalDarkness && !magicalDarknessDefeated ? [cell] : [];
  });
}

function evaluationContext(state: EncounterState, observer: CellObserver): EvaluationContext {
  const obscuredCells = obscurementCells(state);
  return {
    state,
    observer,
    obscuredCells,
    opaqueCells: opaqueCellsForObserver(state, observer, obscuredCells),
  };
}

function actualObserverContext(state: EncounterState, observerId: CombatantId): EvaluationContext {
  const stateContexts = observerContexts.get(state) ?? new Map<CombatantId, EvaluationContext>();
  const cached = stateContexts.get(observerId);
  if (cached !== undefined) return cached;
  const context = evaluationContext(state, observerForCombatant(state, observerId));
  stateContexts.set(observerId, context);
  if (!observerContexts.has(state)) observerContexts.set(state, stateContexts);
  return context;
}

function virtualEvaluationContext(state: EncounterState, cell: GridCell): EvaluationContext {
  const observer: VirtualObserver = { kind: 'virtual', cell };
  const obscuredCells = obscurementCells(state);
  const cachedOpaque = virtualOpaqueByState.get(state);
  const opaqueCells = cachedOpaque ?? opaqueCellsForObserver(state, observer, obscuredCells);
  if (cachedOpaque === undefined) virtualOpaqueByState.set(state, opaqueCells);
  return { state, observer, obscuredCells, opaqueCells };
}

function traceToCell(context: EvaluationContext, target: GridCell) {
  if (context.observer.kind === 'virtual') {
    if (context.opaqueCells.length === 0) {
      return traceTerrainLine(context.state, context.observer.cell, target);
    }
    return traceTerrainLine(context.state, context.observer.cell, target, {
      additionalSightBlockingCells: context.opaqueCells,
    });
  }
  if (context.opaqueCells.length === 0) {
    return traceCombatantLineToCells(context.state, context.observer.id, [target]);
  }
  return traceCombatantLineToCells(context.state, context.observer.id, [target], {
    additionalSightBlockingCells: context.opaqueCells,
  });
}

function visible(grade: 'seen' | 'seen_dim', sense: SightSense): SightOutcome {
  return { kind: 'visible', grade, sense };
}

function hasRangedSense(
  observer: CellObserver,
  kinds: readonly Exclude<SightSense, 'normal_sight'>[],
): boolean {
  return kinds.some((kind) => senseRange(observer, kind) !== null);
}

function withLightObscurement(
  outcome: SightOutcome,
  obscurement: CellObscurement | undefined,
): SightOutcome {
  if (
    outcome.kind === 'unseen' ||
    !obscurement?.light ||
    outcome.sense === 'blindsight'
  ) return outcome;
  return visible('seen_dim', outcome.sense);
}

function evaluateUncachedCell(context: EvaluationContext, target: GridCell): SightOutcome {
  if (traceToCell(context, target).blocksSight) return { kind: 'unseen', reason: 'blocked' };
  const observer = context.observer;
  const blindsight = senseInRange(observer, 'blindsight', target);
  if (blindsight) return visible('seen', 'blindsight');
  if (observer.kind === 'actual' && observer.blinded) {
    return { kind: 'unseen', reason: 'obscured' };
  }

  const obscured = context.obscuredCells.get(cellKey(target));
  if (obscured?.heavy) return { kind: 'unseen', reason: 'obscured' };
  const truesight = physicalSenseInRange(observer, 'truesight', target);
  if (truesight) return withLightObscurement(visible('seen', 'truesight'), obscured);
  const devilsSight = physicalSenseInRange(observer, 'devils_sight', target);
  if (obscured?.magicalDarkness) {
    return devilsSight
      ? withLightObscurement(visible('seen', 'devils_sight'), obscured)
      : { kind: 'unseen', reason: 'darkness' };
  }

  const light = environmentLightAt(context.state.environment, target);
  if (light === 'darkness') {
    if (devilsSight) return withLightObscurement(visible('seen', 'devils_sight'), obscured);
    if (physicalSenseInRange(observer, 'darkvision', target)) {
      return withLightObscurement(visible('seen_dim', 'darkvision'), obscured);
    }
    const hasRelevantSense = hasRangedSense(observer, [
      'blindsight',
      'darkvision',
      'truesight',
      'devils_sight',
    ]);
    return { kind: 'unseen', reason: hasRelevantSense ? 'out_of_range' : 'darkness' };
  }
  if (light === 'dim') {
    if (devilsSight) return withLightObscurement(visible('seen', 'devils_sight'), obscured);
    if (physicalSenseInRange(observer, 'darkvision', target)) {
      return withLightObscurement(visible('seen', 'darkvision'), obscured);
    }
    return withLightObscurement(visible('seen_dim', 'normal_sight'), obscured);
  }
  return withLightObscurement(visible('seen', 'normal_sight'), obscured);
}

function evaluateCell(
  context: EvaluationContext,
  target: GridCell,
): SightOutcome {
  if (context.observer.kind === 'virtual') return evaluateUncachedCell(context, target);
  const state = context.state;
  const observerId = context.observer.id;
  const stateOutcomes = actualCellOutcomes.get(state) ?? new Map<
    CombatantId,
    Map<string, SightOutcome>
  >();
  const observerOutcomes = stateOutcomes.get(observerId) ?? new Map<string, SightOutcome>();
  const key = cellKey(target);
  const cached = observerOutcomes.get(key);
  if (cached !== undefined) return cached;
  const outcome = Object.freeze(evaluateUncachedCell(context, target));
  observerOutcomes.set(key, outcome);
  stateOutcomes.set(observerId, observerOutcomes);
  if (!actualCellOutcomes.has(state)) actualCellOutcomes.set(state, stateOutcomes);
  return outcome;
}

function actualObserverField(
  state: EncounterState,
  observerId: CombatantId,
): readonly DetailedVisibilityFieldCell[] {
  const stateFields = detailedFields.get(state) ?? new Map<
    CombatantId,
    readonly DetailedVisibilityFieldCell[]
  >();
  const cached = stateFields.get(observerId);
  if (cached !== undefined) return cached;
  const context = actualObserverContext(state, observerId);
  const field = Object.freeze(allCells(state).map((cell) => {
    const frozenCell = Object.freeze({ ...cell });
    const outcome = evaluateCell(context, frozenCell);
    const entry: DetailedVisibilityFieldCell = Object.freeze({
      cell: frozenCell,
      grade: outcome.kind === 'visible' ? outcome.grade : 'unseen',
      outcome,
    });
    return entry;
  }));
  stateFields.set(observerId, field);
  if (!detailedFields.has(state)) detailedFields.set(state, stateFields);
  return field;
}

export function visibilityField(
  state: EncounterState,
  observerId: CombatantId,
): readonly VisibilityFieldCell[] {
  return Object.freeze(actualObserverField(state, observerId).map(({ cell, grade }) =>
    Object.freeze({ cell, grade })));
}

export function sightToCreature(
  state: EncounterState,
  observerId: CombatantId,
  subjectId: CombatantId,
): SightOutcome {
  const stateOutcomes = pairOutcomes.get(state) ?? new Map<string, SightOutcome>();
  const key = `${String(observerId)}\u0000${String(subjectId)}`;
  const cached = stateOutcomes.get(key);
  if (cached !== undefined) return cached;
  const context = actualObserverContext(state, observerId);
  const subjectCells = combatantSpace(state, subjectId).cells;
  const onlyCell = subjectCells.length === 1 ? subjectCells[0] : undefined;
  let outcome: SightOutcome;
  if (onlyCell !== undefined) {
    outcome = evaluateCell(context, onlyCell);
  } else {
    const outcomes = subjectCells.map((cell) => evaluateCell(context, cell));
    const seen = outcomes.find((candidate) => candidate.kind === 'visible' && candidate.grade === 'seen');
    const dim = outcomes.find((candidate) => candidate.kind === 'visible');
    outcome = seen?.kind === 'visible'
      ? seen
      : dim?.kind === 'visible'
        ? dim
        : outcomes[0] ?? { kind: 'unseen', reason: 'blocked' };
  }
  const frozen = Object.freeze(outcome);
  stateOutcomes.set(key, frozen);
  if (!pairOutcomes.has(state)) pairOutcomes.set(state, stateOutcomes);
  return frozen;
}

/**
 * Detection vocabulary and source clauses:
 * - Blindsight: docs/srd/full/srd-5.2.1.txt:11356-11362.
 * - Darkvision: docs/srd/full/srd-5.2.1.txt:11582-11588.
 * - Tremorsense: docs/srd/full/srd-5.2.1.txt:12206-12214 (location, not sight).
 * - Truesight: docs/srd/full/srd-5.2.1.txt:12216-12241.
 * - Web Sense: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23501-23503.
 */
export function detectCombatant(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): DetectionResult {
  const sight = sightToCreature(state, observer, subject);
  const distance = minimumSpaceDistance(combatantSpace(state, observer), combatantSpace(state, subject));
  const senses = effectiveCombatRules(state, observer).senses;
  const hasBlindsight = senses.some((sense) =>
    sense.kind === 'blindsight' && distance <= sense.rangeFeet);
  if (hasBlindsight && sight.kind === 'visible') {
    return { kind: 'seen', sense: 'blindsight' };
  }
  const hasTruesight = senses.some((sense) =>
    sense.kind === 'truesight' && distance <= sense.rangeFeet);
  const hasTremorsense = senses.some((sense) =>
    sense.kind === 'tremorsense' && distance <= sense.rangeFeet);
  const observerRules = effectiveCombatRules(state, observer);
  const subjectRules = effectiveCombatRules(state, subject);
  if (
    hasTremorsense &&
    observerRules.contactMedium !== 'air' &&
    observerRules.contactMedium === subjectRules.contactMedium
  ) return { kind: 'located', sense: 'tremorsense' };
  if (observerRules.detectionTraits.includes('web_sense') && sharesWebArea(state, observer, subject)) {
    return { kind: 'located', sense: 'web_sense' };
  }
  if (sight.kind === 'unseen' && sight.reason === 'blocked') {
    return { kind: 'undetected', reason: 'blocked' };
  }

  const observerBlinded = combatantConditions(state, observer)
    .some(({ name }) => name === 'Blinded');
  if (observerBlinded) return { kind: 'undetected', reason: 'obscured' };
  const subjectInvisible = combatantConditions(state, subject)
    .some(({ name }) => name === 'Invisible');
  const hidden = combatantIsHidden(state, subject);
  if (hidden && !hasTruesight) return { kind: 'undetected', reason: 'hidden' };
  if (subjectInvisible && !hasTruesight) return { kind: 'undetected', reason: 'invisible' };
  return sight.kind === 'visible'
    ? { kind: 'seen', sense: sight.sense }
    : { kind: 'undetected', reason: sight.reason };
}

export function cellsThatCanSee(
  state: EncounterState,
  subjectId: CombatantId,
): readonly GridCell[] {
  const subjectCells = combatantSpace(state, subjectId).cells;
  return Object.freeze(allCells(state).filter((origin) => {
    const context = virtualEvaluationContext(state, origin);
    return subjectCells.some((target) => evaluateCell(context, target).kind === 'visible');
  }).map((cell) => Object.freeze({ ...cell })));
}

export function eligibleVisibilityObserverIds(
  state: EncounterState,
  scope: VisibilityObserverScope,
): readonly CombatantId[] {
  return Object.freeze(state.combatants.flatMap((combatant) => {
    const id = combatant.profile.id;
    if (combatant.life !== 'living') return [];
    if (!state.tokens.some((token) => token.combatantId === id)) return [];
    if (state.adjudicationPending.some((entry) => entry.combatant === id)) return [];
    if (combatantConditions(state, id).some(({ name }) => name === 'Unconscious')) return [];
    if (scope.kind === 'dm_party') {
      return combatant.profile.kind === 'player_character' ? [id] : [];
    }
    return scope.ownedIds.has(id) ? [id] : [];
  }));
}

export function derivedFogCells(
  state: EncounterState,
  observerIds: readonly CombatantId[],
): readonly GridCell[] {
  const stateFog = derivedFogByState.get(state) ?? new Map<string, readonly GridCell[]>();
  const observerKey = observerIds.map(String).join('\u0000');
  const cached = stateFog.get(observerKey);
  if (cached !== undefined) return cached;
  const fog = Object.freeze(allCells(state)
    .filter((cell) => !observerIds.some((observerId) => {
      const outcome = evaluateCell(actualObserverContext(state, observerId), cell);
      return outcome.kind === 'visible';
    }))
    .sort(compareCells)
    .map((cell) => Object.freeze({ ...cell })));
  stateFog.set(observerKey, fog);
  if (!derivedFogByState.has(state)) derivedFogByState.set(state, stateFog);
  return fog;
}
src/combat/cover.ts:570:export function traceCombatantLine(
src/combat/cover.ts:601:export function traceCombatantLineToCells(
src/combat/cover.ts:682:  const trace = traceCombatantLine(state, sourceId, targetId, options);
src/vtt/engine-query-port.ts:5:import { detectCombatant } from '../combat/visibility-field';
src/vtt/engine-query-port.ts:6:import { coverBetweenCombatants, traceCombatantLine } from '../combat/cover';
src/vtt/engine-query-port.ts:798:function projectedAttackRanges(action: MonsterAction): {
src/vtt/engine-query-port.ts:1023:        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen',
src/vtt/engine-query-port.ts:1040:        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen'
src/vtt/engine-query-port.ts:1168:    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
src/vtt/engine-query-port.ts:1228:  const detection = detectCombatant(state, actorId, targetId);
src/vtt/engine-query-port.ts:1229:  const reciprocal = detectCombatant(state, targetId, actorId);
src/vtt/engine-query-port.ts:1450:      detectCombatant(state, candidate.profile.id, actorId).kind !== 'seen'
src/vtt/engine-query-port.ts:1484:function projectedTargetConditions(
src/vtt/engine-query-port.ts:1501:function projectedMovementState(
src/vtt/engine-query-port.ts:1528:export function projectedMovementOptions(
src/vtt/engine-query-port.ts:1547:    const cover = traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: position }).tier;
src/vtt/engine-query-port.ts:1840:    const detection = detectCombatant(state, actorId, targetId);
src/vtt/engine-query-port.ts:1841:    const reciprocal = detectCombatant(state, targetId, actorId);
src/combat/visibility.ts:23:  detectCombatant,
src/combat/visibility.ts:24:  derivedFogCells,
src/combat/visibility.ts:25:  eligibleVisibilityObserverIds,
src/combat/visibility.ts:506:export function projectDmView(state: EncounterState): DmView {
src/combat/visibility.ts:507:  const visibilityObserverIds = eligibleVisibilityObserverIds(state, { kind: 'dm_party' });
src/combat/visibility.ts:524:      foggedCells: derivedFogCells(state, visibilityObserverIds),
src/combat/visibility.ts:555:export function projectPlayerView(state: EncounterState, binding: PlayerSeatBinding): PlayerView {
src/combat/visibility.ts:564:  const availableObservers = eligibleVisibilityObserverIds(state, {
src/combat/visibility.ts:568:  const fog = new Set(derivedFogCells(state, availableObservers).map(cellKey));
src/combat/visibility.ts:596:        detectCombatant(state, observer, subject.profile.id).kind === 'seen'))) return [];
src/combat/visibility.ts:23:  detectCombatant,
src/combat/visibility.ts:24:  derivedFogCells,
src/combat/visibility.ts:25:  eligibleVisibilityObserverIds,
src/combat/visibility.ts:506:export function projectDmView(state: EncounterState): DmView {
src/combat/visibility.ts:507:  const visibilityObserverIds = eligibleVisibilityObserverIds(state, { kind: 'dm_party' });
src/combat/visibility.ts:524:      foggedCells: derivedFogCells(state, visibilityObserverIds),
src/combat/visibility.ts:555:export function projectPlayerView(state: EncounterState, binding: PlayerSeatBinding): PlayerView {
src/combat/visibility.ts:564:  const availableObservers = eligibleVisibilityObserverIds(state, {
src/combat/visibility.ts:568:  const fog = new Set(derivedFogCells(state, availableObservers).map(cellKey));
src/combat/visibility.ts:596:        detectCombatant(state, observer, subject.profile.id).kind === 'seen'))) return [];
src/combat/visibility-field.ts:8:  traceCombatantLineToCells,
src/combat/visibility-field.ts:114:const derivedFogByState = new WeakMap<EncounterState, Map<string, readonly GridCell[]>>();
src/combat/visibility-field.ts:301:    return traceCombatantLineToCells(context.state, context.observer.id, [target]);
src/combat/visibility-field.ts:303:  return traceCombatantLineToCells(context.state, context.observer.id, [target], {
src/combat/visibility-field.ts:470:export function detectCombatant(
src/combat/visibility-field.ts:525:export function eligibleVisibilityObserverIds(
src/combat/visibility-field.ts:542:export function derivedFogCells(
src/combat/visibility-field.ts:546:  const stateFog = derivedFogByState.get(state) ?? new Map<string, readonly GridCell[]>();
src/combat/visibility-field.ts:558:  if (!derivedFogByState.has(state)) derivedFogByState.set(state, stateFog);
src/combat/tactical-evaluator.ts:111:export function projectMonsterRollModeSources(
src/combat/controllers.ts:129:function projectedSpaceAt(combatant: PlayerVisiblePlacedCombatant, position: { readonly column: number; readonly row: number }) {
src/combat/encounter.ts:44:  detectCombatant,
src/combat/encounter.ts:49:export { detectCombatant } from './visibility-field';
src/combat/encounter.ts:53:  traceCombatantLine,
src/combat/encounter.ts:54:  traceCombatantLineToCells,
src/combat/encounter.ts:2147:  return detectCombatant(state, observer, subject).kind === 'seen';
src/combat/encounter.ts:2292:          detectCombatant(context.state, current.observer, current.target),
src/combat/encounter.ts:4796:    const detection = detectCombatant(context.state, enemy.profile.id, actor);
src/combat/encounter.ts:7183:  const attackLine = traceCombatantLine(context.state, command.actor, command.target);
src/combat/encounter.ts:7477:  const selectedLine = traceCombatantLineToCells(context.state, command.actor, [command.square]);
src/combat/encounter.ts:8566:  const selectedLine = traceCombatantLine(context.state, command.actor, target);
src/combat/encounter.ts:9051:  const selectedLine = traceCombatantLineToCells(context.state, command.actor, targetCells);
src/combat/encounter.ts:10685:        const selectedLine = traceCombatantLineToCells(context.state, command.actor, [destination]);
src/combat/cover.ts:570:export function traceCombatantLine(
src/combat/cover.ts:601:export function traceCombatantLineToCells(
src/combat/cover.ts:682:  const trace = traceCombatantLine(state, sourceId, targetId, options);
src/simulation/contracts.ts:355:export function projectOwnedSourcePath(value: unknown): ProjectOwnedSourcePath {
src/simulation/contracts.ts:378:export function projectOwnedSourceLicense(
src/backup/portable-content.ts:457:function projectPortableAggregate(
src/backup/portable-content.ts:685:function projectStoredPayloadSource(
src/backup/portable-content.ts:2085:function projectedLocalContentReferenceImportNode(
src/vtt/stored-character-party-member.ts:318:export function projectStoredCharacterPartyPackMember(
src/authoring/subclass-publisher.ts:551:function projectedSubclassIdentity(aggregate: SubclassContentAggregate) {
src/vtt/semantic-board-payload.ts:320:export function projectEngineSemanticBoard(
src/vtt/engine-state-capsule.ts:160:function projectedCreatureSpace(state: EncounterState, combatantId: CombatantId): CreatureSpace<KnownCreatureSize> {
src/vtt/engine-state-capsule.ts:671:export function projectEngineDmProjection(
src/vtt/engine-state-capsule.ts:743:export function projectEngineEncounterState(
src/vtt/engine-state-capsule.ts:816:export function projectEngineHistory(
src/vtt/monster-planning-state.ts:59:export function projectFutureMonsterTurns(
src/commands/level-feat-choice.ts:216:function projectedClasses(
src/commands/level-feat-choice.ts:257:function projectedCharacter(
src/vtt/room-generator.ts:13:  traceCombatantLine,
src/vtt/room-generator.ts:14:  traceCombatantLineToCells,
src/vtt/room-generator.ts:1222:    const trace = traceCombatantLine(state, source.profile.id, target.profile.id);
src/vtt/room-generator.ts:1235:    generatedLineIsOpen(traceCombatantLine(state, source.profile.id, target.profile.id)))) return true;
src/vtt/room-generator.ts:1244:          traceCombatantLineToCells(state, source.profile.id, [target]),
src/vtt/room-generator.ts:1265:        const trace = traceCombatantLineToCells(state, source.profile.id, [target]);
src/vtt/encounter-board-projection.ts:50:export function projectHumanEngineOptions(
src/vtt/encounter-app.ts:118:export function projectStateOnlyTopDownDmBoard(
src/vtt/encounter-app.ts:1090:function projectedAction(
src/vtt/dm-bridge/projection-transport.ts:73:function projectionHash(projection: DmBoardProjection): string {
src/vtt/encounter-projections.ts:179:export function projectStateOnlyBoard<TProjection extends StateOnlyBoardProjection>(
src/vtt/encounter-projections.ts:188:export function projectStateOnlyDmBoard(
src/vtt/encounter-projections.ts:293:function projectedRequest(
src/vtt/encounter-projections.ts:322:export function projectPlayerBoard(
src/vtt/encounter-projections.ts:399:export function projectDmBoard(input: {
src/vtt/blind-turn-context.ts:1174:export function projectEngineBlindTurn(
src/vtt/accessible-board.ts:87:function projectedHpBand(combatant: EncounterBoardCombatant): HpBand {
src/vtt/generated-encounter-fixtures.ts:871:export function projectApprovedFixtureForPlayer(
src/vtt/generated-encounter-fixtures.ts:884:export function projectApprovedFixtureForDm(
src/catalog/bundled-content-registry-v1.ts:340:function projectBundledIdentityV1(
src/vtt/encounter-board.ts:32:  derivedFogCells,
src/vtt/encounter-board.ts:33:  eligibleVisibilityObserverIds,
src/vtt/encounter-board.ts:372:export function projectEncounterTerrainCells(
src/vtt/encounter-board.ts:428:function projectedLightOverlays(state: DmEncounterState): readonly EncounterBoardLightOverlay[] {
src/vtt/encounter-board.ts:453:function projectedAreas(state: DmEncounterState): readonly EncounterBoardArea[] {
src/vtt/encounter-board.ts:517:function projectedSustainedEffects(
src/vtt/encounter-board.ts:564:function projectedLog(events: readonly EncounterEvent[]): readonly EncounterBoardLogEntry[] {
src/vtt/encounter-board.ts:608:export function projectEncounterBoard(
src/vtt/encounter-board.ts:614:  const visibilityObserverIds = eligibleVisibilityObserverIds(state, { kind: 'dm_party' });
src/vtt/encounter-board.ts:716:    foggedCells: derivedFogCells(state, visibilityObserverIds),
src/rules/class-level-features-srd.ts:311:export function projectedSubclassFeatureSource(
src/vtt/engine-initiative-intel.ts:6:export function projectEngineInitiativeIntel(
src/catalog/content-registry.ts:1247:export function projectContentGraphInDependencyOrder<T>(
src/catalog/stored-authored-content-projector-v1.ts:190:function projectionError(message: string, options?: ErrorOptions): never {
src/catalog/stored-authored-content-projector-v1.ts:279:function projectedStoredFields(
src/catalog/stored-authored-content-projector-v1.ts:667:export function projectStoredGrantRulesV1(
src/catalog/stored-authored-content-projector-v1.ts:920:export function projectStoredSourceRulesV2(
src/catalog/stored-authored-content-projector-v1.ts:1118:function projectSpecies(
src/catalog/stored-authored-content-projector-v1.ts:1171:function projectBackground(
src/catalog/stored-authored-content-projector-v1.ts:1234:function projectSubclass(
src/catalog/stored-authored-content-projector-v1.ts:1286:export function projectAuthoredContentAggregateV1<
src/catalog/stored-authored-content-projector-v1.ts:1569:export function projectStoredSpeciesContentV2(
src/catalog/stored-authored-content-projector-v1.ts:1578:export function projectSpeciesContentAggregateV2(
src/catalog/stored-authored-content-projector-v1.ts:2102:export function projectStoredAuthoredContentV1<
src/vtt/engine-query-port.ts:5:import { detectCombatant } from '../combat/visibility-field';
src/vtt/engine-query-port.ts:6:import { coverBetweenCombatants, traceCombatantLine } from '../combat/cover';
src/vtt/engine-query-port.ts:798:function projectedAttackRanges(action: MonsterAction): {
src/vtt/engine-query-port.ts:1023:        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen',
src/vtt/engine-query-port.ts:1040:        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen'
src/vtt/engine-query-port.ts:1168:    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
src/vtt/engine-query-port.ts:1228:  const detection = detectCombatant(state, actorId, targetId);
src/vtt/engine-query-port.ts:1229:  const reciprocal = detectCombatant(state, targetId, actorId);
src/vtt/engine-query-port.ts:1450:      detectCombatant(state, candidate.profile.id, actorId).kind !== 'seen'
src/vtt/engine-query-port.ts:1484:function projectedTargetConditions(
src/vtt/engine-query-port.ts:1501:function projectedMovementState(
src/vtt/engine-query-port.ts:1528:export function projectedMovementOptions(
src/vtt/engine-query-port.ts:1547:    const cover = traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: position }).tier;
src/vtt/engine-query-port.ts:1840:    const detection = detectCombatant(state, actorId, targetId);
src/vtt/engine-query-port.ts:1841:    const reciprocal = detectCombatant(state, targetId, actorId);
src/vtt/symmetric-pc-evaluator.ts:93:function projectedTarget(
src/vtt/symmetric-pc-evaluator.ts:102:function projectedConditions(target: PerceivedTargetKnowledge): readonly AppliedCondition[] {
src/vtt/handoff/scene-snapshot.ts:150:function projectedBoard(projection: DmBoardProjection | PlayerBoardProjection): EncounterBoardProjectionShape {
src/catalog/spell-content-projector-v1.ts:228:export function projectSpellContentAggregateV1(
src/catalog/spell-content-projector-v1.ts:278:export function projectSpellDocumentV1(
src/catalog/spell-content-projector-v1.ts:457:export function projectStoredSpellRowsContentV1(
src/catalog/spell-content-projector-v1.ts:547:export function projectStoredSpellContentV1(
src/vtt/replay.ts:238:function projectReplayViews(state: EncounterState): ReplayViews {
src/vtt/encounter-selectors.ts:12:export function projectedWorldObjectLabel(
src/vtt/session-timeline.ts:119:export function projectEncounterTimeline(
src/catalog/content-adoption.ts:388:function projectionFingerprintScheme(
src/catalog/content-adoption.ts:492:export function projectionFingerprintReferences(
src/catalog/content-adoption.ts:1018:function projectNode(
src/vtt/intel/actor-knowledge.ts:4:  detectCombatant,
src/vtt/intel/actor-knowledge.ts:226:export function projectActorKnowledge(
src/vtt/intel/actor-knowledge.ts:258:      const detection = detectCombatant(state, actorId, targetId);
src/vtt/intel/actor-knowledge.ts:260:        const reciprocal = detectCombatant(state, targetId, actorId);
src/vtt/party-session-state.ts:846:export function projectDmPartySession(state: PartySessionState): DmPartySessionView {
src/vtt/party-session-state.ts:850:export function projectPlayerPartySession(
src/catalog/equipment-importer.ts:381:function projectionForAggregate(
src/vtt/intent-resolver.ts:4:import { traceCombatantLine } from '../combat/cover';
src/vtt/intent-resolver.ts:279:        (constraint.source.requiresSight && traceCombatantLine(
src/catalog/source-content-projector-v1.ts:265:export function projectClassContentV1(
src/catalog/source-content-projector-v1.ts:374:export function projectFeatContentV1(
src/catalog/source-content-projector-v1.ts:913:export function projectStoredClassContentV1(
src/catalog/source-content-projector-v1.ts:927:export function projectStoredFeatContentV1(
src/catalog/stored-content-projector-v1.ts:37:export function projectStoredPortableContentV1(
src/catalog/stored-content-projector-v1.ts:72:export function projectStoredContentV1(
src/catalog/equipment-content-projector-v1.ts:171:export function projectWeaponContentV1(
src/catalog/equipment-content-projector-v1.ts:198:export function projectArmorContentV1(
src/catalog/equipment-content-projector-v1.ts:211:export function projectItemContentV1(
src/catalog/equipment-content-projector-v1.ts:244:function projectionError(message: string, options?: ErrorOptions): never {
src/catalog/equipment-content-projector-v1.ts:520:export function projectStoredEquipmentContentV1(
src/catalog/equipment-content-projector-v1.ts:524:export function projectStoredEquipmentContentV1(
src/catalog/equipment-content-projector-v1.ts:528:export function projectStoredEquipmentContentV1(
src/catalog/equipment-content-projector-v1.ts:532:export function projectStoredEquipmentContentV1(
src/catalog/stored-content-projector-v2.ts:15:export function projectStoredPortableContentV2(
src/catalog/stored-content-projector-v2.ts:30:export function projectStoredContentV2(
        minimumSpaceDistance(queryCombatantSpace(state, distanceOriginId), queryCombatantSpace(state, right.combatant.profile.id)) ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id));
  }
  return enemies[0]?.combatant.profile.id ?? null;
}

function maximumPathCost(state: EncounterState): number {
  return state.bounds.columns * state.bounds.rows * 10;
}

function path(state: EncounterState, request: EnginePathRequest): EnginePathResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  if (actor === undefined || start === undefined) return { legal: false, code: 'actor_not_placed' };
  const ordinaryBudget = state.activeCombatant === request.actorId
    ? actor.turn.movement.remaining
    : actor.profile.rules.speed;
  const availableBudget = request.maximumFeet ?? (
    request.movement === 'dash'
      ? ordinaryBudget + actor.profile.rules.speed
      : ordinaryBudget
  );
  const searchBudget = request.maximumFeet === undefined
    ? availableBudget
    : Math.min(availableBudget, maximumPathCost(state));
  const result = findPath(encounterMovementWorld(state), {
    actorId: request.actorId,
    start,
    goal: request.destination,
    maximumCost: feet(searchBudget),
  });
  if (result.kind === 'found') {
    return {
      legal: true,
      cells: result.cells,
      costFeet: result.cost,
      budgetFeet: availableBudget,
    };
  }
  if (request.maximumFeet !== undefined && request.maximumFeet < maximumPathCost(state)) {
    const unbounded = findPath(encounterMovementWorld(state), {
      actorId: request.actorId,
      start,
      goal: request.destination,
      maximumCost: feet(maximumPathCost(state)),
    });
    if (unbounded.kind === 'found') return { legal: false, code: 'insufficient_movement' };
  }
  return { legal: false, code: 'destination_unreachable' };
}

function approach(state: EncounterState, request: EngineApproachRequest): EnginePathResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  if (actor === undefined || start === undefined) return { legal: false, code: 'actor_not_placed' };
  const ordinaryBudget = state.activeCombatant === request.actorId
    ? actor.turn.movement.remaining
    : actor.profile.rules.speed;
  const availableBudget = request.maximumFeet ?? (
    request.movement === 'dash'
      ? ordinaryBudget + actor.profile.rules.speed
      : ordinaryBudget
  );
  const originDistance = minimumSpaceDistanceToCells(
    queryCombatantSpaceAt(state, request.actorId, start),
    [request.target],
  );
  const result = findPathToBest(encounterMovementWorld(state), {
    actorId: request.actorId,
    start,
    maximumCost: feet(Math.min(availableBudget, maximumPathCost(state))),
    rank: (cell) => {
      const distance = minimumSpaceDistanceToCells(
        queryCombatantSpaceAt(state, request.actorId, cell),
        [request.target],
      );
      return distance < originDistance ? [distance] : null;
    },
  });
  return result.kind === 'found'
    ? { legal: true, cells: result.cells, costFeet: result.cost, budgetFeet: availableBudget }
    : { legal: false, code: 'destination_unreachable' };
}

function reach(state: EncounterState, request: EngineReachRequest): EngineReachResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const target = state.combatants.find((candidate) => candidate.profile.id === request.targetId);
  const origin = request.origin ?? state.tokens.find(
    (token) => token.combatantId === request.actorId,
  )?.position;
  const targetPosition = state.tokens.find(
    (token) => token.combatantId === request.targetId,
  )?.position;
  const codes: Exclude<EngineReachResult, { readonly legal: true }>['codes'][number][] = [];
  if (actor?.profile.kind !== 'monster' || origin === undefined) codes.push('actor_not_placed_monster');
  if (target === undefined) codes.push('target_absent');
  else if (actor !== undefined && combatantsAreAllies(state, request.actorId, request.targetId)) {
    codes.push('target_same_side');
  }
  if (targetPosition === undefined) codes.push('target_not_placed');
  const actions = actor?.profile.kind === 'monster' ? monsterActions(state, request.actorId) : [];
  const action = actions.find((candidate) => candidate.id === request.actionId);
  if (action === undefined) codes.push('action_absent');
  const rangeFeet = action === undefined ? null : engineActionRangeFeet(actions, action);
  if (action !== undefined && rangeFeet === null) codes.push('action_range_unresolved');
  if (
    codes.length > 0 ||
    action === undefined ||
    origin === undefined ||
    targetPosition === undefined ||
    rangeFeet === null
  ) {
    return { legal: false, codes };
  }
  const actorSpace = queryCombatantSpaceAt(state, request.actorId, origin);
  const targetSpace = queryCombatantSpace(state, request.targetId);
  const distanceFeet = minimumSpaceDistance(actorSpace, targetSpace);
  if (action.kind === 'attack' || action.kind === 'saving_throw') {
    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
      sourceAnchor: origin,
    });
    if (trace.blocksSight) {
      return { legal: false, codes: ['target_outside_line_of_sight'] };
    }
    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };
  }
  if (action.kind === 'attack') {
    const verdict = tacticalRangeVerdictAtDistance(distanceFeet, monsterAttackRange(action));
    if (verdict.status === 'unresolved') {
      return { legal: false, codes: ['action_range_unresolved'] };
    }
    if (!verdict.legal || verdict.band === 'out') {
      return { legal: false, codes: ['target_out_of_range'] };
    }
    const projected = projectedAttackRanges(action);
    return {
      legal: true,
      distanceFeet,
      rangeFeet,
      rangeBand: verdict.band,
      normalRangeFeet: projected.normalRangeFeet ?? rangeFeet,
      longRangeFeet: projected.longRangeFeet,
    };
  }
  if (distanceFeet > rangeFeet) {
    return { legal: false, codes: ['target_out_of_range'] };
  }
  return {
    legal: true,
    distanceFeet,
    rangeFeet,
    rangeBand: 'normal',
    normalRangeFeet: rangeFeet,
    longRangeFeet: null,
  };
}

/** Builds the immutable attack input shared by single-attack and sequence queries. */
export function engineTacticalAttackInput(
  state: EncounterState,
  actorId: CombatantId,
  targetId: CombatantId,
  actionId: string,
  additionalModifiers: readonly TacticalAttackRollModifier[] = [],
): TacticalAttackInput | null {
  const actor = combatant(state, actorId);
  const target = combatant(state, targetId);
  const actorPosition = state.tokens.find((entry) => entry.combatantId === actorId)?.position;
  const targetPosition = state.tokens.find((entry) => entry.combatantId === targetId)?.position;
  const action = monsterActions(state, actorId).find(
    (candidate): candidate is MonsterAttackAction =>
      candidate.kind === 'attack' && candidate.id === actionId,
  );
  if (
    actor === null || target === null || actorPosition === undefined ||
    targetPosition === undefined || action === undefined
  ) return null;
  const selectedLine = minimumSpaceLine(queryCombatantSpace(state, actorId), queryCombatantSpace(state, targetId));
  const detection = detectCombatant(state, actorId, targetId);
  const reciprocal = detectCombatant(state, targetId, actorId);
  const visible = {
    visible: detection.kind === 'seen',
    reciprocal: reciprocal.kind === 'seen',
  };
  const cover = coverBetweenCombatants(state, actorId, targetId).tier;
  const coverBonus = cover === 'half' ? 2 : cover === 'three_quarters' ? 5 : 0;
  const madeRollDefense = state.effects.filter((effect): effect is PlanningRollDefenseEffect =>
    isPlanningRollDefenseEffect(effect) &&
    effect.payload.scopes.includes('attack_rolls_made') &&
    planningRollDefenseApplies(state, effect, actorId, targetId));
  const flatAttackBonus = madeRollDefense.reduce((sum, effect) =>

exec
/bin/bash -lc "rg -n \"D630|replay.*detection|detection.*replay|38\\. |39\\.7|32\\.8|41 s|41s\" /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src --glob '"'!node_modules'"' | head -300; sed -n '480,630p' src/combat/visibility.ts; sed -n '210,275p' src/vtt/replay.ts; sed -n '560,730p' src/combat/cover.ts; sed -n '1160,1285p' src/vtt/room-generator.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:11561:(vitest phase had passed exit 0 with one serial-retried flake; Playwright phase lost), probe r5 and D541 seed-2
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:13337:base context sits at 31.4-32.8 KB on every hard room, so the cap prunes
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:15253:luna - engine-top at +0.34 and sol - luna at -0.38. At three reps both
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22713:Astra r2 (medium): F1, F3, F4 CLOSED (its own probes: truesight/Devil's Sight in patchy fog seen_dim; seen_dim→seen mutant killed; 16/16 pair-vs-full-field agreement incl. a Large subject; four mutations killed incl. the new cover dedup shortcut; replay+detection 35/35 in 33.0 s on its runner). Residual F2: encounter.ts passivePerceptionAgainst's darkness/out_of_range fallback returns base passive Perception PLUS Keen Sight's +5 although the observer cannot see the target; Keen Sight is "advantage on Wisdom (Perception) checks that rely on sight" (docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23010-23011; SRD 5.2.1 eagle/hawk stat blocks) and a target in darkness for normal sight is unseen. I confirmed by reading encounter.ts:4821-4824 and the retained fixture tests/unit/vtt/detection-reactions.test.ts:125-140 (keen observer, passive 12, target in darkness, stealth 17 → expects passively_detected, i.e. 17 = 12+5): the fixture pins the wrong bonus and predates B1 (pre-B1 perceptionMode gave no penalty for darkness at all, so keen +5 applied there too). B1's explicit fallback preserved that behaviour to keep the retained test green — a correct choice under the fix-r2 brief's "do not repin", which is why the brief, not sol, owns this. Ruling: sight-only bonuses never apply to nonvisual passive awareness; darkness/out_of_range fallback = base passive Perception with no Keen Sight term (Keen Hearing/Smell would apply if modelled; they are not); heavy obscurement/blocked stay null as accepted. The retained fixture is corrected from the rule text (hand-derived: passive 12 vs stealth 17 in darkness → hidden) and a separate literal test pins visible Keen Sight +5 (bright light, passive 17 vs stealth 17 → passively_detected). Manifest +1 for this round only: tests/unit/vtt/detection-reactions.test.ts.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22716:Rounds: r1 REJECT (F1 light obscurement bypass, F2 passive-Perception regression, F3 string-only Perception test) + supervisor F4 (pairwise field cost: replay+detection 33.6 s → 68.6 s, 53 retained timeouts); r2 fix closed F1/F3/F4 (astra: probes green, 16/16 pair-vs-field agreement incl. Large, four mutations killed), residual F2 (Keen Sight in the darkness fallback, pre-existing fixture pinned it) → D626.5 manifest +1; r3 fix closed it (base passive in darkness; fixture re-derived from processHide's >=; literal visible Keen Sight +5 test). Supervisor verification on d341a9fe: tsc 0/0; five suites 77/77; timing pair 36/36 in 33.4 s; tests/unit/combat + visibility consumers 2012/2012; own mutants killed across rounds: ORDINARY_DARKNESS_MADE_INTERVENING, TRUESIGHT_DEFEATS_FOG (×2), DEVILS_SIGHT_UNBOUNDED, SIGHT_BLOCKER_BECOMES_TOTAL_COVER, SENSE_MERGE_TAKES_FIRST, INNATE_SHORTENED_BY_EFFECT, TRUESIGHT_EXEMPT_FROM_LIGHT_OBSCUREMENT, PERCEPTION_PENALIZES_SEEN, KEEN_PLUS_FIVE_IN_DARKNESS. Findings against my own work this unit: hand-picked consumer sweep missed detection-reactions (recorded); fix-r1 brief dispatched without its rules block (killed and re-dispatched). Deferred nit (astra, nonblocking): rename passive_five_shift in detection-reactions.test.ts to describe its darkness/heavy-obscurement cases — take it in the first later batch whose manifest holds that file, else at landing. Execution order continues: B3 → B4 → B5 → [VIS-FIELD-OFFERS-REBASE after offers lands] → B2 → B6.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22733:## D630 — OWNER (2026-09-15 19:27): VIS-FIELD-01 performance ceiling raised; a parallel lane brainstorms performance improvements to the tests
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22734:Owner: "Those are important things to test. Raise the ceiling and spin up a parallel lane to brainstorm performance improvements to tests". Ruling as applied: (1) the supervisor's self-imposed 15% per-batch limit is withdrawn; the cumulative ceiling at landing is 25% over main on the replay+detection timing pair (main 33.6 s → ≤42 s back-to-back on the same box) and on one full arena round; per-batch timings are still measured and reported, and an optimization pass joins the landing gate only if the cumulative number exceeds the ceiling. (2) A read-only codex lane (gpt-5.6-sol, high) brainstorms how to make the engine-heavy test suites faster without weakening them (replay, detection-reactions, arena-basis, room-generator-los-cover, d569/d583 tool suites and the general vitest configuration), reporting to .claude/consensus/vis-field/perf-tests-brainstorm-sol.md; the supervisor presents the findings to the owner before any of them becomes a unit. Timing-pair history recorded for the owner: main 33.6 s; B1 first candidate 68.6 s; B1 accepted 33.4 s; B3 candidate 38.3 s.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22736:## D626.10 — SUPERVISOR (2026-09-15 19:36): VIS-FIELD B3 r4 candidate — batch green (154/154, 5/5 supervisor mutants killed, pair 38.3 s = +14.7%, within D630) but the full tests/unit/combat + tests/unit/vtt sweep shows 7 deterministic reds in five consumer suites; dispositions
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22740:Rounds: four BLOCKED stops (manifest gap D626.7; pin ruling D626.8; my mis-stated invariant D626.9; the deleted/renamed ledger control D626.10) and one fix round. Supervisor verification on 78ee31b0: tsc 0/0; 13 suites 214/214; timing pair 38.0 s (+13% over main, D630 ceiling 42 s); known intermediate reds exactly 7 (B4: generated-encounter-fixtures 1, two-room-fixture 2, handoff-examples 1; B5/B6: semantic-board-payload 2; B5: screenshot-probe fact-class 1); five own mutants killed. Astra noted, nonblocking: projectDmView creates a new state root, so a following board projection repeats equivalent geometry under a different state identity — within the per-state bound, but a candidate for the engine-cache work the owner may schedule (D630 brainstorm rank 6). B4 manifest = plan :206 ten files + tests/unit/vtt/two-room-fixture.test.ts + tests/unit/vtt/handoff-examples.test.ts (D626.10).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22770:Owner: "Schedule the recommended test performance improvements." Binding: unit TEST-PERF-01 = brainstorm ranks 1 (D583 dependency index built once in beforeAll, one uncached discovery test kept), 2 (replay default gate built once, deep-frozen, structuredClone per test; separate cached gates for the two non-default parameter combinations; every test still replays its own candidate), 3 (D569 immutable verified-input proof prepared once; byte-mutating and hostile-access tests build a fresh proof; file split), 4 (LOS/cover: nine versioned rooms prebuilt and deep-frozen per difficulty; the two independent determinism generations kept; 96 property rows split into standard/hard/brutal files), 5 (arena execution membership split by family with shared frozen parsed initial states; byte pins and structural membership kept together), 7 (D569-v5 import-time runArena productions moved into focused files/hooks; real runArena path and all consumer assertions preserved). Invariants: no assertion, seed, pin or oracle removed or regenerated; savings MEASURED back-to-back on the same quiet box before acceptance, per suite; mutation isolation mandatory (no shared mutable bundle). NOT scheduled by this ruling (still owner decisions, D630): rank 6 engine caches keyed by structural sharing/epochs (highest correctness risk), rank 8 (depends on 6), rank 9 vitest worker topology / duration-balanced shards / experimental fsModuleCache (gate config). Sequencing: implementation AFTER VIS-FIELD-01 lands (the timing pair is its ceiling instrument and must not move under it); the PLAN is authored now in a parallel lane (sol high, worktree dnd-wt-test-perf from main, rebased at dispatch), reviewed by astra at HIGH (D627).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22787:Sequencing unchanged (D632): implementation after VIS-FIELD-01 and the offers tranche land; every baseline re-measured then under the quiet-box protocol; the D630 pair is the ceiling instrument. Implementation reviews: astra at medium.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22793:Host rebooted ~11:01; the sol fix-r1 lane (resumed 01a0a872…) died mid-suite with no exit file, its last line (02:59) still waiting on the conversation suite. Its edit was on disk: exactly the three required rejection cases (63-char lowercase hex, 65-char lowercase hex, 64-char UPPERCASE hex) added to the same title in tests/unit/tools/ai-dm-conversation.test.ts; no other file touched (status = the 12 B19 files, 268+/14−). VERIFIED MYSELF (.tmp/runs/verify-s3-b19-fix.log): mutant DECODER_ACCEPTS_ANY_HEX_LENGTH applied (tools/ai-dm-conversation.ts sha a226252402fba39c → 111d3b9d0c06bcac) → title RED at :2192 (the 63-hex case is accepted), 1 failed / 108 skipped; restored (sha a226252402fba39c); title GREEN 1/1. Full conversation suite on the loud post-reboot box (PhpStorm re-indexing, load 24): 108/109 with ONE failure, "keeps one SIMULATED session across two rooms, one correction, and a browser restore" (60 s timeout) — rerun isolated on the quiet box (load 4.5): passed in 41 s. Timeout-class load noise, not a verdict. B19-F1 CLOSED. Committed 1248d3c7 on claude/p-offer-help (12 files). Tick cron re-armed after the reboot. Dispatched: clean-tree rerun of the eight touched suites (rerun-s3-b19-clean.log) and astra review at MEDIUM (resume 01a0a5af…, brief review-impl-s3-b19-astra.md, log fanout/review-s3-b19.log) with seven checks incl. the completeness of every store site's digest source, the plan-adjustment decoder path, the D569 pin proof and the production test hook onStoredRoundProposalForTest (:883, :5969) for astra's judgement. Union / cumulative gate follows an ACCEPT.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22802:Astra r2 (medium, 1.75 M tokens cumulative on the resumed session; review-impl-s3-b19-astra-r2.md): F2 closed (array probe [false×4]; zero `.test(String(` sites); F3 closed (its r1 mutant killed at handler :1769, a correction-phase-only variant killed at :1881, the decoder-guard mutant killed at conversation :2262; expectation independent — BOUND_OFFER_ENVIRONMENT built at :55); AST inventory: every pre-existing assertion byte-identical (conversation 422→433, handler 236→242); 166 tests in its sandbox; VERDICT ACCEPT, no new findings. claude/p-offer-help = 8d5f86fa, 38 commits since the fork point 40f04e2c. main has moved 7 commits since the fork (M-2 landing 75c2f44a, art untracking 5841792e, supervision records), so a plain fast-forward is not possible: the branch must first take main (merge or rebase — see the owner question raised 2026-09-16 13:08) and the cumulative gate (tsc ×2, checker, union, D630 timing pair, one arena round, gate-wt2 browser suite) runs on that merged tip before main fast-forwards to it.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22808:Owner: "I authorize git merge." The merge ran cleanly in the offers worktree (1cacd8f0 = 8d5f86fa + main 4a99570d; 0 conflict paths; the art/requests deletions are main's D628 untracking). Merged tip vs main: 127 files, 5384+/873−. Landing gate launched on the merged tip: gate-wt2.sh wt-p-offer-help (tsc -b --force, sg scan, full vitest, Playwright chromium on the pool port, log /home/vagrant/dnd-slim-runs/gate-wt-p-offer-help.log, exit file .tmp/runs/gate-offers-land.exit). Still to run on the same tip once the vis-field seam lane frees the box: check-command-outcomes, the offer-environment architecture self-test, the D630 timing pair (main 33.6 s, ceiling 42 s) and one arena round. Landing = "Land OFFERS …" merge commit into main after every gate is read.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22829:gate-wt-p-offer-help.log GATES DONE 14:50:42. The vitest phase's 17 timeout-class reds were discarded (D617.48); the full vitest run is re-launched alone as soon as the elevation planner lane is idle (the only other load on the box); the D630 timing pair and one arena round are measured in the same quiet window. Light checks on the merged tip run now (offers-light.log). Landing = "Land OFFERS single-builder (B1–B19)" merge commit into main after the vitest rerun reads green or only-isolated-green timeouts on a demonstrably quiet box.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22835:Astra r1 (review-seam-astra-r1.md, 868 k tokens): rule fidelity probed with 16 in-memory endpoint/axis assertions (source-adjacent unit edge included, target-touching edge excluded, reverse/vertical/zero-length/diagonal handled; fractional endpoints unreachable — outerCorners only); optical-only proven (its own tier-raising mutant killed by PHYSICAL_COVER_UNCHANGED_BY_SEAM); my check (3) does NOT reproduce — source/target cells were already removed from candidates before both the optical and the total-cover checks (pre-seam cover.ts:474-477 vs :507-518), seven-assertion probe identical on both implementations; all six scene-snapshot hashes reproduced from in-memory old/new modules; R02 fixture json byte-identical (sha b679f113…); five files 226+/25−; tsc 0/0. CORRECTIONS TO MY RECORD (accepted): SEAM-F1 — D635.2 said (2,0)→(5,3) is the ONLY clear full-footprint ray; there are TWO, the other is (0,2)→(4,4), which touches fog corner (2,3) without entering a fog cell (0/16 clear from the (0,0) footprint, 2/16 from the full one; the test comment never claimed uniqueness). SEAM-F2 — D635.3/D635.4 said only concealedCells and its carriers differ; the complementary visible `cells` array differs too (that is what D626.9 already permits). A/B TIMING (ab-los-cover.log, throwaway checkout, back-to-back A1/B1/A2/B2): room-generator-los-cover 111/111 in 96.0 / 98.4 / 92.3 / 96.4 s — the seam costs ≈3–4 s on ≈94 s (+4%); the single 5 s-budget test sits at 4.76 s (old) vs 4.98 s (seam) isolated in astra's run and 5.18 s in mine under load: a pre-existing narrow margin (decisions.md:20827, 21339), not a seam regression; within D630. claude/vis-field = 9a3235da. B4 r2 RULING: manifest = the 12 (plan :206 + D626.10) + tests/unit/vtt/regret.test.ts + tests/unit/vtt/scene-snapshot.test.ts (D635.3) + the tracked generated fixtures fixtures/scenes/two-room.v1.json, fixtures/scenes/two-room.snapshots.v1.json (if present) and fixtures/protocol/examples.v1.json — 17 files, over the plan's ten because every excess file is a test or a generated fixture forced by rulings; the tracked bytes are regenerated by the real generator (tools/vtt-handoff/generate-fixtures.ts) under D569 demonstrate-then-normalize: the old bytes must reproduce from the pre-B4 producers first, the field-level diff must be limited to the removed foggedCells and the derived visibility/concealment fields, and the two-room protocol example's player snapshots must match a HAND derivation under D635 (adventurer (2,4) and goblin (8,4): every ray crosses column 5; the row-line-4 ray between wall (5,3) and door (5,4) and the row-line-5 ray between door (5,4) and wall (5,5) are two-blocker seams — the pair is NOT mutually visible; state every ray). Dispatch after the offers vitest rerun (quiet box) — the brief is written now.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22838:FINDING AGAINST MYSELF: I copied and hashed plan r2 (1859 lines, a72bcd25…) and dispatched astra on it as soon as the "PLAN R2 DONE" marker appeared in the lane log, before the lane's exit file existed; the planner was still in its "closing audit" replacing PLAN-* anchors with final line numbers, so astra reviewed a moving file and reports the final artifact as 1903 lines, sha ecc863dd1c439ad7e4f267a0e26cb8f84bea4324eb9c7e45ab9298ed0d88ab5e (verified now: 1903 lines, ecc863dd1c439ad7e4f267a0e26cb8f84bea4324eb9c7e45ab9298ed0d88ab5e). The rule already in memory — harvest on the exit file, never on the marker — was not applied. No verdict is affected (astra re-hashed and reviewed the final file), but the r2 record's sha was wrong; the main-repo copy is now the final one (archived as .r2). ASTRA r2 (review-plan-r2-astra.md): #1 P1 traversal contract misses its producer (standard-offer-generator.ts) and executor (engine-round-session.ts:256-268 executes mechanics.path through a cell-only move command) and option-modeling.ts — its declaration probe: 56 app / 207 node diagnostics; #2 P1 Batch 6A's distance policy needs vertical endpoints that creature-space.ts cannot supply (no height/altitude in CreatureSpace — VERIFIED by me at :100-110) and the producer (combat-rules.ts:77-102) is first owned in B7; consumer inventory incomplete (27 modules — VERIFIED: world-object-actions.ts:51 and regret/legal-actions.ts:107 unowned); #3 P1 the second D630 instrument's test title exists in none of the three trees (VERIFIED: only in the plan), so no base measurement is possible with it; #4 P1 Q1 options A/B have no outcome for ZERO legal uniform-support landings and A's pending-state UI is unowned; #5 P1 the D569 primer (decisions.md:13396: the DM board screenshot with its primer) was bound to the PLAYER board's elevation words, so Q3-B/C would suppress guidance for facts the DM screenshot shows — VERIFIED against my own earlier read of 13394-13409. P2: overlay script exit status claim; two batch-name typos; proposal-digest invariance vs traversal identity wording. Closed r1 items stand (#1 four-field overlay: 42 paths owned, 21 batches, 146 paths, max 10; #5 arithmetic recomputed; #7; #9; #10; #11; #14). ALL ACCEPTED. Round 3 of 3 to sol (resumed); the owner question Q1 gains the zero-candidate case (put to the owner in the same message as the r2 result).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22841:Gate on the merged tip 1cacd8f0 (all run by me): tsc -b --force 0; sg 0; Playwright chromium 187 passed (1.0 h, gate-wt-p-offer-help.log); check-command-outcomes 0; architecture self-test 0; architecture 0 (offers-light.log); full vitest 637/643 files, 11462/11479 tests, 17 failures ALL timeout-class (16 at 5 s, one at 60 s) under load 4+ from astra's r2 overlay probes (gate-offers-vitest-full.log); the six failed files rerun ONE AT A TIME (gate-offers-isolated.log): ai-dm-arena-interleave 2/2, ai-dm-arena 58/58, ai-dm-board-delivery 17/17, d583-contract-inventory 17/17, experiment-orchestrator 52/52, room-generator-los-cover 111/111 — 257/257; D630 timing pair 35/35 in 32.8 s (main 33.6 s, ceiling 42 s); one arena round 39.7 s (main baseline being measured now for the record: arena-main-baseline.log). The vitest-phase caveat stands as recorded: no quiet-box full run was achievable while lanes ran; every red was a timeout and every file is green alone, the same evidence standard every offers batch met. Owner authorization for the merge: "I authorize git merge" (13:3x). The offers unit is CLOSED; next on that seam: OFFER-ENV-HELP-01 (frozen 6af2b77f + F14) after VIS-FIELD lands, and VIS-FIELD-OFFERS-REBASE (the VIS plan's "rebase" step before B2).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22861:Astra r3 (review-plan-r3-astra.md, 467 k tokens): every r2 finding closed (traversal chain owned; distance endpoints introduced in B6A0 before consumers; the D630 harness is the existing arena test at main ai-dm-arena.test.ts:1709-1755 with per_combatant / initiative_segments_v1 / derived_v1 reaching real reducer transactions; Q1 bounded with empty-set outcomes; D569 primer bound to the DM screenshot; three P2s closed) — two P1s remain, both manifest closure: (1) the traversal overlay union is 90 paths across the three trees, not 89 — claude/p-offer-help:tests/unit/vtt/offer-environment-board-sequence.test.ts:33 reads resolution.mechanics.path and is unowned, so B7A9 cannot end green on the landed base; fix = add it to B7A9 (four files today) and migrate its movement assertion keeping the environment-digest controls; (2) three existing test consumers pass raw CreatureSpace to the distance functions and are outside the distance tranche — tests/unit/combat/creature-space.test.ts:182-215, tests/unit/vtt/footprint-increment-four.test.ts:390(392 on OFFERS), tests/unit/vtt/challenge-room-fixtures.test.ts:294(308) — 8 TS2345 diagnostics; fix = own them inside B6A0–B6A3 with a split to keep ten files. Astra also states a lane cannot execute B0→B5C from this text alone because B1 waits on Q1 (and Q2 shapes B1's model, Q3 shapes B4's assertions) — which is by design: those are owner questions. RULING: the three-round cap is reached; the plan is NOT frozen. It is HELD at sha 7c2cc7ce… pending the owner's answers to Q1 (forced landing: A bounded DM selection with off-board unresolved on an empty set, or B bounded deterministic nearest with removal on an empty set; displacement bound min(fall distance, 30 ft)), Q2 (water: A deep/mandatory swim, B shallow/selectable, C authored shallow|deep — recommended C) and Q3 (player-visible elevation facts: A board labels — recommended, B tier cues only, C none). The answers produce one bounded revision round (r4: incorporate the answers + astra's two manifest fixes, nothing else) and one astra confirmation; implementation remains sequenced after VIS-FIELD-01 lands. Questions go to the owner one at a time; Q1 (amended with the empty-set outcomes) is being asked now.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22870:Sol r6 (impl-b4-sol.md, 467 k tokens across six rounds — four correct stops on my rulings, one investigation): 17 files 267+/4868−; base 75c2f44a reproduces the three tracked fixtures (generator --check 0); regenerated hashes 26e0ddf5… / 76f102c4… / 70cb1ece…; sol's path checker: source 1, snapshot 8, protocol 45 paths, unexpected none; closed-door seat oracle pinned with the 16 rays enumerated (A 48 visible / [adventurer]; B 56 / [goblin]); open-door pin via A's (4,4)→(8,4) row-4 ray (wall (5,3) one flank, open doorway the other); revision-body diff exactly {encounterState.foggedCells, branchRngStateFingerprint}, fingerprint recomputed equal; RED-first 2 failed / 2 passed / 48 skipped; three plan mutants killed with sha-restored files; sol: 124/124 + 276/276, pair 37.96→39.24 s. VERIFIED BY ME (verify-b4.log, dirty tree before commit): tsc app/node 0/0; generator --check 0; 0 forbidden additions; 0 long lines; my REFERENCE_DARK_CELL_REVEALED and VANE_DIM_TREATED_UNSEEN both RED then restored (sha 3d867ad5…, 5b55684b…); 20 suites 399/400 — the one red is room-generator-los-cover's 5.004 s timeout (the known narrow margin, D635.5; isolated rerun on the clean checkout at 2e360685 in progress, rerun-b4-los.log); deferred reds exactly semantic-board-payload ×2 + screenshot-probe fact-class (B5/B6) plus the screenshot D524 5.6 s timeout that sol reproduced at clean 9a3235da (5.38 s); timing pair 36/36 in 41 s wall on a box at load ~1 (ceiling 42 s; main 33.6 s; B4 touches no engine cost path — the drift since the seam's 40 s is load; to be remeasured quiet before landing). My own JSON field diff HEAD→B4: two-room.v1.json foggedCells only; the other two files differ only under players / events / exchanges (coarse list compare; astra reproduces the path-level claim). handoff-examples diff read by me: the event partition (before open / at open / after close) and the ray reasoning are sound; the writeFileSync I flagged in the lane log is pre-existing temp-copy code, not a write to the tracked file. Committed 2e360685 (all 17 files). Astra (resume 01a0a642…, medium; brief review-impl-b4-astra.md; log review-b4-astra-r1.log) on ../dnd-wt-seam-verify moved to 2e360685. Next after ACCEPT: B5 (plan :216-227), then the rebase step (main now carries OFFERS 9f148666), then B2, B6.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22891:Astra r1 (review-impl-b5-astra-r1.md): 13 files 86+/41−, zero src changes; the screenshot test's only changes are the fog input and the fact-class oracle, D524 bytes identical; DmView substitutions byte-identical downstream; its own overlay: app 10 / node 13 diagnostics, 0 outside B2/B6; FOG_STILL_AUTHORED killed by both titles; the D359 ledger control still discriminating (its own leak mutant red at visibility.test.ts:562); fact-class oracle recomputed independently (22 visible / 2 concealed); semantic 6/8 exactly the two B6 titles; tsc 0/0; pair 39.3 s. B5-F1 (P3, nonblocking, ACCEPTED AS A NOTE): BLIND_BOARD_CHECK_USES_DM_PROJECTION is a source-text proxy — it rejects harmless renames and accepted a `true ||` short-circuit; astra recommends a TypeScript-AST check plus a small behavioural test; carried to B6 (which owns the semantic/blind boundary tests) or a post-landing nit, not a B5 blocker (the named mutant dies and the compile boundary is proven by the overlay). VIS-FIELD branch = 436702cf: B1, B3, SEAM, B4, B5 accepted. NEXT (plan order): the rebase step — merge main 9f148666 (OFFERS landed) into claude/vis-field, then verify tsc ×2 + the retained set + the timing pair on the merged tip (D630 ceiling applies against the post-OFFERS main pair, to be measured), then B2 (:180-190, "post-offers consolidation and final runtime-field removal"), then B6.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22894:Merge: one textual conflict, tests/unit/vtt/challenge-room-fixtures.test.ts imports — HEAD (B5) added projectEncounterBoard + canonicalEngineQueryPort imports, main (OFFERS) had removed the canonicalEngineQueryPort import; resolved by me to keep projectEncounterBoard only (0 remaining uses of the removed symbol, 3 of the kept one). tsc app 0 on the merged tree; tsc node RED: tests/unit/vtt/dm-tactical-intel.test.ts(74,51) — the SEAM fix r1 re-authored the R02 test to call createEngineMcpRuntime(state, { toolProfile: 'dm' }) directly, and OFFERS now requires offerEnvironment there. Committed the merge with that red named in the message (a merge commit, not a gate; the reconciliation is its own commit). Lane REBASE-FIX dispatched (fresh sol; brief impl-vis-field-rebase-fix.md; log impl-rebase-fix.log; allowed = only files with a proven diagnostic/red; VIS retained set + the OFFERS board/visibility suites + the OFFERS architecture checks + the timing pair vs the post-OFFERS main 32.8 s). My one-line conflict resolution is part of the merge commit and will be in astra's review of the reconciliation. FINDING AGAINST MY RECORDS (second time today): the D635.16 entry was appended through an unquoted heredoc and the shell swallowed a backticked phrase (astra's `true ||` example); repaired in place. The fix is mechanical and I keep failing it: every decisions/loop-log append from now on uses a quoted delimiter and pre-expanded variables.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22902:Sol (impl-rebase-fix-sol.md, 222 k tokens): two test files, 50+/9-, no production change; tsc 0/0; offer-environment self-test 0 (77 fixtures); check-command-outcomes 0; 37 suites 836/836 single-worker; pair 39.3 s (19.7% over the landed main 32.8 s). VERIFIED BY ME: (1) the brutal-fixture geometry pin (ai-dm-conversation.test.ts ~:2757, seed-6203001, column-9 wall in rows 0-5 and 7-16 with the gap at row 6, Large actor at (16,3)) — my trace on the seam tree reproduces the new expectation [T,T,T,T] / [T,T,T,T] / [T,T,T,F]: the two rays that were "open" to the fighter ran along row line 3, the edge shared by wall cells (9,2) and (9,3); to the cleric along row line 5 between (9,4) and (9,5) — two-blocker seams, blocked by D635, legitimate; the wizard keeps (18,5)->(2,7). BUT sol's comment says the rule closes "the one-sided row-6 edge beside the authored gap" — FALSE: no one-sided edge is closed and none of the traced rays runs along the gap's edges; the comment contradicts the owner's rule and must be rewritten with the two real seams named. (2) Raw failures at the merge tip 1d58ef72 (my runs on the detached checkout, rebase-raw.log / rebase-raw2.log): "uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit" (objectContaining mismatch), "records typed fallbackReason for 'blocked auto-submit' from the stub adapter" (null vs 'auto_submit_blocked'), the geometry test; the three-room brutal smoke red is sol's claim (not in my filtered runs). (3) Sol's fixes for the control-flow tests are OPAQUE: reauthoredClearControlFlowSight relocates EVERY blocked cell of the loaded fixture into the bottom rows, and reauthoredDurableControlFlowRoster gives every combatant full HP plus 1000 temporary HP for the smoke — neither states what the seam changed (which sightline closed, which option or frontier resolved, which death or ending moved the row count) nor why the intended precondition needs that much fixture surgery. That is fixture surgery to keep an assertion, not a hand-derived re-authoring. RULING: fix r2 (resumed lane): rewrite the geometry comment; for each of the three control-flow tests state the MECHANISM with evidence (what changed under the seam, from a run on 1d58ef72), then use the MINIMAL fixture change that restores the test's intended precondition (e.g. one blocker moved or one seam opened, or a single combatant's HP), each with a comment naming the cause; the whole-board relocation and the 1000-temp-HP prop are replaced unless shown minimal; no assertion weakened; rerun those four titles and the conversation file. Astra then reviews the merge commit's resolution plus the reconciliation as one diff.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22905:Sol r2 (impl-rebase-fix-r2-sol.md, 354 k tokens): instrumented a /tmp copy of the raw merge tip and found the mechanism of every red — the seam rule (D635) now refuses attacks whose only clear ray ran along a two-blocker edge: hard seed-5117009: monster-2's Spear after moving to (13,1) at the row-line-2 seam (10,1)/(10,2) and monster-5's Longbow at the row-line-6 seam (10,5)/(10,6) (both control-flow tests aborted the transaction before the typed block / fallbackReason could be recorded); brutal smoke: six total-cover refusals — seed-6203002 Radiant Flame ×3 at (8,4)/(8,5); seed-6203003 Shortbow at (6,6)/(6,7) once and (6,2)/(6,3) twice — no death and no row loss (the earlier 1000-temp-HP prop was addressing nothing). Fixes now minimal and named: (10,1)→(9,1) and (10,5)→(9,5); remove (8,4); remove (6,6) and (6,2); comments state the cause; the geometry comment names the fighter's row-line-3 seam (9,2)/(9,3), the cleric's row-line-5 seam (9,4)/(9,5) and why the wizard's (18,5)->(2,7) ray stays clear. Sol: four titles 4/4, whole conversation file 110/110 (600 s), tsc node 0. VERIFIED BY ME (verify-rebase.log, dirty tree): every named blocker pair exists in the fixture json (hard: (10,1),(10,2),(10,5),(10,6) present, (9,1),(9,5) absent; 6203002: (8,4),(8,5); 6203003: (6,6),(6,7),(6,2),(6,3)); no src/ or tools/ file changed; tsc app/node 0; 0 forbidden, 0 long lines; the four conversation titles + dm-tactical-intel 5/5 in 160 s; offer-environment self-test 0 and check-command-outcomes 0 on the merged tip; timing pair 36/36 in 39 s wall (landed main 32.8 s; ceiling ≈41 s). Committed 658e2a23 (2 files, 72+/9−). vis-field = 436702cf → merge 1d58ef72 → 658e2a23. Astra (resume 01a0a642…, medium; brief review-rebase-astra.md; log review-rebase-astra-r1.log) reviews the merge's conflict resolution (mine) and the reconciliation together. GAME FACT for the owner: D635 closes real shooting lanes in the shipped arena fixtures; monsters that fired along a wall's edge now need a clear cell. Next after ACCEPT: B2 (:180-190), then B6, then the VIS-FIELD landing gate.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22940:Astra r2 (review-impl-b2-astra-r2.md): 3 files 37+/4−; exactly three maxItems 5→6 changes, in-memory generation byte-identical; the six-kind literal asserts zero diagnostics and exact imported + runtime senses; its own .max(6)→.max(5) mutant red at :174; unknown-sense rejection and the byte-for-value pin unchanged; tsc 0/0; content-pack 27/27. vis-field = 4c6a3315: B1, B3, SEAM, B4, B5, REBASE (main 9f148666), B2, B2-F1. B6 dispatched (fresh sol; brief impl-vis-field-b6.md; log impl-b6.log; 10-file manifest per plan :230 with the turn-context schema by generator only; owns the two known reds — the semantic partition and the OFFERS truncation calibration, re-derived by hand from class sizes against the 8,192 cap; six plan mutants; the D569 E1C/FOOTPRINTS demonstration with its hard stops; the §8 checkpoint re-verification by symbols; the final aggregate of every B1–B6 suite and `npx tsc -b --force`). After B6 and astra: the VIS-FIELD landing gate on the branch merged with main (gate-wt2 + the OFFERS checks + the D630 pair and arena round), then "Land VIS-FIELD-01" on main, mirror push (D640), then ELEVATION-02 B0.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22946:Sol (impl-b6-sol.md, 381 k tokens): v2 visibility block (observers + subjects transposes, strict schemas, generator-only JSON schema), player output omits it (with a forbidden-field control), serializer sentinel seam, effect obscurement union, Invisible subject keeps visible_from, truncation ordered light → adjacency → objects → visibility with the 8,192-byte calibration re-derived by hand (16,120 → 15,167 → 13,168 → 12,259 → 5,492 bytes), truncation recorded, the final single-owner stage, source-binding witnesses (standard-case string leaves 493 → 550, paths 131 → 143, explained), the semantic partition pin hand-derived [[4,0],[3,1]]; six plan mutants killed with sha-restored files; semantic 11/11, engine-mcp-handler 131/131, source-binding 6/6, support 227/227; tsc 0/0; OFFERS checks 0/0; D569 E1C/FOOTPRINTS unchanged; pair 38.85 → 38.72 s; 36 compiled foggedCells references, none a runtime state consumer; the final aggregate of all 30 plan-named suites 759/760 in 1,172 s — the sole red tests/unit/tools/ai-dm-screenshot-probe.test.ts:464 "is versioned, uses generic classic-board conventions, and leaks no non-rendered probe identity" at 5.33 s (isolated 5.18 / 5.28 s) against its D524 5 s budget; sol stopped rather than raise a timeout (correct). ALSO CHANGED BY SOL (flagged): the blind semantic cap SEMANTIC_BOARD_MAX_BYTES (or its blind-context counterpart) raised 8,192 → 32,768 because the retained hard fixtures' semantic boards now measure 13,406–17,597 bytes with the visibility block; that is a blind-DM context-size decision the plan left open ("cap is explicit") — astra reviews it; the owner is told. A/B BY ME (ab-probe.log, isolated, alternating, load ≈1): main 9f148666 passes at 4,205 / 4,210 ms; vis-field (B6 dirty) fails at 5,243 / 5,094 / 5,246 ms — +21–25% on this single test, the derived-visibility cost of the primer's board projections, at the edge of D630's 25% and over a fixed 5 s budget. RULING: a NAMED re-budget for this one test — timeout 5,000 → 10,000 ms — recorded here with the numbers as the justification (the plan's "raise timeouts only for D544-named flaky tests" is a lane rule; this is not flakiness but a measured cost of the plan's own behaviour, and the supervisor may name it); manifest +1 for that timeout line only (12 files); the cost itself is queued for TEST-PERF-01 / the owner's engine-cache decision (D630 brainstorm rank 6) with sol's mechanism note (how many projections the primer render computes derived fog for). r3 on the resumed session: apply the re-budget, state the mechanism, justify the cap change with per-fixture bytes and what the 8,192 cap would have dropped, then the forced build and the second aggregate.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22949:Sol r3 (impl-b6-sol.md): re-budget applied exactly as ruled; mechanism traced (44 fact sheets → 88 projection calls → 73 fresh derived-fog evaluations, because each encounter-board clone is a distinct state root — ai-dm-screenshot-probe.ts:829, visibility.ts:524, encounter-board.ts:716, visibility-field.ts:550); cap justified per fixture (with/without visibility bytes and the classes the 8,192 cap would drop from each: all four; 16,384 rejects 5117001/5117002/5117007; 32,768 = half the 65,536 blind base cap); D569 blind fixtures unchanged (10 files, inventory sha 3cb2a649…); E1C/FOOTPRINTS unchanged checks 2/2; six mutants killed; tsc 0/0; tsc -b --force 0; OFFERS checks 0/0; pair 38.7 s; second final aggregate of all 30 plan suites 760/760 in 1,171 s. VERIFIED BY ME (verify-b6.log; dirty tree 11 files 516+/32−): tsc app/node 0; tsc -b --force 0; both OFFERS checks 0; 0 forbidden, 0 long lines; schema generator idempotent (a08a7359… → a08a7359…); tests/fixtures diff empty; MY MUTANT PLAYER_OUTPUT_KEEPS_VISIBILITY (the audience === 'dm' guard dropped at semantic-board-payload.ts:601) → the sentinel/player-omission test RED, restored 77cfdb2d…; 11 B6 suites 328/328 (semantic, blind-turn-context, source-binding, engine-mcp-handler, board-delivery, visibility-field, screenshot-probe, engine-mcp-server, engine-mcp-boundary, stable-dom-render, accessible-board); pair 36/36 in 39 s. Committed 10cc9f5e. vis-field = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6 — every batch of the frozen plan. Astra (resume 01a0a642…, medium; brief review-impl-b6-astra.md; log review-b6-astra-r1.log) reviews the last batch and is asked to state whether the 32,768-byte blind semantic cap is within B6's authority or a product decision; the owner has been told and can rule before landing. Next after ACCEPT: the VIS-FIELD LANDING GATE — merge main into the branch (main has not moved since the rebase: 9f148666), gate-wt2 (tsc -b, sg, full vitest, Playwright), OFFERS checks, D630 pair and one arena round on the merged tip, then "Land VIS-FIELD-01" on main and the mirror push (D640); then ELEVATION-02 B0.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22952:Astra r1 (review-impl-b6-astra-r1.md, 1.72 M tokens): 11 files 516+/32−; schema regenerated in memory byte-identical (159,453 bytes); the strict v2 objects reject unknown keys (schemas.ts:671-683) with the blind validator mirroring them; no DM-semantic-to-player delivery path (projectPlayerBoard builds from PlayerView; serialization requires the DM audience at :601; turn-context delivery rejects player projections at :673; MCP attachment paths DM-only at engine-server.ts:1568-1579); one sight service (visibilityField / cellsThatCanSee at :334/:344; the serializer consumes supplied rows at :604-612); the truncation calibration reproduced exactly (16,120 → 15,167 → 13,168 → 12,259 → 5,492); the semantic partition oracle re-enumerated by rational arithmetic (18 visible, only [(4,0),(3,1)] concealed); the effect-line and Invisible-subject oracles confirmed; the source-binding counts recounted (57 = 3 + 6×5 + 6×4; 12 paths) and all three mutations rejected; the 10 D569 fixtures and the 31,995 / 32,000-byte raw-context pins byte-identical; three own mutants killed; tsc 0/0; pair 39.2 s. Its noted limits: the final single-owner test is a lexical check (no alias bypass found); its sandbox could not execute the D569 pins (sol 2/2 and my board-delivery 17/17 stand as the evidence). BLIND CAP: astra judges 32,768 bytes within B6's explicitly open cap choice, with the owner notification retained; two corrections to sol's account, accepted: blind delivery REJECTS an oversized protected semantic block rather than truncating it (blind-turn-context.ts:1304-1316) — so under the old 8,192 cap every retained hard fixture's blind context would have been refused outright, not thinned — and the semantic allowance is ADDITIONAL to the 65,536-byte base allowance, not within it. The owner may still rule the cap smaller before the landing merge; absent a ruling it lands at 32,768. VIS-FIELD-01 = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6. LANDING GATE launched now (gate-vis-field-land.log): gate-wt2 wt-vis-field (tsc -b --force, sg, full vitest, Playwright chromium) + the two OFFERS checks + the D630 pair twice + one arena round; main 9f148666 is already an ancestor, so the landing is a "Land VIS-FIELD-01" no-ff merge once the gate reads green (timeouts, if any, rerun isolated per the offers precedent D617.50); then the mirror push (D640); then ELEVATION-02 B0 on a fresh worktree from the landed main.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22958:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22960:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22975:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22990:GATE r2: gate-vis-field-land.sh on the clean worktree at 9a220fce (log gate-vis-field-land-r2.log; ~1.5 h; machine otherwise idle). Expected: tsc 0, sg 0, Playwright 187/187 (the two browser reds fixed), vitest red EXACTLY brutal-b 10 + D569 6, OFFERS 0/0, pair ≤41 s. Anything else red is a new finding. Landing merge waits for the gate AND the owner's question 5.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:23037:DISPATCHED (read-only investigation, fresh sol high, brief .tmp/runs/test-perf/investigate-vis-field-slowdown.md, log investigate-slowdown.log): profile vane-tpk (3077 → 6585 ms), the los-cover productive-option test and the D630 pair on the branch vs main; top-3 hot paths with bounded fix proposals and the invariants/witnesses each must keep; flag any correctness smell (field computed for ineligible observers, traces for unreachable targets). Feeds TEST-PERF-01; no code changes.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/simulation/page-layout-gutter-and-footer-near-misses.test.ts:384:      'Expected 339 SRD spell descriptions on pages 107-175; read 338. ' +
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/test-perf/review-plan-r1-astra.md:7:HEAD is `4a99570ddcda1d8e9d08dacb7264cb88d262f8c7`; working tree remained clean. I read D630, D632, the authoring brief, and the brainstorm. No files were edited or mutants installed; counterexamples below are source-derived.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/test-perf/review-plan-r1-astra.md:128:The post-VIS sequencing and unchanged detection suite are correct. Replay’s clone-per-consumer design, fresh default-generation comparison, and retained replay assertions are reasonable controls. Arena’s JSON-parsed templates and cloned execution inputs also have a sound isolation basis. Those strengths do not close the inventory, proof-binding, lifecycle, and acceptance gaps above.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/review-plan-r3-astra.md:37:| **#3 D630 harness** | **Closed at specification/source level.** Plan **1844–1878** uses the existing test at main-worktree `ai-dm-arena.test.ts:1709–1755`, OFFERS **1780–1826**. It selects `per_combatant`, `initiative_segments_v1`, and `derived_v1`. Execution reaches `tools/ai-dm-conversation.ts:6518–6578` and real reducer transactions at `engine-round-session.ts:554–566,612`. Candidate-only elevation assertions are separate. Runtime attempt failed during collection; details below. |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-rebase-astra-r1.md:49:| Programmatic Vitest: replay, detection-reactions, dm-tactical-intel | **42/42 passed** |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-rebase-astra-r1.md:53:| Timing pair alone, single worker | **36/36 passed**, **38.952 s wall**, **18.8%** above 32.8 s; below **41 s** |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/d569-patch/impl-reconcile-lane.md:71:  — 16/17 files passed, 441/442 tests passed. Sole failure was the known 5-second load wall in `engine-mcp-server` at 6.741 seconds.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/review-plan-r1-astra.md:65:8. **P1 — The D630 arena instrument does not measure the required combat round.**  
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/review-plan-r1-astra.md:129:- **VIS’s 145/147 probe:** those semantic-board reds are already within VIS B5/B6 ownership, especially frozen VIS plan:218–238. They are a valid requirement for the eventual landed base to be green, not a new ELEVATION remediation task or an unowned planning blocker.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/plan-r3-sol.md:24:+The proposed second D630 instrument was also proven to exist and complete real
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/plan-r3-sol.md:43: | VIS `5492f782` | 47 / 19 / 16.62 s | 80 / 42 / 32.41 s |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:16:TASK: Review `git diff 10cc9f5e ebfcacaa` (6 files, 325+/22−: src/vtt/engine-query-port.ts, src/vtt/room-generator.ts, tests/unit/vtt/{engine-query-port,room-generator-los-cover,arena-basis-brutal-b,tactical-evaluator-r02}.test.ts) = LAND-01, the landing-reconciliation batch for the two VIS-FIELD defects the full-suite landing gate exposed (D635.36): (c1) the query port offered attacks/saves whose corner trace blocks sight (tier-only check) while execution refuses them — an offers-boundary violation; (c2) the generator's open-ray predicate ignored blocksSight; plus the brutal-b helper's missing activation choice, and six tactical-evaluator kill-probability pins that scored shots from origins the reducer would refuse. Supervisor verification (verify-land-01.log): tsc 0/0; OFFERS checks 0/0; my mutants (sight check disabled → both query witnesses red incl. the 214-offer agreement property; generator predicate relaxed → its witness red); 16 suites 299/299 (query port, r02, dm-tactical-intel, challenge-room, the OFFERS set, replay, detection); los-cover 112/112; exactly the 16 expected reds remain (ten brutal-b productivity pins + six D569 manifest — the frozen-family consequence awaiting the owner, D635.36); pair 38 s.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:18:CHECK (each with commands and numbers): (1) c1: the refusal at engine-query-port.ts:~1171 uses the SAME trace inputs as execution (encounter.ts:~7183: actor, target, sourceAnchor = the proposed origin) — could the two still disagree (a different anchor, footprint, exclusion set, or a path where execution traces after a move the query did not model)? Enumerate every production site that decides attack/save targetability and confirm each is now sight-aware or is not an authorization gate (sol left :1234/:1547 tactical-scoring and :1830 cover reporting alone — agree or not). (2) The AGREEMENT PROPERTY ("offered attacks and saves in every frozen landing family pass the reducer LOS rule"): read it — is executing each offer through reduceEncounter at the resolved finalPosition a faithful model of real execution (initiative/active-combatant setup, the () => 0.5 roll, multiattack components, bonus-action slot)? 214 offers checked — recount from the three families; a property that silently skips options is a P1. (3) c2: generatedLineIsOpen = tier 'none' && !blocksSight at both call sites; the witness's geometry (14,6)→(1,6) along row line 6 between (8,5)/(8,6) — verify; sol's in-memory regeneration of 42 seeds byte-equal — reproduce for at least the ten brutal-b seeds (so the frozen families are NOT cured by the fix; relevant to the owner's question). (4) The six R02 pins: recompute at least two allocations independently (no-bless 2702281/6250000 and one Bless variant; Bless enumerated over the d4 faces; the death-save fold in initiative order per tactical-evaluator.ts:786-814) and confirm the two unchanged controls are byte-identical to 10cc9f5e. (5) The brutal-b helper: materializing the first declared legal activation choice keeps the engine-ranked option — confirm it does not mask a resolver defect and that dispel-evil-and-good's choice contract is what the helper reads. (6) No fixture changed; the remaining reds are exactly the frozen-family ones; tsc 0/0; suites you can run; pair (ceiling ≈41 s).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:30:22960:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:771:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:773:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:788:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:3585:const files=[\"tests/unit/vtt/replay.test.ts\",\"tests/unit/vtt/detection-reactions.test.ts\"];const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:undefined},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});await ctx?.close();
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:3639:   Duration  39.41s (transform 1.20s, setup 0ms, import 2.77s, tests 36.56s, environment 0ms)
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:3783:| Replay + detection | **36/36 passed, 39.41 seconds** |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:3785:Exactly the expected **16 retained reds** remain. Timing is below approximately 41 seconds.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:3898:| Replay + detection | **36/36 passed, 39.41 seconds** |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-01-astra-r1.md:3900:Exactly the expected **16 retained reds** remain. Timing is below approximately 41 seconds.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/plan-r2-sol.md:121:+| VIS `5492f782` | 47 / 19 / 16.62 s | 80 / 42 / 32.41 s |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/loop-log.md:19:## 2026-09-16 18:15 — OWNER answered Q2 = C (authored shallow | deep). D638. Q3 next.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offer-env-help/review-plan-r1-astra.md:333:**Fix:** Retain the existing regression test, but add a measured model-free arena round that actually offers and evaluates Help. Compare identical fixed encounter/RNG inputs under incumbent-disabled and candidate-enabled environments, and assert that the expensive path executed. Record raw walls and apply the stated 25% budget. The replay/detection pair remains useful for general regression coverage.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/elevation-02/review-plan-r2-astra.md:29:   **Sources:** D630, `decisions.md:22733–22734`; current arena configuration at `tests/unit/tools/ai-dm-arena.test.ts:1258,1448–1460`.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r2-sol.md:120:npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r2-sol.md:130:npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r2-sol.md:163:replay.test.ts + detection-reactions.test.ts    35/35
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r2-sol.md:880:npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r2-sol.md:890:npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r2-sol.md:923:replay.test.ts + detection-reactions.test.ts    35/35
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-rebase-fix-sol.md:74:D630 timing command:
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-rebase-fix-sol.md:77:npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-rebase-fix-sol.md:80:Result: 2/2 files, 36/36 tests, Vitest duration 38.81 s, measured wall time 39.271 s. That is 19.7% above the 32.8 s landed-main measurement and below the ≈41 s ceiling. No tuning performed.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/heldout-rem/impl-runtime-guard-lane.md:75:38. `keeps a leading ** Vite glob candidate-rooted even when base is present`
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-02-sol.md:27:## D626.10 — SUPERVISOR (2026-09-15 19:36): VIS-FIELD B3 r4 candidate — batch green (154/154, 5/5 supervisor mutants killed, pair 38.3 s = +14.7%, within D630) but the full tests/unit/combat + tests/unit/vtt sweep shows 7 deterministic reds in five consumer suites; dispositions
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-02-sol.md:32:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-02-sol.md:34:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-02-sol.md:35:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-b6-astra-r1.md:70:- Replay + detection: **36/36**, **39.16 seconds**, below approximately 41 seconds.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/handover/lane-state.md:1242: - BHC (f9d5af3, 41st): bundled-homebrew catalog + click-to-import
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b4-blocked-sol.md:39:- Pre-change performance: replay+detection `36/36`, Vitest `37.53s`, wall `37.96s`, within D630.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b4-blocked-sol.md:417:- Pre-change performance: replay+detection `36/36`, Vitest `37.53s`, wall `37.96s`, within D630.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-b4-astra-r1.md:189:**36/36 passed; 40.09 seconds**, below D630’s 42-second ceiling. B4 changes no engine cost path.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b6-sol.md:94:D630 timing:
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b6-sol.md:103:Result: 36/36; Vitest 39.28 s, wall 38.71 s, below the ≈41 s ceiling. Earlier pre-B6 pair: 38.85 s; first post-B6 pair: 38.72 s.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-b3-astra-r1.md:57:**Supervisor timing evidence, not rerun by me:** 38.0 seconds, approximately **13.1% above main**, below D630’s **42-second** ceiling.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-b3-astra-r1.md:156:**Supervisor timing evidence, not rerun by me:** 38.0 seconds, approximately **13.1% above main**, below D630’s **42-second** ceiling.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b3-fix-r5-sol.md:57:replay + detection-reactions: 36/36
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b3-fix-r5-sol.md:62:This remains below D630’s 42-second ceiling.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b3-fix-r5-sol.md:173:replay + detection-reactions: 36/36
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b3-fix-r5-sol.md:178:This remains below D630’s 42-second ceiling.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/loop-log.md:47:Timing (same box, same load, sequential): replay + detection-reactions on main 75c2f44a = 35/35 in 33.6 s; on B1 7b0f4586 = 4 failed / 31 passed in 68.6 s with three replay tests over their 5 s timeout (6.3-6.9 s). Full tests/unit sweep on B1: 510 files, 58 failed / 9870 passed in 15 files; isolated rerun of the 14 files: 53 failures, all vitest timeouts; six of those suites baselined green on main under the same load (179/179 and 62/62). Cause read from visibility-field.ts:293-342: sightToCreature builds the observer's whole-board field per state object (cache never hits across reducer steps) and detectCombatant is per pair per step; pre-B1 traced one line per pair. Brief impl-vis-field-b1-fix-r2.md (F1 light obscurement, F2 passive Perception, F3 behavioural Perception test, F4 pairwise cost), rules block grep-checked (1), sol resume 01a0a625…, log impl-b1-fix-r2.log. Worktree confirmed free before dispatch (no codex, no vitest, status clean at 7b0f4586).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/loop-log.md:76:## 2026-09-15 19:27 — D630: ceiling raised to 25% cumulative at landing; test-performance brainstorm lane dispatched (sol high, read-only, main checkout; brief .tmp/runs/perf-tests/brief.md, log brainstorm.log)
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/loop-log.md:118:## 2026-09-16 17:11 — B4 DONE (sol r6) and verified by me (tsc 0/0, generator 0, 2 mutants killed, 20 suites 399/400 + los-cover timeout rerun pending, pair 41 s); COMMITTED 2e360685; astra medium review dispatched (review-b4-astra-r1.log). D635.11.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r3-sol.md:139:npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-b1-fix-r3-sol.md:387:npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-seam-fix-r1-blocked-sol.md:56:The 19-suite sweep and post-change D630 timing were not run after the compile-gate failure.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-seam-fix-r1-blocked-sol.md:450:The 19-suite sweep and post-change D630 timing were not run after the compile-gate failure.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-seam-fix-r2-sol.md:45:- Tests 96 ms; duration 3.41 s
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/plan-r2-sol.md:184:T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: the three allowed test files, `tests/unit/vtt/challenge-room-fixtures.test.ts`, `tests/unit/vtt/session-persistence.test.ts`, `tests/unit/vtt/replay.test.ts`, `tests/unit/vtt/detection-reactions.test.ts`.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-seam-blocked-sol.md:14:  `npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts`
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-seam-blocked-sol.md:371:  `npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts`
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/perf-tests-brainstorm-sol.md:7:- Main’s recorded replay+detection pair: **33.59 s**, including **30.31 s test execution**.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/perf-tests-brainstorm-sol.md:48:- Main’s recorded replay+detection pair: **33.59 s**, including **30.31 s test execution**.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/plan-r3-sol.md:188:T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: the three allowed test files, `tests/unit/vtt/challenge-room-fixtures.test.ts`, `tests/unit/vtt/session-persistence.test.ts`, `tests/unit/vtt/replay.test.ts`, `tests/unit/vtt/detection-reactions.test.ts`.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vtt-handoff/assumptions-astra-pass.md:77:A38. Existing state provides the bootstrap `visible` and persistent `explored` sets directly | **DISPROVED**: it has fog cells and observer/subject last-seen history, not an explored-cell history | `src/combat/encounter.ts:765`, `:792`, `src/combat/visibility.ts:641`; commands: `nl -ba src/combat/encounter.ts`, `nl -ba src/combat/visibility.ts` | Define honest projection semantics; do not invent exploration history.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:29:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:67:## D626.10 — SUPERVISOR (2026-09-15 19:36): VIS-FIELD B3 r4 candidate — batch green (154/154, 5/5 supervisor mutants killed, pair 38.3 s = +14.7%, within D630) but the full tests/unit/combat + tests/unit/vtt sweep shows 7 deterministic reds in five consumer suites; dispositions
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:72:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:74:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:75:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:7816:Sol (impl-b6-sol.md, 381 k tokens): v2 visibility block (observers + subjects transposes, strict schemas, generator-only JSON schema), player output omits it (with a forbidden-field control), serializer sentinel seam, effect obscurement union, Invisible subject keeps visible_from, truncation ordered light → adjacency → objects → visibility with the 8,192-byte calibration re-derived by hand (16,120 → 15,167 → 13,168 → 12,259 → 5,492 bytes), truncation recorded, the final single-owner stage, source-binding witnesses (standard-case string leaves 493 → 550, paths 131 → 143, explained), the semantic partition pin hand-derived [[4,0],[3,1]]; six plan mutants killed with sha-restored files; semantic 11/11, engine-mcp-handler 131/131, source-binding 6/6, support 227/227; tsc 0/0; OFFERS checks 0/0; D569 E1C/FOOTPRINTS unchanged; pair 38.85 → 38.72 s; 36 compiled foggedCells references, none a runtime state consumer; the final aggregate of all 30 plan-named suites 759/760 in 1,172 s — the sole red tests/unit/tools/ai-dm-screenshot-probe.test.ts:464 "is versioned, uses generic classic-board conventions, and leaks no non-rendered probe identity" at 5.33 s (isolated 5.18 / 5.28 s) against its D524 5 s budget; sol stopped rather than raise a timeout (correct). ALSO CHANGED BY SOL (flagged): the blind semantic cap SEMANTIC_BOARD_MAX_BYTES (or its blind-context counterpart) raised 8,192 → 32,768 because the retained hard fixtures' semantic boards now measure 13,406–17,597 bytes with the visibility block; that is a blind-DM context-size decision the plan left open ("cap is explicit") — astra reviews it; the owner is told. A/B BY ME (ab-probe.log, isolated, alternating, load ≈1): main 9f148666 passes at 4,205 / 4,210 ms; vis-field (B6 dirty) fails at 5,243 / 5,094 / 5,246 ms — +21–25% on this single test, the derived-visibility cost of the primer's board projections, at the edge of D630's 25% and over a fixed 5 s budget. RULING: a NAMED re-budget for this one test — timeout 5,000 → 10,000 ms — recorded here with the numbers as the justification (the plan's "raise timeouts only for D544-named flaky tests" is a lane rule; this is not flakiness but a measured cost of the plan's own behaviour, and the supervisor may name it); manifest +1 for that timeout line only (12 files); the cost itself is queued for TEST-PERF-01 / the owner's engine-cache decision (D630 brainstorm rank 6) with sol's mechanism note (how many projections the primer render computes derived fog for). r3 on the resumed session: apply the re-budget, state the mechanism, justify the cap change with per-fixture bytes and what the 8,192 cap would have dropped, then the forced build and the second aggregate.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:7819:Sol r3 (impl-b6-sol.md): re-budget applied exactly as ruled; mechanism traced (44 fact sheets → 88 projection calls → 73 fresh derived-fog evaluations, because each encounter-board clone is a distinct state root — ai-dm-screenshot-probe.ts:829, visibility.ts:524, encounter-board.ts:716, visibility-field.ts:550); cap justified per fixture (with/without visibility bytes and the classes the 8,192 cap would drop from each: all four; 16,384 rejects 5117001/5117002/5117007; 32,768 = half the 65,536 blind base cap); D569 blind fixtures unchanged (10 files, inventory sha 3cb2a649…); E1C/FOOTPRINTS unchanged checks 2/2; six mutants killed; tsc 0/0; tsc -b --force 0; OFFERS checks 0/0; pair 38.7 s; second final aggregate of all 30 plan suites 760/760 in 1,171 s. VERIFIED BY ME (verify-b6.log; dirty tree 11 files 516+/32−): tsc app/node 0; tsc -b --force 0; both OFFERS checks 0; 0 forbidden, 0 long lines; schema generator idempotent (a08a7359… → a08a7359…); tests/fixtures diff empty; MY MUTANT PLAYER_OUTPUT_KEEPS_VISIBILITY (the audience === 'dm' guard dropped at semantic-board-payload.ts:601) → the sentinel/player-omission test RED, restored 77cfdb2d…; 11 B6 suites 328/328 (semantic, blind-turn-context, source-binding, engine-mcp-handler, board-delivery, visibility-field, screenshot-probe, engine-mcp-server, engine-mcp-boundary, stable-dom-render, accessible-board); pair 36/36 in 39 s. Committed 10cc9f5e. vis-field = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6 — every batch of the frozen plan. Astra (resume 01a0a642…, medium; brief review-impl-b6-astra.md; log review-b6-astra-r1.log) reviews the last batch and is asked to state whether the 32,768-byte blind semantic cap is within B6's authority or a product decision; the owner has been told and can rule before landing. Next after ACCEPT: the VIS-FIELD LANDING GATE — merge main into the branch (main has not moved since the rebase: 9f148666), gate-wt2 (tsc -b, sg, full vitest, Playwright), OFFERS checks, D630 pair and one arena round on the merged tip, then "Land VIS-FIELD-01" on main and the mirror push (D640); then ELEVATION-02 B0.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:7822:Astra r1 (review-impl-b6-astra-r1.md, 1.72 M tokens): 11 files 516+/32−; schema regenerated in memory byte-identical (159,453 bytes); the strict v2 objects reject unknown keys (schemas.ts:671-683) with the blind validator mirroring them; no DM-semantic-to-player delivery path (projectPlayerBoard builds from PlayerView; serialization requires the DM audience at :601; turn-context delivery rejects player projections at :673; MCP attachment paths DM-only at engine-server.ts:1568-1579); one sight service (visibilityField / cellsThatCanSee at :334/:344; the serializer consumes supplied rows at :604-612); the truncation calibration reproduced exactly (16,120 → 15,167 → 13,168 → 12,259 → 5,492); the semantic partition oracle re-enumerated by rational arithmetic (18 visible, only [(4,0),(3,1)] concealed); the effect-line and Invisible-subject oracles confirmed; the source-binding counts recounted (57 = 3 + 6×5 + 6×4; 12 paths) and all three mutations rejected; the 10 D569 fixtures and the 31,995 / 32,000-byte raw-context pins byte-identical; three own mutants killed; tsc 0/0; pair 39.2 s. Its noted limits: the final single-owner test is a lexical check (no alias bypass found); its sandbox could not execute the D569 pins (sol 2/2 and my board-delivery 17/17 stand as the evidence). BLIND CAP: astra judges 32,768 bytes within B6's explicitly open cap choice, with the owner notification retained; two corrections to sol's account, accepted: blind delivery REJECTS an oversized protected semantic block rather than truncating it (blind-turn-context.ts:1304-1316) — so under the old 8,192 cap every retained hard fixture's blind context would have been refused outright, not thinned — and the semantic allowance is ADDITIONAL to the 65,536-byte base allowance, not within it. The owner may still rule the cap smaller before the landing merge; absent a ruling it lands at 32,768. VIS-FIELD-01 = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6. LANDING GATE launched now (gate-vis-field-land.log): gate-wt2 wt-vis-field (tsc -b --force, sg, full vitest, Playwright chromium) + the two OFFERS checks + the D630 pair twice + one arena round; main 9f148666 is already an ancestor, so the landing is a "Land VIS-FIELD-01" no-ff merge once the gate reads green (timeouts, if any, rerun isolated per the offers precedent D617.50); then the mirror push (D640); then ELEVATION-02 B0 on a fresh worktree from the landed main.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:7828:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:7830:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/review-impl-land-03-astra-r1.md:7845:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:36:Sol (impl-b6-sol.md, 381 k tokens): v2 visibility block (observers + subjects transposes, strict schemas, generator-only JSON schema), player output omits it (with a forbidden-field control), serializer sentinel seam, effect obscurement union, Invisible subject keeps visible_from, truncation ordered light → adjacency → objects → visibility with the 8,192-byte calibration re-derived by hand (16,120 → 15,167 → 13,168 → 12,259 → 5,492 bytes), truncation recorded, the final single-owner stage, source-binding witnesses (standard-case string leaves 493 → 550, paths 131 → 143, explained), the semantic partition pin hand-derived [[4,0],[3,1]]; six plan mutants killed with sha-restored files; semantic 11/11, engine-mcp-handler 131/131, source-binding 6/6, support 227/227; tsc 0/0; OFFERS checks 0/0; D569 E1C/FOOTPRINTS unchanged; pair 38.85 → 38.72 s; 36 compiled foggedCells references, none a runtime state consumer; the final aggregate of all 30 plan-named suites 759/760 in 1,172 s — the sole red tests/unit/tools/ai-dm-screenshot-probe.test.ts:464 "is versioned, uses generic classic-board conventions, and leaks no non-rendered probe identity" at 5.33 s (isolated 5.18 / 5.28 s) against its D524 5 s budget; sol stopped rather than raise a timeout (correct). ALSO CHANGED BY SOL (flagged): the blind semantic cap SEMANTIC_BOARD_MAX_BYTES (or its blind-context counterpart) raised 8,192 → 32,768 because the retained hard fixtures' semantic boards now measure 13,406–17,597 bytes with the visibility block; that is a blind-DM context-size decision the plan left open ("cap is explicit") — astra reviews it; the owner is told. A/B BY ME (ab-probe.log, isolated, alternating, load ≈1): main 9f148666 passes at 4,205 / 4,210 ms; vis-field (B6 dirty) fails at 5,243 / 5,094 / 5,246 ms — +21–25% on this single test, the derived-visibility cost of the primer's board projections, at the edge of D630's 25% and over a fixed 5 s budget. RULING: a NAMED re-budget for this one test — timeout 5,000 → 10,000 ms — recorded here with the numbers as the justification (the plan's "raise timeouts only for D544-named flaky tests" is a lane rule; this is not flakiness but a measured cost of the plan's own behaviour, and the supervisor may name it); manifest +1 for that timeout line only (12 files); the cost itself is queued for TEST-PERF-01 / the owner's engine-cache decision (D630 brainstorm rank 6) with sol's mechanism note (how many projections the primer render computes derived fog for). r3 on the resumed session: apply the re-budget, state the mechanism, justify the cap change with per-fixture bytes and what the 8,192 cap would have dropped, then the forced build and the second aggregate.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:39:Sol r3 (impl-b6-sol.md): re-budget applied exactly as ruled; mechanism traced (44 fact sheets → 88 projection calls → 73 fresh derived-fog evaluations, because each encounter-board clone is a distinct state root — ai-dm-screenshot-probe.ts:829, visibility.ts:524, encounter-board.ts:716, visibility-field.ts:550); cap justified per fixture (with/without visibility bytes and the classes the 8,192 cap would drop from each: all four; 16,384 rejects 5117001/5117002/5117007; 32,768 = half the 65,536 blind base cap); D569 blind fixtures unchanged (10 files, inventory sha 3cb2a649…); E1C/FOOTPRINTS unchanged checks 2/2; six mutants killed; tsc 0/0; tsc -b --force 0; OFFERS checks 0/0; pair 38.7 s; second final aggregate of all 30 plan suites 760/760 in 1,171 s. VERIFIED BY ME (verify-b6.log; dirty tree 11 files 516+/32−): tsc app/node 0; tsc -b --force 0; both OFFERS checks 0; 0 forbidden, 0 long lines; schema generator idempotent (a08a7359… → a08a7359…); tests/fixtures diff empty; MY MUTANT PLAYER_OUTPUT_KEEPS_VISIBILITY (the audience === 'dm' guard dropped at semantic-board-payload.ts:601) → the sentinel/player-omission test RED, restored 77cfdb2d…; 11 B6 suites 328/328 (semantic, blind-turn-context, source-binding, engine-mcp-handler, board-delivery, visibility-field, screenshot-probe, engine-mcp-server, engine-mcp-boundary, stable-dom-render, accessible-board); pair 36/36 in 39 s. Committed 10cc9f5e. vis-field = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6 — every batch of the frozen plan. Astra (resume 01a0a642…, medium; brief review-impl-b6-astra.md; log review-b6-astra-r1.log) reviews the last batch and is asked to state whether the 32,768-byte blind semantic cap is within B6's authority or a product decision; the owner has been told and can rule before landing. Next after ACCEPT: the VIS-FIELD LANDING GATE — merge main into the branch (main has not moved since the rebase: 9f148666), gate-wt2 (tsc -b, sg, full vitest, Playwright), OFFERS checks, D630 pair and one arena round on the merged tip, then "Land VIS-FIELD-01" on main and the mirror push (D640); then ELEVATION-02 B0.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:42:Astra r1 (review-impl-b6-astra-r1.md, 1.72 M tokens): 11 files 516+/32−; schema regenerated in memory byte-identical (159,453 bytes); the strict v2 objects reject unknown keys (schemas.ts:671-683) with the blind validator mirroring them; no DM-semantic-to-player delivery path (projectPlayerBoard builds from PlayerView; serialization requires the DM audience at :601; turn-context delivery rejects player projections at :673; MCP attachment paths DM-only at engine-server.ts:1568-1579); one sight service (visibilityField / cellsThatCanSee at :334/:344; the serializer consumes supplied rows at :604-612); the truncation calibration reproduced exactly (16,120 → 15,167 → 13,168 → 12,259 → 5,492); the semantic partition oracle re-enumerated by rational arithmetic (18 visible, only [(4,0),(3,1)] concealed); the effect-line and Invisible-subject oracles confirmed; the source-binding counts recounted (57 = 3 + 6×5 + 6×4; 12 paths) and all three mutations rejected; the 10 D569 fixtures and the 31,995 / 32,000-byte raw-context pins byte-identical; three own mutants killed; tsc 0/0; pair 39.2 s. Its noted limits: the final single-owner test is a lexical check (no alias bypass found); its sandbox could not execute the D569 pins (sol 2/2 and my board-delivery 17/17 stand as the evidence). BLIND CAP: astra judges 32,768 bytes within B6's explicitly open cap choice, with the owner notification retained; two corrections to sol's account, accepted: blind delivery REJECTS an oversized protected semantic block rather than truncating it (blind-turn-context.ts:1304-1316) — so under the old 8,192 cap every retained hard fixture's blind context would have been refused outright, not thinned — and the semantic allowance is ADDITIONAL to the 65,536-byte base allowance, not within it. The owner may still rule the cap smaller before the landing merge; absent a ruling it lands at 32,768. VIS-FIELD-01 = 10cc9f5e: B1, B3, SEAM, B4, B5, REBASE, B2, B2-F1, B6. LANDING GATE launched now (gate-vis-field-land.log): gate-wt2 wt-vis-field (tsc -b --force, sg, full vitest, Playwright chromium) + the two OFFERS checks + the D630 pair twice + one arena round; main 9f148666 is already an ancestor, so the landing is a "Land VIS-FIELD-01" no-ff merge once the gate reads green (timeouts, if any, rerun isolated per the offers precedent D617.50); then the mirror push (D640); then ELEVATION-02 B0 on a fresh worktree from the landed main.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:48:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:50:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:65:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:86:TASK: Review `git diff 10cc9f5e ebfcacaa` (6 files, 325+/22−: src/vtt/engine-query-port.ts, src/vtt/room-generator.ts, tests/unit/vtt/{engine-query-port,room-generator-los-cover,arena-basis-brutal-b,tactical-evaluator-r02}.test.ts) = LAND-01, the landing-reconciliation batch for the two VIS-FIELD defects the full-suite landing gate exposed (D635.36): (c1) the query port offered attacks/saves whose corner trace blocks sight (tier-only check) while execution refuses them — an offers-boundary violation; (c2) the generator's open-ray predicate ignored blocksSight; plus the brutal-b helper's missing activation choice, and six tactical-evaluator kill-probability pins that scored shots from origins the reducer would refuse. Supervisor verification (verify-land-01.log): tsc 0/0; OFFERS checks 0/0; my mutants (sight check disabled → both query witnesses red incl. the 214-offer agreement property; generator predicate relaxed → its witness red); 16 suites 299/299 (query port, r02, dm-tactical-intel, challenge-room, the OFFERS set, replay, detection); los-cover 112/112; exactly the 16 expected reds remain (ten brutal-b productivity pins + six D569 manifest — the frozen-family consequence awaiting the owner, D635.36); pair 38 s.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:88:CHECK (each with commands and numbers): (1) c1: the refusal at engine-query-port.ts:~1171 uses the SAME trace inputs as execution (encounter.ts:~7183: actor, target, sourceAnchor = the proposed origin) — could the two still disagree (a different anchor, footprint, exclusion set, or a path where execution traces after a move the query did not model)? Enumerate every production site that decides attack/save targetability and confirm each is now sight-aware or is not an authorization gate (sol left :1234/:1547 tactical-scoring and :1830 cover reporting alone — agree or not). (2) The AGREEMENT PROPERTY ("offered attacks and saves in every frozen landing family pass the reducer LOS rule"): read it — is executing each offer through reduceEncounter at the resolved finalPosition a faithful model of real execution (initiative/active-combatant setup, the () => 0.5 roll, multiattack components, bonus-action slot)? 214 offers checked — recount from the three families; a property that silently skips options is a P1. (3) c2: generatedLineIsOpen = tier 'none' && !blocksSight at both call sites; the witness's geometry (14,6)→(1,6) along row line 6 between (8,5)/(8,6) — verify; sol's in-memory regeneration of 42 seeds byte-equal — reproduce for at least the ten brutal-b seeds (so the frozen families are NOT cured by the fix; relevant to the owner's question). (4) The six R02 pins: recompute at least two allocations independently (no-bless 2702281/6250000 and one Bless variant; Bless enumerated over the d4 faces; the death-save fold in initiative order per tactical-evaluator.ts:786-814) and confirm the two unchanged controls are byte-identical to 10cc9f5e. (5) The brutal-b helper: materializing the first declared legal activation choice keeps the engine-ranked option — confirm it does not mask a resolver defect and that dispel-evil-and-good's choice contract is what the helper reads. (6) No fixture changed; the remaining reds are exactly the frozen-family ones; tsc 0/0; suites you can run; pair (ceiling ≈41 s).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:100:22960:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:357:## D626.10 — SUPERVISOR (2026-09-15 19:36): VIS-FIELD B3 r4 candidate — batch green (154/154, 5/5 supervisor mutants killed, pair 38.3 s = +14.7%, within D630) but the full tests/unit/combat + tests/unit/vtt sweep shows 7 deterministic reds in five consumer suites; dispositions
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:362:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:364:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:365:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:660:22960:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:677:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:698:TASK: Review `git diff 10cc9f5e ebfcacaa` (6 files, 325+/22−: src/vtt/engine-query-port.ts, src/vtt/room-generator.ts, tests/unit/vtt/{engine-query-port,room-generator-los-cover,arena-basis-brutal-b,tactical-evaluator-r02}.test.ts) = LAND-01, the landing-reconciliation batch for the two VIS-FIELD defects the full-suite landing gate exposed (D635.36): (c1) the query port offered attacks/saves whose corner trace blocks sight (tier-only check) while execution refuses them — an offers-boundary violation; (c2) the generator's open-ray predicate ignored blocksSight; plus the brutal-b helper's missing activation choice, and six tactical-evaluator kill-probability pins that scored shots from origins the reducer would refuse. Supervisor verification (verify-land-01.log): tsc 0/0; OFFERS checks 0/0; my mutants (sight check disabled → both query witnesses red incl. the 214-offer agreement property; generator predicate relaxed → its witness red); 16 suites 299/299 (query port, r02, dm-tactical-intel, challenge-room, the OFFERS set, replay, detection); los-cover 112/112; exactly the 16 expected reds remain (ten brutal-b productivity pins + six D569 manifest — the frozen-family consequence awaiting the owner, D635.36); pair 38 s.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:700:CHECK (each with commands and numbers): (1) c1: the refusal at engine-query-port.ts:~1171 uses the SAME trace inputs as execution (encounter.ts:~7183: actor, target, sourceAnchor = the proposed origin) — could the two still disagree (a different anchor, footprint, exclusion set, or a path where execution traces after a move the query did not model)? Enumerate every production site that decides attack/save targetability and confirm each is now sight-aware or is not an authorization gate (sol left :1234/:1547 tactical-scoring and :1830 cover reporting alone — agree or not). (2) The AGREEMENT PROPERTY ("offered attacks and saves in every frozen landing family pass the reducer LOS rule"): read it — is executing each offer through reduceEncounter at the resolved finalPosition a faithful model of real execution (initiative/active-combatant setup, the () => 0.5 roll, multiattack components, bonus-action slot)? 214 offers checked — recount from the three families; a property that silently skips options is a P1. (3) c2: generatedLineIsOpen = tier 'none' && !blocksSight at both call sites; the witness's geometry (14,6)→(1,6) along row line 6 between (8,5)/(8,6) — verify; sol's in-memory regeneration of 42 seeds byte-equal — reproduce for at least the ten brutal-b seeds (so the frozen families are NOT cured by the fix; relevant to the owner's question). (4) The six R02 pins: recompute at least two allocations independently (no-bless 2702281/6250000 and one Bless variant; Bless enumerated over the d4 faces; the death-save fold in initiative order per tactical-evaluator.ts:786-814) and confirm the two unchanged controls are byte-identical to 10cc9f5e. (5) The brutal-b helper: materializing the first declared legal activation choice keeps the engine-ranked option — confirm it does not mask a resolver defect and that dispel-evil-and-good's choice contract is what the helper reads. (6) No fixture changed; the remaining reds are exactly the frozen-family ones; tsc 0/0; suites you can run; pair (ceiling ≈41 s).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:712:22960:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:929:## D626.10 — SUPERVISOR (2026-09-15 19:36): VIS-FIELD B3 r4 candidate — batch green (154/154, 5/5 supervisor mutants killed, pair 38.3 s = +14.7%, within D630) but the full tests/unit/combat + tests/unit/vtt sweep shows 7 deterministic reds in five consumer suites; dispositions
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:934:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:936:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:937:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:1186:TASK: Review `git diff 10cc9f5e ebfcacaa` (6 files, 325+/22−: src/vtt/engine-query-port.ts, src/vtt/room-generator.ts, tests/unit/vtt/{engine-query-port,room-generator-los-cover,arena-basis-brutal-b,tactical-evaluator-r02}.test.ts) = LAND-01, the landing-reconciliation batch for the two VIS-FIELD defects the full-suite landing gate exposed (D635.36): (c1) the query port offered attacks/saves whose corner trace blocks sight (tier-only check) while execution refuses them — an offers-boundary violation; (c2) the generator's open-ray predicate ignored blocksSight; plus the brutal-b helper's missing activation choice, and six tactical-evaluator kill-probability pins that scored shots from origins the reducer would refuse. Supervisor verification (verify-land-01.log): tsc 0/0; OFFERS checks 0/0; my mutants (sight check disabled → both query witnesses red incl. the 214-offer agreement property; generator predicate relaxed → its witness red); 16 suites 299/299 (query port, r02, dm-tactical-intel, challenge-room, the OFFERS set, replay, detection); los-cover 112/112; exactly the 16 expected reds remain (ten brutal-b productivity pins + six D569 manifest — the frozen-family consequence awaiting the owner, D635.36); pair 38 s.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:1188:CHECK (each with commands and numbers): (1) c1: the refusal at engine-query-port.ts:~1171 uses the SAME trace inputs as execution (encounter.ts:~7183: actor, target, sourceAnchor = the proposed origin) — could the two still disagree (a different anchor, footprint, exclusion set, or a path where execution traces after a move the query did not model)? Enumerate every production site that decides attack/save targetability and confirm each is now sight-aware or is not an authorization gate (sol left :1234/:1547 tactical-scoring and :1830 cover reporting alone — agree or not). (2) The AGREEMENT PROPERTY ("offered attacks and saves in every frozen landing family pass the reducer LOS rule"): read it — is executing each offer through reduceEncounter at the resolved finalPosition a faithful model of real execution (initiative/active-combatant setup, the () => 0.5 roll, multiattack components, bonus-action slot)? 214 offers checked — recount from the three families; a property that silently skips options is a P1. (3) c2: generatedLineIsOpen = tier 'none' && !blocksSight at both call sites; the witness's geometry (14,6)→(1,6) along row line 6 between (8,5)/(8,6) — verify; sol's in-memory regeneration of 42 seeds byte-equal — reproduce for at least the ten brutal-b seeds (so the frozen families are NOT cured by the fix; relevant to the owner's question). (4) The six R02 pins: recompute at least two allocations independently (no-bless 2702281/6250000 and one Bless variant; Bless enumerated over the d4 faces; the death-save fold in initiative order per tactical-evaluator.ts:786-814) and confirm the two unchanged controls are byte-identical to 10cc9f5e. (5) The brutal-b helper: materializing the first declared legal activation choice keeps the engine-ranked option — confirm it does not mask a resolver defect and that dispel-evil-and-good's choice contract is what the helper reads. (6) No fixture changed; the remaining reds are exactly the frozen-family ones; tsc 0/0; suites you can run; pair (ceiling ≈41 s).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:1200:22960:## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:2739:788:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:16814:22958:Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-03-sol.md:16815:22975:VERIFIED BY ME (verify-land-01.log): tsc 0/0; both OFFERS checks 0; 0 forbidden, 0 long lines; tests/fixtures untouched; MY MUTANTS — the query port's sight refusal disabled → both witnesses RED (the seam fixture and the 214-offer agreement property), restored 1a552fba…; the generator's predicate relaxed to tier-only → OPEN_RAY_IGNORES_BLOCKS_SIGHT RED, restored 8d85ae64…; 16 suites 299/299 (engine-query-port, r02, dm-tactical-intel, challenge-room, the three offer-environment suites, engine-mcp-handler/server/golden, board-delivery, board-snapshot, SIMULATED, dm-encounter-host-live-path, replay, detection); los-cover 112/112; EXACTLY the 16 expected reds (ten brutal-b productivity pins, six D569 second-family manifest) — the frozen-family consequence that is the owner's question 5; pair 36/36 in 38 s. Committed ebfcacaa (6 files 325+/22−). vis-field = ebfcacaa. Astra (resume 01a0a642…, medium; brief review-impl-land-01-astra.md; log review-land-01-astra-r1.log) reviews LAND-01 on the detached checkout; LAND-02 (fresh sol; brief impl-vis-field-land-02.md; log impl-land-02.log) re-pins vtt-encounter.spec.ts:237 by hand and diagnoses the board-snapshot spec's board-visible wait (D635.38) on the worktree, its Playwright runs on port 4470 only.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/impl-s3-b14-blocked-sol.md:65:- Direct-importer closure: 41 specs, 805/808 tests passed; focused reruns established the legacy-invariance failure above as genuine.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/impl-s3-b14-blocked-sol.md:1251:- Direct-importer closure: 41 specs, 805/808 tests passed; focused reruns established the legacy-invariance failure above as genuine.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vtt-handoff/triage-gate-failures-astra.md:10203:luna - engine-top at +0.34 and sol - luna at -0.38. At three reps both
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/loop-log.md:396:- Clean title 1/1 (8.5 s). Conversation suite on the loud box: 108/109, one 60 s timeout (SIMULATED two-rooms restore) → isolated rerun on the quiet box passed in 41 s. Load noise.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/loop-log.md:417:### 2026-09-16 15:08 — light checks on 1cacd8f0: check-command-outcomes 0, architecture self-test 0, architecture 0. Full vitest rerun + D630 pair + arena round launched (gate-offers-vitest.log).
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/loop-log.md:419:### 2026-09-16 15:36 — LANDED on main as 9f148666. Gate: Playwright 187/187, tsc 0, sg 0, light checks 0/0/0, vitest 11462/11479 with 17 load timeouts → six files 257/257 isolated, pair 32.8 s, arena round 39.7 s. D617.50. Unit closed.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/review-plan-s3-builder-sol-r1.md:38:| Merge | PASS | Full diff is 431 files; relevant scoped diff is the documented 177. Manifest intersection with the complete diff is exactly 44 paths. Main discovers 641 specs; the branch adds exactly two specs and no rename, so the merged expectation is 643. Implementation should start only on the main-merged integration base; [plan:246–252](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:246>) already mandates that. |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/review-plan-s3-builder-sol-r1.md:162:| Merge | PASS | Full diff is 431 files; relevant scoped diff is the documented 177. Manifest intersection with the complete diff is exactly 44 paths. Main discovers 641 specs; the branch adds exactly two specs and no rename, so the merged expectation is 643. Implementation should start only on the main-merged integration base; [plan:246–252](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:246>) already mandates that. |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/impl-s3-b12-sol.md:16:| `session-lifecycle.test.ts` | `943137eb…ac72` | `8d91b1d4…6691` | Explicit saved-session host environment at line 38. |
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/offers-impl/impl-s3-b14-sol.md:226:Direct importer closure: 41 suites, 808/808 outside the explicitly allowed 3B scaffold set. Per-file counts:
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/impl-m3-review-astra-r1.md:32:  [GI:1087](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1087), :1138. With injected in-memory process results `{status:null, signal:null}` and no spawn error, `runInventoryGate` produces `finalStatus:'passed'`. Reconciliation correctly rejects that receipt later, so the two boundaries disagree. No committed test calls `runInventoryGate`; the injected runner-adapter tests required at [plan:559](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/.tmp-plans/2026-09-14-executable-verification-inventory-plan.md:559) are absent. Use the explicit outer-success predicate and test runner receipt production without launching gates.
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/impl-m2-git-key-lane.md:93:Tests 1 passed | 41 skipped (42)
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/impl-m2-git-key-lane.md:1576:Tests 1 passed | 41 skipped (42)
/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/builder-audit-claude-fable.md:180:| module singletons | `worker/registry.ts:113 rpcRegistry`, `intent-resolver.ts:680 pureTurnProposalResolver` (agreed tranche), `uuidv7.ts:104 defaultGenerator`, `character-command-executor.ts:341 storedPayloadValidator` | no duplicate singletons for one purpose found |
    }
    if (isDmOnlyEvent(event)) return [];
    if (
      event.type === 'effect_ended' ||
      event.type === 'effect_clock_ticked' ||
      event.type === 'effect_duration_extended'
    ) return [];
    if (event.type === 'initiative_ordered') {
      return [{
        ...event,
        order: event.order.filter((id) => visibleIds.has(id)),
        slots: event.slots
          .map((slot) => slot.filter((id) => visibleIds.has(id)))
          .filter((slot) => slot.length > 0),
      }];
    }
    if (event.type === 'adjudicated') {
      return visibleIds.has(event.target)
        ? [{ sequence: event.sequence, type: 'adjudicated', target: event.target, consequence: event.consequence }]
        : [];
    }
    return eventCombatants(event).every((id) => visibleIds.has(id)) ? [event] : [];
  });
}

/** The only canonical EncounterState -> DM projection function. */
export function projectDmView(state: EncounterState): DmView {
  const visibilityObserverIds = eligibleVisibilityObserverIds(state, { kind: 'dm_party' });
  return {
    audience: 'dm',
    state: {
      config: structuredClone(state.config),
      phase: structuredClone(state.phase),
      rulesEdition: state.rulesEdition,
      hiddenRolls: [...state.hiddenRolls],
      revision: state.revision,
      nextEventSequence: state.nextEventSequence,
      nextDecisionSequence: state.nextDecisionSequence,
      nextEffectSequence: state.nextEffectSequence,
      bounds: structuredClone(state.bounds),
      blockedCells: structuredClone(state.blockedCells),
      worldObjects: structuredClone(state.worldObjects),
      nextWorldObjectSequence: state.nextWorldObjectSequence,
      environment: structuredClone(state.environment),
      foggedCells: derivedFogCells(state, visibilityObserverIds),
      dmNotes: [...state.dmNotes],
      combatants: structuredClone(state.combatants),
      tokens: structuredClone(state.tokens),
      sharedSpaceRelations: structuredClone(state.sharedSpaceRelations),
      adjudicationPending: structuredClone(state.adjudicationPending),
      ...(state.absentTokens === undefined ? {} : { absentTokens: structuredClone(state.absentTokens) }),
      initiative: structuredClone(state.initiative),
      activeCombatant: state.activeCombatant,
      activeInitiativeIndex: state.activeInitiativeIndex,
      round: state.round,
      effects: structuredClone(state.effects),
      persistentAreas: structuredClone(state.persistentAreas),
      nextPersistentAreaSequence: state.nextPersistentAreaSequence,
      ...(state.reevaluatedBranches === undefined ? {} : { reevaluatedBranches: structuredClone(state.reevaluatedBranches) }),
      eventLog: structuredClone(state.eventLog),
      hiddenCombatants: structuredClone(state.hiddenCombatants),
      observationHistory: structuredClone(state.observationHistory),
      ...(state.searchMemories === undefined ? {} : { searchMemories: structuredClone(state.searchMemories) }),
      ...(state.alerting === undefined ? {} : { alerting: structuredClone(state.alerting) }),
      pendingDecisions: structuredClone(state.pendingDecisions),
      reactionPolicies: structuredClone(state.reactionPolicies),
      ...(state.contentPacks === undefined ? {} : { contentPacks: structuredClone(state.contentPacks) }),
      ...(state.equipment === undefined ? {} : { equipment: structuredClone(state.equipment) }),
      ...(state.groundItems === undefined ? {} : { groundItems: structuredClone(state.groundItems) }),
      ...(state.itemContacts === undefined ? {} : { itemContacts: structuredClone(state.itemContacts) }),
    },
  };
}

/** The only canonical EncounterState -> player projection function. */
export function projectPlayerView(state: EncounterState, binding: PlayerSeatBinding): PlayerView {
  if (!state.combatants.some((subject) => subject.profile.id === binding.combatantId)) {
    throw new UnknownPlayerSeatCombatantError(binding.seatId, binding.combatantId);
  }
  const ownedIds = new Set(binding.ownedCombatantIds ?? [binding.combatantId]);
  if (!ownedIds.has(binding.combatantId)) {
    throw new Error(`Player seat ${binding.seatId} does not own its visibility combatant.`);
  }
  const tokensByCombatant = new Map(state.tokens.map((token) => [token.combatantId, token] as const));
  const availableObservers = eligibleVisibilityObserverIds(state, {
    kind: 'player_seat',
    ownedIds,
  });
  const fog = new Set(derivedFogCells(state, availableObservers).map(cellKey));
  const hidden = new Set(state.hiddenCombatants.map((entry) => entry.combatant));
  // Hidden creature geometry is never read into a player-safe projection.
  const concealed = new Set(fog);
  const initiativeOrder = new Map(state.initiative.map((entry, index) =>
    [entry.combatant, index] as const));
  const combatants = state.combatants.flatMap((subject): readonly PlayerVisibleCombatant[] => {
    const pending = state.adjudicationPending.find((entry) =>
      entry.combatant === subject.profile.id);
    if (pending !== undefined) {
      if (!ownedIds.has(subject.profile.id)) return [];
      return [{
        id: subject.profile.id,
        name: subject.profile.name,
        kind: combatantSide(state, subject.profile.id),
        life: subject.life,
        placementStatus: 'placement_pending',
        pendingReason: pending.kind,
        active: state.activeCombatant === subject.profile.id,
        formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
        conditions: playerVisibleConditions(state, subject.profile.id, true),
      }];
    }
    const token = tokensByCombatant.get(subject.profile.id);
    if (token === undefined) return [];
    const owned = ownedIds.has(subject.profile.id);
    if (hidden.has(subject.profile.id) ||
      (!owned && !availableObservers.some((observer) =>
        detectCombatant(state, observer, subject.profile.id).kind === 'seen'))) return [];
    const space = combatantSpace(state, subject.profile.id);
    return [{
      id: subject.profile.id,
      name: subject.profile.name,
      kind: combatantSide(state, subject.profile.id),
      life: subject.life,
      placementStatus: 'placed',
      position: { ...token.position },
      effectiveSize: effectiveCreatureSize(state, subject.profile.id),
      placementMode: structuredClone(token.placementMode),
      footprint: space.cells.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
      active: state.activeCombatant === subject.profile.id,
      formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
      conditions: playerVisibleConditions(state, subject.profile.id, owned),
    }];
  }).sort((left, right) =>
    (initiativeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (initiativeOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
    String(left.id).localeCompare(String(right.id)));
  const visibleIds = new Set(combatants.map((subject) => subject.id));
  const lastSeen = state.combatants.flatMap((subject): readonly PlayerLastSeenCombatant[] => {
    if (subject.life === 'dead' || visibleIds.has(subject.profile.id) ||
      !tokensByCombatant.has(subject.profile.id)) return [];
    const latest = state.observationHistory
      .filter((entry) => ownedIds.has(entry.observer) && entry.subject === subject.profile.id)
      .sort((left, right) => right.revision - left.revision ||
        String(left.observer).localeCompare(String(right.observer)))[0];
    if (latest === undefined) return [];
    return [{
      id: subject.profile.id,
      name: subject.profile.name,
      kind: combatantSide(state, subject.profile.id),
      cell: { ...latest.cell },
      round: latest.round,
        throw new Error(`${draft.kind} is attributed to the wrong controller request.`);
      }
    }
    const withOrder = { ...draft, sequence, previousSequence };
    const record: ReplayTranscriptRecord = {
      ...withOrder,
      contentHash: sha256(canonicalJson(transcriptContent(withOrder))),
    };
    this.#records.push(record);
    if (record.kind === 'controller_request' && record.requestId !== null) {
      this.#requests.set(record.requestId, record);
    }
    return record;
  }

  records(): readonly ReplayTranscriptRecord[] {
    return structuredClone(this.#records);
  }
}

interface ReplayViews {
  readonly dm: DmVisibleEncounterState;
  readonly players: readonly {
    readonly combatantId: string;
    readonly projection: PlayerView;
  }[];
}

function projectReplayViews(state: EncounterState): ReplayViews {
  return {
    dm: dmVisibleEncounter(projectDmView(state)),
    players: state.combatants
      .filter((subject) => subject.profile.kind === 'player_character')
      .map((subject) => ({
        combatantId: subject.profile.id,
        projection: projectPlayerView(state, {
          seatId: `seat:replay:${subject.profile.id}`,
          combatantId: subject.profile.id,
        }),
      })),
  };
}

function hashProjections(projections: ReplayViews): ReplayProjectionHashes {
  return {
    dm: sha256(canonicalJson(projections.dm)),
    players: projections.players.map((entry) => ({
      combatantId: entry.combatantId,
      hash: sha256(canonicalJson(entry.projection)),
    })),
  };
}

function replayRevisionRecords(revisions: readonly SessionRevision[]): readonly ReplayRevisionRecord[] {
  const history = sessionHistory(revisions);
  return revisions.map((revision, index) => {
    const prior = revisions[index - 1];
    const pre = prior?.rngState ?? revision.rngState;
    return {
      revision,
      void: history[index]?.void ?? false,
      rng: { pre, post: revision.rngState },
      stateHash: sha256(canonicalJson(revision.encounterState)),
      projectionHashes: hashProjections(projectReplayViews(revision.encounterState)),
    };
  });
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], options);
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const traceKey = `${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined
    ? 'current'
    : cellKey(options.sourceAnchor)}#sight:${blockerSignature}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {
    sourceId,
    targetId,
    includeCreatures: true,
    ...(options.additionalSightBlockingCells === undefined
      ? {}
      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function traceCombatantLineToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const targetSignature = targetCells.map(cellKey).join(';');
  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);
  const traceKey = `${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, targetCells, {
    sourceId,
    includeCreatures: true,
    ...(options.additionalSightBlockingCells === undefined
      ? {}
      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  const exclusions = new Set([cellKey(from), cellKey(to)]);
  const candidates = [...new Map(objects
    .flatMap((object) => object.footprint)
    .filter((cell) => !exclusions.has(cellKey(cell)))
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const sourceCell = { ...from };
  const targetCell = { ...to };
  const targetCorners = outerCorners([to]);
  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>
    objects.flatMap((object): readonly TerrainLineSource[] =>
      objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
        : []);
  const sightBlockingAt = (cell: GridCell): boolean =>
    !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
      candidates,
      sourcesAt,
      sightBlockingAt,
    )),
    sourceCell,
    targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  return traces.reduce((best, candidate) =>
    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
}

export type CreatureCoverOptions = CreatureLineOptions;

export interface CombatantCoverResult {
  readonly tier: CoverTier;
  readonly sourceIds: readonly string[];
}

export function coverBetweenCombatants(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureCoverOptions = {},
): CombatantCoverResult {
  const trace = traceCombatantLine(state, sourceId, targetId, options);
  return { tier: trace.tier, sourceIds: trace.sourceIds };
}
    [{ column: 0, row: -1 }, { column: 0, row: 0 }],
    [{ column: -1, row: 0 }, { column: 0, row: 0 }],
    [{ column: 0, row: -1 }, { column: 0, row: 0 }, { column: 0, row: 1 }],
    [{ column: -1, row: 0 }, { column: 0, row: 0 }, { column: 1, row: 0 }],
  ] as const;
  for (let row = 1; row < dimensions.rows - 1; row += 1) {
    for (let column = 1; column < dimensions.columns - 1; column += 1) {
      for (const shape of shapes) {
        const footprint = shape.map((offset) => ({
          column: column + offset.column,
          row: row + offset.row,
        }));
        if (footprint.every((cell) => cellIsInside(dimensions, cell))) candidates.push(footprint);
      }
    }
  }
  return candidates;
}

function generatedCoverObject<TerrainKind extends 'half_cover' | 'three_quarters_cover'>(
  seed: number,
  terrainKind: TerrainKind,
  footprint: readonly GridCell[],
): GeneratedCoverObject<TerrainKind> {
  const position = footprint[0];
  if (position === undefined) throw new RangeError('Generated cover must occupy at least one cell.');
  const blocking = terrainBlocking(terrainKind) as GeneratedCoverObject<TerrainKind>['blocking'];
  return {
    id: worldObjectId(`world-object:generated-${String(seed)}-${terrainKind}`),
    name: terrainKind === 'half_cover' ? 'Low Stone Barricade' : 'Arrow-Slit Bulwark',
    kind: 'cover',
    terrainKind,
    position,
    footprint,
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking,
    createdRevision: 0,
  };
}

function livingOpposingPairs(state: EncounterState): readonly {
  readonly source: EncounterCombatantState;
  readonly target: EncounterCombatantState;
}[] {
  const party = state.combatants.filter((combatant) =>
    combatant.life === 'living' && combatant.profile.kind === 'player_character');
  const monsters = state.combatants.filter((combatant) =>
    combatant.life === 'living' && combatant.profile.kind === 'monster');
  return [
    ...party.flatMap((source) => monsters.map((target) => ({ source, target }))),
    ...monsters.flatMap((source) => party.map((target) => ({ source, target }))),
  ];
}

function traceHasAuthoredSource(
  state: EncounterState,
  tier: CoverTier,
  authoredSourceIds: ReadonlySet<string>,
): boolean {
  return livingOpposingPairs(state).some(({ source, target }) => {
    const trace = traceCombatantLine(state, source.profile.id, target.profile.id);
    return trace.tier === tier && trace.sourceIds.some((id) => authoredSourceIds.has(id));
  });
}

export function generatedLineIsOpen(
  trace: Pick<TerrainLineTrace, 'tier' | 'blocksSight'>,
): boolean {
  return trace.tier === 'none' && !trace.blocksSight;
}

function hasOpenOpposingRay(state: EncounterState): boolean {
  if (livingOpposingPairs(state).some(({ source, target }) =>
    generatedLineIsOpen(traceCombatantLine(state, source.profile.id, target.profile.id)))) return true;
  const occupied = occupiedCombatantCells(state);
  return state.combatants.some((source) => {
    if (source.life !== 'living' || !state.tokens.some((token) =>
      token.combatantId === source.profile.id)) return false;
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (!occupied.has(cellKey(target)) && generatedLineIsOpen(
          traceCombatantLineToCells(state, source.profile.id, [target]),
        )) return true;
      }
    }
    return false;
  });
}

function traceToCellHasAuthoredSource(
  state: EncounterState,
  tier: CoverTier,
  authoredSourceIds: ReadonlySet<string>,
): boolean {
  const occupied = occupiedCombatantCells(state);
  return state.combatants.some((source) => {
    if (source.life !== 'living' || !state.tokens.some((token) =>
      token.combatantId === source.profile.id)) return false;
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (occupied.has(cellKey(target))) continue;
        const trace = traceCombatantLineToCells(state, source.profile.id, [target]);
        if (trace.tier === tier && trace.sourceIds.some((id) => authoredSourceIds.has(id))) {
          return true;
        }
      }
    }
    return false;
  });
}

function occupiedCombatantCells(state: EncounterState): ReadonlySet<string> {
  return new Set(state.combatants.flatMap((combatant) => {
    if (combatant.life === 'dead' || !state.tokens.some((token) =>
      token.combatantId === combatant.profile.id)) return [];
    return combatantSpace(state, combatant.profile.id).cells.map(cellKey);
  }));
}

function footprintIsAvailable(
  footprint: readonly GridCell[],
  occupied: ReadonlySet<string>,

codex
The D630 record identifies the pair as `replay.test.ts` plus `detection-reactions.test.ts` (35 tests at the historical baseline). I also confirmed the architecture: replay projects one DM view plus one player view per PC for every revision, while field caches are keyed by state object identity, so each new revision necessarily starts cold. Next I’m measuring test-level and file-level splits on both revisions.
exec
/bin/bash -lc "/usr/bin/time -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t 'vane-tpk-clean-terminates' --reporter=verbose --no-file-parallelism" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 2596ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] reused /tmp/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/vtt/pc-algorithm-policy.test.ts [ tests/integration/vtt/pc-algorithm-policy.test.ts ]
Error: ENOENT: no such file or directory, mkdir '/tmp/uknhw23qN8W-h7ePMjARr/ssr'
⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  no tests
   Start at  09:52:51
   Duration  2.08s (transform 0ms, setup 0ms, import 0ms, tests 0ms, environment 0ms)

Command exited with non-zero status 1
WALL=2.71 USER=2.39 SYS=0.77 RSS_KB=605228 EXIT=1

exec
/bin/bash -lc 'for d in /dev/shm /run/user/$(id -u) "$PWD/node_modules/.vite"; do printf '"'%s ' \""'$d"; test -d "$d" && test -w "$d" && echo writable || echo not-writable; done; env | rg '"'"'^(TMP|VITE|VITEST|XDG)'"' || true; npx vitest --help | sed -n '1,220p'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 76ms:
vitest/4.1.10

Usage:
  $ vitest [...filters]

Commands:
  run [...filters]      
  related [...filters]  
  watch [...filters]    
  dev [...filters]      
  bench [...filters]    
  init <project>        
  list [...filters]     
  [...filters]          
  complete [shell]      

For more info, run any command with the `--help` flag:
  $ vitest run --help
  $ vitest related --help
  $ vitest watch --help
  $ vitest dev --help
  $ vitest bench --help
  $ vitest init --help
  $ vitest list --help
  $ vitest --help
  $ vitest complete --help
  $ vitest --help --expand-help

Options:
  -v, --version                                              Display version number 
  -r, --root <path>                                          Root path 
  -c, --config <path>                                        Path to config file 
  -u, --update [type]                                        Update snapshot (accepts boolean, "new", "all" or "none") 
  -w, --watch                                                Enable watch mode 
  -t, --testNamePattern <pattern>                            Run tests with full names matching the specified regexp pattern 
  --dir <path>                                               Base directory to scan for the test files 
  --ui                                                       Enable UI 
  --open                                                     Open UI automatically (default: !process.env.CI) 
  --api [port]                                               Specify server port. Note if the port is already being used, Vite will automatically try the next available port so this may not be the actual port the server ends up listening on. If true will be set to 51204. Use '--help --api' for more info. 
  --silent [value]                                           Silent console output from tests. Use 'passed-only' to see logs from failing tests only. 
  --hideSkippedTests                                         Hide logs for skipped tests 
  --reporter <name>                                          Specify reporters (default, agent, minimal, blob, verbose, dot, json, tap, tap-flat, junit, tree, hanging-process, github-actions) 
  --outputFile <filename/-s>                                 Write test results to a file when supporter reporter is also specified, use cac's dot notation for individual outputs of multiple reporters (example: --outputFile.tap=./tap.txt) 
  --coverage                                                 Enable coverage report. Use '--help --coverage' for more info. 
  --mode <name>                                              Override Vite mode (default: test or benchmark) 
  --isolate                                                  Run every test file in isolation. To disable isolation, use --no-isolate (default: true) 
  --globals                                                  Inject apis globally 
  --dom                                                      Mock browser API with happy-dom 
  --browser <name>                                           Run tests in the browser. Equivalent to --browser.enabled (default: false). Use '--help --browser' for more info. 
  --pool <pool>                                              Specify pool, if not running in the browser (default: forks) 
  --execArgv <option>                                        Pass additional arguments to node process when spawning worker_threads or child_process. 
  --vmMemoryLimit <limit>                                    Memory limit for VM pools. If you see memory leaks, try to tinker this value. 
  --fileParallelism                                          Should all test files run in parallel. Use --no-file-parallelism to disable (default: true) 
  --maxWorkers <workers>                                     Maximum number or percentage of workers to run tests in 
  --environment <name>                                       Specify runner environment, if not running in the browser (default: node) 
  --passWithNoTests                                          Pass when no tests are found 
  --logHeapUsage                                             Show the size of heap for each test when running in node 
  --detectAsyncLeaks                                         Detect asynchronous resources leaking from the test file (default: false) 
  --allowOnly                                                Allow tests and suites that are marked as only (default: !process.env.CI) 
  --dangerouslyIgnoreUnhandledErrors                         Ignore any unhandled errors that occur 
  --shard <shards>                                           Test suite shard to execute in a format of <index>/<count> 
  --changed [since]                                          Run tests that are affected by the changed files (default: false) 
  --sequence <options>                                       Options for how tests should be sorted. Use '--help --sequence' for more info. 
  --inspect [[host:]port]                                    Enable Node.js inspector (default: 127.0.0.1:9229) 
  --inspectBrk [[host:]port]                                 Enable Node.js inspector and break before the test starts 
  --testTimeout <timeout>                                    Default timeout of a test in milliseconds (default: 5000). Use 0 to disable timeout completely. 
  --hookTimeout <timeout>                                    Default hook timeout in milliseconds (default: 10000). Use 0 to disable timeout completely. 
  --bail <number>                                            Stop test execution when given number of tests have failed (default: 0) 
  --retry <times>                                            Retry the test specific number of times if it fails (default: 0). Use '--help --retry' for more info. 
  --diff <path>                                              DiffOptions object or a path to a module which exports DiffOptions object. Use '--help --diff' for more info. 
  --exclude <glob>                                           Additional file globs to be excluded from test 
  --expandSnapshotDiff                                       Show full diff when snapshot fails 
  --disableConsoleIntercept                                  Disable automatic interception of console logging (default: false) 
  --typecheck                                                Enable typechecking alongside tests (default: false). Use '--help --typecheck' for more info. 
  --project <name>                                           The name of the project to run if you are using Vitest workspace feature. This can be repeated for multiple projects: --project=1 --project=2. You can also filter projects using wildcards like --project=packages*, and exclude projects with --project=!pattern. 
  --slowTestThreshold <threshold>                            Threshold in milliseconds for a test or suite to be considered slow (default: 300) 
  --teardownTimeout <timeout>                                Default timeout of a teardown function in milliseconds (default: 10000) 
  --cache                                                    Enable cache. Use '--help --cache' for more info. 
  --maxConcurrency <number>                                  Maximum number of concurrent tests and suites during test file execution (default: 5) 
  --expect                                                   Configuration options for expect() matches. Use '--help --expect' for more info. 
  --printConsoleTrace                                        Always print console stack traces 
  --includeTaskLocation                                      Collect test and suite locations in the location property 
  --attachmentsDir <dir>                                     The directory where attachments from context.annotate are stored in (default: .vitest-attachments) 
  --run                                                      Disable watch mode 
  --no-color                                                 Removes colors from the console output (default: true)
  --clearScreen                                              Clear terminal screen when re-running tests during watch mode (default: true) 
  --configLoader <loader>                                    Use bundle to bundle the config with esbuild or runner (experimental) to process it on the fly. This is only available in vite version 6.1.0 and above. (default: bundle) 
  --standalone                                               Start Vitest without running tests. Tests will be running only on change. If browser mode is enabled, the UI will be opened automatically. This option is ignored when CLI file filters are passed. (default: false) 
  --mergeReports [path]                                      Path to a blob reports directory. If this options is used, Vitest won't run any tests, it will only report previously recorded tests 
  --listTags [type]                                          List all available tags instead of running tests. --list-tags=json will output tags in JSON format, unless there are no tags. 
  --clearCache                                               Delete all Vitest caches, including experimental.fsModuleCache, without running any tests. This will reduce the performance in the subsequent test run. 
  --tagsFilter <expression>                                  Run only tests with the specified tags. You can use logical operators && (and), || (or) and ! (not) to create complex expressions, see https://vitest.dev/guide/test-tags#syntax for more information. 
  --strictTags                                               Should Vitest throw an error if test has a tag that is not defined in the config. (default: true) 
  --experimental <features>                                  Experimental features.. Use '--help --experimental' for more info. 
  -h, --help                                                 Display this message 

exec
/bin/bash -lc "TMPDIR=/dev/shm /usr/bin/time -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t 'vane-tpk-clean-terminates' --reporter=verbose --no-file-parallelism" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 14976ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > pc_always_ends_turn + attacks_allies: a bow PC attacks a hostile at range instead of dashing or attacking an ally
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > focus_fire_inverted: prefers the already-damaged enemy over a healthier closer target
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heals_enemies: heals a dying ally rather than a dying enemy
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heal_never_chosen: heals a dying ally before damaging an enemy
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > healing_priority: heals a dying ally before an ally at half hit points
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heal_below_threshold: heals an ally at half of its last-known maximum before attacking
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > ranged_hugs_melee: after shooting at range, moves farther away and stays put rather than provoking when adjacent
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > all four D365 rooms expose two fiction-anchored cover cells on live enemy firing lines
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > pins why every D365 shelter cell provides cover under the corner rule
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Warlock' caster selects reachable cover after 'eldritch-blast'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Cleric' caster selects reachable cover after 'command'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Wizard' caster selects reachable cover after 'slow'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > never_closes_distance: an out-of-reach melee PC dashes, closes, and attacks on its next turn
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > room-1-terminates: four algorithm PCs versus the bundled pack reaches an end state within 4 rounds
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > large-board-terminates: a 14x10 fight clips approach paths, advances rounds, and terminates
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > same-seed-determinism: two room-1 runs produce identical journals and outcomes
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > fixed-seed-room-outcomes: the algorithm party wins rooms 1, 2, 3, and 4 in the live adventuring-day sequence
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > vane-cinder-rite-terminates: both sides receive combat actions and conclude within 20 rounds
 × tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > vane-tpk-clean-terminates: the doomed composition defeats the party after death saves 6670ms
   → Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > nondeterministic_pick: canonical tie-breaking is independent of legal-action input order
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > keeps the monster candidate enumeration and ranking unchanged

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > vane-tpk-clean-terminates: the doomed composition defeats the party after death saves
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/integration/vtt/pc-algorithm-policy.test.ts:967:3
    965|   });
    966|
    967|   it('vane-tpk-clean-terminates: the doomed composition defeats the pa…
       |   ^
    968|     const encounter = composeVaneWarrenFight(
    969|       'cinder-rite',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 20 skipped (21)
   Start at  09:53:05
   Duration  14.57s (transform 2.48s, setup 0ms, import 3.39s, tests 7.40s, environment 0ms)

Command exited with non-zero status 1
WALL=15.10 USER=15.66 SYS=1.90 RSS_KB=978976 EXIT=1

exec
/bin/bash -lc "TMPDIR=/dev/shm /usr/bin/time -f 'BRANCH WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t 'vane-tpk-clean-terminates' --reporter=verbose --no-file-parallelism --testTimeout=20000" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "TMPDIR=/dev/shm /usr/bin/time -f 'MAIN WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t 'vane-tpk-clean-terminates' --reporter=verbose --no-file-parallelism --testTimeout=20000" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 11971ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/e5f6a5f304a5e675.json
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > pc_always_ends_turn + attacks_allies: a bow PC attacks a hostile at range instead of dashing or attacking an ally
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > focus_fire_inverted: prefers the already-damaged enemy over a healthier closer target
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heals_enemies: heals a dying ally rather than a dying enemy
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heal_never_chosen: heals a dying ally before damaging an enemy
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > healing_priority: heals a dying ally before an ally at half hit points
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heal_below_threshold: heals an ally at half of its last-known maximum before attacking
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > ranged_hugs_melee: after shooting at range, moves farther away and stays put rather than provoking when adjacent
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > all four D365 rooms expose two fiction-anchored cover cells on live enemy firing lines
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > pins why every D365 shelter cell provides cover under the corner rule
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Warlock' caster selects reachable cover after 'eldritch-blast'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Cleric' caster selects reachable cover after 'command'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Wizard' caster selects reachable cover after 'slow'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > never_closes_distance: an out-of-reach melee PC dashes, closes, and attacks on its next turn
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > room-1-terminates: four algorithm PCs versus the bundled pack reaches an end state within 4 rounds
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > large-board-terminates: a 14x10 fight clips approach paths, advances rounds, and terminates
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > same-seed-determinism: two room-1 runs produce identical journals and outcomes
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > fixed-seed-room-outcomes: the algorithm party wins rooms 1, 2, 3, and 4 in the live adventuring-day sequence
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > vane-cinder-rite-terminates: both sides receive combat actions and conclude within 20 rounds
 ✓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > vane-tpk-clean-terminates: the doomed composition defeats the party after death saves 3180ms
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > nondeterministic_pick: canonical tie-breaking is independent of legal-action input order
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > keeps the monster candidate enumeration and ranking unchanged

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:53:29
   Duration  11.55s (transform 2.70s, setup 0ms, import 3.71s, tests 3.89s, environment 0ms)

MAIN WALL=12.08 USER=12.29 SYS=1.63 RSS_KB=920008 EXIT=0

 succeeded in 15597ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > pc_always_ends_turn + attacks_allies: a bow PC attacks a hostile at range instead of dashing or attacking an ally
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > focus_fire_inverted: prefers the already-damaged enemy over a healthier closer target
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heals_enemies: heals a dying ally rather than a dying enemy
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heal_never_chosen: heals a dying ally before damaging an enemy
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > healing_priority: heals a dying ally before an ally at half hit points
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > heal_below_threshold: heals an ally at half of its last-known maximum before attacking
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > ranged_hugs_melee: after shooting at range, moves farther away and stays put rather than provoking when adjacent
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > all four D365 rooms expose two fiction-anchored cover cells on live enemy firing lines
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > pins why every D365 shelter cell provides cover under the corner rule
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Warlock' caster selects reachable cover after 'eldritch-blast'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Cleric' caster selects reachable cover after 'command'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > policy_ignores_cover: 'Wizard' caster selects reachable cover after 'slow'
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > never_closes_distance: an out-of-reach melee PC dashes, closes, and attacks on its next turn
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > room-1-terminates: four algorithm PCs versus the bundled pack reaches an end state within 4 rounds
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > large-board-terminates: a 14x10 fight clips approach paths, advances rounds, and terminates
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > same-seed-determinism: two room-1 runs produce identical journals and outcomes
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > fixed-seed-room-outcomes: the algorithm party wins rooms 1, 2, 3, and 4 in the live adventuring-day sequence
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > vane-cinder-rite-terminates: both sides receive combat actions and conclude within 20 rounds
 ✓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > vane-tpk-clean-terminates: the doomed composition defeats the party after death saves 6820ms
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > nondeterministic_pick: canonical tie-breaking is independent of legal-action input order
 ↓ tests/integration/vtt/pc-algorithm-policy.test.ts > player-character AlgorithmController policy > keeps the monster candidate enumeration and ranking unchanged

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:53:29
   Duration  15.16s (transform 2.74s, setup 0ms, import 3.72s, tests 7.52s, environment 0ms)

BRANCH WALL=15.71 USER=16.17 SYS=1.86 RSS_KB=934384 EXIT=0

codex
The isolated comparison reproduces the regression cleanly: branch 6.820 s versus main 3.180 s, an added 3.640 s (2.14×). I’m now collecting worker CPU profiles in `/dev/shm` so the hot-function attribution covers Vitest’s execution process rather than just its parent launcher.
exec
/bin/bash -lc 'prof_dir=$(mktemp -d /dev/shm/vis-prof-branch.XXXXXX); echo PROFILE_DIR=$prof_dir; TMPDIR=/dev/shm NODE_OPTIONS="--cpu-prof --cpu-prof-dir=$prof_dir --cpu-prof-interval=1000" /usr/bin/time -f '"'PROFILE_BRANCH WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t 'vane-tpk-clean-terminates' --reporter=dot --no-file-parallelism --testTimeout=20000; find \""'$prof_dir" -maxdepth 1 -type f -printf '"'%f %s bytes\\n' | sort" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 16951ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
------------------·--

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:53:56
   Duration  16.42s (transform 2.99s, setup 0ms, import 4.10s, tests 7.95s, environment 0ms)

PROFILE_BRANCH WALL=17.06 USER=18.31 SYS=3.00 RSS_KB=942884 EXIT=0
CPU.20260917.095356.18.0.001.cpuprofile 1802664 bytes
CPU.20260917.095356.5.0.001.cpuprofile 568662 bytes

exec
/bin/bash -lc 'prof_dir=$(mktemp -d /dev/shm/vis-prof-main.XXXXXX); echo PROFILE_DIR=$prof_dir; TMPDIR=/dev/shm NODE_OPTIONS="--cpu-prof --cpu-prof-dir=$prof_dir --cpu-prof-interval=1000" /usr/bin/time -f '"'PROFILE_MAIN WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t 'vane-tpk-clean-terminates' --reporter=dot --no-file-parallelism --testTimeout=20000; find \""'$prof_dir" -maxdepth 1 -type f -printf '"'%f %s bytes\\n' | sort" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 11785ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/e5f6a5f304a5e675.json
------------------·--

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:54:18
   Duration  11.29s (transform 2.52s, setup 0ms, import 3.49s, tests 3.90s, environment 0ms)

PROFILE_MAIN WALL=11.90 USER=12.80 SYS=1.85 RSS_KB=944080 EXIT=0
CPU.20260917.095418.10.0.001.cpuprofile 519431 bytes
CPU.20260917.095418.23.0.001.cpuprofile 1729931 bytes

exec
/bin/bash -lc "node --input-type=module -e '
import fs from \"node:fs\";
for (const path of process.argv.slice(1)) {
 const p=JSON.parse(fs.readFileSync(path,\"utf8\")); const byId=new Map(p.nodes.map(n=>[n.id,n])); const rows=new Map();
 for(let i=0;i<p.samples.length;i++){const n=byId.get(p.samples[i]); const f=n.callFrame; const us=p.timeDeltas[i]??1000; const url=f.url||\"(native)\"; if("'!url.includes("/src/")&&!url.includes("/tests/")) continue; const key=`${f.functionName||"(anonymous)"}'"\\t"'${url.replace(/''^file:'"\\/\\//,\"\")}:"'${f.lineNumber+1}`; rows.set(key,(rows.get(key)||0)+us);}
 const total=p.timeDeltas.reduce((a,b)=>a+b,0); const app=[...rows].sort((a,b)=>b[1]-a[1]); console.log(`PROFILE ${path} sampled_ms=${(total/1000).toFixed(1)} app_self_ms=${(app.reduce((a,x)=>a+x[1],0)/1000).toFixed(1)}`); for(const [k,us] of app.slice(0,40)) console.log(`${(us/1000).toFixed(1)}'"\\t"'${(100*us/total).toFixed(2)}%'"\\t"'${k}`);
}
'"' /dev/shm/vis-prof-branch.V8Utag/CPU.20260917.095356.18.0.001.cpuprofile /dev/shm/vis-prof-main.HqOfEm/CPU.20260917.095418.23.0.001.cpuprofile" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 0ms:
node:fs:439
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open '/dev/shm/vis-prof-branch.V8Utag/CPU.20260917.095356.18.0.001.cpuprofile'
    at Object.readFileSync (node:fs:439:20)
    at file:///home/vagrant/PhpstormProjects/dnd-wt-seam-verify/[eval1]:4:24
    at ModuleJob.run (node:internal/modules/esm/module_job:413:25)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:268:26)
    at async ModuleLoader.executeModuleJob (node:internal/modules/esm/loader:265:20)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'open',
  path: '/dev/shm/vis-prof-branch.V8Utag/CPU.20260917.095356.18.0.001.cpuprofile'
}

Node.js v24.13.0

exec
/bin/bash -lc 'prof_dir=$(mktemp -d /dev/shm/vis-prof-branch.XXXXXX); TMPDIR=/dev/shm NODE_OPTIONS="--cpu-prof --cpu-prof-dir=$prof_dir --cpu-prof-interval=1000" npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t '"'vane-tpk-clean-terminates' --reporter=dot --no-file-parallelism --testTimeout=20000 >/dev/null; worker="'$(find "$prof_dir" -type f -printf '"'%s %p\\n' | sort -nr | head -1 | cut -d' ' -f2-); echo WORKER_PROFILE_BYTES="'$(stat -c %s "$worker"); node --input-type=module -e '"'
import fs from \"node:fs\"; const path=process.argv[1]; const p=JSON.parse(fs.readFileSync(path,\"utf8\")); const byId=new Map(p.nodes.map(n=>[n.id,n])); const rows=new Map(); const cats=new Map();
for(let i=0;i<p.samples.length;i++){const n=byId.get(p.samples[i]); const f=n.callFrame; const us=p.timeDeltas[i]??1000; const url=(f.url||\"(native)\").replace(/"'^file:'"\\/\\//,\"\"); if(url.includes(\"/src/\")||url.includes(\"/tests/\")){const key="'`${f.functionName||"(anonymous)"}'"\\t"'${url}:${f.lineNumber+1}`; rows.set(key,(rows.get(key)||0)+us);} let cat=url.includes("/src/combat/visibility-field.ts")?"visibility-field":url.includes("/src/combat/cover.ts")?"cover":url.includes("/src/vtt/engine-query-port.ts")?"engine-query-port":url.includes("/src/combat/visibility.ts")?"projection":url.includes("/src/")?"other-src":url.includes("/tests/")?"tests":"runtime+deps"; cats.set(cat,(cats.get(cat)||0)+us);}
const total=p.timeDeltas.reduce((a,b)=>a+b,0); console.log(`BRANCH sampled_ms=${(total/1000).toFixed(1)}`); console.log("CATEGORIES"); for(const [k,v] of [...cats].sort((a,b)=>b[1]-a[1])) console.log(`${k}'"\\t"'${(v/1000).toFixed(1)}'"\\t"'${(100*v/total).toFixed(2)}%`); console.log("TOP_APP_SELF"); for(const [k,us] of [...rows].sort((a,b)=>b[1]-a[1]).slice(0,50)) console.log(`${(us/1000).toFixed(1)}'"\\t"'${(100*us/total).toFixed(2)}%'"\\t"'${k}`);
'"' \""'$worker"' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 15288ms:
WORKER_PROFILE_BYTES=1694548
BRANCH sampled_ms=15055.9
CATEGORIES
runtime+deps	14597.4	96.95%
other-src	452.2	3.00%
tests	6.3	0.04%
TOP_APP_SELF
58.7	0.39%	sourceReadingOrder	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/class-resources-srd.ts:263
42.9	0.28%	serializeCanonicalValue	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/content-identity.ts:131
37.5	0.25%	sha256	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/crypto/sha256.ts:71
13.9	0.09%	occurrenceCount	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/class-resources-srd.ts:273
13.8	0.09%	gateDamageSaveClause	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:782
13.1	0.09%	cloneSqlRow	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/db/codecs.ts:190
12.6	0.08%	execute	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/db/query.ts:40
8.7	0.06%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/class-resources-srd.ts:264
7.0	0.05%	parseSrdSpellDescriptions	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/spells-srd.ts:146
6.4	0.04%	encodeSpellSourceParse	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-parse-cache.ts:165
5.4	0.04%	parseSpellRange	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/domain/spell-range.ts:52
5.4	0.04%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/spells-srd.ts:725
5.3	0.04%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/crypto/sha256.ts:144
5.3	0.04%	setup	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/helpers/spell-source-parse-cache-global-setup.ts:26
4.3	0.03%	seedWeaponMastery	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/weapons-srd.ts:488
4.3	0.03%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/content-identity.ts:180
4.3	0.03%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/srd-subclass-content.ts:133
4.3	0.03%	spellBodyFormsFromFullLayout	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:151
3.8	0.02%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:130
3.4	0.02%	canonicalRuleText	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/content-identity.ts:191
3.3	0.02%	joined	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/spells-srd.ts:103
3.2	0.02%	compareUnicodeCodePoints	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/content-identity.ts:105
3.2	0.02%	bundledAggregates	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/bundled-content-digest-v1.ts:234
3.2	0.02%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/bundled-content-registry-v1.ts:332
3.0	0.02%	splitSafe	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:112
2.9	0.02%	sourceSentences	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:471
2.7	0.02%	allOwned	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/source-content-projector-v1.ts:297
2.5	0.02%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/grants/grant-rule.ts:96
2.2	0.01%	cloneObject	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/grants/grant-rule.ts:94
2.2	0.01%	spellBodyFormsByHeading	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:93
2.2	0.01%	canonicalRow	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/bundled-content-digest-v1.ts:213
2.2	0.01%	seedClassSheetContent	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/sheet-srd.ts:214
2.2	0.01%	sourceFixedSaveDc	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:554
2.2	0.01%	nestedAncestors	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/content-identity.ts:120
2.2	0.01%	seedSpellIdentityV1	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/spells-srd.ts:373
2.1	0.01%	structural	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/spells-srd.ts:92
2.1	0.01%	projectSpellContentAggregateV1	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/spell-content-projector-v1.ts:71
2.1	0.01%	writeBundledSpell	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/spells-srd.ts:417
2.1	0.01%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/bundled-content-registry-v1.ts:350
2.1	0.01%	contentIdentitySet	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/content-identity.ts:207
2.1	0.01%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:60
2.1	0.01%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:156
2.1	0.01%	storedFields	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/spell-content-projector-v1.ts:45
2.1	0.01%	readStoredClassContentV1	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/source-content-projector-v1.ts:575
2.1	0.01%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/class-level-features-srd.ts:145
2.1	0.01%	parseSrdArmorTemplates	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/rules/armor-srd.ts:26
2.1	0.01%	projectStoredSpellRowsContentV1	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/spell-content-projector-v1.ts:247
2.1	0.01%	(anonymous)	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/db/database.ts:60
2.1	0.01%	projectBundledIdentityV1	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/catalog/bundled-content-registry-v1.ts:259
2.1	0.01%	damageOccurrenceGroups	/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/simulation/spell-source-reader.ts:215

exec
/bin/bash -lc 'prof_dir=$(mktemp -d /dev/shm/vis-prof-branch.XXXXXX); TMPDIR=/dev/shm NODE_OPTIONS="--cpu-prof --cpu-prof-dir=$prof_dir --cpu-prof-interval=1000" npx vitest run --configLoader runner tests/integration/vtt/pc-algorithm-policy.test.ts -t '"'vane-tpk-clean-terminates' --reporter=dot --no-file-parallelism --testTimeout=20000 >/dev/null; node --input-type=module -e '
import fs from \"node:fs\"; import path from \"node:path\"; for(const file of fs.readdirSync(process.argv[1])){const full=path.join(process.argv[1],file); const p=JSON.parse(fs.readFileSync(full,\"utf8\")); const total=p.timeDeltas.reduce((a,b)=>a+b,0); const names=new Map(); const byId=new Map(p.nodes.map(n=>[n.id,n])); for(let i=0;i<p.samples.length;i++){const f=byId.get(p.samples[i]).callFrame; const us=p.timeDeltas[i]??1000; const key=f.functionName||\"(anonymous)\"; names.set(key,(names.get(key)||0)+us);} console.log("'`FILE=${file} bytes=${fs.statSync(full).size} sampled_ms=${(total/1000).toFixed(1)} samples=${p.samples.length}`); for(const needle of ["derivedFogCells","evaluateUncachedCell","evaluateCell","traceToCell","traceCombatantLineToCells","traceSpaces","traceCornerLine","projectDmView","projectPlayerView","projectReplayViews","offers","buildOffer","reach"]){const matches=[...names].filter(([k])=>k.includes(needle)); if(matches.length) console.log(needle,matches.map(([k,v])=>`${k}:${(v/1000).toFixed(1)}`).join(","));} console.log("TOP",[...names].sort((a,b)=>b[1]-a[1]).slice(0,20).map(([k,v])=>`${k}:${(v/1000).toFixed(1)}`).join(" | "));}
'"' \""'$prof_dir"' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 15231ms:
FILE=CPU.20260917.095528.17.0.001.cpuprofile bytes=1659719 sampled_ms=14991.9 samples=14053
TOP (idle):9657.1 | (garbage collector):355.3 | (anonymous):324.3 | addUneditedChunk:243.1 | RegExp: [^.]*Dexterity saving throw[^.]*Grappled[^.]*\.[\s\S]{0,240}?grapples[^.]*damage[^.]*4d6[^.]*\.:152.3 | encode$1:151.7 | RegExp: [^.]*Strength saving throw[\s\S]{0,260}?successful save[^.]*spell ends[\s\S]{0,180}?While Restrained[^.]*1d6 Piercing damage[^.]*\.:125.9 | RegExp: [^.]*Constitution saving throw[\s\S]{0,360}?subtracts 1d8 from all its damage rolls[^.]*\.:123.6 | Script:118.4 | RegExp: [^.]*Intelligence saving throw[\s\S]{0,900}?affected target[\s\S]{0,420}?2d8 Psychic damage[^.]*\.:116.3 | RegExp: [^.]*must succeed on a Wisdom saving throw or become cursed[\s\S]{0,520}?extra 1d8 Necrotic damage[^.]*\.:112.1 | genSourceMapUrl:111.0 | RegExp: [^.]*1d6 Fire damage[\s\S]{0,220}?start of each of its turns[\s\S]{0,180}?Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell ends[^.]*\.:108.7 | RegExp: [^.]*Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell has no effect[\s\S]{0,1500}?(?:extra 1d4 damage|1d4[^.]*less damage)[^.]*\.:105.7 | RegExp: [^.]*Wisdom saving throw or have the Charmed condition[\s\S]{0,260}?While Charmed[^.]*5d10 Psychic damage[^.]*\.:101.2 | RegExp: \s+$:93.2 | visit:87.9 | (program):78.5 | decode:78.1 | _runInlinedModule:74.5
FILE=CPU.20260917.095528.4.0.001.cpuprofile bytes=536849 sampled_ms=15292.5 samples=14189
TOP (idle):15061.0 | wrapSafe:50.3 | (anonymous):32.1 | compileFunctionForCJSLoader:18.2 | internalModuleStat:15.1 | (garbage collector):9.6 | compileForInternalLoader:8.6 | reallyExit:8.6 | readFileUtf8:8.5 | (program):7.6 | realpathSync:6.4 | collatorCompare:5.3 | readPackageJSON:3.2 | toRealPath:2.4 | spawn:2.4 | tryPackage:2.2 | wrapModuleLoad:2.1 | load:2.1 | getPathFromURLPosix:2.1 | normalizeString:1.9

exec
/bin/bash -lc "rg --files -g '*vitest*' -g 'vite.config.*' -g 'tests/setup*' | sort; sed -n '1,260p' vite.config.ts 2>/dev/null || true; rg -n \"defineConfig|test:\" *.config.* tests -g '*.ts' | head -100; sed -n '1,180p' tests/integration/vtt/pc-algorithm-policy.test.ts; sed -n '1,180p' tests/unit/vtt/room-generator-los-cover.test.ts; git diff --stat 9f148666..807d2e3c -- src tests/integration/vtt/pc-algorithm-policy.test.ts tests/unit/vtt/room-generator-los-cover.test.ts tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
docs/stryker-vitest-runner-bug.md
scripts/patch-stryker-vitest-runner.mjs
scripts/perf/vitest.config.ts
scripts/prepare-stryker-vitest.mjs
tests/fixtures/gate-evidence/vitest-reporter-collection.gate-fixture.ts
tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-fixture.ts
tests/fixtures/gate-evidence/vitest-reporter-d544-hanging.gate-reporter.mjs
tests/fixtures/gate-evidence/vitest-reporter-d544-timeout.config.mts
tests/fixtures/gate-evidence/vitest-reporter-duplicate.config.mts
tests/fixtures/gate-evidence/vitest-reporter-fail.gate-fixture.ts
tests/fixtures/gate-evidence/vitest-reporter-global.gate-fixture.ts
tests/fixtures/gate-evidence/vitest-reporter-pass.gate-fixture.ts
tests/fixtures/gate-evidence/vitest-reporter.config.mts
tests/fixtures/gate-vitest-passes-on-retry.fixture.ts
tests/fixtures/gate-vitest-post-report-global-setup.mjs
tests/fixtures/gate-vitest-proof.config.mts
tests/fixtures/gate-vitest-success.fixture.ts
tests/integration-supervisor/vitest.config.ts
tools/gate-vitest-evidence-reporter.mjs
tools/gate-vitest.mjs
tools/sim/vitest.config.ts
vite.config.ts
vitest.config.ts
vitest.stryker.config.ts
import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { aiBridge } from './tools/ai-bridge/plugin';
import { bundledLicenseAssets } from './tools/licenses/bundled-license-files';
import {
  appShellCacheName,
  appShellUrl,
  serviceWorkerSource,
  type BuildAsset,
} from './tools/pwa/service-worker';

function deployableAssets(
  root: string,
  directory: string = root,
): BuildAsset[] {
  const assets: BuildAsset[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      assets.push(...deployableAssets(root, path));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const fileName = relative(root, path);
    if (
      fileName === '_headers' ||
      fileName === '_redirects' ||
      fileName === 'service-worker.js'
    ) {
      continue;
    }
    assets.push({ fileName, source: readFileSync(path) });
  }
  return assets;
}

/**
 * THE BUILD SHIPS THE LICENCES IT IS DISTRIBUTED UNDER.
 *
 * `dist/` is the artifact people actually receive, and it carried no licence
 * notice of any kind: the MIT permission notice and the CC-BY-4.0 legalcode
 * both lived only in the repository. `tools/licenses/bundled-license-files.ts`
 * says which repository files travel and where they land; this emits them.
 *
 * `emitFile` rather than a post-build copy, and that is load-bearing. The
 * emitted assets are written during `writeBundle`, so the app-shell plugin's
 * later `writeBundle` scan below already sees them: they are hashed into the cache
 * name and precached like every other shell file. A file copied in AFTER that
 * scan would be present in `dist/` but absent from the service worker's
 * transcription, and `tools/assert-dist-clean.mjs` — which recomputes the shell
 * hash from what it finds on disk — would fail the build.
 *
 * Bytes are read from the repository at build time rather than duplicated here,
 * so there is no second copy of a licence text to keep in sync.
 */
function bundledLicenseTexts(): Plugin {
  let repositoryRoot: string | undefined;
  return {
    name: 'bundled-license-texts',
    apply: 'build',
    configResolved(config) {
      repositoryRoot = config.root;
    },
    generateBundle() {
      if (repositoryRoot === undefined) {
        this.error('The repository root is unavailable for licence emission.');
      }
      for (const asset of bundledLicenseAssets(repositoryRoot)) {
        this.emitFile({
          type: 'asset',
          fileName: asset.fileName,
          source: asset.source,
        });
      }
    },
  };
}

export function selectVttHandoffWorkerAsset(assets: readonly BuildAsset[]): BuildAsset {
  const workers = assets.filter((asset) => /(?:^|\/)worker-entry-[^/]+\.js$/u.test(asset.fileName));
  if (workers.length !== 1) {
    throw new Error(
      workers.length === 0
        ? 'The built VTT handoff Worker asset is unavailable.'
        : 'The built VTT handoff Worker asset is ambiguous.',
    );
  }
  return workers[0]!;
}

function vttHandoffArtifactStamp(): Plugin {
  let outputDirectory: string | undefined;
  return {
    name: 'vtt-handoff-artifact-stamp',
    apply: 'build',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    writeBundle() {
      if (outputDirectory === undefined) throw new Error('VTT handoff output directory is unavailable.');
      const worker = selectVttHandoffWorkerAsset(deployableAssets(outputDirectory));
      const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'],
      }).trim();
      if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error('The build commit is invalid.');
      writeFileSync(join(outputDirectory, 'vtt-handoff-artifact.json'), `${JSON.stringify({
        artifact: 'dist',
        commit,
        worker: {
          url: `/${worker.fileName.replaceAll('\\', '/')}`,
          sha256: createHash('sha256').update(worker.source).digest('hex'),
        },
      })}\n`);
    },
  };
}

/**
 * Production receives a worker built from the finalized Rollup output. The
 * exact shell filenames and bytes mint its cache name, so each build installs
 * into a distinct cache and cache.addAll can make that install atomic.
 *
 * Development serves a no-fetch worker. That keeps real registration testable
 * without taking requests away from Vite, HMR, or Playwright's page-level
 * network interception. Offline behavior belongs to the emitted production
 * worker and its independently checked artifact transcription.
 */
function appShellServiceWorker(): Plugin {
  let outputDirectory: string | undefined;
  return {
    name: 'app-shell-service-worker',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(
        '/service-worker.js',
        (request, response, next) => {
          if (request.method !== 'GET') {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader(
            'Content-Type',
            'text/javascript; charset=utf-8',
          );
          response.setHeader('Cache-Control', 'no-store');
          response.end(
            "self.addEventListener('install', () => undefined);\n",
          );
        },
      );
    },
    writeBundle() {
      if (
        outputDirectory === undefined ||
        !statSync(outputDirectory).isDirectory()
      ) {
        throw new Error('Vite output directory is unavailable for PWA build.');
      }
      const shellAssets = deployableAssets(outputDirectory);
      const cacheName = appShellCacheName(shellAssets);
      const urls = [
        './',
        ...shellAssets.map((asset) => appShellUrl(asset.fileName)),
      ];
      writeFileSync(
        join(outputDirectory, 'service-worker.js'),
        serviceWorkerSource(cacheName, urls),
      );
    },
  };
}

/**
 * ONE DEPENDENCY CACHE PER CHECKOUT.
 *
 * This default used to be a single machine-global path that every git worktree
 * of this repository shared, and two checkouts cannot co-exist in it. Vite's
 * optimizer records the absolute paths of the checkout that last wrote the
 * cache, so the next checkout to start a dev server finds a mismatch and
 * re-optimizes — and a re-optimization changes `browserHash`, which makes Vite
 * tell the connected browser to perform a full reload.
 *
 * That reload is a genuine page load, and it is what made the attribution
 * spec's `expect(loads).toBe(1)` fail intermittently. The assertion was right
 * and the click it guards was fine; the second load was real and had nothing to
 * do with the click. Confirmed A/B/A by replaying a foreign checkout's
 * `_metadata.json` into an otherwise warm cache: consistent cache passes,
 * foreign cache fails with two loads, and Vite rewrites the file back to the
 * running checkout's identity — which is what steals it from the other worktree
 * in turn.
 *
 * playwright.config.ts already gave concurrent checkouts their own PORT for
 * precisely this reason; the cache was the unfixed half of the same problem.
 * Hashing the checkout directory keeps the path stable from run to run, so the
 * cache still stays warm, while making it unique per worktree.
 * `STATIC_APP_CACHE_DIR` still overrides it, as PARALLEL-PLAN.md requires.
 */
const checkoutCacheDir = join(
  tmpdir(),
  `dnd-multiclass-spells-static-vite-${createHash('sha256')
    .update(realpathSync(process.cwd()))
    .digest('hex')
    .slice(0, 12)}`,
);

/**
 * Drizzle is a BUILD-TIME-ONLY dependency: it authors `src/db/schema.sql` and
 * supplies the types the runtime Zod contracts are bound against. A
 * devDependency is not by itself an enforcement boundary — one accidental value
 * import would bundle the whole query builder into the shipped app.
 *
 * This plugin is the real boundary. It fails the production build if any module
 * in any entry graph resolves into a `drizzle-*` package. `apply: 'build'`
 * keeps it out of the dev server and out of vitest, where build-time modules
 * legitimately import Drizzle.
 *
 * IT MUST BE REGISTERED TWICE. This project ships TWO rollup entry graphs —
 * `index` and the sqlite worker — and Vite builds worker graphs through
 * `config.worker.plugins`, a SEPARATE pipeline that does not inherit top-level
 * `plugins`. Registering it only at the top level was verified to leave the
 * worker graph unguarded: a value import in `src/db/worker.ts` bundled
 * drizzle-orm and grew the worker chunk by ~7.4 kB with a clean exit code.
 */
function forbidDrizzleAtRuntime(): Plugin {
  const forbidden = /[\\/]node_modules[\\/](\.vite[\\/]deps[\\/])?drizzle-/;
  return {
    name: 'forbid-drizzle-at-runtime',
    apply: 'build',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (resolved !== null && forbidden.test(resolved.id)) {
        this.error(
          `Drizzle must never reach the runtime bundle. "${source}" resolved ` +
            `to "${resolved.id}" from "${importer ?? '<entry>'}". Import ` +
            'Drizzle types with `import type` only.',
        );
      }
      return resolved;
    },
  };
}
vitest.stryker.config.ts:1:import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
vitest.stryker.config.ts:22:  defineConfig({
vitest.stryker.config.ts:23:    test: {
vite.config.ts:1:import { defineConfig, type Plugin } from 'vite';
vite.config.ts:339:export default defineConfig(({ command }) =>
playwright.config.ts:1:import { defineConfig } from '@playwright/test';
playwright.config.ts:41:export default defineConfig({
drizzle.config.ts:1:import { defineConfig } from 'drizzle-kit';
drizzle.config.ts:3:export default defineConfig({
vitest.config.ts:1:import { configDefaults, defineConfig } from 'vitest/config';
vitest.config.ts:9: * `npm run test:live`.
vitest.config.ts:26:export default defineConfig({
vitest.config.ts:30:  test: {
vitest.config.ts:33:    // .spec.ts under tests/browser and belong to Playwright (npm run test:browser).
tests/live/cli-containment.live-test.ts:4: * run it with `npm run test:live`.
tests/live/cli-containment.live-test.ts:175:      // The control half is what makes it a test: with `--setting-sources
tests/deep-link/playwright.config.ts:1:import { defineConfig } from '@playwright/test';
tests/deep-link/playwright.config.ts:11:export default defineConfig({
tests/types/codec-required.type-test.ts:58: * Invariant-position identity, the standard exact-type test: two conditional
tests/integration/authoring/handlers.test.ts:719:      id: 'test:genuine-cross-boundary-collision',
tests/integration/authoring/handlers.test.ts:728:        id: 'test:genuine-cross-boundary-collision',
tests/unit/combat/roll-provenance.test.ts:27:    occurrenceId: rollOccurrenceId('test:occurrence'),
tests/unit/combat/roll-provenance.test.ts:58:  return Object.fromEntries(componentTotals(rollComponentId('test:component'), spec).outcomes.map((outcome) => [
tests/unit/combat/roll-provenance.test.ts:79:      ...request('shared-path'), occurrenceId: rollOccurrenceId('test:other-occurrence'),
tests/integration/queries/character-sheet.test.ts:291:      kind: 'feat', contentKey: 'test:feat:hardy', name: 'Hardy',
tests/integration/queries/character-sheet.test.ts:298:         'test:feat:hardy', 'Hardy', '2024', 0, '[]'
tests/integration/queries/character-sheet.test.ts:494:      kind: 'feat', contentKey: 'test:feat:armadillo-boon',
tests/integration/queries/character-sheet.test.ts:501:         'test:feat:armadillo-boon', 'Armadillo Boon', '2024', 0, '[]'
tests/unit/combat/visibility-field.test.ts:165:    stackingIdentity: effectStackingIdentity(`test:${condition.toLowerCase()}`),
tests/unit/combat/visibility-field.test.ts:181:    stackingIdentity: effectStackingIdentity(`test:${kind}:${String(rangeFeet)}`),
tests/unit/combat/visibility-field.test.ts:195:    stackingIdentity: effectStackingIdentity(`test:${obscurement}:screen`),
tests/integration/commands/rules-and-sources.test.ts:200:      'test:legacy-holder',
tests/integration/commands/rules-and-sources.test.ts:633:      'test:level-aware-feat',
tests/unit/combat/astral-tower-statblocks.test.ts:65:    id: 'test:vocabulary-decode', name: 'Vocabulary Decode Fixture', armorClass: 10,
tests/unit/rules/sheet.test.ts:72:    class_content_key: `test:class:${String(id)}` as import('../../../src/domain/ids').ContentKey,
tests/integration/commands/undo-rpc.test.ts:173:    const featId = featDefinition('test:undo-add-source', 'Undo Add Source');
tests/integration/commands/undo-rpc.test.ts:205:    const featId = featDefinition('test:undo-remove-source', 'Undo Remove Source');
tests/integration/commands/undo-rpc.test.ts:236:      kind: 'class', contentKey: 'test:undo-cleric', name: 'Cleric',
tests/integration/commands/undo-rpc.test.ts:240:      kind: 'class', contentKey: 'test:undo-wizard', name: 'Wizard',
tests/integration/commands/undo-rpc.test.ts:248:         ('test:undo-cleric', 'Cleric', '2024', 'wisdom', 'full'),
tests/integration/commands/undo-rpc.test.ts:249:         ('test:undo-wizard', 'Wizard', '2024', 'intelligence', 'full')`,
tests/unit/ui/level-up-planned-steps.test.ts:136:    content_key: 'test:class:wizard' as ContentKey,
tests/unit/ui/level-up-planned-steps.test.ts:818:        epicBoonCandidate('test:feat:boon-one', 'Boon One'),
tests/unit/ui/level-up-planned-steps.test.ts:819:        epicBoonCandidate('test:feat:boon-two', 'Boon Two'),
tests/unit/ui/level-up-planned-steps.test.ts:846:    chooseRadio(wizard.element, 'test:feat:boon-one:0');
tests/unit/ui/level-up-planned-steps.test.ts:857:    chooseRadio(wizard.element, 'test:feat:boon-two:0');
tests/unit/ui/level-up-planned-steps.test.ts:974:          selected_class_content_key: 'test:class:wizard',
tests/unit/ui/level-up-planned-steps.test.ts:982:          selected_class_content_key: 'test:class:wizard',
tests/unit/ui/level-up-planned-steps.test.ts:990:          selected_class_content_key: 'test:class:wizard',
tests/unit/ui/level-up-planned-steps.test.ts:998:          selected_class_content_key: 'test:class:wizard',
tests/unit/ui/guided-builder.test.ts:233:      options: [option('test:class:sentinel', 'Sentinel', 10)],
tests/unit/ui/guided-builder.test.ts:250:      options: [option('test:class:unrecorded-die', 'Unrecorded Die', null)],
tests/unit/ui/guided-builder.test.ts:331:    const contentKey = 'test:class:absent-refusal';
tests/unit/ui/guided-builder.test.ts:415:    spell_version_key: `test:${spellName.toLocaleLowerCase().replaceAll(' ', '-')}`,
tests/unit/ui/guided-builder.test.ts:723:        content_key: 'test:background:honesty',
tests/unit/ui/guided-builder.test.ts:882:        'test:background:honesty',
tests/unit/ui/guided-builder.test.ts:966:      'test:background:honesty',
tests/unit/ui/guided-builder.test.ts:1073:        'test:background:honesty',
tests/unit/ui/level-up-feat-steps.test.ts:388:        key: 'test:feat:all-reasons',
tests/unit/ui/level-up-feat-steps.test.ts:398:      '[data-level-up-feat-card="test:feat:all-reasons"]',
tests/integration/commands/ability-and-slot.test.ts:173:  test: Fixture,
tests/unit/combat/spells-batch-two.test.ts:190:        stackingIdentity: effectStackingIdentity('test:invisible'), stacking: 'coexist', repeatedSave: null,
tests/integration/commands/items.test.ts:264:      kind: 'feat', contentKey: 'test:cascade-feat', name: 'Cascade Feat',
tests/integration/commands/items.test.ts:270:       ) VALUES ('test:cascade-feat', 'Cascade Feat', '2024', 0)`,
tests/unit/ui/agent-reference.test.ts:812:   * false claim is worse than no test: it makes the falsehood look checked.
tests/unit/schema-check-constraints.test.ts:23: *    That would be an echo of the artifact under test: it would fail on a typo
tests/unit/db/migrations.test.ts:2658:       ) VALUES (1, 'test:class', 'Migration Class', 'expanded', 'none');
tests/unit/db/migrations.test.ts:2661:       ) VALUES (2, 'test:subclass', 1, 'Migration Subclass', 'expanded');
tests/unit/db/migrations.test.ts:2674:         4, 'test:named', 1, 'Named Attack', 'expanded', 'Level 5+',
tests/unit/db/migrations.test.ts:3107:         ('test:spear', 'Spear', 'simple_melee', 'dice', '1d6', 'Piercing',
tests/unit/db/migrations.test.ts:3109:         ('test:shortbow', 'Shortbow', 'simple_ranged', 'dice', '1d6',
tests/unit/db/migrations.test.ts:3111:         ('test:glaive', 'Glaive', 'martial_melee', 'dice', '1d10',
tests/unit/db/migrations.test.ts:3113:         ('test:longbow', 'Longbow', 'martial_ranged', 'dice', '1d8',
tests/unit/ui/level-up-wizard.test.ts:111:    content_key: `test:class:${options.name ?? 'wizard'}` as ContentKey,
tests/unit/ui/level-up-wizard.test.ts:159:              content_key: 'test:subclass:abjurer' as ContentKey,
tests/unit/ui/level-up-wizard.test.ts:1072:          content_key: 'test:class:no-die' as ContentKey,
tests/unit/ui/level-up-wizard.test.ts:1113:          content_key: 'test:class:no-die' as ContentKey,
tests/unit/ui/level-up-wizard.test.ts:1178:          content_key: 'test:class:no-die' as ContentKey,
tests/unit/ui/level-up-wizard.test.ts:1513:      expect.objectContaining({ subclass_content_key: 'test:subclass:abjurer' }),
tests/unit/vtt/flammable-surfaces.test.ts:214:        stackingIdentity: effectStackingIdentity('test:burning-cell-banishment'),
tests/unit/source-is-greppable.test.ts:156:    // The guard's own test: prove the detector fires, against a buffer built
tests/unit/simulation/tokenizer-and-damage-owner-inheritance-near-misses.test.ts:2:// Side-effect import of the module under test: it registers this file in
tests/integration/rules/ability-contributions.test.ts:22:      kind: 'background', contentKey: 'test:background:contribution-layers',
tests/integration/rules/ability-contributions.test.ts:29:         'test:background:contribution-layers',
tests/unit/assets/classic-art-techniques.test.ts:509:  brightest: PaletteColorRef,
tests/unit/vtt/generated-encounter-fixtures.test.ts:310:        approvalId: 'test:increment-9-engine-example',
tests/unit/vtt/generated-encounter-fixtures.test.ts:489:      testApproverIdentity('test:second-approval'),
tests/unit/vtt/party-session-state.test.ts:223:      subject: 'test:room-one-damage',
tests/unit/vtt/party-session-state.test.ts:714:      subject: 'test:crash-probe-damage',
tests/integration/rules/character-level.test.ts:26:    const contentKey = `test:class:${name.toLowerCase()}`;
tests/integration/rules/feat-grants-bridge-skill-gap.test.ts:38: * test: if the app ever starts reading `grant.skills` somewhere, this test
tests/unit/r1-errors/rules-calculation/rules-calculation-guards.test.ts:229:      readEquipmentPackageOptions(db, 'class', 'test:class:moon'),
tests/unit/vtt/footprint-increment-four.test.ts:303:        spellId: 'test:overlay',
tests/unit/vtt/d466-b4-spell-payloads.test.ts:249:          stackingIdentity: effectStackingIdentity('test:ui-unicorn-poisoned'),
tests/integration/builder/guided-creation.test.ts:161:    const missingContentKey = 'test:class:no-such-row';
tests/unit/tools/heldout-runtime-guard.test.ts:163:        "export default {test:{projects:[{extends:'./project.config.mjs'}]}};");
tests/integration/sharing/adversarial.test.ts:104:    classKey: `test:class:${String(id)}`,
tests/integration/sharing/adversarial.test.ts:1720:    const placeholderKey = '2024:example.test:late-placeholder';
tests/integration/builder/guided-background.test.ts:394:            content_key: 'test:background:not-bundled',
tests/integration/catalog/import.test.ts:579:         'expanded:local.test:user-spell', 'spell', 'asserted', 'external',
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AlgorithmController,
  ControllerRegistry,
  type Controller,
  type ControllerDecision,
  type ControllerRequest,
  type LegalActionSummary,
} from '../../../src/combat/controllers';
import { TurnCoordinator } from '../../../src/combat/coordinator';
import {
  coverTierBetweenObjects,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { traceTerrainLine } from '../../../src/combat/cover';
import type { EncounterCommand } from '../../../src/combat/events';
import { gridDistance } from '../../../src/combat/grid';
import { mulberry32 } from '../../../src/combat/random';
import { damageType, dieSides, feet, type CombatantId } from '../../../src/combat/values';
import {
  dmVisibleEncounter,
  projectDmView,
  projectPlayerView,
} from '../../../src/combat/visibility';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import { rpcRegistry } from '../../../src/worker/registry';
import { D365_SAMPLE_DUNGEON, composeD365Room } from '../../../src/vtt/d365-sample-dungeon';
import { loadD365SampleParty, type D365SamplePartyLoad } from '../../../src/vtt/d365-sample-party';
import {
  capturePartySessionState,
  createPartySessionState,
  enterNextRoom,
  takeShortRest,
} from '../../../src/vtt/party-session-state';
import {
  regretReactionLegalActions,
} from '../../../src/vtt/regret/legal-actions';
import { composeVaneWarrenFight } from '../../../src/vtt/vane-warren';
import type { HandlerContext } from '../../../src/worker/handler';
import { monsterProfile, placedToken, playerProfile } from '../../unit/combat/fixtures';
import {
  createSeededRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

class RegistryTransport implements RpcTransport {
  readonly #messages = new Set<(event: MessageEvent<RpcResponse>) => void>();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly context: HandlerContext) {}

  postMessage(message: RpcRequest): void {
    void rpcRegistry.dispatch(message, this.context).then((response) => {
      const event = new MessageEvent<RpcResponse>('message', { data: response });
      for (const listener of this.#messages) listener(event);
    }).catch((error: unknown) => {
      const event = new ErrorEvent('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      for (const listener of this.#errors) listener(event);
    });
  }

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

function attack(
  actor: CombatantId,
  target: CombatantId,
  attackId: string,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor,
    target,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Piercing'),
        dice: { count: 0, sides: dieSides(6), modifier: 2 },
      }],
      critical: false,
      responses: [],
    },
    attackId,
  };
}

function spell(
  actor: CombatantId,
  target: CombatantId,
  spellId: 'cure-wounds' | 'healing-word',
): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  return {
    type: 'cast_spell', actor, spellId, slotLevel: 1, castAsRitual: false,
    casterLevel: 5, attackBonus: 5, saveDc: 13, spellcastingModifier: 3,
    targets: [target], area: null, weaponAttack: null, selectedOption: null,
  };
}

function withHitPointEvent(
  state: EncounterState,
  source: CombatantId,
  target: CombatantId,
  hitPointsAfter: number,
): EncounterState {
  const subject = state.combatants.find((candidate) => candidate.profile.id === target);
  if (subject === undefined) throw new Error(`Missing hit-point event target ${target}.`);
  const hitPointsBefore = subject.hitPoints;
  const lifeState = hitPointsAfter === 0 ? 'dying' as const : 'living' as const;
  return {
    ...state,
    nextEventSequence: state.nextEventSequence + 1,
    combatants: state.combatants.map((candidate) => candidate.profile.id === target
      ? {
          ...candidate,
          hitPoints: hitPointsAfter,
          life: lifeState,
          deathSaves: lifeState === 'dying' ? { successes: 0, failures: 0 } : null,
        }
      : candidate),
    eventLog: [...state.eventLog, {
      sequence: state.nextEventSequence,
      type: 'damage_applied',
      source,
      target,
      amount: hitPointsBefore - hitPointsAfter,
      hitPointsBefore,
      hitPointsAfter,
      lifeState,
      massiveDamage: false,
    }],
  };
}

function startedState(
  combatants: readonly ReturnType<typeof playerProfile>[],
  tokens: readonly ReturnType<typeof placedToken>[],
  columns = 12,
  rows = 3,
): EncounterState {
  const state = createEncounter({
    bounds: { columns, rows },
    combatants,
    tokens,
  });
  return reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
}

function requestFor(
  state: EncounterState,
  actor: CombatantId,
import { describe, expect, it } from 'vitest';
import { combatantSpace, combatantSpaceAt } from '../../../src/combat/combat-rules';
import { createEncounter } from '../../../src/combat/encounter';
import {
  traceCombatantLine,
  traceCombatantLineToCells,
  type TerrainLineTrace,
} from '../../../src/combat/cover';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { isCellInside, type GridCell } from '../../../src/combat/grid';
import { findPath } from '../../../src/combat/movement';
import { terrainBlocking, type CoverTier } from '../../../src/combat/terrain';
import { feet, type CombatantId } from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import {
  generatedLineIsOpen,
  generateRoom,
  type GeneratedRoom,
  type RoomDifficultyProfile,
} from '../../../src/vtt/room-generator';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const FIXTURE_CASES = [
  { difficulty: 'standard', seed: 5_762_001, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json' },
  { difficulty: 'standard', seed: 5_762_002, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json' },
  { difficulty: 'standard', seed: 5_762_003, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json' },
  { difficulty: 'hard', seed: 5_762_101, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json' },
  { difficulty: 'hard', seed: 5_762_102, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json' },
  { difficulty: 'hard', seed: 5_762_103, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json' },
  { difficulty: 'brutal', seed: 5_762_201, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json' },
  { difficulty: 'brutal', seed: 5_762_202, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json' },
  { difficulty: 'brutal', seed: 5_762_203, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json' },
] as const satisfies readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
  readonly path: `tests/fixtures/${string}`;
}[];

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json',
    'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json',
    'tests/fixtures/arena-basis-challenge/seed-5831001.json',
  ],
});

const PROPERTY_CASES: readonly {
  readonly difficulty: RoomDifficultyProfile;
  readonly seed: number;
}[] = (['standard', 'hard', 'brutal'] as const).flatMap((difficulty) =>
  Array.from({ length: 32 }, (_unused, seed) => ({ difficulty, seed })));

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function livingSides(room: GeneratedRoom) {
  const state = room.encounter.state;
  return {
    party: state.combatants.filter((combatant) =>
      combatant.life === 'living' && combatant.profile.kind === 'player_character'),
    monsters: state.combatants.filter((combatant) =>
      combatant.life === 'living' && combatant.profile.kind === 'monster'),
  };
}

function opposingPairTraces(room: GeneratedRoom): readonly TerrainLineTrace[] {
  const state = room.encounter.state;
  const { party, monsters } = livingSides(room);
  return [
    ...party.flatMap((source) => monsters.map((target) =>
      traceCombatantLine(state, source.profile.id, target.profile.id))),
    ...monsters.flatMap((source) => party.map((target) =>
      traceCombatantLine(state, source.profile.id, target.profile.id))),
  ];
}

function creatureToCellTraces(room: GeneratedRoom): readonly TerrainLineTrace[] {
  const state = room.encounter.state;
  const occupied = new Set(state.combatants.flatMap((combatant) =>
    combatant.life === 'dead' ? [] : combatantSpace(state, combatant.profile.id).cells.map(cellKey)));
  return state.combatants.flatMap((source) => {
    if (source.life !== 'living') return [];
    const traces: TerrainLineTrace[] = [];
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const target = { column, row };
        if (!occupied.has(cellKey(target))) {
          traces.push(traceCombatantLineToCells(state, source.profile.id, [target]));
        }
      }
    }
    return traces;
  });
}

function expectFeatureMembership(room: GeneratedRoom): void {
  const state = room.encounter.state;
  const half = room.spec.terrain.find((feature) =>
    feature.kind === 'cover-object' && feature.object.terrainKind === 'half_cover');
  const threeQuarters = room.spec.terrain.find((feature) =>
    feature.kind === 'cover-object' && feature.object.terrainKind === 'three_quarters_cover');
  const wall = room.spec.terrain.find((feature) => feature.kind === 'wall');
  expect(half?.kind).toBe('cover-object');
  expect(threeQuarters?.kind).toBe('cover-object');
  expect(wall?.kind).toBe('wall');
  if (half?.kind !== 'cover-object' || half.object.terrainKind !== 'half_cover' ||
    threeQuarters?.kind !== 'cover-object' ||
    threeQuarters.object.terrainKind !== 'three_quarters_cover' || wall?.kind !== 'wall') {
    throw new Error('los_cover_v1 typed terrain is incomplete.');
  }
  expect(half.object.blocking).toEqual(terrainBlocking('half_cover'));
  expect(threeQuarters.object.blocking).toEqual(terrainBlocking('three_quarters_cover'));
  expect(state.blockedCells).toEqual(wall.cells);

  const occupied = new Set(state.combatants.flatMap((combatant) =>
    combatant.life === 'dead' ? [] : combatantSpace(state, combatant.profile.id).cells.map(cellKey)));
  const doors = new Set(state.worldObjects.filter((object) => object.kind === 'door')
    .flatMap((object) => object.footprint.map(cellKey)));
  const movementBlocking = [threeQuarters.object.footprint, wall.cells];
  const seenBlocking = new Set<string>();
  for (const footprint of [half.object.footprint, threeQuarters.object.footprint, wall.cells]) {
    expect(new Set(footprint.map(cellKey)).size).toBe(footprint.length);
    expect(footprint.every((cell) => isCellInside(state.bounds, cell))).toBe(true);
    expect(footprint.every((cell) => !occupied.has(cellKey(cell)) && !doors.has(cellKey(cell)))).toBe(true);
  }
  for (const footprint of movementBlocking) {
    for (const cell of footprint) {
      expect(seenBlocking.has(cellKey(cell))).toBe(false);
      seenBlocking.add(cellKey(cell));
    }
  }

  const pairTraces = opposingPairTraces(room);
  const cellTraces = creatureToCellTraces(room);
  const allTraces = [...pairTraces, ...cellTraces];
  const halfSource = `object:${String(half.object.id)}`;
  const threeQuartersSource = `object:${String(threeQuarters.object.id)}`;
  const wallSources = new Set(wall.cells.map((cell) => `blocked:${cellKey(cell)}`));
  expect(pairTraces.some((trace) => trace.tier === 'half' && trace.sourceIds.includes(halfSource))).toBe(true);
  expect(pairTraces.some((trace) =>
    trace.tier === 'three_quarters' && trace.sourceIds.includes(threeQuartersSource))).toBe(true);
  expect(allTraces.some((trace) => trace.tier === 'total' && trace.blocksSight &&
    trace.sourceIds.some((id) => wallSources.has(id)))).toBe(true);
  expect(allTraces.some((trace) => trace.tier === 'none' && !trace.blocksSight)).toBe(true);

  for (const object of [half.object, threeQuarters.object]) {
    expect(object.footprint.some((cell) => {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let columnOffset = -1; columnOffset <= 1; columnOffset += 1) {
          if (rowOffset === 0 && columnOffset === 0) continue;
          const adjacent = { column: cell.column + columnOffset, row: cell.row + rowOffset };
          if (isCellInside(state.bounds, adjacent) && !seenBlocking.has(cellKey(adjacent)) &&
            !occupied.has(cellKey(adjacent))) return true;
        }
      }
      return false;
    })).toBe(true);
  }
}

function sideCanChangeLine(
  room: GeneratedRoom,
  actors: readonly { readonly profile: { readonly id: CombatantId; readonly rules: { readonly speed: number } } }[],
 src/combat/combat-rules.ts                      |  21 +-
 src/combat/cover.ts                             | 147 ++++++-
 src/combat/effects.ts                           |   4 +
 src/combat/encounter.ts                         | 197 +++------
 src/combat/statblock.ts                         |   6 +-
 src/combat/visibility-field.ts                  | 560 ++++++++++++++++++++++++
 src/combat/visibility.ts                        |  28 +-
 src/combat/world-objects.ts                     |   2 +-
 src/content/content-pack-operation-schema.ts    |   2 +
 src/content/content-pack.ts                     |   3 +-
 src/vtt/blind-turn-context.ts                   |  17 +-
 src/vtt/d365-sample-dungeon.ts                  |   1 -
 src/vtt/encounter-board.ts                      |   7 +-
 src/vtt/encounter-state-codec.ts                |  21 +-
 src/vtt/engine-query-port.ts                    |  88 +---
 src/vtt/generated-encounter-fixtures.ts         |  14 -
 src/vtt/handoff/fixtures/two-room.ts            |   1 -
 src/vtt/intel/actor-knowledge.ts                |   9 -
 src/vtt/intel/option-outcome.ts                 |   1 +
 src/vtt/mcp/engine-server.ts                    |   3 +
 src/vtt/mcp/entrypoint.ts                       |   9 +-
 src/vtt/mcp/schemas.ts                          |  16 +-
 src/vtt/reference-encounter.ts                  |   2 -
 src/vtt/room-generator.ts                       |  19 +-
 src/vtt/semantic-board-payload.ts               | 120 ++++-
 src/vtt/stored-character-encounter.ts           |   1 -
 src/vtt/test-approved-first-skirmish.ts         |   8 -
 src/vtt/vane-warren.ts                          |   4 -
 tests/unit/vtt/detection-reactions.test.ts      |  35 +-
 tests/unit/vtt/room-generator-los-cover.test.ts |  43 +-
 30 files changed, 1086 insertions(+), 303 deletions(-)

exec
/bin/bash -lc "sed -n '1,140p' vitest.config.ts; sed -n '330,390p' vite.config.ts; rg -n \"function expectProductiveMonsters|function reachesProductiveRegion|buildOfferEnvironment|availableEngineActorOptions|resolveEngineActorOption\" tests/unit/vtt/room-generator-los-cover.test.ts; sed -n '180,300p' tests/unit/vtt/room-generator-los-cover.test.ts; rg -n \"projectDmView\\(|projectPlayerView\\(\" src tests/integration/vtt/pc-algorithm-policy.test.ts | head -120; rg -n \"dmVisibleEncounter\\(|projectDmView\\(\" src/combat/coordinator.ts src/vtt src/combat -g '*.ts' | head -180" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
import { configDefaults, defineConfig } from 'vitest/config';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * `tests/live/*.live-test.ts` probe the real `claude` CLI to check that the
 * bridge's invocation is still capability-free. They cost money, need an
 * authenticated login and need the network, so they are OPT-IN via
 * `npm run test:live`.
 *
 * Note the direction: setting the flag ADDS a suite and clearing it removes only
 * that suite. Nothing in the default set is excluded, skipped or relaxed by this
 * switch — the ordinary run is exactly the run it has always been. (The `-test`
 * suffix does not match the `.test.ts` pattern below, so these files are opt-in
 * by name as well as by flag; verified, not assumed.)
 */
const liveInclusions =
  process.env.AI_BRIDGE_LIVE === '1'
    ? ['tests/live/**/*.live-test.ts']
    : [];
const verdictRecorderSetup =
  process.env.VERDICT_FS_OBSERVATIONS_DIR === undefined
    ? []
    : ['tests/helpers/verdict-fs-recorder-setup.mjs'];

export default defineConfig({
  cacheDir:
    process.env.STATIC_APP_CACHE_DIR ??
    join(tmpdir(), 'dnd-multiclass-spells-static-vitest'),
  test: {
    environment: 'node',
    // Run BOTH unit and integration .test.ts under vitest. Browser tests are
    // .spec.ts under tests/browser and belong to Playwright (npm run test:browser).
    include: ['tests/**/*.test.ts', ...liveInclusions],
    exclude: [...configDefaults.exclude, 'tests/integration-supervisor/**'],
    setupFiles: verdictRecorderSetup,
    /**
     * Derives the SRD spell-source parse ONCE, before any worker is forked,
     * and hands the workers a file path and a key. It is a pure-parse cache
     * and nothing else: the worker re-checks the key against the corpus it is
     * actually holding, re-runs every freeze and every mint itself, and a
     * change to either corpus file or to `spell-source-reader.ts` is a miss
     * and a full re-derivation.
     *
     * Like the live-suite switch above, this adds no suite, excludes nothing
     * and relaxes nothing — it only moves work that already ran 38 times into
     * running once. The reasoning lives in the setup file; the guarantee lives
     * in `src/simulation/spell-source-parse-cache.ts`.
     */
    globalSetup: ['tests/helpers/spell-source-parse-cache-global-setup.ts'],
    // Shared workers require every test to restore mocks, globals, environments,
    // native-prototype mutations, and scoped module mocks at its suite boundary.
    isolate: false,
    // The migration-heavy suite oversubscribes constrained runners when
    // Vitest mirrors the host's full CPU count, causing unrelated fixed-timeout
    // tests to fail under contention. Bound scheduling without changing any
    // suite membership, assertion, or timeout contract.
    maxWorkers: 8,
    clearMocks: true,
    restoreMocks: true,
    unstubGlobals: true,
    unstubEnvs: true,
  },
});
 * (A dynamic `import()` inside the branch would be tidier still, but
 * `--configLoader runner` closes its module runner before the exported function
 * is called, so it fails outright.)
 *
 * The two `forbidDrizzleAtRuntime()` registrations above are left spelled
 * exactly as they were: tests/unit/db/drizzle-is-build-time-only.test.ts asserts
 * on that literal text, and relaxing it to accommodate this change would trade a
 * proven guard for a convenience.
 */
export default defineConfig(({ command }) =>
  command === 'serve'
    ? { ...shared, plugins: [...shared.plugins, aiBridge()] }
    : shared,
);
16:import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
20:import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
30:const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
209:function reachesProductiveRegion(room: GeneratedRoom, actorId: CombatantId): boolean {
240:function expectProductiveMonsters(room: GeneratedRoom): void {
245:    const productive = availableEngineActorOptions(planning, monster.profile.id, OFFER_ENVIRONMENT).some((option) => {
246:      const resolution = resolveEngineActorOption(planning, option, OFFER_ENVIRONMENT);
  actors: readonly { readonly profile: { readonly id: CombatantId; readonly rules: { readonly speed: number } } }[],
  opponents: readonly { readonly profile: { readonly id: CombatantId } }[],
): boolean {
  const state = room.encounter.state;
  const world = encounterMovementWorld(state);
  return actors.some((actor) => opponents.some((opponent) => {
    const token = state.tokens.find((candidate) => candidate.combatantId === actor.profile.id);
    if (token === undefined) return false;
    const current = traceCombatantLine(state, actor.profile.id, opponent.profile.id);
    for (let row = 0; row < state.bounds.rows; row += 1) {
      for (let column = 0; column < state.bounds.columns; column += 1) {
        const destination = { column, row };
        const path = findPath(world, {
          actorId: actor.profile.id,
          start: token.position,
          goal: destination,
          maximumCost: feet(actor.profile.rules.speed),
        });
        if (path.kind !== 'found' || path.cells.length === 0) continue;
        const changed = traceCombatantLine(state, actor.profile.id, opponent.profile.id, {
          sourceAnchor: destination,
        });
        if (changed.tier !== current.tier || changed.blocksSight !== current.blocksSight) return true;
      }
    }
    return false;
  }));
}

function reachesProductiveRegion(room: GeneratedRoom, actorId: CombatantId): boolean {
  const state = room.encounter.state;
  const actor = state.combatants.find((candidate) => candidate.profile.id === actorId);
  const token = state.tokens.find((candidate) => candidate.combatantId === actorId);
  if (actor === undefined || token === undefined || actor.life !== 'living') return true;
  const opponents = state.combatants.filter((candidate) => candidate.life === 'living' &&
    candidate.profile.kind !== actor.profile.kind);
  const world = encounterMovementWorld(state);
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const destination = { column, row };
      const footprint = combatantSpaceAt(state, actorId, destination);
      if (!footprint.cells.every((cell) => isCellInside(state.bounds, cell))) continue;
      if (!opponents.some((opponent) => !traceCombatantLine(
        state,
        actorId,
        opponent.profile.id,
        { sourceAnchor: destination },
      ).blocksSight)) continue;
      const path = findPath(world, {
        actorId,
        start: token.position,
        goal: destination,
        maximumCost: feet(state.bounds.columns * state.bounds.rows * 10),
      });
      if (path.kind === 'found') return true;
    }
  }
  return false;
}

function expectProductiveMonsters(room: GeneratedRoom): void {
  const planning = freshMonsterPlanningState(room.encounter.state);
  const monsters = planning.combatants.filter((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life === 'living');
  for (const monster of monsters) {
    const productive = availableEngineActorOptions(planning, monster.profile.id, OFFER_ENVIRONMENT).some((option) => {
      const resolution = resolveEngineActorOption(planning, option, OFFER_ENVIRONMENT);
      return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
        resolution.mechanics.actionSlots.some((slot) =>
          slot.kind === 'attack' || slot.kind === 'saving_throw' ||
          slot.kind === 'cast_spell' || slot.kind === 'use_world_object'));
    });
    expect(productive, monster.profile.id).toBe(true);
  }
}

describe('D576 los_cover_v1 generator membership', () => {
  it('OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam', () => {
    const source = monsterProfile('generator-seam-source');
    const target = playerProfile('generator-seam-target');
    const state = createEncounter({
      bounds: { columns: 16, rows: 8 },
      combatants: [source, target],
      tokens: [placedToken(source, 14, 5), placedToken(target, 1, 6)],
      blockedCells: [{ column: 8, row: 5 }, { column: 8, row: 6 }],
    });
    const opened = {
      ...state,
      blockedCells: [{ column: 8, row: 5 }],
    };

    // This is the state's only living opposing pair. The (14,6) -> (1,6) ray follows
    // row line 6 between blocker flanks (8,5)/(8,6), without entering either cell.
    const closedTrace = traceCombatantLine(state, source.id, target.id);
    expect(closedTrace).toMatchObject({
      tier: 'half',
      blocksSight: true,
      firstBlockingCell: { column: 8, row: 5 },
    });
    const closedRay = closedTrace.lines.find((line) =>
      line.targetCorner.column === 1 && line.targetCorner.row === 6);
    if (closedRay === undefined) throw new Error('Two-blocker fixture omitted the (14,6) -> (1,6) ray.');
    expect(closedRay).toMatchObject({ tier: 'none', blocksSight: true });
    expect(generatedLineIsOpen(closedRay)).toBe(false);

    // Removing (8,6) opens the same row-line-6 rays because only (8,5) remains.
    const openedTrace = traceCombatantLine(opened, source.id, target.id);
    expect(openedTrace).toMatchObject({ tier: 'none', blocksSight: false });
    const openedRay = openedTrace.lines.find((line) =>
      line.targetCorner.column === 1 && line.targetCorner.row === 6);
    if (openedRay === undefined) throw new Error('One-flank fixture omitted the (14,6) -> (1,6) ray.');
    expect(openedRay).toMatchObject({ tier: 'none', blocksSight: false });
    expect(generatedLineIsOpen(openedRay)).toBe(true);
  });

  it('generated and authored arena fixtures share one strict decoder', () => {
    const generated = generateRoom(5_762_001, { terrainProfile: 'los_cover_v1' });
    expect(canonicalJson(decodeArenaBasisEnvelopeV1(generated, { mode: 'legacy_basis' }).encounter.state))
      .toBe(canonicalJson(generated.encounter.state));
    const authoredText = inputs.fixtures.readText('tests/fixtures/arena-basis-challenge/seed-5831001.json');
    const authored = decodeArenaBasisEnvelopeV1(JSON.parse(authoredText) as unknown, { mode: 'challenge' });
tests/integration/vtt/pc-algorithm-policy.test.ts:188:    visibleState: projectPlayerView(state, { seatId: String(actor), combatantId: actor }),
tests/integration/vtt/pc-algorithm-policy.test.ts:333:      dmVisibleEncounter(projectDmView(state)),
tests/integration/vtt/pc-algorithm-policy.test.ts:1048:      dmVisibleEncounter(projectDmView(state)),
src/combat/visibility.ts:506:export function projectDmView(state: EncounterState): DmView {
src/combat/visibility.ts:555:export function projectPlayerView(state: EncounterState, binding: PlayerSeatBinding): PlayerView {
src/combat/coordinator.ts:588:          visibleState: projectPlayerView(this.#state, {
src/vtt/semantic-board-payload.ts:324:  const foggedCells = projectDmView(state).state.foggedCells;
src/vtt/scripted-skirmish.ts:262:        ? projectPlayerView(state, { seatId: String(actor), combatantId: actor })
src/vtt/scripted-skirmish.ts:263:        : dmVisibleEncounter(projectDmView(state)),
src/vtt/scripted-skirmish.ts:352:      payload: { projection: dmVisibleEncounter(projectDmView(state)), fakeExchange: true },
src/vtt/regret/rollout.ts:270:    const state = dmVisibleEncounter(projectDmView(this.encounterState()));
src/vtt/regret/rollout.ts:482:  const projection = dmVisibleEncounter(projectDmView(state));
src/vtt/dm-encounter-host.ts:553:      projectPlayerView(state, {
src/vtt/dm-encounter-host.ts:562:      view: projectDmView(state),
src/vtt/dm-encounter-host.ts:614:      projectPlayerView(this.#coordinator.state(), {
src/vtt/dm-encounter-host.ts:692:        const player = projectPlayerBoard(projectPlayerView(state, {
src/vtt/handoff/fixtures/two-room.ts:157:    view: projectDmView(state),
src/vtt/handoff/fixtures/two-room.ts:167:      projection: projectPlayerBoard(projectPlayerView(state, binding), IDLE),
src/vtt/replay.ts:240:    dm: dmVisibleEncounter(projectDmView(state)),
src/vtt/replay.ts:245:        projection: projectPlayerView(state, {
src/vtt/mcp/entrypoint.ts:885:    .update(canonicalJson(projectDmView(state).state), 'utf8')
src/vtt/mcp/entrypoint.ts:928:    .update(canonicalJson(projectDmView(state).state), 'utf8')
src/vtt/scripted-party-round.ts:409:  const projection = dmVisibleEncounter(projectDmView(state));
src/vtt/scripted-party-round.ts:541:  const projection = dmVisibleEncounter(projectDmView(input.state));
src/combat/visibility.ts:506:export function projectDmView(state: EncounterState): DmView {
src/combat/visibility.ts:671:export function dmVisibleEncounter(view: DmView): DmVisibleEncounterState {
src/vtt/semantic-board-payload.ts:324:  const foggedCells = projectDmView(state).state.foggedCells;
src/vtt/scripted-skirmish.ts:263:        : dmVisibleEncounter(projectDmView(state)),
src/vtt/scripted-skirmish.ts:352:      payload: { projection: dmVisibleEncounter(projectDmView(state)), fakeExchange: true },
src/vtt/regret/rollout.ts:270:    const state = dmVisibleEncounter(projectDmView(this.encounterState()));
src/vtt/regret/rollout.ts:482:  const projection = dmVisibleEncounter(projectDmView(state));
src/vtt/replay.ts:240:    dm: dmVisibleEncounter(projectDmView(state)),
src/vtt/handoff/fixtures/two-room.ts:157:    view: projectDmView(state),
src/vtt/mcp/entrypoint.ts:885:    .update(canonicalJson(projectDmView(state).state), 'utf8')
src/vtt/mcp/entrypoint.ts:928:    .update(canonicalJson(projectDmView(state).state), 'utf8')
src/vtt/scripted-party-round.ts:409:  const projection = dmVisibleEncounter(projectDmView(state));
src/vtt/scripted-party-round.ts:541:  const projection = dmVisibleEncounter(projectDmView(input.state));
src/vtt/dm-encounter-host.ts:562:      view: projectDmView(state),
src/vtt/encounter-projections.ts:490:    encounter: dmVisibleEncounter(input.view),

exec
/bin/bash -lc "rg -n \"declare function startVitest|function startVitest\" node_modules/vitest/dist node_modules/vitest -g '*.d.ts' -g '*.js' | head -30; rg -n \"interface UserConfig|type UserConfig\" node_modules/vitest/dist/config.d.ts node_modules/vitest/dist -g '*.d.ts' | head -30; node --input-type=module -e 'import(\"vitest/node\").then(m=>console.log(Object.keys(m).filter(k=>k.includes(\"Vitest\")||k.includes(\"start\"))))'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 22ms:
[
  'VitestPackageInstaller',
  'VitestPlugin',
  'createVitest',
  'startVitest'
]

exec
/bin/bash -lc 'rg -n "''^(export )?function (traceSpaces|traceCornerLine|firstSharedEdgeBlockingCell|traceCombatantLine|traceCombatantLineToCells)|''^function (traceSpaces|traceCornerLine|firstSharedEdgeBlockingCell)" src/combat/cover.ts; sed -n '"'300,570p' src/combat/cover.ts; rg -n \""'^(export )?function |''^function " src/vtt/engine-query-port.ts | sed -n '"'1,220p'; rg -n \""'^(export )?function |''^function " src/vtt/offers src/vtt/intent-resolver.ts | head -250' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
304:function firstSharedEdgeBlockingCell(
338:function traceCornerLine(
466:function traceSpaces(
570:export function traceCombatantLine(
601:export function traceCombatantLineToCells(
      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)
    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
}

function firstSharedEdgeBlockingCell(
  from: CornerPoint,
  to: CornerPoint,
  sightBlockingAt: (cell: GridCell) => boolean,
): GridCell | null {
  if (from.row === to.row && Number.isInteger(from.row)) {
    const direction = from.column < to.column ? 1 : -1;
    for (
      let column = direction === 1 ? from.column : from.column - 1;
      direction === 1 ? column < to.column : column >= to.column;
      column += direction
    ) {
      const upper = { column, row: from.row - 1 };
      const lower = { column, row: from.row };
      // Deterministic pair choice: the flanking cell with the lower row wins.
      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;
    }
  }
  if (from.column === to.column && Number.isInteger(from.column)) {
    const direction = from.row < to.row ? 1 : -1;
    for (
      let row = direction === 1 ? from.row : from.row - 1;
      direction === 1 ? row < to.row : row >= to.row;
      row += direction
    ) {
      const left = { column: from.column - 1, row };
      const right = { column: from.column, row };
      // Deterministic pair choice: the flanking cell with the lower column wins.
      if (sightBlockingAt(left) && sightBlockingAt(right)) return left;
    }
  }
  return null;
}

function traceCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],
  sightBlockingAt: (cell: GridCell) => boolean,
): TerrainCornerLineTrace {
  const interveningCells = rasterizeCornerLine(from, to, candidates);
  let tier: CoverTier = 'none';
  let strongest: TerrainLineSource[] = [];
  let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);
  for (const cell of interveningCells) {
    if (sightBlockingAt(cell) && firstBlockingCell === null) {
      firstBlockingCell = { ...cell };
    }
    for (const source of sourcesAt(cell)) {
      const comparison = coverRank(source.tier) - coverRank(tier);
      if (comparison > 0) {
        tier = source.tier;
        strongest = [source];
      } else if (comparison === 0) {
        strongest.push(source);
      }
    }
  }
  const sources = uniqueSources(strongest);
  return {
    targetCorner: { ...to },
    interveningCells,
    tier,
    blocksSight: firstBlockingCell !== null,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell,
  };
}

const COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];

function countTier(obstructedLineCount: number): CoverTier {
  if (obstructedLineCount === 0) return 'none';
  if (obstructedLineCount <= 2) return 'half';
  if (obstructedLineCount === 3) return 'three_quarters';
  return 'total';
}

function aggregateCornerLines(
  sourceCorner: CornerPoint,
  lines: readonly TerrainCornerLineTrace[],
  sourceCell: GridCell,
  targetCell: GridCell,
): TerrainLineTrace {
  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);
  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');
  const obstructed = lines.filter((line) => line.tier !== 'none');
  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>
    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');
  const tier = physicalBlocksCover
    ? 'total'
    : COVER_TIER_BY_RANK[Math.min(
        coverRank(countTier(obstructed.length)),
        coverRank(strongestLineTier),
        coverRank('three_quarters'),
      )] ?? 'none';
  const sources = tier === 'none'
    ? []
    : uniqueSources(obstructed
        .filter((line) => line.tier === strongestLineTier)
        .flatMap((line) => line.sources));
  const interveningCells = [...new Map(lines
    .flatMap((line) => line.interveningCells)
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;
  return {
    sourceCell: { ...sourceCell },
    targetCell: { ...targetCell },
    sourceCorner: { ...sourceCorner },
    lines,
    interveningCells,
    tier,
    blocksSight,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,
  };
}

function comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return coverRank(left.tier) - coverRank(right.tier) ||
    left.sourceCorner.row - right.sourceCorner.row ||
    left.sourceCorner.column - right.sourceCorner.column;
}

function compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return left.sourceCorner.row - right.sourceCorner.row ||
    left.sourceCorner.column - right.sourceCorner.column;
}

function nearestCells(
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {
  const sources = [...sourceCells].sort(compareCells);
  const targets = [...targetCells].sort(compareCells);
  const firstSource = sources[0];
  const firstTarget = targets[0];
  if (firstSource === undefined || firstTarget === undefined) {
    throw new RangeError('A line query requires non-empty source and target spaces.');
  }
  let selectedSource = firstSource;
  let selectedTarget = firstTarget;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (const sourceCell of sources) {
    for (const targetCell of targets) {
      const distance = Math.max(
        Math.abs(sourceCell.column - targetCell.column),
        Math.abs(sourceCell.row - targetCell.row),
      );
      if (distance < selectedDistance) {
        selectedSource = sourceCell;
        selectedTarget = targetCell;
        selectedDistance = distance;
      }
    }
  }
  return { sourceCell: selectedSource, targetCell: selectedTarget };
}

function traceSpaces(
  state: EncounterState,
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  options: TerrainLineOptions,
): TerrainLineTrace {
  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);
  const blockerSignature = sightBlockingSignature(sightBlockingCells);
  const traceKey = `${options.includeCreatures === true ? 'creatures' : 'terrain'}:${sourceCells
    .map(cellKey).join(';')}->${targetCells.map(cellKey).join(';')}#sight:${blockerSignature}`;
  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  const cached = stateTraces.get(traceKey);
  if (cached !== undefined) return cached;
  if (!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);
  const nearest = nearestCells(sourceCells, targetCells);
  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));
  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);
  const equivalentTraceKey = `${terrainSourceSignature(
    state,
    options.includeCreatures === true,
    indexedSources,
  )}\0${traceKey}`;
  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);
  if (equivalent !== undefined) {
    stateTraces.set(traceKey, equivalent);
    return equivalent;
  }
  const sourceCorners = outerCorners(sourceCells);
  const targetCorners = outerCorners(targetCells);
  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);
  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);
  const minimumColumn = Math.min(...cornerColumns);
  const maximumColumn = Math.max(...cornerColumns);
  const minimumRow = Math.min(...cornerRows);
  const maximumRow = Math.max(...cornerRows);
  const candidateEntries = sightBlockingCells.length === 0
    ? [...indexedSources.values()]
    : [...new Map([
        ...indexedSources.values(),
        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),
      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];
  const candidates = candidateEntries
    .filter((entry) => !exclusions.has(cellKey(entry.cell)) &&
      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
    .map((entry) => entry.cell);
  const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));
  const sightBlockingAt = (cell: GridCell): boolean => {
    const key = cellKey(cell);
    return !exclusions.has(key) && (
      sightBlockingKeys.has(key) ||
      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)
    );
  };
  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
      candidates,
      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
      sightBlockingAt,
    )),
    nearest.sourceCell,
    nearest.targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  const physicalSelected = traces.reduce(
    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,
    first,
  );
  const blocksSight = traces.every((trace) => trace.blocksSight);
  const opticalSelected = blocksSight
    ? traces.reduce(
        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,
        first,
      )
    : null;
  const selected: TerrainLineTrace = {
    ...physicalSelected,
    blocksSight,
    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,
  };
  stateTraces.set(traceKey, selected);
  retainEquivalentTrace(equivalentTraceKey, selected);
  return selected;
}

/** The canonical 2014 corner-to-corner trace for two bare grid cells. */
export function traceTerrainLine(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], options);
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

export function traceCombatantLine(
257:function isPlanningRollDefenseEffect(effect: EncounterEffect): effect is PlanningRollDefenseEffect {
261:function planningRollDefenseApplies(
285:function planningArmorClass(
317:function planningAttackRollSources(
392:function cellKey(cell: GridCell): string {
396:function combatant(state: EncounterState, id: CombatantId): EncounterCombatantState | null {
400:function rulesFor(subject: EncounterCombatantState): EncounterCombatantState['profile']['rules'] {
413:function memoizedStateResult<Result extends object | number | null>(
429:function queryCombatantSpace(state: EncounterState, id: CombatantId): CreatureSpace<KnownCreatureSize> {
453:function queryCombatantSpaceAt(state: EncounterState, id: CombatantId, anchor: GridCell) {
466:export function enginePlanningHitPoints(
478:export function enginePlanningHitPointMaximum(
494:export function engineConcentrationActive(
512:function engineAppliedConditions(
557:export function enginePlanningConditions(
595:export function enginePlanningSpeedFeet(
654:export function enginePlanningCombatantFacts(
682:export function enginePlanningSemanticZones(
710:export function declaredMonsterActions(state: EncounterState, actorId: CombatantId): readonly MonsterAction[] {
727:export function monsterActions(state: EncounterState, actorId: CombatantId): readonly MonsterAction[] {
732:function executableBonusActions(actions: readonly MonsterBonusAction[]): readonly MonsterBonusAction[] {
736:export function declaredMonsterBonusActions(
756:export function monsterBonusActions(
763:function effectConditionNames(state: EncounterState, id: CombatantId): ReadonlySet<string> {
778:function isIncapacitatedByState(state: EncounterState, id: CombatantId): boolean {
784:function ignoresDifficultTerrain(state: EncounterState, id: CombatantId): boolean {
790:export function engineAttackRangeFeet(action: MonsterAttackAction): number {
798:function projectedAttackRanges(action: MonsterAction): {
830:export function engineActionRangeFeet(
856:export function engineActionRegistryForEnvironment(
996:function positionedCandidates(
1009:function resolveTarget(
1056:function maximumPathCost(state: EncounterState): number {
1060:function path(state: EncounterState, request: EnginePathRequest): EnginePathResult {
1101:function approach(state: EncounterState, request: EngineApproachRequest): EnginePathResult {
1134:function reach(state: EncounterState, request: EngineReachRequest): EngineReachResult {
1208:export function engineTacticalAttackInput(
1344:function stateWithActorAt(
1357:function movementHazards(state: EncounterState): readonly {
1399:function movementOptions(
1484:function projectedTargetConditions(
1501:function projectedMovementState(
1528:export function projectedMovementOptions(
1625:function optionBlessTargets(option: EngineOfferableOption): readonly CombatantId[] {
1634:function optionAttackActionIds(
1657:export function compareTacticalAllocations(
src/vtt/intent-resolver.ts:68:function refused(code: string, summary: string): OptionResolution {
src/vtt/intent-resolver.ts:74:function bindOptionEnvironment(
src/vtt/intent-resolver.ts:82:export function engineActorOptionsForEnvironment(
src/vtt/intent-resolver.ts:93:function resolveSelector(
src/vtt/intent-resolver.ts:103:function targetUse(
src/vtt/intent-resolver.ts:116:function savingThrowTargetUse(
src/vtt/intent-resolver.ts:130:function useTargets(
src/vtt/intent-resolver.ts:168:function targetConstraints(
src/vtt/intent-resolver.ts:263:function positionFits(
src/vtt/intent-resolver.ts:308:function movementResolution(
src/vtt/intent-resolver.ts:382:function sourceSpellcastingAction(
src/vtt/intent-resolver.ts:401:function validateUse(
src/vtt/intent-resolver.ts:469:function resolvedUses(
src/vtt/intent-resolver.ts:532:export function resolveEngineActorOption(
src/vtt/intent-resolver.ts:578:function choiceFitsOption(
src/vtt/intent-resolver.ts:603:export function mechanicsWithChoice(
src/vtt/intent-resolver.ts:635:export function availableEngineActorOptions(
src/vtt/intent-resolver.ts:645:function accepted(
src/vtt/intent-resolver.ts:667:export function createPureTurnProposalResolver(
src/vtt/offers/offer-environment.ts:33:function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
src/vtt/offers/offer-environment.ts:40:function familyMode(value: unknown): EngineOfferFamilyPolicyBody['helpAttack'] | null {
src/vtt/offers/offer-environment.ts:44:export function decodeEngineOfferFamilyPolicy(value: unknown): EngineOfferFamilyPolicy {
src/vtt/offers/offer-environment.ts:73:export function createEngineOfferFamilyPolicy(body: EngineOfferFamilyPolicyBody): EngineOfferFamilyPolicy {
src/vtt/offers/offer-environment.ts:77:export function createDisabledEngineOfferFamilyPolicy(): EngineOfferFamilyPolicy {
src/vtt/offers/offer-environment.ts:87:export function decodeEngineOptionEnvironmentBinding(value: unknown): EngineOptionEnvironmentBinding {
src/vtt/offers/offer-environment.ts:119:export function createEngineOptionEnvironmentBinding(
src/vtt/offers/offer-environment.ts:125:export function createLegacyEngineOptionEnvironmentBinding(): EngineOptionEnvironmentBinding {
src/vtt/offers/offer-generator-registry.ts:8:export function generateEngineOfferEnvelopes(context: OfferGenerationContext) {
src/vtt/offers/build-offer-environment.ts:47:export function buildOfferEnvironment(input: OfferEnvironmentInput): EngineOptionEnvironment {
src/vtt/offers/party-threat-catalog.ts:54:function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
src/vtt/offers/party-threat-catalog.ts:61:function boundedText(value: unknown, label: string): string {
src/vtt/offers/party-threat-catalog.ts:68:function nonNegativeFeet(value: unknown, label: string): number {
src/vtt/offers/party-threat-catalog.ts:75:function decodeRange(value: unknown): PartyThreatRange {
src/vtt/offers/party-threat-catalog.ts:95:function decodeTargeting(value: unknown): PartyThreatTargeting {
src/vtt/offers/party-threat-catalog.ts:126:function decodeResolution(value: unknown): PartyThreatResolution {
src/vtt/offers/party-threat-catalog.ts:142:function decodeEntry(value: unknown): PartyThreatCatalogEntry {
src/vtt/offers/party-threat-catalog.ts:154:function entryKey(entry: PartyThreatCatalogEntry): string {
src/vtt/offers/party-threat-catalog.ts:158:export function decodePartyThreatCatalog(value: unknown): PartyThreatCatalog {
src/vtt/offers/party-threat-catalog.ts:187:export function createPartyThreatCatalog(body: PartyThreatCatalogBody): PartyThreatCatalog {
src/vtt/offers/party-threat-catalog.ts:191:export function createUnrepresentedPartyThreatCatalog(): PartyThreatCatalog {
src/vtt/offers/offer-envelope.ts:78:export function canonicalOfferBody(
src/vtt/offers/offer-codec-primitives.ts:8:export function digestBody(value: object): string {
src/vtt/offers/offer-codec-primitives.ts:12:export function deepFreeze<T>(value: T): T {
src/vtt/offers/offer-codec-primitives.ts:22:export function exactKeys(value: object, keys: readonly string[], label: string): void {
src/vtt/offers/offer-declarations.ts:57:function target(combatantId: CombatantId) {
src/vtt/offers/offer-declarations.ts:61:function livingEnemies(state: EncounterState, actorId: CombatantId): readonly CombatantId[] {
src/vtt/offers/offer-declarations.ts:69:function livingAllies(state: EncounterState, actorId: CombatantId): readonly CombatantId[] {
src/vtt/offers/offer-declarations.ts:77:function offeredRemovableConditions(
src/vtt/offers/offer-declarations.ts:95:function compareExact(
src/vtt/offers/offer-declarations.ts:104:function hardControlSelection(
src/vtt/offers/offer-declarations.ts:200:function combinations<T>(values: readonly T[], count: number): readonly (readonly T[])[] {
src/vtt/offers/offer-declarations.ts:205:export function legalMultiattackCombinations(
src/vtt/offers/offer-declarations.ts:247:function placedAreaSelection(
src/vtt/offers/offer-declarations.ts:313:function standardSpellSelection(
src/vtt/offers/offer-declarations.ts:349:export function standardSpellHasResolvedSelection(
src/vtt/offers/offer-declarations.ts:358:function spellcastingUses(
src/vtt/offers/offer-declarations.ts:415:function mainUses(state: EncounterState, actorId: CombatantId): readonly MainUseOption[] {
src/vtt/offers/offer-declarations.ts:518:function bonusUses(state: EncounterState, actorId: CombatantId): readonly BonusUseOption[] {
src/vtt/offers/offer-declarations.ts:582:function movementWithBonusUse(
src/vtt/offers/offer-declarations.ts:607:export function generateStandardOfferDeclarations(

codex
CPU profiling is not yielding the test worker’s V8 samples—the fork is terminated before its profile flushes—so I’m switching to Vitest’s in-memory transform hook. It wraps selected production functions only for the process lifetime and reports exact call counts, inclusive timings, revision/round fan-out, and observer cardinalities; no repository bytes are changed.
exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import { startVitest } from \"vitest/node\";
const targets=new Map([
 [\"/src/combat/visibility-field.ts\",[\"actualObserverContext\",\"traceToCell\",\"evaluateUncachedCell\",\"evaluateCell\",\"actualObserverField\",\"visibilityField\",\"sightToCreature\",\"detectCombatant\",\"eligibleVisibilityObserverIds\",\"derivedFogCells\"]],
 [\"/src/combat/visibility.ts\",[\"projectDmView\",\"projectPlayerView\"]],
 [\"/src/combat/cover.ts\",[\"firstSharedEdgeBlockingCell\",\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]],
 [\"/src/vtt/engine-query-port.ts\",[\"positionedCandidates\",\"resolveTarget\",\"path\",\"approach\",\"reach\",\"engineTacticalAttackInput\",\"movementOptions\",\"projectedMovementOptions\"]],
 [\"/src/vtt/intent-resolver.ts\",[\"movementResolution\",\"validateUse\",\"resolveEngineActorOption\",\"availableEngineActorOptions\"]],
 [\"/src/vtt/offers/build-offer-environment.ts\",[\"buildOfferEnvironment\"]],
 [\"/src/vtt/room-generator.ts\",[\"generateRoom\"]],
]);
const plugin={name:\"vis-perf-runtime\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0]; const entry=[...targets].find(([suffix])=>clean.endsWith(suffix)); if(entry){const names=entry[1]; const pre="'`'"\\nconst __vp=(globalThis).__VIS_PERF__ ?? ((globalThis).__VIS_PERF__={count:{},ms:{},meta:{}});\\nconst __vpm=(n,a)=>{if(n===\"derivedFogCells\"){const s=a[0],o=a[1];const k=String(s?.revision)+\"/r\"+String(s?.round)+\"/n\"+String(o?.length)+\"/\"+(o??[]).map(String).join(\",\");__vp.meta[k]=(__vp.meta[k]??0)+1;}if(n===\"projectDmView\"||n===\"projectPlayerView\"){const s=a[0];const k=n+\"@\"+String(s?.revision)+\"/r\"+String(s?.round);__vp.meta[k]=(__vp.meta[k]??0)+1;}if(n===\"traceCombatantLine\"||n===\"traceCombatantLineToCells\"){const s=a[0];const anchored=a[3]?.sourceAnchor"'!==undefined?"anchor":"current";const k=n+"@rev"+String(s?.revision)+"/"+anchored;__vp.meta[k]=(__vp.meta[k]??0)+1;}};'"\\n"'`; const wrappers=names.map((n,i)=>`'"\\nconst __vp_orig_"'${i}=${n}; ${n}=function(...a){const t=performance.now();try{return __vp_orig_${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+(performance.now()-t);__vpm(${JSON.stringify(n)},a)}};`).join(""); return {code:pre+code+wrappers,map:null};}
 if(clean.endsWith("/tests/integration/vtt/pc-algorithm-policy.test.ts")){return {code:`import { afterAll as __vpAfterAll } from "vitest";'"\\n"'${code}'"\\n__vpAfterAll(()=>console.log(\"__VIS_PERF__\"+JSON.stringify((globalThis).__VIS_PERF__)));"'`,map:null};}
 }};
const ctx=await startVitest("test",["tests/integration/vtt/pc-algorithm-policy.test.ts"],{configLoader:"runner",testNamePattern:"vane-tpk-clean-terminates",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]}); await ctx.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 15314ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
------------------·stdout | tests/integration/vtt/pc-algorithm-policy.test.ts
__VIS_PERF__{"count":{"actualObserverContext":107458,"firstSharedEdgeBlockingCell":535568,"traceCornerLine":535568,"traceSpaces":348353,"traceCombatantLineToCells":348284,"traceToCell":348284,"evaluateUncachedCell":348284,"evaluateCell":360090,"sightToCreature":88059,"detectCombatant":88059,"traceCombatantLine":131,"eligibleVisibilityObserverIds":206,"derivedFogCells":206,"projectPlayerView":206},"ms":{"actualObserverContext":39.066398000179106,"firstSharedEdgeBlockingCell":50.95292799984054,"traceCornerLine":727.2135259998677,"traceSpaces":4248.477113000077,"traceCombatantLineToCells":4842.792387000198,"traceToCell":4936.075002999524,"evaluateUncachedCell":5098.305793999799,"evaluateCell":5211.754325000324,"sightToCreature":4870.290728999982,"detectCombatant":5289.639491000045,"traceCombatantLine":6.243680000000495,"eligibleVisibilityObserverIds":2.8418100000053528,"derivedFogCells":546.9301559999858,"projectPlayerView":626.3502599999829},"meta":{"traceCombatantLineToCells@rev0/current":932,"traceCombatantLine@rev1/current":9,"traceCombatantLineToCells@rev1/current":1892,"1/r1/n1/combatant:vane-warren:cinder-rite:cinder-wave-1-a":1,"projectPlayerView@1/r1":1,"traceCombatantLine@rev2/current":3,"traceCombatantLineToCells@rev2/current":1894,"2/r1/n1/combatant:vane-warren:cinder-rite:cinder-wave-1-a":1,"projectPlayerView@2/r1":1,"traceCombatantLineToCells@rev3/current":1900,"3/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@3/r1":1,"traceCombatantLine@rev4/current":2,"traceCombatantLineToCells@rev4/current":1910,"4/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@4/r1":1,"traceCombatantLine@rev5/current":3,"traceCombatantLineToCells@rev5/current":1910,"5/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@5/r1":1,"traceCombatantLineToCells@rev6/current":1900,"6/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@6/r1":1,"traceCombatantLineToCells@rev7/current":1900,"7/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@7/r1":1,"traceCombatantLineToCells@rev8/current":1900,"8/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@8/r1":1,"traceCombatantLineToCells@rev9/current":1900,"9/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@9/r1":1,"traceCombatantLineToCells@rev10/current":1900,"10/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@10/r1":1,"traceCombatantLineToCells@rev11/current":1900,"11/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@11/r1":1,"traceCombatantLineToCells@rev12/current":1892,"12/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@12/r1":1,"traceCombatantLineToCells@rev13/current":1892,"13/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@13/r1":1,"traceCombatantLine@rev14/current":1,"traceCombatantLineToCells@rev14/current":1970,"14/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@14/r1":2,"14/r1/n1/combatant:vane-warren:cinder-rite:cinder-wave-2-a":1,"traceCombatantLine@rev15/current":3,"traceCombatantLineToCells@rev15/current":1816,"traceCombatantLineToCells@rev16/current":1892,"16/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@16/r1":1,"traceCombatantLineToCells@rev17/current":1892,"17/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@17/r1":1,"traceCombatantLineToCells@rev18/current":1892,"18/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@18/r1":1,"traceCombatantLineToCells@rev19/current":1892,"19/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@19/r1":1,"traceCombatantLine@rev20/current":1,"traceCombatantLineToCells@rev20/current":1900,"20/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fifth":1,"projectPlayerView@20/r1":1,"traceCombatantLine@rev21/current":3,"traceCombatantLineToCells@rev21/current":1910,"21/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fifth":1,"projectPlayerView@21/r1":1,"traceCombatantLine@rev22/current":3,"traceCombatantLineToCells@rev22/current":1910,"22/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fifth":1,"projectPlayerView@22/r1":1,"traceCombatantLineToCells@rev23/current":1900,"23/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@23/r1":1,"traceCombatantLine@rev24/current":3,"traceCombatantLineToCells@rev24/current":1910,"24/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@24/r1":1,"traceCombatantLine@rev25/current":3,"traceCombatantLineToCells@rev25/current":1910,"25/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@25/r1":1,"traceCombatantLineToCells@rev26/current":1900,"26/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@26/r1":1,"traceCombatantLineToCells@rev27/current":1900,"27/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@27/r1":1,"traceCombatantLineToCells@rev28/current":1900,"28/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@28/r1":1,"traceCombatantLineToCells@rev29/current":1900,"29/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@29/r1":1,"traceCombatantLineToCells@rev30/current":1900,"30/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@30/r1":1,"traceCombatantLineToCells@rev31/current":1900,"31/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@31/r1":1,"traceCombatantLineToCells@rev32/current":1892,"32/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@32/r1":1,"traceCombatantLineToCells@rev33/current":1901,"33/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@33/r1":1,"traceCombatantLineToCells@rev34/current":1892,"34/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@34/r1":1,"traceCombatantLineToCells@rev35/current":1892,"35/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@35/r1":1,"traceCombatantLineToCells@rev36/current":1892,"36/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@36/r1":1,"traceCombatantLineToCells@rev37/current":1892,"37/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@37/r1":1,"traceCombatantLineToCells@rev38/current":1892,"38/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@38/r1":1,"traceCombatantLineToCells@rev39/current":1892,"39/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@39/r1":1,"traceCombatantLineToCells@rev40/current":1892,"40/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@40/r1":1,"traceCombatantLineToCells@rev41/current":1892,"41/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@41/r1":1,"traceCombatantLineToCells@rev42/current":1900,"42/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@42/r1":1,"traceCombatantLineToCells@rev43/current":1900,"43/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@43/r1":1,"traceCombatantLineToCells@rev44/current":1900,"44/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@44/r1":1,"traceCombatantLineToCells@rev45/current":1900,"45/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@45/r1":1,"traceCombatantLineToCells@rev46/current":1900,"46/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@46/r1":1,"traceCombatantLineToCells@rev47/current":1900,"47/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@47/r1":1,"traceCombatantLineToCells@rev48/current":1900,"48/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@48/r1":1,"traceCombatantLineToCells@rev49/current":1900,"49/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@49/r1":1,"traceCombatantLineToCells@rev50/current":1900,"50/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@50/r1":1,"traceCombatantLineToCells@rev51/current":1900,"51/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@51/r1":1,"traceCombatantLineToCells@rev52/current":1900,"52/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@52/r1":1,"traceCombatantLineToCells@rev53/current":1900,"53/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@53/r1":1,"traceCombatantLineToCells@rev54/current":1900,"54/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@54/r1":1,"traceCombatantLineToCells@rev55/current":1900,"55/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@55/r1":1,"traceCombatantLineToCells@rev56/current":1892,"56/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@56/r1":1,"traceCombatantLine@rev57/current":3,"traceCombatantLineToCells@rev57/current":1902,"57/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@57/r1":1,"traceCombatantLine@rev58/current":3,"traceCombatantLineToCells@rev58/current":1902,"58/r1/n4/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4":1,"projectPlayerView@58/r1":1,"traceCombatantLineToCells@rev59/current":1814,"traceCombatantLineToCells@rev60/current":1892,"60/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@60/r1":1,"traceCombatantLineToCells@rev61/current":1892,"61/r1/n5/combatant:character-1,combatant:character-2,combatant:character-3,combatant:character-4,combatant:character-5":1,"projectPlayerView@61/r1":1,"traceCombatantLine@rev62/current":1,"traceCombatantLineToCells@rev62/current":1892,"62/r1/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@62/r1":1,"traceCombatantLine@rev63/current":2,"traceCombatantLineToCells@rev63/current":1894,"63/r1/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@63/r1":1,"traceCombatantLineToCells@rev64/current":1892,"64/r1/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@64/r1":1,"traceCombatantLineToCells@rev65/current":1892,"65/r1/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@65/r1":1,"traceCombatantLineToCells@rev66/current":1892,"66/r1/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@66/r1":1,"traceCombatantLineToCells@rev67/current":1892,"67/r1/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@67/r1":1,"traceCombatantLineToCells@rev68/current":1892,"68/r1/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@68/r1":1,"traceCombatantLineToCells@rev69/current":1900,"69/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@69/r1":1,"traceCombatantLine@rev70/current":3,"traceCombatantLineToCells@rev70/current":1910,"70/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@70/r1":1,"traceCombatantLine@rev71/current":3,"traceCombatantLineToCells@rev71/current":1910,"71/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@71/r1":1,"traceCombatantLineToCells@rev72/current":1900,"72/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@72/r1":1,"traceCombatantLineToCells@rev73/current":1900,"73/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@73/r1":1,"traceCombatantLineToCells@rev74/current":1900,"74/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@74/r1":1,"traceCombatantLineToCells@rev75/current":1900,"75/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@75/r1":1,"traceCombatantLine@rev76/current":2,"traceCombatantLineToCells@rev76/current":1892,"76/r1/n1/combatant:vane-warren:cinder-rite:cinder-wave-2-a":1,"projectPlayerView@76/r1":1,"traceCombatantLine@rev77/current":2,"traceCombatantLineToCells@rev77/current":1894,"77/r1/n1/combatant:vane-warren:cinder-rite:cinder-wave-2-a":1,"projectPlayerView@77/r1":1,"traceCombatantLineToCells@rev78/current":1892,"78/r1/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@78/r1":1,"traceCombatantLine@rev79/current":3,"traceCombatantLineToCells@rev79/current":1894,"79/r1/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@79/r1":1,"traceCombatantLine@rev80/current":3,"traceCombatantLineToCells@rev80/current":1894,"80/r1/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@80/r1":1,"traceCombatantLineToCells@rev81/current":1892,"81/r1/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@81/r1":1,"traceCombatantLine@rev82/current":1,"traceCombatantLineToCells@rev82/current":1892,"82/r1/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@82/r1":1,"traceCombatantLineToCells@rev83/current":1892,"83/r1/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@83/r1":1,"traceCombatantLineToCells@rev84/current":1892,"84/r1/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@84/r1":1,"traceCombatantLineToCells@rev85/current":1900,"85/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@85/r1":1,"traceCombatantLine@rev86/current":3,"traceCombatantLineToCells@rev86/current":1910,"86/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@86/r1":1,"traceCombatantLine@rev87/current":3,"traceCombatantLineToCells@rev87/current":1749,"87/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@87/r1":1,"traceCombatantLine@rev88/current":1,"traceCombatantLineToCells@rev88/current":1739,"88/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@88/r1":1,"traceCombatantLineToCells@rev89/current":1739,"89/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@89/r1":1,"traceCombatantLineToCells@rev90/current":1739,"90/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@90/r1":1,"traceCombatantLineToCells@rev91/current":1739,"91/r1/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@91/r1":1,"traceCombatantLine@rev92/current":1,"traceCombatantLineToCells@rev92/current":1731,"92/r2/n1/combatant:vane-warren:cinder-rite:cinder-wave-1-a":1,"projectPlayerView@92/r2":1,"traceCombatantLine@rev93/current":2,"traceCombatantLineToCells@rev93/current":1733,"93/r2/n1/combatant:vane-warren:cinder-rite:cinder-wave-1-a":1,"projectPlayerView@93/r2":1,"traceCombatantLine@rev94/current":3,"traceCombatantLineToCells@rev94/current":1661,"traceCombatantLineToCells@rev95/current":1739,"95/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@95/r2":1,"traceCombatantLine@rev96/current":1,"traceCombatantLineToCells@rev96/current":1739,"96/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fifth":1,"projectPlayerView@96/r2":1,"traceCombatantLine@rev97/current":2,"traceCombatantLineToCells@rev97/current":1749,"97/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fifth":1,"projectPlayerView@97/r2":1,"traceCombatantLineToCells@rev98/current":1739,"98/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@98/r2":1,"traceCombatantLine@rev99/current":3,"traceCombatantLineToCells@rev99/current":1749,"99/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@99/r2":1,"traceCombatantLine@rev100/current":3,"traceCombatantLineToCells@rev100/current":1749,"100/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@100/r2":1,"traceCombatantLineToCells@rev101/current":1731,"101/r2/n2/combatant:character-1,combatant:character-5":1,"projectPlayerView@101/r2":1,"traceCombatantLineToCells@rev102/current":1732,"102/r2/n2/combatant:character-1,combatant:character-5":1,"projectPlayerView@102/r2":1,"traceCombatantLineToCells@rev103/current":1652,"traceCombatantLineToCells@rev104/current":1652,"traceCombatantLineToCells@rev105/current":1739,"105/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@105/r2":1,"traceCombatantLineToCells@rev106/current":1739,"106/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@106/r2":1,"traceCombatantLineToCells@rev107/current":1739,"107/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@107/r2":1,"traceCombatantLineToCells@rev108/current":1739,"108/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@108/r2":1,"traceCombatantLineToCells@rev109/current":1739,"109/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@109/r2":1,"traceCombatantLineToCells@rev110/current":1739,"110/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@110/r2":1,"traceCombatantLineToCells@rev111/current":1739,"111/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@111/r2":1,"traceCombatantLineToCells@rev112/current":1739,"112/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@112/r2":1,"traceCombatantLineToCells@rev113/current":1739,"113/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@113/r2":1,"traceCombatantLineToCells@rev114/current":1739,"114/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@114/r2":1,"traceCombatantLineToCells@rev115/current":1739,"115/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@115/r2":1,"traceCombatantLineToCells@rev116/current":1739,"116/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@116/r2":1,"traceCombatantLineToCells@rev117/current":1739,"117/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@117/r2":1,"traceCombatantLineToCells@rev118/current":1739,"118/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@118/r2":1,"traceCombatantLineToCells@rev119/current":1652,"traceCombatantLineToCells@rev120/current":1494,"traceCombatantLine@rev121/current":1,"traceCombatantLineToCells@rev121/current":1574,"121/r2/n2/combatant:character-1,combatant:character-5":1,"projectPlayerView@121/r2":1,"traceCombatantLine@rev122/current":2,"traceCombatantLineToCells@rev122/current":1583,"122/r2/n2/combatant:character-1,combatant:character-5":1,"projectPlayerView@122/r2":1,"traceCombatantLineToCells@rev123/current":1574,"123/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@123/r2":1,"traceCombatantLine@rev124/current":3,"traceCombatantLineToCells@rev124/current":1576,"124/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@124/r2":1,"traceCombatantLineToCells@rev125/current":1574,"125/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@125/r2":1,"traceCombatantLineToCells@rev126/current":1574,"126/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@126/r2":1,"traceCombatantLineToCells@rev127/current":1574,"127/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@127/r2":1,"traceCombatantLineToCells@rev128/current":1574,"128/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@128/r2":1,"traceCombatantLineToCells@rev129/current":1574,"129/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@129/r2":1,"traceCombatantLineToCells@rev130/current":1574,"130/r2/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@130/r2":1,"traceCombatantLineToCells@rev131/current":1582,"131/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@131/r2":1,"traceCombatantLine@rev132/current":3,"traceCombatantLineToCells@rev132/current":1592,"132/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@132/r2":1,"traceCombatantLine@rev133/current":3,"traceCombatantLineToCells@rev133/current":1439,"133/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@133/r2":1,"traceCombatantLine@rev134/current":2,"traceCombatantLineToCells@rev134/current":1421,"134/r2/n1/combatant:vane-warren:cinder-rite:cinder-wave-2-a":1,"projectPlayerView@134/r2":1,"traceCombatantLine@rev135/current":3,"traceCombatantLineToCells@rev135/current":1423,"135/r2/n1/combatant:vane-warren:cinder-rite:cinder-wave-2-a":1,"projectPlayerView@135/r2":1,"traceCombatantLineToCells@rev136/current":1341,"traceCombatantLineToCells@rev137/current":1421,"137/r2/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@137/r2":1,"traceCombatantLineToCells@rev138/current":1429,"138/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@138/r2":1,"traceCombatantLine@rev139/current":1,"traceCombatantLineToCells@rev139/current":1429,"139/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@139/r2":1,"traceCombatantLineToCells@rev140/current":1429,"140/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@140/r2":1,"traceCombatantLineToCells@rev141/current":1429,"141/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@141/r2":1,"traceCombatantLineToCells@rev142/current":1429,"142/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@142/r2":1,"traceCombatantLineToCells@rev143/current":1429,"143/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@143/r2":1,"traceCombatantLineToCells@rev144/current":1429,"144/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@144/r2":1,"traceCombatantLineToCells@rev145/current":1429,"145/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@145/r2":1,"traceCombatantLineToCells@rev146/current":1429,"146/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@146/r2":1,"traceCombatantLineToCells@rev147/current":1429,"147/r2/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@147/r2":1,"traceCombatantLine@rev148/current":1,"traceCombatantLineToCells@rev148/current":1421,"148/r3/n1/combatant:vane-warren:cinder-rite:cinder-wave-1-a":1,"projectPlayerView@148/r3":1,"traceCombatantLine@rev149/current":2,"traceCombatantLineToCells@rev149/current":1423,"149/r3/n1/combatant:vane-warren:cinder-rite:cinder-wave-1-a":1,"projectPlayerView@149/r3":1,"traceCombatantLine@rev150/current":2,"traceCombatantLineToCells@rev150/current":1429,"150/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@150/r3":1,"traceCombatantLineToCells@rev151/current":1429,"151/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@151/r3":1,"traceCombatantLine@rev152/current":3,"traceCombatantLineToCells@rev152/current":1290,"152/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@152/r3":1,"traceCombatantLineToCells@rev153/current":1280,"153/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@153/r3":1,"traceCombatantLineToCells@rev154/current":1280,"154/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@154/r3":1,"traceCombatantLineToCells@rev155/current":1280,"155/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile":1,"projectPlayerView@155/r3":1,"traceCombatantLine@rev156/current":1,"traceCombatantLineToCells@rev156/current":1280,"156/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fifth":1,"projectPlayerView@156/r3":1,"traceCombatantLineToCells@rev157/current":1280,"157/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fifth":1,"projectPlayerView@157/r3":1,"traceCombatantLineToCells@rev158/current":1280,"158/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@158/r3":1,"traceCombatantLineToCells@rev159/current":1280,"159/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-third":1,"projectPlayerView@159/r3":1,"traceCombatantLineToCells@rev160/current":1272,"160/r3/n1/combatant:character-1":1,"projectPlayerView@160/r3":1,"traceCombatantLine@rev161/current":4,"traceCombatantLineToCells@rev161/current":1290,"161/r3/n1/combatant:character-1":1,"projectPlayerView@161/r3":1,"traceCombatantLineToCells@rev162/current":1280,"162/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@162/r3":1,"traceCombatantLineToCells@rev163/current":1280,"163/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@163/r3":1,"traceCombatantLineToCells@rev164/current":1280,"164/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@164/r3":1,"traceCombatantLineToCells@rev165/current":1280,"165/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@165/r3":1,"traceCombatantLineToCells@rev166/current":1280,"166/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@166/r3":1,"traceCombatantLineToCells@rev167/current":1280,"167/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@167/r3":1,"traceCombatantLineToCells@rev168/current":1280,"168/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@168/r3":1,"traceCombatantLineToCells@rev169/current":1280,"169/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@169/r3":1,"traceCombatantLineToCells@rev170/current":1280,"170/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@170/r3":1,"traceCombatantLineToCells@rev171/current":1280,"171/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@171/r3":1,"traceCombatantLineToCells@rev172/current":1280,"172/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@172/r3":1,"traceCombatantLineToCells@rev173/current":1280,"173/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@173/r3":1,"traceCombatantLineToCells@rev174/current":1280,"174/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@174/r3":1,"traceCombatantLineToCells@rev175/current":1280,"175/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-sixth":1,"projectPlayerView@175/r3":1,"traceCombatantLineToCells@rev176/current":1272,"176/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@176/r3":1,"traceCombatantLine@rev177/current":3,"traceCombatantLineToCells@rev177/current":1274,"177/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@177/r3":1,"traceCombatantLineToCells@rev178/current":1272,"178/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@178/r3":1,"traceCombatantLineToCells@rev179/current":1272,"179/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@179/r3":1,"traceCombatantLineToCells@rev180/current":1272,"180/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@180/r3":1,"traceCombatantLineToCells@rev181/current":1272,"181/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@181/r3":1,"traceCombatantLineToCells@rev182/current":1272,"182/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@182/r3":1,"traceCombatantLineToCells@rev183/current":1272,"183/r3/n1/combatant:vane-warren:cinder-rite:cinder-guard-b":1,"projectPlayerView@183/r3":1,"traceCombatantLineToCells@rev184/current":1280,"184/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@184/r3":1,"traceCombatantLine@rev185/current":3,"traceCombatantLineToCells@rev185/current":1290,"185/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@185/r3":1,"traceCombatantLine@rev186/current":2,"traceCombatantLineToCells@rev186/current":1290,"186/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-second":1,"projectPlayerView@186/r3":1,"traceCombatantLine@rev187/current":2,"traceCombatantLineToCells@rev187/current":1272,"187/r3/n1/combatant:vane-warren:cinder-rite:cinder-wave-2-a":1,"projectPlayerView@187/r3":1,"traceCombatantLine@rev188/current":3,"traceCombatantLineToCells@rev188/current":1274,"188/r3/n1/combatant:vane-warren:cinder-rite:cinder-wave-2-a":1,"projectPlayerView@188/r3":1,"traceCombatantLineToCells@rev189/current":1272,"189/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@189/r3":1,"traceCombatantLineToCells@rev190/current":1272,"190/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@190/r3":1,"traceCombatantLineToCells@rev191/current":1272,"191/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@191/r3":1,"traceCombatantLineToCells@rev192/current":1272,"192/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@192/r3":1,"traceCombatantLineToCells@rev193/current":1272,"193/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@193/r3":1,"traceCombatantLineToCells@rev194/current":1272,"194/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@194/r3":1,"traceCombatantLineToCells@rev195/current":1272,"195/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@195/r3":1,"traceCombatantLineToCells@rev196/current":1272,"196/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@196/r3":1,"traceCombatantLineToCells@rev197/current":1272,"197/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@197/r3":1,"traceCombatantLineToCells@rev198/current":1272,"198/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@198/r3":1,"traceCombatantLineToCells@rev199/current":1272,"199/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@199/r3":1,"traceCombatantLineToCells@rev200/current":1272,"200/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@200/r3":1,"traceCombatantLineToCells@rev201/current":1272,"201/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@201/r3":1,"traceCombatantLineToCells@rev202/current":1272,"202/r3/n1/combatant:vane-warren:cinder-rite:ashmaw":1,"projectPlayerView@202/r3":1,"traceCombatantLineToCells@rev203/current":1280,"203/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@203/r3":1,"traceCombatantLine@rev204/current":1,"traceCombatantLineToCells@rev204/current":1280,"204/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@204/r3":1,"traceCombatantLineToCells@rev205/current":1280,"205/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@205/r3":1,"traceCombatantLineToCells@rev206/current":1280,"206/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@206/r3":1,"traceCombatantLineToCells@rev207/current":1280,"207/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@207/r3":1,"traceCombatantLineToCells@rev208/current":1280,"208/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@208/r3":1,"traceCombatantLineToCells@rev209/current":1280,"209/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@209/r3":1,"traceCombatantLineToCells@rev210/current":1280,"210/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@210/r3":1,"traceCombatantLineToCells@rev211/current":1280,"211/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@211/r3":1,"traceCombatantLineToCells@rev212/current":1280,"212/r3/n1/combatant:vane-warren:cinder-rite:doomed-crocodile-fourth":1,"projectPlayerView@212/r3":1,"traceCombatantLine@rev213/current":1,"traceCombatantLineToCells@rev213/current":1272,"213/r4/n1/combatant:vane-warren:cinder-rite:cinder-wave-1-a":1,"projectPlayerView@213/r4":1,"traceCombatantLine@rev214/current":3,"traceCombatantLineToCells@rev214/current":524}}

--

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:57:14
   Duration  15.12s (transform 2.51s, setup 0ms, import 3.41s, tests 7.91s, environment 0ms)


exec
/bin/bash -lc "rg -n \"cinder-rite|bounds:\" src/vtt/vane-warren.ts | head -80; sed -n '1,260p' src/vtt/vane-warren.ts; sed -n '540,625p' src/combat/coordinator.ts; git show 9f148666:src/combat/visibility.ts | sed -n '480,620p'; git diff 9f148666..807d2e3c -- src/combat/coordinator.ts src/combat/visibility.ts src/combat/visibility-field.ts src/vtt/engine-query-port.ts | sed -n '1,320p'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
69:  'cinder-rite',
127:  'cinder-rite': {
128:    id: 'cinder-rite',
522:  if (scenario !== 'default' && fightId !== 'cinder-rite') {
546:    bounds: { columns: 14, rows: 10 },
755:    bounds: initial.bounds,
1043:      'cinder-rite',
import {
  combatToken,
  monsterCombatantProfile,
  type CombatantProfile,
} from '../combat/combatant';
import {
  createEncounter,
  reduceEncounter,
  type EncounterCommandReducer,
  type EncounterReduction,
  type EncounterState,
  type EncounterReductionOptions,
  type InitiativeEntry,
} from '../combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../combat/events';
import { combatantSpace } from '../combat/combat-rules';
import {
  creatureSpace,
  minimumSpaceDistanceToCells,
  normalPlacementFor,
  placementFor,
  sizedCombatantState,
  spaceFitsBounds,
  spacesIntersect,
  spaceTouchesCellSet,
} from '../combat/creature-space';
import type { GridCell } from '../combat/grid';
import { terrainPassabilityAt } from '../combat/terrain';
import type { Rng } from '../combat/random';
import {
  GREASE_MATERIAL,
  WEB_MATERIAL,
  persistentAreaContains,
  type PersistentArea,
  type PersistentAreaMaterial,
} from '../combat/persistent-areas';
import { lookupBundledMonster } from '../combat/statblocks/companions';
import { feetPoint } from '../combat/templates';
import {
  armorClass,
  combatantId,
  damageType,
  feet,
  persistentAreaId,
  worldObjectId,
  type CombatantId,
  type WorldObjectId,
} from '../combat/values';
import type {
  EncounterEnvironment,
  WorldObject,
} from '../combat/world-objects';
import { exactOrder } from '../domain/exact-table';
import {
  dmWorldObjectOverrideCommand,
  worldObjectClassActionCommands,
} from '../combat/world-object-actions';
import { loadedPartyTurnLegalActions, type LoadedPartyMember } from './party-pack';
import { preloadPartySessionState, type PartySessionState } from './party-session-state';
import { regretTurnLegalActions } from './regret/legal-actions';
import {
  storedPartyControllerIdentities,
  type StoredCharacterEncounter,
} from './stored-character-encounter';

export const VANE_WARREN_ID = 'encounter:vane-warren' as const;
export const VANE_WARREN_SESSION_ID = 'session:vane-warren-flagship' as const;
export const VANE_WARREN_FIGHT_IDS = [
  'cinder-rite',
  'iron-voice',
  'last-muster',
] as const;
export type VaneWarrenFightId = (typeof VANE_WARREN_FIGHT_IDS)[number];

export type VaneWarrenActivation =
  | { readonly kind: 'standing' }
  | { readonly kind: 'alarm_wave'; readonly waveId: string; readonly delayRounds: number }
  | { readonly kind: 'conditional'; readonly condition: 'leader_bloodied' };

export interface VaneWarrenRosterEntry {
  readonly id: string;
  readonly statblockId: string;
  readonly displayName: string;
  readonly position: GridCell;
  readonly activation: VaneWarrenActivation;
}

export interface VaneWarrenAlarmWave {
  readonly id: string;
  readonly delayRounds: number;
  readonly adds: readonly VaneWarrenRosterEntry[];
}

export interface VaneWarrenFight {
  readonly id: VaneWarrenFightId;
  readonly name: string;
  readonly leaderRosterId: string;
  readonly standing: readonly VaneWarrenRosterEntry[];
  readonly alarmWaves: readonly VaneWarrenAlarmWave[];
  readonly conditionalJoiners: readonly VaneWarrenRosterEntry[];
  readonly legendaryActionPool: number;
  readonly targetActionEconomyRatio: 0.4 | 0.8;
}

const standing = { kind: 'standing' } as const;
const bloodied = { kind: 'conditional', condition: 'leader_bloodied' } as const;

function roster(
  id: string,
  statblockId: string,
  displayName: string,
  column: number,
  row: number,
  activation: VaneWarrenActivation = standing,
): VaneWarrenRosterEntry {
  return { id, statblockId, displayName, position: { column, row }, activation };
}

const cinderWaveOne = [
  roster('cinder-wave-1-a', 'statblock:goblin-minion', 'Cinder Runner', 12, 1, { kind: 'alarm_wave', waveId: 'cinder-first-beat', delayRounds: 1 }),
] as const;
const cinderWaveTwo = [
  roster('cinder-wave-2-a', 'statblock:goblin-warrior', 'Vane Spear', 13, 1, { kind: 'alarm_wave', waveId: 'cinder-second-beat', delayRounds: 2 }),
] as const;

const VANE_WARREN_FIGHTS_BY_ID = {
  'cinder-rite': {
    id: 'cinder-rite',
    name: 'The Cinder Rite',
    leaderRosterId: 'ashmaw',
    standing: [
      roster('ashmaw', 'statblock:vane-warren/ashmaw-brute-priest', 'Ashmaw, Cinder Votary', 9, 5),
      roster('cinder-guard-b', 'statblock:goblin-warrior', 'Vane Guard', 10, 4),
    ],
    alarmWaves: [
      { id: 'cinder-first-beat', delayRounds: 1, adds: cinderWaveOne },
      { id: 'cinder-second-beat', delayRounds: 2, adds: cinderWaveTwo },
    ],
    conditionalJoiners: [],
    legendaryActionPool: 0,
    targetActionEconomyRatio: 0.8,
  },
  'iron-voice': {
    id: 'iron-voice',
    name: 'The Iron Voice',
    leaderRosterId: 'marshal-kett',
    standing: [
      roster('marshal-kett', 'statblock:vane-warren/marshal-kett', 'Marshal Kett, the Iron Voice', 9, 5),
    ],
    alarmWaves: [],
    conditionalJoiners: [],
    legendaryActionPool: 1,
    targetActionEconomyRatio: 0.4,
  },
  'last-muster': {
    id: 'last-muster',
    name: 'The Last Muster',
    leaderRosterId: 'commander-sablehook',
    standing: [
      roster('commander-sablehook', 'statblock:hobgoblin-captain', 'Commander Sablehook', 11, 5),
    ],
    alarmWaves: [],
    conditionalJoiners: [
      roster('muster-joiner-a', 'statblock:goblin-warrior', 'Reserve Spear', 12, 3, bloodied),
    ],
    legendaryActionPool: 0,
    targetActionEconomyRatio: 0.4,
  },
} as const satisfies Readonly<Record<VaneWarrenFightId, VaneWarrenFight>>;

export const VANE_WARREN_FIGHTS = exactOrder(
  VANE_WARREN_FIGHTS_BY_ID,
  VANE_WARREN_FIGHT_IDS,
);

export type VaneWarrenRehearsalScenario = 'default' | 'tpk-clean' | 'tpk-recovery';

export interface VaneWarrenTpkScenarioConfig {
  readonly id: Exclude<VaneWarrenRehearsalScenario, 'default'>;
  readonly sessionId: string;
  readonly sessionName: string;
  readonly recovery: 'none' | 'revivify_and_dm_override';
  readonly startingReinforcements: readonly VaneWarrenRosterEntry[];
  readonly playerPositions: readonly GridCell[];
  readonly enemyPositions: Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>>;
}

const TPK_INITIAL_REINFORCEMENTS = [
  ...cinderWaveOne,
  ...cinderWaveTwo,
  roster('doomed-crocodile', 'statblock:giant-crocodile', 'Cinder Maw', 3, 4),
  roster('doomed-crocodile-second', 'statblock:giant-crocodile', 'Second Cinder Maw', 3, 5),
  roster('doomed-crocodile-third', 'statblock:giant-crocodile', 'Third Cinder Maw', 3, 1),
  roster('doomed-crocodile-fourth', 'statblock:giant-crocodile', 'Fourth Cinder Maw', 3, 2),
  roster('doomed-crocodile-fifth', 'statblock:giant-crocodile', 'Fifth Cinder Maw', 3, 6),
  roster('doomed-crocodile-sixth', 'statblock:giant-crocodile', 'Sixth Cinder Maw', 3, 7),
] as const;

const TPK_PLAYER_POSITIONS = [
  { column: 3, row: 1 },
  { column: 4, row: 0 },
  { column: 11, row: 1 },
  { column: 3, row: 8 },
  { column: 7, row: 8 },
] as const;

/** Manually curated completeness oracle; it is not derived from the table. */
export const VANE_WARREN_TPK_REQUIRED_ENEMY_ROSTER_IDS = [
  'ashmaw',
  'cinder-guard-b',
  'cinder-wave-1-a',
  'cinder-wave-2-a',
  'doomed-crocodile',
  'doomed-crocodile-second',
  'doomed-crocodile-third',
  'doomed-crocodile-fourth',
  'doomed-crocodile-fifth',
  'doomed-crocodile-sixth',
] as const;
export type VaneWarrenTpkEnemyRosterId =
  (typeof VANE_WARREN_TPK_REQUIRED_ENEMY_ROSTER_IDS)[number];

const TPK_ENEMY_POSITIONS = {
  ashmaw: { column: 4, row: 3 },
  'cinder-guard-b': { column: 4, row: 5 },
  'cinder-wave-1-a': { column: 5, row: 5 },
  'cinder-wave-2-a': { column: 4, row: 6 },
  'doomed-crocodile': { column: 0, row: 0 },
  'doomed-crocodile-second': { column: 5, row: 0 },
  'doomed-crocodile-third': { column: 8, row: 0 },
  'doomed-crocodile-fourth': { column: 0, row: 7 },
  'doomed-crocodile-fifth': { column: 8, row: 7 },
  'doomed-crocodile-sixth': { column: 11, row: 7 },
} as const satisfies Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>>;

function tpkEnemyPosition(
  positions: Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>>,
  rosterId: string,
): GridCell | undefined {
  for (const requiredId of VANE_WARREN_TPK_REQUIRED_ENEMY_ROSTER_IDS) {
    if (requiredId === rosterId) return positions[requiredId];
  }
  return undefined;
}

/** Rehearsal-only composition variants. Every combatant uses an existing statblock unchanged. */
export const VANE_WARREN_TPK_SCENARIOS = {
  'tpk-clean': {
    id: 'tpk-clean',
    sessionId: 'session:vane-warren-tpk-clean',
    sessionName: 'The Cinder Rite — doomed clean wipe',
    recovery: 'none',
    startingReinforcements: TPK_INITIAL_REINFORCEMENTS,
    playerPositions: TPK_PLAYER_POSITIONS,
    enemyPositions: TPK_ENEMY_POSITIONS,
  },
  'tpk-recovery': {
    id: 'tpk-recovery',
    sessionId: 'session:vane-warren-tpk-recovery',
    sessionName: 'The Cinder Rite — doomed partial recovery',
    controller: Parameters<ControllerRegistry['replace']>[1],
    controllerId?: string,
  ): void {
    this.registry.replace(combatantId, controller, controllerId);
  }

  #record(transition: DurableCoordinatorTransition): void {
    this.#persistence?.record({
      transition,
      encounterState: this.#state,
      coordinatorState: this.coordinatorState(),
      controllers: this.registry.identities(),
    });
  }

  #nextRequestId(kind: ControllerRequest['kind'], actor: CombatantId): string {
    const id = `${kind}:${this.#state.revision}:${actor}:${this.#requestSequence}`;
    this.#requestSequence += 1;
    return id;
  }

  async #decision(
    kind: ControllerRequest['kind'],
    actor: CombatantId,
    legalActions: LegalActionSummary,
    mover?: CombatantId,
  ): Promise<ControllerDecision> {
    for (;;) {
      const generation = this.registry.generationFor(actor);
      const resumed = this.#pendingRequest;
      let request: ControllerRequest;
      if (
        resumed !== null &&
        resumed.kind === kind &&
        resumed.actorId === actor &&
        (kind === 'turn' || (resumed.kind === 'reaction' && resumed.moverId === mover))
      ) {
        request = resumed;
      } else {
        const algorithmParty = this.registry.kindFor(actor) === 'algorithm' &&
          combatant(this.#state, actor).profile.kind === 'player_character'
          ? this.#state.combatants.flatMap((candidate) =>
              candidate.profile.kind === 'player_character' ? [candidate.profile.id] : [])
          : undefined;
        const common = {
          requestId: this.#nextRequestId(kind, actor),
          encounterRevision: this.#state.revision,
          actorId: actor,
          visibleState: projectPlayerView(this.#state, {
            seatId: String(actor),
            combatantId: actor,
            ...(algorithmParty === undefined ? {} : { ownedCombatantIds: algorithmParty }),
          }),
          legalActions,
        };
        request = kind === 'turn'
          ? { ...common, kind }
          : {
              ...common,
              kind,
              moverId:
                mover ??
                (() => {
                  throw new Error('Reaction request requires a mover.');
                })(),
            };
        this.#pendingRequest = request;
        this.#record({ kind: 'controller_request_issued', request });
      }

      const abort = new AbortController();
      this.#pendingAbort.set(actor, abort);
      try {
        const decision = await this.registry.controllerFor(actor).choose(request, abort.signal);
        if (generation !== this.registry.generationFor(actor)) continue;
        if (
          decision.requestId !== request.requestId ||
          decision.encounterRevision !== request.encounterRevision ||
          this.#state.revision !== request.encounterRevision
        ) {
          throw new StaleControllerResponseError('Controller response is stale.');
        }
        this.#pendingRequest = null;
        this.#pendingCommand = decision.action;
        try {
          this.#record({ kind: 'controller_response_received', decision });
      event.type === 'effect_duration_extended'
    ) return [];
    if (event.type === 'initiative_ordered') {
      return [{
        ...event,
        order: event.order.filter((id) => visibleIds.has(id)),
        slots: event.slots
          .map((slot) => slot.filter((id) => visibleIds.has(id)))
          .filter((slot) => slot.length > 0),
      }];
    }
    if (event.type === 'adjudicated') {
      return visibleIds.has(event.target)
        ? [{ sequence: event.sequence, type: 'adjudicated', target: event.target, consequence: event.consequence }]
        : [];
    }
    return eventCombatants(event).every((id) => visibleIds.has(id)) ? [event] : [];
  });
}

/** The only canonical EncounterState -> DM projection function. */
export function projectDmView(state: EncounterState): DmView {
  return {
    audience: 'dm',
    state: {
      config: structuredClone(state.config),
      phase: structuredClone(state.phase),
      rulesEdition: state.rulesEdition,
      hiddenRolls: [...state.hiddenRolls],
      revision: state.revision,
      nextEventSequence: state.nextEventSequence,
      nextDecisionSequence: state.nextDecisionSequence,
      nextEffectSequence: state.nextEffectSequence,
      bounds: structuredClone(state.bounds),
      blockedCells: structuredClone(state.blockedCells),
      worldObjects: structuredClone(state.worldObjects),
      nextWorldObjectSequence: state.nextWorldObjectSequence,
      environment: structuredClone(state.environment),
      foggedCells: structuredClone(state.foggedCells),
      dmNotes: [...state.dmNotes],
      combatants: structuredClone(state.combatants),
      tokens: structuredClone(state.tokens),
      sharedSpaceRelations: structuredClone(state.sharedSpaceRelations),
      adjudicationPending: structuredClone(state.adjudicationPending),
      ...(state.absentTokens === undefined ? {} : { absentTokens: structuredClone(state.absentTokens) }),
      initiative: structuredClone(state.initiative),
      activeCombatant: state.activeCombatant,
      activeInitiativeIndex: state.activeInitiativeIndex,
      round: state.round,
      effects: structuredClone(state.effects),
      persistentAreas: structuredClone(state.persistentAreas),
      nextPersistentAreaSequence: state.nextPersistentAreaSequence,
      ...(state.reevaluatedBranches === undefined ? {} : { reevaluatedBranches: structuredClone(state.reevaluatedBranches) }),
      eventLog: structuredClone(state.eventLog),
      hiddenCombatants: structuredClone(state.hiddenCombatants),
      observationHistory: structuredClone(state.observationHistory),
      ...(state.searchMemories === undefined ? {} : { searchMemories: structuredClone(state.searchMemories) }),
      ...(state.alerting === undefined ? {} : { alerting: structuredClone(state.alerting) }),
      pendingDecisions: structuredClone(state.pendingDecisions),
      reactionPolicies: structuredClone(state.reactionPolicies),
      ...(state.contentPacks === undefined ? {} : { contentPacks: structuredClone(state.contentPacks) }),
      ...(state.equipment === undefined ? {} : { equipment: structuredClone(state.equipment) }),
      ...(state.groundItems === undefined ? {} : { groundItems: structuredClone(state.groundItems) }),
      ...(state.itemContacts === undefined ? {} : { itemContacts: structuredClone(state.itemContacts) }),
    },
  };
}

/** The only canonical EncounterState -> player projection function. */
export function projectPlayerView(state: EncounterState, binding: PlayerSeatBinding): PlayerView {
  if (!state.combatants.some((subject) => subject.profile.id === binding.combatantId)) {
    throw new UnknownPlayerSeatCombatantError(binding.seatId, binding.combatantId);
  }
  const ownedIds = new Set(binding.ownedCombatantIds ?? [binding.combatantId]);
  if (!ownedIds.has(binding.combatantId)) {
    throw new Error(`Player seat ${binding.seatId} does not own its visibility combatant.`);
  }
  const tokensByCombatant = new Map(state.tokens.map((token) => [token.combatantId, token] as const));
  const fog = new Set(state.foggedCells.map(cellKey));
  const hidden = new Set(state.hiddenCombatants.map((entry) => entry.combatant));
  // Hidden creature geometry is never read into a player-safe projection.
  const concealed = new Set(fog);
  const initiativeOrder = new Map(state.initiative.map((entry, index) =>
    [entry.combatant, index] as const));
  const availableObservers = [...ownedIds].filter((observer) =>
    !state.adjudicationPending.some((entry) => entry.combatant === observer));
  const combatants = state.combatants.flatMap((subject): readonly PlayerVisibleCombatant[] => {
    const pending = state.adjudicationPending.find((entry) =>
      entry.combatant === subject.profile.id);
    if (pending !== undefined) {
      if (!ownedIds.has(subject.profile.id)) return [];
      return [{
        id: subject.profile.id,
        name: subject.profile.name,
        kind: combatantSide(state, subject.profile.id),
        life: subject.life,
        placementStatus: 'placement_pending',
        pendingReason: pending.kind,
        active: state.activeCombatant === subject.profile.id,
        formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
        conditions: playerVisibleConditions(state, subject.profile.id, true),
      }];
    }
    const token = tokensByCombatant.get(subject.profile.id);
    if (token === undefined) return [];
    const owned = ownedIds.has(subject.profile.id);
    if (hidden.has(subject.profile.id) ||
      (!owned && !availableObservers.some((observer) => canCombatantSee(state, observer, subject.profile.id)))) return [];
    const space = combatantSpace(state, subject.profile.id);
    if (!owned && space.cells.every((cell) => fog.has(cellKey(cell)))) return [];
    return [{
      id: subject.profile.id,
      name: subject.profile.name,
      kind: combatantSide(state, subject.profile.id),
      life: subject.life,
      placementStatus: 'placed',
      position: { ...token.position },
      effectiveSize: effectiveCreatureSize(state, subject.profile.id),
      placementMode: structuredClone(token.placementMode),
      footprint: space.cells.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
      active: state.activeCombatant === subject.profile.id,
      formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
      conditions: playerVisibleConditions(state, subject.profile.id, owned),
    }];
  }).sort((left, right) =>
    (initiativeOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (initiativeOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER) ||
    String(left.id).localeCompare(String(right.id)));
  const visibleIds = new Set(combatants.map((subject) => subject.id));
  const lastSeen = state.combatants.flatMap((subject): readonly PlayerLastSeenCombatant[] => {
    if (subject.life === 'dead' || visibleIds.has(subject.profile.id) ||
      !tokensByCombatant.has(subject.profile.id)) return [];
    const latest = state.observationHistory
      .filter((entry) => ownedIds.has(entry.observer) && entry.subject === subject.profile.id)
      .sort((left, right) => right.revision - left.revision ||
        String(left.observer).localeCompare(String(right.observer)))[0];
    if (latest === undefined) return [];
    return [{
      id: subject.profile.id,
      name: subject.profile.name,
      kind: combatantSide(state, subject.profile.id),
diff --git a/src/combat/visibility-field.ts b/src/combat/visibility-field.ts
new file mode 100644
index 00000000..653e59b2
--- /dev/null
+++ b/src/combat/visibility-field.ts
@@ -0,0 +1,560 @@
+import type { CombatSense } from './statblock';
+import {
+  combatantConditions,
+  combatantSpace,
+  effectiveCombatRules,
+} from './combat-rules';
+import {
+  traceCombatantLineToCells,
+  traceTerrainLine,
+} from './cover';
+import {
+  minimumSpaceDistance,
+  minimumSpaceDistanceToCells,
+  type CreatureSpace,
+  type KnownCreatureSize,
+} from './creature-space';
+import type { EncounterState } from './encounter';
+import type { GridCell } from './grid';
+import { affectedCells } from './templates';
+import { terrainWallCells } from './terrain';
+import type { CombatantId } from './values';
+import { environmentLightAt } from './world-objects';
+
+export type VisibilityGrade = 'seen' | 'seen_dim' | 'unseen';
+export type SightSense =
+  | 'normal_sight'
+  | 'darkvision'
+  | 'blindsight'
+  | 'truesight'
+  | 'devils_sight';
+
+export type SightOutcome =
+  | {
+      readonly kind: 'visible';
+      readonly grade: 'seen' | 'seen_dim';
+      readonly sense: SightSense;
+    }
+  | {
+      readonly kind: 'unseen';
+      readonly reason: 'blocked' | 'obscured' | 'darkness' | 'out_of_range';
+    };
+
+export type DetectionResult =
+  | {
+      readonly kind: 'seen';
+      readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'devils_sight';
+    }
+  | {
+      readonly kind: 'located';
+      readonly sense: 'tremorsense' | 'web_sense';
+    }
+  | {
+      readonly kind: 'undetected';
+      readonly reason: 'blocked' | 'hidden' | 'invisible' | 'obscured' | 'darkness' | 'out_of_range';
+    };
+
+export interface VisibilityFieldCell {
+  readonly cell: GridCell;
+  readonly grade: VisibilityGrade;
+}
+
+export type VisibilityObserverScope =
+  | { readonly kind: 'dm_party' }
+  | {
+      readonly kind: 'player_seat';
+      readonly ownedIds: ReadonlySet<CombatantId>;
+    };
+
+interface ActualObserver {
+  readonly kind: 'actual';
+  readonly id: CombatantId;
+  readonly space: CreatureSpace<KnownCreatureSize>;
+  readonly senses: readonly CombatSense[];
+  readonly blinded: boolean;
+}
+
+interface VirtualObserver {
+  readonly kind: 'virtual';
+  readonly cell: GridCell;
+}
+
+type CellObserver = ActualObserver | VirtualObserver;
+
+interface CellObscurement {
+  readonly cell: GridCell;
+  readonly light: boolean;
+  readonly heavy: boolean;
+  readonly magicalDarkness: boolean;
+}
+
+interface EvaluationContext {
+  readonly state: EncounterState;
+  readonly observer: CellObserver;
+  readonly obscuredCells: ReadonlyMap<string, CellObscurement>;
+  readonly opaqueCells: readonly GridCell[];
+}
+
+interface DetailedVisibilityFieldCell extends VisibilityFieldCell {
+  readonly outcome: SightOutcome;
+}
+
+const detailedFields = new WeakMap<
+  EncounterState,
+  Map<CombatantId, readonly DetailedVisibilityFieldCell[]>
+>();
+const observerContexts = new WeakMap<EncounterState, Map<CombatantId, EvaluationContext>>();
+const actualCellOutcomes = new WeakMap<
+  EncounterState,
+  Map<CombatantId, Map<string, SightOutcome>>
+>();
+const obscurementByState = new WeakMap<EncounterState, ReadonlyMap<string, CellObscurement>>();
+const virtualOpaqueByState = new WeakMap<EncounterState, readonly GridCell[]>();
+const pairOutcomes = new WeakMap<EncounterState, Map<string, SightOutcome>>();
+const derivedFogByState = new WeakMap<EncounterState, Map<string, readonly GridCell[]>>();
+
+function cellKey(cell: GridCell): string {
+  return `${String(cell.column)},${String(cell.row)}`;
+}
+
+function combatantIsHidden(state: EncounterState, subject: CombatantId): boolean {
+  return state.hiddenCombatants.some((entry) => entry.combatant === subject);
+}
+
+function sharesWebArea(state: EncounterState, observer: CombatantId, subject: CombatantId): boolean {
+  const persistentWeb = state.persistentAreas.some((area) => {
+    return area.material?.id === 'webs' &&
+      area.members.includes(observer) && area.members.includes(subject);
+  });
+  return persistentWeb || state.effects.some((effect) => {
+    if (effect.payload.kind !== 'web_area' || effect.payload.placement === 'selected_when_cast') return false;
+    const cells = affectedCells(
+      { bounds: state.bounds, blockedCells: terrainWallCells(state) },
+      effect.payload.placement,
+    );
+    const keys = new Set(cells.map(cellKey));
+    return combatantSpace(state, observer).cells.some((cell) => keys.has(cellKey(cell))) &&
+      combatantSpace(state, subject).cells.some((cell) => keys.has(cellKey(cell)));
+  });
+}
+
+function compareCells(left: GridCell, right: GridCell): number {
+  return left.row - right.row || left.column - right.column;
+}
+
+function allCells(state: EncounterState): readonly GridCell[] {
+  const cells: GridCell[] = [];
+  for (let row = 0; row < state.bounds.rows; row += 1) {
+    for (let column = 0; column < state.bounds.columns; column += 1) {
+      cells.push({ column, row });
+    }
+  }
+  return cells;
+}
+
+function observerForCombatant(state: EncounterState, id: CombatantId): ActualObserver {
+  return {
+    kind: 'actual',
+    id,
+    space: combatantSpace(state, id),
+    senses: effectiveCombatRules(state, id).senses,
+    blinded: combatantConditions(state, id).some(({ name }) => name === 'Blinded'),
+  };
+}
+
+function senseRange(observer: CellObserver, kind: Exclude<SightSense, 'normal_sight'>): number | null {
+  if (observer.kind === 'virtual') return null;
+  const sense = observer.senses.find((candidate) => candidate.kind === kind);
+  return sense === undefined || sense.kind === 'normal_sight' ? null : sense.rangeFeet;
+}
+
+function senseInRange(
+  observer: CellObserver,
+  kind: Exclude<SightSense, 'normal_sight'>,
+  target: GridCell,
+): boolean {
+  const rangeFeet = senseRange(observer, kind);
+  if (rangeFeet === null || observer.kind === 'virtual') return false;
+  const distance = minimumSpaceDistanceToCells(observer.space, [target]);
+  return distance <= rangeFeet;
+}
+
+function physicalSenseInRange(
+  observer: CellObserver,
+  kind: 'darkvision' | 'truesight' | 'devils_sight',
+  target: GridCell,
+): boolean {
+  return (observer.kind === 'virtual' || !observer.blinded) && senseInRange(observer, kind, target);
+}
+
+function addObscurement(
+  obscuredCells: Map<string, CellObscurement>,
+  cell: GridCell,
+  kind: 'light' | 'heavy' | 'magical_darkness',
+): void {
+  const key = cellKey(cell);
+  const previous = obscuredCells.get(key) ?? {
+    cell,
+    light: false,
+    heavy: false,
+    magicalDarkness: false,
+  };
+  obscuredCells.set(key, {
+    cell: previous.cell,
+    light: previous.light || kind === 'light',
+    heavy: previous.heavy || kind === 'heavy',
+    magicalDarkness: previous.magicalDarkness || kind === 'magical_darkness',
+  });
+}
+
+function obscurementCells(state: EncounterState): ReadonlyMap<string, CellObscurement> {
+  const cached = obscurementByState.get(state);
+  if (cached !== undefined) return cached;
+  const obscuredCells = new Map<string, CellObscurement>();
+  const environmentCells = new Map<
+    string,
+    { readonly cell: GridCell; readonly kind: 'light' | 'heavy' | 'magical_darkness' }
+  >();
+  for (const region of state.environment.obscurementRegions) {
+    for (const cell of region.cells) {
+      if (
+        cell.column >= 0 &&
+        cell.column < state.bounds.columns &&
+        cell.row >= 0 &&
+        cell.row < state.bounds.rows
+      ) {
+        environmentCells.set(cellKey(cell), { cell, kind: region.obscurement });
+      }
+    }
+  }
+  for (const { cell, kind } of environmentCells.values()) addObscurement(obscuredCells, cell, kind);
+  for (const effect of state.effects) {
+    if (effect.payload.kind !== 'obscured_area' || effect.payload.placement === 'selected_when_cast') {
+      continue;
+    }
+    const cells = affectedCells({
+      bounds: state.bounds,
+      blockedCells: terrainWallCells(state),
+    }, effect.payload.placement);
+    for (const cell of cells) addObscurement(obscuredCells, cell, effect.payload.obscurement);
+  }
+  obscurementByState.set(state, obscuredCells);
+  return obscuredCells;
+}
+
+function opaqueCellsForObserver(
+  state: EncounterState,
+  observer: CellObserver,
+  obscuredCells: ReadonlyMap<string, CellObscurement>,
+): readonly GridCell[] {
+  // D626.3: ordinary darkness is target-cell illumination, never intervening opacity.
+  return [...obscuredCells.values()].flatMap((obscurement) => {
+    const cell = obscurement.cell;
+    const blindsight = senseInRange(observer, 'blindsight', cell);
+    if (obscurement.heavy && !blindsight) return [cell];
+    const magicalDarknessDefeated = blindsight ||
+      physicalSenseInRange(observer, 'truesight', cell) ||
+      physicalSenseInRange(observer, 'devils_sight', cell);
+    return obscurement.magicalDarkness && !magicalDarknessDefeated ? [cell] : [];
+  });
+}
+
+function evaluationContext(state: EncounterState, observer: CellObserver): EvaluationContext {
+  const obscuredCells = obscurementCells(state);
+  return {
+    state,
+    observer,
+    obscuredCells,
+    opaqueCells: opaqueCellsForObserver(state, observer, obscuredCells),
+  };
+}
+
+function actualObserverContext(state: EncounterState, observerId: CombatantId): EvaluationContext {
+  const stateContexts = observerContexts.get(state) ?? new Map<CombatantId, EvaluationContext>();
+  const cached = stateContexts.get(observerId);
+  if (cached !== undefined) return cached;
+  const context = evaluationContext(state, observerForCombatant(state, observerId));
+  stateContexts.set(observerId, context);
+  if (!observerContexts.has(state)) observerContexts.set(state, stateContexts);
+  return context;
+}
+
+function virtualEvaluationContext(state: EncounterState, cell: GridCell): EvaluationContext {
+  const observer: VirtualObserver = { kind: 'virtual', cell };
+  const obscuredCells = obscurementCells(state);
+  const cachedOpaque = virtualOpaqueByState.get(state);
+  const opaqueCells = cachedOpaque ?? opaqueCellsForObserver(state, observer, obscuredCells);
+  if (cachedOpaque === undefined) virtualOpaqueByState.set(state, opaqueCells);
+  return { state, observer, obscuredCells, opaqueCells };
+}
+
+function traceToCell(context: EvaluationContext, target: GridCell) {
+  if (context.observer.kind === 'virtual') {
+    if (context.opaqueCells.length === 0) {
+      return traceTerrainLine(context.state, context.observer.cell, target);
+    }
+    return traceTerrainLine(context.state, context.observer.cell, target, {
+      additionalSightBlockingCells: context.opaqueCells,
+    });
+  }
+  if (context.opaqueCells.length === 0) {
+    return traceCombatantLineToCells(context.state, context.observer.id, [target]);
+  }
+  return traceCombatantLineToCells(context.state, context.observer.id, [target], {
+    additionalSightBlockingCells: context.opaqueCells,
+  });
+}
+
+function visible(grade: 'seen' | 'seen_dim', sense: SightSense): SightOutcome {
+  return { kind: 'visible', grade, sense };
+}
+
+function hasRangedSense(
+  observer: CellObserver,
+  kinds: readonly Exclude<SightSense, 'normal_sight'>[],

exec
/bin/bash -lc 'rg -n "function canCombatantSee|export function canCombatantSee|function .*Visibility|function visibility|function perceptionMode|function traceSpaces|function traceCombatantLine|function traceCornerLine|firstSharedEdge" src/combat/encounter.ts src/combat/visibility.ts src/combat/cover.ts' in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 0ms:
src/combat/cover.ts:294:function traceCornerLine(
src/combat/cover.ts:414:function traceSpaces(
src/combat/cover.ts:488:export function traceCombatantLine(
src/combat/cover.ts:511:export function traceCombatantLineToCells(
src/combat/encounter.ts:2248:export function canCombatantSee(
src/combat/encounter.ts:2317:function monsterVisibilitySnapshot(state: EncounterState): readonly MonsterVisibilitySnapshot[] {
src/combat/encounter.ts:4803:function perceptionMode(

exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import { startVitest } from \"vitest/node\";
const targets=new Map([
 [\"/src/combat/encounter.ts\",[\"canCombatantSee\",\"perceptionMode\"]],
 [\"/src/combat/visibility.ts\",[\"projectDmView\",\"projectPlayerView\"]],
 [\"/src/combat/cover.ts\",[\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]],
 [\"/src/vtt/engine-query-port.ts\",[\"positionedCandidates\",\"resolveTarget\",\"path\",\"approach\",\"reach\",\"engineTacticalAttackInput\",\"movementOptions\",\"projectedMovementOptions\"]],
 [\"/src/vtt/intent-resolver.ts\",[\"movementResolution\",\"validateUse\",\"resolveEngineActorOption\",\"availableEngineActorOptions\"]],
 [\"/src/vtt/offers/build-offer-environment.ts\",[\"buildOfferEnvironment\"]],
]);
const plugin={name:\"main-perf-runtime\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0];const entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`'"\\nconst __vp=(globalThis).__VIS_PERF__ ?? ((globalThis).__VIS_PERF__={count:{},ms:{}});\\n"'`;const wrappers=entry[1].map((n,i)=>`'"\\nconst __vp_orig_"'${i}=${n}; ${n}=function(...a){const t=performance.now();try{return __vp_orig_${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+(performance.now()-t)}};`).join("");return {code:pre+code+wrappers,map:null};}if(clean.endsWith("/tests/integration/vtt/pc-algorithm-policy.test.ts"))return {code:`import { afterAll as __vpAfterAll } from "vitest";'"\\n"'${code}'"\\n__vpAfterAll(()=>console.log(\"__MAIN_PERF__\"+JSON.stringify((globalThis).__VIS_PERF__)));"'`,map:null};}};
const ctx=await startVitest("test",["tests/integration/vtt/pc-algorithm-policy.test.ts"],{configLoader:"runner",testNamePattern:"vane-tpk-clean-terminates",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await ctx.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 10952ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/e5f6a5f304a5e675.json
------------------·stdout | tests/integration/vtt/pc-algorithm-policy.test.ts
__MAIN_PERF__{"count":{"traceCornerLine":123584,"traceSpaces":95031,"traceCombatantLine":105969,"canCombatantSee":105823,"projectPlayerView":275},"ms":{"traceCornerLine":100.31409399980703,"traceSpaces":1073.2012250001035,"traceCombatantLine":1297.9228259999431,"canCombatantSee":1763.4974890000544,"projectPlayerView":136.29429500000788}}

--

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:58:15
   Duration  10.79s (transform 2.35s, setup 0ms, import 3.22s, tests 3.84s, environment 0ms)


codex
The first exact-count run isolates the multiplier: branch `traceSpaces` runs 348,353 times versus 95,031 on main (3.67×), and corner-ray work runs 535,568 versus 123,584 (4.33×). Total pairwise detection calls are actually lower on the branch (88,059 versus 105,823), so the regression is not “more detection requests”; each request expands into per-target-cell traces, especially for large creatures. I’m separating those traces into full-field fog work versus pairwise detection now.
exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import { startVitest } from \"vitest/node\";
const targets=new Map([
 [\"/src/combat/visibility-field.ts\",[\"derivedFogCells\",\"sightToCreature\",\"detectCombatant\"]],
 [\"/src/combat/visibility.ts\",[\"projectPlayerView\"]],
 [\"/src/combat/cover.ts\",[\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]],
]);
const contextual=new Set([\"derivedFogCells\",\"sightToCreature\"]); const traceNames=new Set([\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]);
const plugin={name:\"vis-context-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0];const entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`'"\\nconst __vp=(globalThis).__VIS_PERF__ ?? ((globalThis).__VIS_PERF__={count:{},ms:{},byContext:{},ctx:\"other\"});\\n"'`;const wrappers=entry[1].map((n,i)=>{const before=contextual.has(n)?`const p=__vp.ctx;__vp.ctx=${JSON.stringify(n)};`:"";const after=contextual.has(n)?`__vp.ctx=p;`:"";const by=traceNames.has(n)?`const k=${JSON.stringify(n)}+"@"+__vp.ctx;const x=__vp.byContext[k]??{count:0,ms:0};x.count++;x.ms+=performance.now()-t;__vp.byContext[k]=x;`:"";return `'"\\nconst __vp_orig_"'${i}=${n}; ${n}=function(...a){${before}const t=performance.now();try{return __vp_orig_${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+(performance.now()-t);${by}${after}}};`;}).join("");return {code:pre+code+wrappers,map:null};}if(clean.endsWith("/tests/integration/vtt/pc-algorithm-policy.test.ts"))return {code:`import { afterAll as __vpAfterAll } from "vitest";'"\\n"'${code}'"\\n__vpAfterAll(()=>console.log(\"__CONTEXT_PERF__\"+JSON.stringify((globalThis).__VIS_PERF__)));"'`,map:null};}};
const ctx=await startVitest("test",["tests/integration/vtt/pc-algorithm-policy.test.ts"],{configLoader:"runner",testNamePattern:"vane-tpk-clean-terminates",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await ctx.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 15995ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
------------------·stdout | tests/integration/vtt/pc-algorithm-policy.test.ts
__CONTEXT_PERF__{"count":{"traceCornerLine":535568,"traceSpaces":348353,"traceCombatantLineToCells":348284,"sightToCreature":88059,"detectCombatant":88059,"traceCombatantLine":131,"derivedFogCells":206,"projectPlayerView":206},"ms":{"traceCornerLine":740.8431840001003,"traceSpaces":4545.353972000755,"traceCombatantLineToCells":5264.146133000616,"sightToCreature":5204.9267299999565,"detectCombatant":5658.384856000085,"traceCombatantLine":7.3861719999949855,"derivedFogCells":589.9903529999992,"projectPlayerView":682.4505540000073},"byContext":{"traceCornerLine@sightToCreature":{"count":445824,"ms":711.991084000626},"traceSpaces@sightToCreature":{"count":319444,"ms":4098.820153000232},"traceCombatantLineToCells@sightToCreature":{"count":319444,"ms":4758.085608000177},"traceCornerLine@other":{"count":304,"ms":0.5245130000193967},"traceSpaces@other":{"count":69,"ms":6.358195000003434},"traceCombatantLine@other":{"count":131,"ms":7.533800999994128},"traceSpaces@derivedFogCells":{"count":28840,"ms":492.52881300004447},"traceCombatantLineToCells@derivedFogCells":{"count":28840,"ms":555.0008600000947},"traceCornerLine@derivedFogCells":{"count":89440,"ms":92.40349699975468}},"ctx":"other"}

--

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:58:52
   Duration  15.81s (transform 2.55s, setup 0ms, import 3.46s, tests 8.49s, environment 0ms)


exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import { startVitest } from \"vitest/node\";
const targets=new Map([[\"/src/combat/visibility-field.ts\",[\"derivedFogCells\",\"sightToCreature\"]],[\"/src/combat/visibility.ts\",[\"projectPlayerView\"]],[\"/src/combat/cover.ts\",[\"traceCombatantLineToCells\"]]]);const contextual=new Set([\"derivedFogCells\",\"sightToCreature\"]);
const plugin={name:\"vis-round-count\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0];const entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`'"\\nconst __vp=(globalThis).__VIS_PERF__ ?? ((globalThis).__VIS_PERF__={counts:{},revs:{},ctx:\"other\"});\\n"'`;const wrappers=entry[1].map((n,i)=>{if(contextual.has(n))return `'"\\nconst __vp_orig_"'${i}=${n}; ${n}=function(...a){const p=__vp.ctx;__vp.ctx=${JSON.stringify(n)};try{return __vp_orig_${i}(...a)}finally{__vp.ctx=p}};`;if(n==="projectPlayerView")return `'"\\nconst __vp_orig_"'${i}=${n}; ${n}=function(...a){const s=a[0],r="r"+String(s.round);__vp.counts["projectPlayerView@"+r]=(__vp.counts["projectPlayerView@"+r]??0)+1;(__vp.revs[r]??=(new Set())).add(s.revision);return __vp_orig_${i}(...a)};`;return `'"\\nconst __vp_orig_"'${i}=${n}; ${n}=function(...a){const r="r"+String(a[0].round),k=__vp.ctx+"@"+r;__vp.counts[k]=(__vp.counts[k]??0)+1;return __vp_orig_${i}(...a)};`;}).join("");return {code:pre+code+wrappers,map:null};}if(clean.endsWith("/tests/integration/vtt/pc-algorithm-policy.test.ts"))return {code:`import { afterAll as __vpAfterAll } from "vitest";'"\\n"'${code}'"\\n__vpAfterAll(()=>{const p=(globalThis).__VIS_PERF__;console.log(\"__ROUND_PERF__\"+JSON.stringify({counts:p.counts,revisionCounts:Object.fromEntries(Object.entries(p.revs).map(([k,v])=>[k,v.size]))}))});"'`,map:null};}};
const ctx=await startVitest("test",["tests/integration/vtt/pc-algorithm-policy.test.ts"],{configLoader:"runner",testNamePattern:"vane-tpk-clean-terminates",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await ctx.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 14693ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
------------------·stdout | tests/integration/vtt/pc-algorithm-policy.test.ts
__ROUND_PERF__{"counts":{"sightToCreature@r0":932,"sightToCreature@r1":159222,"projectPlayerView@r1":90,"derivedFogCells@r1":12600,"sightToCreature@r2":83108,"projectPlayerView@r2":50,"derivedFogCells@r2":7000,"sightToCreature@r3":74526,"projectPlayerView@r3":65,"derivedFogCells@r3":9100,"sightToCreature@r4":1656,"projectPlayerView@r4":1,"derivedFogCells@r4":140},"revisionCounts":{"r1":89,"r2":50,"r3":65,"r4":1}}

--

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  09:59:30
   Duration  14.53s (transform 2.45s, setup 0ms, import 3.33s, tests 7.39s, environment 0ms)


exec
/bin/bash -lc "TMPDIR=/dev/shm /usr/bin/time -f 'BRANCH productive WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'retains a productive first-turn option for every living monster in the versioned basis' --reporter=verbose --no-file-parallelism --testTimeout=20000" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "TMPDIR=/dev/shm /usr/bin/time -f 'MAIN productive WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'retains a productive first-turn option for every living monster in the versioned basis' --reporter=verbose --no-file-parallelism --testTimeout=20000" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
exec
/bin/bash -lc "TMPDIR=/dev/shm /usr/bin/time -f 'BRANCH wall WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'kills M576-E2-WALL-SEALS-ROOM for every living footprint size' --reporter=verbose --no-file-parallelism --testTimeout=20000" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "TMPDIR=/dev/shm /usr/bin/time -f 'MAIN wall WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'kills M576-E2-WALL-SEALS-ROOM for every living footprint size' --reporter=verbose --no-file-parallelism --testTimeout=20000" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 11246ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/e5f6a5f304a5e675.json
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > generated and authored arena fixtures share one strict decoder
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size 4549ms
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

 Test Files  1 passed (1)
      Tests  1 passed | 110 skipped (111)
   Start at  09:59:57
   Duration  10.81s (transform 1.50s, setup 0ms, import 2.15s, tests 4.55s, environment 0ms)

MAIN wall WALL=11.36 USER=12.59 SYS=1.62 RSS_KB=913284 EXIT=0

 succeeded in 11447ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/e5f6a5f304a5e675.json
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > generated and authored arena fixtures share one strict decoder
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis 4793ms
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

 Test Files  1 passed (1)
      Tests  1 passed | 110 skipped (111)
   Start at  09:59:57
   Duration  11.02s (transform 1.49s, setup 0ms, import 2.12s, tests 4.79s, environment 0ms)

MAIN productive WALL=11.56 USER=13.09 SYS=1.58 RSS_KB=913856 EXIT=0

 succeeded in 11779ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > generated and authored arena fixtures share one strict decoder
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size 5122ms
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

 Test Files  1 passed (1)
      Tests  1 passed | 111 skipped (112)
   Start at  09:59:57
   Duration  11.35s (transform 1.49s, setup 0ms, import 2.11s, tests 5.12s, environment 0ms)

BRANCH wall WALL=11.89 USER=13.44 SYS=1.47 RSS_KB=913436 EXIT=0

 succeeded in 12063ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > generated and authored arena fixtures share one strict decoder
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis 5384ms
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
 ↓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

 Test Files  1 passed (1)
      Tests  1 passed | 111 skipped (112)
   Start at  09:59:57
   Duration  11.64s (transform 1.52s, setup 0ms, import 2.14s, tests 5.39s, environment 0ms)

BRANCH productive WALL=12.18 USER=13.89 SYS=1.59 RSS_KB=915624 EXIT=0

exec
/bin/bash -lc "set -o pipefail; TMPDIR=/dev/shm /usr/bin/time -f 'BRANCH_PROD WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'retains a productive first-turn option for every living monster in the versioned basis' --reporter=verbose --no-file-parallelism --testTimeout=20000 2>&1 | rg 'productive first-turn|Test Files|Duration|BRANCH_PROD'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "set -o pipefail; TMPDIR=/dev/shm /usr/bin/time -f 'MAIN_PROD WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'retains a productive first-turn option for every living monster in the versioned basis' --reporter=verbose --no-file-parallelism --testTimeout=20000 2>&1 | rg 'productive first-turn|Test Files|Duration|MAIN_PROD'" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
exec
/bin/bash -lc "set -o pipefail; TMPDIR=/dev/shm /usr/bin/time -f 'BRANCH_WALL WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'kills M576-E2-WALL-SEALS-ROOM for every living footprint size' --reporter=verbose --no-file-parallelism --testTimeout=20000 2>&1 | rg 'WALL-SEALS-ROOM|Test Files|Duration|BRANCH_WALL'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "set -o pipefail; TMPDIR=/dev/shm /usr/bin/time -f 'MAIN_WALL WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t 'kills M576-E2-WALL-SEALS-ROOM for every living footprint size' --reporter=verbose --no-file-parallelism --testTimeout=20000 2>&1 | rg 'WALL-SEALS-ROOM|Test Files|Duration|MAIN_WALL'" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 13145ms:
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis 5472ms
 Test Files  1 passed (1)
   Duration  12.60s (transform 1.68s, setup 0ms, import 2.41s, tests 5.47s, environment 0ms)
MAIN_PROD WALL=13.25 USER=14.69 SYS=1.96 RSS_KB=915112 EXIT=0

 succeeded in 13149ms:
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size 5395ms
 Test Files  1 passed (1)
   Duration  12.60s (transform 1.72s, setup 0ms, import 2.44s, tests 5.40s, environment 0ms)
MAIN_WALL WALL=13.26 USER=14.60 SYS=1.89 RSS_KB=913204 EXIT=0

 succeeded in 13687ms:
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > kills M576-E2-WALL-SEALS-ROOM for every living footprint size 5865ms
 Test Files  1 passed (1)
   Duration  13.17s (transform 1.70s, setup 0ms, import 2.41s, tests 5.87s, environment 0ms)
BRANCH_WALL WALL=13.80 USER=15.29 SYS=1.83 RSS_KB=913748 EXIT=0

 succeeded in 13844ms:
 ✓ tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis 6139ms
 Test Files  1 passed (1)
   Duration  13.33s (transform 1.72s, setup 0ms, import 2.42s, tests 6.14s, environment 0ms)
BRANCH_PROD WALL=13.96 USER=15.63 SYS=1.85 RSS_KB=915376 EXIT=0

exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import { startVitest } from \"vitest/node\";const targets=new Map([[\"/src/combat/cover.ts\",[\"firstSharedEdgeBlockingCell\",\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]],[\"/src/vtt/engine-query-port.ts\",[\"positionedCandidates\",\"resolveTarget\",\"path\",\"approach\",\"reach\",\"engineTacticalAttackInput\",\"movementOptions\",\"projectedMovementOptions\"]],[\"/src/vtt/intent-resolver.ts\",[\"movementResolution\",\"validateUse\",\"resolveEngineActorOption\",\"availableEngineActorOptions\"]],[\"/src/vtt/offers/build-offer-environment.ts\",[\"buildOfferEnvironment\"]],[\"/src/vtt/room-generator.ts\",[\"generateRoom\"]]]);const plugin={name:\"room-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`'"\\nconst __vp=(globalThis).__ROOM_PERF__??((globalThis).__ROOM_PERF__={count:{},ms:{}});"'`;const w=entry[1].map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/room-generator-los-cover.test.ts"))return {code:`import {afterAll as __a} from "vitest";${code}'"\\n__a(()=>console.log(\"__ROOM_PERF__\"+JSON.stringify((globalThis).__ROOM_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/room-generator-los-cover.test.ts"],{configLoader:"runner",testNamePattern:"retains a productive first-turn option for every living monster in the versioned basis",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 11475ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
-------------·stdout | tests/unit/vtt/room-generator-los-cover.test.ts
__ROOM_PERF__{"count":{"buildOfferEnvironment":1,"firstSharedEdgeBlockingCell":4173984,"traceCornerLine":4173984,"traceSpaces":284121,"traceCombatantLine":72579,"traceCombatantLineToCells":223918,"generateRoom":9,"validateUse":870,"reach":46650,"movementResolution":630,"resolveEngineActorOption":630,"positionedCandidates":82,"approach":39,"availableEngineActorOptions":39,"path":164},"ms":{"buildOfferEnvironment":0.7610250000000178,"firstSharedEdgeBlockingCell":379.62295400164567,"traceCornerLine":1932.3404170255717,"traceSpaces":4331.427667000104,"traceCombatantLine":881.8084999999301,"traceCombatantLineToCells":3871.3439550000394,"generateRoom":4550.115096999997,"validateUse":4.437403000005361,"reach":366.95115199991324,"movementResolution":1040.2672970000021,"resolveEngineActorOption":1047.7439250000089,"positionedCandidates":7.188726999998835,"approach":130.9259689999999,"availableEngineActorOptions":1066.2198649999991,"path":430.8175890000048}}

--------------------------------------------------------------------------------------------------

 Test Files  1 passed (1)
      Tests  1 passed | 111 skipped (112)
   Start at  10:00:57
   Duration  11.27s (transform 1.28s, setup 0ms, import 1.81s, tests 5.63s, environment 0ms)


exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import { startVitest } from \"vitest/node\";const targets=new Map([[\"/src/combat/cover.ts\",[\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]],[\"/src/vtt/engine-query-port.ts\",[\"positionedCandidates\",\"resolveTarget\",\"path\",\"approach\",\"reach\",\"engineTacticalAttackInput\",\"movementOptions\",\"projectedMovementOptions\"]],[\"/src/vtt/intent-resolver.ts\",[\"movementResolution\",\"validateUse\",\"resolveEngineActorOption\",\"availableEngineActorOptions\"]],[\"/src/vtt/offers/build-offer-environment.ts\",[\"buildOfferEnvironment\"]],[\"/src/vtt/room-generator.ts\",[\"generateRoom\"]]]);const plugin={name:\"room-main-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`'"\\nconst __vp=(globalThis).__ROOM_PERF__??((globalThis).__ROOM_PERF__={count:{},ms:{}});"'`;const w=entry[1].map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/room-generator-los-cover.test.ts"))return {code:`import {afterAll as __a} from "vitest";${code}'"\\n__a(()=>console.log(\"__ROOM_MAIN_PERF__\"+JSON.stringify((globalThis).__ROOM_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/room-generator-los-cover.test.ts"],{configLoader:"runner",testNamePattern:"retains a productive first-turn option for every living monster in the versioned basis",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 10573ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/e5f6a5f304a5e675.json
------------·stdout | tests/unit/vtt/room-generator-los-cover.test.ts
__ROOM_MAIN_PERF__{"count":{"buildOfferEnvironment":1,"traceCornerLine":4173840,"traceSpaces":284121,"traceCombatantLine":72825,"traceCombatantLineToCells":223801,"generateRoom":9,"validateUse":870,"reach":46650,"movementResolution":630,"resolveEngineActorOption":630,"positionedCandidates":82,"approach":39,"availableEngineActorOptions":39,"path":164},"ms":{"buildOfferEnvironment":0.7952080000000024,"traceCornerLine":1212.8878609920366,"traceSpaces":3529.700999000085,"traceCombatantLine":715.244572999909,"traceCombatantLineToCells":3189.4580779999887,"generateRoom":3749.493853,"validateUse":4.384450000022298,"reach":324.7806630000714,"movementResolution":997.2235989999999,"resolveEngineActorOption":1004.683025999997,"positionedCandidates":4.222500000002583,"approach":136.9218179999989,"availableEngineActorOptions":1023.5225300000002,"path":430.2915789999961}}

--------------------------------------------------------------------------------------------------

 Test Files  1 passed (1)
      Tests  1 passed | 110 skipped (111)
   Start at  10:01:22
   Duration  10.39s (transform 1.24s, setup 0ms, import 1.77s, tests 4.78s, environment 0ms)


codex
The LOS-cover regression is different: visibility-field code is not involved. Both revisions execute exactly 284,121 `traceSpaces` calls and about 4.174 million corner rays; the branch adds `firstSharedEdgeBlockingCell` to every corner ray. In the productive test that scan costs 380 ms directly and raises inclusive corner tracing from 1.213 s to 1.932 s; `generateRoom(…)` rises from 3.749 s to 4.550 s. This is a pure seam-computation cost, not extra offer generation (`reach`: exactly 46,650 on both).
exec
/bin/bash -lc "set -o pipefail; TMPDIR=/dev/shm /usr/bin/time -f 'BRANCH_PAIR WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts --reporter=verbose --no-file-parallelism --testTimeout=60000 2>&1 | rg '"'^ (✓|×)|Test Files|Tests  |Duration|BRANCH_PAIR'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 41849ms:
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > stealth_dc_off_by_one: 2024 Hide succeeds at exactly 15 and fails at 14 16ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > keeps 2014 contested hiding distinct from the 2024 fixed DC under the edition lock 3ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > passive Perception at the hiding total immediately detects the creature 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > passive_five_shift: Advantage adds 5 and Disadvantage subtracts 5 from passive Perception 3ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > keen_sight_bonus_requires_a_visible_target 2ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > hidden attacker has Advantage and making the attack roll reveals it 4ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > sight-required attacks and spells return the typed target-not-seen refusal 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > Keen Sight drives sight-based Search Advantage and Web Sense locates creatures on the same web 9ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > closes the unified reaction vocabulary over exactly five trigger kinds 0ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > fires the fifth reaction trigger when a seen creature voluntarily leaves reach 2ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > does not trigger on Disengage, teleport, or forced movement 3ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > hidden_still_provokes: a Hidden mover does not provoke because the reactor cannot see it 2ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > always_policy_silent: always and never auto-resolve with explicit records 2ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > advance_past_pending: an unresolved ask decision blocks its turn boundary until explicitly resolved 2ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > resolved_offer_reissues + resolution_leaves_pending: a resolved trigger stays resolved for its turn boundary 2ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > moots the remaining opportunity-attack offers when the first accepted offer kills their mover 6ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > Flyby suppresses the real movement-triggered opportunity attack 1ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > replays world-object creation byte-exactly 114ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > replays two overlapping persistent areas byte-exactly in stable creation order 110ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte 3736ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M61-TELEMETRY-OMITS-RNG-TRANSITION identifies the first missing RNG post-state 1886ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > mode_not_serialized refuses to reconstruct a shared_enemy bundle as per_combatant 1820ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped 1803ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M62-CONTROLLER-RESPONSE-MISATTRIBUTED rejects a valid response linked to the prior request 1803ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing 2539ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M64-REPLAY-CALLS-LIVE-CONTROLLER exposes no controller or exchange capability 2339ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M65-VOID-BRANCH-REPLAYED-AS-LIVE refuses a void revision marked active 2004ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M66-PROJECTION-DIVERGENCE-IGNORED pinpoints the first bad player projection hash 1809ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > CORRUPTION-EVENT identifies the first bad event record and field 1797ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > CORRUPTION-TRANSCRIPT identifies the first bad transcript content record 1778ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > OWN-TOKEN-COUNTS-CANNOT-INFLUENCE-REDUCER keeps usage out of state and view hashes 2382ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > CORRECTION-ATTEMPTS are schema-validated telemetry and remain non-authoritative 2317ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > OWN-BUNDLE-VERSION-OUTSIDE-WINDOW is refused while the adjacent migration remains exact 4145ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > decodes the hand-authored replay-5 fixture with an embedded session-10 revision 2ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > HUMAN-FLEET-SCHEMA is empty but typed identically to model records 0ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > REPLAY-COMMAND reads only the recorded bundle and approved fixture 3495ms
 Test Files  2 passed (2)
      Tests  36 passed (36)
   Duration  41.45s (transform 1.14s, setup 0ms, import 1.64s, tests 35.94s, environment 0ms)
BRANCH_PAIR WALL=41.97 USER=45.16 SYS=1.66 RSS_KB=1025172 EXIT=0

exec
/bin/bash -lc "set -o pipefail; TMPDIR=/dev/shm /usr/bin/time -f 'MAIN_PAIR WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts --reporter=verbose --no-file-parallelism --testTimeout=60000 2>&1 | rg '"'^ (✓|×)|Test Files|Tests  |Duration|MAIN_PAIR'"'" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 33922ms:
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > replays world-object creation byte-exactly 89ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > replays two overlapping persistent areas byte-exactly in stable creation order 91ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte 2935ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M61-TELEMETRY-OMITS-RNG-TRANSITION identifies the first missing RNG post-state 1448ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > mode_not_serialized refuses to reconstruct a shared_enemy bundle as per_combatant 1466ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped 1445ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M62-CONTROLLER-RESPONSE-MISATTRIBUTED rejects a valid response linked to the prior request 1411ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing 2027ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M64-REPLAY-CALLS-LIVE-CONTROLLER exposes no controller or exchange capability 1835ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M65-VOID-BRANCH-REPLAYED-AS-LIVE refuses a void revision marked active 1497ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > M66-PROJECTION-DIVERGENCE-IGNORED pinpoints the first bad player projection hash 1415ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > CORRUPTION-EVENT identifies the first bad event record and field 1409ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > CORRUPTION-TRANSCRIPT identifies the first bad transcript content record 1403ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > OWN-TOKEN-COUNTS-CANNOT-INFLUENCE-REDUCER keeps usage out of state and view hashes 1849ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > CORRECTION-ATTEMPTS are schema-validated telemetry and remain non-authoritative 1832ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > OWN-BUNDLE-VERSION-OUTSIDE-WINDOW is refused while the adjacent migration remains exact 3255ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > decodes the hand-authored replay-5 fixture with an embedded session-10 revision 2ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > HUMAN-FLEET-SCHEMA is empty but typed identically to model records 0ms
 ✓ tests/unit/vtt/replay.test.ts > increment 10 deterministic replay and playable exit > REPLAY-COMMAND reads only the recorded bundle and approved fixture 2808ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > stealth_dc_off_by_one: 2024 Hide succeeds at exactly 15 and fails at 14 3ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > keeps 2014 contested hiding distinct from the 2024 fixed DC under the edition lock 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > passive Perception at the hiding total immediately detects the creature 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > passive_five_shift: Advantage adds 5 and Disadvantage subtracts 5 from passive Perception 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > hidden attacker has Advantage and making the attack roll reveals it 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > sight-required attacks and spells return the typed target-not-seen refusal 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D356 full detection vocabulary > Keen Sight drives sight-based Search Advantage and Web Sense locates creatures on the same web 3ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > closes the unified reaction vocabulary over exactly five trigger kinds 0ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > fires the fifth reaction trigger when a seen creature voluntarily leaves reach 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > does not trigger on Disengage, teleport, or forced movement 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > hidden_still_provokes: a Hidden mover does not provoke because the reactor cannot see it 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > always_policy_silent: always and never auto-resolve with explicit records 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > advance_past_pending: an unresolved ask decision blocks its turn boundary until explicitly resolved 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > resolved_offer_reissues + resolution_leaves_pending: a resolved trigger stays resolved for its turn boundary 1ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > moots the remaining opportunity-attack offers when the first accepted offer kills their mover 2ms
 ✓ tests/unit/vtt/detection-reactions.test.ts > D368.3 opportunity attacks and fork #18 decisions > Flyby suppresses the real movement-triggered opportunity attack 1ms
 Test Files  2 passed (2)
      Tests  35 passed (35)
   Duration  33.55s (transform 1.10s, setup 0ms, import 1.58s, tests 28.24s, environment 0ms)
MAIN_PAIR WALL=34.04 USER=35.44 SYS=1.50 RSS_KB=801800 EXIT=0

codex
The D630 pair slowdown is entirely in replay: detection-reactions remains millisecond-scale. Measured back-to-back here, branch test time is 35.94 s versus main 28.24 s (+7.70 s, +27.3%); wall time is 41.97 s versus 34.04 s. The largest individual increases are `OWN-BUNDLE-VERSION-OUTSIDE-WINDOW` +890 ms, `PLAYABLE-EXIT` +801 ms, and `REPLAY-COMMAND` +687 ms. I’m profiling the representative PLAYABLE replay to tie that increase to projection counts per revision.
exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import {startVitest} from \"vitest/node\";const targets=new Map([[\"/src/vtt/replay.ts\",[\"projectReplayViews\",\"hashProjections\",\"replayRevisionRecords\",\"replayBundle\"]],[\"/src/combat/visibility.ts\",[\"projectDmView\",\"projectPlayerView\"]],[\"/src/combat/visibility-field.ts\",[\"evaluateUncachedCell\",\"evaluateCell\",\"sightToCreature\",\"detectCombatant\",\"eligibleVisibilityObserverIds\",\"derivedFogCells\"]],[\"/src/combat/cover.ts\",[\"firstSharedEdgeBlockingCell\",\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]]]);const plugin={name:\"replay-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`'"\\nconst __vp=(globalThis).__REPLAY_PERF__??((globalThis).__REPLAY_PERF__={count:{},ms:{}});"'`;const w=entry[1].map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/replay.test.ts"))return {code:`import {afterAll as __a} from "vitest";${code}'"\\n__a(()=>console.log(\"__REPLAY_PERF__\"+JSON.stringify((globalThis).__REPLAY_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/replay.test.ts"],{configLoader:"runner",testNamePattern:"PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 9296ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
--·stdout | tests/unit/vtt/replay.test.ts
__REPLAY_PERF__{"count":{"firstSharedEdgeBlockingCell":25728,"traceCornerLine":25728,"traceSpaces":159843,"traceCombatantLineToCells":159824,"evaluateUncachedCell":159824,"evaluateCell":204338,"sightToCreature":75387,"detectCombatant":75387,"eligibleVisibilityObserverIds":3361,"derivedFogCells":3361,"projectPlayerView":2502,"traceCombatantLine":57,"projectDmView":859,"projectReplayViews":828,"hashProjections":828,"replayRevisionRecords":1,"replayBundle":5},"ms":{"firstSharedEdgeBlockingCell":3.8360979999833944,"traceCornerLine":30.47676199995476,"traceSpaces":400.3273169999002,"traceCombatantLineToCells":595.7760029999854,"evaluateUncachedCell":647.606892000178,"evaluateCell":702.5318759997763,"sightToCreature":401.02948800009744,"detectCombatant":595.3928330001472,"eligibleVisibilityObserverIds":13.987288000006629,"derivedFogCells":408.6070230000123,"projectPlayerView":490.11459500001274,"traceCombatantLine":0.7580509999988863,"projectDmView":334.9575189999923,"projectReplayViews":923.0152889999899,"hashProjections":809.3184690000116,"replayRevisionRecords":350.04053999999996,"replayBundle":2891.259317}}

----------------

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  10:03:34
   Duration  9.13s (transform 1.05s, setup 0ms, import 1.52s, tests 3.93s, environment 0ms)


exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import {startVitest} from \"vitest/node\";const targets=new Map([[\"/src/vtt/replay.ts\",[\"projectReplayViews\",\"hashProjections\",\"replayRevisionRecords\",\"replayBundle\"]],[\"/src/combat/visibility.ts\",[\"projectDmView\",\"projectPlayerView\"]],[\"/src/combat/encounter.ts\",[\"canCombatantSee\"]],[\"/src/combat/cover.ts\",[\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]]]);const plugin={name:\"replay-main-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`'"\\nconst __vp=(globalThis).__REPLAY_PERF__??((globalThis).__REPLAY_PERF__={count:{},ms:{}});"'`;const w=entry[1].map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/replay.test.ts"))return {code:`import {afterAll as __a} from "vitest";${code}'"\\n__a(()=>console.log(\"__REPLAY_MAIN_PERF__\"+JSON.stringify((globalThis).__REPLAY_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/replay.test.ts"],{configLoader:"runner",testNamePattern:"PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 8478ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/e5f6a5f304a5e675.json
--·stdout | tests/unit/vtt/replay.test.ts
__REPLAY_MAIN_PERF__{"count":{"traceCornerLine":4608,"traceSpaces":47918,"traceCombatantLine":74708,"canCombatantSee":74630,"projectPlayerView":2484,"projectDmView":853,"projectReplayViews":822,"hashProjections":822,"replayRevisionRecords":1,"replayBundle":5},"ms":{"traceCornerLine":6.5761489999986225,"traceSpaces":134.86842599993997,"traceCombatantLine":225.8478540000151,"canCombatantSee":420.20370200006073,"projectPlayerView":226.41374800000904,"projectDmView":185.1497139999983,"projectReplayViews":556.0827150000059,"hashProjections":683.6593230000053,"replayRevisionRecords":268.1852039999999,"replayBundle":2240.3910349999996}}

----------------

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  10:03:56
   Duration  8.31s (transform 1.04s, setup 0ms, import 1.50s, tests 3.06s, environment 0ms)


exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import {startVitest} from \"vitest/node\";const plugin={name:\"reach-result-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0];if(clean.endsWith(\"/src/vtt/engine-query-port.ts\")){return {code:"'`const __vp=(globalThis).__REACH_PERF__??((globalThis).__REACH_PERF__={reach:{},traces:{},ctx:"other"});'"\\n"'${code}'"\\nconst __or=reach;reach=function(...a){const p=__vp.ctx;__vp.ctx=\"reach\";try{const r=__or(...a);const k=r.legal?\"legal\":r.codes.join(\"+\");__vp.reach[k]=(__vp.reach[k]??0)+1;return r}finally{__vp.ctx=p}};"'`,map:null};}if(clean.endsWith("/src/combat/cover.ts")){return {code:`const __vp=(globalThis).__REACH_PERF__??((globalThis).__REACH_PERF__={reach:{},traces:{},ctx:"other"});'"\\n"'${code}'"\\nconst __ot=traceCombatantLine;traceCombatantLine=function(...a){const k=__vp.ctx+(a[3]?.sourceAnchor"'!==undefined?"@anchor":"@current");__vp.traces[k]=(__vp.traces[k]??0)+1;return __ot(...a)};`,map:null};}if(clean.endsWith("/tests/unit/vtt/room-generator-los-cover.test.ts"))return {code:`import {afterAll as __a} from "vitest";${code}'"\\n__a(()=>console.log(\"__REACH_PERF__\"+JSON.stringify((globalThis).__REACH_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/room-generator-los-cover.test.ts"],{configLoader:"runner",testNamePattern:"retains a productive first-turn option for every living monster in the versioned basis",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 10504ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
-------------·stdout | tests/unit/vtt/room-generator-los-cover.test.ts
__REACH_PERF__{"reach":{"target_out_of_range":33092,"legal":12556,"target_outside_line_of_sight":141,"action_range_unresolved":861},"traces":{"other@current":25929,"reach@anchor":46650},"ctx":"other"}

--------------------------------------------------------------------------------------------------

 Test Files  1 passed (1)
      Tests  1 passed | 111 skipped (112)
   Start at  10:04:25
   Duration  10.33s (transform 1.20s, setup 0ms, import 1.74s, tests 4.83s, environment 0ms)


exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import {startVitest} from \"vitest/node\";const targets=new Map([[\"/src/combat/cover.ts\",[\"firstSharedEdgeBlockingCell\",\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]],[\"/src/combat/movement.ts\",[\"findPath\"]],[\"/src/vtt/room-generator.ts\",[\"generateRoom\"]]]);const plugin={name:\"wall-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`const __vp=(globalThis).__WALL_PERF__??((globalThis).__WALL_PERF__={count:{},ms:{}});'"\\n"'`;const w=entry[1].map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/room-generator-los-cover.test.ts")){const w=`'"\\nconst __vp=(globalThis).__WALL_PERF__??((globalThis).__WALL_PERF__={count:{},ms:{}});const __orp=reachesProductiveRegion;reachesProductiveRegion=function(...a){const t=performance.now();try{return __orp(...a)}finally{__vp.count.reachesProductiveRegion=(__vp.count.reachesProductiveRegion??0)+1;__vp.ms.reachesProductiveRegion=(__vp.ms.reachesProductiveRegion??0)+performance.now()-t}};"'`;return {code:`import {afterAll as __a} from "vitest";${code}${w}'"\\n__a(()=>console.log(\"__WALL_PERF__\"+JSON.stringify((globalThis).__WALL_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/room-generator-los-cover.test.ts"],{configLoader:"runner",testNamePattern:"kills M576-E2-WALL-SEALS-ROOM for every living footprint size",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 0ms:
file:///home/vagrant/PhpstormProjects/dnd-wt-seam-verify/[eval1]:2
import {startVitest} from "vitest/node";const targets=new Map([["/src/combat/cover.ts",["firstSharedEdgeBlockingCell","traceCornerLine","traceSpaces","traceCombatantLine","traceCombatantLineToCells"]],["/src/combat/movement.ts",["findPath"]],["/src/vtt/room-generator.ts",["generateRoom"]]]);const plugin={name:"wall-perf",enforce:"pre",transform(code,id){const clean=id.split("?")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre=`const __vp=(globalThis).__WALL_PERF__??((globalThis).__WALL_PERF__={count:{},ms:{}});\n`;const w=entry[1].map((n,i)=>`\nconst __o${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/room-generator-los-cover.test.ts")){const w=`\nconst __vp=(globalThis).__WALL_PERF__??((globalThis).__WALL_PERF__={count:{},ms:{}});const __orp=reachesProductiveRegion;reachesProductiveRegion=function(...a){const t=performance.now();try{return __orp(...a)}finally{__vp.count.reachesProductiveRegion=(__vp.count.reachesProductiveRegion??0)+1;__vp.ms.reachesProductiveRegion=(__vp.ms.reachesProductiveRegion??0)+performance.now()-t}};`;return {code:`import {afterAll as __a} from "vitest";${code}${w}\n__a(()=>console.log("__WALL_PERF__"+JSON.stringify((globalThis).__WALL_PERF__)));`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/room-generator-los-cover.test.ts"],{configLoader:"runner",testNamePattern:"kills M576-E2-WALL-SEALS-ROOM for every living footprint size",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            

SyntaxError: Unexpected token ';'
    at compileSourceTextModule (node:internal/modules/esm/utils:318:16)
    at ModuleLoader.createModuleWrap (node:internal/modules/esm/loader:253:12)
    at ModuleLoader.eval (node:internal/modules/esm/loader:292:23)
    at node:internal/process/execution:77:24
    at asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:11)
    at Object.runEntryPointWithESMLoader (node:internal/modules/run_main:123:19)
    at evalModuleEntryPoint (node:internal/process/execution:76:47)
    at node:internal/main/eval_string:37:3

Node.js v24.13.0

exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import {startVitest} from \"vitest/node\";const targets=new Map([[\"/src/combat/cover.ts\",[\"firstSharedEdgeBlockingCell\",\"traceCornerLine\",\"traceSpaces\",\"traceCombatantLine\",\"traceCombatantLineToCells\"]],[\"/src/combat/movement.ts\",[\"findPath\"]],[\"/src/vtt/room-generator.ts\",[\"generateRoom\"]]]);const plugin={name:\"wall-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`const __vp=(globalThis).__WALL_PERF__??((globalThis).__WALL_PERF__={count:{},ms:{}});'"\\n"'`;const w=entry[1].map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/room-generator-los-cover.test.ts")){const w=`'"\\nconst __vp=(globalThis).__WALL_PERF__??((globalThis).__WALL_PERF__={count:{},ms:{}});const __orp=reachesProductiveRegion;reachesProductiveRegion=function(...a){const t=performance.now();try{return __orp(...a)}finally{__vp.count.reachesProductiveRegion=(__vp.count.reachesProductiveRegion??0)+1;__vp.ms.reachesProductiveRegion=(__vp.ms.reachesProductiveRegion??0)+performance.now()-t}};"'`;return {code:`import {afterAll as __a} from "vitest";${code}${w}'"\\n__a(()=>console.log(\"__WALL_PERF__\"+JSON.stringify((globalThis).__WALL_PERF__)));"'`,map:null};}}};const c=await startVitest("test",["tests/unit/vtt/room-generator-los-cover.test.ts"],{configLoader:"runner",testNamePattern:"kills M576-E2-WALL-SEALS-ROOM for every living footprint size",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 10931ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
------------·stdout | tests/unit/vtt/room-generator-los-cover.test.ts
__WALL_PERF__{"count":{"firstSharedEdgeBlockingCell":3985264,"traceCornerLine":3985264,"traceSpaces":249127,"traceCombatantLine":26047,"traceCombatantLineToCells":223801,"generateRoom":9,"findPath":108,"reachesProductiveRegion":64},"ms":{"firstSharedEdgeBlockingCell":357.9794150021762,"traceCornerLine":1800.9196050125565,"traceSpaces":4038.206569000111,"traceCombatantLine":596.0965789999982,"traceCombatantLineToCells":3794.1920380003457,"generateRoom":4460.978128000001,"findPath":781.6437019999976,"reachesProductiveRegion":786.809758000004}}

---------------------------------------------------------------------------------------------------

 Test Files  1 passed (1)
      Tests  1 passed | 111 skipped (112)
   Start at  10:05:17
   Duration  10.76s (transform 1.23s, setup 0ms, import 1.79s, tests 5.25s, environment 0ms)


exec
/bin/bash -lc "sed -n '1,380p' tests/unit/vtt/replay.test.ts; rg -n \"recordScriptedReferenceSkirmish|replayBundle\\(|OWN-BUNDLE|REPLAY-COMMAND|PLAYABLE-EXIT|const gate|function gate\" tests/unit/vtt/replay.test.ts; sed -n '180,360p' tests/unit/vtt/replay.test.ts; rg -n \"equivalentTerrainLineTraces|retainEquivalentTrace|terrainSourceSignature|indexedTerrainSources|sightBlockingSignature\" src/combat/cover.ts; sed -n '90,305p' src/combat/cover.ts; git diff 9f148666..807d2e3c -- src/vtt/engine-query-port.ts | sed -n '1,320p'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import {
  authoritativeReplayHash,
  createReplayBundle,
  decodeReplayBundle,
  emptyFleetTelemetry,
  exportReplayBundle,
  exportReplayBundleV1ForMigrationTest,
  replayBundle,
  ReplayDivergenceError,
  type ReplayBundle,
} from '../../../src/vtt/replay';
import { encounterStateFromApprovedFixture } from '../../../src/vtt/generated-encounter-fixtures';
import { EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink } from '../../../src/vtt/session-persistence';
import { reduceEncounter } from '../../../src/combat/encounter';
import { dmVisibleEncounter, projectDmView } from '../../../src/combat/visibility';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { feetPoint } from '../../../src/combat/templates';
import { armorClass, encounterBranchId, encounterSessionId, feet, worldObjectId } from '../../../src/combat/values';
import { recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../../../src/vtt/test-approved-first-skirmish';
import { runVttReplayCommand } from '../../../tools/vtt-replay';
import {
  HAND_AUTHORED_REPLAY_V5_BODY,
  HAND_AUTHORED_SESSION_V10_REVISION_BODY,
} from '../../fixtures/vtt/creature-space-migration-fixtures';

interface MutableReplayBundle {
  schemaVersion: number;
  encounterConfig: { initiativeMode: 'per_combatant' | 'shared_enemy' | 'side_alternating' };
  gapReports: Array<{
    packEntry: string;
    featurePath: string;
    requestedCapability: string;
    engineRefusalReason: string;
  }>;
  revisions: Array<{
    void: boolean;
    rng: { pre: { draws: number }; post: { draws: number } };
    projectionHashes: { dm: string; players: Array<{ combatantId: string; hash: string }> };
    revision: {
      transition: { kind: string; events?: Array<{ type: string }> };
    };
  }>;
  transcripts: Array<{
    kind: string;
    requestId: string | null;
    requestLink: { requestId: string; requestSequence: number } | null;
    fleet: {
      latencyMs: number | null;
      tokenCounts: { input: number; cachedInput: number; output: number; reasoning: number } | null;
      correctionAttempts: number | null;
    };
  }>;
}

function mutable(bundle: ReplayBundle): MutableReplayBundle {
  return structuredClone(bundle) as unknown as MutableReplayBundle;
}

function expectDivergence(
  action: () => unknown,
  source: ReplayDivergenceError['source'],
  recordIndex: number,
  field: string,
): void {
  try {
    action();
    throw new Error('Expected replay divergence.');
  } catch (error) {
    expect(error).toBeInstanceOf(ReplayDivergenceError);
    expect(error).toMatchObject({ source, recordIndex });
    expect((error as ReplayDivergenceError).field).toContain(field);
  }
}

describe('increment 10 deterministic replay and playable exit', () => {
  it('replays world-object creation byte-exactly', () => {
    const store = new MemoryBrowserSessionStore();
    const mirror = new MemoryMirrorSink();
    const sessionId = encounterSessionId('encounter:world-object-replay');
    const rng = mulberry32(0x330_139);
    const coordinatorState = {
      requestSequence: 1, pendingRequest: null, pendingCommand: null,
      continuation: { kind: 'idle' as const }, pause: null,
    };
    let state = encounterStateFromApprovedFixture(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const occupied = new Set([
      ...state.tokens.map((token) => `${String(token.position.column)},${String(token.position.row)}`),
      ...state.blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`),
    ]);
    const position = Array.from({ length: state.bounds.rows }, (_value, row) =>
      Array.from({ length: state.bounds.columns }, (_columnValue, column) => ({ column, row })))
      .flat()
      .find((cell) => !occupied.has(`${String(cell.column)},${String(cell.row)}`));
    if (position === undefined) throw new Error('Replay fixture has no free world-object cell.');
    const journal = EncounterSessionJournal.create({
      sessionId, branchId: encounterBranchId('branch:world-object-replay'), encounterState: state,
      coordinatorState, controllers: [],
      rng, store, mirror,
    });
    const command: EncounterCommand = {
      type: 'world_operation', actor: null, cost: 'none',
      operation: {
        kind: 'create_object',
        object: {
          id: worldObjectId('object:replay-wall'), name: 'Homebrew Replay Wall', kind: 'barrier',
          position, footprint: [position], durability: { kind: 'indestructible' },
          armorClass: armorClass(15), damageResponses: [],
          blocking: { movement: true, lineOfSight: true, cover: 'total' },
        },
      },
    };
    const reduction = reduceEncounter(state, command, journal.rng());
    state = reduction.state;
    journal.record({
      transition: { kind: 'reducer_applied', command, events: reduction.events },
      encounterState: state, coordinatorState, controllers: [],
    });
    const bundle = createReplayBundle({
      fixture: TEST_APPROVED_FIRST_SKIRMISH_FIXTURE, revisions: store.revisions(sessionId), transcripts: [],
      build: { buildId: 'world-object-test', commit: 'test' }, protocolVersions: ['world-object:1'],
      licensingVersions: ['SRD-5.2.1-CC-BY-4.0'], gapReports: [],
    });
    const bytes = exportReplayBundle(bundle);
    const decoded = decodeReplayBundle(bytes);
    expect(exportReplayBundle(decoded)).toBe(bytes);
    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
      bundle.revisions.at(-1)?.stateHash,
    );
  });

  it('replays two overlapping persistent areas byte-exactly in stable creation order', () => {
    const store = new MemoryBrowserSessionStore();
    const mirror = new MemoryMirrorSink();
    const sessionId = encounterSessionId('encounter:persistent-area-replay');
    const rng = mulberry32(0x330_088);
    const coordinatorState = {
      requestSequence: 1,
      pendingRequest: null,
      pendingCommand: null,
      continuation: { kind: 'idle' as const },
      pause: null,
    };
    let state = encounterStateFromApprovedFixture(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const journal = EncounterSessionJournal.create({
      sessionId, branchId: encounterBranchId('branch:persistent-area-replay'), encounterState: state,
      coordinatorState, controllers: [],
      rng, store, mirror,
    });
    const record = (command: EncounterCommand): void => {
      const reduction = reduceEncounter(state, command, rng);
      state = reduction.state;
      journal.record({
        transition: { kind: 'reducer_applied', command, events: reduction.events },
        encounterState: state, coordinatorState, controllers: [],
      });
    };
    record({ type: 'roll_initiative' });
    const owner = state.activeCombatant;
    if (owner === null) throw new Error('Persistent-area replay fixture has no active combatant.');
    for (const x of [20, 25]) {
      record({
        type: 'create_persistent_area', actor: owner, cost: 'none',
        area: {
          owner, origin: { kind: 'fixed', point: feetPoint(x, 20) },
          shape: { kind: 'sphere', radius: feet(10) }, duration: { kind: 'rounds', remaining: 3 },
          targetFilter: { kind: 'all' }, difficultTerrain: false, hooks: [], movable: null,
        },
      });
    }
    const bundle = createReplayBundle({
      fixture: TEST_APPROVED_FIRST_SKIRMISH_FIXTURE, revisions: store.revisions(sessionId), transcripts: [],
      build: { buildId: 'persistent-area-test', commit: 'test' }, protocolVersions: ['persistent-area:1'],
      licensingVersions: ['SRD-5.2.1-CC-BY-4.0'], gapReports: [],
    });
    const decoded = decodeReplayBundle(exportReplayBundle(bundle));
    expect(canonicalJson(decoded)).toBe(canonicalJson(bundle));
    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
      bundle.revisions.at(-1)?.stateHash,
    );
    expect(state.persistentAreas.map((area) => area.sequence)).toEqual([1, 2]);
  });

  it('PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte', () => {
    const gate = recordScriptedReferenceSkirmish();
    const replayed = replayBundle(gate.bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const transitions = gate.bundle.revisions.map((entry) => entry.revision.transition.kind);
    const events = gate.bundle.revisions.flatMap((entry) =>
      entry.revision.transition.kind === 'reducer_applied'
        ? entry.revision.transition.events.map((event) => event.type)
        : [],
    );
    const transcriptKinds = new Set(gate.bundle.transcripts.map((entry) => entry.kind));

    expect(replayed).toEqual(gate.proof);
    expect(replayed.rounds).toBe(4);
    expect(replayed.revisionCount).toBeGreaterThan(100);
    expect(replayed.eventCount).toBeGreaterThan(50);
    expect(new Set(events)).toEqual(expect.objectContaining(new Set([
      'movement_completed',
      'attack_resolved',
      'spell_cast',
      'effect_applied',
      'save_resolved',
      'death_save_resolved',
      'adjudicated',
    ])));
    expect(events).toContain('resource_spent');
    expect(transitions).toContain('head_moved');
    expect(transitions).toContain('coordinator_resumed');
    expect(gate.bundle.revisions.some((entry) => entry.void)).toBe(true);
    expect(transcriptKinds).toEqual(expect.objectContaining(new Set([
      'controller_request', 'policy_result', 'prompt', 'response', 'round_plan',
      'invalidation', 'adjudication', 'narration', 'undo', 'void', 'resume',
    ])));
    expect(canonicalJson(decodeReplayBundle(exportReplayBundle(gate.bundle)))).toBe(
      canonicalJson(gate.bundle),
    );
    expect(replayed.finalProjectionHashes).toEqual(
      gate.bundle.revisions.at(-1)?.projectionHashes,
    );
  });

  it('M61-TELEMETRY-OMITS-RNG-TRANSITION identifies the first missing RNG post-state', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.rng.post.draws > entry.rng.pre.draws);
    expect(index).toBeGreaterThanOrEqual(0);
    candidate.revisions[index]!.rng.post.draws = candidate.revisions[index]!.rng.pre.draws;
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'rng',
      index,
      'rng.post.draws',
    );
  });

  it('mode_not_serialized refuses to reconstruct a shared_enemy bundle as per_combatant', () => {
    const gate = recordScriptedReferenceSkirmish(0x320_004, 'engine:hit-points', 'shared_enemy');
    expect(gate.bundle.encounterConfig).toEqual({ initiativeMode: 'shared_enemy' });
    const candidate = mutable(gate.bundle);
    candidate.encounterConfig = { initiativeMode: 'per_combatant' };
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'bundle',
      0,
      'encounterConfig.initiativeMode',
    );
  });

  it('gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped', () => {
    const gate = recordScriptedReferenceSkirmish(0x317010, 'external:unmapped-mechanic');
    expect(gate.bundle.gapReports).toContainEqual(expect.objectContaining({
      featurePath: 'adjudicated.subject',
      requestedCapability: 'adjudication:external-mechanic',
      engineRefusalReason: 'non_engine_adjudication_subject',
    }));
    const candidate = mutable(gate.bundle);
    candidate.gapReports = [];
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'gap_report',
      -1,
      'gapReports',
    );
  });

  it('M62-CONTROLLER-RESPONSE-MISATTRIBUTED rejects a valid response linked to the prior request', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const requests = gate.bundle.transcripts.filter((entry) => entry.kind === 'controller_request');
    const first = requests[0];
    const second = requests.find(
      (entry) => entry.controller.controllerId !== first?.controller.controllerId,
    );
    if (first?.requestId === null || first?.requestId === undefined || second?.requestId === null || second?.requestId === undefined) {
      throw new Error('Scripted transcript needs two requests.');
    }
    const responseIndex = candidate.transcripts.findIndex(
      (entry) => entry.kind === 'response' && entry.requestLink?.requestId === second.requestId,
    );
    expect(responseIndex).toBeGreaterThanOrEqual(0);
    candidate.transcripts[responseIndex]!.requestLink = {
      requestId: first.requestId,
      requestSequence: gate.bundle.transcripts.find((entry) => entry.requestId === first.requestId)!.sequence,
    };
    const changed = candidate.transcripts[responseIndex] as unknown as Readonly<Record<string, unknown>>;
    const { contentHash: _contentHash, fleet: _fleet, ...content } = changed;
    (candidate.transcripts[responseIndex] as unknown as { contentHash: string }).contentHash =
      sha256(canonicalJson(content));
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'transcript',
      responseIndex,
      'controller.controllerId',
    );
  });

  it('M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const modeled = candidate.transcripts.find((entry) => entry.fleet.latencyMs !== null);
    if (modeled === undefined || modeled.fleet.latencyMs === null) throw new Error('Missing model telemetry.');
    modeled.fleet.latencyMs += 99_999;
    expect(authoritativeReplayHash(candidate as unknown as ReplayBundle)).toBe(
      authoritativeReplayHash(gate.bundle),
    );
    expect(replayBundle(candidate as unknown as ReplayBundle).finalStateHash).toBe(
      gate.proof.finalStateHash,
    );
  });

  it('M64-REPLAY-CALLS-LIVE-CONTROLLER exposes no controller or exchange capability', () => {
    const implementation = replayBundle.toString();
    expect(replayBundle.length).toBe(2);
    expect(implementation).not.toMatch(/\.choose\s*\(|\.exchange\s*\(/u);
    expect(() => replayBundle(recordScriptedReferenceSkirmish().bundle)).not.toThrow();
  });

  it('M65-VOID-BRANCH-REPLAYED-AS-LIVE refuses a void revision marked active', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.void);
    expect(index).toBeGreaterThanOrEqual(0);
    candidate.revisions[index]!.void = false;
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'bundle',
      index,
      'void',
    );
  });

  it('M66-PROJECTION-DIVERGENCE-IGNORED pinpoints the first bad player projection hash', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.projectionHashes.players.length > 0);
    candidate.revisions[index]!.projectionHashes.players[0]!.hash = '0'.repeat(64);
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'projection',
      index,
      'projectionHashes.players[0].hash',
    );
  });

  it('CORRUPTION-EVENT identifies the first bad event record and field', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) =>
      entry.revision.transition.kind === 'reducer_applied' &&
      (entry.revision.transition.events?.length ?? 0) > 0,
    );
    candidate.revisions[index]!.revision.transition.events![0]!.type = 'corrupted_event';
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'event',
      index,
      'transition.events[0].type',
    );
  });

  it('CORRUPTION-TRANSCRIPT identifies the first bad transcript content record', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.transcripts.findIndex((entry) => entry.kind === 'narration');
    candidate.transcripts[index]!.kind = 'resume';
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'transcript',
      index,
      'contentHash',
    );
  });

  it('OWN-TOKEN-COUNTS-CANNOT-INFLUENCE-REDUCER keeps usage out of state and view hashes', () => {
23:import { recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
131:    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
182:    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
188:  it('PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte', () => {
189:    const gate = recordScriptedReferenceSkirmish();
190:    const replayed = replayBundle(gate.bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
229:    const gate = recordScriptedReferenceSkirmish();
235:      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
243:    const gate = recordScriptedReferenceSkirmish(0x320_004, 'engine:hit-points', 'shared_enemy');
248:      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
256:    const gate = recordScriptedReferenceSkirmish(0x317010, 'external:unmapped-mechanic');
265:      () => replayBundle(candidate as unknown as ReplayBundle),
273:    const gate = recordScriptedReferenceSkirmish();
296:      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
304:    const gate = recordScriptedReferenceSkirmish();
312:    expect(replayBundle(candidate as unknown as ReplayBundle).finalStateHash).toBe(
321:    expect(() => replayBundle(recordScriptedReferenceSkirmish().bundle)).not.toThrow();
325:    const gate = recordScriptedReferenceSkirmish();
331:      () => replayBundle(candidate as unknown as ReplayBundle),
339:    const gate = recordScriptedReferenceSkirmish();
344:      () => replayBundle(candidate as unknown as ReplayBundle),
352:    const gate = recordScriptedReferenceSkirmish();
360:      () => replayBundle(candidate as unknown as ReplayBundle),
368:    const gate = recordScriptedReferenceSkirmish();
373:      () => replayBundle(candidate as unknown as ReplayBundle),
381:    const gate = recordScriptedReferenceSkirmish();
386:    const proof = replayBundle(candidate as unknown as ReplayBundle);
393:    const gate = recordScriptedReferenceSkirmish();
398:    expect(replayBundle(candidate as unknown as ReplayBundle).authoritativeHash).toBe(
403:      () => replayBundle(candidate as unknown as ReplayBundle),
410:  it('OWN-BUNDLE-VERSION-OUTSIDE-WINDOW is refused while the adjacent migration remains exact', () => {
411:    const gate = recordScriptedReferenceSkirmish();
468:  it('REPLAY-COMMAND reads only the recorded bundle and approved fixture', async () => {
469:    const gate = recordScriptedReferenceSkirmish();
    const decoded = decodeReplayBundle(exportReplayBundle(bundle));
    expect(canonicalJson(decoded)).toBe(canonicalJson(bundle));
    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
      bundle.revisions.at(-1)?.stateHash,
    );
    expect(state.persistentAreas.map((area) => area.sequence)).toEqual([1, 2]);
  });

  it('PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte', () => {
    const gate = recordScriptedReferenceSkirmish();
    const replayed = replayBundle(gate.bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const transitions = gate.bundle.revisions.map((entry) => entry.revision.transition.kind);
    const events = gate.bundle.revisions.flatMap((entry) =>
      entry.revision.transition.kind === 'reducer_applied'
        ? entry.revision.transition.events.map((event) => event.type)
        : [],
    );
    const transcriptKinds = new Set(gate.bundle.transcripts.map((entry) => entry.kind));

    expect(replayed).toEqual(gate.proof);
    expect(replayed.rounds).toBe(4);
    expect(replayed.revisionCount).toBeGreaterThan(100);
    expect(replayed.eventCount).toBeGreaterThan(50);
    expect(new Set(events)).toEqual(expect.objectContaining(new Set([
      'movement_completed',
      'attack_resolved',
      'spell_cast',
      'effect_applied',
      'save_resolved',
      'death_save_resolved',
      'adjudicated',
    ])));
    expect(events).toContain('resource_spent');
    expect(transitions).toContain('head_moved');
    expect(transitions).toContain('coordinator_resumed');
    expect(gate.bundle.revisions.some((entry) => entry.void)).toBe(true);
    expect(transcriptKinds).toEqual(expect.objectContaining(new Set([
      'controller_request', 'policy_result', 'prompt', 'response', 'round_plan',
      'invalidation', 'adjudication', 'narration', 'undo', 'void', 'resume',
    ])));
    expect(canonicalJson(decodeReplayBundle(exportReplayBundle(gate.bundle)))).toBe(
      canonicalJson(gate.bundle),
    );
    expect(replayed.finalProjectionHashes).toEqual(
      gate.bundle.revisions.at(-1)?.projectionHashes,
    );
  });

  it('M61-TELEMETRY-OMITS-RNG-TRANSITION identifies the first missing RNG post-state', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.rng.post.draws > entry.rng.pre.draws);
    expect(index).toBeGreaterThanOrEqual(0);
    candidate.revisions[index]!.rng.post.draws = candidate.revisions[index]!.rng.pre.draws;
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'rng',
      index,
      'rng.post.draws',
    );
  });

  it('mode_not_serialized refuses to reconstruct a shared_enemy bundle as per_combatant', () => {
    const gate = recordScriptedReferenceSkirmish(0x320_004, 'engine:hit-points', 'shared_enemy');
    expect(gate.bundle.encounterConfig).toEqual({ initiativeMode: 'shared_enemy' });
    const candidate = mutable(gate.bundle);
    candidate.encounterConfig = { initiativeMode: 'per_combatant' };
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'bundle',
      0,
      'encounterConfig.initiativeMode',
    );
  });

  it('gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped', () => {
    const gate = recordScriptedReferenceSkirmish(0x317010, 'external:unmapped-mechanic');
    expect(gate.bundle.gapReports).toContainEqual(expect.objectContaining({
      featurePath: 'adjudicated.subject',
      requestedCapability: 'adjudication:external-mechanic',
      engineRefusalReason: 'non_engine_adjudication_subject',
    }));
    const candidate = mutable(gate.bundle);
    candidate.gapReports = [];
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'gap_report',
      -1,
      'gapReports',
    );
  });

  it('M62-CONTROLLER-RESPONSE-MISATTRIBUTED rejects a valid response linked to the prior request', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const requests = gate.bundle.transcripts.filter((entry) => entry.kind === 'controller_request');
    const first = requests[0];
    const second = requests.find(
      (entry) => entry.controller.controllerId !== first?.controller.controllerId,
    );
    if (first?.requestId === null || first?.requestId === undefined || second?.requestId === null || second?.requestId === undefined) {
      throw new Error('Scripted transcript needs two requests.');
    }
    const responseIndex = candidate.transcripts.findIndex(
      (entry) => entry.kind === 'response' && entry.requestLink?.requestId === second.requestId,
    );
    expect(responseIndex).toBeGreaterThanOrEqual(0);
    candidate.transcripts[responseIndex]!.requestLink = {
      requestId: first.requestId,
      requestSequence: gate.bundle.transcripts.find((entry) => entry.requestId === first.requestId)!.sequence,
    };
    const changed = candidate.transcripts[responseIndex] as unknown as Readonly<Record<string, unknown>>;
    const { contentHash: _contentHash, fleet: _fleet, ...content } = changed;
    (candidate.transcripts[responseIndex] as unknown as { contentHash: string }).contentHash =
      sha256(canonicalJson(content));
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'transcript',
      responseIndex,
      'controller.controllerId',
    );
  });

  it('M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const modeled = candidate.transcripts.find((entry) => entry.fleet.latencyMs !== null);
    if (modeled === undefined || modeled.fleet.latencyMs === null) throw new Error('Missing model telemetry.');
    modeled.fleet.latencyMs += 99_999;
    expect(authoritativeReplayHash(candidate as unknown as ReplayBundle)).toBe(
      authoritativeReplayHash(gate.bundle),
    );
    expect(replayBundle(candidate as unknown as ReplayBundle).finalStateHash).toBe(
      gate.proof.finalStateHash,
    );
  });

  it('M64-REPLAY-CALLS-LIVE-CONTROLLER exposes no controller or exchange capability', () => {
    const implementation = replayBundle.toString();
    expect(replayBundle.length).toBe(2);
    expect(implementation).not.toMatch(/\.choose\s*\(|\.exchange\s*\(/u);
    expect(() => replayBundle(recordScriptedReferenceSkirmish().bundle)).not.toThrow();
  });

  it('M65-VOID-BRANCH-REPLAYED-AS-LIVE refuses a void revision marked active', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.void);
    expect(index).toBeGreaterThanOrEqual(0);
    candidate.revisions[index]!.void = false;
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'bundle',
      index,
      'void',
    );
  });

  it('M66-PROJECTION-DIVERGENCE-IGNORED pinpoints the first bad player projection hash', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.projectionHashes.players.length > 0);
    candidate.revisions[index]!.projectionHashes.players[0]!.hash = '0'.repeat(64);
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'projection',
      index,
      'projectionHashes.players[0].hash',
    );
  });

  it('CORRUPTION-EVENT identifies the first bad event record and field', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) =>
      entry.revision.transition.kind === 'reducer_applied' &&
      (entry.revision.transition.events?.length ?? 0) > 0,
    );
    candidate.revisions[index]!.revision.transition.events![0]!.type = 'corrupted_event';
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
171:function sightBlockingSignature(cells: readonly GridCell[]): string {
212:const terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();
213:const equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();
216:function terrainSourceSignature(
221:  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();
228:  if (!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);
232:function retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {
233:  equivalentTerrainLineTraces.set(key, trace);
234:  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;
235:  const oldest = equivalentTerrainLineTraces.keys().next().value;
236:  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);
277:function indexedTerrainSources(
473:  const blockerSignature = sightBlockingSignature(sightBlockingCells);
482:  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);
483:  const equivalentTraceKey = `${terrainSourceSignature(
488:  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);
551:  retainEquivalentTrace(equivalentTraceKey, selected);
576:  const blockerSignature = sightBlockingSignature(
607:  const blockerSignature = sightBlockingSignature(
  if (rowDelta === 0) {
    if (from.row <= minimumRow || from.row >= maximumRow) return false;
  } else {
    const first = (minimumRow - from.row) / rowDelta;
    const second = (maximumRow - from.row) / rowDelta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  return entry <= exit && exit > 0 && entry < 1;
}

function lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;
  if (magnitudeSquared === 0) return 0;
  return (
    (cell.column + 0.5 - from.column) * columnDelta +
    (cell.row + 0.5 - from.row) * rowDelta
  ) / magnitudeSquared;
}

/** Rasterizes a corner ray in source-to-target traversal order. */
export function rasterizeCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  const crossed: GridCell[] = [];
  for (const cell of candidates) {
    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);
  }
  if (crossed.length > 1) {
    crossed.sort((left, right) =>
      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));
  }
  return crossed;
}

export interface TerrainLineSource {
  readonly kind: 'blocked_cell' | 'world_object' | 'creature';
  readonly id: string;
  readonly tier: Exclude<CoverTier, 'none'>;
}

export interface TerrainCornerLineTrace {
  readonly targetCorner: CornerPoint;
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

export interface TerrainLineTrace {
  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly sourceCorner: CornerPoint;
  readonly lines: readonly TerrainCornerLineTrace[];
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

export interface TerrainLineOptions {
  readonly sourceId?: CombatantId;
  readonly targetId?: CombatantId;
  readonly includeCreatures?: boolean;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

function normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {
  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]
    .sort(compareCells);
}

function sightBlockingSignature(cells: readonly GridCell[]): string {
  return cells.map(cellKey).join(';');
}

function taggedSourceId(source: TerrainLineSource): string {
  switch (source.kind) {
    case 'blocked_cell': return `blocked:${source.id}`;
    case 'world_object': return `object:${source.id}`;
    case 'creature': return `creature:${source.id}`;
  }
}

interface TerrainSourceCell {
  readonly cell: GridCell;
  readonly sources: TerrainLineSource[];
}

function addSource(
  sourceCells: Map<string, TerrainSourceCell>,
  cell: GridCell,
  source: TerrainLineSource,
  exclusions: ReadonlySet<string>,
): void {
  const key = cellKey(cell);
  if (exclusions.has(key)) return;
  const existing = sourceCells.get(key);
  if (existing === undefined) {
    sourceCells.set(key, { cell: { ...cell }, sources: [source] });
  } else {
    existing.sources.push(source);
  }
}

interface TerrainSourceIndexes {
  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;
  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;
}

const terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();
const terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();
const equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();
const EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;

function terrainSourceSignature(
  state: EncounterState,
  includeCreatures: boolean,
  indexedSources: ReadonlyMap<string, TerrainSourceCell>,
): string {
  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();
  const cached = stateSignatures.get(includeCreatures);
  if (cached !== undefined) return cached;
  const signature = [...indexedSources].map(([key, entry]) =>
    `${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join(',')}`)
    .join('|');
  stateSignatures.set(includeCreatures, signature);
  if (!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);
  return signature;
}

function retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {
  equivalentTerrainLineTraces.set(key, trace);
  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;
  const oldest = equivalentTerrainLineTraces.keys().next().value;
  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);
}

function buildTerrainSourceIndex(
  state: EncounterState,
  includeCreatures: boolean,
  terrain?: ReadonlyMap<string, TerrainSourceCell>,
): ReadonlyMap<string, TerrainSourceCell> {
  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined
    ? new Map<string, TerrainSourceCell>()
    : new Map([...terrain].map(([key, entry]) => [key, {
        cell: { ...entry.cell }, sources: [...entry.sources],
      }] as const));
  const exclusions = new Set<string>();
  if (terrain === undefined) {
    for (const cell of state.blockedCells) {
      addSource(sourceCells, cell, {
        kind: 'blocked_cell', id: `${String(cell.column)},${String(cell.row)}`, tier: 'total',
      }, exclusions);
    }
    for (const object of state.worldObjects) {
      if (object.blocking.cover === 'none') continue;
      for (const cell of object.footprint) {
        addSource(sourceCells, cell, {
          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,
        }, exclusions);
      }
    }
  }
  if (!includeCreatures) return sourceCells;
  for (const candidate of state.combatants) {
    const id = candidate.profile.id;
    if (candidate.life === 'dead') continue;
    if (!state.tokens.some((token) => token.combatantId === id)) continue;
    for (const cell of combatantSpace(state, id).cells) {
      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);
    }
  }
  return sourceCells;
}

function indexedTerrainSources(
  state: EncounterState,
  includeCreatures: boolean,
): ReadonlyMap<string, TerrainSourceCell> {
  const cached = terrainSourceIndexes.get(state);
  if (cached !== undefined) {
    if (!includeCreatures) return cached.terrain;
    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);
    cached.withCreatures = withCreatures;
    return withCreatures;
  }
  const terrain = buildTerrainSourceIndex(state, false);
  const entry: TerrainSourceIndexes = { terrain };
  terrainSourceIndexes.set(state, entry);
  if (!includeCreatures) return terrain;
  const withCreatures = buildTerrainSourceIndex(state, true, terrain);
  entry.withCreatures = withCreatures;
  return withCreatures;
}

function uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {
  return sources
    .filter((source, index, all) =>
      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)
    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
}

function firstSharedEdgeBlockingCell(
  from: CornerPoint,
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index 21d80ef6..4c084d64 100644
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -2,6 +2,7 @@ import { combatantFaction, combatantsAreAllies } from '../combat/allies';
 import { conditionSpeedPenaltyFeet, exhaustionPenalty, isIncapacitated } from '../combat/conditions';
 import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
 import type { EncounterCombatantState, EncounterState } from '../combat/encounter';
+import { detectCombatant } from '../combat/visibility-field';
 import { coverBetweenCombatants, traceCombatantLine } from '../combat/cover';
 import {
   applySizeSteps,
@@ -56,11 +57,7 @@ import {
   type EngineZoneId,
 } from '../combat/values';
 import { wildShapeRulesLens } from '../combat/wild-shape';
-import {
-  environmentLightAt,
-  environmentObscurementAt,
-  isEnvironmentDifficultTerrain,
-} from '../combat/world-objects';
+import { isEnvironmentDifficultTerrain } from '../combat/world-objects';
 import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
 import type {
   ActorKnowledgeProjection,
@@ -199,6 +196,7 @@ export type EngineReachResult =
         | 'action_range_unresolved'
         | 'target_out_of_range'
         | 'target_has_total_cover'
+        | 'target_outside_line_of_sight'
       )[];
     };
 
@@ -247,7 +245,7 @@ export interface EngineQueryPort {
   visibility(state: EncounterState, actorId: CombatantId, targetId: CombatantId): {
     readonly visible: boolean;
     readonly reciprocal: boolean;
-    readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'unknown';
+    readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'devils_sight' | 'unknown';
     readonly reason: string | null;
   } | null;
 }
@@ -783,52 +781,6 @@ function isIncapacitatedByState(state: EncounterState, id: CombatantId): boolean
     .some((name) => names.has(name));
 }
 
-function sharesWebArea(state: EncounterState, observer: CombatantId, subject: CombatantId): boolean {
-  return state.persistentAreas.some((area) => area.material?.id === 'webs' &&
-    area.members.includes(observer) && area.members.includes(subject));
-}
-
-type Detection =
-  | { readonly kind: 'seen'; readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' }
-  | { readonly kind: 'located'; readonly sense: 'web_sense' }
-  | { readonly kind: 'undetected'; readonly reason: 'blocked' | 'hidden' | 'invisible' | 'obscured' | 'darkness' | 'out_of_range' };
-
-function detect(state: EncounterState, observer: CombatantId, subject: CombatantId): Detection | null {
-  const observerState = combatant(state, observer);
-  const observerPlaced = state.tokens.some((token) => token.combatantId === observer);
-  const subjectPlaced = state.tokens.some((token) => token.combatantId === subject);
-  if (observerState === null || combatant(state, subject) === null || !observerPlaced || !subjectPlaced) return null;
-  const line = traceCombatantLine(state, observer, subject);
-  const distance = minimumSpaceDistance(queryCombatantSpace(state, observer), queryCombatantSpace(state, subject));
-  const senses = rulesFor(observerState).senses;
-  if (senses.some((sense) => sense.kind === 'blindsight' && distance <= sense.rangeFeet) && !line.blocksSight) {
-    return { kind: 'seen', sense: 'blindsight' };
-  }
-  const truesight = senses.some((sense) => sense.kind === 'truesight' && distance <= sense.rangeFeet);
-  if (rulesFor(observerState).detectionTraits.includes('web_sense') && sharesWebArea(state, observer, subject)) {
-    return { kind: 'located', sense: 'web_sense' };
-  }
-  if (line.blocksSight) return { kind: 'undetected', reason: 'blocked' };
-  if (effectConditionNames(state, observer).has('Blinded')) return { kind: 'undetected', reason: 'obscured' };
-  if (state.hiddenCombatants.some((entry) => entry.combatant === subject) && !truesight) {
-    return { kind: 'undetected', reason: 'hidden' };
-  }
-  if (effectConditionNames(state, subject).has('Invisible') && !truesight) {
-    return { kind: 'undetected', reason: 'invisible' };
-  }
-  const obscurement = environmentObscurementAt(state.environment, line.targetCell);
-  if (obscurement === 'heavy') return { kind: 'undetected', reason: 'obscured' };
-  if (truesight) return { kind: 'seen', sense: 'truesight' };
-  if (obscurement === 'magical_darkness') return { kind: 'undetected', reason: 'darkness' };
-  if (environmentLightAt(state.environment, line.targetCell) !== 'darkness') {
-    return { kind: 'seen', sense: 'normal_sight' };
-  }
-  const darkvision = senses.some((sense) => sense.kind === 'darkvision' && distance <= sense.rangeFeet);
-  return darkvision
-    ? { kind: 'seen', sense: 'darkvision' }
-    : { kind: 'undetected', reason: senses.some((sense) => sense.kind === 'darkvision') ? 'out_of_range' : 'darkness' };
-}
-
 function ignoresDifficultTerrain(state: EncounterState, id: CombatantId): boolean {
   return state.effects.some((effect) => effect.targets.includes(id) && effect.payload.kind === 'movement_modifier' &&
     'modeGrants' in effect.payload && (effect.payload.difficultTerrainImmunity ||
@@ -1050,7 +1002,7 @@ function positionedCandidates(
   );
   return state.combatants.flatMap((candidate) => {
     const position = positions.get(candidate.profile.id);
-    return predicate(candidate) && position !== undefined ? [{ combatant: candidate, position }] : [];
+    return position !== undefined && predicate(candidate) ? [{ combatant: candidate, position }] : [];
   });
 }
 
@@ -1068,7 +1020,7 @@ function resolveTarget(
       state,
       (candidate) => candidate.life !== 'dead' &&
         combatantsAreAllies(state, actorId, candidate.profile.id) &&
-        detect(state, actorId, candidate.profile.id)?.kind === 'seen',
+        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen',
     ).sort((left, right) =>
       (left.combatant.hitPoints / left.combatant.profile.rules.hitPointMaximum) -
         (right.combatant.hitPoints / right.combatant.profile.rules.hitPointMaximum) ||
@@ -1085,7 +1037,7 @@ function resolveTarget(
       (
         selector.kind === 'current_threat' ||
         selector.kind === 'enemy_threatening_ally' ||
-        detect(state, actorId, candidate.profile.id)?.kind === 'seen'
+        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen'
       ),
   );
   if (selector.kind === 'lowest_hp_visible_enemy') {
@@ -1212,9 +1164,14 @@ function reach(state: EncounterState, request: EngineReachRequest): EngineReachR
   const actorSpace = queryCombatantSpaceAt(state, request.actorId, origin);
   const targetSpace = queryCombatantSpace(state, request.targetId);
   const distanceFeet = minimumSpaceDistance(actorSpace, targetSpace);
-  if ((action.kind === 'attack' || action.kind === 'saving_throw') &&
-    traceCombatantLine(state, request.actorId, request.targetId, { sourceAnchor: origin }).tier === 'total') {
-    return { legal: false, codes: ['target_has_total_cover'] };
+  if (action.kind === 'attack' || action.kind === 'saving_throw') {
+    const trace = traceCombatantLine(state, request.actorId, request.targetId, {
+      sourceAnchor: origin,
+    });
+    if (trace.blocksSight) {
+      return { legal: false, codes: ['target_outside_line_of_sight'] };
+    }
+    if (trace.tier === 'total') return { legal: false, codes: ['target_has_total_cover'] };
   }
   if (action.kind === 'attack') {
     const verdict = tacticalRangeVerdictAtDistance(distanceFeet, monsterAttackRange(action));
@@ -1268,11 +1225,11 @@ export function engineTacticalAttackInput(
     targetPosition === undefined || action === undefined
   ) return null;
   const selectedLine = minimumSpaceLine(queryCombatantSpace(state, actorId), queryCombatantSpace(state, targetId));
-  const detection = detect(state, actorId, targetId);
-  const reciprocal = detect(state, targetId, actorId);
+  const detection = detectCombatant(state, actorId, targetId);
+  const reciprocal = detectCombatant(state, targetId, actorId);
   const visible = {
-    visible: detection?.kind === 'seen',
-    reciprocal: reciprocal?.kind === 'seen',
+    visible: detection.kind === 'seen',
+    reciprocal: reciprocal.kind === 'seen',
   };
   const cover = coverBetweenCombatants(state, actorId, targetId).tier;
   const coverBonus = cover === 'half' ? 2 : cover === 'three_quarters' ? 5 : 0;
@@ -1490,7 +1447,7 @@ function movementOptions(
       candidate.profile.id === actorId || candidate.life === 'dead' || position === undefined ||
       combatantsAreAllies(state, actorId, candidate.profile.id) ||
       isIncapacitatedByState(state, candidate.profile.id) ||
-      detect(state, candidate.profile.id, actorId)?.kind !== 'seen'
+      detectCombatant(state, candidate.profile.id, actorId).kind !== 'seen'
     ) return [];
     return [{
       reactorId: candidate.profile.id,
@@ -1880,9 +1837,8 @@ const engineQueryPort: EngineQueryPort = {
       !state.tokens.some((token) => token.combatantId === actorId) ||
       !state.tokens.some((token) => token.combatantId === targetId)
     ) return null;
-    const detection = detect(state, actorId, targetId);
-    const reciprocal = detect(state, targetId, actorId);
-    if (detection === null || reciprocal === null) return null;
+    const detection = detectCombatant(state, actorId, targetId);
+    const reciprocal = detectCombatant(state, targetId, actorId);
     return {
       visible: detection.kind === 'seen',
       reciprocal: reciprocal.kind === 'seen',

exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import {startVitest} from \"vitest/node\";const names=[\"normalizedSightBlockingCells\",\"sightBlockingSignature\",\"terrainSourceSignature\",\"buildTerrainSourceIndex\",\"indexedTerrainSources\",\"firstSharedEdgeBlockingCell\",\"traceCornerLine\",\"traceSpaces\"];const plugin={name:\"cover-inner-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0];if(clean.endsWith(\"/src/combat/cover.ts\")){const pre="'`const __vp=(globalThis).__INNER_PERF__??((globalThis).__INNER_PERF__={count:{},ms:{}});'"\\n"'`;const w=names.map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/integration/vtt/pc-algorithm-policy.test.ts"))return {code:`import {afterAll as __a} from "vitest";${code}'"\\n__a(()=>console.log(\"__INNER_PERF__\"+JSON.stringify((globalThis).__INNER_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/integration/vtt/pc-algorithm-policy.test.ts"],{configLoader:"runner",testNamePattern:"vane-tpk-clean-terminates",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 14848ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
------------------·stdout | tests/integration/vtt/pc-algorithm-policy.test.ts
__INNER_PERF__{"count":{"normalizedSightBlockingCells":696768,"sightBlockingSignature":696768,"buildTerrainSourceIndex":1430,"indexedTerrainSources":348322,"terrainSourceSignature":348322,"firstSharedEdgeBlockingCell":535568,"traceCornerLine":535568,"traceSpaces":348353},"ms":{"normalizedSightBlockingCells":74.38902599953508,"sightBlockingSignature":32.222747999898274,"buildTerrainSourceIndex":27.965786999971897,"indexedTerrainSources":47.58205300064219,"terrainSourceSignature":27.25858100010555,"firstSharedEdgeBlockingCell":45.073488000471116,"traceCornerLine":703.1607230000973,"traceSpaces":4244.026463999309}}

--

 Test Files  1 passed (1)
      Tests  1 passed | 20 skipped (21)
   Start at  10:06:09
   Duration  14.69s (transform 2.39s, setup 0ms, import 3.28s, tests 7.64s, environment 0ms)


exec
/bin/bash -lc "TMPDIR=/dev/shm node --input-type=module -e '
import {startVitest} from \"vitest/node\";const targets=new Map([[\"/src/vtt/scripted-skirmish.ts\",[\"recordScriptedReferenceSkirmish\"]],[\"/src/vtt/replay.ts\",[\"createReplayBundle\",\"replayBundle\",\"replayRevisionRecords\"]]]);const plugin={name:\"gate-perf\",enforce:\"pre\",transform(code,id){const clean=id.split(\"?\")[0],entry=[...targets].find(([s])=>clean.endsWith(s));if(entry){const pre="'`const __vp=(globalThis).__GATE_PERF__??((globalThis).__GATE_PERF__={count:{},ms:{}});'"\\n"'`;const w=entry[1].map((n,i)=>`'"\\nconst __o"'${i}=${n};${n}=function(...a){const t=performance.now();try{return __o${i}(...a)}finally{__vp.count[${JSON.stringify(n)}]=(__vp.count[${JSON.stringify(n)}]??0)+1;__vp.ms[${JSON.stringify(n)}]=(__vp.ms[${JSON.stringify(n)}]??0)+performance.now()-t}};`).join("");return {code:pre+code+w,map:null};}if(clean.endsWith("/tests/unit/vtt/replay.test.ts"))return {code:`import {afterAll as __a} from "vitest";${code}'"\\n__a(()=>console.log(\"__GATE_PERF__\"+JSON.stringify((globalThis).__GATE_PERF__)));"'`,map:null};}};const c=await startVitest("test",["tests/unit/vtt/replay.test.ts"],{configLoader:"runner",testNamePattern:"PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte",testTimeout:30000,fileParallelism:false,reporters:["dot"]},{plugins:[plugin]});await c.close();
'"'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 9181ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-verify

[spell-source-parse-cache] derived /dev/shm/dnd-srd-spell-source-parse-cache/4f55a798b7cef6f3.json
--·stdout | tests/unit/vtt/replay.test.ts
__GATE_PERF__{"count":{"replayRevisionRecords":1,"replayBundle":5,"createReplayBundle":1,"recordScriptedReferenceSkirmish":1},"ms":{"replayRevisionRecords":331.2337990000001,"replayBundle":2766.3748699999996,"createReplayBundle":895.854668,"recordScriptedReferenceSkirmish":1904.831466}}

----------------

 Test Files  1 passed (1)
      Tests  1 passed | 18 skipped (19)
   Start at  10:07:07
   Duration  9.02s (transform 1.07s, setup 0ms, import 1.56s, tests 3.75s, environment 0ms)


codex
The replay profile confirms the repetition mechanism: one PLAYABLE test performs 828 revision projections, yielding 859 DM views plus 2,502 player-seat views (3,361 derived-fog calls total). The branch spends 923 ms in `projectReplayViews` versus 556 ms on main; its gate construction costs 1.905 s, and that gate is rebuilt independently in most replay tests. I’ve completed the profiling runs and am doing the final read-only integrity check now.
exec
/bin/bash -lc "printf 'BRANCH_AFTER\\n'; git status --short; git rev-parse HEAD; find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf 'MAIN_AFTER\\n'; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static status --short; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static rev-parse HEAD; find /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf 'LIVE_TEST_PROCESSES\\n'; pgrep -af 'vitest|vite-node|node.*pc-algorithm|node.*room-generator' || true" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 32ms:
59f5d4e7fa03612f7eb5163911eebcd4d3521e930dc5556aace23c66d644ead1  -
LIVE_TEST_PROCESSES
1 /home/vagrant/.codex/tmp/arg0/codex-arg0yAYPN9/codex-linux-sandbox --sandbox-policy-cwd /home/vagrant/PhpstormProjects/dnd-wt-seam-verify --command-cwd /home/vagrant/PhpstormProjects/dnd-wt-seam-verify --permission-profile {"type":"managed","file_system":{"type":"restricted","entries":[{"path":{"type":"special","value":{"kind":"root"}},"access":"read"}]},"network":"restricted"} --apply-seccomp-then-exec -- /bin/bash -c __CODEX_SNAPSHOT_OVERRIDE_SET_0="${CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS+x}" __CODEX_SNAPSHOT_OVERRIDE_0="${CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS-}" __CODEX_SNAPSHOT_OVERRIDE_SET_1="${CODEX_PERMISSION_PROFILE+x}" __CODEX_SNAPSHOT_OVERRIDE_1="${CODEX_PERMISSION_PROFILE-}" __CODEX_SNAPSHOT_OVERRIDE_SET_2="${CODEX_PLUGIN_METRICS_OUTPUT+x}" __CODEX_SNAPSHOT_OVERRIDE_2="${CODEX_PLUGIN_METRICS_OUTPUT-}" __CODEX_SNAPSHOT_OVERRIDE_SET_3="${CODEX_SESSION_ID+x}" __CODEX_SNAPSHOT_OVERRIDE_3="${CODEX_SESSION_ID-}" __CODEX_SNAPSHOT_OVERRIDE_SET_4="${CODEX_THREAD_ID+x}" __CODEX_SNAPSHOT_OVERRIDE_4="${CODEX_THREAD_ID-}" __CODEX_SNAPSHOT_OVERRIDE_SET_5="${CODEX_VERSION+x}" __CODEX_SNAPSHOT_OVERRIDE_5="${CODEX_VERSION-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_0="${ALL_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_0="${ALL_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_1="${BUNDLE_HTTPS_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_1="${BUNDLE_HTTPS_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_2="${BUNDLE_HTTP_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_2="${BUNDLE_HTTP_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_3="${BUNDLE_NO_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_3="${BUNDLE_NO_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_4="${BUNDLE_SSL_CA_CERT+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_4="${BUNDLE_SSL_CA_CERT-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_5="${CARGO_HTTP_CAINFO+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_5="${CARGO_HTTP_CAINFO-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_6="${CODEX_CA_CERTIFICATE+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_6="${CODEX_CA_CERTIFICATE-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_7="${CODEX_NETWORK_ALLOW_LOCAL_BINDING+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_7="${CODEX_NETWORK_ALLOW_LOCAL_BINDING-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_8="${CODEX_NETWORK_PROXY_ACTIVE+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_8="${CODEX_NETWORK_PROXY_ACTIVE-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_9="${CODEX_NETWORK_PROXY_ATTRIBUTION+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_9="${CODEX_NETWORK_PROXY_ATTRIBUTION-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_10="${CODEX_NETWORK_PROXY_BROKERED_CREDENTIALS+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_10="${CODEX_NETWORK_PROXY_BROKERED_CREDENTIALS-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_11="${CODEX_NETWORK_PROXY_CREDENTIAL_BROKER_ACTIVE+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_11="${CODEX_NETWORK_PROXY_CREDENTIAL_BROKER_ACTIVE-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_12="${CURL_CA_BUNDLE+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_12="${CURL_CA_BUNDLE-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_13="${DOCKER_HTTPS_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_13="${DOCKER_HTTPS_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_14="${DOCKER_HTTP_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_14="${DOCKER_HTTP_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_15="${ELECTRON_GET_USE_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_15="${ELECTRON_GET_USE_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_16="${FTP_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_16="${FTP_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_17="${GIT_SSL_CAINFO+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_17="${GIT_SSL_CAINFO-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_18="${HTTPS_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_18="${HTTPS_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_19="${HTTP_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_19="${HTTP_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_20="${NODE_EXTRA_CA_CERTS+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_20="${NODE_EXTRA_CA_CERTS-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_21="${NODE_USE_ENV_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_21="${NODE_USE_ENV_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_22="${NO_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_22="${NO_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_23="${NPM_CONFIG_CAFILE+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_23="${NPM_CONFIG_CAFILE-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_24="${NPM_CONFIG_HTTPS_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_24="${NPM_CONFIG_HTTPS_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_25="${NPM_CONFIG_HTTP_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_25="${NPM_CONFIG_HTTP_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_26="${NPM_CONFIG_NOPROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_26="${NPM_CONFIG_NOPROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_27="${NPM_CONFIG_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_27="${NPM_CONFIG_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_28="${PIP_CERT+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_28="${PIP_CERT-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_29="${PIP_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_29="${PIP_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_30="${REQUESTS_CA_BUNDLE+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_30="${REQUESTS_CA_BUNDLE-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_31="${SSL_CERT_FILE+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_31="${SSL_CERT_FILE-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_32="${WSS_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_32="${WSS_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_33="${WS_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_33="${WS_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_34="${YARN_HTTPS_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_34="${YARN_HTTPS_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_35="${YARN_HTTP_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_35="${YARN_HTTP_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_36="${YARN_NO_PROXY+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_36="${YARN_NO_PROXY-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_37="${all_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_37="${all_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_38="${ftp_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_38="${ftp_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_39="${http_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_39="${http_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_40="${https_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_40="${https_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_41="${no_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_41="${no_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_42="${npm_config_cafile+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_42="${npm_config_cafile-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_43="${npm_config_http_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_43="${npm_config_http_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_44="${npm_config_https_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_44="${npm_config_https_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_45="${npm_config_noproxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_45="${npm_config_noproxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_46="${npm_config_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_46="${npm_config_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_47="${ws_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_47="${ws_proxy-}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_48="${wss_proxy+x}" __CODEX_SNAPSHOT_PROXY_OVERRIDE_48="${wss_proxy-}" __CODEX_SNAPSHOT_PROXY_ENV_SET="${CODEX_NETWORK_PROXY_ACTIVE+x}"  if . '/home/vagrant/.codex/shell_snapshots/01a0afa3-7fad-7433-8e38-dc38461d422f.1789653122994633559.sh' >/dev/null 2>&1; then :; fi  if [ -n "${__CODEX_SNAPSHOT_OVERRIDE_SET_0}" ]; then export CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS="${__CODEX_SNAPSHOT_OVERRIDE_0}"; else unset CODEX_APPLY_PATCH_PRESERVE_LINE_ENDINGS; fi if [ -n "${__CODEX_SNAPSHOT_OVERRIDE_SET_1}" ]; then export CODEX_PERMISSION_PROFILE="${__CODEX_SNAPSHOT_OVERRIDE_1}"; else unset CODEX_PERMISSION_PROFILE; fi if [ -n "${__CODEX_SNAPSHOT_OVERRIDE_SET_2}" ]; then export CODEX_PLUGIN_METRICS_OUTPUT="${__CODEX_SNAPSHOT_OVERRIDE_2}"; else unset CODEX_PLUGIN_METRICS_OUTPUT; fi if [ -n "${__CODEX_SNAPSHOT_OVERRIDE_SET_3}" ]; then export CODEX_SESSION_ID="${__CODEX_SNAPSHOT_OVERRIDE_3}"; else unset CODEX_SESSION_ID; fi if [ -n "${__CODEX_SNAPSHOT_OVERRIDE_SET_4}" ]; then export CODEX_THREAD_ID="${__CODEX_SNAPSHOT_OVERRIDE_4}"; else unset CODEX_THREAD_ID; fi if [ -n "${__CODEX_SNAPSHOT_OVERRIDE_SET_5}" ]; then export CODEX_VERSION="${__CODEX_SNAPSHOT_OVERRIDE_5}"; else unset CODEX_VERSION; fi if [ -n "$__CODEX_SNAPSHOT_PROXY_ENV_SET" ] || [ -n "${CODEX_NETWORK_PROXY_ACTIVE+x}" ]; then if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_0}" ]; then export ALL_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_0}"; else unset ALL_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_1}" ]; then export BUNDLE_HTTPS_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_1}"; else unset BUNDLE_HTTPS_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_2}" ]; then export BUNDLE_HTTP_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_2}"; else unset BUNDLE_HTTP_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_3}" ]; then export BUNDLE_NO_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_3}"; else unset BUNDLE_NO_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_4}" ]; then export BUNDLE_SSL_CA_CERT="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_4}"; else unset BUNDLE_SSL_CA_CERT; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_5}" ]; then export CARGO_HTTP_CAINFO="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_5}"; else unset CARGO_HTTP_CAINFO; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_6}" ]; then export CODEX_CA_CERTIFICATE="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_6}"; else unset CODEX_CA_CERTIFICATE; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_7}" ]; then export CODEX_NETWORK_ALLOW_LOCAL_BINDING="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_7}"; else unset CODEX_NETWORK_ALLOW_LOCAL_BINDING; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_8}" ]; then export CODEX_NETWORK_PROXY_ACTIVE="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_8}"; else unset CODEX_NETWORK_PROXY_ACTIVE; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_9}" ]; then export CODEX_NETWORK_PROXY_ATTRIBUTION="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_9}"; else unset CODEX_NETWORK_PROXY_ATTRIBUTION; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_10}" ]; then export CODEX_NETWORK_PROXY_BROKERED_CREDENTIALS="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_10}"; else unset CODEX_NETWORK_PROXY_BROKERED_CREDENTIALS; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_11}" ]; then export CODEX_NETWORK_PROXY_CREDENTIAL_BROKER_ACTIVE="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_11}"; else unset CODEX_NETWORK_PROXY_CREDENTIAL_BROKER_ACTIVE; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_12}" ]; then export CURL_CA_BUNDLE="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_12}"; else unset CURL_CA_BUNDLE; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_13}" ]; then export DOCKER_HTTPS_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_13}"; else unset DOCKER_HTTPS_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_14}" ]; then export DOCKER_HTTP_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_14}"; else unset DOCKER_HTTP_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_15}" ]; then export ELECTRON_GET_USE_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_15}"; else unset ELECTRON_GET_USE_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_16}" ]; then export FTP_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_16}"; else unset FTP_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_17}" ]; then export GIT_SSL_CAINFO="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_17}"; else unset GIT_SSL_CAINFO; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_18}" ]; then export HTTPS_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_18}"; else unset HTTPS_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_19}" ]; then export HTTP_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_19}"; else unset HTTP_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_20}" ]; then export NODE_EXTRA_CA_CERTS="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_20}"; else unset NODE_EXTRA_CA_CERTS; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_21}" ]; then export NODE_USE_ENV_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_21}"; else unset NODE_USE_ENV_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_22}" ]; then export NO_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_22}"; else unset NO_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_23}" ]; then export NPM_CONFIG_CAFILE="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_23}"; else unset NPM_CONFIG_CAFILE; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_24}" ]; then export NPM_CONFIG_HTTPS_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_24}"; else unset NPM_CONFIG_HTTPS_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_25}" ]; then export NPM_CONFIG_HTTP_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_25}"; else unset NPM_CONFIG_HTTP_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_26}" ]; then export NPM_CONFIG_NOPROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_26}"; else unset NPM_CONFIG_NOPROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_27}" ]; then export NPM_CONFIG_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_27}"; else unset NPM_CONFIG_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_28}" ]; then export PIP_CERT="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_28}"; else unset PIP_CERT; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_29}" ]; then export PIP_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_29}"; else unset PIP_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_30}" ]; then export REQUESTS_CA_BUNDLE="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_30}"; else unset REQUESTS_CA_BUNDLE; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_31}" ]; then export SSL_CERT_FILE="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_31}"; else unset SSL_CERT_FILE; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_32}" ]; then export WSS_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_32}"; else unset WSS_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_33}" ]; then export WS_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_33}"; else unset WS_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_34}" ]; then export YARN_HTTPS_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_34}"; else unset YARN_HTTPS_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_35}" ]; then export YARN_HTTP_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_35}"; else unset YARN_HTTP_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_36}" ]; then export YARN_NO_PROXY="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_36}"; else unset YARN_NO_PROXY; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_37}" ]; then export all_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_37}"; else unset all_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_38}" ]; then export ftp_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_38}"; else unset ftp_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_39}" ]; then export http_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_39}"; else unset http_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_40}" ]; then export https_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_40}"; else unset https_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_41}" ]; then export no_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_41}"; else unset no_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_42}" ]; then export npm_config_cafile="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_42}"; else unset npm_config_cafile; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_43}" ]; then export npm_config_http_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_43}"; else unset npm_config_http_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_44}" ]; then export npm_config_https_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_44}"; else unset npm_config_https_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_45}" ]; then export npm_config_noproxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_45}"; else unset npm_config_noproxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_46}" ]; then export npm_config_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_46}"; else unset npm_config_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_47}" ]; then export ws_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_47}"; else unset ws_proxy; fi if [ -n "${__CODEX_SNAPSHOT_PROXY_OVERRIDE_SET_48}" ]; then export wss_proxy="${__CODEX_SNAPSHOT_PROXY_OVERRIDE_48}"; else unset wss_proxy; fi fi if [ -n "${PATH:-}" ]; then export PATH='/home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/@openai/codex/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/codex-path':"$PATH"; else export PATH='/home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/@openai/codex/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/codex-path'; fi  exec '/bin/bash' -c 'printf '"'"'BRANCH_AFTER\n'"'"'; git status --short; git rev-parse HEAD; find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf '"'"'MAIN_AFTER\n'"'"'; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static status --short; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static rev-parse HEAD; find /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf '"'"'LIVE_TEST_PROCESSES\n'"'"'; pgrep -af '"'"'vitest|vite-node|node.*pc-algorithm|node.*room-generator'"'"' || true'
2 /bin/bash -c printf 'BRANCH_AFTER\n'; git status --short; git rev-parse HEAD; find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf 'MAIN_AFTER\n'; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static status --short; git -C /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static rev-parse HEAD; find /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum; printf 'LIVE_TEST_PROCESSES\n'; pgrep -af 'vitest|vite-node|node.*pc-algorithm|node.*room-generator' || true

codex
## Performance investigation

Compared:

- VIS-FIELD branch: `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`
- Main baseline: `9f1486665399571c57fdd82fa3745b1d8fca457a`

Vitest needed temporary storage, so `TMPDIR=/dev/shm` was used. Instrumentation was an inline `startVitest()` Vite transform that wrapped named functions in memory; repository files were never modified. Wrapper timings are inclusive and directional; uninstrumented Vitest timings are authoritative.

### 1. `vane-tpk-clean-terminates`

Command, run from each checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/integration/vtt/pc-algorithm-policy.test.ts \
  -t 'vane-tpk-clean-terminates' \
  --reporter=verbose --no-file-parallelism --testTimeout=20000
```

| Revision | Test time | Wall time | Delta |
|---|---:|---:|---:|
| Main | 3,180 ms | 12.08 s | — |
| VIS-FIELD | 6,820 ms | 15.71 s | +3,640 ms, 2.14× |

#### Exact call comparison

| Function/path | Main | VIS-FIELD | Multiplier |
|---|---:|---:|---:|
| Visibility queries (`canCombatantSee` / `detectCombatant`) | 105,823 | 88,059 | 0.83× |
| Pair sight queries | 105,823 | 88,059 | 0.83× |
| Creature/cell trace entry | 105,969 combatant traces | 348,284 cell traces | 3.29× |
| `traceSpaces` | 95,031 | 348,353 | 3.67× |
| `traceCornerLine` | 123,584 | 535,568 | 4.33× |
| Player projections | 275 | 206 | 0.75× |
| Derived-fog computations | authored fog only | 206 | new |

The slowdown is therefore not caused by more detection requests. It comes from expanding each sight query into target-cell traces in [visibility-field.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:431), especially for large-footprint creatures.

Of the 348,284 VIS-FIELD cell traces:

| Caller | Calls | Share | Instrumented inclusive trace time |
|---|---:|---:|---:|
| `sightToCreature` pair detection | 319,444 | 91.7% | 4,758 ms |
| `derivedFogCells` | 28,840 | 8.3% | 555 ms |

Thus, only about 0.55–0.68 s is the full-board field/projection itself. Pairwise detection accounts for most of the added ~3.6 s.

#### Calls by combat round

The arena is 14×10, so a field scan is 140 cells.

| Round | Player projections | Distinct projected revisions | Fog traces | Pair-detection traces |
|---|---:|---:|---:|---:|
| Initial/r0 | 0 | 0 | 0 | 932 |
| 1 | 90 | 89 | 12,600 | 159,222 |
| 2 | 50 | 50 | 7,000 | 83,108 |
| 3 | 65 | 65 | 9,100 | 74,526 |
| 4 | 1 | 1 | 140 | 1,656 |
| Total | 206 | 205 | 28,840 | 319,444 |

The field is effectively recomputed once per projected state revision/controller request, not once per turn. There were 206 projections across 205 distinct revisions; only one revision was projected twice. Because the first eligible observer sees the whole board in this fixture, each projection performed exactly 140 fog traces even when the eligible observer set contained multiple PCs.

The weak caches in [visibility-field.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:104) are state-object keyed. Immutable reducer revisions therefore make nearly every request cold, despite unchanged geometry and illumination.

---

### 2. LOS-cover tests

Matched four-way timing command, substituting each title and checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/unit/vtt/room-generator-los-cover.test.ts \
  -t '<exact test title>' \
  --reporter=verbose --no-file-parallelism --testTimeout=20000
```

| Test | Main | VIS-FIELD | Delta |
|---|---:|---:|---:|
| Productive first-turn option | 5,472 ms | 6,139 ms | +667 ms, +12.2% |
| WALL-SEALS-ROOM | 5,395 ms | 5,865 ms | +470 ms, +8.7% |

These timings were under matched concurrent load; they explain the 5.1–6.2 s full-suite observations but are less quiet than the vane and D630 measurements.

#### Productive first-turn profile

| Path | Main calls/time | VIS-FIELD calls/time |
|---|---:|---:|
| `generateRoom` | 9 / 3,749 ms | 9 / 4,550 ms |
| `traceSpaces` | 284,121 / 3,530 ms | 284,121 / 4,331 ms |
| `traceCornerLine` | 4,173,840 / 1,213 ms | 4,173,984 / 1,932 ms |
| `firstSharedEdgeBlockingCell` | absent | 4,173,984 / 380 ms |
| `reach` | 46,650 / 325 ms | 46,650 / 367 ms |
| Offer environments built | 1 | 1 |
| Monster option enumerations | 39 | 39 |
| Options resolved | 630 | 630 |

This regression is the seam scan in [cover.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/cover.ts:304), not visibility-field computation or extra offer generation.

The 46,650 `reach` results were:

| Result | Count |
|---|---:|
| `target_out_of_range` | 33,092 |
| `action_range_unresolved` | 861 |
| Legal | 12,556 |
| `target_outside_line_of_sight` | 141 |

All 46,650 performed an anchored line trace before the range verdict in [engine-query-port.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/engine-query-port.ts:1134). Therefore 33,953 traces—72.8%—were performed for candidates subsequently rejected by range handling.

#### WALL-SEALS-ROOM profile

On VIS-FIELD:

| Path | Calls | Inclusive time |
|---|---:|---:|
| `generateRoom` | 9 | 4,461 ms |
| `traceSpaces` | 249,127 | 4,038 ms |
| `traceCornerLine` | 3,985,264 | 1,801 ms |
| `firstSharedEdgeBlockingCell` | 3,985,264 | 358 ms |
| `reachesProductiveRegion` | 64 | 787 ms |
| `findPath` | 108 | 782 ms |

Again, room generation dominates. The test-specific reachability assertion is under 0.8 s.

---

### 3. D630 replay + detection pair

Command, run sequentially from each checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts \
  --reporter=verbose --no-file-parallelism --testTimeout=60000
```

| Revision | Tests | Test time | Vitest duration | Wall |
|---|---:|---:|---:|---:|
| Main | 35 | 28.24 s | 33.55 s | 34.04 s |
| VIS-FIELD | 36 | 35.94 s | 41.45 s | 41.97 s |
| Delta | +1 | +7.70 s | +7.90 s | +7.93 s |

The extra branch detection test took 2 ms. Detection-reactions otherwise remained 0–16 ms per test; replay owns essentially the entire regression.

Largest replay movements:

| Test | Main | VIS-FIELD | Delta |
|---|---:|---:|---:|
| OWN-BUNDLE-VERSION-OUTSIDE-WINDOW | 3,255 ms | 4,145 ms | +890 ms |
| PLAYABLE-EXIT | 2,935 ms | 3,736 ms | +801 ms |
| REPLAY-COMMAND | 2,808 ms | 3,495 ms | +687 ms |
| OWN-TOKEN-COUNTS | 1,849 ms | 2,382 ms | +533 ms |
| M63 latency/hash | 2,027 ms | 2,539 ms | +512 ms |
| M65 void branch | 1,497 ms | 2,004 ms | +507 ms |
| M64 no live controller | 1,835 ms | 2,339 ms | +504 ms |

#### Representative PLAYABLE profile

[replay.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/replay.ts:238) creates one DM projection plus one projection per PC for every replayed revision.

| Path | Main | VIS-FIELD |
|---|---:|---:|
| `projectReplayViews` calls | 822 | 828 |
| DM views | 853 | 859 |
| Player views | 2,484 | 2,502 |
| Derived-fog calls | authored fog | 3,361 |
| `traceSpaces` | 47,918 | 159,843 |
| `projectReplayViews` inclusive | 556 ms | 923 ms |
| `replayBundle` inclusive | 2,240 ms | 2,891 ms |

One PLAYABLE invocation rebuilt the scripted gate once:

- `recordScriptedReferenceSkirmish`: 1,905 ms
- `createReplayBundle`: 896 ms
- `replayRevisionRecords`: 331 ms
- `replayBundle`: five calls, 2,766 ms cumulative/inclusive

The replay file contains 15 gate constructions, 13 using the default parameters. This confirms the pending TEST-PERF plan’s default-gate reuse is the largest bounded test-only opportunity.

---

## Top three hot paths and bounded fixes

| Rank | Hot path | Proposed fix | Estimated saving | Required invariant/witness |
|---|---|---|---:|---|
| 1 | Repeated scripted replay gate plus per-revision projections | Build each parameterized gate once, deep-freeze it, and `structuredClone` every mutating candidate. Retain independent `replayBundle` execution per test. | Roughly 20–23 s from the replay file: 12 redundant default builds × ~1.9 s gross | Gate canonical hash unchanged before/after every test; shuffled-order run twice; separate cache entries for default and both non-default parameter combinations; every corruption test must still fail against its independently cloned mutation. |
| 2 | `sightToCreature → evaluateCell → traceCombatantLineToCells → traceSpaces` | Cache visibility outcomes by an explicit visibility/geometry epoch plus observer/subject or observer-set key, rather than `EncounterState` identity. HP/event-log-only revisions may reuse; movement, footprints, walls, objects, light, obscurement, relevant conditions/effects, hidden state, senses, life, placement, or observer eligibility must bump the epoch. | Approximately 2.5–3.5 s in vane; 0.4–0.8 s per full replay reconstruction | For every revision, compare cached output with a forced from-scratch computation for every eligible observer/subject pair and every cell. Require byte-identical fog, sight reason/sense/grade, and projection hashes. Include Large/Huge footprints, seam rays, darkness, obscurement, Invisible, Hidden, Blinded, death and placement changes. |
| 3 | Nine-room regeneration and millions of seam-bearing corner traces | TEST-PERF: generate and deep-freeze the nine versioned rooms once per suite, reuse them in read-only tests, and preserve two independent generations solely for determinism. Separately, memoize seam results by blocking-topology signature plus corner endpoints where production generation still repeats them. | About 4.46–4.55 s from each named test; seam memoization offers another bounded ~0.35–0.7 s | Shared fixtures must remain byte-identical and immutable; mutation-isolation witness must fail on attempted writes. Seam cache must match fresh results for all rays in all nine rooms, including reverse, horizontal, vertical, diagonal, zero-length and source/target-adjacent rays; `blocksSight`, `firstBlockingCell`, physical cover tier and source IDs must all match. |

A smaller fourth opportunity is offer-internal range pruning: 72.8% of productive-test `reach` calls traced LOS before ultimately failing range. Keep public `reach` refusal precedence unchanged; prefilter only the offer-generation path using the same range predicate. The measured upper bound is roughly 0.2–0.3 s in this test.

## Correctness-smell assessment

- No evidence of fields being computed for ineligible observers. [eligibleVisibilityObserverIds](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:525) excluded dead, unplaced, adjudication-pending and Unconscious combatants. Observed fog work was exactly 140 traces per projection because the first eligible observer saw every board cell.
- The state-identity cache is a performance-design smell, not a current correctness defect. It preserves correct results but discards reuse across revisions whose visibility inputs are unchanged.
- Per-target-cell tracing for large footprints is correctness-sensitive. Replacing it with a single representative ray without a from-scratch differential witness would be a correctness regression.
- The 33,953 range-doomed LOS traces are semantic overwork and therefore a correctness-adjacent smell in offer generation. Results are currently correct, but the engine evaluates expensive geometry for candidates already mechanically impossible. Reordering the public validation path could change refusal precedence, so the safe fix belongs in internal offer prefiltering.
- The shared-edge scan itself is required correctness work. Its cost is real, but removing it or folding it into physical cover would violate the optical seam rule.

## Integrity and restoration

Production hash command:

```bash
find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
```

| Checkout | Before | After |
|---|---|---|
| VIS-FIELD | `f46957b6d8e35287823e5243247c347e47896de19490afcd2f2871bfdaffa064` | identical |
| Main | `59f5d4e7fa03612f7eb5163911eebcd4d3521e930dc5556aace23c66d644ead1` | identical |

VIS-FIELD remained clean. Main’s pre-existing `.claude/**` modifications and untracked files were unchanged; no production file changed. All instrumentation existed only in Vitest’s in-memory transform pipeline, and no test process remained running.

PERF-INVESTIGATION DONE
tokens used
206,562
## Performance investigation

Compared:

- VIS-FIELD branch: `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`
- Main baseline: `9f1486665399571c57fdd82fa3745b1d8fca457a`

Vitest needed temporary storage, so `TMPDIR=/dev/shm` was used. Instrumentation was an inline `startVitest()` Vite transform that wrapped named functions in memory; repository files were never modified. Wrapper timings are inclusive and directional; uninstrumented Vitest timings are authoritative.

### 1. `vane-tpk-clean-terminates`

Command, run from each checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/integration/vtt/pc-algorithm-policy.test.ts \
  -t 'vane-tpk-clean-terminates' \
  --reporter=verbose --no-file-parallelism --testTimeout=20000
```

| Revision | Test time | Wall time | Delta |
|---|---:|---:|---:|
| Main | 3,180 ms | 12.08 s | — |
| VIS-FIELD | 6,820 ms | 15.71 s | +3,640 ms, 2.14× |

#### Exact call comparison

| Function/path | Main | VIS-FIELD | Multiplier |
|---|---:|---:|---:|
| Visibility queries (`canCombatantSee` / `detectCombatant`) | 105,823 | 88,059 | 0.83× |
| Pair sight queries | 105,823 | 88,059 | 0.83× |
| Creature/cell trace entry | 105,969 combatant traces | 348,284 cell traces | 3.29× |
| `traceSpaces` | 95,031 | 348,353 | 3.67× |
| `traceCornerLine` | 123,584 | 535,568 | 4.33× |
| Player projections | 275 | 206 | 0.75× |
| Derived-fog computations | authored fog only | 206 | new |

The slowdown is therefore not caused by more detection requests. It comes from expanding each sight query into target-cell traces in [visibility-field.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:431), especially for large-footprint creatures.

Of the 348,284 VIS-FIELD cell traces:

| Caller | Calls | Share | Instrumented inclusive trace time |
|---|---:|---:|---:|
| `sightToCreature` pair detection | 319,444 | 91.7% | 4,758 ms |
| `derivedFogCells` | 28,840 | 8.3% | 555 ms |

Thus, only about 0.55–0.68 s is the full-board field/projection itself. Pairwise detection accounts for most of the added ~3.6 s.

#### Calls by combat round

The arena is 14×10, so a field scan is 140 cells.

| Round | Player projections | Distinct projected revisions | Fog traces | Pair-detection traces |
|---|---:|---:|---:|---:|
| Initial/r0 | 0 | 0 | 0 | 932 |
| 1 | 90 | 89 | 12,600 | 159,222 |
| 2 | 50 | 50 | 7,000 | 83,108 |
| 3 | 65 | 65 | 9,100 | 74,526 |
| 4 | 1 | 1 | 140 | 1,656 |
| Total | 206 | 205 | 28,840 | 319,444 |

The field is effectively recomputed once per projected state revision/controller request, not once per turn. There were 206 projections across 205 distinct revisions; only one revision was projected twice. Because the first eligible observer sees the whole board in this fixture, each projection performed exactly 140 fog traces even when the eligible observer set contained multiple PCs.

The weak caches in [visibility-field.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:104) are state-object keyed. Immutable reducer revisions therefore make nearly every request cold, despite unchanged geometry and illumination.

---

### 2. LOS-cover tests

Matched four-way timing command, substituting each title and checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/unit/vtt/room-generator-los-cover.test.ts \
  -t '<exact test title>' \
  --reporter=verbose --no-file-parallelism --testTimeout=20000
```

| Test | Main | VIS-FIELD | Delta |
|---|---:|---:|---:|
| Productive first-turn option | 5,472 ms | 6,139 ms | +667 ms, +12.2% |
| WALL-SEALS-ROOM | 5,395 ms | 5,865 ms | +470 ms, +8.7% |

These timings were under matched concurrent load; they explain the 5.1–6.2 s full-suite observations but are less quiet than the vane and D630 measurements.

#### Productive first-turn profile

| Path | Main calls/time | VIS-FIELD calls/time |
|---|---:|---:|
| `generateRoom` | 9 / 3,749 ms | 9 / 4,550 ms |
| `traceSpaces` | 284,121 / 3,530 ms | 284,121 / 4,331 ms |
| `traceCornerLine` | 4,173,840 / 1,213 ms | 4,173,984 / 1,932 ms |
| `firstSharedEdgeBlockingCell` | absent | 4,173,984 / 380 ms |
| `reach` | 46,650 / 325 ms | 46,650 / 367 ms |
| Offer environments built | 1 | 1 |
| Monster option enumerations | 39 | 39 |
| Options resolved | 630 | 630 |

This regression is the seam scan in [cover.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/cover.ts:304), not visibility-field computation or extra offer generation.

The 46,650 `reach` results were:

| Result | Count |
|---|---:|
| `target_out_of_range` | 33,092 |
| `action_range_unresolved` | 861 |
| Legal | 12,556 |
| `target_outside_line_of_sight` | 141 |

All 46,650 performed an anchored line trace before the range verdict in [engine-query-port.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/engine-query-port.ts:1134). Therefore 33,953 traces—72.8%—were performed for candidates subsequently rejected by range handling.

#### WALL-SEALS-ROOM profile

On VIS-FIELD:

| Path | Calls | Inclusive time |
|---|---:|---:|
| `generateRoom` | 9 | 4,461 ms |
| `traceSpaces` | 249,127 | 4,038 ms |
| `traceCornerLine` | 3,985,264 | 1,801 ms |
| `firstSharedEdgeBlockingCell` | 3,985,264 | 358 ms |
| `reachesProductiveRegion` | 64 | 787 ms |
| `findPath` | 108 | 782 ms |

Again, room generation dominates. The test-specific reachability assertion is under 0.8 s.

---

### 3. D630 replay + detection pair

Command, run sequentially from each checkout:

```bash
TMPDIR=/dev/shm /usr/bin/time \
  -f 'WALL=%e USER=%U SYS=%S RSS_KB=%M EXIT=%x' \
  npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts \
  --reporter=verbose --no-file-parallelism --testTimeout=60000
```

| Revision | Tests | Test time | Vitest duration | Wall |
|---|---:|---:|---:|---:|
| Main | 35 | 28.24 s | 33.55 s | 34.04 s |
| VIS-FIELD | 36 | 35.94 s | 41.45 s | 41.97 s |
| Delta | +1 | +7.70 s | +7.90 s | +7.93 s |

The extra branch detection test took 2 ms. Detection-reactions otherwise remained 0–16 ms per test; replay owns essentially the entire regression.

Largest replay movements:

| Test | Main | VIS-FIELD | Delta |
|---|---:|---:|---:|
| OWN-BUNDLE-VERSION-OUTSIDE-WINDOW | 3,255 ms | 4,145 ms | +890 ms |
| PLAYABLE-EXIT | 2,935 ms | 3,736 ms | +801 ms |
| REPLAY-COMMAND | 2,808 ms | 3,495 ms | +687 ms |
| OWN-TOKEN-COUNTS | 1,849 ms | 2,382 ms | +533 ms |
| M63 latency/hash | 2,027 ms | 2,539 ms | +512 ms |
| M65 void branch | 1,497 ms | 2,004 ms | +507 ms |
| M64 no live controller | 1,835 ms | 2,339 ms | +504 ms |

#### Representative PLAYABLE profile

[replay.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/replay.ts:238) creates one DM projection plus one projection per PC for every replayed revision.

| Path | Main | VIS-FIELD |
|---|---:|---:|
| `projectReplayViews` calls | 822 | 828 |
| DM views | 853 | 859 |
| Player views | 2,484 | 2,502 |
| Derived-fog calls | authored fog | 3,361 |
| `traceSpaces` | 47,918 | 159,843 |
| `projectReplayViews` inclusive | 556 ms | 923 ms |
| `replayBundle` inclusive | 2,240 ms | 2,891 ms |

One PLAYABLE invocation rebuilt the scripted gate once:

- `recordScriptedReferenceSkirmish`: 1,905 ms
- `createReplayBundle`: 896 ms
- `replayRevisionRecords`: 331 ms
- `replayBundle`: five calls, 2,766 ms cumulative/inclusive

The replay file contains 15 gate constructions, 13 using the default parameters. This confirms the pending TEST-PERF plan’s default-gate reuse is the largest bounded test-only opportunity.

---

## Top three hot paths and bounded fixes

| Rank | Hot path | Proposed fix | Estimated saving | Required invariant/witness |
|---|---|---|---:|---|
| 1 | Repeated scripted replay gate plus per-revision projections | Build each parameterized gate once, deep-freeze it, and `structuredClone` every mutating candidate. Retain independent `replayBundle` execution per test. | Roughly 20–23 s from the replay file: 12 redundant default builds × ~1.9 s gross | Gate canonical hash unchanged before/after every test; shuffled-order run twice; separate cache entries for default and both non-default parameter combinations; every corruption test must still fail against its independently cloned mutation. |
| 2 | `sightToCreature → evaluateCell → traceCombatantLineToCells → traceSpaces` | Cache visibility outcomes by an explicit visibility/geometry epoch plus observer/subject or observer-set key, rather than `EncounterState` identity. HP/event-log-only revisions may reuse; movement, footprints, walls, objects, light, obscurement, relevant conditions/effects, hidden state, senses, life, placement, or observer eligibility must bump the epoch. | Approximately 2.5–3.5 s in vane; 0.4–0.8 s per full replay reconstruction | For every revision, compare cached output with a forced from-scratch computation for every eligible observer/subject pair and every cell. Require byte-identical fog, sight reason/sense/grade, and projection hashes. Include Large/Huge footprints, seam rays, darkness, obscurement, Invisible, Hidden, Blinded, death and placement changes. |
| 3 | Nine-room regeneration and millions of seam-bearing corner traces | TEST-PERF: generate and deep-freeze the nine versioned rooms once per suite, reuse them in read-only tests, and preserve two independent generations solely for determinism. Separately, memoize seam results by blocking-topology signature plus corner endpoints where production generation still repeats them. | About 4.46–4.55 s from each named test; seam memoization offers another bounded ~0.35–0.7 s | Shared fixtures must remain byte-identical and immutable; mutation-isolation witness must fail on attempted writes. Seam cache must match fresh results for all rays in all nine rooms, including reverse, horizontal, vertical, diagonal, zero-length and source/target-adjacent rays; `blocksSight`, `firstBlockingCell`, physical cover tier and source IDs must all match. |

A smaller fourth opportunity is offer-internal range pruning: 72.8% of productive-test `reach` calls traced LOS before ultimately failing range. Keep public `reach` refusal precedence unchanged; prefilter only the offer-generation path using the same range predicate. The measured upper bound is roughly 0.2–0.3 s in this test.

## Correctness-smell assessment

- No evidence of fields being computed for ineligible observers. [eligibleVisibilityObserverIds](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/visibility-field.ts:525) excluded dead, unplaced, adjudication-pending and Unconscious combatants. Observed fog work was exactly 140 traces per projection because the first eligible observer saw every board cell.
- The state-identity cache is a performance-design smell, not a current correctness defect. It preserves correct results but discards reuse across revisions whose visibility inputs are unchanged.
- Per-target-cell tracing for large footprints is correctness-sensitive. Replacing it with a single representative ray without a from-scratch differential witness would be a correctness regression.
- The 33,953 range-doomed LOS traces are semantic overwork and therefore a correctness-adjacent smell in offer generation. Results are currently correct, but the engine evaluates expensive geometry for candidates already mechanically impossible. Reordering the public validation path could change refusal precedence, so the safe fix belongs in internal offer prefiltering.
- The shared-edge scan itself is required correctness work. Its cost is real, but removing it or folding it into physical cover would violate the optical seam rule.

## Integrity and restoration

Production hash command:

```bash
find src -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum
```

| Checkout | Before | After |
|---|---|---|
| VIS-FIELD | `f46957b6d8e35287823e5243247c347e47896de19490afcd2f2871bfdaffa064` | identical |
| Main | `59f5d4e7fa03612f7eb5163911eebcd4d3521e930dc5556aace23c66d644ead1` | identical |

VIS-FIELD remained clean. Main’s pre-existing `.claude/**` modifications and untracked files were unchanged; no production file changed. All instrumentation existed only in Vitest’s in-memory transform pipeline, and no test process remained running.

PERF-INVESTIGATION DONE
