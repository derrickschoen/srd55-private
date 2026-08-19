/** An exhaustive feature-value target switch reached an unknown limb. */
export class FeatureValueTargetUnhandledError extends Error {
  override readonly name = 'FeatureValueTargetUnhandledError' as const;

  constructor(readonly target: string) {
    super(`Unhandled feature value target ${target}.`);
  }
}
