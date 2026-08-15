import type { Ability, DamageType } from '../domain/enums';
import type { SaveSuccessOutcome } from './contracts';

export type FailedDamageSignature = {
  readonly damage_type: DamageType | null;
  readonly dice_count: number | null;
  readonly die_size: number | null;
  readonly flat_modifier: number | null;
};

export type SourceDamageArm = 'failure' | 'success';
export type SourceDamageTiming =
  | 'on_save_resolution'
  | 'end_of_target_next_turn';
export type SourceDamageRollTransform = 'none' | 'floor_half';

export type SourceDerivedSaveSuccess =
  | { readonly status: 'available'; readonly kind: SaveSuccessOutcome['kind'] }
  | { readonly status: 'unavailable'; readonly reason: string };

export type SourceDerivedDamageFrequency =
  | { readonly kind: 'each_declared_event' }
  | { readonly kind: 'once_per_turn'; readonly turn: 'source' | 'target' }
  | { readonly kind: 'once_per_round' }
  | { readonly kind: 'unavailable'; readonly reason: string };

export type SourceDerivedDamageDuration =
  | { readonly kind: 'instantaneous' }
  | {
      readonly kind: 'includes_delayed_damage';
      readonly delayed_until: 'end_of_target_next_turn';
    };

export type SourceDerivedDamageRepetitions =
  | {
      readonly status: 'available';
      readonly minimum: 1;
      readonly maximum: 1 | 2;
    }
  | { readonly status: 'unavailable'; readonly reason: string };

export type SourceDerivedFixedSaveDc =
  | { readonly status: 'available'; readonly value: number | null }
  | { readonly status: 'unavailable'; readonly reason: string };

/**
 * One clause-local occurrence of a damage amount and its associated type.
 * Alternative types that share one amount share a slot index. Offsets are
 * relative to the owning spell body, never to the unsliced PDF row stream.
 * Components whose source ranges overlap belong to one damage roll.
 */
export type SourceDamageOccurrence = FailedDamageSignature & {
  readonly arm: SourceDamageArm;
  readonly timing: SourceDamageTiming;
  readonly roll_transform: SourceDamageRollTransform;
  readonly start: number;
  readonly end: number;
  readonly slot_index: number;
  readonly roll_index: number;
};

export type SourceDerivedSaveClause = {
  readonly span: string;
  readonly start: number;
  readonly end: number;
  readonly save_start: number;
  readonly ability: Ability;
  readonly success: SourceDerivedSaveSuccess;
  readonly fixed_save_dc: SourceDerivedFixedSaveDc;
  readonly frequency: SourceDerivedDamageFrequency;
  readonly duration: SourceDerivedDamageDuration;
  readonly timing_unavailable_reason: string | null;
  readonly repetitions: SourceDerivedDamageRepetitions;
  readonly failed_damage_signatures: readonly FailedDamageSignature[];
  readonly damage_occurrences: readonly SourceDamageOccurrence[];
};

export type SourceDerivedSaveDamageCandidate = SourceDerivedSaveClause & {
  readonly heading: string;
};

export type BroadDamageSaveSuspect = {
  readonly heading: string;
  readonly span: string;
  readonly start: number;
  readonly end: number;
};

export type DerivedSaveDamageCoverage = {
  readonly bodies: ReadonlyMap<string, string>;
  readonly clauses_by_heading: ReadonlyMap<string, readonly SourceDerivedSaveClause[]>;
  readonly candidates: readonly SourceDerivedSaveDamageCandidate[];
  readonly counts: {
    readonly before_deduplication: number;
    readonly after_deduplication: number;
  };
  readonly broad_suspects: readonly BroadDamageSaveSuspect[];
};

