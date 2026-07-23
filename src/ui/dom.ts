export type Cleanup = () => void;

export function clear(element: Element): void {
  element.replaceChildren();
}

export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    className?: string;
    text?: string;
    attributes?: Readonly<Record<string, string>>;
  } = {},
  children: readonly Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) {
    node.className = options.className;
  }
  if (options.text !== undefined) {
    node.textContent = options.text;
  }
  for (const [name, value] of Object.entries(options.attributes ?? {})) {
    node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

export function listen<K extends keyof HTMLElementEventMap>(
  target: HTMLElement,
  type: K,
  listener: (event: HTMLElementEventMap[K]) => void,
): Cleanup {
  target.addEventListener(type, listener);
  return () => target.removeEventListener(type, listener);
}

export function showError(root: Element, error: unknown): void {
  clear(root);
  root.append(
    element('main', { className: 'error-shell' }, [
      element('h1', { text: 'Something went wrong' }),
      element('p', {
        text: error instanceof Error ? error.message : String(error),
        attributes: { role: 'alert' },
      }),
    ]),
  );
}
