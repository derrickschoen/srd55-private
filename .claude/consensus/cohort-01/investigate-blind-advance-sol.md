<!-- trimmed 2026-09-18 (D683): full codex log (3478931 bytes) replaced by the lane's final message; session id 01a0b2db-327e-7a90-bf63-3afa9243787e; the full log is in the mirror history of commit 8889b450 -->

The change is mechanically modest, but “last known” alone will not solve the rejected cohort: all 36 blind monsters in 6209 have never observed a PC. The smallest change consistent with the existing knowledge rulings is a topology-only blind reposition branch on the existing Dash offer.

The checkout remains clean and detached at `bea24cbe4b7b8d6ee77f230c36d604f6b06f7c95`.

## 1. Current movement-offer path

The exact path is:

1. [`engineActorOptionsForEnvironment`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/intent-resolver.ts:82) calls `engineActorOptions`, then merely binds the environment digest to every offerable option at lines 88–90. The environment does not participate in declaration generation here.

2. [`engineActorOptions`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/turn-option-registry.ts:186) rejects non-monsters, obtains envelopes from `generateEngineOfferEnvelopes` at line 193, classifies them as engine-offerable or human-only at lines 200–214, then sorts them.

3. [`ENGINE_OFFER_CAPABILITIES`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/offer-generator-registry.ts:4) currently contains exactly one builder, `standardOfferGenerator`; line 9 flat-maps its declarations.

4. [`standardOfferGenerator.generate`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/standard-offer-generator.ts:12) calls `generateStandardOfferDeclarations` and wraps each declaration in a standard envelope at lines 13–22.

5. [`mainUses`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/offer-declarations.ts:415):

   - Enumerates attacks and multiattacks against every living non-ally from `livingEnemies`, lines [61–66](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/offer-declarations.ts:61). That source is not knowledge-filtered.
   - Adds Dodge, Disengage, Dash, and End Turn at lines 490–507.
   - Dash is declared at lines [497–506](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/offer-declarations.ts:497) with maximum movement `speed * 2`, stance `close_to_melee`, and anchor `{kind: 'nearest_visible_enemy'}`.
   - [`generateStandardOfferDeclarations`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/offer-declarations.ts:607) combines each main action with compatible bonus actions.

6. Raw declarations are not the available menu. [`availableEngineActorOptions`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/intent-resolver.ts:635) keeps only options for which `resolveEngineActorOption(...).valid` is true.

7. [`movementResolution`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/intent-resolver.ts:308) recognizes Dash as a “productive close” because it has no action-target constraints, uses `close_to_melee`, and has a non-null anchor, lines 319–321. It then:

   - resolves the anchor at line 329;
   - returns `null` if there is no anchor combatant or token, line 330;
   - otherwise calls `queries.approach`, lines 335–340.

   A null movement resolution becomes `OPTION_UNREACHABLE` at [`intent-resolver.ts:560–561`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/intent-resolver.ts:560).

8. [`resolveTarget`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/engine-query-port.ts:1009) builds the enemy candidates at lines 1033–1042. For `nearest_visible_enemy`, a candidate must be:

   - positioned;
   - alive;
   - non-allied; and
   - exactly `detectCombatant(...).kind === 'seen'`.

   It returns `null` when that set is empty at line 1053.

Therefore the precise predicate suppressing Dash is:

```text
no positioned, living, non-allied combatant has detection kind "seen"
```

“All enemies are `undetected`” implies that predicate, but the implementation is actually narrower than “no detected enemy”: an enemy that is merely `located` also does not qualify as `nearest_visible_enemy`.

The raw Dash declaration still exists. It disappears only during resolution/filtering. Raw attack declarations also still exist because `livingEnemies` uses omniscient encounter membership; they can survive if their separate action/range/movement checks pass. In the 6209001 non-caster cases they do not, leaving only Dodge and End Turn. Disengage is declared but classified human-only when it has no modeled effect.

## 2. Knowledge and the SRD

### Existing knowledge

[`projectActorKnowledge`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/intel/actor-knowledge.ts:226) is already the canonical actor-local producer:

- `seen` or `located` becomes `perceived`, with current position, lines 258–279.
- Otherwise [`unlocatedTarget`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/intel/actor-knowledge.ts:98) looks for the observer-subject pair in `observationHistory`.
- A record produces `suspected` plus the historical cell, lines 103–113.
- No record produces `unknown / never_observed`, lines 115–122.

