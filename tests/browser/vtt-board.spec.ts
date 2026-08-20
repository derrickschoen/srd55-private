import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

const GRID_SIZE = 50;
const TARGET_COLUMN = 6;
const TARGET_ROW = 4;
const EXPECTED_COLUMN = 6;

async function openVtt(page: Page): Promise<void> {
  await page.goto('/vtt');
  await expect(page.getByRole('heading', { name: 'Shared tabletop' })).toBeVisible({
    timeout: 60_000,
  });
}

async function chooseManual(page: Page, roomCode: string): Promise<void> {
  await page.getByLabel('Transport').selectOption('manual');
  await page.getByLabel('Room code').fill(roomCode);
}

async function nonEmptyValue(page: Page, label: string): Promise<string> {
  const control = page.getByLabel(label);
  await expect(control).not.toHaveValue('', { timeout: 10_000 });
  return control.inputValue();
}

async function canvasPixel(
  page: Page,
  column: number,
  row: number,
): Promise<readonly number[]> {
  return page.locator('canvas.vtt-canvas').evaluate(
    (canvas, cell) => {
      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('VTT canvas locator did not resolve to a canvas.');
      }
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('Missing canvas context.');
      const bounds = canvas.getBoundingClientRect();
      const cssX = cell.column * cell.gridSize + cell.gridSize / 2;
      const cssY = cell.row * cell.gridSize + cell.gridSize / 2;
      const x = Math.floor((cssX / bounds.width) * canvas.width);
      const y = Math.floor((cssY / bounds.height) * canvas.height);
      return [...context.getImageData(x, y, 1, 1).data];
    },
    { column, row, gridSize: GRID_SIZE },
  );
}

async function canvasPoint(
  page: Page,
  column: number,
  row: number,
): Promise<{ readonly x: number; readonly y: number }> {
  const bounds = await page.locator('canvas.vtt-canvas').boundingBox();
  if (bounds === null) throw new Error('VTT canvas has no bounding box.');
  return Object.freeze({
    x: bounds.x + column * GRID_SIZE + GRID_SIZE / 2,
    y: bounds.y + row * GRID_SIZE + GRID_SIZE / 2,
  });
}

async function dragToken(
  page: Page,
  from: { readonly column: number; readonly row: number },
  to: { readonly column: number; readonly row: number },
): Promise<void> {
  const start = await canvasPoint(page, from.column, from.row);
  const target = await canvasPoint(page, to.column, to.row);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await page.mouse.up();
}

