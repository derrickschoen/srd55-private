import {
  existsSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const action = process.argv[2];
const mutationName = process.argv[3];
const backupPath = resolve(
  '/tmp',
  `dnd-hardening-mutation-${mutationName ?? 'unknown'}.json`,
);

const edit = (path, from, to) => ({ path, from, to });

const mutations = {
  'digest-count-gate-inverted': {
    testFile: 'tests/integration/catalog/bundled-content-digest-v1.test.ts',
    testName: 'count-gates canonicalization to databases with the complete aggregate cardinality',
    changes: [edit(
      'src/catalog/bundled-content-digest-v1.ts',
      '  return aggregateCount === EXPECTED_BUNDLED_AGGREGATE_DIGESTS_V1.length;',
      '  return aggregateCount !== EXPECTED_BUNDLED_AGGREGATE_DIGESTS_V1.length; // HARDENING_MUTANT count gate inverted',
    )],
  },
  'digest-fallback-name-skipped': {
    testFile: 'tests/integration/catalog/bundled-content-digest-v1.test.ts',
    testName: 'falls back to the content key when a bundled identity has no root name',
    changes: [edit(
      'src/catalog/bundled-content-digest-v1.ts',
      '      aggregate.name ?? aggregate.contentKey,',
      "      aggregate.name ?? '', // HARDENING_MUTANT content-key fallback skipped",
    )],
  },
  'digest-canonical-order-reversed': {
    testFile: 'tests/integration/catalog/bundled-content-digest-v1.test.ts',
    testName: 'pins the canonical kind/key/table/row ordering independently of SQL row order',
    changes: [edit(
      'src/catalog/bundled-content-digest-v1.ts',
      '      .sort(([left], [right]) => compareCanonical(left, right))',
      '      .sort(([left], [right]) => compareCanonical(right, left)) // HARDENING_MUTANT table order reversed',
    )],
  },
  'share-fallback-never-attempted': {
    testFile: 'tests/unit/sharing/client.test.ts',
    testName: 'falls back to a reference-only fragment and names every omitted carried reference',
    changes: [edit(
      'src/sharing/client.ts',
      '      const fallback = await tryEncodeReferenceOnlyShareFragment(document);',
      '      return embedded; // HARDENING_MUTANT reference-only fallback never attempted',
    )],
  },
  'share-omitted-content-never-computed': {
    testFile: 'tests/unit/sharing/client.test.ts',
    testName: 'falls back to a reference-only fragment and names every omitted carried reference',
    changes: [edit(
      'src/sharing/client.ts',
      '        omittedContent: omittedPortableReferences(document),',
      '        omittedContent: Object.freeze([]), // HARDENING_MUTANT omissions erased',
    )],
  },
  'share-budget-comparison-inverted': {
    testFile: 'tests/unit/sharing/client.test.ts',
    testName: 'falls back to a reference-only fragment and names every omitted carried reference',
    changes: [edit(
      'src/sharing/client.ts',
      "      if (fallback.kind === 'too_large') return fallback;",
      "      if (fallback.kind !== 'too_large') return fallback; // HARDENING_MUTANT budget result inverted",
    )],
  },
};

const mutation = mutations[mutationName];
if (mutation === undefined) {
  throw new Error(
    `Unknown mutation. Choose one of: ${Object.keys(mutations).join(', ')}`,
  );
}

if (action === 'apply') {
  if (existsSync(backupPath)) {
    throw new Error(`Saved copy already exists: ${backupPath}`);
  }
  const originals = {};
  for (const change of mutation.changes) {
    const current = originals[change.path] ??
      readFileSync(resolve(root, change.path), 'utf8');
    const count = current.split(change.from).length - 1;
    if (count !== 1) {
      throw new Error(
        `${mutationName}: expected one exact anchor in ${change.path}, found ${String(count)}`,
      );
    }
    originals[change.path] ??= current;
  }
  writeFileSync(backupPath, JSON.stringify(originals));
  const mutated = { ...originals };
  for (const change of mutation.changes) {
    mutated[change.path] = mutated[change.path].replace(change.from, change.to);
  }
  for (const [path, contents] of Object.entries(mutated)) {
    writeFileSync(resolve(root, path), contents);
    const applied = readFileSync(resolve(root, path), 'utf8');
    if (!applied.includes('HARDENING_MUTANT') || applied === originals[path]) {
      throw new Error(`${mutationName}: mutation was not observed in ${path}`);
    }
  }
  process.stdout.write(
    `APPLIED ${mutationName}; detector: ${mutation.testFile} :: ${mutation.testName}\n`,
  );
} else if (action === 'restore') {
  if (!existsSync(backupPath)) {
    throw new Error(`No saved copy exists: ${backupPath}`);
  }
  const originals = JSON.parse(readFileSync(backupPath, 'utf8'));
  for (const [path, contents] of Object.entries(originals)) {
    writeFileSync(resolve(root, path), contents);
    if (readFileSync(resolve(root, path), 'utf8') !== contents) {
      throw new Error(`${mutationName}: byte-exact restoration failed for ${path}`);
    }
  }
  unlinkSync(backupPath);
  process.stdout.write(`RESTORED ${mutationName} byte-exactly\n`);
} else if (action === 'describe') {
  process.stdout.write(`${mutation.testFile} :: ${mutation.testName}\n`);
} else {
  throw new Error(
    'Usage: node tests/fixtures/hardening-mutations.mjs apply|restore|describe NAME',
  );
}
