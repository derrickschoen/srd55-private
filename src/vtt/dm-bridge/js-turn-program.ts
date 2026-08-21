import { gridDistance } from '../../combat/grid';
import type { DmVisibleCombatant, DmVisibleEncounterState } from '../../combat/visibility';
import type { CombatantId } from '../../combat/values';
import type {
  DecisionProgram,
  StandingConditionalRider,
} from './round-plan-contract';
import {
  TURN_PROGRAM_LIBRARY_DOC,
  expandTurnProgramLibraryCall,
} from './turn-program-library';

export const JS_TURN_PROGRAM_GRAMMAR = String.raw`program     ::= statement*
statement   ::= "const" identifier "=" expression ";"
              | "if" "(" expression ")" block ("else" (block | ifStatement))?
              | "for" "(" "const" identifier "of" apiArrayCall ")" block
              | apiCall ";"
block       ::= "{" statement* "}"
expression  ::= literal | identifier | array | object | apiCall | "(" expression ")"
              | ("!" | "+" | "-") expression
              | expression ("*" | "/" | "%" | "+" | "-" | "<" | "<=" | ">" | ">="
                | "===" | "!==" | "&&" | "||") expression
array       ::= "[" (expression ("," expression)*)? "]"
object      ::= "{" (property ":" expression ("," property ":" expression)*)? "}"
apiCall     ::= identifier "(" (expression ("," expression)*)? ")"
apiArrayCall::= ("alliesWithin" | "enemiesWithin") "(" expression ")"

Only const declarations, braced if/else, for-of over alliesWithin/enemiesWithin,
and calls to the documented API are accepted. Programs emit one plan with emit(...).
API: nearestEnemy(), lowestHp([combatants]), alliesWithin(feet), enemiesWithin(feet),
hpPercent(combatant), distanceTo(combatant), attack(combatant), bonusAttack(combatant), forceSave(combatant),
move(combatant), retreat(column,row), dash(), disengage(), dodge(), endTurn(),
actionSurge(), priority(program,...), emit(program). attack(combatant, riderOnCrit(action)) attaches
a fixed conditional follow-up. Cell selectors are strict {column, row} objects.
No ambient JavaScript objects are available.

${TURN_PROGRAM_LIBRARY_DOC}`;

export const JS_TURN_PROGRAM_CANONICAL_EXAMPLE = `const target = nearestEnemy();
if (target !== null) {
  emit(priority(attack(target), move(target), endTurn()));
} else {
  emit(endTurn());
}`;

export const DEFAULT_JS_TURN_PROGRAM_STEP_BUDGET = 10_000 as const;
export const DEFAULT_JS_TURN_PROGRAM_TIME_BUDGET_MS = 25 as const;

export class JsTurnProgramSyntaxError extends SyntaxError {
  override readonly name = 'JsTurnProgramSyntaxError' as const;
}

export class JsTurnProgramRuntimeError extends Error {
  override readonly name = 'JsTurnProgramRuntimeError' as const;
}

export class JsTurnProgramBudgetError extends Error {
  override readonly name = 'JsTurnProgramBudgetError' as const;
}

type TokenKind = 'identifier' | 'number' | 'string' | 'punctuation' | 'operator' | 'keyword' | 'eof';

interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly value?: string | number;
  readonly line: number;
  readonly column: number;
}

export type JsTurnProgramStatement =
  | { readonly kind: 'const'; readonly name: string; readonly value: JsTurnProgramExpression }
  | {
      readonly kind: 'if';
      readonly condition: JsTurnProgramExpression;
      readonly then: readonly JsTurnProgramStatement[];
      readonly else: readonly JsTurnProgramStatement[];
    }
  | {
      readonly kind: 'for_of';
      readonly name: string;
      readonly values: JsTurnProgramCallExpression;
      readonly body: readonly JsTurnProgramStatement[];
    }
  | { readonly kind: 'expression'; readonly expression: JsTurnProgramCallExpression };

export type JsTurnProgramExpression =
  | { readonly kind: 'literal'; readonly value: string | number | boolean | null }
  | { readonly kind: 'identifier'; readonly name: string }
  | { readonly kind: 'array'; readonly elements: readonly JsTurnProgramExpression[] }
  | { readonly kind: 'object'; readonly entries: readonly { readonly key: string; readonly value: JsTurnProgramExpression }[] }
  | JsTurnProgramCallExpression
  | { readonly kind: 'unary'; readonly operator: '!' | '+' | '-'; readonly operand: JsTurnProgramExpression }
  | {
      readonly kind: 'binary';
      readonly operator: '*' | '/' | '%' | '+' | '-' | '<' | '<=' | '>' | '>=' | '===' | '!==' | '&&' | '||';
      readonly left: JsTurnProgramExpression;
      readonly right: JsTurnProgramExpression;
    };

