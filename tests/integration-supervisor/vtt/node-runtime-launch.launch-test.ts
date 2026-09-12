import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { WebSocket } from 'ws';

const STARTUP_DEADLINE_MS = 2 * 60_000;
const EXIT_DEADLINE_MS = 10_000;

function deadline<T>(operation: Promise<T>, milliseconds: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(label + ' exceeded ' + String(milliseconds) + 'ms.')), milliseconds);
  });
  return Promise.race([operation, expired]).finally(() => { if (timer !== undefined) clearTimeout(timer); });
}

function exited(child: ChildProcess): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode });
  }
  return new Promise((resolveExit) => child.once('exit', (code, signal) => resolveExit({ code, signal })));
}

interface LaunchOutput {
  readonly output: () => string;
  readonly errors: () => string;
  readonly drained: Promise<void>;
  readonly staticPort: () => number | null;
  readonly websocketUrl: () => string | null;
  readonly descendantPids: () => readonly number[];
}

function diagnostics(label: string, observation: LaunchOutput): string {
  return [label, '--- stdout ---', observation.output(), '--- stderr ---', observation.errors()].join('\n');
}

function descendantsExited(observation: LaunchOutput, milliseconds: number): Promise<void> {
  const expiresAt = Date.now() + milliseconds;
  return new Promise((resolveExit, reject) => {
    const inspect = (): void => {
      const live = observation.descendantPids().some((pid) => existsSync('/proc/' + String(pid)));
      if (!live) { resolveExit(); return; }
      if (Date.now() >= expiresAt) {
        reject(new Error('serve descendant termination exceeded ' + String(milliseconds) + 'ms.'));
        return;
      }
      setImmediate(inspect);
    };
    inspect();
  });
}

async function stopProcessGroup(child: ChildProcess, observation: LaunchOutput): Promise<void> {
  const pid = child.pid;
  const childExit = exited(child);
  try {
    if (pid !== undefined && child.exitCode === null && child.signalCode === null) {
      try { process.kill(-pid, 'SIGTERM'); } catch { /* It may already have exited. */ }
    }
    try {
      await Promise.all([
        deadline(childExit, EXIT_DEADLINE_MS, 'serve process-group termination'),
        deadline(observation.drained, EXIT_DEADLINE_MS, 'serve output drainage'),
        descendantsExited(observation, EXIT_DEADLINE_MS),
      ]);
    } catch {
      if (pid !== undefined) {
        try { process.kill(-pid, 'SIGKILL'); } catch { /* The group may already be gone. */ }
      }
      await Promise.all([
        deadline(childExit, EXIT_DEADLINE_MS, 'forced serve process-group termination'),
        deadline(observation.drained, EXIT_DEADLINE_MS, 'forced serve output drainage'),
        descendantsExited(observation, EXIT_DEADLINE_MS),
      ]);
    }
  } catch (error: unknown) {
    await Promise.race([
      observation.drained,
      new Promise<void>((resolveDrain) => setTimeout(resolveDrain, EXIT_DEADLINE_MS)),
    ]);
    throw new Error(diagnostics(
      'Process cleanup failed: ' + (error instanceof Error ? error.message : String(error)), observation,
    ));
  }
}

function provePortFree(port: number, label: string): Promise<void> {
  return new Promise((resolveFree, reject) => {
    const server = createServer();
    server.once('error', (error) => reject(new Error(`${label} remained bound: ${error.message}`)));
    server.listen(port, '127.0.0.1', () => server.close((error) =>
      error === undefined ? resolveFree() : reject(error)));
  });
}

