/**
 * Sourced class-choice entitlements that a class table's feature name cannot
 * fully specify.
 *
 * Expertise occurrences are cross-checked against the single class feature
 * cell parser, while their counts and eligible pools come only from
 * `class-expertise.txt`. Spell replacements come only from the attributed
 * timing prose in `class-spell-replacement.txt`; a prepared caster is not
 * assumed to receive a level-up swap merely because another class does.
 */
import expertiseExtract from '../../docs/srd/source/class-expertise.txt?raw';
import spellReplacementExtract from '../../docs/srd/source/class-spell-replacement.txt?raw';
import {
  characterLevels,
  skills,
  type CharacterLevel,
  type Skill,
  type SlotBucket,
} from '../domain/enums';
import {
  classLevelFeaturesForClassName,
  parseSrdClassLevelFeatures,
} from './class-level-features-srd';
import { SRD_CLASS_NAMES } from './class-traits-srd';

export class SrdClassChoiceEntitlementError extends Error {
  constructor(message: string) {
    super(`SRD class choice entitlements: ${message}`);
    this.name = 'SrdClassChoiceEntitlementError';
  }
}

export type ExpertisePool =
  | { readonly kind: 'any_proficient_skill' }
  | {
      readonly kind: 'named_proficient_skills';
      readonly skills: readonly Skill[];
    };

export interface SrdExpertiseEntitlement {
  readonly class_name: string;
  readonly class_level: CharacterLevel;
  readonly feature_name: string;
  readonly count: number;
  readonly pool: ExpertisePool;
}

export interface SrdSpellReplacementEntitlement {
  readonly class_name: string;
  readonly trigger: 'class_level';
  readonly bucket: Extract<SlotBucket, 'cantrip_known' | 'prepared'> | 'mystic_arcanum';
  readonly source:
    | { readonly kind: 'class_progression' }
    | {
        readonly kind: 'class_feature';
        readonly feature_name: 'Blessed Warrior' | 'Druidic Warrior';
      };
  readonly replacement_constraint:
    | 'same_list'
    | 'same_list_and_level';
}

export interface SrdClassSpellReplacementPolicy {
  readonly class_name: string;
  readonly on_class_level: readonly SrdSpellReplacementEntitlement[];
  /**
   * Replacement prose exists, but its trigger is a Long Rest rather than
   * gaining this class level. These are explicit deny controls for the wizard.
   */
  readonly long_rest_only_buckets: readonly Extract<
    SlotBucket,
    'cantrip_known' | 'prepared'
  >[];
}

const SECTION =
  /^=== (?<className>[A-Za-z]+) — printed pages? [^=]+ ===$/gm;
const LEVEL_HEADING = /^Level (?<level>\d+): (?<feature>[^\n]+)$/gm;
const COUNT_WORDS: ReadonlyMap<string, number> = new Map([
  ['one', 1],
  ['two', 2],
  ['three', 3],
  ['four', 4],
]);
const SKILL_BY_DISPLAY = new Map(
  skills.map((skill) => [skill.replace(/_/g, ' '), skill] as const),
);

interface NamedSection {
  readonly className: string;
  readonly text: string;
}

function sections(extract: string): NamedSection[] {
  const markers = [...extract.matchAll(SECTION)];
  return markers.map((marker, index) => {
    if (marker.index === undefined || marker.groups?.className === undefined) {
      throw new SrdClassChoiceEntitlementError(
        'extract has an unrecognised class marker.',
      );
    }
    const start = marker.index + marker[0].length;
    const end = markers[index + 1]?.index ?? extract.length;
    return {
      className: marker.groups.className,
      text: extract.slice(start, end).trim(),
    };
  });
}

function countWord(word: string, context: string): number {
  const count = COUNT_WORDS.get(word.toLowerCase());
  if (count === undefined) {
    throw new SrdClassChoiceEntitlementError(
      `${context} uses unsupported count word ${JSON.stringify(word)}.`,
    );
  }
  return count;
}

function level(value: string, context: string): CharacterLevel {
  const parsed = Number(value);
  if (!(characterLevels as readonly number[]).includes(parsed)) {
    throw new SrdClassChoiceEntitlementError(
      `${context} uses out-of-range class level ${value}.`,
    );
  }
  return parsed as CharacterLevel;
}