`EncounterState.observationHistory` is explicitly the canonical observer-subject last-known store at [`encounter.ts:798–801`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:798). [`reconcileObservationHistory`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:2154) refreshes it only when the observer can currently see the subject; unperceived movement does not update it.

There is also richer monster-only `searchMemories`:

- [`SearchMemory`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/search-memory.ts:53) contains `lastKnownPosition`, an expanding suspicion region, expiry, and `move_and_search`/ready/suspected-square/AoE options.
- But [`reconcileSearchMemories`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:2255) creates one only after a previously seen enemy becomes undetected.
- [`searchMemoryCause`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/combat/encounter.ts:2234) accepts hiding, invisibility, darkness, or obscurement. It explicitly rejects `blocked` and `out_of_range`, lines 2249–2251.

So a monster that has never seen a PC has no target position at all under the current knowledge model. It can be given a knowledge-neutral search destination, but not a PC target. In the measured populations below, every one of the 185 blind monsters was `unknown / never_observed`: 0 had suspected/last-known knowledge.

Tests already pin this distinction at [`last-seen.test.ts:233–251`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/last-seen.test.ts:233).

### Binding decisions

- [D476](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:1372) selects “observed facts plus defined inference” and excludes invisible/hidden positions at lines 1377–1387.
- [D420](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:3269) authorizes last-known position, expanding suspicion, move-and-search, and suspected-square attacks.
- [D545](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:11102) says last known is historical knowledge, not the creature’s current cell.
- [D625](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22580) requires one actor-knowledge producer.
- [D418.1](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:3382) grants the AI DM exact PC capabilities and resources. It does not grant monsters exact unseen positions.
- [D662](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:23128) records the present no-Dash mechanism.

Thus nearest true PC position would contradict D476/D545 unless the owner explicitly replaces that spatial-knowledge ruling.

### 2024 SRD

The repository’s SRD says:

- Search is a Wisdom check to discern something non-obvious, with Perception used for a concealed creature and Survival for tracks: [`srd-5.2.1.txt:12010–12024`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/docs/srd/full/srd-5.2.1.txt:12010).
- A creature may attack something it cannot see, either by guessing a location or targeting something it can hear. The attack has Disadvantage, and it misses if the target is not actually at the chosen location: [`srd-5.2.1.txt:884–894`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/docs/srd/full/srd-5.2.1.txt:884).

The SRD permits movement and attacks while sight is absent; it does not reveal the target’s exact current position or prescribe a particular blind-advance AI.

### D584/ELEVATION ownership

The tracked D584 plan owns 72 paths, pinned at [`d584-contract-inventory.test.ts:30–49`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d584-contract-inventory.test.ts:30). Its later slices explicitly include:

- `encounter.ts`, `engine-query-port.ts`, `intent-resolver.ts`, and `turn-option-registry.ts` at [`2026-09-08-elevation-tiers-plan.md:7–18`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/d584/2026-09-08-elevation-tiers-plan.md:7).

That older plan predates the offers split and does not list `actor-knowledge.ts` or `src/vtt/offers/**`. The accepted ELEVATION-02 plan is much broader—221 paths per [D636.6](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22898)—so changes to movement objective types, `intent-resolver`, or the query port need explicit ownership/rebase reconciliation. An offers-only declaration/helper change has less direct overlap.

## 3. Design space and cost

### A. Advance toward the nearest PC’s true position

Mechanically, the smallest patch is a fallback inside `resolveTarget`: if `nearest_visible_enemy` has no seen candidate, rank all living enemies by their true token positions.

- Direct production surface: `src/vtt/engine-query-port.ts`; possibly `offer-declarations.ts` only for labeling.
- No actor-knowledge, option-registry, environment-builder, or snippet change is necessary.
- `basic_advance` already recognizes every main-action Dash at [`registry.ts:158–160`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/snippets/registry.ts:158) and selects it before defense at lines 185–202.
- Raw estimate: 1–2 production files, 3–6 focused test files, about 5–12 behavior assertions/pins.

However, this silently changes the meaning of `nearest_visible_enemy`, bypasses the single knowledge producer, and uses forbidden unseen coordinates. An honestly named new omniscient selector would also require the selector union, MCP schema/decoder, declarations, query-port resolution, and associated generated/schema tests: approximately 8–12 files and 10–20 pins.

This is the smallest code patch, but not a bounded change under D476/D625 without an owner ruling.

### B. Last-known position, then search fallback

The last-known half is already available from `projectActorKnowledge`/`observationHistory`. No second knowledge implementation should be added.

