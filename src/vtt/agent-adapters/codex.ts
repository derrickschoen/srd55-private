import { open, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, resolve } from 'node:path';
import { agentSessionIdFromCli, contextTokenCount, turnInputTotal } from '../agent-session';
import type {
  AgentInvocation,
  AgentSessionBinding,
  AgentTurnResult,
  AgentUsage,
  ContextTokenCount,
  TurnInputTotal,
} from '../agent-session';
import {
  AgentAdapterError,
  completedOutput,
  jsonEventLines,
  ProcessAgentSessionAdapter,
  record,
  type AgentAdapterOptions,
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

export interface CodexRolloutDirectoryEntry {
  readonly name: string;
  isFile(): boolean;
}

export type CodexRolloutDirectoryReader = (
  directory: string,
) => Promise<readonly CodexRolloutDirectoryEntry[]>;

export class CodexRolloutContextReader {
  readonly #rolloutPathBySessionBinding = new Map<string, Promise<string>>();

  constructor(
    private readonly codexHome: string,
    private readonly readDirectory: CodexRolloutDirectoryReader = async (directory) =>
      readdir(directory, { withFileTypes: true }),
  ) {}

  async read(sessionId: string, sessionDate: Date): Promise<CodexContextUsage> {
    let path = this.#rolloutPathBySessionBinding.get(sessionId);
    if (path === undefined) {
      path = this.#resolveRolloutPath(sessionId, sessionDate);
      this.#rolloutPathBySessionBinding.set(sessionId, path);
    }
    return readLastCodexContextUsage(await path, sessionId);
  }

  async #resolveRolloutPath(sessionId: string, sessionDate: Date): Promise<string> {
    const directory = resolve(
      this.codexHome,
      'sessions',
      String(sessionDate.getUTCFullYear()).padStart(4, '0'),
      String(sessionDate.getUTCMonth() + 1).padStart(2, '0'),
      String(sessionDate.getUTCDate()).padStart(2, '0'),
    );
    let entries: readonly CodexRolloutDirectoryEntry[];
    try {
      entries = await this.readDirectory(directory);
    } catch (error) {
      throw new AgentAdapterError(
        'malformed_output',
        `Codex rollout directory could not be read for session ${sessionId}.`,
        { cause: error },
      );
    }
    const matches = entries
      .filter((entry) => entry.isFile() && (
        entry.name.endsWith(`-${sessionId}.jsonl`) || entry.name.endsWith(`-${sessionId}.SIMULATED.jsonl`)
      ))
      .map((entry) => resolve(directory, entry.name));
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

  constructor(options: AgentAdapterOptions = {}) {
    super(options);
    this.#contextReader = new CodexRolloutContextReader(
      options.codexHome ?? process.env['CODEX_HOME'] ?? resolve(homedir(), '.codex'),
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
    return this.spec(codexArgv({
      cwd: this.options.cwd ?? process.cwd(),
      model: invocation.model,
      reasoningEffort: invocation.reasoningEffort,
      engineCommand: this.engineCommand(),
      engineArgs: this.engineArgs(invocation.launcherToken),
      instructions: invocation.instructions ?? null,
      arenaSession: invocation.sessionProfile === 'arena',
      sessionId,
    }));
  }

  private async invoke(
    invocation: AgentInvocation,
    sessionId: string | null,
    signal: AbortSignal,
  ): Promise<AgentTurnResult> {
    const rolloutSessionDate = codexRolloutSessionDate(sessionId);
    const output = await this.runner().run(
      this.invocationSpec(invocation, sessionId),
      invocation.prompt,
      signal,
      invocation.timeoutMs,
    );
    completedOutput(output, sessionId !== null);
    if (output.cancelled && sessionId !== null) {
      return {
        resumeSessionId: agentSessionIdFromCli(sessionId),
        sessionId,
        finalText: '',
        usage: null,
        exit: 'cancelled',
      };
    }
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
          await this.#contextReader.read(
            decoded.sessionId,
            rolloutSessionDate,
          ),
        );
    return {
      resumeSessionId: agentSessionIdFromCli(decoded.sessionId),
      sessionId: decoded.sessionId,
      finalText: decoded.finalText,
      usage,
      exit: output.cancelled ? 'cancelled' : 'completed',
    };
  }
}

export interface CodexArgvInput {
  readonly cwd: string;
  readonly model: string;
  readonly reasoningEffort: string;
  readonly engineCommand: string | null;
  readonly engineArgs: readonly string[];
  readonly instructions?: string | null;
  readonly arenaSession?: boolean;
  readonly sessionId: string | null;
}

export function codexArgv(input: CodexArgvInput): readonly string[] {
  return [
    'exec',
    '-C', input.cwd,
    '--sandbox', 'read-only',
    '--json',
    '-m', input.model,
    '-c', `model_reasoning_effort=${JSON.stringify(input.reasoningEffort)}`,
    ...(input.arenaSession === true ? [
      '-c', 'project_doc_max_bytes=0',
      '-c', 'features.plugins=false',
      '-c', 'skills.include_instructions=false',
    ] : []),
    ...(input.engineCommand === null ? [] : [
      '-c', `mcp_servers.engine.command=${JSON.stringify(input.engineCommand)}`,
      '-c', `mcp_servers.engine.args=${JSON.stringify(input.engineArgs)}`,
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

function codexRolloutSessionDate(sessionId: string | null): Date {
  if (sessionId === null) return new Date();
  const uuidV7 = /^([0-9a-f]{8})-([0-9a-f]{4})-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.exec(sessionId);
  if (uuidV7 === null) return new Date();
  const milliseconds = Number.parseInt(`${uuidV7[1] ?? ''}${uuidV7[2] ?? ''}`, 16);
  return Number.isSafeInteger(milliseconds) ? new Date(milliseconds) : new Date();
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
