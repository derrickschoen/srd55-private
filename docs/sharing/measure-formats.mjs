#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  brotliCompressSync,
  constants as zlibConstants,
  deflateRawSync,
  gzipSync,
} from "node:zlib";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(scriptDirectory, "minimal-share-example.json");
const source = JSON.parse(readFileSync(sourcePath, "utf8"));
const externalModulesDirectory =
  process.argv.find((argument) => argument.startsWith("--modules="))?.slice(10) ??
  process.env.SHARE_FORMAT_MODULES;
const externalVersions = {};
const falseDefaultPaths = new Set([
  "character.allow_legacy",
  "selections[].keep",
]);

/*
 * These are the agreed semantic trims, not serialization tricks:
 * - discard user commentary (`note` and `notes`);
 * - treat null and false as schema defaults;
 * - omit containers that become empty.
 *
 * Empty strings and zero are retained. True is retained because it is meaningful
 * for `keep` and `favourite` in this specimen.
 */
function trimShareValue(value, key, path = []) {
  const normalizedPath = path
    .map((segment) => (typeof segment === "number" ? "[]" : segment))
    .join(".")
    .replaceAll(".[]", "[]");
  if (
    key === "note" ||
    key === "notes" ||
    value === null ||
    (value === false && falseDefaultPaths.has(normalizedPath))
  ) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const trimmed = value
      .map((entry, index) => trimShareValue(entry, undefined, [...path, index]))
      .filter((entry) => entry !== undefined);
    return trimmed.length === 0 ? undefined : trimmed;
  }

  if (typeof value === "object") {
    const trimmed = Object.fromEntries(
      Object.entries(value)
        .map(([entryKey, entryValue]) => [
          entryKey,
          trimShareValue(entryValue, entryKey, [...path, entryKey]),
        ])
        .filter(([, entryValue]) => entryValue !== undefined),
    );
    return Object.keys(trimmed).length === 0 ? undefined : trimmed;
  }

  return value;
}

const trimmed = trimShareValue(source);

function fixedTuple(values) {
  return values.map((value) => (value === undefined ? null : value));
}

function positionalEncode(document) {
  return [
    document.format,
    document.version,
    fixedTuple([
      document.character.name,
      document.character.strength,
      document.character.dexterity,
      document.character.constitution,
      document.character.intelligence,
      document.character.wisdom,
      document.character.charisma,
      document.character.proficiency_bonus_override,
      document.character.rules_edition_preference,
      document.character.allow_legacy,
      document.character.notes,
    ]),
    document.classes?.map((record) =>
      fixedTuple([
        record.id,
        record.classKey,
        record.subclassKey,
        record.level,
        record.start,
        record.ability,
        record.config,
        record.subclassConfig,
      ]),
    ),
    document.sources?.map((record) =>
      fixedTuple([
        record.id,
        record.type,
        record.key,
        record.config,
        record.acquired,
        record.name,
      ]),
    ),
    document.selections?.map((record) =>
      fixedTuple([
        record.ref,
        record.ruleKey,
        record.ordinal,
        record.spellKey,
        record.spellName,
        record.keep,
      ]),
    ),
    document.spellbook,
    document.preferences?.map((record) =>
      fixedTuple([record.spellKey, record.favourite]),
    ),
    document.overrides?.map((record) =>
      fixedTuple([record.ruleKey, record.value]),
    ),
    document.acknowledgements?.map((record) =>
      fixedTuple([record.warning]),
    ),
    document.loadouts?.map((record) =>
      fixedTuple([
        record.name,
        record.entries?.map((entry) =>
          fixedTuple([entry.spellKey, entry.role]),
        ),
      ]),
    ),
    document.weapons ?? null,
    document.species || document.speciesTraits || document.background
      ? [
          document.species ?? null,
          document.speciesTraits ?? null,
          document.background ?? null,
        ]
      : null,
    document.armor ||
      document.hitPointRolls ||
      document.skillProficiencies ||
      document.sheetAdjustment
      ? [
          document.armor ?? null,
          document.hitPointRolls ?? null,
          document.skillProficiencies ?? null,
          document.sheetAdjustment ?? null,
        ]
      : null,
    document.effects ?? null,
    document.placeholders ?? null,
  ];
}

