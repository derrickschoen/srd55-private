import { sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { CharacterNotFoundError } from './character-crud';

export const PRINT_APPENDIX_PREFERENCE_KEYS = Object.freeze({
  flavor: 'print_appendix_flavor',
  spells: 'print_appendix_spells',
  audit: 'print_appendix_audit',
} as const);

export const PRINT_APPENDIX_KINDS = Object.freeze([
  'flavor',
  'spells',
  'audit',
] as const);

export type PrintAppendixKind = (typeof PRINT_APPENDIX_KINDS)[number];

export type PrintAppendixPreferences = Readonly<
  Record<PrintAppendixKind, boolean>
>;

interface StoredPreference {
  readonly rule_key: string;
  readonly value: string;
}

const storedPreference = (
  row: Parameters<typeof sqlString>[0],
): StoredPreference => ({
  rule_key: sqlString(row, 'rule_key'),
  value: sqlString(row, 'value'),
});

function isEnabled(value: string): boolean {
  try {
    return JSON.parse(value) === true;
  } catch {
    return false;
  }
}

/**
 * D162's three per-character print choices. OFF is absence and ON is the
 * canonical JSON boolean `true`, following the W-MC override-row precedent.
 * These UI preferences deliberately do not revise the character or enter its
 * operation history: their only durable mutation is the named override row.
 */
export class PrintAppendixPreferenceQueries {
  constructor(private readonly db: DatabaseContext) {}

  read(characterId: number): PrintAppendixPreferences {
    const rows = this.db.all(
      `SELECT rule_key, value
       FROM character_rule_overrides
       WHERE character_id = ?
         AND rule_key IN (?, ?, ?)`,
      [
        characterId,
        PRINT_APPENDIX_PREFERENCE_KEYS.flavor,
        PRINT_APPENDIX_PREFERENCE_KEYS.spells,
        PRINT_APPENDIX_PREFERENCE_KEYS.audit,
      ],
      storedPreference,
    );
    const enabled = new Set(
      rows.filter((row) => isEnabled(row.value)).map((row) => row.rule_key),
    );
    return {
      flavor: enabled.has(PRINT_APPENDIX_PREFERENCE_KEYS.flavor),
      spells: enabled.has(PRINT_APPENDIX_PREFERENCE_KEYS.spells),
      audit: enabled.has(PRINT_APPENDIX_PREFERENCE_KEYS.audit),
    };
  }

  set(
    characterId: number,
    kind: PrintAppendixKind,
    enabled: boolean,
  ): PrintAppendixPreferences {
    return this.db.transaction(() => {
      if (
        this.db.scalar<number>(
          'SELECT count(*) FROM characters WHERE id = ?',
          [characterId],
        ) !== 1
      ) {
        throw new CharacterNotFoundError(characterId);
      }

      const ruleKey = PRINT_APPENDIX_PREFERENCE_KEYS[kind];
      if (enabled) {
        this.db.exec(
          `INSERT INTO character_rule_overrides (
             character_id, rule_key, value, note, created_at, updated_at
           ) VALUES (?, ?, 'true', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT(character_id, rule_key) DO UPDATE SET
             value = 'true',
             note = NULL,
             updated_at = CURRENT_TIMESTAMP`,
          [characterId, ruleKey],
        );
      } else {
        this.db.exec(
          `DELETE FROM character_rule_overrides
           WHERE character_id = ? AND rule_key = ?`,
          [characterId, ruleKey],
        );
      }
      return this.read(characterId);
    });
  }
}
