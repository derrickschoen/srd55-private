import type {
  PrintableSourceGroup,
  PrintableSpell,
  PrintableSpellList,
  PrintableUnpreparedSection,
} from '../../../reports/printable-spell-list-builder';
import {
  compareLongRestSpells,
  comparePrintableSourceGroups,
  comparePrintableSpells,
} from '../../../reports/printable-ordering';
import { SRD_ATTRIBUTION_NOTICE } from '../../../rules/srd-attribution';

export const TEXT_UNAVAILABLE_WARNING =
  'Spell descriptions are not installed. This full reference includes all spell facts, but no description text. Run php artisan catalog:import --with-text where the local Tier 2 files are available, then print again.';

export const TEXT_PARTIAL_WARNING =
  'Some spell descriptions are unavailable. Missing text is identified on the affected spells.';

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function signed(value: number | null): string {
  return value === null ? '—' : `${value >= 0 ? '+' : ''}${value}`;
}

function title(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function level(value: number): string {
  return value === 0 ? 'Cantrip' : `Level ${value}`;
}

function abbreviatedAbilities(values: readonly string[]): string {
  return values.map((value) => value.slice(0, 3).toUpperCase()).join('/');
}

/**
 * THE SCALE AS THE WORD A PLAYER READS.
 *
 * EXHAUSTIVE WITH NO `default` ARM, so a third `UpcastScale` is a compile error
 * here rather than a ladder that silently prints as slot levels. The `null` arm
 * is REACHED ONLY OFF AN IMAGE THIS BUILD DID NOT WRITE — the importer refuses
 * levels with no scale and the schema CHECK bounds the column — and it prints
 * the bare word `levels`, which claims neither scale. Substituting the more
 * common one would be exactly the "print an assumption as a fact" D24 forbids,
 * on the one row where we know we do not know.
 */
function scaleWord(scale: PrintableSpell['upcast_scale']): string | null {
  switch (scale) {
    case 'slot_level':
      return 'slot levels';
    case 'character_level':
      return 'character levels';
    case null:
      return null;
  }
}

/**
 * THE UPCAST LINE, OR NOTHING AT ALL.
 *
 * THREE STATES AND ONLY TWO OF THEM PRINT, which is D24 applied to a brand-new
 * field. A spell whose catalog document said nothing about upcasting prints NO
 * LINE — not "Upcast: —", which would read as "this spell cannot be upcast" and
 * assert something no document said. The em-dash placeholder every other row in
 * this list uses is right for `Range` and `Duration`, where the field is part
 * of every printed spell; it is wrong here, where the field is a fact the
 * document may simply not carry.
 *
 * THE SCALE IS NAMED IN THE SENTENCE rather than left to the reader. `2, 3, 4`
 * means slot levels for a levelled spell and character levels for a cantrip
 * upgrade, and a player reading "Upcast at 5, 11, 17" with no scale word would
 * have to know which spell they were looking at to know which it meant.
 */
function upcastLine(spell: PrintableSpell): string {
  const summary =
    spell.upcast_summary === null || spell.upcast_summary.trim() === ''
      ? ''
      : escapeHtml(spell.upcast_summary.trim());
  if (spell.upcast_levels.length === 0) {
    return summary === ''
      ? ''
      : `<div><dt>Upcast: </dt><dd>${summary}</dd></div>`;
  }
  const scale = scaleWord(spell.upcast_scale);
  const levels =
    scale === null
      ? `levels ${spell.upcast_levels.join(', ')}`
      : `${scale} ${spell.upcast_levels.join(', ')}`;
  return `<div><dt>Upcast: </dt><dd>${escapeHtml(levels)}${
    summary === '' ? '' : ` · ${summary}`
  }</dd></div>`;
}

function spellFacts(spell: PrintableSpell): string {
  const action =
    spell.action_type !== null &&
    spell.action_type !== spell.casting_time
      ? ` (${escapeHtml(spell.action_type)})`
      : '';
  const attack =
    spell.attack_bonus === null
      ? ''
      : `<div><dt>Spell attack: </dt><dd>${escapeHtml(signed(spell.attack_bonus))} to hit${
          spell.attack_modes.length === 0
            ? ''
            : ` · ${escapeHtml(spell.attack_modes.map(title).join(', '))}`
        }</dd></div>`;
  const savingThrow =
    spell.save_dc === null
      ? ''
      : `<div><dt>Saving throw: </dt><dd>DC ${spell.save_dc} · ${escapeHtml(abbreviatedAbilities(spell.save_abilities))}</dd></div>`;
  return `
    <dl class="spell-facts">
      <div><dt>Casting: </dt><dd>${escapeHtml(spell.casting_time ?? '—')}${action}</dd></div>
      <div><dt>Range: </dt><dd>${escapeHtml(spell.range ?? '—')}</dd></div>
      <div><dt>Duration: </dt><dd>${escapeHtml(spell.duration ?? '—')}</dd></div>
      <div><dt>Components: </dt><dd>${escapeHtml(spell.components ?? '—')}</dd></div>
      <div><dt>Concentration: </dt><dd>${spell.concentration ? 'Yes' : 'No'}</dd></div>
      <div><dt>Ritual: </dt><dd>${spell.ritual ? 'Yes' : 'No'}</dd></div>
      ${upcastLine(spell)}
      ${attack}
      ${savingThrow}
    </dl>`;
}

function spellCard(
  spell: PrintableSpell,
  variant: PrintableSpellList['variant'],
  showAccess: boolean,
): string {
  const edition =
    spell.edition === '2024' ? '' : ` · ${escapeHtml(spell.edition)}`;
  const access = showAccess
    ? `<p class="access-annotation"><strong>Access:</strong>
        ${escapeHtml(title(spell.casting_mode))}${
          spell.spellcasting_ability === null
            ? ''
            : ` · ${escapeHtml(
                spell.spellcasting_ability.slice(0, 3).toUpperCase(),
              )}`
        }</p>`
    : '';
  const description =
    variant === 'reference'
      ? ''
      : `<div class="spell-description">${
          spell.description === null || spell.description.trim() === ''
            ? '<em>Description unavailable.</em>'
            : escapeHtml(spell.description)
        }</div>`;
  return `
    <article class="spell-card" data-spell-version="${spell.spell_version_id}" data-casting-mode="${escapeHtml(spell.casting_mode)}">
      <div class="spell-heading">
        <h3>${escapeHtml(spell.name)}</h3>
        <p>${escapeHtml(level(spell.level))} · ${escapeHtml(spell.school)}${edition}</p>
      </div>
      ${spellFacts(spell)}
      ${access}
      ${description}
    </article>`;
}

function sourceSection(
  group: PrintableSourceGroup,
  variant: PrintableSpellList['variant'],
  index: number,
): string {
  const headingId = `source-${index + 1}`;
  const statistics =
    group.ability === null
      ? 'No spellcasting ability assigned'
      : `${group.ability.slice(0, 3).toUpperCase()} · spell attack ${signed(group.attack_bonus)} · save DC ${group.save_dc ?? '—'}`;
  const spells = [...group.spells]
    .sort(comparePrintableSpells)
    .map((spell) => spellCard(spell, variant, true))
    .join('');
  return `
    <section class="print-section source-section" aria-labelledby="${headingId}">
      <div class="source-heading">
        <h2 id="${headingId}">${escapeHtml(group.source)}</h2>
        <p>${escapeHtml(statistics)}</p>
      </div>
      <div class="spell-grid">${spells}</div>
    </section>`;
}

function unpreparedSection(
  section: PrintableUnpreparedSection,
  variant: PrintableSpellList['variant'],
  index: number,
): string {
  const headingId = `unprepared-${index + 1}`;
  const spells = [...section.spells]
    .sort(compareLongRestSpells)
    .map((spell) => spellCard(spell, variant, false))
    .join('');
  return `
    <section class="print-section unprepared-section" aria-labelledby="${headingId}">
      <div class="unprepared-heading">
        <h2 id="${headingId}">${escapeHtml(section.title)}</h2>
        <p>${escapeHtml(section.cantrip_note)}
          Maximum preparable spell level: ${section.max_level}.</p>
      </div>
      <div class="spell-grid">${spells}</div>
    </section>`;
}

function wizardStates(spellList: PrintableSpellList): string {
  if (spellList.wizard.spellbook.length === 0) {
    return '';
  }
  const spellbook = spellList.wizard.spellbook
    .map(
      (entry) =>
        `<li>${escapeHtml(entry.spell_name)}${
          entry.active ? '' : ' (unavailable — removed from catalog)'
        }</li>`,
    )
    .join('');
  const prepared = spellList.wizard.prepared
    .map((entry) => `<li>${escapeHtml(entry.spell_name)}</li>`)
    .join('');
  const ritualOnly = spellList.wizard.ritual_only
    .map((entry) => `<li>${escapeHtml(entry.spell_name)}</li>`)
    .join('');
  return `
    <section class="print-section wizard-section" aria-labelledby="wizard-states-heading">
      <h2 id="wizard-states-heading">Wizard spellbook states</h2>
      <p>${escapeHtml(spellList.wizard.explanation)}</p>
      <div class="wizard-states">
        <article><h3>In my book · ${spellList.wizard.spellbook.length}</h3><ul>${spellbook}</ul></article>
        <article><h3>Prepared · ${spellList.wizard.prepared.length}</h3><ul>${prepared}</ul></article>
        <article><h3>Ritual-only · ${spellList.wizard.ritual_only.length}</h3><ul>${ritualOnly}</ul></article>
      </div>
    </section>`;
}

function textNotice(spellList: PrintableSpellList): string {
  if (
    spellList.variant !== 'full' ||
    !['unavailable', 'partial'].includes(spellList.text_status)
  ) {
    return '';
  }
  if (spellList.text_status === 'unavailable') {
    return `
      <aside class="text-notice" role="status" data-testid="text-unavailable">
        <strong>Spell descriptions are not installed.</strong>
        This full reference includes all spell facts, but no description text.
        Run <code>php artisan catalog:import --with-text</code> where the local
        Tier 2 files are available, then print again.
      </aside>`;
  }
  return `
    <aside class="text-notice" role="status" data-testid="text-partial">
      <strong>Some spell descriptions are unavailable.</strong>
      Missing text is identified on the affected spells.
    </aside>`;
}

/**
 * Returns deterministic, escaped print markup while sorting copies of incoming
 * collections. The supplied read model is never mutated.
 */
export function renderPrintableList(spellList: PrintableSpellList): string {
  const characterId = spellList.character.id;
  const groups = [...spellList.source_groups]
    .sort(comparePrintableSourceGroups)
    .map((group, index) => sourceSection(group, spellList.variant, index))
    .join('');
  const sections = [...spellList.unprepared_sections]
    .sort((left, right) => {
      const order = ['Cleric', 'Druid', 'Wizard'];
      return (
        order.indexOf(left.class_name) - order.indexOf(right.class_name)
      );
    })
    .map((section, index) =>
      unpreparedSection(section, spellList.variant, index),
    )
    .join('');

  return `
    <div class="print-page" data-screen="printable-list" data-variant="${spellList.variant}">
      <div class="print-controls">
        <div class="print-controls-inner">
          <a href="/characters/${characterId}" data-router-link>Back to character</a>
          <form method="get" action="/characters/${characterId}/print" data-variant-form>
            <label for="print-variant">Print variant
              <select id="print-variant" name="variant">
                <option value="reference"${spellList.variant === 'reference' ? ' selected' : ''}>Reference sheet (no spell text)</option>
                <option value="full"${spellList.variant === 'full' ? ' selected' : ''}>Full reference (with spell text)</option>
              </select>
            </label>
            <button type="submit">Change variant</button>
          </form>
          <button type="button" class="print-button" data-print>Print</button>
        </div>
      </div>

      <main>
        <header class="print-header">
          <p>${spellList.variant === 'full' ? 'Full spell reference' : 'Spell reference sheet'}</p>
          <h1>${escapeHtml(spellList.character.name)}</h1>
          <p>Character level ${spellList.character.character_level} · Proficiency bonus +${spellList.character.proficiency_bonus}</p>
        </header>

        ${textNotice(spellList)}
        ${wizardStates(spellList)}
        ${groups}
        ${sections}

        <footer class="srd-attribution" data-testid="srd-attribution">
          ${escapeHtml(SRD_ATTRIBUTION_NOTICE)}
        </footer>
      </main>
    </div>`;
}
