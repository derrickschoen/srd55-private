import {
  chromium,
  type Browser,
  type BrowserContext,
  type ConsoleMessage,
  type Download,
  type Locator,
  type Page,
} from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import type { PendingDecision } from '../../src/combat/encounter';
import { decodeSavedSessionFingerprint } from '../../src/vtt/session-persistence';
import { RehearsalTimings, rehearsalTimingBlock } from './timing';

const REHEARSAL_SEED = 20_260_824;
const APP_READY_TIMEOUT_MS = 180_000;
const UI_TIMEOUT_MS = 65_000;
const CLEANUP_TIMEOUT_MS = 10_000;
const CLICK_STEP_BUDGET_MS = 30_000;
const CLICK_ATTEMPT_TIMEOUT_MS = 5_000;
const CLICK_RETRY_DELAY_MS = 25;
const TRANSITION_STEP_BUDGET_MS = 30_000;
const ASSIGNMENT_STEP_BUDGET_MS = 30_000;
const TRAY_READ_STEP_BUDGET_MS = 30_000;
const ENCOUNTER_STATE_READ_BUDGET_MS = 30_000;
const TIMELINE_STEP_BUDGET_MS = 30_000;
const FORM_STEP_BUDGET_MS = 30_000;
const SAVE_MANAGER_STEP_BUDGET_MS = 30_000;
const EXPORT_STEP_BUDGET_MS = 60_000;
const DEFAULT_RUN_WATCHDOG_MS = 40 * 60 * 1_000;
const TURN_PULSE_MS = 10;
const ROUND_STALL_BUDGET_MS = 30_000;
const MAX_TURN_ATTEMPTS = 600;
const previewReadiness = new WeakMap<ChildProcess, Promise<string>>();
const REPRESENTATIVE_PARTY_NAMES = [
  'Mirel Ash',
  'Orin Reed',
  'Brann Vale',
  'Sera Dawn',
  'Tamsin Quill',
] as const;

const FINDING_CLASSES = [
  'page_console_error',
  'refusal',
  'selector_timeout',
  'turn_advance_stall',
  'tray_unresolved',
  'scripted_nudge',
  'watchdog_timeout',
  'skipped_dependency',
] as const;

type FindingClass = (typeof FINDING_CLASSES)[number];
type PhaseStatus = 'completed' | 'aborted' | 'skipped_dependency';

interface Finding {
  readonly sequence: number;
  readonly class: FindingClass;
  readonly phase: string;
  readonly step: string;
  readonly detail: string;
  readonly screenshot: string | null;
  readonly count: number;
}

interface PhaseResult {
  readonly name: string;
  readonly status: PhaseStatus;
  readonly detail: string;
}

interface ParsedOptions {
  readonly date: string;
  readonly run: number;
  readonly port: number;
  readonly watchdogMs: number;
  readonly scenario: 'default' | 'tpk-clean' | 'tpk-recovery';
}

interface SessionExport {
  readonly phase: string;
  readonly filename: string;
  readonly encounterCount: number;
  readonly parsed: boolean;
  readonly hasSessionRecord: boolean;
  readonly hasAlarm: boolean;
  readonly hasIgnition: boolean;
  readonly seed: number | null;
  readonly payloadBytes: number;
  readonly revisionCount: number;
  readonly format: string;
  readonly defeatConclusionCount: number;
  readonly deathSaveCount: number;
  readonly deathCount: number;
  readonly revivifyCount: number;
  readonly dmRevivalCount: number;
  readonly recoveryRedeathCount: number;
}

interface EncounterOutcome {
  readonly kind: 'victory' | 'defeat' | 'aborted';
  readonly round: number;
  readonly attempts: number;
}

interface TimelineProgress {
  previewListed: boolean;
  delayUsed: boolean;
  skipUsed: boolean;
  rewindUsed: boolean;
  continuedForward: boolean;
  rewindRound: number | null;
}

interface TpkRecoveryProgress {
  revivifyObserved: boolean;
  overrideTarget: string | null;
}

interface PendingDecisionSurface {
  readonly decisionId: string;
  readonly decisionKind: PendingDecision['kind'];
  readonly heading: string;
  readonly optionCount: number;
}

type AdventuringDayFlow =
  | { readonly kind: 'dungeon'; readonly roomCount: 4 }
  | { readonly kind: 'vane_warren'; readonly name: string; readonly roomCount: 1 | 3 };

