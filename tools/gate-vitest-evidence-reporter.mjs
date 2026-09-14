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

function projectName(project) {
  return typeof project?.name === 'string' ? project.name : '';
}

function projectHash(project) {
  return typeof project?.hash === 'string' ? project.hash : projectName(project);
}

function execution(specification) {
  const file = resolve(specification.moduleId);
  const taskId = typeof specification.taskId === 'string' ? specification.taskId : file;
  return {
    executionId: `${projectHash(specification.project)}:${taskId}:${file}`,
    file,
    projectName: projectName(specification.project),
    taskId,
  };
}

function moduleEvidence(module) {
  const file = resolve(module.moduleId);
  const taskId = typeof module.id === 'string' ? module.id : file;
  const state = typeof module.state === 'function' ? module.state() : 'pending';
  const errors = typeof module.errors === 'function' ? module.errors() : [];
  return {
    executionId: `${projectHash(module.project)}:${taskId}:${file}`,
    file,
    projectName: projectName(module.project),
    state,
    errors: Array.isArray(errors) ? errors.map(normalizeError) : [],
  };
}

function requiredEnvironment(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0) throw new Error(`${name} is required by the gate evidence reporter.`);
  return value;
}

export default class GateVitestEvidenceReporter {
  constructor() {
    this.path = requiredEnvironment('DND_GATE_EVIDENCE_PATH');
    this.document = {
      version: 1,
      kind: requiredEnvironment('DND_GATE_KIND'),
      phase: requiredEnvironment('DND_GATE_PHASE'),
      phaseInvocationId: requiredEnvironment('DND_GATE_PHASE_INVOCATION_ID'),
      lifecycle: { onInit: false, onTestRunStart: false, onTestRunEnd: false },
      passWithNoTests: false,
      specifications: [],
      modules: [],
      globalErrors: [],
      terminalReason: null,
      processTimeoutObserved: false,
      fatalReasons: [],
    };
  }

  onInit(vitest) {
    this.document.lifecycle.onInit = true;
    this.document.passWithNoTests = vitest?.config?.passWithNoTests === true;
  }

  onTestRunStart(specifications) {
    this.document.lifecycle.onTestRunStart = true;
    this.document.specifications = Array.isArray(specifications)
      ? specifications.map(execution).sort((left, right) => left.executionId.localeCompare(right.executionId))
      : [];
  }

  onTestRunEnd(modules, globalErrors, reason) {
    this.document.lifecycle.onTestRunEnd = true;
    this.document.modules = Array.isArray(modules)
      ? modules.map(moduleEvidence).sort((left, right) => left.executionId.localeCompare(right.executionId))
      : [];
    this.document.globalErrors = Array.isArray(globalErrors) ? globalErrors.map(normalizeError) : [];
    this.document.terminalReason = typeof reason === 'string' ? reason : null;
    this.write();
  }

  onProcessTimeout() {
    this.document.processTimeoutObserved = true;
    if (!this.document.fatalReasons.includes('vitest-process-timeout')) {
      this.document.fatalReasons.push('vitest-process-timeout');
    }
    this.write();
  }

  write() {
    mkdirSync(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, `${JSON.stringify(this.document, null, 2)}\n`, 'utf8');
    renameSync(temporary, this.path);
  }
}
