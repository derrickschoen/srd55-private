# DISPATCH RESP-1 — responsive pass: guided builder + sheet (M, MINT-FREE, wt/pwa, PLAYWRIGHT_PORT=44484)

D130: Chromium on ANY viewport is supported; the PWA install invitation
stays. Today the guided builder (the front door, D42) has ZERO @media rules
in src/ui/screens/guided-builder/styles.css while the advanced planner has
three breakpoints (70/48/34rem — src/ui/screens/planner/styles.css is the
pattern to follow).

Scope: every guided-builder step (class, abilities, species, background,
skills, expertise, spells, equipment — whatever screen.ts mounts) and the
character sheet must be USABLE at 390px width: no horizontal scroll, no
overlapping controls, tap targets not clipped, headings and warnings
visible, D108 keyboard/labels untouched. Use CSS only (media queries,
flex/grid reflow) — no DOM restructuring, no component logic changes, no
behavior forks by viewport. Tab order and DOM order unchanged (LU-W 3.4
convention). Print styles untouched.

Tests: browser tests at a phone viewport (Playwright viewport 390x844) for
the guided level-1 journey's first screens and the sheet — assert no
horizontal overflow (document.scrollingElement.scrollWidth <= innerWidth)
and key controls visible/clickable. Name a negative control (remove one
breakpoint rule → the overflow assertion fails).
