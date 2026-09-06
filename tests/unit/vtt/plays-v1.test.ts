import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  combatantId,
  encounterBranchId,
  encounterSessionId,
  type CombatantId,
} from '../../../src/combat/values';
import {
  createEngineStateCapsule,
  type EngineDmProjection,
  type EngineProjectionCombatant,
  type EngineStateCapsule,
} from '../../../src/vtt/engine-state-capsule';
import {
  PLAY_NAMES,
  SNIPPET_REGISTRY,
  type PlayName,
} from '../../../src/vtt/snippet-registry-runtime';
import { createSnippetRegistry } from '../../../src/vtt/snippets/registry';
import {
  engineActionId,
  engineOptionId,
  type EngineOfferableOption,
  type EngineTurnProposal,
} from '../../../src/vtt/turn-proposal';

const BRUTE = combatantId('combatant:brute');
const ARCHER = combatantId('combatant:archer');
const SCOUT = combatantId('combatant:scout');
const GUARD = combatantId('combatant:guard');

function option(
  actorId: CombatantId,
  name: string,
  action: 'attack' | 'grab' | 'dodge',
  targetId: CombatantId | null,
): EngineOfferableOption {
  return {
    optionId: engineOptionId(`option:${name}`),
    actorId,
    revision: 7,
    label: name,
    movement: {
      preference: { willingness: 'only_if_required', opportunityRisk: 'avoid' },
      engagement: targetId === null
        ? { stance: 'hold_position' }
        : { stance: 'close_to_melee', anchor: { kind: 'combatant', combatantId: targetId } },
    },
    actionSlots: action === 'dodge'
      ? [{ slot: 'main', use: { kind: 'dodge' } }]
      : [{
          slot: 'main',
          use: action === 'attack'
            ? { kind: 'attack', actionId: engineActionId(`${name}:attack`), target: { kind: 'combatant', combatantId: targetId ?? SCOUT } }
            : { kind: 'saving_throw', actionId: engineActionId(`${name}:grab`), target: { kind: 'combatant', combatantId: targetId ?? SCOUT } },
        }],
    omittedRiders: [],
    resourceCostLabels: [],
  };
}

function projectedActor(input: {
  readonly id: CombatantId;
  readonly side: 'monster' | 'player_character';
  readonly hitPoints: number;
  readonly position: { readonly column: number; readonly row: number };
  readonly options?: readonly EngineOfferableOption[];
}): EngineProjectionCombatant {
  return {
    id: input.id,
    name: input.id,
    side: input.side,
    life: 'living',
    hitPoints: input.hitPoints,
    hitPointMaximum: input.hitPoints,
    speedFeet: 30,
    reachFeet: 5,
    placementStatus: 'placed',
    position: input.position,
    effectiveSize: 'Medium',
    placementMode: { kind: 'normal', actual: 'Medium' },
    footprint: [input.position],
    actionAvailable: true,
    bonusActionAvailable: true,
    reactionAvailable: true,
    movementRemainingFeet: 30,
    actions: [],
    actionApproaches: [],
    options: input.options ?? [],
    planning: {
      conditionFlags: [],
      temporaryHitPoints: 0,
      spellSlots: [],
      legendaryActionUsesRemaining: 0,
      legendaryResistanceUsesRemaining: 0,
      concentrating: false,
    },
  };
}

function handBuiltCapsule(): EngineStateCapsule {
  const bruteOptions = [
    option(BRUTE, 'brute-attack-scout', 'attack', SCOUT),
    option(BRUTE, 'brute-attack-guard', 'attack', GUARD),
    option(BRUTE, 'brute-grab-scout', 'grab', SCOUT),
    option(BRUTE, 'brute-dodge', 'dodge', null),
  ];
  const archerOptions = [
    option(ARCHER, 'archer-attack-scout', 'attack', SCOUT),
    option(ARCHER, 'archer-attack-guard', 'attack', GUARD),
    option(ARCHER, 'archer-dodge', 'dodge', null),
  ];
  const projection: EngineDmProjection = {
    room: 1,
    round: 1,
    activeSide: 'monsters',
    activeCombatant: BRUTE,
    initiative: {
      policy: 'initiative-intel-v1',
      timeline: {
        phase: { kind: 'active' },
        round: 1,
        currentCombatant: BRUTE,
        initiative: [],
        upcoming: [],
        roundBoundaries: [],
        branchPoints: [],
      },
    },
    bounds: { columns: 8, rows: 8 },
    blockedCells: [{ column: 2, row: 1 }],
    difficultTerrainCells: [],
    movementBlockingObjects: [],
    observationHistory: [],
    combatants: [
      projectedActor({ id: BRUTE, side: 'monster', hitPoints: 18, position: { column: 0, row: 1 }, options: bruteOptions }),
      projectedActor({ id: ARCHER, side: 'monster', hitPoints: 12, position: { column: 0, row: 3 }, options: archerOptions }),
      projectedActor({ id: SCOUT, side: 'player_character', hitPoints: 4, position: { column: 2, row: 2 } }),
      projectedActor({ id: GUARD, side: 'player_character', hitPoints: 20, position: { column: 5, row: 5 } }),
    ],
    semanticZones: [],
  };
  return createEngineStateCapsule({
    runId: encounterSessionId('session:plays-v1'),
    branchId: encounterBranchId('branch:plays-v1'),
    revision: 7,
    generatedAt: '2026-08-28T00:00:00.000Z',
    request: {
      kind: 'round_plan',
      requestId: 'request:plays-v1',
      phase: 'initial',
      correctionNumber: 0,
      actors: [BRUTE, ARCHER],
    },
    projection,
  });
}

