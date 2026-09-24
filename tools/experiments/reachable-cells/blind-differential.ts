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
 * Prints one line per fixture and a final BLIND-DIFFERENTIAL line; exits 1 on any mismatch.
 */
import { isDeepStrictEqual } from 'node:util';
import { projectEngineBlindTurn } from '../../../src/vtt/blind-turn-context';
import { createEngineMcpRuntime, projectFutureMonsterTurns } from '../../../src/vtt/mcp/entrypoint';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { referenceLegalMovement } from '../../../tests/helpers/reference-legal-movement';
import { blindFixtureCases } from '../../blind-context-fixture-report';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const totals = {
  fixtures: 0,
  actors: 0,
  cellsCompared: 0,
  destinations: 0,
  routeCells: 0,
  mismatches: 0,
  jsonIdentical: 0,
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

  const visibleOracle = oracle.map((actor) => actor.cells.map((cell) => ({ label: cell.label, cost_feet: cell.costFeet })));
  const resolvedSame = isDeepStrictEqual(projection.resolvedMovement, oracle);
  const visibleSame = isDeepStrictEqual(projection.legalMovement.actors.map((actor) => actor.cells), visibleOracle);
  const jsonSame = JSON.stringify(projection.resolvedMovement) === JSON.stringify(oracle);
  const destinations = oracle.reduce((sum, actor) => sum + actor.cells.length, 0);
  const routeCells = oracle.reduce((sum, actor) => sum + actor.cells.reduce((inner, cell) => inner + cell.path.length, 0), 0);
  const cells = planningState.bounds.columns * planningState.bounds.rows;

  totals.fixtures += 1;
  totals.actors += oracle.length;
  totals.cellsCompared += cells * oracle.length;
  totals.destinations += destinations;
  totals.routeCells += routeCells;
  totals.mismatches += (resolvedSame ? 0 : 1) + (visibleSame ? 0 : 1);
  totals.jsonIdentical += jsonSame ? 1 : 0;
  totals.singleSearchMs += projected - began;
  totals.referenceMs += referenced - projected;
  console.log([
    `${fixture.family} ${String(fixture.seed)}`,
    `grid=${String(planningState.bounds.columns)}x${String(planningState.bounds.rows)}`,
    `actors=${String(oracle.length)}`,
    `destinations=${String(destinations)}`,
    `routeCells=${String(routeCells)}`,
    `resolved=${resolvedSame ? 'SAME' : 'DIFF'}`,
    `visible=${visibleSame ? 'SAME' : 'DIFF'}`,
    `json=${jsonSame ? 'SAME' : 'DIFF'}`,
    `projectMs=${(projected - began).toFixed(1)}`,
    `referenceMs=${(referenced - projected).toFixed(1)}`,
  ].join(' '));
}

console.log([
  'BLIND-DIFFERENTIAL',
  ...Object.entries(totals).map(([name, value]) => `${name}=${Number.isInteger(value) ? String(value) : value.toFixed(1)}`),
].join(' '));
process.exitCode = totals.mismatches === 0 && totals.fixtures === 33 ? 0 : 1;
