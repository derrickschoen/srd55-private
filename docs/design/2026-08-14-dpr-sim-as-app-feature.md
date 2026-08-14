# DPR simulation as an app feature

**Date:** 2026-08-14

**Status:** Design

**Product ruling:** provide both a character-sheet headline and a full advanced
analysis page. The headline is a view of the same calculation the page uses.

## Decision summary

The feature calculates expected single-target damage for the character that is
already open. It does not build a second character, compare builds, or infer
mechanics from prose. The character sheet shows one headline damage-per-round
value when a complete calculation is possible. That value links to a full
advanced page containing the exact scenario that produced it, including rounds,
Short Rest and Long Rest cadence, target defenses, resource use, and the
round-by-round result grid.

The sheet and page are two renderers over one query contract. Neither renderer
contains probability arithmetic, resource allocation, or a second total. The
sheet reads `average_damage_per_round` directly from the complete result that
the full page consumes. If the result is unavailable, the sheet renders a
compact reason and a link to the full issue list; it never renders blank space,
zero, a dash presented as a value, a partial result, or a previous result.

V1 uses an independently implemented expected-value core based on the bundled,
attributed SRD 5.2.1, elementary probability, explicit product settings, and
the app's existing derived character facts. Every materially damage-relevant
unknown makes the result unavailable. Initial coverage is deliberately narrow:
ordinary, fully recorded weapon Attack-action routines first, then one sourced
mechanic at a time.

## 1. Licensing gate outcome

D59 permits redistribution only when this project is authorized to redistribute
the work. Reuse or adaptation of the previously evaluated engine is not
authorized, so no part of that implementation, its tests, or its modelling
choices enters this repository. The supporting audit is held privately; this
public document records only its gate outcome.

The app therefore implements its probability core independently from the SRD
5.2.1 content already bundled here under CC-BY-4.0, together with elementary
probability and project-authored product contracts. Each modelled game mechanic
must cite a bundled public source. Lack of a sourced mechanic is an unavailable
result, not permission to imitate another implementation or fill the gap from
memory.

## 2. Product boundary and architecture

### 2.1 Goals

- Give a player one expected single-target damage result for the open
  character and a fully inspectable round-by-round explanation.
- Put a concise headline on the character sheet and a complete advanced workup
  on a separate page.
- Reuse existing character projections for ability modifiers, proficiency,
  attack profiles, spell statistics, feature values, and resource maxima.
- Make target, roll, round, rest, and resource assumptions visible and
  adjustable.
- Charge setup and resource use in the actual round in which they occur.
- Refuse a total when a damage-relevant fact or rule is absent.
- Keep every result transient and derived. No DPR value is stored.

### 2.2 Non-goals for v1

- Character creation or editing inside the analysis page.
- A second build, multi-build comparison, ranking, or benchmark board.
- Reconstruction of earlier levels or prediction of future levels.
- Multiple targets, area totals, party amplification, healing, incoming damage,
  or damage prevented.
- Free-form rotations, formula entry, percentage uptime, fractional attacks, or
  arbitrary riders.
- Equipment optimization or recommendations.
- Executing free-text feature or spell descriptions.
- Persisted result caches or a DPR database column.

### 2.3 Existing public seams

`CharacterSheetBuilder.build(characterId)` creates a transient
`CharacterSheet`. The sheet projection already owns total and per-class levels,
resolved ability scores, proficiency, attacks per action, feature values,
resource maxima, spell statistics, warnings, and gaps.

Per-weapon attack bonus, damage, damage type, profile-specific attack count,
preconditions, and unresolved attack grants are produced by
`src/rules/attack-profiles.ts` through `src/queries/weapons.ts`. The simulation
must consume that projection; it must not reproduce attack-profile arithmetic
inside the new core. Character revision currently comes from the workspace
projection, so the composite query must read the sheet, attack profiles, and
revision in one coherent database snapshot.

The recommended read path is:

```text
character sheet or advanced analysis page
    -> one DPR projection query
       -> current character revision
       -> CharacterSheetBuilder
       -> WeaponQueries attack-profile projection
       -> public mechanics coverage manifest
       -> input assembler and coverage evaluator
       -> independent expected-value core or typed unavailable result
```

The assembler and core receive readers and manifests through constructors.
There is no module-global database, settings singleton, mechanics registry, or
hidden default provider.

### 2.4 One computation, two renderers

The query boundary returns `DprSimulationResult` to both surfaces. The full page
and sheet place that exact union in the `result` arm of a typed presentation
state. Loading and edited-but-not-calculated are UI states, not invented engine
results:

```ts
interface DprSheetHeadlineRenderer {
  render(state: DprPresentationState): HTMLElement;
}
```

There is no sheet-specific result DTO. In the `result`/`complete` arm the sheet
prints `result.average_damage_per_round`; no `sheet_dpr`, duplicate average, or
summary calculator exists. The full-page link serializes the normalized
request that produced `result`, including routine, rounds, resource policy,
rest cadence when applicable, target defenses, and roll state. The page parses
that request through the same constructors and reissues the same query. A
round-trip test proves the linked request equals the one used by the sheet.

The sheet needs a fully specified request before it can show a number. V1 uses
one code-owned `headlineDprSettings` value, visible in the sheet caption and
editable on the full page:

- 3 rounds;
- budget resources over a rest cycle;
- 1 encounter per rest block;
- 1 Short Rest before the Long Rest, for 2 encounters in the cycle;
- target AC 15;
- normal attack-roll state; and
- normal response for every listed damage type.

These are product defaults, not claims about a typical game. They are defined
once, parsed by the ordinary settings constructors, shown beside the headline,
and require owner confirmation before the feature is enabled. A routine that
needs a target save bonus has no invented sheet default and therefore directs
the user to the full page for that input.

The headline scenario resolver selects a routine only when exactly one
supported routine satisfies the headline inputs. Zero supported routines
returns coverage issues. More than one returns `routine_selection_required`.
The sheet then says **DPR unavailable — choose a routine** and links to the
advanced page. Silently choosing the first weapon would turn query ordering
into a game rule.

## 3. Contracts

The TypeScript below is design notation. Implementation names may change, but
the represented distinctions and invariants may not collapse.

### 3.1 Ranged and branded primitives

