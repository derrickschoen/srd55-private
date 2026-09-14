import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
export const HIT_GUARD_DESCRIPTOR = Object.freeze({ script: 'tools/assert-dist-clean.mjs', args: [] });
export const VALIDATED_BUILD_DESCRIPTORS = Object.freeze([
  Object.freeze({ script: 'node_modules/typescript/bin/tsc', args: ['-b'] }),
  Object.freeze({ script: 'node_modules/vite/bin/vite.js', args: ['build', '--configLoader', 'runner'] }),
  HIT_GUARD_DESCRIPTOR]);
// KEY_VERDICT_START
const FORMAT = 'dnd-dist-build-cache-v2';
const ATTRS = ['text', 'eol', 'filter', 'ident', 'working-tree-encoding'];
export function productionBuildEnv(parent) { const child = {};
  for (const name of ['PATH', 'HOME', 'TMPDIR', 'TZ']) {
    if (parent[name] !== undefined) child[name] = parent[name]; }
  Object.assign(child, { NODE_ENV: 'production', LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' });
  if (parent.STATIC_APP_CACHE_DIR !== undefined) child.STATIC_APP_CACHE_DIR = parent.STATIC_APP_CACHE_DIR;
  return child; }
function bypass(reason) { throw Object.assign(new Error(reason), { cacheBypass: reason }); }
function frame(hash, value) { const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
  const length = Buffer.allocUnsafe(8);
  length.writeBigUInt64BE(BigInt(bytes.length));
  hash.update(length).update(bytes); }
function git(root, args, input, allowOne = false) { const result = spawnSync('git', args, {
    cwd: root, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error !== undefined || (result.status !== 0 && !(allowOne && result.status === 1))) {
    bypass('git-failure'); }
  return result; }
function nul(bytes) { if (bytes.length === 0) return [];
  if (bytes.at(-1) !== 0) bypass('git-failure');
  const output = [];
  let start = 0;
  while (start < bytes.length) {
    const end = bytes.indexOf(0, start);
    output.push(bytes.subarray(start, end));
    start = end + 1; }
  return output; }
function overlayCompare(a, b) {
  return Buffer.compare(a.current, b.current) || Buffer.compare(a.old ?? Buffer.alloc(0), b.old ?? Buffer.alloc(0)) ||
    Buffer.compare(a.status, b.status); }
export function sortOverlayRecords(records) { return [...records].sort(overlayCompare); }
function parseStatus(bytes) { const [fields, output] = [nul(bytes), []];
  for (let index = 0; index < fields.length; index += 1) { const field = fields[index];
    if (field.length < 4 || field[2] !== 32) bypass('git-failure');
    const status = field.subarray(0, 2), moved = status.includes(67) || status.includes(82);
    const old = moved ? fields[++index] : undefined;
    if (moved && old === undefined) bypass('git-failure');
    output.push({ status, old, current: field.subarray(3) }); }
  return sortOverlayRecords(output); }
function validatePath(path) { if (
  path[0] === 34 || path[path.lastIndexOf(47) + 1] === 34 || path.includes(10) || path.includes(13)) {
    bypass('unsupported-path'); } }
function statesFor(root, paths) { const [states, extant] = [new Map(), []];
  for (const path of paths) { validatePath(path);
    const key = path.toString('hex');
    if (states.has(key)) continue;
    try { const stat = lstatSync(Buffer.concat([Buffer.from(`${root}${sep}`), path]));
      if (stat.isSymbolicLink()) bypass('symlink');
      if (!stat.isFile()) bypass('git-failure');
      states.set(key, { mode: stat.mode & 0o111 ? '100755' : '100644' });
      extant.push(path); } catch (error) {
      if (error?.cacheBypass !== undefined) throw error;
      if (error?.code !== 'ENOENT') bypass('git-failure');
      states.set(key, undefined); } }
  extant.sort(Buffer.compare);
  const input = Buffer.concat(extant.map((path) => Buffer.concat([path, Buffer.of(10)])));
  const raw = extant.length === 0 ? Buffer.alloc(0) :
    git(root, ['hash-object', '--no-filters', '--stdin-paths'], input).stdout;
  const ids = raw.length === 0 ? [] : raw.toString('ascii').trimEnd().split('\n');
  if (ids.length !== extant.length || ids.some((id) => !/^[0-9a-f]{40}$/u.test(id))) bypass('git-failure');
  extant.forEach((path, index) => states.get(path.toString('hex')).objectId = ids[index]);
  return states; }
function allowed(values, actual) {
  return values === undefined || (!values.includes(`!${actual}`) &&
    (!values.some((value) => !value.startsWith('!')) || values.includes(actual))); }
function installation(root, objectId) { try {
    const bytes = readFileSync(resolve(root, 'node_modules/.package-lock.json'));
    const wanted = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
    const actual = JSON.parse(bytes.toString('utf8'));
    const expected = Object.entries(wanted.packages).filter(([path, pkg]) => path !== '' &&
      allowed(pkg.os, process.platform) && allowed(pkg.cpu, process.arch));
    const installed = new Map(Object.entries(actual.packages).filter(([path]) => path !== ''));
    if (expected.some(([, pkg]) => pkg.libc !== undefined) ||
      wanted.lockfileVersion !== actual.lockfileVersion || expected.length !== installed.size) bypass('stale-install');
    for (const [path, pkg] of expected) { const found = installed.get(path);
      if (found === undefined || found.version !== pkg.version) bypass('stale-install');
      if (pkg.resolved !== undefined && found.resolved !== undefined && pkg.resolved !== found.resolved) {
        bypass('stale-install'); }
      if (pkg.integrity !== undefined && found.integrity !== undefined && pkg.integrity !== found.integrity) {
        bypass('stale-install'); } }
    return [objectId, createHash('sha256').update(bytes).digest('hex')]; } catch (error) {
    if (error?.cacheBypass !== undefined) throw error;
    bypass('stale-install'); } }
function slot(hash, label, path, states) { frame(hash, label);
  if (path === undefined) return frame(hash, 'none');
  frame(hash, path);
  const state = states.get(path.toString('hex'));
  if (state === undefined) return frame(hash, 'deleted');
  frame(hash, 'present');
  frame(hash, state.mode);
  frame(hash, state.objectId); }
export function distCacheVerdict(root, parent = process.env) { let head;
  try { head = git(root, ['rev-parse', 'HEAD']).stdout.toString('ascii').trim();
    if (!/^[0-9a-f]{40}$/u.test(head)) bypass('invalid-head');
    const records = nul(git(root, ['ls-files', '-s', '-z']).stdout);
    const index = records.map((raw) => { const tab = raw.indexOf(9);
      const fields = raw.subarray(0, tab).toString('ascii').split(' ');
      if (tab < 0 || fields.length !== 3 || !/^[0-7]{6}$/u.test(fields[0]) ||
        !/^[0-9a-f]{40}$/u.test(fields[1]) || !/^[0-3]$/u.test(fields[2])) bypass('git-failure');
      return { raw, mode: fields[0], objectId: fields[1], stage: fields[2], path: raw.subarray(tab + 1) }; });
    if (index.some(({ mode }) => mode === '160000')) bypass('submodule');
    if (index.some(({ mode }) => mode === '120000')) bypass('symlink');
    const flags = nul(git(root, ['ls-files', '-v', '-z']).stdout);
    if (flags.some((item) => item.length < 3 || item[1] !== 32)) bypass('git-failure');
    if (flags.some((item) => item[0] === 83 || (item[0] >= 97 && item[0] <= 122))) bypass('special-index');
    const autocrlf = git(root, ['config', '--get', 'core.autocrlf'], undefined, true);
    if (autocrlf.status === 0 && autocrlf.stdout.toString().trim().toLowerCase() !== 'false') bypass('normalization');
    if (git(root, ['ls-files', '--', '.gitattributes', '**/.gitattributes']).stdout.length) bypass('normalization');
    const paths = Buffer.concat(index.map(({ path }) => Buffer.concat([path, Buffer.of(0)])));
    const attrs = nul(git(root, ['check-attr', '-z', '--stdin', ...ATTRS], paths).stdout);
    if (attrs.length !== index.length * ATTRS.length * 3) bypass('git-failure');
    let offset = 0;
    for (const { path } of index) { for (const name of ATTRS) {
        if (!attrs[offset++]?.equals(path) || attrs[offset++]?.toString() !== name) bypass('git-failure');
        if (attrs[offset++]?.toString() !== 'unspecified') bypass('normalization'); } }
    const lock = index.find(({ path, stage }) => stage === '0' && path.equals(Buffer.from('package-lock.json')));
    if (lock === undefined) bypass('stale-install');
    const install = installation(root, lock.objectId);
    const overlay = parseStatus(git(root, ['status', '--porcelain=v1', '-z',
      '--untracked-files=all', '--ignore-submodules=none']).stdout);
    const publicPaths = nul(git(root, ['ls-files', '-z', '--others', '--ignored',
      '--exclude-standard', '--', 'public']).stdout).sort(Buffer.compare);
    const dirtyPaths = overlay.flatMap(({ old, current }) => old === undefined ? [current] : [old, current]);
    const states = statesFor(root, [...dirtyPaths, ...publicPaths]);
    const env = productionBuildEnv(parent);
    const names = ['LANG', 'LC_ALL', 'NODE_ENV', 'STATIC_APP_CACHE_DIR']
      .filter((name) => env[name] !== undefined).sort();
    const hash = createHash('sha256');
    [FORMAT, head, process.version, process.platform, process.arch, ...install].forEach((value) => frame(hash, value));
    names.forEach((name) => frame(hash, `${name}=${env[name]}`));
    records.forEach((raw) => frame(hash, Buffer.concat([raw, Buffer.of(0)])));
    overlay.forEach((item) => {
      frame(hash, item.status);
      slot(hash, 'old', item.old, states);
      slot(hash, 'new', item.current, states); });
    publicPaths.forEach((path) => {
      frame(hash, path);
      frame(hash, states.get(path.toString('hex')).objectId); });
    for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
      frame(hash, name);
      frame(hash, existsSync(resolve(root, name)) ? 'present' : 'absent');
      if (existsSync(resolve(root, name))) frame(
        hash, createHash('sha256').update(readFileSync(resolve(root, name))).digest('hex')); }
    return { cacheable: true, head, key: hash.digest('hex') }; } catch (error) {
    if (error?.cacheBypass !== undefined) return { cacheable: false, head, reason: error.cacheBypass };
    throw error; } }
// KEY_VERDICT_END
function filesBelow(directory) { return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(path);
    if (entry.isFile()) return [path];
    throw new Error('dist contains a non-regular entry'); }); }
