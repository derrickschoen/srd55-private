import type { GridCell } from '../../combat/grid';
import type { CombatantId } from '../../combat/values';
import type {
  DecisionProgram,
  PlanAction,
  StandingConditionalRider,
  TargetSelector,
} from './round-plan-contract';

export const TURN_PROGRAM_LIBRARY_VERSION = 'turn-program-library:v1' as const;

export interface TurnProgramLibraryTarget {
  readonly selector: TargetSelector;
  readonly combatantId: CombatantId;
}

export interface TurnProgramLibraryExpansionContext {
  readonly actorId: CombatantId;
  target(value: unknown, api: string): TurnProgramLibraryTarget;
  cell(value: unknown, api: string): GridCell;
  number(value: unknown, label: string): number;
  action(value: unknown, api: string): PlanAction;
}

export type TurnProgramLibraryExpansion =
  | { readonly kind: 'program'; readonly program: DecisionProgram }
  | { readonly kind: 'rider'; readonly rider: StandingConditionalRider };

interface TurnProgramLibraryDefinitionBase {
  readonly name: string;
  readonly signature: string;
  readonly description: string;
}

type TurnProgramLibraryDefinition =
  | (TurnProgramLibraryDefinitionBase & {
      readonly result: 'program';
      expand(
        args: readonly unknown[],
        context: TurnProgramLibraryExpansionContext,
      ): DecisionProgram;
    })
  | (TurnProgramLibraryDefinitionBase & {
      readonly result: 'rider';
      expand(
        args: readonly unknown[],
        context: TurnProgramLibraryExpansionContext,
      ): StandingConditionalRider;
    });

const endTurn = (): DecisionProgram => ({
  kind: 'action',
  action: { kind: 'use_action', action: 'end_turn' },
});

const targeted = (
  kind: 'attack' | 'move_toward',
  target: TargetSelector,
): DecisionProgram => ({ kind: 'action', action: { kind, target } });

const focusFireProgram = (target: TargetSelector): DecisionProgram => ({
  kind: 'priority',
  choices: [targeted('attack', target), targeted('move_toward', target), endTurn()],
});

function requireArity(name: string, args: readonly unknown[], expected: number): void {
  if (args.length !== expected) {
    throw new TypeError(`${name} expects ${String(expected)} arguments; received ${String(args.length)}.`);
  }
}

const LIBRARY_DEFINITIONS: readonly TurnProgramLibraryDefinition[] = Object.freeze([
  {
    name: 'focusFire',
    signature: 'focusFire(targetSelector)',
    description: 'Attack the selected target, move toward it if attacking is unavailable, then end the turn.',
    result: 'program',
    expand(args, context) {
      requireArity('focusFire', args, 1);
      return focusFireProgram(context.target(args[0], 'focusFire').selector);
    },
  },
  {
    name: 'retreatWhenBelow',
    signature: 'retreatWhenBelow(fractionHp, {column, row})',
    description: 'Below the 0..1 HP fraction, prefer disengage, movement toward the cell, and dash; otherwise focus the nearest enemy.',
    result: 'program',
    expand(args, context) {
      requireArity('retreatWhenBelow', args, 2);
      const fraction = context.number(args[0], 'retreatWhenBelow fractionHp');
      if (!(fraction > 0 && fraction <= 1)) {
        throw new TypeError('retreatWhenBelow fractionHp must be greater than 0 and at most 1.');
      }
      const destination = context.cell(args[1], 'retreatWhenBelow destinationSelector');
      return {
        kind: 'if',
        predicate: {
          kind: 'hp_percent_below',
          combatantId: context.actorId,
          percent: fraction * 100,
        },
        then: {
          kind: 'priority',
          choices: [
            { kind: 'action', action: { kind: 'use_action', action: 'disengage' } },
            { kind: 'action', action: { kind: 'retreat_toward', destination } },
            { kind: 'action', action: { kind: 'use_action', action: 'dash' } },
            endTurn(),
          ],
        },
        else: focusFireProgram({ kind: 'nearest_enemy' }),
      };
    },
  },
  {
    name: 'flankWith',
    signature: 'flankWith(allySelector, targetSelector)',
    description: 'When the ally is within 5 feet of the target, prefer attacking; otherwise prefer closing on the target.',
    result: 'program',
    expand(args, context) {
      requireArity('flankWith', args, 2);
      const ally = context.target(args[0], 'flankWith allySelector');
      const target = context.target(args[1], 'flankWith targetSelector');
      return {
        kind: 'if',
        predicate: {
          kind: 'distance_at_most',
          left: ally.combatantId,
          right: target.combatantId,
          feet: 5,
        },
        then: focusFireProgram(target.selector),
        else: {
          kind: 'priority',
          choices: [targeted('move_toward', target.selector), targeted('attack', target.selector), endTurn()],
        },
      };
    },
  },
  {
    name: 'holdChokepoint',
    signature: 'holdChokepoint({column, row})',
    description: 'Prefer movement toward the named cell, then dodge, then end the turn.',
    result: 'program',
    expand(args, context) {
      requireArity('holdChokepoint', args, 1);
      const destination = context.cell(args[0], 'holdChokepoint cellSelector');
      return {
        kind: 'priority',
        choices: [
          { kind: 'action', action: { kind: 'retreat_toward', destination } },
          { kind: 'action', action: { kind: 'use_action', action: 'dodge' } },
          endTurn(),
        ],
      };
    },
  },
  {
    name: 'riderOnCrit',
    signature: 'riderOnCrit(followUpAction)',
    description: 'Create a critical-hit rider for attack(targetSelector, rider); the fixed follow-up is never searched as a standalone action.',
    result: 'rider',
    expand(args, context) {
      requireArity('riderOnCrit', args, 1);
      return { kind: 'on_critical_hit', followUpAction: context.action(args[0], 'riderOnCrit') };
    },
  },
]);

const DEFINITION_BY_NAME = new Map(
  LIBRARY_DEFINITIONS.map((definition) => [definition.name, definition]),
);

export const TURN_PROGRAM_LIBRARY_FUNCTIONS = Object.freeze(
  LIBRARY_DEFINITIONS.map((definition) => definition.name),
);

export const TURN_PROGRAM_LIBRARY_DOC = [
  `Pattern library ${TURN_PROGRAM_LIBRARY_VERSION}:`,
  ...LIBRARY_DEFINITIONS.map(
    (definition) => `${definition.signature}: ${definition.description}`,
  ),
].join('\n');

export function expandTurnProgramLibraryCall(
  name: string,
  args: readonly unknown[],
  context: TurnProgramLibraryExpansionContext,
): TurnProgramLibraryExpansion | null {
  const definition = DEFINITION_BY_NAME.get(name);
  if (definition === undefined) return null;
  return definition.result === 'program'
    ? { kind: 'program', program: definition.expand(args, context) }
    : { kind: 'rider', rider: definition.expand(args, context) };
}
