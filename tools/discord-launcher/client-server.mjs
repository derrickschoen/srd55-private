import { createReadStream } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const directory = dirname(fileURLToPath(import.meta.url));
const port = Number.parseInt(process.env.PORT ?? '', 10);
const tokenPort = Number.parseInt(process.env.TOKEN_PORT ?? '', 10);
const relayPort = Number.parseInt(process.env.RELAY_PORT ?? '', 10);

function proxyHttp(incoming, outgoing) {
  const upstream = httpRequest({ hostname: '127.0.0.1', port: tokenPort, path: incoming.url, method: incoming.method, headers: incoming.headers }, (response) => {
    outgoing.writeHead(response.statusCode ?? 502, response.headers);
    response.pipe(outgoing);
  });
  upstream.on('error', () => { outgoing.writeHead(502, { 'content-type': 'application/json' }); outgoing.end('{"error":"token_service_unavailable"}'); });
  incoming.pipe(upstream);
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    return response.end('{"ok":true}');
  }
  if (request.url === '/api/token') return proxyHttp(request, response);
  if (request.method !== 'GET' || !['/', '/index.html'].includes(request.url ?? '')) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    return response.end('not found\n');
  }
  response.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
    'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'",
  });
  return createReadStream(join(directory, 'index.html')).pipe(response);
});

server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/relay') return socket.destroy();
  const upstream = httpRequest({ hostname: '127.0.0.1', port: relayPort, path: request.url, method: 'GET', headers: request.headers });
  upstream.on('upgrade', (response, upstreamSocket, upstreamHead) => {
    const headers = Object.entries(response.headers).map(([name, value]) => `${name}: ${value}`).join('\r\n');
    socket.write(`HTTP/1.1 ${response.statusCode} Switching Protocols\r\n${headers}\r\n\r\n`);
    if (upstreamHead.length) socket.write(upstreamHead);
    if (head.length) upstreamSocket.write(head);
    upstreamSocket.pipe(socket).pipe(upstreamSocket);
  });
  upstream.on('error', () => socket.destroy());
  upstream.end();
});

server.listen(port, '127.0.0.1', () => console.log(`listening on http://127.0.0.1:${port}`));
