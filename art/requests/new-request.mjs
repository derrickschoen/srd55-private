#!/usr/bin/env node
/**
 * Art-request scaffolder.
 *
 *   node art/requests/new-request.mjs <slug>          create art/requests/<uuidv7>-<slug>.json
 *   node art/requests/new-request.mjs --uuid          print one UUIDv7 and exit
 *   node art/requests/new-request.mjs --check         validate every request file and its assets
 *
 * Every request id is a UUIDv7 (RFC 9562): 48-bit Unix millisecond timestamp,
 * version nibble 7, 74 random bits. The id doubles as the filename prefix of the
 * request and of every asset delivered for it, so files sort by creation time.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUESTS_DIR = dirname(fileURLToPath(import.meta.url));
const INCOMING_DIR = join(REQUESTS_DIR, '..', 'incoming');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const REQUIRED = [
  'id', 'slug', 'createdAt', 'status', 'purpose', 'prompt', 'dimensions', 'style',
  'background', 'acceptanceCriteria', 'deliverable', 'license',
];

export function uuidv7(now = Date.now()) {
  const bytes = randomBytes(16);
  const ms = BigInt(now);
  for (let i = 0; i < 6; i += 1) bytes[i] = Number((ms >> BigInt(8 * (5 - i))) & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function template(id, slug, createdAt) {
  return {
    $schema: './request.schema.json',
    id,
    slug,
    createdAt,
    status: 'open',
    purpose: 'REPLACE: where the asset is used and why it is needed',
    prompt: 'REPLACE: the full generation prompt, self-contained',
    negativePrompt: '',
    dimensions: { width: 128, height: 128, aspectRatio: '1:1', pixelGrid: 1 },
    style: {
      summary: 'REPLACE: one-sentence style summary',
      references: ['public/assets/art/terrain-crate-v1.png'],
      palette: 'REPLACE',
    },
    background: { transparent: true, notes: 'REPLACE' },
    acceptanceCriteria: ['REPLACE: one observable, checkable criterion per entry'],
    deliverable: { format: 'png', filename: `${id}-${slug}.png`, directory: 'art/incoming' },
    license: 'CC0-1.0',
    notes: '',
  };
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function check() {
  const files = readdirSync(REQUESTS_DIR).filter((name) => name.endsWith('.json') && name !== 'request.schema.json');
  const problems = [];
  for (const name of files) {
    const request = JSON.parse(readFileSync(join(REQUESTS_DIR, name), 'utf8'));
    for (const key of REQUIRED) if (!(key in request)) problems.push(`${name}: missing "${key}"`);
    if (!UUID_V7.test(request.id)) problems.push(`${name}: id is not a UUIDv7`);
    if (!SLUG.test(request.slug)) problems.push(`${name}: slug is not kebab-case`);
    if (name !== `${request.id}-${request.slug}.json`) problems.push(`${name}: filename must be <id>-<slug>.json`);
    if (request.deliverable?.filename !== `${request.id}-${request.slug}.png`) problems.push(`${name}: deliverable.filename must be <id>-<slug>.png`);
    if (request.license !== 'CC0-1.0') problems.push(`${name}: license must be CC0-1.0`);
    if (JSON.stringify(request).includes('REPLACE')) problems.push(`${name}: template text "REPLACE" still present`);
    const delivered = existsSync(join(INCOMING_DIR, request.deliverable?.filename ?? ''));
    if (request.status === 'delivered' && !delivered) problems.push(`${name}: status delivered but ${request.deliverable.filename} is absent`);
    if (request.status === 'open' && delivered) problems.push(`${name}: asset delivered but status still open`);
  }
  for (const name of readdirSync(INCOMING_DIR)) {
    if (!/\.(?:png|webp|svg)$/u.test(name)) continue;
    const prefix = name.replace(/\.[a-z]+$/u, '');
    if (!files.includes(`${prefix}.json`)) problems.push(`incoming/${name}: no matching request ${prefix}.json`);
  }
  if (problems.length > 0) fail(problems.join('\n'));
  process.stdout.write(`${files.length} request(s) checked, no problems\n`);
}

const [, , command, ...rest] = process.argv;
if (command === '--uuid') {
  process.stdout.write(`${uuidv7()}\n`);
} else if (command === '--check') {
  check();
} else if (command && SLUG.test(command) && rest.length === 0) {
  const id = uuidv7();
  const createdAt = new Date().toISOString();
  const path = join(REQUESTS_DIR, `${id}-${command}.json`);
  writeFileSync(path, `${JSON.stringify(template(id, command, createdAt), null, 2)}\n`);
  process.stdout.write(`${path}\n`);
} else {
  fail('usage: new-request.mjs <kebab-slug> | --uuid | --check');
}
