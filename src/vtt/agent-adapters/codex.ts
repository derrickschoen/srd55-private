import { open, readFile, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { agentSessionIdFromCli, contextTokenCount, engineDispatchId, turnInputTotal } from '../agent-session';
import type {
  AgentInvocation,
  AgentSessionBinding,
  AgentTurnResult,
  AgentUsage,
  ContextTokenCount,
  TurnInputTotal,
} from '../agent-session';
import {
  classifyEngineCatalogEvidence,
  decodeEngineReadinessRecord,
  type EngineObservedEvent,
  type EngineReadinessRecord,
} from './engine-catalog-evidence';
import {
  AgentAdapterError,
  agentProcessEvidence,
  completedOutput,
  jsonEventLines,
  ProcessAgentSessionAdapter,
  record,
  type AgentAdapterOptions,
  type AgentProcessOutput,
  type AgentProcessSpec,
} from './process';

export const UNVERIFIED_CONTRACT_CODEX = 'UNVERIFIED_CONTRACT:codex-live-mcp-and-resume' as const;

export interface CodexDecodedTurn {
  readonly sessionId: string;
  readonly finalText: string;
  readonly turnUsage: CodexTurnUsage | null;
}

export interface CodexTurnUsage {
  readonly turnInputTotal: TurnInputTotal;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly reasoningTokens: number;
}

export interface CodexContextUsage {
  readonly contextInputTokens: ContextTokenCount;
  readonly modelContextWindow: ContextTokenCount;
}

const ROLLOUT_TAIL_CHUNK_BYTES = 64 * 1024;
const ROLLOUT_TAIL_MAX_BYTES = 1024 * 1024;

/**
 * Probe today plus three prior UTC days: enough to retain a session across a
 * short midnight boundary without turning per-call context lookup into an
 * unbounded filesystem scan.
 */
export const CODEX_ROLLOUT_PREVIOUS_DAYS: 3 = 3;

export type CodexRolloutClock = () => Date;

const systemCodexRolloutClock: CodexRolloutClock = () => new Date();

export interface CodexRolloutDirectoryEntry {
  readonly name: string;
  isFile(): boolean;
}

export type CodexRolloutDirectoryReader = (
  directory: string,
) => Promise<readonly CodexRolloutDirectoryEntry[]>;

export interface CodexAgentAdapterOptions extends AgentAdapterOptions {
  readonly rolloutClock?: CodexRolloutClock;
}

export class CodexRolloutContextReader {
  readonly #rolloutPathBySessionBinding = new Map<string, Promise<string>>();

  constructor(
    private readonly codexHome: string,
    private readonly readDirectory: CodexRolloutDirectoryReader = async (directory) =>
      readdir(directory, { withFileTypes: true }),
    private readonly clock: CodexRolloutClock = systemCodexRolloutClock,
  ) {}

  async read(sessionId: string): Promise<CodexContextUsage> {
    let path = this.#rolloutPathBySessionBinding.get(sessionId);
    if (path === undefined) {
      path = this.#resolveRolloutPath(sessionId);
      this.#rolloutPathBySessionBinding.set(sessionId, path);
    }
    return readLastCodexContextUsage(await path, sessionId);
  }

  async #resolveRolloutPath(sessionId: string): Promise<string> {
    const today = this.clock();
    const matches: string[] = [];
    for (let previousDays = 0; previousDays <= CODEX_ROLLOUT_PREVIOUS_DAYS; previousDays += 1) {
      const directory = codexRolloutDirectory(this.codexHome, today, previousDays);
      let entries: readonly CodexRolloutDirectoryEntry[];
      try {
        entries = await this.readDirectory(directory);
      } catch (error) {
        if (isMissingDirectory(error)) continue;
        throw new AgentAdapterError(
          'malformed_output',
          `Codex rollout directory could not be read for session ${sessionId}.`,
          { cause: error },
        );
      }
      matches.push(...entries
        .filter((entry) => entry.isFile() && entry.name.includes(sessionId))
        .map((entry) => resolve(directory, entry.name)));
    }
    if (matches.length === 0) {
      throw new AgentAdapterError(
        'malformed_output',
        `Codex rollout was not found for completed session ${sessionId}.`,
      );
    }
    const candidates = await Promise.all(matches.map(async (candidate) => ({
      path: candidate,
      modified: (await stat(candidate)).mtimeMs,
    })));
    candidates.sort((left, right) => right.modified - left.modified || left.path.localeCompare(right.path));
    const selected = candidates[0];
    if (selected === undefined) throw new Error('Codex rollout match vanished before reading.');
    return selected.path;
  }
}