```ts
type EncounterRoundCount = Brand<number, 'EncounterRoundCount'>; // 1..20
type EncountersPerRestBlock = Brand<number, 'EncountersPerRestBlock'>; // 1..12
type ShortRestsBeforeLongRest = Brand<number, 'ShortRestsBeforeLongRest'>; // 0..11
type TargetArmorClass = Brand<number, 'TargetArmorClass'>; // 0..50
type TargetSaveBonus = Brand<number, 'TargetSaveBonus'>; // -20..30
type CharacterAttackRoutineId = Brand<string, 'CharacterAttackRoutineId'>;
type RoutineEventId = Brand<string, 'RoutineEventId'>;
type SimResourceId = Brand<string, 'SimResourceId'>;
type UnmodelledIssueId = Brand<string, 'UnmodelledIssueId'>;
type BundledSrdPath = Brand<string, 'BundledSrdPath'>;
type ProjectOwnedSourcePath = Brand<string, 'ProjectOwnedSourcePath'>;
type SourceStableKey = Brand<string, 'SourceStableKey'>;
type EncounterRoundOrdinal = Brand<number, 'EncounterRoundOrdinal'>;
type RestCycleEncounterOrdinal = Brand<number, 'RestCycleEncounterOrdinal'>;
type TotalCycleRoundCount = Brand<number, 'TotalCycleRoundCount'>; // 1..240
type PositiveResourceMaximum = Brand<number, 'PositiveResourceMaximum'>; // integer >= 1
type PositiveResourceCost = Brand<number, 'PositiveResourceCost'>;
type EncounterResourceCap = Brand<number, 'EncounterResourceCap'>; // 0..pool maximum
type ExpectedEventDamage = Brand<number, 'ExpectedEventDamage'>;
type ExpectedRoundDamage = Brand<number, 'ExpectedRoundDamage'>;
type ExpectedEncounterDamage = Brand<number, 'ExpectedEncounterDamage'>;
type ExpectedCycleDamage = Brand<number, 'ExpectedCycleDamage'>;
type ExpectedDamagePerRound = Brand<number, 'ExpectedDamagePerRound'>;
type ExpectedDamagePerEncounter = Brand<number, 'ExpectedDamagePerEncounter'>;
type Probability = Brand<number, 'Probability'>; // 0..1

type RestCadence = {
  readonly encounters_per_rest_block: EncountersPerRestBlock;
  readonly short_rests_before_long_rest: ShortRestsBeforeLongRest;
};
```

The joint `RestCadence` constructor requires:

```text
encounters_per_rest_block * (short_rests_before_long_rest + 1) <= 12
```

A cycle begins immediately after a Long Rest. It runs the entered number of
encounters, takes a Short Rest, repeats for each entered Short Rest, runs the
last block, and ends with a Long Rest. A Long-Rest pool has one maximum across
the cycle. A Short-Rest pool begins full and refreshes after each Short Rest.
Uses remain discrete throughout the calculation.

The numeric limits bound app work and input usability; they do not limit stored
homebrew content or assert game-rule maxima. Raising them is an explicit
product change. Damage constructors accept only finite, nonnegative values and
brand event, round, encounter, cycle, per-round average, and per-encounter
average values separately so one aggregation level cannot flow into another.
An encounter cap is constructed together with its pool and cannot exceed that
pool's maximum. The first-encounter resource policy sets each cap to its pool's
maximum.

### 3.2 Request and settings

```ts
type RollState = 'normal' | 'advantage' | 'disadvantage';

type ResourcePolicy =
  | {
      readonly kind: 'budget_over_rest_cycle';
      readonly cadence: RestCadence;
    }
  | { readonly kind: 'spend_available_after_long_rest' };

type DamageResponse = 'normal' | 'resistant' | 'vulnerable' | 'immune';

type TargetDamageResponse = {
  readonly damage_type: DamageType;
  readonly response: DamageResponse;
};

type TargetSaveSetting = {
  readonly ability: Ability;
  readonly bonus: TargetSaveBonus;
};

type TargetDefense = {
  readonly armor_class: TargetArmorClass;
  readonly save_bonuses: readonly TargetSaveSetting[];
  readonly damage_responses: readonly TargetDamageResponse[];
};

type SimulationSettings = {
  readonly rounds: EncounterRoundCount;
  readonly resources: ResourcePolicy;
  readonly roll_state: RollState;
  readonly target: TargetDefense;
};

type DprSimulationRequest = {
  readonly character_id: CharacterId;
  readonly expected_revision: CharacterRevision;
  readonly routine: CharacterAttackRoutineId;
  readonly settings: SimulationSettings;
};
```

`CharacterAttackRoutineId` identifies a routine already derived for the open
character. It is not a display name, weapon-template ID, array position, or
character-build input.

`spend_available_after_long_rest` means the first encounter after a Long Rest.
The planner may spend from the real available pools subject to their maxima,
legal timing, and action economy; it does not fabricate uses. Rest-cadence
controls are absent from this union arm because they cannot affect that
encounter.

`budget_over_rest_cycle` calculates every encounter and rest in the declared
cycle. Integer capacity is allocated deterministically. A Long-Rest pool is
divided over all encounters; a Short-Rest pool is divided independently within
each rest block. Each encounter receives the quotient, and the earliest
encounters in that segment receive one additional unit until the remainder is
exhausted. Unspent capacity is not moved by an optimizer. The result assumptions
state this product rule.

Damage responses are generated from the selected routine's typed damage values.
The request never asks the user to retype a damage key. The existing
known-plus-passthrough `DamageType` shape is preserved byte for byte so user
content is not rejected or normalized into another value. Save and damage
settings use ordered wire-safe lists; the parse boundary rejects duplicates,
then the domain maps them by their typed keys.

### 3.3 Routine options and headline resolution

```ts
type DprRoutineOption =
  | {
      readonly status: 'supported';
      readonly id: CharacterAttackRoutineId;
      readonly label: string;
      readonly required_target_saves: readonly Ability[];
      readonly damage_types: readonly DamageType[];
    }
  | {
      readonly status: 'unavailable';
      readonly id: CharacterAttackRoutineId;
      readonly label: string;
      readonly issues: readonly [UnmodelledIssue, ...UnmodelledIssue[]];
    };

type DprSimulationOptions = {
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
  readonly routines: readonly DprRoutineOption[];
};

type DprScenarioDraft = {
  readonly routine: CharacterAttackRoutineId | null;
  readonly settings: SimulationSettings;
};

type DprRequestContext =
  | { readonly kind: 'request'; readonly value: DprSimulationRequest }
  | { readonly kind: 'headline_draft'; readonly value: DprScenarioDraft };

type HeadlineScenarioResolution =
  | {
      readonly status: 'ready';
      readonly request: DprSimulationRequest;
    }
  | {
      readonly status: 'unavailable';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly draft: DprScenarioDraft;
      readonly issues: readonly [UnmodelledIssue, ...UnmodelledIssue[]];
    };
```

