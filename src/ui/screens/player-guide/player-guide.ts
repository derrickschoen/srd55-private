export type PlayerGuideBlock =
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'list'; readonly ordered: boolean; readonly items: readonly string[] };

function headingLevel(marker: string): 1 | 2 | 3 {
  if (marker === '#') return 1;
  if (marker === '##') return 2;
  return 3;
}

/**
 * The player guide intentionally uses a small Markdown vocabulary. Parsing it
 * into text nodes keeps the checked-in document as the one copy shown both in
 * the repository and in the app, without permitting Markdown HTML to execute.
 */
export function playerGuideBlocks(markdown: string): readonly PlayerGuideBlock[] {
  const blocks: PlayerGuideBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
    paragraph = [];
  };
  const flushList = (): void => {
    if (list === null) return;
    blocks.push({ kind: 'list', ordered: list.ordered, items: [...list.items] });
    list = null;
  };

  for (const sourceLine of markdown.split(/\r?\n/u)) {
    const line = sourceLine.trim();
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (heading !== null) {
      flushParagraph();
      flushList();
      blocks.push({
        kind: 'heading',
        level: headingLevel(heading[1] ?? ''),
        text: heading[2] ?? '',
      });
      continue;
    }
    const ordered = /^\d+\.\s+(.+)$/u.exec(line);
    const unordered = /^-\s+(.+)$/u.exec(line);
    const item = ordered?.[1] ?? unordered?.[1];
    if (item !== undefined) {
      flushParagraph();
      const isOrdered = ordered !== null;
      if (list === null || list.ordered !== isOrdered) {
        flushList();
        list = { ordered: isOrdered, items: [] };
      }
      list.items.push(item);
      continue;
    }
    flushList();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return Object.freeze(blocks);
}

