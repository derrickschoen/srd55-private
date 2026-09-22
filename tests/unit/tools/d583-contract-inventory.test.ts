import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildDependencyIndex,
  buildD583ContractInventory,
  contractInventoryUnion,
  D583_BASELINE_SHA256,
  D583_BASELINE_SPECS,
  dependencySpecifiers,
  type DependencyIndex,
  type GitRunner,
  gitOutput,
  healingPotionUsesComponentIngress,
  inventoryDigest,
  resolveLocal,
  reverseConsumerClosure,
  SESSION_TRANSACTION_BASELINE_SHA256,
  SESSION_TRANSACTION_BASELINE_SPECS,
  TRIAL_CORE_RECONCILIATION_BASELINE_SHA256,
  TRIAL_CORE_RECONCILIATION_BASELINE_SPECS,
} from '../../../tools/d583-contract-inventory';

const EMPTY_INVENTORY_SHA256 = 'b0561dd58ab1a12acfbe43d34f3edbfc76c7805cb21ec4188708b0952daaaec6';
const EMPTY_INVENTORY = contractInventoryUnion(
  D583_BASELINE_SPECS,
  SESSION_TRANSACTION_BASELINE_SPECS,
  TRIAL_CORE_RECONCILIATION_BASELINE_SPECS,
  [],
  new Set(),
);

let dependencyIndex: DependencyIndex;

beforeAll(() => {
  dependencyIndex = buildDependencyIndex();
});

