import { describe, expect, it } from 'vitest';
import {
  APPLICATION_TABLES,
  BACKUP_TABLES,
  CHARACTER_STATE_TABLES,
  REFERENCE_KINDS,
  SHARE_TABLES,
  TABLE_SCOPES,
} from '../../../src/domain/contracts/tables';
import {
  WEAPON_EXCLUDED_SCOPES,
  WEAPON_PORTABILITY_NOTICE,
} from '../../../src/rules/weapon-portability';

/**
 * THE KNOWN GAP, PINNED SO IT CANNOT BE FORGOTTEN OR QUIETLY OUTGROWN.
 *
 * `character_weapons` is deliberately excluded from backups, shares and undo
 * snapshots — not because that is right, but because turning any of them on
 * requires hand-written arms in `src/backup/character-backup.ts` and a format
 * version bump in `src/backup/backup-version.ts`, and those files belong to
 * another track. The exclusion is stated to the user by
 * `WEAPON_PORTABILITY_NOTICE`, which the weapons panel renders and the agent
 * reference emits.
 *
 * WHAT THIS FILE PINS, EXACTLY: that the classification and the NOTICE TEXT
 * agree. The day the scopes change, these assertions fail and point at the
 * notice, which by then would be a false statement in the product.
 *
 * WHAT IT DOES NOT PIN — said plainly, because an earlier version of this
 * comment claimed it did, and a review proved otherwise by deleting the render
 * call and watching all thirteen tests stay green: that anything actually
 * RENDERS the notice. Vitest runs these with `environment: 'node'`
 * (`vitest.config.ts`), so there is no DOM here and `renderWeapons` cannot be
 * called at all. The render is covered by `tests/browser/weapons.spec.ts` —
 * a slower gate than one would choose for it, but a real one. Moving it here
 * would mean changing the test environment to make a comment true, which is
 * the wrong way round.
 *
 * IT IS NOT A WEAKENED ASSERTION. It asserts the CURRENT truth exactly. To make
 * it pass again after the gap closes, you delete the notice, delete this file,
 * and add `character_weapons` to the backup tests — which is precisely the work
 * that must not be skipped.
 */
describe('the weapon portability gap', () => {
  it('classifies character_weapons out of backups, shares and snapshots', () => {
    expect(TABLE_SCOPES.character_weapons).toEqual({
      role: 'character_owned',
      snapshot: false,
      backupDirect: false,
      backup: false,
      share: false,
      backupReference: false,
    });
    expect([...BACKUP_TABLES]).not.toContain('character_weapons');
    expect(Object.keys(SHARE_TABLES)).not.toContain('character_weapons');
    expect([...CHARACTER_STATE_TABLES]).not.toContain('character_weapons');
  });

  it('says so where the user is entering the data', () => {
    // Not a vague hedge: the notice names all three scopes it is short of, and
    // says what DOES cover weapon changes, so the reader can act on it.
    expect(WEAPON_PORTABILITY_NOTICE).toContain('backups');
    expect(WEAPON_PORTABILITY_NOTICE).toContain('shared character links');
    expect(WEAPON_PORTABILITY_NOTICE).toContain('save-point');
    expect(WEAPON_PORTABILITY_NOTICE).toContain('Undo and redo do cover');
    expect(WEAPON_EXCLUDED_SCOPES).toEqual(['backup', 'share', 'snapshot']);
    for (const scope of WEAPON_EXCLUDED_SCOPES) {
      expect(TABLE_SCOPES.character_weapons[scope], scope).toBe(false);
    }
  });

  it('keeps the weapon catalog out of the backup reference kinds', () => {
    // By D1b a character's weapon holds no template id, so a backup document
    // has nothing to resolve against `weapon_templates` and a reference kind
    // for it could never be populated.
    expect([...REFERENCE_KINDS]).not.toContain('weapon_templates');
    expect(TABLE_SCOPES.weapon_templates.backupReference).toBe(false);
    expect(TABLE_SCOPES.weapon_templates.role).toBe('catalog_weapon');
  });

  it('still requires every weapon table in a valid database image', () => {
    // Excluded from portability is NOT excluded from the schema: an image
    // missing these tables is rejected at open.
    for (const table of [
      'character_weapons',
      'weapon_templates',
      'class_weapon_mastery_grants',
      'class_weapon_mastery_counts',
    ] as const) {
      expect([...APPLICATION_TABLES]).toContain(table);
    }
  });
});
