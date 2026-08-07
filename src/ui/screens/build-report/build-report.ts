import { abilities } from '../../../domain/enums';
import type { BuildReportResult } from '../../../reports/build-report-builder';
import { SRD_ATTRIBUTION_NOTICE } from '../../../rules/srd-attribution';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function titleCase(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function signed(value: number | null): string {
  return value === null ? '—' : `${value >= 0 ? '+' : ''}${value}`;
}

function spellLevel(level: number): string {
  if (level === 0) {
    return 'Cantrip';
  }
  return level < 0 ? 'Unknown' : `Level ${level}`;
}

function items(values: readonly string[], empty: string): string {
  if (values.length === 0) {
    return `<li class="empty-value">${escapeHtml(empty)}</li>`;
  }
  return values.map((value) => `<li>${escapeHtml(value)}</li>`).join('');
}

function routeAnnotation(
  route: BuildReportResult['access_routes'][number],
): string {
  const provenance =
    route.origin === 'capability'
      ? 'Capability route'
      : route.slot_key === null
        ? 'Selection route'
        : `Slot ${route.slot_key}`;
  return `${escapeHtml(titleCase(route.casting_mode))}
    <span class="report-muted">${escapeHtml(provenance)}</span>`;
}

/**
 * Produces escaped, deterministic markup without changing the report DTO.
 * Keeping this renderer pure also makes the read-only UI contract directly
 * testable without a browser DOM.
 */
export function renderBuildReport(report: BuildReportResult): string {
  const characterId = report.character.id;
  const warningCount = report.duplicate_assessments.filter(
    (assessment) => assessment.category !== 'none',
  ).length;
  const abilitiesMarkup = abilities
    .map(
      (ability) => `
        <article class="ability-card">
          <p>${escapeHtml(ability.slice(0, 3))}</p>
          <strong>${report.character.abilities[ability]}</strong>
        </article>`,
    )
    .join('');
  const slots =
    report.caster.slots.length === 0
      ? '<tr><td colspan="2" class="empty-value">No shared spell slots.</td></tr>'
      : report.caster.slots
          .map(
            (slot) => `
              <tr>
                <td>${slot.level}</td>
                <td class="numeric">${slot.count}</td>
              </tr>`,
          )
          .join('');
  const pact =
    report.caster.pact_magic === null
      ? '<p class="report-muted">No Pact Magic slots.</p>'
      : `<p><strong>Pact Magic:</strong>
          ${report.caster.pact_magic.count} × level
          ${report.caster.pact_magic.level}</p>`;
  const classes =
    report.classes.length === 0
      ? '<tr><td colspan="4" class="empty-value">No classes recorded.</td></tr>'
      : report.classes
          .map(
            (entry) => `
              <tr>
                <td>
                  <strong>${escapeHtml(entry.name)} ${entry.class_level}</strong>
                  ${
                    entry.subclass === null
                      ? ''
                      : `<span class="report-muted"> · ${escapeHtml(entry.subclass)}</span>`
                  }
                </td>
                <td>${
                  entry.spellcasting_ability === null
                    ? '—'
                    : escapeHtml(titleCase(entry.spellcasting_ability))
                }</td>
                <td class="numeric">${entry.prepared_count}</td>
                <td class="numeric">${escapeHtml(spellLevel(entry.max_preparable_level))}</td>
              </tr>`,
          )
          .join('');
  const catalogSources = report.catalog_sources.length === 0
    ? '<li class="empty-value">No applied catalog content is recorded.</li>'
    : report.catalog_sources
        .map(
          (source) => `
            <li data-catalog-kind="${escapeHtml(source.kind)}">
              <strong>${escapeHtml(source.name)}</strong> ·
              ${escapeHtml(titleCase(source.kind))} ·
              ${escapeHtml(catalogLayerLabel(source.catalog_layer))}
            </li>`,
        )
        .join('');
  const routes =
    report.access_routes.length === 0
      ? '<tr><td colspan="6" class="empty-value">No castable spell routes.</td></tr>'
      : report.access_routes
          .map(
            (route) => `
              <tr data-route="${route.spell_version_id}:${route.source_instance_id}:${escapeHtml(route.slot_key ?? route.casting_mode)}">
                <td>
                  <strong>${escapeHtml(route.spell_name)}</strong>
                  <span class="report-muted">${escapeHtml(spellLevel(route.spell_level))}${
                    route.rules_edition === '2024'
                      ? ''
                      : ` · ${escapeHtml(route.rules_edition)}`
                  } · ${escapeHtml(catalogLayerLabel(route.spell_catalog_layer))}</span>
                </td>
                <td>${escapeHtml(route.source_name)} · ${escapeHtml(
                  catalogLayerLabel(route.source_catalog_layer),
                )}</td>
                <td>${routeAnnotation(route)}</td>
                <td>${
                  route.spellcasting_ability === null
                    ? '—'
                    : escapeHtml(titleCase(route.spellcasting_ability))
                }</td>
                <td class="numeric">${escapeHtml(signed(route.attack_bonus))}</td>
                <td class="numeric">${route.save_dc ?? '—'}</td>
              </tr>`,
          )
          .join('');
  const spellbook = report.wizard.spellbook
    .map(
      (entry) =>
        `${entry.spell_name}${
          entry.active ? '' : ' (unavailable — removed from catalog)'
        } · ${catalogLayerLabel(entry.spell_catalog_layer)}`,
    );
  const prepared = report.wizard.prepared.map(
    (entry) =>
      `${entry.spell_name} · ${catalogLayerLabel(entry.spell_catalog_layer)}`,
  );
  const ritualOnly = report.wizard.ritual_only.map(
    (entry) =>
      `${entry.spell_name} · ${catalogLayerLabel(entry.spell_catalog_layer)}`,
  );
  const duplicateAssessments =
    report.duplicate_assessments.length === 0
      ? '<p class="empty-value">No spells to assess.</p>'
      : report.duplicate_assessments
          .map((assessment) => {
            const versions =
              assessment.versions.length > 1
                ? `<ul class="version-list">${assessment.versions
                    .map(
                      (version) =>
                        `<li>${escapeHtml(version.label)}</li>`,
                    )
                    .join('')}</ul>`
                : '';
            const slotsText =
              assessment.slots.length === 0
                ? ''
                : ` · Slots: ${escapeHtml(assessment.slots.join(', '))}`;
            const acknowledgement =
              assessment.acknowledgement === null
                ? ''
                : `<p class="acknowledgement"><strong>Acknowledged:</strong>
                    ${escapeHtml(assessment.acknowledgement.note)}</p>`;
            return `
              <article class="duplicate-card" data-category="${escapeHtml(assessment.category)}"${
                assessment.category === 'conflicting_version'
                  ? ' role="alert"'
                  : ''
              }>
                <div class="duplicate-heading">
                  <h3>${escapeHtml(assessment.spell_name)}</h3>
                  <span class="category-badge">${escapeHtml(titleCase(assessment.category))}</span>
                </div>
                <p>${escapeHtml(assessment.explanation)}</p>
                ${versions}
                <p class="report-muted">Sources: ${escapeHtml(assessment.sources.join(', '))}${slotsText}</p>
                ${acknowledgement}
              </article>`;
          })
          .join('');
  const invalidSelections =
    report.invalid_selections.length === 0
      ? '<p class="empty-value"><span aria-hidden="true">✓</span> Every visible selection is current and eligible.</p>'
      : `<ul class="invalid-list">${report.invalid_selections
          .map(
            (slot) => `
              <li>
                <span aria-hidden="true">⚠</span>
                <strong>${escapeHtml(slot.spell_name ?? 'Empty slot')}</strong>
                in ${escapeHtml(slot.source)} · ${escapeHtml(slot.label)}
                <p>${escapeHtml(
                  slot.invalid_reason ??
                    slot.orphan_reason ??
                    'Kept as an explicit override.',
                )}</p>
              </li>`,
          )
          .join('')}</ul>`;

  return `
    <main class="build-report-page" data-screen="build-report">
      <nav class="report-controls" aria-label="Report actions">
        <a href="/characters/${characterId}" data-router-link>Back to character</a>
        <a href="/characters/${characterId}/sheet" data-router-link>Character sheet</a>
      </nav>

      <div class="report-content">
        <header class="report-header">
          <p class="eyebrow">Read-only build report</p>
          <h1>${escapeHtml(report.character.name)}</h1>
          <p>Character level ${report.character.character_level === null ? 'undetermined' : report.character.character_level} · Proficiency bonus ${report.character.proficiency_bonus === null ? 'undetermined' : `+${report.character.proficiency_bonus}`}</p>
        </header>

        <section class="ability-grid" aria-labelledby="abilities-heading">
          <h2 id="abilities-heading" class="visually-hidden">Ability scores</h2>
          ${abilitiesMarkup}
        </section>

        <section class="report-grid">
          <article class="report-panel">
            <h2>Shared spell slots</h2>
            <p class="report-muted">Multiclass caster level ${report.caster.caster_level}</p>
            <table>
              <caption class="visually-hidden">Shared spell slot counts</caption>
              <thead><tr><th scope="col">Spell level</th><th scope="col" class="numeric">Slots</th></tr></thead>
              <tbody>${slots}</tbody>
            </table>
            ${pact}
          </article>

          <article class="report-panel">
            <h2>Class preparation limits</h2>
            <div class="table-scroll">
              <table>
                <caption class="visually-hidden">Class preparation limits</caption>
                <thead><tr><th scope="col">Class</th><th scope="col">Ability</th><th scope="col" class="numeric">Prepared</th><th scope="col" class="numeric">Maximum spell level</th></tr></thead>
                <tbody>${classes}</tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="report-panel" aria-labelledby="catalog-provenance-heading">
          <h2 id="catalog-provenance-heading">Catalog provenance</h2>
          <p class="report-muted">Publication layers come from the catalog identity registry; missing identities are shown as unknown.</p>
          <ul class="catalog-provenance-list">${catalogSources}</ul>
        </section>

        <aside class="preparation-callout" data-testid="preparation-callout">
          <h2>Slots possessed are not spells unlocked</h2>
          <p>${escapeHtml(report.preparation_callout)}</p>
        </aside>

        <section class="report-panel" aria-labelledby="routes-heading">
          <h2 id="routes-heading">Spell access routes</h2>
          <p class="report-muted">Every castable route is shown with its source, provenance, and table math.</p>
          <div class="table-scroll">
            <table class="route-table">
              <caption class="visually-hidden">Castable spell access routes</caption>
              <thead><tr><th scope="col">Spell</th><th scope="col">Source</th><th scope="col">Access</th><th scope="col">Ability</th><th scope="col" class="numeric">Attack</th><th scope="col" class="numeric">Save DC</th></tr></thead>
              <tbody>${routes}</tbody>
            </table>
          </div>
        </section>

        <section class="report-panel" aria-labelledby="wizard-heading">
          <h2 id="wizard-heading">Wizard spellbook access</h2>
          <p class="report-muted wizard-explanation">${escapeHtml(report.wizard.explanation)}</p>
          <div class="wizard-grid">
            <article><h3>In my book · ${spellbook.length}</h3><ul>${items(spellbook, 'No spells in the book.')}</ul></article>
            <article><h3>Prepared · ${prepared.length}</h3><ul>${items(prepared, 'No prepared Wizard spells.')}</ul></article>
            <article><h3>Ritual-only · ${ritualOnly.length}</h3><ul>${items(ritualOnly, 'No ritual-only spells.')}</ul></article>
          </div>
        </section>

        <section class="report-panel" aria-labelledby="duplicates-heading">
          <div class="section-heading">
            <h2 id="duplicates-heading">Duplicate assessment</h2>
            <span class="warning-count" aria-label="${warningCount} duplicate warnings">${warningCount}</span>
          </div>
          ${duplicateAssessments}
        </section>

        <section class="report-panel" aria-labelledby="invalid-heading">
          <h2 id="invalid-heading">Invalid or orphaned selections</h2>
          ${invalidSelections}
        </section>

        <footer class="srd-attribution" data-testid="srd-attribution">
          ${escapeHtml(SRD_ATTRIBUTION_NOTICE)}
        </footer>
      </div>
    </main>`;
}
