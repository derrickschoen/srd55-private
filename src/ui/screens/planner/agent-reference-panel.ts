/**
 * Renders the build reference twice, from one projection:
 *
 * 1. `<script type="application/json">` — structured, parses with JSON.parse.
 * 2. Collapsed `<details>` sections — the same facts as readable text. A unit
 *    test pins every field of the projection to a column or a labelled row
 *    here, so the structured form cannot quietly say more than the text form.
 *
 * D4: both forms are in the ordinary document, neither is hidden from a person,
 * and neither addresses a reader in the imperative. Nothing here is styled
 * `display: none`, positioned off-screen, or made transparent; `<details>`
 * collapse is the browser's own affordance and a person can expand it.
 */
import { freeTextSpan } from '../../free-text';
import {
  AGENT_REFERENCE_SCRIPT_ID,
  agentReferenceJson,
  agentReferenceSections,
  type AgentReferenceProjection,
  type ReferenceTable,
} from './agent-reference';

const PANEL_HEADING_ID = 'planner-build-reference-heading';

function renderTable(table: ReferenceTable, index: number): HTMLElement {
  const element = document.createElement('table');
  element.className = 'reference-table';
  const caption = document.createElement('caption');
  caption.textContent = table.caption;
  element.append(caption);
  const head = element.createTHead();
  const headRow = head.insertRow();
  for (const column of table.columns) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = column;
    headRow.append(cell);
  }
  const body = element.createTBody();
  for (const row of table.rows) {
    const bodyRow = body.insertRow();
    for (const value of row) {
      const cell = bodyRow.insertCell();
      if (value.free_text === true) cell.append(freeTextSpan(value.text));
      else cell.textContent = value.text;
    }
  }
  if (table.rows.length === 0) {
    const emptyRow = body.insertRow();
    const cell = emptyRow.insertCell();
    cell.colSpan = Math.max(table.columns.length, 1);
    cell.className = 'muted';
    cell.textContent = 'None.';
  }
  const scroller = document.createElement('div');
  scroller.className = 'reference-scroll';
  scroller.dataset.tableIndex = String(index);
  scroller.append(element);
  return scroller;
}

export function renderAgentReference(
  projection: AgentReferenceProjection,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel build-reference-panel';
  section.setAttribute('aria-labelledby', PANEL_HEADING_ID);

  const heading = document.createElement('h2');
  heading.id = PANEL_HEADING_ID;
  heading.textContent = 'Build reference';
  const intro = document.createElement('p');
  intro.className = 'muted';
  // Descriptive only. Per D4 this panel never addresses a reader in the
  // imperative — it states what the page contains, not what to do about it.
  intro.textContent =
    'This build’s spellcasting facts in two forms rendered from one ' +
    'projection: a JSON block in the page source, and the collapsed sections ' +
    'below. Every field of the JSON has a column or a labelled row in those ' +
    'sections. What the reference leaves out is listed under “What this ' +
    'planner models”, and free text whose author is unverified is listed ' +
    'under “Free text on this page” rather than placed in the JSON.';
  section.append(heading, intro);

  // A `<script type="application/json">` is inert data, never executed. Its
  // content is set as text, and `agentReferenceJson` escapes `<`, so nothing in
  // the payload can close the element early.
  const data = document.createElement('script');
  data.type = 'application/json';
  data.id = AGENT_REFERENCE_SCRIPT_ID;
  data.textContent = agentReferenceJson(projection.reference);
  section.append(data);

  for (const referenceSection of agentReferenceSections(projection)) {
    const details = document.createElement('details');
    details.className = 'reference-section';
    details.dataset.section = referenceSection.id;
    const summary = document.createElement('summary');
    summary.textContent = referenceSection.heading;
    details.append(summary);
    for (const note of referenceSection.notes) {
      const paragraph = document.createElement('p');
      paragraph.className = 'reference-note';
      paragraph.textContent = note;
      details.append(paragraph);
    }
    referenceSection.tables.forEach((table, index) => {
      details.append(renderTable(table, index));
    });
    section.append(details);
  }
  return section;
}
