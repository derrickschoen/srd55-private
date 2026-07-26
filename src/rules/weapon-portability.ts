/**
 * WHAT WEAPONS DO NOT YET TRAVEL WITH, SAID OUT LOUD.
 *
 * `character_weapons` is classified `backup: false`, `share: false` and
 * `snapshot: false` in `src/domain/contracts/tables.ts`, and that is a
 * limitation rather than a judgement — see the long note there for why the
 * change could not be made from this track.
 *
 * This module exists so the limitation is a SENTENCE THE USER READS rather than
 * a surprise they discover when a restored backup is missing their weapons.
 * Silently dropping data from an export is a bug; telling someone which data an
 * export does not carry is a limitation they can work around.
 *
 * WHEN THE GAP CLOSES, DELETE THIS FILE. `tests/unit/contracts/weapon-scopes.test.ts`
 * ties the two together: the day `character_weapons` becomes backup-scoped, the
 * test fails and points here, so the notice cannot outlive the truth of it.
 */
export const WEAPON_PORTABILITY_NOTICE =
  'Weapons are stored with this character in this browser, but they are not ' +
  'yet included in exported backups, shared character links, or save-point ' +
  'restores. Undo and redo do cover every weapon change.';

/**
 * The scopes the notice is making a claim about, so a test can compare the
 * sentence against the classification rather than against another sentence.
 */
export const WEAPON_EXCLUDED_SCOPES = ['backup', 'share', 'snapshot'] as const;
