/**
 * The feat prose -> grants bridge. Closes PART of the gap `parse-feat.ts`'s
 * file comment names and refuses to fabricate (`TODO(feat-import-gap)` in
 * `build-feat-catalog.ts`): `FeatContentAggregateV1` (see
 * `src/catalog/source-content-projector-v1.ts`) demands structured `grants` —
 * the rules-engine `GrantRule` DSL (`src/grants/grant-rule.ts`) — and this
 * module reads them out of a parsed feat's printed benefit paragraphs for the
 * sentence shapes it can recognise WITH CERTAINTY, exactly the way
 * `src/rules/feats-srd.ts` reads them out of the hand-curated SRD extract.
 *
 * STRICT AND LOUD, same law as `parse-feat.ts`: every grant this module emits
 * is backed by one specific, closed sentence shape; a paragraph that does not
 * match one of those shapes EXACTLY — including one that reads close but
 * gets a preposition or a clause wrong, or one that opens with a recognised
 * shape and then keeps going — is never guessed at, and never split into "the
 * part I understood" plus a dropped remainder. It stays in `unmodeledProse`,
 * VERBATIM, WHOLE, rather than becoming a plausible, wrong rule. Partial
 * expressibility, not silent loss: a feat this module cannot fully model
 * still returns its recognised grants ALONGSIDE the untouched prose, never
 * one without the other.
 *
 * ONLY ONE OF THE THREE TARGET SHAPES EVER REACHES `grants` IN THIS VERSION —
 * codex round-1 review of the first cut (commit ab551e25) found that the
 * other two, as originally wired, were WORSE than leaving the prose alone:
 *
 *  - the two closed Ability Score Increase sentences DO become
 *    `ability_score_increase` values (see `BridgedGrant`) — but only on an
 *    EXACT, FULL paragraph match (F1 below), not merely a matching prefix.
 *  - "You gain proficiency in <skill>." and "Your speed increases by N
 *    feet." are both RECOGNISED (`matchSkillProficiencySentence`,
 *    `matchSpeedIncreaseFeet`, both still real, tested functions) but NEITHER
 *    is promoted to `grants` — see "THE SKILL GAP" and "THE SPEED GAP" below.
 *    A matching paragraph lands in `unmodeledProse`, verbatim, exactly like
 *    an unrecognised one, AND the result separately names the gap in
 *    `unrepresented` — see `UnrepresentedShape` — so a caller can tell "this
 *    module understood the sentence but the app has nowhere honest to put
 *    it" apart from "this module has no idea what this sentence means".
 *
 * F1 — THE TRAILING-CLAUSE BUG (codex round-1, HIGH). `parse-feat.ts`'s own
 * `TWO_POINT_ASI`/`ONE_POINT_ASI` regexes are PREFIX-anchored (no trailing
 * `$`), for parse-feat.ts's own good reason: that module reads real SRD-style
 * pages where the "Ability Score Increase." paragraph never carries anything
 * else. A wikidot page can hand-edit that assumption away — "Increase your
 * Wisdom or Charisma score by 1, to a maximum of 20. You also gain
 * darkvision 60 feet." — and reusing `readAbilityIncreaseOptions` UNGUARDED
 * would accept the prefix, silently discard the trailing sentence (it is
 * consumed into the grant's `sentence` field but its OWN mechanic — the
 * darkvision — is never represented anywhere, not even `unmodeledProse`).
 * That is EXACTLY the silent loss this whole module exists to refuse.
 * `matchesAsiFullSentence` below re-checks the paragraph's FULL, trimmed text
 * against a `$`-anchored template of each closed shape — duplicating a small
 * amount of literal shape text is the price of a guard `parse-feat.ts`
 * deliberately does not have and should not gain (its own tests document why
 * prefix-matching is correct THERE); the semantic extraction itself still
 * comes from `readAbilityIncreaseOptions`, reused rather than re-derived.
 *
 * THE SKILL GAP (codex round-1, HIGH). The skill_proficiency grant this
 * module's first cut built (`constructSkillProficiencyGrant` below) IS
 * importer-valid — `GrantRule.fromObject` accepts it, `catalog.import` would
 * accept a document containing it — and INERT in the app once imported:
 * `src/queries/level-up-planned-choices.ts`'s `forSelectedFeat` builds its
 * offered-skill list from `skills.filter((skill) => !held.has(skill))` and
 * never reads `rule.skills` at all, so a fixed named skill on a feat grant is
 * never surfaced as anything but "pick any unheld skill"; separately,
 * `src/grants/grant-rule-slot-generator.ts`'s SKILL_PROFICIENCY arm only acts
 * when `allows_tool_instead === true`, which this shape's grant never sets,
 * so the generator materialises NOTHING for it. An importable grant that
 * silently does nothing on `apply` is worse than the honest silence of
 * `unmodeledProse` — `tests/integration/rules/feat-grants-bridge-skill-gap.test.ts`
 * pins that exact behaviour against the real importer and the real character
 * pipeline. `constructSkillProficiencyGrant` and `matchSkillProficiencySentence`
 * both stay, fully tested, so wiring this in later — once the app can either
 * read `grant.skills` in the planner or the generator drops its
 * `allows_tool_instead` gate — is a one-line change in `bridgeFeatProse`, not
 * a redesign.
 *
 * THE SPEED GAP. `grantRuleKinds` (`src/domain/enums.ts`) is a closed
 * nine-member union — fixed_spell, choice_from_list, choice_from_query,
 * grant_source, capability, spellbook_acquisition, fighting_style,
 * weapon_mastery, skill_proficiency — and none of them models a flat numeric
 * bonus. `FeatContentAggregateV1` itself has no `effects` array either, the
 * way `SpeciesContentAggregate`/`BackgroundContentAggregate` do (that IS
 * where `characterEffectKinds` carries a `'speed'` member) — a feat aggregate
 * has nowhere to put one even if this module invented a shape for it.
 * Minting a tenth `GrantRuleKind` the schema does not know would be exactly
 * the fabrication `parse-feat.ts`'s file comment refuses; `GrantRule.fromObject`
 * would throw on it at runtime, and typing it in as a literal would not even
 * compile against the real `GrantRuleKind` union. `matchSpeedIncreaseFeet`
 * is a real, tested, strict recognizer proving the sentence shape IS
 * parseable, kept unwired for the identical reason the skill shape now is.
 */