function objectFromTuple(fields, tuple) {
  return Object.fromEntries(
    fields
      .map((field, index) => [field, tuple?.[index]])
      .filter(([, value]) => value !== undefined && value !== null),
  );
}

function positionalDecode(tuple) {
  const [
    format,
    version,
    character,
    classes,
    sources,
    selections,
    spellbook,
    preferences,
    overrides,
    acknowledgements,
    loadouts,
    weapons,
    origin,
    sheet,
    effects,
    placeholders,
  ] = tuple;

  return {
    format,
    version,
    character: objectFromTuple(
      [
        "name",
        "strength",
        "dexterity",
        "constitution",
        "intelligence",
        "wisdom",
        "charisma",
        "proficiency_bonus_override",
        "rules_edition_preference",
        "allow_legacy",
        "notes",
      ],
      character,
    ),
    ...(classes && {
      classes: classes.map((record) =>
        objectFromTuple(
          [
            "id",
            "classKey",
            "subclassKey",
            "level",
            "start",
            "ability",
            "config",
            "subclassConfig",
          ],
          record,
        ),
      ),
    }),
    ...(sources && {
      sources: sources.map((record) =>
        objectFromTuple(
          ["id", "type", "key", "config", "acquired", "name"],
          record,
        ),
      ),
    }),
    ...(selections && {
      selections: selections.map((record) =>
        objectFromTuple(
          ["ref", "ruleKey", "ordinal", "spellKey", "spellName", "keep"],
          record,
        ),
      ),
    }),
    ...(spellbook && { spellbook }),
    ...(preferences && {
      preferences: preferences.map((record) =>
        objectFromTuple(["spellKey", "favourite"], record),
      ),
    }),
    ...(overrides && {
      overrides: overrides.map((record) =>
        objectFromTuple(["ruleKey", "value"], record),
      ),
    }),
    ...(acknowledgements && {
      acknowledgements: acknowledgements.map((record) =>
        objectFromTuple(["warning"], record),
      ),
    }),
    ...(loadouts && {
      loadouts: loadouts.map(([name, entries]) => ({
        name,
        ...(entries && {
          entries: entries.map((record) =>
            objectFromTuple(["spellKey", "role"], record),
          ),
        }),
      })),
    }),
    ...(weapons && { weapons }),
    ...(origin?.[0] && { species: origin[0] }),
    ...(origin?.[1] && { speciesTraits: origin[1] }),
    ...(origin?.[2] && { background: origin[2] }),
    ...(sheet?.[0] && { armor: sheet[0] }),
    ...(sheet?.[1] && { hitPointRolls: sheet[1] }),
    ...(sheet?.[2] && { skillProficiencies: sheet[2] }),
    ...(sheet?.[3] && { sheetAdjustment: sheet[3] }),
    ...(effects && { effects }),
    ...(placeholders && { placeholders }),
  };
}

function escapeTsv(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("\t", "\\t")
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n");
}

function unescapeTsv(value) {
  let decoded = "";
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "\\") {
      decoded += value[index];
      continue;
    }
    index += 1;
    const escaped = value[index];
    const replacements = { "\\": "\\", t: "\t", r: "\r", n: "\n" };
    if (!(escaped in replacements)) {
      throw new Error("Invalid TSV escape");
    }
    decoded += replacements[escaped];
  }
  return decoded;
}

function encodeRows(rows) {
  return rows
    .map((row) => row.map((value) => escapeTsv(value ?? "")).join("\t"))
    .join("\n");
}

function decodeRows(value, expectedColumns) {
  if (value === "") {
    return [];
  }
  return value.split("\n").map((line) => {
    const columns = line.split("\t").map(unescapeTsv);
    assert.equal(columns.length, expectedColumns, "Unexpected TSV column count");
    return columns;
  });
}

