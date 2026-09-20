# README-01 — astra MEDIUM review r1 (session 01a0bc08-a18e-7f71-906f-4ce5c4209b03, final message only)

**VERDICT: REJECT — 2 P2 findings, 3 P3 findings; no P1.**

The README is substantially useful, but two instructions need correction before sending it to a friend.

1. **P2 — LAN/WSL instructions omit the secure-context requirement.** [README.md:75](/home/vagrant/PhpstormProjects/dnd-wt-readme/README.md:75), repeated at lines 90–92 and 292–294, directs readers to an HTTP network/WSL address. `--host` makes Vite reachable, but ordinary HTTP IP origins do not provide the secure context required by OPFS. Successfully fetching HTML does not establish that the app can initialize its database. The app calls `storage.getDirectory()` in `src/pwa/browser-capability-opfs-probe.ts:56` and installs its OPFS pool in `src/db/worker.ts:61`.
   
   **Fix:** Keep localhost forwarding as the supported WSL path. Explain that another device needs a trusted HTTPS origin; remove the suggestion that `--host` plus an HTTP IP address is sufficient. This can be corrected without adding deployment or tunnel instructions.

2. **P2 — Sharing instructions miss the local-install recipient workflow.** [README.md:170](/home/vagrant/PhpstormProjects/dnd-wt-readme/README.md:170) says the recipient opens the link, but generated links retain the sender’s origin (`src/ui/screens/character-list/share-controls.ts:115,743`). A localhost link points to the recipient’s own machine and may use a port where they have no server.
   
   **Fix:** Explain that recipients should start their own app, paste the received URL into **Open a shared character → Character share link**, choose **Preview link**, then **Add to my characters**. The existing UI supports this without editing the URL (`share-controls.ts:195,199,206,845`).

3. **P3 — Unsupported full-suite timing.** [README.md:271](/home/vagrant/PhpstormProjects/dnd-wt-readme/README.md:271) asserts “roughly 20 minutes or more.” I found no supporting measurement in `tools/gate-vitest.mjs` or the searched documentation; the implementer’s final report records only the focused subset and an interrupted full-suite attempt.
   
   **Fix:** Supply a dated full-suite measurement or replace the estimate with “The full suite is substantially larger and optional for trying the app.”

4. **P3 — Troubleshooting editing defect.** [README.md:287](/home/vagrant/PhpstormProjects/dnd-wt-readme/README.md:287): “remove no lockfile entries” is awkward and distracting.
   
   **Fix:** “Upgrade to Node 22.12 or newer, keep `package-lock.json` unchanged, and rerun the install and build commands.”

5. **P3 — Put prerequisites before the commands.** [README.md:23](/home/vagrant/PhpstormProjects/dnd-wt-readme/README.md:23) presents Quick start before the Node and Chromium requirements.
   
   **Fix:** Move Requirements above Quick start. Adding explicit `git clone` and `cd srd55-private` commands would also make the first-run sequence fully copyable.

Verification:

- Confirmed HEAD `32c5bed0`, only tracked modification `README.md`, and the supplied SHA-256.
- All relative Markdown links resolve; `.ai/` exists.
- `node --version` returned `v24.13.0`. Read-only `node -e` checks passed.
- Vite’s installed help confirms `--host`, `--port`, and `--configLoader`; `tools/serve.mjs:34` accepts `--port`.
- The requested Vitest command failed before executing tests: `ENOENT … mkdir '/tmp/XPRRK9gLHMxOP6SKcr4hi/ssr'`. I stopped testing there. **The reported 821 passing tests remain implementer evidence, not independently reproduced.**
- I did not rerun install/build/server commands that require writes.

UI-label audit, with source locations:

| Labels | Evidence |
|---|---|
| Characters; Create a character; Advanced: create a blank character; New player? Start here | `src/ui/screens/character-list/character-list.ts:263,288,380,299` |
| Resume build; Level Up; Open workspace | `src/ui/screens/character-list/character-list.ts:125,120,130` |
| Character sheet; Homebrew library | `src/ui/screens/planner/screen.ts:605,623` |
| Print character sheet; Print options | `src/ui/screens/sheet/sheet-view.ts:2232,2243` |
| Share link | `src/ui/screens/character-list/character-list.ts:454` |
| Create share link; Copy link; Shared character preview; Add to my characters | `src/ui/screens/character-list/share-controls.ts:294,258,225,206` |
| Import and backups; Download database backup; Restore database backup | `src/ui/screens/character-list/import-backup-controls.ts:855,717,730` |
| Download character backup; Download library JSON; Import catalog | `src/ui/screens/character-list/import-backup-controls.ts:752,638,543` |
| Try again | `src/main.ts:470` |
| Continue anyway | Actual button text is in `index.html:33`; `src/main.ts:432` also contains the literal |
| Phase 1 prototype | `src/vtt/app.ts:189` |
| Compose a rules encounter from stored characters; Load the bundled sample dungeon; Choose a Vane Warren leader fight | `src/vtt/app.ts:196,201,206` |

The remaining principal claims match the inspected implementation:

- Routes: `/` (`character-list/screen.ts:7`), `/characters/<id>/report` (`build-report/screen.ts:7`), `/homebrew` (`homebrew/screen.ts:7`), `/vtt` (`vtt/screen.ts:6`), all under `src/ui/screens/`.
- Sharing has three unchecked opt-ins (`share-controls.ts:281` onward), serializes into the fragment (`:743`), previews separately (`:574`), and commits following explicit action (`:618,681`).
- Homebrew authoring kinds are species, subclasses, and backgrounds (`homebrew-library.ts:73`).
- OPFS storage, single-pool ownership, and persistence reporting match `src/db/worker.ts:49`, `src/db/database-worker-boot.ts:80`, and `src/pwa/storage-persistence.ts:15`. The origin-separation explanation is sound.
- VTT relay, room-secret, visual-fog, and lifetime descriptions match `src/vtt/app.ts:192,254,418` and `src/vtt/transports/trystero.ts:20`. The composer enforces three to five characters (`stored-character-encounter-app.ts:45`).
- Build-cache description matches `tools/dist-build-cache.mjs`. Locked Vite requires `^20.19.0 || >=22.12.0`; repository scripts use `--experimental-strip-types`, supporting the stated practical minimum.
- Licensing matches the checked-in license/provenance documents. The AI-helper description agrees with `LOCAL-DEV.md`, its development-only entry in `src/main.ts:609`, and the distribution scanner.
- No deploy/tunnel command or private credential is introduced. The documented `--host` exposure is explicitly identified.

The highest-value missing guidance is the local sharing workflow, followed by the secure-origin limitation. Otherwise, the first screen, stopping the server, backups, storage origins, and major usage paths are covered. The length is reasonable for the requested thoroughness; the build-cache explanation could be shortened, but that is optional.

README-01 REVIEW R1 DONE
