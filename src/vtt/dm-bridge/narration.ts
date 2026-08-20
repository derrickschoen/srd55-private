import { SPELL_KB_ENTRIES } from '../../combat/spells/kb/entries';
import { STARTER_MONSTER_KB } from '../../combat/statblocks/kb/entries';
import { combatantId } from '../../combat/values';
import {
  dmBridgeContractInternals,
  type AdjudicationProposal,
  type Narration,
  type ValidationLine,
} from './contracts';

const KB_LOCATORS = new Map<string, string>([
  ...SPELL_KB_ENTRIES.map((entry) => [entry.ruleId, entry.srdLocator] as const),
  ...STARTER_MONSTER_KB.map((entry) => [entry.ruleId, entry.srdLocator] as const),
]);

function sentence(value: unknown, label: string): string {
  const decoded = dmBridgeContractInternals.string(value, label);
  if (decoded.length > 280 || decoded.includes('\n')) {
    throw new TypeError(`${label} must be one short human sentence.`);
  }
  return decoded;
}

function validationLine(value: unknown, label: string): ValidationLine {
  const input = dmBridgeContractInternals.record(value, label);
  dmBridgeContractInternals.exactKeys(input, ['ruleId', 'srdLocator', 'sentence'], label);
  const ruleId = dmBridgeContractInternals.string(input.ruleId, `${label}.ruleId`);
  const srdLocator = dmBridgeContractInternals.string(input.srdLocator, `${label}.srdLocator`);
  if (KB_LOCATORS.get(ruleId) !== srdLocator) {
    throw new TypeError(`${label} does not match a real spell/statblock KB rule and locator.`);
  }
  return { ruleId, srdLocator, sentence: sentence(input.sentence, `${label}.sentence`) };
}

function validationLines(value: unknown, label: string): readonly ValidationLine[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 20) {
    throw new TypeError(`${label} must contain 1 to 20 validation lines.`);
  }
  return value.map((line, index) => validationLine(line, `${label}[${index}]`));
}

export function decodeNarration(value: unknown): Narration {
  const input = dmBridgeContractInternals.record(value, 'narration');
  if (input.kind !== 'narration') throw new TypeError('Narration kind is required.');
  switch (input.voice) {
    case 'cinematic_visible_rolls': {
      dmBridgeContractInternals.exactKeys(input, ['kind', 'voice', 'sentence', 'visibleRolls'], 'cinematic narration');
      if (!Array.isArray(input.visibleRolls) || input.visibleRolls.length > 30) {
        throw new TypeError('Cinematic narration visibleRolls must be an array of at most 30 rolls.');
      }
      const visibleRolls = input.visibleRolls.map((value, index) => {
        const roll = dmBridgeContractInternals.record(value, `visibleRolls[${index}]`);
        dmBridgeContractInternals.exactKeys(roll, ['label', 'faces', 'total'], `visibleRolls[${index}]`);
        if (!Array.isArray(roll.faces) || roll.faces.length === 0 || roll.faces.length > 100) {
          throw new TypeError(`visibleRolls[${index}].faces must contain 1 to 100 results.`);
        }
        const faces = roll.faces.map((face) => dmBridgeContractInternals.integer(face, `visibleRolls[${index}].face`));
        return {
          label: dmBridgeContractInternals.string(roll.label, `visibleRolls[${index}].label`),
          faces,
          total: dmBridgeContractInternals.finiteNumber(roll.total, `visibleRolls[${index}].total`),
        };
      });
      return { kind: 'narration', voice: input.voice, sentence: sentence(input.sentence, 'narration.sentence'), visibleRolls };
    }
    case 'terse_tactical':
      dmBridgeContractInternals.exactKeys(input, ['kind', 'voice', 'sentence'], 'terse narration');
      return { kind: 'narration', voice: input.voice, sentence: sentence(input.sentence, 'narration.sentence') };
    case 'rules_explicit':
      dmBridgeContractInternals.exactKeys(input, ['kind', 'voice', 'sentence', 'rules'], 'rules narration');
      return {
        kind: 'narration',
        voice: input.voice,
        sentence: sentence(input.sentence, 'narration.sentence'),
        rules: validationLines(input.rules, 'narration.rules'),
      };
    case 'terse_rule_citing_validation':
      dmBridgeContractInternals.exactKeys(input, ['kind', 'voice', 'lines'], 'validation narration');
      return { kind: 'narration', voice: input.voice, lines: validationLines(input.lines, 'narration.lines') };
    default:
      throw new TypeError('Unknown narration voice.');
  }
}

export function decodeAdjudicationProposal(value: unknown): AdjudicationProposal {
  const input = dmBridgeContractInternals.record(value, 'adjudication proposal');
  dmBridgeContractInternals.exactKeys(input, ['kind', 'target', 'subject', 'reasoning', 'consequence'], 'adjudication proposal');
  if (input.kind !== 'adjudication_proposal') throw new TypeError('Adjudication proposal kind is required.');
  const consequence = dmBridgeContractInternals.record(input.consequence, 'adjudication consequence');
  const kind = dmBridgeContractInternals.string(consequence.kind, 'adjudication consequence.kind');
  if (kind === 'hit_point_delta') {
    dmBridgeContractInternals.exactKeys(consequence, ['kind', 'amount'], 'hit point adjudication');
    return {
      kind: 'adjudication_proposal',
      target: combatantId(dmBridgeContractInternals.string(input.target, 'adjudication target')),
      subject: dmBridgeContractInternals.string(input.subject, 'adjudication subject'),
      reasoning: sentence(input.reasoning, 'adjudication reasoning'),
      consequence: { kind, amount: dmBridgeContractInternals.finiteNumber(consequence.amount, 'adjudication amount') },
    };
  }
  if (kind === 'relocate') {
    dmBridgeContractInternals.exactKeys(consequence, ['kind', 'to'], 'relocate adjudication');
    return {
      kind: 'adjudication_proposal',
      target: combatantId(dmBridgeContractInternals.string(input.target, 'adjudication target')),
      subject: dmBridgeContractInternals.string(input.subject, 'adjudication subject'),
      reasoning: sentence(input.reasoning, 'adjudication reasoning'),
      consequence: { kind, to: dmBridgeContractInternals.gridCell(consequence.to, 'adjudication destination') },
    };
  }
  throw new TypeError('Unknown adjudication consequence.');
}

export const narrationKbContract = { locators: KB_LOCATORS };
