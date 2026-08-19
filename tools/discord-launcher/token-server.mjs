import { createServer } from 'node:http';

const port = Number.parseInt(process.env.TOKEN_PORT ?? '', 10);
const clientId = process.env.DISCORD_CLIENT_ID ?? '';
const clientSecret = process.env.DISCORD_CLIENT_SECRET ?? '';
const maxBodyBytes = 16 * 1024;

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBodyBytes) throw new Error('body_too_large');
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new Error('invalid_json');
  }
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') return json(response, 200, { ok: true });
  if (request.method !== 'POST' || request.url !== '/api/token') return json(response, 404, { error: 'not_found' });
  if (!clientId || !clientSecret) return json(response, 424, { error: 'missing_discord_credentials' });

  let input;
  try {
    input = await readJson(request);
  } catch (error) {
    return json(response, error.message === 'body_too_large' ? 413 : 400, { error: error.message });
  }
  if (typeof input.code !== 'string' || input.code.length === 0) return json(response, 400, { error: 'code_required' });

  // Official Embedded App SDK flow:
  // https://docs.discord.com/developers/activities/building-an-activity#step-5-authorizing-authenticating-users
  try {
    const discordResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: input.code,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const discordBody = await discordResponse.json().catch(() => ({ error: 'invalid_discord_response' }));
    if (!discordResponse.ok) return json(response, 502, { error: 'discord_token_exchange_failed', discord_status: discordResponse.status });
    if (typeof discordBody.access_token !== 'string') return json(response, 502, { error: 'discord_token_missing' });
    return json(response, 200, { access_token: discordBody.access_token });
  } catch (error) {
    return json(response, 502, { error: 'discord_token_exchange_unavailable', detail: error.name });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`listening on http://127.0.0.1:${port}`));
