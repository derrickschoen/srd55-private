# BLIND-01 arch fix review r2 (gpt-6-astra MEDIUM, candidate 82d0ad82)

tokens used
48,338
**REJECT — one P2 finding; no P1 or P3 findings.**

**P2 — the mock lacks module-cache isolation** at [blind-dodge-posture.test.ts:33](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/blind-dodge-posture.test.ts:33).

The premise of per-file module isolation is false here: [vitest.config.ts:53](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/vitest.config.ts:53) sets `isolate: false`. Installed Vitest resets evaluated modules only when isolation is enabled. Its mock registry is file-scoped, but cached consumers are shared:

- If another file loads `build-offer-environment` first, this file can receive the cached builder bound to the original port, bypassing recording.
- If this file loads it first, later files can receive the cached builder bound to this file’s recording wrapper.

Clearing `PATH_REQUESTS` and `restoreMocks: true` do not remove those cached bindings. The reported 20/20 query-port result does not establish isolation: this wrapper delegates unchanged behavior, so that suite can pass while using it.

**Required correction:** establish fresh module evaluation before these imports and clean up the module mock and cached consumers at the suite boundary, or run this file with actual module isolation.

The remaining review points pass:

- **Construction:** lines 31–45 implement the requested hoisted, typed, frozen partial port mock. Both environments use the unchanged builder and retain the genuine private brand.
- **Request attribution within this file:** the only recording assertion is line 479. Its test explicitly passes its environment to generation and resolution; no `BASE_ENVIRONMENT` operation intervenes. Hooks clear other tests’ requests. Generation already performed resolution before the explicit resolution call in the original test, so that existing attribution limitation was not introduced here.
- **Behavioral assertions:** none were removed or weakened. The 14 removed lines replace imports, spy construction, and local recorder wiring; expected paths, costs, actions, and event assertions remain unchanged.

Read-only review only; supervisor checks were not repeated.

BLIND-01 REVIEW ARCH FIX R2 DONE
