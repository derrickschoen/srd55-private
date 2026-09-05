import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface ImportedFixtureBundle {
  readonly bytes: string;
  readonly sessionId: string;
}

async function createFixtureBundleInBrowser(page: Page): Promise<ImportedFixtureBundle> {
  return page.evaluate(async () => {
    function record(value: unknown, label: string): Record<string, unknown> {
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError(`${label} is not an object.`);
      }
      return value as Record<string, unknown>;
    }
    function invoke(
      owner: Record<string, unknown>,
      name: string,
      args: readonly unknown[] = [],
    ): unknown {
      const fn = owner[name];
      if (typeof fn !== 'function') throw new TypeError(`${name} is not callable.`);
      return Reflect.apply(fn, owner, args);
    }
    async function loadModule(path: string): Promise<Record<string, unknown>> {
      return record(await import(/* @vite-ignore */ path), `module ${path}`);
    }
    const [fixtureModule, randomModule, sessionModule, valuesModule] = await Promise.all([
      loadModule('/tests/fixtures/vtt-option-path-encounter.ts'),
      loadModule('/src/combat/random.ts'),
      loadModule('/src/vtt/session-persistence.ts'),
      loadModule('/src/combat/values.ts'),
    ]);
    const state = record(
      invoke(fixtureModule, 'createOptionPathFixtureEncounter'),
      'option-path fixture encounter',
    );
    const combatants = state['combatants'];
    if (!Array.isArray(combatants)) throw new TypeError('Encounter combatants are absent.');
    const controllers = combatants.map((candidate) => {
      const profile = record(record(candidate, 'encounter combatant')['profile'], 'profile');
      if (typeof profile['id'] !== 'string') throw new TypeError('Controller profile id is absent.');
      return {
        combatantId: profile['id'],
        controllerId: `browser-fixture:${profile['id']}:human`,
        kind: 'human',
        generation: 0,
      };
    }).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
    const sessionId = invoke(valuesModule, 'encounterSessionId', ['d512-option-paths']);
    const branchId = invoke(valuesModule, 'encounterBranchId', ['branch:d512-option-paths']);
    const Store = sessionModule['MemoryBrowserSessionStore'];
    if (typeof Store !== 'function') throw new TypeError('MemoryBrowserSessionStore is absent.');
    const store: unknown = Reflect.construct(Store, []);
    const Mirror = sessionModule['MemoryMirrorSink'];
    if (typeof Mirror !== 'function') throw new TypeError('MemoryMirrorSink is absent.');
    const mirror: unknown = Reflect.construct(Mirror, []);
    const rng = invoke(randomModule, 'mulberry32', [0x0d51_2001]);
    const Journal = sessionModule['EncounterSessionJournal'];
    if (typeof Journal !== 'function') throw new TypeError('EncounterSessionJournal is absent.');
    const create = Reflect.get(Journal, 'create');
    if (typeof create !== 'function') throw new TypeError('EncounterSessionJournal.create is absent.');
    record(Reflect.apply(create, Journal, [{
      sessionId,
      branchId,
      encounterState: state,
      coordinatorState: {
        requestSequence: 1,
        pendingRequest: null,
        pendingCommand: null,
        continuation: { kind: 'idle' },
        pause: { kind: 'interrupted' },
      },
      controllers,
      rng,
      store,
      mirror,
    }]), 'created encounter journal');
    const bytes = invoke(sessionModule, 'exportSavedSession', [store, sessionId]);
    if (typeof bytes !== 'string' || typeof sessionId !== 'string') {
      throw new TypeError('Fixture session export is malformed.');
    }
    return { bytes, sessionId };
  });
}

async function mountImportedSession(page: Page, boardSnapshotMode: boolean): Promise<void> {
  await page.goto('/vtt?encounter=reference&view=dm&session=d512-bootstrap');
  const bundle = await createFixtureBundleInBrowser(page);
  const manager = page.locator('.dm-save-manager');
  const chooserPromise = page.waitForEvent('filechooser');
  await manager.getByRole('button', { name: 'Upload save file', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({
    name: 'd512-option-paths.vtt.json',
    mimeType: 'application/json',
    buffer: Buffer.from(bundle.bytes, 'utf8'),
  });
  const saveId = `browser:session:${bundle.sessionId}`;
  const row = manager.locator(`.dm-save-row[data-save-id=${JSON.stringify(saveId)}]`);
  await expect(row).toBeVisible();
  await Promise.all([
    page.waitForURL((url) => url.searchParams.get('session') === bundle.sessionId),
    row.getByRole('button', { name: 'Load', exact: true }).click(),
  ]);
  if (boardSnapshotMode) {
    await page.goto(`/vtt?encounter=reference&view=dm&boardSnapshot=1&session=${bundle.sessionId}`);
  }
}

test('snapshot DM board captures at least two labeled engine movement options', async ({ page }, testInfo) => {
  await mountImportedSession(page, true);
  const board = page.locator('.encounter-board');
  await expect(board).toHaveAttribute('data-board-audience', 'dm');
  await expect.poll(async () => Number(await board.getAttribute('data-option-paths'))).toBeGreaterThanOrEqual(2);
  await expect(board.locator('.encounter-option-path')).toHaveCount(
    Number(await board.getAttribute('data-option-paths')),
  );
  await expect(board.locator('.encounter-option-polyline')).toHaveCount(
    Number(await board.getAttribute('data-option-paths')),
  );
  await expect(board.locator('.encounter-option-destination')).not.toHaveCount(0);
  await expect(board.locator('.encounter-option-opportunity-arrow')).not.toHaveCount(0);
  await expect(board.locator('.encounter-option-segment-hazard')).not.toHaveCount(0);
  await expect(board.locator('[data-option-path-legend="true"]')).toBeVisible();
  await board.screenshot({ path: testInfo.outputPath('d512-option-paths.png') });
});

test('human DM option paths are absent until the default-off toggle is enabled', async ({ page }) => {
  await mountImportedSession(page, false);
  const toggle = page.getByRole('checkbox', { name: 'Show engine movement options' });
  const board = page.locator('.encounter-board');
  await expect(toggle).not.toBeChecked();
  await expect(board).not.toHaveAttribute('data-option-paths', /.+/u);
  await toggle.check();
  await expect.poll(async () => Number(await board.getAttribute('data-option-paths'))).toBeGreaterThanOrEqual(2);
});
