
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-vis-field
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)
reasoning effort: high
reasoning summaries: none
session id: 01a0aeac-47dc-7361-830f-5bcc1251fc36
--------
user
COMMON RULES (binding, restated in full): You are the IMPLEMENTER (gpt-5.6-sol, high, FRESH session) for VIS-FIELD-01's LANDING RECONCILIATION batch LAND-02 (browser specs). Worktree /home/vagrant/PhpstormProjects/dnd-wt-vis-field (branch claude/vis-field at ebfcacaa = the complete frozen plan + LAND-01 (accepted pending astra); clean; own node_modules), sandbox workspace-write in that worktree ONLY (+ /tmp). No git write commands. No edits under .claude/** or docs/**. Do NOT invoke claude, `claude -p`, any reviewer session, any consensus workflow or any other agent; skills under ~/.codex do NOT apply. NEVER touch port 4173 (the owner's live app); if you must run a browser spec, use PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 and ONLY the spec you changed, once; no full Playwright run, no full gate, no full vitest, no `npm run build` beyond what the spec's webServer performs. No `any`, @ts-ignore, @ts-expect-error, .skip, .todo, no conditional test branches; NO WEAKENED ASSERTIONS; no deleted tests; every re-pinned expectation hand-derived from the geometry and the plan's fog rules (§3.3: DM fog = complement of the union of eligible DM-party fields; player concealedCells = complement of eligible owned fields; ordinary darkness is target-cell only, D626.3), never copied from a run. No fixture under tests/fixtures changes. Other lanes run in sibling worktrees: do not read or touch them; do not read /home/vagrant/dnd-slim-runs/. MAIN repo /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static's .claude/decisions.md and .claude/consensus/vis-field/** readable (read-only): read D626.3, D626.10, D635.36, D635.37, D635.38 first. No model calls. Report exact commands and numbers; end with the named marker or "BLOCKED: <reason>".

TASK — LAND-02: the landing gate's browser suite (Playwright chromium, 184 passed / 2 failed on 10cc9f5e) exposed browser specs no plan batch named. (1) tests/browser/vtt-encounter.spec.ts:173 "M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow": at :237 it expects `dm.locator('[data-cell="4,3"] .encounter-art-fog')` toHaveCount(0) after the Training Brute moves 3,3 → 4,3 and hides. Reference scene (src/vtt/reference-encounter.ts): 10×7, fighter (2,3), cleric (1,4), wizard (1,2), blocker (7,2), ordinary darkness at (4,3) only, no authored fog any more (B4). Under the plan's rules the DM board's fog is derived: HAND-DERIVE which cells are unseen by all three PCs after the brute stands in (4,3) (the brute's body does not change light; (4,3) is a dark target cell — is it seen by any PC without darkvision? state each PC's sense list from the setup) and re-pin :237 (and :238 the DM token visibility, :242 the player's floor art at (4,3), :243-245 the player's monster count) accordingly, with the derivation in a comment; check EVERY other assertion in that flow and in the file that depends on the reference scene's fog or concealment (grep encounter-art-fog, data-cell, concealed) and re-pin each the same way; assertions about undo/adjudication/controls stay byte-identical. (2) [D635.38: it DID reproduce alone on a clean checkout — first beforeAll (:186) times out at 30 s inside BoardSnapshotService.#waitForBoardVisible (tools/ai-dm-board-snapshot.ts:992-1030), whose predicate requires the rendered board's data-board-audience, data-source-revision, data-source-round, data-source-state-digest and glyph mode to equal the service's expected source; find WHICH attribute never matches by evaluating the predicate's inputs in the page (a copy under /tmp, or a temporary console probe you remove), name the code producing each side (the service's stateDigest vs the app's data-source-state-digest — check whether B2's validate-and-discard of the legacy fog key or B3/B4's derived fog changed one side), and report the mechanism; if the fix is in production code, STOP with the file:line and the proposed change (manifest ruling); if it is the spec's own fixture/expectation, re-pin by hand] tests/browser/ai-dm-board-snapshot.spec.ts:258 "captures the full production DM board deterministically through durable save upload/load" failed in the gate at 0 ms with "Target page, context or browser has been closed" ×4 — the supervisor is re-running it alone on a clean checkout; D635.38 states whether it reproduced: if it did NOT reproduce, leave that file untouched and say so; if it DID, diagnose (its beforeAll starts a blind service; a fixture whose derived fog or semantic v2 bytes changed?) and re-pin by hand or STOP with the mechanism. (3) tests/browser/** other specs that pin fog/concealment of the reference, Vane, two-room or d365 scenes: grep and list; if any would fail under derived fog, re-pin by hand in this batch and name them; if none, say so. ALLOWED FILES: tests/browser/vtt-encounter.spec.ts, tests/browser/ai-dm-board-snapshot.spec.ts (only if (2) reproduced), plus any spec you list under (3) — STOP and report if a production file would need to change. VERIFY: run each changed spec ONCE on port 4470 (PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test <spec> --project=chromium) and paste the result; both tsc; git diff --check; status = exactly the changed specs. End with `VIS-FIELD LAND-02 DONE` or `BLOCKED: <reason>`.

codex
I’ll first read the five binding decisions and inspect the two browser specs plus the snapshot predicate. I’ll hand-derive every fog/concealment expectation before editing, then run only each changed Chromium spec once on port 4470, followed by both TypeScript checks, `git diff --check`, and status.
exec
/bin/bash -lc "sed -n '/"'^## D626'"\\.3\\b/,/"'^## D/p; /''^## D626'"\\.10\\b/,/"'^## D/p; /''^## D635'"\\.36\\b/,/"'^## D/p; /''^## D635'"\\.37\\b/,/"'^## D/p; /''^## D635'"\\.38\\b/,/"'^## D/p'"' .claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
 succeeded in 0ms:
## D626.3 — OWNER (2026-09-15 16:03): ordinary darkness = "target only" (reading 1); copy the Foundry / Roll20 / Owlbear Rodeo vision model
Owner: "you see a campfire from a mile away on a dark night. that supports reading 1. try to copy what owlbear rodeo and foundry and roll20 have done". Ruling: unlit cells between observer and target never block sight; ordinary darkness is evaluated at the target cell only (the VIS-FIELD-01 plan's frozen default, §1/§3.2, stands; §7's flip is closed — no amendment needed). Model to copy, as those three products share it: (1) walls/terrain block sight; (2) light sources give bright/dim radii, a target is visible when its cell is lit or within the observer's darkvision (Foundry "vision mode" / Roll20 "night vision") range, with unlimited range for lit targets; (3) darkness never blocks line of sight; (4) magical darkness is a darkness region that defeats ordinary darkvision, with Devil's Sight as a vision mode that ignores it (Foundry); (5) obscuring smoke/fog regions block sight through them (Owlbear "smoke & spectre", Foundry fog-cloud practice); (6) fog of war is the union of the party's vision, per seat for players. The plan already implements (1)-(6). One deliberate gap versus Foundry and Roll20 Explorer mode: explored-but-not-currently-visible memory (greyed explored areas). VIS-FIELD-01 keeps that out of scope (plan §1 non-goals); recorded as follow-up FOG-MEMORY-01 (per-seat explored-cell set derived from past fields, greyed on the board) to be planned after VIS-FIELD-01 lands, unless the owner wants it inside this unit.

## D626.4 — SUPERVISOR (2026-09-15 16:05): VIS-FIELD-01 Batch 1 BLOCKED by sol on a second exhaustive inventory outside the manifest; bounded amendment — src/vtt/intel/option-outcome.ts joins Batch 1 (11 files, one-record delta); re-dispatched
## D626.10 — SUPERVISOR (2026-09-15 19:36): VIS-FIELD B3 r4 candidate — batch green (154/154, 5/5 supervisor mutants killed, pair 38.3 s = +14.7%, within D630) but the full tests/unit/combat + tests/unit/vtt sweep shows 7 deterministic reds in five consumer suites; dispositions
(1) DEFECT in B3 (fix r5): tests/unit/combat/visibility.test.ts — sol DELETED the D359 ledger-pinned control "omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell" (old :339); tests/unit/vtt/mutation-ledger.test.ts:375 pins that title as one of four restored controls with its killing check. The plan names no removal; COMMON RULES forbid deleting a test the plan does not name. Required: restore the control under its EXACT title with derived-fog geometry (an edge cell made unseen for every eligible observer by darkness/wall, its contents omitted, the adjacent visible boundary cell retained) so the ledger's killing check still kills. (2) INTERMEDIATE REDS owned by later batches, accepted as the plan's sequencing (B3 stops consumption; B4 removes the authored lists that fixtures still carry; B5/B6 migrate the semantic source): tests/unit/vtt/generated-encounter-fixtures.test.ts (B4 manifest), tests/unit/vtt/semantic-board-payload.test.ts ×2 (B5/B6 manifests: semantic source still copies authored fog while the DM board projection is derived), tests/unit/tools/ai-dm-screenshot-probe.test.ts "derives every fact class…" (plan :197 excludes the Q9 suite from B3's gate; tools/ai-dm-screenshot-probe.ts is B5's). (3) PLAN GAP → B4 manifest amendment +2 (plan :266 analogue): tests/unit/vtt/two-room-fixture.test.ts and tests/unit/vtt/handoff-examples.test.ts pin the two-room handoff fixture's projections and tracked scene bytes (fixtures/scenes/two-room.v1.json / two-room.snapshots.v1.json) whose authored foggedCells (src/vtt/handoff/fixtures/two-room.ts:112) B4 removes; they can only go green in B4 and belong to no manifest. Landing rule unchanged: every suite green at landing; the intermediate reds are listed by owner in the vis-field loop-log and re-checked after each batch.

## D626.11 — SUPERVISOR (2026-09-15 19:52): VIS-FIELD-01 Batch 3 ACCEPTED at 78ee31b0 — astra r1 ACCEPT (medium, 7 mutations killed incl. three of its own; pin demonstration reproduced independently: old hashes from the pre-B3 module, only cells + concealedCells changed, concealed {(4,3)}, edge-touch rule clears the blocker rays); next B4 with the D626.10 manifest amendment (+2)
## D635.36 — SUPERVISOR (2026-09-17 03:22): landing investigation harvested — TWO VIS-FIELD DEFECTS (category c) found, plus a legitimate seam consequence on the frozen brutal families that needs the OWNER's decision
Sol (impl-landing-investigation-sol.md, read-only, 387 k tokens), classification of every deterministic red: (c) DEFECT 1 — src/vtt/engine-query-port.ts:1163 refuses an attack/save offer only when the physical trace's tier === 'total', while execution (src/combat/encounter.ts:7183) refuses when attackLine.blocksSight || tier === 'total'; D635 made optical blocking independent of physical cover, so a seam-blocked ray with tier 'half' is OFFERED and then REFUSED at execution ("The target has Total Cover or is outside line of sight.") — 19 of the 23 scripted round-1 failures (hard 5117001-007, 009-013; brutal 6203002, 003, 005, 006, 008, 009; brutal-b 6206004) are exactly this offer/execution disagreement (e.g. hard 5117001 m6 Heavy Crossbow at the wizard along row line 6 between (8,5)/(8,6); brutal 6203002 m1 Radiant Flame after its move, along row line 5 between (8,4)/(8,5)). This violates the offers boundary (an offered option must execute) and is VIS-FIELD's to fix before landing. (c) DEFECT 2 — src/vtt/room-generator.ts:1223 hasOpenOpposingRay() calls a ray open when tier === 'none' without requiring blocksSight === false, so the generator's M576-E2 wall placement no longer certifies a sight lane. (a) LEGITIMATE CONSEQUENCE — 25 monsters across the ten frozen brutal-b rooms and 18 across seven of the ten frozen brutal-2 rooms (the D569 second family: 6207002, 004-009) lose every productive first-turn option because their only lanes were two-blocker seams (per-seed flanking cells listed; mechanism count 25 seam / 0 derived-fog / 0 other; the B2 consolidation shown non-causal); the D569 second-family validator re-checks productivity against the current engine, so the frozen 480-cell second family is now an invalid manifest. (a′) LATENT TEST-HELPER DEFECT — four scripted rows (brutal 6203004; brutal-b 6206001, 009, 010) fail because dryRunMonsterPlan() in arena-basis-brutal-b.test.ts:145 selects dispel-evil-and-good without its required activationChoice (ACTIVATION_CHOICE_INVALID at intent-resolver.ts:578); D635 changed the ranking and exposed it. (b) derived-fog/detection consequences: none. All three suites pass under main's tracer (in-memory replay). VERIFIED BY ME by reading: engine-query-port.ts:1163 tests only `tier === 'total'`; encounter.ts:7183 tests `attackLine.blocksSight || attackLine.tier === 'total'` — the disagreement is real. RULING: (1) a VIS-FIELD LANDING RECONCILIATION batch (LAND-01) fixes the two production defects and the helper now: the query port refuses to offer an attack/save whose trace blocksSight (agreement witness: for a seam-blocked pair the query offers nothing the reducer would refuse — a hand-authored fixture plus a property over the frozen families that every offered attack executes); the generator requires tier 'none' AND blocksSight false for an open opposing ray (witness + mutant); dryRunMonsterPlan materializes a legal activation choice or skips choice-requiring options; nothing else. (2) The frozen brutal-b and brutal-2 families and the D569 second-family manifest are the OWNER's decision, asked now (regenerate under the seam-aware generator, invalidating the second-family experiment identity: 240 cell state hashes and a new manifest version; or amend the productivity contract — sol and I advise against; or revisit D635). Landing waits for both.

## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
## D635.37 — SUPERVISOR (2026-09-17 03:52): VIS-FIELD landing gate complete on 10cc9f5e — tsc 0, sg 0, vitest RED (D635.36), Playwright 184 passed / 2 FAILED, OFFERS checks 0/0, D630 pair 39.3 / 39.4 s (main 32.8 s, +20%, ceiling 41 s), arena round 38 s (main 51 s); LAND-01 dispatched
Playwright (1.0 h, port 4450): tests/browser/ai-dm-board-snapshot.spec.ts:258 "captures the full production DM board deterministically through durable save upload/load" (0 ms — "Target page, context or browser has been closed", four times) and tests/browser/vtt-encounter.spec.ts:173 "M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow" (15.0 s — expect(locator).toHaveCount failed). The second is plausibly a legitimate consequence of B4 on the REFERENCE scene (authored fog (8,1),(8,2) replaced by derived fog [(4,3)]) that no batch's manifest covered because the plan named no browser spec; the first may be a crash chain from the same run. Both are being read from the gate's JSON report before any ruling; browser specs that pin the reference scene's fog need a hand-derived re-pin under the same rule as every other pin. LAND-01 (fresh sol 01a0ae59…, brief impl-vis-field-land-01.md, log impl-land-01.log) fixes the two production defects and the helper now.

## D635.38 — SUPERVISOR (2026-09-17 04:07): the board-snapshot browser spec's failure REPRODUCES alone on the clean 10cc9f5e checkout — a beforeAll timeout inside the blind board-snapshot service's board-visible wait; LAND-02 diagnoses it as a candidate VIS-FIELD defect
## D635.38 — SUPERVISOR (2026-09-17 04:07): the board-snapshot browser spec's failure REPRODUCES alone on the clean 10cc9f5e checkout — a beforeAll timeout inside the blind board-snapshot service's board-visible wait; LAND-02 diagnoses it as a candidate VIS-FIELD defect
pw-snapshot-alone.log (detached checkout, port 4460, single worker): tests/browser/ai-dm-board-snapshot.spec.ts fails in its FIRST beforeAll (:186) with "beforeAll hook timeout of 30000ms exceeded" — the blind warmup's captureSynchronized → #prepareBoard → #waitForBoardVisible (tools/ai-dm-board-snapshot.ts:992-1030) never resolves; the three dependent beforeAlls then throw their "did not complete" guards and the test reports 0 ms with the closed-browser errors. The wait predicate requires the rendered board element to carry data-board-audience = dm/player, data-source-revision, data-source-round, data-source-state-digest === the service's expected stateDigest, and (D525) the requested glyph mode; a pageerror would have rejected immediately, so one of those attribute equalities never holds. HYPOTHESIS (unproven): a state-digest disagreement between the service and the app now that the V1 decoder validates-and-discards the legacy fog key (B2) — one side may digest the raw fixture bytes or the pre-discard state while the other digests the decoded state — or the derived fog changing what the blind capture app renders for the hard fixture. The same spec passed in the OFFERS landing gate on 1cacd8f0 (187/187, D617.50); a control run on main (port 4480) is in progress. Either way it is VIS-FIELD's to resolve before landing: LAND-02's item (2) is now "diagnose the predicate attribute that fails (instrument in the browser context on a copy), name the producing code on both sides, and fix the VIS-FIELD side or STOP with the mechanism" — a production change there needs a manifest ruling from me. vtt-encounter.spec.ts:237 remains the hand re-pin of the reference scene's derived fog at (4,3).

## D635.38.1 — SUPERVISOR (2026-09-17 04:21): control run confirms the board-snapshot browser spec passes on main 9f148666 (2 passed, 3.4 min, port 4480) and fails alone on the VIS-FIELD tree — VIS-FIELD-caused; LAND-02 diagnoses per D635.38.

exec
/bin/bash -lc "git status --short && git rev-parse --short HEAD && rg -n \"encounter-art-fog|data-cell|concealed|darkvision|senses|Training Brute|reference\" tests/browser/vtt-encounter.spec.ts tests/browser/ai-dm-board-snapshot.spec.ts src/vtt/reference-encounter.ts && sed -n '1,330p' tests/browser/vtt-encounter.spec.ts && sed -n '1,360p' tests/browser/ai-dm-board-snapshot.spec.ts && sed -n '940,1050p' tools/ai-dm-board-snapshot.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
ebfcacaa
src/vtt/reference-encounter.ts:10:import { referencePartySpellSlots } from '../combat/spells/resources';
src/vtt/reference-encounter.ts:57:      senses: [{ kind: 'normal_sight' }],
src/vtt/reference-encounter.ts:81:export function referenceEncounterSetup(): {
src/vtt/reference-encounter.ts:98:    spellSlots: referencePartySpellSlots('Cleric'),
src/vtt/reference-encounter.ts:104:    spellSlots: referencePartySpellSlots('Wizard'),
src/vtt/reference-encounter.ts:106:  const monster = profile('training-brute', 'Training Brute', 'monster', {
src/vtt/reference-encounter.ts:124:      lightRegions: [{ id: 'reference-hiding-shadow', cells: [{ column: 4, row: 3 }], level: 'darkness' }],
src/vtt/reference-encounter.ts:130:    dmNotes: ['Training Brute retreats after the three reference PCs act.'],
src/vtt/reference-encounter.ts:136:  if (found === undefined) throw new Error(`Unknown reference combatant ${id}.`);
src/vtt/reference-encounter.ts:247:export function referenceTurnLegalActions(
src/vtt/reference-encounter.ts:273:export function referenceReactionLegalActions(
tests/browser/vtt-encounter.spec.ts:173:test('M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow', async ({
tests/browser/vtt-encounter.spec.ts:177:  await page.goto('/vtt?encounter=reference&view=player&session=increment-6-browser');
tests/browser/vtt-encounter.spec.ts:234:  await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
tests/browser/vtt-encounter.spec.ts:235:  await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
tests/browser/vtt-encounter.spec.ts:237:  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
tests/browser/vtt-encounter.spec.ts:238:  await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
tests/browser/vtt-encounter.spec.ts:242:  await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

async function confirmChoice(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Confirm choice' }).click();
}

async function expectActive(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('heading', { name: `Active PC: ${name}` })).toBeVisible();
  await expect(page.locator('.encounter-token[data-active="true"]')).toHaveText(name);
}

async function resetHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });
}

test('DM loads the bundled D365 dungeon and RPC-authored party into room 1', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await resetHome(page);
  await page.goto('/vtt?encounter=d365');
  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible({
    timeout: 65_000,
  });
  await page.getByRole('button', { name: 'Load bundled dungeon and party' }).click();

  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 65_000,
  });
  await expect(page.locator('.adventuring-day-status')).toHaveText(
    'Adventuring day — room 1 of 4 · 2024 rules',
  );
  for (const name of ['Mirel Ash', 'Orin Reed', 'Brann Vale', 'Sera Dawn']) {
    await expect(
      page.locator('.encounter-token[data-kind="player_character"]', { hasText: name }),
    ).toBeVisible();
  }
  await expect(
    page.locator('.encounter-token[data-kind="monster"]', { hasText: 'Goblin Warrior' }),
  ).toHaveCount(2);
  await expect(
    page.locator('.encounter-token[data-kind="monster"]', { hasText: 'Wolf' }),
  ).toHaveCount(2);
  const board = page.locator('.encounter-board');
  await expect(board).toBeVisible();
  await expect(board.locator('.encounter-nameplate')).toHaveCount(0);
  await expect(board.locator('.encounter-creature-badge')).toHaveCount(9);
  await expect(board.locator('.encounter-roster-entry')).toHaveCount(9);
  const rosterContract = await board.evaluate((element) => {
    const badges = Array.from(element.querySelectorAll<HTMLElement>('.encounter-creature-badge'));
    const roster = Array.from(element.querySelectorAll<HTMLElement>('.encounter-roster-entry'));
    const names = roster.map((row) => row.dataset.fullName ?? '');
    return {
      badgeNumbers: badges.map((badge) => badge.dataset.badgeNumber ?? ''),
      badgeColors: badges.map((badge) => badge.dataset.badgeColor ?? ''),
      badgeSources: badges.map((badge) => badge instanceof HTMLImageElement ? badge.src : ''),
      rosterNumbers: roster.map((row) => row.dataset.badgeNumber ?? ''),
      rosterCombatantIds: roster.map((row) => row.dataset.combatantId ?? ''),
      rosterNames: names,
      rosterOrders: roster.map((row) => row.dataset.rosterOrder ?? ''),
      rosterCoordinates: roster.map((row) => row.querySelector<HTMLElement>('.encounter-roster-coordinate')?.dataset.coordinate ?? ''),
      rosterBadgeSources: roster.map((row) => row.querySelector<HTMLImageElement>('.encounter-roster-badge')?.src ?? ''),
      rosterNameBitmapWidths: roster.map((row) => {
        const image = row.querySelector<HTMLImageElement>('.encounter-roster-name');
        return image === null ? null : [image.width, image.naturalWidth];
      }),
      bustBitmapBoxes: Array.from(element.querySelectorAll<HTMLImageElement>('.encounter-token-sprite'))
        .map((image) => [image.getBoundingClientRect().width, image.naturalWidth]),
    };
  });
  expect(rosterContract.badgeNumbers).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  expect(rosterContract.badgeNumbers).toEqual(rosterContract.rosterNumbers);
  expect(rosterContract.badgeSources).toEqual(rosterContract.rosterBadgeSources);
  expect(rosterContract.rosterOrders).toEqual(rosterContract.rosterNumbers);
  expect(new Set(rosterContract.badgeColors).size).toBe(9);
  expect([...rosterContract.rosterNames].sort()).toEqual([
    'Mirel Ash', 'Orin Reed', 'Brann Vale', 'Sera Dawn', 'Tamsin Quill',
    'Goblin Warrior', 'Goblin Warrior', 'Wolf', 'Wolf',
  ].sort());
  const initiativeEntries = page.locator('.dm-initiative > ol > li');
  await expect(initiativeEntries).toHaveCount(9);
  const initiativeCombatantIds = await initiativeEntries.evaluateAll((items) =>
    items.map((item) => item instanceof HTMLElement ? item.dataset.combatantId ?? '' : ''),
  );
  expect(rosterContract.rosterCombatantIds).toEqual(initiativeCombatantIds);
  expect(rosterContract.rosterCoordinates.every((coordinate) => /^\([0-9]+,[0-9]+\)$/u.test(coordinate))).toBe(true);
  for (const dimensions of rosterContract.rosterNameBitmapWidths) {
    expect(dimensions).not.toBeNull();
    expect(dimensions?.[0]).toBe(dimensions?.[1]);
  }
  expect(rosterContract.bustBitmapBoxes).toHaveLength(9);
  expect(rosterContract.bustBitmapBoxes.every(([rendered, bitmap]) => rendered === 128 && bitmap === 128)).toBe(true);
});

test('DM composes stored builder characters and each PC defaults to human control', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await resetHome(page);
  const names = await page.evaluate(async () => {
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.guidedClassOptions', {});
    const fighter = classes.find((candidate) => candidate.name === 'Fighter');
    if (fighter === undefined) throw new Error('Bundled Fighter is missing.');
    const origins = await window.appRpc.call<
      { readonly kind: 'species' },
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.originOptions', { kind: 'species' });
    const human = origins.find((candidate) => candidate.name === 'Human');
    if (human === undefined) throw new Error('Bundled Human is missing.');
    const createdNames = ['Stored Rowan', 'Stored Sable', 'Stored Tamsin'];
    for (const name of createdNames) {
      const character = await window.appRpc.call<
        { readonly name: string; readonly class_content_key: string },
        { readonly id: number }
      >('queries.characters.createGuided', {
        name,
        class_content_key: fighter.content_key,
      });
      await window.appRpc.call('queries.characters.applyOrigin', {
        character_id: character.id,
        kind: 'species',
        content_key: human.content_key,
      });
    }
    return createdNames;
  });

  await page.goto('/vtt?compose=stored');
  await expect(
    page.getByRole('heading', { name: 'Build an encounter from stored characters' }),
  ).toBeVisible({ timeout: 65_000 });
  for (const name of names) {
    await page.getByRole('checkbox', { name: new RegExp(`^${name} —`, 'u') }).check();
  }
  await expect(page.getByRole('button', { name: 'Start DM encounter' })).toBeEnabled();
  await page.getByRole('button', { name: 'Start DM encounter' }).click();

  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible();
  await expect(page.locator('.player-encounter')).toHaveCount(0);
  for (const name of names) {
    await expect(page.getByLabel(`${name} controller`)).toHaveValue('human');
    await expect(page.getByLabel(`${name} controller`)).toBeEnabled();
    await expect(
      page.locator('.encounter-token[data-kind="player_character"]', { hasText: name }),
    ).toBeVisible();
  }
  await expect(page.locator('.adventuring-day-status')).toHaveText(
    'Adventuring day — room 1 of 4 · 2024 rules',
  );
  await expect(page.getByRole('heading', { name: 'Short Rest before next room' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take Short Rest and enter next room' })).toBeVisible();
  await page.getByRole('button', { name: 'End room and enter next room' }).click();
  await expect(page.locator('.adventuring-day-status')).toHaveAttribute('data-room', '2');
  for (const name of names) {
    await expect(page.getByLabel(`${name} controller`)).toHaveValue('human');
    await expect(page.getByLabel(`${name} controller`)).toBeEnabled();
  }
});

test('M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/vtt?encounter=reference&view=player&session=increment-6-browser');
  await expect(page.getByRole('heading', { name: 'Reference encounter' })).toBeVisible({
    timeout: 60_000,
  });

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open local DM window' }).click();
  const dm = await popup;
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
  for (const boardPage of [dm, page]) {
    const tokens = boardPage.locator('.encounter-token');
    await expect(tokens).toHaveCount(4);
    await expect(boardPage.locator('.encounter-cell .encounter-token')).toHaveCount(0);
    for (let index = 0; index < 4; index += 1) {
      await expect(tokens.nth(index)).toHaveAttribute('data-column-span', '1');
      await expect(tokens.nth(index)).toHaveAttribute('data-row-span', '1');
    }
  }

  await expect(page.getByRole('button', { name: 'Undo last' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Apply ADJUDICATED override' })).toHaveCount(0);

  await expectActive(page, 'Reference Fighter');
  await confirmChoice(page, 'Attack');
  await confirmChoice(page, 'End turn');

  await expectActive(page, 'Reference Cleric');
  await confirmChoice(page, 'Sacred Flame');
  await confirmChoice(page, 'End turn');

  await expectActive(page, 'Reference Wizard');
  await page.getByRole('button', { name: 'Shatter', exact: true }).click();
  const board = page.locator('.encounter-board');
  const box = await board.boundingBox();
  if (box === null) throw new Error('Player encounter board has no layout box.');
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * (3 / 7), {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.locator('.encounter-cell[data-preview="true"]')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm choice' }).click();
  await confirmChoice(page, 'End turn');

  await expect(dm.getByRole('button', { name: 'Move to 4,3', exact: true })).toBeVisible();
  await dm.getByRole('button', { name: 'Move to 4,3', exact: true }).click();
  const tray = dm.locator('.dm-decision-tray');
  await expect(tray.locator('[data-entry-kind="pending"]')).toContainText(
    'Reference Fighter — opportunity attack',
  );
  await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
  await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
  await dm.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
  await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
  await expect(dm.locator(
    '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
  )).toHaveAttribute('data-hidden-from-players', 'true');
  await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
  await expect(page.locator(
    '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
  )).toHaveCount(0);
  await expect(dm.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();

  await dm.getByLabel('Adjudication target').selectOption({ label: 'Reference Fighter' });
  await dm.getByLabel('Hit Point delta').fill('-999');
  await dm.getByLabel('DM reasoning').fill('DM-only collapse reasoning sentinel');
  await dm.getByRole('button', { name: 'Apply ADJUDICATED override' }).click();
  await expect(dm.locator('[data-pause="adjudicated"]')).toBeVisible();
  await expect(dm.locator('.dm-log [data-event-type="adjudicated"]')).toContainText(
    'DM-only collapse reasoning sentinel',
  );
  await expect(dm.locator('.encounter-token[data-adjudicated="true"]')).toHaveText(
    'Reference Fighter',
  );
  await expect(page.locator('.encounter-log [data-event-type="adjudicated"]')).toContainText(
    'ADJUDICATED — visible consequence',
  );
  await expect(page.locator('.player-encounter')).not.toContainText(
    'DM-only collapse reasoning sentinel',
  );

  await dm.getByRole('button', { name: 'Resume' }).click();
  await expect(dm.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();
  await dm.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(tray).toHaveAttribute('data-boundary-blocked', 'true');
  await expect(tray.getByRole('alert')).toHaveAttribute(
    'data-refusal-code',
    'turn_boundary_blocked',
  );
  await tray.getByRole('button', { name: 'Decline for Reference Fighter' }).click();
  await dm.getByRole('button', { name: 'End turn', exact: true }).click();
  await tray.getByRole('button', { name: 'Roll Death Save for Reference Fighter' }).click();
  await expect(dm.locator('[data-hidden-roll="death-save"]')).toHaveText(
    /^Hidden death save: (?:[1-9]|1\d|20) \([^)]+\)$/u,
  );
  await expect(page.locator('.player-encounter')).not.toContainText('Hidden death save');
  await expect(
    page.locator('.encounter-log [data-event-type="death_save_resolved"]'),
  ).toHaveText('death save resolved');

  await dm.getByRole('button', { name: 'Interrupt' }).click();
  await expect(dm.locator('[data-pause="interrupted"]')).toBeVisible();
  await dm.getByRole('button', { name: 'Undo last' }).click();
  await dm.getByText('Full revision history').click();
  await expect(dm.locator('[data-void="true"]')).not.toHaveCount(0);

  await dm.getByRole('button', { name: 'Interrupt' }).click();
  const historyCount = await dm.locator('[data-revision]').count();
  await dm.reload();
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(dm.locator('[data-pause="interrupted"]')).toBeVisible();
  await dm.getByText('Full revision history').click();
  await expect(dm.locator('[data-revision]')).toHaveCount(historyCount);
  await dm.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
});
import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Browser } from '@playwright/test';
import {
  boardChromeDimensions,
  type BoardChromeTilePx,
} from '../../src/vtt/board-chrome-layout';
import { expect, test } from './fixtures/parallel-test';

const CAPTURE_TILE_PX = 128 satisfies BoardChromeTilePx;

function expectedBoardDimensions(
  bounds: { readonly columns: number; readonly rows: number },
  content: { readonly combatants: number; readonly objects: number },
  tilePx: BoardChromeTilePx = CAPTURE_TILE_PX,
): string {
  const { width, height } = boardChromeDimensions(
    bounds,
    {
      combatants: Array.from({ length: content.combatants }, () => ({ name: 'CREATURE' })),
      objects: Array.from({ length: content.objects }, () => ({ kind: 'object' })),
    },
    tilePx,
  );
  return `${String(width)}x${String(height)}`;
}

const productionBuild = spawnSync(process.execPath, ['tools/dist-build-cache.mjs'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: { ...process.env, NODE_ENV: 'production' },
});
if (productionBuild.status !== 0) {
  throw new Error(
    `Snapshot production build prerequisite failed (${String(productionBuild.status ?? productionBuild.signal)}).\n` +
    `${productionBuild.stdout}${productionBuild.stderr}`,
  );
}

const snapshotRuntimePath = resolve(
  `dnd-slim-runs/blind-board-snapshot-runtime-${String(process.pid)}.mjs`,
);
const snapshotRuntimeBuild = spawnSync('node_modules/esbuild/bin/esbuild', [
  'tools/ai-dm-blind-board-snapshot-check.ts',
  '--bundle',
  '--platform=node',
  '--format=esm',
  '--packages=external',
  '--loader:.txt=text',
  '--define:import.meta.env={"MODE":"test","DEV":false,"PROD":false,"BASE_URL":"/"}',
  `--outfile=${snapshotRuntimePath}`,
  '--log-level=warning',
], { cwd: process.cwd(), encoding: 'utf8' });
if (snapshotRuntimeBuild.status !== 0) {
  throw new Error(
    `Snapshot in-process runtime build failed (${String(
      snapshotRuntimeBuild.status ?? snapshotRuntimeBuild.signal
    )}).\n${snapshotRuntimeBuild.stdout}${snapshotRuntimeBuild.stderr}`,
  );
}

interface BrowserCheckResult {
  readonly chromiumVersion: string;
  readonly playwrightVersion: string;
  readonly benchmark: {
    readonly captures: number;
    readonly warmedMedianMs: number;
    readonly warmedP95Ms: number;
  };
  readonly dimensions: readonly string[];
  readonly staleRejected: boolean;
  readonly identityRejected: boolean;
  readonly movedDigestChanged: boolean;
  readonly manifestCarriesHtml: boolean;
}

interface BlindBrowserCheckResult {
  readonly primerVersion: string;
  readonly captureTilePx: number;
  readonly results: readonly {
    readonly difficulty: 'hard' | 'brutal';
    readonly seed: number;
    readonly revision: number;
    readonly stateDigest: string;
    readonly images: readonly {
      readonly role: 'dm_board' | 'accessible_board_raster' | 'player_board';
      readonly ordinal: number;
      readonly sha256: string;
      readonly bytes: number;
      readonly width: number;
      readonly height: number;
      readonly path: string;
    }[];
  }[];
}

interface BlindFixture {
  readonly difficulty: 'hard' | 'brutal';
  readonly seed: number;
  readonly path: string;
}

interface BlindService {
  close(): Promise<void>;
}

type CapturedBlindFamily = object;
type PreparedBlindFixture = object;
type BlindArtifact = object;

interface BlindSnapshotRuntime {
  readonly BLIND_BOARD_SNAPSHOT_FIXTURES: readonly [BlindFixture, BlindFixture];
  readonly startInProcessBlindBoardSnapshotService: (
    outputDirectory: string,
    browser: Browser,
  ) => Promise<BlindService>;
  readonly captureBlindBoardSnapshotFixture: (
    service: BlindService,
    fixture: BlindFixture,
  ) => Promise<CapturedBlindFamily>;
  readonly prepareBlindBoardSnapshotFixture: (
    fixture: BlindFixture,
  ) => Promise<PreparedBlindFixture>;
  readonly capturePreparedBlindBoardSnapshotRoles: (
    service: BlindService,
    prepared: PreparedBlindFixture,
    roles: readonly ('dm_board' | 'accessible_board_raster' | 'player_board')[],
    firstOrdinal: number,
  ) => Promise<readonly BlindArtifact[]>;
  readonly warmPreparedBlindBoardSnapshot: (
    service: BlindService,
    prepared: PreparedBlindFixture,
  ) => Promise<void>;
  readonly captureWarmedPreparedBlindBoardSnapshot: (
    service: BlindService,
    prepared: PreparedBlindFixture,
    role: 'dm_board' | 'accessible_board_raster' | 'player_board',
    visualOrdinal: number,
  ) => Promise<readonly BlindArtifact[]>;
  readonly completeBlindBoardSnapshotFamily: (
    prepared: PreparedBlindFixture,
    artifacts: readonly BlindArtifact[],
  ) => CapturedBlindFamily;
  readonly inspectCapturedBlindBoardSnapshotFamily: (family: CapturedBlindFamily) => void;
  readonly blindBoardSnapshotResult: (
    outputDirectory: string,
    families: readonly CapturedBlindFamily[],
  ) => BlindBrowserCheckResult;
}

async function runBrowserCheck(outputDirectory: string): Promise<BrowserCheckResult> {
  const output = await new Promise<{ readonly stdout: string; readonly stderr: string }>((resolveRun, reject) => {
    const child = spawn('npx', [
      'vite-node',
      'tools/ai-dm-board-snapshot-check.ts',
      '--',
      outputDirectory,
      'focused',
    ], { cwd: process.cwd(), env: process.env });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolveRun({ stdout, stderr });
      else reject(new Error(`Snapshot check failed (${String(code ?? signal)}).\n${stdout}\n${stderr}`));
    });
  });
  const line = output.stdout.split('\n').find((candidate) => candidate.startsWith('BOARD_SNAPSHOT_RESULT '));
  if (line === undefined) throw new Error(`Snapshot check emitted no result.\n${output.stdout}\n${output.stderr}`);
  return JSON.parse(line.slice('BOARD_SNAPSHOT_RESULT '.length)) as BrowserCheckResult;
}

let blindRuntime: BlindSnapshotRuntime | undefined;
let blindService: BlindService | undefined;
let preparedHardBlindFixture: PreparedBlindFixture | undefined;
let hardDmArtifacts: readonly BlindArtifact[] | undefined;
let hardRemainingArtifacts: readonly BlindArtifact[] | undefined;
let brutalBlindFamily: CapturedBlindFamily | undefined;
let blindOutputDirectory = '';

test.beforeAll(async ({ browser }) => {
  const loaded: unknown = await import(pathToFileURL(snapshotRuntimePath).href);
  if (typeof loaded !== 'object' || loaded === null ||
    typeof Reflect.get(loaded, 'startInProcessBlindBoardSnapshotService') !== 'function' ||
    typeof Reflect.get(loaded, 'captureBlindBoardSnapshotFixture') !== 'function' ||
    typeof Reflect.get(loaded, 'prepareBlindBoardSnapshotFixture') !== 'function' ||
    typeof Reflect.get(loaded, 'capturePreparedBlindBoardSnapshotRoles') !== 'function' ||
    typeof Reflect.get(loaded, 'warmPreparedBlindBoardSnapshot') !== 'function' ||
    typeof Reflect.get(loaded, 'captureWarmedPreparedBlindBoardSnapshot') !== 'function' ||
    typeof Reflect.get(loaded, 'completeBlindBoardSnapshotFamily') !== 'function' ||
    typeof Reflect.get(loaded, 'inspectCapturedBlindBoardSnapshotFamily') !== 'function' ||
    typeof Reflect.get(loaded, 'blindBoardSnapshotResult') !== 'function' ||
    !Array.isArray(Reflect.get(loaded, 'BLIND_BOARD_SNAPSHOT_FIXTURES'))) {
    throw new TypeError('Blind board snapshot runtime exports are malformed.');
  }
  blindRuntime = loaded as BlindSnapshotRuntime;
  blindOutputDirectory = resolve(
    `dnd-slim-runs/blind-board-snapshot-browser-${String(process.pid)}-images`,
  );
  blindService = await blindRuntime.startInProcessBlindBoardSnapshotService(
    blindOutputDirectory,
    browser,
  );
  preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
    blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
  );
  await blindRuntime.warmPreparedBlindBoardSnapshot(
    blindService,
    preparedHardBlindFixture,
  );
});

test.beforeAll(async () => {
  if (blindRuntime === undefined || blindService === undefined ||
    preparedHardBlindFixture === undefined) {
    throw new Error('Blind board snapshot warmup did not complete.');
  }
  hardDmArtifacts = await blindRuntime.captureWarmedPreparedBlindBoardSnapshot(
    blindService,
    preparedHardBlindFixture,
    'dm_board',
    1,
  );
});

test.beforeAll(async () => {
  if (blindRuntime === undefined || blindService === undefined ||
    preparedHardBlindFixture === undefined) {
    throw new Error('Blind board snapshot DM capture did not complete.');
  }
  hardRemainingArtifacts = await blindRuntime.capturePreparedBlindBoardSnapshotRoles(
    blindService,
    preparedHardBlindFixture,
    ['accessible_board_raster', 'player_board'],
    2,
  );
});

test.beforeAll(async () => {
  if (blindRuntime === undefined || blindService === undefined) {
    throw new Error('Blind board snapshot hard-family capture did not complete.');
  }
  brutalBlindFamily = await blindRuntime.captureBlindBoardSnapshotFixture(
    blindService,
    blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[1],
  );
});

test.afterAll(async () => {
  await blindService?.close();
});

test('captures the full production DM board deterministically through durable save upload/load', async () => {
  expect(expectedBoardDimensions({ columns: 17, rows: 13 }, { combatants: 0, objects: 0 }, 64))
    .toBe('1140x1012');
  expect(expectedBoardDimensions({ columns: 24, rows: 15 }, { combatants: 0, objects: 0 }, 64))
    .toBe('1588x1140');

  const outputDirectory = resolve(
    `dnd-slim-runs/board-snapshot-browser-${String(process.pid)}-images`,
  );
  const result = await runBrowserCheck(outputDirectory);
  expect(result.benchmark.captures).toBe(2);
  const expectedDimensions = [
    // The four exact terrain rows wrap once at 17 columns. Unit invariants
    // independently pin their copy, glyphs, and canonical engine/rail parity.
    '2280x3200',
    expectedBoardDimensions({ columns: 24, rows: 15 }, { combatants: 7, objects: 5 }),
  ].sort();
  expect(result.dimensions).toEqual(expectedDimensions);
  expect(result.staleRejected).toBe(true);
  expect(result.identityRejected).toBe(true);
  expect(result.movedDigestChanged).toBe(true);
  expect(result.manifestCarriesHtml).toBe(true);
  expect(result.chromiumVersion).not.toBe('');
  expect(result.playwrightVersion).toBe('1.61.1');
});

test('captures synchronized state-only DM, accessible-raster, and player evidence', async () => {
  if (blindRuntime === undefined || preparedHardBlindFixture === undefined ||
    hardDmArtifacts === undefined || hardRemainingArtifacts === undefined ||
    brutalBlindFamily === undefined) {
    throw new Error('Blind board snapshot file setup did not complete.');
  }
  const hardBlindFamily = blindRuntime.completeBlindBoardSnapshotFamily(
    preparedHardBlindFixture,
    [...hardDmArtifacts, ...hardRemainingArtifacts],
  );
  const families = [hardBlindFamily, brutalBlindFamily] as const;
  for (const family of families) {
    blindRuntime.inspectCapturedBlindBoardSnapshotFamily(family);
  }
  const result = blindRuntime.blindBoardSnapshotResult(blindOutputDirectory, families);
  expect(result.primerVersion).toBe('d562-general-board-primer-v10');
  expect(result.captureTilePx).toBe(128);
  expect(result.results.map(({ difficulty, seed }) => ({ difficulty, seed }))).toEqual([
    { difficulty: 'hard', seed: 5_117_001 },
    { difficulty: 'brutal', seed: 6_203_001 },
  ]);
  for (const family of result.results) {
    expect(family.stateDigest).toMatch(/^[a-f0-9]{64}$/u);
    expect(family.images.map(({ role, ordinal }) => ({ role, ordinal }))).toEqual([
      { role: 'dm_board', ordinal: 1 },
      { role: 'accessible_board_raster', ordinal: 2 },
      { role: 'player_board', ordinal: 3 },
    ]);
    expect(new Set(family.images.map(({ sha256 }) => sha256)).size).toBe(3);
    expect(family.images.every((image) =>
      image.bytes > 0 && image.bytes <= 1_000_000 && image.width > 0 && image.height > 0 &&
      image.path.endsWith(`${image.sha256}.png`))).toBe(true);
  }
});
    await row.waitFor({ state: 'visible' });
    await Promise.all([
      this.#page.waitForURL((url) => url.searchParams.get('session') === bundle.sessionId),
      row.getByRole('button', { name: 'Load', exact: true }).click(),
    ]);

    await this.#page.addStyleTag({ content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
        scroll-behavior: auto !important;
      }
      html { scrollbar-width: none !important; }
      ::-webkit-scrollbar { display: none !important; }
      .encounter-board {
        --encounter-tile-size: ${String(this.#captureGeometry.tileSizeCssPx)}px !important;
        user-select: none !important;
      }
    ` });
    if (addCanary) await this.#addCanary(captureOrdinal);

    const board = this.#boardLocator(role);
    await this.#waitForBoardVisible(board, input.source, role);
    await board.evaluate((element) => element.scrollIntoView({ block: 'start', inline: 'start' }));
    await this.#waitForSettledBoard(board, input.source, role);
    return board;
  }

  #boardLocator(role: BoardSnapshotImageRole): ReturnType<Page['locator']> {
    return this.#page.locator(
      this.#informationMode === 'blind_state'
        ? `[data-blind-snapshot-capture=true][data-blind-snapshot-role=${role}]`
        : '.encounter-board',
    );
  }

  async #addCanary(captureOrdinal: number): Promise<void> {
    await this.#page.evaluate(({ ordinal, canary, markerHeightCssPx }) => {
      const marker = document.createElement('p');
      marker.id = 'board-snapshot-outside-canary';
      marker.textContent = `${canary}:${String(ordinal)}`;
      marker.style.height = `${String(markerHeightCssPx)}px`;
      marker.style.margin = '0';
      document.body.append(marker);
    }, {
      ordinal: captureOrdinal,
      canary: SNAPSHOT_CANARY,
      markerHeightCssPx: this.#captureGeometry.markerHeightCssPx,
    });
  }

  async #waitForBoardVisible(
    board: ReturnType<Page['locator']>,
    source: BoardImageSource,
    role: BoardSnapshotImageRole,
  ): Promise<void> {
    await new Promise<void>((resolveBoard, reject) => {
      const onPageError = (error: Error): void => {
        this.#page.off('pageerror', onPageError);
        reject(new Error(`Snapshot page failed before board render: ${error.message}`, { cause: error }));
      };
      this.#page.on('pageerror', onPageError);
      void this.#page.waitForFunction((expected) => {
        const selector = expected.informationMode === 'blind_state'
          ? `[data-blind-snapshot-capture=true][data-blind-snapshot-role=${expected.role}]`
          : '.encounter-board';
        const candidate = document.querySelector<HTMLElement>(selector);
        if (candidate === null) return false;
        const bounds = candidate.getBoundingClientRect();
        const style = getComputedStyle(candidate);
        return bounds.width > 0 && bounds.height > 0 &&
          style.visibility !== 'hidden' && style.display !== 'none' &&
          candidate.dataset.boardAudience === (expected.role === 'player_board' ? 'player' : 'dm') &&
          candidate.dataset.sourceRevision === String(expected.revision) &&
          candidate.dataset.sourceRound === String(expected.round) &&
          candidate.dataset.sourceStateDigest === expected.stateDigest &&
          // D525: a board rendered under another glyph mode than requested is never captured.
          (expected.boardGlyphs === null || candidate.dataset.boardGlyphs === expected.boardGlyphs);
      }, {
        ...source,
        boardGlyphs: this.#boardGlyphs,
        informationMode: this.#informationMode,
        role,
      }, { polling: 'raf' }).then(() => {
        this.#page.off('pageerror', onPageError);
        resolveBoard();
      }, (error: unknown) => {
        this.#page.off('pageerror', onPageError);
        reject(error);
      });
    });
    if (await board.count() !== 1) throw new Error('Snapshot page must render exactly one encounter board.');
  }

  async #waitForSettledBoard(
    board: ReturnType<Page['locator']>,
    source: BoardImageSource,
    role: BoardSnapshotImageRole,
  ): Promise<void> {
    await board.evaluate(async (element, expected) => {
      const html = element as HTMLElement;
      const attributes = (): readonly string[] => [
        html.dataset.boardAudience ?? '',
        html.dataset.sourceRevision ?? '',
        html.dataset.sourceRound ?? '',
        html.dataset.sourceStateDigest ?? '',
      ];
      const wanted = [
        expected.role === 'player_board' ? 'player' : 'dm',
        String(expected.revision),

codex
The reference-flow mismatch is indeed at the dark target cell, and D635.38 requires diagnosis rather than a speculative re-pin. I’m now tracing the exact state-digest construction on both sides and inventorying all browser assertions tied to the four named scenes.
exec
/bin/bash -lc "sed -n '35,145p' src/vtt/reference-encounter.ts
rg -n \"data-source-state-digest|sourceStateDigest|stateDigest|source-state-digest|boardAudience|sourceRevision|sourceRound\" src tools tests/browser --glob '*.ts' --glob '*.tsx'
rg -n \"encounter-art-fog|concealedCells|concealed|foggedCells|data-cell=|data-cell\\\"|data-cell'|reference|Vane|two-room|d365\" tests/browser --glob '*.spec.ts'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
  options: {
    readonly maximumHp: number;
    readonly armor: number;
    readonly initiative: number;
    readonly spellSlots?: CombatantProfile['rules']['spellSlots'];
  },
): CombatantProfile {
  const common = {
    id: combatantId(`combatant:${key}`),
    tokenId: tokenId(`token:${key}`),
    name,
    rules: {
      armorClass: armorClass(options.armor),
      hitPointMaximum: options.maximumHp,
      speed: feet(30),
      initiativeBonus: options.initiative,
      savingThrowBonuses: SAVES,
      attacksPerAction: key === 'fighter' ? 2 : 1,
      reach: feet(5),
      damageResponses: [],
      conditionImmunities: [],
      usesDeathSaves: kind === 'player_character',
      senses: [{ kind: 'normal_sight' }],
      passivePerception: 12,
      detectionTraits: [],
      contactMedium: 'surface',
      sizeCategory: 'Medium',
      ...(key === 'training-brute' ? { skillBonuses: { stealth: 20 } } : {}),
      spellSlots: options.spellSlots ?? [],
    },
  } as const;
  return kind === 'player_character'
    ? { ...common, kind, characterId: key === 'fighter' ? 1 : key === 'cleric' ? 2 : 3, wildShape: null }
    : { ...common, kind, statblockId: statblockId('statblock:training-brute') };
}

export const REFERENCE_FIGHTER_ID = combatantId('combatant:fighter');
export const REFERENCE_CLERIC_ID = combatantId('combatant:cleric');
export const REFERENCE_WIZARD_ID = combatantId('combatant:wizard');
export const REFERENCE_MONSTER_ID = combatantId('combatant:training-brute');
export const REFERENCE_PLAYER_IDS: readonly CombatantId[] = [
  REFERENCE_FIGHTER_ID,
  REFERENCE_CLERIC_ID,
  REFERENCE_WIZARD_ID,
];

export function referenceEncounterSetup(): {
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly combatants: readonly CombatantProfile[];
  readonly tokens: readonly CombatToken[];
  readonly blockedCells: readonly GridCell[];
  readonly environment: EncounterState['environment'];
  readonly dmNotes: readonly string[];
} {
  const fighter = profile('fighter', 'Reference Fighter', 'player_character', {
    maximumHp: 67,
    armor: 18,
    initiative: 100,
  });
  const cleric = profile('cleric', 'Reference Cleric', 'player_character', {
    maximumHp: 52,
    armor: 18,
    initiative: 70,
    spellSlots: referencePartySpellSlots('Cleric'),
  });
  const wizard = profile('wizard', 'Reference Wizard', 'player_character', {
    maximumHp: 38,
    armor: 15,
    initiative: 40,
    spellSlots: referencePartySpellSlots('Wizard'),
  });
  const monster = profile('training-brute', 'Training Brute', 'monster', {
    maximumHp: 80,
    armor: 12,
    initiative: 0,
  });
  const positions: readonly GridCell[] = [
    { column: 2, row: 3 },
    { column: 1, row: 4 },
    { column: 1, row: 2 },
    { column: 3, row: 3 },
  ];
  const combatants = [fighter, cleric, wizard, monster];
  return {
    bounds: { columns: 10, rows: 7 },
    combatants,
    tokens: combatants.map((combatant, index) => combatToken(combatant, positions[index] as GridCell)),
    blockedCells: [{ column: 7, row: 2 }],
    environment: {
      lightRegions: [{ id: 'reference-hiding-shadow', cells: [{ column: 4, row: 3 }], level: 'darkness' }],
      obscurementRegions: [],
      difficultTerrainRegions: [],
      movementRegions: [],
      narrowOpeningRegions: [],
    },
    dmNotes: ['Training Brute retreats after the three reference PCs act.'],
  };
}

function subject(state: EncounterState, id: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new Error(`Unknown reference combatant ${id}.`);
  return found;
}

function position(state: EncounterState, id: CombatantId): GridCell {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new Error(`Reference combatant ${id} has no token.`);
  return found.position;
}

tests/browser/ai-dm-board-snapshot.spec.ts:85:    readonly stateDigest: string;
tests/browser/ai-dm-board-snapshot.spec.ts:306:    expect(family.stateDigest).toMatch(/^[a-f0-9]{64}$/u);
tools/ai-dm-board-glyph-captures.ts:118:            stateDigest: boardStateDigest(candidate.state),
tools/ai-dm-board-snapshot-check.ts:20:    stateDigest: boardStateDigest(state),
tools/ai-dm-board-snapshot-check.ts:188:    movedDigestChanged: movedArtifact.source.stateDigest !== captures[1]?.source.stateDigest,
tools/ai-dm-blind-board-snapshot-check.ts:25:    stateDigest: boardStateDigest(state),
tools/ai-dm-blind-board-snapshot-check.ts:49:    requireCondition(artifact.source.stateDigest === boardStateDigest(state), 'Image digest binding changed.');
tools/ai-dm-blind-board-snapshot-check.ts:160:    readonly stateDigest: string;
tools/ai-dm-blind-board-snapshot-check.ts:285:      stateDigest: source.stateDigest,
tools/rl/extract-sft.ts:24:  readonly stateDigest: string;
tools/rl/extract-sft.ts:37:  readonly stateDigest: string;
tools/rl/extract-sft.ts:74:  readonly stateDigest: string;
tools/rl/extract-sft.ts:107:  readonly stateDigest: string;
tools/rl/extract-sft.ts:155:function stateDigestFromArguments(argumentsValue: Readonly<Record<string, unknown>>): string | null {
tools/rl/extract-sft.ts:217:    const stateDigest = stateDigestFromArguments(submitRoundProposalsArguments);
tools/rl/extract-sft.ts:218:    if (turnContext === undefined || stateDigest === null) continue;
tools/rl/extract-sft.ts:223:      stateDigest,
tools/rl/extract-sft.ts:307:    typeof candidate['stateDigest'] !== 'string' || typeof candidate['requestId'] !== 'string' ||
tools/rl/extract-sft.ts:316:    stateDigest: candidate['stateDigest'],
tools/rl/extract-sft.ts:349:        stateDigest: rolloutCapture.stateDigest,
tools/rl/extract-sft.ts:378:    stateDigest: capture.stateDigest,
tools/rl/extract-sft.ts:422:        stateDigest: capture.stateDigest,
tools/rl/extract-sft.ts:483:          const key = `${example.task}:${example.stateDigest}:${example.planHash}`;
tools/ai-dm-conversation.ts:335:  readonly stateDigest: string;
tools/ai-dm-conversation.ts:660:    readonly stateDigest: string;
tools/ai-dm-conversation.ts:2135:    stateDigest: proposal.stateDigest,
tools/ai-dm-conversation.ts:3222:    typeof input['expectedRevision'] === 'number' && typeof input['stateDigest'] === 'string' &&
tools/ai-dm-conversation.ts:3261:    typeof input['expectedRevision'] === 'number' && typeof input['stateDigest'] === 'string' &&
tools/ai-dm-conversation.ts:3277:    stateDigest: proposal.stateDigest,
tools/ai-dm-conversation.ts:3298:    typeof input['sourceRevision'] === 'number' &&
tools/ai-dm-conversation.ts:3818:    stateDigest: snapshot.capsule.digest,
tools/ai-dm-conversation.ts:4487:          stateDigest: boardStateDigest(rendererState),
tools/ai-dm-conversation.ts:5934:              proposal.expectedRevision !== contextRevision || proposal.stateDigest !== expectedCapsule.digest ||
tools/ai-dm-conversation.ts:6541:              stateDigest: correctionCapsule.digest,
tools/ai-dm-conversation.ts:7420:            stateDigest: String(movementProvenance['state_digest']),
tools/ai-dm-screenshot-probe.ts:388:  readonly stateDigest: string;
tools/ai-dm-screenshot-probe.ts:2622:    stateDigest: boardStateDigest(state),
tools/ai-dm-screenshot-probe.ts:2753:    stateDigest: task.artifact.source.stateDigest,
tools/ai-dm-screenshot-probe.ts:2842:  readonly stateDigest: string;
tools/ai-dm-screenshot-probe.ts:2864:    stateDigest: z.string().min(1),
tools/ai-dm-screenshot-probe.ts:2903:    stateDigest: z.string().min(1),
tools/ai-dm-screenshot-probe.ts:3115:    stateDigest: row.stateDigest,
tools/ai-dm-screenshot-probe.ts:3123:    stateDigest: row.stateDigest,
tools/ai-dm-screenshot-probe.ts:3408:    stateDigest: saved.stateDigest,
tools/ai-dm-screenshot-probe.ts:3509:      saved.stateDigest,
tools/ai-dm-screenshot-probe.ts:3520:      hiddenNamesByState.get(saved.stateDigest) ?? [],
tools/ai-dm-screenshot-probe.ts:3615:        artifact.source.stateDigest !== boardStateDigest(candidate.state)
tools/ai-dm-board-snapshot.ts:92:  readonly stateDigest: string;
tools/ai-dm-board-snapshot.ts:215:  if (!SHA256_PATTERN.test(source.stateDigest)) {
tools/ai-dm-board-snapshot.ts:219:  if (source.stateDigest !== digest) {
tools/ai-dm-board-snapshot.ts:220:    throw new Error(`Board image state digest ${source.stateDigest} does not match canonical state ${digest}.`);
tools/ai-dm-board-snapshot.ts:234:    artifact.source.stateDigest !== source.stateDigest
tools/ai-dm-board-snapshot.ts:288:    `board-snapshot:${source.stateDigest}:${String(captureOrdinal)}`,
tools/ai-dm-board-snapshot.ts:293:    branchId: encounterBranchId(`branch:board-snapshot:${source.stateDigest}`),
tools/ai-dm-board-snapshot.ts:793:      artifact.source.stateDigest !== input.source.stateDigest)) {
tools/ai-dm-board-snapshot.ts:923:    const bundlePath = join(sessions, `${input.source.stateDigest}-${String(captureOrdinal)}.vtt.json`);
tools/ai-dm-board-snapshot.ts:1013:          candidate.dataset.boardAudience === (expected.role === 'player_board' ? 'player' : 'dm') &&
tools/ai-dm-board-snapshot.ts:1014:          candidate.dataset.sourceRevision === String(expected.revision) &&
tools/ai-dm-board-snapshot.ts:1015:          candidate.dataset.sourceRound === String(expected.round) &&
tools/ai-dm-board-snapshot.ts:1016:          candidate.dataset.sourceStateDigest === expected.stateDigest &&
tools/ai-dm-board-snapshot.ts:1043:        html.dataset.boardAudience ?? '',
tools/ai-dm-board-snapshot.ts:1044:        html.dataset.sourceRevision ?? '',
tools/ai-dm-board-snapshot.ts:1045:        html.dataset.sourceRound ?? '',
tools/ai-dm-board-snapshot.ts:1046:        html.dataset.sourceStateDigest ?? '',
tools/ai-dm-board-snapshot.ts:1052:        expected.stateDigest,
src/vtt/session-timeline.ts:61:    readonly sourceRevision: number;
src/vtt/session-timeline.ts:221:            sourceRevision: entry.transition.sourceRevision,
src/vtt/handoff/fixtures/two-room.ts:139:  readonly sourceRevision: number;
src/vtt/handoff/fixtures/two-room.ts:178:      schemaVersion: 1, seed: TWO_ROOM_SEED, sourceRevision: state.revision,
src/vtt/agent-round-decision.ts:88:  readonly stateDigest: string;
src/vtt/agent-round-decision.ts:96:  readonly stateDigest: string;
src/vtt/agent-round-decision.ts:206:    stateDigest: input.stateDigest,
src/vtt/agent-round-decision.ts:219:  if (input.requestId.length === 0 || input.stateDigest.length === 0 || input.actors.length === 0) {
src/vtt/agent-round-decision.ts:238:    stateDigest: input.stateDigest,
src/vtt/speculative-plan-types.ts:123:  readonly sourceRevision: number;
src/vtt/encounter-app.ts:706:    readonly stateDigest: string;
src/vtt/encounter-app.ts:729:  board.dataset.boardAudience = provenance === undefined ? 'player' : 'dm';
src/vtt/encounter-app.ts:732:    board.dataset.sourceRevision = String(provenance.revision);
src/vtt/encounter-app.ts:733:    board.dataset.sourceRound = String(provenance.round);
src/vtt/encounter-app.ts:734:    board.dataset.sourceStateDigest = provenance.stateDigest;
src/vtt/encounter-app.ts:2280:      stateDigest: projection.stateDigest,
src/vtt/encounter-app.ts:2305:    element.dataset.boardAudience = role === 'player_board' ? 'player' : 'dm';
src/vtt/encounter-app.ts:2306:    element.dataset.sourceRevision = String(projection.encounter.revision);
src/vtt/encounter-app.ts:2307:    element.dataset.sourceRound = String(projection.board.round);
src/vtt/encounter-app.ts:2308:    element.dataset.sourceStateDigest = projection.stateDigest;
src/vtt/encounter-app.ts:2661:        text: `Branch at round ${String(branch.round)}: revision ${String(branch.sourceRevision)} → ${String(branch.targetRevision)}`,
src/vtt/engine-envelopes.ts:24:  readonly stateDigest: string;
src/vtt/engine-envelopes.ts:88:  readonly stateDigest: string;
src/vtt/engine-envelopes.ts:122:  if (capsule.branchId !== envelope.branchId || capsule.digest !== envelope.stateDigest) {
src/vtt/mcp/entrypoint.ts:293:    readonly stateDigest: string;
src/vtt/mcp/entrypoint.ts:866:    Object.keys(source).every((key) => ['room', 'round', 'revision', 'stateDigest'].includes(key)) &&
src/vtt/mcp/entrypoint.ts:869:    source['revision'] >= 0 && typeof source['stateDigest'] === 'string' &&
src/vtt/mcp/entrypoint.ts:870:    /^[a-f0-9]{64}$/u.test(source['stateDigest']);
src/vtt/mcp/entrypoint.ts:885:    artifact.source.revision !== state.revision || artifact.source.stateDigest !== sourceDigest) {
src/vtt/mcp/entrypoint.ts:928:    binding.artifact.source.stateDigest !== sourceDigest) {
src/vtt/blind-turn-context.ts:1211:  stateDigest: string,
src/vtt/blind-turn-context.ts:1220:      state_digest: stateDigest,
src/vtt/encounter-projections.ts:138:  readonly stateDigest: string;
src/vtt/encounter-projections.ts:488:    stateDigest: sha256(canonicalJson(input.view.state)),
src/vtt/speculative-plan-submission.ts:29:  const capsule = source.read({ runId: plan.runId, stateHandle: plan.stateHandle, expectedRevision: plan.sourceRevision });
src/vtt/speculative-plan-submission.ts:52:  if (source.read({ runId: plan.runId, stateHandle: plan.stateHandle, expectedRevision: plan.sourceRevision }).digest !== capsule.digest) {
src/vtt/mcp/engine-server.ts:286:  readonly requestId: string; readonly expectedRevision: number; readonly stateDigest: string;
src/vtt/mcp/engine-server.ts:2427:          stateDigest: capsule.digest,
src/vtt/mcp/engine-server.ts:3353:        submitEngineProposal(feed, proposals, { kind: 'round_turn_proposal', proposalId, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), phase: request.phase, idempotencyKey: key, resolutions: valid, rationale: typeof input['rationale'] === 'string' ? input['rationale'] : null, reactionGuidance, submittedArguments: structuredClone(roundSubmission?.submittedArguments ?? suppliedInput), ...(activeIntelMode === 'off' ? {} : { intelCapture: captureDmIntel(state, capsule, queries) }) });
src/vtt/mcp/engine-server.ts:3442:            stateDigest: capsule.digest,
src/vtt/mcp/engine-server.ts:3499:          sourceRevision: requestCapsule.revision,
src/vtt/mcp/engine-server.ts:3541:          stateDigest: capsule.digest,
src/vtt/mcp/engine-server.ts:3572:        submitEngineNarration(feed, narration, { kind: 'narration', narrationId, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), idempotencyKey: key, voice: stringField(input, 'voice') as 'cinematic_visible_rolls' | 'terse_tactical' | 'rules_explicit' | 'terse_rule_citing_validation', text: stringField(input, 'text'), audience: stringField(input, 'audience') as 'shared' | 'dm_only', ruleReferences: accepted });
src/vtt/mcp/engine-server.ts:3583:        adjudications.append({ adjudicationRequestId: id, runId: capsule.runId, branchId: capsule.branchId, requestId: request.requestId, expectedRevision: capsule.revision, stateDigest: capsule.digest, stateHandle: engineStateHandle(capsule), actorId, subject: stringField(input, 'subject'), reason: stringField(input, 'reason'), blocking: input['blocking'] === true, suggestedOutcomes: Array.isArray(input['suggested_outcomes']) ? input['suggested_outcomes'].map(String) : [], idempotencyKey: key });
src/vtt/session-persistence.ts:219:      readonly sourceRevision: number;
src/vtt/session-persistence.ts:604:    'stateDigest', 'stateHandle', 'actorId', 'subject', 'reason', 'blocking',
src/vtt/session-persistence.ts:610:    typeof value.stateDigest === 'string' && typeof value.stateHandle === 'string' &&
src/vtt/session-persistence.ts:888:        hasExactlyKeys(value, ['kind', 'operation', 'sourceRevision', 'targetRevision']) &&
src/vtt/session-persistence.ts:890:        Number.isSafeInteger(value.sourceRevision) && Number.isSafeInteger(value.targetRevision)
src/vtt/session-persistence.ts:2076:        sourceRevision: source.revision,
tests/browser/agent-reference.spec.ts:10:import type { AgentReference } from '../../src/ui/screens/planner/agent-reference';
tests/browser/agent-reference.spec.ts:73:async function reference(
tests/browser/agent-reference.spec.ts:76:  const json = await page.locator('#planner-build-reference').textContent();
tests/browser/agent-reference.spec.ts:77:  if (json === null) throw new Error('Missing build reference JSON block.');
tests/browser/agent-reference.spec.ts:106:test('the planner emits a JSON build reference that matches the workspace read-model', async ({
tests/browser/agent-reference.spec.ts:110:  const block = await page.locator('#planner-build-reference');
tests/browser/agent-reference.spec.ts:113:  const { value } = await reference(page);
tests/browser/agent-reference.spec.ts:117:  expect(value.format).toBe('dnd-multiclass-spells.planner-reference');
tests/browser/agent-reference.spec.ts:169:  const { json, value } = await reference(page);
tests/browser/agent-reference.spec.ts:220:test('the build reference sections are collapsed, present in the DOM, and never hidden', async ({
tests/browser/agent-reference.spec.ts:224:  const sections = page.locator('.build-reference-panel details');
tests/browser/agent-reference.spec.ts:278:  const { value } = await reference(page);
tests/browser/ai-chat.spec.ts:102:  expect(answer).toContain('has-reference=yes');
tests/browser/ai-chat.spec.ts:110:test('the reference it sends is the planner’s own JSON island, withholding imported text', async ({
tests/browser/ai-chat.spec.ts:116:  const island = await page.locator('#planner-build-reference').textContent();
tests/browser/ai-chat.spec.ts:121:  expect(answer).toContain('has-reference=yes');
tests/browser/ai-chat.spec.ts:204:  // And the planner still works: the build reference renders and expands.
tests/browser/ai-chat.spec.ts:205:  await expect(page.locator('#planner-build-reference')).toHaveCount(1);
tests/browser/ai-chat.spec.ts:206:  const section = page.locator('details.reference-section').first();
tests/browser/ai-chat.spec.ts:225:  await expect(page.locator('#planner-build-reference')).toHaveCount(1);
tests/browser/ai-chat.spec.ts:293:              params: { message: 'attacker', reference: null },
tests/browser/sweep-6-provenance-labels.spec.ts:33:    preferences: [],
tests/browser/sweep-6-provenance-labels.spec.ts:112:test('S6 old known references retain the share while opening their installer', async ({
tests/browser/php-feature-parity-reports.spec.ts:323:    reference: {
tests/browser/php-feature-parity-reports.spec.ts:348:    reference: {
tests/browser/library-import-remedy.spec.ts:61:    reference_text: input.oversized
tests/browser/library-import-remedy.spec.ts:161:  const reference = {
tests/browser/library-import-remedy.spec.ts:166:  const library = portableElfLibraryDocument(reference, {
tests/browser/library-import-remedy.spec.ts:171:  const collision = portableElfLibraryDocument(reference, {
tests/browser/library-import-remedy.spec.ts:176:  const embedded = portableElfLibraryDocument(reference, {
tests/browser/library-import-remedy.spec.ts:418:  // reference-only link must later restore.
tests/browser/library-import-remedy.spec.ts:522:    // Reopening the original link is the documented retry. Its reference-only
tests/browser/library-import-remedy.spec.ts:533:      'Shared reference has no rules to compare',
tests/browser/vtt-long-rest.spec.ts:7:  await page.goto('/vtt?encounter=d365');
tests/browser/vtt-option-paths.spec.ts:89:  await page.goto('/vtt?encounter=reference&view=dm&session=d512-bootstrap');
tests/browser/vtt-option-paths.spec.ts:108:    await page.goto(`/vtt?encounter=reference&view=dm&boardSnapshot=1&session=${bundle.sessionId}`);
tests/browser/homebrew-species-authoring.spec.ts:42:    .fill('Its winding key is reference prose and changes no sheet number.');
tests/browser/planner.spec.ts:173:test('planner contains expanded reference tables within a mobile viewport', async ({
tests/browser/planner.spec.ts:219:  const referenceSections = page.locator(
tests/browser/planner.spec.ts:220:    '.build-reference-panel details.reference-section',
tests/browser/planner.spec.ts:222:  expect(await referenceSections.count()).toBeGreaterThan(0);
tests/browser/planner.spec.ts:223:  await referenceSections.evaluateAll((sections) => {
tests/browser/planner.spec.ts:226:        throw new Error('Build reference section is not a details element.');
tests/browser/planner.spec.ts:233:      referenceSections.evaluateAll((sections) =>
tests/browser/planner.spec.ts:246:    await page.locator('.reference-scroll').evaluateAll((scrollers) =>
tests/browser/planner.spec.ts:626:  await expect(weapons.getByLabel('Start from a reference weapon')).toBeFocused();
tests/browser/character-sheet.spec.ts:13:} from '../../src/queries/print-appendix-preferences';
tests/browser/character-sheet.spec.ts:1101:test('print button writes nothing when no named appendix preference changes', async ({
tests/browser/character-sheet.spec.ts:1738:    throw new Error('The flavor fixture requires its preference-control row.');
tests/browser/character-sheet.spec.ts:1798:  // print-preference rows may differ in character_rule_overrides.
tests/browser/character-sheet.spec.ts:1800:  const namedPreferenceKeys = new Set<string>(
tests/browser/character-sheet.spec.ts:1803:  const withoutNamedPreferenceRows = (tableRows: Record<string, unknown>[]) =>
tests/browser/character-sheet.spec.ts:1808:        !namedPreferenceKeys.has(row.rule_key),
tests/browser/character-sheet.spec.ts:1815:        ? withoutNamedPreferenceRows(afterRows)
tests/browser/character-sheet.spec.ts:1817:      `${table} changed while persisting a print preference`,
tests/browser/character-sheet.spec.ts:1820:        ? withoutNamedPreferenceRows(beforeRows)
tests/browser/php-feature-parity-queries.spec.ts:449:    'character_spell_preferences',
tests/browser/php-feature-parity-queries.spec.ts:462:    'character_spell_preferences',
tests/browser/homebrew-background-authoring.spec.ts:58:  await page.getByRole('textbox', { name: 'Tool reference text (optional)', exact: true })
tests/browser/homebrew-background-authoring.spec.ts:124:    'Navigator tools · Homebrew · external layer is recorded as tool reference text; no tool proficiency is mechanically applied.',
tests/browser/weapons.spec.ts:202:test('a weapon is added from a reference template, then edited without touching the template', async ({
tests/browser/weapons.spec.ts:236:  const referenceWeapon = form.getByLabel('Start from a reference weapon');
tests/browser/weapons.spec.ts:237:  await expect(referenceWeapon).toBeFocused();
tests/browser/weapons.spec.ts:239:  expect(await referenceWeapon.evaluate((select) => {
tests/browser/weapons.spec.ts:260:  // the whole point of storing values instead of a template reference.
tests/browser/weapons.spec.ts:284:  // because the weapon holds no reference to one.
tests/browser/weapons.spec.ts:334:  await expect(form.getByLabel('Start from a reference weapon')).toHaveValue('');
tests/browser/weapons.spec.ts:381:      .getByLabel('Start from a reference weapon')
tests/browser/weapons.spec.ts:420:  const picker = form.getByLabel('Start from a reference weapon');
tests/browser/weapons.spec.ts:436:  // All 38 reference weapons plus the "Custom weapon" first option.
tests/browser/weapons.spec.ts:442:    .getByLabel('Start from a reference weapon')
tests/browser/weapons.spec.ts:481:    .getByLabel('Start from a reference weapon')
tests/browser/weapons.spec.ts:580:    .getByLabel('Start from a reference weapon')
tests/browser/weapons.spec.ts:625:    .getByLabel('Start from a reference weapon')
tests/browser/weapons.spec.ts:725:    .getByLabel('Start from a reference weapon')
tests/browser/weapons.spec.ts:819:    .getByLabel('Start from a reference weapon')
tests/browser/vtt-handoff/worker.spec.ts:30:  expect(initial.playerSnapshot?.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
tests/browser/vtt-handoff/worker.spec.ts:38:      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
tests/browser/vtt-handoff/worker.spec.ts:42:      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
tests/browser/vtt-handoff/worker.spec.ts:51:    expect.objectContaining({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 }),
tests/browser/vtt-handoff/worker.spec.ts:87:      params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/worker.spec.ts:99:  expect(afterMutation.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
tests/browser/vtt-handoff/worker.spec.ts:106:      params: { doorId: 'object:two-room-door', open: false },
tests/browser/vtt-handoff/worker.spec.ts:126:  expect(reconnected.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(false);
tests/browser/vtt-handoff/top-down-smoke.spec.ts:8:  await page.goto('/vtt?encounter=d365');
tests/browser/vtt-save-manager.spec.ts:4:  await page.goto('/vtt?encounter=reference&view=dm&session=savemgr-fallback');
tests/browser/vtt-save-manager.spec.ts:26:  await page.goto('/vtt?encounter=reference&view=dm&session=savemgr-browser');
tests/browser/vane-warren-entry.spec.ts:3:test('a reset session mounts the first Vane Warren fight in a real browser', async ({ page }) => {
tests/browser/vane-warren-entry.spec.ts:17:  await page.getByRole('button', { name: 'Start the Vane Warren', exact: true }).click();
tests/browser/vane-warren-entry.spec.ts:24:    'The Vane Warren — encounter 1 of 3',
tests/browser/vtt-handoff/runtime-parity.spec.ts:12:test('pairs the real Worker and browser WebSocket transport on the fixed two-room scene', async ({ page }, testInfo) => {
tests/browser/vtt-handoff/runtime-parity.spec.ts:23:      role: 'player', playerId: 'combatant:two-room-goblin',
tests/browser/vtt-handoff/runtime-parity.spec.ts:74:      { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:75:      { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:82:        params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/runtime-parity.spec.ts:87:    expect(workerDoor.state.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
tests/browser/vtt-handoff/runtime-parity.spec.ts:102:        params: { lightId: 'object:two-room-torch', enabled: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:114:        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
tests/browser/vtt-handoff/runtime-parity.spec.ts:119:        params: { doorId: 'object:two-room-door', open: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:137:          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:138:          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:140:        doors: expect.arrayContaining([expect.objectContaining({ id: 'object:two-room-door', open: false })]),
tests/browser/vtt-handoff/runtime-parity.spec.ts:208:        v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:212:          if (event.data.doors.some((door) => door.id === 'object:two-room-door' && door.open)) {
tests/browser/vtt-handoff/runtime-parity.spec.ts:219:        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/runtime-parity.spec.ts:226:        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:237:        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
tests/browser/vtt-handoff/runtime-parity.spec.ts:253:          if (!event.data.tokens.some((candidate) => candidate.id === 'token:two-room-goblin' && candidate.x === 7)) return;
tests/browser/vtt-handoff/runtime-parity.spec.ts:260:        params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
tests/browser/vtt-handoff/runtime-parity.spec.ts:262:      const playerMoved = (await playerMovementEvent).data.tokens.find((candidate) => candidate.id === 'token:two-room-goblin');
tests/browser/vtt-handoff/runtime-parity.spec.ts:268:        params: { requestedRole: 'player', playerId: 'combatant:two-room-adventurer' },
tests/browser/vtt-handoff/runtime-parity.spec.ts:277:        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/runtime-parity.spec.ts:324:        { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:325:        { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:332:      expect.objectContaining({ id: 'object:two-room-door', open: true }),
tests/browser/vtt-handoff/runtime-parity.spec.ts:338:      expect.objectContaining({ id: 'token:two-room-goblin', x: 8, y: 4, z: 0 }),
tests/browser/vtt-handoff/runtime-parity.spec.ts:341:    expect(websocket.playerMoved).toMatchObject({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 });
tests/browser/sharing.spec.ts:49:    reference_text: `${name} reference.`,
tests/browser/vtt-encounter.spec.ts:31:  await page.goto('/vtt?encounter=d365');
tests/browser/vtt-encounter.spec.ts:173:test('M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow', async ({
tests/browser/vtt-encounter.spec.ts:177:  await page.goto('/vtt?encounter=reference&view=player&session=increment-6-browser');
tests/browser/vtt-encounter.spec.ts:237:  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
tests/browser/vtt-encounter.spec.ts:238:  await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
tests/browser/vtt-encounter.spec.ts:242:  await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
tests/browser/vtt-accessible-board.spec.ts:5:  await page.goto('/vtt?encounter=reference&view=player&session=accessible-board-browser');

exec
/bin/bash -lc "rg -n \"fog|conceal|visibility|visible|hidden-from-players|data-cell\" tests/browser --glob '*.spec.ts'
sed -n '1,160p' tests/browser/vtt-accessible-board.spec.ts
sed -n '1,170p' tests/browser/vtt-option-paths.spec.ts
sed -n '1,170p' tests/browser/vane-warren-entry.spec.ts
sed -n '1,180p' tests/browser/vtt-handoff/worker.spec.ts
sed -n '1,380p' tests/browser/vtt-handoff/runtime-parity.spec.ts
sed -n '1,140p' tests/browser/vtt-handoff/top-down-smoke.spec.ts
sed -n '1,100p' tests/browser/vtt-long-rest.spec.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
tests/browser/agent-reference.spec.ts:253:        visibility: computed.visibility,
tests/browser/agent-reference.spec.ts:262:    expect(style.visibility).toBe('visible');
tests/browser/guided-builder.spec.ts:385:test('Elf Wizard skills finish top to bottom and spell choices stay labelled and visible', async ({
tests/browser/guided-builder.spec.ts:483:  test('touch taps every visible multiclass spell result in sequence', async ({
tests/browser/bundled-homebrew-import.spec.ts:330:test('Veteran v3 sheet values and the v2-to-v3 replacement review are visible', async ({
tests/browser/vtt-board.spec.ts:76:test('manual peers converge token moves, dice rolls, and role-dependent fog', async ({
tests/browser/vtt-board.spec.ts:115:    await expect(player.getByRole('button', { name: 'Paint fog' })).toBeHidden();
tests/browser/vtt-board.spec.ts:173:    await dm.getByRole('button', { name: 'Paint fog' }).click();
tests/browser/vtt-board.spec.ts:176:      'data-fog-count',
tests/browser/library-import-remedy.spec.ts:120:      visibility: 'listed',
tests/browser/browser-support.spec.ts:298:test('BROWSER-PROBE-PROCEED-ANYWAY: keyboard proceed starts the app and leaves the notice visible', async ({
tests/browser/multiclass-primary-ability.spec.ts:57:test('the house-rule toggle unlocks the refused multiclass and remains visible on the sheet', async ({
tests/browser/character-sheet.spec.ts:40: * visible with their provenance stated and absent from the JSON.
tests/browser/character-sheet.spec.ts:343:  // projection — a flat row without a grant would be invisible to the sheet,
tests/browser/character-sheet.spec.ts:998:test('hostile spell text is visible inert and absent from sheet facts', async ({
tests/browser/character-sheet.spec.ts:1660:test('hostile backstory remains visible inert text', async ({ page }, testInfo) => {
tests/browser/character-sheet.spec.ts:1998:  // Both the armour name and the effect label are on the page, visible and
tests/browser/character-sheet.spec.ts:2011:  // visible text is the injection shape that rule exists to refuse, so the
tests/browser/character-sheet.spec.ts:2020:          style.visibility === 'hidden' ||
tests/browser/character-sheet.spec.ts:2164:test('an unattuned Cloak grants nothing while its state and Ring of Shell bonus stay visible', async ({
tests/browser/vtt-encounter.spec.ts:237:  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
tests/browser/vtt-encounter.spec.ts:238:  await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
tests/browser/vtt-encounter.spec.ts:241:  )).toHaveAttribute('data-hidden-from-players', 'true');
tests/browser/vtt-encounter.spec.ts:242:  await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
tests/browser/vtt-encounter.spec.ts:260:    'ADJUDICATED — visible consequence',
import { expect, test } from './fixtures/parallel-test';
import { readFile } from 'node:fs/promises';

test('DM and player toggle the screen-reader board and read creature rows by role', async ({ page }) => {
  await page.goto('/vtt?encounter=reference&view=player&session=accessible-board-browser');
  await expect(page.getByRole('heading', { name: 'Reference encounter' })).toBeVisible();

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open local DM window' }).click();
  const dm = await popup;
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible();
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute('data-state', 'connected');

  for (const boardPage of [dm, page]) {
    const toggle = boardPage.getByRole('button', { name: 'Screen-reader board', exact: true });
    await toggle.focus();
    await toggle.press('Enter');
    await expect(boardPage.locator('.accessible-board')).toBeVisible();
    await expect(boardPage.getByRole('row', { name: /Reference Fighter/u })).toContainText('(2,3)');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toBeFocused();
    await expect(boardPage.getByRole('button', { name: 'Export board as HTML', exact: true })).toBeVisible();
  }

  const pendingDownload = dm.waitForEvent('download');
  await dm.getByRole('button', { name: 'Export board as HTML', exact: true }).click();
  const download = await pendingDownload;
  expect(download.suggestedFilename()).toBe('board.html');
  expect(await download.failure()).toBeNull();
  const downloadPath = await download.path();
  if (downloadPath === null) throw new Error('Accessible board download has no local path.');
  const html = await readFile(downloadPath, 'utf8');
  expect(html).toContain('<!doctype html>');
  expect(html).toContain('data-creature-id="combatant:fighter"');

  await dm.reload();
  await expect(dm.locator('.accessible-board')).toBeVisible();
  await expect(dm.getByRole('row', { name: /Training Brute/u })).toContainText('(3,3)');
});
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface ImportedFixtureBundle {
  readonly bytes: string;
  readonly sessionId: string;
}

async function createFixtureBundleInBrowser(page: Page): Promise<ImportedFixtureBundle> {
  return page.evaluate(async () => {
    function record(value: unknown, label: string): Record<string, unknown> {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} is not an object.`);
      }
      return value as Record<string, unknown>;
    }
    function invoke(
      owner: Record<string, unknown>,
      name: string,
      args: readonly unknown[] = [],
    ): unknown {
      const fn = owner[name];
      if (typeof fn !== 'function') throw new TypeError(`${name} is not callable.`);
      return Reflect.apply(fn, owner, args);
    }
    async function loadModule(path: string): Promise<Record<string, unknown>> {
      return record(await import(/* @vite-ignore */ path), `module ${path}`);
    }
    const [fixtureModule, randomModule, sessionModule, valuesModule] = await Promise.all([
      loadModule('/tests/fixtures/vtt-option-path-encounter.ts'),
      loadModule('/src/combat/random.ts'),
      loadModule('/src/vtt/session-persistence.ts'),
      loadModule('/src/combat/values.ts'),
    ]);
    const state = record(
      invoke(fixtureModule, 'createOptionPathFixtureEncounter'),
      'option-path fixture encounter',
    );
    const combatants = state['combatants'];
    if (!Array.isArray(combatants)) throw new TypeError('Encounter combatants are absent.');
    const controllers = combatants.map((candidate) => {
      const profile = record(record(candidate, 'encounter combatant')['profile'], 'profile');
      if (typeof profile['id'] !== 'string') throw new TypeError('Controller profile id is absent.');
      return {
        combatantId: profile['id'],
        controllerId: `browser-fixture:${profile['id']}:human`,
        kind: 'human',
        generation: 0,
      };
    }).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
    const sessionId = invoke(valuesModule, 'encounterSessionId', ['d512-option-paths']);
    const branchId = invoke(valuesModule, 'encounterBranchId', ['branch:d512-option-paths']);
    const Store = sessionModule['MemoryBrowserSessionStore'];
    if (typeof Store !== 'function') throw new TypeError('MemoryBrowserSessionStore is absent.');
    const store: unknown = Reflect.construct(Store, []);
    const Mirror = sessionModule['MemoryMirrorSink'];
    if (typeof Mirror !== 'function') throw new TypeError('MemoryMirrorSink is absent.');
    const mirror: unknown = Reflect.construct(Mirror, []);
    const rng = invoke(randomModule, 'mulberry32', [0x0d51_2001]);
    const Journal = sessionModule['EncounterSessionJournal'];
    if (typeof Journal !== 'function') throw new TypeError('EncounterSessionJournal is absent.');
    const create = Reflect.get(Journal, 'create');
    if (typeof create !== 'function') throw new TypeError('EncounterSessionJournal.create is absent.');
    record(Reflect.apply(create, Journal, [{
      sessionId,
      branchId,
      encounterState: state,
      coordinatorState: {
        requestSequence: 1,
        pendingRequest: null,
        pendingCommand: null,
        continuation: { kind: 'idle' },
        pause: { kind: 'interrupted' },
      },
      controllers,
      rng,
      store,
      mirror,
    }]), 'created encounter journal');
    const bytes = invoke(sessionModule, 'exportSavedSession', [store, sessionId]);
    if (typeof bytes !== 'string' || typeof sessionId !== 'string') {
      throw new TypeError('Fixture session export is malformed.');
    }
    return { bytes, sessionId };
  });
}

async function mountImportedSession(page: Page, boardSnapshotMode: boolean): Promise<void> {
  await page.goto('/vtt?encounter=reference&view=dm&session=d512-bootstrap');
  const bundle = await createFixtureBundleInBrowser(page);
  const manager = page.locator('.dm-save-manager');
  const chooserPromise = page.waitForEvent('filechooser');
  await manager.getByRole('button', { name: 'Upload save file', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'd512-option-paths.vtt.json',
    mimeType: 'application/json',
    buffer: Buffer.from(bundle.bytes, 'utf8'),
  });
  const saveId = `browser:session:${bundle.sessionId}`;
  const row = manager.locator(`.dm-save-row[data-save-id=${JSON.stringify(saveId)}]`);
  await expect(row).toBeVisible();
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get('session') === bundle.sessionId),
    row.getByRole('button', { name: 'Load', exact: true }).click(),
  ]);
  if (boardSnapshotMode) {
    await page.goto(`/vtt?encounter=reference&view=dm&boardSnapshot=1&session=${bundle.sessionId}`);
  }
}

test('snapshot DM board captures at least two labeled engine movement options', async ({ page }, testInfo) => {
  await mountImportedSession(page, true);
  const board = page.locator('.encounter-board');
  await expect(board).toHaveAttribute('data-board-audience', 'dm');
  await expect.poll(async () => Number(await board.getAttribute('data-option-paths'))).toBeGreaterThanOrEqual(2);
  await expect(board.locator('.encounter-option-path')).toHaveCount(
    Number(await board.getAttribute('data-option-paths')),
  );
  await expect(board.locator('.encounter-option-polyline')).toHaveCount(
    Number(await board.getAttribute('data-option-paths')),
  );
  await expect(board.locator('.encounter-option-destination')).not.toHaveCount(0);
  await expect(board.locator('.encounter-option-opportunity-arrow')).not.toHaveCount(0);
  await expect(board.locator('.encounter-option-segment-hazard')).not.toHaveCount(0);
  await expect(board.locator('[data-option-path-legend="true"]')).toBeVisible();
  await board.screenshot({ path: testInfo.outputPath('d512-option-paths.png') });
});

test('human DM option paths are absent until the default-off toggle is enabled', async ({ page }) => {
  await mountImportedSession(page, false);
  const toggle = page.getByRole('checkbox', { name: 'Show engine movement options' });
  const board = page.locator('.encounter-board');
  await expect(toggle).not.toBeChecked();
  await expect(board).not.toHaveAttribute('data-option-paths', /.+/u);
  await toggle.check();
  await expect.poll(async () => Number(await board.getAttribute('data-option-paths'))).toBeGreaterThanOrEqual(2);
});
import { expect, test } from './fixtures/parallel-test';

test('a reset session mounts the first Vane Warren fight in a real browser', async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });
  await page.evaluate(async () => window.staticApp.reset());
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });

  await page.goto('/vtt?encounter=vane-warren');
  await page.getByRole('button', { name: 'Start the Vane Warren', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 65_000,
  });
  await expect(page.locator('.adventuring-day-status')).toHaveAttribute('data-room', '1');
  await expect(page.locator('.adventuring-day-status')).toContainText(
    'The Vane Warren — encounter 1 of 3',
  );
});
import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import type {} from '../../../src/vtt/handoff/worker-harness';

test('drives the v1 handoff across an actual module Worker', async ({ page }, testInfo) => {
  const workerUrls: string[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('request', (request) => {
    if (request.resourceType() === 'script' && /worker-entry/u.test(request.url())) workerUrls.push(request.url());
  });
  await page.goto('/vtt-handoff');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForFunction(() => window.__VTT_HANDOFF_HARNESS__ !== undefined);
  expect(pageErrors).toEqual([]);
  const state = page.getByTestId('handoff-state');
  await expect(state).toHaveAttribute('data-status', 'open');

  const initial = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  });
  expect(initial.lastResponse).toMatchObject({ v: 1, id: '', ok: true });
  expect(initial.eventSequences.length).toBeGreaterThan(1);
  expect(initial.eventSequences).toEqual(initial.eventSequences.map((_sequence, index) => index + 1));
  expect(initial.eventRevisions[0]).toBe(0);
  expect(initial.eventRevisions.at(-1)).toBeGreaterThan(0);
  expect(initial.snapshot?.revision).toBe(initial.eventRevisions.at(-1));
  expect(initial.playerSnapshot?.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
  expect(workerUrls).toHaveLength(1);

  const playerBoundary = await page.evaluate(async () => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    const forbidden = await api.playerRequest({
      v: 1, id: 'player-cross-seat', method: 'token.move',
      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
    });
    const moved = await api.playerRequest({
      v: 1, id: 'player-move', method: 'token.move',
      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
    });
    return { forbidden, moved, playerSnapshot: api.state().playerSnapshot };
  });
  expect(playerBoundary.forbidden).toMatchObject({
    id: 'player-cross-seat', ok: false, error: { code: 'FORBIDDEN' },
  });
  expect(playerBoundary.moved).toMatchObject({ id: 'player-move', ok: true });
  expect(playerBoundary.playerSnapshot?.tokens).toEqual([
    expect.objectContaining({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 }),
  ]);

  const correlated = await page.evaluate(async () => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return Promise.all([
      api.request({ v: 1, id: 'snapshot:a', method: 'scene.snapshot', params: {} }),
      api.request({ v: 1, id: 'snapshot:b', method: 'scene.snapshot', params: {} }),
    ]);
  });
  expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
  expect(correlated.every((response) => response.ok)).toBe(true);

  const invalid = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.request({ v: 1, id: 'invalid-door', method: 'door.set', params: { doorId: 42, open: true } });
  });
  expect(invalid).toMatchObject({ id: 'invalid-door', ok: false, error: { code: 'INVALID_REQUEST' } });
  await expect(page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.malformed();
  })).resolves.toBe('INVALID_JSON');

  const beforeMutation = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  });
  const mutation = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.request({
      v: 1, id: 'door:once', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
  });
  expect(mutation).toMatchObject({ id: 'door:once', ok: true });
  if (!mutation.ok || typeof mutation.result.revision !== 'number') throw new Error('Expected a mutation revision.');
  const afterMutation = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  });
  expect(afterMutation.eventSequences).toHaveLength(beforeMutation.eventSequences.length + 1);
  expect(afterMutation.eventRevisions.at(-1)).toBe(mutation.result.revision);
  expect(afterMutation.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);

  const duplicate = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.request({
      v: 1, id: 'door:once', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: false },
    });
  });
  expect(duplicate).toMatchObject({ id: 'door:once', ok: false, error: { code: 'DUPLICATE_MUTATION' } });
  expect((await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  })).eventSequences).toEqual(afterMutation.eventSequences);

  const reconnected = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.reconnect();
  });
  expect(reconnected.generation).toBe(2);
  expect(reconnected.eventSequences.length).toBeGreaterThan(1);
  expect(reconnected.eventSequences).toEqual(reconnected.eventSequences.map((_sequence, index) => index + 1));
  expect(reconnected.eventRevisions[0]).toBe(0);
  expect(reconnected.eventRevisions.at(-1)).toBeGreaterThan(0);
  expect(reconnected.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(false);
  expect(workerUrls).toHaveLength(2);

  for (const lifecycle of ['close', 'dispose', 'destroySession'] as const) {
    const outcome = await page.evaluate(async (kind) => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
      const request = {
        v: 1,
        get id(): string {
          if (kind === 'close') api.close();
          else if (kind === 'dispose') api.dispose();
          else api.destroySession();
          return `getter-${kind}`;
        },
        method: 'scene.snapshot', params: {},
      };
      try {
        await api.request(request);
        return 'unexpected-success';
      } catch (error: unknown) {
        return error instanceof Error ? `${error.name}:${Reflect.get(error, 'code') as string}` : 'non-error';
      }
    }, lifecycle);
    expect(outcome).toBe('SceneTransportClosedError:TRANSPORT_CLOSED');
    const lifecycleState = await page.evaluate(() => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
      return api.state();
    });
    expect(lifecycleState.lastResponse?.id).not.toBe(`getter-${lifecycle}`);
    await page.evaluate(async () => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
      await api.reconnect();
    });
  }

  await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    api.dispose();
  });
  await expect(state).toHaveAttribute('data-status', 'disposed');
  const artifact = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state().artifact;
  });
  const expectedArtifact = process.env.VTT_HANDOFF_ARTIFACT;
  expect(artifact.artifact).toBe(expectedArtifact);
  if (expectedArtifact === 'dev') {
    expect(artifact).toEqual({ artifact: 'dev' });
  } else {
    expect(artifact.artifact).not.toBe('dev');
import { expect, test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import { WebSocketServer } from 'ws';
import type {} from '../../../src/vtt/handoff/worker-harness';
import { TRANSPORT_CONFORMANCE_SCENARIO_NAMES } from '../../helpers/vtt-handoff/transport-conformance-manifest';
import { vttHandoffBrowserOrigin } from './browser-origin';

test('pairs the real Worker and browser WebSocket transport on the fixed two-room scene', async ({ page }, testInfo) => {
  const browserOrigin = vttHandoffBrowserOrigin(Number(process.env.PLAYWRIGHT_PORT));
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-browser-runtime-parity-'));
  const token = 'browser-runtime-parity-secret';
  const playerToken = 'browser-runtime-parity-player-secret';
  const tokensFile = resolve(root, 'tokens.json');
  writeFileSync(tokensFile, JSON.stringify([
    { tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm' },
    {
      tokenSha256: createHash('sha256').update(playerToken).digest('hex'),
      role: 'player', playerId: 'combatant:two-room-goblin',
    },
  ]), { mode: 0o600 });
  chmodSync(tokensFile, 0o600);
  const viteConfig = resolve('/tmp', 'vtt-runtime-playwright-' + String(process.pid) + '.config.mjs');
  writeFileSync(viteConfig, 'export default {};\n', { mode: 0o600 });
  const runtime = spawn(process.execPath, [
    resolve('node_modules/vite-node/vite-node.mjs'),
    '--config', viteConfig, 'tools/vtt-handoff/node-runtime-main.ts', '--port', '0', '--origin', browserOrigin,
  ], {
    cwd: process.cwd(), env: { ...process.env, VTT_RUNTIME_TOKENS_FILE: tokensFile }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let runtimeOutput = '';
  let runtimeErrors = '';
  runtime.stdout.on('data', (chunk: Buffer) => { runtimeOutput += chunk.toString(); });
  runtime.stderr.on('data', (chunk: Buffer) => { runtimeErrors += chunk.toString(); });
  const websocketUrl = await new Promise<string>((resolveUrl, reject) => {
    const inspect = (): void => {
      const match = /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(runtimeOutput);
      if (match?.[1] !== undefined) resolveUrl(match[1]);
    };
    runtime.stdout.on('data', inspect);
    runtime.once('exit', (code) => reject(new Error('Runtime exited ' + String(code) + ': ' + runtimeErrors)));
    runtime.once('error', reject);
  });
  const malformedServer = new WebSocketServer({
    host: '127.0.0.1', port: 0,
    handleProtocols: (protocols) => protocols.has('vtt.v1') ? 'vtt.v1' : false,
  });
  await new Promise<void>((resolveListening, reject) => {
    malformedServer.once('listening', resolveListening);
    malformedServer.once('error', reject);
  });
  const malformedPort = (malformedServer.address() as AddressInfo).port;
  const malformedClose = new Promise<number>((resolveClose) => {
    malformedServer.on('connection', (socket) => {
      socket.once('close', (code) => resolveClose(code));
      socket.send('{');
    });
  });
  const nodePort = Number(new URL(websocketUrl).port);
  try {
    await page.goto('/vtt-handoff');
    await expect(page.getByTestId('handoff-state')).toHaveAttribute('data-status', 'open');
    const worker = await page.evaluate(() => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The Worker harness is unavailable.');
      return api.state();
    });
    expect(worker.artifact).toEqual({ artifact: 'dev' });
    expect(worker.snapshot?.tokens.map(({ id, x, y, z }) => ({ id, x, y, z }))).toEqual([
      { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
      { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
    ]);
    const workerDoor = await page.evaluate(async () => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The Worker harness is unavailable.');
      const response = await api.request({
        v: 1, id: 'parity:worker-door', method: 'door.set',
        params: { doorId: 'object:two-room-door', open: true },
      });
      return { response, state: api.state() };
    });
    expect(workerDoor.response).toMatchObject({ id: 'parity:worker-door', ok: true });
    expect(workerDoor.state.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
    expect(workerDoor.state.eventSequences).toEqual(
      workerDoor.state.eventSequences.map((_sequence, index) => index + 1),
    );
    const workerControls = await page.evaluate(async () => {
      const api = window.__VTT_HANDOFF_HARNESS__;
      if (api === undefined) throw new Error('The Worker harness is unavailable.');
      const correlated = await Promise.all(['a', 'b'].map((suffix) => api.request({
        v: 1, id: 'worker:snapshot:' + suffix, method: 'scene.snapshot', params: {},
      })));
      const invalid = await api.request({
        v: 1, id: 'worker:invalid', method: 'door.set', params: { doorId: 42, open: true },
      });
      const unsupported = await api.request({
        v: 1, id: 'worker:light', method: 'light.set',
        params: { lightId: 'object:two-room-torch', enabled: false },
      });
      interface DirectWorkerTransport {
        request(request: unknown): Promise<unknown>;
        dispose(): void;
      }
      const workerModulePath = '/src/vtt/handoff/worker-transport.ts';
      const loaded = await import(/* @vite-ignore */ workerModulePath) as unknown;
      const createTransport = Reflect.get(loaded as object, 'createHandoffWorkerTransport') as () => DirectWorkerTransport;
      const mismatchTransport = createTransport();
      const mismatch = await mismatchTransport.request({
        v: 1, id: 'worker:mismatch', method: 'session.open',
        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
      });
      mismatchTransport.dispose();
      const duplicate = await api.request({
        v: 1, id: 'parity:worker-door', method: 'door.set',
        params: { doorId: 'object:two-room-door', open: false },
      });
      const malformed = await api.malformed();
      const reconnected = await api.reconnect();
      return { correlated, invalid, unsupported, mismatch, duplicate, malformed, reconnected };
    });
    expect(workerControls.correlated.map((response) => response.id)).toEqual([
      'worker:snapshot:a', 'worker:snapshot:b',
    ]);
    expect(workerControls.invalid).toMatchObject({ ok: false, error: { code: 'INVALID_REQUEST' } });
    expect(workerControls.unsupported).toMatchObject({ ok: false, error: { code: 'UNSUPPORTED' } });
    expect(workerControls.mismatch).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(workerControls.duplicate).toMatchObject({ ok: false, error: { code: 'DUPLICATE_MUTATION' } });
    expect(workerControls.malformed).toBe('INVALID_JSON');
    expect(workerControls.reconnected).toMatchObject({
      generation: 2,
      snapshot: {
        tokens: [
          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
        ],
        doors: expect.arrayContaining([expect.objectContaining({ id: 'object:two-room-door', open: false })]),
      },
    });
    expect(workerControls.reconnected.eventSequences[0]).toBe(1);
    expect(workerControls.reconnected.eventSequences).toEqual(
      workerControls.reconnected.eventSequences.map((_sequence, index) => index + 1),
    );

    const badHandshake = await page.evaluate(async ({ url }) => new Promise<number>((resolveClose) => {
      const socket = new WebSocket(url, ['vtt.v1', 'bearer.invalid']);
      socket.addEventListener('close', (event) => resolveClose(event.code), { once: true });
      socket.addEventListener('error', () => undefined, { once: true });
    }), { url: websocketUrl });
    expect(badHandshake).toBe(1006);

    const websocket = await page.evaluate(async ({ url, bearer, playerBearer, badUrl }) => {
      const closeCodes: Array<number | undefined> = [];
      let throwAfterClose = false;
      const NativeWebSocket = WebSocket;
      class TrackingWebSocket extends NativeWebSocket {
        override close(code?: number, reason?: string): void {
          closeCodes.push(code);
          super.close(code, reason);
          if (throwAfterClose) {
            throwAfterClose = false;
            throw new DOMException('Injected close failure.', 'InvalidStateError');
          }
        }
      }
      globalThis.WebSocket = TrackingWebSocket;
      interface Response {
        readonly id: string;
        readonly ok: boolean;
        readonly result?: Readonly<Record<string, unknown>>;
        readonly error?: { readonly code: string };
      }
      interface Event {
        readonly event: 'scene.snapshot';
        readonly seq: number;
        readonly data: {
          readonly revision: number;
          readonly tokens: readonly { readonly id: string; readonly x: number; readonly y: number; readonly z: number }[];
          readonly doors: readonly { readonly id: string; readonly open: boolean }[];
        };
      }
      interface BrowserTransport {
        request(request: unknown): Promise<Response>;
        initialSnapshot(): Promise<Event['data']>;
        subscribe(listener: (event: Event) => void): () => void;
        subscribeErrors(listener: (error: { readonly fault: { readonly code: string } }) => void): () => void;
        status(): string;
        close(): void;
        pendingRequestCount(): number;
        negotiatedProtocol(): string;
        endpointUrl(): string;
      }
      const modulePath = '/src/vtt/handoff/websocket-transport.ts';
      const loaded = await import(/* @vite-ignore */ modulePath) as unknown;
      const Constructor = Reflect.get(loaded as object, 'WebSocketSceneTransport') as
        new (endpoint: string, token: string) => BrowserTransport;
      const transport = new Constructor(url, bearer);
      const events: Event[] = [];
      transport.subscribe((event) => events.push(event));
      const open = await transport.request({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } });
      const initial = await transport.initialSnapshot();
      const correlated = await Promise.all(['a', 'b'].map((suffix) =>
        transport.request({ v: 1, id: 'snapshot:' + suffix, method: 'scene.snapshot', params: {} })));
      const unsupported = await transport.request({
        v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
      });
      const doorEvent = new Promise<Event>((resolveEvent) => {
        const stop = transport.subscribe((event) => {
          if (event.data.doors.some((door) => door.id === 'object:two-room-door' && door.open)) {
            stop();
            resolveEvent(event);
          }
        });
      });
      const door = await transport.request({
        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
      });
      const changed = await doorEvent;
      const late: Event[] = [];
      const stopLate = transport.subscribe((event) => late.push(event));
      stopLate();
      const duplicate = await transport.request({
        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
      });
      const protocol = transport.negotiatedProtocol();
      const endpoint = transport.endpointUrl();
      transport.close();

      const player = new Constructor(url, playerBearer);
      const playerEvents: Event[] = [];
      player.subscribe((event) => playerEvents.push(event));
      const playerOpen = await player.request({
        v: 1, id: 'player:open', method: 'session.open',
        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
      });
      const playerInitial = await player.initialSnapshot();
      if (!playerEvents.some((event) => event.data.revision >= 2)) {
        await new Promise<void>((resolveReady, reject) => {
          const deadline = setTimeout(() => { stop(); reject(new Error('Browser player offer timed out.')); }, 2_000);
          const stop = player.subscribe((event) => {
            if (event.data.revision < 2) return;
            clearTimeout(deadline);
            stop();
            resolveReady();
          });
        });
      }
      const playerMovementEvent = new Promise<Event>((resolveMove) => {
        const stop = player.subscribe((event) => {
          if (!event.data.tokens.some((candidate) => candidate.id === 'token:two-room-goblin' && candidate.x === 7)) return;
          stop();
          resolveMove(event);
        });
      });
      const playerMove = await player.request({
        v: 1, id: 'player:move', method: 'token.move',
        params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
      });
      const playerMoved = (await playerMovementEvent).data.tokens.find((candidate) => candidate.id === 'token:two-room-goblin');
      player.close();

      const mismatch = new Constructor(url, playerBearer);
      const playerMismatch = await mismatch.request({
        v: 1, id: 'player:mismatch', method: 'session.open',
        params: { requestedRole: 'player', playerId: 'combatant:two-room-adventurer' },
      });

      const reconnect = new Constructor(url, bearer);
      const reconnectOpen = await reconnect.request({
        v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' },
      });
      const reconnectSnapshot = await reconnect.initialSnapshot();
      const freshLedger = await reconnect.request({
        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
      });
      reconnect.close();

      const malformed = new Constructor(badUrl, bearer);
      const malformedResult = await new Promise<{ readonly fault: string; readonly state: string; readonly resubmission: string }>(
        (resolveFault) => {
          malformed.subscribeErrors((error) => {
            const state = malformed.status();
            void malformed.request({
              v: 1, id: 'after-fault', method: 'session.open', params: { requestedRole: 'dm' },
            }).then(
              () => resolveFault({ fault: error.fault.code, state, resubmission: 'resolved' }),
              (reason: unknown) => resolveFault({
                fault: error.fault.code,
                state,
                resubmission: reason instanceof Error ? reason.name : 'non-error',
              }),
            );
          });
        },
      );
      throwAfterClose = true;
      const throwingMalformed = new Constructor(badUrl, bearer);
      const throwingCloseState = await new Promise<string>((resolveFault) => {
        throwingMalformed.subscribeErrors(() => resolveFault(throwingMalformed.status()));
      });
      return {
        protocol, endpoint, open, initial, correlated, unsupported, door, changed, duplicate,
        sequences: events.map((event) => event.seq), lateCount: late.length,
        pending: transport.pendingRequestCount(), malformedResult, closeCodes, throwingCloseState,
        playerOpen, playerInitial, playerMove, playerMoved, playerMismatch,
        reconnectOpen, reconnectSnapshot, freshLedger,
      };
    }, {
      url: websocketUrl,
      bearer: token,
      playerBearer: playerToken,
      badUrl: 'ws://127.0.0.1:' + String(malformedPort),
    });

    expect(websocket.protocol).toBe('vtt.v1');
    expect(websocket.endpoint).not.toContain(token);
    expect(websocket.open).toMatchObject({ v: 1, id: '', ok: true });
    expect(websocket.initial).toMatchObject({
      revision: 0,
      tokens: [
        { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
        { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
      ],
    });
    expect(websocket.correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
    expect(websocket.unsupported).toMatchObject({ id: 'light', ok: false, error: { code: 'UNSUPPORTED' } });
    expect(websocket.door).toMatchObject({ id: 'door', ok: true });
    expect(websocket.changed).toMatchObject({ event: 'scene.snapshot', data: { doors: expect.arrayContaining([
      expect.objectContaining({ id: 'object:two-room-door', open: true }),
    ]) } });
    expect(websocket.door.result?.revision).toBe(websocket.changed.data.revision);
    expect(websocket.duplicate).toMatchObject({ id: 'door', ok: false, error: { code: 'DUPLICATE_REQUEST_ID' } });
    expect(websocket.playerOpen).toMatchObject({ id: 'player:open', ok: true });
    expect(websocket.playerInitial.tokens).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'token:two-room-goblin', x: 8, y: 4, z: 0 }),
    ]));
    expect(websocket.playerMove).toMatchObject({ id: 'player:move', ok: true });
    expect(websocket.playerMoved).toMatchObject({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 });
    expect(websocket.playerMismatch).toMatchObject({ id: 'player:mismatch', ok: false, error: { code: 'UNAUTHORIZED' } });
    expect(websocket.reconnectOpen).toMatchObject({ id: '', ok: true });
    expect(websocket.reconnectSnapshot).toMatchObject({ revision: 0 });
    expect(websocket.freshLedger).toMatchObject({ id: 'door', ok: true });
    expect(websocket.sequences).toEqual(websocket.sequences.map((_sequence, index) => index + 1));
    expect(websocket.lateCount).toBe(1);
    expect(websocket.pending).toBe(0);
    expect(websocket.closeCodes).toEqual([1000, 1000, 1000, 4000, 4000]);
    expect(websocket.throwingCloseState).toBe('closed');
    expect(websocket.malformedResult).toEqual({
      fault: 'PROTOCOL_ERROR', state: 'closed', resubmission: 'SceneTransportClosedError',
    });
    await expect(malformedClose).resolves.toBe(4000);
    await testInfo.attach('vtt-runtime-parity', {
      body: JSON.stringify({
        artifact: 'dev', seed: 603_020_001, clock: '2026-09-09T12:00:00.000Z',
        nodePort, browserOrigin,
        scenarios: TRANSPORT_CONFORMANCE_SCENARIO_NAMES.length,
      }),
      contentType: 'application/json',
    });
    expect((runtimeOutput + '\n' + runtimeErrors)).not.toContain(token);
  } finally {
    await new Promise<void>((resolveClose, reject) => malformedServer.close((error) =>
      error === undefined ? resolveClose() : reject(error)));
    if (runtime.exitCode === null && runtime.signalCode === null) {
      const exited = new Promise<void>((resolveExit) => runtime.once('exit', () => resolveExit()));
      runtime.kill('SIGTERM');
      await exited;
    }
    rmSync(viteConfig, { force: true });
    rmSync(root, { recursive: true, force: true });
  }
});
import { expect, test } from '@playwright/test';

test('classic top-down UI commits a revision-bound offered move in process', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.waitForFunction(() => document.querySelector('#status')?.getAttribute('data-ready') === 'true');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => window.staticApp.reset());
  await page.goto('/vtt?encounter=d365');
  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible();
  await page.getByRole('button', { name: 'Load bundled dungeon and party' }).click();
  await page.waitForFunction(() => document.querySelector('.dm-encounter') !== null);
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible();

  const shell = page.locator('.dm-encounter');
  const offeredMoves = page.locator(
    '.dm-pending-request button[data-offered-action-id][data-destination-column][data-destination-row]',
  );
  await expect(offeredMoves.first()).toBeEnabled();
  const moveIndex = await offeredMoves.evaluateAll((buttons) => buttons.findIndex((button) => {
    if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
    return button.dataset.destinationColumn !== button.dataset.anchorColumn ||
      button.dataset.destinationRow !== button.dataset.anchorRow;
  }));
  expect(moveIndex).toBeGreaterThanOrEqual(0);
  const move = offeredMoves.nth(moveIndex);
  const offer = await move.evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) throw new Error('Offered move is not a button.');
    const read = (name: string): string => {
      const value = button.dataset[name];
      if (value === undefined) throw new Error(`Missing offered-move ${name}.`);
      return value;
    };
    return {
      actorId: read('actorId'),
      offeredActionId: read('offeredActionId'),
      revision: Number(read('encounterRevision')),
      anchor: [Number(read('anchorColumn')), Number(read('anchorRow'))],
      destination: [Number(read('destinationColumn')), Number(read('destinationRow'))],
    };
  });
  expect(offer.offeredActionId).toMatch(/^turn:.+:option:\d+$/u);
  expect(offer.destination).not.toEqual(offer.anchor);
  await expect(page.locator('[data-offered-action-id="not-an-engine-offer"]')).toHaveCount(0);

  await move.click();
  await expect.poll(async () => Number(await shell.getAttribute('data-session-revision')))
    .toBeGreaterThan(offer.revision);
  const movedToken = page.locator(`.encounter-token[data-combatant-id="${offer.actorId}"]`);
  await expect(movedToken).toHaveAttribute('data-column', String(offer.destination[0]));
  await expect(movedToken).toHaveAttribute('data-row', String(offer.destination[1]));

  const record = `artifact=dev page=${page.url()} offered=${offer.offeredActionId} ` +
    `destination=${offer.destination.join(',')}`;
  await testInfo.attach('vtt-top-down-artifact', { body: record, contentType: 'text/plain' });
  console.log(record);
});
import { expect, test } from './fixtures/parallel-test';

test('DM Long Rest ends the adventuring day and logs a cited autosaved summary', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/vtt?encounter=d365');
  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible({
    timeout: 65_000,
  });
  await page.getByRole('button', { name: 'Load bundled dungeon and party' }).click();
  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 65_000,
  });

  await page.getByRole('button', { name: 'Complete Long Rest and end adventuring day' }).click();

  await expect(page.locator('.adventuring-day-status')).toHaveAttribute(
    'data-status',
    'ended_by_long_rest',
  );
  await expect(page.locator('.adventuring-day-status')).toContainText(
    'Adventuring day ended by Long Rest',
  );
  const card = page.locator('.long-rest-summary-card');
  await expect(card.getByRole('heading', { name: 'Long Rest completed — 8 hours' })).toBeVisible();
  // D385 adds Tamsin Quill to the representative party, making five members.
  await expect(card.locator('li')).toHaveCount(5);
  await expect(card.locator('.long-rest-citations')).toContainText(
    'docs/srd/full/srd-5.2.1.txt:11901-11913',
  );
  await expect(card.locator('.long-rest-citations')).toContainText(
    'docs/srd/full/srd-5.2.1.txt:11915-11917',
  );
  await expect(card).toContainText('Interruption handling is deferred.');
  await expect(page.getByRole('button', { name: 'End room and enter next room' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Short Rest before next room' })).toHaveCount(0);
  const browserSaves = page.locator('.dm-save-row[data-source="browser"]');
  const browserPoolLabels = browserSaves.locator('.dm-save-pool');
  const perRoundSaves = browserSaves.filter({
    has: page.locator('.dm-save-pool').filter({ hasText: /^Per-round autosave$/u }),
  });
  const encounterBoundarySaves = browserSaves.filter({
    has: page.locator('.dm-save-pool').filter({ hasText: /^Encounter-boundary autosave$/u }),
  });
  await expect(browserSaves).toHaveCount(3);
  await expect(browserPoolLabels).toHaveText([
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
    /^(?:Per-round autosave|Encounter-boundary autosave)$/u,
  ]);
  await expect(perRoundSaves).toHaveCount(1);
  await expect(encounterBoundarySaves).toHaveCount(2);

  await page.getByText('Full revision history').click();
  await expect(page.getByText(/long_rest_completed/u)).toBeVisible();
});

exec
/bin/bash -lc "sed -n '1,340p' tools/ai-dm-blind-board-snapshot-check.ts
sed -n '180,250p' tools/ai-dm-board-snapshot.ts
sed -n '860,950p' tools/ai-dm-board-snapshot.ts
sed -n '450,510p' src/vtt/encounter-projections.ts
sed -n '2240,2330p' src/vtt/encounter-app.ts
rg -n \"function boardStateDigest|export function boardStateDigest|boardStateDigest\" src tools | head -80
rg -n \"foggedCells|legacy fog|fogged\" src/vtt/session-persistence.ts src/vtt -g '*.ts' | head -160" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Browser } from '@playwright/test';
import type { EncounterState } from '../src/combat/encounter';
import { terrainWallCells } from '../src/combat/terrain';
import { projectDmView } from '../src/combat/visibility';
import { projectEncounterBoard, projectEncounterTerrainCells } from '../src/vtt/encounter-board';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import {
  BLIND_STATE_PRIMER_VERSION,
  BOARD_SNAPSHOT_IMAGE_ROLES,
  BoardSnapshotService,
  boardSnapshotVisualDescriptor,
  boardStateDigest,
  type BoardImageArtifact,
  type BoardImageSource,
  type BoardSnapshotImageRole,
} from './ai-dm-board-snapshot';

function sourceFor(state: EncounterState): BoardImageSource {
  return {
    room: 1,
    round: state.round,
    revision: state.revision,
    stateDigest: boardStateDigest(state),
  };
}

function requireCondition(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function inspectBlindBoardSnapshotFamily(
  state: EncounterState,
  artifacts: readonly BoardImageArtifact[],
): void {
  requireCondition(artifacts.length === BOARD_SNAPSHOT_IMAGE_ROLES.length, 'Image family omitted a role.');
  requireCondition(new Set(artifacts.map((artifact) => artifact.sha256)).size === artifacts.length,
    'Independent image roles unexpectedly produced identical PNGs.');
  for (const [index, artifact] of artifacts.entries()) {
    const blind = artifact.blindState;
    requireCondition(blind !== undefined, 'State-only artifact omitted blind metadata.');
    if (blind === undefined) continue;
    requireCondition(blind.role === BOARD_SNAPSHOT_IMAGE_ROLES[index], 'Image role order changed.');
    requireCondition(blind.ordinal === index + 1, 'Image ordinal does not match delivery order.');
    requireCondition(blind.primerVersion === BLIND_STATE_PRIMER_VERSION, 'Primer version changed.');
    requireCondition(blind.glyphMode === 'full', 'State-only visual lost full glyphs.');
    requireCondition(blind.captureTilePx === 128, 'State-only visual lost its 128-pixel scale.');
    requireCondition(artifact.source.stateDigest === boardStateDigest(state), 'Image digest binding changed.');
    requireCondition(artifact.source.revision === state.revision, 'Image revision binding changed.');
    requireCondition(blind.domEvidence.optionSurfaceAbsent, 'Image contains an option surface.');
    requireCondition(blind.domEvidence.nextEventPreviewAbsent, 'Image contains a next-event preview.');
    requireCondition(artifact.bytes > 0 && artifact.bytes <= 1_000_000, 'Image violates its byte cap.');
    requireCondition(JSON.stringify(boardSnapshotVisualDescriptor(artifact)).includes(blind.role),
      'Neutral visual descriptor omitted its role.');
  }

  const dm = artifacts[0]?.blindState?.domEvidence;
  if (dm === undefined) throw new Error('DM image omitted DOM evidence.');
  const board = projectEncounterBoard(projectDmView(state));
  const creatureCount = board.combatants.filter(
    (combatant) => combatant.placementStatus === 'placed',
  ).length;
  requireCondition(dm.coordinateLabels === 2 * (state.bounds.columns + state.bounds.rows),
    'DM image omitted coordinate gutters.');
  requireCondition(dm.creatureBadges === creatureCount, 'DM image badge count differs from state.');
  requireCondition(dm.rosterEntries === creatureCount, 'DM image roster differs from state.');
  requireCondition(dm.hpBars === creatureCount, 'DM image HP bars differ from state.');
  requireCondition(dm.legendEntries > 0, 'DM image omitted its legend.');
  const wallCells = terrainWallCells(state).length;
  const projectedTerrain = projectEncounterTerrainCells(state.bounds, state);
  const halfCoverCells = projectedTerrain.filter((cell) => cell.kind === 'half_cover').length;
  const threeQuartersCoverCells = projectedTerrain.filter(
    (cell) => cell.kind === 'three_quarters_cover',
  ).length;
  requireCondition(
    dm.wallCells === wallCells,
    `DM image wall cells differ from state: DOM ${String(dm.wallCells)}, state ${String(wallCells)}.`,
  );
  requireCondition(
    dm.halfCoverCells === halfCoverCells,
    `DM image half-cover cells differ from state: DOM ${String(dm.halfCoverCells)}, state ${String(halfCoverCells)}.`,
  );
  requireCondition(
    dm.threeQuartersCoverCells === threeQuartersCoverCells,
    `DM image three-quarters-cover cells differ from state: DOM ${String(dm.threeQuartersCoverCells)}, state ${String(threeQuartersCoverCells)}.`,
  );
  requireCondition(
    dm.wallCells >= state.blockedCells.length,
    `DM image wall cell count ${String(dm.wallCells)} is smaller than blocked cell count ${String(state.blockedCells.length)}.`,
  );
  requireCondition(
    dm.difficultCells === state.environment.difficultTerrainRegions.reduce(
      (total, region) => total + region.cells.length,
      0,
    ),
    'DM image difficult terrain differs from state.',
  );
  requireCondition(
    dm.obscuredCells === state.environment.obscurementRegions.reduce(
      (total, region) => total + region.cells.length,
      0,
    ),
    'DM image obscurement differs from state.',
  );
  requireCondition(
    dm.illuminatedCells === state.environment.lightRegions.reduce(
      (total, region) => total + region.cells.length,
      0,
    ),
    'DM image light cells differ from state.',
  );
  requireCondition(dm.fogMarks === board.foggedCells.length, 'DM image fog differs from projection.');
  requireCondition(dm.objects >= state.worldObjects.length, 'DM image omitted world-object footprints.');
  requireCondition(dm.doors === state.worldObjects.filter((object) => object.kind === 'door').length,
    'DM image doors differ from state.');
  requireCondition(dm.hiddenMarks === board.combatants.filter(
    (combatant) => combatant.placementStatus === 'placed' && combatant.hiddenFromPlayers,
  ).length,
    'DM image hidden marks differ from state.');

  const accessible = artifacts[1]?.blindState?.domEvidence;
  if (accessible === undefined) throw new Error('Accessible raster omitted DOM evidence.');
  requireCondition(accessible.rosterEntries === 0 && accessible.coordinateLabels === 0,
    'Accessible raster unexpectedly used the graphical DM chrome.');

  const player = artifacts[2]?.blindState?.domEvidence;
  if (player === undefined) throw new Error('Player image omitted DOM evidence.');
  requireCondition(
    player.coordinateLabels === 0 && player.creatureBadges === 0 && player.rosterEntries === 0 &&
      player.hpBars === 0 && player.legendEntries === 0,
    'Player projection received DM-only chrome.',
  );
}

export const BLIND_BOARD_SNAPSHOT_FIXTURES = Object.freeze([
  {
    difficulty: 'hard',
    seed: 5_117_001,
    path: 'tests/fixtures/arena-basis-hard/seed-5117001.json',
  },
  {
    difficulty: 'brutal',
    seed: 6_203_001,
    path: 'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  },
] as const);

type BlindBoardSnapshotFixture = typeof BLIND_BOARD_SNAPSHOT_FIXTURES[number];

export interface BlindBrowserCheckResult {
  readonly outputDirectory: string;
  readonly manifestPath: string | null;
  readonly primerVersion: string;
  readonly captureTilePx: number;
  readonly results: readonly {
    readonly difficulty: BlindBoardSnapshotFixture['difficulty'];
    readonly seed: number;
    readonly revision: number;
    readonly stateDigest: string;
    readonly images: readonly {
      readonly role: 'dm_board' | 'accessible_board_raster' | 'player_board';
      readonly ordinal: number;
      readonly sha256: string;
      readonly bytes: number;
      readonly width: number;
      readonly height: number;
      readonly path: string;
    }[];
  }[];
}

export interface CapturedBlindBoardSnapshotFamily {
  readonly fixture: BlindBoardSnapshotFixture;
  readonly state: EncounterState;
  readonly source: BoardImageSource;
  readonly artifacts: readonly BoardImageArtifact[];
}

export interface PreparedBlindBoardSnapshotFixture {
  readonly fixture: BlindBoardSnapshotFixture;
  readonly state: EncounterState;
  readonly source: BoardImageSource;
}

export async function prepareBlindBoardSnapshotFixture(
  fixture: BlindBoardSnapshotFixture,
): Promise<PreparedBlindBoardSnapshotFixture> {
  const state = await loadArenaFixture(fixture.path);
  return { fixture, state, source: sourceFor(state) };
}

export async function capturePreparedBlindBoardSnapshotRoles(
  service: BoardSnapshotService,
  prepared: PreparedBlindBoardSnapshotFixture,
  roles: readonly BoardSnapshotImageRole[],
  firstOrdinal: number,
): Promise<readonly BoardImageArtifact[]> {
  return service.captureSynchronized({
    state: prepared.state,
    source: prepared.source,
    roles,
    firstOrdinal,
  });
}

export async function warmPreparedBlindBoardSnapshot(
  service: BoardSnapshotService,
  prepared: PreparedBlindBoardSnapshotFixture,
): Promise<void> {
  await service.warm({
    state: prepared.state,
    source: prepared.source,
    role: 'dm_board',
  });
}

export async function captureWarmedPreparedBlindBoardSnapshot(
  service: BoardSnapshotService,
  prepared: PreparedBlindBoardSnapshotFixture,
  role: BoardSnapshotImageRole,
  visualOrdinal: number,
): Promise<readonly BoardImageArtifact[]> {
  return [await service.captureWarmed({
    state: prepared.state,
    source: prepared.source,
    role,
  }, visualOrdinal)];
}

export function completeBlindBoardSnapshotFamily(
  prepared: PreparedBlindBoardSnapshotFixture,
  artifacts: readonly BoardImageArtifact[],
): CapturedBlindBoardSnapshotFamily {
  return { ...prepared, artifacts };
}

export async function captureBlindBoardSnapshotFixture(
  service: BoardSnapshotService,
  fixture: BlindBoardSnapshotFixture,
): Promise<CapturedBlindBoardSnapshotFamily> {
  const prepared = await prepareBlindBoardSnapshotFixture(fixture);
  const artifacts = await capturePreparedBlindBoardSnapshotRoles(
    service,
    prepared,
    BOARD_SNAPSHOT_IMAGE_ROLES,
    1,
  );
  return completeBlindBoardSnapshotFamily(prepared, artifacts);
}

export async function startInProcessBlindBoardSnapshotService(
  outputDirectory: string,
  browser: Browser,
): Promise<BoardSnapshotService> {
  return BoardSnapshotService.startInProcess({
    outputDirectory,
    informationMode: 'blind_state',
    boardGlyphs: 'full',
    captureTilePx: 128,
    primerVersion: BLIND_STATE_PRIMER_VERSION,
  }, browser);
}

export function inspectCapturedBlindBoardSnapshotFamily(
  family: CapturedBlindBoardSnapshotFamily,
): void {
  inspectBlindBoardSnapshotFamily(family.state, family.artifacts);
}

export function blindBoardSnapshotResult(
  outputDirectory: string,
  families: readonly CapturedBlindBoardSnapshotFamily[],
  manifestPath: string | null = null,
): BlindBrowserCheckResult {
  return {
    outputDirectory,
    manifestPath,
    primerVersion: BLIND_STATE_PRIMER_VERSION,
    captureTilePx: 128,
    results: families.map(({ fixture, source, artifacts }) => ({
      difficulty: fixture.difficulty,
      seed: fixture.seed,
      revision: source.revision,
      stateDigest: source.stateDigest,
      images: artifacts.map((artifact) => {
        const blind = artifact.blindState;
        if (blind === undefined) throw new Error('State-only artifact omitted blind metadata.');
        return {
          role: blind.role,
          ordinal: blind.ordinal,
          sha256: artifact.sha256,
          bytes: artifact.bytes,
          width: artifact.width,
          height: artifact.height,
          path: resolve(outputDirectory, artifact.relativePath),
        };
      }),
    })),
  };
}

export async function runBlindBoardSnapshotCheck(
  outputDirectory: string,
): Promise<BlindBrowserCheckResult> {
  const service = await BoardSnapshotService.start({
    outputDirectory,
    informationMode: 'blind_state',
    boardGlyphs: 'full',
    captureTilePx: 128,
    primerVersion: BLIND_STATE_PRIMER_VERSION,
  });

  try {
    const families: CapturedBlindBoardSnapshotFamily[] = [];
    for (const fixture of BLIND_BOARD_SNAPSHOT_FIXTURES) {
      const family = await captureBlindBoardSnapshotFixture(service, fixture);
      inspectBlindBoardSnapshotFamily(family.state, family.artifacts);
      families.push(family);
    }
    return blindBoardSnapshotResult(outputDirectory, families, service.manifestPath);
  } finally {
    await service.close();
  }
}

const entrypoint = process.argv[1];
const invokedByViteNode = entrypoint !== undefined && basename(entrypoint) === 'vite-node';
if (invokedByViteNode ||
  (entrypoint !== undefined && resolve(entrypoint) === fileURLToPath(import.meta.url))) {
  const outputArgument = process.argv[2];
  if (outputArgument === undefined) {
    throw new Error('Usage: ai-dm-blind-board-snapshot-check.ts <artifact-directory-images>');
  }
  const outputDirectory = resolve(outputArgument);
  const result = await runBlindBoardSnapshotCheck(outputDirectory);
  process.stdout.write(`BLIND_BOARD_SNAPSHOT_RESULT ${JSON.stringify(result)}\n`);
}
  readonly state: EncounterState;
  readonly source: BoardImageSource;
  readonly role?: BoardSnapshotImageRole;
}

export interface BoardSnapshotServiceOptions {
  readonly outputDirectory: string;
  readonly forbiddenBoardStrings?: readonly string[];
  /** D525: render every capture under this glyph mode; a board that says otherwise is never captured. */
  readonly boardGlyphs?: BoardGlyphMode;
  /** D561: CSS raster scale for the diagnostic capture; native art remains unchanged. */
  readonly captureTilePx?: CaptureTilePx;
  /** D569: advice is deliberately implicit so old capture URLs and artifacts are byte-identical. */
  readonly informationMode?: BoardSnapshotInformationMode;
  readonly primerVersion?: string;
}

function sha256Bytes(value: Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

export function boardStateDigest(state: EncounterState): string {
  return sha256Bytes(Buffer.from(canonicalJson(state), 'utf8'));
}

function validateSource(state: EncounterState, source: BoardImageSource): void {
  if (!Number.isSafeInteger(source.room) || source.room < 1) {
    throw new RangeError('Board image room must be a positive safe integer.');
  }
  if (source.round !== state.round) {
    throw new Error(`Board image round ${String(source.round)} does not match state round ${String(state.round)}.`);
  }
  if (source.revision !== state.revision) {
    throw new Error(`Board image revision ${String(source.revision)} does not match state revision ${String(state.revision)}.`);
  }
  if (!SHA256_PATTERN.test(source.stateDigest)) {
    throw new TypeError('Board image state digest must be a lowercase SHA-256 digest.');
  }
  const digest = boardStateDigest(state);
  if (source.stateDigest !== digest) {
    throw new Error(`Board image state digest ${source.stateDigest} does not match canonical state ${digest}.`);
  }
}

export function assertBoardImageFresh(
  artifact: BoardImageArtifact,
  state: EncounterState,
  source: BoardImageSource,
): void {
  validateSource(state, source);
  if (
    artifact.source.room !== source.room ||
    artifact.source.round !== source.round ||
    artifact.source.revision !== source.revision ||
    artifact.source.stateDigest !== source.stateDigest
  ) {
    throw new Error('Board image artifact is stale for the current encounter state.');
  }
}

export function assertSynchronizedBoardImages(input: {
  readonly artifacts: readonly BoardImageArtifact[];
  readonly state: EncounterState;
  readonly source: BoardImageSource;
  readonly primaryDispatchStartedAtUnixMs: number;
}): void {
  if (input.artifacts.length === 0) throw new TypeError('A visual family must not be empty.');
  const roles = new Set<BoardSnapshotImageRole>();
  for (const [index, artifact] of input.artifacts.entries()) {
    assertBoardImageFresh(artifact, input.state, input.source);
    const blind = artifact.blindState;
    if (renderedGlyphMode === null || !isBoardGlyphMode(renderedGlyphMode)) {
      throw new TypeError('State-only snapshot omitted its glyph mode.');
    }
    const html = await writeContentAddressedHtml(this.#outputDirectory, serializeAccessibleBoard({
      encounterName: 'Encounter board',
      audience: 'dm',
      round: input.state.round,
      activeCombatant: input.state.activeCombatant,
      board: projectEncounterBoard(projectDmView(input.state)),
    }));
    const artifact: BoardImageArtifact = Object.freeze({
      version: 'arena-board-image-v1',
      audience: 'dm',
      mimeType: 'image/png',
      relativePath,
      sha256: digest,
      bytes: png.byteLength,
      ...dimensions,
      capturedAtUnixMs: Date.now(),
      captureMs,
      source: { ...input.source },
      chromiumVersion: this.#chromiumVersion,
      html,
      ...(this.#informationMode === 'blind_state' ? {
        blindState: {
          informationMode: 'blind_state' as const,
          role,
          ordinal: visualOrdinal,
          primerVersion: this.#primerVersion,
          glyphMode: renderedGlyphMode,
          captureTilePx: this.#captureGeometry.tileSizeCssPx,
          domEvidence: blindDomEvidence!,
        },
      } : {}),
    });
    assertBoardImageFresh(artifact, input.state, input.source);
    await assertContainedArtifact(this.#outputDirectory, artifact.relativePath);
    await assertContainedArtifact(this.#outputDirectory, artifact.html.relativePath);
    this.#artifacts.push(artifact);
    await this.#writeManifest();
    return artifact;
  }

  #captureRole(input: BoardSnapshotCapture): BoardSnapshotImageRole {
    if (this.#closed) throw new Error('Board snapshot service is closed.');
    const role = input.role ?? 'dm_board';
    if (this.#informationMode === 'advice' && role !== 'dm_board') {
      throw new TypeError('Advice snapshots support only the legacy dm_board capture.');
    }
    return role;
  }

  async #prepareBoard(
    input: BoardSnapshotCapture,
    role: BoardSnapshotImageRole,
    captureOrdinal: number,
    addCanary: boolean,
  ): Promise<ReturnType<Page['locator']>> {
    if (this.#informationMode === 'blind_state') await this.#selectBlindRole(role);
    validateSource(input.state, input.source);
    const bundle = createBoardSnapshotSessionBundle(input.state, input.source, captureOrdinal);
    const sessions = join(this.#outputDirectory, 'snapshot-sessions');
    await mkdir(sessions, { recursive: true });
    const bundlePath = join(sessions, `${input.source.stateDigest}-${String(captureOrdinal)}.vtt.json`);
    try {
      await writeFile(bundlePath, bundle.bytes, { flag: 'wx' });
    } catch (error: unknown) {
      if (!(error instanceof Error) || Reflect.get(error, 'code') !== 'EEXIST') throw error;
      if (await readFile(bundlePath, 'utf8') !== bundle.bytes) {
        throw new Error(`Snapshot session bundle ${basename(bundlePath)} has conflicting bytes.`);
      }
    }

    const fileChooserPromise = this.#page.waitForEvent('filechooser');
    await this.#page.locator('.dm-save-manager')
      .getByRole('button', { name: 'Upload save file', exact: true }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(bundlePath);
    const saveId = `browser:session:${String(bundle.sessionId)}`;
    const row = this.#page.locator(`.dm-save-row[data-save-id=${JSON.stringify(saveId)}]`);
    await row.waitFor({ state: 'visible' });
    await Promise.all([
      this.#page.waitForURL((url) => url.searchParams.get('session') === bundle.sessionId),
      row.getByRole('button', { name: 'Load', exact: true }).click(),
    ]);

    await this.#page.addStyleTag({ content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      })()
    : null;
  const pendingEntries: readonly DmDecisionTrayEntry[] = [
    ...input.view.state.pendingDecisions,
    ...(input.adjudicationPrompts ?? []),
  ].map((decision) => ({
    kind: 'pending',
    decision: structuredClone(decision),
    combatantName: names.get(decision.combatant) ?? String(decision.combatant),
    triggerContext: decisionTriggerContext(decision, names),
    interactive: true,
  }));
  const autoFireEntries: readonly DmDecisionTrayEntry[] = input.view.state.eventLog.flatMap(
    (event): readonly DmDecisionTrayEntry[] => event.type === 'reaction_policy_auto_resolved'
      ? [{
          kind: 'auto_fire_log',
          sequence: event.sequence,
          combatantId: event.combatant,
          combatantName: names.get(event.combatant) ?? String(event.combatant),
          reactionKind: event.reactionKind,
          policy: event.policy,
          resolution: event.resolution,
          autoFired: event.autoFired,
          interactive: false,
        }]
      : [],
  );
  const engineAdjudicationEntries: readonly DmDecisionTrayEntry[] = (input.engineAdjudications ?? [])
    .map((request) => ({
      kind: 'engine_adjudication' as const,
      request: structuredClone(request),
      combatantName: names.get(request.actorId as CombatantId) ?? request.actorId,
      interactive: true as const,
    }));
  const offerEnvironment = input.offerEnvironment;
  const offeredActors = offeredOptionActorsForState(input.view.state, undefined, offerEnvironment);
  return {
    audience: 'dm',
    stateDigest: sha256(canonicalJson(input.view.state)),
    offerEnvironmentDigest: offerEnvironment.digest,
    encounter: dmVisibleEncounter(input.view),
    board: projectEncounterBoard(input.view, input.coordinator.pendingRequest, targets),
    coordinator: input.coordinator,
    pendingRequest: input.coordinator.pendingRequest,
    humanCommandActions,
    humanEngineOptions: projectHumanEngineOptions(input.view.state, undefined, undefined, offerEnvironment),
    movementPreviews: humanCommandActions.flatMap((action): readonly DmMovementPathPreview[] =>
      action.type === 'move'
        ? [{ commandKey: canonicalJson(action), ...previewMovementPathDangers(input.view.state, action) }]
        : []),
    offeredOptionPaths: projectOfferedOptionPaths(input.view.state, offeredActors, offerEnvironment),
    controllers: input.controllers,
    history: input.history,
    adjudicatedTargets: targets,
    partySession: input.partyState === undefined || input.partyState === null
      ? null
      : projectDmPartySession(input.partyState),
    decisionTray: {
      entries: [...pendingEntries, ...engineAdjudicationEntries, ...autoFireEntries],
      actionRefusal: input.actionRefusal ?? null,
      boundaryRefusal: input.boundaryRefusal ?? null,
      }
    }
    if (!this.boardSnapshotMode) {
      const boardContext: AccessibleBoardContext = {
        encounterName: this.#sessionFlow?.name ?? 'Reference encounter',
        audience: 'dm',
        round: projection.board.round,
        activeCombatant: projection.board.activeCombatant,
        board: projection.board,
      };
      this.#shell.append(boardPresentationControls({
        audience: 'dm',
        mode: this.#boardView,
        context: boardContext,
        setMode: (mode) => {
          this.#boardView = mode;
          writeAccessibleBoardViewMode(localStorage, 'dm', mode);
          this.#render();
        },
      }));
      const toggle = element('label', { className: 'dm-option-path-toggle' });
      toggle.dataset.renderKey = stableRenderKey('dm', 'option-path-toggle', 'label');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.#showOfferedOptionPaths;
      checkbox.dataset.renderKey = stableRenderKey('dm', 'option-path-toggle', 'input');
      checkbox.addEventListener('change', () => {
        this.#showOfferedOptionPaths = checkbox.checked;
        this.#render();
      });
      toggle.append(checkbox, element('span', { text: 'Show engine movement options' }));
      this.#shell.append(toggle);
      if (this.#boardView === 'screen_reader') {
        this.#shell.append(renderAccessibleBoard(boardContext));
        return;
      }
    }
    const renderedBoard = renderBoard(projection.board, previewCells, movementPreview, {
      revision: projection.encounter.revision,
      round: projection.board.round,
      stateDigest: projection.stateDigest,
    }, this.boardGlyphs, this.boardSnapshotMode, this.captureTilePx,
    this.boardSnapshotInformation !== 'blind_state' &&
      (this.boardSnapshotMode || this.#showOfferedOptionPaths)
      ? projection.offeredOptionPaths
      : null, this.#stackSelection, new Map(projection.board.worldObjects.map((object) => {
        const label = dmWorldObjectLabel(projection, String(object.id));
        if (label === null) throw new Error(`Missing DM world-object label for ${String(object.id)}.`);
        return [label.objectId, label.text] as const;
      })));
    if (this.boardSnapshotInformation === 'blind_state') {
      renderedBoard.dataset.blindSnapshotCapture = 'true';
      renderedBoard.dataset.blindSnapshotRole = 'dm_board';
    }
    this.#shell.append(renderedBoard);
    if (movementPreview !== null) this.#shell.append(renderMovementDangerLegend(movementPreview));
  }

  #markBlindSnapshotCapture(
    element: HTMLElement,
    projection: TopDownDmBoardProjection,
    role: BoardSnapshotRole,
  ): void {
    element.dataset.blindSnapshotCapture = 'true';
    element.dataset.blindSnapshotRole = role;
    element.dataset.boardAudience = role === 'player_board' ? 'player' : 'dm';
    element.dataset.sourceRevision = String(projection.encounter.revision);
    element.dataset.sourceRound = String(projection.board.round);
    element.dataset.sourceStateDigest = projection.stateDigest;
    element.dataset.boardGlyphs = encounterArtForBoard(
      projection.board,
      this.boardGlyphs,
    ).boardGlyphs;
  }

  #renderBlindStateSnapshot(projection: TopDownDmBoardProjection): void {
    switch (this.boardSnapshotRole) {
      case 'dm_board':
        this.#renderDmBoard(projection);
        return;
      case 'accessible_board_raster': {
        const accessible = renderAccessibleBoard({
          encounterName: this.#sessionFlow?.name ?? 'Reference encounter',
          audience: 'dm',
          round: projection.board.round,
          activeCombatant: projection.board.activeCombatant,
          board: projection.board,
        });
        // D571 leaves action/target-specific reach conclusions to the model.
        accessible.querySelector('#reach-heading')?.closest('section')?.remove();
        this.#markBlindSnapshotCapture(accessible, projection, 'accessible_board_raster');
tools/ai-dm-board-glyph-captures.ts:22:import { BoardSnapshotService, boardStateDigest, type BoardImageArtifact } from './ai-dm-board-snapshot';
tools/ai-dm-board-glyph-captures.ts:118:            stateDigest: boardStateDigest(candidate.state),
tools/ai-dm-screenshot-probe.ts:48:  boardStateDigest,
tools/ai-dm-screenshot-probe.ts:2622:    stateDigest: boardStateDigest(state),
tools/ai-dm-screenshot-probe.ts:3615:        artifact.source.stateDigest !== boardStateDigest(candidate.state)
tools/ai-dm-board-snapshot-check.ts:10:  boardStateDigest,
tools/ai-dm-board-snapshot-check.ts:20:    stateDigest: boardStateDigest(state),
tools/ai-dm-blind-board-snapshot-check.ts:14:  boardStateDigest,
tools/ai-dm-blind-board-snapshot-check.ts:25:    stateDigest: boardStateDigest(state),
tools/ai-dm-blind-board-snapshot-check.ts:49:    requireCondition(artifact.source.stateDigest === boardStateDigest(state), 'Image digest binding changed.');
tools/ai-dm-board-snapshot.ts:201:export function boardStateDigest(state: EncounterState): string {
tools/ai-dm-board-snapshot.ts:218:  const digest = boardStateDigest(state);
tools/ai-dm-conversation.ts:105:  boardStateDigest,
tools/ai-dm-conversation.ts:4487:          stateDigest: boardStateDigest(rendererState),
src/vtt/semantic-board-payload.ts:52:  | 'foggedCells'
src/vtt/semantic-board-payload.ts:180:    readonly fogged: EngineCellFactList;
src/vtt/semantic-board-payload.ts:182:    readonly obscured_or_fogged: EngineCellFactList;
src/vtt/semantic-board-payload.ts:324:  const foggedCells = projectDmView(state).state.foggedCells;
src/vtt/semantic-board-payload.ts:445:      foggedCells: foggedCells.map((cell) => ({ ...cell })),
src/vtt/semantic-board-payload.ts:540:  const foggedCells = board.foggedCells;
src/vtt/semantic-board-payload.ts:654:      fogged: encodedCells(foggedCells),
src/vtt/semantic-board-payload.ts:655:      obscured_or_fogged: encodedCells([...obscuredCells, ...foggedCells]),
src/vtt/blind-turn-context.ts:609:    fogged: semanticCellFactListSchema,
src/vtt/blind-turn-context.ts:610:    obscured_or_fogged: semanticCellFactListSchema,
src/vtt/encounter-app.ts:2208:    const boardFog = new Set(projection.board.foggedCells.map(
src/vtt/encounter-app.ts:2211:    if (projection.encounter.dmOnly.foggedCells.some(
src/vtt/accessible-board.ts:182:  for (const cell of context.board.foggedCells ?? []) add(cell, 'Fogged');
src/vtt/mcp/schemas.ts:736:    fogged: semanticCellFactList,
src/vtt/mcp/schemas.ts:737:    obscured_or_fogged: semanticCellFactList,
src/vtt/encounter-state-codec.ts:35:  'contentPacks', 'equipment', 'groundItems', 'itemContacts', 'foggedCells',
src/vtt/encounter-state-codec.ts:406:  if (own(state, 'foggedCells')) {
src/vtt/encounter-state-codec.ts:407:    const foggedCells = array(state['foggedCells'], 'state.foggedCells').map((entry, index) =>
src/vtt/encounter-state-codec.ts:408:      decodeCell(entry, `state.foggedCells[${String(index)}]`));
src/vtt/encounter-state-codec.ts:409:    unique(foggedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Fogged cells');
src/vtt/encounter-state-codec.ts:410:    if (foggedCells.some((cell) =>
src/vtt/encounter-state-codec.ts:412:      throw new TypeError('Legacy fogged cells must be inside the encounter grid.');
src/vtt/encounter-state-codec.ts:414:    delete state['foggedCells'];
src/vtt/encounter-board.ts:113:  readonly foggedCells?: readonly { readonly column: number; readonly row: number }[];
src/vtt/encounter-board.ts:263:  readonly foggedCells: readonly { readonly column: number; readonly row: number }[];
src/vtt/encounter-board.ts:716:    foggedCells: derivedFogCells(state, visibilityObserverIds),
src/vtt/encounter-board.ts:872:    ...(projection.foggedCells?.map(cellKey) ?? []),
src/vtt/encounter-board.ts:959:        fogged: fog.has(key),

exec
/bin/bash -lc "rg -n \"export async function loadArenaFixture|function loadArenaFixture|loadArenaFixture\" src/vtt/mcp/entrypoint.ts
sed -n '1080,1170p' src/vtt/mcp/entrypoint.ts
rg -n \"createBoardSnapshotSessionBundle|function createBoardSnapshotSessionBundle\" tools/ai-dm-board-snapshot.ts
sed -n '260,340p' tools/ai-dm-board-snapshot.ts
sed -n '380,425p' src/vtt/encounter-state-codec.ts
rg -n \"decodeEncounterState|encodeEncounterState|encounter-state-codec\" src/vtt/session-persistence.ts | head -80
sed -n '1980,2110p' src/vtt/session-persistence.ts
sed -n '450,500p' src/vtt/encounter-projections.ts
sed -n '680,750p' src/vtt/encounter-app.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
680:export async function loadArenaFixture(path: string): Promise<EncounterState> {
691:  const loaded = await loadArenaFixture(resolve(fixturePath));
1129:    const state = await loadArenaFixture(manifest.fixturePath);
  const absoluteLauncherPath = resolve(path);
  let decoded: unknown;
  try {
    decoded = JSON.parse(await readFile(absoluteLauncherPath, 'utf8')) as unknown;
  } catch {
    return null;
  }
  const manifest = decodeEngineMcpEntrypointDocument(decoded, decodeArenaFixture);
  return manifest?.readinessSpoolPath === undefined || isAbsolute(manifest.readinessSpoolPath)
    ? manifest
    : {
        ...manifest,
        readinessSpoolPath: resolve(dirname(absoluteLauncherPath), manifest.readinessSpoolPath),
      };
}

function kbReadRecords(path: string): readonly KbReadRecord[] {
  let source: string;
  try { source = readFileSync(path, 'utf8'); } catch { return []; }
  return decodeKbReadRecords(source);
}

export function createLauncherKbReadBudget(input: {
  readonly kbReadSpoolPath?: string;
  readonly kbSubjectSources?: KbSubjectSources;
}): KbReadBudget | undefined {
  if (input.kbReadSpoolPath === undefined || input.kbSubjectSources === undefined) return undefined;
  return new KbReadBudget(
    input.kbSubjectSources,
    kbReadRecords(input.kbReadSpoolPath),
    (record) => appendFileSync(input.kbReadSpoolPath ?? '', `${JSON.stringify(record)}\n`, 'utf8'),
  );
}

export async function runEngineMcpEntrypoint(argv: readonly string[] = process.argv): Promise<void> {
  const profileArguments = argv.slice(2).filter((argument) => argument.startsWith('--agent-profile='));
  if (profileArguments.length > 1) throw new TypeError('Engine MCP accepts at most one agent profile flag.');
  const profileValue = profileArguments[0]?.slice('--agent-profile='.length);
  if (profileValue !== undefined && profileValue !== 'dm' && profileValue !== 'full' && profileValue !== 'blind') {
    throw new TypeError(`Unknown engine MCP agent profile ${profileValue}.`);
  }
  const positional = argv.slice(2).filter((argument) => !argument.startsWith('--agent-profile='));
  const launcherPath = positional[0];
  if (launcherPath === undefined) throw new TypeError('Usage: engine-mcp-server.ts [--agent-profile=full|dm|blind] <arena-fixture-or-launcher.json>');
  const selectedProfile = profileValue as EngineMcpToolProfile | undefined;
  const manifest = await launcherManifest(launcherPath);
  if (manifest !== null) {
    const offerEnvironment = buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
    const kbReadBudget = createLauncherKbReadBudget(manifest);
    const state = await loadArenaFixture(manifest.fixturePath);
    const [boardImageContent, boardHtmlContent] = await Promise.all([
      validatedLauncherBoardImage(manifest, state),
      validatedLauncherBoardHtmlReference(manifest, state),
    ]);
    const ingressRecords = manifest.blindIngressSpoolPath === undefined
      ? []
      : decodeBlindIngressRecords(nonemptySpoolLines(manifest.blindIngressSpoolPath));
    const blindIngressRecorder = manifest.dmMode !== 'blind' || manifest.blindIngressSpoolPath === undefined
      ? undefined
      : new BlindModelIngressRecorder(ingressRecords, (record) => {
          appendFileSync(manifest.blindIngressSpoolPath ?? '', `${JSON.stringify(dispatchStamped(
            manifest,
            record as unknown as Readonly<Record<string, unknown>>,
          ))}\n`, 'utf8');
        });
    await runEngineMcpServer(manifest.fixturePath, {
      runId: manifest.runId,
      branchId: manifest.branchId,
      revision: manifest.revision,
      requestId: manifest.requestId,
      ...(manifest.readinessSpoolPath === undefined || manifest.dispatchId === undefined ||
        manifest.dispatchPhase === undefined ? {} : {
          readinessEvidence: {
            spoolPath: manifest.readinessSpoolPath,
            dispatchId: manifest.dispatchId,
            phase: manifest.dispatchPhase,
            profile: (selectedProfile ?? manifest.toolProfile) === 'blind' ? 'blind' as const : 'dm' as const,
            requestId: manifest.requestId,
          },
        }),
      phase: manifest.phase,
      correctionNumber: manifest.correctionNumber,
      overridePolicy: manifest.overridePolicy,
      room: manifest.room,
      historyKind: manifest.historyKind,
      offerEnvironment,
      ...(manifest.requestKind === 'plan_adjustment' ? {
        requestKind: manifest.requestKind,
        requestedActorIds: manifest.requestedActorIds,
        planAdjustment: manifest.planAdjustment,
      } : {}),
278:export function createBoardSnapshotSessionBundle(
920:    const bundle = createBoardSnapshotSessionBundle(input.state, input.source, captureOrdinal);

function allHumanControllers(state: EncounterState): readonly ControllerIdentity[] {
  return state.combatants.map((combatant) => ({
    combatantId: combatant.profile.id,
    controllerId: `snapshot:${String(combatant.profile.id)}:human`,
    kind: 'human' as const,
    generation: 0,
  })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

const INTERRUPTED_COORDINATOR: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: { kind: 'interrupted' },
};

export function createBoardSnapshotSessionBundle(
  state: EncounterState,
  source: BoardImageSource,
  captureOrdinal: number,
): { readonly sessionId: EncounterSessionId; readonly bytes: string } {
  validateSource(state, source);
  if (!Number.isSafeInteger(captureOrdinal) || captureOrdinal < 1) {
    throw new RangeError('Board capture ordinal must be a positive safe integer.');
  }
  const sessionId = encounterSessionId(
    `board-snapshot:${source.stateDigest}:${String(captureOrdinal)}`,
  );
  const store = new MemoryBrowserSessionStore();
  EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId(`branch:board-snapshot:${source.stateDigest}`),
    encounterState: state,
    coordinatorState: INTERRUPTED_COORDINATOR,
    controllers: allHumanControllers(state),
    rng: mulberry32(0x50a9_504),
    store,
    mirror: new MemoryMirrorSink(),
  });
  return { sessionId, bytes: exportSavedSession(store, sessionId) };
}

async function runDistBuildCache(): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['tools/dist-build-cache.mjs'], {
      cwd: repositoryRoot,
      // vite-node sets a development-flavoured NODE_ENV for this tool process.
      // The preview artifact must be the same production build that ships.
      env: { ...process.env, NODE_ENV: 'production' },
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolvePromise();
        return;
      }
      reject(new Error(
        signal === null
          ? `Dist build cache exited with code ${String(code)}.`
          : `Dist build cache exited on signal ${signal}.`,
      ));
    });
  });
}

function actualPort(server: PreviewServer): number {
  const address = server.httpServer.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Vite preview did not expose a loopback TCP port.');
  }
  return address.port;
}

async function playwrightVersion(): Promise<string> {
  const decoded: unknown = JSON.parse(await readFile(
    resolve(repositoryRoot, 'node_modules/@playwright/test/package.json'),
    'utf8',
  ));
  const state = mode === 'legacy_basis' ? normalizeLegacyOmissions(input) : structuredClone(input);
  exactOrOptionalKeys(state, REQUIRED_STATE_KEYS, OPTIONAL_STATE_KEYS, 'encounter state');
  const config = record(state['config'], 'state.config');
  exactOrOptionalKeys(config, ['initiativeMode'], ['optionalRules'], 'state.config');
  if (!['per_combatant', 'shared_enemy', 'side_alternating'].includes(String(config['initiativeMode'])) ||
    (own(config, 'optionalRules') && !Array.isArray(config['optionalRules']))) {
    throw new TypeError('Encounter state config is invalid.');
  }
  const phase = record(state['phase'], 'state.phase');
  text(phase['kind'], 'state.phase.kind');
  if (state['rulesEdition'] !== '2014' && state['rulesEdition'] !== '2024') throw new TypeError('Encounter rulesEdition is invalid.');
  array(state['hiddenRolls'], 'state.hiddenRolls').forEach((entry) => text(entry, 'hidden roll category'));
  safeInteger(state['revision'], 'state.revision');
  safeInteger(state['round'], 'state.round');
  const bounds = record(state['bounds'], 'state.bounds');
  exactOrOptionalKeys(bounds, ['columns', 'rows'], [], 'state.bounds');
  safeInteger(bounds['columns'], 'state.bounds.columns', 1);
  safeInteger(bounds['rows'], 'state.bounds.rows', 1);
  const combatants = array(state['combatants'], 'state.combatants');
  if (combatants.length === 0) throw new TypeError('Encounter state requires at least one combatant.');
  const profiles = decodeProfiles(combatants);
  const tokens = decodeTokens(array(state['tokens'], 'state.tokens'), profiles);
  decodeEnvironment(state['environment']);
  const blockedCells = array(state['blockedCells'], 'state.blockedCells').map((entry, index) =>
    decodeCell(entry, `state.blockedCells[${String(index)}]`));
  unique(blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Blocked cells');
  if (own(state, 'foggedCells')) {
    const foggedCells = array(state['foggedCells'], 'state.foggedCells').map((entry, index) =>
      decodeCell(entry, `state.foggedCells[${String(index)}]`));
    unique(foggedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Fogged cells');
    if (foggedCells.some((cell) =>
      cell.column >= (bounds['columns'] as number) || cell.row >= (bounds['rows'] as number))) {
      throw new TypeError('Legacy fogged cells must be inside the encounter grid.');
    }
    delete state['foggedCells'];
  }
  const worldObjects = array(state['worldObjects'], 'state.worldObjects');
  assertRecordArray(worldObjects, 'state.worldObjects');
  array(state['dmNotes'], 'state.dmNotes').forEach((entry) => text(entry, 'DM note'));
  for (const key of [
    'sharedSpaceRelations', 'adjudicationPending', 'effects', 'persistentAreas', 'eventLog',
    'hiddenCombatants', 'observationHistory', 'pendingDecisions', 'reactionPolicies',
  ] as const) assertRecordArray(state[key], `state.${key}`);
  for (const key of ['nextEventSequence', 'nextDecisionSequence', 'nextEffectSequence', 'nextWorldObjectSequence', 'nextPersistentAreaSequence'] as const) {
    safeInteger(state[key], `state.${key}`, 1);
  }
      controllers: latest.controllers,
      agentSession: binding,
    });
    return binding;
  }

  partyState(): PartySessionState | null {
    return structuredClone(this.#latest().partyState);
  }

  ended(): boolean {
    return this.#latest().transition.kind === 'session_ended';
  }

  endSession(): void {
    const latest = this.#latest();
    if (latest.transition.kind === 'session_ended') {
      throw new Error('Encounter session has already ended.');
    }
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: { kind: 'session_ended' },
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: latest.agentSession,
    });
  }

  export(): string {
    return exportSavedSession(this.store, this.sessionId);
  }

  record(input: {
    readonly transition: DurableCoordinatorTransition;
    readonly encounterState: EncounterState;
    readonly coordinatorState: PersistedCoordinatorState;
    readonly controllers: readonly ControllerIdentity[];
  }): void {
    const latest = this.#latest();
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition: input.transition,
      encounterState: input.encounterState,
      partyState: latest.partyState,
      coordinatorState: input.coordinatorState,
      controllers: input.controllers,
      agentSession: latest.agentSession,
    });
  }

  recordHostTransition(transition: EngineHostTransition): void {
    const latest = this.#latest();
    this.#append({
      parentRevision: latest.revision,
      branchId: latest.branchId,
      transition,
      encounterState: latest.encounterState,
      partyState: latest.partyState,
      coordinatorState: latest.coordinatorState,
      controllers: latest.controllers,
      agentSession: latest.agentSession,
    });
  }

  turnExhaustionPersistence(): import('./turn-exhaustion-coordinator').TurnExhaustionPersistence {
    return {
      transitions: () => this.history().flatMap((entry) =>
        !entry.void && entry.transition.kind.startsWith('proposal_')
          ? [entry.transition as TurnExhaustionTransition]
          : []),
      record: (transition) => this.recordHostTransition(transition),
    };
  }

  moveHead(
    operation: 'undo' | 'redo',
    targetRevision: number,
    requestedBranchId: EncounterBranchId,
  ): SessionResume {
    const revisions = this.store.revisions(this.sessionId);
    const source = revisions.at(-1);
    const target = revisions.find((revision) => revision.revision === targetRevision);
    if (source === undefined || target === undefined) {
      throw new Error('Head move target does not exist.');
    }
    this.#rng = deriveBranchRng(target, requestedBranchId);
    const appended = this.#append({
      parentRevision: target.revision,
      branchId: requestedBranchId,
      transition: {
        kind: 'head_moved',
        operation,
        sourceRevision: source.revision,
        targetRevision,
      },
      encounterState: target.encounterState,
      partyState: target.partyState,
      coordinatorState: target.coordinatorState,
      controllers: target.controllers,
      agentSession: target.agentSession,
    });
    return {
      journal: this,
      encounterState: appended.encounterState,
      partyState: appended.partyState,
      coordinatorState: appended.coordinatorState,
      controllers: appended.controllers,
      agentSession: appended.agentSession,
      rng: this.#rng,
    };
  }

  skipTurn(): SessionResume {
    const latest = this.#latest();
    const actor = latest.encounterState.activeCombatant;
    if (actor === null) throw new Error('A turn can only be skipped during initiative.');
    const advanced = advanceSkippedTurn(latest.encounterState, this.#rng);
    return this.#appendPacing({
      latest,
      transition: {
        kind: 'turn_skipped',
        combatant: actor,
        round: latest.encounterState.round,
        events: advanced.events,
      },
      encounterState: advanced.encounterState,
    });
      })()
    : null;
  const pendingEntries: readonly DmDecisionTrayEntry[] = [
    ...input.view.state.pendingDecisions,
    ...(input.adjudicationPrompts ?? []),
  ].map((decision) => ({
    kind: 'pending',
    decision: structuredClone(decision),
    combatantName: names.get(decision.combatant) ?? String(decision.combatant),
    triggerContext: decisionTriggerContext(decision, names),
    interactive: true,
  }));
  const autoFireEntries: readonly DmDecisionTrayEntry[] = input.view.state.eventLog.flatMap(
    (event): readonly DmDecisionTrayEntry[] => event.type === 'reaction_policy_auto_resolved'
      ? [{
          kind: 'auto_fire_log',
          sequence: event.sequence,
          combatantId: event.combatant,
          combatantName: names.get(event.combatant) ?? String(event.combatant),
          reactionKind: event.reactionKind,
          policy: event.policy,
          resolution: event.resolution,
          autoFired: event.autoFired,
          interactive: false,
        }]
      : [],
  );
  const engineAdjudicationEntries: readonly DmDecisionTrayEntry[] = (input.engineAdjudications ?? [])
    .map((request) => ({
      kind: 'engine_adjudication' as const,
      request: structuredClone(request),
      combatantName: names.get(request.actorId as CombatantId) ?? request.actorId,
      interactive: true as const,
    }));
  const offerEnvironment = input.offerEnvironment;
  const offeredActors = offeredOptionActorsForState(input.view.state, undefined, offerEnvironment);
  return {
    audience: 'dm',
    stateDigest: sha256(canonicalJson(input.view.state)),
    offerEnvironmentDigest: offerEnvironment.digest,
    encounter: dmVisibleEncounter(input.view),
    board: projectEncounterBoard(input.view, input.coordinator.pendingRequest, targets),
    coordinator: input.coordinator,
    pendingRequest: input.coordinator.pendingRequest,
    humanCommandActions,
    humanEngineOptions: projectHumanEngineOptions(input.view.state, undefined, undefined, offerEnvironment),
    movementPreviews: humanCommandActions.flatMap((action): readonly DmMovementPathPreview[] =>
      action.type === 'move'
        ? [{ commandKey: canonicalJson(action), ...previewMovementPathDangers(input.view.state, action) }]
        : []),
    offeredOptionPaths: projectOfferedOptionPaths(input.view.state, offeredActors, offerEnvironment),

function renderOfferedOptionLegend(): HTMLElement {
  const legend = element('aside', { className: 'encounter-option-path-legend' });
  legend.dataset.optionPathLegend = 'true';
  legend.append(element('strong', { text: 'Movement options' }));
  for (const [className, text] of [
    ['encounter-option-legend-solid', 'solid = within movement'],
    ['encounter-option-legend-dashed', 'dashed = beyond movement (Dash)'],
    ['encounter-option-legend-arrow', 'arrow = Opportunity Attack'],
    ['encounter-option-legend-hatch', 'hatching = Difficult Terrain'],
    ['encounter-option-legend-flame', '♨ = damaging terrain'],
    ['encounter-option-legend-ordinal', 'N = option N'],
  ] as const) {
    legend.append(element('span', { className, text }));
  }
  return legend;
}

// ART-SEAM (D516): exported so the DM-with-chrome / player-without DOM identity is testable.
export function renderBoard(
  projection: EncounterBoardProjectionShape,
  preview: ReadonlySet<string> = new Set(),
  movementDangerPreview: DmMovementPathPreview | null = null,
  provenance?: {
    readonly revision: number;
    readonly round: number;
    readonly stateDigest: string;
  },
  // ART-SEAM (D525): the snapshot page overrides the package's glyph mode from its URL.
  boardGlyphs?: BoardGlyphMode,
  boardSnapshotMode = false,
  boardChromeTilePx?: BoardChromeTilePx,
  offeredPaths: readonly OfferedOptionPath[] | null = null,
  stackSelection: EncounterBoardStackSelection = new Map(),
  worldObjectLabels?: ReadonlyMap<string, string>,
): HTMLDivElement {
  const tilePx = boardChromeTilePx ?? CHROME_TILE_PX;
  const chromeMetrics = boardChromeMetrics(tilePx);
  const art = encounterArtForBoard(projection, boardGlyphs);
  const models = encounterBoardRenderModel(projection, art);
  const board = element('div', { className: 'encounter-board' });
  board.dataset.renderKey = stableRenderKey('encounter-board', art.id);
  board.style.setProperty('--encounter-columns', String(projection.bounds.columns));
  // ART-SEAM (D516): overlay art reaches the mechanical-layer CSS through custom properties.
  for (const [effect, assetId] of Object.entries(OVERLAY_ASSETS)) {
    board.style.setProperty(`--art-overlay-${effect}`, starterArtCssUrl(assetId));
  }
  board.dataset.artPackage = art.id;
  board.dataset.boardGlyphs = art.boardGlyphs;
  board.dataset.boardAudience = provenance === undefined ? 'player' : 'dm';
  if (boardSnapshotMode) board.dataset.boardSnapshot = 'true';
  if (provenance !== undefined) {
    board.dataset.sourceRevision = String(provenance.revision);
    board.dataset.sourceRound = String(provenance.round);
    board.dataset.sourceStateDigest = provenance.stateDigest;
  }
  if (offeredPaths !== null) board.dataset.optionPaths = String(offeredPaths.length);
  const dangersByCell = new Map<string, DmMovementPathPreview['annotations'][number]['dangers']>(movementDangerPreview?.annotations.map(
    (annotation) => [`${String(annotation.cell.column)},${String(annotation.cell.row)}`, annotation.dangers] as const,
  ) ?? []);
  const optionDifficultCells = new Map<string, OfferedOptionPath[]>();
  const optionDamageCells = new Map<string, OfferedOptionPath[]>();
  const optionThreats = new Set(offeredPaths?.flatMap((path) =>
    path.steps.flatMap((step) => step.opportunityAttackReactors)) ?? []);
  for (const path of offeredPaths ?? []) {
    for (const annotation of path.annotations) {
      const key = `${String(annotation.cell.column)},${String(annotation.cell.row)}`;
      if (annotation.dangers.includes('difficult_terrain')) {
        optionDifficultCells.set(key, [...optionDifficultCells.get(key) ?? [], path]);
      }
      if (annotation.dangers.includes('burning_surface') ||

exec
/bin/bash -lc "sed -n '640,705p' src/vtt/mcp/entrypoint.ts
rg -n \"function decodeArenaFixture|const decodeArenaFixture|decodeArenaFixture\" src/vtt/mcp/entrypoint.ts
rg -n \"decodeEncounterState\" src/vtt/session-persistence.ts src/vtt/*.ts | head -100
rg -n \"EncounterSessionJournal\\.create|encodeEncounterState|JSON.stringify.*encounterState|encounterState:\" src/vtt/session-persistence.ts | head -100
sed -n '198,240p' src/vtt/session-persistence.ts
sed -n '1290,1430p' src/vtt/session-persistence.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
    toolSurface: application.toolSurface,
    feed,
    proposals,
    speculativePlans,
    narrations,
    adjudications,
    uiFeedback,
    blindIntentSubmissions,
  };
}

export function createEngineMcpHandler(
  state: EncounterState,
  offerEnvironment: EngineOptionEnvironment,
  maximumToolResultBytes?: number,
): McpHandler {
  const options = {
    offerEnvironment,
    ...(maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes }),
  };
  return createEngineMcpRuntime(state, options).handler;
}

export function handleMcpRequest(
  state: EncounterState,
  message: unknown,
  offerEnvironment: EngineOptionEnvironment,
): JsonRpcResponse | null {
  const handler = createEngineMcpHandler(state, offerEnvironment);
  return handler.handle(message);
}

export function decodeArenaFixture(decoded: unknown): EncounterState {
  return decodeEngineFixtureV1(decoded);
}

export function decodeArenaFixtureText(text: string): EncounterState {
  return decodeArenaFixture(JSON.parse(text) as unknown);
}

export async function loadArenaFixture(path: string): Promise<EncounterState> {
  return decodeArenaFixtureText(await readFile(path, 'utf8'));
}

export { freshMonsterPlanningState, projectFutureMonsterTurns } from '../monster-planning-state';

export async function runEngineMcpServer(
  fixturePath: string,
  options: Parameters<typeof createEngineMcpRuntime>[1],
  directFixturePlanning = false,
): Promise<void> {
  const loaded = await loadArenaFixture(resolve(fixturePath));
  const state = directFixturePlanning ? freshMonsterPlanningState(loaded) : loaded;
  const runtime = createEngineMcpRuntime(state, options);
  const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  await runEngineMcpLines(runtime, lines, options);
}

/** The request loop shared by real stdio and cheap in-process protocol regressions. */
export async function runEngineMcpLines(
  runtime: EngineMcpRuntime,
  lines: AsyncIterable<string>,
  options: Parameters<typeof createEngineMcpRuntime>[1],
  writeResponse: (value: unknown) => Promise<void> = writeJsonLine,
): Promise<void> {
  const handler = runtime.handler;
672:export function decodeArenaFixture(decoded: unknown): EncounterState {
676:export function decodeArenaFixtureText(text: string): EncounterState {
677:  return decodeArenaFixture(JSON.parse(text) as unknown);
681:  return decodeArenaFixtureText(await readFile(path, 'utf8'));
1087:  const manifest = decodeEngineMcpEntrypointDocument(decoded, decodeArenaFixture);
src/vtt/arena-fixture.ts:14:import { decodeEncounterStateV1 } from './encounter-state-codec';
src/vtt/arena-fixture.ts:268:  const state = decodeEncounterStateV1(encounter['state'], options.mode);
src/vtt/arena-fixture.ts:286:  return decodeEncounterStateV1(encounter['state'], 'session');
src/vtt/arena-fixture.ts:297:  return decodeEncounterStateV1(encounter['state'], 'legacy_basis');
src/vtt/encounter-state-codec.ts:378:export function decodeEncounterStateV1(value: unknown, mode: EncounterStateDecodeMode): EncounterState {
297:  readonly encounterState: EncounterState;
1044:function mechanicalBranchState(encounterState: EncounterState): unknown {
1099:function branchRngStateFingerprint(encounterState: EncounterState): string {
1123:  readonly encounterState: EncounterState;
1146:  return { encounterState: reduction.state, events: reduction.events };
1181:    encounterState: {
1639:  readonly encounterState: EncounterState;
1662:    readonly encounterState: EncounterState;
1683:      encounterState: input.encounterState,
1702:      encounterState: latest.encounterState,
1762:      encounterState: latest.encounterState,
1784:      encounterState: latest.encounterState,
1810:      encounterState: latest.encounterState,
1906:      encounterState: latest.encounterState,
1928:      encounterState: latest.encounterState,
1977:      encounterState: latest.encounterState,
2003:      encounterState: latest.encounterState,
2017:    readonly encounterState: EncounterState;
2026:      encounterState: input.encounterState,
2040:      encounterState: latest.encounterState,
2079:      encounterState: target.encounterState,
2087:      encounterState: appended.encounterState,
2109:      encounterState: advanced.encounterState,
2129:      encounterState: advanced.encounterState,
2165:      encounterState: latest.encounterState,
2186:      encounterState: latest.encounterState,
2208:      encounterState: latest.encounterState,
2229:      encounterState: latest.encounterState,
2247:    const encounterState: EncounterState = {
2266:      encounterState: appended.encounterState,
2286:      encounterState: latest.encounterState,
2294:      encounterState: appended.encounterState,
2304:    readonly encounterState: EncounterState;
2316:      encounterState: input.encounterState,
2334:    readonly encounterState: EncounterState;
2340:      encounterState: input.encounterState,
2348:      encounterState: appended.encounterState,
2361:    readonly encounterState: EncounterState;
2376:      encounterState: input.encounterState,
2932:            encounterState: migratedEncounterState,
2973:            encounterState: migratedEncounterState,
3027:            encounterState: migratedEncounterState,
3483:      encounterState: {
3509:      encounterState: {
      readonly summary: LongRestSummaryCard;
    }
  | { readonly kind: 'room_composed'; readonly room: number }
  | {
      readonly kind: 'turn_skipped';
      readonly combatant: import('../combat/values').CombatantId;
      readonly round: number;
      readonly events: readonly EncounterEvent[];
    }
  | {
      readonly kind: 'turn_delayed';
      readonly combatant: import('../combat/values').CombatantId;
      readonly afterCombatant: import('../combat/values').CombatantId;
      readonly round: number;
      readonly fromIndex: number;
      readonly toIndex: number;
      readonly events: readonly EncounterEvent[];
    }
  | {
      readonly kind: 'head_moved';
      readonly operation: 'undo' | 'redo';
      readonly sourceRevision: number;
      readonly targetRevision: number;
    };

export const SESSION_TRANSITION_KINDS = [
  'session_started',
  'agent_session_started',
  'agent_session_dispatched',
  'agent_call_usage_recorded',
  'agent_session_recovered',
  'agent_session_recovery_failed',
  'agent_session_rolled_over',
  'session_ended',
  'proposal_fallback_resolved',
  'proposal_correction_requested',
  'proposal_correction_resolved',
  'proposal_correction_failed',
  'proposal_auto_resolved',
  'proposal_auto_resolution_failed',
  'unattended_reaction_auto_resolved',
  'reaction_guidance_replaced',
  'reaction_guidance_auto_resolved',
          throw new Error('Migrated session_started agent binding is malformed.');
        }
        break;
      case 'agent_session_started':
        if (parent === null || parent === undefined || parent.agentSession !== null) {
          throw new Error('agent_session_started requires an unbound parent revision.');
        }
        requireCanonicalEqual(revision.agentSession, transition.binding, 'started agent binding');
        if (
          transition.binding.status !== 'active' ||
          transition.binding.generation !== 0 ||
          transition.binding.predecessorSessionHash !== null ||
          transition.binding.startedAtRevision !== revision.revision ||
          transition.binding.lastDispatchedRevision !== 0
        ) throw new Error('Initial agent session binding is malformed.');
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-start encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-start coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-start party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-start RNG state');
        break;
      case 'agent_session_dispatched':
        if (parent === null || parent === undefined || parent.agentSession === null) {
          throw new Error('agent_session_dispatched requires an active binding.');
        }
        if (
          parent.agentSession.status !== 'active' ||
          transition.dispatchedRevision !== parent.revision
        ) throw new Error('Agent dispatch revision does not identify its active parent.');
        requireCanonicalEqual(
          revision.agentSession,
          { ...parent.agentSession, lastDispatchedRevision: transition.dispatchedRevision },
          'dispatched agent binding',
        );
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-dispatch encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-dispatch coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-dispatch party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-dispatch RNG state');
        break;
      case 'agent_call_usage_recorded':
        if (parent === null || parent === undefined || parent.agentSession === null ||
          parent.agentSession.status !== 'active') {
          throw new Error('agent_call_usage_recorded requires an active binding.');
        }
        if (transition.usage.ordinal !== parent.agentSession.callUsage.length + 1) {
          throw new Error('Recorded agent call usage ordinal is not contiguous.');
        }
        requireCanonicalEqual(
          revision.agentSession,
          {
            ...parent.agentSession,
            callUsage: [...parent.agentSession.callUsage, transition.usage],
            currentContextTokens: transition.usage.contextInputTokens,
          },
          'agent call usage binding',
        );
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-usage encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-usage coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-usage party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-usage RNG state');
        break;
      case 'agent_session_recovered':
        if (parent === null || parent === undefined || parent.agentSession === null) {
          throw new Error('agent_session_recovered requires a failed active binding.');
        }
        requireCanonicalEqual(
          transition.failedBinding,
          { ...parent.agentSession, status: 'superseded_after_resume_failure' },
          'superseded agent binding',
        );
        requireCanonicalEqual(revision.agentSession, transition.binding, 'recovery successor binding');
        if (
          transition.binding.cli !== parent.agentSession.cli ||
          transition.binding.status !== 'active' ||
          transition.binding.generation !== parent.agentSession.generation + 1 ||
          transition.binding.startedAtRevision !== revision.revision ||
          transition.binding.lastDispatchedRevision !== 0 ||
          transition.binding.predecessorSessionHash === null
        ) throw new Error('Agent recovery successor is malformed.');
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-recovery encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-recovery coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-recovery party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-recovery RNG state');
        break;
      case 'agent_session_recovery_failed':
        if (parent === null || parent === undefined || parent.agentSession === null) {
          throw new Error('agent_session_recovery_failed requires an active predecessor binding.');
        }
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'failed agent-recovery encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'failed agent-recovery coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'failed agent-recovery party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'failed agent-recovery RNG state');
        break;
      case 'agent_session_rolled_over':
        if (parent === null || parent === undefined || parent.agentSession === null ||
          parent.agentSession.currentContextTokens === null) {
          throw new Error('agent_session_rolled_over requires an active binding with measured usage.');
        }
        requireCanonicalEqual(
          transition.supersededBinding,
          { ...parent.agentSession, status: 'superseded_after_context_rollover' },
          'rollover superseded binding',
        );
        requireCanonicalEqual(revision.agentSession, transition.binding, 'rollover successor binding');
        if (
          transition.latestInputTokens !== parent.agentSession.currentContextTokens ||
          transition.latestInputTokens < transition.threshold ||
          transition.binding.cli !== parent.agentSession.cli ||
          transition.binding.status !== 'active' ||
          transition.binding.generation !== parent.agentSession.generation + 1 ||
          transition.binding.rolloverTriggerCount !== parent.agentSession.rolloverTriggerCount + 1 ||
          transition.binding.measuredRolloverThreshold !== transition.threshold ||
          transition.binding.lastDigestHash !== transition.digestHash ||
          transition.binding.startedAtRevision !== revision.revision ||
          transition.binding.lastDispatchedRevision !== 0 ||
          transition.binding.predecessorSessionHash === null
        ) throw new Error('Agent rollover successor is malformed.');
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-rollover encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'agent-rollover coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'agent-rollover party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'agent-rollover RNG state');
        break;
      case 'session_ended':
        if (parent === null || parent === undefined) {
          throw new Error('session_ended requires a parent revision.');
        }
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'ended-session encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'ended-session coordinator state');
        requireCanonicalEqual(revision.partyState, parent.partyState, 'ended-session party state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'ended-session RNG state');
        break;
      case 'party_state_captured': {
        if (parent === null || parent === undefined || parent.partyState === null) {
          throw new Error('Party capture requires an existing party session state.');
        }
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'party-capture encounter state');
        requireCanonicalEqual(revision.coordinatorState, parent.coordinatorState, 'party-capture coordinator state');
        requireCanonicalEqual(revision.rngState, parent.rngState, 'party-capture RNG state');
        const expectedPartyState = transition.restInterruption === undefined
          ? capturePartySessionState(parent.partyState, parent.encounterState)
          : interruptLongRest(parent.partyState, transition.restInterruption.outcome).state;
        requireCanonicalEqual(revision.partyState, expectedPartyState, transition.restInterruption === undefined

exec
/bin/bash -lc "cat package.json | sed -n '1,180p'
rg -n \"export function importSavedSession|function importSavedSession|exportSavedSession|decode.*revision|decodeEncounterStateV1\" src/vtt/session-persistence.ts | head -120
sed -n '2860,3050p' src/vtt/session-persistence.ts
sed -n '250,310p' src/vtt/arena-fixture.ts
head -80 tests/fixtures/arena-basis-hard/seed-5117001.json
rg -n 'foggedCells' tests/fixtures/arena-basis-hard/seed-5117001.json tests/fixtures/arena-basis-brutal/seed-6203001.json" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
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
1271:    const transition = decodeTransition(revision.transition);
2012:    return exportSavedSession(this.store, this.sessionId);
2636:  const revisions = decodeJournalDag(value.nodes, value.revisions);
3328:      revisions: decodeJournalDagValues(value.nodes, value.revisions),
3415:export function exportSavedSession(
3452:export function importSavedSession(
3465:export function exportSavedSessionV1ForMigrationTest(
3498:export function exportSavedSessionV5ForMigrationTest(
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v3 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw new TypeError('VTT session v3 revision is malformed.');
          }
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 4 as const,
            branchRngStateFingerprint: branchRngStateFingerprint(
              revision.encounterState as unknown as EncounterState,
            ),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 4 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v4_to_v5',
      from: 4,
      to: 5,
      source: V4_TO_V5_SOURCE,
      checksum: '2b0d139e3b2c7c9c5491fe09a103cc667beb246f8d199f093c058b0835cb9c3d',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v4 revisions are malformed.');
        }
        const priorDeathMoments = new Map<string, unknown>();
        const revisions = bundle.revisions.map((revision, revisionIndex) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw new TypeError('VTT session v4 revision is malformed.');
          }
          const encounterState = revision.encounterState;
          const rawCombatants = encounterState.combatants;
          if (!Array.isArray(rawCombatants)) {
            throw new TypeError('VTT session v4 combatants are malformed.');
          }
          const round = Number.isSafeInteger(encounterState.round) ? encounterState.round as number : 0;
          const initiativeIndex = Number.isSafeInteger(encounterState.activeInitiativeIndex)
            ? encounterState.activeInitiativeIndex as number
            : 0;
          const combatants = rawCombatants.map((combatant: unknown) => {
            if (!isRecord(combatant) || !isRecord(combatant.profile) || typeof combatant.profile.id !== 'string') {
              throw new TypeError('VTT session v4 combatant is malformed.');
            }
            const id = combatant.profile.id;
            const existing = Reflect.get(combatant, 'deathAt');
            const deathAt = combatant.life === 'dead'
              ? existing ?? (priorDeathMoments.has(id)
                  ? priorDeathMoments.get(id) ?? null
                  : revisionIndex === 0
                    ? null
                    : { round, initiativeIndex })
              : null;
            priorDeathMoments.set(id, deathAt);
            return { ...combatant, deathAt };
          });
          const migratedEncounterState = { ...encounterState, combatants } as unknown as EncounterState;
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 5 as const,
            encounterState: migratedEncounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 5 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v5_to_v6',
      from: 5,
      to: 6,
      source: V5_TO_V6_SOURCE,
      checksum: '29795e2183f7e7c3831d4d233722a51ba2beee75e124abd434976499132ef174',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v5 revisions are malformed.');
        }
        const revisions = bundle.revisions.map((revision) => {
          if (!isRecord(revision) || !isRecord(revision.encounterState)) {
            throw new TypeError('VTT session v5 revision is malformed.');
          }
          if (typeof revision.encounterState.hideDeathSaveRolls !== 'boolean') {
            throw new TypeError('VTT session v5 death-save visibility setting is malformed.');
          }
          const { hideDeathSaveRolls, ...legacyEncounterState } = revision.encounterState;
          const migratedEncounterState = {
            ...legacyEncounterState,
            hiddenRolls: hideDeathSaveRolls ? ['death_saves'] : [],
          } as unknown as EncounterState;
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 6 as const,
            encounterState: migratedEncounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 6 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v6_to_v7',
      from: 6,
      to: 7,
      source: V6_TO_V7_SOURCE,
      checksum: '523db2c861ce38aeeec95824f4d73de203fa98a475ffaf3ad488e79696beaa2e',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v6 revisions are malformed.');
        }
        const migratedByRevision = new Map<number, EncounterState>();
        const revisions = bundle.revisions.map((revision) => {
          if (
            !isRecord(revision) ||
            !Number.isSafeInteger(revision.revision) ||
            !isRecord(revision.encounterState)
          ) {
            throw new TypeError('VTT session v6 revision is malformed.');
          }
          const activeEncounterState = {
            ...revision.encounterState,
            phase: { kind: 'active' as const },
          } as unknown as EncounterState;
          const parent = typeof revision.parentRevision === 'number'
            ? migratedByRevision.get(revision.parentRevision)
            : undefined;
          const startsNewEncounter = isRecord(revision.transition) &&
            revision.transition.kind === 'room_composed';
          const phase = parent?.phase.kind === 'concluded' && !startsNewEncounter
            ? parent.phase
            : parent === undefined
              ? activeEncounterState.phase
              : encounterConclusionAfter(parent, activeEncounterState) ?? activeEncounterState.phase;
          const migratedEncounterState = { ...activeEncounterState, phase };
          migratedByRevision.set(revision.revision as number, migratedEncounterState);
          const { checksum: _oldChecksum, ...oldBody } = revision;
          const body = {
            ...oldBody,
            schemaVersion: 7 as const,
            encounterState: migratedEncounterState,
            branchRngStateFingerprint: branchRngStateFingerprint(migratedEncounterState),
          };
          return { ...body, checksum: sha256(canonicalJson(body)) };
        });
        const { fingerprint: _oldFingerprint, ...oldBundle } = bundle;
        const body = {
          ...oldBundle,
          format: 'vtt-session-revisions' as const,
          schemaVersion: 7 as const,
          revisions,
        };
        return { ...body, fingerprint: sha256(canonicalJson(body)) };
      },
    }),
    Object.freeze({
      id: 'vtt_session_v7_to_v8',
      from: 7,
      to: 8,
      source: V7_TO_V8_SOURCE,
      checksum: '7438ba7c327f99cfe6eaecedaad97c2e5cd63c0cfdb31b26152eacc9cb2ef5ee',
      migrate: (bundle: Readonly<Record<string, unknown>>) => {
        if (!Array.isArray(bundle.revisions)) {
          throw new TypeError('VTT session v7 revisions are malformed.');
export function decodeArenaBasisEnvelopeV1(
  value: unknown,
  options: { readonly mode: 'legacy_basis' | 'challenge' },
): GeneratedRoom {
  const root = record(value, 'arena basis envelope');
  exactOrOptionalKeys(root, ['spec', 'encounter'], [], 'arena basis envelope');
  const challenge = options.mode === 'challenge';
  const spec = decodeSpec(root['spec'], challenge);
  const encounter = record(root['encounter'], 'arena basis encounter');
  exactOrOptionalKeys(encounter, ['schemaVersion', 'provenance', 'state'], [], 'arena basis encounter');
  if (encounter['schemaVersion'] !== 1) throw new TypeError('Arena basis encounter schemaVersion must be 1.');
  const provenance = record(encounter['provenance'], 'arena basis provenance');
  exactOrOptionalKeys(provenance, ['source', 'licenseTag', 'seed'], [], 'arena basis provenance');
  if (!['generated', 'watabou', 'imported'].includes(String(provenance['source'])) ||
    typeof provenance['licenseTag'] !== 'string' ||
    !(provenance['seed'] === null || Number.isSafeInteger(provenance['seed']))) {
    throw new TypeError('Arena basis provenance is malformed.');
  }
  const state = decodeEncounterStateV1(encounter['state'], options.mode);
  const room: GeneratedRoom = {
    spec,
    encounter: {
      schemaVersion: 1,
      provenance: structuredClone(provenance) as unknown as EncounterIr['provenance'],
      state,
    },
  };
  validateSpecAgreement(room, challenge);
  return room;
}

export function decodeSessionSnapshotV1(value: unknown): EncounterState {
  const root = record(value, 'engine session snapshot');
  exactOrOptionalKeys(root, ['encounter'], [], 'engine session snapshot');
  const encounter = record(root['encounter'], 'engine session snapshot encounter');
  exactOrOptionalKeys(encounter, ['state'], [], 'engine session snapshot encounter');
  return decodeEncounterStateV1(encounter['state'], 'session');
}

export function decodeEngineFixtureV1(value: unknown): EncounterState {
  const root = record(value, 'engine fixture');
  if (!Object.hasOwn(root, 'spec')) return decodeSessionSnapshotV1(root);
  const spec = record(root['spec'], 'engine fixture spec');
  if (Object.hasOwn(spec, 'seed')) {
    return decodeArenaBasisEnvelopeV1(root, { mode: 'legacy_basis' }).encounter.state;
  }
  const encounter = record(root['encounter'], 'engine fixture encounter');
  return decodeEncounterStateV1(encounter['state'], 'legacy_basis');
}
{"encounter":{"provenance":{"licenseTag":"MIT","seed":5117001,"source":"generated"},"schemaVersion":1,"state":{"activeCombatant":null,"activeInitiativeIndex":null,"blockedCells":[{"column":8,"row":0},{"column":8,"row":1},{"column":8,"row":2},{"column":8,"row":3},{"column":8,"row":4},{"column":8,"row":5},{"column":8,"row":6},{"column":8,"row":7},{"column":8,"row":8},{"column":8,"row":9},{"column":8,"row":10},{"column":8,"row":11},{"column":8,"row":12},{"column":8,"row":13},{"column":8,"row":14},{"column":8,"row":15},{"column":8,"row":16},{"column":8,"row":18},{"column":8,"row":19},{"column":8,"row":20},{"column":8,"row":21}],"bounds":{"columns":17,"rows":22},"combatants":[{"deathAt":null,"deathSaves":null,"hitPoints":67,"life":"living","profile":{"characterId":1,"id":"combatant:fighter","kind":"player_character","name":"Reference Fighter","rules":{"armorClass":18,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":67,"initiativeBonus":100,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":true},"tokenId":"token:fighter","wildShape":null},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":13,"life":"living","profile":{"characterId":2,"id":"combatant:cleric","kind":"player_character","name":"Reference Cleric","rules":{"armorClass":18,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":52,"initiativeBonus":70,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:cleric","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":2},{"level":2,"maximum":3,"remaining":1},{"level":3,"maximum":3,"remaining":1},{"level":4,"maximum":1,"remaining":0}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":29,"life":"living","profile":{"characterId":3,"id":"combatant:wizard","kind":"player_character","name":"Reference Wizard","rules":{"armorClass":15,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":40,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:wizard","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":0},{"level":2,"maximum":3,"remaining":2},{"level":3,"maximum":3,"remaining":0},{"level":4,"maximum":1,"remaining":0}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":38,"life":"living","limitedResources":[{"id":"monster-spell:spellcasting:spirit-guardians","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:divine-aid:bless","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:dispel-magic","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:healing-word","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:lesser-restoration","maximum":3,"recharge":"long_rest","remaining":3}],"profile":{"id":"combatant:generated-5117001-monster-1","kind":"monster","name":"Priest","rules":{"abilityScores":{"charisma":13,"constitution":12,"dexterity":10,"intelligence":13,"strength":16,"wisdom":16},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":0,"limitedResources":[{"id":"monster-spell:spellcasting:spirit-guardians","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:bless","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:dispel-magic","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:healing-word","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:lesser-restoration","maximum":3,"recharge":"long_rest"}],"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":1,"constitution":1,"dexterity":0,"intelligence":1,"strength":3,"wisdom":3},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"medicine":7,"perception":5,"religion":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:priest","tokenId":"token:generated-5117001-monster-1"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":11,"life":"living","profile":{"id":"combatant:generated-5117001-monster-2","kind":"monster","name":"Guard","rules":{"abilityScores":{"charisma":10,"constitution":12,"dexterity":12,"intelligence":10,"strength":13,"wisdom":11},"armorClass":16,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":11,"initiativeBonus":1,"passivePerception":12,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":1,"intelligence":0,"strength":1,"wisdom":0},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"perception":2},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-2"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":16,"life":"living","profile":{"id":"combatant:generated-5117001-monster-3","kind":"monster","name":"Scout","rules":{"abilityScores":{"charisma":11,"constitution":12,"dexterity":14,"intelligence":11,"strength":11,"wisdom":13},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":16,"initiativeBonus":2,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":2,"intelligence":0,"strength":0,"wisdom":1},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"nature":4,"perception":5,"stealth":6,"survival":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-3"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":16,"life":"living","profile":{"id":"combatant:generated-5117001-monster-4","kind":"monster","name":"Scout","rules":{"abilityScores":{"charisma":11,"constitution":12,"dexterity":14,"intelligence":11,"strength":11,"wisdom":13},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":16,"initiativeBonus":2,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":2,"intelligence":0,"strength":0,"wisdom":1},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"nature":4,"perception":5,"stealth":6,"survival":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-4"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":11,"life":"living","profile":{"id":"combatant:generated-5117001-monster-5","kind":"monster","name":"Guard","rules":{"abilityScores":{"charisma":10,"constitution":12,"dexterity":12,"intelligence":10,"strength":13,"wisdom":11},"armorClass":16,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":11,"initiativeBonus":1,"passivePerception":12,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":1,"intelligence":0,"strength":1,"wisdom":0},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"perception":2},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-5"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":32,"life":"living","profile":{"id":"combatant:generated-5117001-monster-6","kind":"monster","name":"Tough","rules":{"abilityScores":{"charisma":11,"constitution":14,"dexterity":12,"intelligence":10,"strength":15,"wisdom":10},"armorClass":12,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":32,"initiativeBonus":1,"passivePerception":10,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":2,"dexterity":1,"intelligence":0,"strength":2,"wisdom":0},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:tough","tokenId":"token:generated-5117001-monster-6"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null}],"config":{"initiativeMode":"shared_enemy"},"dmNotes":["Deterministic generated room seed 5117001."],"effects":[],"environment":{"difficultTerrainRegions":[{"cells":[{"column":6,"row":16},{"column":6,"row":17},{"column":6,"row":18},{"column":7,"row":16},{"column":7,"row":17},{"column":7,"row":18},{"column":9,"row":16},{"column":9,"row":17},{"column":9,"row":18},{"column":10,"row":16},{"column":10,"row":17},{"column":10,"row":18}],"id":"difficult:generated-5117001-approach"}],"lightRegions":[{"cells":[{"column":3,"row":13},{"column":4,"row":13},{"column":5,"row":13},{"column":6,"row":13},{"column":3,"row":14},{"column":4,"row":14},{"column":5,"row":14},{"column":6,"row":14}],"id":"light:world-object:generated-5117001-3","level":"bright"},{"cells":[{"column":9,"row":4},{"column":10,"row":4},{"column":11,"row":4},{"column":9,"row":5},{"column":10,"row":5},{"column":11,"row":5},{"column":12,"row":5},{"column":9,"row":6},{"column":10,"row":6},{"column":11,"row":6},{"column":12,"row":6},{"column":9,"row":7},{"column":10,"row":7},{"column":11,"row":7},{"column":12,"row":7}],"id":"light:world-object:generated-5117001-4","level":"bright"}],"movementRegions":[],"obscurementRegions":[]},"eventLog":[],"foggedCells":[],"hiddenCombatants":[],"hiddenRolls":[],"initiative":[],"nextDecisionSequence":1,"nextEffectSequence":1,"nextEventSequence":1,"nextPersistentAreaSequence":1,"nextWorldObjectSequence":1,"pendingDecisions":[],"persistentAreas":[],"phase":{"kind":"active"},"reactionPolicies":[],"revision":0,"round":0,"rulesEdition":"2024","tokens":[{"combatantId":"combatant:fighter","id":"token:fighter","position":{"column":1,"row":2}},{"combatantId":"combatant:cleric","id":"token:cleric","position":{"column":2,"row":4}},{"combatantId":"combatant:wizard","id":"token:wizard","position":{"column":1,"row":6}},{"combatantId":"combatant:generated-5117001-monster-1","id":"token:generated-5117001-monster-1","position":{"column":15,"row":1}},{"combatantId":"combatant:generated-5117001-monster-2","id":"token:generated-5117001-monster-2","position":{"column":14,"row":1}},{"combatantId":"combatant:generated-5117001-monster-3","id":"token:generated-5117001-monster-3","position":{"column":15,"row":3}},{"combatantId":"combatant:generated-5117001-monster-4","id":"token:generated-5117001-monster-4","position":{"column":14,"row":3}},{"combatantId":"combatant:generated-5117001-monster-5","id":"token:generated-5117001-monster-5","position":{"column":15,"row":5}},{"combatantId":"combatant:generated-5117001-monster-6","id":"token:generated-5117001-monster-6","position":{"column":14,"row":5}}],"worldObjects":[{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":15,"row":17}],"id":"world-object:generated-5117001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":15,"row":17}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":10}],"id":"world-object:generated-5117001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":12,"row":10}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":5,"row":3}],"id":"world-object:generated-5117001-3","kind":"light-source","name":"Runed Brazier","position":{"column":5,"row":3}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":4}],"id":"world-object:generated-5117001-4","kind":"light-source","name":"Runed Brazier","position":{"column":12,"row":4}}]}},"spec":{"blockedCells":[{"column":8,"row":0},{"column":8,"row":1},{"column":8,"row":2},{"column":8,"row":3},{"column":8,"row":4},{"column":8,"row":5},{"column":8,"row":6},{"column":8,"row":7},{"column":8,"row":8},{"column":8,"row":9},{"column":8,"row":10},{"column":8,"row":11},{"column":8,"row":12},{"column":8,"row":13},{"column":8,"row":14},{"column":8,"row":15},{"column":8,"row":16},{"column":8,"row":18},{"column":8,"row":19},{"column":8,"row":20},{"column":8,"row":21}],"challengeBudgetEighths":32,"challengeSpentEighths":30,"difficultyProfile":"hard","dimensions":{"columns":17,"rows":22},"hardFeatures":{"chokepointCells":[{"column":8,"row":17}],"likelyApproachTerrainRegionIds":["difficult:generated-5117001-approach"],"shape":"single-gate"},"monsterRoster":[{"challengeEighths":16,"challengeRating":2,"combatantId":"combatant:generated-5117001-monster-1","statblockId":"statblock:priest","tokenId":"token:generated-5117001-monster-1"},{"challengeEighths":1,"challengeRating":"1/8","combatantId":"combatant:generated-5117001-monster-2","statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-2"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117001-monster-3","statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-3"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117001-monster-4","statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-4"},{"challengeEighths":1,"challengeRating":"1/8","combatantId":"combatant:generated-5117001-monster-5","statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-5"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117001-monster-6","statblockId":"statblock:tough","tokenId":"token:generated-5117001-monster-6"}],"partyState":[{"combatantId":"combatant:fighter","concentrating":false,"deathSaves":null,"hitPointFraction":1,"hitPoints":67,"life":"living","spellSlots":[]},{"combatantId":"combatant:cleric","concentrating":false,"deathSaves":null,"hitPointFraction":0.25,"hitPoints":13,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":2,"spent":2},{"level":2,"maximum":3,"remaining":1,"spent":2},{"level":3,"maximum":3,"remaining":1,"spent":2},{"level":4,"maximum":1,"remaining":0,"spent":1}]},{"combatantId":"combatant:wizard","concentrating":false,"deathSaves":null,"hitPointFraction":0.75,"hitPoints":29,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":0,"spent":4},{"level":2,"maximum":3,"remaining":2,"spent":1},{"level":3,"maximum":3,"remaining":0,"spent":3},{"level":4,"maximum":1,"remaining":0,"spent":1}]}],"seed":5117001,"terrain":[{"cells":[{"column":6,"row":16},{"column":6,"row":17},{"column":6,"row":18},{"column":7,"row":16},{"column":7,"row":17},{"column":7,"row":18},{"column":9,"row":16},{"column":9,"row":17},{"column":9,"row":18},{"column":10,"row":16},{"column":10,"row":17},{"column":10,"row":18}],"id":"difficult:generated-5117001-approach","kind":"difficult-terrain-patch"},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":15,"row":17}],"id":"world-object:generated-5117001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":15,"row":17}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":10}],"id":"world-object:generated-5117001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":12,"row":10}}},{"cells":[{"column":3,"row":13},{"column":4,"row":13},{"column":5,"row":13},{"column":6,"row":13},{"column":3,"row":14},{"column":4,"row":14},{"column":5,"row":14},{"column":6,"row":14}],"kind":"light-source","level":"bright","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":5,"row":3}],"id":"world-object:generated-5117001-3","kind":"light-source","name":"Runed Brazier","position":{"column":5,"row":3}}},{"cells":[{"column":9,"row":4},{"column":10,"row":4},{"column":11,"row":4},{"column":9,"row":5},{"column":10,"row":5},{"column":11,"row":5},{"column":12,"row":5},{"column":9,"row":6},{"column":10,"row":6},{"column":11,"row":6},{"column":12,"row":6},{"column":9,"row":7},{"column":10,"row":7},{"column":11,"row":7},{"column":12,"row":7}],"kind":"light-source","level":"bright","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":4}],"id":"world-object:generated-5117001-4","kind":"light-source","name":"Runed Brazier","position":{"column":12,"row":4}}}]}}
tests/fixtures/arena-basis-brutal/seed-6203001.json:1:{"encounter":{"provenance":{"licenseTag":"MIT","seed":6203001,"source":"generated"},"schemaVersion":1,"state":{"activeCombatant":null,"activeInitiativeIndex":null,"blockedCells":[{"column":9,"row":0},{"column":9,"row":1},{"column":9,"row":2},{"column":9,"row":3},{"column":9,"row":4},{"column":9,"row":5},{"column":9,"row":7},{"column":9,"row":8},{"column":9,"row":9},{"column":9,"row":10},{"column":9,"row":11},{"column":9,"row":12},{"column":9,"row":13},{"column":9,"row":14},{"column":9,"row":15},{"column":9,"row":16}],"bounds":{"columns":19,"rows":17},"combatants":[{"deathAt":null,"deathSaves":null,"hitPoints":34,"life":"living","profile":{"characterId":1,"id":"combatant:fighter","kind":"player_character","name":"Reference Fighter","rules":{"armorClass":18,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":67,"initiativeBonus":100,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":true},"tokenId":"token:fighter","wildShape":null},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":13,"life":"living","profile":{"characterId":2,"id":"combatant:cleric","kind":"player_character","name":"Reference Cleric","rules":{"armorClass":18,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":52,"initiativeBonus":70,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:cleric","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":0},{"level":2,"maximum":3,"remaining":3},{"level":3,"maximum":3,"remaining":3},{"level":4,"maximum":1,"remaining":1}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":38,"life":"living","profile":{"characterId":3,"id":"combatant:wizard","kind":"player_character","name":"Reference Wizard","rules":{"armorClass":15,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":40,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:wizard","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":1},{"level":2,"maximum":3,"remaining":0},{"level":3,"maximum":3,"remaining":0},{"level":4,"maximum":1,"remaining":1}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":97,"legendary":{"actionUsesMaximum":3,"actionUsesRemaining":3,"resistanceUsesMaximum":3,"resistanceUsesRemaining":3},"life":"living","limitedResources":[{"id":"monster-spell:spellcasting:calm-emotions","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:dispel-evil-and-good","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:entangle","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:pass-without-trace","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:spellcasting:word-of-recall","maximum":1,"recharge":"long_rest","remaining":1}],"profile":{"id":"combatant:generated-6203001-monster-1","kind":"monster","name":"Unicorn","rules":{"abilityScores":{"charisma":16,"constitution":15,"dexterity":14,"intelligence":11,"strength":18,"wisdom":17},"armorClass":12,"attacksPerAction":2,"conditionImmunities":["Charmed","Paralyzed","Poisoned"],"contactMedium":"surface","creatureType":"Celestial","damageResponses":[{"response":"immune","type":"Poison"}],"detectionTraits":[],"hitPointMaximum":97,"initiativeBonus":8,"legendary":{"actionUsesMaximum":3,"actions":[{"attackId":"radiant-horn","avoidsOpportunityAttacks":true,"cost":1,"id":"charging-horn","kind":"move_and_attack","movement":"half_speed","name":"Charging Horn"},{"armorClassBonus":2,"cost":1,"expiresAt":"end_of_monster_next_turn","id":"shimmering-shield","kind":"temporary_defense","name":"Shimmering Shield","rangeFeet":60,"target":"self_or_visible_creature","temporaryHitPoints":{"count":3,"modifier":0,"sides":6},"temporaryHitPointsAverage":10}],"resistanceUsesMaximum":3},"limitedResources":[{"id":"monster-spell:spellcasting:calm-emotions","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:dispel-evil-and-good","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:entangle","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:pass-without-trace","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:spellcasting:word-of-recall","maximum":1,"recharge":"long_rest"}],"magicResistance":true,"passivePerception":13,"proficiencyBonus":3,"reach":5,"savingThrowBonuses":{"charisma":3,"constitution":2,"dexterity":2,"intelligence":0,"strength":4,"wisdom":3},"senses":[{"kind":"normal_sight"},{"kind":"darkvision","rangeFeet":60}],"sizeCategory":"Large","speed":50,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:unicorn","tokenId":"token:generated-6203001-monster-1"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":52,"life":"living","profile":{"id":"combatant:generated-6203001-monster-2","kind":"monster","name":"Saber-Toothed Tiger","rules":{"abilityScores":{"charisma":8,"constitution":15,"dexterity":17,"intelligence":3,"strength":18,"wisdom":12},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Beast","damageResponses":[],"detectionTraits":[],"hitPointMaximum":52,"initiativeBonus":3,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":-1,"constitution":2,"dexterity":5,"intelligence":-4,"strength":6,"wisdom":1},"senses":[{"kind":"normal_sight"},{"kind":"darkvision","rangeFeet":60}],"sizeCategory":"Large","skillBonuses":{"perception":5,"stealth":7},"speed":40,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:saber-toothed-tiger","tokenId":"token:generated-6203001-monster-2"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":22,"life":"living","profile":{"id":"combatant:generated-6203001-monster-3","kind":"monster","name":"Dire Wolf","rules":{"abilityScores":{"charisma":7,"constitution":15,"dexterity":15,"intelligence":3,"strength":17,"wisdom":12},"armorClass":14,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Beast","damageResponses":[],"detectionTraits":[],"hitPointMaximum":22,"initiativeBonus":2,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":-2,"constitution":2,"dexterity":2,"intelligence":-4,"strength":3,"wisdom":1},"senses":[{"kind":"normal_sight"},{"kind":"darkvision","rangeFeet":60}],"sizeCategory":"Large","skillBonuses":{"perception":5,"stealth":4},"speed":50,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:dire-wolf","tokenId":"token:generated-6203001-monster-3"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":23,"life":"living","profile":{"id":"combatant:generated-6203001-monster-4","kind":"monster","name":"Gloom Weaver","rules":{"abilityScores":{"charisma":6,"constitution":14,"dexterity":14,"intelligence":3,"strength":16,"wisdom":12},"armorClass":13,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Beast","damageResponses":[],"detectionTraits":["web_sense"],"hitPointMaximum":23,"initiativeBonus":2,"passivePerception":11,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":-2,"constitution":2,"dexterity":2,"intelligence":-4,"strength":3,"wisdom":1},"senses":[{"kind":"normal_sight"}],"sizeCategory":"Large","speed":34,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:homebrew-beast/gloom-weaver","tokenId":"token:generated-6203001-monster-4"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null}],"config":{"initiativeMode":"shared_enemy"},"dmNotes":["Deterministic generated room seed 6203001."],"effects":[],"environment":{"difficultTerrainRegions":[{"cells":[{"column":7,"row":5},{"column":7,"row":6},{"column":7,"row":7},{"column":8,"row":5},{"column":8,"row":6},{"column":8,"row":7},{"column":10,"row":5},{"column":10,"row":6},{"column":10,"row":7},{"column":11,"row":5},{"column":11,"row":6},{"column":11,"row":7}],"id":"difficult:generated-6203001-approach"},{"cells":[{"column":10,"row":9},{"column":11,"row":9},{"column":12,"row":9},{"column":13,"row":9},{"column":10,"row":10},{"column":11,"row":10},{"column":12,"row":10},{"column":13,"row":10}],"id":"difficult:generated-6203001-brutal-1"},{"cells":[{"column":11,"row":2},{"column":12,"row":2},{"column":11,"row":3},{"column":12,"row":3}],"id":"difficult:generated-6203001-brutal-2"},{"cells":[{"column":5,"row":11},{"column":6,"row":11},{"column":7,"row":11},{"column":5,"row":12},{"column":6,"row":12},{"column":7,"row":12}],"id":"difficult:generated-6203001-brutal-3"}],"lightRegions":[{"cells":[{"column":10,"row":2},{"column":11,"row":2},{"column":12,"row":2},{"column":10,"row":3},{"column":11,"row":3},{"column":12,"row":3}],"id":"light:world-object:generated-6203001-5","level":"bright"},{"cells":[{"column":12,"row":3},{"column":13,"row":3},{"column":14,"row":3},{"column":12,"row":4},{"column":13,"row":4},{"column":14,"row":4}],"id":"light:world-object:generated-6203001-6","level":"dim"}],"movementRegions":[],"obscurementRegions":[{"cells":[{"column":12,"row":11},{"column":13,"row":11},{"column":14,"row":11},{"column":12,"row":12},{"column":14,"row":12}],"id":"obscurement:generated-6203001-1","obscurement":"light"},{"cells":[{"column":6,"row":6},{"column":6,"row":7}],"id":"obscurement:generated-6203001-2","obscurement":"light"},{"cells":[{"column":7,"row":11},{"column":8,"row":11},{"column":10,"row":11},{"column":7,"row":12},{"column":8,"row":12},{"column":10,"row":12}],"id":"obscurement:generated-6203001-3","obscurement":"heavy"}]},"eventLog":[],"foggedCells":[],"hiddenCombatants":[],"hiddenRolls":[],"initiative":[],"nextDecisionSequence":1,"nextEffectSequence":1,"nextEventSequence":1,"nextPersistentAreaSequence":1,"nextWorldObjectSequence":1,"pendingDecisions":[],"persistentAreas":[],"phase":{"kind":"active"},"reactionPolicies":[],"revision":0,"round":0,"rulesEdition":"2024","tokens":[{"combatantId":"combatant:fighter","id":"token:fighter","position":{"column":1,"row":2}},{"combatantId":"combatant:cleric","id":"token:cleric","position":{"column":2,"row":4}},{"combatantId":"combatant:wizard","id":"token:wizard","position":{"column":1,"row":6}},{"combatantId":"combatant:generated-6203001-monster-1","id":"token:generated-6203001-monster-1","position":{"column":17,"row":1}},{"combatantId":"combatant:generated-6203001-monster-2","id":"token:generated-6203001-monster-2","position":{"column":16,"row":1}},{"combatantId":"combatant:generated-6203001-monster-3","id":"token:generated-6203001-monster-3","position":{"column":17,"row":3}},{"combatantId":"combatant:generated-6203001-monster-4","id":"token:generated-6203001-monster-4","position":{"column":16,"row":3}}],"worldObjects":[{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":6,"row":15}],"id":"world-object:generated-6203001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":6,"row":15}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":11,"row":12}],"id":"world-object:generated-6203001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":11,"row":12}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":13,"row":12}],"id":"world-object:generated-6203001-3","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":13,"row":12}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":16,"row":15}],"id":"world-object:generated-6203001-4","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":16,"row":15}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":16,"row":10}],"id":"world-object:generated-6203001-5","kind":"light-source","name":"Runed Brazier","position":{"column":16,"row":10}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":3,"row":13}],"id":"world-object:generated-6203001-6","kind":"light-source","name":"Runed Brazier","position":{"column":3,"row":13}}]}},"spec":{"blockedCells":[{"column":9,"row":0},{"column":9,"row":1},{"column":9,"row":2},{"column":9,"row":3},{"column":9,"row":4},{"column":9,"row":5},{"column":9,"row":7},{"column":9,"row":8},{"column":9,"row":9},{"column":9,"row":10},{"column":9,"row":11},{"column":9,"row":12},{"column":9,"row":13},{"column":9,"row":14},{"column":9,"row":15},{"column":9,"row":16}],"challengeBudgetEighths":72,"challengeSpentEighths":72,"difficultyProfile":"brutal","dimensions":{"columns":19,"rows":17},"hardFeatures":{"chokepointCells":[{"column":9,"row":6}],"likelyApproachTerrainRegionIds":["difficult:generated-6203001-approach"],"shape":"single-gate"},"monsterRoster":[{"challengeEighths":40,"challengeRating":5,"combatantId":"combatant:generated-6203001-monster-1","statblockId":"statblock:unicorn","tokenId":"token:generated-6203001-monster-1"},{"challengeEighths":16,"challengeRating":2,"combatantId":"combatant:generated-6203001-monster-2","statblockId":"statblock:saber-toothed-tiger","tokenId":"token:generated-6203001-monster-2"},{"challengeEighths":8,"challengeRating":1,"combatantId":"combatant:generated-6203001-monster-3","statblockId":"statblock:dire-wolf","tokenId":"token:generated-6203001-monster-3"},{"challengeEighths":8,"challengeRating":1,"combatantId":"combatant:generated-6203001-monster-4","statblockId":"statblock:homebrew-beast/gloom-weaver","tokenId":"token:generated-6203001-monster-4"}],"partyState":[{"combatantId":"combatant:fighter","concentrating":false,"deathSaves":null,"hitPointFraction":0.5,"hitPoints":34,"life":"living","spellSlots":[]},{"combatantId":"combatant:cleric","concentrating":false,"deathSaves":null,"hitPointFraction":0.25,"hitPoints":13,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":0,"spent":4},{"level":2,"maximum":3,"remaining":3,"spent":0},{"level":3,"maximum":3,"remaining":3,"spent":0},{"level":4,"maximum":1,"remaining":1,"spent":0}]},{"combatantId":"combatant:wizard","concentrating":false,"deathSaves":null,"hitPointFraction":1,"hitPoints":38,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":1,"spent":3},{"level":2,"maximum":3,"remaining":0,"spent":3},{"level":3,"maximum":3,"remaining":0,"spent":3},{"level":4,"maximum":1,"remaining":1,"spent":0}]}],"seed":6203001,"terrain":[{"cells":[{"column":7,"row":5},{"column":7,"row":6},{"column":7,"row":7},{"column":8,"row":5},{"column":8,"row":6},{"column":8,"row":7},{"column":10,"row":5},{"column":10,"row":6},{"column":10,"row":7},{"column":11,"row":5},{"column":11,"row":6},{"column":11,"row":7}],"id":"difficult:generated-6203001-approach","kind":"difficult-terrain-patch"},{"cells":[{"column":10,"row":9},{"column":11,"row":9},{"column":12,"row":9},{"column":13,"row":9},{"column":10,"row":10},{"column":11,"row":10},{"column":12,"row":10},{"column":13,"row":10}],"id":"difficult:generated-6203001-brutal-1","kind":"difficult-terrain-patch"},{"cells":[{"column":11,"row":2},{"column":12,"row":2},{"column":11,"row":3},{"column":12,"row":3}],"id":"difficult:generated-6203001-brutal-2","kind":"difficult-terrain-patch"},{"cells":[{"column":5,"row":11},{"column":6,"row":11},{"column":7,"row":11},{"column":5,"row":12},{"column":6,"row":12},{"column":7,"row":12}],"id":"difficult:generated-6203001-brutal-3","kind":"difficult-terrain-patch"},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":6,"row":15}],"id":"world-object:generated-6203001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":6,"row":15}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":11,"row":12}],"id":"world-object:generated-6203001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":11,"row":12}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":13,"row":12}],"id":"world-object:generated-6203001-3","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":13,"row":12}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":16,"row":15}],"id":"world-object:generated-6203001-4","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":16,"row":15}}},{"cells":[{"column":10,"row":2},{"column":11,"row":2},{"column":12,"row":2},{"column":10,"row":3},{"column":11,"row":3},{"column":12,"row":3}],"kind":"light-source","level":"bright","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":16,"row":10}],"id":"world-object:generated-6203001-5","kind":"light-source","name":"Runed Brazier","position":{"column":16,"row":10}}},{"cells":[{"column":12,"row":3},{"column":13,"row":3},{"column":14,"row":3},{"column":12,"row":4},{"column":13,"row":4},{"column":14,"row":4}],"kind":"light-source","level":"dim","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":3,"row":13}],"id":"world-object:generated-6203001-6","kind":"light-source","name":"Runed Brazier","position":{"column":3,"row":13}}},{"cells":[{"column":12,"row":11},{"column":13,"row":11},{"column":14,"row":11},{"column":12,"row":12},{"column":14,"row":12}],"id":"obscurement:generated-6203001-1","kind":"obscurement-patch","obscurement":"light"},{"cells":[{"column":6,"row":6},{"column":6,"row":7}],"id":"obscurement:generated-6203001-2","kind":"obscurement-patch","obscurement":"light"},{"cells":[{"column":7,"row":11},{"column":8,"row":11},{"column":10,"row":11},{"column":7,"row":12},{"column":8,"row":12},{"column":10,"row":12}],"id":"obscurement:generated-6203001-3","kind":"obscurement-patch","obscurement":"heavy"}]}}
tests/fixtures/arena-basis-hard/seed-5117001.json:1:{"encounter":{"provenance":{"licenseTag":"MIT","seed":5117001,"source":"generated"},"schemaVersion":1,"state":{"activeCombatant":null,"activeInitiativeIndex":null,"blockedCells":[{"column":8,"row":0},{"column":8,"row":1},{"column":8,"row":2},{"column":8,"row":3},{"column":8,"row":4},{"column":8,"row":5},{"column":8,"row":6},{"column":8,"row":7},{"column":8,"row":8},{"column":8,"row":9},{"column":8,"row":10},{"column":8,"row":11},{"column":8,"row":12},{"column":8,"row":13},{"column":8,"row":14},{"column":8,"row":15},{"column":8,"row":16},{"column":8,"row":18},{"column":8,"row":19},{"column":8,"row":20},{"column":8,"row":21}],"bounds":{"columns":17,"rows":22},"combatants":[{"deathAt":null,"deathSaves":null,"hitPoints":67,"life":"living","profile":{"characterId":1,"id":"combatant:fighter","kind":"player_character","name":"Reference Fighter","rules":{"armorClass":18,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":67,"initiativeBonus":100,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":true},"tokenId":"token:fighter","wildShape":null},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":13,"life":"living","profile":{"characterId":2,"id":"combatant:cleric","kind":"player_character","name":"Reference Cleric","rules":{"armorClass":18,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":52,"initiativeBonus":70,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:cleric","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":2},{"level":2,"maximum":3,"remaining":1},{"level":3,"maximum":3,"remaining":1},{"level":4,"maximum":1,"remaining":0}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":29,"life":"living","profile":{"characterId":3,"id":"combatant:wizard","kind":"player_character","name":"Reference Wizard","rules":{"armorClass":15,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":40,"passivePerception":12,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":3,"dexterity":2,"intelligence":1,"strength":3,"wisdom":2},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[{"level":1,"maximum":4},{"level":2,"maximum":3},{"level":3,"maximum":3},{"level":4,"maximum":1}],"usesDeathSaves":true},"tokenId":"token:wizard","wildShape":null},"spellSlots":[{"level":1,"maximum":4,"remaining":0},{"level":2,"maximum":3,"remaining":2},{"level":3,"maximum":3,"remaining":0},{"level":4,"maximum":1,"remaining":0}],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":38,"life":"living","limitedResources":[{"id":"monster-spell:spellcasting:spirit-guardians","maximum":1,"recharge":"long_rest","remaining":1},{"id":"monster-spell:divine-aid:bless","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:dispel-magic","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:healing-word","maximum":3,"recharge":"long_rest","remaining":3},{"id":"monster-spell:divine-aid:lesser-restoration","maximum":3,"recharge":"long_rest","remaining":3}],"profile":{"id":"combatant:generated-5117001-monster-1","kind":"monster","name":"Priest","rules":{"abilityScores":{"charisma":13,"constitution":12,"dexterity":10,"intelligence":13,"strength":16,"wisdom":16},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":38,"initiativeBonus":0,"limitedResources":[{"id":"monster-spell:spellcasting:spirit-guardians","maximum":1,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:bless","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:dispel-magic","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:healing-word","maximum":3,"recharge":"long_rest"},{"id":"monster-spell:divine-aid:lesser-restoration","maximum":3,"recharge":"long_rest"}],"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":1,"constitution":1,"dexterity":0,"intelligence":1,"strength":3,"wisdom":3},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"medicine":7,"perception":5,"religion":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:priest","tokenId":"token:generated-5117001-monster-1"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":11,"life":"living","profile":{"id":"combatant:generated-5117001-monster-2","kind":"monster","name":"Guard","rules":{"abilityScores":{"charisma":10,"constitution":12,"dexterity":12,"intelligence":10,"strength":13,"wisdom":11},"armorClass":16,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":11,"initiativeBonus":1,"passivePerception":12,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":1,"intelligence":0,"strength":1,"wisdom":0},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"perception":2},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-2"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":16,"life":"living","profile":{"id":"combatant:generated-5117001-monster-3","kind":"monster","name":"Scout","rules":{"abilityScores":{"charisma":11,"constitution":12,"dexterity":14,"intelligence":11,"strength":11,"wisdom":13},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":16,"initiativeBonus":2,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":2,"intelligence":0,"strength":0,"wisdom":1},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"nature":4,"perception":5,"stealth":6,"survival":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-3"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":16,"life":"living","profile":{"id":"combatant:generated-5117001-monster-4","kind":"monster","name":"Scout","rules":{"abilityScores":{"charisma":11,"constitution":12,"dexterity":14,"intelligence":11,"strength":11,"wisdom":13},"armorClass":13,"attacksPerAction":2,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":16,"initiativeBonus":2,"passivePerception":15,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":2,"intelligence":0,"strength":0,"wisdom":1},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"nature":4,"perception":5,"stealth":6,"survival":5},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-4"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":11,"life":"living","profile":{"id":"combatant:generated-5117001-monster-5","kind":"monster","name":"Guard","rules":{"abilityScores":{"charisma":10,"constitution":12,"dexterity":12,"intelligence":10,"strength":13,"wisdom":11},"armorClass":16,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":11,"initiativeBonus":1,"passivePerception":12,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":1,"dexterity":1,"intelligence":0,"strength":1,"wisdom":0},"senses":[{"kind":"normal_sight"}],"skillBonuses":{"perception":2},"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-5"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null},{"deathAt":null,"deathSaves":null,"hitPoints":32,"life":"living","profile":{"id":"combatant:generated-5117001-monster-6","kind":"monster","name":"Tough","rules":{"abilityScores":{"charisma":11,"constitution":14,"dexterity":12,"intelligence":10,"strength":15,"wisdom":10},"armorClass":12,"attacksPerAction":1,"conditionImmunities":[],"contactMedium":"surface","creatureType":"Humanoid","damageResponses":[],"detectionTraits":[],"hitPointMaximum":32,"initiativeBonus":1,"passivePerception":10,"proficiencyBonus":2,"reach":5,"savingThrowBonuses":{"charisma":0,"constitution":2,"dexterity":1,"intelligence":0,"strength":2,"wisdom":0},"senses":[{"kind":"normal_sight"}],"speed":30,"spellSlots":[],"usesDeathSaves":false},"statblockId":"statblock:tough","tokenId":"token:generated-5117001-monster-6"},"spellSlots":[],"temporaryHitPoints":0,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"disengaging":false,"dodging":false,"movement":{"remaining":0,"speed":0,"spent":0},"reactionAvailable":false},"wildShapeUses":null}],"config":{"initiativeMode":"shared_enemy"},"dmNotes":["Deterministic generated room seed 5117001."],"effects":[],"environment":{"difficultTerrainRegions":[{"cells":[{"column":6,"row":16},{"column":6,"row":17},{"column":6,"row":18},{"column":7,"row":16},{"column":7,"row":17},{"column":7,"row":18},{"column":9,"row":16},{"column":9,"row":17},{"column":9,"row":18},{"column":10,"row":16},{"column":10,"row":17},{"column":10,"row":18}],"id":"difficult:generated-5117001-approach"}],"lightRegions":[{"cells":[{"column":3,"row":13},{"column":4,"row":13},{"column":5,"row":13},{"column":6,"row":13},{"column":3,"row":14},{"column":4,"row":14},{"column":5,"row":14},{"column":6,"row":14}],"id":"light:world-object:generated-5117001-3","level":"bright"},{"cells":[{"column":9,"row":4},{"column":10,"row":4},{"column":11,"row":4},{"column":9,"row":5},{"column":10,"row":5},{"column":11,"row":5},{"column":12,"row":5},{"column":9,"row":6},{"column":10,"row":6},{"column":11,"row":6},{"column":12,"row":6},{"column":9,"row":7},{"column":10,"row":7},{"column":11,"row":7},{"column":12,"row":7}],"id":"light:world-object:generated-5117001-4","level":"bright"}],"movementRegions":[],"obscurementRegions":[]},"eventLog":[],"foggedCells":[],"hiddenCombatants":[],"hiddenRolls":[],"initiative":[],"nextDecisionSequence":1,"nextEffectSequence":1,"nextEventSequence":1,"nextPersistentAreaSequence":1,"nextWorldObjectSequence":1,"pendingDecisions":[],"persistentAreas":[],"phase":{"kind":"active"},"reactionPolicies":[],"revision":0,"round":0,"rulesEdition":"2024","tokens":[{"combatantId":"combatant:fighter","id":"token:fighter","position":{"column":1,"row":2}},{"combatantId":"combatant:cleric","id":"token:cleric","position":{"column":2,"row":4}},{"combatantId":"combatant:wizard","id":"token:wizard","position":{"column":1,"row":6}},{"combatantId":"combatant:generated-5117001-monster-1","id":"token:generated-5117001-monster-1","position":{"column":15,"row":1}},{"combatantId":"combatant:generated-5117001-monster-2","id":"token:generated-5117001-monster-2","position":{"column":14,"row":1}},{"combatantId":"combatant:generated-5117001-monster-3","id":"token:generated-5117001-monster-3","position":{"column":15,"row":3}},{"combatantId":"combatant:generated-5117001-monster-4","id":"token:generated-5117001-monster-4","position":{"column":14,"row":3}},{"combatantId":"combatant:generated-5117001-monster-5","id":"token:generated-5117001-monster-5","position":{"column":15,"row":5}},{"combatantId":"combatant:generated-5117001-monster-6","id":"token:generated-5117001-monster-6","position":{"column":14,"row":5}}],"worldObjects":[{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":15,"row":17}],"id":"world-object:generated-5117001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":15,"row":17}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":10}],"id":"world-object:generated-5117001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":12,"row":10}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":5,"row":3}],"id":"world-object:generated-5117001-3","kind":"light-source","name":"Runed Brazier","position":{"column":5,"row":3}},{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":4}],"id":"world-object:generated-5117001-4","kind":"light-source","name":"Runed Brazier","position":{"column":12,"row":4}}]}},"spec":{"blockedCells":[{"column":8,"row":0},{"column":8,"row":1},{"column":8,"row":2},{"column":8,"row":3},{"column":8,"row":4},{"column":8,"row":5},{"column":8,"row":6},{"column":8,"row":7},{"column":8,"row":8},{"column":8,"row":9},{"column":8,"row":10},{"column":8,"row":11},{"column":8,"row":12},{"column":8,"row":13},{"column":8,"row":14},{"column":8,"row":15},{"column":8,"row":16},{"column":8,"row":18},{"column":8,"row":19},{"column":8,"row":20},{"column":8,"row":21}],"challengeBudgetEighths":32,"challengeSpentEighths":30,"difficultyProfile":"hard","dimensions":{"columns":17,"rows":22},"hardFeatures":{"chokepointCells":[{"column":8,"row":17}],"likelyApproachTerrainRegionIds":["difficult:generated-5117001-approach"],"shape":"single-gate"},"monsterRoster":[{"challengeEighths":16,"challengeRating":2,"combatantId":"combatant:generated-5117001-monster-1","statblockId":"statblock:priest","tokenId":"token:generated-5117001-monster-1"},{"challengeEighths":1,"challengeRating":"1/8","combatantId":"combatant:generated-5117001-monster-2","statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-2"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117001-monster-3","statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-3"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117001-monster-4","statblockId":"statblock:scout","tokenId":"token:generated-5117001-monster-4"},{"challengeEighths":1,"challengeRating":"1/8","combatantId":"combatant:generated-5117001-monster-5","statblockId":"statblock:guard","tokenId":"token:generated-5117001-monster-5"},{"challengeEighths":4,"challengeRating":"1/2","combatantId":"combatant:generated-5117001-monster-6","statblockId":"statblock:tough","tokenId":"token:generated-5117001-monster-6"}],"partyState":[{"combatantId":"combatant:fighter","concentrating":false,"deathSaves":null,"hitPointFraction":1,"hitPoints":67,"life":"living","spellSlots":[]},{"combatantId":"combatant:cleric","concentrating":false,"deathSaves":null,"hitPointFraction":0.25,"hitPoints":13,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":2,"spent":2},{"level":2,"maximum":3,"remaining":1,"spent":2},{"level":3,"maximum":3,"remaining":1,"spent":2},{"level":4,"maximum":1,"remaining":0,"spent":1}]},{"combatantId":"combatant:wizard","concentrating":false,"deathSaves":null,"hitPointFraction":0.75,"hitPoints":29,"life":"living","spellSlots":[{"level":1,"maximum":4,"remaining":0,"spent":4},{"level":2,"maximum":3,"remaining":2,"spent":1},{"level":3,"maximum":3,"remaining":0,"spent":3},{"level":4,"maximum":1,"remaining":0,"spent":1}]}],"seed":5117001,"terrain":[{"cells":[{"column":6,"row":16},{"column":6,"row":17},{"column":6,"row":18},{"column":7,"row":16},{"column":7,"row":17},{"column":7,"row":18},{"column":9,"row":16},{"column":9,"row":17},{"column":9,"row":18},{"column":10,"row":16},{"column":10,"row":17},{"column":10,"row":18}],"id":"difficult:generated-5117001-approach","kind":"difficult-terrain-patch"},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":15,"row":17}],"id":"world-object:generated-5117001-1","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":15,"row":17}}},{"kind":"hazard-object","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":10}],"id":"world-object:generated-5117001-2","kind":"hazard","name":"Unstable Arcane Vent","position":{"column":12,"row":10}}},{"cells":[{"column":3,"row":13},{"column":4,"row":13},{"column":5,"row":13},{"column":6,"row":13},{"column":3,"row":14},{"column":4,"row":14},{"column":5,"row":14},{"column":6,"row":14}],"kind":"light-source","level":"bright","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":5,"row":3}],"id":"world-object:generated-5117001-3","kind":"light-source","name":"Runed Brazier","position":{"column":5,"row":3}}},{"cells":[{"column":9,"row":4},{"column":10,"row":4},{"column":11,"row":4},{"column":9,"row":5},{"column":10,"row":5},{"column":11,"row":5},{"column":12,"row":5},{"column":9,"row":6},{"column":10,"row":6},{"column":11,"row":6},{"column":12,"row":6},{"column":9,"row":7},{"column":10,"row":7},{"column":11,"row":7},{"column":12,"row":7}],"kind":"light-source","level":"bright","object":{"armorClass":15,"blocking":{"cover":"none","lineOfSight":false,"movement":false},"createdRevision":0,"damageResponses":[],"durability":{"kind":"indestructible"},"footprint":[{"column":12,"row":4}],"id":"world-object:generated-5117001-4","kind":"light-source","name":"Runed Brazier","position":{"column":12,"row":4}}}]}}

exec
/bin/bash -lc "rg -n \"export function projectDmView|function projectDmView|interface Dm|foggedCells\" src/combat/visibility.ts src/combat/encounter.ts src/vtt/encounter-projections.ts
sed -n '780,900p' src/combat/visibility.ts
sed -n '3300,3480p' src/vtt/session-persistence.ts
sed -n '3400,3475p' src/vtt/session-persistence.ts
sed -n '1220,1290p' src/vtt/session-persistence.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
src/vtt/encounter-projections.ts:136:export interface DmBoardProjection {
src/vtt/encounter-projections.ts:194:export interface DmPendingPlacementRecovery {
src/vtt/encounter-projections.ts:230:export interface DmMovementPathPreview extends MovementPathDangerPreview {
src/vtt/encounter-projections.ts:260:export interface DmDecisionTrayProjection {
src/combat/visibility.ts:93:  readonly foggedCells: readonly GridCell[];
src/combat/visibility.ts:97:export interface DmView {
src/combat/visibility.ts:201:interface DmVisibleCombatantDetails {
src/combat/visibility.ts:299:export interface DmVisibleEncounterState {
src/combat/visibility.ts:315:    readonly foggedCells: readonly GridCell[];
src/combat/visibility.ts:506:export function projectDmView(state: EncounterState): DmView {
src/combat/visibility.ts:524:      foggedCells: derivedFogCells(state, visibilityObserverIds),
src/combat/visibility.ts:735:      foggedCells: state.foggedCells.map((cell) => ({ ...cell })),
  }
}

function migrateSavedBundle(value: unknown): SavedSessionBundleV2 {
  validateVttSessionMigrationRegistry();
  if (isRecord(value) && value.format === JOURNAL_DAG_FORMAT) {
    if (value.schemaVersion === VTT_SESSION_SCHEMA_VERSION) return decodeJournalDagBundle(value);
    if (
      (value.schemaVersion !== 7 && value.schemaVersion !== 8 && value.schemaVersion !== 9 &&
        value.schemaVersion !== 10 && value.schemaVersion !== 11) ||
      typeof value.sessionId !== 'string' ||
      typeof value.fingerprint !== 'string'
    ) throw new TypeError('Saved VTT session journal DAG header is malformed.');
    const legacySchemaVersion = value.schemaVersion;
    const legacyBody = {
      format: JOURNAL_DAG_FORMAT,
      schemaVersion: legacySchemaVersion,
      sessionId: value.sessionId,
      nodes: value.nodes,
      revisions: value.revisions,
    };
    if (sha256(canonicalJson(legacyBody)) !== value.fingerprint) {
      throw new SessionFingerprintMismatchError();
    }
    const expandedLegacyBody = {
      format: 'vtt-session-revisions',
      schemaVersion: legacySchemaVersion,
      sessionId: value.sessionId,
      revisions: decodeJournalDagValues(value.nodes, value.revisions),
    };
    value = {
      ...expandedLegacyBody,
      fingerprint: sha256(canonicalJson(expandedLegacyBody)),
    };
  }
  if (!isRecord(value) || !Number.isSafeInteger(value.schemaVersion)) {
    throw new TypeError('Saved VTT session has no valid schema version.');
  }
  let migrated: Readonly<Record<string, unknown>> = value;
  let version: number = value.schemaVersion as number;
  if (
    version < VTT_SESSION_MINIMUM_SCHEMA_VERSION ||
    version > VTT_SESSION_SCHEMA_VERSION
  ) {
    throw new Error('Saved VTT session is outside the migration window.');
  }
  while (version < VTT_SESSION_SCHEMA_VERSION) {
    const migration = VTT_SESSION_MIGRATIONS.find(
      (candidate) => candidate.from === version,
    );
    if (migration === undefined) {
      throw new Error('Saved VTT session has no adjacent migration.');
    }
    migrated = migration.migrate(migrated);
    version = migration.to;
  }
  if (
    migrated.format !== 'vtt-session-revisions' ||
    migrated.schemaVersion !== VTT_SESSION_SCHEMA_VERSION ||
    typeof migrated.sessionId !== 'string' ||
    !Array.isArray(migrated.revisions) ||
    typeof migrated.fingerprint !== 'string'
  ) {
    throw new TypeError('Saved VTT session bundle is malformed.');
  }
  const body: SavedSessionBundleV2Body = {
    format: 'vtt-session-revisions',
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId: migrated.sessionId as EncounterSessionId,
    revisions: migrated.revisions.map(decodeRevision),
  };
  if (sessionFingerprint(body) !== migrated.fingerprint) {
    throw new SessionFingerprintMismatchError();
  }
  return { ...body, fingerprint: migrated.fingerprint };
}

export function migrateStoredSessionRevisions(
  revisions: readonly unknown[],
): readonly SessionRevision[] {
  const first = revisions[0];
  if (
    !isRecord(first) ||
    typeof first.sessionId !== 'string' ||
    !Number.isSafeInteger(first.schemaVersion)
  ) throw new TypeError('Stored VTT session revision stream is malformed.');
  const groups: Array<{
    readonly schemaVersion: number;
    readonly revisions: unknown[];
  }> = [];
  for (const revision of revisions) {
    if (
      !isRecord(revision) ||
      revision.sessionId !== first.sessionId ||
      !Number.isSafeInteger(revision.schemaVersion)
    ) throw new TypeError('Stored VTT session revision stream is malformed.');
    const schemaVersion = revision.schemaVersion as number;
    const current = groups.at(-1);
    if (current?.schemaVersion === schemaVersion) current.revisions.push(revision);
    else groups.push({ schemaVersion, revisions: [revision] });
  }
  return groups.flatMap((group) => {
    const body = {
      format: 'vtt-session-revisions' as const,
      schemaVersion: group.schemaVersion,
      sessionId: first.sessionId,
      revisions: group.revisions,
    };
    return migrateSavedBundle({
      ...body,
      fingerprint: sha256(canonicalJson(body)),
    }).revisions;
  });
}

export function exportSavedSession(
  store: SessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId);
  if (revisions.length === 0) throw new Error('Encounter session does not exist.');
  replaySessionRevisions(revisions);
  const encoded = encodeJournalDag(revisions);
  const body: JournalDagBundleBody = {
    format: JOURNAL_DAG_FORMAT,
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId,
    ...encoded,
  };
  return canonicalJson({
    ...body,
    fingerprint: sha256(canonicalJson(body)),
    sessionRecord: deriveSessionRecord(revisions),
  } satisfies JournalDagBundle);
}

/** Decodes, fingerprints, and replays a save without importing it. */
export function decodeSavedSessionFingerprint(
  bytes: string,
): DecodedSavedSessionFingerprint {
  const bundle = migrateSavedBundle(JSON.parse(bytes));
  const latest = replaySessionRevisions(bundle.revisions);
  return {
    sessionId: bundle.sessionId,
    fingerprint: bundle.fingerprint,
    revisionCount: bundle.revisions.length,
    room: latest.partyState?.room ?? null,
    round: latest.encounterState.round,
    initialSeed: latest.rngState.initialSeed,
  };
}

export function importSavedSession(
  store: SessionStore,
  bytes: string,
): EncounterSessionId {
  const bundle = migrateSavedBundle(JSON.parse(bytes));
  if (store.revisions(bundle.sessionId).length !== 0) {
    throw new Error('Imported encounter session already exists.');
  }
  verifyRevisionSequence(bundle.revisions, bundle.sessionId);
  store.appendAll(bundle.revisions);
  return bundle.sessionId;
}

export function exportSavedSessionV1ForMigrationTest(
  store: SessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId).map((revision) => {
    const {
      checksum: _checksum,
      partyState: _partyState,
      branchRngStateFingerprint: _branchRngStateFingerprint,
      agentSession,
      encounterState,
      ...currentBody
    } = revision;
    const { hiddenRolls, ...legacyEncounterState } = encounterState;
    const body = {
      ...currentBody,
  }
  return groups.flatMap((group) => {
    const body = {
      format: 'vtt-session-revisions' as const,
      schemaVersion: group.schemaVersion,
      sessionId: first.sessionId,
      revisions: group.revisions,
    };
    return migrateSavedBundle({
      ...body,
      fingerprint: sha256(canonicalJson(body)),
    }).revisions;
  });
}

export function exportSavedSession(
  store: SessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId);
  if (revisions.length === 0) throw new Error('Encounter session does not exist.');
  replaySessionRevisions(revisions);
  const encoded = encodeJournalDag(revisions);
  const body: JournalDagBundleBody = {
    format: JOURNAL_DAG_FORMAT,
    schemaVersion: VTT_SESSION_SCHEMA_VERSION,
    sessionId,
    ...encoded,
  };
  return canonicalJson({
    ...body,
    fingerprint: sha256(canonicalJson(body)),
    sessionRecord: deriveSessionRecord(revisions),
  } satisfies JournalDagBundle);
}

/** Decodes, fingerprints, and replays a save without importing it. */
export function decodeSavedSessionFingerprint(
  bytes: string,
): DecodedSavedSessionFingerprint {
  const bundle = migrateSavedBundle(JSON.parse(bytes));
  const latest = replaySessionRevisions(bundle.revisions);
  return {
    sessionId: bundle.sessionId,
    fingerprint: bundle.fingerprint,
    revisionCount: bundle.revisions.length,
    room: latest.partyState?.room ?? null,
    round: latest.encounterState.round,
    initialSeed: latest.rngState.initialSeed,
  };
}

export function importSavedSession(
  store: SessionStore,
  bytes: string,
): EncounterSessionId {
  const bundle = migrateSavedBundle(JSON.parse(bytes));
  if (store.revisions(bundle.sessionId).length !== 0) {
    throw new Error('Imported encounter session already exists.');
  }
  verifyRevisionSequence(bundle.revisions, bundle.sessionId);
  store.appendAll(bundle.revisions);
  return bundle.sessionId;
}

export function exportSavedSessionV1ForMigrationTest(
  store: SessionStore,
  sessionId: EncounterSessionId,
): string {
  const revisions = store.revisions(sessionId).map((revision) => {
    const {
      checksum: _checksum,
      partyState: _partyState,
      branchRngStateFingerprint: _branchRngStateFingerprint,
      agentSession,
      encounterState,
  const playerCharacters = encounter.combatants.filter(
    (subject) => subject.profile.kind === 'player_character',
  );
  if (playerCharacters.length !== party.characters.length) {
    throw new Error('Composed room does not contain the persisted party.');
  }
  for (const persisted of party.characters) {
    const subject = playerCharacters.find((candidate) => candidate.profile.id === persisted.combatantId);
    if (subject === undefined) throw new Error('Composed room omitted a persisted party character.');
    requireCanonicalEqual(subject.hitPoints, persisted.currentHitPoints, 'preloaded party Hit Points');
    requireCanonicalEqual(subject.life, persisted.life, 'preloaded party life state');
    requireCanonicalEqual(subject.deathSaves, persisted.deathSaves, 'preloaded party death state');
    requireCanonicalEqual(
      subject.spellSlots.map((slot) => ({
        level: slot.level,
        maximum: slot.maximum,
        remaining: slot.remaining,
        recharge: slot.recharge ?? 'long_rest',
      })),
      persisted.spellSlots.map((slot) => ({
        level: slot.level,
        maximum: slot.maximum,
        remaining: slot.remaining,
        recharge: slot.recharge,
      })),
      'preloaded party spell slots',
    );
    requireCanonicalEqual(
      subject.limitedResources ?? [],
      persisted.limitedResources,
      'preloaded party limited resources',
    );
  }
}

/**
 * Rebuilds and verifies every revision against its declared parent. The full
 * state held on a revision is a checked recovery cache: reducer transitions
 * must reproduce it from parent state + parent RNG, while coordinator-only
 * transitions must leave both unchanged.
 */
export function replaySessionRevisions(
  revisions: readonly SessionRevision[],
): SessionRevision {
  const first = revisions[0];
  if (first === undefined || decodeTransition(first.transition).kind !== 'session_started') {
    throw new Error('Session stream must begin with session_started.');
  }
  verifyRevisionSequence(revisions, first.sessionId);
  const byRevision = new Map<number, SessionRevision>();
  for (const revision of revisions) {
    const transition = decodeTransition(revision.transition);
    const parent = revision.parentRevision === null
      ? null
      : byRevision.get(revision.parentRevision);
    if (revision.parentRevision !== null && parent === undefined) {
      throw new Error('Session replay cannot find a declared parent.');
    }
    switch (transition.kind) {
      case 'session_started':
        if (revision.revision !== 1 || parent !== null) {
          throw new Error('session_started may only be the first revision.');
        }
        if (revision.agentSession !== null && (
          revision.agentSession.cli !== 'codex' ||
          revision.agentSession.status !== 'active' ||
          revision.agentSession.generation !== 0 ||
          revision.agentSession.predecessorSessionHash !== null ||
          revision.agentSession.startedAtRevision !== 1
        )) {
          throw new Error('Migrated session_started agent binding is malformed.');

exec
/bin/bash -lc "sed -n '285,330p' src/combat/visibility.ts
sed -n '490,535p' src/combat/visibility.ts
sed -n '710,745p' src/combat/visibility.ts
rg -n \"function decodeRevision|const decodeRevision|decodeRevision\\(\" src/vtt/session-persistence.ts
sed -n '1230,1305p' src/vtt/session-persistence.ts
rg -n \"function projectTopDownDm|TopDownDmBoardProjection|projectDmBoard|projectDmEncounter\" src/vtt/encounter-projections.ts src/vtt/encounter-app.ts | head -80" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
  /** Cells that exist for this seat. Fogged cells are absent, not flagged. */
  readonly cells: readonly GridCell[];
  /** Per-seat concealed cells, including a cell occupied by a Hidden combatant. */
  readonly concealedCells: readonly GridCell[];
  readonly blockedCells: readonly GridCell[];
  readonly worldObjects: EncounterState['worldObjects'];
  readonly combatants: readonly PlayerVisibleCombatant[];
  /** Last-known anchors only; no current unperceived geometry enters this view. */
  readonly lastSeen: readonly PlayerLastSeenCombatant[];
  readonly ownedCombatants: readonly PlayerOwnedCombatant[];
  readonly recentEvents: readonly PlayerVisibleEncounterEvent[];
}

/** Compact DM-facing summary used by controllers and bridge envelopes. */
export interface DmVisibleEncounterState {
  readonly viewer: 'dm';
  readonly phase: EncounterState['phase'];
  readonly revision: number;
  readonly round: number;
  readonly activeCombatant: CombatantId | null;
  readonly hiddenRolls: readonly HiddenRollCategory[];
  readonly bounds: EncounterState['bounds'];
  readonly blockedCells: readonly GridCell[];
  readonly worldObjects: EncounterState['worldObjects'];
  readonly environment: EncounterState['environment'];
  readonly combatants: readonly DmVisibleCombatant[];
  readonly sharedSpaceRelations: EncounterState['sharedSpaceRelations'];
  readonly adjudicationPending: EncounterState['adjudicationPending'];
  readonly recentEvents: readonly EncounterEvent[];
  readonly dmOnly: {
    readonly foggedCells: readonly GridCell[];
    readonly notes: readonly string[];
  };
}

export type PlayerVisibleEncounterState = PlayerView;
export type VisibleEncounterState = PlayerView | DmVisibleEncounterState;

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function allCells(bounds: EncounterState['bounds']): readonly GridCell[] {
  const cells: GridCell[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) {
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
      return [{
        id: subject.profile.id,
        name: subject.profile.name,
        kind: combatantSide(state, subject.profile.id),
        hitPoints: subject.hitPoints,
        life: subject.life,
        placementStatus: 'placed',
        position: { ...token.position },
        effectiveSize: effectiveCreatureSize(state, subject.profile.id),
        placementMode: structuredClone(token.placementMode),
        footprint: space.cells.map((cell) => ({ ...cell })) as [GridCell, ...GridCell[]],
        active: state.activeCombatant === subject.profile.id,
        formName: subject.wildShape?.formName ?? subject.form?.formName ?? null,
        rules: structuredClone(effectiveCombatRules(state, subject.profile.id)),
        deathSaves: structuredClone(subject.deathSaves),
        turn: structuredClone(subject.turn),
        spellSlots: structuredClone(subject.spellSlots),
        hiddenFromPlayers: state.hiddenCombatants.some((entry) => entry.combatant === subject.profile.id),
        conditions: playerVisibleConditions(state, subject.profile.id, true),
      }];
    }),
    sharedSpaceRelations: structuredClone(state.sharedSpaceRelations),
    adjudicationPending: structuredClone(state.adjudicationPending),
    recentEvents: structuredClone(state.eventLog),
    dmOnly: {
      foggedCells: state.foggedCells.map((cell) => ({ ...cell })),
      notes: [...state.dmNotes],
    },
  };
}
942:function decodeRevision(value: unknown): SessionRevision {
    requireCanonicalEqual(subject.life, persisted.life, 'preloaded party life state');
    requireCanonicalEqual(subject.deathSaves, persisted.deathSaves, 'preloaded party death state');
    requireCanonicalEqual(
      subject.spellSlots.map((slot) => ({
        level: slot.level,
        maximum: slot.maximum,
        remaining: slot.remaining,
        recharge: slot.recharge ?? 'long_rest',
      })),
      persisted.spellSlots.map((slot) => ({
        level: slot.level,
        maximum: slot.maximum,
        remaining: slot.remaining,
        recharge: slot.recharge,
      })),
      'preloaded party spell slots',
    );
    requireCanonicalEqual(
      subject.limitedResources ?? [],
      persisted.limitedResources,
      'preloaded party limited resources',
    );
  }
}

/**
 * Rebuilds and verifies every revision against its declared parent. The full
 * state held on a revision is a checked recovery cache: reducer transitions
 * must reproduce it from parent state + parent RNG, while coordinator-only
 * transitions must leave both unchanged.
 */
export function replaySessionRevisions(
  revisions: readonly SessionRevision[],
): SessionRevision {
  const first = revisions[0];
  if (first === undefined || decodeTransition(first.transition).kind !== 'session_started') {
    throw new Error('Session stream must begin with session_started.');
  }
  verifyRevisionSequence(revisions, first.sessionId);
  const byRevision = new Map<number, SessionRevision>();
  for (const revision of revisions) {
    const transition = decodeTransition(revision.transition);
    const parent = revision.parentRevision === null
      ? null
      : byRevision.get(revision.parentRevision);
    if (revision.parentRevision !== null && parent === undefined) {
      throw new Error('Session replay cannot find a declared parent.');
    }
    switch (transition.kind) {
      case 'session_started':
        if (revision.revision !== 1 || parent !== null) {
          throw new Error('session_started may only be the first revision.');
        }
        if (revision.agentSession !== null && (
          revision.agentSession.cli !== 'codex' ||
          revision.agentSession.status !== 'active' ||
          revision.agentSession.generation !== 0 ||
          revision.agentSession.predecessorSessionHash !== null ||
          revision.agentSession.startedAtRevision !== 1
        )) {
          throw new Error('Migrated session_started agent binding is malformed.');
        }
        break;
      case 'agent_session_started':
        if (parent === null || parent === undefined || parent.agentSession !== null) {
          throw new Error('agent_session_started requires an unbound parent revision.');
        }
        requireCanonicalEqual(revision.agentSession, transition.binding, 'started agent binding');
        if (
          transition.binding.status !== 'active' ||
          transition.binding.generation !== 0 ||
          transition.binding.predecessorSessionHash !== null ||
          transition.binding.startedAtRevision !== revision.revision ||
          transition.binding.lastDispatchedRevision !== 0
        ) throw new Error('Initial agent session binding is malformed.');
        requireCanonicalEqual(revision.encounterState, parent.encounterState, 'agent-start encounter state');
src/vtt/encounter-app.ts:58:  type TopDownDmBoardProjection,
src/vtt/encounter-app.ts:119:  projection: TopDownDmBoardProjection,
src/vtt/encounter-app.ts:120:): TopDownDmBoardProjection {
src/vtt/encounter-app.ts:1417:  #projection: TopDownDmBoardProjection | null = null;
src/vtt/encounter-app.ts:2207:  #renderDmBoard(projection: TopDownDmBoardProjection): void {
src/vtt/encounter-app.ts:2300:    projection: TopDownDmBoardProjection,
src/vtt/encounter-app.ts:2315:  #renderBlindStateSnapshot(projection: TopDownDmBoardProjection): void {
src/vtt/encounter-projections.ts:222:export type TopDownDmBoardProjection = Omit<
src/vtt/encounter-projections.ts:399:export function projectDmBoard(input: {

exec
/bin/bash -lc "sed -n '70,115p' src/combat/visibility.ts
sed -n '506,590p' src/combat/visibility.ts
sed -n '390,505p' src/vtt/encounter-projections.ts
sed -n '930,990p' src/vtt/session-persistence.ts
sed -n '100,135p' src/vtt/encounter-app.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
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
            : [])
      : [],
    authorityStatus: 'connected',
    partySession: partyState === null
      ? null
      : projectPlayerPartySession(partyState, [...ownerIds]),
  };
}

export function projectDmBoard(input: {
  readonly view: DmView;
  readonly coordinator: PersistedCoordinatorState;
  readonly controllers: readonly ControllerIdentity[];
  readonly history: readonly SessionHistoryEntry[];
  readonly partyState?: PartySessionState | null;
  readonly boundaryRefusal?: DmDecisionTrayProjection['boundaryRefusal'];
  readonly actionRefusal?: NonBoundaryActionRefusal | null;
  readonly adjudicationPrompts?: readonly Extract<PendingDecision, { readonly kind: 'adjudication_prompt' }>[];
  readonly engineAdjudications?: readonly AdjudicationEnvelope[];
  readonly offerEnvironment: EngineOptionEnvironment;
}): DmBoardProjection {
  const targets = adjudicatedTargets(input.view.state.eventLog, input.coordinator.pause);
  const pending = input.coordinator.pendingRequest;
  const pendingController = pending === null
    ? undefined
    : input.controllers.find((identity) => identity.combatantId === pending.actorId);
  const humanCommandActions = pendingController?.kind === 'human'
    ? pending?.legalActions.actions ?? []
    : [];
  const worldObjectControls = input.view.state.worldObjects.flatMap((object) =>
    (object.classActions ?? []).flatMap((action) => {
      const command = dmWorldObjectOverrideCommand(input.view.state, object.id, action.id);
      return command === null ? [] : [{
        objectId: String(object.id), objectName: object.name, label: action.label, command,
      }];
    }));
  const names = new Map(input.view.state.combatants.map(
    (subject) => [subject.profile.id, subject.profile.name] as const,
  ));
  const recovery = input.view.state.phase.kind === 'awaiting_placement'
    ? (() => {
        const phase = input.view.state.phase;
        const record = phase.originatingRecord;
        const sizes = record.kind === 'overlap_adjudication_pending'
          ? [effectiveCreatureSize(input.view.state, record.combatant)]
          : creatureSizes;
        const suggestedAnchor = record.kind === 'overlap_adjudication_pending'
          ? record.formerAnchors[1]
          : record.suggestedAnchor;
        return {
          combatantId: record.combatant,
          combatantName: names.get(record.combatant) ?? String(record.combatant),
          reason: record.kind,
          suggestedAnchor: suggestedAnchor === null ? null : { ...suggestedAnchor },
          sizeInput: record.kind === 'overlap_adjudication_pending' ? 'fixed' : 'required',
          sizeOptions: sizes.map((size) => ({
            size,
            legalAnchors: pendingPlacementLegalAnchors(input.view.state, size),
          })),
        } satisfies DmPendingPlacementRecovery;
      })()
    : null;
  const pendingEntries: readonly DmDecisionTrayEntry[] = [
    ...input.view.state.pendingDecisions,
    ...(input.adjudicationPrompts ?? []),
  ].map((decision) => ({
    kind: 'pending',
    decision: structuredClone(decision),
    combatantName: names.get(decision.combatant) ?? String(decision.combatant),
    triggerContext: decisionTriggerContext(decision, names),
    interactive: true,
  }));
  const autoFireEntries: readonly DmDecisionTrayEntry[] = input.view.state.eventLog.flatMap(
    (event): readonly DmDecisionTrayEntry[] => event.type === 'reaction_policy_auto_resolved'
      ? [{
          kind: 'auto_fire_log',
          sequence: event.sequence,
          combatantId: event.combatant,
          combatantName: names.get(event.combatant) ?? String(event.combatant),
          reactionKind: event.reactionKind,
          policy: event.policy,
          resolution: event.resolution,
          autoFired: event.autoFired,
          interactive: false,
        }]
      : [],
  );
  const engineAdjudicationEntries: readonly DmDecisionTrayEntry[] = (input.engineAdjudications ?? [])
    .map((request) => ({
      kind: 'engine_adjudication' as const,
      request: structuredClone(request),
      combatantName: names.get(request.actorId as CombatantId) ?? request.actorId,
      interactive: true as const,
    }));
  const offerEnvironment = input.offerEnvironment;
  const offeredActors = offeredOptionActorsForState(input.view.state, undefined, offerEnvironment);
  return {
    audience: 'dm',
    stateDigest: sha256(canonicalJson(input.view.state)),
    offerEnvironmentDigest: offerEnvironment.digest,
    encounter: dmVisibleEncounter(input.view),
    board: projectEncounterBoard(input.view, input.coordinator.pendingRequest, targets),
    coordinator: input.coordinator,
    pendingRequest: input.coordinator.pendingRequest,
    humanCommandActions,
    humanEngineOptions: projectHumanEngineOptions(input.view.state, undefined, undefined, offerEnvironment),
    movementPreviews: humanCommandActions.flatMap((action): readonly DmMovementPathPreview[] =>
      action.type === 'move'
        ? [{ commandKey: canonicalJson(action), ...previewMovementPathDangers(input.view.state, action) }]
        : []),
    offeredOptionPaths: projectOfferedOptionPaths(input.view.state, offeredActors, offerEnvironment),
    controllers: input.controllers,
    history: input.history,
    adjudicatedTargets: targets,
    partySession: input.partyState === undefined || input.partyState === null
      ? null
      break;
    case 'controller_response_refused':
      if (hasExactlyKeys(value, ['kind', 'command', 'reason']) && isRecord(value.command) && typeof value.reason === 'string') return value as unknown as SessionTransition;
      break;
    case 'coordinator_paused':
    case 'coordinator_resumed':
      if (hasExactlyKeys(value, ['kind', 'pause']) && validPause(value.pause)) return value as unknown as SessionTransition;
      break;
  }
  throw new TypeError(`Malformed VTT session transition ${value.kind}.`);
}

function decodeRevision(value: unknown): SessionRevision {
  if (
    !isRecord(value) ||
    value.schemaVersion !== VTT_SESSION_SCHEMA_VERSION ||
    typeof value.sessionId !== 'string' ||
    !Number.isSafeInteger(value.revision) ||
    !Number.isSafeInteger(value.activeHeadRevision) ||
    value.activeHeadRevision !== value.revision ||
    (
      value.parentRevision !== null &&
      !Number.isSafeInteger(value.parentRevision)
    ) ||
    typeof value.branchId !== 'string' ||
    !isRecord(value.transition) ||
    !isRecord(value.encounterState) ||
    !isEncounterConfig(value.encounterState.config) ||
    !isEncounterPhase(value.encounterState.phase) ||
    !Array.isArray(value.encounterState.hiddenRolls) ||
    !value.encounterState.hiddenRolls.every(isHiddenRollCategory) ||
    new Set(value.encounterState.hiddenRolls).size !== value.encounterState.hiddenRolls.length ||
    !Array.isArray(value.encounterState.observationHistory) ||
    typeof value.branchRngStateFingerprint !== 'string' ||
    !(value.partyState === null || isRecord(value.partyState)) ||
    !isRecord(value.rngState) ||
    !isRecord(value.coordinatorState) ||
    !Array.isArray(value.controllers) ||
    !(value.agentSession === null || isAgentSessionBinding(value.agentSession)) ||
    typeof value.checksum !== 'string'
  ) {
    throw new TypeError('Malformed VTT session revision.');
  }
  const transition = decodeTransition(value.transition);
  const partyState = value.partyState === null
    ? null
    : decodePartySessionState(value.partyState);
  if (!Array.isArray(value.encounterState.combatants)) {
    throw new TypeError('Persisted encounter combatants are malformed.');
  }
  const encounterCombatants = value.encounterState.combatants.map((combatant) => {
    if (!isRecord(combatant)) throw new TypeError('Persisted encounter combatant is malformed.');
    if (!Object.hasOwn(combatant, 'wildShapeUses')) {
      throw new TypeError('Persisted encounter combatant lacks Wild Shape use state.');
    }
    if (!Object.hasOwn(combatant, 'deathAt')) {
      throw new TypeError('Persisted encounter combatant lacks a typed time of death.');
    }
    if (combatant.deathAt !== null && (
      !isRecord(combatant.deathAt) ||
      !hasExactlyKeys(combatant.deathAt, ['round', 'initiativeIndex']) ||
import {
  REFUSAL_CATEGORIES,
  handlingModesForCategory,
  type RefusalHandlingMode,
} from './refusal-handling';
import { reconcileStableRenderedChildren, stableRenderKey } from './stable-dom-render';
import type { HumanEngineActorOptions } from './encounter-board-projection';
import type { EngineActivationChoiceSlot, EngineOptionId } from './turn-proposal';
import type { OfferedOptionPath } from './offered-option-paths';
import { REFERENCE_PLAYER_IDS } from './reference-encounter';

const HEARTBEAT_INTERVAL_MS = 250;
const HEARTBEAT_TIMEOUT_MS = 1_000;
const LOCAL_PARTY_PLAYER_ID = 'player:local-party';

export type BoardSnapshotInformationMode = 'advice' | 'blind_state';
export type BoardSnapshotRole = 'dm_board' | 'accessible_board_raster' | 'player_board';

export function projectStateOnlyTopDownDmBoard(
  projection: TopDownDmBoardProjection,
): TopDownDmBoardProjection {
  return projectStateOnlyBoard(projection);
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { readonly className?: string; readonly text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  return node;
}

function activationChoiceControls(
  actorId: CombatantId,

exec
/bin/bash -lc "sed -n '680,740p' src/vtt/encounter-board.ts
sed -n '840,990p' src/vtt/encounter-board.ts
sed -n '2120,2240p' src/vtt/encounter-app.ts
rg -n \"encounter-art-floor|encounter-art-fog\" src/vtt -g '*.ts' -g '*.css'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
              sized,
              target.position,
              normalPlacementFor(sized),
            ));
          })();
      const line = minimumSpaceLine(sourceSpace, targetSpace);
      return {
        effectId: effect.effectId,
        from: { ...line.sourceCenter },
        to: { ...line.targetCenter },
        target: target.id,
      };
    });
  });
  return {
    bounds: { ...state.bounds },
    blockedCells: state.blockedCells.map((cell) => ({ ...cell })),
    terrainCells: projectEncounterTerrainCells(state.bounds, state),
    difficultTerrainRegions: state.environment.difficultTerrainRegions.map((region) => ({
      id: region.id,
      cells: region.cells.map((cell) => ({ ...cell })),
    })),
    obscurementRegions: state.environment.obscurementRegions.map((region) => ({
      id: region.id,
      cells: region.cells.map((cell) => ({ ...cell })),
      obscurement: region.obscurement,
    })),
    environmentLightRegions: state.environment.lightRegions.map((region) => ({
      id: region.id,
      cells: region.cells.map((cell) => ({ ...cell })),
      level: region.level,
    })),
    combatants,
    highlightedCombatant: state.activeCombatant,
    activeCombatant: state.activeCombatant,
    adjudicatedTargets: [...adjudicatedTargets],
    foggedCells: derivedFogCells(state, visibilityObserverIds),
    round: state.round,
    initiative: state.initiative.map((entry) => {
      const subject = state.combatants.find((candidate) => candidate.profile.id === entry.combatant);
      if (subject === undefined) throw new Error(`Initiative references unknown combatant ${entry.combatant}.`);
      return {
        ...entry,
        name: subject.profile.name,
        active: state.activeCombatant === entry.combatant,
        life: subject.life,
      };
    }),
    worldObjects: state.worldObjects.map((object) => ({
      id: object.id,
      name: object.name,
      kind: object.kind,
      position: { ...object.position },
      cells: object.footprint.map((cell) => ({ ...cell })),
      blocking: { ...object.blocking },
      terrainKind: terrainKindOfWireBlocking(object.blocking),
      lightClass: object.kind === 'light-source' ? 'light-source' : 'none',
    })),
    areas: projectedAreas(state),
    lightOverlays: projectedLightOverlays(state),
    sustainedEffects,
        ? art.ui.adjudicated
        : null,
      columnSpan,
      rowSpan,
      stackId: String(rootCombatant.id),
      stackIndex: members.indexOf(index),
      stackSize: members.length,
    });
  }));
}

export function encounterBoardRenderModel(
  projection: EncounterBoardProjectionShape,
  art: EncounterArtPackage,
): readonly EncounterBoardCellModel[] {
  if (
    projection.bounds.columns !== art.room.columns ||
    projection.bounds.rows !== art.room.rows
  ) {
    throw new Error(`Encounter bounds do not match art package ${art.id}.`);
  }
  const combatants = new Map<string, EncounterBoardTokenModel[]>();
  for (const combatant of encounterBoardTokenRenderModels(projection, art)) {
    // Cell-model indexing keeps one entry at the rendering origin; the separate
    // token overlay owns the complete footprint box and must not duplicate tokens.
    const key = cellKey(combatant.position);
    const occupants = combatants.get(key) ?? [];
    occupants.push(combatant);
    combatants.set(key, occupants);
  }
  const terrain = new Map(art.terrain.map((entry) => [cellKey(entry.cell), entry.asset] as const));
  const fog = new Set([
    ...(projection.foggedCells?.map(cellKey) ?? []),
    ...(projection.concealedCells?.map(cellKey) ?? []),
  ]);
  const worldObjects = projection.worldObjects ?? [];
  const areas = projection.areas ?? [];
  const lights = projection.lightOverlays ?? [];
  const projectedTerrain = indexEncounterTerrainCells(projection.bounds, projection.terrainCells);
  const difficultTerrain = new Map<string, string[]>();
  for (const region of projection.difficultTerrainRegions ?? []) {
    for (const cell of region.cells) {
      const key = cellKey(cell);
      difficultTerrain.set(key, [...(difficultTerrain.get(key) ?? []), region.id]);
    }
  }
  const obscurement = new Map<string, EncounterBoardObscurementRegion[]>();
  for (const region of projection.obscurementRegions ?? []) {
    for (const cell of region.cells) {
      const key = cellKey(cell);
      obscurement.set(key, [...(obscurement.get(key) ?? []), region]);
    }
  }
  const illumination = new Map<string, EncounterBoardLightRegion[]>();
  for (const region of projection.environmentLightRegions ?? []) {
    for (const cell of region.cells) {
      const key = cellKey(cell);
      illumination.set(key, [...(illumination.get(key) ?? []), region]);
    }
  }
  const lightLevels = cellLightLevels(projection.bounds, projection.environmentLightRegions ?? []);
  const roomDefault = roomDefaultLight(lightLevels.values());
  const doors = doorCellsOf(worldObjects);
  const cells: EncounterBoardCellModel[] = [];
  // ART-SEAM (D516): the package names one floor/wall/door family; cells pick the member.
  const floorSet = floorSetFor(art.room.floor);
  const wallSet = wallSetFor(art.room.wall);
  const doorSet = doorSetFor(art.room.door);

  for (let row = 0; row < projection.bounds.rows; row += 1) {
    for (let column = 0; column < projection.bounds.columns; column += 1) {
      const key = cellKey({ column, row });
      const layers: EncounterBoardLayer[] = [
        { role: 'floor', assetId: floorSet.variants[floorVariantAt(column, row)] },
      ];
      const wallPiece = wallPieceAt(column, row, projection.bounds);
      if (wallPiece !== null) {
        const doorState = doors.get(key);
        const engineDoorSide = doorState === undefined ? null : doorSideAt(column, row, projection.bounds);
        layers.push(
          engineDoorSide !== null && doorState !== undefined
            ? { role: 'door', assetId: doorSet.pieces[doorState][engineDoorSide] }
            : { role: 'wall', assetId: wallSet.pieces[wallPiece] },
        );
      }
      for (const side of shadeSidesAt(column, row, projection.bounds)) {
        layers.push({ role: 'shade', assetId: SHADE_ASSETS[side] });
      }
      const terrainAsset = terrain.get(key);
      if (terrainAsset !== undefined) layers.push({ role: 'terrain', assetId: terrainAsset });
      if (fog.has(key)) layers.push({ role: 'fog', assetId: art.fog.hidden });
      const mechanicalLayers: EncounterBoardMechanicalLayer[] = [];
      const terrainCell = projectedTerrain.get(key);
      if (terrainCell === undefined) throw new Error(`Cell ${key} has no canonical terrain projection.`);
      if (terrainCell.kind !== 'open') mechanicalLayers.push({ kind: 'terrain', terrainKind: terrainCell.kind });
      for (const regionId of difficultTerrain.get(key) ?? []) {
        mechanicalLayers.push({ kind: 'difficult_terrain', regionId });
      }
      for (const lit of illumination.get(key) ?? []) {
        mechanicalLayers.push({ kind: 'illumination', regionId: lit.id, level: lit.level });
      }
      for (const obscured of obscurement.get(key) ?? []) {
        mechanicalLayers.push({
          kind: 'obscurement',
          regionId: obscured.id,
          obscurement: obscured.obscurement,
        });
      }

      const lightLevel = lightLevels.get(key);
      if (lightLevel === undefined) throw new Error(`Cell ${key} has no light level.`);
      const light: EncounterBoardCellLight = {
        level: lightLevel,
        mark: lightMarkFor(art.boardGlyphs, lightLevel, roomDefault),
      };
      // ART-SEAM (D525): under 'full' every fact class the probe asks about gets its own corner mark.
      const glyphs = cellGlyphsFor(art.boardGlyphs, {
        door: doors.get(key) ?? null,
        terrain: terrainCell.kind,
        fogged: fog.has(key),
        obscured: obscurement.has(key),
      }).map((kind): EncounterBoardCellGlyph => ({ kind, effect: CELL_GLYPH_EFFECT_BY_KIND[kind] }));

      const tokens = combatants.get(key) ?? [];
      const cellObjects = worldObjects.filter((object) => object.cells.some((cell) => cellKey(cell) === key));
      const cellAreas = areas.filter((area) => area.cells.some((cell) => cellKey(cell) === key));
      const cellLights: Array<{
        readonly overlay: EncounterBoardLightOverlay;
        readonly level: 'bright' | 'dim';
      }> = [];
      for (const overlay of lights) {
        if (overlay.brightCells.some((cell) => cellKey(cell) === key)) {
          cellLights.push({ overlay, level: 'bright' });
        } else if (overlay.dimCells.some((cell) => cellKey(cell) === key)) {
          cellLights.push({ overlay, level: 'dim' });
        }
      }
      cells.push(Object.freeze({
        key,
        column,
        row,
        terrain: terrainCell,
        layers: Object.freeze(layers),
        mechanicalLayers: Object.freeze(mechanicalLayers),
        light: Object.freeze(light),
        glyphs: Object.freeze(glyphs),
        token: tokens[0] ?? null,
        tokens: Object.freeze(tokens),
        worldObjects: Object.freeze(cellObjects),
        areas: Object.freeze(cellAreas),
        lightOverlays: Object.freeze(cellLights),
        ? ''
        : `${String(currentAnchor.anchor.column)},${String(currentAnchor.anchor.row)}:${currentAnchor.placementMode}`,
    };

    const form = element('form');
    form.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'form',
    );
    const sizeLabel = element('label', { text: 'Creature size' });
    sizeLabel.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'size-label',
    );
    const size = element('select');
    size.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'size',
    );
    size.setAttribute('aria-label', `Creature size for ${recovery.combatantName}`);
    size.disabled = recovery.sizeInput === 'fixed';
    for (const entry of recovery.sizeOptions) {
      const option = element('option', { text: entry.size });
      option.value = entry.size;
      option.selected = entry.size === currentSize.size;
      size.append(option);
    }
    size.addEventListener('change', () => {
      const selected = recovery.sizeOptions.find((entry) => entry.size === size.value);
      if (selected === undefined) return;
      const firstAnchor = selected.legalAnchors[0] ?? null;
      this.#recoverySelection = {
        key,
        size: selected.size,
        anchorKey: firstAnchor === null
          ? ''
          : `${String(firstAnchor.anchor.column)},${String(firstAnchor.anchor.row)}:${firstAnchor.placementMode}`,
      };
      this.#render();
    });
    sizeLabel.append(size);

    const anchorLabel = element('label', { text: 'Legal anchor' });
    anchorLabel.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'anchor-label',
    );
    const anchor = element('select');
    anchor.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'anchor',
    );
    anchor.setAttribute('aria-label', `Legal anchor for ${recovery.combatantName}`);
    for (const entry of currentSize.legalAnchors) {
      const anchorKey = `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}`;
      const option = element('option', {
        text: `${String(entry.anchor.column)},${String(entry.anchor.row)} (${entry.placementMode})`,
      });
      option.value = anchorKey;
      option.selected = anchorKey === this.#recoverySelection.anchorKey;
      anchor.append(option);
    }
    anchor.disabled = currentSize.legalAnchors.length === 0;
    anchor.addEventListener('change', () => {
      this.#recoverySelection = { key, size: currentSize.size, anchorKey: anchor.value };
      this.#render();
    });
    anchorLabel.append(anchor);

    const submit = element('button', { text: 'Place combatant and continue' });
    submit.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'submit',
    );
    submit.type = 'submit';
    submit.disabled = currentAnchor === null;
    form.append(sizeLabel, anchorLabel, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selectedSize = recovery.sizeOptions.find((entry) => entry.size === size.value);
      const selectedAnchor = selectedSize?.legalAnchors.find((entry) =>
        `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}` === anchor.value);
      if (selectedSize === undefined || selectedAnchor === undefined) return;
      this.#submitTopDown(
        () => this.#session.submitTopDownPlacement(selectedAnchor.offeredActionId),
        undefined,
        () => { this.#focusAfterRender = 'recovery'; },
      );
    });
    panel.append(form);
    return panel;
  }

  #renderDmBoard(projection: TopDownDmBoardProjection): void {
    const boardFog = new Set(projection.board.foggedCells.map(
      (cell) => `${String(cell.column)},${String(cell.row)}`,
    ));
    if (projection.encounter.dmOnly.foggedCells.some(
      (cell) => !boardFog.has(`${String(cell.column)},${String(cell.row)}`),
    )) {
      throw new Error('DM board omitted encounter fog.');
    }
    const movementPreview = this.boardSnapshotInformation === 'blind_state'
      ? null
      : projection.movementPreviews.find(
          (preview) => preview.commandKey === this.#movementPreviewKey,
        ) ?? null;
    const previewCells = new Set(movementPreview?.path.map(
      (cell) => `${String(cell.column)},${String(cell.row)}`,
    ) ?? []);
    if (
      this.boardSnapshotInformation !== 'blind_state' &&
      projection.pendingPlacementRecovery !== null
    ) {
      this.#shell.append(this.#renderPendingPlacementRecovery(projection.pendingPlacementRecovery));
      const selection = this.#recoverySelection;
      const sizeOption = selection === null
        ? undefined
        : projection.pendingPlacementRecovery.sizeOptions.find(
            (entry) => entry.size === selection.size,
          );
      const legalAnchor = sizeOption?.legalAnchors.find((entry) =>
        `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}` ===
        selection?.anchorKey);
      for (const cell of legalAnchor?.footprint ?? []) {
        previewCells.add(`${String(cell.column)},${String(cell.row)}`);
      }
src/vtt/styles.css:64:.encounter-art-floor { z-index: 0; }
src/vtt/styles.css:68:.encounter-art-fog {
src/vtt/styles.css:887:.encounter-art-fog { opacity: 0.78; }
src/vtt/styles.css:1359:.encounter-board[data-board-glyphs='full'] .encounter-art-fog {

exec
/bin/bash -lc "sed -n '1,230p' tests/browser/vtt-board.spec.ts
rg -ni \"fog|conceal|hidden-from-players|encounter-art-fog|data-cell\" tests/browser --glob '*.spec.ts' --glob '"'!vtt-encounter.spec.ts'"' --glob '"'!vtt-board.spec.ts'"'
rg -n \"Reference encounter|encounter=reference|vane-warren|Vane Warren|encounter=d365|D365|two-room\" tests/browser --glob '*.spec.ts'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

const GRID_SIZE = 50;
const TARGET_COLUMN = 6;
const TARGET_ROW = 4;
const EXPECTED_COLUMN = 6;

async function openVtt(page: Page): Promise<void> {
  await page.goto('/vtt');
  await expect(page.getByRole('heading', { name: 'Shared tabletop' })).toBeVisible({
    timeout: 60_000,
  });
}

async function chooseManual(page: Page, roomCode: string): Promise<void> {
  await page.getByLabel('Transport').selectOption('manual');
  await page.getByLabel('Room code').fill(roomCode);
}

async function nonEmptyValue(page: Page, label: string): Promise<string> {
  const control = page.getByLabel(label);
  await expect(control).not.toHaveValue('', { timeout: 10_000 });
  return control.inputValue();
}

async function canvasPixel(
  page: Page,
  column: number,
  row: number,
): Promise<readonly number[]> {
  return page.locator('canvas.vtt-canvas').evaluate(
    (canvas, cell) => {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('VTT canvas locator did not resolve to a canvas.');
      }
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('Missing canvas context.');
      const bounds = canvas.getBoundingClientRect();
      const cssX = cell.column * cell.gridSize + cell.gridSize / 2;
      const cssY = cell.row * cell.gridSize + cell.gridSize / 2;
      const x = Math.floor((cssX / bounds.width) * canvas.width);
      const y = Math.floor((cssY / bounds.height) * canvas.height);
      return [...context.getImageData(x, y, 1, 1).data];
    },
    { column, row, gridSize: GRID_SIZE },
  );
}

async function canvasPoint(
  page: Page,
  column: number,
  row: number,
): Promise<{ readonly x: number; readonly y: number }> {
  const bounds = await page.locator('canvas.vtt-canvas').boundingBox();
  if (bounds === null) throw new Error('VTT canvas has no bounding box.');
  return Object.freeze({
    x: bounds.x + column * GRID_SIZE + GRID_SIZE / 2,
    y: bounds.y + row * GRID_SIZE + GRID_SIZE / 2,
  });
}

async function dragToken(
  page: Page,
  from: { readonly column: number; readonly row: number },
  to: { readonly column: number; readonly row: number },
): Promise<void> {
  const start = await canvasPoint(page, from.column, from.row);
  const target = await canvasPoint(page, to.column, to.row);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
}

test('manual peers converge token moves, dice rolls, and role-dependent fog', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const dmContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const player = await playerContext.newPage();

  try {
    await Promise.all([openVtt(dm), openVtt(player)]);
    const roomCode = 'manual-smoke-room';
    await chooseManual(dm, roomCode);
    await dm.getByRole('button', { name: 'Create room' }).click();
    const offer = await nonEmptyValue(dm, 'Manual SDP offer');

    await chooseManual(player, roomCode);
    await player.getByRole('button', { name: 'Join room' }).click();
    await player.getByLabel('Manual SDP offer to answer').fill(offer);
    await player.getByRole('button', { name: 'Create answer' }).click();
    const answer = await nonEmptyValue(player, 'Manual SDP answer');
    await dm.getByLabel('Manual SDP answer to apply').fill(answer);
    await dm.getByRole('button', { name: 'Apply answer' }).click();

    await expect(dm.locator('#vtt-transport-status')).toHaveAttribute(
      'data-state',
      'connected',
      { timeout: 15_000 },
    );
    await expect(player.locator('#vtt-transport-status')).toHaveAttribute(
      'data-state',
      'connected',
      { timeout: 15_000 },
    );
    await expect(dm.locator('#vtt-role')).toHaveAttribute('data-role', 'dm');
    await expect(player.locator('#vtt-role')).toHaveAttribute(
      'data-role',
      'player',
    );
    await expect(player.getByRole('button', { name: 'Paint fog' })).toBeHidden();

    await dm.getByLabel('New token label').fill('Scout');
    await dm.getByLabel('New token color').fill('#2468a2');
    await dm.getByRole('button', { name: 'Add token' }).click();
    const dmToken = dm.locator('[data-token-id]').first();
    await expect(dmToken).toHaveAttribute('data-column', '0');
    await expect(dmToken).toHaveAttribute('data-row', '0');
    const tokenId = await dmToken.getAttribute('data-token-id');
    if (tokenId === null) throw new Error('Created token has no id.');

    const start = await canvasPoint(dm, 0, 0);
    const target = await canvasPoint(dm, TARGET_COLUMN, TARGET_ROW);
    await dm.mouse.move(start.x, start.y);
    await dm.mouse.down();
    await dm.mouse.move(target.x, target.y, { steps: 8 });
    await dm.mouse.up();

    const playerToken = player.locator(`[data-token-id="${tokenId}"]`);
    await expect(playerToken).toHaveAttribute(
      'data-column',
      String(EXPECTED_COLUMN),
    );
    await expect(playerToken).toHaveAttribute('data-row', String(TARGET_ROW));

    await dm.getByLabel('New token label').fill('Concurrent');
    await dm.getByRole('button', { name: 'Add token' }).click();
    const dmConcurrent = dm.getByRole('button', { name: /Concurrent — column/ });
    const playerConcurrent = player.getByRole('button', {
      name: /Concurrent — column/,
    });
    await expect(playerConcurrent).toHaveAttribute('data-column', '0');
    await expect(playerConcurrent).toHaveAttribute('data-row', '0');
    await Promise.all([
      dragToken(dm, { column: 0, row: 0 }, { column: 2, row: 2 }),
      dragToken(player, { column: 0, row: 0 }, { column: 4, row: 3 }),
    ]);
    await expect
      .poll(async () => {
        const dmCell = `${await dmConcurrent.getAttribute('data-column')},${await dmConcurrent.getAttribute('data-row')}`;
        const playerCell = `${await playerConcurrent.getAttribute('data-column')},${await playerConcurrent.getAttribute('data-row')}`;
        return dmCell === playerCell && (dmCell === '2,2' || dmCell === '4,3');
      })
      .toBe(true);

    await player.getByLabel('Dice expression').fill('2d6+3');
    await player.getByRole('button', { name: 'Roll dice' }).click();
    const playerRoll = player.locator('[data-roll-id]').last();
    const dmRoll = dm.locator('[data-roll-id]').last();
    await expect(playerRoll).toHaveAttribute('data-expression', '2d6+3');
    await expect(dmRoll).toHaveAttribute('data-expression', '2d6+3');
    await expect(dmRoll).toHaveText(await playerRoll.innerText());
    const total = Number(await dmRoll.getAttribute('data-total'));
    expect(total).toBeGreaterThanOrEqual(5);
    expect(total).toBeLessThanOrEqual(15);

    const beforeFog = await canvasPixel(player, TARGET_COLUMN, TARGET_ROW);
    expect(beforeFog).not.toEqual([17, 19, 26, 255]);
    await dm.getByRole('button', { name: 'Paint fog' }).click();
    await dm.mouse.click(target.x, target.y);
    await expect(player.locator('canvas.vtt-canvas')).toHaveAttribute(
      'data-fog-count',
      '1',
    );
    await expect(playerToken).toHaveCount(0);
    const playerFog = await canvasPixel(player, TARGET_COLUMN, TARGET_ROW);
    const dmFog = await canvasPixel(dm, TARGET_COLUMN, TARGET_ROW);
    expect(playerFog).toEqual([17, 19, 26, 255]);
    expect(playerFog).not.toEqual(beforeFog);
    expect(dmFog).not.toEqual(playerFog);
  } finally {
    await dmContext.close();
    await playerContext.close();
  }
});
tests/browser/vtt-long-rest.spec.ts:7:  await page.goto('/vtt?encounter=d365');
tests/browser/vtt-long-rest.spec.ts:8:  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible({
tests/browser/vtt-save-manager.spec.ts:4:  await page.goto('/vtt?encounter=reference&view=dm&session=savemgr-fallback');
tests/browser/vtt-save-manager.spec.ts:26:  await page.goto('/vtt?encounter=reference&view=dm&session=savemgr-browser');
tests/browser/vtt-encounter.spec.ts:26:test('DM loads the bundled D365 dungeon and RPC-authored party into room 1', async ({
tests/browser/vtt-encounter.spec.ts:31:  await page.goto('/vtt?encounter=d365');
tests/browser/vtt-encounter.spec.ts:32:  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible({
tests/browser/vtt-encounter.spec.ts:177:  await page.goto('/vtt?encounter=reference&view=player&session=increment-6-browser');
tests/browser/vtt-encounter.spec.ts:178:  await expect(page.getByRole('heading', { name: 'Reference encounter' })).toBeVisible({
tests/browser/vane-warren-entry.spec.ts:3:test('a reset session mounts the first Vane Warren fight in a real browser', async ({ page }) => {
tests/browser/vane-warren-entry.spec.ts:16:  await page.goto('/vtt?encounter=vane-warren');
tests/browser/vane-warren-entry.spec.ts:17:  await page.getByRole('button', { name: 'Start the Vane Warren', exact: true }).click();
tests/browser/vane-warren-entry.spec.ts:24:    'The Vane Warren — encounter 1 of 3',
tests/browser/vtt-option-paths.spec.ts:89:  await page.goto('/vtt?encounter=reference&view=dm&session=d512-bootstrap');
tests/browser/vtt-option-paths.spec.ts:108:    await page.goto(`/vtt?encounter=reference&view=dm&boardSnapshot=1&session=${bundle.sessionId}`);
tests/browser/vtt-accessible-board.spec.ts:5:  await page.goto('/vtt?encounter=reference&view=player&session=accessible-board-browser');
tests/browser/vtt-accessible-board.spec.ts:6:  await expect(page.getByRole('heading', { name: 'Reference encounter' })).toBeVisible();
tests/browser/vtt-handoff/worker.spec.ts:30:  expect(initial.playerSnapshot?.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
tests/browser/vtt-handoff/worker.spec.ts:38:      params: { tokenId: 'token:two-room-adventurer', to: { x: 3, y: 4, z: 0 } },
tests/browser/vtt-handoff/worker.spec.ts:42:      params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
tests/browser/vtt-handoff/worker.spec.ts:51:    expect.objectContaining({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 }),
tests/browser/vtt-handoff/worker.spec.ts:87:      params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/worker.spec.ts:99:  expect(afterMutation.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
tests/browser/vtt-handoff/worker.spec.ts:106:      params: { doorId: 'object:two-room-door', open: false },
tests/browser/vtt-handoff/worker.spec.ts:126:  expect(reconnected.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(false);
tests/browser/vtt-handoff/top-down-smoke.spec.ts:8:  await page.goto('/vtt?encounter=d365');
tests/browser/vtt-handoff/top-down-smoke.spec.ts:9:  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible();
tests/browser/vtt-handoff/runtime-parity.spec.ts:12:test('pairs the real Worker and browser WebSocket transport on the fixed two-room scene', async ({ page }, testInfo) => {
tests/browser/vtt-handoff/runtime-parity.spec.ts:23:      role: 'player', playerId: 'combatant:two-room-goblin',
tests/browser/vtt-handoff/runtime-parity.spec.ts:74:      { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:75:      { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:82:        params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/runtime-parity.spec.ts:87:    expect(workerDoor.state.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);
tests/browser/vtt-handoff/runtime-parity.spec.ts:102:        params: { lightId: 'object:two-room-torch', enabled: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:114:        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
tests/browser/vtt-handoff/runtime-parity.spec.ts:119:        params: { doorId: 'object:two-room-door', open: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:137:          { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:138:          { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:140:        doors: expect.arrayContaining([expect.objectContaining({ id: 'object:two-room-door', open: false })]),
tests/browser/vtt-handoff/runtime-parity.spec.ts:208:        v: 1, id: 'light', method: 'light.set', params: { lightId: 'object:two-room-torch', enabled: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:212:          if (event.data.doors.some((door) => door.id === 'object:two-room-door' && door.open)) {
tests/browser/vtt-handoff/runtime-parity.spec.ts:219:        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/runtime-parity.spec.ts:226:        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: false },
tests/browser/vtt-handoff/runtime-parity.spec.ts:237:        params: { requestedRole: 'player', playerId: 'combatant:two-room-goblin' },
tests/browser/vtt-handoff/runtime-parity.spec.ts:253:          if (!event.data.tokens.some((candidate) => candidate.id === 'token:two-room-goblin' && candidate.x === 7)) return;
tests/browser/vtt-handoff/runtime-parity.spec.ts:260:        params: { tokenId: 'token:two-room-goblin', to: { x: 7, y: 4, z: 0 } },
tests/browser/vtt-handoff/runtime-parity.spec.ts:262:      const playerMoved = (await playerMovementEvent).data.tokens.find((candidate) => candidate.id === 'token:two-room-goblin');
tests/browser/vtt-handoff/runtime-parity.spec.ts:268:        params: { requestedRole: 'player', playerId: 'combatant:two-room-adventurer' },
tests/browser/vtt-handoff/runtime-parity.spec.ts:277:        v: 1, id: 'door', method: 'door.set', params: { doorId: 'object:two-room-door', open: true },
tests/browser/vtt-handoff/runtime-parity.spec.ts:324:        { id: 'token:two-room-adventurer', x: 2, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:325:        { id: 'token:two-room-goblin', x: 8, y: 4, z: 0 },
tests/browser/vtt-handoff/runtime-parity.spec.ts:332:      expect.objectContaining({ id: 'object:two-room-door', open: true }),
tests/browser/vtt-handoff/runtime-parity.spec.ts:338:      expect.objectContaining({ id: 'token:two-room-goblin', x: 8, y: 4, z: 0 }),
tests/browser/vtt-handoff/runtime-parity.spec.ts:341:    expect(websocket.playerMoved).toMatchObject({ id: 'token:two-room-goblin', x: 7, y: 4, z: 0 });

codex
Static tracing points to a digest-only mismatch: the service hashes the decoded canonical `EncounterState`, while the rendered app hashes `projectDmView(state).state`, which now adds derived `foggedCells`. I’m adding a temporary probe to the allowed snapshot spec to record all five live predicate inputs and both digest values; I’ll remove it immediately after the one diagnostic run.
apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..f9c7d5efcc8b38a6e67659b01257536567641e45
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      [...document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')].map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..f9c7d5efcc8b38a6e67659b01257536567641e45
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      [...document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')].map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc 'PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test tests/browser/ai-dm-board-snapshot.spec.ts --project=chromium' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..f9c7d5efcc8b38a6e67659b01257536567641e45
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      [...document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')].map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..f9c7d5efcc8b38a6e67659b01257536567641e45
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      [...document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')].map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

 exited 1 in 44955ms:
[WebServer] (node:43) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)
Error: Snapshot production build prerequisite failed (1).
dist cache miss: e6d271bdae4c042ac8f314fa5f38f88cb18798641e2b190b292580ff30c9ad6f
tests/browser/ai-dm-board-snapshot.spec.ts(221,11): error TS2488: Type 'NodeListOf<HTMLElement>' must have a '[Symbol.iterator]()' method that returns an iterator.
dist build failed: Error: node_modules/typescript/bin/tsc failed with 2


   at ai-dm-board-snapshot.spec.ts:35

  33 | });
  34 | if (productionBuild.status !== 0) {
> 35 |   throw new Error(
     |         ^
  36 |     `Snapshot production build prerequisite failed (${String(productionBuild.status ?? productionBuild.signal)}).\n` +
  37 |     `${productionBuild.stdout}${productionBuild.stderr}`,
  38 |   );
    at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:35:9
Error: No tests found.
Make sure that arguments are regular expressions matching test files.
You may need to escape symbols like "$" or "*" and quote the arguments.


apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc 'PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test tests/browser/ai-dm-board-snapshot.spec.ts --project=chromium' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

codex
The initial probe attempt stopped during the spec’s production-build prerequisite because the temporary browser expression used an iterable form excluded by this project’s DOM library target; no tests ran. I corrected only that probe syntax. The diagnostic test process is now running and has reached the two-test suite.
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

 exited 1 in 184760ms:
[WebServer] (node:43) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 2 tests using 1 worker

(node:254) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
LAND02_PREDICATE_PROBE {"source":{"room":1,"round":0,"revision":0,"stateDigest":"89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2"},"candidates":[]}
  ✘  1 [chromium] › tests/browser/ai-dm-board-snapshot.spec.ts:277:1 › captures the full production DM board deterministically through durable save upload/load (0ms)
  -  2 [chromium] › tests/browser/ai-dm-board-snapshot.spec.ts:303:1 › captures synchronized state-only DM, accessible-raster, and player evidence


  1) [chromium] › tests/browser/ai-dm-board-snapshot.spec.ts:277:1 › captures the full production DM board deterministically through durable save upload/load 

    "beforeAll" hook timeout of 30000ms exceeded.

      184 | let blindOutputDirectory = '';
      185 |
    > 186 | test.beforeAll(async ({ browser }) => {
          |      ^
      187 |   const loaded: unknown = await import(pathToFileURL(snapshotRuntimePath).href);
      188 |   if (typeof loaded !== 'object' || loaded === null ||
      189 |     typeof Reflect.get(loaded, 'startInProcessBlindBoardSnapshotService') !== 'function' ||
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:186:6

    "beforeAll" hook timeout of 30000ms exceeded.

      235 | });
      236 |
    > 237 | test.beforeAll(async () => {
          |      ^
      238 |   if (blindRuntime === undefined || blindService === undefined ||
      239 |     preparedHardBlindFixture === undefined) {
      240 |     throw new Error('Blind board snapshot warmup did not complete.');
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:237:6

    "beforeAll" hook timeout of 30000ms exceeded.

      248 | });
      249 |
    > 250 | test.beforeAll(async () => {
          |      ^
      251 |   if (blindRuntime === undefined || blindService === undefined ||
      252 |     preparedHardBlindFixture === undefined) {
      253 |     throw new Error('Blind board snapshot DM capture did not complete.');
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:250:6

    "beforeAll" hook timeout of 30000ms exceeded.

      261 | });
      262 |
    > 263 | test.beforeAll(async () => {
          |      ^
      264 |   if (blindRuntime === undefined || blindService === undefined) {
      265 |     throw new Error('Blind board snapshot hard-family capture did not complete.');
      266 |   }
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:263:6

    Error: page.waitForFunction: Target page, context or browser has been closed

       at ../../dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677


        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677:23
        at _BoardSnapshotService.#waitForBoardVisible (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49669:11)
        at _BoardSnapshotService.#prepareBoard (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49639:36)
        at _BoardSnapshotService.#capture (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49517:15)
        at _BoardSnapshotService.captureSynchronized (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49465:22)
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:255:28

    Error: page.waitForFunction: Target page, context or browser has been closed

       at ../../dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677


        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677:23
        at _BoardSnapshotService.#waitForBoardVisible (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49669:11)
        at _BoardSnapshotService.#prepareBoard (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49639:36)
        at _BoardSnapshotService.warm (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49444:5)
        at Module.warmPreparedBlindBoardSnapshot (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49961:3)
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:213:5

    Error: page.waitForFunction: Target page, context or browser has been closed

       at ../../dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677


        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677:23
        at _BoardSnapshotService.#waitForBoardVisible (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49669:11)
        at _BoardSnapshotService.#capture (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49510:38)
        at Module.captureWarmedPreparedBlindBoardSnapshot (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49968:11)
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:242:21

    Error: page.waitForFunction: Target page, context or browser has been closed

       at ../../dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677


        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49677:23
        at _BoardSnapshotService.#waitForBoardVisible (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49669:11)
        at _BoardSnapshotService.#prepareBoard (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49639:36)
        at _BoardSnapshotService.#capture (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49517:15)
        at _BoardSnapshotService.captureSynchronized (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49465:22)
        at Module.captureBlindBoardSnapshotFixture (/home/vagrant/PhpstormProjects/dnd-wt-vis-field/dnd-slim-runs/blind-board-snapshot-runtime-254.mjs:49982:21)
        at /home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts:267:23

    Error Context: ../../../../tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/error-context.md

    Error Context: ../../../../tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/error-context.md

    Error Context: ../../../../tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/error-context.md

    Error Context: ../../../../tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/error-context.md

    Error Context: ../../../../tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/error-context.md

    attachment #6: trace (application/zip) ─────────────────────────────────────────────────────────
    ../../../../tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip
    Usage:

        npx playwright show-trace ../../../../tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip

    ────────────────────────────────────────────────────────────────────────────────────────────────

  1 failed
    [chromium] › tests/browser/ai-dm-board-snapshot.spec.ts:277:1 › captures the full production DM board deterministically through durable save upload/load 
  1 did not run

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc "find /tmp/dnd-multiclass-spells-static-playwright -path '*ai-dm-board-snapshot*' -maxdepth 3 -type f -print
unzip -l /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip | head -80
unzip -p /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip | rg -o -m 20 'data-(?:blind-snapshot-capture|blind-snapshot-role|board-audience|source-revision|source-round|source-state-digest|board-glyphs)["'^<> ]*|[a-f0-9]{64}'"'" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 78ms:
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc "unzip -p /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip 3-trace.trace | rg -n -m 20 \"source-state-digest|sourceStateDigest|board-audience|blind-snapshot-role\" | cut -c1-1200
sed -n '1,220p' /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/error-context.md" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
4:{"type":"frame-snapshot","snapshot":{"callId":"call@92","snapshotName":"before@call@92","pageId":"page@13898037b89e4ae18cd0a2cb0570bb3e","frameId":"frame@631bee0a802e0ef28332d2a3fcbc3071","frameUrl":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot%3A89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2%3A2&boardSnapshotInformation=blind_state&boardSnapshotRole=accessible_board_raster&boardGlyphs=full","doctype":"html","html":["HTML",{"__playwright_scroll_top_":"1116","lang":"en"},["HEAD",{},["BASE",{"href":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot%3A89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2%3A2&boardSnapshotInformation=blind_state&boardSnapshotRole=accessible_board_raster&boardGlyphs=full"}],"\n    ",["META",{"charset":"utf-8"}],"\n    ",["META",{"name":"viewport","content":"width=device-width, initial-scale=1.0"}],"\n    ","\n    ",["META",{"name":"description","content":"SRD-55 is a local-first character builder"}],"\n    ",["META",{"name":"theme-color","content":"#7c3a20"}],"\n    ",["LINK",{"rel":"manifest","href":"/manifest.webmanifest"}],"\n  
16:{"type":"frame-snapshot","snapshot":{"callId":"call@94","snapshotName":"after@call@94","pageId":"page@13898037b89e4ae18cd0a2cb0570bb3e","frameId":"frame@631bee0a802e0ef28332d2a3fcbc3071","frameUrl":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot-bootstrap&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board&boardGlyphs=full","doctype":"html","html":["HTML",{"lang":"en"},[[2,23]],[[2,24]],["BODY",{},[[2,25]],[[2,26]],[[2,36]],[[2,37]],["DIV",{"id":"app","aria-busy":"true"},["MAIN",{"class":"encounter-shell dm-encounter","data-persistence-flush-count":"1","data-persistence-flush-total-ms":"7.5999999940395355","data-persistence-flush-maximum-ms":"7.5999999940395355","data-render-count":"3","data-render-total-ms":"540.6000000089407","data-render-maximum-ms":"513.7999999970198","data-coalesced-snapshot-count":"0","data-session-revision":"5"},["DIV",{"class":"encounter-board","data-render-key":"encounter-board:encounter-art%3Areference-room%3Av1","data-art-package":"encounter-art:reference-room:v1","data-board-glyphs":"full","data-board-audience":"dm","data-board-snapshot":"true","data-source-revision":"1","data-source-round":"
52:{"type":"frame-snapshot","snapshot":{"callId":"call@109","snapshotName":"after@call@109","pageId":"page@13898037b89e4ae18cd0a2cb0570bb3e","frameId":"frame@631bee0a802e0ef28332d2a3fcbc3071","frameUrl":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot-bootstrap&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board&boardGlyphs=full","doctype":"html","html":["HTML",{"__playwright_scroll_top_":"1371","lang":"en"},[[10,23]],[[10,24]],["BODY",{},[[10,25]],[[10,26]],[[10,36]],[[10,37]],["DIV",{"id":"app","aria-busy":"true"},["MAIN",{"class":"encounter-shell dm-encounter","data-persistence-flush-count":"1","data-persistence-flush-total-ms":"7.5999999940395355","data-persistence-flush-maximum-ms":"7.5999999940395355","data-render-count":"4","data-render-total-ms":"555.9000000059605","data-render-maximum-ms":"513.7999999970198","data-coalesced-snapshot-count":"0","data-session-revision":"5"},["DIV",{"class":"encounter-board","data-render-key":"encounter-board:encounter-art%3Areference-room%3Av1","data-art-package":"encounter-art:reference-room:v1","data-board-glyphs":"full","data-board-audience":"dm","data-board-snapshot":"true","data-
82:{"type":"frame-snapshot","snapshot":{"callId":"call@120","snapshotName":"before@call@120","pageId":"page@13898037b89e4ae18cd0a2cb0570bb3e","frameId":"frame@631bee0a802e0ef28332d2a3fcbc3071","frameUrl":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot%3A220442d0ad3f0f6b8e2693878c0020d462d766b8d88f5fc50c38b0cdd80da1fc%3A3&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board&boardGlyphs=full","doctype":"html","html":["HTML",{"__playwright_scroll_top_":"1371","lang":"en"},[[1,2]],[[16,24]],["BODY",{},[[16,25]],[[16,26]],[[16,36]],[[16,37]],["DIV",{"id":"app","aria-busy":"true"},["MAIN",{"class":"encounter-shell dm-encounter","data-persistence-flush-count":"1","data-persistence-flush-total-ms":"9.699999988079071","data-persistence-flush-maximum-ms":"9.699999988079071","data-render-count":"2","data-render-total-ms":"103.59999999403954","data-render-maximum-ms":"52.70000000298023","data-coalesced-snapshot-count":"0","data-session-revision":"1"},["DIV",{"class":"encounter-board","data-render-key":"encounter-board:encounter-art%3Agenerated-19x17%3Av1","data-art-package":"encounter-art:generated-19x17:v1","data-board-glyphs":"full","
86:{"type":"frame-snapshot","snapshot":{"callId":"call@120","snapshotName":"after@call@120","pageId":"page@13898037b89e4ae18cd0a2cb0570bb3e","frameId":"frame@631bee0a802e0ef28332d2a3fcbc3071","frameUrl":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot%3A220442d0ad3f0f6b8e2693878c0020d462d766b8d88f5fc50c38b0cdd80da1fc%3A3&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board&boardGlyphs=full","doctype":"html","html":["HTML",{"__playwright_scroll_top_":"1371","lang":"en"},[[2,2]],[[17,24]],["BODY",{},[[17,25]],[[17,26]],[[17,36]],[[17,37]],["DIV",{"id":"app","aria-busy":"true"},["MAIN",{"class":"encounter-shell dm-encounter","data-persistence-flush-count":"2","data-persistence-flush-total-ms":"15.299999982118607","data-persistence-flush-maximum-ms":"9.699999988079071","data-render-count":"4","data-render-total-ms":"215.59999999403954","data-render-maximum-ms":"59.79999999701977","data-coalesced-snapshot-count":"0","data-session-revision":"1"},["DIV",{"class":"encounter-board","data-render-key":"encounter-board:encounter-art%3Agenerated-19x17%3Av1","data-art-package":"encounter-art:generated-19x17:v1","data-board-glyphs":"full","
87:{"type":"before","callId":"call@122","startTime":156930.025,"class":"Frame","method":"waitForFunction","params":{"expression":"expected => {\n        const selector = expected.informationMode === \"blind_state\" ? `[data-blind-snapshot-capture=true][data-blind-snapshot-role=${expected.role}]` : \".encounter-board\";\n        const candidate = document.querySelector(selector);\n        if (candidate === null) return false;\n        const bounds = candidate.getBoundingClientRect();\n        const style = getComputedStyle(candidate);\n        return bounds.width > 0 && bounds.height > 0 && style.visibility !== \"hidden\" && style.display !== \"none\" && candidate.dataset.boardAudience === (expected.role === \"player_board\" ? \"player\" : \"dm\") && candidate.dataset.sourceRevision === String(expected.revision) && candidate.dataset.sourceRound === String(expected.round) && candidate.dataset.sourceStateDigest === expected.stateDigest && (\n        // D525: a board rendered under another glyph mode than requested is never captured.\n        expected.boardGlyphs === null || candidate.dataset.boardGlyphs === expected.boardGlyphs);\n      }","isFunction":true,"arg":{"value":{"o":[{"k":"
89:{"type":"frame-snapshot","snapshot":{"callId":"call@122","snapshotName":"before@call@122","pageId":"page@13898037b89e4ae18cd0a2cb0570bb3e","frameId":"frame@631bee0a802e0ef28332d2a3fcbc3071","frameUrl":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot%3A220442d0ad3f0f6b8e2693878c0020d462d766b8d88f5fc50c38b0cdd80da1fc%3A3&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board&boardGlyphs=full","doctype":"html","html":["HTML",{"__playwright_scroll_top_":"1371","lang":"en"},[[3,2]],[[18,24]],["BODY",{},[[18,25]],[[18,26]],[[18,36]],[[18,37]],["DIV",{"id":"app","aria-busy":"true"},["MAIN",{"class":"encounter-shell dm-encounter","data-persistence-flush-count":"3","data-persistence-flush-total-ms":"20.19999998807907","data-persistence-flush-maximum-ms":"9.699999988079071","data-render-count":"5","data-render-total-ms":"267.69999998807907","data-render-maximum-ms":"59.79999999701977","data-coalesced-snapshot-count":"0","data-session-revision":"1"},["DIV",{"class":"encounter-board","data-render-key":"encounter-board:encounter-art%3Agenerated-19x17%3Av1","data-art-package":"encounter-art:generated-19x17:v1","data-board-glyphs":"full","
# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ai-dm-board-snapshot.spec.ts >> captures the full production DM board deterministically through durable save upload/load
- Location: tests/browser/ai-dm-board-snapshot.spec.ts:277:1

# Error details

```
"beforeAll" hook timeout of 30000ms exceeded.
```

```
"beforeAll" hook timeout of 30000ms exceeded.
```

```
"beforeAll" hook timeout of 30000ms exceeded.
```

```
"beforeAll" hook timeout of 30000ms exceeded.
```

```
Error: page.waitForFunction: Target page, context or browser has been closed
```

```
Error: page.waitForFunction: Target page, context or browser has been closed
```

```
Error: page.waitForFunction: Target page, context or browser has been closed
```

```
Error: page.waitForFunction: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e5]:
        - img
        - img
      - generic [ref=e6]:
        - img
        - img
      - generic [ref=e7]:
        - img
        - img
      - generic [ref=e8]:
        - img
        - img
      - generic [ref=e9]:
        - img
        - img
      - generic [ref=e10]:
        - img
        - img
      - generic [ref=e11]:
        - img
        - img
      - generic [ref=e12]:
        - img
        - img
      - generic [ref=e13]:
        - img
        - img
      - generic [ref=e14]:
        - img
        - img
      - generic [ref=e15]:
        - img
        - img
      - generic [ref=e16]:
        - img
        - img
      - generic [ref=e17]:
        - img
        - img
      - generic [ref=e18]:
        - img
        - img
      - generic [ref=e19]:
        - img
        - img
      - generic [ref=e20]:
        - img
        - img
      - generic [ref=e21]:
        - img
        - img
      - generic [ref=e22]:
        - img
        - img
      - generic [ref=e23]:
        - img
        - img
      - generic [ref=e24]:
        - img
        - img
      - generic [ref=e25]:
        - img
        - img
        - img
      - generic [ref=e26]:
        - img
        - img
      - generic [ref=e27]:
        - img
        - img
      - generic [ref=e28]:
        - img
        - img
      - generic [ref=e29]:
        - img
        - img
      - generic [ref=e30]:
        - img
        - img
      - generic [ref=e31]:
        - img
        - img
      - generic [ref=e32]:
        - img
        - img
      - generic [ref=e33]:
        - img
        - img
      - generic [ref=e34]:
        - img
        - img
      - generic [ref=e35]:
        - img
        - img
      - generic [ref=e36]:
        - img
        - img
      - generic [ref=e37]:
        - img
        - img
      - generic [ref=e38]:
        - img
        - img
      - generic [ref=e39]:
        - img
        - img
      - generic [ref=e40]:
        - img
        - img
      - generic [ref=e41]:
        - img
        - img
        - img
      - generic [ref=e42]:
        - img
        - img
      - generic [ref=e43]:
        - img
        - img
      - generic [ref=e44]:
        - img
        - img
      - generic [ref=e45]:
        - img
      - generic [ref=e46]:
        - img
      - generic [ref=e47]:
        - img
      - generic [ref=e48]:
        - img
      - generic [ref=e49]:
        - img
      - generic [ref=e50]:
        - img
      - generic [ref=e51]:
        - img
      - generic [ref=e52]:
        - img
      - generic [ref=e53]:
        - img
      - generic [ref=e54]:
        - img
      - generic [ref=e55]:
        - img
      - generic [ref=e56]:
        - img
      - generic [ref=e57]:
        - img
      - generic [ref=e58]:
        - img
      - generic [ref=e59]:
        - img
      - generic [ref=e60]:
        - img
        - img
      - generic [ref=e61]:
        - img
        - img
      - generic [ref=e62]:
        - img
        - img
      - generic [ref=e63]:
        - img
        - img
      - generic [ref=e64]:
        - img
      - generic [ref=e65]:
        - img
      - generic [ref=e66]:

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc "unzip -p /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip 3-trace.trace | jq -c 'select(.callId == \"call@122\" and .type == \"before\") | .params.arg'
unzip -p /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip 3-trace.trace | jq -c 'select(.type == \"frame-snapshot\") | .snapshot.html | .. | objects | select(has(\"data-source-state-digest\")) | {class, \"data-blind-snapshot-capture\", \"data-blind-snapshot-role\", \"data-board-audience\", \"data-source-revision\", \"data-source-round\", \"data-source-state-digest\", \"data-board-glyphs\"}' | sort -u" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 103ms:
{"class":"accessible-board","data-blind-snapshot-capture":"true","data-blind-snapshot-role":"accessible_board_raster","data-board-audience":"dm","data-source-revision":"0","data-source-round":"0","data-source-state-digest":"34724654c3898715fb3984720852e54bf391df1fe5c86fa7759ca154a76d6352","data-board-glyphs":"full"}
{"class":"encounter-board","data-blind-snapshot-capture":"true","data-blind-snapshot-role":"dm_board","data-board-audience":"dm","data-source-revision":"0","data-source-round":"0","data-source-state-digest":"0e8663892f95bb0b149aae4333b28e76d2a8f03e5d55b21ee15b0f4575437407","data-board-glyphs":"full"}
{"class":"encounter-board","data-blind-snapshot-capture":"true","data-blind-snapshot-role":"dm_board","data-board-audience":"dm","data-source-revision":"1","data-source-round":"1","data-source-state-digest":"0b2ea8c2efb6aef0bec90dcd8ebdeadef1059b8522af36fc3532060889c567b1","data-board-glyphs":"full"}

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc 'for trace in test.trace 3-trace.trace 4-trace.trace; do echo "$trace"; unzip -p /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip "$trace" | jq -r '"'select(.type == \"before\" and .method == \"waitForFunction\") | [.callId, (.params.arg.value.o[] | select(.k == \"stateDigest\").v.s), (.params.arg.value.o[] | select(.k == \"role\").v.s)] | @tsv'; done
for trace in 3-trace.trace 4-trace.trace; do echo \""'$trace"; unzip -p /tmp/dnd-multiclass-spells-static-playwright/ai-dm-board-snapshot-captu-81997-gh-durable-save-upload-load-chromium/trace.zip "$trace" | jq -c '"'select(.type == \"frame-snapshot\") | .snapshot as "'$snapshot | $snapshot.html | .. | objects | select(has("data-source-state-digest")) | {url: $snapshot.frameUrl, role: .["data-blind-snapshot-role"], audience: .["data-board-audience"], revision: .["data-source-revision"], round: .["data-source-round"], digest: .["data-source-state-digest"], glyphs: .["data-board-glyphs"]}'"' | sort -u; done" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 136ms:
3-trace.trace
{"url":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot%3A220442d0ad3f0f6b8e2693878c0020d462d766b8d88f5fc50c38b0cdd80da1fc%3A3&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board&boardGlyphs=full","role":"dm_board","audience":"dm","revision":"0","round":"0","digest":"0e8663892f95bb0b149aae4333b28e76d2a8f03e5d55b21ee15b0f4575437407","glyphs":"full"}
{"url":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot%3A89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2%3A2&boardSnapshotInformation=blind_state&boardSnapshotRole=accessible_board_raster&boardGlyphs=full","role":"accessible_board_raster","audience":"dm","revision":"0","round":"0","digest":"34724654c3898715fb3984720852e54bf391df1fe5c86fa7759ca154a76d6352","glyphs":"full"}
{"url":"http://127.0.0.1:44835/vtt?encounter=reference&view=dm&boardSnapshot=1&session=board-snapshot-bootstrap&boardSnapshotInformation=blind_state&boardSnapshotRole=dm_board&boardGlyphs=full","role":"dm_board","audience":"dm","revision":"1","round":"1","digest":"0b2ea8c2efb6aef0bec90dcd8ebdeadef1059b8522af36fc3532060889c567b1","glyphs":"full"}
4-trace.trace

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc "npx vite-node -e \"import { loadArenaFixture } from './src/vtt/mcp/entrypoint.ts'; import { boardStateDigest } from './tools/ai-dm-board-snapshot.ts'; import { projectDmView } from './src/combat/visibility.ts'; import { canonicalJson, sha256 } from './src/shared/canonical-json.ts'; const state=await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117001.json'); console.log(JSON.stringify({state:boardStateDigest(state),projection:sha256(canonicalJson(projectDmView(state).state)),fog:projectDmView(state).state.foggedCells.length}));\"" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 exited 1 in 138ms:
No files specified.
vite-node/3.2.4

Usage:
  $ vite-node [...files]

Commands:
  [...files]  

For more info, run any command with the `--help` flag:
  $ vite-node --help

Options:
  -r, --root <path>    Use specified root directory 
  -c, --config <path>  Use specified config file 
  -m, --mode <mode>    Set env mode 
  -w, --watch          Restart on file changes, similar to "nodemon" 
  --script             Use vite-node as a script runner 
  --options <options>  Use specified Vite server options 
  -v, --version        Output the version number 
  -h, --help           Display help for command 
  -v, --version        Display version number 

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc 'head -80 tools/ai-dm-board-snapshot.ts
rg -n "export function sha256|export function canonicalJson" src | head' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { arch, platform, release, tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { preview, type PreviewServer } from 'vite';
import { canonicalJson } from '../src/commands/canonical-json';
import type { ControllerIdentity } from '../src/combat/controllers';
import type { PersistedCoordinatorState } from '../src/combat/coordinator';
import type { EncounterState } from '../src/combat/encounter';
import { projectDmView } from '../src/combat/visibility';
import { mulberry32 } from '../src/combat/random';
import { isBoardGlyphMode, type BoardGlyphMode } from '../src/assets/board-glyphs';
import {
  encounterBranchId,
  encounterSessionId,
  type EncounterSessionId,
} from '../src/combat/values';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  exportSavedSession,
} from '../src/vtt/session-persistence';
import { projectEncounterBoard } from '../src/vtt/encounter-board';
import { serializeAccessibleBoard } from '../src/vtt/accessible-board';

const repositoryRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
export const MAX_BOARD_PNG_BYTES = 1_000_000;
const VIEWPORT = Object.freeze({ width: 1_280, height: 1_280 });
const SNAPSHOT_CANARY = 'board-snapshot-element-crop-canary';
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function configuredPreviewPort(
  environment: Readonly<NodeJS.ProcessEnv> = process.env,
): number {
  const raw = environment['BOARD_SNAPSHOT_PREVIEW_PORT'];
  if (raw === undefined) return 0;
  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    throw new RangeError(
      `BOARD_SNAPSHOT_PREVIEW_PORT must be a valid port; received "${raw}".`,
    );
  }
  return port;
}

export type CaptureTilePx = 64 | 128;
export type BoardSnapshotInformationMode = 'advice' | 'blind_state';
export type BoardSnapshotImageRole = 'dm_board' | 'accessible_board_raster' | 'player_board';
export const BLIND_STATE_PRIMER_VERSION = 'd562-general-board-primer-v10' as const;
export const BOARD_SNAPSHOT_IMAGE_ROLES = Object.freeze([
  'dm_board',
  'accessible_board_raster',
  'player_board',
] as const satisfies readonly BoardSnapshotImageRole[]);

export function boardSnapshotInformationMode(
  mode?: BoardSnapshotInformationMode,
): BoardSnapshotInformationMode {
  return mode ?? 'advice';
}

export function boardSnapshotCaptureGeometry(
  captureTilePx: CaptureTilePx = 128,
): {
  readonly tileSizeCssPx: CaptureTilePx;
  readonly markerHeightCssPx: number;
src/crypto/sha256.ts:28:export function sha256(value: string): string {
src/commands/canonical-json.ts:70:export function canonicalJson(value: unknown): string {

diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

apply patch
patch: completed
/tmp/land02-digests.ts
diff --git a//tmp/land02-digests.ts b//tmp/land02-digests.ts
new file mode 100644
index 0000000000000000000000000000000000000000..cfcf016574cc659a4012d584be907131b3101f29
--- /dev/null
+++ b//tmp/land02-digests.ts
@@ -0,0 +1,16 @@
+import { createHash } from 'node:crypto';
+import { canonicalJson } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/commands/canonical-json.ts';
+import { projectDmView } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility.ts';
+import { loadArenaFixture } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/mcp/entrypoint.ts';
+import { boardStateDigest } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-board-snapshot.ts';
+
+const state = await loadArenaFixture(
+  '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/fixtures/arena-basis-hard/seed-5117001.json',
+);
+const projected = projectDmView(state).state;
+const projectionDigest = createHash('sha256').update(canonicalJson(projected)).digest('hex');
+console.log(JSON.stringify({
+  stateDigest: boardStateDigest(state),
+  projectionDigest,
+  foggedCells: projected.foggedCells,
+}));
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

diff --git a//tmp/land02-digests.ts b//tmp/land02-digests.ts
new file mode 100644
index 0000000000000000000000000000000000000000..cfcf016574cc659a4012d584be907131b3101f29
--- /dev/null
+++ b//tmp/land02-digests.ts
@@ -0,0 +1,16 @@
+import { createHash } from 'node:crypto';
+import { canonicalJson } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/commands/canonical-json.ts';
+import { projectDmView } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility.ts';
+import { loadArenaFixture } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/mcp/entrypoint.ts';
+import { boardStateDigest } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-board-snapshot.ts';
+
+const state = await loadArenaFixture(
+  '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/fixtures/arena-basis-hard/seed-5117001.json',
+);
+const projected = projectDmView(state).state;
+const projectionDigest = createHash('sha256').update(canonicalJson(projected)).digest('hex');
+console.log(JSON.stringify({
+  stateDigest: boardStateDigest(state),
+  projectionDigest,
+  foggedCells: projected.foggedCells,
+}));
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

exec
/bin/bash -lc 'node_modules/.bin/vite-node /tmp/land02-digests.ts' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 4576ms:
{"stateDigest":"89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2","projectionDigest":"34724654c3898715fb3984720852e54bf391df1fe5c86fa7759ca154a76d6352","foggedCells":[{"column":9,"row":0},{"column":10,"row":0},{"column":11,"row":0},{"column":12,"row":0},{"column":13,"row":0},{"column":14,"row":0},{"column":15,"row":0},{"column":16,"row":0},{"column":9,"row":1},{"column":10,"row":1},{"column":11,"row":1},{"column":12,"row":1},{"column":13,"row":1},{"column":14,"row":1},{"column":15,"row":1},{"column":16,"row":1},{"column":9,"row":2},{"column":10,"row":2},{"column":11,"row":2},{"column":12,"row":2},{"column":13,"row":2},{"column":14,"row":2},{"column":15,"row":2},{"column":16,"row":2},{"column":9,"row":3},{"column":10,"row":3},{"column":11,"row":3},{"column":12,"row":3},{"column":13,"row":3},{"column":14,"row":3},{"column":15,"row":3},{"column":16,"row":3},{"column":9,"row":4},{"column":10,"row":4},{"column":11,"row":4},{"column":12,"row":4},{"column":13,"row":4},{"column":14,"row":4},{"column":15,"row":4},{"column":16,"row":4},{"column":9,"row":5},{"column":10,"row":5},{"column":11,"row":5},{"column":12,"row":5},{"column":13,"row":5},{"column":14,"row":5},{"column":15,"row":5},{"column":16,"row":5},{"column":9,"row":6},{"column":10,"row":6},{"column":11,"row":6},{"column":12,"row":6},{"column":13,"row":6},{"column":14,"row":6},{"column":15,"row":6},{"column":16,"row":6},{"column":9,"row":7},{"column":10,"row":7},{"column":11,"row":7},{"column":12,"row":7},{"column":13,"row":7},{"column":14,"row":7},{"column":15,"row":7},{"column":16,"row":7},{"column":9,"row":8},{"column":10,"row":8},{"column":11,"row":8},{"column":12,"row":8},{"column":13,"row":8},{"column":14,"row":8},{"column":15,"row":8},{"column":16,"row":8},{"column":9,"row":9},{"column":10,"row":9},{"column":11,"row":9},{"column":12,"row":9},{"column":13,"row":9},{"column":14,"row":9},{"column":15,"row":9},{"column":16,"row":9},{"column":9,"row":10},{"column":10,"row":10},{"column":11,"row":10},{"column":12,"row":10},{"column":13,"row":10},{"column":14,"row":10},{"column":15,"row":10},{"column":16,"row":10},{"column":9,"row":11},{"column":10,"row":11},{"column":11,"row":11},{"column":12,"row":11},{"column":13,"row":11},{"column":14,"row":11},{"column":15,"row":11},{"column":16,"row":11},{"column":9,"row":12},{"column":10,"row":12},{"column":11,"row":12},{"column":12,"row":12},{"column":13,"row":12},{"column":14,"row":12},{"column":15,"row":12},{"column":16,"row":12},{"column":9,"row":13},{"column":10,"row":13},{"column":11,"row":13},{"column":12,"row":13},{"column":13,"row":13},{"column":14,"row":13},{"column":15,"row":13},{"column":16,"row":13},{"column":9,"row":14},{"column":10,"row":14},{"column":11,"row":14},{"column":12,"row":14},{"column":13,"row":14},{"column":14,"row":14},{"column":15,"row":14},{"column":16,"row":14},{"column":9,"row":15},{"column":10,"row":15},{"column":11,"row":15},{"column":12,"row":15},{"column":13,"row":15},{"column":14,"row":15},{"column":15,"row":15},{"column":16,"row":15},{"column":9,"row":16},{"column":10,"row":16},{"column":11,"row":16},{"column":12,"row":16},{"column":13,"row":16},{"column":14,"row":16},{"column":15,"row":16},{"column":16,"row":16},{"column":9,"row":17},{"column":10,"row":17},{"column":11,"row":17},{"column":12,"row":17},{"column":13,"row":17},{"column":14,"row":17},{"column":15,"row":17},{"column":16,"row":17},{"column":9,"row":18},{"column":10,"row":18},{"column":11,"row":18},{"column":12,"row":18},{"column":13,"row":18},{"column":14,"row":18},{"column":15,"row":18},{"column":16,"row":18},{"column":9,"row":19},{"column":10,"row":19},{"column":11,"row":19},{"column":12,"row":19},{"column":13,"row":19},{"column":14,"row":19},{"column":15,"row":19},{"column":16,"row":19},{"column":9,"row":20},{"column":10,"row":20},{"column":11,"row":20},{"column":12,"row":20},{"column":13,"row":20},{"column":14,"row":20},{"column":15,"row":20},{"column":16,"row":20},{"column":9,"row":21},{"column":10,"row":21},{"column":11,"row":21},{"column":12,"row":21},{"column":13,"row":21},{"column":14,"row":21},{"column":15,"row":21},{"column":16,"row":21}]}

diff --git a//tmp/land02-digests.ts b//tmp/land02-digests.ts
new file mode 100644
index 0000000000000000000000000000000000000000..cfcf016574cc659a4012d584be907131b3101f29
--- /dev/null
+++ b//tmp/land02-digests.ts
@@ -0,0 +1,16 @@
+import { createHash } from 'node:crypto';
+import { canonicalJson } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/commands/canonical-json.ts';
+import { projectDmView } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility.ts';
+import { loadArenaFixture } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/mcp/entrypoint.ts';
+import { boardStateDigest } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-board-snapshot.ts';
+
+const state = await loadArenaFixture(
+  '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/fixtures/arena-basis-hard/seed-5117001.json',
+);
+const projected = projectDmView(state).state;
+const projectionDigest = createHash('sha256').update(canonicalJson(projected)).digest('hex');
+console.log(JSON.stringify({
+  stateDigest: boardStateDigest(state),
+  projectionDigest,
+  foggedCells: projected.foggedCells,
+}));
diff --git a/tests/browser/ai-dm-board-snapshot.spec.ts b/tests/browser/ai-dm-board-snapshot.spec.ts
index 449fd5c7763e2f72527dfc338175fd2629990078..052430e062946af333621ddad3d0b16c71dfa95f
--- a/tests/browser/ai-dm-board-snapshot.spec.ts
+++ b/tests/browser/ai-dm-board-snapshot.spec.ts
@@ -209,10 +209,29 @@
   preparedHardBlindFixture = await blindRuntime.prepareBlindBoardSnapshotFixture(
     blindRuntime.BLIND_BOARD_SNAPSHOT_FIXTURES[0],
   );
-  await blindRuntime.warmPreparedBlindBoardSnapshot(
-    blindService,
-    preparedHardBlindFixture,
-  );
+  try {
+    await blindRuntime.warmPreparedBlindBoardSnapshot(
+      blindService,
+      preparedHardBlindFixture,
+    );
+  } catch (error: unknown) {
+    const source = Reflect.get(preparedHardBlindFixture, 'source');
+    const pages = browser.contexts().flatMap((context) => context.pages());
+    const candidates = await Promise.all(pages.map(async (candidatePage) => candidatePage.evaluate(() =>
+      Array.from(document.querySelectorAll<HTMLElement>('[data-blind-snapshot-capture=true]')).map(
+        (element) => ({
+          role: element.dataset.blindSnapshotRole ?? '',
+          audience: element.dataset.boardAudience ?? '',
+          revision: element.dataset.sourceRevision ?? '',
+          round: element.dataset.sourceRound ?? '',
+          stateDigest: element.dataset.sourceStateDigest ?? '',
+          glyphs: element.dataset.boardGlyphs ?? '',
+        }),
+      ),
+    )));
+    console.error('LAND02_PREDICATE_PROBE', JSON.stringify({ source, candidates }));
+    throw error;
+  }
 });
 
 test.beforeAll(async () => {

codex
The trace captured the live board before teardown. For the hard fixture, audience `dm`, revision `0`, round `0`, and glyphs `full` all match; only the digest differs: service `89d40e…16a2`, rendered board `347246…6352`. The latter exactly equals the hash of `projectDmView(state).state`, whose newly derived fog contains 176 cells behind the wall. I’m removing the temporary probe now and will leave the snapshot spec untouched, as required for a production-code defect.
apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/ai-dm-board-snapshot.spec.ts
/tmp/land02-digests.ts
apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/vtt-encounter.spec.ts
diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

exec
/bin/bash -lc 'PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test tests/browser/vtt-encounter.spec.ts --project=chromium' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

 succeeded in 62109ms:
[WebServer] (node:43) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
[WebServer] (Use `node --trace-warnings ...` to show where the warning was created)

Running 3 tests using 1 worker

(node:68) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' env being set.
(Use `node --trace-warnings ...` to show where the warning was created)
  ✓  1 [chromium] › tests/browser/vtt-encounter.spec.ts:26:1 › DM loads the bundled D365 dungeon and RPC-authored party into room 1 (26.7s)
  ✓  2 [chromium] › tests/browser/vtt-encounter.spec.ts:105:1 › DM composes stored builder characters and each PC defaults to human control (18.9s)
  ✓  3 [chromium] › tests/browser/vtt-encounter.spec.ts:173:1 › M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow (15.1s)

  3 passed (1.0m)

diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

codex
The hand-derived reference re-pin is green: all 3 tests in `vtt-encounter.spec.ts` passed, including the target flow in 15.1 seconds. No other browser spec contains a fog/concealment assertion for the reference, Vane, two-room, or D365 scenes; the two-room specs pin transport-visible token positions only, and the remaining named-scene specs pin mounting/controls rather than visibility.
exec
/bin/bash -lc 'npx tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
exec
/bin/bash -lc 'npx tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 14384ms:
 succeeded in 27627ms:
diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

exec
/bin/bash -lc 'git diff --check && git status --short && git diff -- tests/browser/vtt-encounter.spec.ts tests/browser/ai-dm-board-snapshot.spec.ts' in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
 M tests/browser/vtt-encounter.spec.ts
diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b5..c468a43a 100644
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@ test('M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable ref
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

exec
/bin/bash -lc "nl -ba src/vtt/encounter-projections.ts | sed -n '480,492p'
nl -ba src/combat/visibility.ts | sed -n '506,530p'
nl -ba tools/ai-dm-board-snapshot.ts | sed -n '198,223p;1008,1021p'
nl -ba src/vtt/encounter-app.ts | sed -n '2298,2311p'
nl -ba tests/browser/vtt-encounter.spec.ts | sed -n '230,257p'
rg -n \"encounter-art-fog|data-cell|concealed\" tests/browser/vtt-encounter.spec.ts" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
   480	      request: structuredClone(request),
   481	      combatantName: names.get(request.actorId as CombatantId) ?? request.actorId,
   482	      interactive: true as const,
   483	    }));
   484	  const offerEnvironment = input.offerEnvironment;
   485	  const offeredActors = offeredOptionActorsForState(input.view.state, undefined, offerEnvironment);
   486	  return {
   487	    audience: 'dm',
   488	    stateDigest: sha256(canonicalJson(input.view.state)),
   489	    offerEnvironmentDigest: offerEnvironment.digest,
   490	    encounter: dmVisibleEncounter(input.view),
   491	    board: projectEncounterBoard(input.view, input.coordinator.pendingRequest, targets),
   492	    coordinator: input.coordinator,
   506	export function projectDmView(state: EncounterState): DmView {
   507	  const visibilityObserverIds = eligibleVisibilityObserverIds(state, { kind: 'dm_party' });
   508	  return {
   509	    audience: 'dm',
   510	    state: {
   511	      config: structuredClone(state.config),
   512	      phase: structuredClone(state.phase),
   513	      rulesEdition: state.rulesEdition,
   514	      hiddenRolls: [...state.hiddenRolls],
   515	      revision: state.revision,
   516	      nextEventSequence: state.nextEventSequence,
   517	      nextDecisionSequence: state.nextDecisionSequence,
   518	      nextEffectSequence: state.nextEffectSequence,
   519	      bounds: structuredClone(state.bounds),
   520	      blockedCells: structuredClone(state.blockedCells),
   521	      worldObjects: structuredClone(state.worldObjects),
   522	      nextWorldObjectSequence: state.nextWorldObjectSequence,
   523	      environment: structuredClone(state.environment),
   524	      foggedCells: derivedFogCells(state, visibilityObserverIds),
   525	      dmNotes: [...state.dmNotes],
   526	      combatants: structuredClone(state.combatants),
   527	      tokens: structuredClone(state.tokens),
   528	      sharedSpaceRelations: structuredClone(state.sharedSpaceRelations),
   529	      adjudicationPending: structuredClone(state.adjudicationPending),
   530	      ...(state.absentTokens === undefined ? {} : { absentTokens: structuredClone(state.absentTokens) }),
   198	  return createHash('sha256').update(value).digest('hex');
   199	}
   200	
   201	export function boardStateDigest(state: EncounterState): string {
   202	  return sha256Bytes(Buffer.from(canonicalJson(state), 'utf8'));
   203	}
   204	
   205	function validateSource(state: EncounterState, source: BoardImageSource): void {
   206	  if (!Number.isSafeInteger(source.room) || source.room < 1) {
   207	    throw new RangeError('Board image room must be a positive safe integer.');
   208	  }
   209	  if (source.round !== state.round) {
   210	    throw new Error(`Board image round ${String(source.round)} does not match state round ${String(state.round)}.`);
   211	  }
   212	  if (source.revision !== state.revision) {
   213	    throw new Error(`Board image revision ${String(source.revision)} does not match state revision ${String(state.revision)}.`);
   214	  }
   215	  if (!SHA256_PATTERN.test(source.stateDigest)) {
   216	    throw new TypeError('Board image state digest must be a lowercase SHA-256 digest.');
   217	  }
   218	  const digest = boardStateDigest(state);
   219	  if (source.stateDigest !== digest) {
   220	    throw new Error(`Board image state digest ${source.stateDigest} does not match canonical state ${digest}.`);
   221	  }
   222	}
   223	
  1008	        if (candidate === null) return false;
  1009	        const bounds = candidate.getBoundingClientRect();
  1010	        const style = getComputedStyle(candidate);
  1011	        return bounds.width > 0 && bounds.height > 0 &&
  1012	          style.visibility !== 'hidden' && style.display !== 'none' &&
  1013	          candidate.dataset.boardAudience === (expected.role === 'player_board' ? 'player' : 'dm') &&
  1014	          candidate.dataset.sourceRevision === String(expected.revision) &&
  1015	          candidate.dataset.sourceRound === String(expected.round) &&
  1016	          candidate.dataset.sourceStateDigest === expected.stateDigest &&
  1017	          // D525: a board rendered under another glyph mode than requested is never captured.
  1018	          (expected.boardGlyphs === null || candidate.dataset.boardGlyphs === expected.boardGlyphs);
  1019	      }, {
  1020	        ...source,
  1021	        boardGlyphs: this.#boardGlyphs,
  2298	  #markBlindSnapshotCapture(
  2299	    element: HTMLElement,
  2300	    projection: TopDownDmBoardProjection,
  2301	    role: BoardSnapshotRole,
  2302	  ): void {
  2303	    element.dataset.blindSnapshotCapture = 'true';
  2304	    element.dataset.blindSnapshotRole = role;
  2305	    element.dataset.boardAudience = role === 'player_board' ? 'player' : 'dm';
  2306	    element.dataset.sourceRevision = String(projection.encounter.revision);
  2307	    element.dataset.sourceRound = String(projection.board.round);
  2308	    element.dataset.sourceStateDigest = projection.stateDigest;
  2309	    element.dataset.boardGlyphs = encounterArtForBoard(
  2310	      projection.board,
  2311	      this.boardGlyphs,
   230	  const tray = dm.locator('.dm-decision-tray');
   231	  await expect(tray.locator('[data-entry-kind="pending"]')).toContainText(
   232	    'Reference Fighter — opportunity attack',
   233	  );
   234	  await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   235	  await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   236	  await dm.getByRole('button', { name: 'Hide', exact: true }).click();
   237	  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
   238	  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
   239	  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
   240	  // body supplies no light. DM fog and the owned-party complement are therefore
   241	  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
   242	  // the floor beneath the fog overlay but receives no Hidden monster geometry.
   243	  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   244	  await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   245	  await expect(dm.locator(
   246	    '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   247	  )).toHaveAttribute('data-hidden-from-players', 'true');
   248	  await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
   249	  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   250	  await expect(page.locator(
   251	    '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   252	  )).toHaveCount(0);
   253	  await expect(dm.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();
   254	
   255	  await dm.getByLabel('Adjudication target').selectOption({ label: 'Reference Fighter' });
   256	  await dm.getByLabel('Hit Point delta').fill('-999');
   257	  await dm.getByLabel('DM reasoning').fill('DM-only collapse reasoning sentinel');
243:  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
244:  await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
248:  await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
249:  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);

diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

exec
/bin/bash -lc "rg -n \"projectDmView\" tools/ai-dm-board-snapshot.ts tests/unit tools | head -80
rg -n \"boardStateDigest\\(\" tests --glob '*.ts' | head -100
rg -n \"stateDigest.*projectDmBoard|projectDmBoard.*stateDigest|projection\\.stateDigest\" tests/unit/vtt tests/unit/tools --glob '*.ts' | head -120" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
tools/ai-dm-board-snapshot.ts:22:import { projectDmView } from '../src/combat/visibility';
tools/ai-dm-board-snapshot.ts:868:      board: projectEncounterBoard(projectDmView(input.state)),
tests/unit/combat/death-saves.test.ts:9:import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
tests/unit/combat/death-saves.test.ts:512:    const dm = projectDmView(resolved);
tools/ai-dm-screenshot-probe.ts:31:import { dmVisibleEncounter, projectDmView } from '../src/combat/visibility';
tools/ai-dm-screenshot-probe.ts:829:  const dmView = projectDmView(state);
tools/ai-dm-screenshot-probe.ts:2637:    view: projectDmView(state),
tools/ai-dm-blind-board-snapshot-check.ts:6:import { projectDmView } from '../src/combat/visibility';
tools/ai-dm-blind-board-snapshot-check.ts:60:  const board = projectEncounterBoard(projectDmView(state));
tools/ai-dm-board-snapshot.ts:22:import { projectDmView } from '../src/combat/visibility';
tools/ai-dm-board-snapshot.ts:868:      board: projectEncounterBoard(projectDmView(input.state)),
tests/unit/combat/controllers-mutation.test.ts:36:  projectDmView,
tests/unit/combat/controllers-mutation.test.ts:125:    visibleState: dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1291:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1323:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1348:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1401:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1442:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1475:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1498:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1520:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1549:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1561:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1580:      dmVisibleEncounter(projectDmView(state)),
tests/unit/combat/controllers-mutation.test.ts:1598:      const visible = dmVisibleEncounter(projectDmView(startedState([actor, enemy])));
tests/unit/combat/controllers-mutation.test.ts:1607:    const visible = dmVisibleEncounter(projectDmView(startedState([actor, enemy])));
tests/unit/combat/controllers-mutation.test.ts:1616:    const visible = dmVisibleEncounter(projectDmView(state));
tests/unit/combat/controllers-mutation.test.ts:1620:    const dead = dmVisibleEncounter(projectDmView(withHitPoints(state, actor.id, 0, 'dead')));
tests/unit/combat/controllers-mutation.test.ts:1634:    const visible = dmVisibleEncounter(projectDmView(state));
tools/vtt-soak.ts:18:import { projectDmView } from '../src/combat/visibility';
tools/vtt-soak.ts:192:          view: projectDmView(coordinator.state()),
tests/unit/combat/visibility.test.ts:7:  projectDmView,
tests/unit/combat/visibility.test.ts:136:    expect(cellKeys(projectDmView(state).state.foggedCells)).toEqual(['0,0', '1,0', '2,0']);
tests/unit/combat/visibility.test.ts:158:      expect(cellKeys(projectDmView(state).state.foggedCells), life).toEqual(['0,0', '1,0', '2,0']);
tests/unit/combat/visibility.test.ts:172:    expect(cellKeys(projectDmView(state).state.foggedCells)).toEqual(['1,0', '2,0']);
tests/unit/combat/visibility.test.ts:184:    expect(cellKeys(projectDmView(state).state.foggedCells)).toEqual(['0,0', '1,0']);
tests/unit/combat/visibility.test.ts:365:    expect(cellKeys(projectDmView(clear).state.foggedCells)).toEqual([]);
tests/unit/combat/visibility.test.ts:366:    expect(cellKeys(projectDmView(dark).state.foggedCells)).toEqual(['1,0']);
tests/unit/combat/visibility.test.ts:375:    const view = projectDmView(state);
tests/unit/combat/visibility.test.ts:471:    const dm = dmVisibleEncounter(projectDmView(state));
tests/unit/combat/visibility.test.ts:513:    const dm = dmVisibleEncounter(projectDmView(hidden));
tests/unit/combat/visibility.test.ts:575:    const dm = dmVisibleEncounter(projectDmView(state));
tools/vtt-experiment.ts:12:import { projectDmView } from '../src/combat/visibility';
tools/vtt-experiment.ts:1477:            view: projectDmView(encounterState),
tests/unit/bridge/narration.test.ts:3:import { dmVisibleEncounter, projectDmView } from '../../../src/combat/visibility';
tests/unit/bridge/narration.test.ts:88:    const projection = dmVisibleEncounter(projectDmView(state));
tests/unit/bridge/js-round-plan-integration.test.ts:5:import { projectDmView } from '../../../src/combat/visibility';
tests/unit/bridge/js-round-plan-integration.test.ts:129:      view: projectDmView(state),
tests/unit/bridge/js-round-plan-integration.test.ts:162:    view: projectDmView(state),
tests/unit/bridge/turn-program-library.test.ts:3:import { dmVisibleEncounter, projectDmView, type DmVisibleEncounterState } from '../../../src/combat/visibility';
tests/unit/bridge/turn-program-library.test.ts:35:  return dmVisibleEncounter(projectDmView(state));
tests/unit/vtt/engine-state-capsule.test.ts:6:import { projectDmView } from '../../../src/combat/visibility';
tests/unit/vtt/engine-state-capsule.test.ts:145:    view: projectDmView(state),
tests/unit/vtt/engine-state-capsule.test.ts:377:      view: projectDmView(pendingState),
tests/unit/bridge/decision-program.test.ts:9:import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
tests/unit/bridge/decision-program.test.ts:77:    view: projectDmView(state),
tests/unit/vtt/last-seen.test.ts:4:import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
tests/unit/vtt/last-seen.test.ts:258:      view: projectDmView(hidden), coordinator: IDLE, controllers: [], history: [],
tests/unit/bridge/steering.test.ts:5:import { projectDmView } from '../../../src/combat/visibility';
tests/unit/bridge/steering.test.ts:62:    view: projectDmView(state),
tests/unit/bridge/projection-transport.test.ts:4:import { projectDmView } from '../../../src/combat/visibility';
tests/unit/bridge/projection-transport.test.ts:46:    view: projectDmView(encounterState),
tests/unit/vtt/challenge-room-fixtures.test.ts:12:import { projectDmView } from '../../../src/combat/visibility';
tests/unit/vtt/challenge-room-fixtures.test.ts:145:    expect(inspection).toContain('const board = projectEncounterBoard(projectDmView(state));');
tests/unit/vtt/challenge-room-fixtures.test.ts:154:    expect(projectEncounterBoard(projectDmView(state)).foggedCells).toEqual([
tests/unit/vtt/semantic-board-payload.test.ts:11:import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
tests/unit/vtt/semantic-board-payload.test.ts:109:      view: projectDmView(hiddenState),
tests/unit/vtt/semantic-board-payload.test.ts:207:      view: projectDmView(createEncounter({
tests/unit/vtt/semantic-board-payload.test.ts:260:      view: projectDmView(createEncounter({
tests/unit/bridge/js-turn-program.test.ts:3:import { dmVisibleEncounter, projectDmView, type DmVisibleEncounterState } from '../../../src/combat/visibility';
tests/unit/bridge/js-turn-program.test.ts:30:  return dmVisibleEncounter(projectDmView(state));
tests/unit/vtt/footprint-increment-four.test.ts:20:import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
tests/unit/vtt/footprint-increment-four.test.ts:417:    const board = projectEncounterBoard(projectDmView(state));
tests/unit/vtt/footprint-increment-four.test.ts:439:      view: projectDmView(state),
tests/unit/vtt/scene-snapshot.test.ts:6:import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
tests/unit/vtt/scene-snapshot.test.ts:82:    view: projectDmView(state),
tests/unit/vtt/scene-snapshot.test.ts:246:    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
tests/unit/vtt/scene-snapshot.test.ts:300:      view: projectDmView(state),
tests/unit/vtt/scene-snapshot.test.ts:322:        view: projectDmView(state),
tests/unit/tools/ai-dm-board-snapshot.test.ts:6:import { projectDmView } from '../../../src/combat/visibility';
tests/unit/tools/ai-dm-screenshot-probe.test.ts:526:      boardStateDigest(candidate.state),
tests/unit/tools/ai-dm-screenshot-probe.test.ts:1071:      new Set(first.map((candidate) => boardStateDigest(candidate.state))).size,
tests/unit/tools/ai-dm-screenshot-probe.test.ts:1076:        digest: boardStateDigest(candidate.state),
tests/unit/tools/ai-dm-screenshot-probe.test.ts:1081:        digest: boardStateDigest(candidate.state),
tests/unit/tools/ai-dm-board-snapshot.test.ts:65:    stateDigest: boardStateDigest(state),
tests/unit/tools/ai-dm-board-snapshot.test.ts:162:        { revision: state.revision, round: state.round, stateDigest: boardStateDigest(state) },
tests/unit/tools/ai-dm-board-snapshot.test.ts:214:    expect(stateOnly.stateDigest).toBe(projection.stateDigest);

diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

exec
/bin/bash -lc "sed -n '1,235p' tests/unit/tools/ai-dm-board-snapshot.test.ts
rg -n \"stateDigest: sha256\\(canonicalJson\\(input\\.view\\.state\\)\\)|sha256\\(canonicalJson\\(.*view\\.state\" src tools" in /home/vagrant/PhpstormProjects/dnd-wt-vis-field
 succeeded in 0ms:
import { describe, expect, it } from 'vitest';
import { readFile } from '../../helpers/test-filesystem-promises';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { EncounterState } from '../../../src/combat/encounter';
import { terrainWallCells } from '../../../src/combat/terrain';
import { projectDmView } from '../../../src/combat/visibility';
import { projectDmBoard, projectStateOnlyDmBoard } from '../../../src/vtt/encounter-projections';
import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
import { renderBoard } from '../../../src/vtt/encounter-app';
import {
  encounterBoardRenderModel,
  projectEncounterBoard,
  projectEncounterTerrainCells,
} from '../../../src/vtt/encounter-board';
import {
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  importSavedSession,
  EncounterSessionJournal,
} from '../../../src/vtt/session-persistence';
import {
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
import {
  createDisabledEngineOfferFamilyPolicy,
} from '../../../src/vtt/offers/offer-environment';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
import {
  assertBoardImageFresh,
  assertSynchronizedBoardImages,
  BLIND_STATE_PRIMER_VERSION,
  BOARD_SNAPSHOT_IMAGE_ROLES,
  BOARD_SNAPSHOT_TERRAIN_SELECTORS,
  boardSnapshotCaptureGeometry,
  boardSnapshotInformationMode,
  boardSnapshotVisualDescriptor,
  boardStateDigest,
  configuredPreviewPort,
  createBoardSnapshotSessionBundle,
  isBoardSnapshotDomEvidence,
  type BoardImageArtifact,
  type BoardImageSource,
  type BoardSnapshotDomEvidence,
} from '../../../tools/ai-dm-board-snapshot';
import { installInteractiveDocument, interactiveElement } from '../../fixtures/interactive-dom';

const CONTROL_FIXTURES = Array.from(
  { length: 10 },
  (_unused, index) => `tests/fixtures/arena-basis-brutal/seed-${String(6_203_001 + index)}.json`,
);
const BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});

function sourceFor(state: EncounterState, room = 1): BoardImageSource {
  return {
    room,
    round: state.round,
    revision: state.revision,
    stateDigest: boardStateDigest(state),
  };
}

function movedState(state: EncounterState): EncounterState {
  const first = state.tokens[0];
  if (first === undefined) throw new Error('Fixture has no token to move.');
  return {
    ...state,
    tokens: state.tokens.map((token, index) => index === 0
      ? {
          ...token,
          position: {
            column: Math.min(token.position.column + 1, state.bounds.columns - 1),
            row: token.position.row,
          },
        }
      : token),
  };
}

describe('AI DM board snapshot contracts', () => {
  it('isolates its preview port from the Playwright worker pool', () => {
    expect(configuredPreviewPort({ PLAYWRIGHT_PORT: '4650' })).toBe(0);
    expect(configuredPreviewPort({
      PLAYWRIGHT_PORT: '4650',
      BOARD_SNAPSHOT_PREVIEW_PORT: '4750',
    })).toBe(4_750);
  });

  it('derives the CSS tile, marker height, and default from capture scale', () => {
    expect(boardSnapshotCaptureGeometry(64)).toEqual({
      tileSizeCssPx: 64,
      markerHeightCssPx: 640,
    });
    expect(boardSnapshotCaptureGeometry()).toEqual({
      tileSizeCssPx: 128,
      markerHeightCssPx: 1_280,
    });
  });

  it('defaults the information profile to byte-compatible advice and closes state-only roles', () => {
    expect(boardSnapshotInformationMode()).toBe('advice');
    expect(boardSnapshotInformationMode('advice')).toBe('advice');
    expect(boardSnapshotInformationMode('blind_state')).toBe('blind_state');
    expect(BOARD_SNAPSHOT_IMAGE_ROLES).toEqual([
      'dm_board', 'accessible_board_raster', 'player_board',
    ]);
  });

  it('accepts the complete terrain evidence shape and rejects legacy or incomplete shapes', () => {
    const evidence: BoardSnapshotDomEvidence = {
      optionSurfaceAbsent: true,
      nextEventPreviewAbsent: true,
      coordinateLabels: 0,
      creatureBadges: 0,
      rosterEntries: 0,
      hpBars: 0,
      legendEntries: 0,
      wallCells: 0,
      halfCoverCells: 0,
      threeQuartersCoverCells: 0,
      difficultCells: 0,
      obscuredCells: 0,
      illuminatedCells: 0,
      fogMarks: 0,
      doors: 0,
      objects: 0,
      hiddenMarks: 0,
      multiCellFootprints: 0,
    };
    expect(isBoardSnapshotDomEvidence(evidence)).toBe(true);

    const legacyShape: Record<string, unknown> = { ...evidence };
    Reflect.deleteProperty(legacyShape, 'wallCells');
    Reflect.deleteProperty(legacyShape, 'halfCoverCells');
    Reflect.deleteProperty(legacyShape, 'threeQuartersCoverCells');
    legacyShape['blockedCells'] = 0;
    expect(isBoardSnapshotDomEvidence(legacyShape)).toBe(false);

    const missingHalfCover: Record<string, unknown> = { ...evidence };
    Reflect.deleteProperty(missingHalfCover, 'halfCoverCells');
    expect(isBoardSnapshotDomEvidence(missingHalfCover)).toBe(false);
  });

  it.each([
    ['hard', 5_117_001, 'tests/fixtures/arena-basis-hard/seed-5117001.json'],
    ['brutal', 6_203_001, 'tests/fixtures/arena-basis-brutal/seed-6203001.json'],
  ] as const)('renders state-derived terrain evidence for %s seed %i', async (_difficulty, _seed, path) => {
    const restoreDocument = installInteractiveDocument();
    try {
      const state = await loadArenaFixture(path);
      const projection = projectEncounterBoard(projectDmView(state));
      const board = interactiveElement(renderBoard(
        projection,
        new Set(),
        null,
        { revision: state.revision, round: state.round, stateDigest: boardStateDigest(state) },
        'full',
        true,
        128,
      ));
      const projectedTerrain = projectEncounterTerrainCells(state.bounds, state);
      const expected = {
        wallCells: terrainWallCells(state).length,
        halfCoverCells: projectedTerrain.filter((cell) => cell.kind === 'half_cover').length,
        threeQuartersCoverCells: projectedTerrain.filter(
          (cell) => cell.kind === 'three_quarters_cover',
        ).length,
      };

      for (const key of Object.keys(BOARD_SNAPSHOT_TERRAIN_SELECTORS) as readonly (
        keyof typeof BOARD_SNAPSHOT_TERRAIN_SELECTORS
      )[]) {
        expect(
          board.querySelectorAll(BOARD_SNAPSHOT_TERRAIN_SELECTORS[key]),
          `${key} must match its independent state derivation`,
        ).toHaveLength(expected[key]);
      }
    } finally {
      restoreDocument();
    }
  });

  it('removes offered paths at the projection boundary without changing board state', async () => {
    const state = await loadArenaFixture(CONTROL_FIXTURES[0]!);
    const projection = projectDmBoard({
      view: projectDmView(state),
      coordinator: {
        requestSequence: 1,
        pendingRequest: null,
        pendingCommand: null,
        continuation: { kind: 'idle' },
        pause: { kind: 'interrupted' },
      },
      controllers: state.combatants.map((combatant) => ({
        combatantId: combatant.profile.id,
        controllerId: `test:${String(combatant.profile.id)}`,
        kind: 'human' as const,
        generation: 0,
      })),
      history: [],
      offerEnvironment: BOUND_OFFER_ENVIRONMENT,
    });
    const stateOnly = projectStateOnlyDmBoard(projection);

    expect(projection.offeredOptionPaths.length).toBeGreaterThan(0);
    expect(stateOnly.offeredOptionPaths).toEqual([]);
    expect(stateOnly.board).toBe(projection.board);
    expect(stateOnly.stateDigest).toBe(projection.stateDigest);
  });

  it.each(CONTROL_FIXTURES)('renders generated bounds and every mechanical terrain cell for %s', async (path) => {
    const state = await loadArenaFixture(path);
    const projection = projectEncounterBoard(projectDmView(state));
    const art = encounterArtForBoard(projection);
    const cells = encounterBoardRenderModel(projection, art);

    expect(art.room).toMatchObject(state.bounds);
    expect(art.id).toBe(`encounter-art:generated-${String(state.bounds.columns)}x${String(state.bounds.rows)}:v1`);
    expect(art.terrain).toEqual([]);
    expect(cells).toHaveLength(state.bounds.columns * state.bounds.rows);
    expect(cells.flatMap((cell) => cell.mechanicalLayers).filter(
      (layer) => layer.kind === 'terrain' && layer.terrainKind === 'wall',
    )).toHaveLength(projection.terrainCells.filter((cell) => cell.kind === 'wall').length);

    const expectedDifficult = new Set(state.environment.difficultTerrainRegions.flatMap(
      (region) => region.cells.map((cell) => `${region.id}:${String(cell.column)},${String(cell.row)}`),
    ));
    const actualDifficult = new Set(cells.flatMap((cell) => cell.mechanicalLayers.flatMap((layer) =>
      layer.kind === 'difficult_terrain' ? [`${layer.regionId}:${cell.key}`] : [])));
src/vtt/encounter-projections.ts:488:    stateDigest: sha256(canonicalJson(input.view.state)),

diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

codex
Implemented the browser-spec reconciliation in [vtt-encounter.spec.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/vtt-encounter.spec.ts:237).

Reference derivation:

- Fighter `(2,3)`: `normal_sight` only.
- Cleric `(1,4)`: `normal_sight` only.
- Wizard `(1,2)`: `normal_sight` only.
- Their visibility union covers every cell except dark target cell `(4,3)`.
- The blocker at `(7,2)` does not leave another cell unseen by all three.
- The Brute’s body supplies no light.
- DM fog and player owned-party concealment are therefore exactly `{(4,3)}`.

Re-pinned results:

- DM fog at `(4,3)`: `1`.
- DM Brute remains visible and marked hidden-from-players.
- Player floor remains rendered beneath the fog.
- Player fog at `(4,3)`: `1`.
- Player receives zero Brute tokens.
- Undo, adjudication, and control assertions remain unchanged.

Snapshot blocker:

- Expected service digest: `89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2`.
- Rendered `data-source-state-digest`: `34724654c3898715fb3984720852e54bf391df1fe5c86fa7759ca154a76d6352`.
- Audience `dm`, revision `0`, round `0`, and glyph mode `full` match.
- The second digest equals the hash of `projectDmView(state).state`, including 176 derived fog cells—columns `9..16` across all 22 rows.
- B2’s decoder discards the legacy fixture `foggedCells` key consistently. The divergence comes from B3 adding derived fog to the projected state at [visibility.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility.ts:524), while [boardStateDigest](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-board-snapshot.ts:201) still hashes the unprojected canonical state. The app writes the projected digest at [encounter-app.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/encounter-app.ts:2308).
- Proposed manifest addition: change `boardStateDigest()` to hash `projectDmView(state).state`, matching [encounter-projections.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/encounter-projections.ts:488). No production code was changed.

Other browser-spec inventory found no additional direct fog/concealment pins requiring changes. Reference, Vane, D365, and two-room specs otherwise test mounting, controls, transport, or owned-token positions. The manual `vtt-board.spec.ts` fog test uses a separate collaborative-canvas scene.

Verification:

- `PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test tests/browser/vtt-encounter.spec.ts --project=chromium`
  - `3 passed (1.0m)`
  - Target flow: `15.1s`
- Snapshot diagnostic:
  - `1 failed`, `1 did not run`, reproducing four 30-second `beforeAll` timeout reports.
  - The first instrumentation attempt stopped before tests because the temporary probe produced 2 TypeScript errors; the probe was corrected, used for diagnosis, and completely removed.
- `npx tsc -p tsconfig.app.json --noEmit`: exit `0`, `14.38s`.
- `npx tsc -p tsconfig.node.json --noEmit`: exit `0`, `27.63s`.
- `git diff --check`: exit `0`.
- `git status --short`: exactly `M tests/browser/vtt-encounter.spec.ts`.
- `tests/browser/ai-dm-board-snapshot.spec.ts` is untouched.

BLOCKED: tools/ai-dm-board-snapshot.ts:201 requires a production manifest ruling to align the service digest with the derived DM projection.
diff --git a/tests/browser/vtt-encounter.spec.ts b/tests/browser/vtt-encounter.spec.ts
index 12ff91b57e33b9ec95b2eb571566d46f4bdc2ecd..c468a43ac526ff1752302aa43695842bd3038600
--- a/tests/browser/vtt-encounter.spec.ts
+++ b/tests/browser/vtt-encounter.spec.ts
@@ -234,12 +234,19 @@
   await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
   await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
   await dm.getByRole('button', { name: 'Hide', exact: true }).click();
-  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(0);
+  // Fighter (2,3), Cleric (1,4), and Wizard (1,2) each have only normal sight.
+  // Their union sees every cell around the lone blocker at (7,2), except (4,3):
+  // ordinary darkness is target-cell-only, no PC has darkvision, and the Brute's
+  // body supplies no light. DM fog and the owned-party complement are therefore
+  // exactly {(4,3)}. The DM still renders the omniscient token; the player keeps
+  // the floor beneath the fog overlay but receives no Hidden monster geometry.
+  await expect(dm.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(dm.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]')).toBeVisible();
   await expect(dm.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveAttribute('data-hidden-from-players', 'true');
   await expect(page.locator('[data-cell="4,3"] .encounter-art-floor')).toBeVisible();
+  await expect(page.locator('[data-cell="4,3"] .encounter-art-fog')).toHaveCount(1);
   await expect(page.locator(
     '.encounter-token[data-kind="monster"][data-column="4"][data-row="3"]',
   )).toHaveCount(0);

tokens used
249,115
Implemented the browser-spec reconciliation in [vtt-encounter.spec.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/vtt-encounter.spec.ts:237).

Reference derivation:

- Fighter `(2,3)`: `normal_sight` only.
- Cleric `(1,4)`: `normal_sight` only.
- Wizard `(1,2)`: `normal_sight` only.
- Their visibility union covers every cell except dark target cell `(4,3)`.
- The blocker at `(7,2)` does not leave another cell unseen by all three.
- The Brute’s body supplies no light.
- DM fog and player owned-party concealment are therefore exactly `{(4,3)}`.

Re-pinned results:

- DM fog at `(4,3)`: `1`.
- DM Brute remains visible and marked hidden-from-players.
- Player floor remains rendered beneath the fog.
- Player fog at `(4,3)`: `1`.
- Player receives zero Brute tokens.
- Undo, adjudication, and control assertions remain unchanged.

Snapshot blocker:

- Expected service digest: `89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2`.
- Rendered `data-source-state-digest`: `34724654c3898715fb3984720852e54bf391df1fe5c86fa7759ca154a76d6352`.
- Audience `dm`, revision `0`, round `0`, and glyph mode `full` match.
- The second digest equals the hash of `projectDmView(state).state`, including 176 derived fog cells—columns `9..16` across all 22 rows.
- B2’s decoder discards the legacy fixture `foggedCells` key consistently. The divergence comes from B3 adding derived fog to the projected state at [visibility.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility.ts:524), while [boardStateDigest](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-board-snapshot.ts:201) still hashes the unprojected canonical state. The app writes the projected digest at [encounter-app.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/encounter-app.ts:2308).
- Proposed manifest addition: change `boardStateDigest()` to hash `projectDmView(state).state`, matching [encounter-projections.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/encounter-projections.ts:488). No production code was changed.

Other browser-spec inventory found no additional direct fog/concealment pins requiring changes. Reference, Vane, D365, and two-room specs otherwise test mounting, controls, transport, or owned-token positions. The manual `vtt-board.spec.ts` fog test uses a separate collaborative-canvas scene.

Verification:

- `PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test tests/browser/vtt-encounter.spec.ts --project=chromium`
  - `3 passed (1.0m)`
  - Target flow: `15.1s`
- Snapshot diagnostic:
  - `1 failed`, `1 did not run`, reproducing four 30-second `beforeAll` timeout reports.
  - The first instrumentation attempt stopped before tests because the temporary probe produced 2 TypeScript errors; the probe was corrected, used for diagnosis, and completely removed.
- `npx tsc -p tsconfig.app.json --noEmit`: exit `0`, `14.38s`.
- `npx tsc -p tsconfig.node.json --noEmit`: exit `0`, `27.63s`.
- `git diff --check`: exit `0`.
- `git status --short`: exactly `M tests/browser/vtt-encounter.spec.ts`.
- `tests/browser/ai-dm-board-snapshot.spec.ts` is untouched.

BLOCKED: tools/ai-dm-board-snapshot.ts:201 requires a production manifest ruling to align the service digest with the derived DM projection.
