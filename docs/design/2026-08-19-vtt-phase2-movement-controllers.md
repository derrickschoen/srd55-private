# VTT phase 2: movement, shared combat resolution, and controllers

Date: 2026-08-19  
Status: implementation plan  
Binding owner decisions: D312, D260.2, D260.8, and D262.8

## 1. Outcome and invariants

Phase 2 makes the VTT a spatial, turn-based consumer of the same pure combat
resolution code used by the simulation. It does not create a VTT-specific copy
of attack, damage, or save math. The first landed increment is a browser-free
movement kernel designed so `tools/sim/` can import it directly when the sim
gains positions.

The binding invariants are:

1. There is one shared combat kernel under `src/combat/`. Both `tools/sim/` and
   `src/vtt/` import it.
2. The VTT owns spatial encounter state and orchestration, not alternate combat
   math.
3. Every combatant has exactly one `Controller`; controller assignments are
   selected at setup and may be replaced at an action boundary. The encounter
   reducer receives actions, never controller implementation kinds.
4. Draft 1 is DM-local. The authoritative encounter, turn coordinator, all
   controller adapters, rules execution, and rendering run in the DM's browser.
   There is no application server in this path.
5. Later remote clients may submit proposals only. A transport update is never
   authority to mutate the encounter. Only the DM validates a proposal, applies
   an accepted action, and publishes a viewer-filtered projection.
6. Fog is technically secret. Hidden state is removed before a table, agent, or
   later remote-player projection is serialized; hiding it only while drawing is
   insufficient.
7. Rules automation is in scope. Phase 2 establishes extensible action and event
   unions; it does not create a policy that rules must remain manual.
8. No cloud accounts, voice/video, or hosted asset library is introduced.

## 2. Assumption ledger for supervisor verification

Every statement here is an assumption about the current worktree, even where it
was locally observed while drafting. The supervisor should recheck these before
dispatch because the branch may move.

ASSUMPTION A1: `src/vtt/model.ts` is the Phase 1 Yjs document model. Its
`BoardToken` currently has only an unbranded string `id`, `label`, `color`, and
`Cell`; it has no combatant, sheet, statblock, speed, HP, reach, or controller
binding.

ASSUMPTION A2: `src/vtt/model.ts` fixes the board at 16 columns by 12 rows and
stores token positions as one atomic `"column,row"` register.

ASSUMPTION A3: `src/vtt/app.ts` currently calls `createToken`, `updateToken`,
`paintFog`, and `rollDice` directly from browser input. There is no encounter
command reducer, initiative loop, speed budget, action economy, or controller
boundary between the UI and the model.

ASSUMPTION A4: `src/vtt/app.ts` currently lets a joined player invoke token and
dice mutations; only fog painting/erasing is gated by the DM role. This is a
Phase 1 prototype behavior, not D260.2 authority.

ASSUMPTION A5: `src/vtt/app.ts` currently filters fogged tokens only in
`#visibleTokens()` at render time, while `src/vtt/sync.ts` sends the complete
Yjs document. It therefore provides visual concealment, not D260.8 technical
secrecy.

ASSUMPTION A6: `src/vtt/transports/transport.ts` exposes a byte-oriented
`VttTransport`, includes `'relay'` in `TransportKind`, and declares
`RelayTransport` as a type-only seam. Phase 2 does not need a relay
implementation.

ASSUMPTION A7: `VttTransport.onUpdate` supplies bytes without an authenticated
peer identity. A future authorization adapter must bind an opaque peer identity
from transport/session context; it must not trust a peer id asserted inside a
payload.

ASSUMPTION A8: `tests/browser/vtt-board.spec.ts` is the only VTT test and is a
Playwright two-peer manual-WebRTC smoke test. There are no headless unit tests
for the Phase 1 board model.

ASSUMPTION A9: `tools/sim/sim.ts` is the canonical four-round simulation
library. It exports build functions with the shape
`(rng: Rng, level: Level, combats: number) => CombatResult | null` and owns the
seeded `mulberry32` implementation.

ASSUMPTION A10: attack, damage, and save resolution in
`tools/sim/sim.ts` is not imported from `src/rules/`. The exact current
resolution helpers are private `randInt`, `d`, `roll`, `saveFails`, and
`saveForHalf`, plus inlined hit/critical/damage branches and
`enemyTurnDamage`/`enemyHitDamage`.

ASSUMPTION A11: `tools/sim/homebrew.ts` imports only `CombatResult` and `Rng`
from `tools/sim/sim.ts`, then defines a second private `randInt`, `dice`, and
fixed-threshold `attack` implementation. It is also part of the sim migration;
leaving it behind would preserve a fork.

ASSUMPTION A12: `src/rules/attack-bonus.ts` and `src/rules/save-dc.ts` derive
character numbers, and `src/rules/attack-profiles.ts` derives typed weapon
profiles. They do not roll attacks, damage, or saves and are not imported by
`tools/sim/sim.ts` today.

ASSUMPTION A13: `src/ui/screens/planner/dice.ts` is a separate UI calculator,
not the combat engine used by `tools/sim/`. Consolidating that calculator can be
a later consumer migration; Phase 2 must not import UI code into the combat
kernel.

ASSUMPTION A14: `src/domain/ids.ts` already defines branded `CharacterId`, but
does not define encounter, combatant, board-token, monster-statblock, peer, or
remote-command ids.

ASSUMPTION A15: `src/queries/character-sheet-builder.ts` exposes
`CharacterSheet` with maximum HP, AC, initiative, six saves, walking speed,
resources, damage resistances, and spellcasting statistics. Its
`character_id` field and `QueriesClient.sheet` parameter are still plain
numbers at this boundary.

ASSUMPTION A16: `QueriesClient.workspace` returns `Workspace`, whose
`weapons.attacks` is the current computed `AttackProfileResult`; a sheet alone
does not contain complete weapon attack profiles.

ASSUMPTION A17: an attack profile can honestly be unresolved or offer multiple
ability choices. The VTT adapter must refuse or request the setup choice; it
must not select the first option or substitute a bonus.

ASSUMPTION A18: there is no reusable monster statblock model under `src/` or
`tools/sim/`. The sim's `ENEMY` tuples are level-band benchmark offense, not
addressable monster statblocks and must not be presented as such.

ASSUMPTION A19: root Vitest collects `tests/**/*.test.ts`; `tools/sim/` has its
own Vitest config and suite. Both gates must run after shared-kernel extraction.

