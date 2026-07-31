type Listener = (event: Event) => void;

export class InteractiveTestElement {
  readonly children: InteractiveTestElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly classList: { add: (...tokens: string[]) => void };
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

  private readonly listeners = new Map<string, Set<Listener>>();

  constructor(
    readonly tagName: string,
    private readonly owner: InteractiveTestDocument,
  ) {
    this.classList = {
      add: (...tokens) => {
        const names = new Set(this.className.split(/\s+/u).filter(Boolean));
        for (const token of tokens) {
          names.add(token);
        }
        this.className = [...names].join(' ');
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
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: InteractiveTestElement[]): void {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes: InteractiveTestElement[]): void {
    this.children.splice(0, this.children.length, ...nodes);
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