import type { AuthoringGrant } from '../../src/authoring/contracts';
import { normalizeCatalogKeyComponent } from '../../src/catalog/catalog-key';
import type { Skill } from '../../src/domain/enums';
import { GrantRule } from '../../src/grants/grant-rule';
import { skillFromLabel } from '../../src/rules/skills';
import {
  readAbilityIncreaseOptions,
  type AbilityIncreaseOptions,
  type FeatParagraph,
} from './parse-feat';

/**
 * The only grant shape v1 emits. `ability_score_increase` is NOT a
 * `GrantRule` — see `FeatContentAggregateV1` in
 * `src/catalog/source-content-projector-v1.ts`: ability-score increases are
 * dedicated scalar fields on the feat aggregate (`ability_points` /
 * `ability_increase_abilities` / `ability_increase_maximum`), siblings of
 * `grants`, never members of it.
 */
export type BridgedGrant = {
  readonly shape: 'ability_score_increase';
  readonly sentence: string;
  readonly value: AbilityIncreaseOptions;
};

/**
 * A sentence shape this module DID recognise but could not promote to
 * `grants` — see "THE SKILL GAP" / "THE SPEED GAP" in this module's file
 * comment for why each of these two has no real target type yet. The
 * matching paragraph is ALSO present, verbatim, in `unmodeledProse` — this
 * is a NAMED reason attached to that silence, not a third bucket that lets a
 * paragraph skip `unmodeledProse`.
 */
export interface UnrepresentedShape {
  readonly shape: 'skill_proficiency' | 'speed_increase';
  readonly sentence: string;
  readonly reason: string;
}

export interface BridgedFeat {
  readonly kind: 'bridged';
  readonly grants: readonly BridgedGrant[];
  readonly unrepresented: readonly UnrepresentedShape[];
  /** Every paragraph this module did not turn into a grant, VERBATIM, in document order. */
  readonly unmodeledProse: readonly FeatParagraph[];
}

export interface RefusedFeat {
  readonly kind: 'refused';
  readonly reason: string;
  readonly sentence: string;
}

export type BridgeResult = BridgedFeat | RefusedFeat;

/**
 * F1: the FULL, trimmed text of an "Ability Score Increase." paragraph must
 * match one of these two `$`-anchored templates for the bridge to accept it
 * — a paragraph whose text merely STARTS with a closed shape and then keeps
 * going (any trailing clause at all) fails both and is refused, whole, to
 * `unmodeledProse`. The apostrophe class tolerates either glyph
 * (`parse-feat.ts`'s own file comment notes wikidot pages print the straight
 * `U+0027`, while `feats-srd.ts`'s SRD extract and this repo's own existing
 * feat fixtures use the curly `U+2019`) — this guard is about TRAILING
 * content, not glyph fidelity, which `readAbilityIncreaseOptions` never
 * checked either.
 */
