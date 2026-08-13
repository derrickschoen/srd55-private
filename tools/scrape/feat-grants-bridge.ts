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
 * gets a preposition or a clause wrong — is never guessed at. It stays in
 * `unmodeledProse`, VERBATIM, rather than becoming a plausible, wrong rule.
 * Partial expressibility, not silent loss: a feat this module cannot fully
 * model still returns its recognised grants ALONGSIDE the untouched prose,
 * never one without the other.
 *
 * THE SPEED GAP, NAMED RATHER THAN PAPERED OVER. The scraper task that
 * commissioned this module named three target sentence shapes: the two
 * closed Ability Score Increase forms, "You gain proficiency in <skill>.",
 * and "Your speed increases by N feet." The first two both have a REAL home
 * in the app's own types — the ASI shapes are not `GrantRule`s at all (see
 * `BridgedGrant` below), and skill proficiency IS one
 * (`GrantRuleKind.skill_proficiency`, `src/grants/grant-rule.ts`). Movement
 * speed has NEITHER: `grantRuleKinds` (`src/domain/enums.ts`) is a closed
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
 * compile against the real `GrantRuleKind` union. So `matchSpeedIncreaseFeet`
 * below is a real, tested, strict recognizer — proving the sentence shape
 * IS parseable — that this module deliberately does NOT wire into
 * `bridgeFeatProse`'s main loop: a recognised speed sentence still lands in
 * `unmodeledProse`, identically to an unrecognised one, because there is no
 * real type to promote it into yet. That is the forced design deviation from
 * the task's original three-shape list, and it is a real, provable gap in
 * `FeatContentAggregateV1`, not an oversight in this module.
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
 * One recognised grant, tagged by the sentence shape that produced it and
 * carrying the exact printed sentence it came from (so a caller can always
 * show its work). `ability_score_increase` is NOT a `GrantRule` — see the
 * file comment on `readAbilityIncreaseOptions` in `parse-feat.ts` and
 * `FeatContentAggregateV1` in `src/catalog/source-content-projector-v1.ts`:
 * ability-score increases are dedicated scalar fields on the feat aggregate
 * (`ability_points` / `ability_increase_abilities` / `ability_increase_maximum`),
 * siblings of `grants`, never members of it. `skill_proficiency`'s `value` IS
 * a real `AuthoringGrant` — built through `GrantRule.fromObject` (the same
 * validating constructor `src/rules/feats-srd.ts` uses), so a malformed
 * candidate throws here rather than ever reaching a caller.
 */
export type BridgedGrant =
  | {
      readonly shape: 'ability_score_increase';
      readonly sentence: string;
      readonly value: AbilityIncreaseOptions;
    }
  | {
      readonly shape: 'skill_proficiency';
      readonly sentence: string;
      readonly value: AuthoringGrant;
    };

export interface BridgedFeat {
  readonly kind: 'bridged';
  readonly grants: readonly BridgedGrant[];
  /** Every paragraph this module did not recognise, VERBATIM, in document order. */
  readonly unmodeledProse: readonly FeatParagraph[];
}

export interface RefusedFeat {
  readonly kind: 'refused';
  readonly reason: string;
  readonly sentence: string;
}

export type BridgeResult = BridgedFeat | RefusedFeat;

/**
 * "You gain proficiency in <skill>." — the ONLY printed shape this module
 * recognises for a single named-skill grant. Deliberately narrow: "with"
 * instead of "in", a compound clause ("... in Survival and Perception."), or
 * any trailing text past the final period all fail the match and fall
 * through to `unmodeledProse` rather than being coerced into a guess.
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
 * "Your speed increases by N feet." — recognised and unit-tested (see this
 * module's file comment, "THE SPEED GAP") but never called from
 * `bridgeFeatProse`: there is no real app type to carry the result into.
 * Exported so the recognizer itself is provably correct independent of that
 * wiring gap, and so a future schema change that gives a feat aggregate
 * somewhere to put a speed bonus has a ready-made, tested parser rather than
 * a shape to reinvent.
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

function skillProficiencyGrant(skill: Skill): AuthoringGrant {
  // Deterministic, not sequential: two feats naming the same skill mint the
  // same rule_key, matching the deterministic style
  // `src/rules/feats-srd.ts`'s own `grantRules` uses ('skilled-proficiencies'
  // etc.) rather than a counter that would vary run to run.
  const ruleKey = `bridged-skill-proficiency-${normalizeCatalogKeyComponent(skill)}`;
  return GrantRule.fromObject({
    kind: 'skill_proficiency',
    rule_key: ruleKey,
    count: 1,
    skills: [skill],
  }).toObject() as unknown as AuthoringGrant;
}

/**
 * Bridges one parsed feat's printed benefit paragraphs (`ParsedFeat.description`
 * in `parse-feat.ts`) into the grants `FeatContentAggregateV1` demands, for
 * the closed set of sentence shapes this module recognises with certainty.
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
        typeof abilityIncreaseResult !== 'string'
      ) {
        grants.push({
          shape: 'ability_score_increase',
          sentence: paragraph.text,
          value: abilityIncreaseResult,
        });
      } else {
        // Labelled "Ability Score Increase." but matches neither closed
        // shape (see `readAbilityIncreaseOptions`'s own comment) — stays
        // verbatim rather than being dropped or guessed at.
        unmodeledProse.push(paragraph);
      }
      continue;
    }

    const skill = matchSkillProficiencySentence(paragraph.text);
    if (skill !== null) {
      grants.push({
        shape: 'skill_proficiency',
        sentence: paragraph.text,
        value: skillProficiencyGrant(skill),
      });
      continue;
    }

    // Every other paragraph, INCLUDING one that matches
    // `matchSpeedIncreaseFeet` — see this module's file comment, "THE SPEED
    // GAP", for why a recognised speed sentence still ends up here.
    unmodeledProse.push(paragraph);
  }

  return { kind: 'bridged', grants, unmodeledProse };
}

export type { Skill } from '../../src/domain/enums';
