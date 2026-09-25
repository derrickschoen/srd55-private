/**
 * Who can see or locate whom, and the close-combat facts that read it. This
 * is the reducer's rule; it lives outside the reducer module so the planning
 * port (which may not import src/combat/encounter.ts at runtime, see
 * tools/engine-mcp-proof.ts) applies the same function rather than a mirror.
 */
import { combatantsAreAllies } from './allies';
import { combatantConditions, combatantSpace, effectiveCombatRules } from './combat-rules';
import { isIncapacitated } from './conditions';
import { combatantLineVerdict } from './cover';
import { minimumSpaceDistance } from './creature-space';
import type { EncounterState } from './encounter';
import type { GridCell } from './grid';
import { CLOSE_COMBAT_DISTANCE_FEET, type CloseCombatEnemy } from './tactical-evaluator';
import { affectedCells } from './templates';
import { terrainWallCells } from './terrain';
import type { CombatantId } from './values';
import { environmentLightAt, environmentObscurementAt } from './world-objects';

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

export type DetectionResult =
  | {
      readonly kind: 'seen';
      readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight';
    }
  | {
      readonly kind: 'located';
      readonly sense: 'tremorsense' | 'web_sense';
    }
  | {
      readonly kind: 'undetected';
      readonly reason: 'blocked' | 'hidden' | 'invisible' | 'obscured' | 'darkness' | 'out_of_range';
    };

export function combatantIsHidden(state: EncounterState, subject: CombatantId): boolean {
  return state.hiddenCombatants.some((entry) => entry.combatant === subject);
}

function sharesWebArea(state: EncounterState, observer: CombatantId, subject: CombatantId): boolean {
  const persistentWeb = state.persistentAreas.some((area) => {
    return area.material?.id === 'webs' &&
      area.members.includes(observer) && area.members.includes(subject);
  });
  return persistentWeb || state.effects.some((effect) => {
    if (effect.payload.kind !== 'web_area' || effect.payload.placement === 'selected_when_cast') return false;
    const cells = affectedCells(
      { bounds: state.bounds, blockedCells: terrainWallCells(state) },
      effect.payload.placement,
    );
    const keys = new Set(cells.map(cellKey));
    return combatantSpace(state, observer).cells.some((cell) => keys.has(cellKey(cell))) &&
      combatantSpace(state, subject).cells.some((cell) => keys.has(cellKey(cell)));
  });
}

/**
 * Detection vocabulary and source clauses:
 * - Blindsight: docs/srd/full/srd-5.2.1.txt:11356-11362.
 * - Darkvision: docs/srd/full/srd-5.2.1.txt:11582-11588.
 * - Tremorsense: docs/srd/full/srd-5.2.1.txt:12206-12214 (location, not sight).
 * - Truesight: docs/srd/full/srd-5.2.1.txt:12216-12241.
 * - Web Sense: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23501-23503.
 */
