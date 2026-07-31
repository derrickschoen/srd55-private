import { describe, expect, it } from 'vitest';
import { rowContractError } from '../../../src/domain/contracts/rows';

const stamp = '2026-07-31T12:00:00.000Z';

function ladderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    class_definition_id: 2,
    class_level: 6,
    resource_kind: 'rage',
    maximum: 4,
    created_at: stamp,
    updated_at: stamp,
    ...overrides,
  };
}

function formulaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    class_definition_id: 2,
    resource_kind: 'action_surge',
    formula_kind: 'fixed_count_by_class_level',
    minimum_class_level: 2,
    fixed_count: 1,
    ability: null,
    multiplier: null,
    later_fixed_count_steps: '[{"minimum_class_level":17,"count":2}]',
    created_at: stamp,
    updated_at: stamp,
    ...overrides,
  };
}

describe('native class resource row contracts', () => {
  it('accepts the sourced ladder row and refuses out-of-vocabulary or invalid scalars', () => {
    expect(rowContractError('class_resources', ladderRow(), 'ladder')).toBeNull();
    expect(
      rowContractError(
        'class_resources',
        ladderRow({ resource_kind: 'ki_points' }),
        'ladder',
      ),
    ).toContain('ladder.resource_kind:');
    expect(
      rowContractError(
        'class_resources',
        ladderRow({ class_level: 21 }),
        'ladder',
      ),
    ).toContain('ladder.class_level:');
    expect(
      rowContractError(
        'class_resources',
        ladderRow({ maximum: -1 }),
        'ladder',
      ),
    ).toContain('ladder.maximum:');
  });

  it('jointly decodes the formula discriminator and canonical stepped payload', () => {
    expect(
      rowContractError('class_resource_formulas', formulaRow(), 'formula'),
    ).toBeNull();
    expect(
      rowContractError(
        'class_resource_formulas',
        formulaRow({
          later_fixed_count_steps:
            '[{"minimum_class_level":17,"count":1}]',
        }),
        'formula',
      ),
    ).toContain('each step must change the count');
    expect(
      rowContractError(
        'class_resource_formulas',
        formulaRow({
          later_fixed_count_steps:
            '[{"minimum_class_level":2,"count":2}]',
        }),
        'formula',
      ),
    ).toContain('step levels must be strictly increasing');
    expect(
      rowContractError(
        'class_resource_formulas',
        formulaRow({ ability: 'charisma' }),
        'formula',
      ),
    ).toContain('ability must be null for this formula kind');
  });
});