const COLUMN_MARKER = /^=== SRD 5\.2\.1 page \d+, (?:left|right) column ===$/u;
const SPELL_METADATA = /^(?:Level [1-9] (?:Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation)|(?:Abjuration|Conjuration|Divination|Enchantment|Evocation|Illusion|Necromancy|Transmutation) Cantrip) \(/u;
const DAMAGE_TYPES = 'Acid|Bludgeoning|Cold|Fire|Force|Lightning|Necrotic|Piercing|Poison|Psychic|Radiant|Slashing|Thunder';
const PAGE_FOOTER = /^(?:(\d+)\s+System Reference Document 5\.2\.1|System Reference Document 5\.2\.1\s+(\d+))\s*$/u;
const SPELL_PAGE_REPIN_WORKFLOW = 'To re-pin a legitimate SRD revision, inspect the changed spell pages, update the reviewed page range/count and committed readable extract, and record a justification naming what changed and why.';

const abilityBySourceName = {
  Strength: 'strength',
  Dexterity: 'dexterity',
  Constitution: 'constitution',
  Intelligence: 'intelligence',
  Wisdom: 'wisdom',
  Charisma: 'charisma',
} as const satisfies Record<string, Ability>;

/**
 * Reads only an explicitly column-sliced spell extract. The marker check is
 * load-bearing: accepting an unmarked `pdftotext -layout` stream here would
 * silently reintroduce row-wise interleaving between unrelated columns.
 */
function headingsFromReadingOrderLines(
  lines: readonly string[],
): ReadonlyMap<string, string> {
  const starts = lines.flatMap((line, index) =>
    SPELL_METADATA.test(line.trim()) ? [index] : [],
  );
  const previousContent = (before: number): number => {
    for (let index = before - 1; index >= 0; index -= 1) {
      if ((lines[index] ?? '').trim() !== '') {
        return index;
      }
    }
    throw new TypeError('Bundled spell metadata has no preceding heading.');
  };
  return new Map(starts.map((start, position) => {
    const headingIndex = previousContent(start);
    const end = position + 1 < starts.length
      ? previousContent(starts[position + 1] as number)
      : lines.length;
    return [
      (lines[headingIndex] ?? '').trim(),
      lines.slice(start, end)
        .join(' ')
        .replace(/-\s+/gu, '')
        .replace(/\s+/gu, ' ')
        .trim(),
    ];
  }));
}

export function spellDescriptionsByHeading(
  columnSlicedExtract: string,
): ReadonlyMap<string, string> {
  const rawLines = columnSlicedExtract.split('\n');
  const firstColumn = rawLines.findIndex((line) => COLUMN_MARKER.test(line));
  if (firstColumn < 0) {
    throw new TypeError(
      'Spell source must contain explicit page/column markers before it can be read as prose.',
    );
  }
  const lines = rawLines.slice(firstColumn).filter((line) =>
    !COLUMN_MARKER.test(line),
  );
  return headingsFromReadingOrderLines(lines);
}

function splitSafe(line: string, column: number): boolean {
  for (const index of [column - 1, column, column + 1]) {
    if (index < line.length && line[index] !== ' ') {
      return false;
    }
  }
  return true;
}

function findGutter(lines: readonly string[], page: number): number {
  const nonBlank = lines.filter((line) => line.trim() !== '');
  const width = Math.max(...nonBlank.map((line) => line.length));
  const candidates: number[] = [];
  for (
    let column = Math.floor(width * 0.35);
    column <= Math.floor(width * 0.65);
    column += 1
  ) {
    if (nonBlank.every((line) => splitSafe(line, column))) {
      candidates.push(column);
    }
  }
  const gutter = candidates[Math.floor(candidates.length / 2)];
  if (gutter === undefined) {
    throw new TypeError(`SRD spell page ${String(page)} has no safe two-column gutter.`);
  }
  return gutter;
}

/**
 * Reconstructs printed spell pages from the complete `pdftotext -layout`
 * corpus. Every physical row is sliced at a measured whitespace-only gutter
 * before either column is flattened, so neighbouring prose can never be read
 * as one sentence.
 */
export function spellDescriptionsFromFullLayout(
  fullLayout: string,
): ReadonlyMap<string, string> {
  const readingOrder: string[] = [];
  const seenPages: number[] = [];
  for (const rawPage of fullLayout.split('\f')) {
    const lines = rawPage.split('\n').map((line) => line.replace(/\s+$/u, ''));
    const footerIndex = lines.findIndex((line) => PAGE_FOOTER.test(line.trim()));
    if (footerIndex < 0) {
      continue;
    }
    const footer = PAGE_FOOTER.exec((lines[footerIndex] ?? '').trim());
    const page = Number(footer?.[1] ?? footer?.[2]);
    if (page < 107 || page > 175) {
      if (lines.some((line) => SPELL_METADATA.test(line.trim()))) {
        throw new TypeError(
          `Found spell metadata outside the reviewed SRD spell pages 107-175 on page ${String(page)}. ${SPELL_PAGE_REPIN_WORKFLOW}`,
        );
      }
      continue;
    }
    seenPages.push(page);
    const pageLines = lines.slice(0, footerIndex);
    const gutter = findGutter(pageLines, page);
    readingOrder.push(
      ...pageLines.map((line) => line.slice(0, gutter)),
      ...pageLines.map((line) => line.slice(gutter)),
    );
  }
  if (
    seenPages.length !== 69 ||
    seenPages.some((page, index) => page !== 107 + index)
  ) {
    throw new TypeError(
      `Expected complete SRD spell pages 107-175; read ${seenPages.join(', ')}. ${SPELL_PAGE_REPIN_WORKFLOW}`,
    );
  }
  const descriptions = headingsFromReadingOrderLines(readingOrder);
  if (descriptions.size !== 339) {
    throw new TypeError(
      `Expected 339 SRD spell descriptions on pages 107-175; read ${String(descriptions.size)}. ${SPELL_PAGE_REPIN_WORKFLOW}`,
    );
  }
  return descriptions;
}

function sourceAbility(span: string, fallback: Ability | null): Ability {
  const match = /\b(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: \([^)]*\))? (?:saving throw|Saving Throw:)/u.exec(span);
  const name = match?.[1];
  if (name !== undefined && Object.hasOwn(abilityBySourceName, name)) {
    return abilityBySourceName[name as keyof typeof abilityBySourceName];
  }
  if (fallback !== null) {
    return fallback;
  }
  throw new TypeError(`Could not derive a save ability from: ${span}`);
}

