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
const E02_EXPERIMENT_LEDGER_PATH = 'docs/audits/2026-08-21-e02-worked-example-experiment-mutation-ledger.md';
const E03_EXPERIMENT_LEDGER_PATH = 'docs/audits/2026-08-21-e03-instruction-length-experiment-mutation-ledger.md';
const PARTY_EFFECTS_LEDGER_PATH = 'docs/audits/2026-08-20-party-pack-v2-effects-mutation-ledger.md';
const EFFECT_FAMILIES_LEDGER_PATH = 'docs/audits/2026-08-21-party-pack-effect-families-mutation-ledger.md';
const PARTY_MULTISOURCE_LEDGER_PATH = 'docs/audits/2026-08-21-party-pack-multisource-mutation-ledger.md';
const REGRET_ORACLE_LEDGER_PATH = 'docs/audits/2026-08-21-vtt-regret-mutation-ledger.md';
const ATTACK_FORM_ELDRITCH_LEDGER_PATH = 'docs/audits/2026-08-21-attack-form-eldritch-blast-mutation-ledger.md';
const R9_SPELLS_LEDGER_PATH = 'docs/audits/2026-08-21-vtt-r9-spells-mutation-ledger.md';
const CAP_019_LEDGER_PATH = 'docs/audits/2026-08-21-cap-019-typed-effects-mutation-ledger.md';
const CAP_019_TAIL_SWEEP_LEDGER_PATH = 'docs/audits/2026-08-21-cap-019-tail-sweep-mutation-ledger.md';
const SPELL_BATCH_TWO_LEDGER_PATH = 'docs/audits/2026-08-21-vtt-spell-batch-2-mutation-ledger.md';
const TYPED_JS_LEDGER_PATH = 'docs/audits/2026-08-21-typed-js-turn-program-mutation-ledger.md';
const SPATIAL_MOVEMENT_LEDGER_PATH = 'docs/audits/2026-08-21-spatial-movement-mutation-ledger.md';
const E04_CONTEXT_LEDGER_PATH = 'docs/audits/2026-08-21-e04-context-compression-early-stop-mutation-ledger.md';
const E05_TYPED_UNTYPED_LEDGER_PATH = 'docs/audits/2026-08-21-e05-typed-vs-untyped-mutation-ledger.md';
const E05_TYPECHECK_INSTRUMENTATION_LEDGER_PATH = 'docs/audits/2026-08-22-e05-typecheck-instrumentation-mutation-ledger.md';
const ENVELOPE_NORMALIZATION_LEDGER_PATH = 'docs/audits/2026-08-22-envelope-normalization-mutation-ledger.md';
const CHOICE_BRANCH_LEDGER_PATH = 'docs/audits/2026-08-22-choice-branch-mutation-ledger.md';
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

  it('R9-SPELL-MUTATION-LEDGER records all three restored negative controls and killing tests', () => {
    const ledger = readFileSync(R9_SPELLS_LEDGER_PATH, 'utf8');
    for (const name of [
      'armed_rider_persists_after_hit',
      'heal_value_drifted',
      'moonbeam_save_dropped',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(readFileSync('tests/unit/combat/spells-ranking-r9.test.ts', 'utf8')).toContain(name);
    }
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

  it('EFFECT-FAMILIES-MUTATION-LEDGER pins all five required controls to named killing tests', () => {
    const ledger = readFileSync(EFFECT_FAMILIES_LEDGER_PATH, 'utf8');
    for (const name of [
      'rider_fires_twice_per_turn',
      'smite_dice_not_doubled_on_crit',
      'bonus_attack_always_legal',
      'rider_condition_ignored',
      'schema_missing_variant',
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

  it('E02-EXPERIMENT-MUTATION-LEDGER pins all three required controls', () => {
    const ledger = readFileSync(E02_EXPERIMENT_LEDGER_PATH, 'utf8');
    for (const name of [
      'arms_share_examples',
      'e02_reuses_e01_digest',
      'seed_pairing_broken',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(3);
  });

  it('E03-EXPERIMENT-MUTATION-LEDGER pins all three required controls', () => {
    const ledger = readFileSync(E03_EXPERIMENT_LEDGER_PATH, 'utf8');
    for (const name of [
      'explainer_contains_tactics',
      'shared_block_varies',
      'e03_digest_collides',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(3);
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

  it('ATTACK-FORM-ELDRITCH-MUTATION-LEDGER pins all four required controls to named killing tests', () => {
    const ledger = readFileSync(ATTACK_FORM_ELDRITCH_LEDGER_PATH, 'utf8');
    const partyPackTests = readFileSync('tests/unit/vtt/party-pack.test.ts', 'utf8');
    const spellTests = readFileSync('tests/unit/combat/spells.test.ts', 'utf8');
    for (const name of [
      'substitution_ignored',
      'dangling_attack_id_accepted',
      'beam_count_off_by_level',
      'beams_share_one_roll',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(`${partyPackTests}\n${spellTests}`).toContain(name);
    }
    expect(ledger).toContain('exit 1');
    expect(ledger).toContain('final 1,588-test gate passed');
  });

  it('CAP-019-MUTATION-LEDGER pins all three typed-effect controls to named killing tests', () => {
    const ledger = readFileSync(CAP_019_LEDGER_PATH, 'utf8');
    const partyPackTests = readFileSync('tests/unit/vtt/party-pack.test.ts', 'utf8');
    const spellTests = readFileSync('tests/unit/combat/spells.test.ts', 'utf8');
    for (const name of [
      'reckless_one_sided',
      'true_strike_keeps_str',
      'grant_uses_source_ability',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(`${partyPackTests}\n${spellTests}`).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(3);
    expect(ledger).toContain('final restored gate passed with 1,639 tests');
  });

  it('CAP-019-TAIL-SWEEP-MUTATION-LEDGER pins all five restored controls to named killing tests', () => {
    const ledger = readFileSync(CAP_019_TAIL_SWEEP_LEDGER_PATH, 'utf8');
    const partyPackTests = readFileSync('tests/unit/vtt/party-pack.test.ts', 'utf8');
    for (const name of [
      'banish_return_damage_dropped',
      'agonizing_applied_twice_per_turn',
      'exploding_die_unbounded',
      'superiority_die_free',
      'elemental_fury_every_hit',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(partyPackTests).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(5);
    expect(ledger).toContain('All five source mutations were restored');
  });

  it('SPELL-BATCH-2-MUTATION-LEDGER pins all three restored controls to named killing tests', () => {
    const ledger = readFileSync(SPELL_BATCH_TWO_LEDGER_PATH, 'utf8');
    const spellTests = readFileSync('tests/unit/combat/spells-batch-two.test.ts', 'utf8');
    for (const name of [
      'hold_monster_save_end_dropped',
      'mockery_disadvantage_persists',
      'faerie_fire_no_advantage',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(spellTests).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(3);
    expect(ledger).toContain('All three source mutations were proved present');
  });

  it('TYPED-JS-MUTATION-LEDGER pins all three restored controls to named killing tests', () => {
    const ledger = readFileSync(TYPED_JS_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/bridge/js-round-plan-integration.test.ts', 'utf8');
    for (const name of [
      'dts_widens_to_string',
      'typecheck_result_ignored',
      'dts_ordering_nondeterministic',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(tests).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(3);
    expect(ledger).toContain('All controls were applied to production source one at a time');
  });

  it('SPATIAL-MOVEMENT-MUTATION-LEDGER pins both rounds of restored controls to named killing tests', () => {
    const ledger = readFileSync(SPATIAL_MOVEMENT_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/spatial-movement.test.ts', 'utf8');
    for (const name of [
      'teleport_traverses_cells',
      'push_ignores_obstacle',
      'movement_damage_off_by_one',
      'flight_ignores_immunity',
      'teleport_maximum_distance_inclusive',
      'forced_movement_exact_distance',
      'movement_damage_partial_unit_rounds_up',
      'speed_reduction_exact_zero_one_step_short',
      'movement_mode_exact_budget_refused',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
    }
    for (const name of [
      'teleport_range_boundary',
      'orders damaging movement regions before persistent on_enter hooks during forced movement',
      'movement_damage_partial_unit_boundary',
      'speed_reduction_zero_boundary',
      'movement_mode_grant_speed_boundary',
    ]) {
      expect(tests).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(9);
    expect(ledger).toContain('All four production mutations were restored');
    expect(ledger).toContain('All five round-2 production mutations were proved present one at a time');
  });

  it('E04-CONTEXT-MUTATION-LEDGER pins all three restored controls to named killing tests', () => {
    const ledger = readFileSync(E04_CONTEXT_LEDGER_PATH, 'utf8');
    const projectionTests = readFileSync('tests/unit/bridge/projection-transport.test.ts', 'utf8');
    const experimentTests = readFileSync('tests/unit/vtt/experiment-orchestrator.test.ts', 'utf8');
    for (const name of ['delta_skips_hash_refusal', 'early_stop_before_half', 'bytes_counter_constant']) {
      expect(ledger).toContain(`\`${name}\``);
      expect(`${projectionTests}\n${experimentTests}`).toContain(name);
    }
    expect(ledger).toContain('Each mutation was applied alone, killed by its named test, and restored');
  });

  it('E05-TYPED-UNTYPED-MUTATION-LEDGER pins all five restored controls to named killing tests', () => {
    const ledger = readFileSync(E05_TYPED_UNTYPED_LEDGER_PATH, 'utf8');
    const bridgeTests = readFileSync('tests/unit/bridge/js-round-plan-integration.test.ts', 'utf8');
    const experimentTests = readFileSync('tests/unit/vtt/experiment-orchestrator.test.ts', 'utf8');
    for (const name of [
      'arms_share_typecheck',
      'shadow_run_leaks',
      'correction_undercount',
      'empty_schema_path_reintroduced',
      'schema_loosened_instead',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(`${bridgeTests}\n${experimentTests}`).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(5);
    expect(ledger).toContain('Each production mutation was applied alone, killed by its named test, and restored');
    expect(ledger).toContain('Each round-2 production mutation was applied alone');
  });

  it('E05-TYPECHECK-INSTRUMENTATION-MUTATION-LEDGER pins restored controls to named killing tests', () => {
    const ledger = readFileSync(E05_TYPECHECK_INSTRUMENTATION_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/experiment-orchestrator.test.ts', 'utf8');
    for (const name of ['untyped_reports_zero_not_null', 'run_count_counts_failures_only', 'failed_result_recorded_as_pass']) {
      expect(ledger).toContain(`\`${name}\``);
      expect(tests).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(3);
    expect(ledger).toContain('Each production mutation was applied alone, killed by its named test, and restored');
  });

  it('ENVELOPE-NORMALIZATION-MUTATION-LEDGER pins all three restored controls', () => {
    const ledger = readFileSync(ENVELOPE_NORMALIZATION_LEDGER_PATH, 'utf8');
    const bridgeTests = readFileSync('tests/unit/bridge/js-round-plan-integration.test.ts', 'utf8');
    const experimentTests = readFileSync('tests/unit/vtt/experiment-orchestrator.test.ts', 'utf8');
    for (const name of [
      'single_program_accepted_for_batch',
      'wrong_identity_filled',
      'normalization_untracked',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(`${bridgeTests}\n${experimentTests}`).toContain(name);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(3);
    expect(ledger).toContain('exit 0; 2 files passed and 7 named cases passed');
  });

  it('CHOICE-BRANCH-MUTATION-LEDGER pins required controls and every boundary mutation to named killing tests', () => {
    const ledger = readFileSync(CHOICE_BRANCH_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/choice-branches.test.ts', 'utf8');
    const mutations = [
      'branch_table_gap_ignored',
      'invalid_mode_defaults',
      'branch_rerolled_from_fresh_rng',
      'branch_fixed_at_cast',
      'caster_mode_first_skipped',
      'caster_mode_last_skipped',
      'random_branch_lower_bound_exclusive',
      'random_branch_upper_bound_exclusive',
      'reevaluated_first_hook_delayed',
      'reevaluated_final_round_dropped',
      'target_predicate_inverted',
    ];
    const killingTests = [
      'branch_table_gap_ignored refuses both a gap and an overlap instead of loading either table',
      'caster_choice_boundaries: executes the first and last declared modes and invalid_mode_defaults refuses an undeclared mode',
      'branch_rerolled_from_fresh_rng: identical seeds produce byte-identical re-evaluated event streams',
      'branch_fixed_at_cast: re-rolls the branch on its first and final declared rounds',
      'random_branch_low_face_boundary: selects the first range at face 1',
      'random_branch_high_face_boundary: selects the last range at the highest face',
      'same_hook_order: persistent-area start hooks run before re-evaluated branches and condition removal',
      'target_choice_branch: imported Humanoid metadata selects its branch and an unmatched target does nothing',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(11);
    expect(ledger).toContain('Each production mutation below was applied alone, killed by its named test, and restored');
    expect(ledger).toContain('Tests  8 passed (8)');
  });
});