ASSUMPTION A20: `tools/sim/tsconfig.json` uses ES2022 without DOM libraries.
Therefore every `src/combat/` module imported by the sim must remain free of
DOM, Yjs, browser storage, and worker types.

ASSUMPTION A21: Phase 1 dice use `crypto.getRandomValues` inside
`src/vtt/model.ts`, while the sim uses injected `Rng`. Phase 2 encounter rules
must use injected randomness; the existing free-form shared dice log may remain
a UI utility until it is deliberately migrated.

ASSUMPTION A22: no DM-local VTT autosave exists in the Phase 1 files. If D260.3
is included in the implementation dispatch, it should be a separate gate after
the headless encounter snapshot codec exists; it must not be coupled to the
movement kernel.

ASSUMPTION A23: the local SRD source states that grid movement uses 5-foot
segments, diagonal squares are adjacent, range is counted by the shortest grid
route, and a difficult square costs two squares to enter. It also places an
Opportunity Attack immediately before a visible creature leaves reach. These
facts were found through `.ai/rules/srdgrep.py`, but no corresponding movement
entry was found in `.ai/rules/INDEX.md`; implementation must add and verify the
KB entries before encoding the rule details.

## 3. Existing engine map and extraction boundary

### 3.1 Exact modules the sim uses now

The simulation resolves its mechanics in these modules:

| Concern | Current module | Current shape | Phase 2 disposition |
|---|---|---|---|
| Seeded randomness | `tools/sim/sim.ts` | exported `Rng`, `mulberry32` | move to `src/combat/random.ts`; re-export temporarily only if needed during the same increment |
| d20 attacks | `tools/sim/sim.ts` | private `roll` plus repeated inlined hit/critical comparisons | replace every site with imports from `src/combat/resolution.ts` |
| Damage dice | `tools/sim/sim.ts` | private `d`, `randInt`, feature-specific loops | use shared die/dice primitives; keep feature policy in sim rotations |
| Saving throws | `tools/sim/sim.ts` | private `saveFails`, `saveForHalf` | replace with shared save and damage-adjustment results |
| Benchmark enemy attacks | `tools/sim/sim.ts` | private `enemyTurnDamage`, `enemyHitDamage` over `ENEMY` | retain benchmark policy, but make its attack/damage rolls call the shared kernel |
| Validation-board attacks | `tools/sim/homebrew.ts` | private threshold-based `attack`, `dice`, `randInt` | express its fixed 65% distribution through the same d20 classifier and dice primitives |
| Build rotations/resources | `tools/sim/sim.ts`, `tools/sim/homebrew.ts` | per-build orchestration | remain in the sim; they are policies/fixtures, not generic resolution |

`src/rules/attack-bonus.ts`, `src/rules/save-dc.ts`, and
`src/rules/attack-profiles.ts` remain the character derivation side. The new
combat kernel consumes their resolved values through a VTT adapter; it does not
rederive sheet math.

### 3.2 Shared resolution API

Create these browser-free modules:

- `src/combat/values.ts`: checked value constructors and open damage-type data.
- `src/combat/random.ts`: injected RNG and seeded implementation.
- `src/combat/resolution.ts`: dice, d20, attacks, saves, and damage adjustments.
- `src/combat/range.ts`: spatial reach/range legality, shared by movement and
  encounter actions.

The public signatures should be equivalent to:

```ts
// src/combat/values.ts
import type { Brand } from '../domain/ids';

export type Feet = Brand<number, 'Feet'>;
export type ArmorClass = Brand<number, 'ArmorClass'>;
export type DifficultyClass = Brand<number, 'DifficultyClass'>;
export type DieSides = Brand<number, 'DieSides'>;
export type DamageType = Brand<string, 'DamageType'>;

export function feet(value: number): Feet;
export function armorClass(value: number): ArmorClass;
export function difficultyClass(value: number): DifficultyClass;
export function dieSides(value: number): DieSides;
export function damageType(value: string): DamageType;
```

`DamageType` deliberately validates only a non-empty bounded string. It must
preserve imported/homebrew values rather than close the vocabulary.

```ts
// src/combat/random.ts
export type Rng = () => number;
export function mulberry32(seed: number): Rng;
export function rollDie(rng: Rng, sides: DieSides): number;
export function rollDice(
  rng: Rng,
  expression: DiceExpression,
): DiceRollTrace;
```

```ts
// src/combat/resolution.ts
export type RollMode = 'normal' | 'advantage' | 'disadvantage';

export interface DiceExpression {
  readonly count: number;
  readonly sides: DieSides;
  readonly modifier: number;
}

export interface DiceRollTrace {
  readonly expression: DiceExpression;
  readonly faces: readonly number[];
  readonly total: number;
}

export interface D20Roll {
  readonly mode: RollMode;
  readonly faces: readonly number[];
  readonly chosen: number;
}

export interface AttackRollRequest {
  readonly attackBonus: number;
  readonly targetArmorClass: ArmorClass;
  readonly rollMode: RollMode;
  readonly criticalFloor: number;
}

export type AttackRollResult =
  | { readonly outcome: 'miss'; readonly roll: D20Roll; readonly total: number }
  | { readonly outcome: 'hit'; readonly roll: D20Roll; readonly total: number }
  | { readonly outcome: 'critical'; readonly roll: D20Roll; readonly total: number };

export interface SavingThrowRequest {
  readonly bonus: number;
  readonly dc: DifficultyClass;
  readonly rollMode: RollMode;
}

export interface SavingThrowResult {
  readonly outcome: 'failure' | 'success';
  readonly roll: D20Roll;
  readonly total: number;
}

export type DamageResponse = 'normal' | 'resistant' | 'vulnerable' | 'immune';

export interface DamageTerm {
  readonly type: DamageType;
  readonly dice: DiceExpression;
}

export interface DamageRequest {
  readonly terms: readonly DamageTerm[];
  readonly critical: boolean;
  readonly responses: readonly {
    readonly type: DamageType;
    readonly response: DamageResponse;
  }[];
}

export interface DamageResult {
  readonly terms: readonly {
    readonly type: DamageType;
    readonly roll: DiceRollTrace;
    readonly beforeResponse: number;
    readonly afterResponse: number;
  }[];
  readonly total: number;
}

export function rollD20(rng: Rng, mode: RollMode): D20Roll;
export function resolveAttackRoll(
  request: AttackRollRequest,
  rng: Rng,
): AttackRollResult;
export function resolveSavingThrow(
  request: SavingThrowRequest,
  rng: Rng,
): SavingThrowResult;
export function resolveDamage(
  request: DamageRequest,
  rng: Rng,
): DamageResult;
```

