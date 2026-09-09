import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  ChildProcessMcpTransport,
  McpChildExited,
  McpRequestClient,
  McpRequestClientClosed,
  type McpByteLineTransport,
  type McpLineReceiver,
} from '../../../tools/mcp-request-client';

const INERT_SIGNAL = new AbortController().signal;

interface Deferred<Value> {
  readonly promise: Promise<Value>;
  readonly resolve: (value: Value) => void;
  readonly reject: (reason: unknown) => void;
}

function deferred<Value>(): Deferred<Value> {
  let resolvePromise: (value: Value) => void = () => {};
  let rejectPromise: (reason: unknown) => void = () => {};
  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

class FakeTransport implements McpByteLineTransport {
  readonly writes: Uint8Array[] = [];
  readonly abortReasons: unknown[] = [];
  closeCalls = 0;
  detachCalls = 0;
  receiver: McpLineReceiver | null = null;
  writeResult: Promise<void> | null = null;
  closeResult: Promise<void> = Promise.resolve();

  attach(receiver: McpLineReceiver): () => void {
    if (this.receiver !== null) throw new TypeError('receiver already attached');
    this.receiver = receiver;
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      this.detachCalls += 1;
      this.receiver = null;
    };
  }

  write(bytes: Uint8Array): Promise<void> {
    this.writes.push(new Uint8Array(bytes));
    return this.writeResult ?? Promise.resolve();
  }

  abort(reason: unknown): void { this.abortReasons.push(reason); }

  close(): Promise<void> {
    this.closeCalls += 1;
    return this.closeResult;
  }

  line(value: string): void {
    if (this.receiver === null) throw new Error('No receiver attached.');
    this.receiver.line(value);
  }

  fail(reason: unknown): void {
    if (this.receiver === null) throw new Error('No receiver attached.');
    this.receiver.failed(reason);
  }

  end(): void {
    if (this.receiver === null) throw new Error('No receiver attached.');
    this.receiver.ended();
  }
}

function writtenText(transport: FakeTransport, index = 0): string {
  const bytes = transport.writes[index];
  if (bytes === undefined) throw new Error(`Missing write ${String(index)}.`);
  return new TextDecoder().decode(bytes);
}

interface FakeChild {
  readonly child: ChildProcessWithoutNullStreams;
  readonly stdin: PassThrough;
  readonly stdout: PassThrough;
  readonly stderr: PassThrough;
  readonly kill: ReturnType<typeof vi.fn<(signal?: NodeJS.Signals | number) => boolean>>;
  readonly exit: (code: number | null, signal?: NodeJS.Signals | null) => void;
}

function fakeChild(): FakeChild {
  const events = new EventEmitter();
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const kill = vi.fn<(signal?: NodeJS.Signals | number) => boolean>(() => true);
  const mutable = Object.assign(events, {
    stdin,
    stdout,
    stderr,
    exitCode: null as number | null,
    signalCode: null as NodeJS.Signals | null,
    kill,
  });
  const child = mutable as unknown as ChildProcessWithoutNullStreams;
  return {
    child,
    stdin,
    stdout,
    stderr,
    kill,
    exit: (code, signal = null) => {
      mutable.exitCode = code;
      mutable.signalCode = signal;
      events.emit('exit', code, signal);
    },
  };
}

function receiverLog(): {
  readonly receiver: McpLineReceiver;
  readonly lines: string[];
  readonly failures: unknown[];
  readonly ended: { count: number };
} {
  const lines: string[] = [];
  const failures: unknown[] = [];
  const ended = { count: 0 };
  return {
    lines,
    failures,
    ended,
    receiver: {
      line: (line) => { lines.push(line); },
      failed: (reason) => { failures.push(reason); },
      ended: () => { ended.count += 1; },
    },
  };
}

