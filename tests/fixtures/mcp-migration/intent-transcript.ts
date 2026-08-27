// Characterization INPUT, not normative expected output.
export const intentTranscript = {
  seed: 3_943_001,
  actorId: 'combatant:generated-3943001-monster-2',
  targetId: 'combatant:fighter',
  actor: { column: 0, row: 0 },
  target: { column: 4, row: 0 },
  intent: {
    action: 'grab',
    targetId: 'combatant:fighter',
    maxMovementFeet: 0,
    acceptMelee: true,
    fallback: {
      action: 'light-hammer',
      targetId: 'combatant:fighter',
      maxMovementFeet: 0,
      acceptMelee: false,
    },
  },
} as const;
