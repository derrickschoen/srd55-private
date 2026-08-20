import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cloudflaredUrl, parseEnv, validatePort } from './launcher-lib.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const children = [];
let stopping = false;

function prefixed(stream, prefix, inspect) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    inspect?.(chunk);
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) if (line) console.log(`[${prefix}] ${line}`);
  });
  stream.on('end', () => { if (pending) console.log(`[${prefix}] ${pending}`); });
}

function start(name, command, args, options = {}) {
  const { inspectStdout, inspectStderr, ...spawnOptions } = options;
  const child = spawn(command, args, { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'], detached: true, ...spawnOptions });
  children.push({ name, child });
  prefixed(child.stdout, name, inspectStdout);
  prefixed(child.stderr, name, inspectStderr);
  child.on('error', (error) => {
    console.error(`[${name}] failed to start: ${error.message}`);
    if (!stopping) void shutdown(1);
  });
  child.on('exit', (code, signal) => {
    console.log(`[${name}] exited code=${code ?? 'null'} signal=${signal ?? 'none'}`);
    if (!stopping) void shutdown(1);
  });
  console.log(`[launcher] started ${name} pid=${child.pid}`);
  return child;
}

async function waitForHttp(url, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`timed out waiting for ${url}`);
}

async function waitForCloudflared(child) {
  return new Promise((resolve, reject) => {
    let observed = '';
    const timeout = setTimeout(() => reject(new Error('cloudflared URL not found within 60 seconds')), 60_000);
    const inspect = (chunk) => {
      observed = (observed + chunk).slice(-8_192);
      const url = cloudflaredUrl(observed);
      if (url) { clearTimeout(timeout); resolve(url); }
    };
    prefixed(child.stderr, 'tunnel', inspect);
    child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`cloudflared exited before publishing a URL (code ${code})`)); });
    child.once('error', (error) => { clearTimeout(timeout); reject(error); });
  });
}

