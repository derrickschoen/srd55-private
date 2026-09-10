import { spawn } from 'node:child_process';
import type {
  AgentFailureClassification,
  AgentInvocation,
  AgentSessionBinding,
  AgentSessionAdapter,
  AgentProcessEvidence,
  AgentTurnResult,
  CliProbe,
} from '../agent-session';

export const AGENT_ADAPTER_VERSION = 1;
const STDERR_MAX_CHARS = 16 * 1024;
const STDERR_MAX_LINES = 50;

export interface AgentProcessSpec {
  readonly binary: string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly stdio: readonly ['pipe', 'pipe', 'pipe'];
  readonly shell: false;
  readonly env?: Readonly<Record<string, string>>;
  readonly onStdoutLine?: (line: string) => void;
}

export interface AgentProcessOutput {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly cancelled: boolean;
  readonly timedOut: boolean;
  readonly startedAtUnixMs: number;
  readonly endedAtUnixMs: number;
  readonly stdoutLines: readonly {
    readonly line: string;
    readonly observedAtUnixMs: number;
  }[];
}

export interface AgentProcessRunner {
  run(
    spec: AgentProcessSpec,
    stdin: string,
    signal: AbortSignal,
    timeoutMs: number | null,
  ): Promise<AgentProcessOutput>;
}

export interface AgentAdapterOptions {
  readonly binary?: string;
  readonly cwd?: string;
  readonly engineCommand?: string | null;
  readonly engineArgs?: readonly string[];
  readonly processRunner?: AgentProcessRunner;
  readonly onEvent?: (event: Readonly<Record<string, unknown>>) => void;
  readonly onStdoutLine?: (line: string) => void;
  readonly piMcpExtensionPath?: string;
  readonly codexHome?: string;
  readonly engineToolProfile?: 'full' | 'dm' | 'blind';
}

export type AgentAdapterErrorCode =
  | 'cli_absent'
  | 'resume_not_found'
  | 'resume_corrupt'
  | 'credentials_absent'
  | 'spawn_failed'
  | 'timeout'
  | 'agent_exit'
  | 'malformed_output';

interface AgentAdapterErrorOptions extends ErrorOptions {
  readonly stderr?: string;
}

export class AgentAdapterError extends Error {
  readonly stderr: string;

  constructor(
    readonly code: AgentAdapterErrorCode,
    message: string,
    options?: AgentAdapterErrorOptions,
  ) {
    super(message, options);
    this.name = 'AgentAdapterError';
    this.stderr = options?.stderr ?? '';
  }
}