export interface JsTurnProgramCallExpression {
  readonly kind: 'call';
  readonly callee: string;
  readonly arguments: readonly JsTurnProgramExpression[];
}

export interface JsTurnProgramAst {
  readonly kind: 'program';
  readonly statements: readonly JsTurnProgramStatement[];
}

const KEYWORDS = new Set(['const', 'if', 'else', 'for', 'of', 'true', 'false', 'null']);
const FORBIDDEN_KEYWORDS = new Map<string, string>([
  ['while', 'while loop'], ['do', 'do-while loop'], ['function', 'function declaration'],
  ['this', 'this'], ['class', 'class declaration'], ['import', 'import'], ['export', 'export'],
  ['try', 'try statement'], ['catch', 'catch clause'], ['finally', 'finally clause'],
  ['throw', 'throw statement'], ['new', 'object construction'], ['return', 'return statement'],
  ['let', 'let declaration'], ['var', 'var declaration'], ['switch', 'switch statement'],
  ['break', 'break statement'], ['continue', 'continue statement'], ['async', 'async function'],
  ['await', 'await'], ['yield', 'yield'], ['delete', 'delete'], ['typeof', 'typeof'],
  ['instanceof', 'instanceof'], ['in', 'in operator'], ['with', 'with statement'],
  ['debugger', 'debugger statement'],
]);
const FORBIDDEN_GLOBALS = new Set([
  'Date', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'RegExp',
  'Promise', 'Reflect', 'Proxy', 'Intl', 'globalThis', 'window', 'document', 'process',
  'console', 'eval', 'Function', 'setTimeout', 'setInterval', 'fetch', 'crypto',
]);
const FORBIDDEN_PROPERTIES = new Set(['prototype', '__proto__', 'constructor']);

function location(token: Token): string {
  return `line ${String(token.line)}, column ${String(token.column)}`;
}

function syntax(message: string, token: Token): never {
  throw new JsTurnProgramSyntaxError(`${message} at ${location(token)}.`);
}