The shared functions return full traces so the sim can total values, the VTT can
render a combat log, and tests can assert draw order. Feature rules such as Vex,
Savage Attacker, Sneak Attack, rerolls, resource queues, and target selection
remain explicit orchestration around these primitives. No local sim function
may continue to implement a second d20 classification, save comparison, or
ordinary dice roller.

The migration imports are concrete:

```ts
// tools/sim/sim.ts and tools/sim/homebrew.ts
import { mulberry32, type Rng } from '../../src/combat/random';
import {
  resolveAttackRoll,
  resolveDamage,
  resolveSavingThrow,
  rollD20,
} from '../../src/combat/resolution';
```

Parity is defined as identical seeded outputs and identical RNG draw counts for
the retained deterministic sim cases, not merely statistically similar board
averages.

## 4. Movement and spatial legality kernel

### 4.1 Module boundary

Create:

- `src/combat/grid.ts`: cells, adjacency, distance, and bounded grids.
- `src/combat/movement.ts`: path pricing, Dijkstra search, turn budgets, and
  reach-exit events.
- `src/combat/range.ts`: melee reach and ranged normal/long-range legality.

These modules must be synchronous and pure. They may import checked values and
erased domain-id types. They must not import `src/vtt/`, Yjs, DOM APIs, browser
storage, controllers, character queries, or sim build functions.

### 4.2 Grid, terrain, and deterministic Dijkstra

Use eight-way square-grid adjacency. One adjacent step costs 5 feet on ordinary
terrain and 10 feet when entering difficult terrain. A blocked step is not
searchable. Dijkstra is preferred over A* for the first increment because the
board is small, terrain is weighted, and a zero-heuristic implementation is
straightforward to prove. Equal-cost candidates use a documented row-major
cell tie-break so seeded controllers and tests remain reproducible.

Creature occupancy and special traversal are injected policy. The generic
pathfinder must not bake in a guessed size/alliance rule:

```ts
// src/combat/grid.ts
export interface GridCell {
  readonly column: number;
  readonly row: number;
}

export interface GridBounds {
  readonly columns: number;
  readonly rows: number;
}

export function adjacentCells(
  bounds: GridBounds,
  cell: GridCell,
): readonly GridCell[];
export function gridDistance(from: GridCell, to: GridCell): Feet;
```

```ts
// src/combat/movement.ts
export type CellTraversal =
  | { readonly kind: 'blocked'; readonly reason: string }
  | { readonly kind: 'enterable'; readonly cost: Feet; readonly canEnd: boolean };

export interface MovementWorld<TActorId extends string> {
  readonly bounds: GridBounds;
  traversal(
    actorId: TActorId,
    from: GridCell,
    to: GridCell,
  ): CellTraversal;
  canTraverseStep(
    actorId: TActorId,
    from: GridCell,
    to: GridCell,
  ): boolean;
}

export interface ReachSource<TActorId extends string> {
  readonly reactorId: TActorId;
  readonly cell: GridCell;
  readonly reach: Feet;
  readonly reactionAvailable: boolean;
  readonly hostile: boolean;
}

export type MovementCause =
  | 'voluntary'
  | 'disengaged'
  | 'forced'
  | 'teleport';

export interface MovementRequest<TActorId extends string> {
  readonly actorId: TActorId;
  readonly start: GridCell;
  readonly path: readonly GridCell[];
  readonly budgetRemaining: Feet;
  readonly cause: MovementCause;
  readonly reachSources: readonly ReachSource<TActorId>[];
}

export interface MovementStep<TActorId extends string> {
  readonly from: GridCell;
  readonly to: GridCell;
  readonly cost: Feet;
  readonly beforeLeaving: readonly {
    readonly kind: 'opportunity_attack_window';
    readonly reactorId: TActorId;
    readonly moverId: TActorId;
  }[];
}

export type MovementPlan<TActorId extends string> =
  | {
      readonly kind: 'legal';
      readonly steps: readonly MovementStep<TActorId>[];
      readonly totalCost: Feet;
      readonly remaining: Feet;
    }
  | {
      readonly kind: 'illegal';
      readonly reason:
        | 'non_adjacent_step'
        | 'blocked_step'
        | 'illegal_transition'
        | 'occupied_destination'
        | 'over_budget'
        | 'outside_grid';
      readonly stepIndex: number;
    };

export interface PathRequest<TActorId extends string> {
  readonly actorId: TActorId;
  readonly start: GridCell;
  readonly goal: GridCell;
  readonly maximumCost: Feet;
}

export type PathResult =
  | { readonly kind: 'found'; readonly cells: readonly GridCell[]; readonly cost: Feet }
  | { readonly kind: 'unreachable' };

export function findPath<TActorId extends string>(
  world: MovementWorld<TActorId>,
  request: PathRequest<TActorId>,
): PathResult;
export function planMovement<TActorId extends string>(
  world: MovementWorld<TActorId>,
  request: MovementRequest<TActorId>,
): MovementPlan<TActorId>;
```

The movement budget is encounter state, not pathfinder state:

```ts
export interface TurnMovement {
  readonly speed: Feet;
  readonly spent: Feet;
  readonly remaining: Feet;
}

export function startTurnMovement(speed: Feet): TurnMovement;
export function spendMovement(
  current: TurnMovement,
  amount: Feet,
): TurnMovement;
```

This preserves split movement: an attack between two moves does not reset the
budget. Speed changes update the typed budget through one function rather than
scattered arithmetic.

### 4.3 Reach, range, and attack legality

Distance uses the same shortest-route grid metric for diagonal and orthogonal
squares. Range legality is a closed result, not a Boolean, because long-range
legality changes the roll mode:

```ts
// src/combat/range.ts
export type AttackRange =
  | { readonly kind: 'melee'; readonly reach: Feet }
  | {
      readonly kind: 'ranged';
      readonly normal: Feet;
      readonly long: Feet;
    };

export type AttackRangeVerdict =
  | { readonly kind: 'legal'; readonly rollMode: 'normal' }
  | { readonly kind: 'legal'; readonly rollMode: 'disadvantage' }
  | { readonly kind: 'illegal'; readonly reason: 'out_of_range' };

export function attackRangeVerdict(
  attacker: GridCell,
  target: GridCell,
  range: AttackRange,
): AttackRangeVerdict;
```

The encounter action validator combines this verdict with visibility, active
turn, target hostility, and action/resource availability before calling
`resolveAttackRoll`. Neither a controller nor a remote proposal supplies trusted
attack bonuses, AC, damage dice, reach, or range; it supplies ids, and the
authoritative profile supplies the mechanics.

