import {
  chromium,
  type Browser,
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

const DEFAULT_PORT = 4173;
const APP_READY_TIMEOUT_MS = 180_000;
const UI_TIMEOUT_MS = 65_000;
const TURN_PULSE_MS = 35;
const ROUND_STALL_ATTEMPTS = 24;
const MAX_TURN_ATTEMPTS = 600;
const previewReadiness = new WeakMap<ChildProcess, Promise<void>>();

const FINDING_CLASSES = [
  'page_console_error',
  'refusal',
  'selector_timeout',
  'turn_advance_stall',
  'tray_unresolved',
  'scripted_nudge',
] as const;

type FindingClass = (typeof FINDING_CLASSES)[number];
type PhaseStatus = 'completed' | 'aborted';

interface Finding {
  readonly sequence: number;
  readonly class: FindingClass;
  readonly phase: string;
  readonly step: string;
  readonly detail: string;
  readonly screenshot: string | null;
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
}

interface SessionExport {
  readonly phase: string;
  readonly filename: string;
  readonly encounterCount: number;
  readonly parsed: boolean;
  readonly hasSessionRecord: boolean;
  readonly hasAlarm: boolean;
  readonly hasIgnition: boolean;
}

interface EncounterOutcome {
  readonly kind: 'victory' | 'defeat' | 'aborted';
  readonly round: number;
  readonly attempts: number;
}

interface TimelineProgress {
  previewListed: boolean;
  delayUsed: boolean;
  rewindUsed: boolean;
  continuedForward: boolean;
  rewindRound: number | null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
  const port = positiveInteger(
    'PORT',
    optionValue(argv, '--port') ?? process.env.PORT,
    DEFAULT_PORT,
  );
  if (port > 65_535) throw new Error(`PORT must not exceed 65535; received ${String(port)}.`);
  return { date, run, port };
}

class FindingsRecorder {
  readonly findings: Finding[] = [];
  readonly phases: PhaseResult[] = [];
  readonly seenRefusals = new Set<string>();
  readonly exports: SessionExport[] = [];

  constructor(
    readonly date: string,
    readonly run: number,
    readonly runDirectory: string,
    readonly reportPath: string,
  ) {}

  add(
    findingClass: FindingClass,
    phase: string,
    step: string,
    detail: string,
    screenshot: string | null = null,
  ): void {
    this.findings.push({
      sequence: this.findings.length + 1,
      class: findingClass,
      phase,
      step,
      detail,
      screenshot,
    });
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
      this.findings.filter((finding) => finding.class === findingClass).length,
    ])) as unknown as Readonly<Record<FindingClass, number>>;
  }

  summaryBlock(): string {
    const completed = this.phases.filter((phase) => phase.status === 'completed');
    const aborted = this.phases.filter((phase) => phase.status === 'aborted');
    const counts = this.counts();
    const clean = counts.page_console_error === 0 &&
      counts.selector_timeout === 0 &&
      counts.turn_advance_stall === 0 &&
      counts.tray_unresolved === 0;
    return [
      '## Summary',
      '',
      `Phases completed: ${String(completed.length)}${completed.length === 0 ? '' : ` — ${completed.map((phase) => phase.name).join(', ')}`}`,
      `Phases aborted: ${String(aborted.length)}${aborted.length === 0 ? '' : ` — ${aborted.map((phase) => phase.name).join(', ')}`}`,
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
          ...(finding.screenshot === null ? [] : [`- Screenshot: \`${finding.screenshot}\``]),
        ].join('\n')).join('\n\n');
    const exportRows = this.exports.length === 0
      ? '| (none) | false | false | 0 |'
      : this.exports.map((entry) =>
          `| ${escapeTable(entry.filename)} | ${String(entry.parsed)} | ${String(entry.hasSessionRecord)} | ${String(entry.encounterCount)} |`).join('\n');
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
      '| File | Parses | Structured record | Encounters |',
      '|---|---:|---:|---:|',
      exportRows,
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
  let markReady: (() => void) | null = null;
  let markFailed: ((error: Error) => void) | null = null;
  const ready = new Promise<void>((complete, reject) => {
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
    if (readyOutput.includes(`serve: fresh dist/ available at http://127.0.0.1:${String(port)}`)) {
      markReady?.();
    }
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

async function waitForPreview(baseUrl: string, child: ChildProcess): Promise<void> {
  const ready = previewReadiness.get(child);
  if (ready === undefined) throw new Error('Preview readiness was not registered.');
  await Promise.race([
    ready,
    wait(APP_READY_TIMEOUT_MS).then(() => {
      throw new Error(`Preview did not become ready at ${baseUrl}.`);
    }),
  ]);
}

async function stopPreview(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  child.kill('SIGTERM');
  const exited = new Promise<void>((complete) => child.once('exit', () => complete()));
  await Promise.race([exited, wait(5_000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

async function screenshot(
  page: Page,
  recorder: FindingsRecorder,
  label: string,
): Promise<string | null> {
  const safe = label.toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-|-$/gu, '').slice(0, 70);
  const path = resolve(recorder.runDirectory, `${String(recorder.findings.length + 1).padStart(3, '0')}-${safe || 'finding'}.png`);
  try {
    await page.screenshot({ path, fullPage: true });
    return path;
  } catch {
    return null;
  }
}

async function waitVisible(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  step: string,
  locator: Locator,
  timeout = UI_TIMEOUT_MS,
): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout });
    return true;
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, step);
    recorder.add('selector_timeout', phase, step, errorDetail(error), image);
    return false;
  }
}

