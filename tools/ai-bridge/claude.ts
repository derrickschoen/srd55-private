/**
 * How the DEV-ONLY bridge invokes `claude`, and how it checks — at runtime, on
 * every single run — that the invocation was actually contained.
 *
 * CLAUDE ONLY. There is no agent parameter, no command parameter and no path by
 * which a request can name a program: `CLAUDE_ARGV` is a frozen constant, the
 * binary is a constant, and NOTHING derived from a request ever reaches argv.
 * The prompt travels on stdin. No caller sets a shell.
 *
 * Why argv discipline is a mitigation and not a style preference: `--tools` is
 * variadic, and an empty string is an ENTRY rather than a reset. `--tools "" Bash`
 * was measured to start the CLI with `tools: ['Bash']`. One stray argv token
 * after that flag therefore grants a tool. Keeping request-derived data off argv
 * entirely is what makes that unreachable.
 *
 * Why the flag is not trusted on its own: it is a flag on version 2.1.220, not a
 * sandbox, and a future release could change what it means. So the stream parser
 * ASSERTS containment from the CLI's own `system`/`init` event —
 * `tools: []` and `mcp_servers: []` — and refuses to emit anything if that event
 * never arrives or reports capabilities. Observing zero capabilities on this run
 * is the only version-proof form of the check.
 *
 * And containment is still not the defence against prompt injection. Model
 * output is untrusted TEXT: measured adversarially, this CLI will happily
 * FABRICATE a tool transcript, complete with plausible `id` output, while the
 * stream carries zero `tool_use` blocks and nothing is written to disk. Nothing
 * downstream may treat its output as evidence that anything happened.
 */

export const CLAUDE_BIN = 'claude';
export const AGENT_TIMEOUT_MS = 120_000;

const STDERR_MAX_CHARS = 400;
const STDERR_MAX_LINES = 50;

export interface SpawnSpec {
  readonly bin: string;
  readonly argv: readonly string[];
}

/**
 * Frozen, complete, and never concatenated with anything request-derived.
 *
 *   --tools ""            no built-in tools, and (measured) no MCP tools either
 *   --setting-sources ""  no user/project settings, and therefore no HOOKS —
 *                         hooks run shell commands on lifecycle events
 *                         independently of the tool list, so they are a genuine
 *                         bypass vector. `--bare` also skips hooks but forces
 *                         API-key auth and cannot use this machine's OAuth
 *                         login, so it is deliberately NOT used.
 *   --strict-mcp-config   without it, MCP servers are still listed and connected
 *                         even though their tools are unavailable
 *   --mcp-config {...}    not '{}': that exits 1 with "mcpServers: Invalid input"
 */
export const CLAUDE_ARGV: readonly string[] = Object.freeze([
  '-p',
  '--output-format',
  'stream-json',
  '--verbose',
  '--include-partial-messages',
  '--tools',
  '',
  '--setting-sources',
  '',
  '--strict-mcp-config',
  '--mcp-config',
  '{"mcpServers":{}}',
  '--permission-mode',
  'default',
]);

const CLAUDE_SPEC: SpawnSpec = Object.freeze({
  bin: CLAUDE_BIN,
  argv: CLAUDE_ARGV,
});

export function claudeSpawnSpec(): SpawnSpec {
  return CLAUDE_SPEC;
}

/**
 * Deterministic offline stand-in used by the browser test (`AI_BRIDGE_FAKE=1`).
 * It speaks the real stream-json shape, INCLUDING the init event, so the real
 * containment assertion, line splitter, parser, stream and kill paths are all
 * exercised rather than bypassed. It echoes facts about the stdin it received so
 * a test can prove what actually reached the prompt, and it emits markup so a
 * test can prove the browser renders output as text.
 */
const FAKE_SCRIPT = `
const init = {
  type: 'system',
  subtype: 'init',
  tools: [],
  mcp_servers: [],
  model: 'fake',
};
process.stdout.write(JSON.stringify(init) + '\\n');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const between = (open, close) => {
    const a = input.indexOf(open);
    if (a < 0) return null;
    const b = input.indexOf(close, a + open.length);
    if (b < 0) return null;
    return input.slice(a + open.length, b).trim();
  };
  const question = between('<<<QUESTION>>>', '<<<END QUESTION>>>');
  const deltas = [
    '<b>markup-as-text</b> ',
    'stdin-bytes=' + Buffer.byteLength(input, 'utf8') + ' ',
    'has-reference=' + (input.includes('<<<BUILD REFERENCE>>>') ? 'yes' : 'no') + ' ',
    'question=' + (question === null ? 'none' : question.slice(0, 60)) + ' ',
  ];
  let n = 0;
  const timer = setInterval(() => {
    const text = deltas[n];
    n += 1;
    process.stdout.write(
      JSON.stringify({
        type: 'stream_event',
        event: {
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: text },
        },
      }) + '\\n',
    );
    if (n >= deltas.length) {
      clearInterval(timer);
      process.stdout.write(JSON.stringify({ type: 'result', result: '' }) + '\\n');
      process.exit(0);
    }
  }, 60);
});
`;

