import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTENT_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.wasm', 'application/wasm'],
]);

function containedRealFile(root, candidate) {
  try {
    const real = realpathSync(candidate);
    const inside = relative(root, real);
    if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside) || !statSync(real).isFile()) return null;
    return real;
  } catch {
    return null;
  }
}

export function validateExistingDist(directory) {
  const root = resolve(directory);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error(`Refusing to serve missing dist directory: ${root}`);
  }
  const realRoot = realpathSync(root);
  const indexPath = containedRealFile(realRoot, resolve(realRoot, 'index.html'));
  if (indexPath === null) throw new Error(`Refusing to serve missing dist directory: ${root}`);
  const stampPath = containedRealFile(realRoot, resolve(realRoot, 'vtt-handoff-artifact.json'));
  if (stampPath === null) throw new Error(`Refusing to serve unstamped dist directory: ${root}`);
  const stamp = JSON.parse(readFileSync(stampPath, 'utf8'));
  if (
    typeof stamp !== 'object' || stamp === null || stamp.artifact !== 'dist' ||
    typeof stamp.commit !== 'string' || !/^[0-9a-f]{40}$/u.test(stamp.commit) ||
    typeof stamp.worker !== 'object' || stamp.worker === null ||
    typeof stamp.worker.url !== 'string' || !stamp.worker.url.startsWith('/') ||
    typeof stamp.worker.sha256 !== 'string' || !/^[0-9a-f]{64}$/u.test(stamp.worker.sha256)
  ) throw new Error('Refusing to serve an invalid VTT handoff dist stamp.');
  const workerCandidate = safeDistPath(realRoot, stamp.worker.url);
  const workerPath = workerCandidate === null ? null : containedRealFile(realRoot, workerCandidate);
  if (workerPath === null) {
    throw new Error('Refusing to serve a dist whose stamped Worker is missing.');
  }
  const actualHash = createHash('sha256').update(readFileSync(workerPath)).digest('hex');
  if (actualHash !== stamp.worker.sha256) {
    throw new Error('Refusing to serve a dist whose Worker hash disagrees with its stamp.');
  }
  return { root: realRoot, stamp };
}

export function safeDistPath(root, requestPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(requestPath.split(/[?#]/u, 1)[0]);
  } catch {
    return null;
  }
  if (pathname.includes('\0') || pathname.split('/').includes('..')) return null;
  pathname = new URL(pathname, 'http://127.0.0.1').pathname;
  const candidate = resolve(root, `.${pathname}`);
  const inside = relative(root, candidate);
  if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) return null;
  return candidate;
}

export function createExistingDistServer(directory) {
  const validated = validateExistingDist(directory);
  return createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const requestPath = request.url ?? '/';
    let filePath = safeDistPath(validated.root, requestPath);
    if (filePath === null) {
      response.writeHead(400);
      response.end('Invalid path.');
      return;
    }
    if (!existsSync(filePath)) {
      filePath = resolve(validated.root, 'index.html');
    } else {
      const contained = containedRealFile(validated.root, filePath);
      if (contained === null) {
        response.writeHead(400);
        response.end('Invalid path.');
        return;
      }
      filePath = contained;
    }
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(filePath).pipe(response);
  });
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const rawPort = argumentValue('--port');
  if (rawPort === undefined || !/^\d+$/u.test(rawPort)) throw new Error('--port is required.');
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535 || port === 4_173) {
    throw new Error(`Invalid non-4173 port: ${rawPort}`);
  }
  const directory = argumentValue('--dist') ?? resolve(process.cwd(), 'dist');
  const server = createExistingDistServer(directory);
  server.listen(port, '127.0.0.1', () => {
    console.log(`Serving stamped dist from ${resolve(directory)} at http://127.0.0.1:${String(port)}`);
  });
}