function directoryDigest(directory) { const hash = createHash('sha256');
  frame(hash, FORMAT);
  for (const path of filesBelow(directory).sort()) {
    frame(hash, relative(directory, path).split(sep).join('/'));
    frame(hash, readFileSync(path)); }
  return hash.digest('hex'); }
const nonce = () => `${process.pid}.${randomBytes(8).toString('hex')}`;
function artifactMatches(directory, head) { const value = JSON.parse(
  readFileSync(join(directory, 'vtt-handoff-artifact.json'), 'utf8'));
  if (value.commit !== head) throw new Error(`artifact commit ${String(value.commit)} != ${head}`); }
function run(root, descriptors, env) { for (const descriptor of descriptors) {
    const result = spawnSync(process.execPath, [resolve(root, descriptor.script), ...descriptor.args], {
      cwd: root, env, stdio: 'inherit',
    });
    if (result.error !== undefined || result.status !== 0) {
      throw result.error ?? new Error(`${descriptor.script} failed with ${String(result.status)}`); } } }
function restore(root, cacheRoot, verdict, env) { const temporary = resolve(
  root, `.dist-cache-restore.${nonce()}.partial`);
  try { const stamp = JSON.parse(readFileSync(join(cacheRoot, `${verdict.key}.json`), 'utf8'));
    if (stamp.format !== FORMAT || stamp.key !== verdict.key || stamp.head !== verdict.head) return false;
    if (!stamp.generation.startsWith(`${verdict.key}.`) || !/^[a-f0-9.]+$/u.test(stamp.generation)) return false;
    const cached = resolve(cacheRoot, 'generations', stamp.generation, 'dist');
    if (directoryDigest(cached) !== stamp.distDigest) return false;
    cpSync(cached, temporary, { recursive: true, errorOnExist: true });
    if (directoryDigest(temporary) !== stamp.distDigest) return false;
    artifactMatches(temporary, verdict.head);
    rmSync(resolve(root, 'dist'), { recursive: true, force: true });
    renameSync(temporary, resolve(root, 'dist'));
    run(root, [HIT_GUARD_DESCRIPTOR], env);
    process.stdout.write(`dist cache hit: ${verdict.key}\n`);
    return true; } catch {
    return false; } finally {
    rmSync(temporary, { recursive: true, force: true }); } }
