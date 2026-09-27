import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect } from 'vitest';

const outputDirectory = process.env.VERDICT_FS_OBSERVATIONS_DIR;
const repositoryRoot = process.env.VERDICT_REPOSITORY_ROOT;

if (outputDirectory === undefined || repositoryRoot === undefined) {
  throw new Error('The verdict filesystem recorder was enabled without its output contract.');
}

const stateSymbol = Symbol.for('dnd.verdict-fs-recorder');
const original = {
  access: fs.access.bind(fs),
  accessSync: fs.accessSync.bind(fs),
  appendFile: fs.appendFile.bind(fs),
  appendFileSync: fs.appendFileSync.bind(fs),
  copyFile: fs.copyFile.bind(fs),
  copyFileSync: fs.copyFileSync.bind(fs),
  createReadStream: fs.createReadStream.bind(fs),
  createWriteStream: fs.createWriteStream.bind(fs),
  existsSync: fs.existsSync.bind(fs),
  lstat: fs.lstat.bind(fs),
  lstatSync: fs.lstatSync.bind(fs),
  mkdir: fs.mkdir.bind(fs),
  mkdirSync: fs.mkdirSync.bind(fs),
  mkdtemp: fs.mkdtemp.bind(fs),
  mkdtempSync: fs.mkdtempSync.bind(fs),
  open: fs.open.bind(fs),
  openSync: fs.openSync.bind(fs),
  readFile: fs.readFile.bind(fs),
  readFileSync: fs.readFileSync.bind(fs),
  readdir: fs.readdir.bind(fs),
  readdirSync: fs.readdirSync.bind(fs),
  realpath: fs.realpath.bind(fs),
  realpathSync: fs.realpathSync.bind(fs),
  rename: fs.rename.bind(fs),
  renameSync: fs.renameSync.bind(fs),
  stat: fs.stat.bind(fs),
  statSync: fs.statSync.bind(fs),
  truncate: fs.truncate.bind(fs),
  truncateSync: fs.truncateSync.bind(fs),
  writeFile: fs.writeFile.bind(fs),
  writeFileSync: fs.writeFileSync.bind(fs),
};

function absolutePath(input) {
  if (typeof input === 'number') return undefined;
  if (input !== null && typeof input === 'object' && 'fd' in input) return undefined;
  try {
    const value = input instanceof URL ? fileURLToPath(input) : String(input);
    const lexical = isAbsolute(value) ? resolve(value) : resolve(process.cwd(), value);
    try {
      return original.realpathSync(lexical);
    } catch {
      return lexical;
    }
  } catch {
    return undefined;
  }
}

function isWithin(parent, candidate) {
  return candidate === parent || candidate.startsWith(`${parent}${sep}`);
}

/** `kind:name` for an absolute path in the repository, as the audit and test:affected name it; else undefined. */
function repositoryObservation(kind, path) {
  if (!isWithin(repositoryRoot, path)) return undefined;
  return `${kind}:${relative(repositoryRoot, path).split(sep).join('/')}`;
}

function currentState() {
  return globalThis[stateSymbol]?.current;
}

function isAllowlistedInfrastructureRead(state, observation) {
  const testName = relative(repositoryRoot, state.testFile).split(sep).join('/');
  const snapshotName = `${dirname(testName)}/__snapshots__/${basename(testName)}.snap`;
  return observation === `path:${snapshotName}`;
}

function noteWrite(input, directory = false) {
  const path = absolutePath(input);
  const state = currentState();
  if (path === undefined || state === undefined) return;
  state.written.add(path);
  if (directory) state.writtenDirectories.add(path);
}

function wasWritten(state, path) {
  if (state.written.has(path)) return true;
  return [...state.writtenDirectories].some((directory) => isWithin(directory, path));
}

function observationKind(operation, options) {
  if (operation.endsWith('readdir') || operation.endsWith('readdirSync')) {
    return options !== null && typeof options === 'object' && options.recursive === true
      ? 'directory-tree'
      : 'directory';
  }
  if (
    operation.endsWith('readFile') ||
    operation.endsWith('readFileSync') ||
    operation.endsWith('open') ||
    operation.endsWith('openSync') ||
    operation === 'createReadStream'
  ) return 'file';
  return 'path';
}