function primaryOptionNames(name: PlayName, capsule: EngineStateCapsule): readonly string[] {
  return SNIPPET_REGISTRY.expand(name, capsule).proposals.map((proposal) => proposal.primaryOptionId);
}

describe('plays v1', () => {
  it.each([
    ['basic_advance', ['option:archer-attack-scout', 'option:brute-attack-scout']],
    ['focus_fire', ['option:archer-attack-scout', 'option:brute-attack-scout']],
    ['remove_obstacle', ['option:archer-attack-scout', 'option:brute-grab-scout']],
  ] satisfies readonly (readonly [PlayName, readonly string[]])[])(
    '%s expands correctly from a hand-built capsule',
    (name, expected) => {
      const capsule = handBuiltCapsule();
      expect(primaryOptionNames(name, capsule)).toEqual(expected);
    },
  );

  it.each(PLAY_NAMES)('%s passes the unchanged ast-grep purity rule', (name) => {
    const result = spawnSync('sg', [
      'scan',
      '--rule', resolve('ast-grep-rules/vtt-snippet-purity.yml'),
      'src/vtt/snippets',
      '--color', 'never',
    ], { cwd: resolve('.'), encoding: 'utf8' });
    expect({ name, status: result.status, output: `${result.stdout}${result.stderr}` })
      .toEqual({ name, status: 0, output: '' });
  });

  it.each(PLAY_NAMES)('%s shadow-runs without mutating or submitting through the capsule', (name) => {
    const capsule = handBuiltCapsule();
    const before = JSON.stringify(capsule);
    const result = SNIPPET_REGISTRY.shadowRun(name, capsule);
    expect(result).toMatchObject({
      playName: name,
      capsuleDigest: capsule.digest,
      valid: true,
      issues: [],
    });
    expect(result.proposals).toEqual(SNIPPET_REGISTRY.expand(name, capsule).proposals);
    expect(JSON.stringify(capsule)).toBe(before);
    expect(Object.isFrozen(capsule)).toBe(true);
  });

  it('reports capsule-semantic shadow validation failures instead of blessing schema-shaped output', () => {
    const capsule = handBuiltCapsule();
    const invalidProposal: EngineTurnProposal = {
      actorId: BRUTE,
      expectedRevision: capsule.revision,
      primaryOptionId: engineOptionId('option:not-projected'),
      fallbackOptionId: null,
      reason: 'Exercise the advertised play fixture.',
      overrideJustification: null,
    };
    const registry = createSnippetRegistry({
      inputSchema: { parse: () => capsule },
      outputSchema: { parse: () => [invalidProposal] },
      hash: () => '0'.repeat(64),
    });
    expect(registry.shadowRun('basic_advance', capsule)).toMatchObject({
      valid: false,
      issues: ['PRIMARY_OPTION_NOT_PROJECTED', 'MISSING_ACTOR'],
    });
  });

  it('advertises terse skill descriptions, then selectively loads prose and referenced plays', () => {
    const capsule = handBuiltCapsule();
    expect(SNIPPET_REGISTRY.applicableSkills(capsule).map((skill) => skill.name))
      .toEqual(['core_tactics', 'remove_obstacle', 'focus_fire']);
    expect(SNIPPET_REGISTRY.applicableSkills(capsule).every((skill) =>
      !skill.description.includes('\n'))).toBe(true);

    const loaded = SNIPPET_REGISTRY.loadSkill('focus_fire', capsule);
    expect(loaded).toMatchObject({
      name: 'focus_fire',
      plays: [{ name: 'focus_fire' }],
    });
    expect(loaded.procedure).toContain('Edit or discard the draft');
    expect(loaded.skillHash).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('keeps the core skill always on and rejects situation skills when their plays do not apply', () => {
    const capsule = handBuiltCapsule();
    if (capsule.request === null) throw new TypeError('Hand-built request is absent.');
    const correction = createEngineStateCapsule({
      runId: capsule.runId,
      branchId: capsule.branchId,
      revision: capsule.revision + 1,
      generatedAt: capsule.generatedAt,
      request: { ...capsule.request, phase: 'correction', correctionNumber: 1 },
      projection: capsule.projection,
    });
    expect(SNIPPET_REGISTRY.applicableSkills(correction).map((skill) => skill.name))
      .toEqual(['core_tactics']);
    expect(SNIPPET_REGISTRY.loadSkill('core_tactics', correction).plays.map((play) => play.name))
      .toEqual(['basic_advance']);
    expect(() => SNIPPET_REGISTRY.loadSkill('focus_fire', correction))
      .toThrow('SKILL_NOT_APPLICABLE:focus_fire');
  });

  it('content-addresses whole skills separately from plays and enabled sets', () => {
    expect(SNIPPET_REGISTRY.skills.map((skill) => skill.skillHash))
      .toEqual(SNIPPET_REGISTRY.skills.map(() => expect.stringMatching(/^[0-9a-f]{64}$/u)));
    expect(new Set(SNIPPET_REGISTRY.skills.map((skill) => skill.skillHash)).size)
      .toBe(SNIPPET_REGISTRY.skills.length);
    expect(SNIPPET_REGISTRY.skillHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(SNIPPET_REGISTRY.skillSetHash).toMatch(/^[0-9a-f]{64}$/u);
    expect(SNIPPET_REGISTRY.skillHash).not.toBe(SNIPPET_REGISTRY.skillSetHash);
    expect(SNIPPET_REGISTRY.skillHash).not.toBe(SNIPPET_REGISTRY.snippetHash);
  });
});
