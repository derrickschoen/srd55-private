import { describe, expect, it } from 'vitest';
import classLevelTables from '../../../docs/srd/source/class-level-tables.txt?raw';
import { decodeStoredValueExpression } from '../../../src/domain/contracts/row-rules';
import { ROGUE_SNEAK_ATTACK_CONTRIBUTION } from '../../../src/rules/class-progression-lookup';

interface SneakAttackSourceRow {
  readonly level: number;
  readonly dice: number;
}

function rogueSneakAttackRows(source: string): readonly SneakAttackSourceRow[] {
  const marker = '=== Rogue Features table — printed page 62 ===';
  const start = source.indexOf(marker);
  const next = source.indexOf('=== Sorcerer Features table', start);
  if (start < 0 || next < 0) {
    throw new Error('The SRD extract does not contain the bounded Rogue table.');
  }
  return source
    .slice(start, next)
    .split('\n')
    .flatMap((line) => {
      const match = /^\s*(?<level>[1-9]|1\d|20)\s+\+[2-6].*\s(?<dice>\d+)d6\s*$/u.exec(
        line,
      );
      const level = match?.groups?.level;
      const dice = match?.groups?.dice;
      return level === undefined || dice === undefined
        ? []
        : [{ level: Number(level), dice: Number(dice) }];
    });
}

function evaluateSeededScale(valueJson: string, rogueLevel: number): number {
  const expression = decodeStoredValueExpression(valueJson, 'Rogue seed');
  const source = expression.source;
  const sourceKind =
    source !== null && typeof source === 'object' && !Array.isArray(source)
      ? Reflect.get(source, 'kind')
      : undefined;
  const sourceClassKey =
    source !== null && typeof source === 'object' && !Array.isArray(source)
      ? Reflect.get(source, 'class_content_key')
      : undefined;
  if (
    expression.kind !== 'scale' || source === null ||
    typeof source !== 'object' || Array.isArray(source) ||
    sourceKind !== 'class_level' || sourceClassKey !== '2024:class:rogue'
  ) {
    throw new Error('The Rogue seed is not qualified to Rogue class levels.');
  }
  const multiply = expression.multiply === undefined
    ? 1
    : Number(expression.multiply);
  const divide = expression.divide === undefined ? 1 : Number(expression.divide);
  const scaled = rogueLevel * multiply / divide;
  if (expression.round === 'ceiling') {
    return Math.ceil(scaled);
  }
  if (expression.round === 'floor') {
    return Math.floor(scaled);
  }
  throw new Error('The Rogue seed has an unknown rounding rule.');
}

describe('the bundled Rogue Sneak Attack contribution', () => {
  it('derives every level 1-20 value from the SRD table, never a copied constant list', () => {
    const sourceRows = rogueSneakAttackRows(classLevelTables);
    expect(sourceRows.map(({ level }) => level)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );

    const seededValues = sourceRows.map(({ level }) => ({
      level,
      dice: evaluateSeededScale(
        ROGUE_SNEAK_ATTACK_CONTRIBUTION.value_json,
        level,
      ),
    }));
    expect(seededValues).toEqual(sourceRows);
  });

  it('stores one stable additive contribution active for the full class range', () => {
    expect(ROGUE_SNEAK_ATTACK_CONTRIBUTION).toMatchObject({
      contribution_key: 'sneak-attack',
      label: 'Sneak Attack',
      target_kind: 'feature_dice_count',
      target_key: 'sneak_attack',
      op: 'add',
      active_from_level: 1,
      active_to_level: 20,
      supersedes_ref: null,
    });
  });
});
