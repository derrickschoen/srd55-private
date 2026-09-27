import {
  DIFFICULT_TERRAIN_APPLIES_WHILE_FLYING,
  DIFFICULT_TERRAIN_TAGS,
} from '../../domain/srd-vocabulary';
import type { SrdRuleId, SrdRuleIdOfKind } from './rule-index';
import type { SrdSpan } from './rule-index-types';
import type {
  ClauseQuote,
  DecisionId,
  OwnerRulingId,
  UnitId,
} from './rule-status-types';

/**
 * THE OWNER'S RULINGS ON SRD RULES, AS DATA (D921 Q1–Q3, D922 Q4–Q7).
 *
 * Each ruling decides a rule where the SRD is silent or ambiguous
 * (`interpretation`), replaces what it prints (`house_rule`), or picks between
 * two SRD sources that disagree (`source_resolution`). They are recorded here,
 * typed, so the unit that types or executes a rule finds the ruling beside the
 * rule's id instead of in prose. NOTHING HERE CHANGES ENGINE BEHAVIOUR: each
 * ruling names the units that execute it, and each of those changes lands with
 * its own failing test first (D918).
 *
 * `concerns` quotes the printed clause the ruling is about, from that rule's
 * text, and the ruling test re-reads it. A source resolution instead lists
 * EVERY disagreement it resolves, and its test re-derives that list from the
 * SRD text, so a disagreement the list misses fails the test rather than being
 * resolved silently some other way.
 */

/** A printed clause, quoted from one rule's text. */
export interface ConcernedClause {
  readonly rule: SrdRuleId;
  readonly quote: ClauseQuote;
}

/** A spell whose own header and the class spell lists name different classes. */
export interface SpellClassDisagreement {
  readonly spell: SrdRuleIdOfKind<'spell'>;
  /** The classes its header line prints, and where. */
  readonly header: { readonly span: SrdSpan; readonly classes: readonly SrdRuleIdOfKind<'spell_list'>[] };
  /** The class spell lists that print it. */
  readonly lists: readonly SrdRuleIdOfKind<'spell_list'>[];
  /** The ruling's answer: header ∪ lists. */
  readonly classes: readonly [SrdRuleIdOfKind<'spell_list'>, ...SrdRuleIdOfKind<'spell_list'>[]];
}

/** A stat block whose printed XP differs from the XP table's row for its CR. */
export interface XpDisagreement {
  readonly statBlock: SrdRuleIdOfKind<'stat_block'>;
  readonly printed: { readonly span: SrdSpan; readonly xp: number };
  readonly table: { readonly span: SrdSpan; readonly xp: number };
  /** The ruling's answer: the higher of the two. */
  readonly xp: number;
}

/** What each ruling says, typed per ruling. */
export interface OwnerRulingData {
  readonly 'temp-hp-keep-larger': {
    /** Receiving Temporary Hit Points while holding some keeps the larger pool, automatically. */
    readonly onMoreTemporaryHitPoints: 'keep_larger';
  };
  readonly 'resistance-per-type-per-instance': {
    /** All damage of one type from one hit or effect is summed, then halved once (7 + 7 Fire → 7, not 3 + 3). */
    readonly halves: 'type_total_per_instance';
    readonly rounding: 'down';
  };
  readonly 'flyer-terrain-tags': {
    readonly tags: typeof DIFFICULT_TERRAIN_TAGS;
    readonly appliesWhileFlying: typeof DIFFICULT_TERRAIN_APPLIES_WHILE_FLYING;
  };
  readonly 'touch-is-reach': {
    /** A Touch range resolves from the caster's reach, never a fixed 5 feet. */
    readonly range: 'caster_reach';
    /** Natural reach counts for every Touch spell. */
    readonly naturalReach: 'every_touch_spell';
    /** A reach extension that applies only to attacks counts only for a Touch spell with a melee spell attack. */
    readonly attackOnlyReach: 'touch_spell_with_melee_spell_attack';
  };
  readonly 'spell-classes-union': {
    /** A spell's classes are its header's classes ∪ the class lists that print it, for every spell. */
    readonly classes: 'header_union_lists';
    readonly disagreements: readonly [SpellClassDisagreement, ...SpellClassDisagreement[]];
  };
  readonly 'xp-highest-wins': {
    /** Where two SRD sources give a creature different XP, the higher is used. */
    readonly xp: 'highest';
    readonly disagreements: readonly [XpDisagreement, ...XpDisagreement[]];
  };
}

interface RulingBase<R extends OwnerRulingId> {
  readonly id: R;
  readonly decision: DecisionId;
  readonly kind: 'house_rule' | 'interpretation' | 'source_resolution';
  /** Every rule the ruling decides something about. */
  readonly rules: readonly [SrdRuleId, ...SrdRuleId[]];
  /** The units that execute it, each with a failing test first. */
  readonly executedBy: readonly [UnitId, ...UnitId[]];
  readonly data: OwnerRulingData[R];
}

export type OwnerRuling<R extends OwnerRulingId = OwnerRulingId> = R extends OwnerRulingId
  ? RulingBase<R> & ({ readonly concerns: ConcernedClause } | { readonly concerns: null })
  : never;