The options query lists unsupported routines as disabled entries and exposes
their issue lists. If one supported routine exists, the full page may select
it. If several exist, the user chooses. `routine_not_selected` belongs to form
state; an engine request always carries a valid supported ID.

Target AC is always present because an attack event may need it. Target save
bonuses are required only for abilities used by the selected routine. Missing
routine-dependent input yields unavailable after syntactic parsing. The
headline draft retains all valid settings even when no routine can be selected,
so its link can prefill the full page without pretending a request is complete.
V1 has one target; an effect whose result inherently combines several targets
is unavailable.

### 3.4 Assembled engine input

The RPC request is not an engine input. A constructor-injected assembler joins
the parsed request to one current character projection and emits closed event
types:

```ts
type SimulationInput = {
  readonly character_id: CharacterId;
  readonly character_revision: CharacterRevision;
  readonly settings: SimulationSettings;
  readonly routine: SupportedRoutine;
  readonly resource_pools: readonly SimResourcePool[];
  readonly assumptions: readonly SimulationAssumption[];
};

type SupportedRoutine = {
  readonly id: CharacterAttackRoutineId;
  readonly label: string; // display only
  readonly planner: RoutinePlanner;
};

interface RoutinePlanner {
  plan(input: {
    readonly rounds: EncounterRoundCount;
    readonly resource_caps: readonly {
      readonly resource: SimResourceId;
      readonly cap: EncounterResourceCap;
    }[];
  }): RoutinePlanResult;
}

type RoutinePlanResult =
  | {
      readonly status: 'planned';
      readonly rounds: readonly [RoundPlan, ...RoundPlan[]];
    }
  | {
      readonly status: 'unavailable';
      readonly issue: UnmodelledIssue & {
        readonly kind: 'routine_requires_unavailable_resource';
      };
    };

type AtomicRoundEvent =
  | AttackRollEvent
  | SavingThrowDamageEvent
  | AutomaticDamageEvent
  | ApplySetupEvent;

type RoundEvent = AtomicRoundEvent | ResourceGuardedEvent;

type ResourceGuardedEvent = {
  readonly kind: 'resource_guard';
  readonly resource: SimResourceId;
  readonly units: PositiveResourceCost;
  readonly when_available: readonly [AtomicRoundEvent, ...AtomicRoundEvent[]];
  readonly when_unavailable:
    | {
        readonly kind: 'use_fallback';
        readonly events: readonly [AtomicRoundEvent, ...AtomicRoundEvent[]];
      }
    | {
        readonly kind: 'omit_optional_effect';
        readonly evidence: PublicSourceRef;
      }
    | { readonly kind: 'refuse_routine'; readonly issue: UnmodelledIssue };
};

type ResourceRecovery = 'short_rest' | 'long_rest';

type SimResourcePool = {
  readonly id: SimResourceId;
  readonly source: SourceRef;
  readonly maximum: PositiveResourceMaximum;
  readonly recovery: ResourceRecovery;
};

type RoundPlan = {
  readonly round: EncounterRoundOrdinal;
  readonly events: readonly [RoundEvent, ...RoundEvent[]];
};

type RoundEventResult =
  | {
      readonly kind: 'attack_roll';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly hit_probability: Probability;
      readonly critical_probability: Probability;
      readonly expected_damage: ExpectedEventDamage;
    }
  | {
      readonly kind: 'saving_throw_damage';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly failed_save_probability: Probability;
      readonly expected_damage: ExpectedEventDamage;
    }
  | {
      readonly kind: 'automatic_damage';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly expected_damage: ExpectedEventDamage;
    }
  | {
      readonly kind: 'setup';
      readonly event_id: RoutineEventId;
      readonly source: SourceRef;
      readonly detail: string;
    };

type ModeledMechanic =
  | {
      readonly kind: 'round_event';
      readonly source: PublicSourceRef;
      readonly event: AtomicRoundEvent;
    }
  | {
      readonly kind: 'resource_pool';
      readonly source: PublicSourceRef;
      readonly pool: SimResourcePool;
    };
```

In its planned arm, the planner returns exactly the requested number of rounds
with ordinals `1..rounds`; violation is an internal contract error. Each round
is explicit. Resource caps are keyed by `SimResourceId`, never aligned by array
position. A pre-arithmetic validation pass resolves every guard against that
keyed cap set. It walks rounds and events in declared order with one running
remaining balance per resource, initialized from that encounter's cap. A guard
whose cost exceeds the remaining balance takes its unavailable arm; a successful
guard subtracts its cost exactly once. A resource-dependent action provides its
complete legal fallback or returns `routine_requires_unavailable_resource`;
arithmetic does not begin on a refused plan. An optional effect may be omitted
only through the explicit sourced arm. Guards cannot contain guards, so no
recursive event tree or hidden double spend is representable. The engine never
invents a fallback. Recorded spend for each resource must equal its initial cap
minus its final balance.

Every event carries branded source, event, and resource references. Dice use
the closed `DieSize` vocabulary. Damage uses `DamageType`. Trigger, critical,
save-success, action-cost, duration, recovery, and once-per-turn semantics use
discriminated unions. There is no expression string, `any`, generic special
case, or numeric uptime. Adding an event kind fails compilation until every
fold and renderer handles it.

### 3.5 Coverage manifest

The code-owned coverage manifest separates source-wide knowledge from
routine-specific evaluation:

```ts
type PublicSourceRef =
  | {
      readonly kind: 'bundled_srd';
      readonly path: BundledSrdPath;
      readonly heading: string;
    }
  | {
      readonly kind: 'project_owned';
      readonly path: ProjectOwnedSourcePath;
      readonly license: 'MIT' | 'CC-BY-4.0';
    };

type SourceRef =
  | {
      readonly kind: 'character_source';
      readonly source_instance_id: SourceInstanceId;
      readonly stable_key: SourceStableKey;
    }
  | {
      readonly kind: 'catalog_content';
      readonly content_key: ContentKey;
      readonly stable_key: SourceStableKey;
    }
  | {
      readonly kind: 'character_weapon';
      readonly weapon_id: CharacterWeaponId;
      readonly stable_key: SourceStableKey;
    };

type CatalogMechanicCoverage =
  | { readonly status: 'modeled'; readonly mechanic: ModeledMechanic }
  | {
      readonly status: 'confirmed_damage_neutral';
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly status: 'unsupported_damage_relevant';
      readonly reason: string;
    }
  | { readonly status: 'unknown_relevance'; readonly reason: string };

type EvaluatedMechanicCoverage =
  | {
      readonly status: 'applicable_and_modeled';
      readonly mechanic: ModeledMechanic;
    }
  | {
      readonly status: 'confirmed_damage_neutral';
      readonly evidence: PublicSourceRef;
    }
  | {
      readonly status: 'confirmed_irrelevant_to_routine';
      readonly reason: string;
    }
  | { readonly status: 'blocking'; readonly issue: UnmodelledIssue };
```