### 4.4 Opportunity Attack sequencing

`planMovement` identifies a voluntary step whose transition changes a reactor's
distance from within reach to beyond reach. It records the reaction window on
the step, before position changes. The encounter reducer then:

1. pauses the move before that step;
2. creates a reaction request for the reactor's controller;
3. resolves an accepted reaction through the shared attack/damage kernel;
4. resumes the remaining movement only if the mover can still continue; and
5. consumes the reactor's reaction only when the accepted reaction is applied.

The exact visibility, reaction-refresh, Disengage, forced-movement, and teleport
semantics must be cited in the new KB entries before implementation. The type
shape already makes suppression explicit through `MovementCause`; no call site
may infer suppression from a controller kind.

### 4.5 Portability back into the sim

The sim adoption API is exactly `MovementWorld`, `findPath`, `planMovement`,
`gridDistance`, and `attackRangeVerdict`. A later spatial sim supplies arrays or
maps for cells and terrain and imports:

```ts
import {
  findPath,
  planMovement,
  type MovementWorld,
} from '../../src/combat/movement';
import { attackRangeVerdict } from '../../src/combat/range';
```

No adapter has to emulate Yjs, `BoardToken`, a controller, or a browser event.
`tools/sim/movement-adoption.test.ts` should compile and execute a small
headless world during increment 1. This is the proof that the merge-back
candidate is already consumable by the sim, without changing the current
positionless board rotations.

## 5. Combatants and token bindings

### 5.1 Ids and authoritative profile

Add to `src/domain/ids.ts`:

```ts
export type EncounterId = Brand<string, 'EncounterId'>;
export type CombatantId = Brand<string, 'CombatantId'>;
export type BoardTokenId = Brand<string, 'BoardTokenId'>;
export type MonsterStatblockId = Brand<string, 'MonsterStatblockId'>;
export type PeerId = Brand<string, 'PeerId'>;
export type RemoteCommandId = Brand<string, 'RemoteCommandId'>;
```

Create `src/combat/combatant.ts` and `src/combat/statblock.ts`:

```ts
// src/combat/combatant.ts
import type { Ability } from '../domain/enums';
import type {
  CharacterId,
  CombatantId,
  MonsterStatblockId,
} from '../domain/ids';

export type CombatantOrigin =
  | { readonly kind: 'character'; readonly characterId: CharacterId }
  | { readonly kind: 'monster'; readonly statblockId: MonsterStatblockId };

export interface CombatActionDefinition {
  readonly id: string;
  readonly label: string;
  readonly attackBonus: number;
  readonly range: AttackRange;
  readonly damage: readonly DamageTerm[];
}

export interface CombatantRulesProfile {
  readonly id: CombatantId;
  readonly origin: CombatantOrigin;
  readonly name: string;
  readonly armorClass: ArmorClass;
  readonly hitPointMaximum: number;
  readonly initiativeBonus: number;
  readonly saves: Readonly<Record<Ability, number>>;
  readonly walkingSpeed: Feet;
  readonly damageResponses: readonly {
    readonly type: DamageType;
    readonly response: DamageResponse;
  }[];
  readonly actions: readonly CombatActionDefinition[];
}
```

```ts
// src/combat/statblock.ts
export interface MonsterStatblock
  extends Omit<CombatantRulesProfile, 'id' | 'origin'> {
  readonly id: MonsterStatblockId;
}

export function decodeMonsterStatblock(value: unknown): MonsterStatblock;
```

Monster statblocks in Phase 2 are DM-local validated data entered or imported
at setup. They are not synthesized from the sim's benchmark `ENEMY` tuple and
are not fetched from a hosted library. A later bundled, licensed local catalog
can implement a `MonsterStatblockSource` without changing the encounter type.

### 5.2 Character sheet adapter

Create `src/vtt/character-combatant.ts`:

```ts
import type { CharacterId, CombatantId } from '../domain/ids';
import type { QueriesClient } from '../queries/client';

export interface CharacterCombatantChoices {
  readonly attackAbilities: readonly {
    readonly profileId: string;
    readonly ability: Ability;
  }[];
  readonly damageTypes: readonly {
    readonly profileId: string;
    readonly damageType: DamageType;
  }[];
}

export type CharacterCombatantResult =
  | { readonly kind: 'ready'; readonly profile: CombatantRulesProfile }
  | {
      readonly kind: 'needs_choices';
      readonly choices: readonly {
        readonly profileId: string;
        readonly reason: string;
        readonly options: readonly string[];
      }[];
    }
  | {
      readonly kind: 'incomplete';
      readonly reasons: readonly string[];
    };

export async function loadCharacterCombatant(
  queries: Pick<QueriesClient, 'sheet' | 'workspace'>,
  characterId: CharacterId,
  combatantId: CombatantId,
  choices: CharacterCombatantChoices,
): Promise<CharacterCombatantResult>;
```

The adapter reads `queries.sheet(characterId)` for AC, HP, initiative, saves,
speed, resistances, resources, and spell statistics, and
`queries.workspace(characterId).weapons.attacks` for weapon profiles. It maps
existing derived values into a frozen encounter-start snapshot. It does not
recompute sheet math and does not write the character database. An explicit
setup refresh replaces the snapshot; silent live changes during an active turn
are forbidden.

Unknown speed, HP, attack ability, attack bonus, damage, reach, or range yields
`needs_choices` or `incomplete`. No `0`, 5-foot reach, 30-foot speed, `d8`, or
other plausible fallback is allowed.

### 5.3 Board token binding

Replace the Phase 1 combat-token shape in `src/vtt/model.ts` with an explicit
union so decorative markers cannot accidentally take turns:

```ts
export type BoardToken =
  | {
      readonly kind: 'combatant';
      readonly id: BoardTokenId;
      readonly combatantId: CombatantId;
      readonly label: string;
      readonly color: string;
      readonly cell: GridCell;
    }
  | {
      readonly kind: 'marker';
      readonly id: BoardTokenId;
      readonly label: string;
      readonly color: string;
      readonly cell: GridCell;
    };
```

`EncounterSetup` must prove a one-to-one relation between combatant ids and
combatant tokens. Character and monster identities live on
`CombatantRulesProfile.origin`; the token never embeds a duplicate sheet or
statblock.

## 6. Encounter reducer and turn loop

Create:

- `src/combat/encounter.ts`: immutable state, initiative, legal actions, and
  pure action application.