function rangeContains(
  ranges: readonly { readonly start: number; readonly end: number }[],
  index: number,
): boolean {
  return ranges.some((range) => index >= range.start && index < range.end);
}

export function sourceDamageSignatures(
  span: string,
): readonly FailedDamageSignature[] {
  return damageOccurrenceGroups(span).flatMap((group) => group.signatures);
}

type DamageOccurrenceGroup = {
  readonly start: number;
  readonly end: number;
  readonly signatures: readonly FailedDamageSignature[];
};

function damageOccurrenceGroups(span: string): readonly DamageOccurrenceGroup[] {
  const groups: DamageOccurrenceGroup[] = [];
  const directlyOwnedDice: { start: number; end: number }[] = [];
  const dicePattern = new RegExp(
    `(\\d+)d(\\d+)(?:\\s*\\+\\s*(\\d+))?([^.]{0,80}?)\\bdamage`,
    'giu',
  );
  for (const match of span.matchAll(dicePattern)) {
    const start = match.index ?? 0;
    const diceText = `${match[1] ?? ''}d${match[2] ?? ''}`;
    const types = [...(match[4] ?? '').matchAll(new RegExp(`\\b(${DAMAGE_TYPES})\\b`, 'giu'))]
      .map((typeMatch) => typeMatch[1] as DamageType);
    if (types.length > 0) {
      directlyOwnedDice.push({ start, end: start + diceText.length });
    }
    groups.push({
      start,
      end: start + (match[0]?.length ?? diceText.length),
      signatures: (types.length === 0 ? [null] : types).map((damageType) => ({
        dice_count: Number(match[1]),
        die_size: Number(match[2]),
        flat_modifier: null,
        damage_type: damageType,
      })),
    });
  }
  const flatPattern = new RegExp(
    `\\b(\\d+) (${DAMAGE_TYPES}) damage`,
    'giu',
  );
  for (const match of span.matchAll(flatPattern)) {
    if (!span.slice(Math.max(0, (match.index ?? 0) - 3), match.index).includes('d')) {
      groups.push({
        start: match.index ?? 0,
        end: (match.index ?? 0) + (match[0]?.length ?? 0),
        signatures: [{
          dice_count: null,
          die_size: null,
          flat_modifier: Number(match[1]),
          damage_type: match[2] as DamageType,
        }],
      });
    }
  }
  const reverseDicePattern = new RegExp(
    `\\b(${DAMAGE_TYPES}) damage[\\s\\S]{0,220}?(\\d+)d(\\d+)(?:\\s*\\+\\s*(\\d+))?`,
    'giu',
  );
  for (const match of span.matchAll(reverseDicePattern)) {
    const matchStart = match.index ?? 0;
    const matchedText = match[0] ?? '';
    const diceText = `${match[2] ?? ''}d${match[3] ?? ''}`;
    const diceIndex = matchStart + matchedText.lastIndexOf(diceText);
    // A later dice expression that already owns its following damage type is
    // not also owned by an earlier type. This is the Ice Storm/Flame Strike
    // shape; accepting both manufactures a signature from prose order alone.
    if (rangeContains(directlyOwnedDice, diceIndex)) {
      continue;
    }
    groups.push({
      start: diceIndex,
      end: diceIndex + diceText.length,
      signatures: [{
        dice_count: Number(match[2]),
        die_size: Number(match[3]),
        flat_modifier: null,
        damage_type: match[1] as DamageType,
      }],
    });
  }
  if (groups.length === 0 && /\d+d\d+[^.]{0,70}?damage of (?:the|a) [^.]+ type/iu.test(span)) {
    const dice = /(\d+)d(\d+)/u.exec(span);
    const start = dice?.index ?? 0;
    groups.push({
      start,
      end: start + (dice?.[0].length ?? 0),
      signatures: [{
        dice_count: dice === null ? null : Number(dice[1]),
        die_size: dice === null ? null : Number(dice[2]),
        flat_modifier: null,
        damage_type: null,
      }],
    });
  }
  if (groups.length === 0) {
    const dice = /(\d+)d(\d+)[^.]{0,80}?damage/iu.exec(span);
    if (dice !== null) {
      groups.push({
        start: dice.index,
        end: dice.index + dice[0].length,
        signatures: [{
          dice_count: Number(dice[1]),
          die_size: Number(dice[2]),
          flat_modifier: null,
          damage_type: null,
        }],
      });
    }
  }
  return groups
    .filter((group) =>
      !group.signatures.every((signature) => signature.damage_type === null) ||
      !groups.some((candidate) =>
        candidate !== group &&
        candidate.start === group.start &&
        candidate.signatures.some((signature) => signature.damage_type !== null),
      )
    )
    .sort((left, right) => left.start - right.start);
}