export const OWNER_RULINGS = {
  // D921 Q1, owner: "Keep larger, as a typed rule (Recommended)". Owner of the
  // change: RULES-CORE, or CONDITION-D20 if it touches the same code first.
  'temp-hp-keep-larger': {
    id: 'temp-hp-keep-larger',
    decision: 'D921',
    kind: 'house_rule',
    rules: ['rule_section.playing-the-game.temporary-hit-points', 'glossary.temporary-hit-points'],
    concerns: {
      rule: 'rule_section.playing-the-game.temporary-hit-points',
      quote: 'If you have Temporary Hit Points and receive more of them, you decide whether to keep the ones you have or to gain the new ones.',
    },
    executedBy: ['RULES-CORE'],
    data: { onMoreTemporaryHitPoints: 'keep_larger' },
  },
  // D921 Q2, owner: "Per type per instance (Recommended)". A wrong-result fix
  // before REGEN, with the CONDITION-D20 wave.
  'resistance-per-type-per-instance': {
    id: 'resistance-per-type-per-instance',
    decision: 'D921',
    kind: 'interpretation',
    rules: ['glossary.resistance', 'rule_section.playing-the-game.resistance-and-vulnerability'],
    concerns: { rule: 'glossary.resistance', quote: 'Resistance is applied only once to an instance of damage.' },
    executedBy: ['CONDITION-D20'],
    data: { halves: 'type_total_per_instance', rounding: 'down' },
  },
  // D921 Q3, owner: "Yes, tag ground/volume/creature (Recommended)". A house
  // ruling beside D905: the SRD has no rule that flying ignores difficult
  // terrain; every difficult-terrain source declares its tag.
  'flyer-terrain-tags': {
    id: 'flyer-terrain-tags',
    decision: 'D921',
    kind: 'house_rule',
    rules: ['glossary.difficult-terrain', 'glossary.flying'],
    concerns: {
      rule: 'glossary.difficult-terrain',
      quote: 'A space is Difficult Terrain if the space contains any of the following or something similar:',
    },
    executedBy: ['MOVE-COST', 'MOVEMENT-MODES'],
    data: { tags: DIFFICULT_TERRAIN_TAGS, appliesWhileFlying: DIFFICULT_TERRAIN_APPLIES_WHILE_FLYING },
  },
  // D922 Q4, owner: "Yes, reach with attack caveat (Recommended)". A
  // wrong-result fix with a failing test first; D922 names no owning unit.
  'touch-is-reach': {
    id: 'touch-is-reach',
    decision: 'D922',
    kind: 'interpretation',
    rules: ['rule_section.spells.casting-spells', 'glossary.reach'],
    concerns: {
      rule: 'rule_section.spells.casting-spells',
      quote: 'Touch. The spell’s effect originates on something, as defined by the spell, that the spellcaster must touch within their reach.',
    },
    executedBy: ['UNASSIGNED'],
    data: {
      range: 'caster_reach',
      naturalReach: 'every_touch_spell',
      attackOnlyReach: 'touch_spell_with_melee_spell_attack',
    },
  },
  // D922 Q5 ("Union of both") and Q6 ("Yes, union everywhere (Recommended)").
  // Owner of the change: SPELL-HEADERS/IDS, and the builder's catalogue.
  'spell-classes-union': {
    id: 'spell-classes-union',
    decision: 'D922',
    kind: 'source_resolution',
    rules: ['spell.mind-spike', 'spell.phantasmal-force', 'spell_list.bard', 'spell_list.sorcerer', 'spell_list.warlock', 'spell_list.wizard'],
    concerns: null,
    executedBy: ['SPELL-HEADERS'],
    data: {
      classes: 'header_union_lists',
      disagreements: [
        {
          spell: 'spell.mind-spike',
          header: {
            span: 'docs/srd/source/spell-descriptions.txt:5399-5399',
            classes: ['spell_list.sorcerer', 'spell_list.warlock', 'spell_list.wizard'],
          },
          lists: ['spell_list.warlock', 'spell_list.wizard'],
          classes: ['spell_list.sorcerer', 'spell_list.warlock', 'spell_list.wizard'],
        },
        {
          spell: 'spell.phantasmal-force',
          header: {
            span: 'docs/srd/source/spell-descriptions.txt:5699-5699',
            classes: ['spell_list.bard', 'spell_list.sorcerer', 'spell_list.wizard'],
          },
          lists: [],
          classes: ['spell_list.bard', 'spell_list.sorcerer', 'spell_list.wizard'],
        },
      ],
    },
  },
  // D922 Q7, owner: "Highest wins in all case". Owner of the change:
  // MON-TABLES / SRD-MONSTERS.
  'xp-highest-wins': {
    id: 'xp-highest-wins',
    decision: 'D922',
    kind: 'source_resolution',
    rules: ['stat_block.archmage'],
    concerns: null,
    executedBy: ['MON-TABLES', 'SRD-MONSTERS'],
    data: {
      xp: 'highest',
      disagreements: [
        {
          statBlock: 'stat_block.archmage',
          printed: { span: 'docs/srd/full/srd-5.2.1.txt:20017-20017@left', xp: 8_000 },
          table: { span: 'docs/srd/full/srd-5.2.1.txt:16634-16634@right', xp: 8_400 },
          xp: 8_400,
        },
      ],
    },
  },
} as const satisfies { readonly [R in OwnerRulingId]: OwnerRuling<R> };

/** The rulings that decide something about a rule, in `OWNER_RULING_IDS` order. */
export function rulingsFor(rule: SrdRuleId): readonly OwnerRulingId[] {
  return (Object.keys(OWNER_RULINGS) as OwnerRulingId[]).filter((id) =>
    (OWNER_RULINGS[id].rules as readonly SrdRuleId[]).includes(rule));
}
