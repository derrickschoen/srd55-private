/**
 * Reproduced verbatim from docs/srd/ATTRIBUTION.md. CC-BY-4.0 obliges this exact
 * wording wherever SRD-derived content ships, so it must not be paraphrased or
 * shortened, and no further attribution to the licensor may accompany it.
 */
export const SRD_ATTRIBUTION_NOTICE =
  'This work includes material from the System Reference Document 5.2.1 ' +
  '("SRD 5.2.1") by Wizards of the Coast LLC, available at ' +
  'https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative ' +
  'Commons Attribution 4.0 International License, available at ' +
  'https://creativecommons.org/licenses/by/4.0/legalcode.';

/** Matches the notice's URLs without swallowing the sentence-ending period. */
const noticeUrl = /(https?:\/\/\S*[^\s.])/;

/**
 * Splits the notice into alternating literal and URL segments, the URLs at odd
 * indices. Joining the segments reproduces the notice exactly, so callers may
 * mark up the URLs without altering the text that ships.
 */
export function srdAttributionSegments(): readonly string[] {
  return SRD_ATTRIBUTION_NOTICE.split(noticeUrl);
}