function failureDamageSlices(span: string): readonly {
  readonly text: string;
  readonly start: number;
}[] {
  const sentences = [...span.matchAll(/[^.!?]+(?:[.!?]|$)/gu)].map((match) => ({
    text: match[0] ?? '',
    start: match.index ?? 0,
  }));
  const explicit = sentences.filter(({ text }) =>
    /(?:failed save|Failure:|saving throw[^.]{0,160}?or take|taking [^.]{0,160}?damage on (?:a )?failed save)/iu.test(text) &&
    /(?:\d+d\d+|\b\d+\b)[^.]{0,100}?damage|damage[^.]{0,100}?(?:\d+d\d+|\b\d+\b)/iu.test(text),
  );
  if (explicit.length > 0) {
    return explicit;
  }
  const fallback = directFailureDamageSpan(span);
  return [{ text: fallback, start: span.indexOf(fallback) }];
}

function sourceDamageOccurrences(
  span: string,
  bodyStart: number,
): readonly SourceDamageOccurrence[] {
  const groups = failureDamageSlices(span).flatMap((slice) =>
    damageOccurrenceGroups(slice.text).map((group) => ({
      ...group,
      start: slice.start + group.start,
      end: slice.start + group.end,
    })),
  );
  const prismaticAlternatives = /Prismatic (?:Rays|Layers)|struck by two rays/iu.test(span);
  const mergedSlotByGroup: number[] = [];
  const rollByGroup: number[] = [];
  let nextSlot = 0;
  let nextRoll = 0;
  for (const [index, group] of groups.entries()) {
    const previous = groups[index - 1];
    const bridge = previous === undefined ? '' : span.slice(previous.end, group.start);
    const sharesAlternativeSlot = prismaticAlternatives || /\bor\b/iu.test(bridge);
    if (index === 0 || !sharesAlternativeSlot) {
      nextSlot = index === 0 ? 0 : nextSlot + 1;
    }
    mergedSlotByGroup.push(nextSlot);
    if (
      previous !== undefined &&
      !sharesAlternativeSlot &&
      group.start >= previous.end
    ) {
      nextRoll += 1;
    }
    rollByGroup.push(nextRoll);
  }
  const failure = groups.flatMap((group, groupIndex) => {
    const sentenceEnd = span.indexOf('.', group.end);
    const nextGroupStart = groups[groupIndex + 1]?.start;
    const timingText = span.slice(
      group.end,
      nextGroupStart ?? (sentenceEnd < 0 ? span.length : sentenceEnd),
    );
    const timing: SourceDamageTiming = /^\s*at the end of its next turn/iu.test(timingText)
      ? 'end_of_target_next_turn'
      : 'on_save_resolution';
    return group.signatures.map((signature) => ({
      ...signature,
      arm: 'failure' as const,
      timing,
      roll_transform: 'none' as const,
      start: bodyStart + group.start,
      end: bodyStart + group.end,
      slot_index: mergedSlotByGroup[groupIndex] ?? groupIndex,
      roll_index: rollByGroup[groupIndex] ?? groupIndex,
    }));
  });
  const halfInitial = /half the initial damage only/iu.exec(span);
  if (halfInitial === null) {
    return failure;
  }
  const initial = failure.find((occurrence) =>
    occurrence.timing === 'on_save_resolution',
  );
  if (initial === undefined) {
    throw new TypeError(`Half-initial-damage clause has no initial damage occurrence: ${span}`);
  }
  return [
    ...failure,
    {
      ...initial,
      arm: 'success',
      roll_transform: 'floor_half',
      start: bodyStart + (halfInitial.index ?? 0),
      end: bodyStart + (halfInitial.index ?? 0) + halfInitial[0].length,
      slot_index: 0,
      roll_index: 0,
    },
  ];
}

function sourceDerivedSaveSuccess(
  span: string,
  ownership: 'direct' | 'gate',
): SourceDerivedSaveSuccess {
  if (ownership === 'gate') {
    return {
      status: 'unavailable',
      reason: 'The save gates another effect; the source does not make the numeric expression failed-save damage.',
    };
  }
  if (/half the initial damage only/iu.test(span)) {
    return { status: 'available', kind: 'sourced_damage' };
  }
  if (/(?:half (?:as much|the initial) damage|half damage|Success:\s*Half damage)/iu.test(span)) {
    return { status: 'available', kind: 'half' };
  }
  if (/(?:On a successful save|Successful Save:|Success:)[^.]*\bno damage\b/iu.test(span)) {
    return { status: 'available', kind: 'none' };
  }
  const damageIsFailureScoped =
    /(?:On (?:a )?failed save|Failed Save:|Failure:)[^.]*\bdamage\b/iu.test(span) ||
    /\b(?:must )?succeed[^.]*\bor take\b[^.]*\bdamage\b/iu.test(span) ||
    /\btaking\b[^.]*\bdamage on (?:a )?failed save\b/iu.test(span);
  const successDealsDamage =
    /(?:On a successful save|Successful Save:|Success:)[^.]*\bdamage\b/iu.test(span);
  if (damageIsFailureScoped && !successDealsDamage) {
    return { status: 'available', kind: 'none' };
  }
  return {
    status: 'unavailable',
    reason: 'The source clause does not prove the successful-save damage arm.',
  };
}

