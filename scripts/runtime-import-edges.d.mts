import type * as ts from 'typescript';

export type Evaluation = 'erased' | 'static' | 'dynamic' | 'asset';

export declare const EVALUATION: Readonly<{
  ERASED: 'erased';
  STATIC: 'static';
  DYNAMIC: 'dynamic';
  ASSET: 'asset';
}>;

export declare const VITE_RESOLVE_EXTENSIONS: readonly string[];
export declare const CODE_EXTENSIONS: readonly string[];

export type ReferenceSyntax =
  | 'import'
  | 'export'
  | 'import-equals'
  | 'dynamic-import'
  | 'require'
  | 'glob'
  | 'asset-url';

export interface GlobOptions {
  readonly supported: boolean;
  readonly eager: boolean;
  readonly query: string | undefined;
}

export interface ModuleReference {
  readonly syntax: ReferenceSyntax;
  readonly evaluation: Evaluation;
  readonly specifiers: readonly ts.Expression[];
  readonly inlineTypeOnly: boolean;
  readonly glob?: GlobOptions;
}

export interface LocatedModuleReference extends ModuleReference {
  readonly node: ts.Node;
  readonly line: number;
}

export declare function isCodeFile(fileName: string): boolean;
export declare function parseModule(fileName: string, text: string): ts.SourceFile;
export declare function classifyModuleReference(node: ts.Node): ModuleReference | undefined;
export declare function moduleReferences(sourceFile: ts.SourceFile): LocatedModuleReference[];
export declare function moduleStringConstants(sourceFile: ts.SourceFile): Map<string, string>;
export declare function specifierText(
  expression: ts.Expression | undefined,
  constants: ReadonlyMap<string, string>,
): string | undefined;

export type ResolvedSpecifier =
  | { readonly kind: 'external' | 'unresolved'; readonly id: string }
  | { readonly kind: 'module' | 'resource'; readonly id: string; readonly file: string };

export declare function resolveModuleSpecifier(
  importer: string,
  specifier: string,
  isFile: (path: string) => boolean,
): ResolvedSpecifier;

export declare function expandGlob(
  importer: string,
  patterns: readonly string[],
  filesBelow: (directory: string) => readonly string[],
): string[] | undefined;

export interface GraphHost {
  isFile(path: string): boolean;
  readFile(path: string): string;
  filesBelow(directory: string): readonly string[];
}

export interface GraphEdge {
  readonly to: string;
  readonly evaluation: Evaluation;
  readonly syntax: ReferenceSyntax;
  readonly line: number;
  readonly inlineTypeOnly: boolean;
}

export interface ModuleGraph {
  readonly edges: Map<string, GraphEdge[]>;
  readonly inlineTypeOnly: readonly {
    readonly file: string;
    readonly line: number;
    readonly syntax: ReferenceSyntax;
    readonly specifier: string;
  }[];
  readonly unresolved: readonly {
    readonly file: string;
    readonly line: number;
    readonly specifier: string;
    readonly evaluation: Evaluation;
  }[];
}

export declare function buildModuleGraph(roots: readonly string[], host: GraphHost): ModuleGraph;
export declare function nodeFile(id: string): string;

export type ClosureParents = Map<
  string,
  { readonly from: string; readonly line: number; readonly syntax: ReferenceSyntax } | null
>;

export declare function closure(
  graph: ModuleGraph,
  start: string,
  evaluations: readonly Evaluation[],
): ClosureParents;
export declare function pathTo(parents: ClosureParents, target: string): string[];
export declare function cycles(graph: ModuleGraph, evaluations: readonly Evaluation[]): string[][];