describe('McpRequestClient', () => {
  it('writes the literal conversation frame including LF, id, params, and generated _meta', async () => {
    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, {
      name: 'ai-dm-conversation-SIMULATED', version: '1.0.0',
    });
    const response = client.request('tools/list', { scope: 'α', _meta: { forged: true } }, INERT_SIGNAL);

    expect(writtenText(transport)).toBe('{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{"scope":"α","_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"ai-dm-conversation-SIMULATED","version":"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}}}\n');
    transport.line('{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}');
    await expect(response).resolves.toEqual({ jsonrpc: '2.0', id: 1, result: { tools: [] } });
  });

  it('writes the literal dry-client frame and advances numeric ids from one', async () => {
    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, { name: 'engine-mcp-dry-client', version: '1.0.0' });
    const first = client.request('server/discover', {}, INERT_SIGNAL);

    expect(writtenText(transport)).toBe('{"jsonrpc":"2.0","id":1,"method":"server/discover","params":{"_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"engine-mcp-dry-client","version":"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}}}\n');
    transport.line('{"jsonrpc":"2.0","id":1,"result":{"name":"engine"}}');
    await first;
    const second = client.request('resources/list', { cursor: 'next' }, INERT_SIGNAL);
    expect(writtenText(transport, 1)).toBe('{"jsonrpc":"2.0","id":2,"method":"resources/list","params":{"cursor":"next","_meta":{"io.modelcontextprotocol/protocolVersion":"2026-07-28","io.modelcontextprotocol/clientInfo":{"name":"engine-mcp-dry-client","version":"1.0.0"},"io.modelcontextprotocol/clientCapabilities":{}}}}\n');
    transport.line('{"jsonrpc":"2.0","id":2,"result":{"resources":[]}}');
    await second;
  });

  it('matches two concurrent responses by id when lines arrive in reverse order', async () => {
    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, { name: 'concurrent', version: '1' });
    const first = client.request('first', {}, INERT_SIGNAL);
    const second = client.request('second', {}, INERT_SIGNAL);

    transport.line('{"jsonrpc":"2.0","id":2,"result":"second-result"}');
    transport.line('{"jsonrpc":"2.0","id":1,"result":"first-result"}');

    await expect(first).resolves.toMatchObject({ id: 1, result: 'first-result' });
    await expect(second).resolves.toMatchObject({ id: 2, result: 'second-result' });
  });

  it('returns matched success and error envelopes without applying consumer policy', async () => {
    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, { name: 'neutral', version: '1' });
    const success = client.request('success', {}, INERT_SIGNAL);
    const error = client.request('error', {}, INERT_SIGNAL);
    const successEnvelope = { jsonrpc: '2.0', id: 1, result: { value: 4 } };
    const errorEnvelope = { jsonrpc: '2.0', id: 2, error: { code: -32_000, message: 'No.' } };

    transport.line(JSON.stringify(errorEnvelope));
    transport.line(JSON.stringify(successEnvelope));

    await expect(success).resolves.toEqual(successEnvelope);
    await expect(error).resolves.toEqual(errorEnvelope);
  });

  it('fails closed and aborts transport on malformed, non-object, missing-id, unknown-id, or duplicate-id responses', async () => {
    const invalidLines = ['{', '[]', '{"jsonrpc":"2.0"}', '{"jsonrpc":"2.0","id":99}'];
    for (const line of invalidLines) {
      const transport = new FakeTransport();
      const client = new McpRequestClient(transport, { name: 'invalid', version: '1' });
      const pending = client.request('pending', {}, INERT_SIGNAL);
      const rejected = expect(pending).rejects.toBeInstanceOf(Error);
      transport.line(line);
      await rejected;
      expect(transport.abortReasons).toHaveLength(1);
      await expect(client.request('later', {}, INERT_SIGNAL)).rejects.toBe(transport.abortReasons[0]);
    }

    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, { name: 'duplicate', version: '1' });
    const completed = client.request('completed', {}, INERT_SIGNAL);
    transport.line('{"jsonrpc":"2.0","id":1,"result":true}');
    await completed;
    transport.line('{"jsonrpc":"2.0","id":1,"result":true}');
    expect(transport.abortReasons).toHaveLength(1);
    await expect(client.request('later', {}, INERT_SIGNAL)).rejects.toBe(transport.abortReasons[0]);
  });

  it('propagates the identical write failure to every pending and later request', async () => {
    const transport = new FakeTransport();
    const write = deferred<void>();
    transport.writeResult = write.promise;
    const client = new McpRequestClient(transport, { name: 'write-failure', version: '1' });
    const first = client.request('first', {}, INERT_SIGNAL);
    const second = client.request('second', {}, INERT_SIGNAL);
    const failure = new Error('write failed exactly');

    write.reject(failure);

    await expect(first).rejects.toBe(failure);
    await expect(second).rejects.toBe(failure);
    await expect(client.request('later', {}, INERT_SIGNAL)).rejects.toBe(failure);
    expect(transport.abortReasons).toEqual([failure]);
  });

  it('propagates the identical inbound transport failure to pending and later requests', async () => {
    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, { name: 'inbound-failure', version: '1' });
    const first = client.request('first', {}, INERT_SIGNAL);
    const second = client.request('second', {}, INERT_SIGNAL);
    const failure = new Error('inbound failure exactly');

    transport.fail(failure);

    await expect(first).rejects.toBe(failure);
    await expect(second).rejects.toBe(failure);
    await expect(client.request('later', {}, INERT_SIGNAL)).rejects.toBe(failure);
    expect(transport.abortReasons).toEqual([]);
  });

  it('rejects pending and later requests when the line transport ends unexpectedly', async () => {
    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, { name: 'ended', version: '1' });
    const first = client.request('first', {}, INERT_SIGNAL).catch((reason: unknown) => reason);
    const second = client.request('second', {}, INERT_SIGNAL).catch((reason: unknown) => reason);

    transport.end();

    const firstReason = await first;
    const secondReason = await second;
    expect(firstReason).toBeInstanceOf(McpRequestClientClosed);
    expect(secondReason).toBe(firstReason);
    await expect(client.request('later', {}, INERT_SIGNAL)).rejects.toBe(firstReason);
  });

  it('handles pre-abort and in-flight abort, removes listeners, ignores one late response, and keeps the next request usable', async () => {
    const transport = new FakeTransport();
    const client = new McpRequestClient(transport, { name: 'cancel', version: '1' });
    const preAbort = new AbortController();
    const preAbortReason = new Error('already cancelled');
    preAbort.abort(preAbortReason);

    await expect(client.request('pre-abort', {}, preAbort.signal)).rejects.toBe(preAbortReason);
    expect(transport.writes).toEqual([]);

    const completedController = new AbortController();
    const removeCompleted = vi.spyOn(completedController.signal, 'removeEventListener');
    const completed = client.request('completed', {}, completedController.signal);
    expect(JSON.parse(writtenText(transport)) as unknown).toMatchObject({ id: 1 });
    transport.line('{"jsonrpc":"2.0","id":1,"result":"done"}');
    await expect(completed).resolves.toMatchObject({ result: 'done' });
    expect(removeCompleted).toHaveBeenCalledWith('abort', expect.any(Function));

    const inFlight = new AbortController();
    const removeInFlight = vi.spyOn(inFlight.signal, 'removeEventListener');
    const cancelled = client.request('cancelled', {}, inFlight.signal);
    const inFlightReason = new Error('cancelled in flight');
    inFlight.abort(inFlightReason);
    await expect(cancelled).rejects.toBe(inFlightReason);
    expect(removeInFlight).toHaveBeenCalledWith('abort', expect.any(Function));

    transport.line('{"jsonrpc":"2.0","id":2,"result":"late"}');
    const next = client.request('next', {}, INERT_SIGNAL);
    expect(JSON.parse(writtenText(transport, 2)) as unknown).toMatchObject({ id: 3 });
    transport.line('{"jsonrpc":"2.0","id":3,"result":"usable"}');
    await expect(next).resolves.toMatchObject({ result: 'usable' });
    expect(transport.abortReasons).toEqual([]);
  });

  it('closes transport once, rejects outstanding and future work, and reuses a rejected close promise', async () => {
    const transport = new FakeTransport();
    const close = deferred<void>();
    transport.closeResult = close.promise;
    const client = new McpRequestClient(transport, { name: 'close', version: '1' });
    const outstanding = client.request('outstanding', {}, INERT_SIGNAL);
    const outstandingRejection = outstanding.catch((reason: unknown) => reason);

    const firstClose = client.close();
    const secondClose = client.close();
    expect(secondClose).toBe(firstClose);
    expect(transport.closeCalls).toBe(1);
    expect(transport.detachCalls).toBe(0);
    const closedReason = await outstandingRejection;
    expect(closedReason).toBeInstanceOf(McpRequestClientClosed);
    await expect(client.request('future', {}, INERT_SIGNAL)).rejects.toBe(closedReason);

    const failure = new Error('close failed exactly');
    close.reject(failure);
    await expect(firstClose).rejects.toBe(failure);
    expect(transport.detachCalls).toBe(1);
    expect(client.close()).toBe(firstClose);
    expect(transport.closeCalls).toBe(1);
  });

  it('frames one response split across chunks and inside a UTF-8 code point', async () => {
    const fake = fakeChild();
    const transport = new ChildProcessMcpTransport(fake.child, { stderrMaximumCharacters: null });
    const log = receiverLog();
    transport.attach(log.receiver);
    const encoded = Buffer.from('{"id":1,"result":"café"}\n', 'utf8');
    const split = encoded.indexOf(Buffer.from('é', 'utf8')) + 1;

    fake.stdout.write(encoded.subarray(0, split));
    expect(log.lines).toEqual([]);
    fake.stdout.write(encoded.subarray(split));

    expect(log.lines).toEqual(['{"id":1,"result":"café"}']);
    expect(log.failures).toEqual([]);
  });

  it('frames coalesced response lines and a trailing line split across chunks', () => {
    const fake = fakeChild();
    const transport = new ChildProcessMcpTransport(fake.child, { stderrMaximumCharacters: null });
    const log = receiverLog();
    transport.attach(log.receiver);

    fake.stdout.write('first\nsecond\nthi');
    expect(log.lines).toEqual(['first', 'second']);
    fake.stdout.write('rd\n');

    expect(log.lines).toEqual(['first', 'second', 'third']);
    expect(log.failures).toEqual([]);
  });

  it('replays EOF to one late receiver, rejects a second receiver, and detaches once', async () => {
    const fake = fakeChild();
    const transport = new ChildProcessMcpTransport(fake.child, { stderrMaximumCharacters: null });
    fake.stdout.end();
    await new Promise<void>((resolve) => { setImmediate(resolve); });
    const log = receiverLog();

    const detach = transport.attach(log.receiver);

    expect(log.failures).toEqual([]);
    expect(log.ended.count).toBe(1);
    expect(() => { transport.attach(receiverLog().receiver); }).toThrow(TypeError);
    detach();
    detach();
    fake.child.emit('error', new Error('after detach'));
    expect(log.failures).toEqual([]);
  });

  it('reports stdin, stdout, stderr, and child failures through the Node adapter', async () => {
    const cases = ['stdin', 'stdout', 'stderr', 'child'] as const;
    for (const source of cases) {
      const fake = fakeChild();
      const transport = new ChildProcessMcpTransport(fake.child, { stderrMaximumCharacters: 3 });
      const log = receiverLog();
      transport.attach(log.receiver);
      fake.stderr.write('abcdef');
      const failure = new Error(`${source} broke`);

      if (source === 'child') fake.child.emit('error', failure);
      else fake[source].emit('error', failure);

      expect(log.failures).toHaveLength(1);
      expect(log.failures[0]).toBeInstanceOf(McpChildExited);
      expect(log.failures[0]).toMatchObject({ cause: failure });
      expect((log.failures[0] as Error).message).toContain(`${source} ${source === 'child' ? 'failed' : 'failed:'}`);
      expect(transport.stderr).toBe('abc');
    }

    const live = fakeChild();
    const liveTransport = new ChildProcessMcpTransport(live.child, { stderrMaximumCharacters: null });
    const abortReason = new Error('protocol failure');
    const abortLog = receiverLog();
    liveTransport.attach(abortLog.receiver);
    liveTransport.abort(abortReason);
    liveTransport.abort(new Error('ignored second abort'));
    expect(abortLog.failures).toEqual([abortReason]);
    expect(live.kill).toHaveBeenCalledOnce();
    expect(live.kill).toHaveBeenCalledWith('SIGTERM');
    await expect(liveTransport.write(new Uint8Array())).rejects.toBe(abortReason);

    const exited = fakeChild();
    const exitedTransport = new ChildProcessMcpTransport(exited.child, { stderrMaximumCharacters: null });
    exitedTransport.attach(receiverLog().receiver);
    exited.exit(0);
    exitedTransport.abort(new Error('too late'));
    expect(exited.kill).not.toHaveBeenCalled();
  });
});
