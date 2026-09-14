# M-3 implementation review r1 (astra 01a09f97-e0cc-7371-bab1-b5354bf41a8b) on d078c888, harvested 2026-09-14 07:19

**REJECT IMPL M3.** The supervisor’s assertion-loss finding is valid. Publication coverage mostly survives, but several report assertions were dropped without plan authorization.

Reviewed `a04a6093..d078c888`. Inspection and in-memory probes only; no edits, Git writes, agents, tests, build, or browser execution. The supplied supervisor verification establishes 39/39 and discovery preservation; I did not independently rerun those commands.

For the tables below, `GI` means `tools/vtt-handoff/gate-inventory.ts`; test filenames are under `tests/unit/vtt/`.

- **IG1-F1 — P1; blocks: yes — Existing report assertions were weakened or removed.**  
  [handoff-report.test.ts:359](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:359), :409, :429, :446, :745, :762. The disposition table below identifies the losses. Notably, the primary publication test now checks a freshly built object instead of independently inspecting published JSON; its digest loop can pass with zero digests. Failed-gate fixtures check individual outcomes without retaining the previous overall PARTIAL/publication assertions. Art-path rejection coverage disappeared.

  **Minimal change:** restore every non-retired assertion using the temp repository and schema-v2 receipts, including assertions against published bytes. Restore both duplicate orderings with distinct receipt references. The only explicit retirement relevant here is caller-provided gate claims, including `preExistingFailures`, at [plan:440](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/.tmp-plans/2026-09-14-executable-verification-inventory-plan.md:440).

- **IG1-F2 — P1; blocks: yes — Empty, wrong-kind discovery can satisfy a required test gate.**  
  [GI:1210](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1210), :1295, :1325. Receipt parsing accepts any discovery kind independently of the inventory. Reconciliation compares arrays without requiring meaningful test discovery.

  **In-memory reproduction:** a matching `unit-gate` receipt with discovery `{kind:'none', rootDir:null, files:[], testIdentities:[]}`, an authenticated minimal passed-v2 report, empty initial requested/reported files, and no file outcomes returns **`passed`**. This can satisfy readiness without accounting for a single test file.

  **Minimal change:** validate receipt discovery against the gate’s kind, root, nonempty test selection, canonical unique identities, and applicable expected counts. Reject missing/inconsistent execution accounting while preserving M-1 verdict authority. Add the empty/wrong-kind fixture as a negative control.

- **IG1-F3 — P1; blocks: yes — Required test-level accounting disappears from receipts and published reconciliation.**  
  [GI:838](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:838), :974, :1146, :1335; [report.ts:307](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/report.ts:307). Parsing retains file outcomes but discards detailed execution evidence. Reconciliation exposes no test identities or test counts. A Playwright file containing one passed test and one approved skipped test becomes one executed file with **zero visible skips**; my in-memory probe reproduced this.

  Markdown additionally omits phase UUIDs, exact failed/skipped identities, `phaseFailures`, and prerequisites. This falls short of [plan:418](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/.tmp-plans/2026-09-14-executable-verification-inventory-plan.md:418) and [plan:461](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/.tmp-plans/2026-09-14-executable-verification-inventory-plan.md:461).

  **Minimal change:** retain the required file/test identities and approved-skip evidence from the unchanged M-1 artifact; publish their counts and identities, phase UUIDs, prerequisites, and exact verdict diagnostics in JSON and Markdown. Add a mixed pass/skip Playwright fixture.

- **IG1-F4 — P2; blocks: no — Validator coverage is narrower than §5.4.**  
  [GI:429](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:429), :532, :574. In-memory candidates containing `$(...)`, a Vitest gate invoking the Playwright wrapper, or a supervisor discovery selector changed to a root unit spec all validate successfully. Removing a test gate’s discovery and report requirement together also validates. `lstatSync(...).isDirectory()` does not establish that a local executable symlink has an installed target. Tighten launcher/discovery/config relationships and target resolution; add independent rejection assertions.

- **IG1-F5 — P2; blocks: no — Runner success differs from the specified predicate, and the runner is untested.**  
  [GI:1087](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/gate-inventory.ts:1087), :1138. With injected in-memory process results `{status:null, signal:null}` and no spawn error, `runInventoryGate` produces `finalStatus:'passed'`. Reconciliation correctly rejects that receipt later, so the two boundaries disagree. No committed test calls `runInventoryGate`; the injected runner-adapter tests required at [plan:559](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/.tmp-plans/2026-09-14-executable-verification-inventory-plan.md:559) are absent. Use the explicit outer-success predicate and test runner receipt production without launching gates.