function isSourceSentencePeriod(span: string, index: number): boolean {
  const before = span.slice(0, index + 1);
  const after = span.slice(index + 1);
  const next = span[index + 1];
  if (next !== undefined && /[\p{L}\p{N}]/u.test(next)) {
    return false;
  }
  if (
    /\bvs\.$/iu.test(before) &&
    /^\s*(?:DC\b|D\.C\.|Difficulty Class\b)/iu.test(after)
  ) {
    return false;
  }
  if (
    /\bD\.C\.$/iu.test(before) &&
    /^\s*(?:(?:is|equals|of)\s+|[:=]\s*)?\d/iu.test(after)
  ) {
    return false;
  }
  return true;
}

export function sourceSentences(span: string): readonly {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}[] {
  const sentences: { start: number; end: number; text: string }[] = [];
  let start = 0;
  for (let index = 0; index < span.length; index += 1) {
    const character = span[index];
    const isStop = character === '!' || character === '?' ||
      (character === '.' && isSourceSentencePeriod(span, index));
    if (!isStop) {
      continue;
    }
    sentences.push({ start, end: index + 1, text: span.slice(start, index + 1) });
    start = index + 1;
  }
  if (start < span.length) {
    sentences.push({ start, end: span.length, text: span.slice(start) });
  }
  return sentences.length === 0
    ? [{ start: 0, end: span.length, text: span }]
    : sentences;
}

export function sourceFixedSaveDc(span: string): SourceDerivedFixedSaveDc {
  const ability = '(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)';
  const dcMarker = '(?:DC|D\\.C\\.|Difficulty Class)';
  const numericDcMarker = `${dcMarker}\\s*(?:(?:is|equals|of)\\s+|[:=]\\s*)?\\d+`;
  const fixedValues: number[] = [];
  for (const sentence of sourceSentences(span)) {
    const recognized: {
      readonly start: number;
      readonly end: number;
      readonly value: number;
    }[] = [];
    for (const pattern of [
      new RegExp(`\\bDC\\s+(\\d+)\\s+${ability} saving throw\\b`, 'giu'),
      new RegExp(
        `\\b${ability} saving throw(?:\\s+against\\s+DC|\\s+with\\s+a\\s+DC\\s+of|\\s+(?:vs\\.?|versus)\\s+DC)\\s*(\\d+)\\b`,
        'giu',
      ),
    ]) {
      for (const match of sentence.text.matchAll(pattern)) {
        recognized.push({
          start: match.index ?? 0,
          end: (match.index ?? 0) + (match[0]?.length ?? 0),
          value: Number(match[1]),
        });
      }
    }
    const numericDc = new RegExp(
      `\\b${numericDcMarker}\\b`,
      'giu',
    );
    const unsupported = [...sentence.text.matchAll(numericDc)].find((candidate) => {
      const index = candidate.index ?? 0;
      if (recognized.some((range) => index >= range.start && index < range.end)) {
        return false;
      }
      const beforeDc = sentence.text.slice(0, index);
      const fromDc = sentence.text.slice(index);
      const checkAfterDc = new RegExp(
        `^${numericDcMarker}\\s+${ability}(?:\\s+\\([^)]*\\))?\\s+check\\b`,
        'iu',
      ).test(fromDc);
      const parentheticalCheck = new RegExp(
        `\\b(?:ability check|${ability}(?:\\s+\\([^)]*\\))?\\s+check)\\b([^;.!?]*)\\(\\s*$`,
        'iu',
      ).exec(beforeDc);
      const checkBeforeDc = /\bcheck\b\s+(?:against|versus|vs\.)\s*$/iu.test(beforeDc) ||
        (
          parentheticalCheck !== null &&
          !/\b(?:saving throw|save)\b/iu.test(parentheticalCheck[1] ?? '')
        );
      const belongsToCheck = checkAfterDc || checkBeforeDc;
      const followsSave = /\b(?:saving throw|save)\b/iu.test(beforeDc);
      const precedesSave = new RegExp(
        `^${numericDcMarker}[^;.!?]*\\b(?:${ability}(?:\\s+\\([^)]*\\))?\\s+saving throw|save)\\b`,
        'iu',
      ).test(fromDc);
      return !belongsToCheck && (followsSave || precedesSave);
    }) ?? null;
    if (unsupported !== null) {
      return {
        status: 'unavailable',
        reason: `The source fixed save DC syntax is not representable: ${unsupported[0]}.`,
      };
    }
    fixedValues.push(...recognized.map((match) => match.value));
  }
  const distinctValues = [...new Set(fixedValues)];
  if (distinctValues.length > 1) {
    return {
      status: 'unavailable',
      reason: `The source declares conflicting fixed save DCs: ${distinctValues.join(', ')}.`,
    };
  }
  return { status: 'available', value: distinctValues[0] ?? null };
}

