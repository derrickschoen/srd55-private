# PUBLISH-01 — astra HIGH plan review r1 (session 01a0bc92-2fc6-71a2-9fb9-40d11947b87f, final message only)

**REJECT.** The plan has two blocking defects and several requirements to resolve before it binds. I verified the supplied plan hash. All probes were local and read-only; no agents, network requests, installs, or builds were run.

1. **P1 — The INCLUDE set publishes private process and source-aware material.**  
   The proposed 25-file homebrew selection includes:
   - [oath-of-domination-inputs.md](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/cc-by/oath-of-domination-inputs.md:1): owner exploration, rulings chain, BG3/Oathbreaker comparison, and a Sarah Connor film touchstone.
   - [monk-third-caster-pitches.md](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/cc-by/2026-08-03-monk-third-caster-pitches.md:28): source-aware comparisons with *Arcana Unleashed* and unlicensed Drakkenheim homebrew.
   - [lessons.md](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/lessons.md:1): explicitly an operational account of agents, dispatches, worktrees, and owner rulings.
   - The bake-off and subclass-guidelines README also contain internal comparison/review history.

   CC-BY availability does not override D127/D768’s publication boundary. Reclassify by **content**, not directory or licence. Conservatively exclude these documents, or separately review public versions. Removing private-path strings alone does not remove their process-record substance.

2. **P1 — Batch 5’s comment cleanup breaks a runtime migration checksum.**  
   [skill-grants.ts:64](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/grants/skill-grants.ts:64) contains the private design link scheduled for removal. Its complete bytes are an input to `reconcile_species_lineage_content_v2`.

   I reproduced the checksum calculation without modifying files: the current source matches the pinned `e649951d…`; replacing only that comment’s path changes the digest. [Runtime validation](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/catalog/catalog-data-migrations.ts:285) rejects the mismatch. Simply repinning also makes databases carrying the previous migration marker fail the marker comparison.

   The plan needs an explicit, reviewed migration disposition, permitted files, and fresh/existing-database verification. It must preserve existing character data and retain independent expectations. The current batches authorize neither the necessary handling nor its tests.

3. **P2 — The publication contract is not yet exact enough to approve.**  
   The plan promises an exact manifest later, but does not enumerate the seven retained scripts, 32 tools, or surviving package-script names and values. Consequently, the 1,154-file total is not a reviewable membership contract.

   Add exact lists or a deterministic, fully specified baseline selection with explicit exceptions. Bind the allowlist, templates, script table, and transformation policy to committed inputs too; reading application blobs from a named commit is insufficient if curation policy can come from dirty working-tree files.

4. **P2 — The negative scan and digest verification have contradictory scopes.**  
   Verification steps 8–9 scan/count “all non-`.git`” files **after** installation and building. That includes `node_modules` and `dist`, contradicting both “no unmanifested file” and 1,154 files.

   Define separate checks for the curated source tree, the actual committed public tree, and generated distribution. Compare exact paths, modes, and byte digests—not merely counts.

   The scanner also needs precise exceptions: required Wizards attribution exists in `src`, retained tests, NOTICE, and homebrew documents, not only `docs/srd`. Short unrestricted searches can match embedded image data. Scan meaningful text with explicit boundaries and reviewed exceptions.

   Include discovery for `.tmp*`, actual worktree paths, model/session evidence, and internal narrative. Do **not** blanket-ban `codex`, UUIDs, or `dnd-wt-`: some are legitimate adapter identifiers, schema IDs, or generated temporary names.

5. **P2 — D129 verification assumes features that are absent.**  
   [index.html](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/index.html:1) has no robots/noindex directive or persistent pre-alpha banner. Searches of the application/static assets found neither the required banner nor corresponding existing banner tests. The build ID is hardcoded in `src/build-id.ts`, and the requested footer presentation also needs checking.

   “Run existing tests if later admitted” is not an executable gate. Add a bounded implementation and verification prerequisite, or explicitly resolve its scope before binding the plan. D266’s deployment prohibition remains unchanged.

