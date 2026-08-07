import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface CharacterRow {
  readonly id: number;
  readonly revision: number;
}

interface BuildReportResult {
  readonly caster: {
    readonly caster_level: number;
    readonly slots: readonly { readonly level: number; readonly count: number }[];
  };
}

async function globalReady(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 65_000 },
  );
}

async function homebrewReady(page: Page): Promise<void> {
  await expect(page.locator('.homebrew-status')).toHaveText(
    'Homebrew library loaded.',
    { timeout: 65_000 },
  );
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function openTransferPanel(page: Page): Promise<void> {
  const panel = page.locator('details.transfer-panel');
  if (await panel.getAttribute('open') === null) {
    await panel.locator('summary').click();
  }
  await expect(panel).toHaveAttribute('open', '');
}

async function importBundledHomebrew(
  page: Page,
  expectedSummary: string,
): Promise<void> {
  await openTransferPanel(page);
  const trigger = page.getByRole('button', {
    name: 'Import bundled homebrew',
    exact: true,
  });
  await trigger.click();
  await expect(trigger).toBeDisabled();
  const dialog = page.getByRole('dialog', {
    name: 'Review content import',
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('region', {
    name: 'Bundled homebrew entries',
    exact: true,
  })).toContainText('external homebrew');
  await dialog.getByRole('button', {
    name: 'Import with these choices',
    exact: true,
  }).click();
  await expect(page.locator('.transfer-status')).toHaveText(expectedSummary);
  await expect(trigger).toBeEnabled();
}

function publishedCard(page: Page, name: string) {
  return page.getByRole('article').filter({
    has: page.getByRole('heading', { name, exact: true }),
  });
}

test('imports bundled homebrew through publish, applies derived third-caster slots, and repeats as a no-op', async ({
  page,
}) => {
  // The slower measured precedent is HA-9 at 18.2s. Its required x1.5
  // reserve is 27.3s. This journey adds a second import and a route reload;
  // 60s leaves 32.7s beyond the reserved precedent for those operations.
  test.setTimeout(60_000);
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await globalReady(page);

  await importBundledHomebrew(
    page,
    'Bundled homebrew imported: 3 published, 0 matched existing.',
  );

  await page.getByRole('link', { name: 'Homebrew library', exact: true }).click();
  await page.getByRole('tab', { name: 'Subclasses', exact: true }).click();
  await homebrewReady(page);
  for (const name of ['Veteran', 'Warrior of the Barbed Court', 'Spell Student']) {
    const card = publishedCard(page, name);
    await expect(card).toBeVisible();
    await expect(card.getByText('Homebrew', { exact: true })).toBeVisible();
    await expect(card).toContainText('Subclass · immutable published version');
  }

  await page.getByRole('link', { name: '← Characters', exact: true }).click();
  await globalReady(page);
  await page.getByRole('link', { name: 'Create a character', exact: true }).click();
  await page.getByRole('button', { name: 'Fighter Hit die: d10', exact: true }).click();
  await page.getByRole('textbox', { name: 'Character name', exact: true })
    .fill('Bundled Spell Student');
  await page.getByRole('button', { name: 'Create character', exact: true }).click();

  const persisted = await page.evaluate(async () => {
    const characters = await window.staticApp.inspectRows('characters', {
      name: 'Bundled Spell Student',
    });
    const characterId = Number(characters[0]?.['id']);
    const revision = Number(characters[0]?.['revision']);
    const classes = await window.staticApp.inspectRows('class_definitions', { name: 'Fighter' });
    const subclasses = await window.staticApp.inspectRows(
      'subclass_definitions',
      { name: 'Spell Student' },
    );
    const fighterId = Number(classes[0]?.['id']);
    const subclassId = Number(subclasses[0]?.['id']);
    const subclassKey = String(subclasses[0]?.['content_key']);
    if (
      !Number.isSafeInteger(characterId) ||
      !Number.isSafeInteger(revision) ||
      !Number.isSafeInteger(fighterId) ||
      !Number.isSafeInteger(subclassId)
    ) {
      throw new Error('The imported Spell Student character inputs were not persisted.');
    }
    const afterTwo = await window.appRpc.call<
      {
        readonly character_id: number;
        readonly operation_uuid: string;
        readonly expected_revision: number;
        readonly command: {
          readonly type: 'level_up_class';
          readonly class_definition_id: number;
          readonly target_level: 2;
        };
      },
      CharacterRow
    >('commands.execute', {
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: revision,
      command: {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 2,
      },
    });
    await window.appRpc.call('commands.execute', {
      character_id: characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: afterTwo.revision,
      command: {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 3,
        subclass_content_key: subclassKey,
      },
    });
    const report = await window.appRpc.call<
      { readonly character_id: number },
      BuildReportResult
    >('queries.reports.build', { character_id: characterId });
    const classRows = await window.staticApp.inspectRows('character_class_levels', {
      character_id: characterId,
    });
    return { characterId, subclassId, report, classRows };
  });

  expect(persisted.classRows).toEqual([
    expect.objectContaining({
      character_id: persisted.characterId,
      level: 3,
      subclass_definition_id: persisted.subclassId,
    }),
  ]);
  expect(persisted.report.caster).toMatchObject({
    caster_level: 1,
    slots: [{ level: 1, count: 2 }],
  });

  await page.goto('/');
  await globalReady(page);
  await importBundledHomebrew(
    page,
    'Bundled homebrew imported: 0 published, 3 matched existing.',
  );

  await page.getByRole('link', { name: 'Homebrew library', exact: true }).click();
  await page.getByRole('tab', { name: 'Subclasses', exact: true }).click();
  await homebrewReady(page);
  await page.reload();
  await homebrewReady(page);
  for (const name of ['Veteran', 'Warrior of the Barbed Court', 'Spell Student']) {
    await expect(publishedCard(page, name)).toBeVisible();
  }
  expect(await page.evaluate((characterId) => window.staticApp.inspectRows(
    'character_class_levels',
    { character_id: characterId },
  ), persisted.characterId)).toEqual(persisted.classRows);
  const reloadedReport = await page.evaluate(
    (characterId) => window.appRpc.call<
      { readonly character_id: number },
      BuildReportResult
    >('queries.reports.build', { character_id: characterId }),
    persisted.characterId,
  );
  expect(reloadedReport.caster).toEqual(persisted.report.caster);

  await page.getByRole('link', { name: '← Characters', exact: true }).click();
  await globalReady(page);
});
