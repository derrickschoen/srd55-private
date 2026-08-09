import { spawnSync } from 'node:child_process';
import { createReadStream, realpathSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const HOST = '127.0.0.1';
const DEFAULT_PORT = 4173;

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function fail(message) {
  process.stderr.write(`serve: ${message}\n`);
  process.exit(1);
}

function readPort(argv, environment) {
  let rawPort = environment.SERVE_PORT;
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--port') {
      rawPort = argv[index + 1];
      index += 1;
      if (rawPort === undefined) {
        fail('--port requires a value.');
      }
      continue;
    }
    if (argument.startsWith('--port=')) {
      rawPort = argument.slice('--port='.length);
      continue;
    }
    fail(`unknown argument ${JSON.stringify(argument)}.`);
  }
  const port = rawPort === undefined ? DEFAULT_PORT : Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    fail(`port must be an integer from 1 to 65535; received ${JSON.stringify(rawPort)}.`);
  }
  return port;
}

function build() {
  process.stdout.write(
    'serve: building dist/ and running its existing freshness/digest gates...\n',
  );
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error !== undefined) {
    fail(`could not run npm run build: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(`npm run build failed with exit code ${String(result.status)}; dist/ will not be served.`);
  }
}

function containedRegularFile(root, path) {
  try {
    const realPath = realpathSync(path);
    if (realPath !== root && !realPath.startsWith(`${root}${sep}`)) {
      return { kind: 'outside' };
    }
    return statSync(realPath).isFile()
      ? { kind: 'file', path: realPath }
      : { kind: 'missing' };
  } catch {
    return { kind: 'missing' };
  }
}

function responsePath(root, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return { kind: 'bad-request' };
  }
  if (pathname.includes('\0') || pathname.includes('\\')) {
    return { kind: 'bad-request' };
  }
  const candidate = resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
    return { kind: 'bad-request' };
  }
  const candidateFile = containedRegularFile(root, candidate);
  if (candidateFile.kind === 'outside') {
    return { kind: 'bad-request' };
  }
  if (candidateFile.kind === 'file') {
    return candidateFile;
  }
  // The built app owns extensionless routes such as /characters/1. Missing
  // asset-like requests remain 404s instead of receiving HTML as JavaScript.
  if (extname(pathname) === '') {
    const indexFile = containedRegularFile(root, resolve(root, 'index.html'));
    return indexFile.kind === 'file' ? indexFile : { kind: 'not-found' };
  }
  return { kind: 'not-found' };
}

function setHeaders(response, path) {
  const extension = extname(path).toLowerCase();
  response.setHeader(
    'Content-Type',
    MIME_TYPES.get(extension) ?? 'application/octet-stream',
  );
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=()',
  );
  const relativePath = path.slice(resolve('dist').length + 1).replaceAll('\\', '/');
  if (relativePath.startsWith('assets/')) {
    response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (relativePath === 'index.html' || relativePath === 'service-worker.js') {
    response.setHeader('Cache-Control', 'no-cache');
  }
}

function serve(port) {
  const root = realpathSync(resolve('dist'));
  const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      response.end();
      return;
    }
    const target = responsePath(root, request.url ?? '/');
    if (target.kind === 'bad-request') {
      response.writeHead(400);
      response.end('Bad request\n');
      return;
    }
    if (target.kind === 'not-found') {
      response.writeHead(404);
      response.end('Not found\n');
      return;
    }
    const stats = statSync(target.path);
    setHeaders(response, target.path);
    response.setHeader('Content-Length', String(stats.size));
    response.statusCode = 200;
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    createReadStream(target.path).pipe(response);
  });

  server.on('error', (error) => {
    fail(`could not listen on http://${HOST}:${String(port)}: ${error.message}`);
  });
  server.listen(port, HOST, () => {
    process.stdout.write(
      `serve: fresh dist/ available at http://${HOST}:${String(port)}\n`,
    );
  });
}

const port = readPort(process.argv.slice(2), process.env);
build();
serve(port);