export function detectCombatant(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): DetectionResult {
  const line = combatantLineVerdict(state, observer, subject);
  const to = line.targetCell;
  const distance = minimumSpaceDistance(combatantSpace(state, observer), combatantSpace(state, subject));
  const senses = effectiveCombatRules(state, observer).senses;
  const hasBlindsight = senses.some((sense) =>
    sense.kind === 'blindsight' && distance <= sense.rangeFeet);
  if (hasBlindsight && !line.blocksSight) {
    return { kind: 'seen', sense: 'blindsight' };
  }
  const hasTruesight = senses.some((sense) =>
    sense.kind === 'truesight' && distance <= sense.rangeFeet);
  const hasTremorsense = senses.some((sense) =>
    sense.kind === 'tremorsense' && distance <= sense.rangeFeet);
  const observerRules = effectiveCombatRules(state, observer);
  const subjectRules = effectiveCombatRules(state, subject);
  if (
    hasTremorsense &&
    observerRules.contactMedium !== 'air' &&
    observerRules.contactMedium === subjectRules.contactMedium
  ) return { kind: 'located', sense: 'tremorsense' };
  if (observerRules.detectionTraits.includes('web_sense') && sharesWebArea(state, observer, subject)) {
    return { kind: 'located', sense: 'web_sense' };
  }
  if (line.blocksSight) return { kind: 'undetected', reason: 'blocked' };

  const observerBlinded = combatantConditions(state, observer)
    .some(({ name }) => name === 'Blinded');
  if (observerBlinded) return { kind: 'undetected', reason: 'obscured' };
  const subjectInvisible = combatantConditions(state, subject)
    .some(({ name }) => name === 'Invisible');
  const hidden = combatantIsHidden(state, subject);
  if (hidden && !hasTruesight) return { kind: 'undetected', reason: 'hidden' };
  if (subjectInvisible && !hasTruesight) return { kind: 'undetected', reason: 'invisible' };

  const environmentObscurement = environmentObscurementAt(state.environment, to);
  let heavyObscurement = environmentObscurement === 'heavy';
  let magicalDarkness = environmentObscurement === 'magical_darkness';
  for (const effect of state.effects) {
    if (effect.payload.kind !== 'obscured_area' || effect.payload.placement === 'selected_when_cast') continue;
    const cells = affectedCells(
      { bounds: state.bounds, blockedCells: terrainWallCells(state) },
      effect.payload.placement,
    );
    if (!cells.some((cell) => cellKey(cell) === cellKey(to))) continue;
    if (effect.payload.obscurement === 'heavy') heavyObscurement = true;
    else magicalDarkness = true;
  }
  if (heavyObscurement) return { kind: 'undetected', reason: 'obscured' };
  if (hasTruesight) return { kind: 'seen', sense: 'truesight' };
  if (magicalDarkness) return { kind: 'undetected', reason: 'darkness' };
  const light = environmentLightAt(state.environment, to);
  if (light !== 'darkness') return { kind: 'seen', sense: 'normal_sight' };
  const hasDarkvision = senses.some((sense) =>
    sense.kind === 'darkvision' && distance <= sense.rangeFeet);
  return hasDarkvision
    ? { kind: 'seen', sense: 'darkvision' }
    : { kind: 'undetected', reason: senses.some((sense) => sense.kind === 'darkvision') ? 'out_of_range' : 'darkness' };
}

export function canCombatantSee(
  state: EncounterState,
  observer: CombatantId,
  subject: CombatantId,
): boolean {
  return detectCombatant(state, observer, subject).kind === 'seen';
}


/**
 * The attacker's enemies within 5 feet of its space, with the facts the
 * Ranged Attacks in Close Combat rule reads (closeCombatVerdict,
 * docs/srd/full/srd-5.2.1.txt:911-917): a placed creature of the opposing
 * side that is not dead, whether it can see the attacker (canCombatantSee),
 * and whether it is Incapacitated. A creature at 0 Hit Points, dying or
 * Stable, has the Unconscious condition (docs/srd/full/srd-5.2.1.txt:1079-1082,
 * 1115-1117), which includes Incapacitated. The reducer, the reducer's monster
 * evaluation and the planning port all state the facts through this function.
 */
export function closeCombatEnemies(
  state: EncounterState,
  attackerId: CombatantId,
): readonly CloseCombatEnemy<boolean>[] {
  const attackerSpace = combatantSpace(state, attackerId);
  return state.combatants.flatMap((subject): readonly CloseCombatEnemy<boolean>[] => {
    const id = subject.profile.id;
    if (
      id === attackerId || subject.life === 'dead' ||
      !state.tokens.some((candidate) => candidate.combatantId === id) ||
      combatantsAreAllies(state, attackerId, id)
    ) return [];
    const distanceFeet = minimumSpaceDistance(attackerSpace, combatantSpace(state, id));
    if (distanceFeet > CLOSE_COMBAT_DISTANCE_FEET) return [];
    return [{
      id,
      distanceFeet,
      seesAttacker: canCombatantSee(state, id, attackerId),
      incapacitated: subject.life !== 'living' || isIncapacitated(combatantConditions(state, id)),
    }];
  });
}
