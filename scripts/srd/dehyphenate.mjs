#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const extractPath = fileURLToPath(
  new URL('../../docs/srd/source/spell-descriptions.txt', import.meta.url),
);
const arguments_ = process.argv.slice(2);
const write = arguments_.includes('--write');

if (arguments_.some((argument) => argument !== '--write')) {
  throw new Error('Usage: node scripts/srd/dehyphenate.mjs [--write]');
}

// These are lexical hyphens, not discretionary PDF line-break hyphens. Reflow
// closes the line break while retaining the compound's own hyphen.
const lexicalHyphens = new Set([
  'foot-by',
  'foot-high',
  'long-dead',
  'nine-course',
]);

const splitWord = /(?<left>[A-Za-z]+)-[ \t]*\n(?:[ \t]*\n)*[ \t]*(?<right>[a-z][A-Za-z]*)/gu;
const metadata = /^\s*(?:Level [1-9] [A-Za-z]+|[A-Za-z]+ Cantrip) \(/u;

function previousContentLine(lines, before) {
  for (let index = before - 1; index >= 0; index -= 1) {
    const line = lines[index]?.trim() ?? '';
    if (line !== '' && !line.startsWith('=== SRD 5.2.1 page ')) return index;
  }
  throw new Error('Spell metadata appears before a spell heading.');
}

function descriptionRanges(lines) {
  const starts = lines.flatMap((line, index) => metadata.test(line) ? [index] : []);
  const headings = starts.map((start) => previousContentLine(lines, start));
  return starts.map((start, position) => {
    const end = headings[position + 1] ?? lines.length;
    const duration = lines.findIndex(
      (line, index) => index >= start && index < end && line.trim().startsWith('Duration:'),
    );
    if (duration < start) {
      throw new Error(`No Duration field after line ${String(start + 1)}.`);
    }
    return {
      name: lines[headings[position]].trim(),
      start: duration + 1,
      end,
    };
  });
}

const original = readFileSync(extractPath, 'utf8');
const lines = original.split('\n');
const ranges = descriptionRanges(lines);
let candidateCount = 0;
let removedHyphenCount = 0;
let retainedHyphenCount = 0;
let affectedSpellCount = 0;

for (const range of [...ranges].reverse()) {
  const prose = lines.slice(range.start, range.end).join('\n');
  let affected = false;
  const reflowed = prose.replace(splitWord, (...matches) => {
    const groups = matches.at(-1);
    const compound = `${groups.left}-${groups.right}`;
    const retain = lexicalHyphens.has(compound.toLowerCase());
    candidateCount += 1;
    removedHyphenCount += retain ? 0 : 1;
    retainedHyphenCount += retain ? 1 : 0;
    affected = true;
    return retain ? compound : `${groups.left}${groups.right}`;
  });
  if (affected) affectedSpellCount += 1;
  lines.splice(range.start, range.end - range.start, ...reflowed.split('\n'));
}

const transformed = lines.join('\n');
const remainingCount = descriptionRanges(lines).reduce(
  (count, range) => count + [
    ...lines.slice(range.start, range.end).join('\n').matchAll(splitWord),
  ].length,
  0,
);

if (write && transformed !== original) writeFileSync(extractPath, transformed);

process.stdout.write(
  `${[
    `mode=${write ? 'write' : 'check'}`,
    `line_breaks_before=${String(candidateCount)}`,
    `affected_spells=${String(affectedSpellCount)}`,
    `hyphens_removed=${String(removedHyphenCount)}`,
    `lexical_hyphens_retained=${String(retainedHyphenCount)}`,
    `line_breaks_after=${String(remainingCount)}`,
    `changed=${String(transformed !== original)}`,
  ].join(' ')}\n`,
);
