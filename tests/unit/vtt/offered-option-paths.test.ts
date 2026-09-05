import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { WEB_MATERIAL, type PersistentArea } from '../../../src/combat/persistent-areas';
import { GOBLIN_WARRIOR } from '../../../src/combat/statblocks/monsters';
import { feetPoint } from '../../../src/combat/templates';
import { projectDmView } from '../../../src/combat/visibility';
import {
  damageType,
  dieSides,
  feet,
  persistentAreaId,
} from '../../../src/combat/values';
import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
import { renderBoard } from '../../../src/vtt/encounter-app';
import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
import {
  boardPathSummary,
  offeredOptionPaths,
  orderOptionsAsTurnContext,
  type OfferedOptionPath,
} from '../../../src/vtt/offered-option-paths';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';
import { createOptionPathFixtureEncounter } from '../../fixtures/vtt-option-path-encounter';
import { placedToken, playerProfile } from '../combat/fixtures';

function face(value: number): () => number {
  return () => (value - 0.5) / 20;
}

function damagingArea(owner: ReturnType<typeof monsterCombatantProfile>['id']): PersistentArea {
  return {
    id: persistentAreaId('area:offered-path-hazards'),
    sequence: 1,
    owner,
    origin: { kind: 'fixed', point: feetPoint(20, 0) },
    shape: { kind: 'sphere', radius: feet(30) },
    duration: { kind: 'rounds', remaining: 10 },
    targetFilter: { kind: 'all' },
    difficultTerrain: false,
    material: WEB_MATERIAL,
    hooks: [{
      hook: 'on_start_of_turn_inside',
      frequency: 'once_per_turn',
      effect: {
        kind: 'automatic',
        payload: {
          kind: 'damage',
          damage: {
            terms: [{
              type: damageType('Fire'),
              dice: { count: 1, sides: dieSides(4), modifier: 0 },
            }],
            critical: false,
            responses: [],
          },
        },
      },
    }],
    movable: null,
    burningCells: [{
      cell: { column: 4, row: 0 },
      burnsAwayAt: { round: 2, initiativeIndex: 0 },
    }],
    burnedAwayCells: [],
    members: [],
    consumedTurnKeys: [],
  };
}

function pathFixture(): {
  readonly state: EncounterState;
  readonly paths: readonly OfferedOptionPath[];
  readonly actorId: ReturnType<typeof monsterCombatantProfile>['id'];
  readonly reactorId: ReturnType<typeof playerProfile>['id'];
} {
  const actor = monsterCombatantProfile(GOBLIN_WARRIOR, {
    combatantId: 'combatant:path-goblin',
    tokenId: 'token:path-goblin',
  });
  const reactor = playerProfile('path-reactor', { initiativeBonus: -20 });
  const target = playerProfile('path-target', { initiativeBonus: -20 });
  let state = reduceEncounter(createEncounter({
    bounds: { columns: 8, rows: 1 },
    environment: {
      lightRegions: [],
      obscurementRegions: [],
      difficultTerrainRegions: [{ id: 'path-mud', cells: [{ column: 3, row: 0 }] }],
      movementRegions: [],
      narrowOpeningRegions: [],
    },
    combatants: [actor, reactor, target],
    tokens: [placedToken(actor, 1), placedToken(reactor, 0), placedToken(target, 7)],
  }), { type: 'roll_initiative' }, face(10)).state;
  state = {
    ...state,
    persistentAreas: [damagingArea(actor.id)],
    nextPersistentAreaSequence: 2,
  };
  const options = orderOptionsAsTurnContext(availableEngineActorOptions(state, actor.id));
  return {
    state,
    paths: offeredOptionPaths(state, [{ actorId: actor.id, options }]),
    actorId: actor.id,
    reactorId: reactor.id,
  };
}

function serializedElement(element: InteractiveTestElement): string {
  const attributes = [...element.attributes]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `${name}=${JSON.stringify(value)}`)
    .join(' ');
  return `<${element.tagName} class=${JSON.stringify(element.className)} ${attributes}>${
    element.textContent ?? ''
  }${element.children.map(serializedElement).join('')}</${element.tagName}>`;
}