export const realAgentProcessRunner: AgentProcessRunner = {
  run(spec, stdin, signal, timeoutMs) {
    if (timeoutMs !== null && (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)) {
      return Promise.reject(new RangeError('Agent invocation timeout must be null or a positive integer.'));
    }
    if (signal.aborted) {
      const now = Date.now();
      return Promise.resolve({
        stdout: '', stderr: '', exitCode: null, signal: null, cancelled: true, timedOut: false,
        startedAtUnixMs: now, endedAtUnixMs: now, stdoutLines: [],
      });
    }
    return new Promise<AgentProcessOutput>((resolvePromise, reject) => {
      const startedAtUnixMs = Date.now();
      let child;
      try {
        child = spawn(spec.binary, [...spec.argv], {
          cwd: spec.cwd,
          shell: spec.shell,
          stdio: [...spec.stdio],
          ...(spec.env === undefined ? {} : { env: { ...process.env, ...spec.env } }),
        });
      } catch (error) {
        reject(spawnError(error));
        return;
      }
      let stdout = '';
      let stdoutLineBuffer = '';
      let stderr = '';
      let cancelled = false;
      let timedOut = false;
      let exitSignal: string | null = null;
      const stdoutLines: { line: string; observedAtUnixMs: number }[] = [];
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      let forceKillTimer: ReturnType<typeof setTimeout> | null = null;
      const cancel = (): void => {
        cancelled = true;
        child.kill('SIGTERM');
      };
      const finish = (result: AgentProcessOutput): void => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', cancel);
        if (timer !== null) clearTimeout(timer);
        if (forceKillTimer !== null) clearTimeout(forceKillTimer);
        resolvePromise(result);
      };
      const timeOut = (): void => {
        if (settled) return;
        timedOut = true;
        signal.removeEventListener('abort', cancel);
        child.kill('SIGTERM');
        forceKillTimer = setTimeout(() => { child.kill('SIGKILL'); }, 1_000);
      };
      signal.addEventListener('abort', cancel, { once: true });
      if (timeoutMs !== null) {
        timer = setTimeout(timeOut, timeoutMs);
      }
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
        stdoutLineBuffer += chunk;
        const lines = stdoutLineBuffer.split('\n');
        stdoutLineBuffer = lines.pop() ?? '';
        for (const line of lines) {
          const observedAtUnixMs = Date.now();
          stdoutLines.push({ line, observedAtUnixMs });
          spec.onStdoutLine?.(line);
        }
      });
      // Preserve the complete stream for forensic evidence. User-facing errors
      // are still bounded by capStderr at the point where they are rendered.
      child.stderr.on('data', (chunk: string) => { stderr += chunk; });
      child.stdin.on('error', () => undefined);
      child.once('error', (error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', cancel);
        if (timer !== null) clearTimeout(timer);
        if (forceKillTimer !== null) clearTimeout(forceKillTimer);
        reject(spawnError(error));
      });
      child.once('close', (exitCode, signalName) => {
        exitSignal = signalName;
        if (stdoutLineBuffer.length > 0) {
          const observedAtUnixMs = Date.now();
          stdoutLines.push({ line: stdoutLineBuffer, observedAtUnixMs });
          spec.onStdoutLine?.(stdoutLineBuffer);
        }
        finish({
          stdout, stderr, exitCode, signal: exitSignal, cancelled, timedOut,
          startedAtUnixMs, endedAtUnixMs: Date.now(), stdoutLines,
        });
      });
      child.stdin.end(stdin);
    });
  },
};

export abstract class ProcessAgentSessionAdapter implements AgentSessionAdapter {
  abstract readonly kind: AgentSessionAdapter['kind'];
  protected abstract readonly defaultBinary: string;

  protected constructor(protected readonly options: AgentAdapterOptions = {}) {}

  async probe(): Promise<CliProbe> {
    const controller = new AbortController();
    try {
      const output = await this.runner().run(this.spec(['--version']), '', controller.signal, 5_000);
      if (output.exitCode !== 0) return { present: true, version: null };
      return { present: true, version: firstLine(output.stdout) ?? firstLine(output.stderr) };
    } catch (error) {
      if (classifyAgentFailure(error) === 'cli_absent') return { present: false, version: null };
      throw error;
    }
  }

  abstract start(invocation: AgentInvocation, signal: AbortSignal): Promise<AgentTurnResult>;
  abstract resume(
    binding: AgentSessionBinding,
    invocation: AgentInvocation,
    signal: AbortSignal,
  ): Promise<AgentTurnResult>;

  classifyFailure(error: unknown): AgentFailureClassification {
    return classifyAgentFailure(error);
  }

  protected runner(): AgentProcessRunner {
    return this.options.processRunner ?? realAgentProcessRunner;
  }

  protected spec(argv: readonly string[], env?: Readonly<Record<string, string>>): AgentProcessSpec {
    return {
      binary: this.options.binary ?? this.defaultBinary,
      argv,
      cwd: this.options.cwd ?? process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
      ...(env === undefined ? {} : { env }),
      ...(this.options.onStdoutLine === undefined ? {} : { onStdoutLine: this.options.onStdoutLine }),
    };
  }

  protected engineArgs(launcherToken: string): readonly string[] {
    return [...(this.options.engineArgs ?? []), launcherToken];
  }

  protected engineCommand(): string | null {
    return this.options.engineCommand === undefined ? 'engine-mcp' : this.options.engineCommand;
  }

