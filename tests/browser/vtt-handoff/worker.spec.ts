import { expect, test } from '@playwright/test';
import type {} from '../../../src/vtt/handoff/worker-harness';

test('drives the v1 handoff across an actual module Worker', async ({ page }, testInfo) => {
  const workerUrls: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script' && /worker-entry/u.test(request.url())) workerUrls.push(request.url());
  });
  await page.goto('/vtt-handoff');
  const state = page.getByTestId('handoff-state');
  await expect(state).toHaveAttribute('data-status', 'open');

  const initial = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  });
  expect(initial.lastResponse).toMatchObject({ v: 1, id: '', ok: true });
  expect(initial.eventSequences.length).toBeGreaterThan(1);
  expect(initial.eventSequences).toEqual(initial.eventSequences.map((_sequence, index) => index + 1));
  expect(initial.eventRevisions[0]).toBe(0);
  expect(initial.eventRevisions.at(-1)).toBeGreaterThan(0);
  expect(initial.snapshot?.revision).toBe(initial.eventRevisions.at(-1));
  expect(workerUrls).toHaveLength(1);

  const correlated = await page.evaluate(async () => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return Promise.all([
      api.request({ v: 1, id: 'snapshot:a', method: 'scene.snapshot', params: {} }),
      api.request({ v: 1, id: 'snapshot:b', method: 'scene.snapshot', params: {} }),
    ]);
  });
  expect(correlated.map((response) => response.id)).toEqual(['snapshot:a', 'snapshot:b']);
  expect(correlated.every((response) => response.ok)).toBe(true);

  const invalid = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.request({ v: 1, id: 'invalid-door', method: 'door.set', params: { doorId: 42, open: true } });
  });
  expect(invalid).toMatchObject({ id: 'invalid-door', ok: false, error: { code: 'INVALID_REQUEST' } });
  await expect(page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.malformed();
  })).resolves.toBe('INVALID_JSON');

  const beforeMutation = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  });
  const mutation = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.request({
      v: 1, id: 'door:once', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: true },
    });
  });
  expect(mutation).toMatchObject({ id: 'door:once', ok: true });
  if (!mutation.ok || typeof mutation.result.revision !== 'number') throw new Error('Expected a mutation revision.');
  const afterMutation = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  });
  expect(afterMutation.eventSequences).toHaveLength(beforeMutation.eventSequences.length + 1);
  expect(afterMutation.eventRevisions.at(-1)).toBe(mutation.result.revision);
  expect(afterMutation.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(true);

  const duplicate = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.request({
      v: 1, id: 'door:once', method: 'door.set',
      params: { doorId: 'object:two-room-door', open: false },
    });
  });
  expect(duplicate).toMatchObject({ id: 'door:once', ok: false, error: { code: 'DUPLICATE_MUTATION' } });
  expect((await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state();
  })).eventSequences).toEqual(afterMutation.eventSequences);

  const reconnected = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.reconnect();
  });
  expect(reconnected.generation).toBe(2);
  expect(reconnected.eventSequences.length).toBeGreaterThan(1);
  expect(reconnected.eventSequences).toEqual(reconnected.eventSequences.map((_sequence, index) => index + 1));
  expect(reconnected.eventRevisions[0]).toBe(0);
  expect(reconnected.eventRevisions.at(-1)).toBeGreaterThan(0);
  expect(reconnected.snapshot?.doors.find((door) => door.id === 'object:two-room-door')?.open).toBe(false);
  expect(workerUrls).toHaveLength(2);

  await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    api.dispose();
  });
  await expect(state).toHaveAttribute('data-status', 'disposed');
  const artifact = await page.evaluate(() => {
    const api = window.__VTT_HANDOFF_HARNESS__;
    if (api === undefined) throw new Error('The VTT handoff harness is not mounted.');
    return api.state().artifact;
  });
  const expectedArtifact = process.env.VTT_HANDOFF_ARTIFACT;
  expect(artifact.artifact).toBe(expectedArtifact);
  if (expectedArtifact === 'dev') {
    expect(artifact).toEqual({ artifact: 'dev' });
  } else {
    expect(artifact.artifact).not.toBe('dev');
    expect(artifact.commit).toMatch(/^[0-9a-f]{40}$/u);
    expect(artifact.worker?.sha256).toMatch(/^[0-9a-f]{64}$/u);
    expect(new URL(workerUrls[0]!).pathname).toBe(artifact.worker?.url);
  }
  const record = JSON.stringify({ artifact, pageUrl: page.url(), workerUrls });
  await testInfo.attach('vtt-handoff-artifact', { body: record, contentType: 'application/json' });
  console.log(`artifact=${expectedArtifact} page=${page.url()} worker=${workerUrls.join(',')}`);
});
