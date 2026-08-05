import type { Page } from '@playwright/test';
import type { FixtureImage } from './php-parity';
import { expect } from './parallel-test';

export type Row = Record<string, any>;
type CommandResult = {
  inverse: Record<string, any>;
  revision: number;
  idempotent_replay: boolean;
};

export async function ready(page: Page): Promise<void> {
  // The four-worker pool measured the slowest parity caller at 39.4s; 100s
  // gives this load-sensitive readiness wait at least 2.5x pool headroom.
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 100_000 },
  );
}

export async function install(
  page: Page,
  fixture: FixtureImage<object>,
): Promise<void> {
  await page.goto('/');
  await ready(page);
  await page.evaluate(
    (bytes) => window.staticApp.replaceDatabase(Uint8Array.from(bytes)),
    fixture.bytes,
  );
  await page.reload();
  await ready(page);
}

export async function rpc<T>(
  page: Page,
  method: string,
  params: Record<string, unknown>,
): Promise<T> {
  return page.evaluate(
    ({ rpcMethod, rpcParams }) =>
      window.appRpc.call(rpcMethod, rpcParams),
    { rpcMethod: method, rpcParams: params },
  ) as Promise<T>;
}

export async function rejectedRpc(
  page: Page,
  method: string,
  params: Record<string, unknown>,
): Promise<{ code: unknown; message: string; data: unknown }> {
  return page.evaluate(
    async ({ rpcMethod, rpcParams }) => {
      try {
        await window.appRpc.call(rpcMethod, rpcParams);
        return { code: null, message: 'not rejected', data: null };
      } catch (error) {
        return {
          code: (error as { code?: unknown }).code ?? null,
          message: error instanceof Error ? error.message : String(error),
          data: (error as { data?: unknown }).data ?? null,
        };
      }
    },
    { rpcMethod: method, rpcParams: params },
  );
}

export async function rows(page: Page, table: string): Promise<Row[]> {
  return page.evaluate(
    (name) => window.staticApp.inspectRows(name),
    table,
  ) as Promise<Row[]>;
}

export async function databaseBytes(page: Page): Promise<number[]> {
  return page.evaluate(async () =>
    Array.from(await window.staticApp.exportDatabase()),
  );
}

export function operation(index: number): string {
  return `81000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

export async function execute(
  page: Page,
  characterId: number,
  expectedRevision: number,
  command: Record<string, unknown>,
  index: number,
): Promise<CommandResult> {
  return rpc<CommandResult>(page, 'commands.execute', {
    character_id: characterId,
    operation_uuid: operation(index),
    expected_revision: expectedRevision,
    command,
  });
}

export function forCharacter(allRows: Row[], characterId: number): Row[] {
  return allRows.filter((row) => row.character_id === characterId);
}

export async function portableTableCounts(
  page: Page,
  characterId: number,
): Promise<Record<string, number>> {
  const loadouts = forCharacter(
    await rows(page, 'spell_loadouts'),
    characterId,
  );
  const loadoutIds = new Set(loadouts.map((row) => row.id));
  return {
    character_class_levels: forCharacter(
      await rows(page, 'character_class_levels'),
      characterId,
    ).length,
    character_level_feat_choices: forCharacter(
      await rows(page, 'character_level_feat_choices'),
      characterId,
    ).length,
    character_rule_overrides: forCharacter(
      await rows(page, 'character_rule_overrides'),
      characterId,
    ).length,
    character_save_points: forCharacter(
      await rows(page, 'character_save_points'),
      characterId,
    ).length,
    character_source_instances: forCharacter(
      await rows(page, 'character_source_instances'),
      characterId,
    ).length,
    character_spell_preferences: forCharacter(
      await rows(page, 'character_spell_preferences'),
      characterId,
    ).length,
    spell_loadout_entries: (await rows(page, 'spell_loadout_entries'))
      .filter((row) => loadoutIds.has(row.spell_loadout_id)).length,
    // Weapons joined the portable document when they stopped being dropped from
    // backups; a document that does not carry them fails the comparison below.
    character_weapons: forCharacter(
      await rows(page, 'character_weapons'),
      characterId,
    ).length,
    // Skill grants joined it with skills-with-provenance S-A: a document
    // that does not carry them silently loses every skill choice's
    // provenance and keeps only the derived flat projection.
    character_skill_grants: forCharacter(
      await rows(page, 'character_skill_grants'),
      characterId,
    ).length,
    character_skill_expertise_grants: forCharacter(
      await rows(page, 'character_skill_expertise_grants'),
      characterId,
    ).length,
    // The character's origin joined it on the same terms.
    character_species: forCharacter(
      await rows(page, 'character_species'),
      characterId,
    ).length,
    character_species_traits: forCharacter(
      await rows(page, 'character_species_traits'),
      characterId,
    ).length,
    // ...and the character's own EFFECTS, which used to be five columns on the
    // trait rows above. A document that does not carry them silently loses
    // every resistance and hit point bonus the player has.
    character_effects: forCharacter(
      await rows(page, 'character_effects'),
      characterId,
    ).length,
    // The character's own ITEMS (AC-1, D72) joined on the same terms: a
    // document that does not carry them silently loses every thing the
    // player owns that only modifies.
    character_items: forCharacter(
      await rows(page, 'character_items'),
      characterId,
    ).length,
    // D92's fixed three-position attunement row is character-owned portable
    // state. Omitting it would preserve the items while silently losing which
    // of them actually applies.
    character_attunement_slots: forCharacter(
      await rows(page, 'character_attunement_slots'),
      characterId,
    ).length,
    // And the four stored sheet inputs, on the same terms again: a document
    // that does not carry them is a document that silently loses a player's
    // armour, their rolled hit points and the skills they chose.
    character_armor: forCharacter(
      await rows(page, 'character_armor'),
      characterId,
    ).length,
    character_hit_point_rolls: forCharacter(
      await rows(page, 'character_hit_point_rolls'),
      characterId,
    ).length,
    character_skill_proficiencies: forCharacter(
      await rows(page, 'character_skill_proficiencies'),
      characterId,
    ).length,
    character_sheet_adjustments: forCharacter(
      await rows(page, 'character_sheet_adjustments'),
      characterId,
    ).length,
    character_background: forCharacter(
      await rows(page, 'character_background'),
      characterId,
    ).length,
    spell_loadouts: loadouts.length,
    spell_selection_slots: forCharacter(
      await rows(page, 'spell_selection_slots'),
      characterId,
    ).length,
    warning_acknowledgements: forCharacter(
      await rows(page, 'warning_acknowledgements'),
      characterId,
    ).length,
    wizard_spellbook_entries: forCharacter(
      await rows(page, 'wizard_spellbook_entries'),
      characterId,
    ).length,
  };
}