function attachPageFindingCapture(page: Page, recorder: FindingsRecorder, currentPhase: () => string): void {
  page.on('pageerror', (error) => {
    recorder.add('page_console_error', currentPhase(), 'pageerror', errorDetail(error));
  });
  page.on('console', (message: ConsoleMessage) => {
    if (message.type() !== 'error') return;
    const location = message.location();
    const source = location.url === '' ? '' : ` (${location.url}:${String(location.lineNumber)})`;
    recorder.add('page_console_error', currentPhase(), 'console.error', `${message.text()}${source}`);
  });
}

async function captureRefusals(page: Page, recorder: FindingsRecorder, phase: string): Promise<void> {
  const refusals = page.locator('.dm-decision-refusal');
  for (let index = 0; index < await refusals.count(); index += 1) {
    const refusal = refusals.nth(index);
    const text = (await refusal.textContent())?.trim() ?? '(empty refusal)';
    const code = await refusal.getAttribute('data-refusal-code');
    const category = await refusal.getAttribute('data-refusal-category');
    const key = `${phase}:${code ?? ''}:${category ?? ''}:${text}`;
    if (recorder.seenRefusals.has(key)) continue;
    recorder.seenRefusals.add(key);
    recorder.add(
      'refusal',
      phase,
      'refusal surfaced',
      `${code === null ? '' : `boundary ${code}: `}${category === null ? '' : `category ${category}: `}${text}`,
    );
  }
}

async function resolveDecisionTray(page: Page, recorder: FindingsRecorder, phase: string): Promise<number> {
  let resolved = 0;
  for (let guard = 0; guard < 20; guard += 1) {
    const pending = page.locator('.dm-decision-entry[data-entry-kind="pending"]');
    if (await pending.count() === 0) return resolved;
    const entry = pending.first();
    const heading = (await entry.locator('h3').textContent())?.trim() ?? 'unnamed tray entry';
    const options = entry.getByRole('button');
    if (await options.count() === 0) {
      const image = await screenshot(page, recorder, `tray-${heading}`);
      recorder.add(
        'tray_unresolved',
        phase,
        'resolve decision tray entry',
        `${heading} had no offered option.`,
        image,
      );
      return resolved;
    }
    try {
      await options.first().click({ timeout: 5_000 });
      resolved += 1;
      await wait(20);
    } catch (error: unknown) {
      const image = await screenshot(page, recorder, `tray-${heading}`);
      recorder.add(
        'tray_unresolved',
        phase,
        'resolve decision tray entry',
        `${heading}: ${errorDetail(error)}`,
        image,
      );
      return resolved;
    }
  }
  recorder.add(
    'tray_unresolved',
    phase,
    'resolve decision tray entry',
    'Decision tray still had pending entries after 20 first-option resolutions.',
  );
  return resolved;
}

async function pauseEncounter(page: Page): Promise<void> {
  const pause = await page.locator('[data-pause]').first().getAttribute('data-pause');
  if (pause === 'interrupted') return;
  const interrupt = page.getByRole('button', { name: 'Interrupt', exact: true });
  if (await interrupt.count() > 0) {
    await interrupt.click({ timeout: 5_000 });
    await page.locator('[data-pause="interrupted"]').waitFor({ state: 'visible', timeout: 5_000 });
  }
}