interface AdventuringDayMarker {
  readonly room: number;
  readonly text: string;
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof globalThis.setTimeout> | undefined;
  const timeout = new Promise<never>((_complete, reject) => {
    timer = globalThis.setTimeout(() => {
      reject(new Error(`${label} exceeded its ${String(timeoutMs)}ms timeout.`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) globalThis.clearTimeout(timer);
  }
}

function findingDedupeKey(
  findingClass: FindingClass,
  phase: string,
  step: string,
  detail: string,
): string {
  return JSON.stringify([findingClass, phase, step, detail.slice(0, 120)]);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordList(
  record: Readonly<Record<string, unknown>>,
  key: string,
): readonly Readonly<Record<string, unknown>>[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function positiveInteger(name: string, raw: string | undefined, fallback: number): number {
  const value = raw === undefined ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer; received ${JSON.stringify(raw)}.`);
  }
  return value;
}

function optionValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index !== -1) return argv[index + 1];
  return argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
}

function localDate(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = new Map(parts.map((part) => [part.type, part.value]));
  return `${byType.get('year') ?? '0000'}-${byType.get('month') ?? '00'}-${byType.get('day') ?? '00'}`;
}

async function nextRunIndex(date: string): Promise<number> {
  const directory = resolve('docs/rehearsal');
  await mkdir(directory, { recursive: true });
  const names = await readdir(directory);
  const prefix = `${date}-run-`;
  const used = names.flatMap((name): readonly number[] => {
    if (!name.startsWith(prefix) || !name.endsWith('.md')) return [];
    const value = Number(name.slice(prefix.length, -'.md'.length));
    return Number.isSafeInteger(value) && value > 0 ? [value] : [];
  });
  return Math.max(0, ...used) + 1;
}

async function parseOptions(argv: readonly string[]): Promise<ParsedOptions> {
  const date = optionValue(argv, '--date') ?? process.env.REHEARSAL_DATE ?? localDate();
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(date)) {
    throw new Error(`Rehearsal date must use YYYY-MM-DD; received ${JSON.stringify(date)}.`);
  }
  const rawRun = optionValue(argv, '--run') ?? process.env.REHEARSAL_RUN;
  const run = rawRun === undefined
    ? await nextRunIndex(date)
    : positiveInteger('run', rawRun, 1);
  const requestedPort = optionValue(argv, '--port') ?? process.env.PORT;
  const port = requestedPort === undefined
    ? 0
    : positiveInteger('PORT', requestedPort, 1);
  if (port > 65_535) throw new Error(`PORT must not exceed 65535; received ${String(port)}.`);
  const watchdogMs = positiveInteger(
    'REHEARSAL_WATCHDOG_MS',
    process.env.REHEARSAL_WATCHDOG_MS,
    DEFAULT_RUN_WATCHDOG_MS,
  );
  const requestedScenario = optionValue(argv, '--scenario') ?? 'default';
  if (
    requestedScenario !== 'default' &&
    requestedScenario !== 'tpk-clean' &&
    requestedScenario !== 'tpk-recovery'
  ) {
    throw new Error(`Unknown rehearsal scenario ${JSON.stringify(requestedScenario)}.`);
  }
  return { date, run, port, watchdogMs, scenario: requestedScenario };
}

class FindingsRecorder {
  readonly findings: Finding[] = [];
  readonly phases: PhaseResult[] = [];
  readonly seenRefusals = new Set<string>();
  readonly exports: SessionExport[] = [];
  readonly pendingScreenshots = new Map<string, Promise<void>>();
  readonly timings = new RehearsalTimings();
  screenshotCount = 0;
  page: Page | null = null;
  currentPhase = 'driver startup';
  currentStep = 'parse options';

  constructor(
    readonly date: string,
    readonly run: number,
    readonly runDirectory: string,
    readonly reportPath: string,
  ) {}

  attachPage(page: Page): void {
    this.page = page;
  }

  track(phase: string, step: string): void {
    this.timings.track(phase, step);
    this.currentPhase = phase;
    this.currentStep = step;
  }

  timingBlock(): string {
    return rehearsalTimingBlock(this.timings.rows());
  }

  outputBlock(): string {
    return `${this.timingBlock()}\n\n${this.summaryBlock()}`;
  }

  async flushScreenshots(): Promise<void> {
    while (this.pendingScreenshots.size > 0) {
      await Promise.allSettled([...this.pendingScreenshots.values()]);
    }
  }

  add(
    findingClass: FindingClass,
    phase: string,
    step: string,
    detail: string,
    screenshot: string | null = null,
  ): void {
    const key = findingDedupeKey(findingClass, phase, step, detail);
    const duplicate = this.findings.findIndex((finding) =>
      findingDedupeKey(finding.class, finding.phase, finding.step, finding.detail) === key);
    if (duplicate !== -1) {
      const existing = this.findings[duplicate];
      if (existing === undefined) throw new Error('Finding dedupe index is missing.');
      this.findings.splice(duplicate, 1, {
        ...existing,
        screenshot: existing.screenshot ?? screenshot,
        count: existing.count + 1,
      });
      if (existing.screenshot === null && screenshot === null) this.captureFindingScreenshot(key, step);
      return;
    }
    this.findings.push({
      sequence: this.findings.length + 1,
      class: findingClass,
      phase,
      step,
      detail,
      screenshot,
      count: 1,
    });
    if (screenshot === null) this.captureFindingScreenshot(key, step);
  }

  private captureFindingScreenshot(key: string, label: string): void {
    if (this.page === null || this.pendingScreenshots.has(key)) return;
    const capture = screenshot(this.page, this, label)
      .then((path) => {
        if (path === null) return;
        const index = this.findings.findIndex((finding) =>
          findingDedupeKey(finding.class, finding.phase, finding.step, finding.detail) === key);
        const finding = this.findings[index];
        if (finding === undefined || finding.screenshot !== null) return;
        this.findings.splice(index, 1, { ...finding, screenshot: path });
      })
      .finally(() => {
        this.pendingScreenshots.delete(key);
      });
    this.pendingScreenshots.set(key, capture);
  }

  phase(name: string, status: PhaseStatus, detail: string): void {
    const existing = this.phases.findIndex((phase) => phase.name === name);
    const result = { name, status, detail };
    if (existing === -1) this.phases.push(result);
    else this.phases.splice(existing, 1, result);
  }

  counts(): Readonly<Record<FindingClass, number>> {
    return Object.fromEntries(FINDING_CLASSES.map((findingClass) => [
      findingClass,
      this.findings
        .filter((finding) => finding.class === findingClass)
        .reduce((total, finding) => total + finding.count, 0),
    ])) as unknown as Readonly<Record<FindingClass, number>>;
  }

  summaryBlock(): string {
    const completed = this.phases.filter((phase) => phase.status === 'completed');
    const aborted = this.phases.filter((phase) => phase.status === 'aborted');
    const skipped = this.phases.filter((phase) => phase.status === 'skipped_dependency');
    const counts = this.counts();
    const clean = aborted.length === 0 &&
      skipped.length === 0 &&
      counts.page_console_error === 0 &&
      counts.selector_timeout === 0 &&
      counts.turn_advance_stall === 0 &&
      counts.tray_unresolved === 0 &&
      counts.watchdog_timeout === 0;
    return [
      '## Summary',
      '',
      `Phases completed: ${String(completed.length)}${completed.length === 0 ? '' : ` — ${completed.map((phase) => phase.name).join(', ')}`}`,
      `Phases aborted: ${String(aborted.length)}${aborted.length === 0 ? '' : ` — ${aborted.map((phase) => phase.name).join(', ')}`}`,
      `Phases skipped (dependency): ${String(skipped.length)}${skipped.length === 0 ? '' : ` — ${skipped.map((phase) => phase.name).join(', ')}`}`,
      'Finding counts by class:',
      '',
      ...FINDING_CLASSES.map((findingClass) =>
        `- ${findingClass}: ${String(counts[findingClass])}`),
      '',
      `Verdict: ${clean ? 'CLEAN RUN' : 'REHEARSAL FINDINGS'}`,
    ].join('\n');
  }

  async write(baseUrl: string): Promise<void> {
    const phaseRows = this.phases.length === 0
      ? '| (none) | aborted | Driver did not reach a named phase. |'
      : this.phases.map((phase) =>
          `| ${escapeTable(phase.name)} | ${phase.status} | ${escapeTable(phase.detail)} |`).join('\n');
    const findingRows = this.findings.length === 0
      ? 'No findings.'
      : this.findings.map((finding) => [
          `### ${String(finding.sequence)}. ${finding.class}`,
          '',
          `- Phase: ${finding.phase}`,
          `- Step: ${finding.step}`,
          `- Detail: ${finding.detail}`,
          ...(finding.count === 1 ? [] : [`- Count: ${String(finding.count)}`]),
          ...(finding.screenshot === null ? [] : [`- Screenshot: \`${finding.screenshot}\``]),
        ].join('\n')).join('\n\n');
    const exportRows = this.exports.length === 0
      ? '| (none) | false | false | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | (unknown) | (unknown) |'
      : this.exports.map((entry) =>
          `| ${escapeTable(entry.filename)} | ${String(entry.parsed)} | ${String(entry.hasSessionRecord)} | ${String(entry.encounterCount)} | ${String(entry.defeatConclusionCount)} | ${String(entry.deathSaveCount)} | ${String(entry.deathCount)} | ${String(entry.revivifyCount)} | ${String(entry.dmRevivalCount)} | ${String(entry.recoveryRedeathCount)} | ${String(entry.revisionCount)} | ${String(entry.payloadBytes)} | ${entry.seed === null ? '(unknown)' : String(entry.seed)} | ${escapeTable(entry.format)} |`).join('\n');
    const markdown = [
      `# Rehearsal run ${this.date} / ${String(this.run)}`,
      '',
      `- Built preview: ${baseUrl}`,
      `- Browser: Playwright Chromium, headless`,
      `- Run artifacts: \`${this.runDirectory}\``,
      '',
      '## Phases',
      '',
      '| Phase | Status | Detail |',
      '|---|---|---|',
      phaseRows,
      '',
      '## Session exports',
      '',
      '| File | Parses | Structured record | Encounters | Defeats | Death saves | Deaths | Revivify | DM revivals | Re-deaths | Revisions | Bytes | Seed | Format |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
      exportRows,
      '',
      this.timingBlock(),
      '',
      '## Findings',
      '',
      findingRows,
      '',
      this.summaryBlock(),
      '',
    ].join('\n');
    await mkdir(resolve('docs/rehearsal'), { recursive: true });
    await writeFile(this.reportPath, markdown, 'utf8');
  }
}

function escapeTable(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

async function startPreview(port: number, logPath: string): Promise<ChildProcess> {
  let readyOutput = '';
  let markReady: ((baseUrl: string) => void) | null = null;
  let markFailed: ((error: Error) => void) | null = null;
  const ready = new Promise<string>((complete, reject) => {
    markReady = complete;
    markFailed = reject;
  });
  const child = spawn(process.execPath, ['tools/serve.mjs', '--port', String(port)], {
    cwd: process.cwd(),
    // Vite derives import.meta.env.DEV from NODE_ENV. The surrounding runner
    // environment is intentionally development-flavoured, so pin the fresh
    // preview build to the same production mode a deploy build uses.
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => {
    void appendFile(logPath, chunk);
    process.stdout.write(chunk);
    readyOutput += chunk.toString('utf8');
    const match = /serve: fresh dist\/ available at (http:\/\/127\.0\.0\.1:\d+)/u.exec(readyOutput);
    if (match?.[1] !== undefined) markReady?.(match[1]);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    void appendFile(logPath, chunk);
    process.stderr.write(chunk);
  });
  child.once('error', (error) => markFailed?.(error));
  child.once('exit', (code) => {
    if (!readyOutput.includes('serve: fresh dist/ available at')) {
      markFailed?.(new Error(`Preview exited before becoming ready with code ${String(code)}.`));
    }
  });
  previewReadiness.set(child, ready);
  return child;
}

async function waitForPreview(child: ChildProcess): Promise<string> {
  const ready = previewReadiness.get(child);
  if (ready === undefined) throw new Error('Preview readiness was not registered.');
  return Promise.race([
    ready,
    wait(APP_READY_TIMEOUT_MS).then(() => {
      throw new Error('Preview did not become ready before the startup timeout.');
    }),
  ]);
}

async function stopPreview(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const exited = new Promise<void>((complete) => child.once('exit', () => complete()));
  await Promise.race([exited, wait(CLEANUP_TIMEOUT_MS)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function screenshot(
  page: Page,
  recorder: FindingsRecorder,
  label: string,
): Promise<string | null> {
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 70);
  recorder.screenshotCount += 1;
  const path = resolve(recorder.runDirectory, `${String(recorder.screenshotCount).padStart(3, '0')}-${safe || 'finding'}.jpg`);
  try {
    const startedAt = performance.now();
    await withTimeout(
      page.screenshot({ path, fullPage: true, type: 'jpeg', quality: 55, timeout: CLEANUP_TIMEOUT_MS }),
      CLEANUP_TIMEOUT_MS,
      `capture ${label} screenshot`,
    );
    recorder.timings.record('browser runtime', 'finding screenshot capture', performance.now() - startedAt);
    return path;
  } catch {
    return null;
  }
}

async function retryClick(locator: () => Locator, label: string): Promise<void> {
  const deadline = Date.now() + CLICK_STEP_BUDGET_MS;
  let attempts = 0;
  let lastError: unknown = new Error(`${label} was not attempted.`);
  while (Date.now() < deadline) {
    attempts += 1;
    const remaining = deadline - Date.now();
    const attemptTimeout = Math.min(CLICK_ATTEMPT_TIMEOUT_MS, remaining);
    const playwrightTimeout = Math.max(1, attemptTimeout - 250);
    try {
      await withTimeout(
        locator().click({ timeout: playwrightTimeout }),
        attemptTimeout,
        `${label} click attempt ${String(attempts)}`,
      );
      return;
    } catch (error: unknown) {
      lastError = error;
      const delay = Math.min(CLICK_RETRY_DELAY_MS, deadline - Date.now());
      if (delay > 0) await wait(delay);
    }
  }
  throw new Error(
    `${label} could not be clicked within ${String(CLICK_STEP_BUDGET_MS)}ms after ${String(attempts)} attempts. Last error: ${errorDetail(lastError)}`,
  );
}

async function retryClickUntil(
  locator: () => Locator,
  completed: () => Promise<boolean>,
  label: string,
  budgetMs = CLICK_STEP_BUDGET_MS,
): Promise<void> {
  const deadline = Date.now() + budgetMs;
  let attempts = 0;
  let lastError: unknown = new Error(`${label} was not attempted.`);
  while (Date.now() < deadline) {
    if (await completed()) return;
    attempts += 1;
    const remaining = deadline - Date.now();
    const attemptTimeout = Math.min(CLICK_ATTEMPT_TIMEOUT_MS, remaining);
    const playwrightTimeout = Math.max(1, attemptTimeout - 250);
    try {
      await withTimeout(
        locator().click({ timeout: playwrightTimeout }),
        attemptTimeout,
        `${label} click attempt ${String(attempts)}`,
      );
      lastError = new Error(`${label} was clicked, but its expected state was not observed.`);
      while (Date.now() < deadline) {
        if (await completed()) return;
        const delay = Math.min(CLICK_RETRY_DELAY_MS, deadline - Date.now());
        if (delay > 0) await wait(delay);
      }
      break;
    } catch (error: unknown) {
      lastError = error;
      const observationDeadline = Math.min(
        deadline,
        Date.now() + CLICK_ATTEMPT_TIMEOUT_MS,
      );
      while (Date.now() < observationDeadline) {
        if (await completed()) return;
        const delay = Math.min(CLICK_RETRY_DELAY_MS, observationDeadline - Date.now());
        if (delay > 0) await wait(delay);
      }
    }
  }
  throw new Error(
    `${label} did not reach its expected state within ${String(budgetMs)}ms after ${String(attempts)} attempts. Last error: ${errorDetail(lastError)}`,
  );
}

function remainingStepBudget(deadline: number, label: string): number {
  const remaining = deadline - Date.now();
  if (remaining < 1) throw new Error(`${label} exceeded its hard step budget.`);
  return remaining;
}

async function readAdventuringDayMarker(
  page: Page,
  flow: AdventuringDayFlow,
): Promise<AdventuringDayMarker> {
  const surface = await withTimeout(page.evaluate(() => {
    const statuses = Array.from(document.querySelectorAll<HTMLElement>('.adventuring-day-status'))
      .filter((status) => status.checkVisibility());
    const status = statuses[0];
    return {
      count: statuses.length,
      rawRoom: status?.dataset.room ?? null,
      text: status?.innerText.trim() ?? '',
    };
  }), TRANSITION_STEP_BUDGET_MS, 'read adventuring-day marker');
  if (surface.count !== 1) {
    throw new Error(
      `Driver DOM contract violation: expected exactly one visible .adventuring-day-status, found ${String(surface.count)}.`,
    );
  }
  const { rawRoom, text } = surface;
  if (rawRoom === null) {
    throw new Error(
      'Driver DOM contract violation: visible .adventuring-day-status is missing data-room.',
    );
  }
  if (!/^[1-9]\d*$/u.test(rawRoom)) {
    throw new Error(
      `Driver DOM contract violation: .adventuring-day-status data-room=${JSON.stringify(rawRoom)} is not a positive integer.`,
    );
  }
  const room = Number(rawRoom);
  const expectedText = flow.kind === 'dungeon'
    ? `Adventuring day — room ${String(room)} of ${String(flow.roomCount)} · 2024 rules`
    : `${flow.name} — encounter ${String(room)} of ${String(flow.roomCount)} · 2024 rules`;
  if (text !== expectedText) {
    throw new Error(
      `Driver DOM contract violation: data-room=${rawRoom}, but the visible status was ${JSON.stringify(text)}; expected ${JSON.stringify(expectedText)}.`,
    );
  }
  return { room, text };
}

async function adventuringDayReachedRoom(
  page: Page,
  flow: AdventuringDayFlow,
  expectedRoom: number,
): Promise<boolean> {
  const marker = await readAdventuringDayMarker(page, flow);
  if (marker.room > expectedRoom) {
    throw new Error(
      `Driver room-transition violation: expected room ${String(expectedRoom)}, but the visible status advanced to room ${String(marker.room)}.`,
    );
  }
  return marker.room === expectedRoom;
}

async function waitForAdventuringDayRoom(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  step: string,
  flow: AdventuringDayFlow,
  expectedRoom: number,
): Promise<boolean> {
  if (!await waitVisible(
    page,
    recorder,
    phase,
    step,
    page.locator('.adventuring-day-status'),
    TRANSITION_STEP_BUDGET_MS,
  )) return false;
  try {
    const marker = await readAdventuringDayMarker(page, flow);
    if (marker.room === expectedRoom) return true;
    const image = await screenshot(page, recorder, step);
    recorder.add(
      'selector_timeout',
      phase,
      step,
      `Driver room-state mismatch: expected room ${String(expectedRoom)}, found room ${String(marker.room)} in ${JSON.stringify(marker.text)}.`,
      image,
    );
    return false;
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, step);
    recorder.add('selector_timeout', phase, step, errorDetail(error), image);
    return false;
  }
}

async function locatorIsVisible(locator: () => Locator, label: string): Promise<boolean> {
  return withTimeout(locator().isVisible(), ENCOUNTER_STATE_READ_BUDGET_MS, label);
}

function skipDependency(
  recorder: FindingsRecorder,
  phase: string,
  prerequisite: string,
): void {
  const detail = `Skipped because prerequisite phase ${prerequisite} did not complete.`;
  recorder.track(phase, 'skip unmet dependency');
  recorder.add('skipped_dependency', phase, 'prerequisite phase', detail);
  recorder.phase(phase, 'skipped_dependency', detail);
}

async function waitVisible(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  step: string,
  locator: Locator,
  timeout = UI_TIMEOUT_MS,
): Promise<boolean> {
  recorder.track(phase, step);
  try {
    await withTimeout(
      locator.first().waitFor({ state: 'visible', timeout }),
      timeout,
      step,
    );
    return true;
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, step);
    recorder.add('selector_timeout', phase, step, errorDetail(error), image);
    return false;
  }
}

function attachPageFindingCapture(page: Page, recorder: FindingsRecorder): void {
  page.on('pageerror', (error) => {
    recorder.add('page_console_error', recorder.currentPhase, 'pageerror', errorDetail(error));
  });
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const location = message.location();
    const source = location.url === '' ? '' : ` (${location.url}:${String(location.lineNumber)})`;
    recorder.add('page_console_error', recorder.currentPhase, 'console.error', `${message.text()}${source}`);
  });
}

async function captureBrowserRuntimeTimings(page: Page, recorder: FindingsRecorder): Promise<void> {
  const telemetry = await page.locator('.dm-encounter').first().evaluate((node) => ({
    flushCount: Number(node.dataset.persistenceFlushCount ?? 0),
    flushTotalMs: Number(node.dataset.persistenceFlushTotalMs ?? 0),
    flushMaximumMs: Number(node.dataset.persistenceFlushMaximumMs ?? 0),
    renderCount: Number(node.dataset.renderCount ?? 0),
    renderTotalMs: Number(node.dataset.renderTotalMs ?? 0),
    renderMaximumMs: Number(node.dataset.renderMaximumMs ?? 0),
    coalescedSnapshotCount: Number(node.dataset.coalescedSnapshotCount ?? 0),
  })).catch(() => null);
  if (telemetry === null) return;
  if (Number.isSafeInteger(telemetry.flushCount) && telemetry.flushCount > 0) {
    recorder.timings.record(
      'browser runtime',
      'IndexedDB flush acknowledgement',
      telemetry.flushTotalMs,
      telemetry.flushCount,
      telemetry.flushMaximumMs,
    );
  }
  if (Number.isSafeInteger(telemetry.renderCount) && telemetry.renderCount > 0) {
    recorder.timings.record(
      'browser runtime',
      'stable DOM render',
      telemetry.renderTotalMs,
      telemetry.renderCount,
      telemetry.renderMaximumMs,
    );
  }
  if (Number.isSafeInteger(telemetry.coalescedSnapshotCount) && telemetry.coalescedSnapshotCount > 0) {
    recorder.timings.record(
      'browser runtime',
      'snapshots coalesced before render',
      0,
      telemetry.coalescedSnapshotCount,
      0,
    );
  }
}

async function captureRefusals(page: Page, recorder: FindingsRecorder, phase: string): Promise<void> {
  recorder.track(phase, 'scan refusal notices after turn pulse');
  const refusals = await withTimeout(page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('.dm-decision-refusal')).map((refusal) => ({
      text: refusal.textContent?.trim() ?? '(empty refusal)',
      code: refusal.dataset.refusalCode ?? null,
      category: refusal.dataset.refusalCategory ?? null,
    }))), TRAY_READ_STEP_BUDGET_MS, 'read refusal surfaces');
  let capturedFinding = false;
  for (const { text, code, category } of refusals) {
    const key = `${phase}:${code ?? ''}:${category ?? ''}:${text}`;
    if (recorder.seenRefusals.has(key)) continue;
    recorder.seenRefusals.add(key);
    capturedFinding = true;
    recorder.add(
      'refusal',
      phase,
      'refusal surfaced',
      `${code === null ? '' : `boundary ${code}: `}${category === null ? '' : `category ${category}: `}${text}`,
    );
  }
  if (capturedFinding) await recorder.flushScreenshots();
}

async function resolveDecisionTray(page: Page, recorder: FindingsRecorder, phase: string): Promise<number | null> {
  recorder.track(phase, 'resolve decision tray after turn pulse');
  let resolved = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const surface = await pendingDecisionSurface(page);
    if (surface === null) return resolved;
    const entry = page.locator(
      `.dm-decision-entry[data-entry-kind="pending"][data-decision-id=${JSON.stringify(surface.decisionId)}]`,
    );
    if (surface.optionCount === 0) {
      recorder.add(
        'tray_unresolved',
        phase,
        'resolve decision tray entry',
        `${surface.heading} had no offered option.`,
      );
      return null;
    }
    try {
      switch (surface.decisionKind) {
        case 'adjudication_prompt':
          await entry.getByLabel('DM override hit point delta').fill('0');
          break;
        case 'reaction_offer':
        case 'death_save':
        case 'legendary_action_window':
        case 'legendary_resistance':
          break;
        default: {
          const exhaustive: never = surface.decisionKind;
          throw new Error(`Unhandled pending-decision kind ${String(exhaustive)}.`);
        }
      }
      await retryClickUntil(
        () => entry.getByRole('button').first(),
        async () => await page.evaluate((expectedDecisionId) =>
          Array.from(document.querySelectorAll<HTMLElement>(
            '.dm-decision-entry[data-entry-kind="pending"]',
          )).every((candidate) => candidate.dataset.decisionId !== expectedDecisionId), surface.decisionId),
        `resolve decision tray entry ${surface.heading}`,
      );
      resolved += 1;
      await wait(20);
    } catch (error: unknown) {
      recorder.add(
        'tray_unresolved',
        phase,
        'resolve decision tray entry',
        `${surface.heading}: ${errorDetail(error)}`,
      );
      return null;
    }
  }
  recorder.add(
    'tray_unresolved',
    phase,
    'resolve decision tray entry',
    'Decision tray still had pending entries after 20 first-option resolutions.',
  );
  return null;
}

