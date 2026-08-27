// Characterization INPUT, not normative expected output.
export const reachTranscript = {
  seed: 3_943_001,
  actorId: 'combatant:generated-3943001-monster-2',
  targetId: 'combatant:fighter',
  calls: [
    {
      case: 'melee_reach',
      actionId: 'grab',
      actor: { column: 0, row: 0 },
      target: { column: 2, row: 0 },
    },
    {
      case: 'thrown_range',
      actionId: 'light-hammer',
      actor: { column: 0, row: 0 },
      target: { column: 4, row: 0 },
    },
  ],
} as const;