- `src/combat/events.ts`: exhaustive combat-log events.
- `src/vtt/turn-coordinator.ts`: asynchronous controller orchestration around
  the pure reducer.

Core signatures:

```ts
// src/combat/encounter.ts
export interface EncounterSetup {
  readonly id: EncounterId;
  readonly grid: GridBounds;
  readonly terrain: readonly {
    readonly cell: GridCell;
    readonly kind: 'ordinary' | 'difficult' | 'blocked';
  }[];
  readonly combatants: readonly CombatantRulesProfile[];
  readonly placements: readonly {
    readonly combatantId: CombatantId;
    readonly tokenId: BoardTokenId;
    readonly cell: GridCell;
  }[];
}

export type EncounterPhase =
  | { readonly kind: 'awaiting_turn_action' }
  | {
      readonly kind: 'awaiting_reaction';
      readonly reactorId: CombatantId;
      readonly continuation: MovementContinuation;
    }
  | { readonly kind: 'complete' };

export interface EncounterState {
  readonly id: EncounterId;
  readonly revision: number;
  readonly round: number;
  readonly initiativeOrder: readonly CombatantId[];
  readonly activeIndex: number;
  readonly phase: EncounterPhase;
  readonly combatants: readonly CombatantState[];
  readonly movement: TurnMovement;
  readonly events: readonly CombatEvent[];
}

export type EncounterAction =
  | {
      readonly kind: 'move';
      readonly actorId: CombatantId;
      readonly path: readonly GridCell[];
    }
  | {
      readonly kind: 'attack';
      readonly actorId: CombatantId;
      readonly actionId: string;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: 'opportunity_attack';
      readonly actorId: CombatantId;
      readonly actionId: string;
      readonly targetId: CombatantId;
    }
  | { readonly kind: 'decline_reaction'; readonly actorId: CombatantId }
  | { readonly kind: 'end_turn'; readonly actorId: CombatantId };

export type ActionApplication =
  | {
      readonly kind: 'applied';
      readonly state: EncounterState;
      readonly events: readonly CombatEvent[];
    }
  | {
      readonly kind: 'refused';
      readonly state: EncounterState;
      readonly reason: ActionRefusal;
    };

export function startEncounter(
  setup: EncounterSetup,
  rng: Rng,
): EncounterState;
export function legalActions(
  state: EncounterState,
  actorId: CombatantId,
): LegalActionSummary;
export function applyEncounterAction(
  state: EncounterState,
  action: EncounterAction,
  rng: Rng,
): ActionApplication;
```

`applyEncounterAction` recalculates legality from authoritative state. It never
trusts a path cost, range verdict, roll result, damage, active actor, or revision
supplied by a UI/controller. State changes and combat events are returned
together so the log cannot describe an unapplied action.

The action union is intentionally extensible in later increments for saves,
spells, conditions, area effects, Dash, Disengage, Dodge, and other automated
rules. Those are in bounds; the Phase 2 movement/attack slice does not fake them
with manual numeric overrides.

## 7. One controller interface, three implementations

### 7.1 Interface and visible request

Create:

- `src/vtt/controllers/controller.ts`
- `src/vtt/controllers/algorithm.ts`
- `src/vtt/controllers/agent.ts`
- `src/vtt/controllers/human.ts`
- `src/vtt/controllers/registry.ts`
- `src/vtt/visibility.ts`

```ts
// src/vtt/controllers/controller.ts
export type ControllerRequest =
  | {
      readonly kind: 'turn';
      readonly requestId: string;
      readonly encounterRevision: number;
      readonly actorId: CombatantId;
      readonly visibleState: VisibleEncounterState;
      readonly legalActions: LegalActionSummary;
    }
  | {
      readonly kind: 'reaction';
      readonly requestId: string;
      readonly encounterRevision: number;
      readonly actorId: CombatantId;
      readonly visibleState: VisibleEncounterState;
      readonly legalActions: LegalReactionSummary;
    };

export interface ControllerDecision {
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly action: EncounterAction;
}

export interface Controller {
  choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision>;
}
```

The interface has no controller-kind discriminator. `TurnCoordinator` obtains a
`Controller` from the registry, asks it for a decision, verifies request id and
revision, and sends only the action to `applyEncounterAction`. The reducer
cannot observe whether code, an agent, or a human chose it.

`VisibleEncounterState` is a JSON-safe projection, not `EncounterState` with
fields blanked after serialization:

```ts
// src/vtt/visibility.ts
export type Viewer =
  | { readonly kind: 'dm' }
  | { readonly kind: 'table' }
  | { readonly kind: 'combatant'; readonly combatantId: CombatantId }
  | { readonly kind: 'peer'; readonly peerId: PeerId };

export interface VisibleEncounterState {
  readonly encounterId: EncounterId;
  readonly revision: number;
  readonly round: number;
  readonly activeCombatantId: CombatantId;
  readonly terrain: readonly VisibleTerrainCell[];
  readonly combatants: readonly VisibleCombatant[];
  readonly recentEvents: readonly VisibleCombatEvent[];
}

export interface VisibilityProjector {
  project(state: EncounterState, viewer: Viewer): VisibleEncounterState;
}
```

Fog-hidden tokens, DM-only terrain/notes, unrevealed statistics, and secret
events must never appear in a non-DM projection object. Agent controllers use a
`combatant` projection, so their contract cannot leak DM state either.

### 7.2 AlgorithmController

```ts
export type AlgorithmPolicy = (
  request: ControllerRequest,
  rng: Rng,
) => ControllerDecision;

export class AlgorithmController implements Controller {
  constructor(policy: AlgorithmPolicy, rng: Rng);
  choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision>;
}
```

Ship one deterministic baseline policy: attack the nearest legal hostile target;
otherwise use Dijkstra to move toward the nearest visible hostile without
exceeding the remaining budget; otherwise end the turn. Ties use stable ids and
the pathfinder's stable cell order. Randomized policies receive a seeded RNG.

### 7.3 AgentController and Codex request/response contract

`AgentController` owns serialization, decoding, stale-response rejection, and
action validation. The mechanism that carries JSON to a Codex agent is an
injected port:

