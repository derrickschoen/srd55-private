import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function unique(values) {
  return [...new Set(values)].sort();
}

function normalizeFile(path) {
  const absolute = resolve(path);
  const root = `${resolve(process.cwd())}/`;
  return absolute.startsWith(root) ? absolute.slice(root.length) : absolute;
}

function stringValue(record, key) {
  return isRecord(record) && typeof record[key] === 'string' ? record[key] : null;
}

function booleanValue(record, key) {
  return isRecord(record) && typeof record[key] === 'boolean' ? record[key] : null;
}

function arrayValue(record, key) {
  return isRecord(record) && Array.isArray(record[key]) ? record[key] : [];
}

export function readJsonArtifact(path) {
  try {
    return {
      value: JSON.parse(readFileSync(path, 'utf8')),
      read: { status: 'readable', error: null },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = isRecord(error) && typeof error.code === 'string' ? error.code : null;
    const status = code === 'ENOENT'
      ? 'missing'
      : error instanceof SyntaxError
        ? 'malformed'
        : 'unreadable';
    return { value: null, read: { status, error: message } };
  }
}

function artifactReason(prefix, read) {
  if (read.status === 'readable') return null;
  return `${prefix}-${read.status}`;
}

function normalizedError(error) {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack ?? null };
  if (isRecord(error)) {
    return {
      name: typeof error.name === 'string' ? error.name : 'Error',
      message: typeof error.message === 'string' ? error.message : JSON.stringify(error),
      stack: typeof error.stack === 'string' ? error.stack : null,
    };
  }
  return { name: 'Error', message: String(error), stack: null };
}