- **IG1-F6 — P2; blocks: no — The default-policy negative fixture is not otherwise valid.**  
  [handoff-publish.test.ts:58](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-publish.test.ts:58), :293. The transformed module uses real Node dependencies. Its temp `.git` differs from the production owner’s Git directory; removing the allowlist therefore reaches `REPOSITORY_GIT_IDENTITY_INVALID`. This **does kill the exact expected-error assertion**, but does not prove that the allowlist alone prevents admission. It also depends on the real owner checkout existing. Use mocked filesystem identity with a shared common Git directory; my independent in-memory control then rejected normally and admitted the root only after guard removal.

- **IG1-F7 — P2; blocks: no — Temporary roots are never cleaned.**  
  [handoff-report.test.ts:132](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-report.test.ts:132), [handoff-publish.test.ts:88](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-publish.test.ts:88), [handoff-examples.test.ts:54](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tests/unit/vtt/handoff-examples.test.ts:54). All use raw filesystem helpers; none registers root teardown. The change substantially expands the existing leakage pattern with copied repositories and synthetic reports. Track and remove created roots in teardown.

- **IG1-F8 — P2; blocks: no — Prerequisite folding overwrites missing/stale execution states.**  
  [report.ts:211](/home/vagrant/PhpstormProjects/dnd-wt-gate-inventory/tools/vtt-handoff/report.ts:211). When production-build is missing or failed, absent/stale node-launch and worker-dist outcomes become `failed`, despite having no current execution. Preserve `not-run` while appending the prerequisite reason. The single-omission loop does not exercise combined missing prerequisites and dependent receipts.

The removed-title dispositions are:

| Removed title | Surviving expectations and location | Dropped/weakened expectations; disposition |
|---|---|---|
| **publishes complete authoritative contracts and READY strictly last** | All survive under **“kills M3-SPEC-POLICY-OMIT while publishing contracts and READY strictly last”**, publish:146–181: result/count/order, manifest count, independent hashes/lengths/format, authoritative declarations and their required exports, README text, exact READY JSON. | **None. Renamed, preserved.** |
| **writes READY evidence atomically under reports/claude and independently hashes every contract fixture** | **“publishes reconciled READY evidence atomically and independently hashes every input”**, report:359–406 retains publication result, rename order, absence of partial files, repository values, per-digest hashing, and successful check-mode verification. | Dropped: no Windows report directory; published JSON readiness/content inspection; exactly six digests; exact methods; sample asset; exact art requests; F94/F95 limitation; contract-level READY distinction; art-request Markdown. Repository/hash checks now inspect a recomputed object. **P1.** |
| **makes every individually omitted inventory result PARTIAL, including the launch probe** | **“kills M3-REPORT-MISSING and M3-AFFECTED-SUBSTITUTION for every omitted receipt”**, report:429–442 retains every omission’s PARTIAL result and named outcome reason. Exact 11-name pin survives under **“kills M3-INV-GATE-DROP, M3-INV-CUMULATIVE-DROP, and M3-INV-BROWSER-DROP”**, :830–831. | Top-level `report.reasons` assertion was replaced by an outcome-only assertion. The schema’s missing→not-run terminology change is appropriate; losing top-level propagation coverage is not authorized. **P1.** |
| **rejects conflicting duplicate gate results ordered %s** *(the eighth removal, an `it.each` title)* | **“kills M3-REPORT-CLAIM and M3-REPORT-STDOUT claim-only input”**, report:446–457 rejects one duplicated identical reference and retains invalid reason/null evidence. | Both conflicting orderings disappeared, along with duplicate-case PARTIAL/not-READY assertions. Claimed statuses are retired by plan:440; duplicate rejection remains required there. Migrate both orderings to distinct receipt references. **P1.** |
| **reports PARTIAL with failed or not-run required gates instead of planned success** | Not-run readiness survives in the omission loop, :429. Failed M-1 outcome coverage exists under **“kills M3-REPORT-FAILED by preserving failedFiles and phaseFailures”**, :640. | No equivalent failed **non-test** receipt/publication assertion; PARTIAL Markdown and absence of READY Markdown checks disappeared; failed overall readiness is not asserted. `legacy-control: known before handoff` is **explicitly retired** with caller `preExistingFailures` at plan:440. Remaining losses: **P1.** |
| **reports PARTIAL when the Windows probe is UNAVAILABLE even though every required gate passed** | **“reports Windows unavailability independently of passed gate evidence”**, report:762–771 retains PARTIAL and exact Windows reason. | Drops the same-scenario all-gates-passed assertion and preserved Windows status/reason evidence assertion. Both should survive in schema-v2 form. **P1.** |
| **makes absent or invalid supervisor results PARTIAL and check mode performs no repair** | **“makes absent or invalid evidence PARTIAL and check mode performs no repair”**, report:745–759 retains missing-input PARTIAL/reason, check-mode missing-report error, and no reports directory. Other invalid-input fixtures exist at :446. | Drops absent-input null evidence/empty art requests, the malformed-v2 input’s report assertions, and the otherwise-valid input with mismatched art path yielding invalid/PARTIAL/empty requests. **P1.** |
| **detects report drift in check mode without overwriting the supplied bytes** | Both expectations survive under **“detects report drift in check mode without overwriting supplied bytes”**, report:774–795. | **None. Renamed, preserved.** |

