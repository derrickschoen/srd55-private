import type { SrdRuleIdOfKind } from '../rule-index';
import type { RuleStatus } from '../rule-status-types';

/**
 * RULE_STATUS for the Gameplay Toolbox entries.
 * HAND-MAINTAINED: a new id in the generated index fails this record to
 * compile until it is given a status here.
 *
 * `unrepresented` names the unit that will type the rule (SRD-TYPED plan,
 * synthesis §6.2); `UNASSIGNED` means no planned unit owns it yet.
 */
const UNREPRESENTED_WORLD_TOOLBOX = { status: 'unrepresented', unit: 'WORLD-TOOLBOX' } as const;

export const TOOLBOX_STATUS = {
  'environmental_effect.deep-water': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.extreme-cold': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.extreme-heat': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.frigid-water': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.heavy-precipitation': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.high-altitude': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.slippery-ice': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.strong-wind': UNREPRESENTED_WORLD_TOOLBOX,
  'environmental_effect.thin-ice': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.collapsing-roof': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.falling-net': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.fire-casting-statue': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.hidden-pit': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.poisoned-darts': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.poisoned-needle': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.rolling-stone': UNREPRESENTED_WORLD_TOOLBOX,
  'trap.spiked-pit': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.assassins-blood': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.burnt-othur-fumes': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.crawler-mucus': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.essence-of-ether': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.malice': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.midnight-tears': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.oil-of-taggit': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.pale-tincture': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.purple-worm-poison': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.serpent-venom': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.spiders-sting': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.torpor': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.truth-serum': UNREPRESENTED_WORLD_TOOLBOX,
  'poison.wyvern-poison': UNREPRESENTED_WORLD_TOOLBOX,
  'magical_contagion.cackle-fever': UNREPRESENTED_WORLD_TOOLBOX,
  'magical_contagion.sewer-plague': UNREPRESENTED_WORLD_TOOLBOX,
  'magical_contagion.sight-rot': UNREPRESENTED_WORLD_TOOLBOX,
} as const satisfies { readonly [K in SrdRuleIdOfKind<'environmental_effect' | 'trap' | 'poison' | 'magical_contagion'>]: RuleStatus };
