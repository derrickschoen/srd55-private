const CONTRACT_ONLY_WORDS = new Set([
  'a', 'action', 'actor', 'additional', 'advance', 'alternate', 'and', 'as', 'available', 'bound',
  'cannot', 'choice', 'complete', 'context', 'corrected', 'correction', 'defensive',
  'compatible', 'coverage', 'details', 'did', 'dominating', 'effect', 'engine', 'encounter',
  'every', 'executable', 'expose', 'fallback',
  'for', 'full', 'further', 'gap', 'higher', 'highest', 'identical', 'if', 'intended', 'is', 'its', 'legal',
  'initial', 'no', 'not', 'objective', 'of', 'offered', 'option', 'options', 'or', 'override',
  'play', 'plan', 'preserve', 'preserving',
  'primary', 'proceed', 'ranked', 'requested', 'requires', 'resolve', 'resolves', 'revision',
  'retained', 'round', 'safe', 'same', 'select', 'selected', 'selection', 'support', 'tactical',
  'take', 'the', 'this', 'to', 'turn', 'unavailable', 'use', 'usable', 'using', 'while', 'with',
  'without',
]);

export type DecisionReasonProblem = 'empty' | 'contract_boilerplate';

/** Rejects explanations whose only content is that the submitted option satisfies the wire contract. */
export function decisionReasonProblem(reason: string): DecisionReasonProblem | null {
  const words = reason.toLocaleLowerCase('en-US').match(/[a-z0-9]+/gu) ?? [];
  if (words.length === 0) return 'empty';
  return words.every((word) => CONTRACT_ONLY_WORDS.has(word) || /^\d+$/u.test(word))
    ? 'contract_boilerplate'
    : null;
}
