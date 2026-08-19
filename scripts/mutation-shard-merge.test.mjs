#!/usr/bin/env node

import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { namespaceShardReport, parseArguments, shardPaths } from './mutation-shard.mjs';

function report(testName, source, mutantId) {
  return {
    testFiles: {
      'tests/shared.test.ts': {
        source,
        tests: [{ id: '8', name: testName }],
      },
    },
    files: {
      'src/example.ts': {
        language: 'typescript',
        source: 'export const value = 1;',
        mutants: [
          {
            id: mutantId,
            status: 'Killed',
            coveredBy: ['8'],
            killedBy: ['8'],
          },
        ],
      },
    },
  };
}

function testNameById(reportValue, id) {
  return Object.values(reportValue.testFiles)
    .flatMap((testFile) => testFile.tests)
    .find((test) => test.id === id)?.name;
}

const first = namespaceShardReport(report('first shard test', 'first source', 'm1'), 'shard-001');
const second = namespaceShardReport(report('second shard test', 'second source', 'm2'), 'shard-002');

assert.deepEqual(Object.keys(first.testFiles), ['shard-001:tests/shared.test.ts']);
assert.deepEqual(Object.keys(second.testFiles), ['shard-002:tests/shared.test.ts']);
assert.deepEqual(first.files['src/example.ts'].mutants[0].coveredBy, ['shard-001:8']);
assert.deepEqual(first.files['src/example.ts'].mutants[0].killedBy, ['shard-001:8']);
assert.deepEqual(second.files['src/example.ts'].mutants[0].coveredBy, ['shard-002:8']);
assert.deepEqual(second.files['src/example.ts'].mutants[0].killedBy, ['shard-002:8']);
assert.equal(testNameById(first, first.files['src/example.ts'].mutants[0].killedBy[0]), 'first shard test');
assert.equal(testNameById(second, second.files['src/example.ts'].mutants[0].killedBy[0]), 'second shard test');

const malformed = report('first definition', 'source', 'm3');
malformed.testFiles['tests/shared.test.ts'].tests.push({ id: '8', name: 'conflicting definition' });
assert.throws(
  () => namespaceShardReport(malformed, 'shard-003'),
  /Conflicting definition for test id 8 within shard-003\./,
);

const auditPaths = shardPaths({ name: 'shard-003' });
const rerunPaths = shardPaths({ name: 'shard-003' }, true);
assert.equal(auditPaths.report, resolve('reports/mutation-shards/shard-003/mutation.json'));
assert.equal(auditPaths.metadata, resolve('reports/mutation-shards/shard-003/run.json'));
assert.equal(rerunPaths.report, resolve('reports/mutation-shards/shard-003/rerun/mutation.json'));
assert.equal(rerunPaths.metadata, resolve('reports/mutation-shards/shard-003/rerun/run.json'));
assert.equal(auditPaths.incremental, resolve('reports/mutation-shards/shard-003/incremental.json'));
assert.equal(rerunPaths.incremental, auditPaths.incremental);

assert.equal(parseArguments(['merge']).rerun, false);
assert.equal(parseArguments(['merge', '--rerun']).rerun, true);

console.log('PASS 17 assertions: cross-shard namespaces, reference resolution, conflict refusal, layer paths');