async function assignAlgorithms(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
): Promise<boolean> {
  try {
    await pauseEncounter(page);
    for (let guard = 0; guard < 40; guard += 1) {
      const human = page.locator('.dm-controller-assignments select').filter({ has: page.locator('option:checked[value="human"]') });
      if (await human.count() === 0) break;
      await human.first().selectOption('algorithm');
      await wait(10);
    }
    const selects = page.locator('.dm-controller-assignments select');
    const values = await selects.evaluateAll((nodes) => nodes.map((node) =>
      node instanceof HTMLSelectElement ? node.value : 'not-a-select'));
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
  const raw = await page.locator('.dm-initiative-timeline').getAttribute('data-round');
  const round = Number(raw);
  return Number.isSafeInteger(round) ? round : 0;
}

async function encounterSideState(
  page: Page,
  monsterIdFragment: string,
): Promise<{ readonly playersAlive: number; readonly monstersAlive: number }> {
  const entries = page.locator('.dm-initiative li[data-combatant-id]');
  let playersAlive = 0;
  let monstersAlive = 0;
  for (let index = 0; index < await entries.count(); index += 1) {
    const entry = entries.nth(index);
    const id = await entry.getAttribute('data-combatant-id') ?? '';
    const life = await entry.getAttribute('data-life');
    if (life === 'dead') continue;
    if (id.includes(monsterIdFragment)) monstersAlive += 1;
    else playersAlive += 1;
  }
  return { playersAlive, monstersAlive };
}

async function tryTimelineControls(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  progress: TimelineProgress,
): Promise<void> {
  if (!progress.previewListed) {
    const actualEvents = page.locator('.dm-next-event-preview [data-event-kind]');
    if (await actualEvents.count() > 0) progress.previewListed = true;
  }
  if (!progress.delayUsed) {
    const delay = page.getByRole('button', { name: 'Delay turn', exact: true });
    if (await delay.count() > 0) {
      try {
        await delay.click({ timeout: 5_000 });
        progress.delayUsed = true;
      } catch (error: unknown) {
        recorder.add('scripted_nudge', phase, 'delay one turn', errorDetail(error));
      }
    }
  }
  if (!progress.rewindUsed && await roundOf(page) >= 2) {
    const rewind = page.getByRole('button', { name: /^Rewind to round 1$/u });
    if (await rewind.count() > 0) {
      try {
        await rewind.first().click({ timeout: 5_000 });
        await wait(30);
        progress.rewindUsed = true;
        progress.rewindRound = await roundOf(page);
        // Rewind restores the controller identities captured at that boundary.
        // The driver must therefore re-apply its UI assignment before asking
        // the restored branch to continue.
        await assignAlgorithms(page, recorder, phase);
      } catch (error: unknown) {
        recorder.add('scripted_nudge', phase, 'rewind to round 1', errorDetail(error));
      }
    }
  }
  if (progress.rewindUsed && !progress.continuedForward && await roundOf(page) >= 2) {
    progress.continuedForward = true;
  }
}

async function pulseTurn(page: Page): Promise<void> {
  const pause = await page.locator('[data-pause]').first().getAttribute('data-pause');
  if (pause !== 'none') {
    const resume = page.getByRole('button', { name: 'Resume', exact: true });
    if (await resume.count() > 0) await resume.click({ timeout: 5_000 });
  }
  await wait(TURN_PULSE_MS);
  const interrupt = page.getByRole('button', { name: 'Interrupt', exact: true });
  if (await interrupt.count() > 0) await interrupt.click({ timeout: 5_000 });
  await wait(10);
}

async function playEncounter(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  monsterIdFragment: string,
  timeline: TimelineProgress,
): Promise<EncounterOutcome> {
  let lastRound = await roundOf(page);
  let unchangedAttempts = 0;
  for (let attempt = 1; attempt <= MAX_TURN_ATTEMPTS; attempt += 1) {
    await captureRefusals(page, recorder, phase);
    await resolveDecisionTray(page, recorder, phase);
    const side = await encounterSideState(page, monsterIdFragment);
    if (side.monstersAlive === 0 && side.playersAlive > 0) {
      return { kind: 'victory', round: await roundOf(page), attempts: attempt - 1 };
    }
    if (side.playersAlive === 0 && side.monstersAlive > 0) {
      return { kind: 'defeat', round: await roundOf(page), attempts: attempt - 1 };
    }
    await tryTimelineControls(page, recorder, phase, timeline);
    try {
      await pulseTurn(page);
    } catch (error: unknown) {
      recorder.add('scripted_nudge', phase, 'turn pulse through DM controls', errorDetail(error));
    }
    const round = await roundOf(page);
    if (round === lastRound) unchangedAttempts += 1;
    else {
      lastRound = round;
      unchangedAttempts = 0;
    }
    if (unchangedAttempts < ROUND_STALL_ATTEMPTS) continue;
    await captureRefusals(page, recorder, phase);
    await resolveDecisionTray(page, recorder, phase);
    const afterResolution = await roundOf(page);
    if (afterResolution !== lastRound) {
      lastRound = afterResolution;
      unchangedAttempts = 0;
      continue;
    }
    const image = await screenshot(page, recorder, `${phase}-round-stall`);
    recorder.add(
      'turn_advance_stall',
      phase,
      'advance algorithm-controlled turns',
      `Round ${String(lastRound)} did not change after ${String(ROUND_STALL_ATTEMPTS)} attempts.`,
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

async function resetApplication(page: Page, baseUrl: string, recorder: FindingsRecorder): Promise<boolean> {
  const phase = 'new session';
  await page.goto(baseUrl);
  if (!await waitVisible(page, recorder, phase, 'wait for application database', page.locator('#status[data-ready="true"]'))) {
    recorder.phase(phase, 'aborted', 'Application database did not become ready.');
    return false;
  }
  try {
    await page.evaluate(async () => window.staticApp.reset());
    await page.reload();
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
  await page.goto(`${baseUrl}/vtt?encounter=d365`);
  const loader = page.getByRole('button', { name: 'Load bundled dungeon and party', exact: true });
  if (!await waitVisible(page, recorder, phase, 'open bundled dungeon loader', loader)) {
    recorder.phase(phase, 'aborted', 'Bundled dungeon loader was unavailable.');
    return false;
  }
  await loader.click();
  if (!await waitVisible(page, recorder, phase, 'author representative party and mount DM controls', page.getByRole('heading', { name: 'DM controls' }))) {
    recorder.phase(phase, 'aborted', 'Representative party did not load.');
    return false;
  }
  const players = page.locator('.encounter-token[data-kind="player_character"]');
  if (await players.count() !== 4) {
    const image = await screenshot(page, recorder, 'representative-party-count');
    recorder.add('selector_timeout', phase, 'load representative party', `Expected 4 player tokens; found ${String(await players.count())}.`, image);
    recorder.phase(phase, 'aborted', 'Representative party roster was incomplete.');
    return false;
  }
  recorder.add(
    'scripted_nudge',
    phase,
    'select deterministic seed',
    'The start flow offers no seed control. The local host uses its fixed internal seed, but the session cannot select or disclose it through the UI.',
  );
  recorder.phase(phase, 'completed', 'Loaded Mirel Ash, Orin Reed, Brann Vale, and Sera Dawn through the bundled start flow.');
  return true;
}

async function advanceDungeonRoom(
  page: Page,
  recorder: FindingsRecorder,
  room: number,
): Promise<boolean> {
  const phase = `dungeon room ${String(room)}`;
  const roomStatus = page.locator(`.adventuring-day-status[data-room="${String(room)}"]`);
  if (!await waitVisible(page, recorder, phase, `enter dungeon room ${String(room)}`, roomStatus, 10_000)) {
    recorder.phase(phase, 'aborted', 'Room status did not match the requested room.');
    return false;
  }
  if (!await assignAlgorithms(page, recorder, phase)) {
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
  const shortRest = page.getByRole('button', { name: 'Take Short Rest and enter next room', exact: true });
  const direct = page.getByRole('button', { name: 'End room and enter next room', exact: true });
  const control = await shortRest.count() > 0 ? shortRest : direct;
  const label = await shortRest.count() > 0 ? 'short rest' : 'room transition';
  if (!await waitVisible(page, recorder, phase, `${label} after room ${String(completedRoom)}`, control, 10_000)) {
    return false;
  }
  await control.click();
  return waitVisible(
    page,
    recorder,
    phase,
    `enter room ${String(completedRoom + 1)}`,
    page.locator(`.adventuring-day-status[data-room="${String(completedRoom + 1)}"]`),
    10_000,
  );
}

async function completeLongRest(page: Page, recorder: FindingsRecorder): Promise<boolean> {
  const phase = 'long rest';
  const button = page.getByRole('button', { name: 'Complete Long Rest and end adventuring day', exact: true });
  if (!await waitVisible(page, recorder, phase, 'trigger DM long-rest flow', button, 10_000)) {
    recorder.phase(phase, 'aborted', 'DM long-rest control was unavailable.');
    return false;
  }
  await button.click();
  const ended = await waitVisible(
    page,
    recorder,
    phase,
    'wait for completed long rest',
    page.locator('.adventuring-day-status[data-status="ended_by_long_rest"]'),
    10_000,
  );
  recorder.phase(phase, ended ? 'completed' : 'aborted', ended
    ? 'DM long-rest flow ended the adventuring day and rendered its summary card.'
    : 'Adventuring day did not reach the ended state.');
  return ended;
}

async function configureSaveFolder(page: Page, recorder: FindingsRecorder, phase: string): Promise<boolean> {
  const manager = page.locator('.dm-save-manager');
  if (!await waitVisible(page, recorder, phase, 'open save manager', manager, 10_000)) return false;
  if (await manager.getAttribute('data-mode') === 'folder') return true;
  const choose = manager.getByRole('button', { name: 'Choose default folder', exact: true });
  if (!await waitVisible(page, recorder, phase, 'choose default save folder', choose, 10_000)) return false;
  await choose.click();
  return waitVisible(page, recorder, phase, 'activate default save folder', page.locator('.dm-save-manager[data-mode="folder"]'), 10_000);
}

async function saveCurrentToFolder(page: Page, recorder: FindingsRecorder, phase: string): Promise<Locator | null> {
  if (!await configureSaveFolder(page, recorder, phase)) return null;
  const before = await page.locator('.dm-save-row[data-source="folder"]').count();
  const save = page.getByRole('button', { name: 'Save now', exact: true });
  if (!await waitVisible(page, recorder, phase, 'create manual file save', save, 10_000)) return null;
  await save.click();
  try {
    await page.waitForFunction((count) =>
      document.querySelectorAll('.dm-save-row[data-source="folder"]').length >= Number(count), before === 0 ? 1 : before);
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, 'manual-file-save');
    recorder.add('selector_timeout', phase, 'create manual file save', errorDetail(error), image);
    return null;
  }
  return page.locator('.dm-save-row[data-source="folder"]').first();
}

async function downloadExport(
  page: Page,
  row: Locator,
  recorder: FindingsRecorder,
  phase: string,
  label: string,
): Promise<SessionExport | null> {
  const button = row.getByRole('button', { name: 'Export copy', exact: true });
  if (!await waitVisible(page, recorder, phase, `export ${label} session record`, button, 10_000)) return null;
  try {
    const pendingDownload = page.waitForEvent('download', { timeout: 10_000 });
    await button.click();
    const download: Download = await pendingDownload;
    const filename = `${label}.vtt.json`;
    const path = resolve(recorder.runDirectory, filename);
    await download.saveAs(path);
    const bytes = await readFile(path, 'utf8');
    const value: unknown = JSON.parse(bytes);
    const sessionRecord = isRecord(value) && isRecord(value.sessionRecord)
      ? value.sessionRecord
      : null;
    const encounters = sessionRecord === null ? null : sessionRecord.encounters;
    const result: SessionExport = {
      phase,
      filename,
      encounterCount: Array.isArray(encounters) ? encounters.length : 0,
      parsed: true,
      hasSessionRecord: Array.isArray(encounters),
      hasAlarm: bytes.includes('cinder-wave-1-a') || bytes.includes('alarm_used'),
      hasIgnition: bytes.includes('surface_ignited') || /"burningCells":\[(?!\])/u.test(bytes),
    };
    recorder.exports.push(result);
    return result;
  } catch (error: unknown) {
    recorder.add('scripted_nudge', phase, `export ${label} session record`, errorDetail(error));
    recorder.exports.push({
      phase,
      filename: `${label}.vtt.json`,
      encounterCount: 0,
      parsed: false,
      hasSessionRecord: false,
      hasAlarm: false,
      hasIgnition: false,
    });
    return null;
  }
}

async function saveManagerRoundTrip(
  page: Page,
  recorder: FindingsRecorder,
): Promise<SessionExport | null> {
  const phase = 'save manager';
  const browserRows = page.locator('.dm-save-row[data-source="browser"]');
  const perRound = browserRows.filter({ has: page.locator('.dm-save-pool', { hasText: /^Per-round autosave$/u }) });
  const boundary = browserRows.filter({ has: page.locator('.dm-save-pool', { hasText: /^Encounter-boundary autosave$/u }) });
  const poolsPresent = await waitVisible(page, recorder, phase, 'find per-round autosave pool', perRound, 10_000) &&
    await waitVisible(page, recorder, phase, 'find encounter-boundary autosave pool', boundary, 10_000);
  const row = await saveCurrentToFolder(page, recorder, phase);
  if (row === null) {
    recorder.phase(phase, 'aborted', 'Could not create a manual file save.');
    return null;
  }
  await pauseEncounter(page);
  const history = page.locator('details ol [data-revision]');
  await page.getByText('Full revision history', { exact: true }).click();
  const revisionCount = await history.count();
  const exported = await downloadExport(page, row, recorder, phase, 'd365-session');
  const load = row.getByRole('button', { name: 'Load', exact: true });
  if (!await waitVisible(page, recorder, phase, 'load manual save', load, 10_000)) {
    recorder.phase(phase, 'aborted', 'Manual save could not be loaded.');
    return exported;
  }
  await load.click();
  const mounted = await waitVisible(page, recorder, phase, 'mount loaded save', page.getByRole('heading', { name: 'DM controls' }), 20_000);
  if (mounted) {
    await page.getByText('Full revision history', { exact: true }).click();
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
  const complete = poolsPresent && mounted && exported?.parsed === true && exported.hasSessionRecord;
  recorder.phase(phase, complete ? 'completed' : 'aborted', complete
    ? `Found both autosave pools, created and loaded a manual file save, and parsed ${String(exported.encounterCount)} exported encounter records.`
    : 'One or more save-manager checks did not complete.');
  return exported;
}

async function openVaneFight(
  page: Page,
  baseUrl: string,
  recorder: FindingsRecorder,
  fightName: string,
): Promise<boolean> {
  const phase = `Vane Warren — ${fightName}`;
  await page.goto(`${baseUrl}/vtt?encounter=vane-warren`);
  const load = page.getByRole('button', { name: `Load ${fightName}`, exact: true });
  if (!await waitVisible(page, recorder, phase, `load ${fightName}`, load)) {
    recorder.phase(phase, 'aborted', 'Fight loader was unavailable.');
    return false;
  }
  await load.click();
  const heading = page.getByRole('heading', { name: 'DM controls' });
  const status = page.locator('.vane-warren-loader-status');
  const deadline = Date.now() + UI_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await heading.count() > 0 && await heading.isVisible()) return true;
    const message = await status.evaluate((node) =>
      node instanceof HTMLOutputElement ? node.value.trim() : node.textContent?.trim() ?? '');
    if (message !== '' && !message.startsWith('Authoring the bundled')) {
      const image = await screenshot(page, recorder, `mount-${fightName}`);
      recorder.add('selector_timeout', phase, `mount ${fightName}`, `Loader stopped before DM controls mounted: ${message}`, image);
      recorder.phase(phase, 'aborted', 'Fight loader surfaced a terminal UI dead end.');
      return false;
    }
    await wait(100);
  }
  const image = await screenshot(page, recorder, `mount-${fightName}`);
  recorder.add('selector_timeout', phase, `mount ${fightName}`, 'DM controls did not mount before the loader timeout.', image);
  recorder.phase(phase, 'aborted', 'Fight did not mount.');
  return false;
}

async function resetCharacterDatabaseForVaneFight(
  page: Page,
  baseUrl: string,
  recorder: FindingsRecorder,
  phase: string,
): Promise<boolean> {
  try {
    await page.goto(baseUrl);
    await page.locator('#status[data-ready="true"]').waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS });
    await page.evaluate(() => {
      const keys: string[] = [];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith('srd55:vtt') === true) keys.push(key);
      }
      for (const key of keys) localStorage.removeItem(key);
    });
    await page.evaluate(async () => window.staticApp.reset());
    await page.reload();
    await page.locator('#status[data-ready="true"]').waitFor({ state: 'visible', timeout: UI_TIMEOUT_MS });
    recorder.add(
      'scripted_nudge',
      phase,
      'prepare representative party for separate fight loader',
      'Each Vane Warren loader authors the same fixed representative party again and uses a separate session ID; the driver exported prior work, then reset character and VTT browser storage so duplicate-operation and quota failures would not prevent the next loader from mounting.',
    );
    return true;
  } catch (error: unknown) {
    const image = await screenshot(page, recorder, 'reset-vane-character-database');
    recorder.add('selector_timeout', phase, 'reset character database for fight loader', errorDetail(error), image);
    return false;
  }
}

