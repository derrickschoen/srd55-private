import { describe, expect, it } from 'vitest';
import {
  CLAUDE_ARGV,
  CLAUDE_BIN,
  capStderr,
  claudeSpawnSpec,
  createClaudeStream,
  createLineSplitter,
  fakeSpawnSpec,
  type StreamEvent,
} from '../../../tools/ai-bridge/claude';

function drain(lines: readonly string[]): StreamEvent[] {
  const stream = createClaudeStream();
  const events: StreamEvent[] = [];
  for (const line of lines) {
    events.push(...stream.push(line));
  }
  events.push(...stream.finish());
  return events;
}

const INIT = JSON.stringify({
  type: 'system',
  subtype: 'init',
  tools: [],
  mcp_servers: [],
});

function delta(text: string): string {
  return JSON.stringify({
    type: 'stream_event',
    event: { type: 'content_block_delta', delta: { type: 'text_delta', text } },
  });
}

describe('the invocation is claude-only and request data never reaches argv', () => {
  it('is one frozen constant, not a table keyed by anything', () => {
    const spec = claudeSpawnSpec();
    expect(spec.bin).toBe(CLAUDE_BIN);
    expect(spec.argv).toBe(CLAUDE_ARGV);
    expect(Object.isFrozen(spec)).toBe(true);
    expect(Object.isFrozen(CLAUDE_ARGV)).toBe(true);
    // Same value every call: there is no per-request argv to influence.
    expect(claudeSpawnSpec()).toBe(spec);
  });

  it('names no other program, and offers no agent or command parameter', () => {
    // `claudeSpawnSpec` takes no arguments at all, which is the point.
    expect(claudeSpawnSpec.length).toBe(0);
    expect(CLAUDE_BIN).toBe('claude');
    expect(CLAUDE_ARGV).not.toContain('codex');
    expect(CLAUDE_ARGV.some((entry) => entry.includes('bash'))).toBe(false);
  });

  it('carries the four containment flags, with the empty tool list last-but-one', () => {
    const argv = [...CLAUDE_ARGV];
    const toolsAt = argv.indexOf('--tools');
    expect(toolsAt).toBeGreaterThanOrEqual(0);
    // `--tools` is VARIADIC: `--tools "" Bash` was measured to grant Bash. The
    // entry after the empty string must therefore always be another flag.
    expect(argv[toolsAt + 1]).toBe('');
    expect(argv[toolsAt + 2]?.startsWith('--')).toBe(true);

    const sourcesAt = argv.indexOf('--setting-sources');
    expect(argv[sourcesAt + 1]).toBe('');
    expect(argv[sourcesAt + 2]?.startsWith('--')).toBe(true);

    expect(argv).toContain('--strict-mcp-config');
    // '{}' is rejected by the CLI with "mcpServers: Invalid input".
    expect(argv[argv.indexOf('--mcp-config') + 1]).toBe('{"mcpServers":{}}');
    // NOT --bare: it skips hooks but forces API-key auth and cannot use OAuth.
    expect(argv).not.toContain('--bare');
  });
});