function tabularEncode(document) {
  return {
    ...document,
    selections: encodeRows(
      document.selections.map((record) => [
        record.ref,
        record.ruleKey,
        record.ordinal,
        record.spellKey,
        record.spellName,
        record.keep ? "1" : "",
      ]),
    ),
    spellbook: encodeRows(document.spellbook.map((spellKey) => [spellKey])),
    loadouts: document.loadouts?.map((loadout) => ({
      ...loadout,
      entries: encodeRows(
        loadout.entries.map((entry) => [entry.spellKey, entry.role]),
      ),
    })),
  };
}

function tabularDecode(document) {
  return {
    ...document,
    selections: decodeRows(document.selections, 6).map(
      ([ref, ruleKey, ordinal, spellKey, spellName, keep]) => ({
        ref: Number(ref),
        ruleKey,
        ordinal: Number(ordinal),
        spellKey,
        ...(spellName && { spellName }),
        ...(keep && { keep: keep === "1" }),
      }),
    ),
    spellbook: decodeRows(document.spellbook, 1).map(([spellKey]) => spellKey),
    loadouts: document.loadouts?.map((loadout) => ({
      ...loadout,
      entries: decodeRows(loadout.entries, 2).map(([spellKey, role]) => ({
        spellKey,
        role,
      })),
    })),
  };
}

const positional = positionalEncode(trimmed);
const tabular = tabularEncode(trimmed);
assert.deepEqual(positionalDecode(positional), trimmed);
assert.deepEqual(tabularDecode(tabular), trimmed);

