# PUBLISH-01 — astra HIGH plan review r8 (session 01a0c045-9145-7070-a206-54a5089d43c0, 122,390 tokens, final message only)

**VERDICT: REJECT — 0 P1 / 3 P2 / 0 P3.**

Read r7 and D815/D820/D823/D829. D823 closes the narrative-scrub finding; ordinary design-history comments are not findings.

All three supplied hashes and line counts match. The generator’s inventory reproduces **byte-for-byte: 18,438 bytes**, including **193 occurrences / 175 lines, 170 RETAIN, 23 REWRITE**. Execution caveat: the exact invocation stalled at this sandbox’s Git batch stdin/EOF boundary. I completed execution with a transport-only substitution supplying all 1,136 blobs after verifying each against its Git object ID; scanner policy was unchanged. I also independently recomputed all 193 occurrence keys.

**P2-1 — The new command-integrity rewrite invalidates persisted undo signatures.**

[Ledger line 110](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:110) says:

> “command integrity becomes `srd55-command-integrity-v1`”

This value is an **HMAC key**, not merely a public-facing identifier. [integrity.ts:48](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/commands/integrity.ts:48) imports its bytes as the signing/verification key. Signed inverse commands are persisted in `character_operations.inverse_command`; undo passes them through [signature validation](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/commands/character-command-factory.ts:87). Complete database backups preserve that history.

An independent HMAC probe confirms that a signature produced with the existing key verifies with that key and fails with the proposed public key. Consequently, restoring a private-edition database into the public edition can make otherwise eligible signed undo operations fail. No preservation mechanism is specified. B8’s “public identifiers/caches” verification does not establish this property.

**Required:** explicitly resolve the persisted signing contract—through a reviewed exact protocol exception or a preservation mechanism—and require a private-database → public-edition import/undo witness. Do not silently discard history or bypass signature validation.

**P2-2 — The frozen generator cannot scan the implementation’s required publication inputs.**

[Plan line 551](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:551) requires:

> “committed generator byte-equals it and rerun stdout equals D”

[Ledger line 125](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-disposition-ledger.md:125) requires the curator to run that same script from the selected commit and byte-compare its output.

But [generator line 186](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:186) hard-rejects anything other than **1,136 blobs / 26,798,325 bytes / 1,040 text / 96 binary**. B1 adds `public/robots.txt`, which this script selects; [plan line 73](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-19-publish-01-plan.md:73) explicitly requires **1,137 committed inputs**. Later authorized edits also change byte totals. Additionally, generator line 709 includes the selected commit SHA in byte-compared output.

Running only against `8c2219ad` reproduces the baseline but does not scan those later inputs. Running against the publication commit fails the frozen assertions.

**Required:** distinguish baseline-audit reproduction from publication-input scanning, and specify the reviewed transition between them. Include a successful witness after the authorized additions/edits, while preserving rejection of unreviewed occurrences. Update generator authority and batch allocations accordingly.

**P2-3 — RTF table boundaries and visible field results still hide mechanical tokens.**

The new punctuation handling works, but [generator lines 217–248](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp/runs/publish-01/ledger-gen.mjs:217) classify `field` as entirely ignored and omit table separators from textual handling. Running the actual decoder and scanner functions gives:

| RTF input | Normalized result | Codex hits |
|---|---|---:|
| `codex\emdash private` | `codex-private` | 1 |
| `codex\cell private\cell\row` | `codexprivate` | 0 |
| `{\field{\*\fldinst HYPERLINK url}{\fldrslt codex}}` | empty | 0 |

These constructs exist in the selected corpus: **55,900 `\cell`, 17,971 `\row`**, and a visible hyperlink field in `Legal.rtf`. The current eight archive hits still reproduce; this finding concerns scanner coverage, not evidence of an existing leaked token.

**Required:** preserve table boundaries and rendered field results while skipping field instructions. Add positive token witnesses for both, then regenerate the inventory and keys.

The remaining requested checks pass at plan level:

- All 23 rewrite sites exist; the other rewrite rationales and 170 exact retained occurrences are bounded. The signing-key exception is the substantive problem above.
- Primary-name, real split-word, formatting, negative-formatting, and punctuation witnesses reproduce.
- `PUBLIC-BUILD.txt` contains only the public content identifier; plan line 536 requires a private-SHA mutant in that generated file to fail.
- Baseline selection reproduces **1,136 blobs / 26,798,325 bytes**; planned additions total **1,144**.
- Both migration checksums reproduce unchanged. The bundled artifact hash, aggregate, **444 ordered entries**, and entry-vector hash reproduce.
- Licensing, PHB/Barbed withholdings, owner-holder and SRD 3.0 notice gates remain specified.
- Batch sizes are **10/1/10/10/10/10/9/8/10/10/10/8/7/6/5/7**; each has R/V/M, B3 runs the generator, and B16 is last.
- Ten additional full-file samples beyond the recorded r4–r7 samples: domain `class-resource-value-expression`, `class-resources`, `equipment-effects`, `source-markers`, `value-expression-errors`, `weapon-damage-errors`, `weapon-range-errors`, `subclass-feature-description`, `subclass-feature-description-errors`, and `feature-values-errors`. No additional finding.

Return to the owner under the stated escalation rule. No files were changed, and no agents, network calls, or builds were invoked.

PUBLISH-01 PLAN REVIEW R8 DONE
