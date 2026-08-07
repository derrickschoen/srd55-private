type Listener = (event: Event) => void;

export class InteractiveTestElement {
  readonly children: InteractiveTestElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly classList: {
    add: (...tokens: string[]) => void;
    toggle: (token: string, force?: boolean) => boolean;
  };
  readonly dataset: Record<string, string>;
  className = '';
  textContent: string | null = null;
  innerHTML = '';
  disabled = false;
  hidden = false;
  checked = false;
  selected = false;
  type = '';
  id = '';
  htmlFor = '';
  min = '';
  max = '';
  value = '';
  open = false;

  private readonly listeners = new Map<string, Set<Listener>>();
  private parent: InteractiveTestElement | null = null;

  constructor(
    readonly tagName: string,
    private readonly owner: InteractiveTestDocument,
  ) {
    const classNames = (): Set<string> =>
      new Set(this.className.split(/\s+/u).filter(Boolean));
    this.classList = {
      add: (...tokens) => {
        const names = classNames();
        for (const token of tokens) {
          names.add(token);
        }
        this.className = [...names].join(' ');
      },
      toggle: (token, force) => {
        const names = classNames();
        const enabled = force ?? !names.has(token);
        if (enabled) names.add(token);
        else names.delete(token);
        this.className = [...names].join(' ');
        return enabled;
      },
    };
    this.dataset = new Proxy<Record<string, string>>(
      {},
      {
        set: (target, property, value) => {
          if (typeof property === 'string' && typeof value === 'string') {
            const attribute = property.replace(
              /[A-Z]/gu,
              (letter) => `-${letter.toLowerCase()}`,
            );
            this.setAttribute(`data-${attribute}`, value);
          }
          return Reflect.set(target, property, value);
        },
      },
    );
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name === 'open') this.open = true;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name === 'open') this.open = false;
  }

  append(...values: (InteractiveTestElement | string)[]): void {
    for (const value of values) {
      const node = typeof value === 'string'
        ? new InteractiveTestElement('#text', this.owner)
        : value;
      if (typeof value === 'string') node.textContent = value;
      node.remove();
      node.parent = this;
      this.children.push(node);
    }
  }

  replaceChildren(...nodes: (InteractiveTestElement | string)[]): void {
    for (const child of this.children) child.parent = null;
    this.children.splice(0, this.children.length);
    this.append(...nodes);
  }

  get parentElement(): InteractiveTestElement | null {
    return this.parent;
  }

  get isConnected(): boolean {
    let current: InteractiveTestElement | null = this;
    while (current !== null) {
      if (this.owner.isDocumentRoot(current)) return true;
      current = current.parent;
    }
    return false;
  }

  remove(): void {
    if (this.parent === null) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }

  showModal(): void {
    if (this.tagName !== 'dialog') {
      throw new TypeError('showModal is only available on dialog elements.');
    }
    if (!this.isConnected) {
      throw new DOMException(
        'The dialog element is not connected to a Document.',
        'InvalidStateError',
      );
    }
    if (this.open) {
      throw new DOMException(
        'The dialog element is already open.',
        'InvalidStateError',
      );
    }
    this.setAttribute('open', '');
  }

  close(): void {
    if (this.tagName === 'dialog') this.removeAttribute('open');
  }

  createTHead(): InteractiveTestElement {
    const head = new InteractiveTestElement('thead', this.owner);
    this.append(head);
    return head;
  }

  createTBody(): InteractiveTestElement {
    const body = new InteractiveTestElement('tbody', this.owner);
    this.append(body);
    return body;
  }

  insertRow(): InteractiveTestElement {
    const row = new InteractiveTestElement('tr', this.owner);
    this.append(row);
    return row;
  }

  insertCell(): InteractiveTestElement {
    const cell = new InteractiveTestElement('td', this.owner);
    this.append(cell);
    return cell;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback: Listener =
      typeof listener === 'function'
        ? (listener as Listener)
        : (event) => listener.handleEvent(event);
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(callback);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void {
    if (typeof listener !== 'function') {
      return;
    }
    this.listeners.get(type)?.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener(event);
    }
    return !event.defaultPrevented;
  }

  click(): void {
    if (!this.disabled) {
      this.dispatchEvent(new Event('click', { cancelable: true }));
    }
  }

  focus(): void {
    if (!this.disabled && !this.hidden) {
      this.owner.activeElement = this;
    }
  }

  querySelector(selector: string): InteractiveTestElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): InteractiveTestElement[] {
    const matches: InteractiveTestElement[] = [];
    const visit = (element: InteractiveTestElement): void => {
      if (typeof element?.matches !== 'function') {
        return;
      }
      if (element.matches(selector)) {
        matches.push(element);
      }
      for (const child of element.children) {
        visit(child);
      }
    };
    visit(this);
    return matches;
  }

  private matches(selector: string): boolean {
    const attribute = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
    if (attribute !== null) {
      const name = attribute[1];
      const expected = attribute[2];
      if (name === undefined) {
        return false;
      }
      const actual = this.getAttribute(name);
      return actual !== null && (expected === undefined || actual === expected);
    }
    if (selector.startsWith('.')) {
      return this.className.split(/\s+/u).includes(selector.slice(1));
    }
    return this.tagName === selector.toLowerCase();
  }
}

class InteractiveTestDocument {
  activeElement: InteractiveTestElement | null = null;
  readonly documentElement: InteractiveTestElement;
  readonly body: InteractiveTestElement;

  constructor() {
    this.documentElement = new InteractiveTestElement('html', this);
    this.body = new InteractiveTestElement('body', this);
    this.documentElement.append(this.body);
  }

  isDocumentRoot(element: InteractiveTestElement): boolean {
    return element === this.documentElement;
  }

  createElement(tagName: string): InteractiveTestElement {
    return new InteractiveTestElement(tagName, this);
  }

  createDocumentFragment(): InteractiveTestElement {
    return new InteractiveTestElement('#document-fragment', this);
  }
}

export function installInteractiveDocument(): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: new InteractiveTestDocument() as unknown as Document,
  });
  return () => {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, 'document');
    } else {
      Object.defineProperty(globalThis, 'document', descriptor);
    }
  };
}

export function interactiveElement(node: Node): InteractiveTestElement {
  return node as unknown as InteractiveTestElement;
}

export function elementText(node: Node): string {
  const element = interactiveElement(node);
  return [
    element.textContent ?? '',
    ...element.children.map((child) => elementText(child as unknown as Node)),
  ].join(' ');
}
