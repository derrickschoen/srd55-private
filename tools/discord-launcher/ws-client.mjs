const url = process.argv[2] ?? 'ws://127.0.0.1:5173/relay';
const requestId = `probe-${Date.now()}`;
const socket = new WebSocket(url);
const timeout = setTimeout(() => { console.error('relay probe timed out'); socket.close(); process.exitCode = 1; }, 10_000);

socket.addEventListener('open', () => socket.send(JSON.stringify({ v: 1, type: 'probe.echo', requestId })));
socket.addEventListener('message', ({ data }) => {
  clearTimeout(timeout);
  const envelope = JSON.parse(data);
  if (envelope.v !== 1 || envelope.type !== 'probe.echo' || envelope.requestId !== requestId) {
    console.error('relay returned the wrong envelope');
    process.exitCode = 1;
  } else {
    console.log(`relay echo round-trip ok: v=${envelope.v} type=${envelope.type}`);
  }
  socket.close();
});
socket.addEventListener('error', () => { clearTimeout(timeout); console.error('relay connection failed'); process.exitCode = 1; });
