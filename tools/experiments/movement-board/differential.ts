/**
 * PERF-02 board3 exhaustive differential: the movement board vs the frozen string-keyed world
 * (tests/helpers/reference-movement-world.ts). Experiment evidence, NOT a gate test.
 *
 *   node node_modules/vite-node/vite-node.mjs tools/experiments/movement-board/differential.ts [ONLY-regex]
 *
 * For every corpus state (corpus.ts: every fixture encounter, generated rooms, and synthetic
 * variants of each), every placed creature plus one unknown actor, every in-bounds cell `from`
 * and every in-bounds `to` among 13 offsets (the eight steps, standing still, and three longer
 * jumps a direct caller may ask), the two worlds must give the same outcome for occupiedCells,
 * canTraverseStep and traversal: the same JSON bytes, or the same error class and message.
 * World construction is compared too, and one findReachableCells search per creature at the
 * whole-grid budget. Every third state is swept twice with fresh worlds, board first and
 * frozen first, because both worlds remember answers and the order of first questions differs.
 *
 * The frozen world was also asked about anchors that are no longer constructible (negative,
 * fractional, off the grid); the board cannot be asked, and tests/unit/combat/movement-board.test.ts
 * holds the compile-time proof. This script records how the frozen world answered them.
 *
 * Exit 0 only with zero mismatches and every fixture file accounted for.
 */
import { createHash } from 'node:crypto';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import type { EncounterState } from '../../../src/combat/encounter';
import { boardCell, type BoardCell } from '../../../src/combat/grid';
import { findReachableCells, type MovementWorld } from '../../../src/combat/movement';
import { feet, type CombatantId } from '../../../src/combat/values';
import { encounterMovementWorld as frozenMovementWorld } from '../../../tests/helpers/reference-movement-world';
import { corpus, type CorpusAccount } from './corpus';

type World = MovementWorld<CombatantId>;
const OFFSETS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [2, 0], [0, 2], [-2, 2], [3, -1]] as const;
const UNKNOWN_ACTOR = 'combatant:board3-unknown' as CombatantId;

function outcome(run: () => unknown): string {
  try {
    return `ok:${JSON.stringify(run())}`;
  } catch (error) {
    return `throw:${error instanceof Error ? error.constructor.name : typeof error}:${error instanceof Error ? error.message : String(error)}`;
  }
}

const only = process.argv[2] === undefined ? null : new RegExp(process.argv[2]);
const account: CorpusAccount = { decoded: [], skippedSidecars: [], skippedNotEncounters: [] };
const started = performance.now();
const states = await corpus(account);
const legacyDigest = createHash('sha256');
const counts = {
  states: 0, statesBuilt: 0, statesBothThrewAtBuild: 0, comparisons: 0, mismatches: 0,
  occupiedCells: 0, canTraverseStep: 0, traversal: 0, reachable: 0, throws: 0,
};
const kinds = new Map<string, number>();
const outOfDomain = new Map<string, number>();

