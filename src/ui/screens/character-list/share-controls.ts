import QRCode from 'qrcode';
import type { CharacterSummary } from '../../../domain/read-models';
import type { RpcClient } from '../../../rpc/client';
import {
  createShareClient,
  type ShareClient,
} from '../../../sharing/client';
import type { SharePreview } from '../../../sharing/character-share';
import { element, listen, type Cleanup } from '../../dom';

const QR_MAX_LINK_LENGTH = 2_000;

interface BrowserSharing {
  readonly copy?: (text: string) => Promise<void>;
  readonly share?: (data: ShareData) => Promise<void>;
  readonly baseUrl: string;
}

export interface ShareControlsOptions {
  readonly rpc: RpcClient;
  readonly onPersistedChange: () => void | Promise<void>;
  readonly initialFragment?: string;
  readonly client?: ShareClient;
  readonly browser?: BrowserSharing;
}

export interface ShareControls {
  readonly element: HTMLElement;
  shareCharacter(character: Pick<CharacterSummary, 'id' | 'name'>): void;
  readonly cleanup: Cleanup;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface DisplayIssue {
  readonly summary: string;
  readonly remedy: string;
}

/**
 * Recover compatibility issues from an RPC failure.
 *
 * The worker sends them as `data.issues`; anything else — a malformed-share
 * error, a transport failure, a programming error — yields an empty list and
 * falls back to the plain message. Shapes are checked rather than trusted:
 * this crosses a postMessage boundary.
 */
function compatibilityIssues(error: unknown): readonly DisplayIssue[] {
  const data = (error as { data?: unknown } | null)?.data;
  if (data === null || typeof data !== 'object') {
    return [];
  }
  const issues = (data as { issues?: unknown }).issues;
  if (!Array.isArray(issues)) {
    return [];
  }
  return issues.flatMap((entry) =>
    entry !== null &&
    typeof entry === 'object' &&
    typeof (entry as DisplayIssue).summary === 'string' &&
    typeof (entry as DisplayIssue).remedy === 'string'
      ? [
          {
            summary: (entry as DisplayIssue).summary,
            remedy: (entry as DisplayIssue).remedy,
          },
        ]
      : [],
  );
}

function defaultBrowserSharing(): BrowserSharing {
  return {
    ...(navigator.clipboard?.writeText === undefined
      ? {}
      : {
          copy: (text: string) => navigator.clipboard.writeText(text),
        }),
    ...(typeof navigator.share !== 'function'
      ? {}
      : { share: (data: ShareData) => navigator.share(data) }),
    baseUrl: `${location.origin}${location.pathname}${location.search}`,
  };
}

export function fragmentFromShareLink(value: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new TypeError('Paste a character share link.');
  }
  const hashIndex = trimmed.indexOf('#');
  if (hashIndex < 0 && trimmed.includes('://')) {
    throw new TypeError('The share link has no character fragment.');
  }
  const fragment =
    hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : trimmed.replace(/^#/, '');
  if (fragment === '') {
    throw new TypeError('The share link has no character fragment.');
  }
  return fragment;
}

function previewText(preview: SharePreview): string {
  const classes =
    preview.classes.length === 0
      ? 'No classes'
      : preview.classes
          .map(
            (item) =>
              `${item.classKey}${
                item.subclassKey === undefined
                  ? ''
                  : ` / ${item.subclassKey}`
              } ${item.level}`,
          )
          .join(', ');
  return `${classes}. ${preview.selectionCount} selections, ${
    preview.spellbookCount
  } spellbook spells, ${preview.sourceCount} other sources.${
    preview.placeholderCount === 0
      ? ''
      : ` ${preview.placeholderCount} unavailable spells will be added as safe placeholders.`
  }`;
}

export function createShareControls(
  options: ShareControlsOptions,
): ShareControls {
  const client = options.client ?? createShareClient(options.rpc);
  const browser = options.browser ?? defaultBrowserSharing();
  const cleanups: Cleanup[] = [];
  let activeFragment: string | null = null;
  let exporting: Pick<CharacterSummary, 'id' | 'name'> | null = null;

  const status = element('p', {
    className: 'share-status',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const input = element('input', {
    className: 'field',
    attributes: {
      type: 'url',
      placeholder: 'Paste a character share link',
      'aria-label': 'Character share link',
    },
  });
  const previewButton = element('button', {
    className: 'button-secondary',
    text: 'Preview link',
    attributes: { type: 'button' },
  });
  const addButton = element('button', {
    className: 'button-primary',
    text: 'Add to my characters',
    attributes: { type: 'button', hidden: '' },
  });
  const previewPanel = element('section', {
    className: 'share-preview',
    attributes: { hidden: '', 'aria-label': 'Shared character preview' },
  });
  const previewTitle = element('h3');
  const previewDetails = element('p');
  previewPanel.append(previewTitle, previewDetails, addButton);

  const linkOutput = element('input', {
    className: 'field share-link-output',
    attributes: {
      readonly: '',
      'aria-label': 'Generated character share link',
      hidden: '',
    },
  });
  const copyButton = element('button', {
    className: 'button-secondary',
    text: 'Copy link',
    attributes: {
      type: 'button',
      hidden: '',
    },
  });
  const nativeShareButton = element('button', {
    className: 'button-secondary',
    text: 'Share…',
    attributes: {
      type: 'button',
      hidden: '',
    },
  });
  const qr = element('img', {
    className: 'share-qr',
    attributes: {
      alt: 'QR code for character share link',
      hidden: '',
      width: '224',
      height: '224',
    },
  });
  const includeAcks = element('input', {
    attributes: { type: 'checkbox' },
  });
  const includeLoadouts = element('input', {
    attributes: { type: 'checkbox' },
  });
  const exportButton = element('button', {
    className: 'button-primary',
    text: 'Create share link',
    attributes: { type: 'button', disabled: '' },
  });
  const exportTitle = element('h3', { text: 'Share a character' });
  let exportGeneration = 0;

  function invalidateGeneratedLink(): void {
    exportGeneration += 1;
    linkOutput.value = '';
    linkOutput.hidden = true;
    copyButton.hidden = true;
    nativeShareButton.hidden = true;
    qr.hidden = true;
    qr.removeAttribute('src');
  }

  function announce(message: string, error = false): void {
    status.replaceChildren(message);
    status.classList.toggle('transfer-error', error);
    status.setAttribute('role', error ? 'alert' : 'status');
  }

  /**
   * Render catalog-compatibility failures as a list.
   *
   * A drifted or homebrew catalog usually breaks several things at once, and
   * collapsing them into one sentence forces the user to re-import repeatedly
   * to discover the rest. Falls back to the plain message whenever the failure
   * is not a compatibility failure, or the worker did not send issue data.
   */
  function announceFailure(error: unknown): void {
    const issues = compatibilityIssues(error);
    if (issues.length === 0) {
      announce(errorMessage(error), true);
      return;
    }
    const heading = document.createElement('p');
    heading.textContent =
      issues.length === 1
        ? 'This character cannot be imported:'
        : `This character cannot be imported — ${issues.length} problems:`;
    const list = document.createElement('ul');
    list.className = 'share-issue-list';
    for (const issue of issues) {
      const item = document.createElement('li');
      const what = document.createElement('span');
      // textContent, never innerHTML: content keys and names originate in a
      // share link a stranger may have crafted.
      what.textContent = issue.summary;
      const how = document.createElement('span');
      how.className = 'share-issue-remedy';
      how.textContent = issue.remedy;
      item.append(what, ' ', how);
      list.append(item);
    }
    status.replaceChildren(heading, list);
    status.classList.add('transfer-error');
    status.setAttribute('role', 'alert');
  }

  async function preview(value: string): Promise<void> {
    previewButton.disabled = true;
    addButton.hidden = true;
    previewPanel.hidden = true;
    announce('Checking share link…');
    try {
      const fragment = fragmentFromShareLink(value);
      const result = await client.preview(fragment);
      activeFragment = fragment;
      previewTitle.textContent = result.name;
      previewDetails.textContent = previewText(result);
      previewPanel.hidden = false;
      addButton.hidden = false;
      announce('Preview ready. Nothing has been imported.');
    } catch (error) {
      activeFragment = null;
      announceFailure(error);
    } finally {
      previewButton.disabled = false;
    }
  }

  cleanups.push(
    listen(previewButton, 'click', () => {
      void preview(input.value);
    }),
    listen(addButton, 'click', () => {
      if (activeFragment === null || addButton.disabled) {
        return;
      }
      addButton.disabled = true;
      announce('Adding a new character…');
      void client
        .importCharacter(activeFragment)
        .then(async (result) => {
          await options.onPersistedChange();
          announce(`Character added as #${result.characterId}.`);
          addButton.hidden = true;
          activeFragment = null;
        })
        .catch((error: unknown) => announceFailure(error))
        .finally(() => {
          addButton.disabled = false;
        });
    }),
    listen(exportButton, 'click', () => {
      if (exporting === null || exportButton.disabled) {
        return;
      }
      const requestedCharacter = exporting;
      invalidateGeneratedLink();
      const generation = exportGeneration;
      exportButton.disabled = true;
      announce('Creating share link…');
      void client
        .createFragment(requestedCharacter.id, {
          acknowledgements: includeAcks.checked,
          loadouts: includeLoadouts.checked,
        })
        .then(async (fragment) => {
          if (
            generation !== exportGeneration ||
            exporting?.id !== requestedCharacter.id
          ) {
            return;
          }
          const link = `${browser.baseUrl}#${fragment}`;
          linkOutput.value = link;
          linkOutput.hidden = false;
          copyButton.hidden = browser.copy === undefined;
          nativeShareButton.hidden = browser.share === undefined;
          if (link.length <= QR_MAX_LINK_LENGTH) {
            qr.src = await QRCode.toDataURL(link, {
              errorCorrectionLevel: 'M',
              margin: 1,
              width: 224,
            });
            qr.hidden = false;
          } else {
            qr.hidden = true;
            qr.removeAttribute('src');
          }
          announce(
            link.length <= QR_MAX_LINK_LENGTH
              ? 'Share link and QR code ready.'
              : 'Share link ready. It is too long for a reliable QR code.',
          );
        })
        .catch((error: unknown) => announceFailure(error))
        .finally(() => {
          exportButton.disabled = exporting === null;
        });
    }),
    listen(copyButton, 'click', () => {
      if (browser.copy === undefined || linkOutput.value === '') {
        return;
      }
      void browser
        .copy(linkOutput.value)
        .then(() => announce('Share link copied.'))
        .catch((error: unknown) => announce(errorMessage(error), true));
    }),
    listen(nativeShareButton, 'click', () => {
      if (
        browser.share === undefined ||
        linkOutput.value === '' ||
        exporting === null
      ) {
        return;
      }
      void browser
        .share({
          title: exporting.name,
          text: `Add ${exporting.name} to Spell Planner`,
          url: linkOutput.value,
        })
        .catch((error: unknown) => {
          if (
            !(error instanceof DOMException) ||
            error.name !== 'AbortError'
          ) {
            announce(errorMessage(error), true);
          }
        });
    }),
  );

  const root = element('section', { className: 'share-panel panel' }, [
    element('div', { className: 'share-columns' }, [
      element('div', { className: 'share-column' }, [
        exportTitle,
        element('p', {
          text: 'Only character choices are included; spell rules text is never embedded.',
        }),
        element('label', { className: 'share-option' }, [
          includeAcks,
          element('span', { text: 'Include warning acknowledgements' }),
        ]),
        element('label', { className: 'share-option' }, [
          includeLoadouts,
          element('span', { text: 'Include loadouts' }),
        ]),
        exportButton,
        linkOutput,
        element('div', { className: 'share-actions' }, [
          copyButton,
          nativeShareButton,
        ]),
        qr,
      ]),
      element('div', { className: 'share-column' }, [
        element('h3', { text: 'Open a shared character' }),
        element('p', {
          text: 'Previewing never changes your characters.',
        }),
        input,
        previewButton,
        previewPanel,
      ]),
    ]),
    status,
  ]);

  if (options.initialFragment !== undefined && options.initialFragment !== '') {
    input.value = `${browser.baseUrl}#${options.initialFragment}`;
    void preview(input.value);
  }

  return {
    element: root,
    shareCharacter: (character) => {
      exporting = character;
      invalidateGeneratedLink();
      exportTitle.textContent = `Share ${character.name}`;
      exportButton.disabled = false;
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      announce(
        `Ready to create a link for ${character.name}. Optional private organization stays off by default.`,
      );
    },
    cleanup: () => {
      for (const cleanup of cleanups.splice(0)) {
        cleanup();
      }
    },
  };
}
