#!/usr/bin/env node
/**
 * Fails when a JavaScript file under src/ or tools/ sits beside a TypeScript
 * file with the same name: x.js, x.mjs, x.cjs or x.jsx in the same directory as
 * x.ts, x.tsx, x.mts or x.cts.
 *
 * Why (D893): Vite resolves the extensionless import './x' by trying x.mjs and
 * x.js before x.ts, so a file like that takes the import over from the
 * TypeScript source without changing one byte of it. The engine child bundle
 * seals its inputs by their bytes (tools/engine-child-bundle.ts); this ban is
 * why its per-spawn check does not also look for shadowing files.
 *
 * A declaration file is not a sibling: x.d.mts beside x.mjs has the name x.d.
 * Every file on disk counts, tracked or not, because vite-node resolves from
 * the disk. A missing src/ or tools/ is a failure, not a pass.
 *
 * usage: node scripts/check-no-js-beside-ts.mjs [--root <checkout>]
 */
import { readdirSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCANNED_DIRECTORIES = ['src', 'tools'];
const JAVASCRIPT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx']);
const TYPESCRIPT_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts']);
const NAME = 'no-js-beside-ts';

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
  const siblings = [];
  const unreadable = [];
  let javascriptFiles = 0;
  for (const scanned of SCANNED_DIRECTORIES) {
    let files;
    try {
      files = filesBelow(join(root, scanned));
    } catch (error) {
      unreadable.push(`${scanned}/ could not be read under ${root}, so nothing in it was checked: ${error.message}`);
      continue;
    }
    const typescriptByName = new Map();
    for (const file of files) {
      const extension = extname(file);
      if (!TYPESCRIPT_EXTENSIONS.has(extension)) continue;
      const name = file.slice(0, -extension.length);
      typescriptByName.set(name, [...(typescriptByName.get(name) ?? []), file]);
    }
    for (const file of files) {
      const extension = extname(file);
      if (!JAVASCRIPT_EXTENSIONS.has(extension)) continue;
      javascriptFiles += 1;
      for (const sibling of typescriptByName.get(file.slice(0, -extension.length)) ?? []) {
        siblings.push(`${relative(root, file)} is beside ${relative(root, sibling)}`);
      }
    }
  }
  return { siblings, unreadable, javascriptFiles };
}

try {
  const root = parseRoot(process.argv.slice(2));
  const { siblings, unreadable, javascriptFiles } = check(root);
  for (const failure of [...unreadable, ...siblings]) console.error(`${NAME}: ${failure}`);
  if (siblings.length > 0) {
    console.error(
      `${NAME}: Vite resolves './x' to x.mjs or x.js before x.ts, so a JavaScript file beside a same-named ` +
        'TypeScript file can replace it unseen. Rename or delete the JavaScript file (D893).',
    );
  }
  if (unreadable.length > 0 || siblings.length > 0) {
    process.exitCode = 1;
  } else {
    console.log(
      `${NAME}: ${String(javascriptFiles)} JavaScript files under ${SCANNED_DIRECTORIES.map((directory) => `${directory}/`).join(' and ')}, ` +
        'none beside a same-named TypeScript file',
    );
  }
} catch (error) {
  console.error(`${NAME}: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 2;
}
