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

function syncState(live: HTMLElement, draft: HTMLElement): void {
  for (const property of ['disabled', 'hidden', 'checked', 'selected', 'value'] as const) {
    if (property in live && property in draft) {
      Reflect.set(live, property, Reflect.get(draft, property));
    }
  }
}

function isHtmlElement(value: unknown): value is HTMLElement {
  return typeof value === 'object' && value !== null &&
    typeof Reflect.get(value, 'tagName') === 'string' &&
    typeof Reflect.get(value, 'append') === 'function';
}

function renderKey(element: HTMLElement): string | null {
  return element.dataset.renderKey ?? null;
}

function keyedChildren(element: HTMLElement): ReadonlyMap<string, HTMLElement> {
  const keyed = new Map<string, HTMLElement>();
  for (const child of Array.from(element.children)) {
    if (!isHtmlElement(child)) continue;
    const key = renderKey(child);
    if (key === null) continue;
    if (keyed.has(key)) throw new Error(`Stable render key ${key} is duplicated.`);
    keyed.set(key, child);
  }
  return keyed;
}

function syncElement(live: HTMLElement, draft: HTMLElement): void {
  syncAttributes(live, draft);
  syncState(live, draft);
  if (draft.children.length === 0) {
    live.textContent = draft.textContent;
    return;
  }
  reconcileStableRenderedChildren(live, draft);
}

/**
 * Reconciles freshly rendered markup while retaining elements carrying the
 * same data-render-key. Retained controls stay connected and keep the event
 * listener installed for that semantic decision.
 */
export function reconcileStableRenderedChildren(live: HTMLElement, draft: HTMLElement): void {
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