function expectEmptyInventory(git: GitRunner): void {
  let inventory: readonly string[] = [];
  expect(() => {
    inventory = buildD583ContractInventory({ git, index: dependencyIndex });
  }).not.toThrow();
  expect(inventory).toEqual(EMPTY_INVENTORY);
  expect(inventory).toHaveLength(148);
  expect(inventory).toEqual([...inventory].sort());
  expect(inventoryDigest(inventory)).toBe(EMPTY_INVENTORY_SHA256);
}

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
    const canonicalIndexBytes = JSON.stringify(dependencyIndex);
    expect(Object.isFrozen(dependencyIndex)).toBe(true);
    expect(Object.isFrozen(dependencyIndex.sourceFiles)).toBe(true);
    expect(Object.isFrozen(dependencyIndex.reverseEdges)).toBe(true);
    expect(Object.values(dependencyIndex.reverseEdges).every((edges) => Object.isFrozen(edges))).toBe(true);
    expect(dependencyIndex.sourceFiles).toEqual([...dependencyIndex.sourceFiles].sort());
    expect(Object.keys(dependencyIndex.reverseEdges)).toEqual(Object.keys(dependencyIndex.reverseEdges).sort());
    expect(Object.values(dependencyIndex.reverseEdges)
      .every((edges) => JSON.stringify(edges) === JSON.stringify([...edges].sort()))).toBe(true);
    expect(dependencyIndex.sourceFiles).not.toBeInstanceOf(Set);
    expect(dependencyIndex.reverseEdges).not.toBeInstanceOf(Map);
    expect(() => (dependencyIndex.sourceFiles as string[]).push('src/d583-mutation-control.ts')).toThrow();
    const firstDependency = Object.keys(dependencyIndex.reverseEdges)[0];
    expect(firstDependency).toBeDefined();
    expect(() => (dependencyIndex.reverseEdges[firstDependency!] as string[])
      .push('tests/unit/d583-mutation-control.test.ts')).toThrow();
    expect(() => {
      (dependencyIndex.reverseEdges as Record<string, readonly string[]>)['src/d583-mutation-control.ts'] = [];
    }).toThrow();
    expect(JSON.stringify(dependencyIndex)).toBe(canonicalIndexBytes);

    const inventory = buildD583ContractInventory({ index: dependencyIndex });
    expect(inventory).toEqual([...inventory].sort());
    expect(inventory).toEqual(expect.arrayContaining(D583_BASELINE_SPECS));
    expect(inventory).toEqual(expect.arrayContaining(SESSION_TRANSACTION_BASELINE_SPECS));
    expect(inventory).toContain('tests/unit/combat/roll-provenance.test.ts');
    expect(inventory).toContain('tests/unit/tools/d583-contract-inventory.test.ts');
    expect(inventory).toContain('tests/unit/vtt/session-command-transaction.test.ts');
    expect(inventory).toContain('tests/unit/vtt/engine-round-session.test.ts');
    expect(inventory).toContain('tests/unit/vtt/challenge-feasibility.test.ts');
  });

  it('retains the exact empty inventory when Git is absent', () => {
    expectEmptyInventory(() => null);
  });

  it('retains the exact empty inventory without probing a missing merge-base', () => {
    const calls: string[] = [];
    expectEmptyInventory((args) => {
      const call = args.join(' ');
      calls.push(call);
      if (call === 'merge-base HEAD main') return null;
      if (call === 'diff --name-only main --') return '';
      if (call === 'ls-files --others --exclude-standard') return '';
      throw new Error(`Unexpected Git call: ${call}`);
    });
    expect(calls).toEqual([
      'merge-base HEAD main',
      'diff --name-only main --',
      'ls-files --others --exclude-standard',
    ]);
  });

  it('retains the exact empty inventory when the main diff fails', () => {
    expectEmptyInventory((args) => {
      const call = args.join(' ');
      if (call === 'merge-base HEAD main') return 'base\n';
      if (call === 'diff --name-only main --') return null;
      if (call === 'diff --name-only base --') return '';
      if (call === 'ls-files --others --exclude-standard') return '';
      throw new Error(`Unexpected Git call: ${call}`);
    });
  });

  it('retains the exact empty inventory when listing untracked files fails', () => {
    expectEmptyInventory((args) => {
      const call = args.join(' ');
      if (call === 'merge-base HEAD main') return 'base\n';
      if (call === 'diff --name-only main --' || call === 'diff --name-only base --') return '';
      if (call === 'ls-files --others --exclude-standard') return null;
      throw new Error(`Unexpected Git call: ${call}`);
    });
  });

  it('propagates injected runner exceptions while the default runner maps Git failures to null', () => {
    const failure = new Error('injected Git runner failed');
    expect(() => buildD583ContractInventory({
      git: () => {
        throw failure;
      },
      index: dependencyIndex,
    })).toThrow(failure);

    let output: string | null = 'not called';
    expect(() => {
      output = gitOutput(['d583-intentional-invalid-subcommand']);
    }).not.toThrow();
    expect(output).toBeNull();
  });

  it('discovers changed specs and reverse source consumers through the Git seam', () => {
    const changedSpec = 'tests/unit/combat/movement.test.ts';
    const changedSource = 'src/combat/movement.ts';
    const git: GitRunner = (args) => {
      const call = args.join(' ');
      if (call === 'merge-base HEAD main') return 'base\n';
      if (call === 'diff --name-only main --' || call === 'diff --name-only base --') {
        return `${changedSource}\n${changedSpec}\n`;
      }
      if (call === 'ls-files --others --exclude-standard') return '';
      throw new Error(`Unexpected Git call: ${call}`);
    };
    const uncachedInventory = buildD583ContractInventory({ git });
    const cachedInventory = buildD583ContractInventory({ git, index: dependencyIndex });

    for (const inventory of [uncachedInventory, cachedInventory]) {
      expect(inventory).toEqual([...inventory].sort());
      expect(inventory).toEqual(expect.arrayContaining([...EMPTY_INVENTORY]));
      expect(inventory).toContain(changedSpec);
      expect(inventory.length).toBeGreaterThan(EMPTY_INVENTORY.length);
    }
    expect(uncachedInventory).toContain('tests/unit/combat/movement-evaluator.test.ts');
    expect(uncachedInventory).toContain('tests/unit/vtt/team-scorer.test.ts');
    expect(cachedInventory).toContain('tests/unit/combat/movement-evaluator.test.ts');
    expect(cachedInventory).toContain('tests/unit/vtt/team-scorer.test.ts');
    expect(cachedInventory).toEqual(uncachedInventory);
  });

  it('rejects a deleted committed spec discovered through the Git seam', () => {
    const deletedSpec = 'tests/unit/d583-deleted-control.test.ts';
    expect(() => buildD583ContractInventory({
      git: (args) => {
        const call = args.join(' ');
        if (call === 'merge-base HEAD main') return 'base\n';
        if (call === 'diff --name-only main --' || call === 'diff --name-only base --') {
          return `${deletedSpec}\n`;
        }
        if (call === 'ls-files --others --exclude-standard') return '';
        throw new Error(`Unexpected Git call: ${call}`);
      },
      index: dependencyIndex,
    })).toThrow(`D583 changed spec was deleted: ${deletedSpec}`);
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

  it('resolves declaration files beside a specifier and at a directory index', () => {
    expect(resolveLocal(
      'tests/types/vtt-handoff-contract.type-test.ts',
      '../../contracts/vtt-handoff/v1/contracts',
    )).toBe('contracts/vtt-handoff/v1/contracts.d.ts');
    expect(resolveLocal(
      'tests/unit/tools/d583-contract-inventory.test.ts',
      '../../fixtures/d583-declaration-index',
    )).toBe('tests/fixtures/d583-declaration-index/index.d.ts');
  });

  it('continues to reject genuinely missing relative imports', () => {
    expect(() => resolveLocal(
      'tests/unit/tools/d583-contract-inventory.test.ts',
      '../../fixtures/d583-declaration-does-not-exist',
    )).toThrow(
      'Unresolved relative dependency ../../fixtures/d583-declaration-does-not-exist ' +
      'from tests/unit/tools/d583-contract-inventory.test.ts.',
    );
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
