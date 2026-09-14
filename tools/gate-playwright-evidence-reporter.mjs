import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

function normalizeError(error) {
  if (error instanceof Error) return { name: error.name, message: error.message, stack: error.stack ?? null };
  if (error !== null && typeof error === 'object') {
    return {
      name: typeof error.name === 'string' ? error.name : 'Error',
      message: typeof error.message === 'string' ? error.message : String(error),
      stack: typeof error.stack === 'string' ? error.stack : null,
    };
  }
  return { name: 'Error', message: String(error), stack: null };
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new Error(`${name} is required by the gate evidence reporter.`);
  return value;
}

function projectName(test) {
  const project = typeof test?.parent?.project === 'function' ? test.parent.project() : null;
  return typeof project?.name === 'string' ? project.name : '';
}

function identity(test) {
  const file = resolve(test.location.file);
  const testId = typeof test.id === 'string' ? test.id : `${file}:${test.location.line}:${test.location.column}`;
  const project = projectName(test);
  return {
    executionId: `${project}:${testId}:${file}`,
    file,
    projectName: project,
    testId,
  };
}

export default class GatePlaywrightEvidenceReporter {
  constructor() {
    this.path = requiredEnvironment('DND_GATE_EVIDENCE_PATH');
    this.testEvidence = new Map();
    this.document = {
      version: 1,
      kind: requiredEnvironment('DND_GATE_KIND'),
      phase: requiredEnvironment('DND_GATE_PHASE'),
      phaseInvocationId: requiredEnvironment('DND_GATE_PHASE_INVOCATION_ID'),
      lifecycle: { onBegin: false, onEnd: false, onExit: false },
      discovered: [],
      tests: [],
      globalErrors: [],
      fullResultStatus: null,
      fatalReasons: [],
    };
  }

  ensureTest(test) {
    const discovered = identity(test);
    const existing = this.testEvidence.get(discovered.executionId);
    if (existing !== undefined) return existing;
    const created = {
      ...discovered,
      status: null,
      outcome: typeof test.outcome === 'function' ? test.outcome() : null,
      expectedStatus: typeof test.expectedStatus === 'string' ? test.expectedStatus : null,
      onTestBeginObserved: false,
      onTestEndObserved: false,
      errors: [],
    };
    this.testEvidence.set(discovered.executionId, created);
    return created;
  }

  onBegin(_config, suite) {
    this.document.lifecycle.onBegin = true;
    const tests = typeof suite?.allTests === 'function' ? suite.allTests() : [];
    this.document.discovered = Array.from(tests, (test) => identity(test))
      .sort((left, right) => left.executionId.localeCompare(right.executionId));
    for (const test of tests) this.ensureTest(test);
  }

  onTestBegin(test) {
    this.ensureTest(test).onTestBeginObserved = true;
  }

  onTestEnd(test, result) {
    const record = this.ensureTest(test);
    record.onTestEndObserved = true;
    record.status = typeof result?.status === 'string' ? result.status : null;
    record.outcome = typeof test.outcome === 'function' ? test.outcome() : record.outcome;
    record.expectedStatus = typeof test.expectedStatus === 'string' ? test.expectedStatus : record.expectedStatus;
    record.errors = Array.isArray(result?.errors) ? result.errors.map(normalizeError) : [];
  }

  onError(error) {
    this.document.globalErrors.push(normalizeError(error));
  }

  onEnd(result) {
    this.document.lifecycle.onEnd = true;
    this.document.fullResultStatus = typeof result?.status === 'string' ? result.status : null;
  }

  onExit() {
    this.document.lifecycle.onExit = true;
    this.document.tests = [...this.testEvidence.values()]
      .sort((left, right) => left.executionId.localeCompare(right.executionId));
    this.write();
  }

  write() {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(this.document, null, 2)}\n`, 'utf8');
    renameSync(temporary, this.path);
  }
}
