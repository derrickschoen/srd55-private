import { describe, expect, it } from 'vitest';
import {
  COLUMN_REFINEMENTS,
  NARROWED_REFINEMENTS,
  ROW_REFINEMENTS,
  rowContractError,
} from '../../../src/domain/contracts/rows';
import { COLUMN_FACTS } from '../../../src/domain/contracts/generated/column-facts';
import {
  JSON_COLUMNS,
  JSON_COLUMN_KEYS,
  jsonColumnLocation,
} from '../../../src/domain/contracts/json-columns';
import {
  BACKUP_TABLES,
  CHARACTER_STATE_TABLES,
} from '../../../src/domain/contracts/tables';

/**
 * THESE TESTS EXIST TO SHOW THE CONTRACTS CAN REFUSE.
 *
 * A validator never observed rejecting anything has not been shown to work, so
 * every case below constructs a specific malformation and asserts both that it
 * is refused AND that the message names the table, the row and the field.
 */

function characterRow(): Record<string, unknown> {
  return {
    id: 7,
    name: 'Portable Hero',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    ability_allocation_method: null,
    proficiency_bonus_override: null,
    rules_edition_preference: '2024',
    allow_legacy: 0,
    revision: 0,
    notes: null,
    created_at: null,
    updated_at: null,
  };
}

function sourceRow(): Record<string, unknown> {
  return {
    id: 11,
    character_id: 7,
    instance_uuid: 'source-original',
    parent_source_instance_id: null,
    source_type: 'class',
    source_definition_id: 31,
    display_name: 'Wizard 1',
    config: '{"school":"abjuration"}',
    acquired_at_character_level: 1,
    state: 'active',
    notes: null,
    created_at: '2026-07-23 12:00:00',
    updated_at: '2026-07-23T12:00:00.000Z',
  };
}

function slotRow(): Record<string, unknown> {
  return {
    id: 12,
    character_id: 7,
    source_instance_id: 11,
    slot_key: 'source-original:prepared:1',
    rule_key: 'prepared',
    ordinal: 1,
    bucket: 'prepared',
    eligibility_kind: 'choice_from_query',
    fixed_spell_version_id: null,
    current_spell_version_id: 41,
    label: null,
    spell_level_min: 0,
    spell_level_max: 9,
    allowed_spell_lists: '["arcane"]',
    allowed_schools: null,
    allowed_tags: null,
    always_prepared: 0,
    with_slots: 1,
    free_cast: '{"uses":1}',
    counts_against_limit: 1,
    required: 0,
    is_locked: 0,
    state: 'active',
    orphan_reason_code: null,
    orphaned_at: null,
    prior_config: null,
    override_note: null,
    sort_order: 1,
    notes: null,
    created_at: null,
    updated_at: null,
    selection_collection: null,
    selection_acquired_at_class_level: null,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  };
}

function classLevelRow(): Record<string, unknown> {
  return {
    id: 5,
    character_id: 7,
    class_definition_id: 31,
    subclass_definition_id: null,
    level: 3,
    is_starting_class: 1,
    spellcasting_ability_override: null,
    notes: null,
    created_at: null,
    updated_at: null,
  };
}

function backgroundEquipmentRow(): Record<string, unknown> {
  return {
    id: 19,
    background_template_id: 3,
    option: 'b',
    sort_order: 1,
    quantity: 1,
    item_name: '50 GP',
    item_kind: 'gear',
    weapon_template_id: null,
    armor_template_id: null,
    created_at: null,
    updated_at: null,
  };
}

const label = 'Character backup tables.character_source_instances[3]';
const slotLabel = 'Character backup tables.spell_selection_slots[0]';
const classLabel = 'Character backup tables.character_class_levels[0]';

/**
 * F11: `character_class_levels.level` IS THE ONE LEVEL COLUMN WITH NO CHECK.
 *
 * The other class-level columns are bounded twice — by a `class_level BETWEEN 1
 * AND 20` CHECK and by the `classLevel` contract — so a test of the contract
 * there duplicates the database. This column has ONLY the contract, because the
 * CHECK is deliberately absent (`db/schema/character.ts`, and
 * `tests/integration/rules/class-progression.test.ts` writes a 21 through raw
 * SQL to force a missing progression row). The contract is therefore the whole
 * bound, and these cases are the only place it can be observed refusing.
 *
 * The values are F11's own, so the measurement it published can be re-run
 * against the fix rather than restated: it recorded 21, 9999 and
 * 1,099,511,627,776 all ACCEPTED here.
 */
