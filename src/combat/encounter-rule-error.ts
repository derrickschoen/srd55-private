export class EncounterRuleError extends Error {
  override readonly name: string = 'EncounterRuleError';

  constructor(readonly reason: string) {
    super(reason);
  }
}
