#!/usr/bin/env node
// Capture reference screenshots of the top-down VTT for art requests.
//
//   node art/requests/capture-screenshots.mjs --dist <built dist dir> [--port 4590] [--mode plain|emberkeep]
//
// `plain` captures the shipped starter art. `emberkeep` swaps, in the browser
// only, every starter-art data URI whose bytes equal a public/assets/art PNG for
// the matching delivery in art/incoming (a mock integration for review; nothing
// in the app or its pins changes). Output goes to art/requests/screenshots/,
// which is gitignored because tracked binaries are rejected by
// tests/unit/source-is-greppable.test.ts.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
const dist = resolve(arg('--dist', join(repo, 'dist')));
const port = Number(arg('--port', '4590'));
const mode = arg('--mode', 'plain');
const route = arg('--route', '/vtt?encounter=d365');
const outDir = join(here, 'screenshots');
if (!existsSync(join(dist, 'index.html'))) throw new Error(`No built app at ${dist}; run npm run build first.`);
if (port === 4173) throw new Error('Port 4173 is the owner\'s live app; pick another port.');
mkdirSync(outDir, { recursive: true });

// starter asset file (public/assets/art) -> delivered Emberkeep file (art/incoming)
const EMBERKEEP_MAP = {
  'map-floor-stone-v1.png': 'emberkeep-floor-stone', 'map-floor-stone-1-v1.png': 'emberkeep-floor-stone',
  'map-floor-stone-2-v1.png': 'emberkeep-floor-stone', 'map-floor-stone-3-v1.png': 'emberkeep-floor-stone',
  'map-wall-stone-v1.png': 'emberkeep-wall-stone', 'map-wall-stone-n-v1.png': 'emberkeep-wall-stone',
  'map-wall-stone-s-v1.png': 'emberkeep-wall-stone', 'map-wall-stone-e-v1.png': 'emberkeep-wall-stone',
  'map-wall-stone-w-v1.png': 'emberkeep-wall-stone', 'map-wall-stone-ne-v1.png': 'emberkeep-wall-stone',
  'map-wall-stone-nw-v1.png': 'emberkeep-wall-stone', 'map-wall-stone-se-v1.png': 'emberkeep-wall-stone',
  'map-wall-stone-sw-v1.png': 'emberkeep-wall-stone',
  'map-door-wood-v1.png': 'emberkeep-door-oak', 'map-door-wood-e-v1.png': 'emberkeep-door-oak',
  'map-door-wood-w-v1.png': 'emberkeep-door-oak', 'map-door-wood-s-v1.png': 'emberkeep-door-oak',
  'terrain-crate-v1.png': 'emberkeep-crate', 'terrain-pillar-v1.png': 'emberkeep-pillar',
  'terrain-rubble-v1.png': 'emberkeep-rubble',
  'token-pc-fighter-v1.png': 'emberkeep-fighter', 'token-party-fighter-v1.png': 'emberkeep-fighter',
  'token-foe-fighter-v1.png': 'emberkeep-fighter',
  'token-pc-wizard-v1.png': 'emberkeep-wizard', 'token-party-wizard-v1.png': 'emberkeep-wizard',
  'token-foe-wizard-v1.png': 'emberkeep-wizard',
  'token-pc-rogue-v1.png': 'emberkeep-rogue', 'token-party-rogue-v1.png': 'emberkeep-rogue',
  'token-foe-rogue-v1.png': 'emberkeep-rogue',
  'token-pc-cleric-v1.png': 'emberkeep-cleric', 'token-party-cleric-v1.png': 'emberkeep-cleric',
  'token-foe-cleric-v1.png': 'emberkeep-cleric',
  'token-monster-goblin-warrior-v1.png': 'emberkeep-goblin', 'token-monster-skeleton-v1.png': 'emberkeep-skeleton',
  'token-monster-wolf-v1.png': 'emberkeep-wolf', 'token-monster-ogre-v1.png': 'emberkeep-ogre',
};

function emberkeepReplacements() {
  const incoming = join(repo, 'art', 'incoming');
  const delivered = readdirSync(incoming).filter((name) => name.endsWith('.png'));
  const bySlug = new Map(delivered.map((name) => [name.replace(/^[0-9a-f-]{36}-/u, '').replace(/\.png$/u, ''), name]));
  const map = {};
  let missing = [];
  for (const [starter, slug] of Object.entries(EMBERKEEP_MAP)) {
    const deliveredName = bySlug.get(slug);
    const starterPath = join(repo, 'public', 'assets', 'art', starter);
    if (deliveredName === undefined || !existsSync(starterPath)) { missing.push(`${starter}<-${slug}`); continue; }
    const from = `data:image/png;base64,${readFileSync(starterPath).toString('base64')}`;
    const to = `data:image/png;base64,${readFileSync(join(incoming, deliveredName)).toString('base64')}`;
    map[from] = to;
  }
  if (missing.length > 0) console.warn(`unmapped (skipped): ${missing.join(', ')}`);
  return map;
}

function waitForPort(p, attempts = 60) {
  return new Promise((resolveWait, reject) => {
    const tryOnce = (left) => {
      const socket = createConnection({ host: '127.0.0.1', port: p });
      socket.once('connect', () => { socket.destroy(); resolveWait(); });
      socket.once('error', () => { socket.destroy(); if (left <= 0) reject(new Error(`port ${p} never opened`)); else setTimeout(() => tryOnce(left - 1), 500); });
    };
    tryOnce(attempts);
  });
}

const preview = spawn('npx', ['vite', 'preview', '--configLoader', 'runner', '--outDir', dist, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
  cwd: dirname(dist), stdio: ['ignore', 'pipe', 'pipe'], detached: true,
});
preview.stderr.on('data', (d) => process.stderr.write(`[preview] ${d}`));
try {
  await waitForPort(port);
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  if (mode === 'emberkeep') {
    const replacements = emberkeepReplacements();
    console.log(`emberkeep mode: ${Object.keys(replacements).length} starter data URIs mapped`);
    await context.addInitScript((map) => {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      Object.defineProperty(HTMLImageElement.prototype, 'src', {
        configurable: true,
        get() { return descriptor.get.call(this); },
        set(value) { descriptor.set.call(this, Object.prototype.hasOwnProperty.call(map, value) ? map[value] : value); },
      });
    }, replacements);
  }
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle' });
  // The bundled sample dungeon sits behind an explicit load button (see tests/browser/vtt-encounter.spec.ts).
  const proceed = page.locator('#browser-support-continue');
  if (await proceed.count() > 0 && await proceed.isVisible()) await proceed.click();
  const load = page.getByRole('button', { name: 'Load bundled dungeon and party' });
  await load.waitFor({ state: 'visible', timeout: 30_000 }); // the app boots asynchronously after network idle
  await load.click();
  const board = page.locator('.encounter-board').first();
  await board.waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForTimeout(2500);
  const stem = mode === 'emberkeep' ? 'emberkeep-integrated-mock' : 'current-topdown-ui';
  await page.screenshot({ path: join(outDir, `${stem}-page.png`), fullPage: false });
  await board.screenshot({ path: join(outDir, `${stem}-board.png`) });
  console.log(`wrote ${stem}-page.png and ${stem}-board.png to ${outDir}`);
  await browser.close();
} finally {
  try { process.kill(-preview.pid, 'SIGTERM'); } catch { preview.kill('SIGTERM'); }
}
