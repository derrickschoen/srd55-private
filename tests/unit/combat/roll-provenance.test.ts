import { describe, expect, it } from 'vitest';
import { mulberry32, transactionalRng } from '../../../src/combat/random';
import {
  componentTotals,
  convolveIndependentDistributions,
  emptyRollPrefix,
  exactFraction,
  exactWeight,
  explorationSeed,
  exploreRolls,
  prefixFromTrace,
  replayPrefix,
  RollProvenance,
  RollProvenanceError,
  rollComponentId,
  rollOccurrenceId,
  rollOperationPath,
  rollPrefix,
  type RollComponentSpec,
  type RollProvenanceRequest,
  type TransactionalRollRng,
} from '../../../src/combat/roll-provenance';
import { dieSides } from '../../../src/combat/values';

function request(path: string): RollProvenanceRequest {
  return {
    occurrenceId: rollOccurrenceId('test:occurrence'),
    operationPath: rollOperationPath(path),
    source: null,
    targets: [],
  };
}

function dice(count: number, sides: number, modifier = 0): RollComponentSpec {
  return {
    kind: 'dice_expression',
    expression: { count, sides: dieSides(sides), modifier },
  };
}

function drawOne(
  rolls: TransactionalRollRng,
  sides: number,
  path = 'draw',
): number {
  const component = rolls.beginComponent(request(path), {
    kind: 'discrete_branch',
    outcomes: Array.from({ length: sides }, (_, index) => ({
      total: index + 1, weight: exactWeight(1n, BigInt(sides)),
    })),
  });
  const face = rolls.draw({ sides: dieSides(sides), provenance: component, role: { kind: 'branch_selection' } });
  rolls.finishComponent(component, face);
  return face;
}

function weights(spec: RollComponentSpec): Readonly<Record<number, string>> {
  return Object.fromEntries(componentTotals(rollComponentId('test:component'), spec).outcomes.map((outcome) => [
    outcome.total,
    `${String(outcome.weight.numerator)}/${String(outcome.weight.denominator)}`,
  ]));
}

function expectCode(action: () => unknown, code: string): void {
  try {
    action();
  } catch (error) {
    expect(error).toMatchObject({ code });
    return;
  }
  throw new Error(`Expected roll provenance error ${code}.`);
}

