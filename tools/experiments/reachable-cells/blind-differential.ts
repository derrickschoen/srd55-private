/**
 * PERF-02 x1r exhaustive differential: experiment evidence, NOT a gate test.
 *
 * For every blind fixture (33), every required actor and every grid cell, blind
 * legal movement from one `queries.reachable` search per actor must equal the
 * independent oracle: one FROZEN-reference bounded `findPath` per cell
 * (tests/helpers/reference-legal-movement.ts). Destinations, costs, route cells
 * and their row-major order are all compared, for the resolved movement and for
 * the visible `legal_movement` block. It costs minutes of uncached per-cell
 * search, which is why it stays out of the gate; its counts go into the records.
 *
 *   node node_modules/vite-node/vite-node.mjs tools/experiments/reachable-cells/blind-differential.ts
 *
 * Four named checks per fixture, and each one can fail the run:
 * - resolved-deep / visible-deep: structural equality (isDeepStrictEqual), which
 *   ignores the order of an object's keys;
 * - resolved-bytes / visible-bytes: JSON bytes, which do not. The visible block is
 *   printed into the model's context, so its key order is part of the answer.
 * Every failed check prints `MISMATCH <check> <family> <seed>`. The final
 * BLIND-DIFFERENTIAL line carries one count per check; the exit code is 0 only
 * when all four counts are 0 and all 33 fixtures ran.
 */
import { isDeepStrictEqual } from 'node:util';
import { projectEngineBlindTurn } from '../../../src/vtt/blind-turn-context';
import { createEngineMcpRuntime, projectFutureMonsterTurns } from '../../../src/vtt/mcp/entrypoint';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { referenceLegalMovement } from '../../../tests/helpers/reference-legal-movement';
import { blindFixtureCases } from '../../blind-context-fixture-report';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const EXPECTED_FIXTURES = 33;

const CHECKS = ['resolved-deep', 'visible-deep', 'resolved-bytes', 'visible-bytes'] as const;
type Check = (typeof CHECKS)[number];

const mismatches: Record<Check, number> = {
  'resolved-deep': 0,
  'visible-deep': 0,
  'resolved-bytes': 0,
  'visible-bytes': 0,
};
const totals = {
  fixtures: 0,
  actors: 0,
  cellsCompared: 0,
  destinations: 0,
  routeCells: 0,
  singleSearchMs: 0,
  referenceMs: 0,
};

for (const fixture of blindFixtureCases()) {
  const state = await fixture.state();
  const runtime = createEngineMcpRuntime(state, {
    dmMode: 'blind',
    toolProfile: 'blind',
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  const capsule = runtime.feed.current();
  const request = capsule.request;
  if (request === null || request.phase === 'speculative') {
    throw new Error(`${fixture.family} ${String(fixture.seed)}: expected an ordinary request.`);
  }
  const planningState = projectFutureMonsterTurns(state, request.actors);
  const began = performance.now();
  const projection = projectEngineBlindTurn(planningState, capsule, OFFER_ENVIRONMENT.queries);
  const projected = performance.now();
  const oracle = referenceLegalMovement(planningState, capsule);
  const referenced = performance.now();

  const visibleActual = projection.legalMovement.actors.map((actor) => actor.cells);
  const visibleOracle = oracle.map((actor) => actor.cells.map((cell) => ({ label: cell.label, cost_feet: cell.costFeet })));
  const same: Record<Check, boolean> = {
    'resolved-deep': isDeepStrictEqual(projection.resolvedMovement, oracle),
    'visible-deep': isDeepStrictEqual(visibleActual, visibleOracle),
    'resolved-bytes': JSON.stringify(projection.resolvedMovement) === JSON.stringify(oracle),
    'visible-bytes': JSON.stringify(visibleActual) === JSON.stringify(visibleOracle),
  };
  const name = `${fixture.family} ${String(fixture.seed)}`;
  for (const check of CHECKS) {
    if (same[check]) continue;
    mismatches[check] += 1;
    console.log(`MISMATCH ${check} ${name}`);
  }
  const destinations = oracle.reduce((sum, actor) => sum + actor.cells.length, 0);
  const routeCells = oracle.reduce((sum, actor) => sum + actor.cells.reduce((inner, cell) => inner + cell.path.length, 0), 0);
  const cells = planningState.bounds.columns * planningState.bounds.rows;

  totals.fixtures += 1;
  totals.actors += oracle.length;
  totals.cellsCompared += cells * oracle.length;
  totals.destinations += destinations;
  totals.routeCells += routeCells;
  totals.singleSearchMs += projected - began;
  totals.referenceMs += referenced - projected;
  console.log([
    name,
    `grid=${String(planningState.bounds.columns)}x${String(planningState.bounds.rows)}`,
    `actors=${String(oracle.length)}`,
    `destinations=${String(destinations)}`,
    `routeCells=${String(routeCells)}`,
    ...CHECKS.map((check) => `${check}=${same[check] ? 'SAME' : 'DIFF'}`),
    `projectMs=${(projected - began).toFixed(1)}`,
    `referenceMs=${(referenced - projected).toFixed(1)}`,
  ].join(' '));
}

const failed = CHECKS.some((check) => mismatches[check] !== 0) || totals.fixtures !== EXPECTED_FIXTURES;
console.log([
  'BLIND-DIFFERENTIAL',
  ...Object.entries(totals).map(([name, value]) => `${name}=${Number.isInteger(value) ? String(value) : value.toFixed(1)}`),
  ...CHECKS.map((check) => `mismatches.${check}=${String(mismatches[check])}`),
  `verdict=${failed ? 'FAIL' : 'PASS'}`,
].join(' '));
process.exitCode = failed ? 1 : 0;