```ts
// src/vtt/controllers/agent.ts
export interface AgentControllerRequest {
  readonly protocolVersion: 1;
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly actorId: CombatantId;
  readonly visibleBoard: VisibleEncounterState;
  readonly legalActions: LegalActionSummary | LegalReactionSummary;
}

export interface AgentControllerResponse {
  readonly protocolVersion: 1;
  readonly requestId: string;
  readonly encounterRevision: number;
  readonly action: EncounterAction;
}

export interface AgentExchange {
  exchange(
    request: AgentControllerRequest,
    signal: AbortSignal,
  ): Promise<unknown>;
}

export class AgentController implements Controller {
  constructor(exchange: AgentExchange);
  choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision>;
}

export function decodeAgentControllerResponse(
  value: unknown,
): AgentControllerResponse;
```

The serialized prompt states: choose exactly one action for `actorId`, use only
visible state, preserve ids exactly, and return one JSON response matching the
contract. The response never supplies derived bonuses, dice outcomes, damage,
movement costs, or newly invented ids.

Draft 1 supplies a zero-server `ManualAgentExchange` in
`src/vtt/controllers/manual-agent-exchange.ts`: the DM browser displays the
request JSON for a local Codex session and accepts the returned JSON. This keeps
the browser bundle from invoking a CLI or introducing a dev server. A later
local process, extension, or remote service can implement `AgentExchange`
without changing `AgentController` or the encounter engine. The exchange is a
transport for agent reasoning, not encounter authority; every returned action
is revalidated locally.

### 7.4 HumanController

```ts
export class HumanController implements Controller {
  choose(
    request: ControllerRequest,
    signal: AbortSignal,
  ): Promise<ControllerDecision>;
  submit(decision: ControllerDecision): void;
}
```

`choose` exposes the pending request to the UI and resolves only after `submit`.
Abort clears the pending request and rejects it with a typed cancellation. The
UI never mutates encounter state directly.

### 7.5 Setup, registry, and mid-encounter swaps

```ts
// src/vtt/controllers/registry.ts
export interface ControllerAssignment {
  readonly combatantId: CombatantId;
  readonly controller: Controller;
}

export interface ControllerRegistry {
  controllerFor(combatantId: CombatantId): Controller;
  replace(combatantId: CombatantId, controller: Controller): void;
}
```

Encounter setup requires one assignment for every combatant. `replace` aborts
that combatant's pending request and takes effect at the same state revision; the
coordinator issues a fresh request to the replacement. An old response with the
prior request id or revision is refused. The engine state contains no
controller assignment and therefore needs no migration when a controller is
swapped.

## 8. Draft-1 DM-browser deployment

Add `src/vtt/local-session.ts` as the composition root for:

- the authoritative `EncounterState`;
- one seeded or crypto-seeded `Rng` selected at encounter setup and recorded in
  the session metadata;
- `ControllerRegistry` and `TurnCoordinator`;
- `VisibilityProjector`;
- the local DM controls and filtered table presentation; and
- optional local snapshot persistence after the snapshot codec is available.

`src/vtt/app.ts` becomes a UI adapter around `LocalVttSession`. Pointer drags,
keyboard movement, attack buttons, and end-turn controls submit HumanController
decisions. They do not call `updateToken` or rules functions directly.

The Phase 2 encounter path does not instantiate `ManualTransport`,
`TrysteroTransport`, `RelayTransport`, an HTTP endpoint, a WebSocket server, or
the repository's dev-only AI bridge. Phase 1 transports remain available as
infrastructure/prototypes but are not in the authoritative local turn loop.

For screen sharing, render two projections:

- DM controls consume `Viewer { kind: 'dm' }`.
- The shareable table canvas consumes `Viewer { kind: 'table' }` and omits
  fog-hidden state completely.

A fullscreen/presentation surface in `src/vtt/presentation.ts` renders only the
table projection. If it is opened in a second window owned by the DM browser,
send only `VisibleEncounterState` through a local `BroadcastChannel`; never send
the authoritative encounter and hide fields in the receiving renderer.

If D260.3 DM-local autosave is included in the dispatch, add a versioned pure
codec in `src/vtt/encounter-snapshot.ts` first, then persist only in the existing
browser database/RPC architecture. Autosave is a separate gate and must not add
a server or make Yjs the combat reducer.

## 9. Player-browser seams only

Create `src/vtt/remote-contracts.ts` containing types and interfaces only. Do
not implement ingress, transport framing, peer sessions, relay code, or remote
UI in Phase 2.

```ts
export type PlayerCapability =
  | 'view_board'
  | 'move_token'
  | 'make_attack';

export interface AuthenticatedPeerContext {
  readonly peerId: PeerId;
}

export interface TokenCommandGrant {
  readonly peerId: PeerId;
  readonly tokenId: BoardTokenId;
  readonly combatantId: CombatantId;
  readonly capabilities: readonly PlayerCapability[];
}

export type RemotePlayerAction =
  | Extract<EncounterAction, { readonly kind: 'move' }>
  | Extract<EncounterAction, { readonly kind: 'attack' }>;

export interface RemoteCommandProposal {
  readonly commandId: RemoteCommandId;
  readonly expectedEncounterRevision: number;
  readonly tokenId: BoardTokenId;
  readonly action: RemotePlayerAction;
}

export type AuthorizationResult =
  | {
      readonly kind: 'authorized';
      readonly peerId: PeerId;
      readonly grant: TokenCommandGrant;
      readonly action: RemotePlayerAction;
    }
  | {
      readonly kind: 'refused';
      readonly reason:
        | 'unknown_peer'
        | 'token_not_granted'
        | 'capability_not_granted'
        | 'actor_token_mismatch'
        | 'stale_revision';
    };

export interface RemoteAuthorizationPolicy {
  authorize(
    peer: AuthenticatedPeerContext,
    proposal: RemoteCommandProposal,
    grants: readonly TokenCommandGrant[],
  ): AuthorizationResult;
}

export interface RemoteProjectionPublisher {
  publish(
    peer: AuthenticatedPeerContext,
    projection: VisibleEncounterState,
  ): Promise<void>;
}
```

The critical boundary is that `AuthenticatedPeerContext` is supplied by a
future session adapter, outside the decoded proposal. A peer cannot claim a
different identity in JSON. An authorization result still does not mutate
state: the DM applies the action through `applyEncounterAction`, then calls the
visibility projector for that peer before publishing bytes through a future
`VttTransport`/`RelayTransport` adapter.

This completes the authorization half of the provision while leaving all
player-browser behavior unimplemented, as required.

## 10. File plan

### New shared engine files

- `src/combat/values.ts`
- `src/combat/random.ts`
- `src/combat/resolution.ts`
- `src/combat/grid.ts`
- `src/combat/movement.ts`
- `src/combat/range.ts`
- `src/combat/combatant.ts`
- `src/combat/statblock.ts`
- `src/combat/events.ts`
- `src/combat/encounter.ts`

