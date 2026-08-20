# E04/E06 engine prerequisites mutation ledger

Each defect was applied alone after the authorized suites were green. The named
test failed, the production source was restored, and the same test passed.

| Mutation | Injected defect | Named killing test | Mutated | Restored |
|---|---|---|---:|---:|
| `override_invents_action` | Allowed an untyped arbitrary action payload in the steering override decoder. | `override_invents_action rejects an override that smuggles an action outside the typed set` | exit 1 | exit 0 |
| `delta_skips_hash_check` | Used a reconstructed delta without comparing it with the declared full-projection hash. | `delta_skips_hash_check requests a full snapshot when reconstructed bytes miss the full-projection hash` | exit 1 | exit 0 |
| `trigger_policy_ignored` | Consulted the exchange on every steering round without evaluating trigger-only policy. | `trigger_policy_ignored does not call the fake exchange on a quiet later round` | exit 1 | exit 0 |
| Own `override_order_nondeterministic` | Applied override entries in their incoming wire order instead of canonical typed-set order. | `override_order_nondeterministic applies the typed override set identically in either wire order` | exit 1 | exit 0 |