Damage-neutral means the mechanic neither deals damage nor changes attacks,
accuracy, damage, target defenses, triggers, resources, setup, or action
economy. An accuracy bonus is damage-relevant even though it does not deal
damage itself.

The evaluator inventories every active source, feature, effect, resource, and
applicable spell independently of event assembly. It then proves each entry is
modelled, damage-neutral, or irrelevant to this routine. Irrelevance is an
evaluation result, never a source-wide manifest claim. Unmapped always-on
riders are therefore found even if they emitted no event. Free text is never
parsed into executable mechanics or evidence of irrelevance.

### 3.6 Complete result and typed absence

```ts
const simulationAssumptionKinds = [
  'target_defense',
  'roll_state',
  'rest_cadence',
  'resource_policy',
  'resource_allocation',
  'mechanic_policy',
  'rounding',
] as const;
type SimulationAssumptionKind = (typeof simulationAssumptionKinds)[number];

const unmodelledIssueKinds = [
  'routine_selection_required',
  'target_save_bonus_required',
  'damage_response_required',
  'attack_bonus_undetermined',
  'weapon_damage_not_recorded',
  'damage_type_choice_unresolved',
  'unresolved_extra_attack',
  'spellcasting_statistic_absent',
  'feature_value_unavailable',
  'resource_maximum_unavailable',
  'resource_recovery_not_modeled',
  'routine_requires_unavailable_resource',
  'setup_action_not_modeled',
  'trigger_frequency_not_quantified',
  'summon_stat_block_not_modeled',
  'unsupported_damage_relevant_feature',
  'unknown_feature_relevance',
  'unsupported_multi_target_effect',
  'unsupported_reaction_or_enemy_turn_damage',
] as const;
type UnmodelledIssueKind = (typeof unmodelledIssueKinds)[number];

type SimulationAssumption = {
  readonly kind: SimulationAssumptionKind;
  readonly detail: string;
};

type UnmodelledIssue = {
  readonly id: UnmodelledIssueId;
  readonly kind: UnmodelledIssueKind;
  readonly source: SourceRef | null;
  readonly detail: string;
  readonly why_it_changes_damage: string;
  readonly remedy: string | null;
};

type EventDamageContribution = {
  readonly event_id: RoutineEventId;
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly expected_damage: ExpectedEventDamage;
};

type EncounterDamageContribution = {
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly expected_damage: ExpectedEncounterDamage;
};

type CycleDamageContribution = {
  readonly source: SourceRef;
  readonly damage_type: DamageType;
  readonly expected_damage: ExpectedCycleDamage;
};

type EncounterResourceSpend = {
  readonly resource: SimResourceId;
  readonly source: SourceRef;
  readonly units_spent: PositiveResourceCost;
  readonly recovery: ResourceRecovery;
};

type CycleResourceSpend = {
  readonly resource: SimResourceId;
  readonly source: SourceRef;
  readonly units_spent: PositiveResourceCost;
  readonly recovery: ResourceRecovery;
};

type RoundResult = {
  readonly round: EncounterRoundOrdinal;
  readonly expected_damage: ExpectedRoundDamage;
  readonly events: readonly RoundEventResult[];
  readonly contributions: readonly EventDamageContribution[];
};

type EncounterResult = {
  readonly encounter: RestCycleEncounterOrdinal;
  readonly starts_after: 'long_rest' | 'short_rest' | 'no_rest';
  readonly expected_damage: ExpectedEncounterDamage;
  readonly rounds: readonly [RoundResult, ...RoundResult[]];
  readonly contributions: readonly EncounterDamageContribution[];
  readonly resource_spending: readonly EncounterResourceSpend[];
};

type SingleEncounterAfterLongRest = Omit<EncounterResult, 'starts_after'> & {
  readonly starts_after: 'long_rest';
};

type AnalysisWindow =
  | {
      readonly kind: 'single_encounter_after_long_rest';
      readonly encounter_damage: ExpectedEncounterDamage;
    }
  | {
      readonly kind: 'rest_cycle_average';
      readonly cadence: RestCadence;
      readonly total_cycle_rounds: TotalCycleRoundCount;
      readonly average_encounter_damage: ExpectedDamagePerEncounter;
      readonly rest_cycle_damage: ExpectedCycleDamage;
    };
```

The direct `analysis_kind` discriminator carries through the complete result so
an impossible pairing cannot compile or require a consumer cast: a
single-encounter request has exactly one encounter and no cadence; a rest-cycle
request has a cadence, a total cycle-round count, and one concrete row per
encounter.

```ts
type CompleteDprSimulationResult =
  | {
      readonly status: 'complete';
      readonly analysis_kind: 'rest_cycle';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly request: DprSimulationRequest & {
        readonly settings: SimulationSettings & {
          readonly resources: Extract<ResourcePolicy, {
            readonly kind: 'budget_over_rest_cycle';
          }>;
        };
      };
      readonly average_damage_per_round: ExpectedDamagePerRound;
      readonly analysis_window: Extract<AnalysisWindow, {
        readonly kind: 'rest_cycle_average';
      }>;
      readonly encounters: readonly [EncounterResult, ...EncounterResult[]];
      readonly contributions: readonly CycleDamageContribution[];
      readonly resource_spending: readonly CycleResourceSpend[];
      readonly assumptions: readonly SimulationAssumption[];
    }
  | {
      readonly status: 'complete';
      readonly analysis_kind: 'single_encounter_after_long_rest';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly request: DprSimulationRequest & {
        readonly settings: SimulationSettings & {
          readonly resources: Extract<ResourcePolicy, {
            readonly kind: 'spend_available_after_long_rest';
          }>;
        };
      };
      readonly average_damage_per_round: ExpectedDamagePerRound;
      readonly analysis_window: Extract<AnalysisWindow, {
        readonly kind: 'single_encounter_after_long_rest';
      }>;
      readonly encounters: readonly [SingleEncounterAfterLongRest];
      readonly contributions: readonly EncounterDamageContribution[];
      readonly resource_spending: readonly EncounterResourceSpend[];
      readonly assumptions: readonly SimulationAssumption[];
    };

type DprSimulationResult =
  | CompleteDprSimulationResult
  | {
      readonly status: 'unavailable';
      readonly character_id: CharacterId;
      readonly character_revision: CharacterRevision;
      readonly request_context: DprRequestContext;
      readonly issues: readonly [UnmodelledIssue, ...UnmodelledIssue[]];
    }
  | {
      readonly status: 'revision_conflict';
      readonly character_id: CharacterId;
      readonly expected_revision: CharacterRevision;
      readonly current_revision: CharacterRevision;
    };

type DprPresentationState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'not_calculated';
      readonly draft: DprScenarioDraft;
    }
  | { readonly status: 'result'; readonly result: DprSimulationResult };
```

