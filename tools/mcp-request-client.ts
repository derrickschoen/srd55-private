import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import { mcpRequestMeta } from '../src/vtt/mcp/handler';

export interface McpClientIdentity {
  readonly name: string;
  readonly version: string;
}

export interface McpLineReceiver {
  readonly line: (line: string) => void;
  readonly failed: (reason: unknown) => void;
  readonly ended: () => void;
}

export interface McpByteLineTransport {
  readonly attach: (receiver: McpLineReceiver) => () => void;
  readonly write: (bytes: Uint8Array) => Promise<void>;
  readonly abort: (reason: unknown) => void;
  readonly close: () => Promise<void>;
}

export class McpRequestClientClosed extends Error {
  override readonly name = 'McpRequestClientClosed';
}

interface PendingRequest {
  readonly resolve: (value: unknown) => void;
  readonly reject: (reason: unknown) => void;
  readonly signal: AbortSignal;
  readonly onAbort: () => void;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class McpRequestClient {
  readonly #transport: McpByteLineTransport;
  readonly #identity: McpClientIdentity;
  readonly #pending = new Map<number, PendingRequest>();
  readonly #cancelledIds = new Set<number>();
  readonly #detach: () => void;
  #nextId = 1;
  #terminal = false;
  #terminalReason: unknown;
  #transportAborted = false;
  #closePromise: Promise<void> | null = null;

  constructor(transport: McpByteLineTransport, identity: McpClientIdentity) {
    this.#transport = transport;
    this.#identity = identity;
    this.#detach = transport.attach({
      line: (line) => { this.#receive(line); },
      failed: (reason) => { this.#fail(reason, false); },
      ended: () => {
        this.#fail(new McpRequestClientClosed('MCP line transport ended unexpectedly.'), false);
      },
    });
  }

  request(
    method: string,
    params: Readonly<Record<string, unknown>>,
    signal: AbortSignal,
  ): Promise<unknown> {
    if (signal.aborted) return Promise.reject(signal.reason);
    if (this.#terminal) return Promise.reject(this.#terminalReason);

    const id = this.#nextId;
    this.#nextId += 1;
    let bytes: Uint8Array;
    try {
      bytes = new TextEncoder().encode(`${JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params: { ...params, _meta: mcpRequestMeta(this.#identity) },
      })}\n`);
    } catch (error) {
      return Promise.reject(error);
    }

    const response = new Promise<unknown>((resolve, reject) => {
      const onAbort = (): void => {
        const pending = this.#pending.get(id);
        if (pending === undefined) return;
        this.#pending.delete(id);
        pending.signal.removeEventListener('abort', pending.onAbort);
        this.#cancelledIds.add(id);
        pending.reject(signal.reason);
      };
      this.#pending.set(id, { resolve, reject, signal, onAbort });
      signal.addEventListener('abort', onAbort, { once: true });
    });

    let write: Promise<void>;
    try {
      write = this.#transport.write(bytes);
    } catch (reason) {
      this.#fail(reason, true);
      return response;
    }
    void write.catch((reason: unknown) => { this.#fail(reason, true); });
    return response;
  }

  close(): Promise<void> {
    if (this.#closePromise !== null) return this.#closePromise;
    this.#fail(new McpRequestClientClosed('MCP request client is closed.'), false);
    let transportClose: Promise<void>;
    try {
      transportClose = this.#transport.close();
    } catch (reason) {
      transportClose = Promise.reject(reason);
    }
    this.#closePromise = transportClose.finally(() => { this.#detach(); });
    return this.#closePromise;
  }

  #receive(line: string): void {
    if (this.#terminal) return;
    let response: Readonly<Record<string, unknown>> | null;
    try {
      response = record(JSON.parse(line) as unknown);
    } catch (error) {
      this.#fail(
        new Error(`Engine MCP response was not valid JSON: ${errorText(error)}`, { cause: error }),
        true,
      );
      return;
    }
    if (response === null || typeof response['id'] !== 'number') {
      this.#fail(new Error('Engine MCP response id mismatch.'), true);
      return;
    }
    const id = response['id'];
    if (this.#cancelledIds.delete(id)) return;
    const pending = this.#pending.get(id);
    if (pending === undefined) {
      this.#fail(new Error('Engine MCP response id mismatch.'), true);
      return;
    }
    this.#pending.delete(id);
    pending.signal.removeEventListener('abort', pending.onAbort);
    pending.resolve(response);
  }

  #fail(reason: unknown, abortTransport: boolean): void {
    if (!this.#terminal) {
      this.#terminal = true;
      this.#terminalReason = reason;
      for (const pending of this.#pending.values()) {
        pending.signal.removeEventListener('abort', pending.onAbort);
        pending.reject(reason);
      }
      this.#pending.clear();
    }
    if (abortTransport && !this.#transportAborted) {
      this.#transportAborted = true;
      this.#transport.abort(reason);
    }
  }
}

export class McpChildExited extends Error {
  override readonly name = 'McpChildExited';
  readonly code = 'MCP_CHILD_EXITED';

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export interface ChildProcessMcpTransportOptions {
  readonly stderrMaximumCharacters: number | null;
}

type TransportTerminal =
  | { readonly kind: 'failed'; readonly reason: unknown }
  | { readonly kind: 'ended' };

export class ChildProcessMcpTransport implements McpByteLineTransport {
  readonly #child: ChildProcessWithoutNullStreams;
  readonly #options: ChildProcessMcpTransportOptions;
  readonly #lines: Interface;
  readonly #exit: Promise<number | null>;
  #resolveExit: (code: number | null) => void = () => {};
  #receiver: McpLineReceiver | null = null;
  #attached = false;
  #terminal: TransportTerminal | null = null;
  #stderr = '';
  #exitCode: number | null;
  #exitSettled = false;
  #aborted = false;
  #linesClosed = false;
  #closePromise: Promise<void> | null = null;

  constructor(
    child: ChildProcessWithoutNullStreams,
    options: ChildProcessMcpTransportOptions,
  ) {
    this.#child = child;
    this.#options = options;
    this.#exitCode = child.exitCode;
    this.#lines = createInterface({ input: child.stdout, crlfDelay: Number.POSITIVE_INFINITY });
    this.#exit = new Promise<number | null>((resolve) => { this.#resolveExit = resolve; });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', this.#onStderrData);
    child.stderr.on('error', this.#onStderrError);
    child.stdin.on('error', this.#onStdinError);
    child.stdout.on('error', this.#onStdoutError);
    this.#lines.on('line', this.#onLine);
    this.#lines.on('error', this.#onLinesError);
    this.#lines.once('close', this.#onLinesClose);
    child.once('error', this.#onChildError);
    child.once('exit', this.#onChildExit);

    if (child.exitCode !== null || child.signalCode !== null) {
      this.#settleExit(child.exitCode);
      this.#terminate({
        kind: 'failed',
        reason: this.#childExitedError(
          child.exitCode === null
            ? `exited from ${String(child.signalCode)}`
            : `exited with code ${String(child.exitCode)}`,
        ),
      });
    }
  }

  get exit(): Promise<number | null> { return this.#exit; }
  get stderr(): string { return this.#stderr; }
  get exitCode(): number | null { return this.#exitCode; }

  attach(receiver: McpLineReceiver): () => void {
    if (this.#attached) throw new TypeError('MCP line transport already has a receiver.');
    this.#attached = true;
    this.#receiver = receiver;
    if (this.#terminal?.kind === 'failed') receiver.failed(this.#terminal.reason);
    else if (this.#terminal?.kind === 'ended') receiver.ended();
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      if (this.#receiver === receiver) this.#receiver = null;
    };
  }

  write(bytes: Uint8Array): Promise<void> {
    if (this.#terminal !== null) return Promise.reject(this.#terminalReason());
    if (this.#child.exitCode !== null || this.#child.signalCode !== null ||
      this.#child.stdin.destroyed || this.#child.stdin.writableEnded || !this.#child.stdin.writable) {
      const reason = this.#childExitedError('is not writable');
      this.#terminate({ kind: 'failed', reason });
      return Promise.reject(reason);
    }
    return new Promise<void>((resolve, reject) => {
      try {
        this.#child.stdin.write(bytes, (error) => {
          if (error === null || error === undefined) {
            resolve();
            return;
          }
          const reason = this.#childExitedError(`write failed: ${errorText(error)}`, error);
          this.#terminate({ kind: 'failed', reason });
          reject(reason);
        });
      } catch (error) {
        const reason = this.#childExitedError(`write failed: ${errorText(error)}`, error);
        this.#terminate({ kind: 'failed', reason });
        reject(reason);
      }
    });
  }

  abort(reason: unknown): void {
    if (this.#aborted) return;
    this.#aborted = true;
    this.#terminate({ kind: 'failed', reason });
    if (this.#child.exitCode === null && this.#child.signalCode === null) {
      this.#child.kill('SIGTERM');
    }
  }

  close(): Promise<void> {
    if (this.#closePromise !== null) return this.#closePromise;
    this.#closePromise = (async () => {
      try {
        if (!this.#child.stdin.destroyed && !this.#child.stdin.writableEnded) {
          this.#child.stdin.end();
        }
        await this.#exit;
      } finally {
        this.#closeLines();
        this.#removeListeners();
      }
    })();
    return this.#closePromise;
  }

  readonly #onStderrData = (chunk: string): void => {
    const combined = `${this.#stderr}${chunk}`;
    this.#stderr = this.#options.stderrMaximumCharacters === null
      ? combined
      : combined.slice(0, this.#options.stderrMaximumCharacters);
  };

  readonly #onStderrError = (error: Error): void => {
    this.#terminate({
      kind: 'failed',
      reason: this.#childExitedError(`stderr failed: ${errorText(error)}`, error),
    });
  };

  readonly #onStdinError = (error: Error): void => {
    this.#terminate({
      kind: 'failed',
      reason: this.#childExitedError(`stdin failed: ${errorText(error)}`, error),
    });
  };

  readonly #onStdoutError = (error: Error): void => {
    this.#terminate({
      kind: 'failed',
      reason: this.#childExitedError(`stdout failed: ${errorText(error)}`, error),
    });
  };

  readonly #onLine = (line: string): void => {
    if (this.#terminal === null) this.#receiver?.line(line);
  };

  readonly #onLinesError = (error: Error): void => {
    this.#terminate({
      kind: 'failed',
      reason: this.#childExitedError(`stdout failed: ${errorText(error)}`, error),
    });
  };

