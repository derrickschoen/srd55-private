import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from 'vitest';
import { WebSocket } from 'ws';

test('launches the opt-in runtime beside a fresh stamped dist and cleans up its child', async () => {
  mkdirSync(resolve('.tmp'), { recursive: true });
  const root = mkdtempSync(resolve('.tmp/vtt-runtime-launch-'));
  const token = 'supervisor-launch-secret';
  const tokensFile = resolve(root, 'tokens.json');
  writeFileSync(tokensFile, JSON.stringify([{
    tokenSha256: createHash('sha256').update(token).digest('hex'), role: 'dm',
  }]), { mode: 0o600 });
  chmodSync(tokensFile, 0o600);
  const serve = spawn('npm', ['run', 'serve', '--', '--vtt-runtime', '--port', '0'], {
    cwd: process.cwd(),
    env: { ...process.env, VTT_RUNTIME_TOKENS_FILE: tokensFile, VTT_RUNTIME_PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let errors = '';
  serve.stdout.on('data', (chunk: Buffer) => { output += chunk.toString(); });
  serve.stderr.on('data', (chunk: Buffer) => { errors += chunk.toString(); });
  try {
    const addresses = await new Promise<{ readonly staticOrigin: string; readonly websocketUrl: string }>((resolveAddresses, reject) => {
      const inspect = (): void => {
        const staticMatch = /serve: fresh dist\/ available at (http:\/\/127\.0\.0\.1:\d+)/u.exec(output);
        const runtimeMatch = /vtt-runtime: listening (ws:\/\/127\.0\.0\.1:\d+\/vtt\/v1)/u.exec(output);
        if (staticMatch?.[1] !== undefined && runtimeMatch?.[1] !== undefined) {
          resolveAddresses({ staticOrigin: staticMatch[1], websocketUrl: runtimeMatch[1] });
        }
      };
      serve.stdout.on('data', inspect);
      serve.once('exit', (code) => reject(new Error(`serve exited ${String(code)}: ${errors}`)));
      serve.once('error', reject);
    });
    const stampResponse = await fetch(`${addresses.staticOrigin}/vtt-handoff-artifact.json`, { cache: 'no-store' });
    expect(stampResponse.ok).toBe(true);
    const stamp = await stampResponse.json() as unknown;
    expect(stamp).toMatchObject({
      artifact: 'dist',
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      worker: { url: expect.stringMatching(/\.js$/u), sha256: expect.stringMatching(/^[0-9a-f]{64}$/u) },
    });
    const badHandshake = new WebSocket(addresses.websocketUrl, ['vtt.v1', 'bearer.invalid'], { origin: addresses.staticOrigin });
    await expect(new Promise<number>((resolveStatus, reject) => {
      badHandshake.once('unexpected-response', (_request, response) => resolveStatus(response.statusCode ?? 0));
      badHandshake.once('open', () => reject(new Error('Invalid launch token unexpectedly opened.')));
      badHandshake.once('error', () => undefined);
    })).resolves.toBe(401);
    const socket = await new Promise<WebSocket>((resolveSocket, reject) => {
      const candidate = new WebSocket(addresses.websocketUrl, ['vtt.v1', `bearer.${token}`], { origin: addresses.staticOrigin });
      candidate.once('open', () => resolveSocket(candidate));
      candidate.once('error', reject);
    });
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
    const [opened, snapshot] = await messages;
    expect(opened).toMatchObject({ v: 1, id: '', ok: true });
    expect(snapshot).toMatchObject({ v: 1, event: 'scene.snapshot', seq: 1, data: { revision: 0 } });
    expect(`${output}\n${errors}`).not.toContain(token);
    socket.close();

    const exited = new Promise<void>((resolveExit) => serve.once('exit', () => resolveExit()));
    serve.kill('SIGTERM');
    await exited;
    await expect(fetch(addresses.websocketUrl.replace(/^ws:/u, 'http:'))).rejects.toThrow();
  } finally {
    if (serve.exitCode === null && serve.signalCode === null) serve.kill('SIGKILL');
    rmSync(root, { recursive: true, force: true });
  }
});
