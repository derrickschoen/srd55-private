import { appendFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const phase = process.env.DND_GATE_PHASE;
const kind = process.env.DND_GATE_KIND;
const scenario = process.env.DND_GATE_STUB_SCENARIO;
const file = process.env.DND_GATE_STUB_FILE;
const logPath = process.env.DND_GATE_STUB_LOG;
if (phase === undefined || kind === undefined || scenario === undefined || file === undefined || logPath === undefined) {
  throw new Error('Fake gate command is missing its required environment.');
}

const argumentsList = process.argv.slice(2);
appendFileSync(logPath, `${JSON.stringify({ type: 'command', kind, phase, arguments: argumentsList })}\n`);
const passed = scenario === 'clean' ||
  ((scenario === 'flaky' || scenario === 'missing_retry') && phase === 'retry');
const absoluteFile = resolve(file);

if (kind === 'vitest') {
  const outputArgument = argumentsList.find((argument) => argument.startsWith('--outputFile.json='));
  if (outputArgument === undefined) throw new Error('Fake Vitest command received no JSON output path.');
  const outputPath = outputArgument.slice('--outputFile.json='.length);
  writeFileSync(outputPath, JSON.stringify({
    success: passed,
    numFailedTestSuites: passed ? 0 : 1,
    testResults: scenario === 'missing_retry' && phase === 'retry' ? [] : [{
      name: absoluteFile,
      status: passed ? 'passed' : 'failed',
      assertionResults: [{ status: passed ? 'passed' : 'failed' }],
    }],
  }));
} else if (kind === 'playwright') {
  const outputPath = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE;
  if (outputPath === undefined) throw new Error('Fake Playwright command received no JSON output path.');
  writeFileSync(outputPath, JSON.stringify({
    suites: [{
      title: file,
      file: absoluteFile,
      specs: [{
        title: 'stub case',
        file: absoluteFile,
        ok: passed,
        tests: [{
          expectedStatus: 'passed',
          status: passed ? 'expected' : 'unexpected',
          results: [{ status: passed ? 'passed' : 'failed' }],
        }],
      }],
    }],
    errors: [],
    stats: {
      startTime: new Date().toISOString(),
      duration: 1,
      expected: passed ? 1 : 0,
      unexpected: passed ? 0 : 1,
      flaky: 0,
      skipped: 0,
    },
  }));
} else {
  throw new Error(`Unknown fake gate kind: ${kind}`);
}

process.exitCode = passed ? 0 : 1;