export function fakeSpawnSpec(): SpawnSpec {
  return Object.freeze({
    bin: process.execPath,
    argv: Object.freeze(['-e', FAKE_SCRIPT]),
  });
}

export type StreamEvent =
  | { readonly t: 'delta'; readonly text: string }
  | { readonly t: 'violation'; readonly message: string };

export interface ClaudeStream {
  /** Events produced by one complete stdout line. */
  push(line: string): readonly StreamEvent[];
  /** Events to emit once stdout has closed. */
  finish(): readonly StreamEvent[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    return asRecord(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

function textDelta(event: Record<string, unknown>): string | null {
  if (event['type'] !== 'content_block_delta') {
    return null;
  }
  const delta = asRecord(event['delta']);
  if (delta === null || delta['type'] !== 'text_delta') {
    return null;
  }
  const text = delta['text'];
  return typeof text === 'string' && text.length > 0 ? text : null;
}

function emptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0;
}

/**
 * A raw-substring probe for a tool-use content block.
 *
 * It is deliberately applied to the UNPARSED line. A model that writes
 * `"type":"tool_use"` inside its own prose cannot trip it, because prose is a
 * JSON string value and its quotes arrive escaped as `\\"`. So this catches a
 * real content block at any nesting depth without being spoofable by text —
 * which matters precisely because this CLI does fabricate tool transcripts.
 */
const TOOL_USE_MARKER = '"type":"tool_use"';

export function createClaudeStream(): ClaudeStream {
  let initSeen = false;
  let emitted = 0;
  let result = '';
  let halted = false;

  const halt = (message: string): readonly StreamEvent[] => {
    halted = true;
    return [{ t: 'violation', message }];
  };

  return {
    push(line) {
      if (halted) {
        return [];
      }
      const record = parseLine(line);
      if (record === null) {
        return [];
      }
      if (line.includes(TOOL_USE_MARKER)) {
        return halt(
          'containment failed: the CLI emitted a tool_use block, so this ' +
            'invocation was not capability-free. Run aborted.',
        );
      }
      if (record['type'] === 'system' && record['subtype'] === 'init') {
        if (!emptyArray(record['tools'])) {
          return halt(
            'containment failed: the CLI started with tools available ' +
              `(${JSON.stringify(record['tools'])}). Run aborted.`,
          );
        }
        if (!emptyArray(record['mcp_servers'])) {
          return halt(
            'containment failed: the CLI started with MCP servers connected ' +
              `(${JSON.stringify(record['mcp_servers'])}). Run aborted.`,
          );
        }
        initSeen = true;
        return [];
      }
      if (!initSeen) {
        // Content before containment has been observed is not admissible.
        return [];
      }
      if (record['type'] === 'result' && typeof record['result'] === 'string') {
        result = record['result'];
      }
      const event = asRecord(record['event']) ?? record;
      const text = textDelta(event);
      if (text === null) {
        return [];
      }
      emitted += 1;
      return [{ t: 'delta', text }];
    },
    finish() {
      if (halted) {
        return [];
      }
      if (!initSeen) {
        return halt(
          'containment unverified: the CLI produced no init event, so this ' +
            'run could not be confirmed capability-free. Output discarded.',
        );
      }
      // A non-partial run produces only the terminal result object; that lands
      // here rather than being lost.
      return emitted === 0 && result.length > 0
        ? [{ t: 'delta', text: result }]
        : [];
    },
  };
}

export function createLineSplitter(): (chunk: string) => readonly string[] {
  let buffer = '';
  return (chunk) => {
    buffer += chunk;
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    return parts;
  };
}

export function capStderr(text: string): string {
  const lines = text.split('\n').slice(0, STDERR_MAX_LINES).join('\n');
  return lines.length > STDERR_MAX_CHARS
    ? `${lines.slice(0, STDERR_MAX_CHARS)}…`
    : lines;
}
