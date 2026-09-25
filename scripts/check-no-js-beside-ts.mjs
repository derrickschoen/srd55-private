#!/usr/bin/env node
/**
 * Fails when a TypeScript file under src/ or tools/ (x.ts, x.tsx, x.mts or
 * x.cts) has a banned file on disk. For a TypeScript file x.E the banned files
 * are:
 *   - x.js, x.mjs, x.cjs and x.jsx: no JavaScript file beside any TypeScript
 *     file (D893);
 *   - every file Vite tries before x.E when it resolves './x': the file x
 *     itself, then x plus each of its resolve.extensions ahead of E. Beside
 *     x.ts this adds x and x.mts; beside x.tsx, x, x.mts and x.ts; beside
 *     x.mts, x. Vite never tries .cts for './x', so nothing is added for x.cts;
 *   - when x itself ends in a JavaScript extension (a file named y.js.ts, which
 *     './y.js' reaches): the TypeScript names Vite tries first for './y.js',
 *     y.ts and y.tsx (y.mts for y.mjs, y.cts for y.cjs, y.tsx for y.jsx);
 *   - when x.E is a directory's index file (d/index.ts, which './d' reaches):
 *     everything Vite tries for './d' before the directory's index, that is d
 *     plus each of its resolve.extensions (and the same TypeScript names for a
 *     directory named like d.js), and d/package.json, whose fields can name
 *     another entry.
 * Vite's other routes to a TypeScript file named x.E ('./x.js' then x.ts and
 * x.tsx, './x.jsx' then x.tsx, './x.mjs' then x.mts, './x.cjs' then x.cts) try
 * only files this list already bans before they reach it. This follows Vite
 * 7.3.6's tryCleanFsResolve, which vite-node's resolveId runs for an import by
 * path. Not covered: a TypeScript file that a package.json names as its entry,
 * which Vite reaches through fields this check does not read.
 *
 * Why (D893): a file Vite resolves first takes an import over from the
 * TypeScript source without changing one byte of it. The engine child bundle
 * seals its inputs by their bytes (tools/engine-child-bundle.ts); this ban is
 * why its per-spawn check does not also look for shadowing files.
 *
 * A candidate counts when stat says it is a file, as Vite asks: a directory x
 * is not banned (Vite tries x.ts before a directory), and a symbolic link
 * counts as what it points to. A declaration file x.d.mts is named x.d, so it
 * is checked against x.d, x.d.mjs and so on, never against x.mjs. Every file on
 * disk counts, tracked or not, because vite-node resolves from the disk. A
 * missing src/ or tools/ is a failure, not a pass.
 *
 * usage: node scripts/check-no-js-beside-ts.mjs [--root <checkout>]
 */
import { readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCANNED_DIRECTORIES = ['src', 'tools'];
const JAVASCRIPT_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx'];
const TYPESCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
/**
 * Vite's default resolve.extensions in the order it tries them (DEFAULT_EXTENSIONS
 * in node_modules/vite 7.3.6). The engine child bundle builds with the same
 * list, VITE_RESOLVE_EXTENSIONS, and this script's test holds the ban to it.
 */
const VITE_EXTENSION_ORDER = ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'];
const NAME = 'no-js-beside-ts';

/**
 * The paths Vite tries, in order, for a relative import that spells `path`,
 * up to a directory's index: the file itself; for a JavaScript extension, the
 * TypeScript name Vite rewrites it to (and .tsx after .ts for .js); then
 * `path` plus each extension.
 */
function viteTries(path) {
  const tried = [path];
  const extension = extname(path);
  if (JAVASCRIPT_EXTENSIONS.includes(extension)) {
    const stem = path.slice(0, -extension.length);
    tried.push(stem + extension.replace('js', 'ts'));
    if (extension === '.js') tried.push(`${stem}.tsx`);
  }
  return [...tried, ...VITE_EXTENSION_ORDER.map((candidate) => path + candidate)];
}

/** Every path banned for the TypeScript file `file`, each with the directory it is beside. */
function bannedFor(file) {
  const extension = extname(file);
  const name = file.slice(0, -extension.length);
  const banned = JAVASCRIPT_EXTENSIONS.map((javascript) => name + javascript);
  const tried = viteTries(name);
  const position = tried.indexOf(file);
  if (position >= 0) {
    banned.push(...tried.slice(0, position));
    if (basename(name) === 'index') banned.push(...viteTries(dirname(file)), join(dirname(file), 'package.json'));
  }
  return [...new Set(banned)];
}

function isFile(path) {
  return statSync(path, { throwIfNoEntry: false })?.isFile() === true;
}

function parseRoot(args) {
  if (args.length === 0) return resolve(dirname(fileURLToPath(import.meta.url)), '..');
  if (args.length === 2 && args[0] === '--root' && args[1] !== '') return resolve(args[1]);
  throw new Error(`usage: node scripts/check-no-js-beside-ts.mjs [--root <checkout>] (got: ${args.join(' ')})`);
}

/** Every non-directory entry below `directory`, sorted, as absolute paths. */
function filesBelow(directory) {
  const found = [];
  const entries = readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesBelow(path));
    else found.push(path);
  }
  return found;
}

function check(root) {
  const banned = [];
  const unreadable = [];
  let typescriptFiles = 0;
  for (const scanned of SCANNED_DIRECTORIES) {
    let files;
    try {
      files = filesBelow(join(root, scanned));
    } catch (error) {
      unreadable.push(`${scanned}/ could not be read under ${root}, so nothing in it was checked: ${error.message}`);
      continue;
    }
    for (const file of files) {
      if (!TYPESCRIPT_EXTENSIONS.has(extname(file))) continue;
      typescriptFiles += 1;
      for (const candidate of bannedFor(file)) {
        if (!isFile(candidate)) continue;
        const where = dirname(candidate) === dirname(file) ? '' : `${relative(root, dirname(file))}/, the directory of `;
        banned.push(`${relative(root, candidate)} is beside ${where}${relative(root, file)}`);
      }
    }
  }
  return { banned, unreadable, typescriptFiles };
}

try {
  const root = parseRoot(process.argv.slice(2));
  const { banned, unreadable, typescriptFiles } = check(root);
  for (const failure of [...unreadable, ...banned]) console.error(`${NAME}: ${failure}`);
  if (banned.length > 0) {
    console.error(
      `${NAME}: Vite resolves './x' to the first of x, x.mjs, x.js, x.mts, x.ts, x.jsx and x.tsx that exists, and ` +
        "'./d' to d.mjs, d.js, d.mts, d.ts, d.jsx, d.tsx, d.json or d/package.json's entry before d/index.ts, so a " +
        'file it tries first replaces a TypeScript file unseen; and no JavaScript file may sit beside a same-named ' +
        'TypeScript file. Rename or delete the file (D893).',
    );
  }
  if (unreadable.length > 0 || banned.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(
      `${NAME}: ${String(typescriptFiles)} TypeScript files under ${SCANNED_DIRECTORIES.map((directory) => `${directory}/`).join(' and ')}, ` +
        'none with a banned file beside it',
    );
  }
} catch (error) {
  console.error(`${NAME}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
