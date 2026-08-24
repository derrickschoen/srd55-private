import { describe, expect, expectTypeOf, it } from 'vitest';
import type { MonsterAttackAction, MonsterOnHitEffect, MonsterProvenance } from '../../../src/combat/statblock';
import { BEAST_FAMILY_DEFERRED_UPGRADES } from '../../../src/combat/statblocks/beast-family-deferred-upgrades';
import { lookupBundledMonster } from '../../../src/combat/statblocks/companions';
import {
  HOMEBREW_BEAST_CR_LADDER,
  HOMEBREW_BEAST_FAMILY_SIGNATURES,
  HOMEBREW_BEAST_ROSTER,
  type HomebrewBeastFamily,
  type HomebrewBeastRosterRow,
} from '../../../src/combat/statblocks/homebrew-beast-families';
import { STARTER_MONSTER_ROSTER, type StarterMonsterRosterRow } from '../../../src/combat/statblocks/roster';

const FAMILIES = ['ursine', 'arachnid', 'saurian', 'pterosaur', 'aquatic', 'raptor'] as const satisfies readonly HomebrewBeastFamily[];

function attacks(row: HomebrewBeastRosterRow): readonly MonsterAttackAction[] {
  const actions = row.statblock.sourceDetails.actions;
  if (actions.kind === 'absent') throw new Error(`${row.name} has no actions.`);
  return actions.value.filter((action) => action.kind === 'attack');
}

function effects(row: HomebrewBeastRosterRow): readonly MonsterOnHitEffect[] {
  return attacks(row).flatMap((attack) => attack.onHit);
}

function actionDpr(row: HomebrewBeastRosterRow): number {
  const actions = row.statblock.sourceDetails.actions;
  if (actions.kind === 'absent') throw new Error(`${row.name} has no actions.`);
  const multiattack = actions.value.find((action) => action.kind === 'multiattack');
  const count = multiattack?.count ?? 1;
  const attack = attacks(row)[0];
  if (attack === undefined) throw new Error(`${row.name} has no attack.`);
  const always = attack.damage.filter((term) => term.trigger.kind === 'always').reduce((sum, term) => sum + term.average, 0);
  const situational = attack.damage.filter((term) => term.trigger.kind !== 'always').reduce((sum, term) => sum + term.average, 0);
  const ongoing = attack.onHit.filter((effect): effect is Extract<MonsterOnHitEffect, { readonly kind: 'condition_bound_ongoing_damage' }> =>
    effect.kind === 'condition_bound_ongoing_damage').reduce((sum, effect) => sum + effect.damage.average, 0);
  return always * count + situational + ongoing;
}

