# HA-9 — background authoring form

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ha9 (branch wt/ha9 off main).
Unit: the homebrew BACKGROUND authoring form on the HA-4 backend
(background publisher, mint 0037 feat resolution) and the HA-6/HA-7/HA-8
form seams. NO new migrations — if you believe you need one, STOP and say
so. No second-agent CLIs. Forbidden paths: no any/@ts-ignore/
@ts-expect-error/.skip/.todo, no config edits, no weakened assertions, no
test deletion (strict-superset only), never regenerate expectations from
own output. Targeted vitest only; you may run ONLY your own journey spec
in Playwright (PLAYWRIGHT_PORT=4774). Commit at green boundaries; if
index.lock refuses, leave the tree and say so.

## Scope

/homebrew Backgrounds tab -> form for draft backgrounds: name, rules
edition, description, skill proficiencies, tool/language grants, starting
equipment lines, feature (name + description + effects via the shared
compile-coupled effect cards), Origin-feat reference. Save/preview/publish
through the REAL HA-4 publisher; draft conflict + adoption via the shared
dialogs; dirty-navigation via the router guard seam.

## Build on merged seams — do not fork them

- Shared modal-trap (src/ui/modal-trap.ts), shared publish/adoption
  dialogs, shared form components from HA-6; homebrew-library routing +
  mount conventions from HA-7/HA-8.
- EXTRACT the edit-generation discipline HA-8 landed in subclass-form.ts
  (generation stamp; late save must not clobber newer edits or clear
  dirty; stale preview success AND failure discarded with a live "Draft
  changed; preview again" notice) into a shared helper both forms use.
  Replacing subclass-form's local copy with the shared seam is in scope
  and welcome; its existing pins must keep passing unchanged.
- Publisher is the authority: any rule the form surfaces inline must
  exist in the HA-4 publisher's collect-all validation FIRST. If the
  publisher lacks a rule the form needs, add it publisher-side with real
  preview/commit refusal pins (HA-8 round 1's top finding — do not
  repeat it).

## Lessons already paid for (pre-empted; the reviewer will check)

1. Byte round-trip: compare stored catalog_content_drafts.document_json
   strings across REAL fresh-form rehydration + save. Not toEqual.
2. Collect-all refusal census: every distinct issue path asserted
   individually (path + code + message).
3. Rollback: injected abort of the real commit; census by CAPTURED IDs,
   never joined through the rolled-back definition; assert only families
   the fixture genuinely stages.
4. Dirty-at-publish pinned on the REACHABLE flow (connected button from a
   rendered preview).
5. aria-label lives on the MOUNT only (homebrew-library convention);
   never duplicate it on the form element.
6. Journey selectors: role-based with exact accessible names; never
   hasText filters that can match select-option text.
7. Journey readiness: /homebrew owns its ready signal (homebrewReady
   pattern in the HA-8 spec); #status[data-ready] is the character-list
   route's. Include the cross-route global-ready check after reload.
8. D108 a11y behavior-asserted (focus, labels, keyboard), not
   attribute-only; hostile strings inert in every new render path.

## Browser journey (budget: document the arithmetic, x1.5 reserve,
14.8s HA-8 measured precedent)

Route -> form -> author a background with a feature effect + skill grants
-> publish -> library card -> create a character applying it -> assert
PERSISTED grant/effect rows (present where eligible, absent otherwise) ->
reload -> route-owned readiness -> rows unchanged -> navigate to / ->
global ready stamps.

## Report

Terse. Per deliverable: file:line, targeted command + pasted counts, then
`npx tsc -p tsconfig.app.json --noEmit` exit code. Claims without
citations are treated as unbuilt.