function noteRead(operation, input, options) {
  const state = currentState();
  if (state === undefined) return;
  const path = absolutePath(input);
  if (path === undefined) {
    state.external.add(`${operation}:<unresolved file descriptor or path>`);
    return;
  }
  if (wasWritten(state, path)) return;

  // Dependency resolution may probe checkout-local or ancestor node_modules,
  // including deliberately case-mangled negative candidates. package-lock.json
  // binds installed dependency identity in the stable salt.
  if (`${sep}${path.toLowerCase()}${sep}`.includes(`${sep}node_modules${sep}`)) return;
  // Project caches named /tmp/dnd-* are content-addressed: their producers bind
  // semantic inputs into the cache key and validate cached bytes before use.
  if (path.startsWith('/tmp/dnd-')) return;

  const observation = repositoryObservation(observationKind(operation, options), path);
  if (observation !== undefined) {
    state.observed.add(observation);
    return;
  }

  state.external.add(`${operation}:${path}`);
}

/**
 * What a file that declares engine children declares through them: every
 * file the bundle check reads for the offered bundle (`engineChildCheckReads`),
 * named as this recorder names what it observes. Reads with the recorder
 * suspended, so deriving the declaration is not itself observed. A missing or
 * invalid offer throws.
 */
async function engineChildDeclarations(state, offer) {
  globalThis[stateSymbol].current = undefined;
  try {
    const { engineChildSealedReads } = await import('../../tools/engine-child-bundle.ts');
    const reads = engineChildSealedReads(repositoryRoot, offer);
    return [
      ...reads.contents.map((path) => repositoryObservation('file', absolutePath(path))),
      ...reads.existence.map((path) => repositoryObservation('path', absolutePath(path))),
    ].filter((observation) => observation !== undefined);
  } finally {
    globalThis[stateSymbol].current = state;
  }
}

function noteEnvironmentRead(name) {
  const state = currentState();
  if (state !== undefined && typeof name === 'string') state.environment.add(name);
}

function noteEnvironmentEnumeration() {
  const state = currentState();
  if (state !== undefined) state.environmentEnumerated = true;
}

function callbackIndex(args) {
  for (let index = args.length - 1; index >= 0; index -= 1) {
    if (typeof args[index] === 'function') return index;
  }
  return -1;
}

function patchCallbackWrite(name, pathIndex, directory = false, resultPath = false) {
  fs[name] = (...args) => {
    const index = callbackIndex(args);
    if (index >= 0) {
      const callback = args[index];
      args[index] = (error, result) => {
        if (error === null) noteWrite(resultPath ? result : args[pathIndex], directory);
        callback(error, result);
      };
    }
    return original[name](...args);
  };
}

function patchCallbackRead(name) {
  fs[name] = (...args) => {
    noteRead(name, args[0], args[1]);
    return original[name](...args);
  };
}