describe('F11: the level every sheet computation runs off', () => {
  it('accepts the bounds and everything between', () => {
    for (const level of [1, 2, 10, 19, 20]) {
      expect(
        rowContractError(
          'character_class_levels',
          { ...classLevelRow(), level },
          classLabel,
        ),
      ).toBeNull();
    }
  });

  it.each([
    { level: 21, bound: 'Too big' },
    { level: 9999, bound: 'Too big' },
    { level: 1_099_511_627_776, bound: 'Too big' },
    { level: 0, bound: 'Too small' },
    { level: -3, bound: 'Too small' },
  ])('refuses level $level and names the field', ({ level, bound }) => {
    const error = rowContractError(
      'character_class_levels',
      { ...classLevelRow(), level },
      classLabel,
    );
    expect(error).toContain(`${classLabel}.level:`);
    expect(error).toContain(bound);
  });

  it('refuses a fractional level, which no writer and no CHECK would catch', () => {
    expect(
      rowContractError(
        'character_class_levels',
        { ...classLevelRow(), level: 3.5 },
        classLabel,
      ),
    ).toContain(`${classLabel}.level:`);
  });

  it('does NOT refuse a combined total over 20 — that is a sheet warning', () => {
    // D11 part 2, and the half of F11 that deliberately did NOT move into the
    // contracts. Two rows summing to 25 are each individually legal and the
    // boundary accepts both; `total_level_exceeds_maximum` in
    // `src/rules/sheet.ts` is what states the problem. A contract that refused
    // this pair would lose a whole character to state a number.
    for (const level of [20, 5]) {
      expect(
        rowContractError(
          'character_class_levels',
          { ...classLevelRow(), level },
          classLabel,
        ),
      ).toBeNull();
    }
  });
});

