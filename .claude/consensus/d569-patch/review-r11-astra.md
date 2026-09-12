**F35 — High — The replacement identity checks do not fully replace the frozen oracle.** At [ai-dm-legacy-invariance.test.ts:512](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-legacy-invariance.test.ts:512), the second run recomputes its digest using the same production journal implementation; line 571 compares that result with the first run. This proves repeatability and persistence consistency, not correctness of the digest’s contents. A deterministic omission from the production digest moves both sides together and survives normalization. Similarly, lines 566–569 and 635–637 check agreement between production-generated capsule, context, and proposal bindings without independently validating the capsule digest.

**F36 — High — Launcher oracle substitution remains.** [ai-dm-legacy-invariance.test.ts:665](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-legacy-invariance.test.ts:665) replaces recovery spool paths with oracle values after only checking for `-recovery-`; line 681 copies the oracle’s entire `branchPoints` array after only array checks; line 699 copies its state handle after a syntax check. Incorrect recovery destinations, changed initiative branches, or an incorrectly bound delta context can therefore pass the nominal exact comparison. These are additional weakened assertions beyond the reported timing normalization.

**F37 — High — The protocol-byte test substitutes arbitrary digests before asserting equality.** [ai-dm-legacy-invariance.test.ts:820](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-legacy-invariance.test.ts:820) maps every 48/64-character hexadecimal match to the corresponding oracle value. Matching count and repeated-value consistency do not establish semantic correctness. An incorrect digest with the same occurrence pattern is erased before the byte, length, and SHA assertions at lines 839–842. Restrict normalization to individually justified fields with independent invariants; blanket digest replacement is not a valid frozen-byte check.

The explicit five-field ruling:

| Field | Ruling |
|---|---|
| `proposalId` | **Acceptable derivation check**, subject to independently validating its state-digest input. Lines 622–629 independently spell out the ID formula; deterministic-default IDs remain literal expectations. |
| `rawTurnContext` | **Insufficient for the normalized state handle.** Remaining context content still compares against the oracle, but agreement with the row’s capsule digest does not independently prove that handle identifies the correct capsule. |
| `agentSessionDigestHash` | **Not an acceptable substitute.** A second production run is a determinism check. Assert an independently specified digest payload and hash, or use an independently reviewed replacement pin backed by that invariant. |
| `stateBinding` | **Insufficient for the erased digests.** Revision and cross-component agreement remain useful, but capsule/authorization content must be independently established before their hashes are normalized. |
| `teamPlans` | **Mostly preserved, with a hash-check gap.** Non-normalized plan fields still face exact comparison; proposal IDs and default hashes have explicit formulas. However, line 631 reuses production `authorizedRoundProposalHashInput` for the expected hash. An independent full-envelope expectation—including optional `intelCapture` and `submittedArguments`—would close that gap. |

Legitimate identity changes permit a reviewed migration of expectations; they do not make production-against-production equality an independent oracle.

Other checks:

- [The proposal projection](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:3216) retains every **current** `RoundTurnProposalEnvelope` field, including optional provenance. It excludes the appended `dispatchId` (launch identity), `dispatchProfile` (transport tool profile), and `dispatchPhase` (dispatch classification). Those exclusions are appropriate for the domain hash; domain `phase` and state binding remain included.
- Relative readiness paths resolve against the launcher directory in both [entrypoint](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/mcp/entrypoint.ts:1069) and [Codex](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/agent-adapters/codex.ts:467); absolute paths remain supported.
- `firstDifference` correctly returns `null` after successful recursive comparisons. `expectExactJson` still rejects unequal serialized inputs, so this diagnostic fix does not hide differences.
- Frozen contract and runbook hashes match the supplied pins. No tests were run during this review.

REJECT