  protected observe(event: Readonly<Record<string, unknown>>): void {
    this.options.onEvent?.(event);
  }
}

export function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

export function jsonEventLines(stdout: string): readonly Readonly<Record<string, unknown>>[] {
  return stdout.split('\n').flatMap((line): readonly Readonly<Record<string, unknown>>[] => {
    if (line.trim().length === 0) return [];
    try {
      const event = record(JSON.parse(line) as unknown);
      if (event === null) throw new TypeError('event is not an object');
      return [event];
    } catch (error) {
      throw new AgentAdapterError('malformed_output', 'Agent emitted malformed JSON event output.', { cause: error });
    }
  });
}

export function completedOutput(output: AgentProcessOutput, resuming: boolean): void {
  if (output.cancelled || output.timedOut) return;
  if (output.exitCode === 0) return;
  throw classifyExit(output, resuming);
}

export function agentProcessEvidence(
  output: AgentProcessOutput,
  decodedEvents: AgentProcessEvidence['decodedEvents'] = [],
): AgentProcessEvidence {
  return {
    startedAtUnixMs: output.startedAtUnixMs,
    endedAtUnixMs: output.endedAtUnixMs,
    exitCode: output.exitCode,
    signal: output.signal,
    stdout: output.stdout,
    stderr: output.stderr,
    decodedEvents,
  };
}

export function classifyAgentFailure(error: unknown): AgentFailureClassification {
  if (!(error instanceof AgentAdapterError)) return 'unknown';
  switch (error.code) {
    case 'cli_absent': return 'cli_absent';
    case 'resume_not_found': return 'resume_not_found';
    case 'resume_corrupt': return 'resume_corrupt';
    case 'credentials_absent': return 'authentication';
    case 'spawn_failed': return 'transport';
    case 'timeout': return 'transport';
    case 'agent_exit': return 'agent_exit';
    case 'malformed_output': return 'unknown';
  }
}

function classifyExit(output: AgentProcessOutput, resuming: boolean): AgentAdapterError {
  const detail = `${output.stderr}\n${output.stdout}`.toLowerCase();
  if (resuming && /stored session working directory does not exist/u.test(detail)) {
    return new AgentAdapterError('resume_corrupt', capStderr(output.stderr), { stderr: output.stderr });
  }
  if (resuming && /(?:session|thread|conversation).*(?:not found|does not exist|unknown)|no (?:such )?(?:session|thread|conversation)|no conversation found|does not match any (?:session|thread|conversation)/u.test(detail)) {
    return new AgentAdapterError('resume_not_found', capStderr(output.stderr), { stderr: output.stderr });
  }
  if (resuming && /(?:corrupt|invalid|malformed).*(?:session|thread)|(?:session|thread).*(?:corrupt|invalid|malformed)/u.test(detail)) {
    return new AgentAdapterError('resume_corrupt', capStderr(output.stderr), { stderr: output.stderr });
  }
  if (/(?:authentication|not logged in|login required|credentials?|api key)/u.test(detail)) {
    return new AgentAdapterError('credentials_absent', capStderr(output.stderr), { stderr: output.stderr });
  }
  return new AgentAdapterError(
    'agent_exit',
    `Agent CLI exited ${String(output.exitCode)}${output.stderr.length === 0 ? '.' : `: ${capStderr(output.stderr)}`}`,
    { stderr: output.stderr },
  );
}

function spawnError(error: unknown): AgentAdapterError {
  const candidate = record(error);
  const code = candidate?.['code'];
  return new AgentAdapterError(
    code === 'ENOENT' ? 'cli_absent' : 'spawn_failed',
    error instanceof Error ? error.message : String(error),
    { cause: error },
  );
}

function firstLine(value: string): string | null {
  return value.split('\n').map((line) => line.trim()).find((line) => line.length > 0) ?? null;
}

function capStderr(value: string): string {
  const lines = value.split('\n').slice(0, STDERR_MAX_LINES).join('\n');
  return lines.length > STDERR_MAX_CHARS ? `${lines.slice(0, STDERR_MAX_CHARS)}…` : lines;
}