describe('D512 offered option movement paths', () => {
  let restoreDocument: () => void;

  beforeEach(() => {
    restoreDocument = installInteractiveDocument();
  });

  afterEach(() => restoreDocument());

  it('legacy_combatant_skips_footprint_migration: browser fixture enters through canonical creature-space construction', () => {
    const state = createOptionPathFixtureEncounter();
    expect(state.tokens.map((token) => ({
      combatantId: token.combatantId,
      position: token.position,
      placementMode: token.placementMode,
    }))).toEqual([
      {
        combatantId: 'combatant:browser-path-goblin',
        position: { column: 1, row: 2 },
        placementMode: { kind: 'normal', actual: 'Small' },
      },
      {
        combatantId: 'combatant:fighter',
        position: { column: 0, row: 2 },
        placementMode: { kind: 'normal', actual: 'Medium' },
      },
      {
        combatantId: 'combatant:cleric',
        position: { column: 7, row: 2 },
        placementMode: { kind: 'normal', actual: 'Medium' },
      },
    ]);

    expect(projectEncounterBoard(projectDmView(state)).combatants.map((combatant) => ({
      id: combatant.id,
      placementStatus: combatant.placementStatus,
      effectiveSize: combatant.placementStatus === 'placed' ? combatant.effectiveSize : null,
      footprint: combatant.placementStatus === 'placed' ? combatant.footprint : null,
    }))).toEqual([
      {
        id: 'combatant:browser-path-goblin',
        placementStatus: 'placed',
        effectiveSize: 'Small',
        footprint: [{ column: 1, row: 2 }],
      },
      {
        id: 'combatant:cleric',
        placementStatus: 'placed',
        effectiveSize: 'Medium',
        footprint: [{ column: 7, row: 2 }],
      },
      {
        id: 'combatant:fighter',
        placementStatus: 'placed',
        effectiveSize: 'Medium',
        footprint: [{ column: 0, row: 2 }],
      },
    ]);
  });

  it('projects the resolver path with all four engine-owned danger kinds and omits a no-movement option', () => {
    const fixture = pathFixture();
    expect(fixture.paths.length).toBeGreaterThanOrEqual(2);
    const farAttack = fixture.paths.find((path) => path.summaryLabel.includes('path-target'));
    if (farAttack === undefined) throw new Error('Fixture has no offered movement attack.');

    expect(farAttack.path).toEqual([
      { column: 1, row: 0 },
      { column: 2, row: 0 },
      { column: 3, row: 0 },
      { column: 4, row: 0 },
      { column: 5, row: 0 },
      { column: 6, row: 0 },
    ]);
    expect(farAttack.distanceFeet).toBe(30);
    expect(farAttack.steps[0]?.opportunityAttackReactors).toEqual([fixture.reactorId]);
    expect(new Set(farAttack.annotations.flatMap((annotation) => annotation.dangers))).toEqual(
      new Set([
        'opportunity_attack',
        'burning_surface',
        'persistent_area_damage',
        'difficult_terrain',
      ]),
    );
    expect(fixture.paths.some((path) => path.summaryLabel === 'Dodge')).toBe(false);
    expect(farAttack.optionOrdinal).toBeGreaterThanOrEqual(0);
    expect(boardPathSummary([farAttack])).toEqual(expect.objectContaining({
      count: 1,
      paths: [expect.objectContaining({
        optionOrdinal: farAttack.optionOrdinal,
        summaryLabel: farAttack.summaryLabel,
        destination: { column: 6, row: 0 },
        distanceFeet: 30,
      })],
    }));
  });

  it('renders ordinals, red hazard classes, OA arrows, hatching, flames, and the in-board legend', () => {
    const fixture = pathFixture();
    const boardProjection = projectEncounterBoard(projectDmView(fixture.state));
    const renderedPaths = fixture.paths.map((path, index) =>
      index === 0 ? { ...path, movementRemainingFeet: 0 } : path);
    const rendered = interactiveElement(renderBoard(
      boardProjection,
      new Set(),
      null,
      { revision: fixture.state.revision, round: fixture.state.round, stateDigest: 'digest:d512' },
      renderedPaths,
    ));

    expect(rendered.dataset['optionPaths']).toBe(String(renderedPaths.length));
    expect(rendered.querySelectorAll('.encounter-option-destination').map(
      (badge) => badge.dataset['optionOrdinal'],
    )).toEqual(renderedPaths.map((path) => String(path.optionOrdinal)));
    expect(rendered.querySelectorAll('.encounter-option-polyline')).toHaveLength(renderedPaths.length);
    expect(rendered.querySelectorAll('.encounter-option-segment-beyond-movement')).not.toHaveLength(0);
    expect(rendered.querySelectorAll('.encounter-option-segment-opportunity-attack')).not.toHaveLength(0);
    expect(rendered.querySelectorAll('.encounter-option-segment-difficult-terrain')).not.toHaveLength(0);
    expect(rendered.querySelectorAll('.encounter-option-segment-burning-surface')).not.toHaveLength(0);
    expect(rendered.querySelectorAll('.encounter-option-segment-persistent-area-damage')).not.toHaveLength(0);
    expect(rendered.querySelectorAll('.encounter-option-opportunity-arrow')).not.toHaveLength(0);
    expect(rendered.querySelectorAll('.encounter-option-threat')).toHaveLength(1);
    expect(rendered.querySelectorAll('.encounter-option-difficult-hatch')).not.toHaveLength(0);
    expect(rendered.querySelectorAll('.encounter-option-damage-flame')).not.toHaveLength(0);
    const optionElements = rendered.querySelectorAll('.encounter-option-path');
    expect(optionElements.every((element) => element.dataset['optionOrdinal'] !== undefined)).toBe(true);
    expect(optionElements.every((element) => element.dataset['dangerCells'] !== undefined)).toBe(true);
    expect(new Set(optionElements.map((element) => element.getAttribute('style'))).size).toBe(
      optionElements.length,
    );
    const legend = rendered.querySelector('.encounter-option-path-legend');
    if (legend === null) throw new Error('Option-path legend is absent.');
    expect(elementText(legend as unknown as Node)).toContain('solid = within movement');
    expect(elementText(legend as unknown as Node)).toContain('dashed = beyond movement (Dash)');
    expect(elementText(legend as unknown as Node)).toContain('arrow = Opportunity Attack');
    expect(elementText(legend as unknown as Node)).toContain('hatching = Difficult Terrain');
    expect(elementText(legend as unknown as Node)).toContain('N = option N');
  });

  it('keeps the disabled human-DM board byte-identical to the pre-overlay render path', () => {
    const fixture = pathFixture();
    const boardProjection = projectEncounterBoard(projectDmView(fixture.state));
    const incumbent = interactiveElement(renderBoard(boardProjection));
    const explicitlyDisabled = interactiveElement(renderBoard(
      boardProjection,
      new Set(),
      null,
      undefined,
      null,
    ));

    expect(serializedElement(explicitlyDisabled)).toBe(serializedElement(incumbent));
    expect(explicitlyDisabled.getAttribute('data-option-paths')).toBeNull();
    expect(explicitlyDisabled.querySelectorAll('.encounter-option-path')).toHaveLength(0);
    expect(explicitlyDisabled.querySelectorAll('.encounter-option-path-legend')).toHaveLength(0);
  });
});