export class CodexAgentSessionAdapter extends ProcessAgentSessionAdapter {
  readonly kind = 'codex' as const;
  protected readonly defaultBinary = 'codex';
  readonly #contextReader: CodexRolloutContextReader;
  readonly #codexHome: string;

  constructor(options: CodexAgentAdapterOptions = {}) {
    super(options);
    this.#codexHome = options.codexHome ?? process.env['CODEX_HOME'] ?? resolve(homedir(), '.codex');
    this.#contextReader = new CodexRolloutContextReader(
      this.#codexHome,
      undefined,
      options.rolloutClock,
    );
  }

  start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult> {
    return this.invoke(invocation, null, signal);
  }

  resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    return this.invoke(invocation, binding.sessionId, signal);
  }

  invocationSpec(invocation: AgentInvocation, sessionId: string | null): AgentProcessSpec {
    const structuredFinal = invocation.output.kind === 'structured_final';
    return this.spec(codexArgv({
      cwd: this.options.cwd ?? process.cwd(),
      model: invocation.model,
      reasoningEffort: invocation.reasoningEffort,
      engineCommand: structuredFinal ? null : this.engineCommand(),
      engineArgs: structuredFinal ? [] : this.engineArgs(invocation.launcherToken),
      outputSchemaPath: structuredFinal ? invocation.output.schemaPath : null,
      instructions: invocation.instructions ?? null,
      arenaSession: invocation.sessionProfile === 'arena',
      instructionSource: invocation.instructionSource,
      sessionId,
    }), { CODEX_HOME: this.#codexHome });
  }

  private async invoke(
    invocation: AgentInvocation,
    sessionId: string | null,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    const output = await this.runner().run(
      this.invocationSpec(invocation, sessionId),
      invocation.prompt,
      signal,
      invocation.timeoutMs,
    );
    const decodedEvents = decodeLiveProcessEvents(output.stdoutLines);
    const processEvidence = agentProcessEvidence(output, decodedEvents.map((event) => ({
      invocationId: event.invocationId,
      kind: event.kind,
      observedAtUnixMs: event.observedAtUnixMs ?? output.endedAtUnixMs,
    })));
    const catalog = invocation.output.kind === 'structured_final'
      ? null
      : await codexCatalogEvidence(invocation.launcherToken, decodedEvents, output);
    const partial = decodeCodexPartial(output.stdout, sessionId, stderrSessionId(output.stderr));
    const observedResumeSessionId = partial.sessionId === null
      ? null
      : agentSessionIdFromCli(partial.sessionId);
    const observedUsage = partial.turnUsage === null || partial.sessionId === null
      ? null
      : await this.#partialUsage(partial.turnUsage, partial.sessionId);
    if (output.timedOut) {
      return {
        exit: 'timed_out', resumeSessionId: observedResumeSessionId, sessionId: partial.sessionId,
        finalText: partial.finalText, usage: observedUsage, processEvidence,
        partialResultEvidence: {
          status: 'partial', decodedEventCount: decodedEvents.length,
          finalTextFragment: partial.finalText, observedUsage,
          stagedInvocationIds: stagedInvocationIds(decodedEvents),
        },
        engineCatalogEvidence: catalog,
        timeoutMs: invocation.timeoutMs ?? Math.max(1, output.endedAtUnixMs - output.startedAtUnixMs),
      };
    }
    if (output.cancelled) {
      return {
        exit: 'cancelled', resumeSessionId: observedResumeSessionId, sessionId: partial.sessionId,
        finalText: partial.finalText, usage: observedUsage, processEvidence,
        partialResultEvidence: {
          status: 'partial', decodedEventCount: decodedEvents.length,
          finalTextFragment: partial.finalText, observedUsage,
          stagedInvocationIds: stagedInvocationIds(decodedEvents),
        },
        engineCatalogEvidence: catalog,
        cancellationReason: signal.reason === undefined ? 'abort_signal' : String(signal.reason),
      };
    }
    if (output.exitCode !== 0 && requiredEngineStartupFailed(output)) {
      if (catalog?.status === 'inconclusive') {
        const forensicTurn: AgentTurnResult = {
          exit: 'infrastructure_failed', resumeSessionId: observedResumeSessionId,
          sessionId: partial.sessionId, finalText: partial.finalText, usage: observedUsage, processEvidence,
          partialResultEvidence: {
            status: 'partial', decodedEventCount: decodedEvents.length,
            finalTextFragment: partial.finalText, observedUsage,
            stagedInvocationIds: stagedInvocationIds(decodedEvents),
          },
          engineCatalogEvidence: catalog,
          component: 'engine_mcp_startup',
          failureReason: output.stderr.length === 0 ? 'Required engine MCP initialization failed.' : output.stderr,
        };
        return forensicTurn;
      }
      if (catalog?.status !== 'absent') completedOutput(output, sessionId !== null);
      return {
        exit: 'infrastructure_failed', resumeSessionId: observedResumeSessionId,
        sessionId: partial.sessionId, finalText: partial.finalText, usage: observedUsage, processEvidence,
        partialResultEvidence: {
          status: 'partial', decodedEventCount: decodedEvents.length,
          finalTextFragment: partial.finalText, observedUsage,
          stagedInvocationIds: stagedInvocationIds(decodedEvents),
        },
        engineCatalogEvidence: catalog,
        component: 'engine_mcp_startup',
        failureReason: output.stderr.length === 0 ? 'Required engine MCP initialization failed.' : output.stderr,
      };
    }
    completedOutput(output, sessionId !== null);
    const announcedSessionId = stderrSessionId(output.stderr);
    const decoded = decodeCodexTurn(
      output.stdout,
      sessionId,
      (event) => this.observe(event),
      announcedSessionId,
    );
    const usage = decoded.turnUsage === null
      ? null
      : await codexAgentUsage(
          decoded.turnUsage,
          await this.#contextReader.read(decoded.sessionId),
        );
    return {
      resumeSessionId: agentSessionIdFromCli(decoded.sessionId),
      sessionId: decoded.sessionId,
      finalText: decoded.finalText,
      usage,
      exit: 'completed',
      processEvidence,
      partialResultEvidence: { status: 'complete', decodedEventCount: decodedEvents.length },
      engineCatalogEvidence: catalog,
    };
  }

  async #partialUsage(turnUsage: CodexTurnUsage, sessionId: string): Promise<AgentUsage | null> {
    try {
      return await codexAgentUsage(turnUsage, await this.#contextReader.read(sessionId));
    } catch {
      return null;
    }
  }
}

export interface CodexArgvInput {
  readonly cwd: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly engineCommand: string | null;
  readonly engineArgs: readonly string[];
  readonly outputSchemaPath?: string | null;
  readonly instructions?: string | null;
  readonly arenaSession?: boolean;
  readonly instructionSource?: AgentInvocation['instructionSource'];
  readonly sessionId: string | null;
}

export function codexArgv(input: CodexArgvInput): readonly string[] {
  return [
    'exec',
    '-C', input.cwd,
    '--sandbox', 'read-only',
    '--json',
    '-m', input.model,
    ...(input.outputSchemaPath === null || input.outputSchemaPath === undefined
      ? [] : ['--output-schema', input.outputSchemaPath]),
    '-c', `model_reasoning_effort=${JSON.stringify(input.reasoningEffort)}`,
    ...(input.arenaSession === true ? [
      '-c', 'project_doc_max_bytes=0',
      '-c', 'features.plugins=false',
      '-c', `skills.include_instructions=${input.instructionSource === 'skill' ? 'true' : 'false'}`,
    ] : []),
    ...(input.engineCommand === null ? [] : [
      '-c', `mcp_servers.engine.command=${JSON.stringify(input.engineCommand)}`,
      '-c', `mcp_servers.engine.args=${JSON.stringify(input.engineArgs)}`,
      '-c', 'mcp_servers.engine.required=true',
      '-c', 'mcp_servers.engine.startup_timeout_sec=60',
      '-c', 'mcp_servers.engine.tool_timeout_sec=60',
    ]),
    ...(input.sessionId === null && input.instructions !== null && input.instructions !== undefined
      ? ['-c', `developer_instructions=${JSON.stringify(input.instructions)}`]
      : []),
    ...(input.sessionId === null ? [] : ['resume', input.sessionId]),
    '-',
  ];
}

export function decodeCodexTurn(
  stdout: string,
  priorSessionId: string | null,
  onEvent: (event: Readonly<Record<string, unknown>>) => void = () => undefined,
  announcedSessionId: string | null = null,
): CodexDecodedTurn {
  let sessionId = priorSessionId ?? announcedSessionId;
  let finalText = '';
  let turnUsage: CodexTurnUsage | null = null;
  for (const line of stdout.split('\n')) {
    if (line.trim().length === 0) continue;
    const announced = /^session id:\s*(\S+)$/iu.exec(line.trim());
    if (announced !== null) {
      sessionId = announced[1] ?? null;
      continue;
    }
    const [event] = jsonEventLines(line);
    if (event === undefined) continue;
    onEvent(event);
    if (event['type'] === 'thread.started' && typeof event['thread_id'] === 'string') {
      sessionId = event['thread_id'];
    }
    if (event['type'] === 'item.completed') {
      const item = record(event['item']);
      if (item?.['type'] === 'agent_message' && typeof item['text'] === 'string') {
        finalText = item['text'];
      }
    }
    if (event['type'] === 'turn.completed') {
      const candidate = record(event['usage']);
      if (candidate !== null) turnUsage = decodeTurnUsage(candidate);
    }
  }
  if (sessionId === null || sessionId.trim().length === 0) {
    throw new AgentAdapterError('malformed_output', 'Codex output did not contain a session ID.');
  }
  if (priorSessionId !== null && sessionId !== priorSessionId) {
    throw new AgentAdapterError('resume_not_found', 'Codex resume returned a different thread ID.');
  }
  return { sessionId, finalText, turnUsage };
}

function decodeCodexPartial(
  stdout: string,
  priorSessionId: string | null,
  announcedSessionId: string | null,
): { readonly sessionId: string | null; readonly finalText: string; readonly turnUsage: CodexTurnUsage | null } {
  let sessionId = priorSessionId ?? announcedSessionId;
  let finalText = '';
  let turnUsage: CodexTurnUsage | null = null;
  for (const line of stdout.split('\n')) {
    if (line.trim().length === 0) continue;
    const announced = /^session id:\s*(\S+)$/iu.exec(line.trim());
    if (announced !== null) {
      sessionId = announced[1] ?? sessionId;
      continue;
    }
    let event: Readonly<Record<string, unknown>> | null = null;
    try { event = record(JSON.parse(line) as unknown); } catch { continue; }
    if (event?.['type'] === 'thread.started' && typeof event['thread_id'] === 'string') {
      sessionId = event['thread_id'];
    }
    if (event?.['type'] === 'item.completed') {
      const item = record(event['item']);
      if (item?.['type'] === 'agent_message' && typeof item['text'] === 'string') finalText = item['text'];
    }
    if (event?.['type'] === 'turn.completed') {
      const candidate = record(event['usage']);
      if (candidate !== null) turnUsage = decodeTurnUsage(candidate);
    }
  }
  return { sessionId, finalText, turnUsage };
}

function decodeLiveProcessEvents(
  lines: AgentProcessOutput['stdoutLines'],
): readonly EngineObservedEvent[] {
  return lines.flatMap((line): readonly EngineObservedEvent[] => {
    let event: Readonly<Record<string, unknown>> | null;
    try { event = record(JSON.parse(line.line) as unknown); } catch { return []; }
    if (event === null) return [];
    const item = record(event['item']);
    const invocationId = typeof item?.['id'] === 'string'
      ? item['id']
      : typeof event['id'] === 'string' ? event['id'] : null;
    const server = typeof item?.['server'] === 'string'
      ? item['server']
      : typeof item?.['server_name'] === 'string' ? item['server_name'] : null;
    const toolName = typeof item?.['tool'] === 'string'
      ? item['tool']
      : typeof item?.['name'] === 'string' ? item['name'] : null;
    return [{
      invocationId,
      kind: typeof event['type'] === 'string' ? event['type'] : 'unknown',
      server,
      toolName,
      observedAtUnixMs: line.observedAtUnixMs,
    }];
  });
}

function stagedInvocationIds(events: readonly EngineObservedEvent[]): readonly string[] {
  return [...new Set(events.flatMap((event) =>
    event.invocationId === null ? [] : [event.invocationId]))].sort();
}

function requiredEngineStartupFailed(output: AgentProcessOutput): boolean {
  const detail = `${output.stderr}\n${output.stdout}`;
  return /required MCP server[^\n]*\bengine\b[^\n]*(?:failed|timed out)|MCP server[^\n]*\bengine\b[^\n]*(?:failed|timed out)|\bengine\b[^\n]*(?:initialization|startup)[^\n]*(?:failed|timed out)/iu.test(detail);
}

async function codexCatalogEvidence(
  launcherPath: string,
  events: readonly EngineObservedEvent[],
  output: AgentProcessOutput,
) {
  let launcher: Readonly<Record<string, unknown>>;
  try {
    launcher = record(JSON.parse(await readFile(launcherPath, 'utf8')) as unknown) ?? {};
  } catch {
    return null;
  }
  if (typeof launcher['dispatchId'] !== 'string') return null;
  const dispatchId = engineDispatchId(launcher['dispatchId']);
  const readinessPath = launcher['readinessSpoolPath'];
  const readiness: EngineReadinessRecord[] = [];
  let malformedReadiness = false;
  if (typeof readinessPath === 'string') {
    const resolvedReadinessPath = isAbsolute(readinessPath)
      ? readinessPath
      : resolve(dirname(resolve(launcherPath)), readinessPath);
    try {
      const source = await readFile(resolvedReadinessPath, 'utf8');
      for (const line of source.split('\n')) {
        if (line.trim().length === 0) continue;
        try {
          readiness.push(decodeEngineReadinessRecord(JSON.parse(line) as unknown));
        } catch {
          malformedReadiness = true;
        }
      }
    } catch (error) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null;
      if (code !== 'ENOENT') malformedReadiness = true;
    }
  }
  const profile = launcher['toolProfile'] === 'blind' ? 'blind' as const : 'dm' as const;
  const dispatchPhase = launcher['dispatchPhase'];
  const phase = dispatchPhase === 'primary' || dispatchPhase === 'correction' ||
    dispatchPhase === 'adjustment' || dispatchPhase === 'speculative'
    ? dispatchPhase : undefined;
  const requestId = typeof launcher['requestId'] === 'string' ? launcher['requestId'] : undefined;
  const expectedToolNames = readiness.find((entry) => entry.dispatchId === dispatchId &&
    entry.profile === profile && (phase === undefined || entry.phase === phase) &&
    (requestId === undefined || entry.requestId === requestId))?.expectedToolNames ?? [];
  return classifyEngineCatalogEvidence({
    dispatchId,
    expectedProfile: profile,
    ...(phase === undefined ? {} : { expectedPhase: phase }),
    ...(requestId === undefined ? {} : { expectedRequestId: requestId }),
    expectedToolNames,
    events,
    readiness,
    completed: output.exitCode === 0 && !output.cancelled && !output.timedOut,
    requiredStartupFailed: output.exitCode !== 0 && requiredEngineStartupFailed(output),
    malformedReadiness,
    corroboration: output.stderr.length === 0 ? [] : [output.stderr],
  });
}

