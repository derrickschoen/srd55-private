/**
 * The browser half of the DEV-ONLY AI bridge.
 *
 * This module is loaded from exactly one place — an `import.meta.env.DEV` branch
 * in `src/main.ts` — so a production build drops it, along with everything it
 * imports, before rollup ever sees a chunk. `tools/assert-dist-clean.mjs` then
 * scans `dist/` for `AI_BRIDGE_SENTINEL` and fails the build if that ever stops
 * being true.
 *
 * ## The page must work without it
 *
 * There are two ways for the bridge to be absent and BOTH are silent:
 *
 *   - the plugin is not registered, so the dev server injected no token meta
 *     tag. `mountAiChat` returns before issuing a single request.
 *   - the token is present but the endpoint does not answer. The probe failure
 *     is swallowed and nothing is appended.
 *
 * In either case there is no panel, no placeholder, no retry loop and nothing
 * written to the console. This module never logs; a dev convenience has no
 * business narrating its own absence.
 *
 * ## What comes back is untrusted
 *
 * Model output is inserted with `textContent`, into an element that is never
 * parsed as markup, and it is never executed. It is also measurably capable of
 * FABRICATING a tool transcript, so the panel says so in plain sight rather than
 * letting a confident-looking answer imply that something happened.
 *
 * ## No write path, ever
 *
 * Nothing here imports the RPC client, the command executor or any planner
 * action, and `tests/unit/ai-bridge/build-boundary.test.ts` asserts that stays
 * true. Any change to a character goes through the same commands a person uses,
 * with the person doing it.
 */
import {
  AI_BRIDGE_CHAT_ROUTE,
  AI_BRIDGE_SESSION_ROUTE,
  AI_BRIDGE_TOKEN_HEADER,
  AI_BRIDGE_TOKEN_META,
  AI_CHAT_MAX_MESSAGE_LENGTH,
  AI_CHAT_METHOD,
  isAiFrame,
  type AiChatParams,
} from './protocol';
import { AGENT_REFERENCE_SCRIPT_ID } from '../screens/planner/agent-reference';

/** Stamped into the DOM so the dist scan has a literal to look for. */
export const AI_BRIDGE_SENTINEL = 'AI_BRIDGE_SENTINEL';

const STYLES = `
.ai-chat {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  max-width: min(30rem, calc(100vw - 2rem));
  font-size: 0.875rem;
}
.ai-chat-drawer {
  background: Canvas;
  color: CanvasText;
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
}
.ai-chat-drawer > summary {
  cursor: pointer;
  font-weight: 600;
}
.ai-chat-note { margin: 0.5rem 0; opacity: 0.8; }
.ai-chat-form { display: grid; gap: 0.5rem; }
.ai-chat-form textarea { width: 100%; min-height: 4.5rem; font: inherit; }
.ai-chat-actions { display: flex; gap: 0.5rem; align-items: center; }
.ai-chat-output {
  display: block;
  margin-top: 0.5rem;
  max-height: 18rem;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
`;

function tokenFromDocument(root: Document): string | null {
  const meta = root.querySelector<HTMLMetaElement>(
    `meta[name="${AI_BRIDGE_TOKEN_META}"]`,
  );
  const content = meta?.content ?? '';
  return content.length > 0 ? content : null;
}

/**
 * The build reference the page ALREADY renders, read back out of its own
 * `<script type="application/json">` island. Deliberately not a second
 * projection: that one withholds every importer-authored string and has a test
 * pinning each field it emits to a visible row.
 */
function referenceFromDocument(root: Document): string | null {
  const island = root.getElementById(AGENT_REFERENCE_SCRIPT_ID);
  const text = island?.textContent ?? '';
  return text.trim().length > 0 ? text : null;
}

