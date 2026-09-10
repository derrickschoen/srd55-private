import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { z } from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);

export const d569ReconciliationEntrySchema = z.strictObject({
  rawLineNumber: z.number().int().positive(),
  rawLineSha256: sha256Schema,
  scheduledCellKey: z.string().regex(/^\d+:[1-9]\d*$/u),
  recoveredSessionId: z.string().min(1).max(200),
  rolloutPath: z.string().min(1),
  rolloutSha256: sha256Schema,
  reviewerApproval: z.strictObject({
    reviewer: z.string().min(1),
    approvedAt: z.string().datetime({ offset: true }),
    decision: z.literal('approved'),
  }),
});

export const d569ReconciliationSidecarSchema = z.strictObject({
  version: z.literal('d569-reconciliation-v1'),
  rawFileSha256: sha256Schema,
  entries: z.array(d569ReconciliationEntrySchema).length(3),
});

export type D569ReconciliationSidecar = z.infer<typeof d569ReconciliationSidecarSchema>;

export function sha256Text(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

export function readReconciliationSidecar(path: string): D569ReconciliationSidecar {
  return d569ReconciliationSidecarSchema.parse(JSON.parse(readFileSync(path, 'utf8')) as unknown);
}

export function validateReconciliationSidecar(
  rawText: string,
  sidecar: D569ReconciliationSidecar,
): ReadonlyMap<number, D569ReconciliationSidecar['entries'][number]> {
  const rawLines = rawText.split('\n').filter((line) => line.length > 0);
  const expectedLines = [6, 19, 20];
  const actualLines = sidecar.entries.map((entry) => entry.rawLineNumber).sort((left, right) => left - right);
  if (JSON.stringify(actualLines) !== JSON.stringify(expectedLines)) {
    throw new TypeError('Reconciliation sidecar must cover exactly hard raw lines 6, 19, and 20.');
  }
  const byLine = new Map<number, D569ReconciliationSidecar['entries'][number]>();
  for (const entry of sidecar.entries) {
    const rawLine = rawLines[entry.rawLineNumber - 1];
    if (rawLine === undefined || sha256Text(rawLine) !== entry.rawLineSha256) {
      throw new TypeError(`Reconciliation hash mismatch at raw line ${String(entry.rawLineNumber)}.`);
    }
    if (byLine.has(entry.rawLineNumber)) throw new TypeError('Duplicate reconciliation raw line.');
    byLine.set(entry.rawLineNumber, entry);
  }
  return byLine;
}
