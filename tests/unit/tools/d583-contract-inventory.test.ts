import { describe, expect, it } from 'vitest';
import {
  buildD583ContractInventory,
  contractInventoryUnion,
  D583_BASELINE_SHA256,
  D583_BASELINE_SPECS,
  dependencySpecifiers,
  healingPotionUsesComponentIngress,
  inventoryDigest,
  reverseConsumerClosure,
  SESSION_TRANSACTION_BASELINE_SHA256,
  SESSION_TRANSACTION_BASELINE_SPECS,
  TRIAL_CORE_RECONCILIATION_BASELINE_SHA256,
  TRIAL_CORE_RECONCILIATION_BASELINE_SPECS,
} from '../../../tools/d583-contract-inventory';

describe('D583 cumulative contract inventory', () => {
  it('owns the exact inherited 140-spec baseline and pinned digest', () => {
    expect(D583_BASELINE_SPECS).toHaveLength(140);
    expect(inventoryDigest(D583_BASELINE_SPECS)).toBe(D583_BASELINE_SHA256);
    expect(D583_BASELINE_SPECS).toEqual([...D583_BASELINE_SPECS].sort());
  });

  it('owns the exact inherited 19-spec session transaction baseline and pinned digest', () => {
    expect(SESSION_TRANSACTION_BASELINE_SPECS).toHaveLength(19);
    expect(inventoryDigest(SESSION_TRANSACTION_BASELINE_SPECS))
      .toBe(SESSION_TRANSACTION_BASELINE_SHA256);
    expect(SESSION_TRANSACTION_BASELINE_SPECS)
      .toEqual([...SESSION_TRANSACTION_BASELINE_SPECS].sort());
    expect(contractInventoryUnion(
      ['tests/unit/d583.test.ts'],
      ['tests/unit/transaction.test.ts'],
      [],
      [],
      new Set(),
    )).toEqual([
      'tests/unit/d583.test.ts',
      'tests/unit/transaction.test.ts',
    ]);
  });

  it('owns the exact reconciliation baseline and pinned digest', () => {
    expect(TRIAL_CORE_RECONCILIATION_BASELINE_SPECS).toHaveLength(12);
    expect(inventoryDigest(TRIAL_CORE_RECONCILIATION_BASELINE_SPECS))
      .toBe(TRIAL_CORE_RECONCILIATION_BASELINE_SHA256);
    expect(TRIAL_CORE_RECONCILIATION_BASELINE_SPECS)
      .toEqual([...TRIAL_CORE_RECONCILIATION_BASELINE_SPECS].sort());
  });

  it('unions changed specs and transitive consumers without losing inherited coverage', () => {
    const inventory = buildD583ContractInventory();
    expect(inventory).toEqual([...inventory].sort());
    expect(inventory).toEqual(expect.arrayContaining(D583_BASELINE_SPECS));
    expect(inventory).toEqual(expect.arrayContaining(SESSION_TRANSACTION_BASELINE_SPECS));
    expect(inventory).toContain('tests/unit/combat/roll-provenance.test.ts');
    expect(inventory).toContain('tests/unit/tools/d583-contract-inventory.test.ts');
    expect(inventory).toContain('tests/unit/vtt/session-command-transaction.test.ts');
    expect(inventory).toContain('tests/unit/vtt/engine-round-session.test.ts');
    expect(inventory).toContain('tests/unit/vtt/challenge-feasibility.test.ts');
  });

  it('retains every reconciliation-owned spec with an empty branch diff and no merge-base', () => {
    const inventory = buildD583ContractInventory({ changedPaths: [] });
    expect(inventory).toEqual([...inventory].sort());
    expect(inventory).toEqual(expect.arrayContaining(D583_BASELINE_SPECS));
    expect(inventory).toEqual(expect.arrayContaining(SESSION_TRANSACTION_BASELINE_SPECS));
    expect(inventory).toEqual(expect.arrayContaining(TRIAL_CORE_RECONCILIATION_BASELINE_SPECS));
    expect(inventory).toContain('tests/unit/combat/roll-provenance.test.ts');
    expect(inventory).toContain('tests/unit/tools/d583-contract-inventory.test.ts');
    expect(inventory).toContain('tests/unit/vtt/session-command-transaction.test.ts');
    expect(inventory).toContain('tests/unit/vtt/engine-round-session.test.ts');
    expect(inventory).toContain('tests/unit/vtt/challenge-feasibility.test.ts');
  });

  it('walks reverse consumers to a fixed point rather than stopping at direct consumers', () => {
    const reverse = new Map<string, ReadonlySet<string>>([
      ['src/core.ts', new Set(['src/application.ts'])],
      ['src/application.ts', new Set(['src/session.ts'])],
      ['src/session.ts', new Set(['tests/unit/vtt/transitive.test.ts'])],
    ]);

    expect(reverseConsumerClosure(['src/core.ts'], reverse)).toEqual(
      new Set(['tests/unit/vtt/transitive.test.ts']),
    );
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
