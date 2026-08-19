export function parseEnv(contents) {
  const values = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) throw new Error(`invalid .env line: ${rawLine}`);
    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error(`invalid .env name: ${name}`);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[name] = value;
  }
  return values;
}

export function cloudflaredUrl(text) {
  return text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)?.[0] ?? null;
}

export function validatePort(value) {
  const port = Number.parseInt(value, 10);
  if (!/^\d+$/.test(value) || port < 1 || port > 65533) throw new Error(`invalid PORT: ${value}`);
  return port;
}
