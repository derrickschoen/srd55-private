# DISPATCH FIX-ATTR — print attribution + legal correction + build id (S, MINT-FREE, wt/pwa, PLAYWRIGHT_PORT=44478)

Closes D125 (a standing finding: our own docs/srd/ATTRIBUTION.md:35 requires
the SRD notice "in any exported or printed character sheet that reproduces
SRD text", and the printed sheet has NONE while src/ui/styles/base.css hides
the site footer in print with a comment claiming the sheet carries the
notice itself).

1. Create src/build-id.ts exporting a single checked-in string constant
   (format `srd55-YYYY-MM-DD-n`), bumped BY HAND at each publish. NO vite
   config edit, NO define, NO env plumbing — a plain constant module.
2. Printed sheet: a final print-only notice block (hidden on screen, visible
   in print media) containing the SAME SRD attribution text the /legal
   screen renders (import/share the constant — do not retype it) plus the
   line "Printed from SRD-55 <build id>". It is NOT .sheet-chrome and must
   survive the print stylesheet.
3. src/ui/screens/legal/legal.ts: correct the sentence claiming spell rules
   text comes only from user-imported catalogs — spell text is bundled SRD
   5.2.1 content (D43/D45). Keep the correction minimal and accurate.
4. tests: extend the print-media browser coverage in
   tests/browser/reports-and-print.spec.ts (or character-sheet.spec.ts print
   block — follow where the existing print-media assertions live): the
   notice text and build id render in print media; the screen sheet does NOT
   show the block; the legal screen's corrected sentence is asserted.
Negative control: remove the notice block from the print DOM → the named
print test fails.