async function waitForNgrok(child) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline && child.exitCode === null) {
    try {
      const response = await fetch('http://127.0.0.1:4040/api/tunnels', { signal: AbortSignal.timeout(1_000) });
      const data = await response.json();
      const url = data.tunnels?.find((entry) => entry.proto === 'https')?.public_url;
      if (typeof url === 'string') return url;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('ngrok public URL not found within 60 seconds');
}

async function patchProbe(botToken) {
  if (!botToken) {
    console.log('[discord] PATCH /applications/@me skipped: client-credentials Bearer auth is not documented for this endpoint; set optional DISCORD_BOT_TOKEN for the documented bot-auth no-op probe.');
    return;
  }
  const response = await fetch('https://discord.com/api/v10/applications/@me', {
    method: 'PATCH',
    headers: { authorization: `Bot ${botToken}`, 'content-type': 'application/json' },
    body: '{}',
    signal: AbortSignal.timeout(15_000),
  });
  console.log(`[discord] documented PATCH /applications/@me no-op probe: HTTP ${response.status}`);
}

function manualPortalBlock(publicUrl, hasCredentials) {
  const target = new URL(publicUrl).host;
  console.log(`\n+---------------- DISCORD DEVELOPER PORTAL ----------------+
Portal: https://discord.com/developers/applications
Activities > URL Mappings
  PREFIX: /
  TARGET: ${target}
OAuth2 > Redirects
  Redirect URI: https://127.0.0.1
Activities > Settings
  Enable Activities: ON
  Supported Platforms: enable the platform(s) you will test
${hasCredentials ? 'Status: READY_FOR_PORTAL_CONFIGURATION' : 'Status: BLOCKED_ON_CREDENTIALS\nCreate a throwaway application, complete the fields above, then copy\nOAuth2 > Client ID and Client Secret into tools/discord-launcher/.env.'}
+----------------------------------------------------------+\n`);
}

async function shutdown(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  console.log('[launcher] shutting down');
  const isRunning = (child) => child.exitCode === null && child.signalCode === null;
  for (const { child } of children) if (isRunning(child)) child.kill('SIGTERM');
  await Promise.race([
    Promise.all(children.map(({ child }) => isRunning(child) ? new Promise((resolve) => child.once('exit', resolve)) : undefined)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  for (const { child } of children) if (isRunning(child)) child.kill('SIGKILL');
  await new Promise((resolve) => setTimeout(resolve, 100));
  for (const { name, child } of children) {
    let alive = false;
    try { process.kill(child.pid, 0); alive = true; } catch {}
    console.log(`[launcher] teardown ${name} pid=${child.pid}: ${alive ? 'STILL_RUNNING' : 'stopped'}`);
    if (alive) exitCode = 1;
  }
  process.exit(exitCode);
}

async function main() {
  const fileValues = await readFile(join(directory, '.env'), 'utf8').then(parseEnv).catch((error) => {
    if (error.code === 'ENOENT') return {};
    throw error;
  });
  const env = { ...fileValues, ...Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined)) };
  const port = validatePort(env.PORT || '5173');
  const tunnel = env.TUNNEL || 'cloudflared';
  if (!['cloudflared', 'ngrok'].includes(tunnel)) throw new Error(`invalid TUNNEL: ${tunnel}`);
  const childEnv = { ...process.env, PORT: String(port), TOKEN_PORT: String(port + 1), RELAY_PORT: String(port + 2) };

  start('token', process.execPath, ['token-server.mjs'], { env: { ...childEnv, DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID || '', DISCORD_CLIENT_SECRET: env.DISCORD_CLIENT_SECRET || '' } });
  start('relay', process.execPath, ['relay-server.mjs'], { env: childEnv });
  start('client', process.execPath, ['client-server.mjs'], { env: childEnv });
  await Promise.all([
    waitForHttp(`http://127.0.0.1:${port}/health`),
    waitForHttp(`http://127.0.0.1:${port + 1}/health`),
    waitForHttp(`http://127.0.0.1:${port + 2}/health`),
  ]);

  let publicUrl;
  if (tunnel === 'cloudflared') {
    const child = spawn('/home/vagrant/.local/bin/cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`], { cwd: directory, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    children.push({ name: 'tunnel', child });
    prefixed(child.stdout, 'tunnel');
    child.on('exit', (code, signal) => {
      console.log(`[tunnel] exited code=${code ?? 'null'} signal=${signal ?? 'none'}`);
      if (!stopping) void shutdown(1);
    });
    child.on('error', (error) => {
      console.error(`[tunnel] failed to start: ${error.message}`);
      if (!stopping) void shutdown(1);
    });
    console.log(`[launcher] started tunnel pid=${child.pid}`);
    publicUrl = await waitForCloudflared(child);
  } else {
    if (!env.NGROK_AUTHTOKEN) {
      const configPath = join(process.env.HOME || '', '.config', 'ngrok', 'ngrok.yml');
      const hasConfiguredToken = await readFile(configPath, 'utf8').then((contents) => /^authtoken:\s*\S+/m.test(contents)).catch(() => false);
      console.log(`[tunnel] NGROK_AUTHTOKEN is not set; local ngrok config auth: ${hasConfiguredToken ? 'present' : 'not detected'}; anonymous behavior is not a production contract.`);
    }
    const args = ['http', String(port), '--log', 'stdout'];
    if (env.NGROK_AUTHTOKEN) args.push('--authtoken', env.NGROK_AUTHTOKEN);
    if (env.NGROK_DOMAIN) args.push('--url', env.NGROK_DOMAIN.startsWith('http') ? env.NGROK_DOMAIN : `https://${env.NGROK_DOMAIN}`);
    const child = start('tunnel', '/usr/local/bin/ngrok', args);
    publicUrl = await waitForNgrok(child);
  }

  console.log(`[launcher] public URL: ${publicUrl}`);
  await patchProbe(env.DISCORD_BOT_TOKEN || '').catch((error) => console.error(`[discord] PATCH probe failed safely: ${error.message}`));
  const hasCredentials = Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET);
  manualPortalBlock(publicUrl, hasCredentials);
  console.log(`[launcher] ${hasCredentials ? 'READY' : 'BLOCKED_ON_CREDENTIALS'}; press Ctrl-C to stop (exit 0).`);
}

process.once('SIGINT', () => void shutdown(0));
process.once('SIGTERM', () => void shutdown(0));
main().catch((error) => { console.error(`[launcher] fatal: ${error.message}`); void shutdown(1); });
