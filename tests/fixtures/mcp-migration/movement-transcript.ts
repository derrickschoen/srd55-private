// Characterization INPUT, not normative expected output.
export const movementTranscript = {
  seed: 3_943_001,
  actorId: 'combatant:generated-3943001-monster-2',
  occupantId: 'combatant:fighter',
  calls: [
    {
      case: 'normal_move',
      actor: { column: 0, row: 0 },
      destination: { column: 2, row: 0 },
      difficultCells: [],
      maximumFeet: 30,
      movement: 'normal',
    },
    {
      case: 'difficult_terrain',
      actor: { column: 0, row: 0 },
      destination: { column: 2, row: 0 },
      difficultCells: [{ column: 1, row: 0 }, { column: 2, row: 0 }],
      maximumFeet: 30,
      movement: 'normal',
    },
    {
      case: 'dash',
      actor: { column: 0, row: 0 },
      destination: { column: 7, row: 0 },
      difficultCells: [],
      maximumFeet: 60,
      movement: 'dash',
    },
    {
      case: 'occupied_endpoint',
      actor: { column: 0, row: 0 },
      occupant: { column: 2, row: 0 },
      destination: { column: 2, row: 0 },
      difficultCells: [],
      maximumFeet: 30,
      movement: 'normal',
    },
  ],
} as const;
