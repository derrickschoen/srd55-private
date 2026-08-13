import { srdAttributionSegments } from '../../../rules/srd-attribution';

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
        </section>
      </main>
    </div>`;
}
