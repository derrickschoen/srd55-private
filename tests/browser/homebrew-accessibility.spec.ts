import type { Locator, Page } from '@playwright/test';
import {
  announcedMessages,
  clearAnnouncements,
  installAnnouncementRecorder,
} from './fixtures/announcements';
import { expect, test } from './fixtures/parallel-test';

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
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute('aria-busy', 'false');
}

async function reset(page: Page): Promise<void> {
  await installAnnouncementRecorder(page);
  await page.goto('/');
  await globalReady(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.goto('/homebrew');
  await homebrewReady(page);
  await clearAnnouncements(page);
}

async function pressEnter(control: Locator): Promise<void> {
  await control.focus();
  await control.press('Enter');
}

async function expectAnnounced(page: Page, message: string): Promise<void> {
  await expect.poll(() => announcedMessages(page)).toContain(message);
}

async function expectAnnouncementMatching(page: Page, pattern: RegExp): Promise<void> {
  await expect.poll(async () =>
    (await announcedMessages(page)).some((message) => pattern.test(message))
  ).toBe(true);
}

test('announcement recorder ignores populated regions on insertion and on becoming live', async ({ page }) => {
  await installAnnouncementRecorder(page);
  await page.goto('/');
  await clearAnnouncements(page);
  await page.evaluate(() => {
    const inserted = document.createElement('div');
    inserted.id = 'recorder-inserted-live-region';
    inserted.setAttribute('role', 'status');
    inserted.textContent = 'Recorder must ignore this inserted text.';
    document.body.append(inserted);

    const region = document.createElement('div');
    region.id = 'recorder-late-live-region';
    region.textContent = 'Recorder must ignore this existing text.';
    document.body.append(region);
  });
  await page.locator('#recorder-late-live-region').evaluate((region) => {
    region.setAttribute('role', 'status');
  });

  await expect.poll(() => announcedMessages(page))
    .not.toContain('Recorder must ignore this inserted text.');
  await expect.poll(() => announcedMessages(page))
    .not.toContain('Recorder must ignore this existing text.');

  await page.locator('#recorder-inserted-live-region').evaluate((region) => {
    region.textContent = 'Recorder observes this inserted region later.';
  });
  await expectAnnounced(page, 'Recorder observes this inserted region later.');

  await page.locator('#recorder-late-live-region').evaluate((region) => {
    region.textContent = 'Recorder observes this later mutation.';
  });
  await expectAnnounced(page, 'Recorder observes this later mutation.');
});

test('all three authoring routes focus, announce, and recover from publisher validation errors', async ({
  page,
}) => {
  // A restoration run measured 43.4s under machine contention. The recorded
  // x1.5 reserve is 43.4s x 1.5 = 65.1s, following the 65s guided precedent.
  test.setTimeout(65_000);
  await reset(page);

  const forms = [
    { kind: 'species', create: 'New species', form: 'Species authoring form', name: 'Recovered Species' },
    { kind: 'background', create: 'New background', form: 'Background authoring form', name: 'Recovered Background' },
    { kind: 'subclass', create: 'New subclass', form: 'Subclass authoring form', name: 'Recovered Subclass' },
  ] as const;

  for (const form of forms) {
    await page.goto(`/homebrew?tab=${form.kind}`);
    await homebrewReady(page);
    await pressEnter(page.getByRole('button', { name: form.create, exact: true }));
    await expect(page.getByLabel(form.form, { exact: true })).toBeVisible();

    const save = page.getByRole('button', { name: 'Save draft', exact: true });
    await pressEnter(save);
    await expectAnnounced(page, 'Saved revision 1.');

    await clearAnnouncements(page);
    await pressEnter(page.getByRole('button', { name: 'Preview publish', exact: true }));
    const name = page.getByLabel('Name', { exact: true });
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('alert', { name: 'Fix these fields' })).toContainText(
      'Must not be empty.',
    );
    await expectAnnouncementMatching(page, /^\d+ field issue\(s\) found\.$/u);

    await page.keyboard.type(form.name);
    await clearAnnouncements(page);
    await pressEnter(save);
    await expectAnnounced(page, 'Saved revision 2.');
  }
});