function compress(payload) {
  const input = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
  return {
    raw: input,
    gzip: gzipSync(input, { level: 9, mtime: 0 }),
    "deflate-raw": deflateRawSync(input, { level: 9 }),
    brotli: brotliCompressSync(input, {
      params: {
        [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
        [zlibConstants.BROTLI_PARAM_QUALITY]: 11,
      },
    }),
  };
}

const encodings = [
  ["Minified JSON", Buffer.from(JSON.stringify(source)), "measured"],
  ["Trimmed minified JSON", Buffer.from(JSON.stringify(trimmed)), "measured"],
  [
    "Positional JSON tuples",
    Buffer.from(JSON.stringify(positional)),
    "measured",
  ],
  ["TSV/JSON hybrid", Buffer.from(JSON.stringify(tabular)), "prototype"],
];

async function loadExternalPackage(packageName) {
  if (!externalModulesDirectory) {
    return undefined;
  }
  const packageDirectory = join(
    externalModulesDirectory,
    ...packageName.split("/"),
  );
  const manifest = JSON.parse(
    readFileSync(join(packageDirectory, "package.json"), "utf8"),
  );
  externalVersions[packageName] = manifest.version;
  const packageExport = manifest.exports?.["."];
  const importExport =
    typeof packageExport?.import === "object"
      ? packageExport.import.default
      : packageExport?.import;
  const entry =
    (typeof packageExport === "string" ? packageExport : importExport) ??
    manifest.module ??
    manifest.main;
  assert(entry, `Cannot resolve an import entry for ${packageName}`);
  const entryPath = join(packageDirectory, entry);
  return import(pathToFileURL(entryPath));
}

const msgpack = await loadExternalPackage("@msgpack/msgpack");
if (msgpack) {
  const encoded = Buffer.from(msgpack.encode(trimmed));
  const limits = {
    maxStrLength: 16_384,
    maxBinLength: 16_384,
    maxArrayLength: 1_024,
    maxMapLength: 1_024,
    maxExtLength: 0,
  };
  assert.deepEqual(msgpack.decode(encoded, limits), trimmed);
  encodings.push(["MessagePack (trimmed object)", encoded, "measured"]);
  const positionalEncoded = Buffer.from(msgpack.encode(positional));
  assert.deepEqual(msgpack.decode(positionalEncoded, limits), positional);
  encodings.push([
    "MessagePack (positional tuples)",
    positionalEncoded,
    "measured",
  ]);
}

const cborg = await loadExternalPackage("cborg");
if (cborg) {
  const strictCborOptions = {
    strict: true,
    allowIndefinite: false,
    allowUndefined: false,
    allowBigInt: false,
    allowInfinity: false,
    allowNaN: false,
    rejectDuplicateMapKeys: true,
  };
  const encoded = Buffer.from(cborg.encode(trimmed));
  assert.deepEqual(cborg.decode(encoded, strictCborOptions), trimmed);
  encodings.push(["CBOR (trimmed object)", encoded, "measured"]);
  const positionalEncoded = Buffer.from(cborg.encode(positional));
  assert.deepEqual(
    cborg.decode(positionalEncoded, strictCborOptions),
    positional,
  );
  encodings.push(["CBOR (positional tuples)", positionalEncoded, "measured"]);
}

let sqliteVersion;
try {
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(":memory:");
  sqliteVersion = database.prepare("SELECT sqlite_version() AS version").get()
    .version;
  const sqliteJsonb = database
    .prepare("SELECT jsonb(?) AS payload")
    .get(JSON.stringify(trimmed)).payload;
  encodings.push([
    `SQLite ${sqliteVersion} JSONB`,
    Buffer.from(sqliteJsonb),
    "measured, internal",
  ]);
  database.close();
} catch (error) {
  process.stderr.write(`SQLite JSONB unavailable: ${error.message}\n`);
}

let postgresDetails;
const pglite = await loadExternalPackage("@electric-sql/pglite");
if (pglite) {
  const database = new pglite.PGlite();
  const json = JSON.stringify(trimmed);
  const result = await database.query(
    `SELECT
       version(),
       pg_column_size($1::jsonb) AS storage_bytes,
       octet_length(jsonb_send($1::jsonb)) AS send_bytes,
       encode(jsonb_send($1::jsonb), 'hex') AS send_hex`,
    [json],
  );
  const row = result.rows[0];
  postgresDetails = {
    version: row.version,
    storageBytes: row.storage_bytes,
    sendBytes: row.send_bytes,
  };
  encodings.push([
    "PostgreSQL jsonb_send (trimmed)",
    Buffer.from(row.send_hex, "hex"),
    "measured wire form; internal storage differs",
  ]);
  await database.close();
}

function base64urlLength(payload) {
  return payload.toString("base64url").length;
}

const results = encodings.map(([name, payload, status]) => {
  const compressed = compress(payload);
  const candidates = ["gzip", "deflate-raw", "brotli"];
  const best = candidates.reduce((winner, candidate) =>
    compressed[candidate].length < compressed[winner].length
      ? candidate
      : winner,
  );
  return {
    name,
    status,
    raw: compressed.raw.length,
    gzip: compressed.gzip.length,
    deflateRaw: compressed["deflate-raw"].length,
    brotli: compressed.brotli.length,
    best,
    base64url: base64urlLength(compressed[best]),
  };
});

console.log(
  `Node ${process.version}; ${process.platform}/${process.arch}; zlib ${process.versions.zlib}; Brotli ${process.versions.brotli}; SQLite ${sqliteVersion ?? "unavailable"}`,
);
if (Object.keys(externalVersions).length > 0) {
  console.log(
    Object.entries(externalVersions)
      .map(([name, version]) => `${name}@${version}`)
      .join("; "),
  );
}
if (postgresDetails) {
  console.log(
    `PostgreSQL jsonb internal datum=${postgresDetails.storageBytes} B; jsonb_send wire form=${postgresDetails.sendBytes} B; ${postgresDetails.version}`,
  );
}
console.log(
  "gzip=level 9; deflate-raw=level 9; brotli=quality 11, text mode; base64url=no padding",
);
if (!externalModulesDirectory) {
  console.log(
    "MessagePack/CBOR skipped: pass --modules=/absolute/path/to/node_modules",
  );
}
console.log("");
console.log(
  "| Encoding | Status | Raw B | gzip B | deflate-raw B | Brotli B | Best | Best base64url chars |",
);
console.log(
  "|---|---|---:|---:|---:|---:|---|---:|",
);
for (const result of results) {
  console.log(
    `| ${result.name} | ${result.status} | ${result.raw} | ${result.gzip} | ${result.deflateRaw} | ${result.brotli} | ${result.best} | ${result.base64url} |`,
  );
}
