import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';
import { readLevelUpSeam } from './fixtures/level-up-seam';

interface CharacterRow {
  readonly id: number;
  readonly revision: number;
}

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 50_000 },
  );
}

test('S2-3 names bundled and published-homebrew subclass arrivals from their stored rows', async ({
  page,
}) => {
  // Measured alone at 19.6s; 35s retains more than the required x1.5
  // contention headroom for both production-writer journeys.
  test.setTimeout(35_000);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);

  const characters = await page.evaluate(async () => {
    const create = async (name: string, className: string) => {
      const classes = await window.appRpc.call<
        Record<string, never>,
        readonly { readonly content_key: string; readonly name: string }[]
      >('queries.characters.guidedClassOptions', {});
      const selectedClass = classes.find((entry) => entry.name === className);
      if (selectedClass === undefined) {
        throw new Error(`Bundled ${className} was not found.`);
      }
      const created = await window.appRpc.call<
        { readonly name: string; readonly class_content_key: string },
        CharacterRow
      >('queries.characters.createGuided', {
        name,
        class_content_key: selectedClass.content_key,
      });
      await window.appRpc.call('queries.characters.allocateAbilities', {
        character_id: created.id,
        method: 'manual',
        scores: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        operation_uuid: crypto.randomUUID(),
        expected_revision: created.revision,
      });
      const classRows = await window.staticApp.inspectRows(
        'class_definitions',
        { name: className },
      );
      const classDefinitionId = Number(classRows[0]?.['id']);
      if (!Number.isSafeInteger(classDefinitionId)) {
        throw new Error(`${className} has no stored definition id.`);
      }
      return { id: created.id, classDefinitionId };
    };
    const advance = async (
      characterId: number,
      classDefinitionId: number,
      targetLevel: number,
      additions: Record<string, unknown> = {},
    ) => {
      const rows = await window.staticApp.inspectRows(
        'characters',
        { id: characterId },
      );
      const revision = Number(rows[0]?.['revision']);
      if (!Number.isSafeInteger(revision)) {
        throw new Error(`Character ${String(characterId)} has no revision.`);
      }
      await window.appRpc.call('commands.execute', {
        character_id: characterId,
        operation_uuid: crypto.randomUUID(),
        expected_revision: revision,
        command: {
          type: 'level_up_class',
          class_definition_id: classDefinitionId,
          target_level: targetLevel,
          ...additions,
        },
      });
    };
    const abilityIncrease = (ability: 'dexterity' | 'intelligence') => ({
      feat_choice: {
        kind: 'feat',
        feat_content_key: '2024:feat:ability-score-improvement',
        config: {},
        ability_increases: [{ ability, amount: 2 }],
      },
    });

    const wizard = await create('S2-3 Evoker', 'Wizard');
    await advance(wizard.id, wizard.classDefinitionId, 2);
    await advance(wizard.id, wizard.classDefinitionId, 3, {
      subclass_content_key: '2024:subclass:evoker',
    });
    await advance(
      wizard.id,
      wizard.classDefinitionId,
      4,
      abilityIncrease('intelligence'),
    );
    await advance(wizard.id, wizard.classDefinitionId, 5);

    const plan = await window.appRpc.call<
      Record<string, never>,
      { readonly token: string }
    >('authoring.previewBundledHomebrew', {});
    await window.appRpc.call('authoring.installBundledHomebrew', {
      token: plan.token,
    });
    const veteranRows = await window.staticApp.inspectRows(
      'subclass_definitions',
      { name: 'Veteran (Bundled revision 2)' },
    );
    const veteranKey = veteranRows[0]?.['content_key'];
    if (typeof veteranKey !== 'string' || veteranKey.length === 0) {
      throw new Error('Published Veteran content key was not stored.');
    }
    const rogue = await create('S2-3 Veteran', 'Rogue');
    await advance(rogue.id, rogue.classDefinitionId, 2);
    await advance(rogue.id, rogue.classDefinitionId, 3, {
      subclass_content_key: veteranKey,
    });
    await advance(
      rogue.id,
      rogue.classDefinitionId,
      4,
      abilityIncrease('dexterity'),
    );
    for (const level of [5, 6, 7]) {
      await advance(rogue.id, rogue.classDefinitionId, level);
    }
    await advance(
      rogue.id,
      rogue.classDefinitionId,
      8,
      abilityIncrease('dexterity'),
    );
    return { wizardId: wizard.id, rogueId: rogue.id };
  });

  const wizardSeam = await readLevelUpSeam(page, characters.wizardId);
  await page.goto(wizardSeam.path);
  await expect(page.getByRole('heading', { name: 'Level up — S2-3 Evoker' }))
    .toBeFocused({ timeout: 50_000 });
  await page.locator('[data-level-up-next]').click();
  const wizardGains = page.locator(
    `[${wizardSeam.panelAttribute}="${wizardSeam.panels.gains}"]`,
  );
  await expect(wizardGains).toContainText('Sculpt Spells');
  await expect(wizardGains).toContainText('SRD · bundled layer');
  await expect(wizardGains).toContainText(
    'Feature identity recorded; rules text not stored.',
  );
  await expect(wizardGains.getByText('Subclass feature', { exact: true }))
    .toHaveCount(0);

  const rogueSeam = await readLevelUpSeam(page, characters.rogueId);
  await page.goto(rogueSeam.path);
  await expect(page.getByRole('heading', { name: 'Level up — S2-3 Veteran' }))
    .toBeFocused({ timeout: 50_000 });
  await page.locator('[data-level-up-next]').click();
  const rogueGains = page.locator(
    `[${rogueSeam.panelAttribute}="${rogueSeam.panels.gains}"]`,
  );
  await expect(rogueGains).toContainText("Veteran's Strike");
  await expect(rogueGains).toContainText('Sneak Attack dice equal your Rogue level');
  await expect(rogueGains).toContainText('Extensive Experience');
  await expect(rogueGains).toContainText('Homebrew · external layer');
  await expect(rogueGains.getByText('Subclass feature', { exact: true }))
    .toHaveCount(0);
});