test('library tabs use their keyboard model and announce the route-loaded result', async ({ page }) => {
  // Measured alone at 10.5s; 20s is the standard contention guard.
  test.setTimeout(20_000);
  await reset(page);

  const species = page.getByRole('tab', { name: 'Species', exact: true });
  await species.focus();
  await species.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Subclasses', exact: true })).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Drafts', exact: true })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(species).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/homebrew\?tab=subclass$/u);
  await expect(page.getByRole('tab', { name: 'Subclasses', exact: true }))
    .toHaveAttribute('aria-selected', 'true');
  await expectAnnounced(page, 'Homebrew library loaded.');
});

test('species ordering stays keyboard-continuous and the route conflict modal traps and restores focus', async ({
  page,
}) => {
  // Measured alone at 10.6s; 20s is the standard contention guard.
  test.setTimeout(20_000);
  await reset(page);
  await pressEnter(page.getByRole('button', { name: 'New species', exact: true }));
  await expect(page.getByLabel('Species authoring form', { exact: true })).toBeVisible();

  await pressEnter(page.getByRole('button', { name: 'Add trait', exact: true }));
  const firstTrait = page.locator('.species-trait-card').first();
  await firstTrait.getByLabel('Trait name', { exact: true }).focus();
  await page.keyboard.type('First trait');
  await pressEnter(page.getByRole('button', { name: 'Add trait', exact: true }));
  const secondTrait = page.locator('.species-trait-card').nth(1);
  await secondTrait.getByLabel('Trait name', { exact: true }).focus();
  await page.keyboard.type('Second trait');
  await pressEnter(secondTrait.getByRole('button', { name: 'Add effect', exact: true }));

  await clearAnnouncements(page);
  await pressEnter(page.getByRole('button', {
    name: 'Move up Second trait, item 2 of 2',
    exact: true,
  }));
  await expect(page.getByRole('button', {
    name: 'Move down Second trait, item 1 of 2',
    exact: true,
  })).toBeFocused();
  expect(await page.locator('.species-trait-card').locator('input[id$="-name"]')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)))
    .toEqual(['Second trait', 'First trait']);
  await expectAnnounced(page, 'Moved Second trait to position 1 of 2.');

  const save = page.getByRole('button', { name: 'Save draft', exact: true });
  await clearAnnouncements(page);
  await pressEnter(save);
  await expectAnnounced(page, 'Saved revision 1.');

  await page.evaluate(async () => {
    const draftUuid = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
    const stored = await window.appRpc.call<
      { readonly draft_uuid: string },
      {
        readonly revision: number;
        readonly document: Readonly<Record<string, unknown>>;
      }
    >('authoring.readDraft', { draft_uuid: draftUuid });
    await window.appRpc.call('authoring.saveDraft', {
      draft_uuid: draftUuid,
      expected_revision: stored.revision,
      document: { ...stored.document, name: 'Saved elsewhere' },
    });
  });

  await page.getByLabel('Name', { exact: true }).fill('Local unsaved edit');
  await clearAnnouncements(page);
  await pressEnter(save);
  const dialog = page.getByRole('dialog', { name: 'This draft changed in another tab' });
  await expect(dialog).toBeVisible();
  const keep = dialog.getByRole('button', { name: 'Keep my unsaved changes', exact: true });
  const load = dialog.getByRole('button', { name: 'Load saved revision', exact: true });
  await expect(keep).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(load).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(keep).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(save).toBeFocused();
  await expectAnnounced(page, 'The newer saved revision was left unchanged.');
});

