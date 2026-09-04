/** Browser-safe closed vocabulary shared by MCP schemas and the Node-only KB loader. */
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