if (globalThis[stateSymbol] === undefined) {
  globalThis[stateSymbol] = { current: undefined };

  for (const name of ['access', 'lstat', 'readFile', 'readdir', 'realpath', 'stat']) {
    patchCallbackRead(name);
  }
  for (const name of ['accessSync', 'existsSync', 'lstatSync', 'readFileSync', 'readdirSync', 'realpathSync', 'statSync']) {
    fs[name] = (...args) => {
      noteRead(name, args[0], args[1]);
      return original[name](...args);
    };
  }
  fs.createReadStream = (...args) => {
    noteRead('createReadStream', args[0], args[1]);
    return original.createReadStream(...args);
  };
  fs.open = (...args) => {
    const flags = String(args[1] ?? 'r');
    if (flags.includes('r') || flags.includes('+')) noteRead('open', args[0], flags);
    const index = callbackIndex(args);
    if (index >= 0 && /[awx+]/u.test(flags)) {
      const callback = args[index];
      args[index] = (error, result) => {
        if (error === null) noteWrite(args[0]);
        callback(error, result);
      };
    }
    return original.open(...args);
  };
  fs.openSync = (...args) => {
    const flags = String(args[1] ?? 'r');
    if (flags.includes('r') || flags.includes('+')) noteRead('openSync', args[0], flags);
    const result = original.openSync(...args);
    if (/[awx+]/u.test(flags)) noteWrite(args[0]);
    return result;
  };

  for (const name of ['appendFile', 'writeFile']) patchCallbackWrite(name, 0);
  patchCallbackWrite('copyFile', 1);
  patchCallbackWrite('mkdtemp', 0, true, true);
  patchCallbackWrite('rename', 1);
  patchCallbackWrite('truncate', 0);
  fs.mkdir = (...args) => {
    const existed = original.existsSync(absolutePath(args[0]) ?? args[0]);
    const index = callbackIndex(args);
    if (index >= 0) {
      const callback = args[index];
      args[index] = (error, result) => {
        if (error === null && !existed) noteWrite(args[0], true);
        callback(error, result);
      };
    }
    return original.mkdir(...args);
  };

  for (const name of ['appendFileSync', 'writeFileSync']) {
    fs[name] = (...args) => {
      const result = original[name](...args);
      noteWrite(args[0]);
      return result;
    };
  }
  fs.copyFileSync = (...args) => {
    const result = original.copyFileSync(...args);
    noteWrite(args[1]);
    return result;
  };
  fs.mkdirSync = (...args) => {
    const existed = original.existsSync(absolutePath(args[0]) ?? args[0]);
    const result = original.mkdirSync(...args);
    if (!existed) noteWrite(args[0], true);
    return result;
  };
  fs.mkdtempSync = (...args) => {
    const result = original.mkdtempSync(...args);
    noteWrite(result, true);
    return result;
  };
  fs.renameSync = (...args) => {
    const result = original.renameSync(...args);
    noteWrite(args[1]);
    return result;
  };
  fs.truncateSync = (...args) => {
    const result = original.truncateSync(...args);
    noteWrite(args[0]);
    return result;
  };
  fs.createWriteStream = (...args) => {
    noteWrite(args[0]);
    return original.createWriteStream(...args);
  };

  const promises = fs.promises;
  for (const name of ['access', 'lstat', 'readFile', 'readdir', 'realpath', 'stat']) {
    const implementation = promises[name].bind(promises);
    promises[name] = (...args) => {
      noteRead(`promises.${name}`, args[0], args[1]);
      return implementation(...args);
    };
  }
  const promiseOpen = promises.open.bind(promises);
  promises.open = async (...args) => {
    const flags = String(args[1] ?? 'r');
    if (flags.includes('r') || flags.includes('+')) noteRead('promises.open', args[0], flags);
    const result = await promiseOpen(...args);
    if (/[awx+]/u.test(flags)) noteWrite(args[0]);
    return result;
  };
  for (const name of ['appendFile', 'writeFile']) {
    const implementation = promises[name].bind(promises);
    promises[name] = async (...args) => {
      const result = await implementation(...args);
      noteWrite(args[0]);
      return result;
    };
  }
  for (const [name, pathIndex, directory, resultPath] of [
    ['copyFile', 1, false, false],
    ['mkdtemp', 0, true, true],
    ['rename', 1, false, false],
    ['truncate', 0, false, false],
  ]) {
    const implementation = promises[name].bind(promises);
    promises[name] = async (...args) => {
      const result = await implementation(...args);
      noteWrite(resultPath ? result : args[pathIndex], directory);
      return result;
    };
  }
  const promiseMkdir = promises.mkdir.bind(promises);
  promises.mkdir = async (...args) => {
    const existed = original.existsSync(absolutePath(args[0]) ?? args[0]);
    const result = await promiseMkdir(...args);
    if (!existed) noteWrite(args[0], true);
    return result;
  };
  syncBuiltinESMExports();

  // Every environment variable a test reads keys its verdict by value
  // (test:affected hashes it), so reads name the variable; writes pass
  // through. An enumeration reads every variable at once and fails the file
  // closed. Variables only native code reads (TZ, LANG, LC_ALL) never reach
  // this object; test:affected hashes those for every file.
  const recordingEnvironment = new Proxy(process.env, {
    get(target, name) {
      noteEnvironmentRead(name);
      return Reflect.get(target, name);
    },
    has(target, name) {
      noteEnvironmentRead(name);
      return Reflect.has(target, name);
    },
    getOwnPropertyDescriptor(target, name) {
      noteEnvironmentRead(name);
      return Reflect.getOwnPropertyDescriptor(target, name);
    },
    ownKeys(target) {
      noteEnvironmentEnumeration();
      return Reflect.ownKeys(target);
    },
    set: (target, name, value) => Reflect.set(target, name, value),
    deleteProperty: (target, name) => Reflect.deleteProperty(target, name),
    defineProperty: (target, name, descriptor) => Reflect.defineProperty(target, name, descriptor),
  });
  process.env = recordingEnvironment;
  globalThis[stateSymbol].environment = recordingEnvironment;
}

