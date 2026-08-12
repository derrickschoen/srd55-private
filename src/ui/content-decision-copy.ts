export type ContentDecision = 'match' | 'clone';
export type ContentDecisionContext = 'adoption' | 'reference-replacement';

/**
 * One consequence-copy seam for every Match/Clone surface. The replacement
 * context is reference-only: it has no incoming rules evidence, so it names
 * the local entry being copied instead of pretending an incoming aggregate is
 * available.
 */
export function contentDecisionConsequence(
  decision: ContentDecision,
  context: ContentDecisionContext,
  localName?: string,
): string {
  switch (context) {
    case 'adoption':
      switch (decision) {
        case 'match':
          return 'Match — Discards the incoming rules; existing characters keep the local entry.';
        case 'clone':
          return 'Clone — Installs the incoming rules under a new name; existing characters stay on the local entry.';
      }
    case 'reference-replacement':
      switch (decision) {
        case 'match':
          return localName === undefined
            ? 'Use the existing local entry for this character.'
            : `Use this local ${localName} for the imported character.`;
        case 'clone':
          return localName === undefined
            ? 'Create a renamed private copy of the local entry for this character.'
            : `Create a private copy of this local ${localName} and attach the imported character.`;
      }
  }
}
