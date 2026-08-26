#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// The execution environment can export both. Keeping FORCE_COLOR is harmless,
// while dropping the losing flag prevents Node from adding a warning to every
// otherwise machine-readable transcript.
delete process.env.NO_COLOR;
const { createServer, createServerModuleRunner } = await import('vite');

const experimentDirectory = dirname(fileURLToPath(import.meta.url));
const root = resolve(experimentDirectory, '../../..');
const bootstrapPath = resolve(root, 'src/db/bootstrap.ts');
const openDbPath = resolve(root, 'tests/helpers/open-db.ts');
const seededCachePath = resolve(
  root,
  'tests/helpers/seeded-database-image-cache.ts',
);
const probePath = resolve(experimentDirectory, 'probe.ts');
const bootstrapUrl = '/src/db/bootstrap.ts';
const openDbUrl = '/tests/helpers/open-db.ts';
const seededCacheUrl = '/tests/helpers/seeded-database-image-cache.ts';
const probeUrl = '/tools/experiments/hmr-verdicts/probe.ts';
const marker = 'application-seed-overlay';
const processSeedCache = '__dndSeededDatabaseImagePromises';

const configurations = [
  'A-leaf-only',
  'B-full-reverse-cone',
  'C1-leaf-plus-global-reset',
  'C2-accept-dispose-contracts',
];

function sha256(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function normalizedId(id) {
  return id.split('?')[0];
}

function seedOverlay(source) {
  const needle =
    '  seedApplication(db, () => undefined, verification, profile);\n}';
  if (!source.includes(needle)) {
    throw new Error('Could not locate applicationSeed overlay insertion point.');
  }
  return source.replace(
    needle,
    `  seedApplication(db, () => undefined, verification, profile);\n` +
      `  db.exec('CREATE TABLE IF NOT EXISTS hmr_verdict_markers (marker TEXT PRIMARY KEY)');\n` +
      `  db.exec('INSERT INTO hmr_verdict_markers (marker) VALUES (?)', ['${marker}']);\n}`,
  );
}

function hmrOpenDbContract(source) {
  const original =
    "import { applicationSeed } from '../../src/db/bootstrap';";
  if (!source.includes(original)) {
    throw new Error('Could not locate open-db applicationSeed import.');
  }
  return source.replace(
    original,
    "import { applicationSeed as importedApplicationSeed } from '../../src/db/bootstrap';\n" +
      'let applicationSeed = importedApplicationSeed;',
  ) + `\nif (import.meta.hot) {\n` +
    `  import.meta.hot.accept('../../src/db/bootstrap', (nextBootstrap) => {\n` +
    `    applicationSeed = nextBootstrap.applicationSeed;\n` +
    `  });\n` +
    `}\n`;
}

function hmrSeededCacheContract(source) {
  const original = `import {\n  applicationBootVerificationBuildKey,\n  applicationSeed,\n} from '../../src/db/bootstrap';`;
  if (!source.includes(original)) {
    throw new Error('Could not locate seeded-cache bootstrap imports.');
  }
  return source.replace(
    original,
    `import {\n` +
      `  applicationBootVerificationBuildKey as importedApplicationBootVerificationBuildKey,\n` +
      `  applicationSeed as importedApplicationSeed,\n` +
      `} from '../../src/db/bootstrap';\n` +
      `let applicationBootVerificationBuildKey = importedApplicationBootVerificationBuildKey;\n` +
      `let applicationSeed = importedApplicationSeed;`,
  ) + `\nif (import.meta.hot) {\n` +
    `  import.meta.hot.accept('../../src/db/bootstrap', (nextBootstrap) => {\n` +
    `    applicationBootVerificationBuildKey = nextBootstrap.applicationBootVerificationBuildKey;\n` +
    `    applicationSeed = nextBootstrap.applicationSeed;\n` +
    `  });\n` +
    `}\n`;
}

function hmrBootstrapDispose(source) {
  return source + `\nif (import.meta.hot) {\n` +
    `  import.meta.hot.dispose(() => {\n` +
    `    delete process.${processSeedCache};\n` +
    `  });\n` +
    `}\n`;
}

function overlayController(withHmrContracts) {
  const directory = mkdtempSync(join(tmpdir(), 'dnd-hmr-verdicts-'));
  const file = join(directory, 'bootstrap.overlay.ts');
  const source = readFileSync(bootstrapPath, 'utf8');
  const sourceHash = sha256(source);
  let active = false;

  return {
    apply() {
      const overlaid = seedOverlay(source);
      writeFileSync(file, overlaid, 'utf8');
      if (!overlaid.includes(marker) || sha256(overlaid) === sourceHash) {
        throw new Error('Overlay application proof failed.');
      }
      active = true;
      return { sourceHash, overlayHash: sha256(overlaid) };
    },
    revert() {
      active = false;
      rmSync(file, { force: true });
      const restoredHash = sha256(readFileSync(bootstrapPath));
      if (restoredHash !== sourceHash) {
        throw new Error('Real bootstrap source was not restored.');
      }
      return { sourceHash, restoredHash };
    },
    close() {
      rmSync(directory, { recursive: true, force: true });
    },
    plugin: {
      name: 'hmr-verdicts-overlay',
      enforce: 'pre',
      load(id) {
        if (active && normalizedId(id) === bootstrapPath) {
          return readFileSync(file, 'utf8');
        }
        return null;
      },
      transform(code, id) {
        if (!withHmrContracts) return null;
        const cleanId = normalizedId(id);
        if (cleanId === openDbPath) return hmrOpenDbContract(code);
        if (cleanId === seededCachePath) return hmrSeededCacheContract(code);
        if (cleanId === bootstrapPath) return hmrBootstrapDispose(code);
        return null;
      },
    },
  };
}

async function runtime(withHmrContracts, overlayInitiallyActive = false) {
  const overlay = overlayController(withHmrContracts);
  let initialProof;
  if (overlayInitiallyActive) initialProof = overlay.apply();
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    appType: 'custom',
    plugins: [overlay.plugin],
    server: { middlewareMode: true },
  });
  const runner = createServerModuleRunner(server.environments.ssr, {
    hmr: withHmrContracts ? { logger: false } : false,
    sourcemapInterceptor: false,
  });
  return { overlay, initialProof, runner, server };
}