const testFile = expect.getState().testPath;
if (testFile === undefined) {
  throw new Error('Vitest did not expose the active test file to the verdict recorder.');
}
const fileState = {
  environment: new Set(),
  environmentEnumerated: false,
  external: new Set(),
  observed: new Set(),
  testFile,
  written: new Set(),
  writtenDirectories: new Set(),
};

globalThis[stateSymbol].current = fileState;

beforeAll(() => {
  globalThis[stateSymbol].current = fileState;
});

afterAll(async () => {
  const declaredInputs = fileState.declaredInputs;
  if (declaredInputs !== undefined && typeof fileState.engineChildOffer === 'string') {
    let derived;
    try {
      derived = await engineChildDeclarations(fileState, fileState.engineChildOffer);
    } catch (error) {
      if (globalThis[stateSymbol].current === fileState) globalThis[stateSymbol].current = undefined;
      throw error;
    }
    for (const observation of derived) declaredInputs.add(observation);
  }
  if (declaredInputs !== undefined) {
    const undeclared = [...fileState.observed]
      .filter((input) =>
        !declaredInputs.has(input) &&
        !isAllowlistedInfrastructureRead(fileState, input))
      .sort();
    const external = [...fileState.external].sort();
    if (undeclared.length > 0 || external.length > 0) {
      if (globalThis[stateSymbol].current === fileState) {
        globalThis[stateSymbol].current = undefined;
      }
      const details = [
        ...undeclared.map((input) => `undeclared repository input: ${input}`),
        ...external.map((input) => `undeclared external input: ${input}`),
      ];
      throw new Error(
        `Test input audit failed for ${relative(repositoryRoot, fileState.testFile)}:\n` +
        details.map((detail) => `  - ${detail}`).join('\n'),
      );
    }
  }
  if (process.env !== globalThis[stateSymbol].environment) {
    if (globalThis[stateSymbol].current === fileState) globalThis[stateSymbol].current = undefined;
    throw new Error(
      `process.env was replaced while ${relative(repositoryRoot, fileState.testFile)} ran, so the verdict ` +
        'recorder cannot name the environment variables its tests read. Restore the original object.',
    );
  }
  const record = {
    version: 2,
    testFile: relative(repositoryRoot, fileState.testFile).split(sep).join('/'),
    observedInputs: [...fileState.observed].sort(),
    externalInputs: [...fileState.external].sort(),
    environmentInputs: [...fileState.environment].sort(),
    environmentEnumerated: fileState.environmentEnumerated,
    ...(declaredInputs === undefined
      ? {}
      : { declaredInputs: [...declaredInputs].sort() }),
  };
  const outputPath = resolve(
    outputDirectory,
    `${process.pid}-${Buffer.from(record.testFile).toString('base64url')}.json`,
  );
  original.writeFileSync(outputPath, `${JSON.stringify(record)}\n`, 'utf8');
  if (globalThis[stateSymbol].current === fileState) {
    globalThis[stateSymbol].current = undefined;
  }
});
