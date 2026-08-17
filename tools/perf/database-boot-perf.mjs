/**
 * Measures the two numbers that decide how the front door feels:
 *
 *   1. `create_ready_ms` — how long "Create a character" takes to produce the
 *      class chooser when it is clicked at the WORST moment, which is
 *      immediately after load, while the database worker is still booting. The
 *      clock starts when the click is issued, so a click that has to wait for
 *      the control to exist pays the whole remaining boot.
 *   2. The boot split — the `srd55-db-boot:*` performance measures recorded by
 *      src/main.ts: worker startup, wasm, OPFS pool, schema, catalog seed.
 *
 * Every run uses a FRESH browser context, so OPFS starts empty and the boot
 * seeds the catalog. That is the cold, worst-case profile; a returning visitor
 * is faster and is not what this measures.
 *
 * Usage:
 *   node tools/perf/database-boot-perf.mjs --url http://127.0.0.1:5321 \
 *     [--runs 5] [--dawdle-ms 0] [--label baseline]
 */
import { chromium } from '@playwright/test';

const BOOT_MEASURE_PREFIX = 'srd55-db-boot:';
const CAPABILITY_MEASURE = 'srd55-browser-capability-probe';

function parseArguments(argv) {
  const options = {
    url: 'http://127.0.0.1:5321',
    runs: 5,
    dawdleMs: 0,
    label: 'run',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (value === undefined) {
      throw new Error(`${flag} requires a value.`);
    }
    index += 1;
    if (flag === '--url') options.url = value;
    else if (flag === '--runs') options.runs = Number(value);
    else if (flag === '--dawdle-ms') options.dawdleMs = Number(value);
    else if (flag === '--label') options.label = value;
    else throw new Error(`Unknown argument ${JSON.stringify(flag)}.`);
  }
  if (!Number.isSafeInteger(options.runs) || options.runs < 1) {
    throw new Error('--runs must be a positive integer.');
  }
  if (!Number.isFinite(options.dawdleMs) || options.dawdleMs < 0) {
    throw new Error('--dawdle-ms must be a non-negative number.');
  }
  return options;
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

async function measureOnce(browser, options) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(options.url, { waitUntil: 'commit' });
    if (options.dawdleMs > 0) {
      await page.waitForTimeout(options.dawdleMs);
    }
    const clickedAt = Date.now();
    await page.getByRole('link', { name: 'Create a character', exact: true })
      .click({ timeout: 60_000 });
    await page.locator('[data-class-option]').first().waitFor({
      state: 'visible',
      timeout: 60_000,
    });
    const createReadyMs = Date.now() - clickedAt;
    const marks = await page.evaluate(
      ({ bootPrefix, capabilityMeasure }) => {
        const measures = performance.getEntriesByType('measure');
        const phases = {};
        // The phase that opens the boot starts at `new Worker(...)`, so its
        // startTime is the answer to "how long did the page take to get to
        // constructing the database worker at all".
        let workerActivatedAtMs = null;
        for (const measure of measures) {
          if (measure.name.startsWith(bootPrefix)) {
            const phase = measure.name.slice(bootPrefix.length);
            phases[phase] = measure.duration;
            if (phase === 'total') {
              workerActivatedAtMs = measure.startTime;
            }
          }
        }
        const capability = measures.find(
          (measure) => measure.name === capabilityMeasure,
        );
        return {
          phases,
          workerActivatedAtMs,
          capabilityProbeMs: capability === undefined
            ? null
            : capability.duration,
        };
      },
      {
        bootPrefix: BOOT_MEASURE_PREFIX,
        capabilityMeasure: CAPABILITY_MEASURE,
      },
    );
    return { createReadyMs, ...marks };
  } finally {
    await context.close();
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const browser = await chromium.launch();
  const results = [];
  try {
    for (let run = 0; run < options.runs; run += 1) {
      const result = await measureOnce(browser, options);
      results.push(result);
      process.stdout.write(
        `run ${String(run + 1)}: create_ready_ms=${String(result.createReadyMs)} ` +
          `total=${String(round(result.phases['total'] ?? Number.NaN))}\n`,
      );
    }
  } finally {
    await browser.close();
  }

  const phaseNames = [
    'worker_startup',
    'loading_engine',
    'opening_storage',
    'checking_structure',
    // A stamped boot (D283) reports this INSTEAD of checking_structure and
    // never reports verifying_catalog_integrity, so "(not reported)" against
    // those two is how a fast boot reads here.
    'reusing_verification',
    'checking_bundled_rules',
    'verifying_catalog_integrity',
    'total',
  ];
  const createReady = results.map((result) => result.createReadyMs);
  process.stdout.write(
    `\n[${options.label}] url=${options.url} runs=${String(options.runs)} ` +
      `dawdle_ms=${String(options.dawdleMs)}\n`,
  );
  process.stdout.write(
    `create_ready_ms median=${String(median(createReady))} ` +
      `min=${String(Math.min(...createReady))} ` +
      `max=${String(Math.max(...createReady))} ` +
      `all=${createReady.join(',')}\n`,
  );
  const activations = results
    .map((result) => result.workerActivatedAtMs)
    .filter((value) => value !== null);
  if (activations.length > 0) {
    process.stdout.write(
      `worker_activated_at_ms median=${String(round(median(activations)))} ` +
        `all=${activations.map(round).join(',')}\n`,
    );
  }
  const probes = results
    .map((result) => result.capabilityProbeMs)
    .filter((value) => value !== null);
  if (probes.length > 0) {
    process.stdout.write(
      `capability_probe_ms median=${String(round(median(probes)))}\n`,
    );
  }
  process.stdout.write('boot split (median ms):\n');
  for (const name of phaseNames) {
    const durations = results
      .map((result) => result.phases[name])
      .filter((value) => value !== undefined);
    if (durations.length === 0) {
      process.stdout.write(`  ${name.padEnd(28)} (not reported)\n`);
      continue;
    }
    process.stdout.write(
      `  ${name.padEnd(28)} ${String(round(median(durations))).padStart(8)}` +
        `   (n=${String(durations.length)}, ` +
        `${durations.map(round).join(', ')})\n`,
    );
  }
}

await main();
