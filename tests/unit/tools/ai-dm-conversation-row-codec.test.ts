import { describe, expect, it } from 'vitest';
import {
  ArenaRowDecodeError,
  decodeArenaRow,
  encodeConversationRow,
} from '../../../tools/ai-dm-conversation-row-codec';

function preShiftRow(): Record<string, unknown> {
  return {
    seed: 5_117_001,
    arm: 'baseline',
    room: 1,
    round: 1,
    startingRoomDigest: 'frozen-room',
    combatModel: 'initiative_segments_v1',
    initiativeOrder: ['monster:ogre'],
    outcome: 'authorized',
    plannedBy: { model: 'model', effort: 'low' },
    roundNarrative: null,
    authorizedPlan: null,
  };
}

function postShiftRow(decisionTransport: 'mcp_minimal' | 'final_indices'): Record<string, unknown> {
  return {
    ...preShiftRow(),
    decisionTransport,
    firstDecisionAccepted: true,
    decisionAttempts: 1,
    decisionRejectionCodes: [],
    normalizationCodes: [],
    instructionSource: 'none',
    skillName: null,
    skillHash: null,
    rationale: null,
    ...(decisionTransport === 'final_indices' ? {
      chosenOptionIndices: [{
        actorId: 'monster:ogre',
        primaryOptionIndex: 2,
        fallbackOptionIndex: null,
      }],
    } : {}),
  };
}

function caughtDecodeError(value: unknown): ArenaRowDecodeError {
  try {
    decodeArenaRow(value);
  } catch (error) {
    expect(error).toBeInstanceOf(ArenaRowDecodeError);
    if (error instanceof ArenaRowDecodeError) return error;
    throw error;
  }
  throw new Error('expected decodeArenaRow to throw');
}

