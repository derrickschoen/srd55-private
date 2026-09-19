# BLIND-01 arch fix review r1 (gpt-6-astra MEDIUM, uncommitted diff on c0e2ef19)

tokens used
41,720
**REJECT — one P2 finding; no P1 or separate P3 findings.**

**P2 — `Object.create` bypasses the environment’s nominal type** at [blind-dodge-posture.test.ts:122](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/blind-dodge-posture.test.ts:122).

The original spread needed a cast because `RuntimeOfferEnvironment` requires private `#brand` ([build-offer-environment.ts:31](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/build-offer-environment.ts:31)). Neither spreading nor prototype inheritance transfers that private field. An in-memory TypeScript probe confirmed that the spread fails for missing `#brand`, while `Object.create(...)` infers `any`. The function’s return annotation therefore conceals the missing brand rather than proving a valid environment.

This passes the assertion detector but fails D617’s single-builder intent:

- The checker explicitly rejects environment spreads in its private-brand probe at line 964.
- “literal-and-clones” and “spread” are **negative query-port probes**, not accepted environment constructions.
- Its positive fixture permits a typed **query-port test double** under `tests/`; it does not authorize constructing another environment.

**Runtime equivalence:** The spy still clones and records each request, then delegates identically. Public `binding`, `digest`, policy, and catalog remain readable through inheritance. Option registration and resolution read `environment.digest` directly at `intent-resolver.ts:78` and `:637`, so those checks still work. I found no own-property, whole-environment serialization, or whole-environment cloning dependency on this option path. Launcher serialization reads `.binding` separately. Thus there is no demonstrated current provenance failure—but the private brand is absent, and public inherited fields disappear from own-property enumeration/serialization.

**Concrete correction:** Keep the environment genuinely builder-created. Use a test-local partial `vi.mock` of `engine-query-port`, supplying a typed canonical-port copy whose `path` records requests and delegates to the original implementation. Then call the unchanged `buildOfferEnvironment`; reset recording around the relevant test. This uses the permitted test-double seam while preserving the actual branded instance.

Neither proposed direct alternative exists today: builder inputs explicitly reject query overrides, and a spread cannot include ECMAScript private `#brand`.

The reported 11/11 result supports behavioral equivalence, not architectural compliance. I independently ran only read-only inspection and in-memory TypeScript/runtime probes; I did not rerun Vitest.

BLIND-01 REVIEW ARCH FIX DONE
