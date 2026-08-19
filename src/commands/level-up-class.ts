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
 * `subclass_required` was struck by D70 — see the seam's note — so level 3
 * proceeds with the choice owed, never refused. B1's allocation gate is also
 * here: the friendly query terminal is not a security boundary for callers
 * of the generic command RPC.
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
import {
  asiLevelsForClassName,
  epicBoonLevelsForClassName,
} from '../rules/class-level-features-srd';
import type {
  LevelUpClassCommand as LevelUpClassPayload,
  LevelFeatSelection,
  LevelUpPlannedGrantLocator,
  LevelUpPlannedGrantSource,
  LevelUpPlannedSpellChoice,
} from '../domain/command-contracts';
import {
  LEVEL_UP_REFUSAL_REASONS,
  LEVEL_UP_SUBCLASS_LEVEL,
  type LevelUpRefusalReason,
  type LevelUpSubchoiceRefusalIssue,
} from '../builder/level-up';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';
import {
  fillSkillGrant,
  SkillGrantRefusal,
} from '../grants/skill-grants';
import {
  fillSkillExpertiseGrant,
  reconcileCharacterSkillExpertise,
  SkillExpertiseGrantRefusal,
} from '../grants/skill-expertise-grants';
import { assignSpellSelection } from '../eligibility/spell-selection-assignment';
import { levelUpSpellReplacementAllowed } from './level-up-spell-replacement';
import { syncClassSourceState } from './update-class';
import type { CharacterCommandIntegrity } from './integrity';
import { applyLevelFeatSelection } from './level-feat-choice';
import {
  reconcileCharacterLevelDependentSources,
} from '../grants/character-level-source-reconciliation';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';
import { ok, refused, type Outcome, type RefusedOutcome } from '../refusals/outcome';
import { levelUpRefused } from '../refusals/refusal';
import { runCommandTransaction } from '../refusals/transaction-outcome';
import type {
  GrantOrdinal,
  GrantRuleKey,
  SourceInstanceId,
} from '../domain/ids';

function refuse(reason: LevelUpRefusalReason): RefusedOutcome {
  if (reason === LEVEL_UP_REFUSAL_REASONS.plannedSubchoiceRefused) {
    throw new Error('A planned subchoice refusal requires locator data.');
  }
  return refused(levelUpRefused({ reason }));
}

function refuseSubchoice(
  kind: 'skill' | 'expertise' | 'spell',
  index: number,
  issue: LevelUpSubchoiceRefusalIssue,
  locator: LevelUpPlannedGrantLocator,
): RefusedOutcome {
  const source = locator.source.kind === 'existing_source'
    ? {
        kind: 'existing_source' as const,
        source_instance_id: locator.source.source_instance_id as SourceInstanceId,
      }
    : { kind: locator.source.kind };
  return refused(levelUpRefused({
    reason: LEVEL_UP_REFUSAL_REASONS.plannedSubchoiceRefused,
    subchoice_kind: kind,
    index,
    issue,
    locator: {
      source,
      rule_key: locator.rule_key as GrantRuleKey,
      ordinal: locator.ordinal as GrantOrdinal,
    },
  }));
}

function sourceIdFor(
  db: DatabaseContext,
  characterId: number,
  source: LevelUpPlannedGrantSource,
  advancedClassDefinitionId: number,
  selectedSubclassDefinitionId: number | null,
  selectedFeatSourceId: number | null,
): number | null {
  switch (source.kind) {
    case 'selected_class':
      return db.scalar<number>(
        `SELECT id FROM character_source_instances
         WHERE character_id = ? AND source_type = 'class'
           AND source_definition_id = ? AND state = ?`,
        [characterId, advancedClassDefinitionId, ACTIVE_SOURCE_INSTANCE_STATE],
      );
    case 'selected_class_subclass':
      return selectedSubclassDefinitionId === null
        ? null
        : db.scalar<number>(
            `SELECT id FROM character_source_instances
             WHERE character_id = ? AND source_type = 'subclass'
               AND source_definition_id = ? AND state = ?`,
            [
              characterId,
              selectedSubclassDefinitionId,
              ACTIVE_SOURCE_INSTANCE_STATE,
            ],
          );
    case 'selected_feat':
      return selectedFeatSourceId;
    case 'existing_source':
      return db.scalar<number>(
        `SELECT id FROM character_source_instances
         WHERE id = ? AND character_id = ? AND state = ?`,
        [source.source_instance_id, characterId, ACTIVE_SOURCE_INSTANCE_STATE],
      );
  }
}

