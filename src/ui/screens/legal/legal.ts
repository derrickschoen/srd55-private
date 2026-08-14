import { srdAttributionSegments } from '../../../rules/srd-attribution';

/**
 * Where the build puts the two licence texts it ships. Emitted by the
 * `bundled-license-texts` plugin in vite.config.ts from the list in
 * `tools/licenses/bundled-license-files.ts`; the paths are relative because the
 * build's `base` is, so the app keeps working under a sub-path deploy.
 *
 * `tests/unit/licensing/bundled-license-files.test.ts` holds these strings to
 * the emitted filenames, so a renamed asset cannot leave a dead link behind on
 * the one page whose job is to make the licences readable.
 */
const CC_BY_LEGALCODE_HREF = './licenses/CC-BY-4.0.txt';
const MIT_LICENSE_HREF = './LICENSE.txt';

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Links the notice's URLs without changing a character of its text. */
function attributionNotice(): string {
  return srdAttributionSegments()
    .map((segment, index) =>
      index % 2 === 0
        ? escapeHtml(segment)
        : `<a href="${escapeHtml(segment)}" rel="noreferrer">${escapeHtml(segment)}</a>`,
    )
    .join('');
}

export function renderLegalPage(): string {
  return `
    <div class="legal-page" data-screen="legal">
      <main>
        <header class="legal-header">
          <a href="/" data-router-link>Back to characters</a>
          <h1>Licences and attribution</h1>
        </header>

        <section class="legal-section">
          <h2>System Reference Document 5.2.1</h2>
          <p class="srd-attribution" data-testid="srd-attribution">${attributionNotice()}</p>
          <p>The class list, the cantrip and spell-slot progressions, and the
            multiclass spellcaster slot table SRD-55 calculates with are
            derived from that document.</p>
          <p>Spell descriptions and other rules text include bundled SRD 5.2.1
            content. Catalogs you import from your own copies stay in your
            browser: nothing you import is uploaded, and a share link carries
            your own choices — spell identifiers and names — never rules text.</p>
          <p>The complete terms travel with this app rather than only being
            linked: <a href="${CC_BY_LEGALCODE_HREF}"
            data-testid="cc-by-legalcode">read the bundled CC-BY-4.0
            legalcode</a>.</p>
        </section>

        <section class="legal-section">
          <h2>This application</h2>
          <p>SRD-55's own code is under the MIT licence, whose permission
            notice ships with every build:
            <a href="${MIT_LICENSE_HREF}" data-testid="mit-license">read the
            bundled MIT licence</a>. It covers the software only — the game
            content above keeps the licence and attribution requirements
            described there.</p>
        </section>
      </main>
    </div>`;
}
