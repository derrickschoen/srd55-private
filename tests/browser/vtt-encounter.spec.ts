import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

async function confirmChoice(page: Page, label: string): Promise<void> {
  await page.getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: 'Confirm choice' }).click();
}

async function expectActive(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('heading', { name: `Active PC: ${name}` })).toBeVisible();
  await expect(page.locator('.encounter-token[data-active="true"]')).toHaveText(name);
}

async function resetHome(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 65_000,
  });
}

test('DM loads the bundled D365 dungeon and RPC-authored party into room 1', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await resetHome(page);
  await page.goto('/vtt?encounter=d365');
  await expect(page.getByRole('heading', { name: 'D365 sample dungeon' })).toBeVisible({
    timeout: 65_000,
  });
  await page.getByRole('button', { name: 'Load bundled dungeon and party' }).click();

  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 65_000,
  });
  await expect(page.locator('.adventuring-day-status')).toHaveText(
    'Adventuring day — room 1 of 4 · 2024 rules',
  );
  for (const name of ['Mirel Ash', 'Orin Reed', 'Brann Vale', 'Sera Dawn']) {
    await expect(
      page.locator('.encounter-token[data-kind="player_character"]', { hasText: name }),
    ).toBeVisible();
  }
  await expect(
    page.locator('.encounter-token[data-kind="monster"]', { hasText: 'Goblin Warrior' }),
  ).toHaveCount(2);
  await expect(
    page.locator('.encounter-token[data-kind="monster"]', { hasText: 'Wolf' }),
  ).toHaveCount(2);
  await expect(page.locator('.encounter-board')).toBeVisible();
});

