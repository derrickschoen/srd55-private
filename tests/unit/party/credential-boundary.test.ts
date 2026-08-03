import { readFileSync, readdirSync } from 'node:fs';
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const srcRoot = fileURLToPath(new URL('../../../src/', import.meta.url));
const credentialsModule = resolve(srcRoot, 'party/credentials.ts');
const forbiddenDirectoryPrefixes = [
  `backup${sep}`,
  `sharing${sep}`,
  `ui${sep}screens${sep}sheet${sep}`,
  `worker${sep}`,
  `db${sep}`,
] as const;

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(path)) ? [path] : [];
  });
}

function isDocumentModule(path: string): boolean {
  const segments = relative(srcRoot, path).split(sep);
  return (
    segments.includes('document') ||
    segments.includes('documents') ||
    basename(path, '.ts').includes('document')
  );
}

function isForbiddenImporter(path: string): boolean {
  const repoPath = relative(srcRoot, path);
  return (
    forbiddenDirectoryPrefixes.some((prefix) => repoPath.startsWith(prefix)) ||
    isDocumentModule(path)
  );
}

function importedModules(source: string): readonly string[] {
  const modules: string[] = [];
  const patterns = [
    /\bfrom\s*['"]([^'"]+)['"]/gu,
    /\bimport\s*['"]([^'"]+)['"]/gu,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const moduleName = match[1];
      if (moduleName !== undefined) modules.push(moduleName);
    }
  }
  return modules;
}

function resolvesToCredentials(importer: string, moduleName: string): boolean {
  if (!moduleName.startsWith('.')) return moduleName === 'src/party/credentials';
  const resolved = resolve(dirname(importer), moduleName);
  return (
    resolved === credentialsModule || `${resolved}.ts` === credentialsModule
  );
}

describe('party credential source boundaries', () => {
  it('PARTY-CREDENTIAL-IMPORT-BOUNDARY forbids credential imports by serialization, Worker, DB, sheet, and document directories', () => {
    const forbiddenImporters = sourceFiles(srcRoot).filter(isForbiddenImporter);
    expect(forbiddenImporters.length).toBeGreaterThan(10);
    expect(forbiddenImporters.map((path) => relative(srcRoot, path))).toContain(
      join('backup', 'character-backup.ts'),
    );
    expect(forbiddenImporters.map((path) => relative(srcRoot, path))).toContain(
      join('party', 'storage', 'document-bytes.ts'),
    );

    const violations = forbiddenImporters.flatMap((path) =>
      importedModules(readFileSync(path, 'utf8'))
        .filter((moduleName) => resolvesToCredentials(path, moduleName))
        .map(
          (moduleName) =>
            `${relative(srcRoot, path)} imports ${moduleName}`,
        ),
    );
    expect(violations).toEqual([]);
  });

  it('PARTY-NO-CREDENTIAL-LOGGING keeps every src/party module free of console calls', () => {
    const violations = sourceFiles(resolve(srcRoot, 'party')).flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return /\bconsole\s*\./u.test(source) ? [relative(srcRoot, path)] : [];
    });
    expect(violations).toEqual([]);
  });
});