function launch(tokensFile: string, injectFailure: boolean): {
  readonly child: ChildProcess;
  readonly observation: LaunchOutput;
} {
  const child = spawn('npm', ['run', 'serve', '--', '--vtt-runtime', '--port', '0'], {
    cwd: process.cwd(),
    detached: true,
    env: {
      ...process.env,
      VTT_RUNTIME_TOKENS_FILE: tokensFile,
      VTT_RUNTIME_PORT: '0',
      ...(injectFailure ? { VTT_RUNTIME_INJECT_STARTUP_FAILURE: '1' } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errors = '';
  const drained = Promise.all([
    child.stdout === null ? Promise.resolve() : new Promise<void>((resolveDrain) => child.stdout?.once('close', resolveDrain)),
    child.stderr === null ? Promise.resolve() : new Promise<void>((resolveDrain) => child.stderr?.once('close', resolveDrain)),
  ]).then(() => undefined);
  child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString(); });
  child.stderr?.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
  return {
    child,
    observation: {
      output: () => output,
      errors: () => errors,
      drained,
      staticPort: () => {
        const value = /serve: fresh dist\/ available at http:\/\/127\.0\.0\.1:(\d+)/u.exec(output)?.[1];
        return value === undefined ? null : Number(value);
      },
      websocketUrl: () => /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(output)?.[1] ?? null,
      descendantPids: () => [
        /serve: process pid (\d+)/u.exec(output)?.[1],
        /serve: vtt runtime child pid (\d+)/u.exec(output)?.[1],
        /vtt-runtime: process pid (\d+)/u.exec(output)?.[1],
      ].filter((value): value is string => value !== undefined).map(Number),
    },
  };
}

function waitForOutput(
  child: ChildProcess,
  observation: LaunchOutput,
  predicate: () => boolean,
  label: string,
): Promise<void> {
  const ready = new Promise<void>((resolveReady, reject) => {
    const inspect = (): void => { if (predicate()) resolveReady(); };
    child.stdout?.on('data', inspect);
    child.stderr?.on('data', inspect);
    child.once('exit', (code, signal) => {
      void observation.drained.then(() => {
        inspect();
        if (!predicate()) reject(new Error(diagnostics(
          label + ' exited ' + String(code) + ' (' + String(signal) + ') before readiness.', observation,
        )));
      });
    });
    child.once('error', (error) => {
      void observation.drained.then(() => reject(new Error(diagnostics(
        label + ' failed to spawn: ' + error.message, observation,
      ))));
    });
    inspect();
  });
  return deadline(ready, STARTUP_DEADLINE_MS, label).catch(async (error: unknown) => {
    await stopProcessGroup(child, observation);
    await observation.drained;
    if (error instanceof Error && error.message.includes('--- stdout ---')) throw error;
    throw new Error(diagnostics(
      error instanceof Error ? error.message : String(error), observation,
    ));
  });
}

test('launches a fresh runtime and contains both successful and failed process trees', async () => {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-runtime-launch-'));
  const token = 'supervisor-launch-secret';
  const tokensFile = resolve(root, 'tokens.json');
  writeFileSync(tokensFile, JSON.stringify([{
    tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
  }]), { mode: 0o600 });
  chmodSync(tokensFile, 0o600);

  try {
  const successful = launch(tokensFile, false);
  let successfulPids: readonly number[] = [];
  let successfulStaticPort: number | null = null;
  let successfulRuntimePort: number | null = null;
  try {
    await waitForOutput(successful.child, successful.observation, () =>
      /serve: fresh dist\/ available at http:\/\/127\.0\.0\.1:\d+/u.test(successful.observation.output())
      && successful.observation.websocketUrl() !== null, 'successful launch');
    successfulStaticPort = successful.observation.staticPort();
    if (successfulStaticPort === null) throw new Error('The static listening line was absent.');
    successfulPids = successful.observation.descendantPids();
    expect(successfulPids).toHaveLength(3);
    const staticOrigin = 'http://127.0.0.1:' + String(successfulStaticPort);
    const websocketUrl = successful.observation.websocketUrl();
    if (websocketUrl === null) throw new Error('The runtime listening line was absent.');
    successfulRuntimePort = Number(new URL(websocketUrl).port);
    const stampResponse = await deadline(fetch(staticOrigin + '/vtt-handoff-artifact.json', { cache: 'no-store' }), 5_000, 'artifact fetch');
    expect(stampResponse.ok).toBe(true);
    const stamp = await stampResponse.json() as unknown;
    expect(stamp).toMatchObject({
      artifact: 'dist',
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      worker: { url: expect.stringMatching(/\.js$/u), sha256: expect.stringMatching(/^[0-9a-f]{64}$/u) },
    });
    const badHandshake = new WebSocket(websocketUrl, ['vtt.v1', 'bearer.invalid'], { origin: staticOrigin });
    await expect(deadline(new Promise<number>((resolveStatus, reject) => {
      badHandshake.once('unexpected-response', (_request, response) => resolveStatus(response.statusCode ?? 0));
      badHandshake.once('open', () => reject(new Error('Invalid launch token unexpectedly opened.')));
      badHandshake.once('error', () => undefined);
    }), 5_000, 'invalid launch authentication')).resolves.toBe(401);
    const socket = await deadline(new Promise<WebSocket>((resolveSocket, reject) => {
      const candidate = new WebSocket(websocketUrl, ['vtt.v1', 'bearer.' + token], { origin: staticOrigin });
      candidate.once('open', () => resolveSocket(candidate));
      candidate.once('error', reject);
    }), 5_000, 'runtime authentication');
    const messages = new Promise<readonly unknown[]>((resolveMessages, reject) => {
      const received: unknown[] = [];
      socket.on('message', (data, isBinary) => {
        try {
          if (isBinary) throw new Error('Launch probe received binary data.');
          received.push(JSON.parse(data.toString()) as unknown);
          if (received.length === 2) resolveMessages(received);
        } catch (error: unknown) { reject(error); }
      });
    });
    socket.send(JSON.stringify({ v: 1, id: '', method: 'session.open', params: { requestedRole: 'dm' } }));
    const [opened, snapshot] = await deadline(messages, 5_000, 'open response and initial snapshot');
    expect(opened).toMatchObject({ v: 1, id: '', ok: true });
    expect(snapshot).toMatchObject({ v: 1, event: 'scene.snapshot', seq: 1, data: { revision: 0 } });
    expect(successful.observation.output() + '\n' + successful.observation.errors()).not.toContain(token);
    socket.close();
  } finally {
    await stopProcessGroup(successful.child, successful.observation);
  }
  if (successfulStaticPort === null) throw new Error('The successful static port was not recorded.');
  if (successfulRuntimePort === null) throw new Error('The successful runtime port was not recorded.');
  expect(successfulPids.filter((pid) => existsSync('/proc/' + String(pid)))).toEqual([]);
  await provePortFree(successfulStaticPort, 'successful static port');
  await provePortFree(successfulRuntimePort, 'successful runtime port');

  const failed = launch(tokensFile, true);
  let failedStaticPort: number | null = null;
  let failedPids: readonly number[] = [];
  try {
    await waitForOutput(failed.child, failed.observation, () =>
      failed.observation.staticPort() !== null
      && /Injected VTT runtime startup failure/u.test(failed.observation.errors()), 'injected failed launch');
    failedStaticPort = failed.observation.staticPort();
    failedPids = failed.observation.descendantPids();
    expect(failedPids.length).toBeGreaterThanOrEqual(2);
    const result = await deadline(exited(failed.child), EXIT_DEADLINE_MS, 'failed launch exit');
    expect(result.code).not.toBe(0);
  } finally {
    await stopProcessGroup(failed.child, failed.observation);
  }
  if (failedStaticPort === null) throw new Error('The failed static port was not recorded.');
  expect(failedPids.filter((pid) => existsSync('/proc/' + String(pid)))).toEqual([]);
  await provePortFree(failedStaticPort, 'failed static port');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
