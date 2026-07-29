/**
 * THE ONE LEVELLING PATH — `level_up_class` (level-up plan §3, §8b; reduced
 * by D77).
 *
 * One command, one payload, one transaction, one snapshot inverse, one
 * refusal set. NOTHING IS WRITTEN FOR HIT POINTS, and that is the D77 ruling
 * rather than the bug the plan's §1 once named: hit points at every level
 * past the first are the class's fixed value (`die / 2 + 1`) plus the
 * Constitution modifier, always, computed live by
 * `hitPointMaximum` in `src/rules/sheet.ts`. With fixed as the only answer
 * there is nothing per level to record, so a level that "moved without its
 * row" is no longer a reachable wrong state.
 *
 * THE REFUSALS LIVE HERE, IN THE COMMAND — not in a screen. A control
 * scoped to "the screen has no class picker" passes while proving nothing
 * (§8, L-STRAIGHT); the guard that counts is the one every caller hits.
 * They are THREE, not the plan's four: `subclass_required` was struck by
 * D70 — see the seam's note — so level 3 proceeds with the choice owed,
 * never refused.
 * Refusals are raised BEFORE the transaction opens, the E-B precedent: a
 * structured, named refusal, never a greyed-out button and never a raw
 * constraint violation.
 */
import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { characterLevel } from '../rules/character-level';
import { asiLevelsForClassName } from '../rules/class-asi-levels-srd';
import type {
  LevelUpClassCommand as LevelUpClassPayload,
  RestoreSnapshotCommand as RestoreSnapshotPayload,
} from '../domain/command-contracts';
import {
  LEVEL_UP_ABILITY_INCREASE_MAXIMUM,
  LEVEL_UP_REFUSAL_REASONS,
  LEVEL_UP_SUBCLASS_LEVEL,
  type LevelUpRefusalData,
  type LevelUpRefusalReason,
} from '../builder/level-up';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import { syncClassSourceState } from './update-class';
import type { CharacterCommandIntegrity } from './integrity';

/**
 * The named refusal, carrying the seam's `LevelUpRefusalData` so a surface
 * can discriminate on `reason` without string-matching a message — the
 * `SkillGrantRefusal` / `EquipmentGrantRefusal` shape.
 */
export class LevelUpRefusal extends Error {
  readonly reason: LevelUpRefusalReason;

  constructor(message: string, readonly data: LevelUpRefusalData) {
    super(message);
    this.name = 'LevelUpRefusal';
    this.reason = data.reason;
  }
}

function refuse(reason: LevelUpRefusalReason, message: string): never {
  throw new LevelUpRefusal(message, { reason });
}