describe('per-table row contracts', () => {
  it('accepts a well-formed row', () => {
    expect(
      rowContractError('characters', characterRow(), 'Character'),
    ).toBeNull();
    expect(
      rowContractError('character_source_instances', sourceRow(), label),
    ).toBeNull();
  });

  it('refuses an unknown column, which would become an INSERT identifier', () => {
    const row = { ...sourceRow(), '"; DROP TABLE characters; --': 1 };
    const error = rowContractError('character_source_instances', row, label);
    expect(error).toContain(label);
    expect(error).toContain('nrecognized key');
  });

  it('refuses a missing column rather than silently taking a default', () => {
    const row = sourceRow();
    delete row.display_name;
    expect(rowContractError('character_source_instances', row, label)).toBe(
      `${label}.display_name: Invalid input: expected string, received undefined.`,
    );
  });

  it('names the offending field for a wrong-typed value', () => {
    const row = { ...sourceRow(), display_name: { nested: 'object' } };
    expect(rowContractError('character_source_instances', row, label)).toContain(
      `${label}.display_name:`,
    );
  });

  it('refuses a value outside a schema-declared enum', () => {
    const row = { ...sourceRow(), source_type: 'artifact' };
    expect(rowContractError('character_source_instances', row, label)).toContain(
      `${label}.source_type:`,
    );
  });

  it('refuses the retired coin equipment kind at the command-side seed contract', () => {
    const equipmentLabel = 'Bundled background_equipment_items row';
    expect(
      rowContractError(
        'background_equipment_items',
        backgroundEquipmentRow(),
        equipmentLabel,
      ),
    ).toBeNull();
    expect(
      rowContractError(
        'background_equipment_items',
        { ...backgroundEquipmentRow(), item_kind: 'coin' },
        equipmentLabel,
      ),
    ).toContain(`${equipmentLabel}.item_kind:`);
  });

  it('refuses non-JSON in a JSON text column — the F3b hole', () => {
    const overrideLabel = 'Character backup tables.character_rule_overrides[0]';
    const row = {
      id: 1,
      character_id: 7,
      rule_key: 'prepared_formula',
      value: 'not json at all',
      note: null,
      created_at: null,
      updated_at: null,
    };
    expect(rowContractError('character_rule_overrides', row, overrideLabel)).toBe(
      `${overrideLabel}.value: must be JSON text.`,
    );
    expect(
      rowContractError(
        'character_rule_overrides',
        { ...row, value: '{"count":7}' },
        overrideLabel,
      ),
    ).toBeNull();
  });

  it('refuses a null in a NOT NULL column and accepts one where the column allows it', () => {
    expect(
      rowContractError(
        'character_source_instances',
        { ...sourceRow(), display_name: null },
        label,
      ),
    ).toContain(`${label}.display_name:`);
    // D6b: `parent_source_instance_id` is a defended null. Refusing it would be
    // a data-loss bug, not a tightening.
    expect(
      rowContractError(
        'character_source_instances',
        { ...sourceRow(), parent_source_instance_id: null },
        label,
      ),
    ).toBeNull();
  });

  it('accepts both timestamp formats this application writes', () => {
    for (const stamp of [
      '2026-07-23 12:00:00',
      '2026-07-23T12:00:00.000Z',
      null,
    ]) {
      expect(
        rowContractError(
          'character_source_instances',
          { ...sourceRow(), created_at: stamp },
          label,
        ),
      ).toBeNull();
    }
    expect(
      rowContractError(
        'character_source_instances',
        { ...sourceRow(), created_at: 1_700_000_000 },
        label,
      ),
    ).toContain(`${label}.created_at:`);
  });

  it('validates a projection of a table when asked for one', () => {
    const projection = {
      name: 'Portable Hero',
      strength: 10,
      rules_edition_preference: '2024',
    };
    const columns = ['name', 'strength', 'rules_edition_preference'] as const;
    expect(
      rowContractError('characters', projection, 'Snapshot.character', columns),
    ).toBeNull();
    expect(
      rowContractError(
        'characters',
        { ...projection, rules_edition_preference: '2050' },
        'Snapshot.character',
        columns,
      ),
    ).toContain('Snapshot.character.rules_edition_preference:');
  });

  it('contracts every table a portable backup writes', () => {
    // The contract set is derived from TABLE_SCOPES, so a table newly marked
    // `backup: true` cannot reach `insertPortableRow` uncontracted.
    for (const table of [...BACKUP_TABLES, 'characters'] as const) {
      const columns = Object.keys(COLUMN_FACTS[table]);
      expect(columns.length).toBeGreaterThan(0);
      // An empty object is missing every column, so every contract must refuse
      // it — proof that none of them degenerated into an accept-anything schema.
      expect(rowContractError(table, {}, `probe.${table}[0]`)).toContain(
        `probe.${table}[0].`,
      );
      expect(rowContractError(table, 'not an object', `probe.${table}[0]`)).not
        .toBeNull();
    }
    for (const table of CHARACTER_STATE_TABLES) {
      expect(BACKUP_TABLES).toContain(table);
    }
  });
});

/**
 * A JSON COLUMN'S CONTRACT IS ITS READER'S CONTRACT, NOT "PARSES AS JSON".
 *
 * The first version of these contracts checked syntax only, and syntax was
 * measured wrong in BOTH directions. Each case below is the proof for one
 * direction, so a regression to a single `JSON.parse` refinement fails here.
 */
