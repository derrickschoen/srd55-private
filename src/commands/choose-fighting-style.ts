import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type { DatabaseContext } from '../db/database';
import type {
  ChooseFightingStyleCommand as ChooseFightingStylePayload,
} from '../domain/command-contracts';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import { guidedRequiredFighterChoicesState } from '../builder/required-fighter-choices';
import { characterLevel } from '../rules/character-level';
import {
  ADDITIONAL_FIGHTING_STYLE_CONFIG_CONFIG,
  ADDITIONAL_FIGHTING_STYLE_KEY_CONFIG,
} from '../rules/srd-subclasses';
import { sqlInteger } from '../db/codecs';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';
import type { CharacterCommandIntegrity } from './integrity';
import { applyLevelFeatSelection } from './level-feat-choice';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

/**
 * Records a Fighter's required Fighting Style as the real feat source.
 *
 * TWO ENTITLEMENTS, ONE COMMAND. Fighter level 1 grants a Fighting Style feat;
 * a subclass carrying the Champion's level-7 "Additional Fighting Style" rule
 * grants another. They are filled in that order, so the caller says WHICH FEAT
 * and never has to say which entitlement. The two are recorded by DIFFERENT
 * mechanisms because they are different mechanisms in the rules data: level 1
 * has no grant rule to hang a feat on, while the subclass rule is a real
 * `grant_source` whose chosen definition IS the source instance's config — the
 * background Origin-feat shape, materialised by the existing generator.
 */
export class ChooseFightingStyleCommand {
  readonly actionType = 'choose_fighting_style';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | null = null;
  #before: CharacterStateSnapshot | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: ChooseFightingStylePayload,
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): void {
    this.db.transaction(() => {
      const choices = guidedRequiredFighterChoicesState(this.db, characterId);
      if (choices.fighter === null) {
        throw new TypeError('A Fighting Style choice requires Fighter level 1.');
      }
      const additional = choices.fighter.additional_fighting_style;
      if (choices.fighter.fighting_style.chosen !== null) {
        if (additional.state !== 'entitled' || additional.chosen !== null) {
          throw new TypeError(
            `${choices.fighter.fighting_style.chosen.name} is already recorded as this Fighter’s Fighting Style.`,
          );
        }
        if (!additional.options.some(
          (option) => option.content_key === this.payload.feat_content_key,
        )) {
          throw new TypeError(
            'That Fighting Style is not available for this subclass’s additional choice.',
          );
        }
        this.#before = this.#state.capture(characterId);
        this.recordAdditionalStyle(additional.source_instance_id);
        this.#characterId = characterId;
        return;
      }
      if (!choices.fighter.fighting_style.options.some(
        (option) => option.content_key === this.payload.feat_content_key,
      )) {
        throw new TypeError(
          'That Fighting Style is not available in the installed catalog.',
        );
      }
      const fighterSource = this.db.one(
        `SELECT source.id AS source_instance_id,
                definition.id AS class_definition_id
         FROM character_source_instances AS source
         JOIN class_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ?
           AND source.source_type = 'class'
           AND source.state = ?
           AND definition.content_key = '2024:class:fighter'
         ORDER BY source.id
         LIMIT 1`,
        [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
        (row) => ({
          source_instance_id: sqlInteger(row, 'source_instance_id'),
          class_definition_id: sqlInteger(row, 'class_definition_id'),
        }),
      );
      if (fighterSource === null) {
        throw new TypeError(
          'The Fighter class source is missing, so its Fighting Style cannot be recorded.',
        );
      }
      const totalLevel = characterLevel(this.db, characterId);
      if (totalLevel === null) {
        throw new TypeError('A Fighting Style choice requires a held class.');
      }
      const before = this.#state.capture(characterId);
      const styleSourceId = applyLevelFeatSelection(this.db, this.#generator, {
        characterId,
        selection: {
          kind: 'feat',
          feat_content_key: this.payload.feat_content_key,
          config: {},
          ability_increases: [],
        },
        projectedTotalLevel: totalLevel,
        advancedClassDefinitionId: fighterSource.class_definition_id,
        targetClassLevel: choices.fighter.class_level,
        targetSubclassContentKey: null,
        requiredGrouping: 'fighting_style',
      });
      this.db.exec(
        `UPDATE character_source_instances
         SET parent_source_instance_id = ?,
             notes = 'required_fighter_choice:fighting_style',
             updated_at = ?
         WHERE id = ? AND character_id = ?`,
        [
          fighterSource.source_instance_id,
          new Date().toISOString(),
          styleSourceId,
          characterId,
        ],
      );
      this.#before = before;
      this.#characterId = characterId;
    });
  }

  /**
   * Writes the chosen feat key into the subclass source's own config and lets
   * the generator materialise the feat. Nothing here creates a source instance:
   * the subclass's `grant_source` rule already says one exists once the config
   * names a definition, and `generateForSource` is the single path that turns a
   * rule into rows.
   */
  private recordAdditionalStyle(subclassSourceInstanceId: number): void {
    const stored = this.db.scalar<string>(
      'SELECT config FROM character_source_instances WHERE id = ?',
      [subclassSourceInstanceId],
    );
    const decoded: unknown =
      stored === null || stored === '' ? {} : JSON.parse(stored);
    if (
      decoded === null ||
      typeof decoded !== 'object' ||
      Array.isArray(decoded)
    ) {
      throw new TypeError('Subclass configuration must be an object.');
    }
    const config = decoded as Record<string, unknown>;
    config[ADDITIONAL_FIGHTING_STYLE_KEY_CONFIG] =
      this.payload.feat_content_key;
    config[ADDITIONAL_FIGHTING_STYLE_CONFIG_CONFIG] = {};
    this.db.exec(
      `UPDATE character_source_instances
       SET config = ?, updated_at = ?
       WHERE id = ?`,
      [
        JSON.stringify(config),
        new Date().toISOString(),
        subclassSourceInstanceId,
      ],
    );
    this.#generator.generateForSource(subclassSourceInstanceId);
  }

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