async function probe(token: string): Promise<boolean> {
  try {
    const response = await fetch(AI_BRIDGE_SESSION_ROUTE, {
      method: 'POST',
      headers: { [AI_BRIDGE_TOKEN_HEADER]: token },
      body: '{}',
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface Panel {
  readonly element: HTMLElement;
  readonly output: HTMLElement;
  readonly question: HTMLTextAreaElement;
  readonly submit: HTMLButtonElement;
  readonly status: HTMLElement;
}

function buildPanel(): Panel {
  const element = document.createElement('aside');
  element.className = 'ai-chat';
  element.dataset.aiBridge = AI_BRIDGE_SENTINEL;

  const style = document.createElement('style');
  style.textContent = STYLES;
  element.append(style);

  const drawer = document.createElement('details');
  drawer.className = 'ai-chat-drawer';
  const summary = document.createElement('summary');
  summary.textContent = 'Local AI helper (dev only)';
  drawer.append(summary);

  const note = document.createElement('p');
  note.className = 'ai-chat-note';
  note.textContent =
    'Runs the local claude CLI with no tools and reads this page’s build ' +
    'reference. Its reply is text and nothing else: it changes no character, ' +
    'and it can describe actions it did not take, so treat it as an opinion ' +
    'rather than a record.';
  drawer.append(note);

  const form = document.createElement('form');
  form.className = 'ai-chat-form';
  const label = document.createElement('label');
  label.htmlFor = 'ai-chat-question';
  label.textContent = 'Ask about this build';
  const question = document.createElement('textarea');
  question.id = 'ai-chat-question';
  question.maxLength = AI_CHAT_MAX_MESSAGE_LENGTH;
  const actions = document.createElement('div');
  actions.className = 'ai-chat-actions';
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.textContent = 'Ask';
  const status = document.createElement('span');
  status.className = 'ai-chat-status';
  status.setAttribute('role', 'status');
  actions.append(submit, status);
  form.append(label, question, actions);
  drawer.append(form);

  // `output` is written with textContent only. Nothing from the model is ever
  // parsed as markup or evaluated.
  const output = document.createElement('pre');
  output.className = 'ai-chat-output';
  output.setAttribute('aria-live', 'polite');
  drawer.append(output);

  element.append(drawer);
  return { element, output, question, submit, status };
}

async function ask(panel: Panel, token: string, message: string): Promise<void> {
  const params: AiChatParams = {
    message,
    reference: referenceFromDocument(document),
  };
  const body = JSON.stringify({ id: 1, method: AI_CHAT_METHOD, params });

  let response: Response;
  try {
    response = await fetch(AI_BRIDGE_CHAT_ROUTE, {
      method: 'POST',
      headers: {
        [AI_BRIDGE_TOKEN_HEADER]: token,
        'content-type': 'application/json',
      },
      body,
    });
  } catch {
    panel.status.textContent = 'The local bridge did not answer.';
    return;
  }
  const stream = response.body;
  if (stream === null) {
    panel.status.textContent = 'The local bridge sent no stream.';
    return;
  }

  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done = false;
  while (!done) {
    const chunk = await reader.read();
    if (chunk.done) {
      done = true;
      buffer += decoder.decode();
    } else {
      buffer += decoder.decode(chunk.value, { stream: true });
    }
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim().length === 0) {
        continue;
      }
      let frame: unknown;
      try {
        frame = JSON.parse(line);
      } catch {
        continue;
      }
      if (!isAiFrame(frame)) {
        continue;
      }
      if (frame.t === 'delta') {
        panel.output.append(document.createTextNode(frame.text));
      } else if (frame.t === 'error') {
        panel.status.textContent = frame.error.message;
        done = true;
      } else {
        panel.status.textContent = 'Done.';
        done = true;
      }
    }
  }
}

/**
 * Returns the panel it mounted, or null when there is no bridge to talk to.
 * Callers get a value rather than a thrown error precisely because absence is
 * the ordinary case.
 */
export async function mountAiChat(host: HTMLElement): Promise<HTMLElement | null> {
  const token = tokenFromDocument(document);
  if (token === null) {
    return null;
  }
  if (!(await probe(token))) {
    return null;
  }

  const panel = buildPanel();
  let running = false;
  panel.element.querySelector('form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = panel.question.value.trim();
    if (running || message.length === 0) {
      return;
    }
    running = true;
    panel.submit.disabled = true;
    panel.output.textContent = '';
    panel.status.textContent = 'Asking…';
    void ask(panel, token, message).finally(() => {
      running = false;
      panel.submit.disabled = false;
    });
  });
  host.append(panel.element);
  return panel.element;
}