function store(root, cacheRoot, verdict) { const name = `${verdict.key}.${nonce()}`;
  const partial = join(cacheRoot, 'generations', `.${name}.partial`);
  const complete = join(cacheRoot, 'generations', name);
  const pointer = join(cacheRoot, `${verdict.key}.json`);
  const pointerTemporary = `${pointer}.${nonce()}.partial`;
  try {
    mkdirSync(partial, { recursive: true });
    cpSync(resolve(root, 'dist'), join(partial, 'dist'), { recursive: true, errorOnExist: true });
    const distDigest = directoryDigest(join(partial, 'dist'));
    renameSync(partial, complete);
    writeFileSync(pointerTemporary, `${JSON.stringify({
      format: FORMAT, key: verdict.key, head: verdict.head, distDigest, generation: name,
    })}\n`);
    renameSync(pointerTemporary, pointer);
    process.stdout.write(`dist cache stored: ${verdict.key}\n`); } finally {
    rmSync(partial, { recursive: true, force: true });
    rmSync(pointerTemporary, { force: true }); } }
export function buildOrRestoreDist(root, options = {}) { const parent = options.parentEnv ?? process.env;
  const [env, cacheRoot] = [productionBuildEnv(parent), options.cacheRoot ?? join(tmpdir(), FORMAT)];
  const first = distCacheVerdict(root, parent);
  if (!first.cacheable) {
    process.stdout.write(`dist cache bypass: ${first.reason}\n`);
    run(root, VALIDATED_BUILD_DESCRIPTORS, env);
    artifactMatches(resolve(root, 'dist'), first.head);
    return; }
  if (restore(root, cacheRoot, first, env)) return;
  process.stdout.write(`dist cache miss: ${first.key}\n`);
  run(root, VALIDATED_BUILD_DESCRIPTORS, env);
  artifactMatches(resolve(root, 'dist'), first.head);
  const second = distCacheVerdict(root, parent);
  if (!second.cacheable || second.key !== first.key || second.head !== first.head) {
    process.stdout.write('dist cache unstable-inputs\n');
    return; }
  try { store(root, cacheRoot, first); } catch (error) {
    process.stderr.write(`dist cache store failed; keeping dist: ${String(error)}\n`); } }
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) { try {
    buildOrRestoreDist(process.cwd()); } catch (error) {
    process.stderr.write(`dist build failed: ${String(error)}\n`);
    process.exitCode = 1; } }
