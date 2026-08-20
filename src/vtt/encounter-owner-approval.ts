const OWNER_ATTESTATIONS = new WeakMap<object, string>();
declare const OWNER_APPROVER_IDENTITY: unique symbol;

/**
 * Opaque capability produced only by the browser's trusted owner-approval
 * activation. The unexported brand prevents fixture and test literals from
 * constructing this variant; the WeakMap check also rejects forged casts at
 * runtime.
 */
export interface OwnerApproverIdentity {
  readonly kind: 'owner';
  readonly approvalId: string;
  readonly packageSha256: string;
  readonly [OWNER_APPROVER_IDENTITY]: true;
}

function assertApprovalId(value: string): void {
  if (value.trim() !== value || !value.startsWith('owner:') || value.length <= 6) {
    throw new Error('Owner approval ids must be trimmed and start with owner:.');
  }
}

function assertPackageSha256(value: string): void {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error('Owner approval must attest one exact package SHA-256.');
  }
}

export function attestOwnerEncounterApproval(input: {
  readonly activation: Event;
  readonly approvalId: string;
  readonly packageSha256: string;
}): OwnerApproverIdentity {
  if (
    !(input.activation instanceof Event) ||
    !input.activation.isTrusted ||
    (input.activation.type !== 'click' && input.activation.type !== 'submit')
  ) {
    throw new Error('Owner approval requires a trusted click or submit from the approval UI.');
  }
  assertApprovalId(input.approvalId);
  assertPackageSha256(input.packageSha256);
  const identity = Object.freeze({
    kind: 'owner' as const,
    approvalId: input.approvalId,
    packageSha256: input.packageSha256,
  });
  OWNER_ATTESTATIONS.set(identity, input.packageSha256);
  return identity as OwnerApproverIdentity;
}

export function isAttestedOwnerApproverIdentity(
  value: OwnerApproverIdentity,
  packageSha256: string,
): boolean {
  return OWNER_ATTESTATIONS.get(value) === packageSha256;
}
