/** The vocabularies guarded by exhaustive value-expression switches. */
export type ValueExpressionUnhandledSubject =
  | 'value source kind'
  | 'level source'
  | 'value expression kind'
  | 'value source'
  | 'value expression';

/** An exhaustive value-expression switch reached an unknown limb. */
export class ValueExpressionUnhandledError extends Error {
  override readonly name = 'ValueExpressionUnhandledError' as const;

  constructor(
    readonly subject: ValueExpressionUnhandledSubject,
    readonly value: string,
  ) {
    super(`Unhandled ${subject} ${value}.`);
  }
}