describe('JSON column shapes', () => {
  it('refuses a JSON object where the reader needs an array — the fail-open case', () => {
    // `'{}'` is valid JSON. `decodeStringList` returns `[]` for any non-array
    // and the eligibility checks apply a restriction only when the list is
    // non-empty, so accepting this SILENTLY DELETES the slot's spell
    // restrictions and reports the import as successful.
    expect(
      rowContractError(
        'spell_selection_slots',
        { ...slotRow(), allowed_spell_lists: '{}' },
        slotLabel,
      ),
    ).toBe(`${slotLabel}.allowed_spell_lists: must be a JSON array.`);
    expect(
      rowContractError(
        'spell_selection_slots',
        { ...slotRow(), allowed_schools: '"abjuration"' },
        slotLabel,
      ),
    ).toBe(`${slotLabel}.allowed_schools: must be a JSON array.`);
    // ...and an array is still accepted, so this is a shape check and not a ban.
    expect(
      rowContractError(
        'spell_selection_slots',
        { ...slotRow(), allowed_tags: '["ritual"]' },
        slotLabel,
      ),
    ).toBeNull();
  });

  it('accepts the empty strings this codebase’s own readers treat as meaningful', () => {
    // `jsonRecord('')` returns `{}` on purpose (src/queries/source-config.ts:5),
    // so refusing `''` would reject a value the application itself defines.
    expect(
      rowContractError(
        'character_source_instances',
        { ...sourceRow(), config: '' },
        label,
      ),
    ).toBeNull();
    // Same for the slot lists: `decodeStringList('')` is `[]`.
    expect(
      rowContractError(
        'spell_selection_slots',
        { ...slotRow(), allowed_spell_lists: '', allowed_schools: '' },
        slotLabel,
      ),
    ).toBeNull();
  });

  it('refuses an array where the reader needs an object', () => {
    expect(
      rowContractError(
        'character_source_instances',
        { ...sourceRow(), config: '[]' },
        label,
      ),
    ).toBe(`${label}.config: must be a JSON object.`);
    expect(
      rowContractError(
        'spell_selection_slots',
        { ...slotRow(), free_cast: '[1,2]' },
        slotLabel,
      ),
    ).toBe(`${slotLabel}.free_cast: must be a JSON object.`);
  });

  it('refuses an empty string where no reader defines one', () => {
    // `free_cast` is read by a bare `JSON.parse`, which throws on `''`. There is
    // no reader that gives it a meaning, so accepting it would store a value
    // that can only fail later.
    expect(
      rowContractError(
        'spell_selection_slots',
        { ...slotRow(), free_cast: '' },
        slotLabel,
      ),
    ).toBe(`${slotLabel}.free_cast: must be a JSON object.`);
  });

  it('classifies only real columns, and every classification names its reader', () => {
    for (const key of JSON_COLUMN_KEYS) {
      const { table, column } = jsonColumnLocation(key);
      expect(
        Object.keys(COLUMN_FACTS[table]),
        `${key} must be a real column`,
      ).toContain(column);
      expect(JSON_COLUMNS[key].reader.length).toBeGreaterThan(10);
    }
  });
});

/**
 * WHAT THE COMPILE-TIME D6b GUARD CANNOT SEE, KEPT HONEST BY TEST.
 *
 * `_NoOverTightening` compares inferred TYPES, and `z.infer` erases `.min()`,
 * `.max()` and `.refine()`. So `z.string().min(1)` on a `varchar NOT NULL`
 * column is a real narrowing that compiles clean. These two tests are the only
 * thing standing between that blind spot and an undisclosed tightening.
 */
describe('declared narrowings', () => {
  it('uses only registered refinements, so an ad-hoc narrowing cannot be smuggled in', () => {
    const registered = new Set<unknown>(Object.values(COLUMN_REFINEMENTS));
    for (const [key, schema] of Object.entries(ROW_REFINEMENTS)) {
      expect(
        registered.has(schema),
        `${key} uses a refinement that is not in COLUMN_REFINEMENTS`,
      ).toBe(true);
    }
  });

  it('proves every declared narrowing really rejects the value it claims to', () => {
    expect(NARROWED_REFINEMENTS.length).toBeGreaterThan(0);
    for (const narrowing of NARROWED_REFINEMENTS) {
      const schema = COLUMN_REFINEMENTS[narrowing.name];
      expect(
        schema.safeParse(narrowing.rejects).success,
        `${narrowing.name} claims to refuse ${JSON.stringify(narrowing.rejects)}`,
      ).toBe(false);
      expect(narrowing.reason.length).toBeGreaterThan(20);
    }
  });

  it('leaves every UNDECLARED text refinement as wide as the column', () => {
    const narrowed = new Set<string>(
      NARROWED_REFINEMENTS.map((narrowing) => narrowing.name),
    );
    for (const [name, schema] of Object.entries(COLUMN_REFINEMENTS)) {
      // Enums and the boolean union are skipped because their narrowing IS
      // visible to `_NoOverTightening`: `z.enum` survives `z.infer`, so the
      // compile guard already proves each one matches the column's declared
      // domain type. Everything else must accept `''`, the widest value a
      // `string` column's model type permits, unless it is declared.
      if (narrowed.has(name) || name.endsWith('Enum') || name === 'sqlBool') {
        continue;
      }
      expect(schema.safeParse('').success, `${name} narrows silently`).toBe(
        true,
      );
    }
  });
});