async function exportCurrentFight(
  page: Page,
  recorder: FindingsRecorder,
  phase: string,
  slug: string,
): Promise<SessionExport | null> {
  const row = await saveCurrentToFolder(page, recorder, phase);
  return row === null ? null : downloadExport(page, row, recorder, phase, slug);
}

async function main(): Promise<void> {
  const options = await parseOptions(process.argv.slice(2));
  const runDirectory = resolve('.tmp-rehearsal', `${options.date}-run-${String(options.run)}`);
  const reportPath = resolve('docs/rehearsal', `${options.date}-run-${String(options.run)}.md`);
  await mkdir(runDirectory, { recursive: true });
  const recorder = new FindingsRecorder(options.date, options.run, runDirectory, reportPath);
  const baseUrl = `http://127.0.0.1:${String(options.port)}`;
  let currentPhase = 'preview startup';
  let preview: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    preview = await startPreview(options.port, resolve(runDirectory, 'preview.log'));
    await waitForPreview(baseUrl, preview);
    recorder.phase('preview startup', 'completed', 'Fresh npm build passed and the built preview accepted requests.');

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ acceptDownloads: true, baseURL: baseUrl });
    await context.addInitScript(() => {
      Reflect.set(window, 'showDirectoryPicker', async () => navigator.storage.getDirectory());
    });
    const page = await context.newPage();
    attachPageFindingCapture(page, recorder, () => currentPhase);

    currentPhase = 'new session';
    const reset = await resetApplication(page, baseUrl, recorder);
    currentPhase = 'representative party';
    const dungeonLoaded = reset && await loadDungeon(page, baseUrl, recorder);
    const timeline: TimelineProgress = {
      previewListed: false,
      delayUsed: false,
      rewindUsed: false,
      continuedForward: false,
      rewindRound: null,
    };

    if (dungeonLoaded) {
      for (let room = 1; room <= 4; room += 1) {
        currentPhase = `dungeon room ${String(room)}`;
        if (!await advanceDungeonRoom(page, recorder, room)) continue;
        const outcome = await playEncounter(page, recorder, currentPhase, `d365-room-${String(room)}-monster`, timeline);
        recorder.phase(currentPhase, outcome.kind === 'aborted' ? 'aborted' : 'completed',
          `${outcome.kind} at round ${String(outcome.round)} after ${String(outcome.attempts)} driver pulses.`);
        if (room === 4) continue;
        if (outcome.kind === 'aborted') {
          recorder.add(
            'scripted_nudge',
            currentPhase,
            'leave an aborted dungeon room',
            'The turn phase stalled; the driver attempted the offered room-boundary control so later rooms could still be rehearsed.',
          );
        }
        await transitionToNextDungeonRoom(page, recorder, room);
      }
      currentPhase = 'long rest';
      await completeLongRest(page, recorder);
      currentPhase = 'save manager';
      await saveManagerRoundTrip(page, recorder);
    }

    const fights = [
      { name: 'The Cinder Rite', slug: 'cinder-rite' },
      { name: 'The Iron Voice', slug: 'iron-voice' },
      { name: 'The Last Muster', slug: 'last-muster' },
    ] as const;
    for (const [index, fight] of fights.entries()) {
      currentPhase = `Vane Warren — ${fight.name}`;
      if (!await resetCharacterDatabaseForVaneFight(page, baseUrl, recorder, currentPhase)) {
        recorder.phase(currentPhase, 'aborted', 'Could not prepare the fixed representative-party loader.');
        continue;
      }
      if (!await openVaneFight(page, baseUrl, recorder, fight.name)) continue;
      if (!await assignAlgorithms(page, recorder, currentPhase)) {
        recorder.phase(currentPhase, 'aborted', 'Could not assign every combatant to the algorithm controller.');
        continue;
      }
      const outcome = await playEncounter(page, recorder, currentPhase, 'vane-warren', timeline);
      const exported = await exportCurrentFight(page, recorder, currentPhase, `vane-${fight.slug}`);
      if (fight.slug === 'cinder-rite' && exported?.hasAlarm !== true) {
        recorder.add(
          'scripted_nudge',
          currentPhase,
          'sound Cinder Rite alarm',
          'The board renders the war drum, but controller legal actions and DM tools expose no alarm interaction; the exported encounter contains no deployed alarm wave.',
        );
      }
      if (exported?.hasIgnition !== true) {
        recorder.add(
          'scripted_nudge',
          currentPhase,
          'ignite a surface from the brazier',
          'The board renders braziers and flammable surfaces, but no controller action or DM tool can place fire or invoke the ignition chain.',
        );
      }
      recorder.phase(currentPhase, outcome.kind === 'aborted' ? 'aborted' : 'completed',
        `${outcome.kind} at round ${String(outcome.round)}; export parsed ${String(exported?.encounterCount ?? 0)} encounter record(s).`);
      if (index < fights.length - 1) {
        const nextControl = page.getByRole('button', { name: /Load The (?:Iron Voice|Last Muster)/u });
        if (await nextControl.count() === 0) {
          recorder.add(
            'scripted_nudge',
            currentPhase,
            'continue to the next Vane Warren fight',
            'The completed fight offers no in-session next-fight path; the driver returned to the bundle selector by URL.',
          );
        }
      }
    }

    currentPhase = 'timeline';
    const timelineComplete = timeline.previewListed && timeline.delayUsed &&
      timeline.rewindUsed && timeline.continuedForward;
    if (!timelineComplete) {
      recorder.add(
        'scripted_nudge',
        currentPhase,
        'complete timeline exercise',
        `Timeline coverage was preview=${String(timeline.previewListed)}, delay=${String(timeline.delayUsed)}, rewind=${String(timeline.rewindUsed)}, forward=${String(timeline.continuedForward)}.`,
      );
    }
    recorder.phase(currentPhase, timelineComplete ? 'completed' : 'aborted', timelineComplete
      ? `Listed scheduled events, delayed once, rewound to round ${String(timeline.rewindRound)}, and advanced forward again.`
      : 'One or more required timeline controls could not be exercised during the played encounters.');

    currentPhase = 'end session and export coverage';
    const totalEncounters = recorder.exports.reduce((total, entry) => total + entry.encounterCount, 0);
    const allParsed = recorder.exports.length === 4 && recorder.exports.every((entry) => entry.parsed && entry.hasSessionRecord);
    const endSessionControl = page.getByRole('button', { name: /End session/u });
    if (await endSessionControl.count() === 0) {
      recorder.add(
        'scripted_nudge',
        currentPhase,
        'end session',
        'No end-session control exists. The driver paused at the final encounter and exported through the save manager.',
      );
    }
    if (recorder.exports.length > 1) {
      recorder.add(
        'scripted_nudge',
        currentPhase,
        'verify one export covers everything played',
        'The dungeon and each Vane Warren fight use separate session IDs, so no single application export can contain all seven played encounters; coverage was verified across four parsed exports.',
      );
    }
    const coverage = allParsed && totalEncounters === 7;
    recorder.phase(currentPhase, coverage ? 'completed' : 'aborted', coverage
      ? 'Four application exports parsed and their structured encounter lists cover all seven played encounters.'
      : `Parsed export coverage was ${String(totalEncounters)} encounters across ${String(recorder.exports.length)} files; expected seven across four files.`);

    await context.close();
  } catch (error: unknown) {
    recorder.add('page_console_error', currentPhase, 'driver infrastructure', errorDetail(error));
    recorder.phase(currentPhase, 'aborted', 'Driver infrastructure stopped this phase.');
  } finally {
    await browser?.close().catch(() => undefined);
    if (preview !== null) await stopPreview(preview);
    await recorder.write(baseUrl);
    process.stdout.write(`\n${recorder.summaryBlock()}\n\nFindings: ${recorder.reportPath}\n`);
  }
}

await main();