function decodePendingDecisionKind(kind: string | null): PendingDecision['kind'] {
  switch (kind) {
    case 'reaction_offer':
    case 'death_save':
    case 'legendary_action_window':
    case 'legendary_resistance':
    case 'adjudication_prompt':
      return kind;
    default:
      throw new Error(`Decision tray entry exposed unknown pending-decision kind ${JSON.stringify(kind)}.`);
  }
}

async function pendingDecisionSurface(page: Page): Promise<PendingDecisionSurface | null> {
  const raw = await withTimeout(page.evaluate(() => {
    const entry = document.querySelector<HTMLElement>(
      '.dm-decision-entry[data-entry-kind="pending"]',
    );
    if (entry === null) return null;
    return {
      decisionId: entry.dataset.decisionId ?? null,
      decisionKind: entry.dataset.decisionKind ?? null,
      heading: entry.querySelector('h3')?.textContent?.trim() ?? 'unnamed tray entry',
      optionCount: entry.querySelectorAll('button').length,
    };
  }), TRAY_READ_STEP_BUDGET_MS, 'read pending-decision surface');
  if (raw === null) return null;
  if (raw.decisionId === null) {
    throw new Error('Decision tray entry omitted its decision id.');
  }
  return {
    decisionId: raw.decisionId,
    decisionKind: decodePendingDecisionKind(raw.decisionKind),
    heading: raw.heading,
    optionCount: raw.optionCount,
  };
}

async function pauseEncounter(page: Page, deadline: number): Promise<void> {
  const pause = await page.locator('[data-pause]').first().getAttribute('data-pause', {
    timeout: remainingStepBudget(deadline, 'assign algorithm controllers'),
  });
  if (pause === 'interrupted') return;
  const interrupt = page.getByRole('button', { name: 'Interrupt', exact: true });
  if (await withTimeout(
    interrupt.count(),
    remainingStepBudget(deadline, 'find interrupt control'),
    'find interrupt control',
  ) > 0) {
    await interrupt.click({ timeout: remainingStepBudget(deadline, 'interrupt encounter') });
    await page.locator('[data-pause="interrupted"]').waitFor({
      state: 'visible',
      timeout: remainingStepBudget(deadline, 'interrupt encounter'),
    });
  }
}

async function resumeEncounter(page: Page, deadline: number): Promise<void> {
  const pause = await page.locator('[data-pause]').first().getAttribute('data-pause', {
    timeout: remainingStepBudget(deadline, 'assign algorithm controllers'),
  });
  if (pause === 'none') return;
  const resume = page.locator('.dm-controls').getByRole('button', { name: 'Resume', exact: true });
  if (await withTimeout(
    resume.count(),
    remainingStepBudget(deadline, 'find resume control'),
    'find resume control',
  ) > 0) {
    const revision = await renderedSessionRevision(
      page,
      remainingStepBudget(deadline, 'read revision before encounter resume'),
    );
    await resume.click({ timeout: remainingStepBudget(deadline, 'resume encounter') });
    await waitForRenderedRevisionAfter(
      page,
      revision,
      'encounter resume',
      remainingStepBudget(deadline, 'resume encounter'),
    );
    const renderedPause = await page.evaluate(() =>
      document.querySelector<HTMLElement>('[data-pause]')?.dataset.pause ?? null);
    if (renderedPause !== 'none') {
      throw new Error(`Encounter resume published pause state ${JSON.stringify(renderedPause)}.`);
    }
  }
}

async function renderedSessionRevision(
  page: Page,
  timeoutMs = ENCOUNTER_STATE_READ_BUDGET_MS,
): Promise<number> {
  const raw = await page.locator('.dm-encounter').first().getAttribute('data-session-revision', {
    timeout: timeoutMs,
  });
  const revision = Number(raw);
  if (!Number.isSafeInteger(revision) || revision < 1) {
    throw new Error(`DM surface exposed invalid session revision ${JSON.stringify(raw)}.`);
  }
  return revision;
}

async function waitForRenderedRevisionAfter(
  page: Page,
  revision: number,
  label: string,
  timeoutMs = ENCOUNTER_STATE_READ_BUDGET_MS,
): Promise<void> {
  await page.waitForFunction((previous) => {
    const raw = document.querySelector<HTMLElement>('.dm-encounter')?.dataset.sessionRevision;
    const current = Number(raw);
    return Number.isSafeInteger(current) && current > previous;
  }, revision, { timeout: timeoutMs }).catch((error: unknown) => {
    throw new Error(`${label} did not publish a newer durable DM surface: ${errorDetail(error)}`);
  });
}

