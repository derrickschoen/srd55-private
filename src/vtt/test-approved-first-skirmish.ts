import { canonicalJson } from '../commands/canonical-json';
import {
  approveEncounterPackage,
  buildEncounterGenerationPrompt,
  encounterArtFromApprovedFixture,
  testApproverIdentity,
  type EncounterGenerationRequest,
} from './generated-encounter-fixtures';

/**
 * Engine-only example. This is TEST-approved and records no owner act.
 * The real first-skirmish fixture is generated and owner-approved through the
 * trusted playtest approval UI.
 */
export const TEST_APPROVED_FIRST_SKIRMISH_REQUEST = {
  schemaVersion: 1,
  partySource: 'reference',
  difficulty: { rounds: 4, pressure: 'moderate' },
  brief: 'A one-room skirmish in a ruined gatehouse. The party must break through before the priests complete their retreat.',
} as const satisfies EncounterGenerationRequest;

export const TEST_APPROVED_FIRST_SKIRMISH_PACKAGE = {
  schemaVersion: 1,
  request: TEST_APPROVED_FIRST_SKIRMISH_REQUEST,
  generationPrompt: buildEncounterGenerationPrompt(TEST_APPROVED_FIRST_SKIRMISH_REQUEST),
  roster: [
    { combatantId: 'combatant:gate-captain-north', tokenId: 'token:gate-captain-north', statblockId: 'statblock:bandit-captain', sizeCategory: 'Medium', role: 'defender' },
    { combatantId: 'combatant:gate-captain-south', tokenId: 'token:gate-captain-south', statblockId: 'statblock:bandit-captain', sizeCategory: 'Medium', role: 'defender' },
    { combatantId: 'combatant:gate-ogre-east', tokenId: 'token:gate-ogre-east', statblockId: 'statblock:ogre', sizeCategory: 'Large', role: 'bruiser' },
    { combatantId: 'combatant:gate-ogre-west', tokenId: 'token:gate-ogre-west', statblockId: 'statblock:ogre', sizeCategory: 'Large', role: 'bruiser' },
    { combatantId: 'combatant:gate-priest-east', tokenId: 'token:gate-priest-east', statblockId: 'statblock:priest', sizeCategory: 'Medium', role: 'leader' },
    { combatantId: 'combatant:gate-priest-west', tokenId: 'token:gate-priest-west', statblockId: 'statblock:priest', sizeCategory: 'Medium', role: 'leader' },
  ],
  layout: {
    map: {
      columns: 12,
      rows: 9,
      floorAssetId: 'art.map.floor.stone.v1',
      wallAssetId: 'art.map.wall.stone.v1',
      doorAssetId: 'art.map.door.wood.v1',
      doorCell: { column: 5, row: 8 },
    },
    placement: [
      { combatantId: 'combatant:fighter', cell: { column: 2, row: 4 } },
      { combatantId: 'combatant:cleric', cell: { column: 2, row: 3 } },
      { combatantId: 'combatant:wizard', cell: { column: 2, row: 5 } },
      { combatantId: 'combatant:gate-captain-north', cell: { column: 8, row: 2 } },
      { combatantId: 'combatant:gate-captain-south', cell: { column: 8, row: 6 } },
      { combatantId: 'combatant:gate-ogre-east', cell: { column: 9, row: 3 } },
      { combatantId: 'combatant:gate-ogre-west', cell: { column: 9, row: 5 } },
      { combatantId: 'combatant:gate-priest-east', cell: { column: 10, row: 2 } },
      { combatantId: 'combatant:gate-priest-west', cell: { column: 11, row: 6 } },
    ],
    terrain: [
      { id: 'terrain:gate-pillar', cell: { column: 5, row: 3 }, kind: 'blocking', blocksMovement: true, assetId: 'art.terrain.pillar.v1' },
      { id: 'terrain:gate-crates', cell: { column: 6, row: 3 }, kind: 'cover', blocksMovement: false, assetId: 'art.terrain.crate.v1' },
      { id: 'terrain:gate-rubble', cell: { column: 4, row: 5 }, kind: 'difficult', blocksMovement: false, assetId: 'art.terrain.rubble.v1' },
      { id: 'terrain:gate-hazard', cell: { column: 7, row: 4 }, kind: 'hazard', blocksMovement: false, assetId: 'art.terrain.hazard.v1' },
    ],
    fog: {
      hiddenAssetId: 'art.fog.hidden.v1',
      unexploredAssetId: 'art.fog.unexplored.v1',
      revealedAssetId: 'art.fog.revealed.v1',
      cells: [
        { column: 8, row: 2 },
        { column: 8, row: 6 },
        { column: 9, row: 3 },
        { column: 9, row: 5 },
        { column: 10, row: 2 },
        { column: 10, row: 6 },
      ],
    },
    ui: {
      activePcAssetId: 'art.focus.active-pc.v1',
      adjudicatedAssetId: 'art.event.adjudicated.v1',
    },
    combatantTokens: {
      'combatant:fighter': 'art.token.pc.fighter.v1',
      'combatant:cleric': 'art.token.pc.cleric.v1',
      'combatant:wizard': 'art.token.pc.wizard.v1',
      'combatant:gate-captain-north': 'art.token.monster.bandit-captain.v1',
      'combatant:gate-captain-south': 'art.token.monster.bandit-captain.v1',
      'combatant:gate-ogre-east': 'art.token.monster.ogre.v1',
      'combatant:gate-ogre-west': 'art.token.monster.ogre.v1',
      'combatant:gate-priest-east': 'art.token.monster.priest.v1',
      'combatant:gate-priest-west': 'art.token.monster.priest.v1',
    },
  },
  tactics: {
    objective: 'Hold the ruined gatehouse until both priests can withdraw through the southern door.',
    exitConditions: [
      'The encounter ends when every monster is defeated or has withdrawn.',
      'The party succeeds immediately if it controls the southern doorway with no living monster adjacent to it.',
    ],
    notes: [
      'The captains screen the priests and yield ground before becoming surrounded.',
      'The ogres telegraph a push through the center and avoid clustering beside both priests.',
      'A priest withdraws when isolated and does not replace typed mechanics with narration.',
    ],
    combatantPlans: [
      { combatantId: 'combatant:gate-captain-north', priorities: ['Screen the eastern priest.', 'Pressure an exposed ranged PC.', 'Withdraw toward the southern door.'] },
      { combatantId: 'combatant:gate-captain-south', priorities: ['Screen the western priest.', 'Block the shortest route to the door.', 'Withdraw with the surviving priest.'] },
      { combatantId: 'combatant:gate-ogre-east', priorities: ['Advance through the center.', 'Threaten the nearest visible PC.', 'Keep a route open for the priests.'] },
      { combatantId: 'combatant:gate-ogre-west', priorities: ['Use the western lane.', 'Separate a front-line PC from allies.', 'Fall back if both captains fall.'] },
      { combatantId: 'combatant:gate-priest-east', priorities: ['Support an ally using only its decoded statblock.', 'Move toward the southern door.', 'Withdraw when isolated.'] },
      { combatantId: 'combatant:gate-priest-west', priorities: ['Support the least durable ally using only its decoded statblock.', 'Avoid sharing an area with the other priest.', 'Withdraw when isolated.'] },
    ],
  },
  provenance: {
    generator: 'codex-dm',
    model: 'codex-project-supervised',
    effort: 'binding-increment-9',
    revisions: [{
      kind: 'generated',
      sections: ['roster', 'layout', 'tactics'],
      sessionId: 'codex:increment-9-approved-fixture',
      exchangeId: 'exchange:first-skirmish:v1',
    }],
  },
} as const;

export const TEST_APPROVED_FIRST_SKIRMISH_FIXTURE = approveEncounterPackage(
  TEST_APPROVED_FIRST_SKIRMISH_PACKAGE,
  testApproverIdentity('test:increment-9-engine-example'),
);

export const TEST_APPROVED_FIRST_SKIRMISH_FIXTURE_BYTES = canonicalJson(
  TEST_APPROVED_FIRST_SKIRMISH_FIXTURE,
);

export const TEST_APPROVED_FIRST_SKIRMISH_ART = encounterArtFromApprovedFixture(
  TEST_APPROVED_FIRST_SKIRMISH_FIXTURE,
);