test('manual peers converge token moves, dice rolls, and role-dependent fog', async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const dmContext = await browser.newContext();
  const playerContext = await browser.newContext();
  const dm = await dmContext.newPage();
  const player = await playerContext.newPage();

  try {
    await Promise.all([openVtt(dm), openVtt(player)]);
    const roomCode = 'manual-smoke-room';
    await chooseManual(dm, roomCode);
    await dm.getByRole('button', { name: 'Create room' }).click();
    const offer = await nonEmptyValue(dm, 'Manual SDP offer');

    await chooseManual(player, roomCode);
    await player.getByRole('button', { name: 'Join room' }).click();
    await player.getByLabel('Manual SDP offer to answer').fill(offer);
    await player.getByRole('button', { name: 'Create answer' }).click();
    const answer = await nonEmptyValue(player, 'Manual SDP answer');
    await dm.getByLabel('Manual SDP answer to apply').fill(answer);
    await dm.getByRole('button', { name: 'Apply answer' }).click();

    await expect(dm.locator('#vtt-transport-status')).toHaveAttribute(
      'data-state',
      'connected',
      { timeout: 15_000 },
    );
    await expect(player.locator('#vtt-transport-status')).toHaveAttribute(
      'data-state',
      'connected',
      { timeout: 15_000 },
    );
    await expect(dm.locator('#vtt-role')).toHaveAttribute('data-role', 'dm');
    await expect(player.locator('#vtt-role')).toHaveAttribute(
      'data-role',
      'player',
    );
    await expect(player.getByRole('button', { name: 'Paint fog' })).toBeHidden();

    await dm.getByLabel('New token label').fill('Scout');
    await dm.getByLabel('New token color').fill('#2468a2');
    await dm.getByRole('button', { name: 'Add token' }).click();
    const dmToken = dm.locator('[data-token-id]').first();
    await expect(dmToken).toHaveAttribute('data-column', '0');
    await expect(dmToken).toHaveAttribute('data-row', '0');
    const tokenId = await dmToken.getAttribute('data-token-id');
    if (tokenId === null) throw new Error('Created token has no id.');

    const start = await canvasPoint(dm, 0, 0);
    const target = await canvasPoint(dm, TARGET_COLUMN, TARGET_ROW);
    await dm.mouse.move(start.x, start.y);
    await dm.mouse.down();
    await dm.mouse.move(target.x, target.y, { steps: 8 });
    await dm.mouse.up();

    const playerToken = player.locator(`[data-token-id="${tokenId}"]`);
    await expect(playerToken).toHaveAttribute(
      'data-column',
      String(EXPECTED_COLUMN),
    );
    await expect(playerToken).toHaveAttribute('data-row', String(TARGET_ROW));

    await dm.getByLabel('New token label').fill('Concurrent');
    await dm.getByRole('button', { name: 'Add token' }).click();
    const dmConcurrent = dm.getByRole('button', { name: /Concurrent — column/ });
    const playerConcurrent = player.getByRole('button', {
      name: /Concurrent — column/,
    });
    await expect(playerConcurrent).toHaveAttribute('data-column', '0');
    await expect(playerConcurrent).toHaveAttribute('data-row', '0');
    await Promise.all([
      dragToken(dm, { column: 0, row: 0 }, { column: 2, row: 2 }),
      dragToken(player, { column: 0, row: 0 }, { column: 4, row: 3 }),
    ]);
    await expect
      .poll(async () => {
        const dmCell = `${await dmConcurrent.getAttribute('data-column')},${await dmConcurrent.getAttribute('data-row')}`;
        const playerCell = `${await playerConcurrent.getAttribute('data-column')},${await playerConcurrent.getAttribute('data-row')}`;
        return dmCell === playerCell && (dmCell === '2,2' || dmCell === '4,3');
      })
      .toBe(true);

    await player.getByLabel('Dice expression').fill('2d6+3');
    await player.getByRole('button', { name: 'Roll dice' }).click();
    const playerRoll = player.locator('[data-roll-id]').last();
    const dmRoll = dm.locator('[data-roll-id]').last();
    await expect(playerRoll).toHaveAttribute('data-expression', '2d6+3');
    await expect(dmRoll).toHaveAttribute('data-expression', '2d6+3');
    await expect(dmRoll).toHaveText(await playerRoll.innerText());
    const total = Number(await dmRoll.getAttribute('data-total'));
    expect(total).toBeGreaterThanOrEqual(5);
    expect(total).toBeLessThanOrEqual(15);

    const beforeFog = await canvasPixel(player, TARGET_COLUMN, TARGET_ROW);
    expect(beforeFog).not.toEqual([17, 19, 26, 255]);
    await dm.getByRole('button', { name: 'Paint fog' }).click();
    await dm.mouse.click(target.x, target.y);
    await expect(player.locator('canvas.vtt-canvas')).toHaveAttribute(
      'data-fog-count',
      '1',
    );
    await expect(playerToken).toHaveCount(0);
    const playerFog = await canvasPixel(player, TARGET_COLUMN, TARGET_ROW);
    const dmFog = await canvasPixel(dm, TARGET_COLUMN, TARGET_ROW);
    expect(playerFog).toEqual([17, 19, 26, 255]);
    expect(playerFog).not.toEqual(beforeFog);
    expect(dmFog).not.toEqual(playerFog);
  } finally {
    await dmContext.close();
    await playerContext.close();
  }
});
