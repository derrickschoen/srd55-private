/**
 * Marks a string whose author is unverified.
 *
 * Character names, source display names and placeholder spell names can all
 * arrive in a character share link written by somebody other than the person
 * reading the page, and nothing in the schema records which did. Any reader of
 * the rendered page — a person, a screen reader, or a browser extension — sees
 * that text as ordinary page content, so the only honest mitigation is to make
 * its provenance legible where it is rendered.
 *
 * What this deliberately does NOT do: filter, strip or rewrite the text.
 * Keyword filtering of prompt-injection strings is trivially bypassable and
 * would only manufacture confidence that the problem had been solved.
 *
 * The `data-free-text` attribute is a machine hook, not a hiding place: it
 * carries no content of its own, and the same provenance is stated visibly in
 * the planner's "Free text on this page" reference section (D4 — collapsed,
 * never hidden).
 */
export const FREE_TEXT_MARKER = 'unverified-origin';

export function freeTextSpan(value: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = 'free-text';
  span.dataset.freeText = FREE_TEXT_MARKER;
  span.textContent = value;
  return span;
}
