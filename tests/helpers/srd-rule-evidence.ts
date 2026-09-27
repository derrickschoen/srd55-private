import ts from 'typescript';
import armorTableText from '../../docs/srd/source/armor-table.txt?raw';
import fullSrd from '../../docs/srd/full/srd-5.2.1.txt?raw';
import spellDescriptionsText from '../../docs/srd/source/spell-descriptions.txt?raw';
import weaponsTableText from '../../docs/srd/source/weapons-table.txt?raw';
import { srdReadingOrder, type StreamRow } from '../../scripts/srd/srd-columns';
import { SRD_RULE_INDEX, type SrdRuleId } from '../../src/rules/srd/rule-index';
import type { SrdSpan } from '../../src/rules/srd/rule-index-types';

/**
 * WHAT A RULE STATUS'S EVIDENCE IS CHECKED AGAINST (tests/unit/rules/
 * srd-rule-status.test.ts, srd-owner-rulings.test.ts).
 *
 * - `ruleText`: a rule's printed text, read from its spans in reading order.
 *   A clause quote must be a substring of it.
 * - `uncoveredText`: what of that text no quote, heading or cross-reference
 *   accounts for. A status that claims every clause must leave nothing.
 * - `testAssertions`: the `expect(…)` statements of ONE named test, found by
 *   parsing the test file, with whether that test runs at all.
 * - `declarationText`: the source of one named declaration.
 */

const EXTRACTS: Readonly<Record<string, readonly string[]>> = {
  'docs/srd/source/armor-table.txt': armorTableText.split('\n'),
  'docs/srd/source/spell-descriptions.txt': spellDescriptionsText.split('\n'),
  'docs/srd/source/weapons-table.txt': weaponsTableText.split('\n'),
};

let fullRows: readonly StreamRow[] | null = null;

/** The printed lines of one span, in reading order, each trimmed. */
export function spanLines(span: SrdSpan | string): readonly string[] {
  const match = /^(docs\/srd\/[^:]+):(\d+)-(\d+)(?:@(left|right))?$/.exec(span);
  if (match === null) {
    throw new Error(`Not a span: ${span}`);
  }
  const [, file = '', fromText = '', toText = '', column] = match;
  const from = Number(fromText);
  const to = Number(toText);
  if (file === 'docs/srd/full/srd-5.2.1.txt') {
    fullRows ??= srdReadingOrder(fullSrd);
    return fullRows
      .filter((row) => row.line >= from && row.line <= to && (column === undefined || row.column === column))
      .map((row) => row.text);
  }
  const lines = EXTRACTS[file];
  if (lines === undefined) {
    throw new Error(`No corpus for ${file}`);
  }
  return lines.slice(from - 1, to).map((line) => line.trim()).filter((line) => line !== '');
}

/** Lines joined as prose: a line-end hyphen before a lowercase letter joined, whitespace collapsed. */
export function asProse(lines: readonly string[]): string {
  return lines.join('\n').replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2').replace(/\s+/g, ' ').trim();
}

/** A rule's printed text: its spans in reading order, as prose. */
export function ruleText(id: SrdRuleId): string {
  const entry = SRD_RULE_INDEX[id] as { readonly spans: readonly SrdSpan[] };
  return asProse(entry.spans.flatMap((span) => spanLines(span)));
}

function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * What of a rule's text is left once its quotes are taken out, with the parts
 * that are not clauses removed first: the heading (the printed name and any
 * glossary tag), the "See also …" cross-references, and a condition's
 * "While you have the X condition, you experience the following effect(s)."
 * What remains after punctuation and the connectives `and`, `or`, `but` are
 * dropped is text no clause accounts for; it must be empty.
 */
export function uncoveredText(id: SrdRuleId, quotes: readonly string[]): string {
  const { name } = SRD_RULE_INDEX[id] as { readonly name: string };
  let rest = ruleText(id)
    .replace(new RegExp(`^${escaped(name)}(?: \\[[A-Za-z ]+\\])? `), ' ')
    .replace(/See also .*?(?:\)\.|\.”|[^”)]\.)(?=\s|$)/g, ' ')
    .replace(/While you have the [A-Z][a-z]+ condition, you experience the following effects?\./, ' ');
  for (const quote of quotes) {
    rest = rest.split(quote).join(' ');
  }
  return rest.replace(/\b(?:and|or|but)\b/g, ' ').replace(/[\s.,;:—–-]+/g, ' ').trim();
}