function evaluatedNode(runner, path) {
  const direct = runner.evaluatedModules.getModuleById(path);
  if (direct !== undefined) return direct;
  for (const node of runner.evaluatedModules.idToModuleMap.values()) {
    if (normalizedId(node.id) === path || normalizedId(node.file) === path) {
      return node;
    }
  }
  throw new Error(`No evaluated module for ${path}.`);
}

function environmentNode(server, path) {
  const direct = server.environments.ssr.moduleGraph.getModuleById(path);
  if (direct !== undefined) return direct;
  for (const node of server.environments.ssr.moduleGraph.idToModuleMap.values()) {
    if (normalizedId(node.id) === path || normalizedId(node.file) === path) {
      return node;
    }
  }
  throw new Error(`No server module for ${path}.`);
}

function leafOnlyInvalidate(server, runner) {
  const serverNode = environmentNode(server, bootstrapPath);
  const importers = [...serverNode.importers];
  serverNode.importers.clear();
  try {
    server.environments.ssr.moduleGraph.invalidateModule(serverNode);
  } finally {
    for (const importer of importers) serverNode.importers.add(importer);
  }
  runner.evaluatedModules.invalidateModule(
    evaluatedNode(runner, bootstrapPath),
  );
}

function reverseCone(runner, startingNode) {
  const result = new Set();
  const pending = [startingNode];
  while (pending.length > 0) {
    const node = pending.pop();
    if (result.has(node)) continue;
    result.add(node);
    for (const importerId of node.importers) {
      const importer = runner.evaluatedModules.getModuleById(importerId);
      if (importer !== undefined) pending.push(importer);
    }
  }
  return result;
}

function fullReverseConeInvalidate(server, runner) {
  const startingNode = evaluatedNode(runner, bootstrapPath);
  const cone = reverseCone(runner, startingNode);
  server.environments.ssr.moduleGraph.invalidateModule(
    environmentNode(server, bootstrapPath),
  );
  for (const node of cone) runner.evaluatedModules.invalidateModule(node);
  return [...cone].map((node) => normalizedId(node.file)).sort();
}

function resetProcessSeedCache() {
  delete process[processSeedCache];
}

async function measure(probe) {
  const present = await probe.markerPresent();
  return {
    marker: present ? 'present' : 'absent',
    verdict: present ? 'FAIL' : 'PASS',
    listeners: probe.listenerCanaryCount(),
    processSeedCache: process[processSeedCache] === undefined ? 'absent' : 'present',
  };
}

function coldMeasurement() {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), '--cold-overlay'],
    {
      cwd: root,
      encoding: 'utf8',
      env: cleanSeedCacheEnvironment(process.env),
    },
  );
  if (result.status !== 0) {
    throw new Error(`Cold overlay run failed:\n${result.stdout}${result.stderr}`);
  }
  const line = result.stdout.split('\n').find((candidate) =>
    candidate.startsWith('COLD_JSON ')
  );
  if (line === undefined) throw new Error('Cold overlay result was missing.');
  return JSON.parse(line.slice('COLD_JSON '.length));
}

function cleanSeedCacheEnvironment(environment) {
  const result = { ...environment };
  delete result.DND_SEEDED_DATABASE_IMAGE_FULL;
  delete result.DND_SEEDED_DATABASE_IMAGE_TEST_CORE;
  // Some shells export both of these; Node warns before every child run when
  // NO_COLOR loses to FORCE_COLOR, obscuring the experiment transcript.
  delete result.NO_COLOR;
  return result;
}