### New VTT files

- `src/vtt/character-combatant.ts`
- `src/vtt/local-session.ts`
- `src/vtt/turn-coordinator.ts`
- `src/vtt/visibility.ts`
- `src/vtt/presentation.ts`
- `src/vtt/remote-contracts.ts` (types/interfaces only)
- `src/vtt/controllers/controller.ts`
- `src/vtt/controllers/algorithm.ts`
- `src/vtt/controllers/agent.ts`
- `src/vtt/controllers/human.ts`
- `src/vtt/controllers/registry.ts`
- `src/vtt/controllers/manual-agent-exchange.ts`
- `src/vtt/encounter-snapshot.ts` only if D260.3 is dispatched

### Existing files changed

- `src/domain/ids.ts`: add branded encounter/VTT ids.
- `tools/sim/sim.ts`: import shared RNG/resolution; remove local ordinary
  dice/d20/save resolution.
- `tools/sim/homebrew.ts`: import shared RNG/resolution; remove its second
  ordinary dice/d20 resolver.
- `tools/sim/test-helpers.ts` and sim tests: import `Rng`/`mulberry32` from the
  shared module and retain scripted draw proofs.
- `src/vtt/model.ts`: use shared `GridCell`, branded ids, combatant-token union,
  and versioned encounter projection data.
- `src/vtt/app.ts`: submit controller decisions and render session projections.
- `src/vtt/styles.css`: encounter setup, initiative, controller status, action
  controls, path preview, and table-presentation styles.
- `src/vtt/sync.ts`: no Phase 2 encounter authority. If retained for the Phase 1
  board, label it legacy/prototype and do not send `EncounterState` through it.
- `.ai/rules/INDEX.md` and the appropriate combat rules entry file: add sourced
  movement/grid/range/Opportunity Attack entries before implementation claims
  those semantics.

### New tests

- `tests/unit/combat/movement.test.ts`
- `tests/unit/combat/range.test.ts`
- `tests/unit/combat/resolution.test.ts`
- `tests/unit/combat/encounter.test.ts`
- `tests/unit/vtt/controllers.test.ts`
- `tests/unit/vtt/agent-controller-contract.test.ts`
- `tests/unit/vtt/visibility.test.ts`
- `tests/integration/vtt/character-combatant.test.ts`
- `tools/sim/movement-adoption.test.ts`
- `tests/browser/vtt-encounter.spec.ts`

## 11. Testing and proof strategy

### 11.1 Headless movement and range

Vitest must prove:

- ordinary and difficult cell costs;
- diagonal and orthogonal adjacency/distance;
- stable minimum-cost Dijkstra paths and deterministic tie-breaking;
- blocked cells, injected transition rules, and destinations that can be
  crossed but not occupied;
- exact budget exhaustion, over-budget refusal, and split movement retaining
  spent distance;
- voluntary reach exits emit a pre-step reaction window exactly once per
  eligible reactor;
- movement marked disengaged, forced, or teleport does not emit that window
  after the sourced rule entries confirm the suppression;
- melee reach, ranged normal range, ranged long-range disadvantage, and beyond
  long-range refusal; and
- the `tools/sim/movement-adoption.test.ts` consumer works with no browser
  library.

### 11.2 Shared resolution and sim parity

Use the sim's existing constant/scripted RNG tests plus pinned `mulberry32`
seeds. Assert full result traces and draw counts. Run both suites:

```sh
npm test -- tests/unit/combat
npx vitest run --root tools/sim
```

The extraction gate is no seeded output change for retained sim functions and
no unexpected draw-count change. Statistical tests remain secondary evidence;
they cannot approve a resolver that changed a deterministic branch.

### 11.3 Encounter and controllers

Vitest must prove:

- initiative order and stable tie handling with a fixed seed;
- only the active combatant acts;
- turn start creates exactly one speed budget and end turn advances exactly
  once;
- movement pauses before an Opportunity Attack, accepts or declines the
  reaction, then resumes from the recorded continuation;
- attack legality is rechecked after movement/reaction state changes;
- AlgorithmController makes the same decision for the same visible state and
  seed;
- HumanController resolves one pending request and aborts cleanly;
- AgentController round-trips the versioned JSON contract, rejects malformed or
  stale responses, and cannot bypass action validation;
- replacing a controller aborts the old request and the replacement receives a
  fresh request at the current revision; and
- the same encounter seed and same decision sequence produce byte-equivalent
  serializable snapshots.

### 11.4 Character/statblock bindings and visibility

Integration tests use real query fixtures to prove a character's AC, HP,
initiative, saves, walking speed, spell statistics, and weapon profiles agree
with the existing sheet/workspace projections. Include incomplete and
multi-choice profiles and assert that no fallback profile is manufactured.

Statblock decoder tests use local JSON fixtures with open homebrew damage types.
Visibility tests create sentinel secret values and assert the complete
non-DM projection object contains none of them after JSON serialization.

### 11.5 Thin Playwright coverage

`tests/browser/vtt-encounter.spec.ts` covers only wiring:

1. create a local encounter from one character and one local monster fixture;
2. assign HumanController and AlgorithmController at setup;
3. use the UI to request a legal path and observe the engine-produced position,
   remaining speed, active turn, and combat-log event;
4. swap one combatant to AgentController using the manual JSON exchange and
   submit a valid response;
5. prove the table presentation omits a fog-hidden sentinel while the DM view
   retains it; and
6. prove an invalid UI action renders the reducer's refusal without mutating
   the encounter revision.

Playwright must not duplicate movement cost, pathfinding, attack math,
initiative, or controller branch matrices. Those belong to Vitest.

### 11.6 Named negative-control mutations

After the retained tests are green, introduce each well-formed wrong-value
mutation in a temporary working copy and prove a named test fails. Do not use
deletion mutants as evidence.

1. `ordinary_cost_10`: price an ordinary adjacent square at 10 feet instead of
   5.
2. `difficult_cost_5`: price a difficult square at 5 feet instead of 10.
3. `move_resets_budget`: set remaining movement back to full speed before a
   second move in the same turn.
4. `diagonal_uses_manhattan`: count one diagonal step as 10 feet for range.
5. `oa_on_enter`: emit the reaction window when entering reach instead of
   leaving it.
6. `oa_after_step`: move the token before resolving the reaction window.
7. `normal_range_includes_long`: return normal roll mode for a target beyond
   normal but within long range.