test('background catalog, equipment, and effect controls work from real key events', async ({ page }) => {
  // Measured alone at 10.2s; 20s is the standard contention guard.
  test.setTimeout(20_000);
  await reset(page);
  await page.getByRole('tab', { name: 'Backgrounds', exact: true }).click();
  await pressEnter(page.getByRole('button', { name: 'New background', exact: true }));
  await expect(page.getByLabel('Background authoring form', { exact: true })).toBeVisible();

  const originFeat = page.getByRole('combobox', { name: 'Installed Origin feat', exact: true });
  await originFeat.focus();
  await page.keyboard.press('a');
  await expect(originFeat).toHaveValue(/feat:alert$/u);
  expect(await originFeat.evaluate((select) => {
    const option = (select as HTMLSelectElement).selectedOptions[0];
    return option?.parentElement instanceof HTMLOptGroupElement
      ? option.parentElement.label
      : null;
  })).toBe('SRD · bundled layer');

  const addEquipment = page.getByRole('button', {
    name: 'Add equipment to option A',
    exact: true,
  });
  await pressEnter(addEquipment);
  await page.locator('.background-equipment-card').first()
    .getByLabel('Printed name', { exact: true }).fill('Rope');
  await pressEnter(addEquipment);
  const secondEquipment = page.locator('.background-equipment-card').nth(1);
  await secondEquipment.getByLabel('Printed name', { exact: true }).fill('Club');
  await secondEquipment.getByLabel('Item kind', { exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  await expect(secondEquipment.getByLabel('Item kind', { exact: true })).toHaveValue('weapon');

  await clearAnnouncements(page);
  await pressEnter(page.getByRole('button', {
    name: 'Move up option A Club, item 2 of 2',
    exact: true,
  }));
  await expect(page.getByRole('button', {
    name: 'Move down option A Club, item 1 of 2',
    exact: true,
  })).toBeFocused();
  expect(await page.locator('.background-equipment-card').locator('input[id$="-printed-name"]')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)))
    .toEqual(['Club', 'Rope']);
  await expectAnnounced(page, 'Moved option A Club to position 1 of 2.');

  await clearAnnouncements(page);
  await pressEnter(page.getByRole('button', {
    name: 'Remove option A Rope, item 2 of 2',
    exact: true,
  }));
  const removeLastEquipment = page.getByRole('button', {
    name: 'Remove option A Club, item 1 of 1',
    exact: true,
  });
  await expect(removeLastEquipment).toBeFocused();
  await clearAnnouncements(page);
  await page.keyboard.press('Enter');
  await expect(addEquipment).toBeFocused();
  expect(await addEquipment.evaluate((control) => control.isConnected)).toBe(true);
  await expect(page.locator('.background-equipment-card')).toHaveCount(0);
  await expectAnnounced(page, 'Removed option A Club.');

  const addEffect = page.getByRole('button', { name: 'Add effect', exact: true });
  await pressEnter(addEffect);
  await pressEnter(addEffect);
  const effectIds = await page.locator('.authoring-effect-card')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-draft-item-uuid')));
  const secondEffectId = effectIds[1];
  if (secondEffectId === null || secondEffectId === undefined) {
    throw new Error('The second background effect has no stable item id.');
  }
  await clearAnnouncements(page);
  await pressEnter(page.locator(
    `[data-authoring-order-item="${secondEffectId}"][data-authoring-order-action="move-up"]`,
  ));
  await expect(page.locator(
    `[data-authoring-order-item="${secondEffectId}"][data-authoring-order-action="move-down"]`,
  )).toBeFocused();
  await expect(page.locator('.authoring-effect-card').first()).toHaveAttribute(
    'data-draft-item-uuid',
    secondEffectId,
  );
  await expectAnnounced(page, 'Moved Armor Class bonus to position 1 of 2.');

  await clearAnnouncements(page);
  await pressEnter(page.getByRole('button', { name: 'Save draft', exact: true }));
  await expectAnnounced(page, 'Saved revision 1.');
});