function decodeTurnUsage(value: Readonly<Record<string, unknown>>): CodexTurnUsage | null {
  const inputTokens = integer(value['input_tokens']);
  const cachedInputTokens = integer(value['cached_input_tokens']);
  const outputTokens = integer(value['output_tokens']);
  const reasoningTokens = integer(value['reasoning_output_tokens']);
  return inputTokens === null || cachedInputTokens === null || outputTokens === null || reasoningTokens === null
    ? null
    : { turnInputTotal: turnInputTotal(inputTokens), cachedInputTokens, outputTokens, reasoningTokens };
}

function stderrSessionId(stderr: string): string | null {
  for (const line of stderr.split('\n')) {
    const announced = /^session id:\s*(\S+)$/iu.exec(line.trim());
    if (announced !== null) return announced[1] ?? null;
  }
  return null;
}

function decodeContextUsage(value: unknown): CodexContextUsage | null {
  const event = record(value);
  const payload = event?.['type'] === 'event_msg' ? record(event['payload']) : null;
  const info = payload?.['type'] === 'token_count' ? record(payload['info']) : null;
  const lastTokenUsage = record(info?.['last_token_usage']);
  const inputTokens = integer(lastTokenUsage?.['input_tokens']);
  const modelContextWindow = integer(info?.['model_context_window']);
  return inputTokens === null || modelContextWindow === null || modelContextWindow === 0
    ? null
    : {
        contextInputTokens: contextTokenCount(inputTokens),
        modelContextWindow: contextTokenCount(modelContextWindow),
      };
}