describe('AI-DM conversation row codec', () => {
  it('encodes current rows byte-for-byte without sorting, defaults, or newline', () => {
    const row = {
      zeta: null,
      decisionTransport: 'final_indices' as const,
      chosenOptionIndices: [{ actorId: 'monster:ogre', primaryOptionIndex: 2, fallbackOptionIndex: null }],
      alpha: 1,
    };
    expect(encodeConversationRow(row)).toBe(
      '{"zeta":null,"decisionTransport":"final_indices","chosenOptionIndices":[{"actorId":"monster:ogre","primaryOptionIndex":2,"fallbackOptionIndex":null}],"alpha":1}',
    );
  });

  it('decodes all three variants', () => {
    const preShift = decodeArenaRow(preShiftRow());
    const mcpMinimal = decodeArenaRow(postShiftRow('mcp_minimal'));
    const finalIndices = decodeArenaRow(postShiftRow('final_indices'));

    expect(preShift.rowEra).toBe('pre_shift');
    expect(mcpMinimal).toMatchObject({ rowEra: 'post_shift', row: { decisionTransport: 'mcp_minimal' } });
    expect(finalIndices).toMatchObject({
      rowEra: 'post_shift',
      row: {
        decisionTransport: 'final_indices',
        chosenOptionIndices: [{ actorId: 'monster:ogre', primaryOptionIndex: 2, fallbackOptionIndex: null }],
      },
    });
  });

  it('preserves absence, null, refusal, execution_failed, and partial_execution', () => {
    const absent = decodeArenaRow(preShiftRow());
    expect(absent.row).not.toHaveProperty('engineIntel');
    expect(absent.row.roundNarrative).toBeNull();
    expect(absent.row.authorizedPlan).toBeNull();
    expect(absent.planSummaries).toBeNull();

    for (const outcome of ['refused', 'execution_failed', 'partial_execution'] as const) {
      const decoded = decodeArenaRow({ ...postShiftRow('mcp_minimal'), outcome });
      expect(decoded.row.outcome).toBe(outcome);
    }
  });

  it('rejects post-shift fields and unknown transports without fallback', () => {
    const forbidden = caughtDecodeError({ ...preShiftRow(), firstDecisionAccepted: true });
    expect(forbidden.path).toEqual(['firstDecisionAccepted']);
    expect(forbidden.message).toBe('.firstDecisionAccepted is invalid: must be absent on a pre-shift row.');

    const unknownTransport = caughtDecodeError({ ...postShiftRow('mcp_minimal'), decisionTransport: 'coordinates' });
    expect(unknownTransport.path).toEqual(['decisionTransport']);
    expect(unknownTransport.message).toBe(
      ".decisionTransport is invalid: Invalid discriminator value. Expected 'mcp_minimal' | 'final_indices'.",
    );

    for (const value of [null, undefined, 0, true, 'row', []]) {
      const error = caughtDecodeError(value);
      expect(error.path).toEqual([]);
      expect(error.message).toBe(' is invalid: expected an object.');
      expect(error.sourceSuffix).toBe(' is invalid: expected an object.');
    }
  });

  it('closes the transport/index relation', () => {
    const mcpIndices = caughtDecodeError({
      ...postShiftRow('mcp_minimal'),
      chosenOptionIndices: [],
    });
    expect(mcpIndices.path).toEqual(['chosenOptionIndices']);
    expect(mcpIndices.sourceSuffix)
      .toBe('.chosenOptionIndices is invalid: must be absent when decisionTransport is mcp_minimal.');

    const final = postShiftRow('final_indices');
    const { chosenOptionIndices: _chosenOptionIndices, ...missingIndices } = final;
    const finalMissing = caughtDecodeError(missingIndices);
    expect(finalMissing.path).toEqual(['chosenOptionIndices']);
    expect(finalMissing.sourceSuffix).toContain('.chosenOptionIndices is invalid:');
  });

  it('enforces provenance/image relations with source-free errors', () => {
    const missingSkill = caughtDecodeError({
      ...postShiftRow('mcp_minimal'),
      instructionSource: 'skill',
      skillName: 'dm-round',
      skillHash: null,
      boardImage: { mode: 'off' },
    });
    expect(missingSkill.path).toEqual(['skillName', 'skillHash']);
    expect(missingSkill.message).toBe(' skill instruction source requires skillName and skillHash.');

    const imageWithoutFeedback = caughtDecodeError({
      ...preShiftRow(),
      boardImage: { mode: 'off' },
    });
    expect(imageWithoutFeedback.path).toEqual(['boardImage', 'uiFeedback']);
    expect(imageWithoutFeedback.message).toBe(' must carry boardImage and uiFeedback together.');

    const captureWithFeedback = caughtDecodeError({
      ...preShiftRow(),
      boardImage: {
        mode: 'capture_only', sha256: 'a'.repeat(64), bytes: 24, width: 1, height: 1,
        captureMs: 0, relativePath: `board-images/${'a'.repeat(64)}.png`,
      },
      uiFeedback: {
        readability: 3, what_helped: [], what_confused: [], missing: [], suggestion: 'None.',
      },
    });
    expect(captureWithFeedback.path).toEqual(['uiFeedback']);
    expect(captureWithFeedback.message).toBe(' cannot carry UI feedback without a PNG board image.');

    const wrongPath = caughtDecodeError({
      ...preShiftRow(),
      boardImage: {
        mode: 'png', sha256: 'a'.repeat(64), bytes: 24, width: 1, height: 1,
        captureMs: 0, relativePath: `board-images/${'b'.repeat(64)}.png`,
      },
      uiFeedback: null,
    });
    expect(wrongPath.path).toEqual(['boardImage', 'relativePath']);
    expect(wrongPath.message).toBe('.boardImage path must match its SHA-256.');
  });

  it('retains passthrough fields without consumer imports', () => {
    const decoded = decodeArenaRow({
      ...postShiftRow('mcp_minimal'),
      futureRootField: { retained: true },
      authorizedPlan: [{
        actorId: 'monster:ogre',
        futurePlanField: 'retained',
        acceptedIntent: { choice: { kind: 'dodge', futureChoiceField: 7 } },
      }],
    });
    expect(decoded.row).toMatchObject({ futureRootField: { retained: true } });
    expect(decoded.row.authorizedPlan?.[0]).toMatchObject({
      futurePlanField: 'retained',
      acceptedIntent: { choice: { futureChoiceField: 7 } },
    });
  });

  it('tags baseline-valid current-invalid summaries as baseline', () => {
    const decoded = decodeArenaRow({
      ...postShiftRow('mcp_minimal'),
      authorizedPlan: [{
        actorId: 'monster:ogre',
        acceptedIntent: { choice: { kind: 'attack' } },
        resolutionSummary: {
          actionId: 'greatclub',
          targetId: 'pc:fighter',
          movementFeet: 5,
          actionSlots: [42],
        },
      }],
    });
    expect(decoded.planSummaries).toEqual([{
      kind: 'baseline',
      summary: {
        actionId: 'greatclub', targetId: 'pc:fighter', movementFeet: 5,
        actionSlots: [42],
      },
    }]);
  });

  it('tags both-valid summaries as current by schema order', () => {
    const decoded = decodeArenaRow({
      ...postShiftRow('mcp_minimal'),
      authorizedPlan: [{
        actorId: 'monster:ogre',
        acceptedIntent: { choice: { kind: 'attack' } },
        resolutionSummary: {
          actionSlots: [{ kind: 'attack', actionId: 'greatclub', targetIds: ['pc:fighter'] }],
          actionId: 'baseline-action',
          targetId: 'baseline-target',
        },
      }],
    });
    expect(decoded.planSummaries).toEqual([{
      kind: 'current',
      summary: {
        actionSlots: [{ kind: 'attack', actionId: 'greatclub', targetIds: ['pc:fighter'] }],
        actionId: 'baseline-action',
        targetId: 'baseline-target',
      },
    }]);
  });
});
