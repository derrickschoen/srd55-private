177,811
The sample yields **38 FAITHFUL, 6 DISTORTED, and 1 MERGED-WRONG** verdicts. Several defects concern citation precision rather than invented policy.

I numbered the 468 bullets consecutively across Parts A and B. Sampling used bullets **3, 15, …, 459**, plus **2, 5, 6, 7, 11, 13**: the earliest additional bullets containing literal numbers or paths, excluding citation numbers and digits embedded in product names. This reaches the 45-bullet cap.

Locations below refer to the [draft](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/compact/decisions-compact-draft.r1.md); source quotations come from the [original chronology](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md). Numbered sub-rulings and named findings were resolved even where they lack their own `## D…` heading.

| Bullet / line | Sampled subject and citations | Verdict | Finding |
|---|---|---|---|
| 2 / 17 | Admitted licenses — D367/D395 | **DISTORTED** | Citation defect: MIT/Apache admission belongs to **D59**: “SRD 5.2 CC-BY (attribution intact), MIT, Apache are fine.” Add D59; the cited expansions alone do not enumerate those licenses. |
| 3 / 18 | SA segregation and OGL quarantine — D176/D395.2/D396.supervisor | FAITHFUL | Preserves the separate license subtrees and prohibition on SA input to KB authoring. |
| 5 / 20 | MIT/CC0/CC-BY split — D126/D290/D547 | FAITHFUL | License assignments, generator outputs and distribution obligations agree. |
| 6 / 21 | NOTICE and attribution surfaces — D125/D191/D209/F1 | FAITHFUL | Merge maintenance and running-app/export/print attribution agree. |
| 7 / 22 | SRD provenance and extraction — D17/D78/D303/F6/F26/F27 | FAITHFUL | Preserves source verification, extraction and checksum obligations. |
| 11 / 26 | Private art research layout — D529 | FAITHFUL | Paths, no remote/push, links rather than stored images, and reader separation agree. |
| 13 / 28 | Dual CLEAN gate and v3 authority — D542/clean-room-open finding | FAITHFUL | Both approvals and the opened folder version agree. |
| 15 / 30 | Procedural art and atomic reference logging — D559/successful-reference finding | FAITHFUL | PNG validation, failed-fetch behavior and server ownership agree. |
| 27 / 46 | Reviewer outage hard stop — D586.169/RULES.md | FAITHFUL | Preserves the prohibition on substituting Claude and the blocked roles. |
| 39 / 61 | Resume and startup discipline — named findings | FAITHFUL | Writer completion, full UUID, session verification, repeated preamble and one-minute startup check agree. |
| 51 / 77 | Gate entry point and evidence sidecars — D617.20/D622.1 | FAITHFUL | Command, delegating shell wrapper and four-domain verdict agree. |
| 63 / 89 | Runtime mutation evidence — F25/named findings/RULES.md | FAITHFUL | Preserves compiling behavioral mutants and proof of actual application. |
| 75 / 101 | Persisted arena rows and real MCP children — D586.106/named finding | FAITHFUL | Both the consumed-artifact boundary and sandbox-evidence limitation agree. |
| 87 / 118 | Publication/deployment authorization — D121/D128/D228/D266/D286/D386.14 | FAITHFUL | Existing publication does not supply new outward authorization. |
| 99 / 134 | SQL CHECKs and rebuild workflow — D13/F20/F21 | **DISTORTED** | Broadens a conditional workflow into a requirement for every CHECK-table rebuild. F20 says: “drizzle-kit emits the rebuild for CHECK-bearing tables; **drop-plus-add needs a TTY** so migrations are two generated steps with the data transform between.” Preserve the drop-plus-add qualification. |
| 111 / 146 | Single environment composition root — D617.5/D617.9 | FAITHFUL | Construction, mode inputs, digest identity and shared-helper path agree. |
| 123 / 160 | Host digest negative witness — D617.12 | FAITHFUL | Exact required mutant and host-level coverage agree. |
| 135 / 175 | Multiclass skills; prose-only tools/languages — D44/D102 | FAITHFUL | Choice pools, exclusions and v1 modeling boundary agree. |
| 147 / 187 | AC warning and proficiency — D73/D76 | FAITHFUL | Strict reduction, separate exclusion disclosure and attunement distinction agree. |
| 159 / 199 | Export closure and oversized links — D46/D81/D139/D218 | FAITHFUL | Correctly retains later closure and install-then-open semantics. |
| 171 / 211 | Entire spell-slot section suppression — D143a | FAITHFUL | Preserves the explicitly adopted fallback. |
| 183 / 224 | Agent-readable data and live gaps — D4/F15 | FAITHFUL | Collapsed data, no agent instructions and live-data binding agree. |
| 195 / 240 | Conversion approval and clean-room process — D174/D175/D177 | FAITHFUL | Approval stages, research-session retirement and collision policy agree. |
| 207 / 252 | Registered oracle authority — D257/D259 | FAITHFUL | Correctly incorporates the one-row correction and later registration-required design. |
| 219 / 264 | Surface mechanics and exclusions — D371/D371.1/D373.10/D373.17/D378 | FAITHFUL | Numeric mechanics, optional-rule default and permanent exclusion agree with the cited records. |
| 231 / 276 | Tactical action defaults — D502/tactical-action finding | FAITHFUL | Numbers agree; the preceding tactical-v2 bullet supplies the default-off scope. |
| 243 / 294 | Whole VTT and AI-only development — D352.1/D396.3/D546/D548/D321.17/D329.7 | FAITHFUL | Product scope and absence of a human-playtest prerequisite agree. |
| 255 / 306 | Windows handoff and screenshots — D586.179/D588.2 | FAITHFUL | Data-only treatment, reply directory and capture-tool behavior agree within this handoff context. |
| 267 / 318 | Ranked advice, draft plays and skills — D405.4/D405.5/D461 | FAITHFUL | Draft-returning tools remain distinct from automatic submission. |
| 279 / 330 | `engine.query_line` and numeric budget — D576.1/D576.2 | **DISTORTED** | Citation defect: D576.1 only specifies “rate-limited like KB reads … **report the budget as a knob**.” The **0–3/default 1** rule and named refusals appear in the separate **“D576 plan APPROVED at round 2”** record: “per-round budget 0-3 with default 1.” Cite that record. |
| 291 / 342 | Visibility fields and ordinary darkness — D626/D626.3 | FAITHFUL | Correctly applies the later target-only darkness ruling. |
| 303 / 354 | Death rules and modeled reversal — D314.7/D314.8/D315.5/D373.8/D377.8 | FAITHFUL | Preserves later modeled-Revivify scope over the earlier general fiat treatment. |
| 315 / 366 | Survival target and rehearsal coverage — D377.11/D382/D386.2–5 | **DISTORTED** | Loses the measurement endpoint. D382 requires PCs to “**get through the LAST encounter at least 2/3 of the time**”; D386.4 binds that floor to Standard. “Standard encounter target survival” can be implemented as a per-encounter target instead of survival through the sequence. |
| 327 / 379 | Separate DM browser window — D315.11 | FAITHFUL | Projection, hidden results and player-chrome separation agree. |
| 339 / 396 | Last-seen markers — D545/D663/D666 | **DISTORTED** | Makes required behavior optional: “**may have** last-seen … ghost.” D545 says “the player board **shows a ghost or fog marker** at the cell where it was LAST SEEN.” Later citations repair knowledge provenance; neither withdraws the display requirement. |
| 351 / 412 | Luna default and Sol-only steering — D406/D586.39/D587.5–6 | FAITHFUL | Correctly incorporates the later teacher restriction. |
| 363 / 424 | Both-arm screenshots and rejudging — D510/D521 | FAITHFUL | Capture-only control, off-byte identity and fresh judgments agree. |
| 375 / 436 | Training smoke and parked training — D409.2/D410/D411/D412.2/D414 | **MERGED-WRONG** | Retains D411’s smoke authorization as a current permission after D414 parks training: “**ALL training work is parked at the D410 smoke (tooling committed, adapter proven) until the corpus milestone**.” State that the smoke is completed and training is parked; do not leave an apparent continuing smoke allowance. |
| 387 / 448 | E-series overlap, caps and promotion — D321.2/D321.8/D328.1–2/D329.5 | FAITHFUL | Experiment-specific sequencing and acceptance requirements agree. |
| 399 / 462 | Independent brainstorming — D405.2 | FAITHFUL | Preserves writing the supervisor’s designs before reading collaborators’ proposals. |
| 411 / 479 | Product name and Discord preparation — D295/D315.18/D317.12/D324/D328.7 | FAITHFUL | Name, placeholder, credential boundary and showcase scope agree. |
| 423 / 500 | N1 zero-speed fixture and B9 amendments — D650/D664/D671 | FAITHFUL | Both zero-speed mechanisms and explicitly rederived later behavior are preserved. |
| 435 / 521 | Generation-two-only witness — D634 | FAITHFUL | Exact distinguishing failure and direct caller updates agree. |
| 447 / 539 | PROMO180 landed status and queued features — D599/D586.73/D586.146/D586.37/D587.8 | **DISTORTED** | Citation defect: D599 authorizes “**A fresh three-round unit**”; D586.146 concerns the **D569 runbook**, not PROMO180 landing. The claimed completion is supported by **D586.181**: “promo180 … merged gate … green … Merged as 8a81d20e.” Add that citation. |
| 459 / 561 | Interim UI routing and supervisor identity — D249/D532/D555/D585/D615 | FAITHFUL | The interim UI resolution is recorded in the conflicts document referenced by the chronology; D615 supports the unresolved restoration caveat. |