async function assignAlgorithms(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  requiredCombatantNames: readonly string[] = [],
): Promise<boolean> {
  try {
    recorder.track(phase, 'assign algorithm controllers through UI');
    const deadline = Date.now() + ASSIGNMENT_STEP_BUDGET_MS;
    await pauseEncounter(page, deadline);
    for (let guard = 0; guard < 40; guard += 1) {
      const human = page.locator('.dm-controller-assignments select').filter({ has: page.locator('option:checked[value="human"]') });
      if (await withTimeout(
        human.count(),
        remainingStepBudget(deadline, 'read human controller assignments'),
        'read human controller assignments',
      ) === 0) break;
      const revision = await renderedSessionRevision(
        page,
        remainingStepBudget(deadline, 'read revision before controller assignment'),
      );
      await human.first().selectOption('algorithm', {
        timeout: remainingStepBudget(deadline, 'controller assignment'),
      });
      await waitForRenderedRevisionAfter(
        page,
        revision,
        'controller assignment',
        remainingStepBudget(deadline, 'controller assignment'),
      );
    }
    const selects = page.locator('.dm-controller-assignments select');
    const values = await withTimeout(
      selects.evaluateAll((nodes) => nodes.map((node) =>
        node instanceof HTMLSelectElement ? node.value : 'not-a-select')),
      remainingStepBudget(deadline, 'read assigned controller values'),
      'read assigned controller values',
    );
    if (values.length === 0 || values.some((value) => value !== 'algorithm')) {
      const image = await screenshot(page, recorder, 'assign-algorithm-controllers');
      recorder.add(
        'selector_timeout',
        phase,
        'assign algorithm controllers through UI',
        `Controller values after assignment: ${JSON.stringify(values)}.`,
        image,
      );
      return false;
    }
    for (const name of requiredCombatantNames) {
      const controller = page.getByLabel(`${name} controller`, { exact: true });
      if (await withTimeout(
        controller.count(),
        remainingStepBudget(deadline, `find ${name} controller`),
        `find ${name} controller`,
      ) !== 1 || await controller.inputValue({
        timeout: remainingStepBudget(deadline, `read ${name} controller`),
      }) !== 'algorithm') {
        const image = await screenshot(page, recorder, 'assign-algorithm-controllers');
        recorder.add(
          'selector_timeout',
          phase,
          'assign algorithm controllers through UI',
          `${name} was not uniquely assigned to the algorithm controller.`,
          image,
        );
        return false;
      }
    }
    await resumeEncounter(page, deadline);
    return true;
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, 'assign-algorithm-controllers');
    recorder.add(
      'selector_timeout',
      phase,
      'assign algorithm controllers through UI',
      errorDetail(error),
      image,
    );
    return false;
  }
}

async function roundOf(page: Page): Promise<number> {
  const raw = await page.locator('.dm-initiative-timeline').getAttribute('data-round', {
    timeout: ENCOUNTER_STATE_READ_BUDGET_MS,
  });
  const round = Number(raw);
  return Number.isSafeInteger(round) ? round : 0;
}

async function visibleEncounterOutcome(
  page: Page,
): Promise<'victory' | 'defeat' | 'mutual' | null> {
  const value = await withTimeout(
    page.evaluate(() => document.querySelector<HTMLElement>('[data-encounter-outcome]')
      ?.dataset.encounterOutcome ?? null),
    ENCOUNTER_STATE_READ_BUDGET_MS,
    'read encounter outcome',
  );
  return value === 'victory' || value === 'defeat' || value === 'mutual' ? value : null;
}

async function observeTimelinePreview(
  page: Page,
  progress: TimelineProgress,
  waitMs = 0,
): Promise<void> {
  if (progress.previewListed) return;
  const actualEvents = page.locator('.dm-next-event-preview [data-event-kind]');
  if (waitMs > 0) {
    await actualEvents.first().waitFor({ state: 'attached', timeout: waitMs }).catch(() => undefined);
  }
  if (await actualEvents.count() > 0) progress.previewListed = true;
}

async function pulseTurn(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  waitMs = TURN_PULSE_MS,
): Promise<void> {
  const endTurn = (): Locator => page.locator('.dm-pending-request').getByRole('button', {
    name: 'End turn',
    exact: true,
  }).first();
  for (let guard = 0; guard < 20; guard += 1) {
    let endTurnVisible = false;
    try {
      endTurnVisible = await locatorIsVisible(endTurn, 'check end-turn control visibility');
    } catch {
      // A decision surface can replace the pending request during a locator read.
    }
    if (endTurnVisible) {
      await retryClick(endTurn, 'end current turn');
      break;
    }
    const resolution = await resolveDecisionTray(page, recorder, phase);
    if (resolution === null) throw new Error('A decision tray entry remained unresolved.');
    if (resolution === 0) break;
  }
  await wait(waitMs);
}

async function playEncounter(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  observeProgress?: () => Promise<void>,
  turnPulseMs = TURN_PULSE_MS,
  stallBudgetMs = ROUND_STALL_BUDGET_MS,
): Promise<EncounterOutcome> {
  recorder.track(phase, 'initialize encounter driver');
  let lastRound = await roundOf(page);
  let lastRevision = await renderedSessionRevision(page);
  let lastProgressAt = Date.now();
  for (let attempt = 1; attempt <= MAX_TURN_ATTEMPTS; attempt += 1) {
    if (await resolveDecisionTray(page, recorder, phase) === null) {
      return { kind: 'aborted', round: lastRound, attempts: attempt - 1 };
    }
    await captureRefusals(page, recorder, phase);
    if (observeProgress !== undefined) await observeProgress();
    const outcome = await visibleEncounterOutcome(page);
    if (outcome === 'victory') {
      return { kind: 'victory', round: await roundOf(page), attempts: attempt - 1 };
    }
    if (outcome === 'defeat' || outcome === 'mutual') {
      return { kind: 'defeat', round: await roundOf(page), attempts: attempt - 1 };
    }
    try {
      recorder.track(phase, 'turn pulse through DM controls');
      await pulseTurn(page, recorder, phase, turnPulseMs);
    } catch (error: unknown) {
      recorder.add('scripted_nudge', phase, 'turn pulse through DM controls', errorDetail(error));
      return { kind: 'aborted', round: lastRound, attempts: attempt };
    }
    recorder.track(phase, 'read encounter round after turn pulse');
    const round = await roundOf(page);
    const revision = await renderedSessionRevision(page);
    if (round !== lastRound || revision !== lastRevision) {
      lastRound = round;
      lastRevision = revision;
      lastProgressAt = Date.now();
    }
    if (Date.now() - lastProgressAt < stallBudgetMs) continue;
    if (await resolveDecisionTray(page, recorder, phase) === null) {
      return { kind: 'aborted', round: lastRound, attempts: attempt };
    }
    await captureRefusals(page, recorder, phase);
    const afterResolution = await roundOf(page);
    const revisionAfterResolution = await renderedSessionRevision(page);
    if (afterResolution !== lastRound || revisionAfterResolution !== lastRevision) {
      lastRound = afterResolution;
      lastRevision = revisionAfterResolution;
      lastProgressAt = Date.now();
      continue;
    }
    const image = await screenshot(page, recorder, `${phase}-round-stall`);
    recorder.add(
      'turn_advance_stall',
      phase,
      'advance algorithm-controlled turns',
      `Round ${String(lastRound)} and its rendered revision did not progress for ${String(stallBudgetMs)}ms.`,
      image,
    );
    return { kind: 'aborted', round: lastRound, attempts: attempt };
  }
  const image = await screenshot(page, recorder, `${phase}-attempt-limit`);
  recorder.add(
    'turn_advance_stall',
    phase,
    'advance algorithm-controlled turns',
    `Encounter exceeded ${String(MAX_TURN_ATTEMPTS)} turn attempts at round ${String(lastRound)}.`,
    image,
  );
  return { kind: 'aborted', round: lastRound, attempts: MAX_TURN_ATTEMPTS };
}

async function observeTpkRecovery(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  progress: TpkRecoveryProgress,
): Promise<void> {
  if (!progress.revivifyObserved) {
    progress.revivifyObserved = await page.locator(
      '.dm-log [data-event-type="spell_cast"][data-spell-id="revivify"]',
    ).count() > 0;
  }
  if (progress.overrideTarget !== null) return;
  const dead = await page.locator('.dm-initiative li[data-life="dead"]').evaluateAll((items) =>
    items.flatMap((item) => {
      const combatantId = item.dataset.combatantId;
      return combatantId === undefined
        ? []
        : [{ combatantId, label: item.textContent?.trim() ?? combatantId }];
    }));
  if (dead.length < 2) return;
  const cleric = dead.find((candidate) => candidate.label.startsWith('Sera Dawn'));
  const target = cleric ?? dead[0];
  if (target === undefined) return;

  const deadline = Date.now() + FORM_STEP_BUDGET_MS;
  await pauseEncounter(page, deadline);
  const form = page.locator('.dm-adjudication');
  await form.getByLabel('Adjudication target').selectOption(target.combatantId, {
    timeout: remainingStepBudget(deadline, 'select dead PC for DM override'),
  });
  await form.getByLabel('Hit Point delta').fill('1', {
    timeout: remainingStepBudget(deadline, 'set DM override hit points'),
  });
  await form.getByLabel('DM reasoning').fill(
    'TPK recovery rehearsal: exercise the explicit DM authority un-kill and ruling-card path.',
    { timeout: remainingStepBudget(deadline, 'document DM override reasoning') },
  );
  await retryClick(
    () => page.locator('.dm-adjudication').getByRole('button', {
      name: 'Apply ADJUDICATED override',
      exact: true,
    }),
    'apply required TPK recovery DM override',
  );
  await page.waitForFunction((combatantId) => {
    const entry = Array.from(document.querySelectorAll<HTMLElement>('.dm-initiative li'))
      .find((candidate) => candidate.dataset.combatantId === combatantId);
    return entry?.dataset.life === 'living';
  }, target.combatantId, {
    timeout: remainingStepBudget(deadline, 'confirm DM override un-killed the PC'),
  });
  progress.overrideTarget = target.combatantId;
  recorder.add(
    'scripted_nudge',
    phase,
    'un-kill one dead PC through DM adjudication',
    `Expected recovery-variant nudge: ${target.label} received +1 HP through the rendered ADJUDICATED override form; Revivify remains controller-policy driven.`,
  );
  await resumeEncounter(page, deadline);
}

async function advanceTimelineToRound(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  targetRound: number,
): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_TURN_ATTEMPTS; attempt += 1) {
    if (await resolveDecisionTray(page, recorder, phase) === null) return false;
    await captureRefusals(page, recorder, phase);
    if (await roundOf(page) >= targetRound) return true;
    try {
      recorder.track(phase, 'advance in-session timeline exercise');
      await pulseTurn(page, recorder, phase);
    } catch (error: unknown) {
      recorder.add('scripted_nudge', phase, 'advance in-session timeline exercise', errorDetail(error));
      return false;
    }
  }
  const image = await screenshot(page, recorder, 'timeline-forward-stall');
  recorder.add(
    'turn_advance_stall',
    phase,
    'advance in-session timeline exercise',
    `Timeline exercise did not reach round ${String(targetRound)} after ${String(MAX_TURN_ATTEMPTS)} pulses.`,
    image,
  );
  return false;
}