function codexRolloutDirectory(codexHome: string, today: Date, previousDays: number): string {
  const day = new Date(Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate() - previousDays,
  ));
  return resolve(
    codexHome,
    'sessions',
    String(day.getUTCFullYear()).padStart(4, '0'),
    String(day.getUTCMonth() + 1).padStart(2, '0'),
    String(day.getUTCDate()).padStart(2, '0'),
  );
}

function isMissingDirectory(error: unknown): boolean {
  return record(error)?.['code'] === 'ENOENT';
}

async function readLastCodexContextUsage(path: string, sessionId: string): Promise<CodexContextUsage> {
  const file = await open(path, 'r');
  try {
    const size = (await file.stat()).size;
    let end = size;
    let bytesReadFromTail = 0;
    let tail = Buffer.alloc(0);
    while (end > 0 && bytesReadFromTail < ROLLOUT_TAIL_MAX_BYTES) {
      const length = Math.min(ROLLOUT_TAIL_CHUNK_BYTES, end, ROLLOUT_TAIL_MAX_BYTES - bytesReadFromTail);
      const start = end - length;
      const buffer = Buffer.alloc(length);
      const result = await file.read(buffer, 0, length, start);
      tail = Buffer.concat([buffer.subarray(0, result.bytesRead), tail]);
      bytesReadFromTail += result.bytesRead;
      end = start;
      const lines = tail.toString('utf8').split('\n');
      const firstCompleteLine = end === 0 ? 0 : 1;
      for (let index = lines.length - 1; index >= firstCompleteLine; index -= 1) {
        const line = lines[index];
        if (line === undefined || line.trim().length === 0) continue;
        let decoded: unknown;
        try {
          decoded = JSON.parse(line) as unknown;
        } catch {
          continue;
        }
        const usage = decodeContextUsage(decoded);
        if (usage !== null) return usage;
      }
      if (result.bytesRead === 0) break;
    }
  } finally {
    await file.close();
  }
  throw new AgentAdapterError(
    'malformed_output',
    `Codex rollout ${basename(path)} has no per-call last_token_usage for completed session ${sessionId}.`,
  );
}

async function codexAgentUsage(
  turnUsage: CodexTurnUsage,
  contextUsage: CodexContextUsage,
): Promise<AgentUsage> {
  return { ...turnUsage, ...contextUsage };
}

function integer(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
