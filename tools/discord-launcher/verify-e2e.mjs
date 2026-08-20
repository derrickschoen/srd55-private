import { spawn } from 'node:child_process';

const selectedTunnel = process.env.E2E_TUNNEL || 'cloudflared';
const launcher = spawn(process.execPath, ['launcher.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, TUNNEL: selectedTunnel, PORT: '5173', DISCORD_CLIENT_ID: '', DISCORD_CLIENT_SECRET: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let output = '';
let publicUrl;
const childPids = new Map();

function capture(chunk) {
  output += chunk;
  for (const match of output.matchAll(/\[launcher\] started (\w+) pid=(\d+)/g)) childPids.set(match[1], Number(match[2]));
  publicUrl ??= output.match(/\[launcher\] public URL: (https:\/\/[^\s]+)/)?.[1];
}

launcher.stdout.setEncoding('utf8');
launcher.stderr.setEncoding('utf8');
launcher.stdout.on('data', capture);
launcher.stderr.on('data', capture);

async function waitForPublicUrl() {
  const deadline = Date.now() + 70_000;
  while (!publicUrl && Date.now() < deadline && launcher.exitCode === null) await new Promise((resolve) => setTimeout(resolve, 100));
  if (!publicUrl) throw new Error('launcher did not publish a tunnel URL');
  return publicUrl;
}

async function fetchEventually(url, options) {
  const deadline = Date.now() + 60_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(5_000) });
      if (response.status < 500) return response;
      lastError = new Error(`temporary HTTP ${response.status}`);
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError;
}

async function relayProbe(url) {
  return new Promise((resolve, reject) => {
    const requestId = `e2e-${Date.now()}`;
    const socket = new WebSocket(url.replace('https:', 'wss:') + '/relay');
    const timeout = setTimeout(() => { socket.close(); reject(new Error('relay timed out')); }, 10_000);
    socket.addEventListener('open', () => socket.send(JSON.stringify({ v: 1, type: 'e2e.echo', requestId })));
    socket.addEventListener('message', ({ data }) => {
      clearTimeout(timeout);
      const envelope = JSON.parse(data);
      socket.close();
      if (envelope.v === 1 && envelope.type === 'e2e.echo' && envelope.requestId === requestId) resolve(envelope);
      else reject(new Error('relay echoed the wrong envelope'));
    });
    socket.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('relay connection failed')); });
  });
}

async function relayEventually(url) {
  const deadline = Date.now() + 60_000;
  let lastError;
  while (Date.now() < deadline) {
    try { return await relayProbe(url); } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw lastError;
}

let failure;
try {
  const url = await waitForPublicUrl();
  console.log(`tunnel URL parsed: ${url}`);
  const page = await fetchEventually(url + '/');
  const pageText = await page.text();
  if (!page.ok || !pageText.includes('activity client stub alive')) throw new Error(`stub check failed: HTTP ${page.status}`);
  console.log(`public stub reachable: HTTP ${page.status}, marker present`);
  if (selectedTunnel === 'ngrok') {
    const browserResponse = await fetchEventually(url + '/', {
      headers: { accept: 'text/html', 'user-agent': 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36' },
    });
    const browserHtml = await browserResponse.text();
    console.log(`ngrok browser interstitial observed: ${browserHtml.includes('ERR_NGROK_6024') || browserHtml.includes('ngrok-skip-browser-warning')}`);
  }

  const token = await fetchEventually(url + '/api/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code: 'probe' }),
  });
  const tokenBody = await token.json();
  if (token.status !== 424 || tokenBody.error !== 'missing_discord_credentials') throw new Error(`token check failed: HTTP ${token.status}`);
  console.log(`credential-free token response: HTTP ${token.status} ${JSON.stringify(tokenBody)}`);

  const envelope = await relayEventually(url);
  console.log(`relay echo round-trip: v=${envelope.v} type=${envelope.type}`);
} catch (error) {
  failure = error;
} finally {
  const exited = launcher.exitCode === null
    ? new Promise((resolve) => launcher.once('exit', (code, signal) => resolve({ code, signal })))
    : Promise.resolve({ code: launcher.exitCode, signal: launcher.signalCode });
  if (launcher.exitCode === null) launcher.kill('SIGINT');
  const result = await exited;
  console.log(`launcher SIGINT exit: code=${result.code} signal=${result.signal ?? 'none'}`);
  for (const [name, pid] of childPids) {
    let alive = false;
    try { process.kill(pid, 0); alive = true; } catch {}
    console.log(`orphan check ${name} pid=${pid}: ${alive ? 'STILL RUNNING' : 'not running'}`);
    if (alive) failure ??= new Error(`${name} remained alive`);
  }
  try {
    await fetch('http://127.0.0.1:5173/health', { signal: AbortSignal.timeout(500) });
    failure ??= new Error('port 5173 still accepted connections');
  } catch {
    console.log('local listener check: ports closed');
  }
  const evidence = output.split(/\r?\n/).filter((line) => /public URL|BLOCKED_ON_CREDENTIALS|teardown .*: stopped/.test(line));
  for (const line of evidence) console.log(line);
}

if (failure) throw failure;
