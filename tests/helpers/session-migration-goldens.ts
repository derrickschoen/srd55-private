/**
 * The golden harness every RevisionRewriteStep answers to (owner D940: "pinned by golden fixtures: an earlier-build
 * save in, exact migrated save out"; SAVE-COMPAT §6.7). A step's golden input revision, rewritten by the chain
 * driver, must be BYTE FOR BYTE its golden output text (the rewritten revision's canonical JSON and a newline), and
 * each not-migratable golden must be refused with exactly its reason and path. Nothing here reads a file: a test
 * declares its fixtures and passes a reader.
 */
import { canonicalJson } from '../../src/commands/canonical-json';
import type { EngineBuild } from '../../src/vtt/engine-build';
import {
  rewriteRevisionsToCurrent,
  SessionNotMigratableError,
  type RevisionRewriteStep,
} from '../../src/vtt/session-persistence';

/** Every way `step` (from schema `from`) fails its goldens; empty when it answers to them. */
export function stepGoldenFaults(
  step: RevisionRewriteStep<number, string>,
  from: number,
  readText: (path: string) => string,
  running: EngineBuild,
): readonly string[] {
  const chain = { [from]: step };
  const faults: string[] = [];
  const [rewritten] = rewriteRevisionsToCurrent([JSON.parse(readText(step.golden.input))], running, chain, from + 1);
  if (`${canonicalJson(rewritten)}\n` !== readText(step.golden.output)) {
    faults.push(`${step.golden.output} is not, byte for byte, ${step.golden.input} rewritten by ${step.id}`);
  }
  for (const [reason, golden] of Object.entries(step.notMigratableGoldens)) {
    let refusal: unknown;
    try {
      rewriteRevisionsToCurrent([JSON.parse(readText(golden.input))], running, chain, from + 1);
    } catch (error) {
      refusal = error;
    }
    if (!(refusal instanceof SessionNotMigratableError) || refusal.refusal.reason !== reason || refusal.refusal.path !== golden.path) {
      faults.push(`${golden.input} is not refused by ${step.id} as ${reason} at ${golden.path}`);
    }
  }
  return faults;
}
