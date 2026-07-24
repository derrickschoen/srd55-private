export const REVISION_CONFLICT_MESSAGE =
  'This character changed in another tab. Reload before trying again.';

export class RevisionConflict extends Error {
  constructor(readonly currentRevision: number) {
    super(REVISION_CONFLICT_MESSAGE);
    this.name = 'RevisionConflict';
  }
}