Each contribution rollup contains one engine-summed row per structured
`(source, damage_type)` key at its declared aggregation level. Each spend rollup
contains one engine-summed row per `(resource, source)` key. Top-level lists are
never concatenations of child rows, and renderers never perform these sums.

The query returns issues in one deterministic order: closed `kind` priority,
then a fixed null-source rank or `SourceRef.kind` rank and `stable_key`, then
`UnmodelledIssueId`. The final ID is derived from issue kind, source stable key
(or a fixed no-source sentinel), and a stable routine/mechanic discriminator;
it is never random or minted per query. This makes equal-kind/equal-source
issues deterministic without sorting on prose or input order. The compact sheet
message is selected exhaustively from `kind`;
it never promotes `detail` free text into a heading. Full-page details remain
source-labelled explanatory text. A newly added issue kind fails compilation
until it has a priority and compact message.

The unavailable arm contains no total, average, per-round subtotal, or known
portion. A request-backed refusal retains the normalized request. If the
headline resolver cannot select a routine, it retains the typed headline draft
instead. The full-page link therefore preserves every valid input without
inventing a complete request.

The presentation union prevents asynchronous or edited state from becoming
blank output. The sheet renders **Calculating DPR…** for `loading`. The page
renders **Settings changed — calculate to update** for `not_calculated` and no
result region. Neither state is a coverage claim and neither contains a number.

Complete values keep full precision. Renderers show one decimal place and state
that presentation rule. No test, export, or downstream calculation reads the
rounded string.

### 3.7 Parse, read, and write boundaries

Every request arrives as `unknown`. `parseDprSimulationRequest` validates exact
shape, brands IDs, constructs every range, validates the joint rest invariant,
closes discriminators, and rejects duplicate keyed entries. A shape conflict
throws a typed request error. There is no coercion or numeric fallback.

Semantic checks follow syntactic parsing. The assembler checks the expected
revision first. A mismatch returns `revision_conflict` before interpreting the
routine. At a matching revision it resolves the routine and verifies required
save and damage-response settings. Missing scenario facts yield unavailable;
a used damage type with no response entry yields `damage_response_required`.
An unknown routine ID at a matching revision is a typed request error because
it cannot have come from that revision's options query.

The v1 coverage manifest is code-owned TypeScript using `satisfies` against the
closed union and `PublicSourceRef`; it is not character data and needs no table.
Existing database readers continue to throw when selected rows violate their
declared contracts. If mechanics authoring later becomes user-extensible, that
requires a separate storage, backup, share, typed-write, and throwing-read
design.

Settings and results are transient. URL parameters carry a page scenario but
are still untrusted request input. Persisted presets would require a separate
write and portability design. DPR remains derived and unstored.

## 4. What the character knows and what the scenario supplies

### 4.1 Reused character facts

| Fact | Existing public source | Simulation rule |
|---|---|---|
| Character identity | Sheet/workspace query | Brand at the new boundary; never identify a routine by display name. |
| Current revision | Workspace projection | Read in the composite snapshot, return in every result, and reject mixed revisions. |
| Total and per-class levels | `CharacterSheet.total_level` and `classes` | Reuse; never ask for a level or offer a level slider. |
| Ability modifiers | `CharacterSheet.ability_scores[].value` | Reuse resolved values; do not recompute from stored base scores. |
| Proficiency bonus | `CharacterSheet.proficiency_bonus` | Reuse when known; refuse a dependent routine when absent. |
| Attacks per action | Per-profile `attacks_per_action` | Reuse the profile value and honor unresolved grants; never add class grants again. |
| Weapon attack bonus and ability damage modifier | `src/rules/attack-profiles.ts` through `src/queries/weapons.ts` | Reuse the selected ability option; null attack bonus is unavailable, not zero. |
| Weapon damage and type | `AttackProfile.damage` and `src/domain/weapon-damage.ts` | Reuse the typed value; `not_recorded` and unresolved choices refuse. |
| Preconditions and unresolved attacks | `AttackProfile` / `AttackProfileResult` | A precondition must be satisfied by structured scenario state; a relevant unresolved grant refuses. |
| Martial Arts die | `CharacterSheet.martial_arts` | Reuse the resolved per-class die; do not infer it from total level. |
| Numeric feature values | `CharacterSheet.feature_values` | Reuse only with sourced trigger and timing semantics from the coverage manifest. |
| Resource maxima and spell slots | `CharacterSheet.resources` | Reuse maxima; an absent dependent maximum refuses. |
| Spell attack and save DC | `CharacterSheet.spells[].statistics` | Reuse; an absent casting statistic refuses a dependent routine. |
| Spell identity and structured metadata | `CharacterSheet.spells` | Reuse structured identifiers and fields; never execute description, range, or duration prose. |
| Character AC | `CharacterSheet.armor_class` | Outgoing DPR does not need it and must not ask for it. |
| Sheet warnings and gaps | `CharacterSheet.warnings` and `gaps` | Classify closed codes, never message text; a code that can change this routine's damage blocks. |

The current character projection knows resource maxima but does not consistently
carry recovery, executable action, or trigger semantics for every feature.
Those are not user guesses. They belong in the sourced coverage manifest;
missing metadata makes dependent routines unavailable.

Stage 1 adds exhaustive maps from every current `SheetWarning.code` and
`SheetGap.kind` to `blocking`, `contextual`, or `display_only`. A new code or
kind is a compile failure until classified. Contextual entries are evaluated
against structured routine fields.

### 4.2 Required scenario inputs

- **Attack routine:** which existing weapon or spell posture is used. The
  headline requires exactly one eligible option; the full page asks when there
  are several.
- **Rounds:** a 1..20 integer.
- **Resource policy:** use available pools in the first encounter after a Long
  Rest, or budget over the entered rest cycle.
- **Rest cadence for budgeted resources:** encounters per rest block and Short
  Rests before the Long Rest; the UI echoes total encounters in the cycle.
- **Target AC:** the target is not part of the character sheet.
- **Relevant target save bonus:** required only for a modelled save event.
- **Roll state:** normal, advantage, or disadvantage for scenario-wide attack
  rolls. A feature-created state belongs to that sourced mechanic.
