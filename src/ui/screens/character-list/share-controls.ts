import QRCode from 'qrcode';
import type { CharacterSummary } from '../../../domain/read-models';
import type { RpcClient } from '../../../rpc/client';
import {
  createShareClient,
  type ShareClient,
} from '../../../sharing/client';
import type { SharePreview } from '../../../sharing/character-share';
import type { ContentImportPlan } from '../../../catalog/content-adoption';
import type { ContentImportDisclosure } from '../../../catalog/content-adoption';
import {
  contentProvenanceDetails,
  contentProvenanceLabel,
  incomingContentProvenanceLabel,
} from '../../../catalog/content-provenance';
import { createContentAdoptionDialog } from '../../content-adoption-dialog';
import {
  BUNDLED_HOMEBREW_IMPORT_ROUTE,
  LIBRARY_IMPORT_ROUTE,
} from './import-backup-controls';
import { contentImportLabel } from '../../../sharing/import-issues';
import { element, listen, type Cleanup } from '../../dom';
import { announceTransferFailure } from './transfer-failure';
import { freeTextSpan } from '../../free-text';

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

interface DisplayIssue {
  readonly code?: string;
  readonly summary: string;
  readonly remedy: string;
  readonly remedyKind?: 'bundled-homebrew' | 'library-json';
  readonly contentKey?: string;
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
            ...(typeof Reflect.get(entry, 'code') === 'string'
              ? { code: Reflect.get(entry, 'code') as string }
              : {}),
            summary: (entry as DisplayIssue).summary,
            remedy: (entry as DisplayIssue).remedy,
            ...(Reflect.get(entry, 'remedyKind') === 'bundled-homebrew' ||
              Reflect.get(entry, 'remedyKind') === 'library-json'
              ? { remedyKind: Reflect.get(entry, 'remedyKind') as
                  'bundled-homebrew' | 'library-json' }
              : {}),
            ...(Array.isArray(Reflect.get(entry, 'contentKeys')) &&
              typeof (Reflect.get(entry, 'contentKeys') as unknown[])[0] === 'string'
              ? { contentKey: (Reflect.get(entry, 'contentKeys') as string[])[0] }
              : {}),
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

function previewCountsText(preview: SharePreview): string {
  // Weapons are named only when there are some. Nought weapons is the common
  // case and a permanent "0 weapons" would be noise; a non-zero count is a
  // section the recipient is about to receive and should be told about.
  // The sheet inputs are named on the same terms as weapons: a section the
  // recipient is about to receive, listed only when there is one. Their absence
  // is the honest reading of a link that carried none, and printing a permanent
  // row of zeroes would bury the counts that matter.
  const sheet = [
    preview.armorCount === 0
      ? null
      : `${String(preview.armorCount)} armour`,
    preview.hitPointRollCount === 0
      ? null
      : `${String(preview.hitPointRollCount)} hit point rolls`,
    preview.skillProficiencyCount === 0
      ? null
      : `${String(preview.skillProficiencyCount)} skill proficiencies`,
  ].filter((item): item is string => item !== null);
  return `${preview.selectionCount} selections, ${
    preview.spellbookCount
  } spellbook spells, ${preview.sourceCount} other sources${
    preview.weaponCount === 0 ? '' : `, ${preview.weaponCount} weapons`
  }${sheet.length === 0 ? '' : `, ${sheet.join(', ')}`}.${
    preview.placeholderCount === 0
      ? ''
      : ` ${preview.placeholderCount} unavailable spells will be added as safe placeholders.`
  }`;
}

function previewCatalogName(
  disclosure: SharePreview['classes'][number]['class'],
  kind: 'class' | 'subclass',
): string {
  const name = disclosure.name.trim();
  return name === '' || name === 'UNKNOWN'
    ? `Unknown ${kind} name`
    : disclosure.name;
}

export function createShareControls(
  options: ShareControlsOptions,
): ShareControls {
  const client = options.client ?? createShareClient(options.rpc);
  const browser = options.browser ?? defaultBrowserSharing();
  const cleanups: Cleanup[] = [];
  let activeFragment: string | null = null;
  let activePreview: SharePreview | null = null;
  let adoptionCleanup: Cleanup | null = null;
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
  const previewLayers = element('p', {
    className: 'share-preview-layers',
    attributes: { hidden: '' },
  });
  const embeddedContent = element('section', {
    className: 'share-embedded-content',
    attributes: { hidden: '', 'aria-label': 'Embedded external content' },
  });
  previewPanel.append(
    previewTitle,
    previewDetails,
    previewLayers,
    embeddedContent,
    addButton,
  );

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
  // D124's single written-text opt-in is unchecked by default. That consent
  // covers all four authored fields; the label names every field it can send.
  const includeWrittenText = element('input', {
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

  function announce(message: string | Node, error = false): void {
    status.replaceChildren(message);
    status.classList.toggle('transfer-error', error);
    status.setAttribute('role', error ? 'alert' : 'status');
  }

  function shareAddedAnnouncement(result: {
    readonly characterId: number;
    readonly characterName: string;
  }): Node {
    const message = document.createDocumentFragment();
    message.append(freeTextSpan(result.characterName), ' was added. ');
    message.append(element('a', {
      text: 'Open character',
      attributes: {
        href: `/characters/${String(result.characterId)}`,
      },
    }), '.');
    return message;
  }

  function contentDisclosure(disclosure: ContentImportDisclosure): HTMLElement {
    const label = element('span');
    label.append(
      freeTextSpan(disclosure.name),
      ` — ${disclosure.kind} — ${
        disclosure.provenance === undefined
          ? 'Homebrew from the sender — a local copy will be added to your library'
          : incomingContentProvenanceLabel(disclosure.provenance)
      }`,
    );
    if (disclosure.provenance === undefined) return label;
    const details = contentProvenanceDetails(disclosure.provenance);
    if (details.length === 0) return label;
    const technical = element('details');
    technical.append(element('summary', { text: 'Attribution details' }));
    for (const detail of details) {
      const line = element('p');
      line.append(`${detail.label}: `, freeTextSpan(detail.value));
      technical.append(line);
    }
    return element('span', {}, [label, technical]);
  }

  function renderEmbeddedContent(
    disclosures: readonly ContentImportDisclosure[],
  ): void {
    embeddedContent.replaceChildren();
    embeddedContent.hidden = disclosures.length === 0;
    if (disclosures.length === 0) return;
    const list = element('ul');
    for (const disclosure of disclosures) {
      list.append(element('li', {}, [contentDisclosure(disclosure)]));
    }
    embeddedContent.append(
      element('p', {
        text: 'This external content will be installed with the character:',
      }),
      list,
    );
  }

  function renderPreviewDetails(preview: SharePreview): void {
    const previewOriginLabel = (
      disclosure: SharePreview['classes'][number]['class'],
    ): string => {
      if (disclosure.incoming) {
        return disclosure.provenance === undefined
          ? 'Homebrew from the sender — a local copy will be added to your library'
          : incomingContentProvenanceLabel(disclosure.provenance);
      }
      if (disclosure.provenance !== undefined) {
        return contentProvenanceLabel(disclosure.provenance);
      }
      switch (disclosure.catalog_layer) {
        case 'bundled': return 'Built into the app';
        case 'external': return 'Homebrew in your library';
        case 'unknown': return 'Origin not recorded';
      }
    };
    previewDetails.replaceChildren();
    const classSummary = element('span', {
      className: 'share-preview-classes',
    });
    if (preview.classes.length === 0) {
      classSummary.textContent = 'No classes';
    } else {
      for (const [index, item] of preview.classes.entries()) {
        if (index > 0) classSummary.append(', ');
        classSummary.append(freeTextSpan(previewCatalogName(item.class, 'class')));
        if (item.subclass !== undefined) {
          classSummary.append(
            ' / ',
            freeTextSpan(previewCatalogName(item.subclass, 'subclass')),
          );
        }
        classSummary.append(` ${String(item.level)}`);
      }
    }
    previewDetails.append(classSummary, `. ${previewCountsText(preview)}`);

    previewLayers.replaceChildren();
    previewLayers.hidden = preview.classes.length === 0;
    for (const [index, item] of preview.classes.entries()) {
      if (index > 0) previewLayers.append('; ');
      previewLayers.append(
        freeTextSpan(previewCatalogName(item.class, 'class')),
        ` — ${previewOriginLabel(item.class)}`,
      );
      if (item.subclass !== undefined) {
        previewLayers.append(
          ' / ',
          freeTextSpan(previewCatalogName(item.subclass, 'subclass')),
          ` — ${previewOriginLabel(item.subclass)}`,
        );
      }
    }
  }

  function shareReadyAnnouncement(
    base: string,
    disclosures: readonly ContentImportDisclosure[],
  ): Node {
    const message = document.createDocumentFragment();
    message.append(base);
    if (disclosures.length === 0) return message;
    message.append(' Embedded external content: ');
    for (const [index, disclosure] of disclosures.entries()) {
      if (index > 0) message.append(', ');
      message.append(contentDisclosure(disclosure));
    }
    message.append('.');
    return message;
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
      announceTransferFailure(status, error);
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
      const linksToImport = issue.remedyKind !== undefined;
      const how = linksToImport
        ? document.createElement('a')
        : document.createElement('span');
      how.className = 'share-issue-remedy';
      how.textContent = issue.remedy;
      if (linksToImport) {
        const route = issue.remedyKind === 'bundled-homebrew'
          ? BUNDLED_HOMEBREW_IMPORT_ROUTE
          : LIBRARY_IMPORT_ROUTE;
        how.setAttribute(
          'href',
          activeFragment === null ? route : `${route}#${activeFragment}`,
        );
      }
      item.append(what, ' ', how);
      if (issue.contentKey !== undefined) {
        const technical = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Technical details';
        const key = document.createElement('code');
        key.textContent = `Internal content key: ${issue.contentKey}`;
        technical.append(summary, key);
        item.append(technical);
      }
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
      activeFragment = fragment;
      const result = await client.preview(fragment);
      activePreview = result;
      previewTitle.textContent = result.name;
      renderPreviewDetails(result);
      renderEmbeddedContent(result.embeddedContent);
      previewPanel.hidden = false;
      addButton.hidden = false;
      announce('Preview ready. Nothing has been imported.');
    } catch (error) {
      activePreview = null;
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
      if (
        activeFragment === null || activePreview === null ||
        addButton.disabled
      ) {
        return;
      }
      const fragment = activeFragment;
      const showAdoptionDialog = (plan: ContentImportPlan): void => {
        adoptionCleanup?.();
        const rendered = createContentAdoptionDialog({
          mount: root,
          plan,
          replan: async (choices) =>
            (await client.preview(fragment, choices)).adoptionPlan,
          commit: (submitted, choices) => client.commitCharacter(
            fragment,
            submitted.token,
            choices,
          ),
          onCommitted: async (result) => {
            const shareResult = result as typeof result & {
              readonly result: {
                readonly characterId: number;
                readonly characterName: string;
              };
            };
            await options.onPersistedChange();
            announce(shareAddedAnnouncement(shareResult.result));
            addButton.hidden = true;
            activeFragment = null;
            activePreview = null;
          },
          onCancel: () => announce('Shared character import cancelled.'),
        });
        adoptionCleanup = rendered.cleanup;
      };
      if (
        activePreview.adoptionPlan.reviews.length > 0 ||
        activePreview.adoptionPlan.outcomes.some(
          (outcome) => outcome.kind === 'refused',
        )
      ) {
        showAdoptionDialog(activePreview.adoptionPlan);
        announce('Review each matching catalog entry before importing.');
        return;
      }
      addButton.disabled = true;
      announce('Adding a new character…');
      void client
        .commitCharacter(fragment, activePreview.adoptionPlan.token, {})
        .then(async (result) => {
          if (result.kind === 'stale-plan') {
            showAdoptionDialog(result.freshPlan);
            announce('The catalog changed. Review the refreshed share import.');
            return;
          }
          if (result.kind === 'refused') {
            throw new TypeError('Shared character import was refused.');
          }
          await options.onPersistedChange();
          announce(shareAddedAnnouncement(result.result));
          addButton.hidden = true;
          activeFragment = null;
          activePreview = null;
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
        .createFragmentResult(requestedCharacter.id, {
          acknowledgements: includeAcks.checked,
          loadouts: includeLoadouts.checked,
          writtenText: includeWrittenText.checked,
        })
        .then(async (result) => {
          if (
            generation !== exportGeneration ||
            exporting?.id !== requestedCharacter.id
          ) {
            return;
          }
          if (result.kind === 'too_large') {
            announce(
              `This character is too large to share as a link. Share links are limited to ${result.maximumEncodedCharacters.toLocaleString('en-US')} encoded characters.`,
              true,
            );
            return;
          }
          const fragment = result.fragment;
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
            'omittedContent' in result
              ? `Share link ready without external content. The recipient must import ${
                  result.omittedContent.map((item) =>
                    contentImportLabel(item.kind, item.contentKey, item.name)
                  ).join(', ')
                } before opening it.`
              : shareReadyAnnouncement(
                  link.length <= QR_MAX_LINK_LENGTH
                    ? 'Share link and QR code ready.'
                    : 'Share link ready. It is too long for a reliable QR code.',
                  result.embeddedContent,
                ),
            'omittedContent' in result,
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
        .catch((error: unknown) => announceTransferFailure(status, error));
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
          text: `Add ${exporting.name} to SRD-55`,
          url: linkOutput.value,
        })
        .catch((error: unknown) => {
          if (
            !(error instanceof DOMException) ||
            error.name !== 'AbortError'
          ) {
            announceTransferFailure(status, error);
          }
        });
    }),
  );

  const root = element('section', { className: 'share-panel panel' }, [
    element('div', { className: 'share-columns' }, [
      element('div', { className: 'share-column' }, [
        exportTitle,
        element('p', {
          text: 'Share links include referenced external content when it fits. If it does not fit, the recipient can import the content named in the warning before opening the link.',
        }),
        element('label', { className: 'share-option' }, [
          includeAcks,
          element('span', { text: 'Include warning acknowledgements' }),
        ]),
        element('label', { className: 'share-option' }, [
          includeLoadouts,
          element('span', { text: 'Include loadouts' }),
        ]),
        element('label', { className: 'share-option' }, [
          includeWrittenText,
          element('span', {
            text: 'Include my written text (alignment, appearance, backstory, notes)',
          }),
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
      exportButton.focus();
    },
    cleanup: () => {
      adoptionCleanup?.();
      for (const cleanup of cleanups.splice(0)) {
        cleanup();
      }
    },
  };
}
