import { FORM_REPLACEMENT_RETAINED_STATISTICS } from '../../src/combat/spells/types';
import { loadContentPack, type LoadedContentPack } from '../../src/content/content-pack';
import type { KnownCreatureSize } from '../../src/domain/enums';

/**
 * A Polymorph-shaped content-pack spell built from the engine's own operation shapes (as forms.test.ts builds its
 * form spells): a Wisdom save whose failure replaces the target's statistics with a form of `formSize`
 * (form_replacement, stat_override). The reducer applies the form through its size transition, which always sets
 * the normal mode of the form's size. The SRD Polymorph definition changes no size in this engine, so this is the
 * failed save that moves both a creature's size and its mode (FOOTPRINT §6.3, W13 and W13b). Its id is
 * `greenforge:shape-curse`; `packSource` is the homebrew pack fixture's parsed JSON.
 */
export function shapeCursePack(packSource: Readonly<Record<string, unknown>>, formSize: KnownCreatureSize): LoadedContentPack {
  const source = structuredClone(packSource) as Record<string, unknown> & { spells: Record<string, unknown>[] };
  source.packId = 'footprint-shape-curse';
  const template = source.spells[0];
  if (template === undefined) throw new Error('The homebrew pack fixture has no spell template.');
  source.spells = [{
    ...template,
    recordId: 'shape-curse', name: 'Shape Curse', level: 1,
    duration: { kind: 'rounds', rounds: 10 }, concentration: true,
    targeting: { kind: 'single', rangeFeet: 30, willing: false },
    operation: {
      kind: 'shared_outcome',
      delivery: { kind: 'save', ability: 'wisdom', rollMode: 'normal' },
      onFailure: [{
        kind: 'form_replacement',
        form: {
          kind: 'stat_override',
          stats: {
            id: 'curse-beast', name: 'Curse Beast', armorClass: 12, hitPointMaximum: 10, sizeCategory: formSize,
            speedFeet: 30, initiativeBonus: 0,
            savingThrowBonuses: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
            attacksPerAction: 1, reachFeet: 5, damageResponses: [], conditionImmunities: [],
            senses: [{ kind: 'normal_sight' }],
            actions: [{
              kind: 'attack', id: 'curse-bite', name: 'Curse Bite', attackBonus: 3,
              delivery: { kind: 'melee', reachFeet: 5 },
              damage: [{ average: 4, dice: { count: 1, sides: 6, modifier: 1 }, type: 'Piercing', trigger: { kind: 'always' } }],
              attackRollAdvantage: null, onHit: [],
            }],
          },
        },
        retainedStatistics: FORM_REPLACEMENT_RETAINED_STATISTICS,
        hitPoints: 'temporary_form_pool',
        equipmentDisposition: 'merged_into_form',
        actionAccess: 'form_statblock_only',
        spellcasting: 'prohibited',
        lifecycle: { concentration: true, durationRounds: 10, expiresAt: 'source_start' },
      }],
      onSuccess: [],
    },
  }];
  const loaded = loadContentPack(source);
  if (loaded.status !== 'loaded') throw new Error(`The shape-curse pack was refused: ${JSON.stringify(loaded.refusal)}`);
  return loaded.content;
}
