import type { DatabaseContext } from '../db/database';
import {
  isEnumValue,
  weaponMasteryGrants,
  type WeaponMasteryGrant,
} from '../domain/enums';

/**
 * HOW MANY WEAPON MASTERIES A CHARACTER MAY CHOOSE — OR AN HONEST "WE DO NOT
 * KNOW".
 *
 * The count is not derivable from anything this application already stores:
 * `class_progressions` models spellcasting only, and the 80 rows belonging to
 * the four non-casting classes carry a level number and nothing else. So this
 * is a lookup over new content, and the interesting design work is in what it
 * does when the content is absent.
 *
 * THE RULE: MISSING CONTENT IS A STATE, NEVER A NUMBER. There is no path
 * through this module that returns `0` for "we have no idea". A zero would make
 * an un-seeded database indistinguishable from a class that genuinely has no
 * Weapon Mastery, and would quietly cost a Rogue an entitlement they have.
 */
export type MasteryAllowance =
  /** The class has no Weapon Mastery feature. A real, sourced answer. */
  | { readonly state: 'not_granted' }
  /** The class grants it and we hold the number for this level. */
  | { readonly state: 'known'; readonly count: number }
  /**
   * The class grants it and its count is NOT in `docs/srd/source/`. Seeded
   * explicitly, so the UI can say which class it is short of.
   */
  | { readonly state: 'unsourced' }
  /**
   * No grant row at all, or `counts_known` with no row at or below this level.
   * A database seeded before weapons existed lands here — and surfaces, rather
   * than reading as a confident zero.
   */
  | { readonly state: 'content_missing' };

export interface ClassMasteryAllowance {
  readonly class_definition_id: number;
  readonly class_name: string;
  readonly class_level: number;
  readonly allowance: MasteryAllowance;
}

/**
 * The character-wide picture, deliberately NOT reduced to a single number.
 *
 *  - `none`      — no class of theirs grants it; the UI shows no mastery column.
 *  - `known`     — exactly one granting class and we have its number.
 *  - `unknown`   — a granting class whose count we lack. Selection stays open.
 *  - `unresolved`— two or more granting classes. We have no sourced rule for how
 *                  multiclass allowances combine, so we show each separately.
 *
 * SUMMING IS THE OBVIOUS GUESS AND IT IS NOT MADE. Neither is taking the
 * maximum. Both would be this application inventing a rule and presenting it as
 * fact; the planner's whole posture is to surface and let the table decide.
 */
export type CharacterMasteryAllowance =
  | { readonly state: 'none'; readonly classes: readonly ClassMasteryAllowance[] }
  | {
      readonly state: 'known';
      readonly count: number;
      readonly classes: readonly ClassMasteryAllowance[];
    }
  | {
      readonly state: 'unknown';
      readonly classes: readonly ClassMasteryAllowance[];
    }
  | {
      readonly state: 'unresolved';
      readonly classes: readonly ClassMasteryAllowance[];
    };

export class WeaponMasteryLookup {
  constructor(private readonly db: DatabaseContext) {}

  /**
   * Resolves one class at one level.
   *
   * Counts are stored ABSOLUTE per level, matching how the source prints them,
   * so this is a "greatest row at or below the level" read and never a running
   * sum. That also means a partially-seeded table degrades to a stale-but-real
   * number rather than to a wrong one.
   */
  forClass(classDefinitionId: number, classLevel: number): MasteryAllowance {
    const grant = this.db.scalar<string>(
      `SELECT "grant" FROM class_weapon_mastery_grants
       WHERE class_definition_id = ?`,
      [classDefinitionId],
    );
    if (grant === null || !isEnumValue(weaponMasteryGrants, grant)) {
      return { state: 'content_missing' };
    }
    const known: WeaponMasteryGrant = 'counts_known';
    if (grant === 'not_granted') {
      return { state: 'not_granted' };
    }
    if (grant !== known) {
      return { state: 'unsourced' };
    }

    const count = this.db.scalar<number>(
      `SELECT mastery_count FROM class_weapon_mastery_counts
       WHERE class_definition_id = ? AND class_level <= ?
       ORDER BY class_level DESC
       LIMIT 1`,
      [classDefinitionId, classLevel],
    );
    if (count === null) {
      // `counts_known` with nothing at or below this level means the counts
      // table is short, not that the character may choose none.
      return { state: 'content_missing' };
    }
    return { state: 'known', count: Number(count) };
  }

  forCharacter(characterId: number): CharacterMasteryAllowance {
    const classes = this.db
      .all(
        `SELECT level.class_definition_id AS class_definition_id,
                level.level AS class_level,
                definition.name AS class_name
         FROM character_class_levels AS level
         JOIN class_definitions AS definition
           ON definition.id = level.class_definition_id
         WHERE level.character_id = ?
         ORDER BY definition.name, level.class_definition_id`,
        [characterId],
        (row) => ({
          class_definition_id: Number(row.class_definition_id),
          class_name: String(row.class_name),
          class_level: Number(row.class_level),
        }),
      )
      .map((entry): ClassMasteryAllowance => ({
        ...entry,
        allowance: this.forClass(entry.class_definition_id, entry.class_level),
      }));

    const granting = classes.filter(
      (entry) => entry.allowance.state !== 'not_granted',
    );
    if (granting.length === 0) {
      return { state: 'none', classes };
    }
    if (granting.length > 1) {
      return { state: 'unresolved', classes };
    }
    const only = granting[0] as ClassMasteryAllowance;
    if (only.allowance.state !== 'known') {
      return { state: 'unknown', classes };
    }
    return { state: 'known', count: only.allowance.count, classes };
  }
}

/**
 * The one number a UI may compare a selection count against.
 *
 * `null` for every state except `known`, and that is the point: an over-
 * selection WARNING can only be produced when the app is certain, and it is
 * certain in exactly one case. Selection itself is never hard-blocked.
 */
export function comparableMasteryCount(
  allowance: CharacterMasteryAllowance,
): number | null {
  return allowance.state === 'known' ? allowance.count : null;
}