function aggregateFileOutcomes(executions) {
  const priority = { skipped: 0, passed: 1, unfinished: 2, failed: 3 };
  const byFile = new Map();
  for (const execution of executions) {
    const current = byFile.get(execution.file);
    if (current === undefined) {
      byFile.set(execution.file, {
        file: execution.file,
        status: execution.status,
        executionIds: [execution.executionId],
        reasons: [...execution.reasons],
      });
      continue;
    }
    current.executionIds.push(execution.executionId);
    current.reasons.push(...execution.reasons);
    if (priority[execution.status] > priority[current.status]) current.status = execution.status;
  }
  return [...byFile.values()]
    .map((outcome) => ({
      ...outcome,
      executionIds: unique(outcome.executionIds),
      reasons: unique(outcome.reasons),
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

function vitestStock(reporter) {
  if (!isRecord(reporter) || typeof reporter.success !== 'boolean' || !Array.isArray(reporter.testResults)) return null;
  const files = [];
  for (const result of reporter.testResults) {
    if (!isRecord(result) || typeof result.name !== 'string' || typeof result.status !== 'string' || !Array.isArray(result.assertionResults)) return null;
    const assertionFailed = result.assertionResults.some((assertion) => isRecord(assertion) && assertion.status === 'failed');
    files.push({
      file: normalizeFile(result.name),
      status: result.status === 'passed' && !assertionFailed ? 'passed' : 'failed',
    });
  }
  return { success: reporter.success, files };
}

function playwrightStock(reporter) {
  if (!isRecord(reporter) || !Array.isArray(reporter.suites) || !Array.isArray(reporter.errors) || !isRecord(reporter.stats)) return null;
  const byFile = new Map();
  const visit = (suite, inheritedFile) => {
    if (!isRecord(suite)) return false;
    const suiteFile = typeof suite.file === 'string' ? suite.file : inheritedFile;
    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        if (!isRecord(spec) || typeof spec.ok !== 'boolean') return false;
        const file = typeof spec.file === 'string' ? spec.file : suiteFile;
        if (typeof file !== 'string') return false;
        const normalized = normalizeFile(file);
        const status = spec.ok ? 'passed' : 'failed';
        if (status === 'failed' || byFile.get(normalized) === undefined) byFile.set(normalized, status);
      }
    }
    if (Array.isArray(suite.suites)) {
      for (const child of suite.suites) if (!visit(child, suiteFile)) return false;
    }
    return true;
  };
  for (const suite of reporter.suites) if (!visit(suite, undefined)) return null;
  return {
    success: reporter.errors.length === 0 && reporter.stats.unexpected === 0,
    files: [...byFile].map(([file, status]) => ({ file, status })).sort((left, right) => left.file.localeCompare(right.file)),
    errors: reporter.errors.map(normalizedError),
  };
}

function validEvidenceEnvelope(evidence) {
  return isRecord(evidence) &&
    evidence.version === 1 &&
    typeof evidence.kind === 'string' &&
    typeof evidence.phase === 'string' &&
    typeof evidence.phaseInvocationId === 'string';
}

function vitestEvidence(evidence, reporterReasons) {
  if (!isRecord(evidence) || !isRecord(evidence.lifecycle) ||
    !Array.isArray(evidence.specifications) || !Array.isArray(evidence.modules) ||
    !Array.isArray(evidence.globalErrors) || !Array.isArray(evidence.fatalReasons) ||
    typeof evidence.passWithNoTests !== 'boolean') return null;
  const scheduled = [];
  for (const item of evidence.specifications) {
    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string') return null;
    scheduled.push({ executionId: item.executionId, file: normalizeFile(item.file) });
  }
  const executions = [];
  const terminalIds = [];
  for (const item of evidence.modules) {
    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string' || typeof item.state !== 'string' || !Array.isArray(item.errors)) return null;
    const errors = item.errors.map(normalizedError);
    let status;
    const reasons = [];
    if (item.state === 'failed' || errors.length > 0) {
      status = 'failed';
      reasons.push('test-failed');
      terminalIds.push(item.executionId);
    } else if (item.state === 'passed') {
      status = 'passed';
      terminalIds.push(item.executionId);
    } else if (item.state === 'skipped') {
      status = 'skipped';
      terminalIds.push(item.executionId);
    } else if (item.state === 'queued' || item.state === 'pending') {
      status = 'unfinished';
      reasons.push('execution-unfinished');
      reporterReasons.push('execution-unfinished');
    } else {
      status = 'unfinished';
      reasons.push('invalid-module-state');
      reporterReasons.push('runner-invalid-terminal-state');
    }
    executions.push({ executionId: item.executionId, file: normalizeFile(item.file), status, reasons });
  }
  const globalErrors = evidence.globalErrors.map(normalizedError);
  if (globalErrors.length > 0) reporterReasons.push('runner-global-error');
  if (evidence.terminalReason === 'interrupted') reporterReasons.push('runner-interrupted');
  else if (!['passed', 'failed'].includes(evidence.terminalReason)) reporterReasons.push('runner-invalid-terminal-state');
  if (evidence.terminalReason === 'failed' &&
    !executions.some((item) => item.status === 'failed') && globalErrors.length === 0) {
    reporterReasons.push('runner-unexplained-failure');
  }
  if (evidence.terminalReason === 'passed' && executions.some((item) => item.status === 'failed')) {
    reporterReasons.push('runner-evidence-inconsistent');
  }
  if (evidence.processTimeoutObserved === true || evidence.fatalReasons.includes('vitest-process-timeout')) {
    reporterReasons.push('vitest-process-timeout');
  }
  if (evidence.lifecycle.onTestRunEnd !== true) reporterReasons.push('terminal-callback-missing');
  if (scheduled.length === 0 && !(evidence.passWithNoTests === true && evidence.terminalReason === 'passed')) {
    reporterReasons.push('empty-run-not-allowed');
  }
  return {
    scheduled,
    executions,
    terminalIds,
    runStatus: typeof evidence.terminalReason === 'string' ? evidence.terminalReason : null,
    globalErrors,
    terminalCallbackObserved: evidence.lifecycle.onTestRunEnd === true,
    processTimeoutObserved: evidence.processTimeoutObserved === true,
  };
}

function playwrightEvidence(evidence, reporterReasons) {
  if (!isRecord(evidence) || !isRecord(evidence.lifecycle) ||
    !Array.isArray(evidence.discovered) || !Array.isArray(evidence.tests) ||
    !Array.isArray(evidence.globalErrors) || !Array.isArray(evidence.fatalReasons)) return null;
  const scheduled = [];
  for (const item of evidence.discovered) {
    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string') return null;
    scheduled.push({ executionId: item.executionId, file: normalizeFile(item.file) });
  }
  const executions = [];
  const terminalIds = [];
  for (const item of evidence.tests) {
    if (!isRecord(item) || typeof item.executionId !== 'string' || typeof item.file !== 'string' ||
      typeof item.onTestBeginObserved !== 'boolean' || typeof item.onTestEndObserved !== 'boolean') return null;
    let status;
    const reasons = [];
    const ended = item.onTestEndObserved === true;
    if (!ended || item.status === 'interrupted') {
      status = 'unfinished';
      reasons.push('execution-unfinished');
      reporterReasons.push('execution-unfinished');
    } else if (item.status === 'skipped' && item.expectedStatus === 'skipped') {
      status = 'skipped';
      terminalIds.push(item.executionId);
    } else if (item.status === 'skipped') {
      status = 'unfinished';
      reasons.push('synthesized-nonexecution');
      reporterReasons.push('execution-unfinished');
    } else if (item.outcome === 'flaky') {
      status = 'passed';
      terminalIds.push(item.executionId);
    } else if (item.outcome === 'unexpected' || item.status === 'timedOut') {
      status = 'failed';
      reasons.push(item.status === 'timedOut' ? 'test-timed-out' : 'test-failed');
      terminalIds.push(item.executionId);
    } else if (item.status === 'failed' && item.outcome === 'expected') {
      status = 'passed';
      terminalIds.push(item.executionId);
    } else if (item.status === 'passed' && item.outcome === 'expected') {
      status = 'passed';
      terminalIds.push(item.executionId);
    } else {
      status = 'unfinished';
      reasons.push('invalid-test-state');
      reporterReasons.push('runner-invalid-terminal-state');
    }
    executions.push({ executionId: item.executionId, file: normalizeFile(item.file), status, reasons });
  }
  const globalErrors = evidence.globalErrors.map(normalizedError);
  if (globalErrors.length > 0) reporterReasons.push('runner-global-error');
  if (evidence.fullResultStatus === 'timedout') reporterReasons.push('runner-global-timeout');
  else if (evidence.fullResultStatus === 'interrupted') reporterReasons.push('runner-interrupted');
  else if (!['passed', 'failed'].includes(evidence.fullResultStatus)) reporterReasons.push('runner-invalid-terminal-state');
  if (evidence.fullResultStatus === 'failed' &&
    !executions.some((item) => item.status === 'failed') && globalErrors.length === 0) {
    reporterReasons.push('runner-unexplained-failure');
  }
  if (evidence.fullResultStatus === 'passed' && executions.some((item) => item.status === 'failed')) {
    reporterReasons.push('runner-evidence-inconsistent');
  }
  if (evidence.lifecycle.onExit !== true) reporterReasons.push('terminal-callback-missing');
  return {
    scheduled,
    executions,
    terminalIds,
    runStatus: typeof evidence.fullResultStatus === 'string' ? evidence.fullResultStatus : null,
    globalErrors,
    terminalCallbackObserved: evidence.lifecycle.onExit === true,
    processTimeoutObserved: false,
  };
}

function crossCheck(stock, normalizedEvidence, reporterReasons) {
  if (stock === null || normalizedEvidence === null) return;
  const outcomes = aggregateFileOutcomes(normalizedEvidence.executions);
  const evidenceHasFailure = outcomes.some((outcome) => outcome.status === 'failed' || outcome.status === 'unfinished');
  if ((stock.success === true && (evidenceHasFailure ||
    (normalizedEvidence.runStatus === 'failed' && normalizedEvidence.globalErrors.length === 0))) ||
    (stock.success === false && !evidenceHasFailure && normalizedEvidence.runStatus === 'passed' && normalizedEvidence.globalErrors.length === 0)) {
    reporterReasons.push('stock-evidence-mismatch');
  }
  const stockByFile = new Map(stock.files.map((file) => [file.file, file.status]));
  const evidenceFiles = outcomes.map((outcome) => outcome.file);
  if (JSON.stringify(unique(stock.files.map((file) => file.file))) !== JSON.stringify(unique(evidenceFiles))) {
    reporterReasons.push('stock-evidence-mismatch');
    return;
  }
  for (const outcome of outcomes) {
    const stockStatus = stockByFile.get(outcome.file);
    if ((outcome.status === 'failed' && stockStatus !== 'failed') ||
      ((outcome.status === 'passed' || outcome.status === 'skipped') && stockStatus !== 'passed')) {
      reporterReasons.push('stock-evidence-mismatch');
    }
  }
}

export function classifyPhase(input) {
  const reporterReasons = [];
  const stockReason = artifactReason('stock-report', input.stockRead);
  if (stockReason !== null) reporterReasons.push(stockReason);
  const evidenceReason = artifactReason('evidence-sidecar', input.evidenceRead);
  if (evidenceReason !== null) reporterReasons.push(evidenceReason);

  let stock = null;
  if (input.stockRead.status === 'readable') {
    stock = input.kind === 'vitest' ? vitestStock(input.reporter) : playwrightStock(input.reporter);
    if (stock === null) reporterReasons.push('stock-report-malformed');
  }

  let native = null;
  if (input.evidenceRead.status === 'readable') {
    if (!validEvidenceEnvelope(input.evidence)) {
      reporterReasons.push('evidence-sidecar-malformed');
    } else {
      const provenanceMatches = input.evidence.phaseInvocationId === input.phaseInvocationId &&
        input.evidence.kind === input.kind && input.evidence.phase === input.phase;
      if (input.evidence.phaseInvocationId !== input.phaseInvocationId) reporterReasons.push('evidence-invocation-mismatch');
      if (input.evidence.kind !== input.kind) reporterReasons.push('evidence-kind-mismatch');
      if (input.evidence.phase !== input.phase) reporterReasons.push('evidence-phase-mismatch');
      if (provenanceMatches) {
        native = input.kind === 'vitest'
          ? vitestEvidence(input.evidence, reporterReasons)
          : playwrightEvidence(input.evidence, reporterReasons);
        if (native === null) reporterReasons.push('evidence-sidecar-malformed');
      }
    }
  }

  if (input.kind === 'playwright' && stock?.errors?.length > 0) reporterReasons.push('runner-global-error');
  crossCheck(stock, native, reporterReasons);

  const scheduledExecutionIds = unique(native?.scheduled.map((item) => item.executionId) ?? []);
  const reportedExecutionIds = unique(native?.terminalIds ?? []);
  const scheduledFiles = unique(native?.scheduled.map((item) => item.file) ?? []);
  const evidenceRequestedFiles = scheduledFiles;
  const requestedFiles = input.requestedFiles === null || input.requestedFiles === undefined
    ? evidenceRequestedFiles
    : unique(input.requestedFiles.map(normalizeFile));
  const reportedFiles = unique((native?.executions ?? [])
    .filter((item) => native.terminalIds.includes(item.executionId))
    .map((item) => item.file));
  const missingExecutionIds = scheduledExecutionIds.filter((id) => !reportedExecutionIds.includes(id));
  const unexpectedExecutionIds = reportedExecutionIds.filter((id) => !scheduledExecutionIds.includes(id));
  let discoveryStatus = 'complete';
  if (native === null) discoveryStatus = 'uncertified';
  else if (missingExecutionIds.length > 0 || unexpectedExecutionIds.length > 0 ||
    JSON.stringify(requestedFiles) !== JSON.stringify(scheduledFiles)) discoveryStatus = 'failed';

  const executions = native?.executions ?? [];
  const existingIds = new Set(executions.map((item) => item.executionId));
  for (const item of native?.scheduled ?? []) {
    if (!existingIds.has(item.executionId)) {
      executions.push({ executionId: item.executionId, file: item.file, status: 'unfinished', reasons: ['execution-unfinished'] });
      reporterReasons.push('execution-unfinished');
    }
  }
  const fileOutcomes = aggregateFileOutcomes(executions);
  const attributableFailures = fileOutcomes.filter((outcome) => outcome.status === 'failed').map((outcome) => outcome.file);

  const processReasons = [];
  if (input.spawnError !== null) processReasons.push(`spawn-error-${input.spawnError.code ?? 'unknown'}`);
  if (input.signal !== null) processReasons.push(`process-signal-${input.signal}`);
  if (input.exitCode === null) processReasons.push('process-exit-missing');
  else if (input.exitCode !== 0 && !(input.exitCode === 1 && attributableFailures.length > 0)) {
    processReasons.push(`process-exit-${input.exitCode}`);
  }
  const processStatus = processReasons.length > 0
    ? 'failed'
    : input.exitCode === 1 && attributableFailures.length > 0
      ? 'ordinary-file-failure'
      : 'passed';

  return {
    ...input,
    process: {
      status: processStatus,
      exitCode: input.exitCode,
      signal: input.signal,
      spawnError: input.spawnError,
      reasons: unique(processReasons),
    },
    reporterOutcome: {
      status: reporterReasons.length === 0 ? 'passed' : 'failed',
      runStatus: native?.runStatus ?? null,
      success: stock?.success ?? null,
      terminalCallbackObserved: native?.terminalCallbackObserved ?? false,
      processTimeoutObserved: native?.processTimeoutObserved ?? false,
      globalErrors: native?.globalErrors ?? [],
      reasons: unique(reporterReasons),
    },
    discovery: {
      status: discoveryStatus,
      requestedExecutionIds: scheduledExecutionIds,
      scheduledExecutionIds,
      reportedExecutionIds,
      requestedFiles,
      reportedFiles,
      missingExecutionIds,
      unexpectedExecutionIds,
    },
    fileOutcomes,
  };
}

function phaseFailures(phase) {
  const failures = [];
  if (phase.process.status === 'failed') failures.push({ phase: phase.phase, domain: 'process', reasons: phase.process.reasons });
  if (phase.reporterOutcome.status === 'failed') failures.push({ phase: phase.phase, domain: 'reporter', reasons: phase.reporterOutcome.reasons });
  if (phase.discovery.status !== 'complete') {
    const reasons = phase.discovery.status === 'uncertified'
      ? ['discovery-uncertified']
      : ['discovery-mismatch'];
    failures.push({ phase: phase.phase, domain: 'discovery', reasons });
  }
  return failures;
}

export function reduceGateVerdict(initial, retry) {
  const initialFailed = initial.fileOutcomes.filter((outcome) => outcome.status === 'failed').map((outcome) => outcome.file);
  const retryPassed = retry === null
    ? []
    : retry.fileOutcomes.filter((outcome) => outcome.status === 'passed').map((outcome) => outcome.file);
  const passedOnRetry = unique(initialFailed.filter((file) => retryPassed.includes(file)));
  const failedFiles = unique(initialFailed.filter((file) => !passedOnRetry.includes(file)));
  const failures = [...phaseFailures(initial), ...(retry === null ? [] : phaseFailures(retry))];
  return {
    status: failedFiles.length === 0 && failures.length === 0 ? 'passed' : 'failed',
    passedOnRetry,
    failedFiles,
    phaseFailures: failures,
  };
}