describe('D366 clean-room Moon Druid beast families', () => {
  it('ladder_step_missing: supplies every CR step exactly once for all six families, including both boundaries', () => {
    expect(HOMEBREW_BEAST_ROSTER).toHaveLength(48);
    for (const family of FAMILIES) {
      const rows = HOMEBREW_BEAST_ROSTER.filter((row) => row.design.family === family);
      expect(rows.map((row) => row.design.challengeRating), family).toEqual(HOMEBREW_BEAST_CR_LADDER);
      expect(rows[0]?.design.challengeRating).toBe('1/4');
      expect(rows[7]?.design.challengeRating).toBe(6);
      expect(rows.every((row) => row.design.wildshapeEligible)).toBe(true);
    }
  });

  it('signature_dropped_at_tier: carries every named family signature with non-decreasing magnitude through all tiers', () => {
    for (const family of FAMILIES) {
      const rows = HOMEBREW_BEAST_ROSTER.filter((row) => row.design.family === family);
      for (const mechanic of HOMEBREW_BEAST_FAMILY_SIGNATURES[family]) {
        const magnitudes = rows.map((row) => row.design.signatures.find((signature) => signature.mechanic === mechanic)?.magnitude);
        expect(magnitudes.every((value) => value !== undefined), `${family}:${mechanic}`).toBe(true);
        expect(magnitudes.slice(1).every((value, index) => value !== undefined && magnitudes[index] !== undefined && value >= magnitudes[index]), `${family}:${mechanic}`).toBe(true);
      }
      expect(rows.map((row) => row.design.signatureDc)).toEqual([11, 12, 13, 14, 15, 16, 17, 18]);
    }
  });

  it('dpr_out_of_band: recomputes each row DPR and keeps AC, HP, and DPR inside the declared comparable bands', () => {
    for (const row of HOMEBREW_BEAST_ROSTER) {
      const anchor = row.provenance.comparableAnchors[0];
      if (anchor === undefined) throw new Error(`${row.name} has no balance anchor.`);
      const computed = actionDpr(row);
      expect(computed, `${row.name} computed DPR`).toBe(row.design.computedDpr);
      expect(computed, `${row.name} DPR band`).toBeGreaterThanOrEqual(anchor.allowedDpr[0]);
      expect(computed, `${row.name} DPR band`).toBeLessThanOrEqual(anchor.allowedDpr[1]);
      expect(row.statblock.armorClass, `${row.name} AC band`).toBeGreaterThanOrEqual(anchor.allowedArmorClass[0]);
      expect(row.statblock.armorClass, `${row.name} AC band`).toBeLessThanOrEqual(anchor.allowedArmorClass[1]);
      expect(row.statblock.hitPointMaximum, `${row.name} HP band`).toBeGreaterThanOrEqual(anchor.allowedHitPoints[0]);
      expect(row.statblock.hitPointMaximum, `${row.name} HP band`).toBeLessThanOrEqual(anchor.allowedHitPoints[1]);
      expect(row.provenance.designNote).toContain(`computed DPR ${String(computed)}`);
    }
  });

  it('homebrew_masquerades_as_srd: separates SRD and original provenance in the roster types and at runtime', () => {
    expectTypeOf<HomebrewBeastRosterRow['provenance']>().toEqualTypeOf<Extract<MonsterProvenance, { readonly kind: 'original_homebrew' }>>();
    expectTypeOf<StarterMonsterRosterRow['provenance']>().toEqualTypeOf<Extract<MonsterProvenance, { readonly kind: 'srd_5_2_1_decoded' }>>();
    expect(new Set(HOMEBREW_BEAST_ROSTER.map((row) => row.provenance.kind))).toEqual(new Set(['original_homebrew']));
    expect(new Set(STARTER_MONSTER_ROSTER.map((row) => row.provenance.kind))).toEqual(new Set(['srd_5_2_1_decoded']));
  });

  it('resolves a homebrew namespace row through the same bundled lookup used by an SRD row', () => {
    const homebrew = lookupBundledMonster('statblock:homebrew-beast/brush-bear');
    const srd = lookupBundledMonster('statblock:wolf');
    expect(homebrew.status).toBe('resolved');
    expect(srd.status).toBe('resolved');
    expect(homebrew.status === 'resolved' && homebrew.entry.kind === 'static' ? homebrew.entry.statblock.name : null).toBe('Brush Bear');
    expect(srd.status === 'resolved' && srd.entry.kind === 'static' ? srd.entry.statblock.name : null).toBe('Wolf');
  });

  it('A1-boundaries: binds low- and top-tier squeeze ticks to the grapple lifecycle and scales adjacent tiers', () => {
    const bears = HOMEBREW_BEAST_ROSTER.filter((row) => row.design.family === 'ursine');
    const squeeze = (row: HomebrewBeastRosterRow) => effects(row).find((effect): effect is Extract<MonsterOnHitEffect, { readonly kind: 'condition_bound_ongoing_damage' }> => effect.kind === 'condition_bound_ongoing_damage');
    expect(squeeze(bears[0] as HomebrewBeastRosterRow)).toMatchObject({ boundCondition: 'Grappled', damage: { average: 2 }, event: { kind: 'event_trigger', hook: 'target_turn_start', frequency: 'once_per_turn' }, endsWhen: { kind: 'condition_ends', condition: 'Grappled' } });
    expect(squeeze(bears[1] as HomebrewBeastRosterRow)?.damage.average).toBe(3);
    expect(squeeze(bears[7] as HomebrewBeastRosterRow)?.damage.average).toBe(9);
  });

  it('A2-boundaries: uses spell-side condition names with save and duration, adding Blinded only at high bird tiers', () => {
    const birds = HOMEBREW_BEAST_ROSTER.filter((row) => row.design.family === 'raptor');
    expect(effects(birds[0] as HomebrewBeastRosterRow).some((effect) => effect.kind === 'condition' && effect.condition === 'Blinded')).toBe(false);
    const firstBlinding = effects(birds[4] as HomebrewBeastRosterRow).find((effect) => effect.kind === 'condition' && effect.condition === 'Blinded');
    const topBlinding = effects(birds[7] as HomebrewBeastRosterRow).find((effect) => effect.kind === 'condition' && effect.condition === 'Blinded');
    expect(firstBlinding).toMatchObject({ savingThrow: { ability: 'constitution', dc: 15 }, duration: 'until_end_of_target_next_turn' });
    expect(topBlinding).toMatchObject({ savingThrow: { ability: 'constitution', dc: 18 }, duration: 'until_end_of_target_next_turn' });
  });

  it('distinguishes same-CR family kits by mechanics rather than names', () => {
    const bear = HOMEBREW_BEAST_ROSTER.find((row) => row.design.family === 'ursine' && row.design.challengeRating === 3);
    const spider = HOMEBREW_BEAST_ROSTER.find((row) => row.design.family === 'arachnid' && row.design.challengeRating === 3);
    if (bear === undefined || spider === undefined) throw new Error('Missing distinguishing CR 3 rows.');
    expect(bear.design.signatures.map((signature) => signature.mechanic)).toEqual(['bear_hug', 'ongoing_squeeze', 'tank_hit_points']);
    expect(spider.design.signatures.map((signature) => signature.mechanic)).toEqual(['web', 'venom', 'spider_climb']);
    expect(effects(bear).some((effect) => effect.kind === 'condition_bound_ongoing_damage')).toBe(true);
    expect(effects(spider).some((effect) => effect.kind === 'condition' && effect.condition === 'Poisoned')).toBe(true);
  });

  it('records every blocked signature, blocking vocabulary, and explicit standing-in mechanic', () => {
    expect(BEAST_FAMILY_DEFERRED_UPGRADES.map((entry) => [entry.family, entry.blockedSignature, entry.blockingVocabulary, entry.standingInMechanic])).toEqual([
      ['arachnid', 'web_sense', 'detection_lever', 'spider_climb_and_web_walker'],
      ['raptor', 'keen_sight', 'detection_lever', 'perception_skill'],
      ['pterosaur', 'descent_triggered_dive', 'elevation_and_flying', 'raking_pass_charge'],
      ['pterosaur', 'flyby', 'movement_opportunity_reaction_trigger', 'nimble_escape'],
      ['raptor', 'flyby', 'movement_opportunity_reaction_trigger', 'nimble_escape'],
    ]);
    expect(BEAST_FAMILY_DEFERRED_UPGRADES.every((entry) => entry.standingIn)).toBe(true);
  });
});