test('subclass disclosure, grid, timeline, and nested ordering controls work from the keyboard', async ({
  page,
}) => {
  // Measured alone at 10.5s; 20s is the standard contention guard.
  test.setTimeout(20_000);
  await reset(page);
  await page.getByRole('tab', { name: 'Subclasses', exact: true }).click();
  await pressEnter(page.getByRole('button', { name: 'New subclass', exact: true }));
  await expect(page.getByLabel('Subclass authoring form', { exact: true })).toBeVisible();

  const parent = page.getByRole('combobox', { name: 'Parent bundled class', exact: true });
  await parent.focus();
  await page.keyboard.press('f');
  await expect(parent).not.toHaveValue('');
  expect(await parent.evaluate((select) => {
    const option = (select as HTMLSelectElement).selectedOptions[0];
    return option?.parentElement instanceof HTMLOptGroupElement
      ? option.parentElement.label
      : null;
  })).toBe('SRD · bundled layer');

  const mode = page.getByRole('combobox', { name: 'Progression mode', exact: true });
  await mode.focus();
  await page.keyboard.press('End');
  await expect(mode).toHaveValue('override');
  const progressionRun = page.locator('.subclass-progression-run').first();
  await progressionRun.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(progressionRun).toHaveAttribute('open', '');
  const gridCell = page.getByRole('spinbutton', { name: 'Cantrips known', exact: true }).last();
  await gridCell.focus();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type('4');
  await expect(gridCell).toHaveValue('4');

  const timelineLevel = page.getByRole('combobox', { name: 'Timeline level', exact: true });
  await timelineLevel.focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(timelineLevel).toHaveValue('3');
  await pressEnter(page.getByRole('button', { name: 'Add level', exact: true }));
  const addFeature = page.getByRole('button', { name: 'Add feature at level 3', exact: true });
  await pressEnter(addFeature);
  await page.locator('.subclass-feature-card').first()
    .getByLabel('Feature name', { exact: true }).fill('First feature');
  await pressEnter(addFeature);
  const secondFeature = page.locator('.subclass-feature-card').nth(1);
  await secondFeature.getByLabel('Feature name', { exact: true }).fill('Second feature');
  await pressEnter(secondFeature.getByRole('button', { name: 'Add effect', exact: true }));

  await clearAnnouncements(page);
  await pressEnter(page.getByRole('button', {
    name: 'Move up Second feature, item 2 of 2',
    exact: true,
  }));
  await expect(page.getByRole('button', {
    name: 'Move down Second feature, item 1 of 2',
    exact: true,
  })).toBeFocused();
  expect(await page.locator('.subclass-feature-card').locator('input[id$="-name"]')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value)))
    .toEqual(['Second feature', 'First feature']);
  await expectAnnounced(page, 'Moved Second feature to position 1 of 2.');

  const movedFeature = page.locator('.subclass-feature-card').first();
  await pressEnter(movedFeature.getByRole('button', { name: 'Add effect', exact: true }));
  const nestedEffectIds = await movedFeature.locator('.authoring-effect-card')
    .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-draft-item-uuid')));
  const nestedSecondId = nestedEffectIds[1];
  if (nestedSecondId === null || nestedSecondId === undefined) {
    throw new Error('The second subclass effect has no stable item id.');
  }
  await clearAnnouncements(page);
  await pressEnter(page.locator(
    `[data-authoring-order-item="${nestedSecondId}"][data-authoring-order-action="move-up"]`,
  ));
  await expect(page.locator(
    `[data-authoring-order-item="${nestedSecondId}"][data-authoring-order-action="move-down"]`,
  )).toBeFocused();
  await expect(page.locator('.subclass-feature-card').first().locator('.authoring-effect-card').first())
    .toHaveAttribute('data-draft-item-uuid', nestedSecondId);
  await expectAnnounced(page, 'Moved Armor Class bonus to position 1 of 2.');

  await clearAnnouncements(page);
  await pressEnter(page.getByRole('button', { name: 'Save draft', exact: true }));
  await expectAnnounced(page, 'Saved revision 1.');
  expect(await page.evaluate(async () => {
    const draftUuid = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
    const stored = await window.appRpc.call<
      { readonly draft_uuid: string },
      {
        readonly document: {
          readonly kind: string;
          readonly progression: {
            readonly mode: string;
            readonly rows?: readonly { readonly cantrips_known: number | null }[];
          };
        };
      }
    >('authoring.readDraft', { draft_uuid: draftUuid });
    return stored.document.progression.rows?.[19]?.cantrips_known ?? null;
  })).toBe(4);
});