The obstacle is the movement type: [`EngineEngagement.anchor`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/turn-proposal.ts:115) accepts only `EngineTargetSelector`, and productive-close resolution converts that selector to a combatant and then reads the combatant’s current token at [`intent-resolver.ts:329–334`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/intent-resolver.ts:329). It cannot express a historical cell.

Likely surface:

- `turn-proposal.ts`: typed cell/search anchor or new search stance.
- `intent-resolver.ts`: resolve movement toward that historical/generic destination.
- `offers/offer-declarations.ts`, or a new `offers/blind-advance.ts`: select perceived, suspected, then fallback.
- `actor-knowledge.ts`: preferably unchanged; at most a knowledge-safe selection helper.
- MCP schemas/serialization if the new anchor is externally projected.
- `snippets/registry.ts`: no new play name is needed if the action remains Dash, though its `basic_advance` description at lines [388–392](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/snippets/registry.ts:388) should acknowledge advance rather than saying only offense/defense.

Estimated implementation: 5–8 production files, 6–10 focused test files, roughly 12–18 files and 10–25 pins total.

Crucially, this option still needs its search fallback to repair turn-one 6209. All 36 blind 6209 monsters are `never_observed`; last-known-only would change none of them.

### C. Generic reposition toward unexplored space/an opening

This does not require a PC coordinate or knowledge mutation. A deterministic movement objective could rank reachable positive-cost cells by a topology-only goal such as an opening, an exploration frontier, or distance toward a public room reference point.

The smallest form is a blind branch on the existing standard Dash—not a new action or play:

- `turn-proposal.ts`: add a typed `reposition`/search stance if needed.
- `intent-resolver.ts`: enumerate/rank legal positive destinations for that stance.
- `offer-declarations.ts`: use it only when no enemy is perceived.
- Optional small helper under `src/vtt/offers/`.
- `actor-knowledge.ts`, `turn-option-registry.ts`, and the play-name list need not change.
- `basic_advance` will select it automatically because it remains a Dash.

Estimated implementation: 3–5 production files, 4–7 focused behavior tests, about 7–11 files and 8–18 pins.

A literal room center or nominal opening is insufficient unless the resolver proves the selected cell is reachable and produces positive movement. The measurement proves that some such destination exists for every affected monster, not that every proposed ranking rule will choose one.

A separate new “reposition” offer capability is larger. The family-policy type already contains `reposition`, but it is disabled in the legacy policy at [`offer-environment.ts:77–84`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/offers/offer-environment.ts:77), and declaration generation presently receives no environment policy. Wiring and enabling that family would move binding/digest surfaces and likely raise this to roughly 12–20 files.

### OFFERS architecture constraints

The D617 checker requires:

- The only runtime environment builder/export is `buildOfferEnvironment`: [`check-offer-environment-architecture.mjs:8–20`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/scripts/check-offer-environment-architecture.mjs:8).
- No query-port object literals, spreads, cloning, or alternate construction outside the query-port implementation: lines [418–462](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/scripts/check-offer-environment-architecture.mjs:418).
- No alternate environment-returning export or builder re-export: lines [556–579](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/scripts/check-offer-environment-architecture.mjs:556).
- Exactly one module-private runtime class, one builder, one canonical-port import, and three validated construction branches: lines 582–655.
- No direct canonical-port import, re-export, member access, or value reference outside the builder/query-port modules: lines 790–884.
- No cast around the private `EngineOptionEnvironment` brand: lines 1477–1505.

The implementation must therefore use the injected `environment.queries` inside resolution. It may not manufacture or wrap another query port/environment.

### Contract and pin impact

The D583 inventory always retains its fixed baselines and then adds changed specs plus the transitive reverse-import closure at [`d583-contract-inventory.ts:223–270`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tools/d583-contract-inventory.ts:223). Read-only hypothetical runs against this checkout gave:

- no-change inherited union: 148 specs;
- changing any one of `offer-declarations.ts`, `turn-proposal.ts`, `intent-resolver.ts`, `actor-knowledge.ts`, or `engine-query-port.ts`: 214 specs;
- net transitive addition: 66 specs.

Expected direct behavior surfaces are:

