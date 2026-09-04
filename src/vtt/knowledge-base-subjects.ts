/**
 * The closed set of AI-DM knowledge-base subjects.
 *
 * Lives apart from `knowledge-base-contract.ts` on purpose: the contract
 * module reads files and hashes bytes with node built-ins, and the MCP
 * schemas — which the browser encounter app imports through
 * dm-encounter-host → turn-exhaustion-coordinator → engine-server — only need
 * this list. Importing the contract from the client graph pulled `node:crypto`
 * into the browser bundle, where Vite's shim throws at module evaluation and
 * the DM view never mounts.
 */
export const KB_SUBJECTS = [
  'actions',
  'movement',
  'targeting',
  'spells',
  'conditions',
  'reactions',
  'protocol',
] as const;

export type KbSubject = (typeof KB_SUBJECTS)[number];