async function exerciseTimelineControls(
  page: Page,
  recorder: FindingsRecorder,
  progress: TimelineProgress,
): Promise<void> {
  const phase = 'timeline';
  await observeTimelinePreview(page, progress, TIMELINE_STEP_BUDGET_MS);

  const controls = page.locator('.dm-controls');
  const delay = controls.getByRole('button', { name: 'Delay turn', exact: true });
  if (await waitVisible(page, recorder, phase, 'delay one turn', delay, TIMELINE_STEP_BUDGET_MS)) {
    await retryClick(
      () => page.locator('.dm-controls').getByRole('button', { name: 'Delay turn', exact: true }),
      'delay one turn',
    );
    progress.delayUsed = true;
    await wait(30);
  }

  const skip = controls.getByRole('button', { name: 'Skip turn', exact: true });
  if (await waitVisible(page, recorder, phase, 'skip one turn', skip, TIMELINE_STEP_BUDGET_MS)) {
    await retryClick(
      () => page.locator('.dm-controls').getByRole('button', { name: 'Skip turn', exact: true }),
      'skip one turn',
    );
    progress.skipUsed = true;
    await wait(30);
  }

  const reachedRoundTwo = await advanceTimelineToRound(page, recorder, phase, 2);
  if (reachedRoundTwo) {
    const rewind = page.locator('.dm-round-rewind').getByRole('button', {
      name: 'Rewind to round 1',
      exact: true,
    });
    if (await waitVisible(page, recorder, phase, 'rewind to round 1', rewind, TIMELINE_STEP_BUDGET_MS)) {
      await retryClick(
        () => page.locator('.dm-round-rewind').getByRole('button', {
          name: 'Rewind to round 1',
          exact: true,
        }),
        'rewind to round 1',
      );
      await page.locator('.dm-initiative-timeline[data-round="1"]').waitFor({
        state: 'visible',
        timeout: TIMELINE_STEP_BUDGET_MS,
      });
      progress.rewindUsed = true;
      progress.rewindRound = await roundOf(page);
      if (await assignAlgorithms(page, recorder, phase)) {
        progress.continuedForward = await advanceTimelineToRound(page, recorder, phase, 2);
      }
    }
  }

  const complete = progress.previewListed && progress.delayUsed && progress.skipUsed &&
    progress.rewindUsed && progress.continuedForward;
  if (!complete) {
    recorder.add(
      'scripted_nudge',
      phase,
      'complete timeline exercise',
      `Timeline coverage was preview=${String(progress.previewListed)}, delay=${String(progress.delayUsed)}, skip=${String(progress.skipUsed)}, rewind=${String(progress.rewindUsed)}, forward=${String(progress.continuedForward)}.`,
    );
  }
  recorder.phase(phase, complete ? 'completed' : 'aborted', complete
    ? `Listed scheduled events, delayed and skipped once, rewound to round ${String(progress.rewindRound)}, and advanced forward again.`
    : 'One or more required timeline controls could not be exercised on the live session board.');
}

async function resetApplication(page: Page, baseUrl: string, recorder: FindingsRecorder): Promise<boolean> {
  const phase = 'new session';
  recorder.track(phase, 'navigate to application');
  await page.goto(baseUrl, { timeout: UI_TIMEOUT_MS });
  if (!await waitVisible(page, recorder, phase, 'wait for application database', page.locator('#status[data-ready="true"]'))) {
    recorder.phase(phase, 'aborted', 'Application database did not become ready.');
    return false;
  }
  try {
    recorder.track(phase, 'reset application data');
    await withTimeout(page.evaluate(async () => window.staticApp.reset()), UI_TIMEOUT_MS, 'reset application data');
    await page.reload({ timeout: UI_TIMEOUT_MS });
    await page.locator('#status[data-ready="true"]').waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS });
    recorder.phase(phase, 'completed', 'Reset browser data and opened a fresh application session.');
    return true;
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, 'reset-application');
    recorder.add('selector_timeout', phase, 'reset application data', errorDetail(error), image);
    recorder.phase(phase, 'aborted', 'Could not reset application data.');
    return false;
  }
}

async function loadDungeon(
  page: Page,
  baseUrl: string,
  recorder: FindingsRecorder,
): Promise<boolean> {
  const phase = 'representative party';
  recorder.track(phase, 'navigate to bundled dungeon');
  await page.goto(`${baseUrl}/vtt?encounter=d365`, { timeout: UI_TIMEOUT_MS });
  const loader = page.getByRole('button', { name: 'Load bundled dungeon and party', exact: true });
  if (!await waitVisible(page, recorder, phase, 'open bundled dungeon loader', loader)) {
    recorder.phase(phase, 'aborted', 'Bundled dungeon loader was unavailable.');
    return false;
  }
  await page.getByLabel('Encounter seed', { exact: true }).fill(String(REHEARSAL_SEED), {
    timeout: FORM_STEP_BUDGET_MS,
  });
  await retryClick(
    () => page.getByRole('button', { name: 'Load bundled dungeon and party', exact: true }),
    'load bundled dungeon and party',
  );
  if (!await waitVisible(page, recorder, phase, 'author representative party and mount DM controls', page.getByRole('heading', { name: 'DM controls' }))) {
    recorder.phase(phase, 'aborted', 'Representative party did not load.');
    return false;
  }
  const players = page.locator('.encounter-token[data-kind="player_character"]');
  const loadedNames = (await players.locator('.encounter-token-label').allTextContents())
    .map((name) => name.trim())
    .sort();
  const expectedNames = [...REPRESENTATIVE_PARTY_NAMES].sort();
  if (JSON.stringify(loadedNames) !== JSON.stringify(expectedNames)) {
    const image = await screenshot(page, recorder, 'representative-party-count');
    recorder.add(
      'selector_timeout',
      phase,
      'load representative party',
      `Expected ${expectedNames.join(', ')}; found ${loadedNames.join(', ') || 'no player characters'}.`,
      image,
    );
    recorder.phase(phase, 'aborted', 'Representative party roster was incomplete.');
    return false;
  }
  recorder.phase(
    phase,
    'completed',
    `Loaded ${REPRESENTATIVE_PARTY_NAMES.join(', ')} with seed ${String(REHEARSAL_SEED)}.`,
  );
  return true;
}

async function advanceDungeonRoom(
  page: Page,
  recorder: FindingsRecorder,
  room: number,
): Promise<boolean> {
  const phase = `dungeon room ${String(room)}`;
  if (!await waitForAdventuringDayRoom(
    page,
    recorder,
    phase,
    `enter dungeon room ${String(room)}`,
    { kind: 'dungeon', roomCount: 4 },
    room,
  )) {
    recorder.phase(phase, 'aborted', 'Room status did not match the requested room.');
    return false;
  }
  if (!await assignAlgorithms(page, recorder, phase, REPRESENTATIVE_PARTY_NAMES)) {
    recorder.phase(phase, 'aborted', 'Could not assign every combatant to the algorithm controller.');
    return false;
  }
  return true;
}

async function transitionToNextDungeonRoom(
  page: Page,
  recorder: FindingsRecorder,
  completedRoom: number,
): Promise<boolean> {
  const phase = `dungeon room ${String(completedRoom)}`;
  const outcome = await visibleEncounterOutcome(page);
  if (outcome !== 'victory') {
    recorder.add(
      'scripted_nudge',
      phase,
      `refuse room boundary after room ${String(completedRoom)}`,
      `Room-boundary control was not clicked because the encounter outcome was ${outcome ?? 'not concluded'}.`,
    );
    return false;
  }
  const takeScheduledShortRest = completedRoom === 2;
  const shortRest = page.getByRole('button', { name: 'Take Short Rest and enter next room', exact: true });
  const direct = page.getByRole('button', { name: 'End room and enter next room', exact: true });
  const control = takeScheduledShortRest ? shortRest : direct;
  const label = takeScheduledShortRest ? 'short rest' : 'room transition';
  const deadline = Date.now() + TRANSITION_STEP_BUDGET_MS;
  if (!await waitVisible(
    page,
    recorder,
    phase,
    `${label} after room ${String(completedRoom)}`,
    control,
    remainingStepBudget(deadline, `${label} after room ${String(completedRoom)}`),
  )) {
    return false;
  }
  if (takeScheduledShortRest) await fillSensibleShortRestSpends(page);
  const nextRoom = completedRoom + 1;
  await retryClickUntil(
    () => page.getByRole('button', {
      name: takeScheduledShortRest
        ? 'Take Short Rest and enter next room'
        : 'End room and enter next room',
      exact: true,
    }),
    async () => adventuringDayReachedRoom(
      page,
      { kind: 'dungeon', roomCount: 4 },
      nextRoom,
    ),
    `${label} after room ${String(completedRoom)}`,
    remainingStepBudget(deadline, `${label} after room ${String(completedRoom)}`),
  );
  return waitForAdventuringDayRoom(
    page,
    recorder,
    phase,
    `enter room ${String(nextRoom)}`,
    { kind: 'dungeon', roomCount: 4 },
    nextRoom,
  );
}

async function fillSensibleShortRestSpends(page: Page): Promise<void> {
  const inputs = page.locator('.dm-short-rest input[type="number"][data-combatant-id]');
  const spending = new Set<string>();
  for (let index = 0; index < await inputs.count(); index += 1) {
    const input = inputs.nth(index);
    const combatantId = await input.getAttribute('data-combatant-id');
    const currentHitPointsRaw = await input.getAttribute('data-current-hit-points');
    const hitPointMaximumRaw = await input.getAttribute('data-hit-point-maximum');
    const diceRemainingRaw = await input.getAttribute('max');
    const currentHitPoints = Number(currentHitPointsRaw);
    const hitPointMaximum = Number(hitPointMaximumRaw);
    const diceRemaining = Number(diceRemainingRaw);
    if (combatantId === null || currentHitPointsRaw === null || hitPointMaximumRaw === null ||
      diceRemainingRaw === null || !Number.isSafeInteger(currentHitPoints) ||
      !Number.isSafeInteger(hitPointMaximum) || !Number.isSafeInteger(diceRemaining)) {
      throw new Error('Short Rest Hit Point Dice input omitted its typed party-state metadata.');
    }
    const spendOne = !await input.isDisabled() && currentHitPoints < hitPointMaximum &&
      diceRemaining > 0 && !spending.has(combatantId);
    await input.fill(spendOne ? '1' : '0');
    if (spendOne) spending.add(combatantId);
  }
}

async function completeLongRest(page: Page, recorder: FindingsRecorder): Promise<boolean> {
  const phase = 'long rest';
  const button = page.getByRole('button', { name: 'Complete Long Rest and end adventuring day', exact: true });
  if (!await waitVisible(
    page,
    recorder,
    phase,
    'trigger DM long-rest flow',
    button,
    TRANSITION_STEP_BUDGET_MS,
  )) {
    recorder.phase(phase, 'aborted', 'DM long-rest control was unavailable.');
    return false;
  }
  await retryClick(
    () => page.getByRole('button', {
      name: 'Complete Long Rest and end adventuring day',
      exact: true,
    }),
    'complete long rest',
  );
  const ended = await waitVisible(
    page,
    recorder,
    phase,
    'wait for completed long rest',
    page.locator('.adventuring-day-status[data-status="ended_by_long_rest"]'),
    TRANSITION_STEP_BUDGET_MS,
  );
  recorder.phase(phase, ended ? 'completed' : 'aborted', ended
    ? 'DM long-rest flow ended the adventuring day and rendered its summary card.'
    : 'Adventuring day did not reach the ended state.');
  return ended;
}

type ManualFileSave =
  | { readonly kind: 'folder'; readonly row: () => Locator }
  | { readonly kind: 'download'; readonly exported: SessionExport };

