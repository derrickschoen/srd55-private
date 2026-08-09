import {
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('built local server boots SQLite OPFS and preserves a created character across reload', async ({
  page,
  request,
}) => {
  // Measured alone at 10.5 s on Chromium against the production server;
  // 10.5 s x 1.5 = 15.75 s, rounded up to 16 s.
  test.setTimeout(16_000);

  const documentResponse = await page.goto('/');
  expect(documentResponse).not.toBeNull();
  expect(documentResponse?.headers()['content-type']).toBe(
    'text/html; charset=utf-8',
  );
  expect(documentResponse?.headers()['x-content-type-options']).toBe('nosniff');
  expect(documentResponse?.headers()['cross-origin-opener-policy']).toBeUndefined();
  expect(documentResponse?.headers()['cross-origin-embedder-policy']).toBeUndefined();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 15_000,
  });

  const info = await page.evaluate(() => window.staticApp.info());
  expect(info.crossOriginIsolated).toBe(false);
  expect(info.vfsName).toBe('dnd-multiclass-spells-sahpool');
  expect(info.filename).toBe('/dnd-multiclass-spells.sqlite3');

  const assets = readdirSync('dist/assets');
  const javascriptFile = assets.find(
    (name) => name.startsWith('index-') && name.endsWith('.js'),
  );
  expect(javascriptFile).toBeDefined();
  if (javascriptFile === undefined) {
    throw new Error('The production build emitted no JavaScript entry asset.');
  }
  const javascriptResponse = await request.get(`/assets/${javascriptFile}`);
  expect(javascriptResponse.status()).toBe(200);
  expect(javascriptResponse.headers()['content-type']).toBe(
    'text/javascript; charset=utf-8',
  );

  const wasmFile = assets.find((name) => name.endsWith('.wasm'));
  expect(wasmFile).toBeDefined();
  if (wasmFile === undefined) {
    throw new Error('The production build emitted no SQLite wasm asset.');
  }
  const wasmResponse = await request.get(`/assets/${wasmFile}`);
  expect(wasmResponse.status()).toBe(200);
  expect(wasmResponse.headers()['content-type']).toBe('application/wasm');

  const routeResponse = await request.get('/characters/999/build');
  expect(routeResponse.status()).toBe(200);
  expect(routeResponse.headers()['content-type']).toBe(
    'text/html; charset=utf-8',
  );
  expect(await routeResponse.text()).toContain('<title>SRD-55</title>');

  const outsideDirectory = mkdtempSync(join(tmpdir(), 'srd-55-serve-check-'));
  const outsideFile = join(outsideDirectory, 'outside.txt');
  const linkedFile = join('dist', 'outside.txt');
  writeFileSync(outsideFile, 'must not be served');
  symlinkSync(outsideFile, linkedFile);
  try {
    const symlinkResponse = await request.get('/outside.txt');
    expect(symlinkResponse.status()).toBe(400);
    expect(await symlinkResponse.text()).not.toContain('must not be served');
  } finally {
    rmSync(linkedFile, { force: true });
    rmSync(outsideDirectory, { recursive: true, force: true });
  }

  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 15_000,
  });
  expect(await page.evaluate(() => window.staticApp.countCharacters())).toBe(0);
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.locator('[data-class-option]').first().click();
  await page.getByLabel('Character name').fill('Tunnel Keeper');
  await page.getByRole('button', { name: 'Create character' }).click();

  expect(await page.evaluate(() => window.staticApp.countCharacters())).toBe(1);

  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return {
      active: ready.active?.state,
      scope: ready.scope,
    };
  });
  expect(registration.active).toBe('activated');
  expect(registration.scope).toBe(`${new URL(page.url()).origin}/`);

  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 15_000,
  });
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 15_000,
  });
  expect(
    await page.evaluate(() => navigator.serviceWorker.controller !== null),
  ).toBe(true);
  await expect(page.getByRole('heading', { name: 'Tunnel Keeper' })).toBeVisible();
  expect(await page.evaluate(() => window.staticApp.countCharacters())).toBe(1);
});
