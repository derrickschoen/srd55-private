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
const E05B_DIFFICULTY_LEDGER_PATH = 'docs/audits/2026-08-22-e05b-difficulty-mutation-ledger.md';
const ENVELOPE_NORMALIZATION_LEDGER_PATH = 'docs/audits/2026-08-22-envelope-normalization-mutation-ledger.md';
const CHOICE_BRANCH_LEDGER_PATH = 'docs/audits/2026-08-22-choice-branch-mutation-ledger.md';
const CONDITION_LIFECYCLE_LEDGER_PATH = 'docs/audits/2026-08-22-condition-lifecycle-mutation-ledger.md';
const ROLL_DEFENSE_LEDGER_PATH = 'docs/audits/2026-08-22-roll-defense-mutation-ledger.md';
const ROLLMOD_D351_LEDGER_PATH = 'docs/audits/2026-08-23-rollmod-mutation-ledger.md';
const PAIRWISE_COMPOSITION_LEDGER_PATH = 'docs/audits/2026-08-22-pairwise-composition-mutation-ledger.md';
const NESTED_COMPOSITION_LEDGER_PATH = 'docs/audits/2026-08-23-nested-composition-mutation-ledger.md';
const SHARED_OUTCOME_LEDGER_PATH = 'docs/audits/2026-08-23-shared-outcome-mutation-ledger.md';
const BOARD_LEDGER_PATH = 'docs/audits/2026-08-23-board-mutation-ledger.md';
const SEQUENCING_LEDGER_PATH = 'docs/audits/2026-08-22-sequencing-mutation-ledger.md';
const EQUIPMENT_LEDGER_PATH = 'docs/audits/2026-08-23-equipment-mutation-ledger.md';
const SEQ_BINDING_LEDGER_PATH = 'docs/audits/2026-08-23-seq-binding-mutation-ledger.md';
const SENSES_LEDGER_PATH = 'docs/audits/2026-08-23-senses-mutation-ledger.md';
const TARGET_SELECTION_LEDGER_PATH = 'docs/audits/2026-08-23-target-sel-mutation-ledger.md';
const REACTIONS_LEDGER_PATH = 'docs/audits/2026-08-23-reactions-mutation-ledger.md';
const SUMMONS_LEDGER_PATH = 'docs/audits/2026-08-23-summons-mutation-ledger.md';
const FORMS_LEDGER_PATH = 'docs/audits/2026-08-23-forms-mutation-ledger.md';
const PCBRIDGE_LEDGER_PATH = 'docs/audits/2026-08-23-pcbridge-mutation-ledger.md';
const VIEW_SEAMS_LEDGER_PATH = 'docs/audits/2026-08-23-seams-mutation-ledger.md';
const MONSTERS_LEDGER_PATH = 'docs/audits/2026-08-23-monsters-mutation-ledger.md';
const ADVDAY_LEDGER_PATH = 'docs/audits/2026-08-24-advday-mutation-ledger.md';
const BEAST_FAMILY_LEDGER_PATH = 'docs/audits/2026-08-24-beastfam-mutation-ledger.md';
const WAVE_ONE_LEDGER_PATH = 'docs/audits/2026-08-22-wave1-mutation-ledger.md';
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
  it('D366-BEASTFAM-MUTATION-LEDGER pins all four restored controls to named killing tests', () => {
    const beastFamilyLedger = readFileSync(BEAST_FAMILY_LEDGER_PATH, 'utf8');
    const familyTests = readFileSync('tests/unit/combat/homebrew-beast-families.test.ts', 'utf8');
    for (const control of [
      'signature_dropped_at_tier',
      'dpr_out_of_band',
      'homebrew_masquerades_as_srd',
      'ladder_step_missing',
    ]) {
      expect(beastFamilyLedger).toContain(`\`${control}\``);
      expect(familyTests).toContain(`${control}:`);
    }
    expect(beastFamilyLedger.match(/`exit 1`/gu)).toHaveLength(4);
    expect(beastFamilyLedger).toContain('Tests  9 passed (9)');
    expect(beastFamilyLedger).toContain('All four mutations were restored.');
  });

  it('D361.1-D363.2-ADVDAY-MUTATION-LEDGER pins all six restored controls to named killing tests', () => {
    const adventuringDayLedger = readFileSync(ADVDAY_LEDGER_PATH, 'utf8');
    const partyStateTests = readFileSync('tests/unit/vtt/party-session-state.test.ts', 'utf8');
    for (const control of [
      'resources_reset_between_rooms',
      'short_rest_restores_long_slots',
      'hit_die_ignores_con',
      'dead_walks',
      'party_state_leaks',
      'hit_die_minimum_dropped',
    ]) {
      expect(adventuringDayLedger).toContain(`\`${control}\``);
      expect(partyStateTests).toContain(control);
    }
    expect(adventuringDayLedger.match(/`exit 1`/gu)).toHaveLength(6);
    expect(adventuringDayLedger).toContain('Tests  9 passed (9)');
    expect(adventuringDayLedger).toContain('All six mutations were restored.');
  });

  it('D364-MONSTERS-MUTATION-LEDGER pins all five restored controls to their killing tests', () => {
    const monstersLedger = readFileSync(MONSTERS_LEDGER_PATH, 'utf8');
    const rosterTests = readFileSync('tests/unit/combat/statblocks.test.ts', 'utf8');
    const companionTests = readFileSync('tests/unit/combat/companion-statblocks.test.ts', 'utf8');
    for (const control of [
      'citation_span_drifted',
      'mapping_defaults',
      'scaling_frozen',
      'caster_stats_ignored',
      'cr_ladder_gap',
    ]) {
      expect(monstersLedger).toContain(`\`${control}\``);
      expect(`${rosterTests}\n${companionTests}`).toContain(`${control}:`);
    }
    expect(monstersLedger.match(/`exit 1`/gu)).toHaveLength(5);
    expect(monstersLedger).toContain('Tests  63 passed (63)');
    expect(monstersLedger).toContain('All five mutations were restored');
  });

  it('D359-VIEW-SEAMS-MUTATION-LEDGER pins all four restored controls to their killing checks', () => {
    const seamsLedger = readFileSync(VIEW_SEAMS_LEDGER_PATH, 'utf8');
    const visibilityTests = readFileSync('tests/unit/combat/visibility.test.ts', 'utf8');
    const persistenceTests = readFileSync('tests/unit/vtt/session-persistence.test.ts', 'utf8');
    for (const control of [
      'fogged_cell_leaks',
      'new_field_defaults_visible',
      'seat_confusion',
      'playerview_serialized',
    ]) {
      expect(seamsLedger).toContain(`\`${control}\``);
    }
    expect(visibilityTests).toContain(
      'omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell',
    );
    expect(visibilityTests).toContain(
      'gates owned details per seat and produces distinguishing views over the same state',
    );
    expect(persistenceTests).toContain('PLAYERVIEW-NEVER-SERIALIZED');
    expect(seamsLedger).toContain("Property 'mutationProbe' is missing");
    expect(seamsLedger.match(/`exit 1`/gu)).toHaveLength(4);
    expect(seamsLedger).toContain('Tests `17 passed (17)`');
    expect(seamsLedger).toContain('All four mutations were restored.');
  });

  it('D352.1-PCBRIDGE-MUTATION-LEDGER pins all five restored bridge controls', () => {
    const ledger = readFileSync(PCBRIDGE_LEDGER_PATH, 'utf8');
    const exporterTests = readFileSync(
      'tests/integration/vtt/stored-character-party-member.test.ts',
      'utf8',
    );
    const roundTripTests = readFileSync(
      'tests/integration/vtt/stored-character-round-trip.test.ts',
      'utf8',
    );
    for (const control of [
      'exporter_drops_passive_ac',
      'multiclass_level_miscount',
      'refusal_defaulted',
      'controller_not_dm',
      'negative_modifier_flipped',
    ]) {
      expect(ledger).toContain(`\`${control}\``);
      expect(`${exporterTests}\n${roundTripTests}`).toContain(`${control}:`);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(5);
    expect(ledger).toContain('Tests  6 passed (6)');
    expect(ledger).toContain('All five mutations were restored.');
  });

  it('D348.1-FORMS-MUTATION-LEDGER pins all four restored controls and the boundary kill', () => {
    const formsLedger = readFileSync(FORMS_LEDGER_PATH, 'utf8');
    const formsTests = readFileSync('tests/unit/vtt/forms.test.ts', 'utf8');
    const controls = [
      'carryover_lost',
      'revert_keeps_form_stats',
      'original_hp_touched_in_form',
      'unknown_form_id_transforms',
    ];
    const killingTests = [
      'carryover_lost and carryover_boundary_exact_vs_one_over: exactly the remaining form HP reverts without original damage; one over carries exactly one',
      'original_hp_touched_in_form and revert_keeps_form_stats: partial form damage drains only the form pool and effect-end reversion differs from zero-HP reversion',
      'unknown_form_id_transforms: rejects only the missing-id form record and loads the rest of the pack',
    ];
    for (const control of controls) {
      expect(formsLedger).toContain(`\`${control}\``);
      expect(formsTests).toContain(control);
    }
    for (const testName of killingTests) {
      expect(formsLedger).toContain(`\`${testName}\``);
      expect(formsTests).toContain(testName);
    }
    expect(formsLedger.match(/exit 1/gu)).toHaveLength(5);
    expect(formsLedger).toContain('Tests  8 passed (8)');
    expect(formsLedger).toContain('All four required controls and the independent boundary mutation were restored.');
  });

  it('D348.1-SUMMONS-MUTATION-LEDGER pins all four controls and both boundary kills', () => {
    const summonsLedger = readFileSync(SUMMONS_LEDGER_PATH, 'utf8');
    const summonsTests = readFileSync('tests/unit/vtt/summons.test.ts', 'utf8');
    for (const name of [
      'summon_import_count_boundary',
      'summon_count_boundary_and_placement_edge',
      'summon_survives_effect_end',
      'despawn_leaves_corpse',
      'summon_skips_initiative',
      'unknown_monster_id_summons',
    ]) {
      expect(summonsLedger).toContain(`\`${name}\``);
      expect(summonsTests).toContain(name);
    }
    expect(summonsLedger.match(/exit 1/gu)).toHaveLength(6);
    expect(summonsLedger).toContain('All six mutations were restored.');
  });

  it('D344.3-BOARD-MUTATION-LEDGER pins all required controls and both boundary kills to restored named tests', () => {
    const boardLedger = readFileSync(BOARD_LEDGER_PATH, 'utf8');
    const boardTests = readFileSync('tests/unit/vtt/encounter-board-projection.test.ts', 'utf8');
    for (const name of [
      'corpse_token_removed',
      'branch_events_collapsed',
      'light_radius_unlabeled',
      'boundary_corpse_edge_included',
      'boundary_light_radius_clipped',
    ]) {
      expect(boardLedger).toContain(`\`${name}\``);
      expect(boardTests).toContain(`${name}:`);
    }
    expect(boardLedger.match(/exit 1/gu)).toHaveLength(5);
    expect(boardLedger).toContain('All five mutations were restored.');
  });

  it('WAVE-ONE-MUTATION-LEDGER pins all five restored controls to their named killing tests', () => {
    const waveOne = readFileSync(WAVE_ONE_LEDGER_PATH, 'utf8');
    const controls = [
      ['fallback_resurrected', 'tests/unit/vtt/content-pack.test.ts'],
      ['record_rejection_kills_pack', 'tests/unit/vtt/content-pack.test.ts'],
      ['fingerprint_not_checked', 'tests/unit/vtt/session-persistence.test.ts'],
      ['namespace_not_enforced', 'tests/unit/vtt/content-pack.test.ts'],
      ['speed_bound_bypassed', 'tests/unit/vtt/content-pack.test.ts'],
    ] as const;
    for (const [control, testFile] of controls) {
      expect(waveOne).toContain(`\`${control}\``);
      expect(waveOne).not.toContain(`| \`${control}\` | Pending execution`);
      expect(readFileSync(testFile, 'utf8')).toContain(`${control}:`);
    }
  });

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

  it('E05B-DIFFICULTY-MUTATION-LEDGER pins all restored controls and numeric boundary probes', () => {
    const ledger = readFileSync(E05B_DIFFICULTY_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/experiment-orchestrator.test.ts', 'utf8');
    for (const name of [
      'difficulty_not_in_digest',
      'arms_differ_beyond_typecheck',
      'manipulation_check_constant',
    ]) {
      expect(ledger).toContain(`\`${name}\``);
      expect(tests).toContain(name);
    }
    expect(ledger.match(/Vitest verdict: 1 failed and 50 skipped/gu)).toHaveLength(6);
    expect(ledger).toContain('Each mutation was applied alone, proved present by an exact source read, killed by its named test, restored');
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

  it('CONDITION-LIFECYCLE-MUTATION-LEDGER pins all required controls and boundary mutants', () => {
    const ledger = readFileSync(CONDITION_LIFECYCLE_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/condition-lifecycle.test.ts', 'utf8');
    const mutations = [
      'save_dc_equal_fails',
      'repeat_save_first_round_delayed',
      'repeat_save_final_round_dropped',
      'damage_break_threshold_two',
      'immunity_reported_as_save',
      'damage_break_ignores_region',
      'repeat_save_on_success_persists',
      'duration_off_by_one',
      'stacking_silently_replaces',
      'cross_keyed_immunity_branch_deleted',
      'repeat_save_end_effect_as_remove_target',
      'damage_any_scope_as_restrictive',
      'replace_any_source_as_same_source',
      'extend_any_source_as_same_source',
    ];
    const killingTests = [
      'save_dc_boundary: a result exactly at the DC refuses application while one below applies it',
      'repeat_save_on_success_persists: repeats on the first and final round and honors both success scopes',
      'damage_break_ignores_region: movement-region damage at exactly zero preserves and exactly one breaks the effect',
      'immunity_reported_as_save: an immune target emits a refusal without drawing or reporting a save',
      'duration_off_by_one: exactly one round expires on its first declared boundary',
      'stacking_silently_replaces: imported coexist and replace policies differ across sources',
      'cross_keyed_immunity: applied-condition, keyed-immunity, and unblocked targets emit distinct outcomes',
      'repeat_save_success_scope: remove-target preserves a second target while end-effect removes both',
      'damage_source_scope_comparison: outsider damage breaks any-source but not source-or-allies',
      'stacking_source_scope: different sources coexist for same-source and replace for any-source',
      'extend_duration_source_scope: different sources coexist for same-source and extend for any-source',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(14);
    expect(ledger).toContain('Each production mutation below was applied alone');
    expect(ledger).toContain('Tests  17 passed (17)');
  });

  it('ROLL-DEFENSE-MUTATION-LEDGER pins all required controls and numeric-boundary mutants', () => {
    const ledger = readFileSync(ROLL_DEFENSE_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/roll-defense-modifiers.test.ts', 'utf8');
    const mutations = [
      'advantage_stacks',
      'advantage_disadvantage_no_cancel',
      'resistance_skips_region_damage',
      'ac_floor_stacks_with_bonus',
      'targeted_modifier_applies_to_all',
      'exact_ac_misses',
      'bonus_die_low_face_skipped',
      'bonus_die_high_face_skipped',
      'resistance_rounds_up_odd',
      'modifier_final_round_dropped',
      'modifier_expires_one_round_late',
    ];
    const killingTests = [
      'advantage_sources: duplicate sources stay at two dice, one disadvantage cancels them, and Faerie-Fire scope does not affect another target',
      'resistance_vulnerability_region: resistance halves odd and even movement-region damage while vulnerability remains observably different',
      'ac_floor_bonus_boundary: exact AC hits, one below misses, and a Barkskin floor does not add to a Shield-style bonus',
      'targeted_modifier_scope: a selected-attacker AC defense blocks that attacker but not a non-targeted source, unlike a blanket bonus',
      'roll_dice_faces_and_order: Bless/Bane use the lowest and highest faces in stable pre-d20 order, while Guidance is skill-selected',
      'modifier_duration_first_and_final_round: a two-round AC bonus protects the first and final rounds, then expires',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(11);
    expect(ledger).toContain('Every production mutation below was applied alone');
    expect(ledger).toContain('Tests  7 passed (7)');
  });

  it('D351-ROLLMOD-MUTATION-LEDGER pins every required control and the duration boundary kill', () => {
    const ledger = readFileSync(ROLLMOD_D351_LEDGER_PATH, 'utf8');
    const d351Tests = readFileSync('tests/unit/vtt/roll-modifiers-d351.test.ts', 'utf8');
    const priorTests = readFileSync('tests/unit/vtt/roll-defense-modifiers.test.ts', 'utf8');
    const mutations = [
      'rider_precomputed',
      'consumed_effect_lingers',
      'aura_membership_stale',
      'same_spell_stacks',
      'penalty_sign_flip',
      'modifier_expires_one_round_late',
    ];
    const d351KillingTests = [
      'rider_precomputed: two qualifying rolls draw observably different d4 faces instead of reusing a cast-time value',
      'guidance_consumed_on_first_use: the first distinguishing check gets d4, the second gets nothing, and the instance ends',
      'moving_aura_roll_time_membership: exact 30 feet gets advantage and no half damage; after moving to 35 feet neither applies',
      'concentration_drop_and_same_spell_refresh: concentration ends modifiers mid-duration and same-name castings never add 2d4',
      'bane_save_negates_and_penalty_sign: success creates no modifier; failure subtracts d4 across the attack threshold',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of d351KillingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(d351Tests).toContain(testName);
    }
    const durationTest = 'modifier_duration_first_and_final_round: a two-round AC bonus protects the first and final rounds, then expires';
    expect(ledger).toContain(`\`${durationTest}\``);
    expect(priorTests).toContain(durationTest);
    expect(ledger.match(/exit 1/gu)).toHaveLength(6);
    expect(ledger).toContain('Tests  18 passed (18)');
    expect(ledger).toContain('All five required controls and the independent duration-boundary mutation were restored.');
  });

  it('PAIRWISE-COMPOSITION-MUTATION-LEDGER pins required controls and every pairwise numeric boundary', () => {
    const ledger = readFileSync(PAIRWISE_COMPOSITION_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/composition.test.ts', 'utf8');
    const mutations = [
      'save_success_treated_as_refusal',
      'abort_leaks_rng',
      'outcome_inferred_from_delta',
      'nested_composition_accepted',
      'refusal_propagation_ignored',
      'composition_order_ignored',
      'state_not_visible_between_steps',
      'targets_not_reresolved',
      'single_step_accepted',
      'third_step_accepted',
      'explicit_order_negative_index_accepted',
      'explicit_order_past_end_accepted',
    ];
    const killingTests = [
      'save_success_treated_as_refusal: successful initial save is applied and preserves prior damage under abort',
      'abort_leaks_rng: an aborted rolled pair restores the seeded stream before every subsequent draw',
      'outcome_inferred_from_delta: no_op and refused remain observably distinct while continue reaches slot two',
      'refusal_propagation_ignored: the same refused second slot atomically aborts or continues according to the pack',
      'composition_order_ignored and state_not_visible_between_steps: opposite orders deal six versus three damage',
      'targets_not_reresolved: inherited and caster selectors damage observably different target sets',
      'pairwise_boundaries: exactly two steps and both permutations load while one, three, negative one, and index two refuse',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(12);
    expect(ledger).toContain('Every production mutation below was applied alone');
    expect(ledger).toContain('Tests  46 passed (46)');
  });

  it('D347-NESTED-COMPOSITION-MUTATION-LEDGER pins depth, scoped rollback, RNG, outcome, and branch controls', () => {
    const ledger = readFileSync(NESTED_COMPOSITION_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/composition.test.ts', 'utf8');
    const mutations = [
      'depth_limit_off_by_one',
      'depth_limit_rejects_exact_maximum',
      'subtree_abort_escapes',
      'nested_rng_leak',
      'outcome_not_propagated',
      'shared_outcome_nesting_accepted',
    ];
    const killingTests = [
      'depth_limit_off_by_one: depth four loads and depth five has a typed import refusal',
      'subtree_abort_escapes, nested_rng_leak, and outcome_not_propagated: depth-three abort is subtree-scoped under continue and whole-tree-scoped under abort',
      'shared_outcome_nesting_accepted: shared outcome is a composition step but composition remains refused inside its branch',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(6);
    expect(ledger).toContain('Every production mutation below was applied alone');
    expect(ledger).toContain('Tests  50 passed (50)');
    expect(ledger).toContain('All six mutations were restored.');
  });

  it('SHARED-OUTCOME-MUTATION-LEDGER pins synchronized branches and both numeric boundaries', () => {
    const ledger = readFileSync(SHARED_OUTCOME_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/shared-outcome.test.ts', 'utf8');
    const mutations = [
      'branches_roll_separately',
      'branch_leaks',
      'one_roll_per_cast_violated',
      'nested_shared_outcome_accepted',
      'exact_dc_treated_as_failure',
      'half_damage_rounds_up_odd',
    ];
    const killingTests = [
      'branches_roll_separately: successful half damage uses one referenced odd roll and consumes no replacement roll',
      'branch_leaks: two area targets take divergent branches and successful Thunderwave neither pushes nor takes full damage',
      'one_roll_per_cast_violated: damage and push share one save while branch dice follow it in declaration order',
      'nested_shared_outcome_accepted: import rejects shared_outcome anywhere inside a branch and retains a healthy record',
      'shared_outcome_boundaries: DC-1 fails, exact DC succeeds, and odd/even totals halve down',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(6);
    expect(ledger).toContain('Each production mutation below was applied alone');
    expect(ledger).toContain('Tests  8 passed (8)');
  });

  it('SUSTAINED-SEQUENCING-MUTATION-LEDGER pins all D343 controls and the duration off-by-one', () => {
    const ledger = readFileSync(SEQUENCING_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/sustained-effects.test.ts', 'utf8');
    const mutations = [
      'bound_effect_retargets',
      'activation_free',
      'effect_end_leaves_activation',
      'explicit_action_type_normalized',
      'sustained_duration_off_by_one',
    ];
    const killingTests = [
      'bound_effect_retargets and explicit_action_type_normalized: Heat Metal keeps its original object, rejects a different object with a typed code, and spends only its Bonus Action',
      'activation_free: an available Magic action activates, but an exactly-spent action refuses without dealing damage',
      'effect_end_leaves_activation: ending concentration removes the ordinary lifecycle effect and refuses its pending activation',
      'produce-flame shape and sustained_duration_off_by_one: same-turn and post-expiry activation refuse, while first and final later rounds retarget and spend Magic actions',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(5);
    expect(ledger).toContain('Each production mutation below was applied alone');
    expect(ledger).toContain('Tests  9 passed (9)');
  });

  it('D348.1-SEQ-BINDING-MUTATION-LEDGER pins all four restored sequenced-effect controls', () => {
    const ledger = readFileSync(SEQ_BINDING_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/sequenced-effects.test.ts', 'utf8');
    const controls = [
      'auto_tick_needs_activation',
      'event_trigger_fires_on_any_event',
      'delayed_oneshot_repeats',
      'instance_group_splits',
    ];
    for (const control of controls) {
      expect(ledger).toContain(`\`${control}\``);
      expect(tests).toContain(`${control}:`);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(4);
    expect(ledger).toContain('Tests  5 passed (5)');
    expect(ledger).toContain('All four mutations were restored.');
  });

  it('D348.1-SENSES-MUTATION-LEDGER pins the four restored visibility controls', () => {
    const ledger = readFileSync(SENSES_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/senses.test.ts', 'utf8');
    const controls = [
      'blindsight_ignores_range',
      'truesight_no_illusion_pierce',
      'obscured_still_visible',
      'invisible_condition_ignored',
    ];
    for (const control of controls) {
      expect(ledger).toContain(`\`${control}\``);
      expect(tests).toContain(`${control}`);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(5);
    expect(ledger).toContain('Tests  6 passed (6)');
    expect(ledger).toContain('All four mutations and the independent boundary mutation were restored.');
  });

  it('D348.1-REACTIONS-MUTATION-LEDGER pins the unified pool and interception controls', () => {
    const reactionsLedger = readFileSync(REACTIONS_LEDGER_PATH, 'utf8');
    const reactionsTests = readFileSync('tests/unit/vtt/reactions.test.ts', 'utf8');
    const controls = [
      'second_reaction_same_round',
      'shield_not_retroactive',
      'trigger_kind_ignored',
      'opportunity_attack_separate_pool',
    ];
    const killingTests = [
      'second_reaction_same_round: the unified pool refuses the second response and restores at turn start',
      'shield_not_retroactive and shield_boundary_exact_tie_hits_one_above_misses: retroactive AC includes the triggering attack',
      'trigger_kind_ignored and trigger_kind_discrimination: a Fire damage declaration does not fire on Cold',
      'opportunity_attack_separate_pool and opportunity_attack_shared_pool: an OA blocks a later pack reaction in the same round',
    ];
    for (const control of controls) expect(reactionsLedger).toContain(`\`${control}\``);
    for (const testName of killingTests) {
      expect(reactionsLedger).toContain(`\`${testName}\``);
      expect(reactionsTests).toContain(testName);
    }
    expect(reactionsLedger.match(/exit 1/gu)).toHaveLength(5);
    expect(reactionsLedger).toContain('Tests  7 passed (7)');
    expect(reactionsLedger).toContain('All four mutations and the independent boundary mutation were restored.');
  });

  it('D348.1-TARGET-SELECTION-BINDING pins all four required controls and the restored boundary kill', () => {
    const ledger = readFileSync(TARGET_SELECTION_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/target-selection.test.ts', 'utf8');
    const controls = [
      'secondary_range_unchecked',
      'allocation_count_drifts',
      'uniqueness_ignored',
      'upcast_scales_inner_sets',
      'pair_boundary_excludes_exact',
    ];
    const killingTests = [
      'secondary_range_unchecked: Chain Lightning accepts a secondary exactly 30 feet from the primary and refuses one 35 feet away',
      'allocation_count_drifts and distinguishing_allocation_vs_up_to: Magic Missile allocates exactly 3+slot darts and resolves doubled targets per dart',
      'uniqueness_ignored: unique and repeatable declarations distinguish the same doubled target',
      'upcast_scales_inner_sets: one slot-scaled outer target set is inherited by both sibling operations',
      'acid_pair_boundary: one target and a pair exactly 5 feet apart are legal, while a pair 10 feet apart refuses',
    ];
    for (const control of controls) expect(ledger).toContain(`\`${control}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(5);
    expect(ledger).toContain('Tests  9 passed (9)');
    expect(ledger).toContain('All five mutations were restored.');
  });

  it('EQUIPMENT-MUTATION-LEDGER pins forced drop, board persistence, interaction, capacity, and contact controls', () => {
    const ledger = readFileSync(EQUIPMENT_LEDGER_PATH, 'utf8');
    const tests = readFileSync('tests/unit/vtt/equipment.test.ts', 'utf8');
    const mutations = [
      'worn_armor_drops',
      'dropped_item_vanishes',
      'second_interaction_free',
      'two_handed_in_one_hand',
      'contact_damage_holder_only',
      'one_free_hand_refused',
    ];
    const killingTests = [
      'worn_armor_drops: failed Heat Metal save drops a held sword but retained worn armor receives attack and ability-check Disadvantage',
      'dropped_item_vanishes and contact_damage_holder_only: cast drops onto the holder cell; pickup, re-equip, and later Bonus Action re-trigger damage every contact and drop it again',
      'second_interaction_free: exactly one free interaction succeeds, a second free interaction is typed-refused, and Utilize pays the action',
      'two_handed_in_one_hand: hand capacity succeeds with exactly one free unit, then refuses a two-handed item when both units are full',
    ];
    for (const mutation of mutations) expect(ledger).toContain(`\`${mutation}\``);
    for (const testName of killingTests) {
      expect(ledger).toContain(`\`${testName}\``);
      expect(tests).toContain(testName);
    }
    expect(ledger.match(/exit 1/gu)).toHaveLength(6);
    expect(ledger).toContain('Each production mutation below was applied alone');
    expect(ledger).toContain('Tests  6 passed (6)');
  });
});
