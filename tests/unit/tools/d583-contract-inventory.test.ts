import { describe, expect, it } from 'vitest';
import {
  buildD583ContractInventory,
  D583_BASELINE_SHA256,
  D583_BASELINE_SPECS,
  dependencySpecifiers,
  healingPotionUsesComponentIngress,
  inventoryDigest,
} from '../../../tools/d583-contract-inventory';

describe('D583 cumulative contract inventory', () => {
  it('owns the exact inherited 140-spec baseline and pinned digest', () => {
    expect(D583_BASELINE_SPECS).toHaveLength(140);
    expect(inventoryDigest(D583_BASELINE_SPECS)).toBe(D583_BASELINE_SHA256);
    expect(D583_BASELINE_SPECS).toEqual([...D583_BASELINE_SPECS].sort());
  });

  it('unions changed specs and transitive consumers without losing inherited coverage', () => {
    const inventory = buildD583ContractInventory();
    expect(inventory).toEqual([...inventory].sort());
    expect(inventory).toEqual(expect.arrayContaining(D583_BASELINE_SPECS));
    expect(inventory).toContain('tests/unit/combat/roll-provenance.test.ts');
    expect(inventory).toContain('tests/unit/tools/d583-contract-inventory.test.ts');
  });

  it('resolves runtime and type-only TypeScript import-equals declarations', () => {
    expect(dependencySpecifiers(
      "import runtime = require('./runtime'); import type Types = require('./types');",
      'control.ts',
    )).toEqual([
      { specifier: './runtime', typeOnly: false, syntax: 'import_equals' },
      { specifier: './types', typeOnly: true, syntax: 'import_equals' },
    ]);
  });

  it('executable import-equals rejection control fails unresolved and external forms', () => {
    expect(() => dependencySpecifiers('import Alias = Namespace.Member;', 'unresolved-control.ts'))
      .toThrow('Rejected unresolved TypeScript import-equals declaration');
    expect(() => dependencySpecifiers("import Package = require('external-package');", 'external-control.ts'))
      .toThrow('Rejected external TypeScript import-equals declaration');
  });

  it('healing potion uses the component roll ingress rather than an inline die loop', () => {
    expect(healingPotionUsesComponentIngress()).toBe(true);
  });
});