Additionally, the unchanged title **“records clean and dirty repository evidence through the injected Git reader”** weakened its dirty assertion to `changedFiles` alone at report:422. The clean repository assertion moved to :384; dirty name/root/commit checks did not survive.

Plan conformance, file by file:

| File / requirement | Status | Evidence |
|---|---|---|
| GI — typed inventory, closed discovery variants, argv/env/config/tier/report/prerequisites | **RESOLVED** | GI:18–62, :124–310 follows §5.1–5.2. |
| GI — validator | **PARTIAL** | GI:518–611 implements IDs, required env, paths, prerequisites, cumulative pin; IG1-F4 remains. |
| GI — derived renderer and receipt CLI guidance | **RESOLVED** | GI:369–399, :1363–1373; quoting test report:850. No stored hand-written gate command. |
| GI — separate execution/discovery environments | **RESOLVED** | GI:343–366 rejects all three module overrides for execution and removes all three overrides plus all three Playwright JSON keys for discovery. Fresh objects; no ambient mutation. |
| GI — concrete M-1 launcher authentication | **RESOLVED** | GI:897–919 checks Node, installed module, flock, and matching child-command suffix; both runner and reconciliation invoke it. Matches the actual M-1 command shape. Test isolation caveat below. |
| GI — phase-aware discovery and Playwright identity | **RESOLVED for valid evidence; PARTIAL at validation boundary** | GI:631–755, :926–971; initial/full and retry/failed-file comparisons, nested suite inheritance, `config.rootDir` resolution. IG1-F2 remains. |
| GI — outer receipts and runner | **PARTIAL** | GI:1049–1143 provides unique directories, exclusive receipt writes, revision capture and report hashes. IG1-F3/F5: incomplete accounting, predicate discrepancy, absent runner tests. |
| GI — D623.4 precedence and normal reconciliation states | **RESOLVED** | GI:1280–1287 checks drift before stale evidence; :1297 rejects outer failures; :1345 exposes retry state. Independently reproduced order mutant. |
| report.ts — schema-v2 consumers, readiness, prerequisites | **PARTIAL** | report:27–64, :193–245 correctly replaces claims and requires all entries plus Windows. IG1-F2/F8 remain. |
| report.ts — JSON/Markdown evidence | **PARTIAL** | report:307–319; IG1-F3. Atomic publication/check implementation survives at :370–440. |
| handoff-examples.test.ts — temp-root repair | **RESOLVED for identity; PARTIAL for lifecycle** | :54–77 consistently injects the temp policy; existing behavioral assertions survive. IG1-F7. |
| handoff-publish.test.ts — repair and default invariant | **PARTIAL** | :30–55 correctly injects policy; publication assertions preserved. IG1-F6/F7. |
| handoff-report.test.ts — repair and §7 matrix | **PARTIAL; assertion preservation NOT RESOLVED** | :136–153 and publication calls use temp roots/policies. Substantial negative coverage exists; IG1-F1/F5/F7 and mutation limitations remain. |
| package.json — one script, runtime/dependencies | **RESOLVED** | :50 adds precisely the planned command. Existing scripts and dependency declarations are unchanged. |

Identity repair is genuine for publication calls: all three fixtures use `{ownerCheckout: fixture.root, authorizedWorktrees: []}`. Their unique temporary directories cannot accidentally equal the fixed production allowlisted paths. Report-building calls use the injected Git reader; publication calls additionally inject the policy. Production `paths.ts` has zero diff and SHA-256 `f315f41a24cf17cd7cb928e1169b6b81aee358e55ccc214ec7e779ee2fb0f48a`. Exact policy-shape assertion exists only for the publish fixture; adding equivalent assertions for the other two would complete plan:543.

Membership comparison against the base declaration:

| Gate | Effective argv/env disposition |
|---|---|
| `full-typecheck` | Unchanged `npx tsc -b --force`. |
| `structural-scan` | Unchanged `sg scan`. |
| `unit-gate` | Unchanged `npm run test:gate`. |
| `production-build` | Unchanged `npm run build`. |
| `node-runtime-launch` | Same dedicated config/spec through M-1; M-1 supplies `--configLoader runner`. |
| `worker-dist-playwright` | Same config/worker selector, port 4410, workers 1, artifact dist; routed through M-1. |
| `browser-gate` | Unchanged script and port/worker env. |
| `cumulative-targeted-vitest` | Placeholder replaced by the exact historical 33-file union plus `d583-contract-inventory.test.ts`; **34 unique paths**, independently compared. |
| `worker-dev-playwright` | Same config/worker selector and dev env; routed through M-1. |
| `runtime-parity-playwright` | Same config/selector; explicitly adds authorized artifact `dev`; routed through M-1. |
| `top-down-smoke-playwright` | Same config/selector; explicitly adds authorized artifact `dev`; routed through M-1. |

All 11 names and their order survive. No selection or environment change beyond the authorized wrapper routing, two artifact declarations, and placeholder resolution was found.

Repository grep confirms the inventory consumers outside its defining module are `report.ts` and `handoff-report.test.ts`. `publish.ts:281/:289` still calls the unchanged publication API; external supervisor input migration is expressly outside this increment.

There is **no `.nvmrc` or `package.json.engines` pin to verify** in this worktree. The installed Node is **v24.13.0**, and direct native loading of GI succeeded. `heldout:guard`, bootstrap, doctor, publication, and art tools already use `--experimental-strip-types`; other tools use existing `vite-node`. This script introduces no new runtime dependency.

Ten mutation spot-checks:

| Mutant | Assertion inspected | Assessment |
|---|---|---|
| `M3-INV-PLACEHOLDER` | report:934–938 | **Candidate-rejection proof**, not independently demonstrated source-red execution. It verifies the expected validator error. |
| `M3-INV-DISCOVERY-REDIRECT` | report:890–901, :915 | Assertions require cleared ambient and inventory redirection keys. **Discriminating source-kill assertion**; lane’s source-red run not replayed here. |
| `M3-INV-RUNNER-SUBSTITUTE` | report:612–637 | **Real broad authentication kill independently reproduced:** failed→passed when authentication is removed. But the fake module also breaks the lock-command suffix. Removing only module equality still fails, so that narrower mutant **survives this fixture**. |
| D623.4 revision-order mutant | report:503–519 | **Real kill independently reproduced:** baseline failed/passed-M1 becomes stale not-run after reordering. |
| `M3-REPORT-STALE` | report:522–534 | Exact not-run, stale reason, null-M1 assertions discriminate stale acceptance. Source-red claim supported by the assertion; not replayed. |
| `M3-REPORT-RETRY-SCOPE` | report:585–609 | Discriminates retrying an initially passed file. Real kill for removing scope rejection; no separate unknown-file fixture. |
| `M3-REPORT-PW-IDENTITY` | report:969–1009 | Independent expected nested path and identity discriminate cwd-relative normalization; retry identity mismatch is also asserted. |
| `M3-REPORT-UUID` | report:669–695 | Phase-ID variant isolates the mismatch and can kill its removal. The malformed-JSON variant also changes the digest, so it does **not independently prove parsing rejection**. |
| `M3-REPORT-SKIP-HIDDEN` | report:719–742 | Real kill for hiding a **whole-file** skip. It does not cover mixed passed/skipped tests; IG1-F3’s probe exposes that gap. |
| `M3-DEFAULT-GUARD-REMOVE` | publish:293–297 | **Real exact-error assertion kill**, as reported. It is not an otherwise-valid-root admission control; IG1-F6. Independent mocked shared-Git control confirmed the stronger invariant is testable. |

No introduced global mutation or persistent module state was found that creates an `isolate:false` ordering dependency. Environment preparation is pure, and test fixtures are individually allocated. Temporary roots nevertheless remain on disk, and the default invariant retains a real-owner-checkout dependency.

Scope remains the six authorized files: no tier-based filtering, affected-test substitution, M-1 changes, M-2 files, docs, source/contracts/config changes, lockfile change, or new dependency. Gate membership and dedicated acceptance surfaces remain consistent with D584.4/D589/D603/D620. D623.4’s amendment is implemented correctly. Final working-tree status is clean.

**REJECT IMPL M3**

M3 IMPL REVIEW R1 DONE