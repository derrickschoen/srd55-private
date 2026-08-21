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
const LIVE_PLAN_CORRECTION_LEDGER_PATH = 'docs/audits/2026-08-20-vtt-live-plan-correction-mutation-ledger.md';
const JS_TURN_PROGRAM_LEDGER_PATH = 'docs/audits/2026-08-20-js-turn-program-mutation-ledger.md';
const TURN_PROGRAM_LIBRARY_LEDGER_PATH = 'docs/audits/2026-08-20-turn-program-library-mutation-ledger.md';
const E04_E06_LEDGER_PATH = 'docs/audits/2026-08-20-e04-e06-engine-prerequisites-mutation-ledger.md';
const E01_EXPERIMENT_LEDGER_PATH = 'docs/audits/2026-08-20-e01-experiment-orchestrator-mutation-ledger.md';
const PARTY_EFFECTS_LEDGER_PATH = 'docs/audits/2026-08-20-party-pack-v2-effects-mutation-ledger.md';
const EFFECT_FAMILIES_LEDGER_PATH = 'docs/audits/2026-08-21-party-pack-effect-families-mutation-ledger.md';
const PARTY_MULTISOURCE_LEDGER_PATH = 'docs/audits/2026-08-21-party-pack-multisource-mutation-ledger.md';
const REGRET_ORACLE_LEDGER_PATH = 'docs/audits/2026-08-21-vtt-regret-mutation-ledger.md';
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

  it('LIVE-PLAN-CORRECTION-MUTATION-LEDGER pins the strict malformed-plan control', () => {
    const ledger = readFileSync(LIVE_PLAN_CORRECTION_LEDGER_PATH, 'utf8');
    expect(ledger).toContain('`malformed_plan_accepted`');
    expect(ledger).toContain('malformed_plan_accepted keeps the strict decoder closed');
    expect(ledger).toContain('Restored `z.strictObject`');
  });

  it('EFFECT-FAMILIES-MUTATION-LEDGER pins all four required controls to named killing tests', () => {
    const ledger = readFileSync(EFFECT_FAMILIES_LEDGER_PATH, 'utf8');
    for (const name of [
      'rider_fires_twice_per_turn',
      'smite_dice_not_doubled_on_crit',
      'bonus_attack_always_legal',
      'rider_condition_ignored',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(ledger).not.toContain(`| \`${name}\` | Pending execution`);
    }
  });

  it('JS-TURN-PROGRAM-MUTATION-LEDGER pins all required controls and both own controls', () => {
    const ledger = readFileSync(JS_TURN_PROGRAM_LEDGER_PATH, 'utf8');
    for (const name of [
      'forbidden_construct_executes',
      'step_budget_ignored',
      'interpreter_bypasses_validation',
      'projection_order_changes_query',
      'js_source_missing_from_replay',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
  });

  it('TURN-PROGRAM-LIBRARY-MUTATION-LEDGER pins both required controls and the fraction control', () => {
    const ledger = readFileSync(TURN_PROGRAM_LIBRARY_LEDGER_PATH, 'utf8');
    for (const name of [
      'helper_bypasses_validation',
      'rider_searched_independently',
      'fraction_hp_not_scaled',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
    expect(ledger).toContain('| exit 1 | exit 0 |');
  });

  it('E04-E06-MUTATION-LEDGER pins the three required controls and the deterministic-set control', () => {
    const ledger = readFileSync(E04_E06_LEDGER_PATH, 'utf8');
    for (const name of [
      'override_invents_action',
      'delta_skips_hash_check',
      'trigger_policy_ignored',
      'override_order_nondeterministic',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
  });

  it('E01-EXPERIMENT-MUTATION-LEDGER pins the three required controls and shared-validator control', () => {
    const ledger = readFileSync(E01_EXPERIMENT_LEDGER_PATH, 'utf8');
    for (const name of [
      'arms_unpaired',
      'shuffle_uses_wallclock',
      'report_drops_aborted_tables',
      'contract_variant_changes_validator',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
  });

  it('PARTY-EFFECTS-MUTATION-LEDGER pins all five D325.1 negative controls', () => {
    const ledger = readFileSync(PARTY_EFFECTS_LEDGER_PATH, 'utf8');
    for (const name of [
      'rider_never_fires',
      'pool_not_decremented',
      'passive_off_by_one',
      'out_of_union_accepted',
      'temp_hp_stacks_additively',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
    expect(ledger).toContain('exit 1');
    expect(ledger).toContain('exit 0; 98 passed');
    expect(ledger).toContain('exit 0; 1,360 passed');
  });

  it('PARTY-MULTISOURCE-MUTATION-LEDGER pins all three required controls', () => {
    const ledger = readFileSync(PARTY_MULTISOURCE_LEDGER_PATH, 'utf8');
    for (const name of [
      'wrong_source_dc',
      'per_source_slots',
      'object_form_rejected',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
    expect(ledger).toContain('exit 1');
    expect(ledger).toContain('1,553-test restored gate');
  });

  it('REGRET-ORACLE-MUTATION-LEDGER pins the three required controls and named killing tests', () => {
    const ledger = readFileSync(REGRET_ORACLE_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/regret.test.ts', 'utf8');
    for (const name of [
      'comparator_hp_before_win',
      'rollout_rng_shared',
      'collapse_ignores_movement_order',
      'resource_score_inflated',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(tests).toContain(name);
    }
  });
});
