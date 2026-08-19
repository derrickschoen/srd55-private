import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

const port = Number.parseInt(process.env.RELAY_PORT ?? '', 10);
const magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function frame(payload, opcode = 1) {
  const body = Buffer.from(payload);
  if (body.length < 126) return Buffer.concat([Buffer.from([0x80 | opcode, body.length]), body]);
  const header = Buffer.alloc(4);
  header[0] = 0x80 | opcode;
  header[1] = 126;
  header.writeUInt16BE(body.length, 2);
  return Buffer.concat([header, body]);
}

function decode(buffer) {
  if (buffer.length < 6 || (buffer[1] & 0x80) === 0) return null;
  const opcode = buffer[0] & 0x0f;
  let length = buffer[1] & 0x7f;
  let offset = 2;
  if (length === 126) { if (buffer.length < 8) return null; length = buffer.readUInt16BE(2); offset = 4; }
  if (length === 127 || length >= 64 * 1024 || buffer.length < offset + 4 + length) return null;
  const mask = buffer.subarray(offset, offset + 4);
  const payload = Buffer.from(buffer.subarray(offset + 4, offset + 4 + length));
  for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
  return { opcode, payload, consumed: offset + 4 + length };
}

const server = createServer((request, response) => {
  response.writeHead(request.url === '/health' ? 200 : 404, { 'content-type': 'application/json' });
  response.end(JSON.stringify(request.url === '/health' ? { ok: true } : { error: 'not_found' }));
});

server.on('upgrade', (request, socket) => {
  if (request.url !== '/relay' || request.headers.upgrade?.toLowerCase() !== 'websocket' || !request.headers['sec-websocket-key']) return socket.destroy();
  const accept = createHash('sha1').update(request.headers['sec-websocket-key'] + magic).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  let pending = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length > 0) {
      const message = decode(pending);
      if (!message) break;
      pending = pending.subarray(message.consumed);
      if (message.opcode === 8) return socket.end(frame('', 8));
      if (message.opcode === 9) { socket.write(frame(message.payload, 10)); continue; }
      if (message.opcode !== 1) continue;
      try {
        const envelope = JSON.parse(message.payload.toString('utf8'));
        if (envelope?.v !== 1 || typeof envelope.type !== 'string') throw new Error('invalid_envelope');
        socket.write(frame(JSON.stringify(envelope)));
      } catch {
        socket.write(frame(JSON.stringify({ v: 1, type: 'relay.error', error: 'invalid_envelope' })));
      }
    }
  });
});

server.listen(port, '127.0.0.1', () => console.log(`listening on ws://127.0.0.1:${port}/relay`));