- **Damage response:** normal, resistance, vulnerability, or immunity for each
  damage type used by the routine.

### 4.3 Not v1 settings

- Character level, ability scores, proficiency, attack bonus, weapon dice,
  spell DC, resource maximum, or the character's own AC.
- Fractional attacks, percentage uptime, reaction chance, or custom riders.
- Target count, enemy hit points, movement geometry, party composition,
  initiative order, concentration-break probability, or incoming attacks.
- Rotation scripts or manual damage formulas.
- Future choices, alternate equipment, or reconstructed earlier levels.

When an omitted dimension is essential to a selected mechanic, the routine is
unavailable. The app does not replace it with an unlabeled assumption.

## 5. Honest unknowns and refusal surfaces

D33 forbids a plausible number assembled from incomplete facts. Coverage and
routine-plan validation both finish before any numeric fold. Material
uncertainty yields only the unavailable union arm. Section 3.6 defines the one
closed issue vocabulary; renderers, priorities, and remedies derive from it.

Specific rules:

- A summon, companion, transformation, or conjured entity refuses unless its
  relevant stat block and turn relationship are structured and licensed in the
  public manifest.
- Damage-relevant free text without a mechanic mapping refuses. Regexes and
  display-name matching do not convert prose into rules.
- `confirmed_damage_neutral` requires public evidence that the mechanic cannot
  change a modelled quantity or action economy.
- Assumed proficiency, unresolved attack grants, unknown damage, or unresolved
  damage-type choices refuse until character or scenario state resolves them.
- A routine whose resource guard has neither a legal fallback nor a sourced
  optional omission returns `routine_requires_unavailable_resource` before any
  round is evaluated.
- A reaction or conditional rider whose opportunity depends on enemy behavior
  refuses; the UI does not turn uncertainty into a percentage.
- Multiple-target damage refuses rather than presenting a single-target piece
  as the character's full DPR.

### 5.1 Full-page refusal

The advanced page replaces its entire result region with:

> **DPR unavailable for this routine**
>
> We can calculate the recorded weapon attacks, but this character also has an
> attack count the app cannot assign to a weapon. Omitting it could understate
> the result, so no DPR is shown.
>
> **How to resolve:** record the affected weapon choice or select a routine
> that does not depend on that feature.

Every issue names its source when known, explains why damage can change, and
offers a remedy when one exists. There is no numeric subtotal, chart, or prior
successful result behind the panel.

### 5.2 Character-sheet refusal

The small surface preserves the same union rather than collapsing unavailable
to falsy data:

```text
Damage per round
DPR unavailable
Choose a routine to calculate this character.  View details ->
```

For one issue, the sheet shows the closed copy mapped from its `kind`; for
several it shows the first ordered kind plus “and N more.” The link carries the
headline draft or complete request and lands on the full issue list. If no
routine can be selected, the draft still prefills every valid setting and opens
routine choice for that character. A revision conflict shows **DPR needs
refresh** while the sheet reloads. Blank, zero, an unexplained dash, a partial
value, and a cached old value are all forbidden.

## 6. UI workup

### 6.1 Placement and entry: sheet plus full page

The character sheet gains a compact **Damage per round** card among derived
combat facts. A complete card shows one number, the visible headline-scenario
caption, and a **Full damage analysis** link. It does not show a chart, round
table, editable setting, or second attack choice in the sheet's limited space.

The link opens `/characters/:characterId/damage-analysis` with the normalized
headline request in the query string. The full advanced page shows the same
number from the same `DprSimulationResult`, then exposes all controls and the
result grid. The page is also linked from the planner. Its header identifies
the character and provides links back to sheet and planner.

This arrangement satisfies the two distinct jobs without two implementations:
the sheet answers “what is the current headline under these stated inputs?”;
the page answers “what produced it, and how does it change when I edit the
scenario?” The query service is the sole producer of numeric results. Renderers
may format and label values but cannot derive them.

### 6.2 Recommended layouts

Character-sheet card:

```text
+------------------------------------------+
| Damage per round                         |
| 27.4                                     |
| 3 rounds · AC 15 · normal · 2 enc · 1 SR|
| Full damage analysis ->                  |
+------------------------------------------+
```

Advanced page:

```text
+------------------------------------------------------------------+
| <- Character sheet       Damage analysis (advanced)              |
| Character name · current level                                   |
+------------------------------+-----------------------------------+
| SCENARIO                     | RESULT                            |
| Routine [existing option v]  | 27.4 damage / round              |
| Target AC [ 15 ]             | rounded to one decimal           |
| Roll state [Normal v]        |                                   |
| Relevant save [+2] (dynamic) | Encounter 1 · after Long Rest    |
| Damage responses [...]       | Round  Action     Damage  Spend  |
|                              | 1      ...         21.3    ...   |
| ENCOUNTER                    | 2      ...         30.4    ...   |
| Rounds [ 3 ]                 | 3      ...         30.4    ...   |
| Encounters per block [ 1 ]   | Encounter 2 · after Short Rest   |
| Short Rests before LR [ 1 ]  | 1      ...         18.7    ...   |
| Resource policy [Budget v]   | [contributions / assumptions]    |
| Total encounters: 2          |                                   |
| [Calculate]                  |                                   |
+------------------------------+-----------------------------------+
```

On narrow screens, scenario controls stack before the result. Native number
inputs expose ranges and inline errors. Every select has a visible label. Rest
and resource help is normal text, never tooltip-only.

### 6.3 Result presentation

The complete page uses one headline plus the evidence needed to understand it:

- average damage per round, rounded to one decimal for display;
- average encounter damage and, for a rest cycle, total cycle damage and total
  cycle rounds;
- each concrete encounter and the rest that precedes it;
- each round's expected damage, setup/action description, contributions, and
  resources spent; and
- assumptions covering target defenses, roll state, rest cadence, resource
  policy, allocation, mechanic decisions, and the fact that visible cells are
  rounded independently.

One headline without the grid would hide setup and exhaustion. The grid makes
the round/rest settings auditable.

V1 does not show a per-level curve. Current character data cannot reliably
reconstruct earlier choices or supply future ones. Such a curve would need
explicit saved snapshots and a new design. V1 also omits comparison bars and
rankings. A small visual aid inside a round row is acceptable only when the
numeric table remains primary and unavailable results contain no chart.

### 6.4 Interaction and stale state

- The sheet calculates the owner-confirmed headline scenario on load. The
  typed loading state says **Calculating DPR…** until the query resolves; the
  caption then makes every non-dynamic default visible.