8. `beyond_long_is_legal`: accept a target one square beyond long range.
9. `attack_tie_misses`: classify attack total equal to AC as a miss, contrary to
   the current sim comparator.
10. `save_tie_fails`: classify save total equal to DC as a failure, contrary to
    the current sim comparator.
11. `critical_doubles_modifier`: double a flat damage modifier on a critical
    instead of only the configured dice count.
12. `stale_agent_revision_accepted`: accept a well-formed response for the
    preceding encounter revision.
13. `agent_changes_actor`: accept a well-formed action whose actor id differs
    from the requested combatant.
14. `swap_keeps_old_controller`: allow the superseded controller's pending
    response to apply after replacement.
15. `hidden_token_serialized`: include one fog-hidden combatant in the table
    projection while leaving the JSON otherwise valid.
16. `character_unknown_speed_defaults_30`: convert an unknown sheet speed into
    a plausible 30-foot value instead of returning `incomplete`.

Record the killing test beside each mutation in the increment handoff. A
mutation surviving three targeted attempts is a testing gap, not permission to
weaken the gate.

### 11.7 Full gates

At the final increment:

```sh
npm run typecheck
npm test
npx vitest run --root tools/sim
npm run build
npx playwright test tests/browser/vtt-board.spec.ts tests/browser/vtt-encounter.spec.ts
```

The existing Phase 1 transport smoke remains a regression gate. It does not
become evidence for DM authority, filtered fog, movement, or controllers.

## 12. Dispatchable increment plan

### Increment 1 — portable movement and range kernel

Files: `src/combat/values.ts`, `src/combat/grid.ts`,
`src/combat/movement.ts`, `src/combat/range.ts`, the movement KB entries,
`tests/unit/combat/movement.test.ts`, `tests/unit/combat/range.test.ts`, and
`tools/sim/movement-adoption.test.ts`.

Work:

- source and verify grid/movement/range/OA rules in `.ai/rules/`;
- implement checked units, grid distance, injected traversal policy,
  deterministic Dijkstra, path validation, turn budgets, reach-exit event
  discovery, and range verdicts; and
- prove direct sim consumption without DOM/Yjs dependencies.

Independent gate: targeted movement/range Vitest, sim adoption test, typecheck,
and mutations 1–8. No VTT UI change is required for this increment to land.

### Increment 2 — one attack/damage/save resolver used by the sim

Files: `src/combat/random.ts`, `src/combat/resolution.ts`,
`tools/sim/sim.ts`, `tools/sim/homebrew.ts`, `tools/sim/test-helpers.ts`, and
affected sim tests plus `tests/unit/combat/resolution.test.ts`.

Work:

- move `Rng`/`mulberry32` without changing its sequence;
- extract trace-returning dice, d20, attack, save, and damage primitives;
- migrate every ordinary sim and homebrew d20/dice/save site to imports while
  retaining build policies in their current modules; and
- remove the private duplicate resolvers in the same increment.

Independent gate: shared-resolution unit tests, complete sim suite, pinned
outputs/draw counts, typecheck, and mutations 9–11. A partial migration cannot
land because it would create the forbidden fork.

### Increment 3 — combatant profiles, bindings, and pure encounter reducer

Files: id additions; `src/combat/combatant.ts`, `statblock.ts`, `events.ts`,
`encounter.ts`; `src/vtt/character-combatant.ts`; unit/integration tests.

Work:

- add branded identities;
- implement validated monster statblocks and character sheet/workspace
  projection;
- bind one combatant profile to one combat token;
- implement encounter setup, initiative, turn movement budget, legal actions,
  stepwise OA continuation, attacks, HP changes, end turn, and event logging;
  and
- serialize deterministic snapshots for test replay.

Independent gate: encounter/unit/integration Vitest, sim suite unchanged,
typecheck, and the unknown-value negative control. No controller or UI is
needed to exercise the reducer.

### Increment 4 — controller implementations and local coordinator

Files: `src/vtt/controllers/*`, `src/vtt/visibility.ts`,
`src/vtt/turn-coordinator.ts`, and controller/visibility tests.

Work:

- implement the one Controller interface, registry, replacement cancellation,
  AlgorithmController, AgentController, ManualAgentExchange, and
  HumanController;
- implement JSON-safe viewer projections and agent contract decoding;
- run the asynchronous local turn/reaction loop around the pure reducer; and
- verify controllers cannot inject derived values or apply stale actions.

Independent gate: controller/visibility Vitest, deterministic replay, mutations
12–15, typecheck, and all earlier gates.

### Increment 5 — DM-local VTT UI and future remote authorization seams

Files: `src/vtt/local-session.ts`, `presentation.ts`,
`remote-contracts.ts`, changes to `src/vtt/model.ts`, `app.ts`, `styles.css`, and
`tests/browser/vtt-encounter.spec.ts`. Add `encounter-snapshot.ts` and database
wiring only if D260.3 is explicitly included in this dispatch.

Work:

- make local DM encounter setup/execution the Phase 2 path;
- wire all UI action input through HumanController;
- expose controller assignment and mid-encounter replacement;
- render DM and technically-secret table projections;
- add only the future remote authorization/publisher interfaces; and
- leave `RelayTransport` type-only and add no remote-player implementation.

Independent gate: thin Playwright encounter test, existing Phase 1 browser
smoke, full Vitest and sim suites, typecheck, build/dist-clean check, and
mutation 16. No server, cloud account, voice/video feature, hosted asset
library, relay implementation, or player browser is accepted in this
increment.

## 13. Phase-2 exit criteria

Phase 2 is complete when:

- `tools/sim/sim.ts` and `tools/sim/homebrew.ts` import the shared combat
  resolver and contain no second ordinary dice/d20/save implementation;
- the movement/range kernel is browser-free, directly exercised from
  `tools/sim/`, and lands before VTT orchestration;
- character tokens are backed by existing sheet/workspace projections, monster
  tokens by validated local statblocks, and absent mechanics remain typed
  absences;
- speed budgets, difficult terrain, weighted paths, reach exits, range, and
  attack legality are enforced by the headless reducer;
- AlgorithmController, AgentController, and HumanController all satisfy the
  same interface and are replaceable without changing encounter state shape;
- the Codex contract contains only visible serialized state and returns only a
  locally revalidated action;
- the Draft-1 turn loop executes entirely in the DM browser with a filtered
  shareable table view;
- future player control has typed peer/token/capability authorization and
  filtered-publication seams but no implementation; and
- all deterministic, negative-control, full Vitest, sim, build, and thin
  Playwright gates pass.