  readonly #onLinesClose = (): void => {
    this.#linesClosed = true;
    this.#terminate({ kind: 'ended' });
  };

  readonly #onChildError = (error: Error): void => {
    this.#terminate({
      kind: 'failed',
      reason: this.#childExitedError(`failed: ${errorText(error)}`, error),
    });
    this.#settleExit(null);
  };

  readonly #onChildExit = (code: number | null, signal: NodeJS.Signals | null): void => {
    this.#exitCode = code;
    this.#terminate({
      kind: 'failed',
      reason: this.#childExitedError(
        `exited ${code === null ? `from ${String(signal)}` : `with code ${String(code)}`}`,
      ),
    });
    this.#settleExit(code);
  };

  #childExitedError(detail: string, cause?: unknown): McpChildExited {
    const stderr = this.#stderr.trim();
    return new McpChildExited(
      `Engine MCP child ${detail}${stderr.length === 0 ? '' : `: ${stderr}`}`,
      cause === undefined ? undefined : { cause },
    );
  }

  #terminate(terminal: TransportTerminal): void {
    if (this.#terminal !== null) return;
    this.#terminal = terminal;
    if (terminal.kind === 'failed') this.#receiver?.failed(terminal.reason);
    else this.#receiver?.ended();
  }

  #terminalReason(): unknown {
    return this.#terminal?.kind === 'failed'
      ? this.#terminal.reason
      : new McpRequestClientClosed('MCP line transport has ended.');
  }

  #settleExit(code: number | null): void {
    if (this.#exitSettled) return;
    this.#exitSettled = true;
    this.#resolveExit(code);
  }

  #closeLines(): void {
    if (this.#linesClosed) return;
    this.#linesClosed = true;
    this.#lines.close();
  }

  #removeListeners(): void {
    this.#child.stderr.off('data', this.#onStderrData);
    this.#child.stderr.off('error', this.#onStderrError);
    this.#child.stdin.off('error', this.#onStdinError);
    this.#child.stdout.off('error', this.#onStdoutError);
    this.#lines.off('line', this.#onLine);
    this.#lines.off('error', this.#onLinesError);
    this.#child.off('error', this.#onChildError);
    this.#child.off('exit', this.#onChildExit);
  }
}