- Standard Dash shape: [`standard-offer-generator.test.ts`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/standard-offer-generator.test.ts).
- Option hashing/modeling: movement is inside the canonical option body, so anchor/stance changes change option IDs at [`option-modeling.ts:26–33`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/option-modeling.ts:26).
- `basic_advance`: [`snippets.test.ts:329–341`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/snippets.test.ts:329).
- Room-8’s four exact paths/actions: [`engine-opportunity-movement-intel.test.ts:71–163`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/engine-opportunity-movement-intel.test.ts:71).
- Hard-family/composite and speculative-planning pins identified in D635.54.
- Frozen round execution rows: [`arena-basis-brutal-b.test.ts:425–431`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/arena-basis-brutal-b.test.ts:425).
- Active cohort productivity: [`arena-basis-brutal-v2.test.ts:77–104`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/arena-basis-brutal-v2.test.ts:77), especially its positive-Dash witness at lines 185–199.
- D569 primary/second-family route and row tests. Historical v1/v5 manifests and observed rows should remain frozen; changed behavior belongs in the already-planned versioned v2/v6 artifacts. The retired 6207 productivity check is visible at [`d569-second-family-manifest.test.ts:142–150`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-second-family-manifest.test.ts:142).

## 4. Measured population

I decoded each fixture, applied `freshMonsterPlanningState`, and classified a monster as blind only when every living non-ally returned `undetected`. A legal positive destination means the canonical query port found at least one in-bounds Dash path with `legal === true` and `costFeet > 0`, under a `speed * 2` budget.

For 6209 I used the two retained outputs generated by the exact requested empty-config invocation:

- `/tmp/cohort01-b3-a.BlRksh/arena-basis-brutal-v2`
- `/tmp/cohort01-b3-b.frHiBz/arena-basis-brutal-v2`

`diff -rq` was empty. The worktree was not written.

| Family | Rooms | Living monsters | Detect no enemy | Have positive legal destination |
|---|---:|---:|---:|---:|
| hard 5117001–5117013 | 13 | 75 | 55 | 55 |
| brutal 6203001–6203010 | 10 | 44 | 25 | 25 |
| brutal-b 6206001–6206010 | 10 | 42 | 40 | 40 |
| brutal-2 6207001–6207010 | 10 | 44 | 29 | 29 |
| rejected 6209001–6209010 | 10 | 46 | 36 | 36 |
| **Total** | **53** | **251** | **185** | **185** |

That is 73.7% of all living monsters, and every affected monster has some legal positive move.

The per-room blind counts, with identical movable counts, were:

- hard: `6,4,5,7,5,0,7,4,0,4,7,2,4`
- brutal: `2,5,7,4,0,1,0,2,1,3`
- brutal-b: `4,2,4,4,5,4,6,2,5,4`
- brutal-2: `0,6,0,5,4,5,4,1,4,0`
- 6209: `4,0,5,3,6,5,3,7,0,3`

For the ten-room D569 hard subset alone, the count is 42 blind/movable of 57 living; replacing the 13-room hard family with that subset gives an aggregate of 172 blind/movable of 233 living.

Additional results:

- 0 blind monsters had last-known/suspected knowledge.
- All 185 were `unknown / never_observed`.
- 0 actors had a `located`-but-not-`seen` enemy in these cohorts.

## 5. Smallest bounded repair and witness

The absolute smallest code diff is option A’s fallback inside `resolveTarget`, but it is not bounded by the existing knowledge contract: it changes “visible” to mean omniscient and contradicts D476/D625.

The smallest option consistent with existing decisions is option C: keep the ordinary visible-enemy Dash unchanged, but when actor knowledge contains no perceived enemy, make the existing standard Dash resolve to a deterministic, topology-only, reachable positive reposition destination.

It avoids:

- revealing a PC’s true position;
- inventing last-known information for never-seen PCs;
- changing the play-name registry;
- adding a second actor-knowledge producer;
- introducing a new offer environment or query port;
- requiring a new action kind.

The required witness should be:

1. A hand-authored sealed-wall state with empty `observationHistory`, no `searchMemories`, and every PC `undetected`.
2. The monster receives a Dash selected by `basic_advance`.
3. Resolution is valid with `movementCostFeet > 0`.
4. The offer and movement objective contain no PC ID or current PC coordinate.
5. A mutation disabling the blind branch returns the actor to exactly Dodge/End Turn.
6. Across 6209001–6209010, all 36 blind monsters resolve a positive movement option and [`everyLivingMonsterIsProductive`](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/arena-basis-brutal-v2.test.ts:100) becomes true for all ten rooms.

For 6209001 specifically, all four monsters are blind; the Priest is already productive through casting, while the Bear, Eagle, and Ghast are the decisive new movement witnesses. Because the existing productivity predicate counts any `movementCostFeet > 0` at lines 77–90, no offensive action or target discovery is needed to make the room productive.

BLIND-ADVANCE COSTING DONE
