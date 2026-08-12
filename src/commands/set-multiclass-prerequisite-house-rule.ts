import type { DatabaseContext } from '../db/database';
import type {
  RestoreMulticlassPrerequisiteHouseRuleCommand as RestorePayload,
  SetMulticlassPrerequisiteHouseRuleCommand as SetPayload,
} from '../domain/command-contracts';
import {
  captureMulticlassPrerequisiteHouseRule,
  restoreMulticlassPrerequisiteHouseRule,
  setMulticlassPrerequisiteHouseRule,
} from '../rules/multiclass-prerequisite-house-rule';
import type { CharacterCommandIntegrity } from './integrity';

function assertCharacter(db: DatabaseContext, characterId: number): void {
  if (
    db.scalar<number>('SELECT count(*) FROM characters WHERE id = ?', [
      characterId,
    ]) !== 1
  ) {
    throw new TypeError(`Character ${String(characterId)} does not exist.`);
  }
}

export class SetMulticlassPrerequisiteHouseRuleCommand {
  readonly actionType = 'set_multiclass_prerequisite_house_rule';
  #characterId: number | null = null;
  #previous: ReturnType<typeof captureMulticlassPrerequisiteHouseRule> | null =
    null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: SetPayload,
    private readonly integrity: CharacterCommandIntegrity,
  ) {}

  apply(characterId: number): void {
    assertCharacter(this.db, characterId);
    this.#previous = captureMulticlassPrerequisiteHouseRule(
      this.db,
      characterId,
    );
    this.#characterId = characterId;
    setMulticlassPrerequisiteHouseRule(
      this.db,
      characterId,
      this.payload.waive,
    );
  }

  async inverse(): Promise<RestorePayload> {
    if (this.#characterId === null || this.#previous === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return this.integrity.attach(this.#characterId, {
      type: 'restore_multiclass_prerequisite_house_rule',
      state: this.#previous,
    });
  }
}

export class RestoreMulticlassPrerequisiteHouseRuleCommand {
  readonly actionType = 'restore_multiclass_prerequisite_house_rule';
  #characterId: number | null = null;
  #previous: ReturnType<typeof captureMulticlassPrerequisiteHouseRule> | null =
    null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: RestorePayload,
    private readonly integrity: CharacterCommandIntegrity,
  ) {}

  apply(characterId: number): void {
    assertCharacter(this.db, characterId);
    this.#previous = captureMulticlassPrerequisiteHouseRule(
      this.db,
      characterId,
    );
    this.#characterId = characterId;
    restoreMulticlassPrerequisiteHouseRule(
      this.db,
      characterId,
      this.payload.state,
    );
  }

  async inverse(): Promise<RestorePayload> {
    if (this.#characterId === null || this.#previous === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return this.integrity.attach(this.#characterId, {
      type: 'restore_multiclass_prerequisite_house_rule',
      state: this.#previous,
    });
  }
}