async function createManualFileSave(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
): Promise<ManualFileSave | null> {
  const manager = page.locator('.dm-save-manager');
  if (!await waitVisible(
    page,
    recorder,
    phase,
    'open save manager',
    manager,
    SAVE_MANAGER_STEP_BUDGET_MS,
  )) return null;
  recorder.track(phase, 'detect save-manager mode');
  if (await manager.getAttribute('data-mode', { timeout: SAVE_MANAGER_STEP_BUDGET_MS }) !== 'folder') {
    const save = manager.getByRole('button', { name: 'Download save now', exact: true });
    if (!await waitVisible(
      page,
      recorder,
      phase,
      'create fallback manual file save',
      save,
      SAVE_MANAGER_STEP_BUDGET_MS,
    )) return null;
    try {
      recorder.track(phase, 'wait for fallback manual-save download');
      const pendingDownload = page.waitForEvent('download', { timeout: EXPORT_STEP_BUDGET_MS });
      await retryClick(
        () => page.locator('.dm-save-manager')
          .getByRole('button', { name: 'Download save now', exact: true }),
        'download save now',
      );
      const download: Download = await pendingDownload;
      return {
        kind: 'download',
        exported: await recordDownloadedExport(download, recorder, phase, 'd365-session'),
      };
    } catch (error: unknown) {
      const image = await screenshot(page, recorder, 'manual-file-save-download');
      recorder.add('selector_timeout', phase, 'create fallback manual file save', errorDetail(error), image);
      recordFailedExport(recorder, phase, 'd365-session');
      return null;
    }
  }

  const before = await manager.locator('.dm-save-row[data-source="folder"]').count();
  const save = manager.getByRole('button', { name: 'Save now', exact: true });
  if (!await waitVisible(
    page,
    recorder,
    phase,
    'create folder manual file save',
    save,
    SAVE_MANAGER_STEP_BUDGET_MS,
  )) return null;
  await retryClick(
    () => page.locator('.dm-save-manager')
      .getByRole('button', { name: 'Save now', exact: true }),
    'save current session to folder',
  );
  try {
    recorder.track(phase, 'wait for folder save row');
    await page.waitForFunction((count) =>
      document.querySelectorAll('.dm-save-row[data-source="folder"]').length >= Number(count), before + 1, {
        timeout: SAVE_MANAGER_STEP_BUDGET_MS,
      });
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, 'manual-file-save');
    recorder.add('selector_timeout', phase, 'create manual file save', errorDetail(error), image);
    return null;
  }
  return {
    kind: 'folder',
    row: () => page.locator('.dm-save-manager .dm-save-row[data-source="folder"]').first(),
  };
}

async function downloadExport(
  page: Page,
  row: () => Locator,
  recorder: FindingsRecorder,
  phase: string,
  label: string,
): Promise<SessionExport | null> {
  const button = row().getByRole('button', { name: 'Export copy', exact: true });
  if (!await waitVisible(
    page,
    recorder,
    phase,
    `export ${label} session record`,
    button,
    EXPORT_STEP_BUDGET_MS,
  )) return null;
  try {
    recorder.track(phase, `wait for ${label} export download`);
    const pendingDownload = page.waitForEvent('download', { timeout: EXPORT_STEP_BUDGET_MS });
    await retryClick(
      () => row().getByRole('button', { name: 'Export copy', exact: true }),
      `export ${label} session record`,
    );
    const download: Download = await pendingDownload;
    return await recordDownloadedExport(download, recorder, phase, label);
  } catch (error: unknown) {
    recorder.add('scripted_nudge', phase, `export ${label} session record`, errorDetail(error));
    recordFailedExport(recorder, phase, label);
    return null;
  }
}

async function recordDownloadedExport(
  download: Download,
  recorder: FindingsRecorder,
  phase: string,
  label: string,
): Promise<SessionExport> {
  const filename = `${label}.vtt.json`;
  const path = resolve(recorder.runDirectory, filename);
  recorder.track(phase, `save ${label} export download`);
  await withTimeout(download.saveAs(path), EXPORT_STEP_BUDGET_MS, `save ${label} export download`);
  const bytes = await withTimeout(
    readFile(path, 'utf8'),
    EXPORT_STEP_BUDGET_MS,
    `read ${label} export download`,
  );
  const value: unknown = JSON.parse(bytes);
  const sessionRecord = isRecord(value) && isRecord(value.sessionRecord)
    ? value.sessionRecord
    : null;
  const encounters = sessionRecord === null ? null : sessionRecord.encounters;
  const encounterRecords = Array.isArray(encounters) ? encounters.filter(isRecord) : [];
  const deaths = encounterRecords.flatMap((encounter) => recordList(encounter, 'deaths'));
  const deathSaves = encounterRecords.flatMap((encounter) => recordList(encounter, 'deathSaves'));
  const revivals = encounterRecords.flatMap((encounter) => recordList(encounter, 'revivals'));
  const defeatConclusionCount = encounterRecords.filter((encounter) => {
    const conclusion = encounter.conclusion;
    return isRecord(conclusion) && conclusion.outcome === 'defeat';
  }).length;
  const revivifyCount = revivals.filter((revival) => revival.cause === 'revivify').length;
  const dmRevivalCount = revivals.filter((revival) => revival.cause === 'dm_override').length;
  const recoveryRedeathCount = revivals.filter((revival) => {
    const combatant = revival.combatant;
    const eventSequence = revival.eventSequence;
    return typeof combatant === 'string' && typeof eventSequence === 'number' && deaths.some((death) =>
      death.combatant === combatant &&
      typeof death.eventSequence === 'number' &&
      death.eventSequence > eventSequence);
  }).length;
  const decoded = decodeSavedSessionFingerprint(bytes);
  const result: SessionExport = {
    phase,
    filename,
    encounterCount: Array.isArray(encounters) ? encounters.length : 0,
    parsed: true,
    hasSessionRecord: Array.isArray(encounters),
    hasAlarm: bytes.includes('cinder-wave-1-a') || bytes.includes('alarm_used'),
    hasIgnition: bytes.includes('surface_ignited') || /"burningCells":\[(?!\])/u.test(bytes),
    seed: decoded.initialSeed,
    payloadBytes: new TextEncoder().encode(bytes).byteLength,
    revisionCount: decoded.revisionCount,
    format: isRecord(value) && typeof value.format === 'string' ? value.format : '(unknown)',
    defeatConclusionCount,
    deathSaveCount: deathSaves.length,
    deathCount: deaths.length,
    revivifyCount,
    dmRevivalCount,
    recoveryRedeathCount,
  };
  recorder.exports.push(result);
  return result;
}

function recordFailedExport(
  recorder: FindingsRecorder,
  phase: string,
  label: string,
): void {
  recorder.exports.push({
    phase,
    filename: `${label}.vtt.json`,
    encounterCount: 0,
    parsed: false,
    hasSessionRecord: false,
    hasAlarm: false,
    hasIgnition: false,
    seed: null,
    payloadBytes: 0,
    revisionCount: 0,
    format: '(unknown)',
    defeatConclusionCount: 0,
    deathSaveCount: 0,
    deathCount: 0,
    revivifyCount: 0,
    dmRevivalCount: 0,
    recoveryRedeathCount: 0,
  });
}

async function saveManagerRoundTrip(
  page: Page,
  recorder: FindingsRecorder,
): Promise<SessionExport | null> {
  const phase = 'save manager';
  const browserRows = page.locator('.dm-save-row[data-source="browser"]');
  const perRound = browserRows.filter({ has: page.locator('.dm-save-pool', { hasText: /^Per-round autosave$/u }) });
  const boundary = browserRows.filter({ has: page.locator('.dm-save-pool', { hasText: /^Encounter-boundary autosave$/u }) });
  const poolsPresent = await waitVisible(
    page,
    recorder,
    phase,
    'find per-round autosave pool',
    perRound,
    SAVE_MANAGER_STEP_BUDGET_MS,
  ) && await waitVisible(
    page,
    recorder,
    phase,
    'find encounter-boundary autosave pool',
    boundary,
    SAVE_MANAGER_STEP_BUDGET_MS,
  );
  const manualSave = await createManualFileSave(page, recorder, phase);
  if (manualSave === null) {
    recorder.phase(phase, 'aborted', 'Could not create a manual file save.');
    return null;
  }
  let exported: SessionExport | null;
  let loadPathReady: boolean;
  if (manualSave.kind === 'download') {
    exported = manualSave.exported;
    loadPathReady = await waitVisible(
      page,
      recorder,
      phase,
      'find fallback upload path',
      page.locator('.dm-save-manager').getByRole('button', { name: 'Upload save file', exact: true }),
      SAVE_MANAGER_STEP_BUDGET_MS,
    );
  } else {
    await pauseEncounter(page, Date.now() + SAVE_MANAGER_STEP_BUDGET_MS);
    const history = page.locator('details ol [data-revision]');
    await retryClick(
      () => page.getByText('Full revision history', { exact: true }),
      'open full revision history',
    );
    const revisionCount = await history.count();
    exported = await downloadExport(page, manualSave.row, recorder, phase, 'd365-session');
    const load = manualSave.row().getByRole('button', { name: 'Load', exact: true });
    if (!await waitVisible(
      page,
      recorder,
      phase,
      'load manual save',
      load,
      SAVE_MANAGER_STEP_BUDGET_MS,
    )) {
      recorder.phase(phase, 'aborted', 'Manual save could not be loaded.');
      return exported;
    }
    await retryClick(
      () => manualSave.row().getByRole('button', { name: 'Load', exact: true }),
      'load manual save',
    );
    loadPathReady = await waitVisible(
      page,
      recorder,
      phase,
      'mount loaded save',
      page.getByRole('heading', { name: 'DM controls' }),
      SAVE_MANAGER_STEP_BUDGET_MS,
    );
    if (loadPathReady) {
      await retryClick(
        () => page.getByText('Full revision history', { exact: true }),
        'open loaded full revision history',
      );
      const loadedCount = await page.locator('details ol [data-revision]').count();
      if (loadedCount < revisionCount) {
        const image = await screenshot(page, recorder, 'load-round-trip-history');
        recorder.add(
          'selector_timeout',
          phase,
          'verify load round-trip',
          `Revision history shrank from ${String(revisionCount)} to ${String(loadedCount)}.`,
          image,
        );
      }
    }
  }
  const complete = poolsPresent && loadPathReady && exported?.parsed === true &&
    exported.hasSessionRecord && exported.encounterCount === 4 && exported.seed === REHEARSAL_SEED;
  recorder.phase(phase, complete ? 'completed' : 'aborted', complete
    ? `Found both autosave pools, exercised the ${manualSave.kind === 'download' ? 'download/upload fallback' : 'folder save/load path'}, and parsed ${String(exported?.encounterCount)} exported encounter records with seed ${String(exported?.seed)}.`
    : 'One or more save-manager checks did not complete.');
  return exported;
}

async function openVaneWarrenSession(
  page: Page,
  baseUrl: string,
  recorder: FindingsRecorder,
  phase: string,
  scenario: ParsedOptions['scenario'] = 'default',
): Promise<boolean> {
  recorder.track(phase, 'navigate to Vane Warren');
  const scenarioQuery = scenario === 'default' ? '' : `&scenario=${scenario}`;
  await page.goto(`${baseUrl}/vtt?encounter=vane-warren${scenarioQuery}`, { timeout: UI_TIMEOUT_MS });
  const startLabel = scenario === 'default' ? 'Start the Vane Warren' : 'Start the doomed rehearsal';
  const start = page.getByRole('button', { name: startLabel, exact: true });
  if (!await waitVisible(page, recorder, phase, 'open Vane Warren start flow', start)) {
    recorder.phase(phase, 'aborted', 'Vane Warren session start flow was unavailable.');
    return false;
  }
  await retryClick(
    () => page.getByRole('button', { name: startLabel, exact: true }),
    'start the Vane Warren',
  );
  const heading = page.getByRole('heading', { name: 'DM controls' });
  const status = page.locator('.vane-warren-loader-status');
  const deadline = Date.now() + UI_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await heading.count() > 0 && await heading.isVisible()) return true;
    const message = await status.count() === 0
      ? ''
      : await status.evaluate((node) =>
          node instanceof HTMLOutputElement ? node.value.trim() : node.textContent?.trim() ?? '');
    if (message !== '' && !message.startsWith('Authoring the bundled')) {
      const image = await screenshot(page, recorder, 'mount-vane-warren-session');
      recorder.add('selector_timeout', phase, 'mount Vane Warren session', `Start flow stopped before DM controls mounted: ${message}`, image);
      recorder.phase(phase, 'aborted', 'Vane Warren start flow surfaced a terminal UI dead end.');
      return false;
    }
    await wait(100);
  }
  const image = await screenshot(page, recorder, 'mount-vane-warren-session');
  recorder.add('selector_timeout', phase, 'mount Vane Warren session', 'DM controls did not mount before the start-flow timeout.', image);
  recorder.phase(phase, 'aborted', 'Vane Warren session did not mount.');
  return false;
}