async function runColdOverlay() {
  resetProcessSeedCache();
  const instance = await runtime(false, true);
  try {
    const probe = await instance.runner.import(probeUrl);
    const result = await measure(probe);
    if (result.marker !== 'present' || result.verdict !== 'FAIL') {
      throw new Error('Negative control failed: cold overlay did not fail.');
    }
    console.log(`COLD_JSON ${JSON.stringify(result)}`);
  } finally {
    await instance.runner.close();
    await instance.server.close();
    instance.overlay.revert();
    instance.overlay.close();
  }
}

async function acceptDisposeUpdate(server, runner) {
  const bootstrap = environmentNode(server, bootstrapPath);
  const acceptedBy = [...bootstrap.importers]
    .filter((node) => node.acceptedHmrDeps.has(bootstrap))
    .map((node) => node.url)
    .sort();
  if (
    !acceptedBy.includes(openDbUrl) ||
    !acceptedBy.includes(seededCacheUrl)
  ) {
    throw new Error(`Incomplete HMR boundaries: ${acceptedBy.join(', ')}`);
  }
  const timestamp = Date.now();
  server.environments.ssr.moduleGraph.invalidateModule(
    bootstrap,
    new Set(),
    timestamp,
    true,
  );
  for (const path of acceptedBy) {
    await runner.hmrClient.queueUpdate({
      type: 'js-update',
      timestamp,
      path,
      acceptedPath: bootstrapUrl,
      explicitImportRequired: false,
      isWithinCircularImport: false,
    });
  }
  return acceptedBy;
}

async function runConfiguration(name) {
  resetProcessSeedCache();
  const withContracts = name === 'C2-accept-dispose-contracts';
  const instance = await runtime(withContracts);
  let overlayApplied = false;
  try {
    let probe = await instance.runner.import(probeUrl);
    const warm = await measure(probe);
    if (warm.marker !== 'absent' || warm.verdict !== 'PASS') {
      throw new Error('Warm baseline did not pass before applying the overlay.');
    }

    const applied = instance.overlay.apply();
    overlayApplied = true;
    let detail;
    if (name === 'A-leaf-only') {
      leafOnlyInvalidate(instance.server, instance.runner);
      await instance.runner.import(bootstrapUrl);
      detail = 'invalidated=bootstrap only';
    } else if (name === 'B-full-reverse-cone') {
      const cone = fullReverseConeInvalidate(instance.server, instance.runner);
      probe = await instance.runner.import(probeUrl);
      detail = `reverse-cone=${String(cone.length)} open-db=${String(cone.includes(openDbPath))} probe=${String(cone.includes(probePath))}`;
    } else if (name === 'C1-leaf-plus-global-reset') {
      resetProcessSeedCache();
      leafOnlyInvalidate(instance.server, instance.runner);
      await instance.runner.import(bootstrapUrl);
      detail = 'invalidated=bootstrap only reset=process seed cache';
    } else if (name === 'C2-accept-dispose-contracts') {
      const acceptedBy = await acceptDisposeUpdate(instance.server, instance.runner);
      detail = `accepted-by=${acceptedBy.join(',')} dispose=process seed cache`;
    } else {
      throw new Error(`Unknown configuration ${name}.`);
    }

    const live = await measure(probe);
    const cold = coldMeasurement();
    if (cold.verdict !== 'FAIL') {
      throw new Error('The cold negative control did not fail.');
    }
    const restored = instance.overlay.revert();
    overlayApplied = false;

    console.log(`CONFIG ${name}`);
    console.log(`  warm: marker=${warm.marker} verdict=${warm.verdict} listeners=${String(warm.listeners)} process-seed-cache=${warm.processSeedCache}`);
    console.log(`  apply: source=${applied.sourceHash} overlay=${applied.overlayHash} marker-in-overlay=yes`);
    console.log(`  swap: ${detail}`);
    console.log(`  live: marker=${live.marker} verdict=${live.verdict} listeners=${String(live.listeners)} process-seed-cache=${live.processSeedCache}`);
    console.log(`  cold: marker=${cold.marker} verdict=${cold.verdict} listeners=${String(cold.listeners)} process-seed-cache=${cold.processSeedCache}`);
    console.log(`  revert: source=${restored.sourceHash} restored=${restored.restoredHash} equal=yes`);
    console.log(`  comparison: ${live.verdict === cold.verdict ? 'CORRECT' : 'FALSE-GREEN'}`);
  } finally {
    if (overlayApplied) instance.overlay.revert();
    await instance.runner.close();
    await instance.server.close();
    instance.overlay.close();
  }
}

function runAll() {
  for (const name of configurations) {
    const result = spawnSync(
      process.execPath,
      [fileURLToPath(import.meta.url), '--configuration', name],
      {
        cwd: root,
        encoding: 'utf8',
        env: cleanSeedCacheEnvironment(process.env),
      },
    );
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}

const [mode, value] = process.argv.slice(2);
if (mode === '--cold-overlay') {
  await runColdOverlay();
} else if (mode === '--configuration' && configurations.includes(value)) {
  await runConfiguration(value);
} else if (mode === undefined) {
  runAll();
} else {
  throw new Error('Usage: node tools/experiments/hmr-verdicts/run.mjs');
}
