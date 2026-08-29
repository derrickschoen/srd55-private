/** The arena supplies the selected KB verbatim as its session-level instructions. */
export function buildArenaSessionInstructions(knowledgeBase: string | null): string {
  return knowledgeBase ?? '';
}
