import { readFileSync } from 'node:fs';

const ROUND_ONE_REQUEST_ID = 'request:room-1-round-1';
const DM_RENDERED_TOOL_SUFFIXES = Object.freeze([
  'engine_get_turn_context',
  'engine_propose_from_play',
  'engine_validate_intent',
  'engine_submit_round_intents',
  'engine_request_dm_adjudication',
] as const);

type CategoryName = 'preamble' | 'AGENTS.md' | 'tool schemas' | 'turn context' | 'KB' | 'history';
interface RolloutEntry {
  readonly type?: unknown;
  readonly payload?: unknown;
}
interface CategoryMeasurement {
  readonly category: CategoryName;
  readonly bytes: number;
  readonly allocatedTokens: number;
  readonly percent: number;
}
export interface RoundInputAttribution {
  readonly requestId: typeof ROUND_ONE_REQUEST_ID;
  readonly measuredInputTokens: number;
  readonly renderedEngineToolCount: number;
  readonly categories: readonly CategoryMeasurement[];
  readonly attributedBytes: number;
  readonly tokenMethod: 'proportional allocation of rollout-measured input tokens by UTF-8 bytes';
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function textContent(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    const item = record(candidate);
    return item !== null && typeof item['text'] === 'string' ? [item['text']] : [];
  });
}

function parseRollout(source: string): readonly RolloutEntry[] {
  return source.split('\n').flatMap((line, index): readonly RolloutEntry[] => {
    if (line.trim().length === 0) return [];
    let decoded: unknown;
    try { decoded = JSON.parse(line) as unknown; }
    catch (error) { throw new SyntaxError(`Invalid rollout JSON on line ${String(index + 1)}.`, { cause: error }); }
    const entry = record(decoded);
    if (entry === null) throw new TypeError(`Rollout line ${String(index + 1)} is not an object.`);
    return [entry];
  });
}

function outputText(payload: Readonly<Record<string, unknown>>): string {
  if (typeof payload['output'] !== 'string') return '';
  let decoded: unknown;
  try { decoded = JSON.parse(payload['output']) as unknown; }
  catch { return payload['output']; }
  return textContent(decoded).join('');
}

function renderedToolCandidates(text: string): readonly Readonly<Record<string, unknown>>[] {
  const candidates: Readonly<Record<string, unknown>>[] = [];
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) continue;
    let decoded: unknown;
    try { decoded = JSON.parse(trimmed) as unknown; } catch { continue; }
    const values = Array.isArray(decoded) ? decoded : [decoded];
    for (const value of values) {
      const candidate = record(value);
      if (candidate !== null && typeof candidate['name'] === 'string' && typeof candidate['description'] === 'string') {
        candidates.push(candidate);
      }
    }
  }
  return candidates;
}

function renderedEngineTools(entries: readonly RolloutEntry[], before: number): readonly Readonly<Record<string, unknown>>[] {
  const byName = new Map<string, Readonly<Record<string, unknown>>>();
  for (const entry of entries.slice(0, before)) {
    const payload = record(entry.payload);
    if (entry.type !== 'response_item' || payload?.['type'] !== 'custom_tool_call_output') continue;
    for (const tool of renderedToolCandidates(outputText(payload))) {
      const name = String(tool['name']);
      if (name.startsWith('mcp__engine__')) byName.set(name, tool);
    }
  }
  const selected = [...byName.values()].filter((tool) =>
    DM_RENDERED_TOOL_SUFFIXES.some((suffix) => String(tool['name']).endsWith(suffix)));
  const missing = DM_RENDERED_TOOL_SUFFIXES.filter((suffix) =>
    !selected.some((tool) => String(tool['name']).endsWith(suffix)));
  if (missing.length > 0) {
    throw new Error(`Rollout does not contain rendered schema evidence for DM tools: ${missing.join(', ')}. Capture ALL_TOOLS.filter(({ name }) => name.startsWith('mcp__engine__')) in the smoke session before attribution.`);
  }
  return selected;
}

function responseText(payload: Readonly<Record<string, unknown>>): string {
  return textContent(payload['content']).join('');
}

function measuredTokens(entries: readonly RolloutEntry[], after: number): number {
  for (const entry of entries.slice(after + 1)) {
    const payload = record(entry.payload);
    if (entry.type !== 'event_msg' || payload?.['type'] !== 'token_count') continue;
    const info = record(payload['info']);
    const last = record(info?.['last_token_usage']);
    const value = last?.['input_tokens'];
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  }
  throw new Error('Rollout has no measured input token count after the round-1 turn context.');
}

function utf8Bytes(parts: readonly string[]): number {
  const encoder = new TextEncoder();
  return parts.reduce((total, part) => total + encoder.encode(part).byteLength, 0);
}