function refusalIssue(
  error: SkillGrantRefusal | SkillExpertiseGrantRefusal,
): LevelUpSubchoiceRefusalIssue {
  return error.reason;
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
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): Outcome<void> {
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

    // ---- The guards, BEFORE the transaction (§8b). ------------------------

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
      return refuse(LEVEL_UP_REFUSAL_REASONS.classNotHeld);
    }

    // B1: every command caller, including `commands.execute`, must cross the
    // same allocation boundary as the friendly query surface. The six score
    // columns default to 10, so reading them cannot distinguish a choice from
    // untouched schema defaults; only the explicit method can.
    const allocationMethod = this.db.scalar<string>(
      'SELECT ability_allocation_method FROM characters WHERE id = ?',
      [characterId],
    );
    if (allocationMethod === null) {
      return refuse(LEVEL_UP_REFUSAL_REASONS.incompleteLevelOne);
    }

    // L-ADJACENT: one level at a time. Levelling 2 → 7 in one command would
    // skip five hit-point rows, five feature sets, and any subclass or ASI
    // obligation in between.
    const targetLevel = this.payload.target_level;
    if (targetLevel !== held.level + 1) {
      return refuse(LEVEL_UP_REFUSAL_REASONS.levelNotAdjacent);
    }
    const otherLevels = characterLevel(this.db, characterId, {
      excludingClassDefinitionId: classId,
    });
    if ((otherLevels ?? 0) + targetLevel > 20) {
      throw new TypeError('A character cannot exceed level 20.');
    }

    // The subclass choice is OFFERED at level 3, never required (D70 struck
    // the plan's L-SUBCLASS refusal; an unpicked subclass is a saveable state
    // that warns — the wizard's and the sheet's job, not this command's). A
    // key at any other level is still a wrong program.
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

    // L-ASI-LEVELS: the levels that require a feat are READ FROM THE
    // SEEDED TABLE, per class — 4/8/12/16 everywhere, plus Fighter 6 and 14
    // and Rogue 10. A hardcoded `[4]` is the D15 mistake §5 names. A class
    // the bundled tables do not print has no ASI data (`null`), and no
    // refusal is raised on the strength of data the app does not have (D33).
    const asiLevels = asiLevelsForClassName(definition.name);
    const featChoice = this.payload.feat_choice ?? null;
    const isAsiLevel = asiLevels !== null && asiLevels.has(targetLevel);
    const epicBoonLevels = epicBoonLevelsForClassName(definition.name);
    const isEpicBoonLevel =
      epicBoonLevels !== null && epicBoonLevels.has(targetLevel);
    if (
      isAsiLevel &&
      (featChoice === null || featChoice.kind !== 'feat')
    ) {
      return refuse(LEVEL_UP_REFUSAL_REASONS.abilityIncreaseRequired);
    }
    if (isEpicBoonLevel && featChoice === null) {
      throw new TypeError(
        `${definition.name} level ${String(targetLevel)} requires an Epic Boon choice or explicit deferral.`,
      );
    }
    if (!isAsiLevel && !isEpicBoonLevel && featChoice !== null) {
      throw new TypeError(
        `${definition.name} level ${String(targetLevel)} does not grant an ` +
          'ASI-level feat or Epic Boon.',
      );
    }
    // ---- One transaction (§8b). -------------------------------------------
    return runCommandTransaction(this.db, () => {
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

      let featSourceId: number | null = null;
      if (featChoice?.kind === 'feat') {
        const plannedFeatChoice = this.withPlannedFeatSkills(featChoice);
        featSourceId = applyLevelFeatSelection(this.db, this.#generator, {
          characterId,
          selection: plannedFeatChoice,
          projectedTotalLevel: (otherLevels ?? 0) + targetLevel,
          advancedClassDefinitionId: classId,
          targetClassLevel: targetLevel,
          targetSubclassContentKey: subclassKey,
          ...(isEpicBoonLevel ? { requiredGrouping: 'epic_boon' } : {}),
        });
      }

      if (isAsiLevel || isEpicBoonLevel) {
        this.db.exec(
          `INSERT INTO character_level_feat_choices (
             character_id, character_class_level_id, class_level,
             choice_kind, feat_source_instance_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            characterId,
            held.id,
            targetLevel,
            isAsiLevel ? 'asi_level_feat' : 'epic_boon',
            featSourceId,
            timestamp,
            timestamp,
          ],
        );
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
      reconcileCharacterLevelDependentSources(
        this.db,
        characterId,
        this.#generator,
      );

      const planned = this.applyPlannedSubchoices(
        characterId,
        classId,
        subclassId,
        featSourceId,
      );
      if (planned.kind === 'refused') return planned;

      this.#before = before;
      this.#characterId = characterId;
      return ok(undefined);
    });
  }

  private applyPlannedSubchoices(
    characterId: number,
    classDefinitionId: number,
    subclassDefinitionId: number | null,
    featSourceId: number | null,
  ): Outcome<void> {
    const planned = this.payload.planned_subchoices;
    if (planned === undefined) {
      return ok(undefined);
    }
    const resolveSource = (
      locator: LevelUpPlannedGrantLocator,
      kind: 'skill' | 'expertise' | 'spell',
      index: number,
    ): Outcome<number> => {
      const sourceId = sourceIdFor(
        this.db,
        characterId,
        locator.source,
        classDefinitionId,
        subclassDefinitionId,
        featSourceId,
      );
      if (sourceId === null) {
        return refuseSubchoice(
          kind,
          index,
          'source_not_available',
          locator,
        );
      }
      return ok(Number(sourceId));
    };

    for (const [index, choice] of planned.skills.entries()) {
      const source = resolveSource(choice.locator, 'skill', index);
      if (source.kind === 'refused') return source;
      const sourceId = source.value;
      const grantId = this.logicalRowId(
        'character_skill_grants',
        characterId,
        sourceId,
        choice.locator,
      );
      if (grantId === null) {
        return refuseSubchoice(
          'skill',
          index,
          'locator_not_found',
          choice.locator,
        );
      }
      const generatedSelection = this.db.scalar<string>(
        `SELECT skill FROM character_skill_grants
         WHERE id = ? AND character_id = ?`,
        [grantId, characterId],
      );
      if (
        choice.locator.source.kind === 'selected_feat' &&
        generatedSelection === choice.skill
      ) {
        continue;
      }
      try {
        fillSkillGrant(this.db, characterId, grantId, choice.skill);
      } catch (error) {
        if (error instanceof SkillGrantRefusal) {
          return refuseSubchoice(
            'skill',
            index,
            refusalIssue(error),
            choice.locator,
          );
        }
        throw error;
      }
    }

    // Expertise is offered after every skill choice (D90). Reconciliation at
    // this boundary revives any preserved Expertise whose proficiency was
    // restored by one of the fills above.
    reconcileCharacterSkillExpertise(this.db, characterId);
    for (const [index, choice] of planned.expertise.entries()) {
      const source = resolveSource(choice.locator, 'expertise', index);
      if (source.kind === 'refused') return source;
      const sourceId = source.value;
      const grantId = this.logicalRowId(
        'character_skill_expertise_grants',
        characterId,
        sourceId,
        choice.locator,
      );
      if (grantId === null) {
        return refuseSubchoice(
          'expertise',
          index,
          'locator_not_found',
          choice.locator,
        );
      }
      try {
        fillSkillExpertiseGrant(
          this.db,
          characterId,
          grantId,
          choice.skill,
        );
      } catch (error) {
        if (error instanceof SkillExpertiseGrantRefusal) {
          return refuseSubchoice(
            'expertise',
            index,
            refusalIssue(error),
            choice.locator,
          );
        }
        throw error;
      }
    }

    for (const [index, choice] of planned.spells.entries()) {
      const source = resolveSource(choice.locator, 'spell', index);
      if (source.kind === 'refused') return source;
      const applied = this.applyPlannedSpell(
        characterId,
        source.value,
        choice,
        index,
      );
      if (applied.kind === 'refused') return applied;
    }
    return ok(undefined);
  }

  private withPlannedFeatSkills(
    selection: LevelFeatSelection,
  ): LevelFeatSelection {
    const configured = selection.config.selected_skills;
    if (!Array.isArray(configured)) return selection;
    const selectedSkills = [...configured];
    for (const choice of this.payload.planned_subchoices?.skills ?? []) {
      if (
        choice.locator.source.kind !== 'selected_feat' ||
        choice.locator.ordinal > selectedSkills.length
      ) {
        continue;
      }
      selectedSkills[choice.locator.ordinal - 1] = choice.skill;
    }
    return {
      ...selection,
      config: { ...selection.config, selected_skills: selectedSkills },
    };
  }

  private logicalRowId(
    table:
      | 'character_skill_grants'
      | 'character_skill_expertise_grants',
    characterId: number,
    sourceId: number,
    locator: LevelUpPlannedGrantLocator,
  ): number | null {
    return this.db.scalar<number>(
      `SELECT id FROM ${table}
       WHERE character_id = ? AND source_instance_id = ?
         AND grant_key = ? AND ordinal = ? AND state = 'active'`,
      [characterId, sourceId, locator.rule_key, locator.ordinal],
    );
  }

  private applyPlannedSpell(
    characterId: number,
    sourceId: number,
    choice: LevelUpPlannedSpellChoice,
    index: number,
  ): Outcome<void> {
    const address = choice.kind === 'slot_selection'
      ? this.db.oneRaw(
          `SELECT id, fixed_spell_version_id, current_spell_version_id
           FROM spell_selection_slots
           WHERE character_id = ? AND source_instance_id = ?
             AND rule_key = ? AND ordinal = ?
             AND state IN ('active', 'kept_override')`,
          [
            characterId,
            sourceId,
            choice.locator.rule_key,
            choice.locator.ordinal,
          ],
        )
      : this.db.oneRaw(
          `SELECT id, NULL AS fixed_spell_version_id,
                  spell_version_id AS current_spell_version_id
           FROM wizard_spellbook_entries
           WHERE character_id = ? AND source_instance_id = ?
             AND rule_key = ? AND ordinal = ? AND state = 'active'`,
          [
            characterId,
            sourceId,
            choice.locator.rule_key,
            choice.locator.ordinal,
          ],
        );
    if (address === null) {
      return refuseSubchoice(
        'spell',
        index,
        'locator_not_found',
        choice.locator,
      );
    }
    const occupied =
      address.fixed_spell_version_id !== null ||
      address.current_spell_version_id !== null;
    if (choice.kind === 'slot_selection' && choice.mode === 'new' && occupied) {
      return refuseSubchoice(
        'spell',
        index,
        'expected_unfilled',
        choice.locator,
      );
    }
    if (
      choice.kind === 'slot_selection' &&
      choice.mode === 'replace' &&
      !occupied
    ) {
      return refuseSubchoice(
        'spell',
        index,
        'expected_filled',
        choice.locator,
      );
    }
    if (
      choice.kind === 'slot_selection' &&
      choice.mode === 'replace' &&
      !levelUpSpellReplacementAllowed(
        this.db,
        sourceId,
        choice.locator.rule_key,
        choice.locator.ordinal,
      )
    ) {
      return refuseSubchoice(
        'spell',
        index,
        'spell_not_eligible',
        choice.locator,
      );
    }
    if (choice.kind === 'spellbook_acquisition' && occupied) {
      return refuseSubchoice(
        'spell',
        index,
        'expected_unfilled',
        choice.locator,
      );
    }
    try {
      if (choice.kind === 'slot_selection') {
        assignSpellSelection(this.db, {
          address: {
            kind: 'slot_selection',
            id: Number(address.id),
          },
          character_id: characterId,
          spell_version_id: choice.spell_version_id,
        });
      } else {
        assignSpellSelection(this.db, {
          address: {
            kind: 'spellbook_acquisition',
            id: Number(address.id),
          },
          character_id: characterId,
          spell_version_id: choice.spell_version_id,
        });
      }
    } catch (error) {
      return refuseSubchoice(
        'spell',
        index,
        'spell_not_eligible',
        choice.locator,
      );
    }
    return ok(undefined);
  }

  /**
   * A SNAPSHOT inverse (§8b), the shape `update_class` already uses: the
   * write touches the level row, feat occurrence, effect rows, grants and
   * source instances together, and a field-by-field inverse cannot express
   * that set.
   */
  async inverse(): Promise<StoredCharacterSnapshotInverse> {
    if (this.#characterId === null || this.#before === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'internal_snapshot_restore',
      snapshot: this.#before,
    };
  }
}
