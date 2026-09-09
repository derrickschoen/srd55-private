import { readFile } from '../../helpers/test-filesystem-promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import {
  MUTATION_REGISTRY_VERSION,
  injectAstMutation,
  parseMutationRegistry,
} from '../../../tools/d586-mutation-contract';

describe('D586 executable mutation contract', () => {
  it('registers the three type controls and two Slice 1 runtime controls exactly', async () => {
    const value: unknown = JSON.parse(await readFile(
      join(process.cwd(), 'tests/fixtures/d586-elevation-mutants.json'),
      'utf8',
    ));
    const registry = parseMutationRegistry(value);
    expect(registry.version).toBe(MUTATION_REGISTRY_VERSION);
    expect(registry.mutations.map((mutation) => mutation.id)).toEqual([
      'S1-ARBITRARY',
      'S1-FLYING-CELL',
      'S1-EMPTY-SPEEDS',
      'S1-DUPLICATE-SPEEDS',
      'S1-ZERO-SPEED',
    ]);
    expect(registry.mutations.filter((mutation) => mutation.phase === 'type'))
      .toHaveLength(3);
    expect(registry.mutations.filter((mutation) => mutation.phase === 'runtime'))
      .toHaveLength(2);
  });

  it('uses an AST selector and performs exactly one in-memory replacement', () => {
    const source = [
      'export type Closed = "left" | "right";',
      'export type Other = "left" | "right";',
      '',
    ].join('\n');
    const mutation = {
      selector: { nodeKind: 'TypeAliasDeclaration', name: 'Closed' },
      replacement: 'export type Closed = string;',
    };
    const mutated = injectAstMutation('fixture.ts', source, mutation);
    expect(mutated).toContain('export type Closed = string;');
    expect(mutated).toContain('export type Other = "left" | "right";');
    expect(source).toContain('export type Closed = "left" | "right";');
    expect(ts.transpileModule(mutated, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    }).diagnostics).toEqual([]);
  });

  it('rejects zero-match, multiple-match, and duplicate-ID registries', () => {
    expect(() => injectAstMutation(
      'fixture.ts',
      'export type Closed = "left";\n',
      {
        selector: { nodeKind: 'TypeAliasDeclaration', name: 'Missing' },
        replacement: 'export type Missing = string;',
      },
    )).toThrow('matched 0 nodes');
    expect(() => injectAstMutation(
      'fixture.ts',
      'if (true) {}\nif (false) {}\n',
      {
        selector: { nodeKind: 'IfStatement' },
        replacement: 'if (true) {}',
      },
    )).toThrow('matched 2 nodes');

    const duplicate = {
      version: MUTATION_REGISTRY_VERSION,
      mutations: [0, 1].map(() => ({
        id: 'DUPLICATE', phase: 'runtime', source: 'source.ts',
        selector: { nodeKind: 'IfStatement' }, replacement: 'if (false) {}',
        spec: 'spec.test.ts', title: 'fails',
      })),
    };
    expect(() => parseMutationRegistry(duplicate)).toThrow(
      'Mutation registry IDs must be unique.',
    );
  });
});