- The full-page link carries those exact settings. The page initially displays
  the same complete result or refusal before the user changes anything, provided
  the linked revision is still current.
- Editing any control immediately removes the old result and marks the form as
  `not_calculated` with **Settings changed — calculate to update**. Old DPR
  never remains beside new settings.
- A revision conflict removes the result, reloads routine options and character
  facts, and requires a new calculation. If the character changes between sheet
  calculation and link navigation, the page says **Character changed —
  recalculating**, retains compatible scenario inputs, adopts the new revision,
  and never displays the old number.
- Navigating away stores no DPR. Mounted form state and URL state are allowed;
  database presets are not part of v1.
- Validation belongs beside the relevant field. The joint rest-cycle error
  belongs to the Encounter fieldset and references both controls. Coverage
  refusal belongs in the result region because the request itself was valid.

## 7. Engine behavior from public rules

The core is an expected-value fold over explicit round events. It is not a
character builder and does not choose a strategy.

For each round it:

1. validates action economy and available resource pools;
2. evaluates each typed attack, save, and automatic-damage event against the
   entered target;
3. applies the event's sourced hit, critical, miss, save-success, and
   damage-response semantics;
4. enforces typed turn, round, and encounter gates;
5. records contributions and discrete resource spending; and
6. returns one `RoundResult`.

The initial public-rule operations are derived from the bundled SRD 5.2.1.
Manifest `PublicSourceRef` values point to the named headings in
`docs/srd/full/srd-5.2.1.txt`; feat-specific transforms point to the matching
heading in `docs/srd/source/feats.txt`:

- under **Attack Rolls** and **Rolling 20 or 1**, attack rolls compare the d20
  total with AC, while a natural 1 misses and a natural 20 hits and becomes a
  critical hit unless a sourced feature changes the critical range;
- under **Advantage/Disadvantage**, advantage uses the higher of two d20 rolls,
  disadvantage the lower, multiple grants do not add dice, and any combination
  of advantage and disadvantage resolves to one ordinary d20 roll;
- under **Saving Throws**, a save succeeds by meeting or exceeding its DC. The
  automatic outcomes in **Rolling 20 or 1** are expressly scoped to attack
  rolls, so the save fold does not add them;
- under **Critical Hits**, a critical hit rolls the attack's damage dice twice
  while relevant modifiers are added normally, unless a specific sourced
  mechanic declares another treatment;
- under **Resistance and Vulnerability**, **Order of Application**, and
  **Immunity**, resistance halves, vulnerability doubles, and immunity prevents
  the matching damage in the stated order; and
- each save-based damage effect declares its own sourced success result. There
  is no global save-for-half default.

Expected value is taken after nonlinear rules. Damage events retain a finite
outcome distribution through critical dice, save outcomes, resistance,
vulnerability, immunity, and other sourced transforms. If a rule halves an
integer damage outcome, the engine applies the rule and its rounding to each
outcome before weighting; it does not halve the already averaged value. When
two transformations require an order, the public rule or the specific sourced
mechanic must state that order. Otherwise coverage refuses the event.

An encounter sums its non-empty round list and divides by its branded round
count. A rest-cycle calculation plans every encounter with that encounter's
resource caps and retains every encounter and round. Only the headline divides
total cycle damage by total cycle rounds. Setup is an event carrying its actual
action cost. Resources never become fractional.

V1 contains no general optimizer. A `SupportedRoutine` declares its legal event
sequence, fallback, resource unit and priority, and timing policy from public
rules plus explicit product decisions. The engine evaluates that declared plan.
It does not decide when to use a once-per-turn reroll, which spell-slot level to
spend, or whether to hold a rider unless the routine contract declares that
policy and displays it. When legal timings materially differ and no policy is
defined, the routine is unavailable.

Initial coverage should stay small: ordinary weapon Attack actions and fully
structured riders. This lets the refusal surface and shared sheet/page contract
ship before broad mechanic support.

## 8. Verification strategy

### 8.1 Licensing and provenance

- Every mechanics-manifest entry cites a bundled SRD passage or compatible
  project-owned source.
- A reviewer with access to the privately held supporting audit performs the
  D59 provenance gate without copying its evidence into public files.
- Record every public source consulted for the probability core and each later
  coverage increment.
- Do not compare public results with unauthorized implementations or use their
  fixtures, tolerances, comments, names, or output as acceptance criteria.

### 8.2 Contracts and queries

- Compile-fail probes prove branded ranges, IDs, rounds, and resource costs
  cannot be interchanged.
- Boundary tests reject out-of-range inputs, invalid discriminators, unknown
  fields, duplicate keyed entries, and incoherent rest cadence.
- Semantic tests prove revision conflict occurs before routine-dependent checks
  and missing required target saves produce unavailable at a matching revision.
- Exhaustiveness tests cover every manifest arm, event/result variant,
  `SheetWarning.code`, and `SheetGap.kind`.
- Compile and render tests cover the direct complete-result `analysis_kind`,
  separately branded damage totals, every issue priority/message, and every
  presentation-state arm.
- Existing per-row throwing-read tests continue to cover every database reader
  used by the composite query.
- Integration tests prove the sheet, weapon panel, and simulation receive the
  same attack bonus, attack count, damage, spell statistic, feature value, and
  resource maximum.
- Changing an ability score or weapon changes sheet and simulation through the
  shared projection, with no stored DPR to update.
- Planner tests require exactly the requested rounds and ordinals. A capped
  resource event must provide a typed fallback or refusal.
- A two-pool planner fixture gives different keyed caps to each resource and
  proves neither array order nor the other pool's capacity can authorize a
  spend.
- A multi-round fixture draws repeatedly from one cap, proves the first
  over-cap guard takes its unavailable arm, and reconciles recorded spending to
  the initial-minus-final balance.

### 8.3 Arithmetic

- Enumerate all 20 d20 faces for normal attacks and saves and all 400 ordered
  pairs for advantage and disadvantage. Separately prove multiple same-side
  sources do not add dice and any advantage/disadvantage combination cancels to
  the normal distribution.
- Pin high-bonus and low-bonus save edges directly from the bundled **Saving
  Throws** and **Rolling 20 or 1** text: saves use total versus DC and do not
  inherit the automatic attack-roll outcomes.
- Enumerate small dice pools for ordinary expectation, critical hits, and
  specifically sourced reroll or die-result transforms.
- Use an odd-total example to prove per-outcome halving and rounding differs
  from halving the final expectation where the rules require that distinction.
- Property tests keep probabilities in `[0, 1]`, make critical hits a subset of
  hits, prevent higher target AC from increasing attack-roll damage, and
  make immunity yield exactly zero for the affected damage type.
