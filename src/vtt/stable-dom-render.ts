function attributeNames(element: HTMLElement): readonly string[] {
  if (typeof element.getAttributeNames === 'function') return element.getAttributeNames();
  const attributes: unknown = Reflect.get(element, 'attributes');
  return attributes instanceof Map
    ? [...attributes.keys()].filter((key): key is string => typeof key === 'string')
    : [];
}

function syncAttributes(live: HTMLElement, draft: HTMLElement): void {
  const desired = new Set(attributeNames(draft));
  for (const name of attributeNames(live)) {
    if (!desired.has(name)) live.removeAttribute(name);
  }
  for (const name of desired) {
    const value = draft.getAttribute(name);
    if (value !== null && live.getAttribute(name) !== value) live.setAttribute(name, value);
  }
}

const MUTABLE_STATE_PROPERTIES = ['disabled', 'hidden', 'checked', 'selected', 'value'] as const;
type MutableStateProperty = (typeof MUTABLE_STATE_PROPERTIES)[number];

function mutableState(element: HTMLElement): ReadonlyMap<MutableStateProperty, unknown> {
  const state = new Map<MutableStateProperty, unknown>();
  for (const property of MUTABLE_STATE_PROPERTIES) {
    if (property in element) state.set(property, Reflect.get(element, property));
  }
  return state;
}

function syncState(
  live: HTMLElement,
  desired: ReadonlyMap<MutableStateProperty, unknown>,
): void {
  for (const [property, value] of desired) {
    if (property in live) Reflect.set(live, property, value);
  }
}

function isHtmlElement(value: unknown): value is HTMLElement {
  return typeof value === 'object' && value !== null &&
    typeof Reflect.get(value, 'tagName') === 'string' &&
    typeof Reflect.get(value, 'append') === 'function';
}

declare const stableRenderKeyBrand: unique symbol;

/** A globally unique identity for one logical element in a stable render tree. */
export type StableRenderKey = string & { readonly [stableRenderKeyBrand]: true };

export class StableRenderKeyFormatError extends Error {
  override readonly name = 'StableRenderKeyFormatError' as const;
  readonly code = 'invalid_stable_render_key' as const;

  constructor(readonly key: string) {
    super(`Stable render key ${key} must contain a namespace and logical identity.`);
  }
}

export class StableRenderKeyCollisionError extends Error {
  override readonly name = 'StableRenderKeyCollisionError' as const;
  readonly code = 'duplicate_stable_render_key' as const;

  constructor(
    readonly key: StableRenderKey,
    readonly tree: 'live' | 'draft',
  ) {
    super(`Stable render key ${key} is duplicated in the ${tree} tree.`);
  }
}

export class StableInteractivePathError extends Error {
  override readonly name = 'StableInteractivePathError' as const;
  readonly code = 'unstable_interactive_render_path' as const;

  constructor(
    readonly interactiveTag: string,
    readonly unkeyedTag: string,
    readonly tree: 'live' | 'draft',
  ) {
    super(
      `Interactive ${interactiveTag} has an unkeyed ${unkeyedTag} ancestor in the ${tree} tree.`,
    );
  }
}

export function stableRenderKey(
  ...segments: readonly [namespace: string, identity: string, ...path: string[]]
): StableRenderKey {
  if (segments.some((segment) => segment.length === 0)) {
    throw new StableRenderKeyFormatError(segments.join(':'));
  }
  return segments.map((segment) => encodeURIComponent(segment)).join(':') as StableRenderKey;
}

function renderKey(element: HTMLElement): StableRenderKey | null {
  const key = element.dataset.renderKey;
  if (key === undefined) return null;
  if (!key.includes(':')) throw new StableRenderKeyFormatError(key);
  return key as StableRenderKey;
}

function assertUniqueRenderKeys(
  root: HTMLElement,
  tree: 'live' | 'draft',
): void {
  const keyed = new Map<StableRenderKey, HTMLElement>();
  const visit = (parent: HTMLElement): void => {
    for (const child of Array.from(parent.children)) {
      if (!isHtmlElement(child)) continue;
      const key = renderKey(child);
      if (key !== null) {
        if (keyed.has(key)) throw new StableRenderKeyCollisionError(key, tree);
        keyed.set(key, child);
      }
      visit(child);
    }
  };
  visit(root);
}

function isInteractive(element: HTMLElement): boolean {
  const tag = element.tagName.toUpperCase();
  if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'SUMMARY'].includes(tag)) return true;
  if (tag === 'A' && element.getAttribute('href') !== null) return true;
  return element.getAttribute('tabindex') !== null;
}

function assertStableInteractivePaths(
  root: HTMLElement,
  tree: 'live' | 'draft',
): void {
  const visit = (parent: HTMLElement, pathIsStable: boolean): void => {
    for (const child of Array.from(parent.children)) {
      if (!isHtmlElement(child)) continue;
      const childIsStable = pathIsStable && renderKey(child) !== null;
      if (isInteractive(child) && !childIsStable) {
        let unkeyed: HTMLElement = child;
        while (unkeyed !== root && renderKey(unkeyed) !== null) {
          const ancestor = unkeyed.parentElement;
          if (ancestor === null) break;
          unkeyed = ancestor;
        }
        throw new StableInteractivePathError(
          child.tagName.toUpperCase(),
          unkeyed.tagName.toUpperCase(),
          tree,
        );
      }
      visit(child, childIsStable);
    }
  };
  visit(root, true);
}

function keyedChildren(element: HTMLElement): ReadonlyMap<StableRenderKey, HTMLElement> {
  const keyed = new Map<StableRenderKey, HTMLElement>();
  for (const child of Array.from(element.children)) {
    if (!isHtmlElement(child)) continue;
    const key = renderKey(child);
    if (key === null) continue;
    if (keyed.has(key)) throw new StableRenderKeyCollisionError(key, 'live');
    keyed.set(key, child);
  }
  return keyed;
}

function syncElement(live: HTMLElement, draft: HTMLElement): void {
  const desiredState = mutableState(draft);
  syncAttributes(live, draft);
  if (draft.children.length === 0) {
    live.textContent = draft.textContent;
  } else {
    reconcileStableRenderedChildren(live, draft);
  }
  // A select's value is derived from its option children. Restore mutable DOM
  // state only after those children have been reconciled so option insertion
  // cannot overwrite the intended selection.
  syncState(live, desiredState);
}

/**
 * Reconciles freshly rendered markup while retaining elements carrying the
 * same data-render-key. Retained controls stay connected and keep the event
 * listener installed for that semantic decision.
 */
export function reconcileStableRenderedChildren(live: HTMLElement, draft: HTMLElement): void {
  assertUniqueRenderKeys(live, 'live');
  assertUniqueRenderKeys(draft, 'draft');
  assertStableInteractivePaths(live, 'live');
  assertStableInteractivePaths(draft, 'draft');
  const existing = Array.from(live.children).filter(
    isHtmlElement,
  );
  const keyed = keyedChildren(live);
  const retained = new Set<HTMLElement>();
  const desired = Array.from(draft.children).filter(
    isHtmlElement,
  );
  for (const next of desired) {
    const key = renderKey(next);
    const prior = key === null ? undefined : keyed.get(key);
    const rendered = prior !== undefined && prior.tagName === next.tagName
      ? prior
      : next;
    if (rendered === prior) syncElement(rendered, next);
    live.append(rendered);
    retained.add(rendered);
  }
  for (const stale of existing) {
    if (!retained.has(stale)) stale.remove();
  }
}
