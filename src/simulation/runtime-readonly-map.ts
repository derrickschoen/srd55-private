/**
 * The simulation's registration manifests are the domain's read-only maps
 * (`src/domain/frozen-map.ts`, one implementation for the SRD rule maps and
 * these): a snapshot for a manifest fixed when its module loads, and a live
 * view for one its owning module still writes. Both read through the `Map`
 * intrinsics captured at load, and neither has a mutating method.
 *
 * D263 boundary: this is an accident tripwire for our own future code, not a
 * hostile-caller guarantee. Deliberate in-process prototype reassignment and
 * post-hoc mutation of returned or minted objects remain caller-trusted, just
 * like mutation beyond the round-18 structural-copy boundary. `deepFreeze` is
 * the domain's, re-exported for the manifests' registered rows.
 */
import { FrozenMap, ReadonlyMapView } from '../domain/frozen-map';

export { deepFreeze } from '../domain/deep-freeze';

export function runtimeReadonlyMap<K, V>(
  entries: Iterable<readonly [K, V]>,
): ReadonlyMap<K, V> {
  return new FrozenMap(entries);
}

/** The backing map must remain private to the module that owns its writer. */
export function runtimeReadonlyMapView<K, V>(
  backing: Map<K, V>,
): ReadonlyMap<K, V> {
  return new ReadonlyMapView(backing);
}