function sourceDamageFrequency(
  span: string,
  spellBody: string,
): SourceDerivedDamageFrequency {
  const sentences = span.match(/[^.!?]+(?:[.!?]|$)/gu) ?? [span];
  const saveSentence = sentences.find((sentence) =>
    /(?:saving throw|Saving Throw:|repeats? (?:that|the) save)/u.test(sentence),
  ) ?? '';
  const explicitLimit = sentences.find((sentence) =>
    /(?:this save|that save|take this damage|be affected by this spell) only \w+ (?:per|on a) (?:turn|round)/iu.test(sentence),
  ) ?? '';
  const spellWideLimit = /\b(?:A creature|Each creature|The target) is targeted only once per turn\b/iu.exec(spellBody)?.[0] ?? '';
  const evidenceText = `${saveSentence} ${explicitLimit} ${spellWideLimit}`;
  if (/\bonly once per round\b/iu.test(evidenceText)) {
    return { kind: 'once_per_round' };
  }
  if (
    /\bonly once (?:per|on a) turn\b/iu.test(evidenceText) ||
    /\bfor the first time on a turn\b/iu.test(saveSentence) ||
    /\bat the (?:start|end) of each of its turns\b/iu.test(saveSentence) ||
    /\bat the end of each of their turns\b/iu.test(saveSentence)
  ) {
    return { kind: 'once_per_turn', turn: 'target' };
  }
  if (/\bat the (?:start|end) of each of your turns\b/iu.test(saveSentence)) {
    return { kind: 'once_per_turn', turn: 'source' };
  }
  const unsupportedLimit = /\b(?:only (?:once|twice|\w+) (?:per|on a) (?:turn|round)|for the (?:first|second|\w+) time on a turn)\b/iu.exec(evidenceText);
  if (unsupportedLimit !== null) {
    return {
      kind: 'unavailable',
      reason: `The source recurrence is not representable: ${unsupportedLimit[0]}.`,
    };
  }
  return { kind: 'each_declared_event' };
}

function sourceDamageDuration(
  occurrences: readonly SourceDamageOccurrence[],
): SourceDerivedDamageDuration {
  return occurrences.some((occurrence) =>
    occurrence.timing === 'end_of_target_next_turn'
  )
    ? {
        kind: 'includes_delayed_damage',
        delayed_until: 'end_of_target_next_turn',
      }
    : { kind: 'instantaneous' };
}

