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
import { sqlInteger } from '../db/codecs';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';
import type { CharacterCommandIntegrity } from './integrity';
import { applyLevelFeatSelection } from './level-feat-choice';

/** Records Fighter 1's required Fighting Style as the real feat source. */
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
      if (choices.fighter.fighting_style.chosen !== null) {
        throw new TypeError(
          `${choices.fighter.fighting_style.chosen.name} is already recorded as this Fighter’s Fighting Style.`,
        );
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
           AND source.state = 'active'
           AND definition.content_key = '2024:class:fighter'
         ORDER BY source.id
         LIMIT 1`,
        [characterId],
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
