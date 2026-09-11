import { canonicalJson } from '../commands/canonical-json';
import { sha256 } from '../crypto/sha256';
export {
  classifyEngineCatalogEvidence,
  decodeEngineReadinessRecord,
} from './agent-adapters/engine-catalog-evidence';
export type {
  EngineObservedEvent,
  EngineReadinessRecord,
} from './agent-adapters/engine-catalog-evidence';

export function descriptorSha256(descriptors: readonly unknown[]): string {
  return sha256(canonicalJson(descriptors));
}