function unsupportedSourceDamageTiming(span: string): string | null {
  if (/\bdamage when (?:it|the target) wakes? up\b/iu.test(span)) {
    return 'The damage occurs when the target wakes; that delayed timing is not representable.';
  }
  if (/\bdamage at the end of its next turn\b/iu.test(span)) {
    return 'The delayed damage occurs at the end of the target’s next turn; round scheduling is not representable.';
  }
  const unsupported = /\bdamage at the (?:start|end) of (?:its|the target’s|the target's) next turn\b/iu.exec(span);
  return unsupported === null
    ? null
    : `The source timing is not representable: ${unsupported[0]}.`;
}

function sourceDamageRepetitions(
  sourceText: string,
): SourceDerivedDamageRepetitions {
  if (/\broll 1d8\b[\s\S]*\bstruck by two rays\b[\s\S]*\broll twice\b/iu.test(sourceText)) {
    return {
      status: 'unavailable',
      reason: 'The random ray selection and conditional two-ray branch are not representable.',
    };
  }
  const repeatedDamage = /\b(?:takes?|deals?) (?:this|the) damage (?:twice|\w+ times)\b/iu.exec(sourceText);
  if (repeatedDamage !== null) {
    return {
      status: 'unavailable',
      reason: `The source repetition cardinality is not representable: ${repeatedDamage[0]}.`,
    };
  }
  const rayCardinality = /\bstruck by (one|two|three|four|five|six|seven|eight|\d+) rays?\b/iu.exec(sourceText);
  if (rayCardinality === null) {
    return { status: 'available', minimum: 1, maximum: 1 };
  }
  if (rayCardinality[1]?.toLowerCase() === 'two') {
    return { status: 'available', minimum: 1, maximum: 2 };
  }
  return {
    status: 'unavailable',
    reason: `The source repetition cardinality is not representable: ${rayCardinality[0]}.`,
  };
}

function directFailureDamageSpan(span: string): string {
  const sentences = span.match(/[^.!?]+[.!?]/gu) ?? [span];
  const relevant = sentences.find((sentence) =>
    /(?:failed save|Failure:|saving throw[^.]{0,160}?or take|taking [^.]{0,160}?damage on (?:a )?failed save)/iu.test(sentence) &&
    /(?:\d+d\d+|\b\d+\b)[^.]{0,100}?damage|damage[^.]{0,100}?(?:\d+d\d+|\b\d+\b)/iu.test(sentence),
  );
  return relevant ?? span;
}

function directDamageSaveClauses(body: string): SourceDerivedSaveClause[] {
  const explicitSave = /\b(?:(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: \([^)]*\))? (?:saving throw|Saving Throw:)|repeats? (?:that|the) save|repeats the save)/giu;
  const matches = [...body.matchAll(explicitSave)];
  const owners: {
    readonly match: RegExpMatchArray;
    readonly start: number;
    readonly ability: Ability;
    readonly repeats_damage: boolean;
    readonly failed_damage_signatures: readonly FailedDamageSignature[];
    readonly damage_occurrences: readonly SourceDamageOccurrence[];
  }[] = [];
  let inheritedAbility: Ability | null = null;
  let inheritedDamageSignatures: readonly FailedDamageSignature[] = [];
  let inheritedDamageOccurrences: readonly SourceDamageOccurrence[] = [];
  for (const [index, match] of matches.entries()) {
    const start = body.lastIndexOf('.', match.index ?? 0) + 1;
    const next = matches[index + 1]?.index ?? body.length;
    const rawSpan = body.slice(start, next);
    const leading = rawSpan.length - rawSpan.trimStart().length;
    const span = rawSpan.trim();
    inheritedAbility = sourceAbility(span, inheritedAbility);
    const repeatsDamage = /(?:takes?|deals?) (?:the )?[A-Za-z]+ damage again/iu.test(span);
    const directDamage = /(?:failed save|Failure:|saving throw[^.]{0,140}?or take|taking [^.]{0,140}?damage on (?:a )?failed save)[\s\S]{0,240}?(?:\d+d\d+|\b\d+\b)[^.]{0,90}?damage|(?:\d+d\d+|\b\d+\b)[^.]{0,90}?damage[^.]{0,120}?(?:failed save|Failure:)/iu.test(span) ||
      (repeatsDamage && inheritedDamageSignatures.length > 0);
    if (!directDamage) {
      continue;
    }
    const signatures = sourceDamageSignatures(directFailureDamageSpan(span));
    const failedDamageSignatures = signatures.length === 0 && repeatsDamage
      ? inheritedDamageSignatures
      : signatures;
    const directOccurrences = sourceDamageOccurrences(span, start + leading);
    const damageOccurrences = repeatsDamage && inheritedDamageOccurrences.length > 0
      ? inheritedDamageOccurrences.filter((occurrence) => occurrence.arm === 'failure')
      : directOccurrences;
    owners.push({
      match,
      start: start + leading,
      ability: inheritedAbility,
      repeats_damage: repeatsDamage,
      failed_damage_signatures: failedDamageSignatures,
      damage_occurrences: damageOccurrences,
    });
    inheritedDamageSignatures = failedDamageSignatures;
    inheritedDamageOccurrences = damageOccurrences;
  }
  return owners.map((owner, index) => {
    const end = owners[index + 1]?.match.index ?? body.length;
    const span = body.slice(owner.start, end).trimEnd();
    const damageOccurrences = owner.repeats_damage && owner.damage_occurrences.length > 0
      ? owner.damage_occurrences
      : sourceDamageOccurrences(span, owner.start);
    return {
      span,
      start: owner.start,
      end: owner.start + span.length,
      save_start: owner.match.index ?? owner.start,
      ability: owner.ability,
      success: sourceDerivedSaveSuccess(span, 'direct'),
      fixed_save_dc: sourceFixedSaveDc(span),
      frequency: sourceDamageFrequency(span, body),
      duration: sourceDamageDuration(damageOccurrences),
      timing_unavailable_reason: unsupportedSourceDamageTiming(span),
      repetitions: sourceDamageRepetitions(body),
      failed_damage_signatures: owner.failed_damage_signatures,
      damage_occurrences: damageOccurrences,
    };
  });
}

function gateDamageSaveClause(body: string): SourceDerivedSaveClause | null {
  const gatePatterns = [
    /[^.]*Dexterity saving throw[^.]*Grappled[^.]*\.[\s\S]{0,240}?grapples[^.]*damage[^.]*4d6[^.]*\./iu,
    /[^.]*must succeed on a Wisdom saving throw or become cursed[\s\S]{0,520}?extra 1d8 Necrotic damage[^.]*\./iu,
    /[^.]*Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell has no effect[\s\S]{0,1500}?(?:extra 1d4 damage|1d4[^.]*less damage)[^.]*\./iu,
    /[^.]*Strength saving throw[\s\S]{0,260}?successful save[^.]*spell ends[\s\S]{0,180}?While Restrained[^.]*1d6 Piercing damage[^.]*\./iu,
    /[^.]*Wisdom saving throw or have the Charmed condition[\s\S]{0,260}?While Charmed[^.]*5d10 Psychic damage[^.]*\./iu,
    /[^.]*Intelligence saving throw[\s\S]{0,900}?affected target[\s\S]{0,420}?2d8 Psychic damage[^.]*\./iu,
    /[^.]*Constitution saving throw[\s\S]{0,360}?subtracts 1d8 from all its damage rolls[^.]*\./iu,
    /[^.]*1d6 Fire damage[\s\S]{0,220}?start of each of its turns[\s\S]{0,180}?Constitution saving throw[\s\S]{0,120}?successful save[^.]*spell ends[^.]*\./iu,
  ];
  for (const pattern of gatePatterns) {
    const match = pattern.exec(body);
    if (match !== null) {
      const rawSpan = match[0];
      const leading = rawSpan.length - rawSpan.trimStart().length;
      const span = rawSpan.trim();
      const start = (match.index ?? 0) + leading;
      const saveOffset = /\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)(?: \([^)]*\))? saving throw/iu.exec(span)?.index;
      if (saveOffset === undefined) {
        throw new TypeError(`Gate damage clause has no explicit save position: ${span}`);
      }
      const bodySaveStart = start + saveOffset;
      return {
        span,
        start,
        end: start + span.length,
        save_start: bodySaveStart,
        ability: sourceAbility(span, null),
        success: sourceDerivedSaveSuccess(span, 'gate'),
        fixed_save_dc: sourceFixedSaveDc(span),
        frequency: sourceDamageFrequency(span, body),
        duration: { kind: 'instantaneous' },
        timing_unavailable_reason: null,
        repetitions: sourceDamageRepetitions(body),
        failed_damage_signatures: [],
        damage_occurrences: [],
      };
    }
  }
  return null;
}