function namedSkills(text: string, context: string): readonly Skill[] | null {
  const list =
    /following skills in which you have proficiency:\s*(?<skills>[^.]+)\./.exec(
      text,
    )?.groups?.skills;
  if (list === undefined) {
    return null;
  }
  return list
    .replace(/,\s+or\s+/g, ', ')
    .split(',')
    .map((name) => name.trim().toLowerCase())
    .map((name) => {
      const skill = SKILL_BY_DISPLAY.get(name);
      if (skill === undefined) {
        throw new SrdClassChoiceEntitlementError(
          `${context} names unknown skill ${JSON.stringify(name)}.`,
        );
      }
      return skill;
    });
}

function entitlementCount(text: string, context: string): number {
  const match =
    /(?:Expertise(?: \(see [^)]+\))? in|Choose)\s+(?<count>\w+)\s+(?:more\s+)?(?:of\s+)?your skill proficiencies/.exec(
      text,
    )?.groups?.count ??
    /Choose\s+(?<count>\w+)\s+of the following skills in which you have proficiency/.exec(
      text,
    )?.groups?.count;
  if (match === undefined) {
    throw new SrdClassChoiceEntitlementError(
      `${context} grants Expertise but has no recognised choice count.`,
    );
  }
  return countWord(match, context);
}

export function parseSrdExpertiseEntitlements(
  extract: string = expertiseExtract,
): SrdExpertiseEntitlement[] {
  const found: SrdExpertiseEntitlement[] = [];
  const parsedSections = sections(extract);
  if (parsedSections.length !== 4) {
    throw new SrdClassChoiceEntitlementError(
      `expected four Expertise class sections, found ${String(parsedSections.length)}.`,
    );
  }

  for (const section of parsedSections) {
    const headings = [...section.text.matchAll(LEVEL_HEADING)];
    for (const [index, heading] of headings.entries()) {
      if (
        heading.index === undefined ||
        heading.groups?.level === undefined ||
        heading.groups.feature === undefined
      ) {
        throw new SrdClassChoiceEntitlementError(
          `${section.className} has an unrecognised feature heading.`,
        );
      }
      const start = heading.index + heading[0].length;
      const end = headings[index + 1]?.index ?? section.text.length;
      const prose = section.text.slice(start, end).trim();
      if (!prose.includes('Expertise')) {
        continue;
      }
      const classLevel = level(
        heading.groups.level,
        `${section.className} ${heading.groups.feature}`,
      );
      const named = namedSkills(
        prose,
        `${section.className} level ${String(classLevel)}`,
      );
      found.push({
        class_name: section.className,
        class_level: classLevel,
        feature_name: heading.groups.feature,
        count: entitlementCount(
          prose,
          `${section.className} level ${String(classLevel)}`,
        ),
        pool:
          named === null
            ? { kind: 'any_proficient_skill' }
            : { kind: 'named_proficient_skills', skills: named },
      });

      for (const mention of prose.matchAll(
        /At (?<className>[A-Za-z]+) level (?<level>\d+), you gain Expertise in (?<count>\w+) more of your skill proficiencies/g,
      )) {
        const mentionedClass = mention.groups?.className;
        const mentionedLevel = mention.groups?.level;
        const mentionedCount = mention.groups?.count;
        if (
          mentionedClass !== section.className ||
          mentionedLevel === undefined ||
          mentionedCount === undefined
        ) {
          throw new SrdClassChoiceEntitlementError(
            `${section.className} has an invalid later Expertise grant.`,
          );
        }
        found.push({
          class_name: section.className,
          class_level: level(
            mentionedLevel,
            `${section.className} later Expertise`,
          ),
          feature_name: 'Expertise',
          count: countWord(
            mentionedCount,
            `${section.className} later Expertise`,
          ),
          pool: { kind: 'any_proficient_skill' },
        });
      }
    }
  }

  found.sort(
    (left, right) =>
      SRD_CLASS_NAMES.indexOf(left.class_name as never) -
        SRD_CLASS_NAMES.indexOf(right.class_name as never) ||
      left.class_level - right.class_level,
  );

  // Combine prose counts/pools with the table occurrence. Ranger 2 is named
  // Deft Explorer in both places and Wizard 2 is Scholar; no Expertise
  // substring inference is used for either.
  for (const entitlement of found) {
    const table = classLevelFeaturesForClassName(entitlement.class_name);
    const cell = table?.levels.find(
      (entry) => entry.class_level === entitlement.class_level,
    );
    if (
      cell === undefined ||
      !cell.feature_names.includes(entitlement.feature_name)
    ) {
      throw new SrdClassChoiceEntitlementError(
        `${entitlement.class_name} level ${String(entitlement.class_level)} ` +
          `prose grants ${entitlement.feature_name}, but its class-table cell does not.`,
      );
    }
  }
  return found;
}