6. **P2 — OGL option B has an additional unresolved provenance obligation.**  
   The non-personal copyright-holder blocker is real: `SECTION-15.md` explicitly says the original entry is missing.

   However, [srd-3.0/SOURCE.md](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/homebrew/ogl/srd-3.0/SOURCE.md:90) also says the existing chain comes from SRD 3.5 and the 3.0 legal notice has not been established. Option B distributes the partial 3.0 archive immediately. Copying all 14 files does not prove its exact notice chain is complete.

   Keep option A as the recommendation. Present B as blocked on **both** the original-work holder entry and verification of the notice chain for every redistributed archive.

7. **P2 — Public documentation transformations leave broken or false instructions.**  
   The four README spans omit “Running a short test,” which says longer integration/browser/serving/mutation/gate suites are present. They will not be. Included [docs/serving.md:36](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/docs/serving.md:36) instructs readers to run the excluded `serve:check` command and later quotes private owner policy.

   Also, `tools/serve.mjs --vtt-runtime` dynamically launches excluded `tools/vtt-handoff/node-runtime-main.ts`. Checking the package command’s entry file will not detect this.

   Specify transformations or conservative exclusions for these surfaces, check all documented commands/local links, and exercise retained dynamic command modes. NOTICE’s public inventory should explicitly cover the included A5E, SRD 5.1, and imported CC0 content and preserve a self-contained original-document licence statement after omitting the homebrew READMEs.

8. **P2 — Batch ordering and mutation witnesses are not executable as written.**  
   Batch 3 requires a fully passing curated tree before batches 4–7 remove strings that its scanner rejects. Batch 2’s real-tree A/B validation similarly precedes marker installation and cleanup.

   Its README mutant is ineffective: inserting the private URL inside a span that is deterministically replaced should produce the normal public URL and pass. Mutate the replacement/template, or insert a private URL outside the replaced span. Also distinguish “excluded source blob is not copied” from “unexpected file is injected into output”; the private source necessarily contains unallowlisted blobs.

   State which intermediate failures are expected and put the complete standalone gate after prerequisite batches.

9. **P2 — The verification claim overstates compilation and update coverage.**  
   `npm run build` uses `tsc -b`; the cache’s validated-build descriptor also uses `-b`, **not `--force`**. The plan’s “forced compilation” claim is false. Run the required forced check explicitly.

   For updates, replace “replace its worktree” with an exact procedure preserving `.git`, removing obsolete tracked files, staging deletions/renames, and asserting committed-tree equality with the curated result. Add a two-version deletion/rename witness. Restore D779’s explicit cadence: regeneration **after every main landing**, with failed verification preventing publication.

10. **P3 — Correct provenance descriptions and retain meaningful safeguards.**  
    `content/cc0/escape-the-astral-tower` describes **imported Doomed Zone CC0 mechanics**, not repository-generated adventure content. The three root JSON fixtures have structured headers, not explicit hand-authorship/licensing declarations; the two scene files have a repository generator. Record that actual provenance.

    Bare decision IDs in technical comments are not automatically prohibited content, but internal review narratives are different—for example those in `catalog-data-migrations.ts` and `multiclass-proficiency.ts`. Review these deliberately. Preserve the retained wordmark-negative assertions; their forbidden-name literals are test inputs, not product branding.

The following assumptions checked out:

- All **92 tracked art files** exactly match the manifest, pinned output hashes, and freshly rendered generator bytes. `ART-PROVENANCE.md` itself is a statement, not an inventory.
- All **33 extract hashes** listed in `docs/srd/SOURCE.md` match.
- The A5E source note contains the required attribution. Sampled migrations showed schema/data transformations; the requested franchise-name scan found no additional suspect rules text in production code beyond the identified comment/prompt.
- The armor-plan constant has no consumer; the private design-path registry entry has only the identified near-miss test consumer.
- Default Vitest discovery should find the 36 retained rules files; its global setup uses retained SRD/source inputs. Standalone execution remains necessary.
- Adding invisible README markers while preserving private-span contents is acceptable for the friend-facing mirror.
- Roughly 20 MB is reasonable. The schema/migration files are not a publication blocker; trimming them would add dependency risk without addressing the serious inclusion errors.

**PUBLISH-01 PLAN REVIEW R1 DONE**
