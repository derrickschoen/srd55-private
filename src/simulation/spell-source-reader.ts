import type { Ability, DamageType } from '../domain/enums';
import type { SaveSuccessOutcome } from './contracts';

export type FailedDamageSignature = {
  readonly damage_type: DamageType | null;
  readonly dice_count: number | null;
  readonly die_size: number | null;
  readonly flat_modifier: number | null;
};

export type SourceDerivedSaveClause = {
  readonly span: string;
  readonly start: number;
  readonly end: number;
  readonly save_start: number;
  readonly ability: Ability;
  readonly kind: SaveSuccessOutcome['kind'];
  readonly failed_damage_signatures: readonly FailedDamageSignature[];
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
      `Expected complete SRD spell pages 107-175; read ${seenPages.join(', ')}.`,
    );
  }
  return headingsFromReadingOrderLines(readingOrder);
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
  const signatures: FailedDamageSignature[] = [];
  const directlyOwnedDice: { start: number; end: number }[] = [];
  const dicePattern = new RegExp(
    `(\\d+)d(\\d+)(?:\\s*\\+\\s*(\\d+))?[^.]{0,55}?\\b(${DAMAGE_TYPES}) damage`,
    'giu',
  );
  for (const match of span.matchAll(dicePattern)) {
    const start = match.index ?? 0;
    const diceText = `${match[1] ?? ''}d${match[2] ?? ''}`;
    directlyOwnedDice.push({ start, end: start + diceText.length });
    signatures.push({
      dice_count: Number(match[1]),
      die_size: Number(match[2]),
      flat_modifier: match[3] === undefined ? null : Number(match[3]),
      damage_type: match[4] as DamageType,
    });
  }
  const flatPattern = new RegExp(
    `\\b(\\d+) (${DAMAGE_TYPES}) damage`,
    'giu',
  );
  for (const match of span.matchAll(flatPattern)) {
    if (!span.slice(Math.max(0, (match.index ?? 0) - 3), match.index).includes('d')) {
      signatures.push({
        dice_count: null,
        die_size: null,
        flat_modifier: Number(match[1]),
        damage_type: match[2] as DamageType,
      });
    }
  }
  const reverseDicePattern = new RegExp(
    `\\b(${DAMAGE_TYPES}) damage[^.]{0,80}?(\\d+)d(\\d+)(?:\\s*\\+\\s*(\\d+))?`,
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
    signatures.push({
      dice_count: Number(match[2]),
      die_size: Number(match[3]),
      flat_modifier: match[4] === undefined ? null : Number(match[4]),
      damage_type: match[1] as DamageType,
    });
  }
  if (signatures.length === 0 && /\d+d\d+[^.]{0,70}?damage of (?:the|a) [^.]+ type/iu.test(span)) {
    const dice = /(\d+)d(\d+)/u.exec(span);
    signatures.push({
      dice_count: dice === null ? null : Number(dice[1]),
      die_size: dice === null ? null : Number(dice[2]),
      flat_modifier: null,
      damage_type: null,
    });
  }
  if (signatures.length === 0) {
    const dice = /(\d+)d(\d+)[^.]{0,80}?damage/iu.exec(span);
    if (dice !== null) {
      signatures.push({
        dice_count: Number(dice[1]),
        die_size: Number(dice[2]),
        flat_modifier: null,
        damage_type: null,
      });
    }
  }
  return signatures;
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
  const clauses: SourceDerivedSaveClause[] = [];
  let inheritedAbility: Ability | null = null;
  let inheritedDamageSignatures: readonly FailedDamageSignature[] = [];
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
    const kind: SaveSuccessOutcome['kind'] = /half the initial damage only/iu.test(span)
      ? 'sourced_damage'
      : /half (?:as much|the initial) damage|half damage/iu.test(span)
        ? 'half'
        : 'none';
    const signatures = sourceDamageSignatures(directFailureDamageSpan(span));
    const failedDamageSignatures = signatures.length === 0 && repeatsDamage
      ? inheritedDamageSignatures
      : signatures;
    clauses.push({
      span,
      start: start + leading,
      end: start + leading + span.length,
      save_start: match.index ?? start + leading,
      ability: inheritedAbility,
      kind,
      failed_damage_signatures: failedDamageSignatures,
    });
    inheritedDamageSignatures = failedDamageSignatures;
  }
  return clauses;
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
      return {
        span,
        start,
        end: start + span.length,
        save_start: start + saveOffset,
        ability: sourceAbility(span, null),
        kind: 'none',
        failed_damage_signatures: sourceDamageSignatures(span),
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
    direct.kind === gate.kind &&
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
