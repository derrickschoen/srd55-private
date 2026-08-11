export interface TransferFailureCopy {
  readonly primary: string;
  readonly technicalDetail: string | null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Translate untrusted-transfer failure classes at the display boundary.
 *
 * The worker's thrown messages remain exact diagnostic contracts. RPC retains
 * only the broad handler-error code, so the stable codec/SQLite signatures are
 * the narrowest honest classes available to the browser UI.
 */
export function transferFailureCopy(error: unknown): TransferFailureCopy {
  const technicalDetail = errorMessage(error);
  if (
    /^Invalid character share: fragment is not valid (?:base64url|gzip data)\.$/u
      .test(technicalDetail)
  ) {
    return Object.freeze({
      primary: 'This share link is damaged or incomplete — try copying it again.',
      technicalDetail,
    });
  }
  if (/\bSQLITE_NOTADB\b|file is not a database/iu.test(technicalDetail)) {
    return Object.freeze({
      primary: "This file isn't an SRD-55 backup.",
      technicalDetail,
    });
  }
  return Object.freeze({ primary: technicalDetail, technicalDetail: null });
}

export function announceTransferFailure(
  status: HTMLElement,
  error: unknown,
): void {
  const copy = transferFailureCopy(error);
  status.textContent = copy.primary;
  if (copy.technicalDetail !== null) {
    const detail = document.createElement('small');
    detail.className = 'transfer-technical-detail';
    detail.textContent = `Technical detail: ${copy.technicalDetail}`;
    status.append(detail);
  }
  status.classList.add('transfer-error');
  status.setAttribute('role', 'alert');
}
