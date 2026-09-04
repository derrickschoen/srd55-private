/** The arena supplies the loaded cold-start KB text verbatim as session-level instructions. */
export function buildArenaSessionInstructions(startupInstructions: string | null): string {
  return startupInstructions ?? '';
}
