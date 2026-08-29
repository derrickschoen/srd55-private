import { describe, expect, it } from 'vitest';
import { attributeRoundInput, formatRoundInputAttribution } from '../../../tools/attribute-round-input';

function line(type: string, payload: Readonly<Record<string, unknown>>): string {
  return JSON.stringify({ timestamp: '2026-08-29T12:00:00.000Z', type, payload });
}

function message(role: string, text: string): string {
  return line('response_item', { type: 'message', role, content: [{ type: 'input_text', text }] });
}

function output(text: string): string {
  return line('response_item', {
    type: 'custom_tool_call_output',
    output: JSON.stringify([{ type: 'input_text', text }]),
  });
}

const renderedTools = [
  'engine_get_turn_context',
  'engine_propose_from_play',
  'engine_validate_intent',
  'engine_submit_round_intents',
  'engine_request_dm_adjudication',
].map((name) => ({
  name: `mcp__engine__${name}`,
  description: `Rendered ${name} schema declaration`,
}));

function rollout(): string {
  return [
    line('session_meta', { base_instructions: { text: 'BASE PREAMBLE' } }),
    message('developer', 'KB RULES'),
    message('user', '# AGENTS.md instructions for /workspace\nAGENT RULES'),
    message('user', 'Establish the persistent session.'),
    output(`Script completed\nOutput:\n${JSON.stringify(renderedTools)}`),
    message('user', '<engine-data-json>{"request":{"requestId":"request:room-1-round-1"}}</engine-data-json>'),
    line('response_item', { type: 'custom_tool_call', name: 'exec', input: 'get turn context' }),
    output(JSON.stringify({
      content: [],
      structuredContent: {
        state_ref: { run_id: 'run', state_handle: 'handle', expected_revision: 1 },
        request: { request_id: 'request:room-1-round-1' },
      },
      isError: false,
    })),
    line('event_msg', {
      type: 'token_count',
      info: { last_token_usage: { input_tokens: 1_000 } },
    }),
  ].join('\n');
}

describe('round-input attribution harness', () => {
  it('attributes a recorded round-1 request without invoking a live CLI', () => {
    const report = attributeRoundInput(rollout());
    expect(report).toMatchObject({
      requestId: 'request:room-1-round-1',
      measuredInputTokens: 1_000,
      renderedEngineToolCount: 5,
    });
    expect(report.categories.map((category) => category.category)).toEqual([
      'preamble', 'AGENTS.md', 'tool schemas', 'turn context', 'KB', 'history',
    ]);
    expect(report.categories.reduce((sum, category) => sum + category.allocatedTokens, 0)).toBe(1_000);
    expect(report.categories.every((category) => category.bytes > 0)).toBe(true);
    expect(formatRoundInputAttribution(report)).toContain('rendered_engine_tools=5');
  });

  it('refuses to invent missing rendered tool-schema evidence', () => {
    const withoutInventory = rollout().split('\n').filter((entry) => !entry.includes('Rendered engine_')).join('\n');
    expect(() => attributeRoundInput(withoutInventory)).toThrow(/does not contain rendered schema evidence/u);
  });
});