for (const [index, entry] of states.entries()) {
  if (only !== null && !only.test(entry.name)) continue;
  counts.states += 1;
  // A fresh object per world keeps each world's per-state cache from answering for the other pass.
  const fresh = (): EncounterState => ({ ...entry.state });
  const boardBuild = outcome(() => { encounterMovementWorld(fresh()); return null; });
  const frozenBuild = outcome(() => { frozenMovementWorld(fresh()); return null; });
  counts.comparisons += 1;
  if (boardBuild !== frozenBuild) {
    counts.mismatches += 1;
    console.log(`MISMATCH build ${entry.name}: board=${boardBuild} frozen=${frozenBuild}`);
    continue;
  }
  if (frozenBuild !== 'ok:null') {
    counts.statesBothThrewAtBuild += 1;
    console.log(`both throw at build ${entry.name}: ${frozenBuild.slice(0, 160)}`);
    continue;
  }
  counts.statesBuilt += 1;
  const { bounds } = entry.state;
  const actors = [...entry.state.tokens.map((token) => token.combatantId), UNKNOWN_ACTOR];
  for (const order of index % 3 === 0 ? ['board-first', 'frozen-first'] as const : ['board-first'] as const) {
    const board: World = encounterMovementWorld(fresh());
    const frozen = frozenMovementWorld(fresh());
    const compare = (method: 'occupiedCells' | 'canTraverseStep' | 'traversal' | 'reachable', label: () => string,
      onBoard: () => unknown, onFrozen: () => unknown): void => {
      let boardOutcome: string;
      let frozenOutcome: string;
      if (order === 'board-first') {
        boardOutcome = outcome(onBoard);
        frozenOutcome = outcome(onFrozen);
        legacyDigest.update(frozenOutcome);
      } else {
        frozenOutcome = outcome(onFrozen);
        boardOutcome = outcome(onBoard);
      }
      counts.comparisons += 1;
      counts[method] += 1;
      if (frozenOutcome.startsWith('throw')) counts.throws += 1;
      const kind = `${method} ${frozenOutcome.startsWith('throw') ? frozenOutcome.slice(0, 90) : frozenOutcome.length > 60 ? frozenOutcome.slice(0, 20) : frozenOutcome}`;
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
      if (boardOutcome !== frozenOutcome) {
        counts.mismatches += 1;
        if (counts.mismatches <= 25) console.log(`MISMATCH ${entry.name} ${order} ${label()}: board=${boardOutcome.slice(0, 200)} frozen=${frozenOutcome.slice(0, 200)}`);
      }
    };
    for (const actor of actors) {
      for (let row = 0; row < bounds.rows; row += 1) {
        for (let column = 0; column < bounds.columns; column += 1) {
          const from = boardCell(bounds, { column, row });
          if (from === null) continue;
          compare('occupiedCells', () => `occupiedCells(${actor},${String(column)},${String(row)})`,
            () => board.occupiedCells(actor, from), () => frozen.occupiedCells(actor, from));
          for (const [columnOffset, rowOffset] of OFFSETS) {
            const to: BoardCell | null = boardCell(bounds, { column: column + columnOffset, row: row + rowOffset });
            if (to === null) continue;
            const edge = () => `${actor} ${String(column)},${String(row)}->${String(to.column)},${String(to.row)}`;
            compare('canTraverseStep', () => `canTraverseStep ${edge()}`,
              () => board.canTraverseStep(actor, from, to), () => frozen.canTraverseStep(actor, from, to));
            compare('traversal', () => `traversal ${edge()}`,
              () => board.traversal(actor, from, to), () => frozen.traversal(actor, from, to));
          }
        }
      }
      const start = entry.state.tokens.find((token) => token.combatantId === actor)?.position;
      if (start !== undefined) {
        const maximumCost = feet(bounds.columns * bounds.rows * 10);
        compare('reachable', () => `findReachableCells ${actor}`,
          () => findReachableCells(board, { actorId: actor, start, maximumCost }),
          () => findReachableCells(frozen, { actorId: actor, start, maximumCost }));
      }
    }
    // How the frozen world answered anchors the board can no longer be asked about.
    if (order === 'board-first') {
      const token = entry.state.tokens[0];
      if (token !== undefined) {
        for (const probe of [{ column: -1, row: 0 }, { column: 0.5, row: 0 }, { column: bounds.columns, row: 0 }]) {
          const answer = outcome(() => frozen.traversal(token.combatantId, token.position, probe));
          const key = `traversal to ${JSON.stringify(probe).replace(String(bounds.columns), 'columns')}: ${answer.slice(0, 110)}`;
          outOfDomain.set(key, (outOfDomain.get(key) ?? 0) + 1);
        }
      }
    }
  }
}

// corpus.ts throws on any file it cannot name, so every file of the fixture directories is here.
const accounted = account.decoded.length + account.skippedSidecars.length + account.skippedNotEncounters.length;
console.log(`corpus: decoded ${String(account.decoded.length)} fixture encounters, skipped ${String(account.skippedSidecars.length)} challenge sidecars ` +
  `(${account.skippedSidecars.join(', ')}) and ${String(account.skippedNotEncounters.length)} non-encounters (${account.skippedNotEncounters.join(', ')})`);
console.log('outcome kinds (frozen):', JSON.stringify([...kinds].sort((left, right) => right[1] - left[1]).slice(0, 24)));
console.log('frozen answers to anchors that no longer compile:', JSON.stringify([...outOfDomain]));
const failed = counts.mismatches !== 0 || counts.statesBuilt === 0;
console.log(`BOARD-DIFFERENTIAL ${Object.entries(counts).map(([name, value]) => `${name}=${String(value)}`).join(' ')} ` +
  `filesAccounted=${String(accounted)} frozenDigest=${legacyDigest.digest('hex').slice(0, 16)} ` +
  `wall=${((performance.now() - started) / 1000).toFixed(1)}s verdict=${failed ? 'FAIL' : 'PASS'}`);
process.exitCode = failed ? 1 : 0;
