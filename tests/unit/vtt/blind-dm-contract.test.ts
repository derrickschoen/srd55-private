import { describe, expect, it } from 'vitest';
import {
  BLIND_INTENT_REJECTION_CODES,
  BLIND_INTENT_VERSION,
  BLIND_MAX_ATTEMPTS_DEFAULT,
  BLIND_REPAIR_ARMS,
  COMPASS_DIRECTIONS,
  DM_MODES,
  blindActionKinds,
  blindActionSchema,
  blindAreaSchema,
  blindAttemptNumberSchema,
  blindCodeOnlyRejectionSchema,
  blindDestinationSchema,
  blindIntentRejectionCodeSchema,
  blindMaxAttemptsSchema,
  blindMinimalLegalAlternativeRejectionSchema,
  blindRepairArmSchema,
  blindRoundIntentEnvelopeSchema,
  columnRowLabelSchema,
  compassDirectionSchema,
  dmModeSchema,
} from '../../../src/vtt/blind-dm-contract';

function baseIntent() {
  return {
    actor: { name: 'Goblin Warrior', badge: 2 },
    action: { kind: 'attack' as const, name: 'Scimitar' },
    target: { kind: 'creature' as const, name: 'Fighter', badge: 1 },
    destination: { kind: 'relative' as const, relation: 'hold' as const },
    reason: 'Pressure the front line while holding the doorway.',
  };
}

function envelope(intent: Readonly<Record<string, unknown>> = baseIntent()) {
  return { intent_version: BLIND_INTENT_VERSION, intents: [intent] };
}