function tokenize(source: string): readonly Token[] {
  const tokens: Token[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;
  const current = (): string => source[offset] ?? '';
  const advance = (): string => {
    const character = source[offset] ?? '';
    offset += 1;
    if (character === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  };
  const push = (kind: TokenKind, text: string, tokenLine: number, tokenColumn: number, value?: string | number): void => {
    tokens.push(value === undefined
      ? { kind, text, line: tokenLine, column: tokenColumn }
      : { kind, text, value, line: tokenLine, column: tokenColumn });
  };

  while (offset < source.length) {
    if (/\s/u.test(current())) {
      advance();
      continue;
    }
    const tokenLine = line;
    const tokenColumn = column;
    const character = current();
    if (character === '/' && source[offset + 1] === '/') {
      syntax('Comments are forbidden', { kind: 'punctuation', text: '//', line, column });
    }
    if (character === '/' && source[offset + 1] === '*') {
      syntax('Comments are forbidden', { kind: 'punctuation', text: '/*', line, column });
    }
    if (/[A-Za-z_$]/u.test(character)) {
      let text = '';
      while (/[A-Za-z0-9_$]/u.test(current())) text += advance();
      const forbidden = FORBIDDEN_KEYWORDS.get(text);
      if (forbidden !== undefined) syntax(`Forbidden construct "${forbidden}"`, {
        kind: 'keyword', text, line: tokenLine, column: tokenColumn,
      });
      if (FORBIDDEN_GLOBALS.has(text)) syntax(`Forbidden global "${text}"`, {
        kind: 'identifier', text, line: tokenLine, column: tokenColumn,
      });
      if (FORBIDDEN_PROPERTIES.has(text)) syntax(`Forbidden prototype property "${text}"`, {
        kind: 'identifier', text, line: tokenLine, column: tokenColumn,
      });
      push(KEYWORDS.has(text) ? 'keyword' : 'identifier', text, tokenLine, tokenColumn);
      continue;
    }
    if (/[0-9]/u.test(character)) {
      let text = '';
      while (/[0-9]/u.test(current())) text += advance();
      if (current() === '.') {
        text += advance();
        if (!/[0-9]/u.test(current())) syntax('Number requires digits after the decimal point', {
          kind: 'number', text, line: tokenLine, column: tokenColumn,
        });
        while (/[0-9]/u.test(current())) text += advance();
      }
      const value = Number(text);
      if (!Number.isFinite(value)) syntax('Number must be finite', {
        kind: 'number', text, line: tokenLine, column: tokenColumn,
      });
      push('number', text, tokenLine, tokenColumn, value);
      continue;
    }
    if (character === '"' || character === "'") {
      const quote = advance();
      let text = quote;
      let value = '';
      while (current() !== quote) {
        if (current() === '' || current() === '\n' || current() === '\r') {
          syntax('Unterminated string literal', { kind: 'string', text, line: tokenLine, column: tokenColumn });
        }
        const next = advance();
        text += next;
        if (next === '\\') {
          const escaped = advance();
          text += escaped;
          const decoded = new Map([['n', '\n'], ['r', '\r'], ['t', '\t'], ['\\', '\\'], ['"', '"'], ["'", "'"]]).get(escaped);
          if (decoded === undefined) syntax(`Unsupported string escape "\\${escaped}"`, {
            kind: 'string', text, line: tokenLine, column: tokenColumn,
          });
          value += decoded;
        } else {
          value += next;
        }
      }
      text += advance();
      push('string', text, tokenLine, tokenColumn, value);
      continue;
    }
    if (character === '`') syntax('Forbidden construct "template literal"', {
      kind: 'string', text: character, line, column,
    });
    const three = source.slice(offset, offset + 3);
    if (three === '===' || three === '!==') {
      advance(); advance(); advance();
      push('operator', three, tokenLine, tokenColumn);
      continue;
    }
    const two = source.slice(offset, offset + 2);
    if (two === '=>') syntax('Forbidden construct "arrow function"', {
      kind: 'operator', text: two, line, column,
    });
    if (two === '==' || two === '!=') syntax(`Loose operator "${two}" is forbidden`, {
      kind: 'operator', text: two, line, column,
    });
    if (['<=', '>=', '&&', '||'].includes(two)) {
      advance(); advance();
      push('operator', two, tokenLine, tokenColumn);
      continue;
    }
    if (character === '.') syntax('Member access is forbidden', {
      kind: 'punctuation', text: character, line, column,
    });
    if (character === '/') {
      const previous = tokens.at(-1);
      const closesExpression = previous !== undefined && (
        previous.kind === 'identifier' || previous.kind === 'number' || previous.kind === 'string' ||
        previous.text === ')' || previous.text === ']' || previous.text === 'true' ||
        previous.text === 'false' || previous.text === 'null'
      );
      if (!closesExpression) syntax('Forbidden construct "regular expression"', {
        kind: 'operator', text: character, line, column,
      });
    }
    if ('(){}[],:;'.includes(character)) {
      advance();
      push('punctuation', character, tokenLine, tokenColumn);
      continue;
    }
    if ('+-*/%<>!='.includes(character)) {
      advance();
      push('operator', character, tokenLine, tokenColumn);
      continue;
    }
    syntax(`Unexpected character "${character}"`, {
      kind: 'punctuation', text: character, line, column,
    });
  }
  tokens.push({ kind: 'eof', text: '<eof>', line, column });
  return tokens;
}

const PRECEDENCE: Readonly<Record<string, number>> = {
  '||': 1, '&&': 2, '===': 3, '!==': 3,
  '<': 4, '<=': 4, '>': 4, '>=': 4,
  '+': 5, '-': 5, '*': 6, '/': 6, '%': 6,
};

class Parser {
  #index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parse(): JsTurnProgramAst {
    const statements: JsTurnProgramStatement[] = [];
    while (!this.#at('<eof>')) statements.push(this.#statement());
    return { kind: 'program', statements };
  }

  #token(): Token {
    return this.tokens[this.#index] ?? this.tokens[this.tokens.length - 1]!;
  }

  #at(text: string): boolean {
    return this.#token().text === text;
  }

  #take(text: string): Token {
    const token = this.#token();
    if (token.text !== text) syntax(`Expected "${text}" but found "${token.text}"`, token);
    this.#index += 1;
    return token;
  }

  #takeIdentifier(label = 'identifier'): string {
    const token = this.#token();
    if (token.kind !== 'identifier') syntax(`Expected ${label} but found "${token.text}"`, token);
    this.#index += 1;
    return token.text;
  }

  #statement(): JsTurnProgramStatement {
    if (this.#at('const')) return this.#constStatement();
    if (this.#at('if')) return this.#ifStatement();
    if (this.#at('for')) return this.#forStatement();
    const expression = this.#expression();
    if (expression.kind !== 'call') syntax('Only API calls may be expression statements', this.#token());
    this.#take(';');
    return { kind: 'expression', expression };
  }

  #constStatement(): JsTurnProgramStatement {
    this.#take('const');
    const name = this.#takeIdentifier('const binding name');
    this.#take('=');
    const value = this.#expression();
    this.#take(';');
    return { kind: 'const', name, value };
  }

  #ifStatement(): Extract<JsTurnProgramStatement, { readonly kind: 'if' }> {
    this.#take('if');
    this.#take('(');
    const condition = this.#expression();
    this.#take(')');
    const then = this.#block();
    let otherwise: readonly JsTurnProgramStatement[] = [];
    if (this.#at('else')) {
      this.#take('else');
      otherwise = this.#at('if') ? [this.#ifStatement()] : this.#block();
    }
    return { kind: 'if', condition, then, else: otherwise };
  }

  #forStatement(): JsTurnProgramStatement {
    this.#take('for');
    this.#take('(');
    this.#take('const');
    const name = this.#takeIdentifier('for-of binding name');
    this.#take('of');
    const values = this.#expression();
    if (values.kind !== 'call' || (values.callee !== 'alliesWithin' && values.callee !== 'enemiesWithin')) {
      syntax('For-of accepts only alliesWithin(...) or enemiesWithin(...)', this.#token());
    }
    this.#take(')');
    return { kind: 'for_of', name, values, body: this.#block() };
  }

  #block(): readonly JsTurnProgramStatement[] {
    this.#take('{');
    const statements: JsTurnProgramStatement[] = [];
    while (!this.#at('}')) {
      if (this.#at('<eof>')) syntax('Unterminated block', this.#token());
      statements.push(this.#statement());
    }
    this.#take('}');
    return statements;
  }

  #expression(minimumPrecedence = 0): JsTurnProgramExpression {
    let left = this.#unary();
    while (true) {
      const token = this.#token();
      if (token.text === '=') syntax('Assignment is forbidden', token);
      const precedence = PRECEDENCE[token.text];
      if (precedence === undefined || precedence < minimumPrecedence) break;
      this.#index += 1;
      const right = this.#expression(precedence + 1);
      left = {
        kind: 'binary',
        operator: token.text as Extract<JsTurnProgramExpression, { readonly kind: 'binary' }>['operator'],
        left,
        right,
      };
    }
    return left;
  }

  #unary(): JsTurnProgramExpression {
    const token = this.#token();
    if (token.text === '!' || token.text === '+' || token.text === '-') {
      this.#index += 1;
      return { kind: 'unary', operator: token.text, operand: this.#unary() };
    }
    return this.#primary();
  }

  #primary(): JsTurnProgramExpression {
    const token = this.#token();
    if (token.kind === 'number' || token.kind === 'string') {
      this.#index += 1;
      return { kind: 'literal', value: token.value! };
    }
    if (token.text === 'true' || token.text === 'false' || token.text === 'null') {
      this.#index += 1;
      return { kind: 'literal', value: token.text === 'null' ? null : token.text === 'true' };
    }
    if (token.kind === 'identifier') {
      this.#index += 1;
      if (!this.#at('(')) return { kind: 'identifier', name: token.text };
      this.#take('(');
      const args = this.#commaSeparated(')', () => this.#expression());
      this.#take(')');
      return { kind: 'call', callee: token.text, arguments: args };
    }
    if (this.#at('(')) {
      this.#take('(');
      const expression = this.#expression();
      this.#take(')');
      return expression;
    }
    if (this.#at('[')) {
      this.#take('[');
      const elements = this.#commaSeparated(']', () => this.#expression());
      this.#take(']');
      return { kind: 'array', elements };
    }
    if (this.#at('{')) {
      this.#take('{');
      const entries: Array<{ readonly key: string; readonly value: JsTurnProgramExpression }> = [];
      while (!this.#at('}')) {
        const keyToken = this.#token();
        if (keyToken.kind !== 'identifier' && keyToken.kind !== 'string') {
          syntax('Object property must be an identifier or string', keyToken);
        }
        this.#index += 1;
        const key = keyToken.kind === 'string' ? String(keyToken.value) : keyToken.text;
        if (FORBIDDEN_PROPERTIES.has(key)) syntax(`Forbidden prototype property "${key}"`, keyToken);
        this.#take(':');
        entries.push({ key, value: this.#expression() });
        if (this.#at('}')) break;
        this.#take(',');
      }
      this.#take('}');
      return { kind: 'object', entries };
    }
    syntax(`Expected expression but found "${token.text}"`, token);
  }

  #commaSeparated<T>(end: string, parse: () => T): readonly T[] {
    const values: T[] = [];
    while (!this.#at(end)) {
      values.push(parse());
      if (this.#at(end)) break;
      this.#take(',');
    }
    return values;
  }
}

export function parseJsTurnProgram(source: string): JsTurnProgramAst {
  return new Parser(tokenize(source)).parse();
}

const COMBATANT_REFERENCE = Symbol('combatant-reference');
const DECISION_PROGRAM_VALUE = Symbol('decision-program-value');
const STANDING_RIDER_VALUE = Symbol('standing-rider-value');

interface CombatantReference {
  readonly [COMBATANT_REFERENCE]: true;
  readonly id: CombatantId;
}

interface DecisionProgramValue {
  readonly [DECISION_PROGRAM_VALUE]: true;
  readonly program: DecisionProgram;
}

interface StandingRiderValue {
  readonly [STANDING_RIDER_VALUE]: true;
  readonly rider: StandingConditionalRider;
}

interface RuntimeArray extends ReadonlyArray<RuntimeValue> {}

interface RuntimeObject {
  readonly [key: string]: RuntimeValue;
}

type RuntimeValue =
  | string | number | boolean | null
  | CombatantReference
  | DecisionProgramValue
  | StandingRiderValue
  | RuntimeArray
  | RuntimeObject;

interface Scope {
  readonly parent: Scope | null;
  readonly bindings: Map<string, RuntimeValue>;
}

export interface JsTurnProgramLimits {
  readonly stepBudget?: number;
  readonly timeBudgetMs?: number;
  readonly now?: () => number;
}

export interface JsTurnProgramExecution {
  readonly source: string;
  readonly emittedDecisionProgram: DecisionProgram;
  readonly steps: number;
}

class Interpreter {
  readonly #actor: DmVisibleCombatant;
  readonly #startedAt: number;
  readonly #now: () => number;
  readonly #stepBudget: number;
  readonly #timeBudgetMs: number;
  readonly #emitted: DecisionProgram[] = [];
  #steps = 0;

  constructor(
    private readonly state: DmVisibleEncounterState,
    actorId: CombatantId,
    limits: JsTurnProgramLimits,
  ) {
    const actor = state.combatants.find((candidate) => candidate.id === actorId);
    if (actor === undefined) throw new JsTurnProgramRuntimeError(`Actor ${actorId} is outside the DM projection.`);
    this.#actor = actor;
    this.#stepBudget = limits.stepBudget ?? DEFAULT_JS_TURN_PROGRAM_STEP_BUDGET;
    this.#timeBudgetMs = limits.timeBudgetMs ?? DEFAULT_JS_TURN_PROGRAM_TIME_BUDGET_MS;
    this.#now = limits.now ?? (() => performance.now());
    if (!Number.isSafeInteger(this.#stepBudget) || this.#stepBudget <= 0) {
      throw new TypeError('JS turn-program step budget must be a positive safe integer.');
    }
    if (!Number.isFinite(this.#timeBudgetMs) || this.#timeBudgetMs < 0) {
      throw new TypeError('JS turn-program time budget must be a non-negative finite number.');
    }
    this.#startedAt = this.#now();
  }

  execute(ast: JsTurnProgramAst, source: string): JsTurnProgramExecution {
    this.#statements(ast.statements, { parent: null, bindings: new Map() });
    if (this.#emitted.length !== 1) {
      throw new JsTurnProgramRuntimeError(
        `JS turn-program must emit exactly one DecisionProgram; received ${String(this.#emitted.length)}.`,
      );
    }
    return { source, emittedDecisionProgram: this.#emitted[0]!, steps: this.#steps };
  }

  #step(): void {
    this.#steps += 1;
    if (this.#steps > this.#stepBudget) {
      throw new JsTurnProgramBudgetError(`JS turn-program exceeded step budget ${String(this.#stepBudget)}.`);
    }
    if (this.#now() - this.#startedAt > this.#timeBudgetMs) {
      throw new JsTurnProgramBudgetError(`JS turn-program exceeded time budget ${String(this.#timeBudgetMs)}ms.`);
    }
  }

  #statements(statements: readonly JsTurnProgramStatement[], scope: Scope): void {
    for (const statement of statements) this.#statement(statement, scope);
  }

  #statement(statement: JsTurnProgramStatement, scope: Scope): void {
    this.#step();
    switch (statement.kind) {
      case 'const': {
        if (scope.bindings.has(statement.name)) {
          throw new JsTurnProgramRuntimeError(`Const binding "${statement.name}" is already declared in this scope.`);
        }
        scope.bindings.set(statement.name, this.#expression(statement.value, scope));
        return;
      }
      case 'if': {
        const condition = this.#expression(statement.condition, scope);
        if (typeof condition !== 'boolean') throw new JsTurnProgramRuntimeError('If condition must be boolean.');
        this.#statements(condition ? statement.then : statement.else, { parent: scope, bindings: new Map() });
        return;
      }
      case 'for_of': {
        const values = this.#expression(statement.values, scope);
        if (!Array.isArray(values)) throw new JsTurnProgramRuntimeError('For-of API call must return an array.');
        for (const value of values) {
          this.#step();
          const child: Scope = { parent: scope, bindings: new Map([[statement.name, value]]) };
          this.#statements(statement.body, child);
        }
        return;
      }
      case 'expression':
        this.#expression(statement.expression, scope);
        return;
    }
  }

  #expression(expression: JsTurnProgramExpression, scope: Scope): RuntimeValue {
    this.#step();
    switch (expression.kind) {
      case 'literal': return expression.value;
      case 'identifier': return this.#binding(expression.name, scope);
      case 'array': return expression.elements.map((element) => this.#expression(element, scope));
      case 'object': return Object.fromEntries(expression.entries.map(
        (entry) => [entry.key, this.#expression(entry.value, scope)],
      ));
      case 'call': return this.#call(expression, scope);
      case 'unary': return this.#unary(expression.operator, this.#expression(expression.operand, scope));
      case 'binary': return this.#binary(expression, scope);
    }
  }

  #binding(name: string, scope: Scope): RuntimeValue {
    let candidate: Scope | null = scope;
    while (candidate !== null) {
      const value = candidate.bindings.get(name);
      if (value !== undefined || candidate.bindings.has(name)) return value!;
      candidate = candidate.parent;
    }
    throw new JsTurnProgramRuntimeError(`Unknown identifier "${name}".`);
  }

  #unary(operator: '!' | '+' | '-', value: RuntimeValue): RuntimeValue {
    if (operator === '!') {
      if (typeof value !== 'boolean') throw new JsTurnProgramRuntimeError('Logical not requires a boolean.');
      return !value;
    }
    if (typeof value !== 'number') throw new JsTurnProgramRuntimeError(`Unary ${operator} requires a number.`);
    return operator === '-' ? -value : value;
  }

  #binary(
    expression: Extract<JsTurnProgramExpression, { readonly kind: 'binary' }>,
    scope: Scope,
  ): RuntimeValue {
    const left = this.#expression(expression.left, scope);
    if (expression.operator === '&&' || expression.operator === '||') {
      if (typeof left !== 'boolean') throw new JsTurnProgramRuntimeError(`Operator ${expression.operator} requires booleans.`);
      if (expression.operator === '&&' && !left) return false;
      if (expression.operator === '||' && left) return true;
      const right = this.#expression(expression.right, scope);
      if (typeof right !== 'boolean') throw new JsTurnProgramRuntimeError(`Operator ${expression.operator} requires booleans.`);
      return right;
    }
    const right = this.#expression(expression.right, scope);
    if (expression.operator === '===' || expression.operator === '!==') {
      const equal = this.#equal(left, right);
      return expression.operator === '===' ? equal : !equal;
    }
    if (typeof left !== 'number' || typeof right !== 'number') {
      throw new JsTurnProgramRuntimeError(`Operator ${expression.operator} requires numbers.`);
    }
    switch (expression.operator) {
      case '+': return this.#finite(left + right, '+');
      case '-': return this.#finite(left - right, '-');
      case '*': return this.#finite(left * right, '*');
      case '/':
        if (right === 0) throw new JsTurnProgramRuntimeError('Division by zero is forbidden.');
        return this.#finite(left / right, '/');
      case '%':
        if (right === 0) throw new JsTurnProgramRuntimeError('Remainder by zero is forbidden.');
        return this.#finite(left % right, '%');
      case '<': return left < right;
      case '<=': return left <= right;
      case '>': return left > right;
      case '>=': return left >= right;
    }
  }

  #equal(left: RuntimeValue, right: RuntimeValue): boolean {
    if (this.#combatantReference(left) && this.#combatantReference(right)) return left.id === right.id;
    if (left === null || right === null) return left === right;
    if (typeof left === 'object' || typeof right === 'object') {
      throw new JsTurnProgramRuntimeError('Strict equality supports only primitives and combatant references.');
    }
    return left === right;
  }

  #finite(value: number, operator: string): number {
    if (!Number.isFinite(value)) throw new JsTurnProgramRuntimeError(`Operator ${operator} produced a non-finite number.`);
    return value;
  }

  #call(expression: JsTurnProgramCallExpression, scope: Scope): RuntimeValue {
    const args = expression.arguments.map((argument) => this.#expression(argument, scope));
    const libraryExpansion = expandTurnProgramLibraryCall(expression.callee, args, {
      actorId: this.#actor.id,
      target: (value, api) => {
        const selected = this.#subject(value as RuntimeValue | undefined, api);
        return {
          selector: { kind: 'combatant', combatantId: selected.id },
          combatantId: selected.id,
        };
      },
      cell: (value, api) => this.#cell(value as RuntimeValue | undefined, api),
      number: (value, label) => this.#number(value as RuntimeValue | undefined, label),
      action: (value, api) => {
        const program = this.#program(value as RuntimeValue | undefined, api);
        if (program.kind !== 'action') {
          throw new JsTurnProgramRuntimeError(`${api} followUpAction must be an action.`);
        }
        return program.action;
      },
    });
    if (libraryExpansion?.kind === 'program') return this.#programValue(libraryExpansion.program);
    if (libraryExpansion?.kind === 'rider') return this.#riderValue(libraryExpansion.rider);
    switch (expression.callee) {
      case 'nearestEnemy':
        this.#arity(expression.callee, args, 0);
        return this.#nearest(this.#enemies());
      case 'lowestHp': {
        if (args.length > 1) this.#arity(expression.callee, args, 1);
        const candidates = args.length === 0 ? this.#enemies() : this.#combatantArray(args[0], 'lowestHp');
        const selected = [...candidates].sort((left, right) =>
          left.hitPoints / left.rules.hitPointMaximum - right.hitPoints / right.rules.hitPointMaximum ||
          left.id.localeCompare(right.id),
        )[0];
        return selected === undefined ? null : this.#reference(selected);
      }
      case 'alliesWithin': return this.#within(args, true);
      case 'enemiesWithin': return this.#within(args, false);
      case 'hpPercent': {
        this.#arity(expression.callee, args, 1);
        const subject = this.#subject(args[0], 'hpPercent');
        return subject.hitPoints * 100 / subject.rules.hitPointMaximum;
      }
      case 'distanceTo': {
        this.#arity(expression.callee, args, 1);
        return gridDistance(this.#actor.position, this.#subject(args[0], 'distanceTo').position);
      }
      case 'attack': return this.#attack(args);
      case 'bonusAttack': return this.#targetAction(expression.callee, args, 'bonus_attack');
      case 'forceSave': return this.#targetAction(expression.callee, args, 'force_save');
      case 'move': return this.#targetAction(expression.callee, args, 'move_toward');
      case 'retreat': {
        this.#arity(expression.callee, args, 2);
        return this.#programValue({
          kind: 'action',
          action: {
            kind: 'retreat_toward',
            destination: {
              column: this.#number(args[0], 'retreat column'),
              row: this.#number(args[1], 'retreat row'),
            },
          },
        });
      }
      case 'dash': return this.#useAction(expression.callee, args, 'dash');
      case 'disengage': return this.#useAction(expression.callee, args, 'disengage');
      case 'dodge': return this.#useAction(expression.callee, args, 'dodge');
      case 'actionSurge': return this.#useAction(expression.callee, args, 'action_surge');
      case 'endTurn': return this.#useAction(expression.callee, args, 'end_turn');
      case 'priority': {
        const choices = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        if (choices.length === 0) throw new JsTurnProgramRuntimeError('priority requires at least one program.');
        return this.#programValue({
          kind: 'priority',
          choices: choices.map((choice) => this.#program(choice, 'priority')),
        });
      }
      case 'emit': {
        this.#arity(expression.callee, args, 1);
        const program = this.#program(args[0], 'emit');
        this.#emitted.push(program);
        return this.#programValue(program);
      }
      default:
        throw new JsTurnProgramRuntimeError(`Unknown API function "${expression.callee}".`);
    }
  }

  #enemies(): readonly DmVisibleCombatant[] {
    return this.state.combatants.filter(
      (candidate) => candidate.kind !== this.#actor.kind && candidate.life !== 'dead',
    );
  }

  #allies(): readonly DmVisibleCombatant[] {
    return this.state.combatants.filter(
      (candidate) => candidate.kind === this.#actor.kind && candidate.life !== 'dead' && candidate.id !== this.#actor.id,
    );
  }

  #nearest(candidates: readonly DmVisibleCombatant[]): CombatantReference | null {
    const selected = [...candidates].sort((left, right) =>
      gridDistance(this.#actor.position, left.position) - gridDistance(this.#actor.position, right.position) ||
      left.id.localeCompare(right.id),
    )[0];
    return selected === undefined ? null : this.#reference(selected);
  }

  #within(args: readonly RuntimeValue[], allies: boolean): readonly CombatantReference[] {
    this.#arity(allies ? 'alliesWithin' : 'enemiesWithin', args, 1);
    const feet = this.#number(args[0], 'distance');
    if (feet < 0) throw new JsTurnProgramRuntimeError('Distance must be non-negative.');
    return (allies ? this.#allies() : this.#enemies())
      .filter((candidate) => gridDistance(this.#actor.position, candidate.position) <= feet)
      .sort((left, right) =>
        gridDistance(this.#actor.position, left.position) - gridDistance(this.#actor.position, right.position) ||
        left.id.localeCompare(right.id),
      )
      .map((candidate) => this.#reference(candidate));
  }

  #reference(subject: DmVisibleCombatant): CombatantReference {
    return Object.freeze({ [COMBATANT_REFERENCE]: true as const, id: subject.id });
  }

  #combatantReference(value: RuntimeValue | undefined): value is CombatantReference {
    return typeof value === 'object' && value !== null && !Array.isArray(value) &&
      COMBATANT_REFERENCE in value && value[COMBATANT_REFERENCE] === true && 'id' in value;
  }

  #subject(value: RuntimeValue | undefined, api: string): DmVisibleCombatant {
    if (!this.#combatantReference(value)) throw new JsTurnProgramRuntimeError(`${api} requires a combatant reference.`);
    const subject = this.state.combatants.find((candidate) => candidate.id === value.id);
    if (subject === undefined) throw new JsTurnProgramRuntimeError(`${api} received a combatant outside the projection.`);
    return subject;
  }

  #combatantArray(value: RuntimeValue | undefined, api: string): readonly DmVisibleCombatant[] {
    if (!Array.isArray(value)) throw new JsTurnProgramRuntimeError(`${api} requires an API combatant array.`);
    return value.map((entry) => this.#subject(entry, api));
  }

  #number(value: RuntimeValue | undefined, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new JsTurnProgramRuntimeError(`${label} must be a finite number.`);
    }
    return value;
  }

  #cell(value: RuntimeValue | undefined, api: string): { readonly column: number; readonly row: number } {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new JsTurnProgramRuntimeError(`${api} requires a cell selector object.`);
    }
    const keys = Object.keys(value);
    if (keys.length !== 2 || !keys.includes('column') || !keys.includes('row')) {
      throw new JsTurnProgramRuntimeError(`${api} cell selector requires exactly column and row.`);
    }
    const cell = value as RuntimeObject;
    const column = this.#number(cell.column, `${api} cell selector column`);
    const row = this.#number(cell.row, `${api} cell selector row`);
    if (!Number.isSafeInteger(column) || column < 0 || !Number.isSafeInteger(row) || row < 0) {
      throw new JsTurnProgramRuntimeError(`${api} cell selector coordinates must be non-negative safe integers.`);
    }
    return { column, row };
  }

  #program(value: RuntimeValue | undefined, api: string): DecisionProgram {
    if (
      typeof value !== 'object' || value === null || Array.isArray(value) ||
      !(DECISION_PROGRAM_VALUE in value) || value[DECISION_PROGRAM_VALUE] !== true
    ) {
      throw new JsTurnProgramRuntimeError(`${api} requires a DecisionProgram.`);
    }
    return value.program;
  }

  #programValue(program: DecisionProgram): DecisionProgramValue {
    return Object.freeze({ [DECISION_PROGRAM_VALUE]: true as const, program });
  }

  #riderValue(rider: StandingConditionalRider): StandingRiderValue {
    return Object.freeze({ [STANDING_RIDER_VALUE]: true as const, rider });
  }

  #rider(value: RuntimeValue | undefined, api: string): StandingConditionalRider {
    if (
      typeof value !== 'object' || value === null || Array.isArray(value) ||
      !(STANDING_RIDER_VALUE in value) || value[STANDING_RIDER_VALUE] !== true
    ) {
      throw new JsTurnProgramRuntimeError(`${api} requires a standing conditional rider.`);
    }
    return value.rider;
  }

  #attack(args: readonly RuntimeValue[]): DecisionProgramValue {
    if (args.length !== 1 && args.length !== 2) {
      throw new JsTurnProgramRuntimeError(`attack expects 1 or 2 arguments; received ${String(args.length)}.`);
    }
    const subject = this.#subject(args[0], 'attack');
    const action = {
      kind: 'attack' as const,
      target: { kind: 'combatant' as const, combatantId: subject.id },
    };
    return args.length === 1
      ? this.#programValue({ kind: 'action', action })
      : this.#programValue({ kind: 'action', action, riders: [this.#rider(args[1], 'attack')] });
  }

  #targetAction(
    api: string,
    args: readonly RuntimeValue[],
    kind: 'attack' | 'bonus_attack' | 'force_save' | 'move_toward',
  ): DecisionProgramValue {
    this.#arity(api, args, 1);
    const subject = this.#subject(args[0], api);
    return this.#programValue({
      kind: 'action',
      action: { kind, target: { kind: 'combatant', combatantId: subject.id } },
    });
  }

  #useAction(
    api: string,
    args: readonly RuntimeValue[],
    action: 'dash' | 'disengage' | 'dodge' | 'action_surge' | 'end_turn',
  ): DecisionProgramValue {
    this.#arity(api, args, 0);
    return this.#programValue({ kind: 'action', action: { kind: 'use_action', action } });
  }

  #arity(api: string, args: readonly RuntimeValue[], expected: number): void {
    if (args.length !== expected) {
      throw new JsTurnProgramRuntimeError(`${api} expects ${String(expected)} arguments; received ${String(args.length)}.`);
    }
  }
}

export function interpretJsTurnProgram(
  source: string,
  state: DmVisibleEncounterState,
  actorId: CombatantId,
  limits: JsTurnProgramLimits = {},
): JsTurnProgramExecution {
  const ast = parseJsTurnProgram(source);
  return new Interpreter(state, actorId, limits).execute(ast, source);
}