- Domain reconciliation tests prove encounter damage is the full-precision sum
  of its rounds, cycle damage is the sum of its encounters, total cycle rounds
  is `encounters × rounds`, and the DPR headline is exactly cycle damage divided
  by total cycle rounds.
- Contribution and resource rollups reconcile to their child rows under their
  structured keys and are engine sums, never renderer concatenations.
- The single-encounter arm separately proves its headline is encounter damage
  divided by its branded round count.
- Hand-derived fixtures are written before the implementation. Expected values
  are never regenerated from engine output.
- Mutate each arithmetic limb—natural 1, natural 20, critical dice, flat
  critical modifier, save edge behavior, advantage/disadvantage cancellation,
  save-success outcome, damage transformation and rounding, rest refresh,
  integer allocation, fallback, and setup cost—and prove a retained test fails.

The existing `tools/sim/` directory is a project-owned public artifact distinct
from the reuse prohibited in Section 1. It may inform test technique such as
injected randomness, directional invariants, and explicit resource accounting.
Its hard-coded builds, encounter shapes, target tables, and output are not
runtime dependencies, defaults, or expected app results.

### 8.4 Shared sheet/page behavior

- A complete integration fixture feeds one `DprSimulationResult` to both
  renderers and proves the sheet headline equals the page headline.
- The sheet renderer has no numeric input other than the complete result's
  `average_damage_per_round`. A structural test rejects imports of arithmetic
  or planner modules from either UI renderer.
- Following the sheet link parses back to the exact normalized request retained
  in the result, including rounds, resource policy, Short Rest count, Long-Rest
  cycle shape, target defenses, routine, and revision.
- If that linked revision has changed, an integration test proves the page
  renders the recalculation message, retains compatible scenario inputs, and
  never renders the old number.
- When routine choice is unresolved, the sheet link round-trips the headline
  draft and pre-populates every valid setting without minting a routine ID.
- Changing a linked setting removes both the displayed result and its grid
  until recalculation.
- Complete fixtures render the headline, encounter totals, every round,
  resources, contributions, and assumptions.
- The character-sheet caption is rendered from `headlineDprSettings`, not a
  second literal; changing any default moves both request and caption in one
  test.
- The page displays total cycle rounds beside cycle damage. Domain totals
  reconcile at full precision; the UI states that each visible cell is rounded
  independently, so displayed one-decimal cells need not add back exactly.
- Every unavailable kind renders actionable full-page prose and a compact sheet
  refusal with no number, subtotal, chart, or old result.
- Loading and edited states render their required copy and no blank or numeric
  result region.
- Rest-cycle fixtures prove encounter 1 starts after a Long Rest, the first
  encounter of each later block starts after a Short Rest, and all other rows
  start after no rest.
- Equal-kind/equal-source issues sort by `UnmodelledIssueId`, proving input
  traversal order cannot change the compact sheet message.
- Both surfaces are keyboard operable, visibly labelled, and usable at narrow
  viewports.
- No current-level character renders a fabricated per-level curve or a second
  build column.

## 9. Staged sequencing

### Stage 0 — public design and owner confirmation

Land this public-only design. Confirm the visible headline defaults and the
narrow first routine slice. The licensing decision itself is closed: reuse is
not authorized, and implementation proceeds only from public sources. This
stage writes no production code.

### Stage 1 — contracts and coverage manifest

Add branded constructors, options/request/result unions, headline scenario
resolution, every renderer DTO, issue and assumption vocabularies, internal
event/resource contracts, request parsing, warning/gap classifications, and an
initial public-sourced coverage manifest. Include the route serialization
contract. Add no arithmetic and no UI dependency. Review every initial manifest
entry under D59 before merging this stage. This stage makes invalid states fail
at parse or compile time.

### Stage 2A — both UI shells

In parallel with the core, add the character-sheet card, advanced route,
sheet/planner links, normalized URL settings, controls, complete fixture
renderer, compact refusal, and full refusal. Keep both surfaces behind a feature
flag until a real calculation is available; lack of implementation is not a
character coverage issue. Prove accessibility, narrow layout, stale-result
removal, and sheet-to-page request round trips against the stable result union.

### Stage 2B — independent probability core

Implement only public-rule-derived dice, attack, save, critical, and
damage-response folds with independent enumerative tests. It has no character
query and no UI imports. Run the D59 provenance review before merging the stage.

### Stage 3 — character input assembler and honest refusal

Compose the revision reader, `CharacterSheetBuilder`, `WeaponQueries`, and the
coverage evaluator in one coherent snapshot. Initially return unavailable for
every unsupported mechanic. Add the headline scenario resolver over the same
routine options, but keep its query entry point flag-gated until Stage 5 because
its default is a rest cycle. This stage establishes that neither surface can
display a partial value.

### Stage 4 — minimal calculation behind the flag

Connect ordinary, fully recorded weapon Attack-action routines with normal,
advantage, and disadvantage target settings and no resource-dependent setup.
Every Stage 4 routine is resource-free, so the single-encounter policy requires
no pool implementation. Reuse profile attack bonus, damage, damage type, and
attack count. Exercise that result end to end, but keep both UI surfaces
disabled because the confirmed sheet scenario requires the rest-cycle stage.

### Stage 5 — rests, resources, setup, and explanations

Add publicly sourced recovery metadata, typed pools, integer budgeting, setup
events, rest-cycle planning, and per-round spending. After exhaustion, refresh,
and headline-default tests pass end to end, enable the sheet headline and full
page together. The D240 shared-computation invariant is therefore true at first
product enablement, and the Short Rest and Long Rest controls are functional
rather than decorative.

### Stage 6 — mechanic-by-mechanic coverage

Add one publicly sourced discriminated mechanic at a time: structured
once-per-turn riders, save damage, eligible attack spells, and other effects.
Each increment either turns a named unavailable case into complete or proves it
damage-neutral or irrelevant to the selected routine. Repeat source and
provenance review for every increment. Summons, enemy-turn triggers, geometry,
and multiple-target effects remain unavailable until separately designed.

### Deferred — history and comparison

Per-level curves require explicit saved historical or planned character
snapshots and a separate design. Multi-build comparison remains outside the
sheet-attached feature.

## 10. Final recommendation

Confirm the visible headline defaults and begin with ordinary recorded weapon
routines. Land the type contracts and both UI shells in parallel with the
independent public probability core. Make unavailable a first-class result
before expanding mechanics. Enable the sheet headline and full page in the same
vertical slice, with both reading one `DprSimulationResult` and the page link
carrying the exact request that produced the sheet value.
