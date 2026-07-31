# DISPATCH BANNER — pre-alpha banner, build id in footer, noindex (S, MINT-FREE, wt/pwa, PLAYWRIGHT_PORT=44485)

D129. Requires FIX-ATTR's src/build-id.ts merged (reuse it — do not mint a
second constant).

1. A persistent one-line banner on every screen: "Pre-alpha. Updates can
   break saved characters. Export a backup." No dismiss state, no
   acknowledgement storage (D95 spirit: it is true while it is true). It is
   .sheet-chrome-equivalent for PRINT (hidden in print media — the printed
   sheet's provenance line comes from FIX-ATTR).
2. The build id visible in the site footer next to the attribution link.
3. public/robots.txt (Disallow: /) and a `<meta name="robots"
   content="noindex">` in index.html. Both carry a code comment: removed
   only when the owner announces the D60 flip.
4. Tests: unit/browser assertions that the banner renders on the character
   list, guided builder, sheet, and planner; that print media hides it;
   that the footer shows the build id; that index.html carries the meta.
Negative control: drop the banner from one screen's shell → named test
fails.
