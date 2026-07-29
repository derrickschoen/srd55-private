/**
 * The rules edition every bundled species and background belongs to.
 *
 * IN ITS OWN MODULE, DELIBERATELY, and the reason is a load-order fact rather
 * than taste: the guided seam (`src/builder/contracts.ts`) needs this literal
 * for its content-key sets, and the seam is imported by the COMMAND layer
 * (`skill-grants` → `grant-rule-slot-generator` → `add_source`), which
 * node-side test processes load directly. Its previous home,
 * `origins-srd.ts`, imports the SRD text extracts via Vite's `?raw` suffix —
 * a suffix only Vite's pipeline understands — so seating the seam on that
 * module made every node-side consumer of a command drag two `.txt` files
 * through a transpiler that cannot parse them. Playwright's whole browser
 * suite failed COLLECTION on exactly that from dispatch S-A until S-C moved
 * this constant here.
 *
 * `origins-srd.ts` re-exports it, so every existing importer keeps working;
 * this module must never import anything that reaches an extract.
 */
export const BUNDLED_ORIGIN_RULES_EDITION = '2024';
