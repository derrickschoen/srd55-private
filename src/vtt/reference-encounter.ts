import type { CombatantProfile, CombatToken } from '../combat/combatant';
import type { LegalActionSummary } from '../combat/controllers';
import type { EncounterState } from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import { gridDistance, isCellInside, type GridCell } from '../combat/grid';
import { feetPoint, previewAffectedCells } from '../combat/templates';
import { referencePartySpellSlots } from '../combat/spells/resources';
import {
  armorClass,
  combatantId,
  damageType,
  dieSides,
  feet,
  statblockId,
  tokenId,
  type CombatantId,
} from '../combat/values';

const SAVES = {
  strength: 3,
  dexterity: 2,
  constitution: 3,
  intelligence: 1,
  wisdom: 2,
  charisma: 0,
} as const;

function profile(
  key: string,
  name: string,
  kind: 'player_character' | 'monster',
  options: {
    readonly maximumHp: number;
    readonly armor: number;
    readonly initiative: number;
    readonly spellSlots?: CombatantProfile['rules']['spellSlots'];
  },
): CombatantProfile {
  const common = {
    id: combatantId(`combatant:${key}`),
    tokenId: tokenId(`token:${key}`),
    name,
    rules: {
      armorClass: armorClass(options.armor),
      hitPointMaximum: options.maximumHp,
      speed: feet(30),
      initiativeBonus: options.initiative,
      savingThrowBonuses: SAVES,
      attacksPerAction: key === 'fighter' ? 2 : 1,
      reach: feet(5),
      damageResponses: [],
      conditionImmunities: [],
      usesDeathSaves: kind === 'player_character',
      senses: [{ kind: 'normal_sight' }],
      passivePerception: 12,
      detectionTraits: [],
      contactMedium: 'surface',
      ...(key === 'training-brute' ? { skillBonuses: { stealth: 20 } } : {}),
      spellSlots: options.spellSlots ?? [],
    },
  } as const;
  return kind === 'player_character'
    ? { ...common, kind, characterId: key === 'fighter' ? 1 : key === 'cleric' ? 2 : 3, wildShape: null }
    : { ...common, kind, statblockId: statblockId('statblock:training-brute') };
}

export const REFERENCE_FIGHTER_ID = combatantId('combatant:fighter');
export const REFERENCE_CLERIC_ID = combatantId('combatant:cleric');
export const REFERENCE_WIZARD_ID = combatantId('combatant:wizard');
export const REFERENCE_MONSTER_ID = combatantId('combatant:training-brute');
export const REFERENCE_PLAYER_IDS: readonly CombatantId[] = [
  REFERENCE_FIGHTER_ID,
  REFERENCE_CLERIC_ID,
  REFERENCE_WIZARD_ID,
];

export function referenceEncounterSetup(): {
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly combatants: readonly CombatantProfile[];
  readonly tokens: readonly CombatToken[];
  readonly blockedCells: readonly GridCell[];
  readonly foggedCells: readonly GridCell[];
  readonly environment: EncounterState['environment'];
  readonly dmNotes: readonly string[];
} {
  const fighter = profile('fighter', 'Reference Fighter', 'player_character', {
    maximumHp: 67,
    armor: 18,
    initiative: 100,
  });
  const cleric = profile('cleric', 'Reference Cleric', 'player_character', {
    maximumHp: 52,
    armor: 18,
    initiative: 70,
    spellSlots: referencePartySpellSlots('Cleric'),
  });
  const wizard = profile('wizard', 'Reference Wizard', 'player_character', {
    maximumHp: 38,
    armor: 15,
    initiative: 40,
    spellSlots: referencePartySpellSlots('Wizard'),
  });
  const monster = profile('training-brute', 'Training Brute', 'monster', {
    maximumHp: 80,
    armor: 12,
    initiative: 0,
  });
  const positions: readonly GridCell[] = [
    { column: 2, row: 3 },
    { column: 1, row: 4 },
    { column: 1, row: 2 },
    { column: 3, row: 3 },
  ];
  const combatants = [fighter, cleric, wizard, monster];
  return {
    bounds: { columns: 10, rows: 7 },
    combatants,
    tokens: combatants.map((combatant, index) => ({
      id: combatant.tokenId,
      combatantId: combatant.id,
      position: positions[index] as GridCell,
    })),
    blockedCells: [{ column: 7, row: 2 }],
    foggedCells: [{ column: 8, row: 1 }, { column: 8, row: 2 }],
    environment: {
      lightRegions: [{ id: 'reference-hiding-shadow', cells: [{ column: 4, row: 3 }], level: 'darkness' }],
      obscurementRegions: [],
      difficultTerrainRegions: [],
      movementRegions: [],
    },
    dmNotes: ['Training Brute retreats after the three reference PCs act.'],
  };
}