The owner-absent list below covers the last-30-day records, including the requested D586.x and D600+ focus. **An absent ID does not necessarily mean its substance is wholly absent**; some directions survived under other citations. Completed dispatches, superseded experimental choices and the already-reported D673–D676 issues are excluded.

| Absent owner ID | Still-executable direction |
|---|---|
| **D327** | Fixture residue that Codex cannot resolve receives independent Fable/Opus scrutiny before the remaining disagreements reach the owner; Claude-authored patches still require Codex verification. |
| **D372** | Private clone evaluation uses both representative and BG3-style parties, with Honour Mode/full legendary kits as the target. |
| **D409** | Continue the standing Luna-low/Luna-medium improvement loop through collaborative experiment design, implementation and blind judging. |
| **D418.1** | Monster-planning intel may use exact PC capabilities/resources; this grants neither unseen-position knowledge nor reciprocal PC omniscience. |
| **D586.2** | Escape, attrition and ordinary objective completion do not constitute monster victory; retain this surviving direction with D586.18’s later capture amendment. |
| **D586.3** | The 180-second setting including Luna medium remains the later teacher/student measurement setting, with cost and failure reporting; its model-promotion framing was withdrawn by D586.39. |
| **D610** | Quietstone’s authored-asset evaluation envelope must remain separate from intact procedural assertions; carry the owner authorization for that distinction. |
| **D616** | Overlay changes are chrome, remain bound by the art invariants/envelope ledger, and require independent same-change invariants for moved pins. Its old fog-merge condition must remain superseded by D626. |

For report material in Part A, I found **mixed rule/report bullets, rather than wholly disposable report-only bullets**. Remove or relocate the following portions without deleting their continuing rules:

| Draft location | Material to remove from Part A |
|---|---|
| **L405 — Quietstone envelope** | “58/59 replacements” is integration-scope/status material. Put it with the in-flight Quietstone unit or archive; retain the authored/procedural distinction and thresholds. |
| **L431 — D576 era boundary** | The completed geometry commit pin `567cc8aa` and its translation detail belong in the historical experiment record. Retain the prohibition on pooling incompatible eras and the real-engine-policy requirement. |
| **L467 — H1/H4 comparisons** | “H4 reason experiment was seed-paired30/arm…” describes a historical preregistration. Archive that description; any unresolved follow-up belongs in Part B. |

The draft preserves most sampled rules accurately, including several difficult later amendments. It is not yet safe to treat as a fully faithful replacement: mandatory behavior becomes optional, a survival threshold loses its endpoint, and completed training smoke becomes an apparent continuing authorization. Correct those semantic changes, attach the actual supporting records to numerical/status claims, and preserve the surviving owner directions before retiring the chronology from active use.

AUDIT DONE