describe('D569 blind DM contracts', () => {
  it('closes the mode, repair-arm, attempt, and rejection-code sets', () => {
    expect(DM_MODES).toEqual(['advice', 'blind']);
    expect(DM_MODES.map((mode) => dmModeSchema.parse(mode))).toEqual(DM_MODES);
    expect(dmModeSchema.safeParse('hybrid').success).toBe(false);

    expect(BLIND_REPAIR_ARMS).toEqual(['code_only', 'minimal_legal_alternative']);
    expect(BLIND_REPAIR_ARMS.map((arm) => blindRepairArmSchema.parse(arm)))
      .toEqual(BLIND_REPAIR_ARMS);
    expect(blindRepairArmSchema.safeParse('engine_fallback').success).toBe(false);

    expect(blindMaxAttemptsSchema.parse(undefined)).toBe(BLIND_MAX_ATTEMPTS_DEFAULT);
    expect([1, 2, 3].map((attempt) => blindAttemptNumberSchema.parse(attempt)))
      .toEqual([1, 2, 3]);
    for (const invalid of [0, 4, 1.5, Number.NaN, '3']) {
      expect(blindMaxAttemptsSchema.safeParse(invalid).success).toBe(false);
    }

    expect(BLIND_INTENT_REJECTION_CODES).toHaveLength(24);
    expect(BLIND_INTENT_REJECTION_CODES.map((code) => blindIntentRejectionCodeSchema.parse(code)))
      .toEqual(BLIND_INTENT_REJECTION_CODES);
    expect(blindIntentRejectionCodeSchema.safeParse('OPTION_NOT_SHOWN').success).toBe(false);
  });

  it('accepts every action variant and requires a human spell name', () => {
    const actions = [
      { kind: 'attack' },
      { kind: 'attack', name: 'Shortbow' },
      { kind: 'cast', name: 'Web' },
      { kind: 'interact' },
      { kind: 'interact', name: 'Raise portcullis' },
      ...(['dash', 'dodge', 'disengage', 'hide', 'help', 'ready', 'end'] as const)
        .map((kind) => ({ kind })),
    ];
    expect(actions.map((action) => blindActionSchema.parse(action).kind)).toEqual([
      'attack', 'attack', 'cast', 'interact', 'interact',
      'dash', 'dodge', 'disengage', 'hide', 'help', 'ready', 'end',
    ]);
    expect(new Set(actions.map((action) => action.kind))).toEqual(new Set(blindActionKinds));
    expect(blindActionSchema.safeParse({ kind: 'cast' }).success).toBe(false);
    expect(blindActionSchema.safeParse({ kind: 'dodge', name: 'Defend' }).success).toBe(false);
    expect(blindActionSchema.safeParse({ kind: 'multiattack' }).success).toBe(false);
  });

  it('accepts only a gutter label string as an exact destination coordinate', () => {
    expect(['0,0', '7,12', '103,9'].map((label) => columnRowLabelSchema.parse(label)))
      .toEqual(['0,0', '7,12', '103,9']);
    for (const invalid of ['-1,0', '01,2', '1, 2', '(1,2)', '1,2,3', 'north', '', 12]) {
      expect(columnRowLabelSchema.safeParse(invalid).success).toBe(false);
    }
    expect(blindDestinationSchema.parse({ kind: 'cell_label', label: '7,12' }))
      .toEqual({ kind: 'cell_label', label: '7,12' });
    for (const numericCoordinate of [
      { kind: 'cell_label', column: 7, row: 12 },
      { kind: 'cell_label', label: { column: 7, row: 12 } },
      { column: 7, row: 12 },
    ]) {
      expect(blindDestinationSchema.safeParse(numericCoordinate).success).toBe(false);
    }
  });

  it('accepts every relative destination with exactly the required anchors', () => {
    const entity = { name: 'Stone pillar' };
    expect(blindDestinationSchema.parse({ kind: 'relative', relation: 'hold' }))
      .toEqual({ kind: 'relative', relation: 'hold' });
    for (const relation of ['adjacent_to', 'toward', 'away_from', 'near'] as const) {
      expect(blindDestinationSchema.parse({ kind: 'relative', relation, anchor: entity }))
        .toEqual({ kind: 'relative', relation, anchor: entity });
      expect(blindDestinationSchema.safeParse({ kind: 'relative', relation }).success).toBe(false);
    }
    expect(blindDestinationSchema.parse({
      kind: 'relative', relation: 'behind', anchor: entity, from: { name: 'Wizard', badge: 3 },
    })).toEqual({
      kind: 'relative', relation: 'behind', anchor: entity, from: { name: 'Wizard', badge: 3 },
    });
    expect(blindDestinationSchema.safeParse({
      kind: 'relative', relation: 'behind', anchor: entity,
    }).success).toBe(false);
    expect(blindDestinationSchema.safeParse({
      kind: 'relative', relation: 'hold', anchor: entity,
    }).success).toBe(false);
  });

  it('supports cell and entity area anchors with only closed compass words', () => {
    for (const direction of COMPASS_DIRECTIONS) {
      expect(compassDirectionSchema.parse(direction)).toBe(direction);
      expect(blindAreaSchema.parse({ kind: 'cell_label', label: '4,8', direction }))
        .toEqual({ kind: 'cell_label', label: '4,8', direction });
      expect(blindAreaSchema.parse({
        kind: 'centered_on', target: { name: 'Guard', badge: 4 }, direction,
      })).toEqual({ kind: 'centered_on', target: { name: 'Guard', badge: 4 }, direction });
    }
    expect(blindAreaSchema.parse({ kind: 'cell_label', label: '4,8' }))
      .toEqual({ kind: 'cell_label', label: '4,8' });
    expect(blindAreaSchema.parse({ kind: 'centered_on', target: { name: 'Brazier' } }))
      .toEqual({ kind: 'centered_on', target: { name: 'Brazier' } });
    for (const invalidDirection of [
      'north-north-east',
      90,
      { x: 1, y: 0 },
      { column: 1, row: 0 },
      '1,0',
    ]) {
      expect(blindAreaSchema.safeParse({
        kind: 'cell_label', label: '4,8', direction: invalidDirection,
      }).success).toBe(false);
    }
    expect(blindAreaSchema.safeParse({ kind: 'centered_on', name: 'Guard' }).success).toBe(false);
    expect(blindAreaSchema.safeParse({ kind: 'cell_label', column: 4, row: 8 }).success).toBe(false);
  });

  it('requires actor badges, permits optional target and anchor badges, and rejects invalid badges', () => {
    expect(blindRoundIntentEnvelopeSchema.parse(envelope())).toEqual(envelope());
    expect(blindRoundIntentEnvelopeSchema.safeParse(envelope({
      ...baseIntent(), actor: { name: 'Goblin Warrior' },
    })).success).toBe(false);
    expect(blindRoundIntentEnvelopeSchema.parse(envelope({
      ...baseIntent(), target: { kind: 'object', name: 'Gate' },
    })).intents[0]?.target).toEqual({ kind: 'object', name: 'Gate' });
    for (const badge of [0, -1, 1.5, '2']) {
      expect(blindRoundIntentEnvelopeSchema.safeParse(envelope({
        ...baseIntent(), actor: { name: 'Goblin Warrior', badge },
      })).success).toBe(false);
    }
  });

  it('rejects unknown or authority-crossing fields at every grammar level', () => {
    const forbiddenMutations = [
      { ...envelope(), request_id: 'request:1' },
      envelope({ ...baseIntent(), option_id: 'option:private' }),
      envelope({ ...baseIntent(), path: ['0,0', '1,0'] }),
      envelope({ ...baseIntent(), actor: { ...baseIntent().actor, actor_id: 'combatant:1' } }),
      envelope({ ...baseIntent(), action: { kind: 'attack', name: 'Scimitar', attack_bonus: 4 } }),
      envelope({ ...baseIntent(), target: { kind: 'creature', name: 'Fighter', coordinates: '2,3' } }),
      envelope({ ...baseIntent(), destination: { kind: 'cell_label', label: '2,3', path: ['2,3'] } }),
      envelope({ ...baseIntent(), area: { kind: 'cell_label', label: '2,3', radius: 4 } }),
      envelope({ ...baseIntent(), activation_choice: 'empowered' }),
      envelope({ ...baseIntent(), dice: '1d20' }),
      envelope({ ...baseIntent(), damage: 7 }),
      envelope({ ...baseIntent(), reducer_command: 'apply_attack' }),
    ];
    for (const mutation of forbiddenMutations) {
      expect(blindRoundIntentEnvelopeSchema.safeParse(mutation).success).toBe(false);
    }
  });

  it('rejects coordinates, paths, mechanics, and commands hidden in prose fields', () => {
    for (const reason of [
      'Move through 2,3 before attacking.',
      'Follow 2,3 -> 3,3.',
      'Roll 1d20 for damage.',
      'Deal 2d6+3 fire.',
      'Use DC 14.',
      'The attack bonus is 5.',
      'The die result is seventeen.',
      'Take the route to 4,7 around the pillar.',
      'Call reducer command now.',
      'Dispatch the encounter mutation now.',
      'Select option_ref alpha.',
      'execute(attack).',
    ]) {
      expect(blindRoundIntentEnvelopeSchema.safeParse(envelope({
        ...baseIntent(), reason,
      })).success).toBe(false);
    }
    expect(blindRoundIntentEnvelopeSchema.safeParse(envelope({
      ...baseIntent(), target: { kind: 'object', name: '2,3' },
    })).success).toBe(false);
    for (const reason of [
      'Control before damage',
      'Hold the doorway and avoid damage',
      'Block the route to the stairs',
    ]) {
      expect(blindRoundIntentEnvelopeSchema.safeParse(envelope({
        ...baseIntent(), reason,
      })).success).toBe(true);
    }
    for (const reason of [
      'deal 2d6 damage',
      'damage 12',
      'deal 12 fire damage',
      'save dc 15',
      'move to 4,7',
      'attack bonus +7',
    ]) {
      expect(blindRoundIntentEnvelopeSchema.safeParse(envelope({
        ...baseIntent(), reason,
      })).success).toBe(false);
    }
    const { reason: _reason, ...withoutReason } = baseIntent();
    expect(blindRoundIntentEnvelopeSchema.parse(envelope(withoutReason)).intents[0])
      .not.toHaveProperty('reason');
  });

  it('keeps code-only repair receipts free of legal alternatives and constrains the hint arm', () => {
    const codeOnly = {
      status: 'rejected' as const,
      attempt: 1,
      actor: { name: 'Goblin Warrior', badge: 2 },
      codes: ['TARGET_REQUIRED' as const],
    };
    expect(blindCodeOnlyRejectionSchema.parse(codeOnly)).toEqual(codeOnly);
    expect(blindCodeOnlyRejectionSchema.safeParse({
      ...codeOnly,
      legal_alternative: { action_kind: 'dodge' },
    }).success).toBe(false);
    expect(blindCodeOnlyRejectionSchema.safeParse({
      ...codeOnly,
      codes: ['TARGET_REQUIRED', 'TARGET_REQUIRED'],
    }).success).toBe(false);

    expect(blindMinimalLegalAlternativeRejectionSchema.parse({
      ...codeOnly,
      legal_alternative: { action_kind: 'attack', target: { name: 'Fighter', badge: 1 } },
    })).toEqual({
      ...codeOnly,
      legal_alternative: { action_kind: 'attack', target: { name: 'Fighter', badge: 1 } },
    });
    expect(blindMinimalLegalAlternativeRejectionSchema.safeParse({
      ...codeOnly,
      legal_alternative: { action_kind: 'attack', option_id: 'option:private' },
    }).success).toBe(false);
  });
});