function subject(state: EncounterState, id: CombatantId) {
  const found = state.combatants.find((candidate) => candidate.profile.id === id);
  if (found === undefined) throw new Error(`Unknown reference combatant ${id}.`);
  return found;
}

function position(state: EncounterState, id: CombatantId): GridCell {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new Error(`Reference combatant ${id} has no token.`);
  return found.position;
}

function occupied(state: EncounterState, cell: GridCell): boolean {
  return state.tokens.some(
    (token) =>
      token.position.column === cell.column && token.position.row === cell.row,
  );
}

function movementActions(state: EncounterState, actor: CombatantId): readonly EncounterCommand[] {
  const current = position(state, actor);
  if (subject(state, actor).turn.movement.remaining < 5) return [];
  const actions: EncounterCommand[] = [];
  for (let columnDelta = -1; columnDelta <= 1; columnDelta += 1) {
    for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
      if (columnDelta === 0 && rowDelta === 0) continue;
      const to = {
        column: current.column + columnDelta,
        row: current.row + rowDelta,
      };
      if (
        isCellInside(state.bounds, to) &&
        !occupied(state, to) &&
        !state.blockedCells.some(
          (cell) => cell.column === to.column && cell.row === to.row,
        )
      ) {
        actions.push({ type: 'move', actor, path: [to], cause: 'voluntary' });
      }
    }
  }
  return actions;
}

function weaponAttack(
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor,
    target,
    attackBonus: 7,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Slashing'),
        dice: { count: 1, sides: dieSides(8), modifier: 4 },
      }],
      critical: false,
      responses: [],
    },
  };
}

function shatterActions(state: EncounterState, actor: CombatantId): readonly EncounterCommand[] {
  const actions: EncounterCommand[] = [];
  for (let row = 0; row <= state.bounds.rows; row += 1) {
    for (let column = 0; column <= state.bounds.columns; column += 1) {
      const area = {
        shape: 'sphere' as const,
        template: { origin: feetPoint(column * 5, row * 5), radius: feet(10) },
      };
      previewAffectedCells(
        { bounds: state.bounds, blockedCells: state.blockedCells },
        area,
      );
      if (gridDistance(position(state, actor), { column, row }) > 60) continue;
      actions.push({
        type: 'cast_spell',
        actor,
        spellId: 'shatter',
        slotLevel: 2,
        castAsRitual: false,
        casterLevel: 7,
        attackBonus: 7,
        saveDc: 15,
        spellcastingModifier: 4,
        targets: [],
        area,
        weaponAttack: null,
        selectedOption: null,
      });
    }
  }
  return actions;
}

function sacredFlame(actor: CombatantId): EncounterCommand {
  return {
    type: 'cast_spell',
    actor,
    spellId: 'sacred-flame',
    slotLevel: null,
    castAsRitual: false,
    casterLevel: 7,
    attackBonus: 7,
    saveDc: 15,
    spellcastingModifier: 4,
    targets: [REFERENCE_MONSTER_ID],
    area: null,
    weaponAttack: null,
    selectedOption: null,
  };
}

export function referenceTurnLegalActions(
  state: EncounterState,
  actor: CombatantId,
): LegalActionSummary {
  const active = subject(state, actor);
  const actions: EncounterCommand[] = [...movementActions(state, actor)];
  if (active.turn.action.kind !== 'spent') {
    if (actor === REFERENCE_MONSTER_ID) {
      actions.push({ type: 'hide', actor });
    } else {
      if (gridDistance(position(state, actor), position(state, REFERENCE_MONSTER_ID)) <= 5) {
        actions.push(weaponAttack(actor, REFERENCE_MONSTER_ID));
      }
      actions.push(
        { type: 'dash', actor },
        { type: 'disengage', actor },
        { type: 'dodge', actor },
      );
      if (actor === REFERENCE_CLERIC_ID) actions.push(sacredFlame(actor));
      if (actor === REFERENCE_WIZARD_ID) actions.push(...shatterActions(state, actor));
    }
  }
  actions.push({ type: 'end_turn', actor });
  return { actions };
}

export function referenceReactionLegalActions(
  state: EncounterState,
  reactor: CombatantId,
  mover: CombatantId,
): readonly Extract<EncounterCommand, { readonly type: 'opportunity_attack' }>[] {
  if (
    reactor !== REFERENCE_FIGHTER_ID ||
    mover !== REFERENCE_MONSTER_ID ||
    gridDistance(position(state, reactor), position(state, mover)) > 5
  ) {
    return [];
  }
  const attack = weaponAttack(reactor, mover);
  return [{ ...attack, type: 'opportunity_attack' }];
}
