import { appendFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

const phase = process.env.DND_GATE_PHASE;
const kind = process.env.DND_GATE_KIND;
const scenario = process.env.DND_GATE_STUB_SCENARIO;
const primaryFile = process.env.DND_GATE_STUB_FILE;
const secondaryFile = process.env.DND_GATE_STUB_UNRELATED_FILE;
const logPath = process.env.DND_GATE_STUB_LOG;
if (phase === undefined || kind === undefined || scenario === undefined || primaryFile === undefined || secondaryFile === undefined || logPath === undefined) {
  throw new Error('Fake gate command is missing its required environment.');
}

const argumentsList = process.argv.slice(2);
appendFileSync(logPath, `${JSON.stringify({ type: 'command', kind, phase, arguments: argumentsList })}\n`);

const initiallyFailing = scenario === 'failed' ||
  scenario === 'flaky' ||
  scenario === 'missing_retry' ||
  scenario === 'global_then_pass' ||
  scenario === 'stock_missing' ||
  scenario === 'process_timeout' ||
  scenario === 'playwright_timeout' ||
  scenario === 'ordinary_retry' ||
  scenario === 'partial_retry';
const selectedFiles = phase === 'initial'
  ? [primaryFile, secondaryFile]
  : [primaryFile];
const resultFor = (file) => {
  if (phase === 'retry') return scenario === 'failed' ? 'failed' : 'passed';
  if (scenario === 'partial_retry') return 'failed';
  return file === primaryFile && initiallyFailing ? 'failed' : 'passed';
};

const invocationId = process.env.DND_GATE_PHASE_INVOCATION_ID;
const evidencePath = process.env.DND_GATE_EVIDENCE_PATH;
const globalErrors = scenario === 'global_then_pass' && phase === 'initial'
  ? [{ name: 'Error', message: 'intentional global error' }]
  : [];

if (kind === 'vitest') {
  const outputArgument = argumentsList.find((argument) => argument.startsWith('--outputFile.json='));
  if (outputArgument === undefined) throw new Error('Fake Vitest command received no JSON output path.');
  const outputPath = outputArgument.slice('--outputFile.json='.length);
  if (scenario !== 'stock_missing') {
    const testResults = scenario === 'missing_retry' && phase === 'retry'
      ? []
      : selectedFiles.map((file) => ({
        name: resolve(file),
        status: resultFor(file),
        assertionResults: [{ status: resultFor(file), duration: 1 }],
        startTime: 1,
        endTime: 2,
      }));
    writeFileSync(outputPath, JSON.stringify({
      success: testResults.every((result) => result.status === 'passed'),
      numFailedTestSuites: testResults.filter((result) => result.status === 'failed').length,
      numFailedTests: testResults.filter((result) => result.status === 'failed').length,
      testResults,
    }));
  }
  if (evidencePath !== undefined && invocationId !== undefined && scenario !== 'sidecar_missing') {
    const modules = scenario === 'missing_retry' && phase === 'retry'
      ? []
      : selectedFiles.map((file) => ({
        executionId: `unit:${file}:${file}`,
        file: resolve(file),
        projectName: 'unit',
        state: resultFor(file),
        errors: [],
      }));
    writeFileSync(evidencePath, JSON.stringify({
      version: 1,
      kind,
      phase,
      phaseInvocationId: invocationId,
      lifecycle: { onInit: true, onTestRunStart: true, onTestRunEnd: true },
      passWithNoTests: false,
      specifications: selectedFiles.map((file) => ({
        executionId: `unit:${file}:${file}`,
        file: resolve(file),
        projectName: 'unit',
        taskId: file,
      })),
      modules,
      globalErrors,
      terminalReason: selectedFiles.some((file) => resultFor(file) === 'failed') ? 'failed' : 'passed',
      processTimeoutObserved: scenario === 'process_timeout' && phase === 'initial',
      fatalReasons: scenario === 'process_timeout' && phase === 'initial' ? ['vitest-process-timeout'] : [],
    }));
  }
} else if (kind === 'playwright') {
  const outputPath = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE;
  if (outputPath === undefined) throw new Error('Fake Playwright command received no JSON output path.');
  if (scenario !== 'stock_missing') {
    const rootDir = resolve('tests/browser');
    const specs = selectedFiles.map((file) => {
      const status = resultFor(file);
      return {
        title: `stub ${file}`,
        file: relative(rootDir, resolve(file)),
        ok: status === 'passed',
        tests: [{
          projectName: 'unit',
          expectedStatus: 'passed',
          status: status === 'passed' ? 'expected' : 'unexpected',
          results: [{ status, duration: 1 }],
        }],
      };
    });
    const failures = specs.filter((spec) => !spec.ok).length;
    writeFileSync(outputPath, JSON.stringify({
      config: { rootDir },
      suites: [{ title: 'stub suite', specs }],
      errors: globalErrors,
      stats: {
        startTime: new Date(0).toISOString(),
        duration: 1,
        expected: specs.length - failures,
        unexpected: failures,
        flaky: 0,
        skipped: 0,
      },
    }));
  }
  if (evidencePath !== undefined && invocationId !== undefined && scenario !== 'sidecar_missing') {
    const tests = selectedFiles.map((file) => {
      const status = resultFor(file);
      const timedOut = scenario === 'playwright_timeout' && phase === 'initial' && file === primaryFile;
      return {
        executionId: `unit:${file}:${file}`,
        file: resolve(file),
        projectName: 'unit',
        testId: file,
        status: timedOut ? 'timedOut' : status,
        outcome: status === 'passed' ? 'expected' : 'unexpected',
        expectedStatus: 'passed',
        onTestBeginObserved: true,
        onTestEndObserved: true,
        errors: status === 'failed' ? [{ name: 'Error', message: 'intentional failure' }] : [],
      };
    });
    writeFileSync(evidencePath, JSON.stringify({
      version: 1,
      kind,
      phase,
      phaseInvocationId: invocationId,
      lifecycle: { onBegin: true, onEnd: true, onExit: true },
      discovered: selectedFiles.map((file) => ({
        executionId: `unit:${file}:${file}`,
        file: resolve(file),
        projectName: 'unit',
        testId: file,
      })),
      tests,
      globalErrors,
      fullResultStatus: selectedFiles.some((file) => resultFor(file) === 'failed') ? 'failed' : 'passed',
      fatalReasons: [],
    }));
  }
} else {
  throw new Error(`Unknown fake gate kind: ${kind}`);
}

if (scenario === 'signal' && phase === 'initial') process.kill(process.pid, 'SIGTERM');
if (scenario === 'exit2' && phase === 'initial') process.exitCode = 2;
else if (scenario === 'late_exit1' && phase === 'initial') process.exitCode = 1;
else if (scenario === 'stock_missing' && phase === 'initial') process.exitCode = 0;
else if (scenario === 'sidecar_missing') process.exitCode = 0;
else process.exitCode = selectedFiles.some((file) => resultFor(file) === 'failed') ? 1 : 0;