describe('independent roll provenance', () => {
  it('component identity includes occurrence as well as operation path', () => {
    const rolls = RollProvenance.recording(transactionalRng(() => 0)).asRng();
    const left = rolls.beginComponent(request('shared-path'), dice(1, 4));
    const right = rolls.beginComponent({
      ...request('shared-path'), occurrenceId: rollOccurrenceId('test:other-occurrence'),
    }, dice(1, 4));
    expect(left.componentId).not.toBe(right.componentId);
  });

  it('recording forwards serializable checkpoints and restores committed component state', () => {
    const owner = RollProvenance.recording(transactionalRng(mulberry32(7)));
    const rolls = owner.asRng();
    const checkpoint = rolls.checkpoint();
    drawOne(rolls, 6);
    expect(owner.trace().committedComponents).toHaveLength(1);
    rolls.restoreCheckpoint(checkpoint);
    expect(owner.trace().attempts).toHaveLength(1);
    expect(owner.trace().committedDraws).toHaveLength(0);
    expect(owner.trace().committedComponents).toHaveLength(0);
  });

  it('recording forwards history checkpoints and reuses the same latent slot', () => {
    const owner = RollProvenance.recording(transactionalRng(() => 0.1));
    const rolls = owner.asRng();
    const checkpoint = rolls.checkpoint();
    expect(drawOne(rolls, 6, 'd6')).toBe(1);
    rolls.restoreCheckpoint(checkpoint);
    expect(drawOne(rolls, 8, 'd8')).toBe(1);
    expect(owner.trace().attempts.map((entry) => entry.streamSlot)).toEqual([0, 0]);
  });

  it('trace separates attempted draws, committed draws, completed components, and nested rollbacks', () => {
    const owner = RollProvenance.recording(transactionalRng(() => 0.25));
    const rolls = owner.asRng();
    const outer = rolls.checkpoint();
    drawOne(rolls, 4, 'first');
    const inner = rolls.checkpoint();
    drawOne(rolls, 4, 'second');
    rolls.restoreCheckpoint(inner);
    rolls.restoreCheckpoint(outer);
    const trace = owner.trace();
    expect(trace.attempts).toHaveLength(2);
    expect(trace.committedDraws).toHaveLength(0);
    expect(trace.committedComponents).toHaveLength(0);
    expect(trace.rollbacks).toHaveLength(2);
  });

  it('checkpoint between component draws restores the open handle; post-checkpoint handles go stale and repeated finish fails', () => {
    const owner = RollProvenance.recording(transactionalRng(() => 0.2));
    const rolls = owner.asRng();
    const component = rolls.beginComponent(request('open'), dice(2, 6));
    rolls.draw({ sides: dieSides(6), provenance: component, role: { kind: 'ordinary_face', dieIndex: 0 } });
    const checkpoint = rolls.checkpoint();
    const later = rolls.beginComponent(request('later'), dice(1, 6));
    rolls.restoreCheckpoint(checkpoint);
    expectCode(() => rolls.draw({
      sides: dieSides(6), provenance: later, role: { kind: 'ordinary_face', dieIndex: 0 },
    }), 'stale_component');
    const second = rolls.draw({
      sides: dieSides(6), provenance: component, role: { kind: 'ordinary_face', dieIndex: 1 },
    });
    rolls.finishComponent(component, second);
    expectCode(() => rolls.finishComponent(component, second), 'component_already_finished');
  });

  it('foreign checkpoints fail while repeated owner restore reproduces cursor and records each rollback', () => {
    const left = RollProvenance.recording(transactionalRng(() => 0.4)).asRng();
    const rightOwner = RollProvenance.recording(transactionalRng(() => 0.6));
    const right = rightOwner.asRng();
    const checkpoint = left.checkpoint();
    expectCode(() => right.restoreCheckpoint(checkpoint), 'foreign_checkpoint');
    left.restoreCheckpoint(checkpoint);
    left.restoreCheckpoint(checkpoint);
    expect(left.trace().rollbacks).toHaveLength(2);
  });

  it('prefix replay refuses interval-only, noncanonical tightened d6-face-1 [0,1/12), and request-mismatched prefixes', () => {
    expectCode(() => rollPrefix({
      expectedAttempts: [],
      slotIntervals: [{ streamSlot: 0 as never, lowerInclusive: exactWeight(0n, 1n), upperExclusive: exactWeight(1n, 2n) }],
    }), 'malformed_prefix');
    const first = replayPrefix(emptyRollPrefix(), (rolls) => drawOne(rolls, 6));
    if (first.kind !== 'fork') throw new Error('Expected initial fork.');
    const canonical = first.branches[0]?.prefix;
    if (canonical === undefined) throw new Error('Expected d6 face branch.');
    expectCode(() => rollPrefix({
      expectedAttempts: canonical.expectedAttempts,
      slotIntervals: [{
        streamSlot: canonical.slotIntervals[0]?.streamSlot ?? (0 as never),
        lowerInclusive: exactWeight(0n, 1n), upperExclusive: exactWeight(1n, 12n),
      }],
    }), 'malformed_prefix');
    expectCode(() => replayPrefix(canonical, (rolls) => drawOne(rolls, 8)), 'prefix_request_mismatch');
  });

  it('exhausted valid prefix forks while an unconsumed expected attempt at run completion fails', () => {
    const initial = replayPrefix(emptyRollPrefix(), (rolls) => drawOne(rolls, 4));
    expect(initial.kind).toBe('fork');
    if (initial.kind !== 'fork') return;
    const selected = initial.branches[0];
    if (selected === undefined) throw new Error('Expected branch.');
    expect(replayPrefix(selected.prefix, (rolls) => {
      drawOne(rolls, 4);
      return drawOne(rolls, 4, 'next');
    }).kind).toBe('fork');
    expectCode(() => replayPrefix(selected.prefix, () => 'done'), 'prefix_not_consumed');
  });

  it('first unresolved d4 draw forks into four isolated siblings with conditional weights 1/4', () => {
    const step = replayPrefix(emptyRollPrefix(), (rolls) => drawOne(rolls, 4));
    if (step.kind !== 'fork') throw new Error('Expected fork.');
    expect(step.branches.map((branch) => [branch.face, branch.conditionalWeight])).toEqual(
      [1, 2, 3, 4].map((face) => [face, exactWeight(1n, 4n)]),
    );
    expect(new Set(step.branches.map((branch) => branch.prefix))).toHaveLength(4);
  });

  it('rolled-back d6 face 1 reused as d8 forks to faces 1 and 2 with conditional weights 3/4 and 1/4', () => {
    const run = (rolls: TransactionalRollRng): number => {
      const checkpoint = rolls.checkpoint();
      drawOne(rolls, 6, 'd6');
      rolls.restoreCheckpoint(checkpoint);
      return drawOne(rolls, 8, 'd8');
    };
    const first = replayPrefix(emptyRollPrefix(), run);
    if (first.kind !== 'fork') throw new Error('Expected d6 fork.');
    const faceOne = first.branches.find((branch) => branch.face === 1);
    if (faceOne === undefined) throw new Error('Expected d6 face 1.');
    const reused = replayPrefix(faceOne.prefix, run);
    if (reused.kind !== 'fork') throw new Error('Expected reused-slot d8 fork.');
    expect(reused.branches.map((branch) => [branch.face, branch.conditionalWeight])).toEqual([
      [1, exactWeight(3n, 4n)], [2, exactWeight(1n, 4n)],
    ]);
  });

  it('a reused interval wholly inside one new face advances without a fork', () => {
    const run = (rolls: TransactionalRollRng): number => {
      const checkpoint = rolls.checkpoint();
      drawOne(rolls, 6, 'd6');
      rolls.restoreCheckpoint(checkpoint);
      return drawOne(rolls, 4, 'd4');
    };
    const first = replayPrefix(emptyRollPrefix(), run);
    if (first.kind !== 'fork') throw new Error('Expected d6 fork.');
    const faceSix = first.branches.find((branch) => branch.face === 6);
    if (faceSix === undefined) throw new Error('Expected d6 face 6.');
    expect(replayPrefix(faceSix.prefix, run)).toMatchObject({ kind: 'complete', value: 4 });
  });

  it('anonymous callable draws fail in recording and replay', () => {
    expectCode(() => RollProvenance.recording(transactionalRng(() => 0)).asRng()(), 'anonymous_draw');
    expectCode(() => replayPrefix(emptyRollPrefix(), (rolls) => rolls()), 'anonymous_draw');
  });

  it('exploration budgets expose unresolved mass and never renormalize completed leaves', () => {
    const result = exploreRolls((rolls) => drawOne(rolls, 4), { maximumNodes: 2, maximumDepth: 8 });
    expect(result.kind).toBe('incomplete');
    if (result.kind !== 'incomplete') return;
    expect(result.resolvedWeight).toEqual(exactWeight(1n, 4n));
    expect(result.unresolvedWeight).toEqual(exactWeight(3n, 4n));
  });

  it('resuming a pending nonempty-prefix seed of incoming mass 1/4 equals uninterrupted exploration', () => {
    const partial = exploreRolls((rolls) => drawOne(rolls, 4), { maximumNodes: 1, maximumDepth: 8 });
    if (partial.kind !== 'incomplete') throw new Error('Expected pending branches.');
    const pending = partial.pending[0];
    if (pending === undefined) throw new Error('Expected pending seed.');
    const resumed = exploreRolls(
      (rolls) => drawOne(rolls, 4),
      { maximumNodes: 2, maximumDepth: 8 },
      explorationSeed(pending.prefix, exactWeight(1n, 4n), pending.depth),
    );
    expect(resumed).toMatchObject({ kind: 'complete', inputWeight: exactWeight(1n, 4n), resolvedWeight: exactWeight(1n, 4n) });
  });

  it('handwritten 2d4 totals 2..8 have weights 1,2,3,4,3,2,1 over 16 and modifiers/bounds group afterward', () => {
    expect(weights(dice(2, 4))).toEqual({
      2: '1/16', 3: '1/8', 4: '3/16', 5: '1/4', 6: '3/16', 7: '1/8', 8: '1/16',
    });
    expect(weights({
      kind: 'dice_expression', expression: { count: 1, sides: dieSides(4), modifier: -2, minimumTotal: 0 },
    })).toEqual({ 0: '1/2', 1: '1/4', 2: '1/4' });
  });

  it('reroll d4 below 2 has face weights 1,5,5,5 over 16 and maximum-face explosion has exact grouped totals', () => {
    expect(weights({
      kind: 'dice_expression',
      expression: { count: 1, sides: dieSides(4), modifier: 0, rerollBelow: { threshold: 2, maximumRerollsPerDie: 1 } },
    })).toEqual({ 1: '1/16', 2: '5/16', 3: '5/16', 4: '5/16' });
    expect(weights({
      kind: 'dice_expression',
      expression: { count: 1, sides: dieSides(4), modifier: 0, explosion: { triggerFace: 'maximum', maximumExplosionsPerDie: 1 } },
    })).toEqual({ 1: '1/4', 2: '1/4', 3: '1/4', 5: '1/16', 6: '1/16', 7: '1/16', 8: '1/16' });
  });

  it('combined reroll-below-2 plus maximum explosion has weights {1:4,2:20,3:20,5:5,6:5,7:5,8:5}/64', () => {
    expect(weights({
      kind: 'dice_expression',
      expression: {
        count: 1, sides: dieSides(4), modifier: 0,
        rerollBelow: { threshold: 2, maximumRerollsPerDie: 1 },
        explosion: { triggerFace: 'maximum', maximumExplosionsPerDie: 1 },
      },
    })).toEqual({ 1: '1/16', 2: '5/16', 3: '5/16', 5: '5/64', 6: '5/64', 7: '5/64', 8: '5/64' });
  });

  it('D20 advantage and disadvantage use ordered-pair weights (2f-1)/400 and (41-2f)/400', () => {
    const advantage = componentTotals(rollComponentId('advantage'), { kind: 'd20_selection', mode: 'advantage' });
    const disadvantage = componentTotals(rollComponentId('disadvantage'), { kind: 'd20_selection', mode: 'disadvantage' });
    for (let face = 1; face <= 20; face += 1) {
      expect(advantage.outcomes[face - 1]?.weight).toEqual(exactWeight(BigInt(2 * face - 1), 400n));
      expect(disadvantage.outcomes[face - 1]?.weight).toEqual(exactWeight(BigInt(41 - 2 * face), 400n));
    }
  });

  it('separate component IDs convolve and a repeated shared component ID is refused', () => {
    const left = componentTotals(rollComponentId('left'), dice(1, 4));
    const right = componentTotals(rollComponentId('right'), dice(1, 4));
    expect(convolveIndependentDistributions(left, right).outcomes).toHaveLength(7);
    const repeated = componentTotals(rollComponentId('left'), dice(1, 4));
    expect(() => convolveIndependentDistributions(left, repeated)).toThrow(RollProvenanceError);
  });

  it('prefixFromTrace preserves canonical attempted interval evidence', () => {
    const owner = RollProvenance.recording(transactionalRng(() => 0));
    drawOne(owner.asRng(), 6);
    expect(prefixFromTrace(owner.trace()).slotIntervals).toEqual([
      { streamSlot: 0, lowerInclusive: exactFraction(0n, 1n), upperExclusive: exactFraction(1n, 6n) },
    ]);
  });
});