function classLevelSentences(text: string, className: string): string[] {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(
    `Whenever you gain a ${escaped} level,\\s*[^.]+\\.`,
    'g',
  );
  return [...text.matchAll(expression)].map((match) => {
    const at = match.index ?? 0;
    const separator = text.lastIndexOf('\n\n', at);
    const paragraphStart = separator < 0 ? 0 : separator + 2;
    const prefix = text.slice(paragraphStart, at);
    const feature = /^(Blessed Warrior|Druidic Warrior)\./.exec(prefix)?.[0];
    return `${feature ?? ''} ${match[0]}`.trim();
  });
}

function replacementFromSentence(
  className: string,
  sentence: string,
): SrdSpellReplacementEntitlement {
  const bucket = /\barcanum spells?\b/.test(sentence)
    ? 'mystic_arcanum'
    : /\bcantrips?\b/.test(sentence)
      ? 'cantrip_known'
      : 'prepared';
  const feature = /\bBlessed Warrior\./.test(sentence)
    ? 'Blessed Warrior'
    : /\bDruidic Warrior\./.test(sentence)
      ? 'Druidic Warrior'
      : null;
  return {
    class_name: className,
    trigger: 'class_level',
    bucket,
    source:
      feature === null
        ? { kind: 'class_progression' }
        : { kind: 'class_feature', feature_name: feature },
    replacement_constraint:
      bucket === 'mystic_arcanum'
        ? 'same_list_and_level'
        : 'same_list',
  };
}

export function parseSrdClassSpellReplacementPolicies(
  extract: string = spellReplacementExtract,
): SrdClassSpellReplacementPolicy[] {
  const parsedSections = sections(extract);
  if (parsedSections.length !== 8) {
    throw new SrdClassChoiceEntitlementError(
      `expected eight spellcasting class sections, found ${String(parsedSections.length)}.`,
    );
  }
  const byClass = new Map(
    parsedSections.map((section) => {
      const onClassLevel = classLevelSentences(
        section.text,
        section.className,
      ).map((sentence) =>
        replacementFromSentence(section.className, sentence),
      );
      const longRestOnly: Array<
        Extract<SlotBucket, 'cantrip_known' | 'prepared'>
      > = [];
      for (const sentence of section.text.match(
        /(?:Changing Your Prepared Spells\.\s*)?Whenever you finish a Long Rest,[^.]+\./g,
      ) ?? []) {
        const bucket = /\bcantrips?\b/.test(sentence)
          ? 'cantrip_known'
          : 'prepared';
        if (!onClassLevel.some((entry) => entry.bucket === bucket)) {
          longRestOnly.push(bucket);
        }
      }
      return [
        section.className,
        {
          class_name: section.className,
          on_class_level: onClassLevel,
          long_rest_only_buckets: [...new Set(longRestOnly)],
        },
      ] as const;
    }),
  );

  // The public reader answers for every bundled class. Four non-casters have
  // an explicit empty policy rather than looking like unknown content.
  return parseSrdClassLevelFeatures().map(({ class_name }) => {
    return (
      byClass.get(class_name) ?? {
        class_name,
        on_class_level: [],
        long_rest_only_buckets: [],
      }
    );
  });
}

const EXPERTISE_ENTITLEMENTS = parseSrdExpertiseEntitlements();
const SPELL_REPLACEMENT_POLICIES =
  parseSrdClassSpellReplacementPolicies();

export function expertiseEntitlementsForClassName(
  className: string,
): readonly SrdExpertiseEntitlement[] | null {
  if (!SRD_CLASS_NAMES.includes(className as never)) {
    return null;
  }
  return EXPERTISE_ENTITLEMENTS.filter(
    (entry) => entry.class_name === className,
  );
}

export function spellReplacementPolicyForClassName(
  className: string,
): SrdClassSpellReplacementPolicy | null {
  return (
    SPELL_REPLACEMENT_POLICIES.find(
      (entry) => entry.class_name === className,
    ) ?? null
  );
}