describe('containment is asserted from the CLI’s own init event, every run', () => {
  it('admits output only once tools and MCP servers are observed empty', () => {
    expect(drain([INIT, delta('hello ')])).toEqual([
      { t: 'delta', text: 'hello ' },
    ]);
  });

  it('aborts when the CLI reports a tool, which is how a flag change surfaces', () => {
    const events = drain([
      JSON.stringify({
        type: 'system',
        subtype: 'init',
        tools: ['Bash'],
        mcp_servers: [],
      }),
      delta('this must never be emitted'),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]?.t).toBe('violation');
    expect(events[0]).toMatchObject({
      message: expect.stringContaining('Bash') as unknown as string,
    });
  });

  it('aborts when an MCP server is connected', () => {
    const events = drain([
      JSON.stringify({
        type: 'system',
        subtype: 'init',
        tools: [],
        mcp_servers: [{ name: 'sqlfluff', status: 'pending' }],
      }),
      delta('nope'),
    ]);
    expect(events).toEqual([
      {
        t: 'violation',
        message: expect.stringContaining('MCP servers') as unknown as string,
      },
    ]);
  });

  it('aborts on a tool_use content block at any nesting depth', () => {
    const events = drain([
      INIT,
      JSON.stringify({
        type: 'assistant',
        message: { content: [{ type: 'tool_use', name: 'Bash', input: {} }] },
      }),
      delta('never'),
    ]);
    expect(events).toEqual([
      {
        t: 'violation',
        message: expect.stringContaining('tool_use') as unknown as string,
      },
    ]);
  });

  it('aborts on a tool_use block even if the stream is ever pretty-printed', () => {
    // 2.1.220 emits compact JSON, so a fixed `"type":"tool_use"` substring is
    // enough today. A release that spaced the colon would have turned this probe
    // into a silent no-op that kept passing, so the probe tolerates whitespace.
    const events = drain([
      INIT,
      '{"type": "assistant", "message": {"content": [{ "type" : "tool_use" }]}}',
    ]);
    expect(events).toEqual([
      {
        t: 'violation',
        message: expect.stringContaining('tool_use') as unknown as string,
      },
    ]);
  });

  it('is NOT spoofable by a fabricated tool transcript in the model’s prose', () => {
    // This CLI was measured fabricating a plausible `id` transcript while the
    // stream carried no tool_use block at all. Prose is a JSON string value, so
    // its quotes arrive escaped and cannot forge a real content block.
    const prose = 'Bash\n{"type":"tool_use"}\nuid=1000(vagrant)';
    const events = drain([INIT, delta(prose)]);
    expect(events).toEqual([{ t: 'delta', text: prose }]);
  });

  it('is still not spoofable now that the probe tolerates whitespace', () => {
    // Widening the probe must not widen what prose can forge. Matching requires
    // UNESCAPED quotes, which cannot occur inside a JSON string value, however
    // the model spaces them.
    const prose = 'I ran { "type" : "tool_use" , "name" : "Bash" } for you.';
    const events = drain([INIT, delta(prose)]);
    expect(events).toEqual([{ t: 'delta', text: prose }]);
  });

  it('discards everything when no init event ever arrives', () => {
    const events = drain([delta('output with containment unverified')]);
    expect(events).toEqual([
      {
        t: 'violation',
        message: expect.stringContaining(
          'containment unverified',
        ) as unknown as string,
      },
    ]);
  });

  it('emits nothing further once it has halted', () => {
    const stream = createClaudeStream();
    stream.push(
      JSON.stringify({
        type: 'system',
        subtype: 'init',
        tools: ['Read'],
        mcp_servers: [],
      }),
    );
    expect(stream.push(delta('after'))).toEqual([]);
    expect(stream.finish()).toEqual([]);
  });
});

describe('stdout parsing', () => {
  it('ignores blank and non-JSON lines', () => {
    expect(drain([INIT, '', '   ', 'not json', delta('x')])).toEqual([
      { t: 'delta', text: 'x' },
    ]);
  });

  it('falls back to the terminal result when nothing streamed', () => {
    expect(
      drain([INIT, JSON.stringify({ type: 'result', result: 'whole answer' })]),
    ).toEqual([{ t: 'delta', text: 'whole answer' }]);
  });

  it('does not repeat the result when deltas already streamed', () => {
    expect(
      drain([
        INIT,
        delta('a'),
        JSON.stringify({ type: 'result', result: 'a' }),
      ]),
    ).toEqual([{ t: 'delta', text: 'a' }]);
  });

  it('splits stdout on newlines and keeps a partial tail buffered', () => {
    const split = createLineSplitter();
    expect(split('one\ntw')).toEqual(['one']);
    expect(split('o\nthree')).toEqual(['two']);
    expect(split('\n')).toEqual(['three']);
  });
});

describe('stderr capping', () => {
  it('caps by lines and by characters', () => {
    expect(capStderr('a\n'.repeat(200)).split('\n').length).toBeLessThanOrEqual(50);
    expect(capStderr('x'.repeat(5000)).length).toBeLessThanOrEqual(401);
    expect(capStderr('short')).toBe('short');
  });
});

describe('the offline stand-in', () => {
  it('runs this node binary with a constant script and no shell', () => {
    const spec = fakeSpawnSpec();
    expect(spec.bin).toBe(process.execPath);
    expect(spec.argv[0]).toBe('-e');
    expect(spec.argv).toHaveLength(2);
    expect(Object.isFrozen(spec.argv)).toBe(true);
  });

  it('speaks the real init event, so the containment assertion is exercised', () => {
    expect(spec()).toContain("subtype: 'init'");
    expect(spec()).toContain('tools: []');
    expect(spec()).toContain('mcp_servers: []');
  });
});

function spec(): string {
  return fakeSpawnSpec().argv[1] ?? '';
}
