interface TestNode {
  readonly children: TestElement[];
}

export class TestElement implements TestNode {
  readonly children: TestElement[] = [];
  readonly attributes = new Map<string, string>();
  className = '';
  textContent: string | null = null;

  constructor(readonly tagName: string) {}

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  append(...nodes: TestElement[]): void {
    this.children.push(...nodes);
  }
}

class TestDocument {
  createElement(tagName: string): TestElement {
    return new TestElement(tagName);
  }
}

export function installMinimalDocument(): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: new TestDocument() as unknown as Document,
  });
  return () => {
    if (descriptor === undefined) {
      Reflect.deleteProperty(globalThis, 'document');
    } else {
      Object.defineProperty(globalThis, 'document', descriptor);
    }
  };
}

function asTestElement(node: Node): TestElement {
  return node as unknown as TestElement;
}

export function elementsWithAttribute(
  root: Node,
  attribute: string,
  value?: string,
): readonly TestElement[] {
  const matches: TestElement[] = [];
  const visit = (element: TestElement): void => {
    const actual = element.getAttribute(attribute);
    if (actual !== null && (value === undefined || actual === value)) {
      matches.push(element);
    }
    for (const child of element.children) {
      visit(child);
    }
  };
  visit(asTestElement(root));
  return matches;
}

export function elementsByTagName(
  root: Node,
  tagName: string,
): readonly TestElement[] {
  const matches: TestElement[] = [];
  const visit = (element: TestElement): void => {
    if (element.tagName === tagName) {
      matches.push(element);
    }
    for (const child of element.children) {
      visit(child);
    }
  };
  visit(asTestElement(root));
  return matches;
}