export function attributeRoundInput(source: string): RoundInputAttribution {
  const entries = parseRollout(source);
  const preamble = entries.flatMap((entry) => {
    if (entry.type !== 'session_meta') return [];
    const base = record(record(entry.payload)?.['base_instructions']);
    return typeof base?.['text'] === 'string' ? [base['text']] : [];
  });
  const roundPromptIndex = entries.findIndex((entry) => {
    const payload = record(entry.payload);
    return entry.type === 'response_item' && payload?.['type'] === 'message' && payload['role'] === 'user' &&
      responseText(payload).includes(ROUND_ONE_REQUEST_ID);
  });
  if (roundPromptIndex < 0) throw new Error(`Rollout has no ${ROUND_ONE_REQUEST_ID} prompt.`);
  const contextIndex = entries.findIndex((entry, index) => {
    const payload = record(entry.payload);
    if (index <= roundPromptIndex || entry.type !== 'response_item' || payload?.['type'] !== 'custom_tool_call_output') return false;
    const text = outputText(payload);
    return text.includes(ROUND_ONE_REQUEST_ID) && text.includes('structuredContent') && text.includes('state_ref');
  });
  if (contextIndex < 0) throw new Error(`Rollout has no successful ${ROUND_ONE_REQUEST_ID} turn-context result.`);
  const tools = renderedEngineTools(entries, contextIndex);
  const inputTokens = measuredTokens(entries, contextIndex);
  const agents: string[] = [];
  const kb: string[] = [];
  const history: string[] = [];
  const turnContext: string[] = [];
  let firstDeveloperCaptured = false;
  for (const [index, entry] of entries.slice(0, contextIndex + 1).entries()) {
    const payload = record(entry.payload);
    if (entry.type !== 'response_item' || payload === null) continue;
    if (index === contextIndex) {
      turnContext.push(typeof payload['output'] === 'string' ? payload['output'] : JSON.stringify(payload));
      continue;
    }
    if (payload['type'] === 'message') {
      const role = payload['role'];
      const content = textContent(payload['content']);
      if (role === 'developer' && !firstDeveloperCaptured) {
        kb.push(...content);
        firstDeveloperCaptured = true;
        continue;
      }
      for (const part of content) {
        if (part.startsWith('# AGENTS.md instructions for ')) agents.push(part);
        else history.push(part);
      }
      continue;
    }
    history.push(JSON.stringify(payload));
  }
  if (agents.length === 0) {
    for (const entry of entries.slice(0, contextIndex + 1)) {
      if (entry.type !== 'world_state') continue;
      const agentsState = record(record(record(entry.payload)?.['state'])?.['agents_md']);
      if (typeof agentsState?.['text'] === 'string') agents.push(agentsState['text']);
    }
  }
  const parts: Readonly<Record<CategoryName, readonly string[]>> = {
    preamble,
    'AGENTS.md': agents,
    'tool schemas': tools.map((tool) => JSON.stringify(tool)),
    'turn context': turnContext,
    KB: kb,
    history,
  };
  const byteCounts = Object.entries(parts).map(([category, values]) => ({
    category: category as CategoryName,
    bytes: utf8Bytes(values),
  }));
  const attributedBytes = byteCounts.reduce((sum, entry) => sum + entry.bytes, 0);
  if (attributedBytes === 0) throw new Error('Rollout attribution found no request bytes.');
  let allocated = 0;
  const categories = byteCounts.map((entry, index): CategoryMeasurement => {
    const tokens = index === byteCounts.length - 1
      ? inputTokens - allocated
      : Math.round(inputTokens * entry.bytes / attributedBytes);
    allocated += tokens;
    return {
      ...entry,
      allocatedTokens: tokens,
      percent: Number((entry.bytes * 100 / attributedBytes).toFixed(2)),
    };
  });
  return {
    requestId: ROUND_ONE_REQUEST_ID,
    measuredInputTokens: inputTokens,
    renderedEngineToolCount: tools.length,
    categories,
    attributedBytes,
    tokenMethod: 'proportional allocation of rollout-measured input tokens by UTF-8 bytes',
  };
}

export function formatRoundInputAttribution(report: RoundInputAttribution): string {
  const rows = report.categories.map((entry) =>
    `${entry.category.padEnd(14)} ${String(entry.bytes).padStart(9)} B  ${String(entry.allocatedTokens).padStart(8)} tokens  ${entry.percent.toFixed(2).padStart(6)}%`);
  return [
    `ROUND_INPUT_ATTRIBUTION ${report.requestId}`,
    `measured_input_tokens=${String(report.measuredInputTokens)} attributed_bytes=${String(report.attributedBytes)} rendered_engine_tools=${String(report.renderedEngineToolCount)}`,
    ...rows,
    `token_method=${report.tokenMethod}`,
  ].join('\n');
}

function main(): void {
  const scriptIndex = process.argv.findIndex((argument) => argument.endsWith('/attribute-round-input.ts') || argument.endsWith('\\attribute-round-input.ts'));
  const argv = (scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1)).filter((argument) => argument !== '--');
  const json = argv.includes('--json');
  const paths = argv.filter((argument) => argument !== '--json');
  if (paths.length !== 1) throw new TypeError('Usage: npm run attribute:round-input -- <rollout.jsonl> [--json]');
  const report = attributeRoundInput(readFileSync(paths[0]!, 'utf8'));
  process.stdout.write(`${json ? JSON.stringify(report, null, 2) : formatRoundInputAttribution(report)}\n`);
}

if (process.env['VITEST'] !== 'true') main();