async function prepareVaneWarrenSession(
  page: Page,
  baseUrl: string,
  recorder: FindingsRecorder,
  phase: string,
): Promise<boolean> {
  try {
    recorder.track(phase, 'clear prior Vane Warren session state');
    await page.goto(baseUrl, { timeout: UI_TIMEOUT_MS });
    await page.locator('#status[data-ready="true"]').waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS });
    await withTimeout(page.evaluate(() => {
      const keys: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith('srd55:vtt') === true) keys.push(key);
      }
      for (const key of keys) localStorage.removeItem(key);
    }), UI_TIMEOUT_MS, 'clear Vane Warren local storage');
    await withTimeout(page.evaluate(async () => window.staticApp.reset()), UI_TIMEOUT_MS, 'reset Vane Warren application data');
    await page.reload({ timeout: UI_TIMEOUT_MS });
    await page.locator('#status[data-ready="true"]').waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS });
    return true;
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, 'prepare-vane-warren-session');
    recorder.add('selector_timeout', phase, 'prepare separate Vane Warren session', errorDetail(error), image);
    return false;
  }
}

async function waitForVaneWarrenFight(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  fightNumber: number,
  scenario: ParsedOptions['scenario'] = 'default',
): Promise<boolean> {
  const name = scenario === 'tpk-clean'
    ? 'The Cinder Rite — doomed clean wipe'
    : scenario === 'tpk-recovery'
      ? 'The Cinder Rite — doomed partial recovery'
      : 'The Vane Warren';
  return waitForAdventuringDayRoom(
    page,
    recorder,
    phase,
    `enter Vane Warren fight ${String(fightNumber)}`,
    { kind: 'vane_warren', name, roomCount: scenario === 'default' ? 3 : 1 },
    fightNumber,
  );
}

async function transitionToNextVaneWarrenFight(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  completedFight: number,
): Promise<boolean> {
  const outcome = await visibleEncounterOutcome(page);
  if (outcome !== 'victory') {
    recorder.add(
      'scripted_nudge',
      phase,
      `refuse fight boundary after Vane Warren fight ${String(completedFight)}`,
      `Room-boundary control was not clicked because the encounter outcome was ${outcome ?? 'not concluded'}.`,
    );
    return false;
  }
  const control = page.getByRole('button', { name: 'End room and enter next room', exact: true });
  const deadline = Date.now() + TRANSITION_STEP_BUDGET_MS;
  if (!await waitVisible(
    page,
    recorder,
    phase,
    `cross boundary after Vane Warren fight ${String(completedFight)}`,
    control,
    remainingStepBudget(deadline, `cross boundary after Vane Warren fight ${String(completedFight)}`),
  )) return false;
  await retryClickUntil(
    () => page.getByRole('button', { name: 'End room and enter next room', exact: true }),
    async () => adventuringDayReachedRoom(
      page,
      { kind: 'vane_warren', name: 'The Vane Warren', roomCount: 3 },
      completedFight + 1,
    ),
    `cross boundary after Vane Warren fight ${String(completedFight)}`,
    remainingStepBudget(deadline, `cross boundary after Vane Warren fight ${String(completedFight)}`),
  );
  return waitForVaneWarrenFight(page, recorder, phase, completedFight + 1);
}

async function endVaneWarrenSession(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
): Promise<SessionExport | null> {
  const label = 'vane-warren-session';
  const control = page.getByRole('button', { name: 'End Session and export', exact: true });
  if (!await waitVisible(
    page,
    recorder,
    phase,
    'end chained Vane Warren session',
    control,
    EXPORT_STEP_BUDGET_MS,
  )) {
    return null;
  }
  try {
    recorder.track(phase, 'wait for final Vane Warren export download');
    const pendingDownload = page.waitForEvent('download', { timeout: EXPORT_STEP_BUDGET_MS });
    await withTimeout(
      page.getByRole('button', { name: 'End Session and export', exact: true })
        .evaluate((button) => {
          if (!(button instanceof HTMLButtonElement)) {
            throw new TypeError('End-session control is not a button.');
          }
          button.click();
        }),
      EXPORT_STEP_BUDGET_MS,
      'dispatch end chained Vane Warren session',
    );
    const download: Download = await pendingDownload;
    const exported = await recordDownloadedExport(download, recorder, phase, label);
    await waitVisible(
      page,
      recorder,
      phase,
      'confirm finalized Vane Warren session',
      page.locator('.dm-end-session-export-status'),
      EXPORT_STEP_BUDGET_MS,
    );
    return exported;
  } catch (error: unknown) {
    recorder.add('scripted_nudge', phase, 'end chained Vane Warren session', errorDetail(error));
    recordFailedExport(recorder, phase, label);
    return null;
  }
}

class PreviewInfrastructureError extends Error {}

function assertPreviewRunning(preview: ChildProcess): void {
  if (preview.exitCode === null && preview.signalCode === null) return;
  throw new PreviewInfrastructureError(
    `Built preview stopped unexpectedly (exit=${String(preview.exitCode)}, signal=${String(preview.signalCode)}).`,
  );
}

async function runIsolatedPhase<T>(
  preview: ChildProcess,
  recorder: FindingsRecorder,
  phase: string,
  task: () => Promise<T>,
): Promise<T | null> {
  recorder.track(phase, 'run isolated phase');
  assertPreviewRunning(preview);
  try {
    const result = await task();
    assertPreviewRunning(preview);
    await recorder.flushScreenshots();
    return result;
  } catch (error: unknown) {
    assertPreviewRunning(preview);
    recorder.add('selector_timeout', phase, 'phase abort', errorDetail(error));
    recorder.phase(
      phase,
      'aborted',
      'Phase aborted after an unexpected UI or driver error; the rehearsal continued to the next phase.',
    );
    await recorder.flushScreenshots();
    return null;
  }
}