function sameSignature(
  left: FailedDamageSignature,
  right: FailedDamageSignature,
): boolean {
  return left.damage_type === right.damage_type &&
    left.dice_count === right.dice_count &&
    left.die_size === right.die_size &&
    left.flat_modifier === right.flat_modifier;
}

function sameClauseOwnership(
  direct: SourceDerivedSaveClause,
  gate: SourceDerivedSaveClause,
): boolean {
  return direct.save_start === gate.save_start &&
    direct.ability === gate.ability &&
    direct.success.status === gate.success.status &&
    gate.failed_damage_signatures.every((signature) =>
      direct.failed_damage_signatures.some((candidate) =>
        sameSignature(signature, candidate),
      ),
    );
}

function broadDamageSaveSuspects(
  heading: string,
  body: string,
): BroadDamageSaveSuspect[] {
  const sentences = [...body.matchAll(/[^.!?]+(?:[.!?]|$)/gu)].map((match) => ({
    text: (match[0] ?? '').trim(),
    start: match.index ?? 0,
    end: (match.index ?? 0) + (match[0]?.length ?? 0),
  }));
  const suspects: BroadDamageSaveSuspect[] = [];
  for (const [index, sentence] of sentences.entries()) {
    if (!/(?:saving throw|\b(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) save\b|attempts? (?:a )?(?:Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) save)/iu.test(sentence.text)) {
      continue;
    }
    const first = Math.max(0, index - 1);
    let last = index;
    while (
      last + 1 < sentences.length &&
      (sentences[last + 1]?.end ?? sentence.end) -
        (sentences[first]?.start ?? sentence.start) <= 1_800
    ) {
      last += 1;
    }
    const window = sentences.slice(first, last + 1);
    const span = window.map((part) => part.text).join(' ');
    if (
      /(?:\d+d\d+|\b\d+\b)[^.]{0,100}?damage|damage[^.]{0,100}?(?:\d+d\d+|\b\d+\b)/iu.test(span) &&
      /(?:fail(?:ed|ure)?|success(?:ful)?|succeed|suffers?|takes?)/iu.test(span)
    ) {
      suspects.push({
        heading,
        span,
        start: window[0]?.start ?? sentence.start,
        end: window.at(-1)?.end ?? sentence.end,
      });
    }
  }
  return suspects;
}

export function deriveSaveDamageCoverage(
  columnSlicedExtract: string,
): DerivedSaveDamageCoverage {
  const bodies = spellDescriptionsByHeading(columnSlicedExtract);
  return deriveSaveDamageCoverageFromBodies(bodies);
}

export function deriveSaveDamageCoverageFromBodies(
  bodies: ReadonlyMap<string, string>,
): DerivedSaveDamageCoverage {
  const clausesByHeading = new Map<string, readonly SourceDerivedSaveClause[]>();
  let rawCount = 0;
  for (const [heading, body] of bodies) {
    const direct = directDamageSaveClauses(body);
    const gate = gateDamageSaveClause(body);
    rawCount += direct.length + (gate === null ? 0 : 1);
    const gateAlreadyOwned = gate !== null && direct.some((clause) =>
      sameClauseOwnership(clause, gate),
    );
    clausesByHeading.set(
      heading,
      gate === null || gateAlreadyOwned
        ? direct
        : [...direct, gate].sort((left, right) => left.start - right.start),
    );
  }
  const candidates = [...clausesByHeading.entries()].flatMap(
    ([heading, clauses]) => clauses.map((clause) =>
      Object.freeze({ heading, ...clause }),
    ),
  );
  return {
    bodies,
    clauses_by_heading: clausesByHeading,
    candidates,
    counts: Object.freeze({
      before_deduplication: rawCount,
      after_deduplication: candidates.length,
    }),
    broad_suspects: [...bodies].flatMap(([heading, body]) =>
      broadDamageSaveSuspects(heading, body),
    ),
  };
}