export class LevelUpClassCommand {
  readonly actionType = 'level_up_class';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | null = null;
  #before: CharacterStateSnapshot | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: LevelUpClassPayload,
    private readonly integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): void {
    const classId = this.payload.class_definition_id;
    const definition = this.db.one(
      'SELECT id, name, spellcasting_ability FROM class_definitions WHERE id = ?',
      [classId],
      (row) => ({
        id: sqlInteger(row, 'id'),
        name: sqlString(row, 'name'),
        spellcasting_ability: sqlNullableString(row, 'spellcasting_ability'),
      }),
    );
    if (definition === null) {
      throw new TypeError('Unknown class.');
    }

    // ---- The guards, BEFORE the transaction (§8b; three since D70). -------

    // L-STRAIGHT: the levelling path refuses a class the character does not
    // already have. Entry is `update_class`'s job; levelling a class that
    // was never entered is not levelling.
    const held = this.db.one(
      `SELECT id, level, subclass_definition_id
       FROM character_class_levels
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId],
      (row) => ({
        id: sqlInteger(row, 'id'),
        level: sqlInteger(row, 'level'),
        subclass_definition_id:
          row.subclass_definition_id === null
            ? null
            : sqlInteger(row, 'subclass_definition_id'),
      }),
    );
    if (held === null) {
      refuse(
        LEVEL_UP_REFUSAL_REASONS.classNotHeld,
        `This character has no ${definition.name} levels to advance.`,
      );
    }

    // L-ADJACENT: one level at a time. Levelling 2 → 7 in one command would
    // skip five hit-point rows, five feature sets, and any subclass or ASI
    // obligation in between.
    const targetLevel = this.payload.target_level;
    if (targetLevel !== held.level + 1) {
      refuse(
        LEVEL_UP_REFUSAL_REASONS.levelNotAdjacent,
        `A ${definition.name} at level ${String(held.level)} can only advance ` +
          `to level ${String(held.level + 1)}, not ${String(targetLevel)}.`,
      );
    }
    const otherLevels = characterLevel(this.db, characterId, {
      excludingClassDefinitionId: classId,
    });
    if ((otherLevels ?? 0) + targetLevel > 20) {
      throw new TypeError('A character cannot exceed level 20.');
    }

    // The subclass choice is OFFERED at level 3, never required (D70 struck
    // the plan's L-SUBCLASS refusal: only two subclasses are seeded, so a
    // refusal would dead-end ten of twelve classes; an unpicked subclass is
    // a saveable state that warns — the wizard's and the sheet's job, not
    // this command's). A key at any other level is still a wrong program.
    const subclassKey = this.payload.subclass_content_key ?? null;
    if (targetLevel !== LEVEL_UP_SUBCLASS_LEVEL && subclassKey !== null) {
      throw new TypeError(
        'A subclass is chosen exactly at level ' +
          `${String(LEVEL_UP_SUBCLASS_LEVEL)}.`,
      );
    }
    let subclassId = held.subclass_definition_id;
    if (subclassKey !== null) {
      const resolved = this.db.scalar<number>(
        `SELECT id FROM subclass_definitions
         WHERE content_key = ? AND class_definition_id = ?`,
        [subclassKey, classId],
      );
      if (resolved === null) {
        throw new TypeError(
          'That subclass does not belong to the selected class.',
        );
      }
      subclassId = Number(resolved);
    }

    // L-ASI-LEVELS: the levels that require an increase are READ FROM THE
    // SEEDED TABLE, per class — 4/8/12/16 everywhere, plus Fighter 6 and 14
    // and Rogue 10. A hardcoded `[4]` is the D15 mistake §5 names. A class
    // the bundled tables do not print has no ASI data (`null`), and no
    // refusal is raised on the strength of data the app does not have (D33).
    const asiLevels = asiLevelsForClassName(definition.name);
    const increases = this.payload.ability_increases ?? null;
    const isAsiLevel = asiLevels !== null && asiLevels.has(targetLevel);
    if (isAsiLevel && (increases === null || increases.length === 0)) {
      refuse(
        LEVEL_UP_REFUSAL_REASONS.abilityIncreaseRequired,
        `${definition.name} level ${String(targetLevel)} grants an Ability ` +
          'Score Improvement; no increase was chosen.',
      );
    }
    if (!isAsiLevel && increases !== null && increases.length > 0) {
      throw new TypeError(
        `${definition.name} level ${String(targetLevel)} does not grant an ` +
          'Ability Score Improvement.',
      );
    }

    // ---- One transaction (§8b). -------------------------------------------
    this.db.transaction(() => {
      const before = this.#state.capture(characterId);
      const timestamp = new Date().toISOString();
      this.db.exec(
        `UPDATE character_class_levels
         SET level = ?, subclass_definition_id = ?, updated_at = ?
         WHERE id = ?`,
        [targetLevel, subclassId, timestamp, held.id],
      );

      // Deliberately NO hit-point write (D77): the new level's hit points
      // are `die / 2 + 1` plus the Constitution modifier, derived live —
      // `character_hit_point_rolls` is untouched by this path.

      // The increases, through the EXISTING contribution machinery (§5):
      // additive `ability_increase` effect rows owned by the class source
      // instance, ordered after the character's surviving effects — the
      // `applyGuidedBackgroundChoices` pattern. The class source instance
      // exists because the class is held; it is re-synced just below.
      if (increases !== null && increases.length > 0) {
        const sourceId = this.db.scalar<number>(
          `SELECT id FROM character_source_instances
           WHERE character_id = ? AND source_type = 'class'
             AND source_definition_id = ?
           LIMIT 1`,
          [characterId, classId],
        );
        if (sourceId === null) {
          throw new TypeError(
            'The levelled class has no source instance to own its increases.',
          );
        }
        const baseOrder =
          this.db.one(
            `SELECT COALESCE(MAX(sort_order), 0) AS base
             FROM character_effects
             WHERE character_id = ?`,
            [characterId],
            (row) => sqlInteger(row, 'base'),
          ) ?? 0;
        let effectOrder = baseOrder;
        for (const increase of increases) {
          effectOrder += 1;
          this.db.exec(
            `INSERT INTO character_effects (
               character_id, sort_order, effect_kind, ability, amount,
               maximum, source_instance_id, label
             ) VALUES (?, ?, 'ability_increase', ?, ?, ?, ?, ?)`,
            [
              characterId,
              effectOrder,
              increase.ability,
              increase.amount,
              LEVEL_UP_ABILITY_INCREASE_MAXIMUM,
              Number(sourceId),
              `${definition.name} ${String(targetLevel)} ` +
                '(Ability Score Improvement)',
            ],
          );
        }
      }

      // Features and spell slots at the new level need no new machinery
      // (§6): the shared sync regenerates the class source's grants at the
      // stored level and reconciles the subclass sources.
      syncClassSourceState(
        this.db,
        this.#generator,
        characterId,
        definition,
        subclassId,
        targetLevel,
        otherLevels === null ? 1 : otherLevels + 1,
      );

      this.#before = before;
      this.#characterId = characterId;
    });
  }

  /**
   * A SNAPSHOT inverse (§8b), the shape `update_class` already uses: the
   * write touches the level row, the hit-point row, the effect rows and the
   * source instances together, and a field-by-field inverse cannot express
   * that set.
   */
  async inverse(): Promise<RestoreSnapshotPayload> {
    if (this.#characterId === null || this.#before === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return this.integrity.attach(this.#characterId, {
      type: 'restore_snapshot',
      snapshot: this.#before,
    }) as unknown as Promise<RestoreSnapshotPayload>;
  }
}
