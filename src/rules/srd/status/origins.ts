import type { SrdRuleIdOfKind } from '../rule-index';
import type { RuleStatus } from '../rule-status-types';

/**
 * RULE_STATUS for species, species traits, backgrounds and feats.
 * HAND-MAINTAINED: a new id in the generated index fails this record to
 * compile until it is given a status here.
 *
 * `unrepresented` names the unit that will type the rule (SRD-TYPED plan,
 * synthesis §6.2); `UNASSIGNED` means no planned unit owns it yet.
 */
const UNREPRESENTED_ORIGINS_FEATS = { status: 'unrepresented', unit: 'ORIGINS-FEATS' } as const;

export const ORIGINS_STATUS = {
  'species.dragonborn': UNREPRESENTED_ORIGINS_FEATS,
  'species.dwarf': UNREPRESENTED_ORIGINS_FEATS,
  'species.elf': UNREPRESENTED_ORIGINS_FEATS,
  'species.gnome': UNREPRESENTED_ORIGINS_FEATS,
  'species.goliath': UNREPRESENTED_ORIGINS_FEATS,
  'species.halfling': UNREPRESENTED_ORIGINS_FEATS,
  'species.human': UNREPRESENTED_ORIGINS_FEATS,
  'species.orc': UNREPRESENTED_ORIGINS_FEATS,
  'species.tiefling': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dragonborn.draconic-ancestry': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dragonborn.breath-weapon': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dragonborn.damage-resistance': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dragonborn.darkvision': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dragonborn.draconic-flight': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dwarf.darkvision': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dwarf.dwarven-resilience': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dwarf.dwarven-toughness': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.dwarf.stonecunning': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.elf.darkvision': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.elf.elven-lineage': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.elf.fey-ancestry': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.elf.keen-senses': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.elf.trance': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.gnome.darkvision': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.gnome.gnomish-cunning': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.gnome.gnomish-lineage': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.goliath.giant-ancestry': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.goliath.large-form': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.goliath.powerful-build': {
    ...UNREPRESENTED_ORIGINS_FEATS,
    excluded: [{ clause: 'You also count as one size larger when determining your carrying capacity.', exclusion: 'encumbrance' }],
  },
  'species_trait.halfling.brave': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.halfling.halfling-nimbleness': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.halfling.luck': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.halfling.naturally-stealthy': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.human.resourceful': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.human.skillful': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.human.versatile': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.orc.adrenaline-rush': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.orc.darkvision': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.orc.relentless-endurance': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.tiefling.darkvision': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.tiefling.fiendish-legacy': UNREPRESENTED_ORIGINS_FEATS,
  'species_trait.tiefling.otherworldly-presence': UNREPRESENTED_ORIGINS_FEATS,
  // D61: the printed feat is a suggestion; the player chooses the Origin feat.
  'background.acolyte': {
    ...UNREPRESENTED_ORIGINS_FEATS,
    excluded: [{ clause: 'Feat: Magic Initiate (Cleric) (see “Feats”)', exclusion: 'fixed_background_feat' }],
  },
  'background.criminal': {
    ...UNREPRESENTED_ORIGINS_FEATS,
    excluded: [{ clause: 'Feat: Alert (see “Feats”)', exclusion: 'fixed_background_feat' }],
  },
  'background.sage': {
    ...UNREPRESENTED_ORIGINS_FEATS,
    excluded: [{ clause: 'Feat: Magic Initiate (Wizard) (see “Feats”)', exclusion: 'fixed_background_feat' }],
  },
  'background.soldier': {
    ...UNREPRESENTED_ORIGINS_FEATS,
    excluded: [{ clause: 'Feat: Savage Attacker (see “Feats”)', exclusion: 'fixed_background_feat' }],
  },
  'feat.alert': UNREPRESENTED_ORIGINS_FEATS,
  'feat.magic-initiate': UNREPRESENTED_ORIGINS_FEATS,
  'feat.savage-attacker': UNREPRESENTED_ORIGINS_FEATS,
  'feat.skilled': UNREPRESENTED_ORIGINS_FEATS,
  'feat.ability-score-improvement': UNREPRESENTED_ORIGINS_FEATS,
  'feat.grappler': UNREPRESENTED_ORIGINS_FEATS,
  'feat.archery': UNREPRESENTED_ORIGINS_FEATS,
  'feat.defense': UNREPRESENTED_ORIGINS_FEATS,
  'feat.great-weapon-fighting': UNREPRESENTED_ORIGINS_FEATS,
  'feat.two-weapon-fighting': UNREPRESENTED_ORIGINS_FEATS,
  'feat.boon-of-combat-prowess': UNREPRESENTED_ORIGINS_FEATS,
  'feat.boon-of-dimensional-travel': UNREPRESENTED_ORIGINS_FEATS,
  'feat.boon-of-fate': UNREPRESENTED_ORIGINS_FEATS,
  'feat.boon-of-irresistible-offense': UNREPRESENTED_ORIGINS_FEATS,
  'feat.boon-of-spell-recall': UNREPRESENTED_ORIGINS_FEATS,
  'feat.boon-of-the-night-spirit': UNREPRESENTED_ORIGINS_FEATS,
  'feat.boon-of-truesight': UNREPRESENTED_ORIGINS_FEATS,
} as const satisfies { readonly [K in SrdRuleIdOfKind<'species' | 'species_trait' | 'background' | 'feat'>]: RuleStatus };
