import { describe, expect, it } from 'vitest';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import {
  createAgentSessionDigestV1,
  type AgentSessionDigestInput,
} from '../../../src/vtt/agent-session-digest';

function digestInput(reverse: boolean): AgentSessionDigestInput {
  const resources = new Map([
    ['spell_slots', { level: 2, remaining: 1 }],
    ['wild_shape', { remaining: 2 }],
  ]);
  const effects = [...resources.entries()].map(([kind, value]) => ({ kind, ...value }));
  const ordered = reverse ? effects.reverse() : effects;
  return {
    runId: encounterSessionId('session:digest-determinism'),
    branchId: encounterBranchId('branch:digest-determinism'),
    revision: 17,
    completedRoomSummaries: reverse
      ? [{ room: 2, outcome: 'victory' }, { room: 1, outcome: 'victory' }]
      : [{ room: 1, outcome: 'victory' }, { room: 2, outcome: 'victory' }],
    current: { room: 3, round: 2, phase: { kind: 'active' } },
    durableReactionGuidance: { actors: [], sideWide: { opportunity_attack: 'take' } },
    partyResources: { rests: 1 },
    lifeAndHitPointBands: reverse
      ? [{ combatantId: 'b', band: 'bloodied' }, { combatantId: 'a', band: 'healthy' }]
      : [{ combatantId: 'a', band: 'healthy' }, { combatantId: 'b', band: 'bloodied' }],
    effectsAndResources: ordered,
    recentAcceptedEngineDecisions: reverse
      ? [{ revision: 16, decision: { option: 'b' } }, { revision: 15, decision: { option: 'a' } }]
      : [{ revision: 15, decision: { option: 'a' } }, { revision: 16, decision: { option: 'b' } }],
  };
}

describe('AgentSessionDigestV1', () => {
  it('is deterministic for cloned and reordered engine sets (mutation: unsorted map traversal)', () => {
    const first = createAgentSessionDigestV1(structuredClone(digestInput(false)));
    const reordered = createAgentSessionDigestV1(structuredClone(digestInput(true)));

    expect(reordered.bytes).toBe(first.bytes);
    expect(reordered.hash).toBe(first.hash);
  });

  it('changes hash when one material sitting fact changes (mutation: omitted resource)', () => {
    const first = createAgentSessionDigestV1(digestInput(false));
    const changed = createAgentSessionDigestV1({
      ...digestInput(false),
      partyResources: { rests: 0 },
    });

    expect(changed.hash).not.toBe(first.hash);
  });
});
