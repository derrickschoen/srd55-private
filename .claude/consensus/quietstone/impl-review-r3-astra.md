1. **Q-F7 — RESOLVED.** [Plan:272](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md:272) specifies Fable/Astra/Sol, all high. [Probe:2189](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2189) passes Claude’s model and effort explicitly. Image roots, copied baseline harness, and comparison protocol remain consistent. Installed `claude --help` confirms the relevant flags. Plan SHA matches `c047a994…`.

2. **Q-F10 — RESOLVED.** [Probe:2133](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2133) loads and augments the actual question schema; the invocation supplies it through `--json-schema`. [Probe:2081](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2081) removes the verification field and validates the answer locally. Tests cover schema delivery and structured-result decoding.

3. **Q-F11 — RESIDUAL: isolation fixed; image access remains indirectly inferred.** [Probe:2161](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2161) creates the one-PNG directory, and the invocation disables project customizations and limits tools to Read. Those settings match installed CLI help.

   However, [Probe:2073](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2073) merely compares **model-reported** dimensions and label count with expected numbers. It observes no successful Read/tool-result event. Matching numbers can pass without evidence of image delivery; a counting error after successful delivery becomes “image unverified.” The transport test likewise supplies those numbers through its stub.

   Additionally, [Probe:2069](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2069) classifies missing `structured_output` as `schema_rejected` **before** checking image verification, permitting a scored zero without verified image access.

   **Ledger disposition:** the supervisor can attempt the planned three-seat run, but Fable’s image access must be described as an indirect content check. Establish successful PNG delivery through actual transport/tool-result evidence before calling its scores image-verified. Rows lacking that evidence should remain unverified, rather than support an art-regression conclusion.

Checked committed HEAD `dc217f23`; working tree is clean. No model calls, edits, or build. No new Q-F12 finding.

**RESIDUALS: Q-F11**