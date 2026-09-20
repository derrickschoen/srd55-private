# README-01 — astra MEDIUM review r2 (session 01a0bc23-7c97-7081-b7e3-804388a3639a, final message only)

**VERDICT: REJECT — 0 P1, 0 P2, 2 P3.** The substantive R1 problems are addressed; two small wording corrections remain.

1. **P3 — Recipient instruction invents an expand action.** [README.md:175](/home/vagrant/PhpstormProjects/dnd-wt-readme/README.md:175) says “expand **Open a shared character**.” That is an ordinary `h3` in an already-rendered section, with no disclosure control ([share-controls.ts:844](/home/vagrant/PhpstormProjects/dnd-wt-readme/src/ui/screens/character-list/share-controls.ts:844)).  
   **Fix:** Replace “expand” with “find.” The remaining first-import order is correct: paste → **Preview link** → preview → **Add to my characters**. Preview exposes the add button; its click initiates import.

2. **P3 — HTTP IP restriction is too broad.** [README.md:83](/home/vagrant/PhpstormProjects/dnd-wt-readme/README.md:83) says the app is not usable at “a plain `http://<ip-address>` URL,” which also describes the supported `http://127.0.0.1:4173` production URL.  
   **Fix:** Say “a plain HTTP URL using a non-loopback LAN or WSL2 IP address.” Explicitly noting that HTTP `localhost` and `127.0.0.1` are supported would remove the apparent contradiction.

R1 closure audit:

| R1 finding | New README wording | Status |
|---|---|---|
| P2 secure context | Lines 83–86: “Browser OPFS storage requires a secure context…” and “another device requires a trusted HTTPS origin” | Substantively closed; qualify IP wording above |
| P2 recipient workflow | Lines 172–178: “Generated links retain the sender’s origin”; “paste the complete URL”; “Preview link”; “Add to my characters”; “copy, not a live connection” | Substantively closed; remove invented expand action |
| P3 unsupported timing | Line 277: “The full suite is substantially larger and optional for trying the app.” | Closed |
| P3 lockfile wording | Lines 293–295: “keep `package-lock.json` unchanged, and rerun the documented install and build sequence.” | Closed |
| P3 prerequisites ordering | “Requirements” at line 23 precedes “Quick start” at line 38; lines 44–45 add `git clone` and `cd srd55-private` | Closed |

The secure-context reasoning otherwise checks out. The probe calls [`storage.getDirectory()` at line 56](/home/vagrant/PhpstormProjects/dnd-wt-readme/src/pwa/browser-capability-opfs-probe.ts:56), and database initialization installs the [OPFS storage pool](/home/vagrant/PhpstormProjects/dnd-wt-readme/src/db/worker.ts:61). The platform marks `getDirectory()` as secure-context-only. [File System Standard](https://fs.spec.whatwg.org/#dom-storagemanager-getdirectory)

**Yes:** HTTP `localhost` through WSL2 localhost forwarding remains a secure context in the supported Windows browser, assuming the page opens at that localhost origin. HTTP `127.0.0.1:4173` also qualifies. The trust algorithm recognizes localhost and loopback addresses; the port does not affect that classification. Forwarding does not change the browser-visible origin. This establishes secure-context eligibility, not guaranteed OPFS availability under every browser configuration. [Secure Contexts specification](https://w3c.github.io/webappsec-secure-contexts/#is-origin-trustworthy)

Scope and verification: confirmed branch, HEAD, supplied SHA-256, 359 lines, and only `README.md` modified. The six logged R1→R2 hunks match the current file; reversing them reconstructs the logged R1 blob hash exactly. Changes are confined to the five requested items. All relative Markdown links resolve, existing link targets are unchanged, and `git diff --check` passes. No additional regressions found. Install/build/server/tests were not rerun; their successful execution remains supervisor evidence.

README-01 REVIEW R2 DONE