test('DM composes stored builder characters and each PC defaults to human control', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await resetHome(page);
  const names = await page.evaluate(async () => {
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.guidedClassOptions', {});
    const fighter = classes.find((candidate) => candidate.name === 'Fighter');
    if (fighter === undefined) throw new Error('Bundled Fighter is missing.');
    const origins = await window.appRpc.call<
      { readonly kind: 'species' },
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.originOptions', { kind: 'species' });
    const human = origins.find((candidate) => candidate.name === 'Human');
    if (human === undefined) throw new Error('Bundled Human is missing.');
    const createdNames = ['Stored Rowan', 'Stored Sable', 'Stored Tamsin'];
    for (const name of createdNames) {
      const character = await window.appRpc.call<
        { readonly name: string; readonly class_content_key: string },
        { readonly id: number }
      >('queries.characters.createGuided', {
        name,
        class_content_key: fighter.content_key,
      });
      await window.appRpc.call('queries.characters.applyOrigin', {
        character_id: character.id,
        kind: 'species',
        content_key: human.content_key,
      });
    }
    return createdNames;
  });

  await page.goto('/vtt?compose=stored');
  await expect(
    page.getByRole('heading', { name: 'Build an encounter from stored characters' }),
  ).toBeVisible({ timeout: 65_000 });
  for (const name of names) {
    await page.getByRole('checkbox', { name: new RegExp(`^${name} —`, 'u') }).check();
  }
  await expect(page.getByRole('button', { name: 'Start DM encounter' })).toBeEnabled();
  await page.getByRole('button', { name: 'Start DM encounter' }).click();

  await expect(page.getByRole('heading', { name: 'DM controls' })).toBeVisible();
  await expect(page.locator('.player-encounter')).toHaveCount(0);
  for (const name of names) {
    await expect(page.getByLabel(`${name} controller`)).toHaveValue('human');
    await expect(page.getByLabel(`${name} controller`)).toBeEnabled();
    await expect(
      page.locator('.encounter-token[data-kind="player_character"]', { hasText: name }),
    ).toBeVisible();
  }
  await expect(page.locator('.adventuring-day-status')).toHaveText(
    'Adventuring day — room 1 of 4 · 2024 rules',
  );
  await expect(page.getByRole('heading', { name: 'Short Rest before next room' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Take Short Rest and enter next room' })).toBeVisible();
  await page.getByRole('button', { name: 'End room and enter next room' }).click();
  await expect(page.locator('.adventuring-day-status')).toHaveAttribute('data-room', '2');
  for (const name of names) {
    await expect(page.getByLabel(`${name} controller`)).toHaveValue('human');
    await expect(page.getByLabel(`${name} controller`)).toBeEnabled();
  }
});

test('M38-PLAYER-NO-DM-CONTROLS and two local windows complete the resumable reference flow', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/vtt?encounter=reference&view=player&session=increment-6-browser');
  await expect(page.getByRole('heading', { name: 'Reference encounter' })).toBeVisible({
    timeout: 60_000,
  });

  const popup = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Open local DM window' }).click();
  const dm = await popup;
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute(
    'data-state',
    'connected',
  );

  await expect(page.getByRole('button', { name: 'Undo last' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Apply ADJUDICATED override' })).toHaveCount(0);

  await expectActive(page, 'Reference Fighter');
  await confirmChoice(page, 'Attack');
  await confirmChoice(page, 'End turn');

  await expectActive(page, 'Reference Cleric');
  await confirmChoice(page, 'Sacred Flame');
  await confirmChoice(page, 'End turn');

  await expectActive(page, 'Reference Wizard');
  await page.getByRole('button', { name: 'Shatter', exact: true }).click();
  const board = page.locator('.encounter-board');
  const box = await board.boundingBox();
  if (box === null) throw new Error('Player encounter board has no layout box.');
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.35);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * (3 / 7), {
    steps: 6,
  });
  await page.mouse.up();
  await expect(page.locator('.encounter-cell[data-preview="true"]')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Confirm choice' }).click();
  await confirmChoice(page, 'End turn');

  await expect(dm.getByRole('button', { name: 'Move to 4,3', exact: true })).toBeVisible();
  await dm.getByRole('button', { name: 'Move to 4,3', exact: true }).click();
  const tray = dm.locator('.dm-decision-tray');
  await expect(tray.locator('[data-entry-kind="pending"]')).toContainText(
    'Reference Fighter — opportunity attack',
  );
  await expect(tray).toContainText('Training Brute moved from 3,3 to 4,3');
  await expect(dm.locator('.dm-pending-request')).toContainText('turn: Training Brute');
  await dm.getByRole('button', { name: 'Hide', exact: true }).click();
  for (const board of [dm, page]) {
    await expect(board.locator('[data-cell="4,3"] .encounter-art-fog')).toBeVisible();
    await expect(
      board.locator('[data-cell="4,3"] .encounter-token[data-kind="monster"]'),
    ).toHaveCount(0);
  }
  await expect(dm.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();

  await dm.getByLabel('Adjudication target').selectOption({ label: 'Reference Fighter' });
  await dm.getByLabel('Hit Point delta').fill('-999');
  await dm.getByLabel('DM reasoning').fill('DM-only collapse reasoning sentinel');
  await dm.getByRole('button', { name: 'Apply ADJUDICATED override' }).click();
  await expect(dm.locator('[data-pause="adjudicated"]')).toBeVisible();
  await expect(dm.locator('.dm-log [data-event-type="adjudicated"]')).toContainText(
    'DM-only collapse reasoning sentinel',
  );
  await expect(dm.locator('.encounter-token[data-adjudicated="true"]')).toHaveText(
    'Reference Fighter',
  );
  await expect(page.locator('.encounter-log [data-event-type="adjudicated"]')).toContainText(
    'ADJUDICATED — visible consequence',
  );
  await expect(page.locator('.player-encounter')).not.toContainText(
    'DM-only collapse reasoning sentinel',
  );

  await dm.getByRole('button', { name: 'Resume' }).click();
  await expect(dm.getByRole('button', { name: 'End turn', exact: true })).toBeVisible();
  await dm.getByRole('button', { name: 'End turn', exact: true }).click();
  await expect(tray).toHaveAttribute('data-boundary-blocked', 'true');
  await expect(tray.getByRole('alert')).toHaveAttribute(
    'data-refusal-code',
    'turn_boundary_blocked',
  );
  await tray.getByRole('button', { name: 'Decline for Reference Fighter' }).click();
  await dm.getByRole('button', { name: 'End turn', exact: true }).click();
  await tray.getByRole('button', { name: 'Roll Death Save for Reference Fighter' }).click();
  await expect(dm.locator('[data-hidden-roll="death-save"]')).toHaveText(
    /^Hidden death save: (?:[1-9]|1\d|20) \([^)]+\)$/u,
  );
  await expect(page.locator('.player-encounter')).not.toContainText('Hidden death save');
  await expect(
    page.locator('.encounter-log [data-event-type="death_save_resolved"]'),
  ).toHaveText('death save resolved');

  await dm.getByRole('button', { name: 'Interrupt' }).click();
  await expect(dm.locator('[data-pause="interrupted"]')).toBeVisible();
  await dm.getByRole('button', { name: 'Undo last' }).click();
  await dm.getByText('Full revision history').click();
  await expect(dm.locator('[data-void="true"]')).not.toHaveCount(0);

  await dm.getByRole('button', { name: 'Interrupt' }).click();
  const historyCount = await dm.locator('[data-revision]').count();
  await dm.reload();
  await expect(dm.getByRole('heading', { name: 'DM controls' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(dm.locator('[data-pause="interrupted"]')).toBeVisible();
  await dm.getByText('Full revision history').click();
  await expect(dm.locator('[data-revision]')).toHaveCount(historyCount);
  await dm.getByRole('button', { name: 'Resume' }).click();
  await expect(page.locator('.encounter-authority-status')).toHaveAttribute(
    'data-state',
    'connected',
  );
});