const ASI_TWO_POINT_FULL_SENTENCE =
  /^Increase one ability score of your choice by 2, or increase two ability scores of your choice by 1\. This feat can[’']t increase an ability score above \d+\.$/u;
const ASI_ONE_POINT_FULL_SENTENCE =
  /^Increase (?:one ability score of your choice|your [^.]+ score) by 1, to a maximum of \d+\.$/u;

function matchesAsiFullSentence(
  text: string,
  value: AbilityIncreaseOptions,
): boolean {
  const trimmed = text.trim();
  return value.points === 2
    ? ASI_TWO_POINT_FULL_SENTENCE.test(trimmed)
    : ASI_ONE_POINT_FULL_SENTENCE.test(trimmed);
}

/**
 * "You gain proficiency in <skill>." — the ONLY printed shape this module
 * recognises for a single named-skill grant. Deliberately narrow: "with"
 * instead of "in", a compound clause ("... in Survival and Perception."), or
 * any trailing text past the final period all fail the match.
 *
 * RECOGNISED, NOT WIRED — see "THE SKILL GAP" in this module's file comment.
 * A matching sentence lands in `unmodeledProse` with a matching
 * `UnrepresentedShape` entry, never a `grants` entry, in this version.
 */
const SKILL_PROFICIENCY_SENTENCE =
  /^You gain proficiency in (?:the )?([A-Z][A-Za-z' -]*)\.$/u;

/**
 * Matches the skill-proficiency sentence shape and resolves the captured
 * name against the app's own printed-label vocabulary
 * (`skillFromLabel`, `src/rules/skills.ts` — the same map
 * `class-choice-entitlements-srd.ts` and the background importer use, reused
 * here rather than a second hand-written skill-name table). A syntactically
 * matching sentence naming something that is not a real skill ("... in
 * Larceny.") returns `null`, exactly like a sentence that does not match the
 * shape at all — both are "not recognised", not two different outcomes.
 */
export function matchSkillProficiencySentence(sentence: string): Skill | null {
  const match = SKILL_PROFICIENCY_SENTENCE.exec(sentence.trim());
  if (match === null) {
    return null;
  }
  return skillFromLabel(match[1] as string);
}

/**
 * "Your speed increases by N feet." RECOGNISED, NOT WIRED — see "THE SPEED
 * GAP" in this module's file comment. Exported so the recognizer itself is
 * provably correct independent of that wiring gap.
 */
const SPEED_INCREASE_SENTENCE = /^Your speed increases by (\d+) feet\.$/u;

export function matchSpeedIncreaseFeet(sentence: string): number | null {
  const match = SPEED_INCREASE_SENTENCE.exec(sentence.trim());
  if (match === null) {
    return null;
  }
  const feet = Number(match[1] as string);
  return Number.isSafeInteger(feet) && feet > 0 ? feet : null;
}

/**
 * Builds the `skill_proficiency` `GrantRule` the skill shape WOULD emit, if
 * it were wired — kept alive, exported and unit-tested (see this module's
 * file comment, "THE SKILL GAP") so wiring it in later needs no redesign,
 * only removing the reason `bridgeFeatProse` currently has for not calling
 * it. Reused nowhere in this module's own bridging path today.
 *
 * F3 (codex round-1, MEDIUM): `occurrence` is a REQUIRED, explicit component
 * of `rule_key`, not an afterthought — `parseSourceGrantRules`
 * (`src/grants/configured-choice-rule.ts`) rejects two source grant rules
 * that repeat a `rule_key`, and two feat paragraphs both reading "You gain
 * proficiency in Survival." (a plainly possible hand-edited page, e.g. a
 * feat printing the same benefit at two tiers) would otherwise mint the same
 * key twice. The caller is responsible for passing a distinct occurrence
 * number per matching sentence within one feat — see this module's own
 * tests for the deterministic pattern (an ascending counter over match
 * order).
 */
export function constructSkillProficiencyGrant(
  skill: Skill,
  occurrence: number,
): AuthoringGrant {
  if (!Number.isSafeInteger(occurrence) || occurrence < 1) {
    throw new RangeError(
      `constructSkillProficiencyGrant: occurrence must be a positive integer, got ${String(occurrence)}.`,
    );
  }
  const ruleKey = `bridged-skill-proficiency-${normalizeCatalogKeyComponent(skill)}-${String(occurrence)}`;
  return GrantRule.fromObject({
    kind: 'skill_proficiency',
    rule_key: ruleKey,
    count: 1,
    skills: [skill],
  }).toObject() as unknown as AuthoringGrant;
}

const SKILL_PROFICIENCY_UNREPRESENTED_REASON =
  'the app applies no fixed skill grant for a feat: the level-up planner ' +
  '(src/queries/level-up-planned-choices.ts forSelectedFeat) builds its ' +
  'offered-skill list from every unheld skill and never reads grant.skills, ' +
  'and the slot generator (src/grants/grant-rule-slot-generator.ts) skips a ' +
  'skill_proficiency rule entirely unless allows_tool_instead is true, which ' +
  'this shape never sets — an imported grant would be accepted and then do ' +
  'nothing on apply';

const SPEED_INCREASE_UNREPRESENTED_REASON =
  'no GrantRuleKind models a flat speed bonus (grantRuleKinds is a closed ' +
  'nine-member union with nothing for it) and FeatContentAggregateV1 has no ' +
  'effects array the way species/background aggregates do, so there is no ' +
  'real field to put a movement-speed increase in yet';

/**
 * Bridges one parsed feat's printed benefit paragraphs (`ParsedFeat.description`
 * in `parse-feat.ts`) into the grants `FeatContentAggregateV1` demands, for
 * the closed set of sentence shapes this module can promote with certainty
 * — which, in this version, is one shape (`ability_score_increase`); see
 * this module's file comment for the other two, recognised but held back.
 *
 * Refuses outright (`kind: 'refused'`) only when there is nothing to bridge
 * at all — an empty paragraph list. `parse-feat.ts` never actually produces
 * one (it fails a feat with no body text before this module would ever see
 * it), so this path exists for callers that do not go through that parser,
 * and for the "empty prose refuses" acceptance case.
 *
 * Every other input always succeeds with `kind: 'bridged'`: a feat this
 * module cannot fully model returns whatever it DID recognise plus every
 * paragraph it did not, never a hard failure over a partial understanding.
 */
export function bridgeFeatProse(
  prose: readonly FeatParagraph[],
): BridgeResult {
  if (prose.length === 0) {
    return {
      kind: 'refused',
      reason:
        'no prose blocks were supplied — refusing rather than bridging nothing',
      sentence: '',
    };
  }

  const grants: BridgedGrant[] = [];
  const unrepresented: UnrepresentedShape[] = [];
  const unmodeledProse: FeatParagraph[] = [];

  // At most one paragraph carries this label per feat, same assumption
  // `parse-feat.ts`'s own `readAbilityIncreaseOptions` makes (`.find`, not
  // `.filter`) — a second "Ability Score Increase." paragraph would be an
  // odd, malformed page, not a case this module invents behaviour for.
  const abilityIncreaseParagraph = prose.find(
    (paragraph) => paragraph.label === 'Ability Score Increase.',
  );
  const abilityIncreaseResult =
    abilityIncreaseParagraph === undefined
      ? null
      : readAbilityIncreaseOptions(prose);

  for (const paragraph of prose) {
    if (paragraph === abilityIncreaseParagraph) {
      if (
        abilityIncreaseResult !== null &&
        typeof abilityIncreaseResult !== 'string' &&
        matchesAsiFullSentence(paragraph.text, abilityIncreaseResult)
      ) {
        grants.push({
          shape: 'ability_score_increase',
          sentence: paragraph.text,
          value: abilityIncreaseResult,
        });
      } else {
        // Either matches neither closed shape at all, or matches a closed
        // shape's PREFIX with something trailing after it (F1) — both stay
        // verbatim rather than being dropped, guessed at, or split.
        unmodeledProse.push(paragraph);
      }
      continue;
    }

    const skill = matchSkillProficiencySentence(paragraph.text);
    if (skill !== null) {
      unrepresented.push({
        shape: 'skill_proficiency',
        sentence: paragraph.text,
        reason: SKILL_PROFICIENCY_UNREPRESENTED_REASON,
      });
      unmodeledProse.push(paragraph);
      continue;
    }

    const feet = matchSpeedIncreaseFeet(paragraph.text);
    if (feet !== null) {
      unrepresented.push({
        shape: 'speed_increase',
        sentence: paragraph.text,
        reason: SPEED_INCREASE_UNREPRESENTED_REASON,
      });
      unmodeledProse.push(paragraph);
      continue;
    }

    unmodeledProse.push(paragraph);
  }

  return { kind: 'bridged', grants, unrepresented, unmodeledProse };
}

export type { Skill } from '../../src/domain/enums';
