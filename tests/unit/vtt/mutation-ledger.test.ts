import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface LedgerEntry {
  readonly mutation: number | string;
  readonly name: string;
  readonly testFile: string;
  readonly testName: string;
}

interface MutationLedger {
  readonly schemaVersion: number;
  readonly entries: readonly LedgerEntry[];
}

const LEDGER_PATH = 'docs/audits/2026-08-20-vtt-phase2-mutation-ledger.json';
const INCREMENT_NINE_LEDGER_PATH = 'docs/audits/2026-08-20-vtt-increment-9-mutation-ledger.md';
const INCREMENT_TEN_LEDGER_PATH = 'docs/audits/2026-08-20-vtt-increment-10-mutation-ledger.md';
const SOAK_PARTY_LEDGER_PATH = 'docs/audits/2026-08-20-vtt-soak-party-wiring-mutation-ledger.md';
const PLAN_PATH = 'docs/design/2026-08-19-vtt-phase2-movement-controllers.md';

function ledger(): MutationLedger {
  const parsed: unknown = JSON.parse(readFileSync(LEDGER_PATH, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Mutation ledger must be an object.');
  }
  const candidate = parsed as Readonly<Record<string, unknown>>;
  if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.entries)) {
    throw new TypeError('Mutation ledger schema is malformed.');
  }
  return parsed as MutationLedger;
}

describe('phase-2 mutation ledger manifest', () => {
  it('MUTATION-LEDGER-MANIFEST pins every plan mutation 1-66 to a present named killing test', () => {
    const manifest = ledger();
    const plan = readFileSync(PLAN_PATH, 'utf8');
    const numeric = manifest.entries.filter(
      (entry): entry is LedgerEntry & { readonly mutation: number } =>
        typeof entry.mutation === 'number',
    );

    expect(numeric.map((entry) => entry.mutation)).toEqual(
      Array.from({ length: 66 }, (_value, index) => index + 1),
    );
    expect(new Set(manifest.entries.map((entry) => entry.name)).size).toBe(
      manifest.entries.length,
    );
    for (const entry of numeric) {
      expect(plan).toContain(`${entry.mutation}. \`${entry.name}\``);
      const source = readFileSync(entry.testFile, 'utf8');
      expect(source, `${entry.mutation} ${entry.name}`).toContain(entry.testName);
    }
  });

  it('MUTATION-LEDGER-NEGATIVE-CONTROLS retains mutations 61-66 and both own controls', () => {
    const manifest = ledger();
    const expectedNames = [
      'telemetry_omits_rng_transition',
      'controller_response_misattributed',
      'latency_changes_replay_hash',
      'replay_calls_live_controller',
      'void_branch_replayed_as_live',
      'projection_divergence_ignored',
      'token_counts_influence_reducer',
      'bundle_version_outside_window_accepted',
    ];
    expect(manifest.entries.slice(-8).map((entry) => entry.name)).toEqual(expectedNames);
  });

  it('MUTATION-LEDGER-DOCUMENTS keeps the prior increment handoff and its 55-60 rows', () => {
    const incrementNine = readFileSync(INCREMENT_NINE_LEDGER_PATH, 'utf8');
    for (let mutation = 55; mutation <= 60; mutation += 1) {
      expect(incrementNine).toContain(`| ${mutation} \``);
    }
    const incrementTen = readFileSync(INCREMENT_TEN_LEDGER_PATH, 'utf8');
    for (let mutation = 61; mutation <= 66; mutation += 1) {
      expect(incrementTen).toContain(`| ${mutation} \``);
    }
    expect(incrementTen).toContain('| Own `token_counts_influence_reducer`');
    expect(incrementTen).toContain('| Own `bundle_version_outside_window_accepted`');
  });

  it('SOAK-PARTY-MUTATION-LEDGER pins all required controls and the own control', () => {
    const ledger = readFileSync(SOAK_PARTY_LEDGER_PATH, 'utf8');
    for (const name of [
      'gap_report_swallowed',
      'fifty_fifty_skewed',
      'pack_smuggles_raw_text',
      'duplicate_engine_id_accepted',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
  });
});
