# DISPATCH WALK-2 — the D131 second acceptance walkthrough (M, TEST-ONLY, any free lane, PLAYWRIGHT_PORT=44499)

Requires merged: HA-7 (species form), AR-D (archive/duplicate UI), D91-R
(resource print), FIX-ATTR. Dispatch LAST.

Create tests/browser/acceptance-authoring-walkthrough.spec.ts: ONE
continuous user-visible journey, same discipline as the D112 script
(tests/browser/acceptance-walkthrough.spec.ts is the model — user-visible
actions by role/label, hand-authored expectations, never snapshots of our
own output):
1. author a species in the homebrew form (pick simple, definite content —
   a fixed damage_resistance and an ability increase; hand-pin the exact
   values), publish it;
2. build a NEW character with that species through the guided flow to a
   complete level 1; assert the species' effects appear on the sheet with
   the hand-pinned numbers and the homebrew badge/disclosure;
3. archive the character; assert it left the list and appears in the
   archive view; restore it; assert it is back;
4. duplicate it; assert the visibly renamed active copy and that the
   original is untouched;
5. print-media assertions on the sheet: the resource section (if the
   species/class has any), the SRD attribution notice and build id
   (FIX-ATTR), and the pre-alpha banner ABSENT in print;
6. reload; repeat the load-bearing assertions.
Do not extend the D112 script; this is a separate file. Negative-control
candidates per load-bearing assertion, exact test names. The D106 gate
requires BOTH scripts green.