async function main(): Promise<void> {
  const options = await parseOptions(process.argv.slice(2));
  const runDirectory = resolve('.tmp-rehearsal', `${options.date}-run-${String(options.run)}`);
  const reportPath = resolve('docs/rehearsal', `${options.date}-run-${String(options.run)}.md`);
  await mkdir(runDirectory, { recursive: true });
  const recorder = new FindingsRecorder(options.date, options.run, runDirectory, reportPath);
  let baseUrl = options.port === 0
    ? 'http://127.0.0.1:(ephemeral)'
    : `http://127.0.0.1:${String(options.port)}`;
  let currentPhase = 'preview startup';
  let preview: ChildProcess | null = null;
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let reportWritten = false;
  let watchdogHandling = false;
  const watchdogTimer = globalThis.setTimeout(() => {
    if (reportWritten || watchdogHandling) return;
    watchdogHandling = true;
    void (async () => {
      const stuckPhase = recorder.currentPhase;
      const stuckStep = recorder.currentStep;
      recorder.page = null;
      recorder.add(
        'watchdog_timeout',
        stuckPhase,
        stuckStep,
        `Global run watchdog expired after ${String(options.watchdogMs)}ms while this step was still pending.`,
      );
      recorder.phase(
        stuckPhase,
        'aborted',
        `Global run watchdog expired during ${stuckStep}; the partial findings report was written before forced exit.`,
      );
      recorder.timings.finish();
      await recorder.write(baseUrl);
      reportWritten = true;
      process.stdout.write(`\n${recorder.outputBlock()}\n\nFindings: ${recorder.reportPath}\n`);
      if (context !== null) {
        await withTimeout(context.close(), CLEANUP_TIMEOUT_MS, 'watchdog browser-context cleanup')
          .catch(() => undefined);
      }
      if (browser !== null) {
        await withTimeout(browser.close(), CLEANUP_TIMEOUT_MS, 'watchdog browser cleanup')
          .catch(() => undefined);
      }
      if (preview !== null) await stopPreview(preview).catch(() => undefined);
      process.exit(1);
    })().catch((error: unknown) => {
      process.stderr.write(`Watchdog could not write the rehearsal report: ${errorDetail(error)}\n`);
      process.exit(1);
    });
  }, options.watchdogMs);

  try {
    recorder.track(currentPhase, 'start built preview');
    preview = await startPreview(options.port, resolve(runDirectory, 'preview.log'));
    recorder.track(currentPhase, 'wait for built preview readiness');
    baseUrl = await waitForPreview(preview);
    recorder.phase('preview startup', 'completed', 'Fresh npm build passed and the built preview accepted requests.');

    recorder.track(currentPhase, 'launch Playwright Chromium');
    browser = await chromium.launch({ headless: true, timeout: APP_READY_TIMEOUT_MS });
    recorder.track(currentPhase, 'create browser context');
    context = await withTimeout(
      browser.newContext({ acceptDownloads: true, baseURL: baseUrl }),
      UI_TIMEOUT_MS,
      'create browser context',
    );
    recorder.track(currentPhase, 'open and attach browser page');
    const page = await withTimeout(context.newPage(), UI_TIMEOUT_MS, 'open browser page');
    page.setDefaultTimeout(UI_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(UI_TIMEOUT_MS);
    recorder.attachPage(page);
    attachPageFindingCapture(page, recorder);

    currentPhase = 'new session';
    const newSessionReady = await runIsolatedPhase(preview, recorder, currentPhase, async () =>
      resetApplication(page, baseUrl, recorder));

    if (options.scenario !== 'default') {
      currentPhase = `${options.scenario} setup`;
      const tpkReady = newSessionReady === true
        ? await runIsolatedPhase(preview, recorder, currentPhase, async () => {
            if (!await prepareVaneWarrenSession(page, baseUrl, recorder, currentPhase)) {
              recorder.phase(currentPhase, 'aborted', 'Could not clear prior state for the doomed scenario.');
              return false;
            }
            if (!await openVaneWarrenSession(
              page,
              baseUrl,
              recorder,
              currentPhase,
              options.scenario,
            )) return false;
            const entered = await waitForVaneWarrenFight(
              page,
              recorder,
              currentPhase,
              1,
              options.scenario,
            );
            recorder.phase(
              currentPhase,
              entered ? 'completed' : 'aborted',
              entered
                ? `Loaded ${options.scenario} with the pre-sounded alarm, both waves, and unchanged-statblock doomed reinforcements stacked at encounter start.`
                : 'The doomed scenario did not enter The Cinder Rite.',
            );
            return entered;
          })
        : (skipDependency(recorder, currentPhase, 'new session'), false);

      currentPhase = `${options.scenario} defeat flow`;
      let defeatReached = false;
      const recovery: TpkRecoveryProgress = {
        revivifyObserved: false,
        overrideTarget: null,
      };
      if (tpkReady === true) {
        await runIsolatedPhase(preview, recorder, currentPhase, async () => {
          if (!await assignAlgorithms(page, recorder, currentPhase)) {
            recorder.phase(currentPhase, 'aborted', 'Could not assign the doomed combatants to algorithm controllers.');
            return;
          }
          const outcome = await playEncounter(
            page,
            recorder,
            currentPhase,
            options.scenario === 'tpk-recovery'
              ? async () => observeTpkRecovery(page, recorder, currentPhase, recovery)
              : undefined,
            250,
            120_000,
          );
          defeatReached = outcome.kind === 'defeat';
          const recoveryComplete = options.scenario === 'tpk-clean' ||
            (recovery.revivifyObserved && recovery.overrideTarget !== null);
          const completed = defeatReached && recoveryComplete;
          recorder.phase(
            currentPhase,
            completed ? 'completed' : 'aborted',
            `${outcome.kind} at round ${String(outcome.round)} after ${String(outcome.attempts)} driver pulses; ` +
              (options.scenario === 'tpk-clean'
                ? 'the defeat conclusion banner was recognized as the scenario completion boundary.'
                : `normal controller policy Revivify observed=${String(recovery.revivifyObserved)}; rendered DM adjudication override target=${recovery.overrideTarget ?? 'none'}; defeat recognized as completion=${String(defeatReached)}.`),
          );
        });
      } else {
        skipDependency(recorder, currentPhase, `${options.scenario} setup`);
      }

      currentPhase = `${options.scenario} session record and export`;
      if (defeatReached) {
        await runIsolatedPhase(preview, recorder, currentPhase, async () => {
          const exported = await endVaneWarrenSession(page, recorder, currentPhase);
          const commonCoverage = exported?.parsed === true &&
            exported.hasSessionRecord &&
            exported.encounterCount === 1 &&
            exported.defeatConclusionCount === 1 &&
            exported.deathSaveCount > 0 &&
            exported.deathCount >= REPRESENTATIVE_PARTY_NAMES.length;
          const recoveryCoverage = options.scenario === 'tpk-clean' || (
            exported !== null &&
            exported.revivifyCount >= 1 &&
            exported.dmRevivalCount >= 1 &&
            exported.recoveryRedeathCount >= 2
          );
          const complete = commonCoverage && recoveryCoverage;
          recorder.phase(
            currentPhase,
            complete ? 'completed' : 'aborted',
            exported === null
              ? 'The defeated session did not produce an export.'
              : `Parsed ${String(exported.encounterCount)} closed encounter with ${String(exported.defeatConclusionCount)} defeat conclusion, ${String(exported.deathSaveCount)} death saves, ${String(exported.deathCount)} deaths, ${String(exported.revivifyCount)} Revivify revival, ${String(exported.dmRevivalCount)} DM revival, and ${String(exported.recoveryRedeathCount)} post-revival deaths.`,
          );
        });
      } else {
        skipDependency(recorder, currentPhase, `${options.scenario} defeat flow`);
      }
      return;
    }

    currentPhase = 'representative party';
    const representativePartyReady = newSessionReady === true
      ? await runIsolatedPhase(preview, recorder, currentPhase, async () =>
          loadDungeon(page, baseUrl, recorder))
      : (skipDependency(recorder, currentPhase, 'new session'), false);

    let dungeonReady = representativePartyReady === true;
    for (let room = 1; room <= 4; room += 1) {
      currentPhase = `dungeon room ${String(room)}`;
      const prerequisite = room === 1 ? 'representative party' : `dungeon room ${String(room - 1)}`;
      if (!dungeonReady) {
        skipDependency(recorder, currentPhase, prerequisite);
        continue;
      }
      const roomReady = await runIsolatedPhase(preview, recorder, currentPhase, async () => {
        if (!await advanceDungeonRoom(page, recorder, room)) return false;
        const outcome = await playEncounter(page, recorder, currentPhase);
        recorder.phase(currentPhase, outcome.kind === 'victory' ? 'completed' : 'aborted',
          `${outcome.kind} at round ${String(outcome.round)} after ${String(outcome.attempts)} driver pulses.`);
        if (room === 4) return outcome.kind === 'victory';
        if (outcome.kind !== 'victory') return false;
        if (!await transitionToNextDungeonRoom(page, recorder, room)) {
          recorder.phase(currentPhase, 'aborted', 'Could not cross the room boundary; later phases continued.');
          return false;
        }
        return true;
      });
      dungeonReady = roomReady === true;
    }

    currentPhase = 'long rest';
    const longRestReady = dungeonReady
      ? await runIsolatedPhase(preview, recorder, currentPhase, async () =>
          completeLongRest(page, recorder))
      : (skipDependency(recorder, currentPhase, 'dungeon room 4'), false);

    currentPhase = 'save manager';
    if (longRestReady === true) {
      await runIsolatedPhase(preview, recorder, currentPhase, async () =>
        saveManagerRoundTrip(page, recorder));
    } else {
      skipDependency(recorder, currentPhase, 'long rest');
    }

    currentPhase = 'dungeon → Vane Warren seam';
    const vaneSessionReady = await runIsolatedPhase(preview, recorder, currentPhase, async () => {
      if (!await prepareVaneWarrenSession(page, baseUrl, recorder, currentPhase)) {
        recorder.phase(currentPhase, 'aborted', 'Could not prepare the separately exported Vane Warren session.');
        return false;
      }
      if (!await openVaneWarrenSession(page, baseUrl, recorder, currentPhase)) return false;
      const entered = await waitForVaneWarrenFight(page, recorder, currentPhase, 1);
      recorder.phase(currentPhase, entered ? 'completed' : 'aborted', entered
        ? 'Named two-export deviation: after the four-room dungeon export, reset browser session state and entered the separate three-fight Vane Warren chain once through its start flow.'
        : 'The Vane Warren chain did not enter its first fight.');
      return entered;
    });

    currentPhase = 'timeline';
    if (vaneSessionReady === true) {
      await runIsolatedPhase(preview, recorder, currentPhase, async () => {
        const timeline: TimelineProgress = {
          previewListed: false,
          delayUsed: false,
          skipUsed: false,
          rewindUsed: false,
          continuedForward: false,
          rewindRound: null,
        };
        if (!await assignAlgorithms(page, recorder, currentPhase)) {
          recorder.phase(currentPhase, 'aborted', 'Could not assign controllers for the in-session timeline exercise.');
          return;
        }
        await exerciseTimelineControls(page, recorder, timeline);
      });
    } else {
      skipDependency(recorder, currentPhase, 'dungeon → Vane Warren seam');
    }

    const fights = ['The Cinder Rite', 'The Iron Voice', 'The Last Muster'] as const;
    let vaneFightReady = vaneSessionReady === true;
    for (const [index, fightName] of fights.entries()) {
      currentPhase = `Vane Warren — ${fightName}`;
      const prerequisite = index === 0
        ? 'dungeon → Vane Warren seam'
        : `Vane Warren — ${fights[index - 1] ?? 'unknown fight'}`;
      if (!vaneFightReady) {
        skipDependency(recorder, currentPhase, prerequisite);
        continue;
      }
      const fightReady = await runIsolatedPhase(preview, recorder, currentPhase, async () => {
        const fightNumber = index + 1;
        if (!await waitForVaneWarrenFight(page, recorder, currentPhase, fightNumber)) {
          recorder.phase(currentPhase, 'aborted', 'The chained session was not at the requested fight.');
          return false;
        }
        if (!await assignAlgorithms(page, recorder, currentPhase)) {
          recorder.phase(currentPhase, 'aborted', 'Could not assign every combatant to the algorithm controller.');
          return false;
        }
        const outcome = await playEncounter(page, recorder, currentPhase);
        recorder.phase(currentPhase, outcome.kind === 'victory' ? 'completed' : 'aborted',
          `${outcome.kind} at round ${String(outcome.round)} after ${String(outcome.attempts)} driver pulses.`);
        if (fightNumber === fights.length) return outcome.kind === 'victory';
        if (outcome.kind !== 'victory') return false;
        if (!await transitionToNextVaneWarrenFight(page, recorder, currentPhase, fightNumber)) {
          recorder.phase(currentPhase, 'aborted', 'Could not cross the Vane Warren room boundary.');
          return false;
        }
        return true;
      });
      vaneFightReady = fightReady === true;
    }

    currentPhase = 'end session and export coverage';
    if (vaneFightReady) await runIsolatedPhase(preview, recorder, currentPhase, async () => {
      const vaneExport = await endVaneWarrenSession(page, recorder, currentPhase);
      if (vaneExport?.hasAlarm !== true) {
        recorder.add(
          'scripted_nudge',
          currentPhase,
          'sound Cinder Rite alarm',
          'The board renders the war drum, but controller legal actions and DM tools expose no alarm interaction; the chained session export contains no deployed alarm wave.',
        );
      }
      if (vaneExport?.hasIgnition !== true) {
        recorder.add(
          'scripted_nudge',
          currentPhase,
          'ignite a surface from the brazier',
          'The board renders braziers and flammable surfaces, but no controller action or DM tool can place fire or invoke the ignition chain.',
        );
      }
      const dungeonExport = recorder.exports.find((entry) => entry.filename === 'd365-session.vtt.json');
      const coverage = recorder.exports.length === 2 &&
        dungeonExport?.parsed === true && dungeonExport.hasSessionRecord && dungeonExport.encounterCount === 4 &&
        vaneExport?.parsed === true && vaneExport.hasSessionRecord && vaneExport.encounterCount === 3;
      const totalEncounters = recorder.exports.reduce((total, entry) => total + entry.encounterCount, 0);
      recorder.phase(currentPhase, coverage ? 'completed' : 'aborted', coverage
        ? 'The final control exported one three-encounter Vane Warren session; with the four-encounter dungeon export, two structured files cover all seven fights.'
        : `Parsed export coverage was ${String(totalEncounters)} encounters across ${String(recorder.exports.length)} files; expected a four-encounter dungeon export and one three-encounter Vane Warren export.`);
    });
    else skipDependency(recorder, currentPhase, 'Vane Warren — The Last Muster');

  } catch (error: unknown) {
    recorder.add('page_console_error', currentPhase, 'driver infrastructure', errorDetail(error));
    recorder.phase(currentPhase, 'aborted', 'Driver infrastructure stopped this phase.');
  } finally {
    recorder.track('driver cleanup', 'capture browser runtime timing');
    if (recorder.page !== null) {
      await captureBrowserRuntimeTimings(recorder.page, recorder).catch(() => undefined);
    }
    recorder.track('driver cleanup', 'flush pending screenshots');
    await withTimeout(recorder.flushScreenshots(), CLEANUP_TIMEOUT_MS, 'flush pending screenshots')
      .catch(() => undefined);
    recorder.page = null;
    recorder.track('driver cleanup', 'close browser context');
    if (context !== null) {
      await withTimeout(context.close(), CLEANUP_TIMEOUT_MS, 'close browser context')
        .catch(() => undefined);
    }
    recorder.track('driver cleanup', 'close browser');
    if (browser !== null) {
      await withTimeout(browser.close(), CLEANUP_TIMEOUT_MS, 'close browser')
        .catch(() => undefined);
    }
    recorder.track('driver cleanup', 'stop built preview');
    if (preview !== null) await stopPreview(preview);
    recorder.track('driver cleanup', 'write findings report');
    recorder.timings.finish();
    await recorder.write(baseUrl);
    reportWritten = true;
    globalThis.clearTimeout(watchdogTimer);
    process.stdout.write(`\n${recorder.outputBlock()}\n\nFindings: ${recorder.reportPath}\n`);
  }
}

await main();
