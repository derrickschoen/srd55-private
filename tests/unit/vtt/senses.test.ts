import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { combatToken } from '../../../src/combat/combatant';
import { canCombatantSee, createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import { feet } from '../../../src/combat/values';
import {
  importedMonsterAttackCommand,
  importedMonsterProfile,
  loadContentPack,
  type LoadedContentPack,
  type LoadedContentMonster,
} from '../../../src/content/content-pack';
import { placedToken, playerProfile } from '../combat/fixtures';

const FIXTURE_PATH = 'tests/fixtures/content-pack-v1-homebrew.json';

interface ImportedSightFixture {
  readonly content: LoadedContentPack;
  readonly monster: LoadedContentMonster;
  readonly profile: CombatantProfile;
}

function importedSightProfile(
  key: string,
  senses: readonly (
    | { readonly kind: 'normal_sight' }
    | { readonly kind: 'blindsight' | 'darkvision' | 'tremorsense' | 'truesight'; readonly rangeFeet: number }
  )[],
): ImportedSightFixture {
  const pack = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown;
  const root = pack as {
    packId: string;
    monsters: Array<{ recordId: string; name: string; statblock: { senses: unknown } }>;
  };
  root.packId = `senses-${key}`;
  const record = root.monsters[0];
  if (record === undefined) throw new Error('Imported senses fixture has no monster.');
  record.recordId = key;
  record.name = key;
  record.statblock.senses = senses;
  const result = loadContentPack(pack);
  if (result.status !== 'loaded') throw new Error(`Imported senses fixture was refused: ${result.refusal.reason}`);
  const monster = result.content.monsters[0];
  if (monster === undefined) throw new Error('Imported senses monster was rejected.');
  return {
    content: result.content,
    monster,
    profile: importedMonsterProfile(monster, {
      combatantId: `combatant:${key}`,
      tokenId: `token:${key}`,
    }),
  };
}

function visibilityState(
  observer: ImportedSightFixture,
  distanceFeet: number,
  target = playerProfile(`subject-${String(distanceFeet)}`, { initiativeBonus: 20, spellSlots: referencePartySpellSlots('Wizard') }),
): { readonly state: EncounterState; readonly target: CombatantProfile } {
  const state = createEncounter({
    bounds: { columns: 20, rows: 3 },
    combatants: [target, observer.profile],
    tokens: [placedToken(target, 0, 1), combatToken(observer.profile, { column: distanceFeet / 5, row: 1 })],
    contentPacks: [observer.content],
  });
  return { state, target };
}

function castCommand(caster: CombatantProfile, spellId: 'blur' | 'invisibility'): SpellCastCommand {
  return {
    type: 'cast_spell', actor: caster.id, spellId, slotLevel: 2, castAsRitual: false,
    casterLevel: 7, attackBonus: 8, saveDc: 16, spellcastingModifier: 4,
    targets: spellId === 'invisibility' ? [caster.id] : [], area: null,
    weaponAttack: null, selectedOption: null,
  };
}

function startedWithSpell(
  observer: ImportedSightFixture,
  spellId: 'blur' | 'invisibility',
  distanceFeet = 30,
): {
  readonly state: EncounterState;
  readonly target: CombatantProfile;
} {
  const setup = visibilityState(observer, distanceFeet);
  let state = reduceEncounter(setup.state, { type: 'roll_initiative' }, () => 0.5).state;
  state = reduceEncounter(state, castCommand(setup.target, spellId), () => 0.5).state;
  return { state, target: setup.target };
}

function attackOutcome(observer: ImportedSightFixture): string | undefined {
  // Keep this senses-only attack inside the imported attack's 5-foot reach.
  const setup = startedWithSpell(observer, 'blur', 5);
  let state = reduceEncounter(setup.state, { type: 'end_turn', actor: setup.target.id }, () => 0.5).state;
  const faces = [19, 2];
  let index = 0;
  const attack = reduceEncounter(
    state,
    importedMonsterAttackCommand(observer.monster, 'attack:brassleaf-tap', observer.profile.id, setup.target.id),
    () => ((faces[index++] ?? 19) - 0.5) / 20,
  );
  return attack.events.find((event) => event.type === 'attack_resolved')?.attack.outcome;
}

describe('D348.1 imported combat senses and subject-cell obscurement', () => {
  it('blindsight_ignores_range and blindsight_range_boundary: sees at exactly 30 feet and not one 5-foot cell beyond', () => {
    // Blindsight: docs/srd/full/srd-5.2.1.txt:11356-11362.
    const observer = importedSightProfile('boundary-blindsight', [
      { kind: 'normal_sight' }, { kind: 'blindsight', rangeFeet: 30 },
    ]);
    const at = visibilityState(observer, 30);
    const beyond = visibilityState(observer, 35);
    const darkEnvironment = (state: EncounterState, subject: CombatantProfile): EncounterState => ({
      ...state,
      environment: {
        ...state.environment,
        lightRegions: [{ id: 'dark-cell', cells: [state.tokens.find(({ combatantId }) => combatantId === subject.id)?.position ?? { column: 0, row: 0 }], level: 'darkness' }],
      },
    });
    expect(canCombatantSee(darkEnvironment(at.state, at.target), observer.profile.id, at.target.id)).toBe(true);
    expect(canCombatantSee(darkEnvironment(beyond.state, beyond.target), observer.profile.id, beyond.target.id)).toBe(false);
  });

  it('darkvision_unbounded: darkvision sees a creature at its range edge but not one cell beyond', () => {
    // Darkvision: docs/srd/full/srd-5.2.1.txt:11582-11588.
    const observer = importedSightProfile('boundary-darkvision', [
      { kind: 'normal_sight' }, { kind: 'darkvision', rangeFeet: 30 },
    ]);
    const darkState = (distanceFeet: number): { readonly state: EncounterState; readonly target: CombatantProfile } => {
      const setup = visibilityState(observer, distanceFeet);
      return {
        ...setup,
        state: {
          ...setup.state,
          environment: {
            ...setup.state.environment,
            lightRegions: [{ id: 'darkness', cells: [placedToken(setup.target, 0, 1).position], level: 'darkness' }],
          },
        },
      };
    };
    const at = darkState(30);
    const beyond = darkState(35);
    expect(canCombatantSee(at.state, observer.profile.id, at.target.id)).toBe(true);
    expect(canCombatantSee(beyond.state, observer.profile.id, beyond.target.id)).toBe(false);
  });

  it('invisible_condition_ignored: invisible target differs under normal sight, in-range blindsight, and in-range truesight', () => {
    // Invisible/Truesight: docs/srd/full/srd-5.2.1.txt:11838-11850,12216-12231.
    const normal = importedSightProfile('invisible-normal', [{ kind: 'normal_sight' }]);
    const blind = importedSightProfile('invisible-blind', [{ kind: 'normal_sight' }, { kind: 'blindsight', rangeFeet: 30 }]);
    const truth = importedSightProfile('invisible-true', [{ kind: 'normal_sight' }, { kind: 'truesight', rangeFeet: 30 }]);
    const normalState = startedWithSpell(normal, 'invisibility');
    const blindState = startedWithSpell(blind, 'invisibility');
    const truthState = startedWithSpell(truth, 'invisibility');
    expect(canCombatantSee(normalState.state, normal.profile.id, normalState.target.id)).toBe(false);
    expect(canCombatantSee(blindState.state, blind.profile.id, blindState.target.id)).toBe(true);
    expect(canCombatantSee(truthState.state, truth.profile.id, truthState.target.id)).toBe(true);
  });

  it('truesight_no_illusion_pierce and blur_visual_sense_bypass: sighted and blindsighted attackers produce different attack outcomes', () => {
    // Blur: docs/srd/full/srd-5.2.1.txt:6978-6995.
    const normal = importedSightProfile('blur-normal', [{ kind: 'normal_sight' }]);
    const blind = importedSightProfile('blur-blind', [{ kind: 'normal_sight' }, { kind: 'blindsight', rangeFeet: 30 }]);
    const truth = importedSightProfile('blur-true', [{ kind: 'normal_sight' }, { kind: 'truesight', rangeFeet: 30 }]);
    expect(attackOutcome(normal)).toBe('miss');
    expect(attackOutcome(blind)).toBe('hit');
    expect(attackOutcome(truth)).toBe('hit');
  });

  it('obscured_still_visible and subject_cell_obscurement_edge: obscured subject is unseen while its adjacent clear cell remains visible', () => {
    // Heavy obscurement: docs/srd/full/srd-5.2.1.txt:661-664.
    const observer = importedSightProfile('obscurement-normal', [{ kind: 'normal_sight' }]);
    const obscured = playerProfile('obscured-subject');
    const clear = playerProfile('clear-subject');
    const state = createEncounter({
      bounds: { columns: 8, rows: 3 },
      combatants: [observer.profile, obscured, clear],
      tokens: [combatToken(observer.profile, { column: 0, row: 1 }), placedToken(obscured, 4, 1), placedToken(clear, 5, 1)],
      contentPacks: [observer.content],
      environment: {
        lightRegions: [], difficultTerrainRegions: [], movementRegions: [], narrowOpeningRegions: [],
        obscurementRegions: [{ id: 'fog-edge', cells: [{ column: 4, row: 1 }], obscurement: 'heavy' }],
      },
    });
    expect(canCombatantSee(state, observer.profile.id, obscured.id)).toBe(false);
    expect(canCombatantSee(state, observer.profile.id, clear.id)).toBe(true);
  });

  it('imports and executes a subject-cell debris-cloud world region', () => {
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown;
    const pack = raw as { spells: Array<{ targeting: unknown; operation: unknown }> };
    const spell = pack.spells[0];
    if (spell === undefined) throw new Error('Debris-cloud fixture has no spell.');
    spell.targeting = { kind: 'area', rangeFeet: 30, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 };
    spell.operation = {
      kind: 'world_operations',
      operations: [{ kind: 'set_obscurement', regionId: 'dust-debris', obscurement: 'heavy', geometry: 'subject_cell' }],
    };
    const loaded = loadContentPack(raw);
    if (loaded.status !== 'loaded') throw new Error(`Debris-cloud pack was refused: ${loaded.refusal.reason}`);
    const caster = playerProfile('debris-caster', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const subject = playerProfile('debris-subject', { initiativeBonus: -20 });
    let state = createEncounter({
      bounds: { columns: 8, rows: 3 }, combatants: [caster, subject],
      tokens: [placedToken(caster, 0, 1), placedToken(subject, 4, 1)], contentPacks: [loaded.content],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const command: SpellCastCommand = {
      type: 'cast_spell', actor: caster.id, spellId: 'greenforge:prism-pebble', slotLevel: 1,
      castAsRitual: false, casterLevel: 1, attackBonus: 3, saveDc: 11, spellcastingModifier: 1,
      targets: [], area: { shape: 'sphere', template: { origin: feetPoint(20, 5), radius: feet(5) } },
      weaponAttack: null, selectedOption: null,
    };
    state = reduceEncounter(state, command, () => 0.5).state;
    expect(state.environment.obscurementRegions[0]).toMatchObject({ id: 'dust-debris', obscurement: 'heavy' });
    expect(state.environment.obscurementRegions[0]?.cells).toContainEqual({ column: 4, row: 1 });
    expect(canCombatantSee(state, caster.id, subject.id)).toBe(false);
  });

  it('keeps effect-sourced magical darkness distinct from heavy obscurement for truesight', () => {
    // Truesight and heavy obscurement: docs/srd/full/srd-5.2.1.txt:661-664,12216-12231.
    const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown;
    const pack = raw as {
      packId: string;
      spells: Array<{ recordId: string; name: string; targeting: unknown; operation: unknown }>;
      monsters: Array<{ recordId: string; name: string; statblock: { senses: unknown } }>;
    };
    pack.packId = 'senses-effect-obscurement';

    const magicalDarkness = pack.spells[0];
    if (magicalDarkness === undefined) throw new Error('Effect-obscurement fixture has no spell.');
    magicalDarkness.recordId = 'nightglass-cloud';
    magicalDarkness.name = 'Nightglass Cloud';
    magicalDarkness.targeting = { kind: 'area', rangeFeet: 30, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 };
    magicalDarkness.operation = {
      kind: 'effect',
      effect: {
        payload: {
          kind: 'obscured_area', placement: 'selected_when_cast', radiusFeet: 5,
          obscurement: 'magical_darkness', dispersedByStrongWind: false,
        },
        target: 'self', concentration: false, durationRounds: 10, expiresAt: 'source_start',
      },
    };
    const heavyObscurement = structuredClone(magicalDarkness);
    heavyObscurement.recordId = 'ash-cloud';
    heavyObscurement.name = 'Ash Cloud';
    heavyObscurement.operation = {
      kind: 'effect',
      effect: {
        payload: {
          kind: 'obscured_area', placement: 'selected_when_cast', radiusFeet: 5,
          obscurement: 'heavy', dispersedByStrongWind: false,
        },
        target: 'self', concentration: false, durationRounds: 10, expiresAt: 'source_start',
      },
    };
    pack.spells.push(heavyObscurement);

    const truesightMonster = pack.monsters[0];
    if (truesightMonster === undefined) throw new Error('Effect-obscurement fixture has no observer.');
    truesightMonster.recordId = 'effect-truesight';
    truesightMonster.name = 'Effect Truesight';
    truesightMonster.statblock.senses = [{ kind: 'normal_sight' }, { kind: 'truesight', rangeFeet: 30 }];
    const normalMonster = structuredClone(truesightMonster);
    normalMonster.recordId = 'effect-normal';
    normalMonster.name = 'Effect Normal';
    normalMonster.statblock.senses = [{ kind: 'normal_sight' }];
    pack.monsters.push(normalMonster);

    const loaded = loadContentPack(raw);
    if (loaded.status !== 'loaded') throw new Error(`Effect-obscurement pack was refused: ${loaded.refusal.reason}`);
    const importedTruesight = loaded.content.monsters.find(({ id }) => id === 'greenforge:effect-truesight');
    const importedNormal = loaded.content.monsters.find(({ id }) => id === 'greenforge:effect-normal');
    if (importedTruesight === undefined || importedNormal === undefined) {
      throw new Error('Effect-obscurement observers were rejected.');
    }
    const truesight = importedMonsterProfile(importedTruesight, {
      combatantId: 'combatant:effect-truesight', tokenId: 'token:effect-truesight',
    });
    const normal = importedMonsterProfile(importedNormal, {
      combatantId: 'combatant:effect-normal', tokenId: 'token:effect-normal',
    });
    const caster = playerProfile('effect-obscurement-caster', {
      initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }],
    });
    const subject = playerProfile('effect-obscurement-subject', { initiativeBonus: -20 });
    const stateWith = (spellId: 'greenforge:nightglass-cloud' | 'greenforge:ash-cloud'): EncounterState => {
      let state = createEncounter({
        bounds: { columns: 8, rows: 3 },
        combatants: [caster, subject, truesight, normal],
        tokens: [
          placedToken(caster, 1, 1), placedToken(subject, 4, 1),
          combatToken(truesight, { column: 0, row: 0 }), combatToken(normal, { column: 0, row: 2 }),
        ],
        contentPacks: [loaded.content],
      });
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
      state = reduceEncounter(state, {
        type: 'cast_spell', actor: caster.id, spellId, slotLevel: 1,
        castAsRitual: false, casterLevel: 1, attackBonus: 3, saveDc: 11, spellcastingModifier: 1,
        targets: [], area: { shape: 'sphere', template: { origin: feetPoint(20, 5), radius: feet(5) } },
        weaponAttack: null, selectedOption: null,
      }, () => 0.5).state;
      return state;
    };

    const magicalDarknessState = stateWith('greenforge:nightglass-cloud');
    expect(canCombatantSee(magicalDarknessState, truesight.id, subject.id)).toBe(true);
    expect(canCombatantSee(magicalDarknessState, normal.id, subject.id)).toBe(false);

    const heavyObscurementState = stateWith('greenforge:ash-cloud');
    expect(canCombatantSee(heavyObscurementState, truesight.id, subject.id)).toBe(false);
  });

  it('imports Tremorsense and refuses still-unsupported senses and ray-intersection obscurement with named record reasons', () => {
    const tremor = importedSightProfile('tremorsense-supported', [
      { kind: 'normal_sight' }, { kind: 'tremorsense', rangeFeet: 30 },
    ]);
    expect(tremor.profile.rules.senses).toContainEqual({ kind: 'tremorsense', rangeFeet: feet(30) });
    const cases: readonly {
      readonly reason: string;
      readonly mutate: (pack: { monsters: Array<{ statblock: { senses: unknown } }>; spells: Array<{ operation: unknown }> }) => void;
    }[] = [
      { reason: 'devilsight-not-modelled', mutate: (pack) => { pack.monsters[0]!.statblock.senses = [{ kind: 'devilsight', rangeFeet: 120 }]; } },
      { reason: 'ethereal-plane-semantics-not-modelled', mutate: (pack) => { pack.monsters[0]!.statblock.senses = [{ kind: 'truesight', rangeFeet: 30, seesEtherealPlane: true }]; } },
      { reason: 'ethereal-plane-semantics-not-modelled', mutate: (pack) => { pack.spells[0]!.operation = { kind: 'effect', effect: { payload: { kind: 'see_invisibility', seesEtherealPlane: true } } }; } },
      { reason: 'obscurement-geometry-not-modelled', mutate: (pack) => { pack.spells[0]!.operation = { kind: 'world_operations', operations: [{ kind: 'set_obscurement', regionId: 'ray-fog', obscurement: 'heavy', geometry: 'ray_intersection' }] }; } },
    ];
    for (const entry of cases) {
      const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as unknown;
      const pack = raw as { monsters: Array<{ statblock: { senses: unknown } }>; spells: Array<{ operation: unknown }> };
      entry.mutate(pack);
      const result = loadContentPack(raw);
      if (result.status !== 'loaded') throw new Error(`Named-refusal pack failed at envelope level: ${result.refusal.reason}`);
      expect(result.content.diagnostics).toContainEqual(expect.objectContaining({ reason: entry.reason }));
    }
  });
});