/* ==========================================================================
 * SOURCE: tests and declarations, parsed rather than grepped
 * ========================================================================== */

/**
 * Source text without whitespace, trailing commas or a final semicolon, so a
 * quotation may be re-wrapped and re-formatted freely.
 */
export function compact(text: string): string {
  return text.replace(/\s+/g, '').replace(/,([)\]}])/g, '$1').replace(/;$/, '');
}

const TEST_FUNCTIONS = new Set(['it', 'test']);
const NOT_RUN = new Set(['skip', 'todo']);

/** `it`, `it.each(…)`, `it.skip`: the base name and the modifiers of a call's callee. */
function calleeParts(callee: ts.Expression): { readonly base: string | null; readonly modifiers: readonly string[] } {
  if (ts.isIdentifier(callee)) {
    return { base: callee.text, modifiers: [] };
  }
  if (ts.isPropertyAccessExpression(callee)) {
    const inner = calleeParts(callee.expression);
    return { base: inner.base, modifiers: [...inner.modifiers, callee.name.text] };
  }
  if (ts.isCallExpression(callee)) {
    // `it.each(table)(title, fn)`: the callee is itself a call.
    return calleeParts(callee.expression);
  }
  return { base: null, modifiers: [] };
}

function literalText(node: ts.Node | undefined): string | null {
  return node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;
}

export interface TestAssertions {
  /** The file declares a test with exactly this title. */
  readonly found: boolean;
  /** The test runs: neither it nor an enclosing `describe` is `.skip` or `.todo`. */
  readonly runs: boolean;
  /** Its own `expect(…)` statements, compacted. */
  readonly expects: readonly string[];
}

/** The assertions of the test titled `title` in `source` (a test file's text). */
export function testAssertions(source: string, title: string): TestAssertions {
  const file = ts.createSourceFile('witness.test.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let result: TestAssertions = { found: false, runs: false, expects: [] };
  const visit = (node: ts.Node, skipped: boolean): void => {
    if (ts.isCallExpression(node)) {
      const { base, modifiers } = calleeParts(node.expression);
      const notRun = modifiers.some((modifier) => NOT_RUN.has(modifier));
      if (base !== null && TEST_FUNCTIONS.has(base) && literalText(node.arguments[0]) === title) {
        const body = node.arguments[1];
        const expects: string[] = [];
        const collect = (inner: ts.Node): void => {
          if (ts.isExpressionStatement(inner) && compact(inner.expression.getText(file)).startsWith('expect(')) {
            expects.push(compact(inner.expression.getText(file)));
          }
          ts.forEachChild(inner, collect);
        };
        if (body !== undefined) {
          collect(body);
        }
        result = { found: true, runs: !skipped && !notRun, expects };
        return;
      }
      if (base === 'describe') {
        ts.forEachChild(node, (child) => visit(child, skipped || notRun));
        return;
      }
    }
    ts.forEachChild(node, (child) => visit(child, skipped));
  };
  visit(file, false);
  return result;
}

/**
 * A POSITIVE assertion: an `expect(…)` statement that states something holds,
 * not that it does not. A negated matcher, or a comparison with false, empty
 * or nothing, proves an absence and cannot witness an effect.
 */
export function isPositiveAssertion(statement: string): boolean {
  const text = compact(statement);
  return text.startsWith('expect(')
    && !text.includes('.not.')
    && !/\.(?:toBe\(false\)|toBeFalsy\(\)|toBeUndefined\(\)|toBeNull\(\)|toHaveLength\(0\)|toEqual\(\[\]\)|toEqual\(\{\}\))$/.test(text);
}

/** The source text of the top-level declaration named `name`, or null. */
export function declarationText(source: string, name: string): string | null {
  const file = ts.createSourceFile('declaration.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const statement of file.statements) {
    if (
      (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)
        || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
        || ts.isEnumDeclaration(statement))
      && statement.name?.text === name
    ) {
      return statement.getText(file);
    }
    if (ts.isVariableStatement(statement)
      && statement.declarationList.declarations.some((declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === name)) {
      return statement.getText(file);
    }
  }
  return null;
}
