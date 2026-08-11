import { describe, expect, it } from 'vitest';
import {
  announceTransferFailure,
  transferFailureCopy,
} from '../../../src/ui/screens/character-list/transfer-failure';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

describe('human transfer failure copy', () => {
  it.each([
    'Invalid character share: fragment is not valid base64url.',
    'Invalid character share: fragment is not valid gzip data.',
  ])('classifies damaged share codec details without changing them: %s', (detail) => {
    expect(transferFailureCopy(new Error(detail))).toEqual({
      primary: 'This share link is damaged or incomplete — try copying it again.',
      technicalDetail: detail,
    });
  });

  it('classifies a non-database SQLite image as the wrong backup file class', () => {
    const detail =
      'SQLITE_NOTADB: sqlite3 result code 26: file is not a database';
    expect(transferFailureCopy(new Error(detail))).toEqual({
      primary: "This file isn't an SRD-55 backup.",
      technicalDetail: detail,
    });
  });

  it('renders the human sentence first and retains the exact detail secondarily', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const status = interactiveElement(document.createElement('p'));
      announceTransferFailure(
        status as unknown as HTMLElement,
        new Error('Invalid character share: fragment is not valid gzip data.'),
      );

      expect(elementText(status as unknown as Node)).toContain(
        'This share link is damaged or incomplete — try copying it again.',
      );
      expect(status.getAttribute('role')).toBe('alert');
      expect(status.querySelector('.transfer-technical-detail')?.textContent).toBe(
        'Technical detail: Invalid character share: fragment is not valid gzip data.',
      );
    } finally {
      restoreDocument();
    }
  });

  it('leaves an unrelated failure as its primary sentence without duplicating it', () => {
    expect(transferFailureCopy(new TypeError('Choose a character JSON backup.')))
      .toEqual({
        primary: 'Choose a character JSON backup.',
        technicalDetail: null,
      });
  });
});